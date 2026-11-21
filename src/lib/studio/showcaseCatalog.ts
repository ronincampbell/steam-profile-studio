/**
 * Every showcase type Steam has, and what the preview can draw for each.
 *
 * Type numbers are Steam's `EProfileCustomizationType` (see
 * reference/html/SHOWCASES.md). Seven types have their markup captured from a
 * real profile and are drawn exactly like Steam; the other 17 haven't been
 * seen yet, so the preview draws a plainly marked placeholder for them rather
 * than guessing at Steam's layout.
 */
import type { ShowcaseKind } from "@/lib/steam/showcases/types";

export interface ShowcaseTypeInfo {
  /** Steam's EProfileCustomizationType number. */
  type: number;
  /** Steam's enum name, for reference. */
  enumName: string;
  /**
   * The name shown in the picker and in the placeholder's title bar. For the
   * 7 drawn types it's Steam's own English title (from the captured page).
   * For the rest it's a plain description: Steam's wording isn't confirmed.
   */
  label: string;
  /** The parsed showcase kind the preview draws for this type, if it has one. */
  kind?: Exclude<ShowcaseKind, "unsupported">;
  /** Steam no longer offers it (Greenlight closed, the Saliens event ended). */
  retired?: boolean;
}

export const SHOWCASE_TYPES: ShowcaseTypeInfo[] = [
  { type: 1, enumName: "RareAchievementShowcase", label: "Rarest Achievements" },
  { type: 2, enumName: "GameCollector", label: "Game Collector", kind: "gameCollector" },
  { type: 3, enumName: "ItemShowcase", label: "Item Showcase" },
  { type: 4, enumName: "TradeShowcase", label: "Items Up For Trade" },
  { type: 5, enumName: "Badges", label: "Badge Collector", kind: "badgeCollector" },
  { type: 6, enumName: "FavoriteGame", label: "Favorite Game" },
  { type: 7, enumName: "ScreenshotShowcase", label: "Screenshot Showcase" },
  { type: 8, enumName: "CustomText", label: "Custom Info Box" },
  { type: 9, enumName: "FavoriteGroup", label: "Favorite Group" },
  { type: 10, enumName: "Recommendation", label: "Review Showcase" },
  { type: 11, enumName: "WorkshopItem", label: "Favorite Workshop Item" },
  { type: 12, enumName: "MyWorkshop", label: "My Workshop Showcase" },
  { type: 13, enumName: "ArtworkShowcase", label: "Artwork Showcase", kind: "artwork" },
  { type: 14, enumName: "VideoShowcase", label: "Video Showcase" },
  { type: 15, enumName: "Guides", label: "Favorite Guide", kind: "favoriteGuide" },
  { type: 16, enumName: "MyGuides", label: "My Guides Showcase" },
  { type: 17, enumName: "Achievements", label: "Achievement Showcase", kind: "achievement" },
  { type: 18, enumName: "Greenlight", label: "Greenlight Showcase", retired: true },
  { type: 19, enumName: "MyGreenlight", label: "My Greenlight Showcase", retired: true },
  { type: 20, enumName: "Salien", label: "Saliens Showcase", retired: true },
  { type: 21, enumName: "LoyaltyRewardReactions", label: "Points Shop Awards" },
  { type: 22, enumName: "SingleArtworkShowcase", label: "Featured Artwork" },
  { type: 23, enumName: "AchievementsCompletionist", label: "Completionist Showcase", kind: "completionist" },
  { type: 24, enumName: "Replay", label: "Steam Replay", kind: "replay" },
];

const BY_TYPE = new Map(SHOWCASE_TYPES.map((t) => [t.type, t]));

export function showcaseType(type: number): ShowcaseTypeInfo | undefined {
  return BY_TYPE.get(type);
}

/** The type number for a parsed showcase kind (the 7 drawn types). */
export function typeForKind(kind: ShowcaseKind): number | undefined {
  return SHOWCASE_TYPES.find((t) => t.kind === kind)?.type;
}

