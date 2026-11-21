/**
 * GET /api/profile/showcases?id=<SteamID64>
 *
 * The profile's showcases and right-hand column (see
 * src/lib/steam/showcases/types.ts), read from its public Steam profile page.
 * Separate from /api/profile so the header
 * never waits on the slower page load: the preview asks for this once the
 * profile has loaded, using the SteamID64 /api/profile resolved.
 *
 * Steam's community site rate-limits after a few requests, so there are two
 * layers of caching:
 * 1. Vercel's CDN, set up by the Cache-Control headers below. A good answer
 *    is served from the CDN for 6 hours without running this code, then for
 *    up to 18 more hours while the CDN refreshes it in the background
 *    (stale-while-revalidate). If a refresh fails, the CDN keeps serving the
 *    old copy for up to a week (stale-if-error) rather than the error.
 * 2. The server's own memory (src/lib/steam/showcases/resilient.ts), which
 *    combines duplicate requests, retries with backoff and falls back to the
 *    last good copy.
 *
 * Answers:
 * - 200 with fresh showcases.
 * - 200 with `staleBecause` set: Steam failed, this is the last good copy.
 *   The CDN keeps that for a minute only, so recovery shows up quickly.
 * - 503 when Steam failed and there's no copy anywhere yet. Never cached, so
 *   the CDN goes on serving any older copy it has. `Retry-After` says when to
 *   try again.
 */
import { getShowcases } from "@/lib/steam/api";
import { SteamBusyError } from "@/lib/steam/showcases/resilient";
import type { ProfileShowcases } from "@/lib/steam/showcases/types";
import { error } from "@/lib/http/json";

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Fresh for 6 h, refreshed in the background until 24 h, kept through errors for a week. */
const GOOD = `public, max-age=60, s-maxage=${6 * HOUR}, stale-while-revalidate=${18 * HOUR}, stale-if-error=${7 * DAY}`;
/** A fallback copy: ask again soon, but keep it through errors too. */
const FALLBACK = `public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=${7 * DAY}`;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^7656119\d{10}$/.test(id)) return error("Pass a 17-digit SteamID64 as ?id=", 400);

  try {
    const result = await getShowcases(id);
    return Response.json(result, {
      headers: { "Cache-Control": result.staleBecause ? FALLBACK : GOOD },
    });
  } catch (e) {
    if (!(e instanceof SteamBusyError)) throw e;
    const body: ProfileShowcases & { retryAfter: number; reason: SteamBusyError["reason"] } = {
      steamId: id,
      visibility: "unavailable",
      showcases: [],
      reason: e.reason,
      retryAfter: e.retryAfter,
    };
    return Response.json(body, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": String(e.retryAfter) },
    });
  }
}
