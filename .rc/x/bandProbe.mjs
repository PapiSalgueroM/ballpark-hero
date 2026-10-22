/* Review run 1525 (runner only): the brief's "the best season in a band wins more often than not", read per TIER BAND.
   The house fleet of simSoccerSeasonAwards section 2 (same career shapes), every decision of soccerAwardWon seen. For
   each award and tier band (the club's tier 1, 2, 3 and below): the eligible seasons, the top share of them by the
   award's own score less its grade (the designed share, one in rivals + 1, at least one season), and how often that
   top share won, with the model's own chance beside it. Also the single best season of each band and calendar year. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const N = Number(process.env.BAND_N || 1500);
const SEED = Number(process.env.BAND_SEED || 1525);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'band-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const entry = path.join(TMP, 'entry.ts');
const lib = m => path.join(ROOT, 'src/lib', m).split(path.sep).join('/');
fs.writeFileSync(entry, `export * as E from '${lib('soccerCareerEngine')}';\nexport * as A from '${lib('soccerCareerAttributes')}';\nexport * as W from '${lib('soccerSeasonAwards')}';\n`);
const out = path.join(TMP, 'b.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT });
let text = fs.readFileSync(out, 'utf8');
const WON = 'function soccerAwardWon(';
if (text.split(WON).length !== 2) { console.log('ABORT: soccerAwardWon not in the bundle once'); process.exit(1); }
text = text.replace(WON, 'function soccerAwardWon__decide(') + '\nfunction soccerAwardWon(a, s, r) { const w = soccerAwardWon__decide(a, s, r); if (globalThis.__awardCall) globalThis.__awardCall(a, s, w); return w; }\n';
fs.writeFileSync(out, text);
const S = await import(pathToFileURL(out).href);
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const ERAS = [['2020-24', 2020], ['2010-14', 2010], ['2000-04', 2000], ['1990-94', 1990]];
const calls = [];
let cur = 0;
globalThis.__awardCall = (award, s, won) => calls.push({ award, s: { ...s }, won, career: cur });
for (let i = 0; i < N; i += 1) {
  cur = i;
  const [era, start] = ERAS[Math.floor(i / 50) % ERAS.length];
  const pos = POS[i % POS.length];
  const ovr = 56 + (Math.floor(i / POS.length) % 5) * 3;
  Math.random = mulberry((SEED + 2) * 7919 + i * 131);
  const off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  let c = S.E.initCareer(`Band Probe ${SEED} ${i}`, i % 2 ? 'England' : 'Spain', pos, era, stats, ovr, start, S.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
  for (let k = 0; k < 1500 && !c.retired; k += 1) {
    if (c.phase === 'retirement_suggestion') c = S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS);
    else if (['retirement_ceremony', 'post_retirement', 'retired'].includes(c.phase)) break;
    else c = careerStep(S.E, c, S.E.FALLBACK_CLUBS);
  }
}
globalThis.__awardCall = null;
const W = S.W;
const barOf = n => { const nn = Math.max(2, n); const L = Math.log(nn); const root = Math.sqrt(2 * L); return { loc: root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root), root }; };
const band = t => (t >= 3 ? '3+' : String(t));
console.log(`${N} careers, ${calls.length} decisions`);
for (const award of ['Player of the Year', 'Golden Boot', 'Golden Glove', 'Young Player of the Year', 'UEFA Player of the Year', 'Comeback Player of the Year', 'Fair Play Award']) {
  const rows = calls.filter(c => c.award === award && W.soccerAwardEligible(award, c.s)).map(c => {
    const { score, field } = W.soccerAwardScore(award, c.s);
    const cfg = W.soccerAwardConfig(award, c.s.position);
    const z = (score - field.mean) / field.sd - (cfg.grade ?? 0);
    const { loc, root } = barOf(Math.max(1.2, cfg.pool / cfg.slots));
    return { ...c, z, p: Math.exp(-Math.exp(-(z - loc) * root)), rivals: cfg.pool / cfg.slots };
  });
  const parts = [];
  for (const b of ['1', '2', '3+']) {
    const r = rows.filter(x => band(x.s.clubTier) === b).sort((x, y) => y.z - x.z);
    if (!r.length) { parts.push(`${b}: -`); continue; }
    const k = Math.max(1, Math.round(r.length / (r[0].rivals + 1)));
    const top = r.slice(0, k);
    const won = top.filter(x => x.won).length, model = top.reduce((a, x) => a + x.p, 0);
    const byYear = new Map();
    for (const x of r) { const cur = byYear.get(x.s.year); if (!cur || x.z > cur.z) byYear.set(x.s.year, x); }
    const yb = [...byYear.values()];
    parts.push(`${b}: top ${k} of ${r.length} won ${won} (${(100 * won / k).toFixed(1)}%, model ${(100 * model / k).toFixed(1)}%); best of each year ${yb.filter(x => x.won).length} of ${yb.length}`);
  }
  console.log(`${award}: ${parts.join(' | ')}`);
}
/* Independence of the keyed streams: seasons where POY and Young were both eligible, and how often both were won
   against the product of their own rates on those seasons. */
const seasonKey = c => `${c.career}|${c.s.year}`;
const by = new Map();
for (const c of calls) { if (!W.soccerAwardEligible(c.award, c.s)) continue; const m = by.get(seasonKey(c)) || {}; m[c.award] = c.won; by.set(seasonKey(c), m); }
for (const [a, b] of [['Player of the Year', 'Young Player of the Year'], ['Player of the Year', 'Fair Play Award'], ['Player of the Year', 'UEFA Player of the Year']]) {
  const both = [...by.values()].filter(m => a in m && b in m);
  const wa = both.filter(m => m[a]).length, wb = both.filter(m => m[b]).length, wab = both.filter(m => m[a] && m[b]).length;
  console.log(`co-wins ${a} + ${b}: ${both.length} seasons eligible for both, ${wa} and ${wb} won, both ${wab} (independent would give ${(wa * wb / Math.max(1, both.length)).toFixed(2)})`);
}
console.log('bandProbe: done');
