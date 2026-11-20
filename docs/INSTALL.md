# Installing Kimmino

Kimmino ships one installer per platform. Nothing runs in the background after installation, no driver or service is added, and the uninstaller removes the application — only your profile folder is left behind, on purpose, so you can reinstall without losing bookmarks.

- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)
- [Verifying your download](#verifying-your-download)
- [First run](#first-run)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)

---

## Windows

**Requirements:** Windows 10 1809 or newer (Windows 11 supported), 64-bit x64 or ARM64, 4 GB RAM, 300 MB free disk.

1. Download `Kimmino-1.1.3-win-x64.exe` (or `-win-arm64.exe` on a Snapdragon/ARM device) from [Releases](https://github.com/sdlksdsf/PROJECT-2/releases/latest).
2. Run it. Because early builds are not yet code-signed, SmartScreen may show **"Windows protected your PC"**.
   - Click **More info**, then **Run anyway**.
   - If you prefer certainty, follow [verifying your download](#verifying-your-download) first.
3. The installer is built with NSIS and is **per-user by default**, so it does not ask for administrator rights and installs to:

   ```
   %LOCALAPPDATA%\Programs\Kimmino
   ```

   You can change the directory on the second page. The installer also creates a Start-menu entry, an optional desktop shortcut, and registers itself in *Apps & features*.
4. Choose whether to launch Kimmino at the end of setup.

The installer includes the standard NSIS options: custom directory, shortcut selection, uninstaller registration, and a `--silent` switch for managed deployments (`Kimmino-Setup.exe /S /D=C:\Apps\Kimmino`).

### Setting Kimmino as the default browser

Kimmino asks once on first launch. Windows will open **Settings → Apps → Default apps**; select **Kimmino** and confirm for HTTP/HTTPS, `.htm` and `.html`. Windows deliberately prevents apps from claiming this silently — the prompt is Windows', not ours.

### Managed / fleet installs

```powershell
# silent install for all users of a machine
Kimmino-1.1.3-win-x64.exe /S /D="C:\Program Files\Kimmino"

# pre-seed a hardened profile
kimmino.exe --profile fleet --policy hardened
```

Per-machine installs work but are not the default because they need elevation; the privacy defaults, filter bundle and update behaviour are identical either way.

---

## macOS

**Requirements:** macOS 12 Monterey or newer, Apple silicon or Intel, 300 MB free disk.

1. Download `Kimmino-1.1.3-mac-arm64.dmg` (Apple silicon) or `Kimmino-1.1.3-mac-x64.dmg` (Intel).
2. Open the image and drag **Kimmino** into **Applications**.
3. Launch it from Applications. If macOS says the app cannot be opened because the developer cannot be verified, right-click the app → **Open** → **Open** once. This is Gatekeeper's standard behaviour for unnotarised builds — CI produces unsigned installers, and signing certificates are not part of this release.

Terminal alternative to clear the quarantine flag on a local build:

```bash
xattr -dr com.apple.quarantine /Applications/Kimmino.app
```

---

## Linux

**Requirements:** glibc 2.31+, x86_64 (arm64 AppImage also published), 300 MB free disk.

### AppImage (portable, recommended)

```bash
chmod +x Kimmino-1.1.3-linux-x86_64.AppImage
./Kimmino-1.1.3-linux-x86_64.AppImage
```

Optional desktop integration:

```bash
./Kimmino-1.1.3-linux-x86_64.AppImage --appimage-extract
sudo mv squashfs-root /opt/kimmino
sudo ln -s /opt/kimmino/AppRun /usr/local/bin/kimmino
```

### Debian / Ubuntu (.deb)

```bash
sudo apt install ./kimmino_1.1.3_amd64.deb
```

The package installs to `/opt/Kimmino`, adds a launcher in the *Internet* category, and registers `x-scheme-handler/http` and `https` with `update-alternatives`.

### Wayland

Kimmino runs under XWayland by default. For native Wayland, including fractional scaling:

```bash
kimmino --ozone-platform=wayland
```

### Sandbox note

On distributions where unprivileged user namespaces are restricted (some hardened kernels, Ubuntu 24.04+ with AppArmor restrictions), Chromium's sandbox cannot initialise. Either enable user namespaces:

```bash
sudo sysctl -w kernel.unprivileged_userns_clone=1
```

or run with `--no-sandbox` (reduces renderer isolation; prefer the setting above).

---

## Verifying your download

Every release publishes `SHA256SUMS.txt` alongside the binaries.

**Windows (PowerShell):**

```powershell
Get-FileHash .\Kimmino-1.1.3-win-x64.exe -Algorithm SHA256
```

**macOS / Linux:**

```bash
shasum -a 256 Kimmino-1.1.3-*.dmg
sha256sum Kimmino-1.1.3-linux-x86_64.AppImage
```

Compare the output with the matching line in the release's `SHA256SUMS.txt`. If it does not match, delete the file and download again — do not run it.

You can also build the exact same installer yourself from the tagged commit; see [BUILD.md](BUILD.md).

---

## First run

1. **Profile chooser** — create a profile (or several). Each profile is a completely separate browser: its own cookies, history, extensions, theme and settings.
2. **Import** — Kimmino detects installed browsers and offers bookmarks, history, passwords and preferences. You can import later from **Settings → Import**.
3. **Default browser prompt** — one prompt on first launch, then never again unless you ask.
4. **Nothing else.** No account, no tour carousel, no newsletter modal, no "recommended extensions" panel.

---

## Uninstalling

- **Windows:** Settings → Apps → Installed apps → Kimmino → Uninstall, or run `%LOCALAPPDATA%\Programs\Kimmino\Uninstall Kimmino.exe`.
- **macOS:** drag Kimmino from Applications to the Bin.
- **Linux:** `sudo apt remove kimmino` (deb) or delete the AppImage.

Your profile (bookmarks, settings, history) lives in:

| Platform | Path |
| :--- | :--- |
| Windows | `%APPDATA%\Kimmino` |
| macOS | `~/Library/Application Support/Kimmino` |
| Linux | `~/.config/Kimmino` |

Delete that folder to remove every trace. To erase browsing data but keep your profile, use **Settings → Privacy → Erase browsing data**.

---

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| SmartScreen blocks the installer | More info → Run anyway, after verifying the checksum |
| Blank window after an update | Delete `Cache` inside the profile folder, then relaunch |
| A site misbehaves | Shield menu in the omnibox → *Pause on this site*; the exception is per profile and removable in Settings |
| Extensions do not load | Chromium extensions must be unpacked folders containing `manifest.json`; MV3 service-worker extensions are partial — see [EXTENSIONS.md](EXTENSIONS.md) |
| High memory with many tabs | Settings → Performance → lower the freeze delay, enable Game mode |
| Linux sandbox error | See [Sandbox note](#sandbox-note) |
| Nothing happens when you launch it | See [The app does not open](#the-app-does-not-open) — Kimmino writes `startup.log` for exactly this case |
| The window is bigger than the screen, so the buttons are missing | Press `Ctrl+Shift+M` to maximise (the window manager always fits a maximised window) or `Ctrl+Shift+Alt+R` to recentre. Settings → About → *Fit to screen*, Settings → Appearance → *Reset window* and `Kimmino --reset-window` do the same thing. 1.1.3 and later open the first window maximised, so it is always exactly the screen |
| Anything else | Open an [issue](https://github.com/sdlksdsf/PROJECT-2/issues) with your OS, the version shown in Settings → About, and `startup.log` if the app did not open |

### The window does not fit the screen

Before 1.1.1 the window always opened at 1320×860. On a 1024×768 screen that pushed the close button, the right end of the tab strip and the bottom of the sidebar off screen, and no amount of dragging helped — there was no position where the window fitted.

From 1.1.1 the window is sized and centred for the display it opens on, remembers that geometry, and re-fits itself when a monitor is added, removed or resized. From 1.1.3 the **first** window after an install or an update opens maximised, and geometry saved by 1.1.3+ is reused afterwards. A maximised window is fitted by the window manager, which stays correct even when the display reports the wrong size (scaling, virtualised DPI, a stale monitor list) — the one thing the app cannot verify for itself. Windows of 1366×820 or smaller keep opening maximised after that too. The renderer also reports its own viewport, and if the window turns out to be larger than the display it is told about, it asks to be maximised rather than guessing a scale.

If an older build is stuck like that, snap it with `Win+←` / `Win+→`, or press `Ctrl+Shift+M` on 1.1.1+, so the controls come back — then update. `Ctrl+Shift+Alt+R` recentres the window, and starting the app with `--reset-window` forgets the saved geometry entirely. Settings → About now shows the window size, the work area, the display scale and the viewport the interface actually got, which is what a bug report about a cut-off interface needs.

### The app does not open

If double-clicking the app does nothing — no window, no error — it is almost always one of three things: an unsigned build blocked by the OS, a leftover process holding your profile, or a GPU driver crash. Work through this in order.

Kimmino never quits silently any more: if a launch cannot produce a window it either shows a native error box or writes the reason to `startup.log`. Both name the exact step that failed.

1. **Look for a leftover process holding the profile.** Kimmino allows one instance per profile, so a copy that is still running (from a crash, a force-quit, or an older build) makes every new launch quit immediately.

   ```powershell
   Get-Process Kimmino -ErrorAction SilentlyContinue | Select-Object Id, StartTime, Path
   Get-Process Kimmino -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

   ```bash
   # macOS / Linux
   pgrep -fl Kimmino && pkill -f Kimmino
   ```

   Then start Kimmino again. If the app detects a process that holds the profile without showing a window, it now offers **Restart Kimmino** — that option does the same thing for you.

2. **SmartScreen.** An unsigned build can be blocked before any code runs. Right-click the `.exe` → *Properties* → tick *Unblock* → *OK*, then run it again. On macOS, right-click the app → *Open* → *Open* once.
3. **Read `startup.log`.** Kimmino appends every boot step and every fatal error to a plain text file in its profile folder:
   - Windows: `%APPDATA%\Kimmino\startup.log`
   - macOS: `~/Library/Application Support/Kimmino/startup.log`
   - Linux: `~/.config/Kimmino/startup.log`

   It records the version, build commit, instance-lock decision, every window step and any fatal error — the last line names the exact step that died, and fatal errors also raise a native message box pointing at this file.
4. **Run it from a terminal** to see stderr directly: `"%LOCALAPPDATA%\Programs\Kimmino\Kimmino.exe"` (PowerShell), `open -a Kimmino` (macOS), or `./Kimmino-1.1.3-linux-x86_64.AppImage` (Linux).
5. **Try safe mode if the window never paints.** Some Windows 11 GPU drivers crash Chromium during startup:

   ```powershell
   & "$env:LOCALAPPDATA\Programs\Kimmino\Kimmino.exe" --safe-mode
   ```

   `--safe-mode` (or `KIMMINO_SAFE_MODE=1`) disables hardware acceleration for that launch. If it fixes the launch, turn acceleration off permanently in Settings → Performance.

6. **Antivirus / corporate policy.** Some endpoint tools quarantine unsigned installers silently; check quarantine history.
7. **Still stuck?** Open an [issue](https://github.com/sdlksdsf/PROJECT-2/issues) and attach `startup.log`.
