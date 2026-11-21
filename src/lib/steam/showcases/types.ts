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
