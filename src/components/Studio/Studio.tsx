"use client";
/**
 * The whole app on one page: paste a profile, see it as Steam draws it, try
 * on Points Shop items or your own art.
 *
 * The pasted profile lives in the URL (?profile=…), so a link to the page
 * shows the same profile to whoever opens it.
 */
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { DockLayout } from "./chrome/DockLayout";
import { DrawerLayout } from "./chrome/DrawerLayout";
import { LAYOUTS, type LayoutName, type PanelId } from "./chrome/menu";
import { ToolbarLayout } from "./chrome/ToolbarLayout";
import chrome from "./chrome/Chrome.module.css";
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

/** The menu layout everyone sees. `?ui=drawer|toolbar|dock` picks another, to compare. */
const DEFAULT_LAYOUT: LayoutName = "toolbar";

const LAYOUT_COMPONENTS = { drawer: DrawerLayout, toolbar: ToolbarLayout, dock: DockLayout };

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("profile", q);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  const ui = searchParams.get("ui");
  const Layout = LAYOUT_COMPONENTS[(LAYOUTS as readonly string[]).includes(ui ?? "") ? (ui as LayoutName) : DEFAULT_LAYOUT];

  function renderPanel(id: PanelId): ReactNode {
    switch (id) {
      case "wearing":
        return (
          <SlotBar
            profile={profile}
            tryOn={tryOn}
            custom={custom}
            onRemove={(slot) => setTryOn((prev) => ({ ...prev, [slot]: null }))}
            onReset={(slot) =>
              setTryOn((prev) => {
                const next = { ...prev };
                delete next[slot];
                return next;
              })
            }
          />
        );
      case "art":
        return <CustomArtPicker custom={custom} onChange={setCustom} />;
      case "showcases":
        return showcaseList ? (
          <ShowcaseList
            list={showcaseList}
            profileShowcases={profileShowcases}
            edited={edited}
            onMove={(from, to) => editShowcases((l) => moveShowcase(l, from, to))}
            onRemove={(id) => editShowcases((l) => removeShowcase(l, id))}
            onAdd={(type) => editShowcases((l) => addShowcase(l, type, profileShowcases, { name: profile.name }))}
            onReset={() => setShowcaseEdits(null)}
          />
        ) : (
          <p className={chrome.empty}>
            {state.status === "ready"
              ? "Fetching this profile's showcases from Steam…"
              : "Load a public profile to rearrange its showcases."}
          </p>
        );
      default:
        return <ItemBrowser inPanel type={id} onTypeChange={() => {}} current={current} onApply={apply} />;
    }
  }

  return (
    <div className={chrome.chrome}>
      <Layout
        form={{ draft, onDraftChange: setDraft, onSubmit: submit, loading: state.status === "loading" }}
        subject={state.status === "ready" ? { name: profile.name, avatar: profile.avatar, level: profile.level } : null}
        renderPanel={renderPanel}
        badges={{ wearing: Object.keys(tryOn).length, art: (custom.background ? 1 : 0) + (custom.avatar ? 1 : 0) }}
        notices={
          <>
            <StatusLine state={state} />
            {state.status === "ready" && <ShowcasesNotice state={showcasesState} />}
          </>
        }
        preview={
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
        }
      />
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
