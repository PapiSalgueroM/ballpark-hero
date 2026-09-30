# Google readiness, September 30, 2026

Round 741, Codex desktop lane. This receipt supersedes the older statements that the
September 15 AdSense request is still pending. Checks were read-only against the
published domain and the owner's existing browser session. No review was requested,
no Google settings changed, and no application or snapshot was edited.

## AdSense decision observed directly

The Sites row for douknowball.com shows **Needs attention**, **Low value content**,
and **Authorized** ads.txt. Its displayed last update is **September 25, 2026,
4:59 AM EDT**. The payment profile is complete and the ad settings are confirmed.

The policy card asks for original useful information, tools or services, ongoing
curation and maintenance, and sustained real user interest. It names no individual
page and gives no measured threshold. The fixed-issues checkbox and Request review
button are available. Neither was used.

[Google's content and user experience guidance](https://support.google.com/adsense/answer/10015918)
emphasizes useful original content, returning visitors and clear navigation.
Successful HTTP checks, a word count, or an indexing count do not establish approval.
The August 30 render audit is historical evidence about its sample, not proof that
every possible technical or content explanation for today's rejection is ruled out.

## Search Console notice, resolved to its actual URL

The domain property's Page indexing report shows **68 indexed**, **94 not indexed**,
and a displayed last update of **September 20, 2026**. The four reasons are redirects
(5), crawled but not indexed (10), excluded by noindex (1), and discovered but not
indexed (78). These are Google's dated counts, not today's 163-URL live audit.

The noindex drilldown contains exactly one example: **https://douknowball.com/pack-battle**,
with a last crawl of **September 21** and first detected label of **September 22**.
This retired route has deliberately been outside the sitemap and menus with noindex
since Round 198. The alert is an expected exclusion, not an accidentally blocked active
game. Keep its noindex, and do not request validation for an issue that is intentional.

No indexing request, validation request or sitemap resubmission was made. The 78
discovered and 10 crawled exclusions remain a separate indexing backlog; the current
live audit clears the specific technical checks above, not Google's quality selection.

## Published site audit

Independent raw-response sweep started at 15:07 EDT. The strengthened
`node scripts/auditLive.mjs` was then rerun against the same published site.

| Check | Result |
|---|---|
| Published sitemap | 163 unique URLs, HTTP 200 |
| Submitted page status | 163 of 163 HTTP 200 |
| Robots/googlebot meta restrictions | No noindex or none on any submitted URL |
| X-Robots-Tag restrictions | No noindex or none on any submitted URL |
| Canonical | One correct self-canonical on every submitted URL |
| Titles and descriptions | Nonempty and unique on all 163 submitted URLs |
| Saved content | All 162 non-home submitted pages have their snapshot marker |
| Smallest readable body | Contact, 2,014 characters |
| Live content audit | 163 of 163 clean; shared text measured at 1,120 characters |
| robots.txt and ads.txt | Both HTTP 200; Googlebot allowed, publisher record correct |
| Publisher verification | Static account meta matches ads.txt |

The local tree has ten intentionally noindexed saved pages, none in the sitemap:
admin login and reports, profile, password reset, search, and five hidden legacy
game routes. Live spot checks of profile, admin login, password reset, search and
higher-lower-transfers confirm their noindex is present before JavaScript runs.
An unknown URL acquires the fallback noindex and loses the home canonical even with
the application bundle blocked. These protections should stay in place.

Google's [Page indexing documentation](https://support.google.com/webmasters/answer/7440203)
explains that intentional exclusions are normal. The notice alone does not identify
which URLs Google excluded. A healthy current live response does not prove that
Google has recrawled or indexed it.

## Demonstrated content defect assigned to Claude

Both trailing-slash flagship URLs initially return the complete saved guide, then
lose it when React mounts. Fresh, isolated browser contexts reproduced this after
the SEO section reported ready, without page exceptions.

| Route | Normal article characters | Slash article characters | FAQ questions |
|---|---:|---:|---|
| Soccer Career | 11,086 | 0 | 8 on normal route, absent with slash |
| Club Manager | 15,345 | 0 | 10 on normal route, absent with slash |

`src/components/seo/GameSeoContent.tsx:101` passes `location.pathname` into exact
registry and guide lookups. A trailing slash misses both. Both forms still declare
the correct canonical. This is a reproducible loss of useful content, not proof of
the AdSense decision's cause. The work board asks Claude's owning SEO release lane
to normalize that lookup and add a slash-route regression. Codex has not edited it.

## Round 741 audit repair and verification

The old live audit could declare a noindexed public page clean because it never
read robots tags or indexing headers. It now parses actual robots and Googlebot
meta tags, including body tags, and preserves crawler scope across individual
X-Robots-Tag headers. Comments, script strings, templates, escaped examples and
other-crawler-only restrictions do not trigger false failures.

`simLiveIndexability` runs the actual audit against a localhost server. All 13
healthy fixture routes pass. Eleven changed responses then fail for the intended
restriction while both unchanged responses remain clean. Meta, header and scope
controls also pass. An independent review requested the body-tag case, which was
added and verified.

TypeScript passed with `tsconfig.app.json`. The production build passed with output
in `C:/Users/antho/AppData/Local/Temp/dukb-round741-build`, keeping the shared dist
and committed snapshots untouched. Indexing, hidden-page, AdSense, harness-anchor
and rival-name guards passed. This is an audit-tool round, not a product release;
the full simulation and browser suites belong to Claude's release gate.

The scoped runner passed all six selected guards, including simLiveIndexability.
The legal-page guard also passed independently.

Full raw evidence remains at
`C:/Users/antho/AppData/Local/Temp/dukb-r741-live-audit-20260930/evidence.json` and the
fresh slash reproduction at `slash-verify.json` beside it. The tables above retain
the measured conclusions in the repository.
