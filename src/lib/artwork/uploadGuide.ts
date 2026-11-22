/**
 * The step-by-step guide to putting the finished pieces on Steam. The same
 * steps drive the in-app panel and README.txt in the download, so they can't
 * disagree.
 *
 * Source: reference/ARTWORK_WORKFLOW.md §8. Steps marked `unconfirmed` come
 * from community guides and forum posts, not a test upload; the app says so.
 */
import { MAX_UPLOAD_BYTES, type ArtworkLayout, type ArtworkSlot } from "./layouts";

export const ARTWORK_UPLOAD_URL = "https://steamcommunity.com/sharedfiles/edititem/767/3/";

/**
 * The unofficial console snippet that makes Steam treat an upload as a wide
 * image, so the showcase shows it at full height ("long artwork"). The app
 * only shows it; it never runs it.
 */
export const LONG_ARTWORK_SNIPPET =
  "$J('#image_width').val(1000).attr('id','');$J('#image_height').val(1).attr('id','');";

export interface GuideStep {
  id: string;
  title: string;
  /** Plain-text paragraphs. */
  body: string[];
  /** A code snippet to copy. */
  code?: string;
  /** True when this comes from community lore, not a test upload. */
  unconfirmed?: boolean;
}

/**
 * @param animated the upload is the animated GIFs (an animated background),
 *   not the PNG pieces
 */
export function guideSteps(layout: ArtworkLayout, slots: ArtworkSlot[], showcaseFirst: boolean, animated = false): GuideStep[] {
  const mb = MAX_UPLOAD_BYTES / 1024 / 1024;
  const steps: GuideStep[] = [
    {
      id: "open",
      title: "Open Steam's artwork upload page",
      body: [
        ARTWORK_UPLOAD_URL,
        ...(layout === "long" ? ["Use a desktop browser, not the Steam app: you'll need its console."] : []),
      ],
    },
    {
      id: "files",
      title: `Upload the ${slots.length} ${animated ? ".gif" : ".png"} files as they are, set to Public`,
      body: [
        `Don't resize them: any other size gets black bars. Each must be under ${mb} MB.`,
        "Only the big image's title shows on your profile. Call it _ to hide it.",
      ],
    },
  ];
  if (layout === "long") {
    steps.push({
      id: "long",
      title: "Before saving each file, paste this into the console (F12)",
      body: ["Without it the long images show as small squares. Unofficial, so Steam could stop it working."],
      code: LONG_ARTWORK_SNIPPET,
      unconfirmed: true,
    });
  }
  steps.push(
    {
      id: "showcase",
      title: "Edit Profile → Featured Showcase → Artwork Showcase",
      body: [
        layout === "long"
          ? "Pick the big image, then the side strip."
          : "Pick the big image, then tiles 1, 2 and 3 from top to bottom.",
      ],
    },
    {
      id: "position",
      title: showcaseFirst ? "Move the showcase to the top and save" : "Put the showcase where you placed it here and save",
      body: [
        ...(showcaseFirst ? [] : ["If a showcase above it changes height, re-export."]),
        "It only lines up in windows 910 to 1920 pixels wide.",
      ],
    },
  );
  return steps;
}

/** The guide as plain text, for README.txt in the download. */
export function guideText(
  layout: ArtworkLayout,
  slots: ArtworkSlot[],
  showcaseFirst: boolean,
  backgroundName: string,
  /** One line per exported GIF ("01_main_480x480.gif  4.6 MB, …"), for animated backgrounds. */
  gifs?: string[],
): string {
  const animated = Boolean(gifs?.length);
  const lines = [
    `Steam Profile Studio: artwork pieces for "${backgroundName}"`,
    `Layout: Artwork showcase, ${layout === "long" ? "long" : "normal"}`,
    "",
    "WHAT'S IN HERE",
    ...slots.map((s) => `  ${s.fileName}  ${s.label}, ${s.width}x${s.height}, background x ${s.x}, y ${s.y}${animated ? " (still)" : ""}`),
    ...(gifs ?? []).map((g) => `  ${g}`),
    "  guide_full_background.png  the whole background with each slot outlined",
    "  layout.json  the same numbers, for scripts",
    "",
    "Paint over the pieces, keep each the same size and keep the 01_, 02_ ...",
    "names so the app can put them back in their slots.",
    ...(animated ? ["The .gif files are ready to upload as they are."] : []),
    "",
    "Using the layered .psd instead: paint, hide the Guides group, export the",
    "whole picture as one 1920px-wide PNG and drop it into the app.",
    "",
    "HOW TO PUT THEM ON STEAM",
  ];
  guideSteps(layout, slots, showcaseFirst, animated).forEach((step, i) => {
    lines.push("", `${i + 1}. ${step.title}${step.unconfirmed ? " (not yet tested)" : ""}`);
    for (const p of step.body) lines.push(`   ${p}`);
    if (step.code) lines.push("", `   ${step.code}`);
  });
  return lines.join("\r\n") + "\r\n";
}
