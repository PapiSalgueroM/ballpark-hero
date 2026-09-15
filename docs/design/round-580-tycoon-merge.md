# Stadium Tycoon and Wonderkid Factory merge: final design contract (Round 580)

**Numbering.** The design workflow wrote round one as 569. That number went to the signed in points fix the same night, so this arc runs 580 to 589 in the desktop lane's second block (docs/WORKBOARD.md). Every round number below was shifted up by one step accordingly; line citations were not touched.


I checked this against tree `30e10fac` on 2026-09-14. The judges scored the drafts on `05254023`. The three commits since then touch only `docs/PROJECT-STATE.md`, `docs/WORKBOARD.md` and `scripts/simEngineIds.mjs` (checked with `git diff --stat 05254023 HEAD`), so every code citation below points at the same code the judges read. I opened every file cited here.

How numbers are labelled:
- **MEASURED**: computed this session with inline `node -e` over the shipped constants, or quoted from a harness's own dated note.
- **ESTIMATE**: my arithmetic on a model.
- **TARGET**: a goal that a named round's harness has to measure before any copy quotes it.

The design starts from the winning draft (engine-first). It fixes every defect raised against that draft and adds ideas from the other two. Section 1 lists each fix and each borrowed idea.

---

## 1. Verdict

**Build it in ten rounds on one route with no merged save key.** Put the league third, right after the save hardening, instead of seventh. Build the owner's full list of nouns except the extra worlds, which wait for a measured trigger.

### Where this disagrees with the recorded plan (`docs/WORKBOARD.md:3120-3131`)

1. **No merged save key, ever.**
   - Both loaders hard reject any `v` except 1 (`src/lib/stadiumTycoon.ts:1006`, `src/lib/wonderkidFactory.ts:436`), so a save fold is exactly where a silent wipe would happen.
   - The house already has a proven way to grow a save: optional fields on the existing V1 key. Rounds 150, 152, 162 and 196 did it (`stadiumTycoon.ts:472-506`), and Round 424 added `matchSec` the same way (`:454-458`).
   - Both V1 keys stay the source of truth. Anything earned from match results lives in one new key, `tycoonRewardsV1`, which no older build reads or writes (section 10).
2. **No new route.**
   - The merged game lives at `/stadium-tycoon`. `/wonderkid-factory` retires into it in Round 589, and that round is held on the AdSense decision (section 17).
   - Every Stadium Tycoon harness pin stays valid: `simSessionMarks.mjs:126-151`, `simTycoonAway.mjs:61-66`, `simTycoonClock.mjs:42-55`, `simRevealMoments.mjs:122,145`, `simAccessibility.mjs:44,123`, and the walks in `playSessionMarks.mjs:102-113` and `playLegacy.mjs:43-47,72`.

### Every noun in the ask (`docs/TWEAKS-2026-08-28.md:220-226`)

| Owner's ask | Call | Round |
|---|---|---|
| One tabbed tycoon | BUILD | 580 |
| Divisions and a scoreboard against named generated opponents | BUILD | 582 |
| Promotion by winning your league | BUILD, champion only, no relegation | 582 |
| Takes weeks | BUILD via away matchdays, measured | 584 |
| Real goal animations on a pitch that looks right | BUILD: 22 players, replays of committed goals | 583 |
| Cookie clicker scale feedback on every tap | BUILD as feedback, tap value kept | 583 |
| Packs bought with gems earned by winning, better packs better odds | BUILD with odds on screen | 585 |
| Wait-for-the-right-moment selling, for all players | BUILD on one value curve | 586 |
| Minigames | BUILD two (free kick and penalty) from one engine | 587 |
| Gear | BUILD on a fixed schedule. DECLINE gear from packs or bought with gems. | 588 |
| Multiple worlds (cities, space) | DEFER. A world is data injected into one engine (the `imperialismEngine.ts` precedent). Trigger in section 14. | later |
| Master spec extras: 12 tabs, Finance, Sponsors, Quests, XP, materials, timed actions (`docs/MASTER-BUILD-SPEC-2026-08.md:2415-2463`) | DECLINE for this arc | none |
| Cloud save | DECLINE for this arc: new infrastructure, not reuse | none |
| Paid gems, gems for ads, gem conversion, reels, countdown offers | DECLINE permanently (`docs/OWNER-DIRECTIVES-2026-08.md:52-55`) | none |

### Defects raised against the winning draft, and how each was fixed

| # | Raised by | Defect | Fix | Where |
|---|---|---|---|---|
| 1 | safety | The rival app entry in `RIVAL_NAMES` could be written as a two word prefix. That prefix already matches ordinary copy at `src/lib/nhlCareerLifeA.ts:492` ("sports starts"). | Round 580 adds the full three word name, spaces optional, bounded by `\b` at both ends. `simTycoonRooms` section B4 proves it matches the phrase at `docs/TWEAKS-2026-08-28.md:224-225` and does not match line 492. It uses a `shortname` control. | §13, §15 |
| 2 | safety | With no Phenom guarantee, the top tier was a pure 6% chase. | The odds panel and the help both say Phenom ceilings are also scoutable from The Capital upward (`REGIONS` potMax 91, 95 and 99 at `wonderkidFactory.ts:49-51`). | §6, §12 |
| 3 | safety | Rerolling a pack by reloading was never fenced. | A pack is drawn from the rewards ledger's own seed and written to the ledger as `pending` before the reveal. It is delivered exactly once. Round 585 has a check and a `reroll` control. | §6, §10 |
| 4 | safety | The pity countdown could read as a keep-opening banner. | The guarantee count prints only inside the odds panel, never on the tile face. | §6 |
| 5 | player | Too much of the ask was declined. The league came seventh. | League is third (582). Full 22 player pitch. Two minigames. Gear on a fixed schedule. Worlds stay deferred with a stated trigger. | §7 to §9, §14 |
| 6 | player | Round one was a shell, and the academy dropped to its away rule whenever the Stadium tab showed. | The Academy panel mounts on first open and stays mounted for the sitting, so it keeps its watched clock under the Stadium tab. Each tab carries an accent when something needs you. Round one stays save-free on purpose: it is the only round that can prove continuity before anything touches a save. | §4, §15 |
| 7 | player | "Takes weeks" meant weeks with a watched tab. | Away matchdays are a committed round (584): one matchday per 30 minutes away, never the season's final matchday. Away wins pay 1 gem. The finale is always watched. | §3, §5, §14 |
| 8 | player, gatekeeper | "Rollback is lossless by construction" was false: `prestige()` copies only named fields (`stadiumTycoon.ts:949-978`). | The claim is withdrawn and replaced with the exact losses. Gems and gear unlocks moved to a key no older build knows. Every round carries its new fields through both prestige functions, checked by harness. Frozen V1 loaders prove new saves still load. | §10 |
| 9 | player | The gem balance spanned two keys, so a corrupt academy key refunded every spent gem. | Earned and spent live together in `tycoonRewardsV1`. | §5, §10 |
| 10 | player | The hold side of the sell tension was too weak: a 0.012 cap is about 7.5 Squad track levels at 0.0016 each (`stadiumTycoon.ts:736`). | The first team becomes an opponent-side multiplier money cannot buy (ESTIMATE: 43.0% to 60.7% win rate at an even state for five 80s). The policy test is two-sided, with a fixed refill rule and a `flatedge` control. | §3, §7 |
| 11 | player | Removing the second `repMult` cut taps by 1.5^rep in the arc meant to make taps feel big. | Tap value is kept. The comment at `stadiumTycoon.ts:707-711` and the copy are corrected. `simStadiumTycoon.mjs:460-462` already pins the formula. | §7 |
| 12 | re-verification | The draft's pack help said "about 1 in 11". | Star 9% plus Phenom 1% is 10%, so the copy says about 1 in 10. | §12 |
| 13 | re-verification | The draft's continuity margin was measured in money, which depends on roll order (`Math.random` at `useStadiumTycoon.ts:130` and `:138-143`). Any draw elsewhere on the page shifts a goal. | The signal is match clock seconds, which no roll touches. | §15 |
| 14 | re-verification | The wall detector asserted a maximum, which CLAUDE.md forbids. | It uses the 90th percentile over seeds (owner-first's shape). | §5 |
| 15 | re-verification | Control copies were written inside `src/` while `runAllSims` runs three harnesses at once (`runAllSims.mjs:130-143`), and `simRevealMoments` walks `src` (`:128`). | Copies go to `dist/.tycoon-rooms-control-*`, following the precedent in `simCompletionOnce.mjs:86-90` and `simPollCharacter.mjs:85-90`. | §15 |
| 16 | re-verification | The reveal (tier chip with `cm-slam`, then name with `cm-rise`) is a two-beat tease. | The whole card lands in one frame with a single `cm-rise`. | §6 |

### Ideas taken from the other designs

| Idea | From | Where |
|---|---|---|
| Lift the minute loop into `playMinute` so live and away play share one function, proven by 200 of 200 identical outcomes and a `copy` control | retention-first (recommended by the gatekeeper) | 584 |
| Away play never plays a season's final matchday | owner-first | §8, 584 |
| Pack contents written before the reveal; card tier equals tier drawn; exact per-pack figures | owner-first (gatekeeper and safety) | §6, 585 |
| A new save must load in the baseline loader, done with committed frozen copies instead of `git show`, so a depth 1 clone still runs it | owner-first, fixed | §10, §15 |
| League sizes 6, 8 and 10 on the double round robin `roundRobinCalendar` already returns; rivals persist through a failed season; names capped at 19 characters | owner-first | §8 |
| Keep tap value; "12 taps", never "x12"; a keyboard-operable tap target | owner-first | §7 |
| The embedded kick board writes no daily record and calls no completion | owner-first | §9 |
| Dry-spell fence as a percentile | owner-first | §5 |
| One ledger writer, source fenced; "Open for 100 gems", never "buy" | retention-first | §6 |
| Gear on a fixed schedule, never from packs, never in a fee | retention-first (endorsed by safety) | §6, 588 |
| No ads beside the tap target or the pack flow | retention-first | §13, §17 |
| Pick one of three generated club names, no free text | retention-first | §8 |
| Pitch theatre hashed from match and minute, never drawn from the roll; replay backlog lands older scenes on their final frame | retention-first | §7 |

---

## 2. Objective

Take a made up football club from a muddy field to the top of ten leagues. Build its stadium, grow its players and sell each one at the right moment, and win the league titles that earn better signings.

---

## 3. Core loop

### The repeated decision

"What do I do with what I have right now?" Four things compete:
- **Club money ($)** goes on tracks and staff.
- **Transfer budget (£)** goes on academy facilities.
- **Gems** go on a pack, but only if a bed is free.
- **Players** can be sold now, or held for their growth, their edge in matches and the title race.

### Why decision N differs from decision N minus 1

- **Costs move.** Stands rise x1.15 per level (`stadiumTycoon.ts:40`, `:651-654`) and dorms x1.75 (`wonderkidFactory.ts:67`, `:261-264`), so the best buy changes after every purchase.
- **Players age.** A kid's `ageClock` runs while you watch (`wonderkidFactory.ts:394-401`). From Round 586 a senior's fee falls from age 28, and every card shows his next birthday and the fee after it.
- **Windows open and close.**
  - Deadline Day pays x1.5 for 50 seconds of every 410 watched seconds (`wonderkidFactory.ts:84-86`, `:354-362`).
  - Matchday Hype charges for 480 seconds (`stadiumTycoon.ts:618`).
  - The golden whistle lasts 12 seconds (`useStadiumTycoon.ts:136-146`).
- **The table moves.** From Round 582 every result changes what the next win is worth. Two points behind on the final matchday is a different afternoon from ten points clear.
- **Resets reframe everything.** Sell up now for a star, or win this league first for one more legacy point (`stadiumTycoon.ts:400-402`, `:973`).

### Loops

| Loop | Length | What happens |
|---|---|---|
| Short | 1 to 12 seconds | Tap, catch a whistle, buy a level, sell a kid, open a pack, take a set piece |
| Mid | 126 seconds to about 38 minutes | A match is 90 minutes at 1.4 seconds each, 126 seconds (`stadiumTycoon.ts:834`). A season is 10, 14 or 18 matchdays: 21.0, 29.4 or 37.8 watched minutes (ESTIMATE, 126 x matchdays). Showcase cycle 150 seconds, Deadline cycle 410 seconds, Hype 480 seconds. |
| Long | Days to weeks | Titles promote through 10 divisions. Sell up thresholds are 4M x 7^rep (`stadiumTycoon.ts:936-938`). Academy regions. A senior's career runs 18 to 34 on 15 minute academy years. Phenoms by pack or by scouting. With away matchdays (584), a twice-a-day visitor finishes about two seasons a day (ESTIMATE, section 5). |

### The selling tension, for every player (Round 586)

**What is true today.** The recon swept every rating from 40 to 95, every ceiling, entry ages 15 to 20 and training x1 to x8: 52,920 cases. In every one, a trained kid's fee on the eve of his 24th birthday was his peak or tied for it. The promise premium only fades (`wonderkidFactory.ts:242-255`), so copying today's curve to adults would copy a tension that does not exist.

**One value function for every player**, lifted into an import-free `src/lib/playerValue.ts`. The academy imports it back.

```
fee = rating^2.35 / 60
    x (1 + (potential - rating) x 0.022 x promise(age))   promise: 1 to age 20, 2/3 at 21, 1/3 at 22, 0 from 23 (wonderkidFactory.ts:242-246, unchanged)
    x prime(age)                                           1.00 to 27, 0.90 at 28, 0.78 at 29, 0.64 at 30, 0.50 at 31, 0.36 at 32, 0.22 at 33
    x POS_PRICE[pos] x priceMult(academy)                  wonderkidFactory.ts:159 and :223-225, unchanged
```

- `prime` is 1 at every age a kid can hold today, so **every existing kid's quote is byte identical**.
- The rule that training never cuts a fee still holds at a fixed age, because `prime` ignores rating (`wonderkidFactory.ts:251-253`).

**Seniors.**
- A kid aged 18 to 23 can be promoted into one of **five first team slots**, which frees his bed.
- Seniors train on the academy clock at half the academy rate until 27, using the same headroom rule (`wonderkidFactory.ts:384-388`, Rounds 96 and 116).
- They hold at 28 and 29 and lose 1.2 rating at each birthday from 30.
- A senior year is `SENIOR_YEAR_SEC = 900` watched academy seconds. He retires at 34 for nothing.
- Away, seniors train at the away rule and nobody ages, the academy's existing promise (`WonderkidFactory.tsx:371`).

**Value curve** (ESTIMATE; a midfielder at x1 multipliers, ratings declining from 30). The 17 and 19 figures for Kid B match the help modal's live example (`WonderkidFactory.tsx:372`). MEASURED: `basePrice(58,74,17)` is 327 and `basePrice(71,74,17)` is 414.

| Age | Kid B (ceiling 74) | Player A (ceiling 85) | Player A on Deadline Day |
|---|---|---|---|
| 17 | £327 | £425 | £638 |
| 19 | £414 | £516 | £774 |
| 24 to 27 | £428 | £593 | £889 |
| 28 | £385 | £534 | £800 |
| 30 | £264 | £367 | £551 |
| 32 | £137 | £193 | £289 |
| 33 | £80 | £114 | £171 |
| 34 | retires, £0 | retires, £0 | £0 |

**Why holding is now a real decision (the fix for defect 10).** The first team does not add to the goal chance, which money already buys. It cuts the opponent's per-minute chance by a fraction `f` that no track can buy:

```
f = min(0.40, sum over the first team of max(0, min(99, rating + gearLevel) - 60) x 0.002)
opponent chance per minute = max(0.008, oppChancePerMin(s) x (1 - f))
```

- Five 99s give f = 0.39, so the cap never binds for an honest save and every rating point counts.
- An empty first team gives f = 0, so the engine is byte identical.
- ESTIMATE (exact binomial over 90 minutes, `node -e`), at an even mid-ground state with goal chance 0.092 and opponent chance 0.094 per minute:

| First team | f | Win rate |
|---|---|---|
| none | 0 | 43.0% |
| five 70s | 0.10 | 51.7% |
| five 80s | 0.20 | 60.7% |
| five 99s | 0.39 | 77.3% |

For comparison, the draft's capped additive edge reached 59.4% only with five 99s.

**Round 586 has to prove both directions,** or the tension is fake:
- "sell at 28" earns more transfer budget than "hold to 33";
- "hold to 33" wins more matches per ten seasons than "sell at 28 and refill the slot with the best graduate under one fixed greedy rule".

If holding never wins more, the round retunes decline and `prime`, never the test.

---

## 4. Structure

### Tabs

The tabs sit under the page h1 on `/stadium-tycoon`. Inside each tab the tile rule applies (`src/components/hub/HubTiles.tsx:34-72`).

| Tab | Holds | Arrives |
|---|---|---|
| Stadium | Pitch and scoreboard, Hype, golden whistle, Sell up bar. From 583: tiles for Upgrades, Payroll, Badges, Legacy, Records. From 587: the set piece. | Today's `StadiumTycoon.tsx:151-573`, moved verbatim into `StadiumRoom` in 580 |
| Academy | Beds, sell buttons, Showcase, Deadline Day, facility tiles, Reputation. From 585: Packs. From 586: First team. | `WonderkidFactory.tsx:28-101`, `:115-346`, `:355-395`, `:400-404`, moved into `src/components/tycoon/AcademyPanel.tsx` in 580 |
| League | Table, matchday strip, next opponent, club name pick | 582 |

**Shared rules.**
- The room state starts at the constant `'stadium'`. No clock, no random value, nothing that moves the snapshot.
- The Academy panel is `React.lazy` and mounts on first open. From then until the page unmounts it stays mounted with `visible={room === 'academy'}`, and renders only its hooks when not visible. So it keeps its watched clock under the Stadium tab and costs no hidden DOM.
- Each tab button carries `data-room` and `data-accent`:
  - The **Academy** accent lights for Deadline Day live, beds full, move up ready, or a kid within 60 seconds of his 24th birthday.
  - The **Stadium** accent lights while a promotion card, badge line or away pay card is waiting.
  - The promotion and badge timers (`StadiumTycoon.tsx:123-132`) run only while the Stadium room is visible, so a promotion earned while you are in the Academy is still there when you come back.
- The League tab appears once `totalMatches >= 1`. That is derived, not stored, so no tile ever ships empty (`HubTiles.tsx:27-29`).

### Route decision

- **580 to 588: two doors, one academy.** `/wonderkid-factory` renders the same `AcademyPanel`, so the two cannot drift.
- **589: one door.**
  - `/wonderkid-factory` becomes `<Navigate to="/stadium-tycoon">` with a stub from `genRetiredStubs`.
  - A retired address cannot target a tab (`simRetiredRoutes.mjs:62-66`), so the page opens the Academy tab on arrival when `wonderkidFactoryV1` exists and `stadiumTycoonSaveV1` does not. This lives in an effect, so snapshots are untouched.
  - Held on the AdSense decision (section 17). Nothing else depends on it.

### How every existing save survives: there is no migration

| On disk | What each round does to it |
|---|---|
| `stadiumTycoonSaveV1` | **580:** untouched. **581:** loads through stricter validation (levels, `matchSec`, `minute`, goal counts, `streak`, `matchNo`, totals, `savedAt` repaired, never refused). **582:** if the RAW save has no `league`, the league division is seeded from the old `groundWins` rule (`stadiumTycoon.ts:93-100`), so nobody drops a division, and the match in progress finishes against its current `opponentName` before matchday 1. **584:** no new field. **587:** `setPieceUsedMatch` absent reads as unused. |
| `wonderkidFactoryV1` | **580:** untouched, still read by `deserialize` (`wonderkidFactory.ts:432-494`). **581:** `rep` floored to an integer, `nextId` raised above the largest kid id, duplicate kid ids re-minted with first holder wins (`entityIds.ts:58-73`). **585:** `packsDelivered` absent reads as 0, per-kid `tier` optional. **586:** `firstTeam` absent reads as empty, `retired` as 0. |
| `tycoonRewardsV1` (new in 585) | Absent reads as an empty ledger. |
| Every key, every round | `v` stays 1. No key is renamed. No key is ever deleted. |

Rollback is covered precisely in section 10.

---

## 5. Economy

### Currencies (all earned, none ever bought)

| Currency | Key | Sources | Sinks |
|---|---|---|---|
| Club money ($) | stadium | Fans x per-fan rate: a new club is 90 x $0.05 = $4.50/s (MEASURED from `newTycoon` fanbase 90 at `:519`, capacity 120 at `:658`, per-fan 0.05 at `:682`). Parking, payroll, taps, goal and win bonuses (`:750-757`), promotion bonus (`:890`), milestones, whistles, away pay at half rate with an 8 hour cap (`:987-994`). | 9 tracks, 8 staff |
| Transfer budget (£) | academy | Kid sales (`wonderkidFactory.ts:302-314`), senior sales (586) | 4 facilities |
| Gems | rewards | Watched full time: win +3, draw +1. Away matchday win +1 (584). League title +20, runner-up +6, only on the watched final matchday. | Packs: Scout 30 (the first one free), Club 100, Elite 250 |
| Kit upgrades | rewards | One per league title after the first in each division (588) | Boot levels 1 to 3 |
| Ground stars, legacy points | stadium | Unchanged (`:936-938`, `:400-402`) | Legacy boardroom (`:343-352`) |
| Academy stars | academy | Unchanged (`wonderkidFactory.ts:325-340`) | none (+15% training, +10% fees each, `:216-218`) |

**Gems never come from** taps, idle money, away pay, whistles, player sales, badges, logins, adverts, purchases, packs, or any outcome gems were spent on. A pack can never pay gems back.

**The two cash wallets stay separate on purpose.** Club money reaches billions while fees top out in the thousands. The different symbols are the cue that these are different wallets.

### Rates the design leans on

**Match gem pace** (MEASURED arithmetic, exact binomial over 90 minutes on `goalChancePerMin` and `oppChancePerMin` at match number 0, `stadiumTycoon.ts:734-747`; 3600 / 126 = 28.6 matches per watched hour):

| Squad level | Win | Draw | Gems per watched hour from matches |
|---|---|---|---|
| 0 | 47.0% | 18.9% | 46 |
| 10 | 81.6% | 10.0% | 73 |
| 20 | 96.9% | 2.2% | 84 |

**What keeps a ground honest.** Squad levels are cheap early, and the `matchNo x 0.0011` climb (`:744`) is what makes "the ground has peaked, sell up" true (`src/data/gameContent/soccer2.ts:803`). The league keeps that term unchanged and counts away matches toward it, because it is one engine.

### Progression (TARGETs unless marked; each round's harness replaces an estimate with a measurement)

| Stretch | Stadium | League | Academy | Gems and packs |
|---|---|---|---|---|
| First 10 minutes | $4.50/s at start (MEASURED) | Season 1 of Muddy Meadows under way | First sale inside 180 seconds (`simWonderkid.mjs:117`) | First Scout Pack free |
| First hour, watched | First Sell up reachable around minute 14 (MEASURED 2026-08-18 by the greedy floor bot, `simStadiumTycoon.mjs:16-17`; re-measured in 582) | 2 to 3 bottom seasons, likely one title (ESTIMATE) | Star 2 around 30 minutes (recon ESTIMATE) | 60 to 120 gems. A paid Scout Pack, likely a Club Pack. |
| First week, two 5 minute visits a day | Stars 2 to 4 | About two seasons a day via away matchdays, divisions 2 to 4 (ESTIMATE) | Star 3 | A paid Scout Pack inside 2 days, a Club Pack inside 5 days |
| First week, 30 minutes a day | Stars 4 to 5 | Divisions 3 to 5 | Star 4 around 8 watched hours (recon) | First Elite Pack |
| Weeks 2 to 6 | Legacy board filling (100 points total) | A Summit title | Star 5 around 40 watched hours (recon) | A Phenom by about 17 Elite Packs, or by scouting from The Capital up |

**Pace against prestige.** The league must not make the first promotion come later than the first reachable Sell up. Round 582 measures both with the greedy bot. If promotion loses, divisions 0 to 2 play the first leg only: 5 matchdays, the first half of the list `roundRobinCalendar` returns (`src/lib/rebuildDeck.ts:878-894`).

**Dry-spell fence (585 onward).**
- A greedy bot plays 40 simulated hours across every system and records the longest stretch with no unlock (star, title, affordable pack, badge, milestone, region).
- Over 50 seeds the harness takes the **90th percentile** of that stretch, never the maximum.
- Round 585 sets the threshold at 1.5x its measured p90, and every later round must stay under it.
- If a Club Pack takes more than 5 days for the twice-a-day visitor, lower the prices. Never add a gem source.

---

## 6. Packs and gear

### Packs (Round 585): generated kids delivered to a free academy bed

**Tiers are potential bands**, drawn through `makeProspectInBand(s, potMin, potMax, rng)`. That is `makeProspect` (`wonderkidFactory.ts:187-204`) with the band and the random source passed in. The scout path calls it with the region band and `rand` bound to the academy seed, so its draw order is unchanged. Packs pass the ledger's own generator.

| Tier | Potential band |
|---|---|
| Grassroots | 58 to 70 |
| Prospect | 66 to 78 |
| Talent | 74 to 86 |
| Star | 82 to 92 |
| Phenom | 90 to 99 |

**Published odds**, printed on the Packs panel from one exported `PACKS` table (the Round 530 read-it-off-the-engine rule, `wonderkidFactory.ts:211-218`):

| Pack | Price | Grassroots | Prospect | Talent | Star | Phenom | Guarantee |
|---|---|---|---|---|---|---|---|
| Scout | 30 gems (first free) | 62% | 30% | 7% | 1% | 0% | none |
| Club | 100 gems | 0% | 55% | 35% | 9% | 1% | Star or better on or before the 10th Club Pack since the last one |
| Elite | 250 gems | 0% | 0% | 60% | 34% | 6% | Star or better on or before the 3rd Elite Pack since the last one |

**Exact figures** (MEASURED with `node -e`):
- Expected ceiling at band midpoints: Scout 67.8, Club 76.4, Elite 83.3. A better pack has strictly better odds.
- With the guarantee, a Star or better arrives every 6.51 Club Packs and every 1.96 Elite Packs on average.
- The chance of nine Club Packs in a row with no Star is 38.7%.
- There is no Phenom guarantee. 4.5% of players would see no Phenom in 50 Elite Packs, which is why the panel says scouting reaches Phenoms too.

**Other rules.**
- **Duplicates cannot exist.** Every kid is generated with a name unique in the club (`wonderkidFactory.ts:166-181`); from 586 the taken set includes the first team. No duplicate rule means no refund to game.
- **A pack kid carries its scout report.** Below Scouting 6, `potentialRead` shows his tier band as the range.

### No-gambling and minor safety safeguards (each one asserted in Round 585)

1. **One writer.** Gems are earned only from match results and titles, in `src/lib/tycoonRewards.ts`. A source fence fails on any other write to `tycoonRewardsV1` and on any `earned` assignment outside that file.
2. **One way.** No random outcome, sale, trade or conversion produces gems or anything outside the game. Gems never touch leaderboard points, badges, streaks or profile data, and live only in localStorage.
3. **Odds before the tap.** Odds are on screen before the tap, sum to 100, and are read from `PACKS`. The panel's code has no percent literals (comments stripped). The guarantee prints as a count **inside the odds panel only**.
4. **No reroll.** The result is drawn at open and written to the ledger as `pending` before the reveal starts. A reload mid-reveal shows the same kid. Delivery is idempotent through `packsDelivered`.
5. **One pack per tap, one card, one frame.** No multi-open, reel, wheel, cycling tier names, near-miss copy, flashing, sound or countdown. The whole card lands at once with a single `cm-rise` (`Celebration.tsx:95-96`). **No confetti on a pack**; confetti is for things won by play. Reduced motion lands on the final frame (`:120-121`).
6. **No time pressure.** No limited packs, rotating shop, daily deal or "last chance".
7. **Generated kids only.** No real names, faces, clubs or kits.
8. **The button stays disabled** unless a bed is free and the balance covers the price. It reads "Open for 100 gems", never "buy".
9. **The card tier always equals the tier drawn.** There is no walk-down like Mystery Box's (`useMysteryBox.ts:114-121`). The pool is generated, so it never runs out.
10. **Banned words in pack UI code** (word bounded, comments stripped): spin, jackpot, lucky, bet, loot, crate. "Slot" is deliberately not banned, because first team slots are a real noun.

### Gear (Round 588)

- **Boots only.** The lines come from the fictional `BOOTS` list (`src/lib/soccerCareerAppearance.ts:128-151`, whose comment says real brands stay out).
- **Fixed schedule.** The first league title in each division unlocks the next boot line in `BOOTS` order. After ten, each Summit title unlocks the next line until all 18 are open. Every other title grants one kit upgrade, which raises one boot from level 1 to a maximum of 3.
- **Effect.** Each level adds +1 to its wearer's rating inside `f` only (section 3), capped at 99. Gear never enters a fee.
- **Never from packs, never for gems, never random.** Unlocks and levels live in `tycoonRewardsV1`, keyed on the match that won the title.

---

## 7. Matches and the pitch

**Which engine commits the goals.**
- The existing per-minute rolls inside `tick` (`stadiumTycoon.ts:841-856`), with banked seconds (`:834-837`, fenced by `simTycoonClock.mjs:42-44`).
- **583** adds an optional `minute` to `TickEvent` (`:781-786`) on `goal` and `conceded`.
- **584** lifts the loop body into `playMinute(st, roll, events, opts)` so live and away play call one function.
- **586** adds `edge` (the `f` above) as a parameter defaulting to 0.

**How the pitch reads them.** It follows the Club Manager rule: walk what the engine committed and never simulate a second time (`src/components/club-manager/LiveSimScreen.tsx:29-49`).
- The score chip changes on the frame the engine commits the goal, with `cm-slam` on a wrapper (the note at `Celebration.tsx:83-90`).
- The pitch then plays a **replay** of that goal: the ball runs to the scoring end (ours attack right), the net ripples, and a "GOAL 34'" floater prints the engine's bonus through `fmtMoney`.
- If more than two replays are queued, the older ones land on their final frame.
- A hidden room renders nothing and shows the current score on return.

**Pitch geometry (583).**
- Today's halfway line is horizontal (`StadiumTycoon.tsx:223`) against end boxes and vertical stripes (`:222`, `:225-226`). It becomes a vertical halfway line with a centre circle, two goal mouths, penalty areas and six yard boxes.
- **22 players** in a 4-3-3, mirrored for the opponent. The coordinates are a static 11 entry table in `src/components/tycoon/TycoonPitch.tsx`. Club Manager's `FORMATIONS` lives in `src/lib/squadDeal.ts`, which imports the Supabase client and the fallback players data (`squadDeal.ts:1-4`), too much to drag onto a 290K route.
- Idle drift is CSS keyframes with a per-dot phase from `seatRand` (`StadiumTycoon.tsx:44-47`). During a replay the attacking line shifts by a class, and the lane is hashed from `totalMatches` and the minute, never from `roll`.
- The 1900 ms `setInterval` that re-renders the page (`:85-89`) is retired.

**Tap feedback (583). Tap value is unchanged.**
- The tap coordinate is measured on the pitch element, clamped to 0 to 100. Today the rect is the stand-plus-pitch wrapper (`:134-139`, `:211`) while floaters are positioned inside the pitch (`:247-258`).
- Every floater prints `fmtMoney` of the engine's real money change. Today they print raw numbers (`useStadiumTycoon.ts:156-167`, `:248`).
- A 1.02 scale pop over 120 ms on a wrapper, and six spark dots at `seatRand` angles.
- A display-only chip reading "12 taps" that resets after 1.5 seconds idle. Never "x12", never a multiplier.
- The pitch gets `role="button"`, `tabIndex={0}`, an `aria-label`, and Enter or Space to tap at centre. It keeps its classes so `playSessionMarks.mjs:105` still finds it.
- The comment at `stadiumTycoon.ts:707-711` is corrected to say reputation counts twice in a tap on purpose (`:701` and `:715`), kept so nobody's taps shrink.

**Motion rules.**
- Everything moves by CSS keyframes. Nothing eases a state value in an animation frame loop, the shape `simRevealMoments.mjs:207-221` flags as a counting number.
- Round 147: balance, score, table points, gems and fees print the engine's value and never count.
- Round 423, under reduced motion:
  - replays do not run; the score and floater land at commit;
  - ripple, sparks, pop and drift do not run;
  - floaters stay static (the existing rule at `StadiumTycoon.tsx:590`).
- Every new animated class is named inside the reduce rule (`simRevealMoments.mjs:239` onward).

**Away matchdays (584).**
- Matches still run live only in a visible tab.
- On return (through the same `settleAway` path, so a hidden tab and a closed tab are identical), away time plays `floor(awaySeconds / 1800)` matchdays through `playMinute`, starting by finishing the current match.
- Capped by the existing away cap (`offlineCapHoursOf`, `:434-436`) and by the season: **never the final matchday**.
- Away results pay no money bonuses. An away win pays 1 gem. Milestones and badges settle on the first live tick, as they already do (`:899-927`).
- The away card lists W, D and L chips with letters and `aria-label`s, plus one line about the table.

---

## 8. Divisions, scoreboard and promotion (Round 582)

**Divisions.** The ten names, emoji, `incomeMult` and `oppBoost` stay (`stadiumTycoon.ts:79-90`). Only what moves you between them changes.
- `divisionIndex(s)` reads `league.division`.
- The `winsNeeded` table survives only to seed old saves.
- The badges that read `bestDivision` (`:299-303`) keep working.

**League size.**

| Divisions | Clubs | Matchdays (double round robin) |
|---|---|---|
| 0 to 2 | 6 | 10 |
| 3 to 5 | 8 | 14 |
| 6 to 9 | 10 | 18 |

- `roundRobinCalendar(n)` already returns both legs in round order (`rebuildDeck.ts:878-894`).
- Your fixture is always at your ground (it is a stadium game), so home and away only order the other fixtures.

**Clubs.**
- You plus n-1 opponents drawn without replacement from the 288 names (`:586-595`), **filtered to 19 characters or fewer: 248 of 288** (MEASURED with `node -e`; the longest raw name is 24).
- `LeagueTableCard`'s club column has 7px spare for a 19 character name (`LeagueTableCard.tsx:66-68`).
- Seed is a hash of (rep, division, seasons at this ground). No `Math.random`, no clock. A fresh club always meets the same Muddy Meadows.
- Names are unique within a league. The collision check against real clubs stays (`simStadiumTycoon.mjs:337-347`).
- **Rivals persist:** after a failed season the same clubs return with their offsets reshuffled by the season seed. Promotion draws a fresh set.

**Your name.** On first League open, pick one of three generated names from the same banks, or skip and stay "Your club". No free text.

**Strength.**
- Your match uses today's formulas exactly (`:734-747`), plus the current opponent's offset.
- Offsets are evenly spaced from -0.006 to +0.006 across the opponents, mean zero.
- Other fixtures play at your full time through the same per-minute model: each side's chance is `0.024 + matchNo x 0.0011 + oppBoost + offset`, clamped as today, from a seeded stream.

**The table.** Played, W, D, L, GF, GA, points. Order: points, goal difference, goals for (`tableOrder`, `rebuildDeck.ts:896-897`), then club name.
- It renders through `LeagueTableCard`, which only type-imports `TableRow` (`LeagueTableCard.tsx:2`).
- A new optional `zoneTop` prop defaults to today's 4 (`:52`), so Club Manager's render is unchanged. The tycoon passes 1.
- Before a ball is kicked it uses the existing `preseason` prop.

**Promotion.**
- Only the champion goes up, using the existing bonus, `promoted` event and card (`stadiumTycoon.ts:884-895`, `StadiumTycoon.tsx:296-320`).
- New `title` and `seasonEnd` events join the `TickEvent` kinds.
- A Summit title pays and stays put. Everyone else replays their division.
- **No relegation.** Income multipliers stay monotone per ground, and a school-age audience gets no loss loop.
- **Sell up resets the league to the bottom**, so Round 196's "climb before you sell" still pays (`:400-402`).
- A career `leagueTitles` counter is carried through prestige.

**Screen.**
- The header chip becomes, for example, "Muddy Meadows League · 3rd of 6 · matchday 4 of 10".
- The Sell up hint (`StadiumTycoon.tsx:337`) becomes "Win this league first and the sale pays N".
- The scoreboard names the fixture's opponent.
- The League tab is never the default, so none of it reaches a snapshot.

**Engine reuse.**
- `roundRobinCalendar` and `tableOrder` move verbatim into an import-free `src/lib/leagueCore.ts`, and `rebuildDeck.ts` imports them back. Importing `rebuildDeck.ts` directly would drag in `squadDeal` (`rebuildDeck.ts:2`).
- `leagueCore.ts` also exports the five line mulberry32 step and a 32 bit hash. The two exported copies live in modules that import Supabase (`gridEngine.ts:1`) and the daily record (`minefield.ts:21`), and `arcade.ts`'s `lehmer` has the weak first draw noted at `wonderkidFactory.ts:136-137`.

---

## 9. Minigames (Round 587)

**One engine, two kicks.**
- At most once per live match, a "Free kick" or "Penalty" button appears for 12 seconds, like the golden whistle.
- The minute is `20 + hash(totalMatches) % 61`.
- One offer in three is a penalty: kick 0 of `buildRun`, labelled "Penalty spot, no wall" (`src/lib/freeKick.ts:82-96`, `:93`). Otherwise it is a free kick from indices 2 to 6 of the same ten-kick run (`arcade.ts:29`).

**The board.**
- `src/components/tycoon/SetPieceBoard.tsx` is prop-driven: aim controls over `takeShot` (`freeKick.ts:166`), `onResult(scored)`.
- It **writes no daily record and calls no completion.** `FreeKickBoard` cannot be embedded because it owns both (`FreeKickBoard.tsx:6`, `:10`, `:68`). `/free-kick` is untouched.
- `freeKick.ts` imports only `./arcade`, and `arcade.ts` imports nothing.

**The reward.**
- A scored kick commits one goal through a pure `awardSetPieceGoal(s)`: at most once per match (`setPieceUsedMatch === totalMatches`), only before minute 90, with the normal goal bonus.
- A miss or an ignored offer costs nothing, and the match clock keeps running.
- Away matches never offer one.
- No gems directly, so the minigame cannot become a gem farm.

**Declined:** any further minigame until 587 shows use, and any minigame with its own daily.

---

## 10. Saves

### Shape

| Key | Owner | Contents |
|---|---|---|
| `stadiumTycoonSaveV1` | stadium engine | Today's `TycoonState` (`stadiumTycoon.ts:443-507`) plus optional `league` and `leagueTitles` (582) and `setPieceUsedMatch` (587) |
| `wonderkidFactoryV1` | academy engine | Today's `FactoryState` (`wonderkidFactory.ts:110-132`) plus optional `packsDelivered` and per-kid `tier` (585), and `firstTeam` and `retired` (586) |
| `tycoonRewardsV1` (new, 585) | `src/lib/tycoonRewards.ts` | `{ v: 1, seed, earned, spent, paidThroughMatch, firstPackUsed, pity: { club, elite }, opens, pending, gearUnlocked, gearLevel, kitUpgrades }` |

Only the two hooks read or write the first two keys today (grep of `src`).

### Rules

- **Versioning.** `v` stays 1 on every key, forever. Anything a loader cannot absorb as an optional field is out of scope.
- **Latches read the RAW save.** The league seed in 582 checks `p.league` on the parsed object, never the spread. `newTycoon` will carry a default division 0 league, and the spread would demote every old save. This is the `legacySeeded` lesson (`stadiumTycoon.ts:1062-1070`).
- **Validate every field on load.** Clamp integers, floor, and accept only known ids. A doctored save gets a working game, never a printing press. An invalid `league` is rebuilt from `groundWins`, never trusted.
- **Idempotency for anything crossing keys.** Every one-shot that crosses keys is keyed on `totalMatches`: result gems, title gems, gear unlocks and kit upgrades.
  - It increments at every full time (`:880`), live or away.
  - Every build carries it through prestige (`:969`).
  - The ledger pays a full time only if `totalMatches > paidThroughMatch`, so a reload that replays the last seconds of a match never pays twice.
  - Write order: stadium save first, then the ledger, in the same task. A failure between the two can lose one result's gems and can never pay twice.
- **Pack delivery.**
  1. Ledger write: `spent`, `pity`, `opens`, `pending`.
  2. Academy write: kid added, `packsDelivered = opens`.
  3. Ledger write: `pending = null`.
  - On load, a `pending` with `packsDelivered < pending.openNo` is delivered if a bed is free. Otherwise it waits with a chip, and the pack button stays disabled.
- **Round 567 write order (581).**
  - Both hooks already write from a ref on hidden, pagehide and unmount (`useStadiumTycoon.ts:183-201`, `useWonderkidFactory.ts:60-72`).
  - Still wrong today: the stadium ref is assigned during render (`useStadiumTycoon.ts:61-62`), `doPrestige` writes from inside a setState updater (`:262-268`), and `settleAway` writes inside one (`:99-104`).
  - From 581 every destructive action computes from the ref, assigns the ref, saves, then calls setState.
  - Academy actions that spend or move (pack, promote, sell senior, move up) mutate the ref and save immediately, the shape `doMoveUp` already has (`useWonderkidFactory.ts:109-117`).
- **Ids (Round 568).**
  - Kids keep the persisted numeric `nextId`, the shape `entityIds.ts:31-33` endorses. 581 adds the load reconcile.
  - Seniors get string ids from `makeIdMinter('sr')` (`entityIds.ts:53-56`) and `ensureUniqueIds` on load (`:74-91`).
  - `floaterSeq` (`useStadiumTycoon.ts:39`) stays display only.

### Rollback, stated exactly

A build older than a round loads that round's saves: both V1 loaders spread unknown top-level fields back in (`stadiumTycoon.ts:1008-1012`, `wonderkidFactory.ts:438`), and nothing changes `v`. What an older build does lose:

1. **A Sell up on an older build** rebuilds from `newTycoon` and copies only named fields (`stadiumTycoon.ts:949-978`). It drops `league`, which a Sell up resets anyway, and `leagueTitles` and `setPieceUsedMatch`, which are records, not progress.
2. **A move up on an older build** copies only rep, careerEarned, soldCareer, seed and nextId (`wonderkidFactory.ts:331-337`). It drops `firstTeam`. That is a real loss, which is why 586 rides alone and is never reverted after players have been promoted.
3. **The older academy loader** rebuilds each kid from named fields (`:476-485`), dropping a pack kid's `tier` label. The kid stays.

Gems, gear unlocks and kit upgrades live in `tycoonRewardsV1`, which no older build reads or writes, so **no rollback can drop them.**

**Carry rule.** Every round that adds a field adds it to `prestige` and `moveUp` in the same round, and its harness asserts the field survives both on the new build.

### Frozen baseline (580)

- `scripts/fixtures/tycoonV1/stadiumTycoon.ts` and `wonderkidFactory.ts` are byte copies of today's two libs. `pins.json` records their sha256 and the parent commit.
- They are a test oracle, never imported by the app. A committed save corpus sits beside them (section 15).
- Every later save round asserts its new saves load in the frozen loader, non-null, with every V1 field unchanged. No `git show` at run time, so a depth 1 clone runs it.

### Two open browser tabs

- Last writer wins on the V1 keys, exactly as today. No hook listens for `storage`.
- The ledger does read, modify and write on localStorage inside each operation and holds no copy in memory, so only truly concurrent tasks in two browser tabs can race it.

### Cloud save

None. Declined for this arc.

---

## 11. Scoring and daily

**The 100 scale is unchanged. This stays an unscored play.**
- Stadium Tycoon marks once per sitting (`useStadiumTycoon.ts:210-215`), and its cap row stays null.
- 580 to 588: the academy also marks `/wonderkid-factory` once per sitting on its own actions (`useWonderkidFactory.ts:78-83`). A sitting that uses both tabs records two unscored plays, which honestly reflects two registry games while two exist. Zero points either way.

**Round 588.**
- The academy hook takes `onPlay`, and the stadium hook returns `markSessionPlay`, so the count of `markSessionPlay();` in the stadium hook stays 4 (`simSessionMarks.mjs:150-151`).
- `'wonderkid-factory'` is declared in `RETIRED_COMPLETION_SLUGS` with its cap kept (`src/data/completionSlugs.ts:66-93`). `simLeaderboardCaps` counts only declared retirements as sendable (`simLeaderboardCaps.mjs:180-184`, `:275-279`).
- **Never map it.** `completionSlugForPath` returns the first slug mapped to a path (`completionSlugs.ts:108-111`). A mapping would make the tycoon resolve as `wonderkid-factory`, and `simCompletionSlugs` section 4 would then skip it silently (`simCompletionSlugs.mjs:208-209`).

**No ranked score.** Idle progress measures hours, and titles are not comparable across saves.

**No daily.** The only skill piece would duplicate Free Kick's existing daily.

---

## 12. Help

**Delivery.**
- Rules open before first play in each tab and reopen from a "?" in each tab.
- The academy already does this (`WonderkidFactory.tsx:30-33`). The stadium does not (`StadiumTycoon.tsx:54`); 583 fixes that and adds the house "Let's go" bottom button (the pattern at `WonderkidFactory.tsx:374-379` that generic walkers already clear).
- `playSessionMarks` and `playLegacy` dismiss it first.

**Every number in help and the guide comes from engine exports, never typed.** The copy that contradicts the engine today, all fixed in 583:
- The modal and guide say Hype doubles goal and win bonuses (`StadiumTycoon.tsx:560`, `soccer2.ts:768`). `goalBonus` and `winBonus` take no hype term (`stadiumTycoon.ts:750-757`). The copy is corrected rather than the economy, so no measured curve moves in a feel round.
- The worked example "400 fans and $12/s" (`StadiumTycoon.tsx:569`) is impossible, because 400 fans at the base $0.05 already pay $20/s.
- The guide opens at "about six dollars a second" (`soccer2.ts:776`). The engine says $4.50.
- The academy guide's "roughly triple" (`soccer2.ts:838`) is x1.26 (MEASURED: 327 to 414 at age 17).
- "Career earnings never reset" toward the next star (`soccer2.ts:846`) is wrong. The goal reads `lifetime` (`wonderkidFactory.ts:326`), and move up resets it (`:338`).

**Worked examples**, each computed live from the engine:
- **Stadium:** "A new club has 90 fans paying $0.05 each: $4.50 a second. Stands level 1 costs $30 and adds 40 seats you cannot fill yet, so the Ticket Office pays first."
- **Academy:** the existing live example (`WonderkidFactory.tsx:372`, `:402-404`) plus the age table from section 3.
- **Packs:** "A Club Pack costs 100 gems: Prospect 55%, Talent 35%, Star 9%, Phenom 1%. About 1 in 10 brings a Star or better by chance. If nine in a row do not, the tenth is guaranteed to. Phenom ceilings can also turn up in your own scouting from The Capital upward."
- **League:** "Matchday 10 of 10 in the Tin Cup Division. You and Redmoor Swifts are level on 19 points but you are +4 on goal difference, so a draw wins the league and takes you up to the Ironworks League, where every dollar pays x1.55."
- **Away:** "Leave for an hour and two matchdays play without you. The final matchday of a season always waits for you."
- **Set piece:** one kick, one goal at most, nothing lost for a miss.

**Guides.**
- One guide under `/stadium-tycoon` (`soccer2.ts:748-810`). 589 folds in the academy words from `:812-855`, corrected.
- `genSearchKeywords` is rerun in every round that touches a guide, since `simSiteSearch` section 7 fails on a stale index.

---

## 13. Legal and data lines, checked

| Line | How the design holds it |
|---|---|
| No logos, crests, kits, photos | The pitch is CSS and SVG lines. Clubs are text plus a colour dot. No image assets. Gear is fictional boots only. |
| No real likenesses | Kids come from `intlNames` (`wonderkidFactory.ts:13-16`, `:166-181`). Seniors are promoted kids. No faces in this arc. |
| No invented words or deeds for a real person | No dialogue or quotes anywhere. Everything is narration ("GOAL 34'"). Every person and club is generated. |
| Never invent a real player, stat or result | No real clubs, leagues or seasons anywhere (`soccer2.ts:849`). |
| Generated names checked | Opponent banks against the real Club Manager clubs, which must load more than 200 (`simStadiumTycoon.mjs:337-347`). The club name pick draws from the same banks. Any new bank is registered in `GENERATORS` (`scripts/simInventedNames.mjs:46`). |
| Fictional brands only | `BOOTS` (`soccerCareerAppearance.ts:128-151`). No sponsors in this arc. |
| No rival product names | 580 adds the cited app's full three word name to `RIVAL_NAMES` (`scripts/simNoRivalNames.mjs:32`), spaces optional, `\b` at both ends. The file skips itself (`:244`). The two word prefix would already match `src/lib/nhlCareerLifeA.ts:492`. Section B4 of `simTycoonRooms` proves the entry. |
| No gambling (`OWNER-DIRECTIVES-2026-08.md:52-55`) | Section 6, all ten safeguards harnessed. School-age audience confirmed (`docs/PROJECT-STATE.md:4340-4343`). |
| No ads near the play | The page mounts no ad slot today (no `AdBanner` import in `src/pages/StadiumTycoon.tsx`). This arc adds none (section 17). |
| No free text | The club name is picked from generated options. |
| Worlds | Deferred. When built they must read as fictional (`MASTER-BUILD-SPEC-2026-08.md:2439`) and pass both name guards. |

---

## 14. Phased roadmap

**Rules for every round.**
- Numbers come from the claimed blocks (`docs/WORKBOARD.md:156-162`).
- Every round is independently shippable.
- Gates: `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` at zero, read from the exit code; `npm run build`; the full `node scripts/runAllSims.mjs` on a frozen tree; `build:seo` whenever a snapshot changes; the listed browser walks.
- Every round ends with a `docs/PROJECT-STATE.md` row and a `docs/WORKBOARD.md` claim.
- A round that touches a save, a clock or a rule **rides alone** and gets an adversarial review.

### Round 580: Two tabs, one tycoon

**Player value.**
- Everyone on `/stadium-tycoon` (489 pageviews in 30 days, `docs/PROJECT-STATE.md:4329-4330`) gets their academy one tap away with its save intact.
- Once opened, the academy keeps running beside the stadium, and each tab lights up when something needs you.
- `/wonderkid-factory` players keep today's game.

**Unchanged by construction:** `src/lib/stadiumTycoon.ts`, `src/lib/wonderkidFactory.ts`, `src/hooks/useStadiumTycoon.ts` and `src/hooks/useWonderkidFactory.ts`.

**Save migration.** None. Both keys are read and written only by their unchanged hooks.

**Before the first edit**, run `node scripts/genTycoonSaveCorpus.mjs` and copy the two libs into `scripts/fixtures/tycoonV1/`. Both must capture today's code.

**Files to create.**

1. `src/components/tycoon/AcademyPanel.tsx`
   - `export default function AcademyPanel({ visible = true, onStatus }: { visible?: boolean; onStatus?: (s: AcademyStatus) => void })`
   - Calls `useWonderkidFactory()` and holds the panel state moved verbatim from `WonderkidFactory.tsx:28-101`.
   - Renders the region chip and star row from `:115-130`, re-wrapped in `<div className="text-center mb-3">` because the page keeps the header and h1. Then `:133-346`, the help modal `:355-382`, the style block `:384-395` and `salePriceExample` `:400-404`.
   - When `visible` is false it returns `null` after its hooks run.
   - It calls `onStatus` in an effect keyed on the four booleans of `academyStatus(stateRef state)`.
   - The root element carries `data-academy-panel`.
2. `src/lib/tycoonRooms.ts`
   - `export type Room = 'stadium' | 'academy'`, `export const LEAVING_SOON_SEC = 60`, `export interface AcademyStatus { deadline: boolean; bedsFull: boolean; moveUp: boolean; leavingSoon: boolean }`.
   - `export function academyStatus(s: FactoryState): AcademyStatus`, using `capacity`, `canMoveUp`, `YEAR_SEC` and `LEAVE_AGE` from `@/lib/wonderkidFactory`. `leavingSoon` means some kid has `age === LEAVE_AGE - 1 && ageClock >= YEAR_SEC - LEAVING_SOON_SEC`.
   - Imported at runtime only by the panel. The page uses `import type`, so the academy lib and its 18KB name bank never reach the stadium's first load.
3. `src/test/tycoonRooms.test.tsx` (section 15).
4. `src/test/fixtures/tycoonSaves.json`, written once by item 5.
5. `scripts/genTycoonSaveCorpus.mjs`
   - Builds the eight saves in section 15 and bundles today's libs with esbuild (the `simTycoonClock.mjs:77-80` pattern).
   - Records `{ name, key, raw, loaded }` with `NOW = 1767225600000`.
   - Its name does not start with `sim`, so the runner skips it.
6. `scripts/fixtures/tycoonV1/stadiumTycoon.ts`, `scripts/fixtures/tycoonV1/wonderkidFactory.ts` (byte copies) and `scripts/fixtures/tycoonV1/pins.json` (`{ commit, files: { name: sha256 } }`).
7. `scripts/simTycoonRooms.mjs` (section 15).

**Files to change.**

8. `src/pages/StadiumTycoon.tsx`, in exactly this shape (the controls in section 15 rewrite these lines, so they are contract):

```tsx
export default function StadiumTycoon() {
  const g = useStadiumTycoon();
  const [room, setRoom] = useState<Room>('stadium');
  const [academyOpened, setAcademyOpened] = useState(false);
  const [academyStatus, setAcademyStatus] = useState<AcademyStatus | null>(null);
  const [stadiumNeedsYou, setStadiumNeedsYou] = useState(false);
  // root div keeps id="dukb-main"; GameNavbar, PageSeo, CelebrationStyles; <header> holds only the h1
  // tab strip: two buttons, min-h-[40px], aria-pressed, data-room, data-accent
  <StadiumRoom g={g} visible={room === 'stadium'} onNeedsYou={setStadiumNeedsYou} />
  {academyOpened && (
    <Suspense fallback={<div className="h-40" />}>
      <AcademyPanel visible={room === 'academy'} onStatus={setAcademyStatus} />
    </Suspense>
  )}
  // GameSeoContent unchanged, outside both rooms; page-level <style> block unchanged
}
function StadiumRoom({ g, visible, onNeedsYou }: { g: ReturnType<typeof useStadiumTycoon>; visible: boolean; onNeedsYou: (v: boolean) => void }) { ... }
```

   - The page body reads nothing from `g` except to pass it.
   - `StadiumRoom` holds everything from `:153-573` verbatim: division chip, star row, How it works, money header, Hype, pitch, Sell up, tracks, payroll, drawers, lifetime line, away modal, rules modal.
   - It reports `onNeedsYou(Boolean(g.promotion || g.badge || g.awayPay !== null))` in an effect.
   - The promotion and badge dismiss effects gain `|| !visible` in their early return: `if (!g.promotion || !visible) return;`.
   - `AcademyPanel` is `lazy(() => import('@/components/tycoon/AcademyPanel'))`.
   - The rules modal gains one paragraph: "The Academy tab runs your youth academy inside this game, on its own save, with its own How it works button."
   - Keep the anchor `/* ---------- tiny animation helpers ---------- */` (`simRevealMoments.mjs:145-146`), both dialogs with `escapeCloses` and `focusDialogOnMount` (`simAccessibility.mjs:123`), and the pitch's `cursor-pointer select-none group` classes (`playSessionMarks.mjs:105`).
9. `src/pages/WonderkidFactory.tsx`
   - Keeps `GameNavbar`, `PageSeo`, `<main id="dukb-main">`, `CelebrationStyles`, `<header>` with the h1, and `GameSeoContent`.
   - Adds one `<p>` with a `Link` to `/stadium-tycoon`: "This academy also runs inside Stadium Tycoon, on its Academy tab, with the same save."
   - Renders `<AcademyPanel />` through a static `@/` import, so the coverage walk reaches the mark in two hops (`simScoringCoverage.mjs:73-84`).
10. `src/data/gameContent/soccer2.ts`, `/stadium-tycoon` only:
    - one intro sentence;
    - one `howToPlay` step ("Open the Academy tab to run your youth academy beside the stadium");
    - one FAQ: "Is Wonderkid Factory part of this now? Yes. The Academy tab runs the same academy with the same save, and the Wonderkid Factory page still works too."
    - Then `node scripts/genSearchKeywords.mjs` and commit `src/data/searchKeywords.json`.
11. `src/pages/WhatsNew.tsx`: one `<li>` under September 2026.
12. `scripts/simRevealMoments.mjs:239`: `'src/pages/WonderkidFactory.tsx'` becomes `'src/components/tycoon/AcademyPanel.tsx'`, because the keyframes move with the panel.
13. `scripts/simNoRivalNames.mjs:32`: one entry, as described in section 13.
14. `vitest.config.ts`: above `"@"` (`:43`), add `...(process.env.TYCOON_ROOMS_PAGE ? { "@/pages/StadiumTycoon": path.resolve(process.env.TYCOON_ROOMS_PAGE) } : {})`, the `COMPLETION_HOOK` pattern at `:23-25`.
15. Via `build:seo`: `public/stadium-tycoon/index.html`, `public/wonderkid-factory/index.html`, `public/whats-new/index.html`, `scripts/data/lastmod.json` and the sitemap.
16. `docs/PROJECT-STATE.md` and `docs/WORKBOARD.md`.

**Not changed:** the registry description (it would rewrite the snapshots that link the game), both PageSeo descriptions, the `/wonderkid-factory` guide, and any route.

**Harness:** `scripts/simTycoonRooms.mjs`, section 15.

**Acceptance criteria.**
1. `git diff --name-only` for the round lists none of the four unchanged files.
2. `simTycoonRooms` is green: the plain run passes 7 tests and prints at least 7 `ROOMS|` lines, and every control produces exactly its red and green pattern.
3. tsc at zero by exit code; build green; the full suite green on a frozen tree. That includes `simSessionMarks`, `simAccessibility`, `simRevealMoments`, `simScoringCoverage`, `simWonderkid`, `simStadiumTycoon`, `simTycoonAway`, `simTycoonClock`, `simNoRivalNames`, `simSiteSearch` and all fifteen snapshot fences named in CLAUDE.md.
4. With `ENGINES=chromium`: `sweepWeight` inside its budgets for both routes (`sweepWeight.mjs:50`, `:53`), plus `playSessionMarks`, `playLegacy`, `playReducedMotion`, `playIphone` and `playRenderStability` with `ONLY` set to the two routes.
5. Snapshot diffs are limited to the guide lines on `/stadium-tycoon`, the link paragraph on `/wonderkid-factory` and the What's New entry.
6. A hand check at 390 by 844:
   - both tab buttons are visible without scrolling and at least 40px tall;
   - the Stadium tab is otherwise unchanged;
   - opening Academy with a real Wonderkid save shows that save's kids;
   - a kid about to turn 24 lights the Academy tab while the Stadium tab is showing.

### Round 581: Safe loads, ref-first writes, the academy's clock (rides alone)

**Files.**
- `src/lib/stadiumTycoon.ts`: load validation for `levels` (known ids, integer 0 to maxLevel; today merged raw at `:1011`), `matchSec` in [0, 1.4), `minute` integer 0 to 90, goal counts, `streak`, `matchNo`, `totalGoals`, `totalWins`, `totalTaps`, and `savedAt` finite and not after now.
- `src/lib/wonderkidFactory.ts`: integer `rep`, `nextId` raised above the largest id, duplicate kid ids re-minted with first holder wins, and an `applyAway(s, gapMs)` with an `awayMs` meter. This is Idle Arena's rule (`src/lib/idleArena.ts:27-52`, `:293-317`): a gap over 750 ms is away time, capped per absence.
- `src/hooks/useStadiumTycoon.ts`: ref-first writes for every action, `doPrestige` and `settleAway`.
- `src/hooks/useWonderkidFactory.ts`: pay measured wall gaps instead of the fixed 0.25 (`:51`), through `applyAway` above 750 ms.
- Flagged, not fixed: `src/hooks/useHallOfChampions.ts:90-99` has the same fixed-dt shape.

**Harness:** `scripts/simTycoonLoads.mjs` plus `src/test/academyAway.test.tsx`, on the `tycoonAway.test.tsx:38-131` rig.
- A hidden tab (one interval callback per 60 seconds of virtual time) for 3 hours credits exactly 1.5 hours of training, ages nobody and runs no Deadline Day. That is the academy's printed promise (`WonderkidFactory.tsx:371`).
- 20 hours hidden credits the same capped amount as 20 hours closed.
- The corpus's doctored stadium save loads, and its match clock advances at the real cadence (the `simTycoonClock` outcome).
- The duplicate-id academy save loads with unique ids and `nextId` above the maximum.
- A `pagehide` dispatched in the same `act` as `doPrestige` writes the post-sale save.
- `simWonderkid` sections 7 and 8 get kids with valid positions, so the rating and age clamps actually run. Section 8's doctored kids use `pos: 'XX'` (`simWonderkid.mjs:353`) and are all dropped before any clamp.
- Every repaired save still loads in the frozen V1 loader with its untouched fields equal.
- `simTycoonRooms` stays green.

**Controls.**
- `ACADEMY_AWAY_CONTROL=fixeddt` restores the 0.25 tick: the hidden-tab tests go red and the closed-tab tests stay green.
- `LOADS_CONTROL=rawlevels`: the doctored-level test goes red.
- `LOADS_CONTROL=updater` restores prestige inside a setState updater: the pagehide test goes red.

**As built, and what the adversarial review changed.** The first draft followed the rows above
and passed every gate. The review found one real defect and five minor ones, and the round was
changed before it shipped:
- **Showcase while away (real).** Away ticks kept the x3 showcase multiplier and never burned
  the showcase, so a hidden tab with a showcase lit trained at 1.5 times the WATCHED speed, and
  one showcase lasted a hundred alt tabs. Away training now excludes the showcase and its clock
  waits, the rule Matchday Hype has had since Round 150. Closing the tab during a showcase had
  the same overpay on the load path before this round; that is fixed too.
- **750 ms on the gap alone (minor, twice).** A hidden tab whose throttled wakes jitter could
  land one gap under 750 ms and reset the meter (twenty hidden hours credited ten), and a slow
  phone with 800 ms visible callbacks was paid as away, froze ages and after eight hours stopped
  the academy while being watched. Visibility now decides: a hidden page is always away, and a
  visible page counts as watched for gaps up to `AWAY_AFTER_MS = 5000`, which only a sleeping
  machine exceeds. This replaces the contract's 750.
- **One giant away step (minor).** Growth slows toward the ceiling, so paying an absence in one
  tick overpaid a closed tab against the same absence paid a wake at a time (85 and 80 against
  83.5 and 79.3 over fifteen minutes). Away time now trains in steps of at most 5 academy
  seconds, and hidden and closed land on identical academies, which the tests now compare
  instead of just the meter.
- **Stale meter after a rollback (minor, not fixed, stated).** An older build keeps `awayMs` in
  the save but never resets it, so rolling back, playing, and rolling forward can withhold up to
  one absence of away pay. Added to the rollback losses in section 10 in spirit; the corpus now
  carries a save with the meter so the frozen V1 build is proven to keep it.
- **Ids at or past 2^53 (doctored saves only).** Kid ids must now be safe integers under a
  billion or they are re-minted.
- **`minute` clamps to 0 to 89, not 0 to 90.** `tick()` settles full time in the same tick that
  reaches 90, so no honest save holds 90, and a loaded 90 would lose that minute off the clock.
- **Controls as shipped:** `fixeddt`, `showcaseaway`, `gaponly`, `quickaway`, `bigstep`,
  `rawlevels`, `updater`, `renderref` over 13 tests, plus three save controls. Each fires exactly
  where its test says.

### Round 582: The league (rides alone)

**Files.**
- `src/lib/leagueCore.ts` (new).
- `src/lib/rebuildDeck.ts` imports `roundRobinCalendar` and `tableOrder` back.
- `src/lib/stadiumTycoon.ts`: `league`, the raw-save seed, fixtures, table, title promotion, offsets, `leagueTitles` in `prestige`, and `title` and `seasonEnd` events.
- `src/components/club-manager/LeagueTableCard.tsx`: optional `zoneTop`.
- `src/pages/StadiumTycoon.tsx`: League tab, header chip, scoreboard, Sell up hint.
- Guide, keywords.
- `scripts/simStadiumTycoon.mjs`: section 8 becomes "each league of n clubs meets n-1 distinct clubs twice", with the collision check kept. Sections 9 and 13 set division through `league` instead of `groundWins` (`:361-366`, `:381`, `:585-595`). Sections 1 to 3 are re-measured with dated values.

**Harness:** `scripts/simTycoonLeague.mjs`, driving `tick` at the hook's real cadence read by regex (`simTycoonClock.mjs:49-55`).
1. Promoted if and only if champion, with both counts printed and non-zero.
2. Table integrity: played = W + D + L = 2(n-1); points = 3 x decisive results + 2 x draws; goals for = goals against; your goals equal your goal events, each with a minute from 1 to 90.
3. Strength decides: the title rate gap between high and low squad levels, against a neutral arm with squad level pinned by an exact-once bundle patch. The fence is set from measured headroom across 10 seeds.
4. Pace against a committed pre-round baseline (`scripts/data/tycoonLeagueBaseline.json`, captured before the first edit): the greedy bot's first promotion comes no later than its first reachable Sell up, or the first-leg fallback in section 5 applies.
5. No reroll: a save reloaded at a random minute finishes with an identical table.
6. Migration: for every `groundWins` from 0 to 250, a frozen-serializer V1 save loads with `league.division` equal to the old `divisionIndex`, and money, lifetime, rep, legacy, `bestDivision`, `ach` and `claimed` are equal. A new save loads in the frozen loader.
7. Names: unique within every league, 19 characters or fewer, zero real collisions with more than 200 real clubs loaded.
8. Rebuild replays unchanged: `simRebuildSeats`, `simRebuildSave`, `simRebuildLoop` and `simRebuildEconomy` green with identical output.

**Controls.**
- `LEAGUE_CONTROL=threshold` (win-count promotion restored): section 1 red.
- `LEAGUE_CONTROL=flat`: section 3 red.
- `LEAGUE_CONTROL=reroll`: section 5 red.
- `LEAGUE_CONTROL=spread` (latch reads the spread save): section 6 red.

**Walks:** `playLeagueTableFit` against the tycoon table at 390 wide.

**As built, what the measurements changed.**
- **One leg at the bottom, from the start.** The pre-league baseline
  (`scripts/data/tycoonLeagueBaseline.json`, committed before the first edit) showed the old
  win count already promoting a greedy player AFTER the first reachable Sell up in 5 of 10
  seeds (median 14.7 minutes against 13.44). A six club double round robin is 21 minutes, and
  measured it promoted after Sell up in 10 of 10. With the section 5 fallback, divisions 0 to 2
  play the first leg only (`SINGLE_LEG_BELOW = 3`): first promotion at 10.5 minutes in 10 of
  10, before Sell up and faster than the old ladder. Section 4's fence is both comparisons, and
  the `doubleleg` control proves it.
- **17 characters, not 19.** Section 8's "248 of 288 names fit at 19 characters" counted
  characters. `playLeagueTableFit` rendered every name in the real row against the shipped
  stylesheet and found 10 of the 18 and 19 character names clipping ("Redmoor Corinthians" and
  the Wanderers), because width is letters. `LEAGUE_NAME_MAX = 17` leaves 168 names, 0 clipped,
  with a `longnames` control that goes red on the uncapped bank.
- **Section 2's "each goal with a minute from 1 to 90"** waits for Round 583, which adds the
  minute to goal events. Section 2 checks your row against your goal and conceded events.
- **The season-end events carry the final table**, so section 1 sorts it itself instead of
  trusting the engine's own choice of champion.
- **A fifth control, `doubleleg`,** joins `threshold`, `flat`, `reroll` and `spread`.
- **`simTycoonLoads` C2** now ignores fields a later round adds to every save (`league`,
  `leagueTitles`, `clubName`) when asking whether a valid save changed, and the corpus raws are
  built with the frozen V1 lib so they stay saves an older build really wrote.

**What the adversarial review changed before it shipped** (two real, one real on doctored saves,
several minor; all fixed except the rollback losses, which are stated):
- **The matchNo climb became a wall.** Opponents strengthened by the career match count, and a
  title-only league turned that into "never": a squad of 3 never left the bottom league in 91 of
  200 three hour runs (the old win count promoted all 200), and title odds fell to 0% by the
  eighth season. **A division's rivals now keep the strength they had when its league was drawn**
  (`league.baseMatchNo`, `leagueMatchNo`): 0 of 200 stuck, title odds flat across seasons, and
  every division up is drawn later and is tougher. This softens the contract's section 5 claim
  that the `matchNo x 0.0011` climb is what makes a ground peak: the peak now comes from the
  division ladder and the ever later draws, and the rules copy and guide say so. Measured cost: a
  greedy bot that never sells up reaches The Summit in about 233 watched minutes (the old game was
  in division 7 at 360), the fast edge of the "weeks 2 to 6" target for a 30 minute a day
  visitor, and real players sell up long before.
- **A league that failed a check was rebuilt from the old win count**, which trails the league by
  up to four divisions, so one bad field or any later change to the league's shape would have
  dropped a club (division 8 to 6, division 4 to 1 in the review's probes). It now rebuilds at
  the stored division capped at the career best.
- **Doctored leagues**: a stored division above `bestDivision` is refused, and a table where wins
  do not equal losses or goals for do not equal goals against is refused.
- **Minor, fixed**: the header chip read "6th of 6" before a ball was kicked; a dead heat at the
  top went against "Your club" on name (it now goes to your club); keeping "Your club" is saved;
  the League tab shows last season's final table instead of silently wiping; the season label and
  the Summit copy are corrected.
- **Rollback losses, stated not fixed**: the frozen V1 `prestige` drops `league`, `leagueTitles`
  and `clubName`, and V1 shows the division from the win count, so rolling this round back shows a
  lower division until rolled forward and forgets titles earned before a V1 sale.
- **Harness**: `simTycoonLeague` sections 9 (no wall) and 10 (the loader) with controls
  `globalclimb`, `dropdivision`, `uncapped`, `lopsided` and `nametie`; `simTycoonRooms` test 8
  renders the League tab and the name picker with a `noleague` control.

### Round 583: The pitch, goals, taps and honest help

**Files.**
- `stadiumTycoon.ts`: `TickEvent.minute`, and the tap comment only.
- `useStadiumTycoon.ts`: `fmtMoney` floaters and the replay queue.
- `src/components/tycoon/TycoonPitch.tsx` (new).
- `StadiumTycoon.tsx`: geometry, 22 players, replays, pop, sparks, the "12 taps" chip, keyboard tap, reduced motion, help before play with "Let's go", a named close button (`:554`), and perk buttons at least 30px tall (today `py-1 text-[9px]` at `:485`).
- The lower half of the Stadium tab becomes tiles: Upgrades, Payroll, Badges, Legacy, Records. `data-sell-up` and `data-perk` are kept, and `playLegacy` opens Legacy by its tile title (the contract at `HubTiles.tsx:24`).
- `soccer2.ts` copy fixes (section 12), keywords.
- `playSessionMarks.mjs` and `playLegacy.mjs` dismiss help first.

**Harness:** `scripts/simTycoonPitch.mjs` on the page rig.
- Replays equal goal and conceded events one for one, by side and minute, over 30 matches at the 0.2 second cadence.
- Over 1,000 taps from $1 to $1e15 and every event kind, the floater text equals `fmtMoney` of the real change.
- Under reduced motion no replay, pop, spark or drift animates, and floaters are static.
- Help opens on a fresh save and not on an existing one.
- A claims table ties every number in help and guide to an engine export.
- Enter on the focused pitch pays one tap.

**Controls.**
- `PITCH_CONTROL=decor` (ball keyed to a timer): one-for-one check red.
- `PITCH_CONTROL=raw`: floater check red.
- `PITCH_CONTROL=nohelp`: help check red.
- `PITCH_CONTROL=typed` (a typed number in the guide): claims check red.

**As built, part one: honest help, floaters and the keyboard tap.** The round ships in two halves
so the corrected help does not wait on the pitch. Part one is everything above except
`TycoonPitch.tsx`, the replays, pop, sparks, the "12 taps" chip, reduced motion and the tiles,
which are part two with `simTycoonPitch` and its `decor` control. What part one changed from the
rows above:
- **Harness `scripts/simTycoonHelp.mjs`** (suite `src/test/tycoonHelp.test.tsx`) carries this
  half. Controls: `rawtap` and `rawgoal` (the `raw` control split, one per floater path),
  `nohelp`, `deadkey`, `typed`, `stale`, `engine`, `typedmodal` and `typedfact`, nine in all.
- **$1e15 is not reachable**, so the floater test does not claim it. A save the loader keeps tops
  out at a $9.8T tap (a maxed club at 50 stars with a ten game streak, Hype and a crowd surge),
  and the windfall's $1e15 cap sits far above the $1.9e13 the richest income could pay. Test 1
  covers $3 to $9.8T over 1,196 taps and every `fmtMoney` branch but Q; test 2 covers 553 goal,
  win and milestone events.
- **The keyboard tap is a real button** beside the pitch, hidden until focused and calling the same
  `doTap`, instead of Enter on the pitch div, so there is one tap path. `deadkey` leaves the
  button in place and makes it pay nothing.
- **The claims table measures what no export states**: a match lasts 126.0 seconds at the hook's
  0.2 second cadence (the guide's "about two real minutes" and "fifth matchday about ten minutes
  in"), and the greedy floor player from `simStadiumTycoon` can first sell up at minutes 12.7,
  12.7 and 13.3 ("around a quarter of an hour", band 10 to 20). 41 stadium guide claims, 6 in the
  modal's own words, 7 excused idioms ("once you have opened it"), each idiom itself checked to
  still be in the text.
- **Copy the table found wrong beyond this section's list**: DERBY DAY never multiplied goal or
  win bonuses either, so "everything pays x7" (the engine's own blurb, the guide three times) and
  the Hype button's "everything pays x2" now say income, and the frenzy claim fails if the blurb
  says everything while bonuses ignore it; the badge chip's typed 2 reads `ACH_BONUS`. Hype does
  not fully double a tap (the
  Megaphone's flat part is not doubled), so the modal and guide say taps rise with it; "Ten
  minutes in, the ground is full at 280 seats" was false for the measured player (2,040 seats and
  1,234 fans at minute 10), so the example keeps the 280 crowd's 168 dollar goal without a clock;
  "two benches" had no engine behind it; the `incomePerSec` comment saying Hype doubled bonuses
  is corrected. `WINDFALL_SEC`, `GOLDEN_CATCH_SEC` and `GOLDEN_MEAN_GAP_SEC` are exported so the
  hook, the engine and the help read one number each.
- **The academy guide** has only its two corrected lines claimed ("about a quarter more", and the
  move up leaving cash behind). Its full table comes with the 589 fold.
- **Goal and conceded events carry `minute`** from this half, for the replays in part two.

**As built, part two: the pitch, the office tiles, and every number on the screen.**
- **`src/components/tycoon/TycoonPitch.tsx`** carries the pitch: a vertical halfway line, centre
  circle, both penalty areas, six yard boxes and nets; 22 players from a static 11 entry 4-3-3,
  mirrored; idle drift by CSS keyframes with `seatRand` phases; the ball at a spot hashed from
  `totalMatches` and the minute, so it moves with the match clock; the scoring side's shape pushed
  up by a class during its replay. The 1900 ms interval is gone.
- **Replays come from the hook's queue**, one entry per `goal` or `conceded` event with its side and
  minute, written only while the Stadium room is visible (`watchReplays`), so a goal scored under
  the League or Academy tab is on the scoreboard on return and never replayed late. A replay runs
  1.3 seconds; with more than two queued the head lands on its final frame for 0.25 seconds. The
  goal floater reads "GOAL 34' +$X" and a conceded one "34' they score".
- **Tap feedback**: a 1.02 pop over 120 ms (two identical keyframes alternate so every tap restarts
  it), six sparks at `seatRand` angles, and a "12 taps" chip that clears after 1.5 seconds idle.
  The keyboard button from part one shares it. The contract's `role="button"` on the pitch was not
  used, for the reason part one gave.
- **The office**: five tiles (Upgrades, Payroll, Badges, Legacy, Records), one panel open at a
  time, Upgrades on arrival. The Legacy tile keeps `data-legacy-drawer`, `data-sell-up` and
  `data-perk` stay, and `playLegacy` opens the boardroom by the tile's title.
- **Every number on the screen**, not only in the modal: `simTycoonHelp` section M2 parses the page,
  the hook and the pitch with the TypeScript compiler and fails on any digit or number word in
  player-facing text that no claim backs, and section L1 does the same for the engine's blurbs. It
  found the away card's "half speed" (wrong for anyone holding the Away Day Deal, which pays 65 or
  80 percent), the Sell up button's typed "+50%", the boardroom's typed "1 for the sale plus 1 per
  division, so a Summit sale pays 10", the badge panel's "+2% to everything you earn", and the
  sale note's `pointsForSale(s) + 1`; each now reads the engine. `HYPE_MULT`, `FRENZY_MULT` and
  `TAP_RUSH_MULT` are exported so the payout and the words that name it are one number, and the
  tap comment now says reputation counts twice in a tap on purpose.
- **Harness `scripts/simTycoonPitch.mjs`** (suite `src/test/tycoonPitch.test.tsx`): 186 goals over
  30 watched matches replayed one for one by end and minute with no goal waiting over 7 frames; 15
  goals under the League tab and none replayed on return; reduced motion holds the ball in play
  with no sparks or pop while floaters land; the chip, sparks, pop and 22 players; the tiles; a
  360 goal storm shown in order with 179 landing on their final frame. Controls `decor`, `backlog`,
  `motion`, `xchip`, `deadtiles`, `nolanding`, and source controls `interval` and `random`.
  `simTycoonHelp` adds controls `typedscreen` and `typedblurb`.

### Round 584: Away matchdays (rides alone)

**Files.**
- `stadiumTycoon.ts`: `playMinute` lifted from `:841-896` with the `BANKED` lines in `tick` kept verbatim (`simTycoonClock.mjs:42-44`); `AWAY_MATCHDAY_SEC = 1800`; `awaySecondsOf`, with `offlineEarnings` rewritten on it using identical arithmetic; `playAwayMatchdays`.
- `useStadiumTycoon.ts`: `settleAway` plays them. The `onVisibility` block (`simTycoonAway.mjs:61-66`), `if (acc >= 0.2)` and the four `markSessionPlay();` calls stay verbatim.
- `StadiumTycoon.tsx`: the away card chips.
- Guide, keywords.

**Harness:** `scripts/simTycoonAwayMatchdays.mjs` plus new sections in `src/test/tycoonAway.test.tsx`.
1. **Identity.** 40 seeded states, 5 matches each through `tick` at the hook's dt, against `playAwayMatchdays` on the same roll stream. 200 of 200 identical scorelines, streaks, `matchNo`, `totalMatches` and table rows.
2. **Count.** Absences of 0, 29 seconds, 1,799 seconds, 1,800 seconds, 3 hours and 8 hours play 0, 0, 0, 1, 6 and min(16, matchdays left minus 1). A hidden tab and a closed tab play the same number.
3. **Money untouched.** Away matchdays change neither money nor lifetime. The existing `simTycoonAway` sections stay exact.
4. **Finale waits.** The final matchday never plays away. No title or promotion happens away.
5. **Outcome against baseline.** Today's code plays 0 away matchdays. 40 mid-season clubs away 8 hours play a mean at or above a fence set from measured headroom. The loss share of a club that buys nothing is printed.

**Controls.**
- `AWAY_MATCHDAY_CONTROL=off`: 2 and 5 red.
- `AWAY_MATCHDAY_CONTROL=copy` (private loop without the squad defence term at `:746`): 1 red.
- `AWAY_MATCHDAY_CONTROL=cash`: 3 red.
- `AWAY_MATCHDAY_CONTROL=finale`: 4 red.

**As built, and what the adversarial review changed.**
- **`playMinute`** is tick's minute loop body, lifted; the review ran HEAD's `tick` against this one
  over 1,200,000 calls on 60 clubs and found 0 differences, and `offlineEarnings` (now on
  `awaySecondsOf`) matched HEAD with `Object.is` on 52 inputs. `playAwayMatchdays` plays
  `awayMatchdaysPlayable` matchdays: the match in progress first, a leftover friendly outside the
  table, and never the final matchday.
- **The review found a real overrun on doctored saves.** Each away matchday first ended when
  `totalMatches` changed, and the loader keeps any finite count: at 2^53 adding one changes
  nothing, so a matchday ran its 91 guard minutes and spilled on until a title, a promotion and
  the Summit prize happened away (money 40 to 4,272 in one probe). Each matchday now ends at its
  own full time. Section 4 carries 20 doctored counters and a `counter` control.
- **The review found a lost reward.** Milestones and badges waited for the first live tick, so a
  five win run played away and lost before you came back was never rewarded (285 of 2,000 eight
  hour trips). The settle loops are lifted into `settleFirsts`, run after every away matchday, so
  away play pays milestone money exactly as live play would. The contract's "money untouched"
  therefore reads "no goal or win bonuses": section 3 requires money to move by exactly the
  milestones reached, section 6 (control `nofirsts`) requires every streak first reached away to be
  kept, and the away card lists the milestone money on its own line.
- **Also from the review**: the card said "no bonuses paid" (now "no goal or win bonuses"); a
  leftover friendly is marked as one and never earns a table line; the table line is a snapshot
  taken at the settle, so a card left open never describes a later table; a club with no income
  still plays its matchdays; section 1 also compares `totalWins`, `totalGoals` and `groundWins`;
  section 5 adds a real outcome (a squad of 50 wins 94.8% of its away matches, a squad of 0 wins
  8.8%, fence a 50 point gap) because the count alone is arithmetic; vitest 7's dead assertion is
  replaced by "the season did not turn over, and a capped trip stops on the final matchday".
- **Measured**: 200 of 200 matches identical; absences of 0 s, 29 s, 1,799 s, 1,800 s, 3 h and
  8 h play 0, 0, 0, 1, 6 and 16; a mean of 10.1 matchdays for 40 mid-season clubs away 8 hours;
  a club that buys nothing loses 38% of its away matches.

### Round 585: Gems and packs (rides alone)

**Files.**
- `src/lib/tycoonRewards.ts` (new; pure logic plus the only storage writer for the ledger).
- `stadiumTycoon.ts` and the hook: credit full times and titles through the ledger, keyed on `totalMatches`.
- `wonderkidFactory.ts`: `PACKS`, `makeProspectInBand`, delivery, `packsDelivered`, `tier`, carried through `moveUp`.
- `AcademyPanel.tsx`: the Packs tile with the always-visible odds panel and a one-card reveal.
- `StadiumTycoon.tsx`: a gem chip.
- Help, guide, keywords.

**Harness:** `scripts/simTycoonPacks.mjs`.
1. Odds on screen come from `PACKS` (DOM equals constant, no percent literals in the panel code).
2. 200,000 seeded opens per pack land within 0.3 points of every tier, with a detection-power control.
3. Expected ceiling strictly rises; the pity mean gaps equal 6.51 and 1.96 to two decimals.
4. The guarantee fires exactly on the Nth miss.
5. One way: 100,000 random sequences of every non-match action never change `earned`. A watched full time changes it by exactly 3, 1 or 0, a title by +20 or +6, an away win by 1. A replayed full time pays 0.
6. Card tier equals tier drawn.
7. A reload mid-reveal shows the same kid, delivered exactly once.
8. 500 scout finds are byte identical to the pre-round fixture.
9. New academy saves load in the frozen loader.
10. Source fence and banned words.
11. First run of the dry-spell fence; threshold set.

**Controls.**
- `PACKS_CONTROL=skew` (2 points moved from Talent to Star): 2 red.
- `PACKS_CONTROL=reorder`: 8 red.
- `PACKS_CONTROL=fallback`: 6 red.
- `PACKS_CONTROL=reroll` (drawn at reveal): 7 red.
- `PACKS_CONTROL=refund` (a gem credit planted in open): 5 red.

**As built, and what the adversarial review changed.**
- **`src/lib/tycoonRewards.ts`** holds the ledger (`tycoonRewardsV1`): `earned`, `spent`,
  `lastMatch` (the career match count of the last full time credited), packs `opened`, `dry`
  counters for the guarantees, a `seed`, `nextSeq` and a `pending` draw. `TIERS` and `PACKS` live in
  `wonderkidFactory.ts` beside `makeProspectInBand`, `deliverPack` and the optional `tier` and
  `packsDelivered` fields; the scouts call the same generator with their region band and the academy
  seed, and 500 finds captured before the edit (`scripts/data/academyScoutBaseline.json`, committed
  first) are byte identical. The stadium hook credits a watched full time (with the season's final
  place when it ends one) and the away settle credits away wins; nothing else calls
  `recordFullTimes`. The Packs panel (`PacksPanel.tsx`) is a tile in the academy on both doors, and
  the stadium header carries a gem chip.
- **Measured**: 200,000 draws per pack within 0.149 points of every odd (a one point shift reads
  1.03); expected ceilings 67.8, 76.4, 83.3; mean packs between Stars 6.49 and 1.95 against the exact
  6.51 and 1.96; every guarantee on pack 10 and pack 3, never a pack early; 100,000 action sequences
  moved `earned` 0 times.
- **The review found every player drawing the same packs.** The ledger seed was the constant 585,
  so every new player's free Scout Pack was the same Grassroots kid and the whole sequence could be
  read off the public repo (4.6 times the published Phenom rate per gem for a player who planned
  around it). A ledger now takes `freshSeed()` the first time it is stored; section 12 and the
  `sameseed` control.
- **The review found "Welcome him in" deleting a kid who never reached a bed**, and a ledger lost
  while the academy remembered its packs swallowing every later pack until its numbers caught up.
  A pack can only be dismissed once delivered (the card says he moves in when a bed frees), and
  the next pack's number runs past `packsDelivered` (`nextSeq`, `minSeq`); section 13, vitest 6 and
  7, controls `forgetful`, `wavedaway` and `seqreuse`.
- **Also from the review**: opening a pack no longer records a session (safeguard 2 keeps packs
  away from streaks); a stored kid is sanitised into his tier's band before he moves in, and a name
  clash no longer draws from the academy's seed; a pack kid moving in from the clock gets his own
  floater; "a draw" reads "a watched draw" (an away draw pays nothing); the academy guide says a
  pack kid's band is known; a blocked storage keeps gems for the visit. The harness gained the
  call-site fence on `recordFullTimes`, the banned words across `AcademyPanel.tsx`, the `moveUp`
  carry, vitest 8 (away wins and a watched title through the real hook), and controls for every
  page test (`panelodds`, `freeprice`, `tiercard`, `gemtap`).
- **The Codex continuation reproduced three more save defects before release.** A malformed
  stored nation or position crashed the reveal; both the card and delivery now use the same
  `cleanPackKid` normalization, including own-key checks for nation names. A refused academy
  write used to count a kid as delivered in memory, then Welcome cleared the only durable
  copy. Delivery now saves a candidate academy before accepting it, and dismissal saves the
  current academy before clearing the draw. Conversely, a refused ledger write could still
  persist the kid without its debit; opening now requires the ledger write to succeed. The
  page explains when storage is full or blocked and retries keep the original draw. Result
  earnings retain the existing memory fallback. Four real-page regression cases and the
  `rawkid`, `unsaveddelivery`, `unsaveddismiss` and `unsaveddebit` controls cover these paths;
  an independent reviewer also passed five isolated reload and recovery probes. The watched
  match test now mocks both `performance.now` and frame timestamps, removing a test-clock race.
- **The dry-spell fence** is the contract's: a greedy bot plays 40 hours of stadium, academy and
  packs over 50 seeds; the 90th percentile of its longest stretch without an unlock measured 52.8
  minutes (every longest stretch ended in an affordable pack), so the fence is 79 (1.5 times). The
  `dear` control (every price times four) turns it red.
- **The controls run in process on every invocation**, with no `PACKS_CONTROL` variable: `skew` moves
  Star by 3 points; the contract's `reorder` became `scoutdrift` (S8), `fallback` became `tiercard`
  (vitest 3), `refund` became `leak` (S5), and `reroll` drops a stored draw on load (S13, vitest 4 and
  6 and 9). Twenty-two controls in all, with twelve real-page tests.
- **The twice-daily pace is now measured**, by `scripts/simTycoonPackPace.mjs`: 100 seeds per
  policy, two five-minute visits twelve hours apart, real 0.2s ticks, capped away matchdays and
  the final-match hold. With immediate Sell up, 92/100 reach a paid Scout by day 2, 100/100
  can afford a Club by day 5, and 99/100 can afford that Club after opening a paid Scout first.
  Waiting until a season ends before Sell up reaches all three deadlines in 100/100 runs;
  median visits are 2, 5 and 7 respectively. Each policy buys the cheapest useful upgrade,
  without taps, staff, boosts, whistles or legacy purchases. The test measures affordability
  with a bed available, after the free Scout, not how fast a newcomer learns the controls.
  Its explicit population target is p90, with the missed tail printed rather than hidden;
  this is not a guarantee to every player. Fourfold prices break all six pace checks, with
  0/100 meeting each deadline. No prices or gem sources changed.
- **Stated, not fixed**: a stale background tab that saves last can roll the stadium's match count
  back, and gems then pay nothing until live play passes the credited count again; the ledger is
  written before the stadium save, so a crash in that window loses gems, never gains them; two
  visible tabs can each play a match on the same save.

### Round 586: Every player on one value curve (rides alone)

**Files.**
- `src/lib/playerValue.ts` (new).
- `wonderkidFactory.ts`: `firstTeam` (5 slots), `promote` (ages 18 to 23), `SENIOR_YEAR_SEC`, senior growth, decline and retirement, `sellSenior`, `squadEdge`, carried through `moveUp`.
- The stadium hook takes an optional `getEdge`. The page computes it from the panel's snapshot, or before first open from a read-only `deserialize` of the academy key.
- `playMinute(..., edge = 0)`.
- `AcademyPanel.tsx`: the First team tile, with next birthday and next-birthday fee on each card.
- Guide, keywords.

**Harness:** `scripts/simAllPlayersValue.mjs`.
1. Every kid fee at ages 23 and under is byte identical to the pre-round `basePrice` across the 52,920 case grid.
2. Senior fees strictly fall across 27, 29 and 31 for every rating, potential and position.
3. The two-sided policy test with the fixed refill rule.
4. An empty first team leaves the stadium engine identical.
5. Every rating point from 60 to 99 lowers the opponent chance, and `tick` sees it (test every step, and the consumer).
6. `firstTeam` survives `moveUp` and Sell up on the new build.
7. Time to every academy star with packs in the loop is printed. The region 6 goal is retuned only if it exceeds 100 watched hours.

**Controls.**
- `VALUE_CONTROL=noprime`: 2 and the earn half of 3 red.
- `VALUE_CONTROL=flatedge`: the win half of 3, and 5, red.

Round 586 implementation evidence and contract corrections are in section 18.

### Round 587: Set pieces (rides alone)

**Files:** `src/components/tycoon/SetPieceBoard.tsx`, `stadiumTycoon.ts` (`setPieceOffer`, `awardSetPieceGoal`, `setPieceUsedMatch` in `prestige`), the hook, the page, help.

**Harness:** `scripts/simTycoonSetPiece.mjs`.
- Never more than one set-piece goal in 10,000 matches.
- Ignoring every offer reproduces the baseline engine exactly.
- A perfect kicker's mean win-rate uplift over 2,000 seeded matches sits inside a band from measured headroom (a mean, never a max).
- The board imports neither `useGameCompletion` nor `arcadeRecord` (import walk plus a runtime spy).
- `simFreeKick` unchanged.

**Controls:** `SETPIECE_CONTROL=twice`; `SETPIECE_CONTROL=daily` (the board imports `arcadeRecord`).

### Round 588: Gear on a fixed schedule (rides alone)

**Files:** `tycoonRewards.ts` (unlocks and kit upgrades keyed on the title's `totalMatches`), `wonderkidFactory.ts` (`bootId` on seniors, gear inside `squadEdge`), the First team tile.

**Harness:** `scripts/simTycoonGear.mjs`.
- The fee grid is identical with and without gear.
- Every level step changes its wearer's `f` contribution, and `tick` sees it.
- Unlocks come only from title events (source fence).
- Effective rating is capped at 99.
- Names come only from `BOOTS`.

**Controls:** `GEAR_CONTROL=fee`; `GEAR_CONTROL=pack` (a pack grants gear): fence red.

### Round 589: One door (floating; held, see section 17)

**Files.**
- `src/App.tsx:402` becomes a `Navigate`; stub via `genRetiredStubs`; the registry row at `gameRegistry.ts:80` removed.
- `completionSlugs.ts` retirement entry, **not a mapping**.
- The hook `onPlay` rewiring (section 11); `WonderkidFactory.tsx` deleted; `loader.ts:138` removed; the academy guide folded into `/stadium-tycoon`.
- Prose and links: `IdleArena.tsx:369-370`, `sportHub.ts:96,113`, `world.ts:846`, `scripts/data/hubCopy357.json:11,60`.
- `simIndexNow.mjs:31` floor from 148 to 147, with a history note.
- `sweepWeight.mjs:53` and `playReducedMotion.mjs:126` updated.
- `simWonderkid` section 9 rewritten.
- Every snapshot that links the old route re-prerendered: today `public/club-manager`, `idle-arena`, `search`, `soccer`, `soccer-conquest` and `stadium-tycoon`.

**Harness:** `simRetiredRoutes` (existing), plus a `simTycoonRooms` test that an academy-only save arriving on `/stadium-tycoon` lands in the Academy tab with its kids byte identical.

**Control:** `TYCOON_ROOMS_CONTROL=nodetect`.

**Flagged follow-up:** sport credit reads the registry only (`src/lib/achievements.ts:318-323`, `src/lib/badges.ts:70-73`), so old Wonderkid completions stop counting toward Soccer. That needs its own small fix.

### Deferred, each with a trigger

| Item | Trigger |
|---|---|
| Worlds as data | The scripted 30-minute-a-day player reaches a Summit title inside four simulated weeks, and 589 has been decided |
| Consolidating the mulberry32 copies | After this arc |
| The Hall of Champions fixed-dt fix | Its own round |

---

## 15. The harness for round one

**Files:** `scripts/simTycoonRooms.mjs` (wrapper in the shape of `simTycoonAway.mjs:71-99`) and `src/test/tycoonRooms.test.tsx`.

### Rig: everything real except the network

- `import './dailyReload/mocks'` first: signed-out auth, stub Supabase, and `recordCompletion` as a counted `vi.fn` (`mocks.ts:160`, reset with `resetMocks` at `:187`).
- `mountPage` for Helmet plus `MemoryRouter` (`src/test/dailyReload/harness.tsx:18-25`).
- The real pages, both real hooks and libs, and jsdom localStorage.
- `Date.now`, `performance.now`, the `requestAnimationFrame` stub and the seeded `Math.random`, as in `tycoonAway.test.tsx:120-131`, with `EPOCH = 1767225600000`.
- `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })` for the academy's 250 ms interval and the floater timeouts.
- One `step(ms)` in 16 ms increments. Each increment advances the virtual clock, runs `vi.advanceTimersByTime(16)`, and delivers a frame only if the page has asked for one. The virtual clock moves even with no frame registered, so a control that stops the loop still lets time pass.
- `await act(async () => {})` after every tab click, to resolve the lazy panel.
- State is read by dispatching `pagehide` and parsing the key. Both hooks already save on it.

### The save corpus (`src/test/fixtures/tycoonSaves.json`)

| Name | Key | Shape |
|---|---|---|
| `fresh` | stadium | `newTycoon(EPOCH)` |
| `midGame` | stadium | fanbase 900; stands 30, tickets 20, squad 25, megaphone 10; rep 1; matchNo 37; minute 52; matchSec 0.9; score 2 to 1; streak 3; groundWins 22; bestDivision 2; two staff; two real badge ids; legacyPoints 3; sway 1; `legacySeeded` true |
| `preBoardroom` | stadium | `midGame` with rep 2 and no legacy fields (the raw-latch path) |
| `doctored` | stadium | levels `{ squad: "abc", stands: -4, bogus: 9 }`; `matchSec` NaN; minute 400; `savedAt` "tomorrow"; streak -3; matchNo -5; money 1e308 |
| `fresh` | academy | `newFactory(EPOCH, 7)` |
| `midAcademy` | academy | rep 2; levels 6, 5, 3, 4; six kids aged 15 to 23 including one aged 23 with `ageClock` 230; `deadlineIn` 300; cash 5000; lifetime 60000; `nextId` 40; `lastSeen` EPOCH |
| `duplicateIds` | academy | `midAcademy` with two kids sharing id 12, `nextId` 5 and rep 1.5 |
| `doctoredKids` | academy | valid positions and nations, rating 120 over potential 80, age 30, `ageClock` 1e9, scouting 9999, plus one kid with `pos: 'XX'` |

**As built in Round 580, three deliberate differences from the rows above:**
- `midAcademy` has levels scouting 2, coaching 5, dorms 9, agents 4, not 6, 5, 3, 4. With three dorm levels the academy has six beds, so six kids fill it and `bedsFull` lights the Academy accent from the first second. Test 6 could then never read `"false"` at 5 seconds. Twelve beds and a find every 20 seconds cannot fill inside that test, so the only thing that can light the accent there is the kid about to turn 24.
- `doctored` stores `matchSec` as `null`, not NaN. A NaN cannot be written to JSON (it serializes as null), so a raw NaN save would be refused whole by `JSON.parse` and would test nothing about field validation.
- A tab's accent lights only while that room is NOT the one on screen. Tests 6 and 7 only sample the other room, so the contract's assertions are unchanged.

### Strongest signal: the stadium never stops while you are in the Academy

- **Session S:** load `midGame`. 60 seconds on the Stadium tab, 60 seconds on Academy, 60 seconds back on Stadium.
- **Baseline B:** the same fixture, epoch and seed, 180 seconds on the Stadium tab.
- **Measure:** match clock seconds, `clockSec = (totalMatches x 90 + minute) x 1.4 + matchSec`, gained in S against B.
- **Expected:** drift 0.000. The clock advances only through `tick`'s banked seconds (`stadiumTycoon.ts:834-842`), and no random roll touches it, so an extra draw anywhere on the page cannot move it. That is why this replaces the draft's money margin.
- **Margin:** 0.5 seconds, the `tycoonAway` reasoning: the uncredited residue at any moment is under 0.216 seconds (`acc >= 0.2` at `useStadiumTycoon.ts:124` plus one 16 ms frame).
- The lifetime ratio prints for information only.

### Tests (vitest), each against a baseline

1. **Rig alive.** 90 seconds on the Stadium tab from `fresh` advances `clockSec` by 90 ± 0.216. No `[data-academy-panel]` exists, and after `pagehide` `localStorage.getItem('wonderkidFactoryV1')` is null.
2. **Stadium continuity:** the signal above.
3. **Academy parity.**
   - Merged run: `midAcademy` in storage, `/stadium-tycoon` mounted, Academy clicked at t = 0, 60 seconds.
   - Standalone run: `@/pages/WonderkidFactory` at `/wonderkid-factory`, 60 seconds, the same 16 ms steps.
   - The two saves after `pagehide` are byte identical.
4. **The academy keeps its watched clock once opened.** Academy for 60 seconds, Stadium for 120 seconds, Academy again. The save is byte identical to the standalone page after 180 seconds. The line prints how many academy seconds the kids aged while unseen.
5. **Marks.**
   - From `fresh`, the first pitch click produces `[['/stadium-tycoon']]`, and a second click adds nothing.
   - With `midAcademy`, one sale on the Academy tab adds exactly `['/wonderkid-factory']`, and a second sale adds nothing.
   - No call ever carries a second argument.
6. **Academy accent.** `midAcademy` (a kid at 23 with `ageClock` 230). Academy at t = 0, Stadium at t = 1 second.
   - `[data-room="academy"]` has `data-accent="false"` at t = 5 seconds and `"true"` at t = 12 seconds.
   - After the kid walks at `ageClock` 300 it reads `"false"` again, and the save's `leftFree` rose by 1.
7. **Unseen promotion waits.** A stadium fixture at minute 89 with a 3 to 0 score and `groundWins` 5. Academy at t = 0, then 14 seconds.
   - `[data-room="stadium"]` has `data-accent="true"` throughout, past the 4 second timer.
   - After switching to Stadium, `[data-promotion-card]` is present, and 5 seconds later it is gone.

### Save sections (node, in the wrapper)

- **B1.** Bundled current libs export `TYCOON_SAVE_KEY === 'stadiumTycoonSaveV1'` and `SAVE_KEY === 'wonderkidFactoryV1'`. No harness pins either key string today.
- **B2.** All eight corpus entries through the current loaders re-serialize to their recorded `loaded` strings at the fixed `NOW`.
- **B3.** Both frozen copies match `pins.json` by sha256 and reproduce the same eight outputs.
- **B4.** The wrapper parses `RIVAL_NAMES` out of `scripts/simNoRivalNames.mjs`, reads the cited app name from `docs/TWEAKS-2026-08-28.md` with `/Inspiration: the ([\s\S]+?) app\./` (whitespace normalized, so the harness never contains the name), and requires exactly one entry to match it and that entry not to match `src/lib/nhlCareerLifeA.ts:492`.
- **B5.** The corpus holds at least four stadium and four academy entries, including a raw save without `legacySeeded`, a doctored stadium save, a duplicate-id academy save and a valid-position doctored academy save. This stops later rounds thinning it.

### Negative controls

Each control asserts every anchor it rewrites is present, or refuses to run. Page copies are written to `dist/.tycoon-rooms-control-<name>/StadiumTycoon.tsx` and passed through `TYCOON_ROOMS_PAGE`. Lib and corpus copies go to `os.tmpdir()`. All are removed on exit.

| Control | What it plants | Must go red | Must stay green |
|---|---|---|---|
| `remount` | Removes `const g = useStadiumTycoon();` from the page; replaces `function StadiumRoom({ g, visible, onNeedsYou }: {...}) {` with a signature that calls the hook itself; replaces `<StadiumRoom g={g} visible={room === 'stadium'} onNeedsYou={setStadiumNeedsYou} />` with `{room === 'stadium' && <StadiumRoom visible onNeedsYou={setStadiumNeedsYou} />}` | 2 (drift about 60 seconds: ESTIMATE 120 of 180 clock seconds, printed) | 1, 3, 4, 5, 6 |
| `unmountacademy` | Replaces `{academyOpened && (` with `{room === 'academy' && (` | 4, 6 | 1, 2, 3, 5 |
| `doublemount` | Adds `useWonderkidFactory();` after the page-level hook line, with its import | 1 | 2, 5 |
| `noaccent` | Replaces `onStatus={setAcademyStatus}` with `onStatus={() => undefined}` | 6 | 1, 2, 3, 4, 5 |
| `unseentimer` | Replaces `if (!g.promotion \|\| !visible) return;` with `if (!g.promotion) return;` | 7 | 1 to 6 |
| `bump` | A lib copy with `SAVE_VERSION = 2` | B2 | B1, B3, B4, B5 |
| `rename` | A lib copy with a different `TYCOON_SAVE_KEY` | B1 | B2 |
| `tamper` | A frozen copy with one byte changed | B3 | B1, B2 |
| `shortname` | A copy of `simNoRivalNames.mjs` with the new entry cut to its first two words | B4 | B1, B2, B3 |
| `thin` | A corpus copy without its doctored entries | B5 | B1 to B4 |

**The wrapper passes only if** the plain run is fully green with at least 7 `ROOMS|` lines, and every control produces exactly its pattern. Runtime alone proves nothing; the reprinted measurement lines are the evidence.

---

## 16. Risks, and what I am unsure of

### Risks

1. **The combined rig is untested.** Fake timers, the frame stub and a lazy `Suspense` panel together in jsdom have never run as one rig. Each exists separately (`tycoonAway.test.tsx`, `clubManagerSave.test.tsx`). If lazy resolution fights the fake timers, preload the panel module in `beforeAll`.
2. **Control copies in `dist/`.** They follow precedent, but the suite must never run during a build (CLAUDE.md), because a build empties `dist`.
3. **Weight.** The panel is lazy in 569. The league table, pitch, packs and first team must also load lazily, or the 290K budget (`sweepWeight.mjs:50`) breaks. `sweepWeight` is outside `runAllSims`, so it runs by hand.
4. **Pace.** The league can delay the first promotion past the first Sell up. Section 5 has the fallback, and 582 measures it.
5. **Away matchdays make idle clubs lose more.** They count toward `matchNo` (`stadiumTycoon.ts:744`), so a club that buys nothing loses more over a long absence. 584 prints the loss share. The intended signal is "sell up".
6. **Gem pacing is estimated.** Section 5's price rule is the fix, and a gem source is never the fix.
7. **The first team edge could dominate mid-game.** The multiplier is ESTIMATE, and the two-sided test is the fence.
8. **Two currency symbols** on one page may read as a bug. Deliberate, section 5.
9. **The owner may picture flashy pack openings.** The plain one-frame reveal is right for this audience, and he should be told plainly.
10. **The retired slug trap** survives only if section 11 survives into 588.
11. **Rollback losses** in section 10 are real, which is why 586 is never reverted after promotions happen.
12. **Two browser tabs** can race the rewards ledger in a tiny window.
13. **The frozen V1 libs** could be mistaken for an engine copy in review. `pins.json` and this contract say what they are.
14. **Sport credit** after 589 (flagged in the roadmap).

### Unsure of

- Whether 15 minute senior years feel right against a five minute average session (`docs/PROJECT-STATE.md:4324`).
- Whether the owner reads "packs" as players, gear or both. This ships players in packs and gear on a schedule.
- Whether title-only promotion with the `matchNo` climb makes the late divisions a wall. The p90 dry-spell fence is the check.
- Whether rendering nothing while hidden is enough for the academy's four updates a second on a low-end phone. Measure the commit rate in 580.

---

## 17. Decisions owed by the owner

Only two items genuinely need Anthony, because both touch the money side of the site. Each has a default so work can proceed without waiting.

1. **When `/wonderkid-factory` retires (Round 589).**
   - The last recorded AdSense state is the "Low value content" card still showing after the 2026-09-02 review (`docs/PROJECT-STATE.md:920-922`).
   - Directive 3 protects production routes during review (`docs/OWNER-DIRECTIVES-2026-08.md:57-61`).
   - Retiring the route removes one indexable page, even with its words folded into the tycoon's guide.
   - **Default:** hold 589 until AdSense approves the site. Both doors stay live. Every other round proceeds, because nothing depends on it.
2. **Ad slots on the tycoon page.**
   - The page has no ad slot today.
   - **Default:** add none in this arc. If one is ever added, it sits below the guide, never beside the tab strip, the pitch or the pack panel, and never offers gems for viewing.

## 18. Round 586 implementation evidence, 2026-09-15

Source and focused tests are complete; release gates and publication are separate.
The original contract above stays as the proposal. These measured corrections
describe the implementation and supersede its unsupported numerical assumptions.

- The old 52,920 quote sample cannot be reproduced because its sampling definition
  was never stored. The harness instead checks 334,620 explicitly enumerated youth
  quotes against a frozen pre-round fee function, with the original multiplication
  order. It also checks 18,920 senior age comparisons.
- Twelve frozen stadium histories cover watched and away play with zero edge.
  All 195 one-point rating steps from 60 through 99 use the real tick consumer;
  the away consumer is tested too. No empty-roster result changes.
- The policy comparison fixes ten mid-division seasons, fixtures, upgrades, random
  streams and a greedy refill rule. It uses a mature pack cohort and local scout
  replacements, not an unrestricted optimal-play claim. In 32 independent holdout
  seeds, holding to 33 gains 3.1875 wins per ten seasons. Selling at 28 yields mean
  transfer cash of 25,346.47 versus 22,479.63 for holding. The initial-cohort cash
  advantage is 2,016.06, above the 1,010.34375 floor set from half the separate
  calibration effect. The win floor is 1.828125. Both floors pass the holdout.
- Removing the prime curve leaves some cash advantage from rating decline and
  replacement timing. It does not reverse the direction as the proposal assumed.
  The no-prime control instead fails the measured cash-effect floor and prime
  checks; the flat-edge control fails the wins floor and direct edge checks.
- The first five region goals stay unchanged. The old 400M World Stage goal misses
  the 100-hour sixth-star target. Twelve seeds had earned only 48.71M to 49.36M
  there at 100 watched hours. The goal is now 45M. All twelve reach star six in
  96.756 to 97.239 watched hours, median 96.982, with real packs in the loop.
  Because the final region repeats, this also lowers the goal for stars 7 to 60.
  One representative seed reaches all 60 at 705.153 watched hours and 1,754 packs.
  This is a deterministic simulation estimate, not a promise to every player.
- The first-team panel shows five selectable places and one detailed player card.
  Promotion, senior sale and academy move-up write the full save successfully
  before changing the visible roster. Failed writes leave the action available
  for retry. The existing save version and keys stay unchanged. First-team fields
  remain absent from untouched older saves; move-up and Sell up keep graduates.
- A returning first team mounts the Academy clock even if its tab never opens.
  Before that lazy panel loads, a separate read-only snapshot applies the same
  offline training as the actual hook. Review found that deserialize alone could
  commit away draws using an old rating while a warm Academy produced wins.
  The real-page test now measures that cold-load result and verifies training
  is saved once. Seven page cases have six effective mutation controls.
- The guide says career totals survive move-up. It no longer says the best single
  sale survives, because that run-level record resets in the existing engine.

Evidence: `scripts/simAllPlayersValue.mjs`, its frozen fixture and baseline JSON,
`src/test/firstTeam.test.tsx`, `scripts/simFirstTeamPage.mjs` and the extended
`scripts/simTycoonHelp.mjs`. The release entry in PROJECT-STATE records final
build, full-suite, browser and publication evidence when those gates finish.

## 19. Round 587 implementation evidence, 2026-09-15

This round is in development and follows Round 586's separate release. The
figures here describe the checked pure engine; rendered-page and release gates
are recorded separately when complete.

- A watched match offers one kick for 12 real seconds. The deterministic minute
  is between 20 and 80. Every third career match offers a penalty; other matches
  choose one of the existing Free Kick setups at indices 2 through 6. This uses
  the existing shot engine, with no new random draw in the stadium minute loop.
- Opening saves the attempt before the board appears. Closing or reloading
  consumes that attempt. A goal can be accepted later than the opening window,
  provided the same match and reputation are still active and full time has not
  arrived. The clock keeps running during aiming and replay.
- A scored shot adds one goal and the existing normal goal bonus. It has no
  direct gems, daily score, arcade record or separate completion write. The
  normal full-time result may improve because the match score improved.
- The engine rejected 40,000 duplicate awards across 10,000 measured matches.
  Twelve frozen pre-round watched and away histories remain byte identical
  when the offer is ignored. Away matches never receive an offer.
- The balance check measures a perfect-kicker ceiling at fixed division 3,
  squad 40 and match strength 70, with identical minute-roll streams in the
  paired arms. It is not a prediction of ordinary players' scoring rates.
  Calibration batches of 2,000 matches gained 12.25 and 11.00 percentage points
  of wins. An independent 2,000-match holdout gained 10.65 points (967 baseline
  wins versus 1,180 with every offered kick scored). Its acceptance band was
  fixed from calibration at 5.8125 to 17.4375 points, before the holdout.
- The no-gain control produced 967 versus 967 wins and failed that measured
  band. Ten other effective controls cover duplicate goals, reopened attempts,
  away offers, the window, bonus size, lost latches, malformed loads, ignored
  offers, added randomness and daily-score writes. The daily-score control
  fails both the actual module graph and a runtime write spy.
- Optional attempt and goal latches stay absent from untouched saves. Malformed
  or future latches consume the current attempt rather than reopening it.
  Both reset paths preserve the latches, and reputation is part of the active
  board's identity, so a board cannot score after selling up.

Pure-engine evidence: `scripts/simTycoonSetPiece.mjs`. Real Board and page
coverage: `src/test/tycoonSetPieceBoard.test.tsx`,
`src/test/tycoonSetPiecePage.test.tsx` and `scripts/simTycoonSetPiecePage.mjs`.
Presentation evidence: `scripts/simSetPiecePresentation.mjs`. Six real-page
cases, eleven effective page controls, three Board cases, 36 rendered scene
cases and eight effective scene controls pass. A final independent combined
review found no scoring callback in replay, Skip or Back. The app type gate
and scoped SEO production build pass. `scripts/playTycoonSetPieceFit.mjs`
passes six actual built-page cases at 320, 390 and 1440 pixels with both motion
preferences. It verifies 42 reachable controls, an advancing visible clock,
six real legal goals saved once and reloaded, and exact nonzero scroll restore.
Both served-chunk layout and clock controls fail their intended checks. Full
release verification and publication remain separate gates.
