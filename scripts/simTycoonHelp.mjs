/**
 * Round 583 harness, part one: Stadium Tycoon says what the engine does.
 * Fourth round of the tycoon merge (docs/design/round-580-tycoon-merge.md).
 *
 * A) A vitest suite over the real hook and page, src/test/tycoonHelp.test.tsx:
 *      1 every tap floater prints fmtMoney of the money the tap added, over a
 *        thousand taps from $3 to $9.8 trillion
 *      2 every goal, win, milestone and promotion floater prints fmtMoney of the
 *        amount on the event that paid it
 *      3 a player with no save sees the rules first, and Let's go closes them
 *      4 a player with a save does not, and How it works reopens them
 *      5 the keyboard tap button pays exactly one tap
 *    and four controls, each a broken copy pointed at through vitest.config.ts:
 *      rawtap    a tap floater prints the raw number again          red 1
 *      rawgoal   a goal floater prints the raw number again         red 2
 *      nohelp    the rules no longer open before first play         red 3
 *      deadkey   the keyboard tap button does nothing               red 5
 *
 * B) Node, over the bundled engine, the shipped guide and the page source:
 *      G1 every phrase in the claims table is still in the guide it claims
 *      G2 every claim holds against the engine: an export, a function's answer,
 *         or a measurement (a match's length, a greedy player's first sale)
 *      G3 no number in the /stadium-tycoon guide goes untracked: once the claimed
 *         phrases are removed, no digit and no number word is left
 *      M1 the rules modal types no digit in its text, every number word it
 *         types is claimed, and helpFacts computes every fact it hands over
 *      M2 (part two) the same for every word a player can read on the Stadium
 *         tab: the page, the hook's floaters and the pitch, parsed with the
 *         TypeScript compiler so class names, styles and ids are not prose
 *      L1 (part two) the engine's own blurbs, printed on the tiles and in the
 *         boardroom, carry no number the engine does not pay
 *    and a control for each:
 *      typed      a sentence with a typed number is added to the guide   red G3
 *      stale      the guide's twelve second catch becomes twenty         red G1, G3
 *      engine     the engine's hype lasts 45 seconds instead of 60       red G2
 *      typedmodal the modal types "60 seconds"                           red M1
 *      typedfact  helpFacts hands over a typed 60 for the hype length    red M1
 *      typedscreen the away card says "half speed" again                 red M2
 *      typedblurb Boardroom Sway's blurb says 12% while the engine pays 10%  red L1
 *
 * Control copies go to dist/.tycoon-help-control-<name>/. Never run this while a
 * build is running.
 *
 * Run: node scripts/simTycoonHelp.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = ['src/test/tycoonHelp.test.tsx'];
const HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const PAGE = path.join(ROOT, 'src/pages/StadiumTycoon.tsx');
const PITCH = path.join(ROOT, 'src/components/tycoon/TycoonPitch.tsx');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const ACADEMY_LIB = path.join(ROOT, 'src/lib/wonderkidFactory.ts');
const STADIUM_GUIDE = path.join(ROOT, 'src/data/gameContent/stadiumManagement.ts');
const ACADEMY_GUIDE = path.join(ROOT, 'src/data/gameContent/academyManagement.ts');
const TEST_COUNT = 5;
/** Round 585: the gem ledger, bundled with the engine below and read by the gem claim. */
let REWARDS = null;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonhelp-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

function mustReplace(text, from, to, what) {
  if (text.split(from).length - 1 !== 1) abort(`  control: ${what} does not carry exactly one ${JSON.stringify(from.slice(0, 70))}, so this control would prove nothing`);
  return text.replace(from, to);
}

/* ======================================================================
   A) the suite
   ====================================================================== */

function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', ...TESTS, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) { console.error(text.slice(-3000)); return null; }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.notes = [...text.matchAll(/HELP\| (.+)/g)].map(m => m[1].trim());
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      rows.push({ title: a.title || (a.fullName || '').trim(), status: a.status, messages: (a.failureMessages || []).join('\n') });
    }
  }
  return rows;
}
function detail(messages) {
  const line = messages.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('AssertionError:') && !s.startsWith('at '));
  return (line || messages.split('\n')[0] || '').slice(0, 240);
}
const sectionOf = title => Number((title.match(/^(\d+)/) || [])[1] || 0);

const TAP_FLOATER = 'pushFloater(`+${fmtMoney(after.money - before.money)}`';
const GOAL_FLOATER = "`GOAL ${e.minute}' +${fmtMoney(e.amount ?? 0)}`";
const HELP_OPENS = "    try { if (!localStorage.getItem(TYCOON_SAVE_KEY)) setShowHelp(true); } catch { /* storage blocked: leave it closed */ }\n";
const TAP_KEY = '<button type="button" data-tap-key onClick={() => tapAt(50, 50)}';

const CONTROLS = [
  {
    name: 'rawtap',
    why: 'a tap floater prints the raw number of dollars again',
    env: 'TYCOON_LOADS_STADIUM_HOOK',
    file: 'useStadiumTycoon.ts',
    build: () => mustReplace(read(HOOK), TAP_FLOATER, 'pushFloater(`+$${after.money - before.money}`', 'useStadiumTycoon.ts'),
    red: [1],
    green: [2, 3, 4, 5],
  },
  {
    name: 'rawgoal',
    why: 'a goal floater prints the raw bonus again',
    env: 'TYCOON_LOADS_STADIUM_HOOK',
    file: 'useStadiumTycoon.ts',
    build: () => mustReplace(read(HOOK), GOAL_FLOATER, "`GOAL ${e.minute}' +${e.amount ?? 0}`", 'useStadiumTycoon.ts'),
    red: [2],
    green: [1, 3, 4, 5],
  },
  {
    name: 'nohelp',
    why: 'the rules no longer open before first play',
    env: 'TYCOON_ROOMS_PAGE',
    file: 'StadiumTycoon.tsx',
    build: () => mustReplace(read(PAGE), HELP_OPENS, '', 'StadiumTycoon.tsx'),
    red: [3],
    green: [1, 2, 4, 5],
  },
  {
    name: 'deadkey',
    why: 'the keyboard tap button is still there but pays nothing',
    env: 'TYCOON_ROOMS_PAGE',
    file: 'StadiumTycoon.tsx',
    build: () => mustReplace(read(PAGE), TAP_KEY, '<button type="button" data-tap-key onClick={() => undefined}', 'StadiumTycoon.tsx'),
    red: [5],
    green: [1, 2, 3, 4],
  },
];

console.log('Round 583: Stadium Tycoon says what the engine does');
console.log(`   suite: ${TESTS.join(', ')}`);
console.log('');
console.log('A) the shipped code');
const live = runSuite({});
if (!live) abort('  FAIL: the suite produced no report at all');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < TEST_COUNT) fail(`only ${live.length} of the ${TEST_COUNT} tests ran`);
console.log('   what it measured:');
for (const note of live.notes) console.log(`     ${note}`);
if (live.notes.length < TEST_COUNT) fail(`the suite printed ${live.notes.length} measurements, so some test returned without measuring`);

for (const control of CONTROLS) {
  console.log('');
  console.log(`A.${control.name}) negative control: ${control.why}`);
  const dir = path.join(ROOT, 'dist', `.tycoon-help-control-${control.name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, control.file);
  fs.writeFileSync(file, control.build());
  const rows = runSuite({ [control.env]: file.replaceAll('\\', '/') });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!rows) { fail(`control ${control.name}: no report`); continue; }
  if (rows.loadError) { fail(`control ${control.name}: the broken copy did not load, so every red is a crash:\n${rows.loadError}`); continue; }
  if (rows.length < TEST_COUNT) { fail(`control ${control.name}: only ${rows.length} tests ran`); continue; }
  for (const row of rows) {
    const n = sectionOf(row.title);
    const want = control.red.includes(n) ? 'failed' : 'passed';
    console.log(`   ${row.status === want ? 'ok  ' : 'BAD '} ${row.status.padEnd(6)} ${row.title}`);
    if (control.red.includes(n)) {
      if (row.status !== 'failed') fail(`control ${control.name}: "${row.title}" stayed green, so that check is dead`);
      else console.log(`         measured: ${detail(row.messages)}`);
    }
    if (control.green.includes(n) && row.status !== 'passed') fail(`control ${control.name}: "${row.title}" went red too (${detail(row.messages)})`);
  }
}

/* ======================================================================
   B) the claims
   ====================================================================== */

async function bundle(entry, name) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`, { cwd: ROOT, shell: true });
  return import('file:///' + out.split(path.sep).join('/'));
}

/** Every digit, and every word that states a quantity. Ordinals past second are
 *  quantities too ("the fifth matchday"); "first" and "second" are left out
 *  because the guide uses them as words ("every second", "the first star"). */
const NUMBER = /\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|double|doubles|doubled|triple|twice|once|couple|dozen|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/gi;

/** Words that carry a number word without stating a quantity. Kept tiny on purpose. */
const IDIOMS = [
  { where: 'stadium', phrase: 'one upgrade at a time', why: 'says the ground grows gradually, not how many upgrades' },
  { where: 'stadium', phrase: 'and once you have opened it', why: '"once" as "as soon as"' },
  { where: 'stadium', phrase: 'Once Floodlights pull', why: '"once" as "as soon as"' },
  { where: 'stadium', phrase: 'Staff are the idle half of the build', why: 'half as in one of two ways to build, not a share' },
  { where: 'modal', phrase: 'each new one is', why: '"one" standing for a division' },
  { where: 'modal', phrase: 'each one earned', why: '"one" standing for a badge' },
  { where: 'modal', phrase: 'to catch it, for one of', why: 'a catch pays a single prize; how many prizes there are is computed' },
  { where: 'screen', phrase: 'matchday 1 of', why: 'the first matchday of a season is matchday one' },
  { where: 'lib', phrase: 'The half time pie', why: 'half time is the interval, not a share' },
  { where: 'lib', phrase: 'Third kits, fourth kits', why: 'a joke about kit counts, not a rule' },
];

const strings = v => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

/** A club with 400 fans in 400 seats: the guide's "big crowd". */
function measure(T) {
  const fresh = T.newTycoon(0);
  const crowd = { ...fresh, fanbase: 400, levels: { ...fresh.levels, stands: 7 } };
  /* A match's real length: tick at the hook's 0.2 second cadence from the end
     of one match to the end of the next. Nobody scores (the roll never lands). */
  let s = { ...fresh };
  let t = 0;
  let ends = [];
  const quiet = () => 0.999;
  while (ends.length < 2 && t < 1000) {
    const before = s.totalMatches ?? 0;
    s = T.tick(s, 0.2, quiet).state;
    t += 0.2;
    if ((s.totalMatches ?? 0) > before) ends.push(t);
  }
  const matchSec = ends.length === 2 ? ends[1] - ends[0] : NaN;
  /* The greedy floor player from simStadiumTycoon: six taps and buy everything
     cheapest first every two seconds. The minute the first sale is reachable. */
  const seeded = seed => { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  const saleMinutes = [7, 42, 99].map(seed => {
    const roll = seeded(seed);
    let p = T.newTycoon(0);
    for (let sec = 0; sec < 45 * 60; sec += 2) {
      p = T.tick(p, 2, roll).state;
      for (let k = 0; k < 6; k++) p = T.tap(p);
      for (let guard = 0; guard < 25; guard++) {
        const full = T.attendance(p) >= T.capacity(p) - 5;
        const options = T.TRACKS.filter(tr => T.canBuy(p, tr.id))
          .sort((a, b) => T.costOf(p, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(p, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
        if (!options.length) break;
        p = T.buy(p, options[0].id);
      }
      if (T.canPrestige(p)) return (sec + 2) / 60;
    }
    return Infinity;
  });
  saleMinutes.sort((a, b) => a - b);
  return { fresh, crowd, matchSec, saleMinute: saleMinutes[1], saleMinutes };
}

/** One match's last minute, with a chosen scoreline, played out with nobody scoring. */
function fullTime(T, s, goalsFor, goalsAgainst) {
  let st = { ...s, minute: 89, matchSec: 0, goalsFor, goalsAgainst };
  const events = [];
  for (let i = 0; i < 20 && (st.totalMatches ?? 0) === (s.totalMatches ?? 0); i++) {
    const r = T.tick(st, 0.2, () => 0.999);
    st = r.state;
    events.push(...r.events);
  }
  return { st, events };
}

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const shapes = (T, from, to) => Array.from({ length: to - from + 1 }, (_, i) => T.leagueShape(from + i));

/** Each row: the exact phrase in the guide (or the modal text), and what the
 *  engine must say for it to be true. A check returns '' when the claim holds,
 *  or the engine's answer when it does not. */
const CLAIMS = [
  /* ---- the stadium guide ---- */
  {
    where: 'stadium', phrase: 'Promote academy players aged 18 to 23 into five first-team places',
    check: (T, m, W) => W.PROMOTE_AGE === 18 && W.LEAVE_AGE === 24 && W.FIRST_TEAM_SLOTS === 5 ? '' : 'the promotion ages or team capacity changed',
  },
  {
    where: 'stadium', phrase: 'Each rating point above 60 adds to its defensive edge. With five players rated 80, opponents get twenty percent fewer chances before the minimum chance is applied',
    check: (T, m, W) => {
      const s = W.newFactory(0, 7);
      s.firstTeam = Array.from({ length: 5 }, () => ({ rating: 80 }));
      const before = W.squadEdge(s);
      s.firstTeam[0].rating = 81;
      const after = W.squadEdge(s);
      s.firstTeam = [{ rating: 60 }];
      return near(before, 0.20) && near(after - before, 0.002) && W.squadEdge(s) === 0 ? '' : `five 80s give ${before}, an extra point gives ${after - before}`;
    },
  },
  {
    where: 'stadium', phrase: 'First-team players train at half the academy rate through age 27. Their years take fifteen watched academy minutes, compared with five minutes for academy kids. They hold their rating at 28 and 29, lose 1.2 rating at each birthday from 30, and retire at 34 without a fee',
    check: (T, m, W) => {
      const player = age => ({ id: 'sr-help', name: 'Help Graduate', nation: 'England', pos: 'MF', age, ageClock: 0, rating: 80, potential: 90 });
      const s = W.newFactory(0, 7);
      s.prospects = [{ ...player(18), id: 1 }];
      s.firstTeam = [player(18)];
      W.tick(s, 0.1);
      const halfRate = near((s.firstTeam[0].rating - 80) * 2, s.prospects[0].rating - 80);
      const at = age => {
        const a = W.newFactory(0, 7);
        a.firstTeam = [{ ...player(age), ageClock: W.SENIOR_YEAR_SEC - 0.5 }];
        W.tick(a, 0.5);
        return a;
      };
      const growing = at(27), holding = at(28), declining = at(29), retiring = at(33);
      return halfRate && W.SENIOR_YEAR_SEC === 900 && W.YEAR_SEC === 300
        && growing.firstTeam[0].age === 28 && growing.firstTeam[0].rating > 80
        && holding.firstTeam[0].rating === 80 && near(declining.firstTeam[0].rating, 78.8)
        && retiring.firstTeam.length === 0 && retiring.retired === 1 && retiring.cash === 0
        ? '' : 'senior training, birthdays or retirement no longer match the guide';
    },
  },
  { where: 'stadium', phrase: 'ninety loyal fans', check: (T, m) => (m.fresh.fanbase === 90 && T.attendance(m.fresh) === 90 ? '' : `a new club has ${m.fresh.fanbase} fans`) },
  { where: 'stadium', phrase: 'at half speed for up to eight hours', check: (T, m) => (T.offlineRateOf(m.fresh) === 0.5 && T.offlineCapHoursOf(m.fresh) === 8 ? '' : `away pays ${T.offlineRateOf(m.fresh)} for ${T.offlineCapHoursOf(m.fresh)} hours`) },
  { where: 'stadium', phrase: 'at half rate for up to eight hours', check: (T, m) => (T.offlineRateOf(m.fresh) === 0.5 && T.offlineCapHoursOf(m.fresh) === 8 ? '' : `away pays ${T.offlineRateOf(m.fresh)} for ${T.offlineCapHoursOf(m.fresh)} hours`) },
  { where: 'stadium', phrase: 'ten divisions', check: T => (T.DIVISIONS.length === 10 ? '' : `${T.DIVISIONS.length} divisions`) },
  { where: 'stadium', phrase: 'a payroll of eight staff', check: T => (T.STAFF.length === 8 ? '' : `${T.STAFF.length} staff`) },
  { where: 'stadium', phrase: 'five different prizes', check: T => (Object.keys(T.GOLDEN_INFO).length === 5 ? '' : `${Object.keys(T.GOLDEN_INFO).length} prizes`) },
  { where: 'stadium', phrase: 'one of five prizes', check: T => (Object.keys(T.GOLDEN_INFO).length === 5 ? '' : `${Object.keys(T.GOLDEN_INFO).length} prizes`) },
  {
    where: 'stadium', phrase: '47 badges each add a permanent two percent',
    check: (T, m) => (T.ACHIEVEMENTS.length === 47 && near(T.achMult({ ...m.fresh, ach: [T.ACHIEVEMENTS[0].id] }), 1.02) ? '' : `${T.ACHIEVEMENTS.length} badges, one pays x${T.achMult({ ...m.fresh, ach: [T.ACHIEVEMENTS[0].id] })}`),
  },
  { where: 'stadium', phrase: 'all 47 badges', check: T => (T.ACHIEVEMENTS.length === 47 ? '' : `${T.ACHIEVEMENTS.length} badges`) },
  {
    where: 'stadium', phrase: 'Each of the 47 is a permanent two percent income multiplier, earned exactly once per career',
    check: (T, m) => {
      const badge = T.ACHIEVEMENTS.find(a => a.id === 'af500');
      if (!badge) return 'there is no 500 fans badge to test with';
      const { st } = fullTime(T, { ...m.fresh, fanbase: 600, levels: { ...m.fresh.levels, stands: 20 }, ach: ['af500'] }, 0, 0);
      const count = st.ach.filter(id => id === 'af500').length;
      return T.ACHIEVEMENTS.length === 47 && T.ACH_BONUS === 0.02 && count === 1 ? '' : `${T.ACHIEVEMENTS.length} badges at ${T.ACH_BONUS}, and a held badge is held ${count} times after a match`;
    },
  },
  {
    where: 'stadium', phrase: 'nine tiles: Stands add seats, Ticket Office, Snack Bar and Club Shop raise what each fan spends, Parking pays flat money, Floodlights and Academy grow the fanbase, Squad wins matches, Megaphone boosts taps',
    check: T => {
      const named = ['Stands', 'Ticket Office', 'Snack Bar', 'Club Shop', 'Parking', 'Floodlights', 'Academy', 'Squad', 'Megaphone'];
      const real = T.TRACKS.map(t => t.name);
      return real.length === 9 && named.every(n => real.includes(n)) ? '' : `the tracks are ${real.join(', ')}`;
    },
  },
  {
    where: 'stadium', phrase: 'multiplies all income up to five and a half times',
    check: T => { const top = Math.max(...T.DIVISIONS.map(d => d.incomeMult)); return top === 5.5 && T.DIVISIONS[T.DIVISIONS.length - 1].incomeMult === 5.5 ? '' : `the top multiplier is ${top}`; },
  },
  {
    where: 'stadium', phrase: 'eight staff from a Turnstile Steward to a Club Legend Ambassador',
    check: T => (T.STAFF.length === 8 && T.STAFF[0].name === 'Turnstile Steward' && T.STAFF[T.STAFF.length - 1].name === 'Club Legend Ambassador' ? '' : `${T.STAFF.length} staff, ${T.STAFF[0].name} to ${T.STAFF[T.STAFF.length - 1].name}`),
  },
  {
    where: 'stadium', phrase: 'about twelve seconds',
    check: T => (T.GOLDEN_CATCH_SEC === 12 ? '' : `the catch window is ${T.GOLDEN_CATCH_SEC} seconds`),
    source: [HOOK, 'GOLDEN_CATCH_SEC * 1000'],
  },
  {
    where: 'stadium', phrase: 'every couple of minutes',
    check: T => (T.GOLDEN_MEAN_GAP_SEC >= 90 && T.GOLDEN_MEAN_GAP_SEC <= 180 ? '' : `the mean gap is ${T.GOLDEN_MEAN_GAP_SEC} seconds`),
    source: [HOOK, '/ GOLDEN_MEAN_GAP_SEC'],
  },
  {
    where: 'stadium', phrase: 'seven times the income',
    check: (T, m) => frenzy(T, m),
  },
  {
    where: 'stadium', phrase: 'DERBY DAY at seven times income, CROWD SURGE at twenty five times taps',
    check: (T, m) => frenzy(T, m) || tapRush(T, m),
  },
  {
    where: 'stadium', phrase: 'DERBY DAY (income pays seven times over for 77 seconds), CROWD SURGE (taps pay 25 times for 30 seconds)',
    check: (T, m) => frenzy(T, m) || tapRush(T, m) || (T.catchGolden(m.fresh, 'frenzy').state.goldenLeftSec === 77 && T.catchGolden(m.fresh, 'tapRush').state.goldenLeftSec === 30 ? '' : 'the timed prizes do not last 77 and 30 seconds'),
  },
  {
    where: 'stadium', phrase: 'makes thirty seconds of tapping the whole show',
    check: (T, m) => (T.catchGolden(m.fresh, 'tapRush').state.goldenLeftSec === 30 ? '' : `a crowd surge lasts ${T.catchGolden(m.fresh, 'tapRush').state.goldenLeftSec} seconds`),
  },
  { where: 'stadium', phrase: 'fifteen minutes of income in one lump', check: (T, m) => windfall(T, m) },
  { where: 'stadium', phrase: 'fifteen minutes of income at once', check: (T, m) => windfall(T, m) },
  { where: 'stadium', phrase: 'plus 50 percent income each', check: (T, m) => (T.repMult({ ...m.fresh, rep: 1 }) === 1.5 ? '' : `a star pays x${T.repMult({ ...m.fresh, rep: 1 })}`) },
  {
    where: 'stadium', phrase: 'Each star is a permanent 50 percent income boost and each badge a permanent two percent',
    check: (T, m) => (T.repMult({ ...m.fresh, rep: 1 }) === 1.5 && T.ACH_BONUS === 0.02 ? '' : `a star pays x${T.repMult({ ...m.fresh, rep: 1 })} and a badge ${T.ACH_BONUS}`),
  },
  { where: 'stadium', phrase: 'Matches run about two real minutes', check: (T, m) => (m.matchSec >= 105 && m.matchSec <= 135 ? '' : `a match lasts ${m.matchSec} seconds`) },
  {
    where: 'stadium', phrase: 'The streak multiplier caps at ten wins',
    check: (T, m) => { const at = k => T.streakMult({ ...m.fresh, streak: k }); return at(10) === at(11) && at(10) > at(9) ? '' : `streak 9, 10, 11 pay ${at(9)}, ${at(10)}, ${at(11)}`; },
  },
  {
    where: 'stadium', phrase: 'Matchday Hype charges over eight minutes of play',
    check: (T, m) => (T.BOOST_CHARGE_SEC === 480 && T.boostChargeSecOf(m.fresh) === 480 ? '' : `hype charges in ${T.boostChargeSecOf(m.fresh)} seconds`),
  },
  { where: 'stadium', phrase: 'doubles your income for sixty seconds and lifts your taps with it, though goal and win bonuses are not doubled', check: (T, m) => hype(T, m, 60) },
  {
    where: 'stadium', phrase: 'The bottom three divisions are six clubs playing each other once, five matchdays',
    check: T => { const b = shapes(T, 0, 2); return T.SINGLE_LEG_BELOW === 3 && b.every(x => x.clubs === 6 && x.matchdays === 5) && T.leagueShape(3).matchdays !== T.leagueShape(3).clubs - 1 ? '' : `the bottom shapes are ${JSON.stringify(b)}`; },
  },
  { where: 'stadium', phrase: 'the middle three are eight clubs home and away', check: T => { const b = shapes(T, 3, 5); return b.every(x => x.clubs === 8 && x.matchdays === 14) ? '' : `the middle shapes are ${JSON.stringify(b)}`; } },
  { where: 'stadium', phrase: 'the top four ten clubs home and away', check: T => { const b = shapes(T, 6, T.DIVISIONS.length - 1); return b.length === 4 && b.every(x => x.clubs === 10 && x.matchdays === 18) ? '' : `the top shapes are ${JSON.stringify(b)}`; } },
  {
    where: 'stadium', phrase: 'half your unboosted income rate',
    check: (T, m) => {
      const base = { ...m.crowd, savedAt: 0 };
      const hour = T.offlineEarnings(base, 3600e3);
      const hyped = T.offlineEarnings({ ...base, boostLeftSec: 30 }, 3600e3);
      return hour === Math.round(T.incomePerSec(m.crowd) * 3600 * 0.5) && hyped === hour ? '' : `an hour away pays ${hour}, ${hyped} mid hype, against half of ${T.incomePerSec(m.crowd) * 3600}`;
    },
  },
  {
    where: 'stadium', phrase: 'capped at eight hours',
    check: (T, m) => { const base = { ...m.crowd, savedAt: 0 }; return T.offlineEarnings(base, 9 * 3600e3) === T.offlineEarnings(base, 8 * 3600e3) && T.offlineEarnings(base, 8 * 3600e3) > T.offlineEarnings(base, 7 * 3600e3) ? '' : 'the away cap is not eight hours'; },
  },
  {
    where: 'stadium', phrase: 'at least thirty seconds',
    check: (T, m) => { const base = { ...m.crowd, savedAt: 0 }; return T.offlineEarnings(base, 29e3) === 0 && T.offlineEarnings(base, 30e3) > 0 ? '' : `29 seconds away pays ${T.offlineEarnings(base, 29e3)}, 30 pays ${T.offlineEarnings(base, 30e3)}`; },
  },
  {
    where: 'stadium', phrase: '90 fans paying five cents each, $4.50 a second',
    check: (T, m) => (T.attendance(m.fresh) === 90 && near(T.incomePerSec(m.fresh), 4.5) && near(T.incomePerSec(m.fresh) / T.attendance(m.fresh), 0.05) ? '' : `a new club takes ${T.incomePerSec(m.fresh)} a second from ${T.attendance(m.fresh)} fans`),
  },
  {
    where: 'stadium', phrase: 'The first Stands level costs 30 and adds 40 seats',
    check: (T, m) => { const one = { ...m.fresh, levels: { ...m.fresh.levels, stands: 1 } }; return T.costOf(m.fresh, 'stands') === 30 && T.capacity(one) - T.capacity(m.fresh) === 40 ? '' : `it costs ${T.costOf(m.fresh, 'stands')} and adds ${T.capacity(one) - T.capacity(m.fresh)}`; },
  },
  {
    where: 'stadium', phrase: 'With 280 in the ground a goal pays a 168 dollar bonus before any streak',
    check: (T, m) => { const s = { ...m.fresh, fanbase: 300, levels: { ...m.fresh.levels, stands: 4 } }; return T.attendance(s) === 280 && T.goalBonus(s) === 168 ? '' : `${T.attendance(s)} in the ground pays ${T.goalBonus(s)} a goal`; },
  },
  {
    where: 'stadium', phrase: "the league's fifth matchday comes about ten minutes in",
    check: (T, m) => { const md = T.leagueShape(0).matchdays; const min = (md * m.matchSec) / 60; return md === 5 && min >= 9 && min <= 11 ? '' : `the first season has ${md} matchdays, over ${min.toFixed(1)} minutes`; },
  },
  { where: 'stadium', phrase: 'the Muddy Meadows title lifts you into the Gravel Lane League', check: T => (T.DIVISIONS[0].name === 'Muddy Meadows League' && T.DIVISIONS[1].name === 'Gravel Lane League' ? '' : `the first two divisions are ${T.DIVISIONS[0].name} and ${T.DIVISIONS[1].name}`) },
  {
    where: 'stadium', phrase: 'Around a quarter of an hour in, lifetime earnings crest four million',
    check: (T, m) => (T.prestigeThreshold(m.fresh) === 4e6 && m.saleMinute >= 10 && m.saleMinute <= 20 ? '' : `the bar is ${T.prestigeThreshold(m.fresh)} and the greedy player fills it at minutes ${m.saleMinutes.map(x => x.toFixed(1)).join(', ')}`),
  },
  {
    where: 'stadium', phrase: 'the ninety-fan fence starts again at one and a half times the speed',
    check: (T, m) => { const sold = T.prestige({ ...m.fresh, lifetime: 4e6 }, 0); return sold.fanbase === 90 && T.repMult(sold) === 1.5 ? '' : `a sold club restarts with ${sold.fanbase} fans at x${T.repMult(sold)}`; },
  },
  {
    where: 'stadium', phrase: 'a tap at 400 fans is worth many times a tap at 90',
    check: (T, m) => { const r = T.tapValue(m.crowd) / T.tapValue(m.fresh); return T.attendance(m.crowd) === 400 && r >= 3 ? '' : `a tap at ${T.attendance(m.crowd)} fans is x${r.toFixed(2)} a tap at 90`; },
  },

  /* ---- Round 585: gems ---- */
  {
    where: 'stadium', phrase: 'Gems are earned only by results: three for a watched win, one for a watched draw, one for a win played while you were away, twenty for a league title and six for second place',
    check: () => {
      const R = REWARDS;
      const one = ft => R.creditFullTimes({ ...R.newLedger(), lastMatch: 1 }, [{ totalMatches: 2, ...ft }]).earned;
      const got = [one({ result: 'win', away: false }), one({ result: 'draw', away: false }), one({ result: 'win', away: true }), one({ result: 'loss', away: false, position: 1 }), one({ result: 'loss', away: false, position: 2 })];
      return got.join(',') === '3,1,1,20,6' ? '' : `a watched win, a draw, an away win, a title and second place pay ${got.join(', ')}`;
    },
  },

  /* ---- Round 584: the league keeps playing while you are away ---- */
  {
    where: 'stadium', phrase: 'Matchdays keep playing while you are away, one for every half hour of the trip and inside the same cap',
    check: (T, m) => {
      const s = { ...m.fresh, league: T.newLeague(0, 6, 0), savedAt: 0 };
      const count = sec => Math.floor(T.awaySecondsOf(s, sec * 1000) / T.AWAY_MATCHDAY_SEC);
      const played = sec => T.playAwayMatchdays(s, count(sec), () => 0.5).results.length;
      return T.AWAY_MATCHDAY_SEC === 1800 && played(1800) === 1 && played(5400) === 3 && played(20 * 3600) === (T.offlineCapHoursOf(s) * 3600) / 1800 ? '' : `a half hour plays ${played(1800)}, ninety minutes ${played(5400)}, twenty hours ${played(20 * 3600)}`;
    },
  },
  {
    where: 'stadium', phrase: 'leave for an hour and two matchdays play without you',
    check: (T, m) => { const s = { ...m.fresh, league: T.newLeague(0, 6, 0), savedAt: 0 }; const n = T.playAwayMatchdays(s, Math.floor(T.awaySecondsOf(s, 3600e3) / T.AWAY_MATCHDAY_SEC), () => 0.5).results.length; return n === 2 ? '' : `an hour away plays ${n}`; },
  },
  {
    where: 'stadium', phrase: 'the final matchday of a season always waits for you',
    check: (T, m) => {
      const bad = [];
      for (let d = 0; d < T.DIVISIONS.length; d += 1) {
        const md = T.leagueShape(d).matchdays - 1;
        const s = { ...m.fresh, league: { ...T.newLeague(0, d, 0), matchday: md } };
        if (T.awayMatchdaysPlayable(s, 16) !== 0) bad.push(d);
      }
      return bad.length ? `the final matchday plays away in divisions ${bad.join(', ')}` : '';
    },
  },

  /* ---- the rules modal's own words (its numbers are computed) ---- */
  {
    where: 'modal', phrase: 'Matchdays keep playing while you are away, one every',
    check: (T, m) => { const s = { ...m.fresh, league: T.newLeague(0, 6, 0) }; const r = T.playAwayMatchdays(s, 1, () => 0.5); return r.results.length === 1 && (r.state.totalMatches ?? 0) - (s.totalMatches ?? 0) === 1 ? '' : `one away matchday played ${r.results.length}`; },
  },
  { where: 'modal', phrase: 'pays double for', check: (T, m) => hype(T, m, T.BOOST_DURATION_SEC) },
  { where: 'modal', phrase: 'bonuses are not doubled', check: (T, m) => hype(T, m, T.BOOST_DURATION_SEC) },
  { where: 'modal', phrase: 'every couple of minutes', check: T => (T.GOLDEN_MEAN_GAP_SEC >= 90 && T.GOLDEN_MEAN_GAP_SEC <= 180 ? '' : `the mean gap is ${T.GOLDEN_MEAN_GAP_SEC} seconds`) },
  { where: 'modal', phrase: 'clubs playing each other once', check: T => { const b = shapes(T, 0, T.SINGLE_LEG_BELOW - 1); return b.every(x => x.matchdays === x.clubs - 1) ? '' : `the single leg shapes are ${JSON.stringify(b)}`; } },
  {
    where: 'modal', phrase: 'Milestones pay once each',
    check: (T, m) => {
      const s = { ...m.fresh, fanbase: 600, levels: { ...m.fresh.levels, stands: 20 } };
      const paid = r => r.events.filter(e => e.kind === 'milestone' && /500 fans/.test(e.label ?? '')).length;
      const first = paid(fullTime(T, { ...s, claimed: [] }, 0, 0));
      const again = paid(fullTime(T, { ...s, claimed: ['fans500'] }, 0, 0));
      return first === 1 && again === 0 ? '' : `the 500 fans milestone paid ${first} times, then ${again} times once claimed`;
    },
  },
  {
    where: 'modal', phrase: 'keeps half your streak through a loss',
    check: (T, m) => {
      const s = { ...m.crowd, streak: 8 };
      const kept = fullTime(T, { ...s, legacyPerks: { shield: 1 } }, 0, 1).st.streak;
      const lost = fullTime(T, s, 0, 1).st.streak;
      return kept === 4 && lost === 0 ? '' : `a loss on a streak of 8 leaves ${kept} with the perk and ${lost} without`;
    },
  },

  /* ---- words anywhere else on the screen: the page, the hook's floaters, the pitch ---- */
  { where: 'screen', phrase: 'ten divisions', check: T => (T.DIVISIONS.length === 10 ? '' : `${T.DIVISIONS.length} divisions`) },
  { where: 'screen', phrase: '47 badges', check: T => (T.ACHIEVEMENTS.length === 47 ? '' : `${T.ACHIEVEMENTS.length} badges`) },

  /* ---- the engine's own blurbs, which the tiles and the boardroom print ---- */
  {
    where: 'lib', phrase: 'Every level adds room for 40 more fans',
    check: (T, m) => { const one = { ...m.fresh, levels: { ...m.fresh.levels, stands: 1 } }; return T.capacity(one) - T.capacity(m.fresh) === 40 ? '' : `a Stands level adds ${T.capacity(one) - T.capacity(m.fresh)} seats`; },
  },
  { where: 'lib', phrase: 'Matchday income pays 10% more per level', check: (T, m) => perLevel(T, m, 'sway', s => T.swayMult(s), 0.1) },
  { where: 'lib', phrase: 'The fanbase grows 15% faster per level', check: (T, m) => perLevel(T, m, 'roots', s => T.rootsMult(s), 0.15) },
  { where: 'lib', phrase: 'Every staff member earns 20% more per level', check: (T, m) => perLevel(T, m, 'payroll', s => T.payrollMult(s), 0.2) },
  { where: 'lib', phrase: 'Timed golden whistles run 25% longer per level', check: (T, m) => perLevel(T, m, 'charm', s => T.catchGolden(s, 'frenzy').state.goldenLeftSec / T.GOLDEN_INFO.frenzy.duration, 0.25) },
  {
    where: 'lib', phrase: 'A loss keeps half the win streak instead of ending it',
    check: (T, m) => { const s = { ...m.crowd, streak: 8 }; const kept = fullTime(T, { ...s, legacyPerks: { shield: 1 } }, 0, 1).st.streak; return kept === 4 ? '' : `a loss on a streak of 8 leaves ${kept}`; },
  },
  {
    where: 'lib', phrase: 'Away pay rises to 65 then 80 percent, trips cap at 10 then 12 hours',
    check: (T, m) => { const at = l => ({ ...m.fresh, legacyPerks: { away: l } }); const got = [1, 2].map(l => `${T.offlineRateOf(at(l))}/${T.offlineCapHoursOf(at(l))}`).join(' '); return got === '0.65/10 0.8/12' ? '' : `the two levels pay ${got}`; },
  },
  {
    where: 'lib', phrase: 'Matchday Hype charges a full minute faster per level',
    check: (T, m) => { const at = l => T.boostChargeSecOf({ ...m.fresh, legacyPerks: { voltage: l } }); return at(0) - at(1) === 60 && at(1) - at(2) === 60 ? '' : `the charge is ${at(0)}, ${at(1)}, ${at(2)} seconds`; },
  },
  { where: 'lib', phrase: 'fifteen minutes of income, instantly', check: (T, m) => windfall(T, m) },
  { where: 'lib', phrase: 'income pays x7', check: (T, m) => frenzy(T, m) },
  { where: 'lib', phrase: 'taps pay x25', check: (T, m) => tapRush(T, m) },

  /* ---- the two academy lines this round corrected (589 claims the rest) ---- */
  {
    where: 'academy', phrase: 'about a quarter more than the day one fee: the rating grew, but the promise premium shrank with his age',
    check: (T, m, W) => {
      const ratios = [72, 73, 74, 75].map(ceiling => W.basePrice(71, ceiling, 19) / W.basePrice(58, ceiling, 17));
      return ratios.every(r => r >= 1.15 && r <= 1.4) ? '' : `for ceilings 72 to 75 the fee grows x${ratios.map(r => r.toFixed(2)).join(', x')}`;
    },
  },
  {
    where: 'academy', phrase: "Cash, facilities and every kid stay behind when the academy moves, and the next region's target counts from zero, so money left in the bank on moving day is simply gone",
    check: (T, m, W) => {
      const s = W.newFactory(0, 7);
      s.cash = 1e9;
      s.lifetime = W.REGIONS[0].goal;
      s.levels = Object.fromEntries(Object.keys(s.levels).map(k => [k, 3]));
      s.prospects = [{ id: 1 }, { id: 2 }];
      const fresh = W.newFactory(0, 7);
      if (!W.moveUp(s)) return 'a club past its target could not move up';
      return s.cash === fresh.cash && s.lifetime === 0 && s.prospects.length === fresh.prospects.length && Object.values(s.levels).every(v => v === 0) ? '' : `after the move: cash ${s.cash}, lifetime ${s.lifetime}, ${s.prospects.length} kids, levels ${JSON.stringify(s.levels)}`;
    },
  },
];

/** A perk that promises a step per level: each of its first two levels must add it. */
function perLevel(T, m, id, measureOf, step) {
  const at = l => measureOf({ ...m.crowd, legacyPerks: { [id]: l } });
  const steps = [at(1) - at(0), at(2) - at(1)].filter(Number.isFinite);
  const max = T.LEGACY_PERKS.find(p => p.id === id)?.costs.length ?? 0;
  const checked = max >= 2 ? steps : steps.slice(0, 1);
  return checked.every(d => near(d, step, 1e-9)) ? '' : `${id} steps by ${checked.map(d => d.toFixed(3)).join(', ')} per level`;
}

function frenzy(T, m) {
  const lit = T.catchGolden(m.crowd, 'frenzy').state;
  const r = T.incomePerSec(lit) / T.incomePerSec(m.crowd);
  /* Goal and win bonuses never read the whistle, so its own words must not say everything. */
  const bonuses = T.goalBonus(lit) / T.goalBonus(m.crowd) + T.winBonus(lit) / T.winBonus(m.crowd);
  const says = T.GOLDEN_INFO.frenzy.blurb;
  return near(r, 7) && /x7\b/.test(says) && T.GOLDEN_INFO.frenzy.label === 'DERBY DAY' && (bonuses !== 2 || !/everything/i.test(says)) ? '' : `DERBY DAY pays income x${r}, bonuses x${bonuses / 2}, and says "${says}"`;
}
function tapRush(T, m) {
  const lit = T.catchGolden(m.crowd, 'tapRush').state;
  const r = T.tapValue(lit) / T.tapValue(m.crowd);
  const income = T.incomePerSec(lit) / T.incomePerSec(m.crowd);
  return near(r, 25) && near(income, 1) && /x25\b/.test(T.GOLDEN_INFO.tapRush.blurb) && T.GOLDEN_INFO.tapRush.label === 'CROWD SURGE' ? '' : `CROWD SURGE pays taps x${r}, income x${income}, and says "${T.GOLDEN_INFO.tapRush.blurb}"`;
}
function windfall(T, m) {
  const r = T.catchGolden(m.crowd, 'windfall');
  return T.WINDFALL_SEC === 900 && r.amount === Math.round(T.incomePerSec(m.crowd) * 900) && /fifteen minutes/.test(T.GOLDEN_INFO.windfall.blurb) ? '' : `TV WINDFALL pays ${r.amount} against ${T.incomePerSec(m.crowd)} a second (WINDFALL_SEC ${T.WINDFALL_SEC})`;
}
function hype(T, m, seconds) {
  const ready = { ...m.crowd, boostChargeSec: T.BOOST_CHARGE_SEC };
  const on = T.activateBoost(ready);
  const ratio = f => f(on) / f(ready);
  const megaphone = { ...m.crowd, levels: { ...m.crowd.levels, megaphone: 20 }, boostChargeSec: T.BOOST_CHARGE_SEC };
  const megaTap = T.tapValue(T.activateBoost(megaphone)) / T.tapValue(megaphone);
  const out = { lasts: on.boostLeftSec, income: ratio(T.incomePerSec), tap: ratio(T.tapValue), megaTap, goal: ratio(T.goalBonus), win: ratio(T.winBonus) };
  return on.boostLeftSec === seconds && near(out.income, 2) && near(out.tap, 2, 0.01) && megaTap > 1 && out.goal === 1 && out.win === 1 ? '' : `hype: ${JSON.stringify(out)}`;
}

/** Remove every claimed phrase, then return what quantities are left. */
function untracked(text, rows) {
  let rest = text;
  for (const r of [...rows].sort((a, b) => b.phrase.length - a.phrase.length)) rest = rest.split(r.phrase).join(' | ');
  const left = [];
  for (const line of rest.split('\n')) {
    for (const hit of line.matchAll(NUMBER)) {
      const at = hit.index ?? 0;
      left.push(`"${hit[0]}" in "...${line.slice(Math.max(0, at - 50), at + 40).trim()}..."`);
    }
  }
  return left;
}

/** The modal's JSX, minus comments and every {expression}, minus tags: what it types. */
function modalText(page) {
  const a = page.indexOf('<div data-tycoon-rules');
  const b = page.indexOf("Let's go", a);
  if (a < 0 || b < 0) return null;
  let src = page.slice(a, b);
  src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
  let out = '';
  let depth = 0;
  for (const ch of src) {
    if (ch === '{') { depth += 1; out += depth === 1 ? ' ' : ''; continue; }
    if (ch === '}') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += ch;
  }
  return out.replace(/<[^>]*>/g, '\n').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

/** helpFacts must compute what it hands over: no fact is a bare literal. */
function typedFacts(page) {
  const a = page.indexOf('function helpFacts()');
  const b = page.indexOf('\n}\n', a);
  if (a < 0 || b < 0) return ['helpFacts is not in the page'];
  return page.slice(a, b).split('\n').filter(l => /^\s+\w+:\s*(?:-?[\d.]+|'[^']*'|"[^"]*"|`[^`$]*`),?\s*$/.test(l)).map(l => l.trim());
}

/* Round 583 part two: every word a player can read on the Stadium tab, not only the
   modal's. Parsed with the TypeScript compiler rather than regexes, because the page
   mixes prose with class names, CSS and ids: JSX text, and the string and template
   literals outside class names, styles, ids, storage keys, comparisons and CSS. */
const SKIP_ATTRS = new Set(['className', 'style', 'key', 'ref', 'type', 'role', 'tabIndex', 'id', 'path', 'aria-hidden', 'aria-modal']);
const SKIP_CALLS = new Set(['cn', 'matchMedia', 'querySelector', 'querySelectorAll', 'getItem', 'setItem', 'removeItem', 'addEventListener', 'removeEventListener', 'lazy', 'import']);
const classy = t => { const toks = t.split(' '); return toks.filter(x => /[-:[\]/]/.test(x)).length > toks.length / 2; };
function proseOf(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const skipped = node => {
    if (node.parent && ts.isPropertyAssignment(node.parent) && node.parent.name === node) return true;
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p)) return true;
      if (ts.isJsxAttribute(p)) { const n = p.name.getText(sf); if (SKIP_ATTRS.has(n) || n.startsWith('data-')) return true; }
      if (ts.isJsxElement(p) && p.openingElement.tagName.getText(sf) === 'style') return true;
      if (ts.isCallExpression(p)) {
        const e = p.expression;
        const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
        if (SKIP_CALLS.has(name)) return true;
      }
      if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind)) return true;
    }
    return false;
  };
  const keep = (node, text) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.includes(' ') && /[A-Za-z]{3,}/.test(t) && !classy(t) && !skipped(node)) out.push(t);
  };
  const visit = node => {
    if (ts.isJsxText(node)) return keep(node, node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return keep(node, node.text);
    if (ts.isTemplateExpression(node)) {
      keep(node, [node.head.text, ...node.templateSpans.map(s => s.literal.text)].join(' '));
      for (const s of node.templateSpans) visit(s.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
/** The engine's words the screen prints: every blurb, and the whistles' labels. */
const libWords = T => [
  ...T.TRACKS.map(t => t.blurb), ...T.STAFF.map(t => t.blurb), ...T.LEGACY_PERKS.map(p => p.blurb),
  ...Object.values(T.GOLDEN_INFO).flatMap(g => [g.label, g.blurb]),
];

function claimSections({ T, W, guides, page, m, hook = read(HOOK), pitch = read(PITCH) }) {
  const out = { G1: [], G2: [], G3: [], M1: [], M2: [], L1: [] };
  const screen = [...proseOf(page, 'StadiumTycoon.tsx'), ...proseOf(hook, 'useStadiumTycoon.ts'), ...proseOf(pitch, 'TycoonPitch.tsx')].join('\n');
  const lib = libWords(T).join('\n');
  const onScreen = [...CLAIMS, ...IDIOMS].filter(c => c.where === 'modal' || c.where === 'screen');
  for (const c of [...CLAIMS, ...IDIOMS].filter(x => x.where === 'screen' || x.where === 'lib')) {
    if (!(c.where === 'lib' ? lib : screen).includes(c.phrase)) (c.where === 'lib' ? out.L1 : out.M2).push(`the ${c.where === 'lib' ? 'engine\'s blurbs no longer say' : 'screen no longer says'} "${c.phrase}"`);
  }
  out.M2.push(...untracked(screen, onScreen).map(x => `the screen types an unclaimed number: ${x}`));
  out.L1.push(...untracked(lib, [...CLAIMS, ...IDIOMS].filter(c => c.where === 'lib')).map(x => `an engine blurb types an unclaimed number: ${x}`));
  if (screen.length < 2000) out.M2.push(`only ${screen.length} characters of screen text were found, so the parser is not reading the page`);
  const texts = { stadium: strings(guides['/stadium-tycoon']).join('\n'), academy: strings(guides['/wonderkid-factory']).join('\n') };
  const modal = modalText(page);
  if (modal === null) out.M1.push('the rules modal is not in the page between data-tycoon-rules and Let\'s go');
  for (const c of CLAIMS) {
    const phrase = c.phrase;
    const hay = c.where === 'modal' ? (modal ?? '') : texts[c.where];
    if (hay !== undefined && !hay.includes(phrase)) (c.where === 'modal' ? out.M1 : out.G1).push(`the ${c.where} text no longer says "${phrase}"`);
    let answer;
    try { answer = c.check(T, m, W); } catch (e) { answer = `the check threw: ${e.message}`; }
    if (answer) out.G2.push(`"${phrase}": ${answer}`);
    if (c.source) {
      const [file, needle] = c.source;
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      if (!code.includes(needle)) out.G2.push(`"${phrase}": ${path.basename(file)} no longer uses ${needle}`);
    }
  }
  for (const i of IDIOMS) {
    const hay = i.where === 'modal' ? (modal ?? '') : texts[i.where];
    if (hay !== undefined && !hay.includes(i.phrase)) (i.where === 'modal' ? out.M1 : out.G1).push(`the excused idiom "${i.phrase}" is no longer in the ${i.where} text, so drop it from IDIOMS`);
  }
  out.G3.push(...untracked(texts.stadium, [...CLAIMS.filter(c => c.where === 'stadium'), ...IDIOMS.filter(i => i.where === 'stadium')]));
  if (modal !== null) {
    const digits = modal.split('\n').filter(l => /\d/.test(l));
    for (const l of digits) { const at = l.search(/\d/); out.M1.push(`the modal types a digit: "...${l.slice(Math.max(0, at - 50), at + 30)}..."`); }
    out.M1.push(...untracked(modal.replace(/\d/g, ''), [...CLAIMS.filter(c => c.where === 'modal'), ...IDIOMS.filter(i => i.where === 'modal')]).map(x => `the modal types an unclaimed number word: ${x}`));
  }
  for (const l of typedFacts(page)) out.M1.push(`helpFacts hands over a typed fact: ${l}`);
  return out;
}

const SECTIONS = ['G1', 'G2', 'G3', 'M1', 'M2', 'L1'];
const report = result => {
  for (const k of SECTIONS) console.log(`   ${result[k].length ? 'RED ' : 'ok  '} ${k}${result[k].length ? `: ${result[k][0]}` : ''}`);
};

console.log('');
console.log('B) the claims');
const T = await bundle(LIB, 'stadium');
const W = await bundle(ACADEMY_LIB, 'academy');
REWARDS = await bundle(path.join(ROOT, 'src/lib/tycoonRewards.ts'), 'rewards');
const stadiumContent = await bundle(STADIUM_GUIDE, 'stadium-guide');
const academyContent = await bundle(ACADEMY_GUIDE, 'academy-guide');
const guides = { ...stadiumContent.STADIUM_MANAGEMENT_CONTENT, ...academyContent.ACADEMY_MANAGEMENT_CONTENT };
if (!guides?.['/stadium-tycoon'] || !guides?.['/wonderkid-factory']) abort('  FAIL: the stadium and academy guides did not load from their management bundles');
const page = read(PAGE);
const m = measure(T);
console.log(`   measured: a match lasts ${m.matchSec.toFixed(1)} seconds; the greedy player can first sell up at minutes ${m.saleMinutes.map(x => x.toFixed(1)).join(', ')}`);
const plain = claimSections({ T, W, guides, page, m });
report(plain);
for (const k of SECTIONS) for (const msg of plain[k]) fail(`${k}: ${msg}`);
const tracked = CLAIMS.filter(c => c.where === 'stadium').length;
console.log(`   ${CLAIMS.length} claims hold (${tracked} in the stadium guide, ${CLAIMS.filter(c => c.where === 'modal').length} in the modal's own words, ${CLAIMS.filter(c => c.where === 'academy').length} academy corrections, ${CLAIMS.filter(c => c.where === 'screen').length} elsewhere on the screen, ${CLAIMS.filter(c => c.where === 'lib').length} engine blurbs); ${IDIOMS.length} idiom${IDIOMS.length === 1 ? '' : 's'} excused`);
if (tracked < 30) fail(`only ${tracked} stadium claims, so the table is not covering the guide`);

const clone = v => JSON.parse(JSON.stringify(v));
const HYPE_JSX = 'Press it and your income pays double for {h.hypeSec} seconds';
const HYPE_FACT = '    hypeSec: BOOST_DURATION_SEC,\n';
const CLAIM_CONTROLS = [
  {
    name: 'typed',
    why: 'the guide gains a sentence with a typed number in it',
    red: ['G3'], green: ['G1', 'G2', 'M1', 'M2', 'L1'],
    guides: g => { const i = g['/stadium-tycoon'].howToPlay.findIndex(x => x.startsWith('Tap the stadium for instant cash.')); if (i < 0) abort('  control typed: the tap line is gone'); g['/stadium-tycoon'].howToPlay[i] = g['/stadium-tycoon'].howToPlay[i].replace('Tap the stadium for instant cash.', 'Tap the stadium for instant cash, about 3 dollars a tap at the start.'); },
  },
  {
    name: 'stale',
    why: 'the guide says the whistle gives you twenty seconds',
    red: ['G1', 'G3'], green: ['G2', 'M1', 'M2', 'L1'],
    guides: g => { const before = JSON.stringify(g['/stadium-tycoon']); const after = before.split('about twelve seconds').join('about twenty seconds'); if (after === before) abort('  control stale: no twelve seconds to change'); g['/stadium-tycoon'] = JSON.parse(after); },
  },
  {
    name: 'engine',
    why: 'the engine\'s Matchday Hype lasts 45 seconds',
    red: ['G2'], green: ['G1', 'G3', 'M1', 'M2'],
    engine: async () => {
      const dir = path.join(ROOT, 'dist', '.tycoon-help-control-engine');
      controlDirs.push(dir);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'stadiumTycoon.ts');
      fs.writeFileSync(file, mustReplace(read(LIB), 'export const BOOST_DURATION_SEC = 60;', 'export const BOOST_DURATION_SEC = 45;', 'stadiumTycoon.ts'));
      const lib = await bundle(file, 'engine-control');
      fs.rmSync(dir, { recursive: true, force: true });
      return lib;
    },
  },
  {
    name: 'typedmodal',
    why: 'the rules modal types "60 seconds"',
    red: ['M1', 'M2'], green: ['G1', 'G2', 'G3', 'L1'],
    page: p => mustReplace(p, HYPE_JSX, 'Press it and your income pays double for 60 seconds', 'StadiumTycoon.tsx'),
  },
  {
    name: 'typedfact',
    why: 'helpFacts hands the modal a typed 60 for the hype length',
    red: ['M1'], green: ['G1', 'G2', 'G3', 'M2', 'L1'],
    page: p => mustReplace(p, HYPE_FACT, '    hypeSec: 60,\n', 'StadiumTycoon.tsx'),
  },
  {
    name: 'typedscreen',
    why: 'the away card says half speed again, which is wrong with the Away Day Deal',
    red: ['M2'], green: ['G1', 'G2', 'G3', 'M1', 'L1'],
    page: p => mustReplace(p, 'The turnstiles kept spinning at {Math.round(offlineRateOf(s) * 100)}% speed.', 'The turnstiles kept spinning at half speed.', 'StadiumTycoon.tsx'),
  },
  {
    name: 'typedblurb',
    why: 'Boardroom Sway\'s blurb promises 12% a level while the engine pays 10%',
    red: ['L1'], green: ['G1', 'G2', 'G3', 'M1', 'M2'],
    lib: t => ({ ...t, LEGACY_PERKS: t.LEGACY_PERKS.map(p => (p.id === 'sway' ? { ...p, blurb: p.blurb.replace('10%', '12%') } : p)) }),
  },
];
for (const control of CLAIM_CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control: ${control.why}`);
  const g = clone(guides);
  if (control.guides) control.guides(g);
  const eng = control.engine ? await control.engine() : control.lib ? control.lib(T) : T;
  const pg = control.page ? control.page(page) : page;
  const result = claimSections({ T: eng, W, guides: g, page: pg, m: control.engine ? measure(eng) : m });
  report(result);
  for (const s of control.red) if (result[s].length === 0) fail(`control ${control.name}: ${s} stayed green, so that check is dead`);
  for (const s of control.green) if (result[s].length > 0) fail(`control ${control.name}: ${s} went red too (${result[s][0]})`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonHelp: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonHelp: green.');
console.log('   Every money floater prints what the engine paid, the way the balance prints it, up to trillions.');
console.log('   The rules open before first play and not after; a keyboard can tap.');
console.log('   Every number in the stadium guide and the rules modal is tied to the engine, and nothing typed is left over.');
console.log(`   All ${CONTROLS.length + CLAIM_CONTROLS.length} controls fired exactly where they should.`);
