/* Round 1343: retiring as a manager, and the highest scoring game on the record.

   SECTIONS (run in this order; --part=a,b picks some):
     record   fresh careers (Everton 2005-06, Barcelona 2015-16, Liverpool now, seeds 0 to 4, two seasons):
              after every match the stored record equals an independent oracle (each match's goals read off
              its MatchWeekReport, the first of the most goals kept) and highestFromBook over the whole book.
     oldsave  a four season Everton career saved without the field (built on RETIRE_BASE when set, else head
              built with the field taken off): exact on the whole book; leaned, `missed` is played minus the
              book; one more match on head stores the seed or that match and carries `missed`.
     pens     every single leg tie of the record fleet settled on penalties, fed through noteHighestScoring
              with a prev of fewer goals: the level score with res W or L, onPenalties true, goals equal to the
              report's goals with no kick. Exit 2 only when the fleet held no shootout at all.
     base     a career with matchRules 'base' plays a season and never writes the field.
     retire   retireCareer at the three moments (the season's end, the middle of one, out of work) on real careers,
              against a deep copy taken before: only `retired` (and the record when absent) differ, the input never
              moves, zero draws; null with a match in progress, when already retired, and on a season played to its
              last match but not yet reviewed (the review writes the title and the row); careerLegacy's clubs cover
              every name in clubsManaged, its cabinet sums to the trophies, its record equals the save's.
     dashes   no dash of any kind (U+2010 to U+2015, U+2212) in the five new files, comments included.
     fleet   (needs RETIRE_BASE) Everton 2005-06, Barcelona 2015-16, Liverpool now, seeds 0 to 4, three
              seasons, quick sims with the coach and with noCoach: every save byte equal to RETIRE_BASE's once
              careerStats.highestScoring is taken off, and every draw. A 'base' career: equal, nothing taken off.
     hotseat  (needs RETIRE_BASE) 30 Hot Seat dates before HOT_SEAT_RULES_FROM and 10 from it on, played by a
              fixed script on head and base: whole states equal (the one key taken off from the cutover on);
              handoverState never carries `retired`; a carried run's first Club Manager match seeds the record
              exactly from the book.
     loads    (needs RETIRE_BASE) every Club Manager save scripts/lib/realSaves.mjs builds on RETIRE_BASE, and
              the base engine's own saves two and a half seasons in (seeds 0 to 3, three clubs, the last of each
              leaned the way a parked slot is), load to the same JSON on head and base.
   Without RETIRE_BASE (runAllSims) fleet, hotseat and loads print SKIPPED and oldsave builds its old save on head.

   NEGATIVE CONTROLS (RETIRE_CONTROL=<name>; each patches a copy in memory, asserts its anchor is there once):
     tielast     the update takes >= : record red (exit 2 if the fleet held no tie, never green)
     skipgame    the update ignores the match just played: record red
     nomissed    missed is never stored: oldsave red
     basewrites  the 'base' gate off: base red (and hotseat red before the cutover)
     liveok      canRetire forgets the match in progress: retire red
     seasonover  canRetire forgets the played out season (the review not yet seen): retire red
     drawone     a Math.random call inside retireCareer: retire red on the draw count
     dash        an em dash planted in a copy of clubManagerRetire.ts: dashes red
     stripnone   the fleet compares with the new key left on: fleet red (proves the key is written)
     drawleak    an extra Math.random in the update: fleet red on the draw count

   ENV: RETIRE_BASE=<checkout of the branch point>, RETIRE_SEEDS (5), RETIRE_SEASONS (fleet, 3),
        RETIRE_CLUBS=everton,barcelona,liverpool (fleet and record, all by default).
   Exit 0 green, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const RECORDS = 'src/lib/clubManagerRecords.ts';
const RETIRE = 'src/lib/clubManagerRetire.ts';
const RETIRE_BASE = process.env.RETIRE_BASE ?? '';
const CONTROL = process.env.RETIRE_CONTROL ?? '';
const SEEDS = Number(process.env.RETIRE_SEEDS ?? 5);
const FLEET_SEASONS = Number(process.env.RETIRE_SEASONS ?? 3);
const ALL_CLUBS = { everton: ['Everton', 'era2005'], barcelona: ['Barcelona', 'era2015'], liverpool: ['Liverpool', null] };
const CLUBS = (process.env.RETIRE_CLUBS ? process.env.RETIRE_CLUBS.split(',') : Object.keys(ALL_CLUBS)).map(k => ALL_CLUBS[k]);
const partArg = process.argv.find(a => a.startsWith('--part='));
const BASE_PARTS = ['fleet', 'hotseat', 'loads'];
const OWN_PARTS = ['record', 'oldsave', 'pens', 'base', 'retire', 'dashes'];
const ALL_PARTS = [...OWN_PARTS, ...(RETIRE_BASE ? BASE_PARTS : [])];

const CONTROLS = {
  tielast: { part: 'record', file: RECORDS, from: '  const best = !prev || goalsIn(game.score) > goalsIn(prev.score) ? game : prev;', to: '  const best = !prev || goalsIn(game.score) >= goalsIn(prev.score) ? game : prev;' },
  skipgame: { part: 'record', file: RECORDS, from: '  const best = !prev || goalsIn(game.score) > goalsIn(prev.score) ? game : prev;', to: '  const best = prev ?? game;' },
  nomissed: { part: 'oldsave', file: RECORDS, from: '  return missed > 0 ? { ...rest, missed } : rest;', to: '  return rest;' },
  basewrites: { part: 'base', file: ENGINE, from: "  if (state.matchRules !== 'base') {", to: '  if (true) {' },
  stripnone: { part: 'fleet' },
  dash: { part: 'dashes' },
  liveok: { part: 'retire', file: RETIRE, from: '  return !!c && !c.retired && !c.live && !seasonPlayedOut(c);', to: '  return !!c && !c.retired && !seasonPlayedOut(c);' },
  seasonover: { part: 'retire', file: RETIRE, from: '  return !!c && !c.retired && !c.live && !seasonPlayedOut(c);', to: '  return !!c && !c.retired && !c.live;' },
  drawone: { part: 'retire', file: RETIRE, from: '  const next = JSON.parse(JSON.stringify(c)) as CareerState;', to: '  const next = JSON.parse(JSON.stringify(c)) as CareerState; Math.random();' },
  drawleak: { part: 'fleet', file: RECORDS, from: '  const stats = state.careerStats;', to: '  const stats = state.careerStats; Math.random();' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`unknown control ${CONTROL}`); process.exit(2); }
const PARTS = CONTROL ? [CONTROLS[CONTROL].part] : partArg ? partArg.slice(7).split(',') : ALL_PARTS;

/** Every draw any seeded call made, so two engines can be held to the same count. */
const DRAWS = { n: 0 };
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => {
    DRAWS.n += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}

const results = [];
const counts = {};
function check(part, name, ok, detail = '') {
  results.push({ part, name, ok: !!ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${part}] ${name}${detail ? ` (${detail})` : ''}`);
}
const hashOf = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const clone = v => JSON.parse(JSON.stringify(v));
const stripRecord = s => { const c = clone(s); if (c.careerStats) delete c.careerStats.highestScoring; return c; };
const same = (a, b) => !!a && !!b && a.opp === b.opp && a.score === b.score && a.res === b.res && a.season === b.season && (a.missed ?? 0) === (b.missed ?? 0);
const show = g => (g ? `${g.score} vs ${g.opp}, S${g.season}${g.missed ? `, missed ${g.missed}` : ''}` : 'none');

/* ---------------- the engines ---------------- */
const require = createRequire(import.meta.url);
const HS = new WeakMap();
const OUT = new WeakMap();
/** The engine bundled with Manager Hot Seat and the record module beside it. `srcRoot` is the src tree
 *  everything else comes from (RETIRE_BASE's for the base arm); `recordsText` a patched record module. */
async function bundleEngine(text, name, folder, { srcRoot = path.join(root, 'src'), recordsText = null, retireText = null } = {}) {
  const target = path.join(folder, `${name}.ts`);
  const output = path.join(folder, `${name}.cjs`);
  const entry = path.join(folder, `${name}-entry.ts`);
  await writeFile(target, text);
  const alias = { '@/lib/clubManager': target, '@': srcRoot };
  if (recordsText !== null) {
    const recFile = path.join(folder, `${name}-records.ts`);
    await writeFile(recFile, recordsText);
    alias['@/lib/clubManagerRecords'] = recFile;
  }
  if (retireText !== null) {
    const retFile = path.join(folder, name + '-retire.ts');
    await writeFile(retFile, retireText);
    alias['@/lib/clubManagerRetire'] = retFile;
  }
  const hasRecords = srcRoot === path.join(root, 'src');
  await writeFile(entry, "export * as cm from '@/lib/clubManager';\nexport * as hs from '@/lib/managerHotSeat';\n"
    + (hasRecords ? "export * as rec from '@/lib/clubManagerRecords';\nexport * as ret from '@/lib/clubManagerRetire';\n" : ''));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias, nodePaths: [path.join(root, 'node_modules')] });
  const mod = require(output);
  HS.set(mod.cm, mod.hs);
  OUT.set(mod.cm, output);
  if (mod.rec) REC.set(mod.cm, mod.rec);
  if (mod.ret) RET.set(mod.cm, mod.ret);
  await mod.cm.ensureAllEraRosters();
  return mod.cm;
}
const RET = new WeakMap();
const REC = new WeakMap();
/** A fresh copy of an engine bundle, the way a page load gets one: module level counters start again. */
async function freshEngine(cm) {
  const output = OUT.get(cm);
  delete require.cache[require.resolve(output)];
  const mod = require(output);
  HS.set(mod.cm, mod.hs);
  OUT.set(mod.cm, output);
  if (mod.rec) REC.set(mod.cm, mod.rec);
  if (mod.ret) RET.set(mod.cm, mod.ret);
  await mod.cm.ensureAllEraRosters();
  return mod.cm;
}

/* ---------------- playing ---------------- */
const QUICK = { coach: { skipHalftime: true }, noCoach: { skipHalftime: true, noCoach: true } };
/** Plays one career and hands every match to `onMatch(before, result)`. `base` sets matchRules 'base' after
 *  every call (a season roll may drop it). Returns the end state and the draws it took. */
function playCareer(cm, { club, era, seed, seasons, opts = QUICK.coach, base = false, onMatch = null }) {
  DRAWS.n = 0;
  let s = withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
  const setBase = () => { if (base) s.matchRules = 'base'; };
  setBase();
  for (let season = 0; season < seasons; season++) {
    for (let i = 0; i < 140; i++) {
      const before = s;
      const r = withSeed(seed * 7919 + season * 997 + i + 1, () => cm.playNextEntry(s, opts));
      s = r.state;
      setBase();
      if (onMatch && r.kind === 'match' && r.report) onMatch(before, r);
      if (r.kind === 'seasonOver') break;
    }
    if (season + 1 < seasons) { s = withSeed(seed * 31 + season + 5, () => cm.startNextSeason(cm.finishSeason(s).state)); setBase(); }
  }
  return { state: s, draws: DRAWS.n, at: `season ${s.season} week ${s.week}` };
}
/** The night as the report tells it, from the side of the club that played it. */
function nightOf(before, report) {
  const mine = report.home === before.clubName;
  if (!mine && report.away !== before.clubName) return null;
  const my = mine ? report.homeGoals : report.awayGoals;
  const their = mine ? report.awayGoals : report.homeGoals;
  return { opp: mine ? report.away : report.home, score: `${my}-${their}`, goals: my + their, level: my === their, season: before.season };
}

/* ---------------- section record (and the fleet the pens section reads) ---------------- */
const RECORD_SEASONS = 2;
/** Plays the record fleet once and keeps what pens needs. With `judge` off it only collects. */
function recordFleet(cm, judge) {
  const rec = REC.get(cm);
  const P = 'record';
  let matches = 0, ties = 0, offOracle = 0, offBook = 0, unread = 0, firstOracle = '', firstBook = '';
  const pens = [];
  let shootouts = 0;
  for (const [club, era] of CLUBS) {
    for (let seed = 0; seed < SEEDS; seed++) {
      let best = null;
      playCareer(cm, { club, era, seed, seasons: RECORD_SEASONS, onMatch: (before, r) => {
        const night = nightOf(before, r.report);
        const s = r.state;
        matches += 1;
        if (!night) { unread += 1; return; }
        if (best && night.goals === best.goals) ties += 1;
        if (!best || night.goals > best.goals) best = night;
        if (r.report.decidedBy === 'pens') {
          shootouts += 1;
          if (!(r.report.tie && r.report.tie.leg === 2)) pens.push({ row: clone(s.h2h.at(-1)), report: clone(r.report), night, won: r.report.shootoutWon });
        }
        if (!judge) return;
        const stored = s.careerStats.highestScoring;
        if (!stored || stored.opp !== best.opp || stored.score !== best.score || stored.season !== best.season) {
          offOracle += 1;
          firstOracle ||= `${club} seed ${seed} match ${s.careerStats.played}: stored ${show(stored)}, the reports say ${best.score} vs ${best.opp}, S${best.season}`;
        }
        const fromBook = rec.highestFromBook(s.h2h, s.careerStats.played);
        if (!same(stored, fromBook)) {
          offBook += 1;
          firstBook ||= `${club} seed ${seed} match ${s.careerStats.played}: stored ${show(stored)}, the book ${show(fromBook)}`;
        }
      } });
    }
  }
  counts.record = { matches, ties, shootouts, singleLeg: pens.length };
  if (judge) {
    console.log(`   ${CLUBS.length} clubs x ${SEEDS} seeds x ${RECORD_SEASONS} seasons: ${matches} matches, ${ties} ties with the record, ${shootouts} shootouts (${pens.length} single leg)`);
    check(P, 'the fleet played matches and read every report', matches > 0 && unread === 0, `${matches} matches, ${unread} reports not read`);
    check(P, 'after every match the stored record is the first of the most goals the reports show', offOracle === 0, offOracle ? `${offOracle} off; first ${firstOracle}` : '');
    check(P, 'after every match the stored record equals highestFromBook over the whole book', offBook === 0, offBook ? `${offBook} off; first ${firstBook}` : '');
  }
  return pens;
}
async function recordSection(cm, ctx) {
  ctx.pens = recordFleet(cm, true);
  if (CONTROL === 'tielast' && counts.record.ties === 0) { console.log('control tielast: the fleet held no tie with the record, so it cannot fire; could not run'); process.exit(2); }
}

/* ---------------- section pens ---------------- */
async function pensSection(cm, ctx) {
  const P = 'pens';
  const rec = REC.get(cm);
  const pens = ctx.pens ?? recordFleet(cm, false);
  console.log(`   the record fleet held ${counts.record.shootouts} shootouts, ${pens.length} of them single leg ties`);
  if (counts.record.shootouts === 0) { console.log('pens: the fleet held no shootout at all; could not run'); process.exit(2); }
  let bad = 0, first = '';
  for (const p of pens) {
    const goals = p.report.homeGoals + p.report.awayGoals;
    const prev = goals > 0 ? { opp: 'Earlier', score: '0-0', res: 'D', season: 0 } : null;
    const state = { careerStats: { played: 2, wins: 0, draws: 0, losses: 0, highestScoring: prev }, h2h: [p.row] };
    rec.noteHighestScoring(state, { opp: p.row.opp, score: p.row.score, res: p.row.res, season: p.row.season });
    const g = state.careerStats.highestScoring;
    const kicks = p.report.shootout ? p.report.shootout.mine + p.report.shootout.theirs : 0;
    const ok = !!g && p.night.level && g.score === p.night.score && (g.res === 'W' || g.res === 'L')
      && g.res === (p.won ? 'W' : 'L') && rec.onPenalties(g) && rec.goalsIn(g.score) === goals
      && (kicks === 0 || rec.goalsIn(g.score) !== goals + kicks);
    if (!ok) { bad += 1; first ||= `${p.row.opp} ${p.row.score} ${p.row.res}: stored ${show(g)}, the report ${p.night.score} (${goals} goals, ${kicks} kicks)`; }
  }
  check(P, `every single leg shootout (${pens.length}) keeps the level score with W or L, reads as penalties, counts no kick`, bad === 0, bad ? `${bad} wrong; first ${first}` : '');
}

/* ---------------- section oldsave ---------------- */
const OLD_SEASONS = 4;
async function oldsaveSection(cm, ctx) {
  const P = 'oldsave';
  const rec = REC.get(cm);
  const maker = ctx.base ?? cm;
  let best = null;
  const run = playCareer(maker, { club: 'Everton', era: null, seed: 0, seasons: OLD_SEASONS, onMatch: (before, r) => {
    const night = nightOf(before, r.report);
    if (night && (!best || night.goals > best.goals)) best = night;
  } });
  const old = ctx.base ? clone(run.state) : stripRecord(run.state);
  console.log(`   an Everton career ${OLD_SEASONS} seasons in, built on ${ctx.base ? 'RETIRE_BASE' : 'head with the field taken off (no RETIRE_BASE)'}: ${old.careerStats.played} played, ${old.h2h.length} in the book`);
  check(P, 'the old save carries no record', !('highestScoring' in old.careerStats));
  check(P, 'the old save\'s book holds every match', old.h2h.length === old.careerStats.played, `${old.h2h.length} of ${old.careerStats.played}`);
  const whole = rec.highestScoringOf(old);
  check(P, 'on the whole book the derived record is the reports\' first of the most goals, with no missed', !!whole && !!best && whole.opp === best.opp && whole.score === best.score && whole.season === best.season && !('missed' in whole),
    `${show(whole)}; reports ${best ? `${best.score} vs ${best.opp}, S${best.season}` : 'none'}`);
  const lean = maker.leanCareer(clone(old));
  const lost = lean.careerStats.played - lean.h2h.length;
  if (lost <= 0) { console.log('oldsave: leanCareer dropped no meeting from the book, so the leaned case proves nothing; could not run'); process.exit(2); }
  const leaned = rec.highestScoringOf(lean);
  check(P, `leaned, the derived record says the book lost ${lost} matches`, !!leaned && leaned.missed === lost, show(leaned));
  const frozen = JSON.stringify(lean);
  rec.highestScoringOf(lean);
  check(P, 'reading the record writes nothing', JSON.stringify(lean) === frozen);
  /* One more match on head, from the leaned save. */
  let s = clone(lean), night = null;
  for (let i = 0; i < 40 && !night; i++) {
    const before = s;
    const r = withSeed(9100 + i, () => cm.playNextEntry(s, QUICK.coach));
    s = r.state;
    if (r.kind === 'match' && r.report) night = nightOf(before, r.report);
    if (r.kind === 'seasonOver') s = withSeed(9300 + i, () => cm.startNextSeason(cm.finishSeason(s).state));
  }
  if (!night) { console.log('oldsave: no match in 40 entries after the leaned save; could not run'); process.exit(2); }
  const stored = s.careerStats.highestScoring;
  const seedGoals = rec.goalsIn(leaned.score);
  const expect = night.goals > seedGoals ? { opp: night.opp, score: night.score, season: night.season } : leaned;
  check(P, 'one match on head stores the seed or that match, whichever has more goals', !!stored && stored.opp === expect.opp && stored.score === expect.score && stored.season === expect.season,
    `stored ${show(stored)}; seed ${show(leaned)}; tonight ${night.score} vs ${night.opp}`);
  check(P, 'and carries missed forward', !!stored && stored.missed === lost, `${stored?.missed} of ${lost}`);
}

/* ---------------- section base ---------------- */
async function baseSection(cm) {
  const P = 'base';
  let matches = 0, wrote = 0;
  const run = playCareer(cm, { club: 'Liverpool', era: null, seed: 3, seasons: 1, base: true, onMatch: (_b, r) => {
    matches += 1;
    if ('highestScoring' in (r.state.careerStats ?? {})) wrote += 1;
  } });
  console.log(`   a 'base' Liverpool season: ${matches} matches`);
  check(P, 'a career on the base rules plays a season and never writes the record', matches > 20 && wrote === 0 && !('highestScoring' in run.state.careerStats), `${wrote} of ${matches} matches wrote it`);
}

/* ---------------- section retire ---------------- */
async function retireSection(cm) {
  const P = 'retire';
  const ret = RET.get(cm);
  /* Real careers at their three moments: a season played and finished (the summary pending), the next season 20
     entries in, and the same out of work. */
  const careers = [];
  /* Review fix: the season played to its last match and not yet reviewed (the hub's "Season complete!" card) waits for
     the review, which writes the league title and the season's row. */
  let playedOut = 0, playedOutRefused = 0;
  for (const [club, era] of CLUBS) {
    for (let seed = 0; seed < 2; seed++) {
      const played = playCareer(cm, { club, era, seed, seasons: 2 }).state;
      if (!played.sacked && !played.pendingSummary) {
        playedOut += 1;
        if (ret.seasonPlayedOut(played) && ret.retireCareer(clone(played)) === null) playedOutRefused += 1;
      }
      const ended = withSeed(seed + 40, () => cm.finishSeason(played).state);
      let mid = withSeed(seed + 41, () => cm.startNextSeason(clone(ended)));
      for (let i = 0; i < 20; i++) mid = withSeed(seed * 100 + i + 42, () => cm.playNextEntry(mid, QUICK.coach)).state;
      careers.push([`${club} seed ${seed} season end`, ended, 'seasonEnd'], [`${club} seed ${seed} mid season`, mid, 'midSeason'],
        [`${club} seed ${seed} out of work`, { ...clone(mid), sacked: true }, 'outOfWork']);
    }
  }
  let bad = 0, first = '', draws = 0, refused = 0, legacyBad = 0, legacyFirst = '', trophies = 0;
  const moments = new Set();
  for (const [label, c, planned] of careers) {
    /* A career the board sacked on the way is out of work whatever moment it was meant to be. */
    const when = c.sacked ? 'outOfWork' : planned;
    moments.add(when);
    const before = JSON.stringify(c);
    DRAWS.n = 0;
    const r = withSeed(1, () => ret.retireCareer(c));
    draws += DRAWS.n;
    const rest = r ? clone(r) : null;
    if (rest) { delete rest.retired; if (!('highestScoring' in c.careerStats)) delete rest.careerStats.highestScoring; }
    const ok = !!r && JSON.stringify(c) === before && JSON.stringify(rest) === before && r.retired?.when === when
      && r.retired.club === c.clubName && r.retired.season === c.season;
    if (!ok) { bad += 1; first ||= `${label}: ${r ? `retired ${JSON.stringify(r.retired)}` : 'refused'}`; }
    if (!r) continue;
    if (ret.retireCareer({ ...clone(c), live: {} }) === null && ret.retireCareer(r) === null) refused += 1;
    const l = ret.careerLegacy(r);
    const names = new Set(l.clubs.map(x => x.club));
    const cabinet = l.cabinet.reduce((n, t) => n + t.seasons.length, 0);
    trophies += r.trophies.length;
    const legacyOk = (r.careerStats.clubsManaged ?? [r.clubName]).every(n => names.has(n)) && cabinet === r.trophies.length
      && l.played === r.careerStats.played && l.wins === r.careerStats.wins && l.draws === r.careerStats.draws && l.losses === r.careerStats.losses
      && l.finishedSeasons === r.history.length;
    if (!legacyOk) { legacyBad += 1; legacyFirst ||= label; }
  }
  console.log(`   ${careers.length} careers at three moments, ${trophies} trophies between them`);
  check(P, 'retiring changes only `retired` (and writes the record down when absent), never its input, at the right moment', bad === 0 && moments.size === 3, bad ? `${bad} wrong; first ${first}` : `moments ${[...moments].join(', ')}`);
  check(P, 'retiring draws nothing', draws === 0, `${draws} draws`);
  check(P, 'a match in progress and a retired career are refused', refused === careers.length, `${refused} of ${careers.length}`);
  check(P, 'a season played to its last match and not yet reviewed is refused, so the review writes its title and its row first', playedOut > 0 && playedOutRefused === playedOut, `${playedOutRefused} of ${playedOut}`);
  check(P, 'the farewell\'s clubs, cabinet and record are the save\'s', legacyBad === 0 && trophies > 0, legacyBad ? `${legacyBad} wrong; first ${legacyFirst}` : `${trophies} trophies`);
}

/* ---------------- section dashes ---------------- */
/* The site's dash scans read the panel and the page, not these files, so this one does, comments included. */
const NEW_FILES = [RECORDS, RETIRE, 'src/components/club-manager/RetireDoor.tsx', 'src/components/club-manager/CmRetireDoor.tsx', 'src/components/club-manager/ClubManagerFarewell.tsx'];
async function dashesSection() {
  const P = 'dashes';
  const dashes = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(n => String.fromCharCode(n));
  const bad = [];
  let lines = 0;
  for (const f of NEW_FILES) {
    let t = (await readFile(path.join(root, f), 'utf8')).replace(/\r\n/g, '\n');
    if (CONTROL === 'dash' && f === RETIRE) t += `\n// planted ${String.fromCharCode(0x2014)}`;
    t.split('\n').forEach((line, i) => { lines += 1; if (dashes.some(d => line.includes(d))) bad.push(`${f}:${i + 1}`); });
  }
  check(P, `no dash of any kind in the ${NEW_FILES.length} new files (${lines} lines), comments included`, bad.length === 0 && lines > 200, bad.slice(0, 3).join(', '));
}

/* ---------------- section fleet (RETIRE_BASE) ---------------- */
async function fleetSection(cm, ctx) {
  const P = 'fleet';
  const strip = CONTROL === 'stripnone' ? clone : stripRecord;
  let n = 0, bad = 0, first = '', written = 0;
  for (const [club, era] of CLUBS) {
    for (let seed = 0; seed < SEEDS; seed++) {
      for (const mode of Object.keys(QUICK)) {
        const r = { club, era, seed, seasons: FLEET_SEASONS, opts: QUICK[mode] };
        const h = playCareer(await freshEngine(cm), r);
        const b = playCareer(await freshEngine(ctx.base), r);
        n += 1;
        if (h.state.careerStats.highestScoring) written += 1;
        const hh = hashOf(strip(h.state)), bh = hashOf(b.state);
        if (hh !== bh || h.draws !== b.draws) { bad += 1; first ||= `${club} ${era ?? 'now'} seed ${seed} ${mode}: head ${hh} ${h.draws} draws, base ${bh} ${b.draws} draws (${h.at})`; }
      }
    }
  }
  check(P, `${n} careers of ${FLEET_SEASONS} seasons: every save byte (the record taken off) and every draw equal to RETIRE_BASE`, n > 0 && bad === 0, bad ? `${bad} differ; first ${first}` : '');
  check(P, 'every head career wrote the record', written === n, `${written} of ${n}`);
  let bn = 0, bbad = 0, bfirst = '';
  for (const [club, era] of CLUBS) {
    const r = { club, era, seed: 2, seasons: 1, opts: QUICK.noCoach };
    const h = playCareer(await freshEngine(cm), { ...r, base: true });
    const b = playCareer(await freshEngine(ctx.base), { ...r, base: true });
    bn += 1;
    if (hashOf(h.state) !== hashOf(b.state) || h.draws !== b.draws) { bbad += 1; bfirst ||= `${club} ${era ?? 'now'}`; }
  }
  check(P, `${bn} careers on matchRules 'base': equal to RETIRE_BASE with nothing taken off`, bbad === 0, bbad ? `${bbad} differ; first ${bfirst}` : '');
}

/* ---------------- section hotseat (RETIRE_BASE) ---------------- */
async function hotseatSection(cm, ctx) {
  const P = 'hotseat';
  const SCRIPT = Array.from({ length: 6 }, () => ({ t: 'match', m: 'balanced', talk: null }));
  const from = HS.get(cm).HOT_SEAT_RULES_FROM;
  const dates = [];
  const start = new Date(Date.UTC(2026, 8, 24));
  for (let d = new Date(start); dates.length < 30; d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10));
  const after = [];
  for (let d = new Date(`${from}T00:00:00Z`); after.length < 10; d.setUTCDate(d.getUTCDate() + 1)) after.push(d.toISOString().slice(0, 10));
  let bad = 0, first = '', badAfter = 0, firstAfter = '', carriedRetired = 0, carried = 0, seeded = 0, seedBad = 0, seedFirst = '';
  const rec = REC.get(cm);
  for (const date of [...dates, ...after]) {
    const head = await freshEngine(cm), base = await freshEngine(ctx.base);
    const hs = HS.get(head), hb = HS.get(base);
    const sh = hs.dailyHotSeat(date), sb = hb.dailyHotSeat(date);
    const h = withSeed(11, () => hs.replayHotSeat({ club: sh.club, seed: sh.seed, daily: sh.daily }, SCRIPT));
    const b = withSeed(11, () => hb.replayHotSeat({ club: sb.club, seed: sb.seed, daily: sb.daily }, SCRIPT));
    const before = date < from;
    const hState = before ? h.state : stripRecord(h.state);
    const eq = sh.club === sb.club && hashOf(hState) === hashOf(b.state) && h.points === b.points && JSON.stringify(h.log) === JSON.stringify(b.log);
    if (!eq && before) { bad += 1; first ||= `${date} ${sh.club}`; }
    if (!eq && !before) { badAfter += 1; firstAfter ||= `${date} ${sh.club}`; }
    const handed = hs.handoverState(h);
    carried += 1;
    if ('retired' in handed) carriedRetired += 1;
    if (!hs.canCarryOn(h)) continue;
    /* The carried career's first Club Manager match. */
    let s = handed, got = false;
    for (let i = 0; i < 20 && !got; i++) {
      const r = withSeed(700 + i, () => head.playNextEntry(s, QUICK.coach));
      s = r.state;
      if (r.kind === 'match') got = true;
      if (r.kind === 'seasonOver') break;
    }
    if (!got) continue;
    seeded += 1;
    const stored = s.careerStats.highestScoring;
    const fromBook = rec.highestFromBook(s.h2h, s.careerStats.played);
    if (!same(stored, fromBook)) { seedBad += 1; seedFirst ||= `${date}: stored ${show(stored)}, the book ${show(fromBook)}`; }
  }
  check(P, `every daily before the cutover (${dates.length}, ${dates[0]} to ${dates.at(-1)}) replays exactly as on RETIRE_BASE, nothing taken off`, dates.at(-1) < from && bad === 0, bad ? `${bad} differ, first ${first}` : '');
  check(P, `every daily from the cutover (${after.length}, ${after[0]} on) replays as on RETIRE_BASE once the record is taken off`, badAfter === 0, badAfter ? `${badAfter} differ, first ${firstAfter}` : '');
  check(P, `handoverState never carries retired (${carried} runs)`, carriedRetired === 0 && carried === 40);
  check(P, `a carried run's first Club Manager match seeds the record exactly from the book (${seeded} runs carried on)`, seeded > 0 && seedBad === 0, seedBad ? `${seedBad} wrong; first ${seedFirst}` : `${seeded} seeded`);
}

/* ---------------- section loads (RETIRE_BASE) ---------------- */
const SAVE_KEY = 'dukb-club-manager-save';
async function loadsSection(cm, ctx) {
  const P = 'loads';
  const saves = [];
  const { buildRealSaves } = await import(new URL('./lib/realSaves.mjs', import.meta.url).href);
  const real = await buildRealSaves({ root: RETIRE_BASE, tmpDir: path.join(ctx.folder, 'realSaves') });
  for (const raw of real.fleet['/club-manager'] ?? []) saves.push({ label: 'realSaves', raw });
  const store = new Map();
  globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
  for (const [club, era] of [['Everton', null], ['Barcelona', 'era2015'], ['Liverpool', null]]) {
    for (let seed = 0; seed < 4; seed++) {
      const base = await freshEngine(ctx.base);
      let s = playCareer(base, { club, era, seed, seasons: 3 }).state;
      /* Two and a half seasons: the third is played to its middle week. */
      s = withSeed(seed + 77, () => base.startNextSeason(base.finishSeason(s).state));
      for (let i = 0; i < 25; i++) s = withSeed(seed * 50 + i, () => base.playNextEntry(s, QUICK.coach)).state;
      store.clear();
      withSeed(seed + 1, () => base.saveCareer(seed === 3 ? base.leanCareer(s) : s));
      const raw = store.get(SAVE_KEY);
      if (raw) saves.push({ label: `${club} seed ${seed}${seed === 3 ? ' leaned' : ''}`, raw });
    }
  }
  let bad = 0, first = '', loaded = 0;
  for (const { label, raw } of saves) {
    const head = await freshEngine(cm), base = await freshEngine(ctx.base);
    store.clear(); store.set(SAVE_KEY, raw);
    const h = withSeed(5, () => head.loadCareer());
    store.clear(); store.set(SAVE_KEY, raw);
    const b = withSeed(5, () => base.loadCareer());
    if (h) loaded += 1;
    if (JSON.stringify(h) !== JSON.stringify(b)) { bad += 1; first ||= label; }
  }
  console.log(`   ${saves.length} old saves (${(real.fleet['/club-manager'] ?? []).length} from realSaves), ${loaded} loaded`);
  check(P, 'every old save loads to the same JSON on head and base', saves.length >= 12 && loaded === saves.length && bad === 0, bad ? `${bad} differ, first ${first}` : '');
}

/* ---------------- main ---------------- */
const SECTIONS = { record: recordSection, oldsave: oldsaveSection, pens: pensSection, base: baseSection, retire: retireSection, dashes: dashesSection, fleet: fleetSection, hotseat: hotseatSection, loads: loadsSection };
async function main() {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'simCmRetire-'));
  const lf = s => s.replace(/\r\n/g, '\n');
  let text = lf(await readFile(path.join(root, ENGINE), 'utf8'));
  const recordsSource = lf(await readFile(path.join(root, RECORDS), 'utf8'));
  let recordsText = recordsSource;
  const retireSource = lf(await readFile(path.join(root, RETIRE), 'utf8'));
  let retireText = retireSource;
  const spec = CONTROLS[CONTROL];
  if (spec?.from !== undefined) {
    const which = spec.file === RECORDS ? recordsText : spec.file === RETIRE ? retireText : text;
    const n = which.split(spec.from).length - 1;
    if (n !== 1) { console.log(`control ${CONTROL}: its anchor is in ${spec.file} ${n} times, not once; could not run`); process.exit(2); }
    if (spec.file === RECORDS) recordsText = recordsText.replace(spec.from, spec.to);
    else if (spec.file === RETIRE) retireText = retireText.replace(spec.from, spec.to);
    else text = text.replace(spec.from, spec.to);
    console.log(`NEGATIVE CONTROL ON: RETIRE_CONTROL=${CONTROL}, ${spec.file} is a rewritten copy`);
  } else if (CONTROL) console.log(`NEGATIVE CONTROL ON: RETIRE_CONTROL=${CONTROL}`);
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  const cm = await bundleEngine(text, CONTROL || 'head', folder, {
    recordsText: recordsText === recordsSource ? null : recordsText,
    retireText: retireText === retireSource ? null : retireText,
  });
  const ctx = { folder, base: null, pens: null };
  const needsBase = PARTS.some(p => BASE_PARTS.includes(p));
  if (needsBase && !RETIRE_BASE) { console.log(`sections ${PARTS.filter(p => BASE_PARTS.includes(p)).join(', ')} need RETIRE_BASE, a checkout of the branch point; could not run`); process.exit(2); }
  if (RETIRE_BASE) ctx.base = await bundleEngine(lf(await readFile(path.join(RETIRE_BASE, ENGINE), 'utf8')), 'base', folder, { srcRoot: path.join(RETIRE_BASE, 'src') });
  if (!RETIRE_BASE && !CONTROL && !partArg) console.log(`sections ${BASE_PARTS.join(', ')} SKIPPED: they need RETIRE_BASE`);
  for (const part of PARTS) {
    if (!SECTIONS[part]) { console.log(`unknown part ${part}`); process.exit(2); }
    console.log(`== ${part}`);
    await SECTIONS[part](cm, ctx);
  }
  const red = results.filter(r => !r.ok);
  if (CONTROL) {
    if (red.length) { console.log(`control ${CONTROL} FIRED: ${red.length} of ${results.length} checks red`); process.exit(1); }
    console.log(`control ${CONTROL} DID NOT FIRE: all ${results.length} checks stayed green`); process.exit(3);
  }
  if (!results.length) { console.log('no check ran; could not run'); process.exit(2); }
  console.log(red.length ? `simCmRetire: ${red.length} of ${results.length} checks FAILED` : `simCmRetire: all ${results.length} checks passed (${PARTS.join(', ')})`);
  process.exit(red.length ? 1 : 0);
}
main().catch(e => { console.log(`simCmRetire could not run: ${e?.stack ?? e}`); process.exit(2); });
