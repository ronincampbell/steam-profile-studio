/**
 * GET /api/items/games?type=<item type>&motion=animated|still&vibe=<vibe>
 *   &q=<search>&owner=<steamid64>&cursor=<next page>
 *
 * Items grouped by game, 20 games a page: the owner's games first (most
 * played first), then the rest by their most popular item. Still backgrounds
 * only list the owner's games (there are ~14,000 games with them).
 */
import { SteamError } from "@/lib/steam/api";
import { browseGames } from "@/lib/steam/catalogue";
import { parseBrowseParams } from "@/lib/http/browseParams";
import { cached, error } from "@/lib/http/json";

export async function GET(request: Request) {
  const p = parseBrowseParams(new URL(request.url).searchParams);
  if (typeof p === "string") return error(p, 400);
  try {
    // A profile's library can change, so its answers are kept for 10 minutes.
    return cached(await browseGames(p), p.owner ? 600 : 86_400);
  } catch (e) {
    if (e instanceof SteamError) return error(e.message, e.status);
    throw e;
  }
}
