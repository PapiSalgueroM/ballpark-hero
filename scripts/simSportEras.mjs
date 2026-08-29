/**
 * Rounds 172 and 173 harness: the era starts in all four US sports are
 * sealed worlds.
 *
 * His words: "add eras to nfl and nba and every sport", and the house rule
 * is correct data always. So every era team list was verified against two
 * sources (the 2005 NFL season on Wikipedia and Pro Football Reference;
 * the 2003-04 NBA season on Wikipedia and Basketball Reference; the
 * 2006-07 NHL season on Wikipedia and Hockey Reference; the 2004 MLB
 * season on Wikipedia and Baseball Reference) and this file enforces what
 * the verification promised: an era career is drafted into era franchises
 * only, traded and signed around era franchises only, never meets a
 * franchise that did not exist yet, prints era names even from code that
 * never learned about eras, pays era money at the documented scale, and
 * leaves the modern game byte-for-byte alone.
 *
 * Run: node scripts/simSportEras.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'sportErasEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'sportEras.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nflMyCareer.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlMyCareer.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbMyCareer.ts');
export { nfl, nba, nhl, mlb };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb } = await import(pathToFileURL(BUNDLE).href);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

/* ---------- 1. The 2005 NFL is the 2005 NFL ---------- */
console.log('1) NFL 2005: right league, right names, right year');
{
  const { NFL_TEAMS_2005, NFL_TEAM_NAMES, startCareer, teamLabelOf, marketSalary, NFL_ERAS } = nfl;
  if (NFL_TEAMS_2005.length !== 32) fail(`the 2005 list holds ${NFL_TEAMS_2005.length} teams, 2005 had 32`);
  const eraAbbrs = new Set(NFL_TEAMS_2005.map(t => t.abbr));
  // The verified differences, both directions.
  for (const must of ['OAK', 'SD', 'STL', 'WSH']) {
    if (!eraAbbrs.has(must)) fail(`2005 list is missing ${must}`);
  }
  for (const not of ['LV', 'LAC', 'LA', 'WAS']) {
    if (eraAbbrs.has(not)) fail(`${not} is in the 2005 list but did not exist as that franchise in 2005`);
  }
  if (NFL_TEAMS_2005.find(t => t.abbr === 'OAK')?.label !== 'Oakland Raiders') fail('OAK label wrong');
  if (NFL_TEAMS_2005.find(t => t.abbr === 'SD')?.label !== 'San Diego Chargers') fail('SD label wrong');
  if (NFL_TEAMS_2005.find(t => t.abbr === 'STL')?.label !== 'St. Louis Rams') fail('STL label wrong');
  if (NFL_TEAMS_2005.find(t => t.abbr === 'WSH')?.label !== 'Washington') fail('WSH label wrong');
  // Era-only abbrs stay unique against the modern league.
  const modern = new Set(NFL_TEAM_NAMES.map(t => t.abbr));
  for (const a of ['STL', 'SD', 'OAK', 'WSH']) {
    if (modern.has(a)) fail(`${a} collides with a modern abbr, era labels would be ambiguous`);
  }

  // Drafted into 2005, in 2005, on 2005 money.
  const rng = seeded(7);
  let sawEraOnly = 0;
  for (let i = 0; i < 40; i++) {
    const c = startCareer('Test Player', 'QB', nfl.ARCHETYPES.QB[0], rng, null, 'y2005');
    if (c.year !== 2005) fail(`era career started in ${c.year}`);
    if (!eraAbbrs.has(c.team)) fail(`drafted by ${c.team}, not a 2005 franchise`);
    if (['LV', 'LAC', 'LA'].includes(c.team)) fail('drafted by a franchise from the future');
    if (c.eraId !== 'y2005') fail('era tag missing from the save');
    if (['OAK', 'SD', 'STL', 'WSH'].includes(c.team)) sawEraOnly++;
  }
  if (sawEraOnly === 0) fail('forty drafts never landed on an era-only franchise, the pool looks wrong');
  // Labels resolve even without era context (the life files never pass one).
  if (teamLabelOf('OAK') !== 'Oakland Raiders') fail(`bare teamLabelOf('OAK') prints ${teamLabelOf('OAK')}`);
  if (teamLabelOf('WSH') !== 'Washington') fail(`bare teamLabelOf('WSH') prints ${teamLabelOf('WSH')}`);
  // Money: the era market is the modern market at the documented scale.
  /* Money on a doctored STAR, where the formula is live rather than sitting
     on the rookie floor (a 66 overall rookie floors at the minimum in both
     eras, which proves nothing). */
  const scale = NFL_ERAS.find(e => e.id === 'y2005').moneyScale;
  const vetNow = { ...startCareer('A', 'QB', nfl.ARCHETYPES.QB[0], seeded(9), null), ovr: 90 };
  const vetEra = { ...vetNow, eraId: 'y2005' };
  const mNow = marketSalary(vetNow);
  const mEra = marketSalary(vetEra);
  const ratio = mEra / mNow;
  if (Math.abs(ratio - scale) > 0.05) fail(`era star money is ${(ratio * 100).toFixed(0)} percent of modern, the documented scale is ${(scale * 100).toFixed(0)}`);
  console.log(`   40 era drafts clean, era-only franchises drawn ${sawEraOnly} times, market ${mEra}M vs modern ${mNow}M`);
}

/* ---------- 2. A full 2005 career never leaves 2005's league ---------- */
console.log('2) NFL: twenty seasons of trades and signings stay in-era');
{
  const { startCareer, simSeason, drawEvent, rollTeamQuality, NFL_TEAMS_2005 } = nfl;
  const eraAbbrs = new Set(NFL_TEAMS_2005.map(t => t.abbr));
  const rng = seeded(21);
  let c = startCareer('Era Lifer', 'WR', nfl.ARCHETYPES.WR[0], rng, null, 'y2005');
  let tq = rollTeamQuality(null, rng);
  const teamsSeen = new Set([c.team]);
  for (let season = 0; season < 20 && !c.retired; season++) {
    /* simSeason pushes the line itself (the board relies on that). */
    simSeason(c, tq, rng);
    c.year += 1;
    c.age += 1;
    c.contractYears -= 1;
    // Take the FIRST option of every offseason event, then the second next
    // time, so contract decks exercise both stay and leave paths.
    const ev = drawEvent(c, rng);
    const opt = ev.options[season % ev.options.length] ?? ev.options[0];
    opt.apply(c, rng);
    teamsSeen.add(c.team);
    tq = rollTeamQuality(tq, rng);
  }
  for (const t of teamsSeen) {
    if (!eraAbbrs.has(t)) fail(`a 2005 career passed through ${t}, which is not a 2005 franchise`);
  }
  const lastYear = c.seasons[c.seasons.length - 1]?.year ?? 0;
  if (lastYear < 2010) fail(`twenty seasons only reached ${lastYear}`);
  console.log(`   ${c.seasons.length} seasons, ${teamsSeen.size} franchises visited, all 2005-legal, reached ${lastYear}`);
}

/* ---------- 3. The modern NFL game did not move ---------- */
console.log('3) NFL: no era asked for, no era given');
{
  const { startCareer, NFL_TEAM_NAMES } = nfl;
  const modern = new Set(NFL_TEAM_NAMES.map(t => t.abbr));
  const rng = seeded(3);
  for (let i = 0; i < 30; i++) {
    const c = startCareer('Modern Man', 'RB', nfl.ARCHETYPES.RB[0], rng, null);
    if (c.year !== 2026) fail(`default career started in ${c.year}`);
    if (!modern.has(c.team)) fail(`default career drafted by ${c.team}`);
    if (c.eraId !== undefined) fail('a default career carries an era tag');
    if (['OAK', 'SD', 'STL', 'WSH'].includes(c.team)) fail('a default career was drafted into 2005');
  }
  console.log('   30 modern drafts clean');
}

/* ---------- 4. The 2003-04 NBA is the 2003-04 NBA ---------- */
console.log('4) NBA 2003-04: 29 teams, Sonics in Seattle, no Charlotte yet');
{
  const { NBA_TEAMS_2004, startNbaCareer, nbaTeamLabelOf, nbaMarketSalary, NBA_ERAS, nbaEraTeamIds } = nba;
  if (NBA_TEAMS_2004.length !== 29) fail(`the 2003-04 list holds ${NBA_TEAMS_2004.length} teams, that season had 29`);
  const eraIds = new Set(NBA_TEAMS_2004.map(t => t.id));
  for (const must of ['SEA', 'NJN', 'NOH']) if (!eraIds.has(must)) fail(`2003-04 list is missing ${must}`);
  for (const not of ['OKC', 'BKN', 'NOP', 'CHA']) if (eraIds.has(not)) fail(`${not} is in the 2003-04 list but did not exist then`);
  if (nbaTeamLabelOf('SEA') !== 'Seattle SuperSonics') fail(`SEA prints ${nbaTeamLabelOf('SEA')}`);
  if (nbaTeamLabelOf('NJN') !== 'New Jersey Nets') fail(`NJN prints ${nbaTeamLabelOf('NJN')}`);
  if (nbaTeamLabelOf('NOH') !== 'New Orleans Hornets') fail(`NOH prints ${nbaTeamLabelOf('NOH')}`);

  const rng = seeded(11);
  let sawEraOnly = 0;
  for (let i = 0; i < 40; i++) {
    const c = startNbaCareer('Test Baller', 'PG', nba.NBA_ARCHETYPES.PG[0], rng, null, 'y2004');
    if (c.year !== 2003) fail(`era career started in ${c.year}`);
    if (!eraIds.has(c.team)) fail(`drafted by ${c.team}, not a 2003-04 franchise`);
    if (c.eraId !== 'y2004') fail('era tag missing');
    if (['SEA', 'NJN', 'NOH'].includes(c.team)) sawEraOnly++;
  }
  if (sawEraOnly === 0) fail('forty drafts never landed on Seattle, New Jersey or New Orleans');
  // The modern pool still holds all 30 and no ghosts.
  const modernIds = nbaEraTeamIds();
  if (modernIds.length !== 30) fail(`the modern pool holds ${modernIds.length} teams`);
  if (modernIds.includes('SEA')) fail('the SuperSonics leaked into the modern league');
  // Era money.
  const scale = NBA_ERAS.find(e => e.id === 'y2004').moneyScale;
  const vetNow = { ...startNbaCareer('A', 'PG', nba.NBA_ARCHETYPES.PG[0], seeded(5), null), ovr: 92 };
  const vetEra = { ...vetNow, eraId: 'y2004' };
  const mNow = nbaMarketSalary(vetNow);
  const mEra = nbaMarketSalary(vetEra);
  const ratio = mEra / mNow;
  if (Math.abs(ratio - scale) > 0.05) fail(`era star money is ${(ratio * 100).toFixed(0)} percent of modern, the documented scale is ${(scale * 100).toFixed(0)}`);
  console.log(`   40 era drafts clean, era-only franchises drawn ${sawEraOnly} times, market ${mEra}M vs modern ${mNow}M`);
}

/* ---------- 5. A full 2003 NBA career stays in-era; modern untouched ---------- */
console.log('5) NBA: careers stay sealed on both sides');
{
  const { startNbaCareer, simNbaSeason, drawNbaEvent, NBA_TEAMS_2004, nbaEraTeamIds } = nba;
  const eraIds = new Set(NBA_TEAMS_2004.map(t => t.id));
  const rng = seeded(31);
  let c = startNbaCareer('Era Hooper', 'SF', nba.NBA_ARCHETYPES.SF[0], rng, null, 'y2004');
  const teamsSeen = new Set([c.team]);
  const drawEvt = drawNbaEvent ?? nba.drawEvent;
  for (let season = 0; season < 18 && !c.retired; season++) {
    simNbaSeason(c, 78, rng);
    c.year += 1;
    c.age += 1;
    c.contractYears -= 1;
    if (drawEvt) {
      const ev = drawEvt(c, rng);
      const opt = ev.options[season % ev.options.length] ?? ev.options[0];
      opt.apply(c, rng);
      teamsSeen.add(c.team);
    }
  }
  for (const t of teamsSeen) {
    if (!eraIds.has(t)) fail(`a 2003 career passed through ${t}, not a 2003-04 franchise`);
  }
  // Modern draws stay modern.
  const rng2 = seeded(4);
  for (let i = 0; i < 30; i++) {
    const c2 = startNbaCareer('Modern Hooper', 'C', nba.NBA_ARCHETYPES.C[0], rng2, null);
    if (c2.year !== 2026) fail(`default NBA career started in ${c2.year}`);
    if (!nbaEraTeamIds().includes(c2.team)) fail(`default career drafted by ${c2.team}`);
    if (['SEA', 'NJN', 'NOH'].includes(c2.team)) fail('a modern career was drafted into 2003');
  }
  console.log(`   era career visited ${teamsSeen.size} franchises, all 2003-legal; 30 modern drafts clean`);
}

/* ---------- 6. The 2006-07 NHL is the 2006-07 NHL ---------- */
console.log('6) NHL 2006-07: 30 teams, Thrashers in Atlanta, Coyotes in Phoenix');
{
  const { NHL_TEAMS_2006, startNhlCareer, nhlTeamLabelOf, nhlMarketSalary, NHL_ERAS, nhlEraTeamIds } = nhl;
  if (NHL_TEAMS_2006.length !== 30) fail(`the 2006-07 list holds ${NHL_TEAMS_2006.length} teams, that season had 30`);
  const eraIds = new Set(NHL_TEAMS_2006.map(t => t.id));
  // The verified differences, both directions.
  for (const must of ['ATL', 'PHX']) if (!eraIds.has(must)) fail(`2006-07 list is missing ${must}`);
  for (const not of ['VGK', 'SEA', 'WPG', 'UTA']) if (eraIds.has(not)) fail(`${not} is in the 2006-07 list but did not exist then`);
  if (nhlTeamLabelOf('ATL') !== 'Atlanta Thrashers') fail(`ATL prints ${nhlTeamLabelOf('ATL')}`);
  if (nhlTeamLabelOf('PHX') !== 'Phoenix Coyotes') fail(`PHX prints ${nhlTeamLabelOf('PHX')}`);
  // Anaheim had renamed by 2006-07; the era list must NOT carry the older name.
  if (NHL_TEAMS_2006.find(t => t.id === 'ANA')?.name !== 'Ducks') fail('the 2006-07 Anaheim entry is not plain Ducks');

  const rng = seeded(13);
  let sawEraOnly = 0;
  for (let i = 0; i < 40; i++) {
    const c = startNhlCareer('Test Skater', 'C', nhl.NHL_ARCHETYPES.C[0], rng, null, 'y2006');
    if (c.year !== 2006) fail(`era career started in ${c.year}`);
    if (!eraIds.has(c.team)) fail(`drafted by ${c.team}, not a 2006-07 franchise`);
    if (c.eraId !== 'y2006') fail('era tag missing');
    if (['ATL', 'PHX'].includes(c.team)) sawEraOnly++;
  }
  if (sawEraOnly === 0) fail('forty drafts never landed on Atlanta or Phoenix');
  // The modern pool still holds all 32 and no ghosts.
  const modernIds = nhlEraTeamIds();
  if (modernIds.length !== 32) fail(`the modern pool holds ${modernIds.length} teams`);
  if (modernIds.includes('PHX')) fail('the Coyotes leaked into the modern league');
  // Era money at the documented scale, on a doctored star (a rookie floors
  // at the minimum in both eras, which proves nothing).
  const scale = NHL_ERAS.find(e => e.id === 'y2006').moneyScale;
  const vetNow = { ...startNhlCareer('A', 'C', nhl.NHL_ARCHETYPES.C[0], seeded(6), null), ovr: 92 };
  const vetEra = { ...vetNow, eraId: 'y2006' };
  const mNow = nhlMarketSalary(vetNow);
  const mEra = nhlMarketSalary(vetEra);
  const ratio = mEra / mNow;
  if (Math.abs(ratio - scale) > 0.05) fail(`era star money is ${(ratio * 100).toFixed(0)} percent of modern, the documented scale is ${(scale * 100).toFixed(0)}`);
  console.log(`   40 era drafts clean, era-only franchises drawn ${sawEraOnly} times, market ${mEra}M vs modern ${mNow}M`);
}

/* ---------- 7. A full 2006 NHL career stays in-era; modern untouched ---------- */
console.log('7) NHL: careers stay sealed on both sides');
{
  const { startNhlCareer, simNhlSeason, drawNhlEvent, NHL_TEAMS_2006, nhlEraTeamIds } = nhl;
  const eraIds = new Set(NHL_TEAMS_2006.map(t => t.id));
  const rng = seeded(41);
  let c = startNhlCareer('Era Skater', 'RW', nhl.NHL_ARCHETYPES.RW[0], rng, null, 'y2006');
  const teamsSeen = new Set([c.team]);
  for (let season = 0; season < 20 && !c.retired; season++) {
    /* simNhlSeason pushes the line itself (the board relies on that). */
    simNhlSeason(c, 78, rng);
    c.year += 1;
    c.age += 1;
    c.contractYears -= 1;
    const ev = drawNhlEvent(c, rng);
    const opt = ev.options[season % ev.options.length] ?? ev.options[0];
    opt.apply(c, rng);
    teamsSeen.add(c.team);
  }
  for (const t of teamsSeen) {
    if (!eraIds.has(t)) fail(`a 2006 career passed through ${t}, not a 2006-07 franchise`);
  }
  const lastYear = c.seasons[c.seasons.length - 1]?.year ?? 0;
  if (lastYear < 2011) fail(`twenty seasons only reached ${lastYear}`);
  // Modern draws stay modern.
  const rng2 = seeded(8);
  for (let i = 0; i < 30; i++) {
    const c2 = startNhlCareer('Modern Skater', 'G', nhl.NHL_ARCHETYPES.G[0], rng2, null);
    if (c2.year !== 2026) fail(`default NHL career started in ${c2.year}`);
    if (!nhlEraTeamIds().includes(c2.team)) fail(`default career drafted by ${c2.team}`);
    if (c2.eraId !== undefined) fail('a default NHL career carries an era tag');
    if (['ATL', 'PHX'].includes(c2.team)) fail('a modern career was drafted into 2006');
  }
  console.log(`   era career visited ${teamsSeen.size} franchises, all 2006-legal, reached ${lastYear}; 30 modern drafts clean`);
}

/* ---------- 8. The 2004 MLB is the 2004 MLB ---------- */
console.log('8) MLB 2004: 30 teams, the Expos last Montreal summer');
{
  const { MLB_TEAMS_2004, startMlbCareer, mlbTeamLabelOf, mlbMarketSalary, MLB_ERAS, mlbEraTeamIds } = mlb;
  if (MLB_TEAMS_2004.length !== 30) fail(`the 2004 list holds ${MLB_TEAMS_2004.length} teams, 2004 had 30`);
  const eraIds = new Set(MLB_TEAMS_2004.map(t => t.id));
  // The verified differences, both directions.
  for (const must of ['MON', 'ANA', 'FLA', 'TBD', 'OAK', 'CLV']) if (!eraIds.has(must)) fail(`2004 list is missing ${must}`);
  for (const not of ['WSN', 'LAA', 'MIA', 'TBR', 'ATH', 'CLE']) if (eraIds.has(not)) fail(`${not} is in the 2004 list but that franchise identity did not exist in 2004`);
  if (mlbTeamLabelOf('MON') !== 'Montreal Expos') fail(`MON prints ${mlbTeamLabelOf('MON')}`);
  if (mlbTeamLabelOf('ANA') !== 'Anaheim Angels') fail(`ANA prints ${mlbTeamLabelOf('ANA')}`);
  if (mlbTeamLabelOf('TBD') !== 'Tampa Bay Devil Rays') fail(`TBD prints ${mlbTeamLabelOf('TBD')}`);
  if (mlbTeamLabelOf('FLA') !== 'Florida Marlins') fail(`FLA prints ${mlbTeamLabelOf('FLA')}`);
  if (mlbTeamLabelOf('OAK') !== 'Oakland Athletics') fail(`OAK prints ${mlbTeamLabelOf('OAK')}`);
  // Era-only ids stay unique against the modern league.
  const modernIds2 = new Set(mlbEraTeamIds());
  for (const a of ['MON', 'ANA', 'FLA', 'TBD', 'OAK', 'CLV']) {
    if (modernIds2.has(a)) fail(`${a} collides with a modern id, era labels would be ambiguous`);
  }

  const rng = seeded(17);
  let sawEraOnly = 0;
  for (let i = 0; i < 40; i++) {
    const c = startMlbCareer('Test Slugger', 'CF', mlb.MLB_ARCHETYPES.CF[0], rng, null, 'y2004');
    if (c.year !== 2004) fail(`era career started in ${c.year}`);
    if (!eraIds.has(c.team)) fail(`drafted by ${c.team}, not a 2004 franchise`);
    if (c.eraId !== 'y2004') fail('era tag missing');
    if (['MON', 'ANA', 'FLA', 'TBD', 'OAK', 'CLV'].includes(c.team)) sawEraOnly++;
  }
  if (sawEraOnly === 0) fail('forty drafts never landed on an era-only franchise, the pool looks wrong');
  // Era money at the documented scale, on a doctored ace.
  const scale = MLB_ERAS.find(e => e.id === 'y2004').moneyScale;
  const vetNow = { ...startMlbCareer('A', 'SP', mlb.MLB_ARCHETYPES.SP[0], seeded(2), null), ovr: 92 };
  const vetEra = { ...vetNow, eraId: 'y2004' };
  const mNow = mlbMarketSalary(vetNow);
  const mEra = mlbMarketSalary(vetEra);
  const ratio = mEra / mNow;
  if (Math.abs(ratio - scale) > 0.05) fail(`era star money is ${(ratio * 100).toFixed(0)} percent of modern, the documented scale is ${(scale * 100).toFixed(0)}`);
  console.log(`   40 era drafts clean, era-only franchises drawn ${sawEraOnly} times, market ${mEra}M vs modern ${mNow}M`);
}

/* ---------- 9. A full 2004 MLB career stays in-era; modern untouched ---------- */
console.log('9) MLB: careers stay sealed on both sides');
{
  const { startMlbCareer, simMlbSeason, drawMlbEvent, MLB_TEAMS_2004, mlbEraTeamIds } = mlb;
  const eraIds = new Set(MLB_TEAMS_2004.map(t => t.id));
  const rng = seeded(23);
  let c = startMlbCareer('Era Slugger', 'SS', mlb.MLB_ARCHETYPES.SS[0], rng, null, 'y2004');
  const teamsSeen = new Set([c.team]);
  for (let season = 0; season < 18 && !c.retired; season++) {
    /* simMlbSeason pushes the line itself (the board relies on that). */
    simMlbSeason(c, 78, rng);
    c.year += 1;
    c.age += 1;
    c.contractYears -= 1;
    const ev = drawMlbEvent(c, rng);
    const opt = ev.options[season % ev.options.length] ?? ev.options[0];
    opt.apply(c, rng);
    teamsSeen.add(c.team);
  }
  for (const t of teamsSeen) {
    /* Yomiuri Giants is the one legal non-franchise stop: the Japan offer
       is a real club that existed in 2004, stored by name not id. */
    if (t === 'Yomiuri Giants') continue;
    if (!eraIds.has(t)) fail(`a 2004 career passed through ${t}, not a 2004 franchise`);
  }
  // Modern draws stay modern.
  const rng2 = seeded(14);
  for (let i = 0; i < 30; i++) {
    const c2 = startMlbCareer('Modern Slugger', '1B', mlb.MLB_ARCHETYPES['1B'][0], rng2, null);
    if (c2.year !== 2026) fail(`default MLB career started in ${c2.year}`);
    if (!mlbEraTeamIds().includes(c2.team)) fail(`default career drafted by ${c2.team}`);
    if (c2.eraId !== undefined) fail('a default MLB career carries an era tag');
    if (['MON', 'ANA', 'FLA', 'TBD', 'OAK', 'CLV'].includes(c2.team)) fail('a modern career was drafted into 2004');
  }
  console.log(`   era career visited ${teamsSeen.size} stops, all 2004-legal; 30 modern drafts clean`);
}

console.log(failures === 0 ? '\nALL SPORT ERA CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
