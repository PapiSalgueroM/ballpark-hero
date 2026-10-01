/* Actual MLB Board choices and unchanged original trade helpers. Native geometry and
   held-key activation are checked separately against the compiled component. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.MLB_TRADE_ROSTER_CONTROL || '';
const independent = 'holds an independent original-helper';
const controls = {
  finder: { test: 'reaches all Finder choices', anchor: 'data-mlb-trade-list="finder">\n              {tradeOwnPlayers.slice(0, tradeOwnVisible).map', replacement: 'data-mlb-trade-list="finder">\n              {tradeOwnPlayers.slice(0, 8).map' },
  send: { test: 'reaches all manual send choices', anchor: 'data-mlb-trade-list="send">\n                  {tradeOwnPlayers.slice(0, tradeOwnVisible).map', replacement: 'data-mlb-trade-list="send">\n                  {tradeOwnPlayers.slice(0, 8).map' },
  receive: { test: 'reaches every partner choice', anchor: 'tradePartnerPlayers.slice(0, tradePartnerVisible).map', replacement: 'tradePartnerPlayers.slice(0, 8).map' },
  finderid: { test: 'shops a later exact own ID', anchor: 'setMyTradePiece(p.id); setShopOffers([]); setShopTried(false);', replacement: 'setMyTradePiece(tradeOwnPlayers[0].id); setShopOffers([]); setShopTried(false);' },
  sendid: { test: 'opens and commits a later exact manual pair', anchor: 'onClick={() => setMyTradePiece(p.id)}', replacement: 'onClick={() => setMyTradePiece(tradeOwnPlayers[0].id)}' },
  receiveid: { test: 'opens and commits a later exact manual pair', anchor: 'onClick={() => openTradeTalks(p.id)}', replacement: 'onClick={() => openTradeTalks(tradePartnerPlayers[0].id)}' },
  order: { test: 'holds the original first-eight rating', anchor: 'const tradeOwnPlayers = [...my.players].sort((a, b) => b.ovr - a.ovr);', replacement: 'const tradeOwnPlayers = [...my.players].sort((a, b) => a.ovr - b.ovr);' },
  count: { test: 'reaches all Finder choices', anchor: 'data-mlb-trade-count className="text-center text-[10px] text-muted-foreground">Showing {Math.min(tradeOwnVisible, tradeOwnPlayers.length)} of {tradeOwnPlayers.length} players</p>\n            <div', replacement: 'data-mlb-trade-count className="text-center text-[10px] text-muted-foreground">Showing {8} of {tradeOwnPlayers.length} players</p>\n            <div' },
  focus: { test: 'reaches all Finder choices', anchor: 'next.focus({ preventScroll: true });', replacement: 'void next;' },
  repeat: { test: 'blocks held-key default activation', anchor: "onKeyDown={e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}", replacement: '', count: 3 },
  pagingrng: { test: 'reaches all Finder choices', anchor: '    reveal();', replacement: '    reveal(); Math.random();' },
  selectionrng: { test: 'keeps later released-player refusals quiet', anchor: 'onClick={() => setMyTradePiece(p.id)}', replacement: 'onClick={() => { Math.random(); setMyTradePiece(p.id); }}' },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown MLB trade roster control');
const paths = ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'src/components/mlb-front-office/MlbTradeRoster.module.css', 'src/lib/mlbFrontOffice.ts', 'src/lib/tradeFinder.ts', 'src/lib/foTradeTalks.ts', 'src/lib/frontOfficeCuts.ts', 'src/hooks/useGameCompletion.ts'].map(file => path.join(root, file));
const verifyBytes = [];
for (const file of paths) {
  const bytes = await readFile(file);
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Only disposable copies may change during the wrapper')));
}
const originalSource = (await readFile(paths[0], 'utf8')).replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '900' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/mlbTradeRoster.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    let changed = originalSource;
    const spec = controls[control]; assert.equal(changed.split(spec.anchor).length - 1, spec.count || 1, 'Control must bind only the intended actual statement');
    const before = changed; changed = changed.replaceAll(spec.anchor, spec.replacement); assert.notEqual(changed, before, 'Copied mutation must change real code');
    const cssAnchor = "import tradeRosterStyles from './MlbTradeRoster.module.css';"; assert.equal(changed.split(cssAnchor).length - 1, 1);
    changed = changed.replace(cssAnchor, "import tradeRosterStyles from '@/components/mlb-front-office/MlbTradeRoster.module.css';");
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/mlb-trade-roster-')); copy = path.join(folder, 'MlbFrontOfficeBoard.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/mlb-front-office/MlbFrontOfficeBoard': copy }); args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.match(output, /mlbTradeRoster\.test\.tsx/, 'Actual Board tests must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Import, collection and timeout failures earn no credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its intended outcome'); assert.match(output, /Tests\s+1 failed.*1 passed.*7 skipped/);
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].test)); assert.match(output, /AssertionError|expected .* to|Expected element with focus:|expect\(element\)\.to/i);
    console.log(`simMlbTradeRoster ${control}: asserted copied binding changed, one intended assertion failed and one independent helper baseline passed.`);
  } else { assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /9 passed/); console.log('simMlbTradeRoster: nine actual Board/helper outcomes passed.'); }
  console.log('simMlbTradeRoster: all current own/partner IDs, original first-eight ties, exact Finder/manual callbacks, full Save and salary/pick rules exercised.');
  console.log('simMlbTradeRoster: stable retained rows, quiet paging/selection/refusals, focus and native-repeat default cancellation exercised; pixel/native flow remains separate.');
  console.log('simMlbTradeRoster: original Board, scoped CSS, engines, completion and transaction helpers remain byte-held; only owned copies are written.');
} finally {
  if (copy) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
