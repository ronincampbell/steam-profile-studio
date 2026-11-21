/**
 * Turn a Steam profile page's HTML into typed showcases.
 *
 * Each showcase on the page is a `div.profile_customization` directly inside
 * `div.profile_customization_area`; what kind it is comes from the
 * type-specific element inside its `.profile_customization_block` (header text
 * is localised, so it's never used to decide the kind). The markup each
 * parser reads is documented in reference/html/SHOWCASES.md, and the tests
 * run against the captured page in reference/html/.
 */
import { parse, type HTMLElement } from "node-html-parser";
import { classes, hasClass, text } from "./dom";
import { parseMoreShowcase } from "./parseMore";
import { parseSidebar } from "./sidebar";
import type {
  AchievementShowcase,
  ArtworkShowcase,
  BadgeCollectorShowcase,
  CompletionistShowcase,
  CompletionRibbonGroup,
  FavoriteGuideShowcase,
  GameCollectorShowcase,
  ProfileSidebar,
  ReplayShowcase,
  Showcase,
  ShowcaseStat,
} from "./types";

export interface ParsedProfilePage {
  /**
   * False when the HTML isn't a profile page at all (Steam's error page, a
   * "profile not found" page, a captcha). Never cache those as a result.
   */
  isProfilePage: boolean;
  /** Steam marks private (and, to visitors, friends-only) profiles with this body class. */
  isPrivate: boolean;
  showcases: Showcase[];
  /** The right-hand column and favourite badge; missing when the page has none (private). */
  sidebar?: ProfileSidebar;
}

export function parseProfilePage(html: string): ParsedProfilePage {
  const root = parse(html);
  const isProfilePage = Boolean(root.querySelector(".profile_page"));
  const isPrivate = Boolean(root.querySelector("body.private_profile, div.profile_page.private_profile"));
  const sidebar = isPrivate ? undefined : parseSidebar(root);
  const area = root.querySelector(".profile_customization_area");
  if (!area) return { isProfilePage, isPrivate, showcases: [], sidebar };

  const showcases = area.children
    .filter((el) => hasClass(el, "profile_customization"))
    .map(parseShowcase)
    .filter((s): s is Showcase => s !== null);
  return { isProfilePage, isPrivate, showcases, sidebar };
}

function parseShowcase(el: HTMLElement): Showcase | null {
  const title = text(el.querySelector(".profile_customization_header"));
  const block = el.querySelector(".profile_customization_block");
  if (!block) return null;

  // Featured Artwork is also `myart`, but with one `.single` image: parseMore handles it.
  if (hasClass(el, "myart") && block.querySelector(".screenshot_showcase") && !block.querySelector(".single")) {
    return parseArtwork(block, title);
  }
  if (block.querySelector(".gamecollector_showcase")) return parseGameCollector(block, title);
  if (block.querySelector(".badge_showcase")) return parseBadgeCollector(block, title);
  if (block.querySelector(".favoriteguide_showcase")) return parseFavoriteGuide(block, title);
  if (block.querySelector(".showcase_achievementscompletionist_games")) return parseCompletionist(block, title);
  if (hasClass(el, "replay_showcase") && block.querySelector(".replay")) return parseReplay(el, block, title);
  if (block.querySelector(".achievement_showcase .showcase_slot")) return parseAchievement(block, title);
  const more = parseMoreShowcase(el, block, title);
  if (more) return more;
  if (block.querySelector(".achievement_showcase")) return parseAchievement(block, title);

  // Not drawn yet: keep its title so the page order stays right, and record
  // which showcase it was. Steam Replay's block holds a link, not a div.
  const rootClass = hasClass(el, "replay_showcase")
    ? "replay_showcase"
    : (classes(block.querySelector("div"))[0] ?? "unknown");
  return { kind: "unsupported", title, rootClass };
}

/** An image's inline `max-width: 480px;`, as a number. */
export function imageMaxWidth(img: HTMLElement | null | undefined): number | undefined {
  const m = (img?.getAttribute("style") ?? "").match(/max-width:\s*(\d+)px/);
  return m ? Number(m[1]) : undefined;
}

export function parseStats(scope: HTMLElement | null): ShowcaseStat[] {
  if (!scope) return [];
  return scope.querySelectorAll(".showcase_stat").map((s) => {
    const stat: ShowcaseStat = { value: text(s.querySelector(".value")), label: text(s.querySelector(".label")) };
    const href = s.tagName === "A" ? s.getAttribute("href") : undefined;
    if (href) stat.href = href;
    const tooltip = s.getAttribute("data-tooltip-text");
    if (tooltip) stat.tooltip = tooltip;
    return stat;
  });
}

function parseArtwork(block: HTMLElement, title: string): ArtworkShowcase {
  const image = (slot: HTMLElement | null) => {
    const a = slot?.querySelector("a.screenshot_showcase_screenshot");
    const src = a?.querySelector("img")?.getAttribute("src");
    if (!a || !src) return null;
    const publishedFileId = a.getAttribute("data-publishedfileid");
    const maxWidth = imageMaxWidth(a.querySelector("img"));
    return {
      href: a.getAttribute("href") ?? "",
      image: src,
      ...(publishedFileId ? { publishedFileId } : {}),
      ...(maxWidth ? { maxWidth } : {}),
    };
  };
  const primarySlot = block.querySelector(".screenshot_showcase_primary");
  const primary = image(primarySlot);
  const stats = (primarySlot?.querySelectorAll(".screenshot_showcase_stat") ?? []).map((s) => {
    const icon = s.querySelector("img")?.getAttribute("src");
    return { name: s.getAttribute("title") ?? "", value: text(s), ...(icon ? { icon } : {}) };
  });
  // "+ 41": Steam links to the rest of the player's artwork (seen on
  // visitors' view of a profile with more than 4 artworks).
  const moreEl = block.querySelector(".screenshot_count");
  return {
    kind: "artwork",
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
    ...(moreEl ? { more: { text: text(moreEl), href: moreEl.getAttribute("href") ?? "" } } : {}),
  };
}

function parseGameCollector(block: HTMLElement, title: string): GameCollectorShowcase {
  const showcase: GameCollectorShowcase = {
    kind: "gameCollector",
    title,
    stats: parseStats(block.querySelector(".showcase_stats_row")),
    games: block.querySelectorAll(".showcase_gamecollector_game").flatMap((slot) => {
      const a = slot.querySelector("a");
      const src = slot.querySelector("img.game_capsule")?.getAttribute("src");
      if (!a || !src) return [];
      const href = a.getAttribute("href") ?? "";
      const appid = Number(href.match(/\/app\/(\d+)/)?.[1]);
      return [{ appid: Number.isFinite(appid) ? appid : null, href, image: src }];
    }),
  };
  const bodyLabel = text(block.querySelector(".showcase_bodylabel"));
  if (bodyLabel) showcase.bodyLabel = bodyLabel;
  return showcase;
}

function parseBadgeCollector(block: HTMLElement, title: string): BadgeCollectorShowcase {
  return {
    kind: "badgeCollector",
    title,
    badges: block.querySelectorAll(".showcase_badge").flatMap((slot) => {
      const src = slot.querySelector("img.badge_icon, img")?.getAttribute("src");
      if (!src) return [];
      const tooltip = (slot.getAttribute("data-tooltip-html") ?? "")
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      return [{ href: slot.querySelector("a")?.getAttribute("href") ?? "", image: src, tooltip }];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}

function parseFavoriteGuide(block: HTMLElement, title: string): FavoriteGuideShowcase {
  const item = block.querySelector(".workshop_showcase_item");
  const link = item?.querySelector("a.ugc");
  const image = link?.querySelector("img")?.getAttribute("src");
  if (!item || !link || !image) return { kind: "favoriteGuide", title, guide: null };

  const contributors = item.querySelector(".guide_showcase_contributors");
  const authors = (contributors?.querySelectorAll("a") ?? []).map((a) => ({
    name: text(a),
    href: a.getAttribute("href") ?? "",
  }));
  // The text before the first author link: "Created by - ".
  const creditPrefix = parse((contributors?.innerHTML ?? "").split(/<a\b/i)[0]).text.replace(/\s+/g, " ").trimStart();

  const starsEl = item.querySelector(".workshop_showcase_stars");
  const starsImage = starsEl?.querySelector("img")?.getAttribute("src");
  const appEl = item.querySelector(".workshop_showcase_app");
  const appLinks = appEl?.querySelectorAll("a") ?? [];
  const appIcon = appEl?.querySelector("img")?.getAttribute("src");
  const publishedFileId = link.getAttribute("data-publishedfileid");

  return {
    kind: "favoriteGuide",
    title,
    guide: {
      href: link.getAttribute("href") ?? "",
      image,
      ...(publishedFileId ? { publishedFileId } : {}),
      name: text(item.querySelector(".showcase_item_detail_title")),
      creditPrefix,
      authors,
      ...(starsEl && starsImage ? { stars: { image: starsImage, text: text(starsEl) } } : {}),
      ...(appEl && appIcon
        ? { app: { name: text(appLinks[appLinks.length - 1]), href: appLinks[0]?.getAttribute("href") ?? "", icon: appIcon } }
        : {}),
      description: text(item.querySelector(".guide_showcase_item_description")),
    },
  };
}

export function parseRibbons(scope: HTMLElement | null): CompletionRibbonGroup[] {
  if (!scope) return [];
  return scope.querySelectorAll(".showcase_completion_ribbon_group").map((g) => {
    // "base empty" (a game with no achievements earned yet) is drawn grey.
    const extra = classes(g).filter((c) => c !== "showcase_completion_ribbon_group");
    const variant = extra.includes("empty") ? "empty" : (extra[0] ?? "base");
    const group: CompletionRibbonGroup = { variant, trophies: g.querySelectorAll(".showcase_completion_ribbon").length };
    const count = text(g.querySelector(".showcase_completion_ribbon_count"));
    if (count) group.count = count;
    return group;
  });
}

function parseCompletionist(block: HTMLElement, title: string): CompletionistShowcase {
  return {
    kind: "completionist",
    title,
    games: block.querySelectorAll(".showcase_achievementscompletionist_game").flatMap((slot) => {
      const a = slot.querySelector("a");
      const image = slot.querySelector("img.game_capsule")?.getAttribute("src");
      if (!a || !image) return [];
      const counts = slot.querySelector(".showcase_achievementscompletionist_game_counts");
      const subtitle = text(counts?.querySelector(".subtitle"));
      return [
        {
          href: a.getAttribute("href") ?? "",
          image,
          adultContent: hasClass(slot, "app_has_adult_content"),
          ribbons: parseRibbons(slot.querySelector(".showcase_achievementscompletionist_game_ribbons")),
          achievements: text(counts?.querySelector(".num_achievements")),
          ...(subtitle ? { subtitle } : {}),
        },
      ];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}

function parseReplay(el: HTMLElement, block: HTMLElement, title: string): ReplayShowcase {
  const replay = block.querySelector(".replay")!;
  const yearClass = classes(replay).find((c) => c.startsWith("replay_background_gradient_"));
  const year = Number(yearClass?.slice("replay_background_gradient_".length) ?? el.id.match(/(\d{4})$/)?.[1]);
  const bgImages = replay.querySelectorAll(".background_img_ctn img");
  const size =
    classes(bgImages[0]).find((c) => c.endsWith("_background")) ?? "xsmall_capsule_background";
  const big = replay.querySelector(".big_stat");
  const href = block.querySelector("a")?.getAttribute("href");

  return {
    kind: "replay",
    title,
    year,
    ...(href ? { href } : {}),
    background: { size, images: bgImages.map((i) => i.getAttribute("src") ?? "").filter(Boolean) },
    gamesPlayed: {
      value: text(big),
      highNum: Boolean(hasClass(big, "high_num")),
      label: text(replay.querySelector(".games_played_title")),
    },
    stats: replay.querySelectorAll(".stat_ctn").map((s) => {
      const mid = s.querySelector(".mid_stat");
      const key = classes(s).find((c) => c !== "stat_ctn") ?? "";
      const size = classes(mid).find((c) => c !== "mid_stat") ?? "normal";
      // The label is the stat's own text after the number.
      const label = s.childNodes
        .filter((n) => n !== mid)
        .map((n) => n.text)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      return { key, value: text(mid), size, label };
    }),
    mostPlayed: replay.querySelectorAll(".most_played_app").flatMap((app) => {
      const image = app.querySelector("img")?.getAttribute("src");
      return image ? [{ image, percent: text(app.querySelector(".most_played_percent")) }] : [];
    }),
  };
}

function parseAchievement(block: HTMLElement, title: string): AchievementShowcase {
  return { kind: "achievement", title, ...parseAchievements(block) };
}

/** The tiles and stats of the Achievement and Rarest Achievement showcases. */
export function parseAchievements(block: HTMLElement): Omit<AchievementShowcase, "kind" | "title"> {
  return {
    achievements: block.querySelectorAll(".showcase_achievement").flatMap((slot) => {
      const a = slot.querySelector("a");
      const image = a?.querySelector("img")?.getAttribute("src");
      if (!a || !image) return [];
      // The hover card is HTML inside data-tooltip-html: name, description,
      // game and rarity are only there.
      const tip = parse(slot.getAttribute("data-tooltip-html") ?? "");
      const field = (sel: string) => text(tip.querySelector(sel)) || undefined;
      const game = tip.querySelector(".achievement_tooltip_capsule")?.getAttribute("alt");
      const out: AchievementShowcase["achievements"][number] = {
        href: a.getAttribute("href") ?? "",
        image,
        rare: hasClass(slot, "rare"),
      };
      const name = field(".achievement_tooltip_name");
      const description = field(".achievement_tooltip_desc");
      const percent = field(".achievement_tooltip_percent");
      if (name) out.name = name;
      if (description) out.description = description;
      if (game) out.game = game;
      if (percent) out.percent = percent;
      return [out];
    }),
    stats: parseStats(block.querySelector(".showcase_stats_row")),
  };
}
