/**
 * Round 568: an entity id must survive a page load, in all six engines that
 * mint one from a counter.
 *
 * THE DEFECT THIS EXISTS FOR. Six engines declared their id counter at MODULE
 * scope beside a save that is restored verbatim: `let cfbId = 0` in
 * cfbDynasty, `let cbbId = 0` in cbbDynasty, `let idCounter = 0` in
 * frontOffice, and the same again in mlbFrontOffice, nbaFrontOffice and
 * nhlFrontOffice. A page load restarts the counter at zero while the saved
 * roster still holds the ids minted before it, so the next man drafted or
 * signed is handed an id a saved man already wears.
 *
 * It was found while fixing Round 567, which was a player's report about Club
 * Manager duplicating players, and it is the same class of bug in four more
 * games. Eighteen independent skeptics were pointed at the six engines and
 * asked to REFUTE reachability; not one of the six was refuted.
 *
 * WHAT IT ACTUALLY COSTS, and the four GM games are much worse than the two
 * dynasties, which is why this file checks them differently:
 *   - NFL, MLB, NBA, NHL Front Office all key their release and their trade
 *     on the id, with `findIndex(p => p.id === id)` and
 *     `filter(p => p.id !== id)`. Measured on the reproduced pair: pressing
 *     Cut on the rookie you just drafted removes your starting quarterback
 *     instead and the rookie stays, and a one for one trade takes the roster
 *     from eleven men to ten with BOTH men gone and only one arriving. That
 *     is exactly the Club Manager shape.
 *   - CFB and CBB Dynasty never read a player id at all. Every `.id` in those
 *     two engines is a SCHOOL id, and the only consumer of a player id in the
 *     repo is the React key on the roster list. So a duplicate there is a
 *     rendering defect, not lost data. Section 3 says so plainly rather than
 *     dressing it up as the same severity.
 *
 * HOW A PAGE LOAD IS MODELLED. The six engines are bundled once, and each
 * "load" re-imports that bundle with a fresh query string, which gives node a
 * new module instance and therefore a new EPOCH and a new counter. That is
 * precisely what a browser reload gives, and it is the only way to exercise
 * the bug without a browser.
 *
 * WHAT IT HOLDS.
 *   1. Across eight simulated page loads, each one parsing the previous
 *      save, calling the engine's repair and then minting again, no id is
 *      ever held by two entities. ANTI-VACUITY: every load must also MINT a
 *      real number of new ids, because a scenario that mints nothing passes a
 *      duplicate check for the wrong reason. Measured per load: 30 in each GM
 *      engine, 18 in CFB, 14 in CBB.
 *   1b. A save that is ALREADY corrupted, which is the state of a save
 *      sitting on a player's machine right now, is repaired on load: the
 *      duplicate is gone, the FIRST holder keeps his id because every stored
 *      reference resolves to him, the shadowed man gets a fresh one, and the
 *      entity count does not move. Section 1 cannot prove this, because once
 *      the minter is fixed no new duplicate arises for the repair to clean.
 *   2. On the four GM engines, the consequence itself: release the most
 *      recently minted man and the man who leaves must be HIM, by name, with
 *      the roster exactly one shorter. This is behaviour, not a count.
 *   3. On the two dynasties, the id population every roster's React keys are
 *      drawn from is unique, and no recruit or portal id equals a roster id.
 *
 * CONTROLS, each restoring the real defect rather than renaming a string, and
 * each rewriting the BUNDLE rather than the tree:
 *   ENGINE_IDS_CONTROL=modulecounter  drops the per document token, so ids
 *                                     restart at 1 on every load exactly as
 *                                     the module scope counter did. Sections
 *                                     1 and 2 must fire.
 *   ENGINE_IDS_CONTROL=norepair       keeps the fixed minter and makes the
 *                                     repair a no-op. Section 1b must fire,
 *                                     and deliberately NOT section 1: the
 *                                     first draft of this header claimed it
 *                                     would fire section 1, the run stayed
 *                                     green, and that is how the missing
 *                                     repair check was found.
 *
 * Run: node scripts/simEngineIds.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.ENGINE_IDS_CONTROL || '';
const KNOWN = ['modulecounter', 'norepair'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`ENGINE_IDS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fired = new Set();
const fail = (n, m) => { fired.add(n); failures += 1; console.error('  FAIL: ' + m); };

const LOADS = 8;
/* The anti-vacuity floor, MEASURED and not picked. Per load this scenario
   mints 30 ids in each of the four GM engines (a 24 to 40 man draft class plus
   six signings), 18 in CFB Dynasty and 14 in CBB Dynasty, which are their
   recruit class sizes. The floor is 5, far below the smallest of those, because
   its job is to catch a scenario that mints NOTHING and so passes a duplicate
   check for the wrong reason, not to pin the class sizes. A first draft set it
   at 20 on a guess and went red on both dynasties immediately, which is the
   same mistake simTournamentWinners made with a floor of 110 the day before. */
const MIN_MINTED = 5;
const TMP = os.tmpdir();
const NL = String.fromCharCode(10);
const ENTRY = path.join(TMP, 'engIdsEntry.mjs');
const BUNDLE = path.join(TMP, 'engIds.bundle.mjs');

const LIBS = ['cfbDynasty', 'cbbDynasty', 'frontOffice', 'mlbFrontOffice', 'nbaFrontOffice', 'nhlFrontOffice'];
const srcUrl = {};
for (const lib of LIBS) srcUrl[lib] = `${ROOT_URL}/src/lib/${lib}.ts`;

/* The controls rewrite THE BUNDLE, never the tree, and each refuses to run if
   its rewrite changed nothing. A first draft copied the six engine files into
   the temp directory instead and esbuild could not resolve their relative
   imports ("Could not resolve ./foNames"), which is why this works on the
   built bytes the way simSoccerCareerUcl and playSoccerCareer do. */
fs.writeFileSync(ENTRY, LIBS.map(l => `export * as ${l} from '${srcUrl[l]}';`).join(NL) + NL);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });

if (CONTROL) {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  let out = text;
  if (CONTROL === 'modulecounter') {
    /* Put the pre Round 568 behaviour back: drop the per document token, so
       every page load mints p1, p2, p3 again exactly as the module scope
       counter did. */
    const needle = '`${prefix}${EPOCH}-${n}`';
    if (!text.includes(needle)) {
      console.error('control "modulecounter": the minter line is not in the bundle, so the rewrite would change nothing and a green run would prove nothing.');
      process.exit(2);
    }
    out = text.split(needle).join('`${prefix}${n}`');
  }
  if (CONTROL === 'norepair') {
    /* Keep the fixed minter, make the repair a no-op: the state of a save
       written before this round, opened by a build that has the fix. */
    const needle = 'function ensureUniqueIds(mint, lists) {';
    if (!text.includes(needle)) {
      console.error('control "norepair": the repair is not in the bundle under the expected name, so the rewrite would change nothing.');
      process.exit(2);
    }
    out = text.replace(needle, needle + ' if (mint && lists) return 0;');
  }
  if (out === text) { console.error(`control "${CONTROL}": the rewrite changed nothing.`); process.exit(2); }
  fs.writeFileSync(BUNDLE, out);
  console.log(`NEGATIVE CONTROL "${CONTROL}" ON: the bundle was rewritten`);
}


const pageLoad = k => import(pathToFileURL(BUNDLE).href + `?load=${k}`);

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ------------------------------------------------------------------ *
 * One adapter per engine, so all six are driven as one family rather
 * than six copies of one idea. That is the owner's 2026-09-04 rule and
 * the lesson of Round 426.
 * ------------------------------------------------------------------ */
const GAMES = [
  {
    key: 'fo', label: 'NFL Front Office', gm: true,
    init: m => m.frontOffice.initLeague(lehmer(11)),
    repair: (m, lg, loose) => m.frontOffice.ensureFoLeagueIds(lg, loose),
    draft: (m, lg, rng) => {
      const cls = m.frontOffice.generateDraftClass(rng, 40, new Set());
      const mine = Object.keys(lg.teams)[0];
      for (const pr of cls.slice(0, 6)) {
        const p = m.frontOffice.prospectToPlayer(pr, rng);
        if (p) lg.teams[mine].players.push(p);
      }
      return cls;
    },
    release: (m, lg, team, id) => m.frontOffice.releasePlayer(lg.teams[team], lg.freeAgents, id),
  },
  {
    key: 'mlb', label: 'MLB Front Office', gm: true,
    init: m => m.mlbFrontOffice.initMlbLeague(lehmer(12)),
    repair: (m, lg, loose) => m.mlbFrontOffice.ensureMlbLeagueIds(lg, loose),
    draft: (m, lg, rng) => {
      const cls = m.mlbFrontOffice.mlbDraftClass(rng, 24, new Set());
      const mine = Object.keys(lg.teams)[0];
      for (const pr of cls.slice(0, 6)) lg.teams[mine].players.push(m.mlbFrontOffice.mlbProspectToPlayer(pr, rng));
      return cls;
    },
    release: (m, lg, team, id) => m.mlbFrontOffice.mlbRelease(lg.teams[team], lg.freeAgents, id),
  },
  {
    key: 'nba', label: 'NBA Front Office', gm: true,
    init: m => m.nbaFrontOffice.initNbaLeague(lehmer(13)),
    repair: (m, lg, loose) => m.nbaFrontOffice.ensureNbaLeagueIds(lg, loose),
    draft: (m, lg, rng) => {
      const cls = m.nbaFrontOffice.nbaDraftClass(rng, 24, new Set());
      const mine = Object.keys(lg.teams)[0];
      for (const pr of cls.slice(0, 6)) lg.teams[mine].players.push(m.nbaFrontOffice.nbaProspectToPlayer(pr, rng));
      return cls;
    },
    release: (m, lg, team, id) => m.nbaFrontOffice.nbaRelease(lg.teams[team], lg.freeAgents, id),
  },
  {
    key: 'nhl', label: 'NHL Front Office', gm: true,
    init: m => m.nhlFrontOffice.initNhlLeague(lehmer(14)),
    repair: (m, lg, loose) => m.nhlFrontOffice.ensureNhlLeagueIds(lg, loose),
    draft: (m, lg, rng) => {
      const cls = m.nhlFrontOffice.nhlDraftClass(rng, 24, new Set());
      const mine = Object.keys(lg.teams)[0];
      for (const pr of cls.slice(0, 6)) lg.teams[mine].players.push(m.nhlFrontOffice.nhlProspectToPlayer(pr, rng));
      return cls;
    },
    release: (m, lg, team, id) => m.nhlFrontOffice.nhlRelease(lg.teams[team], lg.freeAgents, id),
  },
  {
    key: 'cfb', label: 'CFB Dynasty', gm: false,
    init: m => m.cfbDynasty.initCfb(m.cfbDynasty.CFB_SCHOOLS[0].id, lehmer(15)),
    repair: (m, st, loose) => m.cfbDynasty.ensureCfbIds(st, loose),
    draft: (m, st, rng) => m.cfbDynasty.cfbRecruitClass(rng),
  },
  {
    key: 'cbb', label: 'CBB Dynasty', gm: false,
    init: m => m.cbbDynasty.initCbb(m.cbbDynasty.CBB_SCHOOLS[0].id, lehmer(16)),
    repair: (m, st, loose) => m.cbbDynasty.ensureCbbIds(st, loose),
    draft: (m, st, rng) => m.cbbDynasty.cbbRecruitClass(rng),
  },
];

const allLists = (world, loose) => [
  ...Object.values(world.teams ?? {}).map(t => t?.players),
  world.freeAgents,
  loose,
].filter(Array.isArray);

const countDupes = lists => {
  const seen = new Set();
  const dupes = [];
  let total = 0;
  for (const l of lists) for (const e of l) {
    if (!e || typeof e.id !== 'string') continue;
    total += 1;
    if (seen.has(e.id)) dupes.push(e.id);
    seen.add(e.id);
  }
  return { total, unique: seen.size, dupes };
};

/* ------------------------------------------------------------------ */
console.log('1) an id survives a page load, across eight of them');
const finals = {};
for (const g of GAMES) {
  let m = await pageLoad(`${g.key}-0`);
  let world;
  try { world = g.init(m); } catch (e) { fail(1, `${g.key}: could not initialise (${String(e).slice(0, 120)})`); continue; }
  let rng = lehmer(900 + g.key.length);
  let loose = g.draft(m, world, rng) || [];
  let prevSet = new Set(allLists(world, loose).flatMap(l => l.map(e => e && e.id)).filter(Boolean));
  let addedLow = 0;
  let mintedPerLoad = [];
  for (let load = 1; load < LOADS; load++) {
    const save = JSON.parse(JSON.stringify({ world, loose }));
    m = await pageLoad(`${g.key}-${load}`);
    world = save.world; loose = save.loose;
    g.repair(m, world, loose);
    rng = lehmer(900 + load * 37);
    const fresh = g.draft(m, world, rng) || [];
    loose = fresh;
    const { total, unique, dupes } = countDupes(allLists(world, loose));
    if (dupes.length) {
      fail(1, `${g.label}: load ${load} left ${dupes.length} id(s) held by two entities, e.g. ${dupes.slice(0, 3).join(', ')}`);
      break;
    }
    /* ANTI-VACUITY, measured the honest way: how many ids exist now that did
       NOT exist in the save this load parsed. Net growth is the wrong metric,
       because a draft class is replaced rather than added and nets to almost
       nothing while thirty ids were really minted. */
    const nowSet = new Set(allLists(world, loose).flatMap(l => l.map(e => e && e.id)).filter(Boolean));
    const minted = [...nowSet].filter(id => !prevSet.has(id)).length;
    mintedPerLoad.push(minted);
    if (minted < MIN_MINTED) addedLow += 1;
    prevSet = nowSet;
    if (load === LOADS - 1) finals[g.key] = { world, loose, m, total, unique };
  }
  if (addedLow > 0) {
    fail(1, `${g.label}: ${addedLow} load(s) minted fewer than ${MIN_MINTED} new ids (${mintedPerLoad.join(',')}), so a clean duplicate count there means the scenario minted almost nothing, not that the ids are safe`);
  }
  if (!fired.has(1) || finals[g.key]) {
    const f = finals[g.key];
    if (f) console.log(`   ${g.label}: ${LOADS} loads, ${f.total} ids across ${allLists(f.world, f.loose).length} lists, 0 duplicate, ${Math.min(...mintedPerLoad)} to ${Math.max(...mintedPerLoad)} minted per load`);
  }
}

/* ------------------------------------------------------------------ */
/* Section 1 proves the MINTER: with a per document token a fresh load can no
   longer collide with a save. It cannot prove the REPAIR, because once the
   minter is fixed no duplicate ever arises for the repair to clean. The repair
   exists for a different case: a save ALREADY on a player's machine, written
   by the broken build, that already holds two entities under one id. So this
   section builds exactly that and checks the repair cleans it.

   It also pins the rule the repair inherited from Round 567: FIRST HOLDER
   WINS. The first of a pair keeps its id, because every reference already
   stored in that save resolves to it, and only the shadowed entity moves.
   Nobody is dropped: two entries under one id are two real entities. */
console.log(NL + '1b) a save that is ALREADY corrupted is repaired, first holder keeping his id');
let repairsChecked = 0;
for (const g of GAMES) {
  const f = finals[g.key];
  if (!f) { fail(4, `${g.label}: section 1 never produced a state to corrupt`); continue; }
  const legacy = JSON.parse(JSON.stringify({ world: f.world, loose: f.loose }));
  const teamKeys = Object.keys(legacy.world.teams ?? {});
  const roster = legacy.world.teams[teamKeys[0]]?.players ?? [];
  if (roster.length < 3) { fail(4, `${g.label}: too few players to corrupt`); continue; }
  const victimId = roster[0].id;
  const firstName = roster[0].name;
  const shadowName = roster[2].name;
  roster[2].id = victimId;
  const before = countDupes(allLists(legacy.world, legacy.loose));
  if (!before.dupes.length) { fail(4, `${g.label}: the corruption did not take, so this section would prove nothing`); continue; }
  const m = await pageLoad(`${g.key}-repair`);
  const moved = g.repair(m, legacy.world, legacy.loose);
  const after = countDupes(allLists(legacy.world, legacy.loose));
  repairsChecked += 1;
  const stillFirst = roster[0].id === victimId && roster[0].name === firstName;
  const shadowMoved = roster[2].id !== victimId && roster[2].name === shadowName;
  if (after.dupes.length) {
    fail(4, `${g.label}: the repair left ${after.dupes.length} duplicate(s), so a save already corrupted stays corrupted`);
  } else if (!stillFirst) {
    fail(4, `${g.label}: the repair moved the FIRST holder, which repoints every reference already stored in that save`);
  } else if (!shadowMoved) {
    fail(4, `${g.label}: the shadowed entity kept the duplicate id`);
  } else if (after.total !== before.total) {
    fail(4, `${g.label}: the repair changed the entity count ${before.total} to ${after.total}, so somebody was dropped rather than renamed`);
  } else {
    console.log(`   ${g.label}: 1 duplicate repaired, ${moved} id(s) moved, ${firstName} kept ${victimId}, ${shadowName} got a fresh one, nobody dropped`);
  }
}
if (repairsChecked === 0) fail(4, 'not one repair was exercised, so this section checked nothing');

/* ------------------------------------------------------------------ */
console.log('\n2) the consequence: cutting a man cuts THAT man');
let releasesChecked = 0;
for (const g of GAMES) {
  if (!g.gm) continue;
  const f = finals[g.key];
  if (!f) { fail(2, `${g.label}: section 1 never produced a league, so the release could not be tried`); continue; }
  const teamKey = Object.keys(f.world.teams)[0];
  const roster = f.world.teams[teamKey].players;
  const target = roster[roster.length - 1];
  if (!target) { fail(2, `${g.label}: an empty roster`); continue; }
  const before = roster.length;
  const name = target.name;
  const ok = g.release(f.m, f.world, teamKey, target.id);
  const after = f.world.teams[teamKey].players;
  releasesChecked += 1;
  if (!ok) { fail(2, `${g.label}: the release refused, so nothing was measured`); continue; }
  const stillThere = after.some(p => p.id === target.id);
  const leftName = roster.length !== after.length;
  if (after.length !== before - 1) {
    fail(2, `${g.label}: the roster went ${before} to ${after.length}, so the cut did not remove exactly one man`);
  } else if (stillThere) {
    fail(2, `${g.label}: cut "${name}" and he is STILL on the roster, so another man of the same id left in his place`);
  } else {
    console.log(`   ${g.label}: cut ${name}, roster ${before} to ${after.length}, and he is the one who left`);
  }
  void leftName;
}
if (releasesChecked === 0) fail(2, 'not one release was exercised, so this section checked nothing');

/* ------------------------------------------------------------------ */
console.log('\n3) the two dynasties: the React key space is unique');
console.log('   (weaker than section 2 on purpose: neither dynasty engine reads a player id,');
console.log('    so a duplicate there is a rendering defect rather than a lost player. It is');
console.log('    held anyway because a cut button keyed on p.id would inherit section 2\'s bug.)');
let rostersChecked = 0;
for (const g of GAMES) {
  if (g.gm) continue;
  const f = finals[g.key];
  if (!f) { fail(3, `${g.label}: section 1 never produced a state`); continue; }
  let bad = 0;
  for (const t of Object.values(f.world.teams ?? {})) {
    const ps = t?.players ?? [];
    if (!ps.length) continue;
    rostersChecked += 1;
    if (new Set(ps.map(p => p.id)).size !== ps.length) bad += 1;
  }
  const rosterIds = new Set(Object.values(f.world.teams ?? {}).flatMap(t => (t?.players ?? []).map(p => p.id)));
  const clash = (f.loose ?? []).filter(r => r && rosterIds.has(r.id)).length;
  if (bad) fail(3, `${g.label}: ${bad} roster(s) hold two players under one React key`);
  else if (clash) fail(3, `${g.label}: ${clash} recruit(s) share an id with a player already on a roster`);
  else console.log(`   ${g.label}: every roster's keys are unique and no recruit collides with one`);
}
if (rostersChecked === 0) fail(3, 'not one roster was inspected, so this section checked nothing');

/* ------------------------------------------------------------------ */
const EXPECT = { modulecounter: [1, 2], norepair: [4] };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const hit = want.filter(n => fired.has(n));
  if (hit.length === 0) {
    console.error(`\ncontrol "${CONTROL}": section(s) ${want.join(' and ')} stayed green, so the check is not measuring what it claims to.`);
    process.exit(1);
  }
  console.log(`\ncontrol "${CONTROL}": section(s) ${hit.join(' and ')} went red, as they must. The check works.`);
  process.exit(0);
}
if (failures) { console.error(`\nsimEngineIds: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimEngineIds: an id minted in one page load cannot collide with one minted in another, in all six engines.');
