/**
 * The profile page's right-hand column (div.profile_rightcol) and the
 * favourite badge under the level in the header, read from the same HTML the
 * showcases come from. The markup is in reference/html/fuzzycast-profile.html
 * (search for "profile_rightcol").
 */
import type { HTMLElement } from "node-html-parser";
import { classes, hasClass, text, tooltipLines } from "./dom";
import type { CountLink, FavoriteBadge, PersonaState, ProfileSidebar, SidebarFriend, SidebarGroup } from "./types";

export function parseSidebar(root: HTMLElement): ProfileSidebar | undefined {
  const col = root.querySelector(".profile_rightcol");
  if (!col) return undefined;

  const sidebar: ProfileSidebar = { itemLinks: [] };

  const favoriteBadge = parseFavoriteBadge(root);
  if (favoriteBadge) sidebar.favoriteBadge = favoriteBadge;

  const inGame = col.querySelector(".profile_in_game");
  if (inGame) {
    // In a game: the game's name, empty for "In non-Steam game" (Steam still
    // draws the empty line, and its margin). Offline and online have no line.
    const name = inGame.querySelector(".profile_in_game_name");
    // Only while the game has a joinable lobby: "steam://joinlobby/<appid>/…".
    const joinGame = inGame.querySelector(".profile_in_game_joingame a")?.getAttribute("href");
    sidebar.status = {
      state: personaState(inGame),
      header: text(inGame.querySelector(".profile_in_game_header")),
      ...(name ? { detail: text(name) } : {}),
      ...(joinGame ? { joinGame } : {}),
    };
  }

  const awards = col.querySelector(".profile_awards");
  const awardsLink = countLink(awards?.querySelector(".profile_count_link"));
  if (awards && awardsLink) {
    sidebar.awards = {
      ...awardsLink,
      icons: awards.querySelectorAll(".profile_badges_badge").flatMap((b) => {
        const img = b.querySelector("img");
        const image = img?.getAttribute("src");
        if (!image) return [];
        const animatedImage = img?.getAttribute("data-animate-on-hover-src");
        return [
          {
            image,
            ...(animatedImage ? { animatedImage } : {}),
            tooltip: tooltipLines(b.getAttribute("data-tooltip-html")).join(" "),
          },
        ];
      }),
    };
  }

  const badges = col.querySelector(".profile_badges");
  const badgesLink = countLink(badges?.querySelector(".profile_count_link"));
  if (badges && badgesLink) {
    sidebar.badges = {
      ...badgesLink,
      icons: badges.querySelectorAll(".profile_badges_badge").flatMap((b) => {
        const image = b.querySelector("img")?.getAttribute("src");
        if (!image) return [];
        return [
          {
            href: b.querySelector("a")?.getAttribute("href") ?? "",
            image,
            tooltip: tooltipLines(b.getAttribute("data-tooltip-html")),
          },
        ];
      }),
    };
  }

  sidebar.itemLinks = col
    .querySelectorAll(".profile_item_links .profile_count_link")
    .map(countLink)
    .filter((l): l is CountLink => l !== null);

  const groups = col.querySelector(".profile_group_links");
  const groupsLink = countLink(groups?.querySelector(".profile_count_link"));
  if (groups && groupsLink) {
    sidebar.groups = {
      ...groupsLink,
      list: groups.querySelectorAll(".profile_group").flatMap((g): SidebarGroup[] => {
        const link = g.querySelector("a.whiteLink");
        const avatar = g.querySelector(".profile_group_avatar img")?.getAttribute("src");
        if (!link || !avatar) return [];
        return [
          {
            name: text(link),
            href: link.getAttribute("href") ?? "",
            avatar,
            members: text(g.querySelector(".profile_group_membercount")),
            primary: hasClass(g, "profile_primary_group"),
          },
        ];
      }),
    };
  }

  const friends = col.querySelector(".profile_friend_links");
  const friendsLink = countLink(friends?.querySelector(".profile_count_link"));
  if (friends && friendsLink) {
    sidebar.friends = {
      ...friendsLink,
      list: friends.querySelectorAll(".profile_topfriends .friendBlock").map(parseFriend),
    };
  }

  return sidebar;
}

function parseFavoriteBadge(root: HTMLElement): FavoriteBadge | undefined {
  const a = root.querySelector(".profile_header_badge a.favorite_badge");
  const image = a?.querySelector(".favorite_badge_icon img")?.getAttribute("src");
  if (!a || !image) return undefined;
  return {
    href: a.getAttribute("href") ?? "",
    image,
    name: text(a.querySelector(".favorite_badge_description .name")),
    xp: text(a.querySelector(".favorite_badge_description .xp")),
    tooltip: tooltipLines(a.querySelector(".favorite_badge_icon")?.getAttribute("data-tooltip-html")),
  };
}

/** `div.profile_count_link > a > span.count_link_label + span.profile_count_link_total`. */
function countLink(el: HTMLElement | null | undefined): CountLink | null {
  const a = el?.querySelector("a");
  if (!a) return null;
  const total = text(a.querySelector(".profile_count_link_total"));
  return {
    label: text(a.querySelector(".count_link_label")),
    ...(total ? { total } : {}),
    href: a.getAttribute("href") ?? "",
  };
}

function personaState(el: HTMLElement): PersonaState {
  const c = classes(el);
  if (c.includes("in-game")) return "in-game";
  if (c.includes("online")) return "online";
  return "offline";
}

function parseFriend(block: HTMLElement): SidebarFriend {
  const levelText = text(block.querySelector(".friendPlayerLevelNum"));
  const level = /^\d+$/.test(levelText) ? Number(levelText) : null;
  const content = block.querySelector(".friendBlockContent");
  // The name is the text before the <br>; the small grey line follows it.
  const small = content?.querySelector(".friendSmallText");
  const name = (content?.childNodes ?? [])
    .filter((n) => n !== small)
    .map((n) => n.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const friend: SidebarFriend = { level, state: personaState(block) };
  if (name) friend.name = name;
  const avatar = block.querySelector(".playerAvatar img")?.getAttribute("src");
  if (avatar) friend.avatar = avatar;
  const href = block.querySelector(".friendBlockLinkOverlay")?.getAttribute("href");
  if (href) friend.href = href;
  const detail = text(small);
  if (detail) friend.detail = detail;
  return friend;
}
