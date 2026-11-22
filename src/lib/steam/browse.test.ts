import { describe, expect, it } from "vitest";
import {
  filterEntries,
  groupByGame,
  matchesVibe,
  pageOf,
  sortEntries,
  type IndexEntry,
} from "./browse";
import type { GameInfo, ShopItem } from "./types";

function entry(
  defid: number,
  appid: number,
  name: string,
  rank: number,
  created: number,
): IndexEntry {
  const item: ShopItem = {
    type: "avatar-frame",
    appid,
    defid,
    name,
    pointCost: 2000,
    animated: true,
    buyUrl: `https://store.steampowered.com/points/shop/app/${appid}`,
  };
  return { item, rank, created };
}

const games = new Map<number, GameInfo>([
  [
    1,
    {
      appid: 1,
      name: "Cat Cafe",
      tags: ["Casual", "Cute", "Relaxing"],
      event: false,
    },
  ],
  [
    2,
    {
      appid: 2,
      name: "Night Terror",
      tags: ["Horror", "Dark", "Atmospheric"],
      event: false,
    },
  ],
  [3, { appid: 3, name: "Summer Fest 2026", tags: [], event: true }],
  // Cute, but only as its 9th tag, so it shouldn't count.
  [
    4,
    {
      appid: 4,
      name: "Gun Range",
      tags: [
        "Shooter",
        "FPS",
        "Action",
        "PvP",
        "Multiplayer",
        "Military",
        "Tactical",
        "War",
        "Cute",
      ],
      event: false,
    },
  ],
]);

const entries = [
  entry(10, 2, "Blood Moon", 0, 300),
  entry(11, 1, "Latte Art", 1, 500),
  entry(12, 3, "Fest Frame", 2, 100),
  entry(13, 1, "Whiskers", 3, 200),
  entry(14, 4, "Scope", 4, 400),
  entry(15, 99, "Old Halloween", 5, 50), // no store page
];

describe("matchesVibe", () => {
  it("matches on a game's strong tags", () => {
    expect(matchesVibe(games.get(1), "cute")).toBe(true);
    expect(matchesVibe(games.get(1), "cozy")).toBe(true);
    expect(matchesVibe(games.get(2), "horror")).toBe(true);
    expect(matchesVibe(games.get(2), "cute")).toBe(false);
  });
  it("ignores weak tags", () => {
    expect(matchesVibe(games.get(4), "cute")).toBe(false);
  });
  it("puts festivals and unknown apps under Steam events only", () => {
    expect(matchesVibe(games.get(3), "events")).toBe(true);
    expect(matchesVibe(undefined, "events")).toBe(true);
    expect(matchesVibe(games.get(1), "events")).toBe(false);
    expect(matchesVibe(undefined, "cute")).toBe(false);
  });
});

describe("filterEntries", () => {
  it("filters by vibe, game and search (item or game name)", () => {
    expect(
      filterEntries(entries, games, { vibe: "cute" }).map((e) => e.item.defid),
    ).toEqual([11, 13]);
    expect(
      filterEntries(entries, games, { app: 2 }).map((e) => e.item.defid),
    ).toEqual([10]);
    expect(
      filterEntries(entries, games, { q: "night" }).map((e) => e.item.defid),
    ).toEqual([10]);
    expect(
      filterEntries(entries, games, { q: "WHISK" }).map((e) => e.item.defid),
    ).toEqual([13]);
    expect(
      filterEntries(entries, games, { vibe: "events" }).map(
        (e) => e.item.defid,
      ),
    ).toEqual([12, 15]);
  });
});

describe("sortEntries", () => {
  it("orders by Steam's popularity or by newest", () => {
    const shuffled = [entries[3], entries[0], entries[2]];
    expect(sortEntries(shuffled, "popular").map((e) => e.rank)).toEqual([
      0, 2, 3,
    ]);
    expect(sortEntries(shuffled, "new").map((e) => e.created)).toEqual([
      300, 200, 100,
    ]);
  });
});

describe("groupByGame", () => {
  it("puts the profile's games first, most played first, then by most popular item", () => {
    const owned = new Map([
      [4, 10],
      [1, 900],
    ]);
    const groups = groupByGame(entries, games, owned, 1);
    expect(groups.map((g) => [g.appid, g.mine, g.count])).toEqual([
      [1, true, 2],
      [4, true, 1],
      [2, false, 1],
      [3, false, 1],
      [99, false, 1],
    ]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Latte Art"]);
    expect(groups[0].items[0].game).toBe("Cat Cafe");
    expect(groups[4].name).toBe("Steam event");
  });
  it("works without a profile", () => {
    expect(groupByGame(entries, games, null).map((g) => g.appid)).toEqual([
      2, 1, 3, 4, 99,
    ]);
  });
});

describe("pageOf", () => {
  it("pages with offset cursors", () => {
    const list = Array.from({ length: 5 }, (_, i) => i);
    expect(pageOf(list, undefined, 2)).toEqual({
      page: [0, 1],
      nextCursor: "2",
    });
    expect(pageOf(list, "4", 2)).toEqual({ page: [4], nextCursor: undefined });
    expect(pageOf(list, "junk", 2).page).toEqual([0, 1]);
  });
});
