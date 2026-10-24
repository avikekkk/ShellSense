import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {shortcutRow} from './widgets.js';

export function buildClipboardGroup(settings, window) {
    const group = new Adw.PreferencesGroup({
        title: 'Clipboard History',
        description: 'Recently copied text, opened with the shortcut. Kept in memory only, cleared on logout',
    });

    const enabled = new Adw.SwitchRow({title: 'Enabled'});
    settings.bind('clipboard-enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(enabled);

    const shortcut = shortcutRow(settings, window, 'clipboard-shortcut', 'Shortcut');
    shortcut.subtitle = 'Not set by default. Click to choose one, e.g. Alt+C';

    const size = Adw.SpinRow.new_with_range(5, 200, 5);
    size.title = 'History size';
    size.subtitle = 'Number of entries to keep';
    settings.bind('clipboard-history-size', size, 'value', Gio.SettingsBindFlags.DEFAULT);

    const paste = new Adw.SwitchRow({
        title: 'Paste on select',
        subtitle: 'Paste the picked entry into the focused window, not just copy it',
    });
    settings.bind('clipboard-paste-on-select', paste, 'active', Gio.SettingsBindFlags.DEFAULT);

    for (const row of [shortcut, size, paste]) {
        settings.bind('clipboard-enabled', row, 'sensitive', Gio.SettingsBindFlags.GET);
        group.add(row);
    }

    return group;
}
