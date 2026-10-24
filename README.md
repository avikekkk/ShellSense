# ShellSense

Small everyday tools for the GNOME desktop, bundled in one extension. Every
tool has its own on/off switch in the preferences.

> **Built for Zorin OS 18 (Wayland).**
> ShellSense was designed for and tested only on **Zorin OS 18.1**
> (Ubuntu 24.04 base) with **GNOME Shell 46** in a **Wayland** session,
> alongside the extensions Zorin ships (Dash to Dock, Zorin AppIndicator,
> Zorin Desktop Icons, Zorin Tiling Shell). It should work on other distributions
> running GNOME Shell 46, but that hasn't been tested. X11 sessions and other
> GNOME versions are untested and not supported.

## Features

| Tool | What it does |
| --- | --- |
| **Internet speed** | Live download/upload speed in the top bar. Choose what to show (down, up, both, combined), bits or bytes, refresh rate, and where it sits in the top bar. Can hide itself when there's no traffic. |
| **Clipboard history** | Searchable list of text you've copied, opened with a shortcut at the mouse pointer. Picking an entry copies it and pastes it into the focused window. Colors show a swatch. |
| **Color picker** | Press <kbd>Alt</kbd>+<kbd>P</kbd>, click anywhere on screen, and the color is copied as `#rrggbb` or `rgb(r, g, b)`. <kbd>Esc</kbd> cancels. |
| **Caffeine** | Quick Settings toggle that keeps the screen on and stops suspend, either until turned off or for 15 min – 2 h. The active choice is ticked. |
| **App grid** | Keeps the app grid in alphabetical order (folders mixed in, first, or last) and shows long app names on two lines. |
| **Top bar** | Hides the Activities (workspace) button, so the top-left is free, e.g. for the speed meter. The overview still opens with <kbd>Super</kbd> or the hot corner. |

### Clipboard history and privacy

- Only text is recorded. It is kept **in memory only**: never written to
  disk, never sent anywhere, and cleared when you log out or turn the tool off.
- Entries that password managers mark as secret (e.g. KeePassXC) are skipped.
- It keeps recording while the screen is locked, so locking doesn't wipe the
  history. While locked, its popup and shortcut are removed and every other
  tool is stopped.
- There is **no default shortcut** (extensions.gnome.org rules). Set one in
  *Preferences → Clipboard History → Shortcut*, for example <kbd>Alt</kbd>+<kbd>C</kbd>.

In the popup: type to search, <kbd>↓</kbd> to move into the list,
<kbd>Enter</kbd> to pick, <kbd>Delete</kbd> to remove an entry, <kbd>Esc</kbd>
to close. Auto-paste sends <kbd>Shift</kbd>+<kbd>Insert</kbd>, which works in
GTK and Qt apps, browsers and terminals; turn it off in the preferences to
only copy.

## Install

### From source (current user)

```sh
git clone https://github.com/avikekkk/ShellSense.git
cd ShellSense
./install.sh
```

Log out and back in (required on Wayland), then:

```sh
gnome-extensions enable shellsense@avisek
```

`install.sh` symlinks the folder into `~/.local/share/gnome-shell/extensions/`,
so later `git pull`s only need another log out / log in.

### For all users on the machine

```sh
sudo bash install-system.sh
```

This copies the extension to `/usr/share/gnome-shell/extensions/`. Each user
then logs out and back in and runs `gnome-extensions enable shellsense@avisek`
once. Run it again after every update.

### Preferences

```sh
gnome-extensions prefs shellsense@avisek
```

or open it from the Extensions app / Extension Manager.

## Development

- `./test-nested.sh` starts a nested GNOME Shell in a window, to try changes
  without logging out. Logs print to the terminal.
- Logs from the real session:
  `journalctl -b -o cat /usr/bin/gnome-shell | grep ShellSense`
- `./pack.sh` builds the zip for extensions.gnome.org into `dist/`.

Each tool lives in `tools/` with a matching preferences group in `prefs/`;
`tools/registry.js` lists them. A tool is a class whose constructor sets it up
and whose `destroy()` undoes everything.

## Credits

Alphabetical app grid sorting is based on
[Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension)
by Stuart Hayhurst (GPL-3.0).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
