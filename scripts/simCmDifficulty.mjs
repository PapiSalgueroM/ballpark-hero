/* Club Manager difficulty: Very Easy, Easy, Medium, Hard and Impossible (Round 1501's Normal, Hard and Legend;
   Round 1512 added the two easy rows and the change between matches).

   A player's report on /club-manager, 2026-10-14: "plsss make the game harder
   its simply way too easy". Two more on 2026-10-18 asked to change the level
   inside a running career, with five levels. The saved ids stay: 'normal' is
   Medium on screen, 'legend' is Impossible; 'veryeasy' and 'easy' are new. The
   level is picked on the Dugout step and changeable in Options between matches
   (setDifficulty in clubManagerStart.ts); a career that is ever on Easy or Very
   Easy posts no leaderboard score from then on (startOptions.easySince, one
   way). The dials are one table, CM_DIFFICULTY_DIALS in
   src/lib/clubManagerDifficulty.ts. Medium ('normal') is the game as it was, to
   the byte. Below, "Normal" in a section's words is Medium.

   Round 1512 additions: section 1 holds all five rows (no dial easier at a
   harder level; every dial but the cut strictly ordered; the cut 0 on both easy
   rows; the easy rows' caps). Section 2d opens the four committed save fixtures,
   as they are and keyed Hard and Legend, and six Hard and Legend seasons the
   base itself wrote, here and on the base: byte equal, the level as written.
   Section 3 runs its lever checks on Hard and on Very Easy (LEVER_LEVELS, the
   easy row's edge turns the odds FOR you). Section 4 holds the easy bands too,
   and FOLD prints each seed block. Section 7's example names all four off
   Medium levels. Section 8 is the change between matches.

   Sections (SECTION=<n> runs one, SECTION=all the default set; MEASURE=1 adds 0):
     0) measure: the Normal table (or LEVELS=normal,hard,legend) per tier and
        driver, over SEEDS and SEASONS. Asserts only that no cell is empty.
     1) the table: Normal is the identity row, each level strictly harder than
        the one before on every dial, every dial inside the caps the brief set,
        the two modules (comments stripped) name no growth, potential or rating,
        and clubManagerDifficulty.ts imports at runtime only files that do not
        import the engine back.
     2) Normal is the base, to the byte: the nine clubs, an Everton 2005-06
        career, a created club, a New year takeover, a mid season move through
        joinClubNow and a job taken in the wilderness, set up as the Dugout
        step sets them up with Normal chosen, SEEDS seeds, SEASONS seasons, the
        coach on and off: the whole state at every season end and the count of
        draws equal to BASE_ROOT's (a worktree of the commit the branch started
        from; without it, this tree with every dial read as Normal's). Then the
        picker path (setUpCareer returns its argument), and 2b: Hard with every
        dial set to Normal's plays as Normal, the key aside.
     3) each lever does exactly what its dial says, Hard with that one lever on
        and the rest at Normal's, from the same draws: B1 the board's change
        after the first match; P1 the next match card, the match facts and the
        odds, and from the code that only the seven readers of your match read
        the edge and simAiMatch keeps strengthOf; B2 a stay's opening; M1 day
        one, the summer cheque and a joinClubNow move's money; M2 day one, a
        summer move's ceiling and a joinClubNow move's ceiling; T1
        the marked market, Buy's charge, the clause floor and the AI's deals.
     4) outcomes over the fleet at the three levels for the engaged driver,
        held to the lead's bands (see the table below). Long: run it as its
        own line, or sharded (SHARD=k/n with OUT_JSON) and folded (FOLD=<dir>).
     6) Manager Hot Seat and Deadline Day dates play as on the base, with no
        level; Deadline Day's code reaches no lever.
     7) the help's worked example (ClubManagerHelp.tsx, comments out) holds
        exactly the numbers the table gives at a Challengers club, and the block
        opens by saying everything else on that screen, numbers and promises,
        is Normal's, and that one bad night in a new job can take you under Safe.
     8) the change between matches (Round 1512): Medium careers six entries in at
        three clubs, changed to each other level: the state outside startOptions
        byte equal, inside it only the level and the easy mark; saved and loaded
        back; the next match reads the new edge; the mark one way (up through
        Impossible to Medium keeps it, a career that only went harder posts);
        the same level, a junk id and a halftime refused, a sacked career may
        change; then season ends changed to each level roll a summer cheque of
        Medium's times the new dial.

   MEASURED (GitHub runner, remote checks r1501-m1 at 08a2a7b8; the dials are the starting table, untuned,
   because they met every band on the first measurement). Section 4, the engaged driver, 9 clubs, 8 seeds,
   6 seasons a level (432 seasons each), a sacked career handing its club to a fresh one:
                         mid ppg   drop      sacked seasons      spend a season   big club titles in ten
     Normal              1.41                 91 of 432 (0.21)   27.00m           3.89
     Hard                1.24      12.6%     258 of 432 (2.84x)  22.53m (-16.5%)  2.64
     Legend              1.09      23.0%     364 of 432 (4.00x)  14.58m (-46.0%)  1.39
     bands (the lead)              8 to 20 / 18 to 35   1.4x / 2x   -10% on Hard     1 on Hard
     Normal against Normal (even seeds against odd seeds): mid ppg 1.43 and 1.40, a 2.1% gap.
   A second block, seeds 8 to 15 (SEED_OFFSET=8, r1501-m2 at f8d1a7b7): Hard 17.0% (sacked 2.31x, spend
   -22.9%, big titles 2.08), Legend 25.2% (3.07x), Normal against Normal a 7.2% gap. The two blocks differ by
   4.4 points on Hard, so one block of 8 seeds can sit 3 points from the band's edge: a coin toss. Section 4
   therefore runs seeds 0 to 15 by default, both blocks pooled (1.42, 1.21, 1.08: Hard 14.8%, Legend 24.1%,
   sacked 2.53x and 3.47x, spend -19.8%, big titles 2.36; Normal against Normal 4.6%, so the pooled drop's
   error is about 2.3 points, over two of them from either edge). About 36 minutes of play, run as twelve child processes three at a time (one process ran out of memory).
   Sacked share by tier, which the bands do not hold (block 1): Hard 0.41 big, 0.54 mid, 0.84 small; Legend
   0.69, 0.85, 0.99 (Normal 0.13, 0.15, 0.35). The steady keeper (renews, signs nobody, r1501-m3), 8 seeds:
   small clubs sacked 0.39, 0.85 and 0.99 of seasons on Normal, Hard and Legend while over its ceiling in
   only 0.42, 0.11 and 0.79, so the small club sackings come from results and the board, not the wage drip.
   Section 0 on Normal, both drivers, 4 seeds, 10 seasons: the engaged buyer's mid ppg 1.40 against
   the steady keeper's 1.39, big club titles 4.25 and 3.83 in ten. One season takes about 0.7 s on a runner.

   MEASURED AGAIN FOR ROUND 1512 (GitHub runners, the engine of Release BK). Section 4, the engaged driver, 9
   clubs, seeds 0 to 15, 6 seasons a level (864 seasons each), sharded 4 a level and folded: Medium, Hard and
   Impossible from r1512-m1 and r1512-m1b on a1882d3e; Easy and Very Easy from r1512-fx2-m on 32813bb5, the
   easy market's sale floor in (markedPriceOf; the same shard of Medium played there came back byte equal to
   a1882d3e's, and each career plays on its own module and stream).
                         mid ppg   vs Medium   sacked seasons      spend a season    big titles   small ppg
     Very Easy           1.73      +30.0%       0 of 864 (0.00x)   38.19m (+40.4%)   7.60         1.45
     Easy                1.52      +14.2%      44 of 864 (0.18x)   32.89m (+20.9%)   4.72         1.37
     Medium              1.33                 244 of 864 (0.28)    27.20m            3.89         1.09
     Hard                1.20      -9.8%      535 of 864 (2.19x)   22.30m (-18.0%)   2.19         0.73
     Impossible          1.08      -18.6%     729 of 864 (2.99x)   14.69m (-46.0%)   1.15         0.56
     the lead's bands:   Easy up 6 to 20, sacked at most 0.75x, spend up; Very Easy up 14 to 35, at most 0.5x,
                         spend above Easy's, big titles under 9, small ppg under 2.3.
     Medium against Medium (even seeds against odd): 1.35 and 1.31, a 2.9% gap.
     Seed blocks (0 to 7 | 8 to 15): Very Easy +28.5 | +31.4, spend 39.17 | 37.22m, big titles 7.85 | 7.36;
     Easy +12.7 | +15.7, spend 34.00 | 31.78m; Hard -8.1 | -11.8; Impossible -17.3 | -20.0. Every easy band
     holds in both blocks; the nearest edge is Very Easy's big titles, 7.85 in block one against under 9.
     Before the sale floor (r1512-m2 on e86f0fe2, same dials): Very Easy +28.3%, spend 40.74m, big titles
     6.88; Easy +16.5%, spend 33.58m, big titles 4.93. The floor lifts what a man of 30 or over (and on Very
     Easy a man of 24 to 29) costs you, so the spend a season fell and the bands still hold.
     Very Easy first measured at cheque 1.4 and mark 0.75 (r1512-m1): +29.7%, spend 35.41m against Easy's
     33.58m, but 35.09 against 34.75m in block one, so "spend above Easy's" was 0.34m from a coin toss; the
     dials moved to cheque 1.5 and mark 0.8 (a cheaper market lowers the fee per man, so it pulled the spend
     down), never the band.
     NOT THIS ROUND'S, FOR THE LEAD: Hard and Impossible are main's rows, untouched here, and the engine has
     moved since Round 1501's table above (Medium's mid ppg 1.42 then, 1.33 now). Their pooled drops still sit in
     the bands (9.8 in 8 to 20, 18.6 in 18 to 35), but block one alone is 8.05 on Hard and 17.27 on Impossible,
     under its floor: both bands are now coin tosses on the current engine. (Round 1515 retuned them, below.)

   MEASURED FOR ROUND 1515, THE RETUNE (GitHub runners). Only the edge moved: Hard 1.5 to 2.5, Impossible 3 to
   4.3; every other dial of both rows, and the Medium and easy rows, as Round 1512 left them. Section 4 as
   above (engaged driver, 9 clubs, seeds 0 to 15, 6 seasons, 864 seasons a level), Hard and Impossible
   sharded 4 a level on r1515-t3a (the dials merged by DIALS_JSON on eca68d2e) and again with the committed
   table on r1515-m1, folded with Round 1512's Medium and easy shards (Medium's shard 0 played on this branch
   came back byte equal to r1512-m1's, r1515-t2a):
                         mid ppg   vs Medium   sacked seasons      spend a season    big titles   small ppg
     Very Easy           1.73      +30.0%       0 of 864 (0.00x)   38.19m (+40.4%)   7.60         1.45
     Easy                1.52      +14.2%      44 of 864 (0.18x)   32.89m (+20.9%)   4.72         1.37
     Medium              1.33                 244 of 864 (0.28)    27.20m            3.89         1.09
     Hard                1.09      -18.5%     622 of 864 (2.55x)   23.71m (-12.8%)   1.60         0.66
     Impossible          0.98      -26.4%     776 of 864 (3.18x)   14.73m (-45.8%)   0.90         0.47
     the lead's bands:   Hard down 13 to 20 in each block, sacked at least 1.6x, spend down at least 12%, big
                         titles at least 1.2; Impossible down 23 to 32 in each block, at least 2.4x, big
                         titles at least 0.5.
     Seed blocks (0 to 7 | 8 to 15): Hard -18.98 | -17.96, Impossible -27.26 | -25.60. Medium against Medium
     (even seeds against odd) 1.35 and 1.31, a 2.9% gap, so a drop of one block moves by about two points.
     The nearest edges: Hard's spend, 12.81 against its floor of 12, and Hard's block one, 18.98 against 20.
     Dials tried first (edge only unless named; Hard | Impossible pooled, blocks in brackets):
       Hard 3.0: 20.80 (21.83 | 19.81), over;  Impossible 5.0: 35.64, over, big titles 0.49.
       Hard 2.25 with cheque 0.7 and mark 1.25: 14.40 (17.77 | 11.20), block two under.  Impossible 4 with
         cheque 0.6 and mark 1.4: 28.44, big titles 0.49, under its floor (0.69 at edge 4 alone). The money
         dials added little drop and cost Impossible its big titles, so they stayed where they were.
       Hard 2.4: 16.05 (18.26 | 13.90).  Impossible 4.0: 24.47 (24.34 | 24.61), big titles 0.69.
       Hard 2.45: 18.92 (18.53 | 19.31).  Impossible 4.2: 29.20 (30.99 | 27.41), big titles 0.66.
       Hard 2.6: 18.45 (17.98 | 18.97), big titles 1.32.  Impossible 3.8: 25.25 (28.32 | 22.42), block two under.
     The drop does not climb smoothly with the edge (2.4, 2.45 and 2.5 give 16.1, 18.9 and 18.5): a step of a
     tenth moves which matches swing, so each setting is its own measurement. 2.5 and 4.3 hold every band in
     both blocks with the widest least margin of the settings measured.

   Negative controls (CM_DIFF_CONTROL), each patched in memory or into the
   bundle, never into src; each must turn its section red:
     flat        Hard's pain set to 1                                      1
     leak        a save with no key reads as Hard                          2 and 6 (every Hot Seat date)
     alloffleak  2b's Hard keeps its edge                                  2
     gain, pain, cut, cheque, wages, mark, edge
                 that lever of Hard set back to Normal's                   3
     clause      the clause floor at the card's price taken out            3
     nojoin      joinClubNow returns the new job without its dials         3 (M1 and M2 on a mid season move)
     ddreach     deadlineDay.ts gains a call to oppStrengthVsMe            6
     alloff      every level off Medium carries Medium's dials, in the     4
                 shard children too (Round 1512 review)
     helpdrift   Hard's cheque moved by 0.05 in memory                     7
   Round 1512:
     flate       Easy's gain set to Medium's                               1
     oldlevel    a load reads Impossible (legend) back as Hard             2 (2d)
     ve-gain, ve-pain, ve-cheque, ve-wages, ve-mark, ve-edge
                 that lever of Very Easy set back to Medium's              3 (the Very Easy pass only)
     helpdrifte  Easy's cheque moved by 0.05 in memory                     7
     midleak     setDifficulty also moves the board's mood                 8 (8a)
     easyclear   going back up clears the easy mark                        8 (8d)
     midnolevel  setDifficulty says yes and writes nothing                 8 (8b, 8c, 8d, 8f)
     foldflat    FOLD with Easy and Very Easy as copies of Medium's seasons  the fold's easy bands
   Round 1512 closing check:
     vefloor     the easy mark's floor at what a sale banks taken out      3 (the Very Easy pass)
     helplines   the help's first two level lines folded into one          7
   Round 1515:
     foldblock   FOLD with Hard's seasons of seeds 16 to 31 as Medium's   the fold's per block drop check
     foldbig     FOLD with Impossible's big club titles taken away         the fold's Impossible title floor
   Round 1515 fix (the fleet is seeds 0 to 31):
     foldhalf    FOLD with Hard's seasons of seeds 16 to 31 left out       the fold's every block played check

   Run: node scripts/simCmDifficulty.mjs     (SECTION=1, MEASURE=1 SEEDS=4 SEASONS=10)
        git worktree add /tmp/base <base sha> && BASE_ROOT=/tmp/base node scripts/simCmDifficulty.mjs
   DIALS_JSON='{"hard":{"edge":2}}' merges into the table in memory (tuning on a runner).
   Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control that did not fire.
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_ROOT = process.env.BASE_ROOT ? path.resolve(ROOT, process.env.BASE_ROOT) : null;
const CONTROL = process.env.CM_DIFF_CONTROL || '';
/* Each control and the sections it must turn red. */
const CONTROLS = {
  flat: ['1'], leak: ['2', '6'], alloffleak: ['2'], alloff: ['4'], clause: ['3'], nojoin: ['3'],
  gain: ['3'], pain: ['3'], cut: ['3'], cheque: ['3'], wages: ['3'], mark: ['3'], edge: ['3'], ddreach: ['6'], helpdrift: ['7'],
  /* Round 1512: the easy rows and the change between matches. */
  flate: ['1'], oldlevel: ['2'], 've-gain': ['3'], 've-pain': ['3'], 've-cheque': ['3'], 've-wages': ['3'], 've-mark': ['3'], 've-edge': ['3'],
  helpdrifte: ['7'], midleak: ['8'], easyclear: ['8'], midnolevel: ['8'], foldflat: [],
  /* Round 1512 closing check: the easy market's floor at what a sale banks; two levels on one line of the help. */
  vefloor: ['3'], helplines: ['7'],
  /* Round 1515: the retune's new fold checks, each seed block's drop and Impossible's big club title floor. */
  foldblock: [], foldbig: [], foldhalf: [],
};
const cannot = why => { console.log(`simCmDifficulty: CANNOT RUN: ${why}`); process.exit(2); };
if (CONTROL && !CONTROLS[CONTROL]) cannot(`CM_DIFF_CONTROL=${CONTROL} is not a control this harness knows`);
const num = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const DEFAULT_SECTIONS = ['1', '2', '3', '6', '7', '8'];
const SECTIONS = CONTROL ? CONTROLS[CONTROL]
  : (process.env.SECTION || 'all') === 'all'
    ? [...(process.env.MEASURE === '1' ? ['0'] : []), ...DEFAULT_SECTIONS]
    : String(process.env.SECTION).split(',');
if (BASE_ROOT && !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) cannot(`BASE_ROOT ${BASE_ROOT} holds no src/lib/clubManager.ts`);

let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const readAt = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8').replaceAll('\r\n', '\n');
const read = rel => readAt(ROOT, rel);
/** Source with comments out, so a guard reads code, not prose. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ---- bundles: this tree, the base tree (BASE_ROOT) and any control's edit, never src ---- */
const PATCHES = {
  leak: { file: 'clubManagerStart.ts', from: "  return readLevel(o && typeof o === 'object' ? o.difficulty : undefined);", to: "  return readLevel(o && typeof o === 'object' && o.difficulty !== undefined ? o.difficulty : 'hard');" },
  clause: { file: 'clubManager.ts', from: '  return Math.max(1, Math.round(base * mult * 10) / 10, mp.price);', to: '  return Math.max(1, Math.round(base * mult * 10) / 10);' },
  /* A merge that drops the dials from a mid season move (review of 2026-10-17: nothing saw it). */
  nojoin: { file: 'clubManagerCalendar.ts', from: '  return applyNewJobDials(joined);', to: '  return joined;' },
  /* Round 1512: a load that rewrites a level (Impossible read back as Hard), the migration decision 1 forbids. */
  oldlevel: { file: 'clubManagerStart.ts', from: "  return readLevel(o && typeof o === 'object' ? o.difficulty : undefined);", to: "  return readLevel(o && typeof o === 'object' ? (o.difficulty === 'legend' ? 'hard' : o.difficulty) : undefined);" },
  /* A change between matches that also touches something already played (the board's mood). */
  midleak: { file: 'clubManagerStart.ts', from: '  return { ...state, startOptions: optionsAtLevel(state, level) };', to: '  return { ...state, boardConfidence: (state.boardConfidence ?? 50) + 1, startOptions: optionsAtLevel(state, level) };' },
  /* Going back up clears the leaderboard mark, so the one way rule breaks. */
  easyclear: { file: 'clubManagerStart.ts', from: "  if (level === 'normal') delete next.difficulty;", to: "  if (!isEasyLevel(level)) delete next.easySince;\n  if (level === 'normal') delete next.difficulty;" },
  /* A change that says yes but writes nothing: the next match and the next cheque stay on the old level. */
  midnolevel: { file: 'clubManagerStart.ts', from: '  return { ...state, startOptions: optionsAtLevel(state, level) };', to: '  return { ...state };' },
  /* Round 1512 closing check: the easy mark without its floor, so a man is listed under what his sale banks. */
  vefloor: { file: 'clubManagerDifficulty.ts', from: '  return Math.min(mp.price, Math.max(marked, Math.round(mp.value * SALE_SHARE * 10) / 10));', to: '  return marked;' },
};
/* Without BASE_ROOT, section 2 compares with this tree with every dial read as Normal's: the same claim (a
   career without the key never takes a lever's path), held for as long as the levers exist. */
const PLAIN = [{ file: 'clubManagerDifficulty.ts', from: '  return CM_DIFFICULTY_DIALS[levelFrom(state)];', to: '  return CM_DIFFICULTY_DIALS.normal;' }];
const patchPlugin = (edits, hits) => ({
  name: 'cm-difficulty-edits',
  setup(b) {
    b.onLoad({ filter: /[.]ts$/ }, async args => {
      const mine = edits.filter(e => path.basename(args.path) === e.file);
      if (!mine.length) return undefined;
      let source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      for (const e of mine) {
        const count = source.split(e.from).length - 1;
        if (count !== 1) cannot(`an edit's text is in ${e.file} ${count} times, it must be exactly once (${e.from.slice(0, 60)}...)`);
        source = source.replace(e.from, e.to);
        hits.n += 1;
      }
      return { contents: source, loader: 'ts' };
    });
  },
});
const MODS = { cm: 'clubManager', st: 'clubManagerStart', dif: 'clubManagerDifficulty', asks: 'clubManagerBoardAsks', cal: 'clubManagerCalendar', eras: 'clubManagerEras', hs: 'managerHotSeat', dd: 'deadlineDay' };
async function bundleOf(root, name, edits) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `cmdiff-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const lines = Object.entries(MODS)
    .filter(([, f]) => fs.existsSync(path.join(root, `src/lib/${f}.ts`)))
    .map(([k, f]) => `export * as ${k} from ${JSON.stringify(path.join(root, `src/lib/${f}.ts`).split(path.sep).join('/'))};`);
  fs.writeFileSync(entry, lines.join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  const hits = { n: 0 };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: edits.length ? [patchPlugin(edits, hits)] : [] });
  if (hits.n !== edits.length) cannot(`${name}: ${hits.n} of ${edits.length} edits reached the bundle`);
  return out;
}

/* ---- the runtime: a fresh module per career (the way a page load deals one), a fixed clock ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
/* Round 1512: five levels, easiest first. The saved ids of Medium and Impossible are still 'normal' and 'legend'. */
const LEVELS = ['veryeasy', 'easy', 'normal', 'hard', 'legend'];
const OFF_MEDIUM = LEVELS.filter(l => l !== 'normal');
const KEYS = ['gain', 'pain', 'cut', 'cheque', 'wageRoom', 'mark', 'edge'];
const HARDER = { gain: -1, pain: 1, cut: 1, cheque: -1, wageRoom: -1, mark: 1, edge: 1 };
/* DIALS_JSON (tuning on a runner without a commit): merged over the table of every module this run loads. */
const TUNE = process.env.DIALS_JSON ? JSON.parse(process.env.DIALS_JSON) : null;
/** Dial edits made in memory, after each load: TUNE first, then the run's control. */
let memEdit = null;
function fresh(b) {
  delete req.cache[req.resolve(b)];
  store.clear();
  const m = req(b);
  const D = m.dif?.CM_DIFFICULTY_DIALS;
  if (D && TUNE) for (const lv of Object.keys(TUNE)) Object.assign(D[lv], TUNE[lv]);
  if (D && memEdit) memEdit(D);
  return m;
}
if (CONTROL === 'flat') { memEdit = D => { D.hard.pain = 1; }; console.log('NEGATIVE CONTROL ON: Hard\'s pain is 1, the same as Normal\'s'); }
if (CONTROL === 'alloff') { memEdit = D => { for (const l of OFF_MEDIUM) Object.assign(D[l], D.normal); }; console.log('NEGATIVE CONTROL ON: every level carries Medium\'s dials'); }
if (CONTROL === 'flate') { memEdit = D => { D.easy.gain = D.normal.gain; }; console.log('NEGATIVE CONTROL ON: Easy\'s gain is 1, the same as Medium\'s'); }

const FOLD = process.env.FOLD || '';
const HEAD = FOLD ? null : await bundleOf(ROOT, 'head', PATCHES[CONTROL] ? [PATCHES[CONTROL]] : []);
const head = FOLD ? { cm: null, dif: null, st: null, asks: null } : fresh(HEAD);
const cm = head.cm, dif = head.dif, st = head.st, asks = head.asks;
const DIALS = dif ? dif.CM_DIFFICULTY_DIALS : null;
console.log(`simCmDifficulty: sections ${SECTIONS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${TUNE ? `, dials tuned by DIALS_JSON ${JSON.stringify(TUNE)}` : ''}`);
if (DIALS) console.log(`  table: ${LEVELS.map(lv => `${lv} ${JSON.stringify(DIALS[lv])}`).join('; ')}`);

/* ---------- 1. the table ---------- */
function section1() {
  console.log('1) the table');
  const n = DIALS.normal;
  const identity = { gain: 1, pain: 1, cut: 0, cheque: 1, wageRoom: 1, mark: 1, edge: 0 };
  if (KEYS.every(k => n[k] === identity[k]) && Object.keys(n).length === KEYS.length) ok('Normal is the identity row');
  else fail(`Normal is not the identity row: ${JSON.stringify(n)}`);
  /* Round 1512, decision 3: no dial easier at a harder level, and the board (gain, pain), the money (cheque,
     wageRoom), the market (mark) and the edge strictly ordered across all five. The cut is 0 on Medium and both
     easy rows (no lift above the opening rule), then strictly up. */
  const tableLevels = Object.keys(DIALS);
  if (JSON.stringify(tableLevels) !== JSON.stringify(LEVELS)) fail(`the table's rows are ${tableLevels.join(', ')}, the five levels easiest first are ${LEVELS.join(', ')}`);
  let ordered = 0;
  for (let i = 1; i < LEVELS.length; i++) {
    const a = DIALS[LEVELS[i - 1]], b = DIALS[LEVELS[i]];
    for (const k of KEYS) {
      const strict = k !== 'cut' || LEVELS.indexOf(LEVELS[i]) > LEVELS.indexOf('normal');
      const harder = HARDER[k] > 0 ? (strict ? b[k] > a[k] : b[k] >= a[k]) : (strict ? b[k] < a[k] : b[k] <= a[k]);
      if (!harder) fail(`${LEVELS[i]} is not ${strict ? 'strictly ' : ''}harder than ${LEVELS[i - 1]} on ${k} (${a[k]} then ${b[k]})`);
      else ordered += 1;
    }
  }
  ok(`${ordered} of ${KEYS.length * (LEVELS.length - 1)} neighbour pairs ordered (every dial but the cut strictly)`);
  for (const lv of ['veryeasy', 'easy']) if (DIALS[lv].cut !== 0) fail(`${lv} cut is ${DIALS[lv].cut}; the lead kept it at 0 (no lift above the opening rule)`);
  /* The caps the brief set (decision 6): never gain under 0.6, cheque under 0.6, mark over 1.4,
     room under 0.85; the edge at most 3 on Hard and 5 on Legend; pain at most 1.5 and 1.8. */
  const caps = [
    ['hard', 'edge', v => v <= 3], ['legend', 'edge', v => v <= 5], ['hard', 'pain', v => v <= 1.5], ['legend', 'pain', v => v <= 1.8],
  ];
  for (const lv of ['hard', 'legend']) {
    const d = DIALS[lv];
    caps.push([lv, 'gain', v => v >= 0.6], [lv, 'cheque', v => v >= 0.6], [lv, 'mark', v => v <= 1.4], [lv, 'wageRoom', v => v >= 0.85]);
    if (!(d.cut > 0 && d.cut < 25)) fail(`${lv} cut ${d.cut} is outside 0 to 25`);
  }
  /* Round 1512: the easy rows' caps, the builder's mirror of the brief's (no lead number): never gain over 1.6,
     pain under 0.4, cheque over 1.6, room over 1.2, a mark under 0.6, or an edge under -5. */
  for (const lv of ['veryeasy', 'easy']) {
    caps.push([lv, 'gain', v => v <= 1.6], [lv, 'pain', v => v >= 0.4], [lv, 'cheque', v => v <= 1.6], [lv, 'wageRoom', v => v <= 1.2],
      [lv, 'mark', v => v >= 0.6], [lv, 'edge', v => v >= -5 && v < 0]);
  }
  let capped = 0;
  for (const [lv, k, okFn] of caps) { if (okFn(DIALS[lv][k])) capped += 1; else fail(`${lv} ${k} = ${DIALS[lv][k]} is past its cap`); }
  ok(`${capped} of ${caps.length} caps hold`);
  const mods = ['src/lib/managerDifficulty.ts', 'src/lib/clubManagerDifficulty.ts'];
  for (const m of mods) {
    const c = code(read(m));
    const bad = ['growth', 'potential', 'rating', 'developmentRate', 'agePlayer', 'Math.random', 'Date.now'].filter(w => c.includes(w));
    if (bad.length) fail(`${m} names ${bad.join(', ')} in its code`); else ok(`${m}: no growth, potential, rating, draw or clock in its code`);
  }
  /* The import cycle rule: runtime imports only from files that do not import the engine back. */
  const imports = [...code(read('src/lib/clubManagerDifficulty.ts')).matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)].map(m => m[1]);
  const allowed = ['@/lib/clubManagerStart', '@/lib/clubManagerBoardVerdict', '@/lib/managerDifficulty'];
  const stray = imports.filter(p => !allowed.includes(p));
  if (imports.length === 0) fail('read no runtime import from clubManagerDifficulty.ts, the reader is broken');
  else if (stray.length) fail(`clubManagerDifficulty.ts imports ${stray.join(', ')} at runtime`);
  else ok(`clubManagerDifficulty.ts runtime imports: ${imports.join(', ')}`);
  for (const p of allowed.slice(0, 2)) {
    const file = `src/lib/${p.split('/').pop()}.ts`;
    const back = [...code(read(file)).matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)].map(m => m[1]);
    if (back.some(b => b.endsWith('/clubManager') || b.endsWith('/clubManagerDifficulty'))) fail(`${file} imports the engine back at runtime`);
    else ok(`${file} does not import the engine or this module at runtime`);
  }
}

/* ---------- the drivers (section 0 and section 4) ---------- */
/* One stream per career, the same on every level, so Normal, Hard and Legend at one club and seed are
   paired: nothing in the setup draws, so they differ only by what the levers change. Same mix as
   scripts/lib/seedRandom.mjs (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => {
    f.n += 1;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.n = 0;
  return f;
}
function hash32(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Runs fn on its own stream; the draws it took are on withStream.draws afterwards. */
function withStream(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return fn(); } finally { Math.random = saved; withStream.draws = r.n; }
}
/** The hook's rebuild of the board's card (useClubManager.ts rebuildBoardAsks), for a module m. */
const rebuildAsksOf = m => s => [...(s.boardObjectives ?? []).filter(o => !m.asks.isBoardAsk(o.id)), ...m.asks.buildBoardAsks(s)];
/** A career on a level, the way the Dugout step sets it up (a base tree without the module plays Normal). */
const asLevel = (m, s, level) => (level === 'normal' && !m.dif ? s : m.dif.setUpCareer(s, { level }, rebuildAsksOf(m)));
const xiAvg = s => {
  const top = (s.squad ?? []).filter(p => !p.onLoan).map(p => p.rating).sort((a, b) => b - a).slice(0, 11);
  while (top.length < 11) top.push(60);
  return top.reduce((a, b) => a + b, 0) / 11;
};

/** The nine clubs: the first, the middle and the last of three leagues by expectation. */
function fleetClubs() {
  const out = [];
  for (const id of ['premier', 'laliga', 'seriea']) {
    const clubs = cm.playableClubs(id);
    out.push({ name: clubs[0].name, tier: 'big', expectation: clubs[0].expectation, league: id });
    const mid = clubs[Math.floor(clubs.length / 2)];
    out.push({ name: mid.name, tier: 'mid', expectation: mid.expectation, league: id });
    const last = clubs[clubs.length - 1];
    out.push({ name: last.name, tier: 'small', expectation: last.expectation, league: id });
  }
  return out;
}

/** One season under a driver. engaged renews every expiring deal and buys the best men the budget
    reaches in every window, from the market the page shows (marketForMe), while the squad is under 28;
    steady renews every deal and signs nobody. Both quick sim with the coach on. */
function playSeason(m, s, driver, rec) {
  const { cm, dif } = m;
  for (let guard = 0; guard < 150; guard++) {
    for (const p of cm.expiringPlayers(s)) { const nx = cm.renewContract(s, p.id); if (nx) s = nx; }
    if (driver === 'engaged' && s.transferWindow) {
      const market = dif.marketForMe(s, cm.buildMarket(s)).filter(m => m.price <= s.budget).sort((a, b) => b.rating - a.rating);
      for (const mp of market.slice(0, 60)) {
        if (s.squad.length >= 28) break;
        if (mp.price > s.budget) continue;
        const nx = cm.buyPlayer(s, mp);
        if (!nx) continue;
        rec.fees += s.budget - nx.budget;
        rec.signings += 1;
        const clause = cm.releaseClauseOf(mp, s.season);
        if (clause !== null && clause < mp.price) rec.clauseUnder += 1;
        if (cm.loanEligible && cm.loanEligible(s, mp) && cm.loanFeeOf(mp) + 1.15 * (mp.value ?? mp.price) < mp.price) rec.loanUnder += 1;
        s = nx;
      }
    }
    const bill = cm.wageBill(s);
    if (Number.isFinite(bill) && s.wageCap > 0 && bill > s.wageCap) rec.over = true;
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (typeof s.boardConfidence === 'number') {
      rec.boardMin = Math.min(rec.boardMin, s.boardConfidence);
      rec.boardSum += s.boardConfidence; rec.boardN += 1;
    }
    if (res.kind === 'seasonOver' || s.sacked) return s;
  }
  rec.stuck = true;
  return s;
}

/** A career of SEASONS seasons at one club. A sacked career hands the club to a fresh one on the next
    draws of the same stream (the Round 505 keeper rule), so every level plays the same number of seasons
    and a level that sacks more is not averaged over its luckier survivors. */
function runCareer(club, driver, seed, level, seasons) {
  const m = fresh(HEAD);
  const { cm } = m;
  return withStream(hash32(`${club.name}|${driver}|${seed}`), () => {
    let s = asLevel(m, cm.startCareer(club.name), level);
    const rows = [];
    for (let season = 1; season <= seasons; season++) {
      const rec = { club: club.name, tier: club.tier, driver, seed, level, season, fees: 0, signings: 0, clauseUnder: 0, loanUnder: 0, over: false, boardMin: 100, boardSum: 0, boardN: 0, xiStart: xiAvg(s), budgetStart: s.budget };
      s = playSeason(m, s, driver, rec);
      const row = (s.table ?? []).find(r => r.club === s.clubName);
      rec.pts = row ? row.pts : 0;
      rec.games = row ? row.w + row.d + row.l : 0;
      rec.xiEnd = xiAvg(s);
      rec.sacked = !!s.sacked;
      rec.matches = rec.boardN;
      if (s.sacked) {
        rec.position = null; rec.title = false; rec.trophies = 0; rec.balance = s.budget;
        rows.push(rec);
        s = asLevel(m, cm.startCareer(club.name), level);
        continue;
      }
      const fin = cm.finishSeason(s);
      rec.position = fin.summary.position;
      rec.expectation = club.expectation;
      rec.title = fin.summary.position === 1 && rec.games > 0;
      rec.trophies = (fin.summary.trophies ?? []).length;
      rec.balance = fin.state.budget;
      rows.push(rec);
      if (season < seasons) s = cm.startNextSeason(fin.state);
    }
    return rows;
  });
}

/** Every career of a fleet, sharded by SHARD=k/n (k from 0) so a runner can split it into jobs. */
function fleetJobs(levels, seeds, drivers) {
  const jobs = [];
  const off = num('SEED_OFFSET', 0);
  for (const club of fleetClubs()) for (const driver of drivers) for (let seed = off; seed < off + seeds; seed++) jobs.push({ club, driver, seed });
  const [k, n] = String(process.env.SHARD || '0/1').split('/').map(Number);
  return { jobs: jobs.filter((_, i) => i % n === k), levels };
}
function runFleet(levels, seeds, seasons, drivers) {
  const { jobs } = fleetJobs(levels, seeds, drivers);
  const rows = [];
  const t0 = performance.now();
  for (const j of jobs) for (const level of levels) rows.push(...runCareer(j.club, j.driver, j.seed, level, seasons));
  const secs = (performance.now() - t0) / 1000;
  console.log(`  played ${rows.length} seasons in ${secs.toFixed(0)} s (${(secs / Math.max(1, rows.length)).toFixed(2)} s a season)`);
  if (process.env.OUT_JSON) fs.writeFileSync(process.env.OUT_JSON, JSON.stringify(rows));
  return rows;
}
const sum = (a, f) => a.reduce((n, r) => n + f(r), 0);
/** One cell of the table: the numbers decision 2 and section 0 name. */
function cell(rows) {
  const done = rows.filter(r => !r.sacked);
  const games = sum(rows, r => r.games);
  return {
    seasons: rows.length,
    ppg: games ? sum(rows, r => r.pts) / games : NaN,
    vsExp: done.length ? sum(done, r => r.position - r.expectation) / done.length : NaN,
    titles10: rows.length ? (10 * rows.filter(r => r.title).length) / rows.length : NaN,
    trophies10: rows.length ? (10 * sum(rows, r => r.trophies)) / rows.length : NaN,
    fees: rows.length ? sum(rows, r => r.fees) / rows.length : NaN,
    signings: rows.length ? sum(rows, r => r.signings) / rows.length : NaN,
    balance: done.length ? sum(done, r => r.balance) / done.length : NaN,
    over: rows.length ? rows.filter(r => r.over).length / rows.length : NaN,
    boardMin: rows.length ? sum(rows, r => r.boardMin) / rows.length : NaN,
    boardMean: sum(rows, r => r.boardN) ? sum(rows, r => r.boardSum) / sum(rows, r => r.boardN) : NaN,
    sacked: rows.length ? rows.filter(r => r.sacked).length / rows.length : NaN,
    matches: rows.length ? sum(rows, r => r.matches) / rows.length : NaN,
    xiStart: rows.length ? sum(rows, r => r.xiStart) / rows.length : NaN,
    xiEnd: rows.length ? sum(rows, r => r.xiEnd) / rows.length : NaN,
    clauseUnder: sum(rows, r => r.clauseUnder),
    loanUnder: sum(rows, r => r.loanUnder),
    stuck: rows.filter(r => r.stuck).length,
  };
}
const f2 = v => (Number.isFinite(v) ? v.toFixed(2) : '  -  ');
function printTable(rows, levels) {
  console.log('  level  tier  driver   n   ppg  vsExp titles10 troph10   fees  sign  balance over  bMin bMean sacked matches xiS  xiE  clauseU loanU');
  for (const level of levels) for (const tier of ['big', 'mid', 'small']) for (const driver of ['engaged', 'steady']) {
    const rs = rows.filter(r => r.level === level && r.tier === tier && r.driver === driver);
    if (!rs.length) continue;
    const c = cell(rs);
    console.log(`  ${level.padEnd(6)} ${tier.padEnd(5)} ${driver.padEnd(7)} ${String(c.seasons).padStart(3)} ${f2(c.ppg)} ${f2(c.vsExp).padStart(6)} ${f2(c.titles10).padStart(7)} ${f2(c.trophies10).padStart(7)} ${f2(c.fees).padStart(6)} ${f2(c.signings).padStart(5)} ${f2(c.balance).padStart(8)} ${f2(c.over)} ${f2(c.boardMin).padStart(5)} ${f2(c.boardMean).padStart(5)} ${f2(c.sacked)} ${f2(c.matches).padStart(6)} ${f2(c.xiStart)} ${f2(c.xiEnd)} ${String(c.clauseUnder).padStart(5)} ${String(c.loanUnder).padStart(5)}`);
  }
}

/* ---------- 0. measure ---------- */
function section0() {
  const levels = (process.env.LEVELS || 'normal').split(',');
  const seeds = num('SEEDS', 4), seasons = num('SEASONS', 10);
  const drivers = (process.env.DRIVERS || 'engaged,steady').split(',');
  console.log(`0) measure: ${levels.join(', ')}, ${seeds} seeds, ${seasons} seasons, ${drivers.join(' and ')}, shard ${process.env.SHARD || '0/1'}`);
  for (const c of fleetClubs()) console.log(`  ${c.tier.padEnd(5)} ${c.name} (${c.league}, expected ${c.expectation})`);
  const rows = runFleet(levels, seeds, seasons, drivers);
  printTable(rows, levels);
  const empty = [];
  for (const level of levels) for (const tier of ['big', 'mid', 'small']) for (const driver of drivers) {
    if (!rows.some(r => r.level === level && r.tier === tier && r.driver === driver)) empty.push(`${level} ${tier} ${driver}`);
  }
  if (process.env.SHARD && process.env.SHARD !== '0/1') ok('a shard: the empty cell check is the fold\'s');
  else if (empty.length) fail(`empty cells: ${empty.join(', ')}`); else ok('no cell is empty');
  const stuck = rows.filter(r => r.stuck).length;
  if (stuck) fail(`${stuck} seasons never reached their end inside 150 entries`);
}

/* ---------- 2. Normal is the base, to the byte ---------- */
const SPEC = { name: 'Difficulty Town', stadium: 'Level Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'DT' }, budgetTier: 'small', leagueId: 'premier', replacedClub: '' };
/** The careers section 2 replays: the nine clubs, an Everton career in 2005-06, a created club, a New year
    takeover, a mid season move through joinClubNow and a job taken in the wilderness (the last two from the
    review of 2026-10-17: the brief's decision 8 lists them), each set up the way the Dugout step does it with
    Normal chosen. The two job paths count how often they reached the new job, and section 2 requires every time. */
function identityCareers() {
  const fleet = fleetClubs();
  const out = fleet.map(c => ({ tag: c.name, era: null, make: m => m.cm.startCareer(c.name) }));
  out.push({ tag: 'Everton 2005-06', era: 'era2005', make: m => m.cm.startCareer('Everton', 'era2005') });
  const spec = { ...SPEC, replacedClub: cm.playableClubs('premier').at(-1).name };
  out.push({ tag: 'a created club', era: null, make: m => m.cm.startCareer(spec.name, 'now', spec) });
  out.push({ tag: 'Brentford, New year takeover', era: null, make: m => m.cal.startMidSeason(m.cm.startCareer('Brentford'), 'newYear') });
  const sixEntries = (m, club) => {
    let s = m.cm.startCareer(club);
    for (let g = 0; g < 6; g += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state;
    return s;
  };
  const mid = fleet.find(c => c.tier === 'mid' && c.league === 'premier').name;
  const small = fleet.find(c => c.tier === 'small' && c.league === 'premier').name;
  out.push({ tag: `${mid}, a joinClubNow move`, era: null, job: true, tried: 0, reached: 0, make(m) {
    this.tried += 1;
    const s = sixEntries(m, mid);
    const to = moveTarget(m, s.clubName);
    const j = to && !s.sacked ? m.cal.joinClubNow(accepted(s, to)) : null;
    if (j && j.clubName === to) this.reached += 1;
    return j ?? s;
  } });
  out.push({ tag: `${small}, a wilderness job`, era: null, job: true, tried: 0, reached: 0, make(m) {
    this.tried += 1;
    const s = sixEntries(m, small);
    let w = m.cm.enterWilderness({ ...s, sacked: true, boardConfidence: 0 });
    for (let g = 0; g < 40 && !(w.wilderness?.offers?.length); g += 1) w = m.cm.wildernessWeek(w);
    const offer = w.wilderness?.offers?.[0];
    const j = offer ? m.cm.acceptWildernessJob(w, offer.club) : null;
    if (j && !j.sacked && !j.wilderness) this.reached += 1;
    return j ?? w;
  } });
  return out;
}
const setUp = (m, s, setup) => (m.dif ? m.dif.setUpCareer(s, setup, rebuildAsksOf(m)) : s);
/** One career, SEASONS seasons of quick sims; the whole state at every season end, and the draws taken. */
async function replay(b, career, seed, coach, level, seasons, edit) {
  const m = fresh(b);
  if (edit) edit(m.dif.CM_DIFFICULTY_DIALS);
  if (career.era && m.eras?.ensureEraRosters) await m.eras.ensureEraRosters(career.era);
  const snaps = [];
  withStream(seed, () => {
    let s = setUp(m, career.make(m), { level });
    for (let k = 1; k <= seasons; k += 1) {
      let over = false;
      for (let guard = 0; guard < 160; guard += 1) {
        const res = m.cm.playNextEntry(s, { skipHalftime: true, noCoach: !coach });
        s = res.state;
        if (res.kind === 'seasonOver') { over = true; break; }
        if (s.sacked) break;
      }
      if (!over) { snaps.push(JSON.stringify(s)); return; }
      s = m.cm.finishSeason(s).state;
      snaps.push(JSON.stringify(s));
      if (k < seasons) s = m.cm.startNextSeason(s);
    }
  });
  return { snaps, draws: withStream.draws };
}
const firstDiff = (a, b) => {
  const x = JSON.parse(a), y = JSON.parse(b);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) return k;
  return '(key order)';
};
/* 2b compares the two as data: the key goes in where setUpCareer puts it, so the order of the keys differs. */
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const withoutLevel = j => { const o = JSON.parse(j); if (o.startOptions) delete o.startOptions.difficulty; return JSON.stringify(canon(o)); };
const canonJson = j => JSON.stringify(canon(JSON.parse(j)));
async function section2() {
  const seeds = num('SEEDS', 2), seasons = num('SEASONS', 2);
  const BASE = BASE_ROOT ? await bundleOf(BASE_ROOT, 'base', []) : await bundleOf(ROOT, 'plain', PLAIN);
  console.log(`2) Normal plays as ${BASE_ROOT ? `the base tree ${BASE_ROOT}` : 'this tree with every dial read as Normal\'s'}: ${seeds} seeds, ${seasons} seasons, coach and noCoach`);
  const careers = identityCareers();
  let compared = 0, draws = 0, keyed = 0;
  const t0 = performance.now();
  for (const career of careers) for (let seed = 0; seed < seeds; seed += 1) for (const coach of [true, false]) {
    const sd = 5000 + seed * 97 + careers.indexOf(career);
    const a = await replay(HEAD, career, sd, coach, 'normal', seasons);
    const b = await replay(BASE, career, sd, coach, 'normal', seasons);
    const tag = `${career.tag} seed ${seed} ${coach ? 'coach' : 'noCoach'}`;
    compared += 1; draws += a.draws;
    if (a.draws !== b.draws) fail(`${tag}: ${a.draws} draws here, ${b.draws} on the base`);
    if (a.snaps.length !== b.snaps.length) fail(`${tag}: ${a.snaps.length} season ends here, ${b.snaps.length} on the base`);
    for (let i = 0; i < Math.min(a.snaps.length, b.snaps.length); i += 1) {
      if (a.snaps[i] !== b.snaps[i]) { fail(`${tag}: season ${i + 1} differs from the base, first at key ${firstDiff(a.snaps[i], b.snaps[i])}`); break; }
    }
    if (a.snaps.some(j => JSON.parse(j).startOptions?.difficulty !== undefined)) keyed += 1;
  }
  if (keyed) fail(`${keyed} Normal careers carry the difficulty key`);
  ok(`${compared} Normal careers compared with the base, ${draws} draws, in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  for (const c of careers.filter(x => x.job)) {
    if (!c.tried || c.reached !== c.tried) fail(`${c.tag}: reached the new job ${c.reached} of ${c.tried} times, so that path was not compared`);
    else ok(`${c.tag}: reached the new job all ${c.tried} times, on both trees`);
  }
  /* The picker path: Normal with No sacking off is the very object it was given. */
  const m = fresh(HEAD), s0 = m.cm.startCareer('Everton');
  if (m.dif.setUpCareer(s0, { level: 'normal', noSack: false }, () => { throw new Error('rebuilt'); }) === s0 && m.dif.setUpCareer(s0) === s0) ok('setUpCareer on Normal with No sacking off returns its argument');
  else fail('setUpCareer on Normal does not return its argument');

  /* 2c. Old saves: a save the base wrote (its own saveCareer, after a season) opens on this tree to exactly what
     the base opens it to, and reads as Normal with No sacking off. */
  let loaded = 0;
  for (const career of careers) {
    const mb = fresh(BASE);
    if (career.era && mb.eras?.ensureEraRosters) await mb.eras.ensureEraRosters(career.era);
    const s = withStream(17000 + careers.indexOf(career), () => {
      let x = career.make(mb);
      for (let guard = 0; guard < 160; guard += 1) { const res = mb.cm.playNextEntry(x, { skipHalftime: true }); x = res.state; if (res.kind === 'seasonOver' || x.sacked) break; }
      return x;
    });
    mb.cm.saveCareer(s);
    let raw = store.get(mb.cm.SAVE_KEY);
    if (!raw) { raw = JSON.stringify(s); console.log(`   2c ${career.tag}: the base's writer left nothing in the stub storage, the state's own JSON is opened instead`); }
    const openOn = async b => {
      const m = fresh(b);
      if (career.era && m.eras?.ensureEraRosters) await m.eras.ensureEraRosters(career.era);
      store.set(m.cm.SAVE_KEY, raw);
      return { json: JSON.stringify(m.cm.loadCareer()), level: m.st.levelFrom ? m.st.levelFrom(m.cm.loadCareer()) : 'normal', noSack: m.st.noSackFrom(m.cm.loadCareer()) };
    };
    const a = await openOn(HEAD), b = await openOn(BASE);
    if (a.json !== b.json) fail(`2c ${career.tag}: the base's save opens differently here, first at key ${firstDiff(a.json, b.json)}`);
    else if (a.level !== 'normal' || a.noSack !== null) fail(`2c ${career.tag}: the base's save reads as ${a.level}, No sacking ${a.noSack}`);
    else loaded += 1;
  }
  ok(`2c: ${loaded} of ${careers.length} saves the base wrote open here as they open there, Normal with No sacking off`);

  /* 2d (Round 1512, decision 1). Old saves on Hard and Legend open unchanged: the four committed save fixtures as
     they are and keyed to Hard and to Legend, and careers the base itself set up on Hard and Legend and saved after
     a season. Each opens here to exactly what the base opens it to (the bytes), and its level reads as written, so
     no load or migration rewrites a level or an earned record. */
  {
    if (CONTROL === 'oldlevel') console.log('NEGATIVE CONTROL ON: a load reads Impossible (legend) back as Hard');
    const saves = [];
    for (const f of ['cmBookSaveEvertonFixture', 'cmBookSaveHerthaFixture', 'cmOldSave1052Fixture', 'cmSecondTierOldSaveFixture']) {
      const p = path.join(ROOT, 'scripts/data', `${f}.json`);
      if (!fs.existsSync(p)) { fail(`2d: scripts/data/${f}.json is gone`); continue; }
      const raw = fs.readFileSync(p, 'utf8');
      const o = JSON.parse(raw);
      saves.push({ tag: f, raw, want: 'normal', era: o.eraId });
      for (const lv of ['hard', 'legend']) saves.push({ tag: `${f} keyed ${lv}`, raw: JSON.stringify({ ...o, startOptions: { ...(o.startOptions ?? {}), difficulty: lv } }), want: lv, era: o.eraId });
    }
    for (const lv of ['hard', 'legend']) for (const career of careers.slice(0, 3)) {
      const mb = fresh(BASE);
      if (!mb.dif) { fail('2d: the base has no difficulty module, so it cannot write a Hard save'); break; }
      const s = withStream(19000 + careers.indexOf(career) + (lv === 'legend' ? 50 : 0), () => {
        let x = setUp(mb, career.make(mb), { level: lv });
        for (let guard = 0; guard < 160; guard += 1) { const res = mb.cm.playNextEntry(x, { skipHalftime: true }); x = res.state; if (res.kind === 'seasonOver' || x.sacked) break; }
        return x;
      });
      mb.cm.saveCareer(s);
      saves.push({ tag: `${career.tag}, a ${lv} season the base wrote`, raw: store.get(mb.cm.SAVE_KEY) ?? JSON.stringify(s), want: lv, era: career.era });
    }
    let same = 0;
    for (const sv of saves) {
      const openOn = async b => {
        const m = fresh(b);
        if (sv.era && sv.era !== 'now' && m.eras?.ensureEraRosters) await m.eras.ensureEraRosters(sv.era);
        store.set(m.cm.SAVE_KEY, sv.raw);
        const c = m.cm.loadCareer();
        return { json: JSON.stringify(c), level: c ? m.st.levelFrom(c) : null };
      };
      const a = await openOn(HEAD), b = await openOn(BASE);
      if (a.json !== b.json) fail(`2d ${sv.tag}: opens differently here, first at key ${firstDiff(a.json, b.json)}`);
      else if (a.level !== sv.want) fail(`2d ${sv.tag}: reads as ${a.level} here, it was written ${sv.want}`);
      else same += 1;
    }
    if (saves.length < 18) fail(`2d: only ${saves.length} saves opened, 18 are expected`);
    else if (same === saves.length) ok(`2d: ${same} old saves (the four fixtures as they are and keyed Hard and Legend, and six Hard and Legend seasons the base wrote) open here byte for byte as there, each on its own level`);
  }

  /* 2b. Every lever is its dial: Hard with every dial set to Normal's plays as Normal, the key aside. */
  const leakEdge = CONTROL === 'alloffleak';
  if (leakEdge) console.log('NEGATIVE CONTROL ON: 2b keeps Hard\'s edge on');
  const allOff = D => { const edge = D.hard.edge; Object.assign(D.hard, D.normal); if (leakEdge) D.hard.edge = edge; };
  let same = 0, n2 = 0;
  for (const career of careers.slice(0, 9)) for (const coach of [true, false]) {
    const sd = 7000 + careers.indexOf(career);
    const a = await replay(HEAD, career, sd, coach, 'hard', seasons, allOff);
    const b = await replay(HEAD, career, sd, coach, 'normal', seasons);
    n2 += 1;
    const tag = `2b ${career.tag} ${coach ? 'coach' : 'noCoach'}`;
    if (a.draws !== b.draws) { fail(`${tag}: Hard with Normal's dials took ${a.draws} draws, Normal ${b.draws}`); continue; }
    const bad = a.snaps.findIndex((j, i) => withoutLevel(j) !== canonJson(b.snaps[i]));
    if (bad >= 0 || a.snaps.length !== b.snaps.length) fail(`${tag}: Hard with Normal's dials differs from Normal${bad >= 0 ? ` in season ${bad + 1}, first at key ${firstDiff(withoutLevel(a.snaps[bad]), canonJson(b.snaps[bad]))}` : ''}`);
    else if (!a.snaps.every(j => JSON.parse(j).startOptions?.difficulty === 'hard')) fail(`${tag}: the Hard career lost its key`);
    else same += 1;
  }
  ok(`2b: ${same} of ${n2} Hard careers on Normal's dials play as Normal, the key aside`);
}

/* ---------- 3. each lever does exactly what its dial says ---------- */
/* A module whose Hard row is Normal's but for ONE lever (Hard's own value), so a Hard career and a Normal
   one take the same draws up to that lever. The lever's control sets that dial back to Normal's too, and
   its check must then go red. */
const LEVER_OF = { gain: ['gain'], pain: ['pain'], cut: ['cut'], cheque: ['cheque'], wages: ['wageRoom'], mark: ['mark'], edge: ['edge'] };
/* Round 1512: the same checks run on each level of LEVER_LEVELS (default Hard and Very Easy, the far end of the
   new rows: Easy reads the same code with smaller numbers). LV is the level under test, LVN its word. A lever
   control named ve-<lever> sets Very Easy's lever back to Medium's and runs the Very Easy pass only; a plain one
   (gain, edge...) does the same to Hard and runs the Hard pass only. */
const LEVER_CONTROL = CONTROL.startsWith('ve-') && LEVER_OF[CONTROL.slice(3)] ? { level: 'veryeasy', keys: LEVER_OF[CONTROL.slice(3)] }
  : LEVER_OF[CONTROL] ? { level: 'hard', keys: LEVER_OF[CONTROL] } : null;
const LEVER_LEVELS = LEVER_CONTROL ? [LEVER_CONTROL.level] : (process.env.LEVER_LEVELS || 'hard,veryeasy').split(',');
const LEVEL_WORD = { veryeasy: 'Very Easy', easy: 'Easy', normal: 'Medium', hard: 'Hard', legend: 'Impossible' };
let LV = 'hard', LVN = 'Hard';
function leverModule(keys) {
  const m = fresh(HEAD);
  const D = m.dif.CM_DIFFICULTY_DIALS, own = { ...D[LV] };
  Object.assign(D[LV], D.normal);
  for (const k of keys) D[LV][k] = own[k];
  if (LEVER_CONTROL && LEVER_CONTROL.level === LV && keys.some(k => LEVER_CONTROL.keys.includes(k))) for (const k of LEVER_CONTROL.keys) D[LV][k] = D.normal[k];
  return { m, dial: own };
}
const close = (a, b, tol) => Math.abs(a - b) <= tol;
/** The first match a career plays: its report and the state after it. */
function firstMatch(m, s) {
  for (let guard = 0; guard < 30; guard += 1) {
    const res = m.cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.report && typeof res.report.confidenceDelta === 'number') return { report: res.report, s };
  }
  return null;
}
/** A season's end under the steady driver (renews, signs nobody), on the Normal module m. */
function seasonEnd(m, club, seed) {
  return withStream(seed, () => {
    let s = m.cm.startCareer(club);
    const rec = { fees: 0, signings: 0, clauseUnder: 0, loanUnder: 0, over: false, boardMin: 100, boardSum: 0, boardN: 0 };
    s = playSeason(m, s, 'steady', rec);
    return s.sacked ? null : m.cm.finishSeason(s).state;
  });
}
const keyed = (s, level) => ({ ...s, startOptions: { ...(s.startOptions ?? {}), difficulty: level } });
function section3() {
  const seeds = num('SEEDS3', 4);
  if (LEVER_CONTROL || CONTROL === 'clause' || CONTROL === 'nojoin' || CONTROL === 'vefloor') console.log(`NEGATIVE CONTROL ON: ${CONTROL === 'clause' ? 'the clause floor at the card\'s price is gone' : CONTROL === 'vefloor' ? 'the easy mark\'s floor at what a sale banks is gone' : CONTROL === 'nojoin' ? 'joinClubNow returns the new job without its dials' : `${LEVEL_WORD[LEVER_CONTROL.level]}'s ${LEVER_CONTROL.keys.join(' and ')} set back to Medium's`}`);
  console.log(`3) each lever does what its dial says (${LVN} with one lever on, the rest Medium's), ${seeds} seeds`);
  const clubs = fleetClubs();
  /* B1: the board's change after the first match. */
  {
    const { m: mh, dial } = leverModule(['gain', 'pain']);
    let n = 0, bad = 0, up = 0, down = 0;
    for (const c of clubs) for (let seed = 0; seed < seeds; seed += 1) {
      const sd = 9000 + seed * 31 + clubs.indexOf(c);
      const mn = fresh(HEAD);
      const a = withStream(sd, () => firstMatch(mn, mn.cm.startCareer(c.name)));
      const b = withStream(sd, () => firstMatch(mh, setUp(mh, mh.cm.startCareer(c.name), { level: LV })));
      if (!a || !b) { fail(`B1 ${c.name} seed ${seed}: no first match`); continue; }
      const dn = a.report.confidenceDelta, dh = b.report.confidenceDelta;
      if (Math.abs(dn) < 0.5) continue;
      n += 1;
      const want = dn > 0 ? dn * dial.gain : dn * dial.pain;
      if (dn > 0) up += 1; else down += 1;
      if (!close(dh, want, 0.13) || Math.sign(dh) !== Math.sign(dn)) { bad += 1; if (bad <= 3) fail(`B1 ${c.name} seed ${seed}: Normal ${dn}, ${LVN} ${dh}, the dial says ${want.toFixed(2)}`); }
    }
    if (bad > 3) fail(`B1: ${bad} matches in all off the dial`);
    if (n < 20 || up < 3 || down < 3) fail(`B1: only ${n} first matches (${up} up, ${down} down) moved the board by 0.5 or more, the floor is 20 with 3 each way`);
    else if (!bad) ok(`B1: ${n} first matches (${up} up, ${down} down), ${LVN}'s change is Normal's times the dial every time`);
  }
  /* P1: the match facts and the next match card show the edge; the odds turn against you; no AI match reads it. */
  {
    const { m: mh, dial } = leverModule(['edge']);
    const mn = fresh(HEAD);
    let n = 0, worse = 0;
    for (const c of clubs) {
      const sn = withStream(11, () => mn.cm.startCareer(c.name));
      const sh = withStream(11, () => setUp(mh, mh.cm.startCareer(c.name), { level: LV }));
      const opp = mn.cm.nextFixtureFrom(sn, sn.week);
      const oh = mh.cm.nextFixtureFrom(sh, sh.week);
      if (!opp?.opponent || !oh?.opponent || opp.opponent !== oh.opponent) continue;
      n += 1;
      const want = mn.cm.strengthOf(sn, opp.opponent) + dial.edge;
      if (!close(mh.cm.oppStrengthVsMe(sh, oh.opponent), want, 1e-9)) fail(`P1 ${c.name}: the opponent reads ${mh.cm.oppStrengthVsMe(sh, oh.opponent)}, the dial says ${want}`);
      if (oh.oppStrength !== Math.round(want)) fail(`P1 ${c.name}: the next match card shows ${oh.oppStrength}, the dial says ${Math.round(want)}`);
      const fn = mn.cm.matchFacts(sn), fh = mh.cm.matchFacts(sh);
      /* Round 1512: on an easy row the edge is negative, so the odds must turn FOR you. */
      const harder = dial.edge > 0;
      if (fn && fh && (harder ? fh.odds.loss > fn.odds.loss && fh.odds.win < fn.odds.win : fh.odds.loss < fn.odds.loss && fh.odds.win > fn.odds.win)) worse += 1;
    }
    const way = dial.edge > 0 ? 'against you' : 'for you';
    if (n < 6) fail(`P1: only ${n} clubs had a next fixture to read`);
    else if (worse < n) fail(`P1 ${LVN}: the odds turned ${way} in ${worse} of ${n} match facts`);
    else ok(`P1 ${LVN}: ${n} next match cards and match facts read the opponent at strength plus ${dial.edge}, the odds turned ${way} in all ${n}`);
    /* The code reads below hold for every level, so they run on the Hard pass only. */
    if (LV !== 'hard') return;
    /* No AI against AI match reads it: in the engine (comments stripped) oppStrengthVsMe is called in the seven
       readers of your match only, and simAiMatch keeps strengthOf. */
    const src = code(read('src/lib/clubManager.ts'));
    const readers = ['talkTargetNow', 'firstHalfLambdas', 'secondHalfLambdas', 'playMyMatch', 'talkEdgeFor', 'nextFixtureFrom', 'matchFacts'];
    const calls = [...src.matchAll(/oppStrengthVsMe\(/g)].map(x => x.index);
    const fnStarts = [...src.matchAll(/^(?:export )?function (\w+)/gm)].map(x => ({ name: x[1], at: x.index }));
    const owner = at => fnStarts.filter(f => f.at < at).at(-1)?.name;
    const owners = calls.map(owner).filter(o => o !== 'oppStrengthVsMe');
    const stray = owners.filter(o => !readers.includes(o));
    if (owners.length !== 7 || stray.length) fail(`P1: oppStrengthVsMe is called ${owners.length} times (${owners.join(', ')}), seven are expected, all in ${readers.join(', ')}`);
    else ok(`P1: oppStrengthVsMe is read in exactly the seven readers of your match (${[...new Set(owners)].join(', ')})`);
    const ai = src.slice(src.indexOf('function simAiMatch('), src.indexOf('\n}\n', src.indexOf('function simAiMatch(')));
    if (!ai.includes('strengthOf(state, home)') || ai.includes('oppStrengthVsMe')) fail('P1: simAiMatch no longer reads plain strengthOf');
    else ok('P1: simAiMatch reads plain strengthOf, so no match between other clubs moves');
  }
}

/** The summer rolled from one season end state on a stream of its own (simClubManagerBudget's rollWith). */
const rollOn = (m, s, seed, club) => withStream(seed, () => m.cm.startNextSeason(s, club));
/** A mid season move through joinClubNow (clubManagerCalendar.ts): an approach the manager has said yes to,
    on a stream of its own, so both modules take the same draws and only the new job's dials can differ. */
const accepted = (s, to) => ({ ...s, jobHunt: { open: { club: to, league: 'Premier League', tier: 2, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted', decidedWeek: s.week }, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } });
/** Where a mid season move goes: a Premier League club in the middle of the table, never the manager's own. */
const moveTarget = (m, from) => m.cm.playableClubs('premier').find(c => c.name !== from && c.expectation > 8 && c.expectation < 14)?.name;
/** A whole mid season move on module m and one stream: six entries in at club, then joinClubNow on the
    level given (the key goes on just before the move, so the six entries are Normal's on every module). */
const joinAfterSix = (m, club, seed, level) => withStream(seed, () => {
  let s = m.cm.startCareer(club);
  for (let g = 0; g < 6; g += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state;
  const to = moveTarget(m, club);
  if (s.sacked || !to) return null;
  const j = m.cal.joinClubNow(accepted(level === 'normal' ? s : keyed(s, level), to));
  return j && j.clubName === to ? j : null;
});
function section3money() {
  const seeds = num('SEEDS3', 4);
  const clubs = fleetClubs().filter(c => c.tier !== 'big');
  const mn = fresh(HEAD);
  const ends = [];
  for (const c of clubs) for (let seed = 0; seed < Math.max(2, seeds - 1); seed += 1) {
    const s = seasonEnd(mn, c.name, 12000 + seed * 53 + clubs.indexOf(c));
    if (s) ends.push({ club: c.name, s, seed: 13000 + seed * 7 + clubs.indexOf(c) });
  }
  console.log(`  ${ends.length} season ends rolled (the steady driver at the mid and small clubs)`);
  /* M1 and M2 on joinClubNow: six entries in at every club of the fleet, then an accepted approach. The new
     job's money is Normal's times the cheque and its ceiling Normal's times the room (founders' room aside).
     Each move is played whole on a module of its own, Normal first and then Hard with that one lever on, from
     the same stream: joinClubNow's run in reads the module's world, so a state carried from one module to
     another moves the money by itself (measured: 78.18 against 78.06 with no dial at all). lever is the dial
     under test, read is the number. */
  const joinCheck = (label, lever, wantOf, read) => {
    let n = 0, bad = 0, dialValue = null;
    for (const [i, c] of fleetClubs().entries()) {
      const seed = 14000 + i;
      const a = joinAfterSix(fresh(HEAD), c.name, seed, 'normal');
      const { m, dial } = leverModule([lever]);
      dialValue = dial[lever];
      const b = joinAfterSix(m, c.name, seed, LV);
      if (!a || !b || a.clubName !== b.clubName) { fail(`${label} joinClubNow ${c.name}: Normal moved to ${a?.clubName ?? 'nowhere'}, ${LVN} to ${b?.clubName ?? 'nowhere'}`); continue; }
      n += 1;
      const want = wantOf(a, dial);
      if (!close(read(b), want, 1e-9)) { bad += 1; if (bad <= 3) fail(`${label} joinClubNow ${c.name} to ${a.clubName}: Normal ${read(a)}, ${LVN} ${read(b)}, the dial says ${want}`); }
    }
    if (bad > 3) fail(`${label} joinClubNow: ${bad} moves in all off the dial`);
    if (n < 6) fail(`${label} joinClubNow: only ${n} mid season moves read, the floor is 6`);
    else if (!bad) ok(`${label} joinClubNow: ${n} mid season moves start on Normal's ${label === 'M1' ? 'money' : 'ceiling'} times ${dialValue}`);
  };
  /* B2: a stay's opening. At or above Safe it is Normal's; under Safe it is Normal's minus the cut. */
  {
    const { m, dial } = leverModule(['cut']);
    let below = 0, above = 0, bad = 0;
    for (const e of ends) {
      const a = rollOn(mn, e.s, e.seed), b = rollOn(m, keyed(e.s, LV), e.seed);
      const want = a.boardConfidence >= 60 ? a.boardConfidence : a.boardConfidence - dial.cut;
      if (a.boardConfidence >= 60) above += 1; else below += 1;
      if (b.boardConfidence !== want) { bad += 1; if (bad <= 3) fail(`B2 ${e.club}: Normal opens at ${a.boardConfidence}, ${LVN} at ${b.boardConfidence}, the dial says ${want}`); }
    }
    if (below < 4 || above < 1) fail(`B2: ${below} openings under Safe and ${above} at or above it; the floors are 4 and 1`);
    else if (!bad) ok(`B2: ${below} bad openings fell by exactly ${dial.cut}, ${above} at or above Safe stayed`);
  }
  /* M1: the summer cheque, read with nothing carried. */
  {
    const { m, dial } = leverModule(['cheque']);
    let n = 0, bad = 0;
    for (const e of ends) {
      const empty = { ...e.s, budget: 0 };
      const a = rollOn(mn, empty, e.seed), b = rollOn(m, keyed(empty, LV), e.seed);
      n += 1;
      const want = Math.round(a.budget * dial.cheque * 10) / 10;
      if (!close(b.budget, want, 0.11)) { bad += 1; if (bad <= 3) fail(`M1 ${e.club}: Normal's cheque ${a.budget}, ${LVN}'s ${b.budget}, the dial says ${want}`); }
    }
    const day = fresh(HEAD).cm.startCareer('Brentford');
    const dh = setUp(m, m.cm.startCareer('Brentford'), { level: LV });
    if (dh.budget !== Math.round(day.budget * dial.cheque * 10) / 10) fail(`M1 day one: Normal ${day.budget}, ${LVN} ${dh.budget}`);
    if (n < 6) fail(`M1: only ${n} summers read`);
    else if (!bad) ok(`M1: day one and ${n} summer cheques are Normal's times ${dial.cheque}`);
  }
  joinCheck('M1', 'cheque', (a, d) => Math.round(a.budget * d.cheque * 10) / 10, j => j.budget);
  /* M2: the wage ceiling of a new job (day one, and a summer move); a stay grows the one it has. */
  {
    const { m, dial } = leverModule(['wageRoom']);
    let n = 0, bad = 0;
    const want = cap => Math.max(60, Math.round(cap * dial.wageRoom));
    for (const c of clubs.slice(0, 4)) {
      const a = withStream(3, () => mn.cm.startCareer(c.name)), b = withStream(3, () => setUp(m, m.cm.startCareer(c.name), { level: LV }));
      n += 1;
      if (b.wageCap !== want(a.wageCap)) { bad += 1; fail(`M2 day one ${c.name}: Normal ${a.wageCap}, ${LVN} ${b.wageCap}, the dial says ${want(a.wageCap)}`); }
    }
    const league = cm.playableClubs('premier');
    for (const e of ends.slice(0, 6)) {
      const to = league.find(c => c.name !== e.club && c.expectation > 8)?.name;
      const a = rollOn(mn, e.s, e.seed, to), b = rollOn(m, keyed(e.s, LV), e.seed, to);
      if (a.clubName !== to || b.clubName !== to) { fail(`M2 move ${e.club} to ${to}: the move did not happen`); continue; }
      n += 1;
      if (b.wageCap !== want(a.wageCap)) { bad += 1; if (bad <= 3) fail(`M2 move to ${to}: Normal ${a.wageCap}, ${LVN} ${b.wageCap}, the dial says ${want(a.wageCap)}`); }
    }
    if (n < 8) fail(`M2: only ${n} new jobs read`);
    else if (!bad) ok(`M2: ${n} new jobs (day one and summer moves) start on Normal's ceiling times ${dial.wageRoom}`);
  }
  joinCheck('M2', 'wageRoom', (a, d) => { const room = a.founderWageRoom ?? 0; return Math.max(60, Math.round((a.wageCap - room) * d.wageRoom)) + room; }, j => j.wageCap);
  /* T1: the market listed to you. Same men, same order, marked prices; Buy charges the marked price; the
     clause never undercuts it (at Legend's mark, where on the old rule it could); the AI's headlines are Normal's. */
  {
    const { m, dial } = leverModule(['mark']);
    const s0 = withStream(5, () => m.cm.startCareer('Brentford'));
    const sh = { ...setUp(m, s0, { level: LV }), budget: 9999, transferWindow: s0.transferWindow ?? 'summer' };
    const base = m.cm.buildMarket(sh), mine = m.dif.marketForMe(sh, base);
    /* Round 1512 closing check: under 1 the mark never lists a man under 0.9 of his value (what selling him
       straight back banks) nor over Medium's price; the signings below hold that against the engine's sellValue. */
    const listed = mp => {
      const plain = Math.max(0.5, Math.round(mp.price * dial.mark * 10) / 10);
      return dial.mark < 1 && mp.value !== undefined ? Math.min(mp.price, Math.max(plain, Math.round(mp.value * 0.9 * 10) / 10)) : plain;
    };
    let marked = 0;
    mine.forEach((mp, i) => { if (mp.name === base[i].name && mp.value === base[i].value && mp.price === listed(base[i])) marked += 1; });
    if (marked !== base.length || (dial.mark !== 1 && mine.every((mp, i) => mp.price === base[i].price))) fail(`T1: ${marked} of ${base.length} cards are the same man at the marked price`);
    else ok(`T1: all ${base.length} cards are the same men in the same order at ${dial.mark} times the list`);
    /* Round 1512: a card the mark moved (on an easy row a cheap man can sit on the 0.5 floor at his list price). */
    const pick = mine.find((mp, i) => mp.price !== base[i].price && m.cm.buyPlayer(sh, mp));
    const after = pick && m.cm.buyPlayer(sh, pick);
    if (!after || !close(sh.budget - after.budget, pick.price, 1e-9) || pick.price === base[mine.indexOf(pick)].price) fail(`T1 ${LVN}: Buy did not charge the marked price${pick ? ` (${sh.budget - after?.budget} for a card of ${pick.price})` : ''}`);
    else ok(`T1 ${LVN}: Buy charges the marked price (${pick.price} for a man listed at ${base[mine.indexOf(pick)].price})`);
    const floor = mine.filter(mp => mp.price < 0.5).length;
    if (floor) fail(`T1 ${LVN}: ${floor} cards are listed under the 0.5 floor`);
    /* Round 1512 closing check (review minor 4): on a row under 1, buying a man must never cost less than selling
       him straight back banks, or a Very Easy career buys a man over 30 at 0.72 of his value and sells him at 0.9.
       Every card that can be signed is bought on its own from the same state and read back by sellValue. */
    if (dial.mark < 1) {
      let n = 0, under = 0, older = 0, first = '';
      for (const mp of mine) {
        const after = m.cm.buyPlayer(sh, mp);
        const signed = after && after.squad.find(p => p.name === mp.name && !sh.squad.some(q => q.id === p.id));
        if (!signed) continue;
        n += 1;
        if (mp.age >= 30) older += 1;
        const paid = sh.budget - after.budget, sale = m.cm.sellValue(signed);
        if (paid < sale - 1e-9) { under += 1; if (!first) first = `${mp.name}, ${mp.age}, ${f2(paid)}m paid against ${f2(sale)}m banked`; }
      }
      if (n < 200 || older < 20) fail(`T1 ${LVN}: only ${n} signings (${older} of 30 or over) to hold the floor against`);
      else if (under) fail(`T1 ${LVN}: ${under} of ${n} signings cost less than selling him straight back banks (first ${first})`);
      else ok(`T1 ${LVN}: none of ${n} signings (${older} of 30 or over) costs less than selling him straight back banks`);
    }
    if (LV !== 'hard') {
      const runA = withStream(21, () => { let s = mn.cm.startCareer('Brentford'); for (let i = 0; i < 6; i += 1) s = mn.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
      const runB = withStream(21, () => { let s = setUp(m, m.cm.startCareer('Brentford'), { level: LV }); for (let i = 0; i < 6; i += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
      if (JSON.stringify(runA) !== JSON.stringify(runB)) fail(`T1 ${LVN}: the AI's headlines on a marked market differ from Medium's`);
      else ok(`T1 ${LVN}: the AI's own deals are Medium's (${runA.length} headlines after six entries)`);
      return;
    }
    const legendMark = DIALS.legend.mark;
    let under = 0, clauses = 0;
    for (const mp of base) {
      const card = { ...mp, price: Math.max(0.5, Math.round(mp.price * legendMark * 10) / 10) };
      const c = m.cm.releaseClauseOf(card, sh.season);
      if (c === null) continue;
      clauses += 1;
      if (c < card.price) under += 1;
    }
    if (under) fail(`T1: ${under} of ${clauses} release clauses undercut the price at Legend's mark`);
    else ok(`T1: none of ${clauses} release clauses undercuts the price at Legend's mark`);
    const runA = withStream(21, () => { let s = mn.cm.startCareer('Brentford'); for (let i = 0; i < 6; i += 1) s = mn.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
    const runB = withStream(21, () => { let s = setUp(m, m.cm.startCareer('Brentford'), { level: LV }); for (let i = 0; i < 6; i += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
    if (JSON.stringify(runA) !== JSON.stringify(runB)) fail('T1: the AI\'s headlines on a marked market differ from Normal\'s');
    else ok(`T1: the AI's own deals are Normal's (${runA.length} headlines after six entries)`);
  }
}

/* ---------- 6. the dailies never carry a level ---------- */
const HOT = ['2026-10-10', '2026-10-11', '2026-10-27'];
const DEAD = ['2026-10-10', '2026-10-11', '2026-10-18'];
const carriesLevel = x => !!(x && x.startOptions && typeof x.startOptions === 'object' && 'difficulty' in x.startOptions);
/* simDailyDeals' fixed script: balanced, no talk, the first press answer. */
function hotSeatDay(b, date) {
  const { hs } = fresh(b);
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  const hand = run.verdict ? hs.handoverState(run) : null;
  return { club: setup.club, json: JSON.stringify([run.state, run.log, run.verdict ?? null, hand]), keyed: carriesLevel(run.state) || carriesLevel(hand) };
}
function deadlineDayRun(b, date) {
  const { dd } = fresh(b);
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.endDay(dd.startDeadlineDay(setup));
  return { club: setup.club, json: JSON.stringify([run.state, run.grade ?? null, run.ticker]), keyed: carriesLevel(run.state) };
}
async function section6() {
  const BASE = BASE_ROOT ? await bundleOf(BASE_ROOT, 'base6', []) : await bundleOf(ROOT, 'plain6', PLAIN);
  console.log(`6) Manager Hot Seat (${HOT.join(', ')}) and Deadline Day (${DEAD.join(', ')}) play as on ${BASE_ROOT ? 'the base tree' : 'this tree with every dial read as Normal\'s'}`);
  const red = { 'Hot Seat': 0, 'Deadline Day': 0 };
  for (const [kind, dates, day] of [['Hot Seat', HOT, hotSeatDay], ['Deadline Day', DEAD, deadlineDayRun]]) {
    for (const date of dates) {
      const a = day(HEAD, date), b = day(BASE, date);
      const why = [];
      if (a.json !== b.json) why.push('the day differs from the base');
      if (a.keyed) why.push('its state carries a level');
      if (why.length) { red[kind] += 1; fail(`${kind} ${date} (${a.club}): ${why.join('; ')}`); }
      else console.log(`   ${kind} ${date} ${a.club}: identical, no level`);
    }
  }
  /* Deadline Day plays no match and never sets a career up, so no lever can reach it whatever its state
     holds. Proved from its code (comments stripped), with a control that adds one call to a copy. */
  let ddCode = code(read('src/lib/deadlineDay.ts'));
  if (CONTROL === 'ddreach') ddCode += '\nexport function reach(state) { return oppStrengthVsMe(state, "x"); }\n';
  const ENTRY_POINTS = ['playNextEntry', 'resumeMatch', 'playMyMatch', 'simToWeek', 'oppStrengthVsMe', 'boardSwing', 'boardOpening',
    'boardCheque', 'wageRoomFor', 'marketForMe', 'setUpCareer', 'applyNewJobDials', 'joinClubNow', 'startNextSeason', 'useClubManager'];
  const reached = ENTRY_POINTS.filter(n => new RegExp('(^|[^A-Za-z0-9_$])' + n + '[(]').test(ddCode));
  if (reached.length) fail(`deadlineDay.ts calls ${reached.join(', ')}, so a lever can reach Deadline Day`);
  console.log(`   red per daily: Hot Seat ${red['Hot Seat']} of ${HOT.length}, Deadline Day ${red['Deadline Day']} of ${DEAD.length}; deadlineDay.ts calls ${reached.length ? reached.join(', ') : 'none of the match, summer, market or setup entry points'}`);
}

/* ---------- 4. outcomes: the lead's table for the engaged driver ---------- */
/* Decision 2 of the round's brief, the bands the dials are tuned to, over the fleet (the nine clubs,
   SEEDS seeds, SEASONS seasons, a sacked career handing its club to a fresh one so every level plays every
   season): at the mid clubs the engaged driver's points per game falls 8 to 20 percent on Hard and 18 to 35
   on Legend; his seasons ending in a sacking (all nine clubs) are at least 1.4 times Normal's on Hard and 2
   times on Legend; his spend per season is at least 10 percent lower on Hard; and a big club on Hard still
   wins its league in at least one season in ten. The bands are the lead's; the measured numbers and the
   spread of Normal against Normal on other seeds are in the header table.
   Round 1515 (the retune, the lead's decision 1): the mid clubs' points per game fall 13 to 20 percent on Hard
   and 23 to 32 on Impossible, pooled AND in each seed block (0 to 15, 16 to 31); sacked seasons at least 1.6 and
   2.4 times Medium's; spend a season on Hard at least 12 percent under; a big club still wins its league at
   least 1.2 seasons in ten on Hard and 0.5 on Impossible.
   Round 1515 review: the first retune held on seeds 0 to 15 and fell out of both drop bands on seeds 16 to 31,
   so the fleet is seeds 0 to 31 and each block is sixteen seeds (more careers, never a wider band). */
const BANDS = { hard: { drop: [0.13, 0.20], sack: 1.6, spend: 0.12, big: 1.2 }, legend: { drop: [0.23, 0.32], sack: 2.4, big: 0.5 } };
/* The two seed blocks a band must hold in on its own (Round 1512 printed them; Round 1515 holds the drops to them). */
const BLOCKS = [['seeds 0 to 15', r => r.seed < 16], ['seeds 16 to 31', r => r.seed >= 16]];
/* Medium's seasons on the seeds a level was played on, so a level folded from fewer seeds than Medium's (the
   easy rows' shards hold seeds 0 to 15) is held against the same careers, never against other seeds. */
const mediumOn = (rows, l) => { const s = new Set(rows.filter(r => r.level === l).map(r => r.seed)); return outcomesOf(rows.filter(r => r.level === 'normal' && s.has(r.seed))).normal; };
/* Failures of the per block drop check, so control foldblock can say it was that check that went red. */
let blockFails = 0;
/* Round 1512, decision 3: the easy rows against Medium. The mid clubs' points per game UP 6 to 20 percent on
   Easy and 14 to 35 on Very Easy; sacked seasons at most 0.75 and 0.5 times Medium's; spend a season up on Easy
   and up further on Very Easy; and still a game: Very Easy's big clubs win under 9 titles in ten and its small
   clubs average under 2.3 points a game. */
const EASY_BANDS = { easy: { rise: [0.06, 0.20], sackMax: 0.75 }, veryeasy: { rise: [0.14, 0.35], sackMax: 0.5 } };
function outcomesOf(rows) {
  const eng = l => rows.filter(r => r.level === l && r.driver === 'engaged');
  const out = {};
  for (const l of LEVELS) {
    const all = eng(l);
    if (!all.length) continue;
    out[l] = {
      seasons: all.length,
      midPpg: cell(all.filter(r => r.tier === 'mid')).ppg,
      sack: all.filter(r => r.sacked).length / all.length,
      sacks: all.filter(r => r.sacked).length,
      spend: sum(all, r => r.fees) / all.length,
      bigTitles10: cell(all.filter(r => r.tier === 'big')).titles10,
      smallPpg: cell(all.filter(r => r.tier === 'small')).ppg,
    };
  }
  return out;
}
function assertOutcomes(rows) {
  const before = failures;
  const o = outcomesOf(rows);
  if (!o.normal) { fail('section 4 has no Normal rows'); return; }
  const n = o.normal;
  /* Normal against Normal: the even seeds against the odd ones, the spread a level's drop has to clear. */
  const nRows = rows.filter(r => r.level === 'normal' && r.driver === 'engaged' && r.tier === 'mid');
  const even = cell(nRows.filter(r => r.seed % 2 === 0)).ppg, odd = cell(nRows.filter(r => r.seed % 2 === 1)).ppg;
  console.log(`  Normal: mid points per game ${f2(n.midPpg)}, sacked ${n.sacks} of ${n.seasons} seasons (${f2(n.sack)}), spend ${f2(n.spend)}m a season, big club titles ${f2(n.bigTitles10)} in ten`);
  console.log(`  Normal against Normal (even seeds against odd): mid points per game ${f2(even)} and ${f2(odd)}, a gap of ${f2(Math.abs(1 - odd / even) * 100)} percent`);
  for (const l of ['hard', 'legend']) {
    const x = o[l];
    if (!x) continue;
    const n = mediumOn(rows, l);
    const drop = 1 - x.midPpg / n.midPpg;
    const sackRatio = n.sack > 0 ? x.sack / n.sack : (x.sack > 0 ? Infinity : NaN);
    const spendDrop = 1 - x.spend / n.spend;
    console.log(`  ${l}: mid points per game ${f2(x.midPpg)} (down ${f2(drop * 100)} percent), sacked ${x.sacks} of ${x.seasons} (${f2(x.sack)}, ${f2(sackRatio)} times Normal), spend ${f2(x.spend)}m (down ${f2(spendDrop * 100)} percent), big club titles ${f2(x.bigTitles10)} in ten`);
    const [lo, hi] = BANDS[l].drop;
    if (!(drop >= lo && drop <= hi)) fail(`${l}: the mid clubs' points per game fell ${f2(drop * 100)} percent, the band is ${Math.round(lo * 100)} to ${Math.round(hi * 100)}`);
    if (!(sackRatio >= BANDS[l].sack)) fail(`${l}: sacked ${f2(sackRatio)} times as often as Normal, the floor is ${BANDS[l].sack}`);
    if (BANDS[l].spend && !(spendDrop >= BANDS[l].spend)) fail(`${l}: spend per season fell ${f2(spendDrop * 100)} percent, the floor is ${Math.round(BANDS[l].spend * 100)}`);
    if (!(x.bigTitles10 >= BANDS[l].big)) fail(`${l}: a big club won its league ${f2(x.bigTitles10)} seasons in ten, the floor is ${BANDS[l].big}`);
    /* Round 1515: the drop in each seed block on its own, so a band is never met by one block carrying the other. */
    for (const [name, inBlock] of BLOCKS) {
      const br = rows.filter(inBlock), ob = outcomesOf(br);
      /* A block the fleet never played is a red, not a pass: the bands are held over seeds 0 to 31. */
      if (!ob[l]) { blockFails += 1; fail(`${l} has no seasons in ${name}: section 4's bands are held over seeds 0 to 31 (SEEDS=32)`); continue; }
      const d = 1 - ob[l].midPpg / mediumOn(br, l).midPpg;
      if (!(d >= lo && d <= hi)) { blockFails += 1; fail(`${l} in ${name}: the mid clubs' points per game fell ${f2(d * 100)} percent, the band is ${Math.round(lo * 100)} to ${Math.round(hi * 100)} in each block`); }
      else ok(`${l} in ${name}: down ${f2(d * 100)} percent, inside ${Math.round(lo * 100)} to ${Math.round(hi * 100)}`);
    }
  }
  for (const l of ['easy', 'veryeasy']) {
    const x = o[l];
    if (!x) continue;
    const n = mediumOn(rows, l);
    const rise = x.midPpg / n.midPpg - 1;
    const sackRatio = n.sack > 0 ? x.sack / n.sack : NaN;
    const spendRise = x.spend / n.spend - 1;
    console.log(`  ${l}: mid points per game ${f2(x.midPpg)} (up ${f2(rise * 100)} percent), sacked ${x.sacks} of ${x.seasons} (${f2(x.sack)}, ${f2(sackRatio)} times Medium), spend ${f2(x.spend)}m (up ${f2(spendRise * 100)} percent), big club titles ${f2(x.bigTitles10)} in ten, small club points a game ${f2(x.smallPpg)}`);
    const [lo, hi] = EASY_BANDS[l].rise;
    if (!(rise >= lo && rise <= hi)) fail(`${l}: the mid clubs' points per game rose ${f2(rise * 100)} percent, the band is ${Math.round(lo * 100)} to ${Math.round(hi * 100)}`);
    if (!(n.sack > 0)) fail(`${l}: Medium was never sacked, so the sack ratio has nothing to compare with`);
    else if (!(sackRatio <= EASY_BANDS[l].sackMax)) fail(`${l}: sacked ${f2(sackRatio)} times as often as Medium, the ceiling is ${EASY_BANDS[l].sackMax}`);
    if (!(spendRise > 0)) fail(`${l}: spend per season moved ${f2(spendRise * 100)} percent, it must go up`);
  }
  if (o.easy && o.veryeasy && !(o.veryeasy.spend > o.easy.spend)) fail(`veryeasy: spend ${f2(o.veryeasy.spend)}m a season is not above Easy's ${f2(o.easy.spend)}m`);
  if (o.veryeasy && !(o.veryeasy.bigTitles10 < 9)) fail(`veryeasy: a big club won its league ${f2(o.veryeasy.bigTitles10)} seasons in ten, the ceiling is under 9`);
  if (o.veryeasy && !(o.veryeasy.smallPpg < 2.3)) fail(`veryeasy: a small club averages ${f2(o.veryeasy.smallPpg)} points a game, the ceiling is under 2.3`);
  if (failures === before) ok('every level sits inside the bands the lead set');
}
/* A whole fleet in one process loads a fresh engine for every career, and on 2026-10-16 the 432 careers of seeds
   0 to 15 ran a runner out of memory three quarters of the way through (r1501-final, exit 134 after 1,346 s). A
   run with no SHARD therefore plays each level in PARTS shards of its own, PAR at a time, each a child process
   that writes its rows to a file, and folds them here: the same careers (each has its own module and stream, so a
   shard plays it exactly as a whole run would) in processes small enough to finish. */
async function fleetInChildren(levels, seeds, seasons, drivers) {
  const { spawn } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdiff-fleet-'));
  const parts = num('PARTS', 8), par = num('PAR', 3);
  const jobs = levels.flatMap(lv => Array.from({ length: parts }, (_, k) => ({ lv, k })));
  const run = ({ lv, k }) => new Promise(resolve => {
    const out = path.join(dir, `${lv}-${k}.json`);
    const env = { ...process.env, SECTION: '4', LEVELS: lv, SHARD: `${k}/${parts}`, OUT_JSON: out, SEEDS: String(seeds), SEASONS: String(seasons), DRIVERS: drivers.join(',') };
    /* A child is a measurement, never a control run; the alloff control reaches it as a dial edit instead. */
    delete env.CM_DIFF_CONTROL;
    /* Round 1512 review: every level off Medium, the two easy rows included, as the in memory edit does. */
    if (CONTROL === 'alloff') env.DIALS_JSON = JSON.stringify(Object.fromEntries(OFF_MEDIUM.map(l => [l, { ...DIALS.normal }])));
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    child.stdout.on('data', d => { tail = (tail + d).slice(-400); });
    child.stderr.on('data', d => { tail = (tail + d).slice(-400); });
    child.on('close', code => resolve({ lv, k, code, out, tail }));
  });
  const results = [];
  for (let i = 0; i < jobs.length; i += par) results.push(...await Promise.all(jobs.slice(i, i + par).map(run)));
  const rows = [];
  for (const r of results) {
    if (r.code !== 0 || !fs.existsSync(r.out)) { fail(`the ${r.lv} shard ${r.k} of ${parts} ended ${r.code}: ${r.tail.trim().split('\n').pop()}`); continue; }
    rows.push(...JSON.parse(fs.readFileSync(r.out, 'utf8')));
  }
  console.log(`  ${results.length} shards (${parts} a level, ${par} at a time), ${rows.length} seasons`);
  return rows;
}
async function section4() {
  const seeds = num('SEEDS', 32), seasons = num('SEASONS', 6);
  const levels = (process.env.LEVELS || LEVELS.join(',')).split(',');
  const drivers = (process.env.DRIVERS || 'engaged').split(',');
  console.log(`4) outcomes: ${levels.join(', ')}, ${seeds} seeds from ${num('SEED_OFFSET', 0)}, ${seasons} seasons, ${drivers.join(' and ')}, shard ${process.env.SHARD || '0/1'}`);
  const whole = !process.env.SHARD && num('PARTS', 8) > 1;
  const rows = whole ? await fleetInChildren(levels, seeds, seasons, drivers) : runFleet(levels, seeds, seasons, drivers);
  printTable(rows, levels);
  if (process.env.SHARD && process.env.SHARD !== '0/1') { ok('a shard: the bands are the fold\'s (FOLD=<dir of OUT_JSON files>)'); return; }
  assertOutcomes(rows);
}
/** FOLD=<dir>: every OUT_JSON file in it, folded into one table and the bands. Bundles nothing. */
function fold() {
  const files = fs.readdirSync(FOLD).filter(f => f.endsWith('.json'));
  const rows = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(FOLD, f), 'utf8')));
  console.log(`4) outcomes folded from ${files.length} files, ${rows.length} seasons`);
  const levels = LEVELS.filter(l => rows.some(r => r.level === l));
  printTable(rows, levels);
  /* Round 1512: each seed block on its own (seeds 0 to 7 and 8 to 15), printed only, so the header can say
     whether a band is a coin toss over the two blocks. The bands hold on the pooled fleet. */
  for (const [name, inBlock] of BLOCKS) {
    const o = outcomesOf(rows.filter(inBlock));
    if (!o.normal) continue;
    console.log(`  block ${name}: ${Object.entries(o).map(([l, x]) => `${l} mid ${f2(x.midPpg)} (${f2((x.midPpg / o.normal.midPpg - 1) * 100)}%), sacked ${f2(x.sack)} (${f2(x.sack / o.normal.sack)}x), spend ${f2(x.spend)}m, big titles ${f2(x.bigTitles10)}, small ppg ${f2(x.smallPpg)}`).join('; ')}`);
  }
  if (CONTROL === 'foldflat') {
    /* The easy rows replaced by Medium's own seasons under their names: both easy bands must go red. */
    const med = rows.filter(r => r.level === 'normal');
    const flat = [...rows.filter(r => r.level !== 'easy' && r.level !== 'veryeasy'), ...med.map(r => ({ ...r, level: 'easy' })), ...med.map(r => ({ ...r, level: 'veryeasy' }))];
    console.log('NEGATIVE CONTROL ON: Easy and Very Easy folded as copies of Medium\'s seasons');
    assertOutcomes(flat);
    return;
  }
  if (CONTROL === 'foldblock') {
    /* Round 1515: Hard's seasons of seeds 16 to 31 folded as Medium's own, so that block's drop is 0: the per
       block check must go red (whatever the pooled one does). */
    const med2 = rows.filter(r => r.level === 'normal' && r.seed >= 16);
    if (!med2.length || !rows.some(r => r.level === 'hard' && r.seed >= 16)) cannot('foldblock: the fold holds no Hard or Medium seasons of seeds 16 to 31 to swap');
    console.log('NEGATIVE CONTROL ON: Hard\'s seasons of seeds 16 to 31 folded as Medium\'s');
    assertOutcomes([...rows.filter(r => !(r.level === 'hard' && r.seed >= 16)), ...med2.map(r => ({ ...r, level: 'hard' }))]);
    if (!blockFails) { console.log('CONTROL foldblock DID NOT FIRE'); process.exit(3); }
    console.log(`CONTROL foldblock FIRED: ${blockFails} block failures`);
    return;
  }
  if (CONTROL === 'foldhalf') {
    /* Round 1515 fix: Hard played on seeds 0 to 15 only, as the first retune was: the block it never played must
       go red, not pass by being skipped. */
    if (!rows.some(r => r.level === 'hard' && r.seed >= 16)) cannot('foldhalf: the fold holds no Hard seasons of seeds 16 to 31 to leave out');
    console.log('NEGATIVE CONTROL ON: Hard\'s seasons of seeds 16 to 31 left out of the fold');
    assertOutcomes(rows.filter(r => !(r.level === 'hard' && r.seed >= 16)));
    if (!blockFails) { console.log('CONTROL foldhalf DID NOT FIRE'); process.exit(3); }
    console.log(`CONTROL foldhalf FIRED: ${blockFails} block failures`);
    return;
  }
  if (CONTROL === 'foldbig') {
    /* Round 1515: Impossible's big clubs never win the league: its title floor must go red. */
    if (!rows.some(r => r.level === 'legend' && r.tier === 'big' && r.title)) cannot('foldbig: no Impossible big club title in the fold to take away');
    console.log('NEGATIVE CONTROL ON: Impossible\'s big club titles taken away');
    const before = failures;
    assertOutcomes(rows.map(r => (r.level === 'legend' && r.tier === 'big' ? { ...r, title: false } : r)));
    if (failures === before) { console.log('CONTROL foldbig DID NOT FIRE'); process.exit(3); }
    console.log(`CONTROL foldbig FIRED: ${failures - before} failures`);
    return;
  }
  assertOutcomes(rows);
}

/* ---------- 7. the help's worked example is the dial table's ---------- */
/* The example paragraph of the "How hard" block in ClubManagerHelp.tsx (read from the source, comments out)
   names, in order: a league defeat at a Challengers club (tier 3, the one tier whose patience is 1) on its place
   with the press neutral (4.5 times pain,
   rounded the way the engine rounds), a win (4 times gain), a 40m cheque, a man listed at 10m, an opponent
   of 80, and a bad season that would open at 35. Every number in it must be the one the table gives. */
function section7() {
  if (CONTROL === 'helpdrifte') { DIALS.easy.cheque = Math.round((DIALS.easy.cheque + 0.05) * 100) / 100; console.log(`NEGATIVE CONTROL ON: Easy's cheque moved to ${DIALS.easy.cheque} in memory`); }
  if (CONTROL === 'helpdrift') { DIALS.hard.cheque = Math.round((DIALS.hard.cheque + 0.05) * 100) / 100; console.log(`NEGATIVE CONTROL ON: Hard's cheque moved to ${DIALS.hard.cheque} in memory`); }
  console.log('7) the help\'s worked example is the dial table\'s');
  const r1 = x => Math.round(x * 10) / 10;
  const fmt = x => String(Math.abs(r1(x)));
  const want = [];
  /* Round 1512: Hard, Impossible, then Easy and Very Easy, in the order the paragraph names them; the last
     sentence names one opening for both easy rows, so their cuts must be equal. */
  const H = DIALS.hard, L = DIALS.legend, E = DIALS.easy, V = DIALS.veryeasy;
  const four = f => [H, L, E, V].map(d => fmt(f(d)));
  want.push('4.5', ...four(d => -4.5 * d.pain), '4', ...four(d => 4 * d.gain));
  want.push('40', ...four(d => 40 * d.cheque));
  /* Round 1512 closing check: the man is 23 or under (the engine lists him at 1.25 of his value), so on the
     easy rows the floor at what a sale banks (0.9 of a value of 8, 7.2) sits under the marked price. */
  want.push('23', '10', ...four(d => Math.max(0.5, 10 * d.mark)));
  const saleFloor = Math.round((10 / 1.25) * 0.9 * 10) / 10;
  for (const [w, d] of [['Easy', E], ['Very Easy', V]]) if (Math.max(0.5, Math.round(10 * d.mark * 10) / 10) < saleFloor) fail(`the example's man of 23 costs ${fmt(10 * d.mark)}m on ${w}, under the ${saleFloor}m a sale banks, so the market lists him at the floor instead`);
  want.push('80', ...four(d => 80 + d.edge));
  want.push('35', fmt(35 - H.cut), fmt(35 - L.cut), fmt(35 - E.cut));
  if (E.cut !== V.cut) fail(`the example names one opening for Easy and Very Easy, but their cuts are ${E.cut} and ${V.cut}`);
  const src = code(read('src/components/club-manager/ClubManagerHelp.tsx'));
  const at = src.indexOf('data-cm-help="difficulty"');
  let block = at < 0 ? '' : src.slice(at, src.indexOf('</div>', at));
  if (CONTROL === 'helplines') {
    if (!/<\/li>\s*<li>/.test(block)) cannot('helplines: the How hard block has no two lines in a row to fold into one');
    block = block.replace(/<\/li>\s*<li>/, ' ');
    console.log('NEGATIVE CONTROL ON: two levels of the help folded into one line');
  }
  /* Round 1512 closing check (review minor 12, the brief's decision 6): the block names the five levels one
     short line each, easiest first, every line opening with its level's name. */
  const lines = [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => x[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const named = lines.map(l => l.split(':')[0]);
  const words = LEVELS.map(l => LEVEL_WORD[l]);
  if (JSON.stringify(named) !== JSON.stringify(words)) fail(`the help's level lines open ${named.join(', ') || 'with nothing'}; one line a level, easiest first, would be ${words.join(', ')}`);
  else if (lines.some(l => l.length > 160)) fail(`a level line runs to ${Math.max(...lines.map(l => l.length))} characters, not one short line`);
  else ok(`the help gives the five levels one short line each (${lines.map(l => l.length).join(', ')} characters)`);
  const ex = block.split('<p>').find(p => p.includes('Example:')) ?? '';
  const text = ex.replace(/<[^>]+>/g, ' ');
  const got = [...text.matchAll(/\d+(?:\.\d+)?/g)].map(x => x[0]);
  if (!block) fail('ClubManagerHelp.tsx has no "How hard" block');
  else if (JSON.stringify(got) !== JSON.stringify(want)) fail(`the help's example reads ${got.join(', ')}; the table gives ${want.join(', ')}`);
  else ok(`the example's ${got.length} numbers are the table's (${got.join(', ')})`);
  /* 4.5 is a defeat only where patience is 1, which is tier 3, Challengers (a Contenders defeat is 5.2 on Normal). */
  if (!/at a Challengers club/.test(text)) fail('the example does not place its defeat at a Challengers club, the one tier where a defeat costs exactly 4.5');
  else ok('the example places its defeat at a Challengers club, where patience is 1');
  const first = (block.split('<p>')[1] ?? '').replace(/<[^>]+>/g, ' ');
  /* Everything, not only every number: Round 1335's "one bad night usually still leaves you Safe" has no number
     in it and is false at a big club on Hard (review of 2026-10-17), so the block must cover words too and say
     where that one stops holding. */
  /* Round 1512: Normal is called Medium on screen now (its saved id is still 'normal'). */
  if (!/Everything elsewhere on this screen, every number and every promise, is for a Medium career/.test(first) || !/No sacking/.test(first)) fail('the block does not open by saying everything else on the screen is Medium\'s and that No sacking switches off the zero rule');
  else ok('the block opens by saying everything else on the screen, numbers and promises, is Medium\'s, and names No sacking');
  /* Round 1512 closing check: with one line a level, the detail sits in its own paragraph after the lines. */
  const prose = block.split('<p>').filter(p => !p.includes('Example:')).join(' ').replace(/<[^>]+>/g, ' ');
  if (!/one bad night can already take you under Safe/.test(prose)) fail('the block does not say that one bad night in a new job can take you under Safe on Hard and Legend');
  else ok('the block says one bad night in a new job can take you under Safe');
}

/* ---------- 8. changing the level between matches ---------- */
/* Decisions 4 and 5 of Round 1512's brief. Careers set up on Medium at three clubs (a mid, a small and a big
   one), six entries in, changed to each of the other four levels with setDifficulty: (a) the whole state apart
   from startOptions is byte equal, and inside startOptions only the level and the easy mark move; (b) the level
   reads as set, and a save writes it and a load reads it back; (c) the next match reads the new edge (the next
   match card and oppStrengthVsMe), where the unchanged career reads none; (d) going easy stores this season
   and stops the score, going back up through Impossible to Medium keeps that mark, and a career that only
   went harder still posts and ends on the block it started with; (e) the same level, an id that is not one
   of the five and a match paused at halftime are refused, and a sacked career can change. Then (f) season
   ends on Medium, changed to each level, roll into a summer cheque of Medium's times the new dial. */
function section8() {
  if (CONTROL === 'midleak') console.log('NEGATIVE CONTROL ON: a change of level also moves the board\'s mood');
  if (CONTROL === 'easyclear') console.log('NEGATIVE CONTROL ON: going back up clears the leaderboard mark');
  console.log('8) changing the level between matches');
  const isEasy = lv => lv === 'easy' || lv === 'veryeasy';
  const without = (o, keys) => { const x = { ...o }; for (const k of keys) delete x[k]; return x; };
  const clubs = fleetClubs();
  let n = 0;
  const good = { a: 0, b: 0, c: 0, d: 0, e: 0 };
  for (const [i, club] of [clubs[1], clubs[5], clubs[6]].entries()) {
    const m = fresh(HEAD);
    const D = m.dif.CM_DIFFICULTY_DIALS;
    const s = withStream(21000 + i, () => {
      let x = setUp(m, m.cm.startCareer(club.name), { level: 'normal' });
      for (let g = 0; g < 6; g += 1) { const res = m.cm.playNextEntry(x, { skipHalftime: true }); x = res.state; if (res.kind === 'seasonOver' || x.sacked) break; }
      return x;
    });
    if (s.sacked || m.st.levelFrom(s) !== 'normal') { fail(`8 ${club.name}: the Medium career is ${s.sacked ? 'sacked' : m.st.levelFrom(s)} six entries in`); continue; }
    const seasonNo = Number.isInteger(s.season) && s.season > 0 ? s.season : 1;
    const before = JSON.stringify(s);
    const rest = JSON.stringify(without(s, ['startOptions']));
    const block = JSON.stringify(without(m.st.startOptionsOf(s), ['difficulty', 'easySince']));
    const fx = m.cm.nextFixtureFrom(s, s.week);
    for (const lv of OFF_MEDIUM) {
      n += 1;
      const t = m.st.setDifficulty(s, lv);
      const tag = `${club.name} Medium to ${LEVEL_WORD[lv]}`;
      if (JSON.stringify(s) !== before) { fail(`8a ${tag}: setDifficulty changed the state it was handed`); continue; }
      if (!t) { fail(`8a ${tag}: refused between matches`); continue; }
      const tRest = JSON.stringify(without(t, ['startOptions']));
      if (tRest !== rest) fail(`8a ${tag}: the state moved outside startOptions, first at key ${firstDiff(tRest, rest)}`);
      else if (JSON.stringify(without(t.startOptions, ['difficulty', 'easySince'])) !== block) fail(`8a ${tag}: startOptions moved beyond the level and the mark`);
      else good.a += 1;
      m.cm.saveCareer(t);
      const back = m.cm.loadCareer();
      if (m.st.levelFrom(t) !== lv || !back || m.st.levelFrom(back) !== lv || m.st.easyFrom(back) !== m.st.easyFrom(t)) fail(`8b ${tag}: reads ${m.st.levelFrom(t)}, and after a save and a load ${back ? m.st.levelFrom(back) : 'nothing'}`);
      else good.b += 1;
      if (!fx?.opponent) fail(`8c ${tag}: no next fixture to read`);
      else {
        const plain = m.cm.strengthOf(s, fx.opponent), want = plain + D[lv].edge;
        const after = m.cm.nextFixtureFrom(t, t.week);
        if (!close(m.cm.oppStrengthVsMe(s, fx.opponent), plain, 1e-9)) fail(`8c ${tag}: the Medium career reads ${fx.opponent} off its plain strength`);
        else if (!close(m.cm.oppStrengthVsMe(t, fx.opponent), want, 1e-9) || after?.oppStrength !== Math.round(want)) fail(`8c ${tag}: the next match reads ${m.cm.oppStrengthVsMe(t, fx.opponent)} (card ${after?.oppStrength}), the new dial says ${want}`);
        else good.c += 1;
      }
      if (isEasy(lv)) {
        const up = m.st.setDifficulty(t, 'legend');
        const home = up && m.st.setDifficulty(up, 'normal');
        const marked = x => !!x && m.st.easyFrom(x) === seasonNo && !m.st.postsScore(x);
        if (!marked(t)) fail(`8d ${tag}: the mark is ${m.st.easyFrom(t)} (season ${seasonNo}) and the score ${m.st.postsScore(t) ? 'still posts' : 'stops'}`);
        else if (!marked(up) || !marked(home) || 'difficulty' in home.startOptions) fail(`8d ${tag}: going back up to Impossible and then Medium cleared the mark or the score came back`);
        else good.d += 1;
      } else {
        const next = lv === 'hard' ? m.st.setDifficulty(t, 'legend') : m.st.setDifficulty(t, 'hard');
        const home = next && m.st.setDifficulty(next, 'normal');
        if (m.st.easyFrom(t) !== null || ![t, next, home].every(x => x && m.st.postsScore(x)) || JSON.stringify(home.startOptions) !== JSON.stringify(m.st.startOptionsOf(s))) fail(`8d ${tag}: a career that only went harder lost its score or did not end on its own block`);
        else good.d += 1;
      }
    }
    const refused = [m.st.setDifficulty(s, 'normal'), m.st.setDifficulty(s, 'medium'), m.st.setDifficulty({ ...s, live: { paused: true } }, 'hard')];
    const sackedMove = m.st.setDifficulty({ ...s, sacked: true }, 'easy');
    if (refused.some(x => x !== null)) fail(`8e ${club.name}: setDifficulty took ${refused.map(x => (x === null ? 'null' : 'a state')).join(', ')} for the same level, a junk id and a match at halftime`);
    else if (!sackedMove || m.st.levelFrom(sackedMove) !== 'easy') fail(`8e ${club.name}: a sacked career cannot change its level`);
    else good.e += 1;
  }
  if (n < 12) fail(`8: only ${n} changes made, 12 are expected`);
  else if (good.a === n && good.b === n && good.c === n && good.d === n && good.e === 3) ok(`8a to 8e: ${n} changes mid season at three clubs: nothing but the level and the mark moved, each saved and loaded back, the next match read the new edge, the leaderboard mark one way, and the refusals held`);
  /* (f) The next summer cheque. Season ends on Medium (the steady driver), each changed to a level and rolled
     on a module of that level's own, against the Medium roll from the same stream (section 3's M1 method). */
  const mn = fresh(HEAD);
  const ends = [];
  for (const [i, club] of clubs.entries()) {
    if (club.tier === 'big' || ends.length >= 4) continue;
    const e = seasonEnd(mn, club.name, 22000 + i);
    if (e) ends.push({ club: club.name, s: { ...e, budget: 0 }, seed: 23000 + i });
  }
  let f = 0, fn = 0;
  for (const lv of OFF_MEDIUM) {
    const mm = fresh(HEAD);
    const dial = mm.dif.CM_DIFFICULTY_DIALS[lv].cheque;
    for (const e of ends) {
      fn += 1;
      const a = rollOn(mn, e.s, e.seed);
      const t = mm.st.setDifficulty(e.s, lv);
      const b = t && rollOn(mm, t, e.seed);
      const want = Math.round(a.budget * dial * 10) / 10;
      if (!b || !close(b.budget, want, 0.11)) fail(`8f ${e.club} to ${LEVEL_WORD[lv]}: the summer cheque is ${b?.budget}, Medium's ${a.budget} times ${dial} is ${want}`);
      else f += 1;
    }
  }
  if (ends.length < 3) fail(`8f: only ${ends.length} season ends rolled, 3 are the floor`);
  else if (f === fn) ok(`8f: ${fn} summer cheques after a change at the season's end (${ends.length} clubs, four levels) are Medium's times the new dial`);
}

/* ---------- run ---------- */
const RUN = {
  0: section0, 1: section1, 2: section2, 4: section4, 6: section6, 7: section7, 8: section8,
  3: () => { for (const lv of LEVER_LEVELS) { LV = lv; LVN = LEVEL_WORD[lv]; section3(); section3money(); } },
};
if (FOLD) { fold(); console.log(failures ? `simCmDifficulty: ${failures} FAILURES (fold)` : 'simCmDifficulty: all green (fold)'); process.exit(failures ? 1 : 0); }
for (const s of SECTIONS) {
  if (!RUN[s]) { console.log(`SECTION=${s} is not a section of this harness; could not run`); process.exit(2); }
  await RUN[s]();
}
if (CONTROL) console.log(failures ? `CONTROL ${CONTROL} FIRED: ${failures} failures` : `CONTROL ${CONTROL} DID NOT FIRE`);
console.log(failures ? `simCmDifficulty: ${failures} FAILURES (sections ${SECTIONS.join(',')})` : `simCmDifficulty: all green (sections ${SECTIONS.join(',')})`);
process.exit(failures ? 1 : (CONTROL ? 3 : 0));
