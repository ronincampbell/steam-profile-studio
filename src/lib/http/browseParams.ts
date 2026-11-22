/** Read and check the item browser's query string, shared by /api/items and /api/items/games. */
import {
  isItemType,
  isVibe,
  type ItemType,
  type Motion,
  type SortMode,
  type Vibe,
} from "@/lib/steam/types";

export interface BrowseParams {
  type: ItemType;
  sort: SortMode;
  motion?: Motion;
  vibe?: Vibe;
  app?: number;
  q?: string;
  owner?: string;
  cursor?: string;
}

/** The parsed params, or an error message for a 400. */
export function parseBrowseParams(
  params: URLSearchParams,
): BrowseParams | string {
  const type = params.get("type");
  if (!isItemType(type)) return "Unknown item type";

  const sort = params.get("sort") ?? "popular";
  if (sort !== "popular" && sort !== "new")
    return "sort must be popular or new";

  const motion = params.get("motion") ?? undefined;
  if (motion !== undefined && motion !== "animated" && motion !== "still")
    return "motion must be animated or still";

  const vibe = params.get("vibe") || undefined;
  if (vibe !== undefined && !isVibe(vibe)) return "Unknown vibe";

  const appParam = params.get("app");
  const app = appParam ? Number(appParam) : undefined;
  if (app !== undefined && !(Number.isInteger(app) && app > 0))
    return "Bad app";

  const owner = params.get("owner") || undefined;
  if (owner !== undefined && !/^\d{17}$/.test(owner)) return "Bad owner";

  // Cursors are Steam's base64 strings or our own offsets; searches are free
  // text. Bound both so nobody can push junk through to Steam.
  const cursor = params.get("cursor")?.trim() || undefined;
  if (cursor && !/^[A-Za-z0-9+/=_-]{1,200}$/.test(cursor)) return "Bad cursor";
  const q = params.get("q")?.trim().slice(0, 100) || undefined;

  return { type, sort, motion, vibe, app, q, owner, cursor };
}
