/**
 * Guard against developer words leaking into the app's text.
 *
 * Reads every source file that puts text on screen (or in the download's
 * README), pulls out what a visitor could read (JSX text, text attributes like
 * title and aria-label, and string literals with a space in them), and fails
 * if any of it uses a word from BANNED. Comments and code identifiers are
 * ignored. If a test fails, reword the text; only add to ALLOWED when the
 * word is genuinely what a visitor should see.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

/** Files and folders whose text can reach a visitor. */
const SOURCES = [
  "src/app",
  "src/components",
  "src/lib/artwork/uploadGuide.ts",
  "src/lib/steam/api.ts",
  "src/lib/steam/showcases/samples.ts",
  "src/lib/studio",
];

/** Words that mean nothing to a visitor, with why. Matched case-insensitively. */
const BANNED: [RegExp, string][] = [
  [/\bplaceholder\b/i, "how it's built, not what it is"],
  [/drawn like steam/i, "how it's built"],
  [/\bcached?\b|\bcache\b/i, "say how old it is instead"],
  [/rate[- ]?limit/i, "say Steam is busy"],
  [/\bapi\b|api[_ ]key/i, "internal"],
  [/\bjson\b/i, "internal"],
  [/\bendpoint\b|\broute\b|\bserver\b/i, "internal"],
  [/\b(null|undefined|NaN)\b/, "a code value showing through"],
  [/\b(defid|appid|vanity|blob|object url)\b/i, "internal name"],
  [/\b(render(ed|ing)?|pars(e|ed|ing)|scrap(e|ed|ing)|captured)\b/i, "how it's built"],
  [/\b(todo|fixme|lorem)\b/i, "unfinished"],
  [/\(\d{3}\)/, "an HTTP status code"],
];

/** Exact strings allowed to contain a banned word. Keep this short. */
const ALLOWED = new Set<string>([
  // README.txt in the artwork download lists the file by its name.
  "layout.json  the same numbers, for scripts",
]);

/** JSX attributes whose value is read by people (or screen readers). */
const TEXT_ATTRIBUTES = new Set(["title", "alt", "aria-label", "placeholder", "label"]);

/** Attributes that never hold visible text. */
const CODE_ATTRIBUTES = new Set(["className", "href", "src", "id", "htmlFor", "type", "accept", "rel", "target", "role", "key", "value", "name"]);

function files(path: string): string[] {
  const full = join(ROOT, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((f) => files(join(path, f)));
}

function isSource(file: string) {
  return /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file);
}

/** Every piece of text in `file` that a visitor could read. */
function visibleText(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];

  function attrName(node: ts.Node): string | undefined {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p)) return p.name.getText(src);
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) return undefined;
    }
    return undefined;
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isLiteralTypeNode(node)) return; // type unions like "profile" | "sample"
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) return; // "use client"
    if (ts.isJsxText(node)) {
      const text = node.getText(src).replace(/\s+/g, " ").trim();
      if (text) found.push(text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      const text = ts.isTemplateExpression(node)
        ? [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join("…")
        : node.text;
      const attr = attrName(node);
      if (attr && CODE_ATTRIBUTES.has(attr)) return;
      if ((attr && TEXT_ATTRIBUTES.has(attr)) || / /.test(text.trim())) found.push(text.trim());
      if (ts.isTemplateExpression(node)) node.templateSpans.forEach((s) => visit(s.expression));
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(src);
  return found;
}

const TEXT = SOURCES.flatMap(files)
  .filter(isSource)
  .flatMap((file) => visibleText(file).map((text) => ({ file: relative(ROOT, file), text })));

describe("app text", () => {
  it("finds text to check", () => {
    // Guards the extractor: if this drops, it has stopped seeing the app's text.
    expect(TEXT.length).toBeGreaterThan(150);
  });

  it.each(BANNED.map(([re, why]) => [String(re), re, why] as const))("never says %s", (_, re, why) => {
    const hits = TEXT.filter(({ text }) => re.test(text) && !ALLOWED.has(text)).map(
      ({ file, text }) => `${file}: "${text}" (${why})`,
    );
    expect(hits).toEqual([]);
  });
});
