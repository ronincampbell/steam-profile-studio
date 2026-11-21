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

## Findings

What the captured data shows, and what has been verified against live Steam, is in
[FINDINGS.md](FINDINGS.md).
