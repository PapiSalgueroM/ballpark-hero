# Google indexing follow-up, September 7, 2026

Read directly in the authenticated Search Console property for douknowball.com.
The report's own last-update date is September 3, not the day it was read.
Counts: 58 indexed, 71 discovered but not indexed, 17 crawled but not indexed,
three pages with redirects. These are Google's 149 known URLs, not a count of
the site's current 140 sitemap entries. Bing and Yandex work remains paused.

## Crawled but not indexed: all 17 report entries

| Path | Reported last crawl | Current live treatment |
| --- | --- | --- |
| /sitemap.xml | 2026-08-28 | XML discovery resource, not an HTML indexing target |
| /football-draft | 2026-05-03 | Retired, immediate meta refresh to home, absent sitemap |
| /football-connect-4 | 2026-05-01 | Current indexable game |
| /guess-cbb-team | 2026-04-10 | Current indexable game |
| /guess-nascar-driver | 2026-04-10 | Current indexable game |
| /guess-nfl-team | 2026-04-10 | Intentionally noindexed, absent sitemap |
| /guess-soccer-club | 2026-04-10 | Retired, immediate meta refresh to home, absent sitemap |
| /guess-tennis-player | 2026-04-10 | Current indexable game |
| /guess-the-college | 2026-04-10 | Current indexable game |
| /terms | 2026-04-09 | Current indexable legal page |
| /f1-driver | 2026-04-05 | Current indexable game |
| /footle | 2026-03-23 | Current indexable game |
| /football-timeline | 2026-03-18 | Intentionally noindexed, absent sitemap |
| /baseball-career | 2026-03-18 | Current indexable game |
| /baseball-connections | 2026-03-18 | Current indexable game |
| /connections | 2026-03-18 | Current indexable game |
| /world-cup | 2026-03-09 | Retired, immediate meta refresh to home, absent sitemap |

Independent live raw HTML audit at 8:53 p.m. Eastern: the 11 current candidates
all return 200, have one self canonical, title, description and H1, no noindex,
and appear in the live sitemap. Their ten games each contain instructions,
rules, a worked example, strategy and FAQ. The five excluded routes match
explicit retirement/hiding decisions. Do not request indexing for them.

The stored crawl dates predate the August prerender fixes. This makes stale
crawl evidence plausible, but it does not prove the cause of Google's decision.

## URL Inspection actions

- `/footle`: stored last crawl March 23, 2026 at 9:00:57 p.m., Googlebot smartphone,
  fetch successful, canonical N/A. Live test at September 7, 8:53 p.m. returned
  "URL is available to Google", "Page can be indexed" and one valid breadcrumb.
  Request indexing then returned "Indexing requested" and confirmed the URL was
  added to the priority crawl queue. This is a request, not confirmed indexing.

Do not repeatedly submit the same URL. Google says that does not change queue
position or priority. [URL Inspection guidance](https://support.google.com/webmasters/answer/9012289)
and [Page indexing report guidance](https://support.google.com/webmasters/answer/7440203).

## Page with redirect: all three report entries

| URL | Reported last crawl |
| --- | --- |
| http://douknowball.com/ | 2026-09-03 |
| https://www.douknowball.com/ | 2026-08-25 |
| http://www.douknowball.com/ | 2026-08-24 |

These are alternate domain/scheme forms, not the retired game routes. Keep
their redirect to the preferred HTTPS apex site. The older state note tying
this three-URL bucket to `/jeopardy` was an inference, not the observed list.

## Discovered but not indexed: all 71 report entries

All show last crawled N/A. The list was read with 100 rows per page and the
table confirmed 1-71 of 71. All 71 currently appear in the committed sitemap,
checked against the exact URL strings. Presence here does not override a later
noindex or retirement decision. Recheck before requesting a crawl.

```text
/accessibility
/ball-iq
/career-ladder
/cbb-dynasty
/cbb-grid
/cfb-dynasty
/cfb-higher-lower
/champ-or-not
/club-manager
/clue-auction
/conquest-mlb
/conquest-nba
/conquest-nhl
/contact
/dart-draft
/emoji-guess
/front-office
/gauntlet-draft
/guess-the-golfer
/guess-the-nation
/guess-the-year
/higher-lower
/hockey-career
/hockey-grid
/hof-or-bust
/leaderboard
/list-quiz
/minefield
/missing-eleven
/missing-nine
/missing-xi
/mlb-connect-4
/mlb-front-office
/mlb-grid
/mlb-my-career
/nascar-chain
/nba-chain
/nba-connect-4
/nba-front-office
/nba-my-career
/nba-stat-line
/nfl-connect-4
/nfl-connections
/nfl-my-career
/nhl-connections
/nhl-front-office
/nhl-my-career
/olympics
/perfect-lineup-nba
/perfect-lineup-nhl
/player-bingo
/puck-detective
/rank-em
/rarity-round
/rebuild
/records
/score-predictor
/search-and-discard
/sign-the-player
/silverware-sort
/soccer-grid
/sports-bingo
/squad-deal
/stadium-tycoon
/teammates
/tennis-chain
/transfer-path
/ufc-chain
/whats-new
/whod-they-beat
/wonderkid-factory
```

## Publication and next checks

Round 509 is merged through PR 60 at `1ecc00eb`, not yet verified live.
The authenticated preview shows the final fixes. Public markers still show
older content: `/terms` says September 1 rather than September 7, and `/f1-driver`
still mentions Google sign-in in its FAQ. Lovable UI controls repeatedly timed
out; no successful publish has been claimed.

After publishing, run the live audit and verify the new bundle plus these
markers. Then apply the guarded 203-path Active Players restore, verify its
counts, and continue targeted Google URL Inspection for current sitemap pages.
Google decides what to index. A passing live test is technical eligibility,
not a promise of indexing or AdSense approval.
