"use client";
/**
 * Let people drop in their own background or avatar.
 *
 * Files never leave the browser: each one becomes an object URL (a
 * `blob:` link to the file in memory) that only this tab can see. Nothing is
 * uploaded or stored, so a shared link won't include custom art.
 */
import { useEffect, useRef } from "react";
import type { CustomArt } from "@/lib/studio/look";
import styles from "./Studio.module.css";

const BACKGROUND_TYPES = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm";
const AVATAR_TYPES = "image/png,image/jpeg,image/gif,image/webp";

interface Props {
  custom: CustomArt;
  onChange: (next: CustomArt) => void;
}

export function CustomArtPicker({ custom, onChange }: Props) {
  // Free the memory behind object URLs we no longer show.
  const latest = useRef(custom);
  useEffect(() => {
    const prev = latest.current;
    if (prev.background && prev.background.url !== custom.background?.url) URL.revokeObjectURL(prev.background.url);
    if (prev.avatar && prev.avatar !== custom.avatar) URL.revokeObjectURL(prev.avatar);
    latest.current = custom;
  }, [custom]);
  useEffect(
    () => () => {
      if (latest.current.background) URL.revokeObjectURL(latest.current.background.url);
      if (latest.current.avatar) URL.revokeObjectURL(latest.current.avatar);
    },
    [],
  );

  function pickBackground(file: File | undefined) {
    if (!file) return;
    const kind = file.type.startsWith("video/") ? "video" : "image";
    onChange({ ...custom, background: { url: URL.createObjectURL(file), kind, mime: file.type } });
  }

  function pickAvatar(file: File | undefined) {
    if (!file) return;
    onChange({ ...custom, avatar: URL.createObjectURL(file) });
  }

  return (
    <div className={styles.custom}>
      <FileButton label="Background image or video" accept={BACKGROUND_TYPES} onPick={pickBackground} />
      {custom.background && (
        <button className={styles.linkButton} onClick={() => onChange({ ...custom, background: undefined })}>
          Clear background
        </button>
      )}
      <FileButton label="Avatar image" accept={AVATAR_TYPES} onPick={pickAvatar} />
      {custom.avatar && (
        <button className={styles.linkButton} onClick={() => onChange({ ...custom, avatar: undefined })}>
          Clear avatar
        </button>
      )}
      <span className={styles.customNote}>
        Backgrounds 1920px wide, avatars 184×184.
      </span>
    </div>
  );
}

function FileButton({ label, accept, onPick }: { label: string; accept: string; onPick: (f: File | undefined) => void }) {
  return (
    <label className={styles.fileButton}>
      {label}
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = ""; // allow picking the same file again
        }}
      />
    </label>
  );
}
