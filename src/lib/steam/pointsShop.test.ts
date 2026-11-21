import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pointsShopAppUrl } from "./pointsShop";

const catalogue = JSON.parse(
  readFileSync(join(__dirname, "../../../reference/api/QueryRewardItems.json"), "utf8"),
).response.response;

describe("pointsShopAppUrl", () => {
  // Each of these pages was loaded in a headless browser on 21 Nov 2026 and
  // listed the named item; clicking it opened that item's purchase dialog.
  it.each([
    [2986370, "Golden Hour (static background)"],
    [3095380, "Amber Tide (animated background)"],
    [4197900, "Battle Blob (animated avatar)"],
    [4197880, "Bayside Beasts (profile theme)"],
  ])("links app %i, verified with %s", (appid) => {
    expect(pointsShopAppUrl(appid)).toBe(`https://store.steampowered.com/points/shop/app/${appid}`);
  });

  it("works for every item in the captured catalogue", () => {
    for (const def of catalogue.definitions) {
      expect(pointsShopAppUrl(def.appid)).toMatch(
        /^https:\/\/store\.steampowered\.com\/points\/shop\/app\/\d+$/,
      );
    }
  });

  it("rejects a bad appid", () => {
    expect(() => pointsShopAppUrl(NaN)).toThrow();
    expect(() => pointsShopAppUrl(-1)).toThrow();
  });
});
