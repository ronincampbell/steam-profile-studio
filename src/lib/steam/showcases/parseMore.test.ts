import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";
import { parseProfilePage } from "./parse";
import { sanitizeNotes } from "./parseMore";
import type { Showcase } from "./types";

// Showcases cut from real public profiles on 21 Nov 2026 and anonymised with
// scripts/anonymise-showcase.mjs (player text is "lorem", links point at
// /id/example). See reference/html/SHOWCASES.md.
function fixture(name: string): Showcase[] {
  const html = readFileSync(join(__dirname, `../../../../reference/html/showcases/${name}.html`), "utf8");
  return parseProfilePage(`<div class="profile_customization_area">${html}</div>`).showcases;
}

function one<K extends Showcase["kind"]>(name: string, kind: K): Showcase & { kind: K } {
  const [s, ...rest] = fixture(name);
  expect(rest).toHaveLength(0);
  expect(s.kind).toBe(kind);
  return s as Showcase & { kind: K };
}

const EX = "https://steamcommunity.com/id/example";

describe("Rarest Achievement Showcase (type 1)", () => {
  it("is told apart from the Achievement showcase by its tiles not being slots", () => {
    const s = one("rare-achievement", "rareAchievement");
    expect(s.title).toBe("Rarest Achievement Showcase");
    expect(s.achievements).toHaveLength(7);
    expect(s.achievements.every((a) => a.rare)).toBe(true);
    expect(s.achievements[0]).toMatchObject({
      href: `${EX}/achievements/209080`,
      name: "Old Dog Pilot 3",
      game: "Guns of Icarus Online",
      percent: "0.4% of players have this",
    });
    expect(s.stats.map((x) => [x.value, x.label])).toEqual([
      ["10,752", "Achievements"],
      ["1,953", "Rare Achievements"],
    ]);
  });
});

describe("Item Showcase (type 3)", () => {
  it("reads the item tiles and the Items Owned count", () => {
    const s = one("item", "item");
    expect(s.items).toHaveLength(4);
    expect(s.items[0]).toMatchObject({ href: `${EX}/inventory/#753_6_12838358019`, borderColor: "transparent" });
    expect(s.items[0].image).toMatch(/\/economy\/image\/.+\/96fx96f$/);
    expect(s.items[0].image2x).toMatch(/96fx96fdpx2x$/);
    // Animated items have no 2x image.
    expect(s.items[2].image).toMatch(/allow_animated=1$/);
    expect(s.items[2].image2x).toBeUndefined();
    expect(s.count).toEqual({ value: "1,695", label: "Items Owned", href: `${EX}/inventory/` });
  });
});

describe("Items Up For Trade (type 4)", () => {
  it("reads items with their rarity colours, the trading stats and the note", () => {
    const s = one("trade", "trade");
    expect(s.items).toHaveLength(6);
    expect(s.items[0]).toMatchObject({ borderColor: "#4b69ff", backgroundColor: "#2d3042" });
    expect(s.items[3]).toMatchObject({ borderColor: "#8847ff", backgroundColor: "#342c42" });
    expect(s.stats.map((x) => [x.value, x.label, Boolean(x.href)])).toEqual([
      ["2,310", "Items Owned", true],
      ["159", "Trades Made", false],
      ["3,099", "Market Transactions", false],
    ]);
    expect(s.notes).toBe("lorem lorem lorem lorem");
  });

  it("keeps the note's BBCode and emoticons, and nothing unsafe", () => {
    const s = one("trade-bbcode", "trade");
    expect(s.notes).toContain('<a class="bb_link" href="https://example.com/" target="_blank" rel="noreferrer">');
    expect(s.notes).toContain('<img class="emoticon" src="https://community.akamai.steamstatic.com/economy/emoticon/star_points" alt=":lorem:">');
    expect(s.notes).toContain("<u>");
  });
});

describe("Favorite Game (type 6)", () => {
  it("reads the game, stats and achievement strip", () => {
    const s = one("favorite-game", "favoriteGame");
    expect(s.game).toMatchObject({ name: "Baldur's Gate 3", href: "https://steamcommunity.com/app/1086940", adultContent: true });
    expect(s.stats.map((x) => [x.value, x.label])).toEqual([
      ["355", "Hours played"],
      ["38", "Achievements"],
    ]);
    const a = s.info?.achievements;
    expect(a).toMatchObject({ summary: "38 / 54 Achievements", rare: "2 Rare", more: { text: "+33" } });
    // "base empty": a grey trophy.
    expect(a?.ribbons).toEqual([{ variant: "empty", trophies: 1 }]);
    expect(a?.bar).toEqual({ segments: [{ variant: "base", weight: 38 }], locked: 16 });
    expect(a?.icons.map((i) => i.name)).toEqual(["Penny Pincher", "Fists of Fury", "Devil's in the Details", "Homebrewer", "No Free Lunches"]);
    expect(a?.more?.href).toBe(`${EX}/achievements/1086940`);
    expect(s.info?.badge).toBeUndefined();
    expect(s.info?.files).toEqual([{ type: "recommendation", text: "Review 1", href: `${EX}/recommended/1086940/` }]);
  });

  it("reads the game's badge when there is one", () => {
    const s = one("favorite-game-badge", "favoriteGame");
    expect(s.info?.badge).toMatchObject({ name: "Loving Romance", xp: "500 XP", href: `${EX}/gamecards/398100` });
    expect(s.info?.achievements?.bar).toEqual({ segments: [{ variant: "base", weight: 4 }], locked: 0 });
    expect(s.info?.achievements?.ribbons).toEqual([{ variant: "base", trophies: 1 }]);
  });
});

describe("Screenshot (7), Video (14) and Featured Artwork (22)", () => {
  it("reads screenshots like artwork, with stats and the + count tile", () => {
    const s = one("screenshot", "screenshot");
    expect(s.primary).toMatchObject({ name: "lorem lorem", maxWidth: 506 });
    expect(s.primary?.stats).toEqual([
      { name: "Comments", value: "3", icon: "https://community.fastly.steamstatic.com/public/images/skin_1/icon_btn_comment.png" },
    ]);
    expect(s.small).toHaveLength(3);
    expect(s.more).toEqual({ text: "+ 3,062", href: `${EX}/screenshots/` });
  });

  it("skips the play icon when reading a video's thumbnail", () => {
    const s = one("video", "video");
    expect(s.primary?.image).toMatch(/^https:\/\/img\.youtube\.com\/vi\/example\/0\.jpg/);
    expect(s.small).toHaveLength(3);
    expect(s.more?.text).toBe("+ 46");
  });

  it("reads Featured Artwork's single wide image and its stats", () => {
    const s = one("featured-artwork", "featuredArtwork");
    expect(s.title).toBe("Featured Artwork Showcase");
    expect(s.primary?.maxWidth).toBe(630);
    expect(s.primary?.stats?.map((x) => [x.name, x.value, Boolean(x.icon)])).toEqual([
      ["Up Votes", "57", true],
      ["Comments", "8", true],
      ["Favorites", "1", false],
    ]);
    expect(s.small).toEqual([]);
  });

  it("reads the Artwork showcase's + count tile", () => {
    const s = one("artwork-more", "artwork");
    expect(s.small).toHaveLength(3);
    expect(s.more).toEqual({ text: "+ 41", href: `${EX}/images/` });
    expect(s.primary?.maxWidth).toBe(506);
  });
});

describe("Custom Info Box (type 8)", () => {
  it("keeps the player's title and BBCode headings and links", () => {
    const s = one("custom-text", "customText");
    expect(s.title).toBe("lorem lorem lorem");
    expect(s.notes).toBe(
      '<div class="bb_h1"> lorem lorem </div><br><br><div class="bb_h1"> lorem lorem </div><br> ' +
        '<a class="bb_link" href="https://example.com/" target="_blank" rel="noreferrer">lorem</a> <br> ' +
        '<a class="bb_link" href="https://example.com/" target="_blank" rel="noreferrer">lorem</a>',
    );
  });
});

describe("Favorite Group (type 9)", () => {
  it("reads the group and its coloured stats", () => {
    const s = one("favorite-group", "favoriteGroup");
    expect(s.group).toMatchObject({ name: "lorem lorem", suffix: " - Public Group", href: "https://steamcommunity.com/groups/example", description: "" });
    expect(s.group?.stats.map((x) => [x.value, x.label, x.variant])).toEqual([
      ["2,663", "Members", undefined],
      ["121", "In-Game", "ingame"],
      ["825", "Online", "online"],
      ["276", "In Chat", "inchat"],
    ]);
  });
});

describe("Review Showcase (type 10)", () => {
  it("reads the game, playtime, review text and comment button", () => {
    const s = one("review", "review");
    expect(s.game).toMatchObject({ name: "Little Goody Two Shoes", playtime: "23 Hours played", adultContent: false });
    expect(s.notes).toMatch(/^lorem( lorem)+$/);
    expect(s.comment).toEqual({ href: `${EX}/recommended/1812370`, label: "Leave a comment" });
  });
});

describe("Workshop item (type 11)", () => {
  it("is read from inside Steam's favoritegame_showcase root", () => {
    const s = one("workshop-item", "workshopItem");
    expect(s.item).toMatchObject({
      name: "lorem lorem",
      description: "lorem",
      stars: { text: "8 ratings" },
      app: { name: "Wallpaper Engine", href: "https://steamcommunity.com/workshop/browse/?appid=431960" },
      creditPrefix: "Created by - ",
      authorSeparators: [" and "],
    });
    expect(s.item?.authors).toHaveLength(2);
    expect(s.item?.image).toMatch(/imw=160&imh=160/);
  });
});

describe("My Workshop (12) and My Guides (16)", () => {
  it("reads the owner bar, items and stats", () => {
    const s = one("my-workshop", "myWorkshop");
    expect(s.owner).toMatchObject({ status: "offline", href: EX, workshopHref: `${EX}/myworkshopfiles/` });
    expect(s.items).toHaveLength(2);
    expect(s.items[0].appIcon).toMatch(/\/apps\/730\//);
    expect(s.stats.map((x) => [x.value, x.label])).toEqual([
      ["2", "Submissions"],
      ["1", "Followers"],
    ]);
  });

  it("reads guides", () => {
    const s = one("my-guides", "myGuides");
    expect(s.owner.workshopHref).toBe(`${EX}/myworkshopfiles/?section=guides`);
    expect(s.guides).toEqual([
      expect.objectContaining({ author: "By lorem", left: true, image: expect.stringMatching(/imw=66&imh=66/) }),
    ]);
    expect(s.stats.map((x) => x.label)).toEqual(["Guides", "Followers"]);
  });
});

describe("Salien (type 20)", () => {
  it("reads the Salien's layers, badge and stats", () => {
    const s = one("salien", "salien");
    expect(s.parts.map((p) => p.id)).toEqual(["body", "arms", "eyes", "legs", "mouth", "shirt", "hat"]);
    expect(s.cryotube.back).toMatch(/SalienCryotube1\.png$/);
    expect(s.badge?.image).toMatch(/29_salien\/4_80\.png/);
    expect(s.header).toEqual({ text: "Steam Summer Saliens 2018", href: "https://steamcommunity.com/saliengame/" });
    expect(s.stats.map((x) => [x.label, x.value])).toEqual([
      ["Level Reached", "11"],
      ["Bosses Fought", "0"],
      ["Experience Earned", "2,631,940"],
    ]);
  });
});

describe("Awards (type 21)", () => {
  it("reads each award with its count and animated version", () => {
    const s = one("awards", "awards");
    expect(s.awards.map((a) => [a.name, a.count])).toEqual([
      ["Fire", "1"],
      ["Helpful", "1"],
      ["Beautiful", "1"],
      ["Poetry", "22"],
      ["Jester", "16"],
    ]);
    expect(s.awards[0].animated).toMatch(/reactions\/animated\/27\.png/);
    expect(s.stats.map((x) => x.label)).toEqual(["Awards Received", "Awards Given"]);
  });
});

describe("sanitizeNotes", () => {
  const clean = (html: string) => sanitizeNotes(parse(`<div>${html}</div>`).querySelector("div"));

  it("drops scripts, handlers, styles and unknown classes but keeps the text", () => {
    expect(clean('<b onclick="x()">hi</b><script>alert(1)</script><span class="evil bb_spoiler" style="color:red">s</span>')).toBe(
      '<b>hi</b>alert(1)<span class="bb_spoiler">s</span>',
    );
  });

  it("only keeps http(s) links and Steam emoticon images", () => {
    expect(clean('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(clean('<img class="emoticon" src="https://evil.example/x.png">')).toBe("");
    expect(clean('<img src="https://community.fastly.steamstatic.com/economy/emoticon/x">')).toBe("");
  });

  it("escapes text", () => {
    expect(clean("a &lt;b&gt; &amp; c")).toBe("a &lt;b&gt; &amp; c");
  });
});
