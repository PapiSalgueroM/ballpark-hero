/* Review probe (never committed): an old Club Manager save made on <root A>, loaded on <root B>.
   node ledgerProbe.mjs make <root> <out.json>   starts careers on that tree, buys one real man, saves
   node ledgerProbe.mjs load <root> <in.json>    loads each save on that tree and counts one man in two places
   For every world ledger record (the opening window's deals between other clubs, and my purchase), a man the
   ledger says left his origin club must not still be listed there, and must be at his owner once. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const [mode, rootArg, file] = process.argv.slice(2);
const ROOT = path.resolve(rootArg);
const NM = path.join(process.cwd(), 'node_modules');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerprobe-'));
const out = path.join(TMP, 'e.cjs');
await build({
  stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as wr from '@/lib/clubManagerWorldRoster'; export * as ro from '@/data/clubManagerRosters';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [NM],
});
let seed = 12345;
Math.random = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const { cm, wr, ro } = createRequire(import.meta.url)(out);
await cm.ensureAllEraRosters();
const CLUBS = ['Everton', 'AC Milan', 'Bayern Munich'];

function audit(s, label) {
  const recs = (wr.readWorldRoster(s)?.records ?? []).filter(r => r.status === 'owned');
  let twice = 0, missing = 0, checked = 0;
  const shown = [];
  for (const r of recs) {
    const name = r.player.name;
    if (r.origin.club === r.owner) continue;
    checked += 1;
    const atOrigin = r.origin.club === s.clubName ? s.squad.filter(p => p.name === name).length : cm.worldRosterFor(s, r.origin.club).filter(p => p.n === name).length;
    const atOwner = r.owner === s.clubName ? s.squad.filter(p => p.name === name).length : cm.worldRosterFor(s, r.owner).filter(p => p.n === name).length;
    if (atOrigin > 0) { twice += 1; if (shown.length < 6) shown.push(`${name} (${r.origin.club} -> ${r.owner}, origin birth ${r.origin.birthYear})`); }
    if (atOwner !== 1) missing += 1;
  }
  const market = cm.buildMarket(s).filter(p => !p.generated);
  const byName = new Map();
  for (const p of market) byName.set(p.name, [...(byName.get(p.name) ?? []), `${p.club} ${p.age}y ${p.rating}`]);
  const dupes = [...byName.entries()].filter(([, v]) => v.length > 1);
  const mine = s.squad.filter(p => p.worldRosterKey && market.some(m => m.name === p.name)).map(p => p.name);
  console.log(`${label}: ${s.clubName}, ledger moves ${checked}, still at their old club ${twice}, not once at the owner ${missing}, market names twice ${dupes.length}, my men on the market ${mine.length}`);
  for (const line of shown) console.log(`   still at old club: ${line}`);
  for (const [n, v] of dupes.slice(0, 4)) console.log(`   market twice: ${n}: ${v.join(' | ')}`);
  return twice + missing + dupes.length + mine.length;
}

if (mode === 'make') {
  const saves = {};
  for (const club of CLUBS) {
    store.clear();
    let s = cm.startCareer(club);
    const market = cm.buildMarket(s).filter(p => !p.generated && p.club !== club && ro.CM_ROSTERS[p.club] && p.age >= 24).sort((a, b) => a.price - b.price);
    let bought = null;
    for (const mp of market) { const next = cm.buyPlayer(s, mp); if (next) { s = next; bought = mp; break; } }
    console.log(`made ${club}: bought ${bought ? `${bought.name} from ${bought.club} (${bought.age}y ${bought.rating})` : 'nobody'}`);
    audit(s, '  same tree');
    cm.saveCareer(s);
    saves[club] = Object.fromEntries(store);
  }
  fs.writeFileSync(file, JSON.stringify(saves));
  console.log('saved', Object.keys(saves).length);
} else {
  const saves = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bad = 0;
  for (const [club, entries] of Object.entries(saves)) {
    store.clear();
    for (const [k, v] of Object.entries(entries)) store.set(k, v);
    const s = cm.loadCareer();
    if (!s) { console.log(`${club}: did not load`); bad += 1; continue; }
    bad += audit(s, 'loaded');
  }
  console.log(`ledgerProbe ${mode}: ${bad} problems`);
  process.exit(bad ? 1 : 0);
}
