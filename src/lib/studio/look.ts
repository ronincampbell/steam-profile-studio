/**
 * Work out what the preview should show: the profile as it is on Steam, with
 * whatever the user is trying on layered over it.
 */
import type { PreviewLook } from "@/components/ProfilePreview/ProfilePreview";
import type { Cosmetic, Profile } from "@/lib/steam/types";

/** Steam's "?" avatar, used before a profile is loaded. */
export const DEFAULT_AVATAR =
  "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg";

/** The slots a user can change. */
export type Slot = "background" | "avatarFrame" | "animatedAvatar" | "theme";

/**
 * What the user is trying on, per slot.
 * - missing: keep what the profile has equipped
 * - null: show the slot empty ("remove")
 * - a Cosmetic: show that item
 */
export type TryOn = Partial<Record<Slot, Cosmetic | null>>;

/**
 * The user's own avatar, as an object URL, so nothing leaves the browser.
 * (No custom background: Steam doesn't allow one. Their own artwork goes in
 * the Artwork showcase instead, see src/components/Studio/YourArtPanel.tsx.)
 */
export interface CustomArt {
  avatar?: string;
}

export const PLACEHOLDER_PROFILE: Profile = {
  steamId: "",
  name: "Your Name",
  profileUrl: "",
  avatar: DEFAULT_AVATAR,
  level: 0,
  status: "online",
  isPublic: true,
  equipped: {},
};

function pick(slot: Slot, profile: Profile, tryOn: TryOn): Cosmetic | undefined {
  if (slot in tryOn) return tryOn[slot] ?? undefined;
  return profile.equipped[slot];
}

export function buildLook(profile: Profile, tryOn: TryOn = {}, custom: CustomArt = {}): PreviewLook {
  const background = pick("background", profile, tryOn);
  const frame = pick("avatarFrame", profile, tryOn);
  const animatedAvatar = pick("animatedAvatar", profile, tryOn);
  const theme = pick("theme", profile, tryOn);

  return {
    name: profile.name,
    realName: profile.realName,
    countryCode: profile.countryCode,
    level: profile.level,
    status: profile.status,
    // An uploaded avatar beats an animated one: it's the more deliberate choice.
    avatar: custom.avatar ?? profile.avatar,
    animatedAvatar: custom.avatar || !animatedAvatar ? undefined : animatedAvatar,
    frame,
    background: background && { image: background.image, video: background.video },
    // A theme item carries its id; otherwise fall back to the profile's own
    // free theme (Steel, Midnight …) from GetProfileCustomization.
    themeId: "theme" in tryOn ? theme?.themeId : (theme?.themeId ?? profile.themeId),
  };
}
