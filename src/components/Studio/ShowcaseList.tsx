"use client";
/**
 * The Showcases panel: the preview's showcases as a list you can drag to
 * reorder, remove from, or add any of Steam's 24 showcase types to.
 */
import { useState } from "react";
import type { Showcase } from "@/lib/steam/showcases/types";
import { SHOWCASE_TYPES } from "@/lib/studio/showcaseCatalog";
import type { EditorShowcase, ShowcaseSource } from "@/lib/studio/showcaseEditor";
import { useReorderDrag } from "./useReorderDrag";
import styles from "./Studio.module.css";

const SOURCE_LABEL: Record<ShowcaseSource, string> = {
  profile: "your data",
  sample: "sample content",
  placeholder: "placeholder",
};

const SOURCE_HINT: Record<ShowcaseSource, string> = {
  profile: "Drawn from this profile's real showcase.",
  sample: "Steam's real layout, with sample content: this profile doesn't have this showcase.",
  placeholder: "Steam's layout for this showcase hasn't been captured yet, so it's a marked box.",
};

interface Props {
  list: EditorShowcase[];
  /** The profile's own showcases, to say which types it has. */
  profileShowcases: Showcase[];
  edited: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onAdd: (type: number) => void;
  onReset: () => void;
}

export function ShowcaseList({ list, profileShowcases, edited, onMove, onRemove, onAdd, onReset }: Props) {
  const drag = useReorderDrag(onMove);
  const [pick, setPick] = useState("");
  const kinds = new Set(profileShowcases.map((s) => s.kind));

  return (
    <section className={styles.showcasePanel} aria-label="Showcases">
      <div className={styles.showcasePanelHead}>
        <span className={styles.customTitle}>Showcases</span>
        <span className={styles.customNote}>
          Drag to reorder, here or on the preview. Changes stay in this browser tab only.
        </span>
        {edited && (
          <button type="button" className={styles.linkButton} onClick={onReset}>
            Reset to profile
          </button>
        )}
      </div>

      {list.length > 0 && (
        <ol className={styles.slots}>
          {list.map((item, i) => {
            const drop = drag.dropAt?.index === i ? drag.dropAt.side : undefined;
            return (
              <li
                key={item.id}
                className={[
                  styles.slot,
                  styles.showcaseRow,
                  drag.dragging === i ? styles.rowDragging : "",
                  drop === "before" ? styles.rowDropBefore : "",
                  drop === "after" ? styles.rowDropAfter : "",
                ].join(" ")}
                {...drag.targetProps(i)}
              >
                <span className={styles.rowHandle} title="Drag to reorder" aria-hidden {...drag.handleProps(i)}>
                  ⠿
                </span>
                <span className={styles.slotName} title={item.showcase.title}>
                  {item.showcase.title}
                </span>
                <span className={styles.slotSource} title={SOURCE_HINT[item.source]}>
                  {SOURCE_LABEL[item.source]}
                </span>
                <span className={styles.slotActions}>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => onMove(i, i - 1)}
                    aria-label={`Move ${item.showcase.title} up`}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={i === list.length - 1}
                    onClick={() => onMove(i, i + 1)}
                    aria-label={`Move ${item.showcase.title} down`}
                  >
                    Down
                  </button>
                  <button type="button" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <form
        className={styles.custom}
        onSubmit={(e) => {
          e.preventDefault();
          if (!pick) return;
          onAdd(Number(pick));
          setPick("");
        }}
      >
        <label className={styles.srOnly} htmlFor="add-showcase">
          Add a showcase
        </label>
        <select id="add-showcase" className={styles.select} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Add a showcase…</option>
          <optgroup label="Drawn like Steam">
            {SHOWCASE_TYPES.filter((t) => t.kind).map((t) => (
              <option key={t.type} value={t.type}>
                {t.label} {kinds.has(t.kind!) ? "(your data)" : "(sample content)"}
              </option>
            ))}
          </optgroup>
          <optgroup label="Placeholder (Steam's layout not captured yet)">
            {SHOWCASE_TYPES.filter((t) => !t.kind).map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
                {t.retired ? " (retired by Steam)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
        <button type="submit" className={styles.fileButton} disabled={!pick}>
          Add
        </button>
        <span className={styles.customNote}>New showcases go at the top.</span>
      </form>
    </section>
  );
}
