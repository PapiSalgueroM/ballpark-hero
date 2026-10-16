/* Round 1343, finding 3.8 printout (diagnostic, prints only): careerStats.played and h2h.length right after a
   mid season takeover and a Manager Hot Seat takeover, and the record line the save would show. */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'probe38-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\nexport * as hs from '@/lib/managerHotSeat';\nexport * as rec from '@/lib/clubManagerRecords';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'b.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear() };
const { cm, cal, hs, rec } = createRequire(import.meta.url)(path.join(work, 'b.cjs'));
await cm.ensureAllEraRosters();
let a = 1343;
Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const show = g => (g ? `${g.score} vs ${g.opp}, S${g.season}${g.missed ? `, missed ${g.missed}` : ''}` : 'none');
for (const entryName of ['autumn', 'newYear', 'runIn']) {
  for (const club of ['Everton', 'Liverpool']) {
    const s = cal.startMidSeason(cm.startCareer(club), entryName);
    console.log(`midSeason ${entryName} ${club}: week ${s.week}, played ${s.careerStats.played}, h2h ${(s.h2h ?? []).length}, stored ${show(s.careerStats.highestScoring)}, line ${show(rec.highestScoringOf(s))}`);
  }
}
for (const date of ['2026-10-12', '2026-10-30']) {
  const d = hs.dailyHotSeat(date);
  const run = hs.startHotSeat({ club: d.club, seed: d.seed, daily: d.daily });
  const s = run.state;
  console.log(`hotSeat ${date} ${d.club}: week ${s.week}, played ${s.careerStats.played}, h2h ${(s.h2h ?? []).length}, matchRules ${s.matchRules ?? 'current'}, stored ${show(s.careerStats.highestScoring)}, line ${show(rec.highestScoringOf(s))}`);
}
console.log('probe38 done');
