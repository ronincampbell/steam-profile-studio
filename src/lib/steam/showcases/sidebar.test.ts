import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProfilePage } from "./parse";

// Fuzzycast's public profile, captured 21 Nov 2026 (friends and comments redacted).
const html = readFileSync(join(__dirname, "../../../../reference/html/fuzzycast-profile.html"), "utf8");
const sidebar = parseProfilePage(html).sidebar!;

describe("parseSidebar on Fuzzycast", () => {
  it("finds the favourite badge under the level", () => {
    expect(sidebar.favoriteBadge).toEqual({
      href: "https://steamcommunity.com/id/Fuzzycast/gamecards/257850",
      image:
        "https://shared.fastly.steamstatic.com/community_assets/images/items/257850/3e2d10cbbcc1c717c09ed77d1d9d592577c6ac12.png",
      name: "Lost Soul",
      xp: "100 XP",
      tooltip: ["Lost Soul", "Level 1 Hyper Light Drifter Badge"],
    });
  });

  it("reads the online status", () => {
    expect(sidebar.status).toEqual({ state: "online", header: "Currently Online" });
  });

  it("reads profile awards with their still and animated images", () => {
    expect(sidebar.awards).toMatchObject({ label: "Profile Awards", total: "6" });
    expect(sidebar.awards!.icons).toHaveLength(4);
    expect(sidebar.awards!.icons[0]).toEqual({
      image: "https://store.fastly.steamstatic.com/public/images/loyalty/reactions/still/2.png?v=5",
      animatedImage: "https://store.fastly.steamstatic.com/public/images/loyalty/reactions/animated/2.png?v=5",
      tooltip: "This user's profile has been given the 'Heartwarming' award 2 times",
    });
  });

  it("reads the badges row", () => {
    expect(sidebar.badges).toMatchObject({ label: "Badges", total: "84" });
    expect(sidebar.badges!.icons.map((b) => b.tooltip[0])).toEqual([
      "Game Mechanic",
      "Summer Collection - 2026 - Level 40",
      "Summer Sale 2026 - Level 1",
      "Cycle 5 ~ Industrial Complex",
    ]);
    expect(sidebar.badges!.icons[0].href).toBe("https://steamcommunity.com/id/Fuzzycast/badges/13");
  });

  it("reads the counts list in Steam's order, with no total for Inventory", () => {
    expect(sidebar.itemLinks.map((l) => [l.label, l.total])).toEqual([
      ["Games", "394"],
      ["Inventory", undefined],
      ["Screenshots", "121"],
      ["Reviews", "69"],
      ["Artwork", "4"],
    ]);
  });

  it("reads groups, primary first", () => {
    expect(sidebar.groups).toMatchObject({ label: "Groups", total: "5" });
    expect(sidebar.groups!.list.map((g) => [g.name, g.members, g.primary])).toEqual([
      ["Big Kitchen LLC", "22 Members", true],
      ["Cats is me", "61 Members", false],
      ["SV_ԘꞰꞱ", "8 Members", false],
    ]);
  });

  it("reads top friends' levels and online state", () => {
    expect(sidebar.friends).toMatchObject({ label: "Friends", total: "161" });
    expect(sidebar.friends!.list.map((f) => [f.level, f.state])).toEqual([
      [164, "online"],
      [154, "offline"],
      [142, "offline"],
      [126, "offline"],
      [125, "offline"],
      [122, "online"],
    ]);
    // The capture is redacted, but the fields are read from where Steam puts them.
    expect(sidebar.friends!.list[0]).toMatchObject({
      name: "[redacted]",
      detail: "[redacted]",
      href: "https://steamcommunity.com/profiles/REDACTED",
    });
  });
});

describe("parseProfilePage", () => {
  it("has no sidebar for a private profile", () => {
    const page = parseProfilePage('<body class="private_profile"><div class="profile_rightcol"></div></body>');
    expect(page.sidebar).toBeUndefined();
  });
});

/** Just the status box from a real profile page (markup captured 22 Nov 2026). */
function statusOf(inner: string) {
  const page = `<div class="profile_rightcol"><div class="responsive_status_info">${inner}</div></div>`;
  return parseProfilePage(page).sidebar!.status;
}

describe("parseSidebar status wording", () => {
  it("reads offline (signed-out visitors get no Last Online line)", () => {
    expect(
      statusOf(`<div class="profile_in_game persona offline">
        <div class="profile_in_game_header">Currently Offline</div>
      </div>`),
    ).toEqual({ state: "offline", header: "Currently Offline" });
  });

  it("reads in-game with the game and a Join Game button", () => {
    expect(
      statusOf(`<div class="profile_in_game persona in-game">
        <div class="profile_in_game_header">Currently In-Game</div>
        <div class="profile_in_game_name">
          GTFO
        </div>
        <div class="profile_in_game_joingame">
          <a href="steam://joinlobby/493520/1/2" class="btn_green_white_innerfade btn_small_thin"><span>Join Game</span></a>
        </div>
      </div>`),
    ).toEqual({ state: "in-game", header: "Currently In-Game", detail: "GTFO", joinGame: "steam://joinlobby/493520/1/2" });
  });

  it("keeps the empty game line for a non-Steam game", () => {
    expect(
      statusOf(`<div class="profile_in_game persona in-game">
        <div class="profile_in_game_header">In non-Steam game</div>
        <div class="profile_in_game_name">
        </div>
      </div>`),
    ).toEqual({ state: "in-game", header: "In non-Steam game", detail: "" });
  });
});
