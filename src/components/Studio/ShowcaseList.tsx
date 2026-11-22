"use client";
/**
 * The Showcases panel: the preview's showcases as a list you can drag to
 * reorder, remove from, or add any of Steam's 24 showcase types to.
 */
import { SHOWCASE_TYPES } from "@/lib/studio/showcaseCatalog";
import type { EditorShowcase, ShowcaseSource } from "@/lib/studio/showcaseEditor";
import { useReorderDrag } from "./useReorderDrag";
import styles from "./Studio.module.css";

/** Only sample content is marked: the profile's own showcases need no label. */
const SOURCE_LABEL: Record<ShowcaseSource, string> = {
  profile: "",
  sample: "Sample",
  placeholder: "",
};

/**
 * The types you can add: only ones Steam still offers and the preview can
 * draw. Retired types (Greenlight, Saliens) still show if a profile has them.
 */
const ADDABLE = SHOWCASE_TYPES.filter((t) => t.kind && !t.retired);

interface Props {
  list: EditorShowcase[];
  edited: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onAdd: (type: number) => void;
  onReset: () => void;
}

export function ShowcaseList({ list, edited, onMove, onRemove, onAdd, onReset }: Props) {
  const drag = useReorderDrag(onMove);

  return (
    <section className={styles.showcasePanel} aria-label="Showcases">
      {edited && (
        <div className={styles.showcasePanelHead}>
          <button type="button" className={styles.linkButton} onClick={onReset}>
            Reset to profile
          </button>
        </div>
      )}

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
                <span className={styles.slotSource}>{SOURCE_LABEL[item.source]}</span>
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

      <div className={styles.custom}>
        <label className={styles.srOnly} htmlFor="add-showcase">
          Add a showcase
        </label>
        {/* Adds on pick, then resets to the prompt so the same type can be added again. */}
        <select
          id="add-showcase"
          className={styles.select}
          value=""
          onChange={(e) => e.target.value && onAdd(Number(e.target.value))}
        >
          <option value="">Add a showcase…</option>
          {ADDABLE.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
