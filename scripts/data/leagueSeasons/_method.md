# Round 1036 research method: who was in each league, season by season

Written by the premier-league shard on 2026-10-06. Ledgers only, nothing here touches the repo or
production. The lead commits the checked ledgers to `scripts/data/leagueSeasons/`.

## What each ledger holds

One JSON per league, `<league-slug>.json`, shaped as the brief asks:

```
{ league, tierNames: [{from, to, name}], seasons: [{ season: "1990-91", startYear: 1990, size,
  clubs: [{ printed: [..per source], canon, pos? }], sources: [{host, url, read}], verified }] }
```

Extra fields the premier-league ledger adds, all optional for a reader:

- `sizes`: the verified club count per span of seasons.
- `tier` per season: the name the top flight carried that season.
- `notes` per season: any disagreement or count problem, in words.
- `supporting` and `unverifiedReason` per season: sources that were read but do NOT count toward
  `verified` (a source not on the brief's list, or a Wikipedia spot check), with whether each one
  agrees with the counted source on members and on positions.
- `aliases`: every spelling the parser had to map by hand, exactly as the source printed it.
- `selfCheck`: season count, verified count, the churn check per adjacent pair of seasons, and the
  list of problems (empty apart from the unverified seasons).

`printed[i]` is the club exactly as `sources[i]` prints it, including the source's own typos and
capitals (RSSSF prints champions, promoted and relegated clubs in capitals, and has a few typos
such as "Charlton Atletic", "Wigan Athleitc", "Tottenham Hotspurs" and a truncated
"WOLVERHAMPTON"). Nothing is corrected in `printed`; the matching happens in the identity key.

## How the pages were read

Raw pages, not summaries. Each source page or feed was downloaded with `curl` and parsed by a small
script, so every club in a ledger is a string that appears in the source, never a model's
paraphrase of it. WebFetch was tried for worldfootball.net and is the right tool where a page has
no machine-readable form, but a summarising fetch can drop or reorder rows, which is the one thing
a membership ledger cannot afford.

RSSSF tables are plain text: a table is a run of rows numbered 1, 2, 3 and so on, where blank lines
and dashed separator lines (including the spaced "- - - -" kind) may sit inside the run. The first
such table on the page is the top flight; the first later table of 24 rows that all show 46 games
played is the second tier, used only for the promotion and relegation check below.

## Two sources, and what counts

A season is `verified: true` only when two independent non-wiki sources on the brief's list give
the same set of clubs, the count equals the season's size, and no club appears twice. Positions
are recorded (`pos`) only where both counted sources print the same one; a position disagreement
is written into `notes` and never changes membership.

Clubs are compared by an identity key: the printed name lowercased, accents stripped, "&" read as
"and", apostrophes, full stops and a standalone "FC" removed, then the hand alias list for the
source typos above and for "AFC Bournemouth". There is no fuzzy matching and no short-name
matching: Sheffield United and Sheffield Wednesday stay two clubs, and so does every pair like
them (the Round 315 trap).

## canon

`canon` is the club's name as the Soccer Career world spells it, matched by identity key against
`HAND_CLUBS` in `src/lib/soccerCareerEngine.ts` and `CAREER_CLUB_POOL` in
`src/data/soccerCareerClubPool.ts`, both read from worktree `scout-d` on 2026-10-06. Examples:
Manchester City is `Man City`, Wolverhampton Wanderers is `Wolves`, Queens Park Rangers is `QPR`.
A club the world does not know keeps `canon: null` (for England in 1990 to 2026: Barnsley,
Blackpool, Bradford City, Huddersfield Town, Leicester City, Luton Town, Notts County, Oldham
Athletic, Reading, Sheffield Wednesday, Swindon Town, Wigan Athletic and Wimbledon). Note that
Leicester City is not in the scout-d world at all, although the brief's example names it.

## Self checks

1. Count per season equals the verified size, in every counted source.
2. No club twice in a season.
3. Churn: for each pair of adjacent seasons, clubs out plus clubs in balance the two sizes.
4. Promotion and relegation (England only): every club that arrives in the top flight was in the
   second tier the season before, and every club that leaves is in the second tier the season
   after, using the second tier table on the same RSSSF page. This does not depend on the
   championship shard, so it holds whichever order the shards finish in.
5. Cross-shard: the same promotion and relegation test run against `championship.json` as it stood
   on 2026-10-06 (36 seasons in it) passed 70 of 70 (35 sets of arrivals, 35 sets of departures).
   Rerun it if the championship shard changes.

Each check has a negative control that is proven to fire, run with an environment variable and
never writing the ledger: `CONTROL=membership` swaps Blackpool for Reading in the 2010-11 Premier
League feed (verified falls from 34 to 33 and the season's notes name both clubs), and
`CONTROL=tier2` removes the three 2025-26 arrivals from the 2024-25 second tier (four problems
reported). Both controls refuse to run if their target is missing.

## Premier League shard: sources used

| Seasons | Counted source 1 | Counted source 2 |
|---|---|---|
| 1990-91, 1991-92 | rsssf.org `engpaul/FLA/<season>.html` | none reachable on the list, see below |
| 1992-93 to 2007-08 | rsssf.org `engpaul/FLA/<season>.html` | Premier League official data feed |
| 2008-09 | rsssf.org `tablese/eng09.html` | Premier League official data feed |
| 2009-10 to 2025-26 | rsssf.org `tablese/eng<end year>.html` | Premier League official data feed |

The Premier League feed is `footballapi.pulselive.com/football/standings?compSeasons=<id>`, the
data behind premierleague.com's tables pages (the league's own archive). It needs an `Origin:
https://www.premierleague.com` header. Its season ids are listed by
`/football/competitions/1/compseasons`; they are not sequential after 2013-14 (27, 42, 54, 79, 210,
274, 363, 418, 489, 578, 719, 777 for 2014-15 to 2025-26).

**Sizes found, not assumed.** The top flight had 20 clubs in 1990-91, 22 from 1991-92 to 1994-95
and 20 from 1995-96. The brief's "22 to 1994-95" is right only from 1991-92: the First Division
grew from 20 to 22 for 1991-92 (two relegated, four promoted).

**1990-91 and 1991-92 are `verified: false`.** No second source on the brief's list reaches them:
worldfootball.net refuses automated reads (HTTP 403 to curl, 402 to WebFetch), statscrew.com has no
English league, ESPN's feed starts later and the Premier League feed starts in 1992-93. Both seasons
carry supporting rows that do not count: 11v11.com (Association of Football Statisticians data, not
on the brief's list) and a Wikipedia spot check. Both agree with RSSSF on all 20 and all 22 clubs and
on every position. If the lead admits 11v11.com as a second source, both seasons can flip to
verified with no other change.

## Notes for the other shards

- worldfootball.net blocks automated reads (403 to curl, 402 to WebFetch) from this machine.
- statscrew.com covers North American soccer leagues only, none of the six in scope.
- ESPN's open standings feed answers at
  `site.api.espn.com/apis/v2/sports/soccer/<league code>/standings?season=<start year>`; for
  `eng.1`, `season=2001` returned only the league's season list with no table, while 2002 to 2008
  returned full-size responses (not used here, so not inspected).
- RSSSF's England pages for 2008-09 onward are `tablese/eng09.html` then `tablese/eng2010.html` up
  to `tablese/eng2026.html` (2025-26); `engpaul/FLA/` stops at 2007-08.
