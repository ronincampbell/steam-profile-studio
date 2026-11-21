import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProfilePage } from "../steam/showcases/parse";
import { SHOWCASE_TYPES } from "./showcaseCatalog";
import { addShowcase, fromProfile, makeShowcase, moveShowcase, removeShowcase } from "./showcaseEditor";
import { targetIndex } from "../../components/Studio/useReorderDrag";

const fuzzycast = parseProfilePage(readFileSync("reference/html/fuzzycast-profile.html", "utf8")).showcases;
const ctx = { name: "Fuzzycast" };
const kinds = (list: { showcase: { kind: string } }[]) => list.map((s) => s.showcase.kind);

describe("showcase catalogue", () => {
  it("lists all 24 Steam showcase types once, 7 of them drawn", () => {
    expect(SHOWCASE_TYPES.map((t) => t.type)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(SHOWCASE_TYPES.filter((t) => t.kind).map((t) => t.type)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24]);
  });
});

describe("showcase editor", () => {
  const start = fromProfile(fuzzycast);

  it("starts from the profile's showcases in Steam's order, with their type numbers", () => {
    expect(kinds(start)).toEqual([
      "artwork",
      "gameCollector",
      "favoriteGuide",
      "completionist",
      "replay",
      "achievement",
      "badgeCollector",
    ]);
    expect(start.map((s) => s.type)).toEqual([13, 2, 15, 23, 24, 17, 5]);
    expect(start.every((s) => s.source === "profile")).toBe(true);
    expect(new Set(start.map((s) => s.id)).size).toBe(start.length);
  });

  it("moves a showcase to a new position", () => {
    expect(kinds(moveShowcase(start, 6, 0)).slice(0, 2)).toEqual(["badgeCollector", "artwork"]);
    expect(kinds(moveShowcase(start, 0, 2)).slice(0, 3)).toEqual(["gameCollector", "favoriteGuide", "artwork"]);
    expect(moveShowcase(start, 3, 3)).toBe(start);
    // Past either end clamps.
    expect(kinds(moveShowcase(start, 1, 99)).at(-1)).toBe("gameCollector");
  });

  it("removes a showcase", () => {
    const next = removeShowcase(start, start[1].id);
    expect(next).toHaveLength(6);
    expect(kinds(next)).not.toContain("gameCollector");
  });

  it("re-adds a removed showcase with the profile's real data", () => {
    const removed = removeShowcase(start, start[1].id);
    const added = addShowcase(removed, 2, fuzzycast, ctx);
    expect(added[0].source).toBe("profile");
    expect(added[0].showcase).toBe(fuzzycast[1]);
  });

  it("uses Steam's layout with sample content for a drawn type the profile doesn't have", () => {
    const s = makeShowcase(2, [], ctx);
    expect(s.source).toBe("sample");
    if (s.showcase.kind !== "gameCollector") throw new Error("wrong kind");
    expect(s.showcase.title).toBe("Game Collector");
    expect(s.showcase.stats.map((x) => x.label)).toEqual(["Games", "DLC", "Reviews", "On Wishlist"]);
    expect(s.showcase.games).toHaveLength(12);
    expect(s.showcase.games[0].image).toMatch(/^data:image\/svg\+xml,/);
  });

  it("makes sample content for every drawn type", () => {
    for (const t of SHOWCASE_TYPES.filter((x) => x.kind)) {
      const s = makeShowcase(t.type, [], ctx);
      expect(s.source).toBe("sample");
      expect(s.showcase.kind).toBe(t.kind);
    }
  });

  it("uses a marked placeholder for types whose markup isn't captured", () => {
    const s = makeShowcase(18, fuzzycast, ctx);
    expect(s.source).toBe("placeholder");
    expect(s.showcase).toMatchObject({ kind: "unsupported", title: "Greenlight Showcase" });
  });
});

describe("drag target index", () => {
  it("accounts for the dragged row leaving the list", () => {
    // Row 0 dropped after row 2 → index 2.
    expect(targetIndex(0, { index: 2, side: "after" })).toBe(2);
    // Row 3 dropped before row 1 → index 1.
    expect(targetIndex(3, { index: 1, side: "before" })).toBe(1);
    // Dropped on its own edges: stays put.
    expect(targetIndex(2, { index: 2, side: "before" })).toBe(2);
    expect(targetIndex(2, { index: 2, side: "after" })).toBe(2);
    expect(targetIndex(2, { index: 1, side: "after" })).toBe(2);
  });
});
