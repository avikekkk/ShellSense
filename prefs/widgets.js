import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

// Combo row bound to a string GSettings key.
// options: [[value, label], ...]
export function stringComboRow(settings, window, key, title, options, subtitle = '') {
    const row = new Adw.ComboRow({
        title,
        subtitle,
        model: Gtk.StringList.new(options.map(([, label]) => label)),
    });

    const sync = () => {
        const i = options.findIndex(([value]) => value === settings.get_string(key));
        row.selected = Math.max(0, i);
    };
    sync();

    const id = settings.connect(`changed::${key}`, sync);
    window.connect('close-request', () => settings.disconnect(id));

    row.connect('notify::selected', () => {
        const value = options[row.selected][0];
        if (settings.get_string(key) !== value)
            settings.set_string(key, value);
    });

    return row;
}

// Row showing a shortcut stored in an "as" GSettings key. Click to change it.
export function shortcutRow(settings, window, key, title) {
    const label = new Gtk.ShortcutLabel({
        disabled_text: 'Disabled',
        valign: Gtk.Align.CENTER,
    });
    const row = new Adw.ActionRow({title, activatable: true});
    row.add_suffix(label);

    const sync = () => {
        label.accelerator = settings.get_strv(key)[0] ?? '';
    };
    sync();

    const id = settings.connect(`changed::${key}`, sync);
    window.connect('close-request', () => settings.disconnect(id));

    row.connect('activated', () => captureShortcut(window, title, accel => {
        settings.set_strv(key, accel ? [accel] : []);
    }));

    return row;
}

// Small modal that records the next key combination.
// Esc cancels, Backspace disables the shortcut.
function captureShortcut(parent, title, onDone) {
    const dialog = new Adw.Window({
        modal: true,
        transient_for: parent,
        default_width: 360,
        title,
        content: new Adw.StatusPage({
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
            title: 'Press a shortcut',
            description: 'Esc to cancel · Backspace to disable',
        }),
    });

    const controller = new Gtk.EventControllerKey();
    controller.connect('key-pressed', (c, keyval, keycode, state) => {
        const mods = state & Gtk.accelerator_get_default_mod_mask();
        keyval = Gdk.keyval_to_lower(keyval);

        if (!mods && keyval === Gdk.KEY_Escape) {
            dialog.close();
        } else if (!mods && keyval === Gdk.KEY_BackSpace) {
            onDone(null);
            dialog.close();
        } else if (mods && Gtk.accelerator_valid(keyval, mods)) {
            // Require a modifier so a plain letter can't hijack typing.
            onDone(Gtk.accelerator_name(keyval, mods));
            dialog.close();
        }
        return Gdk.EVENT_STOP;
    });
    dialog.add_controller(controller);
    dialog.present();
}
