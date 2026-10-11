/* recordCareerHallSaves1301.mjs, Round 1301: careers as the code BEFORE
   calibration 3 retired them, recorded on the tree it is run in.

   Calibration 3 measured the NHL standout marks again (the 84 game season).
   A career already retired keeps the calibration stamped on its save and the
   ballot it was told. To hold that, this script was run once in a checkout of
   origin/main (Release AT, 82 game seasons) and once in a checkout of Round
   1226's head (84 game seasons, still calibration 2), each time from the
   tree's own root, and it wrote what THAT tree's code says:
     cd <old tree> && node <path to this file> <tag> <commit> <out file>
   The two outputs, joined, are src/test/fixtures/careerHallSaves1301.json,
   which src/test/careerHallSaves1301.test.ts holds every later tree to.
   Running it on a later tree records that tree, which proves nothing about
   the old one: the fixture is never recorded again.

   WHAT IT RECORDS, per sport, chosen by rule and never by eye, from careers
   played on the harness's own engine loop (start, the season, progress, a
   random answer to the event card, a banned year pushed as a line, the hard
   stop) on a seeded stream, each retired career stamped by the tree's own
   stampHallCalibration (2 on both trees):
     byPush    in the Hall only because of the standout push (the score less
               the push is under the Hall line): the careers a moved mark
               could take out.
     hofPlain  in the Hall with no push.
     nearPush  outside the Hall with a push paid.
     missed    outside the Hall with no push, at 60 percent of the line or more.
     open      NOT retired: the same career cut after eleven seasons, unstamped,
               for a career that ended with a push. It is judged when it
               retires, on the calibration of that day.
   The first careers of each kind in play order, up to the quota (the NHL's
   are larger: its marks are the ones that moved). For each: the whole save
   (JSON), the sport's legacyOf whole and hallRecordFor whole, read off the
   parsed JSON. It reads nothing off the network. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const [TAG, COMMIT, OUTFILE] = process.argv.slice(2);
if (!TAG || !COMMIT || !OUTFILE) { console.error('usage: node recordCareerHallSaves1301.mjs <tag> <commit> <out file>   (run from the root of the tree to record)'); process.exit(2); }
const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
const QUOTA = { nhl: { byPush: 8, hofPlain: 3, nearPush: 3, missed: 2, open: 4 }, '*': { byPush: 1, hofPlain: 1, nearPush: 0, missed: 1, open: 1 } };
const CAREERS = 600, OPEN_AT = 11;
const clone = x => JSON.parse(JSON.stringify(x));
const out = { tag: TAG, commit: COMMIT, careersPlayed: CAREERS, openAt: OPEN_AT, sports: {}, counts: {} };
let n = 0;
for (const [sport, E] of Object.entries(ENGINES)) {
  n += 1;
  const file = path.join(os.tmpdir(), `hall-saves-1301-${sport}-${process.pid}.mjs`);
  const entry = [
    `export { ${E.legacy} as LEGACY, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
    `export { ${E.hall} as HALL } from './src/lib/${sport}CareerHall.ts';`,
    `export { hallRecordFor, stampHallCalibration, HALL_CALIBRATION } from './src/lib/careerHallOfFame.ts';`,
  ].join('\n');
  await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: file, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic', banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" } });
  const store = new Map();
  globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
  const eng = await import(pathToFileURL(file).href);
  try { unlinkSync(file); } catch { /* only a copy */ }
  let seed = 1301000 + n;
  Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const line = eng.HALL.lines.hofLine, quota = QUOTA[sport] ?? QUOTA['*'];
  const kept = [], have = { byPush: 0, hofPlain: 0, nearPush: 0, missed: 0, open: 0 }, seen = { ...have };
  for (let i = 0; i < CAREERS; i += 1) {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Hall ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null, guard = 0, cut = null;
    while (!c.retired && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ...(E.banned ?? {}), awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else { tq = eng.roll(tq, Math.random); eng.season(c, tq, Math.random); }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
      if (!c.retired && c.seasons.length === OPEN_AT) cut = clone(c);
    }
    c.retired = true;
    eng.stampHallCalibration(c);
    const save = clone(c);
    const legacy = eng.LEGACY(save);
    const push = legacy.standout ? Math.round(legacy.standout.credit) : 0;
    const kind = legacy.hof ? (push > 0 && legacy.score - push < line ? 'byPush' : push === 0 ? 'hofPlain' : null) : (push > 0 ? 'nearPush' : legacy.score >= 0.6 * line ? 'missed' : null);
    if (kind) { seen[kind] += 1; if (have[kind] < quota[kind]) { have[kind] += 1; kept.push({ id: `${TAG}:${sport}:${i}`, kind, save, legacy: clone(legacy), hall: clone(eng.hallRecordFor(eng.HALL, save)) }); } }
    if (cut && push > 0) {
      seen.open += 1;
      if (have.open < quota.open) {
        have.open += 1;
        const then = clone(cut); then.retired = true; eng.stampHallCalibration(then);
        kept.push({ id: `${TAG}:${sport}:${i}:open`, kind: 'open', save: cut, toldIfRetiredThen: clone(eng.LEGACY(then)) });
      }
    }
  }
  out.sports[sport] = kept;
  out.counts[sport] = { calibration: eng.HALL_CALIBRATION, hofLine: line, kept: have, seen };
  console.log(`${TAG} ${sport}: calibration ${eng.HALL_CALIBRATION}, kept ${JSON.stringify(have)} of seen ${JSON.stringify(seen)} in ${CAREERS} careers`);
}
writeFileSync(OUTFILE, `${JSON.stringify(out)}\n`);
console.log(`recordCareerHallSaves1301: wrote ${OUTFILE} (${TAG}, ${COMMIT})`);
