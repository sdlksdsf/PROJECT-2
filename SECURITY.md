# Security policy

## Supported versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | ✅ |
| Anything older | ❌ |

Only the latest release receives security fixes. Development builds from `main` are supported on a best-effort basis.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting:

> Security tab → Report a vulnerability

or email **security@kimmino.app**. Include:

- affected version and platform,
- a minimal reproduction (a URL pattern, a crafted extension, a page that escapes the sandbox),
- impact: what an attacker gains,
- whether it requires user interaction.

You will get an acknowledgement within 72 hours and a status update within seven days. If the report is valid, we will credit you in the release notes unless you prefer otherwise.

## Scope

In scope:

- Sandbox escapes or renderer-to-main privilege escalation.
- IPC handlers that trust renderer input (path traversal, command injection, arbitrary file write).
- Privacy bypasses: a site able to read a real fingerprint, location, LAN IP, or detect that blocking is enabled in a way that matters.
- Filter-list parser bugs that crash the app or allow arbitrary CSS/JS injection into pages.
- Extension loader weaknesses (loading a folder that escapes the profile, executing before the compatibility check).
- Sync: RLS bypass, token leakage, cross-account data access.
- The website: XSS, open redirect, anything that could serve a malicious "installer" link.

Out of scope:

- Missing code signing (known; tracked in the roadmap).
- Vulnerabilities in Chromium itself that are not exploitable through Kimmino's integration — report those upstream, but tell us if Kimmino's configuration makes them worse.
- Sites breaking because ads are blocked.
- Social engineering that requires the user to disable protections deliberately.
- Denial of service by loading a very large page locally.

## Our commitments

- No telemetry means no third-party data to leak.
- Privacy defaults are not negotiable for convenience; a fix that weakens them will not ship.
- Security fixes are released as patch versions with a clear changelog, and users on Early Bird get them first.

## Recognition

Responsible disclosures are credited in the release notes and in this file, with your permission.
