/**
 * Server-only Steam Web API calls, with caching.
 *
 * The `server-only` import makes the build fail if anything in the browser
 * bundle imports this file, which is what keeps STEAM_API_KEY off the client.
 *
 * Caching uses Next's `use cache` with two custom lifetimes from
 * next.config.ts: `profile` (about 10 minutes) and `catalogue` (about a day).
 * The API routes also send Cache-Control headers, so Vercel's CDN answers
 * repeat requests without running the function at all.
 */
import "server-only";
import { getCache } from "@vercel/functions";
import { cacheLife } from "next/cache";
import {
  normalizeEquipped,
  normalizeProfile,
  normalizeRewardItem,
  type RawEquippedItem,
  type RawPlayerSummary,
  type RawRewardItem,
} from "./normalize";
import { pointsShopAppUrl } from "./pointsShop";
import { createShowcaseLoader } from "./showcases/resilient";
import type { ProfileShowcases } from "./showcases/types";
import type { Profile, ShopItem } from "./types";

const API = "https://api.steampowered.com";

export class SteamError extends Error {
  constructor(
    message: string,
    /** HTTP status the app should answer with. */
    readonly status: number,
  ) {
    super(message);
  }
}

export async function steamGet<T>(
  path: string,
  params: Record<string, string | number>,
  { key = false }: { key?: boolean } = {},
): Promise<T> {
  const url = new URL(`${API}/${path}/`);
  if (key) {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) throw new SteamError("Steam lookups aren't set up on this site yet.", 500);
    url.searchParams.set("key", apiKey);
  }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new SteamError("Couldn't reach Steam. Try again in a minute.", 502);
  }
  if (res.status === 429) throw new SteamError("Steam is busy. Try again in a minute.", 503);
  if (!res.ok) throw new SteamError("Steam didn't answer. Try again in a minute.", 502);
  try {
    return (await res.json()) as T;
  } catch {
    throw new SteamError("Steam didn't answer. Try again in a minute.", 502);
  }
}

/* ---------- Profile ---------- */

/** Vanity name → SteamID64, or null when no such profile exists. */
export async function resolveVanity(vanity: string): Promise<string | null> {
  "use cache";
  cacheLife("catalogue");
  const r = await steamGet<{ response: { success: number; steamid?: string } }>(
    "ISteamUser/ResolveVanityURL/v1",
    { vanityurl: vanity },
    { key: true },
  );
  return r.response.success === 1 && r.response.steamid ? r.response.steamid : null;
}

/** Everything the profile header needs, or null when the SteamID doesn't exist. */
export async function getProfile(steamId: string): Promise<Profile | null> {
  "use cache";
  cacheLife("profile");

  const [summaries, level, equipped, customization] = await Promise.all([
    steamGet<{ response: { players: RawPlayerSummary[] } }>(
      "ISteamUser/GetPlayerSummaries/v2",
      { steamids: steamId },
      { key: true },
    ),
    // Private profiles answer with an empty response here.
    steamGet<{ response: { player_level?: number } }>(
      "IPlayerService/GetSteamLevel/v1",
      { steamid: steamId },
      { key: true },
    ).catch(() => ({ response: {} as { player_level?: number } })),
    steamGet<{ response: Record<string, RawEquippedItem> }>(
      "IPlayerService/GetProfileItemsEquipped/v1",
      { steamid: steamId, language: "english" },
    ).catch(() => ({ response: {} })),
    steamGet<{ response: { profile_theme?: { theme_id?: string } } }>(
      "IPlayerService/GetProfileCustomization/v1",
      { steamid: steamId },
    ).catch(() => ({ response: {} as { profile_theme?: { theme_id?: string } } })),
  ]);

  const summary = summaries.response.players[0];
  if (!summary) return null;
  return normalizeProfile(
    summary,
    level.response.player_level ?? null,
    normalizeEquipped(equipped.response),
    customization.response.profile_theme?.theme_id,
  );
}

/* ---------- Showcases ---------- */

/**
 * A profile's showcases, read from its public profile page.
 *
 * Showcases aren't in the Web API, so this loads
 * steamcommunity.com/profiles/<id>/ (English labels) and parses the HTML; see
 * reference/html/SHOWCASES.md. Steam's community site starts answering 429
 * after 2–4 quick requests, so this goes through the rate-limit-proof loader
 * in showcases/resilient.ts (6-hour memory, a week-long shared copy in
 * Vercel's Runtime Cache, last-good fallback, combined duplicate requests,
 * retry with backoff) instead of `use cache`, which can't
 * keep an old answer when a refresh fails.
 *
 * Throws SteamBusyError only when Steam failed and there's no earlier copy.
 */
const showcaseLoader = createShowcaseLoader({
  // Vercel's Runtime Cache: one copy shared by every server instance. Ronin
  // okayed it on 21 Nov 2026 for the Hobby plan's free allowance only (Vercel's
  // docs, read via search, say Hobby pauses it when that runs out, not bills).
  // Outside Vercel, getCache() falls back to memory. Set
  // SHOWCASE_SHARED_CACHE=off in Vercel's env vars to turn it off.
  shared:
    process.env.SHOWCASE_SHARED_CACHE === "off" ? undefined : getCache({ namespace: "showcases-v1" }),
});

export function getShowcases(steamId: string): Promise<ProfileShowcases> {
  return showcaseLoader.get(steamId);
}

/* ---------- Catalogue ---------- */

/**
 * The items inside a profile bundle (a Points Shop "profile theme").
 *
 * Bundle parts aren't sold on their own, so the normal catalogue query
 * leaves them out. Asking for the bundle's app with
 * `include_direct_purchase_disabled=true` includes them (verified 21 Nov
 * 2026 on Bayside Beasts, app 4197880).
 */
export async function getBundle(appid: number, defid: number): Promise<ShopItem[] | null> {
  "use cache";
  cacheLife("catalogue");

  const defs: RawRewardItem[] = [];
  let cursor: string | undefined;
  // An app rarely has more than a few hundred items; stop after 5 pages regardless.
  for (let page = 0; page < 5; page++) {
    const params: Record<string, string | number> = {
      count: 1000,
      language: "english",
      "appids[0]": appid,
      include_direct_purchase_disabled: "true",
    };
    if (cursor) params.cursor = cursor;
    const r = await steamGet<{ response: { definitions?: RawRewardItem[]; next_cursor?: string } }>(
      "ILoyaltyRewardsService/QueryRewardItems/v1",
      params,
    );
    const batch = r.response.definitions ?? [];
    defs.push(...batch);
    if (batch.length < 1000 || !r.response.next_cursor) break;
    cursor = r.response.next_cursor;
  }

  const bundle = defs.find((d) => d.defid === defid);
  if (!bundle?.bundle_defids?.length) return null;
  return bundle.bundle_defids
    .map((id) => defs.find((d) => d.defid === id))
    .filter((d): d is RawRewardItem => Boolean(d))
    .map((d) => normalizeRewardItem(d))
    .filter((i): i is ShopItem => i !== null)
    // Bundle parts can't be bought on their own; the bundle's page sells them.
    .map((i) => ({ ...i, buyUrl: pointsShopAppUrl(appid) }));
}
