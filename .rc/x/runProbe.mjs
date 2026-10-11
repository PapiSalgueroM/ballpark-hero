// Round 1303 review (run lens). Run from a tree's root: node runProbe.mjs <fleet|make|load|kinds|gap> [file]
//   fleet : nobody asks for reviews; two clubs of every league, quick and live path, whole saves hashed (base and branch)
//   make  : (on the base) old saves through the engine's own saveCareer, between matches and at half time
//   load  : (base and branch) load those saves through loadCareer, play on, print D lines to compare as text
//   kinds : (branch) a match kicked off with ['goal'], saved at half time through saveCareer and loadCareer, finished
//   gap   : (branch) an independent paired fleet: the goal kind alone against the same match without reviews
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2] || 'fleet', file = process.argv[3];
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'r1303-run-probe-'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => { store.clear(); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const cm = createRequire(import.meta.url)(bundle);
for (const k of ['startCareer', 'playNextEntry', 'startSecondHalf', 'resumeMatch', 'saveCareer', 'loadCareer', 'REAL_LEAGUES']) if (cm[k] === undefined) { console.log('ABORT: engine export missing: ' + k); process.exit(2); }

const realRandom = Math.random, realNow = Date.now;
function run(seed, fn) {
  let a = seed >>> 0, draws = 0;
  Math.random = () => { draws += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { const value = fn(); const used = draws; const next = [Math.random(), Math.random()]; return { value, draws: used, next }; }
  finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const PER = Number(process.env.PROBE_ENTRIES || 40);
const CLUBS = cm.REAL_LEAGUES.flatMap(l => [...new Set([l.clubs[1], l.clubs[Math.min(10, l.clubs.length - 1)]])].map(club => ({ league: l.id, club })));
const livePath = (pre, opts) => { const stop = cm.playNextEntry(pre, opts); if (stop.kind !== 'halftime' || !stop.state.live) return stop; const second = cm.startSecondHalf(stop.state); return second ? cm.resumeMatch(second) : stop; };
const ended = res => res.kind === 'seasonOver' || res.state?.sacked;
const varOf = (play, incident) => (play ?? []).filter(e => e.kind === 'var' && (!incident || e.review?.incident === incident));

if (mode === 'fleet') {
  const h = createHash('sha256');
  let entries = 0, matches = 0, live = 0, varLines = 0, optIn = 0;
  for (const [c, { league, club }] of CLUBS.entries()) {
    let state = run(8200 + c, () => cm.startCareer(club)).value;
    for (let i = 0; i < PER; i++) {
      const seed = 910001 + c * 100003 + i * 7919, pre = state, viaLive = i % 3 === 1;
      const r = run(seed, () => (viaLive ? livePath(pre, {}) : cm.playNextEntry(pre, i % 2 ? { skipHalftime: true } : { skipHalftime: true, noCoach: true })));
      const res = r.value;
      entries += 1; if (viaLive) live += 1;
      h.update(JSON.stringify([league, club, i, res.kind, res.report ?? null, r.draws, r.next]));
      h.update(sha(res.state ?? null));
      if (JSON.stringify(res.state ?? null).includes('"varReviews"') || JSON.stringify(res.state ?? null).includes('"varKinds"')) optIn += 1;
      if (res.kind === 'match' && res.report) { matches += 1; if (varOf(res.report.detail?.play).length) varLines += 1; }
      if (ended(res) || !res.state) break;
      state = res.state;
    }
  }
  console.log(`FLEET ${CLUBS.length} clubs of ${cm.REAL_LEAGUES.length} leagues, ${entries} entries (${live} on the live path), ${matches} matches, ${varLines} with a review line, ${optIn} states with a review key`);
  console.log(`FLEET digest ${h.digest('hex')}`);
} else if (mode === 'make' || mode === 'load') {
  const SAVE_CLUBS = ['Liverpool', 'Everton', 'Barcelona', 'PSV', 'Napoli', 'Rangers', 'Bayern Munich', 'Marseille'];
  const dump = () => Object.fromEntries(store.entries());
  const restore = snap => { store.clear(); for (const [k, v] of Object.entries(snap)) store.set(k, v); };
  const playOn = (state, n, base) => { const h = createHash('sha256'); let s = state; for (let i = 0; i < n; i++) { const r = run(base + i, () => cm.playNextEntry(s, { skipHalftime: true })); h.update(JSON.stringify([r.value.kind, r.value.report ?? null, r.draws, r.next])); h.update(sha(r.value.state ?? null)); if (ended(r.value) || !r.value.state) break; s = r.value.state; } return h.digest('hex').slice(0, 20); };
  const finish = loaded => run(535353, () => { const second = cm.startSecondHalf(loaded); return second ? cm.resumeMatch(second) : null; });
  if (mode === 'make') {
    const saves = [];
    for (const [c, club] of SAVE_CLUBS.entries()) {
      let state = run(9100 + c, () => cm.startCareer(club)).value;
      for (let i = 0; i < 4 + c; i++) state = run(9200 + c * 31 + i, () => cm.playNextEntry(state, { skipHalftime: true })).value.state;
      store.clear(); run(1, () => cm.saveCareer(state));
      saves.push({ club, kind: 'between', storage: dump() });
      let stop = null;
      for (let t = 0; t < 8; t++) { stop = run(9300 + c + t * 17, () => cm.playNextEntry(state, {})).value; if (stop.kind === 'halftime') break; state = stop.state; }
      if (stop.kind !== 'halftime') { console.log(`ABORT: ${club} did not stop at half time (${stop.kind})`); process.exit(2); }
      store.clear(); run(1, () => cm.saveCareer(stop.state));
      saves.push({ club, kind: 'halftime', comp: stop.state.live.compLabel, storage: dump() });
    }
    fs.writeFileSync(file, JSON.stringify({ madeOn: root, saves }));
    console.log(`MAKE wrote ${saves.length} saves of ${SAVE_CLUBS.length} clubs to ${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
  } else {
    const { saves } = JSON.parse(fs.readFileSync(file, 'utf8'));
    let loadedCount = 0;
    for (const s of saves) {
      restore(s.storage);
      const loaded = run(2, () => cm.loadCareer()).value;
      if (!loaded) { console.log(`D ${s.club} ${s.kind} DID NOT LOAD`); continue; }
      loadedCount += 1;
      if (s.kind === 'between') console.log(`D ${s.club} between loaded=${sha(loaded).slice(0, 20)} eight=${playOn(loaded, 8, 9400 + SAVE_CLUBS.indexOf(s.club) * 100)}`);
      else {
        const done = finish(loaded);
        console.log(`D ${s.club} halftime loaded=${sha(loaded).slice(0, 20)} key=${'varReviews' in (loaded.live ?? {})}/${'varKinds' in (loaded.live ?? {})} match=${sha([done.value?.report ?? null, done.draws, done.next]).slice(0, 20)} after=${sha(done.value?.state ?? null).slice(0, 20)} reviewLines=${varOf(done.value?.report?.detail?.play).length} four=${done.value?.state ? playOn(done.value.state, 4, 9500 + SAVE_CLUBS.indexOf(s.club) * 100) : 'none'}`);
      }
    }
    console.log(`LOAD ${loadedCount} of ${saves.length} saves loaded`);
    process.exit(loadedCount === saves.length ? 0 : 1);
  }
} else if (mode === 'kinds') {
  const t = { halves: 0, lit: 0, listKept: 0, goalSecond: 0, penaltyInGoalOnly: 0, kickInGoalOnly: 0, penaltyInAll: 0, matchesAllHasPenalty: 0, bad: [] };
  for (const [c, club] of ['Everton', 'Liverpool', 'Barcelona', 'Napoli', 'Bayern Munich', 'Marseille'].entries()) {
    const pre = run(7100 + c, () => cm.startCareer(club)).value;
    for (let k = 0; k < Number(process.env.PROBE_HALVES || 120); k++) {
      const seed = 31000 + c * 1000 + k;
      const stop = run(seed, () => cm.playNextEntry(pre, { varReviews: ['goal'] })).value;
      if (stop.kind !== 'halftime') continue;
      t.halves += 1;
      if (stop.state.live.varReviews !== true) continue;
      t.lit += 1;
      store.clear(); run(1, () => cm.saveCareer(stop.state));
      const loaded = run(2, () => cm.loadCareer()).value;
      if (JSON.stringify(loaded?.live?.varKinds) === '["goal"]' && loaded.live.varReviews === true) t.listKept += 1; else t.bad.push(`${club} seed ${seed}: the loaded match holds varKinds ${JSON.stringify(loaded?.live?.varKinds)}`);
      const done = run(seed + 500000, () => { const second = cm.startSecondHalf(loaded); return second ? cm.resumeMatch(second) : null; }).value;
      const play = done?.report?.detail?.play ?? [];
      t.goalSecond += varOf(play, 'goal').filter(e => e.minute > 45).length;
      const pens = varOf(play, 'penalty').length, kicks = play.filter(e => e.kind === 'shot' && e.review?.decision === 'awarded').length;
      t.penaltyInGoalOnly += pens; t.kickInGoalOnly += kicks;
      if (pens || kicks) t.bad.push(`${club} seed ${seed}: a match kicked off with the goal kind shows ${pens} penalty review(s) and ${kicks} kick(s) after a real save and load`);
      const all = run(seed, () => cm.playNextEntry(pre, { varReviews: true })).value;
      const allDone = run(seed + 500000, () => { const second = cm.startSecondHalf(JSON.parse(JSON.stringify(all.state))); return second ? cm.resumeMatch(second) : null; }).value;
      const allPens = varOf(allDone?.report?.detail?.play, 'penalty').length;
      t.penaltyInAll += allPens; if (allPens) t.matchesAllHasPenalty += 1;
    }
  }
  for (const b of t.bad.slice(0, 20)) console.log('FAIL ' + b);
  console.log(`KINDS ${JSON.stringify({ ...t, bad: t.bad.length })}`);
  const ok = t.bad.length === 0 && t.lit >= 300 && t.listKept === t.lit && t.goalSecond >= 5 && t.matchesAllHasPenalty >= 5;
  console.log(ok ? 'KINDS HOLD: the saved list survives a real save and load and the second half plays it' : 'KINDS BROKEN or the sample is empty');
  process.exit(ok ? 0 : 1);
} else if (mode === 'gap') {
  const seeds = (process.env.PROBE_SEEDS || '2,3').split(',').map(Number);
  const t = { clubs: 0, matches: 0, goalsOn: 0, goalsOff: 0, ruledOut: 0, penaltyReviews: 0, resultMoved: 0, withReview: 0 };
  for (const seed of seeds) for (const [c, { club }] of CLUBS.entries()) {
    let state = run(seed * 1000 + c, () => cm.startCareer(club)).value;
    const first = run(seed * 77 + c, () => cm.playNextEntry(state, { varReviews: ['goal'] })).value;
    if (!(first.kind === 'halftime' && first.state.live?.varReviews === true)) continue;
    t.clubs += 1;
    for (let i = 0; i < 70; i++) {
      const s = seed * 200003 + c * 7919 + i;
      const on = run(s, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true, varReviews: ['goal'] })).value;
      if (ended(on) || !on.state) break;
      if (on.kind === 'match' && on.report?.competition === 'league') {
        const off = run(s, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true })).value.report;
        const play = on.report.detail?.play ?? [];
        t.matches += 1; t.goalsOn += on.report.homeGoals + on.report.awayGoals; t.goalsOff += off.homeGoals + off.awayGoals;
        t.ruledOut += varOf(play, 'goal').filter(e => e.review.decision === 'disallowed').length; t.penaltyReviews += varOf(play, 'penalty').length;
        if (varOf(play).length) t.withReview += 1;
        if (Math.sign(off.homeGoals - off.awayGoals) !== Math.sign(on.report.homeGoals - on.report.awayGoals)) t.resultMoved += 1;
      }
      state = on.state;
    }
  }
  const r4 = x => Number(x.toFixed(4));
  console.log(`GAP ${JSON.stringify({ seeds, ...t, ruledOutPerMatch: r4(t.ruledOut / t.matches), goalsOn: r4(t.goalsOn / t.matches), goalsOff: r4(t.goalsOff / t.matches), movedBy: r4((t.goalsOn - t.goalsOff) / t.matches), resultMovedShare: r4(t.resultMoved / t.matches) })}`);
} else { console.log('ABORT: unknown mode ' + mode); process.exit(2); }
