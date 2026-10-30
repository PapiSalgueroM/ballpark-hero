/* Reviewer probe for Round 1597 (runner only, copied into scripts/ of the tree under test).
   A: the summer trim (squad over the limit) puts its men on the free agent list, and they are still there (or
      retired) a summer later. Squads are inflated with made up clones so the trim must fire.
   B: rule 2's agreement: after each summer every list man the ledger holds as released (exactly one record by
      name, birth year and position) has the record's age and rating, and no list man's record says retired.
   Exit 1 when A or B fails. */
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'trimprobe.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent' });
const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
const require = createRequire(path.join(ROOT, 'package.json'));
const ctx = vm.createContext({ module, exports: module.exports, require, console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams,
  TextEncoder, TextDecoder, structuredClone, performance, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'trimprobe.cjs' }).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();
function stream(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const OPT = { skipHalftime: true, noCoach: true };
function season(s) {
  s = { ...s, budget: Math.max(s.budget, 400), wageCap: 99999 };
  for (let i = 0; i < 400; i += 1) { if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 }; const r = cm.playNextEntry(s, OPT); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; }
  return s.sacked ? s : cm.finishSeason(s).state;
}
let trimmedTotal = 0, trimmedListed = 0, trimmedStill = 0, trimFree = 0, held = 0, agree = 0, disagree = 0, deadOnList = 0;
const bad = [];
function agreement(s, where) {
  const year = cm.worldYear(s);
  const recs = ledger.readWorldRoster(s)?.records ?? [];
  for (const f of (s.freeAgents ?? []).filter(x => !(x.reason === 'unattached' && x.generated === true))) {
    const m = recs.filter(r => r.owner === null && (r.status === 'released' || r.status === 'retired') && r.origin.name === f.name && r.origin.birthYear === year - f.age && r.player.position === f.position);
    if (m.length !== 1) continue;
    held += 1;
    if (m[0].status === 'retired') { deadOnList += 1; if (bad.length < 8) bad.push(`${where}: ${f.name} is on the list but his record says retired`); continue; }
    if (m[0].player.age === f.age && m[0].player.rating === f.rating) agree += 1;
    else { disagree += 1; if (bad.length < 8) bad.push(`${where}: ${f.name} list ${f.age}/${f.rating}, record ${m[0].player.age}/${m[0].player.rating}`); }
  }
}
for (const [club, era, seed] of [['Everton', 'now', 0x71], ['Ajax', 'now', 0x72], ['Southampton', 'era2015', 0x73], ['Freiburg', 'now', 0x74]]) {
  Math.random = stream(seed);
  let s = cm.startCareer(club, era);
  s = season(s);
  if (s.sacked) { console.log(`  ${club}: sacked`); continue; }
  const weak = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating)[0];
  const clones = Array.from({ length: 16 }, (_, i) => ({ ...weak, id: `trimprobe-${seed}-${i}`, name: `Trim Probe ${seed}${i}`, age: 21, contractYears: 3, generated: true, worldRosterKey: undefined, isYouth: false, academyGrad: false, potential: weak.rating }));
  s = { ...s, squad: [...s.squad, ...clones] };
  const before = s;
  s = cm.startNextSeason(s);
  const inNext = new Set(s.squad.map(p => p.name));
  const retired = new Set(s.retiredNames ?? []);
  const trimmed = before.squad.filter(p => !p.onLoan && (p.contractYears ?? 9) > 1 && !inNext.has(p.name) && !retired.has(p.name) && !(s.loanedOut ?? []).some(l => l.player.name === p.name));
  const listed = trimmed.filter(p => (s.freeAgents ?? []).some(f => f.name === p.name));
  trimmedTotal += trimmed.length; trimmedListed += listed.length;
  trimFree += listed.filter(p => { const f = s.freeAgents.find(x => x.name === p.name); return f.reason === 'released' && !f.fromMyClub; }).length;
  console.log(`  ${club}: squad ${before.squad.length} into the summer, ${s.squad.length} after; trimmed ${trimmed.length}, on the list ${listed.length}`);
  agreement(s, `${club} summer 1`);
  for (let k = 2; k <= 3; k += 1) {
    s = season(s); if (s.sacked) break;
    s = cm.startNextSeason(s);
    agreement(s, `${club} summer ${k}`);
  }
  if (!s.sacked) trimmedStill += trimmed.filter(p => (s.freeAgents ?? []).some(f => f.name === p.name) || (s.retiredNames ?? []).includes(p.name) || s.squad.some(q => q.name === p.name)).length;
}
for (const b of bad) console.log(`  BAD ${b}`);
console.log(`trimprobe: trimmed ${trimmedTotal}, on the list after the summer ${trimmedListed} (released, not mine: ${trimFree}), still somewhere two summers on ${trimmedStill}; ledger held list men ${held}, agree ${agree}, disagree ${disagree}, record retired but on list ${deadOnList}`);
process.exit(trimmedTotal === 0 || trimmedListed !== trimmedTotal || disagree || deadOnList ? 1 : 0);
