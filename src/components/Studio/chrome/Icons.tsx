/**
 * Small line icons for the app's menus. Drawn here (24×24, stroke only) so
 * there's no icon library to install, and they take the text colour.
 */
import type { SVGProps } from "react";

export type IconName =
  | "background"
  | "frame"
  | "avatar"
  | "theme"
  | "art"
  | "showcases"
  | "wearing"
  | "pin"
  | "close"
  | "link"
  | "search";

const PATHS: Record<IconName, string> = {
  // A landscape: frame, hills, sun.
  background: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5a1.5 1.5 0 1 0 0-.01",
  // A square inside a square.
  frame: "M3 3h18v18H3z M7.5 7.5h9v9h-9z",
  // A head with a sparkle: it moves.
  avatar: "M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5 M19 3v4 M17 5h4",
  // A drop of colour.
  theme: "M12 3c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3z M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5",
  // Arrow up out of a tray.
  art: "M12 15V4 M7.5 8.5 12 4l4.5 4.5 M4 14v5h16v-5",
  // Stacked showcase boxes.
  showcases: "M3 4h18v7H3z M3 14h8v6H3z M14 14h7v6h-7z",
  // Layers: what's on the profile now.
  wearing: "M12 3 3 8l9 5 9-5-9-5z M3 12.5l9 5 9-5 M3 17l9 5 9-5",
  pin: "M9 4h6l-1 6 4 3H6l4-3-1-6z M12 13v8",
  close: "M6 6l12 12 M18 6 6 18",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1 M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20.5 20.5 16 16",
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The app's mark: a profile card inside an avatar-frame corner. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="sps-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#66c0f4" />
          <stop offset="1" stopColor="#9b7bff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#141a23" stroke="url(#sps-mark)" strokeWidth="2" />
      <rect x="9" y="9" width="12" height="12" rx="2.5" fill="url(#sps-mark)" />
      <path d="M24 11h7 M24 16h5 M9 26h22 M9 31h14" stroke="#c6d4df" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 13V7a1 1 0 0 1 1-1h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}
