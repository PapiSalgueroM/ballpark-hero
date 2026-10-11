// Reviewer probe (us-careers lens, Release AV): the planning panel (src/lib/usCareerProgramme.ts, live since Release AU)
// against the season lengths Round 1226 binds. Never committed. cwd = the tree that plays.
//   node uscPlan.mjs            prints, for seasons of a known length, what the plan card promises and what the season can give
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'usc-plan-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const P = rel => path.join(root, rel).split(path.sep).join('/');
const entry = path.join(work, 'entry.ts'), outfile = path.join(work, 'bundle.cjs');
fs.writeFileSync(entry, [['mlb', 'src/lib/mlbCareerSport.ts'], ['nhl', 'src/lib/nhlCareerSport.ts'], ['prog', 'src/lib/usCareerProgramme.ts']]
  .map(([as, rel]) => `export * as ${as} from '${P(rel)}';`).join('\n'));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const B = require(outfile);
const U = B.prog;
const SPORTS = { mlb: B.mlb.MLB_CAREER_SPORT, nhl: B.nhl.NHL_CAREER_SPORT };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const realRandom = Math.random;
const N = Number(process.env.USC_PLAN_N || 60);
const CASES = [
  ['nhl', 'y2006', 2012, ['C', 'LW', 'D', 'G']], ['nhl', 'y2006', 2020, ['C', 'D', 'G']], ['nhl', 'y2006', 2019, ['C', 'G']], ['nhl', 'y2006', 2014, ['C', 'G']], ['nhl', 'now', 2027, ['C', 'G']],
  ['mlb', 'y2004', 2020, ['CF', 'SP', 'RP']], ['mlb', 'y2004', 2017, ['CF', 'SP', 'RP']],
];
let shown = 0;
for (const [slug, era, year, positions] of CASES) for (const pos of positions) {
  const S = SPORTS[slug];
  const t = { n: 0, planned: 0, games: [], sections: {}, moraleMiss: 0, text: null, example: null, lostPartner: 0 };
  for (let i = 0; i < N; i += 1) {
    const rng = mulberry32(31 + i * 977 + year + pos.charCodeAt(0) * 13);
    Math.random = rng;
    try {
      let c = S.startCareer(`Plan ${i}`, pos, S.create.archetypes[pos][i % S.create.archetypes[pos].length], rng, null, era);
      c.year = year - 2;
      let tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      c.contractYears = 6;
      // two seasons at this club first, the second with a partnership plan, so the target year has a season and a partnership behind it
      for (let k = 0; k < 2; k += 1) {
        if (k === 1) c = U.saveUsCareerProgramme(c, slug, { ...U.usProgrammeDefaults(), partnership: 'build' });
        S.campBattle(c, tq, rng);
        const prep0 = U.prepareUsCareerProgramme(c, slug);
        const { line: l0 } = S.simSeason(c, tq, rng);
        U.restoreUsCareerProgramme(c, prep0);
        S.progress(c, rng);
        U.settleUsCareerProgramme(c, l0, slug, prep0);
        c.pendingRivalryEvent = null; c.pendingRivalryChoice = null;
      }
      if (c.retired || c.year !== year || (c.suspendedSeasons ?? 0) > 0) continue;
      t.n += 1;
      const menus = U.usProgrammeMenus(c, slug);
      const eff = (sec, id) => menus.find(m => m.id === sec)?.options.find(o => o.id === id)?.effect ?? '(no such option)';
      const partnerBefore = c.programmePartnership ? c.programmePartnership.progress : 0;
      const before = { morale: c.morale };
      c = U.saveUsCareerProgramme(c, slug, { ...U.usProgrammeDefaults(), expectation: 'steady', partnership: 'build', bonus: 'steady' });
      if (!c.programme) continue;
      t.planned += 1;
      S.campBattle(c, tq, rng);
      const prep = U.prepareUsCareerProgramme(c, slug);
      const { line } = S.simSeason(c, tq, rng);
      U.restoreUsCareerProgramme(c, prep);
      S.progress(c, rng);
      const res = U.settleUsCareerProgramme(c, line, slug, prep);
      t.games.push(line.games);
      if (!res) continue;
      for (const d of res.decisions) { const k = `${d.section} ${d.outcome}`; t.sections[k] = (t.sections[k] ?? 0) + 1; }
      if (partnerBefore > 0 && !c.programmePartnership) t.lostPartner += 1;
      if (!t.text) {
        t.text = { expectation: eff('expectation', 'steady'), stretch: eff('expectation', 'stretch'), partnership: eff('partnership', 'build').slice(0, 110), bonus: eff('bonus', 'steady').slice(0, 90) };
        t.example = { games: line.games, slate: line.slate ?? 'engine', role: c.role, decisions: res.decisions.map(d => `${d.section}: target ${d.target ?? '-'} ${d.unit ?? ''}, actual ${d.actual ?? '-'}, ${d.outcome}`), partnerBefore, partnerAfter: c.programmePartnership?.progress ?? 0 };
      }
    } finally { Math.random = realRandom; }
  }
  const g = t.games.slice().sort((a, b) => a - b);
  console.log(`${slug} ${era} ${year} ${pos}: ${t.n} careers reached the year, ${t.planned} planned (steady availability, partnership, steady bonus); games on the line min ${g[0]} median ${g[Math.floor(g.length / 2)]} max ${g[g.length - 1]}; outcomes ${Object.entries(t.sections).sort().map(([k, v]) => `${k} ${v}`).join(', ')}; a partnership held before and gone after: ${t.lostPartner}`);
  if (t.text && shown < 40) { shown += 1; console.log(`   the card: expectation "${t.text.expectation}" | stretch "${t.text.stretch}" | partnership "${t.text.partnership}" | bonus "${t.text.bonus}"`); console.log(`   one season: ${JSON.stringify(t.example)}`); }
}
console.log(`uscPlan: done on ${root}`);
