import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {stringComboRow} from './widgets.js';

export function buildNetSpeedGroup(settings, window) {
    const group = new Adw.PreferencesGroup({
        title: 'Internet Speed',
        description: 'Live download / upload speed in the top bar',
    });

    const enabled = new Adw.SwitchRow({title: 'Enabled'});
    settings.bind('net-speed-enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(enabled);

    const display = stringComboRow(settings, window, 'net-speed-display', 'Show', [
        ['both', 'Download and upload'],
        ['down', 'Download only'],
        ['up', 'Upload only'],
        ['total', 'Combined total'],
    ]);

    const position = stringComboRow(settings, window, 'net-speed-position', 'Top bar section', [
        ['left', 'Left'],
        ['center', 'Center'],
        ['right', 'Right'],
    ]);

    const index = Adw.SpinRow.new_with_range(0, 20, 1);
    index.title = 'Order in section';
    index.subtitle = '0 = first item';
    settings.bind('net-speed-index', index, 'value', Gio.SettingsBindFlags.DEFAULT);

    const interval = Adw.SpinRow.new_with_range(0.5, 10, 0.5);
    interval.title = 'Refresh interval';
    interval.subtitle = 'Seconds';
    interval.digits = 1;
    settings.bind('net-speed-interval', interval, 'value', Gio.SettingsBindFlags.DEFAULT);

    const useBits = new Adw.SwitchRow({
        title: 'Use bits',
        subtitle: 'Mb/s instead of MB/s',
    });
    settings.bind('net-speed-use-bits', useBits, 'active', Gio.SettingsBindFlags.DEFAULT);

    const hideIdle = new Adw.SwitchRow({
        title: 'Hide when idle',
        subtitle: 'Hide the indicator when there is no traffic',
    });
    settings.bind('net-speed-hide-idle', hideIdle, 'active', Gio.SettingsBindFlags.DEFAULT);

    for (const row of [display, position, index, interval, useBits, hideIdle]) {
        settings.bind('net-speed-enabled', row, 'sensitive', Gio.SettingsBindFlags.GET);
        group.add(row);
    }

    return group;
}
