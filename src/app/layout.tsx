import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steam Profile Studio",
  description:
    "Preview a Steam profile with Points Shop items or your own artwork.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
