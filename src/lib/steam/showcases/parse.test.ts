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
      ["unsupported", "Favorite Guide"],
      ["unsupported", "Completionist Showcase"],
      ["unsupported", "Steam Replay 2025"],
      ["unsupported", "Achievement Showcase"],
      ["badgeCollector", "Badge Collector"],
    ]);
  });

  it("records which showcase each unsupported one is", () => {
    expect(page.showcases.filter((s) => s.kind === "unsupported").map((s) => s.rootClass)).toEqual([
      "favoriteguide_showcase",
      "showcase_achievementscompletionist_games",
      "replay_showcase",
      "achievement_showcase",
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
