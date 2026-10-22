/* Round 1525 probe (not committed): what a season looks like at the awards block, per position and tier.
   Plays the house fleet (scripts/lib/careerStep.mjs, first choice of every card) and records, at the moment the
   season awards are decided, the numbers the row holds. Env: PROBE_POS (one position), PROBE_N (careers),
   PROBE_SEED. Writes a gzipped CSV of every row to $RC_OUT (or .tmp-fx) and prints a summary. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { careerStep } from '../../scripts/lib/careerStep.mjs';

const ROOT = process.cwd();
const POS = process.env.PROBE_POS || 'ST';
const N = Number(process.env.PROBE_N || 10);
const SEED = Number(process.env.PROBE_SEED || 1525);
const OUT_DIR = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'field-probe-'));
const out = path.join(temp, 'bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({ absWorkingDir: ROOT, stdin: { contents: "export * as E from './src/lib/soccerCareerEngine'; export * as A from './src/lib/soccerCareerAttributes';", resolveDir: ROOT },
  outfile: out, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
let text = fs.readFileSync(out, 'utf8');
const needle = 'name: "Player of the Month"';
const at = text.indexOf(needle);
if (at < 0 || text.indexOf(needle, at + 1) >= 0) { console.log('ABORT: the month award line is not in the bundle once'); process.exit(1); }
const lineStart = text.lastIndexOf('\n  for (const month of ', at);
if (lineStart < 0 || at - lineStart > 400) { console.log('ABORT: the month loop is not where it was'); process.exit(1); }
const sig = text.slice(text.lastIndexOf('function playPendingProSeason(', at), at).match(/^function playPendingProSeason\((\w+), /);
if (!sig) { console.log('ABORT: playPendingProSeason not found above the month line'); process.exit(1); }
text = `${text.slice(0, lineStart)}\n  if (globalThis.__awardsRow) globalThis.__awardsRow(${sig[1]}, season, thisYear);${text.slice(lineStart)}`;
fs.writeFileSync(out, text);
const { E, A } = await import(pathToFileURL(out).href);

const mul = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const ERAS = [['2020-24', 2020], ['2010-14', 2010], ['2000-04', 2000], ['1990-94', 1990]];
const rows = [];
let careers = 0;
const t0 = Date.now();
for (let i = 0; i < N; i += 1) {
  Math.random = mul(SEED * 7919 + i * 131 + POS.charCodeAt(0) * 17 + POS.charCodeAt(1));
  const ovr = 56 + (i % 5) * 3;
  const [era, start] = ERAS[Math.floor(i / 5) % ERAS.length];
  const off = A.POSITION_OFFSETS[POS];
  const stats = Object.fromEntries(keys.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  let c = E.initCareer('Probe', i % 2 ? 'England' : 'Spain', POS, era, stats, ovr, start, E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
  globalThis.__awardsRow = (s, season, year) => {
    const prev = s.seasons.filter(x => x.type === 'playing');
    const prevRating = prev.length >= 2 ? (prev[prev.length - 1]?.rating || 0) : -1;
    rows.push([i, year, s.age, s.overall, s.currentClubTier, season.apps, season.leagueApps ?? -1, season.goals, season.assists,
      season.cleanSheets, season.rating, season.yellowCards, season.redCards, season.championsLeague ? 1 : 0, prevRating,
      s.position === POS ? 0 : 1].join(','));
  };
  for (let step = 0; step < 1200 && !c.retired; step += 1) {
    if (c.phase === 'retirement_suggestion') { c = E.declineRetirementSuggestion(c, E.FALLBACK_CLUBS); continue; }
    if (c.phase === 'retirement_ceremony' || c.phase === 'post_retirement' || c.phase === 'retired') break;
    c = careerStep(E, c, E.FALLBACK_CLUBS);
  }
  careers += 1;
}
globalThis.__awardsRow = null;
const head = 'career,year,age,ovr,tier,apps,leagueApps,goals,assists,cleanSheets,rating,yellow,red,ucl,prevRating,moved';
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, `field-${POS}-${SEED}.csv.gz`), zlib.gzipSync(`${head}\n${rows.join('\n')}\n`));
const parsed = rows.map(r => r.split(',').map(Number));
const stat = (arr) => { const n = arr.length; if (!n) return 'n 0'; const m = arr.reduce((a, b) => a + b, 0) / n; const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)); const s = [...arr].sort((a, b) => a - b); const q = p => s[Math.min(n - 1, Math.floor(p * n))]; return `n ${n} mean ${m.toFixed(2)} sd ${sd.toFixed(2)} p50 ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)}`; };
for (const band of [1, 2, 3]) {
  const inBand = parsed.filter(r => (band === 3 ? r[4] >= 3 : r[4] === band) && r[5] >= 20);
  console.log(`${POS} tier ${band}${band === 3 ? '+' : ''} apps>=20: rating ${stat(inBand.map(r => r[10]))}`);
  console.log(`  goals ${stat(inBand.map(r => r[7]))}`);
  if (POS === 'GK' || POS === 'CB') console.log(`  cleanSheets ${stat(inBand.map(r => r[9]))}`);
}
console.log(`${POS}: ${careers} careers, ${rows.length} rows, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('fieldProbe: done');
