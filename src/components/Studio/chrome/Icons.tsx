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
  | "artwork"
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
  // A big artwork piece and two small ones, with a landscape.
  artwork: "M3 4h11v16H3z M17 4h4v7h-4z M17 13h4v7h-4z M3 15l3.5-3.5 3 3 2-2 2.5 2.5",
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

/**
 * Other sites' logos, filled rather than stroked (from Simple Icons, CC0).
 * They take the text colour.
 */
const BRANDS = {
  kofi: "M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.480-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
};

export function BrandIcon({ name, size = 18 }: { name: keyof typeof BRANDS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={BRANDS[name]} />
    </svg>
  );
}

/** The app's mark: a little profile card (avatar square and text lines). */
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
    </svg>
  );
}
