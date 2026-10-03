/* Round 987: the NHL Front Office on the GM desk (src/lib/nhlGmDesk.ts).
 *
 * The first bind of the four shared GM modules to a real engine. This
 * harness drives the NHL engine and the desk exactly the way the board
 * calls them (NhlFrontOfficeBoard.tsx), with seeded draws, and checks:
 *   1  a save from before the desk plays to the identical league, season
 *      after season, as the engine did before this round (a fixture recorded
 *      from the pre-round engine), and opening the desk changes nothing in
 *      the league it opens on
 *   2  over ten seeded seasons, every user man whose deal runs out has a
 *      recorded decision, and what happened to him is what it says: a kept
 *      man is still here (or retired), a man let go is gone
 *   3  no trade lands after the deadline, and deals do land before it
 *   4  picks are conserved league wide: every club's pick in every round of
 *      every year carried exists exactly once, after every deal and summer,
 *      and every engine list is the ledger's
 *   5  the staff's effects change their consumer at every level step: the
 *      win probability, the scouting miss, the rounds an injury costs
 *   6  migration keeps every marker, a corrupt block resets alone, retained
 *      salary stays at its full figure while the deal runs and the limits hold
 *   7  every desk panel draws (server rendered), and the re-sign desk draws a
 *      tile for every expiring man
 * Negative controls (SIM_NHL_GM_DESK_CONTROL), each must go red in its check:
 *   coinflip   the summer runs the engine's own offseason, coin flip and all  (2)
 *   latetrade  the package clock never moves, so deals pass the deadline     (3)
 *   droppick   a pick sent in a package is dropped from the ledger           (4)
 *   flatstaff  the staff edge is always nothing                             (5)
 *   nodefault  the engine's win probability reads an edge by default        (1)
 * Recording the fixture: SIM_NHL_GM_DESK_RECORD=<git ref of the engine before
 * this round> rewrites scripts/data/nhlGmDeskFixture.json from that engine.
 *
 * MEASURED 2026-10-03 on three seed sets of ten (1..10, 11..20, 21..30),
 * ten seasons a seed, totals per set:
 *   expiring men decided   386 / 360 / 371   (by the GM 212 / 205 / 213, by the staff's rule 174 / 155 / 158)
 *   deals before deadline  527 / 520 / 506   tries after it 400 each, landed 0
 *   deals moving a pick    490 / 486 / 463   with salary retained 67 / 58 / 62
 *   staff ladder (fixed)   edge 0 to 2.40 strength, win .566 to .660, scouting miss 2.23 to 0.57,
 *                          a three round injury 3.00 to 2.25 rounds
 * Every floor in T sits near 70 percent of the lowest set. Every control was
 * run and fired in its own check: coinflip 23 failures in 2, latetrade 400 in
 * 3, droppick in 4, flatstaff 9 in 5, nodefault in 1 (and 5, whose level 1
 * line compares against the default).
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const J = v => JSON.stringify(v);
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nhlGmDeskFixture.json');

const CONTROL = process.env.SIM_NHL_GM_DESK_CONTROL || '';
const RECORD = process.env.SIM_NHL_GM_DESK_RECORD || '';
const CONTROLS = { coinflip: '2', latetrade: '3', droppick: '4', flatstaff: '5', nodefault: '1' };
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_NHL_GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const SEEDS = (process.env.SIM_NHL_GM_DESK_SEEDS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SEASONS = 10;

/* Floors: the measured size of each walk, see MEASURED in the header. */
const T = { minDecisions: 250, minGm: 140, minAuto: 100, minEarlyDeals: 350, minLateTries: 300, minRetained: 40, minPickMoves: 320 };

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
const NM = modulesDir();

let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 8) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  desk: path.join(ROOT, 'src', 'lib', 'nhlGmDesk.ts'),
  engine: path.join(ROOT, 'src', 'lib', 'nhlFrontOffice.ts'),
};
const EDITS = {
  coinflip: ['desk', '  const run = runDeskOffseason(nhlContractHost, league, ledger, rng);',
    '  const run = { ok: true as const, engine: nhlContractHost.runOffseason(league, rng, team), applied: [] as GmDecision[], picksAdded: [] as number[] };'],
  latetrade: ['desk', 'periodsPlayed: Math.max(0, league.round - 1), seasonClosed: false },', 'periodsPlayed: 0, seasonClosed: false },'],
  droppick: ['desk', '  let next = withGmBlock(desk, NHL_DESK_KEYS.picks, out.ledger);',
    '  let next = withGmBlock(desk, NHL_DESK_KEYS.picks, { v: 1, picks: out.ledger.picks.filter(p => !pkg.give.some(a => a.kind === \'pick\' && a.key === pickKey(p))) });'],
  flatstaff: ['desk', "  const e = (key: string) => gmStaffEffect(NHL_STAFF_PACK, block, key);", "  const e = (key: string) => 0 * gmStaffEffect(NHL_STAFF_PACK, block, key);"],
  nodefault: ['engine', 'export function nhlWinProb(a: NhlGmTeam, b: NhlGmTeam, edgeA = 0, edgeB = 0): number {',
    'export function nhlWinProb(a: NhlGmTeam, b: NhlGmTeam, edgeA = 0.01, edgeB = 0): number {'],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_NHL_GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the line ${CONTROL} rewrites is there more than once`); process.exit(2); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red`);
}
if (RECORD) {
  const old = execFileSync('git', ['show', `${RECORD}:src/lib/nhlFrontOffice.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  overrides.set(path.resolve(FILES.engine).toLowerCase(), old);
  console.log(`RECORDING the fixture from the engine at ${RECORD}`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simNhlGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as E from '${ROOT_URL}/src/lib/nhlFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nhlGmDesk.ts';
export * as C from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export * as G from '${ROOT_URL}/src/lib/gmDesk.ts';
export { NHL_STAFF_PACK } from '${ROOT_URL}/src/data/gmStaff/packs.ts';
export { nhlContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNhl.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { NHL_OPENING_RATINGS } from '${ROOT_URL}/src/data/nhlOpeningRatings.ts';
export { NHL_DESK_PANELS, NHL_RECAP_PANELS } from '${ROOT_URL}/src/components/nhl-front-office/NhlGmDesk.tsx';
export { GmDeskMount } from '${ROOT_URL}/src/components/front-office-shared/GmDeskMount.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (C, p) => renderToStaticMarkup(React.createElement(C, p));
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE, logLevel: 'error',
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
/* Production is off limits: refuse to run a bundle that carries the database client. */
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}`); process.exit(2); }
  }
}
const M = createRequire(import.meta.url)(BUNDLE);
const { E, D, C, P, S, G, NHL_STAFF_PACK, nhlContractHost: HOST, leagueNames, NHL_OPENING_RATINGS } = M;

/* ---- seeded draws and the board's own call order ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Ids carry a per process epoch; the fixture compares the league with it taken out. */
const leagueHash = lg => crypto.createHash('sha1').update(J(lg).replace(/"h[0-9a-z]+-(\d+)"/g, '"h-$1"')).digest('hex');
const TEAM = 'TOR';

/** Draft night as the board runs it: the user takes the best grade he sees, the CPU clubs go in batches. */
function draftNight(lg, team, rng, desk) {
  const mine = lg.teams[team];
  let count = E.nhlDraftCapital(mine) ?? 0;
  let cls = E.nhlDraftClass(rng, Math.max(24, count + 10), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.nhlStaffOf(desk, lg, team).block, 'scouting') : 1;
  const grade = pr => (desk ? D.nhlScoutRead(pr, team, lg.season, level) : pr.grade);
  let left = 2;
  let picksLeft = count;
  const aiBatch = () => {
    const order = E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    cls = E.nhlAiDraftPicks(lg, cls, order, rng).remaining;
    left -= 1;
  };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a))[0];
    const round = mine.picks[0];
    if (!E.nhlConsumeDraftPick(mine)) break;
    const p = E.nhlProspectToPlayer(pr, rng, lg.ratingModelVersion);
    mine.players.push(p);
    if (desk) desk = D.nhlNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    const batches = nextPicks === 0 ? left : Math.min(1, left);
    for (let i = 0; i < batches; i++) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
  return desk;
}

/** A season with the desk off: the exact calls the board makes on a save from before the desk. */
function seasonOff(lg, team, rng) {
  for (;;) {
    E.simNhlRound(lg, team, rng);
    E.nhlAiMoves(lg, team, rng);
    if (lg.round >= E.NHL_FO_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runNhlFoPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  draftNight(lg, team, rng, null);
  E.nhlOffseason(lg, rng, team);
}

/* ================================================================== */
begin('1', 'a save from before the desk plays exactly as the engine did before this round');
/* First, before anything else mints an id, so the recorder and the replay
   walk the same id stream. */
const ID_SEEDS = [11, 22, 33];
const ID_SEASONS = 3;
const played = {};
for (const seed of ID_SEEDS) {
  const rng = mulberry32(seed);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  played[seed] = [];
  for (let s = 0; s < ID_SEASONS; s++) { seasonOff(lg, TEAM, rng); played[seed].push(leagueHash(lg)); }
}
if (RECORD) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, `${J({ recordedFrom: RECORD, team: TEAM, seasons: ID_SEASONS, hashes: played }, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, FIXTURE)} from ${RECORD}: ${ID_SEEDS.length} seeds x ${ID_SEASONS} seasons`);
  process.exit(0);
}
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
let idCompared = 0;
for (const seed of ID_SEEDS) {
  for (let s = 0; s < ID_SEASONS; s++) {
    idCompared++;
    if (fixture.hashes?.[seed]?.[s] !== played[seed][s]) fail(`seed ${seed} season ${s + 1}: the league is not the one the engine before this round played (${played[seed][s].slice(0, 10)} vs ${String(fixture.hashes?.[seed]?.[s]).slice(0, 10)})`);
  }
}
{
  /* Opening the desk reads the league and never changes it. */
  const rng = mulberry32(44);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  for (let r = 0; r < 7; r++) { E.simNhlRound(lg, TEAM, rng); E.nhlAiMoves(lg, TEAM, rng); lg.round += 1; }
  const before = J(lg);
  const desk = D.openNhlDesk(lg, TEAM);
  if (J(lg) !== before) fail('openNhlDesk changed the league it opened on');
  if (!desk || desk.v !== 1 || !['contracts', 'picks', 'staff', 'retained'].every(k => k in desk.blocks)) fail(`the opened desk is missing a block: ${J(Object.keys(desk?.blocks ?? {}))}`);
}
console.log(`   ${idCompared} seasons replayed against ${fixture.recordedFrom}`);

/* ================================================================== */
/* Sections 2, 3 and 4 share one walk: ten seasons a seed with the desk on. */
const stats = {
  decisions: 0, gm: 0, auto: 0, earlyDeals: 0, lateTries: 0, lateDeals: 0, retained: 0, pickMoves: 0,
  pickChecks: 0, applyChecks: 0, buyers: 0, sellers: 0,
};
const problems = { s2: [], s3: [], s4: [] };
const ids = lg => Object.keys(lg.teams);
const rules = () => D.nhlGamePickRules();

/** Every club's pick in every round of every year carried exists exactly once, and every engine list is the ledger's. */
function checkPicks(lg, desk, where) {
  stats.pickChecks++;
  /* The block as stored, not as read: a reader that fails closed would hand
     back a fresh ledger and hide the very loss this check is for. */
  const ledger = desk.blocks[D.NHL_DESK_KEYS.picks];
  if (!P.validateLedger(ledger, ids(lg), rules())) { problems.s4.push(`${where}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids(lg), lg.season, rules())) problems.s4.push(`${where}: ${p}`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    const list = [...t.picks].sort((a, b) => a - b);
    if (J(held) !== J(list)) problems.s4.push(`${where}: ${abbr} engine list ${J(list)} but the ledger says ${J(held)}`);
  }
}

const byValue = arr => [...arr].sort((a, b) => E.nhlTradeValue(a) - E.nhlTradeValue(b) || a.id.localeCompare(b.id));

/** One package a round, before the round is played, the way a GM on the hub would: alternately a man and a
    second rounder for their man, and two men for their man and their second rounder. Round 3 keeps half a salary. */
function tryDeal(lg, team, desk, s, where) {
  const r = lg.round;
  const others = ids(lg).filter(k => k !== team).sort();
  const partner = others[(s * 7 + r * 3) % others.length];
  const me = lg.teams[team], them = lg.teams[partner];
  const ledger = D.nhlPicksOf(desk, lg);
  const myPick = P.picksHeldBy(ledger, team).filter(p => p.round === 2).pop();
  const theirPick = P.picksHeldBy(ledger, partner).filter(p => p.round === 2).pop();
  const pkg = r % 2 === 1
    ? { from: team, to: partner, give: [{ kind: 'player', id: byValue(me.players)[0].id }, ...(myPick ? [{ kind: 'pick', key: P.pickKey(myPick) }] : [])], get: [{ kind: 'player', id: byValue(them.players)[0].id }] }
    : { from: team, to: partner, give: byValue(me.players).slice(0, 2).map(p => ({ kind: 'player', id: p.id })), get: [{ kind: 'player', id: byValue(them.players)[0].id }, ...(theirPick ? [{ kind: 'pick', key: P.pickKey(theirPick) }] : [])] };
  if (r === 3) pkg.give[0] = { ...pkg.give[0], retain: 0.5 };
  const open = D.nhlTradeWindow(lg).open;
  const res = D.nhlProposePackage(lg, desk, team, pkg);
  const yes = res.verdict.verdict === 'accepted';
  if (!open) {
    stats.lateTries++;
    if (yes) { stats.lateDeals++; problems.s3.push(`${where} round ${r}: a deal landed after the deadline (round ${D.nhlTradeWindow(lg).deadlineAfter})`); }
    else if (res.verdict.step !== 1) problems.s3.push(`${where} round ${r}: refused after the deadline, but by step ${res.verdict.step} (${res.verdict.reason}), not the deadline`);
  }
  if (!yes) return desk;
  if (open) stats.earlyDeals++;
  if (pkg.give.some(a => a.retain)) stats.retained++;
  if ([...pkg.give, ...pkg.get].some(a => a.kind === 'pick')) stats.pickMoves++;
  checkPicks(lg, res.desk, `${where} round ${r} deal`);
  return res.desk;
}

/** The GM takes every other case himself, and leaves the rest open for the staff's rule. */
function gmDecides(lg, team, desk) {
  const ledger = D.deskCopy(D.nhlContractsOf(desk, lg, team));
  C.deskCases(HOST, lg, ledger).forEach((c, i) => {
    if (i % 2 === 1) return;
    let made;
    if (c.restricted) made = c.restricted.sheet ? C.matchSheet(ledger, lg, c) : C.tenderHim(ledger, lg, c);
    else if (c.man.ovr >= 76) { made = C.keepAtAsk(ledger, lg, c); if (!made.ok) made = C.letGo(ledger, lg, c); }
    else made = C.letGo(ledger, lg, c);
  });
  return G.withGmBlock(desk, D.NHL_DESK_KEYS.contracts, ledger);
}

const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

/** A season with the desk on, in the board's order, and the summer through the desk. */
function seasonDesk(lg, team, desk, rng, s, where) {
  for (;;) {
    desk = tryDeal(lg, team, desk, s, where);
    E.simNhlRound(lg, team, rng, D.nhlDeskRoundOptions(desk, lg, team));
    E.nhlAiMoves(lg, team, rng);
    desk = D.nhlDeskAfterRound(desk, lg, team).desk;
    if (lg.round === D.nhlTradeWindow(lg).deadlineAfter) {
      const st = Object.values(D.nhlStances(lg));
      stats.buyers += st.filter(x => x === 'buyer').length;
      stats.sellers += st.filter(x => x === 'seller').length;
    }
    if (lg.round >= E.NHL_FO_ROUNDS) break;
    lg.round += 1;
  }
  const po = E.runNhlFoPlayoffs(lg, rng, D.nhlDeskEdges(desk, lg, team));
  lg.champions.push({ season: lg.season, team: po.champion });
  desk = draftNight(lg, team, rng, desk);
  desk = gmDecides(lg, team, desk);
  const closed = lg.season;
  const up = C.expiringMen(HOST, lg, team).map(m => ({ id: m.id, name: m.name }));
  const summer = D.nhlDeskOffseason(lg, desk, team, rng);
  if (!summer.ok) { problems.s2.push(`${where}: the desk summer refused to run (${summer.lines.join(' ')})`); return desk; }
  desk = summer.desk;
  const ledger = D.nhlContractsOf(desk, lg, team);
  const roster = new Set(lg.teams[team].players.map(p => p.id));
  for (const m of up) {
    stats.applyChecks++;
    const d = ledger.decisions.find(x => x.season === closed && x.id === m.id);
    if (!d) { problems.s2.push(`${where}: ${m.name}'s deal ran out with no recorded decision`); continue; }
    stats.decisions++;
    if (d.via === 'gm') stats.gm++; else stats.auto++;
    const retired = summer.notes.some(n => n.includes(`${m.name} retires`));
    if (STAYS.has(d.kind) && !roster.has(m.id) && !retired) problems.s2.push(`${where}: ${m.name} was kept (${d.kind}) but is not on the roster`);
    if (!STAYS.has(d.kind) && roster.has(m.id)) problems.s2.push(`${where}: ${m.name} was let go (${d.kind}) but is still on the roster`);
  }
  /* The board will not play a roster over the limit (Round 968): the GM waives the weakest. */
  const mine = lg.teams[team];
  while (mine.players.length > E.NHL_ROSTER_MAX) {
    const down = byValue(mine.players)[0];
    if (!E.nhlRelease(mine, lg.freeAgents, down.id, lg.ratingModelVersion)) break;
  }
  checkPicks(lg, desk, `${where} summer`);
  return desk;
}

for (const seed of SEEDS) {
  const rng = mulberry32(1000 + seed);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  let desk = D.openNhlDesk(lg, TEAM);
  checkPicks(lg, desk, `seed ${seed} open`);
  for (let s = 0; s < SEASONS; s++) desk = seasonDesk(lg, TEAM, desk, rng, s, `seed ${seed} season ${s + 1}`);
}

begin('2', 'over ten seasons a seed, no expiring man of yours leaves without a recorded decision, applied as written');
for (const p of problems.s2) fail(p);
if (stats.decisions < T.minDecisions) fail(`only ${stats.decisions} decisions over the walk, floor ${T.minDecisions}`);
if (stats.gm < T.minGm) fail(`only ${stats.gm} decisions by the GM, floor ${T.minGm}`);
if (stats.auto < T.minAuto) fail(`only ${stats.auto} settled by the staff's rule, floor ${T.minAuto}`);
console.log(`   ${stats.applyChecks} expiring men: ${stats.gm} decided by the GM, ${stats.auto} by the staff's rule`);

begin('3', 'no trade lands after the deadline, and deals do land before it');
for (const p of problems.s3) fail(p);
if (stats.earlyDeals < T.minEarlyDeals) fail(`only ${stats.earlyDeals} deals before the deadline, floor ${T.minEarlyDeals}`);
if (stats.lateTries < T.minLateTries) fail(`only ${stats.lateTries} tries after the deadline, floor ${T.minLateTries}`);
if (!(stats.buyers > 0 && stats.sellers > 0)) fail(`the deadline split nobody: ${stats.buyers} buyers, ${stats.sellers} sellers`);
console.log(`   ${stats.earlyDeals} deals before the deadline, ${stats.lateTries} tries after it, ${stats.lateDeals} landed; ${stats.buyers} buyer and ${stats.sellers} seller places at the deadline`);

begin('4', 'picks are conserved league wide after every deal and every summer');
for (const p of problems.s4) fail(p);
if (stats.pickMoves < T.minPickMoves) fail(`only ${stats.pickMoves} deals moved a pick, floor ${T.minPickMoves}`);
if (stats.retained < T.minRetained) fail(`only ${stats.retained} deals kept part of a salary, floor ${T.minRetained}`);
console.log(`   ${stats.pickChecks} ledger checks, ${stats.pickMoves} deals with a pick in them, ${stats.retained} with salary retained`);

/* ================================================================== */
begin('5', "the staff's effects change their consumer at every level step");
const L5 = E.initNhlLeague(mulberry32(5), NHL_OPENING_RATINGS);
const base = S.gmDefaultStaff(NHL_STAFF_PACK.rules, D.nhlStaffCtx(L5, TEAM));
const atLevel = level => {
  const block = { ...base };
  for (const post of NHL_STAFF_PACK.posts) block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
  return block;
};
const rival = L5.teams.BOS, mine5 = L5.teams[TEAM];
const ladder = [];
for (let level = 1; level <= 10; level++) {
  const block = atLevel(level);
  const desk = G.withGmBlock(D.openNhlDesk(L5, TEAM), D.NHL_DESK_KEYS.staff, { block, purse: 8 });
  const opts = D.nhlDeskRoundOptions(desk, L5, TEAM);
  const win = E.nhlWinProb(mine5, rival, opts.edges[TEAM], 0);
  let miss = 0, out = 0;
  const scoutLevel = S.gmStaffLevel(block, 'scouting');
  for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); miss += Math.abs(D.nhlScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, scoutLevel) - t); }
  for (let i = 0; i < 4000; i++) out += opts.injuryRounds(TEAM, { id: `i${i}` }, 3);
  ladder.push({ level, edge: opts.edges[TEAM], win, miss: miss / 3000, out: out / 4000 });
}
if (Math.abs(ladder[0].win - E.nhlWinProb(mine5, rival)) > 1e-12) fail(`a level 1 staff moves the game: ${ladder[0].win} against ${E.nhlWinProb(mine5, rival)} with no desk`);
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  if (!(b.win > a.win)) fail(`level ${a.level} to ${b.level}: the win probability did not rise (${a.win.toFixed(4)} to ${b.win.toFixed(4)})`);
  if (!(b.miss < a.miss)) fail(`level ${a.level} to ${b.level}: the scouting miss did not shrink (${a.miss.toFixed(3)} to ${b.miss.toFixed(3)})`);
  if (!(b.out < a.out)) fail(`level ${a.level} to ${b.level}: an injury did not get shorter (${a.out.toFixed(3)} to ${b.out.toFixed(3)})`);
}
{
  /* The other clubs never feel the user's staff. */
  const opts = D.nhlDeskRoundOptions(G.withGmBlock(D.openNhlDesk(L5, TEAM), D.NHL_DESK_KEYS.staff, { block: atLevel(10), purse: 8 }), L5, TEAM);
  if (Object.keys(opts.edges).join() !== TEAM) fail(`the desk hands an edge to ${J(Object.keys(opts.edges))}`);
  if (opts.injuryRounds('BOS', { id: 'x' }, 3) !== 3) fail('the user trainer shortened a rival injury');
}
console.log(`   edge ${ladder[0].edge.toFixed(2)} to ${ladder[9].edge.toFixed(2)}, win ${ladder[0].win.toFixed(3)} to ${ladder[9].win.toFixed(3)}, miss ${ladder[0].miss.toFixed(2)} to ${ladder[9].miss.toFixed(2)}, rounds out ${ladder[0].out.toFixed(2)} to ${ladder[9].out.toFixed(2)}`);

/* ================================================================== */
begin('6', 'migration keeps every marker, a corrupt block resets alone, retained salary holds its figure and its limits');
{
  const lg = E.initNhlLeague(mulberry32(6), NHL_OPENING_RATINGS);
  lg.teams.BOS.picks = [1]; lg.teams.MTL.picks = [1, 2, 2]; lg.teams.CHI.picks = [];
  const desk = D.openNhlDesk(lg, TEAM);
  const ledger = D.nhlPicksOf(desk, lg);
  let markers = 0;
  for (const [abbr, t] of Object.entries(lg.teams)) {
    markers += t.picks.length;
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`migration: ${abbr} held ${J(t.picks)} and the ledger gives it ${J(held)}`);
  }
  if (P.picksHeldBy(ledger, TEAM).length === 0 || markers !== ledger.picks.filter(p => p.year === lg.season).length) fail(`migration: ${markers} markers on the old lists, ${ledger.picks.filter(p => p.year === lg.season).length} picks this year in the ledger`);
  const broken = G.withGmBlock(desk, D.NHL_DESK_KEYS.picks, { v: 7 });
  if (D.nhlContractsOf(broken, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt picks block took the contracts block with it');
  if (D.nhlStaffOf(broken, lg, TEAM) !== desk.blocks.staff) fail('a corrupt picks block took the staff block with it');
  if (!P.validateLedger(D.nhlPicksOf(broken, lg), Object.keys(lg.teams), D.nhlGamePickRules())) fail('a corrupt picks block did not come back as a sound fresh one');

  /* Retained salary: half of a man's salary stays on the club that sent him, at full figure while his deal runs. */
  let d = desk;
  const deal = (give, retain) => {
    const partner = ['BUF', 'DET', 'FLA', 'OTT'][d.blocks.retained.length % 4];
    const them = lg.teams[partner];
    return D.nhlProposePackage(lg, d, TEAM, { from: TEAM, to: partner, give: [{ kind: 'player', id: give.id, retain }], get: [{ kind: 'player', id: byValue(them.players)[0].id }] });
  };
  const sendable = () => [...lg.teams[TEAM].players].filter(p => p.years >= 2).sort((a, b) => E.nhlTradeValue(b) - E.nhlTradeValue(a));
  const over = deal(sendable()[0], 0.6);
  if (over.verdict.verdict !== 'invalid' || over.verdict.step !== 3) fail(`retaining 60 percent was not refused by the league's rule: ${J(over.verdict)}`);
  const first = sendable()[0];
  const salary = first.salary;
  const res1 = deal(first, 0.5);
  if (res1.verdict.verdict !== 'accepted') fail(`a star for a fourth liner with half retained was refused: ${J(res1.verdict)}`);
  else {
    d = res1.desk;
    const kept = Math.round(salary * 0.5 * 10) / 10;
    const entry = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!entry || entry.amount !== kept) fail(`the sending club carries ${J(entry)} for ${first.name}, wanted ${kept}`);
    const moved = Object.values(lg.teams).flatMap(t => t.players).find(p => p.id === first.id);
    if (!moved || Math.abs(moved.salary - (salary - kept)) > 0.051) fail(`${first.name} costs his new club ${moved?.salary}, wanted ${salary - kept}`);
    for (let i = 0; i < 2; i++) { const r = deal(sendable()[0], 0.5); if (r.verdict.verdict === 'accepted') d = r.desk; else fail(`retained deal ${i + 2} of 3 refused: ${r.verdict.reason}`); }
    const fourth = deal(sendable()[0], 0.5);
    if (fourth.verdict.verdict !== 'invalid' || !String(fourth.verdict.reason).includes('retained contracts')) fail(`a fourth retained deal was not refused by the three deal limit: ${J(fourth.verdict)}`);
    const yearsLeft = moved ? moved.years : 0;
    const summer = D.nhlDeskOffseason(lg, d, TEAM, mulberry32(66));
    const after = (lg.teams[TEAM].deadCap ?? []).find(x => x.playerId === first.id);
    if (!summer.ok) fail('the desk summer refused to run in the retention walk');
    else if (yearsLeft >= 2 && (!after || after.amount !== kept)) fail(`after a summer the retained line reads ${J(after)}, wanted ${kept} again`);
    else if (yearsLeft < 2 && after) fail(`a retained line outlived the deal it was on: ${J(after)}`);
  }
}

/* ================================================================== */
begin('7', 'every desk panel draws, and the re-sign desk shows a tile for every expiring man');
{
  const { NHL_DESK_PANELS, NHL_RECAP_PANELS, GmDeskMount, render } = M;
  const rng = mulberry32(77);
  const lg = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  let desk = D.openNhlDesk(lg, TEAM);
  /* One season on, so somebody's deal is running out. */
  desk = seasonDesk(lg, TEAM, desk, rng, 0, 'render walk');
  const facts = { teamId: TEAM, teamLabel: TEAM, seasonsPlayed: 1, phase: 'hub', hub: {}, league: lg, seasonOver: false, clubName: x => x, say: () => {}, commit: () => {} };
  const props = { sport: { key: 'nhl' }, desk, facts, onDesk: () => {}, onBack: () => {} };
  const marks = { staff: 'data-nhl-desk-staff', contracts: 'data-resign-desk', picks: 'data-gm-picks', deals: 'data-nhl-desk-deals' };
  for (const p of NHL_DESK_PANELS) {
    let html = '';
    try { html = render(p.Panel, props); } catch (e) { fail(`the ${p.key} panel threw: ${String(e).slice(0, 160)}`); continue; }
    if (!html.includes(marks[p.key])) fail(`the ${p.key} panel drew without its ${marks[p.key]} mark`);
  }
  const cases = C.deskCases(HOST, lg, D.nhlContractsOf(desk, lg, TEAM)).length;
  const html = render(NHL_DESK_PANELS.find(p => p.key === 'contracts').Panel, props);
  const tiles = (html.match(/data-resign-tile=/g) ?? []).length;
  if (cases === 0) fail('nobody is expiring a season in, so the re-sign tiles were not drawn at all');
  if (tiles !== cases) fail(`${cases} expiring men and ${tiles} tiles on the re-sign desk`);
  const hub = render(GmDeskMount, { sport: 'nhl', desk, facts, panels: NHL_DESK_PANELS, open: null, onOpen: () => {}, onDesk: () => {} });
  if ((hub.match(/<button/g) ?? []).length < NHL_DESK_PANELS.length) fail(`the hub drew ${(hub.match(/<button/g) ?? []).length} desk boxes for ${NHL_DESK_PANELS.length} panels`);
  if (NHL_RECAP_PANELS.length !== 1 || NHL_RECAP_PANELS[0].key !== 'contracts') fail('the recap mounts more than the re-sign desk');
  console.log(`   4 panels drawn, ${tiles} re-sign tiles for ${cases} expiring men`);
}

/* ================================================================== */
const failed = [...failedIn.values()].reduce((s, n) => s + n, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const red = [...failedIn.keys()];
  console.log(`control ${CONTROL}: red in ${J(red)}, wanted ${want}`);
  if (!red.includes(want)) { console.error(`simNhlGmDesk: CONTROL ${CONTROL} DID NOT FIRE in check ${want}`); process.exit(1); }
  console.log(`simNhlGmDesk: control ${CONTROL} fired (${failed} failures, as it should)`);
  process.exit(0);
}
if (failed) { console.error(`simNhlGmDesk: ${failed} failure(s) in ${J([...failedIn.keys()])}`); process.exit(1); }
console.log(`simNhlGmDesk: all seven checks passed (${SEEDS.length} seeds x ${SEASONS} seasons)`);


