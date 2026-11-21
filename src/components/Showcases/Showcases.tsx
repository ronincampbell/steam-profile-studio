/**
 * Profile showcases, rebuilt from Steam's markup and CSS.
 *
 * The element structure and class names follow Steam's profile page (see
 * reference/html/SHOWCASES.md and reference/html/fuzzycast-profile.html) so
 * every size can be checked against Steam's profilev2.css. Showcases the
 * preview can't draw yet show just their title bar, so the order stays right.
 */
/* eslint-disable @next/next/no-img-element -- Steam's own resized images, loaded as-is. */
import type {
  ArtworkShowcase,
  BadgeCollectorShowcase,
  GameCollectorShowcase,
  Showcase,
  ShowcaseStat,
} from "@/lib/steam/showcases/types";
import styles from "./Showcases.module.css";

export function Showcases({ showcases }: { showcases: Showcase[] }) {
  return (
    <div className={styles.area} data-testid="showcases">
      {showcases.map((s, i) => (
        <ShowcaseBox key={i} showcase={s} />
      ))}
    </div>
  );
}

function ShowcaseBox({ showcase }: { showcase: Showcase }) {
  const isArt = showcase.kind === "artwork";
  return (
    <div className={`${styles.customization} ${isArt ? styles.myart : ""}`} data-showcase={showcase.kind}>
      {/* Steam hides the Artwork showcase's header with CSS; so do we. */}
      {!isArt && <div className={styles.header}>{showcase.title}</div>}
      <div className={styles.block}>
        {showcase.kind === "artwork" && <Artwork showcase={showcase} />}
        {showcase.kind === "gameCollector" && <GameCollector showcase={showcase} />}
        {showcase.kind === "badgeCollector" && <BadgeCollector showcase={showcase} />}
        {showcase.kind === "unsupported" && (
          <div className={styles.unsupported}>This showcase isn&apos;t in the preview yet.</div>
        )}
      </div>
    </div>
  );
}

function Stats({ stats }: { stats: ShowcaseStat[] }) {
  if (!stats.length) return null;
  return (
    <div className={`${styles.contentBg} ${styles.statsRow}`}>
      {stats.map((s, i) => {
        const inner = (
          <>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </>
        );
        return s.href ? (
          <a key={i} className={`${styles.stat} ${styles.statLink}`} href={s.href} target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          <div key={i} className={styles.stat}>
            {inner}
          </div>
        );
      })}
      <div className={styles.clearStart} />
    </div>
  );
}

function Artwork({ showcase }: { showcase: ArtworkShowcase }) {
  const { primary, small } = showcase;
  return (
    <div className={styles.screenshotShowcase}>
      {primary && (
        <div className={`${styles.screenshotPrimary} ${styles.slot}`}>
          <a className={styles.screenshot} href={primary.href} target="_blank" rel="noreferrer">
            <img width="100%" style={{ maxWidth: 480 }} src={primary.image} alt={primary.name} />
          </a>
          <div className={styles.screenshotItemName}>{primary.name}</div>
          <div className={styles.screenshotStats} />
        </div>
      )}
      <div className={styles.screenshotRightCol}>
        {small.map((s, i) => (
          <div key={i} className={`${styles.smallScreenshot} ${styles.slot}`}>
            <a className={styles.screenshot} href={s.href} target="_blank" rel="noreferrer">
              <img width="100%" style={{ maxWidth: 100 }} src={s.image} alt="" />
            </a>
          </div>
        ))}
      </div>
      <div className={styles.clearBoth} />
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
