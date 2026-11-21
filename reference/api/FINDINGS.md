# Steam API findings

What the raw JSON in this folder shows, and what has been checked against live
Steam. How to capture the JSON is in [README.md](README.md).

## Capture (21 Nov 2026, profile Fuzzycast, SteamID64 76561198220645184)

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
- **Equipped items** for this profile: animated background, mini profile
  background and avatar frame; no animated avatar or theme equipped, so those
  slots came back empty (`{}`).

## Image and video URLs (verified 21 Nov 2026)

**Base URL: `https://shared.fastly.steamstatic.com/community_assets/images/`**

| Source | Fields | Full URL |
|---|---|---|
| Catalogue (`QueryRewardItems`) | `community_item_data.item_image_small`, `item_image_large`, `item_movie_webm`, `item_movie_mp4`, `item_movie_webm_small`, `item_movie_mp4_small` (bare filenames) | `<base>items/<appid>/<file>`, using the item's top-level `appid` |
| Equipped (`GetProfileItemsEquipped`) | `image_small`, `image_large`, `movie_webm`, `movie_mp4`, `movie_webm_small`, `movie_mp4_small` (already `items/<appid>/<file>`) | `<base><path>` |

Code: `assetUrl()` and `catalogueAssetUrl()` in `src/lib/steam/assets.ts`.

How it was confirmed:

- **Steam's own code uses it.** The Points Shop page config sets
  `MEDIA_CDN_COMMUNITY_URL` to `https://shared.fastly.steamstatic.com/community_assets/`,
  and the shop's JavaScript builds item images as
  `${MEDIA_CDN_COMMUNITY_URL}images/items/${appid}/${file}`.
- **Real requests returned 200** with the matching content type for every
  field of two items per type: static background (Golden Hour, Last Order),
  animated background (Amber Tide, Immersive Storylines 2026: jpg, webm, mp4
  and both `_small` videos), profile theme (Bayside Beasts, Dispatch: Mecha
  Man), mini profile background (Still Waters, Immersive Storylines 2026: jpg,
  webm, mp4), avatar frame (Collectible Card, Immersive Storylines 2026) and
  animated avatar (Battle Blob, Immersive Storylines 2026). All 10 asset paths
  in `GetProfileItemsEquipped.json` also returned 200.
- **Old hosts don't work.** The same files at
  `cdn.fastly.steamstatic.com` and `cdn.akamai.steamstatic.com` under
  `/steamcommunity/public/images/items/...` returned 404.
- Extensions seen: `.jpg`, `.jpeg` (one theme), `.png`, `.gif`, `.webm`, `.mp4`.

What the fields hold (checked on the files themselves):

- **Avatar frames:** `image_small` is the *animated* PNG (APNG, has an `acTL`
  chunk, ~0.5–1.2 MB); `image_large` is a small *static* PNG. Despite the
  names, the animated one is `image_small`.
- **Animated avatars:** `image_small` is an animated GIF; `image_large` is a
  static JPG.
- **Animated backgrounds:** `item_image_large` is a static JPG poster frame;
  the video is in the `movie_*` fields.

## Points Shop buy links (verified 21 Nov 2026)

**There is no URL that opens one specific item.** The closest working link is
the item's game page in the shop:

`https://store.steampowered.com/points/shop/app/<appid>`

Code: `pointsShopAppUrl()` in `src/lib/steam/pointsShop.ts`.

How it was confirmed:

- **The shop's router has no item route.** Its JavaScript defines only
  `/points/shop/app/:appid`, `/points/shop/app/:appid/cluster/:clusterindex`,
  category pages (`/points/shop/c/<name>`), `/points/shop/bundle/<bundleid>`
  and `/points/shop/event/<name>`. Nothing takes a `defid`.
- **Clicking an item doesn't change the URL.** In a headless browser, clicking
  an item on its game page opens the purchase dialog for that item, and the
  URL stays `/points/shop/app/<appid>`.
- **Game pages list the right items.** Loaded and clicked through for Golden
  Hour (app 2986370, static background), Amber Tide (3095380, animated
  background), Battle Blob (4197900, animated avatar) and Bayside Beasts
  (4197880, profile theme). Each page listed the item and the dialog showed
  its name and type.

Not checked: whether a game page with a lot of items hides some behind a
"show more" cluster, and whether the page behaves differently when signed in.

## Network hosts this needs

The steam-profile-studio cloud environment had to allow
`shared.fastly.steamstatic.com`, `store.steampowered.com` and
`store.fastly.steamstatic.com` for these checks. The browser will load assets
from `shared.fastly.steamstatic.com` directly, so `next.config.ts` image
settings (if `next/image` is used) will need that host too.

## Profile theme (verified 21 Nov 2026)

`IPlayerService/GetProfileCustomization/v1?steamid=<id>` works without a key
and returns `profile_theme: { theme_id: "Steel" }` for Fuzzycast, matching the
`SteelTheme` class on the real profile page's `<body>`. Steam's theme classes
only set CSS variables (header and content gradients, showcase header and
button colours); their values are in `src/lib/steam/themes.ts`, copied from
Steam's `profilev2.css`. Points Shop theme items carry the same id in
`community_item_data.profile_theme_id`; `GameProfile` has no colour scheme of
its own. The same response also lists showcase slots (`customizations`),
useful for the showcases stretch goal. Raw JSON:
`GetProfileCustomization.nokey.json`.
