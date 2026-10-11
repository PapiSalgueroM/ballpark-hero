// Round 1218 review (run lens). Run from a tree's root: node r1218probe.mjs <fleet|asked|make|load> [file]
//   fleet : the default path (nobody asks for reviews) over two clubs of every league, quick and live path, whole saves hashed
//   asked : the same fleet, asking for reviews at every kickoff: where is a match lit, and is an unlit one the same match
//   make  : (on the base) write old saves, between matches and at half time, with digests of how they play on
//   load  : (on the branch) load those saves, play on the same way, compare, then ask for reviews
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2] || 'fleet', file = process.argv[3];
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'r1218-probe-'));
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
/* The engine numbers inbox messages, press questions and youth players from counters of its own (msgSeq, pressSeq, youthSeq),
   so two calls made one after the other on one engine differ in those ids and in nothing else. */
const norm = s => s.replace(/"(msg|pq)-(\d+)-(\d+)-\d+"/g, '"$1-$2-$3-N"').replace(/"youth-([a-z0-9]+)-\d+-(\d+)"/g, '"youth-$1-N-$2"');
const normSha = v => sha(norm(JSON.stringify(v ?? null)));
const PER = Number(process.env.PROBE_ENTRIES || 36);
const CLUBS = cm.REAL_LEAGUES.flatMap(l => [...new Set([l.clubs[0], l.clubs[Math.min(7, l.clubs.length - 1)]])].map(club => ({ league: l.id, club })));
const livePath = (pre, opts) => { const stop = cm.playNextEntry(pre, opts); if (stop.kind !== 'halftime' || !stop.state.live) return stop; const second = cm.startSecondHalf(stop.state); return second ? cm.resumeMatch(second) : stop; };
const ended = res => res.kind === 'seasonOver' || res.state?.sacked;

if (mode === 'fleet') {
  const h = createHash('sha256');
  let entries = 0, matches = 0, live = 0, varLines = 0;
  for (const [c, { league, club }] of CLUBS.entries()) {
    let state = run(5200 + c, () => cm.startCareer(club)).value;
    for (let i = 0; i < PER; i++) {
      const seed = 700001 + c * 100003 + i * 7919, pre = state, viaLive = i % 3 === 2;
      const r = run(seed, () => (viaLive ? livePath(pre, { noCoach: true }) : cm.playNextEntry(pre, { skipHalftime: true, noCoach: true })));
      const res = r.value;
      entries += 1; if (viaLive) live += 1;
      h.update(JSON.stringify([league, club, i, res.kind, res.report ?? null, r.draws, r.next]));
      h.update(sha(res.state ?? null));
      if (res.kind === 'match' && res.report) { matches += 1; if ((res.report.detail?.timeline ?? []).some(e => e.kind === 'var') || (res.report.detail?.play ?? []).some(e => e.kind === 'var')) varLines += 1; }
      if (ended(res) || !res.state) break;
      state = res.state;
    }
  }
  console.log(`FLEET ${CLUBS.length} clubs of ${cm.REAL_LEAGUES.length} leagues, ${entries} entries (${live} on the live path), ${matches} matches, ${varLines} with a review line`);
  console.log(`FLEET digest ${h.digest('hex')}`);
} else if (mode === 'asked') {
  const tally = {}, problems = [];
  const COVERED = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League'];
  for (const [c, { league, club }] of CLUBS.entries()) {
    let state = run(5200 + c, () => cm.startCareer(club)).value;
    for (let i = 0; i < PER; i++) {
      const seed = 700001 + c * 100003 + i * 7919, pre = state;
      const off = run(seed, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true }));
      const on = run(seed, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true, varReviews: true }));
      const stop = run(seed, () => cm.playNextEntry(pre, { noCoach: true, varReviews: true })).value;
      if (stop.kind === 'halftime' && stop.state.live) {
        const comp = String(stop.state.live.compLabel).split(' · ')[0], key = `${league} | ${comp}`;
        const t = tally[key] ??= { comp, kickoffs: 0, lit: 0, same: 0, reviewLines: 0 };
        const lit = stop.state.live.varReviews === true;
        const same = JSON.stringify(on.value.report ?? null) === JSON.stringify(off.value.report ?? null) && normSha(on.value.state) === normSha(off.value.state) && on.draws === off.draws && JSON.stringify(on.next) === JSON.stringify(off.next);
        const lines = (on.value.report?.detail?.play ?? []).filter(e => e.kind === 'var').length;
        t.kickoffs += 1; if (lit) t.lit += 1; if (same) t.same += 1; t.reviewLines += lines;
        if (!lit && !same) problems.push(`${key}: ${club} entry ${i} is not lit and is not the same match`);
        if (!lit && lines) problems.push(`${key}: ${club} entry ${i} is not lit and has ${lines} review line(s)`);
        if (lit && !COVERED.includes(comp)) problems.push(`${key}: ${club} entry ${i} is lit and ${comp} is not a covered competition`);
        if (!lit && COVERED.includes(comp)) problems.push(`${key}: ${club} entry ${i} is a covered competition and is not lit`);
      }
      if (ended(off.value) || !off.value.state) break;
      state = off.value.state;
    }
  }
  for (const [key, t] of Object.entries(tally)) console.log(`ASKED ${key}: ${t.kickoffs} kickoffs, ${t.lit} lit, ${t.same} the same match as without, ${t.reviewLines} review lines`);
  for (const p of problems.slice(0, 30)) console.log(`PROBLEM ${p}`);
  const totals = Object.values(tally).reduce((s, t) => ({ k: s.k + t.kickoffs, lit: s.lit + t.lit }), { k: 0, lit: 0 });
  console.log(`ASKED total: ${totals.k} kickoffs in ${Object.keys(tally).length} league and competition pairs, ${totals.lit} lit, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
} else if (mode === 'make' || mode === 'load') {
  const SAVE_CLUBS = ['Arsenal', 'Burnley', 'Real Madrid', 'Ajax', 'Juventus', 'Celtic'];
  const dump = () => Object.fromEntries(store.entries());
  const restore = snap => { store.clear(); for (const [k, v] of Object.entries(snap)) store.set(k, v); };
  const playOn = (state, n, base) => { const h = createHash('sha256'); let s = state; for (let i = 0; i < n; i++) { const r = run(base + i, () => cm.playNextEntry(s, { skipHalftime: true, noCoach: true })); h.update(JSON.stringify([r.value.kind, r.value.report ?? null, r.draws, r.next])); h.update(sha(r.value.state ?? null)); if (ended(r.value) || !r.value.state) break; s = r.value.state; } return h.digest('hex').slice(0, 20); };
  const finish = loaded => run(424242, () => { const second = cm.startSecondHalf(loaded); return second ? cm.resumeMatch(second) : null; });
  if (mode === 'make') {
    const saves = [];
    for (const [c, club] of SAVE_CLUBS.entries()) {
      let state = run(6100 + c, () => cm.startCareer(club)).value;
      for (let i = 0; i < 5; i++) state = run(6200 + c * 31 + i, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true })).value.state;
      store.clear(); run(1, () => cm.saveCareer(state));
      saves.push({ club, kind: 'between', storage: dump() });
      let stop = null;
      for (let t = 0; t < 6; t++) { stop = run(6300 + c + t * 17, () => cm.playNextEntry(state, { noCoach: true })).value; if (stop.kind === 'halftime') break; state = stop.state; }
      if (stop.kind !== 'halftime') { console.log(`ABORT: ${club} did not stop at half time (${stop.kind})`); process.exit(2); }
      store.clear(); run(1, () => cm.saveCareer(stop.state));
      saves.push({ club, kind: 'halftime', comp: stop.state.live.compLabel, storage: dump() });
    }
    fs.writeFileSync(file, JSON.stringify({ madeOn: root, saves }));
    console.log(`MAKE wrote ${saves.length} saves of ${SAVE_CLUBS.length} clubs to ${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
  } else {
    const { saves } = JSON.parse(fs.readFileSync(file, 'utf8'));
    let bad = 0;
    const say = (ok, msg) => { if (!ok) bad += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
    /* Pass 1: the same calls in the same order on any tree, so the D lines of two trees can be compared as text. */
    for (const s of saves) {
      restore(s.storage);
      const loaded = run(2, () => cm.loadCareer()).value;
      if (!loaded) { console.log(`D ${s.club} ${s.kind} DID NOT LOAD`); continue; }
      if (s.kind === 'between') console.log(`D ${s.club} between loaded=${sha(loaded).slice(0, 20)} six=${playOn(loaded, 6, 6400 + SAVE_CLUBS.indexOf(s.club) * 100)}`);
      else {
        const done = finish(loaded);
        const lines = (done.value?.report?.detail?.play ?? []).filter(e => e.kind === 'var').length;
        console.log(`D ${s.club} halftime loaded=${sha(loaded).slice(0, 20)} optIn=${'varReviews' in (loaded.live ?? {})} match=${sha([done.value?.report ?? null, done.draws, done.next]).slice(0, 20)} after=${sha(done.value?.state ?? null).slice(0, 20)} reviewLines=${lines} three=${done.value?.state ? playOn(done.value.state, 3, 6500 + SAVE_CLUBS.indexOf(s.club) * 100) : 'none'}`);
      }
    }
    /* Pass 2: what the lit rule does with an old save. Two calls on one engine differ in the inbox ids its own counter gives, so norm() takes those out. */
    for (const s of saves) {
      restore(s.storage);
      const loaded = run(2, () => cm.loadCareer()).value;
      if (!loaded) { say(false, `${s.club} ${s.kind}: the old save loads`); continue; }
      if (s.kind === 'between') {
        const stop = run(77, () => cm.playNextEntry(loaded, { noCoach: true, varReviews: true })).value;
        console.log(`info ${s.club} between: next kickoff ${stop.state?.live?.compLabel ?? stop.kind}, asked for reviews, lit: ${stop.state?.live?.varReviews === true}`);
      } else {
        const plain = run(88, () => cm.playNextEntry(loaded, { skipHalftime: true, noCoach: true }));
        const asked = run(88, () => cm.playNextEntry(loaded, { skipHalftime: true, noCoach: true, varReviews: true }));
        const same = JSON.stringify(plain.value.report ?? null) === JSON.stringify(asked.value.report ?? null) && plain.draws === asked.draws && JSON.stringify(plain.next) === JSON.stringify(asked.next) && normSha(plain.value.state) === normSha(asked.value.state);
        say(same, `${s.club} halftime (${s.comp}): finishing an old live match is the same match whether reviews are asked for or not`);
        say(!(asked.value.report?.detail?.play ?? []).some(e => e.kind === 'var'), `${s.club} halftime: a match kicked off before this release shows no review even when asked`);
      }
    }
    console.log(`LOAD ${saves.length} old saves: ${bad} failure(s) in pass 2`);
    process.exit(bad ? 1 : 0);
  }
} else { console.log('ABORT: unknown mode ' + mode); process.exit(2); }
