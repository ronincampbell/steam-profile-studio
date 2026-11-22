/**
 * GET /api/items?type=<item type>&sort=popular|new&motion=animated|still
 *   &vibe=<vibe>&app=<appid>&q=<search>&cursor=<next page>
 *
 * One page (up to 100) of Points Shop items of one type, normalised to
 * ShopItem (see src/lib/steam/types.ts), each with its game's name. Adult-only
 * games are left out, as in the Points Shop. Cached for about a day.
 */
import { SteamError } from "@/lib/steam/api";
import { browseItems } from "@/lib/steam/catalogue";
import { parseBrowseParams } from "@/lib/http/browseParams";
import { cached, error } from "@/lib/http/json";

export async function GET(request: Request) {
  const p = parseBrowseParams(new URL(request.url).searchParams);
  if (typeof p === "string") return error(p, 400);
  try {
    return cached(await browseItems(p), 86_400);
  } catch (e) {
    if (e instanceof SteamError) return error(e.message, e.status);
    throw e;
  }
}
