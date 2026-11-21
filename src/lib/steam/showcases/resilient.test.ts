import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createShowcaseLoader, parseRetryAfter, SteamBusyError, type ShowcaseLoaderOptions } from "./resilient";

// Fuzzycast's public profile, captured 21 Nov 2026.
const PROFILE_HTML = readFileSync(join(__dirname, "../../../../reference/html/fuzzycast-profile.html"), "utf8");
const ID = "76561198220645184";
const HOUR = 3_600_000;

const ok = () => new Response(PROFILE_HTML, { status: 200 });
const tooMany = (retryAfter?: string) =>
  new Response("Too Many Requests", { status: 429, headers: retryAfter ? { "Retry-After": retryAfter } : {} });

/**
 * A loader with a fake network, clock and sleep. `responses` are handed out
 * in order, one per request to Steam; the last one repeats.
 */
function setup(responses: (() => Response | Promise<Response>)[], options: ShowcaseLoaderOptions = {}) {
  let time = Date.UTC(2026, 10, 21, 12, 0, 0);
  const sleeps: number[] = [];
  let calls = 0;
  const fetch = vi.fn(async () => responses[Math.min(calls++, responses.length - 1)]());
  const loader = createShowcaseLoader({
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => time,
    // Waiting moves the fake clock forward instead of really waiting.
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
    random: () => 0,
    ...options,
  });
  return {
    loader,
    fetch,
    sleeps,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("showcase loader", () => {
  it("reads the showcases and keeps them for 6 hours without asking Steam again", async () => {
    const { loader, fetch, advance } = setup([ok]);
    const first = await loader.get(ID);
    expect(first.visibility).toBe("public");
    expect(first.showcases.length).toBeGreaterThan(0);
    expect(first.fetchedAt).toBe("2026-11-21T12:00:00.000Z");
    expect(first.staleBecause).toBeUndefined();

    advance(5 * HOUR);
    expect(await loader.get(ID)).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("serves the last good copy, marked rate-limited, when Steam answers 429", async () => {
    const { loader, fetch, advance } = setup([ok, () => tooMany()]);
    const good = await loader.get(ID);

    advance(7 * HOUR); // past fresh, so Steam is asked again
    const fallback = await loader.get(ID);
    expect(fallback.staleBecause).toBe("rate-limited");
    expect(fallback.showcases).toEqual(good.showcases);
    expect(fallback.fetchedAt).toBe(good.fetchedAt);
    // A 429 starts a cool-down, so the retries didn't knock again.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws SteamBusyError when Steam answers 429 and there's no copy yet", async () => {
    const { loader } = setup([() => tooMany()]);
    const err = await loader.get(ID).catch((e) => e);
    expect(err).toBeInstanceOf(SteamBusyError);
    expect(err.reason).toBe("rate-limited");
    expect(err.retryAfter).toBe(60); // the default 1-minute cool-down
  });

  it("leaves Steam alone during the cool-down after a 429", async () => {
    const { loader, fetch, advance } = setup([() => tooMany(), ok]);
    await expect(loader.get(ID)).rejects.toBeInstanceOf(SteamBusyError);
    advance(30_000);
    await expect(loader.get(ID)).rejects.toBeInstanceOf(SteamBusyError);
    expect(fetch).toHaveBeenCalledTimes(1);

    advance(31_000); // cool-down over
    expect((await loader.get(ID)).visibility).toBe("public");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("doubles the cool-down for each 429 in a row, up to 10 minutes, and resets after a success", async () => {
    const { loader, fetch, advance } = setup([() => tooMany(), () => tooMany(), () => tooMany(), ok, () => tooMany()]);
    const waits: number[] = [];
    for (let i = 0; i < 3; i++) {
      const err = await loader.get(ID).catch((e) => e);
      waits.push(err.retryAfter);
      advance(err.retryAfter * 1000);
    }
    expect(waits).toEqual([60, 120, 240]);
    expect((await loader.get(ID)).visibility).toBe("public");

    advance(7 * HOUR);
    await loader.get(ID); // 429 again, served from the copy
    const err = await loader.get("76561198000000001").catch((e) => e);
    expect(err.retryAfter).toBe(60); // back to a minute
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("asks for the address Steam redirected to next time, and forgets it if it stops working", async () => {
    const redirected = () => {
      const res = new Response(PROFILE_HTML);
      Object.defineProperty(res, "url", { value: "https://steamcommunity.com/id/Fuzzycast/?l=english" });
      return res;
    };
    const { loader, fetch, advance } = setup(
      [redirected, () => new Response("<html>The specified profile could not be found.</html>"), ok],
      { retries: 0 },
    );
    await loader.get(ID);
    advance(7 * HOUR);
    await loader.get(ID); // not a profile page: falls back to the copy
    advance(1000);
    await loader.get(ID);
    const urls = fetch.mock.calls.map((c) => (c as unknown[])[0]);
    expect(urls).toEqual([
      `https://steamcommunity.com/profiles/${ID}/?l=english`,
      "https://steamcommunity.com/id/Fuzzycast/?l=english",
      `https://steamcommunity.com/profiles/${ID}/?l=english`,
    ]);
  });

  it("retries a short Retry-After with backoff and succeeds", async () => {
    const { loader, fetch, sleeps } = setup([() => tooMany("1"), () => tooMany("1"), ok]);
    const result = await loader.get(ID);
    expect(result.visibility).toBe("public");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 2000]); // 1 s, then doubled
  });

  it("retries server errors and timeouts with backoff, then gives up", async () => {
    const { loader, fetch, sleeps } = setup([
      () => new Response("oops", { status: 502 }),
      () => Promise.reject(new Error("timeout")),
      () => new Response("oops", { status: 500 }),
    ]);
    const err = await loader.get(ID).catch((e) => e);
    expect(err).toBeInstanceOf(SteamBusyError);
    expect(err.reason).toBe("steam-error");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it("doesn't wait when Steam asks for a long pause", async () => {
    const { loader, fetch, sleeps } = setup([() => tooMany("120")]);
    const err = await loader.get(ID).catch((e) => e);
    expect(err.retryAfter).toBe(120);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it("combines duplicate requests that arrive at the same time", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { loader, fetch } = setup([async () => (await gate, ok())]);

    const requests = Array.from({ length: 10 }, () => loader.get(ID));
    release();
    const results = await Promise.all(requests);
    expect(fetch).toHaveBeenCalledTimes(1);
    for (const r of results) expect(r).toBe(results[0]);
  });

  it("gives every waiting duplicate the cached copy when the shared load is rate-limited", async () => {
    const { loader, fetch, advance } = setup([ok, () => tooMany()]);
    await loader.get(ID);
    advance(7 * HOUR);
    const results = await Promise.all([loader.get(ID), loader.get(ID), loader.get(ID)]);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const r of results) expect(r.staleBecause).toBe("rate-limited");
  });

  it("never caches a page that isn't a profile (Steam's error page)", async () => {
    const errorPage = () => new Response("<html><body><h2>An error was encountered</h2></body></html>");
    const { loader } = setup([errorPage], { retries: 0 });
    const err = await loader.get(ID).catch((e) => e);
    expect(err).toBeInstanceOf(SteamBusyError);
    expect(err.reason).toBe("steam-error");
  });

  it("remembers private profiles as a good answer", async () => {
    const privatePage = () =>
      new Response('<html><body class="private_profile"><div class="profile_page private_profile"></div></body></html>');
    const { loader } = setup([privatePage]);
    expect((await loader.get(ID)).visibility).toBe("private");
  });

  it("forgets the oldest profile when it's full", async () => {
    const { loader, fetch } = setup([ok], { maxEntries: 2 });
    await loader.get("76561198000000001");
    await loader.get("76561198000000002");
    await loader.get("76561198000000003");
    await loader.get("76561198000000002"); // still cached
    expect(fetch).toHaveBeenCalledTimes(3);
    await loader.get("76561198000000001"); // was dropped
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});

/** A fake Runtime Cache: a Map that records what's written, with a TTL. */
function fakeShared() {
  const data = new Map<string, unknown>();
  const ttls: number[] = [];
  return {
    data,
    ttls,
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown, options?: { ttl?: number }) => {
      data.set(key, JSON.parse(JSON.stringify(value)));
      ttls.push(options?.ttl ?? 0);
    }),
  };
}

describe("showcase loader with the shared cache", () => {
  it("saves good answers there for a week, so another instance needn't ask Steam", async () => {
    const shared = fakeShared();
    const a = setup([ok], { shared });
    const first = await a.loader.get(ID);
    expect(shared.ttls).toEqual([7 * 24 * 3600]);

    // A second instance (cold start, empty memory) with the same shared cache.
    const b = setup([() => tooMany()], { shared });
    const second = await b.loader.get(ID);
    expect(second).toEqual(first);
    expect(b.fetch).not.toHaveBeenCalled();
  });

  it("gives a cold instance the shared copy, flagged, when Steam answers 429", async () => {
    const shared = fakeShared();
    const a = setup([ok], { shared });
    await a.loader.get(ID);

    const b = setup([() => tooMany()], { shared });
    b.advance(8 * HOUR); // the shared copy is no longer fresh, so Steam is asked
    const result = await b.loader.get(ID);
    expect(b.fetch).toHaveBeenCalledTimes(1);
    expect(result.staleBecause).toBe("rate-limited");
    expect(result.visibility).toBe("public");
  });

  it("keeps working when the shared cache fails or holds junk", async () => {
    const broken = { get: vi.fn(async () => { throw new Error("cache down"); }), set: vi.fn(async () => { throw new Error("cache down"); }) };
    const a = setup([ok], { shared: broken });
    expect((await a.loader.get(ID)).visibility).toBe("public");

    const junk = { get: vi.fn(async () => ({ value: { steamId: "someone else" }, fetchedAt: 1 })), set: vi.fn(async () => {}) };
    const b = setup([ok], { shared: junk });
    expect((await b.loader.get(ID)).steamId).toBe(ID);
    expect(b.fetch).toHaveBeenCalledTimes(1);
  });

  it("asks the shared cache once for duplicate requests", async () => {
    const shared = fakeShared();
    const { loader } = setup([ok], { shared });
    await Promise.all([loader.get(ID), loader.get(ID), loader.get(ID)]);
    expect(shared.get).toHaveBeenCalledTimes(1);
    expect(shared.set).toHaveBeenCalledTimes(1);
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds and HTTP dates", () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    expect(parseRetryAfter("30", now)).toBe(30_000);
    expect(parseRetryAfter("Sat, 21 Nov 2026 12:02:00 GMT", now)).toBe(120_000);
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter("soon", now)).toBeUndefined();
  });
});
