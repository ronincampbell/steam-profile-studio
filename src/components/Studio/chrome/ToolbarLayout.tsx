"use client";
/**
 * Layout B, "toolbar": a two-row header that stays at the top as you scroll.
 * The second row is the menu; each button drops a panel down from the right,
 * so the avatar and name on the left stay in view while you try things on.
 */
/* eslint-disable @next/next/no-img-element -- Steam avatar */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { MENU, type PanelId } from "./menu";
import { Count, PanelHead, PanelStack, useEscape, type LayoutProps } from "./Panels";
import { SiteHeader } from "./SiteHeader";
import styles from "./Chrome.module.css";

export function ToolbarLayout({ form, renderPanel, preview, notices, badges, subject }: LayoutProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const close = useCallback(() => setActive(null), []);
  useEscape(close, active !== null);
  const zone = useRef<HTMLDivElement>(null);

  // Click anywhere outside the header and panel to close it.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setActive(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [active]);

  const menu = (
    <div className={styles.toolRow}>
      <div className={styles.subject}>
        {subject ? (
          <>
            <img src={subject.avatar} alt="" width={22} height={22} />
            <span>
              Previewing <strong>{subject.name}</strong>
            </span>
            {subject.level !== null && <span className={styles.levelChip}>Lv {subject.level}</span>}
          </>
        ) : (
          <span>Previewing a blank profile</span>
        )}
      </div>
      <nav className={styles.tools} aria-label="Studio tools">
        {MENU.map((m, i) => (
          <span key={m.id} className={styles.toolItem}>
            {i > 0 && MENU[i - 1].group !== m.group && <span className={styles.toolRule} />}
            <button
              type="button"
              className={styles.toolButton}
              aria-expanded={active === m.id}
              title={m.label}
              onClick={() => setActive(active === m.id ? null : m.id)}
            >
              <Icon name={m.icon} size={17} />
              {m.label}
              <Count n={badges[m.id]} />
            </button>
          </span>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <div ref={zone} className={styles.toolbarZone}>
        <SiteHeader form={form} below={menu} sticky />
        <div className={`${styles.dropPanel} ${active ? styles.dropOpen : ""}`} inert={!active}>
          {active && <PanelHead id={active} onClose={close} />}
          <PanelStack active={active} renderPanel={renderPanel} />
        </div>
      </div>
      {preview}
      <div className={styles.toasts}>{notices}</div>
    </>
  );
}
