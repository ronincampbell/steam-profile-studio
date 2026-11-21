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
  /**
   * "long": images uploaded as wide images, which Steam shows at full height,
   * 506px and 100px wide, without letterboxing (reference/ARTWORK_WORKFLOW.md §1).
   * Missing means normal: fitted into 480×480 and 100×80 boxes.
   */
  mode?: "normal" | "long";
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
  /** When Steam sent the page these were read from (ISO 8601). Absent for `unavailable`. */
  fetchedAt?: string;
  /**
   * Set when Steam failed just now and this is the last good copy instead:
   * `rate-limited` for a 429, `steam-error` for anything else (5xx, timeout,
   * a page that wasn't a profile).
   */
  staleBecause?: "rate-limited" | "steam-error";
  /** The right-hand column and the favourite badge, read from the same page. */
  sidebar?: ProfileSidebar;
}

/* ---------- Right-hand column (div.profile_rightcol) ---------- */

/** One "Games 394" line. `total` is missing when Steam shows no number (Inventory). */
export interface CountLink {
  label: string;
  total?: string;
  href: string;
}

export type PersonaState = "online" | "offline" | "in-game";

/** The badge under "Level 75" in the header (div.profile_header_badge). */
export interface FavoriteBadge {
  href: string;
  image: string;
  name: string;
  /** "100 XP" */
  xp: string;
  /** Tooltip lines, e.g. ["Lost Soul", "Level 1 Hyper Light Drifter Badge"]. */
  tooltip: string[];
}

export interface SidebarGroup {
  name: string;
  href: string;
  avatar: string;
  /** "22 Members" */
  members: string;
  /** The primary group is drawn bigger (64px avatar). */
  primary: boolean;
}

/** One friend in the top-friends list. */
export interface SidebarFriend {
  level: number | null;
  state: PersonaState;
  name?: string;
  avatar?: string;
  href?: string;
  /** The grey line under the name, e.g. "Online" or a game name. */
  detail?: string;
}

export interface ProfileSidebar {
  favoriteBadge?: FavoriteBadge;
  /** div.profile_in_game: "Currently Online", or "Currently In-Game" plus the game. */
  status?: { state: PersonaState; header: string; detail?: string };
  awards?: CountLink & { icons: { image: string; animatedImage?: string; tooltip: string }[] };
  badges?: CountLink & { icons: { href: string; image: string; tooltip: string[] }[] };
  /** Games, Inventory, Screenshots, Reviews, Artwork… in Steam's order. */
  itemLinks: CountLink[];
  groups?: CountLink & { list: SidebarGroup[] };
  friends?: CountLink & { list: SidebarFriend[] };
}
