/* Reviewer mutation runner for Round 1604 (runner only, sent as .rc/x/mutRun1604.mjs).
   node .rc/x/mutRun1604.mjs <id>
   Applies one mutation to the checked out tree (asserting its anchor exists, exit 2 otherwise),
   runs the committed gates that should see it, restores the file, and prints one line per gate.
   Exit 0 when at least one gate went red (KILLED), exit 1 when every gate stayed green (SURVIVED). */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const ENGINE = 'src/lib/soccerCareerEngine.ts';
const PAGE = 'src/pages/SoccerCareer.tsx';
const TSC = 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json';
const VITEST = 'node_modules/.bin/vitest run src/test/soccerCareerCreationRoll.test.tsx src/test/soccerCareerSaveRecovery.test.tsx src/test/soccerCareerSaveRetry.test.tsx --testTimeout=300000 --hookTimeout=120000';
const ACADEMY = 'node scripts/simSoccerAcademyPlacement.mjs';
const CLUBPOOL = 'node scripts/simCareerClubPool.mjs';

const MUTANTS = {
  // engine reads the shown name from the unadjusted list (a stale list)
  M1: { file: ENGINE, from: 'yearClubs.find(c => c.name === academyName)', to: 'clubs.find(c => c.name === academyName)', gates: [ACADEMY, CLUBPOOL] },
  // the page stops handing the shown name to initCareer (a merge drops the argument)
  M2: { file: PAGE, from: 'physique, attrShape, academyPreview);', to: 'physique, attrShape);', gates: [TSC, VITEST, ACADEMY] },
  // the redraw effect loses nationality and era from its deps (stale deps)
  M3: { file: PAGE, from: '}, [nationality, era, rolledOvr, isRolling, clubs]);', to: '}, [rolledOvr, isRolling, clubs]);', gates: [VITEST, ACADEMY] },
  // the page previews from the unadjusted list (era adjustment dropped)
  M5: { file: PAGE, from: 'showAcademy(getYouthAcademyClub(adjustClubsForYear(clubs, startYr), nat, ovr)', to: 'showAcademy(getYouthAcademyClub(clubs, nat, ovr)', gates: [VITEST, ACADEMY] },
  // off by one start year in initCareer
  M6: { file: ENGINE, from: '  const yearClubs = adjustClubsForYear(clubs, startYear);\n', to: '  const yearClubs = adjustClubsForYear(clubs, startYear + 1);\n', gates: [ACADEMY, CLUBPOOL] },
  // the page clears the shown name on every roll end instead of setting it (onAcademyPreview dropped)
  M7: { file: PAGE, from: '    onAcademyPreview?.(club ? club.name : null);\n', to: '', gates: [VITEST, ACADEMY] },
};

const id = process.argv[2];
const m = MUTANTS[id];
if (!m) { console.log(`unknown mutant ${id}`); process.exit(2); }
const original = fs.readFileSync(m.file, 'utf8');
const norm = original.replaceAll('\r\n', '\n');
if (!norm.includes(m.from)) { console.log(`mutant ${id}: anchor not found in ${m.file}: ${m.from.slice(0, 80)}`); process.exit(2); }
const count = norm.split(m.from).length - 1;
fs.writeFileSync(m.file, norm.replace(m.from, m.to));
console.log(`mutant ${id}: applied to ${m.file} (anchor seen ${count} time(s))`);
const results = [];
try {
  for (const g of m.gates) {
    const t0 = Date.now();
    const r = spawnSync('bash', ['-c', g], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`.split('\n').map(s => s.trim()).filter(Boolean);
    const last = out.filter(l => !/^\s*$/.test(l)).slice(-1)[0] || '';
    const label = g.split(' ').slice(0, 2).join(' ');
    results.push({ g: label, code: r.status });
    console.log(`  gate ${label} exit=${r.status} ${Math.round((Date.now() - t0) / 1000)}s | ${last.slice(0, 200)}`);
    const fails = out.filter(l => /FAIL|failed|error TS/.test(l)).slice(0, 4);
    for (const f of fails) console.log(`    ${f.slice(0, 220)}`);
  }
} finally {
  fs.writeFileSync(m.file, original);
}
const red = results.filter(r => r.code !== 0);
if (red.length) { console.log(`MUTANT ${id} KILLED by ${red.map(r => r.g).join(', ')}`); process.exit(0); }
console.log(`MUTANT ${id} SURVIVED: all ${results.length} gates green`);
process.exit(1);
