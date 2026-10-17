// Round 1500 reviewer probe (run lens): does the desk's printed ban (correction 3) match what the four REAL engines
// then do? For every sport's fixture dirty save, over a grid of heat, pending ban and dirty money, each way is
// applied with the shared rule, then six season ends are played the way the board plays them (a banned year takes
// one off the count first, then sport.progress runs its corruption meter). The banned seasons the engine serves are
// compared with what the button printed (bannedAfter, bannedIfCaught, burnsToBan). Exit 1 on any mismatch.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rvban-')), 'e.cjs');
await build({
  stdin: { contents: `
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const S = { nba: NBA_CAREER_SPORT, nfl: NFL_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT };
    export * from '@/lib/careerDirtyMoney';
  `, resolveDir: ROOT, sourcefile: 'rvban.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf8'))) console.log('note: bundle names supabase.co (not fetched here)');
const M = createRequire(import.meta.url)(bundle);
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));
const rngOf = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

let cases = 0, bad = 0;
const byKey = new Map();
const dist = new Map();
const HEATS = [0, 40, 70, 75, 79, 80, 81, 84, 85, 88, 89, 89.5, 90, 91, 95, 98, 99, 100];
for (const slug of Object.keys(M.S)) {
  const sport = M.S[slug];
  const base = JSON.parse(fixture.sports[slug].saves.dirty).c;
  for (const heat of HEATS) for (const pending of [0, 1]) for (const dirty of [0.4, 1.1, 6, 20]) for (const way of M.DIRTY_WAYS) {
    const c = JSON.parse(JSON.stringify(base));
    c.heat = heat; c.dirtyMoney = dirty; c.suspendedSeasons = pending; c.retired = false;
    const n = M.wayNumbers(c, way);
    const r = way === 'quiet' ? { state: JSON.parse(JSON.stringify(c)), caught: null } : M.dealWithDirtyMoney(c, way);
    const s = JSON.parse(JSON.stringify(r.state));
    const rng = rngOf(cases + 7);
    let banned = 0, firstEndBan = null;
    for (let i = 0; i < 6 && !s.retired; i++) {
      if ((s.suspendedSeasons ?? 0) > 0) { s.suspendedSeasons -= 1; banned += 1; }
      const was = s.suspendedSeasons ?? 0;
      sport.progress(s, rng);
      if (i === 0) firstEndBan = was === 0 && (s.suspendedSeasons ?? 0) > 0;
    }
    cases++;
    const dk = `${way}:${banned}`;
    dist.set(dk, (dist.get(dk) ?? 0) + 1);
    let ok = true, printed;
    if (way === 'quiet') { printed = `burnsToBan ${n.burnsToBan}`; ok = n.burnsToBan === firstEndBan; }
    else if (way === 'wash' && r.caught) { printed = `bannedIfCaught ${n.bannedIfCaught}`; ok = n.bannedIfCaught === banned; }
    else { printed = `bannedAfter ${n.bannedAfter}`; ok = n.bannedAfter === banned; }
    if (!ok) {
      bad++;
      const k = `${slug} ${way}${way === 'wash' ? (r.caught ? ' caught' : ' clean') : ''}`;
      byKey.set(k, (byKey.get(k) ?? 0) + 1);
      if (bad <= 12) console.log(`  MISMATCH ${k}: heat ${heat} pending ${pending} dirty ${dirty}: printed ${printed}, engine served ${banned} (first end ban ${firstEndBan}), heat now ${s.heat}`);
    }
  }
}
for (const [k, v] of byKey) console.log(`  ${k}: ${v} mismatches`);
console.log(`  engine-served banned seasons by way (way:seasons=cases): ${[...dist].sort().map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(bad ? `rvban1500: ${bad} of ${cases} printed bans differ from the engines` : `rvban1500: all ${cases} printed bans match the four engines`);
process.exit(bad ? 1 : 0);
