# steam-profile-studio

A web app where you paste a Steam profile and preview it with different Steam Points Shop items (backgrounds, avatar frames, animated avatars, profile themes) or your own custom artwork, with links to buy each item in the Points Shop.

Owner: Ronin (Melbourne, AUD, metric). If you're about to guess at something that matters (a design choice, an API behaviour, scope), ask Ronin first.

## Decisions (locked 21 Nov 2026)

- **Stack:** Next.js (App Router) + TypeScript, deployed on Vercel from GitHub (`steam-profile-studio`).
- **Profile input:** paste a profile URL, vanity name or 64-bit SteamID. No Steam sign-in.
- **MVP item types:** profile backgrounds (static and animated), avatar frames, animated avatars, profile themes.
- **Stretch goal:** profile showcases. They aren't in the Web API, so they need the public profile HTML scraped and each showcase type rebuilt by hand.
- **Fidelity:** pixel-perfect against Steam's real profile page. Build by measuring against reference screenshots in `/reference`, not from memory.
- **Custom art:** preview-only. Use in-browser object URLs. Nothing is uploaded or stored.
- **Audience:** public shareable link, so:
  - the Steam API key lives only in server code (`STEAM_API_KEY` in `.env.local` and Vercel env vars) and never reaches the browser;
  - cache Steam responses server-side (catalogue for about 24 h, profiles for about 10 min) to stay well within rate limits.
- **Styling:** CSS Modules by default, because exact pixel matching is easier with plain CSS. Ask Ronin before switching to Tailwind or a UI kit.

## MVP "done" definition

Paste a public profile → it renders like Steam's profile header (name, avatar, level, background, frame, theme) → browse Points Shop items → click one and see it applied live → each item has a working "Buy in Points Shop" link → upload your own image into the background/avatar slot.

## Data sources (verify each before building on it)

| Need | Source | Notes |
|---|---|---|
| Vanity name → SteamID | `ISteamUser/ResolveVanityURL/v1` | needs key |
| Name, avatar, profile URL | `ISteamUser/GetPlayerSummaries/v2` | needs key |
| Steam level | `IPlayerService/GetSteamLevel/v1` | needs key |
| Currently equipped items | `IPlayerService/GetProfileItemsEquipped/v1` | undocumented; works without a key (verified 21 Nov). Asset paths are `items/<appid>/<file>` |
| Profile theme (and showcase slots) | `IPlayerService/GetProfileCustomization/v1` | undocumented; works without a key (verified 21 Nov). `profile_theme.theme_id` (e.g. `Steel`) → Steam's `<id>Theme` body class; colours in `src/lib/steam/themes.ts` |
| Points Shop catalogue | `ILoyaltyRewardsService/QueryRewardItems/v1` | undocumented; works without a key. `count` 100–1000, filter with `community_item_classes[0]=<n>` (3 background, 8 theme, 13 mini background, 14 frame, 15 animated avatar), page with `next_cursor`. Images/videos are bare filenames in `community_item_data` |
| Buy links | `https://store.steampowered.com/points/shop/app/<appid>` | verified 21 Nov: **no per-item link exists**; this game page lists the item and the user clicks it. `pointsShopAppUrl()` |
| Image/video URLs | `https://shared.fastly.steamstatic.com/community_assets/images/` | verified 21 Nov: catalogue → `items/<appid>/<file>`, equipped → `<path>`. `assetUrl()`, `catalogueAssetUrl()`. Old `cdn.*/steamcommunity/public/images` paths 404 |
| Showcases (stretch) | public profile HTML (`steamcommunity.com/profiles/<id>/?l=english`); `GetProfileCustomization` only gives type numbers and order | verified 21 Nov, see `reference/html/SHOWCASES.md`. Only for public profiles. The site rate-limits fast (429), so always go through the cached `getShowcases()` |
| Profile page CSS values | Steam's `profilev2.css`, `shared_global.css` | Ronin okayed reading them (21 Nov) for exact numbers; don't commit the files. Motiva Sans is licensed: never self-host it |

First step on the data side: write a small script that calls each endpoint for Ronin's own profile and saves the raw JSON to `/reference/api/` so the real data shape is known before any types are written. Done: see `reference/api/FINDINGS.md`.

## Architecture sketch

- `src/app/api/profile/route.ts`: parse the input, resolve the SteamID, fetch summary, level and equipped items, return one normalised object. Cached.
- `src/app/api/profile/showcases/route.ts`: `?id=<steamid64>`, the parsed showcases and right-hand column (`sidebar`: status, awards, badges, counts, groups, top friends, plus the header's favourite badge) from the public profile page (`src/lib/steam/showcases/`). Separate so the header never waits on it. Cached. Friends show with real names and avatars, as on Steam (Ronin's call, 21 Nov: no hide toggle).
- `src/app/api/items/route.ts`: fetch and normalise the Points Shop catalogue by item type. Cached.
- `src/lib/steam/`: typed fetch helpers, one per endpoint, plus input parsing (`/id/<vanity>`, `/profiles/<steamid64>`, a bare 17-digit ID, a bare vanity name).
- `src/components/ProfilePreview/`: layered render, from the bottom up:
  1. page/theme colours
  2. profile background (image, or looping muted video for animated)
  3. avatar (static or animated)
  4. avatar frame overlay
  5. name, level badge
- `src/components/ItemBrowser/`: tabs per item type, search, click to apply, buy link.
- `/reference/`: Steam screenshots of real profiles at 100% zoom and raw API JSON. This is the source of truth for pixel matching.

## Schedule

- **Sat 21 Nov (setup):** Node.js, Steam API key, Vercel account, scaffold, blank page live on Vercel, raw API JSON captured.
- **Sat 28 Nov:** profile fetch, header rendering pixel-matched to the reference shots.
- **Sun 29 Nov:** catalogue browser, live preview, buy links, custom art upload. Wrap up with something usable by 6pm.

## Progress tracking

Ronin's Notion page "Steam profile customiser" (Home / Projects) is how his assistant Muse checks on this build. At the end of every session:

- If Notion is connected: re-fetch the page, then **append** a dated line to the Progress log (what was built, what's working, what's next, blockers). Never edit or delete earlier lines. Update **Next step**, add repo and Vercel links once they exist, and set Status to Done only when the MVP definition above works end to end.
- If Notion isn't connected: give Ronin that line at the end of the session so he can paste it in.
