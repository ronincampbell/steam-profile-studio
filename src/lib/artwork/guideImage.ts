/**
 * guide_full_background.png: the whole background with Steam's profile
 * column shaded and every slot outlined and labelled, so the pieces can be
 * lined up by eye in any editor. The shading and the outlines are drawn
 * separately too, as layers of the .psd template.
 */
import { STEAM_BG_WIDTH, type ArtworkSlot } from "./layouts";
import { displayHeight, type BackgroundFrame } from "./crop";

/** Steam's 976px profile column, centred: x 472–1448, from y 224 down. */
const COLUMN = { x: 472, width: 976, top: 224 };

/** The guide is the background's height, or taller if a slot runs past it. */
export function guideHeight(frame: BackgroundFrame, slots: ArtworkSlot[]): number {
  const bottom = Math.max(...slots.map((s) => s.y + s.height));
  return Math.max(displayHeight(frame), bottom + 40);
}

/** The profile column, dimmed except where the art goes. */
export function drawColumnShade(ctx: CanvasRenderingContext2D, slots: ArtworkSlot[], height: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(COLUMN.x, COLUMN.top, COLUMN.width, height - COLUMN.top);
  for (const s of slots) ctx.rect(s.x + s.width, s.y, -s.width, s.height); // reverse winding = hole
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fill("nonzero");
  ctx.restore();
}

/** Dashed outlines, labels and the note above the column. */
export function drawGuideOverlay(ctx: CanvasRenderingContext2D, slots: ArtworkSlot[]) {
  ctx.save();
  ctx.font = "bold 14px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "top";
  for (const s of slots) {
    ctx.strokeStyle = "#66c0f4";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x - 1, s.y - 1, s.width + 2, s.height + 2);
    ctx.setLineDash([]);
    const label = `${s.fileName.slice(0, 2)} ${s.label} · ${s.x},${s.y}`;
    const w = ctx.measureText(label).width + 8;
    // Labels for the narrow right-hand slots go outside, to the right.
    const lx = s.width < 200 ? s.x + s.width + 6 : s.x;
    const ly = s.width < 200 ? s.y : s.y - 22;
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(lx, ly, w, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, lx + 4, ly + 3);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(COLUMN.x, COLUMN.top - 30, COLUMN.width, 24);
  ctx.fillStyle = "#c6d4df";
  ctx.font = "13px Arial, Helvetica, sans-serif";
  ctx.fillText(
    "Shaded: Steam's profile column. Positions assume the Artwork showcase is placed as in the app, window 910–1920px wide.",
    COLUMN.x + 8,
    COLUMN.top - 25,
  );
  ctx.restore();
}

export function drawGuide(frame: BackgroundFrame, slots: ArtworkSlot[]): HTMLCanvasElement {
  const height = guideHeight(frame, slots);
  const canvas = document.createElement("canvas");
  canvas.width = STEAM_BG_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frame.source, 0, 0, STEAM_BG_WIDTH, displayHeight(frame));
  drawColumnShade(ctx, slots, height);
  drawGuideOverlay(ctx, slots);
  return canvas;
}
