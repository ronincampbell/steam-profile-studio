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

/** Upload order: tiles last to first, then the big image last of all. */
export function uploadOrder(slots: ArtworkSlot[]): ArtworkSlot[] {
  const main = slots.filter((s) => s.id === "main");
  const rest = slots.filter((s) => s.id !== "main").reverse();
  return [...rest, ...main];
}

export function guideSteps(layout: ArtworkLayout, slots: ArtworkSlot[], showcaseFirst: boolean): GuideStep[] {
  const order = uploadOrder(slots);
  const mb = MAX_UPLOAD_BYTES / 1024 / 1024;
  const steps: GuideStep[] = [
    {
      id: "open",
      title: "Open Steam's artwork upload page in a web browser",
      body: [
        `Sign in to steamcommunity.com, then go to your profile → Artwork → Upload, or straight to ${ARTWORK_UPLOAD_URL}`,
        layout === "long"
          ? "Use a desktop browser (Chrome, Firefox, Edge), not the Steam app: the long layout needs the browser's developer console."
          : "A desktop browser is easiest. The Steam app's built-in browser works too.",
      ],
    },
    {
      id: "files",
      title: `Upload the ${slots.length} files one at a time, in this order`,
      body: [
        ...order.map((s, i) => `${i + 1}. ${s.fileName} (${s.label.toLowerCase()})`),
        `The order doesn't decide which slot a picture lands in (you pick that in step ${layout === "long" ? 5 : 4}). It just puts the big image at the top of Steam's picker, where it's easy to find.`,
        `Upload each file exactly as exported. Any other size gets black bars and is re-saved as a blurry JPEG. Keep each file under ${mb} MB, as PNG, JPG or GIF.`,
      ],
      unconfirmed: true,
    },
    {
      id: "title",
      title: "Give each upload a title, set it to Public, and tick the agreement",
      body: [
        "Only the big image's title shows on your profile, as a line of text under it. A single underscore ( _ ) keeps it nearly invisible. Tile titles never show, so name them anything you'll recognise, like \"tile 1\".",
        "Set visibility to Public. Friends-only or hidden artwork probably won't show to visitors.",
      ],
      unconfirmed: true,
    },
  ];
  if (layout === "long") {
    steps.push({
      id: "long",
      title: "Long layout only: paste this into the browser console before you save each file",
      body: [
        "Press F12 (or Ctrl+Shift+J), click the Console tab, paste the line below and press Enter. Then click Save.",
        "It changes two hidden form fields that tell Steam the image's size, so Steam treats it as a wide image and shows it at full height. Without it, the long images show as small letterboxed squares.",
        "This is an unofficial community trick. Steam can stop it working at any time. This app never runs it for you.",
      ],
      code: LONG_ARTWORK_SNIPPET,
      unconfirmed: true,
    });
  }
  steps.push(
    {
      id: "showcase",
      title: "Edit Profile → Featured Showcase → Artwork Showcase",
      body: [
        "Click the big slot and pick your big image.",
        layout === "long"
          ? "Click the slot on the right and pick the side strip."
          : "Click the small slots from top to bottom and pick tiles 1, 2 and 3 in that order.",
      ],
    },
    {
      id: "position",
      title: showcaseFirst ? "Move the Artwork showcase to the top, then save" : "Put the Artwork showcase where you placed it here, then save",
      body: [
        showcaseFirst
          ? "Anything above it pushes it down, and the art slides off the background. On top, it lines up every time."
          : "Showcases above it decide how far down it sits. If any of them change height, re-export from here.",
      ],
    },
    {
      id: "check",
      title: "Check it as a visitor",
      body: [
        "Open your profile in a private window, 910 to 1920 pixels wide. Wider windows stretch the background, so nothing lines up there, on anyone's profile.",
        "Black bars mean a file isn't the exact size. Everything shifted down means something above the showcase got taller.",
      ],
    },
  );
  return steps;
}

/** The guide as plain text, for README.txt in the download. */
export function guideText(layout: ArtworkLayout, slots: ArtworkSlot[], showcaseFirst: boolean, backgroundName: string): string {
  const lines = [
    `Steam Profile Studio: artwork pieces for "${backgroundName}"`,
    `Layout: Artwork showcase, ${layout === "long" ? "long" : "normal"}`,
    "",
    "WHAT'S IN HERE",
    ...slots.map((s) => `  ${s.fileName}  ${s.label}, ${s.width}x${s.height}, background x ${s.x}, y ${s.y}`),
    "  guide_full_background.png  the whole background with each slot outlined",
    "  layout.json  the same numbers, for scripts",
    "",
    "Paint over the pieces in any editor, keep each one exactly the same size,",
    "and save as PNG (or GIF for animation). Keep the file names, or at least",
    "the 01_, 02_ ... prefixes, so the app can put them back in the right slots.",
    "",
    "HOW TO PUT THEM ON STEAM",
  ];
  guideSteps(layout, slots, showcaseFirst).forEach((step, i) => {
    lines.push("", `${i + 1}. ${step.title}${step.unconfirmed ? " (not yet tested by us)" : ""}`);
    for (const p of step.body) lines.push(`   ${p}`);
    if (step.code) lines.push("", `   ${step.code}`);
  });
  return lines.join("\r\n") + "\r\n";
}
