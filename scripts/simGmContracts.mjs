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
 *     first and the last. The band and the median range are measured.
 *  3. The meter never falls as the offer rises: every case, every contract
 *     length the desk allows, the salary walked from nothing to 130 percent of
 *     the ask in steps of 2 percent.
 *  4. Each league's own rule holds, recomputed here independently of the desk:
 *     NFL  the fifth year option is offered to first round picks this GM
 *          drafted and nobody else, once, and buys exactly one guaranteed year.
 *     NBA  no ask is over the maximum share of the cap; with no room for the
 *          ask the ceiling is the Bird tier's own (120 percent of last salary
 *          for a one season man), and a man over his ceiling cannot be kept at
 *          his ask.
 *     MLB  a drafted man is tendered, not negotiated with, until six seasons;
 *          the qualifying offer is the mean of the 125 highest salaries in the
 *          save, goes to nobody twice, and a rejection pays one pick.
 *     NHL  a drafted man under 27 is restricted; whether a sheet is tabled is
 *          the same on every read; the picks are the published ladder's.
 *  5. The books. Every rule has two sources or says it has one, and each
 *     host's next cap is the cap the engine really sets.
 *
 * Negative controls. Each rewrites one line of src/lib/gmContracts.ts in
 * memory through an esbuild load hook and refuses to run if the line is not
 * there exactly once:
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
 *
 * MEASURED 2026-10-02 on six seed sets (SIM_SEED 0, 100, 200, 300, 400, 500;
 * each is 5 seeds x 10 seasons per sport), every one green, then each control.
 *
 *   0. men the engine's own flip took, no desk      NFL 31-46 of 223-247,
 *      NBA 6-10 of 114-123, MLB 69-81 of 425-431, NHL 1-4 of 192-199.
 *      All four together 114 to 126: floor 40, on the total, because the NHL
 *      count alone (as low as 1) is too small to floor.
 *   1. cases at the desk                             NFL 231-247, NBA 132-145,
 *      MLB 654-666, NHL 246-261 (floors 150, 90, 400, 150). Left without a
 *      decision: 0 on every seed. coinflip: 626 findings.
 *   2. ask as a share of the cap the deal is priced against
 *                 lowest  median        p95          highest
 *      NFL        0.002   0.035-0.039   0.053-0.066  0.073-0.103
 *      NBA        0.026   0.250         0.300-0.309  0.315-0.350 (the rule's max)
 *      MLB        0.002   0.037-0.044   0.070-0.072  0.085-0.099
 *      NHL        0.004   0.042-0.044   0.066-0.070  0.077-0.090
 *      Bands: every ask in every season inside 0.001 to 0.16 (NBA 0.351);
 *      median NFL 0.02-0.06, NBA 0.15-0.32, MLB 0.02-0.07, NHL 0.025-0.07;
 *      p95 at most NFL 0.085, NBA 0.33, MLB 0.09, NHL 0.085. Under askdouble
 *      the p95 measured NFL 0.104-0.131, NBA 0.350, MLB 0.117-0.123, NHL
 *      0.094-0.135 on three seed sets, so the p95 line is what catches it; the
 *      all-season line alone fired by a hair (0.161 against 0.16) and was not
 *      trusted on its own. Season one has no cases in the NBA, MLB and NHL
 *      leagues (every opening deal runs two seasons or more), so the floor
 *      on seasons with cases is 9 of 10 there and 10 of 10 in the NFL.
 *   3. meter steps per sport 44,418 to 219,780; nometer: 7,734 findings.
 *   4. rule coverage, lowest to highest over the sets, and its floor:
 *      NFL options 33-35 (15), later round picks asked about 75-84 (30);
 *      NBA Non-Bird 12-15 (5), Early Bird 8-10 (3), capped by the rule 85-115
 *      (40), ask over the ceiling 12-19 (5); MLB pre arbitration 77-82 (30),
 *      arbitration 144-161 (60), qualifying offers 269-285 (100), picks paid
 *      21-26 (8); NHL restricted 123-137 (60), sheets 66-72 (30), picks paid
 *      37-43 (15). Controls: optionall 66, nobird 8, noarb 198, resheet 94.
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

const CONTROLS = {
  coinflip: {
    from: '    if (STAYS.has(d.kind)) holdMan(man, d, ledger);',
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
    from: "    return drafted && rec?.round === NFL_OPTION_ROUND && !rec.optionUsed ? 'fifth-year-option' : 'veteran';",
    to: "    return drafted && !rec.optionUsed ? 'fifth-year-option' : 'veteran';",
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
  process.exit(1);
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
  process.exit(1);
}
const esbuild = createRequire(path.join(findNodeModules(), 'x.js'))('esbuild');

let controlHits = 0;
const controlPlugin = {
  name: 'gm-contracts-control',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmContracts\.ts$/ }, args => {
      let text = fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
      const c = CONTROLS[CONTROL];
      if (c) {
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
  console.error(`control cannot run: "${CONTROLS[CONTROL].from.trim()}" was found ${controlHits} times in gmContracts.ts, it must be there exactly once`);
  process.exit(1);
}
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
function draftForUser(sport, lg, team, rng, ledger) {
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
  });
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
  if (c.option) { tally(i % 4 === 3 ? 'option declined' : 'option'); return i % 4 === 3 ? desk.letGo(ledger, lg, c) : desk.useOption(ledger, lg, c); }
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

/* The seasons he has played here, re-derived from the ledger by this harness
   rather than read off the desk, so a desk that miscounted would disagree. */
function playedHere(ledger, lg, id) {
  const rec = ledger.men[id];
  if (!rec || rec.how === 'founder' || rec.how === 'trade') return null;
  return lg.season - rec.since + (rec.how === 'draft' ? 0 : 1);
}

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

  /* 4. Each league's rule, recomputed here. */
  const rec = ledger.men[c.man.id];
  const drafted = rec?.how === 'draft';
  const played = playedHere(ledger, lg, c.man.id);
  if (sport.key === 'nfl') {
    const expect = drafted && rec.round === 1 && !rec.optionUsed;
    if (!!c.option !== expect) fail(4, `${tag}: option ${c.option ? 'offered' : 'missing'} for a round ${rec?.round ?? '-'} ${rec?.how} man`);
    if (c.option) { st.rule.options = (st.rule.options ?? 0) + 1; if (c.option.years !== 1) fail(4, `${tag}: the option buys ${c.option.years} years`); }
    if (drafted && rec.round !== 1) st.rule.laterRoundsAsked = (st.rule.laterRoundsAsked ?? 0) + 1;
  }
  if (sport.key === 'nba') {
    const service = drafted ? lg.season - rec.since : Number.POSITIVE_INFINITY;
    const max = r1(rules.nbaMaxShare(service) * cap);
    if (c.ask.salary > max + 0.05) fail(4, `${tag}: asks ${c.ask.salary} over the maximum ${max}`);
    const club = lg.teams[team];
    const room = cap - club.players.reduce((a, p) => a + (p.id === c.man.id ? 0 : p.salary), 0);
    const floor = host.minSalary(lg);
    const tier = played == null || played >= 3 ? 'full' : played === 2 ? 'early' : played === 1 ? 'non' : 'none';
    st.rule[`tier ${tier}`] = (st.rule[`tier ${tier}`] ?? 0) + 1;
    if (c.ask.salary > room) {
      const all = Object.values(lg.teams).flatMap(t => t.players);
      const avg = all.reduce((a, p) => a + p.salary, 0) / all.length;
      const limit = tier === 'full' ? max : tier === 'early' ? Math.min(max, Math.max(c.man.salary * 1.75, avg * 1.05))
        : tier === 'non' ? Math.min(max, c.man.salary * 1.2) : 0;
      const want = r1(Math.max(limit, room, floor));
      st.rule.capped = (st.rule.capped ?? 0) + 1;
      if (c.ceiling == null || Math.abs(c.ceiling - want) > 0.051) fail(4, `${tag}: ${tier} Bird ceiling ${c.ceiling} where the rule gives ${want}`);
      if (c.ask.salary > (c.ceiling ?? Infinity)) {
        st.rule.overCeiling = (st.rule.overCeiling ?? 0) + 1;
        if (desk.keepAtAsk(structuredClone(ledger), lg, c).ok) fail(4, `${tag}: kept at an ask over his ceiling`);
      }
    } else if (c.ceiling != null) fail(4, `${tag}: a ceiling with room for his ask`);
  }
  if (sport.key === 'mlb') {
    const expect = !drafted || played == null ? 'free-agent' : played < 3 ? 'pre-arbitration' : played < 6 ? 'arbitration' : 'free-agent';
    if (c.cls !== expect) fail(4, `${tag}: reads ${c.cls}, service ${played} says ${expect}`);
    st.rule[expect] = (st.rule[expect] ?? 0) + 1;
    if (!!c.tender !== (expect !== 'free-agent')) fail(4, `${tag}: tender ${c.tender ? 'offered' : 'missing'} for ${expect}`);
    if (c.tender && c.canNegotiate) fail(4, `${tag}: a controlled man is open to negotiation`);
    if (c.qualifying) {
      st.rule.qualifyingOffers = (st.rule.qualifyingOffers ?? 0) + 1;
      const top = Object.values(lg.teams).flatMap(t => t.players.map(p => p.salary)).sort((a, b) => b - a).slice(0, 125);
      const mean = r1(top.reduce((a, n) => a + n, 0) / top.length);
      if (Math.abs(c.qualifying.salary - mean) > 0.051) fail(4, `${tag}: qualifying offer ${c.qualifying.salary}, the top 125 mean is ${mean}`);
      if (st.qualified.has(c.man.id)) fail(4, `${tag}: offered a second qualifying offer`);
      if (rec?.mid) fail(4, `${tag}: qualifying offer to a mid season arrival`);
    }
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
        const want = rules.offerSheetPicks(sheet.salary, cap).filter(r => r <= 2);
        if (JSON.stringify(want) !== JSON.stringify(sheet.picks)) fail(4, `${tag}: sheet picks ${sheet.picks} where the ladder pays ${want}`);
        if (c.canNegotiate) fail(4, `${tag}: open to negotiation with a sheet on the table`);
      }
    }
  }
}

/** 0. The engine on its own: how many of the GM's expiring men leave on its flip. */
function baselineRun(sport, seed, st) {
  const rng = stream(seed);
  Math.random = rng;
  const lg = sport.init(rng);
  const team = pickTeam(lg, seed);
  const size = lg.teams[team].players.length;
  for (let s = 0; s < SEASONS; s++) {
    draftForUser(sport, lg, team, rng, null);
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
  for (let s = 0; s < SEASONS; s++) {
    desk.noteRoster(ledger, lg, true);
    const cases = desk.deskCases(host, lg, ledger);
    for (const c of cases) checkCase(sport, lg, ledger, team, c, st, s);
    cases.forEach((c, i) => {
      const made = decide(lg, ledger, c, i, st.paths);
      if (made && made.ok === false) fail(1, `${sport.key} ${lg.season} ${c.man.name}: the policy's decision was refused: ${made.reason}`);
      if (c.qualifying && desk.decisionFor(ledger, lg.season, c.man.id)?.kind.startsWith('qualify')) st.qualified.add(c.man.id);
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

    draftForUser(sport, lg, team, rng, ledger);
    const capWant = host.nextCap(lg);
    const run = desk.runDeskOffseason(host, lg, ledger, rng);
    if (!run.ok) { fail(1, `${sport.key} ${lg.season}: the desk refused to run with every decision made (${run.undecided.map(u => u.name)})`); break; }
    if (lg.cap !== capWant) fail(5, `${sport.key}: the host said next season's cap is ${capWant}, the engine set ${lg.cap}`);

    /* 1. Every applied decision, against what the roster says now. */
    const retired = sport.retiredNames(run.engine, team);
    const here = new Map(lg.teams[team].players.map(p => [p.id, p]));
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
        }
      } else if (p) fail(1, `${sport.key} ${d.season} ${d.name}: let go (${d.kind}) but still on the roster`);
      else st.letGo += 1;
    }
    for (const c of cases) if (!run.applied.some(d => d.id === c.man.id)) fail(1, `${sport.key} ${c.man.name}: expiring but no decision was applied`);
    st.picksAdded += run.picksAdded.length;
    if (lg.teams[team].picks.length !== basePicks + run.picksAdded.length) {
      fail(4, `${sport.key} ${lg.season}: ${run.picksAdded.length} picks owed, the club holds ${lg.teams[team].picks.length} against a base of ${basePicks}`);
    }
    if (sport.key === 'nba') signFromPool(lg, team, s);
    trimRoster(lg, team, size);
  }
}

const newStats = () => ({
  baseUp: 0, baseLeft: 0, cases: 0, kept: 0, letGo: 0, retiredKept: 0, leftUndecided: 0, picksAdded: 0,
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
  console.log(`  1) desk: ${st.cases} cases, ${st.kept} kept on their agreed terms, ${st.letGo} let go, ${st.retiredKept} kept then retired by the engine, ${st.leftUndecided} left without a decision`);
  const seasons = st.bySeason.map((xs, i) => [i, xs]).filter(([, xs]) => xs && xs.length);
  const seasonMins = seasons.map(([, xs]) => quant(xs, 0));
  const seasonMaxs = seasons.map(([, xs]) => quant(xs, 1));
  console.log(`  2) ask / cap: p05 ${f3(quant(st.shares, 0.05))}, median ${f3(quant(st.shares, 0.5))}, p95 ${f3(quant(st.shares, 0.95))}; lowest in any season ${f3(Math.min(...seasonMins))}, highest ${f3(Math.max(...seasonMaxs))}; seasons with cases ${seasons.length} of ${SEASONS} (empty: ${[...Array(SEASONS).keys()].filter(i => !(st.bySeason[i] && st.bySeason[i].length)).join(' ') || 'none'})`);
  console.log(`  3) meter steps walked: ${st.meterSteps}`);
  console.log(`  4) rule counts: ${Object.entries(st.rule).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}; picks owed and paid ${st.picksAdded}`);
  console.log(`     doors: ${Object.entries(st.paths).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

/* ---------- 5. the books ---------- */
for (const r of rules.CONTRACT_RULES) {
  if (r.sources.length < (r.singleSource ? 1 : 2)) fail(5, `${r.id} has ${r.sources.length} source(s) and is not marked single source`);
  for (const s of r.sources) if (!/^https:\/\/[^\s]+$/.test(s.url) || !s.says) fail(5, `${r.id}: a source with no URL or nothing it says`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(rules.CONTRACT_RULES_AS_OF)) fail(5, 'CONTRACT_RULES_AS_OF is not a date');
console.log(`\n5) ${rules.CONTRACT_RULES.length} rules on the books, ${rules.CONTRACT_RULES.filter(r => r.singleSource).length} marked as resting partly on one source`);

/* ---------- the bands, from MEASURED in the header ---------- */
const BANDS = {
  /* ask / cap: every ask in every season inside [floor, ceiling]; the median inside [medLo, medHi]. */
  nfl: { floor: 0.001, ceiling: 0.16, medLo: 0.02, medHi: 0.06, p95Hi: 0.085, cases: 150, seasons: 10 },
  nba: { floor: 0.001, ceiling: 0.351, medLo: 0.15, medHi: 0.32, p95Hi: 0.33, cases: 90, seasons: 9 },
  mlb: { floor: 0.001, ceiling: 0.16, medLo: 0.02, medHi: 0.07, p95Hi: 0.09, cases: 400, seasons: 9 },
  nhl: { floor: 0.001, ceiling: 0.16, medLo: 0.025, medHi: 0.07, p95Hi: 0.085, cases: 150, seasons: 9 },
};
/* Section 4 coverage floors, each well under its measured range, so a rule cannot pass empty. */
const RULE_FLOORS = {
  nfl: { options: 15, laterRoundsAsked: 30 },
  nba: { 'tier non': 5, 'tier early': 3, capped: 40, overCeiling: 5 },
  mlb: { 'pre-arbitration': 30, arbitration: 60, qualifyingOffers: 100 },
  nhl: { restricted: 60, sheets: 30 },
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
  st.bySeason.forEach((xs, s) => {
    for (const x of xs ?? []) {
      if (x < b.floor || x > b.ceiling) { fail(2, `${sport.key} season ${s + 1}: an ask at ${x.toFixed(3)} of the cap, outside ${b.floor} to ${b.ceiling}`); break; }
    }
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
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0
  ? `simGmContracts: PASS, ${SPORTS.length} engines, ${SEEDS.length * SPORTS.length} runs of ${SEASONS} seasons, nobody left on a flip`
  : `simGmContracts: FAIL, ${failures} finding(s)`);
process.exit(failures === 0 ? 0 : 1);
