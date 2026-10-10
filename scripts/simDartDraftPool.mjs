import './lib/seedRandom.mjs';
/* Dart Draft's bigger roster: more names, not a harsher game.

   Round 1145. A player wrote in through the report button on 2026-10-09: "do u plan to expand the
   player roster in dart draft? it's a pretty fun game so i think it'd be nice to bring more player
   variety into the mix". The pool was the first 900 rows of 2026 by value. It is the first 2,000 now.

   WHAT THE POOL ACTUALLY FEEDS. The game is the world map (src/lib/dartMap.ts); the wedge board that
   still sits in src/lib/dartDraft.ts is not reached by any page. On the map the pool feeds the ocean
   zones and The Machine, and a country hit reads that country's own rows straight from the table:
     wonderkid zone  the eight most valuable under 22 at the slot       (top of the pool: must not move)
     wildcard zone   the ten most valuable at the slot                  (top of the pool: must not move)
     storm zone      five from the cheap end of the pool at the slot    (a punishment: must not get worse)
     mystery zone    three at random from the old pool's range, and one  (a gold zone: must not pay less;
                     long shot from deeper in the pool                  the long shot is where depth shows)
     The Machine     one at random from the top forty (or top half) at each slot
     country hit     eight tiles from the country's own rows at the slot
   So a deeper pool alone changes little a player sees, and two things for the worse: the storm's cheap
   end gets cheaper, and three names at random from 2,000 pay less than three from 900 did (the review
   of this round measured the best of the three falling from 83.3 to 81.2). Hence the three rules this
   harness holds beside the pool size: the storm stops at what the 900th row is worth; the mystery zone
   still draws its three from above that line and shows the deeper pool as a fourth tile; and a country
   hit keeps its best four and draws its other four tiles from everyone else the country has at the
   slot (it used to show the same best eight every time).

   THE FIXTURE is shaped like the real table because it is a saved copy of it: every 2026 row's name,
   nationality, club and value from scripts/data/alphabetSprintPool.json (5,496 rows pulled 2026-09-05
   for Round 464; the 900th is worth 15M there and the 2,000th 5M, against 16M and 6M measured live on
   2026-10-09). That pull has no position or age. They are real for every row the two other saved
   pulls carry (scripts/data/auctionMarketRows.json, the top 600 with all eight columns, and
   scripts/data/stockMarketPools.json, position and age by season) and DRAWN for the rest, from the
   spread of the real ones, by a hash of the name. The count of each is printed. A drawn position is a
   measuring aid inside this harness and nothing else: it is never shipped and never shown.
   Nothing here reaches the network: the database client is swapped for one that answers from the
   fixture.

   Run: node scripts/simDartDraftPool.mjs
   Negative controls (each must turn its own section red, and refuses to run if it changes nothing):
     DART_POOL_CONTROL=pool900    the client answers the pool with 900 rows, the old depth
     DART_POOL_CONTROL=nofloor    the storm ignores the floor
     DART_POOL_CONTROL=nobest     a country hit draws all eight tiles and keeps no best four
     DART_POOL_CONTROL=onepage    the lib copy asks for one page of the pool instead of two
     DART_POOL_CONTROL=pagefloor  the page copy stops handing the storm its floor
     DART_POOL_CONTROL=nomysteryfloor  the mystery zone draws its three from anywhere, the rule the review caught
     DART_POOL_CONTROL=pagemystery     the page copy stops handing the mystery zone its floor
     DART_POOL_CONTROL=machinehalf     the map copy lets The Machine draw from the top half at a slot with no cap of forty
     DART_POOL_CONTROL=lasttile        every hit in the after arm offers only its last tile: the grade check must see it
     DART_POOL_CONTROL=nobest3         the map copy keeps no best three in a gold zone: all eight tiles are drawn
     DART_POOL_CONTROL=fixed8          the map copy draws nothing in a gold zone: the old fixed eight
     DART_POOL_CONTROL=impure          the map copy draws a gold zone from a counter of its own, not from the seeded stream
     DART_POOL_CONTROL=anyslot         the map copy stops checking the position in a gold zone
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.DART_POOL_CONTROL || '';
const CONTROLS = ['pool900', 'nofloor', 'nobest', 'onepage', 'pagefloor', 'nomysteryfloor', 'pagemystery', 'machinehalf', 'lasttile', 'nobest3', 'fixed8', 'impure', 'anyslot'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`DART_POOL_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"`])\/\/.*$/gm, '$1');
const DRAFTS = Number(process.env.DART_POOL_DRAFTS || 2000);

/* ---------------- the fixture ---------------- */
const alpha = JSON.parse(read('scripts/data/alphabetSprintPool.json')).rows;
const auction = new Map(JSON.parse(read('scripts/data/auctionMarketRows.json')).map(r => [r.player_name, r]));
const stock = JSON.parse(read('scripts/data/stockMarketPools.json'));
const col = name => stock.columns.indexOf(name);
const stockByName = new Map();
for (const rows of Object.values(stock.pools)) for (const r of rows) {
  const prev = stockByName.get(r[col('player_name')]);
  if (!prev || r[col('year')] > prev[col('year')]) stockByName.set(r[col('player_name')], r);
}
const hash01 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
const known = [];
for (const r of alpha) {
  const a = auction.get(r.player_name);
  const s = stockByName.get(r.player_name);
  if (a) known.push({ position: a.position, age: a.age });
  else if (s) known.push({ position: s[col('position')], age: s[col('age')] + (2026 - s[col('year')]) });
}
const drawFrom = (list, u) => list[Math.min(list.length - 1, Math.floor(u * list.length))];
const knownPositions = known.map(k => k.position).sort();
const knownAges = known.map(k => k.age).sort((x, y) => x - y);
let realShape = 0;
const ROWS = alpha.map((r, i) => {
  const a = auction.get(r.player_name);
  const s = stockByName.get(r.player_name);
  let position, age, goals = 0, assists = 0;
  if (a) ({ position, age, goals, assists } = a);
  else if (s) { position = s[col('position')]; age = s[col('age')] + (2026 - s[col('year')]); }
  else { position = drawFrom(knownPositions, hash01('p:' + r.player_name)); age = drawFrom(knownAges, hash01('a:' + r.player_name)); }
  if (a || s) realShape += 1;
  return { id: i + 1, year: 2026, player_name: r.player_name, position, age, nationality: r.nationality, club: r.club, market_value_usd: r.market_value_usd, goals, assists };
});
const byValue = [...ROWS].sort((x, y) => y.market_value_usd - x.market_value_usd || (x.player_name < y.player_name ? -1 : x.player_name > y.player_name ? 1 : 0));
console.log(`fixture: ${ROWS.length} rows of 2026 (name, nationality, club and value as pulled); position and age real for ${realShape}, drawn for ${ROWS.length - realShape}`);
console.log(`   row 900 is worth ${byValue[899].market_value_usd / 1e6}M, row 2000 ${byValue[1999].market_value_usd / 1e6}M; in the top 2,000 the position is real for ${byValue.slice(0, 2000).filter(r => auction.has(r.player_name) || stockByName.has(r.player_name)).length}`);

/* ---------------- the real libs over a client that answers from the fixture ---------------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-dartpool-'));
const fwd = p => p.split(path.sep).join('/');
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, `
/* from(t).select().eq().not().in().order().limit() or .range(): the calls dartDraft.ts and dartMap.ts make. */
const state: any = (globalThis as any).__DART__;
export const SUPABASE_URL = 'fixture'; export const SUPABASE_PUBLISHABLE_KEY = 'fixture';
export const supabase: any = { from: (table: string) => {
  let rows: any[] = state.rows; let offset = 0; let limit: number | null = null; let pool = false; const orders: [string, number][] = [];
  const q: any = {
    select: () => q,
    eq: (c: string, v: any) => { rows = rows.filter(r => r[c] === v); return q; },
    not: (c: string) => { pool = true; rows = rows.filter(r => r[c] != null); return q; },
    in: (c: string, vs: any[]) => { rows = rows.filter(r => vs.includes(r[c])); return q; },
    order: (c: string, o?: { ascending?: boolean }) => { orders.push([c, o && o.ascending === false ? -1 : 1]); return q; },
    limit: (n: number) => { limit = n; return q; },
    range: (a: number, z: number) => { offset = a; limit = z - a + 1; return q; },
    then: (ok: any, bad: any) => {
      const sorted = [...rows].sort((x, y) => { for (const [c, d] of orders) { if (x[c] < y[c]) return -d; if (x[c] > y[c]) return d; } return 0; });
      const capped = pool && state.poolCap ? sorted.slice(0, state.poolCap) : sorted;
      state.calls.push({ table, pool, offset, limit });
      return Promise.resolve({ data: capped.slice(offset, limit == null ? undefined : offset + limit), error: null }).then(ok, bad);
    },
  };
  return q;
} };
`);
globalThis.__DART__ = { rows: ROWS, poolCap: 0, calls: [] };
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };

/* Source level controls work on a copy: the real file is never written. */
const LIB_FILE = 'src/lib/dartDraft.ts';
const PAGE_FILE = 'src/pages/DartDraft.tsx';
let libEntry = fwd(path.join(ROOT, LIB_FILE));
let pageSource = read(PAGE_FILE);
const swap = (source, from, to, what) => {
  if (source.split(from).length - 1 !== 1) { console.error(`control cannot run: ${what} does not hold exactly one "${from}"`); process.exit(1); }
  return source.replace(from, () => to);
};
if (CONTROL === 'onepage') {
  const changed = swap(read(LIB_FILE), 'POOL_ROWS / POOL_PAGE,\n      POOL_ROWS,', '1,\n      POOL_PAGE,', LIB_FILE);
  libEntry = fwd(path.join(tmp, 'dartDraft.ts'));
  fs.writeFileSync(libEntry, changed);
  console.log('NEGATIVE CONTROL ON: the lib copy asks for one page of the pool');
}
if (CONTROL === 'pagefloor') {
  pageSource = swap(pageSource, 'stormChoices(topicPool, slot, usedNames, stormFloor)', 'stormChoices(topicPool, slot, usedNames)', PAGE_FILE);
  console.log('NEGATIVE CONTROL ON: the page copy no longer hands the storm its floor');
}
if (CONTROL === 'pagemystery') {
  pageSource = swap(pageSource, 'mysteryChoices(topicPool, slot, usedNames, stormFloor)', 'mysteryChoices(topicPool, slot, usedNames)', PAGE_FILE);
  console.log('NEGATIVE CONTROL ON: the page copy no longer hands the mystery zone its floor');
}
const MAP_FILE = 'src/lib/dartMap.ts';
let mapEntry = fwd(path.join(ROOT, MAP_FILE));
if (CONTROL === 'machinehalf') {
  /* The copy imports only through the @ alias, so it bundles from the temp folder as the real file does. */
  const changed = swap(read(MAP_FILE), 'const cut = Math.max(1, Math.min(40, Math.floor(fits.length * 0.5)));', 'const cut = Math.max(1, Math.floor(fits.length * 0.5));', MAP_FILE);
  if (/from '\.\.?\//.test(changed)) { console.error('control cannot run: dartMap.ts imports by relative path, so a copy of it cannot be bundled'); process.exit(1); }
  mapEntry = fwd(path.join(tmp, 'dartMap.ts'));
  fs.writeFileSync(mapEntry, changed);
  console.log('NEGATIVE CONTROL ON: the map copy lets The Machine draw from the top half at a slot, with no cap of forty');
}
/* Release AT: the four controls of section 2, each one edit on a copy of the map. */
const GOLD_CONTROLS = {
  nobest3: ['const picks = eligible.slice(0, 3);', 'const picks = eligible.slice(0, 0);', 'a gold zone keeps no best three: all eight tiles are drawn'],
  fixed8: ['const index = Math.floor(Math.random() * remaining.length);', 'const index = 0;', 'a gold zone draws nothing: the old fixed eight'],
  impure: ['const index = Math.floor(Math.random() * remaining.length);', 'const index = ((globalThis as any).__goldDraws = ((globalThis as any).__goldDraws ?? 0) + 1) % remaining.length;', 'a gold zone draws from a counter of its own, not from the seeded stream'],
  anyslot: ['!fitsSlot(player, slot) || used.has(key)', 'used.has(key)', 'a gold zone stops checking the position'],
};
if (GOLD_CONTROLS[CONTROL]) {
  const [from, to, what] = GOLD_CONTROLS[CONTROL];
  const changed = swap(read(MAP_FILE), from, to, MAP_FILE);
  if (/from '\.\.?\//.test(changed)) { console.error('control cannot run: dartMap.ts imports by relative path, so a copy of it cannot be bundled'); process.exit(1); }
  mapEntry = fwd(path.join(tmp, 'dartMap.ts'));
  fs.writeFileSync(mapEntry, changed);
  console.log(`NEGATIVE CONTROL ON: ${what}`);
}
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * as draft from '${libEntry}';\nexport * as map from '${mapEntry}';\nexport { getEnrichment } from '${fwd(path.join(ROOT, 'src/data/footleEnrichment.ts'))}';\nexport { playerRating, LEGENDS } from '${fwd(path.join(ROOT, 'src/lib/squadDeal.ts'))}';\nexport { GEO_COUNTRIES } from '${fwd(path.join(ROOT, 'src/data/worldMapGeo.ts'))}';\n`);
const out = path.join(tmp, 'bundle.mjs');
const { build } = await import('esbuild');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: ROOT,
  alias: { '@/integrations/supabase/client': STUB, '@': path.join(ROOT, 'src') } });
const lib = await import(pathToFileURL(out).href);
const { draft: D, map: M } = lib;

/* ---------------- two arms: the game as it was, the game as it is ---------------- */
const SLOTS = M.DART_SLOTS;
const mean = xs => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const names = cs => cs.map(c => c.player.name);
const rate = p => p.fixedOverall ?? lib.playerRating(p);

async function loadPool(cap) {
  globalThis.__DART__.poolCap = cap;
  globalThis.__DART__.calls.length = 0;
  const pool = await D.fetchDartDraftPool();
  return { ...pool, calls: globalThis.__DART__.calls.filter(c => c.pool).map(c => `${c.offset}+${c.limit}`) };
}
const before = await loadPool(900);
const after = await loadPool(CONTROL === 'pool900' ? 900 : 0);
if (CONTROL === 'pool900') console.log('NEGATIVE CONTROL ON: the client answers the pool with 900 rows, the old depth');
const stormFloorFor = arm => (CONTROL === 'nofloor' && arm === after ? 0 : arm.stormFloor);
if (CONTROL === 'nofloor') console.log('NEGATIVE CONTROL ON: the storm ignores the floor');
/* Bands for the two random sections, set from four seeds each (the default and SIM_SEED 11, 222, 3333); the measured
   numbers sit beside the checks at the foot of this file. */
const MYSTERY_BAND = 0.5;
const MACHINE_BAND = 0.5;
/* The mystery zone before this round drew its three from anywhere in the pool it had: no floor. */
const mysteryFloorFor = arm => (arm === before || CONTROL === 'nomysteryfloor' ? 0 : arm.stormFloor);
if (CONTROL === 'nomysteryfloor') console.log('NEGATIVE CONTROL ON: the mystery zone draws its three from anywhere in the deeper pool');
const keepBestFor = arm => (arm === before ? M.COUNTRY_TILES : CONTROL === 'nobest' ? 0 : undefined);
if (CONTROL === 'nobest') console.log('NEGATIVE CONTROL ON: a country hit draws all eight tiles and keeps no best four');

console.log('1) the pool is the top 2,000 in two pages, and the old 900 are still its first 900');
{
  console.log(`   before: ${before.current.length} players from 900 rows; after: ${after.current.length} players from ${D.POOL_ROWS} rows, asked for as ${after.calls.join(' and ')}`);
  if (after.calls.join(',') !== '0+1000,1000+1000') fail(`the pool was asked for as [${after.calls.join(', ')}]; it must be two pages of 1000 and nothing past them: 0+1000 and 1000+1000`);
  /* Measured on the fixture: 900 players before, 2,000 after (the saved pull is one row a name with a position the
     game knows, so nothing is dropped; the live table drops a duplicate or an odd position here and there). The floor
     sits well under the measured count on purpose: it says "about twice the old pool", which is the round. */
  if (after.current.length < 1700) fail(`the pool holds ${after.current.length} players; 2,000 rows should give well over 1,700`);
  const prefix = before.current.every((p, i) => after.current[i] && after.current[i].name === p.name);
  if (!prefix) fail('the old pool is not the head of the new one: somebody who used to be there moved or went missing');
  if (after.stormFloor !== before.stormFloor || !(after.stormFloor > 0)) fail(`the storm floor is ${after.stormFloor}M after and ${before.stormFloor}M before; it must be the same, and above zero`);
  const cheapest = arm => arm.current[arm.current.length - 1].marketValue;
  console.log(`   the cheapest man: ${cheapest(before)}M before, ${cheapest(after)}M after; the storm floor is ${after.stormFloor}M in both`);
  const wire = n => Buffer.byteLength(JSON.stringify(byValue.slice(0, n).map(({ player_name, position, age, nationality, club, market_value_usd, goals, assists }) => ({ player_name, position, age, nationality, club, market_value_usd, goals, assists }))));
  console.log(`   what the pool costs to read, as JSON before compression: ${(wire(900) / 1024).toFixed(0)} KiB in one request before, ${(wire(2000) / 1024).toFixed(0)} KiB over two requests after`);
  const src = stripComments(read(LIB_FILE));
  if (/\.limit\(\s*900\s*\)/.test(src)) fail('dartDraft.ts still asks for limit(900)');
  if (/Top-450/.test(read(LIB_FILE))) fail('dartDraft.ts still calls the pool "Top-450"');
}

console.log('2) the gold zones: the best three always, five drawn from the pool, a pure function of the seed');
{
  /* Release AT (ruling R2). Round 1182 made the legend, wonderkid and wildcard zones the best three at the slot
     plus five drawn without replacement from everybody else who fits, over Round 1145's 2,000. Until then this
     section held the wildcard ten and the wonderkid eight to the names they had on the 900 row pool, which is the
     rule Round 1182 replaced on purpose: with those two zones answering as Release AS did, the old section is green
     (remote check rAT-pools-m, line revert2). So it asserts the rule itself now, for every slot in each of the
     three zones, over GOLD_SEEDS seeded throws with the best man at the slot already drafted:
       best three  the first three tiles rate what the three best who fit rate, by an oracle written here;
       the pool    every tile is a player of the pool the zone was handed, fits the slot (and is 21 or under in
                   the wonderkid zone), no name twice, nobody already drafted, eight tiles or everybody who fits;
       drawn       the tiles after the best three are not the same five on every seed wherever more than eight
                   fit, and they go out best first;
       pure        the same seed deals the same tiles twice: nothing but the seeded stream is read.
     Controls, each must turn this section red: nobest3, fixed8, impure, anyslot. */
  const GOLD_SEEDS = 24;
  const seededRandom = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const withSeed = (seed, fn) => { const real = Math.random; Math.random = seededRandom(seed); try { return fn(); } finally { Math.random = real; } };
  const eligibleAt = (pool, slot, usedLower) => {
    const seen = new Set(), out = [];
    for (const p of pool) { const key = p.name.toLowerCase(); if (!slot.allowed.includes(p.position) || usedLower.has(key) || seen.has(key)) continue; seen.add(key); out.push(p); }
    return out;
  };
  const young = p => p.age > 0 && p.age <= 21;
  const zones = [
    ['wildcard', (slot, used) => M.wildcardChoices(after.current, slot, used), after.current, () => true],
    ['wonderkid', (slot, used) => M.wonderkidChoices(after.current, slot, used), after.current.filter(young), young],
    ['legend', (slot, used) => M.legendChoices(slot, used), lib.LEGENDS, () => true],
  ];
  const tally = { throws: 0, varied: 0, couldVary: 0, thin: 0, fewestNames: Infinity, mostNames: 0 };
  for (const [zone, deal, pool, fitsZone] of zones) {
    for (const slot of SLOTS) {
      const where = `${zone} at ${slot.label}`;
      const best = eligibleAt(pool, slot, new Set()).sort((x, y) => lib.playerRating(y) - lib.playerRating(x))[0];
      const used = new Set(best ? [best.name] : []);
      const fits = eligibleAt(pool, slot, new Set([...used].map(n => n.toLowerCase())));
      const top = [...fits].sort((x, y) => lib.playerRating(y) - lib.playerRating(x)).slice(0, 3).map(p => lib.playerRating(p));
      const due = Math.min(8, fits.length);
      const drawnNames = new Set();
      let bad = '';
      for (let seed = 1; seed <= GOLD_SEEDS && !bad; seed += 1) {
        const tiles = withSeed(seed * 7919, () => deal(slot, used));
        const again = withSeed(seed * 7919, () => deal(slot, used));
        tally.throws += 1;
        const ns = names(tiles);
        const misfits = tiles.filter(t => !slot.allowed.includes(t.player.position) || !fitsZone(t.player) || t.outOfPosition);
        const got = tiles.slice(0, 3).map(t => lib.playerRating(t.player));
        const rest = tiles.slice(3).map(t => lib.playerRating(t.player));
        if (ns.join('|') !== names(again).join('|')) bad = `seed ${seed} dealt [${ns.join(', ')}] and then [${names(again).join(', ')}]: the zone is not a pure function of its seed`;
        else if (tiles.length !== due) bad = `seed ${seed} dealt ${tiles.length} tiles where ${due} were due (${fits.length} fit)`;
        else if (new Set(ns.map(n => n.toLowerCase())).size !== ns.length) bad = `seed ${seed} offered a name twice: ${ns.join(', ')}`;
        else if (tiles.some(t => !pool.includes(t.player))) bad = `seed ${seed} offered somebody who is not in the pool the zone was handed`;
        else if (misfits.length) bad = `seed ${seed} offered somebody who does not fit: ${misfits.map(t => `${t.player.name} (${t.player.position}, ${t.player.age})`).join(', ')}`;
        else if (best && ns.includes(best.name)) bad = `seed ${seed} offered ${best.name}, who is already drafted`;
        else if (got.join(',') !== top.slice(0, got.length).join(',')) bad = `seed ${seed}: the first three tiles rate ${got.join(', ')} and the best three who fit rate ${top.join(', ')}`;
        else if (rest.some((r, i) => i > 0 && r > rest[i - 1])) bad = `seed ${seed}: the drawn tiles are not best first (${rest.join(', ')})`;
        for (const n of ns.slice(3)) drawnNames.add(n);
      }
      if (bad) { fail(`${where}: ${bad}`); continue; }
      if (fits.length <= 8) { tally.thin += 1; continue; }
      /* Five names over every seed is the old fixed tiles. Measured on the fixture (rAT-fx-e): 30 slot and zone
         pairs have more than eight who fit, and over 24 seeds their drawn tiles reach between 8 and 105 names; 3
         pairs (thin legend slots) have eight or fewer and show everybody. The span is printed below. */
      tally.couldVary += 1;
      tally.fewestNames = Math.min(tally.fewestNames, drawnNames.size);
      tally.mostNames = Math.max(tally.mostNames, drawnNames.size);
      if (drawnNames.size > 5) tally.varied += 1;
      else fail(`${where}: ${fits.length} fit and the drawn tiles were the same five names on all ${GOLD_SEEDS} seeds: nothing is drawn`);
    }
  }
  /* The legend zone never reads the pool. What can be checked is that this stays so, and that it still offers
     somebody at every slot. */
  if (M.legendChoices.length !== 2) fail(`legendChoices takes ${M.legendChoices.length} arguments; it took (slot, usedNames) and no pool, which is why a deeper pool cannot move it`);
  const legendless = SLOTS.filter(slot => M.legendChoices(slot, new Set()).length === 0).map(slot => slot.label);
  if (legendless.length) fail(`the legend zone offers nobody at ${legendless.join(', ')}`);
  /* A harness that never met a zone with more than eight to draw from would prove nothing about the draw. */
  if (tally.couldVary < SLOTS.length) fail(`only ${tally.couldVary} slot and zone pairs had more than eight who fit; the wildcard zone alone should give ${SLOTS.length}`);
  console.log(`   ${tally.throws} seeded throws, ${SLOTS.length} slots in three zones: the best three lead every one, every tile is from the pool and fits, and each throw replays from its seed`);
  console.log(`   the drawn five: more than five names over ${GOLD_SEEDS} seeds at ${tally.varied} of ${tally.couldVary} slot and zone pairs with more than eight who fit (between ${tally.fewestNames} and ${tally.mostNames} names); ${tally.thin} pairs have eight or fewer and show everybody`);
}

console.log('3) the storm did not get worse');
{
  let worse = 0, lines = [];
  const drops = [], noFloorDrops = [];
  for (const slot of SLOTS) {
    const none = new Set();
    const s0 = M.stormChoices(before.current, slot, none, stormFloorFor(before)), s1 = M.stormChoices(after.current, slot, none, stormFloorFor(after));
    const unfloored = M.stormChoices(after.current, slot, none, 0);
    const lo = cs => Math.min(...cs.map(c => c.player.marketValue));
    if (!s0.length || !s1.length) { fail(`the storm offers nobody at ${slot.label}`); continue; }
    const avg = cs => mean(cs.map(c => rate(c.player)));
    drops.push(avg(s0) - avg(s1));
    /* The storm is not random: one pool and one floor give the same five tiles every time, so there is no seed
       spread to measure and the four seeds print the same line. On the fixture, with the floor, the five tiles'
       average falls at no slot (it is level at seven and rises by 0.40 to 2.20 at four, where men tied at the
       floor's value sit a few rows past the 900th); with no floor it falls by 2.80 to 6.20 at every slot. The line
       is half a point: a tile is one of five, so that is two and a half tile points of drift, and the nearest no
       floor slot is more than five times past it. */
    if (avg(s0) - avg(s1) > 0.5) { worse += 1; fail(`storm at ${slot.label}: its five tiles averaged ${avg(s0).toFixed(1)} and now average ${avg(s1).toFixed(1)}`); }
    noFloorDrops.push(avg(s0) - avg(unfloored));
    if (s1.some(c => c.player.marketValue < before.stormFloor)) fail(`storm at ${slot.label} offers a man under the ${before.stormFloor}M floor`);
    lines.push(`${slot.label} ${lo(s0)}M>${lo(s1)}M (${lo(unfloored)}M with no floor)`);
  }
  console.log(`   cheapest storm tile before>after, and what the deeper pool would have handed out: ${[...new Set(lines)].join(', ')}`);
  /* The control has to be able to bite: without the floor the deeper pool must really reach lower somewhere. */
  const bites = SLOTS.some(slot => Math.min(...M.stormChoices(after.current, slot, new Set(), 0).map(c => c.player.marketValue)) < before.stormFloor);
  if (CONTROL === 'nofloor' && !bites) { console.error('control cannot run: with no floor the storm reaches no lower, so the floor changes nothing'); process.exit(1); }
  if (!bites && CONTROL !== 'pool900') fail('with no floor the storm reaches no lower than before, so this section proves nothing about the floor');
  const page = stripComments(pageSource);
  if (!/stormChoices\(\s*topicPool\s*,\s*slot\s*,\s*usedNames\s*,\s*stormFloor\s*\)/.test(page)) fail('the page does not hand the storm zone its floor: stormChoices(topicPool, slot, usedNames, stormFloor)');
  if (!/const\s*\{\s*current\s*,\s*stormFloor:\s*floor\s*\}\s*=\s*await fetchDartDraftPool\(\)/.test(page) || !/setStormFloor\(floor\)/.test(page)) fail('the page does not keep the floor the fetch returns');
  console.log(`   the five storm tiles' average rating fell by ${mean(drops).toFixed(2)} a slot on average (slot by slot: ${drops.map(d => d.toFixed(2)).join(', ')}); ${worse} slots fell by more than half a point`);
  console.log(`   with no floor it would have fallen by ${mean(noFloorDrops).toFixed(2)} a slot on average (slot by slot: ${noFloorDrops.map(d => d.toFixed(2)).join(', ')})`);
}

console.log('4) a country hit keeps its best four and reaches deeper for the rest');
const HITS = 30;
{
  let pairs = 0, deep = 0, namesBefore = 0, namesAfter = 0, lostBest = 0, bestMoved = 0, shallowChanged = 0, deepStuck = 0;
  for (const country of lib.GEO_COUNTRIES) {
    const pool = await M.fetchCountryPool(country);
    if (!pool.length) continue;
    for (const slot of [...new Map(SLOTS.map(sl => [sl.allowed.join('/'), sl])).values()]) {
      const atSlot = pool.filter(p => slot.allowed.includes(p.position)).length;
      if (!atSlot) continue;
      pairs += 1;
      const old = await M.countryChoices(country, slot, new Set(), { keepBest: keepBestFor(before) });
      const seen = new Set();
      for (let i = 0; i < HITS; i++) {
        const now = await M.countryChoices(country, slot, new Set(), { keepBest: keepBestFor(after) });
        names(now).forEach(n => seen.add(n));
        if (!names(old).slice(0, M.COUNTRY_KEEP_BEST).every(n => names(now).includes(n))) lostBest += 1;
        if (rate(now[0].player) !== rate(old[0].player)) bestMoved += 1;
        if (atSlot <= M.COUNTRY_TILES && names(now).join('|') !== names(old).join('|')) shallowChanged += 1;
      }
      namesBefore += old.length;
      namesAfter += seen.size;
      if (atSlot > M.COUNTRY_TILES) { deep += 1; if (seen.size <= M.COUNTRY_TILES) deepStuck += 1; }
    }
  }
  console.log(`   ${pairs} country and slot pairs have real players; ${deep} of them run deeper than eight`);
  console.log(`   names a country hit could show: ${namesBefore} before, ${namesAfter} after ${HITS} hits each (${(namesAfter / namesBefore).toFixed(2)}x)`);
  if (lostBest) fail(`${lostBest} hits were missing one of the country's best four at the slot`);
  if (bestMoved) fail(`${bestMoved} hits offered a different best tile than before, so the strongest pick moved`);
  if (shallowChanged) fail(`${shallowChanged} hits on a country with eight or fewer at the slot changed what it shows`);
  if (deepStuck) fail(`${deepStuck} deep pairs still showed only the same eight names over ${HITS} hits`);
  if (CONTROL === 'nobest' && deep === 0) { console.error('control cannot run: no country runs deeper than eight at a slot'); process.exit(1); }
  globalThis.__TILES__ = { namesBefore, namesAfter };
}

console.log('5) the mystery zone pays what it paid, and the deeper pool shows as a fourth tile');
{
  let reachBefore = 0, reachAfter = 0, hits = 0, withLongShot = 0, underLine = 0, threeUnder = 0; const best0 = [], best1 = [], bestAnywhere = [];
  for (const slot of SLOTS) {
    const fits = arm => arm.current.filter(p => slot.allowed.includes(p.position));
    reachBefore += fits(before).length; reachAfter += fits(after).length;
    for (let i = 0; i < 400; i++) {
      best0.push(Math.max(...M.mysteryChoices(before.current, slot, new Set(), mysteryFloorFor(before)).map(c => rate(c.player))));
      const now = M.mysteryChoices(after.current, slot, new Set(), mysteryFloorFor(after));
      best1.push(Math.max(...now.map(c => rate(c.player))));
      bestAnywhere.push(Math.max(...M.mysteryChoices(after.current, slot, new Set(), 0).map(c => rate(c.player))));
      hits += 1;
      const under = now.filter(c => c.player.marketValue < after.stormFloor).length;
      if (now.length === M.MYSTERY_TILES + 1 && under >= 1) withLongShot += 1;
      underLine += under;
      /* The three are the first three tiles; the long shot, when there is one, comes last. */
      if (now.slice(0, M.MYSTERY_TILES).some(c => c.player.marketValue < after.stormFloor)) threeUnder += 1;
    }
  }
  globalThis.__MYSTERY__ = { before: mean(best0), after: mean(best1), anywhere: mean(bestAnywhere), hits, withLongShot, threeUnder };
  console.log(`   names a mystery tile could be, summed over the 11 slots: ${reachBefore} before, ${reachAfter} after`);
  console.log(`   the best tile is rated ${mean(best0).toFixed(2)} on average before (median ${median(best0)}), ${mean(best1).toFixed(2)} after (median ${median(best1)}); three from anywhere in the deeper pool would have given ${mean(bestAnywhere).toFixed(2)} (median ${median(bestAnywhere)})`);
  console.log(`   ${withLongShot} of ${hits} hits carried a fourth tile from under the ${after.stormFloor}M line; ${threeUnder} hits had one of the three under it`);
  if (reachAfter <= reachBefore && CONTROL !== 'pool900') fail('the mystery zone reaches no more names than before, so the bigger pool is not showing anywhere');
  const page = stripComments(pageSource);
  if (!/mysteryChoices\(\s*topicPool\s*,\s*slot\s*,\s*usedNames\s*,\s*stormFloor\s*\)/.test(page)) fail('the page does not hand the mystery zone its floor: mysteryChoices(topicPool, slot, usedNames, stormFloor)');
  /* The control has to be able to bite: three from anywhere must really pay less than three from above the line. */
  if (CONTROL === 'nomysteryfloor' && !(mean(bestAnywhere) < mean(best0) - MYSTERY_BAND)) { console.error('control cannot run: three from anywhere pay no less here, so the floor changes nothing'); process.exit(1); }
}

console.log('6) The Machine is the opponent it was');
{
  const xi = arm => D.squadRating(M.machineMapDraft(arm.current));
  const r0 = Array.from({ length: 1000 }, () => xi(before)), r1 = Array.from({ length: 1000 }, () => xi(after));
  console.log(`   The Machine's XI is rated ${mean(r0).toFixed(2)} on average before (median ${median(r0)}), ${mean(r1).toFixed(2)} after (median ${median(r1)}): a move of ${(mean(r1) - mean(r0)).toFixed(2)}`);
  /* How far the cap of forty is from the deeper pool's top half, so the reader can see what the cap is holding back. */
  const fitsAt = (arm, slot) => arm.current.filter(p => slot.allowed.includes(p.position)).length;
  console.log(`   players at a slot, fewest to most: ${Math.min(...SLOTS.map(s => fitsAt(before, s)))} to ${Math.max(...SLOTS.map(s => fitsAt(before, s)))} before, ${Math.min(...SLOTS.map(s => fitsAt(after, s)))} to ${Math.max(...SLOTS.map(s => fitsAt(after, s)))} after; The Machine draws from the top forty or the top half, whichever is fewer`);
  globalThis.__MACHINE__ = { before: mean(r0), after: mean(r1) };
}

console.log(`7) ${DRAFTS} whole drafts a model, before and after, graded by the game's own functions`);
/* The page's own two small rules, which live inside the component: an out of position pick is rated on a third of
   his value, and the tile shows the rating a pick would carry. */
const adjusted = (xi, oop) => xi.map((p, i) => (p && oop[i] ? { ...p, marketValue: Math.max(1, Math.round(p.marketValue / 3)) } : p));
const shown = c => c.player.fixedOverall ?? Math.max(35, lib.playerRating(c.player) - (c.outOfPosition ? 8 : 0));
const GRADES = ['F', 'D', 'C', 'B', 'A', 'S'];
/* One draft, the way resolveLanding in the page runs it. The thrower lands on a uniform point of the round's camera
   box ('any') or keeps throwing until it is not open water ('land', somebody who can aim). The picker takes the best
   tile shown or one at random. The lifeboat is not used. Topic: Current Stars. */
async function oneDraft(arm, thrower, picker, seed) {
  const used = new Set(); const xi = []; const oop = [];
  for (let t = 0; t < SLOTS.length; t++) {
    const slot = SLOTS[t];
    const view = M.ROUND_VIEWS[Math.min(t, M.ROUND_VIEWS.length - 1)];
    const box = M.viewBoxOf(view);
    const zones = M.rollZones(view, t, seed);
    let hit, tries = 0;
    if (thrower === 'sharp') hit = { kind: 'country', country: BIG[Math.floor(Math.random() * BIG.length)] };
    else do { hit = M.resolveMapThrow(box.x + Math.random() * box.w, box.y + Math.random() * box.h, zones); tries += 1; } while (thrower === 'land' && hit.kind === 'ocean' && tries < 400);
    let c = [];
    if (hit.kind === 'zone') {
      const k = hit.zone.kind;
      c = k === 'legend' ? M.legendChoices(slot, used)
        : k === 'wonderkid' ? M.wonderkidChoices(arm.current, slot, used)
        : k === 'mystery' ? M.mysteryChoices(arm.current, slot, used, mysteryFloorFor(arm))
        : k === 'storm' ? M.stormChoices(arm.current, slot, used, stormFloorFor(arm))
        : k === 'shark' ? [{ player: M.oceanTrialist(slot, 'shark'), outOfPosition: false }]
        : M.wildcardChoices(arm.current, slot, used);
      if (!c.length && k !== 'shark') c = M.wildcardChoices(arm.current, slot, used);
    } else if (hit.kind === 'country') {
      c = await M.countryChoices(hit.country, slot, used, { keepBest: keepBestFor(arm) });
    }
    if (!c.length) c = [{ player: M.oceanTrialist(slot), outOfPosition: false }];
    /* The control: a round that lost the top of every hit. Tiles go out best first, so the last is the weakest. */
    if (CONTROL === 'lasttile' && arm === after) c = c.slice(-1);
    const pick = picker === 'best' ? c.reduce((b, x) => (shown(x) > shown(b) ? x : b), c[0]) : c[Math.floor(Math.random() * c.length)];
    xi.push(pick.player); oop.push(pick.outOfPosition); used.add(pick.player.name);
  }
  const final = adjusted(xi, oop);
  /* The same XI with every unknown club made a league of its own: what the rating is when 'Other' is not a cluster. */
  let n = 0;
  const apart = final.map(p => (p && p.fixedOverall === undefined && p.league === 'Other' ? { ...p, league: 'Other ' + (n += 1) } : p));
  return { rating: D.squadRating(final), apart: D.squadRating(apart), unknown: n };
}
/* 'sharp' ignores the camera and always sticks one of the twelve nations with the dearest eleven: the ceiling of the board. */
const strength = [];
for (const country of lib.GEO_COUNTRIES) { const pool = await M.fetchCountryPool(country); strength.push([country, pool.slice(0, 11).reduce((sum, p) => sum + p.marketValue, 0)]); }
const BIG = strength.sort((x, y) => y[1] - x[1]).slice(0, 12).map(x => x[0]);
console.log(`   the twelve dearest nations: ${BIG.map(c => c.name).join(', ')}`);
const results = {};
const chem = { before: [], after: [] };
for (const [thrower, picker] of [['sharp', 'best'], ['sharp', 'random'], ['land', 'best'], ['land', 'random'], ['any', 'best'], ['any', 'random']]) {
  const row = {};
  for (const [label, arm] of [['before', before], ['after', after]]) {
    const ratings = [];
    for (let i = 0; i < DRAFTS; i++) { const d = await oneDraft(arm, thrower, picker, 1000 + i * 7919); ratings.push(d.rating); if (thrower !== 'any') chem[label].push(d); }
    const grades = Object.fromEntries(GRADES.map(g => [g, 0]));
    for (const r of ratings) grades[D.squadGrade(r).grade] += 1;
    row[label] = { mean: mean(ratings), median: median(ratings), grade: D.squadGrade(median(ratings)).grade, grades };
    console.log(`   ${thrower} thrower, ${picker} pick, ${label}: XI ${row[label].mean.toFixed(2)} on average, median ${row[label].median} (${row[label].grade}); grades ${GRADES.map(g => g + ' ' + grades[g]).join(', ')}`);
  }
  results[`${thrower}/${picker}`] = row;
  const shift = Math.abs(GRADES.indexOf(row.after.grade) - GRADES.indexOf(row.before.grade));
  if (shift > 1) fail(`${thrower} thrower, ${picker} pick: the median grade moved ${shift} grades (${row.before.grade} to ${row.after.grade}); more than one is a finding for the lead`);
}

console.log('8) clubs the league lookup does not know');
{
  /* getEnrichment decides a league from the club first, then from its hand list, and says 'Other' for a club it does
     not know (Round 315: never a famous league by default). The map game has no league filter, so nobody is ever
     dropped or moved for it; the one place a league counts is the chemistry bonus in squadRating. */
  const share = players => players.filter(p => p.league === 'Other').length / Math.max(1, players.length);
  console.log(`   pool players at a club the lookup does not know: ${(100 * share(before.current)).toFixed(1)}% of the old ${before.current.length}, ${(100 * share(after.current)).toFixed(1)}% of the ${after.current.length}`);
  /* Which clubs they are, so whoever extends the lookup knows where to start: the unknown clubs with the most pool
     players, and what their dearest man is worth. Names as the saved pull spells them. */
  const byClub = new Map();
  for (const p of after.current) if (p.league === 'Other') { const c = byClub.get(p.club) || { n: 0, top: 0 }; c.n += 1; c.top = Math.max(c.top, p.marketValue); byClub.set(p.club, c); }
  const worst = [...byClub].sort((x, y) => y[1].n - x[1].n || y[1].top - x[1].top || (x[0] < y[0] ? -1 : 1)).slice(0, 20);
  console.log(`   ${byClub.size} clubs in the pool are unknown to the lookup; the twenty with the most players (players, dearest in M): ${worst.map(([club, c]) => `${club} (${c.n}, ${c.top})`).join('; ')}`);
  const tiles = [];
  for (const country of lib.GEO_COUNTRIES) tiles.push(...await M.fetchCountryPool(country));
  console.log(`   players a country hit reads (every 2026 row of each nation since Round 1182; it was the top 120): ${tiles.length}, ${(100 * share(tiles)).toFixed(1)}% at a club the lookup does not know`);
  for (const label of ['before', 'after']) {
    const ds = chem[label];
    const paid = ds.filter(d => d.rating !== d.apart);
    console.log(`   ${label}: ${ds.length} aimed drafts carry ${mean(ds.map(d => d.unknown)).toFixed(2)} such players each; in ${(100 * paid.length / ds.length).toFixed(1)}% of them the chemistry bonus counts unknown clubs as one league (${mean(paid.map(d => d.rating - d.apart)).toFixed(2)} rating points when it does)`);
  }
}

/* ---------------- what the numbers have to hold ---------------- */
{
  const lb = results['land/best'], sb = results['sharp/best'];
  /* An aimed best pick is the player this round must not hurt. Measured over four seeds of 2,000 drafts (the default
     and SIM_SEED 11, 222, 3333) the average XI moved by +0.04, -0.11, +0.11, -0.04 for the land thrower and by +0.04,
     -0.04, -0.03, -0.02 for the sharp one, which is the noise of the draw: his best tile is the same tile. (The
     round's first measurement, before the mystery zone took its floor, saw moves up to 0.20.) A grade band is eight
     points wide, so a whole point of drift is the line, five times the largest move seen. The random picker is
     printed and NOT held to it, and the reader should know what he gives up: 1.74 to 1.89 at the big nations (81.0
     to 79.1, still an A at the median, with about 400 of 2,000 drafts sliding from A to B), 0.38 to 0.56 on open
     land and 0.21 to 0.34 for a blind thrower. That is the price of tiles that reach past the best eight.
     Release AT: those are Round 1145's numbers, when a country was read as its first 120 rows. Round 1182 reads a
     country all the way down, so the four drawn tiles of a country hit now reach every row of the nation, and
     the random picker at the big nations pays more. On this tree: 81.02 before and 77.64 after, a median of
     78, the bottom of the A band, with 990 of 2,000 drafts at B (remote check rAT-fx-e). Release AS measured
     79.08, median 79, 485 at B (rAT-bis), and the integrated tree before the drawn tiles went out best first
     77.61, median 77, a B, 1,005 at B (rAT-pc). So his median now sits on the line between A and B and about
     half his drafts are a B where a quarter were. The best pick does not move (86.98 against 87.02), and
     nobody who takes the best tile pays it. DART_POOL_CONTROL=lasttile is the proof
     that the grade check below can go red: with only the last tile of every hit on offer the sharp thrower's median
     falls from S to B. */
  for (const [name, row] of [['land thrower, best pick', lb], ['sharp thrower, best pick', sb]]) {
    if (row.after.mean < row.before.mean - 1) fail(`${name}: the average XI fell from ${row.before.mean.toFixed(2)} to ${row.after.mean.toFixed(2)}, more than a rating point`);
  }
  if (GRADES.indexOf(sb.after.grade) < GRADES.indexOf('A')) fail(`a thrower who sticks the big nations and takes the best tile grades ${sb.after.grade} at the median: the top bands are out of reach`);
  const T = globalThis.__TILES__;
  /* Measured 1.58x on the fixture. The bar is "clearly more", with room: at 1.2x the draw would barely reach past the old eight. */
  if (CONTROL !== 'nobest' && T.namesAfter < T.namesBefore * 1.2) fail(`country hits show ${T.namesAfter} names against ${T.namesBefore} before: that is not more variety`);
  const machine = globalThis.__MACHINE__;
  /* The Machine draws one man from the top forty at a slot, or from the top half when the slot has fewer than
     eighty. The deeper pool makes its thinnest slots thicker (49 players before, 134 after), so there its cut grows
     from the top 24 to the top 40 and it is a touch weaker for it: its average XI moved by -0.17, -0.12, -0.14 and
     -0.07 over the four seeds, 1,000 drafts an arm. That is real and small, in the player's favour, and reported
     as such. Half a point is the line, three times the largest move seen; DART_POOL_CONTROL=machinehalf (no cap of
     forty, so the cut follows the pool's depth everywhere) moves it by 3.08. */
  if (Math.abs(machine.after - machine.before) > MACHINE_BAND) fail(`The Machine's average XI moved from ${machine.before.toFixed(2)} to ${machine.after.toFixed(2)}: the opponent changed`);
  const my = globalThis.__MYSTERY__;
  /* The best tile of a mystery hit, 400 hits a slot: before to after it moved by -0.10, +0.04, +0.03 and -0.01 over
     the four seeds (83.2 to 83.3 in both arms), and three from anywhere in the deeper pool would have paid 81.1 to
     81.2, a fall of 2.0 to 2.2. Half a point is the line: five times the largest fall seen, a quarter of what the
     rule prevents. The two counts under it are not random at all: with the floor none of the three can come from
     under the line, and every hit has a long shot because every slot has men under it. */
  if (my.after < my.before - MYSTERY_BAND) fail(`the mystery zone's best tile fell from ${my.before.toFixed(2)} to ${my.after.toFixed(2)} on average: a gold zone pays less than it did`);
  if (my.threeUnder) fail(`${my.threeUnder} of ${my.hits} mystery hits drew one of the three from under the old pool's line`);
  if (my.withLongShot !== my.hits) fail(`${my.withLongShot} of ${my.hits} mystery hits carried a fourth tile from deeper in the pool: the bigger roster is not showing there`);
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* a temp folder the OS will clear */ }
if (CONTROL) {
  if (failures === 0) { console.error(`\nCONTROL ${CONTROL} DID NOT FIRE: every section stayed green with the rule broken.`); process.exit(2); }
  console.log(`\nsimDartDraftPool control ${CONTROL}: fired, ${failures} failure(s) above. Exit 1 is the expected result.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimDartDraftPool: ${failures} FAILURE(S)`); process.exit(1); }
console.log('\nsimDartDraftPool: green. The pool is the top 2,000, the gold zones keep their best three and draw five from the pool, the storm gives what it gave, the mystery zone pays what it paid and adds a long shot, a country hit keeps its best four and shows more names, The Machine is the opponent it was, and whole drafts grade where they did.');
