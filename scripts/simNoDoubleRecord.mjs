/* No double record harness: the same finish is never recorded twice.

   Round 643. A read only audit on 2026-09-19 proved, with probes, that a
   finished game was recorded again in five shapes. The world board takes the
   day's best so it did not move, but every extra record paid the raw score
   into a signed in player's total again and added a play row:

     fight    Fight Career, Fight Gym and Fight Promoter restored a finished
              save in an effect after mount with no markRestoredFinish
     career   the four My Careers flipped done false then true on every
              Resume coaching then Back, paying the whole legacy again
     slug     twelve daily hooks marked a restored finish under their storage
              name (nfl-hl, ufc-game, football-connect4, career-path) while
              the recorder asked under another, so the mark was never used
     toggle   ten pages gated the recorder on the mode, so Unlimited and back
              re-armed it over a daily already recorded
     restore  six hooks restored a finish after their data loaded with no
              mark, and NFL Career Path re-armed on its Daily tab and recorded
              again from a Play Unlimited that never left the daily

   A review of the round then found the fix itself losing records: three
   games recorded off a board that waits out each reveal, so a reload inside
   the final reveal found the day finished, marked it and never recorded it.

   SECTION 1, THE TABLE. src/test/noDoubleRecord.test.tsx, one row per game
   and one check per step a row cannot take. A row mounts the REAL board, page
   or hook with the real useGameCompletion, the real restoredFinish handshake
   and jsdom's real localStorage, plays the finish (which must record exactly
   once), then a mode toggle and back, three coaching round trips, any replay
   path, and two reloads that must come back finished, and holds the recorder
   at one call throughout. The checks cover a reload inside a reveal, the next
   day in the same tab, a record's score, and the bracket's crowned names.
   Measured on the unfixed modules (origin/main swapped in): every one of the
   41 rows red.

   SECTION 2, THE SOURCE. A row can only hold the games somebody listed, so
   this reads every recorder in src as code (comments stripped) and fails on
   the two shapes the next offender will have: a file whose useGameCompletion
   slug differs from the slug it hands markRestoredFinish or useDailyPuzzle's
   gameSlug, and a recorder whose done flag is ANDed with a mode check. The
   mode gates that exist today and were each traced safe are a ratchet,
   MODE_GATE_BASELINE, with the reason beside each: a new one fails, and an
   entry that no longer matches must leave the list.

   SECTION 3, THE REVEAL TIMERS (Round 674). Every Higher or Lower hook
   (src/hooks/use<Sport>HL.ts and useHigherLower.ts) takes its reveal timer
   from useOwnedTimeouts, which clears it when the page unmounts, and starts
   no bare setTimeout. The hockey hook's bare two second timer fired after
   the table's teardown ("window is not defined"), so vitest exited 1 with
   every row green: a coin toss red for a lane that gates in parallel. The
   helper's own behaviour (tap, unmount, nothing fires) is fenced by
   scripts/simIdleTimers.mjs; this reads that every hook uses it, as code.
   Round 674 fix (the review's M10): no reference to setTimeout at all (a
   call, .call, .apply, window.setTimeout, an alias), the name bound to
   useOwnedTimeouts() must be called, and every page routed at a
   higher-lower address in src/App.tsx is read too, which is how the
   Transfer Market page's bare 1400 ms reveal was found and fixed. Every
   run writes the shapes the first scan let through into the hockey hook
   and requires each to flag it.

   NEGATIVE CONTROLS (house rule: prove each check can fail). The vitest ones
   edit a COPY of one module in a folder of their own (a per run mkdtemp
   under ROOT/.sim-control, scripts/lib/controlScratch.mjs, never under
   dist), refuse to run unless their anchor
   occurs exactly once in that module as code, and point vitest at the copy
   through the NO_DOUBLE_SWAP alias in vitest.config.ts; src is never written.
   Every copy prints a line naming its own run when it loads, and a control
   whose copy never printed is refused, so a red cannot be another run's
   copy or the real module. Every test is then judged: the ones the control
   targets must go red on their own assertion, every other must stay green.
     nomark        markRestoredFinish is a no-op; every row and check whose
                   reload relies on the mark (usesMark) goes red
     slugdrift     useNflHL's slug pair back to its old mismatch; only the
                   nfl-higher-lower row
     togglerearm   Rank 'Em's recorder gets its mode check back; only rank-em
     coachflip     the NFL My Career's done back to the retired screen alone;
                   only nfl-my-career, on its first coaching round trip
     playunlimited NFL Career Path's Play Unlimited stays in the daily again;
                   only nfl-career, on its replay step
     olddaily      useDailyPuzzle trusts a stored 'playing' again; only
                   transfer-path, reading its pre Round 643 save
     maxguess      the restore re-decides through maxGuesses again; only the
                   Football Grid check (a save made with Unlimited on)
     unpinned      the three reveal games read the day on every render again;
                   only their three "renders after midnight" checks (the
                   daily lands under the next day)
     daykeyed      the previous push's shape, that and the daily state keyed
                   to the render's day; all six after midnight checks, the
                   "final pick after midnight" three on the lost record
     lateday       the three reveal games move their daily state when the
                   reveal ends again; only their six inside the reveal checks
     nflstamp      NFL Career Path stamps its finish with the clock again;
                   only its dealt before midnight check
     nflgiveup     NFL Career Path records the clue score on a give up again;
                   only the nfl-career row, on its score
     hlscore       NFL Higher or Lower records the score on screen again;
                   only the nfl-higher-lower row, on its score
   The source ones rewrite one file in memory and run their section on it:
     scanslug      useNflHL's slug pair back to its mismatch; exactly that
                   file flagged for its slug (section 2)
     scanmode      Rank 'Em's recorder ANDed with its mode again; exactly that
                   file flagged for its mode gate (section 2)
     hltimer       useHockeyHL's reveal timer back to a bare setTimeout;
                   exactly that file flagged (section 3), section 2 unmoved
     hltimercall   the review's M10: useHockeyHL's reveal through
                   setTimeout.call(window, ...); exactly that file flagged
     hlpage        the Transfer Market page's reveal back to a bare
                   setTimeout; exactly that page flagged
   and every run also proves the scans read code, not prose: the same shapes
   written into a comment flag nothing.
     NO_DOUBLE_CONTROL=all runs every control in turn. A control run exits 0
     when it fired exactly as it should and 1 when it did not.

   Run: node scripts/simNoDoubleRecord.mjs
        NO_DOUBLE_ONLY=rank-em node scripts/simNoDoubleRecord.mjs   (one row)
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments, callsOf, resolveSlug, resolveExpr, readLF as readSourceLF, srcFiles as sourceFiles } from './lib/readSource.mjs';
import { controlScratch, loadedLine, withLoadedLine } from './lib/controlScratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/noDoubleRecord.test.tsx';
const CONTROL = process.env.NO_DOUBLE_CONTROL || '';
const ONLY = process.env.NO_DOUBLE_ONLY || '';

/* What the table must hold, as the test file's own exact counts say. */
const EXPECTED_ROWS = 41;
const EXPECTED_CHECKS = 26;

/* Each vitest control is one or more edits, each to a copy of one module. */
const REVEAL_HOOKS = [
  ['src/hooks/useChampOrNot.ts', 'Answers'],
  ['src/hooks/useWhodTheyBeat.ts', 'Answers'],
  ['src/hooks/useSilverwareSort.ts', 'Results'],
];
const VITEST_CONTROLS = {
  nomark: {
    edits: [{ file: 'src/lib/restoredFinish.ts', from: '  marks.set(gameSlug, Date.now());', to: '  void gameSlug; /* NO_DOUBLE_CONTROL=nomark: the mark is dropped */' }],
    why: 'markRestoredFinish is a no-op, so every restore that relies on it records again',
    red: row => row.usesMark,
    point: /records nothing|recorded once/,
  },
  slugdrift: {
    edits: [{ file: 'src/hooks/useNflHL.ts', from: "    gameSlug: 'nfl-higher-lower',\n    storageSlug: 'nfl-hl',", to: "    gameSlug: 'nfl-hl'," }],
    why: "NFL Higher or Lower marks its restore under 'nfl-hl' again while the recorder asks under 'nfl-higher-lower'",
    red: row => row.title === 'nfl-higher-lower',
    point: /records nothing/,
  },
  togglerearm: {
    edits: [{ file: 'src/pages/RankEm.tsx', from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);", to: "useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);" }],
    why: "Rank 'Em gates the recorder on the mode again, so Unlimited and back re-arms it",
    red: row => row.title === 'rank-em',
    point: /records nothing/,
  },
  coachflip: {
    edits: [{ file: 'src/components/nfl-my-career/NflMyCareerBoard.tsx', from: "  const done = phase === 'retired' || phase === 'coach';", to: "  const done = phase === 'retired';" }],
    why: 'the NFL My Career counts only the retired screen as done again, so every coaching round trip re-arms the recorder',
    red: row => row.title === 'nfl-my-career',
    point: /coaching round trip 1 records nothing/,
  },
  playunlimited: {
    edits: [{ file: 'src/hooks/useNFLCareer.ts', from: "  const nextUnlimited = useCallback(() => {\n    setMode('unlimited');\n", to: '  const nextUnlimited = useCallback(() => {\n' }],
    why: "NFL Career Path's Play Unlimited deals a random player inside the daily again, and solving him overwrites today's save",
    red: row => row.title === 'nfl-career',
    point: /Play Unlimited leaves the daily/,
  },
  olddaily: {
    edits: [{
      file: 'src/hooks/useDailyPuzzle.ts',
      from: "      if (saved.gameStatus === 'playing' && puzzle != null && Array.isArray(saved.guesses)) {\n        if (isWon(saved.guesses, puzzle)) saved.gameStatus = 'won';\n        else if (isLost && isLost(saved.guesses, puzzle)) saved.gameStatus = 'lost';\n      }\n",
      to: '',
    }],
    why: "useDailyPuzzle trusts a stored 'playing' again, so a Transfer Path give up saved before Round 643 comes back unmarked",
    red: row => row.title === 'transfer-path',
    point: /reload 1 records nothing/,
  },
  maxguess: {
    edits: [{
      file: 'src/hooks/useDailyPuzzle.ts',
      from: "        else if (isLost && isLost(saved.guesses, puzzle)) saved.gameStatus = 'lost';",
      to: "        else if (saved.guesses.length >= maxGuesses || (isLost && isLost(saved.guesses, puzzle))) saved.gameStatus = 'lost';",
    }],
    why: "the restore re-decides through maxGuesses again, so a Football Grid save made with Unlimited on comes back a loss with Unlimited off",
    red: row => row.title === 'football-grid: a playing save past the limit, read with Unlimited off',
    point: /restored as playing/,
  },
  unpinned: {
    edits: REVEAL_HOOKS.map(([file]) => ({ file, from: '  const today = useRef(getTodayET()).current;', to: '  const today = getTodayET();' })),
    why: "Champ or Not, Who'd They Beat and Silverware Sort read the day on every render again, so a board that renders after midnight saves its daily under the next day",
    red: row => row.title.endsWith(': the board renders after midnight ET before the final pick'),
    point: /next day/,
  },
  daykeyed: {
    /* The previous push's shape: the day read on every render AND the daily
       state keyed to it, which lost the final pick after midnight. */
    edits: REVEAL_HOOKS.flatMap(([file, item]) => {
      const lower = item.toLowerCase();
      const type = item === 'Answers' ? 'boolean[]' : 'BoardResult[]';
      return [
        { file, from: '  const today = useRef(getTodayET()).current;', to: '  const today = getTodayET();' },
        {
          file,
          from: `  const [daily${item}, setDaily${item}] = useState<${type}>(() => readDaily(today)?.${lower} ?? []);`,
          to: `  const [dailyKeyed, setDailyKeyed] = useState<{ day: string; ${lower}: ${type} }>(() => ({ day: today, ${lower}: readDaily(today)?.${lower} ?? [] }));\n  const daily${item} = dailyKeyed.day === today ? dailyKeyed.${lower} : [];\n  const setDaily${item} = (next: ${type}) => setDailyKeyed({ day: today, ${lower}: next });`,
        },
      ];
    }),
    why: "the three reveal games go back to the previous push's shape, the day read on every render with the daily state keyed to it, so a final pick after midnight ET is never recorded",
    red: row => / after midnight ET/.test(row.title),
    point: /after midnight/,
  },
  lateday: {
    edits: REVEAL_HOOKS.map(([file, item]) => ({
      file,
      from: `      setDaily${item}(next);\n    }\n    clearReveal();\n    revealTimer.current = window.setTimeout(() => {\n      revealTimer.current = null;\n`,
      to: `    }\n    clearReveal();\n    revealTimer.current = window.setTimeout(() => {\n      revealTimer.current = null;\n      if (mode === 'daily') setDaily${item}(next);\n`,
    })),
    why: "the three reveal games move their daily state when the reveal ends again, not with the save, so a reload or a mode change inside the final reveal loses the record",
    red: row => / inside the final reveal$/.test(row.title),
    point: /recorded once|back on the daily/,
  },
  nflstamp: {
    edits: [{
      file: 'src/hooks/useNFLCareer.ts',
      from: '    persistDaily(dealtDay, status, clues, guesses);\n    setDailyFinish({ date: dealtDay, score: dailyScoreOf(status, clues) });\n',
      to: '    persistDaily(getTodayET(), status, clues, guesses);\n    setDailyFinish({ date: getTodayET(), score: dailyScoreOf(status, clues) });\n',
    }],
    why: 'NFL Career Path stamps its finish with the clock again, so a daily dealt before midnight and solved after it lands on the next day',
    red: row => row.title === 'nfl-career: a daily dealt before midnight and solved after it',
    point: /dealt|midnight|next day/,
  },
  nflgiveup: {
    edits: [{
      file: 'src/hooks/useNFLCareer.ts',
      from: "  return status === 'won' ? Math.max(1, TOTAL_CLUES + 1 - cluesRevealed) : 0;",
      to: '  return Math.max(1, TOTAL_CLUES + 1 - cluesRevealed);',
    }],
    why: 'NFL Career Path records the clue score whatever the outcome again, so a give up at the first clue records 6',
    red: row => row.title === 'nfl-career',
    point: /the score the finish earned/,
  },
  hlscore: {
    edits: [{
      file: 'src/hooks/useNflHL.ts',
      from: "  useGameCompletion('nfl-higher-lower', rawDailyStatus !== 'playing', dailyScore);",
      to: "  useGameCompletion('nfl-higher-lower', rawDailyStatus !== 'playing', totalScore);",
    }],
    why: 'NFL Higher or Lower records the score on screen again, which waits for the final reveal, so the record is one round short',
    red: row => row.title === 'nfl-higher-lower',
    point: /whole finished score/,
  },
};
const moduleOf = file => '@/' + file.replace(/^src\//, '').replace(/\.(ts|tsx)$/, '');
const SCAN_CONTROLS = {
  scanslug: {
    file: 'src/hooks/useNflHL.ts',
    from: "    gameSlug: 'nfl-higher-lower',\n    storageSlug: 'nfl-hl',",
    to: "    gameSlug: 'nfl-hl',",
    kind: 'slug',
    why: "useNflHL hands useDailyPuzzle 'nfl-hl' while it records 'nfl-higher-lower'",
  },
  scanmode: {
    file: 'src/pages/RankEm.tsx',
    from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);",
    to: "useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);",
    kind: 'mode',
    why: "Rank 'Em's recorder is ANDed with its mode again",
  },
  hltimer: {
    file: 'src/hooks/useHockeyHL.ts',
    from: '      later(() => {\n',
    to: '      setTimeout(() => {\n',
    kind: 'timer',
    section: 3,
    why: "NHL Higher or Lower's reveal timer is a bare setTimeout again, which fires after the page is gone",
  },
  /* Round 674 fix, the review's M10: the first scan looked for the token
     "setTimeout(" and let this through. */
  hltimercall: {
    file: 'src/hooks/useHockeyHL.ts',
    from: '      later(() => {\n',
    to: '      setTimeout.call(window, () => {\n',
    kind: 'timer',
    section: 3,
    why: "NHL Higher or Lower's reveal goes through setTimeout.call(window, ...), a bare timer the token scan did not see",
  },
  /* Round 674 fix: the eleventh Higher or Lower game runs its own reveal on
     its page, which the hook only scan never read. */
  hlpage: {
    file: 'src/pages/HigherLowerTransfers.tsx',
    from: '    later(() => {\n',
    to: '    setTimeout(() => {\n',
    kind: 'timer',
    section: 3,
    why: "Transfer Market's reveal timer is a bare setTimeout again, on a page and not a hook",
  },
};
const ALL = [...Object.keys(VITEST_CONTROLS), ...Object.keys(SCAN_CONTROLS)];
if (CONTROL && CONTROL !== 'all' && !ALL.includes(CONTROL)) {
  console.error(`NO_DOUBLE_CONTROL=${CONTROL} is not a control this harness knows (${ALL.join(', ')}, all)`);
  process.exit(1);
}
if (CONTROL && ONLY) {
  console.error('a control judges the whole table, so it cannot run with NO_DOUBLE_ONLY');
  process.exit(1);
}

/* The mode gated recorders that exist today, each traced and safe, with why.
   Keyed by file and recorder slug expression. A new one fails; an entry that
   no longer matches a recorder must be removed. */
const MODE_GATE_BASELINE = [
  /* Round 645 moved Face Off, HOF or Bust, Score Predictor, Shirt Number,
     Minefield and Sports Millionaire off this list: their mode now rides the
     recorder's ranked flag (scripts/simRankedRecorder.mjs) and their done
     flag is the finish alone. */
  { file: 'src/hooks/usePerfectLineupGeneric.ts', slug: 'config.gameId', why: 'the mode check excludes an already booked daily, set in the same batch as the restore' },
];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
/* The worktree checks out CRLF and every anchor here is written LF. */
const readLF = rel => readSourceLF(ROOT, rel);
const count = (hay, needle) => hay.split(needle).length - 1;

/* Round 645: the code readers live in scripts/lib/readSource.mjs, shared with
   simRankedRecorder, which reads the same call sites for the ranked flag. */
const MODE_CHECK = /\b\w*[mM]ode\s*[!=]==?\s*['"`]|['"`]\s*[!=]==?\s*\w*[mM]ode\b/;

/* The scan: every file under src (tests out) that records through the hook. */
const srcFiles = () => sourceFiles(ROOT);
function scan(files) {
  const findings = [];
  const baselineHits = new Set();
  let recorders = 0;
  let resolved = 0;
  for (const [rel, raw] of files) {
    if (rel === 'src/hooks/useGameCompletion.ts' || rel === 'src/hooks/useDailyPuzzle.ts' || rel === 'src/lib/restoredFinish.ts') continue;
    const code = stripComments(raw);
    const recs = callsOf(code, 'useGameCompletion').filter(c => c.args.length >= 2);
    if (!recs.length && !/\bmarkRestoredFinish\s*\(/.test(code)) continue;
    const slugs = new Set();
    for (const r of recs) {
      recorders += 1;
      const slug = resolveSlug(code, r.args[0]);
      if (slug) { slugs.add(slug); resolved += 1; }
      const done = resolveExpr(code, r.args[1]);
      if (/&&/.test(done) && MODE_CHECK.test(done)) {
        const key = slug ?? r.args[0];
        const base = MODE_GATE_BASELINE.find(b => b.file === rel && b.slug === key);
        if (base) baselineHits.add(`${rel}|${key}`);
        else findings.push({ kind: 'mode', file: rel, line: r.at, what: `${key} records on "${done.replace(/\s+/g, ' ')}", ANDed with a mode check: a trip to another mode and back re-arms it over a finish already recorded` });
      }
    }
    for (const mk of callsOf(code, 'markRestoredFinish')) {
      const slug = resolveSlug(code, mk.args[0] ?? '');
      if (!slug) continue;
      if (slugs.size && !slugs.has(slug)) findings.push({ kind: 'slug', file: rel, line: mk.at, what: `marks '${slug}' but records ${[...slugs].map(s => `'${s}'`).join(', ')}, so the mark is never consumed` });
      if (!recs.length) findings.push({ kind: 'slug', file: rel, line: mk.at, what: `marks '${slug}' with no recorder in the file to consume it` });
    }
    if (/\buseDailyPuzzle\s*[<(]/.test(code)) {
      for (const g of code.matchAll(/\bgameSlug\s*:\s*(['"`])([^'"`$]+)\1/g)) {
        if (slugs.size && !slugs.has(g[2])) findings.push({ kind: 'slug', file: rel, line: code.slice(0, g.index).split('\n').length, what: `hands useDailyPuzzle gameSlug '${g[2]}' but records ${[...slugs].map(s => `'${s}'`).join(', ')}, so its restore marks a slug the recorder never asks about` });
      }
    }
  }
  const stale = MODE_GATE_BASELINE.filter(b => !baselineHits.has(`${b.file}|${b.slug}`));
  return { findings, stale, recorders, resolved };
}

/* Section 3: every Higher or Lower reveal timer is owned. Read as code, so a
   bare setTimeout left in a comment is not one.
   Round 674 fix (the review's M10): the first version looked for the token
   "setTimeout(" and for a useOwnedTimeouts() call somewhere in the file, so
   setTimeout.call(window, ...) passed, and so did a hook that bound the
   helper and never used it. Now any reference to setTimeout at all is a bare
   timer (a call, .call, .apply, window.setTimeout, an alias), and the name a
   file binds to useOwnedTimeouts() must actually be called. And the scan
   read the ten hooks only, so the eleventh Higher or Lower game, the
   Transfer Market page, which runs its own reveal, kept a bare 1400 ms timer
   no fence read: every page routed at a higher-lower address in
   src/App.tsx is read too. A hook must take its timers from the helper; a
   page that leaves the reveal to its hook needs none. One finding per file,
   carrying every reason, so a control moves exactly one. */
const HL_HOOK = /^src\/hooks\/use(?:\w+HL|HigherLower)\.ts$/;
const HL_HOOKS_AT_LEAST = 10;
const HL_PAGES_AT_LEAST = 11;
const APP = 'src/App.tsx';
function hlPages(files) {
  const app = stripComments(files.get(APP) ?? '');
  const lazyFile = new Map([...app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']\.\/pages\/([\w/]+)["']\s*\)\s*\)/g)].map(m => [m[1], `src/pages/${m[2]}.tsx`]));
  const pages = new Set();
  for (const m of app.matchAll(/<Route\s+path="([^"]*higher-lower[^"]*)"\s+element=\{<(\w+)\s*\/>\}/g)) {
    const file = lazyFile.get(m[2]);
    if (file && files.has(file)) pages.add(file);
  }
  return [...pages].sort();
}
function hlTimers(files) {
  const findings = [];
  const hooks = [...files.keys()].filter(f => HL_HOOK.test(f)).sort();
  const pages = hlPages(files);
  for (const rel of [...hooks, ...pages]) {
    const code = stripComments(files.get(rel));
    const reasons = [];
    let line = 0;
    const at = i => code.slice(0, i).split('\n').length;
    for (const m of code.matchAll(/\bsetTimeout\b/g)) {
      reasons.push(`line ${at(m.index)} reaches setTimeout itself, a timer nothing clears when the page unmounts`);
      line ||= at(m.index);
    }
    const helpers = [...code.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useOwnedTimeouts\s*\(\s*\)/g)].map(m => ({ name: m[1], at: at(m.index) }));
    if (hooks.includes(rel) && !helpers.length) { reasons.push('takes no timers from useOwnedTimeouts, so its reveal timer is not owned'); line ||= 1; }
    for (const h of helpers) {
      if (!new RegExp(`(^|[^\\w$.])${h.name.replace(/\$/g, '\\$')}\\s*\\(`).test(code)) { reasons.push(`binds ${h.name} to useOwnedTimeouts() and never calls it, so the reveal is not scheduled through the owned helper`); line ||= h.at; }
    }
    if (reasons.length) findings.push({ kind: 'timer', file: rel, line, what: reasons.join('; ') });
  }
  return { findings, hooks, pages };
}

/* ------------------------------------------------------------------------ */
/* vitest                                                                    */
/* ------------------------------------------------------------------------ */
/* vitest lives in this tree's node_modules, or in the main tree's when this
   runs from a worktree nested inside it: walk up, as node's own resolution
   does. */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}

/* One vitest run. The json reporter is the verdict (a temp file of its own,
   so two runs at once cannot read each other's); the default reporter is the
   only way the NO_DOUBLE_CASE lines the table prints reach this process. */
function runSuite(env) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  const out = path.join(os.tmpdir(), `noDoubleRecord-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const text = ((r.stdout || '') + (r.stderr || '')).split(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')).join('');
  if (!fs.existsSync(out)) return { error: 'vitest wrote no report:\n' + text.slice(-3000) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const tests = new Map();
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.set(a.title, { status: a.status, message: (a.failureMessages || []).join('\n').split('\n')[0] });
    }
  }
  const cases = [...text.matchAll(/NO_DOUBLE_CASE (\{.*\})/g)].map(m => JSON.parse(m[1]));
  const table = text.match(/NO_DOUBLE_TABLE (\{.*\})/);
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, cases, table: table ? JSON.parse(table[1]) : null, loadError, text };
}

function checkTable(run) {
  if (run.error) { fail(run.error); return false; }
  if (!run.tests.size) { fail('vitest reported no tests from ' + TEST); return false; }
  if (run.tests.get('discovers the table')?.status !== 'passed') { fail('the table check did not pass: ' + (run.tests.get('discovers the table')?.message ?? 'not run')); return false; }
  const rows = run.cases.filter(c => c.shape !== 'check').length;
  const checks = run.cases.filter(c => c.shape === 'check').length;
  if (rows !== EXPECTED_ROWS || checks !== EXPECTED_CHECKS) { fail(`the table printed ${rows} rows and ${checks} checks, this harness expects ${EXPECTED_ROWS} and ${EXPECTED_CHECKS}`); return false; }
  return true;
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
if (!CONTROL) {
  console.log(`1) The table, rendered: ${TEST}${ONLY ? ` (NO_DOUBLE_ONLY=${ONLY})` : ''}`);
  const run = runSuite(ONLY ? { NO_DOUBLE_ONLY: ONLY } : {});
  let shown = 0;
  if (checkTable(run)) {
    if (run.table) console.log(`   table: ${JSON.stringify(run.table)}`);
    if (run.tests.get('markRestoredFinish is live')?.status !== 'passed') fail('the restoredFinish handshake is not live in the normal run');
    const rows = run.cases.filter(c => !ONLY || c.id === ONLY);
    if (ONLY && !rows.length) fail(`NO_DOUBLE_ONLY=${ONLY} names no row; the table has ${[...new Set(run.cases.map(c => c.id))].join(', ')}`);
    for (const c of rows) {
      const t = run.tests.get(c.title);
      const ok = t?.status === 'passed';
      shown += 1;
      console.log(`   ${ok ? 'ok  ' : 'RED '}${c.title.padEnd(64)} ${c.shape.padEnd(8)} mark ${c.usesMark ? 'yes' : 'no '}${ok ? '' : `: ${t?.message ?? 'did not run'}`}`);
      if (!ok) fail(`${c.title}: a finish recorded more than once, lost, or never reached`);
    }
    if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every row green, read its output:\n${run.text.slice(-2000)}`);
    console.log(`   vitest exit ${run.code}, ${shown} rows and checks`);
  }

  console.log('\n2) The source: every recorder in src, read as code');
  const files = srcFiles();
  const res = scan(files);
  console.log(`   ${res.recorders} recorder calls read, ${res.resolved} with a slug resolved in their own file; ${MODE_GATE_BASELINE.length} mode gates in the baseline`);
  if (res.recorders < 80) fail(`only ${res.recorders} useGameCompletion calls found, the reader is broken`);
  for (const f of res.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  for (const s of res.stale) fail(`MODE_GATE_BASELINE lists ${s.file} (${s.slug}), which no longer gates on its mode: remove the entry`);
  /* Prose is not code: the same two shapes written into comments flag nothing. */
  const probe = 'src/hooks/useNflHL.ts';
  const prose = new Map(files);
  prose.set(probe, files.get(probe)
    + "\n/* useGameCompletion('nfl-hl', mode === 'daily' && done, 0); markRestoredFinish('elsewhere'); */\n"
    + "// useGameCompletion('nfl-hl', gameMode === 'daily' && over, 0);\n");
  const proseRes = scan(prose);
  if (proseRes.findings.length !== res.findings.length) fail(`the scan read a comment as code: ${proseRes.findings.length - res.findings.length} finding(s) from prose`);
  else console.log('   prose check: a mode gate and a stray mark written in comments flag nothing');
  if (!res.findings.length && !res.stale.length) console.log('   no slug mismatch and no new mode gated recorder');

  console.log('\n3) The reveal timers: every Higher or Lower hook and page schedules its reveal through useOwnedTimeouts, as code');
  const timers = hlTimers(files);
  console.log(`   ${timers.hooks.length} Higher or Lower hooks read: ${timers.hooks.map(h => path.basename(h, '.ts')).join(', ')}`);
  console.log(`   ${timers.pages.length} pages routed at a higher-lower address read: ${timers.pages.map(h => path.basename(h, '.tsx')).join(', ')}`);
  if (timers.hooks.length < HL_HOOKS_AT_LEAST) fail(`only ${timers.hooks.length} Higher or Lower hooks found, expected at least ${HL_HOOKS_AT_LEAST}: the reader is broken or a hook was renamed`);
  if (timers.pages.length < HL_PAGES_AT_LEAST) fail(`only ${timers.pages.length} pages routed at a higher-lower address found in ${APP}, expected at least ${HL_PAGES_AT_LEAST}: the route reader is broken`);
  for (const f of timers.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  /* Round 674 fix (M10): the shapes the first scan let through, each written
     as code into the hockey hook, must each flag it. */
  {
    const probe = 'src/hooks/useHockeyHL.ts';
    const src = files.get(probe);
    const shapes = [
      ['setTimeout.call', src.replace('      later(() => {\n', '      setTimeout.call(window, () => {\n')],
      ['window.setTimeout', src.replace('      later(() => {\n', '      window.setTimeout(() => {\n')],
      ['an alias', src.replace('      later(() => {\n', '      const wait = setTimeout; wait(() => {\n')],
      ['a helper bound and never called', src.replace('      later(() => {\n', '      queueMicrotask(() => {\n').replace(/\}, 2000\);\n/, '});\n')],
    ];
    const missed = [];
    for (const [label, text] of shapes) {
      if (text === src) { missed.push(`${label} (the probe could not be written)`); continue; }
      const m = new Map(files);
      m.set(probe, text);
      if (!hlTimers(m).findings.some(f => f.file === probe)) missed.push(label);
    }
    if (missed.length) fail(`the timer scan lets these reveal shapes through: ${missed.join(', ')}`);
    else console.log(`   shape check: ${shapes.map(s => s[0]).join(', ')} each flag the hook`);
  }
  /* Prose is not code: a bare timer written into comments flags nothing. */
  const hlProbe = 'src/hooks/useHockeyHL.ts';
  const hlProse = new Map(files);
  hlProse.set(hlProbe, files.get(hlProbe) + '\n/* setTimeout(() => setShowingResult(false), 2000); */\n// window.setTimeout(() => {}, 1);\n');
  const hlAsCode = new Map(files);
  hlAsCode.set(hlProbe, files.get(hlProbe) + '\nsetTimeout(() => {}, 1);\n');
  if (hlTimers(hlAsCode).findings.length !== timers.findings.length + 1) fail('a bare timer written as code is not flagged, so the prose check below proves nothing');
  else if (hlTimers(hlProse).findings.length !== timers.findings.length) fail('the timer scan read a comment as code');
  else console.log('   prose check: a bare timer as code flags once, the same written in comments flags nothing');
  if (!timers.findings.length) console.log('   every reveal timer is owned, so none outlives its page');

  if (failures) {
    console.error(`\nsimNoDoubleRecord: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log(`\nsimNoDoubleRecord: all green (${shown} rows and checks, each recorded once across the finish, the toggles, the coaching, the reveals and the reloads; ${res.recorders} recorders read; ${timers.hooks.length} Higher or Lower hooks and ${timers.pages.length} pages own their reveal timers)`);
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
const which = CONTROL === 'all' ? ALL : [CONTROL];
/* Round 674: a per run folder (scripts/lib/controlScratch.mjs). The fixed
   dist/.no-double-control was shared by every run at once and sat where a
   build empties dist. */
const scratch = controlScratch(ROOT, 'no-double-control');
const controlDir = scratch.dir;
const runTag = scratch.tag;
let fired = 0;
try {
  for (const name of which) {
    if (SCAN_CONTROLS[name]) {
      const ctl = SCAN_CONTROLS[name];
      console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
      const files = srcFiles();
      const src = files.get(ctl.file);
      if (!src || count(src, ctl.from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(ctl.from)}`);
      if (count(stripComments(src), ctl.from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
      /* Each section on its own: the control must move its own section and
         leave the other exactly where it was. */
      const sections = { 2: fs2 => scan(fs2).findings, 3: fs3 => hlTimers(fs3).findings };
      const own = ctl.section ?? 2;
      const other = own === 2 ? 3 : 2;
      const before = sections[own](files);
      const otherBefore = sections[other](files).length;
      files.set(ctl.file, src.replace(ctl.from, ctl.to));
      const after = sections[own](files);
      const otherAfter = sections[other](files).length;
      const added = after.filter(f => !before.some(b => b.file === f.file && b.what === f.what && b.line === f.line));
      for (const f of added) console.log(`   section ${own} flagged ${f.kind}: ${f.file}:${f.line}: ${f.what}`);
      const onTarget = added.length === 1 && added[0].file === ctl.file && added[0].kind === ctl.kind;
      if (!onTarget) fail(`control ${name}: expected exactly one ${ctl.kind} finding in ${ctl.file} from section ${own}, it added ${added.length}`);
      else if (otherAfter !== otherBefore) fail(`control ${name}: section ${own} fired, but section ${other} moved too (${otherBefore} to ${otherAfter})`);
      else { fired += 1; console.log(`   control ${name} fired: section ${own} flags exactly ${ctl.file} and section ${other} does not move, in memory only, src untouched`); }
      continue;
    }
    const ctl = VITEST_CONTROLS[name];
    console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
    const swap = {};
    const byFile = new Map();
    for (const e of ctl.edits) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
    for (const [rel, edits] of byFile) {
      const src = readLF(rel);
      let copy = src;
      for (const e of edits) {
        if (count(copy, e.from) !== 1) abort(`control ${name} cannot run: ${rel} does not carry exactly one ${JSON.stringify(e.from)}`);
        if (count(stripComments(copy), e.from) !== 1) abort(`control ${name} cannot run: the anchor in ${rel} is not code`);
        copy = copy.replace(e.from, e.to);
      }
      if (copy === src) abort(`control ${name} cannot run: the rewrite of ${rel} changed nothing`);
      if (/from '\.\.?\//.test(copy)) abort(`control ${name} cannot run: ${rel} has a relative import, which a copy elsewhere cannot resolve`);
      const dir = path.join(controlDir, name);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, path.basename(rel));
      fs.writeFileSync(file, withLoadedLine(copy, runTag, `${name} ${path.basename(rel)}`));
      swap[moduleOf(rel)] = file.replaceAll('\\', '/');
      console.log(`   ${rel} copied to ${path.relative(ROOT, file).replaceAll('\\', '/')} with ${edits.length} anchor(s) rewritten, src untouched`);
    }

    const run = runSuite({ NO_DOUBLE_CONTROL: name, NO_DOUBLE_SWAP: JSON.stringify(swap) });
    if (!checkTable(run)) continue;
    if (run.loadError && !run.tests.size) { fail(`control ${name}: the copy did not load, so every red is a crash:\n${run.loadError}`); continue; }
    const unloaded = [...byFile.keys()].filter(rel => !run.text.includes(loadedLine(runTag, `${name} ${path.basename(rel)}`)));
    if (unloaded.length) { fail(`control ${name}: the copy of ${unloaded.join(', ')} never printed its load line, so the table did not run on it`); continue; }
    console.log(`   every copy printed its load line for this run (${runTag})`);
    if (name === 'nomark' && run.tests.get('nomark control: markRestoredFinish is a no-op')?.status !== 'passed') {
      fail('control nomark: the probe says the swapped module still keeps the mark, so the swap did not take');
      continue;
    }
    let wrong = 0;
    let red = 0;
    for (const c of run.cases) {
      const shouldBeRed = ctl.red(c);
      const t = run.tests.get(c.title);
      const isRed = t?.status === 'failed';
      /* Only the targeted assertion counts: a row red for any other reason (a
         crash, a finish that never lands) is not this control firing. */
      const onPoint = !isRed || ctl.point.test(t.message);
      const ok = isRed === shouldBeRed && onPoint;
      if (isRed) red += 1;
      if (!ok) wrong += 1;
      if (isRed || !ok) console.log(`   ${ok ? 'ok  ' : 'BAD '}${c.title.padEnd(64)} ${isRed ? 'red  ' : 'green'} (${shouldBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    }
    console.log(`   ${run.cases.length - red} other row(s) and check(s) green, as they must be`);
    if (wrong) fail(`control ${name}: ${wrong} row(s) did not answer the control the way their table entry says they must`);
    else if (red === 0) fail(`control ${name}: nothing went red, so the rows it targets are not proving anything`);
    else { fired += 1; console.log(`   control ${name} fired: ${red} red, exactly the ones it should, every other one green`); }
  }
} finally {
  scratch.cleanup();
}

if (failures || fired !== which.length) {
  console.error(`\nsimNoDoubleRecord: control ${CONTROL} did not fire as it should (${failures} failure(s))`);
  process.exit(1);
}
console.log(`\nsimNoDoubleRecord: NO_DOUBLE_CONTROL=${CONTROL} fired exactly where it should, so the checks it targets can fail`);
