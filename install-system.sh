#!/usr/bin/env bash
# System-wide install: copy this folder into GNOME's shared extension dir.
# Run with:   sudo bash install-system.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
UUID="shellsense@avisek"
DEST="/usr/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"

# Remove the copy installed under the extension's old name.
sudo rm -rf /usr/share/gnome-shell/extensions/toolkit@avisek

sudo rm -rf "$DEST"
sudo cp -r "$SRC" "$DEST"

# Don't ship dev/test/packaging files in the system copy
sudo rm -rf "$DEST/install.sh" "$DEST/install-system.sh" "$DEST/test-nested.sh" \
    "$DEST/pack.sh" "$DEST/dist" "$DEST/README.md" "$DEST/.git" "$DEST/.gitignore"

echo "Installed to $DEST"
echo "Every user must still enable it once after logging in:"
echo "  gnome-extensions enable $UUID"
