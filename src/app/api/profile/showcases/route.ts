/**
 * GET /api/profile/showcases?id=<SteamID64>[&friends=1]
 *
 * The profile's showcases and right-hand column (see
 * src/lib/steam/showcases/types.ts), read from its public Steam profile page.
 * Friends' names, avatars and links are left out unless `friends=1` is
 * passed: both answers come from the same cached page, so asking for them
 * costs Steam nothing extra. Separate from /api/profile so the header
 * never waits on the slower page load: the preview asks for this once the
 * profile has loaded, using the SteamID64 /api/profile resolved.
 * Cached for about 10 minutes, server-side and on the CDN.
 */
import { getShowcases } from "@/lib/steam/api";
import { cached, error } from "@/lib/http/json";
import { hideFriendDetails } from "@/lib/steam/showcases/sidebar";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  if (!/^7656119\d{10}$/.test(id)) return error("Pass a 17-digit SteamID64 as ?id=", 400);

  const page = await getShowcases(id);
  const result =
    page.sidebar && params.get("friends") !== "1" ? { ...page, sidebar: hideFriendDetails(page.sidebar) } : page;
  // Steam down or rate limiting: the preview just skips showcases, and the
  // CDN only keeps that answer for 30 seconds.
  return cached(result, result.visibility === "unavailable" ? 30 : 600);
}
