/* Club Manager: the match screen, and the one flow that leads into it.

   Round 472. His words (docs/TWEAKS-2026-08-28.md, the Club Manager arc):
   "Quick sim screen: stoppage time shown the way the big score apps do it,
   possession as percentages, real team names never 'them', center every text
   block, momentum graph reads as up and down swings." And, on the other half:
   "MERGE Play Match and Watch Live into one flow: manage the match live, or
   quick sim it."

   What was wrong for the player before this round, measured on the shipped
   build:

     - The other club had no name on its own report. The scorer column, the
       stats header, the ratings sheet and the live viewer's flow strip all
       said "Them", six places on two screens, so a 3-1 at Anfield printed
       "Them" three times and Liverpool once.
     - The clock said 90. Both halves ran past their whistle and the only
       trace of it was nine pixel grey text in the crowd line reading
       "+2' & +4' added", and the number itself was a roll with no connection
       to the half it followed.
     - Possession was "58" against "42" with no percent sign anywhere near it,
       two bare numbers that read as a count of something.
     - Four blocks inside the centred card were laid out ragged left.
     - The momentum graph was flat. It was drawn from the match's average (the
       lambda gap) plus a tenth of noise, so measured over 269 matches on the
       shipped engine it changed sign 1.09 times a match, the median match
       never crossed the line at all, and only 37.5 percent of matches put any
       part of the graph on both sides of it. A chart of one number is a bar.
     - And there were three buttons for two ways of playing one fixture, two
       of which (Play Match and Watch Live) were the same match with the pitch
       drawn or not drawn. Worse, the third was a different simulation: quick
       sim drew a whole match in one go while the live path drew the first half
       at kick off, two branches of playMyMatch, so the same fixture on the
       same seed could finish 2-1 one way and 0-0 the other.

   Sections. Every one of them renders the REAL components through
   react-dom/server over seeded matches from the real engine.

     1) The clock. Every report carries a board for both halves, the screen
        prints 45+n' and 90+m' as its own row, and the numbers on the screen
        are the report's own. The board is also checked against the half it
        followed: base (1 or 2) plus one minute per stoppage in that half
        (goals either side, cards, injuries) plus a short roll, capped at 5
        and 8.
     2) Possession. The two shares on the screen sum to 100, both carry a
        percent sign, and both are the report's own number.
     3) Both clubs named. Counted rather than string matched, because a check
        that looks for the word "Them" only ever finds the wording somebody
        already fixed: the screen has to name the opposition about as often as
        it names your own club, so any heading that stops naming a club drops
        the count whatever it says instead.
     4) Every text block centred: the card root centres its text and nothing
        inside it is left aligned.
     5) Momentum swings, measured as sign changes per match and as the share
        of matches whose graph reaches both sides of the line.
     6) One flow, two ways, one match. The same fixture on the same seed
        played live (with nobody touching the interval) and quick simmed must
        end identically: score, scorers with their minutes, possession,
        momentum, stoppage and expected goals. Plus the path count in the
        source, so a third way of playing a match fails here rather than
        quietly becoming a second engine.

   Negative controls (house rule: prove the checks can fail). Each refuses to
   run if its rewrite found nothing to rewrite.
     MATCH_SCREEN_CONTROL=noclock     the clock row leaves the card, the
       pre-472 screen. Section 1 must go red.
     MATCH_SCREEN_CONTROL=bareposs    possession loses its percent sign and
       the two shares stop summing to 100. Section 2 must go red.
     MATCH_SCREEN_CONTROL=them        the opposition's headings go back to
       "Them" and "Their top rated". Section 3 must go red.
     MATCH_SCREEN_CONTROL=ragged      the stats block goes back to text-left.
       Section 4 must go red.
     MATCH_SCREEN_CONTROL=flat        the pre-472 momentum line, the match's
       average plus noise. Section 5 must go red.
     MATCH_SCREEN_CONTROL=twoengines  the quick path kicks off a second time
       instead of playing the half it already kicked off, which is the failure
       the two branches produced: the same fixture ends two different ways.
       Section 6 must go red.

   Thresholds, from this harness on its own seed and on SIM_SEED=1, 2, 3, and
   from measuring the pre-472 engine over the same clubs (2026-09-06):
     momentum sign changes per match   fixed 2.45 to 2.88   flat control 1.22    floor 1.9
     matches reaching both sides       fixed 75.9 to 86.8%  flat control 45.4%   floor 62%
     (the flat control's numbers match the pre-472 engine measured over the
      same six clubs on 2026-09-06: 1.09 to 1.20 sign changes, 37 to 43%)
     opposition named, mean a report   fixed 4.7 to 4.8   them control 2         floor 3.5
     opposition named, worst report    fixed 3 (a goalless draw)                 floor 3
     reports rendered                  fixed 174                                 floor 60
     live viewers rendered             fixed 12                                  floor 10
     seeded pairs replayed both ways   fixed 24                                  floor 20
     distinct scorelines in the pairs  fixed 13                                  floor 4

   Run: node scripts/simMatchScreen.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.MATCH_SCREEN_CONTROL || '';
const CONTROLS = ['noclock', 'bareposs', 'them', 'ragged', 'flat', 'twoengines'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`MATCH_SCREEN_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
let section = 0;
const failedIn = new Set();
const fail = m => { failures += 1; failedIn.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const runtimeErrors = [];
const recordRuntimeError = error => runtimeErrors.push(String(error?.stack ?? error));
process.on('unhandledRejection', recordRuntimeError);
process.on('uncaughtExceptionMonitor', recordRuntimeError);
const lf = s => s.replaceAll('\r\n', '\n');
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

/* ---- the engine and the two match screens, regressed when a control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'MatchReportCard.tsx');
const PAGE = path.join(ROOT, 'src', 'pages', 'ClubManager.tsx');
const sourceBefore = {}, verifySources = [];
for (const file of [ENGINE, CARD, PAGE]) {
  const bytes = fs.readFileSync(file);
  sourceBefore[path.relative(ROOT, file).replaceAll('\\', '/')] = createHash('sha256').update(bytes).digest('hex');
  verifySources.push(() => assert.deepEqual(fs.readFileSync(file), bytes, 'Original match sources remain unchanged'));
}
const mutations = [];
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
let cardPath = `${ROOT_URL}/src/components/club-manager/MatchReportCard.tsx`;

function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    if (src.split(from).length !== 2) {
      console.error(`control cannot run: ${what} is not in the shape MATCH_SCREEN_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
      process.exit(1);
    }
    const changed = src.replace(from, to);
    assert.notEqual(changed, src, 'An executable match-screen control actually changes its copied source');
    mutations.push({ file: path.relative(ROOT, file).replaceAll('\\', '/'), anchor: from, replacement: to });
    src = changed;
  }
  const out = `${TMP}/${process.pid}.${outName}`;
  fs.writeFileSync(out, src);
  const artifacts = path.resolve(process.env.MATCH_SCREEN_ARTIFACTS || path.join(ROOT, 'cm-quick-subs-artifacts/match-screen'));
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, `${CONTROL}-${path.basename(file)}.txt`), src);
  return out;
}

if (CONTROL === 'noclock') {
  cardPath = rewrite(CARD, [['        {detail?.added && (\n', '        {false && detail?.added && (\n']],
    'MatchReportCard.noclock.tsx', 'the clock row');
  console.log('NEGATIVE CONTROL ON: the report carries no clock row, the pre-472 screen; section 1 must go red');
}
if (CONTROL === 'bareposs') {
  cardPath = rewrite(CARD, [
    ['      <StatBar label="Possession" mine={stats.possession} theirs={100 - stats.possession} suffix="%" />\n',
      '      <StatBar label="Possession" mine={stats.possession} theirs={100 - stats.possession} />\n'],
    ['data-cm-poss="theirs">{100 - detail.stats.possession}%</span>',
      'data-cm-poss="theirs">{detail.stats.possession}</span>'],
  ], 'MatchReportCard.bareposs.tsx', 'the possession pair');
  console.log('NEGATIVE CONTROL ON: possession is two bare numbers that do not sum to 100; section 2 must go red');
}
if (CONTROL === 'them') {
  cardPath = rewrite(CARD, [
    ['<div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 truncate">{opponent}</div>',
      '<div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 truncate">Them</div>'],
    ['<span className="font-bold normal-case truncate">{opponent}</span>',
      '<span className="font-bold normal-case truncate">Them</span>'],
    ['mb-0.5 truncate">{opponent} best</div>', 'mb-0.5 truncate">Their top rated</div>'],
  ], 'MatchReportCard.them.tsx', "the opposition's headings");
  console.log('NEGATIVE CONTROL ON: the opposition is called Them again; section 3 must go red');
}
if (CONTROL === 'ragged') {
  cardPath = rewrite(CARD, [['    <div className="space-y-2">\n', '    <div className="space-y-2 text-left">\n']],
    'MatchReportCard.ragged.tsx', 'the stats block');
  console.log('NEGATIVE CONTROL ON: the stats block is left aligned inside a centred card; section 4 must go red');
}
if (CONTROL === 'flat') {
  enginePath = rewrite(ENGINE, [[
    '    let v = had > 0\n      ? 0.74 * ((myChances[b] - oppChances[b]) / had) + 0.26 * base\n      : 0.45 * base + (Math.random() * 0.24 - 0.12);\n',
    '    let v = base + (Math.random() * 0.3 - 0.15);\n',
  ]], 'clubManager.flat.ts', 'the momentum bucket');
  console.log('NEGATIVE CONTROL ON: momentum is the pre-472 line, the match average plus noise; section 5 must go red');
}
if (CONTROL === 'twoengines') {
  enginePath = rewrite(ENGINE, [[
    /* Release AL: playNextEntry reaches the coach through `coached` now. */
    '    state.live = live;\n    return resumeMatch(coached(state));\n',
    '    state.live = kickOff(state, entry);\n    return resumeMatch(coached(state));\n',
  ]], 'clubManager.twoengines.ts', 'the quick path');
  console.log('NEGATIVE CONTROL ON: the quick path kicks off a second half of its own, so the two ways stop agreeing; section 6 must go red');
}

/* One CommonJS bundle: the engine and both match screens, the
   simClubManagerMeters recipe. A rewritten card imports the engine through
   the alias, the untouched file on disk, and it is a pure function of the
   report it is handed, so that is fine. The process id is in every temp name
   so seeds and controls can run side by side. */
const ENTRY = `${TMP}/matchScreen.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/matchScreen.${process.pid}.bundle.cjs`;
// Preserve the historical unmanaged parity arm. Automatic coaching has its own outcomes.
const noCoachPath = `${TMP}/clubManager.noCoach.${process.pid}.ts`;
const coachHeader = 'export function coachQuickMatch(career: CareerState): CareerState {\n';
const paritySource = lf(fs.readFileSync(enginePath, 'utf8'));
if (paritySource.split(coachHeader).length !== 2) throw new Error('One current coach export is required for unmanaged parity');
fs.writeFileSync(noCoachPath, paritySource.replace(coachHeader, coachHeader + '  return career;\n'));
process.on('exit', () => fs.rmSync(noCoachPath, { force: true }));
fs.writeFileSync(ENTRY, `
export * as cm from '${enginePath}';
export * as noCoach from '${noCoachPath}';
export { MatchReportCard } from '${cardPath}';
export { LiveSimScreen } from '${ROOT_URL}/src/components/club-manager/LiveSimScreen.tsx';
export { MatchCentre } from '${ROOT_URL}/src/components/club-manager/MatchCentre.tsx';
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
const { cm, noCoach, MatchReportCard, LiveSimScreen, MatchCentre, render } = createRequire(import.meta.url)(BUNDLE);
const { startCareer, playNextEntry, resumeMatch } = cm;

/* ---- reading a rendered screen ---- */
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&#x2F;': '/' };
const visible = html => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&[a-zA-Z#0-9x]+;/g, m => ENTITIES[m] ?? ' ')
  .replace(/\s+/g, ' ')
  .trim();
const countOf = (text, needle) => {
  if (!needle) return 0;
  let n = 0;
  let i = text.indexOf(needle);
  while (i >= 0) { n += 1; i = text.indexOf(needle, i + needle.length); }
  return n;
};
const attr = (html, name) => {
  const out = [];
  const rx = new RegExp(`${name}="([^"]*)"`, 'g');
  let m;
  while ((m = rx.exec(html))) out.push(m[1]);
  return out;
};
/** The percentage a data-cm-poss span actually prints, straight off the markup. */
const possShown = (html, which) => {
  const m = html.match(new RegExp(`data-cm-poss="${which}"[^>]*>([^<]*)<`));
  return m ? m[1].trim() : null;
};
const addedShown = (html, which) => {
  const m = html.match(new RegExp(`data-cm-added="${which}"[^>]*>([\\s\\S]*?)</span>`));
  return m ? visible(m[1]) : null;
};

/* ---- a seeded stream I can rewind, on top of the harness's own ---- */
const HOUSE_RANDOM = Math.random;
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; }
}

/* ---- a season of real matches, quick simmed the way the hub does it ---- */
const CLUBS = ['Everton', 'Real Madrid', 'Wolves', 'Napoli', 'Ajax', 'Newcastle'];
const played = [];   // { report, clubName }
for (const club of CLUBS) {
  let state = startCareer(club);
  let guard = 0;
  while (state.week < state.calendar.length && guard < 30) {
    guard += 1;
    const res = playNextEntry(state, { skipHalftime: true });
    state = res.state;
    if (res.kind === 'seasonOver') break;
    if (res.kind === 'match' && res.report) played.push({ report: res.report, clubName: club, live: state.live ?? null });
  }
}
if (played.length < 60) fail(`only ${played.length} matches to render, the walk is too shallow to measure anything`);

/* Render each one once, and read every section off the same markup. */
const screens = played.map(p => ({
  ...p,
  html: render(MatchReportCard, { report: p.report, clubName: p.clubName, onContinue: () => {} }),
}));

/* ---------- 1. the clock ---------- */
section = 1;
console.log('1) The clock: stoppage time on the screen, for both halves, from the half it followed');
let clocks = 0;
for (const s of screens) {
  const d = s.report.detail;
  const ctx = `${s.clubName} ${s.report.home} ${s.report.homeGoals}-${s.report.awayGoals} ${s.report.away}`;
  if (!d || !d.added) { fail(`${ctx}: the report carries no stoppage time`); continue; }
  if (!isNum(d.added.h1) || !isNum(d.added.h2)) { fail(`${ctx}: stoppage time is not a number`); continue; }
  /* The board against the half it followed. Goals either side, cards and
     injuries stop a game; the only subs this sim makes are at the break. */
  const stops = (from, to) => d.timeline.filter(e => e.minute > from && e.minute <= to
    && (e.kind === 'goal' || e.kind === 'yellow' || e.kind === 'red' || e.kind === 'injury')).length;
  const h1Lo = Math.min(5, 1 + stops(0, 45));
  const h2Lo = Math.min(8, 2 + stops(45, 90));
  {
    const STOP = new Set(['goal', 'yellow', 'red', 'injury']);
    const M = (globalThis.__MEASURE__ ??= { halves: [], kinds: new Set() });
    for (const e of d.timeline) M.kinds.add(e.kind);
    for (const [half, from, to, base, roll, hi, added] of [['h1', 0, 45, 1, 1, 5, d.added.h1], ['h2', 45, 90, 2, 2, 8, d.added.h2]]) {
      const all = stops(from, to);
      const inBoard = d.timeline.filter(e => e.minute === to && (e.plus ?? 0) > 0 && STOP.has(e.kind)).length;
      const subs = d.timeline.filter(e => e.minute > from && e.minute <= to && e.kind === 'sub').length;
      const lo = Math.min(hi, base + all), up = Math.min(hi, lo + roll);
      const loReg = Math.min(hi, base + all - inBoard), upReg = Math.min(hi, loReg + roll);
      M.halves.push({ ctx, half, added, all, inBoard, subs, out: added < lo ? 'below' : added > up ? 'above' : '', outReg: added < loReg ? 'below' : added > upReg ? 'above' : '',
        excess: added - (base + all), excessReg: added - (base + all - inBoard), clamped: base + all >= hi,
        line: d.timeline.filter(e => e.minute > from && e.minute <= to).map(e => e.minute + (e.plus ? '+' + e.plus : '') + ':' + e.kind).join(' ') });
    }
  }
  const one = addedShown(s.html, 'h1');
  const two = addedShown(s.html, 'h2');
  if (one !== `45+${d.added.h1}'`) fail(`${ctx}: the screen's first half clock reads "${one}", the report says 45+${d.added.h1}'`);
  if (two !== `90+${d.added.h2}'`) fail(`${ctx}: the screen's second half clock reads "${two}", the report says 90+${d.added.h2}'`);
  const text = visible(s.html);
  if (!text.includes(`45+${d.added.h1}'`) || !text.includes(`90+${d.added.h2}'`)) {
    fail(`${ctx}: the clock is not readable text on the screen`);
  }
  clocks += 1;
}
{
  const M = globalThis.__MEASURE__;
  const hist = (rows, key) => { const h = {}; for (const r of rows) h[r[key]] = (h[r[key]] ?? 0) + 1; return JSON.stringify(Object.fromEntries(Object.entries(h).sort((a, b) => Number(a[0]) - Number(b[0])))); };
  for (const half of ['h1', 'h2']) {
    const rows = M.halves.filter(r => r.half === half), free = rows.filter(r => !r.clamped);
    const out = rows.filter(r => r.out), outReg = rows.filter(r => r.outReg);
    console.log('MEASURE ' + half + ': halves ' + rows.length + ', out of the harness band ' + out.length + ' (below ' + out.filter(r => r.out === 'below').length + ', above ' + out.filter(r => r.out === 'above').length + '); of those with a stoppage inside the board ' + out.filter(r => r.inBoard > 0).length + ', with a sub in the half ' + out.filter(r => r.subs > 0).length);
    console.log('MEASURE ' + half + ': counting regulation stoppages only, out of band ' + outReg.length + ' (below ' + outReg.filter(r => r.outReg === 'below').length + ', above ' + outReg.filter(r => r.outReg === 'above').length + '); with a sub in the half ' + outReg.filter(r => r.subs > 0).length + '; halves with a sub at all ' + rows.filter(r => r.subs > 0).length + ', with a stoppage inside the board ' + rows.filter(r => r.inBoard > 0).length);
    console.log('MEASURE ' + half + ': excess over base plus all stoppages, unclamped halves ' + hist(free, 'excess') + '; over base plus regulation stoppages ' + hist(free, 'excessReg'));
    for (const r of [...out, ...outReg.filter(x => !x.out)].slice(0, 10)) console.log('MEASURE ' + half + ' OUT ' + (r.out || '-') + '/' + (r.outReg || '-') + ' ' + r.ctx + ': +' + r.added + ', stoppages ' + r.all + ' (' + r.inBoard + ' in the board), subs ' + r.subs + ' | ' + r.line);
  }
  console.log('MEASURE kinds on the timelines: ' + [...M.kinds].sort().join(', '));
  console.log('MEASURE DONE seed ' + (process.env.SIM_SEED || 'default') + ', reports ' + clocks);
  process.exit(0);
}
if (clocks < 60) fail(`only ${clocks} screens showed a clock`);
console.log(`   ${clocks} reports rendered, every one showing 45+n' and 90+m' as the screen's own row`);
{
  const h1s = screens.map(s => s.report.detail?.added?.h1).filter(isNum);
  const h2s = screens.map(s => s.report.detail?.added?.h2).filter(isNum);
  console.log(`   first half board ${Math.min(...h1s)} to ${Math.max(...h1s)} (mean ${mean(h1s).toFixed(2)}), second half ${Math.min(...h2s)} to ${Math.max(...h2s)} (mean ${mean(h2s).toFixed(2)})`);
}

/* ---------- 2. possession ---------- */
section = 2;
console.log('2) Possession: two shares of one hundred, both wearing a percent sign');
let possChecked = 0;
for (const s of screens) {
  const d = s.report.detail;
  if (!d) continue;
  const ctx = `${s.clubName} v ${s.report.home === s.clubName ? s.report.away : s.report.home}`;
  const mineTxt = possShown(s.html, 'mine');
  const theirsTxt = possShown(s.html, 'theirs');
  if (mineTxt === null || theirsTxt === null) { fail(`${ctx}: the screen prints no possession pair`); continue; }
  if (!/^\d+%$/.test(mineTxt) || !/^\d+%$/.test(theirsTxt)) {
    fail(`${ctx}: possession reads "${mineTxt}" and "${theirsTxt}", which is not two percentages`);
    continue;
  }
  const mineN = Number(mineTxt.slice(0, -1));
  const theirsN = Number(theirsTxt.slice(0, -1));
  if (mineN + theirsN !== 100) fail(`${ctx}: possession ${mineTxt} and ${theirsTxt} sum to ${mineN + theirsN}`);
  if (mineN !== d.stats.possession) fail(`${ctx}: the screen says ${mineTxt}, the sim says ${d.stats.possession}`);
  /* And the stats bar above it says the same thing in the same units. */
  const bar = visible(s.html).match(/(\d+)% POSSESSION (\d+)%/i);
  if (!bar) fail(`${ctx}: the possession stat bar does not print two percentages`);
  else if (Number(bar[1]) + Number(bar[2]) !== 100) fail(`${ctx}: the stat bar's possession pair sums to ${Number(bar[1]) + Number(bar[2])}`);
  else if (Number(bar[1]) !== d.stats.possession) fail(`${ctx}: the stat bar says ${bar[1]}%, the sim says ${d.stats.possession}`);
  possChecked += 1;
}
if (possChecked < 60) fail(`only ${possChecked} possession pairs checked`);
console.log(`   ${possChecked} pairs on screen, every one summing to 100 and every one the sim's own share`);

/* ---------- 3. both clubs named ---------- */
section = 3;
console.log('3) Both clubs named, counted rather than string matched');
let namings = [];
let liveScreens = 0;
for (const s of screens) {
  const opponent = s.report.home === s.clubName ? s.report.away : s.report.home;
  const text = visible(s.html);
  const mine = countOf(text, s.clubName);
  const theirs = countOf(text, opponent);
  namings.push(theirs);
  const ctx = `${s.clubName} v ${opponent}`;
  /* Three is the structural floor: the scoreboard, the stats header and the
     momentum axis name both clubs on every report there is, and a scoring
     match and a rated opposition add one each on top. */
  if (theirs < 3) fail(`${ctx}: the other club is named ${theirs} times on its own report`);
  if (mine < 3) fail(`${ctx}: my club is named ${mine} times on the report`);
  /* Symmetry: every heading that names one side names the other. The events
     block is prose and may name either club any number of times, so this asks
     only that the opposition is never the side left unnamed. */
  if (theirs < mine - 1) fail(`${ctx}: named mine ${mine} times and theirs ${theirs}`);
  /* And the label that used to stand in for the name is gone as a label. */
  if (/(^|[\s>])Them([\s(]|$)/.test(text)) fail(`${ctx}: the screen still labels a block "Them"`);
}
/* The other way through the same flow, the live viewer, holds the same rule. */
for (const p of played.slice(0, 12)) {
  const career = { ...startCareer(p.clubName) };
  const html = render(LiveSimScreen, {
    career,
    live: null,
    report: p.report,
    clubColor: '#ffffff',
    onSub: () => {}, onShape: () => {}, onTalk: () => {}, onSecondHalf: () => {}, onExit: () => {},
  });
  const opponent = p.report.home === p.clubName ? p.report.away : p.report.home;
  const text = visible(html);
  if (!text.includes(opponent)) fail(`the live viewer never names ${opponent}`);
  if (!text.includes(p.clubName)) fail(`the live viewer never names ${p.clubName}`);
  if (/(^|[\s>])Them([\s(]|$)/.test(text)) fail('the live viewer still labels the flow strip "Them"');
  liveScreens += 1;
}
if (liveScreens < 10) fail(`only ${liveScreens} live viewers rendered`);
/* The measured separation: on the pre-472 screen the other club was named
   once, on the scoreboard, while my own club was named three times. */
const meanNaming = mean(namings);
if (!(meanNaming >= 3.5)) fail(`the other club is named ${meanNaming.toFixed(2)} times a report, the floor is 3.5 (the pre-472 report named it once)`);
console.log(`   ${screens.length} reports name the other club ${Math.min(...namings)} to ${Math.max(...namings)} times (mean ${meanNaming.toFixed(1)}, floor 3.5), and ${liveScreens} live viewers name both clubs`);

/* ---------- 4. every text block centred ---------- */
section = 4;
console.log('4) Every text block centred inside the card');
let centred = 0;
for (const s of screens) {
  const ctx = `${s.clubName} v ${s.report.home === s.clubName ? s.report.away : s.report.home}`;
  if (!/class="[^"]*\btext-center\b/.test(s.html)) fail(`${ctx}: the card does not centre its text at all`);
  const ragged = attr(s.html, 'class').filter(c => /\btext-left\b/.test(c));
  if (ragged.length) fail(`${ctx}: ${ragged.length} block(s) on the card are left aligned, first "${ragged[0].slice(0, 50)}"`);
  centred += 1;
}
console.log(`   ${centred} cards rendered, 0 left aligned blocks, every card centring its text`);

/* ---------- 5. momentum swings ---------- */
section = 5;
console.log('5) Momentum reads as swings, not as one number');
const signChanges = series => {
  let n = 0;
  let prev = 0;
  for (const v of series) {
    const s = v > 0 ? 1 : v < 0 ? -1 : 0;
    if (s === 0) continue;
    if (prev !== 0 && s !== prev) n += 1;
    prev = s;
  }
  return n;
};
const swings = [];
let bothSides = 0;
let drawn = 0;
for (const s of screens) {
  const d = s.report.detail;
  if (!d) continue;
  const ctx = `${s.clubName} v ${s.report.home === s.clubName ? s.report.away : s.report.home}`;
  /* Round 670: twelve buckets when the match went to extra time. */
  if (d.momentum.length !== (d.et ? 12 : 9)) { fail(`${ctx}: ${d.momentum.length} momentum buckets`); continue; }
  for (const v of d.momentum) if (!isNum(v) || v < -1 || v > 1) fail(`${ctx}: momentum bucket ${v}`);
  swings.push(signChanges(d.momentum));
  if (d.momentum.some(v => v > 0) && d.momentum.some(v => v < 0)) bothSides += 1;
  /* The picture is the sim's own series, never a redrawing of it. */
  const shown = attr(s.html, 'data-cm-momentum')[0];
  if (shown === undefined) fail(`${ctx}: the momentum chart does not carry the series it drew`);
  else if (shown !== d.momentum.join(' ')) fail(`${ctx}: the chart drew "${shown}" for a report holding "${d.momentum.join(' ')}"`);
  drawn += 1;
}
const meanSwings = mean(swings);
const bothShare = bothSides / Math.max(1, drawn);
if (!(meanSwings >= 1.9)) fail(`momentum changes sign ${meanSwings.toFixed(2)} times a match, the floor is 1.9 (the pre-472 chart measured 1.09 to 1.20)`);
if (!(bothShare >= 0.62)) fail(`only ${(100 * bothShare).toFixed(1)} percent of matches put momentum on both sides of the line, the floor is 62 (pre-472 measured 37 to 43)`);
if (drawn < 60) fail(`only ${drawn} momentum series measured`);
console.log(`   ${drawn} charts: ${meanSwings.toFixed(2)} sign changes a match (floor 1.9), ${(100 * bothShare).toFixed(1)} percent reach both sides (floor 62)`);
console.log(`   every chart drew the report's own nine buckets`);

/* ---------- 6. one flow, two ways, one match ---------- */
section = 6;
console.log('6) Historical no-coach baseline: the same fixture and seed finish identically');
const sameKeys = r => JSON.stringify({
  home: r.home, away: r.away, hg: r.homeGoals, ag: r.awayGoals,
  decidedBy: r.decidedBy,
  mine: r.myScorers.map(s => `${s.name} ${s.minute} ${s.assist ?? ''}`),
  theirs: r.oppScorers.map(s => `${s.name} ${s.minute}`),
  poss: r.detail?.stats.possession,
  xg: r.detail?.stats.xg,
  oppXg: r.detail?.stats.oppXg,
  shots: r.detail?.stats.shots,
  added: r.detail?.added,
  momentum: r.detail?.momentum,
});
let pairs = 0;
const scorelines = new Set();
for (const club of ['Everton', 'Real Madrid', 'Wolves', 'Ajax']) {
  /* One career per club, built on a fixed stream so the two replays below
     start from the same save byte for byte. */
  let base = withSeed(4100 + club.length, () => startCareer(club));
  for (let k = 0; k < 6; k++) {
    const seed = 90001 + pairs * 7919;
    const liveRun = withSeed(seed, () => {
      const stop = noCoach.playNextEntry(base);
      if (stop.kind !== 'halftime') return stop;
      /* A manager who walks in, changes nothing and walks back out. */
      return noCoach.resumeMatch(stop.state);
    });
    const quickRun = withSeed(seed, () => noCoach.playNextEntry(base, { skipHalftime: true }));
    if (liveRun.kind !== quickRun.kind) {
      fail(`${club}: live gave "${liveRun.kind}" and the quick sim gave "${quickRun.kind}" for the same entry`);
      base = quickRun.state;
      continue;
    }
    if (liveRun.kind === 'match' && liveRun.report && quickRun.report) {
      const a = sameKeys(liveRun.report);
      const b = sameKeys(quickRun.report);
      if (a !== b) {
        fail(`${club} week ${base.week}: the two ways played different matches\n        live : ${a.slice(0, 200)}\n        quick: ${b.slice(0, 200)}`);
      }
      if (liveRun.state.week !== quickRun.state.week) {
        fail(`${club}: live left the calendar on week ${liveRun.state.week}, the quick sim on ${quickRun.state.week}`);
      }
      scorelines.add(`${liveRun.report.homeGoals}-${liveRun.report.awayGoals}`);
      pairs += 1;
    }
    if (quickRun.kind === 'seasonOver') break;
    base = quickRun.state;
  }
}
if (pairs < 20) fail(`only ${pairs} fixtures were replayed both ways`);
if (scorelines.size < 4) fail(`the ${pairs} pairs produced only ${scorelines.size} distinct scorelines, so the comparison had nothing in it`);
console.log(`   ${pairs} fixtures replayed both ways, ${scorelines.size} distinct scorelines, every pair identical down to the momentum series`);

/* The path count, so a third way of playing a match fails here rather than
   quietly becoming a second engine. Read off the code with the comments
   stripped, because prose about a rule is the one place its words are
   guaranteed to appear. */
{
  const engineSrc = stripComments(lf(fs.readFileSync(enginePath, 'utf8')));
  const calls = engineSrc.match(/(?<!function )playMyMatch\(/g) ?? [];
  if (calls.length !== 1) fail(`the engine holds ${calls.length} calls to playMyMatch, and both paths share one settlement`);
  const withLive = engineSrc.match(/playMyMatch\(state, entry, [a-zA-Z]/g) ?? [];
  if (withLive.length !== 1) fail(`${withLive.length} settlement calls hand over a kicked off match; the shared settlement must`);
  /* Release AL: both quick paths reach the coach through `coached`, the one
     switch Manager Hot Seat's noCoach turns off, so the count is of that
     call and the switch itself must exist exactly once and be the coach. */
  const coached = engineSrc.match(/resumeMatch\(coached\(state\)\)/g) ?? [];
  if (coached.length !== 2) fail(`${coached.length} Quick paths use the same coach and settlement; both must`);
  const coachSwitch = engineSrc.match(/const coached = \(s: CareerState\): CareerState => \(opts\?\.noCoach \? s : coachQuickMatch\(s\)\);/g) ?? [];
  if (coachSwitch.length !== 1) fail(`${coachSwitch.length} switches decide whether the quick sim coach runs; there is one, and it calls the coach unless noCoach is passed`);
  const kickOffs = engineSrc.match(/\bkickOff\(state, entry(?:, opts\?\.varReviews)?\)/g) ?? [];
  if (kickOffs.length !== 1) fail(`${kickOffs.length} places kick a match off, and there is one`);
  /* And the two screens that start a match. The hub is counted in the source
     because it only draws with a save; the Match Centre is rendered and every
     button on it counted, so a third way of playing a match fails here
     whether or not whoever adds it marks it as one. */
  const pageSrc = stripComments(lf(fs.readFileSync(PAGE, 'utf8')));
  const hubWays = (pageSrc.match(/data-cm-way="/g) ?? []).length;
  if (hubWays !== 2) fail(`the hub offers ${hubWays} ways into a match, and it offers two`);
  const facts = cm.matchFacts(startCareer('Everton'));
  const centre = render(MatchCentre, {
    career: startCareer('Everton'), facts, clubColor: '#ffffff',
    tone: null, onTone: () => {}, talkRead: null, talkStale: false,
    onQuickSim: () => {}, onLive: () => {}, onBack: () => {},
  });
  const centreButtons = (centre.match(/<button/g) ?? []).length;
  const centreWays = attr(centre, 'data-cm-way');
  if (centreWays.length !== 2 || !centreWays.includes('live') || !centreWays.includes('quick')) {
    fail(`the Match Centre offers ${centreWays.length} ways into a match (${centreWays.join(', ')}), and it offers live and quick`);
  }
  if (centreButtons !== 7) {
    fail(`the Match Centre draws ${centreButtons} buttons; it draws 7 (back, four team talk tones, and the two ways to play), so a new one has appeared`);
  }
  console.log(`   the engine plays a match in ${calls.length} places, both off one kick off, and each of the two screens offers exactly 2 ways in (${centreButtons} buttons on the Match Centre)`);
}

await new Promise(resolve => setImmediate(resolve));
for (const verify of verifySources) verify();
assert.deepEqual(runtimeErrors, [], 'Runtime errors never receive match-screen control credit');
const artifacts = path.resolve(process.env.MATCH_SCREEN_ARTIFACTS || path.join(ROOT, 'cm-quick-subs-artifacts/match-screen'));
fs.mkdirSync(artifacts, { recursive: true });
const intended = { noclock: 1, bareposs: 2, them: 3, ragged: 4, flat: 5, twoengines: 6 };
let independentBaseline = null;
if (CONTROL) {
  const baseline = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    cwd: ROOT, env: { ...process.env, MATCH_SCREEN_CONTROL: '', MATCH_SCREEN_ARTIFACTS: artifacts },
    encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  });
  const output = `${baseline.stdout || ''}\n${baseline.stderr || ''}`;
  fs.writeFileSync(path.join(artifacts, `${CONTROL}-independent-baseline.log`), output);
  independentBaseline = baseline.status === 0 && !baseline.error && !baseline.signal
    && output.includes('simMatchScreen: PASS.') && !/ReferenceError|TypeError|Unhandled (?:Error|Rejection)/.test(output);
}
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(runtimeErrors, [], 'Neither the control nor its baseline produces a runtime error');
for (const verify of verifySources) verify();
const sourceAfter = {};
for (const file of [ENGINE, CARD, PAGE]) {
  const bytes = fs.readFileSync(file);
  sourceAfter[path.relative(ROOT, file).replaceAll('\\', '/')] = createHash('sha256').update(bytes).digest('hex');
}
assert.deepEqual(sourceAfter, sourceBefore, 'All original match-source hashes remain held through the baseline');
fs.writeFileSync(path.join(artifacts, `${CONTROL || 'normal'}-report.json`), JSON.stringify({
  control: CONTROL || 'normal', intendedSection: intended[CONTROL] ?? null,
  failedSections: [...failedIn].sort(), failureCount: failures, independentBaseline,
  runtimeErrors, sourceBefore, sourceAfter, mutations,
}, null, 2));
if (CONTROL) {
  assert.deepEqual([...failedIn].sort(), [intended[CONTROL]], 'Only the intended match-screen section fails');
  assert.ok(failures > 0, 'The copied fault fails an actual outcome');
  assert.equal(independentBaseline, true, 'The untouched full match-screen baseline passes independently');
  console.log(`\nsimMatchScreen: PASS. Effective ${CONTROL} fault failed only section ${intended[CONTROL]}; untouched baseline passed and source bytes held.`);
} else {
  console.log(failures === 0
    ? '\nsimMatchScreen: PASS. One match, two ways through it, and a report that names both clubs, shows the clock it ran to, splits the ball two ways and draws a graph that moves.'
    : `\nsimMatchScreen: ${failures} FAILURES`);
}
process.off('unhandledRejection', recordRuntimeError); process.off('uncaughtExceptionMonitor', recordRuntimeError);
process.exit(CONTROL || failures === 0 ? 0 : 1);
