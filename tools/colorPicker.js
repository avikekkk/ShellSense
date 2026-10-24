// Color picker: press the shortcut (default Alt+P), click anywhere on screen,
// and the color is copied to the clipboard. Esc cancels.
// Reuses GNOME's own picker (the one behind the screenshot portal).

import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {PickPixel} from 'resource:///org/gnome/shell/ui/screenshot.js';

import {addKeybinding} from './util.js';

const hex = n => n.toString(16).padStart(2, '0');

function formatColor({red, green, blue}, format) {
    return format === 'rgb'
        ? `rgb(${red}, ${green}, ${blue})`
        : `#${hex(red)}${hex(green)}${hex(blue)}`;
}

export class ColorPickerTool {
    constructor(extension, settings) {
        this._settings = settings;
        this._picker = null;
        addKeybinding(settings, 'color-picker-shortcut', () => this._pick());
    }

    destroy() {
        Main.wm.removeKeybinding('color-picker-shortcut');
        // Cancel a pick in progress; the picker cleans itself up.
        this._picker?._grabHelper.ungrab();
        this._picker = null;
        this._settings = null;
    }

    async _pick() {
        if (this._picker)
            return;

        let color;
        try {
            this._picker = new PickPixel(new Shell.Screenshot());
            color = await this._picker.pickAsync();
        } catch (e) {
            console.error(`[ShellSense] color picker: ${e}`);
        } finally {
            this._picker = null;
        }

        // null = cancelled with Esc; no settings = tool turned off meanwhile.
        if (!color || !this._settings)
            return;

        const text = formatColor(color, this._settings.get_string('color-picker-format'));
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
        Main.osdWindowManager.show(global.display.get_current_monitor(),
            new Gio.ThemedIcon({name: 'color-select-symbolic'}), `Copied ${text}`);
    }
}
