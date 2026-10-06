/* The development tier and the waiver wire. Round 944, over all four GM sims.

   src/lib/gmFarm.ts holds each league's tier (the NFL practice squad, the
   NBA's two way men, MLB's 40 man and options, the NHL farm club and its
   exemptions) as data with two dated sources per number, and
   src/lib/gmWaivers.ts runs the claim order by reverse standings. Neither is
   bound to a board yet, so this harness drives them beside the REAL engines,
   bundled with esbuild and read only: initLeague with the real NFL depth,
   initNbaLeague, initMlbLeague, initNhlLeague, each sport's own round, its
   playoffs, its offseason and (MLB, NHL) its draft class. Ten seasons per
   league, several seeds. Nothing reads dist, the clock or the network.

     1) caps hold every period: after every injury cover, after every round
        and after every summer, no club breaks a cap the tier owns (the NFL
        squad of 16, two elevations a game and three a man a season, the
        NBA's three two way men and fifty games, MLB's 40 and 26, 28 from
        September, three option years, MLB's dozen off the 40, the NHL's 50
        contracts). Counted periods are printed so a run that checked
        nothing cannot pass.
     2) an injury on a club with a tier is covered from the tier and never by
        an invented man: every man who joins an active roster in a cover step
        was on that club's own tier list just before it, and no id appears
        anywhere in the league that was not there before the step. Covers must
        happen (a floor per sport, from measured headroom).
     3) waivers: claims happen on real leagues (a floor per sport) and a
        claimed man never returns to the club that lost him by any farm or
        waiver path. Returns through the engines' own free agency are counted
        and printed, not failed: a man whose deal ran out is a free agent. A
        directed probe then has the claimer expose him with the loser worst in
        the order and needy: the loser must not get him back.
     4) a young man who plays in the tier grows faster: NFL practice squad
        men 23 or younger against active men of the same age with room to
        grow, the same engine growing both, mean gain per summer.
     5) draftees land where the sport sends them: MLB and NHL draftees in the
        tier (or the pool when it is full), never on the active roster.
     6) the save: the farm block's JSON bytes after every summer stay inside a
        stated budget per sport, and its ledger holds nobody who has left.
     7) every Send down and Call up button says what the move does: on a copy
        of the league, the option year the button names is the one spent, an
        exempt man goes straight down, Expose to waivers goes to the wire, a
        greyed button's move is refused, and Add to the 40 man is said only
        of a man off it.

   Controls, through SIM_GMFARM_CONTROL, each rewriting an in memory copy of
   the module behind an esbuild redirect (src is never touched). Each
   refuses to run if its anchor is not in the file exactly once:
     noclaim       the claim step removed from runWaivers       -> 3
     returnguard   canClaim forgets the lost list               -> 3
     elevcap       the two a game elevation limit dropped       -> 1
     invent        a cover step signs a brand new man           -> 2
     nobonus       the tier's growth bonus set to nothing       -> 4
     draftactive   MLB and NHL draftees put on the roster       -> 5
     noprune       the summer keeps ledger rows of men who left -> 6
     labelswap     an exposed man's button says Option him      -> 7
     cutroom       a full NFL squad makes no room for a man who
                   clears, so he joins it anyway                 -> 7
     nocap         call ups, claims and elevations skip the cap  -> 1
                   (measured seed 1: NHL covers take TBL from 0.4
                   to -0.4; the NFL engine's room never binds)

   The invent control also reddens 1 and 3 by design: an invented man
   overfills the 40 man and changes who is left to expose to the wire. The
   draftactive control also reddens 1: an MLB draftee on the roster is on
   the 40 man, and the summer's draft overfills it.

   MEASURED, 2026-10-03, ten seasons a league, seeds 1 to 5 then the default
   1 to 3 (per seed numbers move a little with the seed list, because the
   engines' id counters run on across leagues and ids break sort ties):
     covers a league     NFL 4770 to 4935, NBA 2882 to 3023, MLB 4098 to 4247,
                         NHL 1337 to 1427. Floors 2400, 1400, 2000, 650.
     claims a league     NFL 4 to 7 (the GM's stash attempt every fourth
                         week is its only exposure), MLB 372 to 432, NHL 166
                         to 186, NBA none (no NBA move exposes a man). Floors
                         2, 0, 200, 85. An NHL farm club is exempt for its
                         first seasons, so claims are graded at ten only.
     engine returns      MLB 5 to 8 per batch of leagues, a claimed man whose
                         deal ran out re-signed by his old club in free agency
                         (mlbAiMoves). Printed, not failed: the engines' sign
                         paths are not this round's (see gmWaivers.ts).
     growth, NFL         young squad men 2.49 a summer, young active men 1.50,
                         gap 0.97 to 1.01 per league; nobonus measured 0.01.
                         Floor 0.5.
     save bytes          NFL 1253 to 1410, NBA 12326 to 12627, MLB 83769 to
                         100911, NHL 52626 to 69172 (the leagues themselves
                         about 330K, 75K, 140K and 86K). Budgets 1800, 16000,
                         128000, 88000.
     runtime             about 90 s for the default three seeds.

   REMEASURED, 2026-10-05, after the review fixes (the wire reads each
   league's measure and last season, a full NFL squad cuts its lowest man
   for a man who clears, the cap binds), ten seasons, seeds 1 to 5:
     covers a league     NFL 4738 to 4859, NBA 2874 to 3080, MLB 4187 to 4234,
                         NHL 1400 to 1492. Floors unchanged.
     claims a league     NFL 9 to 11 (the stash now runs on a full squad),
                         MLB 346 to 397, NHL 153 to 170. Floors unchanged.
     growth, NFL         gap 0.97 to 1.02 per league.
     save bytes          NFL 1720 to 1939, NBA 12722 to 12927, MLB 81547 to
                         97784, NHL 52287 to 67480. NFL budget now 2400.
     runtime             170 s for five seeds. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_GMFARM_CONTROL || '';
const KNOWN = ['noclaim', 'returnguard', 'elevcap', 'invent', 'nobonus', 'draftactive', 'noprune', 'labelswap', 'cutroom', 'nocap'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${KNOWN.join(', ')})`);
  process.exit(1);
}
const SEEDS = (process.env.SIM_SEEDS || '1,2,3').split(',').map(Number);
const SEASONS = Number(process.env.SIM_SEASONS || 10);
const SPORTS = (process.env.SIM_SPORTS || 'nfl,nba,mlb,nhl').split(',');

let checks = 0;
let failures = 0;
const failedSections = new Set();
const fail = (sec, m) => { checks += 1; failures += 1; failedSections.add(sec); console.log(`   FAIL [${sec}] ${m}`); };
const ok = (sec, m) => { checks += 1; console.log(`   ok   [${sec}] ${m}`); };
const check = (sec, cond, m) => (cond ? ok(sec, m) : fail(sec, m));

const eol = s => s.replaceAll('\r\n', '\n');
const FARM = eol(fs.readFileSync(path.join(ROOT, 'src/lib/gmFarm.ts'), 'utf8'));
const WIRE = eol(fs.readFileSync(path.join(ROOT, 'src/lib/gmWaivers.ts'), 'utf8'));

function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.log(`   FAIL ${why}: anchor appears ${n} times, so the rewrite would not change exactly one thing`);
    console.log(`simGmFarm: stopped, ${failures + 1} failure`);
    process.exit(1);
  }
  return src.replace(anchor, () => replacement);
}

/* ---------- the controls, on in memory copies ---------- */
let farmSrc = FARM;
let wireSrc = WIRE;
if (CONTROL === 'noclaim') wireSrc = rewrite(wireSrc, '  const claimer = order.find(c => wants(c)) ?? null;', '  const claimer = null;', 'control noclaim');
if (CONTROL === 'returnguard') farmSrc = rewrite(farmSrc, '  if (waiverReturnRefusal(seat.club.lost, man.id)) return false;\n', '', 'control returnguard');
if (CONTROL === 'elevcap') farmSrc = rewrite(farmSrc, '        const p = seat.club.up.length < r.elevationsPerGame!', '        const p = true', 'control elevcap');
if (CONTROL === 'invent') {
  farmSrc = rewrite(farmSrc, '        if (p) done = callUp(ctx, seat, p.id, h.id);',
    "        if (p) { seat.players.push({ ...p, id: farmId(), name: p.name + ' Junior' }); done = true; }", 'control invent');
}
if (CONTROL === 'nobonus') farmSrc = rewrite(farmSrc, 'export const TIER_GROWTH_BONUS = 1;', 'export const TIER_GROWTH_BONUS = 0;', 'control nobonus');
if (CONTROL === 'draftactive') farmSrc = rewrite(farmSrc, "  if (r.drafteeTo === 'active') {", '  if (true) {', 'control draftactive');
if (CONTROL === 'noprune') farmSrc = rewrite(farmSrc, '      if (!here.has(id)) { delete seat.club.ledger[id]; continue; }', '      if (!here.has(id)) continue;', 'control noprune');
if (CONTROL === 'labelswap') farmSrc = rewrite(farmSrc, "  if (route === 'option') {\n    const l = seat.club.ledger[p.id];", "  if (route === 'waivers') {\n    const l = seat.club.ledger[p.id];", 'control labelswap');
if (CONTROL === 'cutroom') farmSrc = rewrite(farmSrc, '  for (const p of tierRoomCuts(r, from)) {', '  for (const p of [] as P[]) {', 'control cutroom');
if (CONTROL === 'nocap') {
  farmSrc = rewrite(farmSrc, '  return capShort(ctx, seat, p);\n}', '  return null;\n}', 'control nocap');
  farmSrc = rewrite(farmSrc, '  if (capShort(ctx, seat, man)) return false;\n', '', 'control nocap');
  farmSrc = rewrite(farmSrc, ' && !capShort(ctx, seat, x)) : undefined;', ') : undefined;', 'control nocap');
}
if (CONTROL) console.log(`   [control ${CONTROL} applied to an in memory copy of the module]`);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gmfarm-'));
const OUT = path.join(TMP, 'bundle.cjs');
await build({
  stdin: {
    contents: [
      "export * as nfl from '@/lib/frontOffice';",
      "export { FO_DEPTH } from '@/data/frontOfficeDepth';",
      "export * as nba from '@/lib/nbaFrontOffice';",
      "export * as mlb from '@/lib/mlbFrontOffice';",
      "export * as nhl from '@/lib/nhlFrontOffice';",
      "export * as farm from '@/lib/gmFarm';",
      "export * as wire from '@/lib/gmWaivers';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'cjs', platform: 'node', outfile: OUT, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'farm-copy',
    setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmFarm\.ts$/ }, () => ({ contents: farmSrc, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmWaivers\.ts$/ }, () => ({ contents: wireSrc, loader: 'ts' }));
    },
  }],
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const E = createRequire(import.meta.url)(OUT);
const { farm } = E;

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/* ---------- the four leagues, as their boards drive them ---------- */
const A = {
  nfl: {
    init: rng => E.nfl.initLeague(rng, { depth: E.FO_DEPTH }),
    rounds: E.nfl.REGULAR_WEEKS, games: 1, engineMax: () => E.nfl.DEEP_ROSTER_MAX,
    play: (lg, r, rng) => { for (const g of lg.schedule[r - 1] ?? []) E.nfl.simGame(g, lg.teams, rng); E.nfl.injuryPass(lg.teams, rng); },
    ai: (lg, rng) => E.nfl.aiWeeklyMoves(lg, '', rng),
    advance: lg => { lg.week += 1; },
    playoffs: (lg, rng) => E.nfl.runPlayoffs(lg.teams, rng),
    offseason: (lg, rng) => E.nfl.runOffseason(lg, rng),
    /* A new league opens with the real squads; each summer refills from the pool, then the draft's own name bank. */
    genName: E.nfl.prospectName, minSalary: () => 0.8,
  },
  nba: {
    init: rng => { const lg = E.nba.initNbaLeague(rng); E.nba.nbaTipOff(lg, rng); return lg; },
    rounds: E.nba.NBA_ROUNDS, games: E.nba.GAMES_PER_ROUND, engineMax: () => E.nba.NBA_ROSTER_MAX,
    play: (lg, r, rng) => E.nba.simRound(lg, '', rng),
    ai: () => {},
    advance: lg => { lg.round += 1; },
    playoffs: (lg, rng) => E.nba.runNbaPlayoffs(lg, rng),
    offseason: (lg, rng) => { E.nba.nbaOffseason(lg, rng); E.nba.nbaTipOff(lg, rng); },
    genName: E.nba.nbaGenName, minSalary: lg => E.nba.nbaMinContract(lg.cap),
  },
  mlb: {
    init: rng => E.mlb.initMlbLeague(rng),
    rounds: E.mlb.MLB_ROUNDS, games: E.mlb.MLB_GAMES_PER_ROUND, engineMax: t => E.mlb.mlbRosterMax(t),
    play: (lg, r, rng) => E.mlb.simMlbRound(lg, '', rng),
    ai: (lg, rng) => E.mlb.mlbAiMoves(lg, '', rng),
    advance: lg => { lg.round += 1; },
    playoffs: (lg, rng) => E.mlb.runMlbPlayoffs(lg, rng),
    offseason: (lg, rng) => E.mlb.mlbOffseason(lg, rng),
    keep: (lg, seat) => new Set(E.mlb.mlbSimReads(lg.teams[seat.abbr])),
    draftClass: (rng, taken) => E.mlb.mlbDraftClass(rng, 24, taken),
    toPlayer: (pr, rng) => E.mlb.mlbProspectToPlayer(pr, rng),
    genName: E.mlb.mlbGenName, minSalary: () => E.mlb.MLB_DEPTH_SALARY,
  },
  nhl: {
    init: rng => E.nhl.initNhlLeague(rng),
    rounds: E.nhl.NHL_FO_ROUNDS, games: E.nhl.NHL_GAMES_PER_ROUND, engineMax: () => E.nhl.NHL_ROSTER_MAX,
    play: (lg, r, rng) => E.nhl.simNhlRound(lg, '', rng),
    ai: (lg, rng) => E.nhl.nhlAiMoves(lg, '', rng),
    advance: lg => { lg.round += 1; },
    playoffs: (lg, rng) => E.nhl.runNhlFoPlayoffs(lg, rng),
    offseason: (lg, rng) => E.nhl.nhlOffseason(lg, rng),
    draftClass: (rng, taken) => E.nhl.nhlDraftClass(rng, 24, taken),
    toPlayer: (pr, rng) => E.nhl.nhlProspectToPlayer(pr, rng),
    genName: E.nhl.nhlGenName, minSalary: () => 0.8,
  },
};

function seatsOf(sport, lg, state) {
  return Object.values(lg.teams).map(t => ({
    abbr: t.abbr, players: t.players,
    reserve: sport === 'nfl' ? (t.practice ??= []) : state.clubs[t.abbr].reserve,
    /* The NHL engine keeps overtime losses apart (a point each); the wire reads them as the league does. */
    club: state.clubs[t.abbr], wins: t.wins, losses: t.losses, otLosses: t.otLosses,
  }));
}
/* Each engine's own cap room, as a board binds it: a call up or a claim adds his salary to the club's payroll.
   The NFL and NHL caps are hard. The NBA's is soft: a man on the engine's minimum fits through the minimum
   exception (the claim source in FARM_RULES.nba says so). MLB's engine line is a luxury tax, so none. */
const CAP_ROOM = {
  nfl: (lg, t) => () => E.nfl.capRoom(t, lg.cap),
  nba: (lg, t) => man => (man.salary <= E.nba.nbaMinContract(lg.cap) ? Infinity : E.nba.nbaCapRoom(t, lg.cap)),
  nhl: (lg, t) => () => E.nhl.nhlCapRoom(t, lg.cap),
};
/* In the summer there is no active roster limit (MLB's 26 runs Opening Day
   to August 31), so `summer` lifts it; the tier's own caps still hold. */
function ctxOf(sport, lg, state, round, summer = false) {
  const rules = farm.FARM_RULES[sport];
  const sept = sport === 'mlb' && round >= farm.MLB_SEPTEMBER_FROM_ROUND;
  return {
    rules, seats: seatsOf(sport, lg, state), pool: lg.freeAgents, season: lg.season, events: [],
    activeMax: s => (summer && sport === 'mlb' ? Infinity : farm.activeMaxFor(rules, A[sport].engineMax(lg.teams[s.abbr]), sept)),
    capRoom: CAP_ROOM[sport] && ((s, man) => CAP_ROOM[sport](lg, lg.teams[s.abbr])(man)),
  };
}
const stockOpts = (sport, lg, state, rng) => ({ rng, taken: farm.farmNames(state, lg), genName: A[sport].genName, minSalary: A[sport].minSalary(lg) });
/** Every id anywhere in the league: rosters, tiers and the pool. */
const allIds = (lg, state, sport) => {
  const s = new Set(lg.freeAgents.map(p => p.id));
  for (const seat of seatsOf(sport, lg, state)) for (const p of [...seat.players, ...seat.reserve]) s.add(p.id);
  return s;
};
/** "club:id" for every man a club lost on waivers who is back on its roster or tier. */
const lostPresent = (lg, state, sport) => {
  const out = new Set();
  for (const seat of seatsOf(sport, lg, state)) {
    const here = new Set([...seat.players, ...seat.reserve].map(p => p.id));
    for (const id of seat.club.lost) if (here.has(id)) out.add(`${seat.abbr}:${id}`);
  }
  return out;
};

/* ---------- one league, ten seasons ---------- */
const S = {};
const statsOf = sport => (S[sport] ??= {
  periods: 0, breaches: [], capBad: [], covers: 0, coverBad: [], claims: 0, farmReturns: [], engineReturns: 0,
  gainsPS: [], gainsActive: [], gapBy: {}, coversBy: {}, claimsBy: {}, tierSize: [], poolSize: [], leagueBytes: [], buttons: 0, buttonBad: [], kinds: new Set(), draftTier: 0, draftPool: 0, draftBad: [], bytes: [], stale: [], probes: [],
});

function runLeague(sport, seed) {
  const st = statsOf(sport);
  const ad = A[sport];
  const rng = mulberry32(seed * 7919 + sport.length * 104729);
  const lg = ad.init(rng);
  const state = farm.newFarmState(sport, lg.season, Object.keys(lg.teams));
  if (sport !== 'nfl') { const c = ctxOf(sport, lg, state, 1); const o = stockOpts(sport, lg, state, rng); for (const s of c.seats) farm.stockTier(c, s, o); }

  let present = lostPresent(lg, state, sport);
  /* A farm step may never put a lost man back; an engine step is counted. */
  /* Section 1 also: no farm step takes a club from under a hard cap (NFL, NHL) to over it. */
  const hard = sport === 'nfl' || sport === 'nhl';
  const rooms = () => new Map(Object.values(lg.teams).map(t => [t.abbr, CAP_ROOM[sport](lg, t)()]));
  const farmStep = (label, fn) => {
    const roomBefore = hard ? rooms() : null;
    const r = fn();
    if (roomBefore) for (const [abbr, now] of rooms()) if (roomBefore.get(abbr) >= 0 && now < 0) st.capBad.push(`${label} ${abbr} ${roomBefore.get(abbr)} to ${now}`);
    const now = lostPresent(lg, state, sport);
    for (const k of now) if (!present.has(k)) st.farmReturns.push(`${label} ${k}`);
    present = now;
    return r;
  };
  const engineStep = fn => {
    fn();
    const now = lostPresent(lg, state, sport);
    for (const k of now) if (!present.has(k)) st.engineReturns += 1;
    present = now;
  };
  const caps = (ctx, label) => {
    st.periods += 1;
    for (const seat of ctx.seats) for (const b of farm.farmCapBreaches(ctx.rules, seat, ctx.activeMax(seat))) st.breaches.push(`${label}: ${b}`);
  };
  const tally = ctx => { for (const e of ctx.events) if (e.kind === 'claimed') { st.claims += 1; st.claimsBy[seed] = (st.claimsBy[seed] ?? 0) + 1; } };

  const gp0 = st.gainsPS.length;
  const ga0 = st.gainsActive.length;
  for (let season = 0; season < SEASONS; season += 1) {
    farmStep('open', () => {
      const c = ctxOf(sport, lg, state, 1);
      farm.trimTier(c);
      if (sport === 'mlb') farm.trimToActive(c, s => ad.keep(lg, s));
      tally(c);
      caps(c, `s${season} open`);
    });
    for (let r = 1; r <= ad.rounds; r += 1) {
      /* Section 2: the cover step, against a snapshot taken just before it. */
      const c1 = ctxOf(sport, lg, state, r);
      const before = allIds(lg, state, sport);
      const tierBefore = new Map(c1.seats.map(s => [s.abbr, new Set(s.reserve.map(p => p.id))]));
      const rosterBefore = new Map(c1.seats.map(s => [s.abbr, new Set(s.players.map(p => p.id))]));
      farmStep('cover', () => farm.coverInjuries(c1, ad.games));
      for (const s of c1.seats) {
        for (const p of s.players) {
          if (rosterBefore.get(s.abbr).has(p.id)) continue;
          if (!tierBefore.get(s.abbr).has(p.id)) st.coverBad.push(`${s.abbr} ${p.id} joined from outside the tier`);
        }
      }
      for (const id of allIds(lg, state, sport)) if (!before.has(id)) st.coverBad.push(`new id ${id} in a cover step`);
      const covered = c1.events.filter(e => e.coverFor).length;
      st.covers += covered;
      st.coversBy[seed] = (st.coversBy[seed] ?? 0) + covered;
      caps(c1, `s${season} r${r} cover`);
      engineStep(() => ad.play(lg, r, rng));
      const c2 = ctxOf(sport, lg, state, r);
      farmStep('after', () => { farm.afterRound(c2, ad.games); farm.rivalSignings(c2, rng); });
      /* The GM's send down, the one path that exposes an NFL man: every
         fourth week the first club tries to stash its best young prospect on
         the practice squad, through waivers, and keeps him only if he clears,
         a full squad cutting its lowest rated man to make room (section 1
         holds the squad to its cap after it). */
      if (sport === 'nfl' && r % 4 === 0) {
        const me = c2.seats[0];
        const low = me.players.filter(p => p.out <= 0 && p.age <= 25 && !me.club.up.includes(p.id)).sort((a, b) => b.pot - a.pot || a.id.localeCompare(b.id))[0];
        if (low) farmStep('gm', () => farm.sendDown(c2, me, low.id));
      }
      tally(c2);
      caps(c2, `s${season} r${r} after`);
      engineStep(() => ad.ai(lg, rng));
      if (sport === 'mlb') farmStep('trim', () => { const c = ctxOf(sport, lg, state, r); farm.trimToActive(c, s => ad.keep(lg, s)); tally(c); caps(c, `s${season} r${r} trim`); });
      if (r < ad.rounds) ad.advance(lg);
    }
    farmStep('close', () => { const c = ctxOf(sport, lg, state, ad.rounds); farm.closeSeason(c); tally(c); });
    summer(sport, lg, state, rng, st, season, farmStep, engineStep, caps, tally);
  }
  probe(sport, lg, state, st, seed);
  buttons(sport, lg, state, st);
  if (sport === 'nfl') st.gapBy[seed] = mean(st.gainsPS.slice(gp0)) - mean(st.gainsActive.slice(ga0));
  st.leagueBytes.push(JSON.stringify(lg).length);
}

/* ---------- the summer: playoffs, the engine's offseason, the draft, the tier's own ---------- */
function summer(sport, lg, state, rng, st, season, farmStep, engineStep, caps, tally) {
  const ad = A[sport];
  const young = farm.TIER_YOUNG_AGE;
  const snapPS = new Map();
  const snapAct = new Map();
  if (sport === 'nfl') {
    for (const t of Object.values(lg.teams)) {
      for (const p of t.practice ?? []) if (p.age <= young && p.pot - p.ovr >= 3) snapPS.set(p.id, p.ovr);
      for (const p of t.players) if (p.age <= young && p.pot - p.ovr >= 3) snapAct.set(p.id, p.ovr);
    }
  }
  /* The draft order is the season just played, worst first. */
  const pct = t => (t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0.5);
  const order = Object.values(lg.teams).sort((a, b) => pct(a) - pct(b) || a.abbr.localeCompare(b.abbr)).map(t => t.abbr);
  engineStep(() => { ad.playoffs(lg, rng); ad.offseason(lg, rng); });
  farmStep('summer', () => {
    const c = ctxOf(sport, lg, state, 1, true);
    farm.farmOffseason(state, c, stockOpts(sport, lg, state, rng));
    tally(c);
    caps(c, `s${season} summer`);
    for (const s of c.seats) {
      const here = new Set([...s.players, ...s.reserve].map(p => p.id));
      for (const id of Object.keys(s.club.ledger)) if (!here.has(id)) st.stale.push(`${s.abbr} ${id}`);
    }
  });
  if (ad.draftClass) {
    farmStep('draft', () => {
      const c = ctxOf(sport, lg, state, 1, true);
      const cls = ad.draftClass(rng, farm.farmNames(state, lg));
      const bySeat = new Map(c.seats.map(s => [s.abbr, s]));
      order.forEach((abbr, i) => {
        if (!cls[i]) return;
        const man = ad.toPlayer(cls[i], rng);
        const seat = bySeat.get(abbr);
        const where = farm.placeDraftee(c, seat, man);
        if (where === 'active' || seat.players.some(p => p.id === man.id)) st.draftBad.push(`${abbr} ${man.id} put on the roster`);
        else if (where === 'tier') { if (seat.reserve.some(p => p.id === man.id)) st.draftTier += 1; else st.draftBad.push(`${abbr} ${man.id} placed nowhere`); }
        else st.draftPool += 1;
      });
      caps(c, `s${season} draft`);
    });
  }
  if (sport === 'nfl') {
    for (const t of Object.values(lg.teams)) {
      for (const p of t.practice ?? []) if (snapPS.has(p.id)) st.gainsPS.push(p.ovr - snapPS.get(p.id));
      for (const p of t.players) if (snapAct.has(p.id)) st.gainsActive.push(p.ovr - snapAct.get(p.id));
    }
  }
  st.bytes.push(JSON.stringify(state).length);
  const sizes = seatsOf(sport, lg, state).map(x => x.reserve.length);
  (st.tierSize[season] ??= []).push(mean(sizes));
  (st.poolSize[season] ??= []).push(lg.freeAgents.length);
}

/* ---------- section 3's probe: the claimer exposes him, the loser worst and needy ---------- */
function probe(sport, lg, state, st) {
  const c = ctxOf(sport, lg, state, 1);
  for (const loser of c.seats) {
    for (const id of loser.club.lost) {
      const holder = c.seats.find(s => s !== loser && s.players.some(p => p.id === id));
      if (!holder) continue;
      const man = holder.players.find(p => p.id === id);
      const opts = sport === 'mlb' && farm.mlbHasOptions(c.rules, holder.club.ledger[id], man, c.season);
      loser.wins = 0;
      loser.losses = 999;
      for (const p of loser.players) if (farm.posGroup(sport, p.pos) === farm.posGroup(sport, man.pos)) p.ovr = 1;
      while (loser.players.length && farm.activeCount(c.rules, loser) >= c.activeMax(loser)) loser.players.pop();
      while (loser.reserve.length && ((c.rules.fortyMan && farm.fortyManCount(loser) >= c.rules.fortyMan) || (c.rules.contractLimit && farm.contractCount(loser) >= c.rules.contractLimit))) loser.reserve.pop();
      const live = farm.canClaim(c, { ...loser, club: { ...loser.club, lost: [] } }, man, opts);
      holder.players.splice(holder.players.indexOf(man), 1);
      farm.waive(c, holder, man);
      const back = [...loser.players, ...loser.reserve].some(p => p.id === id);
      st.probes.push({ live, back });
      return;
    }
  }
}

/* ---------- section 7: every button says what its move does ---------- */
function buttons(sport, lg, state, st) {
  const base = ctxOf(sport, lg, state, 1);
  const kind = (b, live) => { if (live) st.kinds.add(b); };
  /* One Send down button pressed on a copy: the move must be the one its words name. */
  const sendDownCheck = (L, c, me, id, tag) => {
    const man = me.players.find(x => x.id === id);
    const b = farm.farmSendDownButton(c, me, man);
    const poolBefore = L.freeAgents.length;
    const before = me.club.ledger[id]?.optUsed;
    const res = farm.sendDown(c, me, id);
    const after = me.club.ledger[id]?.optUsed;
    let good;
    if (b.refusal) good = res === null;
    else if (b.label.startsWith('Option him (option year')) good = res === 'option' && after === Number(b.label.match(/year (\d+) of/)[1]);
    else if (b.label.startsWith('Option him (already')) good = res === 'option' && after === before;
    else if (b.label.startsWith('Send to the farm club')) good = res === 'exempt';
    else if (b.label === 'Expose to waivers') {
      /* Claimed he is gone for good; cleared he is where the warning said, and anybody it named was cut. */
      const inTier = me.reserve.some(x => x.id === id);
      const inPool = L.freeAgents.some(x => x.id === id);
      const cut = b.warn.includes('released to make room');
      if (res === 'claimed') good = !inTier && !me.players.some(x => x.id === id) && me.club.lost.includes(id);
      else if (res === 'cleared') good = b.warn.includes('becomes a free agent') ? inPool && !inTier : inTier && !inPool;
      else good = false;
      if (good && res === 'cleared' && cut) good = farm.tierLoad(me) <= c.rules.tierCap && L.freeAgents.length > poolBefore;
      if (cut) kind('waivers, a squad man cut', true);
    } else good = false;
    if (tag && b.refusal) kind('refused after a call up', true);
    kind(b.label.replace(/\(.*$/, '').trim(), !b.refusal);
    st.buttons += 1;
    if (!good) st.buttonBad.push(`${me.abbr} ${id}${tag} "${b.label}" did ${res}`);
  };
  for (const seat of base.seats.slice(0, 6)) {
    for (const p of seat.players.filter(x => x.out <= 0)) {
      const L = structuredClone(lg);
      const c = ctxOf(sport, L, structuredClone(state), 1);
      sendDownCheck(L, c, c.seats.find(s => s.abbr === seat.abbr), p.id, '');
    }
    for (const p of seat.reserve) {
      const L = structuredClone(lg);
      const c = ctxOf(sport, L, structuredClone(state), 1);
      const me = c.seats.find(s => s.abbr === seat.abbr);
      const man = me.reserve.find(x => x.id === p.id);
      const b = farm.farmCallUpButton(c, me, man);
      const wasOff = !!me.club.ledger[p.id]?.off40;
      const res = farm.callUp(c, me, p.id);
      const good = b.refusal ? !res : res && me.players.some(x => x.id === p.id) && (b.label.startsWith('Add to the 40') === wasOff) && !me.club.ledger[p.id]?.off40;
      kind(b.label, !b.refusal);
      st.buttons += 1;
      if (!good) st.buttonBad.push(`${seat.abbr} ${p.id} "${b.label}" did ${res}`);
      /* Up, then straight back down on the same copy: the man the GM just called up (an exempt NHL kid, an
         optioned MLB man, an NBA man now on a standard deal, who must be refused). */
      if (good && res) sendDownCheck(L, c, me, p.id, ' (just called up)');
    }
  }
}

/* ---------- run and report ---------- */
/* Bands, from the measured runs in the header, for the default ten seasons.
   A shorter run scales the cover floors and grades claims only at ten (an
   NHL farm club is exempt for its first seasons, so early claims are rare). */
const TEN = SEASONS / 10;
const COVER_FLOOR = { nfl: 2400 * TEN, nba: 1400 * TEN, mlb: 2000 * TEN, nhl: 650 * TEN };
const CLAIM_FLOOR = SEASONS >= 10 ? { nfl: 2, nba: 0, mlb: 200, nhl: 85 } : { nfl: 0, nba: 0, mlb: 0, nhl: 0 };
const GROWTH_GAP = 0.5;
/* Section 7: every kind of move each sport offers must be exercised live (not greyed) at least once a batch. */
const KINDS = {
  nfl: ['Expose to waivers', 'waivers, a squad man cut', 'Call up'],
  nba: ['Sign to a standard contract', 'refused after a call up'],
  mlb: ['Option him', 'Expose to waivers', 'Call up', 'Add to the 40 man and call up'],
  nhl: ['Send to the farm club', 'Expose to waivers', 'Call up'],
};
/* The farm block's own bytes, about a quarter over the most measured. MLB's
   is the big one: thirty clubs keep a 40 man side and a dozen minor leaguers
   each, about two thirds of the size of the MLB league save itself. The
   NFL's grew with the review fixes: each club keeps last season's final
   standing (prev) for the offseason claim order. */
const BYTES_BUDGET = { nfl: 2400, nba: 16000, mlb: 128000, nhl: 88000 };

const t0 = Date.now();
for (const sport of SPORTS) {
  for (const seed of SEEDS) {
    const t = Date.now();
    runLeague(sport, seed);
    console.log(`   .. ${sport} seed ${seed}: ${SEASONS} seasons in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
}
for (const sport of SPORTS) {
  const st = S[sport];
  const per = n => (n / SEEDS.length).toFixed(1);
  console.log(`\n== ${sport}: ${st.periods} periods, ${per(st.covers)} covers, ${per(st.claims)} claims, ${st.engineReturns} engine returns per ${SEEDS.length} leagues`);
  console.log(`   tier size by summer: ${st.tierSize.map(x => mean(x).toFixed(1)).join(' ')}; pool: ${st.poolSize.map(x => mean(x).toFixed(0)).join(' ')}`);
  check(1, st.periods > SEASONS * SEEDS.length * 10, `${sport}: ${st.periods} periods checked`);
  check(1, st.breaches.length === 0, `${sport}: no cap broken (${st.breaches.length})${st.breaches.length ? ' first: ' + st.breaches.slice(0, 3).join(' | ') : ''}`);
  if (sport === 'nfl' || sport === 'nhl') check(1, st.capBad.length === 0, `${sport}: no farm step took a club over the cap (${st.capBad.length})${st.capBad.length ? ' first: ' + st.capBad.slice(0, 3).join(' | ') : ''}`);
  check(2, st.coverBad.length === 0, `${sport}: every cover came from the club's own tier (${st.coverBad.length} bad)${st.coverBad.length ? ' first: ' + st.coverBad.slice(0, 3).join(' | ') : ''}`);
  const bySeed = o => SEEDS.map(s => o[s] ?? 0);
  check(2, bySeed(st.coversBy).every(n => n >= COVER_FLOOR[sport]), `${sport}: covers by league ${bySeed(st.coversBy).join(' ')}, floor ${COVER_FLOOR[sport]} each`);
  if (sport === 'nba') {
    /* No farm move exposes an NBA man: a two way man is never waived here and a standard contract never goes
       down, so the wire has nothing to grade on an NBA league. A check that cannot fail is not run; the NBA
       claim order is pinned in gmFarm.test.ts. Claims are still counted, and any would show here. */
    console.log(`   --   [3] nba: no farm move exposes an NBA man, section 3 not graded (claims seen ${st.claims})`);
  } else {
    check(3, bySeed(st.claimsBy).every(n => n >= CLAIM_FLOOR[sport]), `${sport}: claims by league ${bySeed(st.claimsBy).join(' ')}, floor ${CLAIM_FLOOR[sport]} each`);
    check(3, st.farmReturns.length === 0, `${sport}: no claimed man came back by a farm or waiver path (${st.farmReturns.length})${st.farmReturns.length ? ' first: ' + st.farmReturns.slice(0, 3).join(' | ') : ''}`);
    const live = st.probes.filter(p => p.live);
    if (CLAIM_FLOOR[sport] > 0) check(3, live.length > 0, `${sport}: the return probe was live in ${live.length} of ${st.probes.length} leagues`);
    check(3, st.probes.every(p => !p.back), `${sport}: the loser never got him back in the probe (${st.probes.filter(p => p.back).length} back)`);
  }
  if (sport === 'nfl') {
    const gaps = SEEDS.map(s => st.gapBy[s]);
    check(4, gaps.every(g => g >= GROWTH_GAP), `${sport}: young squad men gain ${mean(st.gainsPS).toFixed(2)} a summer, young active men ${mean(st.gainsActive).toFixed(2)} (n ${st.gainsPS.length} and ${st.gainsActive.length}); gap by league ${gaps.map(g => g.toFixed(2)).join(' ')}, floor ${GROWTH_GAP} each`);
  }
  if (A[sport].draftClass) {
    check(5, st.draftBad.length === 0 && st.draftTier > 0, `${sport}: ${per(st.draftTier)} draftees a league in the tier, ${per(st.draftPool)} to the pool, ${st.draftBad.length} misplaced${st.draftBad.length ? ' first: ' + st.draftBad.slice(0, 2).join(' | ') : ''}`);
  }
  const big = Math.max(...st.bytes);
  check(6, st.bytes.every(b => b <= BYTES_BUDGET[sport]), `${sport}: farm block ${Math.min(...st.bytes)} to ${big} bytes over ${st.bytes.length} summers (the league itself ${Math.min(...st.leagueBytes)} to ${Math.max(...st.leagueBytes)}), budget ${BYTES_BUDGET[sport]}`);
  check(6, st.stale.length === 0, `${sport}: no ledger row for a man who left (${st.stale.length})`);
  const missing = KINDS[sport].filter(k => !st.kinds.has(k));
  check(7, missing.length === 0, `${sport}: every kind of move ran live (${[...st.kinds].join('; ')})${missing.length ? ' missing: ' + missing.join('; ') : ''}`);
  check(7, st.buttons > 0 && st.buttonBad.length === 0, `${sport}: ${st.buttons} buttons did what they say (${st.buttonBad.length} did not)${st.buttonBad.length ? ' first: ' + st.buttonBad.slice(0, 2).join(' | ') : ''}`);
}
const red = [...failedSections].sort().join(', ');
console.log(`\nsimGmFarm: ${checks} checks, ${failures} failure${failures === 1 ? '' : 's'}${red ? ` (sections ${red})` : ''}, ${((Date.now() - t0) / 1000).toFixed(1)} s${CONTROL ? `, control ${CONTROL}` : ''}`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
