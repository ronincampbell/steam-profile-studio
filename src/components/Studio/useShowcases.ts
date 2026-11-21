"use client";
/** Load a profile's showcases from our own /api/profile/showcases route. */
import { useEffect, useState } from "react";
import { hideFriendDetails } from "@/lib/steam/showcases/sidebar";
import type { ProfileShowcases } from "@/lib/steam/showcases/types";

/**
 * The showcases (and right-hand column) for `steamId`, or null while loading
 * (or with no profile). Friends' names and avatars are only requested when
 * `showFriends` is on; otherwise the API leaves them out.
 */
export function useShowcases(steamId: string | null, showFriends = false): ProfileShowcases | null {
  const [result, setResult] = useState<ProfileShowcases | null>(null);

  useEffect(() => {
    if (!steamId) return;
    const controller = new AbortController();
    const url = `/api/profile/showcases?id=${steamId}${showFriends ? "&friends=1" : ""}`;
    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<ProfileShowcases>) : null))
      .then((body) => setResult(body ?? { steamId, visibility: "unavailable", showcases: [] }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ steamId, visibility: "unavailable", showcases: [] });
      });
    return () => controller.abort();
  }, [steamId, showFriends]);

  // A result for an older profile means the new one is still loading.
  if (!steamId || result?.steamId !== steamId) return null;
  // Hiding is instant: don't wait for the refetch to drop names already loaded.
  if (!showFriends && result.sidebar?.friends && !result.sidebar.friends.detailsHidden) {
    return { ...result, sidebar: hideFriendDetails(result.sidebar) };
  }
  return result;
}
