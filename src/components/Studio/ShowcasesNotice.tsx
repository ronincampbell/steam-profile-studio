"use client";
/**
 * One line above the preview that says when the showcases aren't fresh from
 * Steam: a cached copy because Steam is busy, or nothing yet while we wait.
 * It sits outside the preview so the profile itself stays pixel-matched.
 */
import { useEffect, useState } from "react";
import type { ShowcasesState } from "./useShowcases";
import styles from "./Studio.module.css";

/** Matches the route's fresh window: older than this means a cached copy. */
const FRESH_MS = 6 * 3_600_000;

export function ShowcasesNotice({ state }: { state: ShowcasesState }) {
  const now = useNow();
  const { showcases, busy, retry } = state;

  if (busy) {
    return (
      <p className={styles.notice} role="status">
        Steam is busy and hasn&apos;t sent this profile&apos;s showcases yet.{" "}
        {busy.retryAt ? "Trying again shortly." : "Try again in a minute."}{" "}
        <button type="button" className={styles.linkButton} onClick={retry}>
          Try now
        </button>
      </p>
    );
  }

  if (!showcases?.fetchedAt) return null;
  const age = now - Date.parse(showcases.fetchedAt);
  const ago = formatAgo(age);
  if (showcases.staleBecause) {
    return (
      <p className={styles.notice} role="status">
        {showcases.staleBecause === "rate-limited" ? "Steam is busy" : "Steam didn't answer just now"}, so these
        showcases are from {ago}.
      </p>
    );
  }
  if (age > FRESH_MS) {
    return (
      <p className={styles.notice} role="status">
        These showcases are from {ago}.
      </p>
    );
  }
  return null;
}

/** "3 minutes ago", "5 hours ago", "2 days ago". */
export function formatAgo(ms: number): string {
  const minutes = Math.max(Math.round(ms / 60_000), 0);
  if (minutes < 1) return "just now";
  const [n, unit] =
    minutes < 60 ? [minutes, "minute"] : minutes < 48 * 60 ? [Math.round(minutes / 60), "hour"] : [Math.round(minutes / 1440), "day"];
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/** The time, updated every minute, so "N minutes ago" stays right. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
