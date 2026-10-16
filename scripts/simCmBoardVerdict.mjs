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
               Control legacyleak (legacySeason answers false on the head). Also the takeovers on the old
               rules (startMidSeason at new year and the run in, joinClubNow): every byte equal.
     offers    the grade fleet and the tier 4 fleet (the weakest club of every league, OFFER_SEEDS seeds, two
               seasons): every summer offer that is not a handshake or a yes, and every mid season approach,
               within the step; exhaustively, every world's tier 2 to 4 club has a club one tier up to be
               approached by. Prints the base's offers two or more tiers up on the same season ends.
               Control nostep.
     dailies   60 Hot Seat days from 2026-09-24 and every seventh day back (DAILY_BACK), head against base,
               whole runs equal with the suitor's name masked (correction 9); 30 Deadline Day days, the deal,
               the grade and the state's keys equal. Control hotstart (the Hot Seat line taken out). Also
               (review fix, advice 17) every date's takeover, dated and as a free run on the current rules:
               the card less what the previous manager had already failed on the current rules, the whole
               card on the old rules, nothing else moved but a suitor's name; the whole runs are compared
               with those lines off the base's card. Control hscard (the takeover keeps them again).
     fresh     fleet B (disjoint seeds, three seed bases): every fresh career opens at BOARD_FRESH, and the
               share of lost openers that leave the board Safe stays at FRESH_FLOOR or more. Control start60.
     title     the title fleet with the rollover handed to both trees: every A or B stay opens Safe or more,
               every D or F under, every move at BOARD_FRESH; startNextSeason draws as the base and writes the
               same save but the opening wherever the kitty band did not bind. Prints the openings by fate and
               by grade on both trees. Control noband. Review fix: every stay's opening equals the module's
               sum recomputed from the season it had (the expectation of the club as played, before the
               summer, and the review's hits weighed by the card's ids); controls played and weights.
     kitty     the tier 4 fleet (and the title fleet's rollovers when --part=title,kitty): the cheque never
               passes max(10, KITTY_TOP_SHARE x budget) and equals the old one inside the band; by tier, how
               often the band binds and the next budget over the club's on both trees. Control nokitty.
     takeover  startMidSeason at autumn, new year and the run in for twelve clubs of three worlds and
               joinClubNow on a yes (TAKEOVER_SEEDS seeds): every takeover opens at BOARD_FRESH and equals the
               base but for the opening and the card (the run in's suitor masked: since step 3 the previous
               manager's approaches are stepped too), handover stamp included. startMidSeason is handed the
               state startCareer built (BOARD_FRESH on the head), as in play, so the base comparison holds
               playRunIn's pin. Controls keepfailed, nopin (the pin taken out).

   Engine controls: SIM_CM_BOARD_CONTROL=<name> with --part=<its section>; each patches this tree's copy in
   memory, its anchor asserted present exactly once first, and must end FIRED with exit 1.
   Exit 0 green or measured, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
/** A state with the youth intake's module counter taken out of its ids (youth-<clock>-<counter>-<roll>): two
 *  bundles that played different histories number their youths differently and nothing else about them. */
const canon = v => JSON.parse(JSON.stringify(v).replace(/youth-([a-z0-9]+)-\d+-(\d+)/g, 'youth-$1-#-$2'));
const hashOf = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
/** A fleet split for parallel runner lines: SHARD=k/n keeps every n-th entry from the k-th. With `key`, every
 *  n-th key from the k-th instead, so entries that share a key (a career's two policies) stay in one shard and
 *  each shard holds stays and moves alike (review fix: a list alternating stay and first split by two put
 *  every move in one shard). With no SHARD the list is unchanged either way. */
function shard(list, key) {
  const m = /^(\d+)\/(\d+)$/.exec(process.env.SHARD ?? '');
  if (!m) return list;
  if (!key) return list.filter((_, i) => i % Number(m[2]) === Number(m[1]));
  const keys = [...new Set(list.map(key))];
  const keep = new Set(keys.filter((_, i) => i % Number(m[2]) === Number(m[1])));
  return list.filter(x => keep.has(key(x)));
}
/** The key that keeps a career's policies together in a shard. */
const careerKey = r => `${r.seed}|${r.club}|${r.era ?? ''}`;
/** A source file with its line endings read as LF, so one anchor matches on a Windows checkout too. */
function readSource(tree, rel) {
  return readFileSync(path.join(tree, rel), 'utf8').replaceAll('\r\n', '\n');
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
    hooks.beforeRoll?.(fin.state, take, rollSeed, { def: ctx.def, era });
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
  const c = canon(o);
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
  return shard(out, careerKey);
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
/** Review fix (advice 17): Hot Seat's own takeover takes the card less what the previous manager had already
 *  failed on a run on the current rules, and the whole card on the old rules (legacySeason), the way Club
 *  Manager's takeovers do. Read on the takeover itself (startHotSeat returns the run as you walk in), for every
 *  date of the window as dated and again as a free run on the current rules (the same club and seed), against
 *  the base's card at the same moment; everything else at the takeover equal but a suitor's name. Returns
 *  the lines each dated takeover dropped, for the whole run comparison. Control hscard. */
async function hsCardChecks(head, base, dates, store) {
  const P = 'dailies';
  const h = await freshArm(head), b = await freshArm(base);
  const out = { cases: 0, current: 0, failedOnBase: 0, bad: [], droppedByDate: new Map() };
  const maskState = s => {
    const c = canon(s);
    delete c.boardObjectives;
    if (c.approach) for (const k of ['club', 'blurb', 'leagueName', 'tierLabel']) c.approach[k] = 'X';
    c.aiHeadlines = (c.aiHeadlines ?? []).map(l => (typeof l === 'string' && l.startsWith(PHONE) ? PHONE : l));
    return c;
  };
  for (const date of dates) {
    const d = h.hs.dailyHotSeat(date);
    for (const setup of [{ club: d.club, seed: d.seed, daily: date }, { club: d.club, seed: d.seed, rules: 1331 }]) {
      store.clear();
      const hState = h.hs.startHotSeat(setup).state;
      store.clear();
      const bState = b.hs.startHotSeat(setup).state;
      const current = h.hs.rulesOf(setup) === undefined;
      const statuses = b.cm.objectiveStatuses(bState);
      const failed = statuses.filter(x => x.status === 'failed').map(x => x.objective.id);
      const want = current ? statuses.filter(x => x.status !== 'failed').map(x => x.objective) : (bState.boardObjectives ?? []);
      out.cases += 1;
      if (current) { out.current += 1; if (failed.length) out.failedOnBase += 1; }
      if (setup.daily) out.droppedByDate.set(date, current ? failed : []);
      const tag = `${date}${setup.daily ? '' : ' (free run)'} ${d.club}`;
      if (JSON.stringify(hState.boardObjectives ?? []) !== JSON.stringify(want)) out.bad.push(`${tag}: ${(hState.boardObjectives ?? []).map(o => o.id).join(',')} against ${want.map(o => o.id).join(',')}`);
      else if (JSON.stringify(maskState(hState)) !== JSON.stringify(maskState(bState))) out.bad.push(`${tag}: the takeover moved beyond its card: ${firstDiff(maskState(hState), maskState(bState))}`);
    }
  }
  console.log(`[dailies] Hot Seat takeovers: ${out.cases} (${dates.length} dated, ${dates.length} free); on CM_BOARD_BASE ${out.failedOnBase} of the ${out.current} on the current rules took over with a failed line on the card`);
  check(P, `${out.cases} Hot Seat takeovers: the card less its failed lines on the current rules, the whole card on the old rules, nothing else moved but a suitor's name`, out.current > 0 && out.bad.length === 0, out.bad.length ? `${out.bad.length}; first ${out.bad[0]}` : '');
  return out;
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
  const card = await hsCardChecks(head, base, hsDates, store);
  let same = 0, suitorOnly = 0, approached = 0;
  const moved = [];
  for (const date of hsDates) {
    store.clear();
    const h = hsPlay(await freshArm(head), date);
    store.clear();
    const b0 = hsPlay(await freshArm(base), date);
    /* The lines this date's takeover dropped (hsCardChecks) come off the base's card too, so what is left to
       compare is everything else the day did. */
    const dropped = card.droppedByDate.get(date) ?? [];
    const b = dropped.length ? { ...b0, state: { ...b0.state, boardObjectives: (b0.state.boardObjectives ?? []).filter(o => !dropped.includes(o.id)) } } : b0;
    const whole = r => JSON.stringify({ state: r.state, log: r.log, verdict: r.verdict ?? null, takeover: r.takeover, target: r.target });
    if (whole(h) === whole(b)) same += 1;
    else if (JSON.stringify(maskRun(h)) === JSON.stringify(maskRun(b))) suitorOnly += 1;
    else moved.push(`${date}: ${firstDiff(maskRun(h), maskRun(b))}`);
    if (h.state.approach || (h.log ?? []).some(m => (m.events ?? []).some(e => String(e).startsWith(PHONE)))) approached += 1;
  }
  console.log(`[dailies] Hot Seat: ${hsDates.length} dates (60 from 2026-09-24 and every seventh day back); ${same} identical, ${suitorOnly} differ only in a suitor's name, ${moved.length} moved; ${approached} raised an approach; ${[...card.droppedByDate.values()].filter(d => d.length).length} dates compared with the base's card less the failed lines their takeover dropped`);
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

/* ---------------- sections fresh, title and takeover (step 4 on) ---------------- */
/* The floor of section fresh: the share of fleet B's lost openers that leave the meter Safe, set from three
   seed bases of fleet B measured on the head (the lowest share minus its measured spread). */
/* Measured on d64314de (remote check r1335-s4, fresh): 739 of 739, 734 of 734 and 700 of 700 lost openers
   stayed Safe on the three bases, lowest 100 percent, spread 0, so the floor is 1. It is structural, not
   luck: a fresh career is under its wage cap, so a lost opener costs at most (4.5 + 2) x 1.3, 8.5 after the
   rounding, and 69 less 8.5 is 60.5. */
const FRESH_FLOOR = 1;
function freshSection(arm) {
  const P = 'fresh';
  const { cm, bv } = arm;
  const shares = [];
  let opened = 0, notFresh = 0;
  for (const seed0 of [500000, 600000, 700000].slice(0, num('FRESH_BASES', 3))) {
    let lost = 0, safe = 0;
    for (const era of ERAS) {
      const all = worldClubs(cm, era);
      for (const tier of [1, 2, 3, 4]) {
        for (const c of spreadPick(all.filter(d => d.tier === tier), num('FALL_CLUBS', 4))) {
          for (let k = 0; k < num('FRESH_SEEDS', 30); k++) {
            const seed = seed0 + k * 977 + tier * 13;
            const s = startOf(cm, c.name, era, seed);
            opened += 1;
            if (s.boardConfidence !== bv.BOARD_FRESH) notFresh += 1;
            const m = firstMatch(cm, s, seed);
            if (!m || !m.lost) continue;
            lost += 1;
            if (m.after >= bv.BOARD_SAFE_LINE) safe += 1;
          }
        }
      }
    }
    shares.push({ seed0, lost, safe, share: lost ? safe / lost : 0 });
  }
  for (const s of shares) console.log(`[fresh] fleet B seed base ${s.seed0}: ${s.safe} of ${s.lost} lost openers leave the board Safe (${fmt(s.share * 100)} percent)`);
  const low = Math.min(...shares.map(s => s.share)), high = Math.max(...shares.map(s => s.share));
  console.log(`  lowest ${fmt(low * 100)}, spread ${fmt((high - low) * 100)} points; floor ${FRESH_FLOOR * 100} percent`);
  check(P, `${opened} fresh careers open at BOARD_FRESH (${bv.BOARD_FRESH})`, opened > 0 && notFresh === 0, `${notFresh} do not`);
  check(P, `a lost opener leaves the board Safe at least ${FRESH_FLOOR * 100} percent of the time on every seed base`, shares.every(s => s.lost > 0 && s.share >= FRESH_FLOOR), shares.map(s => fmt(s.share * 100)).join(', '));
}
/** Section stream for startNextSeason: both trees handed the same finished state, the same pick and draws. */
function rollStreamHook(head, base, acc) {
  return (finState, take, rollSeed, played = {}) => {
    const playedDef = played.def;
    const S = clone(finState);
    /* Review fix: a stay's opening recomputed from the season it had, read here before the rollover runs:
       the expectation of the club as it was played (the def playCareer read before the summer moved
       anybody), and the hits the review printed weighed by the ids on the card they were graded from (one
       each when the two lists do not line up). Controls played and weights move one input each. */
    const sum = S.pendingSummary;
    const objs = sum?.objectives ?? [];
    const cardIds = (S.boardObjectives ?? []).map(o => o.id);
    const promiseNet = head.cm.objectiveStatuses(S).filter(x => x.objective.promised).reduce((n, x) => n + (x.status === 'done' ? 1 : -1), 0);
    const recomputed = sum && head.bv ? head.bv.openingConfidence({ grade: sum.verdictGrade ?? 'C', playedExpectation: playedDef ? playedDef.expectation : sum.position,
      finish: sum.position, objectives: objs.map((o, i) => ({ id: cardIds.length === objs.length ? cardIds[i] : undefined, hit: o.hit })), promiseNet }) : null;
    DRAWS.n = 0;
    globalThis.__cmAlloc = [];
    const h = withSeed(rollSeed, () => head.cm.startNextSeason(clone(S), take));
    const hn = DRAWS.n;
    const hAlloc = globalThis.__cmAlloc.pop();
    /* Read while the head's registry is next season's: the club's expectation after the summer. */
    const nextExp = head.cm.clubDefFor(h.clubName)?.expectation;
    /* startNextSeason reads the club it was played for BEFORE it registers anything, so the base is handed
       the finished season's memberships first, the way loading the save would. */
    base.cm.registerLeagueOverrides(S.leagueOverrides ?? null);
    base.cm.registerCustomClub(null);
    DRAWS.n = 0;
    globalThis.__cmAlloc = [];
    const b = withSeed(rollSeed, () => base.cm.startNextSeason(clone(S), take));
    const bn = DRAWS.n;
    const bAlloc = globalThis.__cmAlloc.pop();
    globalThis.__cmAlloc = undefined;
    /* The head goes on to play this rollover for real: its registry back to the season just finished. */
    head.cm.registerLeagueOverrides(S.leagueOverrides ?? null);
    const moving = h.clubName !== S.clubName;
    if (!moving && recomputed !== null) {
      acc.inputs ??= { n: 0, swapped: 0, weighted: 0, bad: [] };
      acc.inputs.n += 1;
      /* How many stays each input can bite on: the summer moved the club's expectation, or the card
         weighs a hit other than one. */
      if (playedDef && !played.era && nextExp !== undefined && nextExp !== playedDef.expectation) acc.inputs.swapped += 1;
      if (cardIds.length === objs.length && cardIds.some(id => head.bv.objectiveWeight(id) !== 1)) acc.inputs.weighted += 1;
      if (h.boardConfidence !== recomputed) acc.inputs.bad.push(`${S.clubName} season ${S.season}: opened at ${h.boardConfidence}, the season it had gives ${recomputed}`);
    }
    acc.rows.push({ grade: S.pendingSummary?.verdictGrade ?? null, fate: S.pendingSummary?.fate ?? null, title: S.pendingSummary?.position === 1,
      moving, head: h.boardConfidence, base: b.boardConfidence, bound: h.budget !== b.budget, hAlloc, bAlloc, hBudget: h.budget, bBudget: b.budget, tier: head.cm.clubDefFor(h.clubName)?.tier ?? 0 });
    const tag = `${S.clubName} season ${S.season}${take ? ` to ${take}` : ''}`;
    if (h.budget !== b.budget) { acc.bound += 1; return; }
    if (hn !== bn) acc.draws.push(`${tag}: head ${hn}, base ${bn}`);
    const mask = o => { const c = canon(o); delete c.boardConfidence; return c; };
    if (JSON.stringify(mask(h)) !== JSON.stringify(mask(b))) acc.diff.push(`${tag}: ${firstDiff(mask(h), mask(b))}`);
  };
}
function openingTable(rows, key) {
  const groups = {};
  for (const r of rows.filter(x => !x.moving)) (groups[r[key] ?? 'none'] ??= []).push(r);
  return Object.entries(groups).map(([k, list]) => {
    const mean = side => list.reduce((n, r) => n + r[side], 0) / list.length;
    return `${k} n ${list.length}: base mean ${fmt(mean('base'))} (p10 ${fmt(pct(list.map(r => r.base), 10))} to p90 ${fmt(pct(list.map(r => r.base), 90))}), head mean ${fmt(mean('head'))} (p10 ${fmt(pct(list.map(r => r.head), 10))} to p90 ${fmt(pct(list.map(r => r.head), 90))})`;
  });
}
function titleChecks(arm, acc) {
  const P = 'title';
  const { bv } = arm;
  const stays = acc.rows.filter(r => !r.moving);
  const ab = stays.filter(r => r.grade === 'A' || r.grade === 'B');
  const df = stays.filter(r => r.grade === 'D' || r.grade === 'F');
  const moves = acc.rows.filter(r => r.moving);
  const under = (list, side) => list.filter(r => r[side] < bv.BOARD_SAFE_LINE).length;
  console.log(`[title] ${acc.rows.length} rollovers, ${stays.length} stays: on CM_BOARD_BASE ${under(ab, 'base')} of ${ab.length} A or B seasons opened under Safe (${under(ab.filter(r => r.title), 'base')} of ${ab.filter(r => r.title).length} titles); on the head ${under(ab, 'head')}`);
  for (const line of openingTable(acc.rows, 'fate')) console.log(`  by fate, ${line}`);
  for (const line of openingTable(acc.rows, 'grade')) console.log(`  by grade, ${line}`);
  check(P, 'every A or B season opens the next at Safe or more', ab.length > 0 && under(ab, 'head') === 0, `${under(ab, 'head')} of ${ab.length} under`);
  check(P, 'every D or F season opens the next under Safe', df.every(r => r.head < bv.BOARD_SAFE_LINE), `${df.filter(r => r.head >= bv.BOARD_SAFE_LINE).length} of ${df.length} at Safe or more`);
  check(P, 'every move at the summer opens at BOARD_FRESH', moves.every(r => r.head === bv.BOARD_FRESH), `${moves.filter(r => r.head !== bv.BOARD_FRESH).length} of ${moves.length} do not`);
  const inp = acc.inputs ?? { n: 0, swapped: 0, weighted: 0, bad: [] };
  console.log(`  ${inp.n} stays recomputed from the season they had; ${inp.swapped} where the summer moved the club's expectation, ${inp.weighted} with a card that weighs a hit other than one`);
  check(P, 'every stay opens at the sum of the season it had (the expectation as played, the card\'s weights)', inp.n > 0 && inp.bad.length === 0, inp.bad.length ? `${inp.bad.length}; first ${inp.bad[0]}` : '');
  check(P, 'startNextSeason draws the same number of times on head and base wherever the kitty band did not bind', acc.draws.length === 0, acc.draws.length ? `${acc.draws.length}; first ${acc.draws[0]}` : '');
  check(P, 'and writes the same save but for the opening', acc.diff.length === 0, acc.diff.length ? `${acc.diff.length}; first ${acc.diff[0]}` : `${acc.bound} rollovers where the band bound left to section kitty`);
}

function kittyChecks(arm, rows, acc) {
  const P = 'kitty';
  const { bv } = arm;
  const stays = rows.filter(r => !r.moving && r.hAlloc && r.bAlloc);
  const band = a => Math.max(10, bv.KITTY_TOP_SHARE * a.budget);
  const over = stays.filter(r => r.hAlloc.allocation > band(r.hAlloc));
  const moved = stays.filter(r => r.bAlloc.allocation <= band(r.bAlloc) && r.hAlloc.allocation !== r.bAlloc.allocation);
  for (const tier of [1, 2, 3, 4]) {
    const list = stays.filter(r => r.hAlloc.tier === tier);
    const bound = list.filter(r => r.hAlloc.allocation < r.bAlloc.allocation);
    const ratio = side => list.map(r => r[side] / r.hAlloc.budget);
    console.log(`[kitty] tier ${tier}: the band bound ${bound.length} of ${list.length} staying rollovers (${bound.filter(r => r.hAlloc.trophies > 0).length} with a trophy); next budget over the club's: base median ${fmt(pct(ratio('bBudget'), 50))} p90 ${fmt(pct(ratio('bBudget'), 90))}, head median ${fmt(pct(ratio('hBudget'), 50))} p90 ${fmt(pct(ratio('hBudget'), 90))}`);
  }
  console.log(`  ${acc.bound} rollovers of the tier 4 fleet where the band bound: their draws and the lines after the pot are counted, never held equal`);
  check(P, `${stays.length} staying rollovers: the cheque never passes max(10, ${bv.KITTY_TOP_SHARE} x the club's budget)`, stays.length > 0 && over.length === 0, over.length ? `${over.length}; first ${over[0].hAlloc.allocation} on a budget of ${over[0].hAlloc.budget}` : '');
  check(P, 'and equals the old cheque wherever the old one was inside the band', moved.length === 0, `${moved.length} differ`);
}
/** A takeover on one arm: startMidSeason at an entry, or joinClubNow on a yes built the way simCmApplications
 *  builds one. startMidSeason is handed the state startCareer built, as useClubManager hands it in play
 *  (BOARD_FRESH on the head, 60 on the base), so it is playRunIn's pin to LEGACY_BOARD_START (correction 2)
 *  that makes every week before the handover the same game; control nopin takes the pin out. The legacy leg
 *  and a join (the player's own weeks before he applies, which are his, not the run in) open at the old 60
 *  on both arms (decision 5). */
function takeoverOn(arm, c, legacy = false) {
  const { cm, cal } = arm;
  const s = startOf(cm, c.club, c.era, c.seed);
  if (legacy || c.entry === 'join') s.boardConfidence = 60;
  if (legacy) s.matchRules = 'base';
  if (c.entry !== 'join') return withSeed(c.seed * 7 + 1, () => cal.startMidSeason(s, c.entry));
  let t = s;
  for (let i = 0; i < 40 && t.week < 10 && !t.sacked; i++) t = withSeed(c.seed * 1009 + i, () => cm.playNextEntry(t, QUICK)).state;
  /* An approach before the application is stepped since step 3, so its suitor (and what declining it
     leads to) may differ between the arms: such a case is counted, not compared. */
  /* Every call that can draw runs seeded: applyForJob rolls how many matches the answer takes. */
  if (t.approach) { if (!legacy) return { approached: true }; t = withSeed(c.seed * 11 + 2, () => cm.respondApproach(t, false)); }
  const target = withSeed(c.seed * 11 + 3, () => [...cm.applyTargets(t)]).sort((a, b) => a.club.localeCompare(b.club))[c.seed % 3];
  const applied = target ? withSeed(c.seed * 11 + 4, () => cm.applyForJob(t, target.club)) : null;
  if (!applied) return null;
  applied.jobHunt.open.roll = 0;
  applied.boardConfidence = 85;
  let u = applied;
  for (let i = 0; i < 60; i++) {
    const open = u.jobHunt?.open;
    if (!open || open.status !== 'pending') break;
    u = withSeed(c.seed * 2003 + i, () => cm.playNextEntry(u, QUICK)).state;
  }
  if (u.jobHunt?.open?.status !== 'accepted') return null;
  return withSeed(c.seed * 7 + 2, () => cal.joinClubNow(u));
}
function takeoverCases(cm) {
  const out = [];
  for (const { club, era } of takeoverClubs(cm)) {
    for (const entry of ['autumn', 'newYear', 'runIn']) for (let seed = 0; seed < num('TAKEOVER_SEEDS', 5); seed++) out.push({ club, era, entry, seed });
    if (!era) for (let seed = 0; seed < num('TAKEOVER_SEEDS', 5); seed++) out.push({ club, era, entry: 'join', seed });
  }
  return shard(out);
}
async function takeoverSection(head, base) {
  const P = 'takeover';
  const { bv } = head;
  let n = 0, joins = 0, notFresh = 0, baseFailed = 0, headFailed = 0, approached = 0;
  const card = { dropped: 0, cases: 0, bad: [], moved: [] };
  const diff = [];
  const cases = takeoverCases(head.cm);
  const joinCases = cases.filter(c => c.entry === 'join').length;
  for (const c of cases) {
    const h = takeoverOn(await freshArm(head), c);
    const b = takeoverOn(await freshArm(base), c);
    if (h?.approached || b?.approached) { approached += 1; continue; }
    if (!h || !b) { if (!!h !== !!b) diff.push(`${c.club} ${c.entry} seed ${c.seed}: only one arm took the job`); continue; }
    n += 1;
    if (c.entry === 'join') joins += 1;
    if (h.boardConfidence !== bv.BOARD_FRESH) notFresh += 1;
    if (base.cm.objectiveStatuses(b).some(x => x.status === 'failed')) baseFailed += 1;
    if (head.cm.objectiveStatuses(h).some(x => x.status === 'failed')) headFailed += 1;
    if (TAKEOVER_OBJECTIVES) cardCheck(head, base, c, h, b, card);
    /* The run in is the previous manager's and plays maybeApproach: since step 3 its suitor is stepped, so a
       headline naming him is masked the way section dailies masks one (only the name can move). */
    const mask = o => { const k = canon(o); delete k.boardConfidence; if (TAKEOVER_OBJECTIVES) delete k.boardObjectives;
      k.aiHeadlines = (k.aiHeadlines ?? []).map(l => (typeof l === 'string' && l.startsWith(PHONE) ? PHONE : l)); return k; };
    if (JSON.stringify(mask(h)) !== JSON.stringify(mask(b))) diff.push(`${c.club} ${eraLabel(c.era)} ${c.entry} seed ${c.seed}: ${firstDiff(mask(h), mask(b))}`);
    else if (JSON.stringify(h.handover) !== JSON.stringify(b.handover)) diff.push(`${c.club} ${c.entry} seed ${c.seed}: the handover stamp moved`);
  }
  console.log(`[takeover] ${n} handovers (${joins} by joinClubNow, ${approached} joins skipped: approached before applying); on CM_BOARD_BASE ${baseFailed} carried a failed objective, on the head ${headFailed}`);
  check(P, `${n} takeovers open at BOARD_FRESH (${bv.BOARD_FRESH})`, n > 0 && (joins > 0 || joinCases === 0) && notFresh === 0, `${notFresh} do not; ${joins} joins of ${joinCases} join cases`);
  if (TAKEOVER_OBJECTIVES) {
    console.log(`  the card: ${card.dropped} takeovers dropped a failed objective; the season score compared on ${card.cases} of them (the rest were sacked first) at the handover and at the final whistle`);
    check(P, 'on the day of the handover no objective on the card reads failed', headFailed === 0, `${headFailed} do`);
    check(P, 'the card is the base card less exactly its failed objectives, in order', card.bad.length === 0, card.bad.length ? `${card.bad.length}; first ${card.bad[0]}` : '');
    check(P, 'the season score is the same with and without the dropped objectives, at the handover and the final whistle', card.cases > 0 && card.moved.length === 0, card.moved.length ? `${card.moved.length}; first ${card.moved[0]}` : `${card.cases} cases`);
  }
  check(P, 'every takeover equal to CM_BOARD_BASE but for the opening (and the card), its handover stamp included', diff.length === 0, diff.length ? `${diff.length}; first ${diff[0]}` : '');
  return { headFailed };
}
/** The takeover's card against the base's: the base card less exactly what had failed, and the season score
 *  read with and without the dropped lines (the score reads done objectives only, so it must not move; the
 *  control scoredone turns each dropped line into a done one and the score must move). */
function cardCheck(head, base, c, h, b, card) {
  const statuses = base.cm.objectiveStatuses(b);
  const failedIds = statuses.filter(x => x.status === 'failed').map(x => x.objective.id);
  const want = statuses.filter(x => x.status !== 'failed').map(x => x.objective);
  const tag = `${c.club} ${eraLabel(c.era)} ${c.entry} seed ${c.seed}`;
  if (JSON.stringify(h.boardObjectives) !== JSON.stringify(want)) card.bad.push(`${tag}: ${(h.boardObjectives ?? []).map(o => o.id).join(',')} against ${want.map(o => o.id).join(',')}`);
  if (!failedIds.length) return;
  card.dropped += 1;
  let full = clone(b.boardObjectives);
  if (CONTROL === 'scoredone') full = full.map(o => (failedIds.includes(o.id) ? { ...o, target: -1 } : o));
  /* The objectives term counts only once the season is done, so the comparison that can bite is at the final
     whistle: the season played out on the head's card, then scored with each card. */
  const end = playSeason(head.cm, clone(h), c.seed * 7919 + 77);
  if (end.sacked || end.stuck) return;
  card.cases += 1;
  for (const [when, s] of [['the handover', h], ['the final whistle', end.s]]) {
    const a = head.cm.currentSeasonScore(s), z = head.cm.currentSeasonScore({ ...clone(s), boardObjectives: full });
    if (a !== z) card.moved.push(`${tag} at ${when}: ${a} without, ${z} with`);
  }
}
/* Set true at step 6, when the takeover card drops what is already failed. */
const TAKEOVER_OBJECTIVES = true;

/* ---------------- section saves (step 9) ---------------- */
/** Every Club Manager save scripts/lib/realSaves.mjs builds with the BASE engine, plus one paused on the season
 *  review (its offers dealt, no fate), loads to the same JSON on both trees, and the paused one keeps its offers. */
async function savesSection(head, base, folder) {
  const P = 'saves';
  const { buildRealSaves } = await import(pathToFileURL(path.join(root, 'scripts/lib/realSaves.mjs')).href);
  const built = await buildRealSaves({ root: BASE, tmpDir: path.join(folder, 'realsaves'), seeds: [0, 1, 2, 3] });
  const raws = [...(built.fleet['/club-manager'] ?? [])];
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
  /* The paused review: a season the base engine finished, saved by the base engine's own writer. */
  const played = playSeason(base.cm, startOf(base.cm, 'OB', null, 5), 5 * 7919);
  const fin = withSeed(8, () => base.cm.finishSeason(played.s));
  store.clear();
  base.cm.saveCareer(fin.state);
  const paused = store.get(base.cm.SAVE_KEY);
  if (paused) raws.push(paused);
  let bad = 0, first = '';
  const load = (arm, raw) => { store.clear(); store.set(arm.cm.SAVE_KEY, raw); const s = arm.cm.loadCareer(); store.clear(); return s; };
  for (const raw of raws) {
    const h = load(head, raw), b = load(base, raw);
    if (JSON.stringify(h) !== JSON.stringify(b)) { bad += 1; first ||= firstDiff(h, b); }
  }
  check(P, `${raws.length} Club Manager saves (realSaves on CM_BOARD_BASE, and a paused review) load to the same JSON on both trees`, raws.length > 1 && bad === 0, bad ? `${bad}; first ${first}` : '');
  const h = paused ? load(head, paused) : null;
  check(P, 'the paused review keeps the offers it was dealt and carries no fate', !!h && JSON.stringify(h.pendingSummary?.offers) === JSON.stringify(fin.summary.offers) && !('fate' in (h.pendingSummary ?? {})),
    `${fin.summary.offers.length} offers`);
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
  return shard(runs, careerKey);
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
  let tBad = 0, tFirst = '', tN = 0;
  for (const c of takeoverCases(head.cm).filter(x => x.entry !== 'autumn')) {
    const h = takeoverOn(await freshArm(head), c, true);
    const b = takeoverOn(await freshArm(base), c, true);
    tN += 1;
    if (JSON.stringify(h && strip(h)) !== JSON.stringify(b && strip(b))) { tBad += 1; tFirst ||= `${c.club} ${eraLabel(c.era)} ${c.entry} seed ${c.seed}: ${firstDiff(h && strip(h), b && strip(b))}`; }
  }
  check(P, `${tN} takeovers on the old rules (startMidSeason at new year and the run in, joinClubNow): every byte equal to CM_BOARD_BASE`, tN > 0 && tBad === 0, tBad ? `${tBad} differ; first ${tFirst}` : '');
  check(P, `${runs.length} careers on the old rules (matchRules 'base' on both trees): every save byte and every draw equal to CM_BOARD_BASE`, runs.length > 0 && bad === 0, bad ? `${bad} differ; first ${first}` : '');
}

/* ---------------- section pure (step 1) ---------------- */
const MODULE = 'src/lib/clubManagerBoardVerdict.ts';
const METERS = 'src/lib/clubManagerMeters.ts';
const HELP = 'src/components/club-manager/ClubManagerHelp.tsx';
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
  /* The help's worked example, computed by the module and printed by the help (control example). */
  const example = [{ id: 'league', hit: true }, { id: 'cup', hit: true }, { id: 'goals', hit: false }, { id: 'natQuota', hit: false }, { id: 'veterans', hit: false }];
  const raw = bv.openingConfidence({ grade: 'C', playedExpectation: 1, finish: 1, objectives: example, promiseNet: 0 });
  const opens = bv.openingConfidence({ grade: 'A', playedExpectation: 1, finish: 1, objectives: example, promiseNet: 0 });
  const old = 55 + 2 * example.reduce((n, o) => n + (o.hit ? 1 : -1), 0);
  const help = ctx.helpText ?? '';
  check(P, `the help's example prints the module's sums: ${raw} raw, ${old} on the old rule, and an A opens at ${opens} (BOARD_FRESH)`,
    help.includes(`2 x (3 + 1 - 1 - 0.5 - 0.5) = ${raw}`) && help.includes(`2 x (1 + 1 - 1 - 1 - 1) = ${old}`) && opens === bv.BOARD_FRESH && help.includes('opens at {BOARD_FRESH}, Safe'));
}
const MODULE_CONTROLS = {
  example: null,
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
  keepfailed: { file: ENGINE, patches: [["  return objectiveStatuses(s).filter(x => x.status !== 'failed').map(x => x.objective);", '  return s.boardObjectives ?? [];']] },
  /* Review fix: correction 2's pin taken out of playRunIn, so the previous manager's run in opens at the
     state's own BOARD_FRESH: section takeover's base comparison must go red. */
  nopin: { file: CAL_FILE, patches: [['? { ...career, manager: undefined, managerXp: undefined, boardConfidence: LEGACY_BOARD_START }\n    : { ...career, boardConfidence: LEGACY_BOARD_START };',
    '? { ...career, manager: undefined, managerXp: undefined }\n    : career;']] },
  scoredone: { file: MODULE, patches: [['export const LEGACY_BOARD_START = 60;', 'export const LEGACY_BOARD_START = 60; /* control scoredone: the harness marks the dropped lines done */']] },
  nokitty: { file: MODULE, patches: [['  return Math.min(flat, Math.max(10, Math.floor(KITTY_TOP_SHARE * i.budget)));', '  return flat;']] },
  start60: { file: MODULE, patches: [['export const BOARD_FRESH = 69;', 'export const BOARD_FRESH = 60;']] },
  noband: { file: MODULE, patches: [["  if (i.grade === 'A' || i.grade === 'B') v = Math.max(v, BOARD_FRESH);", '  if (false) v = Math.max(v, BOARD_FRESH);'],
    ["  else if (i.grade === 'D' || i.grade === 'F') v = Math.min(v, BOARD_SAFE_LINE - 1);", '  else if (false) v = Math.min(v, BOARD_SAFE_LINE - 1);']] },
  hotstart: { file: HS_FILE, patches: [['  s.boardConfidence = LEGACY_BOARD_START;\n', '']] },
  /* Review fix: the stay's two engine inputs, one control each (section title). played reads the club's
     expectation after the summer swap; weights drops the card's ids, so every hit weighs one again. */
  played: { file: ENGINE, patches: [["openingConfidence({ grade: summary?.verdictGrade ?? 'C', playedExpectation, finish: prevPos,",
    "openingConfidence({ grade: summary?.verdictGrade ?? 'C', playedExpectation: club.expectation, finish: prevPos,"]] },
  weights: { file: ENGINE, patches: [['objectives: objs.map((o, i) => ({ id: cardIds.length === objs.length ? cardIds[i] : undefined, hit: o.hit })), promiseNet });',
    'objectives: objs.map((o, i) => ({ id: undefined, hit: o.hit })), promiseNet });']] },
  /* Review fix (advice 17): Hot Seat's takeover keeps the previous manager's failed lines again. */
  hscard: { file: HS_FILE, patches: [['    boardObjectives: legacySeason(chosen.state) ? chosen.state.boardObjectives : openObjectives(chosen.state),\n', '']] },
  prefilter: { file: ENGINE, patches: [['    const classic = shuffle(everyClub.filter(c => !vacancyNames.has(c.name) && c.tier < club.tier',
    "    const big0 = (position === 1 && !PYRAMIDS.some(p => p.second === careerLeagueOf(state).id)) || seasonTrophies.includes('Champions League');\n    const classic = shuffle(everyClub.filter(c => (legacy || offerStepOk(club.tier, c.tier, big0)) && !vacancyNames.has(c.name) && c.tier < club.tier"]] },
};
let fleetDone = false;
const ARMS = {};
/* A probe both arms carry, inert unless a section sets globalThis.__cmAlloc: the summer cheque the rollover
   really computed, read off its own variable. It draws nothing. */
const ALLOC_PROBE_FROM = '  const carried = moving || !Number.isFinite(career.budget) ? 0 : Math.max(0, career.budget);\n';
const ALLOC_PROBE_TO = '  globalThis.__cmAlloc?.push({ allocation, moving, budget: club.budget, tier: club.tier, trophies: seasonTrophyCount });\n' + ALLOC_PROBE_FROM;
async function headArm(folder) {
  if (ARMS.head) return ARMS.head;
  const texts = { [ENGINE]: patchOnce(await readSource(root, ENGINE), ALLOC_PROBE_FROM, ALLOC_PROBE_TO, 'the cheque probe') };
  const spec = ENGINE_CONTROLS[CONTROL];
  if (spec) {
    let t = texts[spec.file] ?? await readSource(root, spec.file);
    for (const [from, to] of spec.patches) t = patchOnce(t, from, to, `control ${CONTROL}`);
    texts[spec.file] = t;
  }
  ARMS.head = await bundleArm(CONTROL || 'head', folder, path.join(root, 'src'), texts);
  return ARMS.head;
}
async function baseArm(folder) {
  if (ARMS.base) return ARMS.base;
  if (!BASE) { console.log('this section needs CM_BOARD_BASE, a checkout of the commit the branch started from; could not run'); process.exit(2); }
  ARMS.base = await bundleArm('base', folder, path.join(BASE, 'src'), { [ENGINE]: patchOnce(await readSource(BASE, ENGINE), ALLOC_PROBE_FROM, ALLOC_PROBE_TO, 'the base cheque probe') });
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
      else if (CONTROL && !(CONTROL in MODULE_CONTROLS)) { console.log(`control ${CONTROL} is not a section pure control`); process.exit(2); }
      const bv = await bundleModule(text, folder, CONTROL || 'head');
      let helpText = await readSource(root, HELP);
      if (CONTROL === 'example') helpText = patchOnce(helpText, '0.5 - 0.5) = 59', '0.5 - 0.5) = 58', 'control example');
      pureSection(bv, { baseText: await readSource(BASE, ENGINE), metersText: await readSource(root, METERS), helpText });
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
    } else if (part === 'fresh') {
      freshSection(await headArm(folder));
    } else if (part === 'title') {
      const head = await headArm(folder);
      const base = await baseArm(folder);
      const acc = { rows: [], draws: [], diff: [], bound: 0 };
      head.cm.registerLeagueOverrides(null);
      const runs = [];
      for (let seed = 0; seed < num('TITLE_SEEDS', 10); seed++) for (const [club, era] of TITLE_FLEET) for (const policy of ['stay', 'first']) runs.push({ club, era, seed, seasons: num('TITLE_SEASONS', 3), policy });
      for (const r of shard(runs, careerKey)) playCareer(head.cm, r, null, { beforeRoll: rollStreamHook(head, base, acc) });
      titleChecks(head, acc);
      ARMS.titleRows = acc.rows;
    } else if (part === 'kitty') {
      /* The tier 4 fleet (the weakest club of every league, OFFER_SEEDS seeds, two seasons), plus the title
         fleet's rollovers when section title ran first in the same call. */
      const head = await headArm(folder);
      const base = await baseArm(folder);
      const acc = { rows: [], draws: [], diff: [], bound: 0 };
      const fleet4 = tier4Fleet(head.cm);
      for (let seed = 0; seed < num('OFFER_SEEDS', 8); seed++) {
        for (const c of shard(fleet4)) playCareer(head.cm, { club: c.name, era: null, seed: 700 + seed, seasons: 2, policy: 'stay' }, null, { beforeRoll: rollStreamHook(head, base, acc) });
      }
      kittyChecks(head, [...(ARMS.titleRows ?? []), ...acc.rows], acc);
    } else if (part === 'saves') {
      await savesSection(await headArm(folder), await baseArm(folder), folder);
    } else if (part === 'takeover') {
      await takeoverSection(await headArm(folder), await baseArm(folder));
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
