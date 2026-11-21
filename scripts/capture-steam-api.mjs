#!/usr/bin/env node
// Capture raw Steam Web API responses for one profile into reference/api/.
//
// Usage (Node 20.6+, no dependencies):
//   node --env-file=.env.local scripts/capture-steam-api.mjs <profile>
//   STEAM_API_KEY=xxxx node scripts/capture-steam-api.mjs <profile>
//
// <profile> can be a profile URL (/id/<vanity> or /profiles/<steamid64>),
// a bare 17-digit SteamID64, or a bare vanity name.
//
// The API key is read from the STEAM_API_KEY environment variable only. It is
// never written to disk: saved files hold the response body plus the request
// URL with the key replaced by "REDACTED".

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.steampowered.com";
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "reference",
  "api",
);

const key = process.env.STEAM_API_KEY?.trim();
const input = process.argv[2]?.trim();

if (!input) {
  console.error("Usage: node --env-file=.env.local scripts/capture-steam-api.mjs <profile URL | vanity | steamid64>");
  process.exit(1);
}
if (!key) {
  console.error("STEAM_API_KEY is not set. Put it in .env.local or the environment.");
  process.exit(1);
}

// Points Shop community item classes to try for the catalogue.
// These numbers are from community Points Shop tools and still need checking
// against the real data: compare each saved file with what the shop shows.
const ITEM_CLASSES = {
  profile_background: 3,
  profile_modifier_theme: 8,
  mini_profile_background: 13,
  avatar_frame: 14,
  animated_avatar: 15,
};

function parseProfileInput(raw) {
  const s = raw.replace(/\/+$/, "");
  let m = s.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (m) return { steamid: m[1] };
  m = s.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (m) return { vanity: m[1] };
  if (/^\d{17}$/.test(s)) return { steamid: s };
  return { vanity: s };
}

function redact(url) {
  return url.replace(/([?&]key=)[^&]+/i, "$1REDACTED");
}

async function call(name, iface, method, version, params, { withKey = true } = {}) {
  const url = new URL(`${API}/${iface}/${method}/v${version}/`);
  if (withKey) url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let status = 0;
  let body;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    status = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { _non_json_body: text.slice(0, 2000) };
    }
  } catch (err) {
    body = { _fetch_error: String(err) };
  }

  const record = {
    _captured_at: new Date().toISOString(),
    _request: redact(url.toString()),
    _status: status,
    _used_key: withKey,
    response: body,
  };
  const file = path.join(OUT_DIR, `${name}.json`);
  await writeFile(file, JSON.stringify(record, null, 2) + "\n");
  console.log(`${status === 200 ? "ok " : "ERR"} ${status} ${name}.json`);
  return { status, body };
}

await mkdir(OUT_DIR, { recursive: true });

// 1. Resolve the SteamID.
let { steamid, vanity } = parseProfileInput(input);
if (vanity) {
  const r = await call("ResolveVanityURL", "ISteamUser", "ResolveVanityURL", 1, { vanityurl: vanity });
  steamid = r.body?.response?.steamid;
  if (!steamid) {
    console.error(`Could not resolve vanity name "${vanity}". See reference/api/ResolveVanityURL.json.`);
    process.exit(1);
  }
}
console.log(`SteamID64: ${steamid}`);

// 2. Profile data.
await call("GetPlayerSummaries", "ISteamUser", "GetPlayerSummaries", 2, { steamids: steamid });
await call("GetSteamLevel", "IPlayerService", "GetSteamLevel", 1, { steamid });

// 3. Equipped items (undocumented). Try with and without a key.
await call("GetProfileItemsEquipped", "IPlayerService", "GetProfileItemsEquipped", 1, { steamid, language: "english" });
await call("GetProfileItemsEquipped.nokey", "IPlayerService", "GetProfileItemsEquipped", 1, { steamid, language: "english" }, { withKey: false });

// 4. Points Shop catalogue (undocumented). count must be 100-1000.
// First: unfiltered, without a key, to see whether a key is needed at all.
await call("QueryRewardItems.nokey", "ILoyaltyRewardsService", "QueryRewardItems", 1, { count: 100, language: "english" }, { withKey: false });
await call("QueryRewardItems", "ILoyaltyRewardsService", "QueryRewardItems", 1, { count: 100, language: "english" });

// Then one page per item class, to learn how filtering works and which
// fields carry image and video URLs.
for (const [label, cls] of Object.entries(ITEM_CLASSES)) {
  await call(
    `QueryRewardItems.class-${cls}-${label}`,
    "ILoyaltyRewardsService",
    "QueryRewardItems",
    1,
    { count: 100, language: "english", "community_item_classes[0]": cls },
    { withKey: false },
  );
}

console.log(`\nSaved to ${path.relative(process.cwd(), OUT_DIR) || OUT_DIR}`);
console.log("Check that no file contains your key before committing: grep -r \"$STEAM_API_KEY\" reference/api");
