import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

export function buildCaffeineGroup(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Caffeine',
        description: 'Quick Settings toggle that keeps the screen on and prevents suspend',
    });

    const enabled = new Adw.SwitchRow({title: 'Enabled'});
    settings.bind('caffeine-enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(enabled);

    const showIndicator = new Adw.SwitchRow({
        title: 'Top bar icon',
        subtitle: 'Show a cup icon in the top bar while Caffeine is on',
    });
    settings.bind('caffeine-show-indicator', showIndicator, 'active', Gio.SettingsBindFlags.DEFAULT);

    const restore = new Adw.SwitchRow({
        title: 'Remember state',
        subtitle: 'Turn Caffeine back on after login if it was left on',
    });
    settings.bind('caffeine-restore', restore, 'active', Gio.SettingsBindFlags.DEFAULT);

    for (const row of [showIndicator, restore]) {
        settings.bind('caffeine-enabled', row, 'sensitive', Gio.SettingsBindFlags.GET);
        group.add(row);
    }

    return group;
}
