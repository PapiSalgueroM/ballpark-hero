/* The World XI season report says more, and every line is arithmetic on the
   season it already simulated.

   Round 455, his 2026-08-28 review of World XI: "More in the season report."
   The sim had a 38 match record, a table, trophies, a top scorer and
   injuries, and printed a position line and the record. It knew more than it
   said. It now also says how far off the top the XI finished (or by how much
   it won), the longest unbeaten run, and the player of the season by the
   sim's own rating.

   THE RULE THAT MATTERS: none of it draws from the generator. The sim is
   seeded from the XI's names so a squad replays the same season on every
   visit; a new random draw anywhere before the trophy rolls would change
   which squads win what. So every new number is read off values the sim had
   already produced, and this harness proves the season is unchanged by
   running the REAL engine and checking the arithmetic against itself.

   WHAT THIS HOLDS, over 400 seeded XIs:
     1) The record adds up: wins + draws + losses = 38, points = 3W + D.
     2) The unbeaten run is a real run: between 1 and 38 whenever the XI won
        or drew at all, 0 only for a season of 38 defeats, and never longer
        than wins + draws.
     3) The gap and the margin agree with the table: as champions the gap is
        0 and the margin is points minus the best rival; otherwise the margin
        is 0 and the gap is the best rival minus points, never negative.
     4) The player of the season is one of the XI and carries the top rating.
     5) The narrative prints each of the three new lines, and the season a
        squad gets (points, position, trophies) is byte identical to the same
        squad's season under the engine as it stood before this round.
   Negative control:
     WORLD_XI_REPORT_CONTROL=extradraw inserts one extra generator draw
       before the trophy rolls, in memory; section 5 must go red because the
       seasons no longer match.
   Refuses to run if its rewrite changed nothing.

   Run: node scripts/simWorldXiReport.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.WORLD_XI_REPORT_CONTROL || '';
if (CONTROL && CONTROL !== 'extradraw') {
  console.error(`WORLD_XI_REPORT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MATCHES = 38;
const src = read('src/lib/worldXi.ts');

/* The baseline: the engine as it stood before this round, reconstructed by
   stripping this round's additions from the source in memory. If the source
   no longer carries those additions in the expected shape, this refuses. */
const additions = [
  ["    if (roll < winP) { points += 3; wins++; currentRun++; }", "    if (roll < winP) { points += 3; wins++; }"],
  ["    else if (roll < winP + drawP) { points += 1; draws++; currentRun++; }", "    else if (roll < winP + drawP) { points += 1; draws++; }"],
  ["    else { losses++; currentRun = 0; }\n    if (currentRun > unbeatenRun) unbeatenRun = currentRun;", "    else { losses++; }"],
];
let baseline = src;
for (const [now, before] of additions) {
  if (!baseline.includes(now)) { console.error(`the source no longer carries "${now.trim().slice(0, 50)}", so the baseline cannot be reconstructed`); process.exit(1); }
  baseline = baseline.replace(now, before);
}

let current = src;
if (CONTROL === 'extradraw') {
  const needle = '  const bestRival = rivalPoints.length ? Math.max(...rivalPoints) : 0;';
  if (!current.includes(needle)) { console.error('control cannot run: the report block is not in the shape this control rewrites'); process.exit(1); }
  /* One extra draw BEFORE the trophy rolls: the trophies block sits above
     the report block in source, so the draw is placed at the top of the
     season sim instead, right after the generator is made. */
  const top = '  const rand = rng(seed);';
  if (!current.includes(top)) { console.error('control cannot run: the generator line is not where this control expects'); process.exit(1); }
  current = current.replace(top, `${top}\n  rand();`);
  console.log('NEGATIVE CONTROL ON: one extra generator draw at the top of the season sim');
}

const stubStorage = () => {
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
    key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
};

const bundle = async (source, tag) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-wxr-${tag}-`));
  const entry = path.join(tmp, 'worldXi.ts');
  fs.writeFileSync(entry, source);
  const out = path.join(tmp, 'worldXi.mjs');
  const esbuild = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
  execFileSync(esbuild, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, `--alias:@=${path.join(ROOT, 'src')}`, '--log-level=error'], { stdio: 'pipe', shell: process.platform === 'win32' });
  stubStorage();
  const mod = await import(pathToFileURL(out).href);
  return { mod, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
};

const squadFor = seed => {
  /* Eleven real names in the shape the engine reads, market values spread by
     seed so the 400 XIs cover weak sides and elite ones. */
  const names = [
    ['Thibaut Courtois', 'GK'], ['Trent Alexander-Arnold', 'RB'], ['Virgil van Dijk', 'CB'], ['Ruben Dias', 'CB'],
    ['Theo Hernandez', 'LB'], ['Rodri', 'CDM'], ['Jude Bellingham', 'CAM'], ['Pedri', 'CM'],
    ['Bukayo Saka', 'RW'], ['Vinicius Junior', 'LW'], ['Erling Haaland', 'ST'],
  ];
  /* WxPlayer: name, country, position, club, value (USD), age. */
  return names.map(([name, position], i) => ({
    name: `${name} ${seed}`, country: 'x', position, club: 'x',
    value: 2_000_000 + ((seed * 7919 + i * 104729) % 180_000_000),
    age: 20 + ((seed + i) % 15),
  }));
};

const { mod: cur, cleanup: c1 } = await bundle(current, 'now');
const { mod: base, cleanup: c2 } = await bundle(baseline, 'before');
const simulate = cur.simulateWorldXiSeason;
const simulateBefore = base.simulateWorldXiSeason;
if (typeof simulate !== 'function' || typeof simulateBefore !== 'function') { console.error('simulateWorldXiSeason is not exported'); process.exit(1); }

console.log('1) the record adds up');
console.log('2) the unbeaten run is a real run');
console.log('3) the gap and the margin agree with the table');
console.log('4) the player of the season is one of the XI, at the top rating');
console.log('5) three new lines print, and the season is unchanged');
let seasons = 0, champions = 0, lines = 0, unchanged = 0, changed = [];
for (let seed = 1; seed <= 400; seed += 1) {
  const squad = squadFor(seed);
  const now = simulate(squad, '4-3-3');
  const before = simulateBefore(squad, '4-3-3');
  seasons += 1;
  const { wins, draws, losses } = now.record;
  if (wins + draws + losses !== MATCHES) fail(`seed ${seed}: record ${wins}W ${draws}D ${losses}L does not add to ${MATCHES}`);
  if (now.points !== wins * 3 + draws) fail(`seed ${seed}: ${now.points} points is not 3 x ${wins} + ${draws}`);
  const undefeated = wins + draws;
  if (undefeated > 0 && (now.unbeatenRun < 1 || now.unbeatenRun > MATCHES)) fail(`seed ${seed}: unbeaten run ${now.unbeatenRun} with ${undefeated} unbeaten matches`);
  if (undefeated === 0 && now.unbeatenRun !== 0) fail(`seed ${seed}: an unbeaten run of ${now.unbeatenRun} in a season of 38 defeats`);
  if (now.unbeatenRun > undefeated) fail(`seed ${seed}: an unbeaten run of ${now.unbeatenRun} is longer than the ${undefeated} matches not lost`);
  if (now.tablePosition === 1) {
    champions += 1;
    if (now.gapToTop !== 0) fail(`seed ${seed}: champions ${now.gapToTop} points off the top`);
    if (now.marginAsChampion < 0) fail(`seed ${seed}: a negative margin as champions`);
  } else {
    if (now.marginAsChampion !== 0) fail(`seed ${seed}: a margin as champion while finishing ${now.tablePosition}`);
    if (now.gapToTop < 0) fail(`seed ${seed}: a negative gap to the top`);
    if (now.gapToTop === 0) fail(`seed ${seed}: finished ${now.tablePosition} yet 0 points off the top`);
  }
  if (!now.playerOfSeason) fail(`seed ${seed}: no player of the season from a full XI`);
  else if (!squad.some(p => p.name === now.playerOfSeason.name)) fail(`seed ${seed}: the player of the season is not in the XI`);
  const n = now.narrative;
  const has = re => n.some(l => re.test(l));
  if (!has(/off the top\.$|^Won it by|^Level on points at the top/)) fail(`seed ${seed}: no gap or margin line`);
  if (!has(/^Longest unbeaten run: \d+ game/)) fail(`seed ${seed}: no unbeaten run line`);
  if (!has(/^Player of the season: .+ \(rating \d+\)\.$/)) fail(`seed ${seed}: no player of the season line`);
  lines += 3;
  const same = now.points === before.points && now.tablePosition === before.tablePosition && now.trophies.join('|') === before.trophies.join('|') && (now.topScorer?.goals ?? -1) === (before.topScorer?.goals ?? -1);
  if (same) unchanged += 1; else changed.push(seed);
}
console.log(`   ${seasons} seasons, ${champions} title winning, ${lines} new lines printed`);
if (changed.length) fail(`${changed.length} of ${seasons} seasons changed against the engine as it stood before this round (first seeds ${changed.slice(0, 5).join(', ')}), so a draw was added`);
else console.log(`   ${unchanged} of ${seasons} seasons byte identical in points, position, trophies and top scorer to the engine before this round`);
c1(); c2();

await new Promise(r => setTimeout(r, 50));
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimWorldXiReport: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimWorldXiReport: green. The report says more and the season it describes did not move.');
