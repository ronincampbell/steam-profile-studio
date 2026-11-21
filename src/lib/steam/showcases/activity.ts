/**
 * The two boxes at the bottom of the profile's left column: Recent Activity
 * (the last few games played) and the comment thread. Both are read from the
 * same cached profile page as the showcases. The markup is in
 * reference/html/fuzzycast-profile.html (search for "profile_recentgame_header"
 * and "profile_comment_area"; comment authors and text are redacted there).
 */
import type { HTMLElement } from "node-html-parser";
import { hasClass, text } from "./dom";
import { parseGameInfo, sanitizeNotes } from "./parseMore";
import type { PersonaState, ProfileComment, ProfileComments, RecentActivity, RecentGame } from "./types";

const attr = (el: HTMLElement | null | undefined, name: string) => el?.getAttribute(name) ?? "";

export function parseRecentActivity(root: HTMLElement): RecentActivity | undefined {
  const header = root.querySelector(".profile_recentgame_header");
  const box = header?.closest(".profile_customization");
  if (!header || !box) return undefined;

  const playtime = text(header.querySelector(".recentgame_recentplaytime"));
  const games = box.querySelectorAll(".recent_game").flatMap((g): RecentGame[] => {
    const info = g.querySelector(".game_info");
    const nameLink = info?.querySelector(".game_name a");
    const capsule = info?.querySelector(".game_info_cap img")?.getAttribute("src");
    if (!info || !nameLink || !capsule) return [];
    // "396 hrs on record<br>last played on Nov 14": two lines split at the <br>.
    const [hours = "", lastPlayed = ""] = (info.querySelector(".game_info_details")?.innerHTML ?? "")
      .split(/<br\s*\/?>/i)
      .map((line) => line.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
    const stats = g.querySelector(".game_info_stats");
    return [
      {
        name: text(nameLink),
        href: attr(nameLink, "href"),
        capsule,
        hours,
        lastPlayed,
        ...(stats ? { info: parseGameInfo(stats) } : {}),
      },
    ];
  });

  // The quick links row under the games (the header's playtime uses the same class).
  const linksRow = box
    .querySelectorAll(".recentgame_quicklinks")
    .find((el) => !hasClass(el, "recentgame_recentplaytime"));
  const links = (linksRow?.querySelectorAll("a") ?? []).map((a) => ({ text: text(a), href: attr(a, "href") }));

  return { ...(playtime ? { playtime } : {}), games, links };
}

export function parseComments(root: HTMLElement): ProfileComments | undefined {
  const area = root.querySelector(".profile_comment_area");
  const thread = area?.querySelector(".commentthread_area");
  if (!area || !thread) return undefined;

  // InitializeCommentThread( "Profile", "Profile_<id>", {..."total_count":27,"start":0,"pagesize":6...}, … )
  const script = area.querySelectorAll("script").map((s) => s.text).join("\n");
  const list = thread.querySelectorAll(".commentthread_comment").flatMap(parseComment);
  const total = Number(script.match(/"total_count"\s*:\s*(\d+)/)?.[1] ?? list.length);
  const pageSize = Number(script.match(/"pagesize"\s*:\s*(\d+)/)?.[1] ?? 6) || 6;

  return {
    total,
    pageSize,
    allHref: attr(thread.querySelector(".commentthread_allcommentslink"), "href"),
    list,
  };
}

function parseComment(el: HTMLElement): ProfileComment[] {
  const avatarBox = el.querySelector(".commentthread_comment_avatar");
  const link = el.querySelector(".commentthread_author_link");
  // The avatar is the <img> in the box's own link, not the frame's.
  const avatarImg = avatarBox?.childNodes
    .filter((n): n is HTMLElement => n.nodeType === 1 && (n as HTMLElement).tagName === "A")
    .map((a) => a.querySelector("img"))[0];
  const avatar = avatarImg?.getAttribute("src");
  if (!link || !avatar) return [];

  const avatar2x = attr(avatarImg, "srcset").match(/(\S+)\s+2x/)?.[1];
  const frameBox = avatarBox?.querySelector(".profile_avatar_frame");
  const frameStill = frameBox?.querySelector('source[media="(prefers-reduced-motion: reduce)"]')?.getAttribute("srcset");
  const frameImg = frameBox?.querySelector("img")?.getAttribute("src");
  const frame = frameImg
    ? frameStill && frameStill !== frameImg
      ? { image: frameStill, animatedImage: frameImg }
      : { image: frameImg }
    : undefined;
  const stamp = el
    .querySelectorAll(".commentthread_comment_timestamp")
    .find((t) => t.getAttribute("title") !== undefined);

  return [
    {
      id: attr(el, "id").replace(/^comment_/, ""),
      author: {
        name: text(link),
        href: attr(link, "href"),
        avatar,
        ...(avatar2x ? { avatar2x } : {}),
        state: personaState(avatarBox),
        ...(frame ? { frame } : {}),
      },
      time: text(stamp).replace(/ /g, " ").trim(),
      timeTitle: attr(stamp, "title"),
      html: sanitizeNotes(el.querySelector(".commentthread_comment_text")),
    },
  ];
}

function personaState(el: HTMLElement | null | undefined): PersonaState {
  if (hasClass(el, "in-game")) return "in-game";
  if (hasClass(el, "online")) return "online";
  return "offline";
}
