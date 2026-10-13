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
