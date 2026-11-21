import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assetUrl, catalogueAssetUrl, COMMUNITY_ASSETS_BASE } from "./assets";

const api = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../../reference/api", file), "utf8"))
    .response.response;

const CLASS_FILES = [
  "QueryRewardItems.class-3-profile_background.json",
  "QueryRewardItems.class-8-profile_modifier_theme.json",
  "QueryRewardItems.class-13-mini_profile_background.json",
  "QueryRewardItems.class-14-avatar_frame.json",
  "QueryRewardItems.class-15-animated_avatar.json",
];

const ASSET_FIELD = /^item_(image|movie)_/;
const FULL_URL =
  /^https:\/\/shared\.fastly\.steamstatic\.com\/community_assets\/images\/items\/\d+\/[0-9a-f]{40}\.(jpe?g|png|gif|webm|mp4)$/;

describe("assetUrl (equipped items)", () => {
  const equipped = api("GetProfileItemsEquipped.json");

  // These exact URLs returned 200 with the right content type on 21 Nov 2026.
  it.each([
    [equipped.profile_background.image_large, "items/1492660/f53947e25201d549d9281bf395e383e17c640587.jpg"],
    [equipped.profile_background.movie_webm, "items/1492660/3b67d75c3161ff8ebb1501f4436b839ea490e050.webm"],
    [equipped.mini_profile_background.movie_mp4, "items/774171/cf35fb788161f4836e30497c1ff4916fada9d530.mp4"],
    [equipped.avatar_frame.image_small, "items/774171/f9997653542df9f7814d0bb9f9d24b10c4b1a289.png"],
  ])("builds %s", (path, expected) => {
    expect(assetUrl(path)).toBe(COMMUNITY_ASSETS_BASE + expected);
  });

  it("leaves empty slots empty", () => {
    expect(equipped.animated_avatar.image_large).toBeUndefined();
    expect(assetUrl(equipped.animated_avatar.image_large)).toBeUndefined();
    expect(assetUrl("")).toBeUndefined();
  });
});

describe("catalogueAssetUrl (Points Shop catalogue)", () => {
  it("builds a verified URL for each MVP item type", () => {
    // One real item per type; each URL returned 200 on 21 Nov 2026.
    expect(catalogueAssetUrl(2986370, "62e7c87a98af404bbf726ad3c297f5be0ccab988.jpg")).toBe(
      "https://shared.fastly.steamstatic.com/community_assets/images/items/2986370/62e7c87a98af404bbf726ad3c297f5be0ccab988.jpg",
    ); // static background "Golden Hour"
    expect(catalogueAssetUrl(3095380, "3e77f369786afea736aa6f6415204b9257fa72fa.webm")).toBe(
      "https://shared.fastly.steamstatic.com/community_assets/images/items/3095380/3e77f369786afea736aa6f6415204b9257fa72fa.webm",
    ); // animated background "Amber Tide"
  });

  it.each(CLASS_FILES)("gives a well-formed URL for every asset in %s", (file) => {
    const { definitions } = api(file);
    let count = 0;
    for (const def of definitions) {
      for (const [field, value] of Object.entries(def.community_item_data ?? {})) {
        if (!ASSET_FIELD.test(field) || !value) continue;
        expect(catalogueAssetUrl(def.appid, value as string)).toMatch(FULL_URL);
        count++;
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it("returns undefined for a missing file and rejects a bad appid", () => {
    expect(catalogueAssetUrl(2986370, undefined)).toBeUndefined();
    expect(() => catalogueAssetUrl(0, "a.jpg")).toThrow();
  });
});
