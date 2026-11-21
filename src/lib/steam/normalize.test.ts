import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeEquipped, normalizeProfile, normalizeRewardItem } from "./normalize";

const api = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../../reference/api", file), "utf8")).response.response;

const BASE = "https://shared.fastly.steamstatic.com/community_assets/images/items/";

describe("normalizeRewardItem", () => {
  it("normalises a static background", () => {
    const def = api("QueryRewardItems.class-3-profile_background.json").definitions[0];
    expect(normalizeRewardItem(def)).toEqual({
      type: "background",
      appid: 2986370,
      defid: 4118398,
      name: "Golden Hour",
      description: "Sun down over the bay, engine ticking as it cools. The best part of the shift.",
      pointCost: 500,
      animated: false,
      buyUrl: "https://store.steampowered.com/points/shop/app/2986370",
      image: BASE + "2986370/62e7c87a98af404bbf726ad3c297f5be0ccab988.jpg",
      thumbnail: BASE + "2986370/62e7c87a98af404bbf726ad3c297f5be0ccab988.jpg",
    });
  });

  it.each([
    ["QueryRewardItems.class-3-profile_background.json", "background"],
    ["QueryRewardItems.class-8-profile_modifier_theme.json", "theme"],
    ["QueryRewardItems.class-13-mini_profile_background.json", "mini-background"],
    ["QueryRewardItems.class-14-avatar_frame.json", "avatar-frame"],
    ["QueryRewardItems.class-15-animated_avatar.json", "animated-avatar"],
  ])("normalises every item in %s", (file, type) => {
    const items = api(file).definitions.map(normalizeRewardItem);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).not.toBeNull();
      expect(item.type).toBe(type);
      expect(item.name).toBeTruthy();
      expect(item.buyUrl).toMatch(/^https:\/\/store\.steampowered\.com\/points\/shop\/app\/\d+$/);
      expect(item.thumbnail ?? item.image).toMatch(/^https:\/\//);
      if (item.animated && type === "background") expect(item.video).toBeDefined();
      if (type === "theme") expect(item.themeId).toBeTruthy();
      if (type === "avatar-frame") expect(item.animatedImage).toBeDefined();
    }
  });

  it("marks animated backgrounds and gives them videos", () => {
    const defs = api("QueryRewardItems.class-3-profile_background.json").definitions;
    const animated = defs.map(normalizeRewardItem).filter((i: { animated: boolean }) => i.animated);
    expect(animated.length).toBeGreaterThan(0);
    expect(animated[0].video.webm).toMatch(/\.webm$/);
    expect(animated[0].video.mp4).toMatch(/\.mp4$/);
  });

  it("skips item classes the app doesn't preview", () => {
    expect(normalizeRewardItem({ appid: 1, defid: 1, community_item_class: 4, community_item_data: {} })).toBeNull();
  });
});

describe("normalizeEquipped", () => {
  const equipped = normalizeEquipped(api("GetProfileItemsEquipped.json"));

  it("keeps the equipped slots and drops empty ones", () => {
    expect(Object.keys(equipped).sort()).toEqual(["avatarFrame", "background", "miniBackground"]);
  });

  it("builds full URLs, with the frame's animated APNG separate", () => {
    expect(equipped.background).toMatchObject({
      name: "Glitch Sansui-zu",
      image: BASE + "1492660/f53947e25201d549d9281bf395e383e17c640587.jpg",
      video: {
        webm: BASE + "1492660/3b67d75c3161ff8ebb1501f4436b839ea490e050.webm",
        mp4: BASE + "1492660/70c3ff97957a8a23fdf7a688f2583d5462fd8c4c.mp4",
      },
    });
    expect(equipped.avatarFrame).toMatchObject({
      name: "Musedash 98.ver",
      image: BASE + "774171/89707f721655a080b91d56669aa9bd165ca74222.png",
      animatedImage: BASE + "774171/f9997653542df9f7814d0bb9f9d24b10c4b1a289.png",
    });
  });
});

describe("normalizeProfile", () => {
  it("combines summary, level and equipped items", () => {
    const summary = api("GetPlayerSummaries.json").players[0];
    const level = api("GetSteamLevel.json").player_level;
    const theme = api("GetProfileCustomization.nokey.json").profile_theme.theme_id;
    const profile = normalizeProfile(summary, level, {}, theme);
    expect(profile).toEqual({
      steamId: "76561198220645184",
      name: "Fuzzycast",
      realName: "Fuzzycast",
      profileUrl: "https://steamcommunity.com/id/Fuzzycast/",
      avatar: "https://avatars.steamstatic.com/7a0d41286fbdaec5d200908e9f90a60d6ed1184c_full.jpg",
      countryCode: "AU",
      level: 75,
      isPublic: true,
      themeId: "Steel",
      equipped: {},
    });
  });
});
