"use client";
/** Page through /api/items for one item type and search term. */
import { useCallback, useEffect, useState } from "react";
import type { CataloguePage, ItemType, ShopItem } from "@/lib/steam/types";

interface Loaded {
  key: string;
  items: ShopItem[];
  total: number;
  nextCursor?: string;
  error?: string;
  loadingMore: boolean;
}

async function fetchPage(type: ItemType, search: string, cursor?: string): Promise<CataloguePage> {
  const params = new URLSearchParams({ type });
  if (search) params.set("q", search);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/items?${params}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Couldn't load items (${res.status})`);
  return body as CataloguePage;
}

export function useCatalogue(type: ItemType, search: string) {
  const key = `${type}|${search}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPage(type, search)
      .then((page) => {
        if (!cancelled) setLoaded({ key, items: page.items, total: page.total, nextCursor: page.nextCursor, loadingMore: false });
      })
      .catch((e: Error) => {
        if (!cancelled) setLoaded({ key, items: [], total: 0, error: e.message, loadingMore: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key, type, search]);

  const current = loaded?.key === key ? loaded : null;

  const loadMore = useCallback(() => {
    if (!current?.nextCursor || current.loadingMore) return;
    setLoaded({ ...current, loadingMore: true });
    fetchPage(type, search, current.nextCursor)
      .then((page) =>
        setLoaded((prev) =>
          prev?.key === key
            ? {
                ...prev,
                // Steam occasionally repeats an item across pages; keep the first.
                items: [...prev.items, ...page.items.filter((i) => !prev.items.some((p) => p.defid === i.defid))],
                nextCursor: page.nextCursor,
                loadingMore: false,
              }
            : prev,
        ),
      )
      .catch((e: Error) => setLoaded((prev) => (prev?.key === key ? { ...prev, error: e.message, loadingMore: false } : prev)));
  }, [current, key, type, search]);

  return {
    loading: !current,
    items: current?.items ?? [],
    total: current?.total ?? 0,
    error: current?.error,
    hasMore: Boolean(current?.nextCursor),
    loadingMore: current?.loadingMore ?? false,
    loadMore,
  };
}
