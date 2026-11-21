/**
 * Parsers for the showcase types beyond the 7 on Fuzzycast's profile.
 *
 * Each reads markup captured from real public profiles on 21 Nov 2026; the
 * anonymised captures are in reference/html/showcases/ and the markup is
 * described in reference/html/SHOWCASES.md. parse.ts calls
 * `parseMoreShowcase` for any showcase its own parsers don't recognise.
 */
import { parse, type HTMLElement } from "node-html-parser";
import { classes, hasClass, text } from "./dom";
import { imageMaxWidth, parseAchievements, parseRibbons, parseStats } from "./parse";
import type {
  AwardsShowcase,
  CustomTextShowcase,
  EconomyItem,
  FavoriteGameShowcase,
  FavoriteGroupShowcase,
  GameInfoStats,
  ItemShowcase,
  MyGuidesShowcase,
  MyWorkshopShowcase,
  RareAchievementShowcase,
  ReviewShowcase,
  SalienShowcase,
  ScreenshotShowcase,
  ScreenshotStat,
  Showcase,
  TradeShowcase,
  WorkshopItemShowcase,
} from "./types";

/**
 * The showcase in `el`, or null if it isn't one of these types.
 * `el` is the `.profile_customization` div, `block` its `.profile_customization_block`.
 */
export function parseMoreShowcase(el: HTMLElement, block: HTMLElement, title: string): Showcase | null {
  // Screenshot, Video and Featured Artwork share the Artwork markup; the
  // outer div's class says which (myscreenshots, myvideos; Featured Artwork
  // is myart with a `.single` primary image).
  const shots = block.querySelector(".screenshot_showcase");
  if (shots) {
    if (hasClass(el, "myscreenshots")) return parseScreenshots(block, title, "screenshot");
    if (hasClass(el, "myvideos")) return parseScreenshots(block, title, "video");
    if (hasClass(el, "myart") && block.querySelector(".screenshot_showcase_primary.single")) {
      return parseScreenshots(block, title, "featuredArtwork");
    }
  }
  // The rarest-achievements version has the same root as the Achievement
  // showcase, but its tiles have no `showcase_slot` (the player can't pick
  // them) and the first has `first`.
  const ach = block.querySelector(".achievement_showcase");
  if (ach && !ach.querySelector(".showcase_slot") && ach.querySelector(".showcase_achievement.first")) {
    const parsed = parseAchievements(block);
    return { kind: "rareAchievement", title, ...parsed } satisfies RareAchievementShowcase;
  }
  if (block.querySelector(".item_showcase")) return parseItems(block, title);
  if (block.querySelector(".trade_showcase")) return parseTrade(block, title);
  if (block.querySelector(".customtext_showcase")) return parseCustomText(block, title);
  if (block.querySelector(".favoritegroup_showcase")) return parseFavoriteGroup(block, title);
  if (block.querySelector(".recommendation_showcase")) return parseReview(block, title);
  if (block.querySelector(".myworkshop_showcase")) return parseMyWorkshop(el, block, title);
  if (block.querySelector(".myguide_showcase")) return parseMyGuides(el, block, title);
  if (block.querySelector(".salien_showcase")) return parseSalien(block, title);
  if (block.querySelector(".awards_showcase")) return parseAwards(block, title);
  // The Workshop item showcase reuses the Favorite Game root class, so tell
  // them apart by what's inside.
  const fav = block.querySelector(".favoritegame_showcase");
  if (fav?.querySelector(".workshop_showcase_item")) return parseWorkshopItem(block, title);
  if (fav) return parseFavoriteGame(block, title);
  return null;
}

const attr = (el: HTMLElement | null | undefined, name: string) => el?.getAttribute(name) ?? "";

function parseScreenshotStats(scope: HTMLElement | null): ScreenshotStat[] {
  return (scope?.querySelectorAll(".screenshot_showcase_stat") ?? []).map((s) => {
    const icon = s.querySelector("img")?.getAttribute("src");
    return { name: attr(s, "title"), value: text(s), ...(icon ? { icon } : {}) };
  });
}

function parseScreenshots(block: HTMLElement, title: string, kind: ScreenshotShowcase["kind"]): ScreenshotShowcase {
  const image = (slot: HTMLElement | null) => {
    const a = slot?.querySelector("a.screenshot_showcase_screenshot");
    // Videos put the play icon first, then the thumbnail.
    const img = a?.querySelectorAll("img").find((i) => !hasClass(i, "play_video_icon"));
    const src = img?.getAttribute("src");
    if (!a || !src) return null;
    const publishedFileId = a.getAttribute("data-publishedfileid");
    const maxWidth = imageMaxWidth(img);
    return {
      href: attr(a, "href"),
      image: src,
      ...(publishedFileId ? { publishedFileId } : {}),
      ...(maxWidth ? { maxWidth } : {}),
    };
  };
  const primarySlot = block.querySelector(".screenshot_showcase_primary");
  const primary = image(primarySlot);
  const stats = parseScreenshotStats(primarySlot?.querySelector(".screenshot_showcase_stats") ?? null);
  const moreEl = block.querySelector(".screenshot_count");
  return {
    kind,
    title,
    primary: primary
      ? {
          ...primary,
          name: text(primarySlot?.querySelector(".screenshot_showcase_itemname")),
          ...(stats.length ? { stats } : {}),
        }
      : null,
    small: block
      .querySelectorAll(".screenshot_showcase_smallscreenshot.showcase_slot")
      .map(image)
      .filter((i): i is NonNullable<typeof i> => i !== null),
    ...(moreEl ? { more: { text: text(moreEl), href: attr(moreEl, "href") } } : {}),
  };
}

/** Steam sets rarity colours inline: `border-color: #4b69ff; background-color: #2d3042;`. */
function inlineColor(style: string, prop: string): string | undefined {
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(#[0-9a-fA-F]{3,8}|transparent)\\s*(?:;|$)`));
  return m?.[1];
}

function parseEconomyItems(scope: HTMLElement | null): EconomyItem[] {
  return (scope?.querySelectorAll(".item_showcase_item") ?? []).flatMap((slot) => {
    const img = slot.querySelector("img.item_image, img");
    const src = img?.getAttribute("src");
    if (!src) return [];
    const style = attr(slot, "style");
    const image2x = attr(img, "srcset")
      .split(",")
      .map((s) => s.trim().split(/\s+/))
      .find(([, d]) => d === "2x")?.[0];
    const borderColor = inlineColor(style, "border-color");
    const backgroundColor = inlineColor(style, "background-color");
    return [
      {
        href: attr(slot.querySelector("a"), "href"),
        image: src,
        ...(image2x ? { image2x } : {}),
        ...(borderColor ? { borderColor } : {}),
        ...(backgroundColor ? { backgroundColor } : {}),
      },
    ];
  });
}

function parseItems(block: HTMLElement, title: string): ItemShowcase {
  const count = parseStats(block).find(Boolean);
  return { kind: "item", title, items: parseEconomyItems(block), ...(count ? { count } : {}) };
}

function parseTrade(block: HTMLElement, title: string): TradeShowcase {
  const notes = sanitizeNotes(block.querySelector(".showcase_notes"));
  return {
    kind: "trade",
    title,
    items: parseEconomyItems(block.querySelector(".trade_showcase_items")),
    stats: parseStats(block.querySelector(".showcase_stats_trading")),
    ...(notes ? { notes } : {}),
  };
}

function parseCustomText(block: HTMLElement, title: string): CustomTextShowcase {
  return { kind: "customText", title, notes: sanitizeNotes(block.querySelector(".showcase_notes")) };
}

function parseGameCap(scope: HTMLElement | null) {
  const cap = scope?.querySelector(".favorite_game_cap");
  const image = cap?.querySelector("img")?.getAttribute("src");
  if (!scope || !cap || !image) return null;
  return {
    href: attr(cap.querySelector("a"), "href"),
    image,
    name: text(scope.querySelector(".showcase_item_detail_title")),
    adultContent: hasClass(cap, "app_has_adult_content"),
  };
}

function parseFavoriteGame(block: HTMLElement, title: string): FavoriteGameShowcase {
  const info = block.querySelector(".game_info_stats");
  return {
    kind: "favoriteGame",
    title,
    game: parseGameCap(block.querySelector(".favoritegame_showcase_game")),
    stats: parseStats(block.querySelector(".showcase_content_bg .showcase_stats_row")),
    ...(info ? { info: parseGameInfo(info) } : {}),
  };
}

function parseGameInfo(info: HTMLElement): GameInfoStats {
  const out: GameInfoStats = { files: [] };
  const ach = info.querySelector(".game_info_achievements");
  if (ach) {
    const summary = ach.querySelector(".game_info_achievement_summary a");
    const rare = text(ach.querySelector(".num_rare"));
    // Steam sizes the bar's segments with an inline grid template:
    // `grid-template-columns: minmax(1px, 38fr) 16fr;`, one fr per segment, locked last.
    const bar = ach.querySelector(".achievement_segmented_bar");
    const weights = [...attr(bar, "style").matchAll(/([\d.]+)fr/g)].map((m) => Number(m[1]));
    const segments = (bar?.querySelectorAll(".segment") ?? []).map((s, i) => ({
      variant: classes(s).find((c) => c !== "segment") ?? "base",
      weight: weights[i] ?? 0,
    }));
    const moreEl = ach.querySelector(".game_info_achievement.plus_more");
    const moreHref = attr(moreEl, "onclick").match(/window\.location\s*=\s*'([^']+)'/)?.[1];
    out.achievements = {
      ribbons: parseRibbons(ach.querySelector(".game_info_achievements_ribbons")),
      summary: text(summary),
      href: attr(summary, "href"),
      ...(rare ? { rare } : {}),
      bar: { segments, locked: weights[segments.length] ?? 0 },
      icons: ach
        .querySelectorAll(".game_info_achievement")
        .filter((a) => !hasClass(a, "plus_more"))
        .flatMap((a) => {
          const image = a.querySelector("img")?.getAttribute("src");
          return image
            ? [{ image, name: attr(a, "data-tooltip-text").trim(), href: attr(a.querySelector("a"), "href") }]
            : [];
        }),
      ...(moreEl ? { more: { text: text(moreEl), href: moreHref ?? "" } } : {}),
    };
  }
  const badge = info.querySelector(".game_info_badge");
  const badgeIcon = badge?.querySelector(".game_info_badge_icon img")?.getAttribute("src");
  if (badge && badgeIcon) {
    out.badge = {
      href: attr(badge.querySelector(".game_info_badge_icon a"), "href"),
      icon: badgeIcon,
      name: text(badge.querySelector(".game_info_badge_description .name")),
      xp: text(badge.querySelector(".game_info_badge_description .xp")),
    };
  }
  out.files = info.querySelectorAll(".published_file_count_ctn").map((f) => {
    const link = f.querySelector(".published_file_link");
    return {
      type: classes(f.querySelector(".published_file_icon")).find((c) => c !== "published_file_icon") ?? "",
      text: text(link),
      href: attr(link, "href"),
    };
  });
  return out;
}

function parseFavoriteGroup(block: HTMLElement, title: string): FavoriteGroupShowcase {
  const g = block.querySelector(".favoritegroup_showcase_group");
  const avatar = g?.querySelector(".favoritegroup_avatar img")?.getAttribute("src");
  if (!g || !avatar) return { kind: "favoriteGroup", title, group: null };
  const nameRow = g.querySelector(".favoritegroup_namerow");
  const nameLink = nameRow?.querySelector(".favoritegroup_name");
  const suffix = (nameRow?.childNodes ?? [])
    .filter((n) => n !== nameLink)
    .map((n) => n.text)
    .join("")
    .replace(/\s+/g, " ")
    .trimEnd();
  return {
    kind: "favoriteGroup",
    title,
    group: {
      href: attr(nameLink, "href"),
      avatar,
      name: text(nameLink),
      suffix,
      description: sanitizeNotes(g.querySelector(".favoritegroup_description")),
      stats: parseStats(g.querySelector(".favoritegroup_stats")).map((s, i) => {
        const el = g.querySelectorAll(".favoritegroup_stats .showcase_stat")[i];
        const variant = classes(el)
          .find((c) => c.startsWith("favoritegroup_"))
          ?.slice("favoritegroup_".length);
        return variant ? { ...s, variant } : s;
      }),
    },
  };
}

function parseReview(block: HTMLElement, title: string): ReviewShowcase {
  const game = parseGameCap(block.querySelector(".favoritegame_showcase_game"));
  const button = block.querySelector("a.btn_grey_black");
  return {
    kind: "review",
    title,
    game: game ? { ...game, playtime: text(block.querySelector(".favorite_game_playtime")) } : null,
    notes: sanitizeNotes(block.querySelector(".showcase_notes")),
    ...(button ? { comment: { href: attr(button, "href"), label: text(button) } } : {}),
  };
}

/** "Created by - <a>A</a> and <a>B</a>": the prefix, the authors and the text between them. */
function parseCredits(scope: HTMLElement | null) {
  const links = scope?.querySelectorAll("a") ?? [];
  const parts = (scope?.innerHTML ?? "").split(/<a\b[^>]*>[\s\S]*?<\/a>/i).map((p) => parse(p).text.replace(/\s+/g, " "));
  return {
    creditPrefix: (parts[0] ?? "").trimStart(),
    authors: links.map((a) => ({ name: text(a), href: attr(a, "href") })),
    authorSeparators: parts.slice(1, links.length),
  };
}

function parseWorkshopItem(block: HTMLElement, title: string): WorkshopItemShowcase {
  const item = block.querySelector(".workshop_showcase_item");
  const link = item?.querySelector("a.ugc");
  const image = link?.querySelector("img")?.getAttribute("src");
  if (!item || !link || !image) return { kind: "workshopItem", title, item: null };
  const starsEl = item.querySelector(".workshop_showcase_stars");
  const starsImage = starsEl?.querySelector("img")?.getAttribute("src");
  const appEl = item.querySelector(".workshop_showcase_app");
  const appLinks = appEl?.querySelectorAll("a") ?? [];
  const appIcon = appEl?.querySelector("img")?.getAttribute("src");
  return {
    kind: "workshopItem",
    title,
    item: {
      href: attr(link, "href"),
      image,
      name: text(item.querySelector(".showcase_item_detail_title")),
      description: text(item.querySelector(".workshop_showcase_item_description")),
      ...(starsEl && starsImage ? { stars: { image: starsImage, text: text(starsEl) } } : {}),
      ...(appEl && appIcon
        ? { app: { name: text(appLinks[appLinks.length - 1]), href: attr(appLinks[0], "href"), icon: appIcon } }
        : {}),
      ...parseCredits(item.querySelector(".workshop_showcase_creator_details")),
    },
  };
}

/** The owner bar of My Workshop and My Guides: it sits between the title bar and the block. */
function parseOwnerBar(el: HTMLElement): MyWorkshopShowcase["owner"] {
  const header = el.querySelector(".myworkshop_showcase_header");
  const avatar = header?.querySelector(".playerAvatar");
  const nameLink = header?.querySelector(".myworkshop_playerName");
  return {
    href: attr(avatar?.querySelector("a"), "href"),
    avatar: attr(avatar?.querySelector("img"), "src"),
    status: classes(avatar).find((c) => c !== "playerAvatar") ?? "offline",
    name: text(nameLink),
    workshopHref: attr(nameLink, "href"),
  };
}

function parseMyGuides(el: HTMLElement, block: HTMLElement, title: string): MyGuidesShowcase {
  return {
    kind: "myGuides",
    title,
    owner: parseOwnerBar(el),
    guides: block.querySelectorAll(".myguide_showcase_item_ctn").flatMap((slot) => {
      const a = slot.querySelector("a");
      const image = slot.querySelector("img.guide_showcase_image")?.getAttribute("src");
      if (!a || !image) return [];
      const appIcon = slot.querySelector(".workshop_showcase_mini_app img")?.getAttribute("src");
      return [
        {
          href: attr(a, "href"),
          image,
          ...(appIcon ? { appIcon } : {}),
          name: text(slot.querySelector(".guide_showcase_title")),
          author: text(slot.querySelector(".guide_showcase_author")),
          left: hasClass(slot, "left"),
        },
      ];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}

function parseMyWorkshop(el: HTMLElement, block: HTMLElement, title: string): MyWorkshopShowcase {
  return {
    kind: "myWorkshop",
    title,
    owner: parseOwnerBar(el),
    items: block.querySelectorAll(".workshop_showcase_multiitem").flatMap((slot) => {
      const a = slot.querySelector("a");
      const image = a?.querySelector("img")?.getAttribute("src");
      if (!a || !image) return [];
      const appIcon = slot.querySelector(".workshop_showcase_mini_app img")?.getAttribute("src");
      return [{ href: attr(a, "href"), image, name: attr(a, "title"), ...(appIcon ? { appIcon } : {}) }];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}

function parseSalien(block: HTMLElement, title: string): SalienShowcase {
  const src = (sel: string) => block.querySelector(sel)?.getAttribute("src") ?? undefined;
  const badgeLink = block.querySelector(".showcase_salienbadge_cont a");
  const badgeImage = badgeLink?.querySelector("img")?.getAttribute("src");
  const header = block.querySelector(".showcase_stats_salien_header a");
  const back = src("#showcase_salien_cryotube_back");
  const front = src("#showcase_salien_cryotube_front");
  return {
    kind: "salien",
    title,
    parts: block.querySelectorAll(".showcase_salien_cont img").map((i) => ({
      id: attr(i, "id").replace(/^showcase_salien_/, ""),
      image: attr(i, "src"),
    })),
    cryotube: { ...(back ? { back } : {}), ...(front ? { front } : {}) },
    ...(badgeLink && badgeImage ? { badge: { href: attr(badgeLink, "href"), image: badgeImage } } : {}),
    header: { text: text(header), href: attr(header, "href") },
    stats: parseStats(block.querySelector(".showcase_stats_salien")),
  };
}

function parseAwards(block: HTMLElement, title: string): AwardsShowcase {
  return {
    kind: "awards",
    title,
    awards: block.querySelectorAll(".showcase_award").flatMap((a) => {
      const img = a.querySelector("img.showcase_award_icon");
      const image = img?.getAttribute("src");
      if (!image) return [];
      const animated = img?.getAttribute("data-animate-on-hover-src");
      return [
        {
          name: parse(attr(a, "data-tooltip-html")).text.trim(),
          image,
          ...(animated ? { animated } : {}),
          count: text(a.querySelector(".showcase_award_count")),
        },
      ];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}

/* ---------- Player-written text ---------- */

const ALLOWED_TAGS = new Set([
  "br", "b", "strong", "i", "em", "u", "s", "strike", "span", "div", "a",
  "ul", "ol", "li", "blockquote", "hr", "img", "code", "pre",
]);

/**
 * Player-written text (Custom Info Box, review, trade note, group
 * description) as safe HTML. Steam turns the player's BBCode into HTML with
 * `bb_*` classes and emoticon images; this keeps only those tags and
 * classes, links to http(s) only, and images only for Steam's emoticons, so
 * the result can be put into the page as-is.
 */
export function sanitizeNotes(el: HTMLElement | null): string {
  if (!el) return "";
  return clean(el).trim();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function clean(el: HTMLElement): string {
  return el.childNodes
    .map((n) => {
      if (n.nodeType === 3) return escapeHtml(n.text).replace(/\s+/g, " ");
      if (n.nodeType !== 1) return "";
      const child = n as HTMLElement;
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return clean(child);
      const cls = classes(child).filter((c) => /^(bb_[a-z_0-9]+|emoticon|ellipsis)$/.test(c));
      const attrs: string[] = [];
      if (cls.length) attrs.push(`class="${cls.join(" ")}"`);
      if (tag === "a") {
        const href = child.getAttribute("href") ?? "";
        if (/^https?:\/\//i.test(href)) attrs.push(`href="${escapeHtml(href)}" target="_blank" rel="noreferrer"`);
      }
      if (tag === "img") {
        const src = child.getAttribute("src") ?? "";
        if (!cls.includes("emoticon") || !/^https:\/\/[a-z0-9.-]+\.steamstatic\.com\//i.test(src)) return "";
        return `<img ${attrs.join(" ")} src="${escapeHtml(src)}" alt="${escapeHtml(child.getAttribute("alt") ?? "")}">`;
      }
      const open = `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
      if (tag === "br" || tag === "hr") return open;
      return `${open}${clean(child)}</${tag}>`;
    })
    .join("");
}

