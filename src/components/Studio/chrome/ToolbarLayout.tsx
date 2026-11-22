"use client";
/**
 * The app's layout: a two-row header that stays at the top as you scroll.
 * The second row is the menu. Each button opens a panel just under itself,
 * with a little pointer at the button, so it's clear which one it belongs to.
 * Panels start at the button's left edge and grow to the right, which keeps
 * the avatar and name (on the left of the profile) in view while you try
 * things on. Near the right edge they're pushed back on-screen.
 *
 * The buttons show their names whenever the names fit in the header, and
 * only their icons when they don't. That's measured, not set by screen
 * width, so a wider font (Linux fallbacks, say) drops to icons in time
 * instead of running off the edge.
 */
/* eslint-disable @next/next/no-img-element -- Steam avatar */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { anchorFor, type Anchor } from "./anchor";
import { Icon } from "./Icons";
import { MENU, type PanelId } from "./menu";
import {
  Count,
  PanelHead,
  PanelStack,
  useEscape,
  type LayoutProps,
} from "./Panels";
import { SiteHeader } from "./SiteHeader";
import styles from "./Chrome.module.css";

export function ToolbarLayout({
  form,
  renderPanel,
  preview,
  notices,
  badges,
  subject,
}: LayoutProps) {
  const [active, setActive] = useState<PanelId | null>(null);
  const close = useCallback(() => setActive(null), []);
  useEscape(close, active !== null);
  const zone = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>(
    {},
  );
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // Slide between buttons only when switching from one open panel to another,
  // not when a panel first opens.
  const [sliding, setSliding] = useState(false);

  // Click anywhere outside the header and panel to close it.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node))
        setActive(null);
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
      setAnchor(
        anchorFor(
          button.getBoundingClientRect(),
          document.documentElement.clientWidth,
        ),
      );
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

  const { navRef, measureRef, iconsOnly } = useIconsOnly();

  const toolButtons = (live: boolean) =>
    MENU.map((m, i) => (
      <span key={m.id} className={styles.toolItem}>
        {i > 0 && MENU[i - 1].group !== m.group && (
          <span className={styles.toolRule} />
        )}
        <button
          ref={
            live
              ? (el) => {
                  buttons.current[m.id] = el;
                }
              : undefined
          }
          type="button"
          className={styles.toolButton}
          aria-expanded={live ? active === m.id : undefined}
          title={m.label}
          tabIndex={live ? undefined : -1}
          onClick={live ? () => toggle(m.id) : undefined}
        >
          <Icon name={m.icon} size={17} />
          <span className={styles.toolLabel}>{m.short}</span>
          <Count n={badges[m.id]} />
        </button>
      </span>
    ));

  const tools = (
    <>
      <nav
        ref={navRef}
        className={`${styles.tools} ${iconsOnly ? styles.toolsIconsOnly : ""}`}
        aria-label="Studio tools"
      >
        {toolButtons(true)}
      </nav>
      {/* An invisible copy with every name showing, to measure what they need. */}
      <div className={styles.toolsMeasure} aria-hidden inert>
        <div ref={measureRef} className={styles.tools}>
          {toolButtons(false)}
        </div>
      </div>
    </>
  );

  const open = active !== null && anchor !== null;
  const style = anchor
    ? ({
        "--drop-left": `${anchor.left}px`,
        "--caret-x": `${anchor.caret}px`,
      } as CSSProperties)
    : undefined;

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
      <footer className={styles.footer}>
        Not affiliated with Valve. Steam and item artwork belong to Valve and their creators.{" "}
        <a href="https://github.com/ronincampbell/steam-profile-studio" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
      <div className={styles.toasts}>{notices}</div>
    </>
  );
}

/**
 * Whether the menu has to drop its names: true when the names would run past
 * the header's right edge. The menu's left edge is fixed (under the search
 * bar), so this only compares the full-width copy with the room to its right.
 */
function useIconsOnly() {
  const nav = useRef<HTMLElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useLayoutEffect(() => {
    const navEl = nav.current;
    const measureEl = measure.current;
    const row = navEl?.closest("header")?.firstElementChild;
    if (!navEl || !measureEl || !row) return;
    const check = () => {
      const room =
        row.getBoundingClientRect().right - navEl.getBoundingClientRect().left;
      setOn(measureEl.getBoundingClientRect().width > room + 0.5);
    };
    check();
    // Size changes of the header (window resizes) and of the copy (fonts
    // loading, a count appearing).
    const observer = new ResizeObserver(check);
    observer.observe(row);
    observer.observe(measureEl);
    document.fonts?.ready.then(check);
    return () => observer.disconnect();
  }, []);

  return { navRef: nav, measureRef: measure, iconsOnly: on };
}
