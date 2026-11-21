#!/usr/bin/env node
// Capture a public Steam profile page's HTML into reference/html/, with other
// people's details redacted so the file can live in this public repo.
//
// Usage (Node 20+, no dependencies, no API key):
//   node scripts/capture-profile-html.mjs <profile URL | vanity | steamid64> [outName]
//   node scripts/capture-profile-html.mjs --from <saved.html> <profile URL> [outName]
//
// --from redacts a page you already downloaded (with ?l=english) instead of
// fetching it again. Steam's community site answers 429 after only a handful of
// quick requests from one IP, so this saves a retry.
//
// What is redacted (matching the blurring in reference/screenshots/):
//   - Friends list: each friend's name, status line, avatar, profile link and
//     account id. Friend levels and the friend count are kept (they're layout).
//   - Comments: each commenter's name, avatar, profile link and account id,
//     the comment text, timestamps and comment ids. The comment count is kept.
//   - The anonymous `g_sessionID` Steam hands every visitor.
// Everything else (the owner's own profile, showcases, groups, recent
// activity) is left exactly as Steam served it.
//
// The script fails, and writes nothing, if any friend or commenter name it
// found is still in the output.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "reference", "html");
const R = "[redacted]";

const args = process.argv.slice(2);
let fromFile;
if (args[0] === "--from") {
  fromFile = args[1];
  args.splice(0, 2);
}
const input = args[0]?.trim();
if (!input) {
  console.error("Usage: node scripts/capture-profile-html.mjs <profile URL | vanity | steamid64> [outName]");
  process.exit(1);
}

function profileUrl(s) {
  const m = s.match(/steamcommunity\.com\/(id|profiles)\/([^/?#]+)/);
  if (m) return `https://steamcommunity.com/${m[1]}/${m[2]}/`;
  if (/^\d{17}$/.test(s)) return `https://steamcommunity.com/profiles/${s}/`;
  return `https://steamcommunity.com/id/${encodeURIComponent(s)}/`;
}

const url = `${profileUrl(input)}?l=english`;
let html, finalUrl;
if (fromFile) {
  html = await readFile(fromFile, "utf8");
  finalUrl = url;
} else {
  const res = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" }, redirect: "follow" });
  if (!res.ok) {
    console.error(`Steam answered ${res.status} for ${url}`);
    process.exit(1);
  }
  html = await res.text();
  finalUrl = res.url;
}

const secrets = new Set(); // names that must not survive redaction
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

/* ---------- Friends list ---------- */
html = html.replace(
  /(<div[^>]*class="friendBlock[^"]*"[^>]*>)([\s\S]*?<div class="friendBlockContent">)([\s\S]*?)<br>\s*(<span class="friendSmallText">)([\s\S]*?)(<\/span>)/g,
  (_all, open, middle, name, smallOpen, _status, smallClose) => {
    if (name.trim()) secrets.add(decode(name));
    open = open.replace(/data-miniprofile="\d+"/, 'data-miniprofile="0"');
    middle = middle
      .replace(/(class="friendBlockLinkOverlay" href=")[^"]*"/, '$1https://steamcommunity.com/profiles/REDACTED"')
      .replace(/(<img src=")[^"]*"/g, '$1https://avatars.fastly.steamstatic.com/REDACTED_medium.jpg"');
    return `${open}${middle}\n\t\t\t\t${R}<br>\n\t\t\t\t${smallOpen}${R}${smallClose}`;
  },
);

/* ---------- Comments ---------- */
const start = html.indexOf('<div class="commentthread_comments"');
const end = html.indexOf('<div class="commentthread_footer"', start);
if (start !== -1 && end !== -1) {
  let n = 0;
  const ids = new Map();
  const fakeId = (id) => {
    if (!ids.has(id)) ids.set(id, String(++n));
    return ids.get(id);
  };
  let c = html.slice(start, end);
  for (const m of c.matchAll(/<bdi>([\s\S]*?)<\/bdi>/g)) secrets.add(decode(m[1]));
  for (const m of c.matchAll(/class="commentthread_comment_text"[^>]*>([\s\S]*?)<\/div>/g)) {
    const text = decode(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    if (text.length >= 4) secrets.add(text.slice(0, 40));
  }
  for (const m of c.matchAll(/steamcommunity\.com\/(?:id|profiles)\/([^"/]+)/g)) secrets.add(m[1]);
  c = c
    .replace(/(steamcommunity\.com\/(?:id|profiles)\/)[^"/]+/g, "$1REDACTED")
    .replace(/data-miniprofile="\d+"/g, 'data-miniprofile="0"')
    .replace(/avatars\.(?:fastly|akamai|cloudflare)?\.?steamstatic\.com\/[0-9a-f]+/g, "avatars.fastly.steamstatic.com/REDACTED")
    .replace(/<bdi>[\s\S]*?<\/bdi>/g, `<bdi>${R}</bdi>`)
    .replace(/(class="commentthread_comment_timestamp" title=")[^"]*(" data-timestamp=")\d+(">)[\s\S]*?(<\/div>)/g, `$1${R}$20$3\n\t\t\t\t\t\t${R}&nbsp;\n\t\t\t\t\t$4`)
    .replace(/(class="commentthread_comment_text"[^>]*>)[\s\S]*?(<\/div>)/g, `$1\n\t\t\t\t${R}\t\t\t$2`)
    .replace(/\b(comment_(?:content_)?)(\d{6,})/g, (_a, p, id) => p + fakeId(id))
    .replace(/'(\d{12,})'/g, (_a, id) => `'${fakeId(id)}'`);
  html = html.slice(0, start) + c + html.slice(end);
}

/* ---------- Session id ---------- */
html = html.replace(/(g_sessionID = ")[^"]*"/, '$1REDACTED"');

/* ---------- Check, then save ---------- */
const leaked = [...secrets].filter((s) => s && s !== "REDACTED" && html.includes(s));
if (leaked.length) {
  console.error(`Redaction failed; still present: ${leaked.map((s) => JSON.stringify(s)).join(", ")}`);
  process.exit(1);
}

const vanity = finalUrl.match(/\/(?:id|profiles)\/([^/?#]+)/)?.[1] ?? "profile";
const outName = args[1] ?? `${vanity.toLowerCase()}-profile.html`;
await mkdir(OUT_DIR, { recursive: true });
const header = `<!-- Captured ${fromFile ? "(from a saved download) " : ""}${new Date().toISOString()} from ${finalUrl} (anonymous, not signed in) by scripts/capture-profile-html.mjs. Friends list and comments redacted. -->\n`;
await writeFile(path.join(OUT_DIR, outName), header + html);
console.log(`Saved reference/html/${outName} (${html.length} chars). Redacted ${secrets.size} names/strings.`);
