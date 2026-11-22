"use client";
/**
 * Step-by-step instructions for putting the pieces on Steam, with a tick box
 * per step. The same steps go into README.txt in the download.
 */
import { useState } from "react";
import type { ArtworkLayout, ArtworkSlot } from "@/lib/artwork/layouts";
import { guideSteps } from "@/lib/artwork/uploadGuide";
import styles from "./ArtworkWorkflow.module.css";

export function UploadGuide({
  layout,
  slots,
  showcaseFirst,
  animated = false,
}: {
  layout: ArtworkLayout;
  slots: ArtworkSlot[];
  showcaseFirst: boolean;
  /** Guide the upload of the animated GIFs instead of the PNGs. */
  animated?: boolean;
}) {
  const steps = guideSteps(layout, slots, showcaseFirst, animated);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  function toggle(id: string) {
    setDone((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ol className={styles.guide}>
      {steps.map((step) => (
        <li key={step.id} className={done.has(step.id) ? styles.guideDone : undefined}>
          <label className={styles.guideHead}>
            <input type="checkbox" checked={done.has(step.id)} onChange={() => toggle(step.id)} />
            <span>{step.title}</span>
            {step.unconfirmed && (
              <span className={styles.tag} title="From community guides and forum posts. We haven't tested it with a real upload yet.">
                not yet tested
              </span>
            )}
          </label>
          {step.body.map((p) => (
            <p key={p} className={styles.guideText}>
              {linkify(p)}
            </p>
          ))}
          {step.code && (
            <div className={styles.code}>
              <code>{step.code}</code>
              <button
                className={styles.linkButton}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(step.code!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    // Clipboard blocked: the code is selectable anyway.
                  }
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Turn the one URL in a step into a link. */
function linkify(text: string) {
  const m = /https:\/\/\S+/.exec(text);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <a href={m[0]} target="_blank" rel="noreferrer">
        {m[0]}
      </a>
      {text.slice(m.index + m[0].length)}
    </>
  );
}
