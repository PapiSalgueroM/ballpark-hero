/**
 * Round 1572, step 1: the base record of Aussie Rules Manager's full season save,
 * taken on the engine BEFORE the club sets arrive (brief-1572 design 3.6.1).
 *
 * Writes scripts/data/aussieV2SaveFixture1572.json with HASHES and RECIPES, never
 * save strings (a first season save is about 135 thousand characters):
 * - fleet: seeds 1 to 24 by club-00, club-06 and club-17 (tiers 1, 3 and 5), each
 *   played two whole seasons through the second draft by the fixed bot of
 *   scripts/lib/aflClubNames1572.mjs, with the sha256 of JSON.stringify(state)
 *   and of its masked form at each season close and at the end (72 careers);
 * - recipes: 16 points (seed, club, bot actions from createLeague) that land on
 *   prepare, quarter, a break after a swap, report, the last home and away round,
 *   a finals prepare and report, seasonOver, summer, a draft with picks made,
 *   season 2 and season 3, and four more on other seeds, one club per tier: the
 *   sha256 of the raw save string there and after a further 60 bot actions;
 * - the base sha and the sha256 of the LF text of every file the bundle read
 *   (listed from esbuild's metafile, not from memory).
 *
 * Every v2 save in a browser was written by this shape: aussieRulesLeague.ts has
 * no commit after Round 1014's of 2026-10-05.
 *
 * Its name does not start with sim, so runAllSims skips it. It refuses to
 * overwrite its output without --force (rerunning it after the engine edit would
 * record the head as its own base).
 *   node scripts/recordAussieV2SaveFixture1572.mjs --base <sha>   (asserts every bundled file is that commit's text)
 *   node scripts/recordAussieV2SaveFixture1572.mjs --smoke        (one career, one group, to the OS temp folder)
 * When RC_OUT is set (a remote check) the record is copied there too.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, fleetCareer, FLEET_CLUBS, FLEET_SEEDS, lf, maskedHash, MORE, play, rawHash, RECIPE_GROUPS, runGroup, sha } from './lib/aflClubNames1572.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const SMOKE = process.argv.includes('--smoke');
const BASE = arg('--base');
const started = Date.now();
if (!SMOKE && !BASE) { console.error('a real record needs --base <sha>'); process.exit(2); }
const OUT = SMOKE ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aussieV2Fixture-smoke-')), 'aussieV2SaveFixture1572.json') : path.join(ROOT, 'scripts/data/aussieV2SaveFixture1572.json');
if (!SMOKE && fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} already exists. It is the record of the engine before Round 1572; rerunning it now would not be one.`);
  process.exit(1);
}

const { L, inputs } = await bundle(ROOT, { metafile: true });
const files = inputs.map(rel => ({ path: rel, sha: sha(lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) }));
if (BASE) {
  for (const file of files) {
    const there = lf(execSync(`git show ${BASE}:${file.path}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    if (sha(there) !== file.sha) { console.error(`${file.path} is not ${BASE}'s text, so this would not be the base record`); process.exit(2); }
  }
  console.log(`all ${files.length} bundled files are ${BASE}'s text`);
}
if (typeof L.clubFull === 'function' || typeof L.clubIdentities === 'function') { console.error('the engine already has club sets: this is not the base'); process.exit(2); }

const fleet = [];
for (const seed of SMOKE ? [1] : FLEET_SEEDS) {
  for (const club of SMOKE ? ['club-17'] : FLEET_CLUBS) {
    const points = fleetCareer(L, seed, club);
    fleet.push({ seed, club, points });
    console.log(`fleet seed ${seed} ${club}: ${points.length} checkpoints, ${points[points.length - 1].at} actions`);
  }
}

const recipes = [];
for (const group of SMOKE ? RECIPE_GROUPS.slice(1, 2) : RECIPE_GROUPS) {
  runGroup(L, group, (name, at, state) => {
    const raw = JSON.stringify(state);
    if (raw.includes('"clubSet"')) { console.error(`${name}: the base wrote a clubSet key`); process.exit(2); }
    const loaded = L.readLeagueSave(raw);
    if (!loaded || JSON.stringify(loaded) !== raw) { console.error(`${name}: the base engine refused or changed its own save`); process.exit(2); }
    const after = play(L, loaded, MORE);
    recipes.push({ name, seed: group.seed, club: group.club, at, phase: state.phase, stage: state.stage, season: state.season, round: state.round, week: state.week,
      chars: raw.length, raw: sha(raw), masked: maskedHash(state), after: { raw: rawHash(after), masked: maskedHash(after) } });
    console.log(`recipe ${name}: seed ${group.seed} ${group.club} at ${at} actions (${state.phase}/${state.stage}, season ${state.season}, ${raw.length} chars)`);
  });
}

const record = {
  round: 1572,
  note: 'Base record of the Aussie Rules Manager v2 save before club sets. Hashes and recipes only; scripts/simAflClubNames.mjs replays them.',
  base: BASE ?? null, smoke: SMOKE, more: MORE, files, fleet, recipes,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
if (process.env.RC_OUT) fs.copyFileSync(OUT, path.join(process.env.RC_OUT, path.basename(OUT)));
console.log(`wrote ${OUT}: ${fleet.length} careers, ${recipes.length} recipes, ${files.length} files, ${((Date.now() - started) / 1000).toFixed(1)} s`);
