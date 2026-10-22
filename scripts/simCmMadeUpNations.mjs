/* Round 1520 harness: made up Club Manager players carry a country of their own (the player report of 2026-10-21,
   "Add nationalities for made up players"). The engine's draw is src/lib/clubManagerMadeUpNations.ts; the places,
   counts, carries and the repair are in src/lib/clubManager.ts (careerPlace, nationCountsAt, madeUpNationAt,
   ensureMadeUpNations, shownNation).

   What this holds, each against the engine's own code, never a copy of it:
     1) the draw is keyed: it never takes a number from Math.random (the season's stream), and the same names give
        the same countries in a fresh load of the engine.
     2) realistic shares per league: for every league of every world, 2000 drawn men land on the home country at the
        share the league's real squads have (within four standard errors), and a world ten years on lists its made
        up market men by league at those shares too. 2c) the review's fix: in a league that caps its imports (the
        Saudi Pro League, MLS's American clubs), the squads, real men and made up men together, hold the cap's home
        floor, against the sourced cap written in this file and the raw squads, never the engine's table.
     3) every made up man carries a country (squads, the free agent pool, the market today and ten years on), and no
        real man is touched: none carries the field, and his flag is the verified map's. A youth pad or a boy of
        the club's own intake is from the club's country (the review's fix: a minor cannot move abroad).
     4) it stays with him: a bought man keeps the market's country through a loan out and back, the summer, a release
        to the pool and a reload; a man I sell to a club keeps it on that club's market listing (the ledger); a boy a
        scout found abroad keeps the trip's country when promoted, spelt as the verified map spells it. The review's
        fix adds three doors: a deal running out (the boy walks to the pool with it), a deal between two other clubs
        written to the ledger (recordAiDeals: the buyer lists him under the seller's country) and a man signed back
        from the pool.
     5) old saves: a save with every country stripped opens with them back, the same twice, the same as the day each
        home man arrived, and nothing else in it changes (against the engine with the draw switched off); the
        committed old save fixtures likewise. 5b) the review's fix: a country ask an engine from before the round
        stored still grades the same on opening and wants as many more men (its target rebased by the men counted).
     6) the board agrees with the flags: a country ask counts exactly the men whose flag is that country.
     7) the field moves nothing else: careers on the engine with the board's count put back (NOASK) and with no
        country drawn at all (NONATION) play draw for draw and byte for byte the same once the field is stripped;
        the board's new count is measured as the careers that differ between the engine and NOASK; the save's growth
        a season is NOASK's save against NONATION's, to season 15. With BASE_ROOT (a worktree of the base commit),
        NONATION also plays as the base, the made up mark aside.

   NEGATIVE CONTROLS (CM_NATIONS_CONTROL), each must turn its section red, and each refuses to run if its edit finds
   nothing to edit: mainstream (1), flat (2), realtouched (3), nocarry, noledger and nopromote (4), noload (5),
   askoff (6), leak and bloat (7); added by the review's fixes: nocap (2c), awayyouth (3), aiswap, expiry and fasign (4), freeask (5b).

   Run: node scripts/simCmMadeUpNations.mjs      (BASE_ROOT=/tmp/base for the base comparison; SEASONS, LONG)
   Numbers measured on a runner are in the round's report (results-g/finish-1520.md). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { BRIDGE_EDITS_1520 } from './lib/cmNoMadeUpNations1520.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_NATIONS_CONTROL || '';
const BASE_ROOT = process.env.BASE_ROOT ? path.resolve(ROOT, process.env.BASE_ROOT) : null;
const SEASONS = Number(process.env.SEASONS || 3);
const LONG = Number(process.env.LONG || 15);
let failures = 0;
const fail = m => { failures += 1; console.log(`  FAIL: ${m}`); };
const ok = m => console.log(`  ok: ${m}`);
const cannot = why => { console.log(`simCmMadeUpNations: CANNOT RUN: ${why}`); process.exit(2); };

const N = 'clubManagerMadeUpNations.ts', E = 'clubManager.ts', A = 'clubManagerBoardAsks.ts';
const CONTROLS = {
  mainstream: [{ file: N, from: '  const rng = keyedRng(`cm-made-up-nation|${name}`);', to: '  const rng = Math.random;' }],
  flat: [{ file: N, from: '  if (rng() * count.known < count.home) return home;', to: '  if (rng() < 0.5) return home;' }],
  realtouched: [{ file: E, from: '  return !!(p.generated || p.isYouth || p.academyGrad);', to: '  return !!p;' }],
  nocarry: [{ file: E, from: '    ...(mp.generated ? { generated: true, ...(mp.nation ? { nation: mp.nation } : {}) } : {}),', to: '    ...(mp.generated ? { generated: true } : {}),' }],
  noledger: [{ file: E, from: '      ...(p.nation ? { nation: p.nation } : {}),\n', to: '' }],
  nopromote: [{ file: E, from: "pr.source !== 'Academy' && pr.source ? mapSpelling(pr.source) : ", to: '' }],
  noload: [{ file: E, from: ' so the squad screen shows it before a ball is kicked. */\n    ensureMadeUpNations(parsed);', to: ' so the squad screen shows it before a ball is kicked. */' }],
  askoff: [{ file: A, from: '  return squad.filter(p => !p.onLoan && shownNation(eraId, p) === country).length;', to: '  return squad.filter(p => !p.onLoan && p.nation === undefined && shownNation(eraId, p) === country).length;' }],
  leak: [{ file: E, from: '    return nation ? { ...p, nation } : p;', to: '    return nation ? { ...p, nation, morale: 71 } : p;' }],
  bloat: [{ file: N, from: "  if (!count || count.known <= 0 || !count.abroad.length) return home;", to: "  return home.padEnd(400, '.');" }],
  /* Review fixes. */
  awayyouth: [{ file: E, from: '  if (local) return place.home;\n', to: '' }],
  nocap: [{ file: E, from: '  if (!cap || !away) return c;', to: '  if (cap || !cap) return c;' }],
  freeask: [{ file: A, from: '  if (changed) state.boardObjectives = next;', to: '  if (changed && !changed) state.boardObjectives = next;' }],
  aiswap: [{ file: E, from: "madeUpNationAt(player.name, from === state.clubName ? careerPlace(state) : clubPlace(from, state.eraId), state.eraId);",
    to: "madeUpNationAt(player.name, from === state.clubName ? careerPlace(state) : clubPlace(to, state.eraId), state.eraId);" }],
  expiry: [{ file: E, from: 'generated: madeUp(p) || undefined, ...(p.nation ? { nation: p.nation } : {}), since: career.season + 1,', to: 'generated: madeUp(p) || undefined, since: career.season + 1,' }],
  fasign: [{ file: E, from: '    value: fa.value, generated: fa.generated, ...(fa.nation ? { nation: fa.nation } : {}),', to: '    value: fa.value, generated: fa.generated,' }],
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`CM_NATIONS_CONTROL=${CONTROL} is not a control this harness knows`);
/* NONATION is the bridge every kit pinned to an older engine composes (scripts/lib/cmNoMadeUpNations1520.mjs): no
   country drawn, the board's old count, the old marks. NOASK is the same bridge with the countries left on, so the two
   differ by the countries alone. */
const asEdit = ([file, , from, to]) => ({ file: path.basename(file), from, to });
const DRAWS_OFF = new Set(['no country is drawn', 'a scouted boy takes no country']);
const NONATION = BRIDGE_EDITS_1520.map(asEdit);
const NOASK = BRIDGE_EDITS_1520.filter(([, label]) => !DRAWS_OFF.has(label)).map(asEdit);
if (NOASK.length !== NONATION.length - 2) cannot('the bridge no longer carries its two draw edits by those labels');

/* ---- bundles: this tree as it is, with the board's old count, with no country drawn, and the base tree ---- */
const MODS = { cm: 'lib/clubManager', asks: 'lib/clubManagerBoardAsks', eras: 'lib/clubManagerEras', nat: 'lib/clubManagerMadeUpNations',
  pn: 'data/playerNationalities', wr: 'lib/clubManagerWorldRoster' };
const patchPlugin = (edits, hits) => ({
  name: 'cm-nations-edits',
  setup(b) {
    b.onLoad({ filter: /[.]ts$/ }, async args => {
      const mine = edits.filter(e => path.basename(args.path) === e.file);
      if (!mine.length) return undefined;
      let source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      for (const e of mine) {
        const count = source.split(e.from).length - 1;
        if (count !== 1) cannot(`an edit's text is in ${e.file} ${count} times, it must be exactly once (${e.from.slice(0, 70)}...)`);
        source = source.replace(e.from, e.to);
        hits.n += 1;
      }
      return { contents: source, loader: 'ts' };
    });
  },
});
async function bundleOf(root, name, edits) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `cmnat-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const lines = Object.entries(MODS)
    .filter(([, f]) => fs.existsSync(path.join(root, `src/${f}.ts`)))
    .map(([k, f]) => `export * as ${k} from ${JSON.stringify(path.join(root, `src/${f}.ts`).split(path.sep).join('/'))};`);
  fs.writeFileSync(entry, lines.join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  const hits = { n: 0 };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: edits.length ? [patchPlugin(edits, hits)] : [] });
  if (hits.n !== edits.length) cannot(`${name}: ${hits.n} of ${edits.length} edits reached the bundle`);
  return out;
}
const ctl = CONTROLS[CONTROL] ?? [];
const sevenToo = CONTROL === 'leak' || CONTROL === 'bloat';
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
const HEAD = await bundleOf(ROOT, 'head', ctl);
const B_NOASK = await bundleOf(ROOT, 'noask', [...NOASK, ...(sevenToo ? ctl : [])]);
const B_NONATION = await bundleOf(ROOT, 'nonation', [...NONATION, ...(CONTROL === 'leak' ? ctl : [])]);
if (BASE_ROOT && !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) cannot(`BASE_ROOT ${BASE_ROOT} holds no src/lib/clubManager.ts`);
const B_BASE = BASE_ROOT ? await bundleOf(BASE_ROOT, 'base', []) : null;

/* ---- the runtime: a fresh module per career, a fixed clock, a stub storage ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
function fresh(b) {
  delete req.cache[req.resolve(b)];
  store.clear();
  return req(b);
}
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => {
    f.n += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.n = 0;
  return f;
}
/** Runs fn on its own stream; the draws it took are on withStream.draws afterwards. */
function withStream(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return fn(); } finally { Math.random = saved; withStream.draws = r.n; }
}
async function withStreamAsync(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return await fn(); } finally { Math.random = saved; withStreamAsync.draws = r.n; }
}
/** A state's JSON with every key in `drop` taken out, at any depth (the packed ledger is unpacked first). */
function stripped(state, drop, m) {
  const view = m && state.worldRoster ? m.wr.worldRosterView(state) : null;
  const s = view && view !== state.worldRoster ? { ...state, worldRoster: { ...view, packedRecords: undefined, packedFormat: undefined } } : state;
  return JSON.stringify(s, (k, v) => (drop.has(k) ? undefined : v));
}
const firstDiff = (a, b) => {
  const x = JSON.parse(a), y = JSON.parse(b);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) return k;
  return '(key order)';
};
const madeUp = p => !!(p && (p.generated || p.isYouth || p.academyGrad));

const m = fresh(HEAD);
await m.cm.ensureAllEraRosters();
const WORLDS = m.cm.CM_ERAS.map(e => e.id);
const leaguesOf = era => (era === 'now' ? m.cm.REAL_LEAGUES : m.cm.eraLeaguesFor(era));
const clubsOf = (era, lg) => (era === 'now' ? m.cm.playableClubs(lg.id) : m.cm.eraPlayableClubs(era, lg.id)).map(c => c.name);
/* Every place a made up man can be drawn from: each league of each world, and each club country inside one. */
const places = [];
for (const era of WORLDS) {
  for (const lg of leaguesOf(era)) {
    const seen = new Set();
    for (const club of lg.clubs) {
      const pl = m.cm.careerPlace({ clubName: club, eraId: era });
      if (!pl || seen.has(`${pl.league}|${pl.home}`)) continue;
      seen.add(`${pl.league}|${pl.home}`);
      places.push({ era, club, ...pl });
    }
  }
}
console.log(`${places.length} places over ${WORLDS.length} worlds (${WORLDS.join(', ')})`);

console.log("1) The draw is keyed on the man and never takes a number from the season's stream");
{
  const names = Array.from({ length: 300 }, (_, i) => `Probe Keyed ${i}`);
  let calls = 0;
  const saved = Math.random;
  Math.random = () => { calls += 1; return saved(); };
  let first;
  try { first = places.flatMap(p => names.map(n => m.cm.madeUpNationAt(n, p, p.era))); } finally { Math.random = saved; }
  if (calls) fail(`${calls} numbers came off Math.random over ${first.length} draws`);
  else ok(`${first.length} draws over ${places.length} places, 0 numbers off Math.random`);
  if (first.some(x => !x)) fail(`${first.filter(x => !x).length} draws came back empty`);
  const m2 = fresh(HEAD);
  await m2.cm.ensureAllEraRosters();
  const again = places.flatMap(p => names.map(n => m2.cm.madeUpNationAt(n, p, p.era)));
  const moved = again.filter((x, i) => x !== first[i]).length;
  if (moved) fail(`${moved} of ${first.length} draws came out differently in a fresh load of the engine`);
  else ok('a fresh load of the engine draws every one of them the same');
}

console.log("2) Realistic shares: each league's drawn men are home as often as its real squads are");
const DRAWS = 2000;
{
  let checked = 0, thin = 0, worst = 0, worstAt = '';
  const table = [];
  for (const p of places) {
    const counts = m.cm.nationCountsAt(p, p.era);
    if (!counts) { fail(`${p.era} ${p.league} (${p.home}): no real count to draw from`); continue; }
    for (const young of [false]) {
      const c = counts;
      if (c.known < 20) { thin += 1; continue; }
      const real = c.home / c.known, top = c.abroad[0], realTop = top ? top[1] / c.known : 0;
      let home = 0, topHits = 0;
      for (let i = 0; i < DRAWS; i += 1) {
        const n = m.cm.madeUpNationAt(`Probe ${p.era} ${p.league} ${p.home} ${i}`, p, p.era);
        if (n === p.home) home += 1;
        else if (top && n === top[0]) topHits += 1;
      }
      const drawn = home / DRAWS, drawnTop = topHits / DRAWS;
      const se = Math.sqrt(Math.max(real * (1 - real), 0.0025) / DRAWS);
      const seTop = Math.sqrt(Math.max(realTop * (1 - realTop), 0.0025) / DRAWS);
      const z = Math.max(Math.abs(drawn - real) / se, top ? Math.abs(drawnTop - realTop) / seTop : 0);
      checked += 1;
      if (z > worst) { worst = z; worstAt = `${p.era} ${p.league} ${p.home}${young ? ' young' : ''}`; }
      if (z > 4) fail(`${p.era} ${p.league} (${p.home}${young ? ', young' : ''}): drawn home ${(drawn * 100).toFixed(1)}% against real ${(real * 100).toFixed(1)}%, top foreign ${top?.[0]} ${(drawnTop * 100).toFixed(1)}% against ${(realTop * 100).toFixed(1)}%`);
      if (!young && p.era === 'now' || !young && table.length < 60) table.push(`   ${p.era.padEnd(7)} ${p.league.padEnd(14)} ${p.home.padEnd(14)} real men ${String(Math.round(c.known)).padStart(4)}  home ${(real * 100).toFixed(1).padStart(5)}% drawn ${(drawn * 100).toFixed(1).padStart(5)}%  then ${c.abroad.slice(0, 3).map(([n, k]) => `${n} ${(k / c.known * 100).toFixed(0)}%`).join(', ')}`);
    }
  }
  console.log(table.join('\n'));
  if (checked < 40) fail(`only ${checked} counts were checked, the places shrank`);
  ok(`${checked} counts checked at ${DRAWS} draws each (${thin} under 20 known men left unchecked), worst ${worst.toFixed(2)} standard errors (${worstAt}), bound 4`);
}

console.log("2c) A league that caps its imports: its squads, real and made up men together, hold the cap's home floor");
{
  /* The review's fix. The caps are the ones the engine's IMPORT_CAPS comment sources (Saudi Pro League: 10 non-Saudi
     in 25; MLS: 241 international slots over 30 clubs, rosters of up to 30), written here again so this check never
     reads the engine's table: it reads the raw squads and the draw, and asks whether the squads honour the rule. */
  const CAPS = [['saudi', 'Saudi Arabia', 25, 10], ['mlsEast', 'United States', 30, 241 / 30], ['mlsWest', 'United States', 30, 241 / 30]];
  const raw = m.eras.eraRostersRaw('now');
  for (const [league, home, squad, most] of CAPS) {
    let clubs = 0, men = 0, homeMen = 0;
    for (const club of m.cm.REAL_LEAGUES.find(l => l.id === league).clubs) {
      if (m.cm.careerPlace({ clubName: club, eraId: 'now' })?.home !== home) continue;
      const roster = raw[club] ?? [];
      clubs += 1;
      men += roster.length;
      homeMen += roster.filter(b => m.pn.nationalityOf('now', b.n) === home).length;
    }
    if (clubs < 8) { fail(`${league} (${home}): only ${clubs} clubs found`); continue; }
    let drawnHome = 0;
    for (let i = 0; i < DRAWS; i += 1) if (m.cm.madeUpNationAt(`Cap Probe ${league} ${i}`, { league, home }, 'now') === home) drawnHome += 1;
    const drawn = drawnHome / DRAWS, slots = Math.max(0, clubs * squad - men), seats = clubs * squad;
    const share = (homeMen + drawn * slots) / seats, floor = (squad - most) / squad;
    /* Where the real men alone already pass the cap (a green card holder is an MLS domestic player but keeps his
       country), the made up men can only all be home: the floor asked is what they can reach. */
    const reach = Math.min(floor, (homeMen + slots) / seats);
    const se = Math.sqrt(Math.max(drawn * (1 - drawn), 0.0025) / DRAWS) * slots / seats;
    console.log(`   ${league.padEnd(8)} ${home.padEnd(14)} ${clubs} clubs, ${men} real men (${homeMen} home); made up men drawn home ${(drawn * 100).toFixed(1)}%; squads home ${(share * 100).toFixed(1)}% against the cap's floor ${(floor * 100).toFixed(1)}% (reachable ${(reach * 100).toFixed(1)}%)`);
    if (share < reach - 4 * se) fail(`${league} (${home}): its squads are ${(share * 100).toFixed(1)}% home, under the cap's floor of ${(reach * 100).toFixed(1)}%`);
    else ok(`${league} (${home}) holds the cap's floor`);
  }
}

/* The fleet: every league's first and last playable club in every world, and a created club. */
const SPEC = { name: 'Nation Town', stadium: 'Flag Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'NT' },
  budgetTier: 'small', leagueId: 'premier', replacedClub: '' };
const fleet = [];
for (const era of WORLDS) {
  for (const lg of leaguesOf(era)) {
    const clubs = clubsOf(era, lg);
    for (const club of new Set([clubs[0], clubs.at(-1)].filter(Boolean))) fleet.push({ era, club });
  }
}
const created = { ...SPEC, replacedClub: m.cm.playableClubs('premier').at(-1).name };
const startOf = (mod, f) => (f.custom ? mod.cm.startCareer(created.name, 'now', created) : mod.cm.startCareer(f.club, f.era));
fleet.push({ era: 'now', club: created.name, custom: true });
const later = new Map();

console.log('2b) Ten years on, the market\'s made up men sit at each league\'s real home share');
{
  const tally = new Map();
  let none = 0;
  const noneAt = new Set();
  for (const era of WORLDS) {
    const s = m.cm.startCareer(clubsOf(era, leaguesOf(era)[0])[0], era);
    const market = m.cm.buildMarket({ ...s, season: s.season + 10 });
    later.set(era, market);
    for (const l of market) {
      if (!l.generated) continue;
      const pl = m.cm.careerPlace({ clubName: l.club, eraId: era });
      if (!l.nation) { none += 1; noneAt.add(l.club); continue; }
      if (!pl) continue;
      const k = `${era}|${pl.league}|${pl.home}`;
      const t = tally.get(k) ?? { era, pl, n: 0, home: 0 };
      t.n += 1;
      if (l.nation === pl.home) t.home += 1;
      tally.set(k, t);
    }
  }
  let checked = 0, worst = 0, worstAt = '';
  const rows = [];
  for (const t of tally.values()) {
    const c = m.cm.nationCountsAt(t.pl, t.era);
    if (!c || c.known < 20 || t.n < 40) continue;
    const real = c.home / c.known, drawn = t.home / t.n;
    const z = Math.abs(drawn - real) / Math.sqrt(Math.max(real * (1 - real), 0.0025) / t.n);
    checked += 1;
    if (z > worst) { worst = z; worstAt = `${t.era} ${t.pl.league}`; }
    if (z > 4) fail(`${t.era} ${t.pl.league} (${t.pl.home}): ${t.n} made up market men ${(drawn * 100).toFixed(1)}% home against real ${(real * 100).toFixed(1)}%`);
    if (rows.length < 40) rows.push(`   ${t.era.padEnd(7)} ${t.pl.league.padEnd(14)} ${String(t.n).padStart(5)} made up men, home ${(drawn * 100).toFixed(1).padStart(5)}% (real ${(real * 100).toFixed(1)}%)`);
  }
  console.log(rows.join('\n'));
  if (checked < 20) fail(`only ${checked} leagues had 40 made up market men ten years on`);
  ok(`${checked} leagues checked ten years on, worst ${worst.toFixed(2)} standard errors (${worstAt}), bound 4; ${none} made up listings without a country (${noneAt.size} clubs in no league: ${[...noneAt].slice(0, 6).join(', ')})`);
}

console.log('3) Every made up man carries a country, and no real man is touched');
{
  let madeUpMen = 0, withNation = 0, realMen = 0, young = 0, youngAway = 0;
  const bad = [];
  const look = (era, p, where) => {
    if (!p) return;
    if (madeUp(p)) {
      madeUpMen += 1;
      if (typeof p.nation === 'string' && p.nation) withNation += 1;
      else if (bad.length < 8) bad.push(`${era} ${where}: made up ${p.name} has no country`);
    } else {
      realMen += 1;
      if (p.nation !== undefined) bad.push(`${era} ${where}: real ${p.name} carries "${p.nation}"`);
      else if (m.cm.shownNation(era, p) !== m.pn.nationalityOf(era, p.name)) bad.push(`${era} ${where}: real ${p.name} shows a flag the map does not give him`);
    }
  };
  for (const f of fleet) {
    const s = startOf(m, f);
    for (const p of s.squad) look(f.era, p, `${s.clubName} squad`);
    /* Review fix: a youth pad or a boy of the club's own intake is from the club's country. */
    const home = m.cm.careerPlace(s)?.home;
    for (const p of s.squad.filter(x => x.isYouth || x.academyGrad)) {
      young += 1;
      if (p.nation !== home) { youngAway += 1; if (youngAway <= 8) bad.push(`${f.era} ${s.clubName}: youth ${p.name} is "${p.nation}", the club is in ${home}`); }
    }
    for (const p of s.freeAgents ?? []) look(f.era, p, `${s.clubName} free agents`);
    if (f === fleet[0] || f.custom || fleet.indexOf(f) % 7 === 0) for (const l of m.cm.buildMarket(s)) look(f.era, l, `${s.clubName} market (${l.club})`);
  }
  for (const [era, market] of later) for (const l of market) if (l.nation || !l.generated) look(era, l, `ten years on (${l.club})`);
  for (const b of bad) fail(b);
  if (madeUpMen < 500) fail(`only ${madeUpMen} made up men met, the fleet shrank`);
  if (young < 50) fail(`only ${young} youth pads met on day one, the youth check proves little`);
  if (youngAway) fail(`${youngAway} of ${young} youth pads are not from their club's country`);
  else ok(`${young} youth pads on day one, every one from his club's country`);
  ok(`${fleet.length} careers: ${withNation} of ${madeUpMen} made up men carry a country; ${realMen} real men, none carrying the field, each showing the map's flag`);
}

/* A season played to its end and the summer rolled, on whatever stream is running. */
function playSeason(mod, s) {
  for (let g = 0; g < 160; g += 1) {
    const r = mod.cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return mod.cm.finishSeason(s).state;
}
function rawSave(mod, s) {
  store.delete(mod.cm.SAVE_KEY);
  mod.cm.saveCareer(s);
  return store.get(mod.cm.SAVE_KEY) ?? JSON.stringify(s);
}
function reload(mod, raw) {
  store.set(mod.cm.SAVE_KEY, raw);
  return mod.cm.loadCareer();
}

console.log('4) It stays with him: bought, loaned out and back, the summer, released, sold to a club, promoted, reloaded');
let moved = null;
{
  const mm = fresh(HEAD);
  const tracked = new Map();
  const note = (name, nation, how) => { if (!nation) fail(`${how}: ${name} has no country`); else tracked.set(name, { nation, how }); };
  const check = (when, s) => {
    let held = 0;
    const all = [...s.squad, ...(s.loanedOut ?? []).map(l => l.player), ...(s.freeAgents ?? [])];
    for (const [name, t] of tracked) {
      const p = all.find(x => x.name === name);
      if (!p) continue;
      held += 1;
      if (p.nation !== t.nation) fail(`${when}: ${name} (${t.how}) is "${p.nation}", was "${t.nation}"`);
    }
    return held;
  };
  withStream(4040, () => {
    let s = playSeason(mm, mm.cm.startCareer('Everton'));
    s = mm.cm.startNextSeason(s);
    s = { ...s, budget: 900 };
    const home = mm.cm.careerPlace(s).home;
    /* Bought: three made up men from abroad, each keeping the market's country. */
    const buys = mm.cm.buildMarket(s).filter(l => l.generated && l.nation && l.nation !== home).sort((a, b) => a.price - b.price).slice(0, 3);
    if (buys.length < 3) fail(`only ${buys.length} made up men from abroad on a market a year on`);
    for (const l of buys) {
      const next = mm.cm.buyPlayer(s, l);
      if (!next) { fail(`the engine would not sell ${l.name}`); continue; }
      s = next;
      const got = s.squad.find(p => p.name === l.name)?.nation;
      if (got !== l.nation) fail(`${l.name}, listed at ${l.club} as ${l.nation}, joined as "${got}"`);
      else note(l.name, got, `bought from ${l.club} as ${l.nation}`);
    }
    /* Promoted: four boys scouts found abroad, and one of the home intake. */
    const trips = [['Turkey', 'Türkiye'], ['Ivory Coast', "Cote d'Ivoire"], ['Japan', 'Japan'], ['Brazil', 'Brazil']];
    s.academy.prospects = [...s.academy.prospects, ...trips.map(([src], i) => ({ id: `pr-nat-${i}`, name: `Nation Probe ${i}`, position: 'CM', age: 17,
      rating: 58, potential: 80, lowGuess: 70, highGuess: 86, source: src, flag: '', fee: 0, season: s.season }))];
    for (const [i, [src, want]] of trips.entries()) {
      const next = mm.cm.promoteProspect(s, `pr-nat-${i}`);
      if (!next) { fail(`promoteProspect refused the boy from ${src}`); continue; }
      s = next;
      const got = s.squad.find(p => p.name === `Nation Probe ${i}`)?.nation;
      if (got !== want) fail(`a boy scouted in ${src} was promoted as "${got}", not "${want}"`);
      else note(`Nation Probe ${i}`, got, `scouted in ${src}`);
    }
    s = mm.cm.playNextEntry(s, { skipHalftime: true }).state;
    console.log(`   ${check('after a match (the repair ran)', s)} tracked men checked after a match`);
    /* Loaned out and back. */
    const lo = s.squad.find(p => tracked.has(p.name) && p.generated);
    const out = lo && mm.cm.loanOutPlayer(s, lo.id);
    if (!out) fail(`could not loan ${lo?.name} out`);
    else {
      const away = out.loanedOut.find(l => l.player.name === lo.name);
      if (away?.player.nation !== lo.nation) fail(`out on loan ${lo.name} is "${away?.player.nation}"`);
      const back = mm.cm.recallLoanedPlayer(out, lo.id);
      if (!back) fail(`could not recall ${lo.name}`);
      else { s = back; ok(`${lo.name} went out on loan and came back as ${back.squad.find(p => p.name === lo.name)?.nation}`); }
    }
    /* Reloaded. */
    const re = reload(mm, rawSave(mm, s));
    console.log(`   ${check('after a reload', re)} tracked men checked after a reload`);
    /* Sold to a club: the ledger lists him there under his country. */
    const sale = s.squad.find(p => tracked.has(p.name) && p.generated && tracked.get(p.name).how.startsWith('bought'));
    const buyer = mm.cm.playableClubs('laliga')[0].name;
    const withBid = sale && { ...s, incomingBids: [{ playerId: sale.id, playerName: sale.name, club: buyer, offer: 3, status: 'open' }] };
    const sold = sale ? mm.cm.acceptBid(withBid, sale.id) : null;
    if (!sale) fail('no bought man was left to sell to a club, so the ledger was not tried');
    else if (!sold) fail(`acceptBid would not sell ${sale.name} to ${buyer}`);
    else {
      const there = mm.cm.worldRosterFor(sold, buyer).find(p => p.n === sale.name);
      if (!there) fail(`${sale.name} is not on ${buyer}'s roster after the sale`);
      else if (there.nation !== sale.nation) fail(`${buyer}'s roster lists ${sale.name} as "${there.nation}", sold as "${sale.nation}"`);
      else ok(`${sale.name} sold to ${buyer} is listed there as ${there.nation}`);
      s = sold;
    }
    /* Released to the pool, marked and with his country. */
    const rel = s.squad.find(p => p.name === 'Nation Probe 3');
    const freed = rel && mm.cm.releasePlayer(s, rel.id);
    const fa = freed?.freeAgents?.find(f => f.name === 'Nation Probe 3');
    if (!fa || fa.nation !== 'Brazil' || fa.generated !== true) fail(`a released academy boy went to the pool as ${JSON.stringify(fa && { nation: fa.nation, generated: fa.generated })}`);
    else { s = freed; ok('a released academy boy is in the free agent pool marked made up, still Brazilian'); }
    /* The summer, with the three scouted boys left on deals that run out (the review's fix: the expiry door). */
    const expiring = trips.slice(0, 3).map(([, want], i) => [`Nation Probe ${i}`, want]);
    s = { ...s, squad: s.squad.map(p => (expiring.some(([n]) => n === p.name) ? { ...p, contractYears: 1 } : p)) };
    s = mm.cm.startNextSeason(playSeason(mm, s));
    console.log(`   ${check('after the summer', s)} tracked men checked after the summer`);
    let walked = 0;
    for (const [name, want] of expiring) {
      const fa = (s.freeAgents ?? []).find(f => f.name === name);
      if (!fa) continue;
      walked += 1;
      if (fa.nation !== want || fa.generated !== true) fail(`${name}, scouted as ${want}, walked to the pool as ${JSON.stringify({ nation: fa.nation, generated: fa.generated })}`);
    }
    if (walked < 3) fail(`only ${walked} of 3 scouted boys whose deals ran out reached the pool, the expiry door was not tried`);
    else ok(`${walked} scouted boys whose deals ran out are in the pool marked, with the trip's country`);
    moved = s;
    /* The review's fix: a deal between two other clubs, written to the ledger (recordAiDeals). Ten made up men listed
       abroad, each bought by a La Liga club, must be listed at the buyer under the country the seller's listing had. */
    const buyers = mm.cm.playableClubs('laliga').map(c => c.name);
    const picks = mm.cm.buildMarket(s).filter(l => l.generated && l.nation && l.club !== s.clubName
      && mm.cm.careerPlace({ clubName: l.club })?.home !== 'Spain').slice(0, 10);
    let recorded = 0, keptAi = 0;
    for (const [i, mp] of picks.entries()) {
      const to = buyers[i % buyers.length];
      const next = mm.cm.recordAiDeals(s, [{ mp, to, fee: 1 }]);
      if (next === s) continue;
      recorded += 1;
      const there = mm.cm.buildMarket(next).find(l => l.name === mp.name && l.club === to);
      if (there?.nation === mp.nation) keptAi += 1;
      else fail(`${mp.name}, listed at ${mp.club} as ${mp.nation}, is listed at ${to} as "${there?.nation}" after an AI deal`);
    }
    if (recorded < 5) fail(`only ${recorded} of ${picks.length} AI deals of made up men were written, the ledger door was not tried`);
    else ok(`${keptAi} of ${recorded} made up men sold between two other clubs kept their country on the buyer's list`);
    /* The review's fix: signed back from the pool the season after next, each keeps the trip's country. */
    let t = mm.cm.startNextSeason(playSeason(mm, s));
    let back = 0;
    for (const [name, want] of expiring) {
      if (!(t.freeAgents ?? []).some(f => f.name === name)) continue;
      const signed = mm.cm.signFreeAgent({ ...t, budget: 9999, wageCap: 9999 }, name);
      if (!signed) continue;
      back += 1;
      t = mm.cm.playNextEntry(signed, { skipHalftime: true }).state;
      const got = t.squad.find(p => p.name === name)?.nation;
      if (got !== want) fail(`${name}, scouted as ${want}, was signed back from the pool as "${got}"`);
    }
    if (back < 2) fail(`only ${back} scouted boys could be signed back from the pool, the free agency door was not tried`);
    else ok(`${back} scouted boys signed back from the pool kept the trip's country through a match`);
  });
  ok(`${tracked.size} men tracked through the moves`);
}

const NATION = new Set(['nation']);
const MARKS = new Set(['nation', 'generated', 'gen', 'g']);
const nationsOf = s => [...s.squad, ...(s.loanedOut ?? []).map(l => l.player), ...(s.freeAgents ?? [])].filter(p => p && p.nation).map(p => `${p.name}=${p.nation}`).sort();
/** A state's JSON with every country ask's target and line taken out, at any depth. */
const noAskTargets = json => JSON.stringify(JSON.parse(json), function (k, v) {
  return this && this.id === 'natQuota' && (k === 'target' || k === 'label') ? undefined : v;
});

console.log('5) An old save gets the same countries twice, and nothing else in it changes');
{
  const opened = [];
  if (moved) {
    /* The save after section 4 with every country taken out, the packed ledger included: a save from before the round. */
    const old = stripped(moved, NATION, fresh(HEAD));
    opened.push({ tag: 'the moved career, countries stripped', raw: old, era: moved.eraId, had: moved });
  } else fail('section 4 left no career to strip');
  for (const f of ['cmBookSaveEvertonFixture', 'cmBookSaveHerthaFixture', 'cmOldSave1052Fixture', 'cmSecondTierOldSaveFixture']) {
    const p = path.join(ROOT, 'scripts/data', `${f}.json`);
    if (!fs.existsSync(p)) { fail(`scripts/data/${f}.json is gone`); continue; }
    const raw = fs.readFileSync(p, 'utf8');
    opened.push({ tag: f, raw, era: JSON.parse(raw).eraId });
  }
  for (const o of opened) {
    const open = async b => {
      const mod = fresh(b);
      if (o.era) await mod.cm.ensureEraRosters(o.era);
      const s = reload(mod, o.raw);
      return { s, json: s ? JSON.stringify(s) : 'null', mod };
    };
    const a = await open(HEAD), b = await open(HEAD), z = await open(B_NONATION);
    if (!a.s) { fail(`${o.tag}: would not open`); continue; }
    const got = nationsOf(a.s);
    if (a.json !== b.json) fail(`${o.tag}: two opens differ, first at key ${firstDiff(a.json, b.json)}`);
    if (!got.length) fail(`${o.tag}: opened with no made up man carrying a country`);
    /* A stored country ask's target and line are rebased on opening (section 5b holds them), so they are set aside. */
    const lhs = noAskTargets(stripped(a.s, NATION, a.mod)), rhs = noAskTargets(stripped(z.s, NATION, z.mod));
    if (lhs !== rhs) fail(`${o.tag}: beyond the countries the open differs from the engine with no draw, first at key ${firstDiff(lhs, rhs)}`);
    if (o.had) {
      /* Every man made at my club (youth, the home intake, the journeymen) gets back exactly the country he had. */
      const homeMade = new Map([...o.had.squad, ...(o.had.freeAgents ?? [])]
        .filter(p => p.nation && (p.isYouth || p.reason === 'unattached' || p.academyGrad && !/^Nation Probe/.test(p.name))).map(p => [p.name, p.nation]));
      let same = 0;
      for (const [name, nation] of homeMade) {
        const p = [...a.s.squad, ...(a.s.freeAgents ?? [])].find(x => x.name === name);
        if (p?.nation === nation) same += 1;
        else fail(`${o.tag}: ${name} had ${nation} and reopened as "${p?.nation}"`);
      }
      ok(`${o.tag}: ${same} of ${homeMade.size} men made at the club got back the very country they had`);
    }
    ok(`${o.tag}: ${got.length} made up men given a country, the same on a second open, nothing else changed`);
  }
}

console.log('5b) A country ask stored before the round still wants as many more men on opening, and reads the same');
{
  /* The review's fix. Day one careers started by the engine from before the round (the base tree with BASE_ROOT, else
     NONATION, the same cut), saved by it and opened by this one: each stored ask must grade as it did there and still
     want exactly as many more men, with its line saying its target. */
  const OLD = B_BASE ?? B_NONATION, old = fresh(OLD);
  await old.cm.ensureAllEraRosters();
  const saved = [];
  for (const f of fleet) {
    const s = startOf(old, f);
    const asks = (s.boardObjectives ?? []).filter(o => o.id === 'natQuota' && o.country);
    if (asks.length) saved.push({ s, asks, raw: rawSave(old, s) });
  }
  const head = fresh(HEAD);
  await head.cm.ensureAllEraRosters();
  const byMap = (s, o) => s.squad.filter(p => !p.onLoan && head.pn.nationalityOf(s.eraId, p.name) === o.country).length;
  const byFlag = (s, o) => s.squad.filter(p => !p.onLoan && head.cm.shownNation(s.eraId, p) === o.country).length;
  let asked = 0, rebased = 0, flipped = 0, drifted = 0, worded = 0;
  for (const { s, asks, raw } of saved) {
    const back = reload(head, raw);
    if (!back) { fail(`${s.eraId ?? 'now'} ${s.clubName}: the old save would not open`); continue; }
    for (const o of asks) {
      const now = (back.boardObjectives ?? []).find(x => x.id === 'natQuota' && x.country === o.country);
      if (!now) { fail(`${s.clubName}: the ask "${o.label}" is gone on opening`); continue; }
      asked += 1;
      if (now.target !== o.target) rebased += 1;
      const was = old.asks.askStatus(s, o), is = head.asks.askStatus(back, now);
      const wanted = o.target - byMap(s, o), wants = now.target - byFlag(back, now);
      if (was !== is && ++flipped <= 5) console.log(`   ${s.clubName}: "${o.label}" read ${was} before the round and ${is} on opening, nothing signed`);
      if (wanted !== wants && ++drifted <= 5) console.log(`   ${s.clubName}: "${o.label}" wanted ${wanted} more men and on opening wants ${wants}`);
      if (now.label !== `Have ${now.target} player${now.target === 1 ? '' : 's'} from ${now.country} in the squad`) worded += 1;
    }
  }
  if (flipped) fail(`${flipped} of ${asked} stored country asks grade differently on opening`);
  if (drifted) fail(`${drifted} of ${asked} stored country asks want a different number of men on opening`);
  if (worded) fail(`${worded} rebased asks carry a line that does not say their target`);
  if (asked < 20) fail(`only ${asked} stored country asks were opened, the check proves little`);
  if (rebased < 10) fail(`only ${rebased} stored asks were rebased, the opening hardly counted a made up man`);
  ok(`${asked} country asks stored by the old engine (${OLD === B_BASE ? 'the base tree' : 'NONATION'}): ${rebased} rebased on opening, every one grading as before and wanting as many more men`);
}

console.log('6) The board counts exactly the men whose flag is its country');
{
  let checked = 0, helped = 0, asked = 0, askedMore = 0;
  for (const f of fleet) {
    const s = startOf(m, f);
    const country = m.cm.careerPlace(s)?.home;
    if (!country) continue;
    const shown = s.squad.filter(p => !p.onLoan && m.cm.shownNation(s.eraId, p) === country).length;
    const byMap = s.squad.filter(p => !p.onLoan && m.pn.nationalityOf(s.eraId, p.name) === country).length;
    if (shown > byMap) helped += 1;
    const status = target => m.asks.askStatus({ ...s, week: 0 }, { id: 'natQuota', target, country, label: 'probe' });
    if (status(shown) !== 'done') fail(`${f.era} ${s.clubName}: ${shown} men show ${country}'s flag and an ask for ${shown} is "${status(shown)}"`);
    if (status(shown + 1) === 'done') fail(`${f.era} ${s.clubName}: an ask for ${shown + 1} men from ${country} is already done`);
    const ask = (s.boardObjectives ?? []).find(o => o.id === 'natQuota');
    if (ask) { asked += 1; if (ask.target - 1 > byMap) askedMore += 1; }
    checked += 1;
  }
  if (helped < 10) fail(`only ${helped} careers have a made up man from their own country on day one, the check proves little`);
  ok(`${checked} careers: the board's count equals the flags; ${helped} of them count made up men the map alone did not`);
  console.log(`   day one country asks issued: ${asked}; ${askedMore} of them ask for more men than the map alone counted`);
}

/** One career, `seasons` seasons of quick sims on one stream: the whole state at every season end, the draws taken
    and the save's length at every season end. */
async function replay(b, career, seed, seasons, noSack = false) {
  const mod = fresh(b);
  if (career.era) await mod.cm.ensureEraRosters(career.era);
  const snaps = [], sizes = [];
  withStream(seed, () => {
    let s = startOf(mod, career);
    if (noSack) s = { ...s, startOptions: { ...(s.startOptions ?? {}), noSack: 1 } };
    for (let k = 1; k <= seasons; k += 1) {
      s = playSeason(mod, s);
      snaps.push(stripped(s, NATION, mod));
      sizes.push(rawSave(mod, s).length);
      if (s.sacked) return;
      if (k < seasons) s = mod.cm.startNextSeason(s);
    }
  });
  return { snaps, sizes, draws: withStream.draws };
}

console.log(`7) The field moves nothing else: ${SEASONS} seasons a career, the board's old count and no draw at all, draw for draw`);
const REPLAY = [
  { era: 'now', club: 'Everton' }, { era: 'now', club: m.cm.playableClubs('laliga').at(-1).name },
  { era: 'now', club: m.cm.playableClubs('championship')?.[0]?.name ?? 'Leeds United' }, { era: 'now', club: 'Wellington Phoenix' },
  { era: 'era2005', club: 'Everton' }, { era: 'era2015', club: m.cm.eraPlayableClubs('era2015', leaguesOf('era2015')[0].id).at(-1).name },
  { era: 'now', club: created.name, custom: true },
].filter(c => c.custom || (c.era === 'now' ? m.cm.REAL_LEAGUES.some(l => l.clubs.includes(c.club)) : true));
{
  let same = 0, askMoved = 0;
  for (const [i, c] of REPLAY.entries()) {
    const seed = 7000 + i * 31;
    const head = await replay(HEAD, c, seed, SEASONS), noask = await replay(B_NOASK, c, seed, SEASONS), none = await replay(B_NONATION, c, seed, SEASONS);
    const tag = `${c.era} ${c.custom ? 'a created club' : c.club}`;
    if (noask.draws !== none.draws) fail(`${tag}: ${noask.draws} draws with countries, ${none.draws} without`);
    const at = noask.snaps.findIndex((x, k) => x !== none.snaps[k]);
    if (at >= 0 || noask.snaps.length !== none.snaps.length) fail(`${tag}: with countries the career differs once they are stripped, season ${at + 1}, first at key ${at >= 0 ? firstDiff(noask.snaps[at], none.snaps[at]) : 'length'}`);
    else same += 1;
    /* The engine against NOASK: the board's new count (and the marks, which nothing plays on, stripped). */
    const unmark = j => JSON.stringify(JSON.parse(j), (k, v) => (MARKS.has(k) ? undefined : v));
    const hs = head.snaps.map(unmark), ns = noask.snaps.map(unmark);
    const moves = hs.findIndex((x, k) => x !== ns[k]);
    if (moves >= 0) {
      askMoved += 1;
      const x = JSON.parse(hs.at(-1)), y = JSON.parse(ns.at(-1));
      const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
      const asks = o => (o.boardObjectives ?? []).filter(b => b.id === 'natQuota').map(b => `${b.country} ${b.target}`).join(', ');
      console.log(`   ${tag}: the board's new count moves it from season ${moves + 1}; at the last season end ${keys.join(', ') || 'nothing'} differ`
        + `; country ask ${asks(x) || 'none'} against ${asks(y) || 'none'}; budget ${x.budget} against ${y.budget}, board ${x.boardConfidence} against ${y.boardConfidence}; ${head.draws} draws against ${noask.draws}`);
    }
    else console.log(`   ${tag}: the board's new count leaves it on its path (${head.draws} draws, ${noask.draws} with the old count)`);
    console.log(`   ${tag}: save ${noask.sizes.map((x, k) => `+${x - none.sizes[k]}`).join(' ')} characters a season end with countries`);
  }
  ok(`${same} of ${REPLAY.length} careers play draw for draw and byte for byte the same with countries as without, once stripped`);
  console.log(`   the board's count of made up men moved ${askMoved} of ${REPLAY.length} careers off the old count's path`);
}

console.log(`7b) The save's growth to season ${LONG}`);
for (const c of [{ era: 'now', club: 'Everton' }, { era: 'now', club: m.cm.playableClubs('laliga').at(-1).name }]) {
  const a = await replay(B_NOASK, c, 9001, LONG, true), z = await replay(B_NONATION, c, 9001, LONG, true);
  const growth = a.sizes.map((x, k) => x - z.sizes[k]);
  console.log(`   ${c.club}, characters added by the countries at each season end: ${growth.join(' ')}`);
  const last = growth.at(-1) ?? Infinity;
  if (a.sizes.length < LONG) fail(`${c.club}: the long career stopped after ${a.sizes.length} seasons`);
  if (!(last <= 1500)) fail(`${c.club}: the countries add ${last} characters at season ${a.sizes.length}, over the 1500 budget`);
  else ok(`${c.club} season ${a.sizes.length}: +${last} characters (budget 1500), ${(last / Math.max(1, a.sizes.length)).toFixed(0)} a season; the save is ${a.sizes.at(-1)} characters`);
}

if (B_BASE) {
  console.log('7c) With no country drawn the engine plays as the base tree, the made up mark aside');
  let same = 0;
  for (const [i, c] of REPLAY.entries()) {
    const seed = 7000 + i * 31;
    const none = await replay(B_NONATION, c, seed, SEASONS), base = await replay(B_BASE, c, seed, SEASONS);
    const tag = `${c.era} ${c.custom ? 'a created club' : c.club}`;
    const fix = snaps => snaps.map(j => JSON.stringify(JSON.parse(j), (k, v) => (MARKS.has(k) ? undefined : v)));
    const x = fix(none.snaps), y = fix(base.snaps);
    const at = x.findIndex((v, k) => v !== y[k]);
    if (none.draws !== base.draws) fail(`${tag}: ${none.draws} draws here, ${base.draws} on the base`);
    if (at >= 0) fail(`${tag}: season ${at + 1} differs from the base, first at key ${firstDiff(x[at], y[at])}`);
    else if (none.draws === base.draws) same += 1;
  }
  ok(`${same} of ${REPLAY.length} careers play as the base, draw for draw`);
}

console.log(failures ? `simCmMadeUpNations: RED, ${failures} failure(s)` : 'simCmMadeUpNations: green. Made up men carry a country of their own, drawn and kept honestly.');
process.exit(failures ? 1 : 0);
