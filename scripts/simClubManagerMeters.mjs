/* Club Manager: the two header meters and the table's goals pair.

   Round 465. His words (docs/TWEAKS-2026-08-28.md, the Club Manager arc):
   "Two meters, always visible: board patience (how close to fired) and fan
   mood." And: "Table: show goals for and against as 25-23 alongside GD."

   What was wrong for the player before this round, measured on the shipped
   engine: the header showed one bar, board confidence, and the number it
   printed could be a lie in three ways. The engine's only sacking line
   checked the number BEFORE the press promise settlement took its four
   off, so a manager could finish a match week on 0 and still be in a job;
   a press answer clamped the number to 0 between matches with no sack at
   all; and committing to another club's approach did the same. A meter
   that says zero is the sack has to be right every time it says zero, so
   the engine now checks once more after the promise settles and the two
   between-match paths stop at the last point. There was no fan meter.

   Sections:
     1) the board meter IS the sacking rule. Twenty five seeded careers
        (eight modern clubs across the tiers, the same eight on a hot seat
        that opens every season on a handful of points, one 2015 era save),
        every one answering the press the mouthy way (promise whenever it
        is offered, otherwise the answer the board like least), checked
        after EVERY calendar entry and every press answer: sacked exactly
        when the meter's value is at zero, and exactly when the integer it
        prints is zero. The largest single week fall is measured here too,
        because the bottom band's words say one bad week can take it all.
     2) the promise path in isolation: mid-season states with a promise on
        record played once from a spread of starting points, and every
        landing on zero has to be a sacking. Then the between-match paths:
        every option of a pending press question answered from half a
        point, and a summer handshake taken from three, must leave the
        meter above zero with the manager still in a job.
     3) the fan meter moves with results: over every league week of the
        eight normal careers, its correlation with points per game over
        the last ten fixtures, and the mean move after a win against the
        mean move after a defeat.
     4) every table row carries the goals pair: LeagueTableCard rendered
        through react-dom/server on my league mid-season and at the end, a
        world league, the 2015 era league and a Champions League group.
        Every row must print "gf-ga" as its own row's numbers and the GD
        beside it must be exactly gf minus ga.
     5) words match code: the How to Play copy and the game content read
        the band edges and the fan terms off the meters module itself.

   Negative controls (house rule: prove the checks can fail):
     CM_METERS_CONTROL=decor    the board meter reads a fixed 50 instead of
       the engine's number. Section 1 must go red.
     CM_METERS_CONTROL=promise  the engine loses the Round 465 re-check and
       the two floors, the pre-465 shape. Sections 1 and 2 must go red.
     CM_METERS_CONTROL=deaf     the fan meter's results term is zeroed.
       Section 3 must go red.
     CM_METERS_CONTROL=nogoals  the table card loses the pair. Section 4
       must go red.
     Each control refuses to run if its rewrite found nothing to rewrite.

   Thresholds, from this harness on its own seed and on SIM_SEED=1, 2, 3
   (2026-09-05), each one roughly midway between the fixed band and the
   control's band where a control has one:
     sackings across the careers        fixed 23 to 24                          floor 12
     press answers in the careers       fixed 533 to 582                        floor 200
     largest single week fall           fixed 11.7 to 14.0, p99 11.3 to 11.8    the edge is 10
     promise landings on zero           fixed 9 to 27                           floor 4
     disliked press options probed      fixed 6 to 10                           floor 3
     fan meter vs last ten PPG, r       fixed 0.921 to 0.940   deaf 0.519       floor 0.75
     mean fan move after a win          fixed +5.5 to +6.5     deaf +1.0        floor +3
     mean fan move after a defeat       fixed -9.5 to -10.9    deaf -1.5        ceiling -5
     fan samples                        fixed 518 to 666                        floor 300
     table rows rendered                fixed 84 in five tables                 floor 60

   Run: node scripts/simClubManagerMeters.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_METERS_CONTROL || '';
if (CONTROL && !['decor', 'promise', 'deaf', 'nogoals'].includes(CONTROL)) {
  console.error(`CM_METERS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const lf = s => s.replaceAll('\r\n', '\n');
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/* ---- the engine, the meters and the card, regressed when a control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const METERS = path.join(ROOT, 'src', 'lib', 'clubManagerMeters.ts');
const CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'LeagueTableCard.tsx');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
let metersPath = `${ROOT_URL}/src/lib/clubManagerMeters.ts`;
let cardPath = `${ROOT_URL}/src/components/club-manager/LeagueTableCard.tsx`;
function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${what} is not in the shape CM_METERS_CONTROL=${CONTROL} rewrites (${from.slice(0, 60)}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = `${TMP}/${process.pid}.${outName}`;
  fs.writeFileSync(out, src);
  return out;
}
if (CONTROL === 'decor') {
  metersPath = rewrite(METERS, [[
    "  const value = typeof raw === 'number' && Number.isFinite(raw) ? clamp(raw, 0, 100) : 0;\n",
    '  const value = 50 + 0 * (typeof raw === \'number\' ? raw : 0);\n',
  ]], 'clubManagerMeters.decor.ts', 'the board meter');
  console.log('NEGATIVE CONTROL ON: the board meter is a decoration reading 50; section 1 must go red');
}
if (CONTROL === 'promise') {
  enginePath = rewrite(ENGINE, [
    [
      '  if (!state.sacked && state.boardConfidence <= 0) {\n    state.sacked = true;\n    events.push(\'📉 The board has seen enough. You are relieved of your duties.\');\n  }\n  // The talk only ever covered the match it was given for.\n',
      '  // The talk only ever covered the match it was given for.\n',
    ],
    ['  state.boardConfidence = clamp(state.boardConfidence + opt.board, 1, 100);\n', '  state.boardConfidence = clamp(state.boardConfidence + opt.board, 0, 100);\n'],
    ['    state.boardConfidence = clamp(state.boardConfidence - 6, 1, 100);\n', '    state.boardConfidence = clamp(state.boardConfidence - 6, 0, 100);\n'],
  ], 'clubManagerMeters.promise.ts', 'the sack re-check and the two floors');
  console.log('NEGATIVE CONTROL ON: the pre-465 engine, a broken promise or a press answer can leave the board on zero with the manager in a job; sections 1 and 2 must go red');
}
if (CONTROL === 'deaf') {
  metersPath = rewrite(METERS, [['export const FAN_RESULT_WEIGHT = 34;\n', 'export const FAN_RESULT_WEIGHT = 0;\n']],
    'clubManagerMeters.deaf.ts', 'the fan results weight');
  console.log('NEGATIVE CONTROL ON: the fan meter ignores results; section 3 must go red');
}
if (CONTROL === 'nogoals') {
  cardPath = rewrite(CARD, [[
    '            <span className="text-center text-muted-foreground text-[11px] tabular-nums" data-goals={`${r.gf}-${r.ga}`}>{r.gf}-{r.ga}</span>\n',
    '',
  ]], 'LeagueTableCardMeters.nogoals.tsx', 'the goals pair span');
  console.log('NEGATIVE CONTROL ON: the table card drops the goals pair, the pre-465 row; section 4 must go red');
}

/* One CommonJS bundle: the engine, the meters module and the real card
   (the simClubManagerEraUcl recipe). A rewritten meters module or card
   imports the engine through the alias, the untouched file on disk; both
   are pure functions of the state they are handed, so that is fine. */
/* The process id is in every temp name so seeds and controls can run side
   by side: eight runs sharing one bundle path read each other's rewrites. */
const ENTRY = `${TMP}/clubManagerMeters.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerMeters.${process.pid}.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${enginePath}';
export * as meters from '${metersPath}';
export { LeagueTableCard } from '${cardPath}';
import React from '${ROOT_URL}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT_URL}/node_modules/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, meters, LeagueTableCard, render } = createRequire(import.meta.url)(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, answerPress, respondApproach,
  sortedLeagueTable, sortedWorldTable, sortedTable, careerLeagueOf, worldLeagueDefs,
} = cm;
const {
  boardMeter, fanMeter, BOARD_SAFE, BOARD_EDGE, FAN_BASE, FAN_RESULT_WEIGHT, FAN_TABLE_PER_PLACE, FAN_TABLE_CAP,
  FAN_TICKET_TERMS, FAN_TROPHY_TERM, FAN_TROPHY_CAP, FAN_SINGING, FAN_TURNING,
} = meters;

const clone = s => JSON.parse(JSON.stringify(s));

/* ---------- driving the engine the way the page does ---------- */

/** Answer the press the mouthy way: the promise if one is on the table,
    otherwise the option the board like least. Exercises the promise
    settlement and the press floor without a human. */
function mouthy(s) {
  const q = s.press?.pending;
  if (!q || !q.options?.length) return s;
  let idx = q.options.findIndex(o => o.promise);
  if (idx < 0) {
    idx = 0;
    q.options.forEach((o, i) => { if ((o.board ?? 0) < (q.options[idx].board ?? 0)) idx = i; });
  }
  return answerPress(s, idx);
}

/** The invariant the round exists for, checked wherever the state moves. */
function holdMeter(tag, s) {
  const m = boardMeter(s);
  if (!isNum(m.value) || m.value < 0 || m.value > 100) fail(`${tag}: the board meter value is ${m.value}`);
  if (s.sacked !== (m.value <= 0)) fail(`${tag}: sacked=${s.sacked} while the board meter reads ${m.value} (${m.band})`);
  if (s.sacked !== (m.shown === 0)) fail(`${tag}: sacked=${s.sacked} while the header prints ${m.shown}/100`);
  if (!s.sacked && !['Safe', 'Under pressure', 'One bad week from the sack'].includes(m.band)) fail(`${tag}: an employed manager's board band is "${m.band}"`);
  const f = fanMeter(s);
  if (!isNum(f.value) || f.value < 0 || f.value > 100) fail(`${tag}: the fan meter value is ${f.value}`);
  if (!['Hopeful', 'Singing', 'Grumbling', 'Turning'].includes(f.band)) fail(`${tag}: the fan band is "${f.band}"`);
}

const CLUBS = ['Real Madrid', 'Arsenal', 'Napoli', 'Wolves', 'Ajax', 'Newcastle', 'Roma', 'Inter Miami'];

/* ---------- 1. the board meter is the sacking rule ---------- */
console.log('1) The board meter is the sacking rule, after every entry of every career');
let entries = 0, sackings = 0, pressAnswers = 0, seasonsPlayed = 0;
const falls = [];
const fanSamples = [];   // [fan value, last ten PPG]
const fanMoves = { W: [], D: [], L: [] };
const keptStates = { mid: [], end: [], promiseProbes: [] };

function ppgLastTen(s) {
  const log = (s.resultLog ?? []).slice(-10);
  if (!log.length) return NaN;
  return log.reduce((a, e) => a + (e.res === 'W' ? 3 : e.res === 'D' ? 1 : 0), 0) / log.length;
}

function playCareer(tag, start, seasons, opts = {}) {
  let s = start;
  for (let season = 1; season <= seasons; season++) {
    if (opts.hotSeat) s = { ...s, boardConfidence: opts.hotSeat(season) };
    let guard = 0;
    let prevFan = fanMeter(s).value;
    let leagueWeeks = 0;
    while (guard++ < 200) {
      const before = s.boardConfidence;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      entries += 1;
      holdMeter(`${tag} s${season} e${guard}`, s);
      if (r.kind === 'match') {
        const fall = before - s.boardConfidence;
        if (isNum(fall) && fall > 0) falls.push(fall);
        const res = (s.resultLog ?? []).slice(-1)[0]?.res;
        const fanNow = fanMeter(s).value;
        if (opts.sample && res) {
          fanMoves[res].push(fanNow - prevFan);
          const ppg = ppgLastTen(s);
          if (isNum(ppg)) fanSamples.push([fanNow, ppg]);
        }
        prevFan = fanNow;
        if (r.report?.competition === 'league' || (s.calendar[s.week - 1]?.type === 'league')) leagueWeeks += 1;
        if (opts.keep && leagueWeeks === 12 && season === 1) keptStates.mid.push(clone(s));
        if (opts.keep && s.press && leagueWeeks === 8 && season === 1) keptStates.promiseProbes.push(clone(s));
      }
      if (s.sacked) { sackings += 1; break; }
      if (r.kind === 'seasonOver') break;
      if (s.press?.pending) {
        s = mouthy(s);
        pressAnswers += 1;
        holdMeter(`${tag} s${season} e${guard} after the press`, s);
      }
    }
    seasonsPlayed += 1;
    if (s.sacked) break;
    if (opts.keep && season === 1) keptStates.end.push(clone(s));
    if (season < seasons) {
      s = finishSeason(s).state;
      s = startNextSeason(s);
      holdMeter(`${tag} s${season + 1} opening`, s);
    }
  }
  return s;
}

for (const club of CLUBS) playCareer(club, startCareer(club), 2, { sample: true, keep: true });
/* Three lives per club on the hot seat: a sacking ends a career, so each
   life is a fresh save opening on a handful of points. */
CLUBS.forEach((club, i) => {
  for (let life = 0; life < 3; life++) {
    playCareer(`${club} (hot seat, life ${life + 1})`, startCareer(club), 2, { hotSeat: season => 4 + ((i + season + life * 3) % 9) });
  }
});
{
  const era = playCareer('Leicester City 2015', startCareer('Leicester City', 'era2015'), 1, { keep: true });
  keptStates.era = era;
}

const largestFall = falls.length ? Math.max(...falls) : 0;
console.log(`   ${entries} calendar entries across ${seasonsPlayed} seasons, ${pressAnswers} press answers, ${sackings} sackings, every one exactly when the meter read zero`);
console.log(`   single week falls in board confidence: median ${quantile(falls, 0.5).toFixed(1)}, p99 ${quantile(falls, 0.99).toFixed(1)}, largest ${largestFall.toFixed(1)} (the bottom band starts under ${BOARD_EDGE})`);
if (sackings < 12) fail(`only ${sackings} sackings in the sample, the check has nothing to bite on`);
if (pressAnswers < 200) fail(`only ${pressAnswers} press answers, the promise path was barely exercised`);
/* The bottom band's words are a claim about a measurement, and this is the
   measurement: the band must not reach above the largest fall a week has
   been seen to take, or "one bad week from the sack" is a lie at the top of
   the band. Lower BOARD_EDGE (and the copy) if a fresh seed lands under it,
   never the other way. */
if (largestFall < BOARD_EDGE) fail(`the bottom band starts at ${BOARD_EDGE} but the largest single week fall measured was ${largestFall.toFixed(1)}: the words overstate it`);

/* ---------- 2. the promise path and the between-match paths ---------- */
console.log('2) A broken promise, a press answer or a handshake can never leave the meter on zero with the manager in a job');
let probes = 0, promiseZero = 0, promiseFired = 0;
for (const base of keptStates.promiseProbes.slice(0, 4)) {
  for (let conf = 4; conf <= 12; conf += 0.5) {
    const s0 = clone(base);
    s0.boardConfidence = conf;
    s0.press.promised = true;
    s0.press.pending = null;
    const r = playNextEntry(s0, { skipHalftime: true });
    const s = r.state;
    probes += 1;
    const fired = (r.report?.events ?? []).some(e => typeof e === 'string' && e.includes('You told the country you would win this one'));
    if (fired) promiseFired += 1;
    if (fired && s.boardConfidence <= 0) promiseZero += 1;
    holdMeter(`promise probe ${s0.clubName} from ${conf}`, s);
  }
}
console.log(`   ${probes} one match probes with a promise on record: the promise broke in ${promiseFired}, ${promiseZero} of those landed on zero and every landing was a sacking`);
if (promiseZero < 4) fail(`only ${promiseZero} probes landed on zero through a broken promise, the path was not exercised`);

let pressProbes = 0, pressNegative = 0, handshakes = 0;
for (const base of [...keptStates.mid, ...keptStates.promiseProbes]) {
  const q = base.press?.pending;
  if (q && q.options?.length) {
    q.options.forEach((o, i) => {
      const s0 = clone(base);
      s0.boardConfidence = 0.5;
      const s = answerPress(s0, i);
      pressProbes += 1;
      if ((o.board ?? 0) < 0) pressNegative += 1;
      if (s.sacked) fail(`a press answer sacked ${s0.clubName} ("${o.label}")`);
      if (!(s.boardConfidence > 0)) fail(`answering the press ("${o.label}", board ${o.board}) from 0.5 left the board on ${s.boardConfidence}`);
      holdMeter(`press probe ${s0.clubName} option ${i}`, s);
    });
  }
  const s0 = clone(base);
  s0.boardConfidence = 3;
  s0.approach = { club: 'Aston Villa', leagueName: 'Premier League', tierLabel: 'Contender', blurb: 'They want you.', week: s0.week, expiresWeek: s0.week + 3 };
  const s = respondApproach(s0, true);
  handshakes += 1;
  if (!(s.boardConfidence > 0) || s.sacked) fail(`a summer handshake from 3 left the board on ${s.boardConfidence} (sacked=${s.sacked})`);
  holdMeter(`handshake probe ${s0.clubName}`, s);
}
console.log(`   ${pressProbes} press answers from half a point (${pressNegative} of them the board disliked) and ${handshakes} handshakes from three: none reached zero`);
if (pressNegative < 3) fail(`only ${pressNegative} press options the board dislike were probed, the floor was barely exercised`);

/* ---------- 3. the fan meter moves with results ---------- */
console.log('3) The fan meter moves with results the way a fan would');
const r = pearson(fanSamples.map(x => x[0]), fanSamples.map(x => x[1]));
const winMove = mean(fanMoves.W), drawMove = mean(fanMoves.D), lossMove = mean(fanMoves.L);
console.log(`   ${fanSamples.length} match weeks sampled: fan meter vs last ten PPG r = ${r.toFixed(3)}`);
console.log(`   mean fan move after a win ${winMove >= 0 ? '+' : ''}${winMove.toFixed(2)} (${fanMoves.W.length}), after a draw ${drawMove >= 0 ? '+' : ''}${drawMove.toFixed(2)} (${fanMoves.D.length}), after a defeat ${lossMove.toFixed(2)} (${fanMoves.L.length})`);
if (fanSamples.length < 300) fail(`only ${fanSamples.length} fan samples, too thin`);
if (!(r >= 0.75)) fail(`the fan meter tracks points per game at r = ${r.toFixed(3)}, under the 0.75 floor`);
if (!(winMove >= 3)) fail(`the fans move ${winMove.toFixed(2)} after a win, under the +3 floor`);
if (!(lossMove <= -5)) fail(`the fans move ${lossMove.toFixed(2)} after a defeat, over the -5 ceiling`);
if (!(winMove > drawMove && drawMove > lossMove)) fail(`the fan moves are not ordered win > draw > defeat (${winMove.toFixed(2)}, ${drawMove.toFixed(2)}, ${lossMove.toFixed(2)})`);
{
  const fresh = startCareer('Arsenal');
  const f = fanMeter(fresh);
  if (f.band !== 'Hopeful') fail(`a fresh save's fans read "${f.band}" before a ball is kicked`);
  if (Math.abs(f.value - FAN_BASE) > 0.01) fail(`a fresh save's fans sit on ${f.value}, not the base of ${FAN_BASE}`);
}

/* ---------- 4. every table row carries the goals pair ---------- */
console.log('4) Every league table row prints goals for and against beside the difference they make');
const rowRe = /<div class="[^"]*grid grid-cols-\[[^"]*"[^>]*>((?:<span[^>]*>[\s\S]*?<\/span>)+)<\/div>/g;
const spanRe = /<span[^>]*>([\s\S]*?)<\/span>/g;
function checkTable(tag, rows, career) {
  const html = render(LeagueTableCard, { rows, myClub: career.clubName, title: tag });
  const grids = [...html.matchAll(rowRe)].map(m => [...m[1].matchAll(spanRe)].map(x => x[1].replace(/<[^>]+>/g, '').trim()));
  const header = grids[0] ?? [];
  if (!header.includes('GF-GA')) fail(`${tag}: the header row has no GF-GA column (${header.join(' | ')})`);
  const gdIdx = header.indexOf('GD');
  const pairIdx = header.indexOf('GF-GA');
  const body = grids.slice(1);
  if (body.length !== rows.length) fail(`${tag}: ${body.length} rows rendered for ${rows.length} table rows`);
  let ok = 0;
  body.forEach((cells, i) => {
    const row = rows[i];
    if (!row) return;
    const pair = cells[pairIdx];
    const m = /^(\d+)-(\d+)$/.exec(pair ?? '');
    if (!m) { fail(`${tag}: row ${i + 1} (${row.club}) prints "${pair}" where the goals pair should be`); return; }
    const gf = Number(m[1]), ga = Number(m[2]);
    if (gf !== row.gf || ga !== row.ga) { fail(`${tag}: row ${i + 1} (${row.club}) prints ${pair} for a row holding ${row.gf}-${row.ga}`); return; }
    const gdText = (cells[gdIdx] ?? '').replace('+', '');
    if (Number(gdText) !== gf - ga) { fail(`${tag}: row ${i + 1} (${row.club}) prints GD ${cells[gdIdx]} beside ${pair}`); return; }
    ok += 1;
  });
  return ok;
}
let rowsChecked = 0, tables = 0;
for (const s of keptStates.mid.slice(0, 1)) { rowsChecked += checkTable(`${careerLeagueOf(s).name} mid-season`, sortedLeagueTable(s), s); tables += 1; }
for (const s of keptStates.end.slice(0, 1)) { rowsChecked += checkTable(`${careerLeagueOf(s).name} final`, sortedLeagueTable(s), s); tables += 1; }
{
  const s = keptStates.end[0];
  const other = worldLeagueDefs(s).find(l => l.id !== careerLeagueOf(s).id && s.world?.[l.id]);
  if (other) { rowsChecked += checkTable(`${other.name} (world)`, sortedWorldTable(s, other.id, s.world[other.id].table), s); tables += 1; }
  else fail('no simulated world league to render');
}
if (keptStates.era) { rowsChecked += checkTable(`${careerLeagueOf(keptStates.era).name} 2015-16`, sortedLeagueTable(keptStates.era), keptStates.era); tables += 1; }
{
  const s = [...keptStates.mid, ...keptStates.end].find(x => x.uclGroup && x.uclGroup.table?.length);
  if (s) { rowsChecked += checkTable('UCL group', sortedTable(s.uclGroup.table), s); tables += 1; }
  else fail('no Champions League group table to render');
}
console.log(`   ${rowsChecked} rows across ${tables} tables rendered through react-dom/server, every pair its row's own goals and every GD the pair's difference`);
if (rowsChecked < 60) fail(`only ${rowsChecked} rows rendered`);

/* ---------- 5. words match code ---------- */
console.log('5) The How to Play copy and the game content say what the meters do');
{
  const strip = s => lf(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const page = strip(fs.readFileSync(path.join(ROOT, 'src', 'pages', 'ClubManager.tsx'), 'utf8'));
  const content = strip(fs.readFileSync(path.join(ROOT, 'src', 'data', 'gameContent', 'soccer1.ts'), 'utf8'));
  const pageClaims = [
    `Safe is ${BOARD_SAFE} and above`,
    `Under pressure is ${BOARD_EDGE} to ${BOARD_SAFE - 1}`,
    `Under ${BOARD_EDGE} it reads One bad week from the sack`,
    `taking more than ${BOARD_EDGE} off`,
    `worth ${FAN_RESULT_WEIGHT} points either way`,
    `${FAN_TABLE_PER_PLACE} a place, capped at ${FAN_TABLE_CAP}`,
    `fair prices +${FAN_TICKET_TERMS[0]}, premium ${FAN_TICKET_TERMS[2]}`,
    `+${FAN_TROPHY_TERM} each, up to ${FAN_TROPHY_CAP}`,
    `base of ${FAN_BASE}`,
    `Singing is ${FAN_SINGING} and above, Grumbling is ${FAN_TURNING} to ${FAN_SINGING - 1}, Turning is under ${FAN_TURNING}`,
    'Tap either one to swap its words for the number',
  ];
  const contentClaims = [
    `Safe is ${BOARD_SAFE} and above, Under pressure is ${BOARD_EDGE} to ${BOARD_SAFE - 1}, under ${BOARD_EDGE} reads One bad week from the sack`,
    `Singing at ${FAN_SINGING} and above, Grumbling from ${FAN_TURNING} to ${FAN_SINGING - 1}, Turning under ${FAN_TURNING}`,
    `under ${BOARD_EDGE} it reads One bad week from the sack`,
    'goals for and against as a pair, 25-23',
  ];
  let claims = 0;
  for (const c of pageClaims) { claims += 1; if (!page.includes(c)) fail(`the How to Play copy never says "${c}"`); }
  for (const c of contentClaims) { claims += 1; if (!content.includes(c)) fail(`the game content never says "${c}"`); }
  console.log(`   ${claims} claims read off the meters module and found in the copy`);
}

console.log('');
if (failures) {
  console.error(`simClubManagerMeters: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simClubManagerMeters: PASS. The board meter is the sack race, the fans move with results, and every table prints its goals pair.');
