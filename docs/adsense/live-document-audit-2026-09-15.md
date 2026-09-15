# Live document audit, September 15, 2026

From 13:22:23 to 13:23:21 EDT, the existing `scripts/auditLive.mjs`
checked all 148 URLs listed in the release sitemap against douknowball.com.
All 148 passed, with zero findings and exit code 0.

The check reads HTTP responses without executing the app. It checks response
status, self-canonical links, duplicate canonical and description tags, pages
that accidentally repeat the home document, and readable content beyond the
text shared by the site navigation and footer.

The shared text measured 1,126 characters across 147 non-home pages. The
existing missing-content heuristic used a cutoff of 1,576 characters. No page
failed it. This is a diagnostic for missing page content, not a word-count
requirement from Google or a judgment of editorial quality.

The harness came from source `24e17ff64402ead35c7a58c8f34f7842ca01b9e7`.
The sitemap SHA-256 was
`3c724fefba8c11ad2d149346a731545b6289b5e51e80da866ffcee1ebbbf3dfa`.
The complete local log is
`C:/Users/antho/.codex/visualizations/2026/09/15/01a0a304-8aa4-7612-a558-91eac041eec2/audit-live-2026-09-15-172223-UTC.log`.

This run does not inspect robots directives, execute games, prove indexing or
establish AdSense approval. The separate signed-in console check at 12:37 EDT
still showed Getting ready and Review requested after the 04:19 EDT submission.
See [the console record](console-check-2026-09-15.md) and
[the readiness record](reapply-readiness.md).
