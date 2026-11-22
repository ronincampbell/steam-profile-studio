"use client";
/** Shown if the studio itself crashes while rendering. */
import { useEffect } from "react";
import { ErrorScreen, errorScreenStyles as styles } from "@/components/ErrorScreen/ErrorScreen";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Vercel keeps browser console errors out of its logs, but this still
    // helps when someone reports a bug with their console open.
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      title="Something went wrong"
      detail="The studio hit an error. Trying again usually fixes it."
      action={
        <button type="button" className={styles.button} onClick={() => retry()}>
          Try again
        </button>
      }
    />
  );
}
