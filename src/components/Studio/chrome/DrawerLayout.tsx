"use client";
/**
 * Layout A, "side drawer": a slim rail of icons floats on the right edge, over
 * the background art. Hover an icon and its panel slides out beside the rail;
 * move away and it tucks back in. Click an icon to pin the panel open.
 */
import { useCallback, useRef, useState } from "react";
import { Icon } from "./Icons";
import { MENU, type PanelId } from "./menu";
import { Count, PanelHead, PanelStack, useEscape, type LayoutProps } from "./Panels";
import { SiteHeader } from "./SiteHeader";
import styles from "./Chrome.module.css";

const OPEN_DELAY = 120;
const CLOSE_DELAY = 350;

export function DrawerLayout({ form, renderPanel, preview, notices, badges }: LayoutProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => {
    setActive(null);
    setPinned(false);
  }, []);
  useEscape(close, active !== null);

  function later(fn: () => void, ms: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }

  return (
    <>
      <SiteHeader form={form} />
      {preview}
      <div
        className={`${styles.drawer} ${active ? styles.drawerOpen : ""}`}
        onMouseEnter={() => clearTimeout(timer.current)}
        onMouseLeave={() => !pinned && later(() => setActive(null), CLOSE_DELAY)}
      >
        <nav className={styles.rail} aria-label="Studio tools">
          {MENU.map((m, i) => (
            <div key={m.id} className={styles.railItem}>
              {i > 0 && MENU[i - 1].group !== m.group && <span className={styles.railRule} />}
              <button
                type="button"
                className={styles.railButton}
                aria-pressed={active === m.id}
                aria-label={m.label}
                onMouseEnter={() => !pinned && later(() => setActive(m.id), active ? 0 : OPEN_DELAY)}
                onClick={() => {
                  if (active === m.id && pinned) return close();
                  setActive(m.id);
                  setPinned(true);
                }}
              >
                <Icon name={m.icon} size={22} />
                <span className={styles.railTip}>{m.label}</span>
                <Count n={badges[m.id]} />
              </button>
            </div>
          ))}
        </nav>
        <aside className={styles.drawerPanel} aria-hidden={!active} inert={!active}>
          {active && (
            <PanelHead
              id={active}
              onClose={close}
              extra={
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-pressed={pinned}
                  onClick={() => setPinned(!pinned)}
                  aria-label={pinned ? "Unpin panel" : "Keep panel open"}
                  title={pinned ? "Unpin: close when the mouse leaves" : "Keep open"}
                >
                  <Icon name="pin" size={18} />
                </button>
              }
            />
          )}
          <PanelStack active={active} renderPanel={renderPanel} />
        </aside>
      </div>
      <div className={styles.toasts}>{notices}</div>
    </>
  );
}
