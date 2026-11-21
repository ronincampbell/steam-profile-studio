# Raw Steam API responses

Raw JSON from each endpoint in CLAUDE.md's data sources table, captured for one
real profile so the data shape is known before any types are written.

## Capture

Needs Node 20.6+ and a Steam Web API key (https://steamcommunity.com/dev/apikey).

```sh
# .env.local (gitignored) holds: STEAM_API_KEY=your_key
node --env-file=.env.local scripts/capture-steam-api.mjs <profile URL | vanity name | steamid64>
```

Each file holds `_request` (the URL, key replaced with `REDACTED`), `_status`,
`_used_key` and the untouched `response`. Before committing, confirm the key
isn't in any file:

```sh
grep -rF "$(grep STEAM_API_KEY .env.local | cut -d= -f2)" reference/api || echo clean
```

## Files

| File | Endpoint | Notes |
|---|---|---|
| `ResolveVanityURL.json` | `ISteamUser/ResolveVanityURL/v1` | only when a vanity name was given |
| `GetPlayerSummaries.json` | `ISteamUser/GetPlayerSummaries/v2` | |
| `GetSteamLevel.json` | `IPlayerService/GetSteamLevel/v1` | |
| `GetProfileItemsEquipped[.nokey].json` | `IPlayerService/GetProfileItemsEquipped/v1` | undocumented; with and without key |
| `QueryRewardItems[.nokey].json` | `ILoyaltyRewardsService/QueryRewardItems/v1` | undocumented; first 100 items, with and without key |
| `QueryRewardItems.class-<n>-<type>.json` | same, filtered by `community_item_classes[0]` | class numbers are a guess to verify against the shop |

## Findings (captured 21 Nov 2026, profile Fuzzycast, SteamID64 76561198220645184)

All 12 calls returned HTTP 200 from a cloud environment.

- **Key needed?** `GetProfileItemsEquipped` and `QueryRewardItems` return the
  same data with and without a key, so the browser-facing catalogue route
  doesn't strictly need one. `ResolveVanityURL`, `GetPlayerSummaries` and
  `GetSteamLevel` were only called with the key.
- **Response nesting:** each file's `response` holds Steam's body, which has
  its own `response` object, so the data is at `response.response`.
- **Class filter works.** `community_item_classes[0]=<n>` returns only that
  class. Totals at capture time: 3 profile backgrounds 64,082; 8 profile
  themes 129 (items carry `profile_theme_id`, e.g. `GameProfile`); 13 mini
  profile backgrounds 1,352; 14 avatar frames 2,188; 15 animated avatars 3,274.
  The unfiltered list also has classes 0, 4, 11 and 17 (not MVP types).
- **Paging:** 100 items per page, with `next_cursor` for the next page.
- **Images and video:** catalogue items keep them in `community_item_data`
  (`item_image_small`, `item_image_large`, and for animated backgrounds
  `item_movie_webm`/`item_movie_mp4` plus `_small` variants). These are bare
  filenames; the CDN base URL still needs confirming (likely
  `…/steamcommunity/public/images/items/<appid>/<file>`). Equipped items use
  `items/<appid>/<file>` paths and `movie_*` field names instead.
- **Equipped items** for this profile: animated background, mini profile
  background and avatar frame; no animated avatar or theme equipped, so those
  slots came back empty.
- **Still to work out:** the Points Shop buy-link format (catalogue has
  `appid` and `defid`, which is probably what the link needs).
