/**
 * Turn the relative image/video paths in Steam's API responses into full URLs.
 *
 * Verified 21 Nov 2026 (see reference/api/FINDINGS.md):
 * - The Points Shop's own page config sets
 *   MEDIA_CDN_COMMUNITY_URL = "https://shared.fastly.steamstatic.com/community_assets/"
 *   and its code builds item images as `${MEDIA_CDN_COMMUNITY_URL}images/items/${appid}/${file}`.
 * - Every sampled catalogue and equipped-item image/video returned 200 from
 *   that host. The older cdn.fastly / cdn.akamai `steamcommunity/public/images`
 *   paths returned 404 for the same files, so don't use them.
 */
export const COMMUNITY_ASSETS_BASE =
  "https://shared.fastly.steamstatic.com/community_assets/images/";

/**
 * For equipped items (IPlayerService/GetProfileItemsEquipped), whose
 * `image_large`, `image_small`, `movie_webm`, `movie_mp4` etc. already look
 * like `items/<appid>/<file>`.
 *
 * Returns undefined for a missing or empty path, so an empty slot stays empty.
 */
export function assetUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  return COMMUNITY_ASSETS_BASE + path.replace(/^\/+/, "");
}

/**
 * For Points Shop catalogue items (ILoyaltyRewardsService/QueryRewardItems),
 * whose `community_item_data.item_image_large`, `item_movie_webm` etc. are
 * bare filenames. The folder is the item's top-level `appid`.
 */
export function catalogueAssetUrl(
  appid: number,
  file: string | undefined | null,
): string | undefined {
  if (!file) return undefined;
  if (!Number.isInteger(appid) || appid <= 0) {
    throw new Error(`catalogueAssetUrl: invalid appid ${appid}`);
  }
  return `${COMMUNITY_ASSETS_BASE}items/${appid}/${file}`;
}
