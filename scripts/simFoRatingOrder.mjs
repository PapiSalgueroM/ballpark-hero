/* NFL Front Office: one rating per man, and an order that agrees with the field. Round 1130.

   WHAT WAS WRONG. One man had three numbers. The starters file printed the
   selection rule's seed (Ashton Jeanty 90), the depth file carried an override
   that every new franchise read instead (65), and NFL Conquest typed a third
   (86). And the number a franchise actually opened on read how well a man
   played and never how much, so a back who carried the load all year sat
   under a fullback.

   WHAT THIS HARNESS READS. What SHIPS: the committed data files, parsed as
   text (and, from section 7 on, the real engine bundled with esbuild). It
   compares them with MAIN, where main is not a checkout but the frozen arm:
   bakeFromRecord(record, meta, held, { ratingModel: 'v2.2' }), the new file
   shape carrying the checkpoint's own numbers. The suite's board league
   digests (src/lib/frontOfficeRatings.test.ts) are what make that arm honest:
   they prove it deals main's board league byte for byte.

   SECTIONS
     0  the inputs are there and counted. Men per tier, evidence rows per
        club. Any count at zero stops the run red: it cannot pass empty.
     1  ONE NUMBER. For every man of every club, every number a shipped file
        prints for him: his starters row, his bench row, his practice row, his
        lineage's openingOvr, and any fullOpening entry found in the depth
        file's text. The count of men with two different numbers, or on two
        rows, is 0. Main's own count is printed beside it (the seed against
        the override, measured from the seed bake and the frozen arm, never
        typed). NFL Conquest is on the second branch of this round, so its
        disagreement with the roster is PRINTED here as the recorded "from"
        and not asserted; the same sport neutral comparer prints NBA Conquest
        against NBA Front Office for whichever round unifies that pair.
     2  THE PRODUCTION FILE IS TWO SOURCED. Every row's agreed list and
        status re-derive from its own two lines; every line a rating reads is
        agreed by two publishers or settled by a third that sides with one
        of them, and, asked again of the raw lines with no status in it,
        every headline number it reads is printed the same by two of the
        three sources; the score is the selection rule's own skillScore; the
        Jeanty anchor (two publishers read by hand) holds; the header names
        the sources, the days and the bytes.
     3  THE ORDER AGREES WITH THE FIELD. Per offense group (QB, RB without
        confirmed fullbacks, WR, TE), Spearman's rank correlation between the
        number and 2025 production (the score of the agreed line, season
        total) among starters, in both arms. Bar: shipped >= main + margin,
        margin = half the measured gain. THIS IS A WIRING CHECK: the rating
        reads the lines it is then correlated with, so the rise is by
        construction and the nolayer control is what gives the bar meaning.
        The number that is not circular is the HOLDOUT, printed and never
        asserted: both arms rebuilt with every 2025 observation removed,
        against 2025 production. And the stronger fact, asserted: no lineman
        and no defender carries another number than on main. The five
        defence groups print their agreement with ONE source as the baseline
        the next part of this round must beat.
     4  NO MAN OUTRANKS A TEAM MATE WITH TEN TIMES HIS WORKLOAD. Per club and
        offense SHELF (fullbacks included on purpose): the leader is the man
        with the largest workload, counted when it is at least half the
        group's reference; a violation is a club mate with 8 or more games
        and a tenth of that workload or less who is rated above him. 0.
     5  THE TOP OF A GROUP PLAYED. (a) nobody among the ten highest rated of
        a group (fifteen for WR) played 8 or more games on under 60 percent
        of a starter's load PER GAME. (b) of the ten most productive
        starters a game, how many are among the fifteen highest rated: bar =
        shipped minus one, kept only where main sits under it (WR, TE).
     6  THE MARK IS COUNTED. Marked men on active rosters per shelf, both
        arms. Shipped = main + the newly marked fullbacks exactly; nobody
        lost a mark; every lineman is marked; every man rated as a fullback
        holds a ledger row on which his club's page and ESPN's both print FB,
        and every such man reads the flat number with the mark; no active
        fullback sits in the top two of his club's backs.
     7  THE LEAGUE DOES NOT FLIP. The real engine bundled once per arm, 5
        blocks of 40 seasons each on fixed seeds (initLeague with depth, 17
        weeks of injuryPass and simGame). (a) opening club strength, rank
        agreement between the arms, floor halfway to what shuffle produces.
        (b) mean wins of the clubs in their own arm's strength ranks 1 to 8
        and 25 to 32, and (c) the spread of the 32 clubs' mean wins: each
        within a tolerance IN WINS of main's, the tolerance being half the
        distance the stretch arm moves that measure, with both arms'
        sampling error (block sd over root 5) under a third of it. Ranks 9
        to 24 are printed only: the fixed total of wins pins the middle, so
        stretch does not move it and no tolerance can be set from it. No
        assertion on any single club's wins.
        (d) who is on a roster after the computer clubs' opening cut-down,
        both arms, read from two chairs so every club is cut once. A club
        over 53 releases its lowest rated spare man at a crowded position,
        and a confirmed fullback now reads the flat number, so membership
        DOES change by one man (the Giants release their fullback where main
        released a defensive back). Counted and held at that one: any man
        released who is not a confirmed fullback is red, and so is a second.
     8  THE SCALE DID NOT MOVE. The rule the layer's constants were chosen
        by: each offense position's mean and sd among the fifteen (confirmed
        fullbacks out, as in section 3) stay within one point of main's. The
        bar is that rule. The running back shelf with its fullbacks in is
        printed beside it and is NOT inside the rule (see MEASURED).

   Workload is the count both publishers print: pass attempts (QB), carries
   plus receptions (RB), receptions (WR, TE). A group's reference is the
   median workload of its men among the fifteen who hold a usable line. A
   starter holds one with 8 or more games and at least half the reference.

   CONTROLS, SIM_FO_ORDER_CONTROL=<name>. Each patches what a section READS
   (loaded text or loaded objects, never a file on disk), first asserts its
   anchor is present exactly once, and the run then exits 0 only when exactly
   the named sections went red, printing "control <name> fired: sections ...".
   A control that changed nothing exits 1.
     override   puts a fullOpening block back into the loaded depth text for
                Las Vegas with Ashton Jeanty at 65              -> section 1
     onesource  blanks source B of one row the offense Map reads and
                re-derives nothing                              -> 0 and 2
                (0 too: the man then has no production term, and the
                coverage count held at zero rises)
     nolayer    reads the v2.2 arm as if it were the shipped files
                                                        -> 3, 4, 5 and 6
                (6 too: the fullback ledger checks cannot hold on v2.2;
                1 stays green, the arm is still one number a man)
     swaprows   swaps the production lines of Las Vegas's leading rusher and
                its least used back with 8 games                -> section 4
     unmark     flips one Las Vegas lineman's partial to false in the loaded
                depth text                                      -> section 6
     norole     drops one row from the fullback ledger section 6 reads
                                                                -> section 6
     stretch    doubles every shipped offense number's distance from 81
                before the league is built          -> section 7, (b) and (c)
     shuffle    deals the shipped offense numbers to other clubs' men on the
                same shelf before the league is built    -> section 7, (a)
     looseread  puts a line only one publisher prints into the Map a rating
                reads, as a loosened derive() would              -> section 2
     cutback    drops a Giants running back who is no fullback under the flat
                fullback number in the loaded depth text  -> section 7, (d)
     lift       section 8 reads every offense number two points higher
                (about what a model centre of 87 for 84 does)    -> section 8
     gain       section 8 reads the model rebuilt with gain 16   -> section 8
     noeff      section 8 reads the model rebuilt with the efficiency term
                switched off (blend 0, .2, .8)                   -> section 8
   The three league controls must also turn exactly their own part of section
   7 red, and the report line says which parts went. lift, gain and noeff
   first prove the committed model rebuilds the shipped numbers exactly, so
   the only difference they read is the change they name.

   MEASURED, 2026-10-08, on the committed files (model nfl-v2.3-2026-10-08),
   shipped against main (the frozen v2.2 arm):
     men 2,163 (starters rows 480, bench 1,158, practice 525); men with two
       numbers 0, on main 459 of the 480 fifteen.
     production rows 1,469: agree 289, settled 40 (every one siding with
       source B), disagree 149 (0 among the fifteen), one source 991; lines a
       rating may read 326; fullback ledger 16 rows, 15 confirmed.
     starters and reference workload: QB 33 (460), RB 54 (173), WR 84 (44),
       TE 35 (52).
     3  rank agreement with 2025 production, shipped and main, and the margin
        (half the gain, rounded down): QB .769 and .512, .12; RB .866 and
        .489, .18; WR .830 and .378, .22; TE .742 and .226, .25.
        holdout (2025 removed, layer against v2.2): QB .199 against .223
        (n 29), RB .632 against .347 (n 43), WR .632 against .364 (n 75),
        TE .228 against .065 (n 29). The quarterbacks' holdout is a shade
        UNDER v2.2's; reported to the lead, not hidden.
        defence, one source, both arms the same: DE label .750 (n 50), DT
        and NT label .652 (n 101), LB shelf .333 (n 180), CB .477 (n 112),
        S .499 (n 109).
     4  pairs: 0 shipped, 2 on main (LV RB: Connor Heyward 77 and Dylan Laube
        68 over Ashton Jeanty 65; MIA WR).
     5  (a) part time men among the highest rated: 0 shipped in every group;
        main RB 3 (Samaje Perine, Justice Hill, Ray Davis), others 0.
        (b) QB 9 shipped and 8 main, RB 9 and 8 (no bar: main is at it),
        WR 8 and 5 (bar 7), TE 9 and 6 (bar 8).
     6  marked on active rosters 940 shipped, 930 main: QB 21 of 89, RB 27 of
        122 (main 17), WR 36 of 192, TE 26 of 120, OL 300 of 300, DL 83 of
        236, LB 258 of 258, DB 189 of 321. Ten newly marked, all confirmed
        fullbacks. Active fullbacks in the top two of their club's backs: 0
        shipped, 5 main. One man labelled FB stays on the normal path (one
        page could not be read): BUF Brock Lampe, 66.
     7  seeds 1130000 + 1000 * block + season; per measure main, shipped,
        stretch, tolerance (half of main to stretch), sampling error (main,
        shipped):
          ranks 1 to 8    10.95  10.72  12.20   .62   .040  .031
          ranks 9 to 24    8.57   8.59   8.52   none  .035  .019
          ranks 25 to 32   5.91   6.11   4.76   .57   .035  .028
          spread           1.96   1.84   2.91   .47   .009  .016
        (a) rank agreement of opening club strength .901 shipped, -.224 under
        shuffle, .867 under stretch; floor .34 (halfway between .901 and
        -.224).
        (d) 1,637 men after the cut-down in both arms; one differs: the
        Giants release Patrick Ricard (63, a confirmed fullback, 72 on main)
        where main released Jason Pinnock. Under cutback they release Devin
        Singletary instead.
     0  offense men who played in 2025 by the checkpoint's count and are
        rated with no production term: 0 of the fifteen, 102 on a bench (96
        on a disputed line, 6 under four games), 51 on a practice squad (43
        and 8). Held at those counts.
     8  the fifteen, mean and sd, shipped against main: QB 81.28 and 6.93
        against 81.41 and 7.28; RB (62 men, fullbacks out) 81.16 and 7.35
        against 80.98 and 6.89; WR 81.10 and 7.50 against 80.61 and 7.28; TE
        81.91 and 6.37 against 81.91 and 6.46. Largest distance .49, bar 1.
        Under the controls: lift moves every mean 1.87 to 2.49; gain 16 takes
        the sd of the backs to 7.96 and the receivers to 8.43 (1.07 and 1.15
        from main); noeff takes them to 9.05 and 8.98 and the tight ends'
        mean to 80.88. Measured and NOT caught by the one point rule: gain 14
        (largest distance .61, which the design allows), the workload term
        switched off (.66), and carry at 1, 1, 1 (.96, the receivers' mean).
        So carry, a stated judgement, is held only by the suite's exact pin,
        and that is told to the lead rather than papered over.
        The running back SHELF as the engine reads it (64 men, the two
        confirmed fullbacks of the fifteen in): 80.59 and 7.90 against 80.92
        and 6.80. Its sd moves 1.10, past the one point rule, and all of that
        is the flat fullback number, not the layer's constants. Printed, not
        asserted, and told to the lead.
   NBA, printed only (decision 10): 300 typed Conquest men, 300 Front Office
   opening estimates, 278 men with two numbers (median gap 4).

   Run time: about six seconds, most of it the two bundles and 400 seasons.
   Offline: it reads committed files only and never the network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bakeFromRecord, readTeamMeta, recordRows, skillScore, defenceScore, RECORD, SPOT_CHECK, PRODUCTION, FULLBACK_ROLES } from './genFrontOfficeRoster.mjs';
import { buildFullRatings, OFFENSE_LAYER } from './lib/nflFoRatingModel.mjs';
import { derive, settledSide, usable, productionMap, productionScore, HEADLINE } from './lib/nflProduction.mjs';
import { compareNumbers, strangers } from './lib/oneNumber.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_FO_ORDER_CONTROL || '';
/* nolayer also turns section 6 red: the fullback ledger checks the critic added there (a confirmed fullback is flat
   rated and marked, and no fullback sits in the top two of his club's backs) cannot hold on the v2.2 arm. */
const CONTROLS = { override: [1], onesource: [0, 2], looseread: [2], nolayer: [3, 4, 5, 6], swaprows: [4], unmark: [6], norole: [6], stretch: [7], shuffle: [7], cutback: [7], lift: [8], gain: [8], noeff: [8] };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`unknown control ${CONTROL}`); process.exit(1); }
const norm = t => t.split('\r\n').join('\n');
const read = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
/** A guard reads the code, not the comments: block and line comments are stripped before any text is parsed. */
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const red = new Map();
let checks = 0;
const ok = (section, label, pass, detail = '') => {
  checks += 1;
  if (!pass) { red.set(section, [...(red.get(section) ?? []), `${label}${detail ? ': ' + detail : ''}`]); console.log(`   FAIL [${section}] ${label}${detail ? ': ' + detail : ''}`); }
};
/** Replace one anchor in a loaded text, refusing unless it is there exactly once. */
const patchOnce = (text, anchor, replacement, name) => {
  const n = text.split(anchor).length - 1;
  if (n !== 1) throw new Error(`control ${name}: its anchor occurs ${n} times in what the section reads, expected exactly once, so the control would prove nothing`);
  return text.replace(anchor, () => replacement);
};

/* ---- main, as the frozen arm ---------------------------------------------- */
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const heldOut = JSON.parse(fs.readFileSync(SPOT_CHECK, 'utf8')).heldOut ?? [];
const meta = readTeamMeta(read('src/data/frontOfficePlayers.ts'));
const frozen = bakeFromRecord(record, meta, heldOut, { ratingModel: 'v2.2' });
if (frozen.ratingProblem) { console.error(`FAIL: the frozen arm refused to bake: ${frozen.ratingProblem}`); process.exit(1); }

/* ---- what ships, as text ------------------------------------------------- */
let startersRaw = read('src/data/frontOfficePlayers.ts');
let depthRaw = read('src/data/frontOfficeDepth.ts');
if (CONTROL === 'nolayer') {
  if (startersRaw === frozen.text) throw new Error('control nolayer: the shipped starters file already equals the v2.2 arm, so the control would change nothing');
  startersRaw = frozen.text; depthRaw = frozen.depthText;
  console.log('   control nolayer: the v2.2 arm is read as if it were the shipped files');
}
if (CONTROL === 'override') {
  depthRaw = patchOnce(depthRaw, "  LV: {\n    bench: [", "  LV: {\n    fullOpening: {\n      'Ashton Jeanty|RB': { ovr: 65, salary: 1.2 },\n    },\n    bench: [", 'override');
  console.log('   control override: Las Vegas carries a fullOpening block again, Ashton Jeanty at 65');
}
if (CONTROL === 'unmark') {
  const line = depthRaw.split('\n').find(l => /^\s*'[^']*\|OL': \{ .*originKey: 'LV\|[^']*\|OL'.*partial: true, /.test(l));
  if (!line) throw new Error('control unmark: no marked Las Vegas lineman found in the depth file, so the control would change nothing');
  depthRaw = patchOnce(depthRaw, line, line.replace('partial: true, ', 'partial: false, '), 'unmark');
  console.log(`   control unmark: one lineman's lineage no longer carries the mark (${line.trim().slice(0, 40)}...)`);
}
const startersText = stripComments(startersRaw);
const depthText = stripComments(depthRaw);

const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const unq = s => s.replace(/\\(.)/g, '$1');
const ROW_RE = new RegExp(`^\\s*\\{ name: ${STR}, pos: '(\\w+)', age: (\\d+), ovr: (\\d+), salary: ([\\d.]+), years: (\\d+) \\},?$`);
const TEAM_RE = new RegExp(`^  \\{ abbr: ${STR}, city: ${STR}, name: ${STR}, `);
const EVIDENCE_RE = new RegExp(`^\\s*${STR}: \\{ modelVersion: FO_OPENING_RATING_VERSION, openingWindow: FO_OPENING_RATING_WINDOW, originKey: ${STR}, openingOvr: (\\d+), basis: ${STR}, partial: (true|false), partialReasons: \\[(.*)\\] \\},$`);
const OVERRIDE_RE = new RegExp(`^\\s*${STR}: \\{ ovr: (\\d+), salary: ([\\d.]+) \\},$`);
const rowOf = m => ({ name: unq(m[1]), pos: m[2], age: Number(m[3]), ovr: Number(m[4]), salary: Number(m[5]), years: Number(m[6]) });

/** The starters file: club -> rows, in file order. */
function parseStarters(text) {
  const clubs = new Map();
  let club = null;
  for (const line of text.split('\n')) {
    const t = line.match(TEAM_RE);
    if (t) { club = unq(t[1]); clubs.set(club, []); continue; }
    const r = line.match(ROW_RE);
    if (r && club) clubs.get(club).push(rowOf(r));
  }
  return clubs;
}
/** The depth file: club -> { bench, practice, evidence, override }. */
function parseDepth(text) {
  const clubs = new Map();
  let club = null, part = null;
  for (const line of text.split('\n')) {
    const c = line.match(/^  ([A-Z]{2,3}): \{$/);
    if (c) { club = c[1]; clubs.set(club, { bench: [], practice: [], evidence: new Map(), override: new Map() }); part = null; continue; }
    if (!club) continue;
    const p = line.match(/^    (bench|practice|fullOpening|ratingEvidence): [[{]$/);
    if (p) { part = p[1]; continue; }
    if (/^    [\]}],$/.test(line)) { part = null; continue; }
    const d = clubs.get(club);
    if (part === 'bench' || part === 'practice') { const r = line.match(ROW_RE); if (r) d[part].push(rowOf(r)); }
    else if (part === 'ratingEvidence') { const e = line.match(EVIDENCE_RE); if (e) d.evidence.set(unq(e[1]), { originKey: unq(e[2]), openingOvr: Number(e[3]), basis: unq(e[4]), partial: e[5] === 'true', partialReasons: e[6] }); }
    else if (part === 'fullOpening') { const o = line.match(OVERRIDE_RE); if (o) d.override.set(unq(o[1]), Number(o[2])); }
  }
  return clubs;
}
const starters = parseStarters(startersText);
const depth = parseDepth(depthText);

/* ---- the two sourced inputs, loaded (controls patch these objects, never a file) ---- */
const checkpoint = JSON.parse(read('scripts/data/nflFoRatingInputs2026.json'));
const recordOf = new Map(checkpoint.records.map(r => [r.key, r]));
const productionFile = JSON.parse(fs.readFileSync(PRODUCTION, 'utf8'));
const productionRows = productionFile.rows.map(r => ({ ...r }));
const ledger = JSON.parse(fs.readFileSync(FULLBACK_ROLES, 'utf8'));
let ledgerMen = ledger.men;
if (CONTROL === 'onesource') {
  const row = productionRows.find(r => r.key === 'LV|Ashton Jeanty|RB');
  if (!row || !row.b || row.status !== 'agree') throw new Error('control onesource: the row it blanks is not an agreed two publisher row, so the control would prove nothing');
  row.b = null;
  console.log('   control onesource: source B of one row the offense Map reads is blanked, and nothing is re-derived');
}
if (CONTROL === 'norole') {
  const drop = ledgerMen.filter(m => m.key === 'LV|Connor Heyward|RB');
  if (drop.length !== 1) throw new Error('control norole: the ledger row it drops is not there exactly once');
  ledgerMen = ledgerMen.filter(m => m.key !== 'LV|Connor Heyward|RB');
  console.log('   control norole: one ledger row is dropped from what section 6 reads');
}
/** A fullback on two more sources than the record's label: both pages print FB. Section 6 fences the shipped files against this. */
const confirmedFullbacks = new Set(ledgerMen.filter(m => m.verdict === 'fullback' && m.club?.position === 'FB' && m.espn?.position === 'FB' && recordOf.get(m.key)?.sourceIdentity.depthChartPosition === 'FB').map(m => m.key));
/* what a rating may read: every row re-derived from its own two lines, the way the generator reads it */
const offenseMap = productionMap(productionRows.map(r => ({ ...r, ...derive(r) })));
if (CONTROL === 'swaprows') {
  const backs = checkpoint.records.filter(r => r.team === 'LV' && r.seed.pos === 'RB' && r.tier !== 'practice' && offenseMap.has(r.key) && offenseMap.get(r.key).games >= 8)
    .sort((x, y) => offenseMap.get(y.key).workload - offenseMap.get(x.key).workload || x.key.localeCompare(y.key));
  if (backs.length < 2 || offenseMap.get(backs[0].key).workload === offenseMap.get(backs[backs.length - 1].key).workload) throw new Error('control swaprows: Las Vegas has no two backs with different workloads to swap');
  const lead = backs[0].key, least = backs[backs.length - 1].key, a = offenseMap.get(lead), b = offenseMap.get(least);
  offenseMap.set(lead, b); offenseMap.set(least, a);
  console.log(`   control swaprows: the production rows of ${lead} and ${least} are swapped`);
}
if (CONTROL === 'looseread') {
  /* what a loosened derive() would do: a line only ONE publisher prints reaches the Map a rating reads. A practice
     squad man on purpose, so no group's reference, starter list or club shelf below moves and only section 2 can see it. */
  const row = productionRows.find(r => ['QB', 'RB', 'WR', 'TE'].includes(r.shelf) && r.a && !r.b && recordOf.get(r.key)?.tier === 'practice' && Number.isFinite(r.a.games) && !offenseMap.has(r.key));
  if (!row) throw new Error('control looseread: no one publisher offense line of a practice squad man to read, so the control would change nothing');
  offenseMap.set(row.key, { games: row.a.games, score: productionScore(row.a), workload: null });
  console.log(`   control looseread: the Map a rating reads holds a line only one publisher prints (${row.key})`);
}

/* ---- the two arms, man by man ---------------------------------------------- */
/** What ships for a man: his number, his tier and his lineage, read off the loaded text. */
const shipped = new Map();
for (const [club, rows] of starters) for (const p of rows) shipped.set(`${club}|${p.name}|${p.pos}`, { ovr: p.ovr, tier: 'core', pos: p.pos, club });
for (const [club, d] of depth) {
  for (const tier of ['bench', 'practice']) for (const p of d[tier]) shipped.set(`${club}|${p.name}|${p.pos}`, { ovr: p.ovr, tier, pos: p.pos, club });
  for (const [nameAndPos, e] of d.evidence) { const man = shipped.get(`${club}|${nameAndPos}`); if (man) Object.assign(man, { partial: e.partial, reasons: e.partialReasons, basis: e.basis }); }
}
/** Main for a man: the frozen arm's number and mark. */
const main = new Map([...frozen.rated].map(([key, p]) => [key, { ovr: p.ovr, tier: p.tier, pos: p.pos, club: p.team, partial: p.evidence.partial }]));
const OFFENSE = ['QB', 'RB', 'WR', 'TE'];
const labelOf = key => recordOf.get(key)?.sourceIdentity.depthChartPosition ?? '';
/** The rating group a man is compared in: his shelf, with confirmed fullbacks out of the running backs. */
const groupOf = key => { const pos = recordOf.get(key)?.seed.pos; return OFFENSE.includes(pos) && !(pos === 'RB' && confirmedFullbacks.has(key)) ? pos : null; };
const median = list => { const s = [...list].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const activeKeys = [...recordOf.values()].filter(r => r.tier !== 'practice').map(r => r.key);
/** Per offense group: the reference workload (median among the fifteen holding a line), the same per game, and the starters. */
const groups = {};
for (const g of OFFENSE) {
  const fifteen = [...recordOf.values()].filter(r => r.tier === 'core' && groupOf(r.key) === g && offenseMap.has(r.key));
  const reference = median(fifteen.map(r => offenseMap.get(r.key).workload));
  const perGame = median(fifteen.map(r => offenseMap.get(r.key).workload / offenseMap.get(r.key).games));
  const members = activeKeys.filter(key => groupOf(key) === g);
  const startersOf = members.filter(key => { const p = offenseMap.get(key); return p && p.games >= 8 && p.workload >= reference / 2; });
  groups[g] = { reference, perGame, members, starters: startersOf };
}
const rankOf = values => {
  const order = values.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), out = Array(values.length);
  for (let i = 0; i < order.length;) { let j = i; while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1; for (let k = i; k <= j; k += 1) out[order[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return out;
};
/** Spearman's rank correlation, midranks for ties. */
const spearman = (x, y) => {
  const rx = rankOf(x), ry = rankOf(y), mean = v => v.reduce((s, n) => s + n, 0) / v.length, mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i += 1) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : NaN;
};
const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : 'n/a');

/* ---- 0. the inputs are there and counted --------------------------------- */
console.log('0) the inputs are there and counted');
const count = { clubs: starters.size, starters: 0, bench: 0, practice: 0, evidence: 0 };
for (const rows of starters.values()) count.starters += rows.length;
for (const d of depth.values()) { count.bench += d.bench.length; count.practice += d.practice.length; count.evidence += d.evidence.size; }
const frozenMen = frozen.teams.reduce((n, t) => n + t.players.length, 0) + frozen.depth.reduce((n, d) => n + d.bench.length + d.practice.length, 0);
console.log(`   ${count.clubs} clubs; starters rows ${count.starters}, bench rows ${count.bench}, practice rows ${count.practice}, lineage rows ${count.evidence}; the frozen arm holds ${frozenMen} men`);
for (const [what, n] of Object.entries({ ...count, frozenMen })) {
  if (!n) { console.error(`FAIL [0] ${what} is ${n}: the harness read nothing there, so nothing below was measured`); process.exit(1); }
}
ok(0, 'thirty two clubs in both files', starters.size === 32 && depth.size === 32, `${starters.size} and ${depth.size}`);
ok(0, 'fifteen starters rows a club', [...starters.values()].every(rows => rows.length === 15));
ok(0, 'every man of the frozen arm has a row and a lineage row', count.starters + count.bench + count.practice === frozenMen && count.evidence === frozenMen,
  `${count.starters + count.bench + count.practice} rows and ${count.evidence} lineage rows against ${frozenMen} men`);
{
  const byStatus = {};
  for (const r of productionRows) { const d = derive(r); (byStatus[d.status] ??= {})[r.shelf] = ((byStatus[d.status] ?? {})[r.shelf] ?? 0) + 1; }
  const total = s => Object.values(byStatus[s] ?? {}).reduce((n, v) => n + v, 0);
  console.log(`   production rows ${productionRows.length}: agree ${total('agree')}, settled ${total('settled')}, disagree ${total('disagree')}, one source ${total('one-source')}; lines a rating may read ${offenseMap.size}; ledger rows ${ledgerMen.length}, confirmed fullbacks ${confirmedFullbacks.size}`);
  console.log(`   starters per group (a line with 8 or more games and half the reference workload): ${OFFENSE.map(g => `${g} ${groups[g].starters.length} (reference ${groups[g].reference})`).join(', ')}`);
  for (const [what, n] of Object.entries({ 'production rows': productionRows.length, 'lines a rating may read': offenseMap.size, 'confirmed fullbacks': confirmedFullbacks.size, ...Object.fromEntries(OFFENSE.map(g => [`${g} starters`, groups[g].starters.length])) })) {
    if (!n) { console.error(`FAIL [0] ${what} is ${n}: the harness read nothing there, so nothing below was measured`); process.exit(1); }
  }
  /* The coverage guard the generator's own floor is too loose for: a quarterback, back, receiver or tight end
     among the fifteen who played in 2025 by the checkpoint's own count and whose rating has NO production term
     (he is read on workload instead, a different formula from his peers). Named with the reason, and held at
     the measured count, 0 on 2026-10-08 once the forty disputed lines were settled: a rise is red. */
  const NO_TERM_HELD = 0;
  /* The same count off the fifteen, held where it was measured on 2026-10-08 so it cannot grow unseen: 102 bench
     men (96 on a line the two publishers dispute, 6 under four games) and 51 practice squad men (43 and 8). Nobody
     settled their disputes by hand (the third read was made for the fifteen only), so those men are read on
     workload alone, which is a different formula from their peers and is said here rather than hidden. */
  const NO_TERM_HELD_DEPTH = { bench: 102, practice: 51 };
  const noTerm = [], noTermDepth = { bench: [], practice: [] }, depthWhy = {};
  for (const r of recordOf.values()) {
    if (!groupOf(r.key)) continue;
    if (!(r.observations ?? []).some(o => o.season === 2025 && o.exposure > 0)) continue;
    const line = offenseMap.get(r.key), row = productionRows.find(p => p.key === r.key);
    if (line && line.games >= OFFENSE_LAYER.minGames) continue;
    const reason = !row ? 'no row in either source' : line ? `under ${OFFENSE_LAYER.minGames} games` : `row is ${derive(row).status}`;
    if (r.tier === 'core') noTerm.push(`${r.key} (${reason})`);
    else { noTermDepth[r.tier].push(r.key); depthWhy[`${r.tier}, ${reason}`] = (depthWhy[`${r.tier}, ${reason}`] ?? 0) + 1; }
  }
  console.log(`   offense men among the fifteen with 2025 play and no production term: ${noTerm.length}${noTerm.length ? ': ' + noTerm.join(', ') : ''}`);
  ok(0, `no more than ${NO_TERM_HELD} of the fifteen's offense men who played in 2025 are rated without a production term`, noTerm.length <= NO_TERM_HELD, noTerm.join(', '));
  console.log(`   the same off the fifteen: bench ${noTermDepth.bench.length}, practice ${noTermDepth.practice.length} (${Object.entries(depthWhy).sort().map(([why, n]) => `${why}: ${n}`).join('; ')})`);
  for (const tier of ['bench', 'practice']) ok(0, `no more than ${NO_TERM_HELD_DEPTH[tier]} ${tier} men who played in 2025 are rated without a production term`, noTermDepth[tier].length <= NO_TERM_HELD_DEPTH[tier], `${noTermDepth[tier].length}`);
}

/* ---- 1. ONE NUMBER -------------------------------------------------------- */
console.log('1) one number per man');
const printed = [];           // every number a shipped file prints, keyed club|name|pos
const rowsPerMan = new Map(); // club|name|pos -> how many ROWS carry him (must be one)
const put = (club, name, pos, where, number) => printed.push({ key: `${club}|${name}|${pos}`, where, number });
for (const [club, rows] of starters) for (const p of rows) { put(club, p.name, p.pos, 'starters row', p.ovr); rowsPerMan.set(`${club}|${p.name}|${p.pos}`, (rowsPerMan.get(`${club}|${p.name}|${p.pos}`) ?? 0) + 1); }
for (const [club, d] of depth) {
  for (const tier of ['bench', 'practice']) for (const p of d[tier]) { put(club, p.name, p.pos, `${tier} row`, p.ovr); rowsPerMan.set(`${club}|${p.name}|${p.pos}`, (rowsPerMan.get(`${club}|${p.name}|${p.pos}`) ?? 0) + 1); }
  for (const [nameAndPos, e] of d.evidence) printed.push({ key: `${club}|${nameAndPos}`, where: 'lineage', number: e.openingOvr });
  for (const [nameAndPos, ovr] of d.override) printed.push({ key: `${club}|${nameAndPos}`, where: 'fullOpening', number: ovr });
}
const numbersOf = new Map();
for (const p of printed) numbersOf.set(p.key, [...(numbersOf.get(p.key) ?? []), p]);
const twoNumbers = [...numbersOf].filter(([, list]) => new Set(list.map(p => p.number)).size > 1);
const twoRows = [...rowsPerMan].filter(([, n]) => n !== 1);
const noRow = [...numbersOf.keys()].filter(key => !rowsPerMan.has(key));
const noLineage = [...rowsPerMan.keys()].filter(key => !numbersOf.get(key).some(p => p.where === 'lineage'));
const overrides = [...depth.values()].reduce((n, d) => n + d.override.size, 0);
ok(1, 'no man has two different numbers across the shipped files', twoNumbers.length === 0,
  twoNumbers.slice(0, 5).map(([key, list]) => `${key}: ${list.map(p => `${p.where} ${p.number}`).join(', ')}`).join('; '));
ok(1, 'every man sits on exactly one row', twoRows.length === 0, twoRows.slice(0, 5).map(([key, n]) => `${key} on ${n} rows`).join('; '));
ok(1, 'every lineage row names a man who has a row, and every row has a lineage row', noRow.length === 0 && noLineage.length === 0, [...noRow, ...noLineage].slice(0, 5).join('; '));
ok(1, 'the depth file carries no fullOpening override', overrides === 0 && !/fullOpening/.test(depthText), `${overrides} override entries`);
/* main's count, measured: the fifteen whose seed number (the starters file main shipped) differs from the number
   the board read through the override (the frozen arm) */
const frozenOvr = new Map(frozen.teams.flatMap(t => t.players.map(p => [`${t.abbr}|${p.name}|${p.pos}`, p.ovr])));
const mainTwo = frozen.seedTeams.reduce((n, t) => n + t.players.filter(p => frozenOvr.get(`${t.abbr}|${p.name}|${p.pos}`) !== p.ovr).length, 0);
console.log(`   men with two numbers: ${twoNumbers.length} shipped (${numbersOf.size} men, ${printed.length} printed numbers); on main ${mainTwo} of the ${frozen.seedTeams.length * 15} fifteen had two (the seed on the row, another through the override)`);

/* NFL Conquest against the roster, PRINTED ONLY on this branch (the second branch of the round derives Conquest's
   ten from the bake and turns these counts into assertions at zero). */
{
  const QUOTED = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
  const conquestSrc = stripComments(read('src/data/conquestData.ts'));
  const block = conquestSrc.slice(conquestSrc.indexOf('export const NFL_TEAMS'), conquestSrc.indexOf('export const TEAM_MAP'));
  const conquest = [];
  let club = null;
  for (const line of block.split('\n')) {
    const t = line.match(/^  \{ id: '([A-Z]{2,3})', /);
    if (t) { club = t[1] === 'LAR' ? 'LA' : t[1]; continue; }
    const r = line.match(new RegExp(`^\\s*\\{ name: ${QUOTED}, position: '(\\w+)', overall: (\\d+), keyStat: `));
    if (r && club) conquest.push({ game: 'NFL Conquest', club, name: unq(r[1] ?? r[2]), number: Number(r[4]) });
  }
  const active = [], everyone = [];
  for (const [c, rows] of starters) for (const p of rows) { active.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr }); everyone.push(active[active.length - 1]); }
  for (const [c, d] of depth) {
    for (const p of d.bench) { active.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr }); everyone.push(active[active.length - 1]); }
    for (const p of d.practice) everyone.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr });
  }
  const pair = compareNumbers([conquest, everyone]);
  const { elsewhere, nowhere } = strangers(conquest, everyone);
  const freeAgents = [];
  for (const [file, from, to] of [['src/data/conquestData.ts', 'export const CONQUEST_FREE_AGENCY_POOL', '];'], ['src/data/conquestPowerups.ts', 'export const FREE_AGENTS', '];']]) {
    const text = stripComments(read(file));
    const start = text.indexOf(from), list = text.slice(start, text.indexOf(to, start));
    for (const m of list.matchAll(new RegExp(`\\{ name: ${QUOTED}, position: '(\\w+)', overall: (\\d+)`, 'g'))) freeAgents.push({ file, name: unq(m[1] ?? m[2]), number: Number(m[4]) });
  }
  const rostered = freeAgents.filter(f => everyone.some(p => p.name === f.name));
  if (!conquest.length || !freeAgents.length) { console.error('FAIL [1] the Conquest rows or the free agent lists did not parse, so the recorded "from" would be empty'); process.exit(1); }
  console.log(`   NFL Conquest, printed and not asserted on this branch: ${conquest.length} typed men; ${pair.sameNumber.length + pair.twoNumbers.length} on the same club in the roster, of whom ${pair.twoNumbers.length} print another number there; ${elsewhere.length} are on another club; ${nowhere.length} are in no club's game roster (reserve list men, name variants, unsigned men); ${rostered.length} of ${freeAgents.length} free agent rows name a rostered man (${rostered.map(f => `${f.name} ${f.number}`).join(', ') || 'none'})`);
}

/* Decision 10 by measurement, PRINTED ONLY: the same comparer on the NBA pair. NBA Front Office deals the typed
   rows of src/data/conquestDataNba.ts and its board then passes the opening estimates of
   src/data/nbaOpeningRatings.ts over them, so that pair carries the same split the NFL files did. Nothing here is
   asserted and nothing in those files is changed: the count is the "from" for whichever round unifies them. The MLB
   and NHL Conquest files carry club numbers only (no player row), so there is no second number to compare. */
{
  const QUOTED = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
  const src = stripComments(read('src/data/conquestDataNba.ts'));
  const block = src.slice(src.indexOf('export const NBA_TEAMS'), src.indexOf('export const NBA_TEAM_MAP'));
  const typed = [];
  let club = null;
  for (const line of block.split('\n')) {
    const t = line.match(/^  \{ id: '([A-Z]{2,3})', /);
    if (t) { club = t[1]; continue; }
    const r = line.match(new RegExp(`^\\s*\\{ name: ${QUOTED}, position: '([\\w-]+)', overall: (\\d+), keyStat: `));
    if (r && club) typed.push({ game: 'NBA Conquest', club, name: unq(r[1] ?? r[2]), number: Number(r[4]) });
  }
  const ratingsText = read('src/data/nbaOpeningRatings.ts');
  const at = ratingsText.indexOf('export const NBA_OPENING_RATINGS'), open = ratingsText.indexOf('= {', at);
  const estimates = at < 0 || open < 0 ? {} : JSON.parse(ratingsText.slice(open + 2, ratingsText.lastIndexOf('}') + 1));
  const board = Object.entries(estimates).flatMap(([c, men]) => Object.entries(men).map(([nameAndPos, r]) => ({ game: 'NBA Front Office', club: c, name: nameAndPos.slice(0, nameAndPos.lastIndexOf('|')), number: r.ovr })));
  if (!typed.length || !board.length) { console.error('FAIL [1] the NBA rows did not parse, so the recorded "from" for decision 10 would be empty'); process.exit(1); }
  const pair = compareNumbers([typed, board]);
  const gaps = pair.twoNumbers.map(m => Math.abs(m.rows[0].number - m.rows[1].number)).sort((x, y) => x - y);
  console.log(`   NBA, printed only (decision 10): ${typed.length} typed Conquest men and ${board.length} Front Office opening estimates; ${pair.sameNumber.length + pair.twoNumbers.length} men are in both on the same club, of whom ${pair.twoNumbers.length} print two numbers (median gap ${gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0}, largest ${gaps.length ? gaps[gaps.length - 1] : 0}); the MLB and NHL Conquest files carry no player row`);
}

/* ---- 2. THE PRODUCTION FILE IS TWO SOURCED --------------------------------- */
console.log('2) the production file is two sourced');
{
  const stale = productionRows.filter(r => { const d = derive(r); return d.status !== r.status || d.agreed.join() !== (r.agreed ?? []).join(); });
  ok(2, 'every row\'s agreed list and status re-derive from its own two lines', stale.length === 0, stale.slice(0, 4).map(r => `${r.key} says ${r.status}, its lines say ${derive(r).status}`).join('; '));
  const byKey = new Map(productionRows.map(r => [r.key, r]));
  const bad = [], wiring = [], thin = [];
  /* The status says "agreed" or "settled", and the Map above was built through the same derive(), so on its own
     the status check below can only fail when the Map holds a line derive() would refuse (the looseread control).
     This is the same question asked of the RAW lines, with no status in it: every headline number a rating reads
     is printed, the same, by two of the three sources. */
  const printedTwice = (row, u) => !!row.a && !!row.b && HEADLINE[row.shelf].every(f => {
    const third = row.settledBy?.values?.[f];
    return (Number.isFinite(row.a[f]) && row.a[f] === row.b[f] && u[f] === row.a[f]) || (Number.isFinite(third) && third === u[f] && (u[f] === row.a[f] || u[f] === row.b[f]));
  });
  for (const [key, line] of offenseMap) {
    const row = byKey.get(key), d = derive(row), u = usable({ ...row, ...d });
    if (!['agree', 'settled'].includes(d.status)) bad.push(`${key} is ${d.status}`);
    if (!u) { thin.push(key); continue; }
    if (!printedTwice(row, u)) thin.push(key);
    if (d.status === 'settled' && !(settledSide(row) && /^https:\/\//.test(row.settledBy?.url ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(row.settledBy?.read ?? '') && row.settledBy?.source)) bad.push(`${key} is settled without a named third source, an address and a day`);
    if (!HEADLINE[row.shelf].every(f => Number.isFinite(u[f]))) bad.push(`${key} lacks a headline field`);
    /* the score a rating reads is the selection rule's own skillScore on the same numbers */
    const viaGenerator = skillScore({ passing_yards: u.passYds, passing_tds: u.passTd, rushing_yards: u.rushYds, rushing_tds: u.rushTd, receptions: u.rec, receiving_yards: u.recYds, receiving_tds: u.recTd });
    if (Math.abs(viaGenerator - productionScore(u)) > 1e-9 || (CONTROL !== 'swaprows' && Math.abs(line.score - viaGenerator) > 1e-9)) wiring.push(key);
  }
  ok(2, 'every line a rating reads is agreed by two publishers or settled by a third', bad.length === 0, bad.slice(0, 4).join('; '));
  ok(2, 'every headline number a rating reads is printed, the same, by two of the three sources (the raw lines, no status)', thin.length === 0, thin.slice(0, 4).join('; '));
  ok(2, 'the production score is the selection rule\'s own skillScore on the agreed numbers', wiring.length === 0, wiring.slice(0, 4).join(', '));
  const anchor = byKey.get('LV|Ashton Jeanty|RB'), au = anchor && usable({ ...anchor, ...derive(anchor) });
  const want = { rushAtt: 266, rushYds: 975, rushTd: 5, rec: 55, recYds: 346, recTd: 5 };
  ok(2, 'the anchor two publishers were read for by hand still holds (Ashton Jeanty, 266 for 975 and 5, 55 for 346 and 5)', !!au && Object.entries(want).every(([f, v]) => au[f] === v),
    au ? Object.keys(want).map(f => `${f} ${au[f]}`).join(', ') : 'his row feeds nothing');
  const a = productionFile.sourceA ?? {}, b = productionFile.sourceB ?? {};
  ok(2, 'the header names both sources, their read days and the bytes read', /^[a-f0-9]{64}$/.test(a.sha256 ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(a.read ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(b.read ?? '') && (b.requests ?? []).length > 0 && b.requests.every(r => /^[a-f0-9]{64}$/.test(r.sha256 ?? '')),
    `source A sha ${String(a.sha256).slice(0, 12)}, read ${a.read}; source B read ${b.read}, ${(b.requests ?? []).length} requests`);
  const disputed = productionRows.filter(r => derive(r).status === 'disagree');
  const settled = productionRows.filter(r => derive(r).status === 'settled');
  const tierOf = key => recordOf.get(key)?.tier;
  console.log(`   disputed and feeding nothing: ${disputed.length} (${['core', 'bench', 'practice'].map(t => `${t} ${disputed.filter(r => tierOf(r.key) === t).length}`).join(', ')}); settled by a third source: ${settled.length}, every one siding with source ${[...new Set(settled.map(r => (settledSide(r) === r.a ? 'A' : 'B')))].join(' and ') || 'nobody'}`);
}

/* ---- 3. THE ORDER AGREES WITH THE FIELD ------------------------------------ */
console.log('3) the order agrees with the field');
/* A WIRING CHECK, AND SAID SO. The rating reads the same agreed lines it is then correlated with, so rho rising
   is by construction; the nolayer control is what gives the bar its meaning (the files really carry the layer).
   The number that is NOT circular is the holdout printed under it: both arms rebuilt with every 2025 line
   removed, against 2025 production. It is printed and reported, never asserted. */
const MARGIN = { QB: 0.12, RB: 0.18, WR: 0.22, TE: 0.25 };
for (const g of OFFENSE) {
  const men = groups[g].starters, score = men.map(key => offenseMap.get(key).score);
  const rhoShipped = spearman(men.map(key => shipped.get(key).ovr), score), rhoMain = spearman(men.map(key => main.get(key).ovr), score);
  console.log(`   ${g}: ${men.length} starters, rank agreement with 2025 production ${f3(rhoShipped)} shipped, ${f3(rhoMain)} main, bar main + ${MARGIN[g]}`);
  ok(3, `${g}: the shipped order agrees with 2025 production better than main's by the margin`, rhoShipped >= rhoMain + MARGIN[g], `${f3(rhoShipped)} against ${f3(rhoMain)} + ${MARGIN[g]}`);
}
{
  const moved = [...recordOf.values()].filter(r => !OFFENSE.includes(r.seed.pos) && shipped.get(r.key)?.ovr !== main.get(r.key).ovr);
  const held = [...recordOf.values()].filter(r => !OFFENSE.includes(r.seed.pos)).length;
  ok(3, 'no lineman and no defender carries another number than on main', moved.length === 0 && held > 0, `${moved.length} of ${held}: ${moved.slice(0, 4).map(r => r.key).join(', ')}`);
  /* the holdout */
  const hold = { ...checkpoint, records: checkpoint.records.map(r => ({ ...r, observations: (r.observations ?? []).filter(o => o.season !== 2025) })) };
  const holdLayer = { ...OFFENSE_LAYER, carry: { 2023: OFFENSE_LAYER.carry[2024], 2024: OFFENSE_LAYER.carry[2025] }, production: new Map(), fullbacks: confirmedFullbacks, allowNoProduction: true };
  const holdMain = new Map(buildFullRatings(hold).map(p => [p.key, p.ovr])), holdLayered = new Map(buildFullRatings(hold, holdLayer).map(p => [p.key, p.ovr]));
  const lines = [];
  for (const g of OFFENSE) {
    const men = groups[g].starters.filter(key => (recordOf.get(key).observations ?? []).some(o => o.season < 2025 && o.exposure > 0));
    const score = men.map(key => offenseMap.get(key).score);
    lines.push(`${g} ${f3(spearman(men.map(key => holdLayered.get(key)), score))} layer against ${f3(spearman(men.map(key => holdMain.get(key)), score))} v2.2 (n ${men.length})`);
  }
  console.log(`   holdout, not circular, printed only: rated on 2023 and 2024 alone, against 2025 production: ${lines.join('; ')}`);
  /* the defence, as the baseline the next part must beat: ONE source (the record's 2025 regular plus post season
     rows, the selection rule's defenceScore), both arms identical, so one number a group */
  const { roster, stats } = recordRows(record);
  const statsById = new Map(stats.map(s => [s.player_id, s]));
  const DEFENCE = { 'DE label': k => labelOf(k) === 'DE', 'DT and NT label': k => ['DT', 'NT'].includes(labelOf(k)), 'LB shelf': k => recordOf.get(k).seed.pos === 'LB', CB: k => labelOf(k) === 'CB', S: k => ['S', 'FS', 'SS'].includes(labelOf(k)) };
  const out = [];
  for (const [name, test] of Object.entries(DEFENCE)) {
    const men = activeKeys.filter(test).map(key => ({ key, s: statsById.get(recordOf.get(key).sourceIdentity.gsisId) })).filter(m => m.s && Number(m.s.games) >= 8);
    out.push(`${name} ${f3(spearman(men.map(m => shipped.get(m.key).ovr), men.map(m => defenceScore(m.s))))} (n ${men.length})`);
  }
  console.log(`   defence, one source and printed only, the baseline for the next part: ${out.join('; ')}`);
  if (!roster.length) { console.error('FAIL [3] the record has no roster rows'); process.exit(1); }
}

/* ---- 4. NO MAN OUTRANKS A TEAM MATE WITH TEN TIMES HIS WORKLOAD ------------- */
console.log('4) no man outranks a team mate with ten times his workload');
{
  /* per club and SHELF (fullbacks included on purpose: this is the fullback over the feature back) */
  const violations = arm => {
    const pairs = [];
    for (const club of starters.keys()) for (const shelf of OFFENSE) {
      const men = activeKeys.filter(key => recordOf.get(key).team === club && recordOf.get(key).seed.pos === shelf && offenseMap.has(key));
      if (!men.length) continue;
      const lead = [...men].sort((x, y) => offenseMap.get(y).workload - offenseMap.get(x).workload || x.localeCompare(y))[0];
      if (offenseMap.get(lead).workload < groups[shelf].reference / 2) continue;
      const over = men.filter(key => key !== lead && offenseMap.get(key).games >= 8 && offenseMap.get(key).workload <= offenseMap.get(lead).workload / 10 && arm.get(key).ovr > arm.get(lead).ovr);
      if (over.length) pairs.push(`${club} ${shelf}: ${over.map(key => `${key.split('|')[1]} ${arm.get(key).ovr}`).join(', ')} over ${lead.split('|')[1]} ${arm.get(lead).ovr}`);
    }
    return pairs;
  };
  const now = violations(shipped), was = violations(main);
  console.log(`   club and shelf pairs where a man with a tenth of the leader's workload is rated above him: ${now.length} shipped, ${was.length} on main (${was.join(' | ')})`);
  ok(4, 'no club has a little used man rated above the leader of his shelf', now.length === 0, now.join(' | '));
  ok(4, 'main had such pairs, so the count above is not zero by default', was.length > 0);
}

/* ---- 5. THE TOP OF A GROUP PLAYED ------------------------------------------ */
console.log('5) the top of a group played');
/* (b) the bar is the shipped count minus one, kept only where main sits UNDER it (WR 8 shipped and 5 main, TE 9
   and 6). For quarterbacks and backs main's 8 is the bar itself (9 shipped), so a check there would prove
   nothing against main: the two counts are printed and not asserted. */
const TOP_BAR = { QB: null, RB: null, WR: 7, TE: 8 };
for (const g of OFFENSE) {
  const byRating = arm => [...groups[g].members].sort((x, y) => arm.get(y).ovr - arm.get(x).ovr || x.localeCompare(y));
  const n = g === 'WR' ? 15 : 10;
  /* (a) per game on purpose: a starter hurt for half the year carried a full load in the games he played */
  const light = arm => byRating(arm).slice(0, n).filter(key => { const p = offenseMap.get(key); return p && p.games >= 8 && p.workload / p.games < 0.6 * groups[g].perGame; });
  const nowLight = light(shipped), wasLight = light(main);
  console.log(`   ${g}: of the ${n} highest rated, men who played 8 games on under 60 percent of a starter's load a game: ${nowLight.length} shipped, ${wasLight.length} main${wasLight.length ? ' (' + wasLight.map(key => key.split('|')[1]).join(', ') + ')' : ''}`);
  ok(5, `${g}: nobody among the ${n} highest rated was a part time player all year`, nowLight.length === 0, nowLight.map(key => `${key} ${shipped.get(key).ovr}`).join(', '));
  /* (b) the ten most productive starters a game, and how many of them are among the fifteen highest rated */
  const productive = [...groups[g].starters].sort((x, y) => offenseMap.get(y).score / offenseMap.get(y).games - offenseMap.get(x).score / offenseMap.get(x).games || x.localeCompare(y)).slice(0, 10);
  const among = arm => { const top = new Set(byRating(arm).slice(0, 15)); return productive.filter(key => top.has(key)).length; };
  const nowAmong = among(shipped), wasAmong = among(main);
  console.log(`   ${g}: of the ten most productive starters a game, among the fifteen highest rated: ${nowAmong} shipped, ${wasAmong} main${TOP_BAR[g] == null ? '' : `, bar ${TOP_BAR[g]}`}`);
  if (TOP_BAR[g] != null) ok(5, `${g}: the most productive starters are among the highest rated`, nowAmong >= TOP_BAR[g], `${nowAmong} of 10, bar ${TOP_BAR[g]}`);
}

/* ---- 6. THE MARK IS COUNTED ------------------------------------------------- */
console.log('6) the mark is counted');
const SHELVES = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
let markTotals = { shipped: 0, main: 0 };
{
  const markedOn = arm => activeKeys.filter(key => arm.get(key)?.partial === true);
  const nowMarked = new Set(markedOn(shipped)), wasMarked = new Set(markedOn(main));
  markTotals = { shipped: nowMarked.size, main: wasMarked.size };
  const perShelf = SHELVES.map(s => { const all = activeKeys.filter(key => recordOf.get(key).seed.pos === s); return `${s} ${all.filter(key => nowMarked.has(key)).length} of ${all.length} (main ${all.filter(key => wasMarked.has(key)).length})`; });
  console.log(`   marked on active rosters: ${nowMarked.size} shipped, ${wasMarked.size} main; ${perShelf.join(', ')}`);
  const gained = [...nowMarked].filter(key => !wasMarked.has(key)), lost = [...wasMarked].filter(key => !nowMarked.has(key));
  ok(6, 'no man lost his mark', lost.length === 0, lost.slice(0, 5).join(', '));
  ok(6, 'every newly marked man is a fullback two publishers confirm, so the total is main\'s plus those men exactly', gained.every(key => confirmedFullbacks.has(key)) && nowMarked.size === wasMarked.size + gained.length,
    `${gained.length} newly marked: ${gained.filter(key => !confirmedFullbacks.has(key)).join(', ') || 'all confirmed'}`);
  const linemen = activeKeys.filter(key => recordOf.get(key).seed.pos === 'OL');
  ok(6, 'every lineman is still marked', linemen.length > 0 && linemen.every(key => nowMarked.has(key)), linemen.filter(key => !nowMarked.has(key)).slice(0, 3).join(', '));
  /* the ledger, both directions, on what ships (every tier) */
  const flat = [...shipped].filter(([, m]) => /fullback-role-unmeasured/.test(m.reasons ?? '')).map(([key]) => key);
  const flatNoRow = flat.filter(key => !confirmedFullbacks.has(key));
  const confirmedNotFlat = [...confirmedFullbacks].filter(key => !(shipped.get(key)?.ovr === OFFENSE_LAYER.fullbackOvr && shipped.get(key)?.partial === true && /fullback-role-unmeasured/.test(shipped.get(key)?.reasons ?? '')));
  ok(6, 'every man rated as a fullback holds a ledger row on which both pages print FB', flatNoRow.length === 0, flatNoRow.join(', '));
  ok(6, `every fullback two publishers confirm reads the flat ${OFFENSE_LAYER.fullbackOvr} with the mark and its reason`, confirmedFullbacks.size > 0 && confirmedNotFlat.length === 0, confirmedNotFlat.map(key => `${key} ${shipped.get(key)?.ovr}`).join(', '));
  const labelled = [...recordOf.values()].filter(r => r.sourceIdentity.depthChartPosition === 'FB').map(r => r.key);
  const unconfirmed = labelled.filter(key => !confirmedFullbacks.has(key));
  console.log(`   the record labels ${labelled.length} men FB; ${confirmedFullbacks.size} are confirmed by both pages and rated flat; on the normal path: ${unconfirmed.map(key => `${key} ${shipped.get(key)?.ovr}`).join(', ') || 'nobody'}`);
  /* the What's New claim, league wide: no active fullback sits in the top two of his club's backs */
  const topTwo = arm => labelled.filter(key => recordOf.get(key).tier !== 'practice').filter(key => {
    const backs = activeKeys.filter(k => recordOf.get(k).team === recordOf.get(key).team && recordOf.get(k).seed.pos === 'RB').sort((x, y) => arm.get(y).ovr - arm.get(x).ovr || x.localeCompare(y));
    return backs.indexOf(key) < 2;
  });
  const nowTop = topTwo(shipped), wasTop = topTwo(main);
  console.log(`   active fullbacks in the top two of their club's backs by number: ${nowTop.length} shipped, ${wasTop.length} main (${wasTop.map(key => `${key.split('|')[0]} ${key.split('|')[1]}`).join(', ')})`);
  ok(6, 'no active fullback sits in the top two of his club\'s running backs', nowTop.length === 0, nowTop.join(', '));
  const lowBacks = activeKeys.filter(key => groupOf(key) === 'RB' && shipped.get(key).ovr <= OFFENSE_LAYER.fullbackOvr), lowBacksMain = activeKeys.filter(key => groupOf(key) === 'RB' && main.get(key).ovr <= OFFENSE_LAYER.fullbackOvr);
  console.log(`   active backs who are not fullbacks at or under ${OFFENSE_LAYER.fullbackOvr}: ${lowBacks.length} shipped (${lowBacks.map(key => `${key.split('|')[1]} ${shipped.get(key).ovr}`).join(', ') || 'none'}), ${lowBacksMain.length} main`);
  /* the other direction of decision 7.4 on offense: a marked man who DOES hold an agreed 2025 line */
  const markedWithLine = activeKeys.filter(key => groupOf(key) && nowMarked.has(key) && offenseMap.has(key) && offenseMap.get(key).games >= OFFENSE_LAYER.minGames);
  console.log(`   marked offense men (fullbacks apart) who hold an agreed 2025 line of ${OFFENSE_LAYER.minGames} or more games: ${markedWithLine.length}${markedWithLine.length ? ': ' + markedWithLine.join(', ') : ''}`);
}

/* ---- 7. THE LEAGUE DOES NOT FLIP ------------------------------------------- */
console.log('7) the league does not flip');
/* The real engine, bundled once per arm over that arm's two data files. Seeds are fixed here: season s of block b
   plays on lcg(SEASON_SEED + 1000 * b + s), the same in every arm. */
const SEASON_SEED = 1130000, BLOCKS = Number(process.env.SIM_FO_ORDER_BLOCKS) || 5, SEASONS = 40;
/* (a) the floor sits halfway between the measured agreement and what the shuffle control produces.
   (b, c) each tolerance is in wins and is HALF the distance between main's value and the stretch arm's, so a league
   that moved half as far as "every offense number twice as far from 81" is red. The numbers are in the header. */
const RANK_FLOOR = 0.34;
/* ranks 9 to 24 carry no bar: the season's fixed total of wins pins the middle near 8.5 whatever the numbers are
   (main 8.57, stretch 8.52), so no distance exists to set a tolerance from. It is printed. */
const TOLERANCE = { 'ranks 1 to 8': 0.62, 'ranks 25 to 32': 0.57, spread: 0.47 };
{
  const req = createRequire(import.meta.url);
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-fo-order-${process.pid}-${Date.now()}-`));
  const lcg = seed => { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; };
  /** Rewrite the number on every quarterback, back, receiver and tight end row of a loaded file: next(ovr, index of the row among its shelf's rows, all the shelf's numbers). */
  const renumber = (text, next) => {
    const lines = text.split('\n'), rowsOf = {};
    lines.forEach((line, i) => { const m = line.match(ROW_RE); if (m && OFFENSE.includes(m[2])) (rowsOf[m[2]] ??= []).push({ i, ovr: Number(m[4]) }); });
    let changed = 0;
    for (const rows of Object.values(rowsOf)) rows.forEach((row, n) => {
      const to = next(row.ovr, n, rows.map(r => r.ovr));
      if (to !== row.ovr) { changed += 1; lines[row.i] = lines[row.i].replace(`ovr: ${row.ovr},`, `ovr: ${to},`); }
    });
    return { text: lines.join('\n'), changed };
  };
  let playStarters = startersRaw, playDepth = depthRaw;
  if (CONTROL === 'stretch' || CONTROL === 'shuffle') {
    const next = CONTROL === 'stretch' ? ovr => 81 + 2 * (ovr - 81) : (_ovr, n, all) => all[(n + Math.floor(all.length / 2)) % all.length];
    const s = renumber(startersRaw, next), d = renumber(depthRaw, next);
    if (s.changed < 100 || d.changed < 100) throw new Error(`control ${CONTROL}: it moved ${s.changed} starters rows and ${d.changed} depth rows, too few to prove anything`);
    playStarters = s.text; playDepth = d.text;
    console.log(`   control ${CONTROL}: ${CONTROL === 'stretch' ? 'every offense number sits twice as far from 81' : 'the offense numbers are dealt to other clubs\' men on the same shelf'} before the league is built (${s.changed} starters rows, ${d.changed} bench and practice rows)`);
  }
  /** The real engine over one pair of data files, bundled into its own folder. */
  async function bundle(tag, starterText, depthFileText) {
    const dir = path.join(TMP, tag); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'frontOfficePlayers.ts'), starterText); fs.writeFileSync(path.join(dir, 'frontOfficeDepth.ts'), depthFileText);
    fs.writeFileSync(path.join(dir, 'entry.ts'), `export * as engine from ${JSON.stringify(path.join(ROOT, 'src/lib/frontOffice.ts').replaceAll('\\', '/'))};\nexport { FO_DEPTH } from './frontOfficeDepth.ts';\n`);
    const out = path.join(dir, 'arm.mjs');
    await esbuild.build({ entryPoints: [path.join(dir, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
      alias: { '@/data/frontOfficePlayers': path.join(dir, 'frontOfficePlayers.ts'), '@/data/frontOfficeDepth': path.join(dir, 'frontOfficeDepth.ts'), '@': path.join(ROOT, 'src') } });
    return import(pathToFileURL(out).href);
  }
  /** Who is on each club's active roster once the computer clubs have cut down before Week 1. The GM's own club is
      never cut, so the league is opened twice, from two chairs, and every club is read from a league it is cut in. */
  const afterCutDown = ({ engine, FO_DEPTH }) => {
    const men = new Set();
    for (const [chair, clubs] of [['LV', abbr => abbr !== 'LV'], ['NYG', abbr => abbr === 'LV']]) {
      const lg = engine.initLeague(lcg(SEASON_SEED), { depth: FO_DEPTH, userTeam: chair });
      for (const t of Object.values(lg.teams)) if (clubs(t.abbr)) for (const p of t.players) men.add(`${t.abbr}|${p.name}|${p.pos}`);
    }
    return men;
  };
  async function arm(tag, starterText, depthFileText) {
    const built = await bundle(tag, starterText, depthFileText);
    const { engine, FO_DEPTH } = built;
    const opening = engine.initLeague(lcg(SEASON_SEED), { depth: FO_DEPTH });
    const strength = Object.fromEntries(Object.values(opening.teams).map(t => [t.abbr, engine.teamStrength(t)]));
    const ranked = Object.keys(strength).sort((x, y) => strength[y] - strength[x] || x.localeCompare(y));
    const blocks = [];
    for (let b = 0; b < BLOCKS; b += 1) {
      const wins = Object.fromEntries(ranked.map(abbr => [abbr, 0]));
      for (let s = 0; s < SEASONS; s += 1) {
        const rng = lcg(SEASON_SEED + 1000 * b + s), lg = engine.initLeague(rng, { depth: FO_DEPTH });
        for (let week = 0; week < 17; week += 1) { engine.injuryPass(lg.teams, rng); for (const g of lg.schedule[week]) engine.simGame(g, lg.teams, rng); }
        for (const t of Object.values(lg.teams)) wins[t.abbr] += t.wins;
      }
      const mean = ranked.map(abbr => wins[abbr] / SEASONS), avg = list => list.reduce((n, v) => n + v, 0) / list.length;
      blocks.push({ 'ranks 1 to 8': avg(mean.slice(0, 8)), 'ranks 9 to 24': avg(mean.slice(8, 24)), 'ranks 25 to 32': avg(mean.slice(24)), spread: Math.sqrt(avg(mean.map(v => (v - avg(mean)) ** 2))) });
    }
    const measure = {};
    for (const name of Object.keys(blocks[0])) {
      const values = blocks.map(b => b[name]), m = values.reduce((n, v) => n + v, 0) / values.length;
      measure[name] = { mean: m, error: Math.sqrt(values.reduce((n, v) => n + (v - m) ** 2, 0) / (values.length - 1)) / Math.sqrt(values.length) };
    }
    return { strength, measure, clubs: ranked.length, built };
  }
  const was = await arm('main', frozen.text, frozen.depthText), now = await arm('shipped', playStarters, playDepth);
  if (was.clubs !== 32 || now.clubs !== 32) { console.error('FAIL [7] an arm did not deal thirty two clubs, so nothing was measured'); process.exit(1); }
  const clubs = Object.keys(was.strength).sort();
  const agreement = spearman(clubs.map(c => now.strength[c]), clubs.map(c => was.strength[c]));
  console.log(`   (a) opening club strength, rank agreement between what ships and main over 32 clubs: ${f3(agreement)}, floor ${RANK_FLOOR ?? 'not set'}`);
  if (RANK_FLOOR != null) ok(7, '(a) the clubs keep their order of strength', agreement >= RANK_FLOOR, `${f3(agreement)} under ${RANK_FLOOR}`);
  const f2 = n => n.toFixed(2);
  for (const name of Object.keys(was.measure)) {
    const m = was.measure[name], s = now.measure[name], tolerance = TOLERANCE[name], what = name === 'spread' ? 'the spread of the 32 clubs\' mean wins' : `mean wins of the clubs in strength ${name}`;
    console.log(`   (${name === 'spread' ? 'c' : 'b'}) ${what}: ${f2(s.mean)} shipped (sampling error ${f3(s.error)}), ${f2(m.mean)} main (${f3(m.error)})${tolerance == null ? ', printed only' : `, bar main plus or minus ${tolerance}`}`);
    if (tolerance == null) continue;
    ok(7, `(${name === 'spread' ? 'c' : 'b'}) ${what} stays within ${tolerance} of main's`, Math.abs(s.mean - m.mean) <= tolerance, `${f2(s.mean)} against ${f2(m.mean)}`);
    ok(7, `(${name === 'spread' ? 'c' : 'b'}) ${what}: both arms are measured to a third of the tolerance or finer`, s.error < tolerance / 3 && m.error < tolerance / 3, `sampling error ${f3(s.error)} and ${f3(m.error)} against ${f3(tolerance / 3)}`);
  }
  /* (d) WHO IS ON THE ROSTER AFTER THE OPENING CUT-DOWN. The design promised roster membership does not change,
     and it does, by one man: a computer club over 53 releases its lowest rated spare man at a crowded position,
     and a confirmed fullback now reads the flat number, so the Giants (54 on the record) release their fullback
     where main released a defensive back. That is the flat number doing what it says, it is counted here and
     told to the lead, and nothing else may ride along: any OTHER man released is red, and so is a second one.
     Always read off the files as they ship (never the stretched or shuffled numbers of the league controls). */
  {
    const HELD_CUT = 1;
    let cutDepth = depthRaw;
    if (CONTROL === 'cutback') {
      cutDepth = patchOnce(depthRaw, "{ name: 'Devin Singletary', pos: 'RB', age: 28, ovr: 75,", "{ name: 'Devin Singletary', pos: 'RB', age: 28, ovr: 60,", 'cutback');
      console.log('   control cutback: a Giants running back who is no fullback reads 60 in the loaded depth text, under the flat fullback number');
    }
    const asShipped = playStarters === startersRaw && playDepth === depthRaw && cutDepth === depthRaw ? now.built : await bundle('shipped-cut', startersRaw, cutDepth);
    const kept = afterCutDown(asShipped), keptMain = afterCutDown(was.built);
    if (kept.size < 32 * 45 || keptMain.size < 32 * 45) { console.error(`FAIL [7] the cut-down leagues hold ${kept.size} and ${keptMain.size} men, so nothing was measured`); process.exit(1); }
    const released = [...keptMain].filter(key => !kept.has(key)).sort(), keptInstead = [...kept].filter(key => !keptMain.has(key)).sort();
    console.log(`   (d) active rosters after the opening cut-down: ${kept.size} men shipped, ${keptMain.size} main; released where main kept him: ${released.map(key => `${key} ${shipped.get(key)?.ovr ?? '?'} (main ${main.get(key)?.ovr ?? '?'})`).join(', ') || 'nobody'}; kept where main released him: ${keptInstead.join(', ') || 'nobody'}; held at ${HELD_CUT}`);
    ok(7, '(d) every man the opening cut-down releases whom main kept is a fullback two publishers confirm', released.every(key => confirmedFullbacks.has(key)), released.filter(key => !confirmedFullbacks.has(key)).join(', '));
    ok(7, `(d) the opening cut-down releases no more than ${HELD_CUT} man main kept`, released.length <= HELD_CUT && keptInstead.length === released.length, `${released.length} released, ${keptInstead.length} kept instead`);
  }
  fs.rmSync(TMP, { recursive: true, force: true });
}

/* ---- 8. THE SCALE DID NOT MOVE --------------------------------------------- */
console.log('8) the scale did not move');
/* The rule the layer's constants were chosen by (scripts/lib/nflFoRatingModel.mjs, its header): each offense
   position's mean and sd among the fifteen stay within ONE POINT of main's, because the engine's constants and
   every later value curve stand on that scale. The bar is that rule, not a number fitted to today: the measure has
   no noise in it (two fixed sets of numbers), today's largest distance is .49, and the three controls below are the
   changes a review made to the model that sections 0 to 7 let through. */
const SCALE_BAR = 1;
{
  let read = new Map([...shipped].map(([key, man]) => [key, man.ovr]));
  if (['lift', 'gain', 'noeff'].includes(CONTROL)) {
    const model = change => new Map(buildFullRatings(checkpoint, { ...OFFENSE_LAYER, production: offenseMap, fullbacks: confirmedFullbacks, ...change }).map(p => [p.key, p.ovr]));
    const asCommitted = model({});
    const drift = [...asCommitted].filter(([key, ovr]) => shipped.get(key)?.ovr !== ovr);
    if (drift.length) throw new Error(`control ${CONTROL}: the committed model does not rebuild the shipped numbers (${drift.length} men differ), so a changed model would prove nothing about them`);
    const changed = CONTROL === 'lift' ? new Map([...asCommitted].map(([key, ovr]) => [key, groupOf(key) ? ovr + 2 : ovr]))
      : model(CONTROL === 'gain' ? { gain: 16 } : { blend: { efficiency: 0, workload: 0.2, production: 0.8 } });
    const moved = [...changed].filter(([key, ovr]) => asCommitted.get(key) !== ovr).length;
    if (moved < 100) throw new Error(`control ${CONTROL}: it moved ${moved} numbers, too few to prove anything`);
    read = changed;
    console.log(`   control ${CONTROL}: section 8 reads ${CONTROL === 'lift' ? 'every offense number two points higher (about what moving the model\'s centre from 84 to 87 does)' : CONTROL === 'gain' ? 'the model rebuilt with gain 16 where it ships 13' : 'the model rebuilt with the efficiency term switched off (blend 0, .2, .8)'}: ${moved} numbers moved`);
  }
  const spreadOf = values => { const mean = values.reduce((s, n) => s + n, 0) / values.length; return { mean, sd: Math.sqrt(values.reduce((s, n) => s + (n - mean) ** 2, 0) / values.length) }; };
  const f2 = n => n.toFixed(2);
  let widest = 0;
  for (const g of OFFENSE) {
    const men = [...recordOf.values()].filter(r => r.tier === 'core' && groupOf(r.key) === g).map(r => r.key);
    if (men.length < 20) { console.error(`FAIL [8] ${g} holds ${men.length} of the fifteen, so nothing was measured`); process.exit(1); }
    const now = spreadOf(men.map(key => read.get(key))), was = spreadOf(men.map(key => main.get(key).ovr));
    widest = Math.max(widest, Math.abs(now.mean - was.mean), Math.abs(now.sd - was.sd));
    console.log(`   ${g}: the fifteen (${men.length} men), mean and sd ${f2(now.mean)} and ${f2(now.sd)} shipped, ${f2(was.mean)} and ${f2(was.sd)} main`);
    ok(8, `${g}: the mean among the fifteen stays within ${SCALE_BAR} of main's`, Math.abs(now.mean - was.mean) <= SCALE_BAR, `${f2(now.mean)} against ${f2(was.mean)}`);
    ok(8, `${g}: the sd among the fifteen stays within ${SCALE_BAR} of main's`, Math.abs(now.sd - was.sd) <= SCALE_BAR, `${f2(now.sd)} against ${f2(was.sd)}`);
  }
  /* printed, not asserted, and told to the lead: the running back SHELF as the engine reads it, with the confirmed
     fullbacks among the fifteen in. The flat fullback number, a separate decision from the layer's constants,
     widens that shelf past the one point rule on its own. */
  const shelf = [...recordOf.values()].filter(r => r.tier === 'core' && r.seed.pos === 'RB').map(r => r.key);
  const shelfNow = spreadOf(shelf.map(key => read.get(key))), shelfWas = spreadOf(shelf.map(key => main.get(key).ovr));
  console.log(`   largest distance from main above: ${f2(widest)}, bar ${SCALE_BAR}. Printed only: the running back shelf with its ${shelf.filter(key => confirmedFullbacks.has(key)).length} confirmed fullbacks in (${shelf.length} men), mean and sd ${f2(shelfNow.mean)} and ${f2(shelfNow.sd)} shipped, ${f2(shelfWas.mean)} and ${f2(shelfWas.sd)} main`);
}

/* ---- report ---------------------------------------------------------------- */
const redSections = [...red.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  /* the two league controls must each turn their own part of section 7 red and leave the other part green */
  const PARTS = { stretch: ['(b)', '(c)'], shuffle: ['(a)'], cutback: ['(d)'] };
  const parts = [...new Set((red.get(7) ?? []).map(label => label.slice(0, 3)))].sort();
  const partsFired = !PARTS[CONTROL] || parts.join() === PARTS[CONTROL].join();
  const fired = redSections.length === want.length && want.every(s => red.has(s)) && partsFired;
  console.log(`control ${CONTROL} ${fired ? 'fired' : 'DID NOT fire as designed'}: sections ${redSections.join(', ') || 'none'} went red, expected exactly ${want.join(', ')}${PARTS[CONTROL] ? `; in section 7 the parts ${parts.join(' ') || 'none'}, expected exactly ${PARTS[CONTROL].join(' ')}` : ''}`);
  process.exit(fired ? 0 : 1);
}
if (redSections.length) {
  console.error(`simFoRatingOrder: RED in section${redSections.length === 1 ? '' : 's'} ${redSections.join(', ')} (${[...red.values()].flat().length} of ${checks} checks failed)`);
  process.exit(1);
}
console.log(`simFoRatingOrder: green, ${checks} checks. One number per man: ${numbersOf.size} men, 0 with two numbers (main: ${mainTwo}). Marked on active rosters: ${markTotals.shipped} (main: ${markTotals.main}).`);
