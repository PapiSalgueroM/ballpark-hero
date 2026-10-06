/* Transfer Path's empty player list says why, and never says "not in the pool"
   about a man who is in it.
   -------------------------------------------------------------------------
   Round 1010a, from the tpa-762 report (Alisson Becker to Mikel Oyarzabal).
   The box only takes a pick from the list, so a name the search cannot find
   met a bare "No players found" and never reached a report. The board now
   picks one of three texts (src/lib/transferPathEmptyList.ts): the chain or
   target text when the typed text is inside a name the list leaves out on
   purpose, the spelling text when a pool name is near it once punctuation is
   folded, and the pool text only when nothing in the pool is anywhere near.

   The review of the first build found the pool text told players that
   Trent Alexander-Arnold, N'Golo Kante, Samuel Eto'o and others typed without
   their hyphen or apostrophe were "Not in the Transfer Path pool yet", because
   the search matches the text exactly as typed. And no gate ran the board's
   test file at all, so putting back the exact defect the critic had rejected
   ('oyarzabal' told it is not in the pool) left every harness green.

   What it holds:
     1) THE BOARD, through the real test (src/test/playerAutocompleteEmptyText
        .test.tsx): the autocomplete's emptyText and onNoResults props, the
        chain or target text for the target by surname and for an accented
        chain name typed plain, the spelling text for ten real spellings of
        pool men, the pool text for a name nobody carries, and the report
        context. Every case is required by name.
     2) THE BAKE, every name in src/data/careerPlayers.ts. Each is typed five
        ways a player would (punctuation dropped, words reversed, the last
        word, the first and last words, everything after the first word). The
        search is replayed as it matches (normalized name contains the
        normalized text), and wherever the list would come back empty the
        reason must not be "pool": that man IS in the pool. Then, for every
        puzzle in the pull whose ends are both in the bake, the target typed by
        his last word and without punctuation: where the list (ends left out)
        is empty, the reason must be "chain".

   NEGATIVE CONTROLS (TPE_CONTROL), each refusing to run if its rewrite
   changed nothing:
     equality   the chain check is an equality, not a contains. 'oyarzabal'
                must go red in section 1 and the targets in section 2.
     lowercase  the board's exclude set is lowercased, not normalized. The
                accented chain name case must go red.
     strict     the spelling text is never chosen. The ten spellings must go
                red in section 1 and the bake in section 2.
     nofold     punctuation is not folded. 'etoo' must go red in section 1, and
                the pool men and the targets in section 2. Section 2 types
                every name with its own word split, never the module's, so a
                control that breaks the module cannot change what is typed.

   Run: node scripts/simTransferPathEmptyState.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/playerAutocompleteEmptyText.test.tsx';
const LIB = path.join(ROOT, 'src', 'lib', 'transferPathEmptyList.ts');
const BOARD = path.join(ROOT, 'src', 'components', 'transfer-path', 'TransferPathBoard.tsx');
const CONTROL = process.env.TPE_CONTROL || '';

/* Each control: the file it rewrites, its anchor and swap, and the test cases
   (section 1) and bake checks (section 2) it must turn red. */
const CONTROLS = {
  equality: {
    file: LIB,
    swaps: [['excluded.some(n => foldName(n).joined.includes(typed.joined))', 'excluded.some(n => foldName(n).joined === typed.joined)']],
    red: [/×.*names the target by surname/],
    bake: ['targets'],
  },
  lowercase: {
    file: BOARD,
    swaps: [['new Set([...chain, puzzle.playerB].map(normalizeName))', 'new Set([...chain, puzzle.playerB].map(n => n.toLowerCase()))']],
    red: [/×.*accented chain name typed plain/],
    bake: [],
  },
  strict: {
    file: LIB,
    swaps: [['const near = pool.some(', 'const near = false && pool.some(']],
    red: [/×.*typed as alexander arnold/, /×.*typed as neymar jr/, /×.*typed as mo salah/],
    bake: ['pool men'],
  },
  nofold: {
    file: LIB,
    /* an early return that splits on spaces only, ahead of the real line */
    swaps: [['  return normalizeName(name).replace(', "  return normalizeName(name).split(' ').filter(Boolean);\n  return normalizeName(name).replace("]],
    red: [/×.*typed as etoo/],
    bake: ['pool men', 'targets'],
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`TPE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* A worktree has no node_modules of its own: Node resolves the main tree's by
   walking up, so the runner is looked for the same way. */
function resolveVitest() {
  let dir = ROOT;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(candidate)) return candidate;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/* ── the control's rewritten copy, in a per run folder under dist ───────── */
let controlDir = null;
let libPath = LIB;
let env = {};
if (CONTROL) {
  const { file, swaps } = CONTROLS[CONTROL];
  /* CRLF is folded first, so an anchor written with plain newlines cannot
     silently match nothing; every anchor must be present. */
  let rewritten = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  for (const [anchor, swap] of swaps) {
    if (!rewritten.includes(anchor)) {
      console.error(`control cannot run: ${path.basename(file)} is not in the shape TPE_CONTROL=${CONTROL} rewrites (missing: ${anchor})`);
      process.exit(1);
    }
    rewritten = rewritten.replace(anchor, swap);
  }
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  controlDir = fs.mkdtempSync(path.join(ROOT, 'dist', '.tpe-control-'));
  const copy = path.join(controlDir, path.basename(file).replace(/\.(tsx?)$/, '.control.$1'));
  fs.writeFileSync(copy, rewritten);
  const fwd = copy.split(path.sep).join('/');
  if (file === LIB) { libPath = copy; env = { TRANSFER_PATH_EMPTY_LIST: fwd }; }
  else env = { TRANSFER_PATH_BOARD: fwd };
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}, ${path.basename(file)} rewritten`);
}

/* The bundle must never reach a database: the client module is swapped for a
   stub that throws on any use. */
const NO_DATABASE = {
  name: 'no-database',
  setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'no-database' }));
    b.onLoad({ filter: /.*/, namespace: 'no-database' }, () => ({
      contents: 'export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = ""; export const supabase = new Proxy({}, { get() { throw new Error("no database in this harness"); } });',
      loader: 'js',
    }));
  },
};

let section1Red = [];
let bake = { red: [] };
try {
  /* ── 1) the board, through the real test ──────────────────────────────── */
  console.log('1) the board: the empty list says why, through the real test');
  {
    const runner = resolveVitest();
    if (!runner) {
      console.error('vitest was not found from this tree upwards, so nothing could be checked');
      process.exit(1);
    }
    const result = spawnSync(process.execPath, [runner, 'run', TEST, '--reporter=verbose'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
      maxBuffer: 64 * 1024 * 1024,
    });
    const out = (result.stdout || '') + (result.stderr || '');
    if (!out.includes('playerAutocompleteEmptyText.test.tsx')) {
      console.error('vitest did not report on the empty state test file, so nothing was checked');
      process.exit(1);
    }
    if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
      console.error('the test file or a rewritten copy did not load');
      console.error(out.split('\n').filter(l => /Failed|Cannot|SyntaxError/.test(l)).slice(0, 5).join('\n'));
      process.exit(1);
    }
    const summary = out.match(/Tests\s+(.+)/);
    console.log(`   vitest exit ${result.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
    if (CONTROL) {
      section1Red = CONTROLS[CONTROL].red.filter(re => re.test(out)).map(String);
      out.split('\n').filter(l => /^\s*×/.test(l)).slice(0, 6).forEach(l => console.log(`   ${l.trim().slice(0, 200)}`));
    } else {
      /* every case by name, so a renamed or dropped case cannot pass quietly */
      const REQUIRED = [
        'keeps the default text for every caller',
        'shows emptyText when it is passed',
        'fires onNoResults once per settled empty search',
        'does not fire on a failed search',
        'does not fire for a search that was overtaken',
        'names the target by surname',
        'accented chain name typed plain',
        'the target typed without his punctuation',
        ...['alexander arnold', 'ngolo kante', 'etoo', 'heung-min son', 'son heung min', 'vinicius jr', 'neymar jr', 'zaire emery', 'mo salah', 'leo messi']
          .map(s => `a pool man typed as ${s} gets the spelling text`),
        'a name nobody in the pool carries gets the pool text',
        'opens More help under the hint',
      ];
      const missing = REQUIRED.filter(name => !out.split('\n').some(l => /^\s*✓/.test(l) && l.includes(name)));
      if (result.status !== 0) fail('the empty state test is not green');
      if (missing.length) fail(`these cases did not pass (or did not run): ${missing.join('; ')}`);
      console.log(`   ${REQUIRED.length - missing.length} of ${REQUIRED.length} required cases passed by name`);
    }
  }

  /* ── 2) the bake ──────────────────────────────────────────────────────── */
  console.log('2) the bake: no pool man typed a natural way is told he is not in the pool');
  {
    /* per run temp folder, never a fixed name (the harness temp file race) */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tpe-bake-'));
    try {
      const fwd = p => p.split(path.sep).join('/');
      const entry = path.join(tmp, 'entry.ts');
      const bundle = path.join(tmp, 'bundle.mjs');
      fs.writeFileSync(entry, [
        `export { emptyListReason, foldName } from ${JSON.stringify(fwd(libPath))};`,
        `export { normalizeName } from ${JSON.stringify(fwd(path.join(ROOT, 'src', 'lib', 'playerSearch.ts')))};`,
        `export { careerPlayers } from ${JSON.stringify(fwd(path.join(ROOT, 'src', 'data', 'careerPlayers.ts')))};`,
      ].join('\n'));
      await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [NO_DATABASE] });
      bake = checkBake(await import(pathToFileURL(bundle).href));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
} finally {
  if (controlDir) fs.rmSync(controlDir, { recursive: true, force: true });
}

/* Returns the bake checks that went red: 'pool men' and 'targets'. */
function checkBake(page) {
  const red = [];
  const names = [...new Set(page.careerPlayers.map(p => p.name))];
  const folded = names.map(n => page.foldName(n));
  const normalized = names.map(n => page.normalizeName(n));
  /* the search as it matches (classifyMatch): the normalized name contains
     the normalized text, the left out names excepted. Transfer Path's
     prominence leg reads up to 1000 rows, so the whole pool is a candidate. */
  const listFor = (text, leftOut) => {
    const q = page.normalizeName(text);
    return names.filter((n, i) => normalized[i].includes(q) && !leftOut.has(normalized[i]));
  };
  /* The harness's own word split, never the module's under test (a control
     that breaks the module must not also change what is typed): the search's
     normalizer, apostrophes dropped, hyphens, dots and spaces as breaks. */
  const APOSTROPHES = new RegExp("['`" + String.fromCharCode(0x2018, 0x2019, 0x02bc) + ']', 'g');
  const wordsOf = name => page.normalizeName(name).replace(APOSTROPHES, '').split(/[\s.-]+/).filter(Boolean);
  /* five ways to type a man, two characters at least (the board's minChars) */
  const variantsOf = name => {
    const w = wordsOf(name);
    const out = new Set([w.join(' '), [...w].reverse().join(' '), w[w.length - 1]]);
    if (w.length > 1) { out.add(`${w[0]} ${w[w.length - 1]}`); out.add(w.slice(1).join(' ')); }
    return [...out].filter(v => v.length >= 2);
  };

  /* Every variant, whether or not the list would be empty: if it ever is,
     for any reason, the text shown must not say he is not in the pool. */
  let typed = 0, empty = 0, told = 0;
  const reasons = { chain: 0, spelling: 0, pool: 0 };
  const examples = [];
  for (const name of names) {
    for (const v of variantsOf(name)) {
      typed += 1;
      if (listFor(v, new Set()).length === 0) empty += 1;
      const why = page.emptyListReason(v, [], folded);
      reasons[why] += 1;
      if (why === 'pool') { told += 1; if (examples.length < 5) examples.push(`"${v}" for ${name}`); }
    }
  }
  console.log(`   ${names.length} pool names typed ${typed} ways; the search finds nobody for ${empty} of them`);
  console.log(`   the board would say: spelling ${reasons.spelling}, chain ${reasons.chain}, not in the pool ${reasons.pool}`);
  examples.forEach(e => console.error(`     told "not in the pool": ${e}`));
  if (told > 0) red.push('pool men');
  if (told > 0 && !CONTROL) fail(`${told} spellings of men in the pool are told they are not in it`);

  /* The target by his last word and without punctuation, both ends left out
     of the list as the board leaves them: where nobody else matches, the
     text must be the chain or target one. */
  const inBake = new Set(names);
  const puzzles = fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'transferPathPull', 'puzzles.txt'), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('|'));
  let targets = 0, targetEmpty = 0, notChain = 0;
  const targetExamples = [];
  for (const [id, a, b] of puzzles) {
    if (!inBake.has(a) || !inBake.has(b)) continue;
    targets += 1;
    const leftOut = new Set([a, b].map(n => page.normalizeName(n)));
    const w = wordsOf(b);
    for (const v of new Set([w[w.length - 1], w.join(' ')])) {
      if (v.length < 2 || listFor(v, leftOut).length > 0) continue;
      targetEmpty += 1;
      const why = page.emptyListReason(v, [a, b], folded);
      if (why !== 'chain') { notChain += 1; if (targetExamples.length < 5) targetExamples.push(`${id} "${v}" for ${b}: ${why}`); }
    }
  }
  console.log(`   ${targets} pull puzzles with both ends in the bake; the target typed comes back empty ${targetEmpty} times, ${notChain} of them without the chain or target text`);
  targetExamples.forEach(e => console.error(`     ${e}`));
  if (notChain > 0) red.push('targets');
  if (notChain > 0 && !CONTROL) fail(`${notChain} typed targets are not told they are the target`);
  return { red, typed, empty, targets, targetEmpty };
}

if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const stayedGreen = [
    ...want.red.filter(re => !section1Red.includes(String(re))).map(re => `section 1 ${re}`),
    ...want.bake.filter(b => !bake.red.includes(b)).map(b => `section 2 ${b}`),
  ];
  if (stayedGreen.length > 0) {
    console.error(`control ${CONTROL} changed the code but these checks stayed green: ${stayedGreen.join(', ')}`);
    process.exit(1);
  }
  console.log(`simTransferPathEmptyState control ${CONTROL}: green. The broken rule fails ${[...want.red.map(String), ...want.bake].join(', ')}, as expected.`);
  process.exit(0);
}

/* FLOORS: they only prove the bake and the pull were read and that the
   search really does miss natural spellings (the defect this holds).
   Measured 2026-10-05: 253 pool names typed 737 ways, the search finds
   nobody for 253 of them (all spelling text, none "not in the pool"); 885
   pull puzzles with both ends in the bake, the target typed comes back empty
   1635 times, every one with the chain or target text. The checks themselves
   are exact (zero tolerance); the floors sit well under the measurement. */
if (bake.typed < 600) fail(`only ${bake.typed} spellings were typed, so the bake was not read`);
if (bake.empty < 100) fail(`the search missed only ${bake.empty} spellings, so this no longer measures the defect it holds`);
if (bake.targets < 800 || bake.targetEmpty < 800) fail(`only ${bake.targets} puzzles and ${bake.targetEmpty} empty targets were checked, so the pull was not read`);

if (failures) {
  console.error(`simTransferPathEmptyState: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTransferPathEmptyState: green. The empty list says why, and never tells a pool man he is not in the pool.');
