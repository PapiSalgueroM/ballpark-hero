/**
 * Round 580: the tycoon save corpus, and the frozen V1 libs beside it.
 *
 * The tycoon merge arc (docs/design/round-580-tycoon-merge.md) never migrates a
 * save: both V1 keys stay the source of truth and later rounds only add optional
 * fields. That promise is only worth something if there is a fixed record of
 * what today's loaders do with today's saves, so a later round can prove it did
 * not change the answer. This script writes that record.
 *
 *   src/test/fixtures/tycoonSaves.json   nine saves, { name, key, raw, loaded, current }
 *   scripts/fixtures/tycoonV1/           byte copies of the two libs plus pins.json
 *                                        (only with --freeze)
 *
 * `loaded` is what the FROZEN V1 loader returns for `raw` at the fixed NOW, put
 * back through the lib's own serializer (null when the loader refuses the save).
 * `current` is the same for today's libs. They were equal when Round 580 froze
 * the libs; a save round that repairs a field on load changes `current` for the
 * saves it repairs and regenerates this file on purpose, and must leave every
 * other entry's `current` equal to its `loaded`. scripts/simTycoonRooms.mjs
 * section B2 holds today's libs to `current`, B3 the frozen copies to `loaded`,
 * and scripts/simTycoonLoads.mjs says which entries may differ.
 *
 * Its name does not start with sim, so runAllSims skips it. Run it by hand when
 * the corpus is being (re)made on purpose:
 *   node scripts/genTycoonSaveCorpus.mjs            rewrite the corpus
 *   node scripts/genTycoonSaveCorpus.mjs --freeze   also re-freeze the V1 libs
 *                                                   (only ever at a new baseline)
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = 1767225600000;
const EPOCH = NOW;
const FREEZE = process.argv.includes('--freeze');

const LIBS = { stadium: 'src/lib/stadiumTycoon.ts', academy: 'src/lib/wonderkidFactory.ts' };
const CORPUS = path.join(ROOT, 'src/test/fixtures/tycoonSaves.json');
const FROZEN = path.join(ROOT, 'scripts/fixtures/tycoonV1');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-corpus-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });

async function bundle(entry, name) {
  const out = path.join(tmp, `${name}.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`,
    { cwd: ROOT, shell: true });
  return import('file:///' + out.replace(/\\/g, '/'));
}

const stadium = await bundle(path.join(ROOT, LIBS.stadium), 'stadium');
const academy = await bundle(path.join(ROOT, LIBS.academy), 'academy');

if (FREEZE) {
  fs.mkdirSync(FROZEN, { recursive: true });
  const files = {};
  for (const rel of Object.values(LIBS)) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
    const name = path.basename(rel);
    fs.writeFileSync(path.join(FROZEN, name), text);
    /* Hashed with line endings folded to LF, so a Windows checkout and a Linux
       clone of the same commit agree. */
    files[name] = crypto.createHash('sha256').update(text).digest('hex');
  }
  const commit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(FROZEN, 'pins.json'), JSON.stringify({
    note: 'Test oracle only, never imported by the app. Byte copies (LF) of the two tycoon libs as they stood when Round 580 began, for scripts/simTycoonRooms.mjs section B3. Their @/ imports resolve to the live src tree.',
    commit,
    files,
  }, null, 2) + '\n');
  console.log(`froze both libs at ${commit.slice(0, 8)} into ${path.relative(ROOT, FROZEN)}`);
}
for (const f of ['stadiumTycoon.ts', 'wonderkidFactory.ts']) {
  if (!fs.existsSync(path.join(FROZEN, f))) {
    console.error(`no frozen ${f} in ${path.relative(ROOT, FROZEN)}, so there is no V1 answer to record. Run with --freeze only at a new baseline.`);
    process.exit(1);
  }
}
const frozenStadium = await bundle(path.join(FROZEN, 'stadiumTycoon.ts'), 'frozen-stadium');
const frozenAcademy = await bundle(path.join(FROZEN, 'wonderkidFactory.ts'), 'frozen-academy');

/* ---------- stadium saves ---------- */

const fresh = stadium.newTycoon(EPOCH);

const midGame = {
  ...stadium.newTycoon(EPOCH),
  money: 5200,
  lifetime: 152000,
  fanbase: 900,
  levels: { ...stadium.newTycoon(EPOCH).levels, stands: 30, tickets: 20, squad: 25, megaphone: 10 },
  rep: 1,
  matchNo: 37,
  totalMatches: 37,
  minute: 52,
  matchSec: 0.9,
  goalsFor: 2,
  goalsAgainst: 1,
  streak: 3,
  groundWins: 22,
  totalWins: 22,
  totalGoals: 81,
  totalTaps: 340,
  bestDivision: 2,
  staffLevels: { steward: 3, pieChef: 1 },
  ach: ['af500', 'aw10'],
  claimed: ['win1', 'fans500'],
  legacyPoints: 3,
  legacyPerks: { sway: 1 },
  legacySeeded: true,
};

/* The raw latch path: a save from before the boardroom existed. */
const preBoardroom = { ...midGame, rep: 2 };
delete preBoardroom.legacyPoints;
delete preBoardroom.legacyPerks;
delete preBoardroom.legacySeeded;

/* A NaN cannot be written to JSON (it becomes null), so the doctored match clock
   is the null a NaN turns into on its way to storage. */
const doctored = {
  ...midGame,
  levels: { squad: 'abc', stands: -4, bogus: 9 },
  matchSec: null,
  minute: 400,
  savedAt: 'tomorrow',
  streak: -3,
  matchNo: -5,
  money: 1e308,
};

/* ---------- academy saves ---------- */

const academyFresh = academy.newFactory(EPOCH, 7);

/* Six real kids from the lib's own generator, so every name, nation and
   position is one the loader accepts. Scouted offline so nobody ages while
   they arrive, then given the ages the tests need.

   Deliberate difference from the contract's first draft: dorms 9 and scouting
   2 rather than dorms 3 and scouting 6. With three dorm levels six kids fill
   all six beds, which lights the Academy tab's accent from the first second and
   leaves test 6 unable to see it off. With twelve beds and a find every twenty
   seconds the beds cannot fill inside that test, so the only thing that can
   light the accent there is the kid about to turn 24. */
function midAcademyState() {
  const f = academy.newFactory(EPOCH, 7);
  f.rep = 2;
  f.levels = { scouting: 0, coaching: 5, dorms: 9, agents: 4 };
  let guard = 0;
  while (f.prospects.length < 6 && guard < 400) { academy.tick(f, 5, { offline: true }); guard += 1; }
  if (f.prospects.length < 6) throw new Error('the generator did not scout six kids');
  f.prospects = f.prospects.slice(0, 6);
  const ages = [15, 17, 18, 20, 22, 23];
  f.prospects.forEach((k, i) => {
    k.id = 30 + i;
    k.age = ages[i];
    k.ageClock = i === 5 ? 230 : 10 * (i + 1);
  });
  f.levels.scouting = 2;
  f.scoutProgress = 0;
  f.deadlineIn = 300;
  f.deadlineLeft = 0;
  f.showcaseCooldown = 0;
  f.showcaseLeft = 0;
  f.cash = 5000;
  f.lifetime = 60000;
  f.careerEarned = 90000;
  f.sold = 12;
  f.soldCareer = 20;
  f.best = 9000;
  f.leftFree = 0;
  f.nextId = 40;
  f.lastSeen = EPOCH;
  return f;
}

const midAcademy = midAcademyState();

const duplicateIds = midAcademyState();
duplicateIds.prospects[0].id = 12;
duplicateIds.prospects[1].id = 12;
duplicateIds.nextId = 5;
duplicateIds.rep = 1.5;

/* Round 581: an academy saved partway through a hidden absence, carrying the away
   meter the round added, so the frozen V1 build is proven to keep the field. */
const awayMeter = midAcademyState();
awayMeter.awayMs = 3 * 3600 * 1000;

const doctoredKids = midAcademyState();
doctoredKids.levels.scouting = 9999;
doctoredKids.prospects[0].rating = 120;
doctoredKids.prospects[0].potential = 80;
doctoredKids.prospects[1].age = 30;
doctoredKids.prospects[2].ageClock = 1e9;
doctoredKids.prospects.push({ ...doctoredKids.prospects[3], id: 36, name: 'Nobody Real', pos: 'XX' });

/* ---------- record ---------- */

const loadStadium = (lib, raw) => {
  const s = lib.deserializeTycoon(raw, NOW);
  return s ? lib.serializeTycoon(s, NOW) : null;
};
const loadAcademy = (lib, raw) => {
  const s = lib.deserialize(raw, NOW);
  return s ? lib.serialize(s) : null;
};

const entries = [
  ['fresh', 'stadium', fresh],
  ['midGame', 'stadium', midGame],
  ['preBoardroom', 'stadium', preBoardroom],
  ['doctored', 'stadium', doctored],
  ['fresh', 'academy', academyFresh],
  ['midAcademy', 'academy', midAcademy],
  ['duplicateIds', 'academy', duplicateIds],
  ['awayMeter', 'academy', awayMeter],
  ['doctoredKids', 'academy', doctoredKids],
].map(([name, key, save]) => {
  const raw = JSON.stringify(save);
  const loaded = key === 'stadium' ? loadStadium(frozenStadium, raw) : loadAcademy(frozenAcademy, raw);
  const current = key === 'stadium' ? loadStadium(stadium, raw) : loadAcademy(academy, raw);
  return { name, key, raw, loaded, current };
});

fs.mkdirSync(path.dirname(CORPUS), { recursive: true });
fs.writeFileSync(CORPUS, JSON.stringify({ now: NOW, entries }, null, 2) + '\n');
console.log(`wrote ${path.relative(ROOT, CORPUS)}: ${entries.length} saves`);
for (const e of entries) {
  const size = v => (v === null ? 'REFUSED' : `${v.length} bytes`);
  console.log(`   ${e.key.padEnd(7)} ${e.name.padEnd(13)} raw ${String(e.raw.length).padStart(5)} bytes, V1 loads ${size(e.loaded)}, today loads ${size(e.current)}${e.loaded === e.current ? '' : '  (repaired)'}`);
}
