// Probe for simCmSubs press: find each bigGame asked at a whistle whose edge is untrue of the fixture named,
// and print the career around it. Also the 2026-10-12 free run, live world and curve 1 view. Never committed.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pressprobe-'));
const entry = path.join(folder, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as hs from '@/lib/managerHotSeat';\nexport * as wr from '@/data/clubManagerWorldRosters';\nexport { CM_CURVE1_VIEW } from '@/data/clubManagerCurve1View';\n");
const output = path.join(folder, 'out.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(root, 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const { cm, hs, wr, CM_CURVE1_VIEW } = createRequire(import.meta.url)(output);
await cm.ensureAllEraRosters?.();

function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const fx = f => f ? `${f.kind}:${f.opponent ?? ''}:${f.competition ?? ''}:w${f.week ?? ''}` : 'null';
const EDGE_FLEET = { seeds: 8, base: 9100, step: 37, matches: 38,
  clubs: [['Liverpool', null], ['Everton', null], ['Barcelona', null], ['Burnley', null], ['Brentford', null], ['Getafe', null]] };
const fleet = EDGE_FLEET;
let big = 0, untrue = 0;
for (let k = 0; k < fleet.seeds; k++) {
  for (const [club, era] of fleet.clubs) {
    let s = withSeed(fleet.base + fleet.step * k, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
    for (let i = 0, played = 0; played < fleet.matches && i < fleet.matches * 3; i++) {
      const before = s.press?.pending ?? null;
      const week = s.week;
      const last = cm.nextFixture(s);
      const intlBefore = JSON.stringify(s.intl ?? null);
      const prev = s;
      const r = withSeed(fleet.base + fleet.step * k + 1000 * i, () => cm.playNextEntry(s, { skipHalftime: true }));
      if (r.kind === 'seasonOver') break;
      s = r.state;
      if (r.kind !== 'match') continue;
      played += 1;
      const q = s.press?.pending ?? null;
      if (!q || q === before || s.press.lastWeek !== week) continue;
      if (q.kind !== 'bigGame') continue;
      if (JSON.stringify(s.intl ?? null) !== intlBefore) continue;
      big += 1;
      const next = cm.nextFixtureFrom(s, s.week);
      const edge = next?.kind === 'match' ? cm.matchEdge(s, next) : null;
      if (edge === null || edge - 7 > -6) {
        untrue += 1;
        console.log(`UNTRUE ${club} k=${k} i=${i} played=${played} weekBefore=${week} weekAfter=${s.week} lastWeek=${s.press.lastWeek} season=${s.season}`);
        console.log(`  q: ${q.kind} id=${q.id} "${q.text.slice(0, 60)}"`);
        console.log(`  report: opp=${r.report?.opponent} comp=${r.report?.competition} home=${r.report?.home} week=${r.report?.week}`);
        console.log(`  last(before)=${fx(last)} next(after,s.week)=${fx(next)} edgeNext=${edge}`);
        for (let w = week; w <= week + 4; w++) {
          const f = cm.nextFixtureFrom(s, w);
          const e = s.calendar[w];
          console.log(`  w${w}: entry=${JSON.stringify(e)?.slice(0, 140)} nextFrom=${fx(f)}`);
        }
        const fromPrev = cm.nextFixtureFrom(prev, week + 1);
        console.log(`  nextFixtureFrom(stateBefore, week+1)=${fx(fromPrev)} edgeThere=${fromPrev?.kind === 'match' ? cm.matchEdge(prev, fromPrev) : null}`);
        console.log(`  live after=${JSON.stringify(s.live ?? null)?.slice(0, 80)} matchRules=${s.matchRules}`);
      }
    }
  }
}
console.log(`edge fleet: ${big} bigGame judged, ${untrue} untrue`);

const daily = withSeed(1, () => hs.dailyHotSeat('2026-10-12'));
const acts = [{ t: 'match', m: 'balanced', talk: null }, { t: 'match', m: 'balanced', talk: null }];
const dayRun = withSeed(2, () => hs.replayHotSeat({ club: daily.club, seed: daily.seed, daily: daily.daily }, acts));
const freeRun = withSeed(3, () => hs.replayHotSeat({ club: daily.club, seed: daily.seed, rules: 1331 }, acts));
const freeView = wr.onCurve1View(CM_CURVE1_VIEW, () => withSeed(3, () => hs.replayHotSeat({ club: daily.club, seed: daily.seed, rules: 1331 }, acts)));
const q = run => `${run.state.press?.pending?.kind ?? '-'}: ${run.state.press?.pending?.text ?? '(none)'}`;
console.log(`daily ${daily.club} seed ${daily.seed}: ${q(dayRun)}`);
console.log(`free live world: ${q(freeRun)}`);
console.log(`free curve1 view: ${q(freeView)}`);
const free = s => `week ${s.week} next ${fx(cm.nextFixture(s))}`;
console.log(`free live state: ${free(freeRun.state)}; view state: ${free(freeView.state)}`);
fs.rmSync(folder, { recursive: true, force: true });
