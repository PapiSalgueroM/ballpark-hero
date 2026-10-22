# Round 1534: NBA, NFL, MLB and NHL My Career: the shop keeps its promises (the shop half)

Branch r1534-us-shop-promises, based on origin/r1523-sc-morale-plays at 41368514 (Round 1523's closing head, the
lead's base; it reaches main with Release BP). Brief: dukb-handoff/2026-10-10/briefs/brief-1534.md (section 0 binds,
then critic-1534.md). The closing report with every runner result is dukb-handoff/2026-10-10/results-g/finish-1534.md.
Round 1538 (brief-1538.md) is the second half: the paid lines, the Skill card's ceiling and their re-records.

## What a player gets
- The Invest aisle pays what its cards print, in all four sports. The index funds (7 percent), the wine label (10
  percent) and the NFL car dealership (9 percent) pay their printed rate on what was paid at the end of every season
  played; two index funds pay twice, a one time card once. The restaurant group (35 percent for 3M), the NFL wing
  franchise (35 percent for 2.5M), the four crypto punts (20 percent for 5x) and the NFL esports team (30 percent for
  3x) settle once, at the end of the next season: the whole payout lands in Cash, or the stake is gone. A settled
  stake leaves the save, so the one time esports team can be bought again.
- The Family Office adds 2 percent of Cash a season when Cash is above zero, after the steady returns (Soccer
  Career's office rule), and its card now says so: "Adds 2 percent to your cash every season".
- The lawyer cools a clean season twice as fast (18 instead of 9) in the four engines and on the Dirty Money desk,
  whose printed bans read the same rule. Seasons with dirty money held rise exactly as before.
- Cash stays in tenths: the steady money and the office pass through one carry, `shopCarry` (0.0001M steps, always
  under 0.1M), and the feed line says what was earned, what was banked and what waits.
- Card words that promised what nothing does now say what happens: the minority stake "Fanbase +10", the shoe line
  "Fanbase +12", the nightclub "Washes 4M, heat +3" (it always added 3 once; the NFL card said +5 a year), the
  offshore account "Heat +6". The summer camp (NBA, MLB, NHL) now lands its printed "Fanbase +8, morale +6" on buy,
  clamped at 100 and printed as landed.
- The "?" on the four pages carries the shop rule with a worked example (the last extra rule), and What's New has
  the entry. An old save earns from its next season; nothing is paid back. Selling lifestyle assets when broke sells
  the investments too, and the help rule says so.

## Where the rules live
- src/lib/usCareerAnnualBenefits.ts, appended below the two Round 905 functions (unchanged): US_SHOP_RETURNS (the
  cards' printed numbers), US_FAMILY_OFFICES, US_FAMILY_OFFICE_RATE, US_LAWYERS, usCareerSeasonCool,
  settleUsCareerShop, US_SHOP_HELP_RULE. Three new import lines at the top (keyedRng, summerCareerKey, the core type).
- The four engines: one new import line (separate from 905's), the heat drift `-usCareerSeasonCool(c.purchased, 9)`,
  the settle call straight after the pay line (Cash in tenths) and before the money app, the five card lines, and the
  summer camp's buy case (not the NFL, which sells no camp).
- Stakes draw on keyedRng(`${summerCareerKey(c)}|shop|${id}|${c.year}|${i}`) with c.year AFTER the season end moved
  it; the season stream never moves. The `shopCarry` field is typed only in usCareerAnnualBenefits.ts (no engine or
  core type changed) and is absent until a return lands.
- src/lib/careerDirtyMoney.ts: DirtyMoneyHost gains `purchased`, banAhead and bannedAhead take the cooling (default
  SEASON_COOL, whose line is byte for byte as it was), and wayNumbers computes it once:
  `const cool = usCareerSeasonCool(c.purchased, SEASON_COOL);` (the lawyerdesk control's single anchor).
- scripts/lib/usRival1313Inverse.mjs: LIFT_1534 puts every 1534 hunk of mlbMyCareer.ts and nhlMyCareer.ts back,
  each required exactly once, before its byte check against 1313's head (critic correction 2).

## Choices made here
- bankUsCareerFee is not written: it serves the banked lines, which are Round 1538's (R1).
- The help rule is written out, not built from the table at load: the NFL route's weight row (493) had about a
  kilobyte of room. Every number in it is held to the cards' own printed words by the unit file and by
  simUsShopPromises section 1, and the table is held to the same words, so neither can drift.
- simUsShopPromises' base arm is this tree with the round's engine hunks taken back out (simCareerForm's method),
  so a later round's engine edits sit in both arms; SHOP_BASE_CHECK=1 proves the rebuilt base equals 41368514's four
  engine files byte for byte.
- Section 9 does not claim "an old save loads to the same JSON" (critic correction 10): the round touches no load
  code, so that claim could not fail. It keeps the two outcome checks.

## Owed (not this round)
- Round 1538: the four brand answers, the ten corruption answers, the Skill card and its button, sections 6 and 7,
  the deck C digest re-record, the two test re-pins, the second fixture re-record, the walk's (c).
- Soccer Career's offshore card has the same unread promise (soccerCareerEngine.ts, "Hides earnings from the
  taxman"): session I's file.
- Guide sentences for the other lane (src/data/gameContent is theirs): football.ts "cools 9 a year while you stay
  clean" (18 with the lawyer now), and optionally a sentence on the shop's returns.
- usCareerProgramme.ts bankShare is the twin of the fee rounding (1538's concern).
- The life decks' and deck C's own `pot + 1` helpers and the unclamped meters of brief item 9.
