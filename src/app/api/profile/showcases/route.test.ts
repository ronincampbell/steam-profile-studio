/**
 * The showcases route against a fake Steam: what it answers, and the
 * Cache-Control headers that tell Vercel's CDN how long to keep it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// `server-only` refuses to load outside Next's server build.
vi.mock("server-only", () => ({}));

const PROFILE_HTML = readFileSync(join(__dirname, "../../../../../reference/html/fuzzycast-profile.html"), "utf8");
const ID = "76561198220645184";
const request = (id = ID) => new Request(`http://localhost/api/profile/showcases?id=${id}`);

/** A fresh copy of the route, so each test starts with an empty server memory. */
async function loadRoute() {
  vi.resetModules();
  return (await import("./route")).GET;
}

beforeEach(() => {
  // Outside Vercel the shared cache is one in-memory copy for the whole test
  // run, which would leak between tests; resilient.test.ts covers it instead.
  vi.stubEnv("SHOWCASE_SHARED_CACHE", "off");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 10, 21, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/profile/showcases", () => {
  it("caches a good answer on the CDN for 6 h, refreshes it in the background and keeps it through errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PROFILE_HTML)));
    const GET = await loadRoute();
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=21600, stale-while-revalidate=64800, stale-if-error=604800",
    );
    const body = await res.json();
    expect(body.visibility).toBe("public");
    expect(body.staleBecause).toBeUndefined();
  });

  it("answers 503, uncached, with Retry-After when Steam answers 429 and there's no copy", async () => {
    const fetch = vi.fn(async () => new Response("Too Many Requests", { status: 429, headers: { "Retry-After": "90" } }));
    vi.stubGlobal("fetch", fetch);
    const GET = await loadRoute();
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("90");
    expect(await res.json()).toMatchObject({ visibility: "unavailable", reason: "rate-limited", retryAfter: 90 });
    expect(fetch).toHaveBeenCalledTimes(1); // a 90 s wait isn't worth retrying inside the request
  });

  it("serves the last good copy, flagged and kept briefly, when Steam answers 429 later", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(PROFILE_HTML))
      .mockResolvedValue(new Response("Too Many Requests", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    const GET = await loadRoute();
    const first = await (await GET(request())).json();

    vi.setSystemTime(Date.UTC(2026, 10, 21, 19, 0, 0)); // 7 hours on: no longer fresh
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=604800",
    );
    const body = await res.json();
    expect(body.staleBecause).toBe("rate-limited");
    expect(body.fetchedAt).toBe("2026-11-21T12:00:00.000Z");
    expect(body.showcases).toEqual(first.showcases);
  });

  it("rejects anything that isn't a SteamID64 without asking Steam", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const GET = await loadRoute();
    expect((await GET(request("fuzzycast"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
