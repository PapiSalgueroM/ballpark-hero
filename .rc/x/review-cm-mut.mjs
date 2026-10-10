// Reviewer cm, Release AU: one mutation of the source in the RUNNER's checkout, the harnesses that should see it, then the file put back.
//   node .rc/x/review-cm-mut.mjs <name>      (run under #!serial; it never leaves the tree changed)
// Prints one line a harness: its exit code and its last line. The reviewer reads which went red. Exit 0 unless it could not run.
import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';

const BASE = '24f57a98fa44e280f1c848276a27d86e0a3e2745';
const VT = 'node_modules/.bin/vitest run --testTimeout=300000 --hookTimeout=120000';
const TMP = 'export TMPDIR=$(mktemp -d); ';
const MUTATIONS = {
  /* the registry lookup: a new career's lookup ignores the league, so it always meets the first line (the Premier League) */
  registry: {
    file: 'src/lib/clubManagerFixtures.ts',
    from: 'const entry = REAL_LEAGUE_FIXTURES.find(e => e.leagueId === leagueId && e.seasonStartYear === state.startYear);',
    to: 'const entry = REAL_LEAGUE_FIXTURES.find(e => e.seasonStartYear === state.startYear);',
    run: [
      ['leaguefx (the gate list line)', `${TMP}CM_LEAGUE_FIXTURES_EXPECT=10 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=10 CM_LEAGUE_FIXTURES_EXPECT_BOUND=10 node scripts/simCmLeagueFixtures.mjs`],
      ['simCmRealFixtures as the gate list has it (premier, no base)', `${TMP}node scripts/simCmRealFixtures.mjs`],
      ['simCmRealFixtures laliga with the base', `${TMP}TZ=UTC CM_FIXTURE_BASE=${BASE} CM_REAL_FIXTURE_LEAGUE=laliga node scripts/simCmRealFixtures.mjs`],
      ['simCmFixtureFleet with the base', `${TMP}TZ=UTC CM_FIXTURE_BASE=${BASE} node scripts/simCmFixtureFleet.mjs`],
      ['simCmFixtureFleet control prefetch (must now fail to fire, exit 3)', `${TMP}TZ=UTC CM_FIXTURE_BASE=${BASE} CM_FIXTURE_FLEET_CONTROL=prefetch node scripts/simCmFixtureFleet.mjs`],
      ['vitest clubManagerStartWait', `${VT} src/test/clubManagerStartWait.test.tsx`],
      ['simDailyDeals', `${TMP}node scripts/simDailyDeals.mjs`],
    ],
  },
  /* the boot no longer fetches the list a saved career's key names */
  boot: {
    file: 'src/hooks/useClubManager.ts',
    from: 'Promise.all([ensureEraRosters(eraId), ensureRealLeagueFixtures(fixtureKey)]).then(',
    to: 'Promise.all([ensureEraRosters(eraId)]).then(',
    run: [
      ['vitest clubManagerStartWait + clubManagerSave', `${VT} src/test/clubManagerStartWait.test.tsx src/test/clubManagerSave.test.tsx`],
      ['simClubManagerSlots', `${TMP}node scripts/simClubManagerSlots.mjs`],
      ['simClubManagerSave', `${TMP}node scripts/simClubManagerSave.mjs`],
      ['leaguefx', `${TMP}CM_LEAGUE_FIXTURES_EXPECT=10 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=10 CM_LEAGUE_FIXTURES_EXPECT_BOUND=10 node scripts/simCmLeagueFixtures.mjs`],
      ['simCmFixtureFleet with the base', `${TMP}TZ=UTC CM_FIXTURE_BASE=${BASE} node scripts/simCmFixtureFleet.mjs`],
    ],
  },
  /* the own goal's man is looked for on the side that GOT the goal */
  ogman: {
    file: 'src/components/pitch-motion/motion.tsx',
    from: 'const man = ownGoalFigure(mine ? scene.theirs : scene.mine, own);',
    to: 'const man = ownGoalFigure(mine ? scene.mine : scene.theirs, own);',
    run: [
      ['simOwnGoalMotion', `${TMP}node scripts/simOwnGoalMotion.mjs`],
      ['vitest pitchOwnGoal', `${VT} src/test/pitchOwnGoal.test.tsx`],
      ['simLiveSimMotion', `${TMP}node scripts/simLiveSimMotion.mjs`],
      ['simLiveSimCelebration', `${TMP}node scripts/simLiveSimCelebration.mjs`],
    ],
  },
  /* the VAR switch read at the match button: the hook asks for reviews whatever the switch says */
  varplay: {
    file: 'src/hooks/useClubManager.ts',
    from: "const res = playNextEntry(career, { skipHalftime, ...(CM_VAR_LIVE ? { varReviews: true } : {}) });",
    to: 'const res = playNextEntry(career, { skipHalftime, varReviews: true });',
    run: [['vitest clubManagerVarLive', `${VT} src/test/clubManagerVarLive.test.tsx`], ['simCmVarLedger', 'node scripts/simCmVarLedger.mjs']],
  },
  /* the VAR switch read at the fast forward */
  varff: {
    file: 'src/hooks/useClubManager.ts',
    from: 'const run = runSimToWeek(career, targetWeek, CM_VAR_LIVE ? { varReviews: true } : undefined);',
    to: 'const run = runSimToWeek(career, targetWeek, { varReviews: true });',
    run: [['vitest clubManagerVarLive', `${VT} src/test/clubManagerVarLive.test.tsx`]],
  },
  /* the engine reviews a covered modern match whether it was asked to or not */
  kickoff: {
    file: 'src/lib/clubManager.ts',
    from: "...(varReviews && worldYear(state) >= 2026 && !isHistoricEra(state.eraId ?? DEFAULT_ERA_ID)",
    to: "...(worldYear(state) >= 2026 && !isHistoricEra(state.eraId ?? DEFAULT_ERA_ID)",
    run: [
      ['vitest clubManagerVarLive', `${VT} src/test/clubManagerVarLive.test.tsx`],
      ['simDailyDeals', `${TMP}node scripts/simDailyDeals.mjs`],
      ['simCmFixtureFleet with the base', `${TMP}TZ=UTC CM_FIXTURE_BASE=${BASE} node scripts/simCmFixtureFleet.mjs`],
      ['simCmVar', `${TMP}NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simCmVar.mjs`],
      ['simManagerHotSeat', `${TMP}node scripts/simManagerHotSeat.mjs`],
    ],
  },
};
const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.error(`review-cm-mut: unknown mutation ${name}; known: ${Object.keys(MUTATIONS).join(', ')}`); process.exit(2); }
const text = fs.readFileSync(m.file, 'utf8');
const count = text.split(m.from).length - 1;
if (count !== 1) { console.error(`review-cm-mut ${name}: CANNOT RUN, its anchor is in ${m.file} ${count} times, it must be there exactly once`); process.exit(2); }
fs.writeFileSync(m.file, text.replace(m.from, m.to));
const changed = execFileSync('git', ['diff', '--stat', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').pop();
console.log(`review-cm-mut ${name}: applied to ${m.file} (${changed})`);
const rows = [];
try {
  for (const [label, cmd] of m.run) {
    const t0 = Date.now();
    const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 900000 });
    const lines = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split('\n').map(l => l.trim()).filter(Boolean);
    const last = lines.filter(l => !/^Duration|^Start at|^Test Files|^Tests /.test(l)).pop() ?? '';
    const tests = lines.filter(l => /^Test Files|^Tests /.test(l)).join(' | ');
    const firstFail = lines.find(l => /FAIL|AssertionError|✗|×|RED |red for|not the base|went red/.test(l)) ?? '';
    rows.push(`  exit=${r.status ?? `signal ${r.signal}`} ${Math.round((Date.now() - t0) / 1000)}s  ${label} :: ${(tests || last).slice(0, 230)}${firstFail && r.status ? ` :: first: ${firstFail.slice(0, 200)}` : ''}`);
  }
} finally {
  execFileSync('git', ['checkout', '--', 'src', 'scripts']);
}
const left = execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts'], { encoding: 'utf8' }).trim();
for (const row of rows) console.log(row);
const red = rows.filter(r => !r.trimStart().startsWith('exit=0 ')).length;
console.log(`review-cm-mut ${name}: ${red} of ${rows.length} harness lines went red on the mutation; tree restored (${left ? 'STILL DIRTY: ' + left : 'clean'})`);
