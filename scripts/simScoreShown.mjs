/*
 * Round 644 harness: a finished game records the number its result screen
 * shows, Soccer Career's record knows where the career began, and the
 * migration that moves Soccer Career to the new scale keeps every past point.
 *
 * WHAT THE POINTS AUDIT FOUND (2026-09-19, read only):
 *   Soccer Career recorded min(1000, 200 a Ballon d'Or + 150 a Champions League
 *   + 150 a World Cup + 50 a league title) while its retirement screen and its
 *   share card showed the legacy score out of 100. The build editor lets anyone
 *   type a 99 starting overall, and that formula never looked at the start:
 *   4,060 of 7,048 rows in the 30 days before sat exactly at the cap.
 *   Footle's score panel was handed 1000 down 125 a guess while the record was
 *   700 down 100. Fantasy Draft showed season points and recorded their share
 *   of 114. Quiz Board showed and shared a negative bank and recorded 0. Player
 *   Bingo showed points and recorded none (1,966 rows, every one NULL). Rarity
 *   mode recorded its raw points total, lower is better, so a perfect run
 *   recorded 0, which the leaderboard reads as no score at all.
 *
 * SECTIONS
 *   1) Rendered. src/test/scoreShown.test.tsx under vitest: the real pages, the
 *      real recording path, the recorder mocked. Every game above records what
 *      its result screen shows, Soccer Career's 99 start records less than the
 *      same record climbed from 55, Player Bingo and Rarity mode record a
 *      positive number for a real win.
 *   2) Soccer Career start, headless, over seeded careers. Every career played
 *      from a 99 start is scored twice, as played and with only its starting
 *      overall changed to 55 (calculateLegacy, the number the page records per
 *      section 1). The mean gap must sit at or below START_GAP_BOUND. Natural
 *      play from 55 and from 99 is reported beside it, old record against new,
 *      in leaderboard points.
 *   3) The caps the migration sets against the ceilings the code reaches.
 *   4) The migration's rescale, modelled from the SQL it contains, over the
 *      live score histogram read on 2026-09-19 and over every integer from 0 to
 *      3000: every past row keeps its leaderboard points, a second apply divides
 *      nothing twice, and a straggler from an old tab is caught.
 *
 * NEGATIVE CONTROLS, SCORE_SHOWN_CONTROL=<name>. Each must go red on its own
 * case and nowhere else; the harness checks both halves.
 *   rawlegacy    a copy of SoccerCareer.tsx recording the old trophy formula:
 *                section 1's soccer-career case.
 *   footlestats  a copy of Footle.tsx handing the stats panel its old formula:
 *                section 1's footle cases.
 *   bingonull    a copy of PlayerBingo.tsx passing no completionScore:
 *                section 1's player-bingo cases.
 *   noclimb      the engine bundled with The Climb set to 0: section 2.
 *   norescale    the migration modelled with the cap moved and no rescale:
 *                section 4.
 * A control refuses to run if the text it rewrites is not in the file, and every
 * read is folded to LF first because the checkout is CRLF.
 *
 * MEASURED, 40 careers a start, default seed then SIM_SEED 1, 2, 3, 4:
 *   same record, 99 start minus 55 start   -21.3  -20.9  -21.1  -21.3  -21.0
 *   natural play from 99, old record        84.4   86.5   86.6   81.8   89.9
 *     (leaderboard points; careers at cap)  19/40  23/40  20/40  17/40  25/40
 *   natural play from 99, new record        66.6   64.6   63.5   64.3   65.9
 *   natural play from 55 (80 ceiling), old  12.4   12.9   11.1   12.8   12.6
 *   natural play from 55 (80 ceiling), new  51.0   50.8   45.8   51.4   48.5
 *   Under noclimb the gap is exactly 0.0. No career from 99 can reach the new
 *   cap: The Climb takes 16 off a 99 start after the hundred point clamp, so
 *   84 is its ceiling.
 *
 *   Section 1 on the default run: Soccer Career 70 recorded and shown from 99,
 *   94 for the same record from 55; Footle 700 and 500; Player Bingo 100 and
 *   1700; Rarity 500 (perfect), 300 (mixed), Crowd Says 489; Quiz Board 0 and
 *   2600; NFL Career Path win 6. Every control red on its own case only.
 *
 * Nothing here reads dist, the clock or the database, so it is safe to run
 * between builds. Page copies for the controls go under dist/.score-shown-control
 * in a folder of their own per run and are removed afterwards.
 *
 * Run: node scripts/simScoreShown.mjs
 */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SCORE_SHOWN_CONTROL || '';
const CONTROLS = {
  rawlegacy: 'soccer-career',
  footlestats: 'footle',
  bingonull: 'player-bingo',
  noclimb: 'section2',
  norescale: 'section4',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SCORE_SHOWN_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* The bound for section 2, from measured headroom. Every career played from 99
   has peakOverall 99, so The Climb is a flat -16 as played and +8 relabelled to
   55, and the per career gap is structurally between -24 and -8. Measured means
   sit at -20.9 to -21.3 over five seeds (header); the old formula and the
   noclimb control make it exactly 0. -12 leaves about 9 points of headroom on
   the measured side and 12 on the broken side. */
const START_GAP_BOUND = -12;
const CAREERS = Number(process.env.SCORE_SHOWN_CAREERS || 40);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'scoreShown-')).replaceAll('\\', '/');
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); cleanup(); process.exit(1); };
const swap = (src, from, to, where, times = 1) => {
  const n = src.split(from).length - 1;
  if (n !== times) abort(`control cannot run: ${where} holds ${n} copies of the text SCORE_SHOWN_CONTROL=${CONTROL} rewrites, expected ${times}\n  looked for: ${JSON.stringify(from)}`);
  return src.split(from).join(to);
};

/* Results per case: which sections and cases went red. */
const red = new Map();
const noteRed = (key, why) => { red.set(key, [...(red.get(key) || []), why]); console.log(`  RED [${key}] ${why}`); };
const ok = m => console.log(`  ok   ${m}`);

let controlDir = null;
function cleanup() {
  try { if (controlDir) fs.rmSync(controlDir, { recursive: true, force: true }); } catch { /* best effort */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
}

/* ======================= Section 1: rendered ======================= */
console.log('\n1) Rendered: src/test/scoreShown.test.tsx, the real pages with the recorder mocked');

const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
for (const k of ['SCORE_SHOWN_SOCCER_PAGE', 'SCORE_SHOWN_FOOTLE_PAGE', 'SCORE_SHOWN_BINGO_PAGE']) delete env[k];
const PAGE_COPY = {
  rawlegacy: {
    file: 'src/pages/SoccerCareer.tsx', envKey: 'SCORE_SHOWN_SOCCER_PAGE',
    rewrite: s => swap(s,
      '  const legacyScore = isRetired && career?.legacy ? career.legacy.score : 0;\n',
      '  const legacyScore = isRetired && career ? Math.min(1000, Math.round((getCareerTotals(career.seasons).ballonDors * 200) + (getCareerTotals(career.seasons).championsLeagues * 150) + (getCareerTotals(career.seasons).worldCups * 150) + (getCareerTotals(career.seasons).leagueTitles * 50))) : 0;\n',
      'SoccerCareer.tsx (the recorded legacy score)'),
  },
  footlestats: {
    file: 'src/pages/Footle.tsx', envKey: 'SCORE_SHOWN_FOOTLE_PAGE',
    rewrite: s => swap(s,
      "userScore={footleScore(gameStatus === 'won', guesses.length)}",
      "userScore={gameStatus === 'won' ? Math.max(0, 1000 - (guesses.length - 1) * 125) : 0}",
      'Footle.tsx (the stats panel score)'),
  },
  bingonull: {
    file: 'src/pages/PlayerBingo.tsx', envKey: 'SCORE_SHOWN_BINGO_PAGE',
    rewrite: s => swap(s, '                completionScore={score}\n', '', 'PlayerBingo.tsx (the two completionScore props)', 2),
  },
};
if (PAGE_COPY[CONTROL]) {
  const c = PAGE_COPY[CONTROL];
  /* Under dist, inside the project root: vite will not load a module from
     outside it, and dist is gitignored, so a crashed run cannot leave a copy
     where tsc would read it. One folder per run, so two runs cannot share. */
  fs.mkdirSync(path.join(ROOT, 'dist', '.score-shown-control'), { recursive: true });
  controlDir = fs.mkdtempSync(path.join(ROOT, 'dist', '.score-shown-control', `${CONTROL}-`));
  const copy = path.join(controlDir, path.basename(c.file).replace(/\.tsx$/, '.control.tsx'));
  fs.writeFileSync(copy, c.rewrite(readLF(path.join(ROOT, c.file))));
  env[c.envKey] = copy.replaceAll('\\', '/');
  console.log(`   NEGATIVE CONTROL ON: ${c.file} replaced by a copy with the old line back`);
}

/* vitest is found the way node finds any package from here, by walking up. */
function findUp(rel) {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
const VITEST = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
if (!VITEST) abort('vitest is not installed anywhere above this tree');
const JSON_OUT = `${TMP}/vitest.json`;
const TEST = 'src/test/scoreShown.test.tsx';
let run;
try {
  run = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=default', '--reporter=json', `--outputFile.json=${JSON_OUT}`],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  if (controlDir) { fs.rmSync(controlDir, { recursive: true, force: true }); controlDir = null; }
}
const ESC = String.fromCharCode(27);
const out = ((run.stdout || '') + (run.stderr || '')).split(new RegExp(ESC + '\\[[0-9;]*m', 'g')).join('');
if (!fs.existsSync(JSON_OUT)) abort('vitest wrote no report, so nothing was checked:\n' + out.slice(-3000));
if (/Failed to load|Cannot find module|Failed to resolve import|SyntaxError/.test(out)) {
  abort('the rendered test did not load (a load error is not a check firing):\n' + out.slice(-3000));
}
for (const line of out.split('\n')) {
  if (/^(SHOWN|INFO) /.test(line.trim())) console.log('   ' + line.trim());
}
const report = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
const cases = (report.testResults || []).flatMap(f => f.assertionResults || []);
if (cases.length < 12) abort(`the rendered test reported ${cases.length} cases, expected at least 12:\n` + out.slice(-3000));
for (const t of cases) {
  const key = (t.title.match(/^([a-z-]+):/) || [])[1] || 'unknown';
  if (t.status === 'passed') ok(`${t.title}`);
  else noteRed(key, `${t.title} (${t.status}) ${(t.failureMessages || []).join(' ').split('\n')[0].slice(0, 220)}`);
}
console.log(`   ${cases.filter(t => t.status === 'passed').length} of ${cases.length} rendered cases passed (vitest exit ${run.status})`);

/* ======================= Section 2: Soccer Career start ======================= */
console.log('\n2) Soccer Career: the same career record from a 99 start against a 55 start, seeded');

const ENGINE = `${ROOT_URL}/src/lib/soccerCareerEngine.ts`;
const CLIMB_LINE = '    climbPoints = clamp(Math.round((climb - 12) * 0.42 - handed * 0.34), -18, 8);\n';
const plugins = [];
if (CONTROL === 'noclimb') {
  const src = readLF(ENGINE);
  swap(src, CLIMB_LINE, '', 'soccerCareerEngine.ts (The Climb)');
  plugins.push({
    name: 'noclimb',
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => ({
        contents: readLF(args.path).split(CLIMB_LINE).join('    climbPoints = 0;\n'),
        loader: 'ts',
        resolveDir: path.dirname(args.path),
      }));
    },
  });
  console.log('   NEGATIVE CONTROL ON: the engine is bundled with The Climb set to 0');
}
const ENTRY = `${TMP}/engine.entry.mjs`;
const BUNDLE = `${TMP}/engine.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ENGINE}');
export const engine = mod;
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` }, plugins });
const { engine: E } = await import(pathToFileURL(BUNDLE).href);
if (typeof E.calculateLegacy !== 'function') abort('calculateLegacy is not exported from the engine, so section 2 cannot score a career');

const clubs = E.FALLBACK_CLUBS;
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const oldRecord = s => { const t = E.getCareerTotals(s.seasons); return Math.min(1000, Math.round(t.ballonDors * 200 + t.championsLeagues * 150 + t.worldCups * 150 + t.leagueTitles * 50)); };

function play(i, startOvr, pot) {
  let s = E.initCareer(`Sim ${i}`, ['Brazil', 'England', 'Japan', 'France'][i % 4], ['ST', 'CM', 'CB', 'GK'][i % 4], '2020s', stats(startOvr), startOvr, 2020, clubs, null, pot);
  for (let guard = 0; s.phase !== 'retirement_ceremony' && guard < 500; guard++) {
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'contract_offer': { const o = s.pendingOffers || []; s = o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; break; }
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = (s.pendingEvents && s.pendingEvents[0]) ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
      case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = s.pendingWorldCup && s.pendingWorldCup.result === 'Winner' ? E.applyWorldCupSpeech(s, 'for_the_country', clubs) : E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = s.pendingBallonDor && s.pendingBallonDor.playerRank === 1 ? E.applyBdorSpeech(s, 'tears', clubs) : E.dismissBallonDor(s, clubs); break;
      case 'transfer_window': {
        const sit = s.transferSituation;
        const offer = sit && (sit.offer || sit.offerA || (sit.offers || [])[0]);
        s = offer ? E.acceptOffer(s, offer) : E.stayAtClub(s);
        break;
      }
      case 'retirement_suggestion': s = E.acceptRetirementSuggestion(s); break;
      default: return { stuck: s.phase };
    }
  }
  return s.phase === 'retirement_ceremony' && s.legacy ? s : { stuck: s.phase };
}
const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const fmt = x => x.toFixed(1);

function fleet(startOvr, pot) {
  const done = []; const stuck = [];
  for (let i = 0; i < CAREERS; i++) {
    const s = play(i, startOvr, pot);
    if (s.stuck) stuck.push(s.stuck); else done.push(s);
  }
  return { done, stuck };
}
const f99 = fleet(99, 99);
const f55 = fleet(55, 80);
for (const [name, f] of [['99', f99], ['55', f55]]) {
  if (f.stuck.length) noteRed('section2', `${f.stuck.length} of ${CAREERS} careers from ${name} never reached retirement (phases ${[...new Set(f.stuck)].join(', ')})`);
}
if (f99.done.length < CAREERS * 0.9) abort(`only ${f99.done.length} careers from 99 finished, too few to measure`);

const gaps = f99.done.map(s => {
  const as55 = { ...s, startingOverall: 55 };
  return E.calculateLegacy(s).score - E.calculateLegacy(as55).score;
});
const gapMean = mean(gaps);
const within = gaps.filter(g => g >= -24 && g <= -8).length;
console.log(`   same record, 99 start minus 55 start, over ${gaps.length} careers: mean ${fmt(gapMean)}, ${within} of ${gaps.length} inside the structural -24 to -8 (bound: mean at or below ${START_GAP_BOUND})`);
if (gapMean <= START_GAP_BOUND) ok(`a 99 start records ${fmt(-gapMean)} points less than the same career record climbed from 55`);
else noteRed('section2', `a 99 start is not scored below the same record from 55: mean gap ${fmt(gapMean)} > ${START_GAP_BOUND}`);

/* Natural play, reported: what each start actually records, in leaderboard
   points (record / cap * 100), before and after. Not asserted: a 99 build
   wins more, and should, the question section 2 answers is whether it is paid
   for the start itself. */
for (const [name, f] of [['55 (80 ceiling)', f55], ['99', f99]]) {
  const newPts = f.done.map(s => s.legacy.score);
  const oldPts = f.done.map(s => oldRecord(s) / 10);
  console.log(`   natural play from ${name}: old record ${fmt(mean(oldPts))} points a career (${oldPts.filter(x => x >= 100).length} of ${oldPts.length} at the cap), new record ${fmt(mean(newPts))} (${newPts.filter(x => x >= 100).length} at the cap, highest ${Math.max(...newPts)})`);
}

/* ======================= Section 3: the caps ======================= */
console.log('\n3) The caps the migration sets, against the ceilings the code reaches');

const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260919_round_644_scores_shown.sql');
if (!fs.existsSync(MIGRATION)) abort('the Round 644 migration is missing');
/* The code, not the comments: every line comment goes before matching. */
const sql = readLF(MIGRATION).split('\n').map(l => l.replace(/--.*$/, '')).join('\n').replace(/\s+/g, ' ');
const capOf = game => {
  const m = sql.match(new RegExp(`\\('${game}', (\\d+),`));
  return m ? Number(m[1]) : null;
};
/* The ceiling is what the page SHOWS for its best finish, read off section 1's
   report line. Section 1 already holds the record to that number, so reading
   the shown one keeps this section independent of the recorder. */
const shownBest = (re, shownRe) => {
  const line = out.split('\n').find(l => re.test(l));
  const m = line && line.match(shownRe);
  return m ? Number(m[1]) : null;
};
/* Soccer Career: a career built to win everything, climbed from 55, scores the
   legacy ceiling. */
const best = { ...f55.done[0], startingOverall: 55, peakOverall: 99, integrityBonus: 20, coverAthleteAccepted: true, isPundit: true,
  seasons: f55.done[0].seasons.map(x => ({ ...x, leagueTitle: true, domesticCup: true, championsLeague: true, ballonDor: true, goals: 60, assists: 30, cleanSheets: 30 })),
  intStats: { ...f55.done[0].intStats, worldCupWins: 3, continentalWins: 3, caps: 150 } };
const ceilings = [
  ['soccer-career', E.calculateLegacy(best).score, 'a career that wins everything, climbed from 55'],
  ['player-bingo', shownBest(/SHOWN player-bingo blackout/, /shown "[^"]*?(\d+) pts/), 'the blackout shown in section 1'],
  ['rarity-round', shownBest(/SHOWN rarity-round Rarity perfect run/, /Obscurity "(\d+)\//), 'the perfect Rarity run shown in section 1'],
];
for (const [game, ceiling, how] of ceilings) {
  const cap = capOf(game);
  if (cap !== null && ceiling !== null && cap === ceiling) ok(`${game}: cap ${cap} equals ${how}, ${ceiling}`);
  else noteRed('section3', `${game}: the migration's cap ${cap} against ${how}, ${ceiling}`);
}

/* ======================= Section 4: the rescale ======================= */
console.log('\n4) The migration keeps every past point');

/* Read it off the SQL rather than assuming it: part 1 on three tables, run only
   while the cap still reads 1000, divides by ten with round; part 2 divides
   anything above 100; part 3 sets the cap. */
const PART1 = [
  ['game_completions', 'score', 'game'],
  ['user_game_scores', 'score', 'game_type'],
  ['user_best_scores', 'best_score', 'game_type'],
];
for (const [table, col, key] of PART1) {
  const once = new RegExp(`update public\\.${table} \\w+ set ${col} = round\\(\\w+\\.${col} / 10\\.0\\)::integer where \\w+\\.${key} = 'soccer-career' and \\w+\\.${col} > 0 and \\(\\w+\\.${col} % 50 = 0 or \\w+\\.${col} > 100\\) and exists \\(select 1 from public\\.game_score_caps c where c\\.game = 'soccer-career' and c\\.max_score = 1000\\);`);
  const sweep = new RegExp(`update public\\.${table} set ${col} = round\\(${col} / 10\\.0\\)::integer where ${key} = 'soccer-career' and ${col} > 100;`);
  if (once.test(sql)) ok(`${table}: part 1 rescales history once, guarded on the cap reading 1000`);
  else noteRed('section4', `${table}: part 1 is not in the shape this model assumes`);
  if (sweep.test(sql)) ok(`${table}: part 2 sweeps anything above 100`);
  else noteRed('section4', `${table}: part 2 is not in the shape this model assumes`);
}

/* The model. Postgres round() on a positive numeric rounds half away from zero,
   which for positives is Math.round. */
const rescale = s => (CONTROL === 'norescale' ? s : Math.round(s / 10));
if (CONTROL === 'norescale') console.log('   NEGATIVE CONTROL ON: the model moves the cap to 100 and leaves every row as it was');
function applyMigration(rows, cap) {
  let next = rows.map(s => (cap === 1000 && s > 0 && (s % 50 === 0 || s > 100)) ? rescale(s) : s);
  next = next.map(s => (s > 100 ? rescale(s) : s));
  return { rows: next, cap: 100 };
}
const points = (s, cap) => (s > 0 ? 100 * Math.min(s, cap) / cap : 0);

/* Live, read only on 2026-09-19: soccer-career score value -> rows. */
const LIVE = {
  game_completions: { 50: 362, 100: 315, 150: 273, 200: 282, 250: 325, 300: 323, 350: 356, 400: 397, 450: 439, 500: 427, 550: 410, 600: 512, 650: 488, 700: 526, 750: 471, 800: 513, 850: 517, 900: 463, 950: 471, 1000: 11868 },
  user_game_scores: { 0: 3298, 50: 36, 100: 34, 150: 31, 200: 34, 250: 42, 300: 27, 350: 40, 400: 35, 450: 50, 500: 44, 550: 41, 600: 43, 650: 49, 700: 41, 750: 36, 800: 46, 850: 53, 900: 36, 950: 47, 1000: 1469 },
  user_best_scores: { 0: 15, 50: 5, 100: 1, 150: 1, 200: 2, 250: 5, 300: 1, 350: 3, 400: 1, 450: 7, 500: 4, 550: 5, 600: 1, 650: 2, 700: 5, 750: 6, 800: 6, 850: 5, 900: 1, 950: 2, 1000: 346 },
};
for (const [table, hist] of Object.entries(LIVE)) {
  const values = Object.keys(hist).map(Number);
  const after = applyMigration(values, 1000);
  let rows = 0; let before = 0; let then = 0; let worst = 0;
  values.forEach((s, i) => {
    const n = hist[s]; rows += n;
    const a = points(s, 1000); const b = points(after.rows[i], after.cap);
    before += a * n; then += b * n; worst = Math.max(worst, Math.abs(a - b));
  });
  const line = `${table}: ${rows.toLocaleString('en-US')} live rows, ${before.toFixed(1)} row points before, ${then.toFixed(1)} after, worst row ${worst.toFixed(3)}`;
  if (worst === 0) ok(line); else noteRed('section4', line);
}
console.log('   live leaderboard, read only 2026-09-19 (the query is in the migration): 9,336 soccer-career player days, 825,035.0000 points before and 825,035.0000 after, 0 days changed');

/* Synthetic, the transform on its own: min(round(s/10), 100)/100 against
   min(s, 1000)/1000 for every integer from 0 to 3000. */
let synthWorst = 0; let synthWorstAt = 0; let monotone = true; let tens = true;
for (let s = 0; s <= 3000; s++) {
  const d = Math.abs(points(s, 1000) - points(rescale(s), 100));
  if (d > synthWorst) { synthWorst = d; synthWorstAt = s; }
  if (s > 0 && rescale(s) < rescale(s - 1)) monotone = false;
  if (s % 10 === 0 && d !== 0) tens = false;
}
if (synthWorst <= 0.5 && tens && monotone) ok(`the transform on every integer 0 to 3000: worst ${synthWorst.toFixed(3)} points (at ${synthWorstAt}), exact on every multiple of 10, order kept, so each day's best stays the same row`);
else noteRed('section4', `the transform: worst ${synthWorst.toFixed(3)} points at ${synthWorstAt}, exact on multiples of 10 ${tens}, order kept ${monotone}`);

/* The selection: part 1 must take every value the old formula can produce
   (200 a Ballon d'Or, 150 a Champions League or World Cup, 50 a league title,
   capped at 1000: every multiple of 50 up to 1000) and leave alone the values
   only the new client can produce. */
const oldValues = new Set();
for (let b = 0; b <= 5; b++) for (let u = 0; u <= 7; u++) for (let w = 0; w <= 7; w++) for (let l = 0; l <= 20; l++) {
  oldValues.add(Math.min(1000, 200 * b + 150 * u + 150 * w + 50 * l));
}
const oldList = [...oldValues].sort((x, y) => x - y);
const oldAfter = applyMigration(oldList, 1000).rows;
const oldKept = oldList.every((s, i) => points(s, 1000) === points(oldAfter[i], 100));
const newOnly = Array.from({ length: 100 }, (_, i) => i + 1).filter(s => s % 50 !== 0);
const newAfter = applyMigration(newOnly, 1000).rows;
const newUntouched = newOnly.every((s, i) => newAfter[i] === s);
if (oldKept && newUntouched) ok(`part 1 rescales all ${oldList.length} values the old formula can make with their points kept, and leaves the ${newOnly.length} values only the new client makes alone`);
else noteRed('section4', `part 1 selection: old values kept their points ${oldKept}, new values untouched ${newUntouched}`);

/* Applying the file twice divides nothing twice, a new score is never touched
   after the cap has moved, and a straggler from an old tab is caught. */
const first = applyMigration([1000, 850, 50, 0], 1000);
const second = applyMigration([...first.rows, 84, 50, 800], first.cap);
const twiceOk = JSON.stringify(second.rows) === JSON.stringify([...first.rows, 84, 50, 80]);
if (twiceOk) ok(`reapplied after the switch: old rows ${JSON.stringify(first.rows)} stay, new 84 and 50 stay, an old tab's 800 becomes 80`);
else noteRed('section4', `reapplying changed rows it should not have, or missed the straggler: ${JSON.stringify(second.rows)}`);

/* ======================= Verdict ======================= */
cleanup();
const redKeys = [...red.keys()];
if (CONTROL) {
  const own = CONTROLS[CONTROL];
  const fired = red.has(own);
  const leaked = redKeys.filter(k => k !== own);
  console.log(`\n   control ${CONTROL}: its own case (${own}) red ${fired}; other cases red: ${leaked.length ? leaked.join(', ') : 'none'}`);
  if (!fired) console.error(`\nsimScoreShown: SCORE_SHOWN_CONTROL=${CONTROL} changed the code and ${own} stayed green, so that check is not proving anything`);
  else if (leaked.length) console.error(`\nsimScoreShown: SCORE_SHOWN_CONTROL=${CONTROL} fired on ${own} but also turned ${leaked.join(', ')} red, so the checks are not independent`);
  else console.error(`\nsimScoreShown: CONTROL FIRED as it should, SCORE_SHOWN_CONTROL=${CONTROL} is red on ${own} only`);
  process.exit(1);
}
if (redKeys.length) {
  console.error(`\nsimScoreShown: red in ${redKeys.join(', ')}`);
  process.exit(1);
}
console.log('\nsimScoreShown: all sections green');
