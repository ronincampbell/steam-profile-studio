/**
 * Put finished artwork back in its slots: match each dropped file to a slot,
 * and check it will look right once it's on Steam.
 */
import { MAX_UPLOAD_BYTES, type ArtworkSlot } from "./layouts";

export interface DroppedFile {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
}

export interface SlotMatch<F extends DroppedFile = DroppedFile> {
  slot: ArtworkSlot;
  file: F;
  problems: string[];
}

const ACCEPTED = ["image/png", "image/jpeg", "image/gif"];

/**
 * Match files to slots. A file name's 01_/02_ prefix (or the slot's id, like
 * "tile2" or "side") wins; otherwise a file whose size fits exactly one
 * empty slot goes there. Files that can't be placed come back in `unmatched`.
 */
export function matchFiles<F extends DroppedFile>(slots: ArtworkSlot[], files: F[]) {
  const matched = new Map<ArtworkSlot["id"], F>();
  const left: F[] = [];
  for (const file of files) {
    const slot = byName(slots, file.name);
    if (slot && !matched.has(slot.id)) matched.set(slot.id, file);
    else left.push(file);
  }
  const unmatched: F[] = [];
  for (const file of left) {
    const fits = slots.filter((s) => !matched.has(s.id) && s.width === file.width && s.height === file.height);
    if (fits.length >= 1) matched.set(fits[0].id, file);
    else unmatched.push(file);
  }
  const matches: SlotMatch<F>[] = slots
    .filter((s) => matched.has(s.id))
    .map((slot) => {
      const file = matched.get(slot.id)!;
      return { slot, file, problems: checkFile(slot, file) };
    });
  return { matches, unmatched };
}

function byName(slots: ArtworkSlot[], name: string): ArtworkSlot | undefined {
  const lower = name.toLowerCase();
  const prefix = /^(\d{1,2})[_\-\s.]/.exec(lower);
  if (prefix) {
    const n = Number(prefix[1]);
    if (n >= 1 && n <= slots.length) return slots[n - 1];
  }
  return slots.find((s) => new RegExp(`(^|[^a-z])${s.id}([^a-z0-9]|$)`).test(lower));
}

/** What would go wrong on Steam with this file in this slot. */
export function checkFile(slot: ArtworkSlot, file: DroppedFile): string[] {
  const problems: string[] = [];
  if (file.width !== slot.width || file.height !== slot.height) {
    const sameShape = Math.abs(file.width / file.height - slot.width / slot.height) < 0.01;
    problems.push(
      `It's ${file.width}×${file.height}, but this slot is ${slot.width}×${slot.height}. Steam will ${
        sameShape ? "resize it" : "add black bars"
      } and re-save it as a JPEG, so it won't line up pixel for pixel.`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    problems.push(`It's ${(file.size / 1024 / 1024).toFixed(1)} MB. Steam reportedly refuses artwork over 5 MB.`);
  }
  if (file.type && !ACCEPTED.includes(file.type)) {
    problems.push(`Steam takes PNG, JPG or GIF artwork, not ${file.type.replace("image/", "").toUpperCase() || "this file type"}.`);
  }
  return problems;
}
