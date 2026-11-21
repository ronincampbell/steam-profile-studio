/**
 * The profile page's right-hand column (div.profile_rightcol): online status,
 * profile awards, badges, the counts list, groups and top friends.
 *
 * Element structure and class names follow Steam's markup (search
 * reference/html/fuzzycast-profile.html for "profile_rightcol") so each size
 * can be checked against Steam's profilev2.css, globalv2.css and
 * shared_global.css. All the data comes from the cached profile page that
 * /api/profile/showcases already loads.
 */
/* eslint-disable @next/next/no-img-element -- Steam's CDN images, loaded as-is. */
import type { CSSProperties } from "react";
import { levelBadge } from "@/lib/steam/level";
import type { CountLink, FavoriteBadge, ProfileSidebar, SidebarFriend } from "@/lib/steam/showcases/types";
import styles from "./Sidebar.module.css";

const STATE_CLASS = { online: styles.online, offline: styles.offline, "in-game": styles.inGame } as const;

export function Sidebar({ sidebar }: { sidebar: ProfileSidebar }) {
  const { status, awards, badges, itemLinks, groups, friends } = sidebar;
  return (
    <div className={styles.rightcol} data-testid="profile-sidebar">
      {status && (
        <div className={`${styles.inGameBox} ${STATE_CLASS[status.state]}`}>
          <div className={styles.inGameHeader}>{status.header}</div>
          {status.detail && <div className={styles.inGameName}>{status.detail}</div>}
        </div>
      )}

      {awards && (
        <div>
          <Count link={awards} />
          <div>
            {awards.icons.map((icon, i) => (
              <div
                key={i}
                className={`${styles.badge} ${i === awards.icons.length - 1 ? styles.last : ""}`}
                title={icon.tooltip}
              >
                <img className={styles.awardIcon} src={icon.image} alt="" />
              </div>
            ))}
            <div className={styles.clear} />
          </div>
        </div>
      )}

      {badges && (
        <div className={styles.badges}>
          <Count link={badges} />
          <div>
            {badges.icons.map((icon, i) => (
              <div
                key={i}
                className={`${styles.badge} ${i === badges.icons.length - 1 ? styles.last : ""}`}
                title={icon.tooltip.join("\n")}
              >
                <a href={icon.href} target="_blank" rel="noreferrer">
                  <img src={icon.image} alt={icon.tooltip[0] ?? ""} />
                </a>
              </div>
            ))}
            <div className={styles.clear} />
          </div>
        </div>
      )}

      {itemLinks.length > 0 && (
        <div className={styles.itemLinks}>
          {itemLinks.map((l) => (
            <Count key={l.href || l.label} link={l} />
          ))}
          <div className={styles.clear} />
        </div>
      )}

      {groups && (
        <div className={styles.groupLinks}>
          <Count link={groups} />
          <div>
            {groups.list.map((g) => (
              <div key={g.href} className={`${styles.group} ${g.primary ? styles.primaryGroup : ""}`}>
                <div className={styles.groupAvatar}>
                  <a href={g.href} target="_blank" rel="noreferrer">
                    <img src={g.avatar} alt="" />
                  </a>
                </div>
                <a className={styles.whiteLink} href={g.href} target="_blank" rel="noreferrer">
                  {g.name}
                </a>
                <div>{g.members}</div>
                <div className={styles.clear} />
              </div>
            ))}
          </div>
        </div>
      )}

      {friends && (
        <div className={styles.friendLinks}>
          <Count link={friends} />
          <div data-testid="top-friends">
            {friends.list.map((f, i) => (
              <Friend key={i} friend={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** div.profile_header_badge: the favourite badge under "Level N" in the header. */
export function HeaderFavoriteBadge({ badge }: { badge: FavoriteBadge }) {
  return (
    <div className={styles.headerBadge}>
      <a className={styles.favoriteBadge} href={badge.href} target="_blank" rel="noreferrer">
        <div className={styles.favoriteBadgeIcon} title={badge.tooltip.join("\n")}>
          <img src={badge.image} alt="" />
        </div>
        <div className={styles.favoriteBadgeDescription}>
          <div className={styles.favoriteBadgeName}>{badge.name}</div>
          <div>{badge.xp}</div>
        </div>
      </a>
    </div>
  );
}

/** div.profile_count_link: "Games" + a thin grey "394". */
function Count({ link }: { link: CountLink }) {
  return (
    <div className={styles.countLink}>
      <a href={link.href} target="_blank" rel="noreferrer">
        <span className={styles.countLabel}>{link.label}</span>
        {"\u00a0"}
        {/* Steam's template leaves a space before the number, in the number's
            24px font, so the gap is wider than one 14px space. An empty total
            gets &nbsp; "so the line spaces like the rest". */}
        <span className={styles.countTotal}>{link.total ? ` ${link.total}` : "\u00a0"}</span>
      </a>
    </div>
  );
}

/** div.friendBlock */
function Friend({ friend }: { friend: SidebarFriend }) {
  const state = STATE_CLASS[friend.state];
  return (
    <div className={`${styles.friendBlock} ${state}`}>
      {friend.href && (
        <a className={styles.friendBlockLinkOverlay} href={friend.href} target="_blank" rel="noreferrer" aria-label={friend.name} />
      )}
      {friend.level !== null && <FriendLevel level={friend.level} />}
      <div className={`${styles.playerAvatar} ${state}`}>
        {friend.avatar ? <img src={friend.avatar} alt="" /> : <span className={styles.avatarBlank} />}
      </div>
      <div className={styles.friendBlockContent}>
        {friend.name}
        <br />
        <span>{friend.detail}</span>
      </div>
    </div>
  );
}

function FriendLevel({ level }: { level: number }) {
  const badge = levelBadge(level);
  const style: CSSProperties =
    badge.kind === "ring"
      ? { borderColor: badge.borderColor }
      : { backgroundImage: `url("${badge.image}")`, backgroundPosition: badge.position };
  return (
    <div
      className={`${styles.friendPlayerLevel} ${badge.kind === "sprite" ? styles.levelSprite : ""}`}
      style={style}
      data-level-class={badge.className}
    >
      <span className={styles.friendPlayerLevelNum}>{badge.level}</span>
    </div>
  );
}
