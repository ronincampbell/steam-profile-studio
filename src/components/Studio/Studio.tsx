"use client";
/**
 * The whole app on one page: paste a profile, see it as Steam draws it, try
 * on Points Shop items or your own art.
 *
 * The pasted profile lives in the URL (?profile=…), so a link to the page
 * shows the same profile to whoever opens it.
 */
import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ItemBrowser } from "@/components/ItemBrowser/ItemBrowser";
import { ProfilePreview } from "@/components/ProfilePreview/ProfilePreview";
import {
  addShowcase,
  fromProfile,
  moveShowcase,
  removeShowcase,
  type EditorShowcase,
} from "@/lib/studio/showcaseEditor";
import { buildLook, PLACEHOLDER_PROFILE, type CustomArt, type Slot, type TryOn } from "@/lib/studio/look";
import type { Cosmetic, ItemType, ShopItem } from "@/lib/steam/types";
import { CustomArtPicker } from "./CustomArtPicker";
import { FitToWidth } from "./FitToWidth";
import { ShowcasesNotice } from "./ShowcasesNotice";
import { ShowcaseList } from "./ShowcaseList";
import { SlotBar } from "./SlotBar";
import { useProfile, type ProfileState } from "./useProfile";
import { useShowcases } from "./useShowcases";
import styles from "./Studio.module.css";

const SLOT_BY_TYPE: Partial<Record<ItemType, Slot>> = {
  background: "background",
  "avatar-frame": "avatarFrame",
  "animated-avatar": "animatedAvatar",
};

export function Studio() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("profile");
  const state = useProfile(query);
  const [draft, setDraft] = useState(query ?? "");
  const [tryOn, setTryOn] = useState<TryOn>({});
  const [custom, setCustom] = useState<CustomArt>({});

  const profile = state.status === "ready" ? state.profile : PLACEHOLDER_PROFILE;
  const look = useMemo(() => buildLook(profile, tryOn, custom), [profile, tryOn, custom]);
  const steamId = state.status === "ready" ? state.profile.steamId : null;
  const showcasesState = useShowcases(steamId);
  const showcases = showcasesState.showcases;

  // Showcase edits live only in this tab. They belong to one profile: loading
  // another starts again from that profile's own showcases.
  const profileShowcases = useMemo(() => showcases?.showcases ?? [], [showcases]);
  const initialShowcases = useMemo(() => (showcases ? fromProfile(showcases.showcases) : null), [showcases]);
  const [showcaseEdits, setShowcaseEdits] = useState<{ steamId: string; list: EditorShowcase[] } | null>(null);
  const edited = showcaseEdits !== null && showcaseEdits.steamId === steamId;
  const showcaseList = edited ? showcaseEdits.list : initialShowcases;
  function editShowcases(change: (list: EditorShowcase[]) => EditorShowcase[]) {
    if (!steamId || !showcaseList) return;
    setShowcaseEdits({ steamId, list: change(showcaseList) });
  }

  const current = useMemo(() => {
    const out: Partial<Record<Slot, Cosmetic | undefined>> = {};
    for (const slot of ["background", "avatarFrame", "animatedAvatar", "theme"] as Slot[]) {
      out[slot] = slot in tryOn ? (tryOn[slot] ?? undefined) : profile.equipped[slot];
    }
    return out;
  }, [profile, tryOn]);

  async function apply(slot: Slot, item: ShopItem) {
    setTryOn((prev) => ({ ...prev, [slot]: item }));
    if (slot !== "theme" || !item.bundleDefids) return;
    // A Points Shop "theme" is a bundle: put its background, frame and
    // animated avatar on too, the way equipping it on Steam does.
    try {
      const res = await fetch(`/api/bundle?appid=${item.appid}&defid=${item.defid}`);
      if (!res.ok) return;
      const { items } = (await res.json()) as { items: ShopItem[] };
      setTryOn((prev) => {
        // Ignore a slow answer if another theme was picked meanwhile.
        if (prev.theme !== item) return prev;
        const next = { ...prev };
        for (const part of items) {
          const partSlot = SLOT_BY_TYPE[part.type];
          if (partSlot) next[partSlot] = part;
        }
        return next;
      });
    } catch {
      // Colours still apply; the bundle's other parts just don't.
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    setTryOn({});
    router.replace(`${pathname}?profile=${encodeURIComponent(q)}`, { scroll: false });
  }

  return (
    <div className={styles.studio}>
      <header className={styles.topBar}>
        <h1 className={styles.title}>Steam Profile Studio</h1>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="profile-input">
            Steam profile
          </label>
          <input
            id="profile-input"
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste a Steam profile link, custom URL name or SteamID"
            autoComplete="off"
            spellCheck={false}
          />
          <button className={styles.button} type="submit" disabled={state.status === "loading"}>
            {state.status === "loading" ? "Loading…" : "Load profile"}
          </button>
        </form>
        <StatusLine state={state} />
        {state.status === "ready" && <ShowcasesNotice state={showcasesState} />}
      </header>

      <FitToWidth>
        <ProfilePreview
          look={look}
          showcases={state.status === "ready" ? showcases : undefined}
          showcaseItems={showcaseList ?? undefined}
          showcaseEditing={
            showcaseList
              ? {
                  onMove: (from, to) => editShowcases((l) => moveShowcase(l, from, to)),
                  onRemove: (id) => editShowcases((l) => removeShowcase(l, id)),
                }
              : undefined
          }
        />
      </FitToWidth>

      <div className={styles.controls}>
        <SlotBar
          profile={profile}
          tryOn={tryOn}
          custom={custom}
          onRemove={(slot) => setTryOn({ ...tryOn, [slot]: null })}
          onReset={(slot) => {
            const next = { ...tryOn };
            delete next[slot];
            setTryOn(next);
          }}
        />
        <CustomArtPicker custom={custom} onChange={setCustom} />
        {showcaseList && (
          <ShowcaseList
            list={showcaseList}
            profileShowcases={profileShowcases}
            edited={edited}
            onMove={(from, to) => editShowcases((l) => moveShowcase(l, from, to))}
            onRemove={(id) => editShowcases((l) => removeShowcase(l, id))}
            onAdd={(type) => editShowcases((l) => addShowcase(l, type, profileShowcases, { name: profile.name }))}
            onReset={() => setShowcaseEdits(null)}
          />
        )}
      </div>

      <ItemBrowser current={current} onApply={apply} />
    </div>
  );
}

function StatusLine({ state }: { state: ProfileState }) {
  if (state.status === "error") return <p className={styles.error}>{state.message}</p>;
  if (state.status === "ready" && !state.profile.isPublic) {
    return <p className={styles.note}>This profile is private, so Steam only shares its name and avatar.</p>;
  }
  if (state.status === "idle") {
    return <p className={styles.note}>Showing a blank profile. Load yours to see it with its current items.</p>;
  }
  return null;
}
