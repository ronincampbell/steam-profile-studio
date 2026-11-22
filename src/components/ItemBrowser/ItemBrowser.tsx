"use client";
/**
 * Browse Points Shop items by type, search, click one to try it on, and
 * follow its link to buy it.
 *
 * Steam has no link to a single Points Shop item, so "Buy" opens the item's
 * game page in the shop, which lists it (see reference/api/FINDINGS.md).
 */
/* eslint-disable @next/next/no-img-element -- Steam CDN images and animated GIF/APNGs */
import { useEffect, useState } from "react";
import type { Cosmetic, ItemType, ShopItem } from "@/lib/steam/types";
import type { Slot } from "@/lib/studio/look";
import { useCatalogue } from "./useCatalogue";
import styles from "./ItemBrowser.module.css";

export const TABS: { type: ItemType; slot: Slot; label: string }[] = [
  { type: "background", slot: "background", label: "Backgrounds" },
  { type: "avatar-frame", slot: "avatarFrame", label: "Avatar frames" },
  { type: "animated-avatar", slot: "animatedAvatar", label: "Animated avatars" },
  { type: "theme", slot: "theme", label: "Profile themes" },
];

/** Cards shown before "Show more"; keeps the number of big images loading at once down. */
const BATCH = 24;

interface Props {
  /** What's currently showing in each slot (tried-on or equipped). */
  current: Partial<Record<Slot, Cosmetic | undefined>>;
  onApply: (slot: Slot, item: ShopItem) => void;
  /** Which item type to show. The app's menu picks it. */
  type: ItemType;
  onTypeChange: (type: ItemType) => void;
  /** Inside one of the app's panels: the panel names the type, so no tabs or outer padding. */
  inPanel?: boolean;
}

export function ItemBrowser({ current, onApply, type, onTypeChange, inPanel }: Props) {
  const tab = TABS.find((t) => t.type === type) ?? TABS[0];
  const [draft, setDraft] = useState("");
  const search = useDebounced(draft.trim(), 350);
  const catalogue = useCatalogue(tab.type, search);
  const [shown, setShown] = useState(BATCH);
  // Start from the first batch again whenever the type changes.
  const [shownFor, setShownFor] = useState(tab.type);
  if (shownFor !== tab.type) {
    setShownFor(tab.type);
    setShown(BATCH);
  }

  const visible = catalogue.items.slice(0, shown);
  const canShowMore = shown < catalogue.items.length || catalogue.hasMore;

  function showMore() {
    if (shown + BATCH > catalogue.items.length) catalogue.loadMore();
    setShown(shown + BATCH);
  }

  return (
    <section className={`${styles.browser} ${inPanel ? styles.inPanel : ""}`} aria-label="Points Shop items">
      <div className={styles.toolbar}>
        {!inPanel && (
          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.type}
                role="tab"
                aria-selected={t.type === tab.type}
                className={styles.tab}
                onClick={() => onTypeChange(t.type)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <input
          className={styles.search}
          type="search"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShown(BATCH);
          }}
          placeholder={`Search ${tab.label.toLowerCase()}`}
          aria-label={`Search ${tab.label.toLowerCase()}`}
        />
      </div>

      <p className={styles.count}>
        {catalogue.loading
          ? "Loading…"
          : catalogue.error
            ? catalogue.error
            : `${catalogue.total.toLocaleString("en-AU")} ${tab.label.toLowerCase()}${search ? ` matching “${search}”` : ""}`}
      </p>

      <ul className={`${styles.grid} ${styles[tab.type.replace(/-(\w)/g, (_, c) => c.toUpperCase())] ?? ""}`}>
        {visible.map((item) => (
          <ItemCard
            key={item.defid}
            item={item}
            selected={isSame(current[tab.slot], item)}
            onApply={() => onApply(tab.slot, item)}
          />
        ))}
      </ul>

      {!catalogue.loading && canShowMore && (
        <button className={styles.more} onClick={showMore} disabled={catalogue.loadingMore}>
          {catalogue.loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}

function ItemCard({ item, selected, onApply }: { item: ShopItem; selected: boolean; onApply: () => void }) {
  const [hover, setHover] = useState(false);
  const preview = item.videoSmall ?? item.video;
  return (
    <li className={`${styles.card} ${selected ? styles.selected : ""}`}>
      <button
        className={styles.apply}
        onClick={onApply}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-pressed={selected}
        title={item.name}
      >
        <span className={styles.thumb}>
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              // A few catalogue images 404 on Steam's CDN; show the empty tile instead of a broken icon.
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          )}
          {hover && preview && (
            <video autoPlay muted loop playsInline className={styles.thumbVideo}>
              {preview.webm && <source src={preview.webm} type="video/webm" />}
              {preview.mp4 && <source src={preview.mp4} type="video/mp4" />}
            </video>
          )}
          {item.animated && item.type === "background" && <span className={styles.badge}>Animated</span>}
        </span>
        <span className={styles.name}>{item.name}</span>
      </button>
      <div className={styles.footer}>
        <span className={styles.cost}>{item.pointCost.toLocaleString("en-AU")} points</span>
        <a
          className={styles.buy}
          href={item.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy in Points Shop
        </a>
      </div>
    </li>
  );
}

function isSame(a: Cosmetic | undefined, b: ShopItem) {
  if (!a) return false;
  if ("defid" in a) return (a as ShopItem).defid === b.defid;
  // Equipped items have no defid; match on their assets instead.
  return a.appid === b.appid && (a.image === b.image || (a.animatedImage !== undefined && a.animatedImage === b.animatedImage));
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
