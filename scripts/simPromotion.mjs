/* Promotion and relegation are real per save, and the world stays whole.

   Round 310. The rules this harness pins:

   1. a summer rollover moves clubs between the paired divisions (PYRAMIDS)
      and writes the new memberships onto the save: sizes preserved, the
      two divisions disjoint, the union exactly the static union (an
      exchange, never a resize), and a promoted club resolves, ranks and
      hears from its board as a member of its NEW league;
   2. the Bundesliga pair trades two, the English pair trades three, both
      mirroring relegationSpots (Germany's playoff spot is not modeled);
   3. the PLAYER goes down like anyone else: the next season is a real
      Championship season (46 rounds, 24 clubs, pruned dugout record, no
      Champions League);
   4. and comes back up like anyone else, except that first place in the
      Championship must NOT walk into the Champions League (the euro guard
      on the prevPos fallback);
   5. ten seasons of yo-yo never corrupt the world: sizes hold, no club is
      ever in two divisions, no name is created or destroyed, and the
      player's club def never goes NaN;
   6. historic era saves and custom club saves are exempt: their
      memberships never move.

   Negative control: SIM_PROMOTION_CONTROL=freeze severs the
   runPromotionRelegation call in a bundled copy and section 1 must fail.

   Run: node scripts/simPromotion.mjs
*/
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_PROMOTION_CONTROL === 'freeze';

const ENTRY = path.join(os.tmpdir(), 'promotion.entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'promotion.bundle.mjs');
let cmPath = `${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts`;
if (CONTROL) {
  const src = fs.readFileSync(cmPath, 'utf8');
  const needle = 'const pr = runPromotionRelegation(career);';
  if (!src.includes(needle)) { console.error('control run: the runPromotionRelegation call to sever is not in the source, refusing a dead control'); process.exit(1); }
  cmPath = path.join(os.tmpdir(), 'clubManager.frozen.ts');
  fs.writeFileSync(cmPath, src.replace(needle, 'const pr = { overrides: career.leagueOverrides ?? null, lines: [] as string[] };'));
}
fs.writeFileSync(ENTRY, `export * as cm from '${cmPath}';\n`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm } = await import(pathToFileURL(BUNDLE).href);

const staticLeague = id => cm.REAL_LEAGUES.find(l => l.id === id);
const effClubs = (state, id) => state.leagueOverrides?.[id] ?? staticLeague(id).clubs;
/* Force a finish without playing a season: everyone else's points climb with
   their row index, my club gets the extreme. Only pts, gd and gf order the
   table, so this is a complete specification of the finish. */
const craftTable = (state, mine, minePts) => {
  state.table = state.table.map((r, i) => ({ ...r, pts: r.club === mine ? minePts : 10 + i }));
};

function sectionOne() {
  console.log('1) one English summer: three up, three down, the world re-ranked');
  const c = cm.startCareer('Everton');
  const n = cm.startNextSeason(c);
  const ov = n.leagueOverrides;
  if (!ov || !ov.premier || !ov.championship) { fail('the rollover wrote no premier/championship overrides'); return; }
  if (ov.premier.length !== 20) fail(`premier membership is ${ov.premier.length} clubs, expected 20`);
  if (ov.championship.length !== 24) fail(`championship membership is ${ov.championship.length} clubs, expected 24`);
  const prem = new Set(ov.premier);
  const champ = new Set(ov.championship);
  for (const club of ov.premier) if (champ.has(club)) fail(`${club} is in both divisions at once`);
  const staticUnion = [...staticLeague('premier').clubs, ...staticLeague('championship').clubs].sort();
  const effUnion = [...ov.premier, ...ov.championship].sort();
  if (JSON.stringify(staticUnion) !== JSON.stringify(effUnion)) fail('the exchange changed WHO exists: the union of the two divisions drifted from the static union');
  const promoted = ov.premier.filter(club => !staticLeague('premier').clubs.includes(club));
  const relegated = ov.championship.filter(club => !staticLeague('championship').clubs.includes(club));
  if (promoted.length !== 3) fail(`${promoted.length} clubs came up, expected exactly 3`);
  if (relegated.length !== 3) fail(`${relegated.length} clubs went down, expected exactly 3`);
  for (const club of promoted) {
    if (cm.leagueOf(club).id !== 'premier') fail(`promoted ${club} still resolves to ${cm.leagueOf(club).id}`);
  }
  for (const club of relegated) {
    if (cm.leagueOf(club).id !== 'championship') fail(`relegated ${club} still resolves to ${cm.leagueOf(club).id}`);
  }
  /* The weakest promoted club must be ranked inside its NEW league: bottom
     half of 20, and a board that talks about survival, not about Europe. */
  const weakest = promoted
    .map(club => ({ club, def: cm.clubDefFor(club) }))
    .sort((a, b) => b.def.expectation - a.def.expectation)[0];
  if (weakest) {
    if (weakest.def.expectation < 12) fail(`promoted ${weakest.club} ranks ${weakest.def.expectation} in the premier, the re-rank did not happen`);
    const label = cm.boardWantLabel(weakest.club);
    if (label !== 'Stay up. Avoid relegation') fail(`promoted ${weakest.club}'s board says "${label}", expected the survival brief`);
  }
  if (!n.aiHeadlines.some(l => l.includes('win promotion to the Premier League'))) fail('no promotion headline in the summer feed');
  if (!n.aiHeadlines.some(l => l.includes('are relegated to the EFL Championship'))) fail('no relegation headline in the summer feed');
  console.log(`   up: ${promoted.join(', ')}; down: ${relegated.join(', ')}; weakest newcomer ranked ${weakest?.def.expectation}`);
}

sectionOne();

if (!CONTROL) {

console.log('2) one German summer: two up, two down, sizes 18 and 18');
{
  const c = cm.startCareer('Bayern Munich');
  const n = cm.startNextSeason(c);
  const ov = n.leagueOverrides;
  if (!ov || !ov.bundesliga || !ov.bundesliga2) fail('the rollover wrote no Bundesliga overrides');
  else {
    if (ov.bundesliga.length !== 18) fail(`Bundesliga is ${ov.bundesliga.length} clubs, expected 18`);
    if (ov.bundesliga2.length !== 18) fail(`2. Bundesliga is ${ov.bundesliga2.length} clubs, expected 18`);
    const top = new Set(ov.bundesliga);
    for (const club of ov.bundesliga2) if (top.has(club)) fail(`${club} is in both German divisions at once`);
    const up = ov.bundesliga.filter(club => !staticLeague('bundesliga').clubs.includes(club));
    const down = ov.bundesliga2.filter(club => !staticLeague('bundesliga2').clubs.includes(club));
    if (up.length !== 2) fail(`${up.length} German clubs came up, expected exactly 2 (no playoff spot)`);
    if (down.length !== 2) fail(`${down.length} German clubs went down, expected exactly 2`);
    /* The player is German here, so England is the OTHER pyramid and must
       arrive as one summary line, not six. */
    if (!n.aiHeadlines.some(l => l.includes('Premier League:') && l.includes('come up') && l.includes('go down'))) {
      fail('the other pyramid did not get its one line summary');
    }
    console.log(`   up: ${up.join(', ')}; down: ${down.join(', ')}; England summarized in one line`);
  }
}

console.log('3) the player goes down: a real Championship season follows');
let relegatedSave = null;
{
  const c = cm.startCareer('Everton');
  craftTable(c, 'Everton', 0);
  const n = cm.startNextSeason(c);
  relegatedSave = n;
  if (cm.careerLeagueOf(n).id !== 'championship') fail(`bottom of the table and next season is ${cm.careerLeagueOf(n).id}, not championship`);
  if (n.leagueClubs.length !== 24) fail(`next season has ${n.leagueClubs.length} league clubs, expected 24`);
  if (!n.leagueClubs.includes('Everton')) fail('the player club is not in its own new division');
  const leagueEntries = n.calendar.filter(e => e.type === 'league').length;
  if (leagueEntries !== cm.leagueRounds(24)) fail(`the calendar holds ${leagueEntries} league rounds, expected ${cm.leagueRounds(24)}`);
  const dugouts = Object.keys(n.managers ?? {});
  if (dugouts.length !== 23) fail(`the manager record holds ${dugouts.length} dugouts, expected 23 (pruned to the new league)`);
  for (const club of dugouts) if (!n.leagueClubs.includes(club)) fail(`the record still holds ${club}, who is not in this division`);
  if (n.uclGroup !== null) fail('a relegated club is somehow in the Champions League group stage');
  if (!n.aiHeadlines.some(l => l.includes('Relegated. Everton go down'))) fail('the player relegation line is missing from the feed');
  else if (!n.aiHeadlines[0].includes('Relegated. Everton go down')) fail('the player relegation line is not FIRST in the feed');
  console.log(`   ${n.leagueClubs.length} clubs, ${leagueEntries} rounds, ${dugouts.length} dugouts, no UCL`);
}

console.log('4) and comes straight back up, without a Champions League place');
{
  const c = relegatedSave;
  craftTable(c, 'Everton', 200);
  if (cm.sortedTable(c.table)[0].club !== 'Everton') { fail('the crafted table did not put the player first, the section is not testing anything'); }
  const n = cm.startNextSeason(c);
  if (cm.careerLeagueOf(n).id !== 'premier') fail(`champions of the second tier and next season is ${cm.careerLeagueOf(n).id}, not premier`);
  const leagueEntries = n.calendar.filter(e => e.type === 'league').length;
  if (leagueEntries !== cm.leagueRounds(20)) fail(`the calendar holds ${leagueEntries} league rounds, expected ${cm.leagueRounds(20)}`);
  /* prevPos is 1 here and pendingSummary is null, which is exactly the
     fallback arm: without the euro guard this would seed a UCL group. */
  if (n.uclGroup !== null) fail('first in the CHAMPIONSHIP walked into the Champions League, the euro guard is dead');
  if (!n.aiHeadlines.some(l => l.includes('You are up: Everton'))) fail('the player promotion line is missing from the feed');
  console.log(`   back in the premier, ${leagueEntries} rounds, and the UCL fallback stayed shut`);
}

console.log('5) ten seasons of yo-yo never corrupt the world');
{
  const staticAll = cm.REAL_LEAGUES.flatMap(l => l.clubs).sort();
  let c = cm.startCareer('Everton');
  for (let s = 0; s < 10; s++) {
    const inPrem = cm.careerLeagueOf(c).id === 'premier';
    craftTable(c, 'Everton', inPrem ? 0 : 200);
    c = cm.startNextSeason(c);
    const ov = c.leagueOverrides ?? {};
    if ((ov.premier ?? []).length !== 20) fail(`season ${s + 2}: premier is ${(ov.premier ?? []).length} clubs`);
    if ((ov.championship ?? []).length !== 24) fail(`season ${s + 2}: championship is ${(ov.championship ?? []).length} clubs`);
    const prem = new Set(ov.premier ?? []);
    for (const club of ov.championship ?? []) if (prem.has(club)) fail(`season ${s + 2}: ${club} is in both divisions`);
    const effAll = cm.REAL_LEAGUES.flatMap(l => effClubs(c, l.id)).sort();
    if (JSON.stringify(effAll) !== JSON.stringify(staticAll)) fail(`season ${s + 2}: the effective world holds ${effAll.length} names against the static ${staticAll.length}, clubs were created or destroyed`);
    const def = cm.clubDefFor('Everton');
    if (!Number.isFinite(def.budget)) fail(`season ${s + 2}: the player's club def budget is ${def.budget}`);
    const expect = inPrem ? 'championship' : 'premier';
    if (cm.careerLeagueOf(c).id !== expect) fail(`season ${s + 2}: the yo-yo stalled, expected ${expect}, got ${cm.careerLeagueOf(c).id}`);
  }
  console.log(`   10 rollovers, ${staticAll.length} club names intact every summer, budgets finite throughout`);
}

console.log('6) historic eras and custom clubs are exempt');
{
  const era = cm.startCareer('Arsenal', 'era2010');
  const eraNext = cm.startNextSeason(era);
  if (eraNext.leagueOverrides !== undefined) fail('a historic era save grew league overrides');
  const custom = cm.startCareer('Real Anthony', 'now', {
    name: 'Real Anthony', stadium: 'Salguero Park',
    crest: { shape: 0, pattern: 2, color1: '#7c3aed', color2: '#f8fafc', initials: 'RA' },
    budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
  });
  const customNext = cm.startNextSeason(custom);
  if (customNext.leagueOverrides !== undefined) fail('a custom club save grew league overrides, the v1 exemption is gone');
  console.log('   era2010 rollover: no overrides; custom club rollover: no overrides');
}

} /* end !CONTROL */

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: freezing the rollover changed NOTHING, the checks are dead');
  process.exit(1);
}
console.log('   teeth: memberships diffed against the static defs, the union conserved by name, the board and the calendar read off the moved world, not the tables that moved it');
if (failures > 0) { console.error(`\nsimPromotion: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimPromotion: all green');
