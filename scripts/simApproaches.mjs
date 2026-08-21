/**
 * Round 168 harness: mid-season approaches obey their own rules.
 *
 * The feature is a drama loop with teeth (a confidence hit, a summer
 * pre-agreement, a public withdrawal), so the things worth proving are the
 * gates: approaches only come when your stock is genuinely hot, only from
 * genuinely bigger clubs, one at a time; committing costs the exact stated
 * confidence and locks the exact club into the season-end offers; a
 * collapse voids the handshake publicly; declining pays its small goodwill;
 * ignored approaches expire; and none of it survives into a new season.
 *
 * Run: node scripts/simApproaches.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/apprEntry.mjs';
const BUNDLE = '/tmp/appr.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  respondApproach, clubDefFor, sortedTable,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Doctor a save so the club is flying: top of the table on a win streak. */
function makeHot(s) {
  const boost = 30;
  s.table = s.table.map(r => r.club === s.clubName
    ? { ...r, pts: r.pts + boost, w: r.w + 10, gf: r.gf + 25 }
    : r);
  s.form = ['W', 'W', 'W', 'W', 'W'];
  return s;
}

function playWeeks(s, n) {
  for (let i = 0; i < n; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. A hot manager gets the call; the suitor is real and bigger ---------- */
console.log('1) The phone rings when you are flying, from a bigger club');
let hotSave = null;
{
  let landed = 0;
  for (let attempt = 0; attempt < 6 && !hotSave; attempt++) {
    let s = playWeeks(startCareer('Everton'), 12);
    s = makeHot(s);
    for (let w = 0; w < 20 && !s.approach; w++) {
      s = playWeeks(s, 1);
      s = makeHot(s);
      if (s.week >= s.calendar.length - 2) break;
    }
    if (s.approach) { hotSave = s; landed = 1; }
  }
  if (!hotSave) fail('a table-topping Everton on a five match win streak never got a single call across six half-seasons');
  else {
    const app = hotSave.approach;
    console.log(`   approach: ${app.club} (${app.leagueName})`);
    if (app.club === hotSave.clubName) fail('my own club approached me');
    const mine = clubDefFor(hotSave.clubName);
    const theirs = clubDefFor(app.club);
    if (theirs.tier >= mine.tier) fail(`${app.club} (tier ${theirs.tier}) is not a step up from ${hotSave.clubName} (tier ${mine.tier})`);
    if (!app.blurb.includes('the board wants:')) fail('the approach blurb carries no named demand');
    if (app.expiresWeek <= app.week) fail('the approach expires before it lands');
  }
  void landed;
}

/* ---------- 2. Commit: the exact cost, the exact promise ---------- */
console.log('2) Shaking hands costs 6 confidence and locks the summer');
if (hotSave) {
  const before = hotSave.boardConfidence;
  const committed = respondApproach(hotSave, true);
  if (committed.approach) fail('the approach survived being answered');
  if (!committed.pendingMove) fail('no pre-agreement after committing');
  else if (committed.pendingMove.club !== hotSave.approach.club) fail('the pre-agreement names the wrong club');
  const drop = before - committed.boardConfidence;
  if (Math.abs(drop - 6) > 0.001 && committed.boardConfidence > 0) fail(`committing cost ${drop} confidence, the design says 6`);
  if (!committed.aiHeadlines[0]?.includes('Done deal for the summer')) fail('the news did not break');

  // Ride the season out and the pre-agreement leads the offers.
  let s = committed;
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  const { state: ended, summary } = finishSeason(s);
  const pre = summary.offers.find(o => o.club === committed.pendingMove.club);
  const collapsed = summary.position - clubDefFor(s.clubName).expectation >= 6;
  if (!collapsed && !pre) fail(`the honored pre-agreement with ${committed.pendingMove.club} is missing from the offers`);
  if (!collapsed && pre && summary.offers[0].club !== pre.club) fail('the pre-agreement does not lead the offers');
  if (!collapsed && pre && !pre.blurb.includes('pre-agreement')) fail('the offer does not say it is the pre-agreement');
  console.log(`   season ended P${summary.position}; pre-agreement ${collapsed ? 'voided by a collapse (legitimate)' : 'led the offers'}`);

  // And nothing follows into season two.
  let s2 = startNextSeason(ended);
  if (s2.approach || s2.pendingMove) fail('the phone calls followed me across the summer');
}

/* ---------- 3. Decline pays goodwill; expiry moves on ---------- */
console.log('3) Turning them down, and letting them go cold');
if (hotSave) {
  const before = hotSave.boardConfidence;
  const declined = respondApproach(hotSave, false);
  if (declined.pendingMove) fail('declining still produced a pre-agreement');
  if (declined.approach) fail('the approach survived a decline');
  const gain = declined.boardConfidence - before;
  if (Math.abs(gain - 2) > 0.001 && declined.boardConfidence < 100) fail(`declining paid ${gain} confidence, the design says 2`);

  // Expiry: shorten the clock and play on. It must clear without a choice.
  let s = { ...hotSave, approach: { ...hotSave.approach, expiresWeek: hotSave.week + 1 } };
  s = playWeeks(s, 3);
  if (s.approach && s.approach.week === hotSave.approach.week) fail('an ignored approach never expired');
  console.log('   declined pays +2, ignored calls go cold on schedule');
}

/* ---------- 4. A cold manager never gets the call ---------- */
console.log('4) Nobody courts a struggler');
{
  let s = playWeeks(startCareer('Everton'), 10);
  // Doctor the save COLD: bottom of the table, dire form.
  s.table = s.table.map(r => r.club === s.clubName ? { ...r, pts: 0, w: 0, d: 0, l: r.w + r.d + r.l, gf: 2, ga: 30 } : r);
  s.form = ['L', 'L', 'L', 'L', 'L'];
  /* The ten setup weeks above run UNDOCTORED, and a genuinely hot Everton
     start can earn a real approach in them (it did, about once in forty
     suite runs). That call belongs to the hot spell, not to the struggler
     this section is about, so clear it before counting. Leaving it in made
     this negative control flaky for the wrong reason. */
  s.approach = null;
  s.pendingMove = null;
  let calls = 0;
  for (let w = 0; w < 18; w++) {
    s = playWeeks(s, 1);
    s.table = s.table.map(r => r.club === s.clubName ? { ...r, pts: 0, w: 0, gf: 2 } : r);
    s.form = ['L', 'L', 'L', 'L', 'L'];
    if (s.approach) { calls++; s.approach = null; }
    if (s.week >= s.calendar.length - 2) break;
  }
  if (calls > 0) fail(`a bottom-of-the-table manager on five straight losses got ${calls} approaches`);
  console.log('   zero approaches across a doctored relegation season');
}

/* ---------- 5. Era saves are courted by era clubs ---------- */
console.log('5) A 2010 manager is courted by 2010 clubs');
{
  let found = null;
  for (let attempt = 0; attempt < 6 && !found; attempt++) {
    let s = playWeeks(startCareer('Blackpool', 'era2010'), 12);
    s = makeHot(s);
    for (let w = 0; w < 20 && !s.approach; w++) {
      s = playWeeks(s, 1);
      s = makeHot(s);
      if (s.week >= s.calendar.length - 2) break;
    }
    if (s.approach) found = s.approach;
  }
  if (!found) fail('a table-topping 2010 Blackpool never got a call across six tries');
  else {
    const eraClubs = new Set((cm.ERA_LEAGUES.era2010 ?? []).flatMap(l => l.clubs));
    if (!eraClubs.has(found.club)) fail(`${found.club} approached a 2010 manager but is not in the 2010 world`);
    console.log(`   2010 approach: ${found.club} (${found.leagueName})`);
  }
}

console.log(failures === 0 ? '\nALL APPROACH CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
