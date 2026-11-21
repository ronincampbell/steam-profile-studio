"use client";
/**
 * Pieces every layout shares: the panel frame (title, hint, close) and a
 * stack that keeps panels you've opened alive while hidden, so a search you
 * typed or items you scrolled to are still there when you come back.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icons";
import { MENU_BY_ID, type PanelId } from "./menu";
import styles from "./Chrome.module.css";

export interface LayoutProps {
  form: import("./SiteHeader").ProfileFormProps;
  renderPanel: (id: PanelId) => ReactNode;
  preview: ReactNode;
  notices: ReactNode;
  /** Who's on the preview, for the toolbar's "Previewing" line. */
  subject: { name: string; avatar: string } | null;
  /** A small number on a menu entry, e.g. how many slots you're trying things on in. */
  badges: Partial<Record<PanelId, number>>;
}

export function Count({ n }: { n: number | undefined }) {
  if (!n) return null;
  return (
    <span className={styles.count} aria-label={`${n} changed`}>
      {n}
    </span>
  );
}

export function PanelStack({ active, renderPanel }: { active: PanelId | null; renderPanel: (id: PanelId) => ReactNode }) {
  const [opened, setOpened] = useState<PanelId[]>([]);
  if (active && !opened.includes(active)) setOpened([...opened, active]);
  return (
    <>
      {opened.map((id) => (
        <div key={id} hidden={id !== active} className={styles.panelBody}>
          {renderPanel(id)}
        </div>
      ))}
    </>
  );
}

export function PanelHead({ id, onClose, extra }: { id: PanelId; onClose: () => void; extra?: ReactNode }) {
  const entry = MENU_BY_ID[id];
  return (
    <div className={styles.panelHead}>
      <span className={styles.panelIcon}>
        <Icon name={entry.icon} size={18} />
      </span>
      <div className={styles.panelTitles}>
        <h2 className={styles.panelTitle}>{entry.label}</h2>
        <p className={styles.panelHint}>{entry.hint}</p>
      </div>
      {extra}
      <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close panel">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

/** Close on Escape. */
export function useEscape(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape, enabled]);
}
