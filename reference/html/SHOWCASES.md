# Profile showcases: research and build plan

Research for the showcases stretch goal (see CLAUDE.md). Everything marked
**verified** was checked against live Steam on 21 Nov 2026 from the
steam-profile-studio cloud environment. Anything not verified says so.

Files in this folder:

| File | What it is |
|---|---|
| `fuzzycast-profile.html` | Fuzzycast's public profile page as an anonymous visitor sees it, `?l=english`, captured 21 Nov 2026. Friends list and comments redacted (names, avatars, links, account ids, comment text, timestamps); everything else is byte-for-byte what Steam served |
| `../../scripts/capture-profile-html.mjs` | Re-captures a profile with the same redaction. Refuses to save if any friend or commenter name survives |

## 1. Getting the data

**steamcommunity.com is reachable** from this environment (verified). Both URL
forms work: `/profiles/<steamid64>/` answers with a 302 to `/id/<vanity>/` when
the profile has a custom URL, and the page itself is plain server-rendered
HTML. **No JavaScript needs to run**: every showcase is in the HTML Steam sends.

Things to know before building on it:

- **Add `?l=english`.** Labels ("Game Collector", "Achievements") are
  localised. Without it the server's region or the `Accept-Language` header
  decides the language.
- **Rate limit (verified, roughly).** After about five quick requests the
  site answered **HTTP 429**. On a second day of testing (21 Nov, during the
  build) the same cloud IP got 429 again after only 2 to 4 requests spread
  over a few minutes, and stayed limited for several minutes. The exact limit
  is unknown and seems to depend on recent traffic from the IP. Caching per
  profile and treating 429 as "showcases unavailable right now" handles it,
  but **check it from Vercel**: its servers share IP addresses, so the
  limit may be hit more often there.
- **Anonymous view differs from the reference screenshot**, which was taken
  signed in as the owner:
  - The owner sees a **"+ 2" tile** under the Artwork showcase's small images
    (the 4 shown out of 6 artworks). The anonymous HTML has **no such tile**.
    Steam's CSS has a class for it (`.screenshot_showcase_smallscreenshot.screenshot_count`,
    57px tall, `#222223` background), but I couldn't confirm when Steam
    includes it, so I haven't recorded its markup.
  - The owner sees **"+ Add a Showcase"**, an **Edit Profile** button and a
    comment box. Visitors don't, so the preview should leave them out.
- **Image host blocked for checks.** Artwork images are on
  `images.steamusercontent.com`, which this cloud environment's proxy refuses
  (403). Browsers load it fine; this only stops a cloud thread from fetching
  or screenshotting artwork to compare pixels. **Please allow
  `images.steamusercontent.com`** in the environment before Artwork is built.
  Every other showcase image is on `shared.fastly.steamstatic.com` or
  `community.fastly.steamstatic.com`, both allowed (checked one of each type:
  all 200).

### `GetProfileCustomization` gives the skeleton, the HTML gives the content

`IPlayerService/GetProfileCustomization/v1` (no key, already called by
`getProfile()`) lists each showcase's **type number** and **slot contents**.
For Fuzzycast its 7 entries are in the **same order** as the 7 showcases on
the page (verified). The type numbers are Steam's `EProfileCustomizationType`
enum, from Valve's own protobuf definitions as published by SteamDatabase
(`github.com/SteamDatabase/Protobufs`, `steam/enums.proto`); all 7 match.

| Type | Showcase | Slot data in the API | Enough to render? |
|---|---|---|---|
| 13 | Artwork | `publishedfileid` ×4 | No: no image URL, title or count |
| 2 | Game Collector | `appid` ×12 | No: no Games/DLC/Reviews/Wishlist counts or capsule URLs |
| 15 | Favourite Guide | `appid`, `publishedfileid` | No: no title, author, rating or image |
| 23 | Completionist | `appid` ×4 | No: no counts, rare counts or completion stats |
| 24 | Steam Replay | `replay_year: 2025` | No: no stats at all |
| 17 | Achievement | `appid` + `title` (e.g. `1_20`, looks like an internal achievement index, unconfirmed) ×7 | No: no icon, name or rarity |
| 5 | Badge Collector | 6 empty slots (`{slot: n}` only) | No: not even which badges |

So the API is good for **which showcases, in what order**, and the HTML is
needed for **everything shown**.

## 2. Showcase catalogue: how each one is marked up

Every showcase sits inside `div.profile_leftcol > div.profile_customization_area`
and has this shell (verified, all 7):

```html
<div class="profile_customization [extra]">
  <div class="profile_customization_header">Title</div>   <!-- title text may have surrounding whitespace -->
  <div class="profile_customization_block">
    <div class="<type-specific root>"> … </div>
  </div>
</div>
```

Shared pieces used by several showcases:

- `div.showcase_content_bg` is a dark rounded panel.
- `.showcase_stats_row > .showcase_stat > .value + .label` is the row of big
  numbers (an `<a>` when it links somewhere, a `<div>` when it doesn't; stats
  can carry `data-tooltip-text`).
- `.showcase_slot` is any filled slot. Steam's CSS also has `.openslot` for
  empty ones (owner-only, unconfirmed).
- `<div style="clear: inline-start;">` / `clear: both` spacer divs: float
  layout, no content.

The parser should identify a showcase by its **type-specific root class**, not
by the header text (the text is localised and, for Replay, includes the year).

### Artwork Showcase (type 13), `.profile_customization.myart`

- **Header is hidden.** The HTML has `Artwork Showcase` in the header, but
  Steam's CSS sets `.profile_customization.myart .profile_customization_header
  { display: none }`. That matches the screenshot, where the artwork sits
  straight under the profile header with no title bar.
- Root: `div.screenshot_showcase`
  - `div.screenshot_showcase_primary.showcase_slot`: one large image
    - `a.screenshot_showcase_screenshot[data-appid][data-publishedfileid][href]`
      `> img[src]` with inline `style="max-width: 480px;"`. `src` is
      `images.steamusercontent.com/ugc/…/?imw=480&imh=480&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true`
      (Steam's resizer letterboxes it to fit 480×480 on black).
    - `div.screenshot_showcase_itemname`: the artwork's title (`_` here).
    - `div.screenshot_showcase_stats`: empty here (Steam's CSS has
      `.screenshot_showcase_stat` and a favourite icon for when it isn't).
  - `div.screenshot_showcase_rightcol`: up to 3 × `div.screenshot_showcase_smallscreenshot.showcase_slot > a > img`
    with `?imw=100&imh=80…` (100×80 letterboxed).
- Total artwork count is **not** in this showcase; the sidebar has
  `Artwork 6` (`profile_count_link`).

### Game Collector (type 2), root `div.gamecollector_showcase`

- `div.showcase_content_bg.showcase_stats_row`: 4 stats, all links: Games
  (394), DLC (272), Reviews (69), On Wishlist (99). The Reviews and Wishlist
  stats sit at a different indent from the first two, which suggests
  Steam's template only adds them sometimes (unconfirmed), so treat them as
  optional.
- `div.showcase_bodylabel`: "Featured Games".
- `div.showcase_gamecollector_games`: 12 × `div.showcase_slot.showcase_gamecollector_game > a[href=/app/<appid>] > img.game_capsule`.
  Images are the store's `capsule_184x69.jpg` on `shared.fastly.steamstatic.com/store_item_assets/steam/apps/<appid>/[<hash>/]capsule_184x69.jpg?t=…`.
  Note the optional hash folder: the URL **can't be built from the appid
  alone**, so take it from the HTML.
- The API's 12 appids match the 12 capsules, in order (verified).

### Favorite Guide (type 15), root `div.favoriteguide_showcase`

Steam spells the header "Favorite Guide".

- `div.showcase_content_bg > div.workshop_showcase_item.showcase_slot`
  - `a.ugc[data-appid][data-publishedfileid] > img.workshop_showcase_item_image`:
    preview on `images.steamusercontent.com`, `?imw=160&imh=160…` letterboxed.
  - `div.workshop_showcase_item_details`
    - `.showcase_item_detail_title > a.whiteLink`: title (fancy Unicode text here, so the font fallback matters).
    - `.guide_showcase_contributors`: "Created by - " + author link(s) with `data-miniprofile`.
    - `.guide_showcase_appinfo > .workshop_showcase_stars`: a star image
      (`community.fastly.steamstatic.com/public/images/sharedfiles/4-star.png?v=2`)
      and "110 ratings".
    - `.workshop_showcase_app`: game icon (`shared.fastly…/community_assets/images/apps/<appid>/<hash>.jpg`) + game name link.
    - `.guide_showcase_item_description`: description text.

### Completionist Showcase (type 23), root `div.showcase_achievementscompletionist_games`

- `div.showcase_content_bg.showcase_achievementscompletionist_slots`: 4 ×
  `div.showcase_slot.showcase_achievementscompletionist_game` (one also has
  `app_has_adult_content`) `> a[href=/achievements/<appid>]`
  - `img.game_capsule`: the store `header.jpg` (same optional hash folder).
  - `div.showcase_achievementscompletionist_game_bar`
    - `.showcase_achievementscompletionist_game_ribbons > span.showcase_completion_ribbons > span.showcase_completion_ribbon_group.base > span.showcase_completion_ribbon`:
      the trophy. It's **pure CSS**: a background SVG
      (`community.fastly…/public/images/profile/achievement_trophy.svg`), with
      `.dlc`, `.empty` and `.stacked` variants for DLC sets and extra trophies
      (seen only in CSS, not on this profile).
    - `.showcase_achievementscompletionist_game_counts > .num_achievements`
      ("42 Achievements", "1 Achievement") and optional `.subtitle` ("35 RARE").
- Second `div.showcase_content_bg.showcase_stats_row`: Completed Games (5),
  Completed Sets (5), Avg. Game Completion Rate (28%), each with a tooltip.

### Steam Replay (type 24), `div#replay_showcase_<year>.profile_customization.replay_showcase`

- **Preceded by an inline `<style>` block** (sibling of the showcase) with
  all of its layout CSS: grid, `mix-blend-mode`, masks, a rotated collage,
  per-year gradients `.replay_background_gradient_2022`…`_2025`, and
  `@container` breakpoints. The parser must skip that `<style>` and the
  renderer must rebuild it.
- Block: `div.profile_customization_block.replay_showcase_block > a[href=store.steampowered.com/yearinreview/<steamid>/<year>…] > div.replay.replay_background_gradient_<year>#replay`
  - `div.background_ctn > div.background_img_ctn`: **120** `img.xsmall_capsule_background`
    store `header.jpg`s (60 games repeated twice), rotated −22.5° and faded
    as a backdrop. The class (`xsmall_`/`small_`/`mid_`/`large_capsule_background`,
    `single_game_background`) presumably depends on how many games were
    played; only `xsmall` is seen here.
  - `div.games_played_ctn > div.big_stat` (95) + `.games_played_title` ("Games Played").
  - 3 × `div.stat_ctn.{sessions|achievements|new_games} > div.mid_stat.normal` (703, 448, 60) + a bare text label. The CSS has `high_num`/`really_high_num` size variants.
  - `div.most_played_ctn > .most_played_images_ctn`: 5 × `.most_played_app > img.most_played_capsule` (`library_600x900.jpg` or `library_capsule.jpg`, shown at 71×106) + `.most_played_percent` (18%, 9%, …).

### Achievement Showcase (type 17), root `div.achievement_showcase`

- `div.showcase_content_bg`: 7 × `div.showcase_slot.showcase_achievement[data-tooltip-html]`
  `> a[href=/achievements/<appid>] > img` (icon on `shared.fastly…/community_assets/images/apps/<appid>/<hash>.jpg`).
  - Rare ones (< 10% of players) have class **`rare`** and an extra
    `div.achievement_glow_container_root > .achievement_glow_container > .achievement_glow`
    before the link. That glow is **CSS-animated** (`@keyframes achievement_glow_rotate`,
    6s and 18s spins) and masked with `achievement_square_mask.png` /
    `achievement_star_mask.png` from `community.fastly…/public/images/profile/`.
  - `data-tooltip-html` (HTML-escaped) holds the **name**, optional
    **description**, game name and capsule, and "9.3% of players have this".
    So names and rarity are scrapeable too; the preview only needs them for hover.
- `div.showcase_content_bg.showcase_stats_row`: Achievements (3,470) and
  Rare Achievements (346), plain `<div>`s with tooltips. Other stats
  (e.g. perfect games) presumably appear conditionally (template whitespace),
  unconfirmed.

### Badge Collector (type 5), root `div.badge_showcase`

- `div.showcase_badges_icons`: 6 × `div.showcase_slot.showcase_badge[data-tooltip-html="Sophomore<br>\nLevel 2 Goodbye Volcano High Badge"]`
  `> a[href=/gamecards/<appid>] > img.badge_icon` on
  `shared.fastly…/community_assets/images/items/<appid>/<hash>.png`.
  Badge name and level are only in the tooltip text.
- `div.showcase_content_bg.showcase_stats_row`: Total Badges Earned (84),
  Game Cards (243), both links.
- The API returns 6 empty slots for this showcase, so the HTML is the
  **only** source of which badges are shown. (Badge Collector shows the
  rarest badges automatically; unconfirmed, but it fits the empty slots.)

### Other showcase types (not on this profile)

From `EProfileCustomizationType` (Valve's protobufs, see above). The CSS
class families are what Steam's `profilev2.css` defines and are **hints
only**: I haven't seen their markup, so each needs a real profile captured
before a parser is written.

| Type | Enum name | Likely root class (from CSS, unconfirmed) |
|---|---|---|
| 1 | RareAchievementShowcase | `.achievement_showcase`? (older version of 17) |
| 3 | ItemShowcase | `.item_showcase`, `.item_showcase_item` |
| 4 | TradeShowcase | `.trade_showcase`, `.trade_showcase_items`, `.showcase_stats_trading` |
| 6 | FavoriteGame | `.favoritegame_showcase`, `.favoritegame_showcase_game` |
| 7 | ScreenshotShowcase | `.screenshot_showcase` (same as Artwork) |
| 8 | CustomText (Custom Info Box) | `.customtext_showcase` |
| 9 | FavoriteGroup | `.favoritegroup_showcase_group`, `.favoritegroup_*` |
| 10 | Recommendation (Review) | `.recommendation_showcase` |
| 11 | WorkshopItem (Favourite Workshop item) | `.workshop_showcase_item`, `.workshop_showcase_*` |
| 12 | MyWorkshop | `.myworkshop_showcase_header`, `.workshop_showcase_multiitem` |
| 14 | VideoShowcase | `.screenshot_showcase` + `.play_video_icon`? |
| 16 | MyGuides | `.myguide_showcase_item*` |
| 18, 19 | Greenlight, MyGreenlight | retired with Greenlight; probably never seen |
| 20 | Salien | `.showcase_salien*` (2018 summer sale event) |
| 21 | LoyaltyRewardReactions (Points Shop awards) | `.awards_showcase`, `.showcase_award*` |
| 22 | SingleArtworkShowcase (Featured Artwork) | `.myart`? |

## 3. Rendering: can each one be rebuilt from the scraped HTML?

Yes. Every image the 7 showcases show is an **absolute URL in the HTML**, and
every number and label is text in the HTML. **No extra API calls are needed.**
What's left is CSS work:

| Showcase | Images from HTML | Needs rebuilding in CSS | Difficulty |
|---|---|---|---|
| Game Collector | 12 capsules | stats row, 4-column grid | Easy |
| Badge Collector | 6 badge PNGs | 6-icon row, stats row | Easy |
| Achievement | 7 icons | stats row, **rare glow** (two spinning layers + mask images) | Medium |
| Artwork | 1 large + 3 small (letterboxed by Steam) | two-column float layout, hidden header | Easy, but the image host is blocked here (see §1) |
| Favourite Guide | preview, star image, app icon | text layout | Easy–medium |
| Completionist | 4 header capsules | bar overlay, **trophy SVG** (+ dlc/stacked variants), stats row | Medium |
| Steam Replay | 120 + 5 capsules | grid, masks, blend modes, rotated collage, per-year gradients | Hard |

The CSS-only assets (trophy SVG, glow masks, star PNG) are on
`community.fastly.steamstatic.com`, so the browser can load them straight from
Steam the same way it loads item images. They don't need copying into the repo.

### Private profiles and hidden sections

- **Private profile (verified on one stranger's profile, nothing saved):**
  `<body class="… profile_page private_profile …">`, a `profile_leftcol` with
  **no `profile_customization_area`**, so no showcases to scrape.
  `GetProfileCustomization` for it returned no `customizations`, but that
  profile may simply have none, so I can't say whether the API hides
  showcases for private profiles.
- **Profile not set up:** page says "not yet set up"; no showcases.
- **Friends-only profiles** look private to an anonymous visitor (we never
  sign in), so treat them as private. Not separately verified.
- **Hidden sections** (private game details or inventory with a public
  profile): **not verified**, I didn't find such a profile. Expect Game
  Collector, Completionist and Badge Collector stats to be missing or zero.
  The parser should treat every stat and slot as optional.
- **What to show:** if the HTML has no showcase area, render the header only
  and a small note ("This profile's showcases are private"). Never fail the
  whole preview.

## 4. Build plan

### First 3 showcases

**Built 21 Nov 2026** (Ronin approved this plan): Game Collector, Artwork and
Badge Collector first, then (same day, same PR) Favourite Guide,
Completionist, Steam Replay and Achievement. All 7 showcase types on
Fuzzycast's profile are drawn, in `src/components/Showcases/` (Replay's CSS
in `Replay.module.css`, copied from the inline `<style>` in the page), parsed by
`src/lib/steam/showcases/parse.ts` and served by `/api/profile/showcases`.
Any other showcase type shows its title bar only, so the page order stays right.

Parser gotcha: node-html-parser's `classList` can pick up `class="…"` from
inside other attributes (Steam's achievement `data-tooltip-html` holds HTML),
so the parser reads the `class` attribute itself (`classes()` / `hasClass()`).

1. **Game Collector**: the most common showcase, very visual (a wall of
   capsules), simple markup, all images on an allowed host.
2. **Artwork**: the most visual and the first thing on Fuzzycast's profile,
   and its layout is simple. Needs `images.steamusercontent.com` allowed in
   the cloud environment so pixel checks can see the images. If you'd rather
   not allow it, swap in **Achievement** (medium: the rare glow).
3. **Badge Collector**: easy, and proves the stats row that Achievement and
   Completionist reuse.

Then Achievement → Completionist → Favourite Guide → Replay (hardest last).

### Parser

- New folder `src/lib/steam/showcases/`:
  - `fetchProfileHtml(steamId)`: `GET https://steamcommunity.com/profiles/<id>/?l=english`,
    server-only, 10 s timeout; 429 → `SteamError(503)`. Cached with the
    existing `profile` cache life (`"use cache"` + `cacheLife("profile")`, ~10
    min), so one profile costs Steam at most one page load per 10 min.
  - `parseShowcases(html)`: finds `.profile_customization_area`, walks its
    direct `.profile_customization` children (skipping `<style>`), and hands
    each to a per-type parser chosen by its root class. Returns
    `Showcase[]`, a TypeScript union (`{ kind: "gameCollector", stats, games }`, …).
    Unknown types become `{ kind: "unknown", title }` so a new Steam showcase
    never breaks the page.
  - One file per type (`gameCollector.ts`, `artwork.ts`, …), each with a
    Vitest test that parses `reference/html/fuzzycast-profile.html` and checks
    the exact values listed above (394 Games, 12 capsules, …).
  - The server sends only this parsed JSON to the browser, never Steam's raw
    HTML.
- **HTML parsing library: your call.** There's no HTML parser in the project
  yet. I'd add **`node-html-parser`** (small, no dependencies, server-only).
  Regexes would work for this capture but break easily when Steam changes
  whitespace. `cheerio` is the bigger, jQuery-style alternative.

### How it fits `/api/profile`

Keep `/api/profile` as it is (fast: Web API calls only) and add
**`/api/profile/showcases?id=<steamid64>`** with the same 10-minute cache and
CDN headers. The preview calls it after the header has loaded, so a slow
page fetch or a 429 from Steam only delays or hides the showcases, never the
header. It takes the SteamID64 that `/api/profile` already resolved, so vanity
names aren't resolved twice. (Folding showcases into `/api/profile` would be
one request fewer, but would make the header wait on the slowest part.)

`getProfile()` already calls `GetProfileCustomization`. The showcase route can
use the same cached call to check that the HTML's showcase count and order
match the API's types, and log a warning when Steam's markup drifts.

### Staying pixel-matched to `reference/screenshots/fuzzycast-full-1725w.png`

- **Numbers come from Steam's CSS**, not from guesses: `profilev2.css`
  (the `showcase_*`, `profile_customization*` and `achievement_glow*` rules)
  and the Replay inline `<style>` in the capture. Read, not committed, as
  agreed. The Replay CSS is part of the profile HTML, so it is already in
  `fuzzycast-profile.html`.
- **Positions in the screenshot** (showcase header bars, 40 px tall each,
  measured at x = 395): Game Collector 887, Favorite Guide 1284,
  Completionist 1574, Steam Replay 2147, Achievement 2427, Badge Collector
  2688; Recent Activity 3044. Artwork has no header and fills the space
  above Game Collector. Header bars run from about x = 375 to 1038. (These
  are rough edges from a colour scan; the build should measure each one
  exactly.)
- **Check each showcase with Playwright**: render the preview for Fuzzycast at
  the same window width as the screenshot (1725 px), crop the showcase, and
  diff it against the same crop of the reference. Use the anonymous view
  (no "+ 2" tile, no "Add a Showcase") and expect those owner-only bits to
  differ.
- **Fonts**: as in the header, Motiva Sans is used only if the viewer has it
  installed (it's licensed, so it's never self-hosted); otherwise Arial.
  Where Steam leaves text at line-height "normal", the showcase CSS sets a
  line height measured from the reference, so boxes are the same height in
  either font. Only the letter shapes and widths differ.
- **Result for the other 4 (21 Nov 2026)**: Completionist 561px, Steam
  Replay 268px and Achievement 249px tall, the same as the screenshot; capsules
  and achievement icons match pixel for pixel, and Replay differs only in its
  bold text. Two known differences: the **Favorite Guide** is 30px shorter here
  because its title is written in fancy Unicode letters that neither Motiva nor
  Arial has, so the browser picks a system font for them, and the one in the
  cloud test browser is narrower than the one on the Windows PC that took the
  screenshot, so the title fits on one line instead of two (on the same
  computer as Steam, it should wrap the same way). And the **adult-content
  capsule** in Completionist is blurred, because that's what Steam shows
  visitors (the screenshot was taken signed in as the owner).
- **Result for the first 3 (21 Nov 2026)**, at 1725px wide against the
  reference: Artwork box 531px tall, Game Collector 385px, Badge Collector
  249px, all exactly as in the screenshot. The Favorite Guide header lands
  on the same row (1284px). Capsules and badge icons match pixel for pixel;
  the remaining differences are the Arial text and the animated artwork GIF
  being on a different frame.

### Not confirmed (needs a real example before building)

- When the Artwork "+ N" count tile appears.
- Markup for the 17 showcase types not on this profile.
- How hidden game details or inventory change the stats rows.
- Whether `GetProfileCustomization` hides showcases on private profiles.
- The exact 429 limit for steamcommunity.com.
