// Alphabetical app grid ordering.
// Based on Alphabetical App Grid by Stuart Hayhurst (GPL-3.0):
// https://github.com/stuarthayhurst/alphabetical-grid-extension

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';
import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

const compareNames = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

// Replacement for AppDisplay._redisplay(): place every icon in sorted order
// instead of at its saved position. Runs with `this` = the AppDisplay.
function redisplaySorted() {
    this._folderIcons.forEach(icon => icon.view._redisplay());

    const oldApps = this._orderedItems.slice();
    const oldIds = oldApps.map(icon => icon.id);

    const newApps = this._loadApps().sort(this._compareItems.bind(this));
    const newIds = newApps.map(icon => icon.id);

    oldApps.filter(icon => !newIds.includes(icon.id)).forEach(icon => {
        this._removeItem(icon);
        icon.destroy();
    });

    const {itemsPerPage} = this._grid;
    newApps.forEach((icon, i) => {
        const page = Math.floor(i / itemsPerPage);
        const position = i % itemsPerPage;
        if (oldIds.includes(icon.id))
            this._moveItem(icon, page, position);
        else
            this._addItem(icon, page, position);
    });

    this._orderedItems = newApps;
    this.emit('view-loaded');
}

export class AppGridSortTool {
    constructor(extension, settings) {
        this._settings = settings;
        this._controls = Main.overview._overview._controls;
        this._appDisplay = this._controls._appDisplay;
        this._appSystem = Shell.AppSystem.get_default();
        this._shellSettings = new Gio.Settings({schema_id: 'org.gnome.shell'});
        this._folderSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.app-folders'});
        this._injections = new InjectionManager();
        this._busy = false;
        this._timeoutId = 0;

        this._patchShell();
        this._connectListeners();
        this._reorder();
    }

    destroy() {
        for (const obj of [this._settings, this._shellSettings, this._folderSettings,
            this._appSystem, Main.overview, this._controls._stateAdjustment])
            obj.disconnectObject(this);

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._injections.clear();
        this._injections = null;

        // Go back to GNOME's own saved layout.
        this._appDisplay._redisplay();

        this._settings = null;
        this._shellSettings = null;
        this._folderSettings = null;
    }

    _patchShell() {
        const tool = this;
        this._injections.overrideMethod(AppDisplay.AppDisplay.prototype, '_compareItems',
            () => function (a, b) {
                return tool._compareItems(a, b);
            });
        this._injections.overrideMethod(AppDisplay.AppDisplay.prototype, '_redisplay',
            () => redisplaySorted);
    }

    _compareItems(a, b) {
        const folderPosition = this._settings.get_string('app-grid-sort-folders');
        if (folderPosition === 'alphabetical')
            return compareNames(a.name, b.name);

        const folders = this._folderSettings.get_strv('folder-children');
        const aIsFolder = folders.includes(a.id);
        const bIsFolder = folders.includes(b.id);
        if (aIsFolder === bIsFolder)
            return compareNames(a.name, b.name);

        // Exactly one is a folder: put it at the start or the end.
        return (folderPosition === 'start') === aIsFolder ? -1 : 1;
    }

    _connectListeners() {
        const reorder = () => this._reorder();

        this._shellSettings.connectObject(
            'changed::app-picker-layout', reorder,
            'changed::favorite-apps', reorder,
            this);
        this._folderSettings.connectObject('changed::folder-children', reorder, this);
        this._appSystem.connectObject('installed-changed', reorder, this);
        Main.overview.connectObject('item-drag-end', reorder, this);
        this._settings.connectObject(
            'changed::app-grid-sort-folders', reorder,
            'changed::app-grid-sort-folder-contents', reorder,
            this);

        this._controls._stateAdjustment.connectObject('notify::value', () => {
            if (this._controls._stateAdjustment.value === OverviewControls.ControlsState.APP_GRID)
                this._reorder();
        }, this);
    }

    _reorder() {
        if (this._busy || this._appDisplay._pageManager._updatingPages)
            return;
        this._busy = true;

        if (this._settings.get_boolean('app-grid-sort-folder-contents'))
            this._sortFolderContents();

        // Short delay so we don't clash with grid animations.
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._appDisplay._redisplay();
            this._busy = false;
            this._timeoutId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    // Folder contents are stored in GSettings, so sort them there.
    _sortFolderContents() {
        for (const folder of this._folderSettings.get_strv('folder-children')) {
            const folderSettings = Gio.Settings.new_with_path(
                'org.gnome.desktop.app-folders.folder',
                `/org/gnome/desktop/app-folders/folders/${folder}/`);

            const apps = folderSettings.get_strv('apps');
            const nameOf = id => this._appSystem.lookup_app(id)?.get_name() ?? id;
            const sorted = [...apps].sort((a, b) => compareNames(nameOf(a), nameOf(b)));

            if (String(sorted) !== String(apps) && folderSettings.is_writable('apps'))
                folderSettings.set_strv('apps', sorted);
        }

        this._appDisplay._folderIcons.forEach(icon => icon.view._redisplay());
    }
}
