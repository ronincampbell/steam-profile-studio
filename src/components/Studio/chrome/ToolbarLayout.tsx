"use client";
/**
 * The app's layout: a two-row header that stays at the top as you scroll.
 * The second row is the menu. Each button opens a panel just under itself,
 * with a little pointer at the button, so it's clear which one it belongs to.
 * Panels start at the button's left edge and grow to the right, which keeps
 * the avatar and name (on the left of the profile) in view while you try
 * things on. Near the right edge they're pushed back on-screen.
 */
/* eslint-disable @next/next/no-img-element -- Steam avatar */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { anchorFor, type Anchor } from "./anchor";
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
  const buttons = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({});
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // Slide between buttons only when switching from one open panel to another,
  // not when a panel first opens.
  const [sliding, setSliding] = useState(false);

  // Click anywhere outside the header and panel to close it.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setActive(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [active]);

  // Put the panel under the open button, and keep it there as the window changes size.
  useLayoutEffect(() => {
    if (!active) return;
    const place = () => {
      const button = buttons.current[active];
      if (!button) return;
      setAnchor(anchorFor(button.getBoundingClientRect(), document.documentElement.clientWidth));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, badges]);

  function toggle(id: PanelId) {
    setSliding(active !== null && active !== id);
    setActive(active === id ? null : id);
  }

  const subjectLine = subject ? (
    <>
      <img src={subject.avatar} alt="" width={22} height={22} />
      <span>
        Previewing <strong>{subject.name}</strong>
      </span>
    </>
  ) : (
    <span>Previewing a blank profile</span>
  );

  const tools = (
    <nav className={styles.tools} aria-label="Studio tools">
      {MENU.map((m, i) => (
        <span key={m.id} className={styles.toolItem}>
          {i > 0 && MENU[i - 1].group !== m.group && <span className={styles.toolRule} />}
          <button
            ref={(el) => {
              buttons.current[m.id] = el;
            }}
            type="button"
            className={styles.toolButton}
            aria-expanded={active === m.id}
            title={m.label}
            onClick={() => toggle(m.id)}
          >
            <Icon name={m.icon} size={17} />
            {m.label}
            <Count n={badges[m.id]} />
          </button>
        </span>
      ))}
    </nav>
  );

  const open = active !== null && anchor !== null;
  const style = anchor ? ({ "--drop-left": `${anchor.left}px`, "--caret-x": `${anchor.caret}px` } as CSSProperties) : undefined;

  return (
    <>
      <div ref={zone} className={styles.toolbarZone}>
        <SiteHeader form={form} subject={subjectLine} tools={tools} />
        <div
          className={`${styles.dropPanel} ${open ? styles.dropOpen : ""} ${sliding ? styles.dropSliding : ""}`}
          style={style}
          inert={!open}
        >
          <span className={styles.caret} aria-hidden />
          {active && <PanelHead id={active} onClose={close} />}
          <PanelStack active={active} renderPanel={renderPanel} />
        </div>
      </div>
      {preview}
      <div className={styles.toasts}>{notices}</div>
    </>
  );
}
