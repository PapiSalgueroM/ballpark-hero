/* Daily lock edges harness: the side doors of the daily lock stay shut.

   Round 645 part three fix. scripts/simDailyReload.mjs proves the daily lock
   on the path a player walks straight through (finish, refresh, replay). The
   review of Round 645 part three walked the side doors and found them open
   behind a green fence: a chain given up while its guess was out being
   verified (recorded 0, shown 100), a late verdict writing onto whatever
   chain was there, a chain holding one name twice and filing a record its
   own reader refused, the leaderboard form offered twice for one daily, Pack
   Battle's reveal timer outliving a mode toggle, a finished pack its reader
   refused, a stale restore mark swallowing a real finish, hand edited arcade
   and Rarity totals resumed and recorded, the shared Gauntlet board keeping
   no pick of a draft part made, the tackle drill's fouls never filed, and a
   Player Stock Market daily refreshed mid reveal. The fix pass found three
   more on the Daily toggle: a new daily finish landed on a page already on a
   result card is no transition to a recorder whose done flag is the phase,
   so Pack Battle and Rarity Round dropped the daily finish that way, and
   Sports Millionaire will once Round 645 part one drops the mode from its
   done flag.

   The test is src/test/dailyLockEdges.test.tsx, one section per door, each
   tagged [id]. It renders the real pages and hooks with the reload fence's
   mocks (src/test/dailyReload/mocks.ts).

   SECTION 1: the suite, every section present and every test green.

   SECTION 2, NEGATIVE CONTROLS (house rule: prove each check can fail). Each
   takes the fix out of a COPY of one module (or two, for the two chains that
   share a shape), under dist/.daily-lock-control, and points vitest at the
   copy through the DAILY_LOCK_SWAP alias in vitest.config.ts; src is never
   written. A control refuses to run unless each anchor it cuts occurs exactly
   once in its file and occurs in the code with comments stripped, and it
   proves the copy was loaded (the copy prints DAILY_LOCK_SWAP_LOADED). Then
   its own section must go red and every test in every other section must
   stay green, so a red is proved to be the control's.

   Run: node scripts/simDailyLockEdges.mjs
        ONLY=<control> node scripts/simDailyLockEdges.mjs   (one control)
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/dailyLockEdges.test.tsx';
const ONLY = process.env.ONLY || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* vitest lives in this tree's node_modules, or in the main tree's when this
   runs from a worktree nested inside it: walk up, as node's own resolution
   does (scripts/simDailyReload.mjs does the same). */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
const VITEST = findVitest();
if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [VITEST, 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* The sections the suite must carry, one per door. */
const SECTIONS = [
  'giveup-shut', 'giveup-refused', 'late-verdict', 'canonical', 'leaderboard',
  'pack-toggle', 'pack-writer', 'pack-mark', 'rarity-mark', 'rarity-derive',
  'arcade-bound', 'gauntlet-board', 'drill-fouls', 'market-roll',
  'pack-new-finish', 'rarity-new-finish', 'millionaire-new-finish',
  'rarity-unread', 'chain-bound',
];

function parse(out) {
  const tests = [];
  for (const raw of out.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const m = line.match(/^\s*([✓×↓])\s+\S*dailyLockEdges\.test\.tsx > daily lock edges > \[([a-z-]+)\] [^>]+> (.+?)(?:\s+\d+ms)?\s*$/);
    if (m) tests.push({ mark: m[1], section: m[2], name: m[3] });
  }
  const summaryLine = out.match(/Tests\s+(.+)/);
  const summary = summaryLine ? summaryLine[1].trim() : null;
  const passed = summary ? Number((summary.match(/(\d+) passed/) || [0, 0])[1]) : 0;
  const failed = summary ? Number((summary.match(/(\d+) failed/) || [0, 0])[1]) : 0;
  return { named: out.includes('dailyLockEdges.test.tsx'), tests, summary, passed, failed };
}

const detail = out => out.split('\n').filter(l => /AssertionError|Error:|expected/.test(l)).slice(0, 10).map(l => '    ' + l.trim()).join('\n');

/* ------------------------------------------------------------ 1) the suite */
console.log('1) The suite: every side door section present and green');
const baseRun = runVitest({});
const base = parse(baseRun.out);
if (!base.named) abort('vitest did not report on the test file at all, so nothing was checked:\n' + baseRun.out.slice(-2000));
if (baseRun.code !== 0) fail(`vitest exited ${baseRun.code}\n${detail(baseRun.out)}`);
const bySection = new Map(SECTIONS.map(s => [s, base.tests.filter(t => t.section === s)]));
for (const s of SECTIONS) {
  const ts = bySection.get(s);
  const green = ts.length > 0 && ts.every(t => t.mark === '✓');
  console.log(`   [${s}] ${ts.length} test(s) ${green ? 'green' : 'RED'}`);
  if (ts.length === 0) fail(`section [${s}] ran no test`);
  else if (!green) fail(`section [${s}] is red: ${ts.filter(t => t.mark !== '✓').map(t => t.name).join('; ')}`);
}
const stray = base.tests.filter(t => !SECTIONS.includes(t.section));
if (stray.length) fail(`tests in sections this wrapper does not know: ${[...new Set(stray.map(t => t.section))].join(', ')}`);
if (base.failed > 0 || base.passed !== base.tests.length || base.tests.length === 0) fail(`expected ${base.tests.length} passed and none failed, vitest says: ${base.summary || 'nothing'}`);
console.log(`   ${base.tests.length} test(s), vitest: ${base.summary || 'no summary line'}`);

/* ----------------------------------------------------- 2) the controls */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;

/* A cut is [anchor, replacement] in one file; the module is what the app
   imports it as, the key the alias swaps. Relative imports in a copy are
   rewritten to the file's own folder, since the copy lives elsewhere. */
const NASCAR_HOOK = { module: '@/hooks/useNascarChain', file: 'src/hooks/useNascarChain.ts' };
const TENNIS_HOOK = { module: '@/hooks/useTennisChain', file: 'src/hooks/useTennisChain.ts' };
/* Round 645 part one's recorder spends a stale restore mark itself when a
   finish it already tracked comes back on screen (the same cut as
   simRankedRecorder's stalemark control). Since the points economy merge that
   is a second guard against the failure [pack-mark] and [rarity-mark] watch,
   so taking out the page's own guard alone changes nothing a player sees. The
   two controls take out both guards; each section still has to go red on
   the failure shape and every other section has to stay green. */
const HOOK_STALE_MARK = {
  module: '@/hooks/useGameCompletion', file: 'src/hooks/useGameCompletion.ts',
  cuts: [['      consumeRestoredFinish(gameSlug);\n      return;\n    }\n    trackedRef.current = true;', '      return;\n    }\n    trackedRef.current = true;']],
};
const CONTROLS = [
  {
    name: 'giveup-shut', red: 'giveup-shut',
    what: 'both chain boards leave Give Up live while a guess is verified',
    swaps: [
      { module: '@/components/nascar-chain/NascarChainBoard', file: 'src/components/nascar-chain/NascarChainBoard.tsx', cuts: [['onClick={giveUp}\n                disabled={validating}\n', 'onClick={giveUp}\n']] },
      { module: '@/components/tennis-chain/TennisChainBoard', file: 'src/components/tennis-chain/TennisChainBoard.tsx', cuts: [['onClick={giveUp}\n                disabled={validating}\n', 'onClick={giveUp}\n']] },
    ],
  },
  {
    name: 'giveup-refused', red: 'giveup-refused',
    what: 'both chain hooks take a Give Up while a verdict is out',
    swaps: [
      { ...NASCAR_HOOK, cuts: [['    if (!gameState || validatingRef.current) return;\n', '    if (!gameState) return;\n']] },
      { ...TENNIS_HOOK, cuts: [['    if (!gameState || validatingRef.current) return;\n', '    if (!gameState) return;\n']] },
    ],
  },
  {
    name: 'late-verdict', red: 'late-verdict',
    what: 'a right verdict lands on whatever chain is there',
    swaps: [
      { ...NASCAR_HOOK, cuts: [['          if (!stillAsked(prev)) return prev;\n', '']] },
      { ...TENNIS_HOOK, cuts: [['          if (!stillAsked(prev)) return prev;\n', '']] },
    ],
  },
  {
    name: 'canonical', red: 'canonical',
    what: 'the used check skips the name the validator settled on',
    swaps: [
      { ...NASCAR_HOOK, cuts: [['if (prev.usedDrivers.has(fullName.toLowerCase())) {', 'if (false) {']] },
      { ...TENNIS_HOOK, cuts: [['if (prev.usedPlayers.has(fullName.toLowerCase())) {', 'if (false) {']] },
    ],
  },
  {
    name: 'leaderboard', red: 'leaderboard',
    what: 'the chain record forgets that the nickname row was saved',
    swaps: [{ module: '@/lib/chainDaily', file: 'src/lib/chainDaily.ts', cuts: [[', leaderboard: rec.leaderboard });', ' });']] }],
  },
  {
    name: 'pack-toggle', red: 'pack-toggle',
    what: 'a new deal leaves the reveal timer running',
    swaps: [{ module: '@/pages/PackBattle', file: 'src/pages/PackBattle.tsx', cuts: [['    if (revealTimer.current) clearTimeout(revealTimer.current);\n    revealTimer.current = null;\n    setPlayMode(nextPlayMode);\n', '    setPlayMode(nextPlayMode);\n']] }],
  },
  {
    name: 'pack-writer', red: 'pack-writer',
    what: 'the pack writer files whatever it is handed',
    swaps: [{ module: '@/lib/packBattle', file: 'src/lib/packBattle.ts', cuts: [['  if (!checkPackDaily(pack, fields)) return false;\n', '']] }],
  },
  {
    name: 'pack-mark', red: 'pack-mark',
    what: 'Pack Battle marks every finished daily it reopens, and the recorder keeps the stale mark',
    swaps: [{ module: '@/pages/PackBattle', file: 'src/pages/PackBattle.tsx', cuts: [["      if (phaseRef.current !== 'done') markRestoredFinish(SLUG);\n", '      markRestoredFinish(SLUG);\n']] }, HOOK_STALE_MARK],
  },
  {
    name: 'rarity-mark', red: 'rarity-mark',
    what: 'Rarity Round marks every finished daily it reopens, and the recorder keeps the stale mark',
    swaps: [{ module: '@/pages/RarityRound', file: 'src/pages/RarityRound.tsx', cuts: [["          if (phaseRef.current !== 'done') markRestoredFinish(SLUG);\n", '          markRestoredFinish(SLUG);\n']] }, HOOK_STALE_MARK],
  },
  {
    name: 'rarity-derive', red: 'rarity-derive',
    what: 'a saved answer its pool does not hold is scored anyway',
    swaps: [{ module: '@/pages/RarityRound', file: 'src/pages/RarityRound.tsx', cuts: [['    const match = pool.find(p => p.name === answers[i]);\n', '    const match = pool.find(p => p.name === answers[i]) ?? pool[pool.length - 1];\n']] }],
  },
  {
    name: 'arcade-bound', red: 'arcade-bound',
    what: 'the arcade readers trust the stored score',
    swaps: [{ module: '@/lib/arcadeRecord', file: 'src/lib/arcadeRecord.ts', cuts: [[' || score < 0 || score > maxScore) return null;', ') return null;']] }],
  },
  {
    name: 'gauntlet-board', red: 'gauntlet-board',
    what: 'the shared Gauntlet board files no pick of a daily draft',
    swaps: [{ module: '@/components/gauntlet/GauntletBoard', file: 'src/components/gauntlet/GauntletBoard.tsx', cuts: [["    if (mode === 'daily') saveDailyDraft(config, todayStr, next.slice(0, pickIndex + 1) as P[]);\n", '']] }],
  },
  {
    name: 'fouls-restore', red: 'drill-fouls',
    what: 'a resumed tackle session starts its fouls at none',
    swaps: [{ module: '@/components/soccer-career/DrillBoard', file: 'src/components/soccer-career/DrillBoard.tsx', cuts: [['      setFouls(record.fouls);\n', '      setFouls(0);\n']] }],
  },
  {
    name: 'fouls-write', red: 'drill-fouls',
    what: 'a round decided in the air is filed without its foul',
    swaps: [{ module: '@/components/soccer-career/DrillBoard', file: 'src/components/soccer-career/DrillBoard.tsx', cuts: [[', fouls: fouls + (foul ? 1 : 0) };', ' };']] }],
  },
  {
    name: 'market-roll', red: 'market-roll',
    what: 'a daily market with all eleven bought does not roll again',
    swaps: [{ module: '@/pages/PlayerStockMarket', file: 'src/pages/PlayerStockMarket.tsx', cuts: [['    if (bought.length >= built.slots.length) { void roll(built, bought); return; }\n', '']] }],
  },
  {
    name: 'pack-new-finish', red: 'pack-new-finish',
    what: 'a daily finish lands straight on the Unlimited result card',
    swaps: [{ module: '@/pages/PackBattle', file: 'src/pages/PackBattle.tsx', cuts: [["    if (finishing && phaseRef.current === 'done') {\n", '    if (false) {\n']] }],
  },
  {
    name: 'rarity-new-finish', red: 'rarity-new-finish',
    what: 'a daily finish lands straight on the Unlimited result screen',
    swaps: [{ module: '@/pages/RarityRound', file: 'src/pages/RarityRound.tsx', cuts: [["        if (finishing && phaseRef.current === 'done') {\n", '        if (false) {\n']] }],
  },
  {
    name: 'millionaire-new-finish', red: 'millionaire-new-finish',
    what: 'a decided daily answer lands straight on the Unlimited result card',
    swaps: [{ module: '@/pages/SportsMillionaire', file: 'src/pages/SportsMillionaire.tsx', cuts: [["      if (phaseRef.current === 'done') {\n", '      if (false) {\n']] }],
  },
  /* Round 645 part three, second fix. */
  {
    name: 'rarity-unread', red: 'rarity-unread',
    what: 'a saved run whose pool came back empty is scored against it, refused, and the day dealt fresh',
    swaps: [{ module: '@/pages/RarityRound', file: 'src/pages/RarityRound.tsx', cuts: [['        if (pools.some(p => !Array.isArray(p) || p.length === 0)) {\n', '        if (false) {\n']] }],
  },
  {
    name: 'rarity-unread-throw', red: 'rarity-unread',
    what: 'a pool that fails on the way back is reported as the game failing to load',
    swaps: [{ module: '@/pages/RarityRound', file: 'src/pages/RarityRound.tsx', cuts: [['        if (token === runToken.current) unread();\n', "        if (token === runToken.current) setPhase('error');\n"]] }],
  },
  {
    name: 'chain-bound', red: 'chain-bound',
    what: 'both server validated chains resume whatever names a part played record holds',
    swaps: [
      { ...NASCAR_HOOK, cuts: [['  if (!rec.ended && !linksKnown(rec.links, nascarChampionNames.names)) return null;\n', '']] },
      { ...TENNIS_HOOK, cuts: [['  if (!rec.ended && !linksKnown(rec.links, tennisChampionNames.names)) return null;\n', '']] },
    ],
  },
];

const sectionsCovered = new Set(CONTROLS.map(c => c.red));
for (const s of SECTIONS) if (!sectionsCovered.has(s)) fail(`section [${s}] has no negative control`);

/* Build every copy for one control, refusing to run on an anchor that is not
   exactly once, not in the code, or that changed nothing. */
function buildCopies(ctl, dir) {
  const swap = {};
  for (const s of ctl.swaps) {
    const src = read(s.file);
    let copy = src;
    for (const [anchor, replacement] of s.cuts) {
      const n = count(copy, anchor);
      if (n !== 1) return { error: `${s.file}: anchor occurs ${n} time(s), not once: ${JSON.stringify(anchor.slice(0, 70))}` };
      if (count(stripComments(copy), anchor) !== 1) return { error: `${s.file}: anchor is not in the code once with comments stripped: ${JSON.stringify(anchor.slice(0, 70))}` };
      copy = copy.replace(anchor, replacement);
    }
    if (copy === src) return { error: `${s.file}: the copy is the file, the control changed nothing` };
    const folder = path.posix.dirname(s.file.replace(/^src\//, '@/'));
    copy = copy.replace(/from '\.\/([^']+)'/g, `from '${folder}/$1'`);
    copy += `\nconsole.log('DAILY_LOCK_SWAP_LOADED ${ctl.name} ${path.basename(s.file)}');\n`;
    const out = path.join(dir, path.basename(s.file).replace(/\.(tsx?)$/, '.control.$1'));
    fs.writeFileSync(out, copy);
    swap[s.module] = out.replaceAll('\\', '/');
  }
  return { swap };
}

console.log('2) Negative controls: each takes one fix out of a copy, its own section must go red and every other stay green');
fs.mkdirSync(path.join(ROOT, 'dist', '.daily-lock-control'), { recursive: true });
for (const ctl of CONTROLS) {
  if (ONLY && ONLY !== ctl.name) continue;
  const dir = fs.mkdtempSync(path.join(ROOT, 'dist', '.daily-lock-control', `${ctl.name}-`));
  try {
    const built = buildCopies(ctl, dir);
    if (built.error) { fail(`control ${ctl.name} cannot run: ${built.error}`); continue; }
    const run = runVitest({ DAILY_LOCK_CONTROL: ctl.name, DAILY_LOCK_SWAP: JSON.stringify(built.swap) });
    const p = parse(run.out);
    if (!p.named) { fail(`control ${ctl.name}: vitest did not report on the test file`); continue; }
    const loaded = ctl.swaps.every(s => run.out.includes(`DAILY_LOCK_SWAP_LOADED ${ctl.name} ${path.basename(s.file)}`));
    const own = p.tests.filter(t => t.section === ctl.red);
    const ownRed = own.filter(t => t.mark === '×');
    const others = p.tests.filter(t => t.section !== ctl.red);
    const othersRed = others.filter(t => t.mark !== '✓');
    const asDesigned = loaded && ownRed.length > 0 && othersRed.length === 0 && p.tests.length === base.tests.length;
    console.log(`   ${ctl.name}: ${ctl.what}; [${ctl.red}] ${ownRed.length} of ${own.length} red, ${others.length - othersRed.length} of ${others.length} other test(s) green${asDesigned ? ', as designed' : ', NOT AS DESIGNED'}`);
    if (!loaded) fail(`control ${ctl.name}: the copy was never loaded, so it changed nothing`);
    if (ownRed.length === 0) fail(`control ${ctl.name}: [${ctl.red}] stayed green with the fix taken out, so the section does not see it\n${detail(run.out)}`);
    if (othersRed.length > 0) fail(`control ${ctl.name}: also red outside [${ctl.red}]: ${othersRed.map(t => `[${t.section}] ${t.name}`).join('; ')}`);
    if (p.tests.length !== base.tests.length) fail(`control ${ctl.name} ran ${p.tests.length} test(s), the suite ${base.tests.length}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
try { fs.rmdirSync(path.join(ROOT, 'dist', '.daily-lock-control')); } catch { /* another run's copies, or already gone */ }

if (failures > 0) {
  console.error(`\nsimDailyLockEdges: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`\nsimDailyLockEdges: all green (${base.tests.length} test(s) in ${SECTIONS.length} sections, ${ONLY ? `control ${ONLY}` : `all ${CONTROLS.length} controls`} fired)`);
