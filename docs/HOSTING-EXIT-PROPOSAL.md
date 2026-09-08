# Hosting without Lovable

Status: proposed, not approved for account or DNS changes.
Date: September 7, 2026.
Decision owner: Anthony.

## Context

The Lovable editor has become slow for the owner and repeatedly times out when
automation reads its publishing controls. This does not establish a root cause
or prove that the public site is slow. Publishing is a separate dependency from
game performance. The production frontend is a standard Vite build, its source
is in GitHub, and its database and authentication use the existing Supabase project.

## Proposed decision

Evaluate the frontend on Cloudflare Pages with GitHub preview deployments and
a separate, explicitly approved production release. Do not auto-publish ordinary
work commits to the live domain.
Keep douknowball.com, route paths, Supabase, existing user accounts and browser
saves. Keep Lovable available for rollback while the new host is verified.
No plan purchase, new account, secret, DNS edit or deployment was made for this assessment.

### Owner requirements, clarified September 7

Anthony likes Lovable because he can see analytics, watch what changed and try
updates before publishing. These are acceptance requirements for any replacement:

- An accessible analytics dashboard, not logs or terminal output. Cloudflare Web
  Analytics can provide visitors and page views; compare its metrics with the
  owner's actual Lovable view before deciding it is an adequate replacement.
  Historical Lovable data will not automatically appear in a new dashboard.
  Retain access or export it before considering cancellation.
- A stable latest-preview link plus clearly identified change previews, so he
  can play the updated site and inspect the changes before release.
- An explicit approval-controlled publishing step, separate from code work and
  preview updates. Do not configure every main-branch commit to publish by default.

Cloudflare supports a Web Analytics dashboard and automatically updated branch
preview aliases. Its production-branch controls can separate production from
preview builds, but the final publishing workflow must be demonstrated to the
owner before switching. Do not imply its dashboard is identical to Lovable's.
[Web Analytics](https://developers.cloudflare.com/pages/how-to/web-analytics/),
[previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/),
[branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).

The checked build has 463 files, 12.47 MB total and a largest file of 1.01 MB.
Pages Free currently permits 20,000 files and 25 MiB per file, with 500 builds
monthly. Static requests are free and unlimited. Usage and applicable terms
must be rechecked at setup, not treated as a permanent cost guarantee.
[Limits](https://developers.cloudflare.com/pages/platform/limits/),
[pricing](https://developers.cloudflare.com/pages/functions/pricing/).

## Alternatives and trade-offs

- Keep Lovable: no migration work, but the editor and manual Publish remain in
  the release path. Its present slowdown is not diagnosed.
- Cloudflare Pages: fits the static build, supports automated GitHub deploys
  and previews. Requires a tested routing configuration and a deliberate DNS
  cutover for the apex domain.
- Vercel: viable technically, but Hobby is restricted to non-commercial use.
  It is not the free-plan recommendation for an ad-supported site.
  [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines).

## Migration requirements

1. Use `npm run build` and publish `dist` after the existing code gates. The
   committed snapshots and Vite asset injection remain load-bearing. Generate
   snapshots in the existing controlled workflow, not in a Pages build that
   can exceed its 20-minute build limit.
2. Adapt `public/_redirects`. Its `/* /index.html 200` catchall is ignored by
   the current host, but Pages can apply it before existing assets. Do not
   upload this configuration unchanged. Test directory indexes, trailing
   slashes, all sitemap documents, assets, retired routes, dynamic profile
   links and unknown URLs in a preview before DNS.
   [Redirects](https://developers.cloudflare.com/pages/configuration/redirects/),
   [HTML serving](https://developers.cloudflare.com/pages/configuration/serving-pages/).
3. Public DNS currently uses ns27.domaincontrol.com and ns28.domaincontrol.com.
   Pages apex custom domains require Cloudflare authoritative DNS. Inventory
   and preserve every mail, verification and service record before a change.
   Registration need not move. Owner approval is required for the cutover.
   [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
4. Keep production URLs and Supabase unchanged. Preview authentication may
   need narrowly scoped redirect/origin/CORS additions. Do not expose the
   hidden Google sign-in while testing hosting.
5. Preserve canonicals, sitemap, robots, publisher verification and ads.txt.
   Compare raw HTML before/after and run the full live audit. A hosting move
   alone is not an indexing or AdSense approval guarantee.
   [Google hosting migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes).
6. Verify release rollback, automatic preview updates and manual production
   approval. Demonstrate analytics and the preview/publish workflow to Anthony.

## Remaining Lovable runtime dependency

Hosting independence is not yet complete service independence. Repository
sources for simulate-season, analyze-squads and player suggestions still
reference Lovable's AI gateway, as do fallbacks in some validators. The deployed
edge versions must be inspected before removing keys or deleting the Lovable
project. Do not assume the repository source matches deployment when the edge
ledger marks it unverified. Replace or retain those services in a separately
verified follow-up, with no invented sports facts and fail-closed validation.

Lovable officially supports external deployment of exported code.
[External hosting documentation](https://docs.lovable.dev/tips-tricks/external-deployment-hosting).
