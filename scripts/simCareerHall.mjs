/* simCareerHall.mjs, Round 915: the retirement talk and the Hall of Fame on
   careers the four US engines really play.

   Run: node scripts/simCareerHall.mjs <nfl|nba|mlb|nhl> [careers, default 2000]
        SIM_CONTROL=<name> runs one negative control (the list is CONTROLS below).
   With no sport (how runAllSims calls it) it runs all four, one child each,
   and exits with the worst code; give a sport to keep a run short.

   WHAT IT HOLDS, per sport, each with a control that must turn it red:
     1. iff        inducted if and only if the sport's own legacyOf says hof,
                   read straight from the engine (exported by the bundle
                   entry), never through the Hall binding, and the record's
                   score is that legacyOf score. Controls everyonein (the
                   ballot) and bindhof (the binding).
     1b. outcome   every career outside the Hall: off the ballot exactly under
                   half the Hall line; on it, a Hall with a ballot limit drops
                   him (early only under the stay floor, and no earlier ballot
                   under it), one without a limit keeps him waiting. Where the
                   Hall has a stay floor, a real share falls off early.
                   Controls outcomeswap, nominationgone, oldcurve (mlb only).
     2. table      the data file's rules equal the audit table in
                   docs/audits/US-HALL-RULES-2026-10.md, and every career's
                   first class is its last season, read off the save, plus
                   that table's offset. Control waitoff.
     3. rises      the first ballot share rises with the score. Measured two
                   ways: on the real careers, at every one of the nine cuts
                   between score deciles of the Hall of Famers (all deciles
                   above the cut against all below), and on a ladder of
                   synthetic candidates walked step by step up the Hall band.
                   Control flatfirst.
     4. promise    a score at the verdict's first ballot line always goes in
                   first ballot. Control nopromise.
     5. keyed      no Math.random draw while the Hall record and the speech
                   are made, and the same career gives the same record twice.
                   Control mathrandom.
     6. sides      every elected share is at or over the threshold, every
                   other share under it, no more ballots than the Hall allows,
                   and an early fall off is under the floor. Controls
                   sharesides, and shownraw (mlb only: the fall off reads the
                   raw share, not the one the card prints).
     7. talk       the retirement talk comes exactly when an independent
                   reading of the rule says, and reaches a real share of
                   careers before the hard stop. Control notalk.
     7b. answers   the loop answers the talk as a board would: a quarter of
                   the careers never answer, a quarter play one more year
                   every time, a quarter retire at the first talk, a quarter
                   announce a farewell. Retire now ends the career on that
                   season, one more year plays the next, a farewell plays
                   exactly one more season marked as the farewell. The talk
                   check reads the answers too. Controls farewelloff, retireoff.
     8. jersey     the jersey goes to the club with the most seasons (ties to
                   games, then the first club), named by the engine's own
                   club label, never a bare id. Controls jerseyfirst, jerseyraw.

   A control run exits 1 only when the check it targets is red (FIRED), and 0
   when it is not (DID NOT FIRE), whatever else went red.

   BANDS, from measured headroom. Measured 2026-10-03 at 2000 careers a sport,
   the default seed plus SIM_SEED 1 to 5 (six runs a sport), on the tree with
   the answers loop (a quarter of careers retire at the first talk):
     rises, real careers: at each of the nine decile cuts, the first ballot
       share above the cut minus below it. Smallest cut of six runs:
       nfl 0.312, nba 0.142, mlb 0.298, nhl 0.341. Band: every cut at least
       0.06. (A single decile against its neighbour is too small a sample:
       mlb's second decile came out under its first in one run.)
     outcome, early fall off where the Hall has a stay floor (mlb): early
       fall offs over careers on the ballot outside the Hall, 28.1 to 31.5
       percent in six runs (2 in 1053 before the review's curve change).
       Band: at least 10 percent.
     sides, the floor sweep (mlb): synthetic ballots shown at exactly the
       floor, 345 to 379 in six runs (under shownraw 178 of them miss).
       Band: at least 100, so the 4.96 shown as 5.0 guard is really exercised.
     rises, ladder: ten steps up the Hall band, 4000 synthetic candidates a
       step, every step must rise. The expected step is 0.07; the smallest
       step of all 24 seeded runs was 0.036 (nhl). Band: every step over 0.015.
     talk reach: share of careers asked at least once before the hard stop.
       Lowest of six: nfl 86.8, nba 100, mlb 100, nhl 97.2. Band: at least 70.
     iff: inducted is 19.6 to 21.6 percent (nfl), 28.2 to 31.1 (nba), 36.2 to
       39.4 (mlb), 28.1 to 31.1 (nhl) of these careers. Band: at least 5
       percent, so the check can never pass on an empty Hall.
     mlb careers under ten seasons with games that reach the Hall or the
       ballot (printed, not checked; the real ballot needs ten): 0 in all six.
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
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', label: 'teamLabelOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', label: 'nbaTeamLabelOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', label: 'mlbTeamLabelOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', label: 'nhlTeamLabelOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', positions: ['C', 'LW', 'RW', 'D', 'G'] },
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
  bindhof: { file: 'careerHallOfFame.ts', from: 'return { score: l.score, hof: l.hof };', to: 'return { score: l.score, hof: true };' },
  outcomeswap: { file: 'careerHallOfFame.ts', from: 'rules.ballotYears !== null ? "fellOff" : "waiting"', to: 'rules.ballotYears === null ? "fellOff" : "waiting"' },
  nominationgone: { file: 'careerHallOfFame.ts', from: 'if (cand.score < lines.hofLine * HALL_GAME_RULES.nominationShare) {', to: 'if (false) {' },
  waitoff: { file: `${SPORT}CareerHall.ts`, re: /firstClassOffset: (\d+),/, to: (m, n) => `firstClassOffset: ${Number(n) + 1},` },
  flatfirst: { file: 'careerHallOfFame.ts', from: 'return f + (1 - f) * bandFraction(score, lines);', to: 'return f;' },
  nopromise: { file: 'careerHallOfFame.ts', from: 'if (score >= lines.firstBallotScore) return 1;', to: 'if (score >= lines.firstBallotScore) return 0.5;' },
  mathrandom: { file: 'careerHallOfFame.ts', from: 'const rng = keyedRng(`hall:${rules.sport}:${cand.key}`);', to: 'const rng = Math.random;' },
  // MLB only (the one Hall with a stay floor): the opening share curve before the review, under which almost nobody fell off early.
  oldcurve: { file: 'careerHallOfFame.ts', from: 'let share = (t - 10) * reach ** 4 * (0.3 + 0.7 * rng());', to: 'let share = (t - 10) * reach * reach * (0.6 + 0.4 * rng());' },
  // MLB only (the one Hall with a stay floor): the fall off reads the raw share, not the one the card prints.
  shownraw: { file: 'careerHallOfFame.ts', from: 'if (rules.stayFloor !== null && shown < rules.stayFloor) {', to: 'if (rules.stayFloor !== null && share < rules.stayFloor) {' },
  sharesides: { file: 'careerHallOfFame.ts', from: 'const final = Math.min(99.7, t + ', to: 'const final = Math.min(99.7, t - 20 + ' },
  farewelloff: { file: 'careerRetirement.ts', from: 'return block.farewellYear !== undefined && year >= block.farewellYear;', to: 'return block.farewellYear !== undefined && year > block.farewellYear;' },
  retireoff: { file: 'careerRetirement.ts', from: 'if (block.retiredYear !== undefined && year >= block.retiredYear) return true;', to: 'if (false) return true;' },
  notalk: { file: 'careerRetirement.ts', from: 'if (drop >= rule.dropFromPeak) return', to: 'if (false) return' },
  jerseyfirst: { file: 'careerHallOfFame.ts', from: 't.seasons > best.seasons ||', to: 't.seasons < best.seasons ||' },
  jerseyraw: { file: 'careerHallOfFame.ts', from: 'teamName: (team, c) => def.teamLabel(team, c.eraId),', to: 'teamName: (team) => team,' },
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
  // The engine's own legacyOf, read straight from the engine, so the iff check
  // never goes through the Hall binding it is checking.
  `export { ${E.legacy} as LEGACY, ${E.label} as LABEL, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
  `export { ${E.hall} as HALL } from './src/lib/${SPORT}CareerHall.ts';`,
  `export { hallRecordFor, runHallBallot, giveHallSpeech, HALL_SPEECHES } from './src/lib/careerHallOfFame.ts';`,
  `export { retirementTalk, answerRetirement, careerEndsAfter, isFarewellSeason } from './src/lib/careerRetirement.ts';`,
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
    // The retirement block the save would carry, and this loop's own note of the answer that matters.
    let block, answer = null;
    const declined = new Set();
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
      const year = c.seasons.at(-1).year;
      if (answer && answer.choice === 'farewell' && year === answer.year + 1 && eng.isFarewellSeason(block, year)) answer.flagged = true;
      // The talk, read after the offseason, exactly where a board would ask it.
      const snap = HALL.snapshot(c);
      const talk = eng.retirementTalk(rule, snap, block);
      // An independent reading of the rule, from the save and this loop's own record of the answers.
      const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
      const ended = answer !== null && answer.choice !== 'oneMore';
      const expect = !eng.stop(c) && !ended && !declined.has(year) && c.age >= rule.minAge && (peak - c.ovr >= rule.dropFromPeak || c.ovr <= rule.floor);
      if (Boolean(talk) !== expect) talkMismatch += 1;
      if (talk && c.age < rule.minAge) talkBeforeAge += 1;
      if (talk) {
        talks += 1;
        if (firstTalkAge === null) firstTalkAge = c.age;
        // The answer: policy 0 never answers, 1 always plays one more, 2 retires at the first talk, 3 announces a farewell.
        // One answer per full cycle of positions, so every position gets all four (i % 4 tied them to positions).
        const choice = [null, 'oneMore', 'retireNow', 'farewell'][Math.floor(i / E.positions.length) % 4];
        if (choice) {
          block = eng.answerRetirement(block, year, choice);
          if (choice === 'oneMore') declined.add(year);
          if (!answer || answer.choice === 'oneMore') answer = { choice, year, flagged: false };
        }
      }
      if (eng.careerEndsAfter(block, year)) c.retired = true;
    }
    const legacy = eng.LEGACY(c);
    counting = true;
    const rec = eng.hallRecordFor(HALL, c);
    const again = eng.hallRecordFor(HALL, c);
    let speech = null;
    if (rec.outcome === 'inducted') speech = eng.giveHallSpeech(undefined, rec, HALL.key(c), eng.HALL_SPEECHES[i % eng.HALL_SPEECHES.length].id);
    counting = false;
    careers.push({
      score: legacy.score, hof: legacy.hof, rec, same: JSON.stringify(rec) === JSON.stringify(again),
      // Read off the save, not through HALL.lastSeasonYear, which is under test.
      last: c.seasons.at(-1)?.year ?? Number.NaN, seasons: c.seasons.map(s => ({ team: s.team, games: s.games })),
      talks, firstTalkAge, speech, finalAge: c.age, seasonsPlayed: c.seasons.length, eraId: c.eraId, answer,
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
/* Score deciles of the real Hall of Famers, and every cut between two of
   them: the first ballot share of all the deciles above the cut minus all
   those below. Each of the nine cuts must open a gap, so the share rises
   across the whole ladder of deciles, and neither side of a cut is one small
   decile on its own. */
const DECILES = 10;
const decile = k => inducted.slice(Math.floor((k * inducted.length) / DECILES), Math.floor(((k + 1) * inducted.length) / DECILES));
const decileShares = Array.from({ length: DECILES }, (_, k) => share(decile(k), c => c.rec.firstBallot));
const decileCuts = Array.from({ length: DECILES - 1 }, (_, k) => {
  const cut = Math.floor(((k + 1) * inducted.length) / DECILES);
  return share(inducted.slice(cut), c => c.rec.firstBallot) - share(inducted.slice(0, cut), c => c.rec.firstBallot);
});

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

/* The three answers, held to their button words on these careers. Retire now:
   the season he answered after was his last. One more year: he plays the next
   season. Farewell: exactly one more season, marked as the farewell, then done. */
let answerMiss = 0;
const answered = { retireNow: 0, oneMore: 0, farewell: 0 };
for (const c of careers) {
  const a = c.answer;
  if (!a) continue;
  answered[a.choice] += 1;
  if (a.choice === 'retireNow' && c.last !== a.year) answerMiss += 1;
  if (a.choice === 'oneMore' && !(c.last > a.year)) answerMiss += 1;
  if (a.choice === 'farewell' && (c.last !== a.year + 1 || !a.flagged)) answerMiss += 1;
}

/* The stay floor read on 20000 synthetic candidates from the nomination line
   up, so a share shown at exactly the floor (a raw 4.96 printed 5.0 stays on)
   comes up hundreds of times a run instead of once or twice in the careers. */
let atFloor = 0;
if (rules.stayFloor !== null) {
  for (let j = 0; j < 20000; j += 1) {
    const score = lines.hofLine * (0.5 + 0.3 * ((j % 200) / 200));
    const r = eng.runHallBallot(rules, lines, { key: `floor:${SEED}:${j}`, hof: false, score, lastSeasonYear: 2030 });
    r.ballots.forEach((b, k) => {
      if (b.share === rules.stayFloor) atFloor += 1;
      if (k < r.ballots.length - 1 && b.share < rules.stayFloor) sideMiss += 1;
    });
    const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
    if (early && !(r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
  }
}

// The jersey, read independently: most seasons, ties to games, then the first club.
const club = seasons => {
  const t = new Map();
  seasons.forEach((s, i) => { if (!s.team || !(s.games > 0)) return; const e = t.get(s.team) ?? { team: s.team, seasons: 0, games: 0, first: i }; e.seasons += 1; e.games += s.games; t.set(s.team, e); });
  return [...t.values()].sort((a, b) => b.seasons - a.seasons || b.games - a.games || a.first - b.first)[0] ?? null;
};
let jerseyMiss = 0, jerseys = 0, jerseyRaw = 0;
for (const c of careers) {
  const best = club(c.seasons);
  const promised = lines.jerseyScore !== null && c.score >= lines.jerseyScore;
  const due = best && (promised || (c.rec.outcome === 'inducted' && best.seasons >= 5) || (best.seasons >= 12 && c.score >= lines.hofLine * 0.85));
  const want = due ? { team: best.team, seasons: best.seasons } : null;
  const got = c.rec.jersey ? { team: c.rec.jersey.team, seasons: c.rec.jersey.seasons } : null;
  if (JSON.stringify(want) !== JSON.stringify(got)) jerseyMiss += 1;
  // The card names the club with the engine's own label, never a bare abbreviation it knows.
  if (c.rec.jersey && c.rec.jersey.teamName !== eng.LABEL(c.rec.jersey.team, c.eraId)) jerseyMiss += 1;
  // A bare abbreviation on the card. Not "name equals id": a club abroad (an MLB career's
  // seasons in Japan, "Yomiuri Giants") already carries its full name as its id.
  if (c.rec.jersey && /^[A-Z]{2,4}$/.test(c.rec.jersey.teamName ?? c.rec.jersey.team)) jerseyRaw += 1;
  if (c.rec.jersey) jerseys += 1;
}

const iffMiss = careers.filter(c => (c.rec.outcome === 'inducted') !== c.hof || c.rec.score !== c.score).length;

/* The outcome of every career outside the Hall, read from the rule as the
   card prints it. Off the ballot exactly under half the Hall line (the game
   rule nominationShare, 0.5). On the ballot: where the Hall has a ballot limit
   every one falls off, and only the last ballot may sit under the stay floor;
   where it claims no limit nobody falls off, so he is still waiting. */
const NOMINATION = 0.5;
let outcomeMiss = 0, onBallotOut = 0, offBallot = 0, earlyFalls = 0;
for (const c of careers) {
  const r = c.rec;
  if (r.outcome === 'inducted') continue;
  const off = c.score < NOMINATION * lines.hofLine;
  if (off) {
    offBallot += 1;
    if (r.outcome !== 'notOnBallot' || r.ballots.length !== 0) outcomeMiss += 1;
    continue;
  }
  onBallotOut += 1;
  if (r.ballots.length === 0) { outcomeMiss += 1; continue; }
  const want = rules.ballotYears !== null ? 'fellOff' : 'waiting';
  if (r.outcome !== want) outcomeMiss += 1;
  if (rules.stayFloor !== null && r.ballots.slice(0, -1).some(b => b.share < rules.stayFloor)) outcomeMiss += 1;
  if (rules.ballotYears !== null && r.ballots.length < rules.ballotYears) {
    earlyFalls += 1;
    if (!(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) outcomeMiss += 1;
  }
}
const notSame = careers.filter(c => !c.same).length;
const talked = share(careers, c => c.talks > 0);
const outcomes = {};
for (const c of careers) outcomes[c.rec.outcome] = (outcomes[c.rec.outcome] ?? 0) + 1;
const fbAll = share(inducted, c => c.rec.firstBallot);

console.log(`simCareerHall ${SPORT}: ${careers.length} careers, ${crashes} crashed, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
console.log(`  hof ${pct(inducted.length, careers.length)}% (${inducted.length}), first ballot ${pct(fbAll * 1000, 1000)}% of them; bottom third ${pct(fbLow * 1000, 1000)}%, top third ${pct(fbHigh * 1000, 1000)}%`);
console.log(`  outcomes ${JSON.stringify(outcomes)}; jerseys ${jerseys}; talk reached ${pct(talked * 1000, 1000)}% of careers`);
console.log(`  ladder ${ladder.map(v => v.toFixed(3)).join(' ')}; smallest step ${Math.min(...ladderSteps).toFixed(3)}`);
console.log(`  deciles ${decileShares.map(v => v.toFixed(2)).join(' ')}; cuts ${decileCuts.map(v => v.toFixed(2)).join(' ')}; smallest cut ${Math.min(...decileCuts).toFixed(3)}`);
console.log(`  misses: iff ${iffMiss}, outcome ${outcomeMiss}, table [${tableDiffs.join(',')}], offset ${offsetMiss}, promise ${promiseMiss}/${promiseN}, draws ${hallDraws}, notSame ${notSame}, sides ${sideMiss}, talk ${talkMismatch}+${talkBeforeAge}, jersey ${jerseyMiss}`);
// Printed, not checked: careers under ten seasons with games (MLB's real ballot needs ten, which the model leaves to legacyOf).
const shortCareer = c => c.seasons.filter(s => s.games > 0).length < 10;
if (SPORT === 'mlb') console.log(`  under ten seasons played: ${careers.filter(c => shortCareer(c) && c.rec.outcome === 'inducted').length} inducted, ${careers.filter(c => shortCareer(c) && c.rec.ballots.length > 0 && c.rec.outcome !== 'inducted').length} on the ballot outside the Hall`);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`  talk timing: talks a career, median ${med(careers.map(c => c.talks))}; first talk at ${med(careers.filter(c => c.firstTalkAge !== null).map(c => c.firstTalkAge))}; career ends at ${med(careers.map(c => c.finalAge))}; non finite scores ${careers.filter(c => !Number.isFinite(c.score)).length}`);

/* ─── Check ───────────────────────────────────────────────────────────── */
const BAND = { minInducted: 0.05, decileCut: 0.06, ladderStep: 0.015, talkReach: 0.70, earlyFall: 0.10, atFloor: 100 };
const smallestCut = Math.min(...decileCuts);
const fellEarlyEnough = rules.stayFloor === null || earlyFalls >= BAND.earlyFall * onBallotOut;
const checks = [
  ['crashes', crashes === 0 && careers.length === CAREERS, `${crashes} crashed of ${CAREERS}`],
  ['iff', iffMiss === 0 && inducted.length >= BAND.minInducted * careers.length, `${iffMiss} disagree with the engine's own legacyOf, ${inducted.length} inducted`],
  ['outcome', outcomeMiss === 0 && offBallot > 0 && onBallotOut > 0 && fellEarlyEnough, `${outcomeMiss} careers outside the Hall with the wrong outcome; ${offBallot} off the ballot, ${onBallotOut} on it, ${earlyFalls} early fall offs${rules.stayFloor === null ? '' : ` (needs ${100 * BAND.earlyFall} percent of those on it)`}`],
  ['table', tableDiffs.length === 0 && offsetMiss === 0, `rules off the audit table: [${tableDiffs.join(',')}], ${offsetMiss} careers on the wrong first class`],
  ['rises', smallestCut >= BAND.decileCut && Math.min(...ladderSteps) > BAND.ladderStep, `smallest of the nine decile cuts ${smallestCut.toFixed(3)} (needs ${BAND.decileCut}), smallest ladder step ${Math.min(...ladderSteps).toFixed(3)} (needs over ${BAND.ladderStep})`],
  ['promise', promiseMiss === 0 && promiseN >= 500, `${promiseMiss} of ${promiseN} promised first ballots missed`],
  ['keyed', hallDraws === 0 && notSame === 0, `${hallDraws} Math.random draws, ${notSame} records that changed on a second run`],
  ['sides', sideMiss === 0 && (rules.stayFloor === null || atFloor >= BAND.atFloor), `${sideMiss} ballots on the wrong side of a rule${rules.stayFloor === null ? '' : `, ${atFloor} synthetic ballots shown at exactly the floor`}`],
  ['talk', talkMismatch === 0 && talkBeforeAge === 0 && talked >= BAND.talkReach, `${talkMismatch} talks off the rule, ${talkBeforeAge} before the age, reached ${(100 * talked).toFixed(1)} percent (needs ${100 * BAND.talkReach})`],
  ['answers', answerMiss === 0 && Object.values(answered).every(n => n > 0), `${answerMiss} answers that did not do what the button says; answered ${JSON.stringify(answered)}`],
  ['jersey', jerseyMiss === 0 && jerseyRaw === 0 && jerseys > 0, `${jerseyMiss} jerseys off the rule or misnamed, ${jerseyRaw} named by a bare club id, ${jerseys} retired`],
];
for (const [name, ok, detail] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
const red = checks.filter(c => !c[1]).map(c => c[0]);
if (CONTROL) {
  const WANT = { everyonein: 'iff', bindhof: 'iff', outcomeswap: 'outcome', nominationgone: 'outcome', oldcurve: 'outcome', waitoff: 'table', shownraw: 'sides', flatfirst: 'rises', nopromise: 'promise', mathrandom: 'keyed', sharesides: 'sides', notalk: 'talk', farewelloff: 'answers', retireoff: 'answers', jerseyfirst: 'jersey', jerseyraw: 'jersey' }[CONTROL];
  console.log(`simCareerHall ${SPORT} CONTROL ${CONTROL}: wanted ${WANT} red, red [${red.join(',')}], ${red.includes(WANT) ? 'FIRED' : 'DID NOT FIRE'}`);
  // Exit 1 only when the check this control targets went red, so the exit
  // code alone proves the control hit its own check. Any other red is printed.
  process.exit(red.includes(WANT) ? 1 : 0);
}
console.log(`simCareerHall ${SPORT}: ${red.length ? `RED [${red.join(',')}]` : `all ${checks.length} checks green`}`);
process.exit(red.length ? 1 : 0);
