"use client";
/**
 * Last resort, when even the root layout fails. It replaces the whole
 * document, so it brings its own <html>, <body> and <title>.
 */
import "./globals.css";
import { ErrorScreen, errorScreenStyles as styles } from "@/components/ErrorScreen/ErrorScreen";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · Steam Profile Studio</title>
        <ErrorScreen
          title="Something went wrong"
          detail="The studio hit an error. Trying again usually fixes it."
          action={
            <button type="button" className={styles.button} onClick={() => retry()}>
              Try again
            </button>
          }
        />
      </body>
    </html>
  );
}
