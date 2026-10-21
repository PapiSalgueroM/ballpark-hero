/* Release AZ fix: the world ledger of a seeded Club Manager career (Round 1250, PR224) over a long career.
 *
 * WHY. Four reviews of Release AZ found four things about the ledger that no harness could see, because every
 * harness of it stopped at fifteen seasons or played the first one:
 *   1. TIME. useClubManager.ts rebuilds the market on every change of the save, and with a ledger that read the
 *      ledger about three times for each club of the world, cloning and checking every record each time: a
 *      formation tap froze a phone for over a second by season 8 (reviewer 1, MAJOR 1).
 *   2. BOUND. The ledger never dropped a record, about nine a season with no end (374 by season 40), so the save
 *      and the cost of every read grew for ever (reviewer 2, MAJOR 1).
 *   3. MADE UP. A boy from my academy (or a youth pad) sold to a rival was listed in that real club's squad with
 *      no MADE UP tag (reviewer 4, MAJOR 1).
 *   4. SOLD MEN. A man I sold kept the countdown of the deal he had with me and was released by the buyer when it
 *      ran out, so he left the club the help says he stays at (reviewer 4, MAJOR 2).
 *
 * WHAT IT PLAYS. Seeded careers (a new career carries a worldSeed), each summer a buy off the market, the weakest
 * man released, the real man nearest the end of his deal sold to a rival of the league through acceptBid, and in
 * the early summers an academy prospect promoted and sold to the same rival. Every season played out, the board
 * nudged up from under 35 the way simClubManagerSaveSize does, so the run measures the ledger and not a sacking.
 *
 * WHAT IT HOLDS, each from measured headroom (the numbers are in the section headers below):
 *   section 1 TIME   a tap that changes no deal (a second save object sharing the ledger) builds the market in at
 *                    most TAP_RATIO times what the same save with no seed and no ledger takes, plus TAP_FLOOR ms;
 *                    one matchday in at most DAY_RATIO times plus DAY_FLOOR ms.
 *   section 2 BOUND  the ledger's own stored size grows by at most SLOPE_CAP code units a season from season 15 on
 *                    (least squares over every season to the end), in every career.
 *   section 3 MADE UP every man the ledger puts at a club whose payload is a made up name (generated, academy
 *                    graduate or youth pad) is listed there with the made up mark, and at least one such man was
 *                    seen; the academy men sold are on the market marked generated.
 *   section 4 SOLD   every man sold whose deal with me ran out while he was at the buyer is still listed by the
 *                    buyer every summer until the ledger says he retired, and at least MIN_RUNOUT such men were seen.
 *
 * CONTROLS, each must go red on its own section (exit 1, the last line says FIRED):
 *   CM_LEDGER_BOUND_CONTROL=noprune  the summer rollover keeps every record again: section 2 red
 *   CM_LEDGER_BOUND_CONTROL=madeup   only a generated payload is marked again: section 3 red
 *   CM_LEDGER_BOUND_CONTROL=release  a man is released at the end of the deal he had with me again: section 4 red
 *   CM_LEDGER_BOUND_CONTROL=nocache  the shared read, the refresh memo and the market memo are off: section 1 red
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmLedgerBound.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_LEDGER_BOUND_CONTROL || '';
const cannot = why => { console.log(`simCmLedgerBound: cannot run: ${why}`); process.exit(2); };
const CORE = 'src/lib/clubManager.ts', LEDGER = 'src/lib/clubManagerWorldRoster.ts';
const lf = s => s.split('\r\n').join('\n');
const EDITS = {
  noprune: [[CORE, '  const kept = held.records.filter(record => record.status === \'owned\' || record.status === \'retired\' && record.year >= year || listed(record));\n',
    '  const kept = held.records;\n']],
  madeup: [[CORE, '      ...(p.generated || p.academyGrad || p.isYouth ? { g: true } : {}), anchor: original?.anchor ?? p.rating,\n',
    '      ...(p.generated ? { g: true } : {}), anchor: original?.anchor ?? p.rating,\n']],
  release: [[CORE, '      if (status === \'owned\' && (player.contractYears ?? 1) <= 0) player = { ...player, contractYears: renewalTerms(player).years };\n',
    '      if (status === \'owned\' && (player.contractYears ?? 1) <= 0) { status = \'released\'; owner = null; }\n']],
  nocache: [
    [LEDGER, '  const hit = viewCache.get(raw);\n', '  const hit = undefined as ViewHit | undefined;\n'],
    [CORE, '  const hit = REFRESH_MEMO.get(raw);\n', '  const hit = undefined as { year: number; start: unknown; era: unknown; club: string; seed: number | undefined; loaded: boolean; out: unknown } | undefined;\n'],
    [CORE, '  const hit = WORLD_MARKET_MEMO.get(raw);\n', '  const hit = undefined as { years: number; year: number; start: unknown; era: unknown; seed: number | undefined; out: MarketPlayer[] } | undefined;\n'],
  ],
};
if (CONTROL && !EDITS[CONTROL]) cannot(`unknown control ${CONTROL}`);
const applied = new Set();
const plugin = {
  name: 'ledger-bound-source',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = lf(fs.readFileSync(args.path, 'utf8'));
      for (const [file, from, to] of EDITS[CONTROL] ?? []) {
        if (file !== rel) continue;
        const n = text.split(from).length - 1;
        if (n !== 1) cannot(`control ${CONTROL}: its anchor is in ${file} ${n} times, it must be exactly once: ${from.trim().slice(0, 80)}`);
        text = text.replace(from, to); applied.add(from);
      }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  },
};
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'ledger-bound.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
if (CONTROL && applied.size !== EDITS[CONTROL].length) cannot(`control ${CONTROL}: ${applied.size} of its ${EDITS[CONTROL].length} edits were made`);
const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
  console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
  setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'ledger-bound.cjs' }).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();

/* ---------- the careers ---------- */
const SEASONS = Number(process.env.CM_LEDGER_BOUND_SEASONS || 30);
const CAREERS = [['Everton', 'now', 0x51ce], ['Real Madrid', 'now', 0xa11ce], ['Blackburn Rovers', 'era2010', 0xb10c]];
const TIME_AT = [10, SEASONS];
const OPT = { skipHalftime: true, noCoach: true };
function stream(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const ms = fn => { const a = performance.now(); fn(); return performance.now() - a; };
const copy = s => JSON.parse(JSON.stringify(s));
const strip = s => { const c = copy(s); delete c.worldSeed; delete c.worldRoster; return c; };
const isMadeUp = p => p.generated === true || p.academyGrad === true || p.isYouth === true;
const failures = { 1: [], 2: [], 3: [], 4: [] };
const fail = (section, line) => { failures[section].push(line); if (failures[section].length <= 6) console.log(`  FAIL section ${section}: ${line}`); };
const timing = [], slopes = [];
let madeUpSeen = 0, madeUpMarket = 0, runOutSeen = 0, soldCount = 0, academySold = 0;

function slopeOf(points) {
  const n = points.length, mx = points.reduce((a, p) => a + p[0], 0) / n, my = points.reduce((a, p) => a + p[1], 0) / n;
  return points.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / points.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
}
function sellTo(s, p, buyer) {
  /* Any other bid for him goes first: acceptBid takes the first bid it finds for that man, and a rival's bid (a
     release clause met in the season) would otherwise sell him to another club than the one this run tracks. */
  const t = { ...s, incomingBids: [...(s.incomingBids ?? []).filter(b => b.playerId !== p.id), { playerId: p.id, playerName: p.name, club: buyer, offer: Math.max(1, p.value ?? 5), status: 'open' }] };
  return cm.acceptBid(t, p.id);
}
function measureTime(s, label) {
  const keep = Math.random;
  try {
    const bare = strip(s), seeded = copy(s);
    const cold = ms(() => cm.buildMarket(seeded)); cm.buildMarket(bare);
    const tap = [], bareTap = [], day = [], bareDay = [];
    for (let i = 0; i < 5; i += 1) {
      tap.push(ms(() => cm.buildMarket({ ...seeded, formation: seeded.formation })));
      bareTap.push(ms(() => cm.buildMarket({ ...bare, formation: bare.formation })));
    }
    for (let i = 0; i < 3; i += 1) {
      Math.random = stream(900 + i); const a = copy(s); day.push(ms(() => cm.playNextEntry(a, OPT)));
      Math.random = stream(900 + i); const b = strip(s); bareDay.push(ms(() => cm.playNextEntry(b, OPT)));
    }
    const row = { label, records: ledger.readWorldRoster(s)?.records.length ?? 0, cold, tap: median(tap), bareTap: median(bareTap), day: median(day), bareDay: median(bareDay) };
    timing.push(row);
    console.log(`  time ${label}: ledger ${row.records} records; market after a deal ${cold.toFixed(1)} ms; a tap ${row.tap.toFixed(1)} ms against ${row.bareTap.toFixed(1)} ms with no seed or ledger; a matchday ${row.day.toFixed(1)} against ${row.bareDay.toFixed(1)} ms`);
  } finally { Math.random = keep; }
}

for (const [club, eraId, seed] of CAREERS) {
  Math.random = stream(seed);
  let s = cm.startCareer(club, eraId);
  if (s.worldSeed === undefined) cannot(`${club}: a new career carries no worldSeed`);
  const buyer = s.leagueClubs.find(c => c !== club && cm.worldRosterFor(s, c).length >= 18);
  if (!buyer) cannot(`${club}: no rival with a projected squad to sell to`);
  const sold = [], points = [];
  let sacked = false;
  for (let season = 1; season <= SEASONS; season += 1) {
    s = { ...s, budget: Math.max(s.budget, 400), wageCap: 99999 };
    /* The summer: two buys, a real man sold, a prospect promoted and sold (early summers), the weakest released. */
    for (let b = 0; b < 2; b += 1) {
      const have = new Set(s.squad.map(p => p.name));
      const mp = cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 27 && p.club !== buyer && !have.has(p.name) && p.price <= s.budget);
      if (mp) s = cm.buyPlayer(s, mp) ?? s;
    }
    const real = s.squad.filter(p => !p.onLoan && !isMadeUp(p) && p.position !== 'GK' && p.rating >= 60)
      .sort((a, b) => (a.contractYears ?? 3) - (b.contractYears ?? 3) || b.rating - a.rating || a.id.localeCompare(b.id));
    if (real[0]) {
      const p = real[0], next = sellTo(s, p, buyer);
      if (next) { s = next; soldCount += 1; sold.push({ name: p.name, birth: cm.worldYear(s) - p.age, season, years: p.contractYears ?? 3, madeUp: false }); }
    }
    if (season >= 2 && season <= 6) {
      const prospects = [...(s.academy?.prospects ?? [])].sort((a, b) => a.fee - b.fee);
      for (const pr of prospects) {
        const t = cm.promoteProspect(s, pr.id); if (!t) continue;
        const boy = t.squad.find(p => p.name === pr.name && p.academyGrad);
        const next = boy && sellTo(t, boy, buyer);
        if (next) { s = next; academySold += 1; sold.push({ name: boy.name, birth: cm.worldYear(s) - boy.age, season, years: boy.contractYears ?? 3, madeUp: true }); }
        break;
      }
    }
    const weakest = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
    if (weakest && s.squad.length > 20) s = cm.releasePlayer(s, weakest.id) ?? s;
    /* The season. */
    for (let i = 0; i < 400; i += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = cm.playNextEntry(s, OPT); s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.sacked) { sacked = true; console.log(`  ${club}: sacked in season ${season}, the run stops there`); break; }
    s = cm.finishSeason(s).state;
    if (season === SEASONS) break;
    s = cm.startNextSeason(s);
    /* The next summer, as stored: the ledger, the save, and what the world shows. */
    const held = ledger.readWorldRoster(s);
    store.clear(); cm.saveCareer(s);
    const units = (store.get(cm.SAVE_KEY) ?? '').length, ledgerUnits = s.worldRoster ? JSON.stringify(s.worldRoster).length : 0;
    points.push([season + 1, ledgerUnits]);
    if ((season + 1) % 5 === 0) console.log(`  ${club} season ${season + 1}: save ${units} units, ledger ${held?.records.length ?? 0} records, ${ledgerUnits} units`);
    if (TIME_AT.includes(season + 1)) measureTime(s, `${club} season ${season + 1}`);
    for (const record of held?.records ?? []) {
      if (record.status !== 'owned' || record.owner === s.clubName || !isMadeUp(record.player)) continue;
      const listed = cm.worldRosterFor(s, record.owner).find(p => p.worldRosterKey === record.key);
      if (!listed) continue;
      madeUpSeen += 1;
      if (listed.g !== true) fail(3, `${club} season ${season + 1}: ${record.player.name} (a made up name) is listed at ${record.owner} with no made up mark`);
    }
    const market = cm.buildMarket(s);
    for (const man of sold.filter(m => m.madeUp)) {
      const row = market.find(p => p.name === man.name && p.club === buyer);
      if (row) { madeUpMarket += 1; if (row.generated !== true) fail(3, `${club} season ${season + 1}: ${man.name} is on the market at ${buyer} not marked as made up`); }
    }
    for (const man of sold) {
      if (man.done) continue;
      /* retireChance is 0 under 32, so until then he cannot have retired and must be at the buyer. From 32 on he
         may retire, and a retired man's record goes once it changes no roster, so tracking stops there. */
      if (cm.worldYear(s) - man.birth >= 32) { man.done = true; continue; }
      const record = held?.records.find(r => r.origin.name === man.name && r.origin.birthYear === man.birth);
      if (!record) { fail(4, `${club} season ${season + 1}: ${man.name}, sold in season ${man.season}, has no ledger record`); man.done = true; continue; }
      if (record.status === 'retired') { man.done = true; continue; }
      /* The ledger takes a year off his old deal each summer, so by this summer it has run out once as many
         summers have passed as he had years left when he was sold. */
      const runOut = season + 1 - man.season >= man.years;
      const there = record.status === 'owned' && record.owner === buyer && cm.worldRosterFor(s, buyer).some(p => p.worldRosterKey === record.key);
      if (!there) { fail(4, `${club} season ${season + 1}: ${man.name}, sold to ${buyer} in season ${man.season} with ${man.years} years left, is ${record.status}${record.owner ? ` at ${record.owner}` : ''} and not in ${buyer}'s squad`); man.done = true; continue; }
      if (runOut && !man.counted) { runOutSeen += 1; man.counted = true; }
    }
  }
  if (sacked && points.length < 20) cannot(`${club}: sacked before the ledger could be measured past season 20`);
  const tail = points.filter(p => p[0] >= 15);
  const slope = slopeOf(tail);
  slopes.push({ club, slope, first: tail[0], last: tail[tail.length - 1] });
  console.log(`  ${club}: ledger slope from season 15 on ${slope.toFixed(1)} units a season (${tail[0][1]} at ${tail[0][0]}, ${tail[tail.length - 1][1]} at ${tail[tail.length - 1][0]})`);
}

/* ---------- the verdict ---------- */
/* Section 1, TIME. Measured on a GitHub runner (remote check azfx-2, 6 readings: 3 careers at seasons 10 and 30):
   a tap 1.1 to 3.4 ms against 1.1 to 2.9 ms with no seed or ledger (at most 1.2 times); a matchday 12.0 to 25.4 ms
   against 8.0 to 15.8 ms (1.5 to 1.6 times). The nocache control (the shared read and both memos off): a tap 81 to
   827 ms against 0.9 to 3.9 (90 to 230 times), a matchday 3.7 to 4.5 times. So a tap may take 3 times plus 5 ms and
   a matchday 2.5 times plus 5 ms: about twice the healthy worst, and every control reading lands outside. */
const TAP_RATIO = 3, TAP_FLOOR = 5, DAY_RATIO = 2.5, DAY_FLOOR = 5;
for (const row of timing) {
  if (row.tap > TAP_RATIO * row.bareTap + TAP_FLOOR) fail(1, `${row.label}: a tap built the market in ${row.tap.toFixed(1)} ms, over ${TAP_RATIO} x ${row.bareTap.toFixed(1)} + ${TAP_FLOOR}`);
  if (row.day > DAY_RATIO * row.bareDay + DAY_FLOOR) fail(1, `${row.label}: a matchday took ${row.day.toFixed(1)} ms, over ${DAY_RATIO} x ${row.bareDay.toFixed(1)} + ${DAY_FLOOR}`);
}
if (timing.length < CAREERS.length) fail(1, `only ${timing.length} timings were taken`);
/* Section 2, BOUND. Measured (azfx-2, the prune then inside the refresh): the stored ledger's slope from season 15
   to 30 was -11.0, -42.4 and -34.7 code units a season (a plateau near 2,200 to 3,000 units, 22 to 36 records);
   the noprune control 402 to 424 a season (282 to 284 records by season 30), the growth reviewer 2 measured. The
   cap sits between them with room on both sides. */
const SLOPE_CAP = 150;
for (const row of slopes) if (row.slope > SLOPE_CAP) fail(2, `${row.club}: the ledger grows ${row.slope.toFixed(1)} code units a season from season 15 on, over ${SLOPE_CAP}`);
/* Section 3, MADE UP. */
/* Coverage floors, a tenth of what the run makes (azfx-2: 296 sightings at a rival and 296 on the market; 74 sold
   men outlived the deal they had with me), so a run that stops dealing cannot pass by having nothing to check. */
if (madeUpSeen < 30) fail(3, `only ${madeUpSeen} made up men were seen at a rival through the ledger, under 30`);
if (madeUpMarket < 30) fail(3, `only ${madeUpMarket} academy men sold were seen on the market, under 30`);
/* Section 4, SOLD MEN. */
const MIN_RUNOUT = 7;
if (runOutSeen < MIN_RUNOUT) fail(4, `only ${runOutSeen} sold men outlived the deal they had with me at the buyer, under ${MIN_RUNOUT}`);
console.log(`simCmLedgerBound: ${CAREERS.length} careers to season ${SEASONS}; ${soldCount} real men and ${academySold} academy men sold; made up men seen at a rival ${madeUpSeen}, on the market ${madeUpMarket}; sold men past the deal they had with me ${runOutSeen}`);
const red = Object.entries(failures).filter(([, list]) => list.length).map(([k, list]) => `${k} (${list.length})`);
const TARGET = { noprune: '2', madeup: '3', release: '4', nocache: '1' }[CONTROL];
if (CONTROL) {
  if (failures[TARGET].length) { console.log(`simCmLedgerBound: CONTROL ${CONTROL} FIRED: section ${TARGET} red${red.length > 1 ? ` (red: ${red.join(', ')})` : ''}`); process.exit(1); }
  console.log(`simCmLedgerBound: CONTROL ${CONTROL} DID NOT FIRE: section ${TARGET} stayed green (red: ${red.join(', ') || 'none'})`); process.exit(3);
}
if (red.length) { console.log(`simCmLedgerBound: RED, sections ${red.join(', ')}`); process.exit(1); }
console.log('simCmLedgerBound: green, all four sections held');
