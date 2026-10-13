# Round 1327 notes: Soccer Career event deck integrity

Branch `r1327-sc-deck-fair`, cut from origin/main `8fea14e2` (Release AY plus the board's depth claim).
Kept current at every push. The brief is `dukb-handoff/2026-10-10/briefs/brief-1327.md`.

## Base

- Base SHA for every comparison: `8fea14e216fb550b4676ac29f06867234594df21` (until Release BB is merged).
  Its engine's sha256 (LF) is `0d9ab4a21241ca1d993fbc7a7176d3ed0de988d6cd2e6989d662c6a1307730ea`, the same file as
  48cb9d4b's.
- `git grep -n "pickN(" -- src/lib/soccerCareerEngine.ts` on the base prints the declaration only (line 2563):
  `pickN` had no caller anywhere, so it is deleted rather than made fair.
- The guide's line on events stays true (soccer2.ts, not edited): "Advance season by season through simulated
  stats, newspaper headlines, random events, and decisions".

## Steps and runner results (every gate is the closing summary line and the real exit code)

| Step | Commit | Runner result | What it proved |
|---|---|---|---|
| (a) harnesses red on the base | 264b7532 | r1327-a | promises exit 1 (41 failures, section 1); fairness exit 1 (107, sections 1 to 7) |
| (b) keyed deck, weighted paper, pickN, comment | 8c2af0d6 | r1327-b1, r1327-b2 | tsc 0; fairness sections 1 to 3 green; controls shuffle, ranking, globalpick, prefix FIRED |
| (c) the promises of the 40 | dbf6faca | r1327-c1 | tsc 0; promises 1 left (card 28, fixed in d); breakapply, unannounced, reorder, olddebut FIRED |
| (d) row gates, woken stories, MINOR 21, POLISH 23 | d2506229 | r1327-d1, r1327-r1, r1327-r2 | tsc 0; promises and fairness green at seeds 0 to 2; nogate, unit, poscode, ranking FIRED |
| (e1) the inverse and its proof | 45ae5ccb | r1327-e1 | fairness green at seeds 0, 3, 4 with section 8; outside FIRED |
| (e2) wired in three history harnesses | 833b4caa | r1327-e2 | awards night 179 checks, season and derby history green, vitest 16 of 16 |
| (e3) wired in the other six | 67a8d888 | r1327-e5, r1327-f2 | all nine green; story role all mode 17 controls caught |
| (f) the walk | 73a811db, 6cc87348, cf5a2e0b | r1327-w1, r1327-w2, r1327-p1 | green over 6 runs; pictures looked at |
| cooldowns readings | 26aad2c0 | r1327-b2 | readings written under a dated line |
| harness reads | c1267e36, 81fb1141 | r1327-f4 | simHarnessAnchors green |
| 12 and 15 gated on his club | d50c85d4 | r1327-g1, r1327-g2 | tsc 0; promises, fairness seeds 0 to 4, cooldowns, unit, nine history green; nogate and outside FIRED |
| six more RNG holding harnesses | ab98a0ca | r1327-x3 | see below |

## The deck (sc MAJOR 7), simSoccerDeckFairness section 1, 40,000 draws per run

| Arm | Per tenth of the eligible list, observed over fair | Single cards |
|---|---|---|
| base (old sort shuffle) | 1.598, 1.11, 0.978, 0.935, 0.852, 1.336, 0.919, 0.777, 0.775, 0.654 | 0.545 to 2.904 |
| head, seed 0 | 1.007, 0.992, 1.005, 0.998, 0.992, 1.011, 0.99, 0.993, 1.008, 1.003 | 0.924 to 1.061 |
| head, seeds 1 to 4 | every tenth 0.985 to 1.012 | 0.938 to 1.081 |

The hunt measured 1.58 and 0.61 on 48cb9d4b; this harness reads 1.598 and 0.654 on the base. Band 0.9 to 1.1.

## The paper, section 2

- One story printed beside the column, a weight 0.5 and a weight 1 story both eligible: base 0 prints of the
  0.5 story in 40,000 papers; head ratio 0.49 (sd 0.008) at seeds 0 and 1, 0.50 (sd 0.007) at seed 2. Band 0.4 to
  0.6, more than ten sd from each edge.
- The fleet (500 careers, about 7,450 papers): stories under weight 1 printed 3,385, 3,431 and 3,395 times against a
  fair 3,391, 3,412 and 3,381 (seeds 0 to 2); on the base they printed in their fair share of almost nothing.
  20 (seeds 0, 2) or 18 (seed 1) of the 23 stories under weight 1 printed; the ones that never print never qualify
  in the fleet (the two purchase stories, the drive buys nothing; the wonderkid story needs 30 goals at 21).
- REDEMPTION: 10 times on the base's fleet, 0, 3 and 3 times at seeds 0 to 2 on the head.
- SOCIAL MEDIA SENSATION: never on the base (it needed a trillion followers); 1,408, 1,433 and 1,433 times on the
  head, every one at a million or more. That is about one paper in five: see the owed list.

## Keyed, section 3 (decision 3 (iv))

On 200 mid career saves: the base's deck drew beyond the catalog build in 200 of 200 and its batch moved with the
stream in 200 of 200; 15 of 200 papers chose another story under another seed. The head: 0, 0 and 0.
Control `globalpick` (both keyed streams fall back to Math.random) fires.

The key: `keyedRng(playerName|era|nationality|position|<season row year>|deck)` for the deck (the count 2 to 4 is
the stream's first draw, then one uniform pick per card through careerEventDeck's `takeFresh` with a null ledger),
and the same identity with the paper's season row year and `|news` for the paper. Two careers with the same
identity draw alike; that is accepted. The key ends the re-roll of the PICK in a second tab, not of the eligible
list: the life catalog builds itself through Math.random gates (soccerCareerLife.ts 218 to 352, careerEras,
the corruption file), so a second tab can still see a different list. Owed to F11's fence and the other lane.

## The gate table (decision 2, design 3.4 (d)), simSoccerDeckFairness section 4

The fact is read by the harness's own rules, never by asking the engine. Fired / fired without its fact / batches
whose row held the fact, over the 500 career fleet:

| Card | Gate | Base, seed 0 | Head seeds 0, 1, 2 |
|---|---|---|---|
| 1 Late Winner! | goals > 0 | 464 / 97 | 147, 154, 147 fired, 0 without the fact |
| 4 Player of the Month! | a Player of the Month award with the row's year | 242 / 118 | 75, 96, 94; 0 |
| 7 Puskas Nominee! | goals > 0 | 192 / 35 | 96, 83, 74; 0 |
| 9 Red Card Scandal! | redCards > 0 | 247 / 228 | 17, 12, 20; 0 |
| 11 Injury Trouble! (was Serious Injury!) | an injury in the row, named on the card | 165 / 135 | 33, 36, 31; 0 |
| 12 New Manager! | leagueFinish and leagueSize present, finish * 3 > size * 2; the finish is named | 202 / 189 | 10, 17, 14; 0 |
| 15 Dropped! | leagueApps * 2 < 38 (the top of projectLeagueApps) | 222 / 186 | 37, 46, 40; 0 |
| 17 International Call-Up! | never dealt | 11 / 11 | 0, 0, 0 |
| 18 First International Goal! (was International Debut Goal!) | intApps and intGoals > 0, no earlier row with caps | 152 / 146 | 11, 6, 7; 0 |
| 19 World Cup Snub! | tournamentForYear gives a World Cup, the row's tournament is it, result Not Selected | 120 / 117 | 7, 2, 5; 0 |

Control `nogate` (the one filter line out of a copy) fires. Card 4's gate reads the award as the Player of the Month
block records it (`{ year: thisYear, name: "Player of the Month" }`); F13a must keep that shape or move the gate.

## The promise table of the 40 (design 3.4 (c)), simSoccerEventPromises section 1

Two ways: every clause moves what it names by what it says at the moment of the choice, and every meter the choice
moves is named. Measured on six fixed saves, 30 seeded applies per choice: base 209 of 450 choices kept their word,
head 450 of 450. Where a printed number had a real field it is APPLIED (an old saved card keeps its word too);
where a clause had no field it is reworded to what is applied. No choice was added, removed or reordered.

| Card, choice | Was | Now | Verdict |
|---|---|---|---|
| 1 Celebrate wildly | Social media +50k never applied | applies +0.05 million | promise kept |
| 1 Stay humble | "Team chemistry boost" (no field) | "Morale +10" | claim with nothing behind it removed |
| 2 Use it as motivation | All stats +2 ASSIGNED six keys (a queued boost of 1 landed as +1, reflexes wiped) | adds 2 to all seven | promise kept |
| 3 Accept the armband | morale +10 and popularity +5 applied, unprinted | printed | hidden effect named |
| 4 Dedicate it | "Overall +1", applied Shooting +1 next season | "Shooting +1 next season" | reworded to what is applied |
| 7 Take a bow | Social media +100k never applied; Popularity +15 hidden | applies +0.1; prints Popularity +15 | both |
| 8 Wear it with pride | Morale +10 hidden ("Morale boost") | "Morale +10" printed | named |
| 9 Accept the ban | "Reputation -5" (popularity) | "Popularity -5" | named by its field |
| 11 Focus on recovery | "Pace -2 permanently, miss apps next season"; Morale -10 hidden | "Pace -2, Morale -10" | no field for apps, nothing is permanent |
| 11 Rush back early | "Pace -1 but 30% chance of reinjury (Pace -3)" | "Pace -1, with a 30% chance of reinjury (Pace -3 instead)" | both outcomes seen |
| 12 Prove yourself | "possible stat boost" | "Morale -5, Physical +1 next season" | named |
| 13 Apologize | "Manager relationship saved" (no field) | "Popularity -3" | removed |
| 13 Deny it | "50/50: believed or more backlash" | "50% chance: believed, or Popularity -8" | both outcomes seen |
| 13 Laugh it off | "+5 with fans, -5 with manager" | "Popularity +5, Morale -5" | named by field |
| 14 Feet do the talking | ASSIGNED six +1 | adds 1 to all seven | promise kept |
| 14 Fire back | "rivalry intensifies" (not applied) | "Popularity +5" | removed (the card's rival is not the saved rival) |
| 17 Accept with pride | never dealt now | an old saved card records debutYear and debutAge | the engine's own call up shape |
| 18 Celebrate | Social media +75k never applied | applies +0.075 | promise kept |
| 19 Accept gracefully | "Respect +5" (no field) | "Morale -5" | removed |
| 19 Question manager | "International career at risk", Morale -10 hidden | "Popularity +5, Morale -10" | named |
| 19 Retire from internationals | "International career ends" but the next season's call up could bring him back | also sets intStats.isRetired, as retireFromInternational does | promise kept |
| 20 Start dating | "Stability boost" | "Morale +10, now in a relationship" | field named |
| 23 Buy it | Net worth -2 unprinted, "Lifestyle upgrade" | "Net worth -€2M, Property added, Morale +5" | named |
| 24 Accept the role | Popularity +20 hidden, "Sponsorship income boost" | "Popularity +20, Followers +2M, Sponsorship income +€1M a year" | named (sponsorBonus pays 1 a year) |
| 25 Buy the fleet | Popularity +3 hidden, "Lifestyle upgrade" | "Net worth -€800k, Followers +500k, Popularity +3" | named |
| 26 Invest €200k | "Could 10x or lose everything" (a third outcome unprinted) | "Could go 10x (+€2M), double (+€200k) or crash (-€200k)" | all three outcomes seen |
| 27 Accept | Popularity +10 hidden | printed | named |
| 28 Invest €1M | "Steady returns: +€150k/year", Net worth -1 unprinted | "Net worth -€1M, Income +€150k a year, Fund added to your investments" | named |
| 30 Sign the deal | "Income +€300k" | "Income +€300k a year" | the unit named |
| 31, 32, 33, 35, 36, 37, 38, 39, 40 | popularity (and 40's Net worth +€800k) hidden, flavour clauses | every applied effect printed, flavour clauses with no field removed | named |
| 34 Attend the ceremony | Morale +10 hidden | "Legacy +8, Morale +10" | named |
| 38 Pretend you didn't see it | Followers +200k hidden | "Followers +200k, it goes viral anyway" | named |

Unchanged and judged kept: 5 (the deal pays its first year on signing and the brand every year after), 6, 10,
15, 16 (Release AW's veteran pay, not touched), 21, 22, 29. Clauses with no field come only from the harness's
FLAVOR list, each with its verdict ("Status symbol", "No risk, no reward", "50% chance manager explains", ...).
Controls: `breakapply` (card 1's follower line out) FIRED, `unannounced` (a popularity bump on card 5's reject) FIRED,
`reorder` (card 13's first two choices swapped) FIRED on section 3.

Owed, never kept elsewhere (section 2, REPORT only, on the base deck): eras 41 to 199: 26 of 104 choices read as kept
(19 cards owed); life 200 to 299: 6 of 182 (38 cards, PR249's file); corruption: 0 of 18 (4 cards); realism: 58 of
337 (58 cards); critic and boot: none offered on the two saves. Most are popularity or morale moved and not printed.

## The stories the fair draw wakes (design 3.4 (e))

The 23 stories under weight 1, read for truth before the fair draw lets them print (lines on this head):

| Story (weight) | Reads | Verdict |
|---|---|---|
| Reveals Secret To Success (0.5) | overall 80, popularity 60 | an interview, a quote from the generated player: kept |
| SOCIAL MEDIA SENSATION (0.5) | followers | MINOR 21: `>= 1` (the field is in millions); the figure printed is the save's |
| Booed By Own Fans (0.7) | rating under 6.0 | kept |
| TRANSFER SAGA (0.5) | contract years and morale | the years printed are the save's: kept |
| INJURY BLOW (0.5) | apps under 15 | picked one of five injuries at random: now needs the row's injury of five weeks or more and names it; "Could Miss Months With Serious" became "Out For Weeks With" |
| CONTROVERSY (0.3) | morale under 40 | a quote from the generated player about the club: kept |
| WAGE DEMANDS SHOCK (0.4) | wage and contract | the agent's demand is a rumour built from the save's wage: kept |
| Another Season Of Rivalry (0.5) | the saved rival | kept |
| Bid rumour (0.7) | market value | the tail "In Major signing" and the body "tabling a the most expensive signing..." are gone; the rumoured bid keeps its own figure |
| FREE AGENT FRENZY (0.5) | contract 0 | kept |
| OUT OF TOUCH (0.8) | a superyacht or island | a club source (a role) speaks: kept; never qualifies in the fleet (the drive buys nothing) |
| BOX OFFICE (0.9) | showman, followers | kept |
| THE MACHINE (0.9) | iceman, rating | kept |
| TICKING TIME BOMB (0.9) | hothead, cards | the numbers are the row's: kept |
| WONDERKID ALERT (0.8) | 30 goals at 21 or under | kept; never qualifies in the fleet |
| HAPPIEST MAN (0.7) | morale, rating | kept |
| Monster Contract (0.7) | wage | the goals and assists are the row's: kept |
| LEADER OF THE NATION (0.6) | captain, caps this season | kept |
| THE PROMISE (0.6) | a bought house for his parents | kept; never qualifies in the fleet |
| THE WALL (0.6) | a keeper, 15 clean sheets | kept |
| THE FEUD (0.6) | rivalry intensity | kept |
| NINE FIGURES (0.5) | wealth | Round 473 already made it true: kept |
| AGELESS (0.5) | 36 and 15 goals | kept |

Also fixed on the way, weight 1: DONE DEAL printed a fee from `realisticTransferFee` (the save does not keep what the
move cost: acceptOffer clears transferSituation), called a loan a signing, and ran after the first season at the
club as news of the deal. It now tells the season after the move from the row: "ON LOAN: X's Season At Club" (the
row's `onLoanFrom` is set), "BACK AGAIN: X's Return To Club" (he played there before), or "NEW CHAPTER: X's First
Season At Club", with the row's appearances and goals and no fee. `feeDescription` (4343, outside this round's
hunks) has no caller left: the next round that owns that hunk deletes it.

POLISH 23: every headline and body in the paper prints the position as a word (Goalkeeper, Centre Back, Full Back,
Holding Midfielder, Midfielder, Playmaker, Winger, Striker; Player for anything else). One exception, on purpose:
soccerCareerMilestone.ts (not this round's) swaps the "Is X The Best ST In The World Right Now?" story for a goal
milestone by matching that headline with the position code, so in a season where `personalGoalMilestone` is due the
story keeps the code, and it never prints (the milestone replaces it); in every other season it prints the word.
Owed: that file's performance set learns the word form, and the story drops its branch. Section 6 renders all 44
stories for all ten positions with no milestone due: no bare code, no "In <lower case>" tail. Control `poscode`
fires.

## The seventh inverse (design 3.4 (h)) and decision 3 (i)

`scripts/lib/careerDeckFair1327.mjs`: 17 rows since the review fixes of 2026-10-13 (`imports`, `dilemma-comment`,
`pickn`, `position-words`, `best-in-the-world-and-rumour`, `interview-to-injury-stories`, `bid-and-move-stories`,
`academy-story`, `weighted-paper`, `cards-1-to-6`, `cards-7-to-10`, `cards-11-to-16`, `cards-17-to-22`,
`cards-23-to-29`, `cards-30-to-40`, `deck-helpers-and-gate`, `keyed-pick`; the two paper stories the fixes reworded
joined their neighbours' blocks), applied in order, each required exactly once at its turn. Applied to the head's
engine they give the base's (c9c77eba, Release BB) engine byte for byte: base sha256
`65ffd9d102989f30c811ac80f884cb84f0b8ca4f9f3feb8e9fdcf9c00009661c`; head sha256
`d4086c9bb824e30afdf54f56b87874be341b5b4a46e1e342f2a5968bca2fe802`. Regenerate after any engine edit with
`node .tmp-fx/regen.mjs` in the r1327 worktree (untracked; it runs gen-inverse2.mjs and write-module.mjs from the
same folder and names the rows by what they hold).
simSoccerDeckFairness section 8 asserts it on every run
and checks all 66 diff hunks against the six regions of decision 1 (the imports, the dilemma comment, pickN,
generateNewsArticles, the 40 inline cards, the helpers and generateRandomEvents). Control `outside` (one market
constant changed in a copy) breaks both the sha256 and the region check.

Wired FIRST (the newest change first) into the nine history harnesses, nothing re-recorded:

| Harness | How | Green on |
|---|---|---|
| simCareerAwardsNight | before trainOutOf on the attributed engine | r1327-g2, 179 checks |
| simSoccerSeasonHistory, simSoccerDerbyHistory | in the kits' copies that compare with the base (scripts/qa/seasonHistory1193.mjs, derbyHistory1195.mjs) | r1327-g2 |
| simCareerTrophyRuns | same shape as the kits | r1327-g2 |
| simCareerLeagueFinish | in both historical bundles (the attributed engine, read through the control copy's relocation, and the train-out plugin) | r1327-g2 |
| simCareerSocialBrands | before the control rewrite and the train-out in the historical bundle | r1327-g2 |
| simSoccerCareerDevelopment | ahead of the next ten and veteran pay rows | r1327-g2 |
| simCareerStoryRole | an attribution kept apart from the copied faults, on every engine it compares with AR (so "uncopied" now reads the tree with Round 1327 out, and the milestone engine news compares the paper's draws on it) | r1327-g2, and the all mode r1327-f2 (17 copied controls caught) |
| simCareerLeagueSeasons | a 1327 arm tried right after the raw replay, carrying any control's edit | r1327-g2: 12 of 12 careers identical only with Round 1327 taken out |

Without the inverse (head d2506229, r1327-e3): awards night dies on the train-out anchor (card 9's old consequence),
season and derby history fail "engine baseline". The six others were red on r1327-e4 before their wiring.

Six more harnesses hold a season to its original RNG and were not on the brief's list; green on the base
(r1327-x2), red on this head (r1327-x1), so they take the inverse too (node bundles only; the browser oracles stay the
tree as built): simCareerProgramme (its compatibility arm), and the kits of simCareerPressMarket,
simCareerTransferBrief, simSoccerAgentReview, simSoccerFarewell and simSoccerInternationalReturn.

## Decision 3 (iii) and (v), section 7

Prefix, 200 careers on the base bundle and this one, same seed: every career parts at the first paper or deck step,
none before (r1327-g1: 200 of 200 at seeds 0 to 4), and in that step the season row the paper is handed is byte
equal in 200 of 200. One or two rows a run differ by the end of that step: the finances and the summer draw into the
row after the paper, from a stream the old sort no longer shifts. Control `prefix` (an extra draw in the youth year)
fires. Old saves: every choice of cards 1, 4, 7, 9, 11, 12, 15, 17, 18 and 19 from a save the base wrote, a newspaper
and a transfer window: 19 screens answered, nothing thrown, the ledger keeps its shape, no save field added, card 17
records the debut. Control `olddebut` fires. eventChoiceAfterReload.test.ts unedited and green.

## Decision 3 (vi): the dailies never re-deal

`git grep -l soccerCareerEngine -- src` outside Soccer Career's own modules (checked on this head): soccerArcade,
careerEras, careerSeasonRatings, seasonFamilySummary and season/belgianOpponentLabels import types only
(`import type`); careerDrills takes values (effectivePotential, trainingStatFor) and is loaded only by Soccer
Career's training ground, its boards and season/soccer.ts. No daily imports the deck or the paper.

## Decision 3 (vii): the economy

simCareerLifeCooldowns section 4 at seed offsets 0 to 4 (r1327-b2): events per batch 3.25 to 3.26, batches per playing
season 0.90 to 0.91, life share 0.26, life events per season 0.76 to 0.77, all inside their unmoved bands; readings
in its header under a dated Round 1327 line. The only follower gains added are the three printed ones. simCareerSocialBrands
and simSoccerCurrency green; simMoney and simCreation are red on the base too, on their save size budgets only
(r1327-base1: biggest save 84.3 KB base, 84.6 KB head against 46 KB; a full career save 82.4 KB base, 92.8 KB head
against 60,000 bytes, one seeded career that plays differently now).

## Weight (decision 6)

| Measure | Base 8fea14e2 | Head | Result |
|---|---|---|---|
| sweepWeight /soccer-career, gz | 822.9K (r1327-wt2) | 823.9K (r1327-wt, head cf5a2e0b) | +1.0K, inside the 824K row by 0.1K |
| measureRouteWeight RUNS=3, raw | total 2882K, js 2653K | total 2884K, js 2655K | +2K raw |
| simFlagshipWeight | | green (r1327-w1, r1327-wt) | inside the 2700 KB ceiling |

New code in the chunk: careerEventDeck.ts (takeFresh), the gates, the helpers, the position words and the longer
card texts; pickN and the dropped clauses went. No budget row was edited.

## The walk (design 3.4 (l))

scripts/playSoccerEventCards.mjs, database blocked: a save the base engine wrote with cards 1, 7 and 18 on screen
(each title proven on screen before the first tap) and a newspaper this engine printed holding a story under weight 1,
at 320, 390 and 1280, reduced motion on and off: green over 6 runs (r1327-w2 and later). Every choice 75 px or more
(91 px for Puskas Nominee at 320, its saved line wraps), no sideways scroll, nothing on top of a choice that is on
screen, every card starting on screen, scrollY unmoved by an answer. Text under 12 px inside the card: only the two
known lines of the page (the category line at 10 px and the consequence line at 11 px, SoccerCareer.tsx, F11's page).
Pictures in dukb-handoff/2026-10-10/review-shots/r1327/ (card, whole card, answer, paper, per width and motion),
looked at: the first run showed a saved chance wheel and the privacy banner over the card, so the walk now closes
the wheel the drive left unseen and makes the essential only privacy choice, and checks that nothing lies on a choice.

## PR249 (the other lane's Round 1350)

On a scratch merge of this head and origin/codex/soccer-career-daily-life on a runner (never pushed, r1327-pr249):
simSoccerCareerRoutineEvents.mjs as is exits 1, "Actual picker did not queue routine 600 within 2048 fixed seeds"
(its delivery proof varies only Math.random's seed, which the keyed pick ignores). With one line changed it is
green: in its picker loop,
`const actual = draw({ ...found.state, playerName: \`${found.state.playerName} ${seed}\` }, 12000 + id * 2048 + seed);`
(vary the career's name per trial, the key's moving part). The merge itself has no conflict.

## Not this round's, seen on the way

- src/test/seasonCentreOwnGoals.test.tsx (Round 1167): green on the base, red on this head (r1327-v1, r1327-f4). It
  finds its saves by a seeded search over careers; the keyed deck moves the stream, so it now finds a "them" save
  whose matchday 29 sits behind two steps of the centre bar instead of one (probe r1327-og: the bar reads
  "▶ Matchday 29" after the first step, and one more step reaches it). The product is fine; the test steps past one
  screen only. Fix in the test, not done here (not this round's file): step past at most three screens until
  `[data-matchday="${spot.md}"]` shows, the assertions unchanged.
- simWritesAreSent (a rule fence): on the runner it could not drive Guess the Nation to a finish (a locator timeout
  on a guess, r1327-f4); that game loads none of Soccer Career's code; not measured on the base.

## Owed (design 3.6, plus what this round found)

1. The column repeats its stance headline (soccerCareerCritic.ts 121 to 123); the phone's relatives send the same reply
   (soccerPhone.ts 975). Not touched.
2. Never kept promises outside the 40 (simSoccerEventPromises section 2, REPORT): the other lane for life, realism
   and corruption; this lane for careerEras.ts 41 to 72, critic and boot.
3. A second tab can still deal a different eligible list (the catalogs' own Math.random gates): F11 and the other lane.
4. careerEventDeck.ts's header ("Until soccer imports anything ...") is now stale: the next round that edits that file.
5. The 11 px consequence line and the 10 px category line of the event card: F11.
6. PR249's harness: the failure and its one line fix, above.
7. F13a keeps the Player of the Month award's shape (`{ year: thisYear, name: "Player of the Month" }`) or moves
   card 4's gate with it.
8. The paper can repeat a story two seasons running (no saved memory of it): a save field after BB. SOCIAL MEDIA
   SENSATION now prints in about one paper in five (1,357 to 1,433 of about 7,400 papers a fleet), because nearly
   every career passes a million followers; a crossing rule or a memory would calm it. For the lead to rule.
9. For the lead only: cards 32 and 36 print "Netflix-style" and "Forbes Top 10" about the generated player.
10. soccerCareerMilestone.ts's performance set should read the position word, so the "Best In The World" story can
    drop its milestone branch.
11. feeDescription (engine 4343) has no caller left; delete it in the next round that owns that hunk.
12. Card 5's deal pays its first year on signing and the brand pays every year after, so year one is paid twice
    (F14, money).
13. seasonCentreOwnGoals.test.tsx needs its bounded step past (above) before this branch can merge green. Done in
    the review fixes (8974536d), for the lead to rule on: the file is Round 1167's.
14. The paper's weighted draw reads 0.48 to 0.493 of the weight 1 rate over five seeds where 0.5 is fair. Probed in
    the review fixes: noise, not bias (see the review fixes section).
15. Card 426 "Minus Twenty" (soccerCareerRealismA.ts 396, the other lane's file) has no climate gate and was dealt
    at Palmeiras in the run review's walk; the fair deck deals the catalog's tail at its full rate, so such cards come
    up more often than under the old shuffle (about 0.61 of fair). Same class as item 2.
16. The yearly income cards (24, 28, 30) print a flat figure that the season scales by the personality and item
    multipliers (engine 3116): F14, money.
17. Six files outside the brief's list carry the inverse wiring (simCareerProgramme.mjs and five scripts/qa kits):
    their node checks run the base deck, so none of them exercises the new deck; their browser oracles do.

## Review fixes (2026-10-13)

Two adversarial reviews of 874d777f (review-run-1327.md, review-read-1327.md in
C:/Users/antho/dukb-handoff/2026-10-10/results-g) found five majors and fifteen minors. Fixed, each its own commit:
- Card 11's first choice logs the row's injury ("Took time to recover from an MCL sprain: Pace -2"), not a serious
  hamstring; INJURY BLOW and card 11 say "an MCL sprain", "an ACL rupture", "an Achilles tendon rupture", and
  "bruised ribs" with no article ("have left their mark" on card 11's face).
- "Booed By Own Fans" (woken) and the transfer rumour say "international" only with a cap, else the position word.
- Card 7 needs row.year >= 2008: the Puskas Award was first given in 2009, for a 2008/09 goal (topendsports.com's
  Puskas Award page and puskas.com's page on Cristiano Ronaldo, its first winner, both cited by the read review).
- Card 15 reads half the division's league games, 2 x (size - 1), when the row holds the size; 38 otherwise.
- Card 9's lost appeal keeps the printed 3-match ban (it drew 2 to 4).
- seasonCentreOwnGoals.test.tsx steps past up to three centre bar screens (assertions unchanged).
- What's New scoped to the 40 classic cards; the claim "anything a choice changes is printed on it" is gone.
- simSoccerDeckFairness: fixed rows in section 4 (Puskas years, a loan club he left, division sizes), the keys'
  season in section 3, section 6 reads "the <nation> international", new section 9 reads the faces. New controls:
  uncapped (6), puskas and loanclub (4), keyseason and newsyear (3), injlog and injblow (9).
Readings on df435b31 (r1327-fx1, seed 0): section 3, eight seasons a save, 8 different batches on average and 0 of
100 saves under six; the paper printed one story all eight years in 1 of 80 saves; section 4 fired/wrong 1: 147/0,
4: 73/0, 7: 92/0, 9: 17/0, 11: 32/0, 12: 9/0, 15: 33/0, 17: 0/0, 18: 11/0, 19: 7/0; section 9, 18 injuries rendered,
the fleet dealt card 11 32 times, 12 9, 15 33, 19 7, printed INJURY BLOW 10 times and a move story 860 times.
The paper's low ratio, probed with keyedRng's own code: the five offsets share one key family at one year, whose
draws sit low (0.488, 0.481, 0.501, 0.502, 0.486 over the same family); at three other years the same family reads
0.4984, 0.5024, 0.5048; 0.4993 over twenty runs; the first output is flat over 20 bins. Noise, not bias.
Not fixed, with the reason: card 5's double first year and the income multipliers (F14 owns money); card 426's
climate (the other lane's file); the column and repeat stories (owed 1 and 8); cards 32 and 36 (the lead); the six
kits' wiring (they hold recordings; the inverse is what keeps them).
- simSchemaNames and simLeaderboardCaps need the live database (blocked on the runner by design).


