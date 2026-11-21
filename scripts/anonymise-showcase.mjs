#!/usr/bin/env node
// Cut one showcase out of a saved Steam profile page and anonymise it, so it
// can live in this public repo as a test fixture (reference/html/showcases/).
//
// Usage (Node 20+):
//   node scripts/anonymise-showcase.mjs <saved-profile.html> <showcase index> [...more indexes] > out.html
//
// The index counts the page's showcases from 0, in page order. Save pages with
// `?l=english` (see capture-profile-html.mjs for the rate-limit warning).
//
// What is changed, so nothing in the fixture points at, names or quotes the
// player (everything else, including Steam's markup, classes, inline styles,
// game names, item and badge images, is left exactly as Steam served it):
//   - Profile links (/id/<name>, /profiles/<id>) become /id/example; group
//     links become /groups/example; data-miniprofile account ids become 0;
//     Workshop, artwork and guide ids become 0; trade-offer links and YouTube
//     video ids are replaced; group chat ids are removed.
//   - Text the player wrote is replaced word for word with "lorem": Custom
//     Info Box title and text, review and trade notes, group name and
//     description, artwork/screenshot/video/Workshop/guide titles and
//     descriptions, author and creator names, the player's name. Steam's
//     own words around them ("Created by - ", "By") are kept. BBCode
//     structure (headings, links, spoilers, emoticons, line breaks) is kept.
//   - The player's and group's avatars become Steam's default avatar.
//
// The script refuses to write anything if a profile or group link survives.

import { readFile } from "node:fs/promises";
import { parse } from "node-html-parser";

const [file, ...indexes] = process.argv.slice(2);
if (!file || !indexes.length) {
  console.error("Usage: node scripts/anonymise-showcase.mjs <saved-profile.html> <index> [...index]");
  process.exit(1);
}

const DEFAULT_AVATAR = "https://avatars.fastly.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg";
const root = parse(await readFile(file, "utf8"));
const area = root.querySelector(".profile_customization_area");
const showcases = (area?.children ?? []).filter((el) => (el.getAttribute("class") ?? "").split(/\s+/).includes("profile_customization"));

/** Replace every word of every text node under `el` with "lorem", keeping tags and spacing. */
function loremText(el) {
  if (!el) return;
  for (const n of el.childNodes) {
    if (n.nodeType === 3) {
      // Keep HTML entities and lone punctuation; every word becomes "lorem".
      n.rawText = n.rawText.replace(/&#?\w+;|[^\s&]+/gu, (w) => (/^(&#?\w+;|[-–—:+()]+)$/.test(w) ? w : "lorem"));
    } else if (n.nodeType === 1) {
      if (n.tagName === "A" && /bb_link/.test(n.getAttribute("class") ?? "")) n.setAttribute("href", "https://example.com/");
      if (n.tagName === "IMG" && n.getAttribute("alt")) n.setAttribute("alt", ":lorem:");
      loremText(n);
    }
  }
}

const out = [];
for (const i of indexes) {
  const sc = showcases[Number(i)];
  if (!sc) throw new Error(`No showcase ${i}; the page has ${showcases.length}`);

  // Player-written text.
  const block = sc.querySelector(".profile_customization_block");
  if (block?.querySelector(".customtext_showcase")) loremText(sc.querySelector(".profile_customization_header"));
  for (const sel of [
    ".showcase_notes",
    ".screenshot_showcase_itemname",
    ".workshop_showcase_item .showcase_item_detail_title",
    ".workshop_showcase_item_description",
    ".workshop_showcase_creator_details a",
    ".favoritegroup_name",
    ".favoritegroup_description",
    ".myworkshop_playerName",
    ".guide_showcase_title",
  ]) {
    for (const el of sc.querySelectorAll(sel)) loremText(el);
  }
  // "By <author>": keep Steam's "By".
  for (const el of sc.querySelectorAll(".guide_showcase_author")) el.set_content("By lorem");
  for (const a of sc.querySelectorAll(".workshop_showcase_multiitem a[title]")) a.setAttribute("title", "lorem");
  for (const img of sc.querySelectorAll(".playerAvatar img, .favoritegroup_avatar img")) img.setAttribute("src", DEFAULT_AVATAR);
  for (const el of sc.querySelectorAll("[onclick]")) {
    el.setAttribute("onclick", el.getAttribute("onclick").replace(/OpenGroupChat\(\s*'\d+'\s*\)/, "OpenGroupChat( '0' )"));
  }

  let html = sc.outerHTML
    .replace(/https:\/\/steamcommunity\.com\/(?:id|profiles)\/[^/"'?#\s]+/g, "https://steamcommunity.com/id/example")
    .replace(/https:\/\/steamcommunity\.com\/groups\/[^/"'?#\s]+/g, "https://steamcommunity.com/groups/example")
    .replace(/https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?[^"']+/g, "https://example.com/")
    .replace(/data-miniprofile="\d+"/g, 'data-miniprofile="0"')
    .replace(/(filedetails\/\?id=)\d+/g, "$10")
    .replace(/data-publishedfileid="\d+"/g, 'data-publishedfileid="0"')
    .replace(/(img\.youtube\.com\/vi\/)[^/"]+/g, "$1example");
  if (/steamcommunity\.com\/(?:profiles\/\d|id\/(?!example\b))|groups\/(?!example\b)/.test(html)) {
    throw new Error(`Showcase ${i}: a profile or group link survived; not writing anything`);
  }
  out.push(html);
}
process.stdout.write(`${out.join("\n")}\n`);
