"use client";
/** Page through /api/items (items) or /api/items/games (games) for one query. */
import { useCallback, useEffect, useState } from "react";
import type {
  CataloguePage,
  GameGroup,
  GamesPage,
  ItemType,
  Motion,
  ShopItem,
  SortMode,
  Vibe,
} from "@/lib/steam/types";

export interface CatalogueQuery {
  type: ItemType;
  sort: SortMode;
  motion?: Motion;
  vibe?: Vibe;
  app?: number;
  q?: string;
  owner?: string;
}

interface Page<T> {
  list: T[];
  total: number;
  extra?: number;
  nextCursor?: string;
}

interface Loaded<T> extends Page<T> {
  key: string;
  error?: string;
  loadingMore: boolean;
}

function toParams(query: CatalogueQuery, cursor?: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== "") params.set(k, String(v));
  if (cursor) params.set("cursor", cursor);
  return params;
}

function usePaged<T>(
  path: string,
  query: CatalogueQuery | null,
  read: (body: unknown) => Page<T>,
  id: (item: T) => number,
) {
  const key = query ? `${path}?${toParams(query)}` : "";
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  const fetchPage = useCallback(
    async (cursor?: string): Promise<Page<T>> => {
      const res = await fetch(`${path}?${toParams(query!, cursor)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body.error ?? `Couldn't load items (${res.status})`);
      return read(body);
    },
    // `key` covers everything in `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    fetchPage()
      .then(
        (page) => !cancelled && setLoaded({ key, ...page, loadingMore: false }),
      )
      .catch(
        (e: Error) =>
          !cancelled &&
          setLoaded({
            key,
            list: [],
            total: 0,
            error: e.message,
            loadingMore: false,
          }),
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;

  const loadMore = useCallback(() => {
    if (!current?.nextCursor || current.loadingMore) return;
    setLoaded({ ...current, loadingMore: true });
    fetchPage(current.nextCursor)
      .then((page) =>
        setLoaded((prev) =>
          prev?.key === key
            ? {
                ...prev,
                // Steam occasionally repeats an item across pages; keep the first.
                list: [
                  ...prev.list,
                  ...page.list.filter(
                    (i) => !prev.list.some((p) => id(p) === id(i)),
                  ),
                ],
                nextCursor: page.nextCursor,
                loadingMore: false,
              }
            : prev,
        ),
      )
      .catch((e: Error) =>
        setLoaded((prev) =>
          prev?.key === key
            ? { ...prev, error: e.message, loadingMore: false }
            : prev,
        ),
      );
  }, [current, key, fetchPage, id]);

  return {
    loading: Boolean(query) && !current,
    list: current?.list ?? [],
    total: current?.total ?? 0,
    extra: current?.extra ?? 0,
    error: current?.error,
    hasMore: Boolean(current?.nextCursor),
    loadingMore: current?.loadingMore ?? false,
    loadMore,
  };
}

const readItems = (body: unknown): Page<ShopItem> => {
  const p = body as CataloguePage;
  return { list: p.items, total: p.total, nextCursor: p.nextCursor };
};
const readGames = (body: unknown): Page<GameGroup> => {
  const p = body as GamesPage;
  return {
    list: p.groups,
    total: p.total,
    extra: p.mineTotal,
    nextCursor: p.nextCursor,
  };
};
const itemId = (i: ShopItem) => i.defid;
const gameId = (g: GameGroup) => g.appid;

/** Items for a query; pass null to load nothing. */
export function useCatalogue(query: CatalogueQuery | null) {
  return usePaged("/api/items", query, readItems, itemId);
}

/** Games for a query, with `extra` = how many are the profile's own. */
export function useGames(query: CatalogueQuery | null) {
  return usePaged("/api/items/games", query, readGames, gameId);
}
