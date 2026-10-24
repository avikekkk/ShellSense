import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {shortcutRow, stringComboRow} from './widgets.js';

export function buildColorPickerGroup(settings, window) {
    const group = new Adw.PreferencesGroup({
        title: 'Color Picker',
        description: 'Click anywhere on screen to copy that color. Esc cancels',
    });

    const enabled = new Adw.SwitchRow({title: 'Enabled'});
    settings.bind('color-picker-enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(enabled);

    const shortcut = shortcutRow(settings, window, 'color-picker-shortcut', 'Shortcut');

    const format = stringComboRow(settings, window, 'color-picker-format', 'Copy as', [
        ['hex', 'Hex (#1a2b3c)'],
        ['rgb', 'RGB (rgb(26, 43, 60))'],
    ]);

    for (const row of [shortcut, format]) {
        settings.bind('color-picker-enabled', row, 'sensitive', Gio.SettingsBindFlags.GET);
        group.add(row);
    }

    return group;
}
