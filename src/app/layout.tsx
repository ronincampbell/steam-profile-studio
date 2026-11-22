import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * The public address, for absolute links in share previews. Vercel sets
 * VERCEL_PROJECT_PRODUCTION_URL (no https://) on every deployment.
 */
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://steam-profile-studio.vercel.app";

const DESCRIPTION =
  "Try Steam Points Shop backgrounds, avatar frames, animated avatars and themes on any public Steam profile, or preview your own artwork, before you spend your points.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Steam Profile Studio", template: "%s · Steam Profile Studio" },
  description: DESCRIPTION,
  applicationName: "Steam Profile Studio",
  openGraph: {
    type: "website",
    siteName: "Steam Profile Studio",
    title: "Steam Profile Studio",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Steam Profile Studio", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#0b0e13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
