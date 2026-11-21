/**
 * Sample content for the 15 showcase types added from captured markup, for
 * when the preview shows a showcase the loaded profile doesn't have (the
 * showcase editor). Labels and fixed wording are Steam's own English text
 * from the captured pages; numbers are dashes and images are blank tiles at
 * Steam's real sizes, so the sample has Steam's exact layout without making
 * anything up.
 */
import type { Showcase, ShowcaseStat } from "./types";

export interface SampleOptions {
  /** The loaded profile's name: shown where Steam shows the player's name. */
  name: string;
  /** A blank image tile at Steam's size for that image. */
  image: (width: number, height: number) => string;
  /** Link target for sample content (one the preview ignores clicks on). */
  link: string;
}

export type SampleKind =
  | "rareAchievement"
  | "item"
  | "trade"
  | "favoriteGame"
  | "screenshot"
  | "customText"
  | "favoriteGroup"
  | "review"
  | "workshopItem"
  | "myWorkshop"
  | "video"
  | "myGuides"
  | "salien"
  | "awards"
  | "featuredArtwork";

/** A sample of `kind`, with Steam's English title for it. */
export function sampleShowcase(kind: SampleKind, o: SampleOptions): Showcase {
  const stat = (label: string): ShowcaseStat => ({ value: "–", label });
  const shots = (n: number) => Array.from({ length: n }, () => ({ href: o.link, image: o.image(100, 56), maxWidth: 100 }));
  const owner = { href: o.link, avatar: o.image(32, 32), status: "offline", workshopHref: o.link };
  switch (kind) {
    case "rareAchievement":
      return {
        kind,
        title: "Rarest Achievement Showcase",
        achievements: Array.from({ length: 7 }, () => ({ href: o.link, image: o.image(64, 64), rare: true })),
        stats: [stat("Achievements"), stat("Rare Achievements")],
      };
    case "item":
      return {
        kind,
        title: "Item Showcase",
        items: Array.from({ length: 4 }, () => ({ href: o.link, image: o.image(96, 96) })),
        count: stat("Items Owned"),
      };
    case "trade":
      return {
        kind,
        title: "Items Up For Trade",
        items: Array.from({ length: 6 }, () => ({ href: o.link, image: o.image(96, 96) })),
        stats: [stat("Items Owned"), stat("Trades Made"), stat("Market Transactions")],
      };
    case "favoriteGame":
      return {
        kind,
        title: "Favorite Game",
        game: { href: o.link, image: o.image(184, 69), name: "Your favourite game", adultContent: false },
        stats: [stat("Hours played"), stat("Achievements")],
      };
    case "screenshot":
    case "video":
      return {
        kind,
        title: kind === "screenshot" ? "Screenshot Showcase" : "Video Showcase",
        primary: { href: o.link, image: o.image(506, 284), maxWidth: 506, name: "" },
        small: shots(3),
      };
    case "featuredArtwork":
      return {
        kind,
        title: "Featured Artwork Showcase",
        primary: { href: o.link, image: o.image(630, 354), maxWidth: 630, name: "" },
        small: [],
      };
    case "customText":
      return { kind, title: "Custom Info Box", notes: "Write anything you like here." };
    case "favoriteGroup":
      return {
        kind,
        title: "Favorite Group",
        group: {
          href: o.link,
          avatar: o.image(157, 157),
          name: "Your favourite group",
          suffix: " - Public Group",
          description: "",
          stats: [
            stat("Members"),
            { ...stat("In-Game"), variant: "ingame" },
            { ...stat("Online"), variant: "online" },
            { ...stat("In Chat"), variant: "inchat" },
          ],
        },
      };
    case "review":
      return {
        kind,
        title: "Review Showcase",
        game: { href: o.link, image: o.image(184, 69), name: "A game you reviewed", playtime: "– Hours played", adultContent: false },
        notes: "Your review shows here.",
        comment: { href: o.link, label: "Leave a comment" },
      };
    case "workshopItem":
      return {
        kind,
        title: "Workshop Showcase",
        item: {
          href: o.link,
          image: o.image(160, 160),
          name: "Your favourite Workshop item",
          description: "",
          creditPrefix: "Created by - ",
          authors: [{ name: o.name, href: o.link }],
          authorSeparators: [],
        },
      };
    case "myWorkshop":
      return {
        kind,
        title: "Workshop Showcase",
        owner: { ...owner, name: `${o.name}'s Workshop` },
        items: Array.from({ length: 5 }, () => ({ href: o.link, image: o.image(150, 150), name: "" })),
        stats: [stat("Submissions"), stat("Followers")],
      };
    case "myGuides":
      return {
        kind,
        title: "Guide Showcase",
        owner: { ...owner, name: `${o.name}'s Guides`, workshopHref: o.link },
        guides: [0, 1].map((i) => ({
          href: o.link,
          image: o.image(66, 66),
          name: "Your guide",
          author: `By ${o.name}`,
          left: i === 0,
        })),
        stats: [stat("Guides"), stat("Followers")],
      };
    case "salien":
      return {
        kind,
        title: "Salien Stats",
        parts: [],
        cryotube: {
          back: "https://community.fastly.steamstatic.com/public/images/saliengame/SalienCryotube1.png",
          front: "https://community.fastly.steamstatic.com/public/images/saliengame/SalienCryotube2.png",
        },
        header: { text: "Steam Summer Saliens 2018", href: "https://steamcommunity.com/saliengame/" },
        stats: [stat("Level Reached"), stat("Bosses Fought"), stat("Experience Earned")],
      };
    case "awards":
      return {
        kind,
        title: "Awards Showcase",
        awards: Array.from({ length: 5 }, () => ({ name: "", image: o.image(75, 75), count: "–" })),
        stats: [stat("Awards Received"), stat("Awards Given")],
      };
  }
}
