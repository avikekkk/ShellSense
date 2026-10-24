#!/usr/bin/env bash
# Build the zip to upload to extensions.gnome.org (written to dist/).
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$SRC/dist"

gnome-extensions pack "$SRC" --force --out-dir="$SRC/dist" \
    --extra-source=LICENSE \
    --extra-source=tools \
    --extra-source=prefs \
    --extra-source=icons

echo "Built $(ls "$SRC"/dist/*.zip)"
