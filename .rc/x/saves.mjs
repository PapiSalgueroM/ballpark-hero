/* Review of Round 1301 (runner only, never committed): a FLEET of saves made by one tree and read by another.
   record:  cd <old tree> && node saves.mjs record <tag> <out dir> <careers>
   check:   cd <new tree> && node saves.mjs check <dir> <tag that must replay byte for byte, or none>
   record plays <careers> careers a sport on the harness's own loop and writes, for each: the retired save as
   the old tree stamped it with what the old tree told it (legacy whole, Hall record whole); every fifth, the
   same save with no stamp (a career retired before the stamp existed); every fourth, the career as it stood
   before its last season with what the old tree would have told it had it retired then.
   check loads each save the way the board does (repairNetWorth, repairSummerOnLoad, repairHallOnLoad) and
   compares. It reads nothing off the network. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const [MODE, A1, A2, A3] = process.argv.slice(2);
const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', binding: 'NFL_CAREER_SPORT', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', binding: 'NBA_CAREER_SPORT', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', binding: 'MLB_CAREER_SPORT', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', binding: 'NHL_CAREER_SPORT', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
const clone = x => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };

async function engine(sport, withLoad) {
  const E = ENGINES[sport];
  const file = path.join(os.tmpdir(), `review-saves-${sport}-${process.pid}-${withLoad ? 'c' : 'r'}.mjs`);
  const entry = [
    `export { ${E.legacy} as LEGACY, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
    `export { ${E.hall} as HALL } from './src/lib/${sport}CareerHall.ts';`,
    `export { hallRecordFor, stampHallCalibration, hallCalibrationOf, HALL_CALIBRATION } from './src/lib/careerHallOfFame.ts';`,
    ...(withLoad ? [
      `export { ${E.binding} as SPORTB } from './src/lib/${sport}CareerSport.ts';`,
      `export { repairSummerOnLoad } from './src/lib/usCareerSummer.ts';`,
      `export { repairHallOnLoad } from './src/lib/usCareerRetirementFlow.ts';`,
    ] : []),
  ].join('\n');
  await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: file, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic', banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" } });
  const eng = await import(pathToFileURL(file).href);
  try { unlinkSync(file); } catch { /* only a copy */ }
  return eng;
}
const stream = n => { let seed = n >>> 0; return () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* The careers of one sport on the tree this runs in: the same loop and the same stream in both modes. */
function play(sport, eng, careers) {
  const E = ENGINES[sport];
  Math.random = stream(7301000 + Object.keys(ENGINES).indexOf(sport));
  const out = [];
  for (let i = 0; i < careers; i += 1) {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Fleet ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null, guard = 0, cut = null;
    while (!c.retired && guard++ < 30) {
      if (c.seasons.length > 0) cut = clone(c);
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ...(E.banned ?? {}), awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else { tq = eng.roll(tq, Math.random); eng.season(c, tq, Math.random); }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
    }
    c.retired = true;
    eng.stampHallCalibration(c);
    out.push({ i, save: clone(c), cut });
  }
  return out;
}

if (MODE === 'record') {
  const [TAG, DIR, N] = [A1, A2, Number(A3 || 600)];
  mkdirSync(DIR, { recursive: true });
  for (const sport of Object.keys(ENGINES)) {
    const eng = await engine(sport, false);
    const rows = play(sport, eng, N).map(({ i, save, cut }) => {
      const row = { i, save, legacy: clone(eng.LEGACY(save)), hall: clone(eng.hallRecordFor(eng.HALL, save)) };
      if (i % 5 === 0) { const bare = clone(save); delete bare.hallCal; row.bare = { legacy: clone(eng.LEGACY(bare)), hall: clone(eng.hallRecordFor(eng.HALL, bare)) }; }
      if (i % 4 === 0 && cut) { const then = clone(cut); then.retired = true; eng.stampHallCalibration(then); row.open = { save: cut, told: clone(eng.LEGACY(then)) }; }
      return row;
    });
    writeFileSync(path.join(DIR, `${TAG}-${sport}.json`), JSON.stringify({ tag: TAG, sport, calibration: eng.HALL_CALIBRATION, rows }));
    const hof = rows.filter(r => r.legacy.hof).length, push = rows.filter(r => r.legacy.standout).length;
    console.log(`record ${TAG} ${sport}: ${rows.length} careers, calibration ${eng.HALL_CALIBRATION}, ${hof} in the Hall, ${push} with a standout paid, ${rows.filter(r => r.bare).length} also unstamped, ${rows.filter(r => r.open).length} also open`);
  }
  console.log(`saves record: done (${TAG})`);
  process.exit(0);
}

if (MODE !== 'check') { console.error('usage: node saves.mjs record <tag> <out dir> <careers> | check <dir> <replay tag or none>'); process.exit(2); }
const DIR = A1, REPLAY_TAG = A2 || 'none';
const TAGS = ['main', 'r1226'];
let broken = 0, read = 0;
const summary = [];
for (const sport of Object.keys(ENGINES)) {
  const eng = await engine(sport, true);
  /* The board's own load, in its order (UsCareerBoard.tsx, the effect that reads the save). */
  const load = raw => { const s = clone(raw); const loaded = eng.SPORTB.repairNetWorth(s); eng.repairSummerOnLoad(loaded); eng.repairHallOnLoad(loaded); return loaded; };
  let mine = null;
  for (const tag of TAGS) {
    const f = path.join(DIR, `${tag}-${sport}.json`);
    if (!existsSync(f)) { console.log(`check ${tag} ${sport}: NO RECORDING (${f})`); broken += 1; continue; }
    const rec = JSON.parse(readFileSync(f, 'utf8'));
    const T = { n: 0, hofTold: 0, calMiss: 0, legacyMiss: 0, verdictFlip: 0, hallMiss: 0, hallMissBeyondWeighs: 0, loadRewrote: 0, bareN: 0, bareMiss: 0, openN: 0, openSame: 0, openLower: 0, openHigher: 0, openOther: 0, openOut: 0, openIn: 0, openStampMiss: 0, wouldLower: 0, wouldHigher: 0, wouldOut: 0, wouldIn: 0, replayMiss: null };
    const first = [];
    const note = s => { if (first.length < 4) first.push(s); };
    for (const r of rec.rows) {
      T.n += 1; read += 1;
      if (r.legacy.hof) T.hofTold += 1;
      const loaded = load(r.save);
      if (!same(loaded, r.save)) { T.loadRewrote += 1; note(`#${r.i} the load rewrote the save`); }
      if (eng.hallCalibrationOf(loaded) !== rec.calibration) T.calMiss += 1;
      const legacy = clone(eng.LEGACY(loaded)), hall = clone(eng.hallRecordFor(eng.HALL, loaded));
      if (!same(legacy, r.legacy)) { T.legacyMiss += 1; note(`#${r.i} ${r.save.pos} legacy told ${r.legacy.score}, reads ${legacy.score}`); }
      if (legacy.hof !== r.legacy.hof) T.verdictFlip += 1;
      if (!same(hall, r.hall)) {
        T.hallMiss += 1;
        const { weighs: a, ...x } = hall; const { weighs: b, ...y } = r.hall;
        if (!same(x, y)) { T.hallMissBeyondWeighs += 1; note(`#${r.i} Hall record differs beyond the sentence`); } else note(`#${r.i} sentence told "${b}", reads "${a}"`);
      }
      /* Teeth: the same save read on today's calibration instead of its stamp. */
      const forced = clone(r.save); forced.hallCal = eng.HALL_CALIBRATION;
      const on = eng.LEGACY(forced);
      if (on.score < r.legacy.score) T.wouldLower += 1;
      if (on.score > r.legacy.score) T.wouldHigher += 1;
      if (r.legacy.hof && !on.hof) T.wouldOut += 1;
      if (!r.legacy.hof && on.hof) T.wouldIn += 1;
      if (r.bare) {
        T.bareN += 1;
        const b = clone(r.save); delete b.hallCal;
        const lb = load(b);
        if (eng.hallCalibrationOf(lb) !== 1 || 'hallCal' in lb || !same(clone(eng.LEGACY(lb)), r.bare.legacy) || !same(clone(eng.hallRecordFor(eng.HALL, lb)), r.bare.hall)) { T.bareMiss += 1; note(`#${r.i} unstamped retired save reads differently`); }
      }
      if (r.open) {
        T.openN += 1;
        const live = load(r.open.save);
        if (eng.hallCalibrationOf(live) !== eng.HALL_CALIBRATION) T.openStampMiss += 1;
        live.retired = true; eng.stampHallCalibration(live);
        if (live.hallCal !== eng.HALL_CALIBRATION) T.openStampMiss += 1;
        const now = clone(eng.LEGACY(live));
        if (same(now, r.open.told)) T.openSame += 1; else if (now.score < r.open.told.score) T.openLower += 1; else if (now.score > r.open.told.score) T.openHigher += 1; else T.openOther += 1;
        if (r.open.told.hof && !now.hof) T.openOut += 1;
        if (!r.open.told.hof && now.hof) T.openIn += 1;
      }
    }
    if (tag === REPLAY_TAG) {
      mine ??= play(sport, eng, rec.rows.length);
      T.replayMiss = 0;
      for (const r of rec.rows) { const a = clone(mine[r.i].save), b = clone(r.save); delete a.hallCal; delete b.hallCal; if (!same(a, b)) T.replayMiss += 1; }
    }
    const must = T.calMiss === 0 && T.legacyMiss === 0 && T.verdictFlip === 0 && T.hallMiss === 0 && T.loadRewrote === 0 && T.bareMiss === 0 && T.openStampMiss === 0
      && (sport === 'nhl' || (T.openSame === T.openN && T.wouldLower + T.wouldHigher === 0))
      && (T.replayMiss === null || T.replayMiss === 0);
    if (!must) broken += 1;
    summary.push({ tag, sport, calibrationOfRecording: rec.calibration, today: eng.HALL_CALIBRATION, ...T, first });
    console.log(`check ${tag} ${sport} (${must ? 'ok' : 'BROKEN'}): ${T.n} retired saves stamped ${rec.calibration} (${T.hofTold} told Hall): ${T.calMiss} read on another calibration, ${T.legacyMiss} legacies differ, ${T.verdictFlip} verdicts flipped, ${T.hallMiss} Hall records differ (${T.hallMissBeyondWeighs} beyond the sentence), ${T.loadRewrote} rewritten by the load; unstamped ${T.bareMiss} of ${T.bareN} differ; open ${T.openN}: ${T.openSame} told the same on ${eng.HALL_CALIBRATION}, ${T.openLower} lower, ${T.openHigher} higher, ${T.openOther} other, ${T.openOut} fall out, ${T.openIn} come in, ${T.openStampMiss} stamp misses; read on ${eng.HALL_CALIBRATION} instead of the stamp: ${T.wouldLower} lower, ${T.wouldHigher} higher, ${T.wouldOut} out, ${T.wouldIn} in${T.replayMiss === null ? '' : `; replayed on this tree: ${T.replayMiss} careers differ apart from the stamp`}${first.length ? `; first [${first.join(' | ')}]` : ''}`);
  }
}
if (process.env.RC_OUT) writeFileSync(path.join(process.env.RC_OUT, 'saves-summary.json'), JSON.stringify(summary, null, 1));
console.log(`saves check: ${read} saves read, ${broken ? `${broken} sets BROKEN` : 'every set holds'}`);
process.exit(broken ? 1 : 0);
