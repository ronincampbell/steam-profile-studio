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
  /** The image's inline max-width on Steam (480, 506, 630…), when it has one. */
  maxWidth?: number;
}

/** The "Up Votes 57" style counts under a large artwork, screenshot or video. */
export interface ScreenshotStat {
  /** Steam's hover text: "Up Votes", "Comments" or "Favorites". */
  name: string;
  value: string;
  /** Icon image; absent for Favorites, which Steam draws from a CSS sprite. */
  icon?: string;
}

export interface ArtworkShowcase {
  kind: "artwork";
  title: string;
  /** The large image on the left, with its title (Steam shows it under the image). */
  primary: (ArtworkImage & { name: string; stats?: ScreenshotStat[] }) | null;
  /** Up to 3 small images on the right. */
  small: ArtworkImage[];
  /** The "+ 41" tile under the small images, linking to all of them. */
  more?: { text: string; href: string };
  /**
   * "long": images uploaded as wide images, which Steam shows at full height,
   * 506px and 100px wide, without letterboxing (reference/ARTWORK_WORKFLOW.md §1).
   * Missing means normal: fitted into 480×480 and 100×80 boxes.
   */
  mode?: "normal" | "long";
}

/**
 * Screenshot Showcase (type 7), Video Showcase (14) and Featured Artwork (22)
 * use the Artwork showcase's markup. Featured Artwork has one wide image
 * (`.screenshot_showcase_primary.single`) and no small ones; videos have a
 * play icon over the large image.
 */
export interface ScreenshotShowcase extends Omit<ArtworkShowcase, "kind"> {
  kind: "screenshot" | "video" | "featuredArtwork";
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

/** Rarest Achievement Showcase (type 1): Steam picks the player's rarest achievements. */
export interface RareAchievementShowcase extends Omit<AchievementShowcase, "kind"> {
  kind: "rareAchievement";
}

/** One inventory item tile (Item Showcase and Items Up For Trade). */
export interface EconomyItem {
  /** The item in the owner's inventory. */
  href: string;
  image: string;
  /** Steam's 2x image, when it sends one. */
  image2x?: string;
  /** Rarity colours Steam sets inline on the tile. */
  borderColor?: string;
  backgroundColor?: string;
}

export interface ItemShowcase {
  kind: "item";
  title: string;
  items: EconomyItem[];
  /** "1,695 Items Owned", shown after the items. */
  count?: ShowcaseStat;
}

export interface TradeShowcase {
  kind: "trade";
  title: string;
  items: EconomyItem[];
  /** Items Owned, Trades Made, Market Transactions. */
  stats: ShowcaseStat[];
  /** The player's note, as cleaned HTML (see sanitizeNotes). */
  notes?: string;
}

/** The achievement, badge and review strip under a Favorite Game. */
export interface GameInfoStats {
  achievements?: {
    /** The completion trophy, as in Completionist. */
    ribbons: CompletionRibbonGroup[];
    /** "38 / 54 Achievements" */
    summary: string;
    href: string;
    /** "2 Rare" */
    rare?: string;
    /** Bar segments: how many achievements each colour covers, then the locked rest. */
    bar: { segments: { variant: string; weight: number }[]; locked: number };
    icons: { image: string; name: string; href: string }[];
    /** The "+33" tile after the icons. */
    more?: { text: string; href: string };
  };
  badge?: { href: string; icon: string; name: string; xp: string };
  /** "Review 1" style links, with Steam's icon type (recommendation, guide, screenshot…). */
  files: { type: string; text: string; href: string }[];
}

export interface FavoriteGameShowcase {
  kind: "favoriteGame";
  title: string;
  game: { href: string; image: string; name: string; adultContent: boolean } | null;
  /** Hours played, Achievements. */
  stats: ShowcaseStat[];
  info?: GameInfoStats;
}

export interface CustomTextShowcase {
  kind: "customText";
  /** The player's own title. */
  title: string;
  /** Cleaned HTML (see sanitizeNotes). */
  notes: string;
}

export interface FavoriteGroupShowcase {
  kind: "favoriteGroup";
  title: string;
  group: {
    href: string;
    avatar: string;
    name: string;
    /** " - Public Group" */
    suffix: string;
    /** Cleaned HTML (see sanitizeNotes); often empty. */
    description: string;
    /** Members, In-Game, Online, In Chat. `variant` is Steam's extra class (ingame, online, inchat). */
    stats: (ShowcaseStat & { variant?: string })[];
  } | null;
}

export interface ReviewShowcase {
  kind: "review";
  title: string;
  game: { href: string; image: string; name: string; playtime: string; adultContent: boolean } | null;
  /** The review text, as cleaned HTML (see sanitizeNotes). */
  notes: string;
  /** "Leave a comment" button. */
  comment?: { href: string; label: string };
}

export interface WorkshopItemShowcase {
  kind: "workshopItem";
  title: string;
  item: {
    href: string;
    /** Preview, letterboxed by Steam to fit 160×160. */
    image: string;
    name: string;
    description: string;
    stars?: { image: string; text: string };
    app?: { name: string; href: string; icon: string };
    /** "Created by - " */
    creditPrefix: string;
    authors: { name: string; href: string }[];
    /** Text between author links (" and ", ", "). */
    authorSeparators: string[];
  } | null;
}

export interface MyWorkshopShowcase {
  kind: "myWorkshop";
  title: string;
  /** The bar above the items: the player's avatar and "<name>'s Workshop". */
  owner: { href: string; avatar: string; status: string; name: string; workshopHref: string };
  items: { href: string; image: string; name: string; appIcon?: string }[];
  stats: ShowcaseStat[];
}

export interface MyGuidesShowcase {
  kind: "myGuides";
  title: string;
  /** Same bar as My Workshop, linking to the player's guides. */
  owner: MyWorkshopShowcase["owner"];
  guides: {
    href: string;
    /** Preview, letterboxed by Steam to fit 66×66. */
    image: string;
    appIcon?: string;
    name: string;
    /** "By <name>" */
    author: string;
    /** Steam alternates `left` on the slots of the left column. */
    left: boolean;
  }[];
  stats: ShowcaseStat[];
}

export interface SalienShowcase {
  kind: "salien";
  title: string;
  /** Layers of the Salien, by Steam's element id (body, arms, eyes, legs, mouth, shirt, hat). */
  parts: { id: string; image: string }[];
  cryotube: { back?: string; front?: string };
  badge?: { href: string; image: string };
  header: { text: string; href: string };
  /** Level Reached, Bosses Fought, Experience Earned (label above value here). */
  stats: ShowcaseStat[];
}

export interface AwardsShowcase {
  kind: "awards";
  title: string;
  awards: { name: string; image: string; animated?: string; count: string }[];
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
  | RareAchievementShowcase
  | ScreenshotShowcase
  | ItemShowcase
  | TradeShowcase
  | FavoriteGameShowcase
  | CustomTextShowcase
  | FavoriteGroupShowcase
  | ReviewShowcase
  | WorkshopItemShowcase
  | MyWorkshopShowcase
  | MyGuidesShowcase
  | SalienShowcase
  | AwardsShowcase
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
