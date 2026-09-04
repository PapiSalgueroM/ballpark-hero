/* CFB and CBB dynasty harness: the league keeps its skill positions, and a
   season closes exactly once.

   Round 426. Both college engines refilled AI rosters with
   ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length], which indexes by how
   many players a team happens to have while filling. The skill positions
   sit at the front of ROSTER_SHAPE, so any team keeping five or more players
   only ever drew linemen and defenders (CFB) or SG, SF and PF (CBB).
   Quarterbacks, backs and receivers drained out of every AI roster season
   after season; by the fifth final week heismanRace found nobody eligible
   and came back empty, the board indexed [0] and threw inside the final
   week handler, and the dynasty was bricked for good. Measured on the old
   engine: heismanRace empty in 16 of 20 seeds at season 5 and 20 of 20 at
   season 7; in CBB 39 or 40 of the 40 teams had no point guard after five
   offseasons. Nothing had a fence: the only check of the engine was
   scripts/cfbDynastyTest.ts, a .ts file the runner never discovers, and it
   stopped at four seasons, one short of the drain.

   Sections:
     1) structure, carried over from that orphaned test: 44 schools, twelve
        players each with a quarterback, 22 games a round, five title games,
        a twelve team field, an eleven game bracket;
     2) CFB over 20 seeds and 8 seasons: after every offseason every AI
        roster still has a QB, an RB and a WR, and heismanRace is never empty;
     3) CBB over 20 seeds and 8 seasons: after every offseason every roster
        still has a PG and a C;
     4) the board: a reload on the recap screen draws the recap again and
        does not replay the season (Round 426 part three), which is
        src/components/cfb-dynasty/CfbDynastyBoard.test.tsx rendered under
        vitest, the way simFootleDaily runs its hook test.

   Negative controls (house rule: prove the check can fail):
     CFB_DYNASTY_CONTROL=drain bundles copies of both engines with the refill
     put back to the index-by-roster-size line; sections 2 and 3 must go red.
     CFB_DYNASTY_CONTROL=replay points the board test at a copy of the board
     with the recap restore put back to its pre-fix shape and the closed
     season guard removed; the reload test must go red.
     Either control refuses to run if its rewrite changed nothing.

   Run: node scripts/simCfbDynasty.mjs
*/
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CFB_DYNASTY_CONTROL || '';
if (CONTROL && CONTROL !== 'drain' && CONTROL !== 'replay') { console.error(`CFB_DYNASTY_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- bundle the two engines, regressed when the drain control is on ---- */
const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/cfbDynasty.entry.mjs`;
const BUNDLE = `${TMP}/cfbDynasty.bundle.mjs`;
let cfbSrc = `${ROOT_URL}/src/lib/cfbDynasty.ts`;
let cbbSrc = `${ROOT_URL}/src/lib/cbbDynasty.ts`;
if (CONTROL === 'drain') {
  const fixed = 'pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  const broken = 'pos: ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  for (const [name, target] of [['cfbDynasty', 'cfb'], ['cbbDynasty', 'cbb']]) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', `${name}.ts`), 'utf8');
    if (!src.includes(fixed)) { console.error(`control cannot run: ${name}.ts is not in the shape this control rewrites`); process.exit(1); }
    const copy = `${TMP}/${name}.control.ts`;
    fs.writeFileSync(copy, src.replace(fixed, broken));
    if (target === 'cfb') cfbSrc = copy; else cbbSrc = copy;
  }
  console.log('NEGATIVE CONTROL ON: both engines refill by roster size again');
}
fs.writeFileSync(ENTRY, `
export * as cfb from '${cfbSrc}';
export * as cbb from '${cbbSrc}';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cfb, cbb } = await import(pathToFileURL(BUNDLE).href);

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const SEEDS = 20;
const SEASONS = 8;

console.log('1) structure: 44 schools, twelve players each with a quarterback, a full slate every round');
{
  const { CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_CONFS, CFB_ROUNDS, initCfb, simCfbRound, runCfbPostseason } = cfb;
  if (CFB_SCHOOLS.length !== 44) fail(`schools ${CFB_SCHOOLS.length}, expected 44`);
  if (new Set(CFB_SCHOOLS.map(s => s.id)).size !== CFB_SCHOOLS.length) fail('duplicate school ids');
  for (const conf of CFB_CONFS) if (CFB_SCHOOLS.filter(s => s.conf === conf).length < 2) fail(`${conf} is too small for a title game`);
  const rng = lehmer(42);
  const st = initCfb('UGA', rng);
  for (const t of Object.values(st.teams)) {
    if (t.players.length !== 12) fail(`${t.id} opens with ${t.players.length} players`);
    if (!t.players.some(p => p.pos === 'QB')) fail(`${t.id} opens without a quarterback`);
  }
  for (let r = 1; r <= CFB_ROUNDS; r += 1) {
    const { games, myGame } = simCfbRound(st, rng);
    if (games.length !== 22) fail(`round ${r}: ${games.length} games, expected 22`);
    if (!myGame) fail(`round ${r}: my team idle`);
    for (const g of games) {
      if (g.hs === g.as) fail('a tie in college football');
      const sameConf = CFB_SCHOOL_MAP.get(g.home).conf === CFB_SCHOOL_MAP.get(g.away).conf;
      if (g.conference !== sameConf) fail('conference flag wrong');
    }
    st.round += 1;
  }
  for (const t of Object.values(st.teams)) if (t.wins + t.losses !== 12) fail(`${t.id} played ${t.wins + t.losses}`);
  const post = runCfbPostseason(st, rng);
  if (post.ccgs.length !== 5) fail(`${post.ccgs.length} title games, expected 5`);
  if (post.field.length !== 12 || new Set(post.field).size !== 12) fail('the playoff field is not twelve distinct teams');
  for (const c of post.ccgs.map(x => x.winner)) if (!post.field.includes(c)) fail(`conference champion ${c} missed the field`);
  if (post.bracket.length !== 11) fail(`bracket ${post.bracket.length} games, expected 11`);
  if (!post.champion) fail('no champion');
  console.log('   ok');
}

console.log(`2) CFB: over ${SEEDS} seeds and ${SEASONS} seasons every AI roster keeps a QB, an RB and a WR, and the Heisman race is never empty`);
{
  const { CFB_ROUNDS, initCfb, simCfbRound, runCfbPostseason, heismanRace, cfbOffseason } = cfb;
  let emptyRaces = 0; let holes = 0; let firstHole = null; let seasonsRun = 0;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rng = lehmer(seed * 7919);
    const st = initCfb('UGA', rng);
    for (let season = 1; season <= SEASONS; season += 1) {
      for (let r = 1; r <= CFB_ROUNDS; r += 1) { simCfbRound(st, rng); st.round += 1; }
      const post = runCfbPostseason(st, rng);
      const race = heismanRace(st, rng);
      if (race.length === 0) emptyRaces += 1;
      st.natties.push({ season: st.season, team: post.champion });
      cfbOffseason(st, rng);
      seasonsRun += 1;
      for (const t of Object.values(st.teams)) {
        if (t.id === st.myTeam) continue; // the player's roster is the player's business
        for (const pos of ['QB', 'RB', 'WR']) {
          if (!t.players.some(p => p.pos === pos)) { holes += 1; if (!firstHole) firstHole = `seed ${seed} season ${season}: ${t.id} has no ${pos}`; }
        }
      }
    }
  }
  console.log(`   ${seasonsRun} seasons: empty Heisman races ${emptyRaces}, skill position holes ${holes}`);
  if (emptyRaces > 0) fail(`heismanRace came back empty ${emptyRaces} time(s); the board indexes [0] on it`);
  if (holes > 0) fail(`${holes} AI roster(s) lost a skill position after an offseason, first: ${firstHole}`);
}

console.log(`3) CBB: over ${SEEDS} seeds and ${SEASONS} seasons every roster keeps a point guard and a center`);
{
  const { CBB_ROUNDS, CBB_SCHOOLS, initCbb, simCbbRound, cbbOffseason } = cbb;
  let holes = 0; let firstHole = null; let seasonsRun = 0;
  const myTeam = CBB_SCHOOLS[0].id;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rng = lehmer(seed * 104729);
    const st = initCbb(myTeam, rng);
    for (let season = 1; season <= SEASONS; season += 1) {
      for (let r = 1; r <= CBB_ROUNDS; r += 1) { simCbbRound(st, rng); st.round += 1; }
      cbbOffseason(st, rng);
      seasonsRun += 1;
      for (const t of Object.values(st.teams)) {
        if (t.id === st.myTeam) continue;
        for (const pos of ['PG', 'C']) {
          if (!t.players.some(p => p.pos === pos)) { holes += 1; if (!firstHole) firstHole = `seed ${seed} season ${season}: ${t.id} has no ${pos}`; }
        }
      }
    }
  }
  console.log(`   ${seasonsRun} seasons: position holes ${holes}`);
  if (holes > 0) fail(`${holes} roster(s) lost a PG or a C after an offseason, first: ${firstHole}`);
}

console.log('4) the board: a reload on the recap draws the recap again and never replays the season');
{
  const TEST = 'src/components/cfb-dynasty/CfbDynastyBoard.test.tsx';
  let env = {};
  let copy = null;
  if (CONTROL === 'replay') {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/cfb-dynasty/CfbDynastyBoard.tsx'), 'utf8');
    let regressed = src.replace(/if \(state\.natties\.some\(n => n\.season === state\.season\)\) return;\n/, '');
    regressed = regressed.replace(/if \(s\.phase === 'recap'\) \{\n\s*if \(s\.postseason\) \{ setPostseason\(s\.postseason\); setPhase\('recap'\); \}\n\s*else openRecruiting\(s\.st\);\n\s*\} else \{\n\s*setPhase\(s\.phase\);\n\s*\}/, "setPhase(s.phase === 'recap' ? 'season' : s.phase);");
    if (regressed === src || /natties\.some\(n => n\.season === state\.season\)/.test(regressed) || !/setPhase\(s\.phase === 'recap' \? 'season' : s\.phase\);/.test(regressed)) {
      console.error('control cannot run: CfbDynastyBoard.tsx is not in the shape this control rewrites');
      process.exit(1);
    }
    const dir = path.join(ROOT, 'dist', '.cfb-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'CfbDynastyBoard.control.tsx');
    fs.writeFileSync(copy, regressed);
    env = { CFB_BOARD: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the test renders a copy of the board that maps a recap save back to the season');
  }
  let r;
  try {
    r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  } finally {
    if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  const out = (r.stdout || '') + (r.stderr || '');
  if (!out.includes('CfbDynastyBoard.test.tsx')) fail('vitest did not report on the board test at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL === 'replay') {
    /* On the pre-fix board all three tests legitimately fail, so "something
       passed" cannot be the proof that the copy loaded. A load failure shows
       as a resolve or syntax error with no assertion; the check firing shows
       as assertions. */
    const loadError = /Failed to (load|resolve)|SyntaxError|Cannot find module/.test(out);
    const assertionRed = /×.*draws the recap again/.test(out) && /AssertionError|expected/.test(out);
    if (loadError || !/AssertionError|expected/.test(out)) { console.error('control cannot run: the rewritten board did not load, so any red is a load error and not the check:\n' + out.slice(-1500)); process.exit(1); }
    if (assertionRed) fail('on the pre-fix board a reload on the recap re-arms the final week');
  } else if (r.status !== 0 || !/3 passed/.test(out)) {
    const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8);
    fail('the board test is red:\n    ' + lines.join('\n    '));
  }
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCfbDynasty: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCfbDynasty: all green');
