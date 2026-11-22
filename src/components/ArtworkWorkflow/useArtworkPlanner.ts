"use client";
/**
 * State for the artwork planner: which layout, where the showcase sits, the
 * background pieces behind each slot, and any finished art dropped back in.
 *
 * The planner adds its own Artwork showcase to the preview. Its slot
 * positions come from src/lib/artwork/layouts.ts; only the vertical position
 * is read off the live preview, because it depends on the showcases above.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseItem } from "@/components/Showcases/Showcases";
import { NO_LINK } from "@/lib/studio/showcaseEditor";
import {
  FIRST_SHOWCASE_Y,
  SHOWCASE_AREA_Y,
  ARTWORK_IMAGE_OFFSET,
  LONG,
  STEAM_BG_WIDTH,
  artworkSlots,
  maxLongHeight,
  type ArtworkLayout,
  type ArtworkSlot,
} from "@/lib/artwork/layouts";
import {
  canvasToPng,
  cropToCanvas,
  displayHeight,
  frameOf,
  loadImage,
  loadVideo,
  releaseVideo,
  seek,
  type BackgroundFrame,
  type BackgroundSource,
} from "@/lib/artwork/crop";
import { matchFiles, type SlotMatch } from "@/lib/artwork/reimport";

export const PLANNER_ID = "artwork-planner";

export interface FinishedArt {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  url: string;
  /** Set when the app cut this piece out of a full-size picture, so it can be downloaded. */
  blob?: Blob;
}

export interface PlannerState {
  enabled: boolean;
  layout: ArtworkLayout;
  longHeight: number;
  /** 0 = first showcase. */
  position: number;
  outlines: boolean;
  /** Seconds into an animated background. */
  frameTime: number;
}

const INITIAL: PlannerState = {
  enabled: false,
  layout: "normal",
  longHeight: LONG.defaultHeight,
  position: 0,
  outlines: true,
  frameTime: 0,
};

/** A transparent pixel, so empty slots keep their size while pieces load. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function useArtworkPlanner(source: BackgroundSource | undefined) {
  const [state, setState] = useState<PlannerState>(INITIAL);
  const update = useCallback((change: Partial<PlannerState>) => setState((s) => ({ ...s, ...change })), []);

  // ---- The background, loaded once per URL ------------------------------
  const [frameInfo, setFrameInfo] = useState<{
    key: string;
    frame: BackgroundFrame;
    duration?: number;
    error?: undefined;
  } | { key: string; error: string; frame?: undefined; duration?: undefined } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceKey = source ? `${source.kind}:${source.url}` : "";

  useEffect(() => {
    if (!state.enabled || !source) return;
    let cancelled = false;
    (async () => {
      try {
        if (source.kind === "image") {
          const img = await loadImage(source.url);
          if (!cancelled) setFrameInfo({ key: sourceKey, frame: frameOf(img) });
        } else {
          const video = await loadVideo(source.url);
          if (cancelled) return releaseVideo(video);
          videoRef.current = video;
          setFrameInfo({ key: sourceKey, frame: frameOf(video), duration: video.duration });
        }
      } catch (e) {
        if (!cancelled) setFrameInfo({ key: sourceKey, error: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
      if (videoRef.current) {
        releaseVideo(videoRef.current);
        videoRef.current = null;
      }
    };
    // sourceKey stands for source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enabled, sourceKey]);

  const loaded = frameInfo && frameInfo.key === sourceKey ? frameInfo : null;
  const frame = loaded?.frame;
  const bgHeight = frame ? displayHeight(frame) : undefined;

  // ---- Where the showcase sits (measured from the preview) ---------------
  const [top, setTop] = useState(FIRST_SHOWCASE_Y);
  const measure = useCallback(() => {
    const area = document.querySelector<HTMLElement>('[data-testid="profile-preview"] [data-testid="showcases"]');
    const box = area?.querySelector<HTMLElement>(':scope > [data-source="planner"]');
    if (!area || !box) return;
    // How far the planner's showcase sits below the top of the showcase area
    // (which Steam always puts at background y 240), so the header can't skew
    // it. offsetTop is in the page's own CSS pixels, so the preview's zoom on
    // narrow screens doesn't round it off. Both share an offsetParent.
    if (box.offsetParent !== area.offsetParent) return;
    const y = Math.round(SHOWCASE_AREA_Y + box.offsetTop - area.offsetTop + ARTWORK_IMAGE_OFFSET);
    setTop((old) => (old === y ? old : y));
  }, []);

  useEffect(() => {
    if (!state.enabled) return;
    const page = document.querySelector<HTMLElement>('[data-testid="profile-preview"]');
    let raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (page) observer.observe(page);
    const area = page?.querySelector('[data-testid="showcases"]');
    if (area) observer.observe(area);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  });

  const maxHeight = maxLongHeight(top, bgHeight);
  const longHeight = Math.min(state.longHeight, Math.max(maxHeight, LONG.minHeight));
  const slots = useMemo(() => artworkSlots(state.layout, { top, longHeight }), [state.layout, top, longHeight]);

  // ---- The background pieces ---------------------------------------------
  const [pieces, setPieces] = useState<{ key: string; urls: Map<ArtworkSlot["id"], string>; blobs: Map<ArtworkSlot["id"], Blob> } | null>(null);
  const piecesKey = `${sourceKey}|${state.frameTime}|${slots.map((s) => `${s.id}:${s.x},${s.y},${s.width}x${s.height}`).join(";")}`;

  useEffect(() => {
    if (!state.enabled || !frame) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const video = videoRef.current;
      if (source?.kind === "video" && video) await seek(video, state.frameTime);
      if (cancelled) return;
      const blobs = new Map<ArtworkSlot["id"], Blob>();
      for (const slot of slots) blobs.set(slot.id, await canvasToPng(cropToCanvas(frame, slot)));
      if (cancelled) return;
      const urls = new Map([...blobs].map(([id, b]) => [id, URL.createObjectURL(b)] as const));
      setPieces((old) => {
        old?.urls.forEach((u) => URL.revokeObjectURL(u));
        return { key: piecesKey, urls, blobs };
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // piecesKey covers frame, slots and frameTime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enabled, piecesKey, frame]);

  // ---- Finished art, dropped back in -------------------------------------
  const [finished, setFinished] = useState<Map<ArtworkSlot["id"], FinishedArt>>(new Map());
  const [unmatched, setUnmatched] = useState<string[]>([]);
  /** Bumped to restart every GIF from its first frame. */
  const [restartKey, setRestartKey] = useState(0);

  async function addFinished(files: File[]) {
    const read = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        try {
          const img = await loadImage(url);
          const art = { name: file.name, type: file.type, size: file.size, width: img.naturalWidth, height: img.naturalHeight, url };
          // A whole 1920px-wide picture (the .psd template exported flat): cut it into the pieces.
          if (isFullSize(art, slots)) {
            URL.revokeObjectURL(url);
            return cutFullSize(img, file.name, slots);
          }
          return [art];
        } catch {
          URL.revokeObjectURL(url);
          return null;
        }
      }),
    );
    const ok = read.filter((f): f is FinishedArt[] => f !== null).flat();
    const bad = files.filter((_, i) => !read[i]).map((f) => `${f.name} (not an image this browser can open)`);
    const { matches, unmatched: left } = matchFiles(slots, ok);
    setFinished((old) => {
      const next = new Map(old);
      for (const m of matches) {
        const prev = next.get(m.slot.id);
        if (prev) URL.revokeObjectURL(prev.url);
        next.set(m.slot.id, m.file);
      }
      return next;
    });
    left.forEach((f) => URL.revokeObjectURL(f.url));
    setUnmatched([...bad, ...left.map((f) => `${f.name} (${f.width}×${f.height}: no slot that size, no 01_/02_ prefix, and not a whole 1920px-wide picture)`)]);
    setRestartKey((k) => k + 1);
  }

  function clearFinished() {
    finished.forEach((f) => URL.revokeObjectURL(f.url));
    setFinished(new Map());
    setUnmatched([]);
  }

  // Free object URLs when the page goes away.
  const latest = useRef({ pieces, finished });
  useEffect(() => {
    latest.current = { pieces, finished };
  }, [pieces, finished]);
  useEffect(
    () => () => {
      latest.current.pieces?.urls.forEach((u) => URL.revokeObjectURL(u));
      latest.current.finished.forEach((f) => URL.revokeObjectURL(f.url));
    },
    [],
  );

  const checks: SlotMatch<FinishedArt>[] = useMemo(
    () =>
      slots.flatMap((slot) => {
        const file = finished.get(slot.id);
        return file ? matchFiles([slot], [file]).matches : [];
      }),
    [slots, finished],
  );

  // ---- The showcase drawn in the preview ---------------------------------
  // Keep showing the last pieces while new ones are cut.
  const currentPieces = pieces;
  const imageFor = (id: ArtworkSlot["id"]) => {
    const art = finished.get(id);
    if (art) return `${art.url}#${restartKey}`;
    return currentPieces?.urls.get(id) ?? BLANK;
  };

  const showcaseItem: ShowcaseItem | null = state.enabled
    ? {
        id: PLANNER_ID,
        source: "planner",
        outlineImages: state.outlines,
        showcase: {
          kind: "artwork",
          title: "Artwork Showcase",
          mode: state.layout,
          primary: { href: NO_LINK, image: imageFor("main"), name: "_" },
          small: slots.filter((s) => s.id !== "main").map((s) => ({ href: NO_LINK, image: imageFor(s.id) })),
        },
      }
    : null;

  /**
   * The showcases to draw, with the planner's showcase at its position. It
   * takes the place of the profile's own Artwork showcase: Steam only allows
   * one of each showcase type.
   */
  function withPlanner(items: ShowcaseItem[]): ShowcaseItem[] {
    if (!showcaseItem) return items;
    const others = otherShowcases(items);
    const at = Math.min(state.position, others.length);
    return [...others.slice(0, at), showcaseItem, ...others.slice(at)];
  }

  return {
    state,
    update,
    slots,
    top,
    maxHeight,
    longHeight,
    bgHeight,
    frame,
    duration: loaded?.duration,
    loadError: loaded?.error,
    loading: state.enabled && Boolean(source) && !loaded,
    pieces: currentPieces?.key === piecesKey ? currentPieces.blobs : undefined,
    finished,
    checks,
    unmatched,
    addFinished,
    clearFinished,
    restartGifs: () => setRestartKey((k) => k + 1),
    withPlanner,
  };
}

export type ArtworkPlanner = ReturnType<typeof useArtworkPlanner>;

/** A picture as wide as Steam draws the background and tall enough to cover every slot. */
export function isFullSize(file: { width: number; height: number }, slots: ArtworkSlot[]): boolean {
  return file.width === STEAM_BG_WIDTH && file.height >= Math.max(...slots.map((s) => s.y + s.height));
}

/** Cut a full-size picture into one PNG per slot, named like the exported pieces. */
async function cutFullSize(img: HTMLImageElement, sourceName: string, slots: ArtworkSlot[]): Promise<FinishedArt[]> {
  const frame = frameOf(img);
  return Promise.all(
    slots.map(async (slot) => {
      const blob = await canvasToPng(cropToCanvas(frame, slot));
      return {
        name: `${slot.fileName} (cut from ${sourceName})`,
        type: "image/png",
        size: blob.size,
        width: slot.width,
        height: slot.height,
        url: URL.createObjectURL(blob),
        blob,
      };
    }),
  );
}

/** The showcases the planner's Artwork showcase sits among (any other Artwork showcase makes way for it). */
export function otherShowcases(items: ShowcaseItem[]): ShowcaseItem[] {
  return items.filter((i) => i.showcase.kind !== "artwork");
}
