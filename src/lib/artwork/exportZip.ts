/**
 * Build the download: the pieces, a full-size guide image, layout.json and a
 * README with the upload steps. Zipped in the browser; nothing is uploaded.
 */
import { zipSync, strToU8, type Zippable } from "fflate";
import type { ArtworkLayout, ArtworkSlot } from "./layouts";
import { guideText } from "./uploadGuide";
import { describeGif, gifFileName, type FinishedGif } from "./gifExport";

export interface ExportInput {
  backgroundName: string;
  backgroundUrl?: string;
  layout: ArtworkLayout;
  showcaseFirst: boolean;
  /** Seconds into an animated background the still pieces come from. */
  frameTime?: number;
  slots: ArtworkSlot[];
  pieces: Map<ArtworkSlot["id"], Blob>;
  guide: Blob;
  clips?: Map<ArtworkSlot["id"], Blob>;
  /** Ready-to-upload GIFs, for animated backgrounds. */
  gifs?: Map<ArtworkSlot["id"], FinishedGif>;
}

export function layoutJson(input: Omit<ExportInput, "pieces" | "guide" | "clips" | "gifs"> & { gifs?: ExportInput["gifs"] }) {
  return {
    generator: "Steam Profile Studio",
    background: { name: input.backgroundName, url: input.backgroundUrl, frameTime: input.frameTime },
    showcase: "Artwork",
    layout: input.layout,
    showcaseFirst: input.showcaseFirst,
    coordinates: "pixels of the background drawn 1920px wide, origin top-left",
    slots: input.slots.map(({ id, label, fileName, x, y, width, height }) => {
      const gif = input.gifs?.get(id);
      return {
        id,
        label,
        fileName,
        x,
        y,
        width,
        height,
        ...(gif && {
          gif: { fileName: gifFileName({ fileName }), bytes: gif.bytes, frames: gif.frames, fps: gif.fps, colors: gif.colors, loopMs: gif.loopMs },
        }),
      };
    }),
  };
}

export function zipName(backgroundName: string, layout: ArtworkLayout): string {
  const slug =
    backgroundName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "background";
  return `${slug}_artwork-${layout}.zip`;
}

export async function buildZip(input: ExportInput): Promise<Blob> {
  const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());
  // PNG, GIF and WebM are already compressed: store them as they are.
  const files: Zippable = {};
  for (const slot of input.slots) {
    const piece = input.pieces.get(slot.id);
    if (piece) files[slot.fileName] = [await bytes(piece), { level: 0 }];
  }
  for (const slot of input.slots) {
    const gif = input.gifs?.get(slot.id);
    if (gif) files[gifFileName(slot)] = [await bytes(gif.blob), { level: 0 }];
  }
  files["guide_full_background.png"] = [await bytes(input.guide), { level: 0 }];
  files["layout.json"] = strToU8(JSON.stringify(layoutJson(input), null, 2));
  files["README.txt"] = strToU8(guideText(input.layout, input.slots, input.showcaseFirst, input.backgroundName, gifNotes(input)));
  if (input.clips?.size) {
    for (const slot of input.slots) {
      const clip = input.clips.get(slot.id);
      if (clip) files[`source-clips/${slot.fileName.replace(/\.png$/, ".webm")}`] = [await bytes(clip), { level: 0 }];
    }
  }
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "01_main_480x480.gif  4.6 MB, 40 frames…" lines for README.txt. */
function gifNotes(input: Pick<ExportInput, "slots" | "gifs">): string[] | undefined {
  if (!input.gifs?.size) return undefined;
  return input.slots.flatMap((s) => {
    const g = input.gifs!.get(s.id);
    return g ? [`${gifFileName(s)}  ${describeGif(g)}`] : [];
  });
}
