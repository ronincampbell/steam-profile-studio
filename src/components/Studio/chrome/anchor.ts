/**
 * Where a toolbar panel opens for a button, worked out from the button's
 * position on screen. Kept apart from the component so it can be tested.
 */

/** Must match .dropPanel's width and the page gutter in Chrome.module.css. */
const PANEL_WIDTH = 640;
const GUTTER = 16;
/** Keep the pointer this far from the panel's rounded corners. */
const CARET_INSET = 24;

export interface Anchor {
  /** The panel's left edge, in window pixels. */
  left: number;
  /** Where the pointer sits, in pixels from the panel's left edge. */
  caret: number;
}

/**
 * Where the panel goes for a button: its left edge lines up with the
 * button's, moved left if that would run off the window. The pointer sits
 * under the middle of the button.
 */
export function anchorFor(button: { left: number; width: number }, viewportWidth: number): Anchor {
  const width = Math.min(PANEL_WIDTH, viewportWidth - GUTTER * 2);
  const left = Math.max(GUTTER, Math.min(button.left, viewportWidth - GUTTER - width));
  const middle = button.left + button.width / 2 - left;
  const caret = Math.max(CARET_INSET, Math.min(middle, width - CARET_INSET));
  return { left, caret };
}
