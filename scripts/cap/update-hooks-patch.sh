#!/usr/bin/env bash
# Regenerate patches/native-hooks.patch: the app-only one-line hooks (haptics,
# Share button) inside Grok-owned files, as a diff against Grok's originals.
#
# Usage: scripts/cap/update-hooks-patch.sh <grok-latest dir> [extra/file.tsx ...]
# Files already in the patch are always included; pass extra paths (relative to
# the repo root) when hooking a new Grok file.
set -euo pipefail
SRC="$(cd "${1:?usage: $0 <grok-latest dir> [files...]}" && pwd)"; shift || true
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
PATCH=patches/native-hooks.patch
mkdir -p patches

files=()
if [[ -f "$PATCH" ]]; then
  while IFS= read -r f; do files+=("$f"); done < <(sed -n 's#^+++ b/##p' "$PATCH")
fi
files+=("$@")

tmp="$(mktemp)"
for f in $(printf '%s\n' "${files[@]}" | sort -u); do
  [[ -f "$SRC/$f" ]] || { echo "error: $SRC/$f not found (not a Grok file?)" >&2; exit 1; }
  diff -u --label "a/$f" --label "b/$f" "$SRC/$f" "$f" >> "$tmp" || true
done
mv "$tmp" "$PATCH"
echo "Wrote $PATCH ($(grep -c '^+++ ' "$PATCH") files)"
