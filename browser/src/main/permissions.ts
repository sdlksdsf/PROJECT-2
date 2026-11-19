import type { Session } from 'electron';
import type { Preferences } from '../shared/types';

/**
 * Permission policy.
 *
 * Default posture: deny everything a website cannot justify. A short list of
 * permissions is silently refused *without* a prompt (they are pure
 * fingerprinting/abuse vectors); a few are allowed because refusing them breaks
 * normal browsing; the rest prompt the user once per origin.
 */
const ALWAYS_DENY = new Set([
  'geolocation',
  'midi',
  'midiSysex',
  'hid',
  'serial',
  'usb',
  'bluetooth',
  'idle-detection',
  'window-management',
  'speaker-selection',
  'storage-access',
  'top-level-storage-access',
  'display-capture',
  'background-sync',
  'keyboardLock',
  'pointerLock',
  'openExternal',
  'font-access',
  'local-network-access'
]);

const DEFAULT_ALLOW = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);

export interface PermissionHooks {
  /** Records a denied prompt so the UI can show "Kimmino blocked 3 requests". */
  onDenied?: (origin: string, permission: string) => void;
  /** Origins the user has explicitly allowed for camera/mic/notifications. */
  isTrusted?: (origin: string) => boolean;
}

export function configurePermissions(ses: Session, prefs: () => Preferences, hooks: PermissionHooks = {}): void {
  const trusted = (origin: string) => hooks.isTrusted?.(origin) ?? false;

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = safeOrigin(details?.requestingUrl ?? webContents?.getURL?.() ?? '');
    const privacy = prefs().privacy;

    if (ALWAYS_DENY.has(permission)) {
      hooks.onDenied?.(origin, permission);
      return callback(false);
    }

    switch (permission) {
      case 'notifications':
        if (privacy.blockNotifications || !trusted(origin)) {
          hooks.onDenied?.(origin, permission);
          return callback(false);
        }
        return callback(true);
      case 'media':
        if (privacy.blockCameraMic || !trusted(origin)) {
          hooks.onDenied?.(origin, permission);
          return callback(false);
        }
        return callback(true);
      case 'geolocation':
        // Double-check: even with a permissive profile we refuse.
        return callback(false);
      case 'clipboard-read':
        // Reading the clipboard is a classic data grab — only after explicit trust.
        return callback(trusted(origin));
      case 'fullscreen':
      case 'clipboard-sanitized-write':
      case 'persistent-storage':
        return callback(true);
      case 'openExternal':
        return callback(false);
      default:
        if (DEFAULT_ALLOW.has(permission)) return callback(true);
        // Unknown/new permission: deny until the user opts in site by site.
        hooks.onDenied?.(origin, permission);
        return callback(false);
    }
  });

  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    if (ALWAYS_DENY.has(permission)) return false;
    if (permission === 'notifications') return !prefs().privacy.blockNotifications && trusted(safeOrigin(requestingOrigin));
    if (permission === 'media') return !prefs().privacy.blockCameraMic && trusted(safeOrigin(requestingOrigin));
    return DEFAULT_ALLOW.has(permission);
  });

  // No HID/USB/serial device pairing from the web, ever.
  ses.setDevicePermissionHandler(() => false);

  // Blocks the "is there a screen/display connected" side channels.
  ses.setDisplayMediaRequestHandler?.((_request, callback) => {
    callback({ video: undefined as never, audio: undefined as never });
  });
}

export function safeOrigin(rawUrl: string): string {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return 'unknown';
  }
}
