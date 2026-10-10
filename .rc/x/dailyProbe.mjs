// Reviewer probe (pools): the daily deals of Manager Hot Seat and Deadline Day, dumped from one source tree.
//   node dailyProbe.mjs dump <treeRoot> <out.json> [firstDate] [days]
//   node dailyProbe.mjs cmp <a.json> <b.json>         exit 1 when any deal differs
// Run from the repo root that has node_modules (esbuild is taken from there for either tree).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [mode, a, b, firstDate = '2026-10-10', daysArg = '15'] = process.argv.slice(2);
const sha = v => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

if (mode === 'cmp') {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
  let diff = 0;
  for (const key of Object.keys(A.rows)) {
    const x = A.rows[key], y = B.rows[key];
    if (!y) { console.log(`${key}: missing on the second tree`); diff += 1; continue; }
    const parts = [];
    for (const f of Object.keys(x.hash)) if (x.hash[f] !== y.hash[f]) parts.push(f);
    const keysOnly = k => `${k.filter(z => !y.stateKeys.includes(z)).join(',') || '-'} / ${y.stateKeys.filter(z => !x.stateKeys.includes(z)).join(',') || '-'}`;
    if (parts.length) {
      diff += 1;
      console.log(`DIFF ${key} (${x.club}, ${x.league}): ${parts.join(', ')} | state keys only first / only second: ${keysOnly(x.stateKeys)}`);
      if (x.line !== y.line) { console.log(`   first : ${x.line}`); console.log(`   second: ${y.line}`); }
    } else console.log(`same ${key} (${x.club}, ${x.league}) ${x.line.slice(0, 110)}`);
  }
  console.log(`\n${Object.keys(A.rows).length} deals compared, ${diff} differ. first=${A.tree} second=${B.tree}`);
  process.exit(diff ? 1 : 0);
}

const TREE = path.resolve(a);
const REPO = process.cwd();
const req = createRequire(pathToFileURL(path.join(REPO, 'package.json')).href);
const esbuild = req('esbuild');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pools-daily-'));
const fwd = p => p.split(path.sep).join('/');
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * as hs from '${fwd(path.join(TREE, 'src/lib/managerHotSeat.ts'))}';\nexport * as dd from '${fwd(path.join(TREE, 'src/lib/deadlineDay.ts'))}';\nexport * as cm from '${fwd(path.join(TREE, 'src/lib/clubManager.ts'))}';\n`);
const out = path.join(tmp, 'bundle.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
  alias: { '@': path.join(TREE, 'src') }, nodePaths: [path.join(REPO, 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { hs, dd, cm } = req(out);

// The league fixtures the save will play, read through the engine's own reader (they are not stored on the save).
const cal = s => (s.calendar || []).filter(e => e.type === 'league').map(e => { const f = cm.fixtureFor(s, e); return `${e.round}:${f ? (f.home === false ? '@' : '') + f.opponent : '?'}`; });
const logOf = run => run.log.map(m => [m.competition, m.opponent, m.home, m.myGoals, m.oppGoals, m.res, m.counts, m.pens, m.board, m.boardDelta, m.fans, m.morale, m.events]);
function play(start, mentality) {
  let run = start, guard = 0;
  while (!run.verdict && guard++ < 60) {
    if (hs.pendingPress(run)) { run = hs.answerHotSeatPress(run, 0); continue; }
    run = hs.playHotSeatMatch(run, mentality, null);
  }
  return run;
}
function hotSeat(setup) {
  const run = hs.startHotSeat(setup);
  const again = hs.startHotSeat(setup);
  const bal = play(run, 'balanced'), att = play(run, 'attacking');
  const replay = hs.replayHotSeat(setup, bal.actions);
  const opp = bal.log.map(m => `${m.home === false ? '@' : ''}${m.opponent} ${m.myGoals}-${m.oppGoals}`).join('; ');
  return {
    stateKeys: Object.keys(run.state).sort(),
    line: `opens wk ${run.takeover.week} pos ${run.takeover.position} pts ${run.takeover.points}/${run.takeover.played} target ${run.target} | ${opp} | ${bal.verdict ? bal.verdict.kind : 'no verdict'}`,
    hash: {
      takeover: sha([run.takeover, run.target, run.leash]),
      fixtures: sha(cal(run.state)),
      table: sha(run.state.table),
      squad: sha((run.state.squad || []).map(p => [p.name, p.position, p.rating, p.age])),
      balanced: sha([logOf(bal), bal.verdict, bal.points]),
      attacking: sha([logOf(att), att.verdict, att.points]),
      replaySame: String(sha([logOf(replay), replay.verdict]) === sha([logOf(bal), bal.verdict])),
      startTwice: String(sha([again.takeover, cal(again.state), again.state.table]) === sha([run.takeover, cal(run.state), run.state.table])),
      realList: String(run.state.realLeagueFixtures ?? 'none'),
    },
  };
}
function deadline(setup) {
  const run = dd.startDeadlineDay(setup);
  const t = run.targets.map(x => [x.mp.name, x.mp.club, x.mp.position, x.mp.rating, x.mp.price, x.mp.value, x.need]);
  return {
    stateKeys: Object.keys(run.state).sort(),
    raw: process.env.PROBE_RAW ? { sales: run.sales, bench: (run.state.squad || []).map(p => [p.id, p.name, p.position, p.rating, p.age]) } : undefined,
    line: `budget ${run.startBudget} | needs ${run.needs.map(n => `${n.label}>${n.min}`).join(',')} | targets ${run.targets.map(x => x.mp.name).join(', ')}`,
    hash: {
      needs: sha(run.needs), targets: sha(t), sales: sha(run.sales), budget: String(run.startBudget), ticker: sha(run.ticker),
      squad: sha((run.state.squad || []).map(p => [p.name, p.position, p.rating, p.age])),
      fixtures: sha(cal(run.state)), table: sha(run.state.table),
      realList: String(run.state.realLeagueFixtures ?? 'none'),
    },
  };
}
const rows = {};
const addDay = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const leagueOf = (date, club) => (hs.hotSeatPool(date).find(c => c.club === club) || {}).leagueId || '?';
const days = Number(daysArg);
const premier = { hs: [], dd: [] };
for (let i = 0; i < 400; i++) {
  const date = addDay(firstDate, i);
  const h = hs.dailyHotSeat(date), d = dd.dailyDeadlineDay(date);
  const hl = leagueOf(date, h.club), dl = leagueOf(date, d.club);
  if (hl === 'premier' && premier.hs.length < 4) premier.hs.push(date);
  if (dl === 'premier' && premier.dd.length < 4) premier.dd.push(date);
  const wantH = i < days || (hl === 'premier' && premier.hs.includes(date));
  const wantD = i < days || (dl === 'premier' && premier.dd.includes(date));
  if (wantH) rows[`hotseat ${date}`] = { club: h.club, league: hl, seed: h.seed, ...hotSeat({ club: h.club, seed: h.seed, daily: date }) };
  if (wantD) rows[`deadline ${date}`] = { club: d.club, league: dl, seed: d.seed, ...deadline({ club: d.club, seed: d.seed, daily: date }) };
}
// Free play on every Premier League club the pool holds today, one fixed seed: what a Premier League day looks like.
for (const c of hs.hotSeatPool(firstDate).filter(c => c.leagueId === 'premier').slice(0, Number(process.env.PROBE_FREE ?? 99))) {
  rows[`hotseat-free ${c.club}`] = { club: c.club, league: 'premier', seed: 20261010, ...hotSeat({ club: c.club, seed: 20261010 }) };
  rows[`deadline-free ${c.club}`] = { club: c.club, league: 'premier', seed: 20261010, ...deadline({ club: c.club, seed: 20261010 }) };
}
fs.writeFileSync(b, JSON.stringify({ tree: TREE, firstDate, days, premier, rows }, null, 1));
console.log(`dumped ${Object.keys(rows).length} deals from ${TREE}; first Premier League days: hot seat ${premier.hs.join(', ') || 'none in 400'}; deadline ${premier.dd.join(', ') || 'none in 400'}`);
