"use client";
/**
 * Shows the preview at Steam's real size (1:1 pixels) when there's room, and
 * shrinks it with CSS zoom on narrower screens so the whole header fits.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Studio.module.css";

/** Steam's profile column is 976px wide. Leave a little air either side. */
const NATURAL_WIDTH = 1000;

export function FitToWidth({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1, entry.contentRect.width / NATURAL_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.fit}>
      <div style={{ zoom, width: zoom < 1 ? NATURAL_WIDTH : undefined }}>{children}</div>
    </div>
  );
}
