import Adw from 'gi://Adw';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {buildAppGridGroup} from './prefs/appGrid.js';
import {buildCaffeineGroup} from './prefs/caffeine.js';
import {buildClipboardGroup} from './prefs/clipboard.js';
import {buildColorPickerGroup} from './prefs/colorPicker.js';
import {buildNetSpeedGroup} from './prefs/netSpeed.js';
import {buildTopBarGroup} from './prefs/topBar.js';

export default class ShellSensePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // Keep settings alive as long as the window.
        window._settings = settings;

        const page = new Adw.PreferencesPage({
            title: 'Tools',
            icon_name: 'applications-utilities-symbolic',
        });
        window.add(page);

        page.add(buildTopBarGroup(settings));
        page.add(buildNetSpeedGroup(settings, window));
        page.add(buildAppGridGroup(settings, window));
        page.add(buildCaffeineGroup(settings));
        page.add(buildClipboardGroup(settings, window));
        page.add(buildColorPickerGroup(settings, window));
    }
}
