/**
 * GET /api/profile?q=<profile URL | vanity name | SteamID64>
 *
 * Resolves whatever was pasted to a SteamID64, then returns one normalised
 * Profile (see src/lib/steam/types.ts): name, avatar, level, theme and
 * equipped items. Cached for about 10 minutes, server-side and on the CDN.
 */
import { getProfile, resolveVanity, SteamError } from "@/lib/steam/api";
import { parseProfileInput } from "@/lib/steam/parseProfileInput";
import { cached, error } from "@/lib/http/json";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q");
  const input = parseProfileInput(q);
  if (!input) {
    return error("Paste a Steam profile link, a custom URL name or a 17-digit SteamID.", 400);
  }

  try {
    const steamId = input.kind === "steamid" ? input.steamId : await resolveVanity(input.vanity);
    if (!steamId) return error(`No Steam profile called "${input.kind === "vanity" ? input.vanity : q}".`, 404);

    const profile = await getProfile(steamId);
    if (!profile) return error("That Steam profile doesn't exist.", 404);
    return cached(profile, 600);
  } catch (e) {
    if (e instanceof SteamError) return error(e.message, e.status);
    throw e;
  }
}
