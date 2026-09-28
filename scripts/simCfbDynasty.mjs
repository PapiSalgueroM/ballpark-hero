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
   row per season, scored on that season alone, recorded once, the career
   total the ledger sum. CBB Dynasty also got the Round 426 part three reload
   fix CFB had and it never did.

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
        and does not replay the season) and the season ledger rows (a title
        season on an older save and a season without a title each add
        exactly one row recorded once, replaying a closed title adds nothing,
        two seasons on one mounted board add two rows and two finishes, the
        same results score the same for every school);
     5) the ledger headless, both engines, 20 seeds and 8 seasons each,
        closing every season the way the boards do: every season adds
        exactly one row, title or not; appending the same season again adds
        nothing; the recorded numbers sum to the ledger total; each row is
        the score of that season on its own (an empty ledger scores it the
        same); an older save closes into one row with no retroactive points;
        and every pair of schools in the league with identical results that
        season scores identically. It also prints the old rule's recordings
        beside the new ones over the same careers, the before and after.

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
       title, replay and two season rows, go red.
     CFB_DYNASTY_CONTROL=pick loads a copy whose score adds a term read from
       the team's own name: section 5's pick check on both engines and both
       boards' pick rows go red.
     Every control refuses to run if its rewrite changed nothing.

   Run: node scripts/simCfbDynasty.mjs
*/
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEDGER_CONTROLS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CFB_DYNASTY_CONTROL || '';
const CONTROLS = ['drain', 'replay', ...LEDGER_CONTROLS];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CFB_DYNASTY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

/* The checks each control must turn red, and the ones it may. */
const BOARD_LEDGER = (keys) => ['cfb', 'cbb'].flatMap(b => keys.map(k => `${b}-board-ledger-${k}`));
const EXPECT = {
  drain: { must: ['cfb-drain', 'cbb-drain'], may: [] },
  replay: { must: ['cfb-board-reload', 'cbb-board-reload'], may: BOARD_LEDGER(['replay']) },
  double: { must: ['cfb:row', 'cbb:row', 'cfb:replay', 'cbb:replay', 'cfb:sum', 'cbb:sum', ...BOARD_LEDGER(['title', 'replay', 'two'])], may: [] },
  pick: { must: ['cfb:pick', 'cbb:pick', ...BOARD_LEDGER(['pick'])], may: [] },
};

let failures = 0;
const fired = new Set();
const fail = (key, m) => { failures += 1; fired.add(key); console.error(`  FAIL [${key}]: ${m}`); };
const abort = m => { console.error(m); process.exit(1); };

/* ---- bundle the two engines and the ledger, regressed under a control ---- */
const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/cfbDynasty.entry.mjs`;
const BUNDLE = `${TMP}/cfbDynasty.bundle.mjs`;
let cfbSrc = `${ROOT_URL}/src/lib/cfbDynasty.ts`;
let cbbSrc = `${ROOT_URL}/src/lib/cbbDynasty.ts`;
let ledgerSrc = `${ROOT_URL}/src/lib/seasonLedger.ts`;
const scratch = [];
if (CONTROL === 'drain') {
  const fixed = 'pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  const broken = 'pos: ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],';
  for (const [name, target] of [['cfbDynasty', 'cfb'], ['cbbDynasty', 'cbb']]) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', `${name}.ts`), 'utf8');
    if (!src.includes(fixed)) abort(`control cannot run: ${name}.ts is not in the shape this control rewrites`);
    const copy = `${TMP}/${name}.control.ts`;
    /* Round 568 gave both engines a relative import (./entityIds), which does
       not resolve from a copy in the temp folder, so this control died in
       esbuild instead of running. Point relative imports back at src/lib. */
    const regressed = src.replace(fixed, broken).replace(/from '\.\/([^']+)'/g, (_, rel) => `from '${ROOT_URL}/src/lib/${rel}'`);
    if (/from '\.\.?\//.test(regressed)) abort(`control cannot run: ${name}.ts has a relative import this control cannot point back at src`);
    fs.writeFileSync(copy, regressed);
    scratch.push(copy);
    if (target === 'cfb') cfbSrc = copy; else cbbSrc = copy;
  }
  console.log('NEGATIVE CONTROL ON: both engines refill by roster size again');
}
if (LEDGER_CONTROLS.includes(CONTROL)) {
  let copy;
  try { copy = writeLedgerControl(ROOT, CONTROL, TMP); } catch (e) { abort(e.message); }
  scratch.push(copy);
  ledgerSrc = copy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON: the bundle and both boards read a season ledger that ${CONTROL === 'double' ? 'pushes a title season twice and refuses nothing' : 'scores the pick of team'}`);
}
fs.writeFileSync(ENTRY, `
export * as cfb from '${cfbSrc}';
export * as cbb from '${cbbSrc}';
export * as ledger from '${ledgerSrc}';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cfb, cbb, ledger } = await import(pathToFileURL(BUNDLE).href);

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
    ['replay', 'replaying a closed title adds nothing'],
    ['two', 'every closed season adds its own row'],
    ['pick', 'the pick of program changes nothing'],
  ];
  const env = {};
  const dir = path.join(ROOT, 'dist', '.cfb-control');
  const hadDist = fs.existsSync(path.join(ROOT, 'dist'));
  if (CONTROL === 'replay') {
    const RESTORE = /if \(s\.phase === 'recap'\) \{\n\s*if \(s\.postseason\) \{ setPostseason\(s\.postseason\); setPhase\('recap'\); \}\n\s*else openRecruiting\(s\.st\);\n\s*\} else \{\n\s*setPhase\(s\.phase\);\n\s*\}/;
    const OLD = "setPhase(s.phase === 'recap' ? 'season' : s.phase);";
    fs.mkdirSync(dir, { recursive: true });
    for (const b of BOARDS) {
      /* normalised on read: both patterns end a line with \n, which a CRLF checkout never matches */
      const src = fs.readFileSync(path.join(ROOT, b.file), 'utf8').replaceAll('\r\n', '\n');
      if (!b.guard.test(src) || !RESTORE.test(src)) abort(`control cannot run: ${b.file} is not in the shape this control rewrites`);
      const regressed = src.replace(b.guard, '').replace(RESTORE, OLD);
      if (regressed === src || b.guard.test(regressed) || !regressed.includes(OLD)) abort(`control cannot run: the rewrite of ${b.file} changed nothing`);
      const copy = path.join(dir, `${path.basename(b.file, '.tsx')}.control.tsx`);
      fs.writeFileSync(copy, regressed);
      env[b.env] = copy.replaceAll('\\', '/');
    }
    console.log('   NEGATIVE CONTROL ON: both tests render copies of the boards that map a recap save back to the season and have no closed season guard');
  }
  if (LEDGER_CONTROLS.includes(CONTROL)) env.SEASON_LEDGER_MODULE = ledgerSrc;
  let r;
  try {
    r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...TESTS, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
        timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
  } finally {
    if (CONTROL === 'replay') {
      fs.rmSync(dir, { recursive: true, force: true });
      if (!hadDist) fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
    }
  }
  if (r.error) abort(`vitest could not be run: ${r.error.message}`);
  if (r.signal) abort(`vitest was killed with ${r.signal}, so the tests did not finish`);
  const out = (r.stdout || '') + (r.stderr || '');
  for (const t of TESTS) if (!out.includes(path.basename(t))) abort(`vitest did not report on ${t} at all, so nothing was checked:\n` + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL && /Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed/.test(out)) abort('control cannot run: a rewritten file did not load, so any red is a load error and not the check:\n' + out.slice(-1500));
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
  const { appendSeason, ledgerOf, ledgerTotal, scoreSeason, SEASON_CEILING } = ledger;
  const ENGINES = [
    {
      key: 'cfb', label: 'CFB', myTeam: 'UGA', seedMul: 7919,
      init: cfb.initCfb, rounds: cfb.CFB_ROUNDS, round: cfb.simCfbRound, post: cfb.runCfbPostseason,
      result: cfb.cfbSeasonResult, offseason: cfb.cfbOffseason, record: (st, p) => st.natties.push({ season: st.season, team: p.champion }),
    },
    {
      key: 'cbb', label: 'CBB', myTeam: cbb.CBB_SCHOOLS[0].id, seedMul: 104729,
      init: cbb.initCbb, rounds: cbb.CBB_ROUNDS, round: cbb.simCbbRound, post: cbb.runMarch,
      result: cbb.cbbSeasonResult, offseason: cbb.cbbOffseason, record: (st, p) => st.titles.push({ season: st.season, team: p.champion }),
    },
  ];
  const playSeason = (e, st, rng) => {
    for (let r = 1; r <= e.rounds; r += 1) { e.round(st, rng); st.round += 1; }
    const p = e.post(st, rng);
    e.record(st, p);
    const won = p.champion === st.myTeam;
    if (won) st.myTitles += 1;
    st.seasonsPlayed += 1;
    return { p, won };
  };
  for (const e of ENGINES) {
    const k = s => `${e.key}:${s}`;
    const bad = { row: [], replay: [], sum: [], alone: [], pick: [] };
    let titleSeasons = 0, plainSeasons = 0, pairs = 0;
    let oldCount = 0, oldSum = 0, titleRowSum = 0, plainRowSum = 0, newSum = 0;
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const rng = lehmer(seed * e.seedMul + 11);
      const st = e.init(e.myTeam, rng);
      const recorded = [];
      for (let season = 1; season <= SEASONS; season += 1) {
        const { p, won } = playSeason(e, st, rng);
        const result = e.result(st, p);
        /* Exactly the board's close: the save's ledger, cleaned, plus this season. */
        const before = ledgerOf(st.ledger);
        const closed = appendSeason(before, result);
        st.ledger = closed.ledger;
        const tag = `seed ${seed} season ${st.season}${won ? ' (title)' : ''}`;
        if (!closed.row) bad.row.push(`${tag}: closed and added no row`);
        else recorded.push(closed.row.score);
        if (closed.ledger.length !== before.length + 1 || closed.ledger.filter(x => x.season === result.season).length !== 1) {
          bad.row.push(`${tag}: the ledger went from ${before.length} to ${closed.ledger.length} rows, ${closed.ledger.filter(x => x.season === result.season).length} for this season`);
        }
        if (won) { titleSeasons += 1; if (closed.row) titleRowSum += closed.row.score; } else { plainSeasons += 1; if (closed.row) plainRowSum += closed.row.score; }
        /* Scored on the season alone: the same season on an empty ledger. */
        const fresh = appendSeason([], result).row;
        if (closed.row && (!fresh || closed.row.score !== fresh.score || closed.row.score !== scoreSeason(result) || closed.row.score > SEASON_CEILING)) {
          bad.alone.push(`${tag}: row ${closed.row.score}, alone ${fresh?.score}, scoreSeason ${scoreSeason(result)}`);
        }
        /* Replaying the closed season adds nothing. */
        const again = appendSeason(closed.ledger, { ...result });
        if (again.row !== null || again.ledger.length !== closed.ledger.length) bad.replay.push(`${tag}: closing it again added ${again.ledger.length - closed.ledger.length} row(s)`);
        /* The pick: every school's own results this season, as the ledger
           would read them had it been the pick. Identical results must score
           identically whoever they belong to. */
        const byResult = new Map();
        for (const id of Object.keys(st.teams)) {
          const res = e.result({ ...st, myTeam: id }, p);
          const key = [res.wins, res.games, res.madePlayoffs, res.roundsWon, res.reachedFinal, res.wonTitle].join('|');
          const score = scoreSeason(res);
          const seen = byResult.get(key);
          if (!seen) { byResult.set(key, { id, score }); continue; }
          pairs += 1;
          if (seen.score !== score) bad.pick.push(`${tag}: ${seen.id} and ${id} both ${key} scored ${seen.score} and ${score}`);
        }
        /* The old rule, for the before and after: it fired only on a title,
           with the cumulative number. */
        if (won) { oldCount += 1; oldSum += st.myTitles * 100 + st.seasonsPlayed * 5; }
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
       career total is that row, nothing retroactive. */
    {
      const rng = lehmer(e.seedMul + 3);
      const st = e.init(e.myTeam, rng);
      for (let season = 1; season <= 3; season += 1) { playSeason(e, st, rng); e.offseason(st, rng); }
      delete st.ledger;
      st.myTitles = Math.max(st.myTitles, 2);
      const { p } = playSeason(e, st, rng);
      const closed = appendSeason(ledgerOf(st.ledger), e.result(st, p));
      if (!closed.row || closed.ledger.length !== 1 || ledgerTotal(closed.ledger) !== closed.row.score) {
        bad.row.push(`older save with ${st.myTitles} titles: closed into ${closed.ledger.length} row(s), total ${ledgerTotal(closed.ledger)}, row ${closed.row?.score}`);
      }
    }
    const seasons = titleSeasons + plainSeasons;
    console.log(`   ${e.label}: ${seasons} seasons closed, ${titleSeasons} with a title and ${plainSeasons} without; ${pairs} pairs of schools with identical results compared`);
    console.log(`   ${e.label} before: the old rule recorded ${oldCount} of ${seasons} seasons, ${oldSum} points for ${titleSeasons} titles (${titleSeasons ? Math.round(oldSum / titleSeasons) : 0} a title, and 0 for every other season)`);
    console.log(`   ${e.label} after: ${seasons} of ${seasons} seasons recorded once, ${newSum} points, ${titleSeasons ? Math.round(titleRowSum / titleSeasons) : 0} for a title season and ${plainSeasons ? Math.round(plainRowSum / plainSeasons) : 0} for a season without one`);
    for (const [name, list] of Object.entries(bad)) {
      if (list.length) fail(k(name), `${list.length} case(s), first: ${list.slice(0, 3).join(' | ')}`);
    }
    /* Floors set from measured headroom (see the round's record): a check
       that saw no title season, or no same-result pair, proved nothing. */
    if (titleSeasons < 5 || plainSeasons < 20) fail('coverage', `${e.label}: ${titleSeasons} title seasons and ${plainSeasons} without, too few for the row checks to mean anything`);
    if (pairs < 1000) fail('coverage', `${e.label}: only ${pairs} same-result pairs compared, too few for the pick check to mean anything`);
  }
}

for (const f of scratch) fs.rmSync(f, { force: true });

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
