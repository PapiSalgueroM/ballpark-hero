# Session 2026-07-22 — stale-build root cause + content

## The headline (read this first)

For ~4 hours the site served a **stale bundle** (`index-B0UNsdIT.js`, a ~14:33
build) even though `origin/main` kept advancing. Lovable synced each new commit
SHA but the served JS never changed. **Root cause: `src/pages/HockeyCareer.tsx`
was committed TRUNCATED at line 211** (ended mid-expression: `gameContext={{ p`
then EOF), introduced by `fc53e47`. `tsc --noEmit` does NOT flag it, but Vite/
Rollup (esbuild) fails hard:

```
HockeyCareer.tsx:211:67: ERROR: Expected "}" but found end of file
```

So the production build failed on every commit since 14:38 and Lovable kept
serving the last good bundle. **How it was found:** fresh clone of origin/main +
`npm install` + `npx vite build` in the sandbox reproduced the exact error.
**Fix:** restored the truncated tail to match the sibling career pages
(`gameContext={{ puzzleId: puzzle.id }}` + closing JSX + `HockeyCareerHowToPlay`
+ `GameNav` + `export default`). Verified: esbuild transforms the fixed file,
all four career pages parse, and full `tsc --noEmit` is clean.

**LESSON for the .bat gate:** `tsc --noEmit` is NOT sufficient to catch a
production-build break. Add an esbuild/`vite build` (or at least
`npx esbuild <changed>.tsx`) step, or the truncation gremlin can slip through
again. The truncation itself is the sandbox "stale/truncated write" gremlin
noted in CLAUDE.md — a file can get committed cut off mid-token.

## Shipped LIVE this session (DB-only, no build needed)

Six new Connections puzzles, each SQL-verified with a full ambiguity sweep
(every player's team set checked so no player fits another group):

- NBA (now 9): `nbaconn-008` Spurs/Suns/Rockets/Trail Blazers · `nbaconn-009`
  Pistons/Nuggets/Bucks/76ers
- NFL (now 8): `nflconn-007` Dolphins/Vikings/Bengals/Falcons · `nflconn-008`
  Steelers/Giants/Saints/Titans
- NHL (now 8): `nhlconn-007` Capitals/Flyers/Rangers/Blues · `nhlconn-008`
  Stars/Sharks/Islanders/Sabres

Sweeps caught: OBJ's Giants years missing from `nfl_player_team_stints`; a
"Michael Thomas" name-merge (NO+NYG); Alex English DEN+MIL; Mutombo DEN+PHI.

## Staged (on origin or in a .bat), goes live when the build rebuilds

- `7abad0e` (pushed): 8 two-source Missing lineups — Missing Eleven +4 (Super
  Bowl LIV + LII, both sides, pfr Chrome-DOM starters cross-checked vs
  Wikipedia 11/11 → 14 lineups / 8 Super Bowls); Missing Five +2 (2019 Finals
  G6 TOR/GSW); Missing Nine +2 (2013 WS G6 BOS/STL).
- `fc53e47` / `4d7b906` (on origin): career hard-mode, fail-closed grids/
  Connect4, NBA autocomplete — all blocked from building by the truncation.
- **`COMMIT_ROUND33.bat`** — self-sufficient: carries the HockeyCareer fix AND
  the new game. (`COMMIT_ROUND32.bat` = the fix only.)

## New game: "Rank 'Em" (backlog Order the List / Factle)

`src/lib/orderTheList.ts` + `src/pages/RankEm.tsx`, routed at `/rank-em`,
registered under "World & Olympic Games". Put five players in order by a career
stat, most to fewest; one submission; score = exact-position matches (200/slot,
1000 for 5/5). Daily + Unlimited, mirrors the Missing-game pattern
(`useDailyPuzzle` persistence). **14 deterministic rounds** across NBA/NHL/MLB,
every value pulled from Supabase and confirmed strictly distinct (no ties).
Coverage caveat baked in: `nhl_player_stats` truncates pre-1968 careers, so NHL
rounds use only players who debuted 1971+. No AI answer-check needed. Verified:
esbuild + full `tsc --noEmit` clean in a fresh clone. Runtime play-test pending
the rebuilt preview.

## Remaining action

Run `COMMIT_ROUND33.bat` (fix + game) or `COMMIT_ROUND32.bat` (fix only). Then
publish via Lovable `deploy_project`. Confirm success by checking the served
`index-*.js` hash flips off `B0UNsdIT` AND contains `the easiest clues stay
hidden`.
