/*
 * Round 644 harness: a finished game records the number its result screen
 * shows, Soccer Career's record knows where the career began and pays nothing
 * for a studio or boardroom tail that no football earned, and the migration
 * that moves Soccer Career to the new scale keeps every past point.
 *
 * WHAT THE POINTS AUDIT FOUND (2026-09-19, read only):
 *   Soccer Career recorded min(1000, 200 a Ballon d'Or + 150 a Champions League
 *   + 150 a World Cup + 50 a league title) while its retirement screen and its
 *   share card showed the legacy score out of 100. The build editor lets anyone
 *   type a 99 starting overall, and that formula never looked at the start:
 *   4,060 of 7,048 rows in the 30 days before sat exactly at the cap.
 *   Footle's score panel was handed 1000 down 125 a guess on 0 to 1000 rows
 *   while the record was 700 down 100. Fantasy Draft showed season points,
 *   recorded their share of 114 and shared a win on every result. Quiz Board
 *   showed and shared a negative bank and recorded 0. Player Bingo showed
 *   points and recorded none (1,966 rows, every one NULL). Rarity mode recorded
 *   its raw points total, lower is better, so a perfect run recorded 0, which
 *   the leaderboard reads as no score at all.
 * AND WHAT THE REVIEW OF THE FIRST FIX FOUND: the legacy score it now records
 *   paid a flat 5 plus up to 20 for a TV career with no downside, even to a
 *   career retired in its first youth year (20 of 20 seeded careers recorded 20
 *   with no football played); section 2's gap was mostly the climb bonus on the
 *   55 start, so a halved 99 penalty stayed green; and four of the seven games
 *   had no negative control.
 *
 * SECTIONS
 *   1) Rendered. src/test/scoreShown.test.tsx under vitest: the real pages, the
 *      real recording path, the recorder mocked. Every game records what its
 *      result screen shows (the Rarity headline, stat and share; the Fantasy
 *      Draft card and share; the Quiz Board card and the copied share; Footle's
 *      panel and its rows), including Soccer Career's three other endings
 *      (manager, pundit, owner). The verdict reads vitest's exit code and treats
 *      any unhandled error in this file as red.
 *   2) Soccer Career, headless, over seeded careers.
 *      start: every career played from 99 is scored as played, with the start
 *        flag removed (the penalty itself, which must be at least 13 points on
 *        average), and relabelled to 55 (the same record climbed, at least 12).
 *      post: a career retired in its first youth year and sent through thirty
 *        bold predictions must record 0; a pundit tail on the played fleet may
 *        add at most the flat 5 plus the cap to its mean, an owner tail at most
 *        the cap.
 *      Natural play from 55 and from 99 is reported, old record against new.
 *   3) The caps the migration sets against the ceilings the code reaches.
 *   4) The migration, modelled from the SQL it contains: the placeholder P that
 *      refuses to run, the once only guard, the backup ahead of any change, the
 *      P split (no value filter before P, above 100 after), bests rebuilt and
 *      never divided, and the total_points recompute; then the rescale over the
 *      live score histogram read on 2026-09-19 and every integer to 3000.
 *
 * NEGATIVE CONTROLS, SCORE_SHOWN_CONTROL=<name>. Each must go red on its own
 * case and nowhere else; the harness checks both halves.
 *   rawlegacy     SoccerCareer.tsx records the old trophy formula: soccer-career.
 *   footlestats   Footle.tsx hands the panel its old formula: footle.
 *   footlebuckets Footle.tsx passes no rows, so the panel draws 0 to 1000: footle.
 *   bingonull     PlayerBingo.tsx passes no completionScore: player-bingo.
 *   rarityzero    RarityRound.tsx records the raw points total again: rarity-round.
 *   fantasyshare  FantasyDraft.tsx shares the old always-a-win line: fantasy-draft.
 *   quiznegative  the Quiz Board card shows the raw, negative score: quiz-board.
 *   nflshare      NFLCareer.tsx shares 0 pts on a win: nfl-career.
 *   noclimb       the engine with The Climb set to 0: section2start.
 *   halfpenalty   the engine with the 99 start penalty halved: section2start.
 *   nopunditcap   the engine with the post retirement cap lifted: section2post.
 *   noplaygate    the engine paying post retirement credit with no senior
 *                 season: section2post.
 *   norescale     the migration modelled with the cap moved and no rescale:
 *                 section4.
 *   strayerror    the test file throws one error outside any test while every
 *                 case passes: the unhandled error verdict.
 * A control refuses to run if the text it rewrites is not in the file, and every
 * read is folded to LF first because the checkout is CRLF.
 *
 * MEASURED, 40 careers a start, default seed then SIM_SEED 1, 2, 3, 4: see the
 * report of the round for the full table. Headline numbers are printed by every
 * run.
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
  footlebuckets: 'footle',
  bingonull: 'player-bingo',
  rarityzero: 'rarity-round',
  fantasyshare: 'fantasy-draft',
  quiznegative: 'quiz-board',
  nflshare: 'nfl-career',
  noclimb: 'section2start',
  halfpenalty: 'section2start',
  nopunditcap: 'section2post',
  noplaygate: 'section2post',
  norescale: 'section4',
  strayerror: 'unhandled',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SCORE_SHOWN_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* Section 2 bounds, from measured headroom.
   START_GAP_BOUND: the same record from 99 against the same record from 55.
     Structurally between -24 and -8 per career; measured means -20.9 to -21.3;
     0 with no climb. -12 sits in the middle.
   PENALTY_BOUND: the same record with and without the 99 start flag. At peak
     99 the Climb line is round(-12 * 0.42 - 32 * 0.34) = -16 on every career
     whose other lines reach 16; halving the handed part makes it -10, and no
     climb makes it 0. -13 sits in the middle. */
const START_GAP_BOUND = -12;
const PENALTY_BOUND = -13;
const CAREERS = Number(process.env.SCORE_SHOWN_CAREERS || 40);
const EXPECTED_CASES = 15;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'scoreShown-')).replaceAll('\\', '/');
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
let controlDir = null;
function cleanup() {
  try { if (controlDir) fs.rmSync(controlDir, { recursive: true, force: true }); } catch { /* best effort */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
}
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

/* ======================= Section 1: rendered ======================= */
console.log('\n1) Rendered: src/test/scoreShown.test.tsx, the real pages with the recorder mocked');

const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
const PAGE_KEYS = ['SCORE_SHOWN_SOCCER_PAGE', 'SCORE_SHOWN_FOOTLE_PAGE', 'SCORE_SHOWN_BINGO_PAGE', 'SCORE_SHOWN_RARITY_PAGE', 'SCORE_SHOWN_FANTASY_PAGE', 'SCORE_SHOWN_QUIZ_BOARD', 'SCORE_SHOWN_NFL_PAGE'];
for (const k of PAGE_KEYS) delete env[k];
delete env.SCORE_SHOWN_STRAY_ERROR;
if (CONTROL === 'strayerror') {
  env.SCORE_SHOWN_STRAY_ERROR = '1';
  console.log('   NEGATIVE CONTROL ON: the test file throws one error outside any test');
}
const OLD_FANTASY_SHARE = 'customText="I outdrafted the AI on Fantasy Draft at DoUKnowBall! Can you build a better squad? douknowball.com/fantasy-draft"';
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
  footlebuckets: {
    file: 'src/pages/Footle.tsx', envKey: 'SCORE_SHOWN_FOOTLE_PAGE',
    rewrite: s => swap(s, '                buckets={FOOTLE_SCORE_BUCKETS}\n', '', 'Footle.tsx (the stats panel rows)'),
  },
  bingonull: {
    file: 'src/pages/PlayerBingo.tsx', envKey: 'SCORE_SHOWN_BINGO_PAGE',
    rewrite: s => swap(s, '                completionScore={score}\n', '', 'PlayerBingo.tsx (the two completionScore props)', 2),
  },
  rarityzero: {
    file: 'src/pages/RarityRound.tsx', envKey: 'SCORE_SHOWN_RARITY_PAGE',
    rewrite: s => swap(s,
      "useGameCompletion('rarity-round', isComplete, rankedRun ? recordedScore : undefined, results.length);",
      "useGameCompletion('rarity-round', isComplete, finalScore, results.length);",
      'RarityRound.tsx (the recorded score)'),
  },
  fantasyshare: {
    file: 'src/pages/FantasyDraft.tsx', envKey: 'SCORE_SHOWN_FANTASY_PAGE',
    rewrite: s => swap(s, 'customText={fantasyShareText(verdict)}', OLD_FANTASY_SHARE, 'FantasyDraft.tsx (the share text)'),
  },
  quiznegative: {
    file: 'src/components/quiz-board/QuizBoard.tsx', envKey: 'SCORE_SHOWN_QUIZ_BOARD',
    rewrite: s => swap(s, '            ${banked}\n', '            ${score}\n', 'QuizBoard.tsx (the final card)'),
  },
  nflshare: {
    file: 'src/pages/NFLCareer.tsx', envKey: 'SCORE_SHOWN_NFL_PAGE',
    rewrite: s => swap(s,
      "                score: gameStatus === 'won' ? `${score} pts (${cluesRevealed} clues)` : '0 pts',\n",
      "                score: '0 pts',\n",
      'NFLCareer.tsx (the share score)'),
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
    { cwd: ROOT, env: { ...env, TEMP: TMP, TMP }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
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
if (cases.length < EXPECTED_CASES) abort(`the rendered test reported ${cases.length} cases, expected ${EXPECTED_CASES}:\n` + out.slice(-3000));
for (const t of cases) {
  const key = (t.title.match(/^([a-z-]+):/) || [])[1] || 'unknown';
  if (t.status === 'passed') ok(`${t.title}`);
  else noteRed(key, `${t.title} (${t.status}) ${(t.failureMessages || []).join(' ').split('\n')[0].slice(0, 220)}`);
}
/* The JSON report's success flag ignores an error vitest caught outside a
   test, and so does a count of passed cases. The exit code and the printed
   summary do not, so both are read. */
const failedCases = cases.filter(t => t.status !== 'passed').length;
const unhandled = /Unhandled Errors?|Uncaught Exception|Unhandled Rejection/.test(out);
const errorsLine = (out.match(/^\s*Errors\s+(\d+)\s+error/m) || [])[1];
if (unhandled || errorsLine) noteRed('unhandled', `vitest caught ${errorsLine || 'an'} unhandled error(s) while running this file:\n${out.slice(out.search(/Unhandled|Uncaught/), out.search(/Unhandled|Uncaught/) + 1200)}`);
if (run.status !== 0 && failedCases === 0 && !unhandled && !errorsLine) noteRed('vitest', `vitest exited ${run.status} with every case passing and no error it printed`);
console.log(`   ${cases.length - failedCases} of ${cases.length} rendered cases passed, vitest exit ${run.status}, unhandled errors ${unhandled || errorsLine ? 'yes' : 'none'}`);

/* ======================= Section 2: Soccer Career, headless ======================= */
console.log('\n2) Soccer Career over seeded careers: the start, and the tail after retirement');

const ENGINE = `${ROOT_URL}/src/lib/soccerCareerEngine.ts`;
const ENGINE_REWRITES = {
  noclimb: ['    climbPoints = clamp(Math.round((climb - 12) * 0.42 - handed * 0.34), -18, 8);\n', '    climbPoints = 0;\n'],
  halfpenalty: ['handed * 0.34', 'handed * 0.17'],
  nopunditcap: ['export const POST_RETIREMENT_BONUS_CAP = 6;', 'export const POST_RETIREMENT_BONUS_CAP = 1000;'],
  noplaygate: ['  if (careerLength > 0) {\n    if (state.isPundit) {', '  if (true) {\n    if (state.isPundit) {'],
};
const plugins = [];
if (ENGINE_REWRITES[CONTROL]) {
  const [from, to] = ENGINE_REWRITES[CONTROL];
  swap(readLF(ENGINE), from, to, 'soccerCareerEngine.ts');
  plugins.push({
    name: CONTROL,
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => ({
        contents: readLF(args.path).split(from).join(to),
        loader: 'ts',
        resolveDir: path.dirname(args.path),
      }));
    },
  });
  console.log(`   NEGATIVE CONTROL ON: the engine is bundled with ${CONTROL}`);
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
/* The rule this section holds the engine to, written here rather than read
   from the engine: a limit read from the code under test moves with the code,
   and the first draft of this check did exactly that and stayed green with the
   cap lifted to 1000. */
const CAP = 6;
if (E.POST_RETIREMENT_BONUS_CAP !== CAP) console.log(`   the engine's POST_RETIREMENT_BONUS_CAP reads ${E.POST_RETIREMENT_BONUS_CAP}, the rule is ${CAP}`);

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
  if (f.stuck.length) noteRed('section2start', `${f.stuck.length} of ${CAREERS} careers from ${name} never reached retirement (phases ${[...new Set(f.stuck)].join(', ')})`);
}
if (f99.done.length < CAREERS * 0.9 || f55.done.length < CAREERS * 0.9) abort(`only ${f99.done.length} and ${f55.done.length} careers finished, too few to measure`);

/* 2a) The start. The penalty for typing 99, measured by itself: the same
   career record with and without the starting overall (a save from before the
   Climb existed has none, and calculateLegacy then leaves the line out). */
const penalties = f99.done.map(s => E.calculateLegacy(s).score - E.calculateLegacy({ ...s, startingOverall: undefined }).score);
const penaltyMean = mean(penalties);
console.log(`   the 99 start flag, same record with and without it, over ${penalties.length} careers: mean ${fmt(penaltyMean)} (bound: at or below ${PENALTY_BOUND})`);
if (penaltyMean <= PENALTY_BOUND) ok(`typing 99 costs ${fmt(-penaltyMean)} points on the same career record`);
else noteRed('section2start', `typing 99 costs only ${fmt(-penaltyMean)} points on the same record, mean ${fmt(penaltyMean)} > ${PENALTY_BOUND}`);

const gaps = f99.done.map(s => E.calculateLegacy(s).score - E.calculateLegacy({ ...s, startingOverall: 55 }).score);
const gapMean = mean(gaps);
console.log(`   the same record from 99 against from 55, over ${gaps.length} careers: mean ${fmt(gapMean)} (bound: at or below ${START_GAP_BOUND})`);
if (gapMean <= START_GAP_BOUND) ok(`a 99 start records ${fmt(-gapMean)} points less than the same career record climbed from 55`);
else noteRed('section2start', `a 99 start is not scored below the same record from 55: mean gap ${fmt(gapMean)} > ${START_GAP_BOUND}`);

/* Natural play, reported: what each start actually records, in leaderboard
   points (record / cap * 100), before and after. Not asserted: a 99 build wins
   more, and should; the checks above ask whether it is paid for the start. */
for (const [name, f] of [['55 (80 ceiling)', f55], ['99', f99]]) {
  const newPts = f.done.map(s => s.legacy.score);
  const oldPts = f.done.map(s => oldRecord(s) / 10);
  console.log(`   natural play from ${name}: old record ${fmt(mean(oldPts))} points a career (${oldPts.filter(x => x >= 100).length} of ${oldPts.length} at the cap), new record ${fmt(mean(newPts))} (${newPts.filter(x => x >= 100).length} at the cap)`);
}

/* 2b) After the boots come off. */
const PREDICTIONS = 30;
const punditTail = s0 => {
  let s = E.choosePostRetirement(s0, 'pundit', clubs);
  for (let i = 0; i < PREDICTIONS; i++) s = E.advancePunditSeason(s, 'bold_prediction');
  return E.endPunditCareer(s);
};
const youth = [];
for (let i = 0; i < 20; i++) {
  let s = E.initCareer(`Kid ${i}`, 'England', 'ST', '2020s', stats(55), 55, 2020, clubs, null, 80);
  s = E.manualRetire(s);
  s = punditTail(s);
  youth.push({ score: s.legacy.score, bonus: s.punditState ? s.punditState.legacyBonus : 0 });
}
const youthPaid = youth.filter(y => y.score !== 0).length;
console.log(`   retired in the first youth year, then ${PREDICTIONS} bold predictions: ${youth.length} careers, prediction bonus earned ${fmt(mean(youth.map(y => y.bonus)))} on average, recorded ${[...new Set(youth.map(y => y.score))].join('/')}`);
if (youthPaid === 0) ok('a career with no senior season records 0 however well the studio goes');
else noteRed('section2post', `${youthPaid} of ${youth.length} careers retired in the youth year record more than 0 off punditry alone`);

const punditGain = f55.done.map(s => punditTail(s).legacy.score - s.legacy.score);
const punditLimit = 5 + CAP;
console.log(`   a pundit tail of ${PREDICTIONS} bold predictions on ${punditGain.length} played careers: mean +${fmt(mean(punditGain))} (limit: the flat 5 plus the cap, ${punditLimit})`);
if (mean(punditGain) <= punditLimit) ok(`punditry adds ${fmt(mean(punditGain))} on average, inside ${punditLimit}`);
else noteRed('section2post', `punditry adds ${fmt(mean(punditGain))} on average, past the ${punditLimit} it is allowed`);

const ownerGain = f55.done.map(s0 => {
  let s = E.choosePostRetirement({ ...s0, netWorth: 500 }, 'owner', clubs);
  for (let i = 0; i < 20; i++) s = E.advanceOwnerSeason(s);
  return E.endOwnerCareer(s).legacy.score - s0.legacy.score;
});
console.log(`   an owner tail of 20 seasons on ${ownerGain.length} played careers: mean +${fmt(mean(ownerGain))} (limit: the cap, ${CAP})`);
if (mean(ownerGain) <= CAP) ok(`owning a club adds ${fmt(mean(ownerGain))} on average, inside ${CAP}`);
else noteRed('section2post', `owning a club adds ${fmt(mean(ownerGain))} on average, past the cap of ${CAP}`);

/* ======================= Section 3: the caps ======================= */
console.log('\n3) The caps the migration sets, against the ceilings the code reaches');

const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260919_round_644_scores_shown.sql');
if (!fs.existsSync(MIGRATION)) abort('the Round 644 migration is missing');
/* The code, not the comments: every line comment and block comment goes
   before matching. */
const sql = readLF(MIGRATION)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map(l => l.replace(/--.*$/, '')).join('\n')
  .replace(/\s+/g, ' ');
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

/* ======================= Section 4: the migration ======================= */
console.log('\n4) The migration: its shape read off the SQL, then the rescale modelled on live and synthetic rows');

const need = (re, what) => {
  if (re.test(sql)) ok(what);
  else noteRed('section4', `not in the SQL: ${what}`);
};
need(/v_p text := 'SET_P_HERE'; .* if v_p = 'SET_P_HERE' then raise exception/, 'P is one placeholder, and the file refuses to run while it is still there');
need(/if v_ts < '2026-09-19 00:00:00\+00' or v_ts > now\(\) then raise exception/, 'a P in the future or before 2026-09-19 is refused');
need(/if v_done is not null then raise notice .* return; end if; if v_cap is distinct from 1000 then raise exception/, 'part 1 runs once: skipped once done, refused if the cap moved without it');
/* The backup comes first inside part 1: the first backup insert sits before the
   first rescale. */
{
  const part1 = sql.slice(sql.indexOf('select publish_time, part1_done_at'), sql.indexOf('update private.r644_state set part1_done_at = now()'));
  const firstBackup = part1.indexOf('insert into private.r644_soccer_scores_bak');
  const firstUpdate = part1.indexOf('update public.');
  if (firstBackup >= 0 && firstUpdate > firstBackup) ok('part 1 backs every table up before it changes one');
  else noteRed('section4', 'part 1 changes a table before (or without) backing it up');
  for (const t of ['game_completions', 'user_game_scores', 'user_best_scores', 'user_scores']) {
    if (part1.includes(`'part1:${t}'`)) ok(`part 1 backs up ${t}`);
    else noteRed('section4', `part 1 does not back up ${t}`);
  }
}
for (const [table, key] of [['game_completions', 'game'], ['user_game_scores', 'game_type']]) {
  need(new RegExp(`update public\\.${table} set score = round\\(score / 10\\.0\\)::integer where ${key} = 'soccer-career' and score > 0 and created_at < v_p;`),
    `${table}: every row before P is divided by ten, with no value filter`);
  need(new RegExp(`update public\\.${table} set score = round\\(score / 10\\.0\\)::integer where ${key} = 'soccer-career' and created_at >= v_p and score > 100;`),
    `${table}: after P only rows above 100 (an old tab) are divided`);
}
if (/update public\.user_best_scores [^;]*round\(/.test(sql)) noteRed('section4', 'user_best_scores is divided somewhere, and a divided best can land below the real one');
else ok('user_best_scores is never divided');
need(/update public\.user_best_scores b set best_score = m\.best from \(select s\.user_id, max\(s\.score\) as best from public\.user_game_scores s where s\.game_type = 'soccer-career' group by s\.user_id\) m where b\.user_id = m\.user_id and b\.game_type = 'soccer-career' and b\.best_score is distinct from m\.best;/,
  'bests are rebuilt as each player\'s max(score), touching only rows that differ');
need(/least\(max\(s\.score\), d\.max_score\) as best from public\.user_game_scores s join public\.game_denominators d on d\.game = s\.game_type where s\.user_id = u\.user_id group by s\.game_type, s\.puzzle_date, d\.max_score/,
  'total_points is recomputed to the 2026-09-19 rule: per game per day, the day\'s best, capped by game_denominators');
need(/update public\.user_scores u set total_points = t\.pts from r644_totals t where t\.user_id = u\.user_id and u\.total_points is distinct from t\.pts;/, 'the recompute touches only totals that differ');
{
  const part2 = sql.slice(sql.indexOf("'Round 644 part 2:"));
  const b = part2.indexOf("'part2:user_scores'"); const u = part2.indexOf('update public.user_scores');
  if (b >= 0 && u > b) ok('part 2 backs a total up before recomputing it');
  else noteRed('section4', 'part 2 recomputes totals without backing them up first');
}

/* The model. Postgres round() on a positive numeric rounds half away from zero,
   which for positives is Math.round. A row is [score, beforeP]. */
const rescale = s => (CONTROL === 'norescale' ? s : Math.round(s / 10));
if (CONTROL === 'norescale') console.log('   NEGATIVE CONTROL ON: the model moves the cap to 100 and leaves every row as it was');
function applyMigration(rows, state) {
  let next = rows;
  if (!state.part1Done && state.cap === 1000) {
    next = next.map(([s, pre]) => [pre && s > 0 ? rescale(s) : s, pre]);
    state = { cap: 100, part1Done: true };
  }
  next = next.map(([s, pre]) => [!pre && s > 100 ? rescale(s) : s, pre]);
  return { rows: next, state };
}
const points = (s, cap) => (s > 0 ? 100 * Math.min(s, cap) / cap : 0);

/* Live, read only on 2026-09-19: soccer-career score value -> rows, all
   written before any P can be. */
const LIVE = {
  game_completions: { 50: 362, 100: 315, 150: 273, 200: 282, 250: 325, 300: 323, 350: 356, 400: 397, 450: 439, 500: 427, 550: 410, 600: 512, 650: 488, 700: 526, 750: 471, 800: 513, 850: 517, 900: 463, 950: 471, 1000: 11868 },
  user_game_scores: { 0: 3298, 50: 36, 100: 34, 150: 31, 200: 34, 250: 42, 300: 27, 350: 40, 400: 35, 450: 50, 500: 44, 550: 41, 600: 43, 650: 49, 700: 41, 750: 36, 800: 46, 850: 53, 900: 36, 950: 47, 1000: 1469 },
};
for (const [table, hist] of Object.entries(LIVE)) {
  const values = Object.keys(hist).map(Number);
  const after = applyMigration(values.map(v => [v, true]), { cap: 1000, part1Done: false });
  let rows = 0; let before = 0; let then = 0; let worst = 0;
  values.forEach((s, i) => {
    const n = hist[s]; rows += n;
    const a = points(s, 1000); const b = points(after.rows[i][0], after.state.cap);
    before += a * n; then += b * n; worst = Math.max(worst, Math.abs(a - b));
  });
  const line = `${table}: ${rows.toLocaleString('en-US')} live rows, ${before.toFixed(1)} row points before, ${then.toFixed(1)} after, worst row ${worst.toFixed(3)}`;
  if (worst === 0) ok(line); else noteRed('section4', line);
}
console.log('   live leaderboard, read only 2026-09-19 (the query is in the migration): 9,341 soccer-career player days before P = now(), 825,490 points before and after, 0 days changed');

/* Synthetic, the transform on its own, every integer from 0 to 3000. */
let synthWorst = 0; let synthWorstAt = 0; let monotone = true; let tens = true;
for (let s = 0; s <= 3000; s++) {
  const d = Math.abs(points(s, 1000) - points(rescale(s), 100));
  if (d > synthWorst) { synthWorst = d; synthWorstAt = s; }
  if (s > 0 && rescale(s) < rescale(s - 1)) monotone = false;
  if (s % 10 === 0 && d !== 0) tens = false;
}
if (synthWorst <= 0.5 && tens && monotone) ok(`the transform on every integer 0 to 3000: worst ${synthWorst.toFixed(3)} points (at ${synthWorstAt}), exact on every multiple of 10, order kept`);
else noteRed('section4', `the transform: worst ${synthWorst.toFixed(3)} points at ${synthWorstAt}, exact on multiples of 10 ${tens}, order kept ${monotone}`);

/* Applying the file twice divides nothing twice; after P a new score is left
   alone at any value (50 and 100 included) and an old tab above 100 is caught;
   and a best rebuilt from the plays is right where a divided best is not. */
const first = applyMigration([[1000, true], [850, true], [50, true], [0, true], [84, false], [50, false], [800, false]], { cap: 1000, part1Done: false });
const second = applyMigration(first.rows, first.state);
const want = [100, 85, 5, 0, 84, 50, 80];
const flat = r => r.rows.map(x => x[0]);
if (JSON.stringify(flat(first)) === JSON.stringify(want) && JSON.stringify(flat(second)) === JSON.stringify(want)) ok(`first apply ${JSON.stringify(flat(first))}, a second apply changes nothing`);
else noteRed('section4', `apply once ${JSON.stringify(flat(first))}, twice ${JSON.stringify(flat(second))}, wanted ${JSON.stringify(want)} both times`);
{
  /* A player's real best after P is 84; an old tab then saves 800, which
     record_auth_completion takes as the new best. */
  const plays = applyMigration([[84, false], [800, false]], { cap: 100, part1Done: true }).rows.map(x => x[0]);
  const rebuilt = Math.max(...plays);
  const divided = rescale(800);
  if (rebuilt === 84 && divided < 84) ok(`a best rebuilt from the plays keeps the real 84, where dividing the stored 800 would give ${divided}`);
  else noteRed('section4', `bests: rebuilt ${rebuilt}, divided ${divided}`);
}

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
