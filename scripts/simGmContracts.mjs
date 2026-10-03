/*
 * Round 908 harness: the re-sign desk, on the four real front office engines.
 *
 * WHAT WAS WRONG, measured here on the shipped engines as the baseline arm:
 * a GM's own player whose deal had run out stayed or left on the same coin
 * flip the CPU clubs use, inside each engine's offseason, and the GM was never
 * asked. See MEASURED below for how many walked that way.
 *
 * WHAT THIS CHECKS. Each of the four engines (frontOffice.ts, nbaFrontOffice.ts,
 * mlbFrontOffice.ts, nhlFrontOffice.ts) is bundled as it ships and imported
 * READ ONLY. For each sport and each seed a GM runs ten seasons: the desk
 * opens every winter, a fixed policy makes every kind of decision the desk
 * has, the GM drafts, and the engine's own offseason runs behind the desk.
 * Games are not simulated: nothing a game does reaches a contract.
 *
 *  0. The baseline. The same leagues and seeds with no desk: how many of the
 *     GM's expiring men leave on the engine's flip. If this is zero the rest of
 *     the harness is measuring nothing, so it has a floor.
 *  1. Nobody leaves on a flip. Every winter of every run: a man whose deal ran
 *     out and who is no longer on the roster has a recorded decision that let
 *     him go (or the engine retired him, by its own report), and a man the GM
 *     kept is on the roster on exactly the agreed years and salary. Plus the
 *     desk fails closed: with one decision missing nothing runs.
 *  2. Asks sit inside a band of the cap, in EVERY season of every run, not the
 *     first and the last: each season's median (its five runs pooled) inside
 *     a measured band, plus the median and the 95th percentile of all asks.
 *     No single ask is asserted on: a max is noise.
 *  3. The meter never falls as the offer rises: every case, every contract
 *     length the desk allows, the salary walked from nothing to 130 percent of
 *     the ask in steps of 2 percent.
 *  4. Each league's own rule holds, recomputed here independently of the desk.
 *     Seasons with the club are counted by this harness (trackDesk), never
 *     read off the desk's ledger.
 *     NFL  the fifth year option is offered to first round picks this GM
 *          drafted and nobody else, only at the end of the rookie deal (some
 *          holders are re-signed for one season, so they come back), and buys
 *          exactly one guaranteed year. The GM tags a man every winter: a man
 *          tagged now never reaches the desk and comes out on his tag; a man
 *          re-signed after a tag year or an option year carries no guarantee
 *          or tag from the old deal.
 *     NBA  every rung of the maximum ladder (0 to 15 seasons) against the
 *          sources; no ask over his maximum; with no room for the ask the
 *          ceiling is the Bird tier's own, room counted with next season's
 *          dead money (the GM dumps salary through the engine's own cut); a
 *          man over his ceiling cannot be kept at his ask; a push far over
 *          the rules never signs above them; an Early Bird exception deal runs
 *          two seasons at the least.
 *     MLB  a drafted man is tendered, not negotiated with, until six seasons;
 *          the qualifying offer is the mean of the 125 highest salaries in the
 *          save, goes to nobody twice (a refuser is signed straight back to
 *          test it), never to a mid season arrival, and a rejection pays one
 *          pick.
 *     NHL  a drafted man under 27 is restricted; whether a sheet is tabled is
 *          the same on every read; the picks are the published ladder's; a man
 *          whose sheet is not matched joins the rival on the sheet's terms.
 *     NFL and MLB: a man let go sits in the pool at his market figure, not
 *          his old deal's (neither pool ever reprices).
 *  5. The books. Every rule has two sources or says it has one, and each
 *     host's next cap is the cap the engine really sets.
 *
 * Negative controls. Each rewrites one line of src/lib/gmContracts.ts (or the
 * file it names) in memory through an esbuild load hook and refuses to run if
 * the line is not there exactly once. A control that cannot run, or a crash,
 * exits 3, so neither can pass for a control that fired (exit 1):
 *   GM_CONTRACTS_CONTROL=coinflip   the desk stops holding a kept man, so he
 *                                   reaches the engine's flip: section 1.
 *   GM_CONTRACTS_CONTROL=askdouble  a prime age man asks for 2.4 times his
 *                                   market: section 2.
 *   GM_CONTRACTS_CONTROL=nometer    an offer is worth less the more it pays:
 *                                   section 3.
 *   GM_CONTRACTS_CONTROL=optionall  the option goes to any drafted man: 4 NFL.
 *   GM_CONTRACTS_CONTROL=nobird     a one season man gets the full maximum: 4 NBA.
 *   GM_CONTRACTS_CONTROL=noarb      arbitration years read as free agency: 4 MLB.
 *   GM_CONTRACTS_CONTROL=resheet    the sheet is a draw, not a hash: 4 NHL.
 *  Added for the review of 2026-10-02, all section 4:
 *   optiontwice  the option survives a re-signing (finding 1)
 *   keepflags    a kept man keeps his old tag and guarantee (findings 2, 10)
 *   qotwice      the qualifying offer is forgotten when he leaves (3, 15)
 *   mutmid       a mid season arrival can be qualified (4)
 *   mutmax       the NBA maximum tier off by one, in gmContractRules.ts (5)
 *   muttag       the host's tag test off by a season, in the NFL host (6)
 *   noreprice    a man let go keeps his old figure in the pool (11)
 *   sheetpool    an unmatched sheet sends him to the pool, not the rival (11)
 *   mutceil      a push is not cut to what the rules allow (8, 16)
 *   earlyone     Early Bird exception deals may run one season (13)
 *   nodeadcap    NBA room ignores next season's dead money (17)
 *
 * MEASURED 2026-10-02, remeasured after the review fixes on four seed sets
 * (SIM_SEED 0, 100, 200, 300; each is 5 seeds x 10 seasons per sport), every
 * one green, then each control. The first build measured six sets; the
 * baseline arm (section 0) is untouched by the fixes and reads the same.
 *
 *   0. men the engine's own flip took, no desk      NFL 31-46 of 223-247,
 *      NBA 6-10 of 114-123, MLB 69-81 of 425-431, NHL 1-4 of 192-199.
 *      All four together 114 to 126: floor 40, on the total, because the NHL
 *      count alone (as low as 1) is too small to floor.
 *   1. cases at the desk                             NFL 218-227, NBA 148-159,
 *      MLB 712-732, NHL 247-270 (floors 150, 90, 400, 150). Left without a
 *      decision: 0 on every seed. coinflip: 633 findings.
 *   2. ask as a share of the cap the deal is priced against
 *                 median of all  p95          season medians
 *      NFL        0.035-0.038    0.050-0.064  0.009 to 0.045
 *      NBA        0.250          0.300-0.309  0.093 to 0.300
 *      MLB        0.044-0.047    0.070-0.073  0.028 to 0.056
 *      NHL        0.041-0.044    0.065-0.070  0.033 to 0.060
 *      Bands: each season's median NFL 0.004-0.07, NBA 0.06-0.34, MLB
 *      0.015-0.08, NHL 0.018-0.085; median of all NFL 0.02-0.06, NBA
 *      0.15-0.32, MLB 0.02-0.07, NHL 0.025-0.07; p95 at most NFL 0.085, NBA
 *      0.33, MLB 0.09, NHL 0.085. Under askdouble the p95 measured NFL 0.123,
 *      NBA 0.350, MLB 0.130 (4 findings) and the NFL season medians reached
 *      0.083. Season one has no cases in the NBA, MLB and NHL leagues (every
 *      opening deal runs two seasons or more), and on one NFL seed set none
 *      either, because the GM now tags the only man expiring, so the floor on
 *      seasons with cases is 9 of 10 everywhere.
 *   3. meter steps per sport 47,586 to 241,560; nometer: 8,144 findings.
 *   4. rule coverage, lowest to highest over the sets, and its floor:
 *      NFL options 31-35 (15), later round picks 71-81 (30), tagged 48-49
 *      (20), tag year men at the desk 41-44 (20), guaranteed men re-signed
 *      25-36 (10), let go men repriced 91-96 (40), first rounders back with
 *      the option unused 19-27 (8). NBA Non-Bird 22-24 (8), Early Bird 17-19
 *      (6), capped by the rule 84-111 (40), ask over the ceiling 27-32 (10),
 *      Early Bird exception 10-15 (4), cases with dead money 147-159 (60),
 *      pushes over the rules 148-159 (60). MLB pre arbitration 72-77 (30),
 *      arbitration 142-153 (60), qualifying offers 262-273 (100), mid season
 *      arrivals 50 (20), let go men repriced 158-170 (60), refusers signed
 *      back 20-26 (8), men back after an offer 192-206 (60), picks paid
 *      20-26 (8). NHL restricted 135-141 (60), sheets 54-67 (25), sheet men
 *      at the rival 26-39 (10), picks paid 27-41 (15).
 *      Controls, findings on SIM_SEED 0: optionall 66, nobird 17, noarb 160,
 *      resheet 109, optiontwice 34, keepflags 38, qotwice 33, mutmid 31,
 *      mutmax 2 (the ladder walk: 6 and 9 seasons), muttag 96, noreprice 226,
 *      sheetpool 41, mutceil 149, earlyone 24, nodeadcap 13 (15 on 300).
 *
 * NOT COVERED HERE, AND WHERE IT IS: the walkout and counter arithmetic of a
 * single push, the reload guard on a push and the corrupt ledger reset are in
 * src/lib/gmContracts.test.ts; the deal table itself is pinned by
 * scripts/simGmDealTableFixture.mjs.
 *
 * Run: node scripts/simGmContracts.mjs     (SIM_SEED=n shifts every seed by n)
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GM_CONTRACTS_CONTROL || '';

/* Each control rewrites one string in one file (gmContracts.ts unless `file` says otherwise). */
const CONTROLS = {
  coinflip: {
    from: '    if (STAYS.has(d.kind)) holdMan(host, man, d, ledger);',
    to: '    if (STAYS.has(d.kind)) { /* control: he is left to the engine */ }',
    section: 1,
  },
  askdouble: { from: '  if (age <= 29) return 1.12;', to: '  if (age <= 29) return 2.4;', section: 2 },
  nometer: {
    from: '  return offer.salary * (1 - YEAR_MISMATCH_COST * off);',
    to: '  return (ask.salary * 1.5 - offer.salary) * (1 - YEAR_MISMATCH_COST * off);',
    section: 3,
  },
  optionall: {
    from: "    return drafted && rec?.round === NFL_OPTION_ROUND && !rec.optionUsed && !rec.firstDealDone ? 'fifth-year-option' : 'veteran';",
    to: "    return drafted && !rec.optionUsed && !rec.firstDealDone ? 'fifth-year-option' : 'veteran';",
    section: 4,
  },
  /* Review findings of 2026-10-02, one control each. */
  optiontwice: {
    from: "    return drafted && rec?.round === NFL_OPTION_ROUND && !rec.optionUsed && !rec.firstDealDone ? 'fifth-year-option' : 'veteran';",
    to: "    return drafted && rec?.round === NFL_OPTION_ROUND && !rec.optionUsed ? 'fifth-year-option' : 'veteran';",
    section: 4,
  },
  keepflags: {
    from: '  host.endDeal?.(man);\n  man.years = (d.years ?? 1) + 1;',
    to: '  man.years = (d.years ?? 1) + 1;',
    section: 4,
  },
  qotwice: {
    from: '  return !!ledger.men[id]?.qualified || !!ledger.qualifiedIds?.includes(id);',
    to: '  return !!ledger.men[id]?.qualified;',
    section: 4,
  },
  mutmid: {
    from: '    if (rec && !everQualified(ledger, man.id) && !rec.mid) {',
    to: '    if (rec && !everQualified(ledger, man.id)) {',
    section: 4,
  },
  mutmax: {
    file: 'gmContractRules.ts',
    from: '  for (const tier of NBA_MAX_SHARE) if (service <= tier.maxService) return tier.share;',
    to: '  for (const tier of NBA_MAX_SHARE) if (service < tier.maxService) return tier.share;',
    section: 4,
  },
  muttag: {
    file: 'gmContractsHostNfl.ts',
    from: '  held: (league, man) => (man as GmPlayer).tagSeason === league.season + 1,',
    to: '  held: (league, man) => (man as GmPlayer).tagSeason === league.season,',
    section: 4,
  },
  noreprice: {
    from: '        league.freeAgents.push({ ...man, years: 1, salary: host.marketSalary(league, man) });',
    to: '        league.freeAgents.push({ ...man, years: 1 });',
    section: 4,
  },
  sheetpool: { from: '      if (sheetClub) {', to: '      if (false) {', section: 4 },
  mutceil: {
    from: '  const salary = Math.min(offer.salary, topSalary(c));',
    to: '  const salary = offer.salary;',
    section: 4,
  },
  earlyone: {
    from: "      if (cls === 'bird-early' && limit > room) out.minYears = NBA_EARLY_BIRD_MIN_YEARS;",
    to: '',
    section: 4,
  },
  nodeadcap: {
    from: '    const used = host.nextPayroll ? host.nextPayroll(league, ledger.team, man.id) : (club ? payroll(club, man.id) : 0);',
    to: '    const used = club ? payroll(club, man.id) : 0;',
    section: 4,
  },
  /* Second review of 2026-10-02, one control each. */
  nofinalcap: { from: '  if (overCeiling(c, res.final.salary)) {', to: '  if (false) {', section: 4 },
  ladcap: {
    file: 'gmContractRules.ts',
    from: 'export const NHL_OFFER_SHEET_LADDER_CAP = 95.5;',
    to: 'export const NHL_OFFER_SHEET_LADDER_CAP = 88;',
    section: 4,
  },
  ladder: {
    file: 'gmContractRules.ts',
    from: '  { upTo: 7.020113, picks: [1, 3] },',
    to: '  { upTo: 7.020113, picks: [2, 3] },',
    section: 4,
  },
  underlist: {
    from: '  return club.players.filter(p => p.years <= 1 && !(host.held?.(league, p)));',
    to: '  return club.players.filter(p => p.years <= 1 && p.ovr % 7 !== 0 && !(host.held?.(league, p)));',
    section: 1,
  },
  arbstep: {
    from: '    const step = Math.min(ARBITRATION_SHARES.length - 1, Math.max(0, service - MLB_ARBITRATION_AFTER));',
    to: '    const step = Math.min(ARBITRATION_SHARES.length - 1, Math.max(0, service - MLB_ARBITRATION_AFTER + 1));',
    section: 4,
  },
  nobird: {
    from: '        limit = Math.min(max, man.salary * NBA_NON_BIRD_RAISE);',
    to: '        limit = max;',
    section: 4,
  },
  noarb: {
    from: "    if (service < MLB_FREE_AGENCY_AFTER) return 'arbitration';",
    to: '',
    section: 4,
  },
  resheet: {
    from: '  const h = hash32(`${man.id}:${league.season}:sheet`);',
    to: '  const h = Math.floor(Math.random() * 4294967296);',
    section: 4,
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`GM_CONTRACTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(3);
}

/* A worktree has no node_modules of its own: walk up to the first one that holds esbuild. */
function findNodeModules() {
  let dir = ROOT;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'node_modules', 'esbuild', 'package.json'))) return path.join(dir, 'node_modules');
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  console.error('could not find node_modules/esbuild above ' + ROOT);
  process.exit(3);
}
const esbuild = createRequire(path.join(findNodeModules(), 'x.js'))('esbuild');

let controlHits = 0;
const controlPlugin = {
  name: 'gm-contracts-control',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmContract[A-Za-z]*\.ts$/ }, args => {
      let text = fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
      const c = CONTROLS[CONTROL];
      if (c && path.basename(args.path) === (c.file ?? 'gmContracts.ts')) {
        controlHits = text.split(c.from).length - 1;
        if (controlHits === 1) text = text.replace(c.from, c.to);
      }
      return { contents: text, loader: 'ts' };
    });
  },
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gmContracts-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as desk from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as rules from '${ROOT_URL}/src/lib/gmContractRules.ts';
export * as nfl from '${ROOT_URL}/src/lib/frontOffice.ts';
export * as nba from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as mlb from '${ROOT_URL}/src/lib/mlbFrontOffice.ts';
export * as nhl from '${ROOT_URL}/src/lib/nhlFrontOffice.ts';
export * as names from '${ROOT_URL}/src/lib/foNames.ts';
export { nflContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNfl.ts';
export { nbaContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNba.ts';
export { mlbContractHost } from '${ROOT_URL}/src/lib/gmContractsHostMlb.ts';
export { nhlContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNhl.ts';
`);
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
  logLevel: 'error', alias: { '@': `${ROOT_URL}/src` }, plugins: [controlPlugin],
});
if (CONTROL && controlHits !== 1) {
  console.error(`control cannot run: "${CONTROLS[CONTROL].from.trim()}" was found ${controlHits} times in ${CONTROLS[CONTROL].file ?? 'gmContracts.ts'}, it must be there exactly once`);
  process.exit(3);
}
/* A crash must never read as a control that fired (both would otherwise exit
   1): anything that ends the run before its summary line exits 3. */
let finished = false;
process.on('exit', () => {
  if (!finished) { console.error('simGmContracts: CRASHED before its summary line (exit 3)'); process.exit(3); }
});
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/* Seeded BEFORE the bundle loads: src/lib/entityIds.ts draws its id token from
   Math.random at module scope, the NHL sheet is hashed off the player's id,
   and without this the NHL arm differed from one process to the next (found by
   running the harness twice and diffing the output). */
{
  let a = 908;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const B = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });
const { desk, rules } = B;

/* One seeded stream per run, handed to the engines AND set as Math.random,
   so anything an engine draws without being handed a generator is seeded too. */
function stream(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Each engine's own functions, under one shape. retiredNames reads the
   engine's OWN report of who retired; nothing is inferred from a roster. */
const SPORTS = [
  {
    key: 'nfl', host: B.nflContractHost,
    init: rng => B.nfl.initLeague(rng),
    draftClass: (lg, rng) => B.nfl.generateDraftClass(rng, 40, B.names.leagueNames(lg)),
    toPlayer: (lg, pr, rng) => B.nfl.prospectToPlayer(pr, rng),
    retiredNames: (out, team) => new Set(out.retired.filter(r => r.team === team).map(r => r.player)),
  },
  {
    key: 'nba', host: B.nbaContractHost,
    init: rng => B.nba.initNbaLeague(rng),
    draftClass: (lg, rng) => B.nba.nbaDraftClass(rng, 24, B.names.leagueNames(lg)),
    toPlayer: (lg, pr, rng) => B.nba.nbaProspectToPlayer(pr, rng, B.nba.nbaDraftSigning(lg)),
    retiredNames: notes => namesFromNotes(notes),
  },
  {
    key: 'mlb', host: B.mlbContractHost,
    init: rng => B.mlb.initMlbLeague(rng),
    draftClass: (lg, rng) => B.mlb.mlbDraftClass(rng, 24, B.names.leagueNames(lg)),
    toPlayer: (lg, pr, rng) => B.mlb.mlbProspectToPlayer(pr, rng),
    retiredNames: notes => namesFromNotes(notes),
  },
  {
    key: 'nhl', host: B.nhlContractHost,
    init: rng => B.nhl.initNhlLeague(rng),
    draftClass: (lg, rng) => B.nhl.nhlDraftClass(rng, 24, B.names.leagueNames(lg)),
    toPlayer: (lg, pr, rng) => B.nhl.nhlProspectToPlayer(pr, rng, lg.ratingModelVersion),
    retiredNames: notes => namesFromNotes(notes),
  },
];
/** The three engines that return notes write a retirement as "<name> retires." after an emoji. */
function namesFromNotes(notes) {
  const out = new Set();
  for (const n of notes) {
    const m = /^\S+\s(.+) retires\.$/u.exec(n);
    if (m) out.add(m[1]);
  }
  return out;
}

const SEEDS = [11, 22, 33, 44, 55].map(s => s + (Number(process.env.SIM_SEED) || 0));
const SEASONS = 10;
let failures = 0;
const fails = {};
const fail = (section, msg) => {
  failures += 1;
  fails[section] = (fails[section] ?? 0) + 1;
  if (fails[section] <= 6) console.error(`  FAIL (${section}): ${msg}`);
};
const quant = (xs, q) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};
const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);
const pickTeam = (lg, seed) => { const keys = Object.keys(lg.teams).sort(); return keys[seed % keys.length]; };
const r1 = n => Math.round(n * 10) / 10;

/* The GM drafts the best grade left with each pick his club holds, before the
   offseason, exactly where the boards draft. The MLB second pick is put on a
   two year line so the pre arbitration branch is reached on the real engine:
   the engine's own four year rookie deals always expire in an arbitration year. */
function draftForUser(sport, lg, team, rng, ledger, track) {
  const club = lg.teams[team];
  const cls = [...sport.draftClass(lg, rng)].sort((a, b) => b.grade - a.grade);
  const rounds = [...club.picks].sort((a, b) => a - b);
  rounds.forEach((round, i) => {
    const pr = cls[i];
    if (!pr) return;
    const p = sport.toPlayer(lg, pr, rng);
    if (!p) return;
    if (sport.key === 'mlb' && i === 1) p.years = 2;
    club.players.push(p);
    if (ledger) desk.noteArrival(ledger, p.id, lg.season, 'draft', round);
    if (track) track[p.id] = { how: 'draft', n: 0, round };
  });
}

/* NBA only: the GM trims through the engine's own cut (nbaRelease), so dead
   money really sits on next season's books and the desk's cap room has to
   count it the way the engine does (review finding 17). */
function trimNbaWithCuts(lg, team, size) {
  const club = lg.teams[team];
  /* A salary dump first: the dearest man outside the top five with two or
     more seasons left, so next season's books really carry dead money. */
  const top5 = new Set([...club.players].sort((a, b) => b.ovr - a.ovr).slice(0, 5).map(p => p.id));
  const dump = club.players.filter(p => !top5.has(p.id) && p.years >= 2).sort((a, b) => b.salary - a.salary)[0];
  if (dump) B.nba.nbaRelease(club, lg.freeAgents, dump.id);
  for (let guard = 0; club.players.length > size && guard < 40; guard++) {
    const worst = [...club.players].sort((a, b) => a.ovr - b.ovr)[0];
    if (!B.nba.nbaRelease(club, lg.freeAgents, worst.id)) break;
  }
  trimRoster(lg, team, size);
}

/* The GM keeps his roster near its opening size by cutting his lowest rated
   men. Not asserted on: it only stops ten drafts piling up. */
function trimRoster(lg, team, size) {
  const club = lg.teams[team];
  while (club.players.length > size) {
    const worst = [...club.players].sort((a, b) => a.ovr - b.ovr)[0];
    club.players = club.players.filter(p => p.id !== worst.id);
  }
}

/* NBA only: the GM signs the best man in the pool on a one or two season line
   every summer, which is the only way a Non-Bird or Early Bird man reaches the
   desk. Taken straight off the pool, the way a signing lands. */
function signFromPool(lg, team, s) {
  const best = [...lg.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
  if (!best) return;
  lg.freeAgents = lg.freeAgents.filter(p => p.id !== best.id);
  /* On a minimum deal, the way a veteran signs late: his Bird ceiling is then
     well under what he will ask for next winter, so the cap really binds. */
  lg.teams[team].players.push({ ...best, years: 1 + (s % 2), salary: B.nbaContractHost.minSalary(lg) });
}

/** A fixed policy that walks every door the desk has, so every one is exercised. */
function decide(lg, ledger, c, i, paths) {
  const tally = k => { paths[k] = (paths[k] ?? 0) + 1; };
  if (c.option) {
    /* Some option holders are kept on a new deal instead, so the desk has to
       remember that the option went with the rookie deal (review finding 1). */
    if (i % 4 === 1 || i % 4 === 2) {
      /* One season over his ask, so he is back at the desk next winter, past his rookie deal. */
      desk.pushFor(ledger, lg, c, { years: 1, salary: c.ask.salary * 1.1 });
      const kept = desk.decisionFor(ledger, lg.season, c.man.id);
      if (kept?.kind === 'keep') { tally('option holder re-signed for one season'); return { ok: true, decision: kept }; }
    }
    tally(i % 4 === 3 ? 'option declined' : 'option');
    return i % 4 === 3 ? desk.letGo(ledger, lg, c) : desk.useOption(ledger, lg, c);
  }
  if (c.tender) { tally(i % 5 === 4 ? 'non tender' : 'tender'); return i % 5 === 4 ? desk.letGo(ledger, lg, c) : desk.tenderHim(ledger, lg, c); }
  if (c.restricted) {
    if (c.restricted.sheet) { tally(i % 2 ? 'sheet matched' : 'sheet picks'); return i % 2 ? desk.matchSheet(ledger, lg, c) : desk.takePicks(ledger, lg, c); }
    if (i % 3 !== 0) { tally('qualified rfa'); return desk.tenderHim(ledger, lg, c); }
  }
  if (c.qualifying && i % 2 === 0) { tally(c.qualifying.accepts ? 'qo accepted' : 'qo rejected'); return desk.qualify(ledger, lg, c); }
  const mode = i % 5;
  if (mode === 0) {
    const kept = desk.keepAtAsk(ledger, lg, c);
    if (kept.ok) { tally('kept at ask'); return kept; }
    tally('capped by rule');
    desk.pushFor(ledger, lg, c, { years: c.ask.years, salary: c.ceiling ?? 0 });
    if (desk.decisionFor(ledger, lg.season, c.man.id)) return { ok: true };
    const fin = desk.acceptFinal(ledger, lg, c);
    return fin.ok ? fin : desk.letGo(ledger, lg, c);
  }
  if (mode === 1 || mode === 2 || mode === 4) {
    const share = mode === 1 ? 0.86 : mode === 2 ? 0.65 : 0.4;
    const res = desk.pushFor(ledger, lg, c, { years: c.ask.years, salary: c.ask.salary * share });
    tally(`push ${share}: ${res ? res.verdict : 'refused'}`);
    if (desk.decisionFor(ledger, lg.season, c.man.id)) return { ok: true };
    if (mode === 1) { const fin = desk.acceptFinal(ledger, lg, c); if (fin.ok) return fin; }
    return desk.letGo(ledger, lg, c);
  }
  tally('let go');
  return desk.letGo(ledger, lg, c);
}

/* The seasons he has played here, counted by this harness itself and never
   read off the desk's ledger: every winter each man on the roster when the
   desk opens has just played a season here, so his count goes up by one. A
   draft pick joins after the desk, so his first count comes a season later.
   A man on the roster when the desk opened is a founder (unknown, null). A
   man who leaves is forgotten, so a man signed back starts again at zero,
   which is the Bird clock's own rule. Nothing here is the desk's formula. */
function trackDesk(track, lg, team) {
  const here = new Set(lg.teams[team].players.map(p => p.id));
  for (const id of Object.keys(track)) if (!here.has(id)) delete track[id];
  for (const p of lg.teams[team].players) {
    const t = (track[p.id] ??= { how: 'other', n: 0 });
    t.n += 1;
  }
}
function playedHere(track, id) {
  const t = track[id];
  if (!t || t.how === 'founder') return null;
  return t.n;
}
/** The NBA maximum share by seasons in the league (0-6, 7-9, 10+), written here by hand from the recorded sources. */
const NBA_MAX_BY_SERVICE = s => (s <= 6 ? 0.25 : s <= 9 ? 0.3 : 0.35);

/* The NHL offer sheet ladder as published for 2025-26 at a 95.5M cap
   (pittsburghhockeynow.com, reread 2026-10-02, and dailyfaceoff.com): the top
   of each rung in dollars and the picks it costs. Written here by hand and
   never read off gmContractRules.ts, so a stale cap or a mistyped rung in the
   module goes red (review 2, finding 2). The game charges a sheet by its share
   of the cap, and its drafts have two rounds, so a third round pick is not
   payable. */
const NHL_LADDER_CAP = 95.5;
const NHL_LADDER = [
  [1544424, []], [2340037, [3]], [4680076, [2]], [7020113, [1, 3]],
  [9360153, [1, 2, 3]], [11700192, [1, 1, 2, 3]], [Number.POSITIVE_INFINITY, [1, 1, 1, 1]],
];
/** The rung a sheet of `salary` ($M) sits on against `cap`, in published dollars; null within a dollar of a rung's top. */
function ladderRung(salary, cap) {
  const dollars = (salary / cap) * NHL_LADDER_CAP * 1e6;
  if (NHL_LADDER.some(([top]) => Math.abs(dollars - top) < 1)) return null;
  return NHL_LADDER.findIndex(([top]) => dollars <= top);
}
const payable = picks => picks.filter(r => r <= 2);

/** Sections 2, 3 and 4 for one case. */
function checkCase(sport, lg, ledger, team, c, st, s) {
  const host = sport.host;
  const cap = host.nextCap(lg);
  const tag = `${sport.key} ${lg.season} ${c.man.name}`;
  /* 2. The ask as a share of the cap the deal is priced against. */
  const share = c.ask.salary / cap;
  st.shares.push(share);
  (st.bySeason[s] ??= []).push(share);
  if (!(c.ask.salary > 0) || !(c.ask.years >= 1)) fail(2, `${tag}: an ask of ${c.ask.years} years at ${c.ask.salary}`);

  /* 3. Walk the salary at every length the desk allows: the meter may never fall. */
  for (let years = 1; years <= c.maxYears; years++) {
    let last = -1;
    for (let k = 0; k <= 65; k++) {
      const { closeness } = desk.readOffer(c.ask, { years, salary: c.ask.salary * k * 0.02 });
      st.meterSteps += 1;
      if (closeness < last) { fail(3, `${tag}: the meter fell from ${last} to ${closeness} at ${k * 2}% of the ask, ${years} years`); break; }
      last = closeness;
    }
  }
  if (desk.readOffer(c.ask, c.ask).closeness !== 100) fail(3, `${tag}: his own ask does not fill the meter`);

  /* 4. Each league's rule, recomputed here from what this harness tracked itself. */
  const rec = ledger.men[c.man.id];
  const tr = st.track[c.man.id];
  const drafted = tr?.how === 'draft';
  const played = playedHere(st.track, c.man.id);
  const bump = k => { st.rule[k] = (st.rule[k] ?? 0) + 1; };
  st.market[c.man.id] = c.ask.market;
  if (sport.key === 'nfl') {
    /* The option belongs to a first rounder's rookie deal: once that deal has
       been settled at the desk, whatever was decided, it is gone. */
    const expect = drafted && tr.round === 1 && !st.firstDealOver.has(c.man.id);
    if (!!c.option !== expect) fail(4, `${tag}: option ${c.option ? 'offered' : 'missing'} for a round ${tr?.round ?? '-'} ${tr?.how} man${st.firstDealOver.has(c.man.id) ? ' whose rookie deal is over' : ''}`);
    if (c.option) { bump('options'); if (c.option.years !== 1) fail(4, `${tag}: the option buys ${c.option.years} years`); }
    if (drafted && tr.round === 1 && st.firstDealOver.has(c.man.id)) {
      bump('first rounders past their rookie deal');
      if (!st.optionUsed.has(c.man.id)) bump('first rounders back with the option unused');
    }
    if (drafted && tr.round !== 1) bump('laterRoundsAsked');
    if (st.taggedNow.has(c.man.id)) fail(4, `${tag}: tagged this winter and still at the desk`);
    if (st.taggedLast.has(c.man.id)) bump('tag year men at the desk');
  }
  if (sport.key === 'nba') {
    const service = drafted ? played : Number.POSITIVE_INFINITY;
    const max = r1(NBA_MAX_BY_SERVICE(service) * cap);
    if (c.ask.salary > max + 0.05) fail(4, `${tag}: asks ${c.ask.salary} over the maximum ${max}`);
    if (c.maxSalary == null || Math.abs(c.maxSalary - max) > 0.051) fail(4, `${tag}: maximum ${c.maxSalary} where ${service} seasons give ${max}`);
    const club = lg.teams[team];
    /* Next season's dead money, rolled by hand: a cut's entry halves and loses a season. */
    const dead = (club.deadCap ?? []).filter(e => e.seasonsLeft > 1).reduce((a, e) => a + r1(e.amount / 2), 0);
    if (dead > 0) bump('cases with dead money on the books');
    const room = cap - club.players.reduce((a, p) => a + (p.id === c.man.id ? 0 : p.salary), 0) - r1(dead);
    st.nbaTop[c.man.id] = { top: max, capped: false };
    /* The same man under a ceiling of 85 and of 65 percent of his ask, so his
       last word lands as a counter and as an insult, both over the ceiling:
       signing that last word must be refused. On the real cases the ceiling
       mostly sits so far under the ask that the push walks him out, so this
       is where acceptFinal's guard is really exercised (review 2, finding 1). */
    if (c.canNegotiate) {
      for (const k of [0.85, 0.65]) {
        const ceiling = r1(c.ask.salary * k);
        if (ceiling < host.minSalary(lg)) continue;
        const c2 = { ...c, ceiling };
        const l3 = structuredClone(ledger);
        const res = desk.pushFor(l3, lg, c2, { years: c.ask.years, salary: ceiling });
        if (desk.decisionFor(l3, lg.season, c.man.id) || !res?.final || !(res.final.salary > ceiling)) continue;
        bump('last word over an imposed ceiling');
        if (desk.acceptFinal(l3, lg, c2).ok) fail(4, `${tag}: signed on a last word of ${res.final.salary} over an imposed ${ceiling} ceiling`);
      }
    }
    /* A push over what the rules allow is cut to it, so it can never sign him above it. */
    if (c.canNegotiate) {
      const l2 = structuredClone(ledger);
      const top = desk.topSalary(c);
      desk.pushFor(l2, lg, c, { years: c.ask.years, salary: c.ask.salary + top * 1.5 });
      const got = desk.decisionFor(l2, lg.season, c.man.id);
      bump('pushes over the rules');
      if (got?.salary != null && got.salary > top + 1e-9) fail(4, `${tag}: a push signed him at ${got.salary}, over the ${top} the rules allow`);
    }
    const floor = host.minSalary(lg);
    const tier = played == null || played >= 3 ? 'full' : played === 2 ? 'early' : played === 1 ? 'non' : 'none';
    st.rule[`tier ${tier}`] = (st.rule[`tier ${tier}`] ?? 0) + 1;
    /* An ask exactly at the room is a coin toss in floating point: not judged. */
    if (Math.abs(c.ask.salary - room) < 1e-6) bump('asks exactly at the room, not judged');
    else if (c.ask.salary > room) {
      const all = Object.values(lg.teams).flatMap(t => t.players);
      const avg = all.reduce((a, p) => a + p.salary, 0) / all.length;
      const limit = tier === 'full' ? max : tier === 'early' ? Math.min(max, Math.max(c.man.salary * 1.75, avg * 1.05))
        : tier === 'non' ? Math.min(max, c.man.salary * 1.2) : 0;
      const want = r1(Math.max(limit, room, floor));
      st.rule.capped = (st.rule.capped ?? 0) + 1;
      if (c.ceiling == null || Math.abs(c.ceiling - want) > 0.051) fail(4, `${tag}: ${tier} Bird ceiling ${c.ceiling} where the rule gives ${want} (ask ${c.ask.salary}, room ${r1(room)})`);
      st.nbaTop[c.man.id] = { top: Math.min(want, max), capped: true };
      if (c.ask.salary > (c.ceiling ?? Infinity)) {
        st.rule.overCeiling = (st.rule.overCeiling ?? 0) + 1;
        if (desk.keepAtAsk(structuredClone(ledger), lg, c).ok) fail(4, `${tag}: kept at an ask over his ceiling`);
        /* Offer him the ceiling. When his last word comes back over it, signing
           that last word must be refused (review 2, finding 1). */
        if (c.canNegotiate) {
          const l3 = structuredClone(ledger);
          const res = desk.pushFor(l3, lg, c, { years: c.ask.years, salary: want });
          if (!desk.decisionFor(l3, lg.season, c.man.id) && res?.final && res.final.salary > Math.min(want, max) + 0.051) {
            bump('last word over the ceiling');
            if (desk.acceptFinal(l3, lg, c).ok) fail(4, `${tag}: signed on his last word of ${res.final.salary}, over the ${Math.min(want, max)} the rules allow`);
          }
        }
      }
      /* Paid through the Early Bird exception: two seasons at the least, even on a one season push. */
      if (tier === 'early' && limit > room) {
        bump('early bird exception');
        if (c.minYears !== 2) fail(4, `${tag}: an Early Bird exception deal with a minimum of ${c.minYears ?? 1} seasons`);
        if (c.canNegotiate) {
          const l2 = structuredClone(ledger);
          desk.pushFor(l2, lg, c, { years: 1, salary: c.ceiling });
          const sent = l2.men[c.man.id]?.push?.offer;
          if (sent && sent.years < 2) fail(4, `${tag}: an Early Bird exception push went out at ${sent.years} season`);
        }
      }
    } else if (c.ceiling != null) fail(4, `${tag}: a ceiling with room for his ask`);
  }
  if (sport.key === 'mlb') {
    const expect = !drafted || played == null ? 'free-agent' : played < 3 ? 'pre-arbitration' : played < 6 ? 'arbitration' : 'free-agent';
    if (c.cls !== expect) fail(4, `${tag}: reads ${c.cls}, service ${played} says ${expect}`);
    st.rule[expect] = (st.rule[expect] ?? 0) + 1;
    if (!!c.tender !== (expect !== 'free-agent')) fail(4, `${tag}: tender ${c.tender ? 'offered' : 'missing'} for ${expect}`);
    if (c.tender && c.canNegotiate) fail(4, `${tag}: a controlled man is open to negotiation`);
    /* What the tender pays, by his own service year (review 2, finding 5). The
       game's own figures, written here by hand: pre arbitration his current
       salary or the engine's floor; arbitration years one, two and three pay
       40, 60 and 80 percent of his market, never a cut. */
    if (c.tender) {
      const market = r1(host.marketSalary(lg, c.man));
      const want = expect === 'pre-arbitration' ? r1(Math.max(host.minSalary(lg), c.man.salary))
        : r1(Math.max(c.man.salary, market * [0.4, 0.6, 0.8][Math.min(2, played - 3)]));
      bump(`${expect} tenders priced`);
      if (expect === 'arbitration' && want > r1(c.man.salary)) bump('arbitration tenders set by the step');
      if (Math.abs(c.tender.salary - want) > 0.051) fail(4, `${tag}: an ${expect} tender at ${c.tender.salary} in service year ${played}, the game's step pays ${want}`);
    }
    if (c.qualifying) {
      st.rule.qualifyingOffers = (st.rule.qualifyingOffers ?? 0) + 1;
      const top = Object.values(lg.teams).flatMap(t => t.players.map(p => p.salary)).sort((a, b) => b - a).slice(0, 125);
      const mean = r1(top.reduce((a, n) => a + n, 0) / top.length);
      if (Math.abs(c.qualifying.salary - mean) > 0.051) fail(4, `${tag}: qualifying offer ${c.qualifying.salary}, the top 125 mean is ${mean}`);
      if (st.qualified.has(c.man.id)) fail(4, `${tag}: offered a second qualifying offer`);
      if (rec?.mid || st.midIds.has(c.man.id)) fail(4, `${tag}: qualifying offer to a mid season arrival`);
    }
    if (st.midIds.has(c.man.id)) bump('mid season arrivals at the desk');
    if (st.qualified.has(c.man.id)) bump('men back after a qualifying offer');
  }
  if (sport.key === 'nhl') {
    const expect = drafted && played != null && c.man.age < 27 && played < 7 ? 'restricted' : 'veteran';
    if (c.cls !== expect) fail(4, `${tag}: reads ${c.cls}, rule says ${expect}`);
    if (c.restricted) {
      st.rule.restricted = (st.rule.restricted ?? 0) + 1;
      const again = desk.deskCase(host, lg, ledger, c.man).restricted.sheet;
      if (JSON.stringify(again) !== JSON.stringify(c.restricted.sheet)) fail(4, `${tag}: the offer sheet changed on a second read`);
      const sheet = c.restricted.sheet;
      if (sheet) {
        st.rule.sheets = (st.rule.sheets ?? 0) + 1;
        const rung = ladderRung(sheet.salary, cap);
        if (rung == null) bump('sheets on a rung edge, not judged');
        else {
          bump('sheets priced off the published ladder');
          const want = payable(NHL_LADDER[rung][1]);
          if (JSON.stringify(want) !== JSON.stringify(sheet.picks)) fail(4, `${tag}: a ${sheet.salary}M sheet against a ${cap}M cap costs ${sheet.picks}, the published ladder says ${want}`);
        }
        if (c.canNegotiate) fail(4, `${tag}: open to negotiation with a sheet on the table`);
      }
    }
  }
}

/**
 * Where a man the desk let go ended up (review finding 11). In the NFL and
 * MLB the pool never reprices anybody, so a man let go must sit there at the
 * market figure his ask was built from, not at his old deal's figure (or the
 * club could sign a star straight back at his rookie price). In the NHL a man
 * whose sheet was not matched belongs to the club that tabled it, on its terms.
 */
function checkGone(sport, lg, team, d, retired, st) {
  const bump = k => { st.rule[k] = (st.rule[k] ?? 0) + 1; };
  const inPool = lg.freeAgents.find(p => p.id === d.id);
  if (d.kind === 'take-picks') {
    if (inPool) { fail(4, `${sport.key} ${d.season} ${d.name}: his sheet was not matched, yet he is in the pool, not at the club that tabled it`); return; }
    for (const [k, t] of Object.entries(lg.teams)) {
      if (k === team) continue;
      const p = t.players.find(x => x.id === d.id);
      if (!p) continue;
      bump('sheet men at the rival');
      if (p.years !== d.years || Math.abs(p.salary - d.salary) > 1e-9) fail(4, `${sport.key} ${d.name}: at the rival on ${p.years}y at ${p.salary}, the sheet said ${d.years}y at ${d.salary}`);
      return;
    }
    if (!retired.has(d.name)) bump('sheet men untraced');
    return;
  }
  if (!inPool || (sport.key !== 'nfl' && sport.key !== 'mlb')) return;
  const want = st.market[d.id];
  if (want == null) return;
  bump('let go men repriced');
  if (Math.abs(inPool.salary - want) > 0.051) fail(4, `${sport.key} ${d.season} ${d.name}: let go (${d.kind}) into the pool at ${inPool.salary}, his market was ${want}`);
  if (inPool.guaranteed || inPool.tagSeason != null) fail(4, `${sport.key} ${d.name}: in the pool still carrying his old deal's guarantee or tag`);
}

/** 0. The engine on its own: how many of the GM's expiring men leave on its flip. */
function baselineRun(sport, seed, st) {
  const rng = stream(seed);
  Math.random = rng;
  const lg = sport.init(rng);
  const team = pickTeam(lg, seed);
  const size = lg.teams[team].players.length;
  for (let s = 0; s < SEASONS; s++) {
    draftForUser(sport, lg, team, rng, null, null);
    const up = lg.teams[team].players.filter(p => p.years <= 1 && !sport.host.held?.(lg, p));
    const out = sport.host.runOffseason(lg, rng, team);
    const retired = sport.retiredNames(out, team);
    const here = new Set(lg.teams[team].players.map(p => p.id));
    for (const m of up) {
      st.baseUp += 1;
      if (!here.has(m.id) && !retired.has(m.name)) st.baseLeft += 1;
    }
    trimRoster(lg, team, size);
  }
}

/** 1 to 5 for one run of ten seasons with the desk in front of the engine. */
function deskRun(sport, seed, st) {
  const rng = stream(seed);
  Math.random = rng;
  const host = sport.host;
  const lg = sport.init(rng);
  const team = pickTeam(lg, seed);
  const size = lg.teams[team].players.length;
  const ledger = desk.openLedger(lg, team);
  const basePicks = lg.teams[team].picks.length;
  /* This run's own records, kept apart from the desk's ledger. */
  st.track = {};
  for (const p of lg.teams[team].players) st.track[p.id] = { how: 'founder', n: 0 };
  st.firstDealOver = new Set();
  st.optionUsed = new Set();
  st.taggedLast = new Set();
  st.midIds = new Set();
  st.market = {};
  for (let s = 0; s < SEASONS; s++) {
    /* NFL: the GM tags his best expiring man who was not tagged last winter,
       BEFORE the desk opens, the way the board's tag window runs. A man tagged
       now is under contract for next season and must never reach the desk; a
       man who played this season on last winter's tag must. */
    st.taggedNow = new Set();
    /* Mid season means THIS season: kept, he is here from day one of the next. */
    st.midIds = new Set();
    if (sport.key === 'nfl') {
      const club = lg.teams[team];
      const up = club.players.filter(p => p.years <= 1 && p.tagSeason !== lg.season + 1 && p.tagSeason !== lg.season)
        .sort((a, b) => b.ovr - a.ovr).slice(0, 3);
      for (const p of up) {
        const res = B.nfl.applyFranchiseTag(lg, club, p.id);
        if (res.ok) { st.taggedNow.add(p.id); st.rule.tagged = (st.rule.tagged ?? 0) + 1; break; }
      }
    }
    /* MLB: a man picked up from the pool late in the season, so he arrives at
       the desk mid season and his deal runs out now. No qualifying offer for
       him this winter (review finding 4). */
    if (sport.key === 'mlb') {
      const best = [...lg.freeAgents].sort((a, b) => b.ovr - a.ovr)[0];
      if (best) {
        lg.freeAgents = lg.freeAgents.filter(p => p.id !== best.id);
        lg.teams[team].players.push({ ...best, years: 1 });
        st.midIds.add(best.id);
      }
    }
    trackDesk(st.track, lg, team);
    /* Who is up, read off the roster by this harness and never off the desk:
       every man on his last season except the one the GM just tagged (review
       2, finding 3). Each must have a decision applied in this offseason. */
    const rosterUp = lg.teams[team].players.filter(p => p.years <= 1 && !st.taggedNow.has(p.id)).map(p => ({ id: p.id, name: p.name }));
    st.rosterUp += rosterUp.length;
    desk.noteRoster(ledger, lg, true);
    const cases = desk.deskCases(host, lg, ledger);
    st.nbaTop = {};
    for (const c of cases) checkCase(sport, lg, ledger, team, c, st, s);
    cases.forEach((c, i) => {
      const made = decide(lg, ledger, c, i, st.paths);
      if (made && made.ok === false) fail(1, `${sport.key} ${lg.season} ${c.man.name}: the policy's decision was refused: ${made.reason}`);
      if (c.qualifying && desk.decisionFor(ledger, lg.season, c.man.id)?.kind.startsWith('qualify')) st.qualified.add(c.man.id);
      /* NBA: nobody stays on a figure over what the rules let the club pay him (review 2, finding 1). */
      const d = desk.decisionFor(ledger, lg.season, c.man.id);
      const top = st.nbaTop[c.man.id];
      if (sport.key === 'nba' && d && STAYS.has(d.kind) && top) {
        if (top.capped) st.rule['capped men kept'] = (st.rule['capped men kept'] ?? 0) + 1;
        if (d.salary > top.top + 0.051) fail(4, `nba ${lg.season} ${c.man.name}: kept (${d.kind}) at ${d.salary}, over the ${top.top} the rules allow`);
      }
    });
    st.cases += cases.length;

    /* 1b. Fails closed: the same league with one decision missing runs nothing. */
    if (cases.length && !st.closedChecked) {
      const lg2 = structuredClone(lg);
      const l2 = structuredClone(ledger);
      l2.decisions = l2.decisions.filter(d => !(d.season === lg.season && d.id === cases[0].man.id));
      const r2 = desk.runDeskOffseason(host, lg2, l2, () => 0.5);
      if (r2.ok || lg2.season !== lg.season || r2.undecided[0]?.id !== cases[0].man.id) fail(1, `${sport.key}: the desk ran an offseason with ${cases[0].man.name} undecided`);
      st.closedChecked = true;
    }

    draftForUser(sport, lg, team, rng, ledger, st.track);
    const capWant = host.nextCap(lg);
    /* Who goes into this offseason on a guarantee (a tag or an option year). */
    const guaranteedBefore = new Set(lg.teams[team].players.filter(p => p.guaranteed).map(p => p.id));
    const run = desk.runDeskOffseason(host, lg, ledger, rng);
    if (!run.ok) { fail(1, `${sport.key} ${lg.season}: the desk refused to run with every decision made (${run.undecided.map(u => u.name)})`); break; }
    if (lg.cap !== capWant) fail(5, `${sport.key}: the host said next season's cap is ${capWant}, the engine set ${lg.cap}`);

    /* 1. Every applied decision, against what the roster says now. */
    const retired = sport.retiredNames(run.engine, team);
    const here = new Map(lg.teams[team].players.map(p => [p.id, p]));
    /* The engine's offseason can cut a man too (the NBA trims to its roster
       maximum): anyone gone now is forgotten, so a man signed back from the
       pool later starts his count again. */
    for (const id of Object.keys(st.track)) if (!here.has(id)) delete st.track[id];
    for (const d of run.applied) {
      const p = here.get(d.id);
      if (STAYS.has(d.kind)) {
        if (!p) {
          if (retired.has(d.name)) st.retiredKept += 1;
          else { st.leftUndecided += 1; fail(1, `${sport.key} ${d.season} ${d.name}: kept (${d.kind}) but gone, and the engine did not retire him`); }
        } else if (p.years !== d.years || Math.abs(p.salary - d.salary) > 1e-9) {
          st.leftUndecided += 1;
          fail(1, `${sport.key} ${d.season} ${d.name}: kept on ${d.years}y at ${d.salary}, the roster says ${p.years}y at ${p.salary}`);
        } else {
          st.kept += 1;
          if (d.kind === 'option' && p.guaranteed !== true) fail(4, `${sport.key} ${d.name}: the option year is not guaranteed`);
          /* A new deal starts clean: the old deal's tag and guarantee end with it (review findings 2 and 10). */
          if (d.kind !== 'option' && (p.guaranteed || p.tagSeason != null || p.tagCount != null)) {
            fail(4, `${sport.key} ${d.season} ${d.name}: re-signed (${d.kind}) but still carries guaranteed ${p.guaranteed} tagSeason ${p.tagSeason} tagCount ${p.tagCount}`);
          }
          if (d.kind !== 'option' && guaranteedBefore.has(d.id)) st.rule['guaranteed men re-signed'] = (st.rule['guaranteed men re-signed'] ?? 0) + 1;
        }
        if (st.track[d.id]?.how === 'draft') st.firstDealOver.add(d.id);
        if (d.kind === 'option') st.optionUsed.add(d.id);
      } else if (p) fail(1, `${sport.key} ${d.season} ${d.name}: let go (${d.kind}) but still on the roster`);
      else {
        st.letGo += 1;
        checkGone(sport, lg, team, d, retired, st);
      }
    }
    /* NFL: the man tagged this winter came through on his tag. */
    for (const id of st.taggedNow) {
      const p = here.get(id);
      if (p && (p.years !== 1 || p.tagSeason !== lg.season || p.guaranteed !== true)) {
        fail(4, `nfl ${lg.season} ${p.name}: tagged, but came out of the offseason on ${p.years}y, tagSeason ${p.tagSeason}, guaranteed ${p.guaranteed}`);
      }
    }
    st.taggedLast = st.taggedNow;
    /* MLB: a man who turned the qualifying offer down is signed straight back
       from the pool, so his next winter tests "one offer per man, ever"
       (review finding 3). */
    if (sport.key === 'mlb') {
      for (const d of run.applied) {
        if (d.kind !== 'qualify-rejected') continue;
        const back = lg.freeAgents.find(p => p.id === d.id);
        if (!back) continue;
        lg.freeAgents = lg.freeAgents.filter(p => p.id !== d.id);
        lg.teams[team].players.push({ ...back, years: 1 });
        desk.noteArrival(ledger, d.id, lg.season, 'signing');
        delete st.track[d.id];
        st.rule['qualifying offer refusers signed back'] = (st.rule['qualifying offer refusers signed back'] ?? 0) + 1;
      }
    }
    for (const c of cases) if (!run.applied.some(d => d.id === c.man.id)) fail(1, `${sport.key} ${c.man.name}: expiring but no decision was applied`);
    for (const m of rosterUp) {
      if (!run.applied.some(d => d.id === m.id)) { st.leftUnlisted += 1; fail(1, `${sport.key} ${lg.season} ${m.name}: his deal ran out, yet he never reached the desk`); }
    }
    st.picksAdded += run.picksAdded.length;
    if (lg.teams[team].picks.length !== basePicks + run.picksAdded.length) {
      fail(4, `${sport.key} ${lg.season}: ${run.picksAdded.length} picks owed, the club holds ${lg.teams[team].picks.length} against a base of ${basePicks}`);
    }
    if (sport.key === 'nba') { signFromPool(lg, team, s); trimNbaWithCuts(lg, team, size); }
    trimRoster(lg, team, size);
  }
}

const newStats = () => ({
  baseUp: 0, baseLeft: 0, cases: 0, kept: 0, letGo: 0, retiredKept: 0, leftUndecided: 0, picksAdded: 0, rosterUp: 0, leftUnlisted: 0, nbaTop: {},
  shares: [], bySeason: [], meterSteps: 0, rule: {}, paths: {}, qualified: new Set(), closedChecked: false,
});
const ALL = {};
for (const sport of SPORTS) {
  const st = newStats();
  ALL[sport.key] = st;
  for (const seed of SEEDS) {
    baselineRun(sport, seed, st);
    deskRun(sport, seed, st);
  }
}

/* ---------- report ---------- */
const pc = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}%` : 'n/a');
const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : 'n/a');
console.log(`simGmContracts: ${SPORTS.length} engines x ${SEEDS.length} seeds (${SEEDS.join(', ')}) x ${SEASONS} seasons${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
for (const sport of SPORTS) {
  const st = ALL[sport.key];
  console.log(`\n${sport.key.toUpperCase()}`);
  console.log(`  0) baseline, no desk: ${st.baseLeft} of ${st.baseUp} expiring men left on the engine's flip (${pc(st.baseLeft, st.baseUp)})`);
  console.log(`  1) desk: ${st.cases} cases, ${st.kept} kept on their agreed terms, ${st.letGo} let go, ${st.retiredKept} kept then retired by the engine, ${st.leftUndecided} left without a decision; ${st.rosterUp} expiring by the roster, ${st.leftUnlisted} of them never at the desk`);
  const seasons = st.bySeason.map((xs, i) => [i, xs]).filter(([, xs]) => xs && xs.length);
  const seasonMins = seasons.map(([, xs]) => quant(xs, 0));
  const seasonMaxs = seasons.map(([, xs]) => quant(xs, 1));
  const seasonMeds = seasons.filter(([, xs]) => xs.length >= 5).map(([, xs]) => quant(xs, 0.5));
  st.seasonMedRange = [Math.min(...seasonMeds), Math.max(...seasonMeds)];
  console.log(`  2) ask / cap: p05 ${f3(quant(st.shares, 0.05))}, median ${f3(quant(st.shares, 0.5))}, p95 ${f3(quant(st.shares, 0.95))}; lowest in any season ${f3(Math.min(...seasonMins))}, highest ${f3(Math.max(...seasonMaxs))}; seasons with cases ${seasons.length} of ${SEASONS} (empty: ${[...Array(SEASONS).keys()].filter(i => !(st.bySeason[i] && st.bySeason[i].length)).join(' ') || 'none'})`);
  console.log(`     season medians from ${f3(st.seasonMedRange[0])} to ${f3(st.seasonMedRange[1])} (seasons with five or more asks)`);
  console.log(`  3) meter steps walked: ${st.meterSteps}`);
  console.log(`  4) rule counts: ${Object.entries(st.rule).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}; picks owed and paid ${st.picksAdded}`);
  console.log(`     doors: ${Object.entries(st.paths).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

/* ---------- 4. the NBA maximum, every rung of the ladder (review finding 5) ---------- */
for (let s = 0; s <= 15; s++) {
  if (rules.nbaMaxShare(s) !== NBA_MAX_BY_SERVICE(s)) fail(4, `nba: the maximum for ${s} seasons reads ${rules.nbaMaxShare(s)}, the sources say ${NBA_MAX_BY_SERVICE(s)}`);
}

/* ---------- 4. the NHL offer sheet ladder, every rung (review 2, finding 2) ---------- */
let ladderEdges = 0;
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/* At the ladder's own cap, every published edge exactly: the top of each rung and one dollar over it. */
NHL_LADDER.forEach(([top, picks], i) => {
  if (!Number.isFinite(top)) return;
  const at = rules.offerSheetPicks(top / 1e6, NHL_LADDER_CAP);
  const over = rules.offerSheetPicks((top + 1) / 1e6, NHL_LADDER_CAP);
  ladderEdges += 2;
  if (!sameList(at, picks)) fail(4, `nhl: a $${top} sheet costs ${at}, the published ladder says ${picks}`);
  if (!sameList(over, NHL_LADDER[i + 1][1])) fail(4, `nhl: a $${top + 1} sheet costs ${over}, the published ladder says ${NHL_LADDER[i + 1][1]}`);
});
/* At other caps, the middle of every rung: the ladder moves with the cap as a share of it. */
for (const cap of [80, 88, 104.3]) {
  NHL_LADDER.forEach(([top, picks], i) => {
    const lo = i ? NHL_LADDER[i - 1][0] : 0;
    const mid = Number.isFinite(top) ? (lo + top) / 2 : lo * 1.2;
    const got = rules.offerSheetPicks((mid / 1e6) * (cap / NHL_LADDER_CAP), cap);
    ladderEdges += 1;
    if (!sameList(got, picks)) fail(4, `nhl: the middle of rung ${i + 1} at a ${cap}M cap costs ${got}, the published ladder says ${picks}`);
  });
}
console.log(`\n4) NHL offer sheet ladder: ${ladderEdges} rung edges and middles walked against the published 2025-26 table`);

/* ---------- 5. the books ---------- */
for (const r of rules.CONTRACT_RULES) {
  if (r.sources.length < (r.singleSource ? 1 : 2)) fail(5, `${r.id} has ${r.sources.length} source(s) and is not marked single source`);
  for (const s of r.sources) if (!/^https:\/\/[^\s]+$/.test(s.url) || !s.says) fail(5, `${r.id}: a source with no URL or nothing it says`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(rules.CONTRACT_RULES_AS_OF)) fail(5, 'CONTRACT_RULES_AS_OF is not a date');
console.log(`\n5) ${rules.CONTRACT_RULES.length} rules on the books, ${rules.CONTRACT_RULES.filter(r => r.singleSource).length} marked as resting partly on one source`);

/* ---------- the bands, from MEASURED in the header ---------- */
const BANDS = {
  /* ask / cap: every season's median inside [seasonMedLo, seasonMedHi]; all asks' median inside [medLo, medHi]; p95 at most p95Hi. */
  nfl: { seasonMedLo: 0.004, seasonMedHi: 0.07, medLo: 0.02, medHi: 0.06, p95Hi: 0.085, cases: 150, seasons: 9 },
  nba: { seasonMedLo: 0.06, seasonMedHi: 0.34, medLo: 0.15, medHi: 0.32, p95Hi: 0.33, cases: 90, seasons: 9 },
  mlb: { seasonMedLo: 0.015, seasonMedHi: 0.08, medLo: 0.02, medHi: 0.07, p95Hi: 0.09, cases: 400, seasons: 9 },
  nhl: { seasonMedLo: 0.018, seasonMedHi: 0.085, medLo: 0.025, medHi: 0.07, p95Hi: 0.085, cases: 150, seasons: 9 },
};
/* Section 4 coverage floors, each well under its measured range, so a rule cannot pass empty. */
const RULE_FLOORS = {
  nfl: {
    options: 15, laterRoundsAsked: 30, tagged: 20, 'tag year men at the desk': 20, 'guaranteed men re-signed': 10,
    'let go men repriced': 40, 'first rounders back with the option unused': 8,
  },
  nba: {
    'tier non': 8, 'tier early': 6, capped: 40, overCeiling: 10, 'early bird exception': 4,
    'cases with dead money on the books': 60, 'pushes over the rules': 60,
  },
  mlb: {
    'pre-arbitration': 30, arbitration: 60, qualifyingOffers: 100, 'mid season arrivals at the desk': 20,
    'let go men repriced': 60, 'qualifying offer refusers signed back': 8, 'men back after a qualifying offer': 60,
  },
  nhl: { restricted: 60, sheets: 25, 'sheet men at the rival': 10 },
};
const PICK_FLOORS = { nfl: 0, nba: 0, mlb: 8, nhl: 15 };
let baseLeft = 0;
for (const sport of SPORTS) {
  const st = ALL[sport.key];
  const b = BANDS[sport.key];
  baseLeft += st.baseLeft;
  if (st.leftUndecided !== 0) fail(1, `${sport.key}: ${st.leftUndecided} men left without a decision that let them go`);
  if (st.kept + st.letGo + st.retiredKept + st.leftUndecided !== st.cases) fail(1, `${sport.key}: ${st.cases} cases but ${st.kept + st.letGo + st.retiredKept + st.leftUndecided} outcomes`);
  if (st.cases < b.cases) fail(1, `${sport.key}: only ${st.cases} cases reached the desk (floor ${b.cases})`);
  if (!st.closedChecked) fail(1, `${sport.key}: the fail closed check never ran`);
  /* Every season walked, on its median, not on its single highest or lowest
     ask (a max is noise; review finding 22). Each season pools its five runs. */
  st.bySeason.forEach((xs, s) => {
    if (!xs || xs.length < 5) return;
    const m = quant(xs, 0.5);
    if (!(m >= b.seasonMedLo && m <= b.seasonMedHi)) fail(2, `${sport.key} season ${s + 1}: the median ask is ${f3(m)} of the cap, outside ${b.seasonMedLo} to ${b.seasonMedHi}`);
  });
  const seasonsWith = st.bySeason.filter(xs => xs && xs.length).length;
  if (seasonsWith < b.seasons) fail(2, `${sport.key}: asks reached the desk in ${seasonsWith} of ${SEASONS} seasons (floor ${b.seasons})`);
  const med = quant(st.shares, 0.5);
  if (!(med >= b.medLo && med <= b.medHi)) fail(2, `${sport.key}: the median ask is ${f3(med)} of the cap, outside ${b.medLo} to ${b.medHi}`);
  /* The strongest signal for asks drifting up: the 95th percentile, not the top one. */
  const p95 = quant(st.shares, 0.95);
  if (!(p95 <= b.p95Hi)) fail(2, `${sport.key}: the 95th percentile ask is ${f3(p95)} of the cap, over ${b.p95Hi}`);
  if (st.meterSteps < 10000) fail(3, `${sport.key}: only ${st.meterSteps} meter steps walked`);
  for (const [k, floor] of Object.entries(RULE_FLOORS[sport.key])) {
    if ((st.rule[k] ?? 0) < floor) fail(4, `${sport.key}: ${k} reached ${st.rule[k] ?? 0} times (floor ${floor})`);
  }
  if (st.picksAdded < PICK_FLOORS[sport.key]) fail(4, `${sport.key}: ${st.picksAdded} picks paid (floor ${PICK_FLOORS[sport.key]})`);
}
/* The baseline floor is on all four together: per sport the NHL flip took as
   few as 1 man in 20 runs, which is a count too small to floor on its own. */
if (baseLeft < 40) fail(0, `the engines' own flip took only ${baseLeft} expiring men across all four sports (floor 40): the desk would be guarding nothing`);

console.log('');
for (const [k, n] of Object.entries(fails).sort()) console.log(`section ${k}: ${n} finding(s)`);
if (CONTROL) {
  const want = CONTROLS[CONTROL].section;
  const fired = (fails[want] ?? 0) > 0;
  console.log(fired
    ? `simGmContracts: CONTROL ${CONTROL} FIRED, section ${want} went red as it must (${fails[want]} findings, exit 1)`
    : `simGmContracts: CONTROL ${CONTROL} DID NOT FIRE, section ${want} stayed green (exit 2)`);
  finished = true;
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0
  ? `simGmContracts: PASS, ${SPORTS.length} engines, ${SEEDS.length * SPORTS.length} runs of ${SEASONS} seasons, nobody left on a flip`
  : `simGmContracts: FAIL, ${failures} finding(s)`);
finished = true;
process.exit(failures === 0 ? 0 : 1);
