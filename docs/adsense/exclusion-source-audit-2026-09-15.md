# Search Console exclusion audit, September 15, 2026

Source: `a96ed002809ed78d3a9bb19a9e66a77cfbb634e8`, clean worktree `C:/Users/antho/ballpark-hero/.worktrees/integrated-588-repaired`. Read-only local source and public snapshots, no live fetch or browser inspection in this audit.

Input from parent: Search Console inspected September 15 at 22:56 EDT; report last updated September 3, with 58 indexed and 91 not indexed (3 redirects, 17 crawled-not-indexed, 71 discovered-not-indexed). The 17 URLs below are the supplied crawled-not-indexed examples.

## Classification

| URL | Supplied last crawl | Current local classification | Sitemap lastmod |
| --- | --- | --- | --- |
| `/sitemap.xml` | Aug 28 | XML sitemap | Not a submitted landing page |
| `/football-draft` | May 3 | retired/redirect | Not a submitted landing page |
| `/football-connect-4` | May 1 | real indexable route | 2026-09-05 |
| `/guess-cbb-team` | Apr 10 | real indexable route | 2026-08-31 |
| `/guess-nascar-driver` | Apr 10 | real indexable route | 2026-09-01 |
| `/guess-nfl-team` | Apr 10 | real route, intentionally noindex | Not a submitted landing page |
| `/guess-soccer-club` | Apr 10 | retired/redirect | Not a submitted landing page |
| `/guess-tennis-player` | Apr 10 | real indexable route | 2026-08-30 |
| `/guess-the-college` | Apr 10 | real indexable route | 2026-09-12 |
| `/terms` | Apr 9 | real indexable route | 2026-09-07 |
| `/f1-driver` | Apr 5 | real indexable route | 2026-09-07 |
| `/footle` | Mar 23 | real indexable route | 2026-09-15 |
| `/football-timeline` | Mar 18 | real route, intentionally noindex | Not a submitted landing page |
| `/baseball-career` | Mar 18 | real indexable route | 2026-08-25 |
| `/baseball-connections` | Mar 18 | real indexable route | 2026-08-29 |
| `/connections` | Mar 18 | real indexable route | 2026-09-04 |
| `/world-cup` | Mar 9 | retired/redirect | Not a submitted landing page |

## Supported findings

- Eleven current indexable pages all have one self-canonical, no noindex directive, a sitemap entry, a snapshot marker, a unique page title and readable page-specific content. The ten game pages include instructions, rules, worked examples and FAQ content; Terms includes the actual policy sections. None is an empty JavaScript shell in these local snapshots. All eleven have incoming links from other stored pages. This is file evidence, not a current Google fetch or a comprehensive quality verdict.
- Three retired URLs have both React Navigate-to-home routes and immediate HTML refresh stubs, home canonicals, and no sitemap entries or stored inbound links: football-draft, guess-soccer-club and world-cup. These are deliberate retirement behavior, not missing game guides. Files do not establish the live HTTP status.
- Guess-nfl-team and football-timeline remain routable but intentionally have noindex, follow in both PageSeo usage and saved HTML; neither is in the game registry or sitemap. Their exclusion should not be treated as an accidental indexing failure without first changing the product decision.
- Sitemap.xml is a valid XML sitemap containing 148 URL entries. robots.txt names it and permits Googlebot. It is not a game landing page to rewrite for indexing.
- One verified copy mismatch: src/pages/FootballConnect4.tsx:226 and public/football-connect-4/index.html:218 say the soccer puzzle uses draft class. The actual FOOTBALL_CONNECT4_BOARDS in src/types/footballConnect4.ts:25 and the game instructions use soccer club, nationality and achievement criteria; the board module contains no draft-class criterion. A later narrow copy correction should replace that phrase with the actual criteria and regenerate the route snapshot through the normal pipeline. No evidence links this mismatch to Google exclusion.

## Dates and limits

All eleven submitted page lastmod values shown above are later than their supplied last crawl dates. These are current local sitemap values backed by the project ledger, not proof of what was published or fetched on those crawl dates. The September 3 report is also older than this inspection and several local snapshot revisions. The report cannot establish that Google evaluated the current content. No cause of exclusion or AdSense decision is inferred, and no word-count threshold is proposed.

## Highest-value next action

Separate the six sitemap/retired/noindex URLs from the eleven real indexable pages. Then use current live URL inspection on a small representative sample, such as /footle and /football-connect-4, to compare the fetched canonical, indexability and rendered guide against these files before deciding whether a recrawl request is appropriate. Correct the one verified Connect 4 description separately. Do not bulk rewrite the eleven guides based only on these old crawl dates.

No page-indexing request was submitted. No network or database requests, builds, tests, source edits or frozen-branch mutations were performed. Parent owns any follow-up and docs integration.

Evidence: route-evidence.json records exact metadata, snapshot SHA-256 values, headings, FAQ counts and stored inbound-link examples; adjacent route .txt files contain extracted readable text.
