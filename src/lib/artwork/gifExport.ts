/**
 * Finished animated GIFs for animated backgrounds: one per slot, holding one
 * loop of the background video cropped to that slot, ready to upload
 * (reference/ARTWORK_WORKFLOW.md §6, option B).
 *
 * How it fits Steam's upload limit: frames are captured once, then each GIF
 * is encoded at the best setting on GIF_LADDER that comes in under the
 * budget, dropping frame rate first and colours second. The size of each
 * piece never changes, because any other size gets black bars on Steam.
 *
 * Timing: GIF frame delays are whole hundredths of a second, so the delays
 * alternate (e.g. 60 and 70 ms) to make one loop of the GIF last as long as
 * one loop of the background, to the nearest 10 ms. Each GIF still starts on
 * its own clock when the page loads, so it won't stay in step with the
 * background, but it won't drift further every loop either.
 */
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { MAX_UPLOAD_BYTES, type ArtworkSlot } from "./layouts";
import { drawSlot, frameOf, loadVideo, releaseVideo, seek } from "./crop";

export interface GifSetting {
  fps: number;
  colors: number;
}

/** Best first. The first one under budget wins. */
export const GIF_LADDER: GifSetting[] = [
  { fps: 20, colors: 256 },
  { fps: 15, colors: 256 },
  { fps: 15, colors: 128 },
  { fps: 12, colors: 128 },
  { fps: 10, colors: 128 },
  { fps: 10, colors: 64 },
  { fps: 8, colors: 64 },
  { fps: 6, colors: 48 },
  { fps: 5, colors: 32 },
];

/** Frames are captured at the ladder's top frame rate (or less for long videos). */
export const CAPTURE_FPS = GIF_LADDER[0].fps;

/** Under Steam's limit with room to spare, in case the limit is counted in thousands. */
export const GIF_BUDGET = Math.floor(MAX_UPLOAD_BYTES * 0.95);

/** Raw frames kept in memory at once, across all slots (RGBA bytes). */
const MAX_CAPTURE_BYTES = 320 * 1024 * 1024;

export interface FinishedGif {
  blob: Blob;
  fps: number;
  colors: number;
  frames: number;
  bytes: number;
  /** One loop, in ms. */
  loopMs: number;
  /** True only if even the smallest setting was too big. */
  overBudget: boolean;
  /** This part of the background doesn't move. */
  still?: boolean;
}

/**
 * Frame delays (ms, multiples of 10) for `count` frames that add up to one
 * loop of `duration` seconds, to the nearest 10 ms.
 */
export function frameDelays(duration: number, count: number): number[] {
  const total = Math.max(count * 2, Math.round(duration * 100)); // centiseconds; at least 20 ms a frame
  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    delays.push((Math.round(((i + 1) * total) / count) - Math.round((i * total) / count)) * 10);
  }
  return delays;
}

/** How many frames one loop gets at `fps`. */
export function frameCount(duration: number, fps: number): number {
  return Math.max(1, Math.round(duration * fps));
}

/** Which of `captured` frames (spread evenly over the loop) to use for `count` output frames. */
export function pickFrames(captured: number, count: number): number[] {
  return Array.from({ length: count }, (_, j) => Math.round((j * captured) / count) % captured);
}

/** The frame rate to capture at: CAPTURE_FPS, or less if that wouldn't fit in memory. */
export function captureFps(duration: number, slots: Pick<ArtworkSlot, "width" | "height">[]): number {
  const bytesPerFrame = slots.reduce((sum, s) => sum + s.width * s.height * 4, 0);
  const maxFrames = Math.floor(MAX_CAPTURE_BYTES / Math.max(1, bytesPerFrame));
  return Math.max(1, Math.min(CAPTURE_FPS, maxFrames / Math.max(duration, 0.001)));
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * One palette for the whole GIF, from pixels sampled across its frames. A
 * shared palette is smaller than one per frame and doesn't flicker.
 */
function sharedPalette(frames: Uint8ClampedArray[], colors: number) {
  const SAMPLE_PIXELS = 400_000;
  const use = pickFrames(frames.length, Math.min(frames.length, 16)).map((i) => frames[i]);
  const pixelsPerFrame = use[0].length / 4;
  const step = Math.max(1, Math.ceil((pixelsPerFrame * use.length) / SAMPLE_PIXELS));
  const sample = new Uint8Array(Math.ceil(pixelsPerFrame / step) * use.length * 4);
  let o = 0;
  for (const f of use) {
    for (let p = 0; p < pixelsPerFrame; p += step) {
      sample[o++] = f[p * 4];
      sample[o++] = f[p * 4 + 1];
      sample[o++] = f[p * 4 + 2];
      sample[o++] = 255;
    }
  }
  // rgb444 bins: rgb565 takes 10+ seconds on noisy frames, this takes ~0.1 s.
  return quantize(sample.subarray(0, o), colors, { format: "rgb444" });
}

/**
 * Encode one GIF from RGBA frames. Returns null as soon as it passes
 * `budget` bytes, so a setting that's too big costs little to try.
 */
export async function encodeGif(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
  delays: number[],
  colors: number,
  budget = Infinity,
): Promise<Uint8Array | null> {
  const palette = sharedPalette(frames, colors);
  const gif = GIFEncoder({ initialCapacity: 1024 * 1024 });
  for (let i = 0; i < frames.length; i++) {
    const index = applyPalette(frames[i], palette);
    gif.writeFrame(index, width, height, { palette: i === 0 ? palette : undefined, delay: delays[i], repeat: 0 });
    if (gif.bytesView().length > budget) return null;
    if (i % 4 === 3) await tick();
  }
  gif.finish();
  const bytes = gif.bytes();
  return bytes.length > budget ? null : bytes;
}

/**
 * The best GIF of one loop that fits `budget`. Falls back to the smallest
 * setting (flagged overBudget) if nothing fits.
 */
export async function bestGif(
  captured: Uint8ClampedArray[],
  capturedFps: number,
  duration: number,
  width: number,
  height: number,
  budget = GIF_BUDGET,
  ladder = GIF_LADDER,
): Promise<FinishedGif> {
  // Never ask for more frames than were captured.
  const rungs = ladder.map((r) => ({ ...r, fps: Math.min(r.fps, capturedFps) }));
  for (let i = 0; i < rungs.length; i++) {
    const { fps, colors } = rungs[i];
    const last = i === rungs.length - 1;
    const count = frameCount(duration, fps);
    const frames = pickFrames(captured.length, count).map((k) => captured[k]);
    const delays = frameDelays(duration, count);
    const bytes = await encodeGif(frames, width, height, delays, colors, last ? Infinity : budget);
    if (!bytes) continue;
    return {
      blob: new Blob([bytes as BlobPart], { type: "image/gif" }),
      fps: Math.round((count / duration) * 10) / 10,
      colors,
      frames: count,
      bytes: bytes.length,
      loopMs: delays.reduce((a, b) => a + b, 0),
      overBudget: bytes.length > budget,
    };
  }
  throw new Error("Couldn't make a GIF.");
}

/** Read one loop of the video, cropped to each slot, as RGBA frames. Browser only. */
export async function captureLoop(
  videoUrl: string,
  slots: ArtworkSlot[],
  onProgress?: (fraction: number) => void,
): Promise<{ duration: number; fps: number; frames: Map<ArtworkSlot["id"], Uint8ClampedArray[]> }> {
  const video = await loadVideo(videoUrl);
  try {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Couldn't read how long the background's loop is.");
    const fps = captureFps(duration, slots);
    const count = frameCount(duration, fps);
    const frame = frameOf(video);
    const canvases = slots.map((slot) => {
      const canvas = document.createElement("canvas");
      canvas.width = slot.width;
      canvas.height = slot.height;
      return { slot, ctx: canvas.getContext("2d", { willReadFrequently: true })! };
    });
    // slot id → frame number → RGBA, plus how far (s) each stored frame is from its ideal time.
    const store = new Map<ArtworkSlot["id"], Uint8ClampedArray[]>(slots.map((s) => [s.id, new Array(count)]));
    const off = new Array<number>(count).fill(Infinity);
    const grab = (j: number, distance: number) => {
      for (const { slot, ctx } of canvases) {
        drawSlot(ctx, frame, slot);
        store.get(slot.id)![j] = ctx.getImageData(0, 0, slot.width, slot.height).data;
      }
      off[j] = distance;
      onProgress?.(good() / count);
    };
    const step = duration / count;
    /**
     * Close enough: within half a frame of the video's own frame rate (it is
     * then the nearest frame there is), or a quarter of a GIF frame.
     */
    let sourceGap = Infinity;
    const closeEnough = (d: number) => d <= Math.max(step / 4, Number.isFinite(sourceGap) ? sourceGap / 2 + 1e-4 : 0);
    const good = () => off.filter(closeEnough).length;

    // 1. Play the loop in real time and keep the frame nearest each ideal
    //    time. Much faster than seeking to every frame, which makes the
    //    browser decode from the last keyframe each time. A slow computer
    //    drops frames, so a second, half-speed pass picks up what it can.
    if ("requestVideoFrameCallback" in video) {
      for (const rate of [1, 0.5]) {
        if (good() >= count * 0.95) break;
        let lastTime = -1;
        await playOnce(video, rate, (mediaTime) => {
          if (lastTime >= 0 && mediaTime > lastTime) sourceGap = Math.min(sourceGap, mediaTime - lastTime);
          lastTime = mediaTime;
          const j = Math.round(mediaTime / step);
          const distance = Math.abs(mediaTime - j * step);
          if (j < count && distance < off[j]) grab(j, distance);
        });
      }
    }

    // 2. Seek to any frame playback skipped or landed too far from.
    for (let j = 0; j < count; j++) {
      if (closeEnough(off[j])) continue;
      await seek(video, j * step);
      grab(j, 0);
    }

    // 3. Under load, playback now and then hands over a frame early or late,
    //    so two in a row come out the same. In a moving stretch that's a
    //    visible hitch, so re-read both by seeking, which is always exact.
    const main = store.get(slots[0].id)!;
    for (let j = 2; j < count; j++) {
      if (same(main[j], main[j - 1]) && !same(main[j - 1], main[j - 2])) {
        for (const k of [j - 1, j]) {
          await seek(video, k * step);
          grab(k, 0);
        }
      }
    }
    return { duration, fps: count / duration, frames: store };
  } finally {
    releaseVideo(video);
  }
}

/** Whether two frames are identical, checked on a sample of pixels. */
function same(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  for (let i = 0; i < a.length; i += 4 * 97) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) return false;
  return true;
}

/** Play `video` from the start to the end once, calling `onFrame` for each frame it shows. */
async function playOnce(video: HTMLVideoElement, rate: number, onFrame: (mediaTime: number) => void) {
  await seek(video, 0);
  video.loop = false;
  video.playbackRate = rate;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.pause();
      resolve();
    };
    const frame = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (done) return;
      onFrame(meta.mediaTime);
      video.requestVideoFrameCallback(frame);
    };
    video.requestVideoFrameCallback(frame);
    video.addEventListener("ended", finish, { once: true });
    // In case playback stalls (a background tab, say): seeking fills the gaps.
    setTimeout(finish, (video.duration / rate + 5) * 1000);
    video.play().catch(finish);
  });
}

/** Capture once, then make the best GIF that fits for each slot. Browser only. */
export async function makeGifs(
  videoUrl: string,
  slots: ArtworkSlot[],
  onProgress?: (message: string) => void,
): Promise<Map<ArtworkSlot["id"], FinishedGif>> {
  const loop = await captureLoop(videoUrl, slots, (f) =>
    onProgress?.(`Reading the background's frames… ${Math.round(f * 100)}%`),
  );
  const out = new Map<ArtworkSlot["id"], FinishedGif>();
  for (const [i, slot] of slots.entries()) {
    onProgress?.(`Making GIF ${i + 1} of ${slots.length} (${slot.label.toLowerCase()}), fitting it under ${mb(GIF_BUDGET)}…`);
    const captured = loop.frames.get(slot.id)!;
    const gif = await bestGif(captured, loop.fps, loop.duration, slot.width, slot.height);
    gif.still = captured.every((f) => same(f, captured[0]));
    out.set(slot.id, gif);
    loop.frames.delete(slot.id); // free the raw frames as we go
  }
  return out;
}

export function gifFileName(slot: Pick<ArtworkSlot, "fileName">): string {
  return slot.fileName.replace(/\.png$/, ".gif");
}

export function mb(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** One line per GIF, for the panel and README.txt. */
export function describeGif(g: FinishedGif): string {
  const base = `${mb(g.bytes)}, ${g.frames} frames (${g.fps} fps), ${g.colors} colours, ${(g.loopMs / 1000).toFixed(2)} s loop`;
  if (g.overBudget) return `${base}. Still over ${mb(MAX_UPLOAD_BYTES)}: Steam may refuse it`;
  return g.still ? `${base}. This part of the background doesn't move, so the PNG looks the same` : base;
}
