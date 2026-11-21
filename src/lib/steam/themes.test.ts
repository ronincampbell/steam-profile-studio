import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, themeColors, themeCssVars } from "./themes";

const api = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../../reference/api", file), "utf8")).response.response;

describe("themes", () => {
  it("has Steam's default and the reference profile's Steel theme", () => {
    expect(themeColors(undefined)).toBe(THEMES.Default);
    expect(THEMES.Steel.gradientBackground).toBe("rgba(41, 46, 51, 0.93)");
    expect(themeColors(api("GetProfileCustomization.nokey.json").profile_theme.theme_id)).toBe(THEMES.Steel);
  });

  it("covers every colour theme id in the captured Points Shop themes", () => {
    const ids = new Set<string>(
      api("QueryRewardItems.class-8-profile_modifier_theme.json").definitions.map(
        (d: { community_item_data: { profile_theme_id: string } }) => d.community_item_data.profile_theme_id,
      ),
    );
    ids.delete("GameProfile"); // no colour scheme of its own
    for (const id of ids) expect(THEMES[id], id).toBeDefined();
  });

  it("falls back to default for unknown ids and exposes Steam's variable names", () => {
    expect(themeColors("NotATheme")).toBe(THEMES.Default);
    expect(Object.keys(themeCssVars("Steel"))).toContain("--gradient-background");
  });
});
