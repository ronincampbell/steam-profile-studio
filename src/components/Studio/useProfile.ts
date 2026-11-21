"use client";
/** Load a profile from our own /api/profile route (never from Steam directly). */
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/steam/types";

export type ProfileState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ready"; query: string; profile: Profile }
  | { status: "error"; query: string; message: string };

export function useProfile(query: string | null): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "idle" });

  useEffect(() => {
    if (!query) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", query });
    fetch(`/api/profile?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status})`);
        setState({ status: "ready", query, profile: body as Profile });
      })
      .catch((e: Error) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", query, message: e.message });
      });
    return () => controller.abort();
  }, [query]);

  return state;
}
