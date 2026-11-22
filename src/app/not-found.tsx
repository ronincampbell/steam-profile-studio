import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ErrorScreen/ErrorScreen";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <ErrorScreen title="Page not found" />;
}
