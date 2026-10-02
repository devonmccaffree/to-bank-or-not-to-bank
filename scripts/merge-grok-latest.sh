#!/usr/bin/env bash
# Merge the latest Grok builder source (what's live at bankgame.grok.me) into this repo
# without touching the iOS/App Store work.
#
# Usage:
#   scripts/merge-grok-latest.sh ~/Developer/grok-latest            # extracted dir
#   scripts/merge-grok-latest.sh ~/Developer/grok-latest-src.tgz    # or the tarball
#
# Taken from Grok:   src/, server/ (mirrored with --delete), migrations/, vite.config.ts,
#                    scripts/grok-pwa-shared.*, public/* (added/updated, never deleted),
#                    package.json (hand-merge rules below), package-lock.json (Grok's, then npm install).
# Never touched:     ios/, assets/, docs/, store/, capacitor.config.ts, public/offline.html,
#                    scripts/open-ios.sh, scripts/cap/, patches/, vite.config.cap.ts, this script.
# App-only files in src/ (APP_ONLY_SRC below) survive the --delete mirror, and
# patches/native-hooks.patch (one-line haptics/share hooks in Grok's files) is
# re-applied afterwards; the merge stops if it no longer applies.
# Never copied:      .grok/, .project_id, .github_repo, .vercel/, artifacts/, attachments/,
#                    node_modules/.
set -euo pipefail

SRC_ARG="${1:?usage: $0 <grok-latest dir or .tgz>}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

if [[ -f "$SRC_ARG" ]]; then
  TMP="$(mktemp -d)"
  tar -xzf "$SRC_ARG" -C "$TMP"
  SRC="$TMP"
  # Tarballs may wrap everything in a single top-level folder.
  if [[ ! -f "$SRC/package.json" ]]; then
    inner="$(find "$SRC" -mindepth 2 -maxdepth 2 -name package.json -print -quit)"
    [[ -n "$inner" ]] && SRC="$(dirname "$inner")"
  fi
else
  SRC="$(cd "$SRC_ARG" && pwd)"
fi

for p in package.json src server; do
  [[ -e "$SRC/$p" ]] || { echo "error: $SRC/$p not found" >&2; exit 1; }
done
if [[ -f "$SRC/.github_repo" ]]; then
  echo "Grok project repo: $(cat "$SRC/.github_repo")"
fi

SRC_ARG_DIR_HINT="<extracted grok-latest dir>"
[[ -d "$SRC_ARG" ]] && SRC_ARG_DIR_HINT="$SRC"

RSYNC=(rsync -a --exclude .DS_Store)

# Ours, inside src/ (paths relative to src/). Excluded files are kept by --delete.
APP_ONLY_SRC=(
  lib/native.ts
  lib/native-hooks.ts
  components/share-table-button.tsx
)
HOOKS_PATCH=patches/native-hooks.patch

for f in "${APP_ONLY_SRC[@]}"; do
  if [[ -e "$SRC/src/$f" ]]; then
    echo "error: Grok's export now has src/$f too; reconcile it by hand first" >&2
    exit 1
  fi
done

echo "==> src/ and server/ (mirror; keeping app-only files)"
SRC_EXCLUDES=()
for f in "${APP_ONLY_SRC[@]}"; do SRC_EXCLUDES+=(--exclude "/$f"); done
"${RSYNC[@]}" --delete "${SRC_EXCLUDES[@]}" "$SRC/src/" src/
"${RSYNC[@]}" --delete "$SRC/server/" server/

echo "==> migrations/, vite.config.ts, scripts/grok-pwa-shared.*"
[[ -d "$SRC/migrations" ]] && "${RSYNC[@]}" "$SRC/migrations/" migrations/
cp "$SRC/vite.config.ts" vite.config.ts
for f in "$SRC"/scripts/grok-pwa-shared.*; do [[ -e "$f" ]] && cp "$f" scripts/; done

echo "==> public/ (add/update only; offline.html is ours)"
"${RSYNC[@]}" --exclude offline.html "$SRC/public/" public/

echo "==> $HOOKS_PATCH (haptics + share hooks)"
# Exact apply first (tolerates moved lines); then a fuzzy apply that tolerates
# changed neighbouring lines; otherwise stop.
if git apply --check "$HOOKS_PATCH" 2>/dev/null; then
  git apply "$HOOKS_PATCH"
elif git apply --reverse --check "$HOOKS_PATCH" 2>/dev/null; then
  echo "   already present in Grok's files; skipped"
elif patch -p1 --forward --fuzz=3 --dry-run --silent < "$HOOKS_PATCH" >/dev/null 2>&1; then
  patch -p1 --forward --fuzz=3 --no-backup-if-mismatch < "$HOOKS_PATCH"
  find src -name '*.orig' -newer "$HOOKS_PATCH" -delete 2>/dev/null || true
  echo "   applied with fuzz; refresh it: scripts/cap/update-hooks-patch.sh $SRC_ARG_DIR_HINT"
else
  echo "" >&2
  echo "error: $HOOKS_PATCH no longer applies to Grok's latest files:" >&2
  git apply --check -v "$HOOKS_PATCH" >&2 || true
  echo "" >&2
  echo "Re-add the hooks by hand (see the patch), then refresh it with:" >&2
  echo "  scripts/cap/update-hooks-patch.sh $SRC_ARG_DIR_HINT" >&2
  exit 1
fi

echo "==> package.json (Grok's, plus our Capacitor deps/scripts)"
node - "$SRC/package.json" <<'NODE'
const fs = require("fs");
const latest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ours = JSON.parse(fs.readFileSync("package.json", "utf8"));
const sortObj = (o) => Object.fromEntries(Object.entries(o || {}).sort(([a], [b]) => a.localeCompare(b)));
// Our additions win only for these keys; everything else (TanStack versions etc.) comes from Grok.
const OUR_SCRIPTS = ["ios", "ios:sync", "build:cap", "build:ios"];
const OUR_DEPS = [
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/ios",
  "@capacitor/haptics",
  "@capacitor/share",
  "@fontsource-variable/dm-sans",
  "@fontsource-variable/fraunces",
];
const OUR_DEV_DEPS = ["@capacitor/assets"];
const pick = (src, keys) => Object.fromEntries(keys.filter((k) => src && k in src).map((k) => [k, src[k]]));
const merged = { ...latest };
merged.scripts = { ...latest.scripts, ...pick(ours.scripts, OUR_SCRIPTS) };
merged.dependencies = sortObj({ ...latest.dependencies, ...pick(ours.dependencies, OUR_DEPS) });
merged.devDependencies = sortObj({ ...latest.devDependencies, ...pick(ours.devDependencies, OUR_DEV_DEPS) });
fs.writeFileSync("package.json", JSON.stringify(merged, null, 2) + "\n");
NODE

echo "==> Root files that differ from Grok's (review by hand, not copied):"
for f in AGENTS.md tsconfig.json eslint.config.mjs .prettierrc .gitignore startup.sh; do
  if [[ -e "$SRC/$f" ]] && ! cmp -s "$SRC/$f" "$f" 2>/dev/null; then echo "   $f"; fi
done

if [[ "${SKIP_NPM:-0}" != "1" ]]; then
  # Start from Grok's lockfile so resolved versions match what's live, then let npm
  # add the Capacitor packages on top.
  echo "==> npm install (package-lock.json = Grok's + Capacitor)"
  if [[ -f "$SRC/package-lock.json" ]]; then cp "$SRC/package-lock.json" package-lock.json; fi
  npm install --no-audit --no-fund
fi

echo "==> Done. Review with: git status && git diff --stat"
