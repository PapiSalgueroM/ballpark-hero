/* Round 457: one conquest map for every sport, measured.
 *
 * THE BUG: /conquest, /conquest-nba, /conquest-mlb and /conquest-nhl carried
 * four copies of one map component (1,469 lines) that differed only in which
 * team table they read colours from and which territory list they drew. Only
 * the NFL copy animated a takeover, so on three maps an empire changing hands
 * was a colour fade. Team colours were painted raw, so two neighbours on the
 * exact same red (the NHL has three clubs on #CE1126) drew one blob with no
 * border between them, and every label was the team code at 7 units, which
 * on a 390 wide phone is four pixels of text.
 *
 * WHAT IT HOLDS, with the REAL ConquestRegionMap rendered through
 * react-dom/server for all four sports over seeded game states (ten seeds by
 * forty turns per sport, whole empire annexations plus unclaimed land coming
 * and going as the arcade mode does):
 *   1. EVERY REGION CARRIES EXACTLY ONE OWNER COLOUR. One fill path per region,
 *      and its fill resolves (hex, or a pattern whose base rect is read back)
 *      to the look of the region's owner, unclaimed grey when nobody owns it.
 *   2. NO TWO BORDERING TERRITORIES WITH DIFFERENT OWNERS LOOK ALIKE. On every
 *      border between two owners, the rendered looks are either further apart
 *      than CLASH_DISTANCE (CIE76) or carry different patterns. Measured from
 *      the rendered fills, not from the assignment function. The whole league
 *      is checked too, so six pattern kinds are proven enough for every sport.
 *   3. THE TAKEOVER MARKS EXACTLY THE FLIPPED REGIONS. The overlay groups name
 *      precisely the regions whose owner changed, each with its old owner, and
 *      the waves spread from the winner's border: wave 0 borders land the
 *      winner already held, wave n borders wave n-1. No takeover, no overlay.
 *   4. THE FOUR SPORTS GO THROUGH THE SAME COMPONENT. The rendered root is the
 *      shared map for every sport, and in src/components/conquest no file but
 *      ConquestRegionMap.tsx draws a region path (comments stripped first, so
 *      prose cannot satisfy or trip the check), and every board imports it.
 *   5. THE FIGHT IS ON THE MAP. Before the roll the attacker's regions and the
 *      target's carry role rings and a dashed arrow; a single unclaimed target
 *      rings only that region; after the roll the result chip on the winner
 *      carries the exact number of regions gained.
 *   6. ONE LABEL PER EMPIRE, name or code, and the reduced motion rule in the
 *      rendered style turns the takeover into a plain colour change.
 *
 * Round 459 added the fifth sport, the 96 club Soccer Conquest, and with it
 * the accent rule: a patterned look is its kind AND its accent, so section 2
 * reads the accent back off the pattern def and calls two fills alike only
 * when kind, base and accent all agree (plain has no accent). Measured before
 * the rule: 38 pairs of the 96 clubs indistinguishable at six kinds.
 *
 * NEGATIVE CONTROLS (SIM_CONQUEST_MAP_CONTROL=...), each refusing to run if
 * its rewrite changes nothing:
 *   private   adds an in-memory copy of one sport's old private renderer to
 *             the source scan; section 4 must go red.
 *   owner     bundles a copy of the renderer that paints every region in the
 *             first region's owner colour; sections 1 and 2 must go red.
 *   takeover  bundles a copy whose overlay marks every region; section 3 must
 *             go red.
 *
 * Run: node scripts/simConquestMap.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const CONQUEST_DIR = `${ROOT}/src/components/conquest`;
const MAP_FILE = 'ConquestRegionMap.tsx';
const MAP_SRC = `${CONQUEST_DIR}/${MAP_FILE}`;
const CONTROL = process.env.SIM_CONQUEST_MAP_CONTROL || '';
const KNOWN_CONTROLS = ['private', 'owner', 'takeover'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SIM_CONQUEST_MAP_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(1);
}
const SEEDS = 10;
const TURNS = 40;
const norm = s => s.replace(/\r\n/g, '\n');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error(`control ${CONTROL}: ${m}, refusing to run a dead control`); process.exit(1); };

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/conquestMap.entry.mjs`;
const BUNDLE = `${TMP}/conquestMap.bundle.cjs`;

/* ---------- the control rewrites, in memory or in a temp copy ---------- */
const mapSource = norm(fs.readFileSync(MAP_SRC, 'utf8'));
let mapSrcPath = MAP_SRC;
function controlCopy(needle, replacement, what) {
  if (!mapSource.includes(needle)) refuse(`the line to rewrite is not in ${MAP_FILE} (${needle})`);
  const rewritten = mapSource.replace(needle, replacement);
  if (rewritten === mapSource) refuse('the rewrite changed nothing');
  mapSrcPath = `${TMP}/ConquestRegionMap.control.tsx`;
  fs.writeFileSync(mapSrcPath, rewritten);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${what}`);
}
if (CONTROL === 'owner') {
  controlCopy('fill={fillOf(owner)}', 'fill={fillOf(owners[sport.regions[0].id] ?? null)}',
    'every region is painted in the first region owner colour, sections 1 and 2 must go red');
}
if (CONTROL === 'takeover') {
  controlCopy('Object.keys(takeover.from).map(regionId =>', 'Object.keys(owners).map(regionId =>',
    'the takeover overlay marks every region on the map, section 3 must go red');
}

/* ---------- bundle the real component, the pure helpers and the four sport specs ---------- */
fs.writeFileSync(ENTRY, `
export { default as ConquestRegionMap } from '${mapSrcPath}';
export * as look from '${ROOT}/src/lib/conquestMapLook.ts';
export * as geometry from '${ROOT}/src/lib/conquestMapGeometry.ts';
export { NFL_CONQUEST_MAP } from '${ROOT}/src/data/conquestData.ts';
export { NBA_CONQUEST_MAP, INITIAL_TERRITORIES_NBA } from '${ROOT}/src/data/conquestDataNba.ts';
export { MLB_CONQUEST_MAP, INITIAL_TERRITORIES_MLB } from '${ROOT}/src/data/conquestDataMlb.ts';
export { NHL_CONQUEST_MAP, INITIAL_TERRITORIES_NHL } from '${ROOT}/src/data/conquestDataNhl.ts';
export { SOCCER_CONQUEST_MAP, INITIAL_TERRITORIES_SOCCER } from '${ROOT}/src/data/soccerConquest.ts';
export { seedEmpires } from '${ROOT}/src/lib/imperialism.ts';
import React from '${ROOT}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT}/node_modules/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const mod = createRequire(import.meta.url)(BUNDLE);
const { ConquestRegionMap, look, geometry, render, seedEmpires } = mod;
const { assignTeamLooks, looksDistinct, colorDistance, diffOwners, CLASH_DISTANCE, LOOK_KINDS, UNCLAIMED_COLOR } = look;

const SPORTS = [
  { spec: mod.NFL_CONQUEST_MAP, seed: () => seedEmpires() },
  { spec: mod.NBA_CONQUEST_MAP, seed: () => ({ ...mod.INITIAL_TERRITORIES_NBA }) },
  { spec: mod.MLB_CONQUEST_MAP, seed: () => ({ ...mod.INITIAL_TERRITORIES_MLB }) },
  { spec: mod.NHL_CONQUEST_MAP, seed: () => ({ ...mod.INITIAL_TERRITORIES_NHL }) },
  { spec: mod.SOCCER_CONQUEST_MAP, seed: () => ({ ...mod.INITIAL_TERRITORIES_SOCCER }) },
];
for (const { spec } of SPORTS) {
  if (!spec || !Array.isArray(spec.regions) || !Array.isArray(spec.teams) || !spec.adjacency) { console.error('a sport spec is missing its regions, teams or adjacency'); process.exit(1); }
}

/* ---------- markup readers ---------- */
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(m => {
  const attrs = {};
  for (const a of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
  return attrs;
});
const decode = s => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** The rendered look of a fill: a hex is a plain look; url(#id) is read back through its pattern def. */
function resolveFill(html, fill) {
  const m = fill.match(/^url\(#([^)]+)\)$/);
  if (!m) return { color: fill.toLowerCase(), kind: 'plain', team: null };
  const idx = html.indexOf(`id="${m[1]}"`);
  if (idx < 0) return null;
  const open = html.lastIndexOf('<pattern', idx);
  const close = html.indexOf('</pattern>', idx);
  const def = html.slice(open, close);
  const attrs = tags(def, 'pattern')[0] || {};
  const base = tags(def, 'rect')[0] || {};
  return { color: (base.fill || '').toLowerCase(), kind: attrs['data-kind'], team: attrs['data-team'], accent: (attrs['data-accent'] || '').toLowerCase() };
}
/** Round 459: the rendered rule, same as looksDistinct but read off the markup. */
const alike = (la, lb, d) => la.kind === lb.kind && d < CLASH_DISTANCE && (la.kind === 'plain' || colorDistance(la.accent, lb.accent) < CLASH_DISTANCE);

/* ---------- seeded game states ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
/** One turn: mostly a whole empire annexation, sometimes land going unclaimed, sometimes an unclaimed claim. */
function nextState(owners, spec, rng) {
  const next = { ...owners };
  const roll = rng();
  const regions = spec.regions.map(r => r.id);
  if (roll < 0.12) {
    const owned = regions.filter(r => next[r]);
    if (owned.length > 1) next[pick(owned, rng)] = null;
    return next;
  }
  if (roll < 0.32) {
    const claimable = regions.filter(r => !next[r] && (spec.adjacency[r] || []).some(n => next[n]));
    if (claimable.length) {
      const r = pick(claimable, rng);
      next[r] = next[pick((spec.adjacency[r] || []).filter(n => next[n]), rng)];
      return next;
    }
  }
  const landed = [...new Set(regions.map(r => next[r]).filter(Boolean))];
  if (landed.length < 2) return next;
  const winner = pick(landed, rng);
  const loser = pick(landed.filter(t => t !== winner), rng);
  for (const r of regions) if (next[r] === loser) next[r] = winner;
  return next;
}

/* ---------- 1 and 2: every region one owner colour, no look alike borders ---------- */
console.log('1) Every region carries exactly one owner colour');
console.log('2) No two bordering territories with different owners look alike');
const states = new Map(); // sport key -> [{prev, next}]
{
  let rendered = 0, multi = 0, wrongLook = 0, borderPairs = 0, lookAlike = 0, plainPairs = 0;
  let minPlain = Infinity, minAny = Infinity, patternedRegions = 0, regionsSeen = 0;
  for (const { spec, seed } of SPORTS) {
    const list = [];
    const looks = assignTeamLooks(spec.teams);
    const edges = [];
    for (const [a, ns] of Object.entries(spec.adjacency)) for (const b of ns) if (a < b) edges.push([a, b]);
    for (let s = 0; s < SEEDS; s++) {
      const rng = mulberry32(457 * 1000 + s);
      let owners = seed();
      for (let t = 0; t < TURNS; t++) {
        const html = render(ConquestRegionMap, { sport: spec, owners });
        rendered += 1;
        const fills = tags(html, 'path').filter(p => p['data-layer'] === 'fill');
        const byRegion = new Map();
        for (const f of fills) byRegion.set(f['data-region'], (byRegion.get(f['data-region']) || []).concat([f]));
        const rendLook = new Map();
        for (const region of spec.regions) {
          regionsSeen += 1;
          const got = byRegion.get(region.id) || [];
          if (got.length !== 1) { multi += 1; continue; }
          const owner = owners[region.id] || null;
          const resolved = resolveFill(html, got[0].fill || '');
          if (!resolved) { wrongLook += 1; continue; }
          if (!owner) {
            if (resolved.color !== UNCLAIMED_COLOR.toLowerCase() || resolved.kind !== 'plain') wrongLook += 1;
            continue;
          }
          const want = looks.get(owner);
          if (!want || resolved.color !== want.color.toLowerCase() || resolved.kind !== want.kind || (resolved.kind !== 'plain' && resolved.accent !== want.accent.toLowerCase()) || (resolved.team && resolved.team !== owner) || got[0]['data-owner'] !== owner) { wrongLook += 1; continue; }
          if (resolved.kind !== 'plain') patternedRegions += 1;
          rendLook.set(region.id, resolved);
        }
        for (const [a, b] of edges) {
          const oa = owners[a], ob = owners[b];
          if (!oa || !ob || oa === ob) continue;
          const la = rendLook.get(a), lb = rendLook.get(b);
          if (!la || !lb) continue;
          borderPairs += 1;
          const d = colorDistance(la.color, lb.color);
          minAny = Math.min(minAny, d);
          if (la.kind === 'plain' && lb.kind === 'plain') { plainPairs += 1; minPlain = Math.min(minPlain, d); }
          if (alike(la, lb, d)) lookAlike += 1;
        }
        const next = nextState(owners, spec, rng);
        list.push({ prev: owners, next });
        owners = next;
      }
    }
    states.set(spec.key, list);
  }
  console.log(`   ${rendered} states rendered across ${SPORTS.length} sports, ${regionsSeen} region draws, ${patternedRegions} of them patterned`);
  console.log(`   regions with other than one fill: ${multi}; fills not matching the owner's look: ${wrongLook}`);
  console.log(`   ${borderPairs} borders between different owners, ${lookAlike} look alike; nearest plain-on-plain border dE ${minPlain === Infinity ? 'n/a' : minPlain.toFixed(1)} over ${plainPairs} (floor ${CLASH_DISTANCE}); nearest border of any kind dE ${minAny === Infinity ? 'n/a' : minAny.toFixed(1)}`);
  if (rendered < SEEDS * TURNS * SPORTS.length) fail(`only ${rendered} states rendered`);
  if (multi > 0) fail(`${multi} region draws did not carry exactly one fill`);
  if (wrongLook > 0) fail(`${wrongLook} region fills did not resolve to the owner's look`);
  if (borderPairs < 1000) fail(`only ${borderPairs} mixed borders were exercised, too few to mean anything`);
  if (lookAlike > 0) fail(`${lookAlike} borders between different owners looked alike`);
  if (plainPairs > 0 && minPlain < CLASH_DISTANCE) fail(`a plain-on-plain border came within ${minPlain.toFixed(1)} dE`);

  // the whole league, not just the borders that happened to arise
  for (const { spec } of SPORTS) {
    const looks = [...assignTeamLooks(spec.teams).values()];
    let same = 0, patterned = 0;
    const kinds = new Set();
    for (const l of looks) { kinds.add(l.kind); if (l.kind !== 'plain') patterned += 1; }
    for (let i = 0; i < looks.length; i++) for (let j = i + 1; j < looks.length; j++) if (!looksDistinct(looks[i], looks[j])) same += 1;
    console.log(`   ${spec.key.toUpperCase()}: ${looks.length} teams, ${kinds.size} of ${LOOK_KINDS.length} looks used, ${patterned} patterned, ${same} pairs indistinguishable league wide`);
    if (same > 0) fail(`${spec.key}: ${same} team pairs cannot be told apart`);
  }
}

/* ---------- 3: the takeover marks exactly the flipped regions, spreading from the border ---------- */
console.log('3) The takeover marks exactly the flipped regions, and spreads from the winner\'s border');
{
  // A spread is only meaningful over a symmetric border graph: the hand table
  // shipped two one way edges for months (NJ_N listed CT across the Sound,
  // and only PA_E knew that it touched NJ_N), which made the blob merge and
  // the arcade's legal targets depend on which side you asked from.
  for (const { spec } of SPORTS) {
    const oneWay = [];
    for (const [a, ns] of Object.entries(spec.adjacency)) for (const b of ns) if (!spec.adjacency[b] || !spec.adjacency[b].includes(a)) oneWay.push(`${a}->${b}`);
    const drawn = new Set(spec.regions.map(r => r.id));
    const unknown = Object.keys(spec.adjacency).filter(id => !drawn.has(id)).concat(spec.regions.filter(r => !(r.id in spec.adjacency)).map(r => r.id));
    console.log(`   ${spec.key.toUpperCase()} borders: ${Object.keys(spec.adjacency).length} rows, one way edges: ${oneWay.join(' ') || 'none'}, regions drawn without borders or bordered without a drawing: ${unknown.join(' ') || 'none'}`);
    if (oneWay.length) fail(`${spec.key}: ${oneWay.length} one way border edges`);
    if (unknown.length) fail(`${spec.key}: ${unknown.length} regions are drawn and bordered inconsistently`);
  }
  let transitions = 0, flips = 0, wrongSet = 0, wrongFrom = 0, badWave = 0, idleOverlays = 0, multiFlip = 0;
  for (const { spec } of SPORTS) {
    for (const [i, { prev, next }] of states.get(spec.key).entries()) {
      const from = diffOwners(prev, next);
      const flipped = Object.keys(from);
      if (flipped.length === 0) continue;
      transitions += 1;
      flips += flipped.length;
      if (flipped.length > 1) multiFlip += 1;
      const html = render(ConquestRegionMap, { sport: spec, owners: next, takeover: { key: i + 1, from } });
      const groups = tags(html, 'g').filter(g => g['data-layer'] === 'takeover');
      const marked = groups.map(g => g['data-region']).sort();
      if (marked.join() !== [...flipped].sort().join()) { wrongSet += 1; continue; }
      for (const g of groups) if ((from[g['data-region']] ?? '') !== g['data-from']) wrongFrom += 1;
      // The spread, per new owner: wave 0 is exactly the flipped regions that
      // border land the winner already held; every later wave borders the
      // wave before it; regions with no land bridge fall together in the last
      // wave; and an empire with no bridge at all falls at once, all wave 0.
      // Land going unclaimed has nobody to spread from and is not checked.
      const waveOf = new Map(groups.map(h => [h['data-region'], Number(h['data-wave'])]));
      for (const winner of new Set(flipped.map(r => next[r]).filter(Boolean))) {
        const group = flipped.filter(r => next[r] === winner);
        const bridge = new Set(group.filter(r => (spec.adjacency[r] || []).some(n => !(n in from) && next[n] === winner)));
        const maxWave = Math.max(...group.map(r => waveOf.get(r)));
        for (const r of group) {
          const wave = waveOf.get(r);
          if (bridge.size === 0) { if (wave !== 0) badWave += 1; continue; }
          if (wave === 0) { if (!bridge.has(r)) badWave += 1; continue; }
          if (bridge.has(r)) { badWave += 1; continue; }
          const bordersPrev = (spec.adjacency[r] || []).some(n => waveOf.get(n) === wave - 1 && next[n] === winner);
          if (!bordersPrev && wave !== maxWave) badWave += 1;
        }
      }
      const idle = tags(render(ConquestRegionMap, { sport: spec, owners: next }), 'g').filter(g => g['data-layer'] === 'takeover').length;
      if (idle > 0) idleOverlays += 1;
    }
  }
  console.log(`   ${transitions} takeovers rendered (${multiFlip} of them whole empires), ${flips} region flips, ${wrongSet} overlays naming the wrong region set, ${wrongFrom} wrong old owners, ${badWave} regions in a wave that does not border the wave before it, ${idleOverlays} overlays drawn with no takeover`);
  if (transitions < 400) fail(`only ${transitions} takeovers exercised`);
  if (wrongSet > 0) fail(`${wrongSet} takeovers marked a different set of regions than the ones that flipped`);
  if (wrongFrom > 0) fail(`${wrongFrom} flipped regions carried the wrong old owner`);
  if (badWave > 0) fail(`${badWave} regions flipped out of order`);
  if (idleOverlays > 0) fail('an overlay was drawn with no takeover');
}

/* ---------- 4: one component, four sports; nobody else draws regions ---------- */
console.log(`4) The ${SPORTS.length} sports go through the same component, and no other file draws regions`);
{
  for (const { spec, seed } of SPORTS) {
    const root = tags(render(ConquestRegionMap, { sport: spec, owners: seed() }), 'svg')[0] || {};
    if (root['data-map'] !== 'conquest-region-map' || root['data-sport'] !== spec.key) fail(`${spec.key} did not render through the shared map root`);
  }
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const files = new Map();
  for (const name of fs.readdirSync(CONQUEST_DIR).filter(f => /\.tsx?$/.test(f))) {
    files.set(name, stripComments(norm(fs.readFileSync(`${CONQUEST_DIR}/${name}`, 'utf8'))));
  }
  if (CONTROL === 'private') {
    const needle = 'sport.regions.map(region =>';
    if (!mapSource.includes(needle)) refuse(`the region loop to privatise is not in ${MAP_FILE}`);
    const privateCopy = "import { NBA_STATES } from '@/data/usStatesPaths';\n" + mapSource.split(needle).join('NBA_STATES.map(region =>');
    if (privateCopy === mapSource) refuse('the rewrite changed nothing');
    files.set('ConquestMapNba.tsx', stripComments(privateCopy));
    console.log('NEGATIVE CONTROL ON (private): an in-memory ConquestMapNba.tsx draws its own regions again, this section must go red');
  }
  const drawers = [...files.entries()].filter(([, src]) => /<path\b/.test(src) && /\.map\(\s*region\s*=>/.test(src)).map(([n]) => n);
  console.log(`   files in src/components/conquest: ${files.size}; files drawing region paths: ${drawers.join(', ') || 'none'}`);
  if (drawers.length !== 1 || drawers[0] !== MAP_FILE) fail(`region paths are drawn by ${drawers.join(', ') || 'nobody'}, expected only ${MAP_FILE}`);
  for (const [name, src] of files) {
    if (name === MAP_FILE) continue;
    if (/<path\b/.test(src)) fail(`${name} draws an SVG path of its own`);
    if (/from ['"](\.\/|@\/components\/conquest\/)ConquestMap(Nba|Mlb|Nhl)?['"]/.test(src)) fail(`${name} still imports a private map component`);
  }
  const boards = ['ConquestBoard.tsx', 'ConquestBoardNba.tsx', 'ImperialismBoard.tsx', 'ImperialismBoardNba.tsx', 'ImperialismBoardMlb.tsx', 'ImperialismBoardNhl.tsx'];
  for (const b of boards) {
    const src = files.get(b);
    if (!src) { fail(`${b} is missing`); continue; }
    if (!/from ['"](\.\/|@\/components\/conquest\/)ConquestRegionMap['"]/.test(src)) fail(`${b} does not import the shared map`);
    if (!/<ConquestRegionMap\b/.test(src)) fail(`${b} does not render the shared map`);
  }
  for (const old of ['ConquestMap.tsx', 'ConquestMapNba.tsx', 'ConquestMapMlb.tsx', 'ConquestMapNhl.tsx']) {
    if (files.has(old)) fail(`${old} is back`);
  }
}

/* ---------- 5: the fight is on the map ---------- */
console.log('5) The fight is on the map: rings before the roll, the exact gain after');
{
  let checked = 0, badRings = 0, badArrow = 0, badGain = 0, badTarget = 0;
  for (const { spec } of SPORTS) {
    const list = states.get(spec.key);
    for (let i = 0; i < list.length; i += 7) {
      const { prev, next } = list[i];
      const from = diffOwners(prev, next);
      const flipped = Object.keys(from);
      const gained = [...new Set(flipped.map(r => next[r]).filter(Boolean))];
      if (gained.length !== 1) continue;
      const winner = gained[0];
      const losers = [...new Set(flipped.map(r => from[r]).filter(Boolean))];
      if (losers.length !== 1) continue;
      const loser = losers[0];
      checked += 1;
      // before the roll, on the previous map
      const pending = render(ConquestRegionMap, { sport: spec, owners: prev, battle: { attacker: winner, defender: loser, stage: 'pending' } });
      const roles = tags(pending, 'path').filter(p => p['data-layer'] === 'role');
      const attackerRegions = roles.filter(p => p['data-role'] === 'attacker').map(p => p['data-region']).sort();
      const defenderRegions = roles.filter(p => p['data-role'] === 'defender').map(p => p['data-region']).sort();
      const wantA = spec.regions.map(r => r.id).filter(r => prev[r] === winner).sort();
      const wantD = spec.regions.map(r => r.id).filter(r => prev[r] === loser).sort();
      if (attackerRegions.join() !== wantA.join() || defenderRegions.join() !== wantD.join()) badRings += 1;
      const arrow = tags(pending, 'path').find(p => p['data-layer'] === 'arrow');
      if (!arrow || arrow['data-stage'] !== 'pending' || !arrow['stroke-dasharray']) badArrow += 1;
      // after the roll, on the new map with the takeover
      const resolved = render(ConquestRegionMap, { sport: spec, owners: next, battle: { attacker: winner, defender: loser, stage: 'resolved', winner }, takeover: { key: 1, from } });
      const result = tags(resolved, 'g').find(g => g['data-layer'] === 'result');
      if (!result || result['data-winner'] !== winner || Number(result['data-gain']) !== flipped.length) badGain += 1;
    }
    // a single unclaimed target rings only that region
    const seedMap = list[0].prev;
    const target = spec.regions.map(r => r.id).find(r => !seedMap[r]) || spec.regions[0].id;
    const withTarget = { ...seedMap, [target]: null };
    const attacker = (spec.adjacency[target] || []).map(n => withTarget[n]).find(Boolean) || spec.teams[0].id;
    const html = render(ConquestRegionMap, { sport: spec, owners: withTarget, battle: { attacker, defender: null, stage: 'pending', targetRegion: target } });
    const ringed = tags(html, 'path').filter(p => p['data-layer'] === 'role' && p['data-role'] === 'defender').map(p => p['data-region']);
    if (ringed.length !== 1 || ringed[0] !== target) badTarget += 1;
  }
  console.log(`   ${checked} single-winner takeovers checked: ${badRings} with wrong role rings, ${badArrow} without a dashed pending arrow, ${badGain} with a wrong result chip; unclaimed target rings wrong on ${badTarget} of ${SPORTS.length} sports`);
  if (checked < 40) fail(`only ${checked} fights checked`);
  if (badRings > 0) fail(`${badRings} fights ringed the wrong regions`);
  if (badArrow > 0) fail(`${badArrow} pending fights had no dashed arrow`);
  if (badGain > 0) fail(`${badGain} results did not carry the exact gain`);
  if (badTarget > 0) fail('an unclaimed target was not the only ringed region');
}

/* ---------- 6: labels and reduced motion ---------- */
console.log('6) One label per empire, and reduced motion turns the takeover into a plain colour change');
{
  let blobsSeen = 0, labelMismatch = 0, badText = 0, namesUsed = 0, codesUsed = 0;
  for (const { spec } of SPORTS) {
    const teamById = new Map(spec.teams.map(t => [t.id, t]));
    const geomById = new Map(spec.regions.map(r => [r.id, { id: r.id, x: r.labelX, y: r.labelY, area: geometry.bboxArea(geometry.pathBoundingBox(r.path)) }]));
    const list = states.get(spec.key);
    for (let i = 0; i < list.length; i += 5) {
      const owners = list[i].next;
      const blobs = geometry.computeTeamBlobs(owners, geomById, spec.adjacency);
      const html = render(ConquestRegionMap, { sport: spec, owners });
      const labels = [...html.matchAll(/<text\b([^>]*data-label-team="([^"]+)"[^>]*)>([^<]*)<\/text>/g)];
      blobsSeen += blobs.length;
      if (labels.length !== blobs.length) { labelMismatch += 1; continue; }
      const perTeam = new Map();
      for (const l of labels) {
        const team = teamById.get(l[2]);
        const text = decode(l[3]);
        if (!team || (text !== team.name && text !== team.id)) badText += 1;
        else if (text === team.name) namesUsed += 1; else codesUsed += 1;
        perTeam.set(l[2], (perTeam.get(l[2]) || 0) + 1);
      }
      for (const b of blobs) {
        const n = perTeam.get(b.teamId) || 0;
        const want = blobs.filter(x => x.teamId === b.teamId).length;
        if (n !== want) labelMismatch += 1;
      }
    }
  }
  console.log(`   ${blobsSeen} empires seen, ${labelMismatch} renders with a label count off, ${badText} labels that were neither the name nor the code; names on ${namesUsed}, codes on ${codesUsed}`);
  if (labelMismatch > 0) fail(`${labelMismatch} renders did not carry one label per empire`);
  if (badText > 0) fail(`${badText} labels were neither the team name nor its code`);
  if (namesUsed === 0) fail('no empire ever got its name as a label');

  const styled = render(ConquestRegionMap, { sport: SPORTS[0].spec, owners: SPORTS[0].seed() });
  const style = (styled.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  const reduce = (style.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\}\s*`?\s*$/) || style.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)/) || [])[1] || '';
  const takeoverRule = /\.cq-takeover[^{]*\{[^}]*animation:\s*none[^}]*opacity:\s*0/.test(reduce);
  console.log(`   rendered style carries a reduced motion rule that stills the takeover overlay: ${takeoverRule ? 'yes' : 'NO'}`);
  if (!takeoverRule) fail('reduced motion does not turn the takeover into a plain colour change');
}

console.log(failures === 0 ? '\nALL CONQUEST MAP CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
