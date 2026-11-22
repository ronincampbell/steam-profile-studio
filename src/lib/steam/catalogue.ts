/**
 * The Points Shop catalogue, made browsable: Popular/New order, game names,
 * vibe filters from the games' store tags, and a By game view that puts the
 * loaded profile's own games first.
 *
 * Verified 22 Nov 2026 against Steam's own Points Shop code and live calls:
 * - QueryRewardItems `sort=2&sort_descending=false` is Steam's Popular order;
 *   the default (sort 1, descending) is newest first.
 * - `filters[0]=1` is animated only, `2` still only.
 * - `excluded_content_descriptors` 3 and 4 drop adult-only games, as the
 *   Points Shop does for anyone who hasn't opted in (about 30% of frames).
 * - There's no "only games with tag X" filter, so tags come from
 *   IStoreBrowseService/GetItems (no key, 100 games a call) and filtering
 *   happens here.
 *
 * Every type except still backgrounds is small (at most ~3,300 items), so the
 * whole list is fetched in pages of 1,000 and kept in memory for a day; that
 * makes filtering, sorting and grouping instant. Still backgrounds number
 * ~62,000 (mostly 500-point game backgrounds), so they're paged straight from
 * Steam instead, and their By game view covers only the profile's own games.
 */
import "server-only";
import { steamGet } from "./api";
import {
  filterEntries,
  groupByGame,
  pageOf,
  sortEntries,
  withGame,
  type IndexEntry,
} from "./browse";
import { normalizeRewardItem, type RawRewardItem } from "./normalize";
import {
  ITEM_TYPES,
  type CataloguePage,
  type GameInfo,
  type GamesPage,
  type ItemType,
  type Motion,
  type SortMode,
  type Vibe,
} from "./types";

const PAGE = 100;
const GROUPS_PAGE = 20;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Hide adult-only games, as the Points Shop does by default. */
const NO_ADULT = {
  "excluded_content_descriptors[0]": 3,
  "excluded_content_descriptors[1]": 4,
};

function sortParams(sort: SortMode) {
  return sort === "popular"
    ? { sort: 2, sort_descending: "false" }
    : { sort: 1, sort_descending: "true" };
}

/* ---------- Memory cache ---------- */

/**
 * Keep each answer for `ttl`, share one request between callers, and keep
 * serving the old answer if a refresh fails.
 */
function memoize<T>(
  ttl: number,
  load: (key: string) => Promise<T>,
  maxKeys = 200,
) {
  const store = new Map<
    string,
    { at: number; value?: T; pending?: Promise<T> }
  >();
  return (key: string): Promise<T> => {
    const entry = store.get(key);
    if (entry?.value !== undefined && Date.now() - entry.at < ttl)
      return Promise.resolve(entry.value);
    if (entry?.pending) return entry.pending;
    if (store.size >= maxKeys) store.delete(store.keys().next().value!);
    const pending = load(key).then(
      (value) => {
        store.set(key, { at: Date.now(), value });
        return value;
      },
      (err) => {
        if (entry?.value !== undefined) {
          store.set(key, { at: entry.at, value: entry.value });
          return entry.value;
        }
        store.delete(key);
        throw err;
      },
    );
    store.set(key, { at: entry?.at ?? 0, value: entry?.value, pending });
    return pending;
  };
}

/* ---------- Items ---------- */

type RewardPage = {
  response: { definitions?: RawRewardItem[]; next_cursor?: string };
};

function toEntries(raws: RawRewardItem[]): IndexEntry[] {
  const seen = new Set<number>();
  const out: IndexEntry[] = [];
  for (const raw of raws) {
    if (seen.has(raw.defid)) continue; // Steam occasionally repeats an item across pages.
    seen.add(raw.defid);
    const item = normalizeRewardItem(raw);
    if (item)
      out.push({ item, rank: out.length, created: raw.timestamp_created ?? 0 });
  }
  return out;
}

/** Every item of one type (animated only, for backgrounds), most popular first. */
const getIndex = memoize(DAY, async (type: string): Promise<IndexEntry[]> => {
  const raws: RawRewardItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const params: Record<string, string | number> = {
      count: 1000,
      language: "english",
      "community_item_classes[0]": ITEM_TYPES[type as ItemType],
      ...sortParams("popular"),
      ...NO_ADULT,
    };
    if (type === "background") params["filters[0]"] = 1;
    if (cursor) params.cursor = cursor;
    const r = await steamGet<RewardPage>(
      "ILoyaltyRewardsService/QueryRewardItems/v1",
      params,
    );
    const batch = r.response.definitions ?? [];
    raws.push(...batch);
    if (batch.length < 1000 || !r.response.next_cursor) break;
    cursor = r.response.next_cursor;
  }
  return toEntries(raws);
});

/* ---------- Games ---------- */

const STORE_ASSETS = "https://shared.fastly.steamstatic.com/store_item_assets/";

const getTagNames = memoize(DAY, async () => {
  const r = await steamGet<{
    response: { tags?: { tagid: number; name: string }[] };
  }>("IStoreService/GetTagList/v1", { language: "english" });
  return new Map((r.response.tags ?? []).map((t) => [t.tagid, t.name]));
});

interface RawStoreItem {
  id: number;
  success: number;
  name?: string;
  /** 14 is a Steam sale or festival page. */
  type?: number;
  tags?: { tagid: number; weight: number }[];
  assets?: { asset_url_format?: string; small_capsule?: string };
}

const gameCache = new Map<number, { at: number; info: GameInfo }>();

/** Store details for these games, fetched 100 at a time and kept for a day. */
async function getGames(
  appids: Iterable<number>,
): Promise<Map<number, GameInfo>> {
  const now = Date.now();
  const wanted = [...new Set(appids)];
  const missing = wanted.filter(
    (id) => !(now - (gameCache.get(id)?.at ?? 0) < DAY),
  );
  if (missing.length) {
    const tagNames = await getTagNames("tags").catch(
      () => new Map<number, string>(),
    );
    const batches: number[][] = [];
    for (let i = 0; i < missing.length; i += 100)
      batches.push(missing.slice(i, i + 100));
    // A few at a time, so a cold start doesn't fire a dozen requests at once.
    for (let i = 0; i < batches.length; i += 4) {
      await Promise.all(
        batches.slice(i, i + 4).map(async (ids) => {
          const input = {
            ids: ids.map((appid) => ({ appid })),
            context: { language: "english", country_code: "US" },
            data_request: { include_tag_count: 20, include_assets: true },
          };
          const r = await steamGet<{
            response: { store_items?: RawStoreItem[] };
          }>("IStoreBrowseService/GetItems/v1", {
            input_json: JSON.stringify(input),
          }).catch(() => null);
          for (const s of r?.response.store_items ?? []) {
            const known = s.success === 1;
            const { asset_url_format: format, small_capsule: capsule } =
              s.assets ?? {};
            gameCache.set(s.id, {
              at: Date.now(),
              info: {
                appid: s.id,
                name: known ? (s.name ?? "") : "",
                capsule:
                  format && capsule
                    ? STORE_ASSETS + format.replace("${FILENAME}", capsule)
                    : undefined,
                tags: [...(s.tags ?? [])]
                  .sort((a, b) => b.weight - a.weight)
                  .map((t) => tagNames.get(t.tagid))
                  .filter((t): t is string => Boolean(t)),
                // Steam's older event items have no store page at all.
                event: !known || s.type === 14,
              },
            });
          }
        }),
      );
    }
  }
  const out = new Map<number, GameInfo>();
  for (const id of wanted) {
    const hit = gameCache.get(id);
    if (hit) out.set(id, hit.info);
  }
  return out;
}

/** The profile's games (appid → minutes played), or empty when its game list is private. */
const getOwned = memoize(
  10 * 60_000,
  async (steamId: string): Promise<Map<number, number>> => {
    const r = await steamGet<{
      response: { games?: { appid: number; playtime_forever?: number }[] };
    }>(
      "IPlayerService/GetOwnedGames/v1",
      { steamid: steamId, include_played_free_games: 1 },
      { key: true },
    ).catch(() => null);
    return new Map(
      (r?.response.games ?? []).map((g) => [g.appid, g.playtime_forever ?? 0]),
    );
  },
  500,
);

/** Every game with Points Shop items. */
const getEligibleApps = memoize(DAY, async () => {
  const r = await steamGet<{ response: { apps?: { appid: number }[] } }>(
    "ILoyaltyRewardsService/GetEligibleApps/v1",
    {},
  );
  return new Set((r.response.apps ?? []).map((a) => a.appid));
});

/* ---------- Queries ---------- */

export interface BrowseQuery {
  type: ItemType;
  sort: SortMode;
  /** Backgrounds only; defaults to animated. */
  motion?: Motion;
  vibe?: Vibe;
  /** Only this game's items. */
  app?: number;
  q?: string;
  cursor?: string;
}

const isStill = (type: ItemType, motion?: Motion) =>
  type === "background" && motion === "still";

/** One page of items. */
export async function browseItems(query: BrowseQuery): Promise<CataloguePage> {
  const { type, sort, motion, vibe, app, q, cursor } = query;
  if (isStill(type, motion)) return browseStill(query);

  const index = await getIndex(type);
  const games = await getGames(index.map((e) => e.item.appid));
  const matches = sortEntries(
    filterEntries(index, games, { vibe, app, q }),
    sort,
  );
  const { page, nextCursor } = pageOf(matches, cursor, PAGE);
  return {
    type,
    items: page.map((e) => withGame(e.item, games)),
    total: matches.length,
    nextCursor,
  };
}

/** Still backgrounds come straight from Steam, a page at a time. */
async function browseStill({
  type,
  sort,
  app,
  q,
  cursor,
}: BrowseQuery): Promise<CataloguePage> {
  const params: Record<string, string | number> = {
    count: PAGE,
    language: "english",
    "community_item_classes[0]": ITEM_TYPES.background,
    "filters[0]": 2,
    ...sortParams(sort),
    ...NO_ADULT,
  };
  if (app) params["appids[0]"] = app;
  if (q) params.search_term = q; // Steam's search matches game names too.
  if (cursor && !/^\d+$/.test(cursor)) params.cursor = cursor;
  const r = await steamGet<RewardPage & { response: { total_count?: number } }>(
    "ILoyaltyRewardsService/QueryRewardItems/v1",
    params,
  );
  const defs = r.response.definitions ?? [];
  const entries = toEntries(defs);
  const games = await getGames(entries.map((e) => e.item.appid));
  return {
    type,
    items: entries.map((e) => withGame(e.item, games)),
    total: r.response.total_count ?? entries.length,
    // Steam still hands back a cursor on the last page; only pass it on when this page was full.
    nextCursor: defs.length >= PAGE ? r.response.next_cursor : undefined,
  };
}

export interface GamesQuery {
  type: ItemType;
  motion?: Motion;
  vibe?: Vibe;
  q?: string;
  /** The loaded profile's SteamID64, to put its games first. */
  owner?: string;
  cursor?: string;
}

/** One page of games, each with its matching items. */
export async function browseGames({
  type,
  motion,
  vibe,
  q,
  owner,
  cursor,
}: GamesQuery): Promise<GamesPage> {
  const owned = owner ? await getOwned(owner) : null;

  let entries: IndexEntry[];
  let games: Map<number, GameInfo>;
  if (isStill(type, motion)) {
    // Too many still backgrounds to group them all; show the profile's own games.
    entries = owner ? await getOwnedStill(owner) : [];
    games = await getGames(entries.map((e) => e.item.appid));
    entries = filterEntries(entries, games, { q });
  } else {
    const index = await getIndex(type);
    games = await getGames(index.map((e) => e.item.appid));
    entries = filterEntries(index, games, { vibe, q });
  }

  const groups = groupByGame(entries, games, owned);
  const { page, nextCursor } = pageOf(groups, cursor, GROUPS_PAGE);
  return {
    type,
    groups: page,
    total: groups.length,
    mineTotal: groups.filter((g) => g.mine).length,
    nextCursor,
  };
}

/** Still backgrounds from the profile's most-played games that have any. */
const getOwnedStill = memoize(
  10 * 60_000,
  async (steamId: string): Promise<IndexEntry[]> => {
    const [owned, eligible] = await Promise.all([
      getOwned(steamId),
      getEligibleApps("apps"),
    ]);
    const appids = [...owned]
      .filter(([appid]) => eligible.has(appid))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 120)
      .map(([appid]) => appid);
    const raws: RawRewardItem[] = [];
    for (let i = 0; i < appids.length; i += 40) {
      const params: Record<string, string | number> = {
        count: 1000,
        language: "english",
        "community_item_classes[0]": ITEM_TYPES.background,
        "filters[0]": 2,
        ...sortParams("popular"),
        ...NO_ADULT,
      };
      appids
        .slice(i, i + 40)
        .forEach((appid, n) => (params[`appids[${n}]`] = appid));
      const r = await steamGet<RewardPage>(
        "ILoyaltyRewardsService/QueryRewardItems/v1",
        params,
      );
      raws.push(...(r.response.definitions ?? []));
    }
    return toEntries(raws);
  },
  200,
);
