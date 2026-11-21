"use client";
/**
 * A Steam profile page header, rebuilt to match Steam's own markup and CSS.
 *
 * Layers, bottom to top (CLAUDE.md "Architecture sketch"):
 *   1. page black + theme colours (CSS variables from src/lib/steam/themes.ts)
 *   2. profile background: image, or a looping muted video if animated
 *   3. avatar: static, or the animated avatar's GIF
 *   4. avatar frame (animated APNG; static PNG for reduced-motion users)
 *   5. name, real name + country, level badge and favourite badge
 * then the page content: showcases on the left, the right-hand column
 * (status, badges, counts, groups, friends) on the right.
 *
 * Class names in the CSS module follow Steam's (profile_header_bg_texture →
 * headerBgTexture and so on) so values can be checked against Steam's CSS.
 */
/* eslint-disable @next/next/no-img-element -- Steam's CDN images, APNGs and
   GIFs go straight to <img>; next/image would re-encode them and lose the animation. */
import { useEffect, useState, type CSSProperties } from "react";
import { levelBadge } from "@/lib/steam/level";
import { themeCssVars } from "@/lib/steam/themes";
import type { Video } from "@/lib/steam/types";
import type { ProfileShowcases } from "@/lib/steam/showcases/types";
import { Showcases, type ShowcaseEditing, type ShowcaseItem } from "@/components/Showcases/Showcases";
import { HeaderFavoriteBadge, Sidebar } from "./Sidebar";
import styles from "./ProfilePreview.module.css";

/** Everything the header draws. Built from a Profile plus whatever the user is trying on. */
export interface PreviewLook {
  name: string;
  realName?: string;
  countryCode?: string;
  level: number | null;
  status: "online" | "offline" | "in-game";
  /** The avatar image (Steam's 184×184, or an uploaded picture). */
  avatar: string;
  /** Animated avatar (GIF) shown in place of `avatar`, with its static fallback. */
  animatedAvatar?: { image?: string; animatedImage?: string };
  frame?: { image?: string; animatedImage?: string };
  background?: { image?: string; video?: Video };
  themeId?: string;
}

const COUNTRY_FLAGS =
  "https://community.fastly.steamstatic.com/public/images/countryflags/";

function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}

export function ProfilePreview({
  look,
  showcases,
  showcaseItems,
  showcaseEditing,
}: {
  look: PreviewLook;
  /** The profile's showcases: null while loading, undefined with no profile loaded. */
  showcases?: ProfileShowcases | null;
  /** The showcases to draw, when they've been edited. Defaults to `showcases` as Steam sent them. */
  showcaseItems?: ShowcaseItem[];
  /** Reorder and remove controls over each showcase. */
  showcaseEditing?: ShowcaseEditing;
}) {
  const items =
    showcaseItems ?? showcases?.showcases.map((showcase, i) => ({ id: String(i), showcase, source: "profile" as const }));
  const bg = look.background;
  const sidebar = showcases?.sidebar;
  const hasVideo = Boolean(bg?.video?.webm || bg?.video?.mp4);
  const imageRatio = useImageRatio(bg?.image);
  const [videoRatio, setVideoRatio] = useState<{
    src: string;
    ratio: number;
  } | null>(null);
  const videoSrc = bg?.video?.webm ?? bg?.video?.mp4;
  const ratio =
    (hasVideo && videoRatio && videoRatio.src === videoSrc
      ? videoRatio.ratio
      : undefined) ?? imageRatio;

  const pageStyle = {
    ...themeCssVars(look.themeId),
    backgroundImage: bg?.image && !hasVideo ? `url("${bg.image}")` : undefined,
    // Height ÷ width of the background, so the page can be as tall as it.
    "--bg-ratio": bg ? String(ratio ?? 1080 / 1920) : undefined,
  } as CSSProperties;

  return (
    <div className={styles.container}>
      <div
        className={`${styles.profilePage} ${bg ? styles.hasProfileBackground : ""}`}
        style={pageStyle}
        data-testid="profile-preview"
      >
        {hasVideo && (
          <div className={styles.animatedBackground}>
            {/* key: a new video needs a fresh element, or the old one keeps playing */}
            <video
              key={videoSrc}
              playsInline
              autoPlay
              muted
              loop
              poster={bg!.image}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth)
                  setVideoRatio({
                    src: videoSrc!,
                    ratio: v.videoHeight / v.videoWidth,
                  });
              }}
            >
              {bg!.video!.webm && (
                <source src={bg!.video!.webm} type="video/webm" />
              )}
              {bg!.video!.mp4 && (
                <source src={bg!.video!.mp4} type="video/mp4" />
              )}
            </video>
          </div>
        )}

        <div className={styles.headerBg}>
          <div className={styles.headerBgTexture}>
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <Avatar look={look} />

                <div className={styles.centeredCol}>
                  <div className={styles.centeredPersona}>
                    <div className={styles.personaName}>
                      <span>{look.name}</span>{" "}
                      <span className={styles.nameArrow} aria-hidden />
                    </div>
                    {(look.realName || look.countryCode) && (
                      <div className={styles.realName}>
                        {look.realName && <bdi>{look.realName}</bdi>}{" "}
                        {look.countryCode && (
                          <div className={styles.location}>
                            {" "}
                            <img
                              className={styles.flag}
                              src={`${COUNTRY_FLAGS}${look.countryCode.toLowerCase()}.gif`}
                              alt=""
                            />{" "}
                            {countryName(look.countryCode)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.badgeInfo}>
                  {look.level !== null && <Level level={look.level} />}
                  {sidebar?.favoriteBadge && <HeaderFavoriteBadge badge={sidebar.favoriteBadge} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.contentInner}>
            {/* div.profile_rightcol comes first in Steam's markup: it floats right. */}
            {sidebar && <Sidebar sidebar={sidebar} />}
            {/* div.profile_leftcol: showcases. */}
            <div className={styles.leftcol}>
              {items?.length ? <Showcases items={items} editing={showcaseEditing} /> : null}
              <div className={styles.contentNote}>{showcasesNote(showcases, items, Boolean(showcaseItems))}</div>
            </div>
            <div className={styles.clearBoth} />
          </div>
        </div>
      </div>
    </div>
  );
}

function showcasesNote(
  showcases: ProfileShowcases | null | undefined,
  items: ShowcaseItem[] | undefined,
  edited: boolean,
): string {
  if (edited && items) {
    if (!items.length) return "No showcases. Add one from the Showcases panel below.";
    if (showcases?.visibility === "public") return "Recent activity and comments aren't part of the preview yet.";
  }
  if (showcases === undefined) return "Paste a profile to see its showcases.";
  if (showcases === null) return "Loading showcases…";
  switch (showcases.visibility) {
    case "private":
      return "This profile is private, so Steam doesn't show its showcases.";
    case "unavailable":
      return "Steam is busy, so the showcases will appear once it answers.";
    default:
      return showcases.showcases.length
        ? "Recent activity and comments aren't part of the preview yet."
        : "This profile has no showcases.";
  }
}

/** Height ÷ width of an image, once it has loaded. */
function useImageRatio(src: string | undefined) {
  const [loaded, setLoaded] = useState<{ src: string; ratio: number } | null>(
    null,
  );
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth)
        setLoaded({ src, ratio: img.naturalHeight / img.naturalWidth });
    };
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);
  return loaded && loaded.src === src ? loaded.ratio : undefined;
}

function Avatar({ look }: { look: PreviewLook }) {
  const anim = look.animatedAvatar;
  return (
    <div
      className={`${styles.playerAvatar} ${styles[look.status === "in-game" ? "inGame" : look.status]}`}
    >
      <div className={styles.avatarInner}>
        {look.frame && (
          <div className={styles.avatarFrame}>
            <picture>
              {look.frame.image && (
                <source
                  media="(prefers-reduced-motion: reduce)"
                  srcSet={look.frame.image}
                />
              )}
              <img src={look.frame.animatedImage ?? look.frame.image} alt="" />
            </picture>
          </div>
        )}
        <picture>
          <source
            media="(prefers-reduced-motion: reduce)"
            srcSet={anim?.image ?? look.avatar}
          />
          <img
            src={anim?.animatedImage ?? anim?.image ?? look.avatar}
            alt={`${look.name}'s avatar`}
          />
        </picture>
      </div>
    </div>
  );
}

function Level({ level }: { level: number }) {
  const badge = levelBadge(level);
  const style: CSSProperties =
    badge.kind === "ring"
      ? { borderColor: badge.borderColor }
      : {
          backgroundImage: `url("${badge.image}")`,
          backgroundPosition: badge.position,
        };
  return (
    <div className={`${styles.personaName} ${styles.personaLevel}`}>
      Level{" "}
      <div
        className={`${styles.friendPlayerLevel} ${badge.kind === "sprite" ? styles.levelSprite : ""}`}
        style={style}
        data-level-class={badge.className}
      >
        <span className={styles.friendPlayerLevelNum}>{badge.level}</span>
      </div>
    </div>
  );
}
