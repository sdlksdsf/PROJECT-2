import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function Privacy() {
  return (
    <>
      <div className="doc">
        <span className="eyebrow">
          <ShieldCheck size={13} /> Legal · plain English
        </span>
        <h1>Privacy policy</h1>
        <p className="doc-meta">Effective 19 November 2026 · applies to the Kimmino browser and kimmino.app</p>

        <div className="callout">
          <strong style={{ color: 'var(--text)' }}>The short version.</strong> Kimmino collects nothing. There are no
          analytics, no crash reports, no advertising identifiers and no unique install ID. Everything the browser knows
          about you is stored in a folder you can open, export or delete. Sync is optional and goes to a database you
          own.
        </div>

        <h2 id="promise">1. Our promise</h2>
        <p>
          Kimmino is published by the Kimmino contributors as free, open-source software. We have no advertising
          business, no data brokers, no investors expecting a data asset, and no server of our own that receives
          browsing information. Because the entire source is public, every statement on this page can be verified
          rather than believed.
        </p>

        <h2 id="telemetry">2. What we do not collect</h2>
        <ul>
          <li>No page views, URLs, titles, search terms or form contents.</li>
          <li>No IP addresses, device identifiers, hardware serials or advertising IDs.</li>
          <li>No crash dumps, stack traces or diagnostic pings.</li>
          <li>No “anonymous usage statistics”, feature counters or A/B experiment assignments.</li>
          <li>No cookies, fingerprinting scripts or third-party embeds on this website.</li>
        </ul>
        <p>
          The browser ships with Chromium’s own reporting subsystems disabled at the command-line level:
          background networking, component updates, domain reliability, translate, media router, optimization hints,
          Privacy Sandbox topics and FedCM are all switched off. There is no code path in Kimmino that posts to an
          analytics endpoint.
        </p>

        <h2>3. What stays on your device</h2>
        <p>Kimmino stores the following in your operating system’s application data folder, per profile:</p>
        <ul>
          <li>Preferences, theme, start-page layout and window geometry.</li>
          <li>Bookmarks, dials, browsing history and download records.</li>
          <li>Cookies, site storage and cache for sites you visit.</li>
          <li>Per-site privacy exceptions and permission decisions.</li>
          <li>Saved passwords and autofill entries, encrypted with your operating system’s keychain where available.</li>
          <li>Local privacy statistics (how many requests were blocked), which never leave the machine.</li>
        </ul>
        <p>
          You can inspect this directory from Settings → About → Open profile folder, and erase any category from
          Settings → Privacy → Erase browsing data.
        </p>

        <h2>4. Optional account and sync</h2>
        <p>
          Sync is off by default and requires an account. If you turn it on, the following happens:
        </p>
        <ul>
          <li>You provide an email address. A six-digit code is emailed to you to verify it. No password is stored.</li>
          <li>
            The items you choose to sync — bookmarks, preferences and speed dials — are serialised, encrypted in
            transit, and written to a database table named <code className="inline">kimmino_sync</code>.
          </li>
          <li>
            Sync infrastructure is a Supabase project that <em>you</em> configure through <code className="inline">KIMMINO_SUPABASE_URL</code>{' '}
            and <code className="inline">KIMMINO_SUPABASE_ANON_KEY</code>, or a <code className="inline">cloud.json</code> file in your
            profile folder. The Kimmino project does not operate a shared sync backend, so there is no central service
            holding user data.
          </li>
          <li>
            Sync payloads never include history, cookies, passwords, cache or the contents of pages. You can delete your
            synced rows at any time from Settings → Sync → Delete cloud data, or by removing them directly in Supabase.
          </li>
        </ul>

        <h2>5. This website</h2>
        <p>
          kimmino.app is a static site. It sets no cookies, loads no fonts or scripts from third parties, and contains no
          analytics. The hosting provider (Vercel) processes standard request logs — IP address, user agent, requested
          path — for security and abuse prevention, as any web host does; we do not access or export those logs for
          marketing. Download buttons link to GitHub Releases, which is governed by GitHub’s privacy statement.
        </p>

        <h2>6. Third parties</h2>
        <p>
          The only network requests Kimmino itself makes without your involvement are the pages you ask it to load and
          — if you enable Early Bird updates — a version check against GitHub Releases. Filter lists are downloaded at
          build time, not at runtime. There is no Kimmino CDN, no telemetry domain, no partner SDK.
        </p>

        <h2>7. Children</h2>
        <p>
          Kimmino is general-purpose software and is not directed at children. We do not knowingly collect information
          from anyone, including children, because we do not collect information at all.
        </p>

        <h2>8. Your rights</h2>
        <p>
          Under the GDPR, CCPA and similar frameworks you have the right to access, correct, export and delete personal
          data held about you. Kimmino holds none on our side. For data on your device, the browser gives you the export
          and delete tools directly; for synced data, deletion is available in Settings → Sync or in your own Supabase
          project. If you believe something is missing, write to us and we will answer within 30 days.
        </p>

        <h2>9. Changes</h2>
        <p>
          If this policy ever changes, the new version will appear on this page with a new effective date, and the commit
          will be visible in the public repository. Because there is no mailing list, we recommend watching the repository
          if you want to be notified. We will not introduce telemetry quietly; it would be visible in a diff.
        </p>

        <h2>10. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:privacy@kimmino.app">privacy@kimmino.app</a>. Security reports:{' '}
          <a href="mailto:security@kimmino.app">security@kimmino.app</a> (or open a private security advisory on GitHub).
          General discussion happens in <a href="https://github.com/sdlksdsf/PROJECT-2/discussions">GitHub Discussions</a>.
        </p>

        <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost btn-sm" to="/licenses">
            Licences
          </Link>
          <Link className="btn btn-ghost btn-sm" to="/docs">
            Documentation
          </Link>
        </div>
      </div>
    </>
  );
}
