/* Every Soccer Career era window is reachable, and every league it names is real.

   Round 302, off the owner's 2026-08-26 tweaks document: more leagues (he
   named Liga Portugal, Eredivisie, Scottish, MLS, Saudi, K League) and more
   eras (he named 2015/16, 2010/11, 05/06 starts). The engine had modeled
   eight half decade windows all along while the picker exposed four decade
   starts, and the era title race knew five leagues. This harness pins the
   expansion so neither can silently shrink or drift:

   1. eight contiguous windows covering 1990 to 2029, every one reachable
      from the creation screen picker (parsed from the page source, so a
      picker edit that strands a window goes red);
   2. every window carries the full league key set, minus two pinned
      founding exemptions (MLS before its 1996 kickoff, K League before
      2010) that cannot quietly grow;
   3. league keys are byte identical to FALLBACK_CLUBS league labels, so
      the phone feed's champion headlines and the Ballon d'Or honours
      lookup can never miss on a near duplicate string;
   4. each owner named league has real playable depth (3+ clubs) in
      FALLBACK_CLUBS, and a 1990 season contains no MLS club, proving the
      founded after table holds for the league that did not exist yet.

   Negative control: SIM_CAREER_ERAS_CONTROL=drop bundles a copy of
   careerEras.ts with one window's "Primeira Liga" key deleted, and the run
   must fail. The copy edit asserts the key was present before deleting, the
   simPrerender house rule, so a renamed key can never leave the control
   passing for the wrong reason.

   Run: node scripts/simCareerEras.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_CAREER_ERAS_CONTROL === 'drop';

const ENTRY = path.join(os.tmpdir(), 'careerEras.entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'careerEras.bundle.mjs');
let erasPath = `${ROOT}/src/lib/careerEras.ts`;
if (CONTROL) {
  const src = fs.readFileSync(erasPath, 'utf8');
  const needle = '"Primeira Liga": ["Porto", "Benfica", "Sporting CP"],';
  if (!src.includes(needle)) { console.error('control run: the line the control deletes is not in the source, refusing to run a dead control'); process.exit(1); }
  erasPath = path.join(os.tmpdir(), 'careerEras.control.ts');
  fs.writeFileSync(erasPath, src.replace(needle, ''));
}
fs.writeFileSync(ENTRY, `
export { ERA_DEFS, eraDefFor, adjustClubsForYear } from '${erasPath.replaceAll('\\', '/')}';
export { FALLBACK_CLUBS } from '${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { ERA_DEFS, eraDefFor, adjustClubsForYear, FALLBACK_CLUBS } = await import(pathToFileURL(BUNDLE).href);

console.log('1) eight contiguous windows, 1990 to 2029');
{
  if (ERA_DEFS.length !== 8) fail(`${ERA_DEFS.length} era windows, expected 8`);
  const sorted = [...ERA_DEFS].sort((a, b) => a.from - b.from);
  if (sorted[0].from !== 1990) fail(`first window starts ${sorted[0].from}, expected 1990`);
  if (sorted[sorted.length - 1].to !== 2029) fail(`last window ends ${sorted[sorted.length - 1].to}, expected 2029`);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from !== sorted[i - 1].to + 1) fail(`gap or overlap between windows ending ${sorted[i - 1].to} and starting ${sorted[i].from}`);
  }
  console.log(`   ${ERA_DEFS.length} windows, ${sorted[0].from} to ${sorted[sorted.length - 1].to}, contiguous`);
}

console.log('2) every window carries the full league set, minus the two pinned founding exemptions');
{
  /* The canonical set comes from the newest window, where everything exists. */
  const last = [...ERA_DEFS].sort((a, b) => a.from - b.from)[ERA_DEFS.length - 1];
  const canonical = Object.keys(last.leagues);
  if (canonical.length < 11) fail(`the newest window has only ${canonical.length} league keys, the Round 302 expansion expected 12`);
  /* league -> the first year the game can name it honestly; a window that
     ends before that may omit the league, everything else must carry it.
     The pins below then fix the exact absence lists in both directions. */
  const EXEMPT_BEFORE = { 'MLS': 1996, 'K League 1': 2010 };
  for (const era of ERA_DEFS) {
    for (const key of canonical) {
      const present = Object.prototype.hasOwnProperty.call(era.leagues, key);
      const exemptFrom = EXEMPT_BEFORE[key];
      const exempt = exemptFrom !== undefined && era.to < exemptFrom;
      if (!present && !exempt) fail(`${era.from}-${era.to} is missing "${key}" and has no founding exemption`);
    }
    for (const key of Object.keys(era.leagues)) {
      if (!canonical.includes(key)) fail(`${era.from}-${era.to} has key "${key}" the newest window does not, a drifted or misspelled league`);
      const list = era.leagues[key];
      if (list.length < 3) fail(`${era.from}-${era.to} "${key}" has only ${list.length} contenders, floor is 3`);
      if (new Set(list).size !== list.length) fail(`${era.from}-${era.to} "${key}" repeats a contender`);
    }
  }
  /* Pin the exemptions exactly so they cannot quietly grow. */
  const missingMls = ERA_DEFS.filter(e => !e.leagues['MLS']).map(e => e.from).sort();
  if (missingMls.join(',') !== '1990') fail(`MLS is absent from windows starting [${missingMls}], expected only 1990`);
  const missingK = ERA_DEFS.filter(e => !e.leagues['K League 1']).map(e => e.from).sort();
  if (missingK.join(',') !== '1990,1995,2000,2005') fail(`K League 1 is absent from windows starting [${missingK}], expected 1990 through 2005`);
  console.log(`   ${canonical.length} canonical leagues, exemptions pinned: MLS before 1996, K League 1 before 2010`);
}

console.log('3) era league keys match FALLBACK_CLUBS labels byte for byte');
{
  const labels = new Set(FALLBACK_CLUBS.map(c => c.league));
  const keys = new Set(ERA_DEFS.flatMap(e => Object.keys(e.leagues)));
  for (const key of keys) {
    if (!labels.has(key)) fail(`era league "${key}" matches no FALLBACK_CLUBS league label, headlines and honours will never attach to a playable club`);
  }
  /* The near miss detector: two labels that differ only by case or spacing
     are one league typed twice. */
  const fold = s => s.toLowerCase().replace(/\s+/g, ' ');
  const seen = new Map();
  for (const l of [...labels, ...keys]) {
    const f = fold(l);
    if (seen.has(f) && seen.get(f) !== l) fail(`"${seen.get(f)}" and "${l}" differ only by case or spacing, one league typed twice`);
    seen.set(f, l);
  }
  console.log(`   ${keys.size} era league keys, all present among ${labels.size} club labels, no near duplicates`);
}

console.log('4) the creation picker reaches every window');
{
  const page = fs.readFileSync(`${ROOT}/src/pages/SoccerCareer.tsx`, 'utf8');
  const rows = [...page.matchAll(/\{ value: "([^"]+)", label: "([^"]+)", startYear: (\d+) \}/g)]
    .map(m => ({ value: m[1], label: m[2], startYear: Number(m[3]) }));
  if (rows.length !== 8) fail(`picker has ${rows.length} era rows, expected 8`);
  if (new Set(rows.map(r => r.value)).size !== rows.length) fail('picker era values repeat');
  const reached = new Set(rows.map(r => eraDefFor(r.startYear).from));
  if (reached.size !== ERA_DEFS.length) {
    const stranded = ERA_DEFS.filter(e => !reached.has(e.from)).map(e => `${e.from}-${e.to}`);
    fail(`picker reaches ${reached.size} of ${ERA_DEFS.length} windows; stranded: ${stranded.join(', ')}`);
  }
  for (const want of [2005, 2010, 2015]) {
    if (!rows.some(r => r.startYear === want)) fail(`no ${want} start in the picker, the tweaks document asked for it by name`);
  }
  console.log(`   ${rows.length} picker rows reach all ${ERA_DEFS.length} windows, 2005/2010/2015 starts present`);
}

console.log('5) the owner named leagues have playable depth, and 1990 has no MLS');
{
  for (const league of ['Primeira Liga', 'Eredivisie', 'Scottish Premiership', 'MLS', 'Saudi Pro League', 'K League 1']) {
    const n = FALLBACK_CLUBS.filter(c => c.league === league).length;
    if (n < 3) fail(`"${league}" has ${n} playable clubs, the depth pass floor is 3`);
  }
  const in1990 = adjustClubsForYear(FALLBACK_CLUBS, 1990).filter(c => c.league === 'MLS');
  if (in1990.length > 0) fail(`a 1990 season offers MLS clubs (${in1990.map(c => c.name).join(', ')}), the league started in 1996`);
  const now = adjustClubsForYear(FALLBACK_CLUBS, 2026).filter(c => c.league === 'MLS').length;
  if (now < 5) fail(`only ${now} MLS clubs exist in 2026, the founded after entries cut too deep`);
  console.log(`   six named leagues at 3+ clubs, MLS empty in 1990 and ${now} strong in 2026`);
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: deleting a league key changed NOTHING, the checks are dead');
  process.exit(1);
}
console.log('   teeth: exemptions pinned by exact window list, picker parsed from page source, labels byte compared');
if (failures > 0) { console.error(`\nsimCareerEras: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCareerEras: all green');
