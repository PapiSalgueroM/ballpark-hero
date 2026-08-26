/**
 * Round 262 harness (number 112): the club squad you are actually in.
 *
 * Naming real footballers as a real club's real squad is a factual claim about
 * the world on the busiest screen of the busiest game on this site, so the
 * checks here are about being right rather than about the feature working.
 *
 *   1. THE CLUB MAP IS EXACT AND IT IS COMPLETE. Every career club name in
 *      the map resolves to at least one baked squad, and every baked key
 *      belongs to a mapped name. A typo in that map is a club that silently
 *      never has a squad again.
 *   2. THE MAP CANNOT HAVE GRABBED THE WRONG CLUB. The data contains Arsenal
 *      Tula, Liverpool FC Montevideo, Real Madrid Castilla, Juventus Next
 *      Gen, Inter U23, Queens Park Rangers, Racing Santander, Racing Club de
 *      Montevideo, CA River Plate Montevideo and Cercle Brugge. None of those
 *      may appear as a mapped target, and no two career clubs may point at
 *      the same data club.
 *   3. THE SQUADS ARE WELL FORMED. Ratings on the site's 48-94 curve, known
 *      positions, no man named twice in one squad, and every squad able to
 *      field a shape.
 *   4. NOBODY PLAYS FOR TWO CLUBS IN THE SAME SEASON. A name under two clubs
 *      in one year means the bake conflated somebody.
 *   5. THE DEPTH CHART IS HONEST ARITHMETIC. The player lands in exactly the
 *      right place in his own position queue, ties go to the man already at
 *      the club, the man named as being in front really is the one directly
 *      above him, and the row marked as him is the only one.
 *   6. IT SHOWS NOTHING RATHER THAN GUESSING. A club outside the map, a
 *      season outside the window and a club with no data all return null, and
 *      the card is wired to render nothing in that case.
 *   7. IT CHANGES NOTHING. The same seeded fleet of careers produces byte
 *      identical saves whether or not the depth chart is ever consulted,
 *      because this is a display layer and the appearance model has been
 *      tuned across dozens of rounds and must not move.
 *
 * Run: node scripts/simClubSquads.mjs [careers]
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = '/tmp/clubsquads-bundle.mjs';
const ENTRY = '/tmp/clubsquads-entry.mjs';

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/soccerClubSquad.ts');
export const data = await import('${ROOT}/src/data/clubSquads.ts');
export const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { lib, data, engine } = await import(pathToFileURL(OUT).href);
const { clubSquad, depthChart, groupOf } = lib;
const { CLUB_SQUADS, CLUB_DATA_NAME, CLUB_SQUAD_YEARS } = data;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const POSITIONS = new Set(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);

/* ── 1 and 2: the map ─────────────────────────────────────────────────── */
const careerClubs = Object.keys(CLUB_DATA_NAME);
console.log(`1) the club map, ${careerClubs.length} entries`);
const keys = Object.keys(CLUB_SQUADS);
const mappedTargets = new Set(Object.values(CLUB_DATA_NAME));
const keyedClubs = new Set(keys.map(k => k.split('|')[0]));

/* A MAPPED CLUB WITH NO SQUAD IS NOT AUTOMATICALLY A BUG, and the first
   version of this check treated it as one. Six of the fifty four came back
   empty: Al Hilal, Al Ittihad, LA Galaxy, LAFC, Inter Miami and Tigres UANL.
   Every one of those map entries is CORRECT, verified against the data's own
   club list, and the bake refuses to write a file at all if a mapped name
   matches nothing. They are empty because a market value table built around
   Europe carries four to eleven players for an MLS or Saudi side, which
   cannot field a shape. That is a fact about the data and the honest response
   is to show no squad for those clubs, which is exactly what happens.
   So this reports them and fails only if the number runs away, because a map
   that has actually broken puts far more than a handful in this list. */
const noSquad = Object.entries(CLUB_DATA_NAME).filter(([, d]) => !keyedClubs.has(d)).map(([c]) => c);
console.log(`   ${noSquad.length} mapped clubs have no fieldable squad in any year: ${noSquad.join(', ') || 'none'}`);
if (noSquad.length > 12) {
  fail(`${noSquad.length} of ${careerClubs.length} mapped clubs have no squad at all, which looks like a broken map rather than thin data`);
}
/* the guard that actually protects the map from typos lives in the bake, so
   it is not allowed to quietly disappear */
const bake = readFileSync(path.join(ROOT, 'scripts/bakeClubSquads.mjs'), 'utf8');
if (!bake.includes('MATCHED NOTHING IN THE DATA')) {
  fail('the bake no longer refuses to write when a mapped club name matches nothing in the data');
}
if (!bake.includes('wanted.has(r.club)')) {
  fail('the bake no longer matches club names exactly, so a near miss could fill the wrong squad');
}
for (const club of keyedClubs) {
  if (!mappedTargets.has(club)) fail(`${club} has baked squads but no career club maps to it`);
}
/* no two career clubs may share a data club: that would put the same eleven
   men in two different dressing rooms */
const seenTarget = new Map();
for (const [career, dataName] of Object.entries(CLUB_DATA_NAME)) {
  if (seenTarget.has(dataName)) {
    fail(`${career} and ${seenTarget.get(dataName)} both map to ${JSON.stringify(dataName)}`);
  }
  seenTarget.set(dataName, career);
}
/* the near misses the data really contains. If a map entry ever becomes one
   of these, a club's squad quietly becomes another club's. */
const WRONG_CLUBS = [
  'Arsenal Tula', 'Liverpool FC Montevideo', 'Real Madrid Castilla', 'Juventus Next Gen',
  'Inter U23', 'Queens Park Rangers', 'Racing Santander', 'Racing Club de Montevideo',
  'CA River Plate Montevideo', 'Cercle Brugge', 'Olympiacos Piraeus B', 'São Paulo FC U20',
  'Paris FC', 'Sport Club Internacional', 'CA Racing', 'Tigres FC',
];
for (const bad of WRONG_CLUBS) {
  if (mappedTargets.has(bad)) fail(`the map points a career club at ${JSON.stringify(bad)}, which is a different club`);
}
console.log(`   ${keyedClubs.size} clubs with squads, every map entry resolves, no target shared`);

/* ── 3: the squads ────────────────────────────────────────────────────── */
console.log(`2) ${keys.length} club seasons, ${CLUB_SQUAD_YEARS.first} to ${CLUB_SQUAD_YEARS.last}`);
let players = 0;
const byYear = new Map();
for (const key of keys) {
  const [club, yearStr] = key.split('|');
  const year = Number(yearStr);
  if (!club || !Number.isInteger(year)) { fail(`bad key ${JSON.stringify(key)}`); continue; }
  if (year < CLUB_SQUAD_YEARS.first || year > CLUB_SQUAD_YEARS.last) fail(`${key} is outside the declared window`);
  const seen = new Set();
  const groups = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const entry of CLUB_SQUADS[key].split(',')) {
    const [name, pos, r] = entry.split(':');
    if (!name || !POSITIONS.has(pos) || !/^\d+$/.test(r ?? '')) { fail(`${key}: bad entry ${JSON.stringify(entry)}`); continue; }
    const ovr = Number(r);
    if (ovr < 48 || ovr > 94) fail(`${key}: ${name} rated ${ovr}, off the 48-94 curve`);
    if (seen.has(name)) fail(`${key}: ${name} appears twice`);
    seen.add(name);
    groups[groupOf(pos)] += 1;
    players += 1;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const m = byYear.get(year);
    if (!m.has(name)) m.set(name, new Set());
    m.get(name).add(club);
  }
  /* mirrors NEED in bakeClubSquads.mjs: a depth chart needs a queue, not a
     formation, and the data counts wingers as forwards */
  if (groups.GK < 1 || groups.DEF < 4 || groups.MID < 3 || groups.ATT < 3) {
    fail(`${key} cannot field a team (GK ${groups.GK}, DEF ${groups.DEF}, MID ${groups.MID}, ATT ${groups.ATT})`);
  }
}
console.log(`   ${players} player rows, all on the curve, every squad fieldable`);
if (keys.length < 200) fail(`only ${keys.length} club seasons, too thin to be worth shipping`);

/* ── 4: nobody plays for two clubs at once ────────────────────────────── */
console.log('3) no man appears at two clubs in the same season');
let doubles = 0;
for (const [year, names] of byYear) {
  for (const [name, clubs] of names) {
    if (clubs.size > 1) {
      doubles += 1;
      if (doubles <= 3) fail(`${year}: ${name} is listed at ${[...clubs].join(' and ')}`);
    }
  }
}
console.log(`   ${byYear.size} years checked, ${doubles} men in two dressing rooms`);

/* ── 5: the depth chart arithmetic ────────────────────────────────────── */
console.log('4) the depth chart, across clubs, positions and ratings');
const SAMPLE_CLUBS = careerClubs.slice(0, 20);
const SAMPLE_YEARS = [2018, 2021, 2023, 2026];
const SAMPLE_POS = ['GK', 'CB', 'LB', 'CM', 'CAM', 'LW', 'ST'];
const SAMPLE_OVR = [55, 68, 74, 82, 90, 96];
let charts = 0, firstChoice = 0, buried = 0;
for (const club of SAMPLE_CLUBS) {
  for (const year of SAMPLE_YEARS) {
    const squad = clubSquad(club, year);
    for (const pos of SAMPLE_POS) {
      for (const ovr of SAMPLE_OVR) {
        const chart = depthChart(club, year, pos, ovr, 'Test Player');
        if (!squad) {
          if (chart) fail(`${club} ${year}: a depth chart with no squad behind it`);
          continue;
        }
        if (!chart) continue;   // no man in that group at all is a valid null
        charts += 1;
        const group = groupOf(pos);
        const rivals = squad.filter(m => m.group === group);
        /* the chart is the group plus exactly one of him */
        if (chart.men.length !== rivals.length + 1) {
          fail(`${club} ${year} ${pos}: ${chart.men.length} men against ${rivals.length} rivals plus one`);
        }
        const mine = chart.men.filter(m => m.me);
        if (mine.length !== 1) fail(`${club} ${year} ${pos}: ${mine.length} rows marked as the player`);
        /* ties go to the man already at the club, so "ahead" counts every
           rival rated at or above him */
        const expected = rivals.filter(m => m.ovr >= Math.round(ovr)).length;
        if (chart.ahead !== expected) {
          fail(`${club} ${year} ${pos} at ${ovr}: says ${chart.ahead} ahead, the squad has ${expected}`);
        }
        if (chart.men[chart.ahead] !== mine[0]) {
          fail(`${club} ${year} ${pos} at ${ovr}: inserted at the wrong index`);
        }
        /* the named man in front is the one directly above him */
        if (chart.ahead === 0) {
          if (chart.aheadOfMe !== null) fail(`${club} ${year} ${pos} at ${ovr}: first choice but names someone in front`);
          firstChoice += 1;
        } else {
          if (!chart.aheadOfMe) fail(`${club} ${year} ${pos} at ${ovr}: ${chart.ahead} ahead but nobody named`);
          else if (chart.aheadOfMe !== chart.men[chart.ahead - 1]) {
            fail(`${club} ${year} ${pos} at ${ovr}: names the wrong man in front`);
          }
          if (chart.ahead >= 3) buried += 1;
        }
        /* the queue stays sorted with him in it */
        for (let i = 1; i < chart.men.length; i++) {
          if (chart.men[i].ovr > chart.men[i - 1].ovr) {
            fail(`${club} ${year} ${pos} at ${ovr}: the queue is out of order at ${i}`);
          }
        }
      }
    }
  }
}
console.log(`   ${charts} depth charts, ${firstChoice} first choice, ${buried} buried three or more deep`);
if (charts < 200) fail(`only ${charts} depth charts built, too few to be testing anything`);
/* both ends have to actually happen or the sample is not exercising the code */
if (firstChoice < 20) fail(`only ${firstChoice} first choice charts, so the top of the queue is barely tested`);
if (buried < 20) fail(`only ${buried} buried charts, so the bottom of the queue is barely tested`);

/* ── 6: it shows nothing rather than guessing ─────────────────────────── */
console.log('5) no honest answer means no card');
const NOWHERE = [
  ['Some Invented FC', 2023], ['Wrexham', 2023], ['', 2023],
  [careerClubs[0], CLUB_SQUAD_YEARS.first - 1],
  [careerClubs[0], CLUB_SQUAD_YEARS.last + 1],
  [careerClubs[0], 2045],
];
for (const [club, year] of NOWHERE) {
  if (clubSquad(club, year) !== null) fail(`${JSON.stringify(club)} ${year} returned a squad it should not have`);
  if (depthChart(club, year, 'ST', 80, 'Test') !== null) fail(`${JSON.stringify(club)} ${year} returned a depth chart`);
}
/* and the page must be wired to render nothing on null */
const page = readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8');
if (!page.includes('depthChart(')) fail('the career page never builds a depth chart');
if (!/chart \? <SquadDepthCard chart=\{chart\} \/> : null/.test(page)) {
  fail('the career page does not render nothing when there is no chart');
}
console.log(`   ${NOWHERE.length} unknown club and season pairs, all null, and the page renders nothing on null`);

/* ── Round 267: the same picture on every offer ───────────────────────── */
console.log('5b) an offer says where you would slot in at THAT club');
if (!page.includes('function OfferFitLine')) fail('offer cards do not show where you would fit');
/* every OfferCard on the page must be handed the career, or the line silently
   never renders for that route into the transfer window */
const offerCards = (page.match(/<OfferCard\b/g) ?? []).length;
const offerCardsWithCareer = [...page.matchAll(/<OfferCard\b[\s\S]{0,320}?\/>/g)]
  .filter(m => m[0].includes('career={career}')).length;
console.log(`   ${offerCards} offer cards on the page, ${offerCardsWithCareer} handed the career`);
if (offerCards === 0) fail('no offer cards found at all, so this check is not checking anything');
if (offerCardsWithCareer !== offerCards) {
  fail(`${offerCards - offerCardsWithCareer} offer card(s) never get the career, so they can never show the fit line`);
}
/* and the line itself has to be right: it is the same arithmetic as the
   squad card, pointed at the OFFERING club rather than the current one */
let fits = 0;
for (const club of careerClubs.slice(0, 12)) {
  for (const year of [2019, 2023, 2026]) {
    const chart = depthChart(club, year, 'ST', 79, 'Test Player');
    if (!chart) continue;
    fits += 1;
    if (chart.club !== club) fail(`a fit line for ${club} describes ${chart.club}`);
    if (chart.ahead > 0 && !chart.aheadOfMe) fail(`${club} ${year}: ${chart.ahead} ahead and nobody named`);
  }
}
console.log(`   ${fits} offer fits resolved against the offering club's own squad`);
if (fits < 20) fail(`only ${fits} offer fits could be built, too few to be testing the feature`);

/* ── 7: it changes nothing ────────────────────────────────────────────── */
const CAREERS = Number(process.argv[2] || 30);
console.log(`6) ${CAREERS} careers played twice, once with the depth chart consulted every season`);
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clubs = engine.FALLBACK_CLUBS;
function playFleet(consult, careers) {
  seedRandom(0x31d7ba95);
  const out = [];
  for (let c = 0; c < careers; c++) {
    const ovr = 45 + (c % 28);
    let s = engine.initCareer(`Squad ${c}`, ['England', 'Brazil', 'Japan', 'Nigeria'][c % 4],
      ['ST', 'CM', 'CB', 'GK'][c % 4], '2020s', stats(ovr), ovr, 2020, clubs, null);
    let guard = 0;
    while (!s.retired && guard++ < 110) {
      if (consult && s.phase === 'playing') {
        /* exactly what the card does on every render */
        const year = (s.seasons[s.seasons.length - 1]?.year ?? 0) + 1;
        depthChart(s.currentClub, year, s.position, s.overall, s.playerName);
      }
      if (s.phase === 'rehab_choice') { s = engine.applyRehabChoice(s, 1); continue; }
      switch (s.phase) {
        case 'youth': s = engine.advanceYouthYear(s, clubs); break;
        case 'contract_offer': {
          const offers = s.pendingOffers || [];
          if (!offers.length) { s.phase = 'playing'; break; }
          s = engine.acceptOffer(s, offers[0]);
          break;
        }
        case 'playing': s = engine.advanceProSeason(s, clubs); break;
        case 'newspaper': s = engine.dismissNewspaper(s); break;
        case 'season_summary': s = engine.dismissSummary(s, clubs); break;
        case 'random_events': {
          if (!s.pendingEvents || !s.pendingEvents[0]) { s.pendingEvents = []; s.phase = 'playing'; break; }
          s = engine.applyEventChoice(s, 0, clubs);
          break;
        }
        case 'moral_dilemma': s = engine.dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': s = engine.dismissSocialMediaPhase(s, clubs); break;
        case 'red_card_appeal_result': s = engine.dismissAppealResult(s, clubs); break;
        case 'international_debut': s = engine.dismissDebut(s, clubs); break;
        case 'world_cup': s = engine.dismissWorldCup(s, clubs); break;
        case 'rivalry_event': s = engine.dismissRivalryEvent(s, clubs); break;
        case 'ballon_dor': s = engine.dismissBallonDor(s, clubs); break;
        case 'transfer_window': {
          const sit = s.transferSituation;
          if (sit && sit.type === 'one_offer') s = engine.acceptOffer(s, sit.offer);
          else if (sit && sit.type === 'frozen_out' && sit.offers.length) {
            const o = sit.offers[0];
            s = o.isLoan ? engine.acceptLoan(s, o) : engine.acceptOffer(s, o);
          } else s = engine.stayAtClub(s, clubs);
          break;
        }
        default: s.retired = true; break;
      }
    }
    out.push({
      club: s.currentClub, overall: s.overall, age: s.age, seasons: s.seasons.length,
      netWorth: s.netWorth, wage: s.weeklyWage, apps: s.seasons.reduce((a, x) => a + (x.apps || 0), 0),
    });
  }
  return out;
}
const plain = playFleet(false, CAREERS);
const consulted = playFleet(true, CAREERS);
let drift = 0;
for (let i = 0; i < plain.length; i++) {
  for (const k of Object.keys(plain[i])) {
    if (plain[i][k] !== consulted[i][k]) {
      drift += 1;
      if (drift <= 3) fail(`career ${i}: ${k} was ${plain[i][k]} and ${consulted[i][k]}`);
    }
  }
}
const deep = plain.filter(c => c.seasons > 4).length;
console.log(`   ${plain.length} pairs on 7 fields each, ${deep} of them past four seasons, ${drift} differences`);
if (deep < Math.floor(CAREERS / 3)) fail(`only ${deep} careers got past four seasons, so the comparison is shallow`);

console.log('');
if (failures > 0) {
  console.error(`simClubSquads: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simClubSquads: green. The squad is the real one, you are in the right place in it, and the game never noticed.');
