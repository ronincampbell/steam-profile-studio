/**
 * Work out which Steam profile someone meant from whatever they pasted.
 *
 * Accepts:
 * - a profile URL: `https://steamcommunity.com/id/<vanity>` or
 *   `https://steamcommunity.com/profiles/<steamid64>` (with or without
 *   `https://`, `www.`, a trailing slash, or a sub-page like `/games`)
 * - a bare 17-digit SteamID64
 * - a bare vanity name (the bit after `/id/`)
 *
 * Returns null for anything that can't be a profile, so the API route can
 * answer 400 without calling Steam.
 */
export type ProfileInput =
  | { kind: "steamid"; steamId: string }
  | { kind: "vanity"; vanity: string };

/** SteamID64s for individual accounts all start with 7656119. */
const STEAMID64 = /^7656119\d{10}$/;
/** Steam vanity names: 2–32 characters, letters, digits, `_` and `-`. */
const VANITY = /^[A-Za-z0-9_-]{2,32}$/;

export function parseProfileInput(raw: string | null | undefined): ProfileInput | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  const url = s.match(
    /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(id|profiles)\/([^/?#\s]+)/i,
  );
  if (url) {
    const [, kind, value] = url;
    const decoded = safeDecode(value);
    if (kind.toLowerCase() === "profiles") {
      return STEAMID64.test(decoded) ? { kind: "steamid", steamId: decoded } : null;
    }
    return VANITY.test(decoded) ? { kind: "vanity", vanity: decoded } : null;
  }

  // Looks like a URL but not a profile one (e.g. a store link).
  if (/[/:.]/.test(s)) return null;

  if (STEAMID64.test(s)) return { kind: "steamid", steamId: s };
  if (VANITY.test(s)) return { kind: "vanity", vanity: s };
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
