/* Round 945: the lineup engine (src/lib/gmLineup.ts and gmLineupSports.ts)
   against the three GM engines it will be bound into, imported read only.

   Sections, every one over the real engines bundled with esbuild:
     1. With no choices each sport's number IS today's: gmLineupStrength
        equals mlbStrength, nhlStrength and teamStrength with ===, over every
        club of opening leagues on several seeds, hurt men, small (13 man)
        MLB rosters, NHL contributor picks, NFL depth chart swaps, the full
        and the fifteen man NFL rosters, and a saved choice that spells out
        the sim's own lineup. Also pinned against scripts/data/
        gmLineupFixture.json, so a later bind that moves both sides together
        is still caught.
     2. Benching a better man costs strength, on each of 200 walked swaps per
        sport. Each step takes the lineup the walk has reached, puts a
        strictly worse healthy man in a slot (or, in the NFL, moves a counted
        starter below a worse man on the depth chart) and needs the number to
        fall. Order swaps between slots of different weight are walked too.
     3. A starter on short rest is weaker: every start of a four man turn
        rates below the same man's start on full rest, a five man turn costs
        nothing, and a starter hurt mid walk sends the next men out short.
     4. The spread of team strength sits inside a band set from the real
        league's win percentage spread (numbers and sources at SPREAD below).
     5. Every lineup on the field is legal: fit, in the group, in a slot that
        takes his position, once. Every state of section 1, every scheme,
        and scrambled saves naming hurt and wrong position men.
     6. A tap made while a saved man is hurt keeps his slot for him: he is
        back in it once fit.
     7. A last rotation slot empty for want of a fit starter is not a skip: a
        reorder does not keep it empty once the men are fit.

   Controls, through GM_LINEUP_CONTROL. Each edits a bundled copy, refuses to
   run if the text it edits is missing, and must turn its section red:
     ignore       the strength ignores the lineup              -> 2
     share        the batting share moves off today's 0.55     -> 1
     contributors the NHL base ignores the GM's contributors   -> 1
     rest         a short rest start costs nothing             -> 3
     inflate      the lineup term is worth forty times more    -> 4
     hurt         the NFL fill takes hurt men off the chart     -> 5
     accepts      a saved man may fill a slot not his position -> 5
     held         a tap hands a hurt man's slot to his fill-in -> 6
     vacancy      an empty last rotation slot reads as a skip  -> 7

   MEASURED 2026-10-03, five seeds (11 29 47 83 131), 13 s a run:
     1. 600 MLB, 800 NHL and 640 NFL clubs x 3 ways, 0 off; fixture 25 of 25.
     2. MLB 619 bench and 381 order swaps, NHL 171 and 829, NFL 300 scheme
        benchings, none flat; median cost MLB 0.248, NHL 0.052, NFL 0.153.
        700 NFL chart moves followed today's number exactly, 4 of them RAISED
        it (today's engine, see section 2).
     3. 925 starters, 150 five and 150 four man turns, 150 of 150 hurt walks,
        150 of 150 read short through the strength after an injury.
     4. bands and their 17 seed measurement are at BAND.
   Added by the review fixes, same day and seeds, 15 s a run:
     5. MLB 3600 group lineups, NHL 6400, NFL 17920, 0 not allowed; 1209,
        1591 and 2168 hurt men on the rosters read. Control hurt puts hurt
        men in NFL scheme lineups, control accepts a D on a forward's power
        play spot: NFL 8509 and NHL 1929 men not allowed, both red.
     6. MLB 300 of 300 and NHL 480 of 480 back in their slot; control held
        takes it to 0 of 300 and 0 of 480.
     7. 150 of 150 fifth slots filled again; control vacancy, 0 of 150.
   The fixture is written with stable ids since the review fixes: two
   --write-fixture runs gave the same file byte for byte, and its 25 rows
   equal the first recording in every number and, ids masked, every field. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'src', 'lib', 'gmLineup.ts');
const SPORTS = path.join(ROOT, 'src', 'lib', 'gmLineupSports.ts');
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'gmLineupFixture.json');
const CONTROL = process.env.GM_LINEUP_CONTROL || '';
const WRITE_FIXTURE = process.argv.includes('--write-fixture');
const EXPECT = { ignore: [2], share: [1], contributors: [1], rest: [3], inflate: [4], hurt: [5], accepts: [5], held: [6], vacancy: [7] };
if (CONTROL && !EXPECT[CONTROL]) { console.error(`GM_LINEUP_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`); process.exit(1); }

let checks = 0;
const fails = [];
const red = new Set();
const ok = (section, label, pass, detail) => {
  checks += 1;
  if (!pass) { red.add(section); if (fails.length < 40) fails.push(`[${section}] ${label}${detail ? `: ${detail}` : ''}`); }
};
const lcg = start => { let s = start >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const clone = v => JSON.parse(JSON.stringify(v));
const normaliseEol = t => t.split('\r\n').join('\n');
const req = createRequire(path.join(ROOT, 'package.json'));

/* ---- the engines, bundled (a control edits a copy) ----------------------- */
const CORE_SWAPS = {
  ignore: [['const m = choice ? gmGroupRich(g, gmGroupSlots(sport, g, choice), mine[g.key]) : a;', 'const m = a;']],
  inflate: [['const delta = g.share * (m - a);', 'const delta = 40 * g.share * (m - a);']],
  accepts: [['if (p && !used.has(p.id) && accepts(g, slots[i], p)) { keep.push(p);', 'if (p && !used.has(p.id)) { keep.push(p);']],
  held: [['return placed.map((p, i) => held[i]?.id ?? p?.id ?? null);', 'return placed.map((p, i) => p?.id ?? null);']],
  vacancy: [['const skip = gmSkippedSlots(sport, g, choice);\n    const used = new Set<string>();', 'const skip = new Set(saved.flatMap((id, i) => (id === null && g.rotation && i >= slots.length - g.rotation.optional ? [i] : [])));\n    const used = new Set<string>();']],
};
const SPORT_SWAPS = {
  hurt: [['const chart = depthOrder(t, pos).filter(p => p.out === 0);', 'const chart = depthOrder(t, pos);']],
  share: [["key: 'bats', label: 'Batting order', share: 0.55,", "key: 'bats', label: 'Batting order', share: 0.56,"]],
  contributors: [['    if (t.contributors !== undefined) {\n      const s = nhlContributors(t);', '    if (false) {\n      const s = nhlContributors(t);']],
  rest: [['rotation: { fullRest: 4, shortRestCost: 4, optional: 1 },', 'rotation: { fullRest: 4, shortRestCost: 0, optional: 1 },']],
};
const rewrite = (label, src, swaps) => {
  for (const [now] of swaps) if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 80))} is not in ${label}, so it would change nothing. Refusing to run.`);
  let out = src;
  for (const [now, was] of swaps) out = out.split(now).join(was);
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
};

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-gmlineup-'));
let L, S, MLB, NHL, NFL, FO_DEPTH, NHL_OPENING;
try {
  let corePath = CORE, sportsPath = SPORTS;
  if (CORE_SWAPS[CONTROL]) {
    corePath = path.join(BUNDLE_DIR, 'gmLineup.ts');
    fs.writeFileSync(corePath, rewrite('gmLineup.ts', normaliseEol(fs.readFileSync(CORE, 'utf8')), CORE_SWAPS[CONTROL]));
  }
  if (SPORT_SWAPS[CONTROL]) {
    sportsPath = path.join(BUNDLE_DIR, 'gmLineupSports.ts');
    const src = rewrite('gmLineupSports.ts', normaliseEol(fs.readFileSync(SPORTS, 'utf8')), SPORT_SWAPS[CONTROL]);
    fs.writeFileSync(sportsPath, src.split("from './").join("from '@/lib/"));
  }
  if (CONTROL) console.log(`   control ${CONTROL}: editing a bundled copy of ${CORE_SWAPS[CONTROL] ? 'gmLineup.ts' : 'gmLineupSports.ts'}`);
  const redirect = {
    name: 'dukb-gmlineup-copies',
    setup(b) {
      b.onResolve({ filter: /(^|\/)gmLineup(\.ts)?$/ }, () => ({ path: corePath }));
      b.onResolve({ filter: /(^|\/)gmLineupSports(\.ts)?$/ }, () => ({ path: sportsPath }));
    },
  };
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  fs.writeFileSync(entry, [
    `export * as L from ${fwd(CORE)};`,
    `export * as S from ${fwd(SPORTS)};`,
    `export * as MLB from ${fwd(path.join(ROOT, 'src', 'lib', 'mlbFrontOffice.ts'))};`,
    `export * as NHL from ${fwd(path.join(ROOT, 'src', 'lib', 'nhlFrontOffice.ts'))};`,
    `export * as NFL from ${fwd(path.join(ROOT, 'src', 'lib', 'frontOffice.ts'))};`,
    `export { FO_DEPTH } from ${fwd(path.join(ROOT, 'src', 'data', 'frontOfficeDepth.ts'))};`,
    `export { NHL_OPENING_RATINGS } from ${fwd(path.join(ROOT, 'src', 'data', 'nhlOpeningRatings.ts'))};`,
  ].join('\n'));
  const out = path.join(BUNDLE_DIR, 'bundle.mjs');
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], outfile: out, logLevel: 'error' });
  const mod = await import(pathToFileURL(out).href);
  ({ L, S, MLB, NHL, NFL, FO_DEPTH } = mod);
  NHL_OPENING = mod.NHL_OPENING_RATINGS;
} catch (e) {
  console.error(`FAIL: the engines could not be bundled: ${String(e && e.message ? e.message : e).slice(0, 300)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
}

const SEEDS = process.env.GM_LINEUP_SEEDS ? process.env.GM_LINEUP_SEEDS.split(",").map(Number) : [11, 29, 47, 83, 131];
const SPORT = { mlb: S.mlbLineupSport(), nhl: S.nhlLineupSport(), nfl: S.nflLineupSport() };
const ENGINE = { mlb: t => MLB.mlbStrength(t), nhl: t => NHL.nhlStrength(t), nfl: t => NFL.teamStrength(t) };
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];

/* Hurt about one man in five, for one to three rounds. */
const hurt = (lg, rng) => { for (const t of Object.values(lg.teams)) for (const p of t.players) if (rng() < 0.2) p.out = 1 + Math.floor(rng() * 3); return lg; };

/* Every state section 1 reads, per sport: [label, league]. */
function states(sport, seed) {
  const rng = lcg(seed * 7 + 3);
  if (sport === 'mlb') {
    const open = MLB.initMlbLeague(lcg(seed));
    const small = clone(open);
    for (const t of Object.values(small.teams)) { const keep = new Set(MLB.mlbSimReads(t)); t.players = t.players.filter(p => keep.has(p.id)); delete t.depth; }
    return [['opening', open], ['hurt', hurt(clone(open), rng)], ['13 man', small], ['13 man hurt', hurt(clone(small), rng)]];
  }
  if (sport === 'nhl') {
    const open = NHL.initNhlLeague(lcg(seed), NHL_OPENING);
    const plain = NHL.initNhlLeague(lcg(seed));
    const chosen = hurt(clone(open), rng);
    for (const t of Object.values(chosen.teams)) {
      const healthy = t.players.filter(p => p.out === 0);
      const draw = (pos, n) => healthy.filter(p => pos.includes(p.pos)).sort(() => rng() - 0.5).slice(0, n).map(p => p.id);
      const g = draw(['G'], 1);
      NHL.nhlSetContributors(t, { forwards: draw(['C', 'W'], 6), defense: draw(['D'], 4), goalie: g[0] ?? null });
    }
    /* contributors saved, then men hurt after: the GM's pick with holes in it */
    const holes = hurt(clone(chosen), rng);
    return [['opening', open], ['no opening ratings', plain], ['hurt', hurt(clone(open), rng)], ['contributors', chosen], ['contributors then hurt', holes]];
  }
  const legacy = NFL.initLeague(lcg(seed));
  const deep = NFL.initLeague(lcg(seed), { depth: FO_DEPTH });
  const charted = hurt(clone(deep), rng);
  for (const t of Object.values(charted.teams)) for (let k = 0; k < 6; k++) {
    const pos = pick(rng, NFL.DEPTH_GROUPS);
    const ids = NFL.depthOrder(t, pos).map(p => p.id);
    if (ids.length >= 2) NFL.swapDepth(t, pos, pick(rng, ids), pick(rng, ids));
  }
  return [['fifteen man', legacy], ['fifteen man hurt', hurt(clone(legacy), rng)], ['full roster', deep], ['full roster, chart swapped and hurt', charted]];
}

/* The sim's own lineup spelled out as a saved choice. */
function spelled(sport, team) {
  const sp = SPORT[sport];
  const r = L.gmResolveLineup(sp, team);
  if (sp.chartOnly) return { schemes: Object.fromEntries(Object.entries(sp.schemes).map(([k, v]) => [k, v[0].key])) };
  return { slots: Object.fromEntries(sp.groups.map(g => [g.key, r[g.key].map(p => (p ? p.id : null))])) };
}

/* ---- 1. with no choices, today's number exactly ------------------------- */
console.log('1) with no choices each sport reads today\'s strength exactly');
const fixtureRows = [];
for (const sport of ['mlb', 'nhl', 'nfl']) {
  let teams = 0, off = 0, worst = 0;
  for (const seed of SEEDS) for (const [label, lg] of states(sport, seed)) for (const t of Object.values(lg.teams)) {
    const before = JSON.stringify(t);
    const today = ENGINE[sport](t);
    for (const [how, choice] of [['none', undefined], ['empty', {}], ['spelled', spelled(sport, t)]]) {
      const mine = L.gmLineupStrength(SPORT[sport], t, choice);
      if (mine !== today) { off += 1; worst = Math.max(worst, Math.abs(mine - today)); ok(1, `${sport} ${label} seed ${seed} ${t.abbr} (${how})`, false, `${mine} against ${today}`); }
    }
    ok(1, `${sport} ${label} ${t.abbr}: reading a lineup leaves the club untouched`, JSON.stringify(t) === before);
    if (seed === SEEDS[0] && fixtureRows.filter(r => r.sport === sport && r.state === label).length < 2 && (sport !== 'nfl' || label !== 'full roster' || fixtureRows.filter(r => r.state === label).length < 1)) fixtureRows.push({ sport, state: label, strength: today, team: clone(t) });
    teams += 1;
  }
  console.log(`   ${sport}: ${teams} clubs x 3 ways, ${off} off today's number${off ? `, worst by ${worst}` : ''}`);
  ok(1, `${sport}: enough clubs read`, teams >= 400, `${teams}`);
}

/* The fixture: a few clubs per sport pinned at today's number, so a later
   bind that changes the engine and this file together still has to answer
   to the number the game gave before it. */
/* The engines stamp player ids with a per load value, so every man's id
   (the roster, the NFL practice squad, anything holding a man) is renamed
   by sport, club and the order he is met in, everywhere it appears in the
   club, and a fixture written twice is the same file byte for byte. */
const stableIds = row => {
  const ids = [];
  const walk = v => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.id === 'string' && typeof v.pos === 'string' && !ids.includes(v.id)) ids.push(v.id);
    Object.values(v).forEach(walk);
  };
  walk(row.team);
  let json = JSON.stringify(row.team);
  ids.forEach((id, i) => { json = json.split(JSON.stringify(id)).join(JSON.stringify(`${row.sport}-${row.team.abbr}-${i + 1}`)); });
  return { ...row, team: JSON.parse(json) };
};
if (WRITE_FIXTURE && !CONTROL) {
  fs.writeFileSync(FIXTURE, JSON.stringify({ madeBy: 'scripts/simGmLineup.mjs --write-fixture, Round 945, against the engines as they stood before any lineup bind', rows: fixtureRows.map(stableIds) }) + '\n');
  console.log(`   wrote ${path.relative(ROOT, FIXTURE)} (${fixtureRows.length} clubs)`);
}
{
  const pinned = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).rows : [];
  ok(1, 'the fixture holds clubs of all three sports', ['mlb', 'nhl', 'nfl'].every(s => pinned.some(r => r.sport === s)), `${pinned.length} rows`);
  let held = 0;
  for (const r of pinned) {
    const engine = ENGINE[r.sport](clone(r.team));
    const mine = L.gmLineupStrength(SPORT[r.sport], clone(r.team));
    ok(1, `fixture ${r.sport} ${r.state} ${r.team.abbr}: the engine still reads its pinned number`, engine === r.strength, `${engine} against ${r.strength}`);
    ok(1, `fixture ${r.sport} ${r.state} ${r.team.abbr}: the lineup reads it too`, mine === r.strength, `${mine} against ${r.strength}`);
    if (engine === r.strength && mine === r.strength) held += 1;
  }
  console.log(`   fixture: ${held} of ${pinned.length} pinned clubs read their number through both`);
}

/* ---- 2. benching a better man costs strength ------------------------------ */
console.log('2) benching a better man costs strength, on each of 200 walked swaps per sport and seed');
const WALK = 200;
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const walkCosts = { mlb: [], nhl: [], nfl: [] };
for (const sport of ['mlb', 'nhl']) {
  const sp = SPORT[sport];
  const kinds = { bench: 0, order: 0 };
  let flat = 0;
  for (const seed of SEEDS) {
    const rng = lcg(seed * 13 + 5);
    const lg = sport === 'mlb' ? hurt(MLB.initMlbLeague(lcg(seed)), lcg(seed + 1)) : hurt(NHL.initNhlLeague(lcg(seed), NHL_OPENING), lcg(seed + 1));
    const teams = Object.values(lg.teams);
    let team = pick(rng, teams), choice = {}, walked = 0, tries = 0;
    while (walked < WALK && tries < WALK * 100) {
      tries += 1;
      if (rng() < 0.04) { team = pick(rng, teams); choice = {}; }
      const lineup = L.gmResolveLineup(sp, team, choice);
      const g = pick(rng, sp.groups);
      const slots = L.gmGroupSlots(sp, g, choice);
      const men = lineup[g.key];
      const i = Math.floor(rng() * slots.length);
      const man = men[i];
      if (!man) continue;
      const takes = (slot, p) => (slot.accepts ? slot.accepts.includes(p.pos) : L.gmInGroup(g, p.pos));
      let next = null, kind = '';
      if (rng() < 0.6) {
        const placed = new Set(men.filter(Boolean).map(p => p.id));
        const worse = L.gmGroupPool(g, sp.men(team)).filter(p => !placed.has(p.id) && takes(slots[i], p) && p.ovr < man.ovr);
        if (!worse.length) continue;
        next = L.gmLineupSwap(sp, team, choice, g.key, { id: man.id }, { id: pick(rng, worse).id });
        kind = 'bench';
      } else {
        const lighter = men.map((p, j) => j).filter(j => men[j] && slots[j].weight < slots[i].weight && men[j].ovr < man.ovr && takes(slots[j], man) && takes(slots[i], men[j]));
        if (!lighter.length) continue;
        next = L.gmLineupSwap(sp, team, choice, g.key, { id: man.id }, { id: men[pick(rng, lighter)].id });
        kind = 'order';
      }
      ok(2, `${sport} seed ${seed}: the swap is taken`, next !== null);
      if (!next) continue;
      const before = L.gmLineupStrength(sp, team, choice);
      const after = L.gmLineupStrength(sp, team, next);
      ok(2, `${sport} seed ${seed} step ${walked}: ${kind} ${man.id} in ${g.key} costs strength`, after < before, `${after} against ${before}`);
      if (!(after < before)) flat += 1;
      walkCosts[sport].push(before - after);
      kinds[kind] += 1;
      choice = next;
      walked += 1;
    }
    ok(2, `${sport} seed ${seed}: all ${WALK} swaps walked`, walked === WALK, `${walked} in ${tries} tries`);
  }
  console.log(`   ${sport}: ${kinds.bench} bench and ${kinds.order} order swaps, ${flat} did not cost, median cost ${median(walkCosts[sport]).toFixed(4)}`);
}
/* The NFL: the men come off the depth chart. (a) Under the default scheme,
   move a man today's strength counts below a worse man on his chart. That
   is today's engine pricing the chart, and it is NOT always a cost: shares
   are dealt by rating among the chart's first men but filled in chart
   order, so a better man buried behind a hurt one counts toward a share
   without playing, and benching somebody else can hand that share to him.
   The lineup must follow today's number through every such move exactly,
   and the rises are counted and printed for the bind's round, not failed
   here (this round edits no engine). (b) Under another scheme, bench a man
   that scheme plays and the default does not (12's second tight end, 21's
   second back, the 3-4's fourth linebacker) where today's units do not
   move: only the scheme reads him, so the scheme has to price it. Full
   rosters only: the fifteen man league has nobody behind its starters. */
{
  const sp = SPORT.nfl;
  let a = 0, b = 0, flat = 0, idle = 0, rises = 0;
  for (const seed of SEEDS) {
    const rng = lcg(seed * 17 + 1);
    const lg = NFL.initLeague(lcg(seed), { depth: FO_DEPTH });
    hurt(lg, lcg(seed + 3));
    const teams = Object.values(lg.teams);
    let walked = 0, tries = 0;
    while (walked < WALK && tries < WALK * 100) {
      tries += 1;
      const team = pick(rng, teams);
      const byScheme = rng() < 0.5;
      const choice = byScheme ? { schemes: { skill: pick(rng, ['12', '21']), def: '34' } } : {};
      const lineup = L.gmResolveLineup(sp, team, choice);
      const auto = L.gmResolveLineup(sp, team);
      let man;
      if (!byScheme) man = pick(rng, Object.values(sp.base(team)).flat());
      else {
        const g = pick(rng, ['skill', 'def']);
        const inAuto = new Set(auto[g].filter(Boolean).map(p => p.id));
        man = pick(rng, lineup[g].filter(p => p && !inAuto.has(p.id)));
      }
      if (!man) continue;
      const chart = NFL.depthOrder(team, man.pos);
      const worse = chart.slice(chart.findIndex(p => p.id === man.id) + 1).filter(p => p.out === 0 && p.ovr < man.ovr);
      if (!worse.length) continue;
      const units = t => Object.values(sp.base(t)).flat().map(p => p.ovr).sort((x, y) => x - y).join(',');
      const was = units(team);
      const before = L.gmLineupStrength(sp, team, choice);
      const moved = clone(team);
      NFL.swapDepth(moved, man.pos, man.id, pick(rng, worse).id);
      if (units(moved) === was ? !byScheme : byScheme) { idle += 1; continue; }
      const after = L.gmLineupStrength(sp, moved, choice);
      if (byScheme) {
        ok(2, `nfl seed ${seed} step ${walked}: benching ${man.pos} ${man.id} under ${choice.schemes.skill}/${choice.schemes.def} costs strength`, after < before, `${after} against ${before}`);
        if (!(after < before)) flat += 1;
        walkCosts.nfl.push(before - after);
        b += 1;
      } else {
        ok(2, `nfl seed ${seed} step ${walked}: the lineup follows today's number through a chart move`, after === NFL.teamStrength(moved), `${after} against ${NFL.teamStrength(moved)}`);
        if (after > before) rises += 1;
        a += 1;
      }
      teams[teams.indexOf(team)] = moved;
      lg.teams[team.abbr] = moved;
      walked += 1;
    }
    ok(2, `nfl seed ${seed}: all ${WALK} swaps walked`, walked === WALK, `${walked} in ${tries} tries`);
  }
  ok(2, 'nfl: scheme benchings walked on every seed', b >= SEEDS.length * 40, `${b}`);
  console.log(`   nfl: ${b} scheme benchings, ${flat} did not cost, median cost ${median(walkCosts.nfl).toFixed(4)}; ${a} chart moves followed exactly (${rises} of them RAISED today's number, see above); ${idle} moves that fit neither case were not steps`);
}

/* ---- 3. a starter on short rest is weaker --------------------------------- */
console.log('3) a starter on short rest is weaker');
{
  const sp = SPORT.mlb;
  const rot = sp.groups.find(g => g.key === 'rotation');
  const rule = rot.rotation;
  let men = 0, fours = 0, fives = 0, hurtWalks = 0, shortAfterHurt = 0, strengthShort = 0;
  for (const seed of SEEDS) for (const t of Object.values(MLB.initMlbLeague(lcg(seed)).teams)) {
    for (const p of t.players.filter(q => q.pos === 'SP')) {
      men += 1;
      ok(3, `${t.abbr} ${p.id}: a start a game short of full rest rates lower`, L.gmStartValue(p, rule.fullRest - 1, rule) < L.gmStartValue(p, rule.fullRest, rule));
      ok(3, `${t.abbr} ${p.id}: full rest rates his own number, and more rest adds nothing`, L.gmStartValue(p, rule.fullRest, rule) === p.ovr && L.gmStartValue(p, rule.fullRest + 3, rule) === p.ovr);
    }
    const five = L.gmResolveLineup(sp, t).rotation;
    if (five.filter(Boolean).length < 5) continue;
    const w5 = L.gmWalkRotation(five, 20, rule, rot.fallback).starts;
    ok(3, `${t.abbr}: a five man turn starts every man on full rest`, w5.every(s => s.rest === rule.fullRest && s.value === five.find(p => p.id === s.id).ovr));
    fives += 1;
    const four = L.gmLineupSetOpen(sp, t, {}, 'rotation', 4, true);
    ok(3, `${t.abbr}: the fifth slot can be left open`, four !== null);
    if (!four) continue;
    const turn = L.gmResolveLineup(sp, t, four).rotation;
    const w4 = L.gmWalkRotation(turn, 20, rule, rot.fallback).starts;
    ok(3, `${t.abbr}: a four man turn sends every start out short and weaker`, w4.every(s => s.rest === rule.fullRest - 1 && s.value < turn.find(p => p && p.id === s.id).ovr));
    const reading = L.gmLineupReading(sp, t, four).groups.find(g => g.key === 'rotation');
    const plain = turn.filter(Boolean).reduce((s, p) => s + p.ovr, 0) / 4;
    ok(3, `${t.abbr}: the four man turn's rating carries the rest`, reading.mine < plain, `${reading.mine} against ${plain}`);
    fours += 1;
    /* hurt mid walk: ten starts, the second man goes down, the walk carries on */
    const first = L.gmWalkRotation(five, 10, rule, rot.fallback);
    const after = five.map((p, i) => (i === 1 ? { ...p, out: 2 } : p));
    const rest = L.gmWalkRotation(after, 8, rule, rot.fallback, first.last, 10).starts;
    const short = rest.filter(s => s.rest < rule.fullRest);
    hurtWalks += 1;
    if (short.length) shortAfterHurt += 1;
    ok(3, `${t.abbr}: a hurt starter sends the turn out short, and every short start is weaker`, short.length > 0 && short.every(s => s.value < five.find(p => p.id === s.id).ovr), `${short.length} short starts`);
    /* The same through the strength's own path (gmLineupReading, no walk
       carried over): the club keeps only its five starters, one is hurt, no
       spare is left, so the sim's own turn is four men and reads short. */
    const cut = clone(t);
    const five_ = new Set(five.map(p => p.id));
    cut.players = cut.players.filter(p => p.pos !== 'SP' || five_.has(p.id));
    cut.players.find(p => p.id === five[1].id).out = 2;
    const turn4 = L.gmResolveLineup(sp, cut).rotation.filter(Boolean);
    const read4 = L.gmLineupReading(sp, cut).groups.find(g => g.key === 'rotation');
    const plain4 = turn4.reduce((s, p) => s + p.ovr, 0) / turn4.length;
    if (turn4.length === 4 && read4.auto < plain4) strengthShort += 1;
    ok(3, `${t.abbr}: a starter hurt with no spare sends the strength's own turn out short`, turn4.length === 4 && read4.auto < plain4, `${turn4.length} men, ${read4.auto} against ${plain4}`);
  }
  console.log(`   ${men} starters priced a game short; ${fives} five man turns on full rest, ${fours} four man turns all short and weaker, ${shortAfterHurt} of ${hurtWalks} walks went short after a starter was hurt, ${strengthShort} of ${hurtWalks} clubs read short through the strength after one`);
  ok(3, 'enough turns walked', fours >= 100 && hurtWalks >= 100, `${fours}, ${hurtWalks}`);
}

/* ---- 4. the spread of team strength against the real league ------------- */
console.log('4) the spread of team strength sits inside a band set from the real league');
const SPREAD = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'gmLineupRealSpread.json'), 'utf8'));
const sdOf = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };
/* Each engine's own chance of winning one game, from two strengths. Checked
   against the engine's function below, so a change there cannot slip by. */
const WIN = {
  mlb: (a, b) => 1 / (1 + Math.pow(10, -(a - b) / 25)),
  nhl: (a, b) => 1 / (1 + Math.pow(10, -(a - b) / 14)),
  nfl: (a, b) => (1 / (1 + Math.pow(10, -(a - b + 2) / 14)) + 1 - 1 / (1 + Math.pow(10, -(b - a + 2) / 14))) / 2,
};
const ENGINE_WIN = { mlb: (x, y) => MLB.mlbWinProb(x, y), nhl: (x, y) => NHL.nhlWinProb(x, y), nfl: (x, y) => (NFL.winProb(x, y) + (1 - NFL.winProb(y, x))) / 2 };
const opening = (sport, seed) => (sport === 'mlb' ? MLB.initMlbLeague(lcg(seed)) : sport === 'nhl' ? NHL.initNhlLeague(lcg(seed), NHL_OPENING) : NFL.initLeague(lcg(seed), { depth: FO_DEPTH }));
/* A season's win percentage spread from a set of strengths: the spread of
   each club's expected share against the league, plus a season's luck. */
const seasonSd = (sport, strengths) => {
  const exp = strengths.map((s, i) => strengths.reduce((acc, o, j) => (i === j ? acc : acc + WIN[sport](s, o)), 0) / (strengths.length - 1));
  const luck = exp.reduce((acc, p) => acc + p * (1 - p), 0) / exp.length / SPREAD[sport].games;
  return Math.sqrt(sdOf(exp) ** 2 + luck);
};
/* A GM's lineup: the sim's own, then six random taps of the panel. */
function fiddled(sport, team, rng) {
  const sp = SPORT[sport];
  if (sp.chartOnly) return { schemes: { skill: pick(rng, ['11', '12', '21']), def: pick(rng, ['43', '34']) } };
  let choice = {};
  for (let k = 0; k < 6; k++) {
    const g = pick(rng, sp.groups);
    const placed = L.gmResolveLineup(sp, team, choice)[g.key];
    const pool = L.gmGroupPool(g, sp.men(team));
    const a = pick(rng, placed.filter(Boolean)), b = pick(rng, pool);
    if (!a || !b) continue;
    choice = L.gmLineupSwap(sp, team, choice, g.key, { id: a.id }, { id: b.id }) ?? choice;
  }
  return choice;
}
/* Bands, on the median over the seeds, from 17 seeds measured 2026-10-03:
   sim season spread over the real one, MLB 1.066, NHL 1.024, NFL 0.810 on
   every seed (the opening rosters are real, so the seed barely moves them);
   with six random taps of the panel per club over without, MLB 0.948 to
   1.151 (median about 1.02), NHL 0.963 to 1.027 (about 0.98), NFL 0.991 to
   1.009 (about 1.00). */
const BAND = { real: [0.7, 1.3], lineup: [0.9, 1.1] };
const ratios = { mlb: [], nhl: [], nfl: [] };
const moved = { mlb: [], nhl: [], nfl: [] };
for (const sport of ['mlb', 'nhl', 'nfl']) {
  const real = sdOf(Object.values(SPREAD[sport].records).map(r => (r[0] + r[2] * (sport === 'nfl' ? 0.5 : 0)) / SPREAD[sport].games));
  let formula = 0, pairs = 0;
  for (const seed of SEEDS) {
    const lg = opening(sport, seed);
    const teams = Object.values(lg.teams);
    const rng = lcg(seed * 31 + 7);
    for (let k = 0; k < 20; k++) {
      const x = pick(rng, teams), y = pick(rng, teams);
      const mine = WIN[sport](L.gmLineupStrength(SPORT[sport], x), L.gmLineupStrength(SPORT[sport], y));
      pairs += 1;
      if (Math.abs(mine - ENGINE_WIN[sport](x, y)) < 1e-12) formula += 1;
    }
    const base = teams.map(t => L.gmLineupStrength(SPORT[sport], t));
    const gm = teams.map(t => L.gmLineupStrength(SPORT[sport], t, fiddled(sport, t, rng)));
    ratios[sport].push(seasonSd(sport, base) / real);
    moved[sport].push(seasonSd(sport, gm) / seasonSd(sport, base));
  }
  ok(4, `${sport}: the win chance used here is the engine's own`, formula === pairs, `${formula} of ${pairs}`);
  const r = median(ratios[sport]), m = median(moved[sport]);
  ok(4, `${sport}: the sim's season spread sits within ${BAND.real.join(' to ')} of the real league's`, r >= BAND.real[0] && r <= BAND.real[1], r.toFixed(3));
  ok(4, `${sport}: GM lineups keep the spread within ${BAND.lineup.join(' to ')} of the sim's own`, m >= BAND.lineup[0] && m <= BAND.lineup[1], m.toFixed(3));
  console.log(`   ${sport}: real spread ${real.toFixed(4)}; sim season spread / real ${ratios[sport].map(r => r.toFixed(3)).join(' ')}; with GM lineups / without ${moved[sport].map(r => r.toFixed(3)).join(' ')}`);
}

/* ---- 5. every lineup on the field is one the rules allow ------------------
   Whatever the choice, each man the resolver puts out is fit, belongs to
   the group, plays a slot that takes his position and plays it once. Read
   over every state of section 1 (hurt men in most of them), under every
   scheme the sport offers, and, where the GM picks men, a scrambled save
   that names hurt men, men of the wrong position and nobody at random: the
   save a stale or hand edited file could hold. */
console.log('5) every lineup on the field is one the rules allow');
for (const sport of ['mlb', 'nhl', 'nfl']) {
  const sp = SPORT[sport];
  let lineups = 0, men = 0, bad = 0, hurtOnRoster = 0, hurtNamed = 0;
  const schemeChoices = sp.schemes
    ? Object.entries(sp.schemes).reduce((acc, [k, list]) => acc.flatMap(c => list.map(s => ({ ...c, [k]: s.key }))), [{}]).map(schemes => ({ schemes }))
    : [];
  for (const seed of SEEDS) {
    const rng = lcg(seed * 41 + 9);
    for (const [label, lg] of states(sport, seed)) for (const t of Object.values(lg.teams)) {
      const roster = sp.men(t);
      hurtOnRoster += roster.filter(p => p.out > 0).length;
      const choices = [undefined, ...schemeChoices];
      if (!sp.chartOnly) {
        const scrambled = {};
        for (const g of sp.groups) {
          const ids = [...roster].sort(() => rng() - 0.5).map(p => p.id).slice(0, g.slots.length);
          while (ids.length < g.slots.length) ids.push(null);
          scrambled[g.key] = ids.map(id => (rng() < 0.15 ? null : id));
          hurtNamed += scrambled[g.key].filter(id => id && roster.find(p => p.id === id).out > 0).length;
        }
        choices.push({ slots: scrambled });
      }
      for (const choice of choices) {
        const lineup = L.gmResolveLineup(sp, t, choice);
        for (const g of sp.groups) {
          const slots = L.gmGroupSlots(sp, g, choice);
          const seen = new Set();
          lineups += 1;
          lineup[g.key].forEach((p, i) => {
            if (!p) return;
            men += 1;
            const takes = slots[i].accepts ? slots[i].accepts.includes(p.pos) : L.gmInGroup(g, p.pos);
            const twice = seen.has(p.id);
            const legal = p.out === 0 && L.gmInGroup(g, p.pos) && takes && !twice;
            seen.add(p.id);
            if (!legal) { bad += 1; ok(5, `${sport} ${label} seed ${seed} ${t.abbr} ${g.key} ${JSON.stringify(choice?.schemes ?? (choice ? 'scrambled' : 'sim'))}: slot ${i} holds ${p.pos} ${p.id}`, false, `out ${p.out}, takes ${takes}, twice ${twice}`); }
          });
        }
      }
    }
  }
  console.log(`   ${sport}: ${lineups} group lineups, ${men} men placed, ${bad} not allowed; ${hurtOnRoster} hurt men on the rosters read${sp.chartOnly ? '' : `, hurt men named ${hurtNamed} times in scrambled saves`}`);
  ok(5, `${sport}: the check read hurt men`, hurtOnRoster > 100, `${hurtOnRoster}`);
  if (!sp.chartOnly) ok(5, `${sport}: scrambled saves named hurt men`, hurtNamed > 50, `${hurtNamed}`);
  ok(5, `${sport}: enough lineups read`, lineups > 1000, `${lineups}`);
}

/* ---- 6. a tap made while a saved man is hurt keeps his slot for him -------
   Every group a GM picks men for, on every club: save a lineup with one
   swap, hurt the man in its first slot, make one tap that does not touch
   that slot, then heal him. He has to be back in his slot. */
console.log('6) a tap made while a saved man is hurt keeps his slot for him');
for (const sport of ['mlb', 'nhl']) {
  const sp = SPORT[sport];
  let walks = 0, back = 0;
  for (const seed of SEEDS) for (const team of Object.values(opening(sport, seed).teams)) for (const g of sp.groups) {
    const t = clone(team);
    const slots = L.gmGroupSlots(sp, g);
    /* Spare men below the club's worst until the group has two more than
       its slots, so a hurt man always has a fill-in (a 13 man NHL roster has
       none, and an empty slot refills by rating whatever the save says,
       which would prove nothing). Two at least of each position the group
       takes: copies of the club's own men with new ids. */
    const pool0 = L.gmGroupPool(g, t.players);
    if (!pool0.length) continue;
    const low = Math.min(...pool0.map(p => p.ovr));
    const kinds = [...new Map(pool0.map(p => [p.pos, p])).values()];
    for (let k = 0; k < kinds.length * 2 || L.gmGroupPool(g, t.players).length < slots.length + 2; k++) t.players.push({ ...clone(kinds[k % kinds.length]), id: `spare-${g.key}-${k}`, ovr: low - 1 - k, out: 0 });
    const takes = (slot, p) => (slot.accepts ? slot.accepts.includes(p.pos) : L.gmInGroup(g, p.pos));
    const ids = () => L.gmResolveLineup(sp, t, choice)[g.key].map(p => p?.id ?? null);
    let choice = {};
    /* the save: the first two filled slots that take each other's man trade places */
    const placed = L.gmResolveLineup(sp, t)[g.key];
    const pairs = [];
    for (let i = 1; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) if (placed[i] && placed[j] && takes(slots[i], placed[j]) && takes(slots[j], placed[i])) pairs.push([i, j]);
    if (!placed[0] || pairs.length < 2) continue;
    choice = L.gmLineupSwap(sp, t, choice, g.key, { id: placed[pairs[0][0]].id }, { id: placed[pairs[0][1]].id }) ?? {};
    if (!choice.slots?.[g.key]) continue;
    const star = placed[0];
    t.players.find(p => p.id === star.id).out = 2;
    const during = L.gmResolveLineup(sp, t, choice)[g.key];
    const [i, j] = pairs[pairs.length - 1];
    ok(6, `${sport} seed ${seed} ${t.abbr} ${g.key}: a fill-in plays the hurt man's slot`, !!during[0] && during[0].id !== star.id);
    if (!during[0] || !during[i] || !during[j]) continue;
    const tapped = L.gmLineupSwap(sp, t, choice, g.key, { id: during[i].id }, { id: during[j].id });
    ok(6, `${sport} seed ${seed} ${t.abbr} ${g.key}: the tap during the injury is taken`, tapped !== null);
    if (!tapped) continue;
    t.players.find(p => p.id === star.id).out = 0;
    choice = tapped;
    walks += 1;
    const healed = ids();
    if (healed[0] === star.id) back += 1;
    ok(6, `${sport} seed ${seed} ${t.abbr} ${g.key}: ${star.id} is back in slot 1 once fit`, healed[0] === star.id, `slot 1 holds ${healed[0]}`);
  }
  console.log(`   ${sport}: ${back} of ${walks} hurt men were back in their slot once fit, after a tap made while they were out`);
  ok(6, `${sport}: enough walks`, walks >= 100, `${walks}`);
}

/* ---- 7. a last slot empty for want of a fit man is not a skip --------------
   MLB clubs cut to their four best healthy starters (the fifth and the rest
   hurt): the rotation reads [A, B, C, D, empty]. The GM reorders it with one
   tap, then the men heal. The fifth slot has to fill again, and the strength
   has to read the five man turn, not a four man one on short rest. */
console.log('7) a last slot empty for want of a fit man is not a skip');
{
  const sp = SPORT.mlb;
  const rot = sp.groups.find(g => g.key === 'rotation');
  let walks = 0, filled = 0;
  for (const seed of SEEDS) for (const team of Object.values(MLB.initMlbLeague(lcg(seed)).teams)) {
    const t = clone(team);
    const arms = t.players.filter(p => p.pos === 'SP').sort((a, b) => b.ovr - a.ovr);
    if (arms.length < 5) continue;
    for (const p of arms.slice(4)) p.out = 3;
    const four = L.gmResolveLineup(sp, t).rotation;
    if (four[4] !== null || four.slice(0, 4).some(p => !p)) continue;
    const tapped = L.gmLineupSwap(sp, t, {}, 'rotation', { id: four[0].id }, { id: four[1].id });
    ok(7, `${t.abbr}: the reorder is taken`, tapped !== null);
    if (!tapped) continue;
    ok(7, `${t.abbr}: the reorder marks no skip`, L.gmSkippedSlots(sp, rot, tapped).size === 0, JSON.stringify(tapped.open ?? null));
    for (const p of arms) p.out = 0;
    walks += 1;
    const healed = L.gmResolveLineup(sp, t, tapped).rotation;
    const reading = L.gmLineupReading(sp, t, tapped).groups.find(g => g.key === 'rotation');
    const five = healed.filter(Boolean);
    const full = five.reduce((s, p) => s + p.ovr, 0) / five.length;
    if (healed[4]) filled += 1;
    ok(7, `${t.abbr}: the fifth slot fills again once the men are fit`, !!healed[4], JSON.stringify(healed.map(p => p?.id ?? null)));
    ok(7, `${t.abbr}: and the strength reads the five man turn on full rest`, five.length === 5 && Math.abs(reading.mine - full) < 1e-9, `${reading.mine} against ${full}`);
  }
  console.log(`   ${filled} of ${walks} reordered four man rotations filled their fifth slot again once the men were fit`);
  ok(7, 'enough walks', walks >= 100, `${walks}`);
}

/* ---- summary -------------------------------------------------------------- */
fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
for (const f of fails) console.log(`   FAIL ${f}`);
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const fired = want.every(s => red.has(s));
  console.log(`simGmLineup control ${CONTROL}: section ${want.join(', ')} ${fired ? 'went red as it must' : 'STAYED GREEN'} (red: ${[...red].join(', ') || 'none'}), ${checks} checks`);
  process.exit(fired ? 0 : 1);
}
console.log(`simGmLineup: ${checks} checks, ${fails.length ? `${red.size} section(s) red: ${[...red].join(', ')}` : 'all green'}`);
process.exit(fails.length ? 1 : 0);
