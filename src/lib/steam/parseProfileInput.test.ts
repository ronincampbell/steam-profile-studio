import { describe, expect, it } from "vitest";
import { parseProfileInput } from "./parseProfileInput";

describe("parseProfileInput", () => {
  it.each([
    ["https://steamcommunity.com/id/Fuzzycast/", { kind: "vanity", vanity: "Fuzzycast" }],
    ["steamcommunity.com/id/Fuzzycast", { kind: "vanity", vanity: "Fuzzycast" }],
    ["http://www.steamcommunity.com/id/Fuzzycast/games/?tab=all", { kind: "vanity", vanity: "Fuzzycast" }],
    ["https://steamcommunity.com/profiles/76561198220645184", { kind: "steamid", steamId: "76561198220645184" }],
    ["https://steamcommunity.com/profiles/76561198220645184/badges", { kind: "steamid", steamId: "76561198220645184" }],
    ["  76561198220645184  ", { kind: "steamid", steamId: "76561198220645184" }],
    ["Fuzzycast", { kind: "vanity", vanity: "Fuzzycast" }],
    ["gabe_newell-1", { kind: "vanity", vanity: "gabe_newell-1" }],
    // 17 digits that aren't a SteamID64 can still be someone's vanity name.
    ["12345678901234567", { kind: "vanity", vanity: "12345678901234567" }],
  ])("parses %s", (input, expected) => {
    expect(parseProfileInput(input)).toEqual(expected);
  });

  it.each([
    "",
    "   ",
    null,
    undefined,
    "https://store.steampowered.com/app/730",
    "https://steamcommunity.com/profiles/123",
    "https://steamcommunity.com/groups/valve",
    "has spaces in it",
    "a",
    "x".repeat(33),
    "<script>",
  ])("rejects %s", (input) => {
    expect(parseProfileInput(input)).toBeNull();
  });
});
