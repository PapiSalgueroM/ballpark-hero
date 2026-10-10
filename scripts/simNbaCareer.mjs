/* Round 57 playtest harness for NBA My Career, deepened in Round 918.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 5 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNbaCareer.mjs [careers]

   Round 918 added life deck C (nbaCareerLifeC.ts, 36 cards) and three
   sections that measure it:

   C1  The deck is reachable. Over the fleet at least 34 of the 36 cards are
       drawn. The fleet now walks the rotation the way the board does (draft
       night role, a camp battle every season) because four of the cards are
       for a second unit player, and one career in four starts in the 2003-04
       era so the era gates are exercised.
       Measured again after the review fixes (the national TV card now needs
       an All-NBA or MVP year in the last three, deck A's send down card is
       modern only), 400 careers, default seed and SIM_SEED 1 to 6: 36 of 36
       on every run, and the rarest card was drawn 4, 3, 2, 4, 6, 2, 4 times
       (a card gets about one draw per hundred offseasons it is eligible in,
       and the narrowest gate, a rookie year card, is eligible 400 times). So
       one card missing a fleet is rare and three missing is not a thing that
       happens; the floor of 34 is the brief's and leaves two. Nothing
       asserts on the rarest card. Average peak with the deck 85.8 to 86.3
       over those seven runs.
   C1e The era gates hold. A modern only card (G League assignment, the two
       way deal, the national TV rest rule, the awards games line, the shot
       chart meeting, and deck A's send down card) is never offered or drawn
       in a 2003-04 career, and neither send down card is offered or drawn
       after a player's third season (three years of service or less). The
       gate is read every offseason, not only on a draw: a draw of the send
       down card is too rare for a slip to show (giving deck A back its five
       seasons was 0 leaks in a 400 career fleet when only draws were read).
       Exact, no band.
   C2  The words are the effect. Every card, 2,000 draws on saves the fleet
       found eligible for it: the line the player reads is parsed back and
       compared with what the save did, nothing outside the stats a card may
       move is touched (the contract above all), and the chip on the button
       names one of the outcomes that happened, both ways of a gamble seen.
       Half the draws give the save headroom first, so a clamp cannot hide a
       number in the line; the other half run on the save exactly as the
       fleet left it (health 100, a rating at its ceiling), which is where a
       chip written from the card alone would promise a stat that cannot
       move. A trade must land on a team of the career's own era, named with
       that era's label. Exact, no band: one mismatch is a failure.
   T   Every life card drawn, in decks A, B and C, carries its category and
       cooldown tags (the table the summer step list reads).
   R1  The rivalry beats whose words need two teams, 318 (the two of you
       guarding each other) and 320 (your team tried to trade for him), are
       never rolled while the rival is on your own team. The rival is
       drafted onto the player's team and keeps it, so this is the common
       case, not an edge: before 318's gate was fixed it was 211 of 248
       rolls, and 320 without its team check was 95 of 104. Exact, no
       band. Each beat must also still be rolled at least once, so the check
       cannot pass by the beat going quiet. Measured, 400 careers, default
       seed and SIM_SEED 1 to 6: beat 318 rolled 40, 37, 33, 22, 39, 28, 24
       times and beat 320 rolled 9, 14, 14, 14, 21, 17, 16 times, far from 0.
       The same runs checked 282, 333, 632, 489, 451, 373, 208 trades in
       2003-04 careers for the C2 era wall, whose floor is also one.
   R2  The six Round 918 rivalry beats (318 to 323): every number in the
       consequence line is what apply moves, and "the rivalry heats up" is
       said exactly when the rivalry meter rises. Exact, no band.

   Negative controls, SIM_NBA_CONTROL=<name>, each asserts the thing it
   mutates exists and each must turn the run red:
     nodeck       empties the catalog                     -> C1 red
     eraleak      drops the era gate on one card          -> C1e red
     eraleaka     drops the era from deck A's send down   -> C1e red
     serviceleak  gives deck A's send down five seasons   -> C1e red
     wordsbreak   hides a morale change in a card         -> C2 red
     tradepay     cuts the salary on the trade            -> C2 red
     eraleaktrade drops the era from the trade's team list -> C2 red
     chipcap      writes the chips from a save with room  -> C2 red
     notags       strips one deck A card's tags           -> T red
     sameteam     drops the team check from beat 318      -> R1 red
     sameteam320  drops the team check from beat 320      -> R1 red
     beatwords    moves beat 319's morale by -6, words -4 -> R2 red
     tradehome    lets "Demand a trade" pick his own club -> TR red

   Round 1103 added TR: the "Demand a trade" option on the "The fit is broken"
   card drew its new club from the whole league, the club he was asking out of
   included, so about one trade in thirty read "Traded to" the team he was
   already on. 600 trades off 40 unhappy saves in both eras, none may land at
   home. Exact, no band. A league of 29 or 30 clubs puts the old code's
   expected count near 20, so the control cannot pass by luck.
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CONTROL = process.env.SIM_NBA_CONTROL || '';
const CONTROLS = ['', 'nodeck', 'eraleak', 'eraleaka', 'serviceleak', 'wordsbreak', 'tradepay', 'eraleaktrade', 'chipcap', 'notags', 'sameteam', 'sameteam320', 'beatwords', 'tradehome'];
if (!CONTROLS.includes(CONTROL)) {
  console.error(`unknown SIM_NBA_CONTROL "${CONTROL}", expected one of: ${CONTROLS.slice(1).join(', ')}`);
  process.exit(2);
}

/* One bundle per process: two runs side by side never share a temp file. */
const OUT = path.join(os.tmpdir(), `nba-engine-${process.pid}.mjs`);
await build({
  stdin: {
    contents: "export * from './src/lib/nbaMyCareer.ts';\nexport * from './src/lib/nbaCareerLifeC.ts';\n"
      + "export { NBA_RIVALRY_EVENTS } from './src/lib/nbaCareerRivalryEvents.ts';\n"
      + "export { getNbaLifeEventsA } from './src/lib/nbaCareerLifeA.ts';\n",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});

if (CONTROL === 'notags') {
  /* Strip the tags from one deck A card in the bundle. The card is the
     rookie duties one, which every fleet draws. */
  const src = readFileSync(OUT, 'utf8');
  const at = src.indexOf('id: "nbaA_rookie_duties"');
  if (at < 0) throw new Error('control notags: the card id is not in the bundle');
  const tag = 'category: "lockerRoom",';
  const tagAt = src.indexOf(tag, at);
  if (tagAt < 0 || tagAt - at > 200) throw new Error('control notags: the tag is not beside the card id');
  writeFileSync(OUT, src.slice(0, tagAt) + src.slice(tagAt + tag.length));
}
if (CONTROL === 'eraleaktrade') {
  /* The slip deck A already made once: the team list asked for without the
     era, so a 2003-04 trade can land on a franchise that did not exist. */
  /* Round 988: the trade is the shared engine's; the NBA's era reaches it
     through the sport's settings, so that is where the era is dropped. */
  const src = readFileSync(OUT, 'utf8');
  const call = 'teamIds: (c) => nbaEraTeamIds(c.eraId),';
  const n = src.split(call).length - 1;
  if (n !== 1) throw new Error(`control eraleaktrade: expected the trade's team list call once in the bundle, found ${n}`);
  writeFileSync(OUT, src.replace(call, 'teamIds: (c) => nbaEraTeamIds(),'));
}
if (CONTROL === 'tradehome') {
  /* Round 1103: give "Demand a trade" back the whole league, his own club included. */
  const src = readFileSync(OUT, 'utf8');
  const call = 'nbaEraTeamIds(cc.eraId).filter((id) => id !== cc.team)';
  const n = src.split(call).length - 1;
  if (n !== 1) throw new Error(`control tradehome: expected the trade's own club filter once in the bundle, found ${n}`);
  writeFileSync(OUT, src.replace(call, 'nbaEraTeamIds(cc.eraId)'));
}
if (CONTROL === 'eraleaka' || CONTROL === 'serviceleak') {
  /* Deck A's send down card: drop its era check, or give it back the five
     seasons it had before this round. */
  const src = readFileSync(OUT, 'utf8');
  const at = src.indexOf('id: "nbaA_gleague_stint"');
  if (at < 0) throw new Error(`control ${CONTROL}: the card id is not in the bundle`);
  const gateAt = src.lastIndexOf('if (', at);
  const gate = src.slice(gateAt, at);
  const was = CONTROL === 'eraleaka' ? /\s*&&\s*nbaEraById\(\w+\.eraId\)\.id === "now"/ : /(\w+) <= 3 &&/;
  if (gateAt < 0 || at - gateAt > 200 || !was.test(gate)) throw new Error(`control ${CONTROL}: the gate before the card is not the one expected: ${gate}`);
  const now = CONTROL === 'eraleaka' ? gate.replace(was, '') : gate.replace(was, '$1 <= 5 &&');
  writeFileSync(OUT, src.slice(0, gateAt) + now + src.slice(at));
}

const eng = await import(pathToFileURL(OUT).href);
const {
  NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, drawNbaEvent, nbaShouldRetire,
  nbaLegacyOf, nbaCareerTotals, nbaRollTeamQuality, nbaMarketSalary,
  NBA_SPEND_ITEMS, buyNbaItem, nbaAssignRole, nbaCampBattle,
  NBA_LIFE_C, buildNbaLifeCCard, nbaEraTeamIds, nbaTeamLabelOf, NBA_RIVALRY_EVENTS, getNbaLifeEventsA, nbaEventDeck,
} = eng;
if (!Array.isArray(NBA_RIVALRY_EVENTS) || !nbaEraTeamIds || !nbaTeamLabelOf || !getNbaLifeEventsA) throw new Error('the bundle is missing the rivalry table or the era team helpers');
unlinkSync(OUT);

const CAREERS = Number(process.argv[2] || 400);
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const DECK_C = 36;
const DECK_C_FLOOR = 34;
const DRAWS_PER_CARD = 2000;
/* The cards whose story did not exist in the 2003-04 era. Listed here by
   hand, on purpose: the harness must not learn the gate from the file it is
   checking. */
const MODERN_ONLY = [
  'nbaC_rule_g_league', 'nbaC_rule_two_way_kid', 'nbaC_rule_national_tv',
  'nbaC_rule_award_games', 'nbaC_sg_shot_diet',
  /* Deck A's send down card: assignment began in 2005-06 and then only in a
     player's first two seasons, which a 2003-04 career has already played. */
  'nbaA_gleague_stint',
];
/* The two send down cards, held to the modern rule of three years of
   service or less. */
const SEND_DOWN = ['nbaC_rule_g_league', 'nbaA_gleague_stint'];

if (NBA_LIFE_C.length !== DECK_C) throw new Error(`deck C is ${NBA_LIFE_C.length} cards, the harness expects ${DECK_C}`);
const defOf = id => {
  const d = NBA_LIFE_C.find(x => x.id === id);
  if (!d) throw new Error(`control ${CONTROL}: card ${id} is not in the catalog`);
  return d;
};
if (CONTROL === 'nodeck') {
  NBA_LIFE_C.splice(0, NBA_LIFE_C.length);
}
if (CONTROL === 'eraleak') {
  const d = defOf('nbaC_rule_g_league');
  d.when = c => c.seasons.length >= 1 && c.seasons.length <= 3 && c.ovr <= 78;
}
if (CONTROL === 'wordsbreak') {
  const o = defOf('nbaC_rookie_wall').options[0];
  if (typeof o.say !== 'string') throw new Error('control wordsbreak: option 0 of nbaC_rookie_wall is not a plain line');
  const line = o.say;
  o.say = c => { c.morale += 3; return line; };
}
if (CONTROL === 'tradepay') {
  const o = defOf('nbaC_rule_salary_match').options[0];
  if (o.move !== 'trade' || typeof o.say !== 'string') throw new Error('control tradepay: option 0 of nbaC_rule_salary_match is not the plain trade');
  const line = o.say;
  o.say = c => { c.salary = Math.round(c.salary * 0.8 * 10) / 10; return line; };
}
const beatOf = id => {
  const b = NBA_RIVALRY_EVENTS.find(x => x.id === id);
  if (!b) throw new Error(`rivalry beat ${id} is not in the NBA table`);
  return b;
};
if (CONTROL === 'sameteam') {
  const b = beatOf(318);
  if (!/r\.team\s*!==\s*s\.team/.test(String(b.when))) throw new Error('control sameteam: beat 318 has no team check to drop');
  b.when = (s, r) => !r.retired && r.pos === s.pos;
}
if (CONTROL === 'sameteam320') {
  const b = beatOf(320);
  if (!/r\.team\s*!==\s*s\.team/.test(String(b.when))) throw new Error('control sameteam320: beat 320 has no team check to drop');
  b.when = (s, r) => !r.retired && r.ovr >= 82;
}
if (CONTROL === 'beatwords') {
  const b = beatOf(319);
  if (b.consequence !== 'Morale -4, Fanbase +2') throw new Error(`control beatwords: beat 319 says "${b.consequence}"`);
  const was = b.apply;
  b.apply = (s, r) => { was(s, r); s.morale = Math.max(0, s.morale - 2); };
}

/* ------------------------------ the fleet ------------------------------ */

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];
/* Round 918 */
const cFired = new Map();        // deck C id -> times drawn
const cEligible = new Map();     // deck C id -> offseasons it was eligible in
const eraLeaks = [];             // modern only cards drawn in a 2003-04 career
const serviceLeaks = [];         // a send down card after three seasons
const untagged = new Set();      // life card ids drawn without their tags
const pools = new Map();         // deck C id -> saves the fleet found eligible
let benchSeasons = 0, eraCareers = 0, lifeDraws = 0;
/* R1: the beats whose words need the rival on another team. Listed by
   hand, like MODERN_ONLY. */
const TWO_TEAM_BEATS = [318, 320];
const beatRolls = Object.fromEntries(TWO_TEAM_BEATS.map(id => [id, 0]));
const beatSameTeam = Object.fromEntries(TWO_TEAM_BEATS.map(id => [id, 0]));
let r2Save = null;                           // R2: one fleet save with a rival
const POOL_CAP = 40;
const clone = x => JSON.parse(JSON.stringify(x));

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = NBA_ARCHETYPES[pos][i % NBA_ARCHETYPES[pos].length];
    /* One career in four starts in the 2003-04 era. */
    const eraId = i % 4 === 3 ? 'y2004' : undefined;
    if (eraId) eraCareers++;
    let c = startNbaCareer(`Sim ${i}`, pos, arch, Math.random, null, eraId);
    /* The board's own order: the rotation is set the night you arrive, and
       every season starts with a camp (NbaMyCareerBoard create and advance). */
    let tq = nbaRollTeamQuality(null, Math.random);
    nbaAssignRole(c, tq, Math.random);
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        nbaCampBattle(c, tq, Math.random);
        if (c.role === 'backup') benchSeasons++;
        const heldBeat = c.pendingRivalryEvent;
        const { line } = simNbaSeason(c, tq, Math.random);
        /* R1: a beat rolled this season, read the moment it is rolled. */
        const beat = c.pendingRivalryEvent;
        if (beat && beat !== heldBeat && TWO_TEAM_BEATS.includes(beat.id)) {
          beatRolls[beat.id]++;
          if (c.rival && c.rival.team === c.team) beatSameTeam[beat.id]++;
        }
        // every position must produce at least one real stat
        const hasStat = [line.ppg, line.rpg, line.apg].some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      nbaProgress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;
      if (!r2Save && c.rival) r2Save = clone(c);

      /* Round 918: keep a few of the saves each deck C card was eligible on,
         for section C2. Reads the gate only, draws nothing. */
      /* C1e at the gate, every offseason: is a send down card offered where
         the rule says it cannot be? Deck A is built on a copy with its own
         rng, so the fleet's stream is untouched. A draw alone is too rare to
         see a slip (one low rated player in his fourth year is a few
         offseasons a fleet). */
      const offered = getNbaLifeEventsA(clone(c), () => 0).map(e => e.id)
        .concat(NBA_LIFE_C.filter(d => d.when(c)).map(d => d.id));
      for (const id of offered) {
        if (eraId === 'y2004' && MODERN_ONLY.includes(id)) eraLeaks.push(`${id} offered in career ${i}, ${c.year}`);
        if (SEND_DOWN.includes(id) && c.seasons.length > 3) serviceLeaks.push(`${id} offered in career ${i} after ${c.seasons.length} seasons`);
      }
      for (const d of NBA_LIFE_C) {
        if (!d.when(c)) continue;
        cEligible.set(d.id, (cEligible.get(d.id) ?? 0) + 1);
        const pool = pools.get(d.id) ?? [];
        if (pool.length < POOL_CAP) { pool.push(clone(c)); pools.set(d.id, pool); }
      }

      // draw and resolve an offseason event
      const ev = drawNbaEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        if (/^nba[ABC]_/.test(ev.id)) {
          lifeDraws++;
          if (typeof ev.category !== 'string' || !ev.category || !(ev.cooldown >= 1)) untagged.add(ev.id);
        }
        if (eraId === 'y2004' && MODERN_ONLY.includes(ev.id)) eraLeaks.push(`${ev.id} in career ${i}, ${c.year}`);
        /* The send down rule's service limit: three years or less. */
        if (SEND_DOWN.includes(ev.id) && c.seasons.length > 3) serviceLeaks.push(`${ev.id} in career ${i} after ${c.seasons.length} seasons`);
        if (ev.id.startsWith('nbaC_')) cFired.set(ev.id, (cFired.get(ev.id) ?? 0) + 1);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }
      tq = nbaRollTeamQuality(tq, Math.random);

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NBA_SPEND_ITEMS) {
          const res = buyNbaItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (nbaShouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = nbaCareerTotals(c);
    const legacy = nbaLegacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(nbaMarketSalary(c))) nanHits++;
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

let c2Draws = 0, c2Bad = 0, c2RealDraws = 0, c2Trades = 0, c2EraTrades = 0, chipcapMoved = 0;
const c2Examples = [];
const c2NoSave = [];
const c2Unseen = [];
const roomy = s => {
  /* Headroom, so a clamp cannot hide a number in the line. */
  const c = clone(s);
  c.morale = 50; c.fanbase = 50; c.health = 60;
  c.ovr = Math.min(c.ovr, 90); c.pot = Math.max(c.pot, c.ovr + 5);
  return c;
};
for (const def of NBA_LIFE_C) {
  const pool = pools.get(def.id) ?? [];
  if (!pool.length) { c2NoSave.push(def.id); continue; }
  /* Per option, which branch chips were matched on draws where the two
     branches read differently. On a save at a limit a gamble's two chips
     can read alike, and then the draw says nothing about which happened. */
  const branchSeen = def.options.map(() => new Set());
  const branchWant = def.options.map(o => ('p' in o ? 2 : 1));
  for (let d = 0; d < DRAWS_PER_CARD; d++) {
    /* Even draws: headroom. Odd draws: the save as the fleet left it. */
    const real = d % 2 === 1;
    const c = real ? clone(pool[d % pool.length]) : roomy(pool[d % pool.length]);
    if (real) c2RealDraws++;
    let ev = buildNbaLifeCCard(def, c);
    if (CONTROL === 'chipcap' && real) {
      /* The chips of a card written from a save with room everywhere, then
         applied to the real one: what the button said before the fix. */
      const loose = buildNbaLifeCCard(def, roomy(c));
      if (loose.options.some((o, j) => o.effect !== ev.options[j].effect)) chipcapMoved++;
      ev = { ...ev, options: ev.options.map((o, j) => ({ ...o, effect: loose.options[j].effect })) };
    }
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
    if (/Traded to /.test(line) !== delta.team) bad.push(delta.team ? 'moved team without saying so' : 'said traded, team unchanged');
    if (delta.team) {
      c2Trades++;
      if (c.eraId === 'y2004') c2EraTrades++;
      if (!nbaEraTeamIds(c.eraId).includes(c.team)) bad.push(`traded to ${c.team}, not a team of the ${c.eraId ?? 'modern'} league`);
      if (!line.includes(`Traded to ${nbaTeamLabelOf(c.team, c.eraId)}`)) bad.push(`the line does not name ${c.team} the way its era does`);
    }
    if (rest(c) !== rest(before)) bad.push('touched a field no card may move');
    const branches = chipBranches(ev.options[k].effect);
    const hit = branches.indexOf(observedChip(delta));
    if (hit < 0) bad.push(`button said "${ev.options[k].effect}", the save did "${observedChip(delta)}"${real ? ' (real save)' : ''}`);
    else if (new Set(branches).size === branches.length) branchSeen[k].add(hit);
    if (bad.length) {
      c2Bad++;
      if (c2Examples.length < 5) c2Examples.push(`${def.id} option ${k}: ${bad.join('; ')} | line: ${line}`);
    }
  }
  branchSeen.forEach((seen, k) => { if (seen.size < branchWant[k]) c2Unseen.push(`${def.id} option ${k}`); });
}

/* ------------- R2: the six new rivalry beats say what they do ------------- */

const R2_IDS = [318, 319, 320, 321, 322, 323];
const R2_STATS = [['Morale', 'morale'], ['Fanbase', 'fanbase'], ['Health', 'health'], ['Rating', 'ovr']];
const r2Bad = [];
const r2Base = r2Save;
if (!r2Base) r2Bad.push('no save to run the beats on');
for (const id of r2Base ? R2_IDS : []) {
  const b = beatOf(id);
  const s = roomy(r2Base);
  s.rivalryIntensity = 30;
  const before = clone(s);
  b.apply(s, clone(s.rival ?? {}));
  const words = String(b.consequence);
  for (const [word, key] of R2_STATS) {
    const said = num(new RegExp(`${word} ([+-]\\d+)`), words);
    if (said !== s[key] - before[key]) r2Bad.push(`${id}: says ${word} ${said}, moved ${s[key] - before[key]}`);
  }
  const heats = /the rivalry heats up/i.test(words);
  if (heats !== ((s.rivalryIntensity ?? 0) > (before.rivalryIntensity ?? 0))) r2Bad.push(`${id}: the rivalry line and the meter disagree`);
  const others = o => { const x = { ...o }; for (const k of ['morale', 'fanbase', 'health', 'ovr', 'rivalryIntensity']) delete x[k]; return JSON.stringify(x); };
  if (others(s) !== others(before)) r2Bad.push(`${id}: moved something its line does not mention`);
}

/* ------------------------------ the report ------------------------------ */

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
const cDistinct = [...cFired.keys()].length;
const cCounts = NBA_LIFE_C.map(d => cFired.get(d.id) ?? 0).sort((a, b) => a - b);
const cMissing = NBA_LIFE_C.filter(d => !cFired.has(d.id)).map(d => d.id);

console.log('\n=== ROUND 57 NBA MY CAREER PLAYTEST ===');
if (CONTROL) console.log(`NEGATIVE CONTROL   : ${CONTROL} (this run is expected to FAIL)`);
console.log(`careers            : ${CAREERS}  (${eraCareers} in the 2003-04 era, ${benchSeasons} second unit seasons)`);
/* ---- TR (Round 1103): "Demand a trade" never lands on the club he asked out of ---- */
let tradeDraws = 0, tradeHome = 0;
for (let i = 0; i < 40; i++) {
  const pos = POSITIONS[i % POSITIONS.length];
  const c = startNbaCareer(`Trade ${i}`, pos, NBA_ARCHETYPES[pos][i % NBA_ARCHETYPES[pos].length], Math.random, null, i % 2 ? 'y2004' : undefined);
  c.morale = 40;                                 // the card's own gate: morale under 55
  const card = nbaEventDeck(c, Math.random).find(e => e.id === 'unhappy');
  if (!card) throw new Error('TR: an unhappy save was not offered the "The fit is broken" card');
  const ask = card.options.find(o => o.label === 'Demand a trade');
  if (!ask) throw new Error('TR: the card has no "Demand a trade" option');
  for (let k = 0; k < 15; k++) {
    const cc = clone(c);
    const from = cc.team;
    ask.apply(cc, Math.random);
    tradeDraws++;
    if (cc.team === from) tradeHome++;
    if (!nbaEraTeamIds(cc.eraId).includes(cc.team)) throw new Error(`TR: traded to ${cc.team}, which is not a club of the career's own era`);
  }
}

console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('nbaA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('nbaB_')).length}/45`);
console.log(`  lifeC fired      : ${cDistinct}/${DECK_C}  (floor ${DECK_C_FLOOR}; rarest card drawn ${cCounts[0] ?? 0} times, median ${cCounts[Math.floor(cCounts.length / 2)] ?? 0})`);
if (cMissing.length) console.log(`    never drawn    : ${cMissing.join(', ')}`);
console.log(`    rarest three   : ${NBA_LIFE_C.map(d => [d.id, cFired.get(d.id) ?? 0]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([id, n]) => `${id} ${n} (eligible in ${cEligible.get(id) ?? 0} offseasons)`).join(', ')}`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('ncorr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NBA_SPEND_ITEMS.length}`);
console.log(`C1e era leaks      : ${eraLeaks.length}  (modern only cards offered or drawn in a 2003-04 career, must be 0)`);
console.log(`C1e service leaks  : ${serviceLeaks.length}  (a send down card offered or drawn after three seasons, must be 0)`);
console.log(`C2 words vs effect : ${c2Draws} draws (${c2RealDraws} on the fleet's own saves), ${c2Bad} mismatches, ${c2Unseen.length} outcomes never seen, ${c2NoSave.length} cards with no eligible save`);
console.log(`   trades checked  : ${c2Trades} (${c2EraTrades} in a 2003-04 career)`);
if (CONTROL === 'chipcap') console.log(`   chipcap         : ${chipcapMoved} draws where the loose chips differed`);
for (const ex of c2Examples) console.log(`    ${ex}`);
for (const id of TWO_TEAM_BEATS) console.log(`R1 beat ${id}        : rolled ${beatRolls[id]} times, ${beatSameTeam[id]} of them with the rival on your own team (must be 0)`);
console.log(`R2 beat words      : ${R2_IDS.length} beats, ${r2Bad.length} mismatches${r2Bad.length ? ` (${r2Bad.slice(0, 3).join('; ')})` : ''}`);
console.log(`T  life cards drawn: ${lifeDraws}, without tags: ${untagged.size}${untagged.size ? ` (${[...untagged].slice(0, 5).join(', ')})` : ''}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  /* Round 1103: a season on the new line also records minutes, steals and blocks. */
  console.log(`  ${p.padEnd(3)} ${best.ppg} ppg, ${best.rpg} rpg, ${best.apg} apg, ${best.spg} spg, ${best.bpg} bpg, ${best.mpg} mpg`);
}
console.log(`TR demand a trade  : ${tradeDraws} trades off the "The fit is broken" card, ${tradeHome} landed on the club he asked out of (must be 0)`);

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NBA_SPEND_ITEMS.length) fails.push(`${NBA_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
if (cDistinct < DECK_C_FLOOR) fails.push(`C1: deck C fired ${cDistinct} of ${DECK_C}, the floor is ${DECK_C_FLOOR}`);
if (eraLeaks.length) fails.push(`C1e: ${eraLeaks.length} modern only cards in the 2003-04 era (${eraLeaks[0]})`);
if (c2Bad) fails.push(`C2: ${c2Bad} draws where the words and the save disagree`);
if (c2Unseen.length) fails.push(`C2: ${c2Unseen.length} promised outcomes never happened (${c2Unseen.slice(0, 3).join(', ')})`);
if (c2NoSave.length) fails.push(`C2: ${c2NoSave.length} cards had no eligible save to check (${c2NoSave.slice(0, 3).join(', ')})`);
if (untagged.size) fails.push(`T: ${untagged.size} life cards drawn without category and cooldown`);
if (!c2EraTrades) fails.push('C2: no 2003-04 trade was checked, so the era wall went untested');
if (CONTROL === 'chipcap' && !chipcapMoved) throw new Error('control chipcap changed no chip, so it proves nothing');
for (const id of TWO_TEAM_BEATS) {
  if (beatSameTeam[id]) fails.push(`R1: beat ${id} rolled ${beatSameTeam[id]} times with the rival on your own team`);
  if (!beatRolls[id]) fails.push(`R1: beat ${id} was never rolled, so its gate went untested`);
}
if (serviceLeaks.length) fails.push(`C1e: ${serviceLeaks.length} send down cards after three seasons (${serviceLeaks[0]})`);
if (r2Bad.length) fails.push(`R2: ${r2Bad.length} rivalry beats whose words and effect disagree`);
if (tradeDraws < 600) fails.push(`TR: only ${tradeDraws} trades were drawn, the check is empty`);
if (tradeHome > 0) fails.push(`TR: ${tradeHome} of ${tradeDraws} demanded trades landed on the club he asked out of`);
console.log(fails.length
  ? `\nFAIL: ${fails.join('; ')}`
  : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C reachable, era gates hold, words match effects, life cards tagged, rivalry beats honest');
process.exit(fails.length ? 1 : 0);
