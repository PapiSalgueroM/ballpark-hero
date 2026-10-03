/* simCareerHall.mjs, Round 915: the retirement talk and the Hall of Fame on
   careers the four US engines really play.

   Run: node scripts/simCareerHall.mjs <nfl|nba|mlb|nhl> [careers, default 2000]
        SIM_CONTROL=<name> runs one negative control (the list is CONTROLS below).
   With no sport (how runAllSims calls it) it runs all four, one child each,
   and exits with the worst code; give a sport to keep a run short.

   WHAT IT HOLDS, per sport, each with a control that must turn it red:
     1. iff        inducted if and only if the sport's own legacyOf says hof.
                   Control everyonein.
     2. table      the data file's rules equal the audit table in
                   docs/audits/US-HALL-RULES-2026-10.md, and every career's
                   first class is its last season plus that table's offset.
                   Control waitoff.
     3. rises      the first ballot share rises with the score. Measured two
                   ways: on the real careers (the top third of the Hall of
                   Famers by score against the bottom third), and on a ladder
                   of synthetic candidates walked step by step up the Hall
                   band. Control flatfirst.
     4. promise    a score at the verdict's first ballot line always goes in
                   first ballot. Control nopromise.
     5. keyed      no Math.random draw while the Hall record and the speech
                   are made, and the same career gives the same record twice.
                   Control mathrandom.
     6. sides      every elected share is at or over the threshold, every
                   other share under it, no more ballots than the Hall allows,
                   and an early fall off is under the floor. Control sharesides.
     7. talk       the retirement talk comes exactly when an independent
                   reading of the rule says, and reaches a real share of
                   careers before the hard stop. Control notalk.
     8. jersey     the jersey goes to the club with the most seasons (ties to
                   games, then the first club). Control jerseyfirst.

   BANDS, from measured headroom. Measured 2026-10-03 at 2000 careers a sport,
   the default seed plus SIM_SEED 1 to 5 (six runs a sport):
     rises, real careers: first ballot share of the top third of Hall of
       Famers by score minus the bottom third, in points. Lowest of six:
       nfl 55.2, nba 36.6, mlb 55.7, nhl 55.1. Band: at least 20.
     rises, ladder: ten steps up the Hall band, 4000 synthetic candidates a
       step, every step must rise. The expected step is 0.07; the smallest
       step of all 24 seeded runs was 0.036 (nhl). Band: every step over 0.015.
     talk reach: share of careers asked at least once before the hard stop.
       Lowest of six: nfl 86.9, nba 100, mlb 99.9, nhl 97.4. Band: at least 70.
     iff: inducted is 22 to 24 percent (nfl), 30 to 34 (nba), 40 to 42 (mlb),
       30 to 33 (nhl) of these careers. Band: at least 5 percent, so the
       check can never pass on an empty Hall.
   Everything else is exact: zero misses, every run, every seed.
   These careers pick event answers at random and never change teams by
   choice, so the shares are this loop's, not the game's; the checks are about
   the Hall reading the verdict right, which holds for any career. */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const SPORT = process.argv[2];
const CAREERS = Number(process.argv[3] || 2000);
const CONTROL = process.env.SIM_CONTROL || '';

const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
if (!SPORT) {
  // runAllSims calls every harness with no arguments: run the four sports, one child each.
  let worst = 0;
  for (const s of Object.keys(ENGINES)) {
    const r = spawnSync(process.execPath, [SELF, s, String(CAREERS)], { stdio: 'inherit', env: process.env, cwd: ROOT });
    worst = Math.max(worst, r.status ?? 1);
  }
  console.log(`simCareerHall: ${worst ? 'RED' : 'all four sports green'}`);
  process.exit(worst);
}
const E = ENGINES[SPORT];
if (!E) { console.error(`usage: node scripts/simCareerHall.mjs <${Object.keys(ENGINES).join('|')}> [careers]`); process.exit(2); }

/* Each control rewrites one string in one source file as it is bundled. The
   string must be there, or the control refuses to run: a control that
   changes nothing would leave the harness green for the wrong reason. */
const CONTROLS = {
  everyonein: { file: 'careerHallOfFame.ts', from: 'if (cand.hof) {', to: 'if (true) {' },
  waitoff: { file: `${SPORT}CareerHall.ts`, re: /firstClassOffset: (\d+),/, to: (m, n) => `firstClassOffset: ${Number(n) + 1},` },
  flatfirst: { file: 'careerHallOfFame.ts', from: 'return f + (1 - f) * bandFraction(score, lines);', to: 'return f;' },
  nopromise: { file: 'careerHallOfFame.ts', from: 'if (score >= lines.firstBallotScore) return 1;', to: 'if (score >= lines.firstBallotScore) return 0.5;' },
  mathrandom: { file: 'careerHallOfFame.ts', from: 'const rng = keyedRng(`hall:${rules.sport}:${cand.key}`);', to: 'const rng = Math.random;' },
  sharesides: { file: 'careerHallOfFame.ts', from: 'const final = Math.min(99.7, t + ', to: 'const final = Math.min(99.7, t - 20 + ' },
  notalk: { file: 'careerRetirement.ts', from: 'if (drop >= rule.dropFromPeak) return', to: 'if (false) return' },
  jerseyfirst: { file: 'careerHallOfFame.ts', from: 't.seasons > best.seasons ||', to: 't.seasons < best.seasons ||' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown SIM_CONTROL ${CONTROL}`); process.exit(2); }
let controlFired = false;
const controlPlugin = {
  name: 'control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: /\.ts$/ }, args => {
      if (path.basename(args.path) !== ctl.file) return undefined;
      const src = readFileSync(args.path, 'utf8');
      const hit = ctl.re ? ctl.re.test(src) : src.includes(ctl.from);
      if (!hit) throw new Error(`control ${CONTROL}: its string is not in ${ctl.file}, refusing to run`);
      controlFired = true;
      return { contents: ctl.re ? src.replace(ctl.re, ctl.to) : src.replace(ctl.from, ctl.to), loader: 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `career-hall-${SPORT}-${CONTROL || 'base'}-${process.pid}.mjs`);
const entry = [
  `export { ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
  `export { ${E.hall} as HALL } from './src/lib/${SPORT}CareerHall.ts';`,
  `export { hallRecordFor, runHallBallot, giveHallSpeech, HALL_SPEECHES } from './src/lib/careerHallOfFame.ts';`,
  `export { retirementTalk } from './src/lib/careerRetirement.ts';`,
].join('\n');
await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin],
});
const eng = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (CONTROL && !controlFired) { console.error(`control ${CONTROL} never reached its file, refusing to report`); process.exit(2); }
const { HALL } = eng;

/* Math.random draws are counted only while the Hall record and the speech are made. */
const seeded = Math.random;
let counting = false, hallDraws = 0;
Math.random = () => { if (counting) hallDraws += 1; return seeded(); };

const rule = HALL.retirement;
const careers = [];
let crashes = 0, talkMismatch = 0, talkBeforeAge = 0;
for (let i = 0; i < CAREERS; i += 1) {
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Hall ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null, talks = 0, firstTalkAge = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ...(E.banned ?? {}), awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        tq = eng.roll(tq, Math.random);
        eng.season(c, tq, Math.random);
      }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
      // The talk, read after the offseason, exactly where a board would ask it.
      const snap = HALL.snapshot(c);
      const talk = eng.retirementTalk(rule, snap, undefined);
      // An independent reading of the rule, from the save itself.
      const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
      const expect = !eng.stop(c) && c.age >= rule.minAge && (peak - c.ovr >= rule.dropFromPeak || c.ovr <= rule.floor);
      if (Boolean(talk) !== expect) talkMismatch += 1;
      if (talk && c.age < rule.minAge) talkBeforeAge += 1;
      if (talk) { talks += 1; if (firstTalkAge === null) firstTalkAge = c.age; }
    }
    const legacy = HALL.legacy(c);
    counting = true;
    const rec = eng.hallRecordFor(HALL, c);
    const again = eng.hallRecordFor(HALL, c);
    let speech = null;
    if (rec.outcome === 'inducted') speech = eng.giveHallSpeech(undefined, rec, HALL.key(c), eng.HALL_SPEECHES[i % eng.HALL_SPEECHES.length].id);
    counting = false;
    careers.push({
      score: legacy.score, hof: legacy.hof, rec, same: JSON.stringify(rec) === JSON.stringify(again),
      last: HALL.lastSeasonYear(c), seasons: c.seasons.map(s => ({ team: s.team, games: s.games })),
      talks, firstTalkAge, speech, finalAge: c.age, seasonsPlayed: c.seasons.length,
    });
  } catch (err) {
    counting = false;
    crashes += 1;
    if (crashes <= 3) console.error(`career ${i} crashed:`, err && err.message);
  }
}

/* ─── Measure ─────────────────────────────────────────────────────────── */
const { rules, lines } = HALL;
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const share = (list, f) => (list.length ? list.filter(f).length / list.length : 0);
const inducted = careers.filter(c => c.rec.outcome === 'inducted').sort((a, b) => a.score - b.score);
const third = Math.floor(inducted.length / 3);
const fbLow = share(inducted.slice(0, third), c => c.rec.firstBallot);
const fbHigh = share(inducted.slice(inducted.length - third), c => c.rec.firstBallot);

// The audit table, read from the file the data files cite.
const doc = readFileSync(path.join(ROOT, 'docs/audits/US-HALL-RULES-2026-10.md'), 'utf8');
const tableBlock = doc.split('<!-- hall-table:start -->')[1].split('<!-- hall-table:end -->')[0];
const row = tableBlock.split(String.fromCharCode(10)).find(l => l.startsWith(`| ${SPORT} |`));
const cells = row.split('|').map(s => s.trim()).filter(Boolean);
const num = v => (v === 'none' ? null : Number(v));
const table = { waitSeasons: num(cells[1]), ballotYears: num(cells[2]), threshold: num(cells[3]), stayFloor: num(cells[4]), firstClassOffset: num(cells[5]) };
const tableDiffs = Object.keys(table).filter(k => rules[k] !== table[k]);
const offsetMiss = careers.filter(c => c.rec.firstClass !== c.last + table.firstClassOffset).length;

// The ladder: synthetic Hall of Famers walked up the band, step by step.
const SEED = process.env.SIM_SEED || 'base';
const STEPS = 10, PER_STEP = 4000;
const ladder = [];
for (let k = 0; k < STEPS; k += 1) {
  const score = lines.hofLine + ((k + 0.5) / STEPS) * (lines.firstBallotScore - lines.hofLine);
  let fb = 0;
  for (let j = 0; j < PER_STEP; j += 1) {
    if (eng.runHallBallot(rules, lines, { key: `ladder:${SEED}:${k}:${j}`, hof: true, score, lastSeasonYear: 2030 }).firstBallot) fb += 1;
  }
  ladder.push(fb / PER_STEP);
}
const ladderSteps = ladder.slice(1).map((v, k) => v - ladder[k]);
let promiseMiss = 0, promiseN = 0;
for (let j = 0; j < 500; j += 1) {
  promiseN += 1;
  if (!eng.runHallBallot(rules, lines, { key: `top:${SEED}:${j}`, hof: true, score: lines.firstBallotScore + (j % 200), lastSeasonYear: 2030 }).firstBallot) promiseMiss += 1;
}
for (const c of careers) if (c.hof && c.score >= lines.firstBallotScore) { promiseN += 1; if (!c.rec.firstBallot) promiseMiss += 1; }

// Ballot sides.
let sideMiss = 0;
for (const c of careers) {
  const r = c.rec;
  if (rules.ballotYears !== null && r.ballots.length > rules.ballotYears) sideMiss += 1;
  r.ballots.forEach((b, j) => {
    if (b.elected ? b.share < rules.threshold : b.share >= rules.threshold) sideMiss += 1;
    if (b.classYear !== r.firstClass + j) sideMiss += 1;
  });
  const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
  if (early && !(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
}

// The jersey, read independently: most seasons, ties to games, then the first club.
const club = seasons => {
  const t = new Map();
  seasons.forEach((s, i) => { if (!s.team || !(s.games > 0)) return; const e = t.get(s.team) ?? { team: s.team, seasons: 0, games: 0, first: i }; e.seasons += 1; e.games += s.games; t.set(s.team, e); });
  return [...t.values()].sort((a, b) => b.seasons - a.seasons || b.games - a.games || a.first - b.first)[0] ?? null;
};
let jerseyMiss = 0, jerseys = 0;
for (const c of careers) {
  const best = club(c.seasons);
  const promised = lines.jerseyScore !== null && c.score >= lines.jerseyScore;
  const due = best && (promised || (c.rec.outcome === 'inducted' && best.seasons >= 5) || (best.seasons >= 12 && c.score >= lines.hofLine * 0.85));
  const want = due ? { team: best.team, seasons: best.seasons } : null;
  if (JSON.stringify(want) !== JSON.stringify(c.rec.jersey)) jerseyMiss += 1;
  if (c.rec.jersey) jerseys += 1;
}

const iffMiss = careers.filter(c => (c.rec.outcome === 'inducted') !== c.hof).length;
const notSame = careers.filter(c => !c.same).length;
const talked = share(careers, c => c.talks > 0);
const outcomes = {};
for (const c of careers) outcomes[c.rec.outcome] = (outcomes[c.rec.outcome] ?? 0) + 1;
const fbAll = share(inducted, c => c.rec.firstBallot);

console.log(`simCareerHall ${SPORT}: ${careers.length} careers, ${crashes} crashed, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
console.log(`  hof ${pct(inducted.length, careers.length)}% (${inducted.length}), first ballot ${pct(fbAll * 1000, 1000)}% of them; bottom third ${pct(fbLow * 1000, 1000)}%, top third ${pct(fbHigh * 1000, 1000)}%`);
console.log(`  outcomes ${JSON.stringify(outcomes)}; jerseys ${jerseys}; talk reached ${pct(talked * 1000, 1000)}% of careers`);
console.log(`  ladder ${ladder.map(v => v.toFixed(3)).join(' ')}; smallest step ${Math.min(...ladderSteps).toFixed(3)}`);
console.log(`  misses: iff ${iffMiss}, table [${tableDiffs.join(',')}], offset ${offsetMiss}, promise ${promiseMiss}/${promiseN}, draws ${hallDraws}, notSame ${notSame}, sides ${sideMiss}, talk ${talkMismatch}+${talkBeforeAge}, jersey ${jerseyMiss}`);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`  talk timing: talks a career, median ${med(careers.map(c => c.talks))}; first talk at ${med(careers.filter(c => c.firstTalkAge !== null).map(c => c.firstTalkAge))}; career ends at ${med(careers.map(c => c.finalAge))}; non finite scores ${careers.filter(c => !Number.isFinite(c.score)).length}`);

/* ─── Check ───────────────────────────────────────────────────────────── */
const BAND = { minInducted: 0.05, riseGap: 0.20, ladderStep: 0.015, talkReach: 0.70 };
const checks = [
  ['crashes', crashes === 0 && careers.length === CAREERS, `${crashes} crashed of ${CAREERS}`],
  ['iff', iffMiss === 0 && inducted.length >= BAND.minInducted * careers.length, `${iffMiss} disagree with legacyOf, ${inducted.length} inducted`],
  ['table', tableDiffs.length === 0 && offsetMiss === 0, `rules off the audit table: [${tableDiffs.join(',')}], ${offsetMiss} careers on the wrong first class`],
  ['rises', fbHigh - fbLow >= BAND.riseGap && Math.min(...ladderSteps) > BAND.ladderStep, `top third minus bottom third ${(100 * (fbHigh - fbLow)).toFixed(1)} points (needs ${100 * BAND.riseGap}), smallest ladder step ${Math.min(...ladderSteps).toFixed(3)} (needs over ${BAND.ladderStep})`],
  ['promise', promiseMiss === 0 && promiseN >= 500, `${promiseMiss} of ${promiseN} promised first ballots missed`],
  ['keyed', hallDraws === 0 && notSame === 0, `${hallDraws} Math.random draws, ${notSame} records that changed on a second run`],
  ['sides', sideMiss === 0, `${sideMiss} ballots on the wrong side of a rule`],
  ['talk', talkMismatch === 0 && talkBeforeAge === 0 && talked >= BAND.talkReach, `${talkMismatch} talks off the rule, ${talkBeforeAge} before the age, reached ${(100 * talked).toFixed(1)} percent (needs ${100 * BAND.talkReach})`],
  ['jersey', jerseyMiss === 0 && jerseys > 0, `${jerseyMiss} jerseys off the rule, ${jerseys} retired`],
];
for (const [name, ok, detail] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
const red = checks.filter(c => !c[1]).map(c => c[0]);
if (CONTROL) {
  const WANT = { everyonein: 'iff', waitoff: 'table', flatfirst: 'rises', nopromise: 'promise', mathrandom: 'keyed', sharesides: 'sides', notalk: 'talk', jerseyfirst: 'jersey' }[CONTROL];
  console.log(`simCareerHall ${SPORT} CONTROL ${CONTROL}: wanted ${WANT} red, red [${red.join(',')}], ${red.includes(WANT) ? 'FIRED' : 'DID NOT FIRE'}`);
  process.exit(red.length ? 1 : 0);
}
console.log(`simCareerHall ${SPORT}: ${red.length ? `RED [${red.join(',')}]` : `all ${checks.length} checks green`}`);
process.exit(red.length ? 1 : 0);
