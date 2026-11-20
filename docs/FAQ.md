# Frequently asked questions

### Is Kimmino really free?

Yes. No paid tier, no feature gates, no ads in the interface, no upsell panels. There is no premium edition planned. If funding ever becomes necessary it will be donations and grants, stated openly.

### Why is it built on Chromium?

Compatibility. A browser that breaks your bank, your SSO or your government portal is not private — it is unusable. Forking the engine costs years of security work for very little privacy gain, because the privacy decisions that matter (network layer, permissions, fingerprints, defaults) live *around* the engine, not inside it.

### Does ad blocking break websites?

Occasionally, as with any blocker. Common breakage is handled by the allowlist, which keeps checkout, login, captcha and video-player domains working. When something still breaks, the shield menu pauses blocking for that site in one click. The exception is stored per profile and visible in Settings → Privacy → Site exceptions.

### Can Kimmino see my browsing history?

No. There is no server to send it to, and no client to send it. Sync only moves the categories you tick (bookmarks, preferences, dials) to a database you configure, and history is never one of them.

### Do I need an account?

No. Accounts only exist to sync data you explicitly choose.

### Can I use my Chrome extensions?

Most Manifest V2 extensions load from their unpacked folder. Manifest V3 service-worker extensions are partial — Kimmino labels them before you enable them. See [EXTENSIONS.md](EXTENSIONS.md) for the API support table and the honest reason there is no Chrome Web Store button.

### How do I get my bookmarks out of Chrome?

First-run wizard, or **Settings → Import**. Chrome, Edge, Firefox, Brave, Opera and Vivaldi profiles are detected automatically; Safari requires exporting a bookmarks HTML file first.

### Is there a mobile version?

Not yet. Bookmarks and dials sync, so a companion app is the natural next step; it is on the roadmap. There is nothing to install on Android or iOS today.

### Does it work with my password manager?

Extensions like Bitwarden, 1Password and KeePassXC load if their MV2 build is available. Kimmino's built-in password store exists for people who do not want an extension at all; it encrypts with the OS keychain and never syncs.

### How much RAM does it actually use?

Roughly 610 MB for thirty tabs with twenty-two frozen, versus about 1.5 GB for a typical Chromium profile. The interface is one renderer; the whole app measured about 1.45 GB working set with ten tabs open on Windows. Numbers depend on page content; Settings → Performance has the knobs.

### Is incognito really private?

It creates a profile that writes nothing to disk and uses a separate session partition; closing the window destroys it. It does not hide your traffic from your employer, your ISP or the sites you log into — no browser can. Kimmino's normal mode is already blocking what incognito mode in other browsers only pretends to.

### Why did the window open bigger than my screen?

It always opened at 1320×860, which does not fit a 1024×768 display — the close button and part of the sidebar ended up off screen. 1.1.2 opens maximised on displays of 1366×820 or smaller and sizes the window for the display everywhere else, then re-fits whenever the monitor layout or scaling changes. Press `Ctrl+Shift+M` to maximise on any build that is stuck, and `Ctrl+Shift+Alt+R` to recentre.

### Why does Windows warn about the installer?

Early builds are not code-signed. SmartScreen warns about every new publisher until reputation accumulates. Verify the SHA-256 checksum published with each release, or build from source. Code signing is on the roadmap.

### Can I use Kimmino at work?

Yes. Silent install, per-user or per-machine, a `--policy hardened` flag for fleet deployments, and no background services to conflict with management tooling. Enterprise policy templates are not yet shipped; open an issue if you need them.

### How do I report a bug or a vulnerability?

Bugs: [GitHub issues](https://github.com/sdlksdsf/PROJECT-2/issues). Vulnerabilities: private advisory, see [SECURITY.md](../SECURITY.md).

### What does "Early Bird" mean?

An opt-in channel in **Settings → About → Update channel**. It checks GitHub Releases for pre-release builds and installs them when you ask. Nothing updates automatically unless you enable it, and no update call is made when the feature is off.
