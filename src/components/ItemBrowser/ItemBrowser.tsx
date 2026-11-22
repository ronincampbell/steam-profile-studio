"use client";
/**
 * Browse Points Shop items by type: Popular, New or By game, with vibe
 * filters from the games' store tags and (for backgrounds) animated or still.
 * Click one to try it on, and follow its link to buy it.
 *
 * Steam has no link to a single Points Shop item, so "Buy" opens the item's
 * game page in the shop, which lists it (see reference/api/FINDINGS.md).
 */
/* eslint-disable @next/next/no-img-element -- Steam CDN images and animated GIF/APNGs */
import { useEffect, useState } from "react";
import {
  VIBES,
  type Cosmetic,
  type GameGroup,
  type ItemType,
  type Motion,
  type ShopItem,
  type Vibe,
} from "@/lib/steam/types";
import type { Slot } from "@/lib/studio/look";
import { useCatalogue, useGames, type CatalogueQuery } from "./useCatalogue";
import styles from "./ItemBrowser.module.css";

export const TABS: {
  type: ItemType;
  slot: Slot;
  label: string;
  noun: [string, string];
}[] = [
  {
    type: "background",
    slot: "background",
    label: "Backgrounds",
    noun: ["background", "backgrounds"],
  },
  {
    type: "avatar-frame",
    slot: "avatarFrame",
    label: "Avatar frames",
    noun: ["frame", "frames"],
  },
  {
    type: "animated-avatar",
    slot: "animatedAvatar",
    label: "Animated avatars",
    noun: ["avatar", "avatars"],
  },
  {
    type: "theme",
    slot: "theme",
    label: "Profile themes",
    noun: ["theme", "themes"],
  },
];

type View = "popular" | "new" | "games";
const VIEWS: { id: View; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "new", label: "New" },
  { id: "games", label: "By game" },
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
  /** The loaded profile's SteamID64, so By game can put its games first. */
  owner?: string;
  /** The profile's avatar, shown inside frames. */
  avatar?: string;
}

export function ItemBrowser({
  current,
  onApply,
  type,
  onTypeChange,
  inPanel,
  owner,
  avatar,
}: Props) {
  const tab = TABS.find((t) => t.type === type) ?? TABS[0];
  const [draft, setDraft] = useState("");
  const search = useDebounced(draft.trim(), 350);
  const [view, setView] = useState<View>("popular");
  const [vibe, setVibe] = useState<Vibe | undefined>();
  const [motion, setMotion] = useState<Motion>("animated");
  const [game, setGame] = useState<{ appid: number; name: string } | null>(
    null,
  );
  const [shown, setShown] = useState(BATCH);

  // Start from the top again whenever the type changes.
  const [shownFor, setShownFor] = useState(tab.type);
  if (shownFor !== tab.type) {
    setShownFor(tab.type);
    setShown(BATCH);
    setGame(null);
  }

  const still = tab.type === "background" && motion === "still";
  const base: CatalogueQuery = {
    type: tab.type,
    sort: view === "new" ? "new" : "popular",
    motion: tab.type === "background" ? motion : undefined,
    vibe: still ? undefined : vibe,
    q: search || undefined,
  };
  const showGames = view === "games" && !game;
  const items = useCatalogue(
    showGames
      ? null
      : game
        ? { ...base, vibe: undefined, app: game.appid }
        : base,
  );
  const games = useGames(
    showGames ? { ...base, sort: "popular", owner } : null,
  );

  function reset(change: () => void) {
    change();
    setShown(BATCH);
  }

  const noun = (n: number) =>
    `${n.toLocaleString("en-AU")} ${tab.noun[n === 1 ? 0 : 1]}`;
  const active = showGames ? games : items;
  const visible = items.list.slice(0, shown);
  const canShowMore = showGames
    ? games.hasMore
    : shown < items.list.length || items.hasMore;

  function showMore() {
    if (showGames) return games.loadMore();
    if (shown + BATCH > items.list.length) items.loadMore();
    setShown(shown + BATCH);
  }

  function openGame(appid: number, name: string) {
    reset(() => setGame({ appid, name }));
  }

  return (
    <section
      className={`${styles.browser} ${inPanel ? styles.inPanel : ""}`}
      aria-label="Points Shop items"
    >
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

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          value={draft}
          onChange={(e) => reset(() => setDraft(e.target.value))}
          placeholder={`Search ${tab.noun[1]} or games`}
          aria-label={`Search ${tab.noun[1]} or games`}
        />
        <Segmented
          label="Order"
          options={VIEWS}
          value={view}
          onChange={(v) => reset(() => (setView(v), setGame(null)))}
        />
      </div>

      <div className={styles.filters}>
        {tab.type === "background" && !game && (
          <Segmented
            label="Animated or still"
            small
            options={[
              { id: "animated", label: "Animated" },
              { id: "still", label: "Still" },
            ]}
            value={motion}
            onChange={(m) => reset(() => setMotion(m))}
          />
        )}
        {game ? (
          <button
            className={`${styles.chip} ${styles.gameChip}`}
            onClick={() => reset(() => setGame(null))}
          >
            <span aria-hidden>‹</span> {game.name} <span aria-hidden>✕</span>
          </button>
        ) : (
          !still &&
          tab.type !== "theme" &&
          [undefined, ...(Object.keys(VIBES) as Vibe[])].map((v) => (
            <button
              key={v ?? "all"}
              className={styles.chip}
              aria-pressed={vibe === v}
              onClick={() => reset(() => setVibe(v))}
            >
              {v ? VIBES[v].label : "All"}
            </button>
          ))
        )}
      </div>

      {/* By game with a profile has its own section counts. */}
      {!(showGames && !active.loading && !active.error && games.extra > 0) && (
        <p className={styles.count}>
          {active.loading
            ? "Loading…"
            : active.error
              ? active.error
              : showGames
                ? still && !owner
                  ? "Load a profile to see still backgrounds from your games."
                  : `${games.total.toLocaleString("en-AU")} ${games.total === 1 ? "game" : "games"}`
                : noun(items.total)}
        </p>
      )}

      {showGames ? (
        <div className={styles.games}>
          {games.list.map((g, i) => (
            <div key={g.appid}>
              {(i === 0 || games.list[i - 1].mine !== g.mine) &&
                games.extra > 0 && (
                  <h3 className={styles.section}>
                    {g.mine
                      ? `Your games · ${games.extra}`
                      : `All games · ${games.total - games.extra}`}
                  </h3>
                )}
              <GameRow
                group={g}
                noun={noun}
                slot={tab.slot}
                current={current}
                avatar={avatar}
                onOpen={() => openGame(g.appid, g.name)}
                onApply={(item) => onApply(tab.slot, item)}
              />
            </div>
          ))}
        </div>
      ) : (
        <ul
          className={`${styles.grid} ${styles[tab.type.replace(/-(\w)/g, (_, c) => c.toUpperCase())] ?? ""}`}
        >
          {visible.map((item) => (
            <ItemCard
              key={item.defid}
              item={item}
              avatar={avatar}
              selected={isSame(current[tab.slot], item)}
              onApply={() => onApply(tab.slot, item)}
              onGame={
                game ? undefined : () => openGame(item.appid, item.game ?? "")
              }
            />
          ))}
        </ul>
      )}

      {!active.loading && canShowMore && (
        <button
          className={styles.more}
          onClick={showMore}
          disabled={active.loadingMore}
        >
          {active.loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  small,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div
      className={`${styles.segmented} ${small ? styles.segmentedSmall : ""}`}
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.id}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GameRow({
  group,
  noun,
  slot,
  current,
  avatar,
  onOpen,
  onApply,
}: {
  group: GameGroup;
  noun: (n: number) => string;
  slot: Slot;
  current: Partial<Record<Slot, Cosmetic | undefined>>;
  avatar?: string;
  onOpen: () => void;
  onApply: (item: ShopItem) => void;
}) {
  const more = group.count - group.items.length;
  return (
    <div className={styles.gameRow}>
      <button className={styles.gameHead} onClick={onOpen} title={group.name}>
        {group.capsule ? (
          <img
            className={styles.capsule}
            src={group.capsule}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className={`${styles.capsule} ${styles.noCapsule}`} aria-hidden>
            {group.name}
          </span>
        )}
        <span className={styles.gameInfo}>
          <b>{group.name}</b>
          <span>{noun(group.count)}</span>
        </span>
      </button>
      <ul
        className={`${styles.strip} ${styles[`strip_${group.items[0]?.type.replace(/-(\w)/g, (_, c) => c.toUpperCase())}`] ?? ""}`}
      >
        {group.items.map((item) => (
          <li key={item.defid}>
            <button
              className={`${styles.mini} ${isSame(current[slot], item) ? styles.selected : ""}`}
              onClick={() => onApply(item)}
              aria-pressed={isSame(current[slot], item)}
              title={item.name}
            >
              <Thumb item={item} avatar={avatar} />
            </button>
          </li>
        ))}
        {more > 0 && (
          <li>
            <button className={styles.moreGame} onClick={onOpen}>
              +{more}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** The item's picture; frames sit over the profile's avatar. */
function Thumb({
  item,
  avatar,
  hover,
}: {
  item: ShopItem;
  avatar?: string;
  hover?: boolean;
}) {
  const preview = item.videoSmall ?? item.video;
  return (
    <span className={styles.thumb}>
      {item.type === "avatar-frame" && avatar && (
        <img className={styles.underFrame} src={avatar} alt="" />
      )}
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
    </span>
  );
}

function ItemCard({
  item,
  avatar,
  selected,
  onApply,
  onGame,
}: {
  item: ShopItem;
  avatar?: string;
  selected: boolean;
  onApply: () => void;
  /** Show this item's game; absent when already looking at one game. */
  onGame?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li className={`${styles.card} ${selected ? styles.selected : ""}`}>
      <button
        className={styles.apply}
        onClick={onApply}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-pressed={selected}
        title={`Try on ${item.name}`}
      >
        <Thumb item={item} avatar={avatar} hover={hover} />
        <span className={styles.name}>{item.name}</span>
      </button>
      {onGame && item.game && (
        <button className={styles.game} onClick={onGame} title={item.game}>
          {item.game}
        </button>
      )}
      <div className={styles.footer}>
        <span className={styles.cost}>
          {item.pointCost.toLocaleString("en-AU")} points
        </span>
        <a
          className={styles.buy}
          href={item.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Opens this item's game page in the Points Shop. Click the item there to buy it."
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
  return (
    a.appid === b.appid &&
    (a.image === b.image ||
      (a.animatedImage !== undefined && a.animatedImage === b.animatedImage))
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
