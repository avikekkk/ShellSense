import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {addToPanel, readText} from './util.js';

// Virtual / tunnel interfaces. Skipping these avoids counting the same
// traffic twice (e.g. VPN tunnel + the physical interface under it).
const IGNORED_IFACES = /^(lo|veth|docker|br-|virbr|vnet|tun|tap|wg|tailscale|zt)/;

function readCounters() {
    let rx = 0, tx = 0;

    // First two lines are headers.
    for (const line of readText('/proc/net/dev').split('\n').slice(2)) {
        const sep = line.indexOf(':');
        if (sep < 0)
            continue;
        const iface = line.slice(0, sep).trim();
        if (IGNORED_IFACES.test(iface))
            continue;
        const fields = line.slice(sep + 1).trim().split(/\s+/);
        rx += Number(fields[0]);
        tx += Number(fields[8]);
    }

    return {rx, tx, time: GLib.get_monotonic_time()};
}

function formatSpeed(bytesPerSec, useBits) {
    const units = useBits
        ? ['b/s', 'Kb/s', 'Mb/s', 'Gb/s']
        : ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const base = useBits ? 1000 : 1024;
    let value = useBits ? bytesPerSec * 8 : bytesPerSec;
    let i = 0;

    while (value >= base && i < units.length - 1) {
        value /= base;
        i++;
    }

    const digits = i === 0 || value >= 100 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[i]}`;
}

export class NetSpeedTool {
    constructor(extension, settings) {
        this._extension = extension;
        this._settings = settings;
        this._timerId = 0;
        this._last = null;
        this._down = 0;
        this._up = 0;

        this._buildIndicator();

        this._settingIds = [
            settings.connect('changed::net-speed-position', () => this._rebuildIndicator()),
            settings.connect('changed::net-speed-index', () => this._rebuildIndicator()),
            settings.connect('changed::net-speed-interval', () => this._restartTimer()),
            settings.connect('changed::net-speed-display', () => this._render()),
            settings.connect('changed::net-speed-use-bits', () => this._render()),
            settings.connect('changed::net-speed-hide-idle', () => this._render()),
        ];

        this._restartTimer();
    }

    destroy() {
        for (const id of this._settingIds)
            this._settings.disconnect(id);
        this._settingIds = null;

        this._stopTimer();
        this._indicator?.destroy();
        this._indicator = null;
        this._label = null;
        this._settings = null;
        this._extension = null;
    }

    _buildIndicator() {
        // dontCreateMenu = true: plain panel button, no dropdown (yet).
        this._indicator = new PanelMenu.Button(0.0, 'Internet Speed', true);
        this._indicator.add_style_class_name('shellsense-panel-button');
        this._label = new St.Label({
            text: '…',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'shellsense-netspeed-label',
        });
        this._indicator.add_child(this._label);

        addToPanel(this._extension, this._settings, 'net-speed', this._indicator);

        this._render();
    }

    _rebuildIndicator() {
        this._indicator?.destroy();
        this._buildIndicator();
    }

    _restartTimer() {
        this._stopTimer();
        this._last = null;
        this._tick();

        const intervalMs = Math.round(this._settings.get_double('net-speed-interval') * 1000);
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
    }

    _tick() {
        let now;
        try {
            now = readCounters();
        } catch (e) {
            console.error(`[ShellSense] net-speed: ${e}`);
            return;
        }

        if (this._last) {
            const seconds = (now.time - this._last.time) / 1e6;
            if (seconds > 0) {
                // Counters can reset (interface reconnect) - never show negatives.
                this._down = Math.max(0, (now.rx - this._last.rx) / seconds);
                this._up = Math.max(0, (now.tx - this._last.tx) / seconds);
            }
        }
        this._last = now;
        this._render();
    }

    _render() {
        if (!this._label)
            return;

        const useBits = this._settings.get_boolean('net-speed-use-bits');
        const fmt = v => formatSpeed(v, useBits);

        switch (this._settings.get_string('net-speed-display')) {
        case 'down':
            this._label.text = `↓ ${fmt(this._down)}`;
            break;
        case 'up':
            this._label.text = `↑ ${fmt(this._up)}`;
            break;
        case 'total':
            this._label.text = `⇅ ${fmt(this._down + this._up)}`;
            break;
        default:
            this._label.text = `↓ ${fmt(this._down)}  ↑ ${fmt(this._up)}`;
        }

        const idle = this._down < 1 && this._up < 1;
        this._indicator.visible = !(idle && this._settings.get_boolean('net-speed-hide-idle'));
    }
}
