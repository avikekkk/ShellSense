import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {TOOLS} from './tools/registry.js';
import {isLocked} from './tools/util.js';

export default class ShellSenseExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._active = new Map();
        this._signalIds = [];

        for (const tool of TOOLS) {
            this._signalIds.push(
                this._settings.connect(`changed::${tool.key}`, () => this._syncTool(tool)));
        }

        Main.sessionMode.connectObject('updated', () => this._syncAll(), this);
        this._syncAll();
    }

    // metadata.json lists "unlock-dialog" so that locking the screen does not
    // call disable(): that would wipe the clipboard history, which is kept in
    // memory only. While locked, every tool except the clipboard recorder is
    // stopped (see _syncTool), and the clipboard tool drops its popup,
    // shortcut and key handlers (see ClipboardTool._syncUi).
    disable() {
        Main.sessionMode.disconnectObject(this);

        for (const id of this._signalIds)
            this._settings.disconnect(id);
        this._signalIds = null;

        for (const instance of this._active.values())
            instance.destroy();
        this._active = null;

        this._settings = null;
    }

    _syncAll() {
        for (const tool of TOOLS)
            this._syncTool(tool);
    }

    // Start or stop a tool to match its "<tool>-enabled" setting
    // and whether the screen is locked.
    _syncTool(tool) {
        const wanted = this._settings.get_boolean(tool.key) &&
            (tool.keepWhenLocked || !isLocked());
        const instance = this._active.get(tool.id);

        if (wanted && !instance) {
            try {
                this._active.set(tool.id, new tool.Tool(this, this._settings));
            } catch (e) {
                console.error(`[ShellSense] Failed to start ${tool.id}: ${e}`);
            }
        } else if (!wanted && instance) {
            instance.destroy();
            this._active.delete(tool.id);
        }
    }
}
