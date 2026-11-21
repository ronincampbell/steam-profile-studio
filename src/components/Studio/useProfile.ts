"use client";
/** Load a profile from our own /api/profile route (never from Steam directly). */
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/steam/types";

export type ProfileState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ready"; query: string; profile: Profile }
  | { status: "error"; query: string; message: string };

type Result = { query: string; profile: Profile } | { query: string; message: string };

export function useProfile(query: string | null): ProfileState {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    fetch(`/api/profile?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status})`);
        setResult({ query, profile: body as Profile });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setResult({ query, message: e.message });
      });
    return () => controller.abort();
  }, [query]);

  if (!query) return { status: "idle" };
  // A result for an older query means the new one is still loading.
  if (!result || result.query !== query) return { status: "loading", query };
  return "profile" in result
    ? { status: "ready", query, profile: result.profile }
    : { status: "error", query, message: result.message };
}
