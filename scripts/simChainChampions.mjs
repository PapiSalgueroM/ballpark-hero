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
   either way, so it fails closed ("cannot read the database") rather than
   passing, and the message says that is the environment, not a drifted
   bundle.

   NEGATIVE CONTROL, CHAIN_CHAMPIONS_CONTROL=added: the same check with a
   champion added to the rows it reads from public.nascar_champions (the
   generator's CHAIN_CHAMPIONS_EXTRA fixture, honoured under --check only, so
   nothing can be written from it). It must exit 1 with a DRIFT line on the
   NASCAR bundle alone while the Tennis bundle still matches, and the fixture
   line must show the name was added, or the control did not run.

   Run: node scripts/simChainChampions.mjs
*/
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CHAIN_CHAMPIONS_CONTROL || '';
const CONTROLS = ['added'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CHAIN_CHAMPIONS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

const BUNDLES = [
  { file: 'src/data/nascarChampionNames.json', table: 'nascar_champions' },
  { file: 'src/data/tennisChampionNames.json', table: 'tennis_grand_slam_winners' },
];
const FIXTURE_NAME = 'Control Champion Round 674';

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
