"use client";
/** Load a profile's showcases from our own /api/profile/showcases route. */
import { useEffect, useState } from "react";
import type { ProfileShowcases } from "@/lib/steam/showcases/types";

/** The showcases for `steamId`, or null while loading (or with no profile). */
export function useShowcases(steamId: string | null): ProfileShowcases | null {
  const [result, setResult] = useState<ProfileShowcases | null>(null);

  useEffect(() => {
    if (!steamId) return;
    const controller = new AbortController();
    fetch(`/api/profile/showcases?id=${steamId}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<ProfileShowcases>) : null))
      .then((body) => setResult(body ?? { steamId, visibility: "unavailable", showcases: [] }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ steamId, visibility: "unavailable", showcases: [] });
      });
    return () => controller.abort();
  }, [steamId]);

  // A result for an older profile means the new one is still loading.
  return steamId && result?.steamId === steamId ? result : null;
}
