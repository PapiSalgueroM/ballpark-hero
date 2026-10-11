/* Reviewer cm, Release AV: do Manager Hot Seat and Deadline Day deal what Release AS dealt, for 60 dates?
 * usage: node .rc/x/cmDailiesProbe.mjs <root of 54e3820a> [first date] [days]
 * The deal is the one scripts/simDailyDeals.mjs defines (what a player is handed and what happens when the day
 * is played one fixed way), dealt by a FRESH copy of each tree's module for every date. On the head it also
 * asks: does any daily state carry a league book or the real fixture key, at the start, after every match and
 * in the career handed over to Club Manager? */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = path.resolve(process.argv[2] || '');
const FIRST = process.argv[3] || '2026-10-11';
const DAYS = Number(process.argv[4] || 60);
if (!fs.existsSync(path.join(BASE, 'src/lib/managerHotSeat.ts'))) { console.error('no base'); process.exit(2); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-cm-daily-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const sha = v => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 20);

async function bundleOf(label, root) {
  const entry = path.join(work, `${label}.ts`);
  const P = f => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as hs from ${P('src/lib/managerHotSeat.ts')};\nexport * as dd from ${P('src/lib/deadlineDay.ts')};\n`);
  const out = path.join(work, `${label}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
  return () => { delete req.cache[req.resolve(out)]; store.clear(); return req(out); };
}
const carries = s => ['leagueBook', 'realLeagueFixtures'].filter(k => s && k in s);

function hotSeat(fresh, date, look) {
  const { hs } = fresh();
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  const found = new Set(carries(run.state));
  const opened = [setup.club, setup.seed, run.takeover, run.target, hs.upcoming(run), run.state.table];
  let guard = 0;
  while (!run.verdict && guard++ < 40) {
    run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
    carries(run.state).forEach(k => found.add(k));
  }
  const played = [run.log.map(m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res]), run.verdict ? [run.verdict.kind, run.points] : null, run.verdict ? hs.shareText(run) : null];
  let handed = 'n/a';
  if (look && typeof hs.handoverState === 'function') {
    try { const h = hs.handoverState(run); handed = h ? (carries(h).join('+') || 'clean') : 'null'; } catch (e) { handed = `threw ${String(e).slice(0, 80)}`; }
  }
  return { club: setup.club, digest: sha([opened, played]), found: [...found], handed, verdict: run.verdict ? run.verdict.kind : 'none', stateKeys: Object.keys(run.state).sort().join(',') };
}
function deadline(fresh, date) {
  const { dd } = fresh();
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.startDeadlineDay(setup);
  const ended = dd.endDay(run);
  const grade = dd.gradeWindow(ended);
  return { club: setup.club, digest: sha([setup.club, setup.seed, run.needs, run.targets, run.sales, run.startBudget, run.ticker, grade]), found: [...new Set([...carries(run.state), ...carries(ended.state)])], stateKeys: Object.keys(run.state).sort().join(',') };
}

const head = await bundleOf('head', HEAD);
const base = await bundleOf('base', BASE);
const dates = [];
{ const d = new Date(`${FIRST}T12:00:00Z`); for (let i = 0; i < DAYS; i += 1) { dates.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } }
let moved = 0, carried = 0, handedBad = 0; const clubs = { hot: new Set(), dead: new Set() }; const verdicts = {}; let keyDiff = 0; const handedSeen = {};
for (const date of dates) {
  const h = hotSeat(head, date, true), b = hotSeat(base, date, false);
  const hd = deadline(head, date), bd = deadline(base, date);
  clubs.hot.add(h.club); clubs.dead.add(hd.club); verdicts[h.verdict] = (verdicts[h.verdict] ?? 0) + 1; handedSeen[h.handed] = (handedSeen[h.handed] ?? 0) + 1;
  if (h.digest !== b.digest || h.club !== b.club) { moved += 1; console.log(`MOVED hot seat ${date}: head ${h.club} ${h.digest}, base ${b.club} ${b.digest}`); }
  if (hd.digest !== bd.digest || hd.club !== bd.club) { moved += 1; console.log(`MOVED deadline ${date}: head ${hd.club} ${hd.digest}, base ${bd.club} ${bd.digest}`); }
  if (h.found.length) { carried += 1; console.log(`CARRIES hot seat ${date} (${h.club}): ${h.found.join(', ')}`); }
  if (hd.found.length) { carried += 1; console.log(`CARRIES deadline ${date} (${hd.club}): ${hd.found.join(', ')}`); }
  if (h.handed !== 'clean' && h.handed !== 'n/a' && h.handed !== 'null') { handedBad += 1; console.log(`HANDOVER hot seat ${date} (${h.club}): ${h.handed}`); }
  if (h.stateKeys !== b.stateKeys) { keyDiff += 1; if (keyDiff <= 3) { const a = new Set(h.stateKeys.split(',')), c = new Set(b.stateKeys.split(',')); console.log(`state keys differ on ${date}: only head [${[...a].filter(k => !c.has(k)).join(', ')}] only base [${[...c].filter(k => !a.has(k)).join(', ')}]`); } }
}
console.log(`dates ${dates[0]} to ${dates[dates.length - 1]} (${dates.length}); hot seat clubs ${clubs.hot.size}, deadline clubs ${clubs.dead.size}; verdicts ${JSON.stringify(verdicts)}; handover reads ${JSON.stringify(handedSeen)}; dates whose hot seat state keys differ from the base: ${keyDiff}`);
const ok = moved === 0 && carried === 0 && handedBad === 0;
console.log(`cmDailiesProbe: ${ok ? 'GREEN' : 'RED'}. ${dates.length} dates, both dailies: ${moved} deals moved against the base, ${carried} states carry a book or the fixture key, ${handedBad} handovers carry one.`);
process.exit(ok ? 0 : 1);
