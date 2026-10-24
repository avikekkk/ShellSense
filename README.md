# ShellSense

I made this extension for my own desktop. It puts a few small tools I use every day in one place, and each one can be switched off in the preferences.

I use it on Zorin OS 18.1 with GNOME Shell 46 on Wayland. That's the only setup I've tested it on.

## What's in it

- Internet speed in the top bar
- Clipboard history that opens at the mouse pointer. Set its shortcut in the preferences (I use Alt+C).
- A color picker on Alt+P that copies the color as hex or rgb
- A Caffeine toggle in Quick Settings to keep the screen awake
- An alphabetical app grid where long app names wrap onto two lines
- An option to hide the Activities button

The clipboard history only keeps text, and only in memory. It never touches the disk and is gone when you log out.

## Install

```sh
git clone https://github.com/avikekkk/ShellSense.git
cd ShellSense
./install.sh
```

Log out and back in, then run `gnome-extensions enable shellsense@avisek`.

If more than one person uses the computer, `sudo bash install-system.sh` installs it for everyone.

## Credits

The app grid sorting is based on [Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension) by Stuart Hayhurst.

## License

GPL-3.0-or-later
