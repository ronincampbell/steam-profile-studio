/**
 * Loading showcases without tripping over Steam's rate limit.
 *
 * steamcommunity.com answers 429 ("too many requests") after only 2–4 quick
 * page loads and stays limited for minutes, so the showcases route can't
 * simply ask Steam every time. This file is the server's half of the defence;
 * the other half is Vercel's CDN, set up by the Cache-Control headers in the
 * route (see src/app/api/profile/showcases/route.ts).
 *
 * What it does, per server instance:
 * - Remembers the last good answer for each profile. While it's fresh
 *   (6 hours) Steam isn't asked at all.
 * - When Steam fails, answers with that last good copy instead, marked
 *   `staleBecause`, so the page can say "Steam is busy, showing a cached copy".
 * - Combines duplicate requests: if ten visitors ask for the same profile at
 *   once, Steam gets one page load and all ten share the answer.
 * - Retries a failed load twice, waiting a little longer each time (backoff),
 *   but only when the wait is short enough to be worth it.
 * - After a 429, leaves Steam alone for a cool-down instead of making the
 *   limit worse. Steam's 429s carry no Retry-After (checked 21 Nov 2026), so
 *   the cool-down starts at a minute and doubles with each 429 in a row, up
 *   to 10 minutes, going back to a minute after a success.
 * - Remembers where Steam redirects each profile (/profiles/<id> → /id/<name>)
 *   and asks for that address next time, skipping the redirect.
 *
 * Memory is per instance: a cold start begins empty. That's what the CDN
 * layer is for. Everything that touches the outside world (fetch, the clock,
 * waiting) is passed in, so the tests can fake a 429 without a network.
 */
import { parseProfilePage } from "./parse";
import type { ProfileShowcases } from "./types";

/** Steam failed and there's no earlier copy to fall back on. */
export class SteamBusyError extends Error {
  constructor(
    readonly reason: "rate-limited" | "steam-error",
    /** Seconds until it's worth asking again. */
    readonly retryAfter: number,
  ) {
    super(reason === "rate-limited" ? "Steam is rate limiting us" : "Steam didn't send the profile page");
  }
}

export interface ShowcaseLoaderOptions {
  fetch?: typeof fetch;
  /** Milliseconds since 1970, like Date.now. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** 0 ≤ n < 1, like Math.random. Spreads retries out a little. */
  random?: () => number;
  /** How long an answer counts as fresh. Default 6 hours. */
  freshMs?: number;
  /** Profiles remembered per instance (oldest dropped first). Default 500. */
  maxEntries?: number;
  /** Retries after the first try. Default 2. */
  retries?: number;
  /** Wait before the first retry; doubles each time. Default 1 second. */
  baseDelayMs?: number;
  /** Never wait longer than this between tries. Default 4 seconds. */
  maxDelayMs?: number;
  /** First cool-down after a 429 when Steam doesn't send Retry-After; doubles per 429 in a row. Default 60 seconds. */
  cooldownMs?: number;
  /** Longest cool-down. Default 10 minutes. */
  maxCooldownMs?: number;
  /** Give up on one page load after this long. Default 10 seconds. */
  timeoutMs?: number;
}

interface Entry {
  value: ProfileShowcases;
  fetchedAt: number;
}

type Failure = { ok: false; reason: "rate-limited" | "steam-error"; retryAfterMs?: number };
type Attempt = { ok: true; value: ProfileShowcases } | Failure;

const HOUR = 3_600_000;

export function createShowcaseLoader(options: ShowcaseLoaderOptions = {}) {
  const {
    fetch: fetchFn = (...args: Parameters<typeof fetch>) => fetch(...args),
    now = Date.now,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    random = Math.random,
    freshMs = 6 * HOUR,
    maxEntries = 500,
    retries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 4000,
    cooldownMs = 60_000,
    maxCooldownMs = 600_000,
    timeoutMs = 10_000,
  } = options;

  /** Last good answer per SteamID. A Map keeps insertion order, so the first key is the oldest. */
  const store = new Map<string, Entry>();
  /** Page loads in progress, so duplicate requests can wait on the same one. */
  const inFlight = new Map<string, Promise<ProfileShowcases>>();
  /** No requests to Steam before this time (set by a 429). */
  let cooldownUntil = 0;
  /** 429s in a row, for the growing cool-down. */
  let rateLimitStreak = 0;
  /** Where Steam redirected each profile, e.g. https://steamcommunity.com/id/Fuzzycast/. */
  const profileUrls = new Map<string, string>();

  function remember(steamId: string, value: ProfileShowcases) {
    store.delete(steamId); // re-insert so it counts as newest
    store.set(steamId, { value, fetchedAt: now() });
    while (store.size > maxEntries) store.delete(store.keys().next().value!);
  }

  function currentCooldown() {
    return Math.min(cooldownMs * 2 ** (rateLimitStreak - 1), maxCooldownMs);
  }

  /** Keep the address Steam redirected to, if it's another steamcommunity.com profile address. */
  function rememberUrl(steamId: string, finalUrl: string) {
    const m = /^https:\/\/steamcommunity\.com\/(id\/[^/?#]+|profiles\/\d{17})\//.exec(finalUrl);
    if (!m) return;
    profileUrls.set(steamId, `https://steamcommunity.com/${m[1]}/`);
    while (profileUrls.size > maxEntries) profileUrls.delete(profileUrls.keys().next().value!);
  }

  /** One page load. Never throws. */
  async function attempt(steamId: string): Promise<Attempt> {
    let res: Response;
    try {
      const base = profileUrls.get(steamId) ?? `https://steamcommunity.com/profiles/${steamId}/`;
      res = await fetchFn(`${base}?l=english`, {
        headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch {
      return { ok: false, reason: "steam-error" };
    }
    if (res.status === 429) {
      return { ok: false, reason: "rate-limited", retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), now()) };
    }
    // Anything else that fails may be a stale remembered address (a renamed
    // custom URL), so the next try goes through /profiles/<id> again.
    if (!res.ok) {
      profileUrls.delete(steamId);
      return { ok: false, reason: "steam-error" };
    }

    let html: string;
    try {
      html = await res.text();
    } catch {
      return { ok: false, reason: "steam-error" };
    }
    const page = parseProfilePage(html);
    if (!page.isProfilePage) {
      profileUrls.delete(steamId);
      return { ok: false, reason: "steam-error" };
    }
    rememberUrl(steamId, res.url);

    const fetchedAt = new Date(now()).toISOString();
    return {
      ok: true,
      value: page.isPrivate
        ? { steamId, visibility: "private", showcases: [], fetchedAt }
        : { steamId, visibility: "public", showcases: page.showcases, fetchedAt },
    };
  }

  /** The first try plus retries with backoff. Throws SteamBusyError when every try fails. */
  async function load(steamId: string): Promise<ProfileShowcases> {
    let last: Failure | undefined;
    for (let i = 0; i <= retries; i++) {
      if (now() < cooldownUntil) {
        last = { ok: false, reason: "rate-limited" };
        break;
      }
      const result = await attempt(steamId);
      if (result.ok) {
        rateLimitStreak = 0;
        remember(steamId, result.value);
        return result.value;
      }
      last = result;
      if (result.reason === "rate-limited") {
        rateLimitStreak++;
        cooldownUntil = now() + (result.retryAfterMs ?? currentCooldown());
      }
      if (i === retries) break;

      // 1 s, 2 s, 4 s… plus up to 25% so parallel retries don't line up.
      const backoff = Math.min(baseDelayMs * 2 ** i, maxDelayMs) * (1 + random() * 0.25);
      // When Steam asks for a longer pause than that, waiting here would only
      // keep the visitor hanging: give up now and fall back to the cache.
      // (A 429 with no Retry-After means the default cool-down, a minute.)
      const pauseMs = result.reason === "rate-limited" ? cooldownUntil - now() : 0;
      if (pauseMs > maxDelayMs) break;
      await sleep(Math.max(backoff, pauseMs));
    }
    const waitMs = cooldownUntil - now();
    throw new SteamBusyError(last!.reason, waitMs > 0 ? Math.ceil(waitMs / 1000) : 30);
  }

  /**
   * The showcases for one profile.
   *
   * Fresh copy → returned without asking Steam. Otherwise Steam is asked
   * (sharing any load already in progress); if that fails, the last good copy
   * comes back with `staleBecause` set. Throws SteamBusyError only when
   * there's no copy at all.
   */
  async function get(steamId: string): Promise<ProfileShowcases> {
    const entry = store.get(steamId);
    if (entry && now() - entry.fetchedAt < freshMs) return entry.value;

    let pending = inFlight.get(steamId);
    if (!pending) {
      pending = load(steamId).finally(() => inFlight.delete(steamId));
      inFlight.set(steamId, pending);
    }
    try {
      return await pending;
    } catch (e) {
      // Read the store again: another request may have filled it meanwhile.
      const fallback = store.get(steamId);
      if (e instanceof SteamBusyError && fallback) return { ...fallback.value, staleBecause: e.reason };
      throw e;
    }
  }

  return { get };
}

/** Retry-After as milliseconds from now: either seconds ("120") or an HTTP date. */
export function parseRetryAfter(header: string | null, nowMs: number): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(date - nowMs, 0);
}
