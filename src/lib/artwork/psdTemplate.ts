/**
 * template_layered.psd: the whole background as a layered file, for painting
 * the artwork in Photoshop, Photopea, GIMP or Krita.
 *
 * Layers, top first:
 *   Guides (hide before exporting)   group
 *     Slot outlines and labels
 *     Profile column (shaded)
 *   Paint here (whole background)    empty, full size
 *   01 Big image - 480x480 at 508,256   group, one per slot
 *     Your art: 01                    empty, exactly the slot
 *     Background piece: 01            the background behind the slot
 *   …
 *   Background                         the full background
 *
 * The pure part (`templateLayers`) takes plain RGBA pixels so it can be
 * tested; `buildPsdTemplate` reads them off canvases in the browser.
 */
import { STEAM_BG_WIDTH, type ArtworkSlot } from "./layouts";
import { cropToCanvas, displayHeight, type BackgroundFrame } from "./crop";
import { drawGuideOverlay, drawColumnShade, guideHeight } from "./guideImage";
import { writePsd, type PsdDocument, type PsdNode } from "./psd";

export const PSD_FILE_NAME = "template_layered.psd";

export interface TemplatePixels {
  width: number;
  height: number;
  /** Full canvas, RGBA. */
  background: Uint8ClampedArray;
  /** Per slot, RGBA at the slot's size. */
  pieces: Map<ArtworkSlot["id"], Uint8ClampedArray>;
  /** Transparent canvas with the outlines and labels, RGBA. */
  outlines: Uint8ClampedArray;
  /** Transparent canvas with the column shaded around the slots, RGBA. */
  shade: Uint8ClampedArray;
  /** What a viewer without layer support shows (the guide image), RGBA. */
  composite: Uint8ClampedArray;
}

export function slotGroupName(s: ArtworkSlot): string {
  return `${s.fileName.slice(0, 2)} ${s.label} - ${s.width}x${s.height} at ${s.x},${s.y}`;
}

export function templateLayers(slots: ArtworkSlot[], px: TemplatePixels): PsdDocument {
  const full = { left: 0, top: 0, width: px.width, height: px.height };
  const layers: PsdNode[] = [
    {
      kind: "group",
      name: "Guides (hide before exporting)",
      children: [
        { name: "Slot outlines and labels", ...full, pixels: px.outlines },
        { name: "Profile column (shaded)", ...full, pixels: px.shade },
      ],
    },
    { name: "Paint here (whole background)", ...full },
    ...slots.map(
      (s): PsdNode => ({
        kind: "group",
        name: slotGroupName(s),
        open: false,
        children: [
          { name: `Your art: ${s.fileName.slice(0, 2)}`, left: s.x, top: s.y, width: s.width, height: s.height },
          {
            name: `Background piece: ${s.fileName.slice(0, 2)}`,
            left: s.x,
            top: s.y,
            width: s.width,
            height: s.height,
            pixels: px.pieces.get(s.id),
          },
        ],
      }),
    ),
    { name: "Background", ...full, pixels: px.background },
  ];
  return { width: px.width, height: px.height, composite: px.composite, layers };
}

/** Browser only. */
export function buildPsdTemplate(frame: BackgroundFrame, slots: ArtworkSlot[], guide: HTMLCanvasElement): Blob {
  const width = STEAM_BG_WIDTH;
  const height = guideHeight(frame, slots);
  const pixelsOf = (canvas: HTMLCanvasElement) =>
    canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
  const blank = () => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  };

  const bg = blank();
  const bgCtx = bg.getContext("2d")!;
  bgCtx.fillStyle = "#000";
  bgCtx.fillRect(0, 0, width, height);
  bgCtx.drawImage(frame.source, 0, 0, width, displayHeight(frame));

  const outlines = blank();
  drawGuideOverlay(outlines.getContext("2d")!, slots);
  const shade = blank();
  drawColumnShade(shade.getContext("2d")!, slots, height);

  const doc = templateLayers(slots, {
    width,
    height,
    background: pixelsOf(bg),
    pieces: new Map(slots.map((s) => [s.id, pixelsOf(cropToCanvas(frame, s))])),
    outlines: pixelsOf(outlines),
    shade: pixelsOf(shade),
    composite: pixelsOf(guide),
  });
  return new Blob([writePsd(doc) as BlobPart], { type: "image/vnd.adobe.photoshop" });
}
