/* recordUsCoachPoachingScouts.mjs (Round 1103). Not a harness: a recorder a human ran once.

   scripts/simUsCoachPoaching.mjs and src/lib/usCoachPoaching.test.ts (Round 888) prove the coach engine on ten
   pinned transitions of four coaching careers. Each career starts from a fictional scout: an NBA player the
   player engine plays for six seasons on a seeded stream, and the coach engine then carries on down the same
   stream. So the ten pins rode on every draw the PLAYER engine takes, and any round that moves the NBA line
   (Round 1103 did, on purpose) turned a proof about coaches red.

   This writes the four scouts down as the player engine made them BEFORE Round 1103, with the number of draws
   each one used, so the harness and the test can start the coach engine from the same man at the same point of
   the same stream whatever the player engine does next. Nothing about the coach engine is recorded: both
   readers still play every coaching season on the real engine.

   It needs a tree from before Round 1103 and refuses to overwrite the recording:
     git archive <commit> src/lib src/data src/types src/integrations | tar -x -C <folder>
     node scripts/recordUsCoachPoachingScouts.mjs <folder> <commit>
   Before writing, it proves the recording carries everything the coach engine reads: every coaching season of
   all four careers, played from the recorded scout, equals the one played from the live scout (state before,
   state after, notes and the draws used). */
import os from 'node:os';
import path from 'node:path';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/test/fixtures/usCoachPoachingScouts888.json');
const [, , folder, commit] = process.argv;
if (!folder || !commit) { console.error('usage: node scripts/recordUsCoachPoachingScouts.mjs <folder holding the old src> <its commit>'); process.exit(2); }
if (existsSync(OUT)) { console.error(`${path.relative(ROOT, OUT)} exists. It is recorded once and never again.`); process.exit(2); }
const old = path.resolve(folder).split(path.sep).join('/');
for (const f of ['src/lib/nbaMyCareer.ts', 'src/lib/usCoachCareer.ts']) if (!existsSync(`${old}/${f}`)) { console.error(`no ${f} under ${old}`); process.exit(2); }

const bundle = path.join(os.tmpdir(), `coach-scouts-${process.pid}.mjs`);
await build({
  stdin: { contents: `export * as nba from '${old}/src/lib/nbaMyCareer.ts'; export * as coach from '${old}/src/lib/usCoachCareer.ts';`, resolveDir: old, loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': `${old}/src` }, logLevel: 'error',
});
const { nba, coach } = await import(pathToFileURL(bundle).href);
unlinkSync(bundle);
if (typeof nba.nbaStatLineFor === 'function') { console.error('that tree already has the Round 1103 line (nbaStatLineFor): record from a commit before it.'); process.exit(2); }

/* The stream both readers use, copied from them. */
function seedRandom(seed) {
  let s = seed >>> 0; const tape = [];
  return { tape, draw: () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296; tape.push(value); return value; } };
}
const clone = v => JSON.parse(JSON.stringify(v));
/** Every coaching season of one career, exactly as the harness walks it. */
function coachRows(player, r) {
  player.retired = true;
  let state = coach.startCoachCareer('nba', player, player.year, r.draw);
  const rows = [];
  for (let i = 0; i < 40 && state.year <= 2063; i++) {
    if (state.unemployed) { state = state.offers.length ? coach.acceptCoachOffer(state, 0) : coach.sitOutCoachSeason(state, r.draw).state; continue; }
    const before = clone(state); const from = r.tape.length; const out = coach.playCoachSeason(state, r.draw);
    rows.push({ year: before.year, before, after: clone(out.state), notes: out.notes, tape: r.tape.slice(from) });
    state = out.state;
  }
  return rows;
}

const scouts = {};
for (let seed = 1; seed <= 4; seed++) {
  const r = seedRandom(seed);
  const player = nba.startNbaCareer('Fictional supported coach scout', 'PG', nba.NBA_ARCHETYPES.PG[0], r.draw);
  nba.nbaAssignRole(player, 80, r.draw);
  for (let i = 0; i < 6; i++) { nba.simNbaSeason(player, 80, r.draw); nba.nbaProgress(player, r.draw); }
  const draws = r.tape.length;
  const recorded = clone(player);
  const live = coachRows(player, r);

  const again = seedRandom(seed);
  for (let i = 0; i < draws; i++) again.draw();
  const replay = coachRows(clone(recorded), again);
  if (live.length < 1 || JSON.stringify(replay) !== JSON.stringify(live)) { console.error(`seed ${seed}: the recorded scout does not replay the live one (${replay.length} against ${live.length} seasons). Nothing written.`); process.exit(1); }
  if (recorded.seasons.length !== 6) { console.error(`seed ${seed}: ${recorded.seasons.length} seasons, six expected. Nothing written.`); process.exit(1); }
  scouts[seed] = { draws, player: recorded };
  console.log(`seed ${seed}: ${draws} draws, six seasons, ${live.length} coaching seasons replay the same from the recording (${live[0].year} to ${live[live.length - 1].year})`);
}

writeFileSync(OUT, `${JSON.stringify({
  note: 'Round 1103: the four fictional six season scouts that simUsCoachPoaching.mjs and usCoachPoaching.test.ts start a coaching career from, as the NBA player engine made them before Round 1103 moved the stat line, with the draws each used. Written by scripts/recordUsCoachPoachingScouts.mjs on the commit below; never edited by hand and never recorded again.',
  recordedOn: commit,
  scouts,
}, null, 1)}\n`);
console.log(`wrote ${path.relative(ROOT, OUT)}`);
