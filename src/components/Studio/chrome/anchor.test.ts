import { describe, expect, it } from "vitest";
import { anchorFor } from "./anchor";

describe("anchorFor", () => {
  it("lines the panel up with the button's left edge and points at its middle", () => {
    expect(anchorFor({ left: 600, width: 120 }, 1725)).toEqual({ left: 600, caret: 60 });
  });

  it("pushes the panel back on-screen near the right edge, still pointing at the button", () => {
    // 1725 - 16 - 640 = 1069
    expect(anchorFor({ left: 1400, width: 130 }, 1725)).toEqual({ left: 1069, caret: 1400 + 65 - 1069 });
  });

  it("keeps the panel inside the gutter on the left", () => {
    expect(anchorFor({ left: 4, width: 30 }, 1725).left).toBe(16);
  });

  it("shrinks to the window on narrow screens and keeps the pointer off the corners", () => {
    const a = anchorFor({ left: 560, width: 40 }, 600);
    expect(a.left).toBe(16);
    expect(a.caret).toBe(568 - 24);
  });
});
