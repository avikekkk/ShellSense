#!/usr/bin/env bash
# Run a nested GNOME Shell in a window to test changes without logging out.
# Logs print to this terminal.
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1600x900
glib-compile-schemas "$(cd "$(dirname "$0")" && pwd)/schemas"
dbus-run-session -- gnome-shell --nested --wayland
