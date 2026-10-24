// Caffeine: stop the screen from blanking/locking and the system from
// suspending, via a GNOME Session Manager inhibitor.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

// org.gnome.SessionManager.Inhibit flags: 4 = suspend, 8 = idle (blank/lock).
const INHIBIT_FLAGS = 4 | 8;

// Minutes; 0 = until turned off.
const DURATIONS = [
    [0, 'Until turned off'],
    [15, '15 minutes'],
    [30, '30 minutes'],
    [60, '1 hour'],
    [120, '2 hours'],
];

function callSessionManager(method, params, replyType = null) {
    return new Promise((resolve, reject) => {
        Gio.DBus.session.call(
            'org.gnome.SessionManager', '/org/gnome/SessionManager', 'org.gnome.SessionManager',
            method, params, replyType, Gio.DBusCallFlags.NONE, -1, null,
            (conn, res) => {
                try {
                    resolve(conn.call_finish(res));
                } catch (e) {
                    reject(e);
                }
            });
    });
}

function formatTime(unixSeconds) {
    return GLib.DateTime.new_from_unix_local(unixSeconds).format('%H:%M');
}

const CaffeineToggle = GObject.registerClass({
    GTypeName: 'ShellSenseCaffeineToggle',
}, class CaffeineToggle extends QuickSettings.QuickMenuToggle {
    _init(onIcon, offIcon) {
        super._init({title: 'Caffeine', gicon: offIcon, toggleMode: true});
        this.menu.setHeader(onIcon, 'Caffeine', 'Keep the screen on and prevent suspend');
    }
});

const CaffeineIndicator = GObject.registerClass({
    GTypeName: 'ShellSenseCaffeineIndicator',
}, class CaffeineIndicator extends QuickSettings.SystemIndicator {
    _init(onIcon) {
        super._init();
        this.icon = this._addIndicator();
        this.icon.gicon = onIcon;
        this.icon.visible = false;
    }
});

export class CaffeineTool {
    constructor(extension, settings) {
        this._settings = settings;
        this._cookie = null;
        this._timerId = 0;
        this._endTime = 0;
        this._minutes = 0;

        const iconDir = extension.dir.get_child('icons');
        this._onIcon = Gio.FileIcon.new(iconDir.get_child('shellsense-caffeine-on-symbolic.svg'));
        this._offIcon = Gio.FileIcon.new(iconDir.get_child('shellsense-caffeine-off-symbolic.svg'));

        this._toggle = new CaffeineToggle(this._onIcon, this._offIcon);
        this._toggle.connect('clicked', () => {
            // toggleMode already flipped `checked`.
            if (this._toggle.checked)
                this._activate(0);
            else
                this._deactivate();
        });

        this._durationSection = new PopupMenu.PopupMenuSection();
        this._durationItems = new Map();
        for (const [minutes, label] of DURATIONS) {
            this._durationItems.set(minutes,
                this._durationSection.addAction(label, () => this._activate(minutes)));
        }
        this._toggle.menu.addMenuItem(this._durationSection);
        this._toggle.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._toggle.menu.addAction('Turn off', () => this._deactivate());

        this._indicator = new CaffeineIndicator(this._onIcon);
        this._indicator.quickSettingsItems.push(this._toggle);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

        this._settingIds = [
            settings.connect('changed::caffeine-show-indicator', () => this._updateUi()),
        ];

        if (settings.get_boolean('caffeine-restore') && settings.get_boolean('caffeine-active'))
            this._activate(0);
        else
            this._updateUi();
    }

    destroy() {
        for (const id of this._settingIds)
            this._settings.disconnect(id);
        this._settingIds = null;

        this._stopTimer();
        this._uninhibit();

        this._indicator.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
        this._indicator = null;
        this._toggle = null;
        this._durationItems = null;
        this._settings = null;
    }

    get _active() {
        return this._cookie !== null;
    }

    async _activate(minutes) {
        this._stopTimer();
        this._endTime = 0;
        this._minutes = minutes;

        if (minutes > 0) {
            this._endTime = Math.floor(Date.now() / 1000) + minutes * 60;
            this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, minutes * 60, () => {
                this._timerId = 0;
                this._deactivate();
                return GLib.SOURCE_REMOVE;
            });
        }

        if (!this._active) {
            try {
                const reply = await callSessionManager('Inhibit',
                    new GLib.Variant('(susu)', ['shellsense', 0, 'Caffeine is on', INHIBIT_FLAGS]),
                    new GLib.VariantType('(u)'));
                // Tool may have been turned off while we waited.
                if (!this._settings) {
                    callSessionManager('Uninhibit', new GLib.Variant('(u)', [reply.deepUnpack()[0]])).catch(() => {});
                    return;
                }
                this._cookie = reply.deepUnpack()[0];
            } catch (e) {
                console.error(`[ShellSense] caffeine: failed to inhibit: ${e}`);
                this._stopTimer();
                this._endTime = 0;
            }
        }

        // Only remember "on" when it's indefinite.
        this._settings.set_boolean('caffeine-active', this._active && minutes === 0);
        this._updateUi();
    }

    _deactivate() {
        this._stopTimer();
        this._endTime = 0;
        this._uninhibit();
        this._settings?.set_boolean('caffeine-active', false);
        this._updateUi();
    }

    _uninhibit() {
        if (!this._active)
            return;
        const cookie = this._cookie;
        this._cookie = null;
        callSessionManager('Uninhibit', new GLib.Variant('(u)', [cookie]))
            .catch(e => console.error(`[ShellSense] caffeine: failed to uninhibit: ${e}`));
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
    }

    _updateUi() {
        if (!this._toggle)
            return;

        const active = this._active;
        this._toggle.checked = active;
        this._toggle.gicon = active ? this._onIcon : this._offIcon;
        this._toggle.subtitle = !active
            ? null
            : this._endTime ? `Until ${formatTime(this._endTime)}` : 'On';
        this._indicator.icon.visible = active && this._settings.get_boolean('caffeine-show-indicator');

        // Tick the duration that's running.
        for (const [minutes, item] of this._durationItems) {
            item.setOrnament(active && minutes === this._minutes
                ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
    }
}
