/* Reviewer probe (Round 1571, lens: runs things). Runs from the repo root on a runner.
   1. a fleet of 5000 mulberry32 seeds and 2000 LCG seeds: BASE and tree boards byte equal?
   2. receipts of the bind on the fixture (added, present, unmatched, ambiguous)
   3. the birth year margin of every addition (born minus by), and how many would drop if the
      next pool row lists age on the other convention
   4. order swap: the count rule before the additions instead of after: who differs
   5. namesakes: pool men sharing a folded name with an addition */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { loadBingoLib } from '../../scripts/lib/bingoFixtureBundle.mjs';

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probeFleet-'));
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/bingoPoolHistory-2026-10-29.json'), 'utf8')).rows;
const baseSrc = execSync('git show 692590145:src/lib/playerBingo.ts', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const base = await loadBingoLib({ root: ROOT, libSource: baseSrc, label: 'pbase', tmp });
const head = await loadBingoLib({ root: ROOT, libSource: fs.readFileSync(path.join(ROOT, 'src/lib/playerBingo.ts'), 'utf8'), label: 'phead', tmp });
const load = async lib => { globalThis.__bingoFixture = { rows }; return lib.fetchBingoData(); };
const bd = await load(base);
const hd = await load(head);
const bc = base.buildCriteria(bd);
const hc = head.buildCriteria(hd);

const mulberry32 = seed => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const lcg = s => { let state = s >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; };
const real = Math.random;
let eqM = 0, eqL = 0, fourM = 0;
for (let seed = 1; seed <= 5000; seed++) {
  Math.random = mulberry32(seed); const b = base.generateBoard(bc).map(c => c.id).join();
  Math.random = mulberry32(seed); const h = head.generateBoard(hc).map(c => c.id).join();
  if (b === h) eqM += 1;
  if (h.includes('journeyman-4-clubs')) fourM += 1;
}
for (let seed = 1; seed <= 2000; seed++) {
  Math.random = lcg(seed); const b = base.generateBoard(bc).map(c => c.id).join();
  Math.random = lcg(seed); const h = head.generateBoard(hc).map(c => c.id).join();
  if (b === h) eqL += 1;
}
Math.random = real;
console.log(`1) fleet: mulberry32 ${eqM}/5000 boards equal (4+ on ${fourM}); LCG ${eqL}/2000 equal`);

const modFile = path.join(tmp, 'cca.mjs');
await esbuild.build({ entryPoints: [path.join(ROOT, 'src/lib/clubCareerAdditions.ts')], bundle: true, format: 'esm', platform: 'node', outfile: modFile, logLevel: 'error' });
const cca = await import(pathToFileURL(modFile).href);
const derived = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bingoClubAdditions.json'), 'utf8'));
const fns = { norm: head.normalizeName, nat: head.primaryNationality, role: head.positionGroup, club: head.clubKey };
const raw = new Map([...bd.clubHistory].map(([n, s]) => [n, new Set(s)]));
const receipts = cca.applyClubAdditions(raw, bd.pool, derived.add, fns);
const byStatus = {};
for (const r of receipts) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
console.log(`2) receipts on the fixture: ${JSON.stringify(byStatus)}; not added: ${receipts.filter(r => r.status !== 'added').map(r => `${r.name}:${r.club}:${r.status}`).join('; ') || 'none'}`);

let edge = 0, flipDrops = [];
for (const a of derived.add) {
  const m = bd.pool.filter(p => cca.matchesAddition(a, p, fns));
  if (m.length !== 1) continue;
  const p = m[0];
  const born = p.year - p.age;
  if (born === a.by + 1) edge += 1;
  const flipped = { ...p, year: p.year + 1 };
  if (!cca.matchesAddition(a, flipped, fns)) flipDrops.push(`${a.n} (by ${a.by}, row ${p.year} age ${p.age})`);
}
console.log(`3) margin: ${edge} of ${derived.add.length} additions match only at born = by + 1; a next year row with the age unchanged drops ${flipDrops.length}: ${flipDrops.slice(0, 12).join('; ')}`);

const swapped = new Map([...bd.clubHistory].map(([n, s]) => [n, cca.careerClubs(s, derived.rules, head.clubKey)]));
cca.applyClubAdditions(swapped, bd.pool, derived.add, fns);
const diff = [];
for (const p of bd.pool) {
  const a = [...(swapped.get(p.name) ?? [])].sort().join('|');
  const b = [...(hd.clubHistory.get(p.name) ?? [])].sort().join('|');
  if (a !== b) diff.push(`${p.name}: swapped [${a}] tree [${b}]`);
}
console.log(`4) order swap (rule then additions): ${diff.length} men differ ${diff.slice(0, 5).join('; ')}`);

const folded = new Map();
for (const p of bd.pool) { const k = head.normalizeName(p.name); folded.set(k, [...(folded.get(k) ?? []), p]); }
const twins = [...folded].filter(([, l]) => l.length > 1).map(([k, l]) => `${k} x${l.length} (${l.map(p => p.nationality + '/' + p.position + '/' + p.year + '/' + p.age).join(', ')})`);
const addTwins = derived.add.filter(a => (folded.get(head.normalizeName(a.n)) ?? []).length > 1).map(a => a.n);
console.log(`5) pool folded name twins: ${twins.length}: ${twins.join('; ')}; additions on a twin name: ${addTwins.join(', ') || 'none'}`);

const supp = (cs, id) => cs.find(c => c.id === id)?.support.length;
console.log(`6) support One-club man ${supp(bc, 'one-club-man')} -> ${supp(hc, 'one-club-man')}, 4+ ${supp(bc, 'journeyman-4-clubs')} -> ${supp(hc, 'journeyman-4-clubs')}; pool ${bd.pool.length}`);
const tiles = hc.filter(c => c.id.startsWith('club-')).map(c => `${c.id} ${supp(bc, c.id)}->${c.support.length}`);
console.log(`7) club tiles: ${tiles.join(', ')}`);
console.log('probeFleet: DONE');
