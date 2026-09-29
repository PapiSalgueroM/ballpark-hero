/* CFB and CBB dynasty harness: the league keeps its skill positions, a
   season closes exactly once, and every closed season is one ledger row.

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

   Round 647. Both dynasties recorded myTitles * 100 + seasonsPlayed * 5, and
   only on a title season: a season without a title recorded nothing, every
   title paid for every title before it again, and the number was decided by
   the program picked. They now close each season into the shared ledger
   (src/lib/seasonLedger.ts, the module the four front offices use too): one
   row per season, scored against the projection made at the pick and then
   at every close for the season after it (the Round 647 fix: from the
   roster the season finished with, carried through the offseason an
   untouched coach gets), recorded once, the ledger total the sum. Whether the pick still decides the number is
   measured over hands off careers in scripts/simSeasonLedger.mjs; the first
   version of this harness only proved that two schools with IDENTICAL
   results scored the same, which the old titles rule passed too, so that
   check is gone. CBB Dynasty also got the Round 426 part three reload fix
   CFB had and it never did.

   Sections:
     1) structure, carried over from that orphaned test: 44 schools, twelve
        players each with a quarterback, 22 games a round, five title games,
        a twelve team field, an eleven game bracket;
     2) CFB over 20 seeds and 8 seasons: after every offseason every AI
        roster still has a QB, an RB and a WR, and heismanRace is never empty;
     3) CBB over 20 seeds and 8 seasons: after every offseason every roster
        still has a PG and a C;
     4) the two boards, rendered: CfbDynastyBoard.test.tsx and
        CbbDynastyBoard.test.tsx under vitest in one run, every row read by
        name. The reload rows (a reload on the recap draws the recap again
        and does not replay the season) and the six season ledger rows (a
        title season and a season without one each add exactly one row,
        scored against the projection the save carries and recorded once;
        an older save adds one row with nothing retroactive and its sum is
        labelled "Since 2026"; replaying a closed title adds nothing; two
        seasons on one mounted board add two rows and two finishes, the
        second scored against the projection made at the first close, which
        the trail does not make again; the projection is the pick's, made on
        the real pick screen; and, Round 674 (the fence lens review's
        R2.D3), the row is the season the engine played, on an ordinary
        season: its wins and games are the engine's standings (CFB's less
        the conference title game, the one postseason game the engine writes
        into them, which leaves the twelve game regular season) and its round
        is the one the engine's bracket reached. Every other row scores the
        recorded row against itself, so a board that built the row from the
        wrong numbers stayed green on all of them);
     5) the ledger headless, both engines, 20 seeds and 8 seasons each,
        closing every season the way the boards do: every season adds
        exactly one row, title or not; appending the same season again adds
        nothing; the recorded numbers sum to the ledger total; each row is
        the score of that season against its projection on its own (an
        empty ledger scores it the same); and an older save closes into one
        row with no retroactive points. It also prints the old rule's
        recordings beside the new ones over the same careers.

   Negative controls (house rule: prove the check can fail, and fail only
   where it was written to). Each control lists the checks it must turn red;
   any other check going red refuses the control as not specific.
     CFB_DYNASTY_CONTROL=drain bundles copies of both engines with the refill
       put back to the index-by-roster-size line; sections 2 and 3 go red.
     CFB_DYNASTY_CONTROL=replay points the board tests at copies of both
       boards with the recap restore put back to its pre-fix shape and the
       closed season guard removed; both boards' reload rows go red (the
       ledger's replay row may go red with them, since the pre-fix board
       really does replay a closed title).
     CFB_DYNASTY_CONTROL=double loads a copy of the ledger that pushes a title
       season's row twice and refuses nothing (scripts/lib/
       seasonLedgerControl.mjs), in the bundle and in both boards: section
       5's row, replay and sum checks on both engines, and both boards'
       title, older, replay, two season and pick rows (every row that closes
       a title), go red.
     CFB_DYNASTY_CONTROL=raw loads a copy that scores the results and not
       the projection: both boards' title and pick rows go red (the title
       season scores its results, not its share of the projection, and the
       pick's projection and the whistle's score the same); the plain, older
       and two season rows may (a winless season scores 0 either way).
     CFB_DYNASTY_CONTROL=record (Round 674) points the board tests at copies
       of both boards that build the closed row from the wrong record: CFB
       leaves the conference title game in the regular season (the review's
       CFB analogue, [] passed as the title games), CBB closes on the record
       from before the final round (the React state, not the round just
       played). Both boards' engine rows go red; their title rows may (both
       also count the regular season's length on a title season).
     CFB_DYNASTY_CONTROL=parallel (Round 674, R2.D10) runs the replay and
       double controls at the same moment, two children of this harness
       sharing one TEMP; both must exit 0 on their own verdict line.
     Every control refuses to run unless its anchor is in the file exactly
     once, in the code with the comments stripped as well as in the text,
     and its rewrite changed something. Round 674 (R2.D10): every copy, the
     engine bundle and its entry go in a per run folder under
     ROOT/.sim-control (scripts/lib/controlScratch.mjs), never dist and
     never a fixed name in TEMP, and nothing here deletes dist. Every copy
     the board tests read prints a load line naming its run, and a control
     whose copies did not all print it is refused.

   Run: node scripts/simCfbDynasty.mjs
*/
import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEDGER_CONTROL_WORDS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';
import { controlScratch, loadedLine, withLoadedLine } from './lib/controlScratch.mjs';
import { stripComments } from './lib/readSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CFB_DYNASTY_CONTROL || '';
const LEDGER_CONTROLS = ['double', 'raw'];
const CONTROLS = ['drain', 'replay', 'record', ...LEDGER_CONTROLS, 'parallel'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CFB_DYNASTY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

/* ---- the parallel control: two controls at once, both must fire ---- */
if (CONTROL === 'parallel') {
  const PAIR = ['replay', 'double'];
  console.log(`NEGATIVE CONTROL ON: ${PAIR.join(' and ')} run at the same moment, sharing TEMP ${process.env.TEMP || process.env.TMP || '(default)'}; both must fire`);
  const runOne = name => new Promise(resolve => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, env: { ...process.env, CFB_DYNASTY_CONTROL: name } });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => resolve({ name, code, out }));
  });
  const results = await Promise.all(PAIR.map(runOne));
  let ok = 0;
  for (const r of results) {
    const works = new RegExp(`control "${r.name}": exactly .* went red and nothing else did, the check works`).test(r.out);
    const loaded = /every control copy the board tests read printed its load line/.test(r.out);
    console.log(`   ${r.name}: exit ${r.code}, ${works ? 'fired' : 'DID NOT FIRE'}, ${loaded ? 'its own copies loaded' : 'NO LOAD LINE'}`);
    if (r.code === 0 && works && loaded) ok += 1;
    else console.log(r.out.split('\n').slice(-25).map(l => '     ' + l).join('\n'));
  }
  if (ok === PAIR.length) { console.log(`\ncontrol "parallel": ${PAIR.join(' and ')} both fired while running at once, each on its own copies, the check works`); process.exit(0); }
  console.error(`\ncontrol "parallel": ${ok} of ${PAIR.length} controls fired while running at once, so running controls in parallel gives false verdicts`);
  process.exit(1);
}

/* The checks each control must turn red, and the ones it may. */
const BOARD_LEDGER = (keys) => ['cfb', 'cbb'].flatMap(b => keys.map(k => `${b}-board-ledger-${k}`));
const EXPECT = {
  drain: { must: ['cfb-drain', 'cbb-drain'], may: [] },
  replay: { must: ['cfb-board-reload', 'cbb-board-reload'], may: BOARD_LEDGER(['replay']) },
  record: { must: BOARD_LEDGER(['engine']), may: BOARD_LEDGER(['title']) },
  /* The engine row plays an ordinary season, which on CFB's seed is a title,
     so a ledger that files a title twice may turn it red too. */
  double: { must: ['cfb:row', 'cbb:row', 'cfb:replay', 'cbb:replay', 'cfb:sum', 'cbb:sum', ...BOARD_LEDGER(['title', 'older', 'replay', 'two', 'pick'])], may: BOARD_LEDGER(['engine']) },
  raw: { must: BOARD_LEDGER(['title', 'pick']), may: BOARD_LEDGER(['plain', 'older', 'two']) },
};
/* Every control rewrites an anchor that must be in its file exactly once. */
const matches = (src, anchor) => (typeof anchor === 'string' ? src.split(anchor).length - 1 : (src.match(new RegExp(anchor.source, 'g')) || []).length);

let failures = 0;
const fired = new Set();
const fail = (key, m) => { failures += 1; fired.add(key); console.error(`  FAIL [${key}]: ${m}`); };
const abort = m => { console.error(m); process.exit(1); };

/* A worktree inside the repo has no node_modules of its own: walk up for the tools. */
const tool = rel => {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const p = path.join(d, 'node_modules', rel);
    if (fs.existsSync(p)) return p;
    if (path.dirname(d) === d) abort(`${rel} is not installed anywhere above this tree`);
  }
};

/* ---- bundle the two engines and the ledger, regressed under a control ---- */
/* Round 674 (R2.D10): the entry, the bundle and every control copy go in a
   folder of this run's own. The fixed names in TEMP collided the moment two
   runs shared a TEMP, and the board copies sat in ROOT/dist/.cfb-control,
   which the harness deleted along with dist. */
const run = controlScratch(ROOT, 'cfb-dynasty');
process.on('exit', () => run.cleanup());
const TMP = run.dir.replace(/\\/g, '/');
const ENTRY = `${TMP}/cfbDynasty.entry.mjs`;
const BUNDLE = `${TMP}/cfbDynasty.bundle.mjs`;
/* The load line every copy the board tests read must print. */
const expectedLoads = [];
let cfbSrc = `${ROOT_URL}/src/lib/cfbDynasty.ts`;
let cbbSrc = `${ROOT_URL}/src/lib/cbbDynasty.ts`;
let ledgerSrc = `${ROOT_URL}/src/lib/seasonLedger.ts`;
if (CONTROL === 'drain') {
  const fixed = 'pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  const broken = 'pos: ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  for (const [name, target] of [['cfbDynasty', 'cfb'], ['cbbDynasty', 'cbb']]) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', `${name}.ts`), 'utf8');
    if (matches(src, fixed) !== 1) abort(`control cannot run: ${name}.ts holds the line this control rewrites ${matches(src, fixed)} times, not exactly once`);
    if (matches(stripComments(src), fixed) !== 1) abort(`control cannot run: the line in ${name}.ts is not in its code exactly once (comments stripped)`);
    const copy = `${TMP}/${name}.control.ts`;
    /* Round 568 gave both engines a relative import (./entityIds), which does
       not resolve from a copy in the temp folder, so this control died in
       esbuild instead of running. Point relative imports back at src/lib. */
    const regressed = src.replace(fixed, broken).replace(/from '\.\/([^']+)'/g, (_, rel) => `from '${ROOT_URL}/src/lib/${rel}'`);
    if (/from '\.\.?\//.test(regressed)) abort(`control cannot run: ${name}.ts has a relative import this control cannot point back at src`);
    fs.writeFileSync(copy, regressed);
    if (target === 'cfb') cfbSrc = copy; else cbbSrc = copy;
  }
  console.log('NEGATIVE CONTROL ON: both engines refill by roster size again');
}
if (LEDGER_CONTROLS.includes(CONTROL)) {
  let copy;
  try { copy = writeLedgerControl(ROOT, CONTROL, TMP); } catch (e) { abort(e.message); }
  const what = `${CONTROL} seasonLedger.ts`;
  fs.writeFileSync(copy, withLoadedLine(fs.readFileSync(copy, 'utf8').split('\r\n').join('\n'), run.tag, what));
  expectedLoads.push(loadedLine(run.tag, what));
  ledgerSrc = copy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON: the bundle and both boards read a season ledger that ${LEDGER_CONTROL_WORDS[CONTROL]}`);
}
/* The season shapes read strengths off state objects and nothing else, so
   the real module serves the engine copies a control bundles too. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as cfb from '${cfbSrc}';
export * as cbb from '${cbbSrc}';
export * as ledger from '${ledgerSrc}';
export * as formats from '${ROOT_URL}/src/lib/seasonFormats.ts';
`);
execSync(`"${process.execPath}" "${tool('esbuild/bin/esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cfb, cbb, ledger, formats } = await import(pathToFileURL(BUNDLE).href);

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
  const f = m => fail('structure', m);
  if (CFB_SCHOOLS.length !== 44) f(`schools ${CFB_SCHOOLS.length}, expected 44`);
  if (new Set(CFB_SCHOOLS.map(s => s.id)).size !== CFB_SCHOOLS.length) f('duplicate school ids');
  for (const conf of CFB_CONFS) if (CFB_SCHOOLS.filter(s => s.conf === conf).length < 2) f(`${conf} is too small for a title game`);
  const rng = lehmer(42);
  const st = initCfb('UGA', rng);
  for (const t of Object.values(st.teams)) {
    if (t.players.length !== 12) f(`${t.id} opens with ${t.players.length} players`);
    if (!t.players.some(p => p.pos === 'QB')) f(`${t.id} opens without a quarterback`);
  }
  for (let r = 1; r <= CFB_ROUNDS; r += 1) {
    const { games, myGame } = simCfbRound(st, rng);
    if (games.length !== 22) f(`round ${r}: ${games.length} games, expected 22`);
    if (!myGame) f(`round ${r}: my team idle`);
    for (const g of games) {
      if (g.hs === g.as) f('a tie in college football');
      const sameConf = CFB_SCHOOL_MAP.get(g.home).conf === CFB_SCHOOL_MAP.get(g.away).conf;
      if (g.conference !== sameConf) f('conference flag wrong');
    }
    st.round += 1;
  }
  for (const t of Object.values(st.teams)) if (t.wins + t.losses !== 12) f(`${t.id} played ${t.wins + t.losses}`);
  const post = runCfbPostseason(st, rng);
  if (post.ccgs.length !== 5) f(`${post.ccgs.length} title games, expected 5`);
  if (post.field.length !== 12 || new Set(post.field).size !== 12) f('the playoff field is not twelve distinct teams');
  for (const c of post.ccgs.map(x => x.winner)) if (!post.field.includes(c)) f(`conference champion ${c} missed the field`);
  if (post.bracket.length !== 11) f(`bracket ${post.bracket.length} games, expected 11`);
  if (!post.champion) f('no champion');
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
  if (emptyRaces > 0) fail('cfb-drain', `heismanRace came back empty ${emptyRaces} time(s); the board indexes [0] on it`);
  if (holes > 0) fail('cfb-drain', `${holes} AI roster(s) lost a skill position after an offseason, first: ${firstHole}`);
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
  if (holes > 0) fail('cbb-drain', `${holes} roster(s) lost a PG or a C after an offseason, first: ${firstHole}`);
}

console.log('4) the two boards: a reload on the recap never replays the season, and each closed season is one ledger row recorded once');
{
  const TESTS = ['src/components/cfb-dynasty/CfbDynastyBoard.test.tsx', 'src/components/cbb-dynasty/CbbDynastyBoard.test.tsx'];
  const BOARDS = [
    { key: 'cfb', label: 'CFB Dynasty', env: 'CFB_BOARD', file: 'src/components/cfb-dynasty/CfbDynastyBoard.tsx', guard: /if \(state\.natties\.some\(n => n\.season === state\.season\)\) return;\n/ },
    { key: 'cbb', label: 'CBB Dynasty', env: 'CBB_BOARD', file: 'src/components/cbb-dynasty/CbbDynastyBoard.tsx', guard: /if \(state\.titles\.some\(t => t\.season === state\.season\)\) return;\n/ },
  ];
  const RELOAD_ROWS = 3;
  const LEDGER_ROWS = [
    ['title', 'a title season adds exactly one row'],
    ['plain', 'a season without a title adds exactly one row too'],
    ['older', 'an older save adds one row and nothing retroactive'],
    ['replay', 'replaying a closed title adds nothing'],
    ['two', 'every closed season adds its own row'],
    ['pick', 'the projection is the pick\'s'],
    ['engine', 'the row is the season the engine played'],
  ];
  const env = {};
  /* Each board control: [anchor, replacement] pairs per board, every anchor
     exactly once in the text and in the code with the comments stripped. */
  const RESTORE = /if \(s\.phase === 'recap'\) \{\n\s*if \(s\.postseason\) \{ setPostseason\(s\.postseason\); setPhase\('recap'\); \}\n\s*else openRecruiting\(s\.st\);\n\s*\} else \{\n\s*setPhase\(s\.phase\);\n\s*\}/;
  const OLD = "setPhase(s.phase === 'recap' ? 'season' : s.phase);";
  const BOARD_REWRITES = {
    replay: b => [[b.guard, ''], [RESTORE, OLD]],
    /* Round 674: CFB leaves the conference title game in the regular season
       ([] handed over as the title games), CBB closes on the React state's
       record, from before the final round was played. */
    record: b => (b.key === 'cfb'
      ? [['cfbRegularRecord(state, post.ccgs)', 'cfbRegularRecord(state, [])']]
      : [['cbbRegularRecord(state)', 'cbbRegularRecord(st!)']]),
  };
  if (BOARD_REWRITES[CONTROL]) {
    for (const b of BOARDS) {
      /* normalised on read: the patterns end a line with \n, which a CRLF checkout never matches */
      const src = fs.readFileSync(path.join(ROOT, b.file), 'utf8').replaceAll('\r\n', '\n');
      const code = stripComments(src);
      let regressed = src;
      for (const [anchor, repl] of BOARD_REWRITES[CONTROL](b)) {
        if (matches(regressed, anchor) !== 1 || matches(code, anchor) !== 1) abort(`control cannot run: ${b.file} does not hold ${anchor} exactly once, in its text and in its code`);
        regressed = regressed.replace(anchor, repl);
      }
      if (regressed === src) abort(`control cannot run: the rewrite of ${b.file} changed nothing`);
      if (CONTROL === 'replay' && (b.guard.test(regressed) || !regressed.includes(OLD))) abort(`control cannot run: the rewrite of ${b.file} left the guard or missed the restore`);
      const copy = path.join(run.dir, `${path.basename(b.file, '.tsx')}.${CONTROL}.control.tsx`);
      const what = `${CONTROL} ${path.basename(b.file)}`;
      fs.writeFileSync(copy, withLoadedLine(regressed, run.tag, what));
      expectedLoads.push(loadedLine(run.tag, what));
      env[b.env] = copy.replaceAll('\\', '/');
    }
    console.log(CONTROL === 'replay'
      ? '   NEGATIVE CONTROL ON: both tests render copies of the boards that map a recap save back to the season and have no closed season guard'
      : '   NEGATIVE CONTROL ON: both tests render copies of the boards that close the season on the wrong record (CFB keeps its conference title game in the regular season, CBB reads the record from before the final round)');
  }
  if (LEDGER_CONTROLS.includes(CONTROL)) env.SEASON_LEDGER_MODULE = ledgerSrc;
  const r = spawnSync(process.execPath, [tool('vitest/vitest.mjs'), 'run', ...TESTS, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
      timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
  if (r.error) abort(`vitest could not be run: ${r.error.message}`);
  if (r.signal) abort(`vitest was killed with ${r.signal}, so the tests did not finish`);
  const out = (r.stdout || '') + (r.stderr || '');
  for (const t of TESTS) if (!out.includes(path.basename(t))) abort(`vitest did not report on ${t} at all, so nothing was checked:\n` + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL && /Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed/.test(out)) abort('control cannot run: a rewritten file did not load, so any red is a load error and not the check:\n' + out.slice(-1500));
  if (expectedLoads.length) {
    const missing = expectedLoads.filter(l => !out.includes(l));
    if (missing.length) abort(`control cannot run: ${missing.length} of ${expectedLoads.length} control copies never printed their load line in the board tests, so they did not run on them:\n  ${missing.join('\n  ')}`);
    console.log(`   every control copy the board tests read printed its load line (${expectedLoads.length}, run ${run.tag})`);
  }
  for (const l of out.split('\n').map(x => x.trim()).filter(x => /^C[FB]B_ENGINE_ROW /.test(x))) console.log(`   ${l.replace('_ENGINE_ROW', ' engine row:')}`);
  const lines = out.split('\n');
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (mark, label, describe, row = '') => lines.filter(l => new RegExp(`${mark}.*${escape(label)}: ${describe} > ${escape(row)}`).test(l)).length;
  for (const b of BOARDS) {
    const green = count('✓', b.label, 'the season closes once');
    const red = count('×', b.label, 'the season closes once');
    console.log(`   ${b.label} reload rows: ${green} green, ${red} red`);
    if (green !== RELOAD_ROWS || red !== 0) fail(`${b.key}-board-reload`, `${b.label}: expected ${RELOAD_ROWS} reload rows green, got ${green} green and ${red} red`);
    if (CONTROL === 'replay' && !new RegExp(`×.*${escape(b.label)}: the season closes once > draws the recap again`).test(out)) {
      console.error(`   ${b.label}: the pre-fix board's "draws the recap again" row did not go red`);
    }
    const states = LEDGER_ROWS.map(([key, row]) => {
      const g = count('✓', b.label, 'the season ledger', row);
      const x = count('×', b.label, 'the season ledger', row);
      return { key, row, state: g === 1 && x === 0 ? 'green' : x === 1 && g === 0 ? 'red' : 'missing' };
    });
    console.log(`   ${b.label} ledger rows: ${states.map(s => `${s.key} ${s.state}`).join(', ')}`);
    for (const s of states) {
      if (s.state === 'missing' && CONTROL) abort(`control cannot run: ${b.label}'s row "${s.row}" did not run at all`);
      if (s.state !== 'green') fail(`${b.key}-board-ledger-${s.key}`, `${b.label}: the ledger row "${s.row}" is ${s.state}`);
    }
  }
  const expectedRows = BOARDS.length * (RELOAD_ROWS + LEDGER_ROWS.length);
  const line = summary ? summary[1].trim() : '';
  if (!CONTROL && (r.status !== 0 || !new RegExp(`^${expectedRows} passed`).test(line) || /failed/.test(line))) {
    fail('board-summary', `the board tests are not ${expectedRows} of ${expectedRows} green (summary "${line || 'none'}")`);
  }
}

console.log(`5) the season ledger headless: both engines, ${SEEDS} seeds and ${SEASONS} seasons each, every season closed the way the boards close it`);
{
  const { appendSeason, expectationOf, ledgerOf, ledgerTotal, projectionFor, projectNext, scoreSeason, seasonResultOf, SEASON_CEILING } = ledger;
  const ENGINES = [
    {
      key: 'cfb', label: 'CFB', myTeam: 'UGA', seedMul: 7919, shape: formats.CFB_SEASON,
      init: cfb.initCfb, rounds: cfb.CFB_ROUNDS, round: cfb.simCfbRound, post: cfb.runCfbPostseason,
      record: (st, p) => cfb.cfbRegularRecord(st, p.ccgs), offseason: cfb.cfbOffseason,
      close: (st, p) => st.natties.push({ season: st.season, team: p.champion }),
    },
    {
      key: 'cbb', label: 'CBB', myTeam: cbb.CBB_SCHOOLS[0].id, seedMul: 104729, shape: formats.CBB_SEASON,
      init: cbb.initCbb, rounds: cbb.CBB_ROUNDS, round: cbb.simCbbRound, post: cbb.runMarch,
      record: st => cbb.cbbRegularRecord(st), offseason: cbb.cbbOffseason,
      close: (st, p) => st.titles.push({ season: st.season, team: p.champion }),
    },
  ];
  /* The board's projection: at the pick for the first season, and for the
     next one at the close, from the roster the season finished with carried
     through the offseason an untouched coach gets. */
  const project = (e, st, season) => projectionFor(e.shape.teams(st), e.shape.format, season, st.myTeam);
  const projectAtClose = (e, st) => projectNext(e.shape, st, st.myTeam, st.season + 1);
  const playSeason = (e, st, rng) => {
    for (let r = 1; r <= e.rounds; r += 1) { e.round(st, rng); st.round += 1; }
    const p = e.post(st, rng);
    e.close(st, p);
    const won = p.champion === st.myTeam;
    if (won) st.myTitles += 1;
    st.seasonsPlayed += 1;
    return { p, won };
  };
  for (const e of ENGINES) {
    const k = s => `${e.key}:${s}`;
    const bad = { row: [], replay: [], sum: [], alone: [] };
    let titleSeasons = 0, plainSeasons = 0;
    let oldCount = 0, oldSum = 0, titleRowSum = 0, plainRowSum = 0, newSum = 0;
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const rng = lehmer(seed * e.seedMul + 11);
      const st = e.init(e.myTeam, rng);
      st.expect = project(e, st, st.season);
      const recorded = [];
      for (let season = 1; season <= SEASONS; season += 1) {
        const { p, won } = playSeason(e, st, rng);
        const result = seasonResultOf(st.season, st.myTeam, e.record(st, p), { games: p.bracket, champion: p.champion }, e.shape);
        const exp = expectationOf(st.expect, st.season);
        const tag = `seed ${seed} season ${st.season}${won ? ' (title)' : ''}`;
        if (!exp) { bad.row.push(`${tag}: no projection for the season being closed`); break; }
        /* Exactly the board's close: the save's ledger, cleaned, plus this season. */
        const before = ledgerOf(st.ledger);
        const closed = appendSeason(before, result, exp);
        st.ledger = closed.ledger;
        if (!closed.row) bad.row.push(`${tag}: closed and added no row`);
        else recorded.push(closed.row.score);
        if (closed.ledger.length !== before.length + 1 || closed.ledger.filter(x => x.season === result.season).length !== 1) {
          bad.row.push(`${tag}: the ledger went from ${before.length} to ${closed.ledger.length} rows, ${closed.ledger.filter(x => x.season === result.season).length} for this season`);
        }
        if (won) { titleSeasons += 1; if (closed.row) titleRowSum += closed.row.score; } else { plainSeasons += 1; if (closed.row) plainRowSum += closed.row.score; }
        /* Scored on the season alone: the same season on an empty ledger, against the same projection. */
        const fresh = appendSeason([], result, exp).row;
        if (closed.row && (!fresh || closed.row.score !== fresh.score || closed.row.score !== scoreSeason(result, exp) || closed.row.score > SEASON_CEILING)) {
          bad.alone.push(`${tag}: row ${closed.row.score}, alone ${fresh?.score}, scoreSeason ${scoreSeason(result, exp)}`);
        }
        /* Replaying the closed season adds nothing. */
        const again = appendSeason(closed.ledger, { ...result }, exp);
        if (again.row !== null || again.ledger.length !== closed.ledger.length) bad.replay.push(`${tag}: closing it again added ${again.ledger.length - closed.ledger.length} row(s)`);
        /* The old rule, for the before and after: it fired only on a title,
           with the cumulative number. */
        if (won) { oldCount += 1; oldSum += st.myTitles * 100 + st.seasonsPlayed * 5; }
        st.expect = projectAtClose(e, st);
        e.offseason(st, rng);
      }
      const total = ledgerTotal(st.ledger);
      const rec = recorded.reduce((a, b) => a + b, 0);
      newSum += rec;
      if (rec !== total) bad.sum.push(`seed ${seed}: recorded ${rec} across ${recorded.length} finishes, ledger total ${total}`);
      if (st.ledger.length !== SEASONS) bad.row.push(`seed ${seed}: ${SEASONS} seasons closed, ${st.ledger.length} rows`);
    }
    /* An older save: a dynasty with titles and seasons counted and no ledger
       field at all closes its next season into exactly one row, and the
       ledger total is that row, nothing retroactive. */
    {
      const rng = lehmer(e.seedMul + 3);
      const st = e.init(e.myTeam, rng);
      for (let season = 1; season <= 3; season += 1) { playSeason(e, st, rng); e.offseason(st, rng); }
      delete st.ledger;
      delete st.expect;
      st.myTitles = Math.max(st.myTitles, 2);
      const exp = project(e, st, st.season);
      const { p } = playSeason(e, st, rng);
      const closed = appendSeason(ledgerOf(st.ledger), seasonResultOf(st.season, st.myTeam, e.record(st, p), { games: p.bracket, champion: p.champion }, e.shape), exp);
      if (!closed.row || closed.ledger.length !== 1 || ledgerTotal(closed.ledger) !== closed.row.score) {
        bad.row.push(`older save with ${st.myTitles} titles: closed into ${closed.ledger.length} row(s), total ${ledgerTotal(closed.ledger)}, row ${closed.row?.score}`);
      }
    }
    const seasons = titleSeasons + plainSeasons;
    console.log(`   ${e.label}: ${seasons} seasons closed, ${titleSeasons} with a title and ${plainSeasons} without`);
    console.log(`   ${e.label} before: the old rule recorded ${oldCount} of ${seasons} seasons, ${oldSum} points for ${titleSeasons} titles (${titleSeasons ? Math.round(oldSum / titleSeasons) : 0} a title, and 0 for every other season)`);
    console.log(`   ${e.label} after: ${seasons} of ${seasons} seasons recorded once, ${newSum} points, ${titleSeasons ? Math.round(titleRowSum / titleSeasons) : 0} for a title season and ${plainSeasons ? Math.round(plainRowSum / plainSeasons) : 0} for a season without one`);
    for (const [name, list] of Object.entries(bad)) {
      if (list.length) fail(k(name), `${list.length} case(s), first: ${list.slice(0, 3).join(' | ')}`);
    }
    /* Floors set from measured headroom (see the round's record): a check
       that saw no title season proved nothing about double counting one. */
    if (titleSeasons < 5 || plainSeasons < 20) fail('coverage', `${e.label}: ${titleSeasons} title seasons and ${plainSeasons} without, too few for the row checks to mean anything`);
  }
}

run.cleanup();

console.log('');
if (CONTROL) {
  const { must, may } = EXPECT[CONTROL];
  const missing = must.filter(x => !fired.has(x));
  const leaked = [...fired].filter(x => !must.includes(x) && !may.includes(x));
  if (leaked.length) abort(`control "${CONTROL}" is not specific, it turned checks red it was not written to break: ${leaked.join(', ')}`);
  if (missing.length) abort(`control "${CONTROL}": the check is dead where it should have fired: ${missing.join(', ')}`);
  console.log(`control "${CONTROL}": exactly ${[...fired].join(', ')} went red and nothing else did, the check works`);
  process.exit(0);
}
if (failures > 0) { console.error(`simCfbDynasty: ${failures} failure(s)`); process.exit(1); }
console.log('simCfbDynasty: all green');
