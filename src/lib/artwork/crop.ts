/**
 * Cut the background into the pieces that sit behind each artwork slot.
 * Browser only: uses <canvas>, <img> and <video>. Nothing is uploaded.
 *
 * Steam's CDN sends `access-control-allow-origin: *` for backgrounds and
 * their videos (checked 21 Nov 2026), so the canvas can read them.
 */
import { STEAM_BG_WIDTH, slotOnImage, type ArtworkSlot } from "./layouts";

export type BackgroundSource = { kind: "image"; url: string } | { kind: "video"; url: string; poster?: string };

/** One still of the background, ready to cut up. */
export interface BackgroundFrame {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The background image didn't load."));
    img.src = url;
  });
}

/** A muted, paused video element for reading frames. Remember to call `.remove()`-style cleanup via `releaseVideo`. */
export function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("The background video didn't load."));
    video.src = url;
  });
}

export function releaseVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

/** Seek and wait until that frame can be drawn. */
export function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const t = Math.max(0, Math.min(time, (video.duration || 0) - 0.001));
  if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = t;
  });
}

export function frameOf(el: HTMLImageElement | HTMLVideoElement): BackgroundFrame {
  return el instanceof HTMLVideoElement
    ? { source: el, width: el.videoWidth, height: el.videoHeight }
    : { source: el, width: el.naturalWidth, height: el.naturalHeight };
}

/**
 * Draw the part of the background behind `slot` onto `ctx`, scaled to the
 * slot's size. Anything past the background's edge is Steam's page black.
 */
export function drawSlot(ctx: CanvasRenderingContext2D, frame: BackgroundFrame, slot: ArtworkSlot) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, slot.width, slot.height);
  const { sx, sy, sw, sh } = slotOnImage(slot, STEAM_BG_WIDTH, frame);
  // Clip the source rectangle to the image, and the destination with it.
  const x0 = Math.max(0, sx);
  const y0 = Math.max(0, sy);
  const x1 = Math.min(frame.width, sx + sw);
  const y1 = Math.min(frame.height, sy + sh);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = slot.width / sw;
  const ky = slot.height / sh;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(frame.source, x0, y0, x1 - x0, y1 - y0, (x0 - sx) * kx, (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}

export function cropToCanvas(frame: BackgroundFrame, slot: ArtworkSlot): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = slot.width;
  canvas.height = slot.height;
  drawSlot(canvas.getContext("2d")!, frame, slot);
  return canvas;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't save the image."))), "image/png"),
  );
}

/** The image's height when drawn 1920px wide, as Steam and the preview do. */
export function displayHeight(frame: BackgroundFrame): number {
  return frame.width ? Math.round((frame.height * STEAM_BG_WIDTH) / frame.width) : 0;
}
