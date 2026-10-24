// Clipboard history: remember copied text and pick it again from a popup
// that opens at the mouse pointer (shortcut set in preferences).

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {ensureActorVisibleInScrollView} from 'resource:///org/gnome/shell/misc/animationUtils.js';

import {addKeybinding, isLocked} from './util.js';

// Password managers (KeePassXC etc.) tag secrets with this; never store them.
const SECRET_MIMETYPE = 'x-kde-passwordManagerHint';

// Entries that look like a CSS color get a swatch (e.g. from the color picker).
const COLOR_RE = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i;

function preview(text) {
    return text.replace(/\s+/g, ' ').trim();
}

export class ClipboardTool {
    constructor(extension, settings) {
        this._settings = settings;
        this._clipboard = St.Clipboard.get_default();
        this._focusId = 0;
        this._pasteId = 0;
        this._items = [];
        // Newest first. Memory only; the tool keeps running on the lock
        // screen (see extension.js), so this lasts until logout.
        this._history = [];

        global.display.get_selection().connectObject('owner-changed', (sel, type) => {
            if (type === Meta.SelectionType.SELECTION_CLIPBOARD)
                this._onClipboardChanged();
        }, this);

        settings.connectObject('changed::clipboard-history-size', () => {
            this._trim();
            this._render();
        }, this);

        // On the lock screen only the recording above keeps running; the
        // popup, shortcut and all key handlers are removed.
        Main.sessionMode.connectObject('updated', () => this._syncUi(), this);
        this._syncUi();
    }

    destroy() {
        this._destroyUi();
        global.display.get_selection().disconnectObject(this);
        Main.sessionMode.disconnectObject(this);
        this._settings.disconnectObject(this);

        this._history = null;
        this._settings = null;
    }

    _syncUi() {
        if (isLocked())
            this._destroyUi();
        else if (!this._menu)
            this._buildUi();
    }

    _destroyUi() {
        if (!this._menu)
            return;

        Main.wm.removeKeybinding('clipboard-shortcut');

        for (const id of [this._focusId, this._pasteId]) {
            if (id)
                GLib.source_remove(id);
        }
        this._focusId = this._pasteId = 0;

        this._menu.destroy();
        this._menu = null;
        this._menuManager = null;
        this._anchor.destroy();
        this._anchor = null;
        this._search = null;
        this._list = null;
        this._scroll = null;
        this._items = [];
        this._virtualKeyboard = null;
    }

    _buildUi() {
        // No top bar icon: the menu hangs off an invisible 1px anchor that
        // is moved to the mouse pointer before opening.
        this._anchor = new St.Widget({width: 1, height: 1, opacity: 0});
        Main.uiGroup.add_child(this._anchor);

        const menu = new PopupMenu.PopupMenu(this._anchor, 0, St.Side.TOP);
        menu.actor.add_style_class_name('shellsense-clipboard-popup');
        Main.uiGroup.add_child(menu.actor);
        menu.actor.hide();
        // Handles the grab, Esc and click-outside-to-close.
        this._menuManager = new PopupMenu.PopupMenuManager(this._anchor);
        this._menuManager.addMenu(menu);
        this._menu = menu;

        const searchItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this._search = new St.Entry({
            hint_text: 'Search clipboard…',
            can_focus: true,
            x_expand: true,
            style_class: 'shellsense-clipboard-search',
        });
        this._search.clutter_text.connect('text-changed', () => this._render());
        this._search.clutter_text.connect('key-press-event', (actor, event) => this._onSearchKey(event));
        searchItem.add_child(this._search);
        menu.addMenuItem(searchItem);

        // History items live in a scrollable section so a long history
        // doesn't run off the screen.
        this._list = new PopupMenu.PopupMenuSection();
        this._scroll = new St.ScrollView({
            style_class: 'shellsense-clipboard-scroll vfade',
            hscrollbar_policy: St.PolicyType.NEVER,
            // Scrollable by wheel/keyboard, but no scrollbar eating into the
            // rows; the fade at the edges shows there's more.
            vscrollbar_policy: St.PolicyType.EXTERNAL,
            child: this._list.actor,
        });
        // Rows scrolled out of view would otherwise draw over the search box.
        this._scroll.clip_to_allocation = true;
        const scrollSection = new PopupMenu.PopupMenuSection();
        scrollSection.actor.add_child(this._scroll);
        menu.addMenuItem(scrollSection);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addAction('Clear history', () => {
            this._history.length = 0;
            this._render();
        });

        menu.connect('open-state-changed', (m, open) => {
            if (!open)
                return;
            this._search.set_text('');
            this._render();
            // Focus the search box once the menu has finished taking focus.
            if (this._focusId)
                GLib.source_remove(this._focusId);
            this._focusId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._focusId = 0;
                global.stage.set_key_focus(this._search);
                return GLib.SOURCE_REMOVE;
            });
        });

        addKeybinding(this._settings, 'clipboard-shortcut', () => this._toggleMenu(), true);
    }

    _toggleMenu() {
        if (this._menu.isOpen) {
            this._menu.close(BoxPointer.PopupAnimation.FULL);
            return;
        }

        // Opens like a right-click menu; GNOME flips/shifts it to stay on
        // screen near the bottom or right edge.
        const [x, y] = global.get_pointer();
        this._anchor.set_position(x, y);
        this._menu.open(BoxPointer.PopupAnimation.FULL);
    }

    _onClipboardChanged() {
        const mimetypes = global.display.get_selection()
            .get_mimetypes(Meta.SelectionType.SELECTION_CLIPBOARD);
        if (mimetypes.includes(SECRET_MIMETYPE))
            return;

        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            // Tool may have been turned off while we waited.
            if (!this._settings || !text || !text.trim())
                return;

            const existing = this._history.indexOf(text);
            if (existing >= 0)
                this._history.splice(existing, 1);
            this._history.unshift(text);
            this._trim();
            this._render();
        });
    }

    _trim() {
        const max = this._settings.get_int('clipboard-history-size');
        this._history.length = Math.min(this._history.length, max);
    }

    _render() {
        if (!this._menu?.isOpen)
            return;

        this._list.removeAll();
        this._items = [];

        const query = this._search.get_text().toLowerCase();
        const matches = this._history.filter(text => text.toLowerCase().includes(query));

        if (matches.length === 0) {
            const empty = new PopupMenu.PopupMenuItem(
                this._history.length ? 'No matches' : 'Nothing copied yet',
                {reactive: false, can_focus: false});
            this._list.addMenuItem(empty);
            return;
        }

        for (const text of matches) {
            const item = this._buildItem(text);
            this._items.push(item);
            this._list.addMenuItem(item);
        }
    }

    _buildItem(text) {
        const item = new PopupMenu.PopupMenuItem(preview(text));
        item.label.add_style_class_name('shellsense-clipboard-label');
        item.label.x_expand = true;

        if (COLOR_RE.test(text.trim())) {
            const swatch = new St.Widget({
                style_class: 'shellsense-clipboard-swatch',
                style: `background-color: ${text.trim()};`,
                y_align: Clutter.ActorAlign.CENTER,
            });
            item.insert_child_below(swatch, item.label);
        }

        const remove = new St.Button({
            style_class: 'shellsense-clipboard-remove',
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 14}),
            y_align: Clutter.ActorAlign.CENTER,
            can_focus: false,
        });
        remove.connect('clicked', () => this._remove(text));
        item.add_child(remove);

        item.connect('activate', () => this._select(text));
        item.connect('key-focus-in', () => ensureActorVisibleInScrollView(this._scroll, item));
        item.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() !== Clutter.KEY_Delete)
                return Clutter.EVENT_PROPAGATE;
            this._remove(text);
            return Clutter.EVENT_STOP;
        });

        return item;
    }

    _onSearchKey(event) {
        const key = event.get_key_symbol();
        const [first] = this._items;

        if (key === Clutter.KEY_Down && first) {
            first.grab_key_focus();
            return Clutter.EVENT_STOP;
        }
        if ((key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) && first) {
            first.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _remove(text) {
        const i = this._history.indexOf(text);
        if (i >= 0)
            this._history.splice(i, 1);
        this._render();
        global.stage.set_key_focus(this._search);
    }

    _select(text) {
        this._menu.close();
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
        // Terminals paste PRIMARY on Shift+Insert, so set both.
        this._clipboard.set_text(St.ClipboardType.PRIMARY, text);

        if (!this._settings.get_boolean('clipboard-paste-on-select'))
            return;

        // Give focus time to return to the window before pasting into it.
        if (this._pasteId)
            GLib.source_remove(this._pasteId);
        this._pasteId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            this._pasteId = 0;
            this._sendPaste();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Shift+Insert pastes in GTK, Qt, browsers and terminals alike,
    // unlike Ctrl+V which terminals don't handle.
    _sendPaste() {
        this._virtualKeyboard ??= Clutter.get_default_backend().get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

        const kb = this._virtualKeyboard;
        const time = GLib.get_monotonic_time();
        kb.notify_keyval(time, Clutter.KEY_Shift_L, Clutter.KeyState.PRESSED);
        kb.notify_keyval(time, Clutter.KEY_Insert, Clutter.KeyState.PRESSED);
        kb.notify_keyval(time, Clutter.KEY_Insert, Clutter.KeyState.RELEASED);
        kb.notify_keyval(time, Clutter.KEY_Shift_L, Clutter.KeyState.RELEASED);
    }
}
