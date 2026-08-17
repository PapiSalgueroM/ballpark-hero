# Project state

## Owner feedback, second review 2026-08-17 (5 AM, after rounds 139-144 went live)

He reviewed again about twenty minutes after the deploy, so items he calls unfixed may be his
browser cache: rounds 139-144 went live at 08:00 UTC and his message landed 08:2x. He was told
to hard refresh. His NEW asks, worked in order:

A. **DONE, Round 145: past eras.** "U should have diffrent era like u can be the manager for
   clubs in 2010 and 2000 and so on with all correct lineups and everything like that and
   values and just everything." Phase one shipped: the 2010-11 era, Premier League + La Liga,
   802 real year-2010 players across all 40 clubs, famous summer 2010 moves corrected against
   the table's own 2011 rows (Villa to Barcelona, Ozil and Di Maria to Madrid, Ibrahimovic
   out to Milan), era-sealed market, 2010 boards (no Conference League, it did not exist),
   era continental pool, era cups. `simEra2010.mjs` guards identity, isolation, ladder and
   playability. DATA FLOOR: player_market_values reaches 2004, so 2005 and 2015 eras are
   buildable next by the same recipe (scripts/bakeEra2010.mjs), an exact 2000 era is NOT
   possible honestly, and he was told so.

B. **DONE, Round 145 (same round as A, one review, one commit): top clubs demand the title
   itself.** "The second highest overall team
   dosent want to be top 2. They also want to win it. The same with 3rd place... stop with
   this top 20 or top 2 nonsense." The title band now runs on the measured XI gap to the
   league's best (TITLE_GAP in clubManager.ts, threshold 2.5 measured over all 13 leagues),
   so Liverpool, Chelsea, United, AC Milan, Feyenoord, Sporting CP, Union SG all demand the
   title, the euro windows slide down below a wide title band, and every positional
   parenthetical is gone from every label. The two worst "Top N" offenders were UI lines:
   the club picker tile and the rival viewer both printed raw ranks ("Top 20"); both now
   quote the board's named demand. simBoardObjectives 1b pins 26 giants to target 1.

C. **OPEN: "look up all the leagues fifa has" and add more.** See item 6 below for the wave
   recipe and remaining candidates. (Never write that product name into src.)

D. **OPEN: create-a-club.** "Create my team for the manger game and its full customizatable
   with crests and stadium and starting money and everything." Custom name, colors, an SVG
   crest builder (original shapes only, no real crests), stadium name, starting budget,
   league choice, generated starting squad, real transfer market. Big feature, own round.

E. **DONE, Round 146: Stadium Tycoon, the idle game.** He sent two reference screenshots of
   an idle sports tycoon and asked to be surprised, with animation named twice. Shipped
   original: /stadium-tycoon, a matchday-economy idle game where attendance is min(seats,
   fanbase), every fan pays per second, a live toy match (player dots chasing a ball,
   real sim state) pays crowd-scaled goal bonuses, win streaks multiply income and pull
   fans, nine upgrade tracks, tap income with a Megaphone track, prestige into Reputation
   stars (+50% each, permanent), away earnings at half rate capped at 8h, versioned
   localStorage saves. Animations: seat-by-seat crowd fill, floaters off every earn,
   goal confetti, count-up cash, streak flame, glow on the prestige button. Tuned WITH
   the harness (simStadiumTycoon.mjs): first prestige minute ~15 on a greedy floor
   strategy, no pre-prestige purchase ever more than 60s away, the post-prestige wall
   measured 253s max on a 2h refuser (ceiling 420s), offline pay capped and honest,
   corrupt saves fall back safely. Live-verified in Chromium at 390x844: money grows,
   tiles buy, floaters fire, zero page errors.

F. **STANDING: more animation everywhere, more depth everywhere.** "Add more animation
   especially to the idle game... and all the games." First pass DONE, Round 147: Club
   Manager full time is staged now (verdict slams in after a beat, scorers stagger in
   minute order, wins pulse, defeats shake once, trophies pour confetti, and season end
   rains confetti over silverware) via a shared Celebration component ready for other
   games. LESSON, paid for immediately: the first draft counted the scoreboard up from
   0-0 and playClubManager flagged it as "the score went backwards" within the hour,
   because for a moment the screen contradicted the sim. The scoreboard now shows the
   true final from frame one and the theatre lives around it. The rule for future juice
   passes: animate emphasis, never animate a number through false values. Verified: a
   full 48-half-time interface playthrough with 0 findings. Next candidates: Soccer
   Career match moments, NBA/NFL career result screens, home page tiles.

## Owner feedback, 2026-08-16 (first review)

Anthony reviewed the whole site and gave direct feedback. **Worked top to bottom; DONE marks
below are current** so the 3-hourly build sessions do not redo finished work.

His closing direction, which applies to every game, not just the items below: *"Just keep
adding to every game and more more realism and more info and more minigames and more of
everything. think gta, btlife, 2k, madden, fifa, and much more in ur idea of building better
games."* Treat the depth of the big life sims and franchise modes as the bar. Never write
those product names into `src/` (the rival names guard fails the build); the FEATURES are the
target, not the names.

1. **DONE (no round needed). Polls of the day: corny answers.** His words: "some of ur answers
   are so corny. It should be like a yes or no question or choose this athlete or other not a
   whole as sentence." Fixed 2026-08-16 directly in the `daily_polls` table (today's rows and
   the pre-stocked bank were swept; options over 20 characters: zero) and the generator task
   prompt now hard-requires options of at most 3 words, a name, a team, Yes or No, never a
   sentence, never a joke option. If corny options reappear, the generator prompt is the place
   to look, not the site code.

2. **DONE, Round 139. Club Manager eras: no future.** His words: "u could take control of
   diffrent teams in diffrent eras meaning current or the pass. Not the future since we dont
   know the future. So please remove that." The 2031, 2036 and 2041 starts are gone. The
   ageing engine stays (a save that starts today still needs the world to age around it).
   simEras now FAILS if anybody adds a future era back.

3. **DONE, Round 145: PAST eras phase one, built honestly per `docs/PAST-ERAS-DESIGN.md`.**
   See item A in the 2026-08-17 review above for what shipped. The design doc remains the
   recipe for further eras (2005, 2015): dump the year's rows per league through the MCP,
   bake with scripts/bakeEra2010.mjs adapted, add the era's leagues to ERA_LEAGUES and its
   bake to HISTORIC_ROSTERS, extend simEra2010-style checks, done. The engine threading
   (era-keyed market, era boards, era continental pool, era cup, era job offers, era-relative
   yearsOn) is general now and needs no further surgery per era. Traps hit in phase one,
   recorded for phase two: year-2010 value snapshots can predate the summer window, so
   verify marquee movers against the NEXT year's rows and correct clubs (values stay the
   era snapshot); and cross-era same-name different-person collisions are real (Aaron
   Ramsey twice), harmless across worlds, and allowlisted in simEra2010's NAMESAKES.

4. **DONE, Round 139. Board objectives talk like boards.** His words: "no team is looking for
   top 2. There looking to win it all... win the league or get champions league football or
   Europa league or conference league or finish mid table or dont get related." The demand
   ladder is now named competitions with per-league European slots (Ligue 1 sends 3 to the CL,
   England 4, the Eredivisie 2, the Championship demands promotion, MLS can never threaten
   relegation, the Saudi league points at the AFC). Also MORE wants, which he asked for twice:
   points floors, the league-and-cup double for the biggest boards, turn-a-profit mandates for
   selling clubs, on top of goals, defence, youth and the rival. Job offers now carry the same
   named demands. `simBoardObjectives.mjs` guards all of it.

5. **DONE, Round 139. No more instant selling, and windows that actually span weeks.** His
   words: "U shouldnt be able to just quickly sell someone. U need offers and put them on the
   transfer market." `sellPlayer` is deleted. Selling is: transfer list him, offers arrive
   (70 percent on window open, 35 a week after, and open offers now PERSIST week to week),
   accept one. To make waiting possible at all, windows now span real match weeks (4 in
   summer, 3 in January) with a deadline instead of slamming shut at the first fixture. The
   transfer screen shows weeks-to-deadline.

6. **IN PROGRESS: way way way more leagues.** "There's many leagues u must add with correct
   data. And some second divisions too and maybe up to 5."

   **Wave 1 DONE, Round 140: Primeira Liga, Scottish Premiership and the Süper Lig.** 48 new
   playable clubs (234 total), 205 newly baked real players (3,147 total). Memberships
   verified for 2026-27: Portugal (Marítimo and Académico de Viseu up, Tondela and AVS down,
   Casa Pia survived the playoff), Scotland (St Johnstone up, Livingston down, St Mirren
   survived the playoff), Turkey (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
   Kayserispor and Fatih Karagümrük down). Every new league carries proper euro slots,
   relegation counts (Scotland drops 1, Portugal 2, Turkey 3), cup names, priors and colors,
   and the thin tails are marked in CM_PARTIAL exactly like the Championship has always been.

   **How wave 1 was built, because wave 2 repeats it:** the sandbox cannot reach Supabase
   directly, so rows were pulled through the Supabase MCP and baked offline.
   `bakeClubManagerRosters.mjs` now takes `--dump=rows.json` for exactly this, and its
   DB_TO_ENGINE map already carries all wave 1 names. The dataset ranks players by value
   worldwide, so small clubs sit below its floor: that is why St Mirren and the promoted
   sides bake empty and youth-pad in game, the Abha and Cambuur precedent.

   **Wave 2 part one DONE, Round 142: the 2. Bundesliga.** 18 more clubs (252 playable), 93
   more real players (3,240 total). Membership from the league's own 2026-27 season preview:
   Wolfsburg, Heidenheim and St. Pauli down from the Bundesliga, Osnabrück and Energie Cottbus
   up from 3. Liga. Wolfsburg bakes 20 real players including Amoura and Eriksen. The board
   ladder speaks German second tier: automatic promotion top 2, the promotion playoff for 3rd,
   two go down. Germany now has two playable divisions like England.

   **Wave 2 part two DONE, Round 143: the Belgian Pro League.** 18 clubs (270 playable), 127
   more real players (3,367 total). And 2026-27 is the perfect year to add Belgium: the league
   reformed to 18 clubs in a straight round robin with no playoffs, exactly the shape this
   engine plays. Beveren, Kortrijk and Lommel up, Dender down via the playoff Lommel won.
   Genk bake 19 real players (Karetsas at 38m), Anderlecht 18, Union Saint-Gilloise 16.
   This round also fixed three stale entries where a player's real 2026 move superseded the
   2025 row an earlier wave baked him under: Özcan to Anderlecht, Muja to Sint-Truiden,
   Tresoldi to Club Brugge. Lesson recorded: when a new league wave lands, check whether any
   of its 2026 rows name players already baked elsewhere off 2025 fallbacks, and move them.

   **Leagues remaining with confirmed data:** Brazilian Serie A and Argentine Primera
   (Flamengo, Palmeiras, Boca, River rows exist, but BOTH run calendar-year seasons, so they
   need engine thought first; do not wire them in blind). Beyond those, candidate leagues with
   partial coverage: Greek, Austrian, Danish, Swiss (flavor clubs already baked). Same recipe
   every time: verify membership via web plus the table, extend DB_TO_ENGINE, dump through the
   MCP, supplement bake, wire metadata.

7. **DONE, Round 141: way more headlines.** The feed lives all season now instead of only at
   window opens: every match week can add a line, read straight off the sim's real state.
   Title race framing with the exact gap, relegation scrap with points from safety, derby
   week previews from the actual fixture list, sharpest attack and meanest defence off the
   real table, deadline countdown, and the window's record deal off the transfer log.
   Measured: fresh news in about 30 of 39 match weeks against 2 refreshes a season before,
   11 to 13 distinct story shapes. `simHeadlines.mjs` guards liveness AND truth (doctored
   tables must produce lines carrying exactly the table's numbers), and simNoInventedQuotes
   now harvests aiHeadlines too, so a future headline that quotes a real player fails the
   build. The card renamed from "Window headlines" to "Around the league".

9. **DONE, Round 144: the full-suite verification pass over everything above.** All 40
   harnesses were run end to end over the complete five-round tree, plus a real-browser
   click-through of the Club Manager picker (12 nations, Belgium down to club level, partial
   marking visible, zero page errors). Two failures surfaced and both got ENGINE fixes, not
   harness softening: an NFL linebacker could out-tackle the record book about once in a few
   thousand seasons (now capped at the realism guard's 200, the same treatment EDGE sacks got
   in Round 123), and spamming one press tone had quietly become nearly free because staleness
   only damped a talk instead of ever costing anything. A stale tone now carries a flat drag
   (TALK_STALE_DRAG), and measured at Manchester City all four tones lose points when spammed
   while reading the room stays worth about plus 3, which is the Round 135 calibration
   restored.

9b. **OPEN, small: simContracts has a rare flake window.** Observed once on 2026-08-17 in a
   full-suite run: "FAIL: blowing the wage budget costs nothing", green on immediate rerun
   and not touched by any recent round. Its wage-consequence check appears to sit on an
   unseeded roll with a small losing window. Next session that touches contracts: seed the
   section or widen the measured window properly (the simHeadlines derby fix from the same
   day is the pattern: seed with a verified precondition and a readable guard message).

10. **OPEN, standing: every game gets deeper.** More realism, more info, more minigames, in
   every game on the site, career modes first. Use the franchise-mode checklist as the gap
   list per game: training plans, form and morale loops, media, contracts, injuries and
   recovery choices, rivalries, awards races, offseason depth, save-spanning records.


**As of 2026-08-16 (night update, after Round 144).** This is the volatile file.
Update it in the same round as any change, so the next session (or the next account) picks up
cleanly.

**Precedence.** On any question of *current state* (the head, round numbers, what is pending,
what is broken, what is next) **this file wins over every other document in the repo, including
`CLAUDE.md` and `docs/SHIP-PIPELINE.md`.** Those two describe stable procedure; this one
describes a moving target, and procedure written last month cannot know today's round number.
The reverse is also true: on *procedure* (how to package, how to verify, what is forbidden),
those two win and this file should not contradict them.

**Staleness.** Check the date above. Anything here older than about two weeks should be verified
against `git log --oneline` and a listing of `C:\Users\antho\ballpark-hero` before you act on
it, then corrected. The counts marked "about" or "roughly" below are approximations that were
true on the date above; re-measure rather than quoting them.

---

## Where the build stands

| | |
|---|---|
| `origin/main` head | `34b2198` = **Round 144** when this was written (2026-08-17 morning) |
| How 139-144 landed | SHIP13 clicked via computer-use 2026-08-17 ~07:50 UTC. First run failed closed on a bad RUN139 assertion (bare `plus10` matched the removal comment); pattern fixed to `id: 'plus10'`, re-clicked, all six pushed clean. Lesson in SHIP-PIPELINE terms: absence assertions must target the old DEFINITION shape, and every bat's patterns get tested against the actual zip contents before delivery. |
| Live site | douknowball.com published 2026-08-17 ~08:00 UTC at Round 144 (two deploy calls, second after sync was file-verified). Republish after 145+146 land. |
| Packaged queue | Round **145** (title band + positional copy purge + the 2010-11 era), Round **146** (Stadium Tycoon) and Round **147** (the Club Manager animation pass). One click ships all three: **`SHIP14.bat`** (logs to `ship_log14.txt`). |
| Next free round number | **148** (check the folder first, the 3-hourly build task may have taken it) |
| Round missing from history | 115. Never existed, do not go looking for it. |

### ⚠ The live deploy was triggered but not proven

Lovable was stuck on `9494d8e` (Round 128) for days. The Round 131 to 137 push unstuck it and it
resynced commit by commit up to Round 137, confirmed by reading `scripts/simNoInventedQuotes.mjs`
back out of it, a file that exists in no earlier commit. Note that its `latest_commit_sha` field
lagged one commit behind its actual file tree throughout, so **do not trust that field alone**,
read a file the round changed.

`deploy_project` was then called and returned `pending`, which the pipeline doc correctly says
is not proof. The usual live check (fetch the site, read the `index-*.js` name out of the HTML,
grep the chunk for a marker) **could not be completed from the cloud session**: the fetch tool
converts pages to markdown and strips script tags, so the asset name is unreachable, and
Lovable's build hashes do not match a local `npm run build`, so the name cannot be guessed
either. Whoever picks this up should confirm the live bundle moved before assuming it did.

### A pipeline capability that was not known before 2026-08-16

**A cloud session can get rounds pushed after all, without Anthony clicking anything.** It still
cannot push directly and it still has no credentials, so everything above about bats stands. But
the desktop bridge exposes computer-use tools, and File Explorer can be granted at `click` tier,
which is enough to double-click `SHIP7.bat` and let the existing chain run itself. That is how
131 through 137 landed.

The limits are real and worth writing down so nobody wastes a session rediscovering them:

- **Terminals, IDEs and the Windows shell are capped at `click` tier by the platform.** Visible
  plus plain left-click only. No typing, no key presses, no right-click, no drag and drop. So
  there is no typing a git command into a terminal, and no typing a path into the Explorer
  address bar. Navigate by clicking, and launch work by double-clicking a file.
- **`device_bash` cannot push.** It runs in a Linux VM on his machine with the folder mounted,
  but it has no network: `git ls-remote` fails with a 403 at the proxy. It is for file work
  only.
- This means the bat pipeline is not a workaround to be removed, it is the mechanism. Keep
  writing `RUNnn.bat` files exactly as `docs/SHIP-PIPELINE.md` describes. The only thing that
  changed is that a session can now click one instead of waiting a day for Anthony to.

### What each pending round is

| Round | Contents |
|---|---|
| 131 | Player creation: look options, height and weight with real attributes, no build cap below 99, rerolls against the potential cap. |
| 132 | Club Manager eras: era selector, club detail and squad and transfer screens. |
| 133 | Rival-name purge, 284 findings to zero across 843 files, plus the permanent guard `scripts/simNoRivalNames.mjs`. Renames Jeopardy to QuizBoard, which is why `RUN133.bat` deletes four old paths before committing. |
| 134 | Money becomes a real system: five assets that move between seasons, a savings vault, fees each way so churning costs you. Calibrated so the best money player finishes about 1.6x richer than one who ignores it, with a guard that fails above 3.2 so money can never become the whole game. My Life moved onto the phone. DoUKnowBall inside DoUKnowBall, generated from your own save. Gambling is deliberately small and unfun to grind: once a season, capped at the lower of 50k or 4 percent of net worth, blocked under 250k, 42 percent win rate and 1.15x payout both printed on screen, closes permanently at 500k down. Career average is minus 92k. The upside is dressing room morale, not money. |
| 135 | Press conferences and team talks. Morale was worth nearly 18 league points floor to ceiling but nothing reached the whole squad. Four tones, before the match and at half time, press questions built from your save. Reading the room is worth about 3 points a season, misreading costs 3.8, and spamming one tone is worth 1.6 against 4.3 for reading the situation. Skipping a presser costs exactly zero versus never opening it, which is what makes the skip button honest. |
| 136 | **This documentation round.** `CLAUDE.md`, `docs/SHIP-PIPELINE.md`, `docs/PROJECT-STATE.md`. |
| 137 | **The legal round.** No real player is quoted or accused anywhere on the site any more. See below. |

The three documentation files were also written directly onto Anthony's disk when they were
packaged, so they are readable from the local folder whether or not Round 136 has been
committed. Check `git log` to see whether it has landed.

### ⚠ Two sessions can collide on round numbers

Rounds 134 and 135 were packaged by the **scheduled build task** while an interactive session
was separately packaging documentation as 134. The scheduled task won the filename race and the
documentation round had to be renumbered to 136. Nothing was lost, but an hour of work nearly
was, and a `SHIP` wrapper got silently replaced with one that did not include the other
session's round.

**Before you package anything, check the folder for a `ROUNDnn_FILES.zip` newer than your own
session start.** If one is there, another session is live. Take a number above it, and do not
overwrite a `SHIP` wrapper without reading what it currently ships. The scheduled build task
fires on cron `57 */3 * * *`, so it is running more often than you would guess.

### Round 137, what it actually did

The item that had been sitting at the top of "Decisions owed by Anthony" as the highest
priority open exposure. It is now closed and the decision is off the list.

The Club Manager inbox was rendering invented speech and invented off-pitch conduct against
**real named professionals** out of `clubManagerRosters.ts`, on a public site out of a public
repo. The reported example (*"You told me I was a star here"*) was real and was in
`clubManager.ts`. The drama pool was worse than the quotes: it had named men crashing cars into
the training ground at 2am, sitting in a casino two nights before a match, missing training,
and falling out with their wives on Instagram. None of it happened to any of them.

The line the code now holds to, and it is written into the file so it survives:

- **Football events inside the sim keep the name.** Minutes, selection, morale, transfer
  requests, bids. That is what a management sim is, and the name is doing honest work.
- **Invented speech and invented off-pitch conduct lose the name.** Attributed to a squad role
  instead ("your star man", "one of your midfielders"), so no roster name shares a string with
  them.

Six drama entries that alleged something genuinely damaging were cut rather than reworded,
because a role descriptor is still uncomfortably close to a named man when the claim is that
serious. Three harmless ones were written to replace them. Every quote in the inbox, the
transfer-request copy and the broken-promise line was rewritten as narration.

**`scripts/simNoInventedQuotes.mjs` is the permanent guard.** Read its header before touching
narrative copy. It runs three passes, and the third is what makes it worth having: it drives
real seasons and checks rendered output (not source) against the real roster, it scans src for
literal names beside speech, **and it self-tests against the exact strings Round 137 removed**.
A detector that finds nothing passes either because the code is clean or because the detector
is broken, so the known-bad lines are kept as fixtures and it fails loudly if it stops catching
them. It also carries known-good fixtures, because a guard with false positives gets deleted.

Two calibration notes for whoever touches it. The harvest floor is 150, set from ten measured
trials that ranged 221 to 248, not from a number that felt right. And accents matter: `\b`
treats `é` as a word break, so "Jérémy" parsed as J, r, my and the guard read the "my" in his
own first name as him talking. Names are accent-folded before any boundary test now, which also
means copy writing "Mbappe" for "Mbappé" is caught rather than missed.

**Done as of 2026-08-16.** Rounds 131 to 137 are pushed and the publish was triggered. The
queue is empty. Pick the next thing off the roadmap and build it.

Anthony's own next step, in his words, is that he wants to **review all the games and come back
with tweaks**. Expect a batch of feedback rather than a single bug, and expect it to be worth
more than anything on the roadmap below, because it is the owner playing his own site. When it
arrives, triage it into rounds rather than trying to fix everything in one.

### What the pending rounds contain

- **131** player creation: look options, height and weight with real attributes, no build cap
  below 99, jump-by-5 or type the overall directly, rerolls against the potential cap.
- **132** money and life: bank depth, timed investing (crypto, index, APY), a transaction limit,
  My Life moved onto the phone, DoUKnowBall inside DoUKnowBall, gambling.
- **133** rival-name purge. 284 findings across 843 files taken to zero, plus the permanent
  guard `scripts/simNoRivalNames.mjs`. Also renames the Jeopardy files to QuizBoard, which is
  why `RUN133.bat` explicitly deletes four old paths before committing.

**Note:** the awards round was originally planned as 133, but the 133 slot got spent on the name
purge. Awards is still unbuilt. See the roadmap below.

---

## Recently shipped

| Round | What |
|---|---|
| 130 | Phone stops being a one-shot novelty. Threads, 17 contacts, contacts/continuation/neglect/apology, world-only sports feed. |
| 129 | Mobile chrome: navbar overlap, the invisible-streak `xs` breakpoint bug, action-bar footer lift, product-name strip. All measured in a real browser. |
| 128 | The no-scroll rule was itself jumping the page. |
| 127 | Every player is told what he is at this club, and the dressing room remembers whether you kept your word. |
| 126 | The Round 113 coaching career was never plugged in, so all four American games still dead-ended at retirement. Fixed. |
| 125 | Seven permanent guards had been failing since Round 119 with nothing checking the checkers. |
| 124 | International football became a real competition that crowns a winner every four years. |
| 123 | You have to beat somebody to win an award, across all four American career modes. |

Also already done, do not rebuild: recently-played and leaderboard rank (55), NFL/NBA/MLB/NHL
career rebuilds (56 to 59), appearance creator (54), Club Manager picker leagues and flag (106),
Club Manager tile-dashboard reformat (74), halftime management (119), a harness that actually
reaches a match in Club Manager (120).

---

## Open bugs

| Bug | Notes |
|---|---|
| **Edge function `football-connect4-validate` needs redeploy at publish time** | A key was renamed from "FIFA Ratings & Stats" to "Player Ratings & Stats". Needs a **second** redeploy: v7 still names the game in the glossary definition. The key `Has/Had a 90+ Rated Player Card` must stay verbatim. |
| 📱 button covers the AGE tile at 390px | AGE is invisible on phones. Introduced by Round 129. |
| Award flicker | Anthony: "says I didn't win an award, next sec it shows I did". |
| `scripts/testBallonDorFairness.mjs` dies on import | No localStorage stub. Also named `test*` so `runAllSims` silently skips it. Rename to `sim*` when fixing. |
| `playGames` stalls on `/nfl-my-career` and `/nba-my-career` | Pre-existing, not a regression. |
| `RebuildBoard.tsx:41` unattached `revealRef` | Small, but it means the no-scroll rule is not actually applied there. |
*Checked and NOT a bug, 2026-08-16, recorded so nobody flags it twice: `public/sitemap.xml`
still lists `/jeopardy` and looks stale at first glance. It is correct. Round 133 renamed the
files and the on-screen label to QuizBoard but deliberately kept the **route** at `/jeopardy`,
because it is on the `LIVE_IDENTIFIERS` allowlist in `scripts/simNoRivalNames.mjs` and changing
it is a migration with redirects and a backfill, not a copy edit. The counts also reconcile
exactly: 118 registry paths, minus the retired `/deal-or-no-deal` redirect, plus the root and
six static pages, is the 124 entries in the file.*

### Decisions owed by Anthony

This is the registry `CLAUDE.md` points at. **These are the only things you may ask him about
besides money. Everything else, decide yourself.** When one is resolved, delete it from here.

1. **Competitor names in the public repo.** `docs/research/R1_soccer_sites.md` and
   `docs/research/R3_creator_formats.md` name competitors by name in a public repo. Delete or
   gitignore. Do not silently delete his research, ask him.
2. **ESPN-style score ticker data source.** Needs a paid feed decision. Money.
3. **Apple sign-in.** Parked on the $99/yr Apple developer account. Money.

*Closed 2026-08-16: invented quotes attributed to real players. Was item 1 and the highest
priority open exposure. Fixed and guarded in Round 137, see above.*

---

## Roadmap

Not numbered by round on purpose. Take the next free round number from the top of this file and
work down this list in order.

**Next up, in order:**

1. **Awards** (was planned as 133, still unbuilt). Puskas and FIFA Best, candidate goals and
   assists, a trophy cabinet, animated and personalised trophies, Champions League and World Cup
   tables plus brackets plus per-competition stats, no-spoiler gating, more international
   trophies.
2. **Realism.** Players must age out. Salah should not still be playing in the 2030s. Generated
   young players need to work far into the future.
3. **Manager side.** Full manager tools after retirement, with era rosters. An era selector for
   Club Manager.
4. **Mini games.** More of them, harder criteria.

**Standing large items, still open:**

- **The Club Manager epic.** Transfers, negotiations, loans, release clauses, calendar, player
  stats, youth academy, scouts, facilities, spies, sponsors, tactics drag plus match animation,
  cup naming, garbled opponent names, roster freshness. Tactics drag has been asked for twice
  and is still not done.
- **More leagues.** Explicitly not done. Currently 10 leagues and 186 clubs. He wants "all the
  leagues FIFA has". Also more flags throughout the site.
- **International competitions inside Club Manager.**
- **ESPN-style score ticker.** Blocked on a data-source decision, which is a money question, so
  ask him.
- **CFB Dynasty still uses fake names.** `ROUND87_FILES.zip` contained real 2026 rosters, 528
  players. See the never-run zips warning below.
- **Profile page.** The favourite-game list does not include every game, "fav sport general"
  makes no sense, and he wants every stat verified end to end.
- **Cross-device and browser QA matrix.** Harnesses are Chromium-only at 430x900. WebKit is
  untested.
- **Google indexing and discovery.** Search Console, sitemap, noindex and canonical, Bing
  Webmaster Tools, IndexNow.
- **Trade finders and cap systems.**
- **Sacked-manager unemployed state** with an earned offer feed.
- **Sitewide FIFA-style tile-dashboard reformat.** Only Club Manager is done.
- **Per-game competitor depth audit.**
- Copy nit: kill the "🛝 7 times this season..." line.

### ⚠ Two zips that were built and never run

`ROUND77_FILES.zip` (Club Manager youth academy, scouts, upgradeable facilities, sponsors, spy
system) and `ROUND87_FILES.zip` (real 2026 CFB Dynasty rosters, 528 players) were packaged weeks
ago and Anthony has **never run them**. Between them they clear a large chunk of the outstanding
list.

**Check for them every session.** If they are missing from his folder, rebuild that
functionality as a fresh round rather than waiting. Do not assume something shipped just because
it was once packaged.

**Do NOT extract them.** They are far below the current head. Unpacking a Round 77 tree over a
Round 130-plus tree would silently revert dozens of rounds in every file they touch, and it
would look exactly like the clone-revert bug. Rebuild the *functionality* as a new round;
never re-run the old zip. The same rule holds for any zip whose number is at or below the head.

**They are also the reason the roadmap below still lists youth academy, scouts, facilities,
sponsors, spies and real CFB rosters as open.** That work exists, it just never reached the
repo.

---

## Analytics truth

`/soccer-career` is about **1 in 5 of all pageviews across the site** and **11x the next most
played game**. This is the single most important fact for prioritising work. When in doubt,
build for Soccer Career.

Source and caveat: this came from Lovable's project analytics
(`mcp__Lovable__get_project_analytics` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`), read in
August 2026. GA4 is **not** wired up yet, so Lovable is currently the only analytics source.
Re-pull it before making a big prioritisation call on it, and update this line.

Approximate at the date above, re-measure rather than quoting: roughly 118 to 122 games, entry
bundle about 663KB with route-level code splitting, `src/data/gameContent/` about 47k words of
per-game SEO copy, about 52 harnesses in `scripts/`, 53 files in `docs/`.

---

## Services and accounts

| Service | Detail |
|---|---|
| GitHub | `PapiSalgueroM/ballpark-hero`, public, branch `main` |
| Supabase | `flawuiqbvjobmkfkauhw`, **Pro $25/mo**, spend cap ON |
| Lovable | `c29d224f-a662-4a15-b809-d86fa3b3f0ad`, **free plan, 0 credits**, never use its AI agent |
| AdSense | `pub-2929318086316376`. Rejected once for "Low value content". Fix went live 2026-08-12. Review reminder set for 2026-08-20. |
| ads.txt line | `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0` |
| Google sign-in | live |
| Apple sign-in | parked, needs the $99/yr developer account, this is a money question |
| GA4 | measurement ID still outstanding |

---

## Scheduled tasks

These live in the assistant account, **not in this repo**, and they do not survive an account
change. If they are not running, they need recreating. Full prompts are in
`_claude-migration/SCHEDULED-TASKS-TO-RECREATE.md` in Anthony's local folder (gitignored,
because it contains account emails).

**Recreated 2026-08-16 on the new account**, all three, after the migration. The build-loop
prompt was rewritten in the process: the archived copy hardcodes head `9da1788` and rounds 101
to 110 as pending, which is nine months of drift, so the live version now carries **no round
numbers at all** and points at this file instead. Do not paste the archived prompt back in.

Supabase and Lovable connectors are both connected on the new account as of the same date, so
the polls task can write and deploys can run.

| Task | Schedule |
|---|---|
| DoUKnowBall: continue the career epic (the main build loop) | cron `57 */3 * * *` |
| DoUKnowBall daily polls | cron `0 11 * * *`, needs the Supabase connector |
| AdSense review day | one-shot 2026-08-20 14:00 UTC |

The daily polls task writes to `public.daily_polls`. Columns: `poll_key` (unique, format
`dp-YYYY-MM-DD-N`), `poll_date`, `sort_order`, `question`, `option_a` through `option_d`, the
matching `option_*_emoji` fields, and `option_*_flag` (a country name only when the option **is**
a country, otherwise empty string). Three rows per day. Replace any pre-stocked generic rows for
today rather than adding alongside them.

---

## Change log for this file

- **2026-08-16** created, as part of Round 134. Pulled the live project state out of assistant
  memory and into the repo so any session or account can pick the project up cold.
- **2026-08-16** Round 137. Closed the invented-quotes exposure and recorded the guard. Noted
  the account migration, the three recreated scheduled tasks, and Lovable confirmed stuck at
  `9494d8e`. Wrapper moved to `SHIP7.bat`.
- **2026-08-16** Round 138. Docs only, and it exists because Round 137's own copy of this file
  went stale the moment 131 to 137 were pushed: it still claimed the head was `e7fe005` with
  seven rounds pending. Corrected to `6397a77` with an empty queue, plus the computer-use
  clicking discovery, the Lovable `latest_commit_sha` lag, the note that live was not
  independently verified, and a retraction of a sitemap "bug" that turned out to be the
  `LIVE_IDENTIFIERS` allowlist working as designed. **Lesson worth keeping: a round that pushes
  a queue invalidates this file's own header, so the next round has to fix it.**
