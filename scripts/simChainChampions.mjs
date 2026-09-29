/* Chain champions harness: the NASCAR and Tennis Chain name bundles hold
   every champion their validators accept, today.

   Round 645 part three bounded a part played NASCAR or Tennis Chain on
   restore: every link past the starter must be a name in
   src/data/nascarChampionNames.json or src/data/tennisChampionNames.json,
   which scripts/genChainChampions.mjs writes from the two tables the
   validators accept a link from (public.nascar_champions.driver_name,
   public.tennis_grand_slam_winners.champion). The 645c fix pass left one
   thing open: when a champion is added to either table, a part played chain
   holding him is dealt fresh until somebody reruns the generator, and its
   --check mode, which sees exactly that, ran nowhere. Round 674 puts it in
   the suite: this runs `node scripts/genChainChampions.mjs --check`, read
   only (a select on each table through the public key, nothing written),
   and is green only when both bundles match their tables byte for byte, so
   no champion in a table is missing from its bundle and no name in a bundle
   is gone from its table.

   It needs the database. A check that cannot read the tables proves nothing
   either way, so it fails closed rather than passing, and says so in the
   sentence scripts/runAllSims.mjs keys its sandbox skip on: "DATABASE
   UNREACHABLE. NOTHING WAS CHECKED." (Round 674 fix: the first version said
   only "cannot read the database", which the runner does not read, so on a
   lane with no database this harness was a permanent FAIL instead of the
   runner's documented skip.)

   NEGATIVE CONTROL, CHAIN_CHAMPIONS_CONTROL=added: the same check with a
   champion added to the rows it reads from public.nascar_champions (the
   generator's CHAIN_CHAMPIONS_EXTRA fixture, honoured under --check only, so
   nothing can be written from it). It must exit 1 with a DRIFT line on the
   NASCAR bundle alone while the Tennis bundle still matches, and the fixture
   line must show the name was added, or the control did not run.

   NEGATIVE CONTROL, CHAIN_CHAMPIONS_CONTROL=offline (Round 674 fix): this
   harness run as the suite runs it, in a child, with every fetch refused (a
   preload handed down through NODE_OPTIONS to the check it spawns, nothing
   else changes). The child must read neither table, exit nonzero, and print
   a line the runner's own NOTHING_CHECKED pattern matches, read out of
   scripts/runAllSims.mjs as code, so the sentence cannot drift from what the
   runner looks for. Deleting the sentence from the unreachable path turns
   this control red (measured).

   Run: node scripts/simChainChampions.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './lib/readSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CHAIN_CHAMPIONS_CONTROL || '';
const CONTROLS = ['added', 'offline'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CHAIN_CHAMPIONS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

const BUNDLES = [
  { file: 'src/data/nascarChampionNames.json', table: 'nascar_champions' },
  { file: 'src/data/tennisChampionNames.json', table: 'tennis_grand_slam_winners' },
];
const FIXTURE_NAME = 'Control Champion Round 674';
/* What this prints when it read nothing: the sentence scripts/runAllSims.mjs
   turns into a skip on a lane that cannot reach the database. */
const UNREACHABLE = 'DATABASE UNREACHABLE. NOTHING WAS CHECKED.';
/* The offline control's preload: every fetch in the process is refused. No
   space in it, because NODE_OPTIONS splits on spaces. */
const OFFLINE_PRELOAD = "--import=data:text/javascript,globalThis.fetch=()=>Promise.reject(new(Error)('offline-control'));";

/* The offline control runs this harness as it runs in the suite, in a child
   with no control set, and hands the preload through NODE_OPTIONS, which the
   child passes on to the check it spawns. So what is judged is the real
   unreachable path, not a line this branch prints for itself. */
if (CONTROL === 'offline') {
  console.log('NEGATIVE CONTROL ON: every fetch the check makes is refused; the harness, run as the suite runs it, must say the database was unreachable and nothing was checked, in the words the runner reads');
  const runner = stripComments(fs.readFileSync(path.join(ROOT, 'scripts', 'runAllSims.mjs'), 'utf8').split('\r\n').join('\n'));
  const decls = [...runner.matchAll(/const NOTHING_CHECKED = \/(.+)\/([a-z]*);/g)];
  if (decls.length !== 1) { console.error(`\ncontrol "offline" cannot run: scripts/runAllSims.mjs declares NOTHING_CHECKED in its code ${decls.length} times, not exactly once`); process.exit(1); }
  const runnerSkips = new RegExp(decls[0][1], decls[0][2]);
  const childEnv = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} ${OFFLINE_PRELOAD}`.trim() };
  delete childEnv.CHAIN_CHAMPIONS_CONTROL;
  delete childEnv.CHAIN_CHAMPIONS_EXTRA;
  const c = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, encoding: 'utf8', env: childEnv, timeout: 5 * 60 * 1000 });
  const childOut = (c.stdout || '') + (c.stderr || '');
  for (const line of childOut.split('\n').filter(Boolean)) console.log(`   | ${line}`);
  const refused = /offline-control/.test(childOut);
  const readAny = BUNDLES.some(b => new RegExp(`${b.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: \\d+ names, matches|DRIFT: ${b.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(childOut));
  if (!refused || readAny) { console.error('\ncontrol "offline" cannot run: the preload did not refuse the check\'s fetch (or a table was read anyway), so this proves nothing'); process.exit(1); }
  if (c.status !== 0 && runnerSkips.test(childOut)) {
    console.log(`\ncontrol "offline": the harness read no table, exited ${c.status}, and the runner's NOTHING_CHECKED (${runnerSkips}) matches what it printed, so a lane without the database gets the runner's skip, the check works`);
    process.exit(0);
  }
  console.error(`\ncontrol "offline": expected a nonzero exit and a line the runner's ${runnerSkips} matches, got exit ${c.status}${runnerSkips.test(childOut) ? '' : ' and no such line'}`);
  process.exit(1);
}

const env = { ...process.env };
delete env.CHAIN_CHAMPIONS_EXTRA;
if (CONTROL === 'added') {
  env.CHAIN_CHAMPIONS_EXTRA = JSON.stringify({ nascar_champions: [FIXTURE_NAME] });
  console.log(`NEGATIVE CONTROL ON: "${FIXTURE_NAME}" is added to the rows the check reads from public.nascar_champions; the NASCAR bundle must drift and the Tennis bundle must not`);
}

console.log('1) genChainChampions --check: each champion bundle equals its table, read only');
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'genChainChampions.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', env, timeout: 5 * 60 * 1000 });
if (r.error) { console.error(`simChainChampions: the check could not be run: ${r.error.message}`); process.exit(1); }
const out = (r.stdout || '') + (r.stderr || '');
for (const line of out.split('\n').filter(Boolean)) console.log(`   ${line.trim()}`);

const matches = b => new RegExp(`${b.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: \\d+ names, matches public\\.${b.table}`).test(out);
const drifts = b => new RegExp(`DRIFT: ${b.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} differs from public\\.${b.table}`).test(out);
const read = BUNDLES.every(b => matches(b) || drifts(b));
if (!read) {
  console.error('\nsimChainChampions: cannot read the database, so neither bundle was compared with its table. This is the environment (no network, or the tables refused the public key), not a drifted bundle; nothing here passes without the read.');
  console.error(UNREACHABLE);
  process.exit(1);
}

if (CONTROL === 'added') {
  const [nascar, tennis] = BUNDLES;
  const added = out.includes(`CHECK FIXTURE: 1 name(s) added to the rows read from public.nascar_champions: ${FIXTURE_NAME}`);
  if (!added) { console.error('\ncontrol "added": the fixture line never printed, so the check did not read the added champion'); process.exit(1); }
  if (r.status === 1 && drifts(nascar) && !drifts(tennis) && matches(tennis)) {
    console.log('\ncontrol "added": the NASCAR bundle drifted on the added champion and the Tennis bundle still matched, exit 1, the check works');
    process.exit(0);
  }
  console.error(`\ncontrol "added": expected exit 1 with the NASCAR bundle alone drifting, got exit ${r.status}, NASCAR ${drifts(nascar) ? 'drifted' : 'matched'}, Tennis ${drifts(tennis) ? 'drifted' : 'matched'}`);
  process.exit(1);
}

const drifted = BUNDLES.filter(drifts);
if (r.status !== 0 || drifted.length) {
  console.error(`\nsimChainChampions: ${drifted.length} bundle(s) out of date with their table (${drifted.map(b => b.file).join(', ') || `exit ${r.status}`}). Run node scripts/genChainChampions.mjs and commit the bundle.`);
  process.exit(1);
}
console.log(`\nsimChainChampions: all green. Both chain bundles hold exactly the champions their tables do (${BUNDLES.map(b => b.table).join(', ')}).`);
