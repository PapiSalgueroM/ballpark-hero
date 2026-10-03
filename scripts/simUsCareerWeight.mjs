/**
 * Round 900 harness: the one US career board stays one board, and stays light.
 *
 * Round 900 made the four My Career boards one shared board
 * (src/components/us-career/UsCareerBoard.tsx) plus one binding per sport
 * (src/lib/<slug>CareerSport.ts) and four thin wrappers. Two rules hold that
 * together, and both are read off the source here:
 *
 * 1) The link. Every wrapper imports the shared board and its OWN binding and
 *    renders the one with the other (scripts/lib/usCareerFiles.mjs
 *    wrapperProblems). Nine harnesses lean on that link to read "the shared
 *    board does X" as "all four careers do X"; this is where it is proved able
 *    to fail.
 * 2) The weight rule. Every file in src/components/us-career and the
 *    descriptor (src/lib/usCareerSport.ts) import no sport, and a binding
 *    imports only its own (weightProblems). One stray import in the shared
 *    board would load that sport's engine on all four routes.
 *    Only direct imports are fenced. The coach career already reaches the NFL
 *    engine and the other sports' conquest data further down
 *    (src/lib/usCareerToCoach.ts), which was so before Round 900 and is a
 *    written up defect, not something this harness pretends is fixed.
 *
 * Each check carries its own negative controls, always on: a planted import
 * or a mutated wrapper (each mutation asserted to change the source first) must
 * be named, and the clean source must not be. There is no band: these are
 * source facts, and a fact either holds or it does not.
 *
 * Nothing here reaches the network. Run: node scripts/simUsCareerWeight.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  US_CAREER_BOARD, US_CAREER_DESCRIPTOR, US_CAREER_SPORTS, readUsSource,
  allWrapperProblems, wrapperProblems, weightProblems, weightProblemsIn, weightFiles, importsOf, stripComments,
} from './lib/usCareerFiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
let checks = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = (cond, m) => { checks += 1; if (!cond) fail(m); };

console.log('1) the link: every wrapper hands the shared board its own binding');
const linkNow = allWrapperProblems(ROOT);
for (const p of linkNow) fail(p);
checks += 1;
console.log(`   ${US_CAREER_SPORTS.length} wrappers read, ${linkNow.length} problems`);

console.log('2) the weight rule: no sport in the shared files, only its own in a binding');
const files = weightFiles(ROOT);
const listed = new Set(files.map(f => f.file));
ok(listed.has(US_CAREER_BOARD), `the shared board ${US_CAREER_BOARD} is not among the files the rule reads`);
ok(listed.has(US_CAREER_DESCRIPTOR), `the descriptor ${US_CAREER_DESCRIPTOR} is not among the files the rule reads`);
for (const s of US_CAREER_SPORTS) ok(listed.has(s.binding), `the ${s.upper} binding ${s.binding} is not among the files the rule reads`);
/* A reader that finds no import at all is a broken reader, not a clean file.
   (The descriptor is left out: nearly all it imports is types.) */
for (const f of [US_CAREER_BOARD, ...US_CAREER_SPORTS.map(s => s.binding)]) {
  ok(importsOf(stripComments(readUsSource(ROOT, f))).length >= 3, `${f}: the import reader found fewer than three imports, so it cannot be trusted`);
}
const weightNow = weightProblems(ROOT);
for (const p of weightNow) fail(p);
checks += 1;
console.log(`   ${files.length} files read (${files.filter(f => !f.own).length} shared, ${files.filter(f => f.own).length} bindings), ${weightNow.length} problems`);

console.log('3) the weight rule can fail: planted imports');
const board = readUsSource(ROOT, US_CAREER_BOARD);
const desc = readUsSource(ROOT, US_CAREER_DESCRIPTOR);
const nfl = US_CAREER_SPORTS.find(s => s.slug === 'nfl');
const nflBinding = readUsSource(ROOT, nfl.binding);
/* The planted line goes on top, where an import would sit. */
const plant = (code, line) => line + '\n' + code;
const PLANTS = [
  { what: 'the board imports an NBA engine', file: US_CAREER_BOARD, code: board, own: null, line: "import { NBA_ERAS } from '@/lib/nbaMyCareer';", names: 'nbaMyCareer' },
  { what: 'the board loads MLB code on demand', file: US_CAREER_BOARD, code: board, own: null, line: "const later = () => import('@/lib/mlbMyCareer');", names: 'mlbMyCareer' },
  { what: 'the descriptor imports NHL content by a suffix name', file: US_CAREER_DESCRIPTOR, code: desc, own: null, line: "import { X } from './conquestDataNhl';", names: 'conquestDataNhl' },
  { what: 'the NFL binding imports an NHL module', file: nfl.binding, code: nflBinding, own: 'nfl', line: "import { NHL_ERAS } from '@/lib/nhlMyCareer';", names: 'nhlMyCareer' },
];
for (const p of PLANTS) {
  const clean = weightProblemsIn(p.file, p.code, p.own);
  const dirty = weightProblemsIn(p.file, plant(p.code, p.line), p.own);
  const added = dirty.filter(x => !clean.includes(x));
  ok(clean.length === 0, `control "${p.what}": the clean file already has problems, so the control proves nothing`);
  ok(added.length === 1 && added[0].includes(p.names), `control "${p.what}": expected one problem naming ${p.names}, got ${JSON.stringify(added)}`);
  if (added.length === 1) console.log(`   fired: ${p.what} -> "${added[0]}"`);
}
/* And the two things the rule must let through. */
const SPARE = [
  { what: 'a type-only import of another sport (erased, loads nothing)', file: US_CAREER_BOARD, code: board, own: null, line: "import type { NbaCareerState } from '@/lib/nbaMyCareer';" },
  { what: 'the NFL binding importing more NFL code', file: nfl.binding, code: nflBinding, own: 'nfl', line: "import { NFL_ERAS } from '@/lib/nflMyCareer';" },
];
for (const p of SPARE) {
  const added = weightProblemsIn(p.file, plant(p.code, p.line), p.own);
  ok(added.length === 0, `control "${p.what}" should pass and was named: ${JSON.stringify(added)}`);
  if (!added.length) console.log(`   spared: ${p.what}`);
}

console.log('4) the link can fail: mutated wrappers in a scratch copy');
/* Each mutation is made to a copy of the four wrappers in a scratch folder
   and must be named for that wrapper alone. The text it replaces is asserted
   first, so a wrapper that changes shape fails here instead of leaving a
   control that changes nothing. */
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'uscareer-weight-'));
process.on('exit', () => { try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ } });
const writeWrappers = () => {
  for (const s of US_CAREER_SPORTS) {
    fs.mkdirSync(path.dirname(path.join(scratch, s.wrapper)), { recursive: true });
    fs.writeFileSync(path.join(scratch, s.wrapper), readUsSource(ROOT, s.wrapper));
  }
};
const MUTATIONS = [
  { what: 'the NBA wrapper stops importing the shared board', slug: 'nba',
    from: "import UsCareerBoard from '@/components/us-career/UsCareerBoard';", to: "import UsCareerBoard from './OldBoard';", names: 'does not import the shared board' },
  { what: 'the MLB wrapper renders the board with the NBA binding', slug: 'mlb',
    from: '<UsCareerBoard sport={MLB_CAREER_SPORT} />', to: '<UsCareerBoard sport={NBA_CAREER_SPORT} />', names: 'does not render the shared board with its own binding' },
  { what: 'the NHL wrapper imports NFL code', slug: 'nhl',
    from: "import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';", to: "import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';\nimport { NFL_ERAS } from '@/lib/nflMyCareer';", names: 'imports NFL code' },
  { what: 'the NFL wrapper stops importing its own binding', slug: 'nfl',
    from: "import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';", to: "import { NFL_CAREER_SPORT } from '@/lib/nflSport';", names: 'does not import its own binding' },
];
writeWrappers();
ok(allWrapperProblems(scratch).length === 0, 'the scratch copy of the wrappers is not clean, so the controls below prove nothing');
for (const m of MUTATIONS) {
  writeWrappers();
  const s = US_CAREER_SPORTS.find(x => x.slug === m.slug);
  const file = path.join(scratch, s.wrapper);
  const src = fs.readFileSync(file, 'utf8');
  if (src.split(m.from).length !== 2) { fail(`control "${m.what}": ${s.wrapper} does not carry exactly one "${m.from}", so this control would change nothing`); continue; }
  fs.writeFileSync(file, src.replace(m.from, m.to));
  const named = allWrapperProblems(scratch);
  const mine = wrapperProblems(scratch, s);
  ok(named.length > 0 && named.length === mine.length && mine.some(p => p.includes(m.names)),
    `control "${m.what}": expected only ${s.wrapper} named for "${m.names}", got ${JSON.stringify(named)}`);
  if (mine.some(p => p.includes(m.names))) console.log(`   fired: ${m.what} -> "${mine.find(p => p.includes(m.names))}"`);
}

console.log('');
if (failures) { console.error(`simUsCareerWeight: ${failures} failure${failures === 1 ? '' : 's'} in ${checks} checks`); process.exit(1); }
console.log(`simUsCareerWeight: green. ${checks} checks: the four wrappers hand the board their own binding, no shared file or binding imports another sport, and every control fired.`);
