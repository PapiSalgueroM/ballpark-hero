/* Soccer Conquest (Round 358): the world map is derived from its sources, the
 * draw actually does nothing, and rating still decides games.
 *
 * WHAT IT HOLDS:
 *   1. the bake matches its sources. src/data/conquestDataSoccer.ts is
 *      generated, so it is re-derived here from FALLBACK_CLUBS, STRENGTH_PRIORS
 *      and GEO_COUNTRIES and compared club for club and country for country. A
 *      generated file nobody re-derives is just a file somebody typed once.
 *      That includes the MAP PALETTE, which exists because the first cut of this
 *      round shipped the clubs' real colours and the map was unreadable: two
 *      African clubs both on #D6202B, three more sharing #FBC403, 65 pairs
 *      within 40 in RGB. Colour is the ownership signal on a map, so it is
 *      fenced like any other data;
 *   2. the starting world is sound: every one of the basemap's countries is
 *      owned, nobody starts landless, each club holds its own country, and one
 *      country never fields two clubs;
 *   3. THE DRAW RULE, which is the whole reason this is not the hockey map
 *      reskinned: league ties finish level at a measured rate, a drawn game
 *      leaves the map byte-identical, and a knockout tie never draws;
 *   4. rating still decides. Across the field's real rating range the stronger
 *      club wins clearly more often, measured as a monotone rise rather than an
 *      "is not random" claim;
 *   5. a season always finishes and the format is survivable: every seeded
 *      season produces a champion, wiped-out clubs really do come back, and
 *      total conquest happens often enough to be a real ending;
 *   6. determinism: one seed deals one season, twice.
 *
 * NEGATIVE CONTROLS, each proving a different check is load bearing:
 *   SOCCER_CONTROL=nodraw     DRAW_BAND to 0 in a bundled copy; section 3's
 *                             draw rate must go red.
 *   SOCCER_CONTROL=drawsteal  a drawn game quietly moves one country; section
 *                             3's "nothing moved" must go red.
 *   SOCCER_CONTROL=badbake    one shipped club's rating is bent; section 1 must
 *                             catch the bake disagreeing with its sources.
 *   SOCCER_CONTROL=colorclash two clubs given one colour, which is the exact bug
 *                             the palette exists to prevent; section 1's
 *                             separation floor must go red.
 * Every control checks that the thing it edits is really there first and exits
 * rather than running a control that changed nothing.
 *
 * Run: node scripts/simConquestSoccer.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

const CONTROL = process.env.SOCCER_CONTROL || '';
const KNOWN = ['nodraw', 'drawsteal', 'badbake', 'colorclash'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`SOCCER_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/conquestSoccer.entry.mjs`;
const BUNDLE = `${TMP}/conquestSoccer.bundle.mjs`;

console.log('simConquestSoccer: the world map, the draw rule, and whether rating still decides');
if (CONTROL) console.log(`  CONTROL ACTIVE: ${CONTROL} (this run is expected to fail)`);

/* ---------- bundle the engine, with the control edit applied to a copy ---------- */
let libPath = `${ROOT}/src/lib/imperialismSoccer.ts`;
let dataPath = `${ROOT}/src/data/conquestDataSoccer.ts`;

/* A control copy lands in the temp directory, where the engine's relative import
 * of ./conquestMomentum no longer resolves. Rewrite it to the alias esbuild is
 * given, otherwise a control fails for a reason that has nothing to do with the
 * thing it is testing. */
const relocate = src => src.replace("from './conquestMomentum'", "from '@/lib/conquestMomentum'");

if (CONTROL === 'nodraw') {
  const src = relocate(fs.readFileSync(libPath, 'utf8'));
  const needle = 'export const DRAW_BAND = 0.12;';
  if (!src.includes(needle)) { console.error('control refused: the draw band is not where the control expects it'); process.exit(2); }
  libPath = `${TMP}/imperialismSoccer.control.ts`;
  fs.writeFileSync(libPath, src.replace(needle, 'export const DRAW_BAND = 0;'));
}
if (CONTROL === 'drawsteal') {
  const src = relocate(fs.readFileSync(libPath, 'utf8'));
  const needle = 'const goals = Math.floor(rng() * 4);';
  if (!src.includes(needle)) { console.error('control refused: the drawn-scoreline line is not where the control expects it'); process.exit(2); }
  libPath = `${TMP}/imperialismSoccer.control.ts`;
  fs.writeFileSync(libPath, src.replace(
    needle,
    needle + ' { const stolen = soccerLandsOf(owners, away); if (stolen.length) owners[stolen[0]] = home; }',
  ));
}
const CLUB_ROW = /(\{ id: '[^']+', name: "[^"]+", country: "[^"]+", iso: '[^']+', continent: '[^']+', color: ')([^']+)(', sourceColor: '[^']+', overall: )(\d+)( \},)/g;

if (CONTROL === 'badbake') {
  const src = fs.readFileSync(dataPath, 'utf8');
  const m = CLUB_ROW.exec(src);
  if (!m) { console.error('control refused: no club row matched, so the bend would change nothing'); process.exit(2); }
  dataPath = `${TMP}/conquestDataSoccer.control.ts`;
  fs.writeFileSync(dataPath, src.replace(m[0], `${m[1]}${m[2]}${m[3]}${+m[4] + 4}${m[5]}`));
  console.log(`  control: one shipped club's rating bent from ${m[4]} to ${+m[4] + 4}`);
}
if (CONTROL === 'colorclash') {
  // The bug this whole palette exists to prevent: two clubs on one colour.
  const src = fs.readFileSync(dataPath, 'utf8');
  const rows = [...src.matchAll(CLUB_ROW)];
  if (rows.length < 2) { console.error('control refused: fewer than two club rows matched, nothing to clash'); process.exit(2); }
  const [a, b] = rows;
  if (a[2] === b[2]) { console.error('control refused: those two clubs already share a colour, so the edit changes nothing'); process.exit(2); }
  dataPath = `${TMP}/conquestDataSoccer.control.ts`;
  fs.writeFileSync(dataPath, src.replace(b[0], `${b[1]}${a[2]}${b[3]}${b[4]}${b[5]}`));
  console.log(`  control: a second club given ${a[2]}, the colour that already belongs to another`);
}

fs.writeFileSync(ENTRY, `
export * as eng from '${libPath}';
export * as data from '${dataPath}';
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`,
  { stdio: 'inherit' },
);
const { eng, data } = await import(pathToFileURL(BUNDLE).href);
const { SOCCER_CLUBS, SOCCER_CLUB_MAP, INITIAL_TERRITORIES_SOCCER } = data;

/* A small deterministic PRNG so every measurement here is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- 1. the bake matches its sources ---------------- */
{
  const gen = await import(pathToFileURL(`${ROOT}/scripts/genConquestSoccer.mjs`).href);
  const sources = gen.readSources(ROOT);
  const { field } = gen.deriveField(sources);
  const owners = gen.deriveTerritories(field, sources.geo);
  const derivedColors = gen.deriveMapColors(field);

  if (field.length !== SOCCER_CLUBS.length) {
    fail(`re-derived ${field.length} clubs, the shipped file has ${SOCCER_CLUBS.length}`);
  } else {
    let bad = 0;
    for (const n of field) {
      const shipped = SOCCER_CLUB_MAP.get(n.club.id);
      if (!shipped) { bad += 1; fail(`re-derived club ${n.club.name} is missing from the shipped file`); continue; }
      if (shipped.name !== n.club.name || shipped.country !== n.country || shipped.iso !== n.iso ||
          shipped.continent !== n.continent || shipped.overall !== n.overall) {
        bad += 1;
        fail(`${n.club.name} disagrees with its sources (shipped ovr ${shipped.overall}/${shipped.iso}, derived ${n.overall}/${n.iso})`);
        continue;
      }
      // color is the derived map palette, sourceColor is the club's real one.
      if (shipped.color !== derivedColors[n.club.id]) {
        bad += 1;
        fail(`${n.club.name} ships map colour ${shipped.color}, the generator derives ${derivedColors[n.club.id]}`);
      }
      if (shipped.sourceColor !== n.club.color) {
        bad += 1;
        fail(`${n.club.name} records sourceColor ${shipped.sourceColor}, its real club colour is ${n.club.color}`);
      }
    }
    if (!bad) ok(`${field.length} clubs re-derived from FALLBACK_CLUBS, STRENGTH_PRIORS and GEO_COUNTRIES, all identical`);
  }

  // The map palette. This exists because the first cut shipped the clubs' real
  // colours and the map was unreadable: Wydad Casablanca and Asante Kotoko both
  // #D6202B and both in Africa, three more African clubs on #FBC403, 65 pairs
  // within 40 in RGB. Colour is the ownership signal here, so it is fenced.
  const { min: derivedMin } = gen.minPairDistance(derivedColors);
  const shippedColors = Object.fromEntries(SOCCER_CLUBS.map(c => [c.id, c.color]));
  const { min: shippedMin, pair } = gen.minPairDistance(shippedColors);
  // Measured at 35.8 for the shipped field. The floor is set at 25, below the
  // measurement with real headroom and far above the failure it exists for,
  // which is two clubs sharing a colour exactly and scoring 0.
  if (shippedMin < 25) {
    fail(`two clubs are only ${shippedMin.toFixed(1)} apart in RGB (${pair.join(' and ')}); the map cannot show whose empire is whose`);
  } else {
    ok(`map palette separates all 32 clubs, closest pair ${shippedMin.toFixed(1)} apart in RGB`);
  }
  if (Math.abs(shippedMin - derivedMin) > 0.05) {
    fail(`the shipped palette (min ${shippedMin.toFixed(1)}) is not the one the generator derives (min ${derivedMin.toFixed(1)})`);
  }
  for (const c of SOCCER_CLUBS) {
    if (!c.sourceColor) fail(`${c.name} has no sourceColor, so the club's real colour is no longer recorded`);
  }

  const shippedIsos = Object.keys(INITIAL_TERRITORIES_SOCCER).sort();
  const derivedIsos = Object.keys(owners).sort();
  if (shippedIsos.join(',') !== derivedIsos.join(',')) {
    fail(`territory keys differ: ${shippedIsos.length} shipped, ${derivedIsos.length} derived`);
  } else {
    const wrong = shippedIsos.filter(iso => INITIAL_TERRITORIES_SOCCER[iso] !== owners[iso]);
    if (wrong.length) fail(`${wrong.length} countries are owned by somebody the generator does not agree with (${wrong.slice(0, 5).join(', ')})`);
    else ok(`all ${shippedIsos.length} country assignments re-derived identically`);
  }
}

/* ---------------- 2. the starting world is sound ---------------- */
{
  const owners = eng.seedSoccerEmpires();
  const counts = eng.soccerEmpireCounts(owners);
  const sizes = SOCCER_CLUBS.map(c => counts.get(c.id) ?? 0);
  const landless = SOCCER_CLUBS.filter(c => (counts.get(c.id) ?? 0) === 0);

  if (Object.keys(owners).length !== 173) fail(`the world has ${Object.keys(owners).length} countries, expected 173`);
  if (SOCCER_CLUBS.length !== 32) fail(`the field is ${SOCCER_CLUBS.length} clubs, expected 32`);
  if (landless.length) fail(`${landless.length} clubs start landless (${landless.map(c => c.name).join(', ')}); every club should open holding at least its own country`);
  if (Object.values(owners).some(id => !SOCCER_CLUB_MAP.has(id))) fail('a country is owned by a club that is not in the field');

  const countries = new Set(SOCCER_CLUBS.map(c => c.country));
  if (countries.size !== SOCCER_CLUBS.length) fail('two clubs share a country, which breaks the one-club-per-country rule the map is built on');
  for (const c of SOCCER_CLUBS) {
    if (owners[c.iso] !== c.id) fail(`${c.name} does not open holding its own country (${c.iso} belongs to ${owners[c.iso]})`);
  }
  // Balance: this is why the field is apportioned by continent rather than by
  // rating. Taking the 32 best clubs measured at max 30, mean 5.4.
  const max = Math.max(...sizes);
  if (max > 20) fail(`one club opens holding ${max} countries; the apportionment is meant to keep the biggest empire under 20`);
  if (!failures) ok(`173 countries, 32 clubs, 32 countries, none landless, biggest opening empire ${max}, mean ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1)}`);
}

/* ---------------- 3. the draw rule ---------------- */
{
  const ids = SOCCER_CLUBS.map(c => c.id);
  let league = 0, drawn = 0, movedOnDraw = 0, knockoutDraws = 0, knockout = 0, pens = 0;
  const rng = mulberry32(20260830);

  for (let i = 0; i < 12000; i++) {
    const h = ids[Math.floor(rng() * ids.length)];
    let a = ids[Math.floor(rng() * ids.length)];
    if (a === h) a = ids[(ids.indexOf(h) + 1) % ids.length];
    // Two clubs, one country each, so the momentum context is identical every time.
    const owners = { [`x${i}`]: h, [`y${i}`]: a };
    const before = JSON.stringify(owners);
    const g = eng.resolveSoccerGame(h, a, owners, rng, undefined, false);
    league += 1;
    if (g.drawn) {
      drawn += 1;
      if (JSON.stringify(owners) !== before) movedOnDraw += 1;
      if (g.swing !== 0) movedOnDraw += 1;
    }
  }
  for (let i = 0; i < 6000; i++) {
    const h = ids[Math.floor(rng() * ids.length)];
    let a = ids[Math.floor(rng() * ids.length)];
    if (a === h) a = ids[(ids.indexOf(h) + 1) % ids.length];
    const owners = { [`x${i}`]: h, [`y${i}`]: a };
    const g = eng.resolveSoccerGame(h, a, owners, rng, undefined, true);
    knockout += 1;
    if (g.drawn) knockoutDraws += 1;
    if (g.penalties) pens += 1;
    if (!g.winner) knockoutDraws += 1;
  }

  const rate = drawn / league;
  // Measured over 15 independent seed families of 12,000 league ties each:
  // 0.2307 to 0.2463, mean 0.2395, which is about where real leagues sit. The
  // band is set outside that whole range with roughly three points of headroom
  // each way, so variance cannot decide this check. It still bites on what it
  // is for: DRAW_BAND at 0 gives 0, and doubling it gives about 0.38.
  if (rate < 0.20 || rate > 0.28) fail(`league draw rate ${(rate * 100).toFixed(1)}% is outside the 20 to 28 percent band this game is tuned for`);
  else ok(`league draw rate ${(rate * 100).toFixed(1)}% over ${league} ties`);

  if (movedOnDraw) fail(`${movedOnDraw} drawn ties moved the map; a draw must transfer nothing, that is the rule the game is built on`);
  else ok(`all ${drawn} drawn ties left the map untouched`);

  if (knockoutDraws) fail(`${knockoutDraws} knockout ties finished without a winner; a knockout cannot draw or the bracket cannot advance`);
  else ok(`${knockout} knockout ties all produced a winner, ${pens} of them on penalties`);
}

/* ---------------- 4. rating still decides ---------------- */
{
  // Sort the field by rating and play the strongest band against the weakest,
  // then the adjacent bands, and require the win rate to fall as the gap closes.
  const byRating = [...SOCCER_CLUBS].sort((a, b) => b.overall - a.overall);
  const top = byRating.slice(0, 8), bottom = byRating.slice(-8);
  const rng = mulberry32(4242);

  const winRate = (aPool, bPool, n) => {
    let wins = 0, decided = 0;
    for (let i = 0; i < n; i++) {
      const A = aPool[Math.floor(rng() * aPool.length)];
      const B = bPool[Math.floor(rng() * bPool.length)];
      if (A.id === B.id) continue;
      // Alternate home so home advantage cannot carry the result.
      const [h, a] = i % 2 === 0 ? [A, B] : [B, A];
      const owners = { [`x${i}`]: h.id, [`y${i}`]: a.id };
      const g = eng.resolveSoccerGame(h.id, a.id, owners, rng, undefined, false);
      if (g.drawn) continue;
      decided += 1;
      if (g.winner === A.id) wins += 1;
    }
    return { rate: wins / decided, decided };
  };

  const strongVsWeak = winRate(top, bottom, 8000);
  const strongVsMid = winRate(top, byRating.slice(9, 17), 8000);
  const gapTop = top.reduce((s, c) => s + c.overall, 0) / top.length;
  const gapBot = bottom.reduce((s, c) => s + c.overall, 0) / bottom.length;

  console.log(`     rating bands: top mean ${gapTop.toFixed(1)}, bottom mean ${gapBot.toFixed(1)}`);
  // Measured over 15 seed families: top beats bottom 0.9668 to 0.9732, top beats
  // middle 0.8005 to 0.8147, and the two are 0.152 to 0.172 apart. The floor sits
  // seven points under the observed minimum, and the failure it exists for is a
  // rating model that stopped mattering, which lands at 0.5.
  if (strongVsWeak.rate < 0.90) {
    fail(`the strongest eight beat the weakest eight only ${(strongVsWeak.rate * 100).toFixed(1)}% of decided ties; rating has stopped deciding games`);
  } else {
    ok(`strongest eight beat weakest eight ${(strongVsWeak.rate * 100).toFixed(1)}% of ${strongVsWeak.decided} decided ties`);
  }
  // A bare "bigger than" here would be a coin toss the day the two converge, so
  // the margin is set from the measured 0.152 floor of the observed separation.
  const spread = strongVsWeak.rate - strongVsMid.rate;
  if (spread < 0.05) {
    fail(`a bigger rating gap barely moved the edge (${strongVsWeak.rate.toFixed(3)} against the weakest, ${strongVsMid.rate.toFixed(3)} against the middle, only ${spread.toFixed(3)} apart)`);
  } else {
    ok(`the edge tracks the gap: ${strongVsWeak.rate.toFixed(3)} against the weakest, ${strongVsMid.rate.toFixed(3)} against the middle, ${spread.toFixed(3)} apart`);
  }
}

/* ---------------- 5. seasons finish, and comebacks are real ---------------- */
{
  let champions = 0, totalConquests = 0, comebacks = 0, seasons = 0;
  const winners = new Set();

  for (let s = 0; s < 60; s++) {
    const rng = mulberry32(900000 + s);
    const owners = eng.seedSoccerEmpires();
    let records = eng.soccerEmptyRecords();
    let champion = null;

    for (let r = 1; r <= eng.SOCCER_REGULAR_ROUNDS && !champion; r++) {
      const games = [];
      for (const [h, a] of eng.soccerRandomPairings(rng)) {
        const g = eng.resolveSoccerGame(h, a, owners, rng, records, false);
        if (g.comeback) comebacks += 1;
        games.push(g);
      }
      records = eng.soccerApplyRecords(records, games);
      const wiped = eng.soccerTotalConquest(owners);
      if (wiped) { champion = wiped; totalConquests += 1; }
    }
    if (!champion) {
      let alive = eng.soccerPlayoffSeeds(owners, records);
      for (let level = 0; level < 3 && alive.length > 1; level++) {
        const next = [];
        for (let i = 0; i < alive.length / 2; i++) {
          const g = eng.resolveSoccerGame(alive[i], alive[alive.length - 1 - i], owners, rng, records, true);
          if (!g.winner) { fail(`season ${s} produced a knockout tie with no winner`); break; }
          next.push(g.winner);
        }
        alive = next;
      }
      champion = alive[0] ?? null;
    }
    seasons += 1;
    if (champion) { champions += 1; winners.add(champion); }
    else fail(`season ${s} ended with no champion at all`);
  }

  if (champions !== seasons) fail(`${seasons - champions} of ${seasons} seasons failed to crown anybody`);
  else ok(`${seasons} seeded seasons, ${seasons} champions, ${winners.size} different clubs among them`);

  // A format sold on comebacks has to actually produce them.
  if (comebacks === 0) fail('no wiped-out club ever came back across 60 seasons, so the format does not do the thing the page promises');
  else ok(`${comebacks} comebacks by landless clubs across ${seasons} seasons`);
  console.log(`     total conquest ended the league phase in ${totalConquests} of ${seasons} seasons`);
  // Winners should not be a single club: that would mean the map decides itself.
  if (winners.size < 5) fail(`only ${winners.size} different clubs ever won; the map is deciding the season on its own`);
}

/* ---------------- 6. determinism ---------------- */
{
  const play = seed => {
    const rng = mulberry32(seed);
    const owners = eng.seedSoccerEmpires();
    let records = eng.soccerEmptyRecords();
    const log = [];
    for (let r = 1; r <= 6; r++) {
      const games = [];
      for (const [h, a] of eng.soccerRandomPairings(rng)) {
        const g = eng.resolveSoccerGame(h, a, owners, rng, records, false);
        games.push(g);
        log.push(`${g.home}${g.homeGoals}-${g.awayGoals}${g.away}${g.drawn ? 'd' : ''}${g.swing}`);
      }
      records = eng.soccerApplyRecords(records, games);
    }
    return log.join('|');
  };
  if (play(777) !== play(777)) fail('the same seed dealt two different seasons, so the Daily Challenge cannot be shared');
  else if (play(777) === play(778)) fail('two different seeds dealt the identical season, so the daily never changes');
  else ok('one seed deals one season twice, and a different seed deals a different one');
}

console.log('');
if (failures) {
  console.error(`simConquestSoccer: ${failures} failure(s).`);
  if (CONTROL) console.error('The control fired, which is what it is for. Run without SOCCER_CONTROL for the real result.');
  process.exit(1);
}
if (CONTROL) {
  console.error(`simConquestSoccer: CONTROL ${CONTROL} was active and NOTHING failed. The check is not looking at what it claims to look at.`);
  process.exit(1);
}
console.log('simConquestSoccer: PASS. The world is derived, the draw is real, and rating still decides.');
