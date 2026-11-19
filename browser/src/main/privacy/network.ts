import type { OnBeforeRequestListenerDetails, OnHeadersReceivedListenerDetails, Session } from 'electron';
import type { Preferences } from '../../shared/types';
import { FilterEngine, registrableDomain, type BlockKind } from './engine';

export interface NetworkPrivacyContext {
  prefs: () => Preferences;
  engine: () => FilterEngine | null;
  onBlock: (webContentsId: number | undefined, kind: BlockKind, url: string, host: string) => void;
  onCookieBlocked: (webContentsId: number | undefined, host: string) => void;
  /** Site-level "turn blocking off here" exceptions from the shield menu. */
  isExempt?: (firstPartyHost: string) => boolean;
}

const CHROME_UA =
  process.platform === 'darwin'
    ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    : process.platform === 'win32'
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function isThirdParty(url: string, documentUrl: string | undefined): boolean {
  if (!documentUrl) return false;
  try {
    const a = registrableDomain(new URL(url).hostname);
    const b = registrableDomain(new URL(documentUrl).hostname);
    return a !== b;
  } catch {
    return false;
  }
}

/**
 * Applies Kimmino's network-level privacy policy to a session:
 * ad/tracker blocking, third-party cookie refusal, tracking-parameter removal,
 * referrer trimming, client-hint scrubbing and DNT.
 */
export function applyNetworkPrivacy(ses: Session, ctx: NetworkPrivacyContext): () => void {
  const engine = () => ctx.engine();
  const prefs = () => ctx.prefs();

  ses.setUserAgent(CHROME_UA);

  const onBeforeRequest = (details: OnBeforeRequestListenerDetails, callback: (response: { cancel?: boolean; redirectURL?: string }) => void) => {
    const p = prefs();
    const url = details.url;
    if (!/^https?:/i.test(url)) return callback({});

    const documentUrl = details.frame?.url || details.referrer || undefined;
    const third = isThirdParty(url, documentUrl);
    const wcId = details.webContentsId;

    // 1. Always-on malware protection (safe browsing), independent of adblock.
    const activeEngine = engine();
    if (p.privacy.safeBrowsing && activeEngine) {
      try {
        const host = new URL(url).hostname;
        if (activeEngine.isMalwareHost(host)) {
          ctx.onBlock(wcId, 'malware', url, host);
          return callback({ cancel: true });
        }
      } catch {
        /* ignore */
      }
    }

    // 2. Ads / trackers / consent scripts (unless the user exempted this site).
    const firstPartyHost = documentUrl ? safeHost(documentUrl) : '';
    const exempt = firstPartyHost ? ctx.isExempt?.(firstPartyHost) === true : false;
    const blockingEnabled = (p.privacy.adBlocking || p.privacy.blockTrackers) && !exempt;
    if (blockingEnabled && activeEngine && details.resourceType !== 'mainFrame') {
      const result = activeEngine.match(url, {
        firstParty: documentUrl ? safeHost(documentUrl) : undefined,
        resourceType: details.resourceType
      });
      if (result.block) {
        const kind = result.kind ?? 'ads';
        if (kind === 'ads' && !p.privacy.adBlocking) return callback({});
        if (kind === 'trackers' && !p.privacy.blockTrackers) return callback({});
        if (kind === 'malware' && !p.privacy.safeBrowsing) return callback({});
        if (kind === 'popups' && !p.privacy.blockPopups) return callback({});
        if (kind === 'cookies' && !p.privacy.autoDeclineConsent) return callback({});
        ctx.onBlock(wcId, kind, url, safeHost(url));
        return callback({ cancel: true });
      }
    }

    // 3. Tracking parameter stripping (redirect, not block).
    if (p.privacy.stripTrackingParams && activeEngine) {
      const cleaned = activeEngine.stripTrackingParams(url);
      if (cleaned !== url) {
        ctx.onBlock(wcId, 'trackers', url, safeHost(url));
        return callback({ redirectURL: cleaned });
      }
    }

    if (p.privacy.blockCryptoMiners && /coinhive|coin-hive|cryptonight|webmine|minero\.cc|crypto-loot|deepMiner/i.test(url)) {
      ctx.onBlock(wcId, 'malware', url, safeHost(url));
      return callback({ cancel: true });
    }

    void third;
    callback({});
  };

  const onBeforeSendHeaders = (
    details: Electron.OnBeforeSendHeadersListenerDetails,
    callback: (response: { requestHeaders: Record<string, string> }) => void
  ) => {
    const p = prefs();
    const headers: Record<string, string> = { ...(details.requestHeaders as Record<string, string>) };
    const lower = (name: string) => Object.keys(headers).find((k) => k.toLowerCase() === name);
    const remove = (name: string) => {
      const key = lower(name);
      if (key) delete headers[key];
    };
    const set = (name: string, value: string) => {
      remove(name);
      headers[name] = value;
    };

    const documentUrl = details.frame?.url || undefined;
    const third = isThirdParty(details.url, documentUrl);

    if (p.privacy.blockThirdPartyCookies && third && details.resourceType !== 'mainFrame') {
      remove('Cookie');
    }
    if (p.privacy.doNotTrack) set('DNT', '1');
    set('Sec-GPC', '1');

    if (p.privacy.fingerprintProtection) {
      for (const key of Object.keys(headers)) {
        if (/^sec-ch-ua/i.test(key)) delete headers[key];
      }
      set('Accept-Language', p.system.language ? `${p.system.language},en;q=0.8` : 'en-US,en;q=0.9');
    }

    if (p.privacy.spoofReferrer) {
      const refKey = lower('Referer');
      if (third && refKey) {
        try {
          headers[refKey] = new URL(documentUrl ?? details.url).origin + '/';
        } catch {
          remove('referer');
        }
        if (p.privacy.strictMode) remove('referer');
      }
    }

    callback({ requestHeaders: headers });
  };

  const onHeadersReceived = (
    details: OnHeadersReceivedListenerDetails,
    callback: (response: { responseHeaders?: Record<string, string[]>; statusLine?: string }) => void
  ) => {
    const p = prefs();
    const documentUrl = details.frame?.url || undefined;
    const third = isThirdParty(details.url, documentUrl);
    const responseHeaders = details.responseHeaders ?? {};

    if (p.privacy.blockThirdPartyCookies && third) {
      let blocked = false;
      for (const key of Object.keys(responseHeaders)) {
        if (/^set-cookie/i.test(key)) {
          delete responseHeaders[key];
          blocked = true;
        }
      }
      if (blocked) ctx.onCookieBlocked(details.webContentsId, safeHost(details.url));
    }

    if (p.privacy.fingerprintProtection) {
      for (const key of Object.keys(responseHeaders)) {
        if (/^(server-timing|timing-allow-origin|x-powered-by)$/i.test(key)) delete responseHeaders[key];
      }
    }

    callback({ responseHeaders });
  };

  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, onBeforeRequest);
  ses.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, onBeforeSendHeaders);
  ses.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, onHeadersReceived);

  return () => {
    ses.webRequest.onBeforeRequest(null);
    ses.webRequest.onBeforeSendHeaders(null);
    ses.webRequest.onHeadersReceived(null);
  };
}

export function safeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

export { CHROME_UA };
