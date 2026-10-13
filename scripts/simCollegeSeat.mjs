/**
 * Round 1320: the athletic director in CFB Dynasty and CBB Dynasty, held on the two real engines.
 *
 * gmSeat.ts's own rules (the badly ceiling, the club that let you go, the walk guarantee, the bid rates) are
 * simGmSeat's to hold on model leagues. This harness holds the BINDING: src/lib/collegeSeat.ts (the seat, sport
 * free), src/lib/collegeSeatBind.ts (every write into a dynasty's state) and src/lib/cfbSeatBind.ts and
 * src/lib/cbbSeatBind.ts (each sport's view and bracket), driven over fleets of real dynasties in the board's
 * own order: start (the seat built), every round, the close (the descriptor's own postseason, award and title
 * record), the seat's grade, a bid, a firing, the market, a job taken or a year out, then the offseason with a
 * greedy player (simCfbStaff's: three portal men, the class, the best coordinator he can pay).
 *
 * A fleet is FLEET dynasties a sport a seed (default 300, a quarter starting at each prestige tier), SEASONS
 * seasons each (default 10), seeds SIM_COLLEGE_SEAT_SEEDS (default 1,2,3). After a bid, even dynasties go and
 * odd ones stay. After a firing the policy takes the best tier offered, then the keenest; a quiet market sits
 * the year out; a closed market ends the dynasty.
 *
 * Sections:
 *  S1 THE ASK. Every season start: the stored ask equals the harness's own oracle (seatMandate over the rank
 *     of the roster by the engine's strength, the defending champion's floor, and this game's tilt as BUILT
 *     below: in CBB a 'respect' or 'rebuild' ask is lifted one step, in CFB every postseason ask, 'title',
 *     'contend' and 'playoffs', is one step softer), in the pack's words, no raw placeholder, no dash, no
 *     'ownership' or 'franchise'. The first season of a job taken keeps that offer's ask. Prints how many
 *     season starts have a roster rank that differs from the prestige rank (must be above zero). At the first
 *     and the middle round of every season he holds the seat, his place (what the tile's live line reads
 *     against the field) is where the engine's own ranking puts his program.
 *  S2 THE OUTCOME. Every graded season: the seat's outcome equals the harness's own reading of the engine's
 *     return (the field list, the game named for the final, the champion; for CBB the engine's myExit as a
 *     second witness), and the grade is gradeSeason's on it. Prints the grade shares per sport and ask tier,
 *     the share fired within the run by first ask tier and by starting tier, and the share of first feeds
 *     already closed by starting tier.
 *  S3 TRUST. Every graded season: trust after equals trust before plus gradeSeason's move, clamped to 0..100.
 *     Seasons bucketed by shortfall (levels short for a postseason ask, wins short for a win total): each
 *     bucket's move is exactly gradeSeason's, it never rises as the shortfall grows, and it falls strictly
 *     only where gradeSeason's diff changes.
 *  S4 THE FIRING. Fired exactly when trust reaches zero; firings in both sports; after every firing the market
 *     exists in one of its three states, and closed only when collegeNextYear says shut.
 *  S5 NEVER A PROGRAM THAT LET HIM GO. No offer in any feed and no bid comes from a program that fired him.
 *     Prints what this game's wider rule removed from feeds and bids beyond seatOffers' own. The fleets
 *     almost never meet the rule, so S5 also tries every pair of programs on keyed draws: a coach let go
 *     twice (the market must drop the first program when gmSeat draws it) and a coach let go who then wins
 *     one tier below that program (its bid must be dropped). Both must meet the rule at least once.
 *  S6 THE CALL FROM ABOVE. Every bid follows a season graded 'title' or 'overachieved' (the record and the
 *     oracle), comes from one tier above his program by prestige (tiers computed here), never reaches a tier
 *     1 coach and never names his own program. Prints bids per big year.
 *  S7 KEYED, NEVER RANDOM. Every market and bid read twice, and after a JSON round trip, is identical; every
 *     seat function runs with Math.random swapped for a stub that throws.
 *  S8 THE SEAT WATCHES. Every dynasty runs beside a seat off twin on the same draws: the state without its
 *     seat is byte equal after every round and every close until his first move or firing.
 *  S9 ONE RULE FOR NEXT YEAR. gmSeat.seatNextYear and gmDeskHost.hostNextYear over a ladder of 40320
 *     synthetic careers print the digest hostNextYear printed on the base (48cb9d4b), and collegeNextYear is
 *     seatNextYear with 'climb' read as 'shut' (a program's tier is its editorial prestige, which never moves)
 *     over the ladder and every career the fleets produce; every market reads collegeNextYear.
 *  SY THE YEAR OUT. Refused in a seat, on an open season and when next year is shut; after it the season is
 *     exactly one higher with its champion on record, his titles and seasons played are unchanged, his years
 *     out are one higher and the state he left is untouched. Prints the chairs left empty at the program that
 *     let him go during the year out.
 *
 * Controls (SIM_COLLEGE_SEAT_CONTROL), each an in memory rewrite at bundle time, refused unless its line is in
 * its file exactly once: see EDITS. Each must turn its own section red; the closing line says FIRED or DID NOT
 * FIRE. Variants SIM_COLLEGE_SEAT_TILT=cfb-none (no football tilt) and none (the pro ladder in both sports) are
 * not controls: they print the asks the lead ruled on (C:/Users/antho/dukb-handoff/2026-10-10/results-g/
 * step1-1320.md).
 *
 * MEASURED (GitHub runners, 300 dynasties a sport a seed, seeds 1,2,3, ten seasons, about 120 to 200 s):
 *   as built (r1320-s1b's cfb-soft run): CFB fired within ten seasons by starting tier 10.7, 17.3, 19.6, 24.9
 *   percent, 177 firings, 470 bids; CBB 13.3, 0.0, 0.9, 4.0 percent, 41 firings, 605 bids. With no football tilt
 *   (r1320-s1): CFB 87.1, 95.6, 67.1, 48.9 percent, 768 firings. S8 compared 57618 CFB and 72450 CBB rounds byte
 *   for byte. Every section counts and requires its own floor (firings, bids, feeds, years out, refusals above
 *   zero), so none can pass empty. The controls, each on seed 1, fired on r1320-s1c: rankbyprestige S1 2287,
 *   ccgcount S2 1266, flattrust S3 6201, firedends S4 244, anyseason S6 985, bidtier S6 227, seatdraw S7,
 *   seatleak S8 4397, nextyear S9, yearoutskip SY 235.
 *   After the review (r1320-fix-a, seeds 1,2,3, 248 s): S5's twice fired pairs met the wider rule in 46 of
 *   1892 CFB markets and 52 of 1560 CBB markets, and 119 and 108 bids from a program that let him go were
 *   dropped (keyed, the same on every seed), while the fleets met it 0 times; his place was checked 17202 and
 *   17682 times. The controls added or narrowed then, on seed 1: allowfirer (the market filter alone) S5 198,
 *   bidfirer (the bid filter alone) S5 229, placeoff S1 5714. allowfirer used to rewrite gmSeat's last program
 *   rule as well and fired only on that rule, once over three seeds.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const sha = s => crypto.createHash('sha1').update(s).digest('hex');

const CONTROL = process.env.SIM_COLLEGE_SEAT_CONTROL || '';
const TILT = process.env.SIM_COLLEGE_SEAT_TILT || 'built';
const SEEDS = (process.env.SIM_COLLEGE_SEAT_SEEDS || '1,2,3').split(',').map(Number);
const FLEET = Number(process.env.SIM_COLLEGE_SEAT_FLEET || 300);
const SEASONS = Number(process.env.SIM_COLLEGE_SEAT_SEASONS || 10);
const SPORTS = (process.env.SIM_COLLEGE_SEAT_SPORTS || 'cfb,cbb').split(',');
const BASE_LADDER_DIGEST = 'e3b0c4481b69e5a822e4f8bb953bcb35481fd2a9';

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}

let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 6) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 7) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const ok = (cond, m) => { if (!cond) fail(typeof m === 'function' ? m() : m); return !!cond; };
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  seat: path.join(ROOT, 'src', 'lib', 'collegeSeat.ts'),
  bind: path.join(ROOT, 'src', 'lib', 'collegeSeatBind.ts'),
  cfbbind: path.join(ROOT, 'src', 'lib', 'cfbSeatBind.ts'),
  gm: path.join(ROOT, 'src', 'lib', 'gmSeat.ts'),
};
/* name: [section, file, the line it rewrites, what it becomes, (a second pair for a two line idea)] */
const EDITS = {
  rankbyprestige: ['S1', 'seat', 'return strengthRank(Object.fromEntries(view.programs.map(p => [p.id, p.strength])), id);',
    'return strengthRank(Object.fromEntries(view.programs.map(p => [p.id, p.prestige])), id);'],
  placeoff: ['S1', 'cfbbind', '    place: cfbRankings(st).findIndex(t => t.id === st.myTeam) + 1,', '    place: cfbRankings(st).findIndex(t => t.id === st.myTeam),'],
  ccgcount: ['S2', 'cfbbind', '  bracketOf: recap => recap.bracket,', '  bracketOf: recap => [...(recap as unknown as { ccgs: CfbPlayoffGame[] }).ccgs, ...recap.bracket],'],
  flattrust: ['S3', 'seat', '  const grade = seatGrade(collegePack(view.sport), mandate, out);',
    "  const grade = { ...seatGrade(collegePack(view.sport), mandate, out), result: 'met' as const, trustDelta: 14 };"],
  firedends: ['S4', 'seat', '  if (holdsSeat(block) || !seasonClosed(view)) return null;', '  if (true) return null;'],
  /* the two college filters of this game's wider rule, one control each; gmSeat's own last program rule is simGmSeat's */
  allowfirer: ['S5', 'seat', '  const offers = drawn.filter(o => !firers.has(o.teamId))', '  const offers = drawn.filter(o => true)'],
  bidfirer: ['S5', 'seat', '  if (!bid || formerFirers(block.career).has(bid.teamId)) return null;', '  if (!bid) return null;'],
  anyseason: ['S6', 'gm', '{ title: 0.6, overachieved: 0.35 }', '{ title: 0.6, overachieved: 0.35, met: 0.35, missed: 0.35, badly: 0.35 }'],
  bidtier: ['S6', 'seat', '  return view.programs.map(p => ({ id: p.id, name: p.name, strength: p.prestige }));',
    '  return view.programs.map(p => ({ id: p.id, name: p.name, strength: p.strength }));'],
  seatdraw: ['S7', 'seat', '  const t = applyMandateResult(block.trust, grade);', '  Math.random();\n  const t = applyMandateResult(block.trust, grade);'],
  seatleak: ['S8', 'bind', '  if (res) st.seat = res.block;', '  if (res) st.seat = res.block;\n  (st as unknown as { nil: number }).nil += 1;'],
  nextyear: ['S9', 'gm', '  const later = { ...p, seasonsOut: p.seasonsOut + 1 };', '  const later = { ...p, seasonsOut: p.seasonsOut + 2 };'],
  yearoutskip: ['SY', 'bind', '  copy.seat = collegeSitOut(st.seat, view);', '  copy.seat = st.seat;'],
};
/* The tilt table as built, and the variants measured for the lead: each rewrites COLLEGE_ASK_TILT, and the
   S1 oracle reads the same table from VARIANT_TABLE, never from the bundle. */
const CBB_LINE = '  cbb: { respect: 1, rebuild: 1 },';
const CFB_LINE = '  cfb: { title: -1, contend: -1, playoffs: -1 },';
const BUILT = { cfb: { title: -1, contend: -1, playoffs: -1 }, cbb: { respect: 1, rebuild: 1 } };
const VARIANTS = {
  /* as built: football one step softer on every postseason ask, basketball one step more of its bottom rosters */
  built: { table: BUILT, edits: [] },
  /* the lead's prior: no football tilt */
  'cfb-none': { table: { ...BUILT, cfb: {} }, edits: [['seat', CFB_LINE, '  cfb: {},']] },
  /* the pro ladder unchanged in both sports */
  none: { table: { cfb: {}, cbb: {} }, edits: [['seat', CFB_LINE, '  cfb: {},'], ['seat', CBB_LINE, '  cbb: {},']] },
};
if (CONTROL && !EDITS[CONTROL]) {
  console.error(`SIM_COLLEGE_SEAT_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EDITS).join(', ')})`);
  process.exit(2);
}
if (!VARIANTS[TILT]) { console.error(`SIM_COLLEGE_SEAT_TILT=${TILT} is not a variant (${Object.keys(VARIANTS).join(', ')})`); process.exit(2); }
const sources = new Map();
const srcOf = which => { if (!sources.has(which)) sources.set(which, lf(fs.readFileSync(FILES[which], 'utf8'))); return sources.get(which); };
const overrides = new Map();
function apply(name, which, from, to) {
  const src = overrides.get(path.resolve(FILES[which]).toLowerCase()) ?? srcOf(which);
  if (!src.includes(from)) { console.error(`control cannot run: ${name}: ${path.basename(FILES[which])} does not hold ${from.slice(0, 70)}`); process.exit(2); }
  if (src.split(from).length !== 2) { console.error(`control cannot run: ${name}: the line is in ${path.basename(FILES[which])} more than once`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), src.replace(from, to));
}
if (process.env.SIM_COLLEGE_SEAT_ANCHORS) {
  let bad = 0, n = 0;
  for (const [name, [, ...rest]] of Object.entries(EDITS)) {
    for (let i = 0; i < rest.length; i += 3) {
      n += 1;
      const src = srcOf(rest[i]);
      if (src.split(rest[i + 1]).length !== 2) { bad += 1; console.error(`  ANCHOR ${name}: not in ${rest[i]} exactly once`); }
    }
  }
  for (const [name, v] of Object.entries(VARIANTS)) {
    for (const [which, from] of v.edits) {
      n += 1;
      if (srcOf(which).split(from).length !== 2) { bad += 1; console.error(`  ANCHOR variant ${name}: not in ${which} exactly once`); }
    }
  }
  console.log(`simCollegeSeat anchors: ${n} rewrites of ${Object.keys(EDITS).length} controls and ${Object.keys(VARIANTS).length} variants checked, ${bad} cannot run`);
  process.exit(bad ? 1 : 0);
}
for (const [which, from, to] of VARIANTS[TILT].edits) apply(`tilt ${TILT}`, which, from, to);
if (CONTROL) {
  const [section, ...rest] = EDITS[CONTROL];
  for (let i = 0; i < rest.length; i += 3) apply(CONTROL, rest[i], rest[i + 1], rest[i + 2]);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; section ${section} must go red`);
}
if (TILT !== 'built') console.log(`VARIANT: SIM_COLLEGE_SEAT_TILT=${TILT}`);

/* ---- one bundle, in a folder of this run's own ---- */
const NM = modulesDir();
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simCollegeSeat-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const lib = f => `'${ROOT_URL}/src/lib/${f}.ts'`;
fs.writeFileSync(`${WORK}/entry.mjs`, `
export * as CS from ${lib('collegeSeat')};
export * as CB from ${lib('collegeSeatBind')};
export { cfbSeatBinding } from ${lib('cfbSeatBind')};
export { cbbSeatBinding } from ${lib('cbbSeatBind')};
export * as CFB from ${lib('cfbDynasty')};
export * as CBB from ${lib('cbbDynasty')};
export * as SEAT from ${lib('gmSeat')};
export * as H from ${lib('gmDeskHost')};
export * as FM from ${lib('foOwnerMandate')};
export * as K from ${lib('keyedRng')};
export { GM_SEAT_PACKS } from '${ROOT_URL}/src/data/gmSeat/packs.ts';
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [`${WORK}/entry.mjs`], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, outfile: `${WORK}/bundle.cjs`, logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        return hit === undefined ? undefined : { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
{
  const text = fs.readFileSync(`${WORK}/bundle.cjs`, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}`); process.exit(2); }
  }
}
const M = createRequire(import.meta.url)(`${WORK}/bundle.cjs`);
const { CS, CB, CFB, CBB, SEAT, H, FM, K, GM_SEAT_PACKS, cfbSeatBinding, cbbSeatBinding } = M;
/* S8's seat off twin runs on a second instance of the same bundle: the engines mint player ids from a
   counter of their own module and an epoch drawn at load, so two dynasties on one instance can never
   share ids. On two instances driven in lockstep the counters match, and the epoch is set aside. */
fs.copyFileSync(`${WORK}/bundle.cjs`, `${WORK}/twin.cjs`);
const M2 = createRequire(import.meta.url)(`${WORK}/twin.cjs`);

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

/* ---- each sport's steps, the descriptor's own (CfbDynastyBoard.tsx and CbbDynastyBoard.tsx) ---- */
const sportsOf = ({ CFB, CBB, cfbSeatBinding, cbbSeatBinding }) => ({
  cfb: {
    B: cfbSeatBinding, E: CFB, schools: CFB.CFB_SCHOOLS, rounds: CFB.CFB_ROUNDS, rankings: st => CFB.cfbRankings(st),
    init: (id, rng) => CFB.initCfb(id, rng, { depth: true }),
    playRound: st => (rng => CFB.simCfbRound(st, rng)),
    closeSeason: (state, rng) => {
      const post = CFB.runCfbPostseason(state, rng);
      const heisman = CFB.heismanRace(state, rng);
      if (heisman[0]) state.heismanWinners = [...(state.heismanWinners ?? []), heisman[0].name];
      state.natties.push({ season: state.season, team: post.champion });
      return { ccgs: post.ccgs, bracket: post.bracket, champion: post.champion, heisman, field: post.field };
    },
    openOffseason: (st, rng) => CFB.cfbOpenOffseason(st, rng),
    offseason: (st, rng) => CFB.cfbOffseason(st, rng),
    enableDepth: (st, rng) => CFB.cfbEnableDepth(st, rng),
    recruitClass: rng => CFB.cfbRecruitClass(rng),
    portalPool: rng => CFB.cfbPortalPool(rng),
    sign: (st, r, cls, rng) => CFB.signRecruit(st, r, cls, rng),
    hire: (st, id) => CFB.cfbHireCoordinator(st, id),
    oracle: (st, recap) => {
      const me = st.myTeam;
      const fin = recap.bracket.find(g => g.name === 'National Championship');
      return {
        wins: st.teams[me].wins,
        madePlayoffs: recap.field.includes(me),
        roundsWon: recap.bracket.filter(g => g.winner === me).length,
        reachedFinal: !!fin && (fin.home === me || fin.away === me),
        wonTitle: recap.champion === me,
      };
    },
    witness: () => null,
  },
  cbb: {
    B: cbbSeatBinding, E: CBB, schools: CBB.CBB_SCHOOLS, rounds: CBB.CBB_ROUNDS, rankings: st => CBB.cbbRankings(st),
    init: (id, rng) => CBB.initCbb(id, rng, { depth: true }),
    playRound: st => (rng => CBB.simCbbRound(st, rng)),
    closeSeason: (state, rng) => {
      const result = CBB.runMarch(state, rng);
      const race = CBB.poyRace(state, rng);
      state.poyWinners = [...(state.poyWinners ?? []), race[0].name];
      state.titles.push({ season: state.season, team: result.champion });
      return { result, poy: race };
    },
    openOffseason: (st, rng) => CBB.cbbOpenOffseason(st, rng),
    offseason: (st, rng) => CBB.cbbOffseason(st, rng),
    enableDepth: (st, rng) => CBB.cbbEnableDepth(st, rng),
    recruitClass: rng => CBB.cbbRecruitClass(rng),
    portalPool: rng => CBB.cbbPortalPool(rng),
    sign: (st, r, cls, rng) => CBB.cbbSignRecruit(st, r, cls, rng),
    hire: (st, id) => CBB.cbbHireCoordinator(st, id),
    oracle: (st, recap) => {
      const me = st.myTeam;
      const r = recap.result;
      const fin = r.bracket.find(g => g.name === 'National Championship');
      return {
        wins: st.teams[me].wins,
        madePlayoffs: r.field.includes(me),
        roundsWon: r.bracket.filter(g => g.winner === me).length,
        reachedFinal: !!fin && (fin.home === me || fin.away === me),
        wonTitle: r.champion === me,
      };
    },
    /* the engine's own exit line, a second witness for the field and the title */
    witness: (st, recap) => ({ madePlayoffs: recap.result.myExit !== 'Missed the field', wonTitle: recap.result.myExit === 'Champions' }),
  },
});
const SPORT = sportsOf(M);
const TWIN = sportsOf(M2);
/** The id epoch of one bundle instance, read off a minted id ('c' or 'b', the epoch, a dash, the count). */
const epochOf = st => { const id = Object.values(st.teams)[0].players[0].id; return id.slice(1, id.lastIndexOf('-')); };
/** Every minted id renumbered by its first appearance: two states built by the same steps read the same,
    whatever each instance's counters had reached before this dynasty. */
function canon(json, epoch) {
  const parts = json.split(epoch);
  const seen = new Map();
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    let j = 1;
    while (j < p.length && p.charCodeAt(j) >= 48 && p.charCodeAt(j) <= 57) j++;
    const key = parts[i - 1].slice(-1) + p.slice(0, j);
    if (!seen.has(key)) seen.set(key, seen.size);
    out += `E-${seen.get(key)}${p.slice(j)}`;
  }
  return out;
}
/* The descriptors' year out steps, as the board hands them in (playRound takes a words context). */
const yearOutSteps = sp => ({
  rounds: sp.rounds, openOffseason: sp.openOffseason, offseason: sp.offseason, enableDepth: sp.enableDepth,
  playRound: (st, rng) => sp.playRound(st)(rng), closeSeason: sp.closeSeason,
});

/* ---- the harness's own oracles ---- */
/** Quarters by editorial prestige, ties by id: the market's tiers, computed here. */
function prestigeTiers(schools) {
  const sorted = [...schools].sort((a, b) => b.prestige - a.prestige || a.id.localeCompare(b.id));
  return new Map(sorted.map((s, i) => [s.id, 1 + Math.floor((i * 4) / sorted.length)]));
}
const VARIANT_TABLE = VARIANTS[TILT].table;
function oracleAsk(sp, sportId, st, teamId, season) {
  const pack = GM_SEAT_PACKS[sportId];
  const strengths = Object.values(st.teams).map(t => [t.id, sp.E[sportId === 'cfb' ? 'cfbStrength' : 'cbbStrength'](t)]);
  const mine = strengths.find(([id]) => id === teamId)[1];
  const rank = 1 + strengths.filter(([id, s]) => id !== teamId && s > mine).length;
  const champs = sportId === 'cfb' ? st.natties : st.titles;
  const defending = champs.some(c => c.season === season - 1 && c.team === teamId);
  const base = SEAT.seatMandate(pack, rank, strengths.length, defending, season, 0);
  const step = VARIANT_TABLE[sportId][base.tier];
  return { ask: step ? SEAT.seatMandate(pack, rank, strengths.length, defending, season, step) : base, rank };
}
function prestigeRank(schools, id) {
  const mine = schools.find(s => s.id === id).prestige;
  return 1 + schools.filter(s => s.id !== id && s.prestige > mine).length;
}

/* ---- S7: every seat function under a Math.random that throws ---- */
const realRandom = Math.random;
let seatCalls = 0;
function seatCall(fn) {
  seatCalls += 1;
  Math.random = () => { throw new Error('a seat function drew from Math.random'); };
  try { return fn(); } finally { Math.random = realRandom; }
}
let s7Draws = 0;
const seatCallSafe = fn => {
  try { return seatCall(fn); } catch (e) {
    if (!String(e).includes('Math.random')) throw e;
    s7Draws += 1;
    return fn();
  }
};

/* ---- tallies ---- */
const T = {};
const tallyOf = sportId => (T[sportId] ??= {
  dynasties: 0, seasonStarts: 0, askChecked: 0, takenAskKept: 0, rankDiffers: 0, placeChecked: 0, graded: 0,
  grades: {}, firedBy: { askTier: {}, startTier: {} }, firstFeedClosed: {}, firings: 0,
  buckets: new Map(), feeds: 0, offers: 0, removed: 0, bids: 0, bidsDropped: 0, bigYears: { title: 0, overachieved: 0 },
  bidsAfter: { title: 0, overachieved: 0 }, moves: { bid: 0, market: 0 }, ended: 0,
  s8Rounds: 0, s8Closes: 0, yearOuts: 0, refusals: { 'in-seat': 0, 'season-open': 0, 'market-closed': 0 }, emptyChairs: 0,
  careers: [], twice: { markets: 0, drawnFirst: 0, removed: 0, bidsDrawn: 0, bidsDropped: 0 },
});
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const without = st => { const c = { ...st }; delete c.seat; return JSON.stringify(c); };
const TIER_WORD = ['', 'tier 1', 'tier 2', 'tier 3', 'tier 4'];

function greedy(sp, st, rng) {
  sp.openOffseason(st, rng);
  const cls = sp.recruitClass(rng);
  const por = sp.portalPool(rng);
  for (const r of [...por.slice(0, 3), ...cls]) sp.sign(st, r, por.includes(r) ? 'SO' : 'FR', rng);
  if (st.depth && st.staffWindow) {
    for (const role of ['OC', 'DC']) {
      const best = st.staffWindow.market.filter(c => c.role === role).sort((a, b) => b.rating - a.rating)[0];
      const cur = st.teams[st.myTeam].staff?.[role];
      if (!best || (cur && cur.rating >= best.rating)) continue;
      sp.hire(st, best.id);
    }
  }
  sp.offseason(st, rng);
  if (!st.depth) sp.enableDepth(st, rng);
}

function sameMandate(a, b) {
  return !!a && !!b && a.tier === b.tier && a.text === b.text && a.winFloor === b.winFloor && a.reqLevel === b.reqLevel && a.season === b.season;
}
function wordsOk(text) {
  return !text.includes('{') && !DASHES.some(d => text.includes(d)) && !/ownership|franchise/i.test(text);
}

/* ---- one dynasty, in the board's order ---- */
function runDynasty(sportId, seed, index, team, startTier) {
  const sp = SPORT[sportId];
  const t = tallyOf(sportId);
  t.dynasties += 1;
  const rngSeed = seed * 1000003 + (sportId === 'cfb' ? 0 : 7919) + index * 104729 + 17;
  const rng = lehmer(rngSeed);
  let twinRng = lehmer(rngSeed);
  let st = sp.init(team, rng);
  const tw = TWIN[sportId];
  let twin = tw.init(team, twinRng);
  const e1 = epochOf(st), e2 = epochOf(twin);
  seatCallSafe(() => CB.startCollegeSeat(st, sp.B));
  const first = st.seat.mandate.tier;
  const startSeason = st.season;
  let takenAsk = null;
  let firedOnce = false;
  const twinCheck = where => {
    if (!twin) return;
    check = 'S8';
    ok(canon(without(st), e1) === canon(JSON.stringify(twin), e2), () => `${sportId} seed ${seed} dynasty ${index} (${team}): the state with the seat differs from the seat off twin ${where}`);
    if (where.startsWith('after round')) t.s8Rounds += 1; else t.s8Closes += 1;
  };

  while (st.season - startSeason < SEASONS) {
    /* ---- the season ---- */
    for (;;) {
      if (st.round === 1 && st.seat && CS.holdsSeat(st.seat)) {
        seatCallSafe(() => CB.collegeSeatFirstPress(st, sp.B));
        check = 'S1';
        t.seasonStarts += 1;
        const cur = SEAT.currentStint(st.seat.career);
        const stored = st.seat.mandate;
        ok(stored && wordsOk(stored.text), () => `${sportId} ${team} season ${st.season}: the ask is missing or its words are off: ${stored?.text}`);
        if (cur.from === st.season && st.seat.career.stints.length > 1 && takenAsk) {
          ok(sameMandate(stored, takenAsk), () => `${sportId} season ${st.season}: the first season of a job taken did not keep the offer's ask`);
          t.takenAskKept += 1;
        } else {
          const o = oracleAsk(sp, sportId, st, st.myTeam, st.season);
          ok(sameMandate(stored, o.ask), () => `${sportId} ${st.myTeam} season ${st.season}: stored ask ${stored?.tier}/${stored?.text} against the oracle's ${o.ask.tier}/${o.ask.text} (roster rank ${o.rank})`);
          t.askChecked += 1;
          if (o.rank !== prestigeRank(sp.schools, st.myTeam)) t.rankDiffers += 1;
        }
      }
      if (st.seat && CS.holdsSeat(st.seat) && (st.round === 1 || st.round === Math.ceil(sp.rounds / 2))) {
        /* his place, which the tile's live line reads against the field: the engine's own ranking, 1 = top */
        check = 'S1';
        const place = sp.B.view(st).place;
        const ranked = sp.rankings(st);
        ok(place >= 1 && ranked[place - 1]?.id === st.myTeam, () => `${sportId} season ${st.season} round ${st.round}: his place reads ${place}, the engine ranks ${st.myTeam} at ${ranked.findIndex(x => x.id === st.myTeam) + 1}`);
        t.placeChecked += 1;
      }
      sp.playRound(st)(rng);
      if (twin) tw.playRound(twin)(twinRng);
      if (st.round >= sp.rounds) break;
      st.round += 1;
      if (twin) twin.round += 1;
      twinCheck(`after round ${st.round - 1} of season ${st.season}`);
    }
    const recap = sp.closeSeason(st, rng);
    const champ = sportId === 'cfb' ? recap.champion : recap.result.champion;
    if (champ === st.myTeam) st.myTitles += 1;
    st.seasonsPlayed += 1;
    if (twin) {
      const tr = tw.closeSeason(twin, twinRng);
      if ((sportId === 'cfb' ? tr.champion : tr.result.champion) === twin.myTeam) twin.myTitles += 1;
      twin.seasonsPlayed += 1;
    }

    /* ---- the seat's close ---- */
    let fired = false;
    if (st.seat && CS.holdsSeat(st.seat)) {
      const before = JSON.parse(JSON.stringify(st.seat));
      const res = seatCallSafe(() => CB.applyCollegeClose(st, sp.B, recap));
      check = 'S2';
      if (!ok(res, () => `${sportId} ${team} season ${st.season}: a season he coached was not graded`)) break;
      const oracle = sp.oracle(st, recap);
      const host = seatCallSafe(() => CS.bracketOutcome(sp.B.bracketOf(recap), st.myTeam, oracle.wins));
      for (const k of ['madePlayoffs', 'roundsWon', 'reachedFinal', 'wonTitle']) {
        ok(host[k] === oracle[k], () => `${sportId} ${st.myTeam} season ${st.season}: the seat read ${k} ${host[k]}, the engine's return says ${oracle[k]}`);
      }
      const w = sp.witness(st, recap);
      if (w) for (const k of ['madePlayoffs', 'wonTitle']) ok(host[k] === w[k], () => `${sportId} season ${st.season}: ${k} ${host[k]} against the engine's own exit line ${recap.result.myExit}`);
      const g = FM.gradeSeason(res.mandate, oracle);
      ok(res.grade.result === g.result, () => `${sportId} season ${st.season}: graded ${res.grade.result}, gradeSeason says ${g.result}`);
      if (before.mandate && before.mandate.season === st.season) ok(sameMandate(res.mandate, before.mandate), 'the close graded an ask other than the one stored for the season');
      ok(CS.collegeClose(res.block, sp.B.view(st), oracle) === null, 'a second close of the same season graded it again');
      t.graded += 1;
      t.grades[res.mandate.tier] ??= {};
      inc(t.grades[res.mandate.tier], res.grade.result);

      check = 'S3';
      const want = Math.max(0, Math.min(100, before.trust + g.trustDelta));
      ok(res.block.trust === want, () => `${sportId} season ${st.season}: trust ${before.trust} to ${res.block.trust}, gradeSeason's ${g.trustDelta} makes ${want}`);
      const m = res.mandate;
      const level = oracle.reachedFinal ? 3 : oracle.roundsWon >= 1 ? 2 : oracle.madePlayoffs ? 1 : 0;
      const key = oracle.wonTitle ? 'title'
        : m.reqLevel >= 1 ? `post:${m.reqLevel - level}`
        : oracle.madePlayoffs ? 'floor:in'
        : `floor:${m.winFloor}:${Math.min(4, Math.max(0, m.winFloor - oracle.wins))}`;
      const b = t.buckets.get(key) ?? { n: 0, delta: new Set() };
      b.n += 1; b.delta.add(res.grade.trustDelta); t.buckets.set(key, b);
      ok(res.grade.trustDelta === g.trustDelta, () => `${sportId} bucket ${key}: the seat moved ${res.grade.trustDelta}, gradeSeason ${g.trustDelta}`);

      check = 'S4';
      ok(res.fired === (res.block.trust === 0), () => `${sportId} season ${st.season}: fired ${res.fired} at trust ${res.block.trust}`);
      fired = res.fired;
      if (twin) twinCheck(`after the close of season ${st.season}`);

      /* ---- the bid ---- */
      if (!fired) {
        const view = sp.B.view(st);
        const bid = seatCallSafe(() => CS.collegeBid(st.seat, view));
        bidChecks(sportId, sp, st, view, bid, res, oracle);
        if (bid && index % 2 === 0) {
          const move = seatCallSafe(() => CS.collegeTakeJob(st.seat, view, bid.teamId, 'bid'));
          check = 'S6';
          if (ok(move, 'a bid on the table could not be taken')) {
            ok(seatCallSafe(() => CS.collegeTakeJob(move.block, view, bid.teamId, 'bid')) === null, 'a second press took the bid twice');
            ok(move.block.career.stints.at(-2).ended === 'poached', 'a buyout did not close the old stint as poached');
            seatCallSafe(() => CB.applyCollegeMove(st, move));
            takenAsk = move.block.mandate;
            t.moves.bid += 1;
            twin = null; twinRng = null;
          }
        }
      }
    } else if (twin) twinCheck(`after the close of season ${st.season}`);

    if (fired) {
      firedOnce = true;
      t.firings += 1;
      twin = null; twinRng = null;
      const r = marketLoop(sportId, sp, st, rng, startTier, startSeason);
      st = r.st;
      if (r.taken) takenAsk = r.taken;
      if (r.stop) break;
    }
    if (st.season - startSeason >= SEASONS - 1) break;
    greedy(sp, st, rng);
    if (twin) greedy(tw, twin, twinRng);
    twinCheck(`after the offseason into season ${st.season}`);
  }
  if (firedOnce) { inc(t.firedBy.askTier, first); inc(t.firedBy.startTier, TIER_WORD[startTier]); }
  inc(t.firedBy, `n:${first}`); inc(t.firedBy, `n:${TIER_WORD[startTier]}`);
  if (st.seat) t.careers.push(st.seat.career);
}

function bidChecks(sportId, sp, st, view, bid, res, oracle) {
  const t = tallyOf(sportId);
  const career = st.seat.career;
  const grade = res.grade.result;
  if (grade === 'title' || grade === 'overachieved') t.bigYears[grade] += 1;
  check = 'S5';
  const raw = SEAT.poachBid(GM_SEAT_PACKS[sportId], CS.collegeSeatTeams(view), career, view.season + 1,
    K.keyedRng(CS.collegeBidKey(view, career)), CS.championOf(view, view.season));
  const firers = CS.formerFirers(career);
  if (raw && firers.has(raw.teamId)) { t.bidsDropped += 1; ok(bid === null, 'a bid came from a program that let him go'); }
  if (bid) ok(!firers.has(bid.teamId), 'a bid came from a program that let him go');
  check = 'S7';
  ok(JSON.stringify(seatCallSafe(() => CS.collegeBid(st.seat, view))) === JSON.stringify(bid), 'the bid read twice differs');
  ok(JSON.stringify(CS.collegeBid(JSON.parse(JSON.stringify(st.seat)), view)) === JSON.stringify(bid), 'the bid after a JSON round trip differs');
  check = 'SY';
  const yo = CB.collegeYearOut(st, sp.B, yearOutSteps(sp), () => { throw new Error('a refused year out drew'); });
  if (ok(!yo.ok && yo.reason === 'in-seat', () => `a year out was not refused in a seat (${yo.ok ? 'played' : yo.reason})`)) t.refusals['in-seat'] += 1;
  if (!bid) return;
  check = 'S6';
  t.bids += 1;
  t.bidsAfter[grade] = (t.bidsAfter[grade] ?? 0) + 1;
  const og = FM.gradeSeason(res.mandate, oracle).result;
  ok((grade === 'title' || grade === 'overachieved') && (og === 'title' || og === 'overachieved'), () => `${sportId}: a bid after a season graded ${grade} (oracle ${og})`);
  ok(SEAT.currentStint(career).grades.at(-1) === grade, 'the bid read a grade other than the one on the record');
  const tiers = prestigeTiers(sp.schools);
  const mine = tiers.get(st.myTeam);
  ok(mine !== 1, () => `${sportId}: a tier 1 coach drew a bid`);
  ok(tiers.get(bid.teamId) === mine - 1, () => `${sportId}: a tier ${mine} coach drew a bid from tier ${tiers.get(bid.teamId)} (${bid.teamId})`);
  ok(bid.teamId !== st.myTeam && bid.buyout === true, 'a bid named his own program or carried no buyout');
}

function marketLoop(sportId, sp, st, rng, startTier, startSeason) {
  const t = tallyOf(sportId);
  let firstFeed = true;
  for (;;) {
    const view = sp.B.view(st);
    const m = seatCallSafe(() => CS.collegeMarket(st.seat, view));
    check = 'S4';
    if (!ok(m && ['offers', 'quiet', 'closed'].includes(m.state), () => `${sportId}: after a firing there is no market (${m && m.state})`)) return { st, stop: true };
    const tiers = prestigeTiers(sp.schools);
    const ny = CS.collegeNextYear(st.seat.career, tiers);
    if (m.state === 'closed') ok(ny.nextYear === 'shut', 'a closed market while next year is not shut');
    check = 'S9';
    const sn = SEAT.seatNextYear(st.seat.career, tiers);
    ok(ny.nextYear === (sn.nextYear === 'climb' ? 'shut' : sn.nextYear), () => `collegeNextYear ${ny.nextYear} against seatNextYear ${sn.nextYear}`);
    ok(m.nextYear === ny.nextYear, () => `the market reads ${m.nextYear}, collegeNextYear ${ny.nextYear}`);
    check = 'S5';
    const firers = CS.formerFirers(st.seat.career);
    for (const o of m.offers) ok(!firers.has(o.teamId), () => `${sportId}: ${o.teamId} let him go and called again`);
    t.feeds += 1; t.offers += m.offers.length; t.removed += m.removed;
    check = 'S7';
    ok(JSON.stringify(seatCallSafe(() => CS.collegeMarket(st.seat, view))) === JSON.stringify(m), 'the market read twice differs');
    ok(JSON.stringify(CS.collegeMarket(JSON.parse(JSON.stringify(st.seat)), view)) === JSON.stringify(m), 'the market after a JSON round trip differs');
    if (firstFeed) {
      inc(t.firstFeedClosed, `n:${TIER_WORD[startTier]}`);
      if (m.state === 'closed') inc(t.firstFeedClosed, TIER_WORD[startTier]);
      firstFeed = false;
      check = 'SY';
      const open = JSON.parse(JSON.stringify(st));
      if (sportId === 'cfb') open.natties = open.natties.filter(n => n.season !== open.season);
      else open.titles = open.titles.filter(n => n.season !== open.season);
      const yo = CB.collegeYearOut(open, sp.B, yearOutSteps(sp), () => { throw new Error('a refused year out drew'); });
      if (ok(!yo.ok && yo.reason === 'season-open', () => `a year out on an open season was not refused (${yo.ok ? 'played' : yo.reason})`)) t.refusals['season-open'] += 1;
    }
    if (m.nextYear === 'shut') {
      check = 'SY';
      const yo = CB.collegeYearOut(st, sp.B, yearOutSteps(sp), () => { throw new Error('a refused year out drew'); });
      if (ok(!yo.ok && yo.reason === 'market-closed', () => `a year out with next year shut was not refused (${yo.ok ? 'played' : yo.reason})`)) t.refusals['market-closed'] += 1;
    }
    if (m.offers.length) {
      const pick = [...m.offers].sort((a, b) => a.tier - b.tier || b.keenness - a.keenness)[0];
      const move = seatCallSafe(() => CS.collegeTakeJob(st.seat, view, pick.teamId, 'market'));
      check = 'S4';
      if (!ok(move, 'an offer on the table could not be taken')) return { st, stop: true };
      ok(seatCallSafe(() => CS.collegeTakeJob(move.block, view, pick.teamId, 'market')) === null, 'a second press took the job twice');
      seatCallSafe(() => CB.applyCollegeMove(st, move));
      ok(st.myTeam === pick.teamId && st.seat.trust === FM.FO_TRUST_START && (st.lastRivalry === undefined || st.lastRivalry === null), 'the move did not set the new program, fresh trust and no rivalry carried');
      t.moves.market += 1;
      return { st, taken: move.block.mandate };
    }
    if (m.state === 'closed') { t.ended += 1; return { st, stop: true }; }
    if (st.season - startSeason >= SEASONS - 1) return { st, stop: true };
    /* a quiet market: sit the year out */
    check = 'SY';
    const before = JSON.stringify(st);
    const yo = CB.collegeYearOut(st, sp.B, yearOutSteps(sp), rng);
    if (!ok(yo.ok, () => `a year out on a quiet market was refused (${yo.reason})`)) return { st, stop: true };
    ok(JSON.stringify(st) === before, 'the year out wrote into the state it left');
    ok(yo.st.season === st.season + 1 && CS.seasonClosed(sp.B.view(yo.st)), 'after a year out the season is not one higher with its champion on record');
    ok(yo.st.myTitles === st.myTitles && yo.st.seasonsPlayed === st.seasonsPlayed, 'a year out moved his titles or seasons played');
    ok(yo.st.seat.career.seasonsOut === st.seat.career.seasonsOut + 1, 'a year out did not add a year out to his record');
    const staff = yo.st.teams[yo.st.myTeam].staff ?? {};
    t.emptyChairs += ['OC', 'DC'].filter(r => !staff[r]).length;
    t.yearOuts += 1;
    st = yo.st;
  }
}

/* ---- S5's twice fired coaches, on the real programs and a real season's rosters ----
   The fleets almost never meet this game's wider rule: a coach let go twice whose market draws the FIRST
   program that let him go, or a coach let go who then wins one tier below that program and draws its bid
   (r1320-run-a: 0 removals and 0 dropped bids over three seeds). So every pair of programs is tried here, on
   keyed draws: the same cases on every run and every seed, never a coin toss. gmSeat drops only the last
   program from a market and no former one from a bid, so every case met here is the college rule's alone. */
function twiceFired(sportId) {
  const sp = SPORT[sportId];
  const t = tallyOf(sportId).twice;
  const pack = GM_SEAT_PACKS[sportId];
  const st = sp.init(sp.schools[0].id, lehmer(1320));
  const season = st.season;
  const real = sp.B.view(st);
  const tiers = CS.collegeTiers(real);
  const at = myTeam => ({ ...real, myTeam, champions: [...real.champions, { season, team: sp.schools[0].id }] });
  check = 'S5';
  for (const A of sp.schools) {
    for (const B of sp.schools) {
      if (A.id === B.id) continue;
      const view = at(B.id);
      const career = { version: 1, seasonsOut: 0, stints: [
        { team: A.id, tier: tiers.get(A.id), from: season - 5, grades: ['title', 'overachieved', 'met', 'missed', 'badly'], ended: 'fired' },
        { team: B.id, tier: tiers.get(B.id), from: season, grades: ['missed'], ended: 'fired' },
      ] };
      const m = seatCallSafe(() => CS.collegeMarket({ v: 1, career, trust: 0, mandate: null }, view));
      t.markets += 1;
      if (!ok(m, () => `${sportId}: no market for a coach let go at ${A.id} and then ${B.id}`)) continue;
      for (const o of m.offers) ok(o.teamId !== A.id && o.teamId !== B.id, () => `${sportId}: let go at ${A.id} and then ${B.id}, and ${o.teamId} called again`);
      const drawn = SEAT.seatOffers(pack, CS.collegeSeatTeams(view), career, season + 1, K.keyedRng(CS.collegeFeedKey(view, career)), CS.championOf(view, season));
      if (drawn.some(o => o.teamId === A.id)) {
        t.drawnFirst += 1;
        t.removed += m.removed;
        ok(m.removed === 1, () => `${sportId}: gmSeat drew ${A.id}, which let him go first, and the market removed ${m.removed}`);
      }
    }
  }
  for (const B of sp.schools) {
    if (tiers.get(B.id) === 1) continue;
    for (let k = 1; k <= 6; k += 1) {
      const view = at(B.id);
      const own = { team: B.id, tier: tiers.get(B.id), from: season - k + 1, grades: [...Array(k - 1).fill('met'), 'title'] };
      const alone = { version: 1, seasonsOut: 0, stints: [own] };
      const raw = SEAT.poachBid(pack, CS.collegeSeatTeams(view), alone, season + 1, K.keyedRng(CS.collegeBidKey(view, alone)), CS.championOf(view, season));
      if (!raw) continue;
      const career = { version: 1, seasonsOut: 0, stints: [
        { team: raw.teamId, tier: tiers.get(raw.teamId), from: season - k - 2, grades: ['missed', 'badly', 'badly'], ended: 'fired' }, own,
      ] };
      const again = SEAT.poachBid(pack, CS.collegeSeatTeams(view), career, season + 1, K.keyedRng(CS.collegeBidKey(view, career)), CS.championOf(view, season));
      if (!ok(again && again.teamId === raw.teamId, () => `${sportId}: the bid's draw at ${B.id} moved with his past`)) continue;
      t.bidsDrawn += 1;
      const bid = seatCallSafe(() => CS.collegeBid({ v: 1, career, trust: 70, mandate: null }, view));
      if (ok(bid === null, () => `${sportId}: ${raw.teamId} let him go and then bid for him at ${B.id}`)) t.bidsDropped += 1;
    }
  }
}

/* ---- S9's ladder, the same synthetic careers the base probe walked (round 1320 step a) ---- */
function seatLadder() {
  const out = [];
  const ENDS = ['fired', 'walked', 'poached', 'expired'];
  for (let titles = 0; titles <= 6; titles++)
    for (let over = 0; over <= 3; over++)
      for (const filler of [0, 3, 8])
        for (const lastGrade of ['met', 'missed', 'badly'])
          for (const ended of ENDS)
            for (let out0 = 0; out0 <= 4; out0++)
              for (let tier = 1; tier <= 4; tier++)
                for (const inLeague of [true, false]) {
                  const grades = [
                    ...Array(titles).fill('title'), ...Array(over).fill('overachieved'),
                    ...Array(filler).fill('met'), lastGrade,
                  ];
                  const career = {
                    version: 1, seasonsOut: out0,
                    stints: [{ team: 'old', tier: inLeague ? 4 : tier, from: 1, grades, ended }],
                  };
                  const tiers = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4]]);
                  if (inLeague) tiers.set('old', tier);
                  out.push({ career, tiers });
                }
  return out;
}

/* ================= the run ================= */
const started = Date.now();
for (const seed of SEEDS) {
  for (const sportId of SPORTS) {
    const sp = SPORT[sportId];
    const tiers = prestigeTiers(sp.schools);
    const byTier = [1, 2, 3, 4].map(q => sp.schools.filter(s => tiers.get(s.id) === q).map(s => s.id));
    for (let i = 0; i < FLEET; i++) {
      const q = 1 + (i % 4);
      const list = byTier[q - 1];
      runDynasty(sportId, seed, i, list[Math.floor(i / 4) % list.length], q);
    }
  }
}
for (const sportId of SPORTS) twiceFired(sportId);
console.log(`simCollegeSeat: ${SPORTS.join(', ')} over seeds ${SEEDS.join(',')}, ${FLEET} dynasties a sport a seed, ${SEASONS} seasons, ${((Date.now() - started) / 1000).toFixed(0)} s`);
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : 'n/a');

begin('S1', "the ask is the roster's, in the pack's words");
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.seasonStarts} season starts, ${t.askChecked} against the oracle, ${t.takenAskKept} first seasons kept the offer's ask, ${t.rankDiffers} with a roster rank other than the prestige rank; his place checked against the engine's ranking ${t.placeChecked} times`);
  ok(t.askChecked > 0 && t.rankDiffers > 0, `${s}: no season start where the roster rank differs from the prestige rank, so the ask's rank is untested`);
  ok(t.placeChecked > 0, `${s}: his place was never checked`);
}

begin('S2', "the outcome is the engine's, and the grade is gradeSeason's");
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.graded} graded seasons. Grade shares by ask tier:`);
  for (const tier of ['title', 'contend', 'playoffs', 'respect', 'rebuild']) {
    const g = t.grades[tier];
    if (!g) continue;
    const n = Object.values(g).reduce((a, b) => a + b, 0);
    console.log(`     ${tier.padEnd(8)} ${String(n).padStart(5)}  ${['title', 'overachieved', 'met', 'missed', 'badly'].map(k => `${k} ${pct(g[k] ?? 0, n)}`).join(', ')}`);
  }
  const fb = t.firedBy;
  console.log(`     fired within the run, by first ask tier: ${['title', 'contend', 'playoffs', 'respect', 'rebuild'].filter(k => fb[`n:${k}`]).map(k => `${k} ${pct(fb.askTier[k] ?? 0, fb[`n:${k}`])} of ${fb[`n:${k}`]}`).join(', ')}`);
  console.log(`     fired within the run, by starting tier: ${[1, 2, 3, 4].map(q => `${TIER_WORD[q]} ${pct(fb.startTier[TIER_WORD[q]] ?? 0, fb[`n:${TIER_WORD[q]}`])}`).join(', ')}`);
  console.log(`     first feeds already closed, by starting tier: ${[1, 2, 3, 4].map(q => `${TIER_WORD[q]} ${t.firstFeedClosed[TIER_WORD[q]] ?? 0} of ${t.firstFeedClosed[`n:${TIER_WORD[q]}`] ?? 0}`).join(', ')}`);
  ok(t.graded > 0, `${s}: nothing was graded`);
}

begin('S3', 'trust moves by gradeSeason, never rising with the shortfall');
for (const [s, t] of Object.entries(T)) {
  const rows = [...t.buckets.entries()].sort();
  console.log(`   ${s}: ${rows.map(([k, b]) => `${k} n${b.n} move ${[...b.delta].join('/')}`).join('; ')}`);
  for (const [k, b] of rows) ok(b.delta.size === 1, () => `${s} bucket ${k}: more than one trust move (${[...b.delta].join(', ')})`);
  const series = prefix => rows.filter(([k]) => k.startsWith(prefix)).map(([k, b]) => [Number(k.split(':').at(-1)), [...b.delta][0]]).sort((a, b) => a[0] - b[0]);
  const lines = [...new Set(rows.filter(([k]) => k.startsWith('post:')).map(() => 'post:'))];
  const floors = [...new Set(rows.filter(([k]) => k.startsWith('floor:') && k !== 'floor:in').map(([k]) => `floor:${k.split(':')[1]}:`))];
  for (const p of [...lines, ...floors]) {
    const sr = series(p);
    for (let i = 1; i < sr.length; i++) ok(sr[i][1] <= sr[i - 1][1], () => `${s} ${p}: the move rose from ${sr[i - 1][1]} to ${sr[i][1]} as the shortfall grew`);
  }
}

begin('S4', 'a firing at zero trust opens a market, never the end');
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.firings} firings, ${t.moves.market} jobs taken off the market, ${t.yearOuts} years out, ${t.ended} dynasties that met a closed market`);
  ok(t.firings > 0, `${s}: no coach was ever fired, so the firing is untested`);
}

begin('S5', 'a program that let him go never calls again');
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.feeds} feeds holding ${t.offers} offers; this game's wider rule removed ${t.removed} offers (${pct(t.removed, t.offers + t.removed)} of what seatOffers drew) and ${t.bidsDropped} bids (${pct(t.bidsDropped, t.bids + t.bidsDropped)} of the bids drawn)`);
  ok(t.feeds > 0, `${s}: no feed was read`);
  const w = t.twice;
  console.log(`   ${s}, twice fired over every pair of programs: ${w.markets} markets, ${w.drawnFirst} in which gmSeat drew the first program that let him go (${pct(w.drawnFirst, w.markets)}), ${w.removed} removed; ${w.bidsDrawn} bids drawn from a program that let him go, ${w.bidsDropped} dropped`);
  ok(w.drawnFirst > 0 && w.removed === w.drawnFirst, () => `${s}: the twice fired markets never met the wider rule (${w.drawnFirst} drawn, ${w.removed} removed), so it went untested`);
  ok(w.bidsDrawn > 0 && w.bidsDropped === w.bidsDrawn, () => `${s}: the bids from a program that let him go were not all dropped (${w.bidsDropped} of ${w.bidsDrawn})`);
}

begin('S6', 'a bid comes from one tier up after a big year');
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.bids} bids; after a title ${t.bidsAfter.title ?? 0} of ${t.bigYears.title} (${pct(t.bidsAfter.title ?? 0, t.bigYears.title)}), after beating the ask ${t.bidsAfter.overachieved ?? 0} of ${t.bigYears.overachieved} (${pct(t.bidsAfter.overachieved ?? 0, t.bigYears.overachieved)}); ${t.moves.bid} taken (even dynasties go, odd ones stay)`);
  ok(t.bids > 0, `${s}: no bid was ever drawn, so the bid is untested`);
}

begin('S7', 'keyed, never random');
console.log(`   ${seatCalls} seat calls under a Math.random that throws; ${s7Draws} drew from it`);
ok(s7Draws === 0, `${s7Draws} seat calls drew from Math.random`);

begin('S8', 'the seat watches: the same games with it and without it');
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.s8Rounds} rounds and ${t.s8Closes} closes and offseasons compared byte for byte before a move or a firing`);
  ok(t.s8Rounds > 0 && t.s8Closes > 0, `${s}: nothing was compared`);
}

begin('S9', 'one rule for next year');
{
  const ladder = seatLadder();
  const viaHost = ladder.map(({ career, tiers }) => H.hostNextYear({ career }, tiers));
  const viaSeat = ladder.map(({ career, tiers }) => SEAT.seatNextYear(career, tiers));
  const dHost = sha(JSON.stringify(viaHost));
  const dSeat = sha(JSON.stringify(viaSeat));
  console.log(`   ladder of ${ladder.length} careers: hostNextYear ${dHost}, seatNextYear ${dSeat}, the base printed ${BASE_LADDER_DIGEST}`);
  ok(dHost === BASE_LADDER_DIGEST && dSeat === BASE_LADDER_DIGEST, 'the next year rule moved from the base');
  let checked = 0;
  const careers = [...ladder.map(l => [l.career, l.tiers]), ...Object.entries(T).flatMap(([s, t]) => t.careers.map(c => [c, prestigeTiers(SPORT[s].schools)]))];
  for (const [c, tiers] of careers) {
    const sn = SEAT.seatNextYear(c, tiers);
    const cn = CS.collegeNextYear(c, tiers);
    ok(cn.nextYear === (sn.nextYear === 'climb' ? 'shut' : sn.nextYear) && (sn.nextYear === 'climb' ? cn.climbTo === null : cn.climbTo === sn.climbTo), 'collegeNextYear is not seatNextYear with climb read as shut');
    checked += 1;
  }
  console.log(`   collegeNextYear checked against seatNextYear over ${checked} careers (${checked - ladder.length} from the fleets)`);
}

begin('SY', 'the year out');
for (const [s, t] of Object.entries(T)) {
  console.log(`   ${s}: ${t.yearOuts} years out played; refused in a seat ${t.refusals['in-seat']}, on an open season ${t.refusals['season-open']}, with next year shut ${t.refusals['market-closed']}; chairs left empty at the program that let him go during a year out ${t.emptyChairs}`);
  ok(t.refusals['in-seat'] > 0 && t.refusals['season-open'] > 0, `${s}: a refusal was never tried`);
  if (FLEET >= 300) ok(t.yearOuts > 0, `${s}: no year out was played over a full fleet`);
}

const red = [...failedIn.keys()].filter(Boolean);
const redList = red.map(k => `${k} (${failedIn.get(k)})`).join(', ');
if (CONTROL) {
  const want = EDITS[CONTROL][0];
  const hits = failedIn.get(want) ?? 0;
  console.log(hits > 0 ? `simCollegeSeat CONTROL ${CONTROL} FIRED: ${want} went red with ${hits} failures (red: ${redList})`
    : `simCollegeSeat CONTROL ${CONTROL} DID NOT FIRE: ${want} stayed green (red: ${redList || 'none'})`);
  process.exit(1);
}
console.log(red.length ? `simCollegeSeat: RED in ${redList}` : `simCollegeSeat: all sections green (S1 to S9 and SY)`);
process.exit(red.length ? 1 : 0);
