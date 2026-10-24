import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const decoder = new TextDecoder();

// Read a small file (e.g. from /proc or /sys) as text, without blocking
// the shell.
export function readText(path, cancellable = null) {
    return new Promise((resolve, reject) => {
        Gio.File.new_for_path(path).load_contents_async(cancellable, (file, res) => {
            try {
                const [, bytes] = file.load_contents_finish(res);
                resolve(decoder.decode(bytes));
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Add a panel indicator using the "<prefix>-position" / "<prefix>-index" settings.
export function addToPanel(extension, settings, prefix, indicator) {
    Main.panel.addToStatusArea(
        `${extension.uuid}-${prefix}`,
        indicator,
        settings.get_int(`${prefix}-index`),
        settings.get_string(`${prefix}-position`));
}

// True on the lock screen.
export function isLocked() {
    return Main.sessionMode.currentMode === 'unlock-dialog';
}

// Register a global shortcut stored in the "as" settings key `key`.
// Undo with Main.wm.removeKeybinding(key).
// inPopup: also fire while a menu is open (so the shortcut can close it again).
export function addKeybinding(settings, key, handler, inPopup = false) {
    let modes = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;
    if (inPopup)
        modes |= Shell.ActionMode.POPUP;
    Main.wm.addKeybinding(key, settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT, modes, handler);
}
