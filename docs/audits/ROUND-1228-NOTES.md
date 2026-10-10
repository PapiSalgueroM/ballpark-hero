# Round 1228 notes: the Champions League league phase, part one (libraries nothing imports)

Written 2026-10-10 by the builder of Round 1228, desktop Claude lane. Branch `r1228-cm-ucl-libs`, cut from
origin/main at 09df145a. This is ROUND A of three: the facts and the pure libraries. Round B binds them to the
Club Manager engine behind an option, Round C draws the screens and moves the switch.

## What is in the round

| File | What it is |
|---|---|
| `scripts/data/cmUclFormat.json` | The format of the three European cups since 2024-25, each row with the pages it was read on, and the two league phase seasons as played (tables, round of 16, quarter-finals, semi-finals). |
| `scripts/data/cmUclFormat.receipt.json` | Who read it, how, what was not read, and the hash of the ledger. |
| `src/lib/leagueSlate.ts` | A legal league phase slate: pots, one home and one away from each pot, the association rules, matchdays. No football in it. A sibling of `leagueCore.ts`, which is untouched. |
| `src/lib/uclLeaguePhase.ts` | The Champions League's own numbers, the pots, the draw wrapper, the slate readers, the single table (the real eight steps), the zones, the play-off pairings, the fixed bracket. |
| `src/lib/leagueSlate.test.ts`, `src/lib/uclLeaguePhase.test.ts` | The cases a reader can check by hand. |
| `scripts/simCmLeaguePhase.mjs` | Sections 0 to 4 and 20 negative controls. |

Nothing under `src` imports the two libraries except their own tests (grep `leagueSlate|uclLeaguePhase` under
`src`: four files, all new). No existing file is edited. No player sees anything, so there is no What's New
entry and no guide sentence is owed.

## The ledger, row by row

Verified on two publishers on two hosts, none a wiki: F1 (36 clubs, eight matches, four at home), F2 (four pots
of nine, two from each pot, one home and one away), F3 (no club of your own association, at most two of any
other), F5 (three points a win; 1 to 8, 9 to 24, 25 to 36), F6 (the ten table steps in order), F7 (the play-off
pairings, the seeded club at home second), F8 (which play-off pairing feeds which seeded pair), F9 (the fixed
bracket), F10 (who hosts the second legs after the round of 16, since 2025/26), F12 (the first season is
2024-25), F15a (Europa League), F15b (Conference League), F15c (their zones), F16 (the points of 8th and 24th).

Marked and used by nothing:
- F4, the draw's escape clause: the regulations alone. A screen may say the game relaxes a rule when a draw is
  impossible. It may not say this is how UEFA does it.
- F13, the 2026/27 dates: Sky Sports alone here. Round B reads a second publisher before it places a mark.
- F14, who is in and the two European Performance Spots: NOT READ. The lead's ruling on Liverpool and Real
  Betis (the critic's answer 10) still needs its second publisher.
- F17, a five step table in the middle of the phase: no text found, not built.
- F18 (added by the fix pass), the order of the home and away nights, Article 17.02: no club plays more than
  two home or two away matches in a row, and each has one home and one away match across the first two
  matchdays and across the last two. The regulations alone, NOT BUILT: `layMatchdays` ignores venue. Round B
  or C builds it into the matchday layer or its card says the order of the nights is the game's own.

The bracket rule is not typed anywhere. Annex B of the regulations could not be opened, so section 0 derives
the rule from the two seasons as played (2024-25 on ESPN and CBS Sports, 2025-26 on UEFA.com and SuperSport,
the tables on ESPN and TNT Sports) and all ten readings give one rule: 15th to 18th feed 1st and 2nd, 13th,
14th, 19th, 20th feed 3rd and 4th, 11th, 12th, 21st, 22nd feed 5th and 6th, 9th, 10th, 23rd, 24th feed 7th and
8th; the 1 or 2 line meets the 7 or 8 line in the quarter-finals, the 3 or 4 line meets the 5 or 6 line, those
two meet in one semi-final, and 1st and 2nd are in opposite halves. That is what the scout assumed.

F16 for the binding round's balance print: 8th had 16 points and 24th had 11 in 2024-25; 16 and 9 in 2025-26.

## What differs between the three cups

| | Champions League | Europa League | Conference League |
|---|---|---|---|
| Clubs | 36 | 36 | 36 |
| Matches each | 8 (4 home) | 8 (4 home) | 6 (3 home) |
| Pots | 4 of 9 | 4 of 9 | 6 of 6 |
| Opponents a pot | 2 (one home, one away) | 2 (one home, one away) | 1 (pots paired 1 and 2, 3 and 4, 5 and 6: one of each pair at home) |
| Association rules | none of your own, at most 2 of another | the same | the same |
| Zones | 1 to 8, 9 to 24, 25 to 36 out | the same | the same |

So the Europa League is the Champions League's shape exactly and `swissSlate` draws it today. The Conference
League is not: one opponent from each pot is another pairing problem, and this round does not build it (nobody
plays it yet). `LEAGUE_PHASE_SHAPES` holds all three as data so Round B can bind them.

## Decisions taken, and where they differ from the scout's draft

1. The slate builder is `src/lib/leagueSlate.ts`, not a new export of `leagueCore.ts` (critic 2). `leagueCore.ts`
   is byte for byte what it was and none of its seven importers can gain weight.
2. The escape is a counted budget, never a switch (critic 11). The slate records two counts, `breaks` (matches
   between two clubs of one association) and `overCap` (opponents over the cap of two), and no three word
   level. Both are tried from the counting floor upward, the cap giving way before the ban, two steps each.
   Past that a recorded legal pattern is seated and the slate says `fallback` (the lead's decision 7).
3. A saved slate is `{ v, seed, clubs, fx, breaks, overCap, fallback? }`. Round B's sentence that names the
   fixture that broke the rule needs no new field: it is the fixture in `fx` whose two clubs share an association.
4. The knockout draw is keyed with `keyedRng` (critic 24, no new hash), and each seeded line's three coin tosses
   are keyed on the seed and that line's own six clubs, not on all 36 names. Keyed on all 36, a swap between
   30th and 31st would have re-tossed every tie in the projection; keyed by line, a pairing only moves when
   one of its own positions changes hands, which is what the draft asked of it.
5. The three opponent steps of the table count the clubs a side has met so far, read off the results. At the
   end of the phase that is the real rule; in the middle it is this game's reading (row F17 is not built).
6. `nextRoundTie` is one positional rule and nothing more (critic 24).

## What was measured

Section 1, 3,000 synthetic fields (seed sets 11, 23, 37, 1,000 each): every field was drawn exactly at its
counting floor, none fell back to the pattern, and every field with at most four of one association in a pot
and five in an association drew inside both rules (445 of 445, 449 of 449, 453 of 453). A six club association
with four in one pot has a floor of two over the cap and was always drawn at exactly two (the critic's count in
correction 5). A draw takes about 3 ms on the owner's PC, the slowest seen 52 ms, 1.0 to 1.6 tries on average.

Fields the game as shipped cannot make and a world editor can (one association swollen to 8, 10, 12, 18 and all
36 clubs, eight fields each): never null, always a legal slate with honest counts. 8 clubs: 8 of 8 at the
floor. 10 clubs: 8 of 8. 12 clubs: 8 of 8 (6 and 7 of 8 before the fix pass corrected the floor a second time,
see the last section). 18 clubs: none at the
floor and 5 of 8 on the recorded pattern, which is the bounded last resort doing its job. 36 clubs: 8 of 8
(every match is a break and the builder says so). These fields found a fault in the first writing of the
counting floor (it forgot the matches forced ACROSS pots and put a one association field 216 over a cap
nobody can break there); the floor in the library and its second writing in the harness were both corrected
before the round closed, and the 3,000 ordinary fields did not move.

Section 4, THE FINDING THE LEAD MUST RULE ON BEFORE ROUND B. The real season one field at 36, by the engine's own
rule read at that size, is England 5, Spain 5, Italy 5, Germany 5, France 4, Netherlands 2, Portugal 2 and nine
single clubs; it adds Real Betis, Liverpool, AC Milan and Lyon to today's 32 (Hoffenheim is already the 32nd).
Over 240 seeded saves, with pots by the save's own club strength:
- 209 of 240 (87.1%) drew with nothing given up;
- 29 of 240 (12.1%) needed one match between two clubs of one association, 2 of 240 (0.8%) needed two;
- a pot held five clubs of one association in 31 of 240 saves (12.9%): Italy 28 times, England 5 times;
- all 240 were drawn exactly at the counting floor, so every escape was forced by the pots, none by the search.
The critic's condition for pots by squad strength was "about 19 in 20 with nothing given up". The measurement is
about 17 in 20. By the same counting, a seeding rule that never seats a fifth club of one association in a pot
would make every one of these fields drawable inside both rules; that rule is not UEFA's and is not built.

## Proof, by runner result

- `r1228-a2` at d8e570e9: type gate 0, vitest 0, harness green, 15 controls fired, four fences green.
- `r1228-a5` at 8c61c5fb: type gate 0, vitest (both files) 0, harness green on all sections (6,671 checks),
  section 4 green, the seven new or changed controls fired, six fences green.
The closing run on the merged head is named in the round's finish report.

## The fix pass (2026-10-10, after two adversarial reviews)

One major and ten minors, all in this round's own eight files. Nothing a player can reach moved.
- The cap of two for the Europa League and the Conference League stood on the regulations alone. goal.com (30
  August 2024) and premierleague.com (15 June 2026) are the second publishers now, every number of all three
  shapes is a figure of a verified row, and section 0 only counts a figure for a publisher when one quoted line
  prints it in words about that figure. Controls `capsource` and `shapefigure`.
- A publisher's wrong score is cut from a quoted line (SuperSport, the Barcelona second leg); F12 quotes lines
  that say 2024-25 was the first season; the receipt names two blocks that stand on ESPN alone; F18 is new.
- The counting floor now counts an association with NO club in a pot (it pays its 2K visits there too). An
  association of eleven or more clubs missing from a pot was being drawn with a same association match the
  field did not force. Both writings of the floor shared the gap, so the harness gained a check that shares no
  line with either: [CLIMB], a copy of the bundle with a longer climb must never find fewer same association
  matches. Control `absentpot` fires on 16 of 24 fields. No field the shipped game makes moved.
- The order of the escape (the cap gives way before the ban) is held on every slate of section 1 ([ORDER]), with
  200 fields of two or three swollen associations that really climb: the cap gave way in 70, the ban after the
  cap's budgets in 29, 4 ended on the pattern. Control `order` fires on 114 slates.
- A plain field and each of the 240 season one fields is held one by one ([EXACT]), not by a band.
- Tests hold the three readers of a slate to one story about who is at home, the saved slate to saying it is
  the recorded pattern, and the wrapper to the cap of two.
- STILL TRUE AND WORTH KNOWING: the counting floor is a lower bound, not the true minimum, for fields only a
  world editor can make (13 clubs of one association with none in a pot: 3 of 8 at the floor; 14: none). Every
  such slate reports its true counts.
Proof at f7d996f7: `r1228-fix-a` (type gate 0, vitest 36 of 36, the harness GREEN at 7,021 checks, 24 controls
fired and an unknown one refused, seven fences green, the reviewer's own second writing found no fault, and the
branch merged with Release AT and with PR223 is green on both) and `r1228-fix-m` (the three mutations that had
survived every gate, the wrapper's cap at three and the floor taken back out: all five caught).

## Before anybody builds Round B: the other lane has the bind in a draft

Found on 2026-10-10 at 19:00 UTC, after this round's code was closed. Draft PR223, branch
`codex/manager-ucl-league-phase`, cut from the same origin/main as this round, binds a 36 club league phase into
`src/lib/clubManager.ts` with its own `src/lib/clubManagerUclLeague.ts`, the cards, the reference page and a
guide line. Its draw is a shuffled ring (no pots, no association rule), its table uses the same eight steps, its
play-off pairs are fixed and its round of 16 routes agree with the rule derived here. No file of Round 1228
overlaps it. The lead rules on how the two meet; until then nobody cuts Round B from this branch on the
assumption that the engine is still unbound.

## For whoever builds Round B

- Section 4 reads the engine's field at 36 by editing the BUNDLE line `const UCL_FIELD_SIZE = 32;`, but only
  when the engine itself still answers with 32 clubs. When the engine already answers with 36 (PR223 passes 36
  and keeps that line; the binding round will pass it as an argument) the section takes the field as it comes
  and patches nothing. CORRECTED BY THE FIX PASS: these notes first promised "exits 2" on PR223's tree. That was
  wrong: the line is still there, the engine answers 36, and the first writing of section 4 demanded exactly 32
  and went red (one failed check) on a tree holding both lanes' work. Only if the size becomes an argument while
  the engine still answers 32 and the line is gone does the harness exit 2: call `seasonOneUclField` with 36
  there.
- The order of the home and away nights is not built (ledger row F18, Article 17.02). Build it in
  `layMatchdays` or say on the card that the order of the nights is the game's own.
- Time one draw that walks every budget and seats the pattern before calling the builder on the main thread: a
  world editor's field can take a few hundred milliseconds on a runner core (the review saw 666 ms for 30 clubs
  of one association); no field the shipped game makes comes near it.
- `slateOpponents` answers an empty list for a club that is not in the slate, and `slateFixtureOf` null. A field
  of 36 that does not name my club must never reach the builder (critic 8).
- `drawUclLeaguePhase` answers null for a field that is not 36 different clubs each with an association. The
  season then plays the groups format and says so; it never pads.
- An offer to the other lane, not a debt: Soccer Career's `playLeaguePhase` (a shuffled ring, no pots, no
  association rule) could bind `swissSlate` and `sortedLeaguePhaseTable`. Its `LEAGUE_PHASE` constant is read by
  section 0 (source text, comments stripped) and fails the harness if it ever disagrees with the ledger.
- Do not trust: the scout's draw numbers (565 of 565 and the rest) as a baseline; the dates of F13 for a mark;
  any sentence about the two European Performance Spots.
