/**
 * Profile showcases, rebuilt from Steam's markup and CSS.
 *
 * The element structure and class names follow Steam's profile page (see
 * reference/html/SHOWCASES.md and reference/html/fuzzycast-profile.html) so
 * every size can be checked against Steam's profilev2.css. Showcases the
 * preview can't draw yet show just their title bar, so the order stays right.
 */
"use client";
/* eslint-disable @next/next/no-img-element -- Steam's own resized images, loaded as-is. */
import type {
  AchievementShowcase,
  ArtworkShowcase,
  BadgeCollectorShowcase,
  CompletionistShowcase,
  FavoriteGuideShowcase,
  GameCollectorShowcase,
  RareAchievementShowcase,
  ReplayShowcase,
  ScreenshotShowcase,
  Showcase,
  ShowcaseStat,
} from "@/lib/steam/showcases/types";
import type { MouseEvent } from "react";
import { useReorderDrag } from "@/components/Studio/useReorderDrag";
import { NO_LINK } from "@/lib/studio/showcaseEditor";
import styles from "./Showcases.module.css";
import replay from "./Replay.module.css";
import more from "./MoreShowcases.module.css";
import {
  AwardsView,
  CustomTextView,
  FavoriteGameView,
  FavoriteGroupView,
  ItemShowcaseView,
  MyGuidesView,
  MyWorkshopView,
  OwnerBar,
  ReviewView,
  SalienView,
  TradeShowcaseView,
  WorkshopItemView,
} from "./MoreShowcases";

/** One showcase on the preview. */
export interface ShowcaseItem {
  id: string;
  showcase: Showcase;
  /** "placeholder": Steam's markup for this type isn't captured, so a marked box is drawn instead. */
  source?: "profile" | "sample" | "placeholder" | "planner";
  /** Outline each image, to show where the slots are. */
  outlineImages?: boolean;
}

/** Editing controls. Without them the showcases are drawn exactly as Steam does. */
export interface ShowcaseEditing {
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}

export function Showcases({ items, editing }: { items: ShowcaseItem[]; editing?: ShowcaseEditing }) {
  const drag = useReorderDrag(editing?.onMove ?? (() => {}));
  return (
    // Sample content links nowhere: ignore clicks on those links.
    <div className={styles.area} data-testid="showcases" onClickCapture={ignoreEmptyLinks}>
      {items.map((item, i) => {
        const drop = drag.dropAt?.index === i ? drag.dropAt.side : undefined;
        return (
          <ShowcaseBox
            key={item.id}
            item={item}
            editing={
              editing && {
                index: i,
                count: items.length,
                drop,
                dragging: drag.dragging === i,
                handleProps: drag.handleProps(i, "[data-showcase]"),
                targetProps: drag.targetProps(i),
                onMove: editing.onMove,
                onRemove: () => editing.onRemove(item.id),
              }
            }
          />
        );
      })}
    </div>
  );
}

function ignoreEmptyLinks(e: MouseEvent<HTMLElement>) {
  const link = (e.target as Element).closest("a");
  if (link?.getAttribute("href") === NO_LINK) e.preventDefault();
}

interface BoxEditing {
  index: number;
  count: number;
  drop?: "before" | "after";
  dragging: boolean;
  handleProps: ReturnType<ReturnType<typeof useReorderDrag>["handleProps"]>;
  targetProps: ReturnType<ReturnType<typeof useReorderDrag>["targetProps"]>;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

function ShowcaseBox({ item, editing }: { item: ShowcaseItem; editing?: BoxEditing }) {
  const { showcase } = item;
  // Artwork and Featured Artwork are both `.myart` on Steam, whose CSS hides the header.
  const isArt = showcase.kind === "artwork" || showcase.kind === "featuredArtwork";
  const editClasses = editing
    ? [
        styles.editable,
        editing.dragging ? styles.dragging : "",
        editing.drop === "before" ? styles.dropBefore : "",
        editing.drop === "after" ? styles.dropAfter : "",
      ].join(" ")
    : "";
  return (
    <div
      className={`${styles.customization} ${isArt ? styles.myart : ""} ${item.outlineImages ? styles.outlineImages : ""} ${editClasses}`}
      data-showcase={showcase.kind}
      data-source={item.source}
      {...editing?.targetProps}
    >
      {/* Steam hides the Artwork showcase's header with CSS; so do we. */}
      {!isArt && (
        <div className={`${styles.header} ${showcase.kind === "customText" ? more.ellipsis : ""}`}>
          {showcase.title}
        </div>
      )}
      {/* My Workshop and My Guides put the owner's bar between the header and the block. */}
      {showcase.kind === "myWorkshop" && <OwnerBar owner={showcase.owner} />}
      {showcase.kind === "myGuides" && <OwnerBar owner={showcase.owner} guides />}
      <div className={`${styles.block} ${showcase.kind === "replay" ? styles.replayBlock : ""}`}>
        {(showcase.kind === "artwork" ||
          showcase.kind === "screenshot" ||
          showcase.kind === "video" ||
          showcase.kind === "featuredArtwork") && <Artwork showcase={showcase} />}
        {showcase.kind === "rareAchievement" && <Achievement showcase={showcase} />}
        {showcase.kind === "item" && <ItemShowcaseView showcase={showcase} />}
        {showcase.kind === "trade" && <TradeShowcaseView showcase={showcase} />}
        {showcase.kind === "favoriteGame" && <FavoriteGameView showcase={showcase} />}
        {showcase.kind === "customText" && <CustomTextView showcase={showcase} />}
        {showcase.kind === "favoriteGroup" && <FavoriteGroupView showcase={showcase} />}
        {showcase.kind === "review" && <ReviewView showcase={showcase} />}
        {showcase.kind === "workshopItem" && <WorkshopItemView showcase={showcase} />}
        {showcase.kind === "myWorkshop" && <MyWorkshopView showcase={showcase} />}
        {showcase.kind === "myGuides" && <MyGuidesView showcase={showcase} />}
        {showcase.kind === "salien" && <SalienView showcase={showcase} />}
        {showcase.kind === "awards" && <AwardsView showcase={showcase} />}
        {showcase.kind === "gameCollector" && <GameCollector showcase={showcase} />}
        {showcase.kind === "badgeCollector" && <BadgeCollector showcase={showcase} />}
        {showcase.kind === "favoriteGuide" && <FavoriteGuide showcase={showcase} />}
        {showcase.kind === "completionist" && <Completionist showcase={showcase} />}
        {showcase.kind === "replay" && <Replay showcase={showcase} />}
        {showcase.kind === "achievement" && <Achievement showcase={showcase} />}
        {showcase.kind === "unsupported" &&
          (item.source === "placeholder" ? (
            <div className={`${styles.contentBg} ${styles.placeholder}`}>
              Placeholder. Steam&apos;s layout for this showcase hasn&apos;t been captured yet, so the preview
              can&apos;t draw it.
            </div>
          ) : (
            <div className={styles.unsupported}>This showcase isn&apos;t in the preview yet.</div>
          ))}
      </div>
      {editing && (
        // Floats over the showcase on hover, so it never moves Steam's layout.
        <div className={styles.editBar} role="group" aria-label={`${showcase.title} controls`}>
          <button
            type="button"
            className={`${styles.editButton} ${styles.dragHandle}`}
            title="Drag to reorder"
            aria-label="Drag to reorder"
            {...editing.handleProps}
          >
            ⠿
          </button>
          <button
            type="button"
            className={styles.editButton}
            title="Move up"
            aria-label="Move up"
            disabled={editing.index === 0}
            onClick={() => editing.onMove(editing.index, editing.index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.editButton}
            title="Move down"
            aria-label="Move down"
            disabled={editing.index === editing.count - 1}
            onClick={() => editing.onMove(editing.index, editing.index + 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className={styles.editButton}
            title="Remove"
            aria-label={`Remove ${showcase.title}`}
            onClick={editing.onRemove}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function Stats({ stats, wrap = false }: { stats: ShowcaseStat[]; wrap?: boolean }) {
  if (!stats.length) return null;
  return (
    <div className={`${styles.contentBg} ${styles.statsRow} ${wrap ? styles.statsRowWrap : ""}`}>
      {stats.map((s, i) => {
        const inner = (
          <>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </>
        );
        return s.href ? (
          <a
            key={i}
            className={`${styles.stat} ${styles.statLink}`}
            href={s.href}
            title={s.tooltip}
            target="_blank"
            rel="noreferrer"
          >
            {inner}
          </a>
        ) : (
          <div key={i} className={styles.stat} title={s.tooltip}>
            {inner}
          </div>
        );
      })}
      <div className={styles.clearStart} />
    </div>
  );
}

/**
 * Artwork, and the showcases that share its markup: Screenshot, Video and
 * Featured Artwork (one wide `.single` image, no small ones).
 */
function Artwork({ showcase }: { showcase: ArtworkShowcase | ScreenshotShowcase }) {
  const { primary, small } = showcase;
  const single = showcase.kind === "featuredArtwork";
  const video = showcase.kind === "video";
  // Steam puts the play icon on the large video only.
  const playIcon = video && (
    <img
      className={more.playVideoIcon}
      src="https://community.fastly.steamstatic.com/public/shared/images/apphubs/play_icon80.png"
      alt=""
    />
  );
  const long = showcase.mode === "long";
  return (
    <div className={styles.screenshotShowcase}>
      {primary && (
        <div className={`${styles.screenshotPrimary} ${single ? more.single : ""} ${styles.slot}`}>
          <a className={styles.screenshot} href={primary.href} target="_blank" rel="noreferrer">
            {playIcon}
            {/* Featured Artwork's image has no width="100%" on Steam: it shows at its own size. */}
            <img
              width={single ? undefined : "100%"}
              style={{ maxWidth: primary.maxWidth ?? (long ? 506 : 480) }}
              src={primary.image}
              alt={primary.name}
              data-artwork-slot="main"
            />
          </a>
          <div className={styles.screenshotItemName}>{primary.name}</div>
          <div className={styles.screenshotStats}>
            {primary.stats?.map((st, i) => (
              <span key={i} className={more.screenshotStat} title={st.name}>
                {st.icon ? (
                  <img className={more.statIcon} src={st.icon} alt="" />
                ) : (
                  <span className={`${more.statIcon} ${more.favoriteIcon}`} />
                )}{" "}
                {st.value}
              </span>
            ))}
          </div>
        </div>
      )}
      {!single && (
        <div className={styles.screenshotRightCol}>
          {small.map((s, i) => (
            <div key={i} className={`${styles.smallScreenshot} ${styles.slot}`}>
              <a className={styles.screenshot} href={s.href} target="_blank" rel="noreferrer">
                <img width="100%" style={{ maxWidth: s.maxWidth ?? 100 }} src={s.image} alt="" data-artwork-slot={i} />
              </a>
            </div>
          ))}
          {showcase.more && (
            <a
              className={`${styles.smallScreenshot} ${more.screenshotCount}`}
              href={showcase.more.href}
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.screenshot}>{showcase.more.text}</div>
            </a>
          )}
        </div>
      )}
      {!single && <div className={styles.clearBoth} />}
    </div>
  );
}

function GameCollector({ showcase }: { showcase: GameCollectorShowcase }) {
  return (
    <>
      <div>
        <Stats stats={showcase.stats} />
        {showcase.bodyLabel && <div className={styles.bodyLabel}>{showcase.bodyLabel}</div>}
        {showcase.games.length > 0 && (
          <div className={styles.gameCollectorGames}>
            {showcase.games.map((g, i) => (
              <div key={i} className={`${styles.slot} ${styles.gameCollectorGame}`}>
                <a href={g.href} target="_blank" rel="noreferrer">
                  <img className={styles.gameCapsule} src={g.image} alt="" />
                </a>
              </div>
            ))}
            <div className={styles.clearStart} />
          </div>
        )}
      </div>
      <div className={styles.clearBoth} />
    </>
  );
}

function BadgeCollector({ showcase }: { showcase: BadgeCollectorShowcase }) {
  return (
    <>
      <div>
        <div className={styles.badgesIcons}>
          {showcase.badges.map((b, i) => (
            <div key={i} className={`${styles.slot} ${styles.badge}`} title={b.tooltip.join("\n")}>
              <a href={b.href} target="_blank" rel="noreferrer">
                <img className={styles.badgeIcon} src={b.image} alt={b.tooltip[0] ?? ""} />
              </a>
            </div>
          ))}
          <div className={styles.clearStart} />
        </div>
        <Stats stats={showcase.stats} />
      </div>
      <div className={styles.clearBoth} />
    </>
  );
}

function FavoriteGuide({ showcase }: { showcase: FavoriteGuideShowcase }) {
  const g = showcase.guide;
  if (!g) return null;
  return (
    <div className={styles.favoriteGuide}>
      <div className={styles.contentBg}>
        <div className={`${styles.workshopItem} ${styles.slot}`}>
          <a href={g.href} target="_blank" rel="noreferrer">
            <img className={styles.workshopItemImage} src={g.image} alt="" />
          </a>
          <div className={styles.guideDetails}>
            <div className={styles.detailTitle} title={g.name}>
              <a href={g.href} target="_blank" rel="noreferrer">
                {g.name}
              </a>
            </div>
            {g.authors.length > 0 && (
              <div className={styles.guideContributors}>
                {g.creditPrefix}
                {g.authors.map((a, i) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    <a href={a.href} target="_blank" rel="noreferrer">
                      {a.name}
                    </a>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.guideAppInfo}>
              {g.stars && (
                <div className={styles.workshopStars}>
                  <img src={g.stars.image} alt="" /> {g.stars.text}
                </div>
              )}
              {g.app && (
                <div className={styles.workshopApp}>
                  <a href={g.app.href} target="_blank" rel="noreferrer">
                    <img src={g.app.icon} alt="" />
                  </a>{" "}
                  <a href={g.app.href} target="_blank" rel="noreferrer">
                    {g.app.name}
                  </a>
                </div>
              )}
            </div>
            <div className={styles.guideDescription}>{g.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Completionist({ showcase }: { showcase: CompletionistShowcase }) {
  return (
    <>
      <div className={styles.completionist}>
        {showcase.games.length > 0 && (
          <div className={`${styles.contentBg} ${styles.completionistSlots}`}>
            {showcase.games.map((g, i) => (
              <div
                key={i}
                className={`${styles.slot} ${styles.completionistGame} ${g.adultContent ? styles.adultContent : ""}`}
              >
                <a href={g.href} target="_blank" rel="noreferrer">
                  <img className={styles.completionistCapsule} src={g.image} alt="" />
                  <div className={styles.completionistBar}>
                    <div className={styles.completionistRibbons}>
                      <span className={styles.ribbons}>
                        {g.ribbons.map((r, j) => (
                          <span key={j} className={`${styles.ribbonGroup} ${styles[`ribbon_${r.variant}`] ?? ""}`}>
                            {r.count && <span className={styles.ribbonCount}>{r.count}</span>}
                            {Array.from({ length: Math.max(1, r.trophies) }, (_, k) => (
                              <span key={k} className={`${styles.ribbon} ${k > 0 ? styles.stacked : ""}`} />
                            ))}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className={styles.completionistCounts}>
                      <div className={styles.numAchievements}>{g.achievements}</div>
                      {g.subtitle && <div className={styles.countsSubtitle}>{g.subtitle}</div>}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
        <Stats stats={showcase.stats} wrap />
      </div>
      <div className={styles.clearBoth} />
    </>
  );
}

/** Achievement, and Rarest Achievement (same markup, but Steam picks the tiles, so they aren't slots). */
function Achievement({ showcase }: { showcase: AchievementShowcase | RareAchievementShowcase }) {
  const slot = showcase.kind === "achievement" ? styles.slot : "";
  return (
    <>
      <div className={styles.achievementShowcase}>
        {showcase.achievements.length > 0 && (
          <div className={`${styles.contentBg} ${styles.achievementIcons}`}>
            {showcase.achievements.map((a, i) => (
              <div
                key={i}
                className={`${slot} ${styles.achievement} ${a.rare ? styles.rare : ""}`}
                title={[a.name, a.description, a.game, a.percent].filter(Boolean).join("\n")}
              >
                {a.rare && (
                  <div className={styles.glowRoot}>
                    <div className={styles.glowContainer}>
                      <div className={styles.glow} />
                    </div>
                  </div>
                )}
                <a href={a.href} target="_blank" rel="noreferrer">
                  <img src={a.image} alt={a.name ?? ""} />
                </a>
              </div>
            ))}
            <div className={styles.clearStart} />
          </div>
        )}
        <Stats stats={showcase.stats} wrap />
      </div>
      <div className={styles.clearBoth} />
    </>
  );
}

/** Steam Replay. Its CSS is inline in Steam's page; see Replay.module.css. */
function Replay({ showcase }: { showcase: ReplayShowcase }) {
  const sizeClass = replay[showcase.background.size] ?? replay.xsmall_capsule_background;
  const body = (
    <div className={`${replay.replay} ${replay[`gradient_${showcase.year}`] ?? ""}`}>
      <div className={replay.background_ctn}>
        <div className={replay.background_img_ctn}>
          {showcase.background.images.map((src, i) => (
            <img key={i} className={sizeClass} src={src} alt="" />
          ))}
        </div>
      </div>
      <div className={replay.games_played_ctn}>
        <div className={`${replay.big_stat} ${showcase.gamesPlayed.highNum ? replay.high_num : ""}`}>
          {showcase.gamesPlayed.value}
        </div>
        <div className={replay.games_played_text}>
          <div className={replay.games_played_title}>{showcase.gamesPlayed.label}</div>
        </div>
      </div>
      {showcase.stats.map((s) => (
        <div key={s.key} className={`${replay.stat_ctn} ${replay[s.key] ?? ""}`}>
          <div className={`${replay.mid_stat} ${replay[s.size] ?? ""}`}>{s.value}</div>
          {s.label}
        </div>
      ))}
      <div className={replay.most_played_ctn}>
        <div className={replay.most_played_images_ctn}>
          {showcase.mostPlayed.map((m, i) => (
            <div key={i} className={replay.most_played_app}>
              <img className={replay.most_played_capsule} src={m.image} alt="" />
              <div className={replay.most_played_percent}>{m.percent}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return showcase.href ? (
    <a href={showcase.href} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    body
  );
}
