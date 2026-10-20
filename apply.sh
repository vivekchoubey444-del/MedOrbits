#!/usr/bin/env bash
# Run from the root of your MedOrbits working copy:  bash APPLY.sh /path/to/fixed
set -euo pipefail
SRC="${1:-.}"
cd "$(git rev-parse --show-toplevel)"
(cd "$SRC" && find . -type f \( -path './.github/*' -o -path './tests/*' -o -name docker-compose.yml \) -print0) |
  while IFS= read -r -d '' f; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; echo "updated $f"; done
git rm -f --ignore-unmatch eslnt-report.json
