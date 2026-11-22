import { describe, expect, it } from "vitest";
import { bestGif, captureFps, encodeGif, frameCount, frameDelays, gifFileName, pickFrames } from "./gifExport";

/** Noisy frames compress badly, like a glitchy background. */
function noiseFrames(count: number, w: number, h: number, seed = 1) {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 255;
  return Array.from({ length: count }, () => {
    const f = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < f.length; i += 4) {
      f[i] = rand();
      f[i + 1] = rand();
      f[i + 2] = rand();
      f[i + 3] = 255;
    }
    return f;
  });
}

describe("frame timing", () => {
  it("makes one GIF loop as long as the background's loop, in 10 ms steps", () => {
    // The Glitch Sansui-zu loop is 2.667 s.
    const delays = frameDelays(2.667, frameCount(2.667, 15));
    expect(delays).toHaveLength(40);
    expect(delays.every((d) => d % 10 === 0 && d >= 60 && d <= 70)).toBe(true);
    expect(delays.reduce((a, b) => a + b, 0)).toBe(2670);
  });

  it("never goes under 20 ms a frame (browsers slow those down to 100 ms)", () => {
    expect(Math.min(...frameDelays(0.1, 10))).toBeGreaterThanOrEqual(20);
  });

  it("spreads picked frames evenly over the loop", () => {
    expect(pickFrames(40, 20)).toEqual(Array.from({ length: 20 }, (_, i) => i * 2));
    expect(pickFrames(10, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("captures at a lower frame rate for long videos so memory stays bounded", () => {
    const slots = [{ width: 506, height: 824 }, { width: 100, height: 824 }];
    expect(captureFps(3, slots)).toBe(20);
    expect(captureFps(60, slots)).toBeLessThan(20);
  });
});

describe("encoding", () => {
  it("writes a looping GIF89a of the right size", async () => {
    const bytes = (await encodeGif(noiseFrames(3, 20, 16), 20, 16, [100, 100, 100], 64))!;
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe("GIF89a");
    expect(bytes[6] | (bytes[7] << 8)).toBe(20);
    expect(bytes[8] | (bytes[9] << 8)).toBe(16);
    expect(new TextDecoder().decode(bytes)).toContain("NETSCAPE2.0");
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });

  it("gives up early once it passes the budget", async () => {
    expect(await encodeGif(noiseFrames(4, 64, 64), 64, 64, [100, 100, 100, 100], 256, 1000)).toBeNull();
  });

  it("drops frame rate and colours until it fits", async () => {
    const captured = noiseFrames(20, 64, 64);
    const best = await bestGif(captured, 20, 1, 64, 64, Infinity);
    expect(best).toMatchObject({ fps: 20, colors: 256, frames: 20, loopMs: 1000, overBudget: false });

    const budget = Math.round(best.bytes / 3);
    const fitted = await bestGif(captured, 20, 1, 64, 64, budget);
    expect(fitted.bytes).toBeLessThanOrEqual(budget);
    expect(fitted.frames).toBeLessThan(20);
    expect(fitted.loopMs).toBe(1000);
    expect(fitted.overBudget).toBe(false);
  });

  it("returns the smallest version, flagged, when nothing fits", async () => {
    const g = await bestGif(noiseFrames(10, 64, 64), 20, 0.5, 64, 64, 100);
    expect(g.overBudget).toBe(true);
    expect(g.colors).toBe(32);
  });
});

it("names GIFs after their slot", () => {
  expect(gifFileName({ fileName: "01_main_480x480.png" })).toBe("01_main_480x480.gif");
});
