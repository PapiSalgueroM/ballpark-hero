// Fix2 probe (Release AV, finding 4 of the closing check): WHICH career of the reviewer's
// NHL y2006 2019-20 centre case has 82 games on its line, and why. Never committed.
// The loop is the reviewer's own (.tmp-fx/uscPlan.mjs), one case only, and it prints the club of every line.
//   node .tmp-fx/fx2Games.mjs            cwd = the tree that plays
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fx2-games-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const P = rel => path.join(root, rel).split(path.sep).join('/');
const entry = path.join(work, 'entry.ts'), outfile = path.join(work, 'bundle.cjs');
fs.writeFileSync(entry, [['nhl', 'src/lib/nhlCareerSport.ts'], ['prog', 'src/lib/usCareerProgramme.ts'], ['shape', 'src/lib/usSeasonShape.ts'], ['led', 'src/data/usSeasonLedgerNhl.ts']]
  .map(([as, rel]) => `export * as ${as} from '${P(rel)}';`).join('\n'));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const B = require(outfile);
const U = B.prog;
const S = B.nhl.NHL_CAREER_SPORT;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const realRandom = Math.random;
const N = Number(process.env.USC_PLAN_N || 60);
const CASES = (process.env.FX2_CASES || '2019:C,2019:G,2012:C,2020:C').split(',').map(s => s.split(':'));
for (const [ys, pos] of CASES) {
  const year = Number(ys), era = 'y2006';
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const rng = mulberry32(31 + i * 977 + year + pos.charCodeAt(0) * 13);
    Math.random = rng;
    try {
      let c = S.startCareer(`Plan ${i}`, pos, S.create.archetypes[pos][i % S.create.archetypes[pos].length], rng, null, era);
      c.year = year - 2;
      let tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      c.contractYears = 6;
      for (let k = 0; k < 2; k += 1) {
        if (k === 1) c = U.saveUsCareerProgramme(c, 'nhl', { ...U.usProgrammeDefaults(), partnership: 'build' });
        S.campBattle(c, tq, rng);
        const prep0 = U.prepareUsCareerProgramme(c, 'nhl');
        const { line: l0 } = S.simSeason(c, tq, rng);
        U.restoreUsCareerProgramme(c, prep0);
        S.progress(c, rng);
        U.settleUsCareerProgramme(c, l0, 'nhl', prep0);
        c.pendingRivalryEvent = null; c.pendingRivalryChoice = null;
      }
      if (c.retired || c.year !== year || (c.suspendedSeasons ?? 0) > 0) continue;
      c = U.saveUsCareerProgramme(c, 'nhl', { ...U.usProgrammeDefaults(), expectation: 'steady', partnership: 'build', bonus: 'steady' });
      if (!c.programme) continue;
      S.campBattle(c, tq, rng);
      const prep = U.prepareUsCareerProgramme(c, 'nhl');
      const { line } = S.simSeason(c, tq, rng);
      U.restoreUsCareerProgramme(c, prep);
      const row = B.shape.seasonLengthRow('nhl', line.year, line.team);
      rows.push({ i, team: line.team, year: line.year, games: line.games, slate: line.slate ?? 'none', length: row.games, from: row.from });
    } finally { Math.random = realRandom; }
  }
  const byFrom = {};
  for (const r of rows) { const k = `${r.from} ${r.length}`; (byFrom[k] ??= []).push(r); }
  console.log(`nhl ${era} ${year} ${pos}: ${rows.length} lines`);
  for (const [k, list] of Object.entries(byFrom).sort()) {
    const g = list.map(r => r.games).sort((a, b) => a - b);
    console.log(`   season read as "${k}": ${list.length} lines, clubs ${[...new Set(list.map(r => r.team))].sort().join(' ')}, games min ${g[0]} median ${g[Math.floor(g.length / 2)]} max ${g[g.length - 1]}`);
  }
  const over = rows.filter(r => r.games > r.length);
  console.log(`   lines with more games than the season read for their club: ${over.length}`);
  if (year === 2019) {
    const out = rows.filter(r => !Object.prototype.hasOwnProperty.call(B.led.NHL_2019_CLUB_GAMES, r.team));
    console.log(`   lines on a club the 2019-20 table does not hold: ${out.length}: ${out.map(r => `career ${r.i} ${r.team} ${r.games} games (slate ${r.slate})`).join('; ') || 'none'}`);
    const top = rows.filter(r => r.games > 71);
    console.log(`   lines over 71 games: ${top.length}: ${top.map(r => `career ${r.i} ${r.team} ${r.games}`).join('; ') || 'none'}`);
  }
}
console.log(`fx2Games: done on ${root}`);
