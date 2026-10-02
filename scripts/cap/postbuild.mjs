#!/usr/bin/env node
/**
 * After `vite build -c vite.config.cap.ts`: tidy and check dist-cap/ (the
 * Capacitor webDir).
 *   - Prunes dist-cap/assets/* files nothing in the bundle references. The SSR
 *     environment (only used to prerender the shell) emits PGLite's wasm/data
 *     (~16 MB) there; the client never loads them.
 *   - Fails if index.html or offline.html is missing, or if index.html still
 *     points at Google Fonts / Grok's PWA chrome.
 */
import { readdirSync, readFileSync, rmSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const OUT = "dist-cap";
const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function fail(msg) {
  console.error(`[cap postbuild] ${msg}`);
  process.exit(1);
}

for (const f of ["index.html", "offline.html"]) {
  if (!existsSync(join(OUT, f))) fail(`${OUT}/${f} is missing`);
}
const index = readFileSync(join(OUT, "index.html"), "utf8");
if (/fonts\.googleapis\.com|\/__grok\/|grok-app-builder\/extensions\.js/.test(index)) {
  fail("index.html still references Google Fonts or Grok PWA chrome");
}

const files = walk(OUT);
const corpus = files
  .filter((f) => TEXT.has(extname(f)))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

let pruned = 0;
let bytes = 0;
for (const f of walk(join(OUT, "assets"))) {
  const name = f.slice(f.lastIndexOf("/") + 1);
  if (corpus.includes(name)) continue;
  bytes += statSync(f).size;
  rmSync(f);
  pruned++;
}
console.log(
  `[cap postbuild] ${OUT}/ ok; pruned ${pruned} unreferenced asset(s), ${(bytes / 1048576).toFixed(1)} MB`,
);
