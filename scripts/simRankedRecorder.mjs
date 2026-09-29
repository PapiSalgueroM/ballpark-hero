/* Ranked recorder harness: a finish outside the daily is a play, never a record,
   and its result card says so.

   Round 645 part one. A read of every recorder on 2026-09-28 (origin/main
   22bc0f7e) found 35 live games (36 counting Guess The Club, retired: its
   registry entry is commented out and /guess-soccer-club redirects home)
   whose free finishes (Unlimited, free play, a new season, versus, a CPU
   card) went through the same recorder as their daily, under the daily's
   slug: a scored game_completions row, so the day board's best was the best
   of as many attempts as a player cared to make, and the signed in save, so
   every attempt paid its score into total_points, wrote a user_game_scores
   row and ticked daily_completions for a daily never played. 28 call sites
   in 28 files:
     23 recorded the active game's state whatever the mode, covering 31
        games (30 live): the eight guess hooks on gameState (Guess The CBB
        Team, F1 Constructor, F1 Driver, Guess The NFL Team, Guess The Club,
        Guess The Nation, Guess The NASCAR Driver, Guess The Tennis Player),
        the three chains (NASCAR, Tennis, UFC), the four gauntlets (one page
        and one board for three sports), the five conquest maps (one board),
        Buzzer Beater, Free Kick, NBA Stat Line, Pack Battle, Player Stock
        Market, Rarity Round, Sports Bingo, Perfect Lineup (Unlimited and Go
        Unbeaten) and the three Perfect Lineups on the shared engine (F1,
        NBA, NHL), whose done flag named the daily without requiring it:
        phase === 'result' && !(mode === 'daily' && dailyDone) is true on
        every Unlimited result;
      4 Perfect Seasons recorded every classic and hard season through a
        bare recordCompletion;
      1 Face Off, the one game that told the two apart, still wrote its free
        and versus matches through recordCompletion with no score, which is
        the signed in save and the daily key with a zero.
   Six more (Face Off's daily, HOF or Bust, Score Predictor, Shirt Number,
   Minefield, Sports Millionaire) ANDed the mode into their done flag. Round
   643 traced each of those six as safe from recording twice (the reasons sat
   in simNoDoubleRecord's MODE_GATE_BASELINE), but the shape made a free
   finish record nothing at all, not even a play, and it is the shape that
   re-armed Rank 'Em's recorder on a toggle in Round 643.

   Face Off's shape is now the recorder's own: useGameCompletion takes a
   `ranked` flag, false routes to recordUnrankedPlay (the anonymous row with
   no score under the player's name, the local streak day and today's games,
   nothing else), and a game with a daily and a free mode under one slug
   passes its mode. Measured with this scan: 28 unranked writes in 28 files
   and 6 mode gated recorders before, 0 and 0 after.

   SECTION 1, THE SOURCE. Every recorder in src, read as code (comments
   stripped). A recorder's file is read as MULTI MODE when its code names the
   literal 'daily' (mode === 'daily', a 'daily' | 'unlimited' union, a
   start('daily')). That is wider than it needs to be on purpose: a daily
   only game that names it passes anyway, because its done flag reads daily
   state. The blind spot is a game whose modes live in another file than its
   recorder, and the 2026-09-28 read found none: every recorder file that
   does not name 'daily' either deals from the date alone or from the random
   generator alone. In a multi mode file every useGameCompletion call must either
     - carry the ranked flag, an expression true only in the daily: a pure &&
       chain (no top level ||, ??, ternary or comma, any of which can make it
       true outside the daily) with at least one term comparing the game's
       mode (an identifier whose last name ends in mode, like mode, playMode,
       gameMode, gameState?.mode) to 'daily'; a literal true only silences the
       check and mode !== 'daily' ranks the wrong runs, or
     - read daily only state: every identifier in its done expression is
       named daily (dailyDone, dailyFilled, rawDailyStatus, effectiveDailyStatus)
       or is dealtDay, the Missing XI shape Round 643 settled on, which cannot
       fire in another mode. Nothing looser: finishedToday or nonDailyFinish
       would have passed the first version of this check;
   and no multi mode file may call recordCompletion directly or hand a
   ResultScreen recordCompletionOnMount (that door records ranked on mount,
   whatever the mode), because the flag lives on the hook. A recorder in a
   multi mode file that is a single mode game of its own (the 20 Questions
   tree beside Guess The Club's daily) is a ratchet, SINGLE_MODE_BASELINE,
   with the reason beside it: a new one fails, a stale entry fails.
   Anywhere in src, a literal false flag is refused unless its own file has
   no daily mode (its code never names 'daily') and its slug resolves to a
   registry game with no daily: false on a daily game would silently take
   its day board, its points and its daily tick away, and nothing else would
   notice (simDailyLegend only asks that some recorder exists). Round 674
   (the fence lens review, R2.D6): the rule read the registry alone, and
   seven games with a real ranked daily carry no daily: true there (the
   NASCAR, Tennis and Combat chains, the four Perfect Seasons), so Combat
   Chain's flag set to false passed; the recorder's own mode detection now
   refuses it first.
   Every run proves each of those rules on synthetic call sites (the probes):
   the shapes that must be refused are refused, and the ones that must pass,
   pass.

   SECTION 2, THE LIB AND THE HOOK, AS CODE. recordUnrankedPlay writes the
   anonymous row under the name it is handed, the streak day and today's
   games, and reaches neither a score, the signed in save nor the daily key;
   the hook consumes the restore mark before either door, takes the unranked
   door before the ranked one, branches on !ranked, and hands the unranked
   door the same name the ranked door gets.

   SECTION 3, RENDERED. src/test/rankedRecorder.test.tsx renders the real
   hook (an unranked finish is one play and no record, under the player's
   name; a ranked one is one record and no play; a restored unranked finish
   is nothing; a restore that lands on a finish already on screen spends its
   mark) and plays four real hooks, one per shape (F1 Driver, NASCAR Chain,
   HOF or Bust, Perfect Lineup NBA on the shared engine), through the daily
   and through Unlimited. src/test/rankedRecorderLib.test.ts drives the real
   lib against a recording Supabase client: the unranked row carries no
   score and the name it was handed, no rpc and no session read happen, the
   streak day and today's games land.

   SECTION 4, THE CARD SAYS SO. Round 644's rule: a result screen shows the
   score that gets recorded. A free run's score is not recorded, so its card
   carries the shared free play line (src/components/game/UnrankedNote.tsx)
   next to the score. Source: for every recorder that passes the flag, every
   file that draws its result card (the recorder's own file when it draws a
   ResultScreen or a share row, else every file importing it that does) must
   hand each ResultScreen a ranked prop, or render an UnrankedNote when it
   has no ResultScreen, and every such prop must be true only in the daily
   (the section 1 rule) or a literal false (a card that is never ranked, the
   Go Unbeaten season). Rendered: src/test/unrankedNote.test.tsx plays the
   shared card, Guess The F1 Driver's own card and HOF or Bust's shared card
   through Unlimited (the line shows) and the daily (it does not).
   Round 674 (R2.D5): the source check only asked that a board drawing its
   own card holds the line somewhere in the file, so the line moved to
   Buzzer Beater's per shot card stayed green. src/test/unrankedCards.test.tsx
   plays every daily reload driver's daily to the finish with the line
   replaced by a probe, and this section hands it, per driver, the number of
   own lines (outside the shared card) its finished page must show: 1 when
   the driver renders a board that draws its own card (read here from the
   driver's import closure), else 0; never one on the live board, and in the
   daily always flagged ranked. Every board that draws its own card must be
   rendered by some driver or sit in RENDER_BASELINE with its reason, a
   ratchet (a new one fails, a stale one fails).

   SECTION 5, GAMES TODAY. The owner's number, how many games he played that
   day, is read ONE way: src/lib/gamesToday.ts, by the game header and the
   profile tile alike. The profile used to read daily_completions, which a
   free run never ticks, so the two disagreed on every Unlimited game.

   NEGATIVE CONTROLS (house rule: prove each check can fail). The source ones
   rewrite one file in memory and run their own section on it; each refuses
   to run unless its anchor occurs exactly once as code, and must turn only
   its own section red:
     unranked   useCbbProgram's recorder loses its flag; exactly that file
                flagged, kind unranked
     literal    useCbbProgram passes a literal true; kind flag
     inverted   useCbbProgram passes mode !== 'daily'; kind flag
     orflag     useCbbProgram's flag gains a top level || true; kind flag
     falseflag  useCbbProgram (a registry daily) passes a literal false;
                kind flag
     ufcfalse   useUfcChain passes a literal false (Round 674, the review's
                m645a-2): its registry entry has no daily: true, so only its
                own mode detection refuses it; kind flag
     direct     Face Off's free matches go back through recordCompletion;
                kind direct
     onmount    Rarity Round's result card records on mount; kind direct
     stale      a baseline entry that matches nothing; section 1 red
     hookorder  the hook takes the unranked door before the restore mark;
                section 2 reports the order and nothing else
     hookbranch the hook no longer branches on !ranked; section 2 reports the
                branch and nothing else
     nonote     F1 Driver's own card loses its free play line; section 4
                flags exactly that file
     noprop     the gauntlet board's ResultScreen loses its ranked prop;
                section 4 flags exactly that file
     profilesplit  the profile tile stops reading gamesToday.ts; section 5
   The rendered ones edit a COPY in a per run folder under .sim-control
   (scripts/lib/controlScratch.mjs; Round 674 retired the fixed
   dist/.ranked-control) and point vitest at it through an alias
   (COMPLETION_HOOK, RANKED_LIB, or NO_DOUBLE_SWAP for any other module); the
   copy prints a load line naming its run, and a control whose line never
   appears is refused. Every case not named must stay green:
     hookignores  the hook records every finish as ranked; the unranked cases
                  go red, the ranked ones stay green
     hooknoname   the unranked door is handed no name; section 2 and the name
                  case go red
     stalemark    a restore landing on a finish already on screen keeps its
                  mark; the stale mark case goes red
     libleaks     recordUnrankedPlay writes a score on its row; section 2 and
                  the no score case go red
     libsaves     recordUnrankedPlay makes the signed in save; section 2 and
                  the no signed in save case go red
     libnotoday   recordUnrankedPlay stops counting in today's games; section
                  2 and the today case go red
     notesilent   the free play line never renders; every card case that
                  expects it goes red, the ones that expect none stay green
     screendrops  ResultScreen drops the line; section 4's ResultScreen check
                  and the shared card cases go red, F1 Driver's own card
                  stays green
     shotnote     Buzzer Beater's line moves from its finished card to the per
                  shot card (Round 674, the review's m645a-1); the source
                  check stays green by design, and exactly the buzzer-beater
                  row of unrankedCards.test.tsx goes red
   RANKED_CONTROL=all runs every control in turn. A control run exits 0 when
   it fired exactly as it should and 1 when it did not.

   Run: node scripts/simRankedRecorder.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments, callsOf, resolveSlug, resolveExpr, readLF as readSourceLF, srcFiles as sourceFiles } from './lib/readSource.mjs';
import { controlScratch, loadedLine, withLoadedLine } from './lib/controlScratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RANKED_CONTROL || '';
const HOOK = 'src/hooks/useGameCompletion.ts';
const LIB = 'src/lib/completions.ts';
const REGISTRY = 'src/data/gameRegistry.ts';
const RESULT_SCREEN = 'src/components/game/ResultScreen.tsx';
const NOTE = 'src/components/game/UnrankedNote.tsx';
const GAMES_TODAY = 'src/lib/gamesToday.ts';
const NAVBAR = 'src/hooks/useGameNavbarStats.ts';
const PROFILE = 'src/pages/Profile.tsx';
const TESTS = ['src/test/rankedRecorder.test.tsx', 'src/test/rankedRecorderLib.test.ts', 'src/test/unrankedNote.test.tsx', 'src/test/unrankedCards.test.tsx'];
const DRIVERS_DIR = 'src/test/dailyReload';

/* Round 674 (R2.D5): boards that draw their own result card and cannot yet
   be rendered to a finished daily by a driver in src/test/dailyReload. Their
   line is held by the source check alone. A ratchet: a new board that draws
   its own card must bring a driver, and an entry whose board gets one (or
   stops drawing its own card) must leave. */
const RENDER_BASELINE = [
  { file: 'src/components/conquest/ImperialismBoardShared.tsx', why: 'the five Conquest maps have no daily reload driver: a finished daily is a whole map played out against the CPU, which no driver plays yet' },
  { file: 'src/pages/PerfectSeasonMlb.tsx', why: 'the four Perfect Seasons have no daily reload driver: the page boots its draft pool from the database, which the shared mocks do not serve yet' },
  { file: 'src/pages/PerfectSeasonNba.tsx', why: 'as PerfectSeasonMlb.tsx' },
  { file: 'src/pages/PerfectSeasonNfl.tsx', why: 'as PerfectSeasonMlb.tsx' },
  { file: 'src/pages/PerfectSeasonNhl.tsx', why: 'as PerfectSeasonMlb.tsx' },
];

/* Recorders that sit in a multi mode file but are a single mode game of their
   own. Keyed by file and slug. A new one fails; a stale one fails. */
const SINGLE_MODE_BASELINE = [
  { file: 'src/hooks/useGuessSoccerClub.ts', slug: 'guess-soccer-club-questions', why: 'the 20 Questions tree has no daily: every run deals a random club under its own slug, beside the classic daily in the same hook' },
];

const CBB_FLAG = "gameState?.score ?? 0, 0, gameState?.mode === 'daily');";
/* In memory rewrites of one file, judged by the section they belong to. */
const SCAN_CONTROLS = {
  unranked: {
    section: 1, file: 'src/hooks/useCbbProgram.ts', kind: 'unranked',
    from: "useGameCompletion('guess-cbb-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0, 0, gameState?.mode === 'daily');",
    to: "useGameCompletion('guess-cbb-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);",
    why: 'Guess The CBB Team records an Unlimited finish as the daily again',
  },
  literal: {
    section: 1, file: 'src/hooks/useCbbProgram.ts', kind: 'flag', from: CBB_FLAG, to: 'gameState?.score ?? 0, 0, true);',
    why: 'Guess The CBB Team silences the flag with a literal true',
  },
  inverted: {
    section: 1, file: 'src/hooks/useCbbProgram.ts', kind: 'flag', from: CBB_FLAG, to: "gameState?.score ?? 0, 0, gameState?.mode !== 'daily');",
    why: 'Guess The CBB Team ranks every mode but the daily',
  },
  orflag: {
    section: 1, file: 'src/hooks/useCbbProgram.ts', kind: 'flag', from: CBB_FLAG, to: "gameState?.score ?? 0, 0, gameState?.mode === 'daily' || true);",
    why: "Guess The CBB Team's flag gains a top level || true, true in every mode",
  },
  falseflag: {
    section: 1, file: 'src/hooks/useCbbProgram.ts', kind: 'flag', from: CBB_FLAG, to: 'gameState?.score ?? 0, 0, false);',
    why: 'Guess The CBB Team, a registry daily, silences the fence with a literal false and loses its day board',
  },
  /* Round 674, the fence lens review's m645a-2: Combat Chain's registry entry
     carries no daily: true, so the registry alone let this through. */
  ufcfalse: {
    section: 1, file: 'src/hooks/useUfcChain.ts', kind: 'flag',
    from: "gameState?.score ?? 0, 0, gameState?.mode === 'daily');", to: 'gameState?.score ?? 0, 0, false);',
    why: 'Combat Chain passes a literal false, so its daily never records a score, points or the daily tick, and its registry entry says no daily',
  },
  direct: {
    section: 1, file: 'src/hooks/useFaceOff.ts', kind: 'direct',
    from: "    setPhase('done');\n  }, [phase, results, rounds.length, difficulty, mode, save]);",
    to: "    if (mode !== 'daily') recordCompletion('/face-off');\n    setPhase('done');\n  }, [phase, results, rounds.length, difficulty, mode, save]);",
    why: "Face Off's free matches go back through a bare recordCompletion, the signed in save and the daily key with a zero",
  },
  onmount: {
    section: 1, file: 'src/pages/RarityRound.tsx', kind: 'direct',
    from: "            <ResultScreen\n              ranked={playMode === 'daily'}\n",
    to: "            <ResultScreen\n              recordCompletionOnMount\n              ranked={playMode === 'daily'}\n",
    why: "Rarity Round's result card records on mount, ranked in Unlimited as in the daily",
  },
  hookorder: {
    section: 2, file: HOOK, expect: /restore mark, then take the unranked door/,
    from: '    if (consumeRestoredFinish(gameSlug)) return;\n',
    to: '    if (!ranked) { recordUnrankedPlay(`/${gameSlug}`, getCurrentPlayerName(profile)); return; }\n    if (consumeRestoredFinish(gameSlug)) return;\n',
    why: 'the hook takes the unranked door before it asks about the restore mark, so a restored free finish is a play again',
  },
  hookbranch: {
    section: 2, file: HOOK, expect: /no longer branches on !ranked/,
    from: '    if (!ranked) {\n      recordUnrankedPlay(',
    to: '    if (ranked === undefined) {\n      recordUnrankedPlay(',
    why: 'the hook stops branching on the flag, so a free finish takes the ranked door',
  },
  nonote: {
    section: 4, file: 'src/components/f1-driver/F1DriverBoard.tsx', kind: 'card',
    from: "            <UnrankedNote ranked={gameState.mode === 'daily'} />\n",
    to: '',
    why: "Guess The F1 Driver's own card shows an Unlimited score with nothing saying it pays no points",
  },
  noprop: {
    section: 4, file: 'src/components/gauntlet/GauntletBoard.tsx', kind: 'card',
    from: "        <ResultScreen\n          ranked={mode === 'daily'}\n",
    to: '        <ResultScreen\n',
    why: "the gauntlet board's shared card is not told the run was free, so it cannot say so",
  },
  profilesplit: {
    section: 5, file: PROFILE,
    from: 'const gamesToday = mergeGamesToday(todayRows, localGamesToday);',
    to: 'const gamesToday = Math.max(localGamesToday, 0);',
    why: 'the profile tile counts games today its own way again, and disagrees with the header on every free run',
  },
};
const HOOK_IGNORES_FROM = '    if (!ranked) {\n      recordUnrankedPlay(`/${gameSlug}`, getCurrentPlayerName(profile));\n      return;\n    }\n';
/* Each rendered control rewrites one module into a copy and names the cases
   that must go red, by test file and title; every other case in the three
   files must stay green. `check` first runs the source check that reads the
   same module on the copy (section 2 for the lib and the hook, section 4's
   ResultScreen check for the shared card), which must go red too. */
const VITEST_CONTROLS = {
  hookignores: {
    file: HOOK, alias: 'COMPLETION_HOOK', testFile: 'rankedRecorder.test.tsx',
    from: HOOK_IGNORES_FROM, to: '',
    why: 'the hook records every finish as ranked again',
    red: /unranked finish is one play|a free run then a daily run|Unlimited|under the player's name|spends its mark/,
    check: 'hook',
  },
  hooknoname: {
    file: HOOK, alias: 'COMPLETION_HOOK', testFile: 'rankedRecorder.test.tsx',
    from: 'recordUnrankedPlay(`/${gameSlug}`, getCurrentPlayerName(profile));', to: 'recordUnrankedPlay(`/${gameSlug}`);',
    why: 'the unranked door files a signed in player under whatever the name cache holds, the guest handle when it is empty',
    red: /under the player's name/,
    check: 'hook',
  },
  stalemark: {
    file: HOOK, alias: 'COMPLETION_HOOK', testFile: 'rankedRecorder.test.tsx',
    from: '      consumeRestoredFinish(gameSlug);\n      return;\n    }\n    trackedRef.current = true;',
    to: '      return;\n    }\n    trackedRef.current = true;',
    why: 'a restore that lands on a finish already on screen keeps its mark, and swallows the next real finish',
    red: /spends its mark/,
    check: null,
  },
  libleaks: {
    file: LIB, alias: 'RANKED_LIB', testFile: 'rankedRecorderLib.test.ts',
    from: '      .insert({ game, player_name: playerName || getCurrentPlayerName() })\n',
    to: '      .insert({ game, score: 0, player_name: playerName || getCurrentPlayerName() })\n',
    why: 'recordUnrankedPlay writes a score on the anonymous row again, so the day board reads a free run',
    red: /with no score/,
    check: 'lib',
  },
  libsaves: {
    file: LIB, alias: 'RANKED_LIB', testFile: 'rankedRecorderLib.test.ts',
    from: "    if (!game) return;\n    (supabase.from as any)('game_completions')\n      .insert({ game, player_name: playerName || getCurrentPlayerName() })",
    to: "    if (!game) return;\n    saveAuthCompletion('', game, 0, 0);\n    (supabase.from as any)('game_completions')\n      .insert({ game, player_name: playerName || getCurrentPlayerName() })",
    why: 'recordUnrankedPlay makes the signed in save again, so a free run pays points and ticks the daily key',
    red: /no signed in save/,
    check: 'lib',
  },
  libnotoday: {
    file: LIB, alias: 'RANKED_LIB', testFile: 'rankedRecorderLib.test.ts',
    from: '    recordStreakCompletion(game, new Date(), 0);\n    bumpLocalTodayCount(game);\n',
    to: '    recordStreakCompletion(game, new Date(), 0);\n',
    why: "recordUnrankedPlay stops counting in today's games, so a finished Unlimited game is missing from Games Today",
    red: /counts in today's games/,
    check: 'lib',
  },
  notesilent: {
    file: NOTE, alias: 'NO_DOUBLE_SWAP', module: '@/components/game/UnrankedNote', testFile: 'unrankedNote.test.tsx',
    from: '  if (ranked) return null;\n', to: '  if (ranked || !ranked) return null;\n',
    why: 'the free play line never renders, so every free run shows a score nothing records',
    red: /shows the line|Unlimited after it does/,
    check: null,
  },
  screendrops: {
    file: RESULT_SCREEN, alias: 'NO_DOUBLE_SWAP', module: '@/components/game/ResultScreen', testFile: 'unrankedNote.test.tsx',
    from: '      <UnrankedNote ranked={ranked !== false} className="mt-2" />\n', to: '',
    why: 'the shared result card takes the flag and drops the line',
    red: /the shared card: a free run shows the line|HOF or Bust/,
    check: 'screen',
  },
  /* Round 674, the fence lens review's m645a-1: the line is still in the file
     with a daily only flag, so the source check stays green by design; only
     the rendered finished card can see it gone. */
  shotnote: {
    file: 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx', alias: 'NO_DOUBLE_SWAP', module: '@/components/buzzer-beater/BuzzerBeaterBoard', testFile: 'unrankedCards.test.tsx',
    edits: [
      ["          <UnrankedNote ranked={mode === 'daily'} className=\"mt-2\" />\n", ''],
      ['          {result.made && <p className="mt-1 text-sm text-muted-foreground">{result.points} points.</p>}\n',
        '          {result.made && <p className="mt-1 text-sm text-muted-foreground">{result.points} points.</p>}\n' +
        "          <UnrankedNote ranked={mode === 'daily'} className=\"mt-2\" />\n"],
    ],
    why: "Buzzer Beater's free play line moves from its finished card to the per shot card, so an Unlimited run's final score shows with nothing beside it",
    red: /buzzer-beater: the finished daily/,
    check: null,
  },
};
const ALL = [...Object.keys(SCAN_CONTROLS), 'stale', ...Object.keys(VITEST_CONTROLS)];
if (CONTROL && CONTROL !== 'all' && !ALL.includes(CONTROL)) {
  console.error(`RANKED_CONTROL=${CONTROL} is not a control this harness knows (${ALL.join(', ')}, all)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const readLF = rel => readSourceLF(ROOT, rel);
const srcFiles = () => sourceFiles(ROOT);
const count = (hay, needle) => hay.split(needle).length - 1;

/* ------------------------------------------------------------------------ */
/* Expressions                                                               */
/* ------------------------------------------------------------------------ */
const DAILY_LITERAL = /['"]daily['"]/;
const CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const KEYWORD = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof']);

/* Every identifier chain in an expression, string literals removed first
   (so 'playing' in rawDailyStatus !== 'playing' is not an identifier). */
function identifiersOf(expr) {
  const noStrings = expr.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  return [...noStrings.matchAll(/[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*/g)].map(m => m[0].replace(/\s+/g, ''));
}
/* Daily only state: the root of the chain is named for the daily
   (dailyDone, dailyFinish.date, rawDailyStatus, effectiveDailyStatus), or is
   dealtDay (NFL Career Path compares the finish's date to the day the daily
   was dealt). A name that merely contains daily or ends in day is not
   enough: nonDailyFinish and finishedToday are true in other modes. A new
   prefix is added here deliberately, with a reason, or it fails. */
const DAILY_STATE_ROOT = /^(?:daily|rawDaily|effectiveDaily)[A-Z][\w$]*$/;
const DAILY_STATE_EXACT = new Set(['dealtDay']);
const dailyStateId = id => { const root = id.split(/\??\./)[0]; return DAILY_STATE_ROOT.test(root) || DAILY_STATE_EXACT.has(root); };
function dailyScoped(done) {
  const ids = identifiersOf(done).filter(id => !KEYWORD.has(id) && !CONSTANT.test(id));
  return ids.length > 0 && ids.every(dailyStateId);
}

/* An expression split at the top level: its && terms, and whether any other
   operator sits at the top level (||, ??, a ternary, a comma), which would
   let the whole thing be true without every && term holding. Parentheses,
   brackets, braces and strings keep a term whole, so
   !(mode === 'daily' && dailyDone) is ONE term. */
function topLevel(expr) {
  const terms = [];
  let mixed = false;
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < expr.length; i += 1) {
    const c = expr[i];
    const d = expr[i + 1];
    if (quote) { cur += c; if (c === '\\') { cur += d ?? ''; i += 1; } else if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    if (c === ')' || c === ']' || c === '}') depth -= 1;
    if (depth === 0) {
      if (c === '&' && d === '&') { terms.push(cur.trim()); cur = ''; i += 1; continue; }
      if (c === '|' && d === '|') mixed = true;
      if (c === '?' && d === '?') mixed = true;
      if (c === '?' && d !== '.' && d !== '?' && expr[i - 1] !== '?') mixed = true;
      if (c === ',') mixed = true;
    }
    cur += c;
  }
  terms.push(cur.trim());
  return { terms: terms.filter(Boolean), mixed };
}
/* Outer parentheses that wrap the whole expression say nothing. */
function unwrap(expr) {
  let e = expr.trim();
  for (;;) {
    if (!e.startsWith('(') || !e.endsWith(')')) return e;
    let depth = 0;
    let closesEarly = false;
    for (let i = 0; i < e.length; i += 1) {
      if (e[i] === '(') depth += 1;
      else if (e[i] === ')') { depth -= 1; if (depth === 0 && i < e.length - 1) { closesEarly = true; break; } }
    }
    if (closesEarly) return e;
    e = e.slice(1, -1).trim();
  }
}
/* A term that is true only in the daily: the game's mode compared equal to
   'daily'. The compared chain must end in a name that ends in mode, so
   view === 'daily' or tab === 'daily' (which could be anything) do not
   count. A negation (!==, or a ! in front) is not one. */
const CHAIN = String.raw`[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*`;
const DAILY_TERM = new RegExp(String.raw`^(?:(${CHAIN})\s*={2,3}\s*['"]daily['"]|['"]daily['"]\s*={2,3}\s*(${CHAIN}))$`);
function isDailyTerm(term) {
  const m = DAILY_TERM.exec(unwrap(term));
  if (!m) return false;
  const chain = (m[1] ?? m[2]).replace(/\s+/g, '');
  const last = chain.split(/\??\./).pop();
  return /mode$/i.test(last);
}
function onlyInDaily(expr) {
  const { terms, mixed } = topLevel(unwrap(expr));
  return !mixed && terms.some(isDailyTerm);
}

/* The registry, read as code: every game's slug and whether it has a daily. */
function registryGames() {
  const code = stripComments(readLF(REGISTRY));
  const games = new Map();
  for (const m of code.matchAll(/\{\s*path:\s*'\/([^']+)'([^}]*)\}/g)) games.set(m[1], /\bdaily:\s*true\b/.test(m[2]));
  if (games.size < 100) abort(`only ${games.size} games read from ${REGISTRY}, the registry reader is broken`);
  return games;
}

/* ------------------------------------------------------------------------ */
/* Section 1: the recorders                                                  */
/* ------------------------------------------------------------------------ */
function scan(files, baseline = SINGLE_MODE_BASELINE, registry = registryGames()) {
  const findings = [];
  const baselineHits = new Set();
  const multi = [];
  let recorders = 0;
  let checked = 0;
  for (const [rel, raw] of files) {
    if (rel === HOOK || rel === LIB) continue;
    const code = stripComments(raw);
    const recs = callsOf(code, 'useGameCompletion').filter(c => c.args.length >= 2);
    const direct = callsOf(code, 'recordCompletion').filter(c => c.args.length >= 1);
    /* ResultScreen's opt in recorder: the prop on a card records ranked on
       mount through recordCompletion, with no way to pass a mode. */
    const onMount = rel === RESULT_SCREEN ? [] : [...code.matchAll(/\brecordCompletionOnMount\b/g)];
    if (!recs.length && !direct.length && !onMount.length) continue;
    recorders += recs.length + direct.length + onMount.length;
    /* A literal false anywhere: allowed only in a file with no daily mode of
       its own, on a registry game with no daily. Round 674 (R2.D6): the
       registry's daily field alone let a literal false through on seven games
       with a real ranked daily the registry does not mark (the NASCAR,
       Tennis and Combat chains, the four Perfect Seasons), so the recorder's
       own mode detection (its code names 'daily') now refuses it first. */
    const multiMode = DAILY_LITERAL.test(code);
    for (const r of recs.filter(x => x.args.length >= 5)) {
      if (resolveExpr(code, r.args[4]) !== 'false') continue;
      const slug = resolveSlug(code, r.args[0]);
      if (!multiMode && slug !== null && registry.has(slug) && registry.get(slug) === false) continue;
      const why = multiMode ? 'its own file names the daily, so it has a daily mode'
        : slug === null ? 'its slug does not resolve' : registry.has(slug) ? 'it is a registry daily' : 'it is not a registry game';
      findings.push({ kind: 'flag', file: rel, line: r.at, what: `${slug ?? r.args[0]} passes a literal false as its ranked flag, and ${why}: a daily game with false loses its day board, its points and its daily tick without anything noticing` });
    }
    if (!multiMode) continue;
    multi.push(rel);
    for (const d of direct) {
      findings.push({ kind: 'direct', file: rel, line: d.at, what: `recordCompletion(${d.args[0]}) called directly in a file with a daily and another mode: the ranked flag lives on useGameCompletion, so this writes the signed in save and the daily key whatever the mode` });
    }
    for (const m of onMount) {
      findings.push({ kind: 'direct', file: rel, line: code.slice(0, m.index).split('\n').length, what: 'a ResultScreen recordCompletionOnMount in a file with a daily and another mode: that card records ranked on mount whatever the mode, so a free finish writes the day board, the points and the daily key; record through useGameCompletion with the ranked flag instead' });
    }
    for (const r of recs) {
      const slug = resolveSlug(code, r.args[0]) ?? r.args[0];
      const base = baseline.find(b => b.file === rel && b.slug === slug);
      if (base) { baselineHits.add(`${rel}|${slug}`); continue; }
      checked += 1;
      if (r.args.length >= 5) {
        const ranked = resolveExpr(code, r.args[4]);
        if (ranked === 'false' || onlyInDaily(ranked)) continue;
        findings.push({ kind: 'flag', file: rel, line: r.at, what: `${slug} passes "${ranked}" as its ranked flag, which is not true only in the daily: the flag must be a pure && chain with a mode === 'daily' term (no top level ||, ??, ternary or comma)` });
        continue;
      }
      const done = resolveExpr(code, r.args[1]);
      if (dailyScoped(done)) continue;
      const shown = done.replace(/\s+/g, ' ');
      if (onlyInDaily(done)) {
        /* The pre 645 shape: the mode ANDed into the done flag. A free finish
           then records nothing at all, not even a play. The flag is the place
           for the mode. */
        findings.push({ kind: 'gate', file: rel, line: r.at, what: `${slug} gates its done on the mode ("${shown}") instead of passing the ranked flag: a free finish is not even a play, and it is the shape that re-armed Rank 'Em's recorder on a toggle in Round 643` });
        continue;
      }
      /* Anything else, including a done that mentions the daily without
         requiring it (the Perfect Lineup engine's
         phase === 'result' && !(mode === 'daily' && dailyDone), true on every
         Unlimited finish), fires outside the daily. */
      findings.push({ kind: 'unranked', file: rel, line: r.at, what: `${slug} records on "${shown}" in a file with a daily and another mode, with no ranked flag: a free finish writes the day board, the points and the daily key` });
    }
  }
  const stale = baseline.filter(b => !baselineHits.has(`${b.file}|${b.slug}`));
  return { findings, stale, recorders, multi, checked };
}

function reportScan(res) {
  console.log(`   ${res.recorders} recorder calls read; ${res.multi.length} recorder files name the daily and are read as multi mode; ${res.checked} of their hook recorders checked, ${SINGLE_MODE_BASELINE.length} in the single mode baseline`);
  if (res.recorders < 100) fail(`only ${res.recorders} recorder calls found, the reader is broken`);
  if (res.multi.length < 20) fail(`only ${res.multi.length} multi mode files found, the reader is broken`);
  for (const f of res.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  for (const s of res.stale) fail(`SINGLE_MODE_BASELINE lists ${s.file} (${s.slug}), which matches no recorder there: remove the entry`);
  const writes = res.findings.filter(f => f.kind === 'unranked' || f.kind === 'direct');
  const gates = res.findings.filter(f => f.kind === 'gate').length;
  const flags = res.findings.filter(f => f.kind === 'flag').length;
  console.log(`   unranked writes: ${writes.length} in ${new Set(writes.map(f => f.file)).size} file(s); mode gated recorders without the flag: ${gates}; flags that are not true only in the daily: ${flags}`);
}

/* The probes: each rule of section 1 on a synthetic call site appended to one
   real file, judged by the findings it adds. `refuse` must add exactly one of
   `kind`, `pass` must add none. The file names 'daily' so it is multi mode. */
function probeSection1(files) {
  const registry = registryGames();
  const noDaily = [...registry].find(([, daily]) => !daily)?.[0];
  if (!noDaily) return ['the registry has no game without a daily to probe a literal false against'];
  const PROBES = [
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, mode === 'daily' && x || true);", 'a top level || after the daily term'],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, mode === 'daily' || true);", 'a daily term OR true'],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, mode === 'daily' ? true : true);", 'a ternary on the daily term'],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, mode === 'daily' ?? true);", 'a ?? after the daily term'],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, view === 'daily');", "a daily comparison on something that is not the mode"],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, false);", 'a literal false on a registry daily'],
    ['refuse', 'flag', 'useGameCompletion(someSlug, done, 0, 0, false);', 'a literal false on a slug that does not resolve'],
    ['refuse', 'unranked', "useGameCompletion('nfl-higher-lower', finishedToday, 0);", 'a done read off finishedToday, which ends in day but is not the daily'],
    ['refuse', 'unranked', "useGameCompletion('nfl-higher-lower', nonDailyFinish, 0);", 'a done read off nonDailyFinish, which names the daily to deny it'],
    ['refuse', 'unranked', "useGameCompletion('nfl-higher-lower', dailyish, 0);", 'a done read off dailyish'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', done, 0, 0, mode === 'daily');", 'the plain flag'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', done, 0, 0, gameState?.mode === 'daily');", 'the flag through an optional chain'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', done, 0, 0, (mode === 'daily' && phase === 'result'));", 'a daily term ANDed with more, in parentheses'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', done, 0, 0, 'daily' === playMode);", 'the flag written the other way round'],
    /* Round 674 (R2.D6): a literal false is read against the recorder's own
       mode detection first. In a file that names the daily it is refused
       whatever the registry says; in a file with no daily mode it passes
       only on a registry game with no daily. */
    ['refuse', 'flag', `useGameCompletion('${noDaily}', done, 0, 0, false);`, `a literal false on ${noDaily}, a registry game with no daily, in a file that names the daily`],
    ['pass', null, `useGameCompletion('${noDaily}', done, 0, 0, false);`, `a literal false on ${noDaily} in a file with no daily mode`, 'single'],
    ['refuse', 'flag', "useGameCompletion('nfl-higher-lower', done, 0, 0, false);", 'a literal false on a registry daily in a file with no daily mode', 'single'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', rawDailyStatus !== 'playing', 0);", 'a done read off daily state'],
    ['pass', null, "useGameCompletion('nfl-higher-lower', dailyFinish?.date === dealtDay, 0);", 'a done read off the day the daily was dealt'],
  ];
  const probe = 'src/hooks/useNflHL.ts';
  const singleProbe = 'src/hooks/__probe_singleMode.ts';
  if (!files.has(probe)) return [`the probe file ${probe} is gone, move the probes`];
  if (files.has(singleProbe)) return [`${singleProbe} exists in src, so the single mode probe would overwrite a real file`];
  const base = scan(files, SINGLE_MODE_BASELINE, registry).findings.length;
  const problems = [];
  for (const [want, kind, line, what, where] of PROBES) {
    const copy = new Map(files);
    if (where === 'single') copy.set(singleProbe, line + '\n');
    else copy.set(probe, files.get(probe) + "\nconst probeMode = 'daily';\n" + line + '\n');
    const added = scan(copy, SINGLE_MODE_BASELINE, registry).findings.slice(base);
    const ok = want === 'refuse' ? added.length === 1 && added[0].kind === kind : added.length === 0;
    if (!ok) problems.push(`probe "${what}" should be ${want === 'refuse' ? `refused as ${kind}` : 'accepted'}, the scan added ${added.length} finding(s)${added.length ? ` (${added.map(f => f.kind).join(', ')})` : ''}: ${line}`);
  }
  if (!problems.length) console.log(`   probes: ${PROBES.filter(p => p[0] === 'refuse').length} shapes refused (top level ||, ??, ternary, a non mode comparison, literal false on a daily, on an unresolved slug or in a file that names the daily, three loose daily names), ${PROBES.filter(p => p[0] === 'pass').length} accepted`);
  return problems;
}

/* ------------------------------------------------------------------------ */
/* Section 2: the lib and the hook, as code                                  */
/* ------------------------------------------------------------------------ */
function bodyOf(code, signature) {
  const start = code.indexOf(signature);
  if (start < 0) return null;
  const next = code.indexOf('\nexport ', start + 1);
  return code.slice(start, next < 0 ? code.length : next);
}
function checkLib(libRaw) {
  const problems = [];
  const lib = stripComments(libRaw);
  const body = bodyOf(lib, 'export function recordUnrankedPlay(');
  if (!body) return ['recordUnrankedPlay is not exported from src/lib/completions.ts'];
  for (const heavy of ['score', 'saveAuthCompletion(', 'getSession(', 'getUser(', 'record_auth_completion', 'daily_completions']) {
    if (body.includes(heavy)) problems.push(`recordUnrankedPlay reaches ${JSON.stringify(heavy)}, so a free run is a ranked record again`);
  }
  if (!body.includes("('game_completions')")) problems.push('recordUnrankedPlay no longer writes the anonymous game_completions row, so a free run is not a play');
  if (!/player_name:\s*playerName\s*\|\|/.test(body)) problems.push('recordUnrankedPlay no longer files the row under the name it is handed');
  if (!body.includes('recordStreakCompletion(')) problems.push('recordUnrankedPlay no longer records the local streak day, so a free run does not count as playing today');
  if (!body.includes('bumpLocalTodayCount(')) problems.push("recordUnrankedPlay no longer counts in today's games, so Games Today misses a finished free run");
  return problems;
}
function checkHook(hookRaw) {
  const problems = [];
  const hook = stripComments(hookRaw);
  const consume = hook.indexOf('if (consumeRestoredFinish(gameSlug)) return;');
  const unranked = hook.indexOf('recordUnrankedPlay(');
  const ranked = hook.indexOf('recordCompletion(');
  if (consume < 0 || unranked < 0 || ranked < 0) problems.push('the hook is missing the restore mark, the unranked door or the ranked door');
  else if (!(consume < unranked && unranked < ranked)) problems.push('the hook must consume the restore mark, then take the unranked door, then the ranked one, in that order');
  if (!/\bif\s*\(\s*!ranked\s*\)/.test(hook)) problems.push('the hook no longer branches on !ranked');
  const doors = callsOf(hook, 'recordUnrankedPlay');
  if (doors.some(d => d.args.length < 2 || !/getCurrentPlayerName\(\s*profile\s*\)/.test(d.args[1]))) problems.push('the hook hands the unranked door no name, so a signed in player with an empty name cache is filed under the guest handle');
  return problems;
}

/* ------------------------------------------------------------------------ */
/* Section 4: the card says so                                               */
/* ------------------------------------------------------------------------ */
/* The opening tag that starts at `start` ('<Name ...>' or '.../>'): a > inside
   braces (an arrow, a nested element) does not close it. */
function openingTag(code, start) {
  let depth = 0;
  let quote = '';
  for (let i = start + 1; i < code.length; i += 1) {
    const c = code[i];
    if (quote) { if (c === '\\') { i += 1; continue; } if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return null;
}
function propOf(tag, name) {
  const m = new RegExp(String.raw`\s${name}=\{`).exec(tag);
  if (!m) return null;
  let depth = 1;
  for (let i = m.index + m[0].length; i < tag.length; i += 1) {
    if (tag[i] === '{') depth += 1;
    else if (tag[i] === '}') { depth -= 1; if (depth === 0) return tag.slice(m.index + m[0].length, i).trim(); }
  }
  return null;
}
const tagsOf = (code, name) => [...code.matchAll(new RegExp(String.raw`<${name}\b`, 'g'))].map(m => ({ at: code.slice(0, m.index).split('\n').length, tag: openingTag(code, m.index) ?? '' }));
const cardFlagOk = expr => expr === 'false' || onlyInDaily(expr);
const drawsCard = code => /<ResultScreen\b|<ShareButtons\b|<UnrankedNote\b/.test(code);

function checkCards(files) {
  const findings = [];
  const surfaces = new Map();
  let recorders = 0;
  for (const [rel, raw] of files) {
    if (rel === HOOK || rel === LIB) continue;
    const code = stripComments(raw);
    const flagged = callsOf(code, 'useGameCompletion').filter(r => r.args.length >= 5 && resolveExpr(code, r.args[4]) !== 'true');
    if (!flagged.length) continue;
    recorders += flagged.length;
    let cards = rel.endsWith('.tsx') && drawsCard(code) ? [rel] : [];
    if (!cards.length) {
      const mod = '@/' + rel.replace(/^src\//, '').replace(/\.tsx?$/, '');
      cards = [...files].filter(([f, src]) => f.endsWith('.tsx') && src.includes(`from '${mod}'`) && drawsCard(stripComments(src))).map(([f]) => f);
    }
    if (!cards.length) findings.push({ kind: 'card', file: rel, line: flagged[0].at, what: 'passes the ranked flag, but no file drawing its result card was found (its own file draws none and nothing that imports it does), so nothing can say a free run is unranked' });
    for (const c of cards) surfaces.set(c, rel);
  }
  for (const [card, recorder] of surfaces) {
    const code = stripComments(files.get(card));
    const screens = tagsOf(code, 'ResultScreen');
    const notes = tagsOf(code, 'UnrankedNote');
    for (const s of screens) {
      const flag = propOf(s.tag, 'ranked');
      if (flag === null) findings.push({ kind: 'card', file: card, line: s.at, what: `draws the result card of ${recorder} with no ranked prop, so a free run shows its score with nothing saying it pays no points` });
      else if (!cardFlagOk(flag)) findings.push({ kind: 'card', file: card, line: s.at, what: `hands its ResultScreen ranked={${flag}}, which is not true only in the daily` });
    }
    if (!screens.length && !notes.length) findings.push({ kind: 'card', file: card, line: 1, what: `draws the result card of ${recorder} by hand with no UnrankedNote, so a free run shows its score with nothing saying it pays no points` });
  }
  /* Every free play line anywhere is tied to a flag that is false outside the daily. */
  for (const [rel, raw] of files) {
    if (rel === RESULT_SCREEN) continue;
    const code = stripComments(raw);
    for (const n of tagsOf(code, 'UnrankedNote')) {
      const flag = propOf(n.tag, 'ranked');
      if (flag === null || !cardFlagOk(flag)) findings.push({ kind: 'card', file: rel, line: n.at, what: `renders the free play line with ranked={${flag ?? 'nothing'}}, which is not true only in the daily` });
    }
  }
  return { findings, surfaces, recorders };
}
/* Round 674 (R2.D5): which boards draw their own card, which driver renders
   each, and what every driver's finished page must carry. A board draws its
   own card when it renders the line itself and no ResultScreen. A driver
   renders a file when the file is in the import closure of the driver (its
   own imports and the shared helpers it reads, followed through @/ and
   relative imports into src). */
function handCards(files, cards) {
  return [...cards.surfaces.keys()].filter(card => {
    const code = stripComments(files.get(card) ?? '');
    return /<UnrankedNote\b/.test(code) && !/<ResultScreen\b/.test(code);
  }).sort();
}
function resolveImport(fromRel, spec) {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  else return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (!/\.tsx?$/.test(cand)) continue;
    const abs = path.join(ROOT, cand);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return cand;
  }
  return null;
}
const importCache = new Map();
function importsOf(rel) {
  if (!importCache.has(rel)) {
    const code = stripComments(readLF(rel));
    const specs = [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g)].map(m => m[1] ?? m[2] ?? m[3]);
    importCache.set(rel, specs.map(s => resolveImport(rel, s)).filter(Boolean));
  }
  return importCache.get(rel);
}
function closureOf(rel) {
  const seen = new Set([rel]);
  const queue = [rel];
  while (queue.length) for (const next of importsOf(queue.shift())) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  return seen;
}
/* Keyed by the driver's file name: the drill drivers build their slug at
   run time, and the file name is what the test's glob hands it too. */
function driverRows() {
  const rows = [];
  for (const e of fs.readdirSync(path.join(ROOT, DRIVERS_DIR)).sort()) {
    if (!/\.driver\.tsx$/.test(e)) continue;
    const rel = `${DRIVERS_DIR}/${e}`;
    rows.push({ rel, key: e, closure: closureOf(rel) });
  }
  if (rows.length < 20) abort(`only ${rows.length} daily reload drivers read from ${DRIVERS_DIR}, the reader is broken`);
  return rows;
}
/* What each driver's finished page must carry outside the shared card: 1
   when it renders a board that draws its own card, else 0. Then which of
   those boards no driver renders, against the baseline. */
function renderedCards(files, cards) {
  const hand = handCards(files, cards);
  const rows = driverRows();
  const expect = {};
  for (const r of rows) expect[r.key] = hand.some(h => r.closure.has(h)) ? 1 : 0;
  const rendered = new Map(hand.map(h => [h, rows.filter(r => r.closure.has(h)).map(r => r.key.replace(/\.driver\.tsx$/, ''))]));
  const findings = [];
  for (const [h, slugs] of rendered) {
    const base = RENDER_BASELINE.find(b => b.file === h);
    if (!slugs.length && !base) findings.push({ kind: 'card', file: h, line: 1, what: 'draws its own result card, and no daily reload driver renders it to a finish, so nothing shows its free play line lands on that card: add a driver or a RENDER_BASELINE entry with the reason' });
    if (slugs.length && base) findings.push({ kind: 'card', file: h, line: 1, what: `is in RENDER_BASELINE, but ${slugs.join(', ')} now render it: remove the entry` });
  }
  for (const b of RENDER_BASELINE) if (!rendered.has(b.file)) findings.push({ kind: 'card', file: b.file, line: 1, what: 'is in RENDER_BASELINE but no longer draws its own card with the line: remove the entry' });
  return { hand, rows, expect, rendered, findings };
}
function checkScreenPassesFlag(screenRaw) {
  const code = stripComments(screenRaw);
  const note = tagsOf(code, 'UnrankedNote');
  return note.length === 1 && /\branked\b/.test(propOf(note[0].tag, 'ranked') ?? '') ? [] : ['ResultScreen no longer renders one UnrankedNote from its ranked prop'];
}

/* ------------------------------------------------------------------------ */
/* Section 5: games today                                                    */
/* ------------------------------------------------------------------------ */
function checkGamesToday(files) {
  const problems = [];
  const code = rel => stripComments(files.get(rel) ?? '');
  if (!/export function readTodayRows\(/.test(code(GAMES_TODAY)) || !/export function mergeGamesToday\(/.test(code(GAMES_TODAY))) problems.push(`${GAMES_TODAY} no longer exports readTodayRows and mergeGamesToday`);
  const nav = code(NAVBAR);
  if (!/\breadTodayRows\(\s*playerName\s*\)/.test(nav) || !/\bmergeGamesToday\(/.test(nav)) problems.push('the game header no longer reads games today through src/lib/gamesToday.ts');
  const prof = code(PROFILE);
  if (!/\breadOwnTodayRows\(/.test(prof) || !/const gamesToday = mergeGamesToday\(/.test(prof)) problems.push("the profile's Games Today tile no longer reads through src/lib/gamesToday.ts, so it can disagree with the header");
  if (/['"]daily_completions['"]/.test(prof)) problems.push('the profile reads daily_completions again, which a free run never ticks');
  return problems;
}

/* ------------------------------------------------------------------------ */
/* Vitest                                                                    */
/* ------------------------------------------------------------------------ */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
/* Round 674: what every driver row of unrankedCards.test.tsx must carry,
   read from the source once and handed to every run (section 4). */
let cardExpect = null;
function runSuite(env) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  if (!cardExpect) abort('the rendered card expectations were not read before vitest ran');
  const out = path.join(os.tmpdir(), `rankedRecorder-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  /* The default reporter too: the rows' UNRANKED_CARD_ROW lines and a
     control copy's load line reach this process only through it. */
  const r = spawnSync(process.execPath, [VITEST, 'run', ...TESTS, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, UNRANKED_CARD_EXPECT: JSON.stringify(cardExpect), CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const text = ((r.stdout || '') + (r.stderr || '')).split(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')).join('');
  if (!fs.existsSync(out)) return { error: 'vitest wrote no report:\n' + text.slice(-3000) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const tests = [];
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.push({ file: path.basename(file.name), title: a.fullName || a.title, status: a.status, message: (a.failureMessages || []).join('\n').split('\n')[0] });
    }
  }
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  const cardRows = [...text.matchAll(/UNRANKED_CARD_ROW (\{.*\})/g)].map(m => JSON.parse(m[1]));
  return { code: r.status, tests, loadError, text, cardRows };
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
if (!CONTROL) {
  console.log('1) The source: every recorder in src, read as code');
  const files = srcFiles();
  const res = scan(files);
  reportScan(res);
  /* Prose is not code: the four shapes written into comments flag nothing,
     and the same four written as code flag four, so the prose check is not
     green only because the shapes could never be seen. */
  const probe = 'src/hooks/useNflHL.ts';
  const SHAPES = [
    "useGameCompletion('nfl-hl', gameState?.gameStatus === 'won', 0);",
    "recordCompletion('/nfl-hl');",
    "useGameCompletion('nfl-hl', finished, score, 0, true);",
    'const card = <ResultScreen recordCompletionOnMount />;',
  ];
  const asCode = new Map(files);
  asCode.set(probe, files.get(probe) + '\n' + SHAPES.join('\n') + '\n');
  const codeRes = scan(asCode);
  const prose = new Map(files);
  prose.set(probe, files.get(probe) + '\n/* ' + SHAPES.slice(0, 2).join(' ') + ' */\n' + SHAPES.slice(2).map(s => `// ${s}`).join('\n') + '\n');
  const proseRes = scan(prose);
  if (codeRes.findings.length - res.findings.length !== SHAPES.length) fail(`the four shapes written as code added ${codeRes.findings.length - res.findings.length} finding(s), not ${SHAPES.length}: the scan cannot see them, so the prose check below proves nothing`);
  else if (proseRes.findings.length !== res.findings.length) fail(`the scan read a comment as code: ${proseRes.findings.length - res.findings.length} finding(s) from prose`);
  else console.log(`   prose check: an unflagged recorder, a direct call, a literal flag and an on mount card flag ${SHAPES.length} as code and nothing written in comments`);
  for (const p of probeSection1(files)) fail(p);

  console.log('\n2) The lib and the hook, as code');
  const libProblems = checkLib(readLF(LIB));
  const hookProblems = checkHook(readLF(HOOK));
  for (const p of [...libProblems, ...hookProblems]) fail(p);
  if (!libProblems.length) console.log("   recordUnrankedPlay: the anonymous row under the name it is handed, the streak day and today's games, nothing heavier");
  if (!hookProblems.length) console.log('   the hook consumes the mark, then routes on ranked, and the unranked door gets getCurrentPlayerName(profile) like the ranked one');

  console.log('\n4) The card says so: every card of a flagged recorder carries the free play line');
  const cards = checkCards(files);
  for (const f of cards.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  for (const p of checkScreenPassesFlag(files.get(RESULT_SCREEN))) fail(p);
  if (cards.recorders < 30 || cards.surfaces.size < 30) fail(`only ${cards.recorders} flagged recorders and ${cards.surfaces.size} cards found, the card reader is broken`);
  if (!cards.findings.length) console.log(`   ${cards.recorders} flagged recorders, ${cards.surfaces.size} result cards, every one says when a run is free play; ResultScreen renders the line from its ranked prop`);
  /* Round 674 (R2.D5): the boards that draw their own card, rendered. */
  const rc = renderedCards(files, cards);
  cardExpect = rc.expect;
  for (const f of rc.findings) fail(`${f.file}: ${f.what}`);
  const renderedHand = [...rc.rendered].filter(([, s]) => s.length);
  console.log(`   ${rc.hand.length} boards draw their own card: ${renderedHand.length} rendered to a finished daily by a driver (${renderedHand.map(([h, s]) => `${path.basename(h, '.tsx')} by ${s.join(', ')}`).join('; ')}), ${RENDER_BASELINE.length} in RENDER_BASELINE (${RENDER_BASELINE.map(b => path.basename(b.file, '.tsx')).join(', ')})`);
  console.log(`   ${rc.rows.length} driver rows, ${Object.values(rc.expect).filter(v => v === 1).length} of them must show a board's own line on the finished card, the rest none outside the shared card`);

  console.log('\n5) Games today: one read for the header and the profile');
  const todayProblems = checkGamesToday(files);
  for (const p of todayProblems) fail(p);
  if (!todayProblems.length) console.log('   the game header and the profile tile both count games today through src/lib/gamesToday.ts');

  console.log(`\n3) Rendered, sections 3 and 4: ${TESTS.join(', ')}`);
  const run = runSuite({});
  if (run.error) fail(run.error);
  else {
    if (!run.tests.length) fail('vitest reported no tests:\n' + run.text.slice(-2000));
    for (const t of run.tests) {
      console.log(`   ${t.status === 'passed' ? 'ok  ' : 'RED '}${t.title}${t.status === 'passed' ? '' : `: ${t.message}`}`);
      if (t.status !== 'passed') fail(`${t.file}: ${t.title}`);
    }
    for (const t of TESTS) if (!run.tests.some(x => x.file === path.basename(t))) fail(`vitest reported no case from ${t}`);
    /* Every driver row printed what it saw, and its own lines are the ones
       the source said to expect (the row's assertion, read again here so a
       row that never ran cannot pass). */
    const seen = new Map(run.cardRows.map(r => [r.file, r]));
    for (const [file, want] of Object.entries(cardExpect)) {
      const row = seen.get(file);
      if (!row) fail(`unrankedCards.test.tsx printed no row for ${file}`);
      else if (row.own !== want || row.live !== 0) fail(`${file}: the finished page shows ${row.own} free play line(s) of its own (want ${want}) and ${row.live} on the live board (want 0)`);
    }
    if (seen.size) console.log(`   rendered cards: ${seen.size} driver rows played their daily to the finish; ${[...seen.values()].filter(r => r.own === 1).length} show the board's own free play line on the finished card, none on a live board`);
    if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every case green, read its output:\n${run.text.slice(-2000)}`);
    console.log(`   vitest exit ${run.code}, ${run.tests.length} cases`);
  }

  if (failures) { console.error(`\nsimRankedRecorder: ${failures} failure(s)`); process.exit(1); }
  console.log(`\nsimRankedRecorder: all green (${res.recorders} recorders read, ${res.multi.length} multi mode files, 0 unranked writes, ${cards.surfaces.size} cards say so, ${run.tests.length} rendered cases)`);
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
/* A source control's own section, run on a file map (sections 1, 4 and 5) or
   on the rewritten file (section 2): the number of findings it reports. */
function sectionFindings(section, files) {
  if (section === 1) return scan(files).findings;
  if (section === 4) { const cards = checkCards(files); return [...cards.findings, ...renderedCards(files, cards).findings]; }
  if (section === 5) return checkGamesToday(files).map(what => ({ kind: 'today', file: PROFILE, what }));
  return [];
}
const which = CONTROL === 'all' ? ALL : [CONTROL];
{
  const files = srcFiles();
  cardExpect = renderedCards(files, checkCards(files)).expect;
}
/* Round 674: a per run folder (scripts/lib/controlScratch.mjs), never the
   fixed dist/.ranked-control every run at once shared. */
const scratch = controlScratch(ROOT, 'ranked-control');
const controlDir = scratch.dir;
let fired = 0;
try {
  for (const name of which) {
    if (name === 'stale') {
      console.log('\nNEGATIVE CONTROL stale: a baseline entry that matches no recorder');
      const files = srcFiles();
      const before = scan(files);
      const after = scan(files, [...SINGLE_MODE_BASELINE, { file: 'src/hooks/useNflHL.ts', slug: 'nfl-higher-lower-questions', why: 'control' }]);
      if (before.stale.length === 0 && after.stale.length === 1) { fired += 1; console.log('   control stale fired: the scan reports exactly the added entry as stale'); }
      else fail(`control stale: expected one stale entry, the scan reports ${after.stale.length} (${before.stale.length} before)`);
      continue;
    }
    if (SCAN_CONTROLS[name]) {
      const ctl = SCAN_CONTROLS[name];
      console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
      const files = srcFiles();
      if (!files.has(HOOK)) files.set(HOOK, readLF(HOOK));
      const src = files.get(ctl.file);
      if (!src || count(src, ctl.from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(ctl.from)}`);
      if (count(stripComments(src), ctl.from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
      const rewritten = src.replace(ctl.from, ctl.to);
      if (ctl.section === 2) {
        const before = checkHook(src);
        const after = checkHook(rewritten);
        const lib = checkLib(readLF(LIB));
        for (const p of after) console.log(`   section 2 on the rewritten hook: ${p}`);
        if (before.length === 0 && lib.length === 0 && after.length === 1 && ctl.expect.test(after[0])) { fired += 1; console.log(`   control ${name} fired: section 2 reports exactly this, in memory only, src untouched`); }
        else fail(`control ${name}: expected section 2 to report exactly one problem matching ${ctl.expect}, it reports ${after.length} (${before.length} before)`);
        continue;
      }
      const others = [1, 4, 5].filter(s => s !== ctl.section);
      const beforeOwn = sectionFindings(ctl.section, files);
      const beforeOthers = others.map(s => sectionFindings(s, files).length);
      files.set(ctl.file, rewritten);
      const afterOwn = sectionFindings(ctl.section, files);
      const afterOthers = others.map(s => sectionFindings(s, files).length);
      const added = afterOwn.filter(f => !beforeOwn.some(b => b.file === f.file && b.what === f.what));
      for (const f of added) console.log(`   section ${ctl.section} flagged ${f.kind}: ${f.file}${f.line ? `:${f.line}` : ''}: ${f.what}`);
      const onTarget = added.length === 1 && added[0].file === ctl.file && (!ctl.kind || added[0].kind === ctl.kind);
      const quiet = afterOthers.every((n, i) => n === beforeOthers[i]);
      if (!onTarget) fail(`control ${name}: expected exactly one ${ctl.kind ?? ''} finding in ${ctl.file} from section ${ctl.section}, it added ${added.length}`);
      else if (!quiet) fail(`control ${name}: section ${ctl.section} fired, but so did another section (${others.map((s, i) => `${s}: ${beforeOthers[i]} to ${afterOthers[i]}`).join(', ')})`);
      else { fired += 1; console.log(`   control ${name} fired: section ${ctl.section} flags exactly ${ctl.file} and no other section moves, in memory only, src untouched`); }
      continue;
    }
    const ctl = VITEST_CONTROLS[name];
    console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
    const src = readLF(ctl.file);
    let copy = src;
    for (const [from, to] of ctl.edits ?? [[ctl.from, ctl.to]]) {
      if (count(copy, from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(from)}`);
      if (count(stripComments(copy), from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
      copy = copy.replace(from, to);
    }
    if (copy === src) abort(`control ${name} cannot run: the rewrite changed nothing`);
    if (/from '\.\.?\//.test(copy)) abort(`control ${name} cannot run: ${ctl.file} has a relative import, which a copy elsewhere cannot resolve`);
    /* The source check that reads this module, on the copy, in memory. */
    if (ctl.check) {
      const problems = ctl.check === 'lib' ? checkLib(copy) : ctl.check === 'hook' ? checkHook(copy) : checkScreenPassesFlag(copy);
      const where = ctl.check === 'screen' ? "section 4's ResultScreen check" : 'section 2';
      if (!problems.length) { fail(`control ${name}: ${where} stayed green on the rewritten ${ctl.check}`); continue; }
      for (const p of problems) console.log(`   ${where} on the copy: ${p}`);
      console.log(`   ${where} went red on the rewritten ${ctl.check}, as it should`);
    }
    const dir = path.join(controlDir, name);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, path.basename(ctl.file));
    fs.writeFileSync(file, withLoadedLine(copy, scratch.tag, name));
    console.log(`   ${ctl.file} copied to ${path.relative(ROOT, file).replaceAll('\\', '/')} with the anchor rewritten, src untouched`);
    const target = file.replaceAll('\\', '/');
    const env = ctl.alias === 'NO_DOUBLE_SWAP' ? { NO_DOUBLE_SWAP: JSON.stringify({ [ctl.module]: target }) } : { [ctl.alias]: target };
    const run = runSuite(env);
    if (run.error) { fail(run.error); continue; }
    if (run.loadError && !run.tests.length) { fail(`control ${name}: the copy did not load, so every red is a crash:\n${run.loadError}`); continue; }
    if (!run.text.includes(loadedLine(scratch.tag, name))) { fail(`control ${name}: the copy never printed its load line, so the suite did not run on it`); continue; }
    console.log(`   the copy printed its load line for this run (${scratch.tag})`);
    let red = 0;
    let wrong = 0;
    for (const t of run.tests) {
      const isRed = t.status !== 'passed';
      const shouldBeRed = t.file === ctl.testFile && ctl.red.test(t.title);
      const ok = isRed === shouldBeRed;
      if (isRed) red += 1;
      if (!ok) wrong += 1;
      if (isRed || !ok) console.log(`   ${ok ? 'ok  ' : 'BAD '}${t.title.padEnd(70)} ${isRed ? 'red  ' : 'green'} (${shouldBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    }
    for (const t of TESTS) if (!run.tests.some(x => x.file === path.basename(t))) { wrong += 1; console.log(`   BAD no case reported from ${t}`); }
    console.log(`   ${run.tests.length - red} other case(s) green, as they must be`);
    if (wrong) fail(`control ${name}: ${wrong} case(s) did not answer the control the way they must`);
    else if (red === 0) fail(`control ${name}: nothing went red, so the cases it targets are not proving anything`);
    else { fired += 1; console.log(`   control ${name} fired: ${red} red, exactly the ones it should, every other one green`); }
  }
} finally {
  scratch.cleanup();
}

if (failures || fired !== which.length) {
  console.error(`\nsimRankedRecorder: control ${CONTROL} did not fire as it should (${failures} failure(s))`);
  process.exit(1);
}
console.log(`\nsimRankedRecorder: RANKED_CONTROL=${CONTROL} fired exactly where it should, so the checks it targets can fail`);
