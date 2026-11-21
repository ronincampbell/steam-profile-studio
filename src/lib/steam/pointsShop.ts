/**
 * Links into the Steam Points Shop.
 *
 * Verified 21 Nov 2026 (see reference/api/FINDINGS.md): the Points Shop has
 * NO URL that opens one specific item. Its router only defines
 * `/points/shop/app/:appid` (plus `/cluster/:index`), and clicking an item
 * opens a purchase dialog without changing the URL. So the closest working
 * "buy" link is the item's game page in the shop, which lists every item for
 * that appid. The user then clicks the item there.
 */
export const POINTS_SHOP_BASE = "https://store.steampowered.com/points/shop/";

/** The Points Shop page for a game: every reward item with this `appid`. */
export function pointsShopAppUrl(appid: number): string {
  if (!Number.isInteger(appid) || appid <= 0) {
    throw new Error(`pointsShopAppUrl: invalid appid ${appid}`);
  }
  return `${POINTS_SHOP_BASE}app/${appid}`;
}
