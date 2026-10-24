import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

export function buildTopBarGroup(settings) {
    const group = new Adw.PreferencesGroup({title: 'Top Bar'});

    const hideActivities = new Adw.SwitchRow({
        title: 'Hide Activities button',
        subtitle: 'Remove the workspace dots on the left. Super key and hot corner still open the overview',
    });
    settings.bind('hide-activities-enabled', hideActivities, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(hideActivities);

    return group;
}
