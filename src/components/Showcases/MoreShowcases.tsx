/**
 * Renderers for the showcase types beyond Fuzzycast's 7 (see
 * reference/html/SHOWCASES.md). Element structure and class names follow
 * Steam's markup as captured from real profiles, and every size comes from
 * Steam's CSS (MoreShowcases.module.css), so each piece can be checked
 * against Steam's page.
 */
/* eslint-disable @next/next/no-img-element -- Steam's own images, loaded as-is. */
import { Fragment, type CSSProperties } from "react";
import type {
  AwardsShowcase,
  CompletionRibbonGroup,
  CustomTextShowcase,
  EconomyItem,
  FavoriteGameShowcase,
  FavoriteGroupShowcase,
  GameInfoStats,
  ItemShowcase,
  MyGuidesShowcase,
  MyWorkshopShowcase,
  ReviewShowcase,
  SalienShowcase,
  ShowcaseStat,
  TradeShowcase,
  WorkshopItemShowcase,
} from "@/lib/steam/showcases/types";
import base from "./Showcases.module.css";
import styles from "./MoreShowcases.module.css";

const ext = { target: "_blank", rel: "noreferrer" } as const;
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** A `.showcase_stat`: a link when Steam makes it one. */
function Stat({ stat, className, valueClass, labelFirst, style }: {
  stat: ShowcaseStat;
  className?: string;
  style?: CSSProperties;
  valueClass?: string;
  /** Salien puts the label above the value. */
  labelFirst?: boolean;
}) {
  const value = <div className={cx(base.statValue, valueClass)}>{stat.value}</div>;
  const label = <div className={base.statLabel}>{stat.label}</div>;
  const inner = labelFirst ? (
    <>
      {label}
      {value}
    </>
  ) : (
    <>
      {value}
      {label}
    </>
  );
  return stat.href ? (
    <a className={cx(base.stat, base.statLink, className)} style={style} href={stat.href} title={stat.tooltip} {...ext}>
      {inner}
    </a>
  ) : (
    <div className={cx(base.stat, className)} style={style} title={stat.tooltip}>
      {inner}
    </div>
  );
}

/** `.showcase_stats_row` with its stats, inside whatever panel the showcase puts it in. */
function StatsRow({ stats, className }: { stats: ShowcaseStat[]; className?: string }) {
  if (!stats.length) return null;
  return (
    <div className={cx(base.statsRow, className)}>
      {stats.map((s, i) => (
        <Stat key={i} stat={s} />
      ))}
      <div className={base.clearStart} />
    </div>
  );
}

/** Player-written text, already cleaned by the parser (sanitizeNotes). */
function Notes({ html, className }: { html: string; className?: string }) {
  return <div className={cx(styles.notes, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Ribbons({ groups, groupClass, emptyClass }: { groups: CompletionRibbonGroup[]; groupClass?: string; emptyClass?: string }) {
  return (
    <span className={base.ribbons}>
      {groups.map((r, j) => (
        <span
          key={j}
          className={cx(base.ribbonGroup, base[`ribbon_${r.variant}`], groupClass, r.variant === "empty" && emptyClass)}
        >
          {r.count && <span className={base.ribbonCount}>{r.count}</span>}
          {Array.from({ length: Math.max(1, r.trophies) }, (_, k) => (
            <span key={k} className={cx(base.ribbon, k > 0 && base.stacked)} />
          ))}
        </span>
      ))}
    </span>
  );
}

/* ---------- Item Showcase, Items Up For Trade ---------- */

function ItemTile({ item }: { item: EconomyItem }) {
  const style: CSSProperties = {};
  if (item.borderColor) style.borderColor = item.borderColor;
  if (item.backgroundColor) style.backgroundColor = item.backgroundColor;
  return (
    <div className={cx(base.slot, styles.item)} style={style}>
      <a href={item.href} {...ext}>
        <img
          className={styles.itemImage}
          src={item.image}
          srcSet={item.image2x ? `${item.image} 1x, ${item.image2x} 2x` : undefined}
          alt=""
        />
      </a>
    </div>
  );
}

export function ItemShowcaseView({ showcase }: { showcase: ItemShowcase }) {
  return (
    <div>
      <div>
        <div className={styles.slotRow}>
          {showcase.items.map((item, i) => (
            <ItemTile key={i} item={item} />
          ))}
          {showcase.count && <Stat stat={showcase.count} className={styles.itemCount} />}
          <div className={base.clearStart} />
        </div>
      </div>
    </div>
  );
}

export function TradeShowcaseView({ showcase }: { showcase: TradeShowcase }) {
  return (
    <div>
      <div className={cx(styles.slotRow, styles.tradeItems)}>
        {showcase.items.map((item, i) => (
          <ItemTile key={i} item={item} />
        ))}
        <div className={base.clearStart} />
      </div>
      <div className={base.contentBg}>
        <StatsRow stats={showcase.stats} className={styles.statsTrading} />
        {showcase.notes && <Notes html={showcase.notes} />}
      </div>
    </div>
  );
}

/* ---------- Custom Info Box ---------- */

export function CustomTextView({ showcase }: { showcase: CustomTextShowcase }) {
  return (
    <div className={styles.customText}>
      <Notes html={showcase.notes} className={base.contentBg} />
    </div>
  );
}

/* ---------- Favorite Game, Review ---------- */

function GameCap({ game }: { game: { href: string; image: string; adultContent: boolean } }) {
  return (
    <div className={cx(styles.gameCap, game.adultContent && styles.adultContent)}>
      <a href={game.href} {...ext}>
        <img src={game.image} alt="" />
      </a>
    </div>
  );
}

export function FavoriteGameView({ showcase }: { showcase: FavoriteGameShowcase }) {
  const { game } = showcase;
  return (
    <div>
      <div className={base.contentBg}>
        {game && (
          <div className={cx(styles.favoriteGame, base.slot, styles.slotNoFloat)}>
            <GameCap game={game} />
            <div className={base.detailTitle}>
              <a className={styles.whiteLink} href={game.href} {...ext}>
                {game.name}
              </a>
            </div>
          </div>
        )}
        <StatsRow stats={showcase.stats} />
      </div>
      {showcase.info && <GameInfo info={showcase.info} />}
    </div>
  );
}

function GameInfo({ info }: { info: GameInfoStats }) {
  const ach = info.achievements;
  const achievements = ach && (
    <div className={styles.gameInfoAchievements}>
      <div className={styles.gameInfoRibbons}>
        <Ribbons groups={ach.ribbons} groupClass={styles.gameInfoRibbonGroup} emptyClass={styles.ribbonEmpty} />
      </div>
      <div className={styles.summaryArea}>
        <span className={styles.summary}>
          <a className={styles.whiteLink} href={ach.href} {...ext}>
            {ach.summary}
          </a>
          {ach.rare && <span className={styles.numRare}>{ach.rare}</span>}
        </span>
        <div className={styles.progressBar}>
          <div
            className={styles.segmentedBar}
            style={{
              gridTemplateColumns: [
                ...ach.bar.segments.map((s, i) => (i === 0 ? `minmax(1px, ${s.weight}fr)` : `${s.weight}fr`)),
                `${ach.bar.locked}fr`,
              ].join(" "),
            }}
          >
            {ach.bar.segments.map((s, i) => (
              <div key={i} className={styles[`segment_${s.variant}`]} />
            ))}
            <div />
          </div>
        </div>
      </div>
      <div className={styles.achievementIcons}>
        {ach.icons.map((icon, i) => (
          <div key={i} className={styles.gameInfoAchievement} title={icon.name}>
            <a href={icon.href} {...ext}>
              <img src={icon.image} alt={icon.name} />
            </a>
          </div>
        ))}
        {ach.more && (
          <a className={cx(styles.gameInfoAchievement, styles.plusMore)} href={ach.more.href} {...ext}>
            {ach.more.text}
          </a>
        )}
      </div>
    </div>
  );
  return (
    <div className={styles.gameInfoStats}>
      {info.badge ? (
        <div className={styles.achievementsBadge}>
          <div className={styles.badgeBorder}>
            <div className={styles.gameBadge}>
              <div className={styles.gameBadgeIcon}>
                <a href={info.badge.href} {...ext}>
                  <img src={info.badge.icon} alt="" />
                </a>
              </div>
              <div className={styles.gameBadgeDescription}>
                <div className={styles.gameBadgeName}>
                  <a className={styles.whiteLink} href={info.badge.href} {...ext}>
                    {info.badge.name}
                  </a>
                </div>
                <div>{info.badge.xp}</div>
              </div>
            </div>
          </div>
          {achievements}
        </div>
      ) : (
        achievements && <div className={styles.achievementsOnly}>{achievements}</div>
      )}
      {(ach || info.badge) && info.files.length > 0 && <div className={styles.statsRule} />}
      {info.files.length > 0 && (
        <div>
          {info.files.map((f, i) => (
            <span key={i} className={styles.fileCount}>
              <span className={cx(styles.fileIcon, styles[`fileIcon_${f.type}`])} />
              <a className={styles.fileLink} href={f.href} {...ext}>
                {f.text}
              </a>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewView({ showcase }: { showcase: ReviewShowcase }) {
  const { game } = showcase;
  return (
    <div>
      <div className={cx(base.contentBg, base.slot, styles.reviewSlot)}>
        {game && (
          <div className={styles.favoriteGame}>
            <GameCap game={game} />
            <div className={cx(base.detailTitle, styles.ellipsis)}>
              <a className={styles.whiteLink} href={game.href} {...ext}>
                {game.name}
              </a>
            </div>
            <div className={cx(styles.playtime, styles.ellipsis)}>{game.playtime}</div>
          </div>
        )}
        <Notes html={showcase.notes} />
      </div>
      {showcase.comment && (
        <div>
          <a className={styles.btnGreyBlack} href={showcase.comment.href} {...ext}>
            <span>
              <i className={styles.ico16Comment} /> {showcase.comment.label}
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

/* ---------- Favorite Group ---------- */

export function FavoriteGroupView({ showcase }: { showcase: FavoriteGroupShowcase }) {
  const g = showcase.group;
  if (!g) return null;
  return (
    <div>
      <div className={base.contentBg}>
        <div className={cx(styles.group, base.slot, styles.slotNoFloat)}>
          <div className={styles.groupAvatar}>
            <a href={g.href} {...ext}>
              <img src={g.avatar} alt="" />
            </a>
          </div>
          <div className={styles.groupContent}>
            <div className={cx(styles.groupNameRow, styles.ellipsis)}>
              <a className={styles.groupName} href={g.href} {...ext}>
                {g.name}
              </a>
              {g.suffix}
            </div>
            <div dangerouslySetInnerHTML={{ __html: g.description }} />
            <div className={cx(base.statsRow, styles.groupStats)}>
              {g.stats.map((s, i) => (
                <Stat
                  key={i}
                  stat={s}
                  className={cx(styles.groupStat, s.variant && styles[`groupStat_${s.variant}`])}
                  valueClass={styles.groupStatValue}
                />
              ))}
              <div className={base.clearStart} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Workshop item ---------- */

export function WorkshopItemView({ showcase }: { showcase: WorkshopItemShowcase }) {
  const item = showcase.item;
  if (!item) return null;
  return (
    <div>
      <div className={base.contentBg}>
        <div className={cx(styles.workshopItem, base.slot, styles.slotNoFloat)}>
          <a href={item.href} {...ext}>
            <img className={styles.workshopItemImage} src={item.image} alt="" />
          </a>
          <div className={styles.workshopRightCol}>
            <div>
              <div className={cx(base.detailTitle, styles.ellipsis)}>
                <a className={styles.whiteLink} href={item.href} {...ext}>
                  {item.name}
                </a>
              </div>
              <div className={styles.workshopDescription}>{item.description}</div>
            </div>
            <div className={styles.workshopDetailsRow}>
              <div className={styles.workshopDetailsContent}>
                <div className={styles.workshopAppDetails}>
                  {item.stars && (
                    <div className={styles.workshopStars}>
                      <img src={item.stars.image} alt="" /> {item.stars.text}
                    </div>
                  )}
                  {item.app && (
                    <div className={styles.workshopApp}>
                      <a href={item.app.href} {...ext}>
                        <img src={item.app.icon} alt="" />
                      </a>{" "}
                      <a className={styles.whiteLink} href={item.app.href} {...ext}>
                        {item.app.name}
                      </a>
                    </div>
                  )}
                </div>
                {item.authors.length > 0 && (
                  <div className={cx(styles.workshopCreator, styles.ellipsis)}>
                    {item.creditPrefix}
                    {item.authors.map((a, i) => (
                      <span key={i}>
                        {i > 0 && (item.authorSeparators[i - 1] ?? ", ")}
                        <a className={styles.whiteLink} href={a.href} {...ext}>
                          {a.name}
                        </a>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- My Workshop, My Guides ---------- */

/** The bar under the title: the player's avatar and "<name>'s Workshop" (or Guides). */
export function OwnerBar({ owner, guides }: { owner: MyWorkshopShowcase["owner"]; guides?: boolean }) {
  return (
    <div className={cx(styles.ownerBar, guides && styles.ownerBarGuides)}>
      <div className={cx(styles.ownerAvatar, styles[`avatar_${owner.status}`] ?? styles.avatar_offline)}>
        <a href={owner.href} {...ext}>
          <img src={owner.avatar} alt="" />
        </a>
      </div>
      <a className={styles.ownerName} href={owner.workshopHref} {...ext}>
        {owner.name}
      </a>
    </div>
  );
}

export function MyWorkshopView({ showcase }: { showcase: MyWorkshopShowcase }) {
  return (
    <div>
      {showcase.items.map((item, i) => (
        <div key={i} className={styles.multiItemCtn}>
          <div className={cx(base.slot, styles.multiItem)}>
            <a href={item.href} title={item.name} {...ext}>
              <img className={styles.multiItemImage} src={item.image} alt={item.name} />
            </a>
            {item.appIcon && (
              <div className={styles.miniApp}>
                <img src={item.appIcon} alt="" />
              </div>
            )}
          </div>
        </div>
      ))}
      <div className={base.clearStart} />
      <StatsRow stats={showcase.stats} className={base.contentBg} />
    </div>
  );
}

export function MyGuidesView({ showcase }: { showcase: MyGuidesShowcase }) {
  return (
    <div>
      {showcase.guides.map((g, i) => (
        <div key={i} className={cx(styles.guideCtn, base.slot)}>
          <a className={styles.guideOverlay} href={g.href} {...ext}>
            <div className={styles.guideItem}>
              <div className={styles.guideImage}>
                <img className={styles.guideImg} src={g.image} alt="" />
                {g.appIcon && (
                  <div className={styles.miniApp}>
                    <img src={g.appIcon} alt="" />
                  </div>
                )}
              </div>
              <div className={styles.guideContent}>
                <div className={styles.guideTitle}>{g.name}</div>
                <div className={styles.guideAuthor}>{g.author}</div>
              </div>
            </div>
          </a>
        </div>
      ))}
      <div className={base.clearStart} />
      <StatsRow stats={showcase.stats} className={base.contentBg} />
    </div>
  );
}

/* ---------- Salien ---------- */

export function SalienView({ showcase }: { showcase: SalienShowcase }) {
  return (
    <div>
      <div className={cx(base.contentBg, base.statsRow)}>
        <div className={cx(base.slot, styles.salien)}>
          {showcase.cryotube.back && <img className={styles.cryotubeBack} src={showcase.cryotube.back} alt="" />}
          <div className={styles.salienCont}>
            {showcase.parts.map((p) => (
              <img key={p.id} className={cx(styles.salienPart, styles[`salienPart_${p.id}`])} src={p.image} alt="" />
            ))}
          </div>
          {showcase.cryotube.front && <img className={styles.cryotubeFront} src={showcase.cryotube.front} alt="" />}
        </div>
        {showcase.badge && (
          <div className={styles.salienBadgeCont}>
            <a href={showcase.badge.href} {...ext}>
              <span className={styles.salienBadge} />
              <img className={styles.salienBadgeImage} src={showcase.badge.image} alt="" />
            </a>
          </div>
        )}
        <div className={cx(base.contentBg, base.statsRow, styles.salienStats)}>
          <div className={styles.salienStatsHeader}>
            <a href={showcase.header.href} {...ext}>
              {showcase.header.text}
            </a>
          </div>
          {showcase.stats.map((s, i) => (
            <Fragment key={i}>
              {/* Steam's template breaks the row before the third stat and nudges it down 0.5em. */}
              {i === 2 && <br />}
              <Stat stat={s} className={styles.salienStat} labelFirst style={i === 2 ? { marginTop: "0.5em" } : undefined} />
            </Fragment>
          ))}
          <div className={base.clearStart} />
        </div>
        <div className={base.clearStart} />
      </div>
    </div>
  );
}

/* ---------- Awards ---------- */

export function AwardsView({ showcase }: { showcase: AwardsShowcase }) {
  return (
    <div>
      <div className={cx(base.contentBg, styles.awardsGrid)}>
        {showcase.awards.map((a, i) => (
          <div key={i} className={cx(base.slot, styles.award)} title={a.name}>
            <img
              className={styles.awardIcon}
              src={a.image}
              alt={a.name}
              onMouseEnter={a.animated ? (e) => (e.currentTarget.src = a.animated!) : undefined}
              onMouseLeave={a.animated ? (e) => (e.currentTarget.src = a.image) : undefined}
            />
            <span className={styles.awardCount}>{a.count}</span>
          </div>
        ))}
      </div>
      <StatsRow stats={showcase.stats} className={base.contentBg} />
    </div>
  );
}
