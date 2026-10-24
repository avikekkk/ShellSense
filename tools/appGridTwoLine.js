// Show up to two lines of the app name in the app grid instead of one.
// Hovering still expands to the full name, as GNOME normally does.

import Pango from 'gi://Pango';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

// Caps the label height (see stylesheet.css); Clutter then ellipsizes the
// wrapped text at the end of the last line that fits.
const STYLE_CLASS = 'shellsense-two-line-label';

// Only app grid / folder icons; skips dash and search result icons.
function isGridItem(item) {
    return item._expandTitleOnHover && item.icon?.label;
}

// Runs inside GNOME's own icon code, so never let an error escape and
// break the app grid - worst case the name stays on one line.
function setTwoLine(item) {
    try {
        const {label} = item.icon;
        label.add_style_class_name(STYLE_CLASS);
        label.clutter_text.set({
            line_wrap: true,
            line_wrap_mode: Pango.WrapMode.WORD_CHAR,
            ellipsize: Pango.EllipsizeMode.END,
        });
    } catch (e) {
        console.error(`[ShellSense] two-line names: ${e}`);
    }
}

function setOneLine(item) {
    const {label} = item.icon;
    label.remove_style_class_name(STYLE_CLASS);
    label.clutter_text.set({
        line_wrap: false,
        line_wrap_mode: Pango.WrapMode.WORD,
        ellipsize: Pango.EllipsizeMode.END,
    });
}

function forEachGridItem(fn) {
    const appDisplay = Main.overview._overview._controls._appDisplay;
    const items = [...appDisplay._orderedItems];
    for (const folder of appDisplay._folderIcons)
        items.push(...folder.view._orderedItems);

    for (const item of items) {
        if (isGridItem(item))
            fn(item);
    }
}

export class AppGridTwoLineTool {
    constructor() {
        this._injections = new InjectionManager();

        // New icons: switch to two lines right after they are built.
        for (const cls of [AppDisplay.AppIcon, AppDisplay.FolderIcon]) {
            this._injections.overrideMethod(cls.prototype, '_init', original => function (...args) {
                original.apply(this, args);
                if (isGridItem(this))
                    setTwoLine(this);
            });
        }

        // Hover/focus: GNOME toggles between one line and full name;
        // collapse back to two lines instead of one.
        this._injections.overrideMethod(AppDisplay.AppViewItem.prototype, '_updateMultiline',
            original => function () {
                if (!isGridItem(this))
                    return original.call(this);

                const expand = this._forcedHighlight || this.hover || this.has_key_focus();
                if (expand)
                    this.icon.label.remove_style_class_name(STYLE_CLASS);
                original.call(this);
                if (!expand)
                    setTwoLine(this);
                return undefined;
            });

        forEachGridItem(setTwoLine);
    }

    destroy() {
        this._injections.clear();
        this._injections = null;
        forEachGridItem(setOneLine);
    }
}
