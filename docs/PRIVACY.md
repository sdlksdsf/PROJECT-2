# Privacy policy

**Effective 19 November 2026 · applies to the Kimmino browser and the kimmino.app website**

> **The short version.** Kimmino collects nothing. There are no analytics, no crash reports, no advertising identifiers and no unique install ID. Everything the browser knows about you stays in a folder you can open, export or delete. Sync is optional and goes to a database you own.

---

## 1. Our promise

Kimmino is published by the Kimmino contributors as free, open-source software. We have no advertising business, no data brokers, no investors expecting a data asset, and no server of our own that receives browsing information. Because the entire source is public, every statement on this page can be verified rather than believed.

## 2. What we do not collect

- No page views, URLs, titles, search terms or form contents.
- No IP addresses, device identifiers, hardware serials or advertising IDs.
- No crash dumps, stack traces or diagnostic pings.
- No "anonymous usage statistics", feature counters or A/B experiment assignments.
- No cookies, fingerprinting scripts or third-party embeds on this website.

Chromium's own reporting subsystems are disabled at the command-line level: background networking, component updates, domain reliability, translate, media router, optimization hints, Privacy Sandbox topics, interest cohorts and FedCM. There is no code path in Kimmino that posts to an analytics endpoint — [`browser/test/privacy.test.mjs`](../browser/test/privacy.test.mjs) fails the build if one is ever introduced.

## 3. What stays on your device

Stored in the application data folder, per profile:

- Preferences, theme, start-page layout and window geometry.
- Bookmarks, dials, browsing history and download records.
- Cookies, site storage and cache for the sites you visit.
- Per-site privacy exceptions and permission decisions.
- Saved passwords and autofill entries, encrypted with the operating system's keychain where available.
- Local privacy statistics (how many requests were blocked), which never leave the machine.

You can inspect this directory from **Settings → About → Open profile folder**, and erase any category from **Settings → Privacy → Erase browsing data**.

## 4. Optional account and sync

Sync is off by default and requires an account. If you turn it on:

- You provide an email address and a password. The password is hashed by Supabase Auth (bcrypt) and never stored by the browser; only a session token is kept locally.
- The items you choose to sync — bookmarks, preferences and dials — are encrypted in transit (TLS) and written to the `settings` and `bookmarks` tables, one row per user, enforced by row-level security that matches `auth.uid()`.
- The default project is `cvprinxmfqguqezaylhk.supabase.co`, addressed with a **publishable** key that can do nothing beyond what RLS allows. Override it with `KIMMINO_SUPABASE_URL` / `KIMMINO_SUPABASE_ANON_KEY`, or a `cloud.json` in your profile folder, to use your own.
- Sync payloads never include history, cookies, passwords, cache or page contents. You can delete synced rows at any time from **Settings → Sync → Delete cloud data**, or directly in Supabase.

Setup instructions and the SQL schema are in [SYNC.md](SYNC.md).

## 5. This website

kimmino.app is a static site. It sets no cookies, loads no scripts or fonts from third parties, and contains no analytics. The hosting provider (Vercel) processes standard request logs — IP address, user agent, requested path — for security and abuse prevention, as any web host does; we do not access or export those logs for marketing. Download buttons link to GitHub Releases, which is governed by GitHub's privacy statement.

## 6. Third parties

The only network requests Kimmino itself makes without your involvement are the pages you ask it to load and — if automatic updates are on, which is the default — a version check against GitHub Releases (the same public endpoint the download page reads; no identifier is sent). Asking the assistant a question sends that question, and the page context if you turned it on, to the Kimmino proxy, which forwards it to the selected model provider. Select "On-device only" and nothing leaves the machine. Filter lists are downloaded at build time, not at runtime. There is no Kimmino CDN, no telemetry domain, no partner SDK.

## 7. Children

Kimmino is general-purpose software and is not directed at children. We do not knowingly collect information from anyone, including children, because we do not collect information at all.

## 8. Your rights

Under the GDPR, CCPA and similar frameworks you have the right to access, correct, export and delete personal data held about you. Kimmino holds none on our side. For data on your device, the browser provides export and delete tools directly; for synced data, deletion is available in **Settings → Sync** or in your own Supabase project. If you believe something is missing, write to us and we will answer within 30 days.

## 9. Changes

If this policy changes, the new version appears here with a new effective date, and the commit is visible in the public repository. There is no mailing list; watch the repository if you want to be notified. We will not introduce telemetry quietly — it would be visible in a diff.

## 10. Contact

- Privacy questions: **privacy@kimmino.app**
- Security reports: **security@kimmino.app**, or a private advisory on GitHub (see [SECURITY.md](../SECURITY.md))
- General discussion: [GitHub Discussions](https://github.com/sdlksdsf/PROJECT-2/discussions)

---

### Appendix: what a request looks like

When you open a page with Kimmino, the network stack sees the request, applies the filter bundle, and only then dispatches it:

```
GET https://news.example.com/article
  → allowlist? no
  → ad domain? no
  → tracker domain? no
  → strip utm_*, fbclid? rewritten to /article
  → Referer: https://news.example.com/  (trimmed to origin)
  → Sec-GPC: 1, DNT: 1
  → User-Agent: stock Chrome string for this platform
  → dispatched
```

Third-party subresources judged to be ads, trackers or malware are dropped at step "ad domain" and never sent. Nothing about the decision is logged anywhere except a local counter.
