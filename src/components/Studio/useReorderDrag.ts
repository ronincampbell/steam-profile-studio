"use client";
/**
 * Drag-and-drop reordering for a list, with the browser's built-in drag and
 * drop (no library). Spread `handleProps(i)` on whatever you grab, and
 * `targetProps(i)` on each row; `dropAt` says where the dragged row would land
 * so the row can draw a line there.
 *
 * Built-in drag and drop doesn't work with touch on phones, so lists that use
 * this also have move up/down buttons.
 */
import { useState, type DragEvent } from "react";

export interface DropAt {
  index: number;
  /** Land before or after the row under the pointer. */
  side: "before" | "after";
}

const MIME = "application/x-showcase-index";

export function useReorderDrag(onMove: (from: number, to: number) => void) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);

  function end() {
    setDragging(null);
    setDropAt(null);
  }

  return {
    dragging,
    dropAt,
    /** `dragImage`: a CSS selector for the handle's ancestor to show while dragging (default: the handle). */
    handleProps(index: number, dragImage?: string) {
      return {
        draggable: true,
        onDragStart(e: DragEvent<HTMLElement>) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData(MIME, String(index));
          // Some browsers won't start a drag without a plain-text payload.
          e.dataTransfer.setData("text/plain", "");
          const img = dragImage ? e.currentTarget.closest(dragImage) : null;
          if (img) e.dataTransfer.setDragImage(img, 20, 20);
          setDragging(index);
        },
        onDragEnd: end,
      };
    },
    targetProps(index: number) {
      return {
        onDragOver(e: DragEvent<HTMLElement>) {
          if (dragging === null) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const side = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          if (dropAt?.index !== index || dropAt.side !== side) setDropAt({ index, side });
        },
        onDrop(e: DragEvent<HTMLElement>) {
          if (dragging === null || !dropAt) return;
          e.preventDefault();
          onMove(dragging, targetIndex(dragging, dropAt));
          end();
        },
      };
    },
  };
}

/** The index the dragged row ends up at, once it's taken out of the list. */
export function targetIndex(from: number, at: DropAt): number {
  const slot = at.side === "before" ? at.index : at.index + 1;
  return slot > from ? slot - 1 : slot;
}
