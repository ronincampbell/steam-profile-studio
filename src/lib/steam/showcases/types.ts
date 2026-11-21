/**
 * Profile showcases, as parsed from a public Steam profile page.
 *
 * Steam doesn't put showcase contents in the Web API, so these come from the
 * profile page's HTML (see reference/html/SHOWCASES.md for the markup).
 * Every URL here is an absolute Steam URL, taken as-is from the page.
 */

/** One big number in a showcase's stats row ("394 Games"). */
export interface ShowcaseStat {
  /** As Steam writes it, e.g. "3,470" or "28%". */
  value: string;
  label: string;
  /** Present when the stat is a link on Steam. */
  href?: string;
  /** Steam's hover text, when it has one. */
  tooltip?: string;
}

/** One artwork in the Artwork showcase. */
export interface ArtworkImage {
  /** The artwork's page on Steam. */
  href: string;
  /** Steam's resized, letterboxed image. */
  image: string;
  publishedFileId?: string;
}

export interface ArtworkShowcase {
  kind: "artwork";
  title: string;
  /** The large image on the left, with its title (Steam shows it under the image). */
  primary: (ArtworkImage & { name: string }) | null;
  /** Up to 3 small images on the right. */
  small: ArtworkImage[];
}

export interface GameCollectorShowcase {
  kind: "gameCollector";
  title: string;
  stats: ShowcaseStat[];
  /** "Featured Games", when the showcase has featured games. */
  bodyLabel?: string;
  games: { appid: number | null; href: string; image: string }[];
}

export interface BadgeCollectorShowcase {
  kind: "badgeCollector";
  title: string;
  /** `tooltip` lines, e.g. ["Sophomore", "Level 2 Goodbye Volcano High Badge"]. */
  badges: { href: string; image: string; tooltip: string[] }[];
  stats: ShowcaseStat[];
}

export interface FavoriteGuideShowcase {
  kind: "favoriteGuide";
  title: string;
  guide: {
    href: string;
    /** Preview image, letterboxed by Steam to fit 160×160. */
    image: string;
    publishedFileId?: string;
    name: string;
    /** "Created by - " in English, as Steam writes it. */
    creditPrefix: string;
    authors: { name: string; href: string }[];
    /** Star rating image (e.g. 4-star.png) and its text ("110 ratings"). */
    stars?: { image: string; text: string };
    app?: { name: string; href: string; icon: string };
    description: string;
  } | null;
}

/** One completion trophy group under a Completionist capsule. */
export interface CompletionRibbonGroup {
  /** "base" (blue), "dlc" (purple) or "empty" (grey); other Steam classes kept as-is. */
  variant: string;
  /** Count shown before the trophies, when Steam shows one. */
  count?: string;
  /** How many trophies are drawn (the first in front, the rest stacked behind). */
  trophies: number;
}

export interface CompletionistShowcase {
  kind: "completionist";
  title: string;
  games: {
    href: string;
    image: string;
    /** Steam blurs the capsule of a game with adult content for visitors. */
    adultContent: boolean;
    ribbons: CompletionRibbonGroup[];
    /** "42 Achievements" */
    achievements: string;
    /** "35 RARE", when Steam shows it. */
    subtitle?: string;
  }[];
  stats: ShowcaseStat[];
}

export interface ReplayShowcase {
  kind: "replay";
  title: string;
  year: number;
  /** Link to the Year in Review page. */
  href?: string;
  /** Capsules in the faded, rotated backdrop, and the size class Steam gave them. */
  background: { size: string; images: string[] };
  gamesPlayed: { value: string; highNum: boolean; label: string };
  /** Sessions, Achievements, New Games. `size` is Steam's mid_stat class: normal, high_num, really_high_num. */
  stats: { key: string; value: string; size: string; label: string }[];
  mostPlayed: { image: string; percent: string }[];
}

export interface AchievementShowcase {
  kind: "achievement";
  title: string;
  achievements: {
    href: string;
    image: string;
    /** Under 10% of players have it: Steam adds a gold glow. */
    rare: boolean;
    name?: string;
    description?: string;
    game?: string;
    /** "9.3% of players have this" */
    percent?: string;
  }[];
  stats: ShowcaseStat[];
}

/** A showcase the preview doesn't draw yet: shown as its title bar only. */
export interface UnsupportedShowcase {
  kind: "unsupported";
  title: string;
  /** The showcase's type-specific root class, e.g. "achievement_showcase". */
  rootClass: string;
}

export type Showcase =
  | ArtworkShowcase
  | GameCollectorShowcase
  | BadgeCollectorShowcase
  | FavoriteGuideShowcase
  | CompletionistShowcase
  | ReplayShowcase
  | AchievementShowcase
  | UnsupportedShowcase;

export type ShowcaseKind = Showcase["kind"];

/** What /api/profile/showcases returns. */
export interface ProfileShowcases {
  steamId: string;
  /**
   * public: showcases were read (the list may be empty).
   * private: the profile is private (or friends-only), so Steam shows no showcases.
   * unavailable: Steam didn't answer or rate-limited us; try again later.
   */
  visibility: "public" | "private" | "unavailable";
  showcases: Showcase[];
}
