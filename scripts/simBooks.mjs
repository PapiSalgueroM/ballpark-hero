/**
 * Round 206 harness: the books balance.
 *
 * Club Manager keeps a lot of numbers that have to agree with each other:
 * a league table, a squad, a transfer market, a budget. Nothing was
 * checking that they did. Individual features have their own harnesses,
 * but the invariants BETWEEN them, the ones that have to be true after
 * every single week of every single season whatever the feature of the
 * month was, had nobody watching them.
 *
 * This file is that watch. Every rule below is one that cannot be false in
 * a real football season, stated once, and checked against a live engine
 * across several careers and several seasons rather than a fixture.
 *
 *  1. The table. Points are wins times three plus draws, every league's
 *     goals for equal its goals against, its wins equal its losses, its
 *     draws are an even number, and no club appears twice. These four
 *     hold at every point in a season, not just at the end, because every
 *     match adds to both sides of each of them.
 *  2. The squad. No two men share an id, none has negative goals or
 *     assists, and the eleven you picked never names a man who is not in
 *     the squad.
 *  3. The market. It never sells you a man you already own, never lists
 *     the same man twice, never re-lists somebody already gone, and a
 *     signing costs money, adds exactly one player, and takes him off the
 *     shelf.
 *
 * The name rule that started Round 206 (no two men on a team called the
 * same thing) lives in simInventedNames section 6, next to the real-name
 * wall it is a sibling of.
 *
 * Round 211 widened this file past Club Manager: the four GM leagues get
 * the same watch, because they are closed worlds too and nothing was
 * checking that their wins matched their defeats either.
 *
 * Run: node scripts/simBooks.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'booksEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'books.bundle.mjs');

/* The shim has to run BEFORE the module is evaluated, so the import is
   dynamic: a static `export * from` is hoisted above it and the engine's
   own module-level storage read blows up on node. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const { startCareer, playNextEntry, finishSeason, startNextSeason, buildMarket, buyPlayer } = cm;

let failures = 0;
const seen = new Set();
/** One line per distinct fault: a broken invariant repeats every week. */
const fail = msg => {
  const key = msg.replace(/\d+/g, '#');
  failures += 1;
  if (seen.has(key)) return;
  seen.add(key);
  console.error('  FAIL: ' + msg);
};

/* ---------- 1. the table ---------- */
function auditTable(rows, where) {
  if (!rows || !rows.length) return;
  for (const r of rows) {
    if (r.pts !== r.w * 3 + r.d) fail(`${where}: ${r.club} has ${r.pts} points off ${r.w}W ${r.d}D`);
    if (r.w < 0 || r.d < 0 || r.l < 0 || r.gf < 0 || r.ga < 0) fail(`${where}: ${r.club} has a negative column`);
  }
  /* Every goal scored in a league was conceded in the same league, every
     win was somebody's defeat, and a draw always comes in pairs. */
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  if (sum('gf') !== sum('ga')) fail(`${where}: ${sum('gf')} goals scored against ${sum('ga')} conceded`);
  if (sum('w') !== sum('l')) fail(`${where}: ${sum('w')} wins against ${sum('l')} defeats`);
  if (sum('d') % 2 !== 0) fail(`${where}: ${sum('d')} draws, which cannot be an odd number`);
  const names = rows.map(r => r.club);
  if (new Set(names).size !== names.length) fail(`${where}: a club appears twice in the table`);
}

/* ---------- 2. the squad ---------- */
function auditSquad(s, where) {
  const ids = s.squad.map(p => p.id);
  if (new Set(ids).size !== ids.length) fail(`${where}: two players share an id`);
  for (const p of s.squad) {
    if (p.seasonGoals < 0 || p.seasonAssists < 0) fail(`${where}: ${p.name} has negative season figures`);
    if (p.fitness < 0 || p.fitness > 100) fail(`${where}: ${p.name} has ${p.fitness} fitness`);
    if (p.injuryWeeks < 0) fail(`${where}: ${p.name} is injured for ${p.injuryWeeks} weeks`);
  }
  const idSet = new Set(ids);
  for (const id of s.xiIds) {
    if (id && !idSet.has(id)) fail(`${where}: the eleven names ${id}, who is not in the squad`);
  }
  const picked = s.xiIds.filter(Boolean);
  if (new Set(picked).size !== picked.length) fail(`${where}: the same man is picked in two positions`);
}

console.log('1) The table, the squad and the market, every week of every season');
let weeks = 0, seasons = 0, careers = 0, windows = 0, signings = 0;
for (const club of ['Everton', 'Coventry City', 'Real Madrid']) {
  let s = startCareer(club);
  careers += 1;
  for (let season = 0; season < 3; season += 1) {
    let guard = 0;
    while (guard < 260) {
      guard += 1;
      const res = playNextEntry(s, { skipHalftime: true });
      s = res.state;
      const where = `${club} s${season}w${s.week}`;
      auditTable(s.table, where);
      /* The other leagues of the world and every Champions League group,
         not just my own table: they are simulated by the same code and are
         just as capable of drifting. */
      for (const [id, wl] of Object.entries(s.world ?? {})) auditTable(wl.table, `${where} ${id}`);
      if (s.uclGroup) auditTable(s.uclGroup.table, `${where} UCL group A`);
      for (const g of s.uclWorld ?? []) auditTable(g.table, `${where} UCL group ${g.letter}`);
      auditSquad(s, where);
      weeks += 1;

      /* ---------- 3. the market ---------- */
      if (s.transferWindow) {
        const market = buildMarket(s);
        windows += 1;
        const mine = new Set(s.squad.map(p => p.name));
        for (const mp of market) {
          if (mine.has(mp.name)) fail(`${where}: the market is selling me ${mp.name}, who is already mine`);
          if ((s.goneNames ?? []).includes(mp.name)) fail(`${where}: ${mp.name} is gone and back on the shelf`);
        }
        const names = market.map(m => m.name);
        if (new Set(names).size !== names.length) fail(`${where}: the same man is listed twice`);

        /* Actually sign somebody, because a market that is only read is
           half a market. Cheapest affordable, so the test can always
           afford it and never bankrupts the save. */
        const target = market.filter(m => m.price <= s.budget).sort((a, b) => a.price - b.price)[0];
        if (target && s.squad.length < 30) {
          const beforeSize = s.squad.length;
          const beforeBudget = s.budget;
          const next = buyPlayer(s, target);
          if (next) {
            s = next;
            signings += 1;
            if (s.squad.length !== beforeSize + 1) fail(`${where}: signing ${target.name} moved the squad from ${beforeSize} to ${s.squad.length}`);
            if (s.budget > beforeBudget) fail(`${where}: signing ${target.name} made money`);
            if (!s.squad.some(p => p.name === target.name)) fail(`${where}: ${target.name} was paid for and never arrived`);
            if (buildMarket(s).some(m => m.name === target.name)) fail(`${where}: ${target.name} is still on the shelf after being bought`);
            auditSquad(s, `${where} post-signing`);
          }
        }
      }

      if (s.pendingSummary || res.kind === 'seasonEnd' || res.kind === 'seasonOver') break;
    }
    seasons += 1;
    try {
      const fin = finishSeason(s);
      s = startNextSeason(fin.state ?? fin);
    } catch (e) {
      fail(`${club} s${season}: the rollover threw ${e.message}`);
      break;
    }
    /* A sacking is a real ending, not a fault: the save is over. */
    if (s.sacked) break;
    auditTable(s.table, `${club} s${season} fresh table`);
    auditSquad(s, `${club} s${season} fresh squad`);
  }
}
console.log(`   ${careers} careers, ${seasons} seasons, ${weeks} week snapshots, ${windows} open windows, ${signings} signings made`);

/* ---------- 4. the table really does move ---------- */
console.log('2) And the books are not balancing because nothing happens');
{
  /* Every rule above is trivially true of an empty table, so the sample
     has to be shown to contain real football. */
  let s = startCareer('Everton');
  let guard = 0;
  while (guard < 200 && s.table.reduce((a, r) => a + r.w + r.d + r.l, 0) < 300) {
    guard += 1;
    s = playNextEntry(s, { skipHalftime: true }).state;
  }
  const played = s.table.reduce((a, r) => a + r.w + r.d + r.l, 0);
  const goals = s.table.reduce((a, r) => a + r.gf, 0);
  const worlds = Object.keys(s.world ?? {}).length;
  if (played < 300) fail(`only ${played} club-matches played in 200 entries, the sample is too thin`);
  if (goals < 300) fail(`${played} club-matches produced ${goals} goals, which is not football`);
  if (worlds < 1) fail('the rest of the world never got a table, so most of section 1 checked nothing');
  console.log(`   ${played} club-matches, ${goals} goals and ${worlds} other leagues in the control sample, so the balance means something`);
}

/* ---------- 4. Round 211: the same watch on the four GM leagues ---------- */
console.log('3) The four front office leagues add up too');
{
  /* Round 211 found the same man twice in a third of new GM leagues, which
     is fixed and guarded in simInventedNames. While that probe was running
     it checked a dozen other things that turned out to be fine, and those
     are fenced here for the same reason section 1 fences Club Manager: an
     invariant nobody is watching is an invariant that will break quietly.
     A GM league is a CLOSED world, which makes these checkable: every win
     is somebody's defeat, every man has exactly one employer, and nobody
     is rated 140 or paid a negative salary. */
  const FO_ENTRY = path.join(os.tmpdir(), 'booksFoEntry.mjs');
  const FO_BUNDLE = path.join(os.tmpdir(), 'booksFo.bundle.mjs');
  fs.writeFileSync(FO_ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/frontOffice.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbFrontOffice.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaFrontOffice.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlFrontOffice.ts');
export { nfl, mlb, nba, nhl };
`);
  execSync(`"${ROOT}/node_modules/.bin/esbuild" "${FO_ENTRY}" --bundle --format=esm --platform=node --outfile="${FO_BUNDLE}" --log-level=error`, { stdio: 'inherit' });
  const fo = await import(pathToFileURL(FO_BUNDLE).href);

  function auditGm(tag, lg) {
    const ids = [];
    for (const [abbr, t] of Object.entries(lg.teams)) {
      if (t.abbr !== abbr) fail(`${tag}: ${abbr} is filed under ${t.abbr}`);
      if (t.wins < 0 || t.losses < 0) fail(`${tag}: ${abbr} has a negative record`);
      if (!t.players.length) fail(`${tag}: ${abbr} has nobody on the roster`);
      for (const p of t.players) {
        ids.push(p.id);
        if (!Number.isFinite(p.ovr) || p.ovr < 1 || p.ovr > 99) fail(`${tag}: ${p.name} is rated ${p.ovr}`);
        if (!Number.isFinite(p.salary) || p.salary < 0) fail(`${tag}: ${p.name} is paid ${p.salary}`);
        if (!Number.isFinite(p.age) || p.age < 15 || p.age > 50) fail(`${tag}: ${p.name} is ${p.age} years old`);
        if (p.out < 0) fail(`${tag}: ${p.name} is injured for ${p.out} weeks`);
        if (p.years < 0) fail(`${tag}: ${p.name} has ${p.years} years on his deal`);
      }
    }
    for (const p of lg.freeAgents) ids.push(p.id);
    if (new Set(ids).size !== ids.length) fail(`${tag}: two men share an id`);
    /* A closed league: every win came out of somebody else's column. */
    const w = Object.values(lg.teams).reduce((a, t) => a + t.wins, 0);
    const l = Object.values(lg.teams).reduce((a, t) => a + t.losses, 0);
    if (w !== l) fail(`${tag}: ${w} wins against ${l} defeats`);
  }

  let leagues = 0, seasons = 0;
  {
    /* The NFL board's own loop: injuries, AI moves, then the week's games. */
    const lg = fo.nfl.initLeague();
    leagues += 1;
    auditGm('NFL fresh', lg);
    for (let w = 1; w <= fo.nfl.REGULAR_WEEKS; w += 1) {
      fo.nfl.injuryPass(lg.teams, Math.random);
      fo.nfl.aiWeeklyMoves(lg, Object.keys(lg.teams)[0], Math.random);
      lg.schedule[lg.week - 1] = lg.schedule[lg.week - 1].map(g => fo.nfl.simGame(g, lg.teams, Math.random));
      lg.week += 1;
      auditGm(`NFL w${w}`, lg);
    }
    fo.nfl.runOffseason(lg, Math.random);
    fo.nfl.replenishRosters(lg, Math.random);
    seasons += 1;
    auditGm('NFL after the summer', lg);
  }
  for (const [tag, mod, init, offseason] of [
    ['MLB', fo.mlb, 'initMlbLeague', lg => fo.mlb.mlbOffseason(lg, Math.random)],
    ['NBA', fo.nba, 'initNbaLeague', lg => fo.nba.nbaOffseason(lg, Math.random)],
    ['NHL', fo.nhl, 'initNhlLeague', lg => fo.nhl.nhlOffseason(lg, Math.random)],
  ]) {
    const lg = mod[init]();
    leagues += 1;
    auditGm(`${tag} fresh`, lg);
    for (let season = 0; season < 3; season += 1) {
      offseason(lg);
      seasons += 1;
      auditGm(`${tag} summer ${season + 1}`, lg);
    }
  }
  console.log(`   ${leagues} GM leagues, ${seasons} summers, every roster, contract and record consistent`);
}

console.log('');
if (failures > 0) {
  console.error(`simBooks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simBooks: green. Every number these games show agrees with every other number they show.');
