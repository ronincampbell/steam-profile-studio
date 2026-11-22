"use client";
/**
 * One row per slot: what's showing now, where it came from, and buttons to
 * remove it, put the equipped item back, or buy what you're trying on.
 */
import type { Cosmetic, Profile, ShopItem } from "@/lib/steam/types";
import type { CustomArt, Slot, TryOn } from "@/lib/studio/look";
import styles from "./Studio.module.css";

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "background", label: "Background" },
  { slot: "avatarFrame", label: "Avatar frame" },
  { slot: "animatedAvatar", label: "Animated avatar" },
  { slot: "theme", label: "Theme" },
];

interface Props {
  profile: Profile;
  tryOn: TryOn;
  custom: CustomArt;
  onRemove: (slot: Slot) => void;
  onReset: (slot: Slot) => void;
}

export function SlotBar({ profile, tryOn, custom, onRemove, onReset }: Props) {
  return (
    <ul className={styles.slots}>
      {SLOTS.map(({ slot, label }) => {
        const tried = slot in tryOn;
        const item: Cosmetic | null | undefined = tried ? tryOn[slot] : profile.equipped[slot];
        const overridden = slot === "animatedAvatar" && custom.avatar;
        const name =
          slot === "theme" && !item
            ? themeName(tried ? undefined : profile.themeId)
            : (item?.name ?? "None");
        const source = overridden ? "hidden by your image" : tried ? "trying on" : "equipped";
        const buyUrl = tried && item && "buyUrl" in item ? (item as ShopItem).buyUrl : undefined;

        return (
          <li key={slot} className={styles.slot}>
            <span className={styles.slotLabel}>{label}</span>
            <span className={styles.slotName} title={name}>
              {name}
            </span>
            <span className={styles.slotSource}>{source}</span>
            <span className={styles.slotActions}>
              {buyUrl && (
                <a href={buyUrl} target="_blank" rel="noopener noreferrer">
                  Buy
                </a>
              )}
              {item && <button onClick={() => onRemove(slot)}>Remove</button>}
              {tried && <button onClick={() => onReset(slot)}>Undo</button>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function themeName(themeId: string | undefined) {
  if (!themeId) return "Default";
  // Steam's free themes: Summer, Midnight, Steel, Cosmic, DarkMode.
  return `${themeId.replace(/([a-z])([A-Z])/g, "$1 $2")} (free theme)`;
}
