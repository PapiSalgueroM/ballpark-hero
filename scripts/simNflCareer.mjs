/* Round 56 playtest harness for NFL My Career.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 8 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNflCareer.mjs [careers]

   Round 917: deck C (36 cards) and what changed here with it.
   - The fleet now plays the depth chart the way the board does
     (nflAssignRole on draft day, nflCampBattle before every season) and every
     fifth career is a 2005 throwback. Before this no career in the fleet was
     ever a backup or ever met a pre 2012 league, so those cards could not fire.
   - The default fleet is 400 careers, not 80. Measured 2026-10-02 without the
     depth chart: 80 careers drew 28 of 36 deck C cards and 400 drew 31, the
     five missing all being backup cards. With the depth chart, 400 careers
     drew 36 of 36 on the filename seed and on SIM_SEED 1 to 8, nine runs out
     of nine. The floor is 34, two cards under what every run measured.
   - Deck C's share of offseason draws measured 9 or 10 percent on all nine
     runs. The band is 4 to 16: under it the deck is not really in the draw,
     over it the deck is crowding out the other 115 cards.
   - Backup seasons measured 28 to 31 percent, average peak rating 81.6 to
     82.2 (81.7 on the old fleet before deck C). Printed, not banded: they are
     simDepthChart's and simCareerRealism's to judge.
   - Words against effects, 2,000 draws a card: see the section below.
   - Controls, each of which must turn the run red:
       NFL_CAREER_CONTROL=brokencard   (605 disagreements, one card, measured)
       NFL_CAREER_CONTROL=paycut       (768 disagreements, the restructure card)
       NFL_CAREER_CONTROL=nodeck       (deck C fired 0 of 36)
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* Round 917: NEGATIVE CONTROLS. NFL_CAREER_CONTROL=<name> rewrites one string
   of the source as it is bundled (nothing on disk changes) and the run must
   then FAIL. Each control refuses to run when the string it replaces is not
   in the file, so a green run can never mean "the control did not fire".
     brokencard  one deck C card applies fanbase -4 under a button that says
                 fanbase -3: the words against effects check must go red.
     paycut      the restructure card takes a million off the salary: the
                 "a restructure is not a pay cut" check must go red.
     nodeck      drawEvent stops adding deck C: the coverage check must go red. */
const CONTROL = process.env.NFL_CAREER_CONTROL || '';
const CONTROLS = {
  brokencard: {
    file: 'nflCareerLifeC.ts',
    old: "{ health: 8, fanbase: -3 }, 'You shared the load",
    neu: "{ health: 8, fanbase: -4 }, 'You shared the load",
  },
  paycut: {
    file: 'nflCareerLifeC.ts',
    old: "const s = L(c);\n  const b = {",
    neu: "const s = L(c);\n  if (story.startsWith('You signed, the check cleared')) c.salary = c.salary - 1;\n  const b = {",
  },
  nodeck: {
    file: 'nflMyCareer.ts',
    old: 'deck.push(...getNflLifeEventsC(c, rng));',
    neu: '',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown NFL_CAREER_CONTROL ${CONTROL}`); process.exit(2); }
const controlPlugin = {
  name: 'nfl-career-control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: new RegExp(ctl.file.replace('.', '\\.') + '$') }, args => {
      const src = readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (!src.includes(ctl.old)) throw new Error(`control ${CONTROL}: the string it replaces is not in ${ctl.file}, refusing to run`);
      return { contents: src.replace(ctl.old, ctl.neu), loader: 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `nfl-engine-${process.pid}.mjs`);
await build({
  /* One bundle, two doors: the engine, and deck C's own builder for the
     words against effects check (one module instance, so they agree). */
  stdin: {
    contents: "export * from './src/lib/nflMyCareer.ts';\nexport { getNflLifeEventsC } from './src/lib/nflCareerLifeC.ts';\n",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin],
});
const eng = await import(pathToFileURL(OUT).href);
const {
  ARCHETYPES, startCareer, simSeason, progress, drawEvent, shouldRetire,
  legacyOf, careerTotals, rollTeamQuality, marketSalary,
  NFL_SPEND_ITEMS, buyNflItem, nflAssignRole, nflCampBattle, getNflLifeEventsC,
} = eng;

const CAREERS = Number(process.argv[2] || 400);
/* Round 917: deck C's numbers. See the header for how each was measured. */
const LIFE_C_CARDS = 36;
const LIFE_C_MIN_FIRED = 34;
const LIFE_C_FLEET_FLOOR = 400;
const LIFE_C_SHARE = [0.04, 0.16];
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0, backupSeasons = 0, seasonsPlayed = 0, eventDraws = 0;
const lifeCDraws = new Map();
const peaks = [];

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = ARCHETYPES[pos][i % ARCHETYPES[pos].length];
    /* Round 917: every fifth career is a 2005 throwback, so the cards gated on
       the year a league rule arrived are drawn on both sides of it. */
    let c = startCareer(`Sim ${i}`, pos, arch, Math.random, null, i % 5 === 4 ? 'y2005' : undefined);
    /* Round 917: the depth chart, played the way the board plays it (set on
       draft day, fought for in every camp). Without it no career in this
       fleet was ever a backup and the backup's cards could not be drawn. */
    let tq = rollTeamQuality(null, Math.random);
    nflAssignRole(c, tq, Math.random);
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
        tq = rollTeamQuality(tq, Math.random);
        nflCampBattle(c, tq, Math.random); /* every season starts with a camp */
        if (c.role === 'backup') backupSeasons++;
        const { line } = simSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.passYds, line.rushYds, line.rec, line.tackles, line.sacks, line.picks, line.fgMade]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
        seasonsPlayed++;
      }

      progress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      // draw and resolve an offseason event
      const ev = drawEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        eventDraws++;
        if (ev.id.startsWith('lifeC_')) lifeCDraws.set(ev.id, (lifeCDraws.get(ev.id) ?? 0) + 1);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NFL_SPEND_ITEMS) {
          const res = buyNflItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (shouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = careerTotals(c);
    const legacy = legacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(marketSalary(c))) nanHits++;
    if (totals == null) throw new Error('careerTotals returned null');
  } catch (err) {
    crashes++;
    if (crashes <= 3) console.error(`CAREER ${i} CRASHED:`, err && err.message);
  }
}

/* ── Round 917: WORDS AGAINST EFFECTS, deck C ────────────────────────────────
   Every deck C card is found on a fixture it is eligible for and played
   DRAWS_PER_CARD times, options in turn. Three things are checked on every
   single draw, and one per option:
     - the log line's words (parsed, not trusted) equal what moved on the save;
     - nothing the words cannot name moved: salary, contract years, team,
       position, ceiling, earnings (a restructure is not a pay cut);
     - a plain option's button says exactly what was applied; a "Coin flip:"
       button names every outcome that was seen, and every outcome it names
       was seen.
   The fixture sits mid range (morale 50, health 60, rating 15 under its
   ceiling) so no clamp hides a wrong number; a second pass at the ceilings
   then proves the log still tells the truth when a clamp does bite. */
const DRAWS_PER_CARD = 2000;
const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const FIELDS = ['morale', 'fanbase', 'health', 'rating', 'cash'];
/** "Morale +5, health -2, net worth -0.3M" into { morale: 5, health: -2, cash: -0.3 }. */
function parseWords(text) {
  const out = { morale: 0, fanbase: 0, health: 0, rating: 0, cash: 0 };
  for (const m of text.matchAll(/\b(morale|fanbase|health|rating) ([+-]\d+)\b/gi)) out[m[1].toLowerCase()] += Number(m[2]);
  for (const m of text.matchAll(/\bnet worth ([+-]\d+(?:\.\d+)?)M/gi)) out.cash += Number(m[1]);
  return out;
}
const vecKey = v => FIELDS.map(f => `${f}:${Math.round(v[f] * 10) / 10}`).join('|');
const snapshot = s => ({ morale: s.morale, fanbase: s.fanbase, health: s.health, rating: s.ovr, cash: s.netWorth ?? 0 });
const HELD = ['salary', 'contractYears', 'team', 'pos', 'pot', 'earnings', 'age', 'year'];

function fixtureFor(pos, o) {
  const s = startCareer('Words Check', pos, ARCHETYPES[pos][0], mulberry(7), null, o.eraId);
  const line = { year: o.year - 1, team: s.team, age: o.age - 1, ovr: 75, games: 16, awards: [], teamResult: 'Missed the playoffs', salary: 10 };
  return Object.assign(s, {
    seasons: Array.from({ length: o.yrs }, () => ({ ...line })), role: o.role, age: o.age, year: o.year,
    morale: o.hi ? 99 : 50, fanbase: o.hi ? 99 : 60, health: o.hi ? 79 : 60,
    ovr: o.hi ? 91 : 75, pot: 90, netWorth: 20, salary: 12, contractYears: 3, earnings: 30,
  });
}
const GRID = [];
for (const eraId of [undefined, 'y2005']) for (const year of [2008, 2026]) for (const role of ['starter', 'backup'])
  for (const yrs of [1, 2, 6]) for (const age of [23, 32]) GRID.push({ eraId, year, role, yrs, age });

/* The card list is read off the source with its comments stripped (a guard
   that reads source reads the code, not the prose), so a card added to the
   file and never drawn, or never checked, shows up by name. */
const LIFE_C_SRC = readFileSync('src/lib/nflCareerLifeC.ts', 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LIFE_C_IDS = [...LIFE_C_SRC.matchAll(/id: '(lifeC_[a-z0-9_]+)'/g)].map(m => m[1]);

const wordFails = [];
let wordDraws = 0, wordCards = 0, clampDraws = 0;
for (const id of LIFE_C_IDS) {
  /* every fixture the card is eligible on: an era card is checked in both. */
  const homes = [];
  for (const pos of POSITIONS) for (const g of GRID) {
    if (getNflLifeEventsC(fixtureFor(pos, g), mulberry(1)).some(e => e.id === id)) homes.push({ pos, g });
  }
  if (!homes.length) { wordFails.push(`${id}: no fixture in the grid makes this card eligible, so it was not checked`); continue; }
  wordCards++;
  const card0 = getNflLifeEventsC(fixtureFor(homes[0].pos, homes[0].g), mulberry(1)).find(e => e.id === id);
  const seen = card0.options.map(() => new Set());
  const buttons = card0.options.map(() => new Set());
  const rng = mulberry(917 + wordCards);
  for (let d = 0; d < DRAWS_PER_CARD; d++) {
    const home = homes[d % homes.length];
    const hi = d % 10 === 9; /* one draw in ten at the ceilings */
    const s = fixtureFor(home.pos, { ...home.g, hi });
    const card = getNflLifeEventsC(s, rng).find(e => e.id === id);
    if (!card) { if (!hi) wordFails.push(`${id}: eligible on a fixture and then missing from the deck on the same fixture`); continue; }
    const k = Math.floor(d / homes.length) % card.options.length;
    const before = snapshot(s), held = HELD.map(f => s[f]);
    const log = card.options[k].apply(s, rng);
    const after = snapshot(s);
    const moved = Object.fromEntries(FIELDS.map(f => [f, Math.round((after[f] - before[f]) * 10) / 10]));
    const said = parseWords(log);
    if (vecKey(said) !== vecKey(moved)) wordFails.push(`${id} option ${k + 1}: the log says [${vecKey(said)}] and the save moved [${vecKey(moved)}]`);
    HELD.forEach((f, i) => { if (s[f] !== held[i]) wordFails.push(`${id} option ${k + 1}: ${f} changed from ${held[i]} to ${s[f]}, and no deck C card may touch it`); });
    if (hi) { clampDraws++; continue; }
    wordDraws++;
    seen[k].add(vecKey(moved));
    /* the button on THIS fixture (money is in the era's own scale) */
    const effect = card.options[k].effect;
    buttons[k].add(effect);
    const promised = /^Coin flip: /.test(effect)
      ? effect.replace(/^Coin flip: /, '').split(' or ').map(p => vecKey(parseWords(p)))
      : [vecKey(parseWords(effect))];
    if (!promised.includes(vecKey(moved))) wordFails.push(`${id} option ${k + 1}: the button says "${effect}" and the code applied [${vecKey(moved)}]`);
    if (/^Coin flip: /.test(effect) && promised.length !== 2) wordFails.push(`${id} option ${k + 1}: a coin flip button must name two outcomes, "${effect}"`);
  }
  card0.options.forEach((o, k) => {
    /* A button's words change with the era's money and the year's rule, so
       the count is per distinct button: one outcome each when plain, two
       when it is a coin flip. */
    const flips = [...buttons[k]].filter(b => /^Coin flip: /.test(b)).length;
    const want = (buttons[k].size - flips) + flips * 2;
    if (seen[k].size > want) wordFails.push(`${id} option ${k + 1}: ${buttons[k].size} button wording(s) and ${seen[k].size} different outcomes`);
    if (flips && seen[k].size < 2) wordFails.push(`${id} option ${k + 1}: a coin flip button and only one outcome ever seen`);
  });
}
const wordFailCount = wordFails.length;

unlinkSync(OUT);

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

console.log('\n=== ROUND 56 NFL MY CAREER PLAYTEST ===');
console.log(`careers            : ${CAREERS}`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeB_')).length}/45`);
const lifeCFired = LIFE_C_IDS.filter(id => seenEventIds.has(id)).length;
const lifeCNever = LIFE_C_IDS.filter(id => !seenEventIds.has(id));
const lifeCTotalDraws = [...lifeCDraws.values()].reduce((a, b) => a + b, 0);
console.log(`  lifeC fired      : ${lifeCFired}/${LIFE_C_IDS.length}${lifeCNever.length ? `  (never drawn: ${lifeCNever.join(', ')})` : ''}`);
console.log(`  lifeC share      : ${pct(lifeCTotalDraws, eventDraws)} of offseason draws came from deck C`);
console.log(`  backup seasons   : ${pct(backupSeasons, seasonsPlayed)} of seasons were played as the backup`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('corr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NFL_SPEND_ITEMS.length}`);
console.log(`words vs effects   : ${wordCards}/${LIFE_C_IDS.length} deck C cards checked, ${wordDraws} draws mid range and ${clampDraws} at the ceilings, ${wordFailCount} disagreements`);
const wordKinds = [...new Set(wordFails)];
for (const f of wordKinds.slice(0, 8)) console.log(`  WORDS: ${f}`);
if (wordKinds.length > 8) console.log(`  WORDS: and ${wordKinds.length - 8} more kinds`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.passYds) bits.push(`${best.passYds} pass yds, ${best.passTd} TD, ${best.ints} INT`);
  if (best.rushYds) bits.push(`${best.rushYds} rush yds, ${best.rushTd} TD`);
  if (best.rec) bits.push(`${best.rec} rec, ${best.recYds} yds`);
  if (best.tackles) bits.push(`${best.tackles} tkl`);
  if (best.sacks) bits.push(`${best.sacks} sacks`);
  if (best.picks) bits.push(`${best.picks} INT`);
  if (best.passDef) bits.push(`${best.passDef} PD`);
  if (best.fgMade) bits.push(`${best.fgMade}/${best.fgAtt} FG, long ${best.longFg}`);
  console.log(`  ${p.padEnd(5)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NFL_SPEND_ITEMS.length) fails.push(`${NFL_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
/* Round 917: deck C. */
if (LIFE_C_IDS.length !== LIFE_C_CARDS) fails.push(`deck C holds ${LIFE_C_IDS.length} cards, the round shipped ${LIFE_C_CARDS}`);
if (CAREERS >= LIFE_C_FLEET_FLOOR) {
  if (lifeCFired < LIFE_C_MIN_FIRED) fails.push(`deck C fired ${lifeCFired} of ${LIFE_C_IDS.length}, the floor is ${LIFE_C_MIN_FIRED} (never drawn: ${lifeCNever.join(', ') || 'none'})`);
  const share = lifeCTotalDraws / Math.max(1, eventDraws);
  if (share < LIFE_C_SHARE[0] || share > LIFE_C_SHARE[1]) fails.push(`deck C is ${(share * 100).toFixed(1)}% of offseason draws, outside ${LIFE_C_SHARE[0] * 100} to ${LIFE_C_SHARE[1] * 100}%`);
} else {
  console.log(`\nNOTE: deck C coverage and share are only judged on a fleet of ${LIFE_C_FLEET_FLOOR} careers or more; this run had ${CAREERS}.`);
}
if (wordFailCount) fails.push(`${wordFailCount} deck C words against effects disagreements`);
if (wordCards < LIFE_C_IDS.length) fails.push(`${LIFE_C_IDS.length - wordCards} deck C cards never reached the words check`);
if (CONTROL) console.log(`\nCONTROL ${CONTROL} is on: this run is EXPECTED to fail.`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C drawn and its words true');
process.exit(fails.length ? 1 : 0);
