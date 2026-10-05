/* Transfer Path's on screen guidance tells the truth about where the chain IS.
   -------------------------------------------------------------------------
   Round 536, from a live report on 2026-09-11. The player built a chain the
   game accepted link by link (tpa-662, Lionel Messi to Mohamed Salah, through
   Neymar, Mbappe, Hakimi and Ronaldo) and the board went on showing the stored
   hint, which is written from player A: "One middle man does it. He was at
   Barcelona with Lionel Messi and at Liverpool with Mohamed Salah". The only
   man in the pull who fits that line is Philippe Coutinho, and Coutinho from
   Cristiano Ronaldo is a refusal. It is Round 294's defect, a hint into a
   refusal, through a door no fence was watching: not a stale row, a row that
   never moves. Over the 885 puzzle pull, after a one to three step legal
   wander the stored hint's own middle man is refused from the head in 651 of
   884 puzzles, so this was almost every game that went off the optimal line.

   The second half is the stranded head. Reaching any teammate of the target
   wins on the spot, so a chain can never eat the target's last neighbour, but
   it can wall its own head in: 97 of 5310 random legal walks over the pull
   ended with no route left, one of them after two steps. Nothing on the board
   said so.

   What it holds:
     1) THE HOOK'S BEHAVIOUR, through the real hook on a small graph built for
        the shapes that matter (src/hooks/useTransferPathGuidance.test.ts).
        The stored hint opens the puzzle; once the chain moves the hint is the
        head's own, counted and clubbed from the head's shortest remaining
        route; that route never runs back through a name already played; and a
        head with nothing left says so rather than hinting at nothing.
     2) THE PULL, so the reason this exists stays measured on the real graph
        rather than only on a toy one. A deterministic wander, one step for the
        stale hint and twelve for the walled in head. The share is floored, the
        strand count is printed; the note on that section says why.
     3) THE SOURCE, comments stripped: the head search skips the played names,
        and the board actually consumes `stranded`, so the state reaches a
        screen instead of dying in the hook.
     4) MORE HELP, Round 1010a's second tier: counts of the doors out of the
        head and into the target, never a name. Through the real hook on the
        same small graph (the "more help" cases in the test: from the start,
        after a wander, under Active only, where the count must come from the
        RULE graph so a man the rule refuses is never counted, and the "and N
        more clubs" overflow at 4, 5 and 6 clubs), and on the
        pull: at every puzzle start and after section 2's one step wander, the
        page's doorsFrom (bundled from src/lib/transferPathGraph.ts) must equal
        an independent count built from this repo's other graph,
        scripts/lib/transferPathHints.mjs (neighbours, distances, and the
        adjacency's shared clubs, so the Round 475 calendar and span rule is
        in both), with the played names left out; and no line may carry any
        pool name but the head's and the target's, matched on word
        boundaries. Measured 2026-10-05 on the 885 puzzle pull: see the note
        in that section.

   NEGATIVE CONTROLS, each refusing to run if its rewrite changed nothing:
     TPG_CONTROL=frozen runs the test against a copy of the hook whose hint is
       the stored one whatever the chain has done, which is the pre Round 536
       behaviour and the reported defect. Sections 1's moved-hint and stranded
       assertions must go red.
     TPG_CONTROL=noskip runs the test against a copy whose head search forgets
       the chain. It then offers a route back through a name already played,
       which the board refuses as a duplicate. The same assertions must go red,
       and since Round 1010a it forgets them in More help too, so section 4's
       "skips the played names" case must go red with them.
     TPG_CONTROL=leak runs the test against a copy whose More help line gets
       the first middle man's name appended. Section 4's "names nobody" case
       must go red, and on the leak assertion's own message, not only on the
       exact line strings in the same case.
     TPG_CONTROL=everyday runs the test against a copy whose More help counts
       on the everyday graph instead of the rule graph. The Active only case
       must go red (Wall counted, 3 doors instead of 2).
     TPG_CONTROL=overflow runs the test against a copy of transferPathGraph.ts
       whose "and N more clubs" count is one short. The overflow case must go
       red.
     TPG_CONTROL=pullleak plants the head's first unplayed door at the end of
       every pull line in section 4. The word boundary check must name the
       planted man on every line it was planted on (measured 2026-10-05: 1750
       of 1750).
     TPG_CONTROL=firstclub runs section 4's pull check against a copy of
       transferPathGraph.ts that credits a man to the first club he links
       through only, the wrong attribution rule. The pull equality must go red.

   Run: node scripts/simTransferPathGuidance.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildGraph, distances, expandCompactCareers, neighbours, sharedClub, shortestPath } from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useTransferPathGuidance.test.ts';
const HOOK = path.join(ROOT, 'src', 'hooks', 'useTransferPath.ts');
const BOARD = path.join(ROOT, 'src', 'components', 'transfer-path', 'TransferPathBoard.tsx');
const GRAPH_TS = path.join(ROOT, 'src', 'lib', 'transferPathGraph.ts');
const CONTROL = process.env.TPG_CONTROL || '';
const HOOK_CONTROLS = ['frozen', 'noskip', 'leak', 'everyday'];
const GRAPH_CONTROLS = ['overflow'];
const PULL_CONTROLS = ['firstclub', 'pullleak'];
if (CONTROL && ![...HOOK_CONTROLS, ...GRAPH_CONTROLS, ...PULL_CONTROLS].includes(CONTROL)) {
  console.error(`TPG_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* A worktree has no node_modules of its own: Node resolves the main tree's by
   walking up, so the runner is looked for the same way rather than assumed to
   sit under ROOT. */
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

function runVitest(extraEnv = {}) {
  const runner = resolveVitest();
  if (!runner) {
    console.error('vitest was not found from this tree upwards, so nothing could be checked');
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [runner, 'run', TEST], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { code: result.status, out: (result.stdout || '') + (result.stderr || '') };
}

function assertionEvidence(output) {
  const lines = output.split('\n');
  const keep = new Set();
  lines.forEach((line, i) => {
    if (/AssertionError|expected/.test(line)) {
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 6); j += 1) keep.add(j);
    }
  });
  return [...keep].sort((a, b) => a - b).map(i => lines[i]).join('\n');
}

/* ── 1) the hook, through the real test ─────────────────────────────────── */
console.log('1) the hook: the hint moves with the head, and a walled in head says so');
let copy = null;
let env = {};
let markers = [];
/* Each hook control names the test cases it must turn red. */
const MUST_GO_RED = {
  frozen: { moved: /×.*speaks from the head/, stranded: /×.*no route left/ },
  noskip: { moved: /×.*speaks from the head/, stranded: /×.*no route left/, 'section 4 skip': /×.*more help skips the played names/ },
  /* the assertion's own message, so the red is the leak check's and not the
     exact line strings that follow it in the same case */
  leak: { 'section 4 names': /×.*more help names nobody/, 'the leak check itself': /AssertionError: more help leaked a pool name/ },
  everyday: { 'section 4 rule graph': /×.*more help counts on the rule graph/ },
  overflow: { 'section 4 overflow': /×.*more help says how many clubs it left out/ },
};
const onGraph = GRAPH_CONTROLS.includes(CONTROL);
if (!PULL_CONTROLS.includes(CONTROL)) try {
  if (CONTROL) {
    /* CRLF is folded first: the checkout carries Windows endings and an
       anchor written with plain newlines would silently match nothing, which
       is a control that cannot fire dressed as a control that did. Every
       anchor must be present, so a half applied control refuses to run. */
    const source = fs.readFileSync(onGraph ? GRAPH_TS : HOOK, 'utf8').replaceAll('\r\n', '\n');
    const swaps = {
      frozen: [['  const hint = useMemo(() => {\n    if (fromHere === null) return inForce.hint;', '  const hint = useMemo(() => {\n    return inForce.hint;\n    if (fromHere === null) return inForce.hint;']],
      noskip: [
        ['findPath(head, puzzle.playerB, chain.slice(0, -1))', 'findPath(head, puzzle.playerB)'],
        ['doorsFrom(seasonIndex, playerToClubSeasons, head, puzzle.playerB, chain)', 'doorsFrom(seasonIndex, playerToClubSeasons, head, puzzle.playerB, [head])'],
      ],
      leak: [[
        'return { doors, lines: moreHelpLines(doors, head, puzzle.playerB) };',
        'const lines = moreHelpLines(doors, head, puzzle.playerB);\n    const middle = findPath(head, puzzle.playerB, chain.slice(0, -1))?.[1]?.player ?? \'\';\n    return { doors, lines: [`${lines[0]} ${middle}`, ...lines.slice(1)] };',
      ]],
      everyday: [[
        'doorsFrom(seasonIndex, playerToClubSeasons, head, puzzle.playerB, chain)',
        'doorsFrom(buildSeasonIndex(everydayClubSeasons), everydayClubSeasons, head, puzzle.playerB, chain)',
      ]],
      overflow: [['const more = rows.length - TOP_CLUBS;', 'const more = rows.length - TOP_CLUBS - 1;']],
    }[CONTROL];
    let rewritten = source;
    for (const [anchor, swap] of swaps) {
      if (!rewritten.includes(anchor)) {
        console.error(`control cannot run: ${onGraph ? 'transferPathGraph.ts' : 'useTransferPath.ts'} is not in the shape TPG_CONTROL=${CONTROL} rewrites (missing: ${anchor.split('\n')[0]})`);
        process.exit(1);
      }
      rewritten = rewritten.replace(anchor, swap);
    }
    const dir = path.join(ROOT, 'dist', '.transfer-path-guidance-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, onGraph ? 'transferPathGraph.control.ts' : 'useTransferPath.control.ts');
    fs.writeFileSync(copy, rewritten);
    env = onGraph ? { TRANSFER_PATH_GRAPH: copy.replaceAll('\\', '/') } : { TRANSFER_PATH_HOOK: copy.replaceAll('\\', '/') };
    console.log({
      frozen: '   NEGATIVE CONTROL ON: the test runs against a copy whose hint never leaves player A',
      noskip: '   NEGATIVE CONTROL ON: the test runs against a copy whose head search and More help forget the played names',
      leak: "   NEGATIVE CONTROL ON: the test runs against a copy whose More help line names the first middle man",
      everyday: '   NEGATIVE CONTROL ON: the test runs against a copy whose More help counts on the everyday graph, not the rule graph',
      overflow: "   NEGATIVE CONTROL ON: the test runs against a copy of transferPathGraph.ts whose 'and N more clubs' is one short",
    }[CONTROL]);
  }

  const result = runVitest(env);
  if (!result.out.includes('useTransferPathGuidance.test.ts')) {
    console.error('vitest did not report on the guidance test file, so nothing was checked');
    process.exit(1);
  }
  const summary = result.out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${result.code}, ${summary ? summary[1].trim() : 'no summary line'}`);

  if (CONTROL) {
    if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(result.out)) {
      console.error('control cannot run: the rewritten hook did not load');
      process.exit(1);
    }
    const observed = result.out.match(/CONTROL_OBSERVED_\w+ .+/g) ?? [];
    const stayedGreen = Object.entries(MUST_GO_RED[CONTROL]).filter(([, red]) => !red.test(result.out)).map(([what]) => what);
    if (stayedGreen.length > 0 || observed.length === 0) {
      console.error(`control ${CONTROL} changed the hook but did not make these guidance assertions fail: ${stayedGreen.join(', ') || '(no markers observed)'}`);
      process.exit(1);
    }
    console.log(`   red as required: ${Object.keys(MUST_GO_RED[CONTROL]).join(', ')}`);
    observed.forEach(line => console.log(`   ${line}`));
    console.log('   RED evidence from the rewritten hook:\n' + assertionEvidence(result.out));
    console.log(`simTransferPathGuidance control ${CONTROL}: green. The old behaviour fails the guidance assertions as expected.`);
    process.exit(0);
  }

  markers = result.out.split('\n').filter(l => l.startsWith('TRANSFER_PATH_GUIDANCE_'));
  if (result.code !== 0) fail('the guidance regression test is not green');
  if (markers.length < 6) fail(`only ${markers.length} behaviour markers were emitted, so the assertions did not run`);
  markers.forEach(m => console.log(`   ${m}`));
} finally {
  if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
}

/* ── 2) the pull, so the reason this exists stays measured ──────────────── */
console.log('2) the pull: a stored hint goes stale the moment the chain moves, and a chain can strand itself');
{
  const dir = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(dir, 'careers.txt'), 'utf8'));
  const graph = buildGraph(players);
  const puzzles = fs.readFileSync(path.join(dir, 'puzzles.txt'), 'utf8').split('\n').filter(Boolean)
    .map(l => { const [id, a, b, min] = l.split('|'); return { id, a, b, min: Number(min) }; });

  /* Deterministic wander, no randomness anywhere: at each turn take the first
     neighbour by name that is not the target, not already played, and not a
     teammate of the target (that one wins on the spot). One step measures the
     stale hint; twelve measure whether a chain can wall its own head in. */
  const stepFrom = (head, played, b, skipToo) => neighbours(graph, head)
    .find(n => n !== b && !played.includes(n) && n !== skipToo && !sharedClub(graph, n, b));

  let moved = 0, stale = 0, walked = 0, stranded = 0;
  const strandExamples = [];
  for (const pz of puzzles) {
    const optimal = shortestPath(graph, pz.a, pz.b);
    if (!optimal || optimal.length < 3) continue;
    /* the man the stored hint points at: the first name on a shortest path
       from player A, which is what the generator writes the hint from */
    const storedMiddle = optimal[1];
    const off = stepFrom(pz.a, [pz.a], pz.b, storedMiddle);
    if (off) {
      moved += 1;
      if (!sharedClub(graph, off, storedMiddle)) stale += 1;
    }

    const played = [pz.a];
    let head = pz.a;
    for (let i = 0; i < 12; i += 1) {
      const next = stepFrom(head, played, pz.b, null);
      if (!next) break;
      played.push(next);
      head = next;
    }
    if (played.length < 2) continue;
    walked += 1;
    const seen = new Set(played);
    const queue = [head];
    let reaches = false;
    for (let i = 0; i < queue.length && !reaches; i += 1) {
      for (const nb of neighbours(graph, queue[i])) {
        if (nb === pz.b) { reaches = true; break; }
        if (seen.has(nb)) continue;
        seen.add(nb);
        queue.push(nb);
      }
    }
    if (!reaches) {
      stranded += 1;
      if (strandExamples.length < 3) strandExamples.push(`${pz.id} ${pz.a} to ${pz.b}: nothing left at ${head} after ${played.length - 1} steps`);
    }
  }
  const share = moved ? stale / moved : 0;
  console.log(`   ${moved} puzzles wandered one legal step; the stored middle man is refused from the new head on ${stale} of them (${(share * 100).toFixed(1)}%)`);
  console.log(`   ${walked} puzzles wandered up to twelve steps; ${stranded} ended with no route left`);
  strandExamples.forEach(e => console.log(`     ${e}`));
  /* Measured 2026-09-12 on the 885 puzzle pull: 865 wandered one step, 463 of
     them stale (53.5%), and 5 of 884 deep wanders stranded (the shortest after
     five steps, tpa-290, Manuel Neuer to Pepe). The share floor sits far below
     the measurement because the pull moves and this section's job is to prove
     the defect is the common case rather than a corner. The strand count is
     printed and not floored: it is rare by nature and a pull is allowed to
     change, and the behaviour itself is held by section 1 on a graph built for
     it. */
  if (moved < 500) fail(`only ${moved} puzzles could be wandered, so this measurement is not reading the pull`);
  if (share < 0.25) fail(`the stored hint survives one step on ${((1 - share) * 100).toFixed(1)}% of puzzles, so this harness is no longer measuring the reported defect`);
}

/* ── 3) the source ──────────────────────────────────────────────────────── */
console.log('3) the source: the head search skips played names and the board shows the stranded state');
{
  const hook = code(fs.readFileSync(HOOK, 'utf8'));
  const board = code(fs.readFileSync(BOARD, 'utf8'));
  if (!/findPath\(\s*head\s*,\s*puzzle\.playerB\s*,\s*chain\.slice\(0,\s*-1\)\s*\)/.test(hook)) {
    fail('the head search does not skip the names already in the chain, so it can offer a duplicate');
  }
  if (!/\bstranded\b/.test(board)) fail('TransferPathBoard does not read `stranded`, so a walled in head never reaches the screen');
  if (!/stranded,/.test(hook)) fail('useTransferPath does not return `stranded`');
  console.log('   head search skips the chain, board consumes stranded');
}

/* ── 4) More help ───────────────────────────────────────────────────────── */
console.log('4) More help: the door counts equal an independent count, and no line names a middle man');
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
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let pullMismatches = 0;
let pullNamed = 0;
let leakPlanted = 0;
{
  if (!PULL_CONTROLS.includes(CONTROL)) {
    for (const m of ['MORE_HELP_START', 'MORE_HELP_WANDERED', 'MORE_HELP_STRANDED', 'MORE_HELP_RULE', 'MORE_HELP_OVERFLOW']) {
      if (!markers.some(l => l.startsWith(`TRANSFER_PATH_GUIDANCE_${m} `))) fail(`the hook case behind ${m} did not run, so More help was not checked through the hook`);
    }
  }
  if (!/\bmoreHelp\b/.test(code(fs.readFileSync(BOARD, 'utf8')))) fail('TransferPathBoard does not read `moreHelp`, so the tier never reaches a screen');

  /* Per run temp folder, never a fixed name: two runs at once must not share
     a bundle (the harness temp file race). */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tpg-more-help-'));
  try {
    let graphTs = GRAPH_TS;
    if (CONTROL === 'firstclub') {
      const source = fs.readFileSync(GRAPH_TS, 'utf8').replaceAll('\r\n', '\n');
      const anchor = '    if (clubs) clubs.add(club);';
      if (!source.includes(anchor)) {
        console.error('control cannot run: transferPathGraph.ts is not in the shape TPG_CONTROL=firstclub rewrites');
        process.exit(1);
      }
      graphTs = path.join(tmp, 'transferPathGraph.control.ts');
      fs.writeFileSync(graphTs, source.replace(anchor, '    if (clubs) continue;'));
      console.log('   NEGATIVE CONTROL ON: doorsFrom credits a man to the first club he links through only');
    }
    const entry = path.join(tmp, 'entry.ts');
    const bundle = path.join(tmp, 'bundle.mjs');
    fs.writeFileSync(entry, `export { buildSeasonIndex, clubSeasonsOf, doorsFrom, moreHelpLines } from ${JSON.stringify(graphTs.replaceAll('\\', '/'))};\n`);
    await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [NO_DATABASE] });
    const page = await import(pathToFileURL(bundle).href);
    pullMismatches = checkPull(page);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* The pull, both graphs side by side. The page's doorsFrom runs on the page's
   own index; the independent count is built here from transferPathHints.mjs:
   neighbours for the doors, the adjacency's shared seasons for every club a
   door runs through (sharedClub names only the earliest one, and the rule is
   that a man counts under every club he links through), and distances for
   the route. Returns the number of states the two disagree on. */
function checkPull(page) {
  const dir = path.join(ROOT, 'scripts/data/transferPathPull');
  const players = expandCompactCareers(fs.readFileSync(path.join(dir, 'careers.txt'), 'utf8'));
  const graph = buildGraph(players);
  const keys = page.clubSeasonsOf(players);
  const index = page.buildSeasonIndex(keys);
  const puzzles = fs.readFileSync(path.join(dir, 'puzzles.txt'), 'utf8').split('\n').filter(Boolean)
    .map(l => { const [id, a, b] = l.split('|'); return { id, a, b }; });
  const poolNames = [...graph.keys.keys()];
  const wordRe = poolNames.map(n => [n, new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(n)}(?![\\p{L}\\p{N}])`, 'u')]);

  /* distances from the target, never through a name played before the head */
  const distSkipping = (from, skip) => {
    if (skip.size === 0) return distances(graph, from);
    const dist = new Map([[from, 0]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i += 1) {
      for (const nx of neighbours(graph, queue[i])) {
        if (dist.has(nx) || skip.has(nx)) continue;
        dist.set(nx, dist.get(queue[i]) + 1);
        queue.push(nx);
      }
    }
    return dist;
  };
  const clubsOf = (a, b) => new Set(graph.adj.get(a).get(b).map(s => s.club));
  const independent = (head, target, played) => {
    const playedSet = new Set(played);
    const fromTarget = distSkipping(target, new Set(played.filter(n => n !== head)));
    if (head === target || !fromTarget.has(head)) return null;
    const want = fromTarget.get(head) - 1;
    const out = neighbours(graph, head).filter(n => !playedSet.has(n));
    const byClub = {};
    let onRoute = 0;
    for (const n of out) {
      const near = fromTarget.get(n) === want;
      if (near) onRoute += 1;
      for (const club of clubsOf(head, n)) {
        byClub[club] ??= { players: 0, onRoute: 0 };
        byClub[club].players += 1;
        if (near) byClub[club].onRoute += 1;
      }
    }
    const inward = neighbours(graph, target).filter(n => !playedSet.has(n));
    const into = {};
    for (const n of inward) for (const club of clubsOf(target, n)) into[club] = (into[club] ?? 0) + 1;
    return { total: out.length, onRoute, byClub, intoTotal: inward.length, into };
  };
  const canon = o => JSON.stringify(Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));
  const sorted = rows => rows.every((r, i) => i === 0 || rows[i - 1].players > r.players || (rows[i - 1].players === r.players && rows[i - 1].club.localeCompare(r.club) <= 0));
  const agree = (got, ind) => {
    if (got === null || ind === null) return got === ind;
    return got.total === ind.total && got.onRoute === ind.onRoute && got.intoTotal === ind.intoTotal
      && canon(Object.fromEntries(got.byClub.map(r => [r.club, { players: r.players, onRoute: r.onRoute }]))) === canon(ind.byClub)
      && canon(Object.fromEntries(got.into.map(r => [r.club, r.players]))) === canon(ind.into)
      && sorted(got.byClub) && sorted(got.into);
  };
  /* every pool name on word boundaries, after the two ends are blanked out
     (longest first, so "Alisson Becker" goes before a bare "Alisson") */
  const namesIn = (lines, head, target) => {
    let text = lines.join('\n');
    for (const end of [head, target].sort((x, y) => y.length - x.length)) text = text.split(end).join('#');
    return wordRe.filter(([, re]) => re.test(text)).map(([n]) => n);
  };
  /* section 2's wander, the same rule: the first neighbour by name that is
     not the target, not played, not the stored middle man and no teammate
     of the target */
  const stepFrom = (head, played, b, skipToo) => neighbours(graph, head)
    .find(n => n !== b && !played.includes(n) && n !== skipToo && !sharedClub(graph, n, b));

  const tally = { start: 0, wander: 0 };
  const agreed = { start: 0, wander: 0 };
  let open = 0, withRoute = 0, named = 0;
  leakPlanted = 0;
  const examples = [];
  for (const pz of puzzles) {
    const states = [[pz.a, [pz.a], 'start']];
    const optimal = shortestPath(graph, pz.a, pz.b);
    if (optimal && optimal.length >= 3) {
      const off = stepFrom(pz.a, [pz.a], pz.b, optimal[1]);
      if (off) states.push([off, [pz.a, off], 'wander']);
    }
    for (const [head, played, kind] of states) {
      tally[kind] += 1;
      const got = page.doorsFrom(index, keys, head, pz.b, played);
      const ind = independent(head, pz.b, played);
      if (!agree(got, ind)) {
        if (examples.length < 3) examples.push(`${pz.id} ${kind} from ${head}: page ${JSON.stringify(got)} vs independent ${JSON.stringify(ind)}`);
        continue;
      }
      agreed[kind] += 1;
      if (!got) continue;
      open += 1;
      if (got.onRoute >= 1) withRoute += 1;
      const lines = page.moreHelpLines(got, head, pz.b);
      /* TPG_CONTROL=pullleak: the line gets the head's first unplayed door
         appended, so the word boundary check below has to name him */
      if (CONTROL === 'pullleak') {
        const door = neighbours(graph, head).find(n => !played.includes(n) && n !== pz.b);
        if (door) { lines[0] = `${lines[0]} ${door}`; leakPlanted += 1; }
      }
      const leaked = namesIn(lines, head, pz.b);
      if (leaked.length > 0) {
        named += 1;
        if (named <= 3) console.error(`     ${pz.id} ${kind}: "${lines.join(' / ')}" names ${leaked.join(', ')}`);
      }
      if (pz.id === 'tpa-762' && kind === 'start') console.log(`   tpa-762 on the pull: ${lines.join(' / ')}`);
    }
  }
  const mismatches = (tally.start - agreed.start) + (tally.wander - agreed.wander);
  console.log(`   puzzle starts: ${agreed.start} of ${tally.start} agree with the independent count`);
  console.log(`   after the one step wander: ${agreed.wander} of ${tally.wander} agree`);
  console.log(`   ${open} open heads, ${withRoute} with at least one door on a shortest route; ${named} with a line naming a middle man`);
  examples.forEach(e => console.error(`     ${e.slice(0, 400)}`));
  if (mismatches > 0) fail(`More help disagrees with the independent count on ${mismatches} states`);
  if (named > 0) fail(`${named} More help lines name a pool player other than the head and the target`);
  /* Measured 2026-10-05 on the 885 puzzle pull: 885 of 885 starts and 865 of
     865 wanders agree, all 1750 heads open with at least one door on a
     shortest route (true by construction, so printed, not asserted), and no
     line names anybody. The equality is exact and has no band. The floors
     below only prove the pull was read: they sit under the measured counts
     because the pull is frozen, not because these numbers may drift. On the
     pull tpa-762 reads 18 players, Liverpool 17 and Roma 3: the pull predates
     Round 784's Internacional rows, which add Diego Forlan on the bake and
     make it 19 there. */
  if (tally.start < 850) fail(`only ${tally.start} puzzle starts were checked, so this is not reading the pull`);
  if (tally.wander < 500) fail(`only ${tally.wander} wanders were checked, so this is not reading the pull`);
  if (open < 0.9 * (tally.start + tally.wander)) fail(`only ${open} heads had More help open, so the equality ran on almost nothing`);
  pullNamed = named;
  return mismatches;
}

if (CONTROL === 'pullleak') {
  /* every planted name must be caught: the check is exact, so the control is
     too (a miss means the word boundary match lets a real name through) */
  if (leakPlanted === 0 || pullNamed !== leakPlanted) {
    console.error(`control pullleak planted a name on ${leakPlanted} lines but the leak check named ${pullNamed}`);
    process.exit(1);
  }
  console.log(`simTransferPathGuidance control pullleak: green. A middle man planted on ${leakPlanted} pull lines is named on all ${pullNamed}, as expected.`);
  process.exit(0);
}

if (CONTROL === 'firstclub') {
  if (pullMismatches === 0) {
    console.error('control firstclub changed doorsFrom but the pull equality stayed green');
    process.exit(1);
  }
  console.log(`simTransferPathGuidance control firstclub: green. The wrong attribution rule disagrees with the independent count on ${pullMismatches} states, as expected.`);
  process.exit(0);
}

if (failures) {
  console.error(`simTransferPathGuidance: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTransferPathGuidance: green. The hint speaks from the head and a dead end says so.');
