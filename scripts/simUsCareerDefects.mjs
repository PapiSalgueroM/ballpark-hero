/**
 * Round 833 harness: the defects a player could see in the four US My Careers.
 *
 * Runs three vitest files and, with a control, proves each one goes red on the
 * old code:
 *
 *   src/test/usCareerStatLines.test.tsx  every position of every sport, seeded
 *     careers through the real engines and the real boards rendered from their
 *     saves: no "undefined" or "NaN", a stat the position records, no stat it
 *     never records, on the season line, the retirement bullets, the hub's
 *     career figure and the share text.
 *   src/test/usCareerEraCards.test.ts    the NBA supermax waits for the 2017
 *     offseason, the MLB qualifying offer for the one after the 2012 season,
 *     and both, with the NFL franchise tag, pay the era's money.
 *   src/test/usCareerShopCap.test.ts     the five shop rating items stop at
 *     potential, forced at the ceiling and in 300 seeded careers a sport.
 *
 * NEGATIVE CONTROLS, SIM_US_CAREER_CONTROL=...
 *
 *   oldstatline  usCareerStatLine.ts with the NFL board's old three way
 *                ternary put back: defenders and kickers read "undefined rec".
 *   rpbatting    the same file with the MLB board's old two way ternary put
 *                back: a reliever reads ".000, undefined HR, undefined RBI".
 *   oldbullets   the same file with the old NFL retirement bullet put back:
 *                "0 catches for 0 yards" for every defender and kicker.
 *   supermaxera  nbaCareerLifeB.ts without the 2017 gate.
 *   qoera        mlbCareerLifeB.ts without the 2013 gate.
 *   unscaled     the supermax, qualifying offer and franchise tag cards without
 *                the era's money scale.
 *   shoppot      the four engines with the old Math.min(99, ovr + n) put back
 *                in every rating item.
 *
 *   Each control writes a patched COPY under .sim-control (gitignored), after
 *   asserting that every string it rewrites occurs exactly once in the real
 *   source, points vitest at the copy through NO_DOUBLE_SWAP (an alias map
 *   vitest.config.ts already reads), and requires named tests to fail. A
 *   copy's relative imports are rewritten to "@/lib/..." so it resolves the
 *   real modules beside it. The real source is checked unchanged afterwards.
 *
 * MEASURED, on the shipped code before this round (300 seeded careers a sport,
 * buying the item the first offseason the rating came within one of
 * potential): 5 of 5 NBA buys and 1 of 1 NHL buy left the rating above
 * potential, for 20 and 5 later seasons. After it: 0. Under shoppot the
 * test's own seeded careers sit above potential for 2 (NFL), 30 (NBA), 67 and
 * 14 (NHL) seasons. Throwback careers played through the engines (200 a
 * sport): the supermax drawable 0 times before 2017 and 335 after over 3,706
 * offseasons (275 before under supermaxera), the qualifying offer 0 times
 * before 2013 and 945 after over 3,782 (386 before under qoera). Both gates
 * are rules, so the before counts must be exactly 0 and the after counts
 * above 0.
 *
 * Run: node scripts/simUsCareerDefects.mjs
 *      SIM_US_CAREER_CONTROL=rpbatting node scripts/simUsCareerDefects.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.SIM_US_CAREER_CONTROL || '';
const CONTROLS = ['oldstatline', 'rpbatting', 'oldbullets', 'supermaxera', 'qoera', 'unscaled', 'shoppot'];
assert.ok(control === '' || CONTROLS.includes(control), `SIM_US_CAREER_CONTROL=${control} is not one of ${CONTROLS.join(', ')}`);

/* vitest lives in the nearest node_modules up the tree, so this runs from the
   main checkout and from a worktree inside it alike. */
function findVitest() {
  let dir = root;
  for (let i = 0; i < 8; i++) {
    const bin = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(bin)) return bin;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('vitest not found in any node_modules above ' + root);
}

const STAT_TEST = 'src/test/usCareerStatLines.test.tsx';
const ERA_TEST = 'src/test/usCareerEraCards.test.ts';
const SHOP_TEST = 'src/test/usCareerShopCap.test.ts';

const norm = s => s.split('\r\n').join('\n');

/* The old board and engine code, verbatim, each put back in front of the new
   function, which is renamed out of the way so the copy still compiles. */
const OLD_NFL_LINE = [
  'export function nflStatLine(s: SeasonLine, p: CareerPos): string {',
  "  return s.teamResult === 'SUSPENDED' ? 'Suspended, no season played'",
  "      : p === 'QB' ? `${s.passYds} yds, ${s.passTd} TD, ${s.ints} INT`",
  "      : p === 'RB' ? `${s.rushYds} rush yds, ${s.rushTd} TD, ${s.rec} rec`",
  '      : `${s.rec} rec, ${s.recYds} yds, ${s.recTd} TD`;',
  '}',
  'export function nflStatLineRetired(s: SeasonLine, p: CareerPos): string {',
].join('\n');
const OLD_MLB_LINE = [
  'export function mlbStatLine(s: MlbSeasonLine, p: MlbCareerPos): string {',
  "  return s.teamResult === 'SUSPENDED' ? 'Suspended, no season played'",
  "      : p === 'SP' ? `${s.wins}-${s.lossesP}, ${s.era?.toFixed(2)} ERA, ${s.so} K`",
  "      : `.${String(Math.round((s.avg ?? 0) * 1000)).padStart(3, '0')}, ${s.hr} HR, ${s.rbi} RBI`;",
  '}',
  'export function mlbStatLineRetired(s: MlbSeasonLine, p: MlbCareerPos): string {',
].join('\n');
const OLD_NFL_BULLET = [
  'export function nflCareerStatBullet(t: NflCareerSums, p: CareerPos): string {',
  "  return p === 'QB' ? `${t.passYds.toLocaleString()} passing yards, ${t.passTd} touchdowns`",
  "      : p === 'RB' ? `${t.rushYds.toLocaleString()} rushing yards, ${t.rushTd} touchdowns`",
  '      : `${t.rec} catches for ${t.recYds.toLocaleString()} yards, ${t.recTd} touchdowns`;',
  '}',
  'export function nflCareerStatBulletRetired(t: NflCareerSums, p: CareerPos): string {',
].join('\n');

const SHOP_OLD = n => `s.ovr = Math.min(99, s.ovr + ${n});`;
const SHOP_NEW = n => `s.ovr = raiseWithinPotential(s.ovr, s.pot, ${n});`;

/* Per control: the files it copies, the rewrites in each, the test file it
   runs, and the tests that must fail. */
const PLANS = {
  oldstatline: {
    test: STAT_TEST,
    files: { 'src/lib/usCareerStatLine.ts': [['export function nflStatLine(s: SeasonLine, p: CareerPos): string {', OLD_NFL_LINE]] },
    mustFail: [/'NFL' 'LB': seasons/, /'NFL' 'K': seasons/, /'NFL' 'CB' retirement screen/, /'NFL' 'EDGE' hub/],
    mustPass: [/'NFL' 'QB': seasons/, /'MLB' 'RP': seasons/],
  },
  rpbatting: {
    test: STAT_TEST,
    files: { 'src/lib/usCareerStatLine.ts': [['export function mlbStatLine(s: MlbSeasonLine, p: MlbCareerPos): string {', OLD_MLB_LINE]] },
    mustFail: [/'MLB' 'RP': seasons/, /'MLB' 'RP' retirement screen/, /'MLB' 'RP' hub/],
    mustPass: [/'MLB' 'SP': seasons/, /'MLB' 'SS': seasons/, /'NFL' 'LB': seasons/],
  },
  oldbullets: {
    test: STAT_TEST,
    files: { 'src/lib/usCareerStatLine.ts': [['export function nflCareerStatBullet(t: NflCareerSums, p: CareerPos): string {', OLD_NFL_BULLET]] },
    mustFail: [/'NFL' 'LB': seasons/, /'NFL' 'CB': seasons/, /'NFL' 'EDGE': seasons/, /'NFL' 'K': seasons/],
    mustPass: [/'NFL' 'QB': seasons/, /'NFL' 'WR': seasons/],
    /* vitest prints the strings of a failed toEqual with escaped quotes. */
    mustSay: [/names \\?"catches\\?", a stat this position never records/],
  },
  supermaxera: {
    test: ERA_TEST,
    files: { 'src/lib/nbaCareerLifeB.ts': [['c.year >= NBA_SUPERMAX_FIRST_YEAR && ', '']] },
    mustFail: [/waits for the 2017 offseason/, /never reaches a seeded 2003-04 career before 2017/],
    mustPass: [/NBA supermax.*is unchanged in a 2026 career/],
  },
  qoera: {
    test: ERA_TEST,
    files: { 'src/lib/mlbCareerLifeB.ts': [['c.year >= MLB_QO_FIRST_YEAR && ', '']] },
    mustFail: [/waits for the offseason after the 2012 season/, /never reaches a seeded 2004 career before 2013/],
    mustPass: [/MLB qualifying offer.*is unchanged in a 2026 career/],
  },
  unscaled: {
    test: ERA_TEST,
    files: {
      'src/lib/nbaCareerLifeB.ts': [[' * nbaEraById(c.eraId).moneyScale);', ');']],
      'src/lib/mlbCareerLifeB.ts': [['const scale = mlbEraById(c.eraId).moneyScale;', 'const scale = 1;']],
      'src/lib/nflCareerLifeB.ts': [[' * nflEraById(c.eraId).moneyScale);', ');']],
    },
    mustFail: [/waits for the 2017 offseason/, /waits for the offseason after the 2012 season/, /pays 2005 money in a 2005 career/],
    mustPass: [/never reaches a seeded 2003-04 career before 2017/],
  },
  shoppot: {
    test: SHOP_TEST,
    files: {
      'src/lib/nflMyCareer.ts': [[SHOP_NEW(2), SHOP_OLD(2)]],
      'src/lib/nbaMyCareer.ts': [[SHOP_NEW(2), SHOP_OLD(2)]],
      'src/lib/mlbMyCareer.ts': [[SHOP_NEW(2), SHOP_OLD(2)]],
      'src/lib/nhlMyCareer.ts': [[SHOP_NEW(2), SHOP_OLD(2)], [SHOP_NEW(1), SHOP_OLD(1)]],
    },
    mustFail: [
      /NFL Vision Training'?: on the ceiling/, /NBA Biomechanics Team'?: on the ceiling/, /MLB Biomechanics Team'?: on the ceiling/,
      /NHL Biomechanics Team'?: on the ceiling/, /NHL Home Shooting Room'?: on the ceiling/,
      /MLB Biomechanics Team'?: a save already over its ceiling/, /NBA Biomechanics Team'?: seeded careers/,
    ],
    mustPass: [/NFL Vision Training'?: with room it pays the full raise/],
  },
};

/* A failing test line in vitest's verbose output: a cross, then the name. */
const failedLine = re => new RegExp(`\\u00d7[^\\n]*${re.source}`);
const passedLine = re => new RegExp(`\\u2713[^\\n]*${re.source}`);

const originals = {};
let folder = null;
let exitCode = 0;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  const plan = control ? PLANS[control] : null;
  if (plan) {
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control', 'us-career-'));
    const swap = {};
    for (const [rel, rewrites] of Object.entries(plan.files)) {
      const src = norm(await readFile(path.join(root, rel), 'utf8'));
      originals[rel] = src;
      let out = src;
      for (const [from, to] of rewrites) {
        const count = out.split(from).length - 1;
        assert.equal(count, 1, `control ${control}: ${rel} must contain ${JSON.stringify(from)} exactly once, found ${count}, so this control would prove nothing`);
        out = out.replace(from, to);
      }
      assert.notEqual(out, src, `control ${control}: the rewrite did not change ${rel}`);
      /* Relative imports would resolve inside .sim-control; point them home. */
      out = out.replace(/from '\.\/([^']+)'/g, "from '@/lib/$1'");
      const copy = path.join(folder, path.basename(rel));
      await writeFile(copy, out);
      swap['@/' + rel.replace(/^src\//, '').replace(/\.tsx?$/, '')] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swap);
    console.log(`   NEGATIVE CONTROL ON: ${control} (${Object.keys(swap).join(', ')})`);
  }
  const files = plan ? [plan.test] : [STAT_TEST, ERA_TEST, SHOP_TEST];
  const run = spawnSync(process.execPath, [findVitest(), 'run', ...files, '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const tail = output.slice(-4000);
  assert.ok(!run.error, `${String(run.error)}\n${tail}`);
  for (const f of files) assert.ok(output.includes(path.basename(f)), `${f} did not run\n${tail}`);
  const summary = /Tests\s+(?:(\d+) failed\s*\|\s*)?(\d+) passed/.exec(output);
  assert.ok(summary, `no vitest summary line, so nothing here proves the tests ran\n${tail}`);
  const failed = Number(summary[1] || 0);
  const passed = Number(summary[2]);
  if (!plan) {
    for (const line of output.split('\n')) if (/^\s*console\.log|drawable|seeded careers came/.test(line)) console.log('   ' + line.trim());
    assert.equal(run.status, 0, `the round's tests are red\n${tail}`);
    assert.equal(failed, 0);
    assert.equal(passed, 151, `expected 151 tests (117 stat line, 9 era, 25 shop), saw ${passed}\n${tail}`);
    console.log(`simUsCareerDefects: ${passed} tests passed across the stat lines, the era cards and the shop cap.`);
  } else {
    for (const line of output.split('\n')) if (/drawable|seeded careers came/.test(line)) console.log('   ' + line.trim());
    assert.notEqual(run.status, 0, `control ${control} left the tests green, so they cannot see the old code\n${tail}`);
    for (const re of plan.mustFail) assert.match(output, failedLine(re), `control ${control}: expected a failure matching ${re}\n${tail}`);
    for (const re of plan.mustPass ?? []) assert.match(output, passedLine(re), `control ${control}: expected ${re} to stay green, the control is too broad\n${tail}`);
    for (const re of plan.mustSay ?? []) assert.match(output, re, `control ${control}: expected the output to say ${re}\n${tail}`);
    for (const [rel, src] of Object.entries(originals)) {
      assert.equal(norm(await readFile(path.join(root, rel), 'utf8')), src, `control ${control} changed the real ${rel}`);
    }
    console.log(`simUsCareerDefects ${control}: red as it must be, ${failed} failed and ${passed} passed, every named failure present; real source unchanged.`);
  }
} catch (e) {
  exitCode = 1;
  console.error(String(e && e.stack ? e.stack : e));
} finally {
  if (folder) await rm(folder, { recursive: true, force: true });
}
process.exit(exitCode);
