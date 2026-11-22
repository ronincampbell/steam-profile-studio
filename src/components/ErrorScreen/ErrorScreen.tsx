/**
 * The 404 and error pages (src/app/not-found.tsx, error.tsx, global-error.tsx).
 * A plain <a> rather than next/link for "home", so it also works from
 * global-error, where the app's router may be the thing that broke.
 */
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Studio/chrome/Icons";
import styles from "./ErrorScreen.module.css";

interface Props {
  title: string;
  detail?: string;
  /** Shown before "Back to the studio", e.g. a Try again button. */
  action?: ReactNode;
}

export function ErrorScreen({ title, detail, action }: Props) {
  return (
    <main className={styles.screen}>
      <div className={styles.box}>
        <LogoMark size={48} />
        <h1 className={styles.title}>{title}</h1>
        {detail && <p className={styles.detail}>{detail}</p>}
        <div className={styles.actions}>
          {action}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point (see top) */}
          <a className={`${styles.button} ${action ? styles.secondary : ""}`} href="/">
            Back to the studio
          </a>
        </div>
      </div>
    </main>
  );
}

export { styles as errorScreenStyles };
