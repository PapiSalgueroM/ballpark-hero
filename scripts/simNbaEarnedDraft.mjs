/* Round 1321: the NBA Front Office's earned draft, part A, measured.
 *
 * Part A puts the NBA on the shared draft of Round 1222 in the engine and two
 * libraries only (src/lib/gmEarnedDraft.ts, src/lib/nbaEarnedDraft.ts) and
 * NOTHING A PLAYER SEES: no board, no screen and no copy calls the new code.
 * This harness bundles the real engine, desk, lift and libraries and holds
 * what part A promises, then measures the earned draft against today's draft
 * in two arms so the lead reads the table before a screen is built on it.
 *
 * SECTIONS LAND WITH THEIR CODE (the brief's advice 23): nothing here feature
 * detects, and the last lines print how many sections ran.
 *   1. WHAT MUST NOT MOVE. 1a: the season before the draft, desk on, seeds 1
 *      to 30 (the user club is the seed's own club of the thirty, so every
 *      club is the user once), a new league with the desk open on day one,
 *      played the board's way (the tip off trim, simRound with the desk's
 *      round options, nbaDeskAfterRound, the playoffs with the desk's edges,
 *      the tax, the season's lines) to the press of "Go to the draft". The
 *      hash of the league and of the desk (ids with their per process epoch
 *      taken out) and the generator's call count equal
 *      scripts/data/nbaEarnedDraftFixture.json, recorded from the BASE commit
 *      with SIM_NBA_EARNED_DRAFT_RECORD=<base sha> (every src file the bundle
 *      reads is then read from that commit). 1a GUARDS THE ENGINE AND THE
 *      DESK, NOT THE BOARD: this harness replays the board's calls and never
 *      mounts it, and in part A nothing calls the new code; the board is
 *      untouched and the round's git diff proves it. 1b: whether the desk off
 *      fixture and its harnesses equal the base (git diff --quiet against the
 *      sha the fixture was recorded from), PRINTED and not a check, as brief
 *      3.4 asks: the proof is the gate's own git diff line.
 *   THE WALK, for sections 2, 3, 4, 8 and 9: ten leagues (thirty with
 *      FLEET=full) of three seasons, desk on, the earned draft through the
 *      libraries' own presses, a seeded handful of this year's picks moved
 *      before each draft (a club holding none, a club holding four, his own
 *      among the moved half the time).
 *   2. THE LOTTERY THROUGH THE BIND. Every closed season gives the bind 30
 *      rows and the first round's sixteen (read by the harness off the series'
 *      names, by the bind off their numbers), and a lottery is drawn on every
 *      one. On twenty of them, 10,000 keyed lotteries each (40,000 with
 *      FLEET=full) through the bind's own order: each club's share of the first
 *      pick within 4.5 standard errors of the chance the harness works out from
 *      the TABLE (NBA_PICK_RULES, never the saved field) and the records, level
 *      clubs on the mean of the seeds they span; a club alone on its record is
 *      drawn on exactly its seed's chance.
 *   3. THE SLOT IS THE TRUTH. The saved order agrees with the season the
 *      harness saw (round one opens with the clubs out of the sixteen, then
 *      worst record first; round two worst record first); every pick the ledger
 *      holds is one slot, at its first owner's place, used by its holder; on
 *      the clock at N exactly N minus 1 slots are used; the class loses exactly
 *      the men signed and never runs dry; nobody is on two rosters; every row a
 *      run shows is a man now on that club at his scout's read.
 *   4. DRAWN ONCE. Opening the same season twice gives the identical block;
 *      opening again over a night in progress answers it as it stands and
 *      writes nothing; the block survives a JSON round trip and every press
 *      changes only `made` and `seen`; a draft replayed with the table swapped
 *      under the saved block is the same draft.
 *   5. THE INCENTIVE. On every closed season of the walk, before any pick
 *      moved, each of the thirty clubs in turn is the GM on a fresh desk,
 *      through the libraries' own presses (open, the class, Continue): his
 *      first selection is the best man left on his scout's read at his first
 *      slot. One class a season for all thirty (common draws). By band of five
 *      places in the season's finish, worst first, its pick number rises and
 *      its true rating falls at every band, each step above its floor (set
 *      from measured headroom, see the section's own comment); the OLD arm
 *      (he picks first from a class of 24 or more) is printed beside it, flat.
 *      Three classes a season on the quick walk, one on the full walk.
 *   6. THE CLASS. The curve's shape; today's twelve found in every class by
 *      replaying nbaDraftClass on a twin generator; every man after them held
 *      to the curve rating by rating; the mean true rating falls ten slots
 *      after ten; slots plus four, never over 70; the board's load guard.
 *   8. THE FALLBACK. Mid draft, a block broken at its year, its order, a
 *      slot, a `made` past the end or a `seen` that is not a boolean is never
 *      current and no press runs on it, and the old engine calls (the old draft
 *      on the class left, two rival batches) and the desk's summer finish on a
 *      valid league without a throw.
 *   9. NEED. Every rival choice is the man the rule picks on the ENGINE'S
 *      GRADE plus the pinned NEED_WEIGHT (2) a whole point of the engine's
 *      need, ties to the lower id, worked out here and never through the
 *      host; so no rival passes a man whose grade beats its choice by more
 *      than 2; and a rival short at a position takes it more often than one
 *      that is not, by more than the floor, at every position.
 *  10. THE SHARED HALF KNOWS NO SPORT. gmEarnedDraft.ts imports only the lift
 *      and names no sport in its code (comments stripped); neither library
 *      draws from Math.random or carries an address.
 *  12. THE DEALS SURVIVE THE SUMMER (the reviews of 2026-10-22, F1). Every
 *      man a walk's night signed, followed through the summer right after it:
 *      none signed under two seasons (the summer takes one off before he
 *      plays); his own all still his and none on his re-sign desk; a rival's
 *      still on his club unless the trim of a club over fifteen waived him;
 *      each still there on his deal less one season at the same money; and
 *      with knob (i) on, every second rounder at the minimum with exactly one
 *      season left. The ones are this harness's own, never the library's.
 *   7. THE TABLE. FLEET=full PLAYS the fleet below and writes each set's
 *      careers; SIM_NBA_EARNED_DRAFT_COMBINE=<dir> JUDGES the files. The arms:
 *      old (the board's draft of today, replayed as simNbaGmDesk's draftNight
 *      does), new (the earned draft through nbaDraftContinue, nbaDraftPick and
 *      nbaDraftByStaff, the class from nbaEarnedDraftClass) and arb (new, plus
 *      a FORCED swap of his first with the weakest club's on opening day
 *      every season: a CEILING on what a pick trade buys, never a price). The
 *      stop lines are the lead's of 2026-10-13 as the lead RULED THEM AGAIN on
 *      the step (d) table on 2026-10-21 (lead-rulings-1321-d.md; LINES below):
 *      S1 the mean nbaStrength at season 5 within 0.5, at season 10 from -0.5
 *      to +1.5 (the upside accepted as the cost of every club drafting every
 *      year); S2 men rated 85 or more at season 10 within 20 percent; S3 the
 *      two weakest starts' playoff seasons, seasons 2 to 5, PRINTED and never
 *      asserted (it measures the old draft's gift to the GM); S4 the two
 *      strongest starts' PLAYOFF seasons, seasons 2 to 10, the new arm's own
 *      AT LEAST 60 percent, the old arm printed beside it (their title share
 *      printed, never asserted); S5 section 5's rise at every band in every
 *      set; S6 CPU dead money a season under 3.0 $M (its cause: CPU firsts 13
 *      to 30 on the engine's four season deal, three of them played after the
 *      summer's season, cut by CPU clubs; a per slot rookie scale with team
 *      options for every club is the fix, after which the band returns under
 *      1.0)
 *      and tax payers a season within 0.5 of the old arm. The resolution rule
 *      (correction 8 (b)): the per set differences (the arm's own values for
 *      S4 and S6 dead) are the replicates, the error of the pooled value is
 *      their sd over root k and must be under a third of the line's `res`
 *      (its margin, or for the widened lines the old scale: 0.5, 10 and 1.0),
 *      and the two runs' pooled values within two errors of each other; else
 *      UNRESOLVED and the size the rule asks is printed. OUTSIDE is a STOP.
 *      The table prints between TABLE BEGIN and TABLE END for the notes, then
 *      what the lead reads beside it, never asserted.
 *  11. THE JUDGE ON KNOWN ANSWERS (every run). The verdict code the table runs
 *      through (judgeLine and its one comparison, inBand) judges a synthetic
 *      table whose answers are known: every asserted line inside and outside
 *      its band on both sides of every edge, S3 never judged. Without it the
 *      judge could only ever be seen to pass (the lead's ruling 7). Since the
 *      review of 2026-10-22 (F2) also the other half of the verdict: every
 *      asserted line UNRESOLVED (a spread of two res), RUNS DISAGREE (two
 *      runs a fifth of res apart) and NOT TWO RUNS (one run); what the table
 *      asserts of each verdict (lineHolds: PASS only); and the fleet's size
 *      (fleetShort: two runs of at least twelve sets, which the table now
 *      checks before any verdict, a fleet control's reduced fleet exempt).
 *
 * THE FLEET. Six user clubs, the two strongest, the two middle and the two
 * weakest by opening nbaStrength, on seed sets of ten seeds: 60 careers of ten
 * seasons a set. The auto GM takes the best man on his own scout's read,
 * leaves every contract to the staff's rule and trims for tip off the way
 * simNbaGmDesk.mjs does. SIM_NBA_EARNED_DRAFT_FLEET=quick (the default) runs
 * the gate lane: no fleet. FLEET=full runs the fleet, SIM_NBA_EARNED_DRAFT_SETS
 * sets (default 12), sharded by SIM_NBA_EARNED_DRAFT_SHARD=k/n (sets k, k+n,
 * ...), each shard's careers written as JSON into SIM_NBA_EARNED_DRAFT_OUT when
 * set; SIM_NBA_EARNED_DRAFT_COMBINE=<dir> reads every shard file in it and
 * prints the table. Every career plays in a loaded copy of the bundle of its
 * own whose id epoch is seeded by the career and the run, so both arms of one
 * career walk the same ids and play the same season one, and a career's
 * numbers do not depend on how the fleet was sharded. The second run of the
 * same sets is SIM_NBA_EARNED_DRAFT_RUN=2: the same leagues with another id
 * epoch, so the scout's reads (a hash of the man's id) and the injuries (a
 * hash of it too) move. SIM_NBA_EARNED_DRAFT_ARMS picks the arms (old,new by
 * default; new alone under a control); SIM_NBA_EARNED_DRAFT_TUNE plays a
 * variant of the curve and the two knobs in the bundle only (JSON: curve as
 * [[from, to, lo, hi], ...], second, late), its files tagged by
 * SIM_NBA_EARNED_DRAFT_TAG; SIM_NBA_EARNED_DRAFT_VS names the arm a COMBINE
 * holds against old (new by default). A control's own fleet (FLEET=full under
 * SIM_NBA_EARNED_DRAFT_CONTROL=fatclass or bestfirst) writes new-<control>
 * files; a COMBINE with VS=new-<control> must land OUTSIDE a line (exit 1,
 * FIRED, the misses in errors) and exits 2 when it does not.
 * SIM_NBA_EARNED_DRAFT_PROBE_SEEDS=n is a builder's smoke run only: n seeds a
 * set and the quick walk, so section 7 is red by construction.
 *
 * Controls, through SIM_NBA_EARNED_DRAFT_CONTROL, applied to the source at
 * bundle time and never on disk, each asserted to find its target exactly
 * once. With a control on the harness exits 1 when exactly its sections went
 * red (the last line says FIRED), 2 when they did not, 3 when the control
 * cannot run, 4 on a crash. =all runs every control and exits 0 only if every
 * one fired.
 *   touchseason  one stray draw before the playoffs                    (1)
 *   flatodds     the bound pick rules hand every club one weight          (2)
 *   playinmade   a play-in game counts as the playoffs: no night opens    (2, 3, 4, 5, 8, 9, 12)
 *   gmfirst      the night is drawn as if his club had the worst record   (3, 5)
 *   bestfirst    the order drawn best record first (records swapped)      (3, 5)
 *   origholder   every slot used by its first owner                       (3)
 *   shortclass   a class four short of the picks                          (3, 6)
 *   shownread    the run prints the engine's grade                        (3)
 *   redraw       the order's key takes a Math.random draw                 (4)
 *   reopen       a second open over a night in progress draws it afresh  (4)
 *   fatclass     the curve is the old class's 70 to 87                    (6)
 *   flatclass    the curve flattened to one range                         (6)
 *   nocurve      the class ignores the curve                              (6)
 *   trustblock   any block on the desk is trusted                         (3, 8)
 *   noneed       rivals choose on their read alone                        (9)
 *   rivalscout   rivals choose on his scout's read, not the engine's grade (9)
 *   bigneed      the engine's need weight 20 instead of 2                 (9)
 *   sportname    the shared half names a sport (in memory)                (10)
 *   foreignimport the shared half imports a module outside the lift      (10)
 *   elevenhead   the class's head is eleven of today's men, not twelve    (6)
 *   summerdeal   knob (i) writes the old one season deal on draft night   (12)
 * The judge's controls slip inBand in a COPY of this file (each target found
 * exactly once, the copy's paths pinned to this tree) and run the copy whole
 * with no control; section 11 must go red, and judgeflip under a COMBINE also
 * turns the real fleet's table red (11 and 7):
 *   judgetwo     the two sided band loses its absolute value (a sign slip) (11)
 *   judgerange   the range's two ends joined by or (always inside)       (11)
 *   judgefloor   the floor compared against its own negative             (11)
 *   judgecap     the cap compared against the value's negative           (11)
 *   judgeflip    the two sided band turned inside out                    (11; 11 and 7 under a COMBINE)
 *   judgeres     the resolution rule at three res, not a third            (11)
 *   judgeagree   the two runs agree within 200 errors, not two            (11)
 *   judgepass    the table holds a line on any verdict but OUTSIDE        (11)
 *   judgefleet   a fleet of one set a run is whole                        (11)
 * Two checks have no control, on purpose: section 4's JSON round trip (the
 * block is the lift's plain data, which no edit outside the lift can make
 * change under JSON) and its swapped table (no press reads the table today,
 * so nothing outside the lift can make it fail). They stay as tripwires for
 * part B, which is the first to give a press a reason to read either.
 *
 * MEASURED 2026-10-12 (quick walk, fixed seeds, so the same on every run of
 * this commit), failures each control put in its sections, on the builder's
 * PC and again after the fix pass on runners r1321-fix-b and r1321-fix-d:
 *   1   30 seasons, 315,516 draws held to 48cb9d4b; touchseason 41.
 *   2   30 seasons, a lottery on every one, none free of level records (real
 *       fields rarely are); 280 club shares over 20 seasons, the worst 3.26
 *       standard errors (band 4.5); flatodds 461, playinmade 32.
 *   3   30 drafts, 1,800 picks, 150 picks moved first (16 his), a club with
 *       three or more and a club with none in all 30, on the clock 46 times,
 *       561 rival rows; gmfirst 60, origholder 192, shortclass 30, shownread
 *       545, playinmade 32, trustblock 284.
 *   4   30 nights, 30 opened again after Continue, 10 tables swapped; redraw
 *       30, reopen 30, playinmade 1.
 *   6   1,500 classes of 64, worst 1.63 standard errors from the curve, steps
 *       by ten slots 5.11, 3.04, 2.16, 1.72, 1.70, 1.70 (floor 1.19); fatclass
 *       3, flatclass 3, nocurve 22, shortclass 1,519, elevenhead 1,501.
 *   8   50 broken blocks, 50 finished the old way; trustblock 100, playinmade 1.
 *   9   1,754 rival choices, all 1,754 the rule's man on the engine's grade,
 *       none past a better grade by more than 2; taken when short vs not, G
 *       31.7, F 29.3, C 29.6 points (floor 20); noneed 4 (504 off the rule,
 *       the three lifts 4.4, -0.1, 0.9), rivalscout 2 (1,462 off the rule,
 *       1,131 past 2), bigneed 3 (the constant, 653 off the rule, 440 past 2),
 *       playinmade 4.
 *  10   sportname 1, foreignimport 1.
 * MEASURED 2026-10-21 (step (d), the tuned curve and knobs, runners r1321-j4 and r1321-j5, and the builder's PC):
 *   5   2,700 nights over 30 seasons x 3 classes; pick steps 3.29, 5.53, 4.32, 5.49, 5.05 (errors 0.24 to 0.32),
 *       rating steps 2.42, 7.40, 4.03, 0.60, 0.38 (errors 0.07 to 0.38); gmfirst, bestfirst and playinmade fire
 *       here; flatodds lands its first step at 2.25 and flatclass its last at 0.13, both clear of the floors.
 *   6   steps by ten slots on the tuned curve 11.25, 3.53, 0.33, 0.28, 0.58, 0.25 (floor 0.17).
 *   7   12 sets, two runs, old and new, the knobs on rivals only: S1 at 5, S2, S6 payers and S5 PASS; S1 at 10, S3,
 *       S4 and S6 dead OUTSIDE (the STOP; the table and why: docs/audits/ROUND-1321-NOTES.md). fatclass and
 *       bestfirst FIRED on sets 1 to 4.
 * MEASURED 2026-10-21, after the lead's rulings (the knobs on every club; fleet r1321-k1 and r1321-k2 on 1db74de3,
 * judged by r1321-k5 on 2ffb7cc7), 12 sets, two runs, new minus old run by run (error), every line resolved:
 *   S1 at 5 +0.26 / +0.25 (0.01), band 0.5: PASS.      S1 at 10 +0.98 / +0.98 (0.01), band -0.5 to +1.5: PASS.
 *   S2 +2.6 / +2.1 (0.2), band 21.2: PASS.              S3 -38.2 / -37.6 (1.4, 1.3): PRINTED (old 81.8 / 80.9).
 *   S4 the arm's own 65.9 / 64.6 (1.0, 0.8), floor 60: PASS, 5.3 points (about five errors) clear; old 100.0.
 *   S6 dead the arm's own 2.47 / 2.52 (0.02), under 3.0: PASS.   S6 payers -0.39 / -0.39 (0.02), band 0.5: PASS,
 *   0.11 from its edge (about five errors).   S5 24 of 24 sets: PASS.   No retune (ruling 5's condition not met).
 *   Fleet controls on sets 1 to 4: fatclass FIRED (S1 at 5 by 2.22, S1 at 10 by 3.85, S2 by 35.4, payers by
 *   10.70, S5 in 2 sets); bestfirst FIRED on S5 alone (4 of 4 sets; with S3 printed and its S4 at 70.4 over the
 *   floor, S5 is the line that holds an order that does not earn, and sections 3 and 5 hold it on the quick walk).
 *   Section 11: 22 known answers. The judge's controls on the quick walk and under a COMBINE of that fleet
 *   (r1321-k5): judgetwo 3, judgerange 2, judgefloor 1, judgecap 1 failures (11); judgeflip 12 (11), and 12 and 3
 *   under the COMBINE (11 and 7: S1 at 5, S2 and payers judged OUTSIDE).
 *   controls on the quick walk after the rulings, runner r1321-k8 on 2ffb7cc7, all 25 fired in exactly their
 *       sections; the symmetric knobs moved a few counts from the list below (flatodds 455, gmfirst 60 and 2,
 *       bestfirst 90 and 4, shownread 465, the rest the same), and the judge's five: judgetwo 3, judgerange 2,
 *       judgefloor 1, judgecap 1, judgeflip 12 (11).
 *   controls on the quick walk, runner r1321-j6 on f9f28256, all 20 fired in exactly their sections:
 *       touchseason 41 (1); fatclass 3 (6); nocurve 19 (6); flatodds 441 (2); playinmade 32, 32, 1, 12, 1, 4
 *       (2, 3, 4, 5, 8, 9); gmfirst 59 and 2 (3, 5); bestfirst 90 and 5 (3, 5); origholder 192 (3); shortclass
 *       1,515 and 30 (6, 3); shownread 479 (3); redraw 30 (4); reopen 30 (4); trustblock 284 and 100 (3, 8);
 *       noneed 4, rivalscout 2, bigneed 3 (9); sportname 1, foreignimport 1 (10); elevenhead 1,502 (6);
 *       flatclass 2 (6).
 * MEASURED 2026-10-22, the fix pass of the two step (d) reviews (knob (i) at one season plus the summer's; fleet
 * r1321-fx-f1 and r1321-fx-f2 on d25c7c72, judged by r1321-fx-c on 26fe2f39), 12 sets, two runs:
 *   S1 at 5 +0.27 / +0.26 (0.01): PASS.   S1 at 10 +0.96 / +0.98 (0.01): RUNS DISAGREE (gap 0.0225 against
 *   0.0154 allowed, 2.19 errors of the difference; over 60 errors inside its band).   S2 +2.2 / +2.3 (0.2): PASS.
 *   S3 -37.7 / -37.5: PRINTED.   S4 63.8 / 64.9 (1.0, 0.9): PASS.   S6 dead 2.90 / 2.92 (0.02, 0.03), under 3.0:
 *   PASS, about three errors from the cap.   S6 payers -0.36 / -0.36 (0.01): PASS.   S5 23 of 24 sets: OUTSIDE in
 *   run 2 set 10 (its last rating step 0.0; pooled 0.35, error 0.03, per set sd 0.15). Both reds measured as coin
 *   tosses of the judge as ruled (docs/audits/ROUND-1321-NOTES.md, the fix pass): a STOP for the lead, no retune.
 *   Fleet controls (sets 1 to 4, r1321-fx-fc): fatclass FIRED (S1 at 5 by 2.27, S1 at 10 by 3.90, S2 by 35.7,
 *   payers by 10.33); bestfirst FIRED (S5 in 4 sets). Quick walk (r1321-fx-b on 26fe2f39): 11 sections, 212,168
 *   checks; section 12 1,800 deals (46 his, 1,745 kept, 55 trimmed, 858 second rounders, 30 his); section 11 46
 *   known answers, 38 verdicts held; CONTROL=all 30 fired, the new ones summerdeal 2,075 (12), judgeres 12,
 *   judgeagree 12, judgepass 18, judgefleet 2 (11); the rest as listed for r1321-k8.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const J = v => JSON.stringify(v);
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nbaEarnedDraftFixture.json');
const NAME = 'simNbaEarnedDraft';

const CONTROL = process.env.SIM_NBA_EARNED_DRAFT_CONTROL || '';
const RECORD = process.env.SIM_NBA_EARNED_DRAFT_RECORD || '';
const FLEET = process.env.SIM_NBA_EARNED_DRAFT_FLEET || 'quick';
const COMBINE = process.env.SIM_NBA_EARNED_DRAFT_COMBINE || '';
const OUT = process.env.SIM_NBA_EARNED_DRAFT_OUT || '';
/* The fleet's arms (FLEET=full): old (today's draft), new (the earned draft through the libraries), arb (the earned
   draft with a forced swap of firsts on opening day, a CEILING). Under a control only the new arm is worth playing. */
const ARMS = (process.env.SIM_NBA_EARNED_DRAFT_ARMS || (CONTROL ? 'new' : 'old,new')).split(',').filter(Boolean);
/* A label for the files of the non old arms: the control's name, or a tuning variant's own tag. */
const TAG = process.env.SIM_NBA_EARNED_DRAFT_TAG || CONTROL || '';
/* A tuning variant, applied to the bundle and never on disk: JSON with any of
   { "curve": [[from, to, lo, hi], [..], [..]], "second": true|false, "late": { "from": n, "cap": n } | null }. */
const TUNE = process.env.SIM_NBA_EARNED_DRAFT_TUNE || '';
/* COMBINE: the arm label held against the old arm (new, new-<tag>, arb). */
const VS = process.env.SIM_NBA_EARNED_DRAFT_VS || 'new';
/* A PROBE only (a builder's smoke run of the fleet code): this many seeds a set and the quick walk. A set is then
   short of 60 careers and section 7 says so, so a probe can never pass for a fleet. */
const PROBE = Number(process.env.SIM_NBA_EARNED_DRAFT_PROBE_SEEDS || 0);

/* A crash is not a result: without this a throw exits 1, which is what a control that fired exits with. */
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, error => {
    console.error(error);
    console.log(`${NAME}: CRASHED${CONTROL ? ` under control ${CONTROL}` : ''}. Not a result.`);
    process.exit(4);
  });
}
const cannotRun = why => { console.error(`control cannot run: ${why}`); console.log(`${NAME}: control ${CONTROL || '(none)'} cannot run.`); process.exit(3); };

const SECTION_NAMES = {
  1: 'what must not move: the season before the draft, and the desk off fixture',
  2: 'the lottery through the bind: the sixteen off the numbers, drawn every season, the table\'s chances',
  3: 'the slot is the truth: every pick used once by its holder at its first owner\'s place',
  4: 'drawn once: the block survives a round trip, every press, a second open and a swapped table',
  5: 'the incentive: the worse the finish, the earlier and the better his first selection',
  6: 'the class: today\'s twelve, then the curve, slots plus four, never over 70',
  8: 'the fallback: a block broken mid draft finishes the old way on a valid league',
  9: 'need: a club short at a position leans to it, and never past a better read by more than the weight',
  10: 'the shared half names no sport; neither library draws from Math.random or carries an address',
  12: 'the deals survive the summer: every draft night deal is played, a second rounder\'s one season at the minimum',
  11: 'the judge on known answers: the two arm table\'s verdict on both sides of every edge of every band',
  7: 'the table: the old and new arms on the fleet, and the stop lines (FLEET=full plays, COMBINE judges)',
};

/* control -> { expect: the sections that must go red, swaps: { file key: [[from, to]] } } */
const CONTROLS = {
  touchseason: { expect: [1], swaps: { engine: [['  const confWinners: string[] = [];', '  rng(); const confWinners: string[] = [];']] } },
  /* every man after today's twelve drawn as the old class draws them, 70 to 87 */
  fatclass: { expect: [6], swaps: { engine: [
    ['  { from: 13, to: 30, ovr: [67, 72] },', '  { from: 13, to: 30, ovr: [70, 87] },'],
    ['  { from: 31, to: 45, ovr: [66, 69] },', '  { from: 31, to: 45, ovr: [70, 87] },'],
    ['  { from: 46, to: 70, ovr: [66, 68] },', '  { from: 46, to: 70, ovr: [70, 87] },'],
  ] } },
  /* the class ignores the curve and draws every man after the twelve as the old class does */
  nocurve: { expect: [6], swaps: { engine: [['    const trueOvr = lo + Math.floor(rng() * (hi - lo + 1));', '    const trueOvr = 70 + Math.floor(rng() * 18) + 0 * (lo + hi);']] } },
  /* the bound pick rules hand every club one weight under the same table name */
  flatodds: { expect: [2], swaps: { bind: [['  return buildDraftOrder(season, rules, nbaGamePickRules(), key ?? draftSeasonKey(season, rules.id));',
    '  return buildDraftOrder(season, rules, { ...nbaGamePickRules(), lottery: { ...nbaGamePickRules().lottery!, odds: nbaGamePickRules().lottery!.odds.map(() => 100 / 14) } }, key ?? draftSeasonKey(season, rules.id));']] } },
  /* a play-in game counts as making the playoffs, so no season is drawn and no night opens (and section 12, which
     never passes empty, has no draft night deal to follow) */
  playinmade: { expect: [2, 3, 4, 5, 8, 9, 12], swaps: { bind: [['    if (s && (s.homeWins === 4 || s.awayWins === 4)) { made.add(s.home); made.add(s.away); }',
    '    if (s && (s.homeWins >= 1 || s.awayWins >= 1)) { made.add(s.home); made.add(s.away); }']] } },
  /* his slots put first: the night is drawn on a season where his club had the worst record */
  gmfirst: { expect: [3, 5], swaps: { bind: [['  const season = nbaDraftSeason(league, series);\n  const order = season ? nbaDraftOrder(season) : null;',
    '  const real = nbaDraftSeason(league, series);\n  const season = real && { ...real, rows: real.rows.map(r => (r.id === me ? { ...r, wins: 0, losses: 82 } : r)) };\n  const order = season ? nbaDraftOrder(season) : null;']] } },
  /* the order drawn best record first: every club's wins and losses swapped before the order is built, so within the
     lottery and within the sixteen the better club picks first (the brief's `bestfirst`, rivals in reverse order) and
     the night still validates */
  bestfirst: { expect: [3, 5], swaps: { bind: [['  const season = nbaDraftSeason(league, series);\n  const order = season ? nbaDraftOrder(season) : null;',
    '  const real = nbaDraftSeason(league, series);\n  const season = real && { ...real, rows: real.rows.map(r => ({ ...r, wins: r.losses, losses: r.wins })) };\n  const order = season ? nbaDraftOrder(season) : null;']] } },
  /* every slot used by its first owner, whoever holds the pick */
  origholder: { expect: [3], swaps: { bind: [['draftSlots(order, nbaPicksOf(desk, league), league.season, 2)', 'draftSlots(order, nbaPicksOf(desk, league), league.season, 2).map(s => ({ ...s, holder: s.orig }))']] } },
  /* a class four short of the picks instead of four over */
  shortclass: { expect: [3, 6], swaps: { engine: [['  return Math.min(70, Math.max(0, Math.floor(slots)) + 4);', '  return Math.min(70, Math.max(0, Math.floor(slots)) - 4);']] } },
  /* the run prints the engine's grade, not his scout's read */
  shownread: { expect: [3], swaps: { bind: [['    shown: scout,', '    shown: p => p.grade,']] } },
  /* the order's key takes a Math.random draw, so the same season draws another night */
  redraw: { expect: [4], swaps: { bind: [['  return buildDraftOrder(season, rules, nbaGamePickRules(), key ?? draftSeasonKey(season, rules.id));',
    '  return buildDraftOrder(season, rules, nbaGamePickRules(), `${key ?? draftSeasonKey(season, rules.id)}|${Math.random()}`);']] } },
  /* a second open over a night in progress draws a fresh night (review 2026-10-12, the reopen probe) */
  reopen: { expect: [4], swaps: { bind: [['  if (current) return { desk, night: current };', '  if (current && !current) return { desk, night: current };']] } },
  /* any block on the desk is trusted. Red in 3 as well since the fix pass: opening answers the night already on the
     desk (nbaDraftNightOf first), so a validator that trusts any block hands the next season last season's spent
     night, and section 3 sees its slots disagree with the ledger and the order */
  trustblock: { expect: [3, 8], swaps: { bind: [['  return isGmDraftNight(raw, Object.keys(league.teams), league.season) ? raw : null;', '  return raw as GmDraftNight;']] } },
  /* rivals choose on their read alone */
  noneed: { expect: [9], swaps: { bind: [['    needWeight: NBA_DRAFT_NEED_WEIGHT,', '    needWeight: 0,']] } },
  /* every rival chooses on HIS scout's read instead of the engine's own grade (review 2026-10-12, mutation m1) */
  rivalscout: { expect: [9], swaps: { bind: [['    read: (p, club) => (club === ctx.me ? scout(p) : p.grade),', '    read: scout,']] } },
  /* the need weight ten times the size A5 calls small (review 2026-10-12, mutation m5) */
  bigneed: { expect: [9], swaps: { engine: [['export const NBA_DRAFT_NEED_WEIGHT = 2;', 'export const NBA_DRAFT_NEED_WEIGHT = 20;']] } },
  /* the shared half names a sport (in memory, the shape of simGmDraftOrder's mounted control) */
  sportname: { expect: [10] },
  /* the shared half imports a module outside the lift, one that names no sport (in memory), so the import
     allowlist fires on its own and not the sport name check (review 2026-10-12) */
  foreignimport: { expect: [10] },
  /* the class's head is eleven of today's men, not twelve (review 2026-10-12, mutation m7) */
  elevenhead: { expect: [6], swaps: { engine: [['  const out = nbaDraftClass(rng, 24, taken).slice(0, Math.min(12, size));', '  const out = nbaDraftClass(rng, 24, taken).slice(0, Math.min(11, size));']] } },
  /* knob (i) back to the one season deal on draft night, which the summer after takes off before he plays (the
     reviews of 2026-10-22, F1: every second rounder released, re-signed or gone before a game) */
  summerdeal: { expect: [12], swaps: { bind: [['        man.years = NBA_SECOND_ROUND_SEASONS + NBA_DRAFT_NIGHT_SUMMER;', '        man.years = NBA_SECOND_ROUND_SEASONS;']] } },
  /* the curve flattened: every band one range */
  flatclass: { expect: [6], swaps: { engine: [
    ['  { from: 13, to: 30, ovr: [67, 72] },', '  { from: 13, to: 30, ovr: [66, 72] },'],
    ['  { from: 31, to: 45, ovr: [66, 69] },', '  { from: 31, to: 45, ovr: [66, 72] },'],
    ['  { from: 46, to: 70, ovr: [66, 68] },', '  { from: 46, to: 70, ovr: [66, 72] },'],
  ] } },
  /* THE JUDGE (the lead's ruling 7 of 2026-10-21: a judge with no control is a harness that cannot fail). The judge
     lives in this file, not in the bundle, so each of these slips one comparison of inBand in a COPY of this file
     and runs the copy whole with no control: section 11's known answers must go red. The first four make the judge
     too lenient (a sign slip or an always true band), which only a known OUTSIDE answer can catch; judgeflip turns
     the two sided band inside out, which also turns the real fleet red under a COMBINE (section 7). The targets are
     written with escaped quotes so the line they name is in this file exactly once. */
  judgetwo: { expect: [11], self: [['  if (line.kind === \'two\') return Math.abs(dbar) <= margin;', '  if (line.kind === \'two\') return dbar <= margin;']] },
  judgerange: { expect: [11], self: [['  if (line.kind === \'range\') return dbar >= line.lo && dbar <= line.hi;', '  if (line.kind === \'range\') return dbar >= line.lo || dbar <= line.hi;']] },
  judgefloor: { expect: [11], self: [['  if (line.kind === \'floor\') return dbar >= line.floor;', '  if (line.kind === \'floor\') return dbar >= -line.floor;']] },
  judgecap: { expect: [11], self: [['  if (line.kind === \'cap\') return dbar < margin;', '  if (line.kind === \'cap\') return -dbar < margin;']] },
  judgeflip: { expect: COMBINE ? [11, 7] : [11], self: [['  if (line.kind === \'two\') return Math.abs(dbar) <= margin;', '  if (line.kind === \'two\') return Math.abs(dbar) > margin;']] },
  /* The rest of the verdict (review 2026-10-22, F2): the resolution rule, the two runs' agreement, what the table
     asserts of a verdict, and the fleet's size. Each target is split in two strings here so that the line it names
     is in this file exactly once. A real fleet that passes is untouched by all four, so under a COMBINE only
     section 11 goes red. */
  judgeres: { expect: [11], self: [['p.se < res' + ' / 3', 'p.se < res * 3']] },
  judgeagree: { expect: [11], self: [['perRun[1].d) <= 2' + ' * maxSe', 'perRun[1].d) <= 200 * maxSe']] },
  judgepass: { expect: [11], self: [['  return verdict === \'PASS\';', '  return verdict !== \'OUTSIDE\';']] },
  judgefleet: { expect: [11], self: [['const FLEET_MIN_SETS' + ' = 12;', 'const FLEET_MIN_SETS = 1;']] },
};

if (CONTROL === 'all') {
  const self = fileURLToPath(import.meta.url);
  let fired = 0;
  const lines = [];
  for (const name of Object.keys(CONTROLS)) {
    const run = spawnSync(process.execPath, [self], { env: { ...process.env, SIM_NBA_EARNED_DRAFT_CONTROL: name }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const last = String(run.stdout ?? '').trim().split('\n').pop() ?? '';
    const ok = run.status === 1 && last.includes(` CONTROL ${name} FIRED.`);
    if (ok) fired += 1;
    lines.push(`   ${ok ? 'fired ' : 'NOT OK'} exit ${run.status}  ${name.padEnd(14)} ${last.slice(0, 150)}`);
  }
  console.log(lines.join('\n'));
  const total = Object.keys(CONTROLS).length;
  console.log(fired === total ? `${NAME} controls: all ${total} fired, each in exactly its own sections.` : `${NAME} controls: ${total - fired} of ${total} DID NOT FIRE as expected.`);
  process.exit(fired === total ? 0 : 1);
}
if (CONTROL && !CONTROLS[CONTROL]) cannotRun(`${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, or all)`);
if (CONTROL && RECORD) cannotRun('a control and a recording at once');
if (!['quick', 'full'].includes(FLEET)) cannotRun(`SIM_NBA_EARNED_DRAFT_FLEET=${FLEET} is not quick or full`);

/* A JUDGE CONTROL: write a copy of this file with the control's slip (each target asserted exactly once, and the
   copy's two paths pinned to this tree), run it whole with no control, and read which sections it turned red.
   Nothing in the tree changes; the copy lives in a folder of this run's own and is removed after. */
if (CONTROL && CONTROLS[CONTROL].self) {
  let text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const pins = [
    ['import \'./lib/seedRandom.mjs\';', `import ${J(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'seedRandom.mjs')).href)};`],
    ['const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), \'..\');', `const ROOT = ${J(ROOT)};`],
  ];
  for (const [from, to] of [...pins, ...CONTROLS[CONTROL].self]) {
    const n = text.split(from).length - 1;
    if (n !== 1) cannotRun(`this harness holds the line ${CONTROL} rewrites ${n} times, not once (${from.slice(0, 70)})`);
    const next = text.split(from).join(to);
    if (next === text) cannotRun(`${CONTROL} changed nothing`);
    text = next;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${NAME}-${CONTROL}-`));
  /* The copy keeps this file's name: seedRandom seeds Math.random from the script's file name, so the copy walks
     exactly the stream the harness itself walks and only the judge differs. */
  const copy = path.join(dir, `${NAME}.mjs`);
  fs.writeFileSync(copy, text);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}, a copy of this harness with its judge slipped (${copy}). Sections ${CONTROLS[CONTROL].expect.join(' and ')} must go red and no other.`);
  const run = spawnSync(process.execPath, [copy], { env: { ...process.env, SIM_NBA_EARNED_DRAFT_CONTROL: '' }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  const out = String(run.stdout ?? '').trim().split('\n');
  const said = out.filter(l => /^ {3}section \d+: /.test(l));
  const red = said.filter(l => !l.endsWith(': green')).map(l => Number(l.match(/section (\d+)/)[1]));
  const count = said.filter(l => !l.endsWith(': green')).map(l => l.split(': ')[1]);
  const last = out[out.length - 1] ?? '';
  console.log(said.join('\n'));
  console.log(String(run.stderr ?? '').split('\n').filter(l => l.startsWith('  FAIL [')).slice(0, 12).join('\n'));
  console.log(`   the copy exited ${run.status}: ${last.slice(0, 160)}`);
  const want = CONTROLS[CONTROL].expect;
  const exact = run.status === 1 && last.includes(`${NAME}: RED in section`) && red.length === want.length && want.every(n => red.includes(n));
  console.log(exact
    ? `${NAME}: CONTROL ${CONTROL} FIRED. Red in section ${red.join(' and ')} (${count.join(' and ')}).`
    : `${NAME}: CONTROL ${CONTROL} DID NOT FIRE as expected: the copy exited ${run.status}, red in [${red.join(', ')}], expected [${want.join(', ')}].`);
  process.exit(exact ? 1 : 2);
}

/* ---- the bundle, in a folder of this run's own so two runs cannot mix ---- */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) cannotRun(`no node_modules with esbuild above ${ROOT}`);
    d = up;
  }
}
const NM = modulesDir();
const FILES = {
  engine: 'src/lib/nbaFrontOffice.ts',
  desk: 'src/lib/nbaGmDesk.ts',
  bind: 'src/lib/nbaEarnedDraft.ts',
  shared: 'src/lib/gmEarnedDraft.ts',
};
const overrides = new Map();
const keyOf = abs => path.resolve(abs).toLowerCase();
if (CONTROL) {
  for (const [which, pairs] of Object.entries(CONTROLS[CONTROL].swaps ?? {})) {
    let src = fs.readFileSync(path.join(ROOT, FILES[which]), 'utf8').replaceAll('\r\n', '\n');
    for (const [from, to] of pairs) {
      const n = src.split(from).length - 1;
      if (n !== 1) cannotRun(`${FILES[which]} holds the line ${CONTROL} rewrites ${n} times, not once (${from.slice(0, 70)})`);
      const next = src.replace(from, to);
      if (next === src) cannotRun(`${CONTROL} changed nothing`);
      src = next;
    }
    overrides.set(keyOf(path.join(ROOT, FILES[which])), src);
  }
}
/* TUNING (step (d)): a variant of the curve and the two knobs, in the bundle only. Each edit must change the source. */
let tune = null;
if (TUNE) {
  try { tune = JSON.parse(TUNE); } catch { cannotRun('SIM_NBA_EARNED_DRAFT_TUNE is not JSON'); }
  if (!TAG) cannotRun('a tuning variant needs SIM_NBA_EARNED_DRAFT_TAG, so its files cannot pass for the new arm');
  const edit = (which, fn) => {
    const k = keyOf(path.join(ROOT, FILES[which]));
    const src = overrides.get(k) ?? fs.readFileSync(path.join(ROOT, FILES[which]), 'utf8').replaceAll('\r\n', '\n');
    const next = fn(src);
    if (next === src) cannotRun(`the tune changed nothing in ${FILES[which]}`);
    overrides.set(k, next);
  };
  if (tune.curve) {
    edit('engine', src => {
      const re = /(export const NBA_EARNED_CLASS_CURVE[^=]*= \[\n)([\s\S]*?)(\n\];)/;
      if (!re.test(src)) cannotRun('the engine holds no curve to tune');
      return src.replace(re, (_, head, _body, tail) => `${head}${tune.curve.map(([f, to, lo, hi]) => `  { from: ${f}, to: ${to}, ovr: [${lo}, ${hi}] },`).join('\n')}${tail}`);
    });
  }
  if ('second' in tune || 'late' in tune) {
    edit('bind', src => {
      const re = /  secondOnMin: (true|false),\n  latePot: [^\n]*,\n/;
      const m = src.match(re);
      if (!m) cannotRun('the library holds no knobs to tune');
      const second = 'second' in tune ? !!tune.second : m[1] === 'true';
      const late = 'late' in tune ? (tune.late ? `{ from: ${tune.late.from}, cap: ${tune.late.cap} }` : 'null') : m[0].split('latePot: ')[1].split(',\n')[0];
      return src.replace(re, `  secondOnMin: ${second},\n  latePot: ${late},\n`);
    });
  }
}
/* RECORDING: every src file the bundle reads comes from the base commit, so the fixture is the base's own season. */
const fromRef = rel => {
  try { return execFileSync('git', ['show', `${RECORD}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
};
let recordedFiles = 0;

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), `${NAME}-`)).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
fs.writeFileSync(`${WORK}/entry.mjs`, `
export * as E from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nbaGmDesk.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export { nbaCloseSeasonStats } from '${ROOT_URL}/src/lib/nbaSeasonStats.ts';
export { NBA_OPENING_RATINGS } from '${ROOT_URL}/src/data/nbaOpeningRatings.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { deadCapUsed } from '${ROOT_URL}/src/lib/frontOfficeCuts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as GD from '${ROOT_URL}/src/lib/gmDesk.ts';
${RECORD ? '' : `export * as N from '${ROOT_URL}/src/lib/nbaEarnedDraft.ts';
export * as G from '${ROOT_URL}/src/lib/gmEarnedDraft.ts';`}
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [`${WORK}/entry.mjs`], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, outfile: `${WORK}/bundle.cjs`, logLevel: 'error',
  plugins: [{
    name: 'swap',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const loader = args.path.endsWith('.tsx') ? 'tsx' : 'ts';
        const hit = overrides.get(keyOf(args.path));
        if (hit !== undefined) return { contents: hit, loader };
        if (!RECORD) return undefined;
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (rel.startsWith('..')) return undefined;
        const old = fromRef(rel);
        if (old === null) return undefined;
        recordedFiles += 1;
        return { contents: old, loader };
      });
    },
  }],
});
/* Production is off limits: refuse to run a bundle that carries the database client. */
{
  const text = fs.readFileSync(`${WORK}/bundle.cjs`, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) if (text.includes(host)) cannotRun(`the bundle names ${host}`);
}
const BUNDLE = `${WORK}/bundle.cjs`;
const requireHere = createRequire(import.meta.url);
const M = requireHere(BUNDLE);
const { E, D, S, N, G, NBA_OPENING_RATINGS, leagueNames } = M;
if (RECORD) console.log(`RECORDING from ${RECORD}: ${recordedFiles} src files read from that commit`);
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}. Sections ${CONTROLS[CONTROL].expect.join(' and ')} must go red and no other.`);

/* ---- the verdict ---- */
const failures = {};
const shown = {};
let section = 0;
let checks = 0;
const ran = [];
function open(n) { section = n; ran.push(n); failures[n] = 0; shown[n] = 0; console.log(`${n}) ${SECTION_NAMES[n]}`); }
function fail(message) {
  failures[section] += 1;
  if (shown[section] < 8) { shown[section] += 1; console.error(`  FAIL [${section}]: ${message}`); }
}
function check(ok, message) { checks += 1; if (!ok) fail(typeof message === 'function' ? message() : message); }

/* ---- seeded draws and the board's own call order ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** The generator with its calls counted: section 1 holds the count, not only the result. */
function counted(rng) {
  const f = () => { f.calls += 1; return rng(); };
  f.calls = 0;
  return f;
}
/* Ids carry a per process epoch (entityIds.ts); a hash takes it out and keeps the counter. */
const hashOf = v => crypto.createHash('sha1').update(J(v).replace(/"n[0-9a-z]+-(\d+)"/g, '"n-$1"')).digest('hex');
/* Every club, by id, without building a league (that would mint ids before section 1). */
const CLUBS = [...E.EAST, ...E.WEST].sort();

/* Every helper below takes X, one loaded copy of the bundle: section 1 uses the first, and every career of the
   fleet gets a fresh copy (freshCopy) so its ids, and so its scout's reads, do not depend on the careers before it. */

/** The board will not tip off a roster over fifteen: the GM waives the weakest (simNbaGmDesk.mjs, trimForTipOff). */
function trimForTipOff(X, lg, team) {
  const mine = lg.teams[team];
  while (X.E.nbaTipOffRefusal(mine)) {
    const down = [...mine.players].sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
    if (!X.E.nbaRelease(mine, lg.freeAgents, down.id)) break;
  }
}

/** The close of a season as the board runs it: the playoffs, the champion, the tax and the season's lines. */
function closeSeason(X, lg, rng, edges) {
  const po = X.E.runNbaPlayoffs(lg, rng, edges);
  lg.champions.push({ season: lg.season, team: po.champion });
  const taxes = X.E.nbaAssessTax(lg);
  X.nbaCloseSeasonStats(lg);
  return { series: po.series, champion: po.champion, taxes };
}

/** One season with the desk on, in the board's order, to the press of "Go to the draft". The fleet's GM makes no
    trade. `atTipOff` sees the league once every club has tipped off. */
function seasonToDraft(X, lg, team, desk, rng, atTipOff) {
  for (;;) {
    if (lg.round === 1) {
      trimForTipOff(X, lg, team);
      X.E.nbaTipOff(lg, rng, team);
      if (atTipOff) atTipOff(lg);
    }
    X.E.simRound(lg, team, rng, X.D.nbaDeskRoundOptions(desk, lg, team));
    desk = X.D.nbaDeskAfterRound(desk, lg, team).desk;
    if (lg.round >= X.E.NBA_ROUNDS) break;
    lg.round += 1;
  }
  return { desk, ...closeSeason(X, lg, rng, X.D.nbaDeskEdges(desk, lg, team)) };
}

/* ================================================================== */
open(1);
{
  /* 1a. First, before anything else mints an id, so the recorder and the replay walk the same id stream. */
  const got = {};
  for (let s = 1; s <= 30; s += 1) {
    const team = CLUBS[(s - 1) % CLUBS.length];
    const rng = counted(mulberry32(s));
    const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
    const closed = seasonToDraft(M, lg, team, D.openNbaDesk(lg, team), rng);
    /* The postseason rides on the save beside the league (the board's `postseason`), so it is hashed with it. */
    got[s] = { team, league: hashOf([lg, closed.series, closed.taxes]), desk: hashOf(closed.desk), calls: rng.calls };
  }
  if (RECORD) {
    fs.writeFileSync(FIXTURE, `${JSON.stringify({ recordedFrom: RECORD, seeds: got }, null, 2)}\n`);
    console.log(`wrote scripts/data/nbaEarnedDraftFixture.json from ${RECORD}: 30 seasons to the draft, desk on`);
    process.exit(0);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  let calls = 0;
  for (let s = 1; s <= 30; s += 1) {
    const want = fixture.seeds?.[s];
    check(want && want.team === got[s].team, `seed ${s}: the fixture's user club is ${want?.team}, this run's ${got[s].team}`);
    check(want && want.league === got[s].league, `seed ${s}: the league at the draft is not the base's (${got[s].league.slice(0, 10)} vs ${String(want?.league).slice(0, 10)})`);
    check(want && want.desk === got[s].desk, `seed ${s}: the desk at the draft is not the base's (${got[s].desk.slice(0, 10)} vs ${String(want?.desk).slice(0, 10)})`);
    check(want && want.calls === got[s].calls, `seed ${s}: the season drew ${got[s].calls} numbers, the base ${want?.calls}`);
    calls += got[s].calls;
  }
  console.log(`   1a: 30 seasons to the draft, desk on, every club the user once: league, desk and ${calls} draws held to the base ${fixture.recordedFrom}`);
  /* 1b. The desk off path is held by simNbaGmDesk's own fixture (its check 1); here only whether it and its
     harnesses moved since the base, PRINTED and never a failing check, as brief 3.4 asks ("printed, not re-proven
     here"). The proof of decision 3 (a) is the gate's own `git diff --quiet <base> -- ...` line. As a check it went
     red by construction in part B, which edits nbaGmDesk.ts and simNbaGmDesk.mjs, and on a clone without the base
     sha (git exits 128): review 2026-10-12. */
  const held = ['scripts/data/nbaGmDeskFixture.json', 'scripts/simNbaGmDesk.mjs', 'scripts/simNbaDraftCapital.mjs', 'src/lib/nbaGmDesk.ts'];
  const diff = spawnSync('git', ['diff', '--quiet', fixture.recordedFrom, '--', ...held], { cwd: ROOT, encoding: 'utf8' });
  const said = diff.status === 0 ? 'all equal to the base' : diff.status === 1 ? 'one of them MOVED since the base' : 'git could not answer';
  console.log(`   1b: git diff --quiet ${fixture.recordedFrom} -- ${held.join(' ')}: exit ${diff.status}, ${said} (printed, not a check)`);
}

/* ================================================================== */
open(6);
{
  /* The class of an earned draft. Today's twelve are found by replaying nbaDraftClass on a twin of the generator,
     the old draft's own function, never a copy of the new one; every other man is held, number for number over
     the fleet of classes, to the curve the engine exports. */
  const CURVE = E.NBA_EARNED_CLASS_CURVE;
  /* THE CURVE'S SHAPE, whatever its tuned numbers: it covers every man from 13 to 70 once, in order; it falls band
     after band (both ends never up, the middle always down); and by the last pick it is at the minimum man's band
     (nbaMinimumMan rates 66 to 71, and 66 is the grade's own floor), so the class runs down to the end of a bench. */
  CURVE.forEach((b, i) => {
    check(b.from === (i === 0 ? 13 : CURVE[i - 1].to + 1) && b.to >= b.from && b.ovr[0] <= b.ovr[1], `the curve's band ${i + 1} (${J(b)}) does not follow the one before it`);
    if (i === 0) return;
    const a = CURVE[i - 1];
    check(b.ovr[0] <= a.ovr[0] && b.ovr[1] <= a.ovr[1] && b.ovr[0] + b.ovr[1] < a.ovr[0] + a.ovr[1], `the curve does not fall from band ${i} ${J(a.ovr)} to band ${i + 1} ${J(b.ovr)}`);
  });
  const tail = CURVE[CURVE.length - 1];
  check(tail.to === 70 && tail.ovr[0] >= 66 && tail.ovr[1] <= 72, `the curve's last band ${J(tail)} does not reach slot 70 at the minimum man's band (66 to 72)`);
  const SLOTS = 60;
  const N = 1500;
  const size = Math.min(70, SLOTS + 4);
  const observed = new Map();
  const bandSum = [];
  const bandN = [];
  let men = 0;
  let headMatched = 0;
  for (let i = 0; i < N; i += 1) {
    const cls = E.nbaEarnedDraftClass(mulberry32(60000 + i), SLOTS, new Set());
    const twin = E.nbaDraftClass(mulberry32(60000 + i), 24, new Set()).slice(0, 12);
    check(cls.length === size, () => `class ${i}: ${cls.length} men for ${SLOTS} slots, the rule is ${size}`);
    const names = new Set(cls.map(p => p.name));
    check(names.size === cls.length && new Set(cls.map(p => p.id)).size === cls.length, () => `class ${i}: two men share a name or an id`);
    for (let k = 1; k < cls.length; k += 1) check(cls[k - 1].grade >= cls[k].grade, () => `class ${i}: not sorted by grade at ${k}`);
    const head = new Set();
    for (const t of twin) {
      const p = cls.find(x => x.name === t.name);
      const same = !!p && p.trueOvr === t.trueOvr && p.grade === t.grade && p.pos === t.pos && p.age === t.age;
      check(same, () => `class ${i}: today's man ${t.name} (${t.trueOvr}) is not in the earned class as drawn`);
      if (same) { head.add(p); headMatched += 1; }
    }
    cls.forEach((p, k) => {
      /* The board's load guard on a saved class (NbaFrontOfficeBoard.tsx, the restore of a draft). */
      check(typeof p.name === 'string' && p.name.trim() !== '' && ['G', 'F', 'C'].includes(p.pos) && Number.isInteger(p.age) && p.age > 0
        && Number.isFinite(p.grade) && p.grade >= 0 && p.grade <= 99 && Number.isFinite(p.trueOvr) && p.trueOvr >= 0 && p.trueOvr <= 99,
      () => `class ${i}: ${J(p)} fails the board's load guard`);
      const band = Math.floor(k / 10);
      bandSum[band] = (bandSum[band] ?? 0) + p.trueOvr;
      bandN[band] = (bandN[band] ?? 0) + 1;
      if (head.has(p)) return;
      observed.set(p.trueOvr, (observed.get(p.trueOvr) ?? 0) + 1);
      men += 1;
    });
  }
  /* What the curve says men 13 to `size` are, rating by rating, over N classes. */
  const expected = new Map();
  const variance = new Map();
  for (let man = 13; man <= size; man += 1) {
    const b = CURVE.find(x => man >= x.from && man <= x.to) ?? CURVE[CURVE.length - 1];
    const w = b.ovr[1] - b.ovr[0] + 1;
    for (let v = b.ovr[0]; v <= b.ovr[1]; v += 1) {
      expected.set(v, (expected.get(v) ?? 0) + N / w);
      variance.set(v, (variance.get(v) ?? 0) + (N / w) * (1 - 1 / w));
    }
  }
  let worstZ = 0;
  for (let v = 0; v <= 99; v += 1) {
    const o = observed.get(v) ?? 0;
    const e = expected.get(v) ?? 0;
    if (e === 0) { check(o === 0, `${o} men after today's twelve are rated ${v}, which the curve never draws`); continue; }
    const z = Math.abs(o - e) / Math.sqrt(variance.get(v));
    worstZ = Math.max(worstZ, z);
    check(z <= 4.5, () => `men after today's twelve rated ${v}: ${o}, the curve says ${e.toFixed(0)} (${z.toFixed(1)} standard errors)`);
  }
  const bands = bandSum.map((s, b) => s / bandN[b]);
  const steps = bands.slice(1).map((m, b) => bands[b] - m);
  /* Floor: 70 percent of the smallest step measured on these fixed classes (the house rule), see MEASURED: 1.70 on
     the starting curve (2026-10-12), 0.25 on the tuned curve (2026-10-21, slots 51-60 to 61-64; each step is a
     mean over 1,500 classes, its error about 0.02). A retuned curve is remeasured here and the floor moves with it. */
  const STEP_FLOOR = 0.17;
  steps.forEach((d, b) => check(d > STEP_FLOOR, `the mean true rating does not fall from slots ${b * 10 + 1}-${b * 10 + 10} to ${b * 10 + 11}-${Math.min(size, b * 10 + 20)} (${d.toFixed(2)})`));
  /* The size rule at every number of slots a draft can have, and two it cannot. */
  for (const s of [-3, 0, 1, 7, 8, 12, 30, 59, 60, 61, 66, 70, 75]) {
    const n = E.nbaEarnedDraftClass(mulberry32(6100 + s + 3), s, new Set()).length;
    check(n === Math.min(70, Math.max(0, s) + 4), `${s} slots gave a class of ${n}`);
  }
  check(men > 0 && headMatched === N * 12, `the fleet of classes read ${men} men after the twelve and matched ${headMatched} of today's ${N * 12}`);
  console.log(`   ${N} classes of ${size} for ${SLOTS} slots: today's twelve found in every one, ${men} men after them held to the curve rating by rating (worst ${worstZ.toFixed(2)} standard errors, band 4.5)`);
  console.log(`   mean true rating by ten slots: ${bands.map(m => m.toFixed(2)).join(', ')}; steps ${steps.map(d => d.toFixed(2)).join(', ')}`);
}

/* ================================================================== */
/* THE WALK: the earned draft through the libraries on real seasons, for sections 2, 3, 4, 8 and 9. Each league
   plays three seasons with the desk on, the board's way, and before each draft a seeded handful of this year's
   picks change hands (one club gives both of its picks to another, so a club holds none and one holds four, and
   two to four more move, his among them half the time). The GM continues, takes the best man on his scout's read
   at each of his slots and lets the draft run on; the desk's summer follows. */
const WALK_SEEDS = FLEET === 'full' && !PROBE ? 30 : 10;
const WALK_SEASONS = 3;
const LOTTERIES = FLEET === 'full' && !PROBE ? 40000 : 10000;
/* The need weight, PINNED here as a number and never read off the engine (review 2026-10-12: a bound read from
   E.NBA_DRAFT_NEED_WEIGHT grew with it, so a weight of 20 stayed green). A5: need is flavour and only splits men
   whose reads are within a few points; the engine's 2 is that number. A tuned weight is a change to this line
   too, said in the notes. */
const NEED_WEIGHT = 2;
const Q = { 2: [], 3: [], 4: [], 8: [], 12: [] };
const W = { seasons: 0, drawn: 0, tieFree: 0, drafts: 0, opened: 0, moved: 0, mineMoved: 0, three: 0, none: 0, clocks: 0, steps: 0, rivalRows: 0, swaps: 0, breaks: 0, fallbacks: 0, reopens: 0 };
const seasonsForLotteries = [];
const needRows = [];
/* Section 5's closed seasons, as they stood before any pick moved. */
const incSeasons = [];
const shareOf = t => (t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0.5);
/* The harness's own reading of the playoff sixteen: the first round's series, by name. The bind reads numbers. */
const firstRoundClubs = series => { const s = new Set(); for (const x of series) if (/ R1$/.test(x.name)) { s.add(x.home); s.add(x.away); } return s; };

function movePicksBeforeDraft(lg, team, desk, r) {
  const ids = Object.keys(lg.teams).sort();
  const any = list => list[Math.floor(r() * list.length)];
  let ledger = D.nbaPicksOf(desk, lg);
  const year = () => ledger.picks.filter(p => p.year === lg.season);
  const move = (p, to) => {
    if (p.holder === team || to === team) W.mineMoved += 1;
    ledger = M.P.movePicks(ledger, [M.P.pickKey(p)], to);
    W.moved += 1;
  };
  const giver = any(ids.filter(c => c !== team));
  const taker = any(ids.filter(c => c !== team && c !== giver));
  for (const p of year().filter(x => x.holder === giver)) move(p, taker);
  const more = 2 + Math.floor(r() * 3);
  for (let i = 0; i < more; i += 1) {
    const pool = year().filter(x => x.holder !== giver);
    const p = i === 0 && r() < 0.5 ? (pool.find(x => x.holder === team) ?? any(pool)) : any(pool);
    move(p, any(ids.filter(c => c !== p.holder && c !== giver)));
  }
  D.syncNbaPicks(lg, ledger);
  const held = ids.map(c => year().filter(p => p.holder === c).length);
  if (held.some(n => n >= 3)) W.three += 1;
  if (held.some(n => n === 0)) W.none += 1;
  return M.GD.withGmBlock(desk, D.NBA_DESK_KEYS.picks, ledger);
}

/** Section 3's first half: the saved order against the season the harness saw. Round one opens with every club out
    of the sixteen, the lottery field is worst record first, the sixteen follow worst record first, and round two is
    every club worst record first. Level records may stand in any order. */
function checkOrder(lg, series, order, where) {
  const made = firstRoundClubs(series);
  const share = id => shareOf(lg.teams[id]);
  if (made.size !== 16 || order.first.slice(0, 30 - made.size).some(c => made.has(c))) Q[3].push(`${where}: round one's head holds a club of the sixteen`);
  const rising = (list, label) => {
    for (let i = 1; i < list.length; i += 1) {
      if (share(list[i]) < share(list[i - 1]) - 1e-12) { Q[3].push(`${where}: ${label} puts ${list[i]} (${share(list[i]).toFixed(3)}) after ${list[i - 1]} (${share(list[i - 1]).toFixed(3)})`); return; }
    }
  };
  rising(order.first.slice(30 - made.size), 'round one after the lottery');
  rising(order.later, 'round two');
  if (order.lottery) rising(order.lottery.field.map(f => f.club), 'the lottery field');
}

/** Section 2 on one closed season, through the bind's own season and order. */
function checkSeason(lg, series, where) {
  W.seasons += 1;
  const season = N.nbaDraftSeason(lg, series);
  if (!season) { Q[2].push(`${where}: the bind drew no season from a closed one`); return; }
  const made = season.rows.filter(r => r.made).map(r => r.id).sort();
  if (season.rows.length !== 30 || J(made) !== J([...firstRoundClubs(series)].sort())) Q[2].push(`${where}: the bind's sixteen are not the first round's clubs`);
  const order = N.nbaDraftOrder(season);
  if (!order || order.plain !== null || !order.lottery) { Q[2].push(`${where}: no lottery was drawn (${order?.plain})`); return; }
  W.drawn += 1;
  /* Every club's chance at the first pick, worked out here from the TABLE, read by the harness itself and never off
     the saved field (a bad bind would carry it there too), and the season's records: clubs level on record share
     the chances of the seeds they span (the rule set's level odds), the rest hold their seed's. */
  const table = M.P.NBA_PICK_RULES.lottery.odds;
  const missed = season.rows.filter(r => !r.made).sort((a, b) => a.wins / (a.wins + a.losses) - b.wins / (b.wins + b.losses));
  const chance = new Map();
  let level = 0;
  for (let i = 0; i < missed.length;) {
    let j = i + 1;
    const at = r => r.wins / (r.wins + r.losses);
    while (j < missed.length && at(missed[j]) === at(missed[i])) j += 1;
    const mean = table.slice(i, j).reduce((a, b) => a + b, 0) / (j - i);
    for (let k = i; k < j; k += 1) chance.set(missed[k].id, { pct: mean, seed: k + 1, alone: j - i === 1 });
    if (j - i > 1) level += 1;
    i = j;
  }
  for (const f of order.lottery.field) {
    const c = chance.get(f.club);
    if (c?.alone && Math.abs(f.pct - table[c.seed - 1]) > 1e-9) Q[2].push(`${where}: ${f.club}, alone on its record at seed ${c.seed}, is drawn on ${f.pct}, the table says ${table[c.seed - 1]}`);
  }
  if (level === 0) W.tieFree += 1;
  if (seasonsForLotteries.length < 20) seasonsForLotteries.push({ season, chance });
}

/** Section 9's reading of one night, on a copy: every rival choice with the club's need, how far its grade fell
    short of the best grade left, and whether it is the man the rule picks. The copy's draws are its own, so the
    walk is untouched. THE RIVAL'S READ IS WORKED OUT HERE, NEVER THROUGH THE HOST: A5 says a rival chooses on the
    engine's own grade (`p.grade`) plus NEED_WEIGHT a whole point of need (the engine's nbaDraftNeed), ties to the
    lower id, so the host is held against that rule and not against itself (review 2026-10-12: with the host's
    own read on both sides, rivals choosing on his scout's read stayed green). */
function readNeed(lg, team, desk, night, cls, level, key) {
  const l = JSON.parse(J(lg));
  const { host } = N.nbaDraftHost({ me: team, season: l.season, scoutLevel: level, rng: mulberry32(key) });
  let pool = JSON.parse(J(cls));
  const watched = {
    ...host,
    sign: (league, club, p, slot) => {
      if (club !== team) {
        const need = E.nbaDraftNeed(league.teams[club]);
        const score = x => x.grade + NEED_WEIGHT * (need[x.pos] ?? 0);
        let want = null;
        for (const x of pool) if (want === null || score(x) > score(want) || (score(x) === score(want) && x.id < want.id)) want = x;
        needRows.push({ need, pos: p.pos, gap: Math.max(...pool.map(x => x.grade)) - p.grade, rule: want !== null && want.id === p.id });
      }
      pool = pool.filter(x => x !== p);
      host.sign(league, club, p, slot);
    },
  };
  G.earnedByStaff(watched, l, JSON.parse(J(night)), team, pool);
}

/** Section 8 on one night, mid draft: a block broken at each field is never current, no press runs on it, and the
    old engine calls finish the draft and the summer on a valid league without a throw. */
function breakNight(lg, team, desk, cls, where, key) {
  const BREAKS = {
    year: n => ({ ...n, year: n.year + 1 }),
    order: n => ({ ...n, order: { ...n.order, first: [...n.order.first].reverse() } }),
    slot: n => ({ ...n, slots: n.slots.map((x, i) => (i === 5 ? { ...x, slot: x.slot + 1 } : x)) }),
    made: n => ({ ...n, made: n.slots.length + 1 }),
    seen: n => ({ ...n, seen: 'yes' }),
  };
  for (const [name, broken] of Object.entries(BREAKS)) {
    W.breaks += 1;
    const l = JSON.parse(J(lg));
    const c = JSON.parse(J(cls));
    let d = JSON.parse(J(desk));
    d = M.GD.withGmBlock(d, N.NBA_DRAFT_BLOCK, broken(d.blocks[N.NBA_DRAFT_BLOCK]));
    try {
      if (N.nbaDraftNightOf(d, l) !== null) Q[8].push(`${where}: a block broken at ${name} is still current`);
      if (N.nbaDraftContinue(l, d, team, c, mulberry32(key)) !== null) Q[8].push(`${where}: Continue ran on a block broken at ${name}`);
      d = oldDraftWith(M, l, team, mulberry32(key + 1), d, c).desk;
      const summer = D.nbaDeskOffseason(l, d, team, mulberry32(key + 2));
      if (!summer.ok) { Q[8].push(`${where}: the summer refused after the fallback at ${name}`); continue; }
      const ids = Object.values(l.teams).flatMap(t => t.players.map(p => p.id));
      const bad = [];
      if (new Set(ids).size !== ids.length) bad.push('a man on two rosters');
      if (!M.P.validateLedger(summer.desk.blocks[D.NBA_DESK_KEYS.picks], Object.keys(l.teams), D.nbaGamePickRules())) bad.push('a pick ledger that does not validate');
      if (Object.values(l.teams).some(t => E.nbaDraftCapital(t) === null)) bad.push('a draft list the engine cannot read');
      if (l.round !== 1 || l.season !== lg.season + 1) bad.push('a season that did not roll');
      if (bad.length) Q[8].push(`${where}: after the fallback at ${name}: ${bad.join(', ')}`);
      else W.fallbacks += 1;
    } catch (error) {
      Q[8].push(`${where}: the fallback at ${name} threw ${error.message}`);
    }
  }
}

/** One earned draft through the libraries, checked press by press (sections 3 and 4). Answers his first selection
    and the desk, or null when the night did not open (the old draft then runs, so the walk goes on). */
function walkDraft(lg, team, rng, desk, series, where, first) {
  const before = J(desk);
  const opened = N.openNbaDraftNight(desk, lg, series, team);
  if (!opened) { Q[3].push(`${where}: the night did not open`); return null; }
  W.opened += 1;
  const night0 = opened.night;
  desk = opened.desk;
  const again = N.openNbaDraftNight(JSON.parse(before), JSON.parse(J(lg)), series, team);
  if (!again || J(again.night) !== J(night0)) Q[4].push(`${where}: opening the same season twice gave another block`);
  if (J(N.nbaDraftNightOf(JSON.parse(J(desk)), lg)) !== J(night0)) Q[4].push(`${where}: the block does not survive a JSON round trip`);
  checkOrder(lg, series, night0.order, where);
  const ledger = D.nbaPicksOf(desk, lg);
  const held = ledger.picks.filter(p => p.year === lg.season);
  if (night0.slots.length !== held.length) Q[3].push(`${where}: ${night0.slots.length} slots for the ${held.length} picks the ledger holds`);
  for (const s of night0.slots) {
    const line = s.round === 1 ? night0.order.first : night0.order.later;
    if (line[s.slot - 1] !== s.orig) Q[3].push(`${where}: slot ${s.overall} is ${s.orig}'s, the order has ${line[s.slot - 1]} at ${s.slot}`);
    const p = held.find(x => x.round === s.round && x.orig === s.orig);
    if (!p || p.holder !== s.holder) Q[3].push(`${where}: slot ${s.overall} (${s.orig}'s round ${s.round}) is used by ${s.holder}, the ledger says ${p?.holder}`);
  }
  const level = S.gmStaffLevel(D.nbaStaffOf(desk, lg, team).block, 'scouting');
  const read = p => D.nbaScoutRead(p, team, lg.season, level);
  let cls = E.nbaEarnedDraftClass(rng, night0.slots.length, leagueNames(lg));
  const byName = new Map(cls.map(p => [p.name, p]));
  readNeed(lg, team, desk, night0, cls, level, 9000 + W.drafts);
  if (first) {
    /* Section 4: the table swapped under the saved block changes nothing in that draft. */
    const play = swap => {
      const odds = M.P.NBA_PICK_RULES.lottery.odds;
      if (swap) M.P.NBA_PICK_RULES.lottery.odds = [...odds].reverse();
      try {
        const l = JSON.parse(J(lg));
        const r = N.nbaDraftByStaff(l, JSON.parse(J(desk)), team, JSON.parse(J(cls)), mulberry32(4242));
        return r ? J([r.steps, N.nbaDraftNightOf(r.desk, l)]) : 'refused';
      } finally { M.P.NBA_PICK_RULES.lottery.odds = odds; }
    };
    W.swaps += 1;
    if (play(false) !== play(true)) Q[4].push(`${where}: swapping the table under the saved block changed the draft`);
  }
  let signed = 0;
  let firstPick = null;
  /* Section 12: every man the night signs, with the deal he signed, to follow through the summer after it. */
  const deals = [];
  const press = (res, label) => {
    if (!res) { Q[3].push(`${where}: ${label} was refused`); return null; }
    const night = N.nbaDraftNightOf(res.desk, lg);
    if (!night || J(night.order) !== J(night0.order) || J(night.slots) !== J(night0.slots)) Q[4].push(`${where}: ${label} changed the saved order or slots`);
    const gone = cls.filter(p => !res.left.includes(p)).map(p => p.name).sort();
    if (J(gone) !== J(res.steps.map(s => s.playerName).sort())) Q[3].push(`${where}: ${label}: the class lost ${gone.length} men and ${res.steps.length} signed`);
    for (const st of res.steps) {
      const slot = night0.slots[st.overall - 1];
      if (!slot || slot.holder !== st.team || st.mine !== (st.team === team)) Q[3].push(`${where}: pick ${st.overall} made by ${st.team}, the slot is ${slot?.holder}'s`);
      if (!lg.teams[st.team]?.players.some(p => p.name === st.playerName)) Q[3].push(`${where}: ${st.playerName}, pick ${st.overall}, is not on ${st.team}`);
      if (st.mine && !firstPick) firstPick = { overall: st.overall, trueOvr: byName.get(st.playerName)?.trueOvr };
      const man = lg.teams[st.team]?.players.find(p => p.name === st.playerName);
      if (man && slot) deals.push({ id: man.id, club: st.team, round: slot.round, overall: st.overall, years: man.years, salary: man.salary });
    }
    for (const row of N.nbaDraftRun(res.steps, res.onClock).night.picks) {
      if (!row.mine) W.rivalRows += 1;
      const pr = byName.get(row.playerName);
      if (!pr || row.grade !== Math.round(read(pr))) Q[3].push(`${where}: the run shows ${row.playerName} at ${row.grade}, his scout's read is ${pr ? Math.round(read(pr)) : 'nobody'}`);
      if (!lg.teams[row.team]?.players.some(p => p.name === row.playerName)) Q[3].push(`${where}: the run shows ${row.playerName} at ${row.team}, who does not have him`);
    }
    if (res.onClock) {
      W.clocks += 1;
      if (res.onClock.holder !== team || night?.made !== res.onClock.overall - 1) Q[3].push(`${where}: on the clock at ${res.onClock.overall} with ${night?.made} slots used`);
    }
    if (res.done !== (night?.made === night0.slots.length)) Q[3].push(`${where}: ${label} says done ${res.done} with ${night?.made} of ${night0.slots.length} used`);
    signed += res.steps.length;
    cls = res.left;
    desk = res.desk;
    return res;
  };
  let res = press(N.nbaDraftContinue(lg, desk, team, cls, rng), 'Continue');
  if (res) {
    /* Section 4: opening again over the night in progress answers it as it stands and writes nothing. */
    const reopen = N.openNbaDraftNight(JSON.parse(J(desk)), JSON.parse(J(lg)), series, team);
    W.reopens += 1;
    if (!reopen || J(reopen.night) !== J(N.nbaDraftNightOf(desk, lg)) || J(reopen.desk) !== J(desk)) Q[4].push(`${where}: opening again after Continue did not answer the night as it stands (made ${reopen?.night.made}, the desk's ${N.nbaDraftNightOf(desk, lg)?.made})`);
  }
  if (first && res && !res.done) breakNight(lg, team, desk, cls, where, 8000 + W.drafts);
  while (res && !res.done) {
    const best = [...cls].sort((a, b) => read(b) - read(a) || (a.id < b.id ? -1 : 1))[0];
    res = press(best ? N.nbaDraftPick(lg, desk, team, cls, best.id, rng) : N.nbaDraftByStaff(lg, desk, team, cls, rng), best ? 'his pick' : 'the staff');
  }
  if (signed !== night0.slots.length) Q[3].push(`${where}: ${signed} men signed over ${night0.slots.length} slots, so a slot found the class empty`);
  const ids = Object.values(lg.teams).flatMap(t => t.players.map(p => p.id));
  if (new Set(ids).size !== ids.length) Q[3].push(`${where}: a man is on two rosters`);
  W.drafts += 1;
  W.steps += signed;
  return { desk, first: firstPick, signed, deals };
}

/* 12. THE DEALS SURVIVE THE SUMMER (the reviews of 2026-10-22, F1). The draft is held before the summer, and the
   summer takes a season off every deal and puts his men with one season left on his re-sign desk, so a deal signed
   on draft night must run at least two to be played at all. Every man a night signed is followed through the summer
   right after it: none signed fewer than two seasons; his own are all still on his club and none was settled on his
   desk; a rival's is still on his club unless the summer's trim of a club over fifteen waived him (his club then
   ends the summer at fifteen); whoever is still there has his draft night deal less ONE season at the same money;
   and with knob (i) on, every second rounder signed at the minimum and has exactly ONE season left, the one he
   plays at the minimum. The ones are this harness's own, never the library's constants, so a retune of the library
   cannot move both sides of the check. Control `summerdeal` writes the old one season deal. */
const DEALS = { signed: 0, mine: 0, kept: 0, trimmed: 0, secondsKept: 0, mineSeconds: 0 };
function checkDeals(lg, team, deals, summer, min, where) {
  const knob = N.NBA_DRAFT_KNOBS.secondOnMin === true;
  const settled = new Set([...summer.autoSettled, ...summer.applied].map(d => d.id));
  for (const d of deals) {
    DEALS.signed += 1;
    const label = `${where}: ${d.club}'s pick ${d.overall} (round ${d.round})`;
    if (d.years < 2) Q[12].push(`${label} signed ${d.years} season${d.years === 1 ? '' : 's'} on draft night, and the summer right after takes one off before he plays`);
    if (knob && d.round === 2 && d.salary !== min) Q[12].push(`${label} signed at ${d.salary}, not the minimum of ${min}`);
    const man = lg.teams[d.club]?.players.find(p => p.id === d.id);
    if (d.club === team) {
      DEALS.mine += 1;
      if (settled.has(d.id)) Q[12].push(`${label}: his re-sign desk settled him the summer he was drafted`);
      if (!man) { Q[12].push(`${label}: his own draftee is gone after the summer he was drafted`); continue; }
      if (d.round === 2) DEALS.mineSeconds += 1;
    } else if (!man) {
      DEALS.trimmed += 1;
      const left = lg.teams[d.club]?.players.length ?? 0;
      if (left < E.NBA_ROSTER_MAX) Q[12].push(`${label}: gone after the summer and not by the trim (his club ends it with ${left} men)`);
      continue;
    }
    DEALS.kept += 1;
    if (man.years !== d.years - 1 || man.salary !== d.salary) Q[12].push(`${label}: ${man.years} seasons at ${man.salary} after the summer; he signed ${d.years} at ${d.salary} on draft night`);
    if (knob && d.round === 2) {
      DEALS.secondsKept += 1;
      if (man.years !== 1) Q[12].push(`${label}: a second rounder with ${man.years} seasons left after the summer, not the one at the minimum`);
    }
  }
}

for (let seed = 1; seed <= WALK_SEEDS; seed += 1) {
  const team = CLUBS[(seed * 7) % CLUBS.length];
  const rng = mulberry32(70000 + seed);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  let desk = D.openNbaDesk(lg, team);
  for (let s = 1; s <= WALK_SEASONS; s += 1) {
    const where = `walk seed ${seed} season ${s} (${team})`;
    const closedSeason = seasonToDraft(M, lg, team, desk, rng);
    desk = closedSeason.desk;
    checkSeason(lg, closedSeason.series, where);
    incSeasons.push({ league: J(lg), series: closedSeason.series, where });
    desk = movePicksBeforeDraft(lg, team, desk, mulberry32(71000 + seed * 10 + s));
    const done = walkDraft(lg, team, rng, desk, closedSeason.series, where, s === 1);
    desk = done ? done.desk : oldDraft(M, lg, team, rng, desk).desk;
    /* the minimum in the season the class signs into, worked out before the summer moves the cap */
    const min = E.nbaMinContract(E.nbaDraftSigning(lg).cap);
    const summer = D.nbaDeskOffseason(lg, desk, team, rng);
    if (!summer.ok) { Q[3].push(`${where}: the desk's summer refused`); break; }
    desk = summer.desk;
    if (done) checkDeals(lg, team, done.deals, summer, min, where);
  }
}

open(2);
{
  for (const p of Q[2]) fail(p);
  check(W.seasons > 0 && W.drawn === W.seasons, `${W.drawn} of ${W.seasons} closed seasons drew a lottery`);
  check(seasonsForLotteries.length > 0, 'no closed season to draw keyed lotteries on');
  /* Keyed lotteries through the bind's own order on real seasons: each club's share of the first pick against the
     chance the harness worked out from the TABLE and the records, in the house band of simGmPicks (4.5 standard
     errors). Real fields are rarely free of level records (W.tieFree counts the ones that were), so a level club is
     held to the mean of the seeds its group spans; the drawing that hands out an odd combination changes with the
     key, so over the keys that is its share. MEASURED in the header. */
  let worst = 0;
  let clubs = 0;
  for (const { season, chance } of seasonsForLotteries) {
    const base = G.draftSeasonKey(season, G.draftRulesFor('nba', season.draftYear).id);
    const wins = new Map();
    for (let i = 0; i < LOTTERIES; i += 1) {
      const club = N.nbaDraftOrder(season, `${base}|k${i}`).lottery.wins[0].club;
      wins.set(club, (wins.get(club) ?? 0) + 1);
    }
    for (const [club, c] of chance) {
      clubs += 1;
      const p = c.pct / 100;
      const got = wins.get(club) ?? 0;
      const z = Math.abs(got - LOTTERIES * p) / Math.sqrt(LOTTERIES * p * (1 - p));
      worst = Math.max(worst, z);
      check(z <= 4.5, () => `${club} (seed ${c.seed}${c.alone ? '' : ', level'}) won the first pick ${got} times in ${LOTTERIES}, the table says ${(LOTTERIES * p).toFixed(0)} (${z.toFixed(1)} standard errors)`);
    }
  }
  console.log(`   ${W.seasons} closed seasons, a lottery drawn on ${W.drawn} (${W.tieFree} with no level records in the field); ${seasonsForLotteries.length} of them, ${LOTTERIES} keyed lotteries each: ${clubs} club shares, the worst ${worst.toFixed(2)} standard errors from the table (band 4.5)`);
}

open(3);
{
  for (const p of Q[3]) fail(p);
  check(W.drafts > 0 && W.opened === W.drafts, `${W.opened} nights opened, ${W.drafts} drafts played`);
  check(W.moved > 0 && W.mineMoved > 0 && W.three > 0 && W.none > 0, `picks moved ${W.moved}, his ${W.mineMoved}, a club holding three ${W.three} times, a club holding none ${W.none} times`);
  check(W.clocks > 0 && W.rivalRows > 0, `on the clock ${W.clocks} times, ${W.rivalRows} rival rows shown`);
  console.log(`   ${W.drafts} drafts, ${W.steps} picks: ${W.moved} of the year's picks moved first (${W.mineMoved} his), a club with three or more ${W.three} times, a club with none ${W.none} times; on the clock ${W.clocks} times; ${W.rivalRows} rival rows shown, every one on its club at his scout's read`);
}

open(4);
{
  for (const p of Q[4]) fail(p);
  check(W.opened > 0 && W.swaps > 0 && W.reopens > 0, `${W.opened} nights opened, ${W.swaps} tables swapped, ${W.reopens} opened again mid draft`);
  console.log(`   ${W.opened} nights: each opened twice to the same block, read back after a JSON round trip, unchanged by every press; ${W.reopens} opened again after Continue and answered as they stood; ${W.swaps} drafts replayed with the table swapped under the block`);
}

open(5);
{
  /* THE INCENTIVE, on every closed season of the walk as it stood before any pick moved: each of the thirty clubs in
     turn is the GM, on a fresh desk (his own two picks), through the libraries' own presses: the night opens, the
     class is drawn, Continue runs every club ahead of him, and his first selection is the best man left on his
     scout's read at his first slot. By band of five places in the season's finish, worst first, its overall number
     rises at every band and its true rating falls at every band. Beside it, the OLD arm: the same club in today's
     draft picks first from a class of 24 or more on the same read, so its line is flat. In a loaded copy of the
     bundle of its own, so the walk's ids are untouched. Floors in MEASURED: 70 percent of the smallest step. */
  const X = freshCopy(55555);
  const t0 = Date.now();
  const NB = 6;
  const blank = () => Array.from({ length: NB }, () => ({ n: 0, overall: 0, trueOvr: 0 }));
  const NEW = blank();
  const OLD = blank();
  let nights = 0;
  let refused = 0;
  const bySeason = [];
  /* Three classes a season on the quick walk's thirty seasons, one on the full walk's ninety: about 2,700 nights. */
  const K = WALK_SEEDS === 30 ? 1 : 3;
  incSeasons.forEach(({ league, series }, si) => {
    const base = JSON.parse(league);
    const worstFirst = X.E.nbaStandings(base).map(t => t.abbr).reverse();
    for (let k = 0; k < K; k += 1) worstFirst.forEach((club, fi) => {
      const band = Math.floor(fi / 5);
      /* One class and one draw for all thirty clubs (common draws), so a band's step compares men of one class. */
      const rep = si * K + k;
      const key = 50000 + rep * 64;
      const l = JSON.parse(league);
      const opened = X.N.openNbaDraftNight(X.D.openNbaDesk(l, club), l, series, club);
      if (!opened || !opened.night.slots.some(s => s.holder === club)) { refused += 1; return; }
      const level = X.S.gmStaffLevel(X.D.nbaStaffOf(opened.desk, l, club).block, 'scouting');
      const read = p => X.D.nbaScoutRead(p, club, l.season, level);
      const best = list => [...list].sort((a, b) => read(b) - read(a) || (a.id < b.id ? -1 : 1))[0];
      const cls = X.E.nbaEarnedDraftClass(mulberry32(key), opened.night.slots.length, X.leagueNames(l));
      const res = X.N.nbaDraftContinue(l, opened.desk, club, cls, mulberry32(key + 1));
      if (!res || !res.onClock || res.onClock.holder !== club || !best(res.left)) { refused += 1; return; }
      nights += 1;
      NEW[band].n += 1;
      NEW[band].overall += res.onClock.overall;
      NEW[band].trueOvr += best(res.left).trueOvr;
      if (!bySeason[si]) bySeason[si] = blank();
      bySeason[si][band].n += 1;
      bySeason[si][band].overall += res.onClock.overall;
      bySeason[si][band].trueOvr += best(res.left).trueOvr;
      const o = JSON.parse(league);
      const capital = X.E.nbaDraftCapital(o.teams[club]) ?? 0;
      const rivals = Object.values(o.teams).filter(t => t.abbr !== club).reduce((s, t) => s + (X.E.nbaDraftCapital(t) ?? 0), 0);
      OLD[band].n += 1;
      OLD[band].overall += 1;
      OLD[band].trueOvr += best(X.E.nbaDraftClass(mulberry32(key + 2), Math.max(24, capital + Math.min(10, rivals)), X.leagueNames(o))).trueOvr;
    });
  });
  const per = (b, k) => (b.n ? b[k] / b.n : NaN);
  const rise = [];
  const fall = [];
  for (let b = 1; b < NB; b += 1) {
    rise.push(per(NEW[b], 'overall') - per(NEW[b - 1], 'overall'));
    fall.push(per(NEW[b - 1], 'trueOvr') - per(NEW[b], 'trueOvr'));
  }
  check(incSeasons.length > 0 && nights > 0 && NEW.every(b => b.n > 0), `${nights} nights over ${incSeasons.length} seasons, by band ${NEW.map(b => b.n).join(', ')}`);
  check(refused === 0, `${refused} of ${refused + nights} nights did not open or never put the club on the clock`);
  /* MEASURED 2026-10-21 on the tuned curve (quick walk, 2,700 nights, the thirty seasons as replicates): the
     smallest steps are 3.29 places (error 0.24, the first band) and 0.38 rating (error 0.07, the last band, where
     the tuned curve is nearly flat). NOT the house rule's 70 percent, on purpose: 70 percent (2.30 and 0.27) sits
     right where two controls aimed at other sections land (flatodds puts the first step at 2.25, flatclass the last
     at 0.13), so each would fire here or not on a coin toss. The floors sit clear of both: 1.6 places, about half
     the smallest step and 7 errors under it (flatodds lands 2.7 of its errors above it), and 0 rating, S5's own
     line (the smallest step is 5 errors above it; flatclass lands 2.2 of its errors above). gmfirst, bestfirst and
     playinmade still fire here by a wide margin. A retuned curve is remeasured here and the floors with it. */
  const RISE_FLOOR = 1.6;
  const FALL_FLOOR = 0;
  rise.forEach((d, b) => check(d > RISE_FLOOR, `his first selection does not come later from finish ${b * 5 + 1}-${b * 5 + 5} to ${b * 5 + 6}-${b * 5 + 10} (${Number.isFinite(d) ? d.toFixed(2) : d} places, floor ${RISE_FLOOR})`));
  fall.forEach((d, b) => check(d > FALL_FLOOR, `his first selection is not worse from finish ${b * 5 + 1}-${b * 5 + 5} to ${b * 5 + 6}-${b * 5 + 10} (${Number.isFinite(d) ? d.toFixed(2) : d} rating, floor ${FALL_FLOOR})`));
  const row = list => list.map((b, i) => `${i * 5 + 1}-${i * 5 + 5}: #${per(b, 'overall').toFixed(1)} ${per(b, 'trueOvr').toFixed(1)}`).join(', ');
  console.log(`   ${nights} nights over ${incSeasons.length} seasons x ${K} classes (${NEW[0].n} a band), each club the GM once a class, in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`   new, by finish worst first, his first selection's pick and true rating: ${row(NEW)}`);
  console.log(`   old, the same clubs today: ${row(OLD)}`);
  /* The error of each step, the seasons as replicates (a season's classes share its order, so they are one). */
  const stepSe = (key, sign) => fall.map((_, b) => {
    const v = bySeason.filter(x => x && x[b].n && x[b + 1].n).map(x => sign * (x[b + 1][key] / x[b + 1].n - x[b][key] / x[b].n));
    const m = v.reduce((a, c) => a + c, 0) / v.length;
    return Math.sqrt(v.reduce((a, c) => a + (c - m) ** 2, 0) / (v.length - 1) / v.length);
  });
  console.log(`   new steps: later by ${rise.map(d => d.toFixed(2)).join(', ')} places (errors ${stepSe('overall', 1).map(d => d.toFixed(2)).join(', ')}); worse by ${fall.map(d => d.toFixed(2)).join(', ')} rating (errors ${stepSe('trueOvr', -1).map(d => d.toFixed(2)).join(', ')})`);
}

open(8);
{
  for (const p of Q[8]) fail(p);
  check(W.breaks > 0 && W.fallbacks === W.breaks, `${W.fallbacks} of ${W.breaks} broken blocks finished the old way`);
  console.log(`   ${W.breaks} blocks broken mid draft (year, order, a slot, made past the end, seen): never current, no press ran, ${W.fallbacks} finished the old way to a valid league`);
}

open(9);
{
  /* Need: every rival choice is the man the rule picks on the engine's own grade (readNeed works it out without the
     host); none passes a man whose grade beats its choice by more than the pinned weight; a rival short at a
     position takes it more often than one that is not. Floors in MEASURED. */
  const weight = NEED_WEIGHT;
  check(E.NBA_DRAFT_NEED_WEIGHT === weight, `the engine's NBA_DRAFT_NEED_WEIGHT is ${E.NBA_DRAFT_NEED_WEIGHT}, the number this harness pins is ${weight} (A5: need only splits reads within a few points)`);
  const offRule = needRows.filter(r => !r.rule).length;
  check(needRows.length > 0 && offRule === 0, `${offRule} of ${needRows.length} rival choices are not the man the rule picks on the engine's grade plus ${weight} a point of need`);
  let over = 0;
  for (const r of needRows) if (r.gap > weight + 1e-9) over += 1;
  check(over === 0, `${over} rival choices passed a man whose grade beat theirs by more than ${weight}`);
  const lift = {};
  for (const pos of ['G', 'F', 'C']) {
    const short = needRows.filter(r => r.need[pos] > 0);
    const not = needRows.filter(r => r.need[pos] === 0);
    const rate = list => (list.length ? list.filter(r => r.pos === pos).length / list.length : NaN);
    lift[pos] = { short: short.length, not: not.length, gap: 100 * (rate(short) - rate(not)) };
  }
  /* 70 percent of the smallest lift measured on the quick walk (F 29.3 points, 2026-10-12); with the need weight at
     nothing (control noneed) the three read 4.4, -0.1 and 0.9. */
  const NEED_FLOOR = 20;
  for (const [pos, v] of Object.entries(lift)) check(v.short > 0 && v.not > 0 && v.gap > NEED_FLOOR, `${pos}: a club short there takes one ${v.gap.toFixed(1)} points more often than one that is not (${v.short} and ${v.not} choices), floor ${NEED_FLOOR}`);
  console.log(`   ${needRows.length} rival choices, ${needRows.length - offRule} of them the rule's man on the engine's grade; none passed a better grade by more than ${weight}; taken when short vs not, in points: ${Object.entries(lift).map(([p, v]) => `${p} ${v.gap.toFixed(1)} (${v.short}/${v.not})`).join(', ')}`);
}

open(10);
{
  /* The shared half knows no sport (correction 10), and neither new library draws from Math.random or carries an
     address. Code is read with comments stripped; the address scan reads the raw file, as simGmDraftOrder's does. */
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const raw = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
  let shared = strip(raw(FILES.shared));
  if (CONTROL === 'sportname') shared += "\nconst league = 'nba';\n";
  if (CONTROL === 'foreignimport') shared += "\nimport { withGmBlock } from './gmDesk';\n";
  const ALLOWED = ['./gmDraftNight', './gmDraftOrder', './gmLotteryNight', './gmPicks', '@/data/gmDraftOrder/rules'];
  const froms = [...shared.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  check(froms.length > 0, `${FILES.shared} imports nothing this check can read`);
  for (const f of froms) check(ALLOWED.includes(f), `${FILES.shared} imports ${f}; the shared half may import the lift and nothing of a sport`);
  check(!/nba|nfl|nhl|mlb/i.test(shared), `${FILES.shared} names a sport in its code`);
  for (const rel of [FILES.shared, FILES.bind]) {
    check(!/Math\.random/.test(strip(raw(rel))), `${rel} draws from Math.random`);
    check(!/https?:\/\/|www\.[a-z0-9-]+\.[a-z]/i.test(raw(rel)), `${rel} carries an address`);
  }
  console.log(`   ${FILES.shared}: ${froms.length} imports, all the lift's; no sport named; neither library draws from Math.random or carries an address`);
}

open(12);
{
  for (const p of Q[12]) fail(p);
  /* Never passes empty: the walk's nights signed men, his own among them, and second rounders were followed. */
  check(DEALS.signed > 0 && DEALS.mine > 0 && DEALS.kept > 0, `${DEALS.signed} draft night deals followed through the summer, ${DEALS.mine} his own, ${DEALS.kept} still on their clubs`);
  check(N.NBA_DRAFT_KNOBS.secondOnMin !== true || (DEALS.secondsKept > 0 && DEALS.mineSeconds > 0), `knob (i) on, and ${DEALS.secondsKept} second rounders (${DEALS.mineSeconds} his) were followed into their season at the minimum`);
  console.log(`   ${DEALS.signed} draft night deals followed through the summer after them: ${DEALS.mine} his own (every one still his, none on his re-sign desk), ${DEALS.kept} on their clubs with the deal less one season, ${DEALS.trimmed} rivals' men waived by the summer's trim; ${DEALS.secondsKept} second rounders (${DEALS.mineSeconds} his) into their one season at the minimum`);
}

/* ================================================================== */
/* THE FLEET. One career is one league, one user club, ten seasons, in a loaded copy of the bundle of its own whose
   id epoch is seeded by the career and the run, so both arms of a career walk the same ids and the same season one. */
const SEASONS = 10;
const RUN = Number(process.env.SIM_NBA_EARNED_DRAFT_RUN || 1);
function freshCopy(key) {
  delete requireHere.cache[requireHere.resolve(BUNDLE)];
  const saved = Math.random;
  Math.random = mulberry32(key);
  try { return requireHere(BUNDLE); } finally { Math.random = saved; }
}
/** The six user clubs by opening strength: the two strongest, the two in the middle, the two weakest. */
function fleetClubs() {
  const lg = E.initNbaLeague(mulberry32(1), NBA_OPENING_RATINGS);
  const ranked = [...CLUBS].sort((a, b) => E.nbaStrength(lg.teams[b]) - E.nbaStrength(lg.teams[a]) || (a < b ? -1 : 1));
  const n = ranked.length;
  return [[0, 'strong'], [1, 'strong'], [n / 2 - 1, 'middle'], [n / 2, 'middle'], [n - 2, 'weak'], [n - 1, 'weak']]
    .map(([i, tier]) => ({ club: ranked[i], tier, strength: Math.round(E.nbaStrength(lg.teams[ranked[i]]) * 100) / 100 }));
}
/** The clubs of the playoff sixteen: home or away in a series somebody won with four wins (the play-in is to one). */
function sixteenOf(series) {
  const out = new Set();
  for (const s of series) if (s.homeWins === 4 || s.awayWins === 4) { out.add(s.home); out.add(s.away); }
  return out;
}

/** Today's draft, desk on, as the board plays it (simNbaGmDesk.mjs, draftNight): the GM takes the best man on his
    scout's read first in each batch, then the other clubs go in batches of five in reverse standings. */
function oldDraft(X, lg, team, rng, desk) {
  const capital = X.E.nbaDraftCapital(lg.teams[team]) ?? 0;
  const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + (X.E.nbaDraftCapital(t) ?? 0), 0);
  return oldDraftWith(X, lg, team, rng, desk, X.E.nbaDraftClass(rng, Math.max(24, capital + Math.min(10, rivalCapital)), X.leagueNames(lg)));
}
/** The same old draft on a class already drawn: what a board falls back to when a saved night cannot be trusted,
    with the two rival batches an open saves (the brief's open question 3). */
function oldDraftWith(X, lg, team, rng, desk, drawn) {
  const mine = lg.teams[team];
  const capital = X.E.nbaDraftCapital(mine) ?? 0;
  let cls = drawn;
  const level = X.S.gmStaffLevel(X.D.nbaStaffOf(desk, lg, team).block, 'scouting');
  const read = pr => X.D.nbaScoutRead(pr, team, lg.season, level);
  let batches = 2;
  let taken = 0;
  let first = null;
  const aiBatch = () => {
    const order = X.E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    const r = X.E.nbaAiDraftPicks(lg, cls, order, rng);
    cls = r.remaining;
    taken += r.picks.length;
    batches -= 1;
  };
  if (capital === 0) { mine.picks = []; while (batches > 0) aiBatch(); return { desk, first, signed: taken }; }
  let picksLeft = capital;
  while (picksLeft > 0) {
    const cap = X.E.nbaDraftCapital(mine) ?? 0;
    if (cap === 0) break;
    if (cap > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    const pr = [...cls].sort((a, b) => read(b) - read(a) || a.id.localeCompare(b.id))[0];
    if (!pr) break;
    const round = mine.picks[0];
    if (!X.E.nbaConsumeDraftPick(mine)) break;
    const p = X.E.nbaProspectToPlayer(pr, rng, X.E.nbaDraftSigning(lg));
    X.D.nbaSignDraftee(p, round);
    mine.players.push(p);
    desk = X.D.nbaNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    taken += 1;
    if (!first) first = { overall: taken, trueOvr: pr.trueOvr };
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    do { if (batches === 0) break; aiBatch(); } while (nextPicks === 0 && batches > 0);
    picksLeft = nextPicks;
  }
  return { desk, first, signed: taken };
}

/** The earned draft as the board will play it in part B, through the libraries' own presses: the night opens, the
    class is drawn, Continue, then his pick of the best man on his scout's read at each of his slots (the staff's
    press when a pick is refused) until the run is done. `fell` when no night opened: the old draft then ran. */
function newDraft(X, lg, team, rng, desk, series) {
  const opened = X.N.openNbaDraftNight(desk, lg, series, team);
  if (!opened) return { ...oldDraft(X, lg, team, rng, desk), fell: true };
  desk = opened.desk;
  const level = X.S.gmStaffLevel(X.D.nbaStaffOf(desk, lg, team).block, 'scouting');
  const read = p => X.D.nbaScoutRead(p, team, lg.season, level);
  let cls = X.E.nbaEarnedDraftClass(rng, opened.night.slots.length, X.leagueNames(lg));
  const trueOf = new Map(cls.map(p => [p.name, p.trueOvr]));
  let first = null;
  let signed = 0;
  let res = X.N.nbaDraftContinue(lg, desk, team, cls, rng);
  for (let guard = 0; res && guard < 200; guard += 1) {
    signed += res.steps.length;
    for (const st of res.steps) if (st.mine && !first) first = { overall: st.overall, trueOvr: trueOf.get(st.playerName) };
    desk = res.desk;
    cls = res.left;
    if (res.done) break;
    const best = [...cls].sort((a, b) => read(b) - read(a) || (a.id < b.id ? -1 : 1))[0];
    res = (best && X.N.nbaDraftPick(lg, desk, team, cls, best.id, rng)) || X.N.nbaDraftByStaff(lg, desk, team, cls, rng);
  }
  return { desk, first, signed, stuck: !res || !res.done };
}

/** The arbitrage arm (critic 25, advice 24): on opening day his first of this season's draft and the first of the
    club of lowest nbaStrength change hands, FORCED (movePicks then syncNbaPicks, no club asked), so what it buys is a
    CEILING on what a pick trade could buy, never a price. No swap when his club is the weakest. */
function arbSwap(X, lg, team, desk) {
  const weakest = Object.keys(lg.teams).sort((a, b) => X.E.nbaStrength(lg.teams[a]) - X.E.nbaStrength(lg.teams[b]) || (a < b ? -1 : 1))[0];
  if (weakest === team) return { desk, swapped: false };
  let ledger = X.D.nbaPicksOf(desk, lg);
  const firstOf = c => ledger.picks.find(p => p.year === lg.season && p.round === 1 && p.holder === c);
  const mine = firstOf(team);
  const theirs = firstOf(weakest);
  if (!mine || !theirs) return { desk, swapped: false };
  ledger = X.P.movePicks(ledger, [X.P.pickKey(mine)], weakest);
  ledger = X.P.movePicks(ledger, [X.P.pickKey(theirs)], team);
  X.D.syncNbaPicks(lg, ledger);
  return { desk: X.GD.withGmBlock(desk, X.D.NBA_DESK_KEYS.picks, ledger), swapped: true };
}

const ARM_DRAFT = { old: oldDraft, new: newDraft, arb: newDraft };
const labelOf = arm => (arm === 'old' ? 'old' : TAG ? `${arm}-${TAG}` : arm);

/** One career: ten seasons, a draft after each, the desk's summer after each but the last. */
function career(arm, set, seed, ci, club, tier) {
  /* The league's stream is the seed's and the club's; only the id epoch follows the run. */
  const key = (100003 + seed * 64 + ci) >>> 0;
  const X = freshCopy((key ^ Math.imul(RUN, 0x5bd1e995)) >>> 0);
  const rng = mulberry32(key);
  const lg = X.E.initNbaLeague(rng, X.NBA_OPENING_RATINGS);
  let desk = X.D.openNbaDesk(lg, club);
  const rec = { arm, label: labelOf(arm), run: RUN, set, seed, club, tier, at: {}, pool10: {}, swaps: 0, seasons: [] };
  for (let s = 1; s <= SEASONS; s += 1) {
    if (arm === 'arb') {
      const sw = arbSwap(X, lg, club, desk);
      desk = sw.desk;
      if (sw.swapped) rec.swaps += 1;
    }
    const out = seasonToDraft(X, lg, club, desk, rng, l => {
      /* critic 23b: the mean rating of the free agent pool's best ten at tip off, every season. */
      const pool = [...l.freeAgents].map(p => p.ovr).sort((a, b) => b - a).slice(0, 10);
      rec.pool10[s] = pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : null;
      if (s !== 5 && s !== 10) return;
      const teams = Object.values(l.teams);
      const str = teams.map(t => X.E.nbaStrength(t));
      const m = str.reduce((a, b) => a + b, 0) / str.length;
      rec.at[s] = {
        strength: m,
        spread: Math.sqrt(str.reduce((a, b) => a + (b - m) ** 2, 0) / (str.length - 1)),
        stars: teams.reduce((sum, t) => sum + t.players.filter(p => p.ovr >= 85).length, 0),
      };
    });
    desk = out.desk;
    const sixteen = sixteenOf(out.series);
    const worstFirst = X.E.nbaStandings(lg).map(t => t.abbr).reverse();
    const row = {
      s, wins: lg.teams[club].wins, made: sixteen.has(club), title: out.champion === club, sixteen: sixteen.size,
      finish: worstFirst.indexOf(club) + 1,
      dead: Object.values(lg.teams).filter(t => t.abbr !== club).reduce((sum, t) => sum + X.deadCapUsed(t), 0),
      payers: out.taxes.filter(x => x.bill > 0).length,
      /* critic 23a: his own dead money (the fleet's GM waives only at tip off, the weakest men, mostly draftees). */
      myDead: X.deadCapUsed(lg.teams[club]),
      /* every club's wins and whether it made the sixteen, in CLUBS order, for the bottom three's climb */
      w: CLUBS.map(c => lg.teams[c].wins),
      g: lg.teams[club].wins + lg.teams[club].losses,
      m: CLUBS.map(c => (sixteen.has(c) ? '1' : '0')).join(''),
    };
    const d = ARM_DRAFT[arm](X, lg, club, rng, desk, out.series);
    desk = d.desk;
    row.first = d.first;
    row.signed = d.signed;
    if (d.fell) row.fell = true;
    if (d.stuck) row.stuck = true;
    rec.seasons.push(row);
    if (s < SEASONS) {
      const summer = X.D.nbaDeskOffseason(lg, desk, club, rng);
      if (!summer.ok) { rec.refused = s; break; }
      desk = summer.desk;
    }
  }
  return rec;
}

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const sdOf = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const fix = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');
/* The step (a) margins, the fleet rule's own (S3 and S4 in points of a rate), used only to size the fleet. */
const MARGIN = { S3: 10, S4: 10 };
/* THE STOP LINES, in each outcome's own unit. Fixed before the new arm was measured (the brief's decision 2 as the
   lead ruled it on 2026-10-13, lead-rulings-1319-1320-1321.md), then ruled again on the step (d) table by the lead
   on 2026-10-21 (dukb-handoff/2026-10-10/briefs/lead-rulings-1321-d.md), which is what stands here:
   - S1 at 5 keeps its band of 0.5 either side.
   - S1 at 10 is ACCEPTED up to +1.5 (the cost of a league where every club drafts every year instead of six); the
     ruling widened the upper side only, so the lower side keeps the old 0.5: new minus old from -0.5 to +1.5.
   - S3 is PRINTED, never asserted (ruling 1): it measures today's draft's gift to the GM, the artifact the round
     exists to remove, not a level to protect.
   - S4 is an ABSOLUTE FLOOR on the new arm's own rate (ruling 2): at least 60 percent of the two strongest starts'
     seasons 2 to 10 are playoff seasons (contention protected, a dynasty not), the old arm printed beside it.
   - S6 dead is under 3.0 $M a season (ruling 4). ITS CAUSE, written beside it as the lead asked: CPU clubs' first
     rounders 13 to 30 sign the engine's four season deal (nbaProspectToPlayer), which the summer right after the
     draft cuts to three played, and CPU clubs cut them; no allowed knob reaches that deal. Only HIS club's first
     rounders get the rookie scale's four played (nbaSignDraftee adds the summer's season), so that scale is his
     club's alone today, not the league's (review 2026-10-22). The real fix is a per slot rookie scale with team
     options for every club (two guaranteed years and two options, so a late first rounder is declined rather than
     cut), counting the summer's season as nbaSignDraftee and knob (i) do, named for PART B or a PART C, after which
     this band returns under 1.0.
   Kinds: `two` is |d| <= margin; `range` is lo <= d <= hi; `floor` is the arm's own mean >= floor; `cap` is the
   arm's own mean < margin; `print` is computed and printed with no verdict. `res` is the scale whose third a run's
   error must beat (the resolution rule, correction 8 (b)): the margin for `two`, the narrower side for `range`, the
   step (a) margin of 10 points for the S4 floor (the scale the fleet was sized on) and the old band of 1.0 for the
   S6 cap, so neither widened band made its line coarser. */
const LINES = [
  { id: 'S1 at 5', get: L => L.S1at5, kind: 'two', margin: () => 0.5, d: 2, what: 'mean nbaStrength of the 30 clubs, season 5 tip off' },
  { id: 'S1 at 10', get: L => L.S1at10, kind: 'range', lo: -0.5, hi: 1.5, margin: () => 1.5, res: () => 0.5, d: 2, what: 'mean nbaStrength of the 30 clubs, season 10 tip off (ruled 2026-10-21: up to +1.5)' },
  { id: 'S2', get: L => L.S2, kind: 'two', margin: old => 0.2 * old, d: 1, what: 'men rated 85 or more, season 10 tip off (20 percent of the old arm)' },
  { id: 'S3', get: L => L.S3.rate, kind: 'print', margin: () => 10, d: 1, what: "two weakest starts' playoff seasons, seasons 2 to 5, per season (ruled 2026-10-21: printed)" },
  { id: 'S4', get: L => L.S4.rate, kind: 'floor', floor: 60, margin: () => 60, res: () => 10, d: 1, what: "two strongest starts' playoff seasons, seasons 2 to 10, per season (ruled 2026-10-21: the arm's own, at least 60)" },
  { id: 'S6 dead', get: L => L.S6dead, kind: 'cap', margin: () => 3.0, res: () => 1.0, d: 2, what: "CPU dead money a season ($M), seasons 2 to 10 (ruled 2026-10-21: under 3.0; cause: CPU firsts 13 to 30 on the engine's four season deal, three played, cut)" },
  { id: 'S6 payers', get: L => L.S6payers, kind: 'two', margin: () => 0.5, d: 2, what: 'tax payers a season, seasons 2 to 10' },
];
/* The kinds whose value is the arm's own per set mean rather than its difference from the old arm. */
const OWN = new Set(['floor', 'cap']);

/** THE JUDGE'S ONE COMPARISON: is a pooled difference (or, for a floor or a cap, the arm's own pooled mean) inside its
    line's band? Every verdict of the two arm table goes through here, and section 11 holds it to known answers.
    Controls judgetwo, judgerange, judgefloor and judgecap each slip one of its comparisons in a copy of this file,
    and judgeflip turns the first one inside out, so that this function can be shown to decide (lead's ruling 7). */
function inBand(line, dbar, margin) {
  if (line.kind === 'two') return Math.abs(dbar) <= margin;
  if (line.kind === 'range') return dbar >= line.lo && dbar <= line.hi;
  if (line.kind === 'floor') return dbar >= line.floor;
  if (line.kind === 'cap') return dbar < margin;
  throw new Error(`the judge knows no band of kind ${line.kind}`);
}

/** One line judged over the runs: old and vs map run -> set -> a set's lines. Pure: it prints and checks nothing. */
function judgeLine(line, old, vs, runs) {
  const perRun = runs.map(r => {
    const sets = [...vs.get(r).keys()].filter(s => old.get(r).has(s)).sort((a, b) => a - b);
    const o = sets.map(s => line.get(old.get(r).get(s)));
    const v = sets.map(s => line.get(vs.get(r).get(s)));
    const d = OWN.has(line.kind) ? v : v.map((x, i) => x - o[i]);
    return { run: r, k: sets.length, old: mean(o), vs: mean(v), d: mean(d), sdd: sdOf(d), se: sdOf(d) / Math.sqrt(sets.length) };
  });
  const oldMean = mean(perRun.map(p => p.old));
  const margin = line.margin(oldMean);
  const res = line.res ? line.res(oldMean) : margin;
  const dbar = mean(perRun.map(p => p.d));
  const maxSe = Math.max(...perRun.map(p => p.se));
  const resolved = perRun.length > 0 && perRun.every(p => Number.isFinite(p.se) && p.se < res / 3);
  /* Correction 8 (b) wants the two runs within two errors of each other, so one run is never a verdict (review
     2026-10-22, F2: with one run this used to be true by construction). */
  const two = perRun.length === 2;
  const agree = two && Math.abs(perRun[0].d - perRun[1].d) <= 2 * maxSe;
  if (line.kind === 'print') return { perRun, margin, res, dbar, maxSe, verdict: 'PRINTED', miss: NaN, need: 0 };
  const inside = inBand(line, dbar, margin);
  const verdict = !inside ? 'OUTSIDE' : !resolved ? 'UNRESOLVED' : !two ? 'NOT TWO RUNS' : !agree ? 'RUNS DISAGREE' : 'PASS';
  const miss = line.kind === 'two' ? Math.abs(dbar) - margin
    : line.kind === 'range' ? (dbar > line.hi ? dbar - line.hi : line.lo - dbar)
    : line.kind === 'floor' ? line.floor - dbar : dbar - margin;
  let need = 0;
  const sdd = Math.max(...perRun.map(p => p.sdd));
  if (verdict === 'UNRESOLVED' && Number.isFinite(sdd)) { need = perRun[0].k; while (need < 24 && sdd / Math.sqrt(need) >= res / 3) need += 1; }
  return { perRun, margin, res, dbar, maxSe, verdict, miss, need };
}

/** What the table asserts of an asserted line's verdict: PASS and nothing else (OUTSIDE is a STOP, UNRESOLVED grows
    the fleet, NOT TWO RUNS and RUNS DISAGREE are no verdict). Section 11 holds it to every known answer and control
    judgepass loosens it (review 2026-10-22, F2: this assertion had no control). */
function lineHolds(verdict) {
  return verdict === 'PASS';
}

/* The fleet a table may be judged on (the lead's decision 2 and correction 8 (b)): two runs of the same sets, each
   holding at least twelve sets in both arms. Anything less is not a verdict (review 2026-10-22, F2: a COMBINE of one
   run of two sets once judged every line PASS). A fleet control's own reduced fleet (advice 20) is exempt; it is
   judged on its misses, not on a PASS. Control judgefleet loosens it. */
const FLEET_RUNS = 2;
const FLEET_MIN_SETS = 12;
function fleetShort(old, vs) {
  const runs = [...vs.keys()].filter(r => old.has(r)).sort((a, b) => a - b);
  const short = [];
  if (runs.length !== FLEET_RUNS) short.push(`${runs.length} run${runs.length === 1 ? '' : 's'} held by both arms, the fleet is ${FLEET_RUNS}`);
  for (const r of runs) {
    const k = [...vs.get(r).keys()].filter(s => old.get(r).has(s)).length;
    if (k < FLEET_MIN_SETS) short.push(`run ${r} holds ${k} sets in both arms, the fleet is at least ${FLEET_MIN_SETS}`);
  }
  return short;
}

const bandText = (line, margin) => (line.kind === 'two' ? `within ${fix(margin, line.d)}`
  : line.kind === 'range' ? `from ${fix(line.lo, line.d)} to +${fix(line.hi, line.d)}`
  : line.kind === 'floor' ? `the arm's own at least ${fix(line.floor, line.d)}`
  : line.kind === 'cap' ? `the arm's own under ${fix(margin, line.d)}` : 'printed, never asserted');

/** One seed set's lines. S3 is playoff seasons over seasons 2 to 5 of the two weakest starts and S4 playoff seasons
    over seasons 2 to 10 of the two strongest, per season: season 1 is played before any draft and is the same in
    both arms. S6 is seasons 2 to 10 for the same reason. n is printed beside every rate. */
function setLines(careers) {
  const rows = (tier, from, to) => careers.filter(c => !tier || c.tier === tier).flatMap(c => c.seasons.filter(r => r.s >= from && r.s <= to));
  const rate = (list, key) => ({ n: list.length, rate: list.length ? (100 * list.filter(r => r[key]).length) / list.length : NaN });
  const all = rows(null, 1, SEASONS);
  const late = rows(null, 2, SEASONS);
  const tiers = {};
  for (const t of ['strong', 'middle', 'weak']) {
    const list = rows(t, 1, SEASONS);
    const drafted = rows(t, 1, SEASONS).filter(r => r.first);
    tiers[t] = { playoffs: rate(list, 'made'), titles: rate(list, 'title'), wins: mean(list.map(r => r.wins)), pick: mean(drafted.map(r => r.first.overall)), pickTrue: mean(drafted.map(r => r.first.trueOvr)) };
  }
  /* The bottom three of every season but the last three: in the sixteen within three seasons, and the change in win
     share after three (critic 22's climb). */
  let b3 = 0;
  let b3made = 0;
  let b3delta = 0;
  for (const c of careers) {
    for (let i = 0; i + 3 < c.seasons.length; i += 1) {
      const r = c.seasons[i];
      if (!r.w || !r.g) continue;
      const low = r.w.map((w, k) => [w, k]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 3).map(x => x[1]);
      for (const k of low) {
        b3 += 1;
        if ([1, 2, 3].some(j => c.seasons[i + j].m[k] === '1')) b3made += 1;
        b3delta += (c.seasons[i + 3].w[k] - r.w[k]) / r.g;
      }
    }
  }
  const at = (s, key) => mean(careers.map(c => c.at[s]?.[key]).filter(Number.isFinite));
  const bands = [];
  for (let b = 1; b <= 6; b += 1) {
    const list = all.filter(r => r.first && Math.ceil(r.finish / 5) === b);
    bands.push({ band: `${b * 5 - 4}-${b * 5}`, n: list.length, overall: mean(list.map(r => r.first.overall)), trueOvr: mean(list.map(r => r.first.trueOvr)) });
  }
  return {
    careers: careers.length,
    S1at5: mean(careers.map(c => c.at[5]?.strength).filter(Number.isFinite)),
    S1at10: mean(careers.map(c => c.at[10]?.strength).filter(Number.isFinite)),
    S2: mean(careers.map(c => c.at[10]?.stars).filter(Number.isFinite)),
    S3: rate(rows('weak', 2, 5), 'made'),
    S4: rate(rows('strong', 2, SEASONS), 'made'),
    S4titles: rate(rows('strong', 2, SEASONS), 'title'),
    S5: bands,
    S6dead: mean(late.map(r => r.dead)),
    S6payers: mean(late.map(r => r.payers)),
    tiers,
    signed: mean(all.map(r => r.signed)),
    spread5: at(5, 'spread'),
    spread10: at(10, 'spread'),
    pool10: mean(careers.flatMap(c => Object.entries(c.pool10 ?? {}).filter(([s, v]) => Number(s) >= 2 && Number.isFinite(v)).map(([, v]) => v))),
    myDead: mean(late.map(r => r.myDead).filter(Number.isFinite)),
    b3: { n: b3, made: b3 ? (100 * b3made) / b3 : NaN, delta: b3 ? (100 * b3delta) / b3 : NaN },
    swaps: careers.reduce((s, c) => s + (c.swaps ?? 0), 0),
    fell: all.filter(r => r.fell).length,
    stuck: all.filter(r => r.stuck).length,
  };
}

/** The smallest number of sets with root 2 times the per set sd, over root k, under a third of the margin; never under 12. */
function fleetFor(sd, margin) {
  if (!Number.isFinite(sd)) return NaN;
  let k = 12;
  while (Math.SQRT2 * sd / Math.sqrt(k) >= margin / 3) k += 1;
  return k;
}

/* A COMBINE held against a control's own new arm (new-fatclass, new-bestfirst): it must land OUTSIDE a line. */
const FLEET_CONTROL = COMBINE && VS.startsWith('new-') && CONTROLS[VS.slice(4)] ? VS.slice(4) : '';
const fleetMisses = [];

/** THE TWO ARM TABLE AND ITS STOP LINES (COMBINE only). For every line and every run, the per set differences of
    the arm VS minus the old arm on the same sets are the replicates: the pooled difference is their mean and its
    error their sd over root k (correction 8 (b)). A line PASSES when the mean of the runs' pooled differences is
    inside its band (inBand, the judge's one comparison), every run's error is under a third of the line's `res`,
    and the two runs' pooled differences are within two errors (the larger run's) of each other. OUTSIDE is a STOP;
    UNRESOLVED grows the fleet once, to the printed size and at most 24 sets. A `floor` or `cap` line holds the
    arm's own per set means the same way; a `print` line (S3) is printed and never asserted. */
function twoArmTable(table) {
  const old = table.get('old');
  const vs = table.get(VS);
  check(!!old && !!vs, `COMBINE holds ${VS} against the old arm and found ${[...table.keys()].join(', ')}`);
  if (!old || !vs) return;
  const runs = [...vs.keys()].filter(r => old.has(r)).sort((a, b) => a - b);
  const short = fleetShort(old, vs);
  console.log(`   the fleet judged: ${runs.map(r => `run ${r} ${[...vs.get(r).keys()].filter(s => old.get(r).has(s)).length} sets`).join(', ')}${short.length ? ` (SHORT: ${short.join('; ')})` : ''}`);
  if (!FLEET_CONTROL) check(short.length === 0, `the fleet is short of the ruled size: ${short.join('; ')}`);
  const md = ['TABLE BEGIN', `| line | old | ${VS} | ${VS} minus old, run by run (error) | band | sets | verdict |`, '|---|---|---|---|---|---|---|'];
  for (const line of LINES) {
    const { perRun, margin, maxSe, verdict, miss, need } = judgeLine(line, old, vs, runs);
    const said = `${verdict}${verdict === 'OUTSIDE' ? ` by ${fix(miss, line.d)} (${fix(miss / maxSe, 1)} errors)` : ''}${need ? ` (the rule asks ${need} sets)` : ''}`;
    const own = OWN.has(line.kind) ? "(the arm's own) " : '';
    md.push(`| ${line.id}: ${line.what} | ${perRun.map(p => fix(p.old, line.d)).join(' / ')} | ${perRun.map(p => fix(p.vs, line.d)).join(' / ')} | ${own}${perRun.map(p => `${p.d >= 0 && !own ? '+' : ''}${fix(p.d, line.d)} (${fix(p.se, line.d)})`).join(' / ')} | ${bandText(line, margin)} | ${perRun.map(p => p.k).join(' / ')} | ${said} |`);
    if (verdict === 'OUTSIDE') fleetMisses.push(`${line.id} by ${fix(miss, line.d)}, ${fix(miss / maxSe, 1)} errors`);
    if (!FLEET_CONTROL && line.kind !== 'print') check(lineHolds(verdict), `${line.id} (${line.what}): ${said}`);
  }
  /* S5: in every set of every run of VS, his first selection comes later and is worse at every band of finish. */
  const s5bad = [];
  for (const r of runs) {
    for (const [s, L] of vs.get(r)) {
      const b = L.S5;
      const ok = b.every(x => x.n > 0) && b.slice(1).every((x, i) => x.overall > b[i].overall && x.trueOvr < b[i].trueOvr);
      if (!ok) s5bad.push(`run ${r} set ${s}`);
    }
  }
  const s5n = runs.reduce((a, r) => a + vs.get(r).size, 0);
  md.push(`| S5: his first selection later and worse at every band of finish, in every set | flat (pick 1) | ${s5n - s5bad.length} of ${s5n} sets | | every set | ${s5n} | ${s5bad.length ? `OUTSIDE in ${s5bad.join(', ')}` : 'PASS'} |`);
  if (s5bad.length) fleetMisses.push(`S5 in ${s5bad.length} sets`);
  if (!FLEET_CONTROL) check(s5bad.length === 0, `S5: the rise is not positive at every band in ${s5bad.join(', ')}`);
  md.push('TABLE END');
  console.log(md.join('\n'));
  /* What the lead reads beside the lines, never asserted: pooled over every set and run of each arm. */
  const pooled = (label, f) => { const m = table.get(label); if (!m) return NaN; return mean([...m.values()].flatMap(x => [...x.values()].map(f))); };
  const labels = ['old', VS, ...[...table.keys()].filter(l => l !== 'old' && l !== VS)];
  const say = (what, f, d = 1) => console.log(`   ${what}: ${labels.map(l => `${l} ${fix(pooled(l, f), d)}`).join(', ')}`);
  console.log('   EVERY ARM ON THE LINES, minus the old arm on the same sets and runs (S4 and S6 dead are the arm\'s own), pooled:');
  for (const l of labels.filter(x => x !== 'old')) {
    const m = table.get(l);
    const cells = LINES.map(line => {
      const d = [];
      for (const [r, sets] of m) for (const [s, L] of sets) if (old.get(r)?.has(s)) d.push(OWN.has(line.kind) ? line.get(L) : line.get(L) - line.get(old.get(r).get(s)));
      return `${line.id} ${fix(mean(d), line.d)}`;
    });
    const all = [...m.values()].flatMap(x => [...x.values()]);
    const s5ok = all.filter(L => L.S5.every(x => x.n > 0) && L.S5.slice(1).every((x, i) => x.overall > L.S5[i].overall && x.trueOvr < L.S5[i].trueOvr)).length;
    console.log(`   ${l} (${all.length} sets): ${cells.join(', ')}, S5 in ${s5ok} of ${all.length} sets`);
  }
  console.log('   BESIDE THE LINES (pooled, printed, never asserted):');
  say("strong starts' title share, seasons 2 to 10 (per season)", L => L.S4titles.rate);
  for (const t of ['strong', 'middle', 'weak']) {
    say(`${t} starts: playoff seasons`, L => L.tiers[t].playoffs.rate);
    say(`${t} starts: title seasons`, L => L.tiers[t].titles.rate);
    say(`${t} starts: mean wins`, L => L.tiers[t].wins);
    say(`${t} starts: his first selection, pick number`, L => L.tiers[t].pick);
    say(`${t} starts: his first selection, true rating`, L => L.tiers[t].pickTrue);
  }
  say('the bottom three: in the sixteen within three seasons (percent)', L => L.b3.made);
  say('the bottom three: change in win share after three seasons (points)', L => L.b3.delta);
  say('the spread of nbaStrength over the 30 clubs, season 5', L => L.spread5, 2);
  say('the spread of nbaStrength over the 30 clubs, season 10', L => L.spread10, 2);
  say('the free agent pool\'s best ten at tip off, seasons 2 to 10', L => L.pool10, 2);
  say('his own dead money a season ($M), seasons 2 to 10', L => L.myDead, 2);
  say('men signed on a draft night', L => L.signed);
  say('forced swaps of firsts a set (arb only)', L => L.swaps, 0);
  if (FLEET_CONTROL) console.log(`   CONTROL ${FLEET_CONTROL} on the fleet: ${fleetMisses.length ? `outside ${fleetMisses.join('; ')}` : 'inside every line'}`);
}

/* ================================================================== */
/* 11. THE JUDGE ON KNOWN ANSWERS, in every run (the quick lane too). A synthetic table of two runs of twelve sets
   whose answer is known: for every asserted line, a value inside and a value outside its band on BOTH sides of
   every edge (a two sided band at half and one and a half margins, the range a tenth of its width inside and outside
   each end, the floor and the cap five points or half a cap either side), and S3 never judged at all. The table
   itself is judged by the same judgeLine and inBand the fleet's table goes through, so a judge that cannot say
   OUTSIDE, or says it on the wrong side, goes red here whatever the fleet holds. The controls judge* prove it. */
open(11);
{
  const base = { S1at5: 83, S1at10: 82, S2: 100, S3: { n: 80, rate: 80 }, S4: { n: 180, rate: 100 }, S6dead: 0.1, S6payers: 2.3 };
  const field = { 'S1 at 5': 'S1at5', 'S1 at 10': 'S1at10', S2: 'S2', S3: 'S3', S4: 'S4', 'S6 dead': 'S6dead', 'S6 payers': 'S6payers' };
  const runsOf = (setL, runs = [1, 2], sets = 12) => new Map(runs.map(r => [r, new Map(Array.from({ length: sets }, (_, i) => [i + 1, setL(i, r)]))]));
  const old = runsOf(() => base);
  let known = 0;
  let held = 0;
  for (const line of LINES) {
    const key = field[line.id];
    check(!!key && line.get(base) !== undefined, `section 11 has no synthetic field for line ${line.id}`);
    if (!key) continue;
    const margin = line.margin(line.get(base));
    const res = line.res ? line.res(line.get(base)) : margin;
    const own = OWN.has(line.kind);
    /* [the value the line reads in the new arm, the verdict it must get] */
    const cases = line.kind === 'two' ? [[0.5, 'PASS'], [-0.5, 'PASS'], [1.5, 'OUTSIDE'], [-1.5, 'OUTSIDE']].map(([f, v]) => [line.get(base) + f * margin, v])
      : line.kind === 'range' ? [[line.hi - 0.1 * (line.hi - line.lo), 'PASS'], [line.lo + 0.1 * (line.hi - line.lo), 'PASS'], [line.hi + 0.1 * (line.hi - line.lo), 'OUTSIDE'], [line.lo - 0.1 * (line.hi - line.lo), 'OUTSIDE']].map(([dv, v]) => [line.get(base) + dv, v])
      : line.kind === 'floor' ? [[line.floor + 5, 'PASS'], [line.floor - 5, 'OUTSIDE']]
      : line.kind === 'cap' ? [[0.5 * margin, 'PASS'], [1.5 * margin, 'OUTSIDE']]
      : [[line.get(base) - 50, 'PRINTED'], [line.get(base), 'PRINTED']];
    /* The resolution and agreement half (review 2026-10-22, F2), on the value of the first PASS case, for every
       asserted line: a set to set spread of two `res` either side puts the error near 0.6 of `res`, over the third
       the rule allows (UNRESOLVED); two runs a tenth of `res` either side of it, each resolved, are farther apart than
       two errors (RUNS DISAGREE); and one run alone is no verdict (NOT TWO RUNS). Each is inside its band, so only
       the half under test can keep it from PASS. */
    const inside = cases.find(c => c[1] === 'PASS')?.[0];
    const shapes = [{ value: null, want: null, spread: 1 / 100, apart: 0, runs: [1, 2] }];
    if (line.kind !== 'print') {
      shapes.push({ value: inside, want: 'UNRESOLVED', spread: 2, apart: 0, runs: [1, 2] });
      shapes.push({ value: inside, want: 'RUNS DISAGREE', spread: 1 / 100, apart: 1 / 10, runs: [1, 2] });
      shapes.push({ value: inside, want: 'NOT TWO RUNS', spread: 1 / 100, apart: 0, runs: [1] });
    }
    const all = [...cases.map(([value, want]) => ({ ...shapes[0], value, want })), ...shapes.slice(1)];
    for (const c of all) {
      /* a jitter set to set (mean zero over the twelve sets) and, for the two runs, an offset either side */
      const vs = runsOf((i, r) => {
        const v = c.value + (i % 2 ? 1 : -1) * c.spread * res + (r === 1 ? -1 : 1) * c.apart * res;
        return { ...base, [key]: typeof base[key] === 'object' ? { ...base[key], rate: v } : v };
      }, c.runs);
      const got = judgeLine(line, runsOf(() => base, c.runs), vs, c.runs).verdict;
      known += 1;
      check(got === c.want, `${line.id} (${line.kind}): the new arm at ${fix(c.value, line.d)}${own ? '' : ` against ${fix(line.get(base), line.d)}`} (spread ${c.spread} res, runs ${c.runs.length}${c.apart ? `, ${c.apart} res apart` : ''}) was judged ${got}, the known answer is ${c.want}`);
      /* and what the table asserts of that verdict: it holds a line only on PASS */
      if (line.kind !== 'print') {
        held += 1;
        check(lineHolds(got) === (c.want === 'PASS'), `${line.id}: the table would ${lineHolds(got) ? 'hold' : 'refuse'} a line judged ${got} (known answer ${c.want})`);
      }
    }
  }
  check(known >= 40, `section 11 judged only ${known} known answers`);
  /* The fleet's size (review 2026-10-22, F2): two runs of twelve sets or more is a fleet; one run, or a run short of
     twelve sets, is not. */
  const sized = [
    [[1, 2], 12, [1, 2], 12, true], [[1, 2], 24, [1, 2], 24, true], [[1], 12, [1], 12, false],
    [[1, 2], 12, [1, 2], 11, false], [[1, 2], 2, [1, 2], 2, false], [[1, 2], 12, [1], 12, false],
  ];
  for (const [oRuns, oSets, vRuns, vSets, whole] of sized) {
    const short = fleetShort(runsOf(() => base, oRuns, oSets), runsOf(() => base, vRuns, vSets));
    known += 1;
    check((short.length === 0) === whole, `a fleet of old ${oRuns.length} runs of ${oSets} sets and new ${vRuns.length} of ${vSets} was judged ${short.length ? `short (${short.join('; ')})` : 'whole'}, the known answer is ${whole ? 'whole' : 'short'}`);
  }
  console.log(`   ${known} known answers judged over ${LINES.length} lines (${LINES.map(l => `${l.id} ${l.kind}`).join(', ')}) and the fleet's size; the table's assertion held to ${held} verdicts`);
}

if (FLEET === 'full' || COMBINE) {
  open(7);
  let careers = [];
  if (COMBINE) {
    for (const f of fs.readdirSync(COMBINE).filter(x => /^(old|new|arb)(-[A-Za-z0-9.]+)?-run\d+-set\d+\.json$/.test(x)).sort()) {
      const label = f.replace(/-run\d+-set\d+\.json$/, '');
      for (const c of JSON.parse(fs.readFileSync(path.join(COMBINE, f), 'utf8'))) careers.push({ ...c, label });
    }
    console.log(`   combined ${careers.length} careers from ${COMBINE}: ${[...new Set(careers.map(c => c.label))].join(', ')}`);
  } else {
    for (const arm of ARMS) if (!ARM_DRAFT[arm]) cannotRun(`SIM_NBA_EARNED_DRAFT_ARMS names ${arm}; the arms are ${Object.keys(ARM_DRAFT).join(', ')}`);
    if (tune) console.log(`   TUNING ${TAG}: ${TUNE}`);
    const SETS = Number(process.env.SIM_NBA_EARNED_DRAFT_SETS || 12);
    const [at, of] = (process.env.SIM_NBA_EARNED_DRAFT_SHARD || '0/1').split('/').map(Number);
    if (!Number.isInteger(at) || !Number.isInteger(of) || of < 1 || at < 0 || at >= of) cannotRun('SIM_NBA_EARNED_DRAFT_SHARD is not k/n with 0 <= k < n');
    const clubs = fleetClubs();
    console.log(`   the six user clubs by opening strength: ${clubs.map(c => `${c.club} ${c.tier} ${c.strength}`).join(', ')}`);
    const started = Date.now();
    const realRandom = Math.random;
    let randomCalls = 0;
    Math.random = () => { randomCalls += 1; return realRandom(); };
    for (let set = 1; set <= SETS; set += 1) {
      if ((set - 1) % of !== at) continue;
      for (const arm of ARMS) {
        const t0 = Date.now();
        const mine = [];
        for (let seed = (set - 1) * 10 + 1; seed <= (set - 1) * 10 + (PROBE || 10); seed += 1) {
          clubs.forEach((c, ci) => mine.push(career(arm, set, seed, ci, c.club, c.tier)));
        }
        careers.push(...mine);
        if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${labelOf(arm)}-run${RUN}-set${set}.json`), J(mine)); }
        console.log(`   ${labelOf(arm)} set ${set} (seeds ${(set - 1) * 10 + 1} to ${set * 10}), run ${RUN}: ${mine.length} careers in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      }
    }
    Math.random = realRandom;
    console.log(`   shard ${at}/${of}: ${careers.length} careers in ${((Date.now() - started) / 1000).toFixed(1)} s; Math.random called ${randomCalls} times while the fleet played`);
  }
  check(careers.length > 0, 'the fleet played no career');
  for (const c of careers) {
    check(c.refused === undefined, () => `${c.arm} set ${c.set} seed ${c.seed} ${c.club}: the desk summer refused after season ${c.refused}`);
    check(c.seasons.length === SEASONS, () => `${c.arm} set ${c.set} seed ${c.seed} ${c.club}: ${c.seasons.length} seasons, not ${SEASONS}`);
    for (const r of c.seasons) check(r.sixteen === 16, () => `${c.arm} set ${c.set} seed ${c.seed} season ${r.s}: a playoff field of ${r.sixteen}`);
    if (c.arm !== 'old') {
      const fell = c.seasons.filter(r => r.fell).length;
      const stuck = c.seasons.filter(r => r.stuck).length;
      check(fell === 0 && stuck === 0, () => `${c.label} set ${c.set} seed ${c.seed} ${c.club}: ${fell} drafts fell back to the old draft and ${stuck} never finished`);
    }
  }
  /* label -> run -> set -> the set's lines */
  const table = new Map();
  const bySet = new Map();
  for (const c of careers) {
    const k = `${c.label ?? c.arm}|${c.run}|${c.set}`;
    if (!bySet.has(k)) bySet.set(k, []);
    bySet.get(k).push(c);
  }
  const lines = [];
  for (const [k, list] of [...bySet].sort((a, b) => (a[0] < b[0] ? -1 : 1) || a[1][0].set - b[1][0].set)) {
    const [label, run, set] = k.split('|');
    check(list.length === 60, `${label} run ${run} set ${set}: ${list.length} careers, a set is 60`);
    const L = setLines(list);
    if (label === 'old') lines.push(L);
    if (!table.has(label)) table.set(label, new Map());
    if (!table.get(label).has(Number(run))) table.get(label).set(Number(run), new Map());
    table.get(label).get(Number(run)).set(Number(set), L);
    console.log(`   ${label} run ${run} set ${set}: S1 ${fix(L.S1at5)} / ${fix(L.S1at10)}, S2 ${fix(L.S2, 1)}, S3 ${fix(L.S3.rate, 1)} (n ${L.S3.n}), S4 ${fix(L.S4.rate, 1)} titles ${fix(L.S4titles.rate, 1)} (n ${L.S4.n}), S6 dead ${fix(L.S6dead, 2)} payers ${fix(L.S6payers, 2)}, signed a night ${fix(L.signed, 1)}`);
    console.log(`      S5, worst finish first: ${L.S5.map(b => `${b.band} #${fix(b.overall, 1)} ${fix(b.trueOvr, 1)} (${b.n})`).join(', ')}`);
  }
  if (COMBINE) twoArmTable(table);
  if (!COMBINE && lines.length > 1) {
    const pool = (f, label, d = 2) => {
      const v = lines.map(f);
      console.log(`   over ${lines.length} sets, ${label}: mean ${fix(mean(v), d)}, per set sd ${fix(sdOf(v), d)}`);
      return sdOf(v);
    };
    pool(L => L.S1at5, 'S1 mean strength at season 5 tip off');
    pool(L => L.S1at10, 'S1 mean strength at season 10 tip off');
    pool(L => L.S2, 'S2 men rated 85 or more at season 10 tip off', 1);
    const s3 = pool(L => L.S3.rate, `S3 weak starts' playoff seasons, seasons 2 to 5, per season (n ${lines[0].S3.n} a set)`, 1);
    const s4 = pool(L => L.S4.rate, `S4 strong starts' playoff seasons, seasons 2 to 10, per season (n ${lines[0].S4.n} a set)`, 1);
    pool(L => L.S6dead, 'S6 CPU dead money a season, seasons 2 to 10', 1);
    pool(L => L.S6payers, 'S6 tax payers a season, seasons 2 to 10');
    const k3 = fleetFor(s3, MARGIN.S3);
    const k4 = fleetFor(s4, MARGIN.S4);
    console.log(`   the fleet by decision 2's rule: S3 needs ${k3} sets, S4 needs ${k4}, so ${Math.max(k3, k4)} sets of ten (never fewer than 12)`);
  }
}

/* ================================================================== */
/* The verdict. Green is this summary line and exit 0, never a filtered ok. */
{
  const red = ran.filter(n => failures[n] > 0);
  for (const n of ran) console.log(`   section ${n}: ${failures[n] === 0 ? 'green' : `${failures[n]} failures`}`);
  console.log(`   ${ran.length} sections ran (${ran.join(', ')}), ${checks} checks`);
  if (FLEET_CONTROL) {
    const fired = fleetMisses.length > 0 && red.length === 0;
    console.log(fired
      ? `${NAME}: CONTROL ${FLEET_CONTROL} FIRED on the fleet: outside ${fleetMisses.join('; ')}.`
      : `${NAME}: CONTROL ${FLEET_CONTROL} DID NOT FIRE on the fleet: red in [${red.join(', ')}], ${fleetMisses.length} lines outside.`);
    process.exit(fired ? 1 : 2);
  }
  if (CONTROL) {
    const want = CONTROLS[CONTROL].expect;
    const exact = red.length === want.length && want.every(n => red.includes(n));
    console.log(exact
      ? `${NAME}: CONTROL ${CONTROL} FIRED. Red in section ${red.join(' and ')} (${red.map(n => failures[n]).join(' and ')} failures).`
      : `${NAME}: CONTROL ${CONTROL} DID NOT FIRE as expected: red in [${red.join(', ')}], expected [${want.join(', ')}].`);
    process.exit(exact ? 1 : 2);
  }
  if (red.length) { console.log(`${NAME}: RED in section ${red.join(', ')}.`); process.exit(1); }
  console.log(`${NAME}: green.`);
  process.exit(0);
}
