import { describe, expect, it } from "vitest";
import { artworkSlots, maxLongHeight, overflowBelow, slotOnImage } from "./layouts";

describe("artworkSlots", () => {
  it("puts normal mode where Steam does when the showcase is first", () => {
    // reference/ARTWORK_WORKFLOW.md §3.2, measured with Steam's CSS
    expect(artworkSlots("normal").map(({ id, x, y, width, height }) => [id, x, y, width, height])).toEqual([
      ["main", 508, 256, 480, 480],
      ["tile1", 1010, 256, 100, 80],
      ["tile2", 1010, 349, 100, 80],
      ["tile3", 1010, 442, 100, 80],
    ]);
  });

  it("puts long mode where Steam does", () => {
    expect(artworkSlots("long", { longHeight: 600 }).map(({ id, x, y, width, height }) => [id, x, y, width, height])).toEqual([
      ["main", 495, 256, 506, 600],
      ["side", 1010, 256, 100, 600],
    ]);
  });

  it("moves every slot down with the showcase", () => {
    expect(artworkSlots("normal", { top: 300 }).map((s) => s.y)).toEqual([300, 300, 393, 486]);
  });

  it("names files so they sort in upload order", () => {
    expect(artworkSlots("normal").map((s) => s.fileName)).toEqual([
      "01_main_480x480.png",
      "02_tile1_100x80.png",
      "03_tile2_100x80.png",
      "04_tile3_100x80.png",
    ]);
    expect(artworkSlots("long", { longHeight: 824 }).map((s) => s.fileName)).toEqual([
      "01_main_506x824.png",
      "02_side_100x824.png",
    ]);
  });

  it("never makes a long image shorter than 80px", () => {
    expect(artworkSlots("long", { longHeight: 5 })[0].height).toBe(80);
  });
});

describe("maxLongHeight", () => {
  it("stops long art at the bottom of a 1080px background", () => {
    expect(maxLongHeight(256)).toBe(824);
    expect(maxLongHeight(1070)).toBe(80);
  });
});

describe("slotOnImage", () => {
  const main = artworkSlots("normal")[0];

  it("is a plain crop of a 1920×1080 background", () => {
    expect(slotOnImage(main, 1920, { width: 1920, height: 1080 })).toEqual({ sx: 508, sy: 256, sw: 480, sh: 480 });
  });

  it("scales for a smaller source drawn 1920 wide", () => {
    expect(slotOnImage(main, 1920, { width: 960, height: 540 })).toEqual({ sx: 254, sy: 128, sw: 240, sh: 240 });
  });
});

describe("overflowBelow", () => {
  it("reports how far a slot runs past the background", () => {
    expect(overflowBelow({ y: 256, height: 824 })).toBe(0);
    expect(overflowBelow({ y: 300, height: 824 })).toBe(44);
  });
});
