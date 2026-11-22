import { describe, expect, it } from "vitest";
import { artworkSlots } from "./layouts";
import { checkFile, matchFiles } from "./reimport";
import { guideSteps, guideText } from "./uploadGuide";

const normal = artworkSlots("normal");
const file = (name: string, width: number, height: number, extra: Partial<{ size: number; type: string }> = {}) => ({
  name,
  width,
  height,
  size: extra.size ?? 50_000,
  type: extra.type ?? "image/png",
});

describe("matchFiles", () => {
  it("matches the exported names back to their slots", () => {
    const { matches, unmatched } = matchFiles(normal, [
      file("04_tile3_100x80.png", 100, 80),
      file("01_main_480x480.png", 480, 480),
    ]);
    expect(matches.map((m) => [m.slot.id, m.file.name])).toEqual([
      ["main", "01_main_480x480.png"],
      ["tile3", "04_tile3_100x80.png"],
    ]);
    expect(unmatched).toEqual([]);
  });

  it("matches renamed files by their prefix or slot id", () => {
    const { matches } = matchFiles(normal, [file("2 - glitch.png", 100, 80), file("my tile3 final.gif", 100, 80, { type: "image/gif" })]);
    expect(matches.map((m) => m.slot.id)).toEqual(["tile1", "tile3"]);
  });

  it("falls back to size, filling the first empty slot that fits", () => {
    const { matches, unmatched } = matchFiles(normal, [
      file("big.png", 480, 480),
      file("a.png", 100, 80),
      file("b.png", 100, 80),
      file("odd.png", 300, 300),
    ]);
    expect(matches.map((m) => [m.slot.id, m.file.name])).toEqual([
      ["main", "big.png"],
      ["tile1", "a.png"],
      ["tile2", "b.png"],
    ]);
    expect(unmatched.map((f) => f.name)).toEqual(["odd.png"]);
  });

  it("flags files that will look wrong on Steam", () => {
    const { matches } = matchFiles(normal, [file("01_main.png", 500, 480)]);
    expect(matches[0].problems[0]).toMatch(/black bars/);
  });
});

describe("checkFile", () => {
  it("passes an exact-size PNG", () => {
    expect(checkFile(normal[1], file("x.png", 100, 80))).toEqual([]);
  });

  it("warns about size limit and file type", () => {
    const problems = checkFile(normal[1], file("x.webp", 100, 80, { size: 6 * 1024 * 1024, type: "image/webp" }));
    expect(problems).toHaveLength(2);
  });
});

describe("upload guide", () => {
  it("only shows the console snippet for the long layout", () => {
    expect(guideSteps("normal", normal, true).some((s) => s.code)).toBe(false);
    const long = guideSteps("long", artworkSlots("long"), true).find((s) => s.code);
    expect(long?.unconfirmed).toBe(true);
  });

  it("writes the same steps into the README", () => {
    const text = guideText("normal", normal, true, "Glitch Sansui-zu");
    expect(text).toContain('"Glitch Sansui-zu"');
    expect(text).toContain("01_main_480x480.png");
    expect(text).toContain("Edit Profile → Featured Showcase → Artwork Showcase");
  });
});
