# Round 670 contract: Club Manager plays extra time before penalties

The design contract below was written for two rounds, A (stoppage time goals and the aggregate in
front of the player) and B (extra time). Round 670 is part B only. The contract is copied verbatim
under "The contract as written"; this first section records what Round 670 actually built and every
place it departs from the text, with the reason.

## What Round 670 built, and where it departs from the contract

1. **Round A is not on main.** There is no `board2`: second half stoppage time is still the Round 472
   display only board, rolled at the whistle, and no event can land in it. So extra time sits on the
   clock the engine has today: the second half ends at 90 on the event clock, and extra time is one
   stretch over minutes 91 to 120, labelled 91' to 120'. `LiveMatch.et` and `MatchDetail.et` carry
   `{ from: 90, to: 120 }`. When Round A lands it moves `from` to 90 plus the second half board,
   which is why the field carries both ends rather than assuming them.
2. **Extra time is played in Champions League knockout ties only, not in the domestic cups.** The
   contract treats every domestic cup as playing extra time. The real rule differs by cup, by round
   and by season, and at least one is known to be the opposite: the Coppa Italia scrapped extra time
   for every one off game up to and including the quarter finals from 2024-25 (onefootball.com,
   2024-05-28), and football-italia.net says Coppa Italia matches level after 90 go straight to
   penalties. Seventeen cups across four eras could not be two source verified in this round, so a
   domestic cup keeps exactly the pre 670 rule (level after 90, penalties) and the bracket copy that
   says so stays true. A verified per cup, per season table is the follow up.
3. **The Champions League rule is verified.** UEFA's own announcement of the abolition
   (uefa.com, 2021-06-24) describes the old procedure ("extra time was played, followed by kicks from
   the penalty mark if no goal was scored") and names the unfairness "especially in extra time, of
   obliging the home team to score twice when the away team has scored"; Sports Illustrated
   (si.com, 2018-05-26) says the away goals rule "continues to apply here, so if the away team scores
   in an extra time, the home team must score twice". So before 2021-22 an away goal in extra time
   counted, and from 2021-22 extra time goals count like any other (the Round 507 sources). Folding
   the extra time goals into leg two and reading the tie again through `uclTieOutcome` with the era's
   rule reproduces both, which is what the engine does.
4. **The deflator is for extra time, not for an added stretch.** Section 3.3's deflator balances
   Round A's stoppage stretch. For Round 670 the round spec asked for a constant deflator so goals per
   match do not move with extra time. Extra time only ever happens in a match that settles a knockout
   tie (a second leg, a one leg tie, the final), so that is the population it holds: those matches
   draw their lambdas multiplied by `ET_DEFLATOR`, the manager's and the AI's alike, solved as
   1 / (1 + P * 30 / 90) where P is the engine's own measured share of those matches level when the
   ninety minutes run out. League, group and first leg matches are untouched to the byte.
   `scripts/simExtraTime.mjs` holds it with three arms (real, no extra time and no deflator, extra
   time without the deflator) and a tolerance set from measured headroom.
5. **The aggregate on screen is Round A's.** Round 670 writes `report.tie` on every second leg (the
   aggregate after extra time, the away goals flag and whether my club went through) because the
   extra time line needs it, and prints it only on a second leg that went to extra time. The pre match
   line, the live Agg line and the aggregate line on every second leg report stay with Round A.
6. **Momentum.** A match with extra time gets twelve ten minute buckets rather than folding thirty
   minutes into the 81 to 90 bucket, and the chart's axis reads 0', 60', 120' on those.

The fence is `scripts/simExtraTime.mjs` (the contract's `simAddedTime.mjs` is Round A's).

## The contract as written

Key: `stoppage-time`. Effort as estimated: 28 hours over two rounds.

### Summary

Not live. Club Manager has shown a stoppage time board since Round 169/472 (detail.added, "FT 90+4'") but no goal, card or chance can land in it: every minute is drawn inside 1..45 and 46..90 and the board is rolled at the whistle after the goals. Club Manager has no extra time at all: a level knockout, single leg or second leg, goes straight to penalties (playMyMatch 13343, advanceUclBracket 10098, advanceCupBracket 10594), while the engine's own comments and the bracket copy talk about "after 90" and "extra time". Soccer Career already plays extra time (Round 546) and already prints the aggregate (563, verified 565) but has no minutes, so nothing there is in scope. The aggregate in Club Manager is PART: the bracket card shows it once a tie is over and a small first leg line while pending, but the pre match screen, the live scoreboard and the full time report of a second leg never say what the tie stands at. Contract: second half only stoppage time goals on a monotone clock (first half added time stays display only, documented), extra time as one 30 minute stretch appended to the second half lists in every knockout that is level when the board runs out (single leg on the night, second leg on the aggregate, AI ties too), a constant deflator so goals per match do not move, and one tie context helper feeding MatchCentre, LiveSimScreen and MatchReportCard. Two rounds recommended: A (stoppage goals plus aggregate) then B (extra time).

### Files

- `src/lib/clubManager.ts`
- `src/components/club-manager/LiveSimScreen.tsx`
- `src/components/club-manager/MatchReportCard.tsx`
- `src/components/club-manager/MatchCentre.tsx`
- `src/components/club-manager/UclBracketCard.tsx`
- `src/components/club-manager/CupBracketCard.tsx`
- `src/hooks/useClubManager.ts`
- `src/pages/ClubManager.tsx`
- `src/components/club-manager/ClubManagerHelp.tsx`
- `src/data/gameContent/clubManagement.ts`
- `src/pages/WhatsNew.tsx`
- `src/data/searchKeywords.json`
- `scripts/simAddedTime.mjs`
- `scripts/simLiveSim.mjs`
- `scripts/simMatchDetail.mjs`
- `scripts/simLiveMatch.mjs`
- `scripts/simMatchScreen.mjs`
- `scripts/simUclLegs.mjs`
- `scripts/simCup.mjs`
- `scripts/playClubManager.mjs`
- `docs/PROJECT-STATE.md`
- `docs/WORKBOARD.md`

### Save shape

All additive and optional, SAVE_VERSION stays 3, no reset and no loadCareer migration. LiveMatch gains board2?: number (the second half board, decided when the regulation stretch is drawn) and et?: { from: number; to: number } (set only when extra time was drawn; its events live in the existing h2My, h2Opp, h2Play, h2Cards, h2OppCards, h2Injuries lists with minutes above 90 + board2, so no merge site changes). MatchDetail gains et?: { from: number; to: number }; added keeps its shape but h2 is COPIED from live.board2 rather than rolled at the whistle. TimelineKind gains 'extratime'. MatchWeekReport.decidedBy widens to 'regular' | 'aet' | 'pens' and the report gains tie?: { leg: 1 | 2; aggMine: number; aggTheirs: number; byAwayGoals?: boolean }. UclTie and CupTie gain aet?: boolean (the tie's score includes extra time goals, pens is set only when level after it). MatchFacts gains tie?: { leg: 1 | 2; firstLegMine?: number; firstLegTheirs?: number; awayGoalsRule: boolean }. Older saves: every reader treats absent as "no board known, no extra time, one leg"; a match paused mid second half with h2Drawn and no board2 gets ensureAddedTime() lazily (board from the regulation stoppages exactly as the whistle computes it today, then the added stretch drawn) in the same places ensureFirstHalf runs; a report written before this round has decidedBy 'regular' or 'pens' and no tie, and renders as it does now; an old bracket has no aet and prints "Level after 90" as it does now.

### Fence

scripts/simAddedTime.mjs (sim* name so runAllSims finds it), on the simLiveMatch shape: seeded stream, esbuild bundle of the real engine, a control rewrites a COPY of the engine under .sim-control and refuses to run if its anchor string is not found exactly once. Sections: (1) minutes: over at least 2,000 quick sim matches every h2 event minute is at most 90 + board2 (or et.to), none sits in first half added time, and the share of second half goals above 90 is printed and held above a floor set from the measured board distribution; (2) the board is the referee's: on the live path the board2 read at 90 equals report.detail.added.h2 on every match and still satisfies base plus stoppages in (45,90] up to 8; (3) balance, three arms of at least 3,000 matches on the same seeds: real engine A, B with the added stretch removed AND the deflator removed, C with the stretch kept and the deflator removed; |mean goals A minus B| within a tolerance set at twice the largest between seed gap over three seeds (n printed, refuses to run under n), and C minus B at least the expected gain so the section carries its own positive signal; (4) extra time: at least 40 knockout matches level at the board (coverage failure otherwise), et present iff knockout and level, events inside (90+board2, 120+board2], decidedBy 'aet' iff extra time goals differ, pens iff level after it, won reads the night including extra time, a level league match never gets it, a first leg never gets it, and uclTieOutcome driven directly with extra time goals folded into leg two under both eras; (5) AI ties: every pens tie is level after extra time, every aet tie with an unequal score has no pens, counts printed and at least one of each; (6) screens through react-dom/server: MatchReportCard prints "90+3'" for a 93rd minute scorer and "(AET)" on an aet report and "on aggregate" on a leg two report, LiveSimScreen at clock 92 prints "LIVE 90+2'" and an Agg line on a second leg, MatchCentre prints "from the first leg" on leg two facts; (7) simLiveMatch section 6 rerun inside: kick off, startSecondHalf, startExtraTime when offered, resumeMatch equals the quick sim JSON. Negative controls, ADDED_TIME_CONTROL=nostretch (section 1 red), whistleboard (buildMatchDetail rolls the board again: section 2 red), nodeflate (section 3 red), noet (section 4 red), etleague (needsExtraTime ignores the competition: section 4 red), noagg (matchFacts drops tie: section 6 red), nolabel (clockLabel prints bare minutes: section 6 red); each must turn only its named section red. Ratchets in the same commit: simLiveSim line 90 (second half minute cap), simMatchDetail line 108 (card minute cap), simLiveMatch section 7 ("minute 91 refused" becomes "a minute past the board refused") and its nocut anchor if changeLive's recut lines move, simMatchScreen section 1 reads the copied board, simUclLegs and simCup learn aet; simHarnessAnchors proves every control anchor still matches.

### Acceptance

tsc zero, npm run build clean, full node suite green on a frozen tree with the ratchets above. simAddedTime green with its closing summary line and real exit code, all seven controls firing on their named section only, and it prints: n matches per arm at or above 3,000, goals per match A versus B inside the stated tolerance, share of second half goals in 90+ (expected roughly 7 to 10 percent), at least 40 extra time matches, at least one AI aet tie. simLiveMatch section 6 green with the extra time path included. Browser at 390 by 844 through playClubManager (or a new playAddedTime): a live match at 4x reaches a frame where data-cm-live-minute exceeds 90 and the badge reads LIVE 90+n', document.documentElement.scrollWidth is at most 390 throughout, the report card shows the 45+n' and 90+m' chips and at least one scorer line with a 90+ label when one exists; on a save built by the engine and seeded at a round of 16 second leg week, the pre match card contains "from the first leg" and the live scoreboard contains "Agg". simNoInventedQuotes and simNoRivalNames unchanged and green (no speaker in any new copy). Every new sentence free of em and en dashes (grep the diff).

### Risks

Balance: the added stretch adds about 8 percent more goals in the manager's own matches if the deflator is wrong or omitted; section 3 is the guard and its tolerance must be measured, not guessed. Clock: first half added time cannot hold events without a continuous clock (a 45+2 goal would be minute 47, colliding with the second half in every "minute <= m" filter, in distinctMinutes' shared minute book and in the 46/90 anchors of five harnesses), so this contract keeps it display only and documents it; whoever lifts that limit later must move the whole engine to an offset clock. Anchors: simLiveMatch's nocut control patches the exact recut lines of changeLive and the noplay control patches drawSegmentPlay's first line; any edit to those lines must update the CONTROLS table in the same commit or simHarnessAnchors goes red. Rules data: the pre 2021/22 era counted away goals scored in extra time; the contract folds extra time goals into leg two before uclTieOutcome, which reproduces that, but it must be two source verified with dukb-data-guardian before coding. The live viewer's terminal windup, feed window and change sheet are keyed to 45 and 90 in several places and each needs the stage's end minute; simMatchScreen section 6 will catch a page that draws extra time itself instead of through the engine. Record strings (resultLog.score, h2h, biggestWin) carry the aet score without a marker, accepted and documented. Save size grows only during a match. Effort is honest at 28 hours only if split into two rounds; a single round risks the review finding the extra time branch untested on the live path.

### Full text

```text
DESIGN CONTRACT: stoppage time goals, extra time, and the aggregate in front of the player (Club Manager)

Source: a player's footer report. "In manager mode for soccer, make it so goals can be scored in stoppage time (such as 90+5), and also for a cup game if it goes to extra time there can be a goal in 91+, but only if the game is a tie in the first 90 minutes. Also, in the UCL, show the aggregate score so the player knows what the score is after 2 legs."

0. GATE QUESTIONS

Is it already live? No, and the split matters.
- Stoppage time on the clock has shipped since Round 169 (detail.added) and Round 472 (the board is worked out from the goals, cards and injuries in that half; the report prints 45+n' and 90+m'; the live badge prints FT 90+m'). But nothing can happen in it. Goal minutes come from distinctMinutes over 1..45 and 46..90 (pickMyScorerLines at 12574, drawSegment's window 45..90 at 12551, drawSegmentPlay's hi = inp.to), and the board is rolled at the whistle in buildMatchDetail (13005) AFTER every minute is fixed. A 90+5 goal is impossible today.
- Extra time does not exist in Club Manager. playMyMatch sends a level single leg knockout straight to penalties (13343) and a level aggregate on a second leg straight to penalties (13321); advanceUclBracket (10098) and advanceCupBracket (10594) settle level AI ties with a coin flip and pens: true. The engine comment at 9754 and UclBracketCard's copy ("Level after 90") describe a rule the engine does not play. Soccer Career plays extra time since Round 546 but has no match minutes, so "a goal in 91+" has no meaning there and nothing in that game changes.
- The aggregate. Soccer Career: DONE (Round 563, seen on screen by Round 565). Club Manager: PART. UclBracketCard prints the aggregate as the tie's headline once leg two is recorded, and an 8px "First leg 2-1. Second leg at X." while pending; the leg one report pushes an event line with the score. What never says the aggregate: the pre match screen (MatchFacts carries no tie), the live scoreboard during leg two, and the full time report of leg two (it prints the night's score and "Through on penalties" or nothing). That is exactly the moment the player asked about.

Does an existing engine power it? Yes, and it must: the one soccer match engine in src/lib/clubManager.ts that quick sim, Play Live, fast forward, calendar sim and the AI brackets all go through (Round 504: "every way of playing a match goes through kickOff", simMatchScreen section 6 holds the two ways to one JSON). Soccer Career's hand off (soccerCareerToManager.ts) inherits it. No new engine, no per competition fork: what differs per competition is data (does this fixture play extra time, is this leg the deciding one, does this era read away goals), and the draw is one function.

Retention: this is depth on the second biggest game and the most watched screen in it (the live match, Round 504). Replay value comes free: a 90+4 equaliser and a cup tie won in the 118th minute are the stories a manager retells.

1. OBJECTIVE IN ONE SENTENCE

Football keeps going after the board goes up: goals can come in second half stoppage time, a level knockout plays thirty minutes of extra time before penalties, and a Champions League tie always tells you where it stands.

2. CORE LOOP (what changes for the manager)

- Watching live, the clock no longer stops at 90. The board goes up at 90 ("90+4"), the clock runs to 94, and anything the engine committed for those minutes plays out on the pitch: a chance, a corner, a booking, a goal. The report then reads "Mbappe 90+3'".
- In a knockout that is level when the board runs out (single leg: on the night; second leg: on the aggregate, after away goals in the eras that had them), the whistle does not go. "Extra time" appears, the clock runs another thirty minutes as one stretch, and a goal in it settles it. Still level: penalties, exactly as today. The report headline says VICTORY (AET) or DEFEAT (AET).
- Before a second leg, the match centre says "You lead 2-1 from the first leg" (or trail, or level), and "away goals count" in the eras that have them. During it, the scoreboard carries "Agg 3-2". At full time the report says "Through 4-3 on aggregate", "Out 2-3 on aggregate", "Level 3-3 on aggregate, through on away goals", "after extra time", or "on penalties".
- Decision N differs from N-1 because the added minutes are real: a manager chasing a game at 88 knows there are four more minutes of football to chase it in, and a knockout manager at 89 level knows the bench decision he makes now plays into extra time.

3. THE MODEL (deterministic engine decides; prose describes)

3.1 One clock, second half only. Minutes stay integers on the monotone clock the engine already uses: 1..45, 46..90, and now 91..90+board2 for second half added time, and 90+board2+1..120+board2 for extra time. First half added time stays what it is today: a board that goes up ("45+2") with nothing in it. Reason, written into the code comment: a first half stoppage goal would be minute 46 or 47 and collide with the second half in every "minute <= m" filter (liveStatsAt, keepUpTo, myOnPitchAt, liveGoneIds, the momentum buckets), in distinctMinutes' one shared minute book per match, and in the 46/90 anchors of five harnesses. Lifting that limit means an offset clock (second half starts at 45 + board1) touching every anchor, and is a round of its own if ever wanted. The What's New says "second half only".

3.2 The board is decided when the second half is drawn, then the added stretch is drawn inside it. In drawSecondHalf: draw the regulation stretch (45, 90] exactly as today; compute board2 = clamp(2 + stoppages in (45, 90] + ri(0, 2), 2, 8), which is the Round 472 formula moved from the whistle to the moment the half exists (same inputs, same numbers, simMatchDetail's stoppage section stays green); store live.board2; then call drawSegment for (90, 90 + board2] with lambdas lamMine * board2 / 45 and lamOpp * board2 / 45 (the Round 119 identity: Poisson(L) over a half is Poisson(L * k / 45) over k minutes), appended to the h2 lists and h2Segs. The added stretch draws goals, play, cards and the other dugout's changes at the per minute rate (drawOppSubs is already length scaled); it does NOT roll an injury (drawSegmentInjury is one roll per stretch at the per half rate, so a four minute stretch would carry a whole half's injury chance) and stoppages inside added time do not extend the board (documented simplification). A recut at M < 90 (changeLive) redraws (M, 90] as today, recomputes board2 from the new regulation stoppages (the board has not gone up yet, so this is honest), and redraws the added stretch; a recut at 90 <= M < 90 + board2 keeps board2 and redraws (M, 90 + board2] at the same per minute rate. changeLive's cap becomes 90 + board2 (the help text promises a change at any minute; the bench stays open while the clock runs). buildMatchDetail copies live.board2 into detail.added.h2 and never rolls it; added.h1 is computed at the whistle as today.

3.3 Balance does not move. The added stretch alone adds about board2/45 of a half's goals, roughly 8 percent per match in the manager's fixtures and nowhere else (AI v AI matches are one Poisson draw in simScore). Round 546's rule applies: solve, do not tune. halfLambdas (11316), the one place both halves get their numbers, divides by (45 + MEAN_BOARD2) / 45 instead of leaving the half at 45 minutes, where MEAN_BOARD2 is the engine's own mean second half board measured over several thousand halves and written as a named constant with the measurement in its comment. Expected goals per match are then unchanged to within noise, matchFacts' odds (its own copy of the full match formula at 15261) stay the odds of the whole match, and the harness proves it with three arms (section 3 below). The share of second half goals in 90+ falls out as about E[board2] / (45 + E[board2]), roughly 8 to 9 percent, printed by the harness.

3.4 Extra time. needsExtraTime(state, entry, live): true only when (fx.competition is 'cup' or 'uclKo') and the fixture is the deciding match (not a first leg, firstLegTonight already exists at 13233) and the match is level at 90 + board2: on the night for a single leg, on the aggregate for a second leg with uclTieOutcome({leg1, leg2 at 90}, uclAwayGoalsApply(era)).winner === null. League and group matches never qualify. drawExtraTime(state, entry, live): one stretch (90 + board2, 120 + board2] drawn by drawSegment with a fresh secondHalfLambdas call at the level score and the eleven still standing (reds and subs already accounted for), scaled by 30 / 45, appended to the h2 lists and h2Segs, with live.et = { from, to } set and no separate possession draw (possH2 stands for the whole second period). No extra time board and no interval at 105: one stretch, documented. Substitutions: three a match as today, allowed while the clock runs. Both paths call the same function in the same order: startExtraTime(career) for the viewer (the shape of startSecondHalf: draws if not drawn, moves live.minute), and playMyMatch draws it itself when !live.et && needsExtraTime, before the shootout branch. The shootout branch then reads the score after extra time: single leg still level -> pens as today; second leg -> fold extra time goals into leg2 and run uclTieOutcome again with the era's away goals rule (before 2021/22 an away goal in extra time counted, which this reproduces; VERIFY with dukb-data-guardian, two sources, before coding), winner null -> pens. decidedBy: 'regular' | 'aet' | 'pens'; 'aet' when extra time goals differ. won and drawn read the night INCLUDING extra time (a 2-1 aet is a W in the form guide and the record, the way competitions record it); on a second leg the night's result stays the night's, per Round 507. The two decidedBy === 'regular' gates at 13829 and 13835 (biggest win and defeat) treat 'aet' as regular, since it was won on the pitch.

3.5 The AI plays extra time too, or the bracket copy lies. advanceUclBracket and advanceCupBracket: when a settled 90 minute score is level (single leg) or the aggregate is level after uclTieOutcome (two legs), draw simAiExtraTime = simScore with the same boosts scaled by 30 / 90, add the goals to the tie's score (leg2 for a two legged tie), set aet: true, recompute the outcome; still level -> pens as today. UclBracketCard and CupBracketCard: "Level after 90. X won it in extra time." when aet and no pens; "Level after extra time. X win on penalties." when aet and pens; the old "Level after 90. X win on penalties." only for a tie with no aet, which is every tie written before this round. recordMyUclTie and recordMyCupTie carry aet from the report.

3.6 The aggregate, one helper, three screens. myTieContext(state, entry): for a uclKo entry with uclLeg, reads state.uclBracket for my tie and returns { leg, firstLegMine, firstLegTheirs, awayGoalsRule } in my orientation (the tie is stored home first; iAmHome decides). matchFacts adds tie from it; MatchCentre renders one line under the VS block: leg 1 "First leg. The second leg is at their ground." (or yours); leg 2 "You lead 2-1 from the first leg" / "You trail 0-1" / "Level at 1-1", plus " Away goals count." in the eras that have it. LiveSimScreen on leg 2 renders "Agg {firstLegMine + myGoalsNow}-{firstLegTheirs + oppGoalsNow}" under the score, updating with the feed, marked data-cm-agg. playMyMatch writes report.tie for both legs (leg 1: the leg as the aggregate; leg 2: the total after extra time, byAwayGoals from uclTieOutcome); MatchReportCard prints one aggregate line in place of penLine on a two legged tie: "First leg. 2-1 on aggregate, second leg away" / "Through 4-3 on aggregate" / "Out 2-3 on aggregate" / "Level 3-3 on aggregate, through on away goals" / "... after extra time" / "... on penalties". Single leg ties keep penLine and gain "after extra time" when aet. UclBracketCard's pending line says who leads: "First leg 2-1, Real Madrid lead. Second leg at Bayern."

3.7 Labels. One exported clockLabel(minute, detail) in clubManager.ts: m <= 90 -> "m'"; 90 < m <= 90 + board2 -> "90+(m-90)'"; m > 90 + board2 -> "(m - board2)'" (extra time reads 91' to 120'). Used by MatchReportCard for every scorer, card, sub and injury minute, by LiveSimScreen's badge ("LIVE 90+2'", "ET 97'") and event line, and by the timeline text. data-cm-live-minute keeps the raw clock number for harnesses. The timeline in buildMatchDetail: 'halftime' marker stays at 45 (nothing happens after it in the first half), a new 'extratime' marker at 90 + board2 when et, 'pens' and 'fulltime' at the last minute played (90 + board2, or 120 + board2). The momentum loop's last bucket takes hi = 90 + board2 (today a 93rd minute goal would be clamped into bucket 8 for chances but skipped by the scorer spike loop); extra time goals spike the last bucket too. liveStatsAt's clamp at 90 becomes the last minute played (pass it, or read live.board2 and live.et).

4. CONTROLS, MOBILE FIRST

Nothing new to tap. The pause button, the player dots and the change sheet behave as today and stay usable through added time and extra time (changeMinute reads the clock's cap instead of min(90, clock)). Every new line is one row of 10px text inside cards that already fit 390 wide: the aggregate line under the live score, the tie line under VS in the match centre, the aggregate line under the report scoreline. The stage overlay at the end of 90 in a level knockout reads "EXTRA TIME" in the FULL TIME overlay's place, and "FULL TIME" with "Decided in extra time" or "Decided on penalties" at the end. No scroll jump (useRevealScroll untouched). Tap targets untouched.

5. SCORING

None. Club Manager's recorded score is the Round 633 season score and nothing here feeds it. simScoringCoverage membership unchanged.

6. DAILY AND UNLIMITED

Not applicable, Club Manager is a save.

7. HELP

ClubManagerHelp.tsx, the "One match, two ways through it" paragraph gains two sentences: the board goes up at 90 and the second half runs on into it, so a goal can come at 90+3; a cup tie or a Champions League decider that is level when the board runs out plays thirty minutes of extra time before penalties, and a two legged tie tells you where it stands before, during and after the second leg. The same two sentences, in the guide's voice, in src/data/gameContent/clubManagement.ts (the sentence at line 107 already describes the stoppage board), then node scripts/genSearchKeywords.mjs and commit src/data/searchKeywords.json. A What's New entry under the current month. No speaker anywhere in the new copy: no quotes, role attribution only if any narration is added.

8. DATA NEEDS

No new tables and no new real data. One rule to verify before coding (dukb-data-guardian, two sources): in UEFA competitions before 2021/22, away goals scored in extra time counted for the away goals rule. The design folds extra time goals into leg two before uclTieOutcome, which reproduces that rule under the era switch that already exists (UCL_AWAY_GOALS_LAST_YEAR). If the sources disagree, the fallback is to run uclTieOutcome with awayGoalsRule false after extra time in every era and say so in the comment. No crests, no photos, no invented words on a real person.

9. FILES TO CHANGE

src/lib/clubManager.ts: LiveMatch (board2, et), MatchDetail (et), TimelineKind ('extratime'), MatchWeekReport (decidedBy 'aet', tie), UclTie and CupTie (aet), MatchFacts (tie); halfLambdas deflator with MEAN_BOARD2; drawSecondHalf (board, added stretch); recutSecondHalf (window and re board); ensureAddedTime for paused saves; needsExtraTime, drawExtraTime, startExtraTime (export); playMyMatch (extra time before pens, both branches; report.tie; decidedBy); buildMatchDetail (copy the board, markers, momentum last bucket, no re roll); liveStatsAt (cap); changeLive (cap); advanceUclBracket, advanceCupBracket, recordMyUclTie, recordMyCupTie (aet); matchFacts and myTieContext; clockLabel.
src/components/club-manager/LiveSimScreen.tsx: clock cap per stage, 'extra' stage, badge and event labels through clockLabel, feed window hi, terminal minute per stage, changeMinute, overlays, Agg line.
src/components/club-manager/MatchReportCard.tsx: minute labels, (AET), aggregate line, ET chip beside the added time chips when et.
src/components/club-manager/MatchCentre.tsx: tie line.
src/components/club-manager/UclBracketCard.tsx and CupBracketCard.tsx: aet copy, who leads.
src/hooks/useClubManager.ts and src/pages/ClubManager.tsx: the whistle at 90 + board2 asks the engine whether extra time is due (a small exported whistleAt90 that either returns the drawn extra time state or hands to resumeMatch), an onExtraTime callback beside secondHalf and startSecondHalfLive; nothing on the page draws football.
src/components/club-manager/ClubManagerHelp.tsx, src/data/gameContent/clubManagement.ts, src/pages/WhatsNew.tsx, src/data/searchKeywords.json.
scripts/simAddedTime.mjs (new), scripts/simLiveSim.mjs, scripts/simMatchDetail.mjs, scripts/simLiveMatch.mjs, scripts/simMatchScreen.mjs, scripts/simUclLegs.mjs, scripts/simCup.mjs, scripts/playClubManager.mjs (or a new playAddedTime.mjs).
docs/PROJECT-STATE.md and docs/WORKBOARD.md (claim the round numbers first; the next free number on the board is 667).

10. SAVE SHAPE AND MIGRATION

See the saveShape field. Everything is optional and additive, SAVE_VERSION stays 3, no reset. Older saves: absent board2 means the whistle rolls the board as today only when h2Drawn is false (a fresh draw stores it); a match paused mid second half without board2 gets ensureAddedTime lazily; absent et means no extra time; a report with decidedBy 'regular' or 'pens' and no tie renders as today; a bracket without aet prints its old copy. Idempotent, safe on every open.

11. THE FENCE

scripts/simAddedTime.mjs, seven sections and seven negative controls, detailed in the fence field. The strongest signals are measured outcomes, not "no crash": the three arm goals per match comparison with a positive arm inside it, the live path board equal to the report's board on every match, the share of goals in 90+ printed and floored from measured headroom, at least 40 extra time matches as a coverage gate, and the two ways of playing one match equal down to the JSON with extra time included. Every control asserts its anchor string is present exactly once before the run and turns only its named section red. Ratchets in existing harnesses land in the same commit and simHarnessAnchors proves no control anchor went stale.

12. ACCEPTANCE

See the acceptance field: gates, harness output lines, the browser check at 390 wide with scrollWidth at most 390, and the two aggregate strings on a seeded second leg save.

13. EFFORT, HONESTLY

About 28 builder hours, and it should be two rounds. Round A, about 14 hours: the board decided at the draw, the added stretch, the deflator with its measurement, recut caps, labels, the tie context on all three screens, sections 1, 2, 3, 6 of the fence and the ratchets. Round B, about 14 hours: extra time in the engine and the AI brackets, the live stage, the page wiring, sections 4, 5, 7 and the remaining controls. B depends on A's clock. Then the adversarial review the repo's memory insists on for any round that changes a rule (it found a disqualifying defect in every round it reviewed); budget two of the 28 hours for it.

14. RISKS AND REJECTED ALTERNATIVES

Rejected: drawing the board up front from a wide roll and placing the whole half's goals over 45 + board (simplest, exactly balance neutral, but it throws away Round 472's board worked out from what stopped the game, which is shipped behaviour with a fence and the owner's screenshots behind it). Rejected: first half stoppage goals (clock collision, see 3.1). Rejected: separate et lists on LiveMatch (fifteen merge sites; appending to the h2 lists with minutes past the board needs none). Rejected: the page deciding extra time (simMatchScreen section 6 exists to stop a second engine). Risks: the deflator, the harness anchors, the pre 2021 extra time away goal rule, the viewer's 45/90 constants, and record strings without an aet marker, all listed in the risks field.

15. ONE ENGINE, MANY SPORTS

This change lives in the one soccer match engine every Club Manager path shares and forks nothing per competition: the competition supplies data (deciding match or not, era rule), the draw is one function. The other manager and front office games are different sports with their own clocks and are untouched. Soccer Career is untouched and already correct on the aggregate.
```
