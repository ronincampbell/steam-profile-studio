"use client";
/**
 * The "Your own art" panel: your own avatar, and your own pictures in the
 * Artwork showcase, previewed over the background you've picked. Both are
 * things Steam lets you upload; a custom background isn't, so there's no
 * slot for one.
 *
 * Files never leave the browser: each one becomes an object URL (a `blob:`
 * link to the file in memory) that only this tab can see. The Artwork
 * pictures go into the artwork planner's showcase (useArtworkPlanner), so
 * they share its layout, position and slot sizes with the Artwork panel.
 */
import { useEffect, useRef } from "react";
import type { ArtworkPlanner } from "@/components/ArtworkWorkflow/useArtworkPlanner";
import type { CustomArt } from "@/lib/studio/look";
import styles from "./Studio.module.css";

const AVATAR_TYPES = "image/png,image/jpeg,image/gif,image/webp";
/** What Steam takes for artwork. */
const ARTWORK_TYPES = "image/png,image/jpeg,image/gif";

interface Props {
  custom: CustomArt;
  onChange: (next: CustomArt) => void;
  planner: ArtworkPlanner;
}

export function YourArtPanel({ custom, onChange, planner }: Props) {
  // Free the memory behind avatar URLs we no longer show.
  const latest = useRef(custom);
  useEffect(() => {
    const prev = latest.current;
    if (prev.avatar && prev.avatar !== custom.avatar) URL.revokeObjectURL(prev.avatar);
    latest.current = custom;
  }, [custom]);
  useEffect(
    () => () => {
      if (latest.current.avatar) URL.revokeObjectURL(latest.current.avatar);
    },
    [],
  );

  const { state, update, slots, finished } = planner;
  // Whether this panel put the Artwork showcase on the preview, so clearing
  // the last picture here takes it off again (but never one the Artwork
  // panel started).
  const showcaseIsOurs = useRef(false);
  useEffect(() => {
    if (!state.enabled) showcaseIsOurs.current = false;
  }, [state.enabled]);

  async function pickSlot(id: (typeof slots)[number]["id"], file: File | undefined) {
    if (!file) return;
    const ok = await planner.setSlotArt(id, file);
    if (ok && !state.enabled) {
      showcaseIsOurs.current = true;
      update({ enabled: true, outlines: false });
    }
  }

  function clearSlot(id: (typeof slots)[number]["id"]) {
    planner.clearSlot(id);
    const left = slots.filter((s) => s.id !== id && finished.has(s.id)).length;
    if (left === 0 && showcaseIsOurs.current) update({ enabled: false });
  }

  return (
    <div className={styles.yourArt}>
      <div className={styles.artSlot}>
        <span className={styles.yourArtHead}>Avatar</span>
        <span className={styles.customNote}>184×184</span>
        <span />
        <FileButton
          label={custom.avatar ? "Change" : "Choose"}
          accept={AVATAR_TYPES}
          onPick={(file) => file && onChange({ ...custom, avatar: URL.createObjectURL(file) })}
        />
        {custom.avatar && (
          <button className={styles.linkButton} onClick={() => onChange({ ...custom, avatar: undefined })}>
            Clear
          </button>
        )}
      </div>

      <div className={styles.yourArtShowcase}>
        <div className={styles.artShowcaseHead}>
          <span className={styles.yourArtHead}>Artwork showcase</span>
          <span className={styles.segmented} role="radiogroup" aria-label="Layout">
            <button role="radio" aria-checked={state.layout === "normal"} onClick={() => update({ layout: "normal" })}>
              Big + 3 tiles
            </button>
            <button role="radio" aria-checked={state.layout === "long"} onClick={() => update({ layout: "long" })}>
              Long
            </button>
          </span>
        </div>
        <ul className={styles.artSlots}>
          {slots.map((s) => {
            const art = finished.get(s.id);
            return (
              <li key={s.id} className={styles.artSlot}>
                <span className={styles.artSlotLabel}>{s.label}</span>
                <span className={styles.customNote}>{state.layout === "long" ? `${s.width} wide` : `${s.width}×${s.height}`}</span>
                <span className={styles.artSlotFile} title={art?.name}>
                  {art?.name}
                </span>
                <FileButton label={art ? "Change" : "Choose"} accept={ARTWORK_TYPES} onPick={(f) => pickSlot(s.id, f)} />
                {art && (
                  <button className={styles.linkButton} onClick={() => clearSlot(s.id)}>
                    Clear
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function FileButton({ label, accept, onPick }: { label: string; accept: string; onPick: (f: File | undefined) => void }) {
  return (
    <label className={styles.fileButton}>
      {label}
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = ""; // allow picking the same file again
        }}
      />
    </label>
  );
}
