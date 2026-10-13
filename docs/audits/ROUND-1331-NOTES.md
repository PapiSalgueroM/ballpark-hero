# Round 1331 notes: five changes in three stoppages, the other dugout, the coach, the press fixture

Branch r1331-cm-engine-fixes, started from origin/main dec9075b (the Release BC record) on 2026-10-13.

## Step 1: the ledger and the rule module

- `scripts/data/cmSubsRuleSources.json`: every law line and league row with two sources on two hosts, the date read
  and the line quoted. Read 2026-10-13.
- `src/lib/clubManagerSubsRule.ts`: `subsRuleFor(leagueBaseId, seasonStartYear)`, pure, no imports.
  Five in three stoppages: La Liga, Serie A, Bundesliga, Ligue 1 from 2020-21; Premier League and EFL Championship
  from 2022-23. Every other league of the game is in `CM_SUBS_PARTIAL` and keeps three (no source found in the round's
  time for its 2026-27 rule).
- The Championship row is sourced as a standing EFL rule from 2022-23 (Irish Examiner, ESPN, a 2023 corroboration from
  leedsunited.com). No source dated 2026-27 itself was found, and none that reverses it: said in the ledger's caveat.
- Not covered on purpose: the Champions League has no row (cups and continental ties follow the career league's row),
  the nation jobs keep three, the 2019-20 restart plays three (seasons are ruled by their start year).
