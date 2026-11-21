/**
 * GET /api/items?type=<item type>&cursor=<next page>&q=<search>
 *
 * One page (up to 100) of Points Shop items of one type, normalised to
 * ShopItem (see src/lib/steam/types.ts). Types: background, mini-background,
 * avatar-frame, animated-avatar, theme. Cached for about a day.
 */
import { getCataloguePage, SteamError } from "@/lib/steam/api";
import { isItemType, ITEM_TYPES } from "@/lib/steam/types";
import { cached, error } from "@/lib/http/json";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  if (!isItemType(type)) {
    return error(`type must be one of: ${Object.keys(ITEM_TYPES).join(", ")}`, 400);
  }

  // Cursors are Steam's base64 strings; searches are free text. Bound both so
  // nobody can push junk through to Steam.
  const cursor = params.get("cursor")?.trim() || undefined;
  if (cursor && !/^[A-Za-z0-9+/=_-]{1,200}$/.test(cursor)) return error("Bad cursor", 400);
  const search = params.get("q")?.trim().slice(0, 100) || undefined;

  try {
    return cached(await getCataloguePage({ type, cursor, search }), 86_400);
  } catch (e) {
    if (e instanceof SteamError) return error(e.message, e.status);
    throw e;
  }
}
