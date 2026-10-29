# Round 1542 notes: NFL Front Office, who scored

The builder's full closing report (commits, every runner request with its exit codes, the decisions and what is owed)
is `C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1542.md`; the runner summaries are in `rc-1542.txt` beside
it. This file is the part a later round needs from the repo itself.

## What it is

- `src/lib/gameLaws/nflDrives.ts`: the NFL story's drive arithmetic, moved out of `gameLaws/nfl.ts` with every body
  unchanged, plus `nflDrivePair` (the story's first two calls). `nfl.ts` imports and re-exports it. Proof: every told
  final of the gmGameDayFleet (5 sets, 22,800 finals a set, both sides) tells the same story as on `c9d188972`
  (receipts set 0 `1748d620`, 1 `10b7c19e`, 2 `b591aaf2`, 3 `b4fc7299`, 4 `48c1a52b`; control liftdrift fires).
- `src/lib/gmGameScore.ts`: `gmStoryKey`, the story stream's key; `gmGameDay.ts` tells the story on it.
- `src/lib/nflSeasonStats.ts`: the press half. The credit of every touchdown and sack of a told game (stream
  `${key}|credit`, no draw from the engine, no Math.random, no clock), the season block (opened at Week 1 only), the
  close (through the shared `src/lib/foSeasonClose.ts`), the readers and the load's clean, the rookie stamps, the
  page "?" rules.
- `src/lib/nflSeasonView.ts`: every word and table of the season card; only the lazy card reads it.
- `src/components/front-office/NflSeasonStats.tsx`: the bound season card (the shared FoSeasonStatsCard, unchanged),
  lazy, on the recap and on Standings' This season face with the shared `FoAwardHistory`.
- `src/components/front-office-shared/FoAwardBadge.tsx`, `FoAwardHistory.tsx`, `src/lib/foSeasonClose.ts`: sport free,
  for the NBA, MLB and NHL boards to switch to (owed).
- The Game Day tile: `GmGameDayMount.credits`, `gameDayView`'s fifth argument and `scorers`, `GameDayLaw.credited`
  and `creditWords`, the card's Touchdowns list.

## The save

`league.stats` (one season) and `league.awards` (40 seasons); a man's `awards` and `rookieSeason`. All optional; an
older save loads unchanged and keeps no lines until its next Week 1. The block is COMPACT on purpose: a line is
`[name, position, games, thrown, run in, caught, sacks]` (and a 1 for a first year man), nested by club then man; a
club is `[games, wins, points for, points against, touchdowns, field goals, safeties]`. `nflFoStats` spells it out as
the shared FoSeasonStats. The NBA's named shape cost 68K a season and took the real deep save to 728K, over the 700K
NFL budget; compact it is about 29K (the real recap save 685.5K, 655.8K without it).

## Harnesses and their controls

- `scripts/simNflSeasonStats.mjs`, sections 1 (lift and tile receipts, needs LIFT_BASE), 2 identities, 3 determinism,
  4 the rating effect (WR1 lift band 85 up against 73 down, margin 0.27 from measured headroom), 5 awards and the close
  over 10 deep franchises, 6 old save, 7 size, 8 copy and purity. Controls: liftdrift, dropone, nocatch, injured,
  swapsides, extradraw, unkeyed, randomcredit, tiebreak, rookieall, closetwice, oldopen, wholeroster, quote. About
  90 s on a runner.
- `scripts/playNflSeasonStats.mjs`, a browser walk at 320, 390 and 1280 on a served build; controls nonames and nocard
  need a second build of a mutated copy (the request lines are in the closing report).
- `scripts/simGmGameDay.mjs`: the mount list line for the lib and control statsstory; control unkeyed follows
  `gmStoryKey`. `scripts/simUsSeasonCentre.mjs`: control oddtd patches `nflDrives.ts`.
- `FrontOfficeOnePress.test.tsx` and `FrontOfficeDraftCapital.test.tsx` set this round's keys aside, the Round 1533
  precedent.

## Owed

The NBA's switch to the shared close, badge and history; the MLB and NHL binds; rookie stamps for the away year's draft
(`src/lib/nflGmCareer.ts`, 1533's); names on the match clock while watching; the shared card's small text; one guide
sentence for the other lane; the save budget and the /front-office weight row (387.6K head against 381.8K base,
gzipped, measured on a runner) are the lead's.
