/* Round 1542: the NFL Front Office's season numbers (src/lib/nflSeasonStats.ts) and the lift of the story's drive
 * arithmetic (src/lib/gameLaws/nflDrives.ts) that the press reads them by.
 *
 *   node scripts/simNflSeasonStats.mjs
 *   LIFT_BASE=/path/to/a/worktree/of/the/base node scripts/simNflSeasonStats.mjs     (section 1, the lift's receipt)
 *   NFL_STATS_SECTIONS=1,2 SEEDSET=0 node scripts/simNflSeasonStats.mjs               (a part of it)
 *   NFL_STATS_CONTROL=<name> node scripts/simNflSeasonStats.mjs                        (a negative control)
 *
 * Exit 0 green; 1 red, or a control that fired at its named check; 2 could not run; 3 a control that did not fire
 * or turned a section red it is not aimed at. Every control asserts its anchor is in its file exactly once (the
 * bundle refuses otherwise) and rewrites the source in memory for the bundler only, never on disk.
 *
 * Nothing here reads the network or the clock: it bundles modules under src that import no client, and plays the
 * fleet of scripts/lib/gmGameDayFleet.mjs (seed sets 0 to 4, both kinds of league, 40 seasons each) the way the
 * board plays a week.
 *
 * SECTIONS
 *  1 LIFT. The drive arithmetic moved out of src/lib/gameLaws/nfl.ts with every body unchanged. Every told final of
 *    the fleet (the 272 regular season games and the 13 playoff games of every season) is told by the Game Day law
 *    from both sides on this tree and on LIFT_BASE (a worktree of the commit before the move, its path in the env
 *    var, never committed), and every GameStory, minutes included, must be the same JSON. Skipped, and said so in
 *    the closing line, when LIFT_BASE is not set: it is the receipt of the move, not a standing fence.
 *
 * CONTROLS
 *   liftdrift   MAX_FG 6 to 5 in this tree's nflDrives.ts                      -> section 1, red on every set
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_ENTRY, FLEET, ROOT, bundle, enginePostseason, norm, playRegularSeason, sha1 } from './lib/gmGameDayFleet.mjs';

const CONTROL = process.env.NFL_STATS_CONTROL || '';
const SEEDSETS = process.env.SEEDSET !== undefined && process.env.SEEDSET !== '' ? process.env.SEEDSET.split(',').map(Number) : FLEET.sets;
if (SEEDSETS.some(s => !FLEET.sets.includes(s))) { console.error(`SEEDSET must be among ${FLEET.sets.join(', ')}`); process.exit(2); }
const ALL_SECTIONS = [1];
const SECTIONS = process.env.NFL_STATS_SECTIONS ? process.env.NFL_STATS_SECTIONS.split(',').map(Number) : ALL_SECTIONS;
const LIFT_BASE = process.env.LIFT_BASE || '';

const DRIVES = 'src/lib/gameLaws/nflDrives.ts';

/* `labels`: pieces of check labels that must ALL be among the reds of the control's section. `everySet`: the
   control must turn the section's check red on every seed set run. `needs`: the sections it cannot fire without. */
const CONTROLS = {
  liftdrift: { section: 1, labels: ['tells the same story on this tree as on the base'], everySet: true, needs: [1], patches: [{ file: DRIVES, from: 'export const MAX_FG = 6;', to: 'export const MAX_FG = 5;' }] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL && CONTROLS[CONTROL].needs.some(s => !SECTIONS.includes(s))) { console.error(`control ${CONTROL} needs sections ${CONTROLS[CONTROL].needs.join(', ')}`); process.exit(2); }
if (CONTROL === 'liftdrift' && !LIFT_BASE) { console.error('control liftdrift needs LIFT_BASE'); process.exit(2); }
const PATCHES = CONTROL ? CONTROLS[CONTROL].patches : [];

/* ─── checks ─── */
let checks = 0;
const failsBy = new Map();
function check(section, label, ok, detail = '') {
  checks += 1;
  if (ok) { console.log(`  ok   ${label}`); return; }
  console.log(`  FAIL ${label}${detail ? `: ${detail}` : ''}`);
  const k = String(section);
  failsBy.set(k, [...(failsBy.get(k) ?? []), label]);
}
const tally = () => ({ n: 0, bad: 0, first: '' });
function count(t, ok, what) { t.n += 1; if (!ok) { t.bad += 1; if (!t.first) t.first = typeof what === 'function' ? what() : what; } }
function settle(section, label, t) { check(section, `${label} (${t.n} looked at)`, t.bad === 0 && t.n > 0, t.n === 0 ? 'nothing was looked at' : `${t.bad} broke it, the first: ${t.first}`); }

/* A bundle of another tree (section 1's base): the fleet's bundle reads this tree only. Packages resolve from this
   tree's node_modules, since a worktree made on a runner has none of its own. */
async function bundleAt(root, entry, tag) {
  const out = path.join(os.tmpdir(), `nfl-stats-${tag}-${process.pid}-${Date.now()}.mjs`);
  await build({
    stdin: { contents: entry.join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: root, logLevel: 'error',
    alias: { '@': './src' }, jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')],
  });
  const M = await import(pathToFileURL(out).href);
  try { fs.unlinkSync(out); } catch { /* the temp file is only a copy */ }
  return M;
}

const STORY_ENTRY = [
  "export * as day from './src/lib/gmGameDay.ts';",
  "export { NFL_GAME_DAY } from './src/lib/gameLaws/nflGameDay.ts';",
];
const HEAD_ENTRY = [
  ...ENGINE_ENTRY,
  ...STORY_ENTRY,
  "export * as bind from './src/lib/frontOfficeGameDay.ts';",
];

const t0 = Date.now();
let M;
let fired;
let B = null;
try {
  ({ M, fired } = await bundle(HEAD_ENTRY, PATCHES, 'head'));
  if (SECTIONS.includes(1) && LIFT_BASE) {
    if (!fs.existsSync(path.join(LIFT_BASE, DRIVES)) && !fs.existsSync(path.join(LIFT_BASE, 'src/lib/gameLaws/nfl.ts'))) throw new Error(`LIFT_BASE ${LIFT_BASE} holds no NFL story law`);
    B = await bundleAt(LIFT_BASE, STORY_ENTRY, 'base');
  }
} catch (e) {
  console.error(`could not bundle: ${e.message}`);
  process.exit(2);
}
if (CONTROL && fired.size !== PATCHES.length) { console.error(`control ${CONTROL}: ${fired.size} of ${PATCHES.length} patches applied`); process.exit(2); }
console.log(`bundled in ${Date.now() - t0} ms${CONTROL ? ` (control ${CONTROL})` : ''}`);

/* ─── The fleet, played the board's way: every told final of a season, regular season and playoffs ─── */
function toldSeason(set, kind, i) {
  const out = [];
  const season = playRegularSeason(M, set, kind, i, (done, _p, week, lg) => {
    const t = M.bind.nflTell(done, lg.teams, lg.season, M.bind.nflWhere(week));
    if (t.last) out.push(t.last);
  });
  enginePostseason(M, season, (g, round) => {
    const t = M.bind.nflTell(g, season.lg.teams, season.lg.season, round);
    if (t.last) out.push(t.last);
  });
  return { season, told: out };
}

/* ─── 1. LIFT: every told final tells the same story on this tree as on the base ─── */
let liftNote = '';
if (SECTIONS.includes(1)) {
  console.log('');
  console.log('1. LIFT');
  if (!B) {
    liftNote = 'section 1 skipped: LIFT_BASE is not set';
    console.log(`  ${liftNote}`);
  } else {
    for (const set of SEEDSETS) {
      const t = tally();
      let told = 0;
      let stories = 0;
      const lines = [];
      for (const kind of FLEET.kinds) {
        for (let i = 0; i < FLEET.perKind; i += 1) {
          for (const g of toldSeason(set, kind, i).told) {
            told += 1;
            for (const view of ['home', 'away']) {
              const head = JSON.stringify(M.day.gameStory(M.NFL_GAME_DAY, g, view));
              const base = JSON.stringify(B.day.gameStory(B.NFL_GAME_DAY, g, view));
              if (head !== 'null') stories += 1;
              lines.push(head);
              count(t, head === base, () => `${g.key} from the ${view} side`);
            }
          }
        }
      }
      const want = FLEET.kinds.length * FLEET.perKind * (272 + 13);
      check(1, `set ${set}: the fleet told ${told} finals, every game of every season (want ${want})`, told === want);
      check(1, `set ${set}: ${stories} of ${told * 2} tellings are a story, not the final alone`, stories > told * 2 * 0.99);
      settle(1, `set ${set}: every told final tells the same story on this tree as on the base`, t);
      console.log(`  set ${set}: receipt ${sha1(lines.join('\n'))}`);
    }
  }
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
const tail = `${liftNote ? `; ${liftNote}` : ''}`;
console.log('');
console.log(`ran in ${((Date.now() - t0) / 1000).toFixed(1)} s, seed sets ${SEEDSETS.join(', ')}, sections ${SECTIONS.join(', ')}`);
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const mine = failsBy.get(String(c.section)) ?? [];
  const named = c.labels.filter(l => mine.some(x => x.includes(l)));
  const setsRed = c.everySet ? SEEDSETS.filter(s => c.labels.every(l => mine.some(x => x.includes(l) && x.startsWith(`set ${s}:`)))) : SEEDSETS;
  const bled = [...failsBy.keys()].filter(k => k !== String(c.section) && !(c.elsewhere ?? []).includes(Number(k)));
  const ok = named.length === c.labels.length && setsRed.length === SEEDSETS.length && bled.length === 0;
  console.log(ok
    ? `control ${CONTROL}: FIRED at section ${c.section} (${named.length} of ${c.labels.length} named checks red on ${setsRed.length} of ${SEEDSETS.length} sets)`
    : `control ${CONTROL}: DID NOT FIRE as aimed (${named.length} of ${c.labels.length} named checks, red on ${setsRed.length} of ${SEEDSETS.length} sets, other sections red: ${bled.join(', ') || 'none'})`);
  console.log(`simNflSeasonStats: ${checks} checks, ${failed} failed (control ${CONTROL})${tail}`);
  process.exit(ok ? 1 : 3);
}
console.log(`simNflSeasonStats: ${checks} checks, ${failed} failed${tail}`);
process.exit(failed ? 1 : 0);
