/* Round 1019: the NFL Front Office on the GM desk (src/lib/nflGmDesk.ts).
 *
 * The second bind of the shared GM modules to a real engine, shaped on
 * scripts/simNhlGmDesk.mjs (Round 987). This harness drives the NFL engine
 * (src/lib/frontOffice.ts) and the desk exactly the way the board calls them
 * (FrontOfficeBoard.tsx), on full 53 man rosters as a new franchise has them,
 * with seeded draws, and checks:
 *   1  a save from before the desk plays to the identical league, season
 *      after season, as the engine did before this round (a fixture recorded
 *      from the pre-round engine), and opening the desk changes nothing in
 *      the league it opens on
 *   2  over ten seeded seasons, every user man whose deal runs out has a
 *      recorded decision, and what happened to him is what it says: a kept
 *      man is still here (or retired), a man let go is gone; a man drafted
 *      with the desk on comes up after exactly four seasons, a first rounder
 *      with the fifth year option on his case; a man the GM tags never
 *      reaches the desk and plays the year on the tag (Round 723 kept); and
 *      the board itself (read, not replayed) runs the summer and the draft
 *      through the desk
 *   3  no trade lands after the deadline, and deals do land before it; the
 *      window shuts once Week 10 is played (what the guide says), the older
 *      trade paths' refusal agrees with it every week, and each of the
 *      board's four old trade handlers asks it first; the two that complete
 *      a deal check the cap with the dead money counted first; every club
 *      holding one of the seven seeds a conference buys (a weak division
 *      leader too, on built standings), and a package is priced off the
 *      partner's stance, both sides of it
 *   4  picks are conserved league wide: every club's pick in every round of
 *      every year carried exists exactly once, after every deal and summer,
 *      and every engine list is the ledger's
 *   5  the staff's effects change their consumer at every level step: the
 *      win probability, the scouting miss, the weeks an injury costs, for
 *      the whole staff and for each post on its own, each edge post reaching
 *      the strength by exactly the engine's own weight for its side of the
 *      ball; and the board hands the staff to every game, injury and playoff
 *   6  migration keeps every marker, a corrupt block resets alone, a traded
 *      man's contract moves whole and his old club keeps the dead money the
 *      rule sets (nothing for a tagged man, on a trade that must land), kept
 *      salary is refused in the NFL's own words, the dead money is gone after
 *      the summer, and the package cap check counts it (a built case either
 *      side of the line)
 *   7  every desk panel draws (server rendered), an old save's Staff and
 *      Re-sign boxes claim nothing the game is not doing, and the re-sign desk draws a
 *      tile for every expiring man; the deal box says shut only with the desk on
 * Negative controls (SIM_NFL_GM_DESK_CONTROL), each must go red in its check:
 *   coinflip   the summer runs the engine's own offseason, coin flip and all  (2)
 *   shortrookie  a draftee signs the engine's figure, a season short          (2)
 *   latetrade  the package clock never moves, so deals pass the deadline     (3)
 *   noguard    the trade finder's accept skips the deadline                 (3)
 *   droppick   a pick sent in a package is dropped from the ledger           (4)
 *   flatstaff  the staff edge is always nothing                             (5)
 *   flatstep   the scouting director's level 6 reads as level 5             (5)
 *   onepost    the defense key misspelt, so that coordinator does nothing   (5)
 *   nodefault  the engine's win probability reads an edge by default        (1)
 *   nodead     a trade leaves no dead money behind                          (6)
 *   boardsummer  the board's finishDraft never runs the desk summer         (2)
 *   boarddraftee the board's draftProspect skips the rookie deal            (2)
 *   boardedges   the board's playWeek drops the staff edge from the games   (5)
 *   stancespots  buyers are the top seven by record, not the seeds held      (3)
 *   stanceswap   a package is priced off the user's stance, not the partner's (3)
 *   nocapguard   the trade finder's accept skips the dead money cap check    (3)
 *   reliefnodead the package cap check forgets the dead money a leaver keeps (6)
 *   staletiles   an old save's Staff box claims an edge no game applies      (7)
 * Recording the fixture: SIM_NFL_GM_DESK_RECORD=<git ref of the engine before
 * this round> rewrites scripts/data/nflGmDeskFixture.json from that engine.
 *
 * MEASURED 2026-10-05 on three seed sets of ten (1..10, 11..20, 21..30), ten
 * seasons a seed, full rosters, the GM at Kansas City, totals per set (the
 * walk is deterministic: the same set run twice printed the same numbers):
 *   expiring men decided   1632 / 1597 / 1658   (by the GM 820 / 803 / 829, by the staff's rule 812 / 794 / 829)
 *   draftees come up       160 / 162 / 156, every one after exactly four seasons; 60 / 60 / 60 first rounders with the option
 *   tags                   41 / 41 / 41 tagged men held by the tag, none on the desk
 *   deals before deadline  692 / 723 / 711   tries after it 700 each, landed 0; refusal agreed 1700 weeks each
 *   deals moving a pick    692 / 721 / 709   leaving dead money on your cap 692 / 721 / 711, every one the rule's figure
 *   buyer and seller places at the deadline  1700 / 1719 / 1717 and 435 / 433 / 406
 *   staff ladder (fixed)   edge 0 to 3.00 strength, win .408 to .530 (Kansas City at home to
 *                          Buffalo), scouting miss 2.20 to 0.56, a three week injury 3.00 to 2.25 weeks;
 *                          alone, the head coach takes the win .408 to .438, the offensive
 *                          coordinator to .473, the defensive coordinator to .433
 * Every floor in T100 sits near 70 percent of the lowest set. Every control
 * was run on seeds 1 and 2 (twenty seasons, floors scaled) and fired in its
 * own check, failures counted: coinflip 121 in 2, shortrookie 43 in 2,
 * latetrade 140 in 3, noguard 1 in 3, droppick 84 in 4, flatstaff 63 in 5,
 * flatstep 2 in 5, onepost 27 in 5, nodead 137 in 6, nodefault 10 in 1 and 5.
 * nodefault reads half a strength point by default: at a hundredth of one,
 * the measured first draft of the control, no game of the nine replayed
 * seasons changed hands, so the replay cannot see an edge that small, and
 * section 5's level 1 check (the win probability with a level 1 staff equals
 * the one with no desk, to 1e-12) is the net under it.
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
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nflGmDeskFixture.json');

const CONTROL = process.env.SIM_NFL_GM_DESK_CONTROL || '';
const RECORD = process.env.SIM_NFL_GM_DESK_RECORD || '';
const CONTROLS = {
  coinflip: '2', shortrookie: '2', latetrade: '3', noguard: '3', droppick: '4',
  flatstaff: '5', flatstep: '5', onepost: '5', nodefault: '1', nodead: '6',
  boardsummer: '2', boarddraftee: '2', boardedges: '5', stancespots: '3', stanceswap: '3', nocapguard: '3', reliefnodead: '6',
  staletiles: '7',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_NFL_GM_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const SEEDS = (process.env.SIM_NFL_GM_DESK_SEEDS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const SEASONS = Number(process.env.SIM_NFL_GM_DESK_SEASONS || 10);

/* Floors: the measured size of each walk on ten seeds of ten seasons, see
   MEASURED in the header. A shorter walk (SIM_NFL_GM_DESK_SEEDS, used to run
   the controls quickly) scales them by its share of those hundred seasons. */
const T100 = {
  minDecisions: 1100, minGm: 560, minAuto: 550, minEarlyDeals: 480, minLateTries: 490, minPickMoves: 480,
  minDrafteesUp: 109, minOptions: 42, minTagged: 28, minDead: 480,
};
const T = Object.fromEntries(Object.entries(T100).map(([k, v]) => [k, Math.floor(v * SEEDS.length * SEASONS / 100)]));

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
  desk: path.join(ROOT, 'src', 'lib', 'nflGmDesk.ts'),
  engine: path.join(ROOT, 'src', 'lib', 'frontOffice.ts'),
  board: path.join(ROOT, 'src', 'components', 'front-office', 'FrontOfficeBoard.tsx'),
};
const EDITS = {
  coinflip: ['desk', '  const run = runDeskOffseason(nflContractHost, league, ledger, rng);',
    '  const run = { ok: true as const, engine: nflContractHost.runOffseason(league, rng, team), applied: [] as GmDecision[], picksAdded: [] as number[] };'],
  shortrookie: ['desk', '  p.years = NFL_ROOKIE_DEAL_YEARS + 1;', '  p.years = NFL_ROOKIE_DEAL_YEARS;'],
  latetrade: ['desk', 'periodsPlayed: nflWeeksPlayed(league), seasonClosed: false },', 'periodsPlayed: 0, seasonClosed: false },'],
  noguard: ['board', '    if (!league || !myTradePiece || deadlineBlock()) return;\n    const lg: LeagueState = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);',
    '    if (!league || !myTradePiece) return;\n    const lg: LeagueState = JSON.parse(JSON.stringify(league));\n    const pickRound = lastPickRound(lg, o.sweeten);'],
  droppick: ['desk', '  let next = withGmBlock(desk, NFL_DESK_KEYS.picks, out.ledger);',
    '  let next = withGmBlock(desk, NFL_DESK_KEYS.picks, { v: 1, picks: out.ledger.picks.filter(p => !pkg.give.some(a => a.kind === \'pick\' && a.key === pickKey(p))) });'],
  flatstaff: ['desk', '  const e = (key: string) => gmStaffEffect(NFL_STAFF_PACK, block, key);', '  const e = (key: string) => 0 * gmStaffEffect(NFL_STAFF_PACK, block, key);'],
  /* One level step that changes nothing: the ends still move, so only a check of every step can see it. */
  flatstep: ['desk', '  return Math.max(62, Math.min(92, p.trueOvr + gmScoutNoise(u, level)));',
    '  return Math.max(62, Math.min(92, p.trueOvr + gmScoutNoise(u, level === 6 ? 5 : level)));'],
  onepost: ['desk', "  return e('offEdge') * NFL_OFFENSE_WEIGHT + e('defEdge') * NFL_DEFENSE_WEIGHT;", "  return e('offEdge') * NFL_OFFENSE_WEIGHT + e('defenseEdge') * NFL_DEFENSE_WEIGHT;"],
  nodefault: ['engine', 'export function winProb(home: GmTeamState, away: GmTeamState, edgeHome = 0, edgeAway = 0): number {',
    'export function winProb(home: GmTeamState, away: GmTeamState, edgeHome = 0.5, edgeAway = 0): number {'],
  nodead: ['desk', '    if (amount <= 0) continue;', '    if (amount <= 0 || amount > 0) continue;'],
  /* The board's own wiring: the walk replays the board's calls, so only a read of the board can see it drop one. */
  boardsummer: ['board', '      const summer = deskNow ? nflDeskOffseason(lg, deskNow, myTeam, Math.random) : null;',
    '      const summer = deskNow && false ? nflDeskOffseason(lg, deskNow, myTeam, Math.random) : null;'],
  boarddraftee: ['board', '      if (pl && gm) nflSignDraftee(pl);\n', ''],
  boardedges: ['board', 'simGame(g, lg.teams, Math.random, deskWeek.edges)', 'simGame(g, lg.teams, Math.random)'],
  stancespots: ['desk', 'deadlineStances(rows, NFL_PLAYOFF_SPOTS, nflPlacedClubs(league))', 'deadlineStances(rows, NFL_PLAYOFF_SPOTS)'],
  stanceswap: ['desk', "  const stance = nflStances(league)[partner] ?? 'holding';", "  const stance = nflStances(league)[team] ?? 'holding';"],
  nocapguard: ['board', '    if (deskCapBlock(lg, o.teamId, myTradePiece, o.playerId)) { setShopOffers([]); setShopTried(false); return; }\n', ''],
  reliefnodead: ['desk', 'if (p) outRelief += p.salary - nflTradeDeadMoney(p);', 'if (p) outRelief += p.salary;'],
  staletiles: ['desk', "  if (!on) return { icon: '📋',", "  if (on && !on) return { icon: '📋',"],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_NFL_GM_DESK_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the line ${CONTROL} rewrites is there more than once`); process.exit(2); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red`);
}
if (RECORD) {
  const old = execFileSync('git', ['show', `${RECORD}:src/lib/frontOffice.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  overrides.set(path.resolve(FILES.engine).toLowerCase(), old);
  console.log(`RECORDING the fixture from the engine at ${RECORD}`);
}

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simNflGmDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as E from '${ROOT_URL}/src/lib/frontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nflGmDesk.ts';
export * as C from '${ROOT_URL}/src/lib/gmContracts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export * as G from '${ROOT_URL}/src/lib/gmDesk.ts';
export * as DL from '${ROOT_URL}/src/lib/gmDeadline.ts';
export { deadMoneyFor } from '${ROOT_URL}/src/lib/frontOfficeCuts.ts';
export { NFL_STAFF_PACK } from '${ROOT_URL}/src/data/gmStaff/packs.ts';
export { nflContractHost } from '${ROOT_URL}/src/lib/gmContractsHostNfl.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { FO_DEPTH } from '${ROOT_URL}/src/data/frontOfficeDepth.ts';
export { NFL_DESK_PANELS, NFL_RECAP_PANELS } from '${ROOT_URL}/src/components/front-office/NflGmDesk.tsx';
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
const { E, D, C, P, S, G, DL, NFL_STAFF_PACK, nflContractHost: HOST, leagueNames, FO_DEPTH, deadMoneyFor } = M;

/* The board's code (a control's rewrite when one is on), every comment
   stripped so prose about a call can never stand in for the call, and one
   handler's body by name: from its `const name = (` to the next handler. */
const boardCode = (overrides.get(path.resolve(FILES.board).toLowerCase()) ?? lf(fs.readFileSync(FILES.board, 'utf8')))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const boardBody = name => {
  const at = boardCode.indexOf(`  const ${name} = (`);
  if (at < 0) return null;
  const end = boardCode.indexOf('\n  const ', at + 10);
  return boardCode.slice(at, end < 0 ? undefined : end);
};

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
const leagueHash = lg => crypto.createHash('sha1').update(J(lg).replace(/"p[0-9a-z]+-(\d+)"/g, '"p-$1"')).digest('hex');
const TEAM = 'KC';
const newLeague = rng => E.initLeague(rng, { depth: FO_DEPTH, userTeam: TEAM });
const byValue = arr => [...arr].sort((a, b) => E.tradeValue(a) - E.tradeValue(b) || a.id.localeCompare(b.id));

/** The board will not play a roster over 53: the GM cuts the weakest, two taps each, the board's release. */
function cutToLimit(lg, team) {
  const mine = lg.teams[team];
  while (E.deepOverLimit(mine) > 0) {
    const down = byValue(mine.players)[0];
    if (!E.releasePlayer(mine, lg.freeAgents, down.id)) break;
  }
}

/** Every man the user drafted with the desk on: the season of his draft and his round. */
const draftedIn = new Map();

/**
 * Draft night as the board runs it (openDraft, draftProspect, draftWithoutPicks):
 * the class is drawn for the picks in play, the user takes the best grade he
 * sees, and the CPU clubs go in batches after each pick. With the desk on the
 * grade is his scout's read, a draftee signs the rules' rookie deal, and the
 * re-sign desk learns his round.
 */
function draftNight(lg, team, rng, desk) {
  const mine = lg.teams[team];
  const count = mine.picks.length;
  let batches = Math.max(3, count);
  const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + t.picks.length, 0);
  let cls = E.generateDraftClass(rng, Math.max(40, count + Math.min(rivalCapital, batches * 6)), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.nflStaffOf(desk, lg, team).block, 'scouting') : 1;
  const grade = pr => (desk ? D.nflScoutRead(pr, team, lg.season, level) : pr.grade);
  let picksLeft = count;
  if (picksLeft <= 0) {
    for (let i = 0; i < batches; i++) cls = E.nflAiDraftPicks(lg, cls, team, rng).remaining;
    return desk;
  }
  while (picksLeft > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a) || a.id.localeCompare(b.id))[0];
    if (!pr) break;
    const round = mine.picks[0];
    if (!E.consumeDraftPick(mine)) break;
    const p = E.prospectToPlayer(pr, rng);
    if (p && desk) { D.nflSignDraftee(p); draftedIn.set(p.id, { season: lg.season, round }); }
    if (p) mine.players.push(p);
    if (p && desk) desk = D.nflNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = picksLeft - 1;
    const now = nextPicks <= 0 ? batches : Math.min(1, batches);
    for (let i = 0; i < now; i++) cls = E.nflAiDraftPicks(lg, cls, team, rng).remaining;
    batches -= now;
    picksLeft = nextPicks;
  }
  return desk;
}

/** A season with the desk off: the exact calls the board makes on a save from before the desk. */
function seasonOff(lg, team, rng) {
  for (;;) {
    E.injuryPass(lg.teams, rng);
    E.aiWeeklyMoves(lg, team, rng);
    /* The board keeps the results for the screen and never writes them back to the schedule. */
    lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, rng));
    if (lg.week >= E.REGULAR_WEEKS) break;
    lg.week += 1;
  }
  const po = E.runPlayoffs(lg.teams, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  draftNight(lg, team, rng, null);
  E.runOffseason(lg, rng, team);
  cutToLimit(lg, team);
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
  const lg = newLeague(rng);
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
  const lg = newLeague(rng);
  for (let w = 0; w < 7; w++) { E.injuryPass(lg.teams, rng); E.aiWeeklyMoves(lg, TEAM, rng); lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, rng)); lg.week += 1; }
  const before = J(lg);
  const desk = D.openNflDesk(lg, TEAM);
  if (J(lg) !== before) fail('openNflDesk changed the league it opened on');
  if (!desk || desk.v !== 1 || !['contracts', 'picks', 'staff'].every(k => k in desk.blocks)) fail(`the opened desk is missing a block: ${J(Object.keys(desk?.blocks ?? {}))}`);
}
console.log(`   ${idCompared} seasons replayed against ${fixture.recordedFrom}`);

/* ================================================================== */
/* Sections 2, 3 and 4 share one walk: ten seasons a seed with the desk on. */
const stats = {
  decisions: 0, gm: 0, auto: 0, earlyDeals: 0, lateTries: 0, lateDeals: 0, pickMoves: 0, deadDeals: 0,
  pickChecks: 0, applyChecks: 0, buyers: 0, sellers: 0, drafteesUp: 0, options: 0, tagged: 0, refusalChecks: 0,
  seedChecks: 0, recordMisses: 0,
};
const problems = { s2: [], s3: [], s4: [], s6: [] };
const ids = lg => Object.keys(lg.teams);
const rules = () => D.nflGamePickRules();

/** Every club's pick in every round of every year carried exists exactly once, and every engine list is the ledger's. */
function checkPicks(lg, desk, where) {
  stats.pickChecks++;
  /* The block as stored, not as read: a reader that fails closed would hand
     back a fresh ledger and hide the very loss this check is for. */
  const ledger = desk.blocks[D.NFL_DESK_KEYS.picks];
  if (!P.validateLedger(ledger, ids(lg), rules())) { problems.s4.push(`${where}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids(lg), lg.season, rules())) problems.s4.push(`${where}: ${p}`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    const list = [...t.picks].sort((a, b) => a - b);
    if (J(held) !== J(list)) problems.s4.push(`${where}: ${abbr} engine list ${J(list)} but the ledger says ${J(held)}`);
  }
}

/** One package a week, before the week is played, the way a GM on the hub would: alternately his least valued
    man and a third rounder for their least valued man, and his two least valued men for their man and their third. */
function tryDeal(lg, team, desk, s, where) {
  const w = lg.week;
  const others = ids(lg).filter(k => k !== team).sort();
  const partner = others[(s * 7 + w * 3) % others.length];
  const me = lg.teams[team], them = lg.teams[partner];
  const ledger = D.nflPicksOf(desk, lg);
  const myPick = P.picksHeldBy(ledger, team).filter(p => p.round === 3).pop();
  const theirPick = P.picksHeldBy(ledger, partner).filter(p => p.round === 3).pop();
  const pkg = w % 2 === 1
    ? { from: team, to: partner, give: [{ kind: 'player', id: byValue(me.players)[0].id }, ...(myPick ? [{ kind: 'pick', key: P.pickKey(myPick) }] : [])], get: [{ kind: 'player', id: byValue(them.players)[0].id }] }
    : { from: team, to: partner, give: byValue(me.players).slice(0, 2).map(p => ({ kind: 'player', id: p.id })), get: [{ kind: 'player', id: byValue(them.players)[0].id }, ...(theirPick ? [{ kind: 'pick', key: P.pickKey(theirPick) }] : [])] };
  const open = D.nflTradeWindow(lg).open;
  /* The board's older trade paths (the phone talks, the trade finder) ask
     nflDeadlineRefusal; the packages ask the package clock. All three must
     read the same deadline in every week. */
  const refusal = D.nflDeadlineRefusal(lg);
  stats.refusalChecks++;
  /* What the guide and the hub promise: the break after Week 9 is the last
     chance, and once Week 10 is played every deal is shut (9 of 18 weeks in
     the league, NFL_DEADLINE in gmDeadline.ts, on this game's 17). `lg.week`
     is the week about to be played. */
  if (open !== (lg.week <= 10)) problems.s3.push(`${where} week ${w}: the window is ${open ? 'open' : 'shut'} with ${lg.week - 1} weeks played, the guide says deals shut once Week 10 is played`);
  if ((refusal === null) !== open) problems.s3.push(`${where} week ${w}: the window says ${open ? 'open' : 'shut'} but the trade paths' refusal says ${J(refusal)}`);
  const sent = pkg.give.flatMap(a => (a.kind === 'player' ? [me.players.find(p => p.id === a.id)] : []));
  const owed = sent.reduce((sum, p) => sum + D.nflTradeDeadMoney(p), 0);
  const deadBefore = (me.deadCap ?? []).reduce((sum, d) => sum + d.amount, 0);
  const res = D.nflProposePackage(lg, desk, team, pkg);
  const yes = res.verdict.verdict === 'accepted';
  if (refusal !== null && res.verdict.step === 1 && res.verdict.reason !== refusal) problems.s3.push(`${where} week ${w}: the package refusal ${J(res.verdict.reason)} is not the trade paths' ${J(refusal)}`);
  if (!open) {
    stats.lateTries++;
    if (yes) { stats.lateDeals++; problems.s3.push(`${where} week ${w}: a deal landed after the deadline (Week ${D.nflTradeWindow(lg).deadlineAfter})`); }
    else if (res.verdict.step !== 1) problems.s3.push(`${where} week ${w}: refused after the deadline, but by step ${res.verdict.step} (${res.verdict.reason}), not the deadline`);
  }
  if (!yes) return desk;
  if (open) stats.earlyDeals++;
  if ([...pkg.give, ...pkg.get].some(a => a.kind === 'pick')) stats.pickMoves++;
  /* The dead money the rule sets lands on the club he left, this season. */
  const deadAfter = (lg.teams[team].deadCap ?? []).reduce((sum, d) => sum + d.amount, 0);
  if (Math.abs(deadAfter - deadBefore - owed) > 1e-6) problems.s6.push(`${where} week ${w}: the deal should leave ${owed.toFixed(1)} of dead money and left ${(deadAfter - deadBefore).toFixed(1)}`);
  if (owed > 0) stats.deadDeals++;
  checkPicks(lg, res.desk, `${where} week ${w} deal`);
  return res.desk;
}

/** The GM takes every other case himself, and leaves the rest open for the staff's rule. */
function gmDecides(lg, team, desk) {
  const ledger = D.deskCopy(D.nflContractsOf(desk, lg, team));
  C.deskCases(HOST, lg, ledger).forEach((c, i) => {
    if (i % 2 === 1) return;
    let made;
    if (c.option) made = C.useOption(ledger, lg, c);
    else if (c.man.ovr >= 76) { made = C.keepAtAsk(ledger, lg, c); if (!made.ok) made = C.letGo(ledger, lg, c); }
    else made = C.letGo(ledger, lg, c);
  });
  return G.withGmBlock(desk, D.NFL_DESK_KEYS.contracts, ledger);
}

const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

/** A season with the desk on, in the board's order, the tag on the draft screen and the summer through the desk. */
function seasonDesk(lg, team, desk, rng, s, where) {
  for (;;) {
    desk = tryDeal(lg, team, desk, s, where);
    const opts = D.nflDeskWeekOptions(desk, lg, team);
    E.injuryPass(lg.teams, rng, opts.weeksFor);
    E.aiWeeklyMoves(lg, team, rng);
    lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, rng, opts.edges));
    desk = D.nflDeskAfterWeek(desk, lg, team).desk;
    if (lg.week === D.nflTradeWindow(lg).deadlineAfter) {
      const stances = D.nflStances(lg);
      const st = Object.values(stances);
      stats.buyers += st.filter(x => x === 'buyer').length;
      stats.sellers += st.filter(x => x === 'seller').length;
      /* Every club holding a seed in the bracket the engine plays is a buyer
         (what the Trade desk says), seven a conference. */
      const placed = D.nflPlacedClubs(lg);
      for (const conf of ['AFC', 'NFC']) {
        const n = [...placed].filter(k => E.conferenceOf(k) === conf).length;
        if (n !== D.NFL_PLAYOFF_SPOTS) problems.s3.push(`${where}: ${n} ${conf} clubs hold a seed, the bracket has ${D.NFL_PLAYOFF_SPOTS}`);
      }
      for (const k of placed) {
        stats.seedChecks++;
        if (stances[k] !== 'buyer') problems.s3.push(`${where}: ${k} holds a playoff seed at the deadline and is ${stances[k]}, not a buyer`);
      }
      /* How often a cut by record alone would have missed a seed holder. */
      const rows = Object.values(lg.teams).map(t => ({ id: t.abbr, wins: t.wins, losses: t.losses, group: E.conferenceOf(t.abbr) }));
      const byRecord = DL.deadlineStances(rows, D.NFL_PLAYOFF_SPOTS).stance;
      stats.recordMisses += [...placed].filter(k => byRecord[k] !== 'buyer').length;
    }
    if (lg.week >= E.REGULAR_WEEKS) break;
    lg.week += 1;
  }
  const po = E.runPlayoffs(lg.teams, rng, D.nflDeskEdges(desk, lg, team));
  lg.champions.push({ season: lg.season, team: po.champion });
  /* The recap: the GM settles half his expiring men on the re-sign desk. */
  desk = gmDecides(lg, team, desk);
  const closed = lg.season;
  /* A man drafted with the desk on comes up when his four year rookie deal
     has run, and a first rounder comes up with the fifth year option. Read
     before the tag, so a draftee the GM then tags is still counted here. */
  const casesNow = C.deskCases(HOST, lg, D.nflContractsOf(desk, lg, team));
  const upIds = new Set(casesNow.map(c => c.man.id));
  const rosterNow = new Set(lg.teams[team].players.map(p => p.id));
  for (const [id, at] of [...draftedIn]) {
    const playedSeasons = closed - at.season;
    if (!rosterNow.has(id)) { if (playedSeasons >= 4) draftedIn.delete(id); continue; }
    if (upIds.has(id)) {
      stats.drafteesUp++;
      if (playedSeasons !== 4) problems.s2.push(`${where}: a round ${at.round} draftee came up after ${playedSeasons} seasons, his rookie deal is four`);
      const c = casesNow.find(x => x.man.id === id);
      if (at.round === 1 && !c.option) problems.s2.push(`${where}: a first round draftee came up without his fifth year option`);
      if (at.round !== 1 && c.option) problems.s2.push(`${where}: a round ${at.round} draftee came up with a fifth year option`);
      if (c.option) stats.options++;
      draftedIn.delete(id);
    } else if (playedSeasons >= 4) {
      problems.s2.push(`${where}: a round ${at.round} draftee has played ${playedSeasons} seasons and his rookie deal has not come up`);
      draftedIn.delete(id);
    }
  }
  /* The draft screen: every other season the GM tags his best expiring man
     the tag will take (Round 723, unchanged). The tag holds him; the desk
     never sees him again this spring, whatever it had written down. */
  let taggedId = null;
  if (s % 2 === 0) {
    const mine = lg.teams[team];
    for (const p of E.expiringPlayers(mine)) {
      if (E.tagRefusal(lg, mine, p.id) === null && E.applyFranchiseTag(lg, mine, p.id).ok) { taggedId = p.id; break; }
    }
  }
  desk = draftNight(lg, team, rng, desk);
  const up = C.expiringMen(HOST, lg, team).map(m => ({ id: m.id, name: m.name }));
  if (taggedId && up.some(m => m.id === taggedId)) problems.s2.push(`${where}: the man you tagged is still on the re-sign desk`);
  const summer = D.nflDeskOffseason(lg, desk, team, rng);
  if (!summer.ok) { problems.s2.push(`${where}: the desk summer refused to run (${summer.lines.join(' ')})`); return desk; }
  desk = summer.desk;
  const ledger = D.nflContractsOf(desk, lg, team);
  const roster = new Map(lg.teams[team].players.map(p => [p.id, p]));
  const retired = name => summer.news.retired.some(r => r.team === team && r.player === name);
  for (const m of up) {
    stats.applyChecks++;
    const d = ledger.decisions.find(x => x.season === closed && x.id === m.id);
    if (!d) { problems.s2.push(`${where}: ${m.name}'s deal ran out with no recorded decision`); continue; }
    stats.decisions++;
    if (d.via === 'gm') stats.gm++; else stats.auto++;
    if (STAYS.has(d.kind) && !roster.has(m.id) && !retired(m.name)) problems.s2.push(`${where}: ${m.name} was kept (${d.kind}) but is not on the roster`);
    if (!STAYS.has(d.kind) && roster.has(m.id)) problems.s2.push(`${where}: ${m.name} was let go (${d.kind}) but is still on the roster`);
    if (d.kind === 'option' && roster.has(m.id) && !roster.get(m.id).guaranteed) problems.s2.push(`${where}: ${m.name}'s option year is not guaranteed`);
  }
  if (taggedId) {
    stats.tagged++;
    const p = roster.get(taggedId);
    if (summer.applied.some(x => x.id === taggedId)) problems.s2.push(`${where}: the desk applied a decision to the man you tagged`);
    if (p && p.tagSeason !== lg.season) problems.s2.push(`${where}: the man you tagged is not playing the season on the tag`);
    if (!p && !summer.news.retired.some(r => r.team === team)) problems.s2.push(`${where}: the man you tagged left the club`);
  }
  cutToLimit(lg, team);
  checkPicks(lg, desk, `${where} summer`);
  return desk;
}

for (const seed of SEEDS) {
  const rng = mulberry32(1000 + seed);
  const lg = newLeague(rng);
  cutToLimit(lg, TEAM);
  let desk = D.openNflDesk(lg, TEAM);
  checkPicks(lg, desk, `seed ${seed} open`);
  for (let s = 0; s < SEASONS; s++) desk = seasonDesk(lg, TEAM, desk, rng, s, `seed ${seed} season ${s + 1}`);
}

begin('2', 'over ten seasons a seed, no expiring man of yours leaves without a recorded decision, applied as written');
for (const p of problems.s2) fail(p);
if (stats.decisions < T.minDecisions) fail(`only ${stats.decisions} decisions over the walk, floor ${T.minDecisions}`);
if (stats.gm < T.minGm) fail(`only ${stats.gm} decisions by the GM, floor ${T.minGm}`);
if (stats.auto < T.minAuto) fail(`only ${stats.auto} settled by the staff's rule, floor ${T.minAuto}`);
if (stats.drafteesUp < T.minDrafteesUp) fail(`only ${stats.drafteesUp} draftees reached the end of their rookie deal, floor ${T.minDrafteesUp}`);
if (stats.options < T.minOptions) fail(`only ${stats.options} first rounders came up with the option, floor ${T.minOptions}`);
if (stats.tagged < T.minTagged) fail(`only ${stats.tagged} tags walked, floor ${T.minTagged}`);
console.log(`   ${stats.applyChecks} expiring men: ${stats.gm} decided by the GM, ${stats.auto} by the staff's rule; ${stats.drafteesUp} draftees came up after exactly four seasons, ${stats.options} with the option; ${stats.tagged} tagged men held by the tag`);
{
  /* The walk replays the board's call order, so it cannot see the board drop
     a call. Read the board itself: with the desk on, the summer runs through
     the desk and the engine's own offseason only without it; a draftee signs
     the rules' rookie deal and the desk learns his round, read before the
     pick is spent; and the last pick hands the summer the desk. */
  const fin = boardBody('finishDraft') ?? '', dp = boardBody('draftProspect') ?? '';
  if (!fin.includes('const summer = deskNow ? nflDeskOffseason(lg, deskNow, myTeam, Math.random) : null;')) fail('the board\'s finishDraft no longer runs the summer through nflDeskOffseason whenever the desk is on');
  if (!fin.includes('summer?.news ?? runOffseason(')) fail('the board\'s finishDraft runs the engine\'s own offseason when the desk summer ran');
  const iRound = dp.indexOf('const pickRound = mine.picks[0];'), iSpend = dp.indexOf('consumeDraftPick(mine)');
  if (iRound < 0 || iSpend < 0 || iRound > iSpend) fail('the board\'s draftProspect does not read the pick\'s round before it spends the pick');
  if (!dp.includes('if (pl && gm) nflSignDraftee(pl);')) fail('the board\'s draftProspect no longer signs a draftee to the rules\' four year rookie deal with the desk on');
  if (!dp.includes("nflNoteArrivals(gm, lg, myTeam, [pl.id], 'draft', pickRound)")) fail('the board\'s draftProspect no longer tells the re-sign desk the draftee\'s round');
  if (!dp.includes('finishDraft(lg, note, deskNow ?? gm)')) fail('the board\'s last pick hands the summer no desk');
  console.log('   the board runs the summer and the draft through the desk (read from FrontOfficeBoard.tsx)');
}

begin('3', 'no trade lands after the deadline, and deals do land before it');
for (const p of problems.s3) fail(p);
if (stats.earlyDeals < T.minEarlyDeals) fail(`only ${stats.earlyDeals} deals before the deadline, floor ${T.minEarlyDeals}`);
if (stats.lateTries < T.minLateTries) fail(`only ${stats.lateTries} tries after the deadline, floor ${T.minLateTries}`);
if (!(stats.buyers > 0 && stats.sellers > 0)) fail(`the deadline split nobody: ${stats.buyers} buyers, ${stats.sellers} sellers`);
console.log(`   ${stats.earlyDeals} deals before the deadline, ${stats.lateTries} tries after it, ${stats.lateDeals} landed; ${stats.buyers} buyer and ${stats.sellers} seller places at the deadline`);
if (stats.seedChecks !== 14 * SEEDS.length * SEASONS) fail(`${stats.seedChecks} seed holders checked at the deadline, wanted 14 a season`);
console.log(`   ${stats.seedChecks} seed holders at the deadline, every one a buyer; a cut by record alone would have missed ${stats.recordMisses}`);
{
  /* Built standings, so the pricing never waits on the walk to meet a case.
     (a) A weak division leader: every club 6-3 except one AFC division,
     whose leader is 4-5 and the rest 3-6. He holds a seed, so he buys,
     though a cut by record alone puts him behind twelve 6-3 clubs. */
  const lw = newLeague(mulberry32(33));
  lw.week = 10;
  const afc = Object.keys(lw.teams).filter(k => E.conferenceOf(k) === 'AFC').sort();
  const weak = afc.filter(k => E.divisionOf(k) === E.divisionOf(afc[0]));
  for (const t of Object.values(lw.teams)) { t.wins = 6; t.losses = 3; }
  weak.forEach((k, i) => { lw.teams[k].wins = i === 0 ? 4 : 3; lw.teams[k].losses = i === 0 ? 5 : 6; });
  const lead = weak[0];
  if (!D.nflPlacedClubs(lw).has(lead)) fail(`built standings: ${lead} leads its division at 4-5 and holds no seed`);
  else if (D.nflStances(lw)[lead] !== 'buyer') fail(`built standings: ${lead} leads its division at 4-5, holds a seed and is ${D.nflStances(lw)[lead]}, not a buyer`);
  /* (b) The partner's stance prices the deal, both sides of it: a 9-0 club
     buys and a 0-9 club sells while you sit 4-5 with everyone else, so a
     price off your own stance reads the same for both and fails one. */
  const lp = newLeague(mulberry32(34));
  lp.week = 10;
  for (const t of Object.values(lp.teams)) { t.wins = 4; t.losses = 5; }
  const others = Object.keys(lp.teams).filter(k => k !== TEAM).sort();
  const hot = others.find(k => E.conferenceOf(k) === 'AFC'), cold = others.find(k => E.conferenceOf(k) === 'NFC');
  lp.teams[hot].wins = 9; lp.teams[hot].losses = 0;
  lp.teams[cold].wins = 0; lp.teams[cold].losses = 9;
  const dp = D.openNflDesk(lp, TEAM);
  const myVet = lp.teams[TEAM].players.find(p => p.age >= DL.VETERAN_AGE);
  for (const [partner, want] of [[hot, 'buyer'], [cold, 'seller']]) {
    const st = D.nflStances(lp)[partner];
    if (st !== want) { fail(`built standings: ${partner} is ${st}, wanted ${want}`); continue; }
    const ctx = D.nflPackageContext(lp, dp, TEAM, partner);
    const theirVet = lp.teams[partner].players.find(p => p.age >= DL.VETERAN_AGE);
    for (const vet of [theirVet, myVet]) {
      if (!vet) { fail(`no veteran to price on ${partner} or ${TEAM}`); continue; }
      const got = ctx.valueOf({ kind: 'player', id: vet.id });
      const wantV = DL.stanceValue(want, E.tradeValue(vet), vet.age);
      if (Math.abs(got - wantV) > 1e-9) fail(`a package to a ${want} (${partner}) prices ${vet.name} at ${got.toFixed(2)}, the ${want}'s weight makes ${wantV.toFixed(2)}`);
    }
  }
}
{
  /* The board's older trade paths are guarded in the board itself, so read
     it: the code, with every comment stripped, so prose about the guard can
     never stand in for the guard. Each handler that opens or closes a deal
     asks deadlineBlock() before it touches the trade engine, and
     deadlineBlock asks nflDeadlineRefusal, the refusal checked above. */
  const body = boardBody;
  const guard = body('deadlineBlock');
  if (!guard || !guard.includes('nflDeadlineRefusal(league)')) fail('deadlineBlock no longer asks nflDeadlineRefusal');
  const paths = { openTradeTalks: 'openTalks(', acceptTalks: 'executeTalksTrade(', doShop: 'findTrades(', acceptShopOffer: 'proposeTrade(' };
  let guarded = 0;
  for (const [name, engineCall] of Object.entries(paths)) {
    const b = body(name);
    if (!b) { fail(`the board has no ${name} handler to check`); continue; }
    const g = b.indexOf('deadlineBlock()'), t = b.indexOf(engineCall);
    if (t < 0) fail(`${name} no longer calls ${engineCall}, so this check is reading the wrong handler`);
    else if (g < 0 || g > t) fail(`${name} reaches ${engineCall} without asking deadlineBlock() first`);
    else guarded++;
  }
  /* And the two that complete a deal leave the dead money and move the pick through the desk. */
  for (const name of ['acceptTalks', 'acceptShopOffer']) {
    const b = body(name);
    if (b && !b.includes('deskAfterTrade(')) fail(`${name} completes a deal without deskAfterTrade, so no dead money and no ledger move`);
  }
  const after = body('deskAfterTrade');
  if (!after || !after.includes('nflApplyTradeDeadMoney(') || !after.includes('nflMirrorPickMove(')) fail('deskAfterTrade no longer leaves dead money or mirrors the pick');
  /* And they check the cap with the dead money counted (the package's own
     nflPackageCapCheck) before the engine runs them, so an older path can
     never leave a club over the cap that a package would have refused; the
     trade finder lists only deals that pass it. */
  const capGuard = body('deskCapRefusal');
  if (!capGuard || !capGuard.includes('nflPackageCapCheck(')) fail('deskCapRefusal no longer asks nflPackageCapCheck');
  for (const [name, engineCall] of [['acceptTalks', 'executeTalksTrade('], ['acceptShopOffer', 'proposeTrade(']]) {
    const b = body(name) ?? '';
    const g = b.indexOf('deskCapBlock('), t = b.indexOf(engineCall);
    if (g < 0 || t < 0 || g > t) fail(`${name} reaches ${engineCall} without the dead money cap check (deskCapBlock) first`);
  }
  if (!(body('doShop') ?? '').includes('deskCapRefusal(')) fail('the trade finder lists deals the dead money cap check would refuse');
  console.log(`   ${stats.refusalChecks} weeks where the trade paths' refusal matched the window; ${guarded} of 4 board trade handlers ask the deadline first`);
}

begin('4', 'picks are conserved league wide after every deal and every summer');
for (const p of problems.s4) fail(p);
if (stats.pickMoves < T.minPickMoves) fail(`only ${stats.pickMoves} deals moved a pick, floor ${T.minPickMoves}`);
console.log(`   ${stats.pickChecks} ledger checks, ${stats.pickMoves} deals with a pick in them`);

/* ================================================================== */
begin('5', "the staff's effects change their consumer at every level step");
const L5 = newLeague(mulberry32(5));
const base = S.gmDefaultStaff(NFL_STAFF_PACK.rules, D.nflStaffCtx(L5, TEAM));
const atLevel = level => {
  const block = { ...base };
  for (const post of NFL_STAFF_PACK.posts) block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
  return block;
};
const rival = L5.teams.BUF, mine5 = L5.teams[TEAM];
{
  /* The weights the desk uses are the engine's own: a rating point on every
     offensive man moves teamStrength by NFL_OFFENSE_WEIGHT, one on every
     defender by NFL_DEFENSE_WEIGHT. Measured on the engine, not restated. */
  const OFF = new Set(['QB', 'RB', 'WR', 'TE', 'OL']);
  const bump = side => { const t = JSON.parse(J(mine5)); for (const p of t.players) if (side(p.pos)) p.ovr += 1; return E.teamStrength(t) - E.teamStrength(mine5); };
  const off = bump(pos => OFF.has(pos)), def = bump(pos => !OFF.has(pos));
  if (Math.abs(off - D.NFL_OFFENSE_WEIGHT) > 1e-9) fail(`a point on the whole offense moves the strength ${off.toFixed(4)}, the desk weighs it ${D.NFL_OFFENSE_WEIGHT}`);
  if (Math.abs(def - D.NFL_DEFENSE_WEIGHT) > 1e-9) fail(`a point on the whole defense moves the strength ${def.toFixed(4)}, the desk weighs it ${D.NFL_DEFENSE_WEIGHT}`);
}
const ladder = [];
for (let level = 1; level <= 10; level++) {
  const block = atLevel(level);
  const desk = G.withGmBlock(D.openNflDesk(L5, TEAM), D.NFL_DESK_KEYS.staff, { block, purse: 8 });
  const opts = D.nflDeskWeekOptions(desk, L5, TEAM);
  const win = E.winProb(mine5, rival, opts.edges[TEAM], 0);
  let miss = 0, out = 0;
  const scoutLevel = S.gmStaffLevel(block, 'scouting');
  for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); miss += Math.abs(D.nflScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, scoutLevel) - t); }
  for (let i = 0; i < 4000; i++) out += opts.weeksFor(TEAM, { id: `i${i}` }, 3);
  ladder.push({ level, edge: opts.edges[TEAM], win, miss: miss / 3000, out: out / 4000 });
}
if (Math.abs(ladder[0].win - E.winProb(mine5, rival)) > 1e-12) fail(`a level 1 staff moves the game: ${ladder[0].win} against ${E.winProb(mine5, rival)} with no desk`);
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  if (!(b.win > a.win)) fail(`level ${a.level} to ${b.level}: the win probability did not rise (${a.win.toFixed(4)} to ${b.win.toFixed(4)})`);
  if (!(b.miss < a.miss)) fail(`level ${a.level} to ${b.level}: the scouting miss did not shrink (${a.miss.toFixed(3)} to ${b.miss.toFixed(3)})`);
  if (!(b.out < a.out)) fail(`level ${a.level} to ${b.level}: an injury did not get shorter (${a.out.toFixed(3)} to ${b.out.toFixed(3)})`);
}
/* Each post on its own: every other chair at level 1, this one up the
   ladder. A post whose effect reaches nothing hides inside the all posts
   ladder above (gmStaffEffect reads a key it does not know as nothing), so
   each post must move its own consumer at every step, and an edge post must
   reach the strength by exactly the weight of its side of the ball. */
const WEIGHTS = { offEdge: D.NFL_OFFENSE_WEIGHT, defEdge: D.NFL_DEFENSE_WEIGHT };
const postLines = [];
for (const post of NFL_STAFF_PACK.posts) {
  const keys = post.effects.map(x => x.key);
  const edgeKeys = keys.filter(k => k in WEIGHTS);
  const consumer = edgeKeys.length ? 'win' : keys.includes('scoutSpread') ? 'miss' : keys.includes('injuryWeeks') ? 'out' : null;
  if (!consumer) { fail(`the ${post.id} post's effects ${J(keys)} reach no consumer this harness knows`); continue; }
  const vals = [];
  for (let level = 1; level <= 10; level++) {
    const block = atLevel(1);
    block[post.id] = { ...base[post.id], level, potential: Math.max(level, base[post.id].potential) };
    const edge = D.nflStaffEdge(block);
    const want = edgeKeys.reduce((s, k) => s + S.gmStaffEffect(NFL_STAFF_PACK, block, k) * WEIGHTS[k], 0);
    if (Math.abs(edge - want) > 1e-9) fail(`${post.id} at level ${level}: the staff edge is ${edge.toFixed(3)}, its own effects at their weights make ${want.toFixed(3)}`);
    let v = 0;
    if (consumer === 'win') v = E.winProb(mine5, rival, edge, 0);
    else if (consumer === 'miss') {
      const lv = S.gmStaffLevel(block, 'scouting');
      for (let i = 0; i < 3000; i++) { const t = 70 + (i % 15); v += Math.abs(D.nflScoutRead({ id: `p${i}`, trueOvr: t }, TEAM, 2026, lv) - t) / 3000; }
    } else for (let i = 0; i < 4000; i++) v += D.nflInjuryWeeks(block, TEAM, 2026, 1, `i${i}`, 3) / 4000;
    if (vals.length && !(consumer === 'win' ? v > vals.at(-1) : v < vals.at(-1))) fail(`${post.id} alone, level ${level - 1} to ${level}: the ${consumer} did not move (${vals.at(-1).toFixed(4)} to ${v.toFixed(4)})`);
    vals.push(v);
  }
  postLines.push(`${post.id} ${consumer} ${vals[0].toFixed(3)} to ${vals[9].toFixed(3)}`);
}
console.log(`   each post alone: ${postLines.join('; ')}`);
{
  /* The other clubs never feel the user's staff. */
  const opts = D.nflDeskWeekOptions(G.withGmBlock(D.openNflDesk(L5, TEAM), D.NFL_DESK_KEYS.staff, { block: atLevel(10), purse: 8 }), L5, TEAM);
  if (Object.keys(opts.edges).join() !== TEAM) fail(`the desk hands an edge to ${J(Object.keys(opts.edges))}`);
  if (opts.weeksFor('BUF', { id: 'x' }, 3) !== 3) fail('the user trainer shortened a rival injury');
}
{
  /* The ladder above is the desk's; the board is what hands it to the
     games. Read it: with the desk on, every game of the week, the injury
     pass and the playoffs get the staff. */
  const pw = boardBody('playWeek') ?? '';
  if (!pw.includes('const deskWeek = gm ? nflDeskWeekOptions(gm, lg, myTeam) : null;')) fail('the board\'s playWeek no longer asks the desk for the week');
  if (!pw.includes('simGame(g, lg.teams, Math.random, deskWeek.edges)')) fail('the board\'s playWeek plays the week without the staff edge');
  if (!pw.includes('injuryPass(lg.teams, Math.random, deskWeek.weeksFor)')) fail('the board\'s playWeek runs injuries without the trainer');
  if (!pw.includes('runPlayoffs(lg.teams, Math.random, nextGm ? nflDeskEdges(nextGm, lg, myTeam) : undefined)')) fail('the board\'s playoffs run without the staff edge');
}
console.log(`   edge ${ladder[0].edge.toFixed(2)} to ${ladder[9].edge.toFixed(2)}, win ${ladder[0].win.toFixed(3)} to ${ladder[9].win.toFixed(3)}, miss ${ladder[0].miss.toFixed(2)} to ${ladder[9].miss.toFixed(2)}, weeks out ${ladder[0].out.toFixed(2)} to ${ladder[9].out.toFixed(2)}`);

/* ================================================================== */
begin('6', 'migration keeps every marker, a corrupt block resets alone, a trade moves the contract and leaves the dead money the rule sets');
for (const p of problems.s6) fail(p);
if (stats.deadDeals < T.minDead) fail(`only ${stats.deadDeals} walk deals left dead money behind, floor ${T.minDead}`);
console.log(`   ${stats.deadDeals} walk deals left dead money on your cap, every one the rule's figure`);
{
  const lg = newLeague(mulberry32(6));
  lg.teams.BUF.picks = [1]; lg.teams.MIA.picks = [1, 2, 2, 3]; lg.teams.NYJ.picks = [];
  const desk = D.openNflDesk(lg, TEAM);
  const ledger = D.nflPicksOf(desk, lg);
  let markers = 0;
  for (const [abbr, t] of Object.entries(lg.teams)) {
    markers += t.picks.length;
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`migration: ${abbr} held ${J(t.picks)} and the ledger gives it ${J(held)}`);
  }
  if (P.picksHeldBy(ledger, TEAM).length === 0 || markers !== ledger.picks.filter(p => p.year === lg.season).length) fail(`migration: ${markers} markers on the old lists, ${ledger.picks.filter(p => p.year === lg.season).length} picks this year in the ledger`);
  const broken = G.withGmBlock(desk, D.NFL_DESK_KEYS.picks, { v: 7 });
  if (D.nflContractsOf(broken, lg, TEAM) !== desk.blocks.contracts) fail('a corrupt picks block took the contracts block with it');
  if (D.nflStaffOf(broken, lg, TEAM) !== desk.blocks.staff) fail('a corrupt picks block took the staff block with it');
  if (!P.validateLedger(D.nflPicksOf(broken, lg), Object.keys(lg.teams), D.nflGamePickRules())) fail('a corrupt picks block did not come back as a sound fresh one');
}
{
  /* A trade: the contract goes with him and the old club keeps the rule's
     share as dead money, this season only; a tagged man moves clean; kept
     salary is refused in the NFL's own words. */
  const lg = newLeague(mulberry32(66));
  let desk = D.openNflDesk(lg, TEAM);
  const me = lg.teams[TEAM];
  const share = D.NFL_TRADE_BONUS_SHARE;
  const ruleDead = p => Math.min(deadMoneyFor(p).now, Math.round(p.salary * share * Math.max(1, p.years) * 10) / 10);
  const pick = filter => [...me.players].filter(filter).sort((a, b) => E.tradeValue(b) - E.tradeValue(a))[0];
  const send = pick(p => p.years >= 2 && !p.guaranteed && p.salary >= 3 && p.salary <= 15);
  if (!send) fail('no man on the user club to walk the trade rule with');
  else {
    const want = ruleDead(send);
    const salary = send.salary;
    const back = byValue(lg.teams.LV.players)[0];
    const theirDead = ruleDead(back);
    const kept = D.nflProposePackage(JSON.parse(J(lg)), desk, TEAM, { from: TEAM, to: 'LV', give: [{ kind: 'player', id: send.id, retain: 0.25 }], get: [{ kind: 'player', id: back.id }] }).verdict;
    if (kept.verdict !== 'invalid' || kept.step !== 3 || !String(kept.reason).includes('contract moves whole')) fail(`kept salary in an NFL trade was not refused in the league's words: ${J(kept)}`);
    const res = D.nflProposePackage(lg, desk, TEAM, { from: TEAM, to: 'LV', give: [{ kind: 'player', id: send.id }], get: [{ kind: 'player', id: back.id }] });
    if (res.verdict.verdict !== 'accepted') fail(`a starter for their least valued man was refused: ${J(res.verdict)}`);
    else {
      desk = res.desk;
      const mine = (me.deadCap ?? []).find(x => x.playerId === send.id);
      if (!mine || mine.amount !== want || mine.seasonsLeft !== 1) fail(`the user club carries ${J(mine)} for ${send.name}, wanted ${want} this season only`);
      if (want <= 0) fail(`a ${send.years} year deal left no dead money at all`);
      const theirs = (lg.teams.LV.deadCap ?? []).find(x => x.playerId === back.id);
      if (theirDead > 0 && (!theirs || theirs.amount !== theirDead)) fail(`the other club carries ${J(theirs)} for the man it sent, wanted ${theirDead}`);
      const moved = lg.teams.LV.players.find(p => p.id === send.id);
      if (!moved || moved.salary !== salary) fail(`${send.name} costs his new club ${moved?.salary}, his contract was ${salary}`);
      const summer = D.nflDeskOffseason(lg, desk, TEAM, mulberry32(67));
      if (!summer.ok) fail('the desk summer refused to run in the trade walk');
      else if ((lg.teams[TEAM].deadCap ?? []).some(x => x.playerId === send.id)) fail('the dead money from a trade outlived the season it was charged to');
      desk = summer.desk;
    }
  }
  /* A tagged man: one guaranteed year, no bonus, so nothing stays behind. */
  const lt = newLeague(mulberry32(68));
  const dt = D.openNflDesk(lt, TEAM);
  const mt = lt.teams[TEAM];
  const tagMe = [...E.expiringPlayers(mt)].find(p => E.tagRefusal(lt, mt, p.id) === null);
  if (!tagMe) fail('nobody on the user club could be tagged for the walk');
  else {
    E.applyFranchiseTag(lt, mt, tagMe.id);
    if (D.nflTradeDeadMoney(tagMe) !== 0) fail(`a tagged man leaves ${D.nflTradeDeadMoney(tagMe)} of dead money`);
    /* To the club with the most cap room, for its last third rounder, so the
       tag's salary fits and the price is met: a refusal would leave the
       check below unasked. */
    const room = abbr => lt.cap - E.capUsed(lt.teams[abbr]);
    const to = Object.keys(lt.teams).filter(k => k !== TEAM).sort((a, b) => room(b) - room(a) || a.localeCompare(b))[0];
    const third = P.picksHeldBy(D.nflPicksOf(dt, lt), to).filter(p => p.round === 3).pop();
    const r = D.nflProposePackage(lt, dt, TEAM, { from: TEAM, to, give: [{ kind: 'player', id: tagMe.id }], get: third ? [{ kind: 'pick', key: P.pickKey(third) }] : [] });
    if (r.verdict.verdict !== 'accepted') fail(`a tagged man for ${to}'s third rounder was refused, so the tag's dead money went unchecked: ${J(r.verdict)}`);
    else if ((mt.deadCap ?? []).some(x => x.playerId === tagMe.id)) fail('trading a tagged man left dead money behind');
  }
}
{
  /* The package cap check counts the dead money a leaver keeps. A 10M man
     with three years left keeps 4.5M behind, so sending him frees 5.5M, not
     10M. For a 20M man coming back, the engine's matching rule then wants
     20 > 5.5 x 1.5 + 5, which holds, and with the cap set 12M above the
     payroll the club ends 2.5M over it: refused. Forget the dead money and
     the matching rule wants 20 > 10 x 1.5 + 5, which does not hold, so it
     would pass. With the cap 15M above, the deal fits: passed. */
  const lc = newLeague(mulberry32(69));
  const me = lc.teams[TEAM];
  const out = byValue(me.players).find(p => !p.guaranteed);
  const to = Object.keys(lc.teams).filter(k => k !== TEAM).sort()[0];
  const inc = byValue(lc.teams[to].players).find(p => !p.guaranteed);
  out.salary = 10; out.years = 3;
  inc.salary = 20; inc.years = 1;
  const pkg = { from: TEAM, to, give: [{ kind: 'player', id: out.id }], get: [{ kind: 'player', id: inc.id }] };
  if (D.nflTradeDeadMoney(out) !== 4.5) fail(`a 10M man with three years left keeps ${D.nflTradeDeadMoney(out)} behind, the rule makes 4.5`);
  lc.cap = Math.round((E.capUsed(me) + 12) * 10) / 10;
  const over = D.nflPackageCapCheck(lc, pkg);
  if (!over || !over.includes('over the cap')) fail(`a deal that leaves ${TEAM} 2.5M over the cap once the dead money is counted passed the package cap check: ${J(over)}`);
  lc.cap = Math.round((E.capUsed(me) + 15) * 10) / 10;
  const fits = D.nflPackageCapCheck(lc, pkg);
  if (fits !== null) fail(`a deal that fits under the cap with the dead money counted was refused: ${J(fits)}`);
  console.log(`   the package cap check counts a leaver's dead money: 12M of room refused (${over ? 'refused' : 'passed'}), 15M passed (${fits === null ? 'passed' : 'refused'})`);
}

/* ================================================================== */
begin('7', 'every desk panel draws, and the re-sign desk shows a tile for every expiring man');
{
  const { NFL_DESK_PANELS, NFL_RECAP_PANELS, GmDeskMount, render } = M;
  const rng = mulberry32(77);
  const lg = newLeague(rng);
  cutToLimit(lg, TEAM);
  let desk = D.openNflDesk(lg, TEAM);
  /* One season on, so somebody's deal is running out. */
  desk = seasonDesk(lg, TEAM, desk, rng, 1, 'render walk');
  const facts = { teamId: TEAM, teamLabel: TEAM, seasonsPlayed: 1, phase: 'hub', hub: {}, league: lg, seasonOver: false, deskOn: true, clubName: x => x, say: () => {}, commit: () => {} };
  const props = { sport: { key: 'nfl' }, desk, facts, onDesk: () => {}, onBack: () => {} };
  const marks = { staff: 'data-nfl-desk-staff', contracts: 'data-resign-desk', picks: 'data-gm-picks', deals: 'data-nfl-desk-deals' };
  for (const p of NFL_DESK_PANELS) {
    let html = '';
    try { html = render(p.Panel, props); } catch (e) { fail(`the ${p.key} panel threw: ${String(e).slice(0, 160)}`); continue; }
    if (!html.includes(marks[p.key])) fail(`the ${p.key} panel drew without its ${marks[p.key]} mark`);
  }
  const cases = C.deskCases(HOST, lg, D.nflContractsOf(desk, lg, TEAM)).length;
  const html = render(NFL_DESK_PANELS.find(p => p.key === 'contracts').Panel, props);
  const tiles = (html.match(/data-resign-tile=/g) ?? []).length;
  if (cases === 0) fail('nobody is expiring a season in, so the re-sign tiles were not drawn at all');
  if (tiles !== cases) fail(`${cases} expiring men and ${tiles} tiles on the re-sign desk`);
  const hub = render(GmDeskMount, { sport: 'nfl', desk, facts, panels: NFL_DESK_PANELS, open: null, onOpen: () => {}, onDesk: () => {} });
  if ((hub.match(/<button/g) ?? []).length < NFL_DESK_PANELS.length) fail(`the hub drew ${(hub.match(/<button/g) ?? []).length} desk boxes for ${NFL_DESK_PANELS.length} panels`);
  if (NFL_RECAP_PANELS.length !== 1 || NFL_RECAP_PANELS[0].key !== 'contracts') fail('the recap mounts more than the re-sign desk');
  /* The deal box past the deadline: shut with the desk on; on a save without it the phone still deals, so it must not say shut. */
  const deals = NFL_DESK_PANELS.find(p => p.key === 'deals');
  const late = { ...facts, league: { ...lg, week: 12 } };
  if (deals.tile({ desk, facts: late }).value !== 'Deadline passed') fail(`with the desk on, the deal box at Week 12 reads ${J(deals.tile({ desk, facts: late }).value)}`);
  if (deals.tile({ desk, facts: { ...late, deskOn: false } }).value === 'Deadline passed') fail('a save without the desk reads Deadline passed while its phone and trade finder still deal');
  /* On a save without the desk, no game gets a staff edge and the engine's
     own offseason decides the expiring men, so neither box may claim otherwise. */
  const off = { ...facts, deskOn: false };
  const staffOff = NFL_DESK_PANELS.find(p => p.key === 'staff').tile({ desk, facts: off });
  if (/team strength/.test(staffOff.sub) || staffOff.value.includes(' of ')) fail(`a save without the desk shows a staff at work: ${J(staffOff)}`);
  const resignOff = NFL_DESK_PANELS.find(p => p.key === 'contracts').tile({ desk, facts: off });
  if (/waiting on you|Every call is made/.test(resignOff.sub) || resignOff.accent) fail(`a save without the desk shows men waiting on the re-sign desk: ${J(resignOff)}`);
  console.log(`   4 panels drawn, ${tiles} re-sign tiles for ${cases} expiring men`);
}

/* ================================================================== */
const failed = [...failedIn.values()].reduce((s, n) => s + n, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const red = [...failedIn.keys()];
  console.log(`control ${CONTROL}: red in ${J(red)}, wanted ${want}`);
  if (!red.includes(want)) { console.error(`simNflGmDesk: CONTROL ${CONTROL} DID NOT FIRE in check ${want}`); process.exit(1); }
  console.log(`simNflGmDesk: control ${CONTROL} fired (${failed} failures, as it should)`);
  process.exit(0);
}
if (failed) { console.error(`simNflGmDesk: ${failed} failure(s) in ${J([...failedIn.keys()])}`); process.exit(1); }
console.log(`simNflGmDesk: all seven checks passed (${SEEDS.length} seeds x ${SEASONS} seasons)`);
