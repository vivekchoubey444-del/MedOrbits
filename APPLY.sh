#!/usr/bin/env bash
# Run from anywhere inside your MedOrbits working copy:  bash APPLY.sh /path/to/fixed
set -euo pipefail
SRC="$(cd "${1:-.}" && pwd)"
cd "$(git rev-parse --show-toplevel)"
(cd "$SRC" && find . -type f ! -name '*.js.md' ! -name 'APPLY.sh.md' ! -name 'APPLY.sh' -print0) |
  while IFS= read -r -d '' f; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; echo "updated $f"; done
# empty/stray report breaks JSON validation; stale shrinkwrap shadows package-lock.json
git rm -f --ignore-unmatch eslnt-report.json npm-shrinkwrap.json
