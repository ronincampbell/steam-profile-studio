"use client";
/**
 * The profile summary (bio) under the name in the header: div.profile_header_summary.
 *
 * Like Steam (InitProfileSummary in profile.js): text up to 76px tall shows
 * in full; anything taller is cut to 57px (three lines) with a "View more
 * info" link that opens the whole text in Steam's "Info" dialog.
 */
import { useLayoutEffect, useRef, useState } from "react";
import bbcode from "@/components/BBCode.module.css";
import styles from "./Summary.module.css";

/** profile.js: `if ( $Summary[0].scrollHeight <= 76 )` */
const NO_EXPAND_HEIGHT = 76;

/** `html` is already cleaned by the parser (sanitizeNotes). */
export function ProfileSummary({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [expandable, setExpandable] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scrollHeight is the text's full height whatever the box's height is.
    const measure = () => setExpandable(el.scrollHeight > NO_EXPAND_HEIGHT);
    measure();
    // Again once Motiva Sans has loaded, and when the column's width changes.
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [html]);

  return (
    <div className={styles.headerSummary}>
      <div
        ref={ref}
        className={`${styles.summary} ${bbcode.bb} ${expandable ? "" : styles.noExpand}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {expandable && (
        <>
          <div className={styles.footer}>
            <span role="button" tabIndex={0} className={styles.whiteLink} onClick={() => dialog.current?.showModal()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  dialog.current?.showModal();
                }
              }}
            >
              View more info
            </span>
          </div>
          {/* ShowDialog( 'Info', $ModalSummary ) */}
          <dialog
            ref={dialog}
            className={styles.modal}
            // A click on the dimmed page around the dialog closes it, as on Steam.
            onClick={(e) => {
              if (e.target === e.currentTarget) e.currentTarget.close();
            }}
          >
            <div className={styles.modalTopBar} />
            <div className={styles.modalHeader}>
              <button type="button" className={styles.modalClose} aria-label="Close" onClick={() => dialog.current?.close()} />
              <div className={styles.modalTitle}>Info</div>
            </div>
            <div className={styles.modalContentBorder}>
              <div className={styles.modalContent}>
                <div className={`${styles.modalSummary} ${bbcode.bb}`} dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
