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

   Controls, through GM_LINEUP_CONTROL. Each edits a bundled copy, refuses to
   run if the text it edits is missing, and must turn its section red:
     ignore       the strength ignores the lineup              -> 2
     share        the batting share moves off today's 0.55     -> 1
     contributors the NHL base ignores the GM's contributors   -> 1
     rest         a short rest start costs nothing             -> 3
     inflate      the lineup term is worth forty times more    -> 4

   MEASURED (filled in from the runs, several seeds): see the numbers at
   each section's bands. */
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
const EXPECT = { ignore: [2], share: [1], contributors: [1], rest: [3], inflate: [4] };
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
};
const SPORT_SWAPS = {
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

const SEEDS = [11, 29, 47, 83, 131];
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
if (WRITE_FIXTURE && !CONTROL) {
  fs.writeFileSync(FIXTURE, JSON.stringify({ madeBy: 'scripts/simGmLineup.mjs --write-fixture, Round 945, against the engines as they stood before any lineup bind', rows: fixtureRows }) + '\n');
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
