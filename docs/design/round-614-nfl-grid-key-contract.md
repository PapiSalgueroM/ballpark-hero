# Round 614 contract: the NFL grid's answer key, judged from derived draft rounds and a complete Super Bowl record

Written 2026-09-16 by a read only contract agent, from four read only investigations (generator, judge, table, fences) plus its own verification pass. Every count below was read today by SELECT against Supabase `flawuiqbvjobmkfkauhw`, or off the committed file `scripts/data/nflGridPlayers.json`, or off the source in `C:\Users\antho\ballpark-hero\.claude\worktrees\r611-college-grid` (branch `r614-nfl-grid-key`, at `origin/main`). No file was edited, no harness was run, no edge function was called. Scratch: `C:\Users\antho\AppData\Local\Temp\claude\C--Users-antho-ballpark-hero\44bf65a6-5087-4325-b3e8-5708903af4e6\scratchpad\r614`.

The shape follows `docs/design/round-611-college-grid-contract.md`, which did this job for the College Grid and is live.

---

## 0. Where this contract corrects the board

The board entry for 614 reads: *"nfl_grid_players copied the corrupt draft round column: 503 players from the 1968 to 1982 drafts count as first round picks, and 20 real first rounders do not. Super Bowls I to IV are invisible because the key starts in 1970, so Joe Namath and Bart Starr judge no on Won a Super Bowl. Make pre 1970 Super Bowls unknown rather than no."*

Four corrections, each measured:

1. **The number is 567, not 503, and it splits two ways.** 275 careers are filed round 1 with a pick past their own draft year's first round (1970 to 1982). A further 292 are filed round 1 in the 1968 and 1969 drafts, which carry no round two row at all, so nothing in the repo can judge them either way. 275 must become a definite NO, 292 must become UNKNOWN. 503 does not reproduce under any method tried; the nearest figures are 509 (round 1 with a pick above 32) and 515 (above 28), both of which use a flat modern cutoff instead of the year's own boundary.
2. **The 20 missed first rounders are exact, but none of them carries a wrong round.** All 20 carry a NULL round with a correct pick, so deriving the verdict from pick against boundary repairs all 20 for free.
3. **The same corrupt column breaks "Round 6 or Later Pick" too, and the board does not mention it.** One bad column, two wrong answers for the same player.
4. **The Super Bowl gap should not be made unknown. It should be closed.** The board's own instruction leaves a known wrong answer on the page: the obvious unknown rule (career begins at the 1970 coverage floor) repairs 83 of the 89 affected careers and leaves 6 still answering a wrong NO, while turning 1,056 honest NO verdicts into free retries. The four missing Super Bowls can be counted from the same documented release the generator already reads, without moving the roster coverage floor and without touching the College Grid key. That is what this round does, so "Won a Super Bowl" comes out of the round as a complete fact with no unknown at all.

---

## 1. The defect, with proof

### 1a. The draft round column in `nfl_draft_picks` is not a verdict

`scripts/lib/draftRounds.mjs` (written in Round 611, and its header already names Round 614 as the second consumer) states the cause: the scrape defaults an unparsed round to 1. Rounds 2 and later are internally consistent, so the one fact the column can give is where round two starts.

Measured today over forfeit cleaned, `(year, pick)` deduplicated rows:

- 90 draft years, 1936 to 2025. 23 years have no round two row and therefore no boundary: 1942 to 1945, 1949, 1951 to 1955, 1957 to 1969. Every draft from 1970 has one.
- 1968 and 1969 are not partially wrong, they are uninformative: every clean row in each year is filed round 1 (1968 up to pick 462, 1969 up to pick 442).
- Rounds 2 and up form clean pick blocks: 623 blocks across 70 years, 2 overlapping, 4 not contiguous with the next round (3 of those since 1970). 1994 carries two stray rows (pick 223 filed round 4, pick 224 filed round 5).

### 1b. What that does to the key and to the page

`public.nfl_grid_players` holds 22,008 rows and agrees with the committed file row for row (the file says `generatedOn 2026-09-02`, `round 404`, 22,008 players, 4.92 MB). `src/lib/nflGrid.ts` lines 153 to 160 judge off that column:

```
if (id === 'first') return player.draftRound === 1;
if (id === 'late')  return player.draftRound !== null && player.draftRound >= 6;
```

Measured on the live table today, joining to the boundaries derived from the draft table:

| reading | count |
|---|---|
| rows in the key | 22,008 |
| `draft_round = 1` (today's YES on First Round Pick) | 2,193 |
| of those, pick past that year's first round (1970 to 1982) | 275 |
| of those, in a year with no boundary (1968 and 1969) | 292 |
| real first rounders the key denies (pick inside the boundary, round not 1) | 20, every one with a NULL round |
| first rounders under the derived rule | 1,646 |
| rows with a pick and no round | 204 |
| `draft_round >= 6` (today's YES on Round 6 or Later) | 3,917 |
| picks at or past their year's round 6 start | 4,272 |
| late picks the key denies | 355 |
| late picks the key falsely accuses | 0 |
| picks in a year with no round 6 row (1968, 1969) | 292 |
| careers with no draft record at all (today a NO on all three draft criteria) | 4,756 |
| careers marked undrafted | 4,534 |

Per draft year, the 275: 1970 26, 1971 38, 1972 45, 1973 43, 1974 27, 1975 45, 1976 9, 1977 19, 1982 23. 1978 to 1981 and 1983 onward are clean. The 292 are exactly the key's 1968 (138 careers) and 1969 (154 careers) cohorts, all filed round 1, with picks running to 446 and 431.

The 20 denied first rounders: Devin Bush 1995 pick 26, Anthony McFarland 1999 pick 15, Kellen Winslow 2004 pick 6, Carnell Williams 2005 pick 5, Ted Ginn 2007 pick 9, Chris Wells 2009 pick 31, Evander Hood 2009 pick 32, Phillip Taylor 2011 pick 21, Jon Baldwin 2011 pick 26, Robert Griffin 2012 pick 2, E.J. Manuel 2013 pick 16, Bjoern Werner 2013 pick 24, Odell Beckham 2014 pick 12, William Jackson 2016 pick 24, Patrick Surtain 2021 pick 9, Greg Rousseau 2021 pick 30, Ahmad Gardner 2022 pick 4, Jermaine Johnson 2022 pick 26, Dax Hill 2022 pick 31, Olumuyiwa Fashanu 2024 pick 11. The cause is the generator's own documented case at lines 241 to 249: the roster knows the pick, the pick table spells the name differently, so the round is left unknown rather than guessed.

### 1c. Super Bowls I to IV cannot be reached

`public.super_bowls` is complete: 60 rows, 1967 to 2026, and it holds all four (I 1967 Green Bay Packers, II 1968 Green Bay Packers, III 1969 New York Jets, IV 1970 Kansas City Chiefs, V 1971 Baltimore Colts). The generator maps a game to `season = year - 1` (line 164), and `OLD_SEASONS = { from: 1970, to: 2001 }` (line 79), so those four map to seasons 1966 to 1969 and no roster row of those seasons is ever pulled. SB V, the 1970 season, is the first countable title.

Confirmed on the live rows today: Joe Namath `sb_wins 0` (1970 to 1977, LA and NYJ), Bart Starr 0 (1970 to 1971, GB), Len Dawson 0 (1970 to 1975, KC), Ray Nitschke 0 (1970 to 1972, GB). The mechanism works from 1970 on: Johnny Unitas reads 1 (SB V). Herb Adderley reads 1 (SB VI with Dallas) when he also won I and II with Green Bay, so his count is understated rather than zero.

The investigation pulled `roster_1966.csv` through `roster_1969.csv` from the nflverse release the generator already reads (all four live, 188,277 / 201,935 / 211,557 / 208,047 bytes), filtered each to the winning franchise with the generator's own `OLD_ROSTER_STATUSES`, and joined to the committed key on normalised name plus birth date, which is exactly how the key identifies an id-less career. Result: **89 distinct careers in the key won one of Super Bowls I to IV and carry `sbWins 0` today** (SB I 24, II 29, III 28, IV 37). A name only join gives 104; the 15 extra are namesakes (three Aaron Browns, three Bob Browns), which is why the strict join is the rule.

### 1d. Why the unknown rule the board asks for is the wrong fix

Of the 89, 83 have first key season 1970 and 6 have 1971: Tommy Crutcher (GB), Zeke Bratkowski (GB), Boyd Dowler (GB), Sam Walton (NYJ, keyed to TEN), Ed Lothamer (KC) and Remi Prudhomme (KC). Verified on the live rows today: all six have `first_season 1971`, `sb_wins 0`, and **`draft_year` NULL**, so no derived rule keyed on the career's own columns can catch them.

Cost and coverage of each candidate unknown rule, measured today:

| rule | careers turned from NO to unknown | of the 89, repaired | still wrong |
|---|---|---|---|
| `first_season = 1970` | 1,056 | 83 | 6 |
| `first_season = 1970 or draft_year < 1970` | 1,061 | 83 | 6 |
| `first_season <= 1971` | 1,296 | 89 | unknown (the rule is a guess about gap length) |

The first two ship six known wrong NO verdicts. The third guesses how long a career gap can be, and it makes the criterion unanswerable in the NO direction for 1,296 careers to repair 89. Both fail the house rule that data correctness comes first, and the third also fails "derived, never typed".

### 1e. The page cannot say unknown at all

`achievement()` returns a plain boolean and falls through to `return false` for any id it does not know. `playerMatchesCell` is a boolean AND. `src/hooks/useFootballGrid.ts` line 194 does `const fits = playerMatchesCell(...)`, and the else branch at line 211 calls `addDailyGuess({ t: 'x' })` unconditionally. `guessesLeft` is 15 minus the action count and `useDailyPuzzle` ends the board at 15, so **a verdict the key cannot support costs a guess and can end the board**. Writing nulls into the table without teaching the lib and the hook to speak three verdicts would make that worse, not better.

### 1f. Live baseline

`game_completions` for `football-grid`: 19 rows, first 2026-07-03 20:52:35Z, last 2026-09-11 02:07:24Z, 2 in the last 30 days. For context on the same table: soccer-grid 89 (53 in 30 days), college-grid 35, nba-grid 24, hockey-grid 13, mlb-grid 3. The NFL grid is not dead the way the College Grid was before Round 611, so completions are a weak signal for this round and the fence output is the proof.

---

## 2. The rule this round applies

Stated so a builder cannot get it wrong.

### 2a. The round is derived from the pick, never read from the column

`scripts/lib/draftRounds.mjs` keeps `isForfeitRow`, `cleanDraftPicks`, `firstRoundEnds` and `inFirstRound` exactly as they are (Round 611's key depends on them byte for byte) and gains two exports:

- `roundStarts(picks)`: per draft year, the sorted list of `[round, smallest pick of that round]` for every round 2 and above, plus that year's largest known round. A year with no round two row is entered with an empty list, never omitted.
- `roundOf(year, pick, starts)` returns `{ round, exact }`:
  - `null` when the year has no round two row, or the pick is not an integer.
  - `{ round: 1, exact: true }` when the pick is below that year's round two start.
  - `{ round: r, exact: true }` when the pick sits inside a bounded block: `start(r) <= pick < start(next known round)`.
  - `{ round: rMax, exact: false }` when the pick is at or past the largest known round's start. That number is a **lower bound**, not the round.

The raw `round` column is never a verdict anywhere that imports this module. The module's header gains the block measurement above (623 blocks, 2 overlapping, 4 not contiguous, the 1994 strays named) and the note that two boundaries look wrong and are right: 1990 ends its first round at pick 25 and 1982 at 27, both consistent with forfeited first round selections, and 2008, 2016 and 2023 derive 31 rather than 32 for the same reason. Write that beside the code, because the next reviewer will flag it.

### 2b. What the key stores per career

`draft_year`, `draft_pick` and `undrafted` keep today's meaning and today's resolution paths. The `draft` object on the file keeps `year` and `pick` under those exact names and keeps the `'undrafted'` string, **because `scripts/genCollegeGridData.mjs` reads `keyDraft.year`, `keyDraft.pick` and `c.draft === 'undrafted'` and nothing else from this file**. Three fields are added or re-meant:

- `firstRound`: `true` when `inFirstRound(year, pick, ends)` is true, `false` when it is false, `null` when the year has no boundary or the career has no pick.
- `round`: the **exact** derived round, or `null` when the round is only a lower bound or cannot be derived. This replaces the copied column, which never becomes a verdict again.
- `roundMin`: the derived lower bound (equal to `round` when exact), `null` when the year has no boundary.

### 2c. The judge answers yes, no or unknown, and only a complete fact says no

`src/lib/nflGrid.ts` grows its own three state judge beside the engine's boolean matcher, exactly the way `src/lib/collegeGrid.ts` did in Round 611. Do **not** change `playerMatchesFranchiseCell` in `src/lib/gridEngine.ts`: three other sports read it.

- `export type Verdict = 'yes' | 'no' | 'unknown'`
- `judgeNflLabel(player, id): Verdict` per criterion.
- `judgeNflCell(player, cell): Verdict` returns yes when both labels are yes, no when either is no, unknown otherwise.
- `playerMatchesCell` stays exported and becomes `judgeNflCell(...) === 'yes'`. It is the yes counter the board builder and the qualifier floors use, so the engine, the archive generator and the existing fences keep working.

Per criterion:

| criterion | yes | no | unknown |
|---|---|---|---|
| Played for X | the code is in `teams` | otherwise | never (see the follow up in section 7) |
| Quarterback ... Defensive Back | the group is in `pos` | `pos` is non empty and lacks it | `pos` is empty |
| Won a Super Bowl | `sb_wins > 0` | otherwise | never, because the record is complete after 2d |
| First Round Pick | `first_round` is true | `first_round` is false, or `undrafted` is true | `first_round` is null |
| Undrafted | `undrafted` is true | the key holds a draft pick | the key holds neither a pick nor an undrafted mark |
| Round 6 or Later Pick | `round ?? roundMin` is at least 6 | `round` is exact and under 6, or `undrafted` is true | otherwise (no boundary year, no draft record, or a lower bound under 6) |

**Measure before writing the position unknown branch.** If no career in the regenerated key has an empty `pos`, do not write that branch: a branch that can never fire is dead code, and the fence cannot control it. Report the count either way.

### 2d. Won a Super Bowl becomes a complete fact, not an unknown

The generator gains one source and one rule, and nothing else moves:

- **Source.** `fetchSeasonRoster(1966)` through `fetchSeasonRoster(1969)`, the same module, the same release, the same cache directory. Only rows on the franchise `super_bowls` names as that season's winner, with a status in `OLD_ROSTER_STATUSES` (ACT, RES, INA, PUP), are read.
- **Rule.** A pre floor title is credited to a career when the row's normalised name plus birth date resolves, through the bridge `buildKey` already builds, to that career's id. At most one title per season. These rows **never** create a career, and they never touch `teams`, `seasons`, `pos`, `college` or `draft`. They add to `titleSeasons` and to nothing else.
- **Expected outcome, to be re-measured by the builder:** 89 careers gain at least one title (SB I 24, II 29, III 28, IV 37), Herb Adderley goes from 1 to 3, Johnny Unitas stays at 1 (he is inside coverage and must not be double counted), the key's title total goes from 2,383 to about 2,472.
- **Residue, recorded not filled:** the name only join finds 104, so 15 candidates are namesakes and are not credited. The generator prints them by name. A winner whose post 1969 rows carry a different spelling or no birth date is also not credited, and a career that ended before 1970 is not in the key at all.

Why this and not an unknown: the roster coverage floor stays 1970, so no career's teams, seasons, display name or first season moves, so `scripts/data/collegeGridPlayers.json` and the 75 live College Grid boards are untouched. And because no Super Bowl was played before the 1966 season, the criterion is then complete for every career in the key, which is exactly what "a no only comes from a complete fact" requires. An unknown would hand 1,056 careers a free retry to paper over a gap that four CSV files close.

### 2e. What an unknown costs the player, and why that is the point

`src/hooks/useFootballGrid.ts` gains the `useCollegeGrid` shape:

```
const verdict = judgeNflCell(player, cell);
if (verdict === 'unknown') { toast(...); return; }   // before any addDailyGuess
```

- yes: measure rarity, insert the selection, `addDailyGuess({ t: 'ok', ... })`. Keep the measure then insert order: `scripts/simGridRarity.mjs` anchors its two controls on `const rarity = await fetchRarity(` sitting above `.from('football_grid_selections').insert(` in this file, and aborts if that shape moves.
- no: flash red, `addDailyGuess({ t: 'x' })`. Exactly one place in `submitGuess` may add a miss.
- unknown: a toast naming what the records do hold, and **no guess spent**. Copy the `onRecord` helper shape from `useCollegeGrid.ts` lines 56 to 84: "Picked No. 8, round not on record.", "No draft pick on record.", "Not drafted."
- A name the key does not carry, and a player already on the board, keep returning before the judge, as today.

Who this protects, measured on today's table: 292 careers from the 1968 and 1969 drafts (Larry Csonka, 1968 pick 8, among them) can no longer be proven first rounders by anything in the repo, so they stop burning a guess on that cell instead of answering a confident YES that is wrong for 138 of the 1968 cohort's cellmates. 4,756 careers with no draft record stop answering three separate wrong NOs. 204 careers with a pick and no round stop being judged on a round the key does not hold. In exchange, 275 careers start answering an honest NO on First Round Pick and an honest YES on Round 6 or Later, and 20 real first rounders (Ahmad Gardner, Odell Beckham, Robert Griffin, Patrick Surtain and the rest) stop being rejected on a cell they answer.

### 2f. What does not change

The board ids (they are date seeds, so `football_grid_selections` and every rarity row survive), the 15 guess budget, the unlimited toggle, the daily save shape, the completion and its score, the search box and its source, the engine, its PRNG and its three difficulty branches, `football-grid-validate` (still deployed, still uncalled, retired in Round 615), and every other sport's grid.

---

## 3. The data plan

### 3a. `scripts/lib/draftRounds.mjs`

Additive only: `roundStarts` and `roundOf` as specified in 2a, plus the header note. Nothing existing changes, so Round 611's committed key is unaffected. This is gated (section 5).

### 3b. `scripts/genNflGridData.mjs`

1. Import `cleanDraftPicks`, `firstRoundEnds`, `inFirstRound`, `roundStarts`, `roundOf` from `./lib/draftRounds.mjs`. Run the pulled picks through `cleanDraftPicks` **before** indexing them by name, so both keys read the same rows: the raw table holds 28,015 rows including 75 forfeit placeholders and repeated whole draft imports, and cleaning leaves 26,939. The cleaning does not move any boundary between 1966 and 1984.
2. `buildKey` takes `{ control = {} }` as its second argument, the `buildCollegeKey` shape, and honours `control.rawRound` (read the scraped column as the verdict), `control.noClean` (skip `cleanDraftPicks`), `control.noTitles` (skip the pre floor title pass) and `control.looseTitles` (join pre floor titles on name alone). Without these, a control can only tamper with the output, which proves less.
3. `pullSources` gains the four winner season files and returns them as `titleRosters`, with their byte sizes recorded into `sourceRows` the way `oldFiles` already is.
4. Derive `firstRound`, `round` and `roundMin` per career, as in 2b. Keep `year` and `pick` resolution exactly as it is.
5. `renderFile`: `round: 614`; `coverage.draft` states the derived boundary rule and names the years with no boundary; a new `coverage.superBowls` states "titles 1966 to 2025; the four games before the roster floor are counted from the 1966 to 1969 winning rosters, joined on name plus birth date; the roster floor itself stays 1970"; `rules.draft` states the three state rule in words; a new `rules.firstRound` and `rules.late` state theirs.
6. Add `nameNorm` to each player, computed by the generator's own `normalizeName` over the display name, so the load copies it instead of deriving it in SQL. **Before changing that value, grep `src`, `scripts` and `supabase` for readers of `name_norm` on this table**: today's stored values were normalised from `display_name` with a trailing space left in ("terry miller 1970 1974 "), and the column is currently fenced by nothing.
7. `--check` keeps its exact contract: rebuild in memory, compare, write nothing, exit 1 with "STALE: the committed file differs from the derivation".

### 3c. `scripts/data/nflGridPlayers.json`

Regenerated. Keep the object per player shape (the file's `players` array is what `simNflGridData`, `simNflGrid` and `genCollegeGridData` all read). Do not convert it to the College Grid's columnar shape: that would rewrite three harnesses for nothing.

### 3d. The table

New `supabase/migrations/20260916_round_614_nfl_grid_draft.sql`, applied through the Supabase MCP and kept as the record:

```
alter table public.nfl_grid_players add column if not exists first_round boolean;
alter table public.nfl_grid_players add column if not exists draft_round_min integer;
```

RLS is already on with the single `"Allow public read"` policy; do not touch it, and do not open a write path. Run `get_advisors` after the DDL and read the function warnings, not just the table ones.

Reload, the Round 405 and Round 611 way, only after the commit holding the regenerated file is on GitHub, in two separate `execute_sql` calls:

1. `select net.http_get(url := 'https://raw.githubusercontent.com/PapiSalgueroM/ballpark-hero/<COMMIT_SHA>/scripts/data/nflGridPlayers.json', timeout_milliseconds := 120000) as request_id;` and note the id.
2. When `net._http_response` holds that id at status 200, one transaction: `begin;` `truncate public.nfl_grid_players;` then `insert ... select` over `jsonb_array_elements(h.content::jsonb->'players')`, reading `id`, `name`, `display`, `nameNorm`, `teams`, `seasons->>0`, `seasons->>1`, `pos`, `college`, `draft->>'year'`, `draft->>'round'`, `draft->>'pick'`, `draft->>'firstRound'`, `draft->>'roundMin'`, `draft = '"undrafted"'`, the three stat counts, `sbWins`, `dup`. The `where` clause is the fail closed guard and must carry all of: `h.id = <REQUEST_ID>`, `h.status_code = 200`, `h.content::jsonb->>'round' = '614'`, `h.content::jsonb->'coverage' ? 'superBowls'`, `h.content::jsonb->'rules' ? 'firstRound'`. Then `select count(*)`, and **commit only when the count equals the file's player count**, otherwise `rollback;`.

`net._http_response` rows are ephemeral, so the fetch and the insert happen in one short window; a request id cannot be recovered later.

### 3e. The College Grid must not move

`scripts/genCollegeGridData.mjs` reads this file for `keyDraft.year`, `keyDraft.pick`, `c.draft === 'undrafted'`, and the career's name, seasons, positions and colleges. None of those change. The round therefore has a hard gate: `node scripts/genCollegeGridData.mjs --check` exits 0 and `scripts/data/collegeGridPlayers.json` is byte identical after the NFL key is regenerated. If it is not, stop and find out why before shipping: the College Grid is live and its 75 boards are proven from that file.

### 3f. The page and the copy

- `src/lib/nflGrid.ts`: the verdict type, the judge, the select list (add `draft_year`, `first_round`, `draft_round_min`), and a rewritten DATA NOTE with the floors recomputed from the regenerated key.
- `src/hooks/useFootballGrid.ts`: the unknown branch as in 2e.
- `src/components/football-grid/FootballGridHowToPlay.tsx`: the bullet list currently says only "Wrong answers turn red. Retry costs a guess". Add one line in the site's voice, for example "If our records cannot settle a cell for that player, we say so and it costs you nothing."
- `src/data/gameContent/football.ts`, the `/football-grid` entry: keep the rules list truthful. "Every answer is checked against a career record of 22,000 players going back to 1970, right in your browser" stays true. The FAQ line "so a cell never depends on a guess about a guess" must change, because the round's whole point is that some cells the records cannot settle. Say instead that a guess costs a turn only when the records say no, and that a cell the records cannot settle is free.
- The six worked examples in `src/pages/FootballGrid.tsx` lines 152 to 159 all survive the new rule on inspection (Peyton Manning 1998 pick 1, Tom Brady 2000 pick 199), but two of them ride on the columns this round changes, so they are judged by the fence from now on (section 4).
- Then `node scripts/genSearchKeywords.mjs` and commit `src/data/searchKeywords.json`: the guide changes, and `simSiteSearch` section 7 fails on a guide that has changed since the index was built.
- The `/football-grid` snapshot in `public/` is re-rendered by `build:seo` and `scripts/data/lastmod.json` re-dates that one page honestly.

---

## 4. The fence

Extend the three harnesses the NFL grid already has rather than writing a fourth copy of them, and add the offline suite it does not have. Every check measures an outcome against a baseline, every control asserts it changed something before its section is judged, and a control run exits 0 only when its own section went red.

### 4a. `scripts/simNflGridData.mjs` (the key file and the table), `SIM_NFLKEY_CONTROL`

Sections 1 to 6 stay. Section 1's `okDraft` must stop accepting any finite round and instead require the new shape: `firstRound` in `{true, false, null}`, `round` either null or an integer that `roundOf` reproduces exactly, `roundMin` null only when the year has no boundary. Section 3's thirteen recorded careers keep their draft slots (all 1975 or later, all outside the corrupt set) and gain the new fields. Section 6 extends its select and its comparison to `name`, `name_norm`, `first_round` and `draft_round_min`, so the two columns that are unfenced today stop being unfenced. The header gains the `table` control, which the code implements and the docstring never mentioned.

New sections:

7. **ROUND IS DERIVED, NEVER COPIED.** Rebuild the boundaries from a fresh pull and check every career: `firstRound` equals `inFirstRound(year, pick, ends)`, `round` equals `roundOf(...)` when exact and is null otherwise, `roundMin` equals the lower bound. Report the three counts and hold them against the derivation, not against the file's own field. Print the block sanity reading (blocks, overlapping, not contiguous) and fail if the not contiguous count rises above the recorded 4.
   Pins, each already in the repo's record (Pro Football Reference and NFL.com, read 2026-09-02): Tom Brady 2000 pick 199 first no and late yes; Patrick Mahomes 2017 pick 10 first yes; Joe Montana 1979 pick 82 first no and late no; Dan Marino 1983 pick 27 first yes; Derrick Henry 2016 pick 45 first no; Kurt Warner undrafted yes and first no. Plus three the round repairs: Ahmad Gardner 2022 pick 4 first yes (a wrong no today), Odell Beckham 2014 pick 12 first yes (a wrong no today), and one 1970s career filed round 1 with a pick past its boundary, first no (a wrong yes today; pick it from the 275 and name it in the code with its year and pick).
   Pin for the honest loss: Larry Csonka, 1968 pick 8, First Round Pick **unknown**, because the 1968 draft carries no round two row.
   Controls: `rawround` (read the scraped column as the verdict; it must find at least 275 careers filed round 1 past their boundary and 292 in a year with no boundary). `noclean` (skip `cleanDraftPicks`; assert the input row count changes from 26,939 to 28,015 before judging).
8. **THE TWO KEYS NEVER DISAGREE.** `scripts/lib/draftRounds.mjs` promises in its header that the NFL key imports the same module "so the two keys can never disagree about who went in the first round". Measured today that promise is false 305 times over the 22,008 ids the two committed keys share: 273 where the NFL key says round 1 and the College Grid key says false, 32 the other way. Baseline after this round: **zero definite opposites**. Define agreement as "never a definite opposite", never as "identical": a null on either side is legitimate and 9,195 ids are null on the College Grid side today.
   Control: `twokeys` (flip one shared verdict in memory; assert the flip happened).
9. **THE TITLE RECORD IS COMPLETE.** Rebuild `sbWins` from a fresh pull including the four pre floor winner files. Every career the strict join credits must carry the title; the count of newly credited careers is reported and held at the first run's value (89 on the investigation's join, re-measure). Print the 15 loose only namesakes by name so nobody has to rediscover them.
   Pins: Joe Namath yes (SB III), Bart Starr yes (I and II), Len Dawson yes (IV), Ray Nitschke yes (I and II), Herb Adderley 3, Johnny Unitas 1 (not 2: proof the backfill did not double count an in coverage title), Tom Brady 7 unchanged.
   Controls: `notitles` (skip the pre floor pass; the five pins must lose their title). `loosetitles` (join on name alone; the credited count must rise from 89 to 104).

Every section prints its numbers. Runtime does not prove a harness ran; its output does.

### 4b. `scripts/simNflGrid.mjs` (the lib and the boards), `SIM_NFLGRID_CONTROL`

Section 4 is rewritten, because today it is tautological: it builds its expected value for First Round Pick by reading the very field the lib reads (`p.draft.round === 1`), which is why 275 false first rounders sat behind a green harness since Round 404. The expected value now comes from the derived boundaries (`inFirstRound` and `roundOf` over a fresh pull of the cleaned picks) and from the three state judge, so the section measures the key against the draft table rather than against itself.

Section 3's message and its code disagree today (it prints "clears 40 qualifiers" and fails at 30). Fix the message to match the code, keep the bar at 30, and recompute the measured floor.

Floors measured today against the derived rule, for setting the thresholds from headroom rather than from a number that felt right:

| criterion | thinnest franchises today | under the derived rule |
|---|---|---|
| First Round Pick | HOU 56, CAR 74, BAL 84, JAX 86 | HOU 56, CAR 75, BAL 86, JAX 88 |
| Round 6 or Later | BAL 105, HOU 119, CAR 128 | BAL 106, HOU 123, CAR 134 |
| Undrafted | PIT 167, BAL 213, MIN 213 | unchanged |
| Won a Super Bowl | CIN 70, HOU 74, JAX 79 | only rises, the backfill adds no NO |

The heaviest losses land on the old franchises (GB 149 to 101, BUF 142 to 101, MIN 122 to 97, PIT 117 to 99) and never near the bars. Section 3's floor of 30 and section 6's bar of 20 both survive. Re-measure after the regeneration and record both readings.

New section 7: **EVERY UNKNOWN HAS A NAMED CAUSE.** Count the yes, no and unknown per criterion across the key, print them, and fail if any unknown is not one of the three named causes: the draft year has no boundary, the career has no draft record, or the round is only a lower bound. An unknown from any other cause is a bug. Do not assert that the unknown share is small; assert that every one of them is explained. Today's expected reading for First Round Pick is yes 1,646, no about 15,314, unknown about 5,048.
Control: `nounknown` (make the judge return no instead of unknown; the explained count must collapse, and the section must go red).
Control `roundcol` on section 4 (compute the expected verdict from the raw column; section 4 must go red).

### 4c. `scripts/simNflGridPage.mjs` (the page), `SIM_NFLPAGE_CONTROL`

Sections 1 to 5 stay, with section 1 loosened only as far as the new judge requires (it currently requires a call named `playerMatchesCell`; it should require the hook to call the lib's judge, whatever it is named, and still forbid `functions.invoke(`).

New section 6: **ONLY A NO COSTS A GUESS.** Copy `simCollegeGridPage.mjs` section 2 verbatim in shape: find `submitGuess`, walk its braces, and assert that the not found branch and the duplicate branch return before the judge runs, that no `addDailyGuess` call sits before the end of the unknown branch, that the unknown branch contains no `addDailyGuess` and does `return`, that exactly one call in the whole body adds a miss, and that the catch adds a guess only on a yes. Read the code with comments stripped: a guard that reads its own prose proves nothing.
Control: `chargeunknown` (plant an `addDailyGuess` into the unknown branch through a `mustReplace` that aborts unless the target occurs exactly once).

New section 7: **THE COPY SAYS WHAT THE KEY HOLDS.** Parse the six claims already shipped in `src/pages/FootballGrid.tsx` (they are in the "Row + Column = Name, Name" shape `simCollegeGridPage` already parses) and judge every one against the committed key through the shipped judge. Assert each named player is still in the copy first, and fail with "drop or update the claim" if not, so the check cannot rot into a list of names nobody mentions. Also assert that every criterion the copy names is one the engine can deal.
Control: `claim` (rewrite one example to a player the key judges no; assert the old text was there).

### 4d. `src/test/nflGridOffline.test.tsx`, new, driven by `simNflGrid`

The NFL grid has no test that drives its real hook end to end; this is the biggest hole in its fence. Copy `src/test/collegeGridOffline.test.tsx`:

- Mock the supabase client to serve only `nfl_grid_players` out of the committed JSON, and to throw on every other table, on `functions.invoke`, on `rpc` and on `fetch`. Assert the stub was actually hit, so the rarity count and the selections insert really do throw on every correct pick.
- The NFL board comes from a date seed, not a pool, and `dailyBoardFor(todayStr)` is already exported, so drive a fixed list of dates (at least 30, including the dates the existing page fence uses: 2026-09-02, 2026-09-03, 2026-10-15, 2027-01-01).
- Win bot: nine different players, one yes per cell, board won in exactly 9 counted guesses, completion recorded once at 900.
- Loss bot: a player the judge calls a definite no, 15 times, board lost at 15 counted guesses, completion recorded once at 0.
- Unknown bot: a player the judge calls unknown on that cell, submitted 20 times, and the board must still be playable with 15 guesses left and nothing recorded. This is the check that the round exists for.
- Print measurements with a `NFLOFFLINE| ` prefix; the parent harness fails when the lines are missing.
- Control `NFL_OFFLINE_CONTROL=nocount`: every verdict that is not yes becomes unknown (the pre round world for the corrupt rows), counting the no verdicts it flipped so the harness can see it changed something. The loss bot must then fail to end any board.

### 4e. Harnesses that must stay green untouched

`simGridEngine` (its SPORTS list is nba, mlb and nhl, so it never reads `nflGrid.ts`, and the engine's PRNG and slice boundaries must not move or every past NFL board changes), `simGridRarity` (its two controls rewrite `useFootballGrid.ts` by exact string and abort if the measure then insert shape moves), `simGridCells`, `simGridPuzzlePool`, `simGridArchive` (the NFL grid publishes no archive, so no answer key page goes stale), `simQuotaHonesty` section 4, `simPublicWrites`, `simDailyPuzzleContract`, `playGridCls` on `/football-grid`. `simNoRivalNames` already skips `nflGridPlayers.json` by basename; any new data file this round writes must be added to that `SKIP_FILES` set or the guard will scan 22,000 player names.

---

## 5. Gates before the round ships

- `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` at 0 errors. **Read the exit code**, never an echo after the gate.
- `npm run build`.
- `node scripts/genNflGridData.mjs --check` exits 0 against the committed file.
- `node scripts/genCollegeGridData.mjs --check` exits 0, and `scripts/data/collegeGridPlayers.json` is unchanged in the diff. This is the proof that a live game did not move.
- `node scripts/runAllSims.mjs` green, and never while a build is running: the runner bundles each harness as it starts, so editing `src` or `scripts` mid run mixes two trees and the result is worthless. Several harnesses run over twenty minutes; do not wrap them in `timeout`, which reports 124 and reads as a red that was never there.
- Every control above run once and red, one at a time: `SIM_NFLKEY_CONTROL` rawround, noclean, twokeys, notitles, loosetitles, teams, famous, map, table; `SIM_NFLGRID_CONTROL` roundcol, nounknown, thin, cross; `SIM_NFLPAGE_CONTROL` chargeunknown, claim, invoke, copy; `NFL_OFFLINE_CONTROL=nocount`.
- `simCollegeGridKey` and `simCollegeGridPage` green (the shared module changed).
- The table reload: the committed count equals the table count, `simNflGridData` section 6 green afterwards, `get_advisors` run after the DDL with its function warnings read.
- The copy and the snapshot changed, so the full list from CLAUDE.md: `simAdsense`, `simBrand`, `simHeadTags`, `simHiddenPages`, `simHubs`, `simIndexNow`, `simIndexing`, `simInternalLinks`, `simNoRivalNames`, `simPrerender`, `simPrerenderBoot`, `simRetiredRoutes`, `simSchema`, `simSitemap`, `simSnapshotAssets`. Plus `node scripts/genSearchKeywords.mjs` and the committed `src/data/searchKeywords.json`.
- Browser: `ENGINES=chromium MSYS_NO_PATHCONV=1 ONLY=/football-grid node scripts/playGames.mjs` (Git Bash rewrites `ONLY=/route` into a Windows path without that prefix, and the route count in the harness output is the proof it ran), and `playGridCls` at or under 0.05 on `/football-grid`.
- Publish: only after `get_project` shows `latest_commit_sha` matching the pushed commit, then `deploy_project`, then prove the publish by grepping the live chunk for a string this round changed.

### What done measures

Offline, after the regeneration:

- 0 careers judged first round with a pick past their year's boundary (baseline 275).
- 0 careers with a pick inside their boundary judged not first round (baseline 20).
- 0 definite opposites between the NFL key and the College Grid key (baseline 305).
- 292 careers unknown on First Round Pick for the named reason, the 1968 and 1969 drafts, and the count of unknowns with any other cause is 0.
- Late pick yes count at the derived figure (baseline: the column says 3,917, the derived rule says 4,272, 355 of them denied today, 0 falsely accused).
- 89 careers gain a Super Bowl title (SB I 24, II 29, III 28, IV 37), Namath, Starr, Dawson and Nitschke judge yes, Unitas stays at 1, and 0 careers are unknown on Won a Super Bowl.
- Every board finishes offline both ways on every tested date, and an unknown never ends a board.
- Every franchise clears the recomputed floors on all twelve criteria.

Live, by SELECT and log reads after the publish, reported not gated:

- `game_completions` for `football-grid` per week against the baseline of 19 rows all time, 2 in the 30 days to 2026-09-16, last row 2026-09-11.
- `football_grid_selections` rows per day, and the share of board days where all nine cells were filled.
- 0 `football-grid-validate` POSTs (baseline 0; the page has not called it since Round 406, and Round 615 retires it).

---

## 6. Records to update in the same round

- `docs/PROJECT-STATE.md`: the round, what it repaired with the numbers above, the corrected 503 to 567 split, the three unknown classes and what each costs a player, and the follow ups in section 7.
- `docs/WORKBOARD.md`: move the 614 row from queued to live with the deployment id, and correct its text, which currently carries the 503 figure and the "make pre 1970 Super Bowls unknown" instruction this contract supersedes.
- `docs/design/round-614-nfl-grid-key-contract.md`: this file.
- `supabase/migrations/20260916_round_614_nfl_grid_draft.sql`: the DDL and the load procedure, kept as the record the way Rounds 405 and 611 kept theirs.
- The key file's own `coverage` and `rules` blocks (they are what `simNflGridData` section 4 reads, and they are how the next reader learns the rule).
- `src/lib/nflGrid.ts` DATA NOTE: the recomputed floors, and the note that the judge is three state.
- `scripts/lib/draftRounds.mjs` header: the new exports, the block measurement, and the short forfeited pick note for 1982, 1990, 2008, 2016 and 2023.

---

## 7. Follow ups, recorded not done

- **Franchise lists are truncated for the 1,213 careers whose first key season is the 1970 floor, and 640 of them show exactly one franchise.** A "Played for X" cell says a definite NO to a man who spent 1965 to 1969 with X and moved in 1970. The College Grid answered the same question the other way (a college miss is never charged). This is a real and separate source of wrong NO verdicts and it deserves its own round with its own measurement, not a late addition to this one.
- **The 1968 and 1969 drafts need a second source for their round lengths**, or 292 careers stay unknown on both draft round criteria. Nothing inside the repo can derive them: no year from 1957 to 1969 carries a round two row.
- **15 namesake candidates for Super Bowls I to IV** are not credited by the strict join and are printed by the generator. A second source (birth date on the draft or Hall of Fame side) could settle some of them.
- **The four non contiguous draft blocks** (1946 round 6, 1971 round 10, and 1994's two stray rows at picks 223 and 224) sit on a ratchet. If the count rises, the table has been re-imported and the derived rounds need re-reading.
- **Round 615** retires `football-grid-validate` (deployed, uncalled since Round 406, 204 cache rows) alongside `college-grid-validate`, and audits the five Connect 4 validators.
- **If an NFL grid archive is ever published**, it pulls this grid into `simGridArchive`'s scope, which recomputes every published answer against live data. Publishing one on the old key would have been wrong the day it landed; publish only after this round is live.

---

## 8. Risks

- **Scope.** This round changes the derivation, the key file, the table shape, the judge, the hook, the copy and three fences, and adds a test suite. Land it as one commit set on `r614-nfl-grid-key` with the gates run on a frozen tree, and commit early so a revert cannot cost the work.
- **A re-meant column.** `draft_round` stops being the scraped round and becomes the derived exact round. The table is truncated and reloaded in the same step and section 6 compares it to the file, so there is no window where the two disagree, but anything outside the repo reading that column would silently change meaning. A grep of `src` and `scripts` today finds only `src/lib/nflGrid.ts` and the generated types.
- **`name_norm`.** It is NOT NULL, it is not compared by any fence today, and its shipped values carry a trailing space. Reproduce it or change it deliberately, and fence it either way.
- **The College Grid coupling.** `genCollegeGridData.mjs` reads this key file. The contract keeps `draft.year`, `draft.pick` and the `'undrafted'` string untouched precisely so its output cannot move, and the gate proves it. Any change to those three fields turns a one game round into a two game round.
- **Fewer definite NOs.** First Round Pick, Undrafted and Round 6 or Later all gain unknowns, so a wrong guess on those cells is more often a free retry. Boards stay winnable and losable (the offline suite proves both), but a player who used to lose a guess to a confident wrong answer now sometimes learns nothing and spends nothing. That is the trade the house rule asks for.
- **The pre floor title pass must never touch anything but titles.** If it ever adds a team, a season or a position, `first_season` moves, the College Grid key moves, and 75 live boards need re-proving. The `notitles` control and the College Grid `--check` gate are the two nets.
- **Two source discipline on the new pins.** The titles rest on the nflverse winning rosters plus `public.super_bowls`, the same pair the key already uses from 1970 on. Verify each named pin (Namath, Starr, Dawson, Nitschke, Adderley) against Pro Football Reference and NFL.com before writing it into the harness, and record the date beside it the way section 3 already does.

## 9. Owner decisions

None. Nothing here costs money, no label is retired, no board changes, and no rarity row is reset. The only visible product change is that a cell the records cannot settle now says so instead of charging a guess, and four Super Bowl winning teams finally count.