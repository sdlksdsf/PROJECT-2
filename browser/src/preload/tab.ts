/**
 * Kimmino page shim.
 *
 * Runs inside every page *before* the site's own scripts. It applies the
 * fingerprinting defences, refuses location lookups, dismisses cookie banners,
 * optionally force-darkens pages and draws the focus shield. Everything here is
 * best-effort defence-in-depth: the authoritative decisions happen in the
 * network layer of the main process.
 */

interface ShimConfig {
  fingerprint: boolean;
  blockWebRTC: boolean;
  blockLocation: boolean;
  autoDeclineConsent: boolean;
  forceDark: boolean;
  videoEnhancer: boolean;
  language: string;
}

function readConfig(): ShimConfig {
  const fallback: ShimConfig = {
    fingerprint: true,
    blockWebRTC: true,
    blockLocation: true,
    autoDeclineConsent: true,
    forceDark: false,
    videoEnhancer: false,
    language: 'en-US'
  };
  try {
    const raw = process.argv.find((arg) => arg.startsWith('--kimmino-config='));
    if (!raw) return fallback;
    const json = decodeURIComponent(raw.slice('--kimmino-config='.length));
    return { ...fallback, ...(JSON.parse(json) as Partial<ShimConfig>) };
  } catch {
    return fallback;
  }
}

const config = readConfig();
const randomSeed = Math.floor(Math.random() * 1000) / 1000;

/* ------------------------------------------------------------------ */
/* Fingerprint hardening                                               */
/* ------------------------------------------------------------------ */

function hardenCanvas(): void {
  const noisy = (value: number): number => value + Math.round(randomSeed * 3) - 1;

  const patchGetImageData = () => {
    const original = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function patched(this: CanvasRenderingContext2D, ...args: [number, number, number, number]) {
      const data = original.apply(this, args);
      try {
        for (let i = 0; i < data.data.length; i += 4) {
          data.data[i] = Math.max(0, Math.min(255, noisy(data.data[i])));
          data.data[i + 1] = Math.max(0, Math.min(255, noisy(data.data[i + 1])));
        }
      } catch {
        /* ignore */
      }
      return data;
    } as typeof original;
  };

  const patchToDataUrl = () => {
    const originalUrl = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function patched(this: HTMLCanvasElement, ...args: [type?: string, quality?: number]) {
      try {
        const context = this.getContext('2d');
        if (context && this.width > 0 && this.height > 0) {
          const pixel = context.getImageData(0, 0, 1, 1);
          pixel.data[0] = Math.max(0, Math.min(255, noisy(pixel.data[0])));
          context.putImageData(pixel, 0, 0);
        }
      } catch {
        /* ignore */
      }
      return originalUrl.apply(this, args);
    } as typeof originalUrl;
  };

  try {
    patchGetImageData();
    patchToDataUrl();
  } catch {
    /* ignore */
  }
}

function hardenWebGL(): void {
  try {
    const proto = WebGLRenderingContext.prototype;
    const original = proto.getParameter;
    const spoof = (value: number): string => {
      if (value === 37445) return 'Kimmino';
      if (value === 37446) return 'Kimmino Graphics';
      return '';
    };
    proto.getParameter = function patched(this: WebGLRenderingContext, parameter: number) {
      const replacement = spoof(parameter);
      if (replacement) return replacement;
      return original.call(this, parameter);
    } as typeof original;
  } catch {
    /* ignore */
  }
}

function hardenAudio(): void {
  try {
    const proto = AnalyserNode.prototype;
    const original = proto.getFloatFrequencyData;
    proto.getFloatFrequencyData = function patched(this: AnalyserNode, array: Float32Array<ArrayBuffer>) {
      original.call(this, array);
      for (let i = 0; i < array.length; i += 1) array[i] += (randomSeed - 0.5) * 0.0001;
    } as typeof original;
  } catch {
    /* ignore */
  }
}

function hardenNavigator(): void {
  const define = (key: string, value: unknown) => {
    try {
      Object.defineProperty(Navigator.prototype, key, { get: () => value, configurable: true });
    } catch {
      /* ignore */
    }
  };
  define('hardwareConcurrency', 8);
  define('deviceMemory', 8);
  define('webdriver', false);
  define('maxTouchPoints', 0);
  define('doNotTrack', '1');
  define('languages', [config.language, config.language.split('-')[0]]);
  define('language', config.language);
  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5].map(() => ({ name: 'pdf-plugin', description: 'Portable Document Format' })),
      configurable: true
    });
  } catch {
    /* ignore */
  }
  if ('connection' in navigator) {
    try {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false }),
        configurable: true
      });
    } catch {
      /* ignore */
    }
  }
  if ('getBattery' in navigator) {
    try {
      (navigator as unknown as Record<string, unknown>).getBattery = undefined;
    } catch {
      /* ignore */
    }
  }
  if ('userAgentData' in navigator) {
    try {
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Kimmino', version: '1' },
            { brand: 'Chromium', version: '140' }
          ],
          mobile: false,
          platform: 'Unknown',
          getHighEntropyValues: async () => ({ platform: 'Unknown', architecture: '', model: '', uaFullVersion: '140.0.0.0' })
        }),
        configurable: true
      });
    } catch {
      /* ignore */
    }
  }
}

function hardenScreen(): void {
  try {
    const dims: Array<[string, number]> = [
      ['width', 1920],
      ['height', 1080],
      ['availWidth', 1920],
      ['availHeight', 1040],
      ['colorDepth', 24],
      ['pixelDepth', 24]
    ];
    for (const [key, value] of dims) {
      Object.defineProperty(Screen.prototype, key, { get: () => value, configurable: true });
    }
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1, configurable: true });
  } catch {
    /* ignore */
  }
}

function hardenTimezone(): void {
  try {
    const originalResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function patched(this: Intl.DateTimeFormat) {
      const options = originalResolved.call(this);
      return { ...options, timeZone: 'UTC' };
    } as typeof originalResolved;
    Date.prototype.getTimezoneOffset = function patched() {
      return 0;
    };
  } catch {
    /* ignore */
  }
}

function blockWebRTC(): void {
  try {
    const deny = function DeniedRTC() {
      throw new DOMException('WebRTC is disabled by Kimmino privacy settings.', 'NotAllowedError');
    };
    Object.defineProperty(window, 'RTCPeerConnection', { value: deny, configurable: true });
    Object.defineProperty(window, 'webkitRTCPeerConnection', { value: deny, configurable: true });
    Object.defineProperty(window, 'RTCDataChannel', { value: undefined, configurable: true });
  } catch {
    /* ignore */
  }
}

function blockLocation(): void {
  try {
    const fail = (success?: PositionCallback | null, error?: PositionErrorCallback | null) => {
      error?.({
        code: 1,
        message: 'Location access is blocked by Kimmino.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = fail as typeof navigator.geolocation.getCurrentPosition;
      navigator.geolocation.watchPosition = ((success: PositionCallback, error?: PositionErrorCallback) => {
        fail(success, error);
        return 0;
      }) as typeof navigator.geolocation.watchPosition;
    }
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const original = permissions.query.bind(permissions);
      permissions.query = (descriptor: PermissionDescriptor) => {
        if (['geolocation', 'camera', 'microphone', 'notifications', 'midi', 'background-sync'].includes(descriptor.name)) {
          return Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus);
        }
        return original(descriptor);
      };
    }
  } catch {
    /* ignore */
  }
}

function spoofColorScheme(): void {
  try {
    const original = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      if (query.includes('prefers-color-scheme: light')) {
        const list = original('(min-width: 0px)');
        Object.defineProperty(list, 'matches', { get: () => false });
        return list;
      }
      return original(query);
    }) as typeof window.matchMedia;
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Cookie / consent banners                                            */
/* ------------------------------------------------------------------ */

const CONSENT_SELECTORS = [
  '#onetrust-reject-all-handler',
  '#onetrust-accept-btn-handler ~ #onetrust-reject-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
  '#didomi-notice-disagree-button',
  'button[data-testid="uc-deny-all-button"]',
  'button[data-testid="reject-all-button"]',
  '.qc-cmp2-summary-buttons button[order="2"]',
  '#truste-consent-required',
  'button[aria-label="Reject all"]',
  'button[aria-label="Decline"]',
  '#gdpr-banner-decline',
  '.cc-btn.cc-deny',
  '#hs-eu-decline-button',
  'button.sp_choice_type_11'
];

const CONSENT_TEXT = /^(reject all|reject|decline|decline all|deny|deny all|only necessary|only essential|necessary only|refuse|disagree|no thanks)$/i;

function dismissConsent(): void {
  let attempts = 0;
  const tryClick = (): boolean => {
    for (const selector of CONSENT_SELECTORS) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element && isVisible(element)) {
        element.click();
        return true;
      }
    }
    const candidates = document.querySelectorAll<HTMLElement>(
      'button, a[role="button"], [role="button"], input[type="button"]'
    );
    for (const candidate of candidates) {
      const label = (candidate.innerText || candidate.getAttribute('aria-label') || '').trim();
      if (label.length <= 28 && CONSENT_TEXT.test(label) && isVisible(candidate)) {
        candidate.click();
        return true;
      }
    }
    return false;
  };

  const tick = () => {
    attempts += 1;
    if (tryClick() || attempts > 12) return;
    setTimeout(tick, 900);
  };
  setTimeout(tick, 600);
}

function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.opacity !== '0' && style.display !== 'none';
}

/* ------------------------------------------------------------------ */
/* Force dark mode & video enhancement                                 */
/* ------------------------------------------------------------------ */

function luminance(color: string): number {
  const match = color.match(/\d+(\.\d+)?/g);
  if (!match) return 1;
  const [r, g, b] = match.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function applyForceDark(): void {
  const style = document.createElement('style');
  style.id = 'kimmino-force-dark';
  style.textContent = `
    html { filter: invert(1) hue-rotate(180deg) !important; background: #0b0d12 !important; }
    img, video, picture, canvas, svg, iframe, [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    * { scrollbar-color: #3a4356 #0b0d12 !important; }
  `;
  document.documentElement.appendChild(style);
}

function maybeForceDark(): void {
  if (!config.forceDark) return;
  const body = document.body;
  if (!body) return;
  const bg = getComputedStyle(body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const isLight = luminance(bg.includes('rgba(0, 0, 0, 0)') ? htmlBg : bg) > 0.55;
  // Sites that already honour prefers-color-scheme get their own dark theme,
  // so we only invert pages that are still bright.
  if (isLight) applyForceDark();
}

function applyVideoEnhancer(): void {
  const style = document.createElement('style');
  style.textContent = `
    video { filter: contrast(1.05) saturate(1.08) brightness(1.02) !important; image-rendering: -webkit-optimize-contrast !important; }
    video::-webkit-media-controls { filter: none !important; }
  `;
  document.documentElement.appendChild(style);
}

/* ------------------------------------------------------------------ */
/* Focus mode shield                                                   */
/* ------------------------------------------------------------------ */

function installFocusShield(): void {
  const flag = (window as unknown as { __kimminoFocus?: boolean }).__kimminoFocus;
  if (!flag) return;
  const shield = document.createElement('div');
  shield.style.cssText = `
    position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;
    background:radial-gradient(120% 120% at 50% 0%,#101826,#06080d 70%);
    font-family:Inter,system-ui,sans-serif;color:#eef1f7;text-align:center;padding:40px;`;
  shield.innerHTML = `
    <div style="max-width:460px">
      <div style="width:52px;height:52px;border-radius:16px;margin:0 auto 20px;display:grid;place-items:center;
        background:linear-gradient(135deg,#6d8cff,#33d6a6);font-weight:700;font-size:20px;color:#0b0d12">K</div>
      <h1 style="font-size:24px;margin:0 0 10px;letter-spacing:-.02em">Focus mode is on</h1>
      <p style="color:#9aa4b6;font-size:14px;line-height:1.6;margin:0 0 22px">
        This site is on your distraction list. Kimmino is keeping it closed until your focus session ends.
      </p>
      <button id="kimmino-focus-close" style="border:0;border-radius:999px;padding:11px 20px;font:inherit;font-weight:600;
        cursor:pointer;background:#eef1f7;color:#0b0d12">Close this tab</button>
    </div>`;
  document.documentElement.appendChild(shield);
  const close = shield.querySelector('#kimmino-focus-close');
  close?.addEventListener('click', () => {
    shield.remove();
    window.close();
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function boot(): void {
  if (config.fingerprint) {
    hardenCanvas();
    hardenWebGL();
    hardenAudio();
    hardenNavigator();
    hardenScreen();
    hardenTimezone();
  }
  if (config.blockWebRTC) blockWebRTC();
  if (config.blockLocation) blockLocation();
  if (config.forceDark) spoofColorScheme();

  document.addEventListener('DOMContentLoaded', () => {
    try {
      if (config.autoDeclineConsent) dismissConsent();
      if (config.forceDark) setTimeout(maybeForceDark, 250);
      if (config.videoEnhancer) applyVideoEnhancer();
      installFocusShield();
    } catch {
      /* never break the page for a nicety */
    }
  });
}

boot();
