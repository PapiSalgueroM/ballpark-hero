/* Review probe (Round 1520, run lens): a save written by the BASE engine (BASE_ROOT) opened by the branch engine.
   Measures: (a) beyond `nation`, does the open equal the base's own open; (b) natQuota asks the base grades onTrack
   that the branch grades done on load; (c) after one match and after a whole season on the same stream, which keys
   differ beyond `nation`. Never reads the network. Run from the repo root: BASE_ROOT=/tmp/base node <this>. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE_ROOT;
if (!BASE || !fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.log('CANNOT RUN: BASE_ROOT'); process.exit(2); }
const MODS = { cm: 'lib/clubManager', asks: 'lib/clubManagerBoardAsks', wr: 'lib/clubManagerWorldRoster' };
async function bundleOf(root, name) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `rv-${name}-`));
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, Object.entries(MODS).map(([k, f]) => `export * as ${k} from ${JSON.stringify(path.join(root, `src/${f}.ts`))};`).join('\n'));
  const out = path.join(work, 'bundle.cjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const H = req(await bundleOf(ROOT, 'head'));
const B = req(await bundleOf(BASE, 'base'));
await H.cm.ensureAllEraRosters();
await B.cm.ensureAllEraRosters();
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function withStream(seed, fn) { const saved = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = saved; } }
const strip = (mod, s) => {
  const view = s.worldRoster ? mod.wr.worldRosterView(s) : null;
  const t = view && view !== s.worldRoster ? { ...s, worldRoster: { ...view, packedRecords: undefined, packedFormat: undefined } } : s;
  return JSON.stringify(t, (k, v) => (k === 'nation' ? undefined : v));
};
const diffKeys = (a, b) => { const x = JSON.parse(a), y = JSON.parse(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])); };
const rawSave = (mod, s) => { store.delete(mod.cm.SAVE_KEY); mod.cm.saveCareer(s); return store.get(mod.cm.SAVE_KEY); };
const reload = (mod, raw) => { store.set(mod.cm.SAVE_KEY, raw); return mod.cm.loadCareer(); };
const playSeason = (mod, s) => { for (let g = 0; g < 160; g += 1) { const r = mod.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; } return s; };

const fleet = [];
for (const era of H.cm.CM_ERAS.map(e => e.id)) {
  for (const lg of era === 'now' ? H.cm.REAL_LEAGUES : H.cm.eraLeaguesFor(era)) {
    const clubs = (era === 'now' ? H.cm.playableClubs(lg.id) : H.cm.eraPlayableClubs(era, lg.id)).map(c => c.name);
    for (const club of new Set([clubs[0], clubs.at(-1)].filter(Boolean))) fleet.push({ era, club });
  }
}
const LIMIT = Number(process.env.FLEET || fleet.length), SEASON = process.env.SEASON === '1';
const msgKey = m => `${m.kind}|${String(m.text ?? '').slice(0, 140)}`;
function inboxDiff(tag, sb, sh) {
  const xb = (sb.inbox ?? []).map(msgKey), xh = (sh.inbox ?? []).map(msgKey);
  const onlyB = xb.filter(k => !xh.includes(k)), onlyH = xh.filter(k => !xb.includes(k));
  console.log(`  inbox ${tag}: base only ${JSON.stringify(onlyB.slice(0, 3))}; branch only ${JSON.stringify(onlyH.slice(0, 3))}`);
  const ib = sb.inbox ?? [], ih = sh.inbox ?? [];
  const at = Array.from({ length: Math.max(ib.length, ih.length) }, (_, i) => i).find(i => JSON.stringify(ib[i]) !== JSON.stringify(ih[i]));
  if (at !== undefined) {
    const x = ib[at] ?? {}, y = ih[at] ?? {};
    const ks = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    console.log(`  inbox ${tag} first differing message #${at} (${x.kind}): ${ks.map(k => `${k}: ${JSON.stringify(x[k]).slice(0, 90)} | ${JSON.stringify(y[k]).slice(0, 90)}`).join('; ')}`);
  }
}
function summaryDiff(club, sb, sh) {
  const pb = sb.pendingSummary ?? {}, ph = sh.pendingSummary ?? {};
  for (const k of new Set([...Object.keys(pb), ...Object.keys(ph)])) if (JSON.stringify(pb[k]) !== JSON.stringify(ph[k])) console.log(`  summary ${club}.${k}: base ${JSON.stringify(pb[k]).slice(0, 220)} | branch ${JSON.stringify(ph[k]).slice(0, 220)}`);
}
let n = 0, openDiff = 0, asks = 0, flipped = 0, matchDiff = 0, seasonDiff = 0, rebased = 0, summaryReal = 0;
const keyTally = new Map(), seasonTally = new Map();
for (const f of fleet.slice(0, LIMIT)) {
  const seed = 1520 + n;
  const sB = withStream(seed, () => B.cm.startCareer(f.club, f.era));
  const raw = rawSave(B, sB);
  const bL = reload(B, raw), hL = reload(H, raw);
  if (!bL || !hL) { console.log(`  FAIL: ${f.era} ${f.club} would not open (${!!bL}, ${!!hL})`); continue; }
  n += 1;
  const ob = strip(B, bL), oh = strip(H, hL);
  if (ob !== oh) { openDiff += 1; for (const k of diffKeys(ob, oh)) keyTally.set(k, (keyTally.get(k) ?? 0) + 1); }
  /* Verify change: grade the branch's OWN stored ask (rebased by keepCountryAsks), matched by index, not the base's. */
  (bL.boardObjectives ?? []).forEach((o, i) => {
    if (o.id !== 'natQuota') return;
    asks += 1;
    const ho = (hL.boardObjectives ?? [])[i];
    if (!ho || ho.id !== 'natQuota' || ho.country !== o.country) { flipped += 1; console.log(`  MISMATCH: ${f.era} ${f.club} ask ${i}`); return; }
    if (ho.target !== o.target) { rebased += 1; if (rebased <= 6) console.log(`  rebased: ${f.era} ${f.club}: "${o.label}" -> "${ho.label}"`); }
    const sb = B.asks.askStatus(bL, o), sh = H.asks.askStatus(hL, ho);
    if (sb !== sh) { flipped += 1; if (flipped <= 12) console.log(`  flip: ${f.era} ${f.club}: base "${o.label}" ${sb}, branch "${ho.label}" ${sh}`); }
  });
  const mB = withStream(seed + 7, () => B.cm.playNextEntry(bL, { skipHalftime: true }).state);
  const mH = withStream(seed + 7, () => H.cm.playNextEntry(hL, { skipHalftime: true }).state);
  const pb = strip(B, mB), ph = strip(H, mH);
  if (pb !== ph) { matchDiff += 1; for (const k of diffKeys(pb, ph)) keyTally.set(`match:${k}`, (keyTally.get(`match:${k}`) ?? 0) + 1); if (matchDiff <= 3) inboxDiff(`match ${f.club}`, mB, mH); }
  if (SEASON) {
    const eB = withStream(seed + 9, () => B.cm.finishSeason(playSeason(B, mB)).state);
    const eH = withStream(seed + 9, () => H.cm.finishSeason(playSeason(H, mH)).state);
    const qb = strip(B, eB), qh = strip(H, eH);
    const pb = eB.pendingSummary ?? {}, ph = eH.pendingSummary ?? {};
    const other = [...new Set([...Object.keys(pb), ...Object.keys(ph)])].filter(k => k !== 'objectives' && JSON.stringify(pb[k]) !== JSON.stringify(ph[k]));
    const hits = x => (x.objectives ?? []).map(o => o.hit);
    if (other.length || JSON.stringify(hits(pb)) !== JSON.stringify(hits(ph))) { summaryReal += 1; if (summaryReal <= 8) console.log(`  SUMMARY REAL: ${f.era} ${f.club}: keys ${other.join(',')} score ${pb.seasonScore} | ${ph.seasonScore} hits ${JSON.stringify(hits(pb))} | ${JSON.stringify(hits(ph))}`); }
    if (qb !== qh) { seasonDiff += 1; const ks = diffKeys(qb, qh); for (const k of ks) seasonTally.set(k, (seasonTally.get(k) ?? 0) + 1); if (seasonDiff <= 8) console.log(`  season differs: ${f.era} ${f.club}: ${ks.join(', ')}`); if (seasonDiff <= 4) { inboxDiff(`season ${f.club}`, eB, eH); summaryDiff(f.club, eB, eH); } }
  }
}
console.log(`careers ${n}; open differs beyond nation ${openDiff}; after a match ${matchDiff}${SEASON ? `; after the season ${seasonDiff}` : ''}`);
console.log(`natQuota asks on the base save: ${asks}; graded differently by the branch on load: ${flipped}`);
console.log(`differing keys: ${JSON.stringify([...keyTally])}`);
if (SEASON) console.log(`season keys: ${JSON.stringify([...seasonTally])}`);
console.log(`verify-oldsave2: careers ${n}; natQuota asks ${asks}; rebased ${rebased}; own ask graded differently ${flipped}; season summaries differing beyond objective labels ${summaryReal}`);
