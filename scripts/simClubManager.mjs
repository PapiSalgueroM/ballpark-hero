/**
 * Round 70 harness: headless Club Manager careers across all five real
 * leagues. Bundles the engine with esbuild and drives full seasons the way
 * the page would, asserting the things tsc can't see:
 *  - every one of the 96 clubs starts a valid career (squad, XI, objectives)
 *  - full seasons run to the summary with no crash, NaN or nameless cup
 *  - cup draws only produce real league clubs (the "grilna" class of bug)
 *  - the market is the full baked universe with sane real-value prices
 * Run: node scripts/simClubManager.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cmSimEntry.mjs';
const BUNDLE = '/tmp/cmSim.bundle.mjs';

// Two-stage entry: ES module imports evaluate before the entry's own
// statements, so the localStorage stub must be installed in a wrapper that
// dynamically imports the engine (same trick as the other sim harnesses).
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const cm = (await import(BUNDLE)).engine;
const {
  REAL_LEAGUES, NATIONS, playableClubs, clubPreviewRating, startCareer, playNextEntry,
  finishSeason, startNextSeason, buildMarket, buyPlayer, sellPlayer, objectiveStatuses,
  xiAverageRating, sortedTable, leagueOf, nextFixture,
} = cm;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/* ---------- 1. Static shape ---------- */
console.log('1) Nations and leagues');
if (NATIONS.length !== 5) fail(`expected 5 nations, got ${NATIONS.length}`);
let totalClubs = 0;
for (const n of NATIONS) {
  const clubs = playableClubs(n.leagueId);
  totalClubs += clubs.length;
  const lg = REAL_LEAGUES.find(l => l.id === n.leagueId);
  if (!lg) { fail(`nation ${n.name} points at missing league ${n.leagueId}`); continue; }
  if (clubs.length !== lg.clubs.length) fail(`${lg.name}: ${clubs.length} playable vs ${lg.clubs.length} in league`);
  for (const c of clubs) {
    if (!isNum(c.budget) || c.budget < 5) fail(`${c.name}: bad budget ${c.budget}`);
    if (!isNum(c.expectation) || c.expectation < 1 || c.expectation > lg.clubs.length) fail(`${c.name}: bad expectation ${c.expectation}`);
    if (![1, 2, 3, 4].includes(c.tier)) fail(`${c.name}: bad tier ${c.tier}`);
    const xi = clubPreviewRating(c.name);
    if (!isNum(xi) || xi < 48 || xi > 95) fail(`${c.name}: XI preview ${xi} out of range`);
  }
}
if (totalClubs !== 96) fail(`expected 96 playable clubs, got ${totalClubs}`);
const ordering = [['Real Madrid', 'Real Oviedo'], ['Bayern Munich', 'Heidenheim'], ['PSG', 'Le Havre'], ['Liverpool', 'Burnley']];
for (const [a, b] of ordering) {
  if (!(clubPreviewRating(a) > clubPreviewRating(b))) fail(`${a} (${clubPreviewRating(a)}) not stronger than ${b} (${clubPreviewRating(b)})`);
}

/* ---------- 2. Every club can start ---------- */
console.log('2) startCareer for all 96 clubs');
const allClubNames = REAL_LEAGUES.flatMap(l => l.clubs);
for (const name of allClubNames) {
  const s = startCareer(name);
  if (s.clubName !== name) fail(`${name}: career started as ${s.clubName}`);
  if (s.squad.length < 16) fail(`${name}: squad only ${s.squad.length}`);
  const xi = s.xiIds.filter(Boolean).length;
  if (xi !== 11) fail(`${name}: auto XI picked ${xi}/11`);
  if (!s.boardObjectives || s.boardObjectives.length < 4) fail(`${name}: only ${s.boardObjectives?.length ?? 0} board objectives`);
  const realCount = s.squad.filter(p => !p.isYouth).length;
  if (realCount < 7) fail(`${name}: only ${realCount} real players in squad`);
  const cup = s.cupDraw.R16;
  if (!cup || !leagueOf(name).clubs.includes(cup)) fail(`${name}: cup R16 draw "${cup}" not a league club`);
  for (const p of s.squad) {
    if (!isNum(p.rating) || p.rating < 40 || p.rating > 95) fail(`${name}: ${p.name} rating ${p.rating}`);
    if (p.value !== undefined && (!isNum(p.value) || p.value <= 0)) fail(`${name}: ${p.name} value ${p.value}`);
  }
  const rivalObj = s.boardObjectives.find(o => o.id === 'rival');
  if (rivalObj && !leagueOf(name).clubs.includes(rivalObj.rivalName)) fail(`${name}: rival "${rivalObj.rivalName}" not in league`);
}

/* ---------- 3. Market ---------- */
console.log('3) Transfer market');
{
  const s = startCareer('Sunderland');
  const market = buildMarket(s);
  if (market.length < 1700) fail(`market only ${market.length} players (expected 1700+)`);
  for (const m of market.slice(0, 400)) {
    if (!isNum(m.price) || m.price <= 0 || m.price > 250) fail(`market price ${m.price} for ${m.name}`);
    if (m.value !== undefined && m.price > m.value * 1.3 + 0.5) fail(`${m.name}: price ${m.price} way above value ${m.value}`);
  }
  const affordable = market.find(m => m.price <= s.budget);
  if (!affordable) fail('Sunderland cannot afford anyone at all');
  else {
    const bought = buyPlayer(s, affordable);
    if (!bought) fail('buyPlayer refused an affordable summer signing');
    else {
      if (!bought.squad.some(p => p.name === affordable.name)) fail('bought player not in squad');
      const sellable = bought.squad.filter(p => p.position !== 'GK');
      const sold = sellPlayer(bought, sellable[sellable.length - 1].id);
      if (!sold) fail('sellPlayer refused a legal sale');
      else if (!isNum(sold.budget) || sold.budget < 0) fail(`budget after sale: ${sold.budget}`);
    }
  }
  const top = market[0];
  if (top.rating < 88) fail(`best market player only rated ${top.rating}`);
}

/* ---------- 4. Full seasons ---------- */
console.log('4) Full-season sims');
const SAMPLE = ['Real Madrid', 'Barcelona', 'Girona', 'Sunderland', 'Manchester City', 'Burnley', 'Inter Milan', 'Pisa', 'Bayern Munich', 'St. Pauli', 'PSG', 'Metz', 'Como', 'Union Berlin'];
let cupLabelsSeen = 0;
for (const clubName of SAMPLE) {
  let s = startCareer(clubName);
  const knownNames = new Set([
    ...REAL_LEAGUES.flatMap(l => l.clubs),
    'Benfica', 'Porto', 'Sporting CP', 'Ajax', 'PSV', 'Feyenoord', 'Celtic', 'Rangers',
    'Galatasaray', 'Fenerbahçe', 'Club Brugge', 'RB Salzburg', 'Olympiacos', 'Galacticos XI',
  ]);
  for (let season = 1; season <= 2; season++) {
    let guard = 0;
    for (;;) {
      guard += 1;
      if (guard > 90) { fail(`${clubName}: season ${season} never ended (90 entries)`); break; }
      const res = playNextEntry(s);
      s = res.state;
      if (res.kind === 'seasonOver') break;
      if (res.kind === 'match') {
        const r = res.report;
        if (!r.compLabel || r.compLabel.includes('undefined')) fail(`${clubName}: bad compLabel "${r.compLabel}"`);
        if (r.competition === 'cup') {
          cupLabelsSeen += 1;
          const cupName = leagueOf(clubName).cupName;
          if (!r.compLabel.includes(cupName)) fail(`${clubName}: cup label "${r.compLabel}" missing "${cupName}"`);
        }
        const opp = r.home === s.clubName ? r.away : r.home;
        if (!knownNames.has(opp)) fail(`${clubName}: unknown opponent "${opp}" (grilna class bug)`);
        if (!isNum(r.homeGoals) || !isNum(r.awayGoals)) fail(`${clubName}: NaN scoreline`);
        if (!isNum(s.boardConfidence)) fail(`${clubName}: NaN confidence`);
        if (s.sacked) break;
      }
    }
    if (s.sacked) break;
    const { state: fin, summary } = finishSeason(s);
    s = fin;
    if (!summary.objectives || summary.objectives.length < 4) fail(`${clubName}: summary graded ${summary.objectives?.length ?? 0} objectives`);
    if (!isNum(summary.seasonScore)) fail(`${clubName}: NaN season score`);
    const table = sortedTable(s.table);
    const rounds = 2 * (s.leagueClubs.length - 1);
    for (const row of table) {
      const gp = row.w + row.d + row.l;
      if (gp !== rounds) fail(`${clubName}: ${row.club} played ${gp}/${rounds}`);
    }
    if (season === 1) {
      const offer = summary.offers[0];
      s = startNextSeason(s, offer ? offer.club : undefined);
      if (!s.boardObjectives || s.boardObjectives.length < 4) fail(`${clubName}: next season objectives missing`);
      if (s.squad.length < 16) fail(`${clubName}: next season squad ${s.squad.length}`);
    }
  }
  // live objective statuses never throw and cover every objective
  const st = objectiveStatuses(s);
  if (st.length !== (s.boardObjectives?.length ?? 0)) fail(`${clubName}: statuses ${st.length} vs objectives ${s.boardObjectives?.length}`);
  const avg = xiAverageRating(s);
  if (!isNum(avg) || avg < 45 || avg > 96) fail(`${clubName}: XI avg ${avg}`);
}
if (cupLabelsSeen === 0) fail('no cup matches were played across 14 careers (calendar broken?)');

/* ---------- 5. next fixture preview ---------- */
console.log('5) Fixture preview');
{
  const s = startCareer('Arsenal');
  const fx = nextFixture(s);
  if (fx.kind !== 'match') fail(`Arsenal first fixture kind ${fx.kind}`);
  else {
    if (!fx.compLabel.includes('Premier League')) fail(`first fixture label "${fx.compLabel}"`);
    if (!isNum(fx.oppStrength) || fx.oppStrength < 48 || fx.oppStrength > 96) fail(`opp strength ${fx.oppStrength}`);
  }
}

console.log(failures === 0 ? '\nALL CLUB MANAGER SIMS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
