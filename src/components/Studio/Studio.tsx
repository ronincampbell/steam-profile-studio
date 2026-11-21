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
import { buildLook, PLACEHOLDER_PROFILE, type CustomArt, type Slot, type TryOn } from "@/lib/studio/look";
import type { Cosmetic } from "@/lib/steam/types";
import { CustomArtPicker } from "./CustomArtPicker";
import { FitToWidth } from "./FitToWidth";
import { SlotBar } from "./SlotBar";
import { useProfile, type ProfileState } from "./useProfile";
import styles from "./Studio.module.css";

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

  const current = useMemo(() => {
    const out: Partial<Record<Slot, Cosmetic | undefined>> = {};
    for (const slot of ["background", "avatarFrame", "animatedAvatar", "theme"] as Slot[]) {
      out[slot] = slot in tryOn ? (tryOn[slot] ?? undefined) : profile.equipped[slot];
    }
    return out;
  }, [profile, tryOn]);

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
      </header>

      <FitToWidth>
        <ProfilePreview look={look} />
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
      </div>

      <ItemBrowser current={current} onApply={(slot, item) => setTryOn({ ...tryOn, [slot]: item })} />
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
