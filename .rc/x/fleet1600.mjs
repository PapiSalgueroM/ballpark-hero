/* Round 1600 inert fleet probe (never committed; sent to a runner as .rc/x/fleet1600.mjs).
   node fleet1600.mjs <root>   bundles <root>/src's Club Manager engine and both dailies and prints one line per
   save digest: seeds x clubs x seasons, plus every club def and the daily deals of a run of dates. Run it on the
   base tree and on the head tree and diff the two outputs: equal means the round moved nothing a save holds. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(process.argv[2] || '.');
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEEDS = (process.env.FLEET_SEEDS || '1,2,3,4,5').split(',').map(Number);
const SEASONS = Number(process.env.FLEET_SEASONS || 3);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet1600-'));
const out = path.join(TMP, 'engine.cjs');
await build({
  stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as dd from '@/lib/deadlineDay'; export * as hs from '@/lib/managerHotSeat';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(HERE, 'node_modules')],
});
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const FIXED_NOW = Date.UTC(2026, 9, 30, 12, 0, 0);
Date.now = () => FIXED_NOW;
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const digest = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const req = createRequire(import.meta.url);
const { cm, dd, hs } = req(out);
await cm.ensureAllEraRosters();

const CREST = { shape: 1, pattern: 3, color1: '#059669', color2: '#f8fafc', initials: 'FT' };
const CAREERS = [
  { tag: 'liverpool', club: 'Liverpool' },
  { tag: 'milan', club: 'AC Milan' },
  { tag: 'miami', club: 'Inter Miami' },
  { tag: 'everton', club: 'Everton' },
  { tag: 'barca2010', club: 'Barcelona', era: 'era2010' },
  { tag: 'created', club: 'Fleet Town', custom: { name: 'Fleet Town', stadium: 'Fleet Park', crest: CREST, budgetTier: 'mid', leagueId: 'premier', replacedClub: '', quality: 77 } },
];
const lines = [];
function playSeason(s) {
  for (let guard = 0; guard < 140; guard++) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver' || s.sacked) return s;
  }
  throw new Error('a season never ended');
}
for (const seed of SEEDS) {
  for (const c of CAREERS) {
    const outer = Math.random;
    Math.random = mulberry((hash(`${seed}|${c.tag}`)) >>> 0);
    try {
      let s = c.custom ? cm.startCareer(c.club, 'now', c.custom) : cm.startCareer(c.club, c.era ?? 'now');
      lines.push(`career ${seed} ${c.tag} day0 ${digest(s)}`);
      for (let season = 1; season <= SEASONS; season++) {
        s = playSeason(s);
        const fin = cm.finishSeason(s).state;
        lines.push(`career ${seed} ${c.tag} s${season} ${digest(fin)} squad ${digest(fin.squad)} market ${digest(cm.buildMarket(fin).slice(0, 400))}`);
        if (fin.sacked) break;
        s = cm.startNextSeason(fin);
      }
    } finally { Math.random = outer; }
  }
}
for (const lg of cm.REAL_LEAGUES) lines.push(`defs ${lg.id} ${digest(cm.playableClubs(lg.id))}`);
for (const era of ['era2005', 'era2010', 'era2015', 'era2020']) for (const lg of cm.ERA_LEAGUES[era] ?? []) lines.push(`defs ${era} ${lg.id} ${digest(cm.eraPlayableClubs(era, lg.id))}`);
const day0 = Date.UTC(2026, 8, 1);
for (let i = 0; i < 120; i += 3) {
  const date = new Date(day0 + i * 86400000).toISOString().slice(0, 10);
  const outer = Math.random; Math.random = mulberry(hash(date));
  try {
    const d = dd.dailyDeadlineDay(date); const run = dd.startDeadlineDay(d);
    const h = hs.dailyHotSeat(date); const hrun = hs.startHotSeat(h);
    lines.push(`daily ${date} dd ${digest(d)} ${digest(run)} hs ${digest(h)} ${digest(hrun)}`);
  } finally { Math.random = outer; }
}
console.log(lines.join('\n'));
console.error(`fleet1600: ${lines.length} lines from ${ROOT}`);
