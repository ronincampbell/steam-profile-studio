/**
 * The normalised shapes the app works with. Steam's raw responses are
 * converted into these by `normalize.ts`, so components never deal with
 * Steam's field names or relative asset paths.
 */

/** The item types the app can preview, and their Points Shop class numbers. */
export const ITEM_TYPES = {
  background: 3,
  theme: 8,
  "mini-background": 13,
  "avatar-frame": 14,
  "animated-avatar": 15,
} as const;

export type ItemType = keyof typeof ITEM_TYPES;

export function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && Object.hasOwn(ITEM_TYPES, value);
}

/** A video in both formats Steam ships; browsers pick the first they can play. */
export interface Video {
  webm?: string;
  mp4?: string;
}

/**
 * One cosmetic, whether it came from the catalogue or from what a profile has
 * equipped. All URLs are absolute.
 */
export interface Cosmetic {
  type: ItemType;
  appid: number;
  name: string;
  /**
   * Static image. Backgrounds: the full image (or poster frame if animated).
   * Frames: static PNG. Animated avatars: static JPG.
   */
  image?: string;
  /** Frames: the animated APNG. Animated avatars: the animated GIF. */
  animatedImage?: string;
  /** Animated backgrounds and mini backgrounds only. */
  video?: Video;
  /** A lighter video Steam uses for small previews. */
  videoSmall?: Video;
  /** Themes only: Steam's theme id, e.g. "Purple" or "GameProfile". */
  themeId?: string;
}

/** A Points Shop catalogue entry: a cosmetic plus what it costs and where to buy it. */
export interface ShopItem extends Cosmetic {
  defid: number;
  description?: string;
  pointCost: number;
  animated: boolean;
  /** Thumbnail for the browser grid (smaller than `image` where Steam has one). */
  thumbnail?: string;
  /** Points Shop game page that lists this item (there's no per-item URL). */
  buyUrl: string;
  /**
   * Themes only. Every Points Shop "profile theme" is really a bundle: a
   * colour scheme plus a background, mini background, avatar frame and
   * animated avatar, listed here by defid. Fetch them from /api/bundle.
   */
  bundleDefids?: number[];
  /** The game (or Steam event) the item comes from, when the store knows it. */
  game?: string;
}

/* ---------- Browsing ---------- */

export type SortMode = "popular" | "new";
export const SORT_MODES: readonly SortMode[] = ["popular", "new"];

/** Backgrounds only: Steam sorts these into animated and still. */
export type Motion = "animated" | "still";

/**
 * Quick filters built from the item's game's Steam store tags (only a game's
 * strongest tags count). `events` is Steam's own sale and festival items.
 */
export const VIBES = {
  anime: { label: "Anime", tags: ["Anime"] },
  cute: { label: "Cute", tags: ["Cute"] },
  horror: { label: "Horror", tags: ["Horror", "Psychological Horror", "Survival Horror"] },
  pixel: { label: "Pixel art", tags: ["Pixel Graphics"] },
  scifi: { label: "Sci-fi", tags: ["Sci-fi", "Space", "Cyberpunk"] },
  fantasy: { label: "Fantasy", tags: ["Fantasy", "Dark Fantasy"] },
  cozy: { label: "Cozy", tags: ["Relaxing", "Cozy", "Wholesome"] },
  retro: { label: "Retro", tags: ["Retro"] },
  events: { label: "Steam events", tags: [] },
} as const satisfies Record<string, { label: string; tags: readonly string[] }>;

export type Vibe = keyof typeof VIBES;

export function isVibe(value: unknown): value is Vibe {
  return typeof value === "string" && Object.hasOwn(VIBES, value);
}

/** What the store says about an item's game. */
export interface GameInfo {
  appid: number;
  name: string;
  /** 231×87 store capsule; Steam events have none. */
  capsule?: string;
  /** Store tags, strongest first. */
  tags: string[];
  /** A Steam sale or festival rather than a game. */
  event: boolean;
}

/** One game's row in the "By game" view. */
export interface GameGroup {
  appid: number;
  name: string;
  capsule?: string;
  /** How many of its items match. */
  count: number;
  /** Its most popular matching items, for the preview strip. */
  items: ShopItem[];
  /** In the loaded profile's library. */
  mine: boolean;
}

export interface GamesPage {
  type: ItemType;
  groups: GameGroup[];
  /** Matching games in total, and how many of those the profile owns. */
  total: number;
  mineTotal: number;
  nextCursor?: string;
}

export interface CataloguePage {
  type: ItemType;
  items: ShopItem[];
  total: number;
  /** Pass back as `cursor` for the next page; absent on the last page. */
  nextCursor?: string;
}

export interface Equipped {
  background?: Cosmetic;
  miniBackground?: Cosmetic;
  avatarFrame?: Cosmetic;
  animatedAvatar?: Cosmetic;
  theme?: Cosmetic;
}

export interface Profile {
  steamId: string;
  name: string;
  realName?: string;
  profileUrl: string;
  /** Steam's 184×184 avatar. */
  avatar: string;
  countryCode?: string;
  /** null when Steam won't say (private profile). */
  level: number | null;
  /** Drives the coloured edge around the avatar, as on Steam. */
  status: "online" | "offline" | "in-game";
  /** Private and friends-only profiles show only name and avatar on Steam. */
  isPublic: boolean;
  /** Steam theme id from GetProfileCustomization, e.g. "Steel"; absent = default. */
  themeId?: string;
  equipped: Equipped;
}
