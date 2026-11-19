# Keyboard shortcuts

`Ctrl` on Windows/Linux, `⌘` on macOS. These are the accelerators bound in the application menu (`browser/src/main/menu.ts`) plus the ones the interface handles directly — so this page matches the build rather than an intention.

## Tabs

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/⌘ T` | New tab |
| `Ctrl/⌘ W` | Close tab |
| `Ctrl/⌘ Shift T` | Reopen the last closed tab |
| `Ctrl Tab` / `Ctrl Shift Tab` | Next / previous tab |
| `Ctrl/⌘ 1…8` | Jump to tab by position |
| `Ctrl/⌘ 9` | Last tab |
| `Ctrl/⌘ L` | Focus the address bar |

## Windows

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/⌘ N` | New window |
| `Ctrl/⌘ Shift N` | New private window |
| `Ctrl/⌘ Shift B` | Toggle the sidebar rail |
| `Ctrl/⌘ Alt V` | Toggle vertical tabs |
| `F11` (Windows/Linux) · `Ctrl ⌘ F` (macOS) | Full screen |
| `Ctrl/⌘ Q` | Quit Kimmino |

## Navigation

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/⌘ R` | Reload |
| `Ctrl/⌘ Shift R` | Force reload, ignoring cache |
| `Esc` | Stop loading, or close an overlay |
| `Ctrl/⌘ +` / `−` / `0` | Zoom in / out / reset |
| `Ctrl/⌘ F` | Find in page |
| `Ctrl/⌘ G` | Find next |
| `Ctrl/⌘ P` | Print |

## Privacy and data

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/⌘ Shift Del` | Erase browsing data |
| `Ctrl/⌘ H` | History |
| `Ctrl/⌘ J` | Downloads |
| `Ctrl/⌘ D` | Bookmark this page |
| `Ctrl/⌘ Shift O` | Bookmark manager |
| `Ctrl/⌘ Shift I` | Import bookmarks and settings from another browser |

## Tools

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/⌘ K` | Command palette (tabs, bookmarks, history, settings) |
| `Ctrl/⌘ Shift S` | Screenshot → visible area |
| `Ctrl/⌘ Alt Shift S` | Screenshot → full page |
| `Ctrl/⌘ Alt 4` | Screenshot → select area |
| `Ctrl/⌘ Alt S` | Split view with the next tab / unsplit |
| `Ctrl/⌘ Shift F` | Focus mode on / off |
| `Ctrl/⌘ Shift A` | AI assistant panel |
| `Ctrl/⌘ Shift U` | Summarise the current page |
| `F12` | Developer tools |
| `Ctrl/⌘ ,` | Settings |

## Address bar and search

| Key | Action |
| :--- | :--- |
| `Alt Enter` | Open the typed address in a new tab |
| `Ctrl/⌘ Enter` | Add `.com` and open |
| `Tab` | Move between suggestion groups (history → bookmarks → open tabs → search) |
| `↑` / `↓` | Move through suggestions |
| `Shift Del` | Remove the highlighted suggestion from history |

## Screenshots

| Action | Result |
| :--- | :--- |
| `Ctrl/⌘ Shift S` | Visible area → `Pictures/Kimmino/kimmino-2026-11-19-2114.png` |
| `Ctrl/⌘ Alt Shift S` | Full page, including the scrollable area |
| `Ctrl/⌘ Alt 4` | Drag a rectangle, copy to clipboard |

Format (PNG/JPEG), quality and destination are configurable in **Settings → Downloads → Screenshots**.

## Rebinding

**Settings → Shortcuts** lists every action with its current accelerator. Click one and press the new combination; conflicts are flagged before saving, and **Reset to defaults** restores the table above.

> Note for UI previews: when the interface runs in a browser (`npm run dev:ui`), only the renderer-handled shortcuts work — `Ctrl/⌘ K`, `L`, `F`, `Shift F`, `W`, `T`, `Shift T`, `D`. The rest live in the native menu.
