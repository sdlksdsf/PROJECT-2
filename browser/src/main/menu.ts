import { Menu, app, shell, type MenuItemConstructorOptions } from 'electron';
import { APP_HOMEPAGE, APP_REPO } from '../shared/defaults';
import type { InternalPage } from '../shared/types';

export interface MenuActions {
  newTab: () => void;
  newWindow: () => void;
  newIncognito: () => void;
  openPage: (page: InternalPage) => void;
  shortcut: (action: string) => void;
  openExternal: (url: string) => void;
  quit: () => void;
}

/**
 * The application menu is where every keyboard shortcut lives, which keeps
 * shortcuts discoverable and consistent on Windows, Linux and macOS.
 */
export function buildMenu(actions: MenuActions): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Kimmino',
            submenu: [
              { label: 'About Kimmino', click: () => actions.openPage('about') },
              { type: 'separator' as const },
              { label: 'Settings…', accelerator: 'Cmd+,', click: () => actions.openPage('settings') },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { type: 'separator' as const },
              { label: 'Quit Kimmino', accelerator: 'Cmd+Q', click: () => actions.quit() }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New tab', accelerator: 'CmdOrCtrl+T', click: actions.newTab },
        { label: 'Close tab', accelerator: 'CmdOrCtrl+W', click: () => actions.shortcut('close-tab') },
        { label: 'New window', accelerator: 'CmdOrCtrl+N', click: actions.newWindow },
        { label: 'New private window', accelerator: 'CmdOrCtrl+Shift+N', click: actions.newIncognito },
        { type: 'separator' },
        { label: 'Import bookmarks & settings…', accelerator: 'CmdOrCtrl+Shift+I', click: () => actions.shortcut('import') },
        { label: 'Export data…', click: () => actions.shortcut('export-data') },
        { type: 'separator' },
        { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => actions.shortcut('print') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: 'Quit Kimmino', accelerator: 'CmdOrCtrl+Q', click: actions.quit }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find in page…', accelerator: 'CmdOrCtrl+F', click: () => actions.shortcut('find') },
        { label: 'Find next', accelerator: 'CmdOrCtrl+G', click: () => actions.shortcut('find-next') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => actions.shortcut('reload') },
        { label: 'Force reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => actions.shortcut('hard-reload') },
        { label: 'Stop loading', accelerator: 'Esc', click: () => actions.shortcut('stop') },
        { type: 'separator' },
        { label: 'Zoom in', accelerator: 'CmdOrCtrl+Plus', click: () => actions.shortcut('zoom-in') },
        { label: 'Zoom out', accelerator: 'CmdOrCtrl+-', click: () => actions.shortcut('zoom-out') },
        { label: 'Reset zoom', accelerator: 'CmdOrCtrl+0', click: () => actions.shortcut('zoom-reset') },
        { type: 'separator' },
        { label: 'Toggle full screen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', click: () => actions.shortcut('fullscreen') },
        { label: 'Toggle sidebar', accelerator: 'CmdOrCtrl+Shift+B', click: () => actions.shortcut('toggle-sidebar') },
        { label: 'Toggle vertical tabs', accelerator: 'CmdOrCtrl+Alt+V', click: () => actions.shortcut('toggle-vertical-tabs') },
        { type: 'separator' },
        { label: 'Developer tools', accelerator: 'F12', click: () => actions.shortcut('devtools') }
      ]
    },
    {
      label: 'Workspace',
      submenu: [
        { label: 'Split view', accelerator: 'CmdOrCtrl+Alt+S', click: () => actions.shortcut('split') },
        { label: 'Screenshot → visible area', accelerator: 'CmdOrCtrl+Shift+S', click: () => actions.shortcut('screenshot') },
        { label: 'Screenshot → full page', accelerator: 'CmdOrCtrl+Alt+Shift+S', click: () => actions.shortcut('screenshot-full') },
        { label: 'Screenshot → select area', accelerator: 'CmdOrCtrl+Alt+4', click: () => actions.shortcut('screenshot-selection') },
        { type: 'separator' },
        { label: 'Focus mode', accelerator: 'CmdOrCtrl+Shift+F', click: () => actions.shortcut('focus') },
        { label: 'AI assistant', accelerator: 'CmdOrCtrl+Shift+A', click: () => actions.shortcut('ai') },
        { label: 'Kimmino AI: summarise page', accelerator: 'CmdOrCtrl+Shift+U', click: () => actions.shortcut('ai-summarize') },
        { type: 'separator' },
        { label: 'Bookmark this page', accelerator: 'CmdOrCtrl+D', click: () => actions.shortcut('bookmark') },
        { label: 'Open bookmarks', accelerator: 'CmdOrCtrl+Shift+O', click: () => actions.openPage('bookmarks') },
        { label: 'Open history', accelerator: 'CmdOrCtrl+H', click: () => actions.openPage('history') },
        { label: 'Open downloads', accelerator: 'CmdOrCtrl+J', click: () => actions.openPage('downloads') },
        { label: 'Open extensions', click: () => actions.openPage('extensions') },
        { label: 'Open themes', click: () => actions.openPage('themes') }
      ]
    },
    {
      label: 'Tabs',
      submenu: [
        { label: 'Focus address bar', accelerator: 'CmdOrCtrl+L', click: () => actions.shortcut('focus-omnibox') },
        { label: 'Next tab', accelerator: 'Ctrl+Tab', click: () => actions.shortcut('next-tab') },
        { label: 'Previous tab', accelerator: 'Ctrl+Shift+Tab', click: () => actions.shortcut('prev-tab') },
        { label: 'Reopen closed tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => actions.shortcut('reopen-tab') },
        { label: 'Duplicate tab', click: () => actions.shortcut('duplicate-tab') },
        { type: 'separator' },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
          label: `Tab ${n}`,
          accelerator: `CmdOrCtrl+${n}`,
          click: () => actions.shortcut(`tab-${n}`)
        })),
        { label: 'Last tab', accelerator: 'CmdOrCtrl+9', click: () => actions.shortcut('tab-9') }
      ]
    },
    {
      label: 'Privacy',
      submenu: [
        { label: 'Privacy dashboard', click: () => actions.shortcut('privacy-dashboard') },
        { label: 'Clear browsing data…', accelerator: 'CmdOrCtrl+Shift+Del', click: () => actions.shortcut('clear-data') },
        { type: 'separator' },
        { label: 'Privacy policy', click: () => actions.openExternal(`${APP_HOMEPAGE}/privacy`) },
        { label: 'Report a security issue', click: () => actions.openExternal(`${APP_REPO}/security/policy`) }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Kimmino settings', accelerator: 'CmdOrCtrl+,', click: () => actions.openPage('settings') },
        { label: 'Keyboard shortcuts', click: () => actions.shortcut('shortcuts-help') },
        { type: 'separator' },
        { label: 'Kimmino website', click: () => actions.openExternal(APP_HOMEPAGE) },
        { label: 'Source code (GitHub)', click: () => actions.openExternal(APP_REPO) },
        { type: 'separator' },
        { label: 'About Kimmino', click: () => actions.openPage('about') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  void app;
  void shell;
  return menu;
}
