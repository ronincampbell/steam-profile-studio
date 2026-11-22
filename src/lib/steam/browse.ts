/**
 * Filtering, sorting and grouping for the item browser. Pure functions, so
 * they're tested without Steam; catalogue.ts feeds them Steam's data.
 */
import {
  VIBES,
  type GameGroup,
  type GameInfo,
  type ShopItem,
  type SortMode,
  type Vibe,
} from "./types";

/** One catalogue item plus what we sort it by. */
export interface IndexEntry {
  item: ShopItem;
  /** Position in Steam's Popular order (0 = most popular). */
  rank: number;
  /** When Steam added it (Unix seconds). */
  created: number;
}

export interface EntryFilter {
  vibe?: Vibe;
  /** Only this game's items. */
  app?: number;
  /** Matches the item's name or its game's name. */
  q?: string;
}

/**
 * Only a game's strongest store tags count, so a game that's mostly a
 * shooter doesn't land under Cute because a few players tagged it that way.
 */
export const STRONG_TAGS = 8;

export function matchesVibe(game: GameInfo | undefined, vibe: Vibe): boolean {
  if (vibe === "events") return !game || game.event;
  if (!game || game.event) return false;
  const strong = game.tags.slice(0, STRONG_TAGS);
  return VIBES[vibe].tags.some((t) => strong.includes(t));
}

export function filterEntries(
  entries: IndexEntry[],
  games: ReadonlyMap<number, GameInfo>,
  { vibe, app, q }: EntryFilter,
): IndexEntry[] {
  const needle = q?.trim().toLowerCase();
  return entries.filter(({ item }) => {
    if (app !== undefined && item.appid !== app) return false;
    const game = games.get(item.appid);
    if (vibe && !matchesVibe(game, vibe)) return false;
    if (
      needle &&
      !item.name.toLowerCase().includes(needle) &&
      !game?.name.toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });
}

export function sortEntries(
  entries: IndexEntry[],
  sort: SortMode,
): IndexEntry[] {
  return [...entries].sort(
    sort === "new"
      ? (a, b) => b.created - a.created || a.rank - b.rank
      : (a, b) => a.rank - b.rank,
  );
}

/** The item with its game's name filled in. */
export function withGame(
  item: ShopItem,
  games: ReadonlyMap<number, GameInfo>,
): ShopItem {
  const name = games.get(item.appid)?.name;
  return name ? { ...item, game: name } : item;
}

/** A game's display name; Steam's older event items have no store page at all. */
export function gameName(
  appid: number,
  games: ReadonlyMap<number, GameInfo>,
): string {
  return games.get(appid)?.name || "Steam event";
}

/**
 * Group entries (already in popularity order) by game. The profile's own
 * games come first, most played first; then every other game, ordered by its
 * most popular item.
 */
export function groupByGame(
  entries: IndexEntry[],
  games: ReadonlyMap<number, GameInfo>,
  owned: ReadonlyMap<number, number> | null,
  stripSize = 8,
): GameGroup[] {
  const byApp = new Map<number, IndexEntry[]>();
  for (const e of entries) {
    const list = byApp.get(e.item.appid);
    if (list) list.push(e);
    else byApp.set(e.item.appid, [e]);
  }
  const groups: { group: GameGroup; best: number; playtime: number }[] = [];
  for (const [appid, list] of byApp) {
    const game = games.get(appid);
    const mine = owned?.has(appid) ?? false;
    groups.push({
      group: {
        appid,
        name: gameName(appid, games),
        capsule: game?.capsule,
        count: list.length,
        items: list.slice(0, stripSize).map((e) => withGame(e.item, games)),
        mine,
      },
      best: list[0].rank,
      playtime: mine ? (owned?.get(appid) ?? 0) : 0,
    });
  }
  groups.sort(
    (a, b) =>
      Number(b.group.mine) - Number(a.group.mine) ||
      b.playtime - a.playtime ||
      a.best - b.best,
  );
  return groups.map((g) => g.group);
}

/** One page of a list, with cursors that are just offsets. */
export function pageOf<T>(
  list: T[],
  cursor: string | undefined,
  size: number,
): { page: T[]; nextCursor?: string } {
  const start = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const page = list.slice(start, start + size);
  const next = start + size;
  return { page, nextCursor: next < list.length ? String(next) : undefined };
}
