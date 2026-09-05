/* Build Your XI: a goalkeeper cannot take an outfield slot, and the slots are
   still fillable.

   Round 442. The owner put Marc-André ter Stegen in a centre midfield slot and
   the game accepted him. Build Your XI was the only lineup game on the site
   with no position rule of its own: it posted the slot's role to the
   validate-player edge function and asked a language model, in prose, to refuse
   a keeper at CM (Round 315). A prompt is a request, not a gate. The NBA lineup
   builder had already solved the identical problem deterministically in
   useNbaLineup.isPositionEligibleForSlot, and World XI has carried a real rule
   since Round 319. Round 442 lifted World XI's rule into src/lib/positionFit.ts
   and Build Your XI now runs it on the row the player actually picked, before
   any network call.

   Everything below runs the REAL module, bundled with esbuild, against the REAL
   pools the game offers, fetched live.

     1) THE OWNER'S CASE, END TO END. The real searchPlayers, with the real
        Barcelona-scoped source the page builds, is asked for "ter stegen"; the
        position on the row it returns goes into the real checkLineupPick for
        every slot of all six formations. Goal is the only slot that takes him.
     2) THE BOUNDARY HOLDS OVER THE WHOLE POOL. Every player the game can offer
        for any of its 55 teams, against every slot of every formation: no
        keeper is accepted outside goal and nobody but a keeper is accepted in
        goal.
     3) IT AGREES WITH WORLD XI. For every position and every slot the two games
        share, checkLineupPick and worldXi.fitsSlot return the same answer, and
        the cases World XI settled by hand still hold (Round 319's LWB that must
        not reach a front line RW, Round 345's history that must never carry a
        keeper outfield).
     4) THE SLOTS ARE STILL FILLABLE. Eligible player counts are measured for
        all 55 teams times 15 roles. A rule so tight a slot cannot be filled is
        its own bug, so the floor is measured, not guessed.
     5) THE SEASON REPORT IS NOT WALLPAPER. His second complaint was that the
        result was bland, so Round 442 put World XI's season sim on the end of
        Build Your XI. A season that reads the same for every squad would be
        blander still, so an expensive XI must finish higher and score more than
        a cheap one, by a margin measured over hundreds of seeded squads.

   NEGATIVE CONTROL, and it reproduces the defect this round fixed rather than
   an invented one: SIM_LINEUP_POSITIONS_CONTROL=shipped restores the shipped
   acceptance by making checkLineupPick accept every pick in a bundled copy of
   positionFit.ts, which is exactly what Build Your XI did before this round
   (no local rule at all, only the prompt). Section 1 must then go red on ter
   Stegen at centre mid, by name. The control refuses to run if the text it
   rewrites is not in the file.

   Run: node scripts/simLineupPositions.mjs   (needs the database)
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replace(/\\/g, '/');

const CONTROL = process.env.SIM_LINEUP_POSITIONS_CONTROL || '';
if (CONTROL && CONTROL !== 'shipped') {
  console.error(`SIM_LINEUP_POSITIONS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------------- bundle the real modules ---------------- */

let POSITION_FIT = `${ROOT_URL}/src/lib/positionFit.ts`;
if (CONTROL === 'shipped') {
  // CRLF trap: a fresh checkout of this repo is CRLF, so normalise before
  // matching or the needle is never found and the control silently does
  // nothing while the harness stays green.
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/positionFit.ts'), 'utf8').replace(/\r\n/g, '\n');
  const from = '  if (fitsAllowed(primary, allowed)) return { ok: true };';
  if (!src.includes(from)) {
    console.error('control cannot run: positionFit.ts is not in the shape this control rewrites');
    process.exit(1);
  }
  POSITION_FIT = `${TMP}/positionFit.control.ts`;
  fs.writeFileSync(POSITION_FIT, src.replace(from, '  if (true) return { ok: true };'));
  console.log('NEGATIVE CONTROL ON: checkLineupPick accepts every pick, the shape the game shipped in');
}

const ENTRY = `${TMP}/lineupPositions.entry.mjs`;
const BUNDLE = `${TMP}/lineupPositions.bundle.mjs`;
/* The stub has to be in place BEFORE the modules evaluate, and a static import
   is hoisted above it, so every one of these is a dynamic import. This is the
   same shape simWorldXiPositions uses. */
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export const fit = await import('${POSITION_FIT}');`,
  `export const squadDeal = await import('${ROOT_URL}/src/lib/squadDeal.ts');`,
  `export const worldXi = await import('${ROOT_URL}/src/lib/worldXi.ts');`,
  `export const teams = await import('${ROOT_URL}/src/data/lineupTeams.ts');`,
  `export const lineupTypes = await import('${ROOT_URL}/src/types/lineupBuilder.ts');`,
  `export const search = await import('${ROOT_URL}/src/lib/playerSearch.ts');`,
  `export const { supabase } = await import('${ROOT_URL}/src/integrations/supabase/client.ts');`,
  '',
].join('\n'));
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const mod = await import(pathToFileURL(BUNDLE).href);
const { checkLineupPick, fitsAllowed, SLOT_ALLOWED_BY_ROLE, ALL_POSITIONS } = mod.fit;
const { normalizePosition } = mod.squadDeal;
const { fitsSlot, simulateWorldXiSeason } = mod.worldXi;
const { clubs, nations, clubSearchTerm, nationSearchTerm } = mod.teams;
const { FORMATIONS } = mod.lineupTypes;
const { searchPlayers, SOCCER_MARKET_VALUE_SOURCE, normalizeName } = mod.search;
const supabase = mod.supabase;

const FORMATION_NAMES = Object.keys(FORMATIONS);
const ROLES = Object.keys(SLOT_ALLOWED_BY_ROLE);

/* ---------------- the pools the game can offer ---------------- */

const PAGE = 1000;

/**
 * Every distinct player the team-scoped autocomplete can hand back, with the
 * position from the row the search would keep. searchPlayers dedupes by
 * normalized name keeping the highest market value and then the most recent
 * year, so that is what is mirrored here. This is data assembly, not the rule:
 * the rule under test is the bundled module.
 */
async function fetchTeamPool(team) {
  const cols = 'player_name, position, market_value_usd, year';
  const best = new Map();
  for (let page = 0; page < 14; page++) {
    let q = supabase.from('player_market_values').select(cols);
    q = team.isNation
      ? q.eq('nationality', nationSearchTerm(team.name))
      : q.ilike('club', `%${clubSearchTerm(team.name)}%`);
    const { data, error } = await q.order('id', { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return null;
    const rows = data ?? [];
    for (const r of rows) {
      const name = (r.player_name ?? '').trim();
      if (!name) continue;
      const key = normalizeName(name);
      const value = Number(r.market_value_usd) || 0;
      const year = Number(r.year) || 0;
      const prev = best.get(key);
      if (!prev || value > prev.value || (value === prev.value && year > prev.year)) {
        best.set(key, { name, rawPosition: (r.position ?? '').trim(), value, year });
      }
    }
    if (rows.length < PAGE) break;
  }
  return [...best.values()];
}

const allTeams = [
  ...clubs.map(name => ({ name, isNation: false })),
  ...nations.map(name => ({ name, isNation: true })),
];

console.log(`Fetching the offerable pool for all ${allTeams.length} teams...`);
const pools = new Map();
for (const team of allTeams) {
  const pool = await fetchTeamPool(team);
  if (!pool) {
    console.log('SUPABASE UNREACHABLE. NOTHING WAS CHECKED.');
    console.error(`simLineupPositions: the pool for ${team.name} did not load, which is itself worth investigating`);
    process.exit(1);
  }
  pools.set(team.name, pool);
}
const poolTotal = [...pools.values()].reduce((s, p) => s + p.length, 0);
console.log(`   ${poolTotal} offerable players across ${pools.size} teams`);

/* ---------------- 1) the owner's case, end to end ---------------- */

console.log("1) the owner's case: a Barcelona search for ter Stegen, then every slot");
{
  const source = {
    ...SOCCER_MARKET_VALUE_SOURCE,
    filters: [{ column: 'club', op: 'ilike', value: clubSearchTerm('Barcelona') }],
  };
  const { results, error } = await searchPlayers({ source, query: 'ter stegen', limit: 8 });
  if (error) fail(`the real search errored: ${error}`);
  const keeper = results.find(r => normalizeName(r.name).includes('ter stegen'));
  if (!keeper) {
    fail('the real Barcelona-scoped search did not return ter Stegen at all, so nothing downstream was checked');
  } else {
    if (keeper.meta.position !== 'Goalkeeper') {
      fail(`the row the search returned calls him "${keeper.meta.position}", not Goalkeeper`);
    }
    const acceptedOutfield = [];
    let refusedGoal = 0;
    let slotsTested = 0;
    for (const name of FORMATION_NAMES) {
      for (const slot of FORMATIONS[name]) {
        slotsTested += 1;
        const verdict = checkLineupPick(keeper.name, slot.role, slot.label, keeper.meta.position, normalizePosition);
        if (slot.role === 'GK') { if (!verdict.ok) refusedGoal += 1; }
        else if (verdict.ok) acceptedOutfield.push(`${name} ${slot.label}`);
      }
    }
    if (refusedGoal > 0) fail(`${keeper.name} was refused his own GK slot ${refusedGoal} times`);
    if (acceptedOutfield.length > 0) {
      fail(`${keeper.name}, a goalkeeper, was accepted in ${acceptedOutfield.length} outfield slots: ${acceptedOutfield.slice(0, 6).join(', ')}`);
    }
    /* The exact report, named: centre midfield in a 4-3-3. */
    const cm = FORMATIONS['4-3-3'].find(s => s.role === 'CM');
    const cmVerdict = checkLineupPick(keeper.name, cm.role, cm.label, keeper.meta.position, normalizePosition);
    if (cmVerdict.ok) {
      fail(`${keeper.name} at centre mid was ACCEPTED, which is the owner's report exactly`);
    } else if (!cmVerdict.reason || !cmVerdict.reason.includes(keeper.name) || !/goalkeeper/i.test(cmVerdict.reason)) {
      fail(`the refusal does not tell him why: "${cmVerdict.reason}"`);
    } else {
      console.log(`   refused, and it says why: "${cmVerdict.reason}"`);
    }
    const acceptedGoal = FORMATION_NAMES.length - refusedGoal;
    console.log(`   ${keeper.name} tested against ${slotsTested} slots, accepted in ${acceptedGoal + acceptedOutfield.length} (${acceptedGoal} of them goal, ${acceptedOutfield.length} outfield)`);
  }
}

/* ---------------- 2) the boundary over the whole pool ---------------- */

console.log('2) no keeper outfield and no outfielder in goal, over every team and every formation');
{
  let checks = 0;
  let keepersSeen = 0;
  const keeperOutfield = [];
  const outfielderInGoal = [];
  for (const [teamName, pool] of pools) {
    for (const p of pool) {
      const primary = normalizePosition(p.rawPosition);
      if (!primary) continue;
      if (primary === 'GK') keepersSeen += 1;
      for (const fname of FORMATION_NAMES) {
        for (const slot of FORMATIONS[fname]) {
          checks += 1;
          const ok = checkLineupPick(p.name, slot.role, slot.label, p.rawPosition, normalizePosition).ok;
          if (!ok) continue;
          if (primary === 'GK' && slot.role !== 'GK') keeperOutfield.push(`${p.name} (${teamName}) at ${slot.label}`);
          if (primary !== 'GK' && slot.role === 'GK') outfielderInGoal.push(`${p.name} (${teamName}, ${primary}) in goal`);
        }
      }
    }
  }
  for (const line of keeperOutfield.slice(0, 5)) fail(`keeper accepted outfield: ${line}`);
  if (keeperOutfield.length > 5) fail(`...and ${keeperOutfield.length - 5} more keepers accepted outfield`);
  for (const line of outfielderInGoal.slice(0, 5)) fail(`outfielder accepted in goal: ${line}`);
  if (outfielderInGoal.length > 5) fail(`...and ${outfielderInGoal.length - 5} more outfielders accepted in goal`);
  console.log(`   ${checks} player-slot decisions, ${keepersSeen} of the players are keepers`);
  console.log(`   keepers accepted outfield: ${keeperOutfield.length} (must be 0), outfielders accepted in goal: ${outfielderInGoal.length} (must be 0)`);
}

/* ---------------- 3) it agrees with World XI ---------------- */

console.log('3) the same answer World XI gives, on every position and every shared slot');
{
  let compared = 0;
  const disagreements = [];
  for (const pos of ALL_POSITIONS) {
    for (const role of ROLES) {
      const allowed = SLOT_ALLOWED_BY_ROLE[role];
      const mine = fitsAllowed(pos, allowed);
      const theirs = fitsSlot({ name: 'x', country: 'x', position: pos, club: 'x', value: 1 }, { label: role, allowed });
      compared += 1;
      if (mine !== theirs) disagreements.push(`${pos} at ${role}: Build Your XI says ${mine}, World XI says ${theirs}`);
    }
  }
  for (const d of disagreements.slice(0, 8)) fail(d);
  console.log(`   ${compared} position-by-slot decisions compared, ${disagreements.length} disagreements (must be 0)`);

  /* The cases World XI settled by hand, restated here so a future widening
     cannot quietly undo them. */
  const settled = [
    ['Round 319: a left wing back must not reach a front line right wing slot', !fitsAllowed('LWB', SLOT_ALLOWED_BY_ROLE.RW)],
    ['Round 319: a left wing back must not reach a front line left wing slot', !fitsAllowed('LWB', SLOT_ALLOWED_BY_ROLE.LW)],
    ['the Raphinha case: a right winger fills a left wing slot', fitsAllowed('RW', SLOT_ALLOWED_BY_ROLE.LW)],
    ['a defensive mid fills a CM slot', fitsAllowed('CDM', SLOT_ALLOWED_BY_ROLE.CM)],
    ['a centre back can shift to right back', fitsAllowed('CB', SLOT_ALLOWED_BY_ROLE.RB)],
    ['a left back must not play centre back', !fitsAllowed('LB', SLOT_ALLOWED_BY_ROLE.CB)],
    ['a centre forward fills a striker slot', fitsAllowed('CF', SLOT_ALLOWED_BY_ROLE.ST)],
    /* Round 345 put verified history above the family. The goalkeeper boundary
       is above BOTH, so even a history row claiming a keeper played CM cannot
       put him there. */
    ['a keeper with CM history still cannot play CM', !fitsAllowed('GK', SLOT_ALLOWED_BY_ROLE.CM, ['CM'])],
    ['a midfielder with GK history still cannot play in goal', !fitsAllowed('CM', SLOT_ALLOWED_BY_ROLE.GK, ['GK'])],
  ];
  for (const [what, held] of settled) {
    if (!held) fail(`a case World XI already settled has been undone: ${what}`);
  }
  console.log(`   ${settled.length} settled cases re-checked, including the two the goalkeeper boundary outranks`);
}

/* ---------------- 4) the slots are still fillable ---------------- */

console.log('4) every team can still fill every slot');
{
  const counts = [];
  const empty = [];
  for (const [teamName, pool] of pools) {
    for (const role of ROLES) {
      let n = 0;
      for (const p of pool) {
        if (checkLineupPick(p.name, role, role, p.rawPosition, normalizePosition).ok) n += 1;
      }
      counts.push(n);
      if (n === 0) empty.push(`${teamName} has nobody for a ${role} slot`);
    }
  }
  for (const line of empty.slice(0, 8)) fail(line);
  if (empty.length > 8) fail(`...and ${empty.length - 8} more empty team-slot pairs`);

  const sorted = [...counts].sort((a, b) => a - b);
  const min = sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  /* Measured 2026-09-04 over all 55 teams times 15 roles (23,990 offerable
     players): thinnest pair 2 (South Korea has exactly two centre backs in the
     table), 10th percentile 28, median 58. Floors at half the measured value,
     per the harness convention, so ordinary drift in the data does not turn
     this red but a rule that tightened by more than half does. */
  const MEDIAN_FLOOR = 29;
  const P10_FLOOR = 14;
  if (median < MEDIAN_FLOOR) fail(`the median team-slot pair offers ${median} players, the floor is ${MEDIAN_FLOOR}`);
  if (p10 < P10_FLOOR) fail(`the 10th percentile team-slot pair offers ${p10} players, the floor is ${P10_FLOOR}`);
  console.log(`   ${counts.length} team-slot pairs: thinnest ${min}, 10th percentile ${p10}, median ${median}`);
}

/* ---------------- 5) the season report moves with the squad ---------------- */

console.log('5) the season report says something different about a better squad');
{
  /* Real players, real values, drawn from the biggest pool the game has. The
     two sides are the top of the value list against the bottom, so the only
     thing that differs between them is squad quality. */
  const wide = [...pools.values()].flat()
    .filter(p => p.value > 0 && normalizePosition(p.rawPosition))
    .sort((a, b) => b.value - a.value);
  const toWx = p => ({
    name: p.name,
    country: '',
    position: normalizePosition(p.rawPosition),
    club: '',
    value: p.value,
    age: 27,
  });
  const RUNS = 200;
  const elite = { pos: [], pts: [], trophies: 0 };
  const cheap = { pos: [], pts: [], trophies: 0 };
  const top = wide.slice(0, 400).map(toWx);
  const bottom = wide.slice(-400).map(toWx);
  for (let i = 0; i < RUNS; i++) {
    const eXi = Array.from({ length: 11 }, (_, k) => top[(i * 11 + k) % top.length]);
    const cXi = Array.from({ length: 11 }, (_, k) => bottom[(i * 11 + k) % bottom.length]);
    const e = simulateWorldXiSeason(eXi, '4-3-3');
    const c = simulateWorldXiSeason(cXi, '4-3-3');
    elite.pos.push(e.tablePosition); elite.pts.push(e.points); elite.trophies += e.trophies.length;
    cheap.pos.push(c.tablePosition); cheap.pts.push(c.points); cheap.trophies += c.trophies.length;
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const elitePos = mean(elite.pos), cheapPos = mean(cheap.pos);
  const elitePts = mean(elite.pts), cheapPts = mean(cheap.pts);
  /* Measured 2026-09-04 over 200 seeded squads a side: the elite XI averages
     2.8th with 108.0 points and 228 trophies, the cheap XI 9.8th with 59.7 and
     51, a gap of 7.0 places and 48.3 points. Floors at half. The places gap is
     the smaller of the two because the sim's 19 rivals are drawn across a wide
     strength band, so a cheap XI still lands mid-table rather than bottom; the
     points gap is the stronger signal and is checked alongside it. */
  const POS_GAP_FLOOR = 3.5;
  const PTS_GAP_FLOOR = 24;
  if (cheapPos - elitePos < POS_GAP_FLOOR) {
    fail(`the elite XI finishes only ${(cheapPos - elitePos).toFixed(1)} places above the cheap one, the floor is ${POS_GAP_FLOOR}`);
  }
  if (elitePts - cheapPts < PTS_GAP_FLOOR) {
    fail(`the elite XI scores only ${(elitePts - cheapPts).toFixed(1)} more points, the floor is ${PTS_GAP_FLOOR}`);
  }
  if (new Set(elite.pts).size < 3) fail(`${RUNS} elite squads produced ${new Set(elite.pts).size} distinct points totals, the season is wallpaper`);

  /* The report is meant to be shareable, which only means anything if the same
     XI gives the same season to everybody. It did not: the injury draw ran off
     Math.random while the rest of the sim ran off the squad seed (fixed in
     Round 442). Whole report, twice, byte for byte. */
  const sample = top.slice(0, 11);
  const a = JSON.stringify(simulateWorldXiSeason(sample, '4-3-3'));
  const b = JSON.stringify(simulateWorldXiSeason(sample, '4-3-3'));
  if (a !== b) fail('the same XI produced two different season reports, so a shared screenshot cannot be reproduced');
  console.log(`   the same XI reproduces its own report: ${a === b}`);
  console.log(`   elite XI: ${elitePos.toFixed(1)}th, ${elitePts.toFixed(1)} points, ${elite.trophies} trophies over ${RUNS} squads`);
  console.log(`   cheap XI: ${cheapPos.toFixed(1)}th, ${cheapPts.toFixed(1)} points, ${cheap.trophies} trophies over ${RUNS} squads`);
}

console.log('');
if (CONTROL === 'shipped') {
  if (failures > 0) {
    console.log(`simLineupPositions control: green. The shipped acceptance was caught (${failures} finding${failures === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error('simLineupPositions control: RED. Every pick was accepted and nothing noticed.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`simLineupPositions: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simLineupPositions: green. Keepers keep goal, and every slot can still be filled.');
