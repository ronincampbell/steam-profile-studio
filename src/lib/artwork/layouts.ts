/**
 * Where Steam's Artwork showcase puts each image, so a background can be cut
 * into pieces that line up with it.
 *
 * All numbers come from reference/ARTWORK_WORKFLOW.md §3–4 (measured with
 * Steam's own CSS). Coordinates are in pixels of a 1920px-wide background,
 * for a browser window 910–1920px wide, where Steam draws both the background
 * and the 976px profile column centred and at 1:1.
 *
 * Steam's layout drifts over the years (Ronin's 2021 tiles sit 12px right of
 * today's slots), so keep every number in this one file.
 */

export type ArtworkLayout = "normal" | "long";

/** One image slot in the showcase. */
export interface ArtworkSlot {
  id: "main" | "tile1" | "tile2" | "tile3" | "side";
  /** Shown in the app and the guide. */
  label: string;
  /** File name in the download, e.g. 01_main_480x480.png. */
  fileName: string;
  /** Left edge, in background pixels (1920-wide background). */
  x: number;
  /** Top edge, in background pixels. */
  y: number;
  width: number;
  height: number;
}

/** Steam draws profile backgrounds 1920px wide at most window sizes. */
export const STEAM_BG_WIDTH = 1920;
/** Every Points Shop background sampled is 1920×1080. */
export const STEAM_BG_HEIGHT = 1080;

/** Top of the showcase area (Steam's 224px header + 16px), in background pixels. */
export const SHOWCASE_AREA_Y = 240;

/** From the top of the Artwork showcase box to its images: 15px padding + 1px border. */
export const ARTWORK_IMAGE_OFFSET = 16;

/** Top of the big image when the Artwork showcase is the first showcase. */
export const FIRST_SHOWCASE_Y = SHOWCASE_AREA_Y + ARTWORK_IMAGE_OFFSET; // 256

/** Normal mode: the big image is fitted into a 480×480 box, tiles into 100×80. */
export const NORMAL = {
  main: { x: 508, width: 480, height: 480 },
  tile: { x: 1010, width: 100, height: 80 },
  /** 80px tile + 2px border + 11px margin. */
  tileStep: 93,
  tiles: 3,
} as const;

/** Long mode: images keep their height, 506px and 100px wide. */
export const LONG = {
  main: { x: 495, width: 506 },
  side: { x: 1010, width: 100 },
  minHeight: 80,
  defaultHeight: 824,
} as const;

/** Steam's artwork upload limit (confirmed by a test upload, 22 Nov 2026). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The tallest long image that stays on the background. */
export function maxLongHeight(top: number, bgHeight = STEAM_BG_HEIGHT): number {
  return Math.max(LONG.minHeight, Math.round(bgHeight - top));
}

/**
 * The slots for a layout, with the big image's top edge at `top`
 * (FIRST_SHOWCASE_Y when the showcase is first on the profile).
 */
export function artworkSlots(
  layout: ArtworkLayout,
  { top = FIRST_SHOWCASE_Y, longHeight = LONG.defaultHeight }: { top?: number; longHeight?: number } = {},
): ArtworkSlot[] {
  const y = Math.round(top);
  if (layout === "long") {
    const h = Math.max(LONG.minHeight, Math.round(longHeight));
    return [
      slot("main", "Big image", 1, LONG.main.x, y, LONG.main.width, h),
      slot("side", "Side strip", 2, LONG.side.x, y, LONG.side.width, h),
    ];
  }
  const slots = [slot("main", "Big image", 1, NORMAL.main.x, y, NORMAL.main.width, NORMAL.main.height)];
  for (let i = 0; i < NORMAL.tiles; i++) {
    const id = `tile${i + 1}` as ArtworkSlot["id"];
    slots.push(
      slot(id, `Small tile ${i + 1}`, i + 2, NORMAL.tile.x, y + i * NORMAL.tileStep, NORMAL.tile.width, NORMAL.tile.height),
    );
  }
  return slots;
}

function slot(id: ArtworkSlot["id"], label: string, n: number, x: number, y: number, width: number, height: number): ArtworkSlot {
  return { id, label, fileName: `${String(n).padStart(2, "0")}_${id}_${width}x${height}.png`, x, y, width, height };
}

/**
 * Where a slot falls on the actual background image. Steam centres the
 * background, so a background that isn't 1920px wide shifts sideways; one
 * that the preview draws at another size scales too.
 *
 * @param displayWidth how wide the background is drawn (1920 on Steam)
 * @param natural the image's own pixel size
 */
export function slotOnImage(
  s: Pick<ArtworkSlot, "x" | "y" | "width" | "height">,
  displayWidth: number,
  natural: { width: number; height: number },
) {
  const scale = natural.width / displayWidth;
  const left = (STEAM_BG_WIDTH - displayWidth) / 2;
  return {
    sx: (s.x - left) * scale,
    sy: s.y * scale,
    sw: s.width * scale,
    sh: s.height * scale,
  };
}

/** How much of a slot runs past the bottom of the background (0 if none). */
export function overflowBelow(s: Pick<ArtworkSlot, "y" | "height">, bgHeight = STEAM_BG_HEIGHT): number {
  return Math.max(0, s.y + s.height - bgHeight);
}
