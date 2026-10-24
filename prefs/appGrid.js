import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {stringComboRow} from './widgets.js';

export function buildAppGridGroup(settings, window) {
    const group = new Adw.PreferencesGroup({
        title: 'App Grid',
        description: 'Ordering and labels in the app grid',
    });

    const sort = new Adw.SwitchRow({
        title: 'Sort alphabetically',
        subtitle: 'Keep apps in A–Z order (dragging icons no longer sets a custom order)',
    });
    settings.bind('app-grid-sort-enabled', sort, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(sort);

    const folders = stringComboRow(settings, window, 'app-grid-sort-folders', 'Folder position', [
        ['alphabetical', 'Mixed with apps'],
        ['start', 'Before apps'],
        ['end', 'After apps'],
    ]);

    const folderContents = new Adw.SwitchRow({
        title: 'Sort inside folders',
        subtitle: 'Also order apps within each folder',
    });
    settings.bind('app-grid-sort-folder-contents', folderContents, 'active', Gio.SettingsBindFlags.DEFAULT);

    for (const row of [folders, folderContents]) {
        settings.bind('app-grid-sort-enabled', row, 'sensitive', Gio.SettingsBindFlags.GET);
        group.add(row);
    }

    const twoLine = new Adw.SwitchRow({
        title: 'Two-line app names',
        subtitle: 'Wrap long names onto a second line instead of cutting them off',
    });
    settings.bind('app-grid-two-line-enabled', twoLine, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(twoLine);

    return group;
}
