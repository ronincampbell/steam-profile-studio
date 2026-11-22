/**
 * Convert raw Steam API responses into the app's own types (see types.ts).
 * Pure functions with no network access, so they're tested against the raw
 * JSON captured in reference/api/.
 */
import { assetUrl, catalogueAssetUrl } from "./assets";
import { pointsShopAppUrl } from "./pointsShop";
import { ITEM_TYPES, type Cosmetic, type Equipped, type ItemType, type Profile, type ShopItem } from "./types";

const TYPE_BY_CLASS = Object.fromEntries(
  Object.entries(ITEM_TYPES).map(([type, cls]) => [cls, type as ItemType]),
) as Record<number, ItemType>;

/* ---------- Raw shapes (only the fields we read) ---------- */

export interface RawRewardItem {
  appid: number;
  defid: number;
  community_item_class: number;
  point_cost?: string;
  timestamp_created?: number;
  /** Profile bundles (class 8): the background, mini background, frame and avatar inside. */
  bundle_defids?: number[];
  community_item_data?: {
    item_name?: string;
    item_title?: string;
    item_description?: string;
    item_image_small?: string;
    item_image_large?: string;
    item_movie_webm?: string;
    item_movie_mp4?: string;
    item_movie_webm_small?: string;
    item_movie_mp4_small?: string;
    animated?: boolean;
    profile_theme_id?: string;
  };
}

export interface RawEquippedItem {
  appid?: number;
  item_class?: number;
  name?: string;
  item_title?: string;
  image_small?: string;
  image_large?: string;
  movie_webm?: string;
  movie_mp4?: string;
  movie_webm_small?: string;
  movie_mp4_small?: string;
  /** Not seen yet (no theme was equipped on the captured profile). */
  profile_theme_id?: string;
  profile_colors?: unknown;
}

export interface RawPlayerSummary {
  steamid: string;
  personaname: string;
  realname?: string;
  profileurl: string;
  avatarfull: string;
  communityvisibilitystate: number;
  loccountrycode?: string;
  /** 0 offline, 1 online, 2 busy, 3 away, 4 snooze, 5 looking to trade, 6 looking to play. */
  personastate?: number;
  /** Set while the player is in a game. */
  gameid?: string;
  /** The game's name; can be set without `gameid` for a non-Steam game. */
  gameextrainfo?: string;
}

/* ---------- Catalogue ---------- */

function video(webm?: string, mp4?: string) {
  return webm || mp4 ? { webm, mp4 } : undefined;
}

export function normalizeRewardItem(raw: RawRewardItem): ShopItem | null {
  const type = TYPE_BY_CLASS[raw.community_item_class];
  const d = raw.community_item_data;
  if (!type || !d || !raw.appid) return null;
  const url = (file?: string) => catalogueAssetUrl(raw.appid, file);

  const item: ShopItem = {
    type,
    appid: raw.appid,
    defid: raw.defid,
    name: d.item_title || d.item_name || "Untitled item",
    description: d.item_description || undefined,
    pointCost: Number(raw.point_cost ?? 0),
    animated: Boolean(d.animated) || Boolean(d.item_movie_webm || d.item_movie_mp4),
    buyUrl: pointsShopAppUrl(raw.appid),
  };

  switch (type) {
    case "background":
    case "mini-background":
      item.image = url(d.item_image_large);
      item.thumbnail = item.image;
      item.video = video(url(d.item_movie_webm), url(d.item_movie_mp4));
      item.videoSmall = video(url(d.item_movie_webm_small), url(d.item_movie_mp4_small));
      break;
    case "avatar-frame":
      // Steam's naming is backwards here: image_small is the animated APNG,
      // image_large is a small static PNG (see reference/api/FINDINGS.md).
      item.image = url(d.item_image_large);
      item.animatedImage = url(d.item_image_small);
      item.thumbnail = item.image ?? item.animatedImage;
      break;
    case "animated-avatar":
      item.image = url(d.item_image_large);
      item.animatedImage = url(d.item_image_small);
      item.thumbnail = item.animatedImage ?? item.image;
      break;
    case "theme":
      item.image = url(d.item_image_large);
      item.thumbnail = url(d.item_image_small) ?? item.image;
      item.themeId = d.profile_theme_id;
      item.bundleDefids = raw.bundle_defids?.length ? raw.bundle_defids : undefined;
      break;
  }
  return stripUndefined(item);
}

/* ---------- Equipped items ---------- */

function normalizeEquippedItem(raw: RawEquippedItem | undefined, type: ItemType): Cosmetic | undefined {
  if (!raw || !raw.appid) return undefined;
  const item: Cosmetic = {
    type,
    appid: raw.appid,
    name: raw.item_title || raw.name || "Equipped item",
  };
  switch (type) {
    case "background":
    case "mini-background":
      item.image = assetUrl(raw.image_large);
      item.video = video(assetUrl(raw.movie_webm), assetUrl(raw.movie_mp4));
      item.videoSmall = video(assetUrl(raw.movie_webm_small), assetUrl(raw.movie_mp4_small));
      break;
    case "avatar-frame":
    case "animated-avatar":
      item.image = assetUrl(raw.image_large);
      item.animatedImage = assetUrl(raw.image_small);
      break;
    case "theme":
      // Unverified: no captured profile had a theme equipped.
      item.themeId = raw.profile_theme_id;
      break;
  }
  return stripUndefined(item);
}

export function normalizeEquipped(raw: Record<string, RawEquippedItem | undefined> | undefined): Equipped {
  if (!raw) return {};
  return stripUndefined({
    background: normalizeEquippedItem(raw.profile_background, "background"),
    miniBackground: normalizeEquippedItem(raw.mini_profile_background, "mini-background"),
    avatarFrame: normalizeEquippedItem(raw.avatar_frame, "avatar-frame"),
    animatedAvatar: normalizeEquippedItem(raw.animated_avatar, "animated-avatar"),
    theme: normalizeEquippedItem(raw.profile_modifier, "theme"),
  });
}

/* ---------- Profile ---------- */

export function normalizeProfile(
  summary: RawPlayerSummary,
  level: number | null,
  equipped: Equipped,
  themeId?: string,
): Profile {
  return stripUndefined({
    steamId: summary.steamid,
    name: summary.personaname,
    realName: summary.realname || undefined,
    profileUrl: summary.profileurl,
    avatar: summary.avatarfull,
    countryCode: summary.loccountrycode || undefined,
    level,
    status: summary.gameid || summary.gameextrainfo ? "in-game" : summary.personastate ? "online" : "offline",
    // 3 = public; 1 = private or friends-only, as far as the Web API says.
    isPublic: summary.communityvisibilitystate === 3,
    themeId: themeId || undefined,
    equipped,
  });
}

/** Drop `undefined` fields (and empty nested objects) so JSON stays tidy. */
function stripUndefined<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key];
    if (v === undefined) delete obj[key];
  }
  return obj;
}
