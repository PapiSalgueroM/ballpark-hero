/* Review probe: who the made up eleven really is. For the first cup tie of
   many careers, the class of the other side's roster, and for every thin
   side found, the eleven shootoutRosterSide and shootoutSides hand to the
   shootout: where the real names kick, what the made up men are rated, and
   the keeper my kicks are read against, before the fix and after. */
import fs from 'node:fs';
import { ROOT, OUT, bundleEngine, withSeed, classOf, fail, done } from './sholib.mjs';

const { cm, eras } = await bundleEngine(ROOT, 'census', null, [['eras', 'src/lib/clubManagerEras.ts']]);

/* 1) the whole projected world today. */
const world = eras.projectedWorld(0);
const tally = { empty: 0, thin: 0, noeleven: 0, full: 0 };
const thinClubs = [];
const noElevenClubs = [];
for (const [club, roster] of Object.entries(world)) {
  const c = classOf(roster);
  tally[c] += 1;
  if (c === 'thin') thinClubs.push(`${club} ${roster.length}${roster.some(p => p.p === 'GK') ? '' : ' (no keeper)'}`);
  if (c === 'noeleven') noElevenClubs.push(`${club} ${roster.length} (${roster.filter(p => p.p === 'GK').length} keepers)`);
}
console.log(`1) projected world, year 0: ${Object.keys(world).length} clubs with a roster: ${JSON.stringify(tally)}`);
console.log(`   thin (1 to 10 names): ${thinClubs.length}: ${thinClubs.slice(0, 60).join('; ')}${thinClubs.length > 60 ? ' ...' : ''}`);
console.log(`   eleven or more names but no eleven: ${noElevenClubs.join('; ') || 'none'}`);

/* 2) first cup ties, by class, over several clubs and seeds. */
const seen = new Map();
const drawTally = { empty: 0, thin: 0, noeleven: 0, full: 0, none: 0 };
const CLUBS = ['Real Madrid', 'Barcelona', 'Getafe', 'Arsenal', 'Burnley', 'Bayern Munich', 'Juventus', 'Paris Saint-Germain', 'Ajax', 'Benfica', 'LA Galaxy'];
for (const club of CLUBS) {
  let ok = 0;
  const mine = { empty: 0, thin: 0, noeleven: 0, full: 0, none: 0 };
  for (let k = 0; k < 40; k++) {
    let s;
    try { s = withSeed(782_001 + k, () => cm.startCareer(club)); } catch { break; }
    ok += 1;
    const round = s.calendar.find(e => e.type === 'cup')?.cupRound;
    const opp = round ? s.cupDraw?.[round] : null;
    if (!opp) { mine.none += 1; drawTally.none += 1; continue; }
    const roster = cm.oppRosterFor(s, opp);
    const c = classOf(roster);
    mine[c] += 1; drawTally[c] += 1;
    if ((c === 'thin' || c === 'noeleven' || c === 'empty') && !seen.has(opp)) seen.set(opp, { state: s, roster, cls: c, from: club });
  }
  console.log(`2) ${club}: ${ok} careers, first cup tie against ${JSON.stringify(mine)}`);
}
console.log(`   all: ${JSON.stringify(drawTally)}`);

/* 3) every thin side met: the eleven that kicks, before and after. */
let thinSeen = 0; let realInFirstFive = 0; let realNamesAll = 0; let realKickLate = 0;
const rows = [];
for (const [opp, { state, roster, cls, from }] of seen) {
  const oppS = cm.strengthOf(state, opp);
  const before = [...roster].sort((a, b) => b.r - a.r).slice(0, 11);
  const after = cm.shootoutRosterSide(roster, oppS);
  const sb = cm.shootoutSides(state, [], [], before, oppS).theirs;
  const sa = cm.shootoutSides(state, [], [], after, oppS).theirs;
  const order = sa.takers.map((t, i) => `${i + 1}:${t.gen ? '*' : ''}${t.name}(${t.rating})`).join(' ');
  const realAt = sa.takers.map((t, i) => (roster.some(p => p.n === t.name) ? i + 1 : 0)).filter(Boolean);
  if (cls === 'thin') {
    thinSeen += 1;
    realNamesAll += roster.length;
    realInFirstFive += realAt.filter(i => i <= 5).length;
    realKickLate += realAt.filter(i => i > 5).length;
    if (sa.takers.length !== 11) fail(`${opp}: the made up side has ${sa.takers.length} takers`);
    if (new Set(sa.takers.map(t => t.name)).size !== 11) fail(`${opp}: the made up side repeats a name`);
    if (sa.keeperRating === null) fail(`${opp}: my kicks are read against nobody`);
    if (!Number.isFinite(oppS) || oppS < 40 || oppS > 99) fail(`${opp}: club strength ${oppS} is not a rating`);
  }
  if (cls === 'noeleven' && JSON.stringify(before) !== JSON.stringify(after)) fail(`${opp}: a roster of eleven or more changed`);
  rows.push({ opp, cls, from, size: roster.length, oppS, keeperBefore: sb.keeperRating, keeperAfter: sa.keeperRating, takersBefore: sb.takers.length, realAt });
  console.log(`3) ${opp} (${cls}, ${roster.length} names: ${roster.map(p => `${p.p} ${p.r}`).join(', ')}; strength ${oppS}; met by ${from})`);
  console.log(`   before: ${sb.takers.length} takers going round, my kicks against keeper ${sb.keeperRating}`);
  console.log(`   after:  ${order}; my kicks against keeper ${sa.keeperRating}`);
}
console.log(`   thin sides met: ${thinSeen}; their ${realNamesAll} real names: ${realInFirstFive} kick inside the first five, ${realKickLate} kick sixth or later`);
fs.writeFileSync(`${OUT}/census.json`, JSON.stringify({ tally, drawTally, rows }, null, 1));
if (!thinSeen) fail('no thin side was met, so nothing was measured');
done('census');
