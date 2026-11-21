"use client";
/**
 * Load a profile's showcases from our own /api/profile/showcases route.
 *
 * When Steam is busy and the server has no copy at all (a 503), this waits
 * the Retry-After the server sent (at most a minute) and asks again, up to
 * three times, then stops so an idle tab doesn't keep knocking.
 */
import { useEffect, useState } from "react";
import type { ProfileShowcases } from "@/lib/steam/showcases/types";

const MAX_AUTO_RETRIES = 3;

export interface ShowcasesState {
  /** The showcases for the current profile, or null while loading (or with no profile). */
  showcases: ProfileShowcases | null;
  /** Set while Steam is busy and there's no copy to show. */
  busy: { retryAt: number | null } | null;
  /** Ask again now. */
  retry: () => void;
}

interface Loaded {
  steamId: string;
  result: ProfileShowcases;
  busy: { retryAt: number | null } | null;
}

export function useShowcases(steamId: string | null): ShowcasesState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // `auto` counts automatic retries; `total` changes on every retry, so the
  // effect below runs again even when a manual retry resets `auto` to 0.
  const [attempt, setAttempt] = useState({ steamId, auto: 0, total: 0 });
  // A new profile starts the count again.
  const auto = attempt.steamId === steamId ? attempt.auto : 0;
  const total = attempt.steamId === steamId ? attempt.total : 0;

  useEffect(() => {
    if (!steamId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unavailable: ProfileShowcases = { steamId, visibility: "unavailable", showcases: [] };

    fetch(`/api/profile/showcases?id=${steamId}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (ProfileShowcases & { retryAfter?: number }) | null;
        if (res.ok && body) {
          setLoaded({ steamId, result: body, busy: null });
          return;
        }
        if (res.status !== 503) {
          setLoaded({ steamId, result: unavailable, busy: null });
          return;
        }
        // Steam is busy and nobody has a copy yet: try again shortly.
        const waitS = Math.min(Math.max(body?.retryAfter ?? 30, 5), 60);
        const willRetry = auto < MAX_AUTO_RETRIES;
        setLoaded({ steamId, result: unavailable, busy: { retryAt: willRetry ? Date.now() + waitS * 1000 : null } });
        if (willRetry) timer = setTimeout(() => setAttempt({ steamId, auto: auto + 1, total: total + 1 }), waitS * 1000);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ steamId, result: unavailable, busy: null });
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [steamId, auto, total]);

  const current = steamId && loaded?.steamId === steamId ? loaded : null;
  return {
    // A result for an older profile means the new one is still loading.
    showcases: current?.result ?? null,
    busy: current?.busy ?? null,
    retry: () => setAttempt({ steamId, auto: 0, total: total + 1 }),
  };
}
