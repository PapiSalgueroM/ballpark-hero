/* Reviewer, Round 1223 (runner only): what the market promised before a year out against what it reads after the
 * league has really played that year. hostNextYear reads the old club's tier as it stands TODAY; the year out is a
 * real season, so tiers move. For every fired GM on a ladder of careers at every club of a real NHL league: the
 * state and nextYear today, then one engine season with nobody new in the chair, then the market again with one
 * more year out on the record. Prints the transitions. Asserts nothing: it is a measurement. */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const HEAD = process.cwd().replaceAll('\\', '/');
await import(`${HEAD}/scripts/lib/seedRandom.mjs`);
const lib = f => `'${HEAD}/src/lib/${f}.ts'`;
const ENTRY = '/tmp/probe-open-entry.mjs', BUNDLE = '/tmp/probe-open.cjs';
fs.writeFileSync(ENTRY, `
export * as H from ${lib('gmDeskHost')};
export * as SEAT from ${lib('gmSeat')};
export * as MO from ${lib('managerOffers')};
export * as E from ${lib('nhlFrontOffice')};
export { nhlDeskHost } from ${lib('gmDeskHostNhl')};
export { leagueNames } from ${lib('foNames')};
export { NHL_OPENING_RATINGS } from '${HEAD}/src/data/nhlOpeningRatings.ts';
`);
const esbuild = createRequire(`${HEAD}/`)('esbuild');
await esbuild.build({ entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${HEAD}/src` }, outfile: BUNDLE, logLevel: 'error' });
const { H, SEAT, MO, E, nhlDeskHost, leagueNames, NHL_OPENING_RATINGS } = createRequire(import.meta.url)(BUNDLE);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const USER = 'TOR';
const byGrade = cls => [...cls].sort((a, b) => b.grade - a.grade || a.id.localeCompare(b.id))[0];
function playSeason(lg, rng) {
  for (;;) { E.simNhlRound(lg, USER, rng); E.nhlAiMoves(lg, USER, rng); if (lg.round >= E.NHL_FO_ROUNDS) break; lg.round += 1; }
  const po = E.runNhlFoPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
}
function draftNhl(lg, team, r) {
  const mine = lg.teams[team];
  let cls = E.nhlDraftClass(r, Math.max(24, (E.nhlDraftCapital(mine) ?? 0) + 10), leagueNames(lg));
  let left = 2, picksLeft = E.nhlDraftCapital(mine) ?? 0;
  const aiBatch = () => { cls = E.nhlAiDraftPicks(lg, cls, E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), r).remaining; left -= 1; };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = byGrade(cls);
    if (!E.nhlConsumeDraftPick(mine)) break;
    mine.players.push(E.nhlProspectToPlayer(pr, r, lg.ratingModelVersion));
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    for (let i = nextPicks === 0 ? left : Math.min(1, left); i > 0; i--) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
}
function firedSeat(team, tier, season, grades) {
  let c = SEAT.newGmCareer(team, tier, season - grades.length + 1);
  for (const g of grades) c = SEAT.recordSeatSeason(c, g);
  return { v: 1, career: SEAT.endSeatStint(c, 'fired'), last: season };
}
const G5 = ['title', 'overachieved', 'met', 'missed', 'badly'];
const LADDERS = [];
for (const a of G5) { LADDERS.push([a]); for (const b of G5) { LADDERS.push([a, b]); for (const c of ['missed', 'badly']) LADDERS.push([a, b, c]); } }
for (const tail of [['badly', 'badly', 'badly'], ['missed', 'missed', 'missed', 'missed'], ['badly', 'badly', 'missed', 'missed'], ['met', 'badly', 'badly', 'badly']]) LADDERS.push(tail);
const nameOf = id => id;
const SEEDS = (process.env.PROBE_SEEDS || '1,2,3,4,5,6,7,8').split(',').map(Number);
const T = {};
const bump = k => { T[k] = (T[k] ?? 0) + 1; };
const examples = [];
for (const seed of SEEDS) {
  const rng = mulberry32(seed * 104729 + 7);
  const lg0 = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
  playSeason(lg0, rng);
  const lg1 = JSON.parse(JSON.stringify(lg0));
  draftNhl(lg1, USER, rng); E.nhlOffseason(lg1, rng, USER);
  playSeason(lg1, rng);
  if (lg1.season !== lg0.season + 1) { console.log(`seed ${seed}: the away year did not land one season on`); process.exit(2); }
  const tiers0 = SEAT.leagueTiers(H.hostSeatTeams(nhlDeskHost, lg0, nameOf)), tiers1 = SEAT.leagueTiers(H.hostSeatTeams(nhlDeskHost, lg1, nameOf));
  for (const old of Object.keys(lg0.teams).sort()) for (const grades of LADDERS) {
    const seat0 = firedSeat(old, tiers0.get(old), lg0.season, grades);
    const m0 = H.hostMarket(nhlDeskHost, lg0, seat0, nameOf);
    const before = `${m0.state}/${m0.nextYear}`;
    bump(`today ${before}`);
    if (m0.state === 'closed') continue;
    const seat1 = { ...seat0, career: SEAT.sitOutYear(seat0.career) };
    const m1 = H.hostMarket(nhlDeskHost, lg1, seat1, nameOf);
    const looked = MO.bestTierAvailable(SEAT.careerProfile(seat1.career, tiers1)) !== null;
    bump(`${before} -> after the year: ${m1.state}${looked ? '' : ' (under the floor)'}`);
    if (before === 'quiet/open' && !looked && examples.length < 6) examples.push(`seed ${seed} ${old} ${grades.join(',')}: tier ${tiers0.get(old)} then ${tiers1.get(old)}; said: ${m0.line.split('. ').slice(-2).join('. ')} | a year later: ${m1.line.split('. ').slice(-2).join('. ')}`);
  }
}
for (const k of Object.keys(T).sort()) console.log(`${String(T[k]).padStart(7)}  ${k}`);
for (const e of examples) console.log(`EXAMPLE ${e}`.slice(0, 420));
const open = Object.entries(T).filter(([k]) => k.startsWith('quiet/open ->')).reduce((s, [, n]) => s + n, 0);
const broke = Object.entries(T).filter(([k]) => k.startsWith('quiet/open ->') && k.includes('under the floor')).reduce((s, [, n]) => s + n, 0);
const shutOffers = T['today offers/shut'] ?? 0;
console.log(`probe-open: seeds ${SEEDS.join(',')}; of ${open} quiet markets that said next year is still open, ${broke} were under the floor after the year was really played; ${shutOffers} markets had offers today with next year shut`);
