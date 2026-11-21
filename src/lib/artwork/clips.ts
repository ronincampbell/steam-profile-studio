/**
 * Source clips for animated backgrounds: one WebM per slot, holding one loop
 * of the background video cropped to that slot. Steam won't take WebM as
 * artwork, so these are for making your own GIF in Photoshop, After Effects
 * or similar (reference/ARTWORK_WORKFLOW.md §6, option C).
 *
 * Recorded in real time with MediaRecorder, so it takes as long as one loop
 * of the video (usually a few seconds).
 */
import type { ArtworkSlot } from "./layouts";
import { drawSlot, frameOf, loadVideo, releaseVideo, seek } from "./crop";

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
}

export function canRecordClips(): boolean {
  return typeof document !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && Boolean(pickMime());
}

export async function recordClips(
  videoUrl: string,
  slots: ArtworkSlot[],
  onProgress?: (fraction: number) => void,
): Promise<Map<ArtworkSlot["id"], Blob>> {
  const mime = pickMime();
  if (!mime) throw new Error("This browser can't record video clips.");
  const video = await loadVideo(videoUrl);
  try {
    await seek(video, 0);
    const frame = frameOf(video);
    const parts = slots.map((slot) => {
      const canvas = document.createElement("canvas");
      canvas.width = slot.width;
      canvas.height = slot.height;
      const ctx = canvas.getContext("2d")!;
      drawSlot(ctx, frame, slot);
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        // Generous: these are editing sources, not uploads.
        videoBitsPerSecond: Math.max(2_000_000, slot.width * slot.height * 30 * 0.4),
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });
      return { slot, ctx, recorder, done };
    });

    for (const p of parts) p.recorder.start();
    let stopped = false;
    const draw = () => {
      if (stopped) return;
      for (const p of parts) drawSlot(p.ctx, frame, p.slot);
      onProgress?.(video.duration ? video.currentTime / video.duration : 0);
      requestAnimationFrame(draw);
    };
    const ended = new Promise<void>((resolve) => video.addEventListener("ended", () => resolve(), { once: true }));
    video.loop = false;
    await video.play();
    draw();
    await ended;
    stopped = true;
    for (const p of parts) drawSlot(p.ctx, frame, p.slot);
    for (const p of parts) p.recorder.stop();
    onProgress?.(1);
    const out = new Map<ArtworkSlot["id"], Blob>();
    for (const p of parts) out.set(p.slot.id, await p.done);
    return out;
  } finally {
    releaseVideo(video);
  }
}
