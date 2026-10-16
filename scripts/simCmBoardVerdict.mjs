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

   Exit 0 green or measured, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
  await writeFile(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\nexport * as hs from '@/lib/managerHotSeat';\n");
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias, nodePaths: [path.join(root, 'node_modules')] });
  const mod = require(output);
  await mod.cm.ensureAllEraRosters();
  return { ...mod, output, name };
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
function playCareer(cm, { club, era, seed, seasons, policy }, onRoll) {
  let s = startOf(cm, club, era, seed);
  for (let season = 0; season < seasons; season++) {
    const played = playSeason(cm, s, seed * 7919 + season * 997);
    if (played.sacked || played.stuck) return { sacked: played.sacked, stuck: !!played.stuck, seasons: season };
    const fin = withSeed(seed * 31 + season + 3, () => cm.finishSeason(played.s));
    const take = policy === 'first' ? fin.summary.offers[0]?.club : undefined;
    const ctx = { club: fin.state.clubName, era, seed, season, policy, finState: fin.state, summary: fin.summary,
      leagueBefore: cm.careerLeagueOf(fin.state).id, def: defOf(cm, era, fin.state.clubName) };
    const next = withSeed(seed * 31 + season + 5, () => cm.startNextSeason(fin.state, take));
    onRoll?.({ ...ctx, next, moving: next.clubName !== fin.state.clubName, leagueAfter: cm.careerLeagueOf(next).id });
    s = next;
  }
  return { sacked: false, stuck: false, seasons };
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
function observedFate(cm, roll) {
  if (roll.moving) return null;
  if (cm.PYRAMIDS.some(p => p.second === roll.leagueBefore && p.top === roll.leagueAfter)) return 'up';
  if (cm.PYRAMIDS.some(p => p.top === roll.leagueBefore && p.second === roll.leagueAfter)) return 'down';
  return null;
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
