"use client";
/**
 * Layout C, "dock": a floating dock at the bottom of the window, like an app
 * launcher. Each icon raises a sheet over the lower part of the page, which
 * leaves the profile's header (avatar, frame, name, background) in view.
 */
import { useCallback, useState } from "react";
import { Icon } from "./Icons";
import { MENU, type PanelId } from "./menu";
import { Count, PanelHead, PanelStack, useEscape, type LayoutProps } from "./Panels";
import { SiteHeader } from "./SiteHeader";
import styles from "./Chrome.module.css";

export function DockLayout({ form, renderPanel, preview, notices, badges }: LayoutProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const close = useCallback(() => setActive(null), []);
  useEscape(close, active !== null);

  return (
    <>
      <SiteHeader form={form} />
      {preview}
      <section className={`${styles.sheet} ${active ? styles.sheetOpen : ""}`} inert={!active} aria-label="Studio panel">
        {active && <PanelHead id={active} onClose={close} />}
        <PanelStack active={active} renderPanel={renderPanel} />
      </section>
      <nav className={styles.dock} aria-label="Studio tools">
        {MENU.map((m, i) => (
          <span key={m.id} className={styles.dockItem}>
            {i > 0 && MENU[i - 1].group !== m.group && <span className={styles.dockRule} />}
            <button
              type="button"
              className={styles.dockButton}
              aria-pressed={active === m.id}
              onClick={() => setActive(active === m.id ? null : m.id)}
            >
              <span className={styles.dockIcon}>
                <Icon name={m.icon} size={22} />
              </span>
              <span className={styles.dockLabel}>{m.short}</span>
              <Count n={badges[m.id]} />
            </button>
          </span>
        ))}
      </nav>
      <div className={`${styles.toasts} ${styles.toastsHigh}`}>{notices}</div>
    </>
  );
}
