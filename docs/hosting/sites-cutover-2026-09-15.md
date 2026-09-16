# Alternate hosting, September 15

Anthony explicitly requested publishing without Lovable. The alternate site
is public at https://douknowball.anacatu2025.chatgpt.site.

## Current state

- Sites project: `appgprj_6aa9d4d57c5081919c1cc6702160c568`.
- Root-owned deployment checkout: `C:/Users/antho/douknowball-hosting`.
- The application source stays in this GitHub repository. The separate hosting
  checkout tracks accepted static outputs and their provenance. No backend moved.
- First publication succeeded at 23:38:30 UTC. It uses the accepted guide build
  from `27f814beb113ab0aa6899797717029ba7e6910e5`, deployment source
  `4f408cfce1acebc8fe30291a354d27cad75a5f58`.
- All 323 non-HTML responses match the accepted bytes. All 169 HTML responses
  match after removing only the observed Cloudflare detection script. Four
  effective controls prove other content and script changes remain detectable.
  Every checked response was HTTP 200. The existing `_redirects` file did not
  mask snapshots or assets on this deployment.
- Independent static review verified all 493 output files and all 148 sitemap
  documents, including canonical URLs, indexability, local assets and ads.txt.
- The accepted 588 animation build is now live on the same preview, published
  at 23:54:57 UTC. All 374 non-HTML responses match exactly, and all 169 HTML
  responses match after the narrowly controlled Cloudflare script removal.
  All return 200. See [the publication proof](animation-preview-proof-2026-09-15.json).
  That exact source passed 318 node harnesses, 311 Vitest tests, 15 explicit
  browser programs and 74 effective controls. This is not approval of the new
  combined tree.

At 20:36 EDT, a targeted public access check returned the expected content
with HTTP 200 for home, Soccer Career, robots.txt and ads.txt under the normal
Node client and both AdSense crawler headers. Python's default user agent
received a Cloudflare 403 on the same four paths. This narrows the earlier
Python failure to a header-sensitive access rule; it is not proof of a real
Google crawl or of access from every network. No security setting changed.
See [the 16-request evidence](crawler-header-check-2026-09-15.json).
Google documents the two AdSense crawlers in its
[crawler guidance](https://support.google.com/adsense/answer/99376?hl=en).

**Do not move the main domain to this preview yet.** That would undo
Claude's live 611, 612 and 616 changes. The final integrated tree contains them
and the full animation stack. Its type check and production build pass; its
fresh full verification and accepted artifact are still pending.

The last directly observed AdSense state remains Review requested at 12:37 EDT.
No resubmission and no approval claim. A later browser status check timed out.

## Domain connection

DNS currently uses `ns27.domaincontrol.com` and `ns28.domaincontrol.com`.
The apex A record observed at 19:25 EDT points to `185.158.133.1`.
Existing mail records point to `smtp.secureserver.net` and
`mailstore1.secureserver.net`; preserve all mail and unrelated records.

The custom domain is registered with Sites but remains pending. Its ID is
`appgdom_6aa9d726943c81918e37e000033e427a`.

These TXT records establish ownership without moving website traffic:

| Type | GoDaddy name | Value |
| --- | --- | --- |
| TXT | `_openai-site-verification` | `openai-site-verification=vcsi-hT1LsXU3FbpMc06Gf8tp6QTgPs9g6OgOSi9VJI` |
| TXT | `_cf-custom-hostname` | `8fd6bc0b-9337-473a-95fe-e37f3ffea27c` |

After the integrated release passes, is published on the alternate host, and
domain validation/TLS are ready, the provider's apex A targets are
`162.159.143.30` and `172.66.3.26`. Replace only the old website A record at
cutover. Recheck these returned targets before acting. Do not substitute a
CNAME at the apex or change nameservers.

There is no signed-in DNS management connection in this task. The Codex
in-app browser works again for ordinary pages. A direct visit to this
domain's GoDaddy DNS page reached the sign-in screen, which is kept open for
Anthony. He has been asked to sign in. No DNS record has been changed.
A separate preview origin does not establish
that Supabase authentication callbacks are allowlisted there. Preserving the
production origin preserves its existing callback URLs and browser saves.

## Release plan

1. Reduce repeated production-table reads in the verification harnesses.
2. Run one full combined verification containing the 586, 603 to 605, 587 and
   588 features plus current main, preserving all existing outcome checks.
3. Accept its exact artifact, publish it to this same Sites project, and
   verify public documents and asset bytes.
4. Finish DNS/TLS validation and move only the website A record.
5. Verify douknowball.com, its game routes, assets, ads.txt, robots, sitemap,
   authentication return behavior and crawler-facing content after the switch.

The former four-run verification plan is consolidated to one final integrated
run to reduce duplicate database load. Historical branch evidence remains
valid for its own source only. No new feature is started during this work.
