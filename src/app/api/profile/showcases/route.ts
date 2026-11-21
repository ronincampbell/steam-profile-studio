/**
 * GET /api/profile/showcases?id=<SteamID64>
 *
 * The profile's showcases and right-hand column (see
 * src/lib/steam/showcases/types.ts), read from its public Steam profile page.
 * Separate from /api/profile so the header
 * never waits on the slower page load: the preview asks for this once the
 * profile has loaded, using the SteamID64 /api/profile resolved.
 * Cached for about 10 minutes, server-side and on the CDN.
 */
import { getShowcases } from "@/lib/steam/api";
import { cached, error } from "@/lib/http/json";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^7656119\d{10}$/.test(id)) return error("Pass a 17-digit SteamID64 as ?id=", 400);

  const result = await getShowcases(id);
  // Steam down or rate limiting: the preview just skips showcases, and the
  // CDN only keeps that answer for 30 seconds.
  return cached(result, result.visibility === "unavailable" ? 30 : 600);
}
