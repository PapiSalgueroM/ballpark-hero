# notes-crawl (auditor: crawl area, Phase 0 items 2 and 3)

Status log, rewritten after every step. If you are a restart, read this first.
STATE: ALL WORK DONE. Only the final StructuredOutput report is left; everything it needs is below.

## Files this auditor added (nothing tracked was edited)
- scripts/auditCrawl.mjs (465 lines), scripts/auditDuplicateCopy.mjs (431 lines, imports the parser from the crawl script)
- docs/audits/ad-readiness-2026-10-08/crawl.json (live build AK served at localhost:4190)
- docs/audits/ad-readiness-2026-10-08/crawl-branch-files.json (branch AL, read off public/ with --files)
- docs/audits/ad-readiness-2026-10-08/duplicates.json (live build AK), duplicates-branch-files.json (branch AL)
- Both scripts rerun twice: identical sha1 both times. scripts/simNoRivalNames.mjs run after: 0 findings.

## How to rerun
- `node scripts/auditCrawl.mjs` and `node scripts/auditDuplicateCopy.mjs` (default base http://localhost:4190)
- add `--files --out <path>` to read the branch's saved pages instead of HTTP
- node:http is used because fetch() refuses port 4190 ("bad port")

## Numbers (live build AK; branch AL is the same except 8 more sentences)
- 192 addresses crawled: 177 snapshots + home + 14 stubs. All 200. 171 indexable, 10 noindex (3 of them stubs).
- 171 of 171 indexable: main text in raw HTML, 1 title, 1 description, 1 canonical (self), exactly 1 h1. 0 duplicates of any.
- Main words (indexable): min 214, q1 624, median 784, q3 1294, max 44224 (/whats-new), mean 1505.
  Game pages (133): min 543, q1 621, median 676, q3 1047, max 5182.
- Thinnest 20: /contact 214, /leaderboard 477, /accessibility 510, /nhl-connections 543, /hockey-higher-lower 547,
  /golf-higher-lower 551, /hockey-career 552, /connections 566, /nfl-connections 569, /f1-constructor 577,
  /tennis-higher-lower 581, /nba-career 584, /afl-higher-lower 589, /nba-higher-lower 593, /score-predictor 594,
  /career 596, /missing-five 597, /missing-eleven 598, /baseball-connections 599, /baseball-career 601.
- Sentences: 11,646; distinct raw 10,346. On more than 3 pages: raw 106, masked 114 (88 / 94 with four words or more).
  9% / 10.5% of sentence occurrences, 5.6% of sentence words. Only 9 found by masking alone.
  Page count buckets (masked): 3 on 100+, 1 on 20 to 99 ("No" 67), 21 on 10 to 19 (record pages), 7 on 6 to 9, 82 on 4 to 5.
- Headings: 4,691 (27.4 a page). Thin: 2,849 (16.7 a page, 60.7%). copy 2,039 / container 693 / links 117.
  copy by level: h3 1,754, h4 127, h1 86, h2 72. Over one block: 1,951. Over nothing: 23. Restating (crude): 1,239.
  Game pages alone: 1,876 thin copy of 3,864 headings, 1,815 over one block, 14.1 a page.
- h2 run how > rules > walkthrough > tips > faq on 132 pages; exact 7 section shape on 107.
- Reskins do not share sentences: Higher or Lower mean 5.2% of sentence words repeated; nearest neighbour Jaccard mostly 0.03 to 0.05.
  Record pages share the most: 47 to 77% of sentence words, pair Jaccard up to 0.657.
- Raw footer: one disclaimer wording in chrome on 170 of 171 (home has none); second short disclaimer in main on /about,
  /contact, /privacy, /terms, /whats-new. One consent wording, on 152 indexable pages (18 game snapshots lack it).

## Brief vs today (my area)
- Golf example: TRUE word for word (public/golf-higher-lower/index.html lines 226 to 227).
- Free to play FAQ on every game page: TRUE, 133 pages, one template (GameSeoContent.tsx lines 177 to 178).
- "Same templated text" on reskins: structure yes, sentences no.
- Sitemap stale from 2026-08-12 and missing sections: FALSE. 171 URLs, lastmod 2026-08-25 to 2026-10-07, 14 /records rows,
  about, contact, whats-new, stadium-tycoon all present. Every indexable page is in it and nothing else is.
- Unique title, description, canonical, one h1, main text in HTML: already TRUE for all 171.
- /search already noindex. BreadcrumbList already on 147 pages, FAQPage on 133.
- Unknown address: 200 with the home template, canonical "/", no robots tag without JavaScript. public/_redirects says the host
  ignores redirect rules, so a real 404 status or a 301 is not available on this host.
- /jeopardy and /deal-or-no-deal are already retired stubs.
- ads.txt holds ...f08c47fec0942fa0 (Google's published id). The brief asks for ...fa8, which would be wrong.

## Conflicts
- simGuideHeadings (Round 638, owner asked for many keyword headings): requires label in every h2, 8+ h3 and 1+ h4, floor 131,
  sentences frozen in scripts/data/guideHeadingsFrozen.json. Phase 1 bans those patterns.
- The literal Phase 5 target cannot be met without touching H1s (86 thin), game UI text and the record cross links.
