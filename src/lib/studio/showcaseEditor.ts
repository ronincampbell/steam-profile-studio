/**
 * The showcase editor's state: which showcases are on the preview, in what
 * order, and where each one's content comes from.
 *
 * All of it lives in the browser (React state). Nothing is saved anywhere;
 * reloading the page or loading another profile starts again from the
 * profile's real showcases.
 */
import type { Showcase, ShowcaseKind, ShowcaseStat } from "@/lib/steam/showcases/types";
import { sampleShowcase as moreSample } from "@/lib/steam/showcases/samples";
import { showcaseType, typeForKind } from "./showcaseCatalog";

/**
 * Where a showcase's content comes from:
 * - profile: the loaded profile's real showcase, as Steam shows it.
 * - sample: Steam's real layout (captured from a profile) with tidy
 *   placeholder content, because this profile doesn't have that showcase.
 * - placeholder: a plainly marked box, because Steam's markup for this type
 *   hasn't been captured (only the retired Greenlight types now).
 */
export type ShowcaseSource = "profile" | "sample" | "placeholder";

export interface EditorShowcase {
  /** Stable id for React keys and drag and drop. */
  id: string;
  /** Steam's EProfileCustomizationType, when known. */
  type?: number;
  source: ShowcaseSource;
  showcase: Showcase;
}

let nextId = 0;
function newId() {
  nextId += 1;
  return `sc${nextId}`;
}

/** The editor's starting list: the profile's own showcases, in Steam's order. */
export function fromProfile(showcases: Showcase[]): EditorShowcase[] {
  return showcases.map((showcase) => ({
    id: newId(),
    type: showcase.kind === "unsupported" ? undefined : typeForKind(showcase.kind),
    source: "profile",
    showcase,
  }));
}

/** Move the showcase at `from` so it ends up at index `to`. */
export function moveShowcase(list: EditorShowcase[], from: number, to: number): EditorShowcase[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

export function removeShowcase(list: EditorShowcase[], id: string): EditorShowcase[] {
  return list.filter((s) => s.id !== id);
}

/**
 * Add a showcase of `type` at the top of the list (where Steam puts a new
 * one is unconfirmed; the top is where you'll see it). Uses the profile's own
 * showcase of that type if it has one, even if it was removed earlier.
 */
export function addShowcase(
  list: EditorShowcase[],
  type: number,
  profileShowcases: Showcase[],
  ctx: SampleContext,
): EditorShowcase[] {
  return [makeShowcase(type, profileShowcases, ctx), ...list];
}

export function makeShowcase(type: number, profileShowcases: Showcase[], ctx: SampleContext): EditorShowcase {
  const info = showcaseType(type);
  if (!info) throw new Error(`Unknown showcase type ${type}`);
  if (info.kind) {
    const real = profileShowcases.find((s) => s.kind === info.kind);
    if (real) return { id: newId(), type, source: "profile", showcase: real };
    return { id: newId(), type, source: "sample", showcase: sampleShowcase(info.kind, ctx) };
  }
  return {
    id: newId(),
    type,
    source: "placeholder",
    showcase: { kind: "unsupported", title: info.label, rootClass: "" },
  };
}

/** Link target for sample content; the preview ignores clicks on it. */
export const NO_LINK = "#";

/** What the sample content can borrow from the loaded profile. */
export interface SampleContext {
  /** The profile's name, credited as the guide's author. */
  name: string;
}

/** A dark tile with a faint picture icon, at an image's real size. */
export function placeholderImage(width: number, height: number): string {
  const s = Math.round(Math.min(width, height) * 0.36);
  const x = (width - s) / 2;
  const y = (height - s) / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#1f2a36"/>` +
    `<g fill="none" stroke="#3d4b5a" stroke-width="${Math.max(1, s / 16)}" stroke-linejoin="round">` +
    `<rect x="${x}" y="${y + s * 0.12}" width="${s}" height="${s * 0.76}" rx="${s * 0.06}"/>` +
    `<path d="M${x + s * 0.08} ${y + s * 0.78} L${x + s * 0.38} ${y + s * 0.45} L${x + s * 0.6} ${y + s * 0.65} L${x + s * 0.74} ${y + s * 0.52} L${x + s * 0.92} ${y + s * 0.72}"/>` +
    `<circle cx="${x + s * 0.72}" cy="${y + s * 0.33}" r="${s * 0.08}"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A sample stat: Steam's label, no number (a dash), no link. */
function stat(label: string): ShowcaseStat {
  return { value: "–", label };
}

function times<T>(n: number, make: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

/**
 * Steam's layout for `kind` filled with neutral sample content. Titles,
 * labels and slot counts are the ones on the captured profile
 * (reference/html/fuzzycast-profile.html); images are blank tiles at the
 * sizes Steam serves; numbers are dashes, because there's no real number to show.
 * Links go nowhere (NO_LINK): the preview ignores clicks on them.
 */
export function sampleShowcase(
  kind: Exclude<ShowcaseKind, "unsupported">,
  ctx: SampleContext,
): Showcase {
  switch (kind) {
    case "artwork":
      return {
        kind,
        title: "Artwork Showcase",
        primary: { href: NO_LINK, image: placeholderImage(480, 270), name: "Artwork title" },
        small: times(3, () => ({ href: NO_LINK, image: placeholderImage(100, 80) })),
      };
    case "gameCollector":
      return {
        kind,
        title: "Game Collector",
        stats: [stat("Games"), stat("DLC"), stat("Reviews"), stat("On Wishlist")],
        bodyLabel: "Featured Games",
        games: times(12, () => ({ appid: null, href: NO_LINK, image: placeholderImage(184, 69) })),
      };
    case "badgeCollector":
      return {
        kind,
        title: "Badge Collector",
        badges: times(6, () => ({ href: NO_LINK, image: placeholderImage(80, 80), tooltip: ["Badge"] })),
        stats: [stat("Total Badges Earned"), stat("Game Cards")],
      };
    case "favoriteGuide":
      return {
        kind,
        title: "Favorite Guide",
        guide: {
          href: NO_LINK,
          image: placeholderImage(160, 160),
          name: "Guide title",
          creditPrefix: "Created by - ",
          authors: [{ name: ctx.name, href: NO_LINK }],
          description: "Your favourite guide's description appears here.",
        },
      };
    case "completionist":
      return {
        kind,
        title: "Completionist Showcase",
        games: times(4, () => ({
          href: NO_LINK,
          image: placeholderImage(460, 215),
          adultContent: false,
          ribbons: [{ variant: "empty", trophies: 1 }],
          achievements: "– Achievements",
        })),
        stats: [stat("Completed Games"), stat("Completed Sets"), stat("Avg. Game Completion Rate")],
      };
    case "replay": {
      // 2025: the newest year whose colours are captured (Replay.module.css
      // has Steam's gradients for 2022 to 2025 only).
      const year = 2025;
      return {
        kind,
        title: `Steam Replay ${year}`,
        year,
        background: { size: "xsmall_capsule_background", images: times(120, () => placeholderImage(460, 215)) },
        gamesPlayed: { value: "–", highNum: false, label: "Games Played" },
        stats: [
          { key: "sessions", value: "–", size: "normal", label: "Sessions" },
          { key: "achievements", value: "–", size: "normal", label: "Achievements" },
          { key: "new_games", value: "–", size: "normal", label: "New Games" },
        ],
        mostPlayed: times(5, () => ({ image: placeholderImage(300, 450), percent: "–" })),
      };
    }
    case "achievement":
      return {
        kind,
        title: "Achievement Showcase",
        achievements: times(7, () => ({ href: NO_LINK, image: placeholderImage(64, 64), rare: false })),
        stats: [stat("Achievements"), stat("Rare Achievements")],
      };
    default:
      // The other 15 types: samples.ts, built from their captured markup.
      return moreSample(kind, { name: ctx.name, image: placeholderImage, link: NO_LINK });
  }
}
