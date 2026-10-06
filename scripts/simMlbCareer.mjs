/* Round 58 playtest harness for MLB My Career, deepened in Round 919.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 11 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simMlbCareer.mjs [careers]

   Round 919 added life deck C (mlbCareerLifeC.ts, 36 cards) and four
   sections that measure it, in the NBA harness's shape (simNbaCareer,
   Round 918):

   C1  The deck is reachable. Over the fleet at least 34 of the 36 cards are
       drawn. The fleet now walks the lineup card the way the board does
       (draft night role, a camp battle every season) because three of the
       cards are for a bench player, and one career in four starts in the
       2004 era so the era gates are exercised. The default fleet went from
       80 careers to 400 for this: a position group card is eligible in only
       one career in eleven.
       Measured, 400 careers, SIM_SEED 1 to 6 and the default seed, after
       the review put the fleet in the board's order (no card after the
       last season): 36, 36, 35, 36, 36, 36 and 36 of 36, and the rarest
       card was drawn 3, 1, 0, 2, 2, 1 and 1 times (the innings limit card
       most often, and it is the one seed 3 missed: it is eligible in only
       about 185 offseasons, a young starter's first five). A card gets
       roughly one draw per hundred and fifty offseasons it is eligible in,
       because the press room's big moments take a large share of the
       offseasons. So one card missing a fleet happens (seed 3) and three
       missing is not a thing that happens; the floor of 34 is the brief's
       and leaves two. Nothing asserts on the rarest card. Deck C costs the
       rating curve nothing measurable: average peak 82.3 to 82.6 with it,
       82.5 with the catalog emptied (control nodeck, default seed).
       C2 measured 72,000 draws, 0 mismatches, and 420 to 464 trades from a
       2004 save, on every seed; C2r 21,600 draws, 0 mismatches.
   C1e The era gates hold. In a 2004 career a card whose rule did not exist
       yet is never ELIGIBLE (deck C's three batter minimum before 2020,
       checked on the gate every offseason) and never DRAWN (that card, and
       deck A's pitch clock before c.year 2024: the card looks back on
       violations already called, so it needs a 2023 season behind it).
       c.year at the draw is the season ahead, as on the board. Exact, no
       band.
   C2  The words are the effect. Every deck C card, 2,000 draws on saves the
       fleet found eligible for it: the line the player reads is parsed back
       and compared with what the save did, nothing outside the stats a card
       may move is touched (the contract above all), and the chip on the
       button names one of the outcomes that happened, both ways of a gamble
       seen. A trade must land on a club of the save's own era, and at
       least one trade from a 2004 save must be checked (the pool keeps half
       its saves from each era for this). Exact, no band: one mismatch is a
       failure.
   C2r The same check with no headroom given: on the saves as the fleet
       left them, pushed to every ceiling, and pushed to every floor. The
       chip is written for the save it is shown on, so a stat that cannot
       move is not promised. Exact, no band.
   Since the Round 919 review the fleet also keeps the board's order: a
   suspended season draws no card, and a season that retires the player
   ends the career before any card is drawn.
   T   Every life card drawn, in decks A, B and C, carries its category and
       cooldown tags (the table the summer step list reads). The corruption
       deck is untagged on purpose (another lane owns that file tonight).

   Negative controls, SIM_MLB_CONTROL=<name>, each asserts the thing it
   mutates exists and each must turn the run red:
     nodeck     empties the catalog                         -> C1 red
     eraleak    drops the 2020 gate on the three batter card -> C1e red
     clockleak  drops deck A's pitch clock gate (c.year 2024)  -> C1e red
     wordsbreak hides a morale change in a card               -> C2 red
     tradepay   cuts the salary on the trade                  -> C2 red
     notags     strips one deck A card's tags                 -> T red
     tradeera   the deck C trade forgets the era              -> C2 red
     chipblind  the chip stops reading the save               -> C2r red
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CONTROL = process.env.SIM_MLB_CONTROL || '';
const CONTROLS = ['', 'nodeck', 'eraleak', 'clockleak', 'wordsbreak', 'tradepay', 'notags', 'tradeera', 'chipblind'];
if (!CONTROLS.includes(CONTROL)) {
  console.error(`unknown SIM_MLB_CONTROL "${CONTROL}", expected one of: ${CONTROLS.slice(1).join(', ')}`);
  process.exit(2);
}

/* One bundle per process: two runs side by side never share a temp file. */
const OUT = path.join(os.tmpdir(), `mlb-engine-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * from './src/lib/mlbMyCareer.ts';\nexport * from './src/lib/mlbCareerLifeC.ts';\n",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});

/* Bundle level controls: the string each one cuts must be there first. */
const cutInBundle = (what, anchor, from, to, within) => {
  const src = readFileSync(OUT, 'utf8');
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error(`control ${CONTROL}: "${anchor}" is not in the bundle`);
  const hit = src.lastIndexOf(from, at + within);
  if (hit < 0 || Math.abs(hit - at) > within) throw new Error(`control ${CONTROL}: "${from}" is not beside ${what}`);
  writeFileSync(OUT, src.slice(0, hit) + to + src.slice(hit + from.length));
};
if (CONTROL === 'notags') {
  /* The kangaroo court card is open to everyone from the second offseason. */
  cutInBundle('the kangaroo court card', 'id: "mlbA_kangaroo_court"', 'category: "clubhouse",', '', 120);
}
if (CONTROL === 'tradeera') {
  /* The trade pool forgets the career's era (the review's mutation). */
  /* Round 988: the trade is the shared engine's; MLB's era reaches it
     through the sport's settings, so that is where the era is dropped. */
  cutInBundle('the deck C trade', 'var MLB_DECK_C = {', 'mlbEraTeamIds(c.eraId)', 'mlbEraTeamIds(void 0)', 300);
}
if (CONTROL === 'chipblind') {
  /* The chip stops reading the save, as it did before the review. */
  /* Round 988: the chip is the shared engine's, and MLB's settings say
     whether it reads the save. */
  cutInBundle('the deck C chip', 'var MLB_DECK_C = {', 'chipReadsSave: true', 'chipReadsSave: false', 300);
}
if (CONTROL === 'clockleak') {
  cutInBundle('the pitch clock card', 'id: "mlbA_pitch_clock"', 'yrs >= 1 && c.year >= 2024', 'yrs >= 1', 400);
}

const eng = await import(pathToFileURL(OUT).href);
const {
  MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, drawMlbEvent, mlbShouldRetire,
  mlbLegacyOf, mlbCareerTotals, mlbRollTeamQuality, mlbMarketSalary,
  MLB_SPEND_ITEMS, buyMlbItem, mlbAssignRole, mlbCampBattle,
  MLB_LIFE_C, buildMlbLifeCCard, mlbEraTeamIds,
} = eng;
unlinkSync(OUT);

const CAREERS = Number(process.argv[2] || 400);
const POSITIONS = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const DECK_C = 36;
const DECK_C_FLOOR = 34;
const DRAWS_PER_CARD = 2000;
/* The cards whose rule did not exist in 2004, with the first season it
   applied. Listed here by hand, on purpose: the harness must not learn the
   gate from the file it is checking. */
const FIRST_SEASON = { mlbC_rp_three_batter: 2020, mlbA_pitch_clock: 2024 };

if (MLB_LIFE_C.length !== DECK_C) throw new Error(`deck C is ${MLB_LIFE_C.length} cards, the harness expects ${DECK_C}`);
const defOf = id => {
  const d = MLB_LIFE_C.find(x => x.id === id);
  if (!d) throw new Error(`control ${CONTROL}: card ${id} is not in the catalog`);
  return d;
};
if (CONTROL === 'nodeck') {
  MLB_LIFE_C.splice(0, MLB_LIFE_C.length);
}
if (CONTROL === 'eraleak') {
  const d = defOf('mlbC_rp_three_batter');
  d.when = c => c.pos === 'RP' && c.seasons.length >= 1;
}
if (CONTROL === 'wordsbreak') {
  const o = defOf('mlbC_rookie_book').options[1];
  if (typeof o.say !== 'string') throw new Error('control wordsbreak: option 1 of mlbC_rookie_book is not a plain line');
  const line = o.say;
  o.say = c => { c.morale += 3; return line; };
}
if (CONTROL === 'tradepay') {
  const o = defOf('mlbC_bench_out_of_options').options[0];
  if (o.move !== 'trade' || typeof o.say !== 'string') throw new Error('control tradepay: option 0 of mlbC_bench_out_of_options is not the plain trade');
  const line = o.say;
  o.say = c => { c.salary = Math.round(c.salary * 0.8 * 10) / 10; return line; };
}

/* ------------------------------ the fleet ------------------------------ */

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];
/* Round 919 */
const cFired = new Map();        // deck C id -> times drawn
const cEligible = new Map();     // deck C id -> offseasons it was eligible in
const eraLeaks = [];             // a gated card eligible or drawn too early in a 2004 career
const untagged = new Set();      // life card ids drawn without their tags
const pools = new Map();         // deck C id -> saves the fleet found eligible
let benchSeasons = 0, eraCareers = 0, lifeDraws = 0;
const POOL_CAP = 40;
const clone = x => JSON.parse(JSON.stringify(x));

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = MLB_ARCHETYPES[pos][i % MLB_ARCHETYPES[pos].length];
    /* One career in four starts in the 2004 era. */
    const eraId = i % 4 === 3 ? 'y2004' : undefined;
    if (eraId) eraCareers++;
    let c = startMlbCareer(`Sim ${i}`, pos, arch, Math.random, null, eraId);
    /* The board's own order: the lineup card is set the night you arrive,
       and every season starts with a camp (MlbMyCareerBoard). */
    let tq = mlbRollTeamQuality(null, Math.random);
    mlbAssignRole(c, tq, Math.random);
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      const served = (c.suspendedSeasons ?? 0) > 0;
      if (served) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        mlbCampBattle(c, tq, Math.random);
        if (c.role === 'backup') benchSeasons++;
        const { line } = simMlbSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.hr, line.avg, line.so, line.era, line.saves, line.holds]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      mlbProgress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      /* The board's own order (MlbMyCareerBoard): a suspended season goes
         straight back to the hub with no card, and a season that ends the
         career retires it before any card is drawn. Before the Round 919
         review the fleet drew a card after the last season too, which the
         board never does and which flattered the veteran cards' reach. */
      if (!served && mlbShouldRetire(c)) c.retired = true;
      const drawsCard = !served && !c.retired;

      /* Round 919: keep a few of the saves each deck C card was eligible on,
         for section C2, and check the era gates on the gate itself. Reads
         the gate only, draws nothing. */
      if (drawsCard) for (const d of MLB_LIFE_C) {
        if (!d.when(c)) continue;
        cEligible.set(d.id, (cEligible.get(d.id) ?? 0) + 1);
        if (eraId === 'y2004' && FIRST_SEASON[d.id] && c.year < FIRST_SEASON[d.id]) eraLeaks.push(`${d.id} eligible in career ${i}, ${c.year}`);
        /* Half the pool from each era, so the trade check in C2 sees 2004
           saves wherever the fleet found any. */
        const pool = pools.get(d.id) ?? [];
        const sameEra = pool.filter(p => (p.eraId === 'y2004') === (eraId === 'y2004')).length;
        if (sameEra < POOL_CAP / 2) { pool.push(clone(c)); pools.set(d.id, pool); }
      }

      // draw and resolve an offseason event
      const ev = drawsCard ? drawMlbEvent(c, Math.random) : null;
      if (ev) {
        seenEventIds.add(ev.id);
        if (/^mlb[ABC]_/.test(ev.id)) {
          lifeDraws++;
          if (typeof ev.category !== 'string' || !ev.category || !(ev.cooldown >= 1)) untagged.add(ev.id);
        }
        if (eraId === 'y2004' && FIRST_SEASON[ev.id] && c.year < FIRST_SEASON[ev.id]) eraLeaks.push(`${ev.id} drawn in career ${i}, ${c.year}`);
        if (ev.id.startsWith('mlbC_')) cFired.set(ev.id, (cFired.get(ev.id) ?? 0) + 1);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }
      tq = mlbRollTeamQuality(tq, Math.random);

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of MLB_SPEND_ITEMS) {
          const res = buyMlbItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }
    }

    peaks.push(peak);
    const totals = mlbCareerTotals(c);
    const legacy = mlbLegacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(mlbMarketSalary(c))) nanHits++;
    if (totals == null) throw new Error('careerTotals returned null');
  } catch (err) {
    crashes++;
    if (crashes <= 3) console.error(`CAREER ${i} CRASHED:`, err && err.message);
  }
}

/* ------------------- C2: the words are the effect ------------------- */

/* The only fields a deck C card may move. Everything else on the save,
   the contract above all, must come out of a card exactly as it went in. */
const FREE = ['ovr', 'morale', 'fanbase', 'health', 'earnings', 'netWorth', 'team', 'lifeFlags'];
const rest = c => { const o = { ...c }; for (const k of FREE) delete o[k]; return JSON.stringify(o); };
const num = (re, s) => { const m = s.match(re); return m ? Number(m[1]) : 0; };
const near = (a, b) => Math.abs(a - b) < 0.0051;
const sign = d => (d > 0.0001 ? 'up' : d < -0.0001 ? 'down' : '');
const LEAD = 'Could go either way: ';
const chipBranches = effect => (effect.startsWith(LEAD) ? effect.slice(LEAD.length).split(', or ') : [effect])
  .map(p => p.toLowerCase().split(', ').sort().join('|'));
const observedChip = d => {
  const bits = [];
  if (sign(d.ovr)) bits.push(`rating ${sign(d.ovr)}`);
  if (sign(d.morale)) bits.push(`morale ${sign(d.morale)}`);
  if (sign(d.fanbase)) bits.push(`fans ${sign(d.fanbase)}`);
  if (sign(d.health)) bits.push(`health ${sign(d.health)}`);
  if (sign(d.netWorth)) bits.push(d.netWorth > 0 ? 'money in' : 'money out');
  if (d.team) bits.push('new team');
  return bits.length ? bits.sort().join('|') : 'no change';
};

let c2Draws = 0, c2Bad = 0, c2EraTrades = 0;
const c2Examples = [];
const c2NoSave = [];
const c2Unseen = [];
for (const def of MLB_LIFE_C) {
  const pool = pools.get(def.id) ?? [];
  if (!pool.length) { c2NoSave.push(def.id); continue; }
  const branchSeen = def.options.map(() => new Set());
  const branchWant = buildMlbLifeCCard(def, clone(pool[0])).options.map(o => chipBranches(o.effect).length);
  for (let d = 0; d < DRAWS_PER_CARD; d++) {
    const c = clone(pool[d % pool.length]);
    /* Headroom, so a clamp cannot hide a number: the check is about the
       words, and the clamps have their own vitest cases. */
    c.morale = 50; c.fanbase = 50; c.health = 60;
    c.ovr = Math.min(c.ovr, 90); c.pot = Math.max(c.pot, c.ovr + 5);
    const { k, hit, bad, line } = checkDraw(def, c);
    c2Draws++;
    if (hit >= 0) branchSeen[k].add(hit);
    if (bad.length) {
      c2Bad++;
      if (c2Examples.length < 5) c2Examples.push(`${def.id} option ${k}: ${bad.join('; ')} | line: ${line}`);
    }
  }
  branchSeen.forEach((seen, k) => { if (seen.size < branchWant[k]) c2Unseen.push(`${def.id} option ${k}`); });
}

/* One draw of one card on one save: the line read back against what the
   save did, the chip against the outcome, and a trade against the era. */
function checkDraw(def, c) {
    const ev = buildMlbLifeCCard(def, c);
    const k = Math.floor(Math.random() * ev.options.length);
    const before = clone(c);
    const log = ev.options[k].apply(c, Math.random);
    const delta = {
      ovr: c.ovr - before.ovr, morale: c.morale - before.morale, fanbase: c.fanbase - before.fanbase,
      health: c.health - before.health, earnings: c.earnings - before.earnings,
      netWorth: (c.netWorth ?? 0) - (before.netWorth ?? 0), team: c.team !== before.team,
    };
    const bad = [];
    if (typeof log !== 'string' || !log) bad.push('no line');
    const line = String(log);
    const landed = line.match(/rating [+-]\d+ to (\d+)/i);
    if (num(/rating ([+-]\d+) to \d+/i, line) !== delta.ovr) bad.push(`rating moved ${delta.ovr}`);
    if (landed && Number(landed[1]) !== c.ovr) bad.push(`rating landed on ${c.ovr}`);
    if (num(/morale ([+-]\d+)/i, line) !== delta.morale) bad.push(`morale moved ${delta.morale}`);
    if (num(/fanbase ([+-]\d+)/i, line) !== delta.fanbase) bad.push(`fanbase moved ${delta.fanbase}`);
    if (num(/health ([+-]\d+)/i, line) !== delta.health) bad.push(`health moved ${delta.health}`);
    const earned = num(/earned (\d+(?:\.\d+)?)M/i, line);
    const worth = num(/net worth ([+-]\d+(?:\.\d+)?)M/i, line);
    if (!near(earned, delta.earnings)) bad.push(`earnings moved ${delta.earnings.toFixed(2)}`);
    if (!near(earned + worth, delta.netWorth)) bad.push(`net worth moved ${delta.netWorth.toFixed(2)}`);
    if (/Traded to /.test(line) !== delta.team) bad.push(delta.team ? 'moved team without saying so' : 'said traded, team unchanged');
    if (rest(c) !== rest(before)) bad.push('touched a field no card may move');
    if (delta.team) {
      if (!mlbEraTeamIds(c.eraId).includes(c.team)) bad.push(`traded to ${c.team}, not a club of the ${c.eraId ?? 'modern'} era`);
      if (c.eraId === 'y2004') c2EraTrades++;
    }
    const hit = chipBranches(ev.options[k].effect).indexOf(observedChip(delta));
    if (hit < 0) bad.push(`button said "${ev.options[k].effect}", the save did "${observedChip(delta)}"`);
    return { k, hit, bad, line };
}

/* C2r: the same check on the saves as the fleet left them, and pushed to
   the ceilings and the floors, with no headroom given. The chip is written
   for the save it is shown on, so "health up" must never be offered to a
   player already at 100. Before the Round 919 review 17 percent of the
   sure options on real saves promised a move the save could not make. */
const RAW_DRAWS = 600;
let c2rDraws = 0, c2rBad = 0;
const c2rExamples = [];
for (const def of MLB_LIFE_C) {
  const pool = pools.get(def.id) ?? [];
  for (let d = 0; d < (pool.length ? RAW_DRAWS : 0); d++) {
    const c = clone(pool[d % pool.length]);
    if (d % 3 === 1) { c.morale = 100; c.fanbase = 100; c.health = 100; c.ovr = Math.min(c.pot + 1, 99); }
    if (d % 3 === 2) { c.morale = 0; c.fanbase = 0; c.health = 0; c.ovr = 50; }
    const { k, bad, line } = checkDraw(def, c);
    c2rDraws++;
    if (bad.length) {
      c2rBad++;
      if (c2rExamples.length < 5) c2rExamples.push(`${def.id} option ${k}: ${bad.join('; ')} | line: ${line}`);
    }
  }
}

/* ------------------------------ the report ------------------------------ */

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

const cDistinct = [...cFired.keys()].length;
const cCounts = MLB_LIFE_C.map(d => cFired.get(d.id) ?? 0).sort((a, b) => a - b);
const cMissing = MLB_LIFE_C.filter(d => !cFired.has(d.id)).map(d => d.id);

console.log('\n=== ROUND 58 MLB MY CAREER PLAYTEST ===');
if (CONTROL) console.log(`NEGATIVE CONTROL   : ${CONTROL} (this run is expected to FAIL)`);
console.log(`careers            : ${CAREERS}  (${eraCareers} in the 2004 era, ${benchSeasons} bench seasons)`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('mlbA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('mlbB_')).length}/45`);
console.log(`  lifeC fired      : ${cDistinct}/${DECK_C}  (floor ${DECK_C_FLOOR}; rarest card drawn ${cCounts[0] ?? 0} times, median ${cCounts[Math.floor(cCounts.length / 2)] ?? 0})`);
if (cMissing.length) console.log(`    never drawn    : ${cMissing.join(', ')}`);
console.log(`    rarest three   : ${MLB_LIFE_C.map(d => [d.id, cFired.get(d.id) ?? 0]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([id, n]) => `${id} ${n} (eligible in ${cEligible.get(id) ?? 0} offseasons)`).join(', ')}`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('mcorr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${MLB_SPEND_ITEMS.length}`);
console.log(`C1e era leaks      : ${eraLeaks.length}  (a gated card eligible or drawn too early in a 2004 career, must be 0)`);
for (const l of eraLeaks.slice(0, 3)) console.log(`    ${l}`);
console.log(`C2 words vs effect : ${c2Draws} draws, ${c2Bad} mismatches, ${c2Unseen.length} outcomes never seen, ${c2NoSave.length} cards with no eligible save, ${c2EraTrades} trades from a 2004 save checked against the era`);
console.log(`C2r at the clamps  : ${c2rDraws} draws on saves as left, at the ceilings and at the floors, ${c2rBad} mismatches`);
for (const ex of c2rExamples) console.log(`    ${ex}`);
for (const ex of c2Examples) console.log(`    ${ex}`);
if (c2Unseen.length) console.log(`    unseen         : ${c2Unseen.slice(0, 5).join(', ')}`);
if (c2NoSave.length) console.log(`    no save        : ${c2NoSave.slice(0, 5).join(', ')}`);
console.log(`T  life cards drawn: ${lifeDraws}, without tags: ${untagged.size}${untagged.size ? ` (${[...untagged].slice(0, 5).join(', ')})` : ''}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.era) bits.push(`${best.era} ERA, ${best.so} K`);
  if (best.wins) bits.push(`${best.wins}-${best.lossesP}`);
  if (best.saves) bits.push(`${best.saves} SV`);
  if (best.holds) bits.push(`${best.holds} HLD`);
  if (best.avg) bits.push(`.${String(Math.round(best.avg * 1000)).padStart(3, '0')}`);
  if (best.hr) bits.push(`${best.hr} HR, ${best.rbi} RBI`);
  if (best.sb) bits.push(`${best.sb} SB`);
  console.log(`  ${p.padEnd(3)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < MLB_SPEND_ITEMS.length) fails.push(`${MLB_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
/* Round 919 */
if (cDistinct < DECK_C_FLOOR) fails.push(`C1 deck C reached ${cDistinct}/${DECK_C}, floor ${DECK_C_FLOOR}`);
if (eraLeaks.length) fails.push(`C1e ${eraLeaks.length} era leaks`);
if (c2Bad || c2NoSave.length || c2Unseen.length) fails.push(`C2 ${c2Bad} word mismatches, ${c2NoSave.length} cards untested, ${c2Unseen.length} outcomes unseen`);
if (!c2EraTrades) fails.push('C2 no trade from a 2004 save was checked against the era');
if (c2rBad) fails.push(`C2r ${c2rBad} mismatches on saves at their ceilings and floors`);
if (untagged.size) fails.push(`T ${untagged.size} life cards drawn without tags`);
if (!lifeDraws) fails.push('T no life card was drawn at all');
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C reachable, era gates hold, words match effects, every life card tagged');
process.exit(fails.length ? 1 : 0);
