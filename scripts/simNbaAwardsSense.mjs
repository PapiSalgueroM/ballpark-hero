/* simNbaAwardsSense.mjs (Round 1103). Do NBA My Career's numbers and awards make sense to a fan?

   It plays the real engine: one bundle of the four career engines, the awards file, NBA Front Office's season
   stats and the Hall of Fame ballot, on a seeded mulberry32 that is both Math.random and the rng handed to
   the engine. The fleet is the board's own order (a role on draft night, a camp every season, one summer card
   with a random option, one career in four in the 2003-04 era), the loop scripts/simNbaCareer.mjs walks.

   Size. Full size is 6,000 careers a seed, seeds 1 to 5. SENSE_SEEDS=1,2 and SENSE_CAREERS=800 shrink it
   while iterating: a shrunk run prints every number, judges only the exact checks and says so.

   The baseline is main. scripts/data/nbaAwardsSenseBaseline.json has two top level keys with two lifetimes:
     nba     the NBA rates of the engine before Round 1103 touched it, per seed. Written ONCE by
             --record-nba-baseline, which refuses when the key exists. A later round that moves these on purpose
             uses --rebase-nba "<reason>", which writes the reason and the commit beside the new numbers.
     others  a sha256 of every NFL, MLB and NHL career this harness plays (500 a sport a seed). A proof for one
             round (did my edit to a shared file move another sport), not a standing rule: it is judged only
             under SENSE_PROVE_OTHERS=1 and rewritten by --record-others.
   Both record commands refuse a dirty tree (git status of src and scripts, this file and the baseline aside).

   Run:  node scripts/simNbaAwardsSense.mjs            (detached at full size: it takes minutes)
   It ends with one line, "simNbaAwardsSense: N checks, F failed (full size)", and exits by F.

   THE SECTIONS (every count is printed; what is measured, and the measured numbers a band was set from)

   A   The line against the real league (src/data/nbaLeagueNorms.ts). Healthy starters of modern careers.
       A1  the median of minutes, points, rebounds, assists, steals and blocks at each position sits inside
           the real starters' p25 to p75 (a PARTIAL key gets 15 percent of its median more on each side).
           Measured 2026-10-07, five seeds at full size: all thirty cells inside, the nearest 12 percent of
           its band from an edge (PG blocks). The 2003 arm (the same seasons replayed with the year at 2003)
           is PRINTED, not judged: one cell of thirty outside (PF rebounds). What is judged for 2003 is the
           unit check: one input drawn 2,000 times at each year gives the two league rows' ratio within 2
           percent.
       A2  the p99 starter season (never the max), as the mean over the run's seeds, is at or under the league
           leaders' mean plus one sd: points 33.2 to 33.5 against 34.5, rebounds 13.5 to 13.7 against 15.4,
           assists 9.6 to 9.8 against 11.4.
       A3  rookies rated 75 to 79 average 7.9 to 8.1 points (band 7.5 to 11.5). SG and SF starter seasons at 8
           assists: 1.0 to 1.3 percent (band under 2; main 18.5 to 19.2; the brief asked for under 1, which
           would leave the triple double badge to one elite career in thirty). Bench seasons score 46 percent
           of starters' on every seed (band 36 to 56; the brief's 50 to 72 was the old line's, whose flat
           bonus of up to three points paid a bench man the same as a starter). Both the scoring and the
           assists title in one season: 42 in 30,000 careers, and 8 in one fleet of 3,000 (band under 1 in
           250 careers, twice the measured rate and more; main 1 in 13). Triple double seasons in thirty
           elite careers a seed: 5, 4, 6, 6, 2 (band an average of 2 a seed).
       A4  mean points rise with every rating band at every position (bands of 200 seasons or more).
       A5  nbaStatLineFor draws exactly NBA_LINE_DRAWS times and is pure.
   E   The two tables the awards are judged against are what the fleet lives: the season score's field in
       careerAwards.ts (Finals MVP reads it; the rival bridge did until Round 1112) and NBA_FIELD in nbaCareerAwards.ts (the one
       pass reads it). Each seed's measured mean within 0.08 of the committed row's sd and its sd within 6
       percent (measured across five seeds: at most 0.042 and 2.3 on the first, at most 0.033 and 1.6 on the second).
   R   The rival (Round 1112). He plays his season on the player's own line (nbaRivalSeason in nbaMyCareer.ts,
       through the one hook careerRival.ts takes), so:
       R1  my share of the head to head years is held at what Round 1112 measured (RIVAL_1112 below: 61.01,
           60.83, 61.44, 61.06, 61.09 percent on five full size seeds, 2026-10-09), no longer at main's, whose
           62.3 to 63.0 percent was the old rival line's. The player's own path did not move to get there (see
           section P): what moved is the rival's line.
       R2  every rival line reads back off its printed text and is in the player's own shape, and the verdict
           NEVER disagrees with the two printed lines scored the same way (exact, at every size; the tree
           before Round 1112 read 32.6 to 33.1 percent of judged years).
       R4  the All-Star beat (306) never contradicts the two seasons it is about: every card dealt in the fleet
           says and promises what the player's own selection and the rival's support, and none is dealt when
           neither made the roster (exact). It is still dealt in all three cases on every seed (floors, each
           near six tenths of its lowest full size seed, measured 2026-10-09: only me 641, 639, 655, 613, 687;
           only him 163, 139, 156, 177, 165; both 87, 105, 93, 91, 101, of about 66,400 beats dealt a seed).
           Printed beside it: the share of judged years each makes the roster (mine 18.1 to 18.4 percent, the
           rival's 6.5 to 6.6: his case is his line alone, on an even club with the average following).
       R3  unit checks on 400 made up seasons: his season takes exactly one draw of the season's stream, his
           line replays as nbaStatLineFor's through the player's printer, the same inputs give the same
           season, and his kind is fixed and his position's own (8 names at 5 positions reach all 15 kinds;
           the floor of 10 only says the hash is not one kind for everybody).
   H   The Hall of Fame inducted rate and the first ballot rate are main's (31.6 to 31.9 and 27.0 to 27.9).
       Measured on the fix pass tree of 2026-10-08 (the standout marks measured again on the new line, the
       legacy constant 1.4 as a term of the calibration 2 table): 31.68, 31.58, 32.17, 32.3, 31.5 inducted
       (mean 31.85 against main's 31.73) and 27.33, 27.53, 27.87, 27.38, 27.32 first ballot (27.49 against
       27.56). And the books follow the line: an old line career stamped on calibration 2 reads what the
       frozen fixture recorded (ten such careers, exact), and a career between the two lines is read on marks
       between Round 1051's and the ledger's, by its share of games on the new line (exact, on typed marks).
   B   The season's awards make sense together (the one pass, nbaCareerAwards.ts). Counts, so most are exact.
       B0  every award string agrees with the key that names its team, every Defensive Player is on an
           All-Defensive team, every season holds a club record that adds up to its length.
       B1  no MVP on a club that missed the playoffs (main: one in four), none off the All-NBA First Team,
           none who is also Most Improved, no Most Improved after an earlier All-NBA.
       B2  every Rookie of the Year is on the All-Rookie First Team (main: none was on a team at all), and
           All-Rookie is won in a first season only. The share of first seasons on an All-Rookie team is the
           real class's (10 picks of about 45 rookies who play, 22 percent): 21.6 to 22.9 percent on five full size
           seeds, 22.0 over the run (band 18 to 26; the grade moves the share about 4 points a tenth).
           The two teams have a grade of their own since the fix pass of 2026-10-08: on the Rookie of the Year's
           grade 51 percent of first seasons made a team, bench rookies at 5 points a game among them, and
           nothing held it from above.
       B3  from 2023-24 nobody under the games bar holds an award the real rule names; before it such seasons
           exist (about 2,170 under 65 games in a full size run, band at least 1,750: the old 62 game gate
           leaves 1,341, so the bar62 control turns both halves red); every Sixth Man is a bench season;
           nothing but a Finals MVP is won on less than half a season. The bar the fleet check judges with is
           65 of 82 from 2023-24 TYPED IN THIS FILE (REAL_GAMES_RULE), and a drawn check holds the first season
           itself: one standout season at 64 games in 2023-24 never holds a rule award in 300 draws, at 65 it
           does, and at 64 the season before it does too. Before the fix pass the bar was read off the engine,
           so an off by one on the first season and a 62 typed into the data both passed everything.
       B4  no All-NBA season without an All-Star selection; All-Star selections a career are 1.59 to 1.63 times
           All-NBA (band 1.25 to 2.4; 24 picks against 15 is 1.6). Every All-NBA First Team season, and so every
           MVP season, starts the All-Star Game (a gate added in the fix pass of 2026-10-08: the fan vote is the
           fanbase, which barely follows the season, and the League MVP read "All-Star reserve" in 43 percent
           of MVP seasons). Nobody is voted a starter in a season he spent on his own club's bench (the second
           gate of that pass: one starter in 30 had), and a bench man can still be picked as a reserve.
       B5  All-Defensive goes to defenders: each of pest, twoway, threed and anchor above each of the six
           scoring archetypes, and their mean at least 3 times the scorers' (measured: pest 4.3, twoway 5.5, threed 3.0 and anchor 3.3 a career against 0.00 to 0.05 for the scorers).
       B6  held at main's rate: MVPs, All-NBA, All-Defensive and Finals MVPs a career. Rookie of the Year
           between main's and three times it (0.044 to 0.049 against 0.022). Printed and judged as above zero,
           because they move by design: the three stat titles, Sixth Man, Most Improved, Defensive Player,
           All-Rookie. How the awards are SPREAD (careers with an MVP, with an All-NBA) is held where Round
           1103 shipped it, and main's is printed beside.
       B7  decideNbaAwards draws exactly NBA_AWARD_DRAWS times and is pure.
       B8  the rules a fleet cannot see, each on drawn seasons against numbers typed in this file: every stat
           title is judged on its OWN league leaders' bar (an average just under their lowest bar never wins
           in 300 draws, one just over their highest always does); the fans alone pick the All-Star starters
           before 2016-17 and never after (a fan favourite on a 6 point season starts 145 of 300 times in
           2015-16 and 0 in 2016-17); and a stat title asks for that season's real minimum of games (70 or
           the total before 2013-14, 56 or its own totals in the 66 game 2011-12 season, 58 of 82 since, 51
           of 72 in 2020-21).
       B9  the All-Star snub card ("Left off the All Star team", src/lib/nbaCareerLifeB.ts) is never in the
           summer deck after a season that holds an award. Round 1104 wrote the gate
           (last.awards.length === 0) when no All-Star selection existed; this round's 'All-Star' in a
           season's awards is what makes it spare an All-Star, so the two are proven together here: a fleet
           of its own (SNUB_CAREERS a seed, the board's order, its own stream) builds every summer's deck
           the way the game does. Exact: 0 decks hold the card after an honoured season. Floors, so the
           check cannot pass empty: summers where only the gate keeps the card out, the same after an
           All-Star season, and decks that do hold the card.
   D   One function scores an award for both games: NBA Front Office and NBA My Career import the same file,
       Front Office adds no sum of its own, the two win weights are one number, and cutting the winning term
       out of the shared score (a second bundle) changes BOTH Front Office's ranking and the career's MVPs.
   F   The words: the worked example in the "?" recomputed through the shared score, its clubs checked against
       the engine's record bands, the games rule, its first season, the All-Star picks and the fan vote's era
       against the real numbers typed in this file (never against the rule table the help is built from: the
       two agreeing is one mistake said twice), the badge count on the page against NBA_BADGES.
   C   The NFL, MLB and NHL careers hash equal to the baseline (under SENSE_PROVE_OTHERS=1 only).
   K   The Trophy Case tile (Round 1112). The hub tile counts the rings plus the sport's honours rows; the case
       behind it lists every award on the seasons. With the row for the lesser awards the two agree on every
       career of the fleet (exact), so the tile reads Empty only over an empty case. The careers the row is for
       (awards, but no ring, MVP, All-NBA or All-Star) are still there on every seed: 389, 418, 402, 395, 389
       of 6,000 on 2026-10-09, about one career in fifteen, and the floor of 230 is six tenths of the lowest.
       Round 1149: the NFL, MLB and NHL careers got the same row (otherAwardsRow in careerHub.ts, one function
       for all four), and the same two checks run on each sport's own fleet of 500 careers a seed. Measured
       2026-10-10, seeds 1 to 5: 0 of 2,500 careers off in each sport; careers with the lesser awards only
       12, 20, 19, 22, 12 in the NFL (a Rookie of the Year and nothing else), 22, 22, 16, 17, 13 in MLB and 16,
       17, 6, 16, 11 in the NHL, so the floors are 7, 7 and 3, six tenths of each lowest. With the row taken
       out again (the controls, seed 1) the tile is short of the case in 32 of 500 NFL careers, 157 of 500 MLB
       and 164 of 500 NHL: before this round one MLB or NHL career in three read fewer honours on the tile
       than its case listed.
   T   The near tie (Round 1112). The one sentence all four sports share ("Nothing in it again. ...") names the
       leader the tally on the save gives, or says the head to head is level. Every near tie note of the NBA
       fleet and of the other three sports' fleets is read against the rival's tally right after its season
       (exact), and all three readings turn up in every sport (a floor of 200 each over a full size run, about
       half the smallest count measured 2026-10-09: NBA 26668 you lead, 24983 he leads, 6106 level; NFL 1313,
       2254, 385; MLB 1832, 1862, 421; NHL 3588, 1506, 532). Before this round every one of them said You lead.
   P   The proof of Round 1112, under SENSE_PROVE_AGAINST=<commit> only (the commit before the round's first
       edit). The same fleets are played on this tree and on the tree with every src file that differs read at
       that commit: the NBA player's own path is byte equal (a digest of his lines, awards, role, club, own
       notes, summer cards and final numbers) while the rival's line is not; and in the NFL, MLB and NHL the
       player's careers and the rival's own trail are byte equal, and the only notes that moved are near ties.
       A proof for one round, like C: once another round edits these engines the commit is stale.
   Q   The proof of Round 1149, under SENSE_PROVE_1149=<commit> only (the commit before the round's first
       edit, 808dbbdc). The round took the coin out of the roster beats of the NFL, MLB and NHL careers and
       moved the NBA's beat 306 onto the shared builder (factBeat in careerRivalryEvents.ts). The same fleets
       on both trees: in all four sports the player's careers, the rival's trail and every season note are
       byte equal, and a beat is dealt in exactly the same seasons; the NBA's cards are the same word for
       word; and in each sport the round has moved (Q_MOVED) the cards differ somewhere, so the two trees are
       not one. A proof for one round, like P and C.
   R, H and B6 compare the mean over the run's seeds with the mean over main's, within a FIXED width typed in
   HELD_TOL (heldAt below says why a seed by seed band was thrown away, and why the width is no longer worked
   out from the spread of the run being judged). Each width is what three standard errors came to at full
   size, with an award count's error taken from how unevenly the award falls over careers: the sd of MVPs a
   career is 0.82 to 0.86 where Poisson would say 0.56 (All-NBA 2.3 to 2.4 against 1.41, All-Defensive 1.9 to
   2.5 against 1.16).
   NOT HELD AT MAIN'S, and said on every run: careers with an MVP (17.4 percent against main's 16.6) and with
   an All-NBA (61.9 against 58.8). The brief's critic asked for main's band on both. The awards a career are
   main's; they fall on more careers, and the cause is the new LINE, not the new award rules: in pass A
   (the old awards block, every award an independent draw on the season score, no club wins in any
   score) the two shares were 18.3 and 63.5 at full size with the awards a career held at main's
   (PASS_A_SPREAD below, 2026-10-07). The one pass, which ties MVP to the First Team and a playoff club,
   took back about two fifths of that. A grade moves an award's count and its spread together, so one grade
   an award cannot hold both; holding the spread too would take a second constant with nothing real behind
   it. The two are fenced at this round's own rate (SPREAD_1103).
   THE LEAD'S RULING, 2026-10-09 (session F), so nobody reopens it: ACCEPTED as this round's. Careers with
   an MVP at 17.59 percent against main's 16.55, and with an All-NBA at 61.66 against 58.83, are what the
   corrected rules produce (the games threshold and the fuller season line are real world corrections, not
   tuning), the difference is small, and this harness already fences the round's own rate. No second lever.
   (Those two numbers are the full size run the ruling read. The same run on the tree merged with Release
   AP, 2026-10-09: 17.37 and 62.25, inside the same fence.)

   NEGATIVE CONTROLS, SIM_NBA_SENSE_CONTROL=<name>. Each swaps one line of SOURCE in memory (a plugin, never a
   file), refuses when its anchor is not there exactly once or the swap changed nothing, and must turn its own
   section red. A control that moves the line itself drags what reads the line with it, so each lists what
   may follow. A control run exits 1 when it fired as designed and 3 when it did not.
     oldassists       the old assists expression                       A1, A3 red (may: A2, E, R, H, B2, B4, B6)
     stalefield       the PG row of the season score's field one sd stale   E red (may: H, B6)
     staleawardfield  the PG row of NBA_FIELD's MVP score one sd stale   E red (may: H, B4, B6)
     oldscale         the rival scored on the line before Round 1112   R red
     neutralmine      my side of the verdict off the era neutral line  R red (the 2003-04 careers tell)
     rivaldraws       the rival's season taking a second draw          R red
     oldgate306       the All-Star beat dealt on the two ratings again R red
     nearlie          the near tie saying "You lead" whoever leads     T red
     norow            the tile's row for the lesser awards taken out   K red
     norownfl         the same row taken out of the NFL career         K red
     norowmlb         the same row taken out of the MLB career         K red
     norownhl         the same row taken out of the NHL career         K red
     twicecounted     MLB's Cy Young no longer named, so counted twice K red
     tickdraws        the MLB rivalry tick taking one more draw        Q red (needs SENSE_PROVE_1149=<commit>)
   With SENSE_PROVE_AGAINST=<commit> set, rivaldraws must also turn P red (the player's digest moves).
     noscale          the legacy constant back to 1                    H red (refuses when it is 1)
     nomvpworth       an MVP worth nothing to the legacy score         H red
     independent      MVP with no First Team gate and no playoff gate  B1 red (may: B3, B4, B6, H)
     rookieage        the rookie test back to 22 or older, two seasons   B2 red (may: B6)
     bar62            62 games in every era                            B3 red, both halves (may: B6, H)
     scorersdefend    the defensive awards read the MVP score          B5 red (may: B6)
     oldgrades        the All-NBA and MVP grades back to 0.15 and none   B6 red (may: H, B3, B4)
     privatecopy      Front Office adding its own sum again            D red
     weightdrift      the career's win weight at 19                    D red (may: E, B6, H)
     barfrom          the games rule starting a season late            B3 red (the drawn check)
     bar62data        the sourced 65 typed as 62 in the data file      B3, F red (may: B6, H)
     rookieflood      the All-Rookie teams on the Rookie of the Year's grade   B2 red (may: B6)
     firstteamreserve the First Team gate on the All-Star starters taken out   B4 red
     benchstarter     the bench gate on the All-Star fan vote taken out        B4 red
     newbooksforold   an old line career read on the new line's Hall marks      H red
     titlebar         the rebounding title judged on the assists leaders' bar   B8 red
     fanvoteera       the two eras of the All-Star fan vote swapped    B8 red (may: B4)
     shortseason      the 2011-12 season's own stat title minimum never handed over   B8 red
     snubhonoured     the snub card's "no award last season" gate taken out    B9 red
     example          the worked example's winning club read as its losing one   F red
     othersport       one NFL All-Pro grade moved by a hundredth       C red (needs SENSE_PROVE_OTHERS=1)
   A control is run at full size where a full run is cheap (about two minutes on a CI runner), or shrunk and
   judged, SENSE_JUDGE=1 SENSE_CAREERS=1500 SENSE_SEEDS=1,2, after the plain run at that size is green.
   Measured 2026-10-08 on 94286364: 124 checks, 0 failed at full size, the shrunk plain run green on seeds 1,2
   and on 3,4, and all fifteen controls fired as designed, each red in its own section and nowhere it may not be
   (the eleven that move a band at full size, privatecopy, weightdrift and example on a quick run of exact checks).
   After the fix pass of 2026-10-08 (the review's findings), on 51ef4ad5: 139 checks, 0 failed at full size. Of
   the twenty four controls twenty one fired as designed; oldassists, independent and oldgrades went red in
   their own sections and in one more each (B2, B4 and B3, three checks the fix pass added or that their own
   swap starves), which their lists now name with the reason beside each control below.

   KNOBS for a builder, none of which may record: SENSE_TRY_SCALE=1.2 (the legacy constant at another value),
   SENSE_FIELD_POP=starters (the field measured on starter seasons only). */
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const CONTROL = process.env.SIM_NBA_SENSE_CONTROL || '';
const SEEDS = (process.env.SENSE_SEEDS || '1,2,3,4,5').split(',').map(Number);
const CAREERS = Number(process.env.SENSE_CAREERS || 6000);
const OTHERS_PER = Number(process.env.SENSE_OTHERS || 500);
const FULL = CAREERS >= 6000 && SEEDS.length >= 5;
const PROVE_OTHERS = process.env.SENSE_PROVE_OTHERS === '1';
/* Section P: SENSE_PROVE_AGAINST=<commit> plays the same fleets on this tree and on the tree with every src file
   that differs taken back to that commit (read with git show, swapped in memory), and compares them. */
const PROVE_AGAINST = process.env.SENSE_PROVE_AGAINST || '';
if (PROVE_AGAINST && !/^[0-9a-f]{7,40}$/.test(PROVE_AGAINST)) { console.error('SENSE_PROVE_AGAINST needs a commit hash (7 to 40 hex digits)'); process.exit(2); }
const PROVE_CAREERS = Number(process.env.SENSE_PROVE_CAREERS || 1500);
/* Section Q: SENSE_PROVE_1149=<commit> is Round 1149's own before and after proof (the commit before its first
   edit), the way SENSE_PROVE_AGAINST is Round 1112's. */
const PROVE_1149 = process.env.SENSE_PROVE_1149 || '';
if (PROVE_1149 && !/^[0-9a-f]{7,40}$/.test(PROVE_1149)) { console.error('SENSE_PROVE_1149 needs a commit hash (7 to 40 hex digits)'); process.exit(2); }
const BASELINE_FILE = path.join(ROOT, 'scripts', 'data', 'nbaAwardsSenseBaseline.json');
const norm = s => s.replace(/\r\n/g, '\n');
/* Section E's tolerances: how far a seed's measured field may sit from the committed row. */
/* Triple double seasons the elite sweep must still find on every seed (set from five seeds, see the header). */
const ELITE_TD_FLOOR = 2;
/* B9's fleet and its floors, a seed of 300 careers. Measured 2026-10-09 on the tree merged with Release AP,
   seeds 1 to 5: summers where only the award keeps the card out 1137, 1283, 1132, 1106, 1178; the same after
   an All-Star season 860, 987, 828, 826, 883; decks that hold the card 1984, 1961, 2042, 2055, 2010 of about
   5,740 summers a seed. Each floor sits near six tenths of its lowest seed. With the gate taken out (control
   snubhonoured, 300 careers on seed 1) the card sat in 1,026 decks after an honoured season, 766 of them after
   an All-Star season. */
const SNUB_CAREERS = Number(process.env.SENSE_SNUB || 300);
const SNUB_FLOOR = { gateOnly: 700, gateOnlyAllStar: 500, dealt: 1300 };
/* Careers that win an MVP and an All-NBA at least once, percent, as Round 1103 shipped: its five full size
   seeds (6,000 careers each), read on the tree of the round's last gate. Main has 16.6 and 58.8.
   The lead's ruling, 2026-10-09 (session F): ACCEPTED as this round's. The two shares are what the corrected
   rules produce (the games threshold and the fuller season line are real world corrections, not tuning), the
   difference from main is small, and the fence below holds the round's own rate. No second lever. */
const SPREAD_1103 = { everMvp: [17.18, 17.07, 17.73, 17.7, 17.53], everAllNba: [61.7, 60.98, 62.35, 62.47, 62.2] };
/* The same two shares in pass A: the new line under the OLD awards block (independent draws on the season
   score, the 62 game gate, no club wins anywhere), its grades already solved so the awards a career were
   main's (MVPs 0.312, All-NBA 1.962 against 0.315 and 1.986). Five full size seeds on 2026-10-07, the later
   of two such runs during the fit (the earlier one: 18.29 and 63.61), kept so the note below can say where
   the wider spread comes from: the line put it at 18.3 and 63.5, and the one pass took back about two fifths
   of the gap to main (0.7 to 0.8 of 1.7 points, 1.6 to 1.9 of 4.7). Printed, never judged: that tree is gone. */
const PASS_A_SPREAD = { everMvp: [18.43, 17.5, 18.03, 19.15, 18.27], everAllNba: [63.23, 64.2, 63.28, 63.13, 63.77] };
const E_MEAN_TOL = 0.08;
const E_SD_TOL = 0.06;
/* B3: seasons under 65 games before 2023-24 holding an award the games rule names, in a full size run. */
const UNDER65_FLOOR = 1750;
/* What the two All-Rookie teams are set to: the real class's share, a career. */
const R_ALL_ROOKIE_TARGET = 10 / 45;
/* B5: how many times the scorers' All-Defensive rate the defenders' must be. */
const B5_FACTOR = 3;
/* The real rules this harness holds the game to, typed here on purpose (sourced in docs/audits/
   NBA-LINE-NORMS-2026-10.md). They are never read off the engine or its data file: section B3, B8 and F compare
   the engine and the help text WITH these, so a wrong number in the data cannot agree its way to green. */
const REAL_GAMES_RULE = { from: 2023, games: 65, of: 82, season: '2023-24' };
const REAL_ALL_STAR = { picks: 24, weightedFrom: 2016 };
const REAL_SHORT_2011 = { year: 2011, length: 66, games: 56, pts: 1127, reb: 644, ast: 321 };
/* B2: the share of first seasons that land on an All-Rookie team, percent. The real class is 10 picks of about
   45 rookies who play, 22 percent. See the header for the measured five seeds the band was set from. */
const ALL_ROOKIE_SHARE = { lo: 18, hi: 26 };

/* ------------------------------------------------------------------ */
/* Controls: one line of SOURCE swapped in memory, never a file        */
/* ------------------------------------------------------------------ */
/* name -> { file, find, put }. Each anchor must sit in its file exactly once and the swap must change the
   text, or the run refuses (exit 2): a control that changed nothing proves nothing. */
const srcOf = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
/* Two anchors carry a number a builder tunes, so they are read off the source instead of typed here. */
const pgRow = srcOf('src/lib/careerAwards.ts').match(/^ {4}PG: \{ mean: ([0-9.]+), sd: ([0-9.]+) \},$/m);
const FIELD_PG_ROW = pgRow ? pgRow[0] : 'the PG row of LEAGUE.nba is not in careerAwards.ts';
const FIELD_PG_STALE = pgRow ? `    PG: { mean: ${(Number(pgRow[1]) + Number(pgRow[2])).toFixed(1)}, sd: ${pgRow[2]} },` : '';
const scaleLine = srcOf('src/lib/nbaMyCareer.ts').match(/^export const NBA_LEGACY_NEW_LINE_SCALE: number = [0-9.]+;$/m);
const LEGACY_SCALE_LINE = scaleLine ? scaleLine[0] : 'the legacy scale constant is not in nbaMyCareer.ts';
const awardMvpRow = srcOf('src/lib/nbaCareerAwards.ts').match(/^ {2}mvp: \{ PG: \[([-0-9.]+), ([0-9.]+)\], (.*)$/m);
const AWARD_FIELD_ROW = awardMvpRow ? awardMvpRow[0] : 'the mvp row of NBA_FIELD is not in nbaCareerAwards.ts';
const AWARD_FIELD_STALE = awardMvpRow ? `  mvp: { PG: [${(Number(awardMvpRow[1]) + Number(awardMvpRow[2])).toFixed(2)}, ${awardMvpRow[2]}], ${awardMvpRow[3]}` : '';
const allRookieGrade = srcOf('src/lib/nbaCareerAwards.ts').match(/^const G_ALL_ROOKIE = [-0-9.]+;$/m);
const rookieGrade = srcOf('src/lib/nbaCareerAwards.ts').match(/^const G_ROOKIE = ([-0-9.]+);$/m);
const ALL_ROOKIE_GRADE_LINE = allRookieGrade ? allRookieGrade[0] : 'the All-Rookie grade is not in nbaCareerAwards.ts';
const ALL_ROOKIE_GRADE_FLOOD = rookieGrade ? `const G_ALL_ROOKIE = ${rookieGrade[1]};` : '';
const CONTROLS = {
  /* C: one NFL All-Pro grade moved by a hundredth. Judged under SENSE_PROVE_OTHERS=1. */
  othersport: { file: 'src/lib/careerAwards.ts', find: "  QB: { pool: 32, slots: 1, grade: 0.25 },\n  RB:", put: "  QB: { pool: 32, slots: 1, grade: 0.26 },\n  RB:", needs: 'C' },
  /* A: the old assists expression back (a flat rate by rating, plus up to two for everybody). It moves the
     line itself, so the field, the rival, the awards and the Hall may follow it red: `may` lists them. B2 is
     among them since 2026-10-08: more assists is more production, more rookies clear a field measured without
     it, and the All-Rookie share leaves its band (33.6 percent of first seasons at full size). */
  oldassists: { file: 'src/lib/nbaMyCareer.ts',
    find: '  const apg = clampTo((0.045 + d * 0.0052) * a.playmaking * NBA_POS_AST[input.pos] * minutes * era.ast * (0.92 + u5 * 0.16), 0.3, po ? 14 : 13);',
    put: '  const apg = clampTo((1.5 + d * 0.22) * a.playmaking * (bench ? 0.6 : 1) + u5 * 2, 0.3, po ? 14 : 13);', needs: 'A1,A3', may: 'A2,E,R,H,B2,B4,B6' },
  /* E: the PG row of the season score's field one standard deviation stale. Finals MVP reads it (the rival's
     bridge did too until Round 1112 deleted it, so R can no longer follow). */
  stalefield: { file: 'src/lib/careerAwards.ts', find: FIELD_PG_ROW, put: FIELD_PG_STALE, needs: 'E', may: 'H,B6' },
  /* E: the PG row of the MVP score's field (NBA_FIELD) one standard deviation stale. The league's awards read it. */
  staleawardfield: { file: 'src/lib/nbaCareerAwards.ts', find: AWARD_FIELD_ROW, put: AWARD_FIELD_STALE, needs: 'E', may: 'H,B4,B6' },
  /* R: the old scale back under the verdict. The rival is scored on the line before Round 1112 (whole number
     points off his form, no archetype, no minutes) while the screen prints his new one, which is what the bridge
     did: the verdict then says what the two printed lines do not. */
  oldscale: { file: 'src/lib/nbaMyCareer.ts', find: '      score: nbaSeasonScore({ games: L, ...stat }),',
    put: '      score: Math.max(3, Math.round(5 + (form - 64) * 0.62 + 1.5)) * 1.6 + Math.max(1, 2 + (form - 64) * 0.22) * 1.4 + Math.max(0.5, 1.5 + (form - 64) * 0.24) * 1.7,', needs: 'R' },
  /* R: my side of the verdict read off the era neutral line again instead of the printed one. In a modern
     season the two are the same number, so only the 2003-04 careers can tell (one career in four). */
  neutralmine: { file: 'src/lib/nbaMyCareer.ts', find: "    for (const n of judgeRivalSeason(c.rival, nbaSeasonScore(line), c.name, 'nba', rng, nbaRivalSeason(c.year, seasonsPlayed))) notes.push(n);",
    put: "    for (const n of judgeRivalSeason(c.rival, statScore, c.name, 'nba', rng, nbaRivalSeason(c.year, seasonsPlayed))) notes.push(n);", needs: 'R' },
  /* R: the All-Star beat dealt on the two ratings again (both at 80), as it was while it flipped a coin. It then
     turns up in years neither made the roster, saying one of them did. */
  oldgate306: { file: 'src/lib/nbaCareerRivalryEvents.ts', find: '        when: (s, r) => { const f = nbaAllStarFacts(s, r); return !!f && !f.mine && f.his; },', put: '        when: (s, r) => s.ovr >= 80 && r.ovr >= 80,', needs: 'R' },
  /* Q, Round 1149: the MLB tick taking one more draw of the season's stream (every draw of the player's after it
     moves). Judged under SENSE_PROVE_1149=<commit> only, like othersport under SENSE_PROVE_OTHERS. */
  tickdraws: { file: 'src/lib/mlbCareerRivalryEvents.ts', find: '  const rolled = rollRivalryEvent(c, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);', put: '  rng(); const rolled = rollRivalryEvent(c, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);', needs: 'Q' },
  /* R: the rival's season taking a second draw of the season's stream (every draw of the player's after it moves). */
  rivaldraws: { file: 'src/lib/nbaMyCareer.ts', find: "    const keyed = keyedRng(`nba-rival|${r.name}|${year}|${rng()}`);", put: "    const keyed = keyedRng(`nba-rival|${r.name}|${year}|${rng() + rng()}`);", needs: PROVE_AGAINST ? 'R,P' : 'R' },
  /* K: the Trophy Case tile's row for the lesser awards taken out. */
  norow: { file: 'src/lib/nbaCareerSport.ts', find: "    otherAwardsRow(c.seasons, NBA_TILE_NAMED),", put: "    { label: 'in other awards', n: 0 },", needs: 'K' },
  /* K, Round 1149: the same row taken out of each of the other three careers, and one award named twice (a Cy
     Young counted by its own row and by the row for the rest). */
  norownfl: { file: 'src/lib/nflCareerSport.ts', find: ", otherAwardsRow(c.seasons, NFL_TILE_NAMED)],", put: "],", needs: 'K' },
  norowmlb: { file: 'src/lib/mlbCareerSport.ts', find: ", otherAwardsRow(c.seasons, MLB_TILE_NAMED)],", put: "],", needs: 'K' },
  norownhl: { file: 'src/lib/nhlCareerSport.ts', find: ", otherAwardsRow(c.seasons, NHL_TILE_NAMED)],", put: "],", needs: 'K' },
  twicecounted: { file: 'src/lib/mlbCareerSport.ts', find: "const MLB_TILE_NAMED = ['MVP', 'Cy Young', 'All-Star'];", put: "const MLB_TILE_NAMED = ['MVP', 'All-Star'];", needs: 'K' },
  /* T: the near tie saying "You lead" whoever leads, as it did in all four sports. */
  nearlie: { file: 'src/lib/careerRival.ts', find: 'Nothing in it again. ${rivalLeadLine(r)}`);', put: 'Nothing in it again. You lead the head to head ${head}.`);', needs: 'T' },
  /* H: the legacy constant back to 1. Refuses when it already is 1 (then nomvpworth is the control H has). */
  noscale: { file: 'src/lib/nbaMyCareer.ts', find: LEGACY_SCALE_LINE, put: 'export const NBA_LEGACY_NEW_LINE_SCALE: number = 1;', needs: 'H' },
  /* H: an MVP worth nothing to the legacy score of a career retiring today. */
  nomvpworth: { file: 'src/lib/nbaMyCareer.ts', find: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },', put: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 0, finalsMvps: 90, allNbas: 48 },', needs: 'H' },
  /* B1: MVP decided on its own again, with no First Team gate and no playoff gate. It then also ignores the
     games tests the First Team carried, and there are more of them, so B3, B6 and the Hall may follow. And B4
     since 2026-10-08: an MVP off the First Team is not held to start the All-Star Game (27 to 41 a seed). */
  independent: { file: 'src/lib/nbaCareerAwards.ts', find: '  const mvp = out.allNbaTeam === 1 && x.madePlayoffs && zMvp > bar(150, 1, G_MVP, g1);', put: '  const mvp = zMvp > bar(150, 1, G_MVP, g1);', needs: 'B1', may: 'B3,B4,B6,H' },
  /* B2: the rookie test back to what the old block asked (22 or older, a first or second season). */
  rookieage: { file: 'src/lib/nbaMyCareer.ts', find: "    bench: c.role === 'backup', rookie: c.seasons.length === 0,", put: "    bench: c.role === 'backup', rookie: c.age >= 22 && c.seasons.length <= 1,", needs: 'B2', may: 'B6' },
  /* B3: the old block's 62 games in every era, in place of the real rule. Both halves must go red. */
  bar62: { file: 'src/lib/nbaCareerAwards.ts', find: '    overBar: x.games >= nbaAwardGamesBar(x.year, x.seasonLength, NBA_AWARD_RULES),', put: '    overBar: x.games >= 62,', needs: 'B3', may: 'B6,H' },
  /* B5: the defensive awards read the MVP score again, the way one season score used to decide everything. */
  scorersdefend: { file: 'src/lib/nbaCareerAwards.ts', find: '  const zDef = zOf(v.defense, fieldRow(NBA_FIELD.defense)) - x.defenceRep;', put: '  const zDef = zMvp;', needs: 'B5', may: 'B6' },
  /* D: NBA Front Office adding its own sum again instead of calling the shared score. */
  privatecopy: { file: 'src/lib/nbaSeasonStats.ts', find: "  return nbaMvpValue(nbaProduction(foPerGame(p, 'pts'), foPerGame(p, 'reb'), foPerGame(p, 'ast')), winShare(league, p.team), NBA_MVP_WIN_WEIGHT);", put: "  return foPerGame(p, 'pts') + foPerGame(p, 'reb') + foPerGame(p, 'ast') + NBA_MVP_WIN_WEIGHT * winShare(league, p.team);", needs: 'D' },
  /* D: the career's win weight drifting off NBA Front Office's. */
  /* F: the worked example's winning club read as its losing one. The sum still adds up; the claim is false. */
  example: { file: 'src/lib/nbaCareerAwards.ts', find: 'export const NBA_MVP_EXAMPLE = { ppg: 27.4, rpg: 6.1, apg: 5.3, wins: 54, losses: 28, losingWins: 34, losingLosses: 48 } as const;', put: 'export const NBA_MVP_EXAMPLE = { ppg: 27.4, rpg: 6.1, apg: 5.3, wins: 34, losses: 48, losingWins: 34, losingLosses: 48 } as const;', needs: 'F' },
  weightdrift: { file: 'src/lib/nbaCareerAwards.ts', find: 'export const NBA_CAREER_MVP_WIN_WEIGHT = 20;', put: 'export const NBA_CAREER_MVP_WIN_WEIGHT = 19;', needs: 'D', may: 'E,B6,H' },
  /* B3: the games rule starting a season late (2023-24 itself carrying no bar). The fleet has few 2023-24
     seasons, so the unit check of B3 is what must catch it. */
  barfrom: { file: 'src/lib/awardDecision.ts', find: '  return year >= rule.gamesBarFrom ? Math.ceil((rule.gamesBar / rule.gamesBarOf) * length) : 0;', put: '  return year > rule.gamesBarFrom ? Math.ceil((rule.gamesBar / rule.gamesBarOf) * length) : 0;', needs: 'B3' },
  /* B3 and F: the sourced 65 typed as 62 in the data. The engine and the help then agree with each other, and
     only a number written in this harness can tell. */
  bar62data: { file: 'src/data/nbaLeagueNorms.ts', find: '  gamesBarFrom: 2023, gamesBar: 65, gamesBarOf: 82,', put: '  gamesBarFrom: 2023, gamesBar: 62, gamesBarOf: 82,', needs: 'B3,F', may: 'B6,H' },
  /* B8: the rebounding title judged against the assists leaders' bar. */
  titlebar: { file: 'src/lib/nbaCareerAwards.ts', find: "  const rebounding = title('reb', x.rpg, u7);", put: "  const rebounding = title('ast', x.rpg, u7);", needs: 'B8' },
  /* B8: the two eras of the All-Star starters' vote swapped (the fans alone today, the weighted vote before). */
  fanvoteera: { file: 'src/lib/nbaCareerAwards.ts', find: '    const fanShare = x.year >= R.allStarFanShareFrom ? R.allStarFanShare : 1;', put: '    const fanShare = x.year >= R.allStarFanShareFrom ? 1 : R.allStarFanShare;', needs: 'B8', may: 'B4' },
  /* B8: the short 2011-12 season's own stat title minimum never handed over (the share stands in for it). */
  shortseason: { file: 'src/lib/nbaCareerAwards.ts', find: '    const short = x.seasonLength < R.gamesBarOf ? R.statTitleShortBefore[x.year] : undefined;', put: '    const short = undefined;', needs: 'B8' },
  /* B9: Round 1104's gate on the snub card taken out (an All-Star, or a four time MVP, is told the coaches
     left him off the team again). */
  snubhonoured: { file: 'src/lib/nbaCareerLifeB.ts', find: "  if (yrs >= 3 && c.ovr >= 80 && last.awards.length === 0 && flag(c, 'nb_snub') === 0) {", put: "  if (yrs >= 3 && c.ovr >= 80 && flag(c, 'nb_snub') === 0) {", needs: 'B9' },
  /* B4: the First Team gate on the All-Star starters taken out (the League MVP reads "All-Star reserve" again). */
  firstteamreserve: { file: 'src/lib/nbaCareerAwards.ts', find: '    const firstTeam = out.allNbaTeam === 1;', put: '    const firstTeam = false;', needs: 'B4' },
  /* B4: the bench gate on the fan vote taken out (a backup with a following starts the All-Star Game again). */
  benchstarter: { file: 'src/lib/nbaCareerAwards.ts', find: '    const voted = !x.bench && fanShare * zFans', put: '    const voted = fanShare * zFans', needs: 'B4' },
  /* H: every career read on the new line's books, an old line one included (a career retired between Round
     1051 and this round is then told a different ballot). */
  newbooksforold: { file: 'src/lib/nbaMyCareer.ts', find: '  if (w === 1) return NBA_LEGACY_V2;', put: '  if (w >= 0) return NBA_LEGACY_V2;', needs: 'H' },
  /* B2: the two All-Rookie teams back on the Rookie of the Year's grade, which put half of all first seasons
     on a team. */
  rookieflood: { file: 'src/lib/nbaCareerAwards.ts', find: ALL_ROOKIE_GRADE_LINE, put: ALL_ROOKIE_GRADE_FLOOD, needs: 'B2', may: 'B6' },
};
/* Controls that swap more than one line of one file (each anchor exactly once, the edit must change the text). */
const MULTI = {
  /* B6: the All-NBA and MVP grades back to what careerAwards.ts carried before Round 1103 (0.15 and none). Fewer
     of both follow, so the Hall and the All-Star ratio may too, and B3's floor of rule awards won under 65 games
     before the rule (1,678 in the run at full size against a floor of 1,750: fewer awards, fewer of those). */
  oldgrades: { file: 'src/lib/nbaCareerAwards.ts', needs: 'B6', may: 'H,B3,B4', swaps: [
    [/^const G_ALL_NBA = [-0-9.]+;$/m, 'const G_ALL_NBA = 0.15;'],
    [/^const G_MVP = [-0-9.]+;$/m, 'const G_MVP = 0;'],
  ] },
};
for (const [k, v] of Object.entries(MULTI)) CONTROLS[k] = v;
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown SIM_NBA_SENSE_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`);
  process.exit(2);
}
/* SENSE_TRY_SCALE=1.2 plays the fleet with the legacy constant at another value, for the Hall procedure (measure,
   step, measure again). It is a measuring knob, never a record: a run with it set refuses to write a baseline. */
const TRY_SCALE = process.env.SENSE_TRY_SCALE || '';
const edits = [];
if (CONTROL) edits.push({ label: `control ${CONTROL}`, file: CONTROLS[CONTROL].file, swaps: CONTROLS[CONTROL].swaps ?? [[CONTROLS[CONTROL].find, CONTROLS[CONTROL].put]] });
if (TRY_SCALE) {
  if (!(Number(TRY_SCALE) > 0)) { console.error('SENSE_TRY_SCALE needs a number'); process.exit(2); }
  edits.push({ label: `try scale ${TRY_SCALE}`, file: 'src/lib/nbaMyCareer.ts', swaps: [[LEGACY_SCALE_LINE, `export const NBA_LEGACY_NEW_LINE_SCALE: number = ${Number(TRY_SCALE)};`]], sameOk: true });
}
/** One file's source with a list of edits applied: each anchor exactly once, each edit must change the text. */
function editedSource(list, file, src, onApplied = () => {}) {
  let out = src;
  for (const e of list.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const was = out;
    for (const [find, put] of e.swaps) {
      const hits = typeof find === 'string' ? out.split(find).length - 1 : (out.match(new RegExp(find.source, 'gm')) ?? []).length;
      if (hits !== 1) { console.error(`${e.label}: anchor ${String(find).slice(0, 70)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
      out = out.replace(find, put);
    }
    if (out === was && !e.sameOk) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied(e);
  }
  return out;
}
/** A source file as this run's control sees it (what a source check must read, never the bare file). */
const underControl = rel => editedSource(edits, rel, srcOf(rel));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/** The engine bundled with a list of source edits swapped in memory (a plugin, never a file). */
async function bundleWith(list, tag) {
  let applied = 0;
  const plugin = {
    name: 'sense-control',
    setup(b) {
      if (!list.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!list.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(list, args.path, norm(readFileSync(args.path, 'utf8')), () => { applied++; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `nba-sense-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  if (applied !== list.length) { console.error(`${list.map(e => e.label).join(', ')}: ${applied} of ${list.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}
/** Section P: the engine with every src file that differs from `commit` read at that commit (git show, in
 *  memory). Says how many files it took back, so a proof against a tree that is this tree cannot pass quietly. */
async function bundleAt(commit) {
  const changed = execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean);
  const served = new Set();
  const plugin = {
    name: 'sense-before',
    setup(b) {
      b.onLoad({ filter: /[.]tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
        if (!changed.includes(rel)) return undefined;
        let contents;
        try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; /* a file the round added */ }
        served.add(rel);
        return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `nba-sense-${process.pid}-before.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return { mod, changed, served: [...served] };
}
const BUNDLE = {
  stdin: {
    contents: [
      "export * as nba from './src/lib/nbaMyCareer.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as mlb from './src/lib/mlbMyCareer.ts';",
      "export * as nhl from './src/lib/nhlMyCareer.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as fo from './src/lib/nbaSeasonStats.ts';",
      "export { NBA_CAREER_HALL } from './src/lib/nbaCareerHall.ts';",
      "export { hallRecordFor } from './src/lib/careerHallOfFame.ts';",
      "export * as loop from './src/lib/nbaCareerLoop.ts';",
      "export * as norms from './src/data/nbaLeagueNorms.ts';",
      "export { seasonSwing } from './src/lib/careerVariance.ts';",
      "export * as nbaAwards from './src/lib/nbaCareerAwards.ts';",
      "export { keyedRng } from './src/lib/keyedRng.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
      "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
      "export { honoursTotal } from './src/lib/careerHub.ts';",
      "export { nbaStatLine } from './src/lib/usCareerStatLine.ts';",
      "export * as decision from './src/lib/awardDecision.ts';",
      "export { NBA_BADGES } from './src/lib/careerBadges.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
};
const E = await bundleWith(edits, 'run');
const { nba, nfl, mlb, nhl } = E;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sdOf = a => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : 0; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const r3 = x => Math.round(x * 1000) / 1000;
const share = (n, d) => (d ? (100 * n) / d : 0);
const has = (s, a) => s.awards.includes(a);
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ARCH_IDS = POS.flatMap(p => nba.NBA_ARCHETYPES[p].map(a => a.id));

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
/** Plays `careers` NBA careers on one seed, the board's own order. Every season is kept with what the engine
 *  knew going in (rating, morale, club, role, seasons played), so a section can replay it through a function. */
/** A rivalry card as the player reads it, for a word for word comparison of two trees (section Q). */
const cardText = e => `${e.id}|${e.emoji}|${e.title}|${e.description}|${e.consequence}`;
function playFleet(seed, careers, M = E, digest = false) {
  const nba = M.nba;
  const rnd = mulberry32(seed);
  Math.random = rnd;
  const seasons = [];
  const out = [];
  const nearTies = [];
  /* Section P: everything the player lives and sees that is his own. Each season's line (awards on it), his
     role, his club's quality, his own notes (the rival's note, the one line that starts with the mirror, is
     left out: it is what Round 1112 moves), the summer card he drew and the option taken, and every number on
     the final save. */
  const h = digest ? crypto.createHash('sha256') : null;
  const trail = [];
  for (let i = 0; i < careers; i++) {
    const pos = POS[i % 5];
    const arch = nba.NBA_ARCHETYPES[pos][i % 3];
    const era = i % 4 === 3 ? 'y2004' : 'now';
    const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, era === 'y2004' ? 'y2004' : undefined);
    let tq = nba.nbaRollTeamQuality(null, rnd);
    nba.nbaAssignRole(c, tq, rnd);
    let guard = 0;
    let done = false;
    while (!done && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        nba.nbaCampBattle(c, tq, rnd);
        const prev = c.seasons[c.seasons.length - 1];
        const pre = { ovr: c.ovr, morale: c.morale, age: c.age, role: c.role ?? 'starter', n: c.seasons.length, fan: c.fanbase, everAllNba: c.allNbas > 0, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0 };
        /* The fleet never answers a rivalry card, so the pending one can be an older season's: a beat is this
           season's only when the object is new. */
        const pendingBefore = c.pendingRivalryEvent;
        const { line, notes: seasonNotes } = nba.simNbaSeason(c, tq, rnd);
        const beat = c.pendingRivalryEvent && c.pendingRivalryEvent !== pendingBefore ? c.pendingRivalryEvent : null;
        if (h) trail.push({ role: c.role ?? 'starter', tq, line, notes: seasonNotes.filter(n => !n.startsWith(MIRROR)) });
        nearTies.push(...nearTieOf(seasonNotes, c.rival));
        seasons.push({ i, pos, arch: arch.id, era, tq, ...pre, prev, line, won: (c.rival?.myYears ?? 0) - pre.my, lost: (c.rival?.hisYears ?? 0) - pre.his, rivalScore: c.rival?.lastScore ?? null, rivalLine: c.rival?.lastLine ?? null,
          rivalAllStar: c.rival?.lastAllStar === true, beat306: beat && beat.id === 306 ? { says: beat.description, does: beat.consequence } : null, beatDealt: !!beat,
          /* Q: the card as dealt, word for word. */
          beatCard: beat ? cardText(beat) : '' });
      }
      nba.nbaProgress(c, rnd);
      const ev = nba.drawNbaEvent(c, rnd);
      if (ev) { const k = Math.floor(rnd() * ev.options.length); const pick = ev.options[k]; pick.apply(c, rnd); if (h) trail.push({ card: ev.id, option: k }); }
      tq = nba.nbaRollTeamQuality(tq, rnd);
      if (nba.nbaShouldRetire(c)) done = true;
    }
    if (h) {
      const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
      h.update(JSON.stringify({ trail, counters }));
      trail.length = 0;
    }
    /* Read while the career is still open: a career retiring today is told on today's calibration (Round 1051). */
    const leg = nba.nbaLegacyOf(c);
    const hall = M.hallRecordFor(M.NBA_CAREER_HALL, c);
    const tot = nba.nbaCareerTotals(c);
    out.push({ i, pos, arch: arch.id, era, seasons: c.seasons.length, mvps: c.mvps, allNbas: c.allNbas, allStars: c.allStars ?? 0, rings: c.rings, finalsMvps: c.finalsMvps,
      score: leg.score, inducted: hall.outcome === 'inducted', firstBallot: !!hall.firstBallot, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0, pts: tot.pts,
      /* K: what the hub's Trophy Case tile counts (rings plus the sport's honours rows) against the awards on the seasons. */
      tile: M.honoursTotal({ rings: c.rings, honours: M.NBA_CAREER_SPORT.honours(c) }), awardsHeld: c.seasons.reduce((n, s) => n + (s.awards ?? []).length, 0),
      named: c.mvps + c.allNbas + (c.allStars ?? 0) });
  }
  return { seasons, careers: out, nearTies, digest: h ? h.digest('hex') : null };
}

const band = o => (o < 72 ? '<72' : o < 76 ? '72-75' : o < 80 ? '76-79' : o < 84 ? '80-83' : o < 88 ? '84-87' : o < 92 ? '88-91' : o < 96 ? '92-95' : '96+');
const AWARDS = ['All-Star', 'Rookie of the Year', 'All-NBA', 'MVP', 'Finals MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Most Improved Player', 'Sixth Man of the Year', 'All-Rookie Team'];
const healthy = s => s.line.games >= 58;
/* A printed NBA line read back into numbers, and the shape the player's own new line prints in. */
const printedLine = t => { const x = /^([0-9]+(?:[.][0-9]+)?) ppg, ([0-9]+(?:[.][0-9]+)?) rpg, ([0-9]+(?:[.][0-9]+)?) apg$/.exec(t ?? ''); return x ? { ppg: Number(x[1]), rpg: Number(x[2]), apg: Number(x[3]) } : null; };
const RIVAL_SHAPE = /^[0-9]+[.][0-9] ppg, [0-9]+[.][0-9] rpg, [0-9]+[.][0-9] apg$/;
const isNewLine = l => typeof l.mpg === 'number';
/* The rival's season note starts with this (careerRival.ts). */
const MIRROR = '\u{1FA9E}';
/* T: a near tie note read against the tally on the save, right after the season that wrote it. */
const NEAR_TIE = /Nothing in it again[.] (?:(You lead) the head to head (\d+)-(\d+)|(He leads) the head to head (\d+)-(\d+)|The head to head is (level) at (\d+)-(\d+))[.]$/;
function nearTieOf(notes, rival) {
  const out = [];
  if (!rival) return out;
  for (const n of notes ?? []) {
    if (!n.includes('Nothing in it')) continue;
    const x = NEAR_TIE.exec(n);
    const my = rival.myYears; const his = rival.hisYears;
    if (!x) out.push({ kind: 'unread', ok: false, note: n });
    else if (x[1]) out.push({ kind: 'mine', ok: my > his && Number(x[2]) === my && Number(x[3]) === his, note: n });
    else if (x[4]) out.push({ kind: 'his', ok: his > my && Number(x[5]) === his && Number(x[6]) === my, note: n });
    else out.push({ kind: 'level', ok: my === his && Number(x[8]) === my && Number(x[9]) === his, note: n });
  }
  return out;
}

/** Every rate the bands hang off, for one seed's fleet. Plain numbers only: this is what the baseline stores. */
function measure(f, M = E) {
  const n = f.careers.length;
  const S = f.seasons;
  const per = a => r3(S.filter(s => has(s.line, a)).length / n);
  const m = {};
  m.careers = n; m.seasons = S.length;
  m.inducted = r2(share(f.careers.filter(c => c.inducted).length, n));
  m.firstBallot = r2(share(f.careers.filter(c => c.firstBallot).length, n));
  for (const era of ['now', 'y2004']) {
    const cs = f.careers.filter(c => c.era === era);
    m[`inducted_${era}`] = r2(share(cs.filter(c => c.inducted).length, cs.length));
  }
  m.scoreP50 = r1(pctl(f.careers.map(c => c.score), 0.5)); m.scoreP90 = r1(pctl(f.careers.map(c => c.score), 0.9));
  m.perCareer = Object.fromEntries(AWARDS.map(a => [a, per(a)]));
  /* How unevenly an award falls: the sd of its count over careers (most win none, a few win several). */
  m.sdCareer = Object.fromEntries(AWARDS.map(a => { const cnt = new Array(n).fill(0); for (const s of S) if (has(s.line, a)) cnt[s.i] += 1; return [a, r3(sdOf(cnt))]; }));
  m.everMvp = r2(share(f.careers.filter(c => c.mvps > 0).length, n));
  m.everAllNba = r2(share(f.careers.filter(c => c.allNbas > 0).length, n));
  const mvp = S.filter(s => has(s.line, 'MVP'));
  m.mvpSeasons = mvp.length;
  m.mvpMissedPlayoffs = r2(share(mvp.filter(s => s.line.teamResult === nba.NBA_MISSED_PLAYOFFS).length, mvp.length));
  m.mvpNotAllNba = r2(share(mvp.filter(s => !has(s.line, 'All-NBA')).length, mvp.length));
  m.mvpAlsoMip = r2(share(mvp.filter(s => has(s.line, 'Most Improved Player')).length, mvp.length));
  const roy = S.filter(s => has(s.line, 'Rookie of the Year'));
  m.roySeasons = roy.length; m.royOnAllRookie = roy.filter(s => has(s.line, 'All-Rookie Team')).length;
  m.allRookieInFirstSeason = S.filter(s => s.n === 0 && has(s.line, 'All-Rookie Team')).length;
  m.allDefByArch = Object.fromEntries(ARCH_IDS.map(a => [a, r3(S.filter(s => s.arch === a && has(s.line, 'All-Defensive Team')).length / Math.max(1, f.careers.filter(c => c.arch === a).length))]));
  const my = f.careers.reduce((x, c) => x + c.my, 0); const his = f.careers.reduce((x, c) => x + c.his, 0);
  m.myShare = r2(share(my, my + his));
  m.myShareByArch = Object.fromEntries(ARCH_IDS.map(a => { const cs = f.careers.filter(c => c.arch === a); const x = cs.reduce((t, c) => t + c.my, 0); const y = cs.reduce((t, c) => t + c.his, 0); return [a, r1(share(x, x + y))]; }));
  /* R (Round 1112): how often the verdict disagrees with the two lines AS THE SCREEN PRINTS THEM. Both are read
     back off their printed text (mine through the printer the season card uses, his as the note carries it) and
     scored by the one season score, so nothing the engine kept to itself can agree its way to green. A rival
     line that is not in the player's shape (three parts, one decimal each) is counted on its own. */
  const judged = S.filter(s => s.won + s.lost === 1 && s.rivalScore != null);
  let disagree = 0; let unread = 0; let offShape = 0;
  for (const s of judged) {
    const mine = printedLine(M.nbaStatLine(s.line)); const his = printedLine(s.rivalLine);
    if (!mine || !his) { unread++; continue; }
    if (isNewLine(s.line) && !RIVAL_SHAPE.test(s.rivalLine)) offShape++;
    if ((M.awards.nbaSeasonScore(mine) > M.awards.nbaSeasonScore(his)) !== (s.won === 1)) disagree++;
  }
  m.rivalJudged = judged.length; m.rivalUnread = unread; m.rivalOffShape = offShape; m.rivalDisagreeN = disagree;
  /* R4 (Round 1112): the All-Star beat against the two seasons it is about. Mine is the season card's own
     selection, his the rival's of the same year. */
  const b306 = S.filter(s => s.beat306);
  const kindOf = s => (s.line.allStar && s.rivalAllStar ? 'both' : s.line.allStar ? 'mine' : s.rivalAllStar ? 'his' : 'neither');
  const SAYS = { both: /are both on them/, mine: /You are on one and .+ is not/, his: /is on one and you are not/ };
  const DOES = { both: 'Fanbase +3', mine: 'Morale +5', his: 'Morale -5' };
  m.beat306 = { dealt: b306.length, both: 0, mine: 0, his: 0, neither: 0, lies: 0 };
  for (const s of b306) {
    const k = kindOf(s);
    m.beat306[k] += 1;
    if (k === 'neither' || !SAYS[k].test(s.beat306.says) || s.beat306.does !== DOES[k]) m.beat306.lies += 1;
  }
  m.beatsDealt = S.filter(s => s.beatDealt).length;
  m.allStarSeasons = { mine: r2(share(judged.filter(s => s.line.allStar).length, judged.length)), his: r2(share(judged.filter(s => s.rivalAllStar).length, judged.length)) };
  m.rivalDisagree = r2(share(disagree, judged.length - unread));
  m.starters = {};
  for (const b of ['80-83', '88-91']) {
    m.starters[b] = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.role !== 'backup' && healthy(s) && s.pos === p && band(s.ovr) === b).map(s => s.line); return [p, [r1(mean(v.map(l => l.ppg))), r1(mean(v.map(l => l.rpg))), r1(mean(v.map(l => l.apg))), v.length]]; }));
  }
  const rook = S.filter(s => s.n === 0 && healthy(s));
  m.rookieStarterPpg = r1(mean(rook.filter(s => s.role !== 'backup').map(s => s.line.ppg)));
  m.benchPpg = r1(mean(S.filter(s => s.role === 'backup' && healthy(s)).map(s => s.line.ppg)));
  m.starterPpg = r1(mean(S.filter(s => s.role !== 'backup' && healthy(s)).map(s => s.line.ppg)));
  /* The typed gates of the old awards block: what share of qualified seasons (62 games) pass each. */
  const q = S.filter(s => s.line.games >= 62);
  const bigs = q.filter(s => s.pos === 'PF' || s.pos === 'C');
  const withPrev = q.filter(s => s.prev && s.prev.games >= 40);
  m.gates = {
    ppg28: r3(share(q.filter(s => s.line.ppg >= 28).length, q.length)),
    apg10: r3(share(q.filter(s => s.line.apg >= 10).length, q.length)),
    rpg11: r3(share(q.filter(s => s.line.rpg >= 11).length, q.length)),
    rpg125big: r3(share(bigs.filter(s => s.line.rpg >= 12.5).length, bigs.length)),
    jump6: r3(share(withPrev.filter(s => s.line.ppg - s.prev.ppg >= 6).length, withPrev.length)),
    ppg14: r3(share(q.filter(s => s.line.ppg >= 14).length, q.length)),
  };
  /* Readers this round does not own (the lead's list): how often each passes. */
  m.tripleDouble = S.filter(s => s.line.ppg >= 10 && s.line.rpg >= 10 && s.line.apg >= 10).length;
  m.ppg16share = r2(share(S.filter(s => s.line.games > 0 && s.line.ppg >= 16).length, S.length));
  m.career12k = r2(share(f.careers.filter(c => c.pts >= 12000).length, n));
  m.career25k = r2(share(f.careers.filter(c => c.pts >= 25000).length, n));
  m.bothTitles = S.filter(s => has(s.line, 'Scoring Champion') && has(s.line, 'Assists Leader')).length;
  const wings = S.filter(s => (s.pos === 'SG' || s.pos === 'SF') && s.role !== 'backup');
  m.wing8ast = r3(share(wings.filter(s => s.line.apg >= 8).length, wings.length));
  /* The field as the fleet lives it: mean and sd of the season score by position, half a schedule or more. */
  m.field = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.pos === p && s.line.games >= 41).map(s => E.awards.nbaSeasonScore(s.line)); return [p, [r2(mean(v)), r2(sdOf(v))]]; }));
  /* Section B's counts: do the awards agree with each other, the club and the rules. Plain counts, so a check
     on them can be exact. They read the optional keys the one pass writes; on main every one of them is absent. */
  const any = (s, list) => list.some(a => has(s.line, a));
  const count = fn => S.filter(fn).length;
  const len = s => nba.nbaSeasonGames ? nba.nbaSeasonGames(s.line.year) : 82;
  /* The real games rule, written HERE and never read off the engine or its data: a bar the engine computes
     for itself only proves the engine agrees with itself (an off by one on the first season and a 62 typed
     into the data both passed that way). 65 of 82 from 2023-24, scaled to a shorter season. */
  const barOf = s => (s.line.year >= REAL_GAMES_RULE.from ? Math.ceil((REAL_GAMES_RULE.games / REAL_GAMES_RULE.of) * len(s)) : 0);
  const firsts = S.filter(s => s.n === 0 && s.line.games > 0);
  const team = k => firsts.filter(s => s.line.allRookieTeam === k);
  m.rookies = {
    firstSeasons: firsts.length,
    onTeam: firsts.filter(s => s.line.allRookieTeam != null).length,
    first: team(1).length, second: team(2).length,
    firstMedPpg: r1(pctl(team(1).map(s => s.line.ppg), 0.5)), secondMedPpg: r1(pctl(team(2).map(s => s.line.ppg), 0.5)),
    firstBench: r1(share(team(1).filter(s => s.role === 'backup').length, team(1).length)), secondBench: r1(share(team(2).filter(s => s.role === 'backup').length, team(2).length)),
    under6: firsts.filter(s => s.line.allRookieTeam != null && s.line.ppg < 6).length,
  };
  m.b = {
    mvp: mvp.length,
    mvpMissed: mvp.filter(s => s.line.teamResult === nba.NBA_MISSED_PLAYOFFS).length,
    mvpOffFirst: mvp.filter(s => s.line.allNbaTeam !== 1).length,
    mvpAndMip: mvp.filter(s => has(s.line, 'Most Improved Player')).length,
    mip: count(s => has(s.line, 'Most Improved Player')),
    mipAfterAllNba: count(s => has(s.line, 'Most Improved Player') && s.everAllNba),
    roy: roy.length,
    royOffFirst: roy.filter(s => s.line.allRookieTeam !== 1).length,
    allRookieFirstSeason: count(s => s.n === 0 && has(s.line, 'All-Rookie Team')),
    allRookieLater: count(s => s.n !== 0 && has(s.line, 'All-Rookie Team')),
    barAwardsFrom2023: count(s => s.line.year >= 2023 && any(s, BAR_AWARDS)),
    underBarFrom2023: count(s => s.line.year >= 2023 && any(s, BAR_AWARDS) && s.line.games < barOf(s)),
    under65Before2023: count(s => s.line.year < 2023 && any(s, BAR_AWARDS) && s.line.games < 65),
    sixth: count(s => has(s.line, 'Sixth Man of the Year')),
    sixthStarter: count(s => has(s.line, 'Sixth Man of the Year') && s.role !== 'backup'),
    underHalf: count(s => any(s, HALF_AWARDS) && s.line.games * 2 < len(s)),
    allNbaNoAllStar: count(s => has(s.line, 'All-NBA') && !has(s.line, 'All-Star')),
    /* The saved string and the optional key that names the team must tell the same story. */
    keyMismatch: count(s => has(s.line, 'All-NBA') !== (s.line.allNbaTeam != null) || has(s.line, 'All-Star') !== (s.line.allStar != null)
      || has(s.line, 'All-Defensive Team') !== (s.line.allDefensiveTeam != null) || has(s.line, 'All-Rookie Team') !== (s.line.allRookieTeam != null)),
    dpoyOffTeam: count(s => has(s.line, 'Defensive Player of the Year') && s.line.allDefensiveTeam == null),
    starters: count(s => s.line.allStar === 'starter'),
    firstTeam: count(s => s.line.allNbaTeam === 1),
    firstTeamNotStarter: count(s => s.line.allNbaTeam === 1 && s.line.allStar !== 'starter'),
    mvpNotStarter: mvp.filter(s => s.line.allStar !== 'starter').length,
    allStars: count(s => s.line.allStar != null),
    benchStarters: count(s => s.role === 'backup' && s.line.allStar === 'starter' && s.line.allNbaTeam !== 1),
    benchAllStars: count(s => s.role === 'backup' && s.line.allStar != null),
    noRecord: count(s => s.line.games > 0 && !(s.line.clubWins >= 0 && s.line.clubWins + s.line.clubLosses === len(s))),
  };
  return m;
}
/* The five awards the real games rule names, and everything the game's own half season floor covers (a Finals
   MVP is left out on purpose: a man hurt in March can own the Finals). */
const BAR_AWARDS = ['All-NBA', 'MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Most Improved Player'];
const HALF_AWARDS = ['All-Star', 'Rookie of the Year', 'All-NBA', 'MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Most Improved Player', 'Sixth Man of the Year', 'All-Rookie Team'];

/** The input the engine hands decideNbaAwards for a recorded season, rebuilt from what the fleet kept. Used to
 *  MEASURE (the field, the fit), never to decide. */
function inputOf(s) {
  const L = nba.nbaSeasonGames(s.line.year);
  const prev = s.prev && s.prev.teamResult !== 'SUSPENDED' ? { year: s.prev.year, games: s.prev.games, ppg: s.prev.ppg, rpg: s.prev.rpg, apg: s.prev.apg } : null;
  return { pos: s.pos, defenceRep: (nba.NBA_ARCH_DEFENSE[s.arch] ?? { rep: 0 }).rep, bench: s.role === 'backup', rookie: s.n === 0,
    year: s.line.year, seasonLength: L, games: s.line.games, ppg: s.line.ppg, rpg: s.line.rpg, apg: s.line.apg, spg: s.line.spg ?? 0, bpg: s.line.bpg ?? 0,
    winShare: (s.line.clubWins ?? 0) / L, madePlayoffs: s.line.teamResult !== nba.NBA_MISSED_PLAYOFFS, fanbase: s.fan, prev, everAllNba: s.everAllNba };
}
const HAS_PASS = () => typeof E.nbaAwards?.decideNbaAwards === 'function';
/** NBA_FIELD as the fleet lives it: mean and sd of each score the one pass reads, half a season or more. */
function awardFieldOf(f) {
  const rows = f.seasons.filter(s => s.line.games > 0).map(s => { const x = inputOf(s); return { pos: s.pos, x, v: E.nbaAwards.nbaAwardValues(x) }; }).filter(r => r.v.half);
  const ms = v => ({ mean: mean(v), sd: sdOf(v), n: v.length });
  const byPos = key => Object.fromEntries(POS.map(p => [p, ms(rows.filter(r => r.pos === p).map(r => r.v[key]))]));
  return { rows, mvp: byPos('mvp'), defense: byPos('defense'), production: byPos('production'),
    bench: ms(rows.filter(r => r.x.bench).map(r => r.v.benchPts)), jump: ms(rows.filter(r => r.v.jump !== null).map(r => r.v.jump)), fans: ms(rows.map(r => r.x.fanbase)) };
}
/** Each award's expected rate a career as a function of its grade, worked out exactly from every season's z
 *  against THIS fleet's own field (the chance a z beats a bar is exp(-exp(-t)) with t the bar's own scale; two
 *  bars on the same draw are the smaller t when both must hold and the larger when either may). */
function awardFit(f) {
  const R = E.norms.NBA_AWARD_RULES;
  const fld = awardFieldOf(f);
  const t = (z, n, g) => { const L = Math.log(Math.max(2, n)); const root = Math.sqrt(2 * L); const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root); return (z - g - loc) * root; };
  const P = x => Math.exp(-Math.exp(-x));
  const z = (val, row) => (val - row.mean) / row.sd;
  const rows = fld.rows.map(r => ({ x: r.x, v: r.v, zMvp: z(r.v.mvp, fld.mvp[r.pos]), zDef: z(r.v.defense, fld.defense[r.pos]) - r.x.defenceRep, zProd: z(r.v.production, fld.production[r.pos]), zFans: z(r.x.fanbase, fld.fans), zBench: z(r.v.benchPts, fld.bench), zJump: r.v.jump === null ? null : z(r.v.jump, fld.jump),
    posExtra: { C: 0, PF: 0, SF: 0.3 }[r.pos] ?? 0.6 }));
  const n = f.careers.length;
  const sum = fn => g => rows.reduce((a, r) => a + fn(r, g), 0) / n;
  const allNbaT = (r, gA) => (r.v.overBar ? Math.max(t(r.zMvp, 30, gA), t(r.zMvp, 15, gA), t(r.zMvp, 10, gA)) : -Infinity);
  return {
    field: fld,
    allNba: sum((r, g) => P(allNbaT(r, g))),
    mvp: gA => sum((r, g) => (r.v.overBar && r.x.madePlayoffs ? P(Math.min(t(r.zMvp, 30, gA), t(r.zMvp, 150, g))) : 0)),
    allDef: sum((r, g) => (r.v.overBar ? P(Math.max(t(r.zDef, 30, g), t(r.zDef, 15, g))) : 0)),
    roy: gT => sum((r, g) => (r.x.rookie ? P(Math.min(t(r.zProd, 9, gT), t(r.zProd, 45, g))) : 0)),
    allRookie: sum((r, g) => (r.x.rookie ? P(Math.max(t(r.zProd, 9, g), t(r.zProd, 4.5, g))) : 0)),
    dpoy: gD => sum((r, g) => (r.v.overBar ? P(Math.min(Math.max(t(r.zDef, 30, gD), t(r.zDef, 15, gD)), t(r.zDef, 150, g + r.posExtra))) : 0)),
    sixth: sum((r, g) => (r.x.bench ? P(t(r.zBench, 60, g)) : 0)),
    mip: sum((r, g) => (r.zJump !== null && r.v.overBar && !r.x.everAllNba ? P(t(r.zJump, 150, g)) : 0)),
    allStar: gA => sum((r, g) => { const share = r.x.year >= R.allStarFanShareFrom ? R.allStarFanShare : 1; let a = 0; for (const w of [-0.4, -0.2, 0, 0.2, 0.4]) a += P(Math.max(t(share * (r.zFans + w) + (1 - share) * r.zMvp, 15, g), t(r.zMvp, 6.25, g), allNbaT(r, gA))); return a / 5; }),
  };
}

const neutralScore = s => E.awards.nbaSeasonScore(E.norms ? E.norms.nbaEraNeutral(s.line, s.line.year) : s.line);
/** What the awards are judged against, measured the way the player lives it: every season of half a schedule
 *  or more in the fleet, bench years included, scored on the era neutral line. One population for every table. */
/* SENSE_FIELD_POP=starters measures the field on starter seasons only, to see what that population would give
   (tried in Round 1103: it does not concentrate the awards, careers with an MVP 18.3 against 18.5 percent). */
const FIELD_POP = process.env.SENSE_FIELD_POP || 'all';
function fieldOf(f) {
  return Object.fromEntries(POS.map(p => { const v = f.seasons.filter(s => s.pos === p && s.line.games >= 41 && (FIELD_POP === 'all' || s.role !== 'backup')).map(neutralScore); return [p, { mean: mean(v), sd: sdOf(v), n: v.length }]; }));
}
/** The three typed gates that are not league facts: the value on this line at the percentile each sat at on main. */
function reanchor(f, mainGates) {
  const q = f.seasons.filter(s => s.line.games >= 62);
  const withPrev = q.filter(s => s.prev && s.prev.games >= 40);
  const at = (arr, passing) => pctl(arr, 1 - passing / 100);
  return { rpg11: at(q.map(s => s.line.rpg), mainGates.rpg11), jump6: at(withPrev.map(s => s.line.ppg - s.prev.ppg), mainGates.jump6), ppg14: at(q.map(s => s.line.ppg), mainGates.ppg14) };
}
/** For the four awards the old block decides on the season score alone: the award's expected rate a career as
 *  a function of its grade, worked out exactly from every season's z (the chance a z beats the best of n is
 *  exp(-exp(-(z - grade - loc) * root)), careerAwards.ts bestOfN). The z is read against THIS fleet's own field,
 *  so one run gives the field rows and the grades that hold main's rates on those rows. */
function gradeFit(f) {
  const fld = fieldOf(f);
  const beats = (z, n, g) => { const L = Math.log(Math.max(2, n)); const root = Math.sqrt(2 * L); const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root); return Math.exp(-Math.exp(-(z - g - loc) * root)); };
  const S = f.seasons.map(s => ({ i: s.i, z: (neutralScore(s) - fld[s.pos].mean) / fld[s.pos].sd, games: s.line.games, won: s.line.teamResult === 'WON THE NBA FINALS', rookie: s.n === 0, anchor: ARCH[s.arch].rebounding >= 1.3 && s.line.rpg >= DPOY_GATE }));
  const q = S.filter(s => s.games >= 62);
  const champs = S.filter(s => s.won);
  const rate = (rows, n) => g => rows.reduce((t, s) => t + beats(s.z, n, g), 0) / f.careers.length;
  /* The share of careers that win it at least once, at a grade: one minus the product of the season misses. */
  const ever = (rows, n) => g => { const miss = new Map(); for (const s of rows) miss.set(s.i, (miss.get(s.i) ?? 1) * (1 - beats(s.z, n, g))); let t = 0; for (const m of miss.values()) t += 1 - m; return (100 * t) / f.careers.length; };
  return { 'MVP': rate(q, 150), 'All-NBA': rate(q, 10), 'All-Defensive Team': rate(q, 15), 'Finals MVP': rate(champs, 7), everMvp: ever(q, 150), everAllNba: ever(q, 10),
    'Rookie of the Year': rate(S.filter(s => s.rookie), 45), 'Defensive Player of the Year': rate(q.filter(s => s.anchor), 150) };
}
/* The Defensive Player gate as the engine applies it, read off the source so the fit follows the constant. */
const dpoyGate = srcOf('src/lib/nbaMyCareer.ts').match(/^const NBA_DPOY_RPG_GATE = ([0-9.]+);$/m);
const DPOY_GATE = dpoyGate ? Number(dpoyGate[1]) : 11;
/** The grade at which the five seed mean of `rates` equals `target` (the rate falls as the grade rises). */
function solveGrade(rates, target) {
  let lo = -4; let hi = 4;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mean(rates.map(r => r(mid))) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** The committed field row for a position, read back through the engine's own z. */
function committedField(pos) {
  const z0 = E.awards.nbaFieldZ(pos, 0); const z1 = E.awards.nbaFieldZ(pos, 1);
  const sd = 1 / (z1 - z0);
  return { mean: -z0 * sd, sd };
}

/** R's unit checks (Round 1112): the rival's season is the player's own line function, on exactly one draw of
 *  the season's stream. The replay builds the keyed stream the way nbaRivalSeason does (his name, the year, the
 *  draw): a round that changes that key changes it here too, on purpose. */
function rivalUnit() {
  if (typeof nba.nbaRivalSeason !== 'function' || typeof nba.nbaRivalArchetype !== 'function') { exact('R', false, 'nbaRivalSeason and nbaRivalArchetype are not exported by nbaMyCareer.ts'); return; }
  const rnd = mulberry32(1112);
  let n = 0; let drawsOk = true; let replayOk = true; let kindOk = true; let pureOk = true;
  const kinds = new Set();
  for (let k = 0; k < 400; k++) {
    const pos = POS[k % 5];
    const r = { name: `Rival ${k % 8}`, pos, team: 'BOS', ovr: 66 + (k % 30), pot: 95, age: 20 + (k % 15), rings: 0, hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0 };
    const form = r.ovr + (rnd() - 0.5) * 12; const year = k % 4 === 3 ? 2003 + (k % 9) : 2026 + (k % 9); const played = k % 7; const u = rnd();
    const frozen = JSON.stringify(r);
    let draws = 0;
    const out = nba.nbaRivalSeason(year, played)(r, form, () => { draws++; return u; });
    if (draws !== 1) drawsOk = false;
    const again = nba.nbaRivalSeason(year, played)(r, form, () => u);
    if (JSON.stringify(out) !== JSON.stringify(again) || JSON.stringify(r) !== frozen) pureOk = false;
    const kind = nba.nbaRivalArchetype(r);
    if (!nba.NBA_ARCHETYPES[pos].some(a => a.id === kind.id) || nba.nbaRivalArchetype({ ...r, ovr: 99, age: 35 }).id !== kind.id) kindOk = false;
    kinds.add(kind.id);
    const stat = nba.nbaStatLineFor({ form, pos, archetype: kind, role: 'starter', seasonsPlayed: played, year }, E.keyedRng(`nba-rival|${r.name}|${year}|${u}`));
    if (out.line !== E.nbaStatLine({ ...stat, teamResult: '' }) || out.score !== E.awards.nbaSeasonScore(stat) || out.year !== year) replayOk = false;
    n++;
  }
  exact('R', drawsOk, `the rival's season takes exactly one draw of the season's stream, the one his line took before Round 1112 (${n} seasons)`);
  exact('R', replayOk, `the rival's line is nbaStatLineFor's own, on his form, a starter of his own kind, printed by the player's printer and scored by the one season score (${n} seasons replayed)`);
  exact('R', pureOk, 'the same rival, form, year and draw give the same season, and the rival is left untouched');
  exact('R', kindOk && kinds.size >= RIVAL_KINDS_FLOOR, `a rival's kind is one of his position's own and does not move with his rating or age (${kinds.size} of 15 kinds met by 8 names at 5 positions, floor ${RIVAL_KINDS_FLOOR})`);
}

/* ------------------------------------------------------------------ */
/* Section A's numbers: the line against the real league               */
/* ------------------------------------------------------------------ */
const ARCH = Object.fromEntries(POS.flatMap(p => nba.NBA_ARCHETYPES[p].map(a => [a.id, a])));
const STATS = [['mpg', 'mpg'], ['pts', 'ppg'], ['reb', 'rpg'], ['ast', 'apg'], ['stl', 'spg'], ['blk', 'bpg']];
const median = a => pctl(a, 0.5);
/** The form simNbaSeason gave a recorded season, its swing drawn again from the same law on the harness's own
 *  stream (the engine keeps the swing to itself; the distribution is what a fit needs, not the pairing). */
const formOf = (s, rnd) => s.ovr + (s.morale - 60) / 12 + (s.tq - 78) / 8 + E.seasonSwing(rnd, s.age);

/** One seed's section A numbers. Modern careers only. When the engine does not write the new line yet (step 3b)
 *  every season is REPLAYED through nbaStatLineFor from what the engine knew going in; once it does, the saved
 *  line is read. The 2003 arm is always a replay of the same modern seasons with the year set to 2003. */
function lineStats(f, seed) {
  const rnd = mulberry32(seed * 9973 + 5);
  const live = f.seasons.some(s => nba.isNbaNewLine(s.line));
  const rows = f.seasons.filter(s => s.era === 'now').map(s => {
    const input = { form: formOf(s, rnd), pos: s.pos, archetype: ARCH[s.arch], role: s.role, seasonsPlayed: s.n };
    const replay = nba.nbaStatLineFor({ ...input, year: 2026 }, rnd);
    return { pos: s.pos, arch: s.arch, ovr: s.ovr, role: s.role, n: s.n, games: s.line.games, now: live ? s.line : replay, old: nba.nbaStatLineFor({ ...input, year: 2003 }, rnd) };
  });
  const starters = rows.filter(r => r.role !== 'backup' && r.games >= 58);
  const out = { live, rows: rows.length, starters: starters.length, med: { now: {}, y2004: {} }, n: {}, p99: {}, bands: {} };
  for (const p of POS) {
    const mine = starters.filter(r => r.pos === p);
    out.n[p] = mine.length;
    out.med.now[p] = Object.fromEntries(STATS.map(([k, key]) => [k, median(mine.map(r => r.now[key]))]));
    out.med.y2004[p] = Object.fromEntries(STATS.map(([k, key]) => [k, median(mine.map(r => r.old[key]))]));
    out.bands[p] = ['72-75', '76-79', '80-83', '84-87', '88-91', '92-95'].map(b => { const v = mine.filter(r => band(r.ovr) === b); return { b, n: v.length, pts: mean(v.map(r => r.now.ppg)), reb: mean(v.map(r => r.now.rpg)), ast: mean(v.map(r => r.now.apg)), mpg: mean(v.map(r => r.now.mpg ?? 0)) }; });
  }
  for (const [k, key] of [['pts', 'ppg'], ['reb', 'rpg'], ['ast', 'apg']]) out.p99[k] = pctl(starters.map(r => r.now[key]), 0.99);
  const rook = rows.filter(r => r.n === 0 && r.games >= 58 && r.ovr >= 75 && r.ovr <= 79);
  out.rookies = { n: rook.length, ppg: mean(rook.map(r => r.now.ppg)), starters: mean(rook.filter(r => r.role !== 'backup').map(r => r.now.ppg)), bench: mean(rook.filter(r => r.role === 'backup').map(r => r.now.ppg)) };
  const wings = starters.filter(r => r.pos === 'SG' || r.pos === 'SF');
  out.wing8 = { n: wings.length, share: share(wings.filter(r => r.now.apg >= 8).length, wings.length) };
  const bench = rows.filter(r => r.role === 'backup' && r.games >= 58);
  out.bench = { n: bench.length, ppg: mean(bench.map(r => r.now.ppg)), mpg: mean(bench.map(r => r.now.mpg ?? 0)), ratio: mean(bench.map(r => r.now.ppg)) / mean(starters.map(r => r.now.ppg)) };
  out.thirty = share(starters.filter(r => r.now.ppg >= 30).length, starters.length);
  out.tenAst = share(starters.filter(r => r.now.apg >= 10).length, starters.length);
  out.tripleDouble = rows.filter(r => r.now.ppg >= 10 && r.now.rpg >= 10 && r.now.apg >= 10).length;
  out.decimals = { n: rows.length, oneDecimal: rows.every(r => Math.abs(r.now.ppg * 10 - Math.round(r.now.ppg * 10)) < 1e-9), nonZero: share(rows.filter(r => Math.round(r.now.ppg * 10) % 10 !== 0).length, rows.length) };
  out.allMed = Object.fromEntries(POS.map(p => { const v = rows.filter(r => r.pos === p && r.games >= 41); return [p, [r1(median(v.map(r => r.now.ppg))), r1(median(v.map(r => r.now.rpg))), r1(median(v.map(r => r.now.apg)))]]; }));
  return out;
}

/** The elite sweep scripts/simCareerParity.mjs runs for its badge check (rating 93, ceiling 99, a 90 club), here
 *  for one thing: can anyone still reach 10, 10 and 10. Returns triple double seasons over `n` careers. */
function eliteTripleDoubles(seed, n) {
  const rnd = mulberry32(seed * 31337 + 7);
  Math.random = rnd;
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const pos = POS[i % 5];
    const c = nba.startNbaCareer(`Elite ${i}`, pos, nba.NBA_ARCHETYPES[pos][i % 3], rnd, null);
    c.ovr = 93; c.pot = 99;
    let guard = 0;
    while (guard++ < 30) {
      const { line } = nba.simNbaSeason(c, 90, rnd);
      if (line.ppg >= 10 && line.rpg >= 10 && line.apg >= 10) hits++;
      nba.nbaProgress(c, rnd);
      if (nba.nbaShouldRetire(c)) break;
    }
  }
  return hits;
}

/** B9's fleet: `n` careers on one seed in the board's own order and on a stream of their own (the judged fleet
 *  above is not touched). After every season the summer deck is built exactly as the game builds it
 *  (nbaEventDeck, after nbaProgress) and read for the snub card before a card is drawn and answered. */
const SNUB_CARD = 'nbaB_allStarSnub';
function snubDecks(seed, n) {
  const rnd = mulberry32(seed * 15485863 + 11);
  Math.random = rnd;
  const out = { summers: 0, dealt: 0, dealtHonoured: 0, gateOnly: 0, gateOnlyAllStar: 0 };
  for (let i = 0; i < n; i++) {
    const pos = POS[i % 5];
    const c = nba.startNbaCareer(`Snub ${i}`, pos, nba.NBA_ARCHETYPES[pos][i % 3], rnd, null, i % 4 === 3 ? 'y2004' : undefined);
    let tq = nba.nbaRollTeamQuality(null, rnd);
    nba.nbaAssignRole(c, tq, rnd);
    let guard = 0; let done = false;
    while (!done && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        nba.nbaCampBattle(c, tq, rnd);
        nba.simNbaSeason(c, tq, rnd);
      }
      nba.nbaProgress(c, rnd);
      const last = c.seasons[c.seasons.length - 1];
      const has = nba.nbaEventDeck(c, rnd).some(e => e.id === SNUB_CARD);
      out.summers++;
      if (has) { out.dealt++; if (last.awards.length > 0) out.dealtHonoured++; }
      /* Everything the card asks for but the gate: three seasons in, rated 80, never answered before. */
      if (c.seasons.length >= 3 && c.ovr >= 80 && !(c.lifeFlags?.nb_snub) && last.awards.length > 0) {
        out.gateOnly++;
        if (last.awards.includes('All-Star')) out.gateOnlyAllStar++;
      }
      const ev = nba.drawNbaEvent(c, rnd);
      if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
      tq = nba.nbaRollTeamQuality(tq, rnd);
      if (nba.nbaShouldRetire(c)) done = true;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The other three sports: a hash of every career, and two printed rates */
/* ------------------------------------------------------------------ */
const otherOf = ({ nfl, mlb, nhl }) => ({
  nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], arch: () => nfl.ARCHETYPES, start: (...a) => nfl.startCareer(...a), tq: (...a) => nfl.rollTeamQuality(...a), sim: (...a) => nfl.simSeason(...a), prog: (...a) => nfl.progress(...a), stop: c => nfl.shouldRetire(c) },
  mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], arch: () => mlb.MLB_ARCHETYPES, start: (...a) => mlb.startMlbCareer(...a), tq: (...a) => mlb.mlbRollTeamQuality(...a), sim: (...a) => mlb.simMlbSeason(...a), prog: (...a) => mlb.mlbProgress(...a), stop: c => mlb.mlbShouldRetire(c) },
  nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], arch: () => nhl.NHL_ARCHETYPES, start: (...a) => nhl.startNhlCareer(...a), tq: (...a) => nhl.nhlRollTeamQuality(...a), sim: (...a) => nhl.simNhlSeason(...a), prog: (...a) => nhl.nhlProgress(...a), stop: c => nhl.nhlShouldRetire(c) },
});
const OTHER = otherOf(E);
/** Each engine's own loop (the one scripts/simAwards.mjs walks), `per` careers on one seed. Returns the sha256
 *  of every season line and every numeric counter on the final save, and the season lines for the prints. */
function playOther(sport, seed, per, M = E) {
  const d = (M === E ? OTHER : otherOf(M))[sport];
  /* Round 1149, K: the sport's own descriptor, for what its Trophy Case tile counts. */
  const desc = { nfl: M.NFL_CAREER_SPORT, mlb: M.MLB_CAREER_SPORT, nhl: M.NHL_CAREER_SPORT }[sport];
  const careers = [];
  /* Round 1149, Q and S: one entry a season, the rivalry beat dealt in it (or none) beside the season's awards. */
  const beats = [];
  /* Round 1112: the rival's own trail (his line, his score, the tally, his rings, rating, age, whether he has
     retired) hashed apart from the player's, the season notes kept for section P, the near ties for section T. */
  const hr = crypto.createHash('sha256');
  const notes = [];
  const nearTies = [];
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729);
  Math.random = rnd;
  const h = crypto.createHash('sha256');
  const lines = [];
  for (let i = 0; i < per; i++) {
    const pos = d.pos[i % d.pos.length];
    const archs = d.arch()[pos];
    const c = d.start('Sim', pos, archs[i % archs.length], rnd, null);
    let tq = null; let guard = 0; let done = false;
    while (!done && guard++ < 30) {
      tq = d.tq(tq, rnd);
      /* The fleet never answers a rivalry card, so the pending one can be an older season's: a beat is this
         season's only when the object is new (the same rule the NBA fleet reads its beats by). */
      const pendingBefore = c.pendingRivalryEvent;
      const pre = { ovr: c.ovr, rivalOvr: c.rival?.ovr ?? null };
      const played = d.sim(c, tq, rnd);
      const beat = c.pendingRivalryEvent && c.pendingRivalryEvent !== pendingBefore ? c.pendingRivalryEvent : null;
      beats.push({ card: beat ? cardText(beat) : '', id: beat?.id ?? null, says: beat?.description ?? '', does: beat?.consequence ?? '', awards: played?.line?.awards ?? [], rival: c.rival?.name ?? '', ...pre });
      const r = c.rival;
      if (r) hr.update(JSON.stringify([r.lastLine, r.lastScore, r.myYears, r.hisYears, r.rings, r.ovr, r.age, r.retired]));
      notes.push(played?.notes ?? []);
      nearTies.push(...nearTieOf(played?.notes, r));
      d.prog(c, rnd);
      if (d.stop(c)) done = true;
    }
    const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
    h.update(JSON.stringify({ seasons: c.seasons, counters }));
    for (const s of c.seasons) lines.push(s);
    /* K: the tile (rings plus the honours rows) against the awards on the seasons; `named` is what the rows
       counted before Round 1149 gave each sport its row for the rest. */
    const rows = desc.honours(c); const rings = desc.ringsOf(c);
    careers.push({ pos, tile: M.honoursTotal({ rings, honours: rows }), rings, awardsHeld: c.seasons.reduce((n, s) => n + (s.awards ?? []).length, 0),
      named: rows.filter(r => r.label !== 'in other awards').reduce((n, r) => n + r.n, 0) });
  }
  return { hash: h.digest('hex'), lines, rivalHash: hr.digest('hex'), notes, nearTies, careers, beats };
}

/* ------------------------------------------------------------------ */
/* The baseline file                                                   */
/* ------------------------------------------------------------------ */
const readBaseline = () => (existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : {});
const gitHead = () => execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
function refuseDirty(what) {
  const dirty = execSync('git status --porcelain -- src scripts', { cwd: ROOT }).toString().split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !/scripts\/simNbaAwardsSense[.]mjs$/.test(l) && !/scripts\/data\/nbaAwardsSenseBaseline[.]json$/.test(l));
  if (dirty.length) { console.error(`${what}: refusing on a dirty tree:\n  ${dirty.join('\n  ')}`); process.exit(2); }
}
function writeBaseline(b) { writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 1) + '\n'); }

const RECORD_NBA = ARGS.includes('--record-nba-baseline');
const REBASE_AT = ARGS.indexOf('--rebase-nba');
const RECORD_OTHERS = ARGS.includes('--record-others');
if ((RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) && (CONTROL || TRY_SCALE)) { console.error('a control run or a trial scale never records'); process.exit(2); }
if ((RECORD_NBA || REBASE_AT >= 0) && !FULL) { console.error('the NBA baseline is recorded at full size only (6,000 careers a seed, five seeds)'); process.exit(2); }
if (RECORD_NBA && readBaseline().nba) { console.error('--record-nba-baseline: the nba key exists. It is written once. A round that moves it on purpose uses --rebase-nba "<reason>".'); process.exit(2); }
if (REBASE_AT >= 0 && !(ARGS[REBASE_AT + 1] || '').trim()) { console.error('--rebase-nba needs a reason in quotes'); process.exit(2); }
if (RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) refuseDirty('record');

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */
let checks = 0;
let failed = 0;
const failedSections = new Set();
/** An exact check: judged at every size. */
function exact(section, cond, msg) {
  checks++;
  if (cond) console.log(`  ok   [${section}] ${msg}`);
  else { failed++; failedSections.add(section); console.log(`  FAIL [${section}] ${msg}`); }
}
/** A band: judged at full size, or on a shrunk run that asks for it with SENSE_JUDGE=1 (how a control is run in
 *  minutes instead of half an hour: a rate held at main's is judged within three standard errors AT THE RUN'S
 *  OWN SIZE, so a shrunk run is a fair but blunter test, and the plain run at that same size has to be green
 *  first). Any other shrunk run prints it. */
const JUDGE = FULL || process.env.SENSE_JUDGE === '1';
function banded(section, cond, msg) {
  if (!JUDGE) { console.log(`  note [${section}] ${msg} (quick run, bands not judged)`); return; }
  exact(section, cond, msg);
}
const get = (o, key) => key.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
/** Held at a recorded rate: the mean over this run's seeds against the mean over the recorded five, within a
 *  FIXED width.
 *
 *  Why a mean of five and not "every seed inside main's lowest to highest": main's five seeds happened to land
 *  within 0.33 of each other on the Hall rate, where the plain sampling error of a share near 32 percent over
 *  6,000 careers is 0.6 a seed, so that band was narrower than the noise of the thing it measured and a healthy
 *  tree failed it on one seed in three (measured: seeds 1 and 2 of one unchanged tree came out at 31.2 and 29.2).
 *
 *  Why the width is typed and not worked out in the run: it used to be three standard errors with the seed to
 *  seed spread of the run being judged inside it, so a noisier run passed a wider gap, which is a test that
 *  gets easier the worse its data is. The widths below are what three standard errors came to at full size on
 *  the round's gate of 2026-10-08 (five seeds of 6,000 careers on each side, the error of a share by the
 *  binomial, of an award count by its measured sd over careers: 0.83 for MVPs where Poisson says 0.56, 2.37 for
 *  All-NBA, 2.45 for All-Defensive, 0.45 for Finals MVPs). A shrunk judged run widens each by the root of the
 *  size ratio, which is arithmetic and not that run's own noise. */
const HELD_TOL = {
  myShare: 0.59, inducted: 1.14, firstBallot: 1.09,
  'perCareer.MVP': 0.02, 'perCareer.All-NBA': 0.058, 'perCareer.All-Defensive Team': 0.06, 'perCareer.Finals MVP': 0.011,
  everMvp: 0.93, everAllNba: 1.19,
};
/* R: my share of the head to head years as Round 1112 shipped it, five full size seeds (see the header). */
const RIVAL_1112 = { myShare: [61.01, 60.83, 61.44, 61.06, 61.09] };
/* K: careers a full size seed must still find whose only awards are the lesser ones (see the header). */
const LESSER_ONLY_FLOOR = 230;
/* Q, Round 1149: the sports whose roster beat the round has taken off its coin so far. In those the cards must
   differ between the two trees; in the others every card must be the same. */
const Q_MOVED = { nfl: false, mlb: false, nhl: false };
/* K, Round 1149: the same floor for the other three careers, a seed of 500 (see the header). */
const OTHER_LESSER_ONLY_FLOOR = { nfl: 7, mlb: 7, nhl: 3 };
/* T: how many near tie notes of each kind a full size run must still find in each sport (see the header). */
const NEAR_TIE_FLOOR = 200;
/* R4: how often a full size seed must still deal the All-Star beat in each of its three cases (see the header). */
const BEAT306_FLOOR = { mine: 360, his: 80, both: 50 };
/* R: how many of the fifteen kinds eight names at five positions must reach (measured: see the header). */
const RIVAL_KINDS_FLOOR = 10;
const HELD_WIDEN = Math.sqrt(Math.max(1, (6000 * 5) / (CAREERS * SEEDS.length)));
function heldAtMain(section, base, per, key, label) {
  heldAt(section, base.seeds.map(s => get(s.m, key)), per.map(m => get(m, key)), label, key, "main's");
}
/** The same test against any five recorded seeds (main's, or the ones a round shipped). */
function heldAt(section, main, now, label, key, whose) {
  const m0 = mean(main); const m1 = mean(now);
  const tol = HELD_TOL[key] * HELD_WIDEN;
  banded(section, Number.isFinite(tol) && Math.abs(m1 - m0) <= tol, `${label}: mean ${r3(m1)} (${now.join(', ')}) against ${whose} ${r3(m0)} (${main.join(', ')}), ${r3(Math.abs(m1 - m0))} apart, allowed ${r3(tol)} (a fixed width${HELD_WIDEN > 1 ? `, widened ${HELD_WIDEN.toFixed(2)} times for a run of ${CAREERS} careers on ${SEEDS.length} seeds` : ''})`);
}

/* ------------------------------------------------------------------ */
/* Play                                                                */
/* ------------------------------------------------------------------ */
const t0 = Date.now();
console.log(`simNbaAwardsSense: ${CAREERS} careers a seed, seeds ${SEEDS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${TRY_SCALE ? `, TRIAL legacy scale ${TRY_SCALE}` : ''}${FULL ? '' : JUDGE ? ` (shrunk run, judged at its own size)` : ' (quick run, bands not judged)'}`);
const per = [];
const nbaNearTies = [];
const fleets = [];
const aStats = [];
const fields = [];
const anchors = [];
const fits = [];
const passFits = [];
const preBase = readBaseline();
const meanOfSeeds = key => (preBase.nba ? mean(preBase.nba.seeds.map(s => get(s.m, key))) : null);
const mainGates = preBase.nba ? { rpg11: meanOfSeeds('gates.rpg11'), jump6: meanOfSeeds('gates.jump6'), ppg14: meanOfSeeds('gates.ppg14') } : null;
const HAS_LINE = typeof nba.nbaStatLineFor === 'function';
for (const seed of SEEDS) {
  const f = playFleet(seed, CAREERS);
  const m = measure(f);
  per.push(m);
  nbaNearTies.push(f.nearTies);
  fleets.push(f.careers);
  if (HAS_LINE) aStats.push(lineStats(f, seed));
  fields.push(fieldOf(f));
  if (mainGates) anchors.push(reanchor(f, mainGates));
  fits.push(gradeFit(f));
  if (HAS_PASS()) passFits.push(awardFit(f));
  console.log(`  seed ${seed}: ${m.seasons} seasons, Hall ${m.inducted}% (first ballot ${m.firstBallot}%), MVPs ${m.perCareer.MVP} a career, All-NBA ${m.perCareer['All-NBA']}, my share ${m.myShare}%, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const others = {};
for (const sport of Object.keys(OTHER)) others[sport] = SEEDS.map(seed => playOther(sport, seed, OTHERS_PER));

/* ------------------------------------------------------------------ */
/* Record                                                              */
/* ------------------------------------------------------------------ */
if (RECORD_NBA || REBASE_AT >= 0) {
  const b = readBaseline();
  b.nba = { recordedOn: gitHead(), careers: CAREERS, seeds: SEEDS.map((seed, k) => ({ seed, m: per[k] })) };
  if (REBASE_AT >= 0) b.nba.rebased = { reason: ARGS[REBASE_AT + 1], commit: gitHead() };
  writeBaseline(b);
  console.log(`recorded the nba baseline on ${b.nba.recordedOn}`);
}
if (RECORD_OTHERS || (RECORD_NBA && !readBaseline().others)) {
  const b = readBaseline();
  b.others = { recordedOn: gitHead(), per: OTHERS_PER, seeds: SEEDS, hashes: Object.fromEntries(Object.keys(OTHER).map(s => [s, others[s].map(o => o.hash)])) };
  writeBaseline(b);
  console.log(`recorded the other sports' hashes on ${b.others.recordedOn}`);
}
const base = readBaseline();

/* ------------------------------------------------------------------ */
/* The table every run prints                                          */
/* ------------------------------------------------------------------ */
const row = (label, key) => console.log(`  ${label.padEnd(44)} ${per.map(m => String(get(m, key))).join(', ')}${base.nba ? `   | main ${base.nba.seeds.map(s => String(get(s.m, key))).join(', ')}` : ''}`);
console.log('\nThe numbers (this tree, seed by seed, then main):');
row('Hall of Fame inducted, percent', 'inducted'); row('first ballot, percent', 'firstBallot');
row('inducted, modern careers', 'inducted_now'); row('inducted, 2003-04 careers', 'inducted_y2004');
row('legacy score p50', 'scoreP50'); row('legacy score p90', 'scoreP90');
for (const a of AWARDS) row(`${a} a career`, `perCareer.${a}`);
row('careers with an MVP, percent', 'everMvp'); row('careers with an All-NBA, percent', 'everAllNba');
row('MVP seasons that missed the playoffs, percent', 'mvpMissedPlayoffs'); row('MVP seasons not All-NBA, percent', 'mvpNotAllNba'); row('MVP and Most Improved together, percent', 'mvpAlsoMip');
row('Rookie of the Year seasons', 'roySeasons'); row('of them on All-Rookie', 'royOnAllRookie'); row('All-Rookie in a first season', 'allRookieInFirstSeason');
row('my share of the head to head years', 'myShare'); row('verdict disagrees with the printed lines', 'rivalDisagree');
row('starter points / bench points / rookie starters', 'starterPpg'); row('  bench', 'benchPpg'); row('  rookie starters', 'rookieStarterPpg');
row('triple double seasons', 'tripleDouble'); row('seasons at 16 points or more, percent', 'ppg16share');
row('careers past 12,000 points, percent', 'career12k'); row('careers past 25,000 points, percent', 'career25k');
row('scoring and assists title together', 'bothTitles'); row('SG and SF starter seasons at 8 assists, percent', 'wing8ast');
for (const g of ['ppg28', 'apg10', 'rpg11', 'rpg125big', 'jump6', 'ppg14']) row(`gate ${g}, percent of qualified seasons`, `gates.${g}`);
for (const b of ['80-83', '88-91']) console.log(`  healthy starters rated ${b}: ${POS.map(p => `${p} ${per.map(m => m.starters[b][p].slice(0, 3).join('/')).join(' | ')}`).join('   ')}`);
console.log(`  All-Defensive a career by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].allDefByArch[a]}`).join(', ')}`);
console.log(`  my share by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].myShareByArch[a]}`).join(', ')}`);
console.log(`  the field as the fleet lives it (mean, sd): ${POS.map(p => `${p} ${per.map(m => m.field[p].join('/')).join(' | ')}`).join('   ')}`);

/* What a builder pastes: the field rows, the three re-anchored gates and the grades that hold main's rates. */
const fieldMean = Object.fromEntries(POS.map(p => [p, { mean: mean(fields.map(x => x[p].mean)), sd: mean(fields.map(x => x[p].sd)) }]));
console.log(`\nThe field, measured on the simNbaAwardsSense fleet (${SEEDS.length} seed mean, era neutral, half a schedule or more):`);
for (const p of POS) console.log(`    ${p}: { mean: ${fieldMean[p].mean.toFixed(1)}, sd: ${fieldMean[p].sd.toFixed(1)} },   // seeds: ${fields.map(x => `${x[p].mean.toFixed(1)}/${x[p].sd.toFixed(1)}`).join(' ')}`);
if (anchors.length) console.log(`The gates at main's percentile: rebounds for Defensive Player ${anchors.map(a => a.rpg11.toFixed(1)).join(', ')} (was 11, ${mainGates.rpg11.toFixed(2)}% pass); the jump for Most Improved ${anchors.map(a => a.jump6.toFixed(1)).join(', ')} (was 6, ${mainGates.jump6.toFixed(2)}%); points for Sixth Man ${anchors.map(a => a.ppg14.toFixed(1)).join(', ')} (was 14, ${mainGates.ppg14.toFixed(2)}%)`);
if (preBase.nba) {
  console.log('The grade that holds main\'s rate on this fleet\'s own field (worked out from every season\'s z, not drawn):');
  /* Since the one pass (nbaCareerAwards.ts) only Finals MVP is still decided on the season score alone. */
  for (const a of (HAS_PASS() ? ['Finals MVP'] : ['MVP', 'All-NBA', 'All-Defensive Team', 'Finals MVP', 'Rookie of the Year', 'Defensive Player of the Year'])) {
    const target = meanOfSeeds(`perCareer.${a}`);
    const g = solveGrade(fits.map(x => x[a]), target);
    const ever = a === 'MVP' ? `; careers with one at that grade ${mean(fits.map(x => x.everMvp(g))).toFixed(2)} percent (main ${meanOfSeeds('everMvp').toFixed(2)})` : a === 'All-NBA' ? `; careers with one at that grade ${mean(fits.map(x => x.everAllNba(g))).toFixed(2)} percent (main ${meanOfSeeds('everAllNba').toFixed(2)})` : '';
    console.log(`    ${a.padEnd(20)} main ${target.toFixed(3)} a career, grade ${g.toFixed(2)}${ever}`);
  }
}
/* What a builder pastes into nbaCareerAwards.ts: NBA_FIELD as this fleet lives it, and the grades that put each
   award on its target on those rows. */
const awardFieldMean = passFits.length ? (() => {
  const rowOf = pick => ({ mean: mean(passFits.map(x => pick(x.field).mean)), sd: mean(passFits.map(x => pick(x.field).sd)) });
  const byPos = key => Object.fromEntries(POS.map(p => [p, rowOf(fl => fl[key][p])]));
  return { mvp: byPos('mvp'), defense: byPos('defense'), production: byPos('production'), bench: rowOf(fl => fl.bench), jump: rowOf(fl => fl.jump), fans: rowOf(fl => fl.fans) };
})() : null;
if (awardFieldMean) {
  const pr = r => `[${r.mean.toFixed(2)}, ${r.sd.toFixed(2)}]`;
  console.log(`\nNBA_FIELD, measured on the simNbaAwardsSense fleet (${SEEDS.length} seed mean, era neutral, half a season or more):`);
  for (const key of ['mvp', 'defense', 'production']) console.log(`  ${key}: { ${POS.map(p => `${p}: ${pr(awardFieldMean[key][p])}`).join(', ')} },`);
  for (const key of ['bench', 'jump', 'fans']) console.log(`  ${key}: ${pr(awardFieldMean[key])},`);
  if (preBase.nba) {
    const G = E.nbaAwards.NBA_AWARD_GRADES;
    const tAllNba = meanOfSeeds('perCareer.All-NBA'); const tMvp = meanOfSeeds('perCareer.MVP'); const tDef = meanOfSeeds('perCareer.All-Defensive Team'); const tRoy = meanOfSeeds('perCareer.Rookie of the Year');
    const gA = solveGrade(passFits.map(x => x.allNba), tAllNba);
    const gM = solveGrade(passFits.map(x => x.mvp(gA)), tMvp);
    const gD = solveGrade(passFits.map(x => x.allDef), tDef);
    const gS = solveGrade(passFits.map(x => x.allStar(gA)), 1.6 * tAllNba);
    const gT = solveGrade(passFits.map(x => x.allRookie), R_ALL_ROOKIE_TARGET);
    const gR = solveGrade(passFits.map(x => x.roy(gT)), 2 * tRoy);
    console.log('The grade that puts each award on its target, on this fleet\'s own field (worked out, not drawn; committed grade in brackets):');
    console.log(`    All-NBA        main ${tAllNba.toFixed(3)} a career: ${gA.toFixed(2)} [${G.allNba}]`);
    console.log(`    MVP            main ${tMvp.toFixed(3)} a career, at that All-NBA grade: ${gM.toFixed(2)} [${G.mvp}]`);
    console.log(`    All-Defensive  main ${tDef.toFixed(3)} a career: ${gD.toFixed(2)} [${G.allDef}]`);
    console.log(`    All-Star       1.6 times main's All-NBA (24 picks against 15), ${(1.6 * tAllNba).toFixed(3)} a career: ${gS.toFixed(2)} [${G.allStar}]`);
    console.log(`    All-Rookie     the real class, 10 picks of 45 rookies who play, ${R_ALL_ROOKIE_TARGET.toFixed(3)} a career: ${gT.toFixed(2)} [${G.allRookie}]`);
    console.log(`    Rookie of the Year  twice main's, ${(2 * tRoy).toFixed(3)} a career, at that All-Rookie grade: ${gR.toFixed(2)} [${G.rookie}]; on one grade for the whole class All-Rookie would be ${mean(passFits.map(x => x.allRookie(gR))).toFixed(3)} a career`);
    const tDpoy = meanOfSeeds('perCareer.Defensive Player of the Year'); const tSixth = meanOfSeeds('perCareer.Sixth Man of the Year'); const tMip = meanOfSeeds('perCareer.Most Improved Player');
    console.log(`    Defensive Player  main ${tDpoy.toFixed(3)} a career, at that All-Defensive grade: ${solveGrade(passFits.map(x => x.dpoy(gD)), tDpoy).toFixed(2)} [${G.dpoy}]`);
    console.log(`    Sixth Man      main ${tSixth.toFixed(3)} a career: ${solveGrade(passFits.map(x => x.sixth), tSixth).toFixed(2)} [${G.sixth}]`);
    console.log(`    Most Improved  main ${tMip.toFixed(3)} a career: ${solveGrade(passFits.map(x => x.mip), tMip).toFixed(2)} [${G.mip}]`);
    console.log(`    at the committed grades the fit expects: All-NBA ${mean(passFits.map(x => x.allNba(G.allNba))).toFixed(3)}, MVP ${mean(passFits.map(x => x.mvp(G.allNba)(G.mvp))).toFixed(3)}, All-Defensive ${mean(passFits.map(x => x.allDef(G.allDef))).toFixed(3)}, All-Star ${mean(passFits.map(x => x.allStar(G.allNba)(G.allStar))).toFixed(3)}, Rookie of the Year ${mean(passFits.map(x => x.roy(G.allRookie)(G.rookie))).toFixed(3)}, All-Rookie ${mean(passFits.map(x => x.allRookie(G.allRookie))).toFixed(3)}`);
  }
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */
console.log('\nSections:');

/* E, the field is the engine's: the committed rows are what the fleet lives. */
if (typeof E.awards.nbaFieldZ === 'function') {
  for (const p of POS) {
    const c = committedField(p);
    const meanOff = fields.map(x => Math.abs(x[p].mean - c.mean) / c.sd);
    const sdOff = fields.map(x => Math.abs(x[p].sd / c.sd - 1));
    banded('E', meanOff.every(x => x <= E_MEAN_TOL) && sdOff.every(x => x <= E_SD_TOL), `${p}: the committed field ${c.mean.toFixed(1)}/${c.sd.toFixed(1)} against the fleet ${fields.map(x => `${x[p].mean.toFixed(1)}/${x[p].sd.toFixed(1)}`).join(' ')} (mean off by at most ${Math.max(...meanOff).toFixed(3)} sd, limit ${E_MEAN_TOL}; sd off by at most ${(Math.max(...sdOff) * 100).toFixed(1)} percent, limit ${E_SD_TOL * 100})`);
  }
}

/* A, the line against the norms. */
if (HAS_LINE) {
  const N = E.norms;
  const live = aStats[0].live;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  console.log(`  A reads ${live ? 'the lines the engine saved' : 'a REPLAY of the recorded seasons through nbaStatLineFor (the engine does not call it yet)'}; healthy starters of modern careers: ${aStats.map(a => a.starters).join(', ')}`);
  const normBand = (era, pos, k) => { const q = N.NBA_STARTER_NORMS[era][pos][k]; const pad = N.NBA_NORMS_PARTIAL.includes(`${era}.${pos}.${k}`) ? 0.15 * q.p50 : 0; return { lo: q.p25 - pad, hi: q.p75 + pad, q }; };
  /* A1: the median healthy starter sits inside the real starters' quartiles, stat by stat, position by position. */
  for (const era of ['now', 'y2004']) {
    let outside = 0; let cells = 0; const thin = [];
    for (const p of POS) {
      const parts = [];
      for (const [k] of STATS) {
        const b = normBand(era, p, k);
        const meds = aStats.map(a => a.med[era][p][k]);
        const m = mean(meds);
        const inside = meds.every(x => x >= b.lo - 1e-9 && x <= b.hi + 1e-9);
        const edge = Math.min(m - b.lo, b.hi - m) / (b.hi - b.lo);
        cells++; if (!inside) outside++;
        if (inside && edge < 0.1) thin.push(`${p} ${k} ${(edge * 100).toFixed(0)}%`);
        parts.push(`${k} ${f1(m)} in ${f1(b.lo)}..${f1(b.hi)} (${inside ? `${(edge * 100).toFixed(0)}% in` : 'OUT'})`);
        if (era === 'now') {
          if (aStats.some(a => a.n[p] < 1000) && FULL) exact('A1', false, `${p}: fewer than 1,000 healthy starter seasons a seed (${aStats.map(a => a.n[p]).join(', ')}): the check is empty`);
          banded('A1', inside, `${p} ${k}: median ${meds.map(f1).join(', ')} inside the real starters' ${f1(b.lo)} to ${f1(b.hi)} (p25 ${b.q.p25}, p75 ${b.q.p75}${b.lo < b.q.p25 ? ', partial key, 15 percent of the median wider' : ''}); ${(edge * 100).toFixed(0)} percent of the band from the nearer edge`);
        }
      }
      if (era === 'y2004') console.log(`  note [A1 2003, printed] ${p}: ${parts.join('; ')}`);
    }
    if (era === 'y2004') console.log(`  note [A1 2003, printed] ${outside} of ${cells} cells outside the 2003-04 quartiles (not judged: the lead sets how many may miss)`);
    else if (thin.length) console.log(`  note [A1] under a tenth of the band from an edge (refit, do not accept): ${thin.join(', ')}`);
  }
  /* The unit check that IS judged for 2003: the same input drawn 2,000 times at each year gives the league rows' ratio. */
  {
    const rnd = mulberry32(77);
    const input = { form: 84, pos: 'SF', archetype: ARCH.pointforward, role: 'starter', seasonsPlayed: 5 };
    const draw = year => { const acc = { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0 }; for (let i = 0; i < 2000; i++) { const l = nba.nbaStatLineFor({ ...input, year }, rnd); for (const k of Object.keys(acc)) acc[k] += l[k]; } return acc; };
    const then = draw(2003); const today = draw(2026);
    const rows = [['ppg', 'pts'], ['rpg', 'reb'], ['apg', 'ast'], ['spg', 'stl'], ['bpg', 'blk']].map(([k, n]) => ({ k, got: then[k] / today[k], want: N.NBA_LEAGUE_PER_GAME.y2004[n] / N.NBA_LEAGUE_PER_GAME.now[n] }));
    exact('A1', rows.every(r => Math.abs(r.got / r.want - 1) <= 0.02), `the 2003 line over the 2026 line is the league rows' ratio within 2 percent: ${rows.map(r => `${r.k} ${r.got.toFixed(3)} against ${r.want.toFixed(3)}`).join(', ')}`);
  }
  /* A2: the p99 starter season (never the max) is at or under the leaders' mean plus one sd. */
  for (const k of ['pts', 'reb', 'ast']) {
    const bar = N.nbaLeaderBar(k, 2026);
    const v = aStats.map(a => a.p99[k]);
    /* Judged on the mean over the run's seeds: a p99 is carried by a few dozen elite careers, so one seed of a
       shrunk fleet moves it by a point (32.6 to 34.5 on four fleets of 1,500) where five full seeds agree to 0.3. */
    banded('A2', mean(v) <= bar.mean + bar.sd, `the p99 starter season in ${k}: ${v.map(f1).join(', ')}, mean ${mean(v).toFixed(2)}, at or under the league leaders' mean plus one sd (${f1(bar.mean)} + ${f1(bar.sd)})`);
  }
  /* A3: the promises. */
  banded('A3', aStats.every(a => a.rookies.ppg >= 7.5 && a.rookies.ppg <= 11.5), `rookies rated 75 to 79 average ${aStats.map(a => f1(a.rookies.ppg)).join(', ')} points (7.5 to 11.5); starters ${aStats.map(a => f1(a.rookies.starters)).join(', ')}, bench ${aStats.map(a => f1(a.rookies.bench)).join(', ')}; ${aStats.map(a => a.rookies.n).join(', ')} seasons`);
  banded('A3', aStats.every(a => a.wing8.share < 2), `SG and SF starter seasons at 8 assists or more: ${aStats.map(a => a.wing8.share.toFixed(2)).join(', ')} percent of theirs (under 2; main about 19)`);
  banded('A3', aStats.every(a => a.bench.ratio >= 0.36 && a.bench.ratio <= 0.56), `bench seasons score ${aStats.map(a => (a.bench.ratio * 100).toFixed(0)).join(', ')} percent of starters' (36 to 56): ${aStats.map(a => f1(a.bench.ppg)).join(', ')} points in ${aStats.map(a => f1(a.bench.mpg)).join(', ')} minutes`);
  exact('A3', aStats.every(a => a.decimals.oneDecimal && a.decimals.nonZero >= 10), `every new season's points have one decimal, and ${aStats.map(a => a.decimals.nonZero.toFixed(0)).join(', ')} percent of them a non zero one (at least 10)`);
  /* A count this small is judged on the run's total, never seed by seed. */
  if (live) { const both = per.reduce((t, m) => t + m.bothTitles, 0); const all = per.reduce((t, m) => t + m.careers, 0); banded('A3', both * 250 < all, `seasons holding both the scoring and the assists title: ${per.map(m => m.bothTitles).join(', ')}, ${both} in ${all} careers (under 1 in 250 careers; main ${base.nba ? base.nba.seeds.map(s => s.m.bothTitles).join(', ') : '?'}, 1 in 13)`); }
  console.log(`  note [A3] 30 points a game: ${aStats.map(a => a.thirty.toFixed(2)).join(', ')} percent of starter seasons; 10 assists: ${aStats.map(a => a.tenAst.toFixed(2)).join(', ')}; triple double seasons in the fleet: ${aStats.map(a => a.tripleDouble).join(', ')}`);
  /* The triple double badge has one man who can reach it on this line, a Point Forward at the very top. Seen
     here, in the elite sweep scripts/simCareerParity.mjs runs for its badge check (rating 93, ceiling 99, a 90
     club, thirty careers), so a long detached harness is not where it is found out. */
  if (live) {
    const elite = SEEDS.map(seed => eliteTripleDoubles(seed, 30));
    const found = elite.reduce((t, n) => t + n, 0);
    banded('A3', found >= ELITE_TD_FLOOR * SEEDS.length, `triple double seasons in thirty elite careers a seed: ${elite.join(', ')}, ${found} in all (at least ${ELITE_TD_FLOOR} a seed on average, so the badge stays reachable)`);
  }
  console.log(`  note [A] medians, every role, half a season or more (points/rebounds/assists): ${POS.map(p => `${p} ${aStats[0].allMed[p].join('/')}`).join('  ')}`);
  /* A4: points rise with the rating at every position (bands of 200 seasons or more). */
  for (const p of POS) {
    const rising = aStats.every(a => { const b = a.bands[p].filter(x => x.n >= 200); return b.every((x, i) => i === 0 || x.pts > b[i - 1].pts); });
    exact('A4', rising, `${p}: mean points rise with every rating band (seed ${SEEDS[0]}: ${aStats[0].bands[p].filter(x => x.n >= 200).map(x => `${x.b} ${f1(x.pts)}/${f1(x.reb)}/${f1(x.ast)} in ${f1(x.mpg)}`).join(', ')})`);
  }
  /* A5: the function is pure and always draws the same number of times. */
  {
    const counted = input => { let n = 0; const r = mulberry32(5); nba.nbaStatLineFor(input, () => { n++; return r(); }); return n; };
    const base5 = { form: 82, pos: 'C', archetype: ARCH.anchor, role: 'starter', seasonsPlayed: 4, year: 2026 };
    const cases = [base5, { ...base5, role: 'backup' }, { ...base5, seasonsPlayed: 0 }, { ...base5, playoffs: true }];
    exact('A5', cases.every(c => counted(c) === nba.NBA_LINE_DRAWS), `nbaStatLineFor draws exactly ${nba.NBA_LINE_DRAWS} times for a starter, a backup, a rookie and a playoff line (${cases.map(counted).join(', ')})`);
    const frozen = JSON.stringify(base5);
    const one = nba.nbaStatLineFor(base5, mulberry32(9)); const two = nba.nbaStatLineFor(base5, mulberry32(9));
    exact('A5', JSON.stringify(one) === JSON.stringify(two) && JSON.stringify(base5) === frozen, 'the same input and seed give the same line, and the input is left untouched');
  }
}

/* The award rates held at main's: section B6a while the old block decided them, B6 since the one pass. */
const B6 = HAS_PASS() ? 'B6' : 'B6a';
if (!base.nba) exact('baseline', false, 'scripts/data/nbaAwardsSenseBaseline.json has no nba key: record it once with --record-nba-baseline');
else {
  /* R, the rival (Round 1112). He plays his season on my line, so my share of the head to head years is no
     longer main's by construction: it is held at what this round measured (RIVAL_1112), main's printed beside
     it. The verdict is exact: it never says what the two printed lines do not. */
  heldAt('R', RIVAL_1112.myShare, per.map(m => m.myShare), `my share of the head to head years, percent (main, on the old rival line: ${base.nba.seeds.map(x => x.m.myShare).join(', ')})`, 'myShare', "Round 1112's");
  exact('R', per.every(m => m.rivalJudged > 0 && m.rivalUnread === 0 && m.rivalOffShape === 0), `every rival line reads back off its printed text and is in the player's own shape, three parts at one decimal (judged years ${per.map(m => m.rivalJudged).join(', ')}; unreadable ${per.map(m => m.rivalUnread).join(', ')}; off shape ${per.map(m => m.rivalOffShape).join(', ')})`);
  exact('R', per.every(m => m.rivalDisagreeN === 0), `the verdict never disagrees with the two printed lines scored the same way: ${per.map(m => m.rivalDisagreeN).join(', ')} of ${per.map(m => m.rivalJudged).join(', ')} judged years`);
  rivalUnit();
  /* R4: the All-Star beat says only what the two seasons support, and is never dealt when neither made it. */
  exact('R', per.every(m => m.beat306.lies === 0 && m.beat306.neither === 0), `the All-Star beat never contradicts the two seasons: dealt ${per.map(m => m.beat306.dealt).join(', ')} times (only me ${per.map(m => m.beat306.mine).join(', ')}; only him ${per.map(m => m.beat306.his).join(', ')}; both ${per.map(m => m.beat306.both).join(', ')}; neither ${per.map(m => m.beat306.neither).join(', ')}), cards that say or promise something else ${per.map(m => m.beat306.lies).join(', ')}`);
  banded('R', per.every(m => m.beat306.mine >= BEAT306_FLOOR.mine && m.beat306.his >= BEAT306_FLOOR.his && m.beat306.both >= BEAT306_FLOOR.both), `the All-Star beat is still dealt in all three of its cases on every seed (floors: only me ${BEAT306_FLOOR.mine}, only him ${BEAT306_FLOOR.his}, both ${BEAT306_FLOOR.both})`);
  console.log(`  note [R] All-Star seasons, percent of judged years: mine ${per.map(m => m.allStarSeasons.mine).join(', ')}; the rival's ${per.map(m => m.allStarSeasons.his).join(', ')}. Rivalry beats dealt a seed: ${per.map(m => m.beatsDealt).join(', ')}`);
  /* H, the Hall: inducted and first ballot stay where main had them. */
  heldAtMain('H', base.nba, per, 'inducted', 'Hall of Fame inducted, percent');
  heldAtMain('H', base.nba, per, 'firstBallot', 'first ballot, percent');
  /* H, the books follow the line. A career with no season on the new line is read on the marks Round 1051
     measured on the old one: the stamped careers of the frozen fixture (old line careers retired on calibration
     2, which is what a career retired between Round 1051 and this round is) score what they scored the day
     they were recorded. A career between the two lines is read on marks between the two books, by its share
     of games on the new line. The old line numbers below are typed on purpose, never read off the engine. */
  {
    const fx = JSON.parse(readFileSync(path.join(ROOT, 'src', 'test', 'fixtures', 'nbaOldSaves1103.json'), 'utf8'));
    const stamped = fx.entries.filter(e => e.save.hallCal === 2 && e.save.seasons.every(x => typeof x.mpg !== 'number'));
    const off = stamped.filter(e => { const r = nba.nbaLegacyOf(JSON.parse(JSON.stringify(e.save))); return r.score !== e.read.legacy.score || (r.standout?.stat ?? null) !== (e.read.legacy.standout?.stat ?? null); });
    exact('H', stamped.length >= 8 && off.length === 0, `old line careers stamped on calibration 2 in the frozen fixture: ${stamped.length} (floor 8); read differently today: ${off.length} (${off.map(e => e.key).join(', ') || 'none'}); ${stamped.filter(e => e.read.legacy.standout).length} of them were paid a standout the day they were recorded`);
    const OLD_PG_PTS = [37400, 45300]; const OLD_C_AST = [7490, 8930];
    const now = nba.NBA_LEGACY_WEIGHTS[2].positions;
    const career = (pos, oldGames, newGames) => ({ pos, seasons: [{ games: oldGames, ppg: 10, rpg: 4, apg: 3 }, { games: newGames, ppg: 10, rpg: 4, apg: 3, mpg: 30 }].filter(x => x.games > 0) });
    const markOf = (pos, stat, o, n) => nba.nbaLegacyTableFor(career(pos, o, n)).positions[pos].standout.find(x => x.stat === stat);
    const nowPg = now.PG.standout.find(x => x.stat === 'pts');
    const allOld = markOf('PG', 'pts', 82, 0); const half = markOf('PG', 'pts', 82, 82);
    exact('H', nba.nbaLegacyTableFor(career('PG', 0, 82)) === nba.NBA_LEGACY_WEIGHTS[2] && allOld?.from === OLD_PG_PTS[0] && allOld?.to === OLD_PG_PTS[1]
      && half?.from === (OLD_PG_PTS[0] + nowPg.from) / 2 && half?.to === (OLD_PG_PTS[1] + nowPg.to) / 2 && nowPg.from < OLD_PG_PTS[0],
      `a point guard's points mark: ${allOld?.from} to ${allOld?.to} with no game on the new line (Round 1051's ${OLD_PG_PTS.join(' to ')}), ${half?.from} to ${half?.to} at half and half (the midpoint), ${nowPg.from} to ${nowPg.to} with every game on it (the ledger's table itself)`);
    const cOld = markOf('C', 'ast', 82, 0); const cHalf = markOf('C', 'ast', 82, 82);
    exact('H', !now.C.standout.some(x => x.stat === 'ast') && cOld?.from === OLD_C_AST[0] && cOld?.to === OLD_C_AST[1] && cOld?.top === undefined && cHalf?.from === OLD_C_AST[0] && cHalf?.top === 150,
      `a centre's assists, which only the old line's books list: the full push at ${cOld?.from} to ${cOld?.to} with no game on the new line, a push of at most ${cHalf?.top} at half and half (must be 150), and no such family with every game on it`);
  }
  /* B6a, the award rates the old grades were set for, held where main had them. */
  for (const [award, label] of [['MVP', 'MVPs a career'], ['All-NBA', 'All-NBA a career'], ['All-Defensive Team', 'All-Defensive a career'], ['Finals MVP', 'Finals MVPs a career']]) {
    const careerSd = mean(per.map(m => m.sdCareer[award]));
    heldAtMain(B6, base.nba, per, `perCareer.${award}`, `${label} (sd over careers ${r3(careerSd)})`);
  }
  /* How the awards are SPREAD over careers is not main's on this line, and one grade an award cannot make it so
     (see the header). The two shares are held where Round 1103 shipped them, and main's are printed beside. */
  for (const [key, label] of [['everMvp', 'careers with an MVP, percent'], ['everAllNba', 'careers with an All-NBA, percent']]) {
    heldAt(B6, SPREAD_1103[key], per.map(m => m[key]), `${label}, a fence at this round's own rate`, key, 'what Round 1103 shipped,');
    const mainMean = mean(base.nba.seeds.map(s => s.m[key])); const nowMean = mean(per.map(m => m[key]));
    const passA = mean(PASS_A_SPREAD[key]);
    console.log(`  note [${B6}] NOT held at main's: ${label} is ${nowMean.toFixed(2)} here against main's ${mainMean.toFixed(2)} (${base.nba.seeds.map(s => s.m[key]).join(', ')}), ${(nowMean - mainMean).toFixed(2)} points more careers for the same awards a career. The new line alone put it at ${passA.toFixed(2)} (pass A, the old awards block, ${PASS_A_SPREAD[key].join(', ')}); the one pass is ${(passA - nowMean).toFixed(2)} points back toward main from there. The brief's critic asked for main's band; one grade an award cannot give it, and the lead ruled on 2026-10-09 that this is the round's own rate, accepted, with no second lever.`);
  }
}

/* B, the awards make sense together (the one pass, nbaCareerAwards.ts). */
if (HAS_PASS()) {
  const tot = key => per.reduce((t, m) => t + m.b[key], 0);
  const list = key => per.map(m => m.b[key]).join(', ');
  const perCareerOf = a => mean(per.map(m => m.perCareer[a]));
  const mainOf = a => (base.nba ? mean(base.nba.seeds.map(s => s.m.perCareer[a])) : 0);
  /* A check whose population is under its floor is empty, and an empty check fails (the floor is stated for a
     full size run and shrinks with the run). */
  const sizeShare = Math.min(1, (CAREERS * SEEDS.length) / 30000);
  const floor = (section, key, min, what) => { const need = Math.ceil(min * sizeShare); banded(section, tot(key) >= need, `${what}: ${tot(key)} in the run (at least ${need}, or the checks on them are empty)`); };
  exact('B0', tot('keyMismatch') === 0 && tot('dpoyOffTeam') === 0 && tot('noRecord') === 0, `every award string agrees with the key that names its team (${tot('keyMismatch')} seasons off), every Defensive Player is on an All-Defensive team (${tot('dpoyOffTeam')} off), every season has a club record that adds up to its length (${tot('noRecord')} without)`);
  floor('B1', 'mvp', 300, 'MVP seasons'); floor('B1', 'mip', 100, 'Most Improved seasons');
  exact('B1', tot('mvpMissed') === 0, `MVP seasons on a club that missed the playoffs: ${list('mvpMissed')} of ${list('mvp')} (main: one in four)`);
  exact('B1', tot('mvpOffFirst') === 0, `MVP seasons off the All-NBA First Team: ${list('mvpOffFirst')} (main: one in eleven not All-NBA at all)`);
  exact('B1', tot('mvpAndMip') === 0, `MVP and Most Improved in one season: ${list('mvpAndMip')} (main: one MVP season in four)`);
  exact('B1', tot('mipAfterAllNba') === 0, `Most Improved after an earlier All-NBA: ${list('mipAfterAllNba')} of ${list('mip')}`);
  floor('B2', 'roy', 60, 'Rookie of the Year seasons');
  exact('B2', tot('royOffFirst') === 0, `Rookie of the Year seasons off the All-Rookie First Team: ${list('royOffFirst')} of ${list('roy')} (main: every one)`);
  exact('B2', tot('allRookieLater') === 0, `All-Rookie outside a first season: ${list('allRookieLater')}`);
  banded('B2', tot('allRookieFirstSeason') > 0, `All-Rookie selections in first seasons: ${list('allRookieFirstSeason')} (main: none)`);
  /* All-Rookie is 10 picks of about 45 rookies who play. One grade for the whole class once put 51 percent of
     first seasons on a team, bench rookies at 5 points a game among them, with nothing holding it from above. */
  { const shares = per.map(m => share(m.rookies.onTeam, m.rookies.firstSeasons)); const all = share(per.reduce((t, m) => t + m.rookies.onTeam, 0), per.reduce((t, m) => t + m.rookies.firstSeasons, 0));
    banded('B2', all >= ALL_ROOKIE_SHARE.lo && all <= ALL_ROOKIE_SHARE.hi, `first seasons on an All-Rookie team: ${shares.map(x => x.toFixed(1)).join(', ')} percent, ${all.toFixed(1)} over the run (${ALL_ROOKIE_SHARE.lo} to ${ALL_ROOKIE_SHARE.hi}; the real class is 10 of 45, 22 percent; one grade for the class gave 51)`);
    console.log(`  note [B2] First Team: ${per.map(m => m.rookies.first).join(', ')} seasons, median ${per.map(m => m.rookies.firstMedPpg).join(', ')} points, ${per.map(m => m.rookies.firstBench).join(', ')} percent bench men. Second Team: ${per.map(m => m.rookies.second).join(', ')}, median ${per.map(m => m.rookies.secondMedPpg).join(', ')} points, ${per.map(m => m.rookies.secondBench).join(', ')} percent bench men. On a team under 6 points a game: ${per.map(m => m.rookies.under6).join(', ')}`); }
  floor('B3', 'barAwardsFrom2023', 2000, 'seasons from 2023-24 with an award the games rule names');
  exact('B3', tot('underBarFrom2023') === 0, `from 2023-24, seasons under the games bar holding an award the rule names: ${list('underBarFrom2023')} of ${list('barAwardsFrom2023')}`);
  banded('B3', tot('under65Before2023') >= Math.ceil(UNDER65_FLOOR * sizeShare), `before 2023-24 the rule did not exist: ${list('under65Before2023')} seasons under 65 games hold one of those awards (at least ${Math.ceil(UNDER65_FLOOR * sizeShare)} in the run, so "none before" is seen to fire)`);
  floor('B3', 'sixth', 100, 'Sixth Man seasons');
  exact('B3', tot('sixthStarter') === 0, `Sixth Man seasons by a starter: ${list('sixthStarter')} of ${list('sixth')}`);
  exact('B3', tot('underHalf') === 0, `seasons under half a schedule holding any award but a Finals MVP: ${list('underHalf')}`);
  /* B3, drawn: the rule's first season and its number, against the literals at the top of this file. The fleet
     cannot hold the first season (few careers reach 2023-24 from 2003), and a bar the engine computes for itself
     cannot hold the number. One standout season, drawn 300 times a case: it holds one of the five awards the
     rule names nearly every time it may, and never when it may not. */
  { const A = E.nbaAwards;
    const star = { pos: 'SF', defenceRep: -0.6, bench: false, rookie: false, year: 2026, seasonLength: 82, games: 78, ppg: 33, rpg: 9, apg: 8, spg: 2.4, bpg: 1.4, winShare: 0.75, madePlayoffs: true, fanbase: 90, prev: { year: 2025, games: 75, ppg: 14, rpg: 4, apg: 3 }, everAllNba: false };
    const held = x => { const r = mulberry32(41); let k = 0; for (let i = 0; i < 300; i++) if (A.decideNbaAwards(r, x).awards.some(a => BAR_AWARDS.includes(a))) k++; return k; };
    const at = (year, games) => held({ ...star, year, games, prev: { ...star.prev, year: year - 1 } });
    const G = REAL_GAMES_RULE;
    const under = at(G.from, G.games - 1); const on = at(G.from, G.games); const before = at(G.from - 1, G.games - 1); const halfOff = at(G.from - 1, 40);
    exact('B3', under === 0 && on >= 290, `drawn, the ${G.season} season itself: ${G.games - 1} games hold a rule award in ${under} of 300 draws (must be 0), ${G.games} games in ${on} (at least 290)`);
    exact('B3', before >= 290 && halfOff === 0, `drawn, the season before the rule: ${G.games - 1} games hold a rule award in ${before} of 300 draws (at least 290: no games rule yet), 40 of 82 games in ${halfOff} (must be 0: the game's own half season floor)`); }
  /* B8, the rules a fleet cannot see, each against a number typed in this file: which leaders' bar a stat title
     is judged on, which era the fans alone pick the All-Star starters in, and each season's real minimum of
     games for a stat title. Exact, on drawn seasons. */
  { const A = E.nbaAwards; const N = E.norms; const Rr = N.NBA_AWARD_RULES;
    const quiet = { pos: 'SF', defenceRep: 0, bench: false, rookie: false, year: 2026, seasonLength: 82, games: 78, ppg: 8, rpg: 3, apg: 2, spg: 0.8, bpg: 0.3, winShare: 0.4, madePlayoffs: false, fanbase: 40, prev: null, everAllNba: false };
    const draws = (x, hit) => { const r = mulberry32(53); let k = 0; for (let i = 0; i < 300; i++) if (hit(A.decideNbaAwards(r, x))) k++; return k; };
    const TITLES = [['pts', 'ppg', 'Scoring Champion'], ['reb', 'rpg', 'Rebounding Champion'], ['ast', 'apg', 'Assists Leader']];
    for (const [stat, key, award] of TITLES) {
      const b = N.nbaLeaderBar(stat, 2026);
      const lo = b.mean - 1.73 * b.sd - 0.05; const hi = b.mean + 1.73 * b.sd + 0.05;
      const never = draws({ ...quiet, [key]: lo }, o => o.awards.includes(award)); const always = draws({ ...quiet, [key]: hi }, o => o.awards.includes(award));
      exact('B8', never === 0 && always === 300, `${award}: an average just under its own league leaders' lowest bar (${lo.toFixed(2)}) wins in ${never} of 300 draws (must be 0), one just over their highest (${hi.toFixed(2)}) in ${always} (must be 300)`);
    }
    /* A fan favourite on a poor season: the fans alone make him a starter, the weighted vote never does. */
    const favourite = { ...quiet, fanbase: 100, games: 60, ppg: 6, rpg: 2, apg: 1 };
    const W = REAL_ALL_STAR.weightedFrom;
    const alone = draws({ ...favourite, year: W - 1 }, o => o.allStar === 'starter'); const weighted = draws({ ...favourite, year: W }, o => o.allStar === 'starter');
    exact('B8', alone >= 60 && weighted === 0, `a fan favourite (fanbase 100) on a 6 point season starts the All-Star Game in ${alone} of 300 draws in ${W - 1}-${String(W % 100).padStart(2, '0')}, when the fans picked alone (at least 60), and in ${weighted} in ${W}-${String((W + 1) % 100).padStart(2, '0')}, the first weighted vote (must be 0)`);
    /* Each season's real minimum for a stat title, as the shared rule applies it. */
    const Q = E.decision.nbaQualifiesForStatTitle;
    const S11 = REAL_SHORT_2011; const row = Rr.statTitleShortBefore?.[S11.year];
    const short = t => (row ? { games: row.games, total: row.totals[t] } : undefined);
    const rowOk = !!row && row.games === S11.games && row.totals.pts === S11.pts && row.totals.reb === S11.reb && row.totals.ast === S11.ast;
    const q11 = (g, total, t) => Q(g, total, Rr.statTitleTotalsBefore[t], S11.year, S11.length, Rr, short(t));
    exact('B8', rowOk && nba.nbaSeasonGames(S11.year) === S11.length && !q11(S11.games - 1, S11.pts - 1, 'pts') && q11(S11.games, 0, 'pts') && q11(10, S11.pts, 'pts') && q11(10, S11.reb, 'reb') && q11(10, S11.ast, 'ast') && !q11(10, S11.ast - 1, 'ast'),
      `the 66 game 2011-12 season asks for its own real minimum, ${S11.games} games or ${S11.pts} points, ${S11.reb} rebounds, ${S11.ast} assists (the rules hold ${row ? `${row.games}, ${row.totals.pts}, ${row.totals.reb}, ${row.totals.ast}` : 'no row'})`);
    exact('B8', !Q(69, 1399, 1400, 2010, 82, Rr) && Q(70, 0, 1400, 2010, 82, Rr) && Q(40, 1400, 1400, 2012, 82, Rr) && !Q(57, 9999, 1400, 2013, 82, Rr) && Q(58, 0, 1400, 2013, 82, Rr) && !Q(50, 9999, 1400, 2020, 72, Rr) && Q(51, 0, 1400, 2020, 72, Rr),
      'a full season before 2013-14 asks for 70 games or the total (1,400 points), from 2013-14 for 58 of 82 with no way in on totals, and the 72 game 2020-21 season for 51');
    /* End to end: the career hands the short season's own row over. A scorer over every bar on 40 of 66 games
       has the 1,127 points and leads the league; the game's old stand in (70 percent of the games) said no. */
    const b11 = N.nbaLeaderBar('pts', S11.year);
    const scorer = { ...quiet, year: S11.year, seasonLength: S11.length, games: 40, ppg: Math.round((b11.mean + 1.73 * b11.sd + 0.5) * 10) / 10 };
    const led = draws(scorer, o => o.awards.includes('Scoring Champion'));
    exact('B8', scorer.ppg * scorer.games >= S11.pts && led === 300, `2011-12, ${scorer.ppg} points a game over 40 of 66 games (${Math.round(scorer.ppg * scorer.games)} points, over the ${S11.pts} the season asked for): Scoring Champion in ${led} of 300 draws (must be 300)`); }
  /* B9, the snub card against this round's awards (the header says why it is proven here). */
  { const runs = SEEDS.map(seed => snubDecks(seed, SNUB_CAREERS));
    const sum = k => runs.reduce((t, r) => t + r[k], 0); const each = k => runs.map(r => r[k]).join(', ');
    const scale = (SNUB_CAREERS / 300) * SEEDS.length;
    exact('B9', sum('dealtHonoured') === 0, `the snub card in the summer deck after a season that holds an award: ${each('dealtHonoured')} of ${each('dealt')} decks that hold it (must be 0)`);
    banded('B9', sum('gateOnly') >= Math.ceil(SNUB_FLOOR.gateOnly * scale), `summers where only the award keeps the card out (three seasons in, rated 80, never answered): ${each('gateOnly')} (at least ${Math.ceil(SNUB_FLOOR.gateOnly * scale)} in the run, or the gate was never asked)`);
    banded('B9', sum('gateOnlyAllStar') >= Math.ceil(SNUB_FLOOR.gateOnlyAllStar * scale), `the same after an All-Star season: ${each('gateOnlyAllStar')} (at least ${Math.ceil(SNUB_FLOOR.gateOnlyAllStar * scale)})`);
    banded('B9', sum('dealt') >= Math.ceil(SNUB_FLOOR.dealt * scale), `decks that do hold the card, after a season with no award: ${each('dealt')} of ${each('summers')} summers (at least ${Math.ceil(SNUB_FLOOR.dealt * scale)}, so the card is still in the game)`); }
  exact('B4', tot('allNbaNoAllStar') === 0, `All-NBA seasons without an All-Star selection: ${list('allNbaNoAllStar')}`);
  exact('B4', tot('firstTeam') > 0 && tot('firstTeamNotStarter') === 0 && tot('mvpNotStarter') === 0, `All-NBA First Team seasons that did not start the All-Star Game: ${list('firstTeamNotStarter')} of ${list('firstTeam')}; MVP seasons that did not: ${list('mvpNotStarter')} (before the gate the League MVP read "All-Star reserve" in 43 percent of MVP seasons); starters are ${(100 * tot('starters') / Math.max(1, tot('allStars'))).toFixed(0)} percent of All-Stars (the real game starts 10 of 24, 42 percent)`);
  exact('B4', tot('benchStarters') === 0 && tot('benchAllStars') > 0, `All-Star starters who spent the season on their own club's bench (and were not on the All-NBA First Team): ${list('benchStarters')} (must be 0; before the gate one starter in 30); bench men picked for the game at all: ${list('benchAllStars')} (must be above zero: the gate is on the vote, not on the selection)`);
  { const ratio = per.map(m => m.perCareer['All-Star'] / Math.max(1e-9, m.perCareer['All-NBA']));
    banded('B4', mean(ratio) >= 1.25 && mean(ratio) <= 2.4, `All-Star selections a career over All-NBA: ${ratio.map(r => r.toFixed(2)).join(', ')}, mean ${mean(ratio).toFixed(2)} (1.25 to 2.4; 24 picks against 15 is 1.6); ${per.map(m => m.perCareer['All-Star']).join(', ')} All-Star a career, ${list('starters')} of them starters`); }
  { const DEFENDERS = ['pest', 'twoway', 'threed', 'anchor']; const SCORERS = ['scoringpg', 'bucket', 'sniper', 'alpha', 'stretch4', 'stretch'];
    const byArch = a => mean(per.map(m => m.allDefByArch[a]));
    const low = DEFENDERS.reduce((x, a) => (byArch(a) < byArch(x) ? a : x)); const high = SCORERS.reduce((x, a) => (byArch(a) > byArch(x) ? a : x));
    const factor = mean(DEFENDERS.map(byArch)) / Math.max(1e-9, mean(SCORERS.map(byArch)));
    banded('B5', byArch(low) > byArch(high), `All-Defensive a career: every defender above every scorer (the lowest defender, ${low}, ${byArch(low).toFixed(2)}; the highest scorer, ${high}, ${byArch(high).toFixed(2)})`);
    banded('B5', factor >= B5_FACTOR, `the defenders' mean is ${factor.toFixed(1)} times the scorers' (at least ${B5_FACTOR}; main: a tenth of it, the wrong way round): ${[...DEFENDERS, ...SCORERS].map(a => `${a} ${byArch(a).toFixed(2)}`).join(', ')}`); }
  if (base.nba) {
    const roy = perCareerOf('Rookie of the Year'); const royMain = mainOf('Rookie of the Year');
    banded(B6, roy >= royMain && roy <= 3 * royMain, `Rookie of the Year a career: ${per.map(m => m.perCareer['Rookie of the Year']).join(', ')}, mean ${roy.toFixed(3)} (between main's ${royMain.toFixed(3)} and three times it)`);
    for (const a of ['Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Sixth Man of the Year', 'Most Improved Player', 'Defensive Player of the Year', 'All-Rookie Team']) {
      banded(B6, perCareerOf(a) > 0, `${a} a career: ${per.map(m => m.perCareer[a]).join(', ')} (main ${mainOf(a).toFixed(3)}; it moves by design, judged as above zero)`);
    }
  }
  { const A = E.nbaAwards;
    const counted = x => { let n = 0; const r = mulberry32(3); A.decideNbaAwards(() => { n++; return r(); }, x); return n; };
    const one = { pos: 'SF', defenceRep: 0, bench: false, rookie: false, year: 2026, seasonLength: 82, games: 78, ppg: 24, rpg: 6, apg: 5, spg: 1.1, bpg: 0.6, winShare: 0.6, madePlayoffs: true, fanbase: 60, prev: { year: 2025, games: 75, ppg: 20, rpg: 5, apg: 4 }, everAllNba: false };
    const cases = [{ ...one, rookie: true, prev: null }, { ...one, bench: true }, { ...one, games: 30 }, { ...one, year: 2010 }];
    exact('B7', cases.every(c => counted(c) === A.NBA_AWARD_DRAWS), `decideNbaAwards draws exactly ${A.NBA_AWARD_DRAWS} times for a rookie, a bench player, a short season and a season before 2023 (${cases.map(counted).join(', ')})`);
    const frozen = JSON.stringify(one);
    exact('B7', JSON.stringify(A.decideNbaAwards(mulberry32(11), one)) === JSON.stringify(A.decideNbaAwards(mulberry32(11), one)) && JSON.stringify(one) === frozen, 'the same input and seed give the same awards, and the input is left untouched'); }
  /* E again, for the table the one pass reads. */
  { const C = E.nbaAwards.NBA_FIELD;
    const cmp = (label, row, pick) => { const meanOff = passFits.map(x => Math.abs(pick(x.field).mean - row[0]) / row[1]); const sdOff = passFits.map(x => Math.abs(pick(x.field).sd / row[1] - 1));
      banded('E', meanOff.every(v => v <= E_MEAN_TOL) && sdOff.every(v => v <= E_SD_TOL), `NBA_FIELD ${label}: committed ${row[0]}/${row[1]} against the fleet ${passFits.map(x => `${pick(x.field).mean.toFixed(2)}/${pick(x.field).sd.toFixed(2)}`).join(' ')} (mean off by at most ${Math.max(...meanOff).toFixed(3)} sd, limit ${E_MEAN_TOL}; sd off by at most ${(Math.max(...sdOff) * 100).toFixed(1)} percent, limit ${E_SD_TOL * 100})`); };
    for (const key of ['mvp', 'defense', 'production']) for (const p of POS) cmp(`${key} ${p}`, C[key][p], fl => fl[key][p]);
    for (const key of ['bench', 'jump', 'fans']) cmp(key, C[key], fl => fl[key]); }
}

/* D, one function: NBA Front Office and NBA My Career score an award through the same code. */
if (HAS_PASS()) {
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const foSrc = strip(underControl('src/lib/nbaSeasonStats.ts')); const careerSrc = strip(underControl('src/lib/nbaCareerAwards.ts'));
  const imports = s => /import \{[^}]*\} from '\.\/awardDecision';/.test(s);
  exact('D', imports(foSrc) && imports(careerSrc), 'nbaSeasonStats.ts and nbaCareerAwards.ts both import from ./awardDecision (comments stripped)');
  exact('D', !foSrc.includes("foPerGame(p, 'pts') + foPerGame(p, 'reb')"), 'nbaSeasonStats.ts no longer adds points and rebounds a game itself');
  exact('D', E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT === E.fo.NBA_MVP_WIN_WEIGHT, `the career's MVP win weight (${E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT}) is NBA Front Office's (${E.fo.NBA_MVP_WIN_WEIGHT})`);
  /* Behaviour: with the shared MVP score cut down to the production alone (one line of awardDecision.ts swapped
     in a second bundle), BOTH games must change: Front Office's ranking of a hand built pair where the best
     producer plays for the worst club, and the career's MVP count over one small fleet. */
  const P = await bundleWith([...edits, { label: 'D probe', file: 'src/lib/awardDecision.ts', swaps: [['  return production + winWeight * winShare;', '  return production;']] }], 'probe');
  const lg = { teams: { BAD: { wins: 10, losses: 72 }, TOP: { wins: 70, losses: 12 } } };
  const man = (id, team, pts, reb, ast) => ({ id, name: id, team, pos: 'SF', g: 80, gs: 80, tot: { pts: pts * 80, reb: reb * 80, ast: ast * 80, stl: 80, blk: 40 } });
  const producer = man('producer', 'BAD', 30, 8, 7); const winner = man('winner', 'TOP', 26, 6, 6);
  const foNow = E.fo.nbaMvpScore(lg, winner) > E.fo.nbaMvpScore(lg, producer); const foProbe = P.fo.nbaMvpScore(lg, winner) > P.fo.nbaMvpScore(lg, producer);
  exact('D', foNow && !foProbe, `NBA Front Office ranks the winner over the better producer on the worst club (${foNow}), and stops when the shared score loses its winning term (${!foProbe})`);
  const mvpsOf = M => playFleet(1, 400, M).careers.reduce((t, c) => t + c.mvps, 0);
  const mine = mvpsOf(E); const probed = mvpsOf(P);
  exact('D', mine !== probed, `the career's MVPs over 400 careers change with the same swap (${mine} against ${probed})`);
}

/* F, the words: what the "?" and the page say is what the code does. */
if (HAS_PASS() && typeof E.nbaAwards.nbaAwardHelpRules === 'function') {
  const rules = E.nbaAwards.nbaAwardHelpRules();
  const R = E.norms.NBA_AWARD_RULES;
  const text = rules.join('\n');
  const ex = text.match(/you average ([0-9.]+) points, ([0-9.]+) rebounds and ([0-9.]+) assists and your club goes ([0-9]+)-([0-9]+)[.] That is ([0-9.]+) for the production plus ([0-9]+) times ([.][0-9]+) for the winning: ([0-9.]+)[.]/);
  const losing = text.match(/the same line on a ([0-9]+)-([0-9]+) club/);
  if (!ex || !losing) exact('F', false, 'the worked example is not in the help rules in the shape this check reads');
  else {
    const [p, r, a, w, l] = ex.slice(1, 6).map(Number);
    const production = E.decision.nbaProduction(p, r, a);
    const share = w / (w + l);
    const total = E.decision.nbaMvpValue(production, share, Number(ex[7]));
    exact('F', production.toFixed(1) === ex[6] && share.toFixed(3).replace(/^0/, '') === ex[8] && total.toFixed(1) === ex[9] && Number(ex[7]) === E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT,
      `the worked example recomputed through the shared score: production ${production.toFixed(1)} (printed ${ex[6]}), winning share ${share.toFixed(3)} (printed ${ex[8]}), weight ${ex[7]}, total ${total.toFixed(1)} (printed ${ex[9]})`);
    const bands = nba.NBA_RECORD_BANDS;
    const playoffFloor = Math.min(...nba.NBA_PLAYOFF_RESULTS.map(k => bands[k][0])); const playoffTop = Math.max(...nba.NBA_PLAYOFF_RESULTS.map(k => bands[k][1]));
    exact('F', w >= playoffFloor && w <= playoffTop && Number(losing[1]) <= bands[nba.NBA_MISSED_PLAYOFFS][1] && Number(losing[1]) < playoffFloor && w + l === 82 && Number(losing[1]) + Number(losing[2]) === 82,
      `the example's ${w}-${l} club is a playoff club by the engine's record bands (${playoffFloor} to ${playoffTop} wins) and its ${losing[1]}-${losing[2]} club is not (${bands[nba.NBA_MISSED_PLAYOFFS].join(' to ')})`);
  }
  const games = text.match(/need ([0-9]+) games/); const picks = text.match(/All-Star is ([0-9]+) picks/);
  /* Against the real numbers typed at the top of this file, not the rule table the help is built from: the help
     and the table agreeing with each other is one mistake said twice. */
  const weightedSeason = `${REAL_ALL_STAR.weightedFrom}-${String((REAL_ALL_STAR.weightedFrom + 1) % 100).padStart(2, '0')}`;
  exact('F', !!games && Number(games[1]) === REAL_GAMES_RULE.games && text.includes(`From the ${REAL_GAMES_RULE.season} season on`) && !!picks && Number(picks[1]) === REAL_ALL_STAR.picks && text.includes(`in seasons before ${weightedSeason} the fans pick the starters alone`),
    `the help says ${games?.[1]} games from the ${REAL_GAMES_RULE.season} season, ${picks?.[1]} All-Star picks and the fans alone before ${weightedSeason}; the real rules are ${REAL_GAMES_RULE.games}, ${REAL_ALL_STAR.picks} and ${weightedSeason} (the rule table holds ${R.gamesBar} from ${R.gamesBarFrom}, ${R.allStarPicks} and ${R.allStarFanShareFrom})`);
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const page = strip(underControl('src/pages/NbaMyCareer.tsx'));
  const typed = page.match(/The Trophy Case holds ([0-9]+) badges/);
  exact('F', !!typed && Number(typed[1]) === E.NBA_BADGES.length, `the page says the Trophy Case holds ${typed?.[1]} badges; NBA_BADGES has ${E.NBA_BADGES.length}`);
  exact('F', /extraRules=\{\[\.\.\.nbaAwardHelpRules\(\), /.test(page), 'the page hands the award rules to its "?"');
  exact('F', !/[\u2013\u2014]/.test(text), 'no em or en dash in the help rules');
  /* The guide file is not this round's (its owner holds it). What it still says is printed for the lead. */
  const guide = srcOf('src/data/gameContent/basketball.ts');
  console.log(`  note [F] the guide for /nba-my-career still says, and its owner owes the change: ${[/62 games/.test(guide) ? '"62 games"' : null, /21 of them/.test(guide) ? '"21 of them"' : null, /Each of the 21 badges/.test(guide) ? '"Each of the 21 badges"' : null].filter(Boolean).join(', ') || 'nothing stale'}`);
}

/* K, the Trophy Case tile (Round 1112): it counts every award the case behind it lists. */
{
  const all = fleets.flat();
  const off = all.filter(c => c.tile !== c.rings + c.awardsHeld);
  const lesserOnly = fleets.map(f => f.filter(c => c.awardsHeld > 0 && c.rings + c.named === 0).length);
  exact('K', all.length > 0 && off.length === 0, `the Trophy Case tile counts the rings plus every award on the seasons, so it reads Empty only over an empty case: ${off.length} of ${all.length} careers off${off.length ? ` (the first: tile ${off[0].tile}, rings ${off[0].rings}, awards ${off[0].awardsHeld})` : ''}`);
  banded('K', lesserOnly.every(n => n >= LESSER_ONLY_FLOOR), `careers whose only awards are the lesser ones (no ring, MVP, All-NBA or All-Star), the ones the tile read Empty for: ${lesserOnly.join(', ')} a seed (floor ${LESSER_ONLY_FLOOR})`);
  /* Round 1149: the same two checks on the other three careers, each on its own fleet. */
  for (const sp of Object.keys(OTHER)) {
    const list = others[sp].flatMap(o => o.careers);
    const bad = list.filter(c => c.tile !== c.rings + c.awardsHeld);
    const only = others[sp].map(o => o.careers.filter(c => c.awardsHeld > 0 && c.rings + c.named === 0).length);
    exact('K', list.length > 0 && bad.length === 0, `${sp.toUpperCase()}: the Trophy Case tile counts the rings plus every award on the seasons: ${bad.length} of ${list.length} careers off${bad.length ? ` (the first, a ${bad[0].pos}: tile ${bad[0].tile}, rings ${bad[0].rings}, awards ${bad[0].awardsHeld})` : ''}`);
    banded('K', only.every(n => n >= OTHER_LESSER_ONLY_FLOOR[sp]), `${sp.toUpperCase()}: careers whose only awards are the lesser ones, the ones the tile read Empty for: ${only.join(', ')} a seed of ${OTHERS_PER} (floor ${OTHER_LESSER_ONLY_FLOOR[sp]})`);
  }
}

/* T, the near tie (Round 1112): the one sentence all four sports share names the leader the tally gives. */
{
  const bySport = { nba: nbaNearTies.flat(), ...Object.fromEntries(Object.keys(OTHER).map(sp => [sp, others[sp].flatMap(o => o.nearTies)])) };
  for (const [sp, list] of Object.entries(bySport)) {
    const count = k => list.filter(x => x.kind === k).length;
    const wrong = list.filter(x => !x.ok);
    exact('T', list.length > 0 && wrong.length === 0, `${sp.toUpperCase()}: ${list.length} near tie notes, each naming the leader the tally gives (you lead ${count('mine')}, he leads ${count('his')}, level ${count('level')}, unreadable ${count('unread')})${wrong.length ? `; ${wrong.length} wrong, the first: "${wrong[0].note}"` : ''}`);
    banded('T', count('mine') >= NEAR_TIE_FLOOR && count('his') >= NEAR_TIE_FLOOR && count('level') >= NEAR_TIE_FLOOR, `${sp.toUpperCase()}: all three ways a near tie can read turn up (floor ${NEAR_TIE_FLOOR} each over the run)`);
  }
}

/* P, the proof of Round 1112 (judged only when asked, like C): the player's own path did not move, and neither
   did the other three sports' rivals. The same fleets on this tree and on the tree before. */
if (!PROVE_AGAINST) console.log('  note [P] the before and after proof: not judged in a plain run (SENSE_PROVE_AGAINST=<commit> plays both trees)');
else {
  const before = await bundleAt(PROVE_AGAINST);
  console.log(`  note [P] against ${PROVE_AGAINST}: ${before.changed.length} src files differ, ${before.served.length} read at that commit (${before.served.map(x => x.replace('src/lib/', '')).join(', ')})`);
  exact('P', before.served.length > 0, 'the tree before is a different tree (at least one bundled file was read at the commit)');
  const mine = []; const rivalMoved = [];
  for (const seed of SEEDS) {
    const a = playFleet(seed, PROVE_CAREERS, before.mod, true); const b = playFleet(seed, PROVE_CAREERS, E, true);
    mine.push(a.digest === b.digest && a.seasons.length === b.seasons.length);
    rivalMoved.push(a.seasons.filter((x, k) => x.rivalLine !== b.seasons[k]?.rivalLine).length);
    console.log(`  note [P] NBA seed ${seed}: ${PROVE_CAREERS} careers, ${b.seasons.length} seasons, player digest ${a.digest.slice(0, 12)} before and ${b.digest.slice(0, 12)} after`);
  }
  exact('P', mine.every(Boolean), `NBA: the player's own path is byte equal before and after on every seed (his season lines and awards, his role, his club, his own notes, his summer cards and the option taken, every number on the final save; ${PROVE_CAREERS} careers a seed)`);
  exact('P', rivalMoved.every(n => n > 0), `NBA: the rival's printed line did move, so the two trees are not one (seasons whose rival line differs: ${rivalMoved.join(', ')})`);
  for (const sport of Object.keys(OTHER)) {
    let same = true; let rivalSame = true; let notesMoved = 0; let otherWords = 0; let first = '';
    for (const seed of SEEDS) {
      const a = playOther(sport, seed, OTHERS_PER, before.mod); const b = playOther(sport, seed, OTHERS_PER, E);
      if (a.hash !== b.hash) same = false;
      if (a.rivalHash !== b.rivalHash) rivalSame = false;
      a.notes.forEach((na, k) => {
        const nb = b.notes[k] ?? [];
        for (let j = 0; j < Math.max(na.length, nb.length); j++) {
          if (na[j] === nb[j]) continue;
          notesMoved++;
          const cut = t => (typeof t === 'string' && t.includes('Nothing in it again. ') ? t.slice(0, t.indexOf('Nothing in it again. ')) : null);
          if (cut(na[j]) === null || cut(na[j]) !== cut(nb[j])) { otherWords++; if (!first) first = `"${na[j]}" became "${nb[j]}"`; }
        }
      });
    }
    exact('P', same, `${sport.toUpperCase()}: the player's careers hash equal before and after on every seed`);
    exact('P', rivalSame, `${sport.toUpperCase()}: the rival's own trail is byte equal before and after on every seed (his line, his score, the tally, rings, rating, age, retired)`);
    exact('P', otherWords === 0, `${sport.toUpperCase()}: the only season notes that moved are near ties, after "Nothing in it again." (${notesMoved} moved)${first ? `; the first other: ${first}` : ''}`);
  }
}

/* Q, the proof of Round 1149 (judged only when asked, like P and C). The round took the coin out of the roster
   beats of the NFL, MLB and NHL careers and moved the NBA's onto the shared builder. So, the same fleets on this
   tree and on the tree before: in all four sports the player's own path is byte equal and so is the rival's
   trail and every season note, and a beat is dealt in exactly the same seasons (nothing new is drawn). What may
   differ is WHICH card a season deals and what it says, and only in a sport the round has moved (Q_MOVED): there
   it must differ somewhere, so the two trees are not one. */
if (!PROVE_1149) console.log('  note [Q] the before and after proof of Round 1149: not judged in a plain run (SENSE_PROVE_1149=<commit> plays both trees)');
else {
  const before = await bundleAt(PROVE_1149);
  console.log(`  note [Q] against ${PROVE_1149}: ${before.changed.length} src files differ, ${before.served.length} read at that commit (${before.served.map(x => x.replace('src/lib/', '')).join(', ')})`);
  exact('Q', before.served.length > 0, 'the tree before is a different tree (at least one bundled file was read at the commit)');
  const mine = []; const rivalMoved = []; const cardsMoved = []; const cardsDealt = [];
  for (const seed of SEEDS) {
    const a = playFleet(seed, PROVE_CAREERS, before.mod, true); const b = playFleet(seed, PROVE_CAREERS, E, true);
    mine.push(a.digest === b.digest && a.seasons.length === b.seasons.length);
    rivalMoved.push(a.seasons.filter((x, k) => x.rivalLine !== b.seasons[k]?.rivalLine || x.rivalScore !== b.seasons[k]?.rivalScore || x.rivalAllStar !== b.seasons[k]?.rivalAllStar).length);
    cardsMoved.push(a.seasons.filter((x, k) => x.beatCard !== b.seasons[k]?.beatCard).length);
    cardsDealt.push(b.seasons.filter(x => x.beatCard).length);
  }
  exact('Q', mine.every(Boolean), `NBA: the player's own path is byte equal before and after on every seed (${PROVE_CAREERS} careers a seed)`);
  exact('Q', rivalMoved.every(n => n === 0), `NBA: the rival's line, score and All-Star season are the same in every season (seasons that differ: ${rivalMoved.join(', ')})`);
  exact('Q', cardsDealt.every(n => n > 0) && cardsMoved.every(n => n === 0), `NBA: every rivalry beat dealt is the same card, word for word, so the lift onto the shared builder moved nothing (${cardsDealt.join(', ')} beats a seed, ${cardsMoved.join(', ')} differ)`);
  for (const sport of Object.keys(OTHER)) {
    let same = true; let rivalSame = true; let notesMoved = 0; let dealtApart = 0; let cards = 0; let moved = 0; let first = '';
    for (const seed of SEEDS) {
      const a = playOther(sport, seed, OTHERS_PER, before.mod); const b = playOther(sport, seed, OTHERS_PER, E);
      if (a.hash !== b.hash) same = false;
      if (a.rivalHash !== b.rivalHash) rivalSame = false;
      a.notes.forEach((na, k) => { if (JSON.stringify(na) !== JSON.stringify(b.notes[k] ?? [])) notesMoved++; });
      a.beats.forEach((x, k) => {
        const y = b.beats[k];
        if (!!x.card !== !!y?.card) dealtApart++;
        if (y?.card) cards++;
        if (x.card !== y?.card) { moved++; if (!first) first = `"${x.card}" became "${y?.card}"`; }
      });
      if (a.beats.length !== b.beats.length) dealtApart++;
    }
    const S = sport.toUpperCase();
    exact('Q', same, `${S}: the player's careers hash equal before and after on every seed (every season line and every counter)`);
    exact('Q', rivalSame, `${S}: the rival's own trail is byte equal before and after on every seed`);
    exact('Q', notesMoved === 0, `${S}: every season's notes are the same (${notesMoved} seasons differ)`);
    exact('Q', dealtApart === 0 && cards > 0, `${S}: a rivalry beat is dealt in exactly the same seasons, so nothing new is drawn (${cards} beats, ${dealtApart} seasons apart)`);
    if (Q_MOVED[sport]) exact('Q', moved > 0, `${S}: the cards did move, so the two trees are not one (${moved} of ${cards} beats read differently; the first: ${first})`);
    else exact('Q', moved === 0, `${S}: not moved yet, so every beat dealt is the same card, word for word (${moved} of ${cards} differ${first ? `; the first: ${first}` : ''})`);
  }
}

/* C, the other sports did not move. A proof for one round, judged only when asked. */
if (!base.others) exact('C', false, 'the baseline has no others key: record it with --record-others');
else if (!PROVE_OTHERS) console.log('  note [C] other sports: not judged in a plain run (SENSE_PROVE_OTHERS=1 judges the hashes)');
else if (base.others.per !== OTHERS_PER || base.others.seeds.join() !== SEEDS.join()) exact('C', false, `the others baseline was recorded at ${base.others.per} careers on seeds ${base.others.seeds.join()}, this run is ${OTHERS_PER} on ${SEEDS.join()}`);
else for (const sport of Object.keys(OTHER)) {
  const same = others[sport].every((o, k) => o.hash === base.others.hashes[sport][k]);
  exact('C', same, `${sport.toUpperCase()} careers hash equal to the baseline on every seed (${others[sport].map(o => o.hash.slice(0, 8)).join(', ')})`);
}

/* C's prints, never judged: in the other three careers, how often the sport's major award goes to a club that
   missed the playoffs, and to a man without that season's all league pick. The legacy recalibration round is
   sized from these. The words are each engine's own, and a word that is no longer in its source is said so. */
{
  const WORDS = {
    nfl: { file: 'src/lib/nflMyCareer.ts', major: ['MVP'], pick: 'All-Pro', missed: 'Missed the playoffs', anchor: "export const NFL_MISSED_PLAYOFFS = 'Missed the playoffs';" },
    mlb: { file: 'src/lib/mlbMyCareer.ts', major: ['MVP', 'Cy Young'], pick: 'All-Star', missed: 'Missed October', anchor: "let result = 'Missed October';" },
    nhl: { file: 'src/lib/nhlMyCareer.ts', major: ['Hart', 'Norris', 'Vezina'], pick: 'All-Star', missed: 'Missed the playoffs', anchor: "let result = 'Missed the playoffs';" },
  };
  for (const sport of Object.keys(OTHER)) {
    const w = WORDS[sport];
    const src = srcOf(w.file);
    if (!src.includes(w.anchor) || !w.major.every(a => src.includes(`'${a}'`)) || !src.includes(`awards.push('${w.pick}')`)) { console.log(`  note [C, printed] ${sport.toUpperCase()}: the engine's award or result words are not where this print reads them; nothing printed`); continue; }
    const all = others[sport].flatMap(o => o.lines);
    const won = all.filter(s => (s.awards ?? []).some(a => w.major.includes(a)));
    const missed = won.filter(s => s.teamResult === w.missed).length;
    const noPick = won.filter(s => !(s.awards ?? []).includes(w.pick)).length;
    const pc = n => (won.length ? `${((100 * n) / won.length).toFixed(1)} percent` : 'none');
    console.log(`  note [C, printed for the legacy recalibration round] ${sport.toUpperCase()}: ${won.length} seasons won ${w.major.join(' or ')} over ${OTHERS_PER * SEEDS.length} careers; ${missed} of them (${pc(missed)}) on a club that missed the playoffs, ${noPick} (${pc(noPick)}) without that season's ${w.pick}`);
  }
}

const size = FULL ? 'full size' : JUDGE ? 'shrunk run, judged at its own size' : 'quick run, bands not judged';
if (CONTROL) {
  /* A control must turn its own section red and no other. Exit 1 when it did (red by design), 3 when it did not. */
  const want = CONTROLS[CONTROL].needs.split(',');
  const may = (CONTROLS[CONTROL].may ?? '').split(',').filter(Boolean);
  const red = [...failedSections];
  const fired = want.every(s => red.includes(s)) && red.every(s => want.includes(s) || may.includes(s));
  console.log(`\ncontrol ${CONTROL}: ${fired ? `FIRED, red in ${red.join(', ')} (must: ${want.join(', ')}${may.length ? `; may follow: ${may.join(', ')}` : ''}) and nowhere else` : `DID NOT FIRE AS DESIGNED, wanted red in ${want.join(', ')}${may.length ? ` (and at most ${may.join(', ')})` : ' only'}, got ${red.join(', ') || 'nothing'}`}`);
  console.log(`simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}, control ${CONTROL}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(fired ? 1 : 3);
}
console.log(`\n${failed ? `red sections: ${[...failedSections].join(', ')}\n` : ''}simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
