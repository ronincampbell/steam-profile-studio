import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProfilePage } from "./parse";

// Fuzzycast's public profile, captured 21 Nov 2026 (friends and comments redacted).
const html = readFileSync(join(__dirname, "../../../../reference/html/fuzzycast-profile.html"), "utf8");
const page = parseProfilePage(html);

const UGC = "https://images.steamusercontent.com/ugc/";
const APPS = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/";

describe("parseProfilePage on Fuzzycast", () => {
  it("is public and finds all 7 showcases in page order", () => {
    expect(page.isPrivate).toBe(false);
    expect(page.showcases.map((s) => [s.kind, s.title])).toEqual([
      ["artwork", "Artwork Showcase"],
      ["gameCollector", "Game Collector"],
      ["favoriteGuide", "Favorite Guide"],
      ["completionist", "Completionist Showcase"],
      ["replay", "Steam Replay 2025"],
      ["achievement", "Achievement Showcase"],
      ["badgeCollector", "Badge Collector"],
    ]);
  });

  it("parses the Artwork showcase", () => {
    const art = page.showcases[0];
    if (art.kind !== "artwork") throw new Error("expected artwork");
    expect(art.primary).toEqual({
      href: "https://steamcommunity.com/sharedfiles/filedetails/?id=2365002180",
      image:
        UGC +
        "1751305252904455749/6C54780DCB70D1EDBA3229B11CC47F292F4930F4/?imw=480&imh=480&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true",
      publishedFileId: "2365002180",
      name: "_",
    });
    expect(art.small.map((s) => s.publishedFileId)).toEqual(["2364631422", "2364631742", "2364631961"]);
    expect(art.small[0].image).toBe(
      UGC +
        "1751305159225200266/A0552AECC5A4CCDDA5AFA6FE015E9A685F67A70A/?imw=100&imh=80&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true",
    );
  });

  it("parses the Game Collector showcase", () => {
    const gc = page.showcases[1];
    if (gc.kind !== "gameCollector") throw new Error("expected game collector");
    expect(gc.stats).toEqual([
      { value: "394", label: "Games", href: "https://steamcommunity.com/id/Fuzzycast/games/?tab=all" },
      { value: "272", label: "DLC", href: "https://steamcommunity.com/id/Fuzzycast/games/?tab=all" },
      { value: "69", label: "Reviews", href: "https://steamcommunity.com/id/Fuzzycast/recommended/" },
      { value: "99", label: "On Wishlist", href: "https://steamcommunity.com/id/Fuzzycast/wishlist/" },
    ]);
    expect(gc.bodyLabel).toBe("Featured Games");
    // Same 12 games, same order, as GetProfileCustomization's slots.
    expect(gc.games.map((g) => g.appid)).toEqual([
      1422450, 823500, 546560, 870780, 420530, 753640, 312520, 632470, 481510, 620, 2863640, 427520,
    ]);
    expect(gc.games[0]).toEqual({
      appid: 1422450,
      href: "https://steamcommunity.com/app/1422450",
      image: APPS + "1422450/88b400eca727f0547232b49b3e62827f07900c77/capsule_184x69.jpg?t=1790716179",
    });
  });

  it("parses the Badge Collector showcase", () => {
    const bc = page.showcases[6];
    if (bc.kind !== "badgeCollector") throw new Error("expected badge collector");
    expect(bc.badges).toHaveLength(6);
    expect(bc.badges[0]).toEqual({
      href: "https://steamcommunity.com/id/Fuzzycast/gamecards/1310330",
      image:
        "https://shared.fastly.steamstatic.com/community_assets/images/items/1310330/d06c8d44f1c64ce79acb84701468e2347f903fc7.png",
      tooltip: ["Sophomore", "Level 2 Goodbye Volcano High Badge"],
    });
    expect(bc.stats).toEqual([
      { value: "84", label: "Total Badges Earned", href: "https://steamcommunity.com/id/Fuzzycast/badges/" },
      { value: "243", label: "Game Cards", href: "https://steamcommunity.com/id/Fuzzycast/inventory/#753_6" },
    ]);
  });
});

describe("parseProfilePage on Fuzzycast: the other four", () => {
  it("parses the Favorite Guide showcase", () => {
    const fg = page.showcases[2];
    if (fg.kind !== "favoriteGuide" || !fg.guide) throw new Error("expected a favourite guide");
    expect(fg.guide).toMatchObject({
      href: "https://steamcommunity.com/sharedfiles/filedetails/?id=3671816678",
      publishedFileId: "3671816678",
      name: "𝓒𝓮𝓵𝓮𝓼𝓽𝓮 (𝓞𝓻𝓲𝓰𝓲𝓷𝓪𝓵 𝓢𝓸𝓾𝓷𝓭𝓽𝓻𝓪𝓬𝓴)",
      creditPrefix: "Created by - ",
      authors: [{ name: "ace", href: "https://steamcommunity.com/id/aceman3000" }],
      stars: {
        image: "https://community.fastly.steamstatic.com/public/images/sharedfiles/4-star.png?v=2",
        text: "110 ratings",
      },
      app: {
        name: "Celeste",
        href: "https://steamcommunity.com/workshop/browse/?appid=504230",
        icon: "https://shared.fastly.steamstatic.com/community_assets/images/apps/504230/04cb7aa0b497a3962e6b1655b7fd81a2cc95d18b.jpg",
      },
    });
    expect(fg.guide.image).toContain("images.steamusercontent.com/ugc/11481000355890513812/");
    expect(fg.guide.description).toMatch(/^ɴᴏᴡ ᴘʟᴀʏɪɴɢ: Checking In - Lena Raine/);
  });

  it("parses the Completionist showcase", () => {
    const c = page.showcases[3];
    if (c.kind !== "completionist") throw new Error("expected completionist");
    expect(c.games.map((g) => [g.achievements, g.subtitle, g.adultContent])).toEqual([
      ["42 Achievements", undefined, false],
      ["40 Achievements", "35 RARE", true],
      ["38 Achievements", "8 RARE", false],
      ["1 Achievement", undefined, false],
    ]);
    expect(c.games[0].ribbons).toEqual([{ variant: "base", trophies: 1 }]);
    expect(c.games[0].image).toBe(APPS + "1245620/header.jpg?t=1790290043");
    expect(c.stats.map((s) => [s.value, s.label])).toEqual([
      ["5", "Completed Games"],
      ["5", "Completed Sets"],
      ["28%", "Avg. Game Completion Rate"],
    ]);
    expect(c.stats[0].tooltip).toBe("Games where this player has completed every available achievement set.");
  });

  it("parses the Steam Replay showcase", () => {
    const r = page.showcases[4];
    if (r.kind !== "replay") throw new Error("expected replay");
    expect(r.year).toBe(2025);
    expect(r.href).toBe("https://store.steampowered.com/yearinreview/76561198220645184/2025?src=10&snr=2_100300_profile__100302");
    expect(r.background.size).toBe("xsmall_capsule_background");
    expect(r.background.images).toHaveLength(120);
    expect(r.gamesPlayed).toEqual({ value: "95", highNum: false, label: "Games Played" });
    expect(r.stats).toEqual([
      { key: "sessions", value: "703", size: "normal", label: "Sessions" },
      { key: "achievements", value: "448", size: "normal", label: "Achievements" },
      { key: "new_games", value: "60", size: "normal", label: "New Games" },
    ]);
    expect(r.mostPlayed.map((m) => m.percent)).toEqual(["18%", "9%", "9%", "7%", "4%"]);
  });

  it("parses the Achievement showcase, including rarity and the hover card", () => {
    const a = page.showcases[5];
    if (a.kind !== "achievement") throw new Error("expected achievement");
    expect(a.achievements.map((x) => x.rare)).toEqual([true, false, false, false, false, false, false]);
    expect(a.achievements[0]).toEqual({
      href: "https://steamcommunity.com/id/Fuzzycast/achievements/312520",
      image: "https://shared.fastly.steamstatic.com/community_assets/images/apps/312520/b8d0b50077deeb2e419496d63faf0d72847c8a69.jpg",
      rare: true,
      name: "Ascension",
      game: "Rain World",
      percent: "9.3% of players have this",
    });
    expect(a.achievements[4].description).toBe("Save a turret from redemption");
    expect(a.stats.map((s) => [s.value, s.label])).toEqual([
      ["3,470", "Achievements"],
      ["346", "Rare Achievements"],
    ]);
  });
});

describe("parseProfilePage edge cases", () => {
  it("spots a private profile (body class from a real private profile, 21 Nov 2026)", () => {
    const p = parseProfilePage(
      `<html><body class="flat_page profile_page private_profile responsive_page "><div class="profile_leftcol"></div></body></html>`,
    );
    expect(p).toEqual({ isPrivate: true, showcases: [] });
  });

  it("returns no showcases when the page has no showcase area", () => {
    expect(parseProfilePage("<html><body class=\"profile_page\"></body></html>")).toEqual({
      isPrivate: false,
      showcases: [],
    });
  });

  it("treats every stat and slot as optional", () => {
    const p = parseProfilePage(`<div class="profile_customization_area">
      <div class="profile_customization"><div class="profile_customization_header">Game Collector</div>
        <div class="profile_customization_block"><div class="gamecollector_showcase"></div></div></div>
      <div class="profile_customization"><div class="profile_customization_header">Something New</div>
        <div class="profile_customization_block"><div class="brand_new_showcase"></div></div></div>
    </div>`);
    expect(p.showcases).toEqual([
      { kind: "gameCollector", title: "Game Collector", stats: [], games: [] },
      { kind: "unsupported", title: "Something New", rootClass: "brand_new_showcase" },
    ]);
  });
});
