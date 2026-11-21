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
import type {
  ArtworkShowcase,
  BadgeCollectorShowcase,
  GameCollectorShowcase,
  Showcase,
  ShowcaseStat,
} from "./types";

export interface ParsedProfilePage {
  /** Steam marks private (and, to visitors, friends-only) profiles with this body class. */
  isPrivate: boolean;
  showcases: Showcase[];
}

export function parseProfilePage(html: string): ParsedProfilePage {
  const root = parse(html);
  const isPrivate = Boolean(root.querySelector("body.private_profile, div.profile_page.private_profile"));
  const area = root.querySelector(".profile_customization_area");
  if (!area) return { isPrivate, showcases: [] };

  const showcases = area.children
    .filter((el) => el.classList.contains("profile_customization"))
    .map(parseShowcase)
    .filter((s): s is Showcase => s !== null);
  return { isPrivate, showcases };
}

/** Whitespace-collapsed text of an element ("\n\t\tGame Collector\t" → "Game Collector"). */
function text(el: HTMLElement | null | undefined): string {
  return (el?.text ?? "").replace(/\s+/g, " ").trim();
}

function parseShowcase(el: HTMLElement): Showcase | null {
  const title = text(el.querySelector(".profile_customization_header"));
  const block = el.querySelector(".profile_customization_block");
  if (!block) return null;

  if (el.classList.contains("myart") && block.querySelector(".screenshot_showcase")) {
    return parseArtwork(block, title);
  }
  if (block.querySelector(".gamecollector_showcase")) return parseGameCollector(block, title);
  if (block.querySelector(".badge_showcase")) return parseBadgeCollector(block, title);

  // Not drawn yet: keep its title so the page order stays right, and record
  // which showcase it was. Steam Replay's block holds a link, not a div.
  const rootClass = el.classList.contains("replay_showcase")
    ? "replay_showcase"
    : (block.querySelector("div")?.classList.value[0] ?? "unknown");
  return { kind: "unsupported", title, rootClass };
}

function parseStats(scope: HTMLElement | null): ShowcaseStat[] {
  if (!scope) return [];
  return scope.querySelectorAll(".showcase_stat").map((s) => {
    const stat: ShowcaseStat = { value: text(s.querySelector(".value")), label: text(s.querySelector(".label")) };
    const href = s.tagName === "A" ? s.getAttribute("href") : undefined;
    if (href) stat.href = href;
    return stat;
  });
}

function parseArtwork(block: HTMLElement, title: string): ArtworkShowcase {
  const image = (slot: HTMLElement | null) => {
    const a = slot?.querySelector("a.screenshot_showcase_screenshot");
    const src = a?.querySelector("img")?.getAttribute("src");
    if (!a || !src) return null;
    const publishedFileId = a.getAttribute("data-publishedfileid");
    return { href: a.getAttribute("href") ?? "", image: src, ...(publishedFileId ? { publishedFileId } : {}) };
  };
  const primarySlot = block.querySelector(".screenshot_showcase_primary");
  const primary = image(primarySlot);
  return {
    kind: "artwork",
    title,
    primary: primary ? { ...primary, name: text(primarySlot?.querySelector(".screenshot_showcase_itemname")) } : null,
    small: block
      .querySelectorAll(".screenshot_showcase_smallscreenshot")
      .map(image)
      .filter((i): i is NonNullable<typeof i> => i !== null),
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
