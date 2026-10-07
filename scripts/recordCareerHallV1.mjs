/* recordCareerHallV1.mjs, Round 1051: the Hall of Fame as it was told BEFORE
   the legacy recalibration, recorded on the code of the commit it ran on.

   Run once, on the base commit, before any src change of the round:
     node scripts/recordCareerHallV1.mjs
   It writes src/test/fixtures/careerHallV1.json. The replay test
   (src/test/careerHallV1Replay.test.ts) and section 15 of
   scripts/simCareerHall.mjs then hold every later tree to it: a career that
   retired before Round 1051 keeps the legacy and the ballot it was told.
   Rerunning it on a later tree records THAT tree, which proves nothing, so
   it refuses to overwrite the file unless RECORD_FORCE=1 says so.

   WHAT IT RECORDS, per sport, chosen by rule and never by eye:
     engine saves  400 careers on the harness's own engine loop (start, the
                   season, progress, a random answer to the event card, a
                   banned year pushed as a line, the hard stop), retired. Kept:
                   for each position the first Hall of Famer and the first
                   career outside the Hall in play order; then the first
                   career of each ballot outcome not covered yet (first
                   ballot, a later ballot, waiting, fell off, never on the
                   ballot); then play order until the sport holds 16. At most
                   28 a sport.
     board saves   four more off the board's own loop (the binding, its
                   summer, the retirement talk), one per answer policy: one
                   more year every time, retire now, a farewell, and no talk
                   at all (a save from before Round 1039, with no answers
                   block). Each is career 0 of its policy, except one more
                   year, which takes the first of its careers 0 to 199 that
                   the Hall inducts and gives the speech there, so one save
                   carries the speech block too.
   For each: the whole save as the board would write it (JSON), the sport's
   legacyOf whole, and hallRecordFor whole, both read off the parsed JSON.

   It reads nothing off the network and draws only from the seeded stream. */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const FILE = path.join(ROOT, 'src/test/fixtures/careerHallV1.json');
if (existsSync(FILE) && process.env.RECORD_FORCE !== '1') {
  console.error('recordCareerHallV1: the fixture exists. It was recorded on the base of Round 1051 and is not rerun (RECORD_FORCE=1 overrides).');
  process.exit(2);
}
const N = Number(process.env.RECORD_CAREERS || 400);
const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', binding: 'NFL_CAREER_SPORT', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', binding: 'NBA_CAREER_SPORT', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', binding: 'MLB_CAREER_SPORT', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', binding: 'NHL_CAREER_SPORT', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };

const hashStr = s => { let h = 0x811c9dc5 >>> 0; for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const streamFor = key => {
  let a = hashStr(`v1:${key}`);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

async function load(sport) {
  const E = ENGINES[sport];
  const out = path.join(os.tmpdir(), `career-hall-v1-${sport}-${process.pid}.mjs`);
  const entry = [
    `export { ${E.legacy} as LEGACY, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
    `export { ${E.hall} as HALL } from './src/lib/${sport}CareerHall.ts';`,
    `export { hallRecordFor } from './src/lib/careerHallOfFame.ts';`,
    `export { giveHallSpeech, HALL_SPEECHES } from './src/lib/careerHallSpeech.ts';`,
    `export { ${E.binding} as SPORTB } from './src/lib/${sport}CareerSport.ts';`,
    `export { startSummer, answerSummerCard } from './src/lib/usCareerSummer.ts';`,
    `export { pendingTalk, answerTalk, endsAfterSeason, talkDeckFilter, RETIREMENT_CARD_IDS } from './src/lib/usCareerRetirementFlow.ts';`,
  ].join('\n');
  await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic' });
  const eng = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* the temp file is only a copy */ }
  return eng;
}

/* One engine career to the hard stop, the loop of sections 1 to 8 of
   simCareerHall.mjs without the talk. */
function engineCareer(E, eng, i) {
  const pos = E.positions[i % E.positions.length];
  const archs = eng.ARCH[pos];
  const c = eng.start(`V1 ${i}`, pos, archs[i % archs.length], Math.random, null);
  let tq = null, guard = 0;
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
  }
  c.retired = true;
  return c;
}

/* One board career, the loop of sections 9 to 14 of simCareerHall.mjs
   (boardCareer) without its logs: the binding's own season, the summer deal
   with the talk filter, the talk where the board asks it, every card. */
function boardCareer(E, eng, i, policy) {
  const SB = eng.SPORTB, HALL = eng.HALL;
  const ruleHolds = c => {
    const r = HALL.retirement;
    if (c.retired || !c.seasons.length || SB.shouldRetire(c)) return false;
    if (c.retirement?.farewellYear !== undefined || c.retirement?.retiredYear !== undefined) return false;
    const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
    return c.age >= r.minAge && (peak - c.ovr >= r.dropFromPeak || c.ovr <= r.floor);
  };
  const keep = Math.random;
  Math.random = streamFor(`board:${i}`);
  const pick = streamFor(`pick:${i}`);
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = SB.startCareer(`V1 Board ${i}`, pos, archs[i % archs.length], Math.random, null, undefined);
    const filterOf = () => (policy === 'noTalk' ? e => eng.RETIREMENT_CARD_IDS.has(e.id) && ruleHolds(c) : eng.talkDeckFilter(c, SB.hall));
    let tq = null, banned = false;
    // The talk where the board asks it. True when it ended the career.
    const askTalk = o => {
      if (o.asked || policy === 'noTalk' || !eng.pendingTalk(c, SB.hall)) return false;
      o.asked = true;
      eng.answerTalk(c, policy);
      if (policy !== 'retireNow') return false;
      c.retired = true; delete c.summer;
      return true;
    };
    for (let guard = 0; guard < 32 && !c.retired; guard += 1) {
      if (!banned) tq = SB.rollTeamQuality(tq, Math.random);
      banned = (c.suspendedSeasons ?? 0) > 0;
      const o = { asked: false };
      if (banned) {
        c.suspendedSeasons -= 1;
        c.seasons.push(SB.suspendedLine(c));
        SB.progress(c, Math.random);
        if (eng.endsAfterSeason(c, c.seasons.at(-1).year)) { c.retired = true; break; }
        if (askTalk(o)) break;
        continue;
      }
      SB.campBattle(c, tq, Math.random);
      SB.simSeason(c, tq, Math.random);
      SB.progress(c, Math.random);
      if (SB.shouldRetire(c)) { c.retired = true; break; }
      if (eng.endsAfterSeason(c, c.seasons.at(-1).year)) { c.retired = true; break; }
      const filter = filterOf();
      let ev = eng.startSummer(c, SB, Math.random, filter);
      if (askTalk(o)) break;
      let ended = false;
      while (ev) {
        const k = Math.floor(pick() * ev.options.length);
        ev = eng.answerSummerCard(c, SB, ev, k, Math.random, filter).next;
        if (askTalk(o)) { ended = true; break; }
      }
      if (ended) break;
    }
    c.retired = true;
    return c;
  } finally { Math.random = keep; }
}

const ballotKind = rec => (rec.outcome === 'inducted' ? (rec.firstBallot ? 'inducted first ballot' : 'inducted later') : rec.outcome);
const sports = {};
const counts = {};
for (const sport of Object.keys(ENGINES)) {
  const E = ENGINES[sport];
  const eng = await load(sport);
  const read = save => ({ legacy: eng.LEGACY(save), hall: eng.hallRecordFor(eng.HALL, save) });
  const played = [];
  for (let i = 0; i < N; i += 1) {
    const save = JSON.parse(JSON.stringify(engineCareer(E, eng, i)));
    played.push({ i, save, ...read(save) });
  }
  const kept = new Map();
  const take = (p, why) => { if (kept.size < 28 && !kept.has(p.i)) kept.set(p.i, why); };
  for (const pos of E.positions) {
    const inn = played.find(p => p.save.pos === pos && p.legacy.hof);
    const out = played.find(p => p.save.pos === pos && !p.legacy.hof);
    if (inn) take(inn, `${pos}: first Hall of Famer in play order`);
    if (out) take(out, `${pos}: first career outside the Hall in play order`);
  }
  for (const kind of ['inducted first ballot', 'inducted later', 'waiting', 'fellOff', 'notOnBallot']) {
    if ([...kept.keys()].some(i => ballotKind(played[i].hall) === kind)) continue;
    const p = played.find(q => ballotKind(q.hall) === kind);
    if (p) take(p, `first career with the outcome: ${kind}`);
  }
  for (const p of played) { if (kept.size >= 16) break; take(p, 'play order, to reach 16'); }
  const list = [...kept.keys()].sort((a, b) => a - b).map(i => ({ id: `${sport}-engine-${i}`, from: 'engine', why: kept.get(i), save: played[i].save, legacy: played[i].legacy, hall: played[i].hall }));
  for (const policy of ['oneMore', 'retireNow', 'farewell', 'noTalk']) {
    let i = 0, save = JSON.parse(JSON.stringify(boardCareer(E, eng, 0, policy)));
    if (policy === 'oneMore') {
      // The first of careers 0 to 199 the Hall inducts, so the speech can be given.
      while (i < 199 && read(save).hall.outcome !== 'inducted') { i += 1; save = JSON.parse(JSON.stringify(boardCareer(E, eng, i, policy))); }
      const rec = read(save).hall;
      if (rec.outcome === 'inducted') save.hallSpeech = eng.giveHallSpeech(undefined, rec, eng.HALL.key(save), eng.HALL_SPEECHES[0].id);
      save = JSON.parse(JSON.stringify(save));
    }
    list.push({ id: `${sport}-board-${policy}-${i}`, from: `board:${policy}`, why: `board loop, answer policy ${policy}${save.hallSpeech ? ', the speech given' : ''}`, save, ...read(save) });
  }
  sports[sport] = list;
  const tally = {};
  for (const e of list) tally[ballotKind(e.hall)] = (tally[ballotKind(e.hall)] ?? 0) + 1;
  counts[sport] = { saves: list.length, hof: list.filter(e => e.legacy.hof).length, outcomes: tally, speech: list.filter(e => e.save.hallSpeech).length, retirementBlock: list.filter(e => e.save.retirement).length };
  console.log(`recordCareerHallV1 ${sport}: ${JSON.stringify(counts[sport])}`);
}
const commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
const body = { note: 'Round 1051: the Hall of Fame as told before the legacy recalibration. Written by scripts/recordCareerHallV1.mjs on the commit below; never edited by hand and never rerun on a later tree.', baseCommit: commit, careersPlayed: N, counts, sports };
mkdirSync(path.dirname(FILE), { recursive: true });
writeFileSync(FILE, `${JSON.stringify(body)}\n`);
console.log(`recordCareerHallV1: wrote ${path.relative(ROOT, FILE)} on ${commit.slice(0, 8)}, ${Object.values(counts).reduce((s, c) => s + c.saves, 0)} saves`);
