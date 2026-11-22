/**
 * A small writer for layered Photoshop (.psd) files: 8-bit RGB, raster
 * layers with transparency, and layer groups. Just enough for the artwork
 * template, written to the published Adobe spec ("Adobe Photoshop File
 * Formats Specification") so Photoshop, Photopea, GIMP and Krita all open it.
 *
 * No dependencies and no DOM, so it runs in the browser and in tests.
 * Pixel data is RLE (PackBits) compressed, which keeps the empty layers tiny.
 */

/** A raster layer. `pixels` is RGBA, `width * height * 4` bytes; leave it out for an empty layer. */
export interface PsdLayer {
  kind?: "layer";
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  pixels?: Uint8Array | Uint8ClampedArray;
  hidden?: boolean;
  /** 0–255. */
  opacity?: number;
}

export interface PsdGroup {
  kind: "group";
  name: string;
  /** Top of the Layers panel first, as you'd read it in an editor. */
  children: PsdNode[];
  hidden?: boolean;
  /** Shown expanded in the Layers panel. */
  open?: boolean;
}

export type PsdNode = PsdLayer | PsdGroup;

export interface PsdDocument {
  width: number;
  height: number;
  /** The flattened image (RGBA, alpha ignored): what viewers that don't read layers show. */
  composite: Uint8Array | Uint8ClampedArray;
  /** Top of the Layers panel first. */
  layers: PsdNode[];
}

// ---- Low-level byte writing ---------------------------------------------

class Writer {
  private buf = new Uint8Array(1 << 16);
  private view = new DataView(this.buf.buffer);
  length = 0;

  private ensure(n: number) {
    if (this.length + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.length + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.length));
    this.buf = next;
    this.view = new DataView(next.buffer);
  }
  u8(v: number) {
    this.ensure(1);
    this.buf[this.length++] = v;
  }
  u16(v: number) {
    this.ensure(2);
    this.view.setUint16(this.length, v);
    this.length += 2;
  }
  i16(v: number) {
    this.ensure(2);
    this.view.setInt16(this.length, v);
    this.length += 2;
  }
  u32(v: number) {
    this.ensure(4);
    this.view.setUint32(this.length, v);
    this.length += 4;
  }
  i32(v: number) {
    this.ensure(4);
    this.view.setInt32(this.length, v);
    this.length += 4;
  }
  ascii(s: string) {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i) & 0x7f);
  }
  bytes(b: Uint8Array) {
    this.ensure(b.length);
    this.buf.set(b, this.length);
    this.length += b.length;
  }
  pad(multiple: number, from = 0) {
    while ((this.length - from) % multiple) this.u8(0);
  }
  /** Write a u32 length, then the section, then fill the length in (padded to `multiple`). */
  section(multiple: number, body: () => void) {
    const at = this.length;
    this.u32(0);
    body();
    this.pad(multiple, at + 4);
    this.view.setUint32(at, this.length - at - 4);
  }
  done(): Uint8Array {
    return this.buf.slice(0, this.length);
  }
}

// ---- PackBits (the RLE PSD uses) ----------------------------------------

/** PackBits-compress one row. Exported for tests. */
export function packBits(row: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const n = row.length;
  while (i < n) {
    // A run of 3+ equal bytes is worth a repeat packet.
    let run = 1;
    while (i + run < n && run < 128 && row[i + run] === row[i]) run++;
    if (run >= 3) {
      out.push(257 - run, row[i]);
      i += run;
      continue;
    }
    // Otherwise copy bytes literally until the next run of 3 starts.
    const start = i;
    while (i < n && i - start < 128) {
      if (i + 2 < n && row[i] === row[i + 1] && row[i] === row[i + 2]) break;
      i++;
    }
    out.push(i - start - 1);
    for (let k = start; k < i; k++) out.push(row[k]);
  }
  return Uint8Array.from(out);
}

/** One channel of RGBA pixels, RLE compressed: [row byte counts…, rows…] (no compression flag). */
function rleChannel(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number, channel: number) {
  const row = new Uint8Array(width);
  const rows: Uint8Array[] = [];
  for (let y = 0; y < height; y++) {
    const base = y * width * 4 + channel;
    for (let x = 0; x < width; x++) row[x] = pixels[base + x * 4];
    rows.push(packBits(row));
  }
  return rows;
}

function encodeChannel(pixels: Uint8Array | Uint8ClampedArray | undefined, width: number, height: number, channel: number) {
  const w = new Writer();
  if (!width || !height) {
    w.u16(0); // raw, no data
    return w.done();
  }
  w.u16(1); // RLE
  // An empty layer is fully transparent black.
  const rows = pixels ? rleChannel(pixels, width, height, channel) : rleChannel(new Uint8Array(width * height * 4), width, height, channel);
  for (const r of rows) w.u16(r.length);
  for (const r of rows) w.bytes(r);
  return w.done();
}

// ---- Layer records ------------------------------------------------------

/** One entry in the PSD's flat layer list, bottom of the stack first. */
interface FlatLayer {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  pixels?: Uint8Array | Uint8ClampedArray;
  hidden: boolean;
  opacity: number;
  /** lsct: 0 normal layer, 1 open group, 2 closed group, 3 end-of-group marker. */
  section: 0 | 1 | 2 | 3;
}

/**
 * PSD stores layers as a flat list, bottom first. A group is its end marker,
 * then its contents, then the group itself.
 */
function flatten(nodes: PsdNode[]): FlatLayer[] {
  const out: FlatLayer[] = [];
  for (const node of [...nodes].reverse()) {
    if (node.kind === "group") {
      out.push({ name: "</Layer group>", left: 0, top: 0, width: 0, height: 0, hidden: false, opacity: 255, section: 3 });
      out.push(...flatten(node.children));
      out.push({
        name: node.name,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        hidden: Boolean(node.hidden),
        opacity: 255,
        section: node.open === false ? 2 : 1,
      });
    } else {
      if (node.pixels && node.pixels.length !== node.width * node.height * 4) {
        throw new Error(`Layer "${node.name}" has ${node.pixels.length} bytes of pixels, expected ${node.width * node.height * 4}.`);
      }
      out.push({
        name: node.name,
        left: node.left,
        top: node.top,
        width: node.width,
        height: node.height,
        pixels: node.pixels,
        hidden: Boolean(node.hidden),
        opacity: node.opacity ?? 255,
        section: 0,
      });
    }
  }
  return out;
}

/** Channel ids in the order they're written: transparency, red, green, blue. */
const CHANNELS: { id: number; rgba: number }[] = [
  { id: -1, rgba: 3 },
  { id: 0, rgba: 0 },
  { id: 1, rgba: 1 },
  { id: 2, rgba: 2 },
];

function writeLayerRecord(w: Writer, layer: FlatLayer, channelData: Uint8Array[]) {
  w.i32(layer.top);
  w.i32(layer.left);
  w.i32(layer.top + layer.height);
  w.i32(layer.left + layer.width);
  w.u16(CHANNELS.length);
  CHANNELS.forEach((c, i) => {
    w.i16(c.id);
    w.u32(channelData[i].length);
  });
  w.ascii("8BIM");
  // Groups blend as "pass through", like a new group in Photoshop.
  w.ascii(layer.section === 1 || layer.section === 2 ? "pass" : "norm");
  w.u8(layer.opacity);
  w.u8(0); // clipping: base
  // Flags: bit 1 = hidden; bits 3+4 = "pixel data irrelevant" (group markers).
  w.u8((layer.hidden ? 0x02 : 0) | (layer.section ? 0x18 : 0));
  w.u8(0);
  w.section(1, () => {
    w.u32(0); // no layer mask
    w.u32(0); // no blending ranges
    // Pascal-string name (Latin only), padded to 4 bytes. The full name is in "luni".
    const ascii = layer.name.replace(/[^\x20-\x7e]/g, "_").slice(0, 255);
    const at = w.length;
    w.u8(ascii.length);
    w.ascii(ascii);
    w.pad(4, at);
    // Unicode name.
    w.ascii("8BIMluni");
    w.section(2, () => {
      w.u32(layer.name.length);
      for (let i = 0; i < layer.name.length; i++) w.u16(layer.name.charCodeAt(i));
    });
    if (layer.section) {
      w.ascii("8BIMlsct");
      w.section(2, () => {
        w.u32(layer.section);
        if (layer.section !== 3) {
          w.ascii("8BIM");
          w.ascii("pass");
        }
      });
    }
  });
}

// ---- The whole file -----------------------------------------------------

export function writePsd(doc: PsdDocument): Uint8Array {
  const { width, height } = doc;
  if (doc.composite.length !== width * height * 4) throw new Error("The composite image is the wrong size.");
  const w = new Writer();

  // File header.
  w.ascii("8BPS");
  w.u16(1); // version
  for (let i = 0; i < 6; i++) w.u8(0);
  w.u16(3); // channels in the composite: RGB
  w.u32(height);
  w.u32(width);
  w.u16(8); // bits per channel
  w.u16(3); // RGB colour mode

  w.u32(0); // colour mode data: none

  // Image resources: just the resolution (72 dpi), so print sizes look sane.
  w.section(2, () => {
    w.ascii("8BIM");
    w.u16(1005);
    w.u16(0); // empty name, padded
    w.u32(16);
    w.u32(72 << 16); // horizontal res, 16.16 fixed
    w.u16(1); // px per inch
    w.u16(1); // width unit: inches
    w.u32(72 << 16);
    w.u16(1);
    w.u16(1);
  });

  // Layers.
  const layers = flatten(doc.layers);
  const data = layers.map((l) => CHANNELS.map((c) => encodeChannel(l.pixels, l.width, l.height, c.rgba)));
  w.section(2, () => {
    w.section(2, () => {
      w.i16(layers.length);
      layers.forEach((l, i) => writeLayerRecord(w, l, data[i]));
      for (const channels of data) for (const c of channels) w.bytes(c);
    });
    w.u32(0); // no global layer mask
  });

  // The flattened image: compression flag, all row counts, then all rows, channel by channel.
  w.u16(1);
  const merged = [0, 1, 2].map((c) => rleChannel(doc.composite, width, height, c));
  for (const rows of merged) for (const r of rows) w.u16(r.length);
  for (const rows of merged) for (const r of rows) w.bytes(r);

  return w.done();
}
