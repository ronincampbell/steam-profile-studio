import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { packBits, writePsd } from "./psd";
import { templateLayers } from "./psdTemplate";
import { artworkSlots } from "./layouts";

/** PackBits decoder, to check the encoder. */
function unpackBits(data: Uint8Array, length: number): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (out.length < length) {
    const n = data[i++];
    if (n < 128) {
      for (let k = 0; k <= n; k++) out.push(data[i++]);
    } else if (n > 128) {
      for (let k = 0; k < 257 - n; k++) out.push(data[i]);
      i++;
    }
  }
  expect(i).toBe(data.length);
  return Uint8Array.from(out);
}

describe("packBits", () => {
  it.each([
    ["empty-ish", [0]],
    ["run", Array(300).fill(7)],
    ["literal", Array.from({ length: 300 }, (_, i) => i % 251)],
    ["mixed", [1, 2, 2, 3, 3, 3, 3, 4, 5, 5, 5, 6, ...Array(129).fill(9), 1, 2]],
  ])("round-trips %s", (_, bytes) => {
    const row = Uint8Array.from(bytes);
    expect(unpackBits(packBits(row), row.length)).toEqual(row);
  });

  it("squashes an empty row", () => {
    expect(packBits(new Uint8Array(1920)).length).toBeLessThan(40);
  });
});

/** Size of the test canvas: small, so the test is fast. */
function fakePixels(width: number, height: number, seed: number) {
  const px = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < px.length; i += 4) {
    const p = i / 4;
    px[i] = (p * 7 + seed) % 256;
    px[i + 1] = (p >> 4) % 256;
    px[i + 2] = seed;
    px[i + 3] = 255;
  }
  return px;
}

describe("writePsd", () => {
  it("writes the header, layer groups and names", () => {
    const slots = artworkSlots("normal");
    const width = 1920;
    const height = 1080;
    const doc = templateLayers(slots, {
      width,
      height,
      background: fakePixels(width, height, 1),
      pieces: new Map(slots.map((s) => [s.id, fakePixels(s.width, s.height, 2)])),
      outlines: new Uint8ClampedArray(width * height * 4),
      shade: new Uint8ClampedArray(width * height * 4),
      composite: fakePixels(width, height, 3),
    });
    const bytes = writePsd(doc);
    if (process.env.PSD_OUT) writeFileSync(process.env.PSD_OUT, bytes);
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("8BPS");
    expect(view.getUint32(14)).toBe(height);
    expect(view.getUint32(18)).toBe(width);
    // Layer count: guides group (marker + 2 + group), paint layer, 4 slot groups (marker + 2 + group), background.
    const resLen = view.getUint32(30);
    const layerCount = view.getInt16(26 + 4 + 4 + resLen + 4 + 4);
    expect(layerCount).toBe(4 + 1 + 4 * 4 + 1);
    const text = new TextDecoder("latin1").decode(bytes.slice(0, 200_000));
    expect(text).toContain("lsct");
    expect(text).toContain("Guides (hide before exporting)");
  });

  it("refuses pixels of the wrong size", () => {
    expect(() =>
      writePsd({
        width: 2,
        height: 2,
        composite: new Uint8Array(16),
        layers: [{ name: "x", left: 0, top: 0, width: 2, height: 2, pixels: new Uint8Array(3) }],
      }),
    ).toThrow(/expected 16/);
  });
});
