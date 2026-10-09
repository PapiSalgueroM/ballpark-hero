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
     mystery zone    three at random from anywhere in the pool          (this is where depth shows)
     The Machine     one at random from the top forty (or top half) at each slot
     country hit     eight tiles from the country's own rows at the slot
   So a deeper pool alone changes little a player sees, and one thing for the worse: the storm's cheap
   end gets cheaper. Hence the two rules this harness holds beside the pool size: the storm stops at
   what the 900th row is worth, and a country hit keeps its best four and draws its other four tiles
   from everyone else the country has at the slot (it used to show the same best eight every time).

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
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.DART_POOL_CONTROL || '';
const CONTROLS = ['pool900', 'nofloor', 'nobest', 'onepage', 'pagefloor'];
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
  const changed = swap(read(LIB_FILE), 'Array.from({ length: POOL_ROWS / POOL_PAGE }, (_, i) =>', 'Array.from({ length: 1 }, (_, i) =>', LIB_FILE);
  libEntry = fwd(path.join(tmp, 'dartDraft.ts'));
  fs.writeFileSync(libEntry, changed);
  console.log('NEGATIVE CONTROL ON: the lib copy asks for one page of the pool');
}
if (CONTROL === 'pagefloor') {
  pageSource = swap(pageSource, 'stormChoices(topicPool, slot, usedNames, stormFloor)', 'stormChoices(topicPool, slot, usedNames)', PAGE_FILE);
  console.log('NEGATIVE CONTROL ON: the page copy no longer hands the storm its floor');
}
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * as draft from '${libEntry}';\nexport * as map from '${fwd(path.join(ROOT, 'src/lib/dartMap.ts'))}';\nexport { getEnrichment } from '${fwd(path.join(ROOT, 'src/data/footleEnrichment.ts'))}';\nexport { playerRating, LEGENDS } from '${fwd(path.join(ROOT, 'src/lib/squadDeal.ts'))}';\nexport { GEO_COUNTRIES } from '${fwd(path.join(ROOT, 'src/data/worldMapGeo.ts'))}';\n`);
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
const keepBestFor = arm => (arm === before ? M.COUNTRY_TILES : CONTROL === 'nobest' ? 0 : undefined);
if (CONTROL === 'nobest') console.log('NEGATIVE CONTROL ON: a country hit draws all eight tiles and keeps no best four');

console.log('1) the pool is the top 2,000 in two pages, and the old 900 are still its first 900');
{
  console.log(`   before: ${before.current.length} players from 900 rows; after: ${after.current.length} players from ${D.POOL_ROWS} rows, asked for as ${after.calls.join(' and ')}`);
  if (after.calls.join(',') !== '0+1000,1000+1000') fail(`the pool was asked for as [${after.calls.join(', ')}]; it must be two pages of 1000: 0+1000 and 1000+1000`);
  /* Measured on the fixture: 900 players before, 2,000 after (the saved pull is one row a name with a position the
     game knows, so nothing is dropped; the live table drops a duplicate or an odd position here and there). The floor
     sits well under the measured count on purpose: it says "about twice the old pool", which is the round. */
  if (after.current.length < 1700) fail(`the pool holds ${after.current.length} players; 2,000 rows should give well over 1,700`);
  const prefix = before.current.every((p, i) => after.current[i] && after.current[i].name === p.name);
  if (!prefix) fail('the old pool is not the head of the new one: somebody who used to be there moved or went missing');
  if (after.stormFloor !== before.stormFloor || !(after.stormFloor > 0)) fail(`the storm floor is ${after.stormFloor}M after and ${before.stormFloor}M before; it must be the same, and above zero`);
  const cheapest = arm => arm.current[arm.current.length - 1].marketValue;
  console.log(`   the cheapest man: ${cheapest(before)}M before, ${cheapest(after)}M after; the storm floor is ${after.stormFloor}M in both`);
  const src = stripComments(read(LIB_FILE));
  if (/\.limit\(\s*900\s*\)/.test(src)) fail('dartDraft.ts still asks for limit(900)');
  if (/Top-450/.test(read(LIB_FILE))) fail('dartDraft.ts still calls the pool "Top-450"');
}

console.log('2) the gold zones give what they gave: the top of the pool did not move');
{
  let wildSame = 0, kidSame = 0, kidGrew = 0;
  for (const slot of SLOTS) {
    const none = new Set();
    const w0 = names(M.wildcardChoices(before.current, slot, none)), w1 = names(M.wildcardChoices(after.current, slot, none));
    if (w0.join('|') === w1.join('|')) wildSame += 1; else fail(`wildcard at ${slot.label} changed: ${w0.join(', ')} became ${w1.join(', ')}`);
    const k0 = names(M.wonderkidChoices(before.current, slot, none)), k1 = names(M.wonderkidChoices(after.current, slot, none));
    if (k0.every((n, i) => k1[i] === n)) { kidSame += 1; if (k1.length > k0.length) kidGrew += 1; } else fail(`wonderkids at ${slot.label} lost somebody: ${k0.join(', ')} became ${k1.join(', ')}`);
    const l0 = names(M.legendChoices(slot, none)), l1 = names(M.legendChoices(slot, none));
    if (l0.join('|') !== l1.join('|')) fail(`legends at ${slot.label} are not stable`);
  }
  console.log(`   wildcard identical at ${wildSame} of ${SLOTS.length} slots; wonderkids keep every name at ${kidSame} of ${SLOTS.length} and gain names at ${kidGrew} where the old pool ran short of eight`);
}

console.log('3) the storm did not get worse');
{
  let worse = 0, lines = [];
  const drops = [];
  for (const slot of SLOTS) {
    const none = new Set();
    const s0 = M.stormChoices(before.current, slot, none, stormFloorFor(before)), s1 = M.stormChoices(after.current, slot, none, stormFloorFor(after));
    const unfloored = M.stormChoices(after.current, slot, none, 0);
    const lo = cs => Math.min(...cs.map(c => c.player.marketValue));
    if (!s0.length || !s1.length) { fail(`the storm offers nobody at ${slot.label}`); continue; }
    const avg = cs => mean(cs.map(c => rate(c.player)));
    drops.push(avg(s0) - avg(s1));
    if (avg(s0) - avg(s1) > 1) { worse += 1; fail(`storm at ${slot.label}: its five tiles averaged ${avg(s0).toFixed(1)} and now average ${avg(s1).toFixed(1)}`); }
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
  console.log(`   the five storm tiles' average rating fell by ${mean(drops).toFixed(2)} a slot on average (${Math.max(...drops).toFixed(2)} at the worst slot); ${worse} slots fell by more than a point`);
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

console.log('5) the mystery zone is where the deeper pool shows');
{
  let reachBefore = 0, reachAfter = 0; const best0 = [], best1 = [];
  for (const slot of SLOTS) {
    const fits = arm => arm.current.filter(p => slot.allowed.includes(p.position));
    reachBefore += fits(before).length; reachAfter += fits(after).length;
    for (let i = 0; i < 400; i++) {
      best0.push(Math.max(...M.mysteryChoices(before.current, slot, new Set()).map(c => rate(c.player))));
      best1.push(Math.max(...M.mysteryChoices(after.current, slot, new Set()).map(c => rate(c.player))));
    }
  }
  console.log(`   names the three could be, summed over the 11 slots: ${reachBefore} before, ${reachAfter} after`);
  console.log(`   the best of the three is rated ${mean(best0).toFixed(1)} on average before (median ${median(best0)}), ${mean(best1).toFixed(1)} after (median ${median(best1)})`);
  if (reachAfter <= reachBefore && CONTROL !== 'pool900') fail('the mystery zone reaches no more names than before, so the bigger pool is not showing anywhere');
  globalThis.__MYSTERY__ = { before: mean(best0), after: mean(best1) };
}

console.log('6) The Machine is the opponent it was');
{
  const xi = arm => D.squadRating(M.machineMapDraft(arm.current));
  const r0 = Array.from({ length: 1000 }, () => xi(before)), r1 = Array.from({ length: 1000 }, () => xi(after));
  console.log(`   The Machine's XI is rated ${mean(r0).toFixed(2)} on average before (median ${median(r0)}), ${mean(r1).toFixed(2)} after (median ${median(r1)})`);
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
        : k === 'mystery' ? M.mysteryChoices(arm.current, slot, used)
        : k === 'storm' ? M.stormChoices(arm.current, slot, used, stormFloorFor(arm))
        : k === 'shark' ? [{ player: M.oceanTrialist(slot, 'shark'), outOfPosition: false }]
        : M.wildcardChoices(arm.current, slot, used);
      if (!c.length && k !== 'shark') c = M.wildcardChoices(arm.current, slot, used);
    } else if (hit.kind === 'country') {
      c = await M.countryChoices(hit.country, slot, used, { keepBest: keepBestFor(arm) });
    }
    if (!c.length) c = [{ player: M.oceanTrialist(slot), outOfPosition: false }];
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
  const tiles = [];
  for (const country of lib.GEO_COUNTRIES) tiles.push(...await M.fetchCountryPool(country));
  console.log(`   players a country hit reads (the top 120 of each nation): ${tiles.length}, ${(100 * share(tiles)).toFixed(1)}% at a club the lookup does not know`);
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
     and SIM_SEED 11, 222, 3333) the average XI moved by -0.20, +0.02, -0.05, -0.06 for the land thrower and by +0.01,
     +0.06, -0.04, -0.08 for the sharp one, which is the noise of the draw: his best tile is the same tile. A grade band
     is eight points wide, so a whole point of drift is the line, five times the largest move seen. The random picker
     is printed and not held to it: he gives up 1.70 to 1.82 at the big nations (81.0 to 79.2, still an A) and 0.33 to
     0.62 on open land, the price of tiles that reach past the best eight, and his median grade does not move. */
  for (const [name, row] of [['land thrower, best pick', lb], ['sharp thrower, best pick', sb]]) {
    if (row.after.mean < row.before.mean - 1) fail(`${name}: the average XI fell from ${row.before.mean.toFixed(2)} to ${row.after.mean.toFixed(2)}, more than a rating point`);
  }
  if (GRADES.indexOf(sb.after.grade) < GRADES.indexOf('A')) fail(`a thrower who sticks the big nations and takes the best tile grades ${sb.after.grade} at the median: the top bands are out of reach`);
  const T = globalThis.__TILES__;
  /* Measured 1.58x on the fixture. The bar is "clearly more", with room: at 1.2x the draw would barely reach past the old eight. */
  if (CONTROL !== 'nobest' && T.namesAfter < T.namesBefore * 1.2) fail(`country hits show ${T.namesAfter} names against ${T.namesBefore} before: that is not more variety`);
  const machine = globalThis.__MACHINE__;
  if (Math.abs(machine.after - machine.before) > 1) fail(`The Machine's average XI moved from ${machine.before.toFixed(2)} to ${machine.after.toFixed(2)}: the opponent changed`);
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* a temp folder the OS will clear */ }
if (CONTROL) {
  if (failures === 0) { console.error(`\nCONTROL ${CONTROL} DID NOT FIRE: every section stayed green with the rule broken.`); process.exit(2); }
  console.log(`\nsimDartDraftPool control ${CONTROL}: fired, ${failures} failure(s) above. Exit 1 is the expected result.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimDartDraftPool: ${failures} FAILURE(S)`); process.exit(1); }
console.log('\nsimDartDraftPool: green. The pool is the top 2,000, the gold zones and the storm give what they gave, a country hit keeps its best four and shows more names, and whole drafts grade where they did.');
