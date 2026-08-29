/**
 * Round 164 harness: the stats centre can never disagree with the season.
 *
 * The screen shows per-competition splits (league, cup, Europe) next to the
 * season totals the engine has kept since Round 73. The splits are credited
 * at the same code sites at the same moments, so the one failure mode that
 * matters is drift: a goal that lands in the season line but not the bucket,
 * an app counted twice, a rating summed differently. This plays real seasons
 * and reconciles every number both ways, plus the team record derived from
 * the fixture log, the label fallback for old saves, and the summer reset.
 *
 * Run: node scripts/simStatsCentre.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'scEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'sc.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  teamCompRecord, careerLeagueOf, compBucketOf,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

const BUCKETS = ['league', 'cup', 'ucl'];
const compSum = (p, field) => BUCKETS.reduce((n, b) => n + (p.comp?.[b]?.[field] ?? 0), 0);

/* ---------- 1. Splits reconcile with season totals, player by player ---------- */
console.log('1) Every split sums back to the season line');
{
  const s = runSeason(startCareer('Real Madrid'));
  let checked = 0;
  let worstDrift = 0;
  for (const p of s.squad) {
    checked++;
    if (compSum(p, 'apps') !== (p.apps ?? 0)) fail(`${p.name}: bucket apps ${compSum(p, 'apps')} != season ${p.apps}`);
    if (compSum(p, 'goals') !== p.seasonGoals) fail(`${p.name}: bucket goals ${compSum(p, 'goals')} != season ${p.seasonGoals}`);
    if (compSum(p, 'assists') !== p.seasonAssists) fail(`${p.name}: bucket assists ${compSum(p, 'assists')} != season ${p.seasonAssists}`);
    if (compSum(p, 'yellows') !== (p.seasonYellows ?? 0)) fail(`${p.name}: bucket yellows ${compSum(p, 'yellows')} != season ${p.seasonYellows}`);
    if (compSum(p, 'reds') !== (p.seasonReds ?? 0)) fail(`${p.name}: bucket reds ${compSum(p, 'reds')} != season ${p.seasonReds}`);
    /* ratingSum rounds to 0.1 per addition in both books. Both books add
       the identical rating at the identical moment, so measured 2026-08-18
       the worst drift across a full 50 match season was 0.00 exactly. The
       1.0 ceiling is there because a drift of a full point means a missed
       or double counted match, which is the actual bug this guards. */
    const drift = Math.abs(compSum(p, 'ratingSum') - (p.ratingSum ?? 0));
    worstDrift = Math.max(worstDrift, drift);
    if (drift > 1.0) fail(`${p.name}: rating books drifted by ${drift.toFixed(2)}`);
  }
  console.log(`   ${checked} players reconciled, worst rating drift ${worstDrift.toFixed(2)}`);

  // Eleven men get an app every match, in every competition bucket.
  const myMatches = (s.resultLog ?? []).length;
  const totalApps = s.squad.reduce((n, p) => n + (p.apps ?? 0), 0);
  if (totalApps !== myMatches * 11) fail(`${totalApps} total apps across ${myMatches} matches, expected ${myMatches * 11}`);
  for (const b of BUCKETS) {
    const bucketMatches = (s.resultLog ?? []).filter(e => compBucketOf(e.competition) === b).length;
    const bucketApps = s.squad.reduce((n, p) => n + (p.comp?.[b]?.apps ?? 0), 0);
    if (bucketApps !== bucketMatches * 11) fail(`${b}: ${bucketApps} apps for ${bucketMatches} matches`);
  }
  console.log(`   ${myMatches} matches -> ${totalApps} appearances, 11 per match in every bucket`);

  // Averages live where football ratings live.
  for (const p of s.squad) {
    if ((p.apps ?? 0) >= 5) {
      const a = (p.ratingSum ?? 0) / p.apps;
      if (a < 4.5 || a > 10) fail(`${p.name}: average rating ${a.toFixed(2)} is outside the match rating range`);
    }
  }
}

/* ---------- 2. The team record derives cleanly from the fixture log ---------- */
console.log('2) The club record by competition reconciles');
{
  const s = runSeason(startCareer('Real Madrid'));
  const cupName = careerLeagueOf(s).cupName;
  const team = teamCompRecord(s, cupName);
  const log = s.resultLog ?? [];
  if (team.all.p !== log.length) fail(`all.p ${team.all.p} != ${log.length} logged fixtures`);
  if (team.all.p !== team.league.p + team.cup.p + team.ucl.p) fail('the buckets do not sum to the season');
  for (const b of ['all', ...BUCKETS]) {
    const t = team[b];
    if (t.p !== t.w + t.d + t.l) fail(`${b}: P ${t.p} != W+D+L ${t.w + t.d + t.l}`);
  }
  // The typed field agrees with the label the entry has always carried.
  for (const e of log) {
    if (!e.competition) { fail('a fresh entry is missing its typed competition'); break; }
    const typed = compBucketOf(e.competition);
    const fromLabel = e.comp.startsWith('Champions League') ? 'ucl' : e.comp.startsWith(cupName) ? 'cup' : 'league';
    if (typed !== fromLabel) fail(`entry "${e.comp}" types as ${typed} but labels as ${fromLabel}`);
    const [gf, ga] = e.score.split('-').map(n => parseInt(n, 10));
    /* A decisive score must record its own result. A LEVEL score is a draw
       in the league and the group stage, but a knockout tie level after 90
       is settled on penalties, so its res is honestly W or L. This caught a
       real 1-1 cup shootout loss on 2026-08-18 and the "bug" was this
       harness, not the engine. */
    const knockout = e.competition === 'cup' || e.competition === 'uclKo';
    if (gf !== ga) {
      const should = gf > ga ? 'W' : 'L';
      if (should !== e.res) fail(`entry ${e.score} recorded as ${e.res}`);
    } else if (!knockout && e.res !== 'D') {
      fail(`a level ${e.comp} score ${e.score} recorded as ${e.res}`);
    }
  }
  // A season in Europe leaves a European record; the league leaves 30+.
  if (s.uclGroup && team.ucl.p < 6) fail(`in Europe all season but only ${team.ucl.p} UCL fixtures logged`);
  if (team.league.p < 30) fail(`only ${team.league.p} league fixtures logged`);
  console.log(`   ${team.all.p} fixtures: ${team.league.p} league, ${team.cup.p} cup, ${team.ucl.p} Europe`);
}

/* ---------- 3. Old saves: no splits, label-only log, still works ---------- */
console.log('3) An old save grows splits without corrupting totals');
{
  let s = startCareer('Real Madrid');
  for (let i = 0; i < 14; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
  }
  // Strip everything Round 164 added, exactly as a pre-164 save would be.
  s.squad = s.squad.map(p => { const q = { ...p }; delete q.comp; return q; });
  s.resultLog = (s.resultLog ?? []).map(e => { const q = { ...e }; delete q.competition; return q; });
  const seasonGoalsBefore = s.squad.reduce((n, p) => n + p.seasonGoals, 0);
  const appsBefore = s.squad.reduce((n, p) => n + (p.apps ?? 0), 0);
  const playedBefore = (s.resultLog ?? []).length;

  for (let i = 0; i < 6; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
  }
  const playedAfter = (s.resultLog ?? []).length;
  const newMatches = playedAfter - playedBefore;
  if (newMatches < 1) fail('the continuation never played a match');
  // Season totals kept counting from where they were.
  const appsAfter = s.squad.reduce((n, p) => n + (p.apps ?? 0), 0);
  if (appsAfter !== appsBefore + newMatches * 11) fail('season apps went wrong after the strip');
  const goalsAfter = s.squad.reduce((n, p) => n + p.seasonGoals, 0);
  if (goalsAfter < seasonGoalsBefore) fail('season goals went backwards');
  // The splits exist only for the new football, and say so by summing short.
  const splitApps = s.squad.reduce((n, p) => n + compSum(p, 'apps'), 0);
  if (splitApps !== newMatches * 11) fail(`splits hold ${splitApps} apps, expected ${newMatches * 11} (post-update matches only)`);
  // And the team record still buckets the old label-only entries.
  const team = teamCompRecord(s, careerLeagueOf(s).cupName);
  if (team.all.p !== playedAfter) fail('label fallback dropped fixtures from the team record');
  console.log(`   ${playedBefore} stripped fixtures still bucket by label, ${newMatches} new ones carry the type`);
}

/* ---------- 4. Summer wipes the books ---------- */
console.log('4) The splits reset with the season');
{
  let s = runSeason(startCareer('Ajax'));
  s = finishSeason(s).state;
  s = startNextSeason(s);
  for (const p of s.squad) {
    if (compSum(p, 'apps') !== 0 || compSum(p, 'goals') !== 0) { fail(`${p.name} carried splits across the summer`); break; }
  }
  if ((s.resultLog ?? []).length !== 0) fail('the fixture log survived the summer');
  const team = teamCompRecord(s, careerLeagueOf(s).cupName);
  if (team.all.p !== 0) fail('a fresh season already has a team record');
  console.log('   clean books on day one of season two');
}

/* ---------- 5. Copy check ---------- */
console.log('5) Copy check');
{
  const text = fs.readFileSync(path.join(ROOT, 'src/components/club-manager/StatsScreen.tsx'), 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/[–—]/.test(line)) fail(`StatsScreen.tsx:${i + 1} contains an em or en dash`);
  });
  console.log('   StatsScreen.tsx checked');
}

console.log(failures === 0 ? '\nALL STATS CENTRE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
