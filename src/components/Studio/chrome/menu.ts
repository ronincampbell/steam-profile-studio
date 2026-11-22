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
  group: "shop" | "yours";
}

export const MENU: MenuEntry[] = [
  { id: "background", label: "Backgrounds", short: "Backgrounds", icon: "background", group: "shop" },
  { id: "avatar-frame", label: "Avatar frames", short: "Frames", icon: "frame", group: "shop" },
  { id: "animated-avatar", label: "Animated avatars", short: "Avatars", icon: "avatar", group: "shop" },
  { id: "theme", label: "Profile themes", short: "Themes", icon: "theme", group: "shop" },
  { id: "art", label: "Your own art", short: "Your art", icon: "art", group: "yours" },
  { id: "artwork", label: "Artwork showcase", short: "Artwork", icon: "artwork", group: "yours" },
  { id: "showcases", label: "Showcases", short: "Showcases", icon: "showcases", group: "yours" },
  { id: "wearing", label: "Wearing now", short: "Wearing now", icon: "wearing", group: "yours" },
];

export const MENU_BY_ID = Object.fromEntries(MENU.map((m) => [m.id, m])) as Record<PanelId, MenuEntry>;
