import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
assert(process.argv.includes('--out'), '--out is required');
const ROOT = process.cwd(), OUT = path.resolve(option('--out')), DIST = path.resolve(option('--dist', 'dist'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
assert(process.env.RUNNER_TEMP && OUT.startsWith(path.resolve(process.env.RUNNER_TEMP) + path.sep));
await fs.mkdir(OUT, { recursive: true });
async function inventory(dir) {
  const rows = [];
  async function walk(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) { const bytes = await fs.readFile(file); rows.push({ file: path.relative(dir, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  await walk(dir); return rows.sort((a, b) => compare(a.file, b.file));
}
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean).sort(compare);
const sourceMap = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, hash(await fs.readFile(file))])));
const sourceBefore = await sourceMap(), statusBefore = git(['status', '--porcelain=v1', '--untracked-files=all']), distBefore = await inventory(DIST);
assert.equal(statusBefore, ''); assert(distBefore.length > 0);
const boardPath = 'src/components/front-office/FrontOfficeBoard.tsx', board = await fs.readFile(boardPath, 'utf8');
assert.equal(hash(board), 'b1a5dc92d28f50609d4e9a42ef6a7acd2231502a9ea62ea9912a18a8925836ad');
const ts = createRequire(path.join(ROOT, 'package.json'))('typescript');
const tree = ts.createSourceFile(boardPath, board, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length, 0);
const component = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'FrontOfficeBoard');
assert(component?.body);
const declaration = name => {
  const found = component.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).filter(node => ts.isIdentifier(node.name) && node.name.text === name);
  assert.equal(found.length, 1, name); return found[0];
};
const persist = declaration('persist').initializer;
assert(ts.isCallExpression(persist) && persist.expression.getText(tree) === 'useCallback');
const callback = persist.arguments[0]; assert(ts.isArrowFunction(callback) && ts.isBlock(callback.body));
const tryNode = callback.body.statements.find(ts.isTryStatement); assert(tryNode);
const base = tryNode.tryBlock.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText(tree) === 'base');
assert(base && ts.isObjectLiteralExpression(base.initializer));
const core = ['league', 'myTeam', 'phase', 'titles', 'seasonsPlayed', 'draftClass', 'picksLeft'];
const bindings = Object.fromEntries(base.initializer.properties.filter(node => !ts.isSpreadAssignment(node)).map(node => [node.name.getText(tree), ts.isShorthandPropertyAssignment(node) ? node.name.getText(tree) : node.initializer.getText(tree)]));
assert.deepEqual(Object.fromEntries(core.map(key => [key, bindings[key]])), { league: 'lg', myTeam: 'team', phase: 'phase', titles: 'titles', seasonsPlayed: 'seasonsPlayed', draftClass: 'draftClass', picksLeft: 'picksLeft' });
const statements = tryNode.tryBlock.statements.map(node => node.getText(tree));
for (const text of ['if (!gameLogLive.current) delete base.gameLog;', 'if (!playoffsLive.current) delete base.playoffs;', 'pendingSave.current = JSON.stringify(base);', 'localStorage.setItem(SAVE_KEY, pendingSave.current);']) assert(statements.includes(text), text);
const release = declaration('doRelease').initializer; assert(ts.isArrowFunction(release));
const calls = []; function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(tree) === 'persist') calls.push(node); ts.forEachChild(node, visit); } visit(release.body);
assert.equal(calls.length, 1); assert.deepEqual(calls[0].arguments.map(node => node.getText(tree)), ['{}', 'lg', 'myTeam']);
const serializationProof = {
  boardSHA256: hash(board), coreBindings: Object.fromEntries(core.map(key => [key, bindings[key]])),
  actualBaseDeclaration: base.getText(tree), actualSerializationAndSetter: statements.filter(text => /pendingSave.current = JSON.stringify|localStorage.setItem/.test(text)),
  actualCutPersistCall: calls[0].getText(tree), removedOptionalKeys: ['gameLog', 'playoffs'],
  meaning: 'The accepted minimal fixture contains only these seven existing SaveShape keys. Cut uses an empty patch. Actual persist retains these bindings and can add metadata; it only deletes the two optional keys absent from this fixture. Bare engine-release JSON is a lower bound, not claimed exact private pending bytes.'
};
await fs.writeFile(path.join(OUT, 'engine-entry.mjs'), "export { initLeague, releasePlayer, capUsed, ensureFoLeagueIds, REGULAR_WEEKS } from '" + path.join(ROOT, 'src/lib/frontOffice.ts').replaceAll('\\', '/') + "';\nexport { isFrontOfficeSave } from '" + path.join(ROOT, 'src/lib/frontOfficeSave.ts').replaceAll('\\', '/') + "';\nexport { nflCleanSave } from '" + path.join(ROOT, 'src/lib/nflSeasonStats.ts').replaceAll('\\', '/') + "';\n");
const bundlePath = path.join(OUT, 'engine-bundle.mjs');
await build({ entryPoints: [path.join(OUT, 'engine-entry.mjs')], outfile: bundlePath, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const engine = await import(pathToFileURL(bundlePath).href);
function random(seed) { let value = seed; return () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; }; }
const fixtures = [];
for (const [kind, count] of [['legacy', 7], ['modern', 54]]) {
  const league = engine.initLeague(random(73), kind === 'modern' ? { depth: {} } : {});
  const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'DB'];
  league.teams.KC.players = Array.from({ length: count }, (_, index) => ({
    id: 'fo-browser-' + kind + '-' + index, name: 'Save fixture ' + (index + 1),
    pos: positions[index % positions.length], age: 24, ovr: 70, salary: 2, years: 2, out: 0, pot: 80
  }));
  if (kind === 'modern') league.teams.KC.practice = [];
  engine.ensureFoLeagueIds(league, null); engine.nflCleanSave(league);
  const initial = { league, myTeam: 'KC', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
  assert.deepEqual(Object.keys(initial), core);
  assert.equal(engine.isFrontOfficeSave(initial, 'NFL', engine.REGULAR_WEEKS), true);
  const target = league.teams.KC.players[count - 1], expected = structuredClone(initial);
  assert.equal(engine.releasePlayer(expected.league.teams.KC, expected.league.freeAgents, target.id), true);
  assert.equal(expected.league.teams.KC.players.length, count - 1);
  assert.equal(engine.isFrontOfficeSave(expected, 'NFL', engine.REGULAR_WEEKS), true);
  const main = JSON.stringify(initial), afterBare = JSON.stringify(expected);
  assert(afterBare.length > main.length, 'Actual engine release grows the minimum serializable frame');
  assert(Buffer.byteLength(afterBare) > Buffer.byteLength(main));
  const file = kind + '.json', expectedFile = kind + '-engine-after.json';
  await fs.writeFile(path.join(OUT, file), main); await fs.writeFile(path.join(OUT, expectedFile), afterBare);
  fixtures.push({
    kind, file, sha256: hash(main), bytes: Buffer.byteLength(main), characters: main.length,
    expectedFile, expectedSHA256: hash(afterBare), expectedBytes: Buffer.byteLength(afterBare), expectedCharacters: afterBare.length,
    minimumGrowthCharacters: afterBare.length - main.length, minimumGrowthBytes: Buffer.byteLength(afterBare) - Buffer.byteLength(main),
    roster: count, afterRoster: count - 1, target: { id: target.id, name: target.name, pos: target.pos },
    afterCap: engine.capUsed(expected.league.teams.KC), floor: 6, modernLimit: kind === 'modern' ? 53 : null,
    explanation: 'Explicitly fictional fixture players in an actual constructor-created league, with real ID/season cleanup and releasePlayer. Not natural gameplay or real athlete data.'
  });
}
const sourceAfter = await sourceMap(), distAfter = await inventory(DIST);
assert.deepEqual(sourceAfter, sourceBefore); assert.deepEqual(distAfter, distBefore);
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), statusBefore);
const manifest = {
  schema: 1, saveKey: 'front-office-save-v1', fixtures, serializationProof,
  sourceBefore, sourceAfter, distBefore, distDigest: hash(JSON.stringify(distBefore)),
  bundle: 'engine-bundle.mjs', bundleSHA: hash(await fs.readFile(bundlePath)),
  sourceHeld: true, distHeld: true, globals: 'No Storage, Math.random or clock override. Constructor receives its actual supported RNG argument.',
  scope: 'Fixture generation and executable source inspection only. Actual compiled App, native Cut/Retry, physical quota, reload and geometry are qualified separately.'
};
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('FO fixtures: real legacy7 and modern54, both valid minimal saves; actual release grows both serialization lower bounds. Source and completed dist held.');
