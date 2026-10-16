/* Reviewer (run lens), runner only, never committed. Measures the help's claim (ClubManagerHelp, the board's
   verdict block): "Every new job opens at 69: your first, a summer move, a mid season takeover and an
   application that said yes. So one bad night still leaves you Safe."
   Plays the PRODUCTION paths (no board override anywhere): startCareer then startMidSeason at autumn, newYear
   and runIn (useClubManager hands it the startCareer state), and summer moves (a season played, finishSeason,
   startNextSeason to the first offer). For each new job: its opening, its first competitive match, and when that
   match is lost, the board after it and whether it is under 60 (Safe is 60 or more, clubManagerMeters).
   Prints, asserts nothing; exit 0 when it ran. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
require(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'));
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-fall-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const { cm, cal } = require(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const QUICK = { skipHalftime: true };
const ERAS = [['era2005'], ['era2015'], [null]];
function worldClubs(era) {
  const defs = era ? (cm.ERA_LEAGUES[era] ?? []).flatMap(l => l.clubs.map(c => cm.eraClubDefFor(c, era))) : cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id));
  return defs.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
function spread(list, k) { return list.length <= k ? list : Array.from({ length: k }, (_, i) => list[Math.floor((i * list.length) / k)]); }
const startOf = (club, era, seed) => withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
function firstMatch(s, seed) {
  for (let i = 0; i < 40; i++) {
    const before = s.boardConfidence, mood = s.press?.mood ?? null;
    const r = withSeed(seed * 101 + i + 1, () => cm.playNextEntry(s, QUICK));
    s = r.state;
    if (r.kind === 'match') {
      const rep = r.report;
      return { lost: !rep.won && !rep.drawn, before, after: s.boardConfidence, comp: rep.competition ?? '?', mood, sacked: !!s.sacked };
    }
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return null;
}
const rows = [];
const N_CLUBS = Number(process.env.RV_CLUBS ?? 14), N_SEEDS = Number(process.env.RV_SEEDS ?? 4);
const t0 = Date.now();
for (const [era] of ERAS) {
  cm.registerLeagueOverrides(null);
  const clubs = spread(worldClubs(era), N_CLUBS);
  for (const c of clubs) {
    for (let seed = 0; seed < N_SEEDS; seed++) {
      for (const e of ['autumn', 'newYear', 'runIn']) {
        let t;
        try { t = withSeed(seed * 7 + 1, () => cal.startMidSeason(startOf(c.name, era, 4000 + seed), e)); } catch (err) { rows.push({ kind: e, err: String(err).slice(0, 80) }); continue; }
        const m = firstMatch(t, 9000 + seed * 13 + e.length);
        rows.push({ kind: e, era: era ?? 'now', club: c.name, tier: c.tier, open: t.boardConfidence, ...(m ?? { none: true }) });
      }
    }
  }
  /* summer moves: one season, then the first offer */
  for (const c of clubs) {
    for (let seed = 0; seed < 2; seed++) {
      let s = startOf(c.name, era, 6000 + seed);
      let ok = false;
      for (let i = 0; i < 160; i++) { const r = withSeed(seed * 7919 + i + 1, () => cm.playNextEntry(s, QUICK)); s = r.state; if (s.sacked) break; if (r.kind === 'seasonOver') { ok = true; break; } }
      if (!ok) continue;
      const fin = withSeed(seed * 31 + 3, () => cm.finishSeason(s));
      const take = fin.summary.offers[0]?.club;
      if (!take) continue;
      const next = withSeed(seed * 31 + 5, () => cm.startNextSeason(fin.state, take));
      if (next.clubName === fin.state.clubName) continue;
      const m = firstMatch(next, 7000 + seed);
      rows.push({ kind: 'move', era: era ?? 'now', club: next.clubName, tier: (era ? cm.eraClubDefFor(next.clubName, era) : cm.clubDefFor(next.clubName))?.tier, open: next.boardConfidence, ...(m ?? { none: true }) });
    }
  }
}
const errs = rows.filter(r => r.err);
console.log(`[fall] ${rows.length} new jobs (${errs.length} could not start${errs.length ? `: ${errs[0].err}` : ''}), ${Math.round((Date.now() - t0) / 1000)} s`);
for (const kind of ['autumn', 'newYear', 'runIn', 'move']) {
  const list = rows.filter(r => r.kind === kind && !r.err && !r.none);
  const lost = list.filter(r => r.lost);
  const under = lost.filter(r => r.after < 60);
  const opens = [...new Set(list.map(r => r.open))].join(',');
  const comps = {};
  for (const r of list) comps[r.comp] = (comps[r.comp] ?? 0) + 1;
  const uComps = {};
  for (const r of under) uComps[r.comp] = (uComps[r.comp] ?? 0) + 1;
  const falls = lost.map(r => Math.round((r.before - r.after) * 10) / 10).sort((a, b) => a - b);
  console.log(`[fall] ${kind}: ${list.length} jobs, opening(s) ${opens}; first match by competition ${JSON.stringify(comps)}; lost ${lost.length}; lost and UNDER 60 after it: ${under.length} (${lost.length ? Math.round((100 * under.length) / lost.length) : 0} percent) by competition ${JSON.stringify(uComps)}; fall p50 ${falls[Math.floor(falls.length / 2)] ?? 'n/a'} max ${falls[falls.length - 1] ?? 'n/a'}`);
  for (const r of under.slice(0, 4)) console.log(`  e.g. ${r.club} (${r.era}, tier ${r.tier}) ${kind}: opened ${r.open}, lost a ${r.comp} match, board ${r.before} to ${r.after}, press mood ${r.mood}`);
}
console.log('[fall] DONE');
