# Artwork that lines up with your background: research and plan

**The feature:** pick a profile background, pick an artwork layout, and the app gives you
the pieces ("chunks") of the background that sit behind each artwork slot. You paint over
them in Photoshop, upload them to Steam as artwork, and they line up with the background,
the way Ronin's "NO SIGNAL / FUZZYCAST" GIF uses the middle of *Glitch Sansui-zu*.

Researched 21 Nov 2026. No app code was changed.

**How to read the tags:**
- **C** means confirmed, and the source is given: a file and line, a Steam CSS rule, a
  measurement, or a URL.
- **I** means inferred: it's my best reading of the evidence, not tested.

**Where the numbers come from:**
- Steam's `profilev2.css` and `shared_global.css`, fetched from `community.fastly.steamstatic.com`
  into the scratchpad only. They are not in the repo.
- Playwright and Chrome rendering `reference/html/fuzzycast-profile.html` with Steam's
  own CSS, at window widths 1000, 1280, 1725, 1920 and 2560px.
- `reference/screenshots/fuzzycast-full-1725w.png`.
- Ronin's artwork files, downloaded from `images.steamusercontent.com`, which is now
  reachable from the cloud environment.
- One other public profile that uses the "long artwork" trick. It was fetched once,
  anonymously, and not saved; its name is withheld here.

---

## 1. The short version

1. On a normal desktop browser window **between 910 and 1920px wide**, the background and
   the profile column are both centred and drawn at 1:1. So every slot sits at a
   **fixed pixel position on the background image**, whatever the window width. **C**
   (Playwright: the slot's offset from the background was the same at 1000, 1280, 1725 and
   1920px)
2. A chunk is a plain crop of the 1920×1080 background at that position, exported at
   **exactly the slot's size (1×)**. **C** (see §4)
3. The **horizontal position never changes**. The **vertical position depends on everything
   above the showcase**. If the aligned showcase is the **first showcase**, its top is fixed
   at background y = 256. Recommend: always put it first.
4. Windows **wider than 1920px** scale the background up but not the column, so alignment
   drifts. That's Steam's behaviour and can't be fixed by us. The app should warn about it
   but nothing more. **C** (CSS rule, and measured at 2560px)
5. Steam shows artwork in **two modes**:
   - **Normal:** the big image is fitted into a 480×480 box and the 3 small tiles into
     100×80 boxes, with black bars if the shape doesn't match.
   - **Long:** the big image is 506px wide and the side tile 100px wide, both at full
     height. This is what the community "long artwork" upload trick gets you.

   Both are **C** (measured on live HTML and Steam's image server).

---

## 2. Which layouts can line up with a background

| Layout | Slots that show uploaded images | Worth supporting? |
|---|---|---|
| **Artwork Showcase, normal** (type 13) | 1 big (480×480 box) + up to 3 small (100×80 boxes) | **Yes, v1.** Ronin's own layout. **C** |
| **Artwork Showcase, long** (type 13, uploaded with the console trick) | 1 big 506×H + 1 side 100×H (H = image height, e.g. 824 or 928) | **Yes, v1.** The most common "seamless" community style. **C** for how it displays; **I** for the trick that triggers it |
| **Featured Artwork Showcase** (type 22) | 1 full-width image, box 632px wide (630 inside the border) | Later. CSS **C** (`.screenshot_showcase_primary.single { width:100% }`). Steam's image request size is unknown (**I**): community guides say "about 630px wide" ([guide](https://macmyths.com/steam-artwork-showcase-guide/)). Needs one real profile captured first |
| **Screenshot Showcase** (type 7) | Same markup as Artwork (normal and long seen), but it has a title bar | Later. Same geometry shifted down 45px (see §3). **C** (second profile: 506×824 + 100×824 screenshots). Images have to be uploaded as *screenshots* (Steam client, or the "screenshot trick"), which is more fiddly |
| **Favorite Guide / Favorite Workshop Item** (types 15, 11) | One 160×160 letterboxed preview image beside text | Low value: small, and surrounded by text. CSS **C**, position not measured |
| **My Workshop / My Guides** (types 12, 16) | Up to 5 small previews, each 20% of the row | Low value. Needs a real capture. **I** |
| Video, Game Collector, Badges and so on | Steam's own images, not yours | No |

The **"workshop trick" and "screenshot trick"** are the same idea: you use the artwork
upload page and change a hidden form field so the file is filed as a Workshop item or a
screenshot. That lets the same pieces show in those showcases (**I**, community lore, not
tested). They're not needed for v1.

---

## 3. Geometry

### 3.1 How Steam places the background (all **C**, from `profilev2.css`)

| Rule | Effect |
|---|---|
| `div.profile_page.has_profile_background { background-position: center top }`, with `background-size: auto` under `@media (max-width:1920px)` | A static background is drawn at its **natural size** (catalogue backgrounds are 1920×1080: 8 of 8 sampled, **C**). It is centred horizontally, and its top edge is at the top of the profile area, just under Steam's menu bar |
| `.full_width_background { background-size: 100% }` above 1920px | Wider windows **stretch** the background to the window width |
| `.profile_animated_background > video { left:50%; transform:translateX(-50%); width:1920px }`, and `width:100%` above 1920 | The same for animated backgrounds: always shown 1920px wide, centred, until the window is wider than 1920. Ronin's video is 1920×1080 VP9 (**C**, ffprobe) |
| `.profile_content { width:952px; padding:12px; margin:0 auto }`, `.profile_leftcol { width:652px }` | The column is **976px wide and centred**: fixed, never scaled |
| `@media (max-width:910px)` with `html.responsive …` | Below 910px the mobile layout takes over (padding is removed and the columns change), so **alignment is lost**. The desktop page also has `class="responsive"` (fuzzycast HTML, line 3), so this applies to narrow desktop windows too |
| `div.profile_page { min-width:950px }` | Between 910 and 976px you get a horizontal scrollbar, but the layout doesn't change |

Measured with Playwright: background-image x of the big image's left edge. **C**

| Window width | 1000 | 1280 | 1725 | 1920 | 2560 |
|---|---|---|---|---|---|
| Big image, x on the background | 508 | 508 | 508 | 508 | 621 (and shown at 0.75 scale) |

**Steam client:** it uses the same web page in a built-in browser, so the same rules apply to
the client window's width (**I**). Steam Deck and Big Picture have their own theme rules
(`SteamDeckTheme`, `GamepadMode` in `profilev2.css`), so they are out of scope.

### 3.2 Slot positions, in background-image pixels

The origin is the top-left of the 1920×1080 background. This assumes the aligned showcase is
the **first showcase**, the standard 224px header, and a window 910–1920px wide.

| Slot | x | y | width × height | Source |
|---|---|---|---|---|
| Profile column (outer) | 472 | 224 | 976 wide | **C** Playwright |
| Left column / showcase panel | 484 | 240 | 652 wide | **C** Playwright (`hdrs` at 1920: x 484, y 344−104) |
| **Normal: big image** | **508** | **256** | **480 × 480** | **C** Playwright, screenshot pixel scan (black border at screen x 397/904, y 359/840) |
| **Normal: small tile 1** | **1010** | **256** | **100 × 80** | **C** Playwright |
| **Normal: small tile 2** | **1010** | **349** | **100 × 80** | **C** (spacing 93 = 80 + 2 border + 11 margin) |
| **Normal: small tile 3** | **1010** | **442** | **100 × 80** | **C** |
| Title text under the big image | 494 | 741 | 19px line | **C** CSS + screenshot |
| **Long: big image** | **495** | **256** | **506 × H** | **C** Playwright on the second profile (x 495 at 1920) |
| **Long: side tile** | **1010** | **256** | **100 × H** | **C** same |
| Featured Artwork (single) | 495 | 256 | 630 × ? | CSS **C**, image size **I** |
| Screenshot Showcase, big image | 495 (long) / 508 (normal) | 301 if first | as above | **C**: 61px below the panel top (40 header + 20 padding + 1 border), measured |

Why the gaps:
- **Normal mode:** the big box is 508 wide, but Steam caps the image at 480
  (`style="max-width:480px"`, fuzzycast HTML line 766) and centres it. So there is a 13px
  strip of panel on each side of the image.
- **Long mode:** the image fills the box (`max-width:506px`).

These numbers are the same in the app's preview. It copies the same CSS
(`src/components/Showcases/Showcases.module.css`, `.screenshotPrimary` etc.), and
SHOWCASES.md records the Artwork box as 531px tall, matching the screenshot. In the app's
1000px-wide preview the background's left edge is at −460, the same as Steam at 1000px
(Playwright: big image at screen x 48 = 508 − 460). **C**

### 3.3 Vertical position: what moves it

Slot y = **240** (top of the first showcase) + the height of every showcase above it, plus
12px each (`.profile_customization { margin-bottom:12px }`), + **16** for Artwork (no title
bar, `.myart .profile_customization_block { padding-top:15px }` + 1px border) or **61** for
showcases with a title bar.

Things that change it:
- **Header:** `min-height:224px`. The summary is clipped to 57px (`.profile_header
  .profile_summary { height:57px; overflow:hidden }`), so a long bio **doesn't** move
  anything. **C**. Unusual header content, such as ban notices or a long status, might
  (**I**).
- **Showcases above:** their heights depend on fonts and wrapping. For example, the Favorite
  Guide title wraps differently by font (SHOWCASES.md). Artwork with ratings or comments gains
  a stats line (seen on the second profile: rating and comment icons under the big image).
  So any showcase **above** the aligned one can shift it by tens of pixels. **C**
- **Only owners see** the "+ N" tile and the "Add a Showcase" button (SHOWCASES.md §1). The
  "+ N" tile sits under tile 3, so it doesn't move the slots. **C**

**What this means for the app:**
- Default to "aligned showcase first", where y is fixed and safe.
- If Ronin chooses another position, measure y from the **live preview's DOM** (the slot
  `<img>`'s position relative to the background layer, divided by the `FitToWidth` zoom),
  not from constants, and warn that it can drift.

### 3.4 Height limit

Backgrounds are 1080px tall (**C**: Ronin's video 1920×1080, and 8 of 8 sampled static
backgrounds). Below y = 1080 the page is black (`background-color:#000`). So with the
showcase first:
- normal mode is fully covered (it ends at y 736);
- a long image can be up to **824px tall** (256 + 824 = 1080) before it runs past the
  background.

The app should fill anything past the background with black and say so.

---

## 4. Scale and export resolution

- **Steam resizes every artwork on its image server**, and the page asks for a fixed size.
  **C** (fuzzycast HTML lines 766 and 776, and a test against the server):
  - Normal big image: `?imw=480&imh=480&ima=fit&impolicy=Letterbox&letterbox=true`.
  - Small tiles: `?imw=100&imh=80…letterbox=true`.
  - Long mode: `?imw=506&&…letterbox=false` and `?imw=100&&…`, with no height (second
    profile).
- **Letterbox = exact box, padded black.** Asking for 480×480 from a 100×80 PNG returned a
  480×480 JPEG with black bars. So any shape other than 480×480 (normal big) or 5:4 (tiles)
  gets **black bars**. **C** (tested)
- **The exact size passes through untouched.** A 100×80 PNG asked for at 100×80 came back as
  the original PNG. Any other size came back as a **JPEG**, which is lossy. GIFs stay
  animated GIFs but are re-colour-quantised: Ronin's 480×480 GIF came back 36 frames and
  3.7 MB instead of 6.6 MB, mean difference 2.6/255. **C** (tested)
- **No hi-DPI version.** The `<img>` has no `srcset`, so a 2× screen just upscales the 480px
  file. The background video is also drawn at 1920 CSS px. **C** (HTML)
- **Recommendation: export at exactly 1×** (480×480, 100×80, 506×H, 100×H), as PNG for
  stills. Exporting at 2× gains nothing in the showcase and risks JPEG re-encoding. The only
  place a bigger file would show is the artwork's own page when someone clicks it. That
  could be an optional "also export 2× originals" checkbox, off by default.
- **The background is shown at 1:1** for windows up to 1920px, so a crop of the 1920px source
  is pixel-exact. **C**

---

## 5. Ronin's own example, measured

| Item | Finding | Tag |
|---|---|---|
| Screenshot ↔ background mapping | background pixel = screen pixel + (97, −104): window 1725 → (1920−1725)/2 = 97.5, and the menu bar is 104px. Matched on the screenshot's side strips, mean difference 2.0/255 | **C** |
| Big image as shown | screen x 411–891, y 360–840 → **background (508, 256)–(988, 736)**, 480×480 | **C** |
| His uploaded GIF | 480×480, 36 frames × 70 ms = **2.52 s** loop, 6.6 MB, `data-appid="767"`, title `_` | **C** (file, HTML) |
| What the GIF contains | A glitched, restyled copy of the background around that area. The best match is region (492, 254)–(996, 758) scaled to 480, about 5% zoomed out. No pixel-exact 1:1 match, because of the glitch effect and the rescale | **I** (image search, mean difference ~23/255) |
| His 3 small PNGs | Exactly 100×80, **pixel-exact 1:1 crops** of the background (difference ≤ 0.02/255), taken at x = **1022**, y = 350 and 443 (tile 1 is flat colour, so its position is ambiguous) | **C** |
| Where the tiles show today | x = **1010**, y = 349 and 442 | **C** |

**What this tells us:**
- Ronin's tiles are **12px to the right and 1px lower** than today's layout.
- His artwork IDs date from early 2021 (**I**), so Steam has most likely moved the showcase
  a little since then (**I**). It isn't noticed because the panel hides the real background.
  The column is 93% opaque (`--gradient-background: rgba(41,46,51,0.93)` for the Steel
  theme), so it's a "window" effect rather than a literal continuation.
- The app would export tiles from **x = 1010**, so they'd line up exactly today.
- **Lesson:** Steam's layout drifts over the years. Keep the slot numbers in one file
  (`layouts.ts`) and re-check them against a fresh capture now and then.

---

## 6. Animated backgrounds

The background is a looping muted video: Ronin's is 2.667 s at 24 fps (**C**). Steam artwork
is an image, and the accepted formats are reported as **PNG, JPG and GIF**. MP4 and WebM
aren't accepted (**I**: community posts, e.g. [1](https://steamcommunity.com/discussions/forum/1/6670425060413244336/)).

| Option | Pros | Cons |
|---|---|---|
| **A. One still frame** (the video's poster JPG, 1920×1080 on the same CDN with `access-control-allow-origin: *` (**C**), or a frame the user picks with a scrubber) | Simple, small files, exact | It doesn't move |
| **B. A cropped GIF per slot** (draw video frames to a canvas, encode in the browser) | Moves with the background | GIF has 256 colours and is large. The **size limit** is reportedly **5 MB** (it was 8 MB before Dec 2022; Ronin's 6.6 MB GIF predates that, [thread](https://steamcommunity.com/discussions/forum/1/6670425060413244336/), **I**). A 506×824 GIF of 64 frames will blow past it, so we'd need fps and colour reduction |
| **C. Cropped WebM/MP4 per slot** (for the user to make their own GIF in Photoshop or After Effects) | Full quality source for Ronin's own tools | Not uploadable as-is |

**The sync problem (C):**
- Every GIF starts when it loads and loops on its own clock.
- GIF frame delays are in 10 ms steps, and browsers treat delays under 20 ms as 100 ms.
- The background video loops on a different clock (2.667 s here, versus Ronin's 2.52 s GIF).

So animated pieces **will drift** against the background and against each other. The
practical fix is to choose motion that doesn't need to match exactly (glitch, sparkle,
overlays), or a still crop with animated overlays on top, which is what Ronin did.

**Recommendation:** v1 exports **A** (still, with a frame picker) plus **C** (the source clip
per slot). **B** comes later, with a size budget that keeps each file under 5 MB.

---

## 7. Export package

One zip (built in the browser; nothing is uploaded, as CLAUDE.md requires for custom art):

```
glitch-sansui-zu_artwork-normal.zip
  01_main_480x480.png        big slot
  02_tile1_100x80.png        small slots, top to bottom
  03_tile2_100x80.png
  04_tile3_100x80.png
  guide_1920x1080.png        the whole background with each slot outlined and labelled,
                             the profile column shaded, and "y depends on showcase order" noted
  layout.json                background id/URL, layout, mode, frame time, and each slot's
                             x, y, w, h in background pixels (for scripts or Photoshop)
  README.txt                 the upload guide below, filled in for this layout
  (optional) source/*.webm   per-slot clips for animated backgrounds
```

- **Layered template:** a **PSD** made with [`ag-psd`](https://github.com/Agamnentzar/ag-psd)
  would hold:
  - one 1920×1080 canvas with the background layer;
  - one group per slot (a clipping rectangle plus an empty "your art" layer);
  - guides on the slot edges.

  `ag-psd` writes layers and should write guides (**I**). This is the nicest option for
  Photoshop, but it adds a dependency, so it's an open question (§10). The guide PNG and
  JSON work in any program.
- **The `01_`…`04_` prefixes** keep the files in order, and §8 says which file goes in which
  slot.
- **Libraries:** `fflate` (small zip library). `gifenc` comes later, for option B. Both run
  in the browser and have no server cost.

---

## 8. Upload guide (in-app panel, and README.txt in the zip)

### 8.1 Steps

| # | Step | Tag |
|---|---|---|
| 1 | Sign in at steamcommunity.com **in a web browser** (the long trick needs the browser's developer console). Go to your profile → **Artwork** → **Upload**, or directly to `https://steamcommunity.com/sharedfiles/edititem/767/3/`. App 767 is the artwork "app" (Ronin's artworks carry `data-appid="767"`). | URL **I** (community guides); app 767 **C** (HTML) |
| 2 | Choose the file. **Upload the exact exported size**, so Steam doesn't rescale or JPEG it (§4). Keep each file **under 5 MB**. Use **PNG** for stills and **GIF** for animation. | sizes **C**; 5 MB **I** |
| 3 | **Title.** Only the big image's title shows on the profile, as a line under it. Ronin uses `_` (**C**, HTML line 769). Tile titles aren't shown (**C**: no title element). Suggested titles: the main piece `_`, tiles `SPS tile 1`, `SPS tile 2`… so you can tell them apart when picking. | **C** / suggestion |
| 4 | **Visibility: Public.** Otherwise visitors probably won't see it. Tick the agreement box and save. | **I** |
| 5 | **Long layout only:** before saving, open the browser console (F12) and paste the one-line snippet the guide shows, for example `$J('#image_width').val(1000).attr('id','');$J('#image_height').val(1).attr('id','');`. It changes two hidden form fields that tell Steam the image's size. Steam then treats it as a wide image and shows it at full height in the showcase. This is **unofficial**, and Steam can break it at any time. Only paste code you understand. The app shows it with that warning and never runs it for you. | display **C**; snippet and how it works **I** ([guide](https://macmyths.com/steam-artwork-showcase-guide/), forum posts) |
| 6 | **Upload order:** upload the tiles **last to first**, then the big image **last of all**. Reason: you choose each slot by hand in Edit Profile (step 7), so the order doesn't decide placement (**I**). But artwork lists are newest-first (**I**), so this order puts the big image at the top of the picker and leaves your Artwork tab reading main, tile 1, tile 2, tile 3. | **I**, Ronin to confirm |
| 7 | **Edit Profile → Featured Showcase → Artwork Showcase.** Click the big slot and pick `01_main`. Click the small slots **top to bottom** and pick tiles 1, 2, 3 (long mode: the one side tile). | slot order top-to-bottom **C** (HTML order = display order) |
| 8 | **Put this showcase first** (above Game Collector and the rest), or exactly where you placed it in the app's preview. Save. | why: §3.3 **C** |
| 9 | **Check it** in a private or signed-out window **between 910 and 1920px wide**. Wider windows stretch the background (§3.1). | **C** |

### 8.2 Things that can go wrong

- **Black bars around the image:** the file isn't the exact slot size or shape (§4).
- **Long art shows as a small letterboxed square:** step 5 wasn't applied, so re-upload
  with it.
- **Everything shifted down:** something above the showcase got taller. Move the showcase
  to the top, or re-export from the app with the real order.
- **"File too large":** re-export with fewer frames or colours (GIF).
- **Upload errors on valid files** are reported intermittently by Steam users
  ([thread, Mar 2024](https://steamcommunity.com/discussions/forum/1/4299321840539874202/)).
  Retry later.

---

## 9. UX flow and build plan

### 9.1 Flow

1. **Pick a background.** This already works: a Points Shop item, or the profile's own.
   Custom uploaded backgrounds also work for planning, but Steam can only equip Points Shop
   ones.
2. **Choose a layout:**
   - Artwork normal (1 + 3);
   - Artwork long (main + side, with a height slider from 80 to 824px);
   - later, Featured Artwork and Screenshot.
3. **Choose its position:** "First showcase (recommended)", or "where it is in my preview"
   using the existing showcase editor from PR 9.
4. **See it in place.** The preview adds the showcase, outlines each slot, and fills each
   slot with its background crop, so it should look like a hole in the panel.
5. **Animated background:** use a scrubber to pick the still frame, plus a checkbox for
   "include source clips".
6. **Download the zip** (§7).
7. **Re-import:** drop the finished files onto the panel.
   - Files are matched by name prefix first, then by size; if both fail, the user is asked.
   - Each file is checked for the exact size (otherwise a black-bar warning), under 5 MB,
     and PNG, JPG or GIF.
   - Each file is shown in its slot in the preview, from an object URL (nothing uploaded).
     There's a "restart GIFs" button to compare animation timing.
8. **Upload guide:** the step-by-step panel from §8, with a checkbox per step and the file
   name for each slot filled in.

### 9.2 Phased PRs (small, each one shippable)

Built on the current `main`. PRs 9 to 11 (showcase editing, rate limits, right column) are
already merged on GitHub, but the local checkout is behind, so pull first. This work adds new
folders and needs only **one small mount point** in `Studio.tsx` and an optional slot-overlay
prop on the Artwork renderer. No other existing code changes.

| PR | Adds | Files |
|---|---|---|
| 1. Slot geometry | Pure functions and constants for the slot positions in §3.2, with Vitest tests pinned to the measured numbers (508/256, 1010/256/349/442, 495, 506) | `src/lib/artwork/layouts.ts`, `layouts.test.ts` |
| 2. Crop and preview | Canvas crop from a background image or video frame (CORS is fine: `*`). A `useSlotRects` hook that measures the slots in the live preview (dividing by the zoom). An `ArtworkPlanner` panel to pick the layout and position, with outlines on the preview | `src/lib/artwork/crop.ts`, `src/components/ArtworkWorkflow/{ArtworkPlanner.tsx, useSlotRects.ts, ArtworkWorkflow.module.css}`; mount in `Studio.tsx` |
| 3. Export | Zip with PNGs, the guide PNG, `layout.json` and README (generated from the same text as the in-app guide) | `src/lib/artwork/{exportZip.ts, guideImage.ts, readme.ts}`; dependency `fflate` |
| 4. Re-import and upload guide | Drop zone, matching and checks, in-slot preview, step-by-step guide panel | `src/components/ArtworkWorkflow/{ReimportDrop.tsx, UploadGuide.tsx}`, `src/lib/artwork/validate.ts` |
| 5. Animated | Frame picker, per-slot source clips, then (optionally) GIF export with a 5 MB budget | `src/lib/artwork/{videoFrames.ts, gifExport.ts}`; dependency `gifenc` |
| 6. Extras (optional) | PSD template (`ag-psd`); Featured Artwork and Screenshot layouts once a real profile with them is captured into `reference/html/` | `src/lib/artwork/psd.ts`, more entries in `layouts.ts` |

---

## 10. Open questions for Ronin

| # | Question | Recommended answer |
|---|---|---|
| 1 | Which layouts are in v1? | **Artwork normal and Artwork long.** Featured and Screenshot later, after capturing a real example. |
| 2 | Lock the aligned showcase to the top, or allow any position? | **Default to the top**, allow others measured from the preview, with a drift warning. |
| 3 | Animated backgrounds in v1? | **Still frame plus source clips.** In-browser GIF export later. |
| 4 | Should the in-app guide show the unofficial console snippet for long artwork? | **Yes**, clearly labelled unofficial, with a plain explanation, and never run by the app. |
| 5 | A PSD template (adds `ag-psd`, about 200 KB, loaded only when exporting)? | **Yes, in phase 6.** v1 ships the guide PNG and JSON. |
| 6 | Can you do a 10-minute test upload to confirm the unknowns in §11? | **Yes, before PR 4.** The upload guide depends on the answers. |

## 11. Not confirmed (needs a real test)

- **The current upload limits.** The 5 MB limit (formerly 8 MB) comes from 2022–2024 forum
  posts. Maximum dimensions are unknown.
- **What triggers long mode.** Is it only the console trick, or any tall image wider than
  480? Does it still work in Nov 2026?
- **The Edit Profile picker.** Whether it lists artwork newest-first, and therefore whether
  upload order matters at all.
- **Visibility.** Whether Friends-only or Unlisted artwork shows to visitors.
- **Featured Artwork.** The image size Steam requests (the `imw` value) and the exact
  height.
- **Screenshot showcase in normal mode.** Its exact `imw`/`imh` values.
- **Workshop and guide showcase positions.** Calculated from CSS, not measured.
- **Why Ronin's 2021 pieces sit 12px right of today's slots.** Steam's layout change is
  likely, but there's no proof.
- **Steam client.** The CSS should be the same in the client, but it wasn't tested there.
