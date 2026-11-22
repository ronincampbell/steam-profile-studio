/**
 * The app's menu: every control that used to sit under the preview, as one
 * list that the toolbar draws as buttons.
 */
import type { ItemType } from "@/lib/steam/types";
import type { IconName } from "./Icons";

export type PanelId = ItemType | "art" | "artwork" | "showcases" | "wearing";

export interface MenuEntry {
  id: PanelId;
  /** The panel's title and the button's tooltip. */
  label: string;
  /** The button's text: short, so all eight fit on a laptop screen. */
  short: string;
  icon: IconName;
  /** One line under the panel title. */
  hint: string;
  group: "shop" | "yours";
}

export const MENU: MenuEntry[] = [
  { id: "background", label: "Backgrounds", short: "Backgrounds", icon: "background", group: "shop", hint: "Points Shop backgrounds, still and animated. Click one to try it on." },
  { id: "avatar-frame", label: "Avatar frames", short: "Frames", icon: "frame", group: "shop", hint: "Frames sit over your avatar. Click one to try it on." },
  { id: "animated-avatar", label: "Animated avatars", short: "Avatars", icon: "avatar", group: "shop", hint: "Animated avatars replace your picture. Click one to try it on." },
  { id: "theme", label: "Profile themes", short: "Themes", icon: "theme", group: "shop", hint: "A theme recolours the page and puts on its matching items." },
  { id: "art", label: "Your own art", short: "Your art", icon: "art", group: "yours", hint: "Try your own background or avatar before you make it." },
  { id: "artwork", label: "Artwork", short: "Artwork", icon: "artwork", group: "yours", hint: "Cut your background into Artwork showcase pieces that line up with it on Steam." },
  { id: "showcases", label: "Showcases", short: "Showcases", icon: "showcases", group: "yours", hint: "The boxes down the left of your profile, top to bottom." },
  { id: "wearing", label: "Wearing now", short: "Wearing now", icon: "wearing", group: "yours", hint: "What's on the preview, where it came from, and links to buy it." },
];

export const MENU_BY_ID = Object.fromEntries(MENU.map((m) => [m.id, m])) as Record<PanelId, MenuEntry>;
