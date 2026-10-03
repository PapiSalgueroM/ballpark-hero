/* Round 59 playtest harness for NHL My Career, deepened in Round 920.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 5 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNhlCareer.mjs [careers]

   Round 920 added life deck C (nhlCareerLifeC.ts, 36 cards) and four
   sections that measure it, the same four the NBA deck C has (Round 918):

   C1  The deck is reachable. Over the fleet at least 34 of the 36 cards are
       drawn. The fleet walks the lineup the way the board does (draft night
       role, a camp battle every season) because four of the cards are for a
       backup, and it signs a free agent deal whenever a deal runs out, as
       the board's window makes the player do (until a review on 2026-10-03
       it never re-signed, so deals ran 0, -1, -2 and the cards that read
       the contract were drawn at the wrong rates). One career in four starts
       in the 2006-07 era so the era gates are exercised.
       MEASURED: see the numbers block at the end of this comment.
   C1e The era gates hold. A rule card whose rule the sources date (three on
       three, the coach's challenge, retained salary) or describe only as the
       current agreement (waivers, the exemption, the conditioning loan, the
       entry level bonuses) is never drawn in a 2006-07 career before its
       season. Exact, no band. The fleet seldom lands on the one season
       before a rule, and a gate opened a season early passed it in review,
       so a probe also asks each dated card directly, on a save the fleet
       found it eligible on, moved into a 2006-07 career: closed in the
       season before its rule, open in the rule's first season. Exact.
   C2  The words are the effect. Every card, 2,000 draws on saves the fleet
       found eligible for it: the line the player reads is parsed back and
       compared with what the save did, nothing outside the stats a card may
       move is touched (the contract above all), and the chip on the button
       names one of the outcomes that happened, both ways of a gamble seen.
       Exact, no band: one mismatch is a failure.
   T   Every life card in decks A, B and C carries its category and
       cooldown tags (the table the summer step list reads): every card the
       fleet draws, and in a static pass every deck A and B card built on
       any save the fleet passes through or on a fresh start (all 45 of each
       must turn up), plus the deck C catalog. The static pass exists because
       the drawn check never saw a card the fleet does not draw (deck A's
       three first year cards cannot be drawn: the draw runs after a season).

   Negative controls, SIM_NHL_CONTROL=<name>, each asserts the thing it
   mutates exists and each must turn the run red:
     nodeck     empties the catalog                   -> C1 red
     eraleak    drops the era gate on one rule card   -> C1e red
     eraearly   opens one rule card a season early    -> C1e red (the probe)
     wordsbreak hides a morale change in a card       -> C2 red
     tradepay   cuts the salary on a trade            -> C2 red
     notags     strips one deck A card's tags         -> T red
     notagsrare strips a never drawn card's tags      -> T red (static pass)

   MEASURED, 400 careers, SIM_SEED 1 to 8, remeasured 2026-10-03 after the
   review's fixes and the fleet's free agency: deck C drew 35, 36, 35, 36,
   36, 36, 35, 36 of 36. The rare card is now the offer sheet, drawn 0, 3,
   0, 3, 1, 2, 0, 3 times (eligible in 155 to 171 offseasons a fleet): with
   real contracts a deal runs out only every few seasons, and the card waits
   for one in seasons three to six. It was left as rare as play makes it,
   not widened. Next rarest: the backup goalie's card (2 to 7 draws) and
   the shutdown pair card (2 at its lowest). The first draft had two cards
   that missed a fleet on four seeds of six (the second year card behind a
   rating gate, the no trade card behind deck B's clause flags alone); both
   gates were widened rather than the floor lowered. The floor of 34 is the
   brief's and the worst seed left one card of slack. Nothing asserts on
   the rarest card. On all eight seeds the C1e probe found 0 gates off by a
   season and the static T pass built 45 of 45 in decks A and B. Average
   peak 85.6 to 85.9; see the nodeck control's line for the same fleet with
   the catalog emptied.
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CONTROL = process.env.SIM_NHL_CONTROL || '';
const CONTROLS = ['', 'nodeck', 'eraleak', 'eraearly', 'wordsbreak', 'tradepay', 'notags', 'notagsrare'];
if (!CONTROLS.includes(CONTROL)) {
  console.error(`unknown SIM_NHL_CONTROL "${CONTROL}", expected one of: ${CONTROLS.slice(1).join(', ')}`);
  process.exit(2);
}

/* One bundle per process: two runs side by side never share a temp file. */
const OUT = path.join(os.tmpdir(), `nhl-engine-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * from './src/lib/nhlMyCareer.ts';\nexport * from './src/lib/nhlCareerLifeC.ts';\n"
      + "export { getNhlLifeEventsA } from './src/lib/nhlCareerLifeA.ts';\nexport { getNhlLifeEventsB } from './src/lib/nhlCareerLifeB.ts';\n"
      + "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';\n",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});

if (CONTROL === 'notags') {
  /* Strip the tags from one deck A card in the bundle. The card is the
     kangaroo court one, which every fleet draws. */
  const src = readFileSync(OUT, 'utf8');
  const at = src.indexOf('id: "nhlA_kangaroo_court"');
  if (at < 0) throw new Error('control notags: the card id is not in the bundle');
  const tag = 'category: "lockerRoom",';
  const tagAt = src.indexOf(tag, at);
  if (tagAt < 0 || tagAt - at > 200) throw new Error('control notags: the tag is not beside the card id');
  writeFileSync(OUT, src.slice(0, tagAt) + src.slice(tagAt + tag.length));
}

if (CONTROL === 'notagsrare') {
  /* Strip the tags from deck A's billet family card, which the fleet never
     draws (the draw runs after a season, so its first year gate never holds
     there). Only the static pass in section T can see it. */
  const src = readFileSync(OUT, 'utf8');
  const at = src.indexOf('id: "nhlA_billet_family"');
  if (at < 0) throw new Error('control notagsrare: the card id is not in the bundle');
  const tag = 'category: "callup",';
  const tagAt = src.indexOf(tag, at);
  if (tagAt < 0 || tagAt - at > 200) throw new Error('control notagsrare: the tag is not beside the card id');
  writeFileSync(OUT, src.slice(0, tagAt) + src.slice(tagAt + tag.length));
}

const eng = await import(pathToFileURL(OUT).href);
const {
  NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, drawNhlEvent, nhlShouldRetire,
  nhlLegacyOf, nhlCareerTotals, nhlRollTeamQuality, nhlMarketSalary,
  NHL_SPEND_ITEMS, buyNhlItem, nhlAssignRole, nhlCampBattle,
  NHL_LIFE_C, buildNhlLifeCCard,
  getNhlLifeEventsA, getNhlLifeEventsB, buildNhlFaWindow, applyFaSigning,
} = eng;
unlinkSync(OUT);

const CAREERS = Number(process.argv[2] || 400);
const POSITIONS = ['C', 'LW', 'RW', 'D', 'G'];
const DECK_C = 36;
const DECK_C_FLOOR = 34;
const DRAWS_PER_CARD = 2000;
/* The rule cards and the first season (the season ahead, c.year) a 2006-07
   career may see them. Listed here by hand, on purpose: the harness must
   not learn the gate from the file it is checking. */
const RULE_FROM = {
  nhlC_rule_three_on_three: 2015, nhlC_rule_coach_challenge: 2015,
  nhlC_rule_retained_salary: 2013, nhlC_rule_waiver_claim: 2013, nhlC_rule_ahl_assignment: 2013,
  nhlC_rule_conditioning_loan: 2013, nhlC_rule_entry_level_bonuses: 2013,
};

if (NHL_LIFE_C.length !== DECK_C) throw new Error(`deck C is ${NHL_LIFE_C.length} cards, the harness expects ${DECK_C}`);
const defOf = id => {
  const d = NHL_LIFE_C.find(x => x.id === id);
  if (!d) throw new Error(`control ${CONTROL}: card ${id} is not in the catalog`);
  return d;
};
if (CONTROL === 'nodeck') {
  NHL_LIFE_C.splice(0, NHL_LIFE_C.length);
}
if (CONTROL === 'eraleak') {
  const d = defOf('nhlC_rule_three_on_three');
  d.when = c => c.pos !== 'G' && c.seasons.length >= 1;
}
if (CONTROL === 'eraearly') {
  /* Opens three on three one season early, the slip a review made by hand.
     The fleet rarely lands on that one season; the C1e probe must. */
  const d = defOf('nhlC_rule_three_on_three');
  const gate = d.when;
  d.when = c => gate({ ...c, year: c.year + 1 });
}
if (CONTROL === 'wordsbreak') {
  const o = defOf('nhlC_rookie_wall').options[0];
  if (typeof o.say !== 'string') throw new Error('control wordsbreak: option 0 of nhlC_rookie_wall is not a plain line');
  const line = o.say;
  o.say = c => { c.morale += 3; return line; };
}
if (CONTROL === 'tradepay') {
  const o = defOf('nhlC_rule_retained_salary').options[0];
  if (o.move !== 'trade' || typeof o.say !== 'string') throw new Error('control tradepay: option 0 of nhlC_rule_retained_salary is not the plain trade');
  const line = o.say;
  o.say = c => { c.salary = Math.round(c.salary * 0.8 * 10) / 10; return line; };
}

/* ------------------------------ the fleet ------------------------------ */

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];
/* Round 920 */
const cFired = new Map();        // deck C id -> times drawn
const cEligible = new Map();     // deck C id -> offseasons it was eligible in
const eraLeaks = [];             // dated rule cards drawn too early in a 2006-07 career
const untagged = new Set();      // life card ids drawn without their tags
const pools = new Map();         // deck C id -> saves the fleet found eligible
let benchSeasons = 0, eraCareers = 0, lifeDraws = 0, faSignings = 0;
/* Section T, the static pass: decks A and B are built on every save the
   fleet passes through and on every fresh start, so a card the fleet never
   draws is still checked. Its own generator, so the fleet's stream is not
   touched. */
const tagSeen = new Map();       // deck A and B id -> tagged on every build
let tSeed = 920;
const tRng = () => { tSeed = (tSeed * 1664525 + 1013904223) >>> 0; return tSeed / 4294967296; };
const tagCheck = s => {
  for (const ev of [...getNhlLifeEventsA(clone(s), tRng), ...getNhlLifeEventsB(clone(s), tRng)]) {
    const ok = typeof ev.category === 'string' && !!ev.category && ev.cooldown >= 1;
    tagSeen.set(ev.id, (tagSeen.get(ev.id) ?? true) && ok);
  }
};
const POOL_CAP = 40;
const clone = x => JSON.parse(JSON.stringify(x));

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = NHL_ARCHETYPES[pos][i % NHL_ARCHETYPES[pos].length];
    /* One career in four starts in the 2006-07 era. */
    const eraId = i % 4 === 3 ? 'y2006' : undefined;
    if (eraId) eraCareers++;
    let c = startNhlCareer(`Sim ${i}`, pos, arch, Math.random, null, eraId);
    /* The board's own order: the lineup is set the night you arrive, and
       every season starts with a camp (NhlMyCareerBoard create and advance). */
    let tq = nhlRollTeamQuality(null, Math.random);
    nhlAssignRole(c, tq, Math.random);
    tagCheck(c);
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        /* The board opens free agency when a deal is up (NhlMyCareerBoard
           advance): sign one of the live offers, take that club's quality,
           and the new room holds its camp. Without this the fleet's deals ran
           0, -1, -2 and the expiring deal cards came up far more often than
           in play. The board's optional extension is left out: declining it
           leads here too. */
        if (c.contractYears <= 0) {
          const live = buildNhlFaWindow(c, tq, Math.random).offers.filter(o => !o.gone);
          const offer = live[Math.floor(Math.random() * live.length)];
          applyFaSigning(c, offer);
          tq = offer.quality;
          nhlCampBattle(c, tq, Math.random);
          faSignings++;
        }
        nhlCampBattle(c, tq, Math.random);
        if (c.role === 'backup') benchSeasons++;
        const { line } = simNhlSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.points, line.goals, line.assists, line.wins, line.svpct]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      nhlProgress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;
      tagCheck(c);

      /* Round 920: keep a few of the saves each deck C card was eligible on,
         for section C2. Reads the gate only, draws nothing. */
      for (const d of NHL_LIFE_C) {
        if (!d.when(c)) continue;
        cEligible.set(d.id, (cEligible.get(d.id) ?? 0) + 1);
        const pool = pools.get(d.id) ?? [];
        if (pool.length < POOL_CAP) { pool.push(clone(c)); pools.set(d.id, pool); }
      }

      // draw and resolve an offseason event
      const ev = drawNhlEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        if (/^nhl[ABC]_/.test(ev.id)) {
          lifeDraws++;
          if (typeof ev.category !== 'string' || !ev.category || !(ev.cooldown >= 1)) untagged.add(ev.id);
        }
        if (ev.id.startsWith('nhlC_')) {
          cFired.set(ev.id, (cFired.get(ev.id) ?? 0) + 1);
          if (eraId === 'y2006' && RULE_FROM[ev.id] && c.year < RULE_FROM[ev.id]) eraLeaks.push(`${ev.id} in career ${i}, ${c.year}`);
        }
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }
      tq = nhlRollTeamQuality(tq, Math.random);

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NHL_SPEND_ITEMS) {
          const res = buyNhlItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (nhlShouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = nhlCareerTotals(c);
    const legacy = nhlLegacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(nhlMarketSalary(c))) nanHits++;
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

let c2Draws = 0, c2Bad = 0;
const c2Examples = [];
const c2NoSave = [];
const c2Unseen = [];
for (const def of NHL_LIFE_C) {
  const pool = pools.get(def.id) ?? [];
  if (!pool.length) { c2NoSave.push(def.id); continue; }
  const branchSeen = def.options.map(() => new Set());
  const branchWant = buildNhlLifeCCard(def, clone(pool[0])).options.map(o => chipBranches(o.effect).length);
  for (let d = 0; d < DRAWS_PER_CARD; d++) {
    const c = clone(pool[d % pool.length]);
    /* Headroom, so a clamp cannot hide a number: the check is about the
       words, and the clamps have their own vitest cases. */
    c.morale = 50; c.fanbase = 50; c.health = 60;
    c.ovr = Math.min(c.ovr, 90); c.pot = Math.max(c.pot, c.ovr + 5);
    const ev = buildNhlLifeCCard(def, c);
    const k = Math.floor(Math.random() * ev.options.length);
    const before = clone(c);
    const log = ev.options[k].apply(c, Math.random);
    c2Draws++;
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
    /* A trade and a waiver claim both say where you went. */
    if (/(Traded to|Claimed by) /.test(line) !== delta.team) bad.push(delta.team ? 'moved team without saying so' : 'said moved, team unchanged');
    if (rest(c) !== rest(before)) bad.push('touched a field no card may move');
    const hit = chipBranches(ev.options[k].effect).indexOf(observedChip(delta));
    if (hit < 0) bad.push(`button said "${ev.options[k].effect}", the save did "${observedChip(delta)}"`);
    else branchSeen[k].add(hit);
    if (bad.length) {
      c2Bad++;
      if (c2Examples.length < 5) c2Examples.push(`${def.id} option ${k}: ${bad.join('; ')} | line: ${line}`);
    }
  }
  branchSeen.forEach((seen, k) => { if (seen.size < branchWant[k]) c2Unseen.push(`${def.id} option ${k}`); });
}

/* C1e, the probe. The fleet only meets a gate on the seasons it happens to
   reach, and a gate opened one season early slipped past it in review. So
   every dated card is also asked directly, on a save the fleet found it
   eligible on, moved into a 2006-07 career: closed in the season before its
   rule, open in the rule's first season. */
const probeBad = [];
for (const [id, from] of Object.entries(RULE_FROM)) {
  const def = NHL_LIFE_C.find(d => d.id === id);
  const save = (pools.get(id) ?? [])[0];
  if (!def || !save) { probeBad.push(`${id}: no eligible save to probe`); continue; }
  const at = year => def.when({ ...clone(save), eraId: 'y2006', year });
  if (at(from - 1)) probeBad.push(`${id} open in ${from - 1}`);
  if (!at(from)) probeBad.push(`${id} closed in ${from}`);
}

/* T, the static pass: every deck A and B card built anywhere above, and
   the deck C catalog itself. */
const tIds = [...tagSeen.keys()];
const tA = tIds.filter(id => id.startsWith('nhlA_')).length;
const tB = tIds.filter(id => id.startsWith('nhlB_')).length;
const tBad = [...tIds.filter(id => !tagSeen.get(id)),
  ...NHL_LIFE_C.filter(d => typeof d.category !== 'string' || !d.category || !(d.cooldown >= 1)).map(d => d.id)];

/* ------------------------------ the report ------------------------------ */

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
const cDistinct = [...cFired.keys()].length;
const cCounts = NHL_LIFE_C.map(d => cFired.get(d.id) ?? 0).sort((a, b) => a - b);
const cMissing = NHL_LIFE_C.filter(d => !cFired.has(d.id)).map(d => d.id);

console.log('\n=== ROUND 59 NHL MY CAREER PLAYTEST ===');
if (CONTROL) console.log(`NEGATIVE CONTROL   : ${CONTROL} (this run is expected to FAIL)`);
console.log(`careers            : ${CAREERS}  (${eraCareers} in the 2006-07 era, ${benchSeasons} seasons down the lineup, ${faSignings} free agent signings)`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('nhlA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('nhlB_')).length}/45`);
console.log(`  lifeC fired      : ${cDistinct}/${DECK_C}  (floor ${DECK_C_FLOOR}; rarest card drawn ${cCounts[0] ?? 0} times, median ${cCounts[Math.floor(cCounts.length / 2)] ?? 0})`);
if (cMissing.length) console.log(`    never drawn    : ${cMissing.join(', ')}`);
console.log(`    rarest three   : ${NHL_LIFE_C.map(d => [d.id, cFired.get(d.id) ?? 0]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([id, n]) => `${id} ${n} (eligible in ${cEligible.get(id) ?? 0} offseasons)`).join(', ')}`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('hcorr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NHL_SPEND_ITEMS.length}`);
console.log(`C1e era leaks      : ${eraLeaks.length}  (dated rule cards drawn before their season in a 2006-07 career, must be 0)`);
console.log(`C1e probe          : ${Object.keys(RULE_FROM).length} dated cards, ${probeBad.length} gates not opening exactly in their rule's first season${probeBad.length ? ` (${probeBad.slice(0, 3).join(', ')})` : ''}`);
console.log(`C2 words vs effect : ${c2Draws} draws, ${c2Bad} mismatches, ${c2Unseen.length} outcomes never seen, ${c2NoSave.length} cards with no eligible save`);
for (const ex of c2Examples) console.log(`    ${ex}`);
console.log(`T  life cards drawn: ${lifeDraws}, without tags: ${untagged.size}${untagged.size ? ` (${[...untagged].slice(0, 5).join(', ')})` : ''}`);
console.log(`T  static pass     : deck A ${tA}/45 and deck B ${tB}/45 built on the fleet's saves and fresh starts, deck C ${NHL_LIFE_C.length} from the catalog, ${tBad.length} without tags${tBad.length ? ` (${tBad.slice(0, 5).join(', ')})` : ''}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.points) bits.push(`${best.goals}G ${best.assists}A ${best.points}P in ${best.games}`);
  if (best.wins) bits.push(`${best.wins} wins`);
  if (best.svpct) bits.push(`${best.svpct} SV%`);
  console.log(`  ${p.padEnd(3)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NHL_SPEND_ITEMS.length) fails.push(`${NHL_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
if (cDistinct < DECK_C_FLOOR) fails.push(`C1: deck C fired ${cDistinct} of ${DECK_C}, the floor is ${DECK_C_FLOOR}`);
if (eraLeaks.length) fails.push(`C1e: ${eraLeaks.length} dated rule cards drawn too early in the 2006-07 era (${eraLeaks[0]})`);
if (c2Bad) fails.push(`C2: ${c2Bad} draws where the words and the save disagree`);
if (c2Unseen.length) fails.push(`C2: ${c2Unseen.length} promised outcomes never happened (${c2Unseen.slice(0, 3).join(', ')})`);
if (c2NoSave.length) fails.push(`C2: ${c2NoSave.length} cards had no eligible save to check (${c2NoSave.slice(0, 3).join(', ')})`);
if (untagged.size) fails.push(`T: ${untagged.size} life cards drawn without category and cooldown`);
if (probeBad.length) fails.push(`C1e: ${probeBad.length} dated gates off their rule's first season (${probeBad[0]})`);
if (tA < 45 || tB < 45) fails.push(`T: the static pass built only ${tA} of deck A's 45 and ${tB} of deck B's 45`);
if (tBad.length) fails.push(`T: ${tBad.length} life cards without category and cooldown in the static pass (${tBad.slice(0, 3).join(', ')})`);
console.log(fails.length
  ? `\nFAIL: ${fails.join('; ')}`
  : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C reachable, era gates hold, words match effects, life cards tagged');
process.exit(fails.length ? 1 : 0);
