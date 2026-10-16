#!/usr/bin/env bash
set -Eeuo pipefail
# ============================================================
# MedOrbits Font Asset Downloader
# Design System: Royal Burgundy and Champagne Gold
# Version: 1.1.0
#
# Requirements:
#   Bash 4+, curl, Python 3
#
# Output:
#   fonts/dm-sans-regular.woff2
#   fonts/dm-sans-medium.woff2
#   fonts/dm-sans-semibold.woff2
#   fonts/dm-sans-bold.woff2
#   fonts/playfair-display-medium.woff2
#   fonts/playfair-display-semibold.woff2
#   fonts/playfair-display-bold.woff2
#   fonts/font-manifest.json
# ============================================================
readonly FONT_DIR="fonts"
readonly MANIFEST="${FONT_DIR}/font-manifest.json"
readonly USER_AGENT="Mozilla/5.0"
readonly CONNECT_TIMEOUT=15
readonly MAX_TIME=90
readonly RETRIES=3
TMP_DIR=""
cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]]; then
    rm -rf -- "$TMP_DIR"
  fi
}
trap cleanup EXIT
die() {
  printf '[ERROR] %s\n' "$*" >&2
  exit 1
}
log() {
  printf '[MedOrbits Fonts] %s\n' "$*"
}
# ------------------------------------------------------------
# 1. Check dependencies
# ------------------------------------------------------------
for command in curl python3; do
  command -v "$command" >/dev/null 2>&1 ||
    die "Required command not found: $command"
done
mkdir -p "$FONT_DIR"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/medorbits-fonts.XXXXXXXX")"
# ------------------------------------------------------------
# 2. Download, validate and publish a font
# ------------------------------------------------------------
download_font() {
  local family="$1"
  local weight="$2"
  local output="$3"
  local css_file="$TMP_DIR/${output%.woff2}.css"
  local font_file="$TMP_DIR/$output"
  local font_url
  local encoded_family
  encoded_family="${family// /+}"
  local css_url="https://fonts.googleapis.com/css2?family=${encoded_family}:wght@${weight}&display=swap"
  log "Fetching ${family}, weight ${weight}"
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry "$RETRIES" \
    --retry-delay 2 \
    --retry-all-errors \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" \
    --user-agent "$USER_AGENT" \
    "$css_url" \
    --output "$css_file"
  [[ -s "$css_file" ]] ||
    die "Empty Google Fonts CSS response: ${family} ${weight}"
  font_url="$(
    python3 - "$css_file" "$weight" <<'PY'
import re
import sys
from pathlib import Path
css_path = Path(sys.argv[1])
requested_weight = sys.argv[2]
css = css_path.read_text(encoding="utf-8")
# Parse individual @font-face blocks and their preceding subset
# comments. Select the Latin subset and the requested static weight.
blocks = re.findall(
    r"/\*\s*(.*?)\s*\*/\s*@font-face\s*\{(.*?)\}",
    css,
    re.S,
)
candidates = []
for subset, body in blocks:
    weight_match = re.search(
        r"font-weight\s*:\s*([^;]+)",
        body,
        re.I,
    )
    if not weight_match:
        continue
    weight_value = weight_match.group(1).strip()
    # Prefer an exact weight match. A variable face may advertise
    # a range such as 100 900 and is not necessarily a static face.
    if weight_value != requested_weight:
        continue
    src_match = re.search(
        r"url\(\s*['\"]?"
        r"(https://fonts\.gstatic\.com/[^)'\"\s]+\.woff2)"
        r"['\"]?\s*\)",
        body,
        re.I,
    )
    if not src_match:
        continue
    candidates.append({
        "subset": subset.strip().lower(),
        "url": src_match.group(1),
    })
latin = [item for item in candidates if item["subset"] == "latin"]
if not latin:
    sys.exit(
        f"No exact-weight Latin WOFF2 resource found for weight "
        f"{requested_weight}. Check the current Google Fonts CSS."
    )
print(latin[0]["url"])
PY
  )" || die "Could not extract font URL: ${family} ${weight}"
  log "Downloading ${output}"
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry "$RETRIES" \
    --retry-delay 2 \
    --retry-all-errors \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" \
    "$font_url" \
    --output "$font_file"
  # Validate the WOFF2 signature before publishing.
  python3 - "$font_file" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
if not path.is_file():
    sys.exit(f"Missing downloaded font: {path}")
data = path.read_bytes()
if len(data) < 1000:
    sys.exit(f"Font file is suspiciously small: {path}")
if data[:4] != b"wOF2":
    sys.exit(f"Invalid WOFF2 signature: {path}")
print(f"Validated WOFF2 signature ({len(data):,} bytes)")
PY
  # Atomic replacement within the destination filesystem.
  mv -f -- "$font_file" "${FONT_DIR}/${output}"
  log "Verified ${FONT_DIR}/${output}"
}
# ------------------------------------------------------------
# 3. Download all seven assets
# ------------------------------------------------------------
download_font "DM Sans" 400 "dm-sans-regular.woff2"
download_font "DM Sans" 500 "dm-sans-medium.woff2"
download_font "DM Sans" 600 "dm-sans-semibold.woff2"
download_font "DM Sans" 700 "dm-sans-bold.woff2"
download_font "Playfair Display" 500 "playfair-display-medium.woff2"
download_font "Playfair Display" 600 "playfair-display-semibold.woff2"
download_font "Playfair Display" 700 "playfair-display-bold.woff2"
# ------------------------------------------------------------
# 4. Generate the font manifest
# ------------------------------------------------------------
log "Generating font manifest"
python3 - "$FONT_DIR" "$MANIFEST" <<'PY'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
font_dir = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
assets = [
    ("dm-sans-regular.woff2", "DM Sans", 400),
    ("dm-sans-medium.woff2", "DM Sans", 500),
    ("dm-sans-semibold.woff2", "DM Sans", 600),
    ("dm-sans-bold.woff2", "DM Sans", 700),
    ("playfair-display-medium.woff2", "Playfair Display", 500),
    ("playfair-display-semibold.woff2", "Playfair Display", 600),
    ("playfair-display-bold.woff2", "Playfair Display", 700),
]
records = []
for filename, family, weight in assets:
    path = font_dir / filename
    if not path.is_file():
        raise SystemExit(f"Missing font asset: {path}")
    data = path.read_bytes()
    if len(data) < 1000 or data[:4] != b"wOF2":
        raise SystemExit(f"Font validation failed: {path}")
    records.append({
        "file": filename,
        "path": f"fonts/{filename}",
        "family": family,
        "weight": weight,
        "format": "woff2",
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    })
manifest = {
    "schemaVersion": "1.0.0",
    "package": "MedOrbits Fonts",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "designSystem": "Royal Burgundy and Champagne Gold",
    "assets": records,
}
temporary_manifest = manifest_path.with_suffix(".json.tmp")
temporary_manifest.write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
temporary_manifest.replace(manifest_path)
print(f"Manifest: {manifest_path}")
print(f"Validated assets: {len(records)}")
PY
# ------------------------------------------------------------
# 5. Final summary
# ------------------------------------------------------------
printf '\n'
log "All seven WOFF2 files downloaded and validated."
log "Manifest generated: ${MANIFEST}"
if command -v du >/dev/null 2>&1; then
  printf '\nFont asset sizes:\n'
  du -h \
    "$FONT_DIR/dm-sans-regular.woff2" \
    "$FONT_DIR/dm-sans-medium.woff2" \
    "$FONT_DIR/dm-sans-semibold.woff2" \
    "$FONT_DIR/dm-sans-bold.woff2" \
    "$FONT_DIR/playfair-display-medium.woff2" \
    "$FONT_DIR/playfair-display-semibold.woff2" \
    "$FONT_DIR/playfair-display-bold.woff2"
fi
printf '\n'
log "Download process completed."