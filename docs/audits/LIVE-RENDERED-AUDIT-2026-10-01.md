# Live rendered audit, October 1, 2026

Round 836, Claude lane. A measurement round: no site code changed. Everything below
was measured against the published site, douknowball.com, with GET requests and a
headless Chromium. No form was touched, no consent banner was clicked, no account
was used, and every write request the pages tried to make was blocked.

Harness: `scripts/playLiveRenderedAudit.mjs`. Data, every number and no page text:
`docs/audits/data/live-rendered-2026-10-01.json`.

## Why this exists, and what it adds to the September 30 audit

`docs/audits/GOOGLE-READINESS-2026-09-30.md` and `scripts/auditLive.mjs` read what the
SERVER sends (status, canonical, robots, the saved copy). That work is not repeated
here and its conclusions stand. What nobody had measured is the page Google actually
indexes. Google's own documentation says it renders JavaScript pages in a headless
Chromium and "uses the rendered HTML to index the page"
([JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).
Until Round 745 the trailing slash form of every game page served its guide in the
raw HTML and deleted it when React mounted. This audit renders EVERY page in the live
sitemap at BOTH addresses, after mount, and compares.

## Method

- **Scope.** The live sitemap lists **170 routes** today (the September 30 audit
  counted 163). Each was loaded plain and with a trailing slash: **339 desktop URLs**
  at 1366 by 900. A **30 page phone sample** (390 by 844, touch, every 170/30th route
  from the sitemap, plain form) was loaded as a second pass. **369 renders, 0 failed.**
- **Visitor.** A fresh browser context per URL (no cookies, no storage), Googlebot's
  desktop or smartphone user agent with an audit token appended. Ad and analytics hosts
  aborted, so no headless visit can count as ad traffic. Any request that was not a GET
  or a POST to a Supabase read function was aborted and listed (one was:
  `fantasy-draft-daily`, which upserts; see fix 9).
- **Settled.** Mounted means the boot element is gone (React clears `#root` on its
  first commit). Then the page text outside the site chrome has to stand still for two
  seconds with nothing in flight (four seconds if something long lived stays open,
  eight if a spinner is still showing), capped at fifteen seconds. Then the viewport is
  stretched to the full page height, the way Google renders, and the page settles again
  before it is measured. Median time to mount was 0.9 s (p90 1.8 s); median time to the
  measured state was 7.4 s.
- **Page text** is the visible leaf blocks (headings, paragraphs, list items, table
  cells) outside `[data-site-chrome]`, the same mark the prerenderer uses to tell page
  from header, ticker, navbar, footer and cookie banner. The saved copy is measured the
  same way from `#dukb-snapshot` (or the home template's `#dukb-home-copy`).
- **Lost on mount** is every saved page block of 20 characters or more whose letters and
  digits appear nowhere in the settled document. A page "loses content on mount" when
  that adds up to at least 300 characters AND at least a quarter of its saved text.

## Headline numbers

| Question | Answer |
|---|---|
| Pages that lose content on mount | **1 of 170: the home page.** 0 of the 169 other routes, at either address. |
| Routes whose slash form differs from the plain form after mount | **0 of 169** (title, description, canonical, h1, robots, guide state and words, page text, links, JSON-LD all compared) |
| Phone sample differing from desktop | 0 of 30, apart from the same home page loss |
| Status, redirects, canonical, robots after mount | 339 of 339 answer 200 with no redirect; every plain page has one self canonical after mount; no robots or X-Robots-Tag restriction anywhere |
| Exact duplicate titles, descriptions, h1s | 0, 0, 0 |
| Page text shared between pages (5 word shingles) | Highest pair 0.29 Jaccard; 0 pairs at 0.3 or more |
| Pages under 3 inlinking pages, or over 3 clicks from home | 0 and 0 (deepest page is 2 clicks) |
| Pages with a data error at render | 3 routes: `/leaderboard` (every load), `/rarity-round` (once), `/fantasy-draft` (blocked write, artifact of the audit) |
| Pages showing a loading state at the measured moment | 2 routes: `/college-grid`, `/cbb-grid` (both addresses, and phone) |

Round 745's fix holds on the live site: every game guide survives mount at both
addresses. The one page that loses its saved copy is the home page, and it is a
different mechanism (section a).

## (a) Pages that lose content on mount, and slash versus plain

**The home page, desktop and phone.** The raw HTML carries a written page in
`#dukb-home-copy`: a descriptive h1 ("DoUKnowBall: free daily sports trivia, puzzles
and career sims") and 67 blocks, 5,592 characters, including 11 paragraphs of 120
characters or more (2,471 characters) explaining the sections of the site. When React
mounts, **all 5,592 characters are gone** and the h1 becomes "DoUKnowBall". What
replaces them is the app's home: 14,368 characters in 423 blocks, of which 348 are
under 60 characters (tile labels) and only 6 reach 120 characters, every one a game
tile blurb, two of them repeated. The rendered home, which is what Google indexes and
what an AdSense reviewer lands on, has no sentence that says what the site is beyond
its hero line. The phone render is the same (12,369 characters, same loss).

This is by design since Round 257 (the template copy exists for crawlers that do not
run JavaScript) but Google is not one of those crawlers.

**Below the loss rule, two small misses**, both a single live data line redrawn after
mount and not a defect: `/higher-lower` (one 80 character data caveat, 2 percent) and
`/nba-chain` (today's prompt, 49 characters, 1 percent).

**Slash versus plain: no differences on any of the 169 routes.** No page's title
changes on mount, every plain page has exactly one visible h1, and no saved text
survives only as hidden DOM.

**One transient**, kept out of the totals above because it did not reproduce: in the
first desktop pass `/connections` (plain) rendered only a spinner, 22 characters, no
h1, 8 links, no console error, and the rule reported it. Three immediate reruns and
the slash form all rendered the full page (4,093 characters, a 508 word guide). The
record is kept at `.tmp-fx/live-rendered/transient-connections.json` in the worktree
and the committed data holds the rerun. It is evidence that a render can occasionally
stall on this site, not a reproducible defect.

## (b) The thinnest 25 pages by settled page words (desktop, plain)

Median page: 872 words. Median game guide: 585 words (132 game guides, 71 of them
under 600, shortest 502). "Page" is all visible text outside the chrome; "guide" is the
article inside the game's guide section.

| Route | Page words | Guide words | What it is |
|---|---:|---:|---|
| /contact | 215 | | Contact page |
| /leaderboard | 504 | | World Leaderboard, showing a false empty board (see f) |
| /accessibility | 511 | | Accessibility statement |
| /about | 541 | | About page |
| /golf-higher-lower | 595 | 502 | Golf higher or lower |
| /score-predictor | 610 | 564 | Score quiz |
| /ufc-chain | 615 | 565 | MMA chain |
| /f1-constructor | 619 | 536 | Guess the F1 team |
| /tennis-higher-lower | 627 | 530 | Tennis higher or lower |
| /nba-higher-lower | 633 | 547 | NBA higher or lower |
| /fantasy-draft | 639 | 566 | Soccer draft (daily criteria blocked by the audit) |
| /records/dally-m-medal-winners | 640 | | Record table |
| /nfl-career | 640 | 563 | NFL career path guess |
| /afl-higher-lower | 642 | 547 | AFL higher or lower |
| /minefield | 645 | 559 | Spot the fakes |
| /guess-cbb-team | 647 | 565 | Guess the college program |
| /nfl-higher-lower | 648 | 557 | NFL higher or lower |
| /olympics | 649 | 560 | Guess the Olympian |
| /ball-iq | 649 | 571 | Sports IQ test |
| /missing-five | 653 | 549 | NBA Finals lineup gap |
| /hockey-grid | 655 | 538 | NHL franchise grid |
| /nhl-connect-4 | 655 | 548 | NHL connect 4 |
| /football-connect-4 | 658 | 540 | Soccer connect 4 |
| /hockey-higher-lower | 658 | 505 | NHL higher or lower |
| /missing-eleven | 659 | 545 | Super Bowl lineup gap |

None of these is empty and none is under the bar the September 30 audit set for "chrome
only". The pattern is that the thin end of the site is almost entirely the short game
guides, and those cluster in families: **10 higher or lower pages** (guides 502 to 586
words), **10 guess the X pages**, 7 daily grids, 5 connect 4s, 5 connections, 5 career
path guessers, 5 gauntlet drafts, 5 conquests, 4 perfect seasons, 4 missing lineups,
4 chains, 4 front offices, 4 my careers, 3 perfect lineups.

## (c) Duplicate and near duplicate titles, descriptions and h1s

No exact duplicates. Near duplicates, measured as word set Jaccard after removing the
brand suffix (titles 0.6 or more, descriptions 0.5 or more, h1s 0.7 or more):

- **Grid archives** (`/nba-grid/archive`, `/mlb-grid/archive`, `/hockey-grid/archive`):
  descriptions 0.90 apart from the league name, titles and h1s 0.71
  ("NBA Grid Answers: Past Daily Boards"); `/cbb-grid/archive` 0.63 to 0.64 against them.
- **Sport hubs** (`/baseball`, `/hockey`, `/pro-basketball`, `/pro-football`): descriptions
  0.70 to 0.85 ("Every free baseball game on DoUKnowBall in one place: daily MLB trivia,
  franchise grids, career-path guessers..."), titles 0.60 ("Free Baseball Games: MLB
  Trivia, Grids and GM Sims").
- Sport twins: `/mlb-my-career` and `/nhl-my-career` descriptions 0.70;
  `/nfl-gauntlet-draft` and `/nba-gauntlet-draft` 0.67; `/football-connect-4` and
  `/nfl-connect-4` titles 0.71; `/career-ladder` and `/career` titles 0.75;
  `/f1-driver` and `/guess-nascar-driver` h1s 0.75.
- 36 description pairs at 0.5 or more in all; the full list is in the report output the
  harness prints.

## (d) Pages whose main text is largely the same template

**How it was measured.** For every plain page, the settled page text outside the chrome
was cut into overlapping 5 word shingles; every pair of the 170 pages (14,365 pairs) was
compared by Jaccard (shared over union) and by containment (shared over the smaller
page). Separately, every block of 20 characters or more was keyed and counted across
pages, giving each page the share of its text that also appears word for word on six or
more other pages.

**Result: the text is not templated.** 79 pairs reach 0.1, 6 reach 0.2, none reaches 0.3.
The median page has 0.2 percent of its text in blocks repeated on six or more pages. At a
loose 0.15 threshold the clusters are:

| Cluster | Highest pair |
|---|---|
| 8 record tables (NBA, WNBA, Heisman, English champions, AFL, Brownlow, Dally M, NRL) | 0.17 |
| 4 my career sims (NFL, NBA, MLB, NHL) | 0.22, containment 0.37 |
| `/soccer-conquest`, `/conquest-mlb`, `/conquest-nhl` | 0.28, containment 0.44 |
| `/gauntlet-draft`, `/nfl-gauntlet-draft`, `/nba-gauntlet-draft` | 0.29, containment 0.49 |
| `/mlb-gauntlet-draft`, `/nhl-gauntlet-draft` | 0.22 |

The record tables carry the most repeated text: 12 to 29 percent of each records page
(29 percent on `/records/dally-m-medal-winners`) is the cross link list ("NBA champions
since 1947, year by year", each on 12 pages) and the sentence "Each table was verified
against at least two independent sources, and the checks run on every build:" (14 pages).
Outside the records, the most repeated blocks are related game tile blurbs ("Which
legend kicked more career goals?" on 33 pages).

So a duplicate content filter has little to find. The risk is not repeated text but
repeated CONCEPTS: dozens of pages that are the same game in another sport, each with a
550 word guide. That is the shape the next section is about.

## (e) Internal link graph

Built from the links on every crawled page (desktop, plain), counting distinct source
pages, in three views:

| View | Pages under 3 inlinking pages | Pages over 3 clicks from home | Depth distribution | Fewest inlinking pages |
|---|---|---|---|---|
| Settled DOM | 0 | 0 | 146 at 1 click, 23 at 2 | 4 |
| Raw HTML (before JavaScript) | 0 | 0 | 59 at 1 click, 110 at 2 | 4 |
| Settled DOM, page body links only (chrome removed) | 3: `/accessibility` (0), `/about` (1), `/contact` (2) | 1: `/accessibility` unreachable without the footer | | 0 |

Internal link targets outside the sitemap: `/search` (in the chrome of every page, and
noindexed on purpose) and `/profile` (one link). The link graph is healthy and is not
why pages sit in "Discovered, currently not indexed".

## (f) Console errors, page errors and failed requests

14 of 369 renders logged something. By cause:

- **`/leaderboard`, every load, both addresses: `rpc/global_leaderboard` answers 500.**
  The response body is Postgres code 57014, "canceling statement due to statement
  timeout", for both the today and all time boards. The page then shows "No scores yet
  today. Be the first!" because `src/pages/Leaderboard.tsx` passes the resolved
  `{ data: null, error }` straight to `mapBoard` (line 98), which returns an empty list.
  supabase-js resolves on an HTTP error rather than throwing, so the Round 540 failed
  panel in the `catch` (lines 195 to 199, and 235 to 237 for the lazy tabs) can never
  show. A reviewer sees a site whose world leaderboard has nobody on it.
- **`/rarity-round`, one of three loads: `player_nationality_peaks` answers 500.** It
  answered 200 on two later loads. Probably the same database pressure as the
  leaderboard; worth reading the Supabase logs for 57014 before guessing further.
- **`/fantasy-draft`, every load: "Could not load today's criteria."** This one is caused
  by the audit, which blocked the page's POST to the `fantasy-draft-daily` edge function
  because that function upserts the day's criteria. It still shows what the page says
  when that call fails, and that a first visit of the day is a write.
- **Network timeouts, 6 of 369 navigations** (`/club-manager/`, `/sports-bingo`,
  `/silverware-sort/`, `/tennis-higher-lower/`, `/rank-em/`, phone `/guess-the-year`):
  the first attempt did not reach DOMContentLoaded within 30 seconds and the retry loaded
  normally. On three of the six a `fonts.googleapis.com/css2` request timed out, which
  points at the render blocking font stylesheet. This may be the measuring machine's
  connection, so it is evidence, not proof.
- The home page's HEAD count request to `daily_completions` is aborted by the app
  itself; harmless.

No page threw an uncaught exception. No page failed to mount within 25 seconds.

## (g) What a quality reviewer would call thin, unfinished or low value

- **The rendered home page is a tile wall** (section a). It is the first page a reviewer
  opens.
- **The World Leaderboard says nobody has played** (section f). A false empty state on
  the page that is meant to show the site has an audience.
- **Two daily grids are still loading at 15 seconds.** `/college-grid` and `/cbb-grid`
  showed "Loading today's puzzle..." and 15 skeleton cells at the measured moment, at
  both addresses and on the phone. A slower probe showed why: College Grid pages through
  `college_grid_players` in 35 sequential requests and its board appears after about 13
  to 15 seconds; CBB Grid makes 44 requests to `ncaa_player_stats` and appears after
  about 16 to 18 seconds. Every other grid rendered its board inside the window.
- **Placeholder text, "coming soon", "under construction": none found.**
- **Account walls: none.** No page asks for an account to play. This matches the site's
  promise and the AdSense guidance, which names login restrictions among the navigation
  problems that can cause disapproval
  ([account not approved](https://support.google.com/adsense/answer/81904)).
- **Ad slots: none in the DOM before consent**, on any page. `AdBanner` renders nothing
  until a visitor accepts, so there is no empty labelled box anywhere a reviewer could
  see. (Whether the reviewer's own crawler accepts consent is not knowable from here.)
- **Spinners after settle** apart from the two grids: one small pulsing element on
  `/wonderkid-factory`, `/missing-xi`, `/missing-eleven`, `/missing-five`,
  `/missing-nine` and `/guess-the-college`. Cosmetic, not a loading page.
- **JSON-LD** parses on all 369 renders and is present on all 170 pages.

## (h) Ranked fix list

Nobody can guarantee AdSense approval or full indexing. Google's own wording is that a
discovered page was "found by Google, but not crawled yet" and a crawled one "may or may
not be indexed in the future"
([Page indexing report](https://support.google.com/webmasters/answer/7440203)). Both are
Google's choices. What this list can do is remove every reason this audit found for a
reviewer or a renderer to see less than the site has.

Sizes: S is under one round, M is one round, L is several.

| # | Fix | Pages | Why it matters | Size | Who fixes it |
|---|---|---|---|---|---|
| 1 | **Give the rendered home page its words back.** Render the template's explanatory sections (and a descriptive h1) inside the React home, below the tiles, so the indexed page and the raw page say the same thing; guard the pair the way `simHomeCopy` guards the template. | `/` | Google indexes the rendered HTML ([JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)). AdSense lists "too little text" and pages of headlines rather than "complete sentences and paragraphs" as insufficient content ([account not approved](https://support.google.com/adsense/answer/81904)). Today the rendered home has 6 blocks over 120 characters, all tile blurbs. | M | Code |
| 2 | **Stop the leaderboard lying, then make it load.** (a) Treat `res.error` as failure in `Leaderboard.tsx` so the existing "That board did not load" panel shows instead of "Be the first"; (b) fix the `global_leaderboard` statement timeout (read `20260831_disk_io_leaderboard_cache.sql` and `20260911_leaderboard_eastern_day.sql` first; serve from the cache, add what the plan needs). | `/leaderboard` | The AdSense policy card recorded in the September 30 audit asks for sustained real user interest, and the guidance asks for a good user experience ([content and user experience](https://support.google.com/adsense/answer/10015918)); an empty world board tells a reviewer the opposite of the truth. | (a) S, (b) M | Code, then database |
| 3 | **Make the two slow grids render in one request.** Precompute the day's board and the answer set it needs (a daily row or a narrow view) instead of paging the whole player table in the browser. | `/college-grid`, `/cbb-grid` | The main content arrives 13 to 18 seconds after load; at 15 seconds the measured page was a loading state. A renderer that stops earlier indexes "Loading today's puzzle". | M | Code and database |
| 4 | **Deepen the short guides, family by family**, with sport specific substance: a real worked example from the game's own data, what makes a good answer in that sport, how the data is built and checked, the traps. Start with the 10 higher or lower pages and the thinnest 25 above. Follow the data guardian rules: no invented fact. | 71 game pages under 600 guide words | The text is not duplicated (section d), but 3 to 10 versions of the same game per concept is the pattern Google's spam policy describes as "many pages ... with little or no value to users" ([scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse)) unless each page offers its own value; the helpful content guidance asks whether a page gives "substantial value when compared to other pages" ([creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)). Google's spam policies no longer have a section called "thin content"; scaled content abuse is the closest. | L | Content |
| 5 | **Rewrite /about around who, how and why**: who builds the site, how games and data are made and checked (the records pages already state their two source rule), how to report an error, what is free and why. | `/about` (541 words), `/contact` (215) | The helpful content guidance's "Who, How, and Why" questions are what a reviewer judges trust by. | S | Content |
| 6 | **Thin out the shared blocks on the record tables**: a short related list instead of the full cross list, and a paragraph or two of commentary per table (streaks, droughts, notable finals) from the verified data. | 13 `/records/*` pages, 12 to 29 percent shared | Lifts the share of each page that is its own; these are the most templated pages on the site. | S to M | Content |
| 7 | **Make hub and archive titles and descriptions page specific** in `src/data/seoMeta.ts` (counts, signature games, date ranges). | 6 hubs, 4 grid archives | Near identical descriptions (0.70 to 0.90) read as keyword templates; AdSense warns against pages "optimized for specific keywords or phrases" ([content and user experience](https://support.google.com/adsense/answer/10015918)). | S | Content |
| 8 | **Separate the sport twins' shared paragraphs** in the gauntlet draft, conquest and my career guides. | 12 pages, containment up to 0.49 | The closest pairs on the site; each guide should read as written for its sport. | M | Content |
| 9 | **Take the write out of Fantasy Draft's first visit**: generate the daily criteria on a schedule and read them with a GET, with a fallback board instead of "Could not load today's criteria." | `/fantasy-draft` | A renderer or a visitor whose call fails sees an error line in place of the game. | S to M | Code and database |
| 10 | **Chase the intermittent failures**: Supabase logs for 57014 frequency (shared cause with fix 2 is likely), the one `/connections` spinner render, and the render blocking Google Fonts stylesheet (self host or load it without blocking). | `/rarity-round`, `/connections`, all pages for the font | Each intermittent failure is a chance that the one render Google keeps is the broken one. Evidence here is thin (one or three events in 369), so investigate before building. | S | Code and database |

**What this audit found that needs no fix.** Both addresses of every page render the
same page; titles, descriptions and h1s are unique; every page is two clicks or fewer
from home with at least four pages linking to it; no robots restriction; no placeholder
text; no account wall; no empty ad box. More internal linking or more technical SEO will
not move the indexing numbers, because none of those is broken.

**What only time, links and visitors fix.** "Discovered, currently not indexed" (78 pages
on September 20) is Google deciding not to crawl yet; for a site this size that is about
how much Google wants the content, which grows with links from other sites, mentions, and
people searching for and returning to it. AdSense's review weighs the same returning
visitors. The code can make every page as complete as possible when Google does look; it
cannot make Google look sooner. For crawled pages Google says there is "no need to
resubmit this URL for crawling", and requesting an AdSense review before fixes 1 to 5
are live would spend a review on the same site.

## Negative control

Run against a local build served by `scripts/lib/hostLikeServer.mjs`, started and
stopped inside one command. A fresh `vite build` did not finish inside one four minute
command on this machine (killed at 3 minutes 58 seconds while rendering chunks), so the
control used a copy of the main tree's existing build from 2026-09-19 03:35, copied into
the worktree's scratch folder so nothing could change under it.

| Run | Command | Result |
|---|---|---|
| Baseline | `SERVE=<build> ONLY=/soccer-career,/club-manager FORMS=plain` | 0 pages reported. Soccer Career 10,405 saved, 10,405 settled; Club Manager 14,814 saved, 15,012 settled |
| Control | same plus `CONTROL=guidegone` | The control asserted it removed 9,985 characters of guide from `/soccer-career` after mount; the harness reported `/soccer-career` (lost 9,923 of 10,405 saved characters, settled 420) and did NOT report `/club-manager`. Exit 0, "control: green" |
| Real defect replay | `SERVE=<build> ONLY=/soccer-career,/club-manager,/about FORMS=slash` | The 2026-09-19 build predates Round 745, so it still has the slash bug. The harness reported `/soccer-career/` (lost 9,923 of 10,405, settled 701) and `/club-manager/` (lost 13,370 of 14,814, settled 4,341), and not `/about/`, which has no guide |

So the rule fires on a planted loss, stays quiet on the untouched page in the same run,
and catches the actual defect this round was written for on the build that had it.

## Limits

- One day, one machine, one network. Render times are this machine's, not Google's.
- The audit used Googlebot's user agent from a non Google address; the site does no user
  agent sniffing (checked in `src`), so this should not matter.
- Writes were blocked, which changed `/fantasy-draft` (fix 9). Read functions
  (`global_leaderboard`, `global_rank`, `most_played_today`) were allowed.
- No consent was given, so nothing about ads after consent was measured.
- The phone pass is a sample of 30, plain form only.

## Reproduce

```
OFFSET=0 LIMIT=25 node scripts/playLiveRenderedAudit.mjs        # repeat with OFFSET 25, 50 ... 325
VIEWPORT=phone SAMPLE=30 FORMS=plain OFFSET=0 LIMIT=15 node scripts/playLiveRenderedAudit.mjs
VIEWPORT=phone SAMPLE=30 FORMS=plain OFFSET=15 LIMIT=15 node scripts/playLiveRenderedAudit.mjs
CLUSTER_J=0.15 MODE=report node scripts/playLiveRenderedAudit.mjs
SERVE=<built dir> CONTROL=guidegone ONLY=/soccer-career,/club-manager FORMS=plain node scripts/playLiveRenderedAudit.mjs
```

From Git Bash prefix `MSYS_NO_PATHCONV=1` to any command with a route in it. Each chunk
takes about two minutes. Results accumulate in `.tmp-fx/live-rendered/results.json`;
report mode prints every table above and writes the committed compact copy.
