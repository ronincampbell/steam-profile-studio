import { describe, expect, it } from "vitest";
import { levelBadge } from "./level";

describe("levelBadge", () => {
  it("draws a coloured ring below level 100", () => {
    // The reference profile (level 75) shows a #c252c9 ring: Steam's lvl_70.
    expect(levelBadge(75)).toEqual({ kind: "ring", level: 75, className: "lvl_70", borderColor: "#c252c9" });
    expect(levelBadge(0)).toMatchObject({ className: "lvl_0", borderColor: "#9b9b9b" });
    expect(levelBadge(9)).toMatchObject({ className: "lvl_0" });
    expect(levelBadge(99)).toMatchObject({ className: "lvl_90", borderColor: "#997c52" });
  });

  it("uses Steam's sprite sheets from 100", () => {
    expect(levelBadge(100)).toMatchObject({ kind: "sprite", className: "lvl_100", position: "0 0" });
    expect(levelBadge(100)).toMatchObject({ image: expect.stringMatching(/levels_hexagons\.png$/) });
    expect(levelBadge(157)).toMatchObject({ className: "lvl_100 lvl_plus_50", position: "0 -160px" });
    expect(levelBadge(210)).toMatchObject({ image: expect.stringMatching(/levels_shields\.png$/), position: "0 -32px" });
  });

  it("caps at the highest sheet Steam has", () => {
    expect(levelBadge(99999)).toMatchObject({ image: expect.stringMatching(/levels_6100_crown\.png$/) });
  });
});
