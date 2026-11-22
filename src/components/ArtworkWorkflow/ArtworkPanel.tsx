"use client";
/**
 * The artwork planner panel: pick a layout, see the background pieces in the
 * preview, download them, drop the finished art back in, then follow the
 * upload guide. Self-contained: it only needs the planner state and the
 * number of showcases on the preview.
 *
 * Plan and numbers: reference/ARTWORK_WORKFLOW.md.
 */
import { useState, type DragEvent } from "react";
import { LONG, STEAM_BG_HEIGHT, overflowBelow } from "@/lib/artwork/layouts";
import { canvasToPng } from "@/lib/artwork/crop";
import { drawGuide } from "@/lib/artwork/guideImage";
import { buildZip, download, zipFiles, zipName } from "@/lib/artwork/exportZip";
import { PSD_FILE_NAME, buildPsdTemplate } from "@/lib/artwork/psdTemplate";
import { canRecordClips, recordClips } from "@/lib/artwork/clips";
import { describeGif, gifFileName, makeGifs, type FinishedGif } from "@/lib/artwork/gifExport";
import type { BackgroundSource } from "@/lib/artwork/crop";
import type { ArtworkPlanner } from "./useArtworkPlanner";
import { UploadGuide } from "./UploadGuide";
import styles from "./ArtworkWorkflow.module.css";

interface Props {
  planner: ArtworkPlanner;
  source: BackgroundSource | undefined;
  backgroundName: string;
  /** Titles of the other showcases on the preview, in order, for the position picker. */
  otherShowcases: string[];
  /** Drawn inside a menu panel that already has a title and a box: drop ours. */
  inPanel?: boolean;
}

export function ArtworkPanel({ planner, source, backgroundName, otherShowcases, inPanel = false }: Props) {
  const { state, update, slots } = planner;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withGifs, setWithGifs] = useState(true);
  const [withClips, setWithClips] = useState(false);
  /** What the last download's GIFs came out as. */
  const [gifResults, setGifResults] = useState<{ fileName: string; text: string; over: boolean }[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const animated = source?.kind === "video";
  const clipsPossible = animated && canRecordClips();

  if (!state.enabled) {
    return (
      <section className={`${styles.panel} ${inPanel ? styles.bare : ""}`} aria-labelledby="artwork-title">
        <div className={styles.head}>
          <h2 id="artwork-title" className={inPanel ? styles.srOnly : styles.title}>
            Artwork that lines up with your background
          </h2>
          <button className={styles.primaryButton} onClick={() => update({ enabled: true })} disabled={!source}>
            Start
          </button>
        </div>
        <p className={styles.note}>
          {source
            ? `Cut "${backgroundName}" into Artwork showcase pieces that line up with it.`
            : "Pick a background first."}
        </p>
      </section>
    );
  }

  const showcaseFirst = state.position === 0 || otherShowcases.length === 0;
  const overflow = Math.max(...slots.map((s) => overflowBelow(s, planner.bgHeight ?? STEAM_BG_HEIGHT)));
  const canExport = Boolean(planner.pieces && planner.frame) && !busy;

  async function exportZip() {
    if (!planner.pieces || !planner.frame) return;
    setError(null);
    try {
      setBusy("Drawing the guide image…");
      const guide = await canvasToPng(drawGuide(planner.frame, slots));
      let gifs: Map<(typeof slots)[number]["id"], FinishedGif> | undefined;
      if (animated && withGifs && source) {
        gifs = await makeGifs(source.url, slots, setBusy);
        setGifResults(
          slots.flatMap((s) => {
            const g = gifs!.get(s.id);
            return g ? [{ fileName: gifFileName(s), text: describeGif(g), over: g.overBudget }] : [];
          }),
        );
      }
      let clips: Map<string, Blob> | undefined;
      if (animated && withClips && clipsPossible && source) {
        setBusy("Recording one loop of the background for the source clips… 0%");
        clips = await recordClips(source.url, slots, (f) =>
          setBusy(`Recording one loop of the background for the source clips… ${Math.round(f * 100)}%`),
        );
      }
      setBusy("Zipping…");
      const zip = await buildZip({
        backgroundName,
        backgroundUrl: source?.url.startsWith("blob:") ? undefined : source?.url,
        layout: state.layout,
        showcaseFirst,
        frameTime: animated ? Number(state.frameTime.toFixed(3)) : undefined,
        slots,
        pieces: planner.pieces,
        guide,
        clips: clips as Map<(typeof slots)[number]["id"], Blob> | undefined,
        gifs,
      });
      download(zip, zipName(backgroundName, state.layout));
    } catch (e) {
      setError((e as Error).message || "The download didn't work.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPsd() {
    if (!planner.frame) return;
    setError(null);
    try {
      setBusy("Building the layered .psd…");
      // Let the note paint before the (synchronous) encoding starts.
      await new Promise((r) => setTimeout(r, 30));
      const psd = buildPsdTemplate(planner.frame, slots, drawGuide(planner.frame, slots));
      download(psd, zipName(backgroundName, state.layout).replace(/\.zip$/, `_${PSD_FILE_NAME}`));
    } catch (e) {
      setError((e as Error).message || "The .psd didn't work.");
    } finally {
      setBusy(null);
    }
  }

  const cutPieces = slots.flatMap((s) => {
    const blob = planner.finished.get(s.id)?.blob;
    return blob ? [{ name: s.fileName, blob }] : [];
  });

  async function downloadCutPieces() {
    download(await zipFiles(cutPieces), zipName(backgroundName, state.layout).replace(/\.zip$/, "_finished.zip"));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/") || !f.type);
    if (files.length) planner.addFinished(files);
  }

  return (
    <section className={`${styles.panel} ${inPanel ? styles.bare : ""}`} aria-labelledby="artwork-title">
      <div className={styles.head}>
        <h2 id="artwork-title" className={inPanel ? styles.srOnly : styles.title}>
          Artwork that lines up with your background
        </h2>
        <span className={styles.note}>for &ldquo;{backgroundName}&rdquo;</span>
        <button className={styles.linkButton} onClick={() => update({ enabled: false })}>
          {inPanel ? "Take it off the preview" : "Close"}
        </button>
      </div>

      {planner.loadError && <p className={styles.error}>{planner.loadError}</p>}

      {/* 1. Layout */}
      <div className={styles.step}>
        <span className={styles.stepNumber}>1</span>
        <div className={styles.stepBody}>
          <span className={styles.stepTitle}>Layout</span>
          <div className={styles.choices} role="radiogroup" aria-label="Layout">
            <Choice
              checked={state.layout === "normal"}
              onSelect={() => update({ layout: "normal" })}
              title="Big image + 3 tiles"
              detail="480×480 and three 100×80."
            />
            <Choice
              checked={state.layout === "long"}
              onSelect={() => update({ layout: "long" })}
              title="Long"
              detail="506 wide + a 100px strip, any height. Needs a console trick to upload."
            />
          </div>
          {state.layout === "long" && (
            <label className={styles.slider}>
              <span>Height</span>
              <input
                type="range"
                min={LONG.minHeight}
                max={Math.max(planner.maxHeight, LONG.minHeight)}
                value={planner.longHeight}
                onChange={(e) => update({ longHeight: Number(e.target.value) })}
              />
              <span className={styles.value}>{planner.longHeight}px</span>
              <button className={styles.linkButton} onClick={() => update({ longHeight: planner.maxHeight })}>
                Full height
              </button>
            </label>
          )}
        </div>
      </div>

      {/* 2. Position */}
      <div className={styles.step}>
        <span className={styles.stepNumber}>2</span>
        <div className={styles.stepBody}>
          <span className={styles.stepTitle}>Position</span>
          <select
            className={styles.select}
            value={Math.min(state.position, otherShowcases.length)}
            onChange={(e) => update({ position: Number(e.target.value) })}
            aria-label="Position on your profile"
          >
            <option value={0}>First showcase</option>
            {otherShowcases.map((title, i) => (
              <option key={i} value={i + 1}>
                {`After ${title || "showcase " + (i + 1)}`}
              </option>
            ))}
          </select>
          {!showcaseFirst && (
            <span className={styles.note}>
              If a showcase above it changes height on Steam, the art slips. First is safest.
            </span>
          )}
        </div>
      </div>

      {/* 3. Frame, for animated backgrounds */}
      {animated && (
        <div className={styles.step}>
          <span className={styles.stepNumber}>3</span>
          <div className={styles.stepBody}>
            <span className={styles.stepTitle}>Still frame</span>
            <label className={styles.slider}>
              <span>Frame</span>
              <input
                type="range"
                min={0}
                max={planner.duration ? Math.max(0, planner.duration - 0.01) : 0}
                step={0.01}
                value={state.frameTime}
                disabled={!planner.duration}
                onChange={(e) => update({ frameTime: Number(e.target.value) })}
              />
              <span className={styles.value}>{state.frameTime.toFixed(2)}s</span>
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={withGifs} onChange={(e) => setWithGifs(e.target.checked)} />
              Animated GIFs of one loop, under the upload limit
            </label>
            {clipsPossible ? (
              <label className={styles.check}>
                <input type="checkbox" checked={withClips} onChange={(e) => setWithClips(e.target.checked)} />
                Full-quality WebM clips, to make your own GIFs
              </label>
            ) : null}
            {withGifs && (
              <span className={styles.note}>
                GIFs loop on their own on Steam, so they won&rsquo;t stay exactly in step with the background.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Download */}
      <div className={styles.step}>
        <span className={styles.stepNumber}>{animated ? 4 : 3}</span>
        <div className={styles.stepBody}>
          <span className={styles.stepTitle}>Download</span>
          <ul className={styles.sizes}>
            {slots.map((s) => (
              <li key={s.id}>
                <code>{s.fileName}</code> {s.label}
              </li>
            ))}
          </ul>
          {overflow > 0 && (
            <p className={styles.warning}>
              The bottom {overflow}px runs past the background, so it&rsquo;s black.
            </p>
          )}
          <div className={styles.row}>
            <button className={styles.primaryButton} onClick={exportZip} disabled={!canExport}>
              {busy ? "Working…" : "Download zip"}
            </button>
            <button className={styles.secondaryButton} onClick={exportPsd} disabled={!planner.frame || Boolean(busy)}>
              Layered .psd
            </button>
            <label className={styles.check}>
              <input type="checkbox" checked={state.outlines} onChange={(e) => update({ outlines: e.target.checked })} />
              Outline slots
            </label>
          </div>
          {busy && <span className={styles.note}>{busy}</span>}
          {!planner.pieces && !busy && !planner.loadError && <span className={styles.note}>Cutting the background…</span>}
          {error && <p className={styles.error}>{error}</p>}
          {animated && withGifs && gifResults && !busy && (
            <ul className={styles.checks}>
              {gifResults.map((g) => (
                <li key={g.fileName} className={g.over ? styles.bad : styles.good}>
                  <code>{g.fileName}</code> {g.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Re-import */}
      <div className={styles.step}>
        <span className={styles.stepNumber}>{animated ? 5 : 4}</span>
        <div className={styles.stepBody}>
          <span className={styles.stepTitle}>Check your finished art</span>
          <label
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length) planner.addFinished(files);
                e.target.value = "";
              }}
            />
            Drop the pieces (keep the 01_, 02_… names), or the whole 1920px picture from the .psd.
          </label>
          {(planner.checks.length > 0 || planner.unmatched.length > 0) && (
            <ul className={styles.checks}>
              {planner.checks.map((c) => (
                <li key={c.slot.id} className={c.problems.length ? styles.bad : styles.good}>
                  <strong>{c.slot.label}:</strong> {c.file.name}
                  {c.problems.length ? (
                    c.problems.map((p) => (
                      <span key={p} className={styles.problem}>
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className={styles.ok}> ready to upload</span>
                  )}
                </li>
              ))}
              {planner.unmatched.map((u) => (
                <li key={u} className={styles.bad}>
                  Not used: {u}
                </li>
              ))}
            </ul>
          )}
          {planner.finished.size > 0 && (
            <div className={styles.row}>
              {cutPieces.length > 0 && (
                <button className={styles.primaryButton} onClick={downloadCutPieces}>
                  Download the cut pieces
                </button>
              )}
              <button className={styles.linkButton} onClick={planner.restartGifs}>
                Restart GIFs together
              </button>
              <button className={styles.linkButton} onClick={planner.clearFinished}>
                Back to the background pieces
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload guide */}
      <div className={styles.step}>
        <span className={styles.stepNumber}>{animated ? 6 : 5}</span>
        <div className={styles.stepBody}>
          <span className={styles.stepTitle}>Put it on Steam</span>
          <UploadGuide layout={state.layout} slots={slots} showcaseFirst={showcaseFirst} animated={animated && withGifs} />
        </div>
      </div>
    </section>
  );
}

function Choice({ checked, onSelect, title, detail }: { checked: boolean; onSelect: () => void; title: string; detail: string }) {
  return (
    <label className={`${styles.choice} ${checked ? styles.choiceOn : ""}`}>
      <input type="radio" checked={checked} onChange={onSelect} />
      <span className={styles.choiceTitle}>{title}</span>
      <span className={styles.choiceDetail}>{detail}</span>
    </label>
  );
}
