/* Reviewer probe for Round 1597 (runner only, never committed). Copied into scripts/ of the tree under test.
 *   OLDFLEET_WRITE=<file> : on the base tree, play 12 careers and store real saveCareer strings at the end of
 *                           seasons 3 and 6 and in the middle of season 4, with base's own loadCareer hash of each.
 *   OLDFLEET_READ=<file>  : on the branch, load each string, compare the load hash with base's, then play on
 *                           (rest of the season if mid season) through two summers and check nobody is lost. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.env.OLDFLEET_WRITE || '', READ = process.env.OLDFLEET_READ || '';
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'oldfleet.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent' });
const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
const require = createRequire(path.join(ROOT, 'package.json'));
const ctx = vm.createContext({ module, exports: module.exports, require,
  console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
  setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'oldfleet.cjs' }).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();
function stream(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const OPT = { skipHalftime: true, noCoach: true };
const hash = s => crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 24);
const isJourneyman = f => f.reason === 'unattached' && f.generated === true;
const CLUBS = [['Everton', 'now'], ['Villarreal', 'now'], ['Freiburg', 'now'], ['Ajax', 'now'], ['Braga', 'now'], ['Southampton', 'era2015']];
const SEEDS = [0x2a0b1, 0x2a0c2];
function play(s, limit = 400) {
  for (let i = 0; i < limit; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = cm.playNextEntry(s, OPT); s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) return { s, over: r.kind === 'seasonOver' };
  }
  return { s, over: false };
}
function pre(s) {
  s = { ...s, budget: Math.max(s.budget, 400), wageCap: 99999 };
  if (s.squad.length <= 22) return s;
  const w = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
  return (w && cm.releasePlayer(s, w.id)) || s;
}
function saveString(s) { store.clear(); if (!cm.saveCareer(s)) throw new Error('saveCareer refused'); return store.get(cm.SAVE_KEY); }
function loadString(str) { store.clear(); store.set(cm.SAVE_KEY, str); return cm.loadCareer(); }

if (WRITE) {
  const saves = [];
  CLUBS.forEach(([club, eraId], i) => SEEDS.forEach(seed => {
    Math.random = stream(seed + i);
    let s = cm.startCareer(club, eraId);
    for (let season = 1; season <= 6; season += 1) {
      s = pre(s);
      if (season === 4) {
        const half = play(s, 20); s = half.s;
        if (!s.sacked) { const str = saveString(s); saves.push({ club, eraId, seed: seed + i, at: 'mid4', str, loadHash: hash(loadString(str)) }); }
      }
      const r = play(s); s = r.s;
      if (s.sacked) { console.log(`  ${club} ${seed}: sacked in season ${season}`); break; }
      s = cm.finishSeason(s).state;
      if (season === 3 || season === 6) { const str = saveString(s); saves.push({ club, eraId, seed: seed + i, at: `end${season}`, str, loadHash: hash(loadString(str)) }); }
      s = cm.startNextSeason(s);
    }
  }));
  fs.writeFileSync(WRITE, JSON.stringify(saves));
  console.log(`oldfleet: wrote ${saves.length} saves`);
  process.exit(0);
}

const saves = JSON.parse(fs.readFileSync(READ, 'utf8'));
let loadSame = 0, loadDiff = 0, tracked = 0, lost = 0, twice = 0, recovered = 0, recoverable = 0, marked = 0, checks = 0;
const lostLines = [];
for (const sv of saves) {
  const loaded = loadString(sv.str);
  if (!loaded) { console.log(`  FAIL ${sv.club} ${sv.at}: does not load`); lost += 1; continue; }
  if (hash(loaded) === sv.loadHash) loadSame += 1; else { loadDiff += 1; console.log(`  LOAD DIFFERS ${sv.club} ${sv.seed} ${sv.at}`); }
  const records0 = ledger.readWorldRoster(loaded)?.records ?? [];
  const here0 = new Set([...loaded.squad.map(p => p.name), ...(loaded.loanedOut ?? []).map(l => l.player.name), ...(loaded.freeAgents ?? []).map(f => f.name), ...(loaded.retiredNames ?? [])]);
  const want = new Map();
  for (const f of (loaded.freeAgents ?? []).filter(x => !isJourneyman(x))) want.set(f.name, 'on the old list');
  for (const r of records0) if (r.status === 'released' && r.owner === null && !here0.has(r.player.name)) want.set(r.player.name, 'ledger released, listed nowhere');
  Math.random = stream(sv.seed + 0x99);
  let s = loaded;
  for (let summer = 1; summer <= 2; summer += 1) {
    if (!s.pendingSummary || sv.at === 'mid4' && summer === 1) {
      const r = play(s); s = r.s; if (s.sacked) break; s = cm.finishSeason(s).state;
    }
    const leaving = [...s.squad.filter(p => !p.onLoan), ...(s.loanedOut ?? []).map(l => l.player)];
    const before = s;
    s = cm.startNextSeason(s);
    if (summer === 1 && s.freeAgencyV2 === true) marked += 1;
    const stay = new Set([...s.squad.map(p => p.name), ...(s.loanedOut ?? []).map(l => l.player.name)]);
    for (const p of leaving) if (!stay.has(p.name) && !want.has(p.name)) want.set(p.name, `left at summer ${summer}`);
    const recs = ledger.readWorldRoster(s)?.records ?? [];
    for (const [name, how] of want) {
      checks += 1;
      const inSquad = stay.has(name) ? 1 : 0;
      const pool = (s.freeAgents ?? []).filter(f => f.name === name).length;
      const ret = (s.retiredNames ?? []).includes(name) ? 1 : 0;
      const rec = recs.find(r => r.player.name === name && r.status === 'owned' && r.owner && r.owner !== s.clubName);
      const ai = rec && cm.worldRosterFor(s, rec.owner).some(p => p.n === name) ? 1 : 0;
      const total = inSquad + pool + ret + ai;
      if (total === 0) { lost += 1; if (lostLines.length < 12) lostLines.push(`${sv.club} ${sv.seed} ${sv.at} summer ${summer}: ${name} (${how})`); want.delete(name); }
      else if (total > 1 || pool > 1) twice += 1;
      if (ret) want.delete(name);
    }
    if (summer === 1) for (const [name, how] of want) if (how === 'ledger released, listed nowhere') { recoverable += 1; if ((s.freeAgents ?? []).some(f => f.name === name) || (s.retiredNames ?? []).includes(name)) recovered += 1; }
    s = pre(s);
  }
  tracked += want.size;
}
for (const l of lostLines) console.log(`  LOST ${l}`);
console.log(`oldfleet: ${saves.length} saves from base; load identical to base ${loadSame}, differs ${loadDiff}; marked after first summer ${marked}; checks ${checks}; lost ${lost}; twice ${twice}; ledger-only men recoverable ${recoverable}, on the list or retired after the first summer ${recovered}`);
process.exit(lost || loadDiff || twice ? 1 : 0);
