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

   NEGATIVE CONTROLS, each refusing to run if its rewrite changed nothing:
     TPG_CONTROL=frozen runs the test against a copy of the hook whose hint is
       the stored one whatever the chain has done, which is the pre Round 536
       behaviour and the reported defect. Sections 1's moved-hint and stranded
       assertions must go red.
     TPG_CONTROL=noskip runs the test against a copy whose head search forgets
       the chain. It then offers a route back through a name already played,
       which the board refuses as a duplicate. The same assertions must go red.

   Run: node scripts/simTransferPathGuidance.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, expandCompactCareers, neighbours, sharedClub, shortestPath } from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useTransferPathGuidance.test.ts';
const HOOK = path.join(ROOT, 'src', 'hooks', 'useTransferPath.ts');
const BOARD = path.join(ROOT, 'src', 'components', 'transfer-path', 'TransferPathBoard.tsx');
const CONTROL = process.env.TPG_CONTROL || '';
if (CONTROL && !['frozen', 'noskip'].includes(CONTROL)) {
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
try {
  if (CONTROL) {
    /* CRLF is folded first: the checkout carries Windows endings and an
       anchor written with plain newlines would silently match nothing, which
       is a control that cannot fire dressed as a control that did. */
    const source = fs.readFileSync(HOOK, 'utf8').replaceAll('\r\n', '\n');
    let rewritten = source;
    if (CONTROL === 'frozen') {
      const anchor = '  const hint = useMemo(() => {\n    if (fromHere === null) return inForce.hint;';
      rewritten = source.replace(anchor, '  const hint = useMemo(() => {\n    return inForce.hint;\n    if (fromHere === null) return inForce.hint;');
    } else {
      const anchor = 'findPath(head, puzzle.playerB, chain.slice(0, -1))';
      rewritten = source.replace(anchor, 'findPath(head, puzzle.playerB)');
    }
    if (rewritten === source) {
      console.error(`control cannot run: useTransferPath.ts is not in the shape TPG_CONTROL=${CONTROL} rewrites`);
      process.exit(1);
    }
    const dir = path.join(ROOT, 'dist', '.transfer-path-guidance-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useTransferPath.control.ts');
    fs.writeFileSync(copy, rewritten);
    env = { TRANSFER_PATH_HOOK: copy.replaceAll('\\', '/') };
    console.log(CONTROL === 'frozen'
      ? '   NEGATIVE CONTROL ON: the test runs against a copy whose hint never leaves player A'
      : '   NEGATIVE CONTROL ON: the test runs against a copy whose head search forgets the played names');
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
    const movedRed = /×.*speaks from the head/.test(result.out);
    const strandedRed = /×.*no route left/.test(result.out);
    const observed = result.out.match(/CONTROL_OBSERVED_\w+ .+/g) ?? [];
    if (!movedRed || !strandedRed || observed.length === 0) {
      console.error(`control ${CONTROL} changed the hook but did not make the guidance assertions fail`);
      process.exit(1);
    }
    observed.forEach(line => console.log(`   ${line}`));
    console.log('   RED evidence from the rewritten hook:\n' + assertionEvidence(result.out));
    console.log(`simTransferPathGuidance control ${CONTROL}: green. The old behaviour fails the guidance assertions as expected.`);
    process.exit(0);
  }

  const markers = result.out.split('\n').filter(l => l.startsWith('TRANSFER_PATH_GUIDANCE_'));
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

if (failures) {
  console.error(`simTransferPathGuidance: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTransferPathGuidance: green. The hint speaks from the head and a dead end says so.');
