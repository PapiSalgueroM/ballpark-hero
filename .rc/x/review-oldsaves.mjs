// Review probe (r1572, reviewer "run"): base engine (65b3e291a at /tmp/base) against the branch, over a RANDOM bot
// that uses every action (lineup, prepare train/rest, play with all tactics, playMatch, swap, pick, draftAuto, next).
// T1 default path: same actions on base and branch, raw JSON equal at every step, hubTiles/ladderWords equal.
// T2 old save: base raw save loads on the branch and round trips byte for byte.
// T3 switch: switchClubSet of the loaded save validates, round trips, masks to base, plays on to base's masked hash.
// T4 new real career: masked equal to the base fictional career over the same random actions, loads at every check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const BASE = process.env.REVIEW_BASE || '/tmp/base';
const CAREERS = Number(process.env.REVIEW_CAREERS || 54);
const esbuild = await import('esbuild');
const NM = [path.join(ROOT, 'node_modules'), path.resolve(ROOT, '../../../node_modules')].filter(d => fs.existsSync(d));
async function load(dir) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rv-')), 'b.mjs');
  await esbuild.build({ stdin: { contents: `export * from './src/lib/aussieRulesLeague.ts'; export { PREPARATIONS, TACTICS } from './src/lib/aussieRulesManager.ts';`, resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: dir, nodePaths: NM });
  return import(pathToFileURL(out).href);
}
const B = await load(BASE), N = await load(ROOT);
if (!process.env.REVIEW_SELF && typeof B.switchClubSet === 'function' || typeof N.switchClubSet !== 'function') { console.error('bundles are not base and branch'); process.exit(2); }
let checks = 0, failures = 0; const fails = [];
const check = (ok, m) => { checks += 1; if (!ok) { failures += 1; if (fails.length < 40) fails.push(m); } };
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickOf = (r, list) => list[Math.floor(r() * list.length)];
const TAC = ['control', 'direct', 'pressure'];
function candidates(L, s, r) {
  const out = [];
  const role = id => L.leaguePlayer(s, id)?.role;
  if (s.phase === 'prepare' && s.match) {
    if (r() < 0.25) {
      const club = L.clubOf(s, s.myClub); const used = new Set([...s.starters, ...s.bench]);
      const b = pickOf(r, s.bench); const spare = club.players.filter(p => !used.has(p.id) && p.role === role(b));
      if (spare.length) out.push({ type: 'lineup', starters: [...s.starters], bench: s.bench.map(id => id === b ? pickOf(r, spare).id : id) });
      const st = pickOf(r, s.starters); const same = s.bench.find(id => role(id) === role(st));
      if (same) out.push({ type: 'lineup', starters: s.starters.map(id => id === st ? same : id), bench: s.bench.map(id => id === same ? st : id) });
    }
    out.push({ type: 'prepare', choice: r() < 0.5 ? 'train' : 'rest' });
  }
  if (s.phase === 'quarter') out.push(r() < 0.3 ? { type: 'playMatch', tactic: pickOf(r, TAC) } : { type: 'play', tactic: pickOf(r, TAC) }, { type: 'playMatch', tactic: 'control' });
  if (s.phase === 'break') {
    if (r() < 0.4 && s.swapsThisBreak < 5) { const st = pickOf(r, s.starters); const inn = s.bench.find(id => role(id) === role(st)); if (inn) out.push({ type: 'swap', outId: st, inId: inn }); }
    if (r() < 0.2) out.push({ type: 'playMatch', tactic: pickOf(r, TAC) });
  }
  if (s.phase === 'draft' && s.draft && s.draft.at < s.draft.order.length) {
    if (s.draft.order[s.draft.at] === s.myClub && r() < 0.7) { const ok = L.draftPool(s).filter(p => L.pickRefusal(s, p.id) === null); if (ok.length) out.push({ type: 'pick', prospectId: pickOf(r, ok).id }); }
    out.push({ type: 'draftAuto' });
  }
  out.push({ type: 'simWeek' }, { type: 'next' });
  return out;
}
/** Chooses on the base state and returns [action, next base state]; throws when stuck. */
function stepB(s, r) { for (const a of candidates(B, s, r)) { const n = B.reduceLeague(s, a); if (n !== s) return [a, n]; } throw new Error(`stuck at ${s.phase}/${s.stage}`); }
const masked = s => { const o = { ...s }; delete o.clubName; delete o.clubSet; o.clubs = s.clubs.map(c => ({ ...c, name: '' })); return JSON.stringify(o); };
const views = (L, s) => JSON.stringify([L.hubTiles(s), L.ladderWords(s)]);
const REAL_SHORT = new Set(N.clubIdentities('afl2026').map(x => x.short));
const ids = N.CLUBS.map(c => c.id);
const master = rngOf(1572);
let steps = 0, loads = 0, switches = 0, realSteps = 0, rollbackRefused = 0, kinds = {};
const t0 = Date.now();
for (let i = 0; i < CAREERS; i += 1) {
  const seed = 1 + Math.floor(master() * 4294967294), club = ids[i % 18], target = 150 + Math.floor(master() * 950);
  const r = rngOf(seed ^ 0x5eed);
  let b = B.createLeague(seed, club), n = N.createLeague(seed, club), real = i % 3 === 0 ? N.createLeague(seed, club, 'afl2026') : null;
  check(JSON.stringify(b) === JSON.stringify(n), `career ${i} seed ${seed} ${club}: createLeague differs`);
  const marks = new Set(Array.from({ length: 4 }, () => Math.floor(master() * target)));
  for (let k = 0; k < target; k += 1) {
    const [a, nb] = stepB(b, r); kinds[a.type] = (kinds[a.type] || 0) + 1;
    const nn = N.reduceLeague(n, a); b = nb; n = nn; steps += 1;
    if (k % 3 === 0 || k === target - 1) { check(JSON.stringify(b) === JSON.stringify(n), `career ${i} ${club} step ${k} ${a.type}: raw differs`); check(views(B, b) === views(N, n), `career ${i} step ${k}: hub or ladder words differ`); }
    if (real) { real = N.reduceLeague(real, a); realSteps += 1; if (k % 25 === 0 || k === target - 1) { check(masked(real) === masked(b), `career ${i} step ${k}: real set masked differs`); check(!!N.readLeagueSave(JSON.stringify(real)), `career ${i} step ${k}: real save refused`); const sub = N.hubTiles(real)[0].sub; if (sub.startsWith('v ')) check(REAL_SHORT.has(sub.slice(2)), `real hub sub ${sub}`); } }
    if (marks.has(k)) {
      const raw = JSON.stringify(b); const got = N.readLeagueSave(raw); loads += 1;
      check(!!got && JSON.stringify(got) === raw, `career ${i} ${club} step ${k} ${b.phase}: base save does not load byte for byte`);
      if (!got) continue;
      const sw = N.switchClubSet(got); switches += 1;
      check(JSON.stringify(got) === raw, 'switch mutated its input');
      const swRaw = JSON.stringify(sw); const back = N.readLeagueSave(swRaw);
      check(!!back && JSON.stringify(back) === swRaw && sw.clubSet === 'afl2026' && masked(sw) === masked(b), `career ${i} step ${k} ${b.phase}: switched save fails load, round trip or mask`);
      check(N.switchClubSet(sw) === sw, 'switch is not one way');
      if (B.readLeagueSave(swRaw) === null) rollbackRefused += 1; else if (!process.env.REVIEW_SELF) check(false, 'base accepted a switched save');
      let bb = b, ss = sw; const r2 = rngOf(seed + k);
      for (let j = 0; j < 40; j += 1) { const [a2, nb2] = stepB(bb, r2); bb = nb2; ss = N.reduceLeague(ss, a2); }
      check(masked(ss) === masked(bb) && !!N.readLeagueSave(JSON.stringify(ss)), `career ${i} step ${k}: switched career drifts from base after 40 actions`);
      check(N.clubFull(got, '') === '' && N.clubShort(got, 'club-18') === 'club-18' && N.clubFull(sw, 'club-18') === 'club-18', 'fallback for unknown ids');
    }
  }
  if (i % 9 === 8) console.log(`career ${i + 1}/${CAREERS}: ${steps} steps, season ${b.season} ${b.phase}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
console.log(`actions used: ${JSON.stringify(kinds)}`);
console.log(`loads ${loads}, switches ${switches}, real set steps ${realSteps}, switched saves the base refuses ${rollbackRefused}`);
for (const f of fails) console.error(`  FAIL: ${f}`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'oldsaves.json'), JSON.stringify({ checks, failures, steps, loads, switches, realSteps, kinds, fails }, null, 1));
console.log(`review-oldsaves: ${checks} checks, ${failures} failures, ${CAREERS} careers, ${steps} steps, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failures ? 1 : 0);
