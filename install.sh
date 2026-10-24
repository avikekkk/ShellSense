#!/usr/bin/env bash
# Dev install: compile schemas and symlink this folder into GNOME's extension dir.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
UUID="shellsense@avisek"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"

mkdir -p "$(dirname "$DEST")"
if [ ! -e "$DEST" ]; then
    ln -s "$SRC" "$DEST"
    echo "Linked $DEST -> $SRC"
else
    echo "$DEST already exists"
fi

echo "Done. On Wayland, log out and back in once, then run:"
echo "  gnome-extensions enable $UUID"
