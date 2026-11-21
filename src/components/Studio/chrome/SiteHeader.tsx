"use client";
/**
 * The app's own header. It's exactly 104px tall, the height of Steam's
 * header on a real profile page, so the preview under it starts at the
 * same spot as in reference/screenshots/fuzzycast-full-1725w.png.
 */
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, LogoMark } from "./Icons";
import styles from "./Chrome.module.css";

export interface ProfileFormProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
}

interface Props {
  form: ProfileFormProps;
  /** A second row under the brand and search (the toolbar layout's menu). */
  below?: ReactNode;
  sticky?: boolean;
}

export function SiteHeader({ form, below, sticky }: Props) {
  return (
    <header className={`${styles.header} ${below ? styles.headerTwoRow : ""} ${sticky ? styles.sticky : ""}`}>
      <div className={styles.headerRow}>
        <Link className={styles.brand} href="/" aria-label="Steam Profile Studio home">
          <LogoMark size={below ? 34 : 40} />
          <span className={styles.wordmark}>
            <span className={styles.wordmarkTop}>Steam Profile</span>
            <span className={styles.wordmarkMain}>Studio</span>
          </span>
        </Link>
        <ProfileForm {...form} />
        <CopyLink />
      </div>
      {below}
    </header>
  );
}

function ProfileForm({ draft, onDraftChange, onSubmit, loading }: ProfileFormProps) {
  return (
    <form className={styles.search} onSubmit={onSubmit} role="search">
      <Icon name="search" size={18} className={styles.searchIcon} />
      <label className={styles.srOnly} htmlFor="profile-input">
        Steam profile
      </label>
      <input
        id="profile-input"
        className={styles.searchInput}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Paste a Steam profile link, custom URL name or SteamID"
        autoComplete="off"
        spellCheck={false}
      />
      <button className={styles.searchButton} type="submit" disabled={loading}>
        {loading ? "Loading…" : "Load profile"}
      </button>
    </form>
  );
}

/** The profile is in the page's address, so the address is the share link. */
function CopyLink() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (e.g. not https): nothing useful to do.
    }
  }
  return (
    <button type="button" className={styles.ghostButton} onClick={copy}>
      <Icon name="link" size={16} />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
