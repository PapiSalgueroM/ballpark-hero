# Indexing Audit

Opened 2026-08-29 (Round 341) against the owner's Search Console task document.
Status: **technical fixes verified externally; Google-side classification pending
one owner tap** (see "The blocked half" below). Per the task's own rule, nothing
here claims "SEO fixed"; the honest sentence is: technical correctness is
verified and re-verifiable, Google recrawl and indexing remain pending.

## What is verified true right now (externally, re-runnable)

Probe of 2026-08-29 over every canonical URL (full table in route-inventory.md):

- All 131 sitemap URLs: HTTP 200, self-canonical, unique title present,
  description present, readable no-JS text between roughly 1,600 and 11,000
  characters per page (prerendered documents, not empty shells).
- sitemap.xml: valid XML, 131 URLs, all on the canonical https apex, lastmod
  derived from each page's own content hash (the committed ledger, simSitemap
  section 5), no redirects, no 404s, no noindexed pages inside it.
- robots.txt: allows all major crawlers; blocks only /admin/ (staff screens that
  carry their own noindex); declares the sitemap.
- Variant shapes all fold correctly: http 301s to https; www redirects to apex
  (302, host-level, minor note in the inventory); trailing-slash and query-param
  duplicates answer 200 with a canonical to the clean URL; unknown and
  case-variant paths get the render-time noindex marker (proven in a real
  browser by playSoftFourOhFour, deliberately invisible to raw-HTML probes);
  retired routes serve tiny stubs with canonicals to their successors.
- The mirror domain (ballpark-hero.lovable.app) cross-domain canonicals every
  sampled page to douknowball.com. Correct, nothing to change.
- Internal linking: simInternalLinks proves every page reachable and every page
  linking onward; the hub structure (home to sport hubs to games) is the crawl
  path. No orphan among the 131.
- The CI layer the task demands already exists as the 15 built-site fences
  (titles and descriptions unique per page: simHeadTags; indexable-or-honestly-
  hidden: simIndexing plus simHiddenPages; sitemap truthfulness: simSitemap;
  reachability: simInternalLinks; no-JS readability: simPrerender plus
  simPrerenderBoot; structured data: simSchema; soft-404: playSoftFourOhFour)
  and they run on every rebuild. auditLive (re-derived in Round 338) checks the
  LIVE site's pages against the same bar, 131 of 131 clean on 2026-08-29.

## The classification framework (to be filled from GSC)

| URL | GSC status | Reason | Should index? | Action | Priority |
|---|---|---|---|---|---|
| (waiting on the Search Console export, see below) | | | | | |

Expected classes and what each will mean here:

- **Redirect / canonicalized elsewhere / duplicate**: legitimate not-indexed.
  Candidates that will land here: the retired-route stubs (/jeopardy,
  /deal-or-no-deal and earlier retirements), trailing-slash and parameter
  variants, www and lovable.app duplicates Google discovered through old links.
  No action; these are the system working.
- **Not found (404) / soft 404**: any old deleted route Google still remembers.
  Legitimate; they fade.
- **Excluded by noindex**: should contain ONLY admin screens and the fallback
  document. Anything else in this class is a real bug; simPrerender section 14
  exists to make that impossible (no sitemap document may ship a noindex).
- **Crawled, currently not indexed**: Google saw the page and deferred. The
  page-quality levers already pulled: 47k words of per-game copy, the Round 324
  head-terms pass, per-page FAQ and breadcrumb markup restored in Round 281,
  derived lastmod so recrawls are honest. Remaining lever is time and the
  content itself; re-inspect after the next recrawl cycle.
- **Discovered, currently not indexed**: Google has not even fetched it.
  Watch crawl-budget signals; internal links and sitemap are already in place.

## The blocked half: what only the owner can provide

The task requires the real GSC verdicts, and GSC is account-gated. Either path
takes about two minutes:

1. **Preferred**: sign into the Claude in Chrome extension on this PC
   (chromewebstore, "Claude in Chrome", same account as the desktop app). Claude
   then reads the Pages report and runs URL Inspection on a representative
   sample of every category, and fills the table above itself.
2. **Or**: open Search Console, property douknowball.com, Indexing then Pages,
   click Export (top right), save the CSV to Downloads and say so in chat. The
   classification table gets filled from the file.

No mass "Request indexing" will be clicked either way; after classification, at
most a handful of high-priority pages get a manual request, per the task's own
rule 18.

## Deliverable ledger (task section 21)

- A. Root cause of the 80+: pending GSC classification. External probe rules
  out: robots blocks, noindex leaks, missing canonicals, sitemap rot, orphan
  pages, empty no-JS documents, duplicate titles or descriptions.
- B/C. Legitimate vs should-index counts: pending the same classification.
- D. Technical cause per category: the expected-class table above, to be
  confirmed against real data.
- E. Files changed so far: docs/seo/route-inventory.md, docs/seo/
  indexing-audit.md (this file). No code changes were warranted by the external
  probe; the July-to-August indexing work (rounds 256 to 296) already fixed the
  layer this task targets.
- F. Tests performed: the 131-URL live probe, 8 variant probes, mirror probe,
  robots and sitemap validation, plus the standing 15-fence suite and auditLive
  on the live site, all green 2026-08-29.
- G. URLs manually inspected in GSC: none yet, blocked on the owner tap.
- H. Waiting on Google: recrawl of the Round 324 keyword pass and everything
  since; indexing decisions on the crawled-not-indexed class.
- I. Prioritized remaining problems: 1) the GSC classification (owner tap),
  2) the crawled-not-indexed quality watch after the next recrawl, 3) the www
  302-vs-301 note (host-level, cosmetic), 4) nothing else found.
