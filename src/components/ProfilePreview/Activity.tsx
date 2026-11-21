/**
 * The two boxes at the bottom of the profile's left column, under the
 * showcases: Recent Activity and Comments.
 *
 * Element structure and class names follow Steam's markup (search
 * reference/html/fuzzycast-profile.html for "profile_recentgame_header" and
 * "profile_comment_area") so each size can be checked against Steam's
 * profilev2.css, globalv2.css and shared_global.css. The data comes from the
 * cached profile page that /api/profile/showcases already loads.
 *
 * What a signed-out visitor sees is drawn, so there's no "Add a comment" box
 * or "Subscribe to thread" checkbox. The page numbers are drawn as Steam's
 * script draws them; they link to Steam's full comments page, since only the
 * first page is loaded.
 */
/* eslint-disable @next/next/no-img-element -- Steam's CDN images, loaded as-is. */
import { Fragment } from "react";
import type { ProfileComment, ProfileComments, RecentActivity } from "@/lib/steam/showcases/types";
import { GameInfo } from "@/components/Showcases/MoreShowcases";
import base from "@/components/Showcases/Showcases.module.css";
import more from "@/components/Showcases/MoreShowcases.module.css";
import styles from "./Activity.module.css";

const ext = { target: "_blank", rel: "noreferrer" } as const;
const STATE_CLASS = { online: styles.online, offline: styles.offline, "in-game": styles.inGame } as const;

export function RecentActivityBox({ activity }: { activity: RecentActivity }) {
  return (
    <div className={`${base.area} ${base.customization}`} data-testid="recent-activity">
      <div className={`${base.header} ${styles.recentHeader}`}>
        <div>Recent Activity</div>
        {activity.playtime && (
          <div className={styles.quicklinks}>
            <div>{activity.playtime}</div>
          </div>
        )}
      </div>
      <div className={base.block}>
        <div>
          {activity.games.map((game, i) => (
            <div key={i} className={styles.recentGame}>
              <div className={styles.recentGameContent}>
                <div className={styles.gameInfo}>
                  <div className={styles.gameInfoCap}>
                    <a href={game.href} {...ext}>
                      <img src={game.capsule} alt="" />
                    </a>
                  </div>
                  <div className={styles.gameInfoDetails}>
                    {game.hours}
                    <br />
                    {game.lastPlayed}
                  </div>
                  <div className={styles.gameName}>
                    <a className={styles.whiteLink} href={game.href} {...ext}>
                      {game.name}
                    </a>
                  </div>
                </div>
                {game.info && <GameInfo info={game.info} />}
              </div>
            </div>
          ))}
        </div>
        {activity.links.length > 0 && (
          <div>
            <div className={styles.quicklinks}>
              View
              {activity.links.map((link, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className={styles.linkSeparator}>|</span>}
                  <a className={styles.whiteLink} href={link.href} {...ext}>
                    {link.text}
                  </a>
                </Fragment>
              ))}
            </div>
            <div className={styles.clearEnd} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsBox({ comments }: { comments: ProfileComments }) {
  const pages = Math.max(1, Math.ceil(comments.total / comments.pageSize));
  const paged = comments.total > comments.pageSize;
  return (
    <div className={`${base.area} ${styles.commentArea}`} data-testid="profile-comments">
      <div className={styles.threadArea}>
        <div className={styles.threadHeader}>
          <div className={styles.headerAndCount}>
            <span className={styles.countLabel}>Comments</span>
          </div>
          <div className={styles.paging}>
            {paged && comments.allHref ? (
              <a className={styles.allCommentsLink} href={comments.allHref} {...ext}>
                View all {comments.total} comments
              </a>
            ) : (
              <span />
            )}
            {paged && <Pager pages={pages} href={comments.allHref} />}
          </div>
        </div>
        <div className={styles.commentContainer}>
          {comments.list.map((c) => (
            <Comment key={c.id} comment={c} />
          ))}
        </div>
        {paged && (
          <div className={styles.threadFooter}>
            <div className={styles.footerPaging}>
              <Pager pages={pages} href={comments.allHref} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Steam's "< 1 2 3 4 5 >", on page 1. Other pages open Steam's full comments page. */
function Pager({ pages, href }: { pages: number; href: string }) {
  return (
    <div className={styles.pageLinksCtn}>
      <span className={`${styles.pageBtn} ${styles.disabled}`}>&lt;</span>
      <span className={styles.pageLinks}>
        {Array.from({ length: pages }, (_, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            {i === 0 ? (
              <span className={`${styles.pageLink} ${styles.active}`}>1</span>
            ) : (
              <a className={styles.pageLink} href={href} {...ext}>
                {i + 1}
              </a>
            )}
          </Fragment>
        ))}
      </span>
      <a className={styles.pageBtn} href={href} {...ext}>
        &gt;
      </a>
    </div>
  );
}

function Comment({ comment }: { comment: ProfileComment }) {
  const { author } = comment;
  return (
    <div className={styles.comment}>
      <div className={styles.commentContent}>
        <div className={styles.commentAuthor}>
          <div className={`${styles.playerAvatar} ${STATE_CLASS[author.state]}`}>
            {author.frame && (
              <div className={styles.avatarFrame}>
                <picture>
                  <source media="(prefers-reduced-motion: reduce)" srcSet={author.frame.image} />
                  <img src={author.frame.animatedImage ?? author.frame.image} alt="" />
                </picture>
              </div>
            )}
            <a href={author.href} {...ext}>
              <img
                src={author.avatar}
                srcSet={author.avatar2x ? `${author.avatar} 1x, ${author.avatar2x} 2x` : undefined}
                alt=""
              />
            </a>
          </div>
          <div className={styles.authorNameGroup}>
            <div className={styles.flexRow}>
              <a className={styles.authorLink} href={author.href} {...ext}>
                <bdi>{author.name}</bdi>
              </a>
            </div>
            <div className={styles.timestamp} />
            <div className={styles.timestamp} title={comment.timeTitle}>
              {comment.time}&nbsp;
            </div>
          </div>
        </div>
        <div
          className={`${more.notes} ${styles.commentText}`}
          dangerouslySetInnerHTML={{ __html: comment.html }}
        />
      </div>
    </div>
  );
}
