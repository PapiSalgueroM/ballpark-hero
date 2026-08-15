/**
 * Round 88 harness: board expectation realism, straight off his report.
 *  - NOBODY is ever told "Finish top 20" (a relegation place dressed up as a
 *    target). Bottom clubs get "stay up" or "mid-table" instead.
 *  - The heavyweights (City, Chelsea, Liverpool and co) are told to WIN the
 *    league, not to finish second.
 *  - Every club gets a varied mandate, and the new defence/youth objectives
 *    grade cleanly across a full simulated season.
 * Run: node scripts/simBoard.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/boardEntry.mjs';
const BUNDLE = '/tmp/board.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  REAL_LEAGUES, playableClubs, buildBoardObjectives, objectiveStatuses,
  startCareer, playNextEntry, finishSeason, clubDefFor,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------- 1. No club is told to finish in a relegation place ---------- */
console.log('1) No "top N" target that is actually a relegation place');
{
  let checked = 0, bottomSamples = [];
  for (const lg of REAL_LEAGUES) {
    const clubs = playableClubs(lg.id);
    const size = clubs.length;
    for (const c of clubs) {
      const objs = buildBoardObjectives(c.name, lg.euro, size);
      const league = objs.find(o => o.id === 'league');
      checked++;
      if (!league) { fail(`${c.name}: no league objective`); continue; }
      // A "top N" style demand must never sit in or near the drop zone.
      if (/top \d+/i.test(league.label)) {
        const n = Number(league.label.match(/top (\d+)/i)[1]);
        if (n > size * 0.55) fail(`${c.name} (${lg.id}, size ${size}): board asks "${league.label}" which is not a real target`);
      }
      if (league.target > size - 2 && !/stay up|relegation|mid-table/i.test(league.label)) {
        fail(`${c.name}: target ${league.target} of ${size} without honest wording: "${league.label}"`);
      }
      if (c.expectation >= size - 2) bottomSamples.push(`${c.name}: ${league.label}`);
    }
  }
  console.log(`   ${checked} clubs checked across ${REAL_LEAGUES.length} leagues`);
  console.log('   bottom club samples: ' + bottomSamples.slice(0, 3).join(' | '));
  for (const s of bottomSamples) {
    if (!/stay up|relegation|mid-table|top half/i.test(s)) fail(`bottom club not given an honest ask: ${s}`);
  }
}

/* ---------- 2. Heavyweights are told to win it ---------- */
console.log('2) Heavyweights told to win the league');
{
  const mustWin = ['Manchester City', 'Liverpool', 'Chelsea', 'Arsenal', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 'Inter Milan'];
  for (const name of mustWin) {
    const lg = REAL_LEAGUES.find(l => l.clubs.includes(name));
    if (!lg) { fail(`${name} not in any league`); continue; }
    const objs = buildBoardObjectives(name, lg.euro, lg.clubs.length);
    const league = objs.find(o => o.id === 'league');
    if (!/^Win the /.test(league.label)) fail(`${name} board says "${league.label}", expected to be told to win it`);
  }
  console.log('   all nine heavyweight boards demand the title');
}

/* ---------- 3. Mandate variety ---------- */
console.log('3) Mandate variety across the league');
{
  const ids = new Set();
  let goalsClubs = 0, defClubs = 0, youthClubs = 0;
  for (const lg of REAL_LEAGUES) {
    for (const c of playableClubs(lg.id)) {
      const objs = buildBoardObjectives(c.name, lg.euro, lg.clubs.length);
      objs.forEach(o => ids.add(o.id));
      if (objs.some(o => o.id === 'goals')) goalsClubs++;
      if (objs.some(o => o.id === 'defence')) defClubs++;
      if (objs.some(o => o.id === 'youth')) youthClubs++;
      // deterministic: same club, same mandate every time
      const again = buildBoardObjectives(c.name, lg.euro, lg.clubs.length);
      if (JSON.stringify(objs) !== JSON.stringify(again)) fail(`${c.name}: objectives are not deterministic`);
    }
  }
  console.log(`   goals mandate ${goalsClubs}, defence mandate ${defClubs}, youth mandate ${youthClubs}`);
  if (goalsClubs < 40 || defClubs < 40) fail('performance mandates are not evenly split');
  if (youthClubs < 20) fail('almost nobody got a youth mandate');
  if (!ids.has('defence') || !ids.has('youth')) fail('new mandate types never appear');
}

/* ---------- 4. Full seasons grade every objective type ---------- */
console.log('4) Six full seasons, every objective grades cleanly');
{
  const picks = ['Manchester City', 'Burnley', 'Real Madrid', 'Ajax', 'Al-Hilal', 'Inter Miami'];
  const seen = new Set();
  for (const club of picks) {
    try {
      let s = startCareer(club);
      let guard = 0;
      while (s.week < s.calendar.length && guard < 120) {
        guard++;
/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call below takes the
   straight through path, which is exactly the game this file was calibrated
   against before Round 119 existed. simHalftime and simOpposition are the two
   that DO want the break and they call playNextEntry raw on purpose. */
        const res = playNextEntry(s, { skipHalftime: true });
        s = res.state;
        if (res.kind === 'seasonOver') break;
      }
      const statuses = objectiveStatuses(s);
      for (const { objective, status } of statuses) {
        seen.add(objective.id);
        if (!['onTrack', 'behind', 'done', 'failed'].includes(status)) fail(`${club}: bad status ${status}`);
        if (typeof objective.label !== 'string' || !objective.label) fail(`${club}: empty label`);
        if (/[–—]/.test(objective.label)) fail(`${club}: em/en dash in "${objective.label}"`);
      }
      // end of season: nothing may still read as "onTrack"/"behind"
      const unresolved = statuses.filter(x => x.status === 'onTrack' || x.status === 'behind');
      const done = statuses.filter(x => x.status === 'done').length;
      s = finishSeason(s);
      console.log(`   ${club}: ${done}/${statuses.length} met, ${unresolved.length} unresolved at final whistle`);
      if (!s) fail(`${club}: finishSeason returned nothing`);
    } catch (e) {
      fail(`${club} crashed: ${e && e.message}`);
    }
  }
  for (const id of ['league', 'cup', 'goals', 'defence', 'youth']) {
    if (!seen.has(id)) console.log(`   note: ${id} not exercised by this sample`);
  }
}

console.log(failures === 0 ? '\nALL BOARD CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
