// Round 1318 runner review, old saves (never committed; sent as .rc/x/rvold.mjs).
// Usage: node .rc/x/rvold.mjs <main root> <pr234 root> [N=12]
// A  saves MADE on main's engine mid career (no pool) load on this head and play on in lockstep with main:
//    every step equal once the generated identities are masked, until this head replaces a rival (age 37 or a name
//    clash); the first night after the load equal byte for byte but for the two new nominee fields and the pool.
// B  saves made on PR234's own engine (f9f54067) with a pool load on this head: the reader accepts the pool and the
//    next night keeps every saved rival (same ids, names, ages one year on).
// C  hostile pools beyond the 27 declared: the save opens, nothing throws, and the next night equals the same save
//    with no pool, draw for draw.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd(), MAIN = path.resolve(process.argv[2]), P234 = path.resolve(process.argv[3]), N = Number(process.argv[4] || 12);
const TMP = fs.mkdtempSync('/tmp/rvold-');
let draws = 0;
const rng = s => () => { draws++; s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
async function bundle(root, label) {
  const outfile = path.join(TMP, label + '.mjs');
  await build({
    stdin: { contents: "export * as E from './src/lib/soccerCareerEngine'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave';", resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(root, 'src') },
    define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: 'globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };' },
    plugins: [{ name: 'gen', setup(b) { b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, a => {
      const src = fs.readFileSync(a.path, 'utf8').replace(/\r\n/g, '\n');
      const at = 'function generateContender(';
      if (src.split(at).length !== 2) throw new Error(label + ': generateContender anchor');
      return { contents: src.replace(at, 'function generateContender(...a: any[]) { const r = (__gen0 as any)(...a); (globalThis as any).__genNames.add(r.name); return r; }\nfunction __gen0('), loader: 'ts' };
    }); } }],
  });
  return import(pathToFileURL(outfile).href);
}
globalThis.__genNames = new Set();
const H = await bundle(ROOT, 'head'), B = await bundle(MAIN, 'main'), P = await bundle(P234, 'pr234');
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const init = (M, i, start) => M.E.initCareer('Old Save ' + i, NATIONS[i % 8], ['ST', 'CM', 'LW', 'CAM'][i % 4], 'modern', flat(60), 60, start, M.E.FALLBACK_CLUBS, null, 84 + (i % 9));
const step = (M, c, gen) => { const real = Math.random; Math.random = gen; try { return careerStep(M.E, c, M.E.FALLBACK_CLUBS); } finally { Math.random = real; } };
const copy = x => JSON.parse(JSON.stringify(x));
const canon = x => JSON.stringify(x, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
function masked(s) {
  const gen = new Set([...globalThis.__genNames, ...(s.generatedBallonPool?.entries || []).map(e => e.name)]);
  const names = [...gen].filter(Boolean).sort((a, b) => b.length - a.length);
  const nominee = n => { const o = { ...n }; delete o.generatedId; delete o.generatedAge; if (gen.has(o.name)) { o.name = '<GEN>'; o.nationality = o.position = o.club = '<GEN>'; } return o; };
  const t = copy(s); delete t.generatedBallonPool;
  if (t.pendingBallonDor?.nominees) t.pendingBallonDor.nominees = t.pendingBallonDor.nominees.map(nominee);
  let j = JSON.stringify(t);
  for (const n of names) j = j.split(JSON.stringify(n).slice(1, -1)).join('<GEN>');
  return j;
}
const replaced = pool => !!pool && pool.entries.some(e => pool.entries.some(o => o !== e && o.role === e.role && o.slot === e.slot && o.id < e.id));
const out = { A: { careers: 0, loaded: 0, refused: 0, firstNightExact: 0, firstNightChecked: 0, equalToEnd: 0, diffAfterReplacement: 0, unexplained: [], drawMismatch: 0, ballots: 0 }, B: { careers: 0, accepted: 0, kept: 0, bad: [] }, C: { cases: 0, ok: 0, bad: [] } };

// A: a save made on main, mid career, loaded and played on here.
for (let i = 1; i <= N; i++) for (const start of [2016, 2024]) {
  out.A.careers++;
  const g = rng(i * 7919 + start); let c = init(B, i, start), steps = 0;
  const target = 2028 + (i % 5);
  while (!c.retired && steps++ < 2500 && !(c.phase === 'playing' && (c.seasons.at(-1)?.year ?? 0) >= target)) c = step(B, c, g);
  if (c.retired) continue;
  const raw = JSON.stringify(c);
  if (!H.isSoccerCareerSave(JSON.parse(raw))) { out.A.refused++; continue; }
  out.A.loaded++;
  let h = H.E.repairCareer(JSON.parse(raw)), b = B.E.repairCareer(JSON.parse(raw));
  const gh = rng(i * 31 + start), gb = rng(i * 31 + start);
  let nights = 0, first = true, diff = null;
  for (let k = 0; k < 400 && nights < 5 && !h.retired && !b.retired; k++) {
    draws = 0; h = step(H, h, gh); const dh = draws; draws = 0; b = step(B, b, gb); const db = draws;
    if (h.phase === 'ballon_dor' && h.pendingBallonDor) {
      nights++; out.A.ballots++;
      if (dh !== db) out.A.drawMismatch++;
      if (first) {
        first = false; out.A.firstNightChecked++;
        const strip = s => { const t = copy(s); delete t.generatedBallonPool; t.pendingBallonDor.nominees.forEach(n => { delete n.generatedId; delete n.generatedAge; }); return JSON.stringify(t); };
        if (strip(h) === JSON.stringify(b)) out.A.firstNightExact++;
      }
    }
    if (masked(h) !== masked(b)) { diff = { k, year: h.seasons.at(-1)?.year, phase: h.phase, replaced: replaced(h.generatedBallonPool), dh, db }; break; }
  }
  if (!diff) out.A.equalToEnd++;
  else if (diff.replaced) out.A.diffAfterReplacement++;
  else out.A.unexplained.push({ i, start, ...diff });
}

// B: a pool written by PR234's own engine.
for (let i = 1; i <= Math.ceil(N / 2); i++) {
  out.B.careers++;
  const g = rng(i * 104729); let c = init(P, i, 2024), pooled = 0, steps = 0;
  while (!c.retired && steps++ < 2500 && pooled < 2) { c = step(P, c, g); if (c.phase === 'ballon_dor' && c.generatedBallonPool) pooled++; }
  while (!c.retired && steps++ < 2600 && c.phase !== 'playing') c = step(P, c, g);
  if (c.retired || !c.generatedBallonPool) { out.B.bad.push({ i, why: 'no pooled hub on PR234' }); continue; }
  const raw = JSON.stringify(c);
  const s = H.E.repairCareer(JSON.parse(raw));
  if (!H.isSoccerCareerSave(JSON.parse(raw)) || !H.E.isGeneratedBallonPool(s.generatedBallonPool, s.seasons.at(-1).year)) { out.B.bad.push({ i, why: 'refused on this head' }); continue; }
  out.B.accepted++;
  let h = s; const gh = rng(i);
  for (let k = 0; k < 400 && !h.retired && !(h.phase === 'ballon_dor' && h.pendingBallonDor && h.seasons.at(-1).year > s.seasons.at(-1).year); k++) h = step(H, h, gh);
  const before = s.generatedBallonPool.entries, after = h.generatedBallonPool?.entries || [];
  const same = before.every((e, j) => after[j] && after[j].id === e.id && after[j].name === e.name && after[j].firstYear === e.firstYear);
  const live = before.filter(e => e.retiredYear === null && e.entryAge + h.seasons.at(-1).year - e.firstYear < 37 && e.role === 'primary');
  const shown = live.filter(e => h.pendingBallonDor.nominees.some(n => n.generatedId === e.id && n.name === e.name && n.generatedAge === e.entryAge + h.seasons.at(-1).year - e.firstYear));
  if (same && h.pendingBallonDor && shown.length === live.filter(e => h.pendingBallonDor.nominees.some(n => n.name === e.name)).length) out.B.kept++;
  else out.B.bad.push({ i, why: 'pool not kept', same, live: live.length, shown: shown.length });
}

// C: hostile pools beyond the 27.
const base = (() => { const g = rng(424242); let c = init(H, 3, 2024), pooled = 0, steps = 0;
  while (!c.retired && steps++ < 2500 && pooled < 2) { c = step(H, c, g); if (c.phase === 'ballon_dor' && c.generatedBallonPool) pooled++; }
  while (!c.retired && c.phase !== 'playing') c = step(H, c, g); return c; })();
const HOSTILE = {
  array: p => [p], number: () => 7, stringVersion: p => ({ ...p, version: '1' }), hugeYear: p => ({ ...p, year: 1e21 }),
  floatYear: p => ({ ...p, year: p.year + 0.5 }), protoName: p => ({ ...p, entries: p.entries.map((e, j) => j ? e : { ...e, name: '__proto__' }) }),
  extraEntry: p => ({ ...p, nextId: p.nextId + 1, entries: [...p.entries, { ...p.entries[0], id: p.nextId, name: 'Extra ' + p.nextId, slot: 99 }] }),
  nullEntry: p => ({ ...p, entries: [null, ...p.entries.slice(1)] }), negativeSeed: p => ({ ...p, entries: p.entries.map((e, j) => j ? e : { ...e, seed: -1 }) }),
  retiredBeforeBorn: p => ({ ...p, entries: p.entries.map((e, j) => j ? e : { ...e, retiredYear: e.firstYear - 3 }) }),
};
for (const [id, f] of Object.entries(HOSTILE)) {
  out.C.cases++;
  try {
    const v = copy(base); v.generatedBallonPool = f(copy(base.generatedBallonPool));
    if (!H.isSoccerCareerSave(copy(v))) { out.C.bad.push({ id, why: 'save refused' }); continue; }
    const night = s => { draws = 0; const g = rng(99); let c = H.E.repairCareer(s); for (let k = 0; k < 400 && !c.retired && !(c.phase === 'ballon_dor' && c.pendingBallonDor); k++) c = step(H, c, g); return { c, d: draws }; };
    const read = H.E.isGeneratedBallonPool(v.generatedBallonPool, v.seasons.at(-1).year);
    const a = night(copy(v)), none = copy(v); delete none.generatedBallonPool; const z = night(none);
    const eq = read || (a.d === z.d && canon(a.c) === canon(z.c));
    if (eq && H.E.isGeneratedBallonPool(a.c.generatedBallonPool, a.c.seasons.at(-1).year)) out.C.ok++; else out.C.bad.push({ id, read, why: 'next night differs from no pool or unreadable', d: [a.d, z.d] });
  } catch (e) { out.C.bad.push({ id, why: 'threw ' + String(e).slice(0, 120) }); }
}
fs.mkdirSync(process.env.RC_OUT || TMP, { recursive: true });
fs.writeFileSync(path.join(process.env.RC_OUT || TMP, 'rvold.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
const bad = out.A.refused + out.A.unexplained.length + out.A.drawMismatch + out.B.bad.length + out.C.bad.length + (out.A.firstNightChecked - out.A.firstNightExact);
console.log(`RVOLD ${bad ? 'RED' : 'GREEN'}: A ${out.A.loaded}/${out.A.careers} main saves loaded, first night exact ${out.A.firstNightExact}/${out.A.firstNightChecked}, ballots ${out.A.ballots}, draw mismatches ${out.A.drawMismatch}, equal to the end ${out.A.equalToEnd}, after a replacement ${out.A.diffAfterReplacement}, unexplained ${out.A.unexplained.length}; B ${out.B.accepted}/${out.B.careers} PR234 pools read, ${out.B.kept} kept; C ${out.C.ok}/${out.C.cases} hostile pools read as absent`);
process.exit(bad ? 1 : 0);
