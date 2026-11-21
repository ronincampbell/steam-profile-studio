/** Small helpers for reading Steam's profile HTML with node-html-parser. */
import type { HTMLElement } from "node-html-parser";

/**
 * An element's classes. Read from the class attribute rather than
 * node-html-parser's classList, which can pick up `class="…"` text from
 * inside other attributes (Steam's data-tooltip-html holds whole HTML snippets).
 */
export function classes(el: HTMLElement | null | undefined): string[] {
  return (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

export function hasClass(el: HTMLElement | null | undefined, name: string): boolean {
  return classes(el).includes(name);
}

/** Whitespace-collapsed text of an element ("\n\t\tGame Collector\t" → "Game Collector"). */
export function text(el: HTMLElement | null | undefined): string {
  return (el?.text ?? "").replace(/\s+/g, " ").trim();
}

/** A `data-tooltip-html` value split into plain-text lines at its `<br>`s. */
export function tooltipLines(html: string | undefined | null): string[] {
  return (html ?? "")
    .split(/<br\s*\/?>/i)
    .map((line) => line.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
