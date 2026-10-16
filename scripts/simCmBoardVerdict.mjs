/* Round 1335: Club Manager's board reads the season you had, and the job market.

   Bundles the real engine (src/lib/clubManager.ts, with src/lib/clubManagerCalendar.ts and
   src/lib/managerHotSeat.ts beside it) the way simCmSubs does and plays it. Sections, chosen with
   --part=a,b:
     measure   step 0, on CM_BOARD_BASE when it is set (the commit this branch started from), else on
               this tree: where BOARD_FRESH and KITTY_TOP_SHARE come from. MEASURE=falls,rollover,
               offers,takeover picks its fleets (default all). Prints, never asserts:
                 falls     fleet A, fresh careers of every tier in every era (five) and the modern
                           leagues, the first competitive match played by quick sim with the coach: the
                           board's fall when that match is lost, by tier, by era and pooled (the 95th
                           percentile is BOARD_FRESH's recipe: BOARD_SAFE plus it, rounded up).
                 rollover  the title fleet (three seasons, two policies): the flat allocation over the
                           club's budget by tier (median, 90th, 99th percentile; KITTY_TOP_SHARE is the
                           smallest multiple of 0.05 at or above the 99th of tiers 1 and 2), the A or B
                           seasons that open under Safe, the title seasons that do, the promotions graded
                           C or worse (a promotion sub fleet of second tier clubs expected in the top four
                           joins it).
                 offers    the tier 4 fleet (the weakest club of every league, two seasons) and the title
                           fleet: the seasons offered a club two or more tiers up.
                 takeover  startMidSeason at autumn, newYear and runIn for twelve clubs of three worlds:
                           the handovers that carry a failed objective.

     pure      the module over full grids (positions and expectations 1 to 24, trophies 0 to 3, every fate,
               budgets 2 to 250): no fate grades as the base's own ladder (cut from CM_BOARD_BASE's source and
               evaluated), 'up' A or B, 'down' C or worse (B with a trophy), 'escape' keeps its grade; an A or
               B opens at BOARD_FRESH or more, a D or F at 59 or less, always 35 to 82; the weights; the kitty
               never above its band and equal to the flat formula inside it; the offer step's table;
               BOARD_SAFE_LINE equals clubManagerMeters' BOARD_SAFE. Controls safeline, upgrade, band.
     grade     the grade fleet (the title fleet with both policies, every 2026-27 second tier club expected in
               its top four, the bottom four of every paired top flight; GRADE_SEEDS seeds, two seasons;
               SHARD=k/n splits it): every promotion A or B with an 'up' line naming the top flight, every
               relegation C or worse (B with a trophy) with a 'down' line, every escape its grade with an
               'escape' line, the statues and murals only on a title or two trophies, every other season the
               base ladder with a line of the base VERDICTS. The fate is read off the rollover itself (which
               league the old club plays next), never off the summary. Controls nofate, statues.
     fate      the same fleet: the summary's fate (and the season record's) is the move the rollover made.
               Controls fateflip, fatecount (prints the finishes at exactly count plus one it needs).
     stream    the same fleet: at every season end both trees get the same state and the same seeded draws;
               finishSeason draws the same number of times and writes the same save but for the grade, the
               line, the fate and (only where a base offer was outside the step) the offers.
     legacy    careers in 2005-06, 2015-16 and 2026-27 (named clubs plus a tier 3 and a tier 4 club; seeds
               LEGACY_SEEDS, LEGACY_SEASONS seasons, both policies) with matchRules 'base' on BOTH trees and
               the fresh opening at the old 60: every save byte and every draw equal to CM_BOARD_BASE.
               Control legacyleak (legacySeason answers false on the head).

   Engine controls: SIM_CM_BOARD_CONTROL=<name> with --part=<its section>; each patches this tree's copy in
   memory, its anchor asserted present exactly once first, and must end FIRED with exit 1.
   Exit 0 green or measured, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const CAL_FILE = 'src/lib/clubManagerCalendar.ts';
const HS_FILE = 'src/lib/managerHotSeat.ts';
const BASE = process.env.CM_BOARD_BASE ?? '';
const CONTROL = process.env.SIM_CM_BOARD_CONTROL ?? '';
const partArg = process.argv.find(a => a.startsWith('--part='));
const PARTS = partArg ? partArg.slice(7).split(',').filter(Boolean) : ['measure'];
const num = (k, d) => Number(process.env[k] ?? d);

/** Every draw any seeded call made, so two engines can be held to the same count. */
export const DRAWS = { n: 0 };
export function withSeed(seed, fn) {
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
function check(part, name, ok, detail = '') {
  results.push({ part, name, ok: !!ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${part}] ${name}${detail ? ` (${detail})` : ''}`);
}
export function pct(values, p) {
  if (!values.length) return NaN;
  const v = [...values].sort((x, y) => x - y);
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
}
const fmt = x => (Number.isFinite(x) ? (Math.round(x * 100) / 100).toString() : 'n/a');

const require = createRequire(import.meta.url);
/** The engine with the calendar and Manager Hot Seat beside it. `srcRoot` is the src tree everything
 *  comes from (CM_BOARD_BASE's for the base arm); `texts` holds patched copies of the three files. */
async function bundleArm(name, folder, srcRoot, texts = {}) {
  const alias = { '@': srcRoot };
  for (const [rel, text] of Object.entries(texts)) {
    const file = path.join(folder, `${name}-${path.basename(rel)}`);
    await writeFile(file, text);
    alias[`@/lib/${path.basename(rel, '.ts')}`] = file;
  }
  const entry = path.join(folder, `${name}-entry.ts`);
  const output = path.join(folder, `${name}.cjs`);
  const withModule = existsSync(path.join(srcRoot, 'lib/clubManagerBoardVerdict.ts'));
  await writeFile(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\nexport * as hs from '@/lib/managerHotSeat';\n"
    + "export * as dd from '@/lib/deadlineDay';\n"
    + (withModule ? "export * as bv from '@/lib/clubManagerBoardVerdict';\n" : ''));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias, nodePaths: [path.join(root, 'node_modules')] });
  const mod = require(output);
  await mod.cm.ensureAllEraRosters();
  return { ...mod, output, name };
}
/** A fresh copy of an arm, the way a page load gets one: the engine keeps counters at module level, so two
 *  engines compared byte for byte each start every career from a fresh module. */
async function freshArm(arm) {
  delete require.cache[require.resolve(arm.output)];
  const mod = require(arm.output);
  await mod.cm.ensureAllEraRosters();
  return { ...mod, output: arm.output, name: arm.name };
}
const clone = v => JSON.parse(JSON.stringify(v));
const hashOf = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
/** A fleet split for parallel runner lines: SHARD=k/n keeps every n-th entry from the k-th. */
function shard(list) {
  const m = /^(\d+)\/(\d+)$/.exec(process.env.SHARD ?? '');
  return m ? list.filter((_, i) => i % Number(m[2]) === Number(m[1])) : list;
}
/** A source file with its line endings read as LF, so one anchor matches on a Windows checkout too. */
async function readSource(tree, rel) {
  return (await readFile(path.join(tree, rel), 'utf8')).replace(/\r\n/g, '\n');
}
/** One patch, its anchor asserted present exactly once first. */
function patchOnce(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`${what}: its anchor is in the file ${n} times, not once; could not run`); process.exit(2); }
  return text.replace(from, to);
}

/* ---------------- fleets ---------------- */
const QUICK = { skipHalftime: true };
const ERAS = ['era2005', 'era2010', 'era2015', 'era2020', null];
const eraLabel = era => era ?? 'now';
/** Every playable club of a world with its def (tier, expectation, budget), sorted by name. */
function worldClubs(cm, era) {
  const defs = era
    ? (cm.ERA_LEAGUES[era] ?? []).flatMap(l => l.clubs.map(c => cm.eraClubDefFor(c, era)))
    : cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id));
  return defs.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
const defOf = (cm, era, name) => (era ? cm.eraClubDefFor(name, era) : cm.clubDefFor(name));
/** k clubs of one tier, spread evenly over the sorted list, so the pick is fixed and covers the tier. */
function spreadPick(list, k) {
  if (list.length <= k) return list;
  return Array.from({ length: k }, (_, i) => list[Math.floor((i * list.length) / k)]);
}
const startOf = (cm, club, era, seed) => withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
/** One season played by quick sim with the coach; stops early on a sacking. */
function playSeason(cm, s, seedBase, opts = QUICK, after = null) {
  for (let i = 0; i < 160; i++) {
    const r = withSeed(seedBase + i + 1, () => cm.playNextEntry(s, opts));
    s = r.state;
    if (after) after(s);
    if (s.sacked) return { s, sacked: true };
    if (r.kind === 'seasonOver') return { s, sacked: false };
  }
  return { s, sacked: false, stuck: true };
}
/** The first competitive match of a fresh career: was it lost, and what did it cost the board. */
function firstMatch(cm, s, seed) {
  for (let i = 0; i < 30; i++) {
    const before = s.boardConfidence;
    const r = withSeed(seed * 101 + i + 1, () => cm.playNextEntry(s, QUICK));
    s = r.state;
    if (r.kind === 'match') {
      const rep = r.report;
      return { lost: !rep.won && !rep.drawn, fall: Math.round((before - s.boardConfidence) * 10) / 10, before, after: s.boardConfidence, comp: rep.competition };
    }
    if (r.kind === 'seasonOver') break;
  }
  return null;
}

/** A career of `seasons` seasons under one policy ('stay' never takes an offer, 'first' takes the first).
 *  `onRoll` sees every season end: the finished state, its summary, the rolled state and the policy's pick. */
function playCareer(cm, { club, era, seed, seasons, policy }, onRoll, hooks = {}) {
  let s = startOf(cm, club, era, seed);
  hooks.fresh?.(s);
  for (let season = 0; season < seasons; season++) {
    const played = playSeason(cm, s, seed * 7919 + season * 997, QUICK, hooks.step);
    if (played.sacked || played.stuck) return { sacked: played.sacked, stuck: !!played.stuck, seasons: season, state: played.s };
    const finSeed = seed * 31 + season + 3;
    hooks.beforeFinish?.(played.s, finSeed);
    const fin = withSeed(finSeed, () => cm.finishSeason(played.s));
    hooks.step?.(fin.state);
    const take = policy === 'first' ? fin.summary.offers[0]?.club : undefined;
    const table = cm.sortedLeagueTable(fin.state).map(r => r.club);
    const ctx = { club: fin.state.clubName, era, seed, season, policy, finState: fin.state, summary: fin.summary,
      leagueBefore: cm.careerLeagueOf(fin.state).id, def: defOf(cm, era, fin.state.clubName), size: table.length, last: table[table.length - 1],
      offerTiers: fin.summary.offers.map(o => defOf(cm, era, o.club)?.tier ?? 0) };
    const rollSeed = seed * 31 + season + 5;
    hooks.beforeRoll?.(fin.state, take, rollSeed);
    const next = withSeed(rollSeed, () => cm.startNextSeason(fin.state, take));
    hooks.step?.(next);
    onRoll?.({ ...ctx, next, moving: next.clubName !== fin.state.clubName, leagueAfter: cm.careerLeagueOf(next).id,
      oldClubAfter: era ? null : cm.leagueOf(ctx.club)?.id, lastAfter: era ? null : cm.leagueOf(ctx.last)?.id });
    s = next;
  }
  return { sacked: false, stuck: false, seasons, state: s };
}
const TITLE_FLEET = [
  ['Liverpool', null], ['Real Madrid', null], ['Bayern Munich', null], ['Celtic', null], ['Arsenal', null],
  ['Brighton', null], ['West Ham', null], ['OB', null], ['Leicester City', 'era2015'], ['Juventus', 'era2015'],
  ['Chelsea', 'era2005'], ['Everton', 'era2005'],
];
const SECOND_TIERS = ['championship', 'bundesliga2', 'serieb', 'ligue2', 'segunda'];
/* The fleets read the static memberships: a career played before leaves its summer registered, and a
   club it relegated would otherwise be picked as a second tier club. */
export function promoFleet(cm) {
  cm.registerLeagueOverrides(null);
  return SECOND_TIERS.flatMap(lg => cm.playableClubs(lg).filter(d => d.expectation <= 4));
}
export function tier4Fleet(cm) {
  cm.registerLeagueOverrides(null);
  return cm.REAL_LEAGUES.map(lg => [...cm.playableClubs(lg.id)].sort((a, b) => b.expectation - a.expectation || a.name.localeCompare(b.name))[0]).filter(Boolean);
}
/** The fate a rolled season had, read from the leagues on both sides of the summer (measure only). */
function observedFate(cm, r) {
  if (r.era) return null;
  const up = cm.PYRAMIDS.find(p => p.second === r.leagueBefore);
  const top = cm.PYRAMIDS.find(p => p.top === r.leagueBefore);
  if (up && r.oldClubAfter === up.top) return 'up';
  if (top && r.oldClubAfter === top.second) return 'down';
  /* Stayed up against the odds: the pair really swapped (the bottom club went down), the club was expected
     in the drop zone and finished outside it. */
  if (top && r.lastAfter === top.second && r.def.expectation > r.size - top.count && r.summary.position <= r.size - top.count) return 'escape';
  return null;
}
function fateChecks(arm, rolls) {
  const P = 'fate';
  const { cm } = arm;
  const counts = { up: 0, down: 0, escape: 0, none: 0 };
  let edge = 0;
  const bad = [], hist = [];
  for (const r of rolls) {
    const want = observedFate(cm, r);
    const got = r.summary.fate ?? null;
    counts[want ?? 'none'] += 1;
    if (got !== want) bad.push(`${r.club} ${eraLabel(r.era)} seed ${r.seed} season ${r.season + 1}: ${r.summary.position} of ${r.size} in ${r.leagueBefore}, summary ${got}, the rollover ${want}`);
    const row = (r.finState.history ?? []).find(h => h.season === r.summary.season);
    if ((row?.fate ?? null) !== got) hist.push(r.club);
    const up = cm.PYRAMIDS.find(p => p.second === r.leagueBefore), top = cm.PYRAMIDS.find(p => p.top === r.leagueBefore);
    if ((up && r.summary.position === up.count + 1) || (top && r.summary.position === r.size - top.count)) edge += 1;
  }
  console.log(`[fate] ${rolls.length} season ends: up ${counts.up}, down ${counts.down}, escape ${counts.escape}, none ${counts.none}; ${edge} finishes at exactly the count plus one (the cases fatecount needs)`);
  check(P, 'the summary fate is the move the rollover really made, on every season end', bad.length === 0 && counts.up > 0 && counts.down > 0, bad.length ? `${bad.length}; first ${bad[0]}` : '');
  check(P, 'the season record carries the same fate as the summary', hist.length === 0, hist.length ? `${hist.length}; first ${hist[0]}` : '');
}
/** Section stream (finishSeason): both trees handed the same state and the same seeded draws. */
const PRE_YES = /^(\u{1F91D}|\u{2705})/u;
function streamHook(head, base, acc) {
  return (s, finSeed) => {
    const S = clone(s);
    DRAWS.n = 0;
    const h = withSeed(finSeed, () => head.cm.finishSeason(clone(S)));
    const hn = DRAWS.n;
    base.cm.registerLeagueOverrides(S.leagueOverrides ?? null);
    base.cm.registerCustomClub(null);
    DRAWS.n = 0;
    const b = withSeed(finSeed, () => base.cm.finishSeason(clone(S)));
    const bn = DRAWS.n;
    acc.n += 1;
    const tag = `${S.clubName} season ${S.season}`;
    if (hn !== bn) acc.draws.push(`${tag}: head ${hn}, base ${bn}`);
    const era = S.eraId && S.eraId !== 'now' ? S.eraId : null;
    const myTier = defOf(base.cm, era, S.clubName)?.tier ?? 0;
    const roll = { summary: b.summary, leagueBefore: base.cm.careerLeagueOf(S).id };
    const big = bigSeason(base.cm, roll);
    const inStep = b.summary.offers.filter(o => !PRE_YES.test(o.blurb)).every(o => (defOf(base.cm, era, o.club)?.tier ?? 9) >= myTier - (big ? 2 : 1));
    if (!inStep) acc.outside += 1;
    if (JSON.stringify(maskFinish(h, inStep)) !== JSON.stringify(maskFinish(b, inStep))) acc.diff.push(`${tag}: ${firstDiff(maskFinish(h, inStep), maskFinish(b, inStep))}`);
    if (inStep && JSON.stringify(h.summary.offers) !== JSON.stringify(b.summary.offers)) acc.offers.push(tag);
  };
}
function maskFinish(o, keepOffers) {
  const c = clone(o);
  for (const sm of [c.summary, c.state?.pendingSummary]) {
    if (!sm) continue;
    delete sm.verdictGrade; delete sm.verdict; delete sm.fate;
    if (!keepOffers) delete sm.offers;
  }
  for (const h of c.state?.history ?? []) delete h.fate;
  return c;
}
/** The first path where two plain values differ, for a readable red. */
function firstDiff(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return '';
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${at}.${k}`);
      if (d) return d;
    }
  }
  return `${at || '(root)'}: head ${JSON.stringify(a)?.slice(0, 80)} base ${JSON.stringify(b)?.slice(0, 80)}`;
}
function streamChecks(acc) {
  const P = 'stream';
  console.log(`[stream] ${acc.n} season ends handed to both trees; ${acc.outside} had a base offer outside the step`);
  check(P, 'finishSeason draws the same number of times on head and base from the same state', acc.n > 0 && acc.draws.length === 0, acc.draws.length ? `${acc.draws.length}; first ${acc.draws[0]}` : '');
  check(P, 'and writes the same save but for the grade, the line, the fate and an offer outside the step', acc.diff.length === 0, acc.diff.length ? `${acc.diff.length}; first ${acc.diff[0]}` : '');
  check(P, 'the offers are equal wherever every base offer was within the step', acc.offers.length === 0, acc.offers.length ? `${acc.offers.length}; first ${acc.offers[0]}` : '');
}

/* ---------------- section measure (step 0) ---------------- */
const MEASURE = (process.env.MEASURE ?? 'falls,rollover,offers,takeover').split(',');
const KITTY_PROBE_FROM = '  const allocation = moving\n';
const KITTY_PROBE_TO = '  globalThis.__cmKitty?.push({ moving, budget: club.budget, expectation: club.expectation, prevPos, trophies: seasonTrophyCount, tier: club.tier });\n  const allocation = moving\n';
function spreadLine(label, values) {
  return `${label}: n ${values.length}, median ${fmt(pct(values, 50))}, p90 ${fmt(pct(values, 90))}, p95 ${fmt(pct(values, 95))}, p99 ${fmt(pct(values, 99))}`;
}
function measureFalls(arm) {
  const { cm } = arm;
  const clubsK = num('FALL_CLUBS', 4), seeds = num('FALL_SEEDS', 40), seed0 = num('FALL_SEED0', 0);
  const falls = [];
  let starts = 0, noMatch = 0;
  const befores = new Set();
  for (const era of ERAS) {
    const all = worldClubs(cm, era);
    for (const tier of [1, 2, 3, 4]) {
      for (const c of spreadPick(all.filter(d => d.tier === tier), clubsK)) {
        for (let k = 0; k < seeds; k++) {
          const seed = seed0 + k * 977 + tier * 13;
          const m = firstMatch(cm, startOf(cm, c.name, era, seed), seed);
          starts += 1;
          if (!m) { noMatch += 1; continue; }
          befores.add(m.before);
          if (m.lost) falls.push({ era: eraLabel(era), tier, fall: m.fall, club: c.name, comp: m.comp });
        }
      }
    }
  }
  console.log(`[measure falls] ${starts} fresh careers (${clubsK} clubs a tier a world, ${seeds} seeds each, seed0 ${seed0}), ${noMatch} with no match, openings seen ${[...befores].join(', ')}`);
  for (const tier of [1, 2, 3, 4]) console.log(`  ${spreadLine(`tier ${tier}`, falls.filter(f => f.tier === tier).map(f => f.fall))}`);
  for (const era of ERAS) console.log(`  ${spreadLine(`era ${eraLabel(era)}`, falls.filter(f => f.era === eraLabel(era)).map(f => f.fall))}`);
  const all = falls.map(f => f.fall);
  console.log(`  ${spreadLine('pooled lost openers', all)}`);
  console.log(`  by competition: ${['league', 'cup', 'uclGroup', 'uclKo'].map(c => `${c} ${falls.filter(f => f.comp === c).length}`).join(', ')}`);
  console.log(`  BOARD_FRESH recipe: 60 + ceil(pooled p95 ${fmt(pct(all, 95))}) = ${60 + Math.ceil(pct(all, 95))}`);
  return { falls };
}
function rollStats(cm, rolls, label) {
  const stays = rolls.filter(r => !r.moving);
  const ab = stays.filter(r => r.summary.verdictGrade === 'A' || r.summary.verdictGrade === 'B');
  const b = stays.filter(r => r.summary.verdictGrade === 'B');
  const titles = stays.filter(r => r.summary.position === 1);
  const under = list => list.filter(r => r.next.boardConfidence < 60).length;
  const ups = stays.filter(r => observedFate(cm, r) === 'up');
  const downs = stays.filter(r => observedFate(cm, r) === 'down');
  const upLow = ups.filter(r => ['C', 'D', 'F'].includes(r.summary.verdictGrade));
  console.log(`[measure ${label}] ${rolls.length} season ends, ${stays.length} stays, ${rolls.length - stays.length} moves`);
  console.log(`  A or B stays opening under Safe: ${under(ab)} of ${ab.length}; grade B: ${under(b)} of ${b.length}; title seasons: ${under(titles)} of ${titles.length}`);
  console.log(`  promotions ${ups.length}, graded C or worse ${upLow.length}${upLow.length ? ` (first ${upLow[0].club} ${eraLabel(upLow[0].era)} seed ${upLow[0].seed}: ${upLow[0].summary.position}th, ${upLow[0].summary.verdictGrade})` : ''}; relegations ${downs.length}`);
  const openings = stays.map(r => r.next.boardConfidence);
  console.log(`  ${spreadLine('stay openings', openings)}`);
}
function offerTiers(cm, roll) {
  return roll.summary.offers
    .filter(o => !/^(\u{1F91D}|\u{2705})/u.test(o.blurb))
    .map(o => ({ club: o.club, tier: defOf(cm, roll.era, o.club)?.tier ?? 0 }));
}
function measureOffers(cm, rolls, label) {
  let seasonsUp2 = 0, seasonsOffered = 0, offers = 0, up2 = 0;
  const examples = [];
  for (const r of rolls) {
    const mine = r.def.tier;
    const list = offerTiers(cm, r);
    if (!list.length) continue;
    seasonsOffered += 1;
    offers += list.length;
    const far = list.filter(o => mine - o.tier >= 2);
    up2 += far.length;
    if (far.length) { seasonsUp2 += 1; if (examples.length < 3) examples.push(`${r.club} (tier ${mine}) offered ${far.map(o => `${o.club} (tier ${o.tier})`).join(', ')}`); }
  }
  console.log(`[measure offers ${label}] ${seasonsOffered} seasons with offers, ${offers} offers; ${seasonsUp2} seasons and ${up2} offers two or more tiers up${examples.length ? `; e.g. ${examples.join('; ')}` : ''}`);
}
function measureRollover(arm) {
  const { cm } = arm;
  const seeds = num('TITLE_SEEDS', 10), seasons = num('TITLE_SEASONS', 3);
  const rolls = [], kitty = [];
  globalThis.__cmKitty = [];
  let sacked = 0, careers = 0;
  for (const [club, era] of TITLE_FLEET) {
    for (let seed = 0; seed < seeds; seed++) {
      for (const policy of ['stay', 'first']) {
        careers += 1;
        const out = playCareer(cm, { club, era, seed, seasons, policy }, roll => {
          const k = globalThis.__cmKitty.pop();
          globalThis.__cmKitty.length = 0;
          if (k && !k.moving) kitty.push({ ...k, club: roll.club });
          rolls.push(roll);
        });
        if (out.sacked) sacked += 1;
      }
    }
  }
  console.log(`[measure rollover] title fleet: ${careers} careers, ${sacked} sacked before the end`);
  rollStats(cm, rolls, 'title fleet');
  measureOffers(cm, rolls, 'title fleet');
  /* The promotion sub fleet: every 2026-27 second tier club expected in its top four, one season. */
  const promoRolls = [];
  const promoSeeds = num('PROMO_SEEDS', 5);
  for (const c of promoFleet(cm)) {
    {
      for (let seed = 0; seed < promoSeeds; seed++) {
        playCareer(cm, { club: c.name, era: null, seed: 300 + seed, seasons: 1, policy: 'stay' }, roll => {
          const k = globalThis.__cmKitty.pop();
          globalThis.__cmKitty.length = 0;
          if (k && !k.moving) kitty.push({ ...k, club: roll.club });
          promoRolls.push(roll);
        });
      }
    }
  }
  rollStats(cm, promoRolls, 'promotion fleet');
  /* The kitty: the flat allocation over the club's own budget, by tier, staying rollovers only. */
  const flatOf = k => Math.max(10, Math.round(k.budget + (k.expectation - k.prevPos) * 2 + k.trophies * 12));
  for (const tier of [1, 2, 3, 4]) {
    const t = kitty.filter(k => k.tier === tier).map(k => flatOf(k) / k.budget);
    console.log(`  kitty ${spreadLine(`tier ${tier} flat over budget`, t)}`);
  }
  const top = kitty.filter(k => k.tier <= 2).map(k => flatOf(k) / k.budget);
  const share = Math.ceil(pct(top, 99) / 0.05 - 1e-9) * 0.05;
  console.log(`  KITTY_TOP_SHARE recipe: smallest multiple of 0.05 at or above the tier 1 and 2 p99 ${fmt(pct(top, 99))} = ${fmt(share)}`);
  for (const tier of [1, 2, 3, 4]) {
    const t = kitty.filter(k => k.tier === tier);
    const bound = t.filter(k => flatOf(k) > Math.max(10, share * k.budget));
    console.log(`  the band at ${fmt(share)} would bind ${bound.length} of ${t.length} tier ${tier} rollovers (${bound.filter(k => k.trophies > 0).length} of them with a trophy)`);
  }
  return { rolls, kitty };
}
function measureTier4(arm) {
  const { cm } = arm;
  const seeds = num('OFFER_SEEDS', 8);
  const rolls = [];
  for (const weakest of tier4Fleet(cm)) {
    for (let seed = 0; seed < seeds; seed++) playCareer(cm, { club: weakest.name, era: null, seed: 700 + seed, seasons: 2, policy: 'stay' }, roll => rolls.push(roll));
  }
  console.log(`[measure offers] tier 4 fleet: ${rolls.length} season ends over ${cm.REAL_LEAGUES.length} leagues`);
  measureOffers(cm, rolls, 'tier 4 fleet');
  return { rolls };
}
const TAKEOVER_WORLDS = [['era2005', ['Everton', 'Chelsea']], ['era2015', ['Leicester City', 'Juventus']], [null, ['Liverpool', 'Brighton', 'OB', 'Everton']]];
function takeoverClubs(cm) {
  const out = [];
  for (const [era, named] of TAKEOVER_WORLDS) {
    const all = worldClubs(cm, era);
    const extra = spreadPick(all.filter(d => d.tier >= 3 && !named.includes(d.name)), 4 - Math.min(4, named.length));
    for (const name of [...named, ...extra.map(d => d.name)]) out.push({ club: name, era });
  }
  return out;
}
function measureTakeover(arm) {
  const { cm, cal } = arm;
  const seeds = num('TAKEOVER_SEEDS', 5);
  let n = 0, failed = 0;
  const examples = [];
  for (const { club, era } of takeoverClubs(cm)) {
    for (const entry of ['autumn', 'newYear', 'runIn']) {
      for (let seed = 0; seed < seeds; seed++) {
        const fresh = startOf(cm, club, era, 900 + seed);
        const t = withSeed(900 + seed * 7 + 1, () => cal.startMidSeason(fresh, entry));
        n += 1;
        const bad = cm.objectiveStatuses(t).filter(x => x.status === 'failed');
        if (bad.length) { failed += 1; if (examples.length < 3) examples.push(`${club} ${eraLabel(era)} ${entry} seed ${seed}: ${bad.map(x => x.objective.label).join('; ')}`); }
      }
    }
  }
  console.log(`[measure takeover] ${n} handovers (startMidSeason), ${failed} carry a failed objective${examples.length ? `; e.g. ${examples.join(' | ')}` : ''}`);
}

/* ---------------- sections grade, fate and stream (step 2 on) ---------------- */
function bottomFleet(cm) {
  cm.registerLeagueOverrides(null);
  return cm.PYRAMIDS.flatMap(p => [...cm.playableClubs(p.top)].sort((a, b) => b.expectation - a.expectation || a.name.localeCompare(b.name)).slice(0, 4));
}
/** The grade fleet: the title fleet (both policies), every 2026-27 second tier club expected in its top four
 *  and the bottom four by expectation of every paired top flight, GRADE_SEEDS seeds, two seasons. */
function gradeFleet(cm) {
  const promo = promoFleet(cm), bottom = bottomFleet(cm), out = [];
  for (let seed = 0; seed < num('GRADE_SEEDS', 10); seed++) {
    for (const [club, era] of TITLE_FLEET) for (const policy of ['stay', 'first']) out.push({ club, era, seed, seasons: 2, policy });
    for (const c of [...promo, ...bottom]) out.push({ club: c.name, era: null, seed, seasons: 2, policy: 'stay' });
  }
  return shard(out);
}
function baseVerdicts(baseText) {
  const from = "const VERDICTS: Record<'A' | 'B' | 'C' | 'D' | 'F', string[]> = ";
  const a = baseText.indexOf(from);
  const b = baseText.indexOf('\n};', a);
  if (a < 0 || b < 0) { console.log('the base VERDICTS are not in CM_BOARD_BASE\'s engine; could not run'); process.exit(2); }
  return new Function(`return ${baseText.slice(a + from.length, b + 2)};`)();
}
const leagueName = (cm, id) => cm.REAL_LEAGUES.find(l => l.id === id)?.name ?? id;
const bigSeason = (cm, r) => (r.summary.position === 1 && !cm.PYRAMIDS.some(p => p.second === r.leagueBefore)) || (r.summary.trophies ?? []).includes('Champions League');
function gradeChecks(arm, rolls, ctx) {
  const P = 'grade';
  const { cm, bv } = arm;
  const ladder = ladderOracle(ctx.baseText);
  const verdicts = baseVerdicts(ctx.baseText);
  const n = { up: 0, down: 0, escape: 0, over: 0, plain: 0, title: 0 };
  const bad = { up: [], down: [], escape: [], statues: [], plain: [], a: [] };
  let baseUpLow = 0, capChanged = 0;
  for (const r of rolls) {
    const fate = observedFate(cm, r);
    const s = r.summary;
    const trophies = s.trophies ?? [];
    const old = ladder(trophies, s.position, r.def.expectation - s.position);
    const tag = `${r.club} ${eraLabel(r.era)} seed ${r.seed} season ${r.season + 1}: ${s.position} of ${r.size}, ${s.verdictGrade} '${s.verdict}'`;
    if (fate === 'up') {
      n.up += 1;
      const pair = cm.PYRAMIDS.find(p => p.second === r.leagueBefore);
      const lines = bv.VERDICT_LINES.up.map(l => bv.fillLeague(l, cm.toLeague(leagueName(cm, pair.top))));
      if (!['A', 'B'].includes(s.verdictGrade) || !lines.includes(s.verdict)) bad.up.push(tag);
      if (['C', 'D', 'F'].includes(old)) baseUpLow += 1;
    } else if (fate === 'down') {
      n.down += 1;
      const pair = cm.PYRAMIDS.find(p => p.top === r.leagueBefore);
      const lines = bv.VERDICT_LINES.down.map(l => bv.fillLeague(l, cm.toLeague(leagueName(cm, pair.second))));
      const cap = trophies.length ? 'B' : 'C';
      if (!worse(s.verdictGrade, cap) || !lines.includes(s.verdict)) bad.down.push(tag);
      if (!worse(old, cap)) capChanged += 1;
    } else if (fate === 'escape') {
      n.escape += 1;
      if (!bv.VERDICT_LINES.escape.includes(s.verdict) || s.verdictGrade !== old) bad.escape.push(tag);
    } else if (old === 'A') {
      const titled = s.position === 1 || trophies.includes('Champions League') || trophies.length >= 2;
      if (titled) n.title += 1; else n.over += 1;
      if (s.verdictGrade !== 'A' || !(titled ? verdicts.A : bv.VERDICT_LINES.over).includes(s.verdict)) bad.a.push(tag);
    } else {
      n.plain += 1;
      if (s.verdictGrade !== old || !(verdicts[old] ?? []).includes(s.verdict)) bad.plain.push(tag);
    }
    if (/statue|mural/i.test(s.verdict) && !(s.position === 1 || trophies.includes('Champions League') || trophies.length >= 2)) bad.statues.push(tag);
  }
  console.log(`[grade] ${rolls.length} season ends: up ${n.up}, down ${n.down}, escape ${n.escape}, A by a title or two trophies ${n.title}, A by overshoot alone ${n.over}, B to F with no fate ${n.plain}`);
  console.log(`  on the base ladder these same seasons: ${baseUpLow} promotions graded C or worse; the relegation cap changes ${capChanged} grades`);
  const say = list => (list.length ? `${list.length}; first ${list[0]}` : '');
  check(P, "every promotion grades A or B with an 'up' line naming the top flight", n.up > 0 && bad.up.length === 0, say(bad.up) || `${n.up} cases`);
  check(P, "every relegation grades C or worse (B or worse with a trophy) with a 'down' line naming the league below", bad.down.length === 0, say(bad.down) || `${n.down} cases`);
  check(P, "every escape keeps its grade with an 'escape' line", bad.escape.length === 0, say(bad.escape) || `${n.escape} cases`);
  check(P, 'an A by a title or two trophies reads the old A lines, an A by overshoot alone the over line', bad.a.length === 0, say(bad.a) || `${n.title + n.over} cases`);
  check(P, 'the statues and the murals only on a title or two trophies', bad.statues.length === 0, say(bad.statues) || `${n.over} seasons could carry them`);
  check(P, 'every B to F season with no fate grades as the base ladder with a line of the old VERDICTS', bad.plain.length === 0, say(bad.plain) || `${n.plain} cases`);
}

/* ---------------- sections offers and dailies (step 3 on) ---------------- */
function approachTracker(cm, list) {
  let last = null;
  return s => {
    const a = s?.approach;
    if (a && a.club !== last) {
      const era = s.eraId && s.eraId !== 'now' ? s.eraId : null;
      list.push({ club: s.clubName, myTier: defOf(cm, era, s.clubName)?.tier ?? 0, suitor: a.club, tier: defOf(cm, era, a.club)?.tier ?? 0 });
    }
    last = a ? a.club : null;
  };
}
const stepOk = (my, their, big) => their >= my - (big ? 2 : 1);
function offersChecks(arm, rolls, approaches, tier4, acc4) {
  const P = 'offers';
  const { cm } = arm;
  let offers = 0, far = 0;
  const bad = [];
  for (const r of [...rolls, ...tier4]) {
    const big = bigSeason(cm, r);
    r.summary.offers.forEach((o, i) => {
      if (PRE_YES.test(o.blurb)) return;
      offers += 1;
      const t = r.offerTiers[i];
      if (r.def.tier - t >= 2) far += 1;
      if (!stepOk(r.def.tier, t, big)) bad.push(`${r.club} (tier ${r.def.tier}, ${r.summary.position} of ${r.size}${big ? ', big' : ''}) offered ${o.club} (tier ${t})`);
    });
  }
  check(P, `${offers} summer offers of the fleets: every one within the step (one tier up, two after a top flight title or the Champions League)`, offers > 0 && bad.length === 0, bad.length ? `${bad.length}; first ${bad[0]}` : `${far} of them two tiers up after a big season`);
  const badA = approaches.filter(a => !stepOk(a.myTier, a.tier, false));
  check(P, `${approaches.length} mid season approaches: every one from at most one tier above`, badA.length === 0, badA.length ? `${badA.length}; first ${badA[0].club} (tier ${badA[0].myTier}) approached by ${badA[0].suitor} (tier ${badA[0].tier})` : '');
  /* Exhaustive, no sampling: every world's tier 2 to 4 club has a club exactly one tier up in its pool, so
     the approach's filter never empties a list the old code drew from. */
  let clubs = 0;
  const empty = [];
  for (const era of ERAS) {
    const all = worldClubs(cm, era);
    for (const c of all.filter(d => d.tier >= 2)) {
      clubs += 1;
      if (!all.some(d => d.name !== c.name && d.tier === c.tier - 1)) empty.push(`${c.name} ${eraLabel(era)} (tier ${c.tier})`);
    }
  }
  check(P, `${clubs} tier 2 to 4 clubs of every world: each has a club exactly one tier up to be approached by`, clubs > 0 && empty.length === 0, empty.length ? `${empty.length}; first ${empty[0]}` : '');
  console.log(`[offers] the tier 4 fleet: ${tier4.length} season ends; on CM_BOARD_BASE the same season ends were dealt ${acc4.far} offers two or more tiers up in ${acc4.farSeasons} seasons (the cases nostep needs)`);
}
/** The tier 4 fleet's base count: the same season end handed to the base, its offers two or more tiers up. */
function farHook(base, acc) {
  return (s, finSeed) => {
    const S = clone(s);
    base.cm.registerLeagueOverrides(S.leagueOverrides ?? null);
    base.cm.registerCustomClub(null);
    const b = withSeed(finSeed, () => base.cm.finishSeason(S));
    const my = base.cm.clubDefFor(S.clubName)?.tier ?? 0;
    const n = b.summary.offers.filter(o => !PRE_YES.test(o.blurb) && my - (base.cm.clubDefFor(o.club)?.tier ?? 9) >= 2).length;
    acc.far += n;
    if (n) acc.farSeasons += 1;
  };
}
const PHONE = '\u{1F4DE}';
function dayList(from, n, step = 1) {
  const t0 = Date.parse(`${from}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(t0 + i * step * 86400000).toISOString().slice(0, 10));
}
function hsPlay(arm, date) {
  const { hs } = arm;
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  return run;
}
/** A day's whole run with the three suitor fields masked (correction 9): the approach's club and its words,
 *  the headlines that name a suitor, and the log's event lines that open with the phone. */
function maskRun(run) {
  const c = clone({ state: run.state, log: run.log, verdict: run.verdict ?? null, takeover: run.takeover, target: run.target });
  if (c.state.approach) for (const k of ['club', 'blurb', 'leagueName', 'tierLabel']) c.state.approach[k] = 'X';
  c.state.aiHeadlines = (c.state.aiHeadlines ?? []).map(l => (typeof l === 'string' && l.startsWith(PHONE) ? PHONE : l));
  for (const m of c.log ?? []) m.events = (m.events ?? []).map(e => (typeof e === 'string' && e.startsWith(PHONE) ? PHONE : e));
  return c;
}
function ddPlay(arm, date) {
  const { dd } = arm;
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.startDeadlineDay(setup);
  const grade = dd.gradeWindow(dd.endDay(run));
  return hashOf([setup.club, setup.seed, run.needs, run.targets, run.sales, run.startBudget, run.ticker, grade, Object.keys(run.state).sort()]);
}
async function dailiesSection(head, base) {
  const P = 'dailies';
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
  const realNow = Date.now;
  Date.now = () => 1791547200000;
  const hsDates = [...dayList('2026-09-24', num('DAILY_HS', 60)), ...dayList('2026-09-24', num('DAILY_BACK', 20) + 1, -7).slice(1)];
  let same = 0, suitorOnly = 0, approached = 0;
  const moved = [];
  for (const date of hsDates) {
    store.clear();
    const h = hsPlay(await freshArm(head), date);
    store.clear();
    const b = hsPlay(await freshArm(base), date);
    const whole = r => JSON.stringify({ state: r.state, log: r.log, verdict: r.verdict ?? null, takeover: r.takeover, target: r.target });
    if (whole(h) === whole(b)) same += 1;
    else if (JSON.stringify(maskRun(h)) === JSON.stringify(maskRun(b))) suitorOnly += 1;
    else moved.push(`${date}: ${firstDiff(maskRun(h), maskRun(b))}`);
    if (h.state.approach || (h.log ?? []).some(m => (m.events ?? []).some(e => String(e).startsWith(PHONE)))) approached += 1;
  }
  console.log(`[dailies] Hot Seat: ${hsDates.length} dates (60 from 2026-09-24 and every seventh day back); ${same} identical, ${suitorOnly} differ only in a suitor's name, ${moved.length} moved; ${approached} raised an approach`);
  check(P, `${hsDates.length} Hot Seat days: every run equal to CM_BOARD_BASE but for a suitor's name`, moved.length === 0, moved.length ? `${moved.length}; first ${moved[0]}` : '');
  const ddDates = dayList('2026-09-24', num('DAILY_DD', 30));
  const ddMoved = [];
  for (const date of ddDates) {
    store.clear();
    const h = ddPlay(await freshArm(head), date);
    store.clear();
    if (h !== ddPlay(await freshArm(base), date)) ddMoved.push(date);
  }
  check(P, `${ddDates.length} Deadline Day days: the deal, the grade and the state's keys equal to CM_BOARD_BASE`, ddMoved.length === 0, ddMoved.length ? `${ddMoved.length}; first ${ddMoved[0]}` : '');
  Date.now = realNow;
  return { moved: moved.length + ddMoved.length };
}

/* ---------------- section legacy (step 2 on) ---------------- */
const LEGACY_WORLDS = [['era2005', ['Everton']], ['era2015', ['Barcelona']], [null, ['Liverpool', 'West Ham', 'OB']]];
function legacyRuns(cm) {
  cm.registerLeagueOverrides(null);
  const runs = [];
  for (const [era, named] of LEGACY_WORLDS) {
    const all = worldClubs(cm, era).filter(d => !named.includes(d.name));
    const extra = [3, 4].flatMap(t => spreadPick(all.filter(d => d.tier === t), 1)).map(d => d.name);
    for (const club of [...named, ...extra]) {
      for (let seed = 0; seed < num('LEGACY_SEEDS', 5); seed++) for (const policy of ['stay', 'first']) runs.push({ club, era, seed, seasons: num('LEGACY_SEASONS', 3), policy });
    }
  }
  return shard(runs);
}
const strip = s => { const c = clone(s); delete c.matchRules; return c; };
/** One career on one arm with matchRules 'base' set after every step that can drop it, and the fresh
 *  state's opening set to the old 60 (LEGACY_BOARD_START): its end state's hash and its draws. */
function legacyPrint(arm, r) {
  DRAWS.n = 0;
  const setBase = s => { if (s) s.matchRules = 'base'; };
  const out = playCareer(arm.cm, r, null, { fresh: s => { setBase(s); s.boardConfidence = 60; }, step: setBase });
  return { hash: hashOf(strip(out.state)), draws: DRAWS.n, at: `season ${out.state.season} week ${out.state.week}${out.sacked ? ' sacked' : ''}` };
}
async function legacySection(head, base, runs) {
  const P = 'legacy';
  let bad = 0, first = '';
  for (const r of runs) {
    const h = legacyPrint(await freshArm(head), r);
    const b = legacyPrint(await freshArm(base), r);
    if (h.hash !== b.hash || h.draws !== b.draws) { bad += 1; first ||= `${r.club} ${eraLabel(r.era)} seed ${r.seed} ${r.policy}: head ${h.hash} ${h.draws} draws, base ${b.hash} ${b.draws} draws (${h.at})`; }
  }
  check(P, `${runs.length} careers on the old rules (matchRules 'base' on both trees): every save byte and every draw equal to CM_BOARD_BASE`, runs.length > 0 && bad === 0, bad ? `${bad} differ; first ${first}` : '');
}

/* ---------------- section pure (step 1) ---------------- */
const MODULE = 'src/lib/clubManagerBoardVerdict.ts';
const METERS = 'src/lib/clubManagerMeters.ts';
const LADDER_FROM = "  let verdictGrade: 'A' | 'B' | 'C' | 'D' | 'F';\n";
const LADDER_TO = "    verdictGrade = 'F';\n  }\n";
/** The base's finishSeason ladder, cut from its own source and evaluated: the oracle is never retyped. */
function ladderOracle(baseText) {
  const a = baseText.indexOf(LADDER_FROM);
  const b = baseText.indexOf(LADDER_TO, a);
  if (a < 0 || b < 0) { console.log('section pure: the base ladder is not in CM_BOARD_BASE\'s engine; could not run'); process.exit(2); }
  const body = baseText.slice(a, b + LADDER_TO.length).replace(": 'A' | 'B' | 'C' | 'D' | 'F'", '');
  return new Function('seasonTrophies', 'position', 'overshoot', `${body}\nreturn verdictGrade;`);
}
async function bundleModule(text, folder, name) {
  const file = path.join(folder, `${name}-verdict.ts`);
  const output = path.join(folder, `${name}-verdict.cjs`);
  await writeFile(file, text);
  await build({ entryPoints: [file], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent' });
  return require(output);
}
const ORDER = ['A', 'B', 'C', 'D', 'F'];
const worse = (g, h) => ORDER.indexOf(g) >= ORDER.indexOf(h);
function trophyList(n, euro) {
  return Array.from({ length: n }, (_, i) => (euro && i === 0 ? 'Champions League' : `Cup ${i}`));
}
function pureSection(bv, ctx) {
  const P = 'pure';
  const ladder = ladderOracle(ctx.baseText);
  let grid = 0, ladderBad = 0, upBad = 0, downBad = 0, escBad = 0, kindBad = 0;
  for (let position = 1; position <= 24; position++) for (let expectation = 1; expectation <= 24; expectation++) {
    for (let trophies = 0; trophies <= 3; trophies++) for (const europeWon of trophies ? [false, true] : [false]) {
      grid += 1;
      const want = ladder(trophyList(trophies, europeWon), position, expectation - position);
      const i = { position, expectation, trophies, europeWon };
      const none = bv.seasonGrade({ ...i, fate: null });
      if (none.grade !== want) ladderBad += 1;
      if (want === 'A' && !['title', 'silver', 'over'].includes(none.kind)) kindBad += 1;
      if (want !== 'A' && none.kind !== want) kindBad += 1;
      const up = bv.seasonGrade({ ...i, fate: 'up' });
      if (!['A', 'B'].includes(up.grade) || up.kind !== 'up' || (want === 'A' && up.grade !== 'A')) upBad += 1;
      const down = bv.seasonGrade({ ...i, fate: 'down' });
      const cap = trophies ? 'B' : 'C';
      if (!worse(down.grade, cap) || down.kind !== 'down' || (worse(want, cap) && down.grade !== want)) downBad += 1;
      const esc = bv.seasonGrade({ ...i, fate: 'escape' });
      if (esc.grade !== want || esc.kind !== 'escape') escBad += 1;
    }
  }
  check(P, `${grid} grid seasons with no fate grade exactly as the base ladder`, ladderBad === 0, `${ladderBad} differ`);
  check(P, 'a season with no fate names why: title, silver or over for an A, its grade otherwise', kindBad === 0, `${kindBad} wrong`);
  check(P, "fate 'up' grades A or B (an A stays an A) with the 'up' kind", upBad === 0, `${upBad} wrong`);
  check(P, "fate 'down' grades C or worse (B or worse with a trophy), worse grades kept", downBad === 0, `${downBad} wrong`);
  check(P, "fate 'escape' keeps the ladder grade with the 'escape' kind", escBad === 0, `${escBad} wrong`);
  /* The opening over a grid of finishes, objective lists and promises. */
  const lists = [[], [{ id: 'league', hit: true }], [{ id: 'league', hit: false }], [{ id: 'league', hit: true }, { id: 'cup', hit: false }, { id: 'natQuota', hit: false }],
    [{ id: 'league', hit: false }, { id: 'cup', hit: true }, { id: 'ucl', hit: true }, { id: 'marquee', hit: true }], [{ hit: false }, { hit: false }, { hit: false }]];
  let openings = 0, abBad = 0, dfBad = 0, rangeBad = 0;
  for (const grade of ORDER) for (let pe = 1; pe <= 24; pe++) for (let finish = 1; finish <= 24; finish++) for (const objectives of lists) for (let promiseNet = -2; promiseNet <= 2; promiseNet++) {
    openings += 1;
    const v = bv.openingConfidence({ grade, playedExpectation: pe, finish, objectives, promiseNet });
    if ((grade === 'A' || grade === 'B') && v < bv.BOARD_FRESH) abBad += 1;
    if ((grade === 'D' || grade === 'F') && v > 59) dfBad += 1;
    if (!(v >= 35 && v <= 82)) rangeBad += 1;
  }
  check(P, `${openings} openings: an A or a B opens at BOARD_FRESH (${bv.BOARD_FRESH}) or more`, abBad === 0, `${abBad} under`);
  check(P, 'a D or an F opens at 59 or less', dfBad === 0, `${dfBad} over`);
  check(P, 'every opening is 35 to 82', rangeBad === 0, `${rangeBad} outside`);
  const weights = [['league', 3], ['natQuota', 0.5], ['veterans', 0.5], ['posGap', 0.5], ['youngStar', 0.5], ['marquee', 0.5], ['cup', 1], ['ucl', 1], [undefined, 1]];
  check(P, 'objectiveWeight: league 3, each board ask 0.5, any other id and no id 1', weights.every(([id, w]) => bv.objectiveWeight(id) === w));
  let kitty = 0, overBand = 0, notFlat = 0, bound = 0;
  for (let budget = 2; budget <= 250; budget += 1) for (let e = 1; e <= 24; e += 1) for (let f = 1; f <= 24; f += 1) for (let t = 0; t <= 3; t++) {
    kitty += 1;
    const flat = Math.max(10, Math.round(budget + (e - f) * 2 + t * 12));
    const band = Math.max(10, bv.KITTY_TOP_SHARE * budget);
    const got = bv.kittyAllocation({ budget, expectation: e, finish: f, trophies: t });
    if (got > band) overBand += 1;
    if (flat <= band && got !== flat) notFlat += 1;
    if (flat > band) bound += 1;
  }
  check(P, `${kitty} allocations never above max(10, ${bv.KITTY_TOP_SHARE} x budget)`, overBand === 0, `${overBand} above`);
  check(P, 'and equal to the flat formula wherever it is inside the band', notFlat === 0, `${notFlat} differ; the band binds on ${bound}`);
  const table = [[1, 1, false, true], [2, 1, false, true], [3, 1, false, false], [3, 2, false, true], [4, 2, false, false], [4, 3, false, true], [4, 2, true, true], [4, 1, true, false], [3, 1, true, true], [2, 4, false, true]];
  check(P, 'offerStepOk: one tier up, two after a title, any tier at or below', table.every(([m, t, big, ok]) => bv.offerStepOk(m, t, big) === ok));
  const safe = Number((ctx.metersText.match(/export const BOARD_SAFE = (\d+)/) ?? [])[1]);
  check(P, `BOARD_SAFE_LINE (${bv.BOARD_SAFE_LINE}) equals clubManagerMeters' BOARD_SAFE (${safe})`, bv.BOARD_SAFE_LINE === safe);
  check(P, 'the statues and the murals live only under a title or two trophies (none in VERDICT_LINES)', !/statue|mural/i.test(JSON.stringify(bv.VERDICT_LINES)));
  check(P, 'LEGACY_BOARD_START 60 and LEGACY_NEW_JOB_BOARD 62', bv.LEGACY_BOARD_START === 60 && bv.LEGACY_NEW_JOB_BOARD === 62);
}
const MODULE_CONTROLS = {
  safeline: ['export const BOARD_SAFE_LINE = 60;', 'export const BOARD_SAFE_LINE = 61;'],
  upgrade: ["  if (i.fate === 'up') return { grade: atLeast(grade, 'B'), kind: 'up' };", "  if (i.fate === 'up') return { grade, kind: 'up' };"],
  band: ["  if (i.grade === 'A' || i.grade === 'B') v = Math.max(v, BOARD_FRESH);", '  if (false) v = Math.max(v, BOARD_FRESH);'],
};

/* ---------------- arms and controls ---------------- */
/* Engine controls (SIM_CM_BOARD_CONTROL=<name>, with --part=<its part>): each patches this tree's copy in
   memory only, its anchor asserted present exactly once first. */
const ENGINE_CONTROLS = {
  nofate: { file: ENGINE, patches: [['  const fated = legacy ? null : fateRead(state);', '  const fated = legacy ? null : (null as ReturnType<typeof fateRead>);']] },
  statues: { file: MODULE, patches: [["    'Nobody saw that coming. The board has had to rewrite its expectations.',", "    'The board is thrilled. Statues have been commissioned.',"]] },
  fateflip: { file: ENGINE, patches: [["return up.includes(mySlot) ? { fate: 'up', league", "return up.includes(mySlot) ? { fate: 'down', league"],
    ["if (down.includes(mySlot)) return { fate: 'down', league", "if (down.includes(mySlot)) return { fate: 'up', league"]] },
  fatecount: { file: ENGINE, patches: [['if (myLeagueId === pyr.second) return up.includes(mySlot) ?', 'if (myLeagueId === pyr.second) return secondTable.filter(r => secondSet.has(r.club)).slice(0, pyr.count + 1).map(r => r.club).includes(mySlot) ?'],
    ['      if (down.includes(mySlot)) return', '      if (topRows.slice(-(pyr.count + 1)).map(r => r.club).includes(mySlot)) return']] },
  legacyleak: { file: ENGINE, patches: [["  return c.matchRules === 'base';", '  return false;']] },
  nostep: { file: MODULE, patches: [['  return theirTier >= myTier - (bigSeason ? 2 : 1);', '  return true;']] },
  prefilter: { file: ENGINE, patches: [['    const classic = shuffle(everyClub.filter(c => !vacancyNames.has(c.name) && c.tier < club.tier',
    "    const big0 = (position === 1 && !PYRAMIDS.some(p => p.second === careerLeagueOf(state).id)) || seasonTrophies.includes('Champions League');\n    const classic = shuffle(everyClub.filter(c => (legacy || offerStepOk(club.tier, c.tier, big0)) && !vacancyNames.has(c.name) && c.tier < club.tier"]] },
};
let fleetDone = false;
const ARMS = {};
async function headArm(folder) {
  if (ARMS.head) return ARMS.head;
  const texts = {};
  const spec = ENGINE_CONTROLS[CONTROL];
  if (spec) {
    let t = await readSource(root, spec.file);
    for (const [from, to] of spec.patches) t = patchOnce(t, from, to, `control ${CONTROL}`);
    texts[spec.file] = t;
  }
  ARMS.head = await bundleArm(CONTROL || 'head', folder, path.join(root, 'src'), texts);
  return ARMS.head;
}
async function baseArm(folder) {
  if (ARMS.base) return ARMS.base;
  if (!BASE) { console.log('this section needs CM_BOARD_BASE, a checkout of the commit the branch started from; could not run'); process.exit(2); }
  ARMS.base = await bundleArm('base', folder, path.join(BASE, 'src'));
  return ARMS.base;
}
/** What the grade, fate and stream sections read of a season end, without its two whole states. */
function slimRoll(r) {
  const row = (r.finState.history ?? []).find(h => h.season === r.summary.season);
  return { club: r.club, era: r.era, seed: r.seed, season: r.season, policy: r.policy, summary: r.summary, leagueBefore: r.leagueBefore,
    def: { tier: r.def?.tier, expectation: r.def?.expectation, budget: r.def?.budget }, size: r.size, last: r.last, oldClubAfter: r.oldClubAfter,
    lastAfter: r.lastAfter, moving: r.moving, leagueAfter: r.leagueAfter, finState: { history: row ? [row] : [] }, offerTiers: r.offerTiers,
    next: { boardConfidence: r.next.boardConfidence, budget: r.next.budget, clubName: r.next.clubName } };
}

/* ---------------- main ---------------- */
async function main() {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'simCmBoardVerdict-'));
  const t0 = Date.now();
  for (const part of PARTS) {
    if (part === 'measure') {
      /* Step 0 measures the engine the branch started from: CM_BOARD_BASE when set, else this tree. */
      const from = BASE || root;
      const text = await readSource(from, ENGINE);
      const arm = await bundleArm('measure', folder, path.join(from, 'src'), { [ENGINE]: patchOnce(text, KITTY_PROBE_FROM, KITTY_PROBE_TO, 'measure kitty probe') });
      console.log(`[measure] on ${BASE ? `CM_BOARD_BASE ${BASE}` : 'this tree'}; fleets ${MEASURE.join(', ')}`);
      if (MEASURE.includes('falls')) measureFalls(arm);
      if (MEASURE.includes('rollover')) measureRollover(arm);
      if (MEASURE.includes('offers')) measureTier4(arm);
      if (MEASURE.includes('takeover')) measureTakeover(arm);
    } else if (part === 'pure') {
      if (!BASE) { console.log('section pure needs CM_BOARD_BASE (its ladder oracle is the base engine); could not run'); process.exit(2); }
      let text = await readSource(root, MODULE);
      if (MODULE_CONTROLS[CONTROL]) text = patchOnce(text, ...MODULE_CONTROLS[CONTROL], `control ${CONTROL}`);
      const bv = await bundleModule(text, folder, CONTROL || 'head');
      pureSection(bv, { baseText: await readSource(BASE, ENGINE), metersText: await readSource(root, METERS) });
    } else if (['grade', 'fate', 'stream', 'offers'].includes(part)) {
      /* One fleet serves the four sections. */
      if (fleetDone) continue;
      fleetDone = true;
      const head = await headArm(folder);
      const base = await baseArm(folder);
      const acc = { n: 0, draws: [], diff: [], offers: [], outside: 0 };
      const rolls = [], approaches = [];
      const hooks = PARTS.includes('stream') ? { beforeFinish: streamHook(head, base, acc) } : {};
      if (PARTS.includes('offers')) hooks.step = approachTracker(head.cm, approaches);
      for (const r of gradeFleet(head.cm)) playCareer(head.cm, r, roll => rolls.push(slimRoll(roll)), hooks);
      const ctx = { baseText: await readSource(BASE, ENGINE) };
      if (PARTS.includes('grade')) gradeChecks(head, rolls, ctx);
      if (PARTS.includes('fate')) fateChecks(head, rolls);
      if (PARTS.includes('stream')) streamChecks(acc);
      if (PARTS.includes('offers')) {
        const tier4 = [], acc4 = { far: 0, farSeasons: 0 };
        const hooks4 = { beforeFinish: farHook(base, acc4), step: approachTracker(head.cm, approaches) };
        const fleet4 = tier4Fleet(head.cm);
        for (let seed = 0; seed < num('OFFER_SEEDS', 8); seed++) {
          for (const c of shard(fleet4)) playCareer(head.cm, { club: c.name, era: null, seed: 700 + seed, seasons: 2, policy: 'stay' }, roll => tier4.push(slimRoll(roll)), hooks4);
        }
        offersChecks(head, rolls, approaches, tier4, acc4);
      }
    } else if (part === 'dailies') {
      const r = await dailiesSection(await headArm(folder), await baseArm(folder));
      if (CONTROL === 'hotstart') console.log(`control hotstart: ${r.moved} dates moved without the line`);
    } else if (part === 'legacy') {
      const head = await headArm(folder);
      await legacySection(head, await baseArm(folder), legacyRuns(head.cm));
    } else { console.log(`unknown part ${part}`); process.exit(2); }
  }
  const red = results.filter(r => !r.ok);
  const secs = Math.round((Date.now() - t0) / 1000);
  if (CONTROL) {
    if (red.length) { console.log(`control ${CONTROL} FIRED: ${red.length} of ${results.length} checks red`); process.exit(1); }
    console.log(`control ${CONTROL} DID NOT FIRE: all ${results.length} checks stayed green`); process.exit(3);
  }
  console.log(`simCmBoardVerdict ${red.length ? 'RED' : 'GREEN'}: ${results.length - red.length} of ${results.length} checks green (parts ${PARTS.join(', ')}, ${secs} s)`);
  process.exit(red.length ? 1 : 0);
}
main().catch(e => { console.log(`simCmBoardVerdict could not run: ${e?.stack ?? e}`); process.exit(2); });
