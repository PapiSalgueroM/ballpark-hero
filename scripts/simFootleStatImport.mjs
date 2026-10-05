/** Round 1030: offline fixtures exercise the actual fallback parser and renderer.
 * Every row below is fictional test data. No table, bake CLI or app bundle runs.
 * All source controls must change one anchor and fail exactly their mapped cases,
 * while the other cases still pass. Temporary sibling modules preserve imports.
 * Run: node scripts/simFootleStatImport.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'esbuild';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BAKE = path.join(ROOT, 'scripts', 'bakePlayers.mjs');
const PLAYERS = path.join(ROOT, 'src', 'data', 'players.ts');
const POOL_FENCE = path.join(ROOT, 'scripts', 'simPlayersPool.mjs');
const heldBake = fs.readFileSync(BAKE);
const heldPlayers = fs.readFileSync(PLAYERS);
const heldFence = fs.readFileSync(POOL_FENCE);
const source = fs.readFileSync(BAKE, 'utf8').replace(/\r\n/g, '\n');
const poolSource = fs.readFileSync(POOL_FENCE, 'utf8').replace(/\r\n/g, '\n');
const fetchBefore = globalThis.fetch;
const temporary = [];
let networkAttempts = 0;
globalThis.fetch = async () => {
  networkAttempts += 1;
  throw new Error('Footle stat import fixtures must stay offline');
};

const row = Object.freeze({ id: 'fixture-1030', player_name: 'Fixture Player',
  position: 'Fixture Position', club: 'Fixture Club', nationality: 'Fixture Nation',
  age: 25, market_value_usd: 9_000_000, goals: 7, assists: 11 });
const app = { POSITION_NORMALIZE: { 'Fixture Position': 'CM' }, getEnrichment: () => ({ kitNumber: null }) };
const resolveLeague = () => ({ league: 'MLS', source: 'fixture' });
const expectedPlayer = { name: 'Fixture Player', club: 'Fixture Club', nationality: 'Fixture Nation',
  league: 'MLS', goals: 7, assists: 11, position: 'CM', kitNumber: null, age: 25, marketValue: 9, difficulty: 'easy' };
const invalidCounts = [undefined, -1, 0.5, NaN, Infinity, -Infinity, '0', '7', '', false, true, {}, [], [0], 0n];

function poolUsesCountBoundary(text) {
  const file = ts.createSourceFile('simPlayersPool.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const importsBoundary = file.statements.some(node => ts.isImportDeclaration(node)
    && node.moduleSpecifier.text === './bakePlayers.mjs'
    && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
    && node.importClause.namedBindings.elements.some(item => item.name.text === 'invalidPlayerCounts' && !item.propertyName));
  const isName = (node, name) => ts.isIdentifier(node) && node.text === name;
  const declares = (node, name) => ts.isVariableDeclarationList(node) && node.declarations.length === 1 && isName(node.declarations[0].name, name);
  let bound = false;
  function visit(node) {
    if (ts.isForOfStatement(node) && isName(node.expression, 'players') && declares(node.initializer, 'p') && ts.isBlock(node.statement)) {
      bound ||= node.statement.statements.some(inner => ts.isForOfStatement(inner)
        && declares(inner.initializer, 'field') && ts.isCallExpression(inner.expression)
        && isName(inner.expression.expression, 'invalidPlayerCounts') && inner.expression.arguments.length === 1
        && isName(inner.expression.arguments[0], 'p') && ts.isExpressionStatement(inner.statement)
        && ts.isCallExpression(inner.statement.expression) && isName(inner.statement.expression.expression, 'fail'));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return importsBoundary && bound;
}

const cases = [
  ['unknown-counts', ({ rowToPlayer }) => {
    for (const [goals, assists] of [[null, null], [null, 7], [7, null]]) {
      const input = Object.freeze({ ...row, goals, assists });
      const result = rowToPlayer(input, app, resolveLeague);
      assert.deepEqual(result.player, { ...expectedPlayer, goals, assists }, 'unknown counts retain the whole eligible player and exact nulls');
      assert.equal(result.leagueSource, 'fixture');
      assert.equal(result.usd, 9_000_000);
    }
  }],
  ['known-counts', ({ rowToPlayer }) => {
    for (const [goals, assists] of [[0, 0], [0, 7], [7, 0], [7, 11]]) {
      const result = rowToPlayer(Object.freeze({ ...row, goals, assists }), app, resolveLeague);
      assert.deepEqual(result.player, { ...expectedPlayer, goals, assists }, 'known zero and positive counts retain their exact values');
    }
  }],
  ['invalid-counts', ({ rowToPlayer }) => {
    for (const field of ['goals', 'assists']) {
      for (const value of invalidCounts) {
        const result = rowToPlayer(Object.freeze({ ...row, [field]: value }), app, resolveLeague);
        assert.equal(result.player, null, `${field}: ${String(value)} must reject the whole malformed row`);
        assert.match(result.reason, /must be null or whole non negative counts/);
      }
      const missing = { ...row };
      delete missing[field];
      assert.equal(rowToPlayer(Object.freeze(missing), app, resolveLeague).player, null, `omitted ${field} is not an explicit unknown`);
    }
  }],
  ['rendered-counts', async ({ renderFile }) => {
    const expected = [[null, null], [null, 7], [7, null], [0, 0], [0, 7], [7, 0], [7, 11]]
      .map(([goals, assists], index) => ({ ...expectedPlayer, name: `Fixture Player ${index}`, goals, assists }));
    const text = renderFile(expected.map(player => ({ player })),
      { tableRows: expected.length, overlayMoved: 0, seedNames: expected.length, matched: expected.length, reversed: 0, skipped: 0 }, '2026-01-01');
    const { code } = await transform(text, { loader: 'ts', format: 'esm' });
    const rendered = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    assert.deepEqual(rendered.players, expected, 'generated module keeps explicit null, true zero and every other fixture field');
  }],
  ['eligibility-baseline', ({ rowToPlayer }) => {
    const before = { ...row };
    assert.deepEqual(rowToPlayer(row, app, resolveLeague).player, expectedPlayer, 'ordinary fully populated row remains unchanged');
    assert.deepEqual(row, before, 'the source row stays unchanged');
    for (const patch of [{ position: 'Unknown' }, { age: 0 }, { market_value_usd: 0 }, { nationality: '' }]) {
      assert.equal(rowToPlayer({ ...row, ...patch }, app, resolveLeague).player, null, 'existing eligibility rejection remains active');
    }
    assert.equal(rowToPlayer(row, app, () => ({ league: null, reason: 'fixture missing league' })).player, null);
  }],
  ['pool-count-boundary', ({ invalidPlayerCounts }) => {
    for (const [goals, assists] of [[null, null], [null, 7], [7, null], [0, 0], [0, 7], [7, 0], [7, 11]]) {
      assert.deepEqual(invalidPlayerCounts(Object.freeze({ ...expectedPlayer, goals, assists })), [], 'pool accepts explicit unknowns, real zero and whole counts');
    }
    for (const field of ['goals', 'assists']) {
      for (const value of invalidCounts) {
        assert.deepEqual(invalidPlayerCounts({ ...expectedPlayer, [field]: value }), [field], 'pool identifies the exact malformed field');
      }
      const missing = { ...expectedPlayer };
      delete missing[field];
      assert.deepEqual(invalidPlayerCounts(missing), [field], 'pool rejects an omitted count');
    }
    assert.deepEqual(invalidPlayerCounts({ ...expectedPlayer, goals: -1, assists: '0' }), ['goals', 'assists'], 'pool reports both malformed fields');
  }],
  ['pool-executable-binding', (_module, poolText) => {
    assert.equal(poolUsesCountBoundary(poolText), true, 'actual player smell loop must send shared count findings to fail');
  }],
];

const controls = [
  ['reject-null-goals', ['unknown-counts', 'pool-count-boundary'], 'player.goals !== null && ', ''],
  ['reject-null-assists', ['unknown-counts', 'pool-count-boundary'], 'player.assists !== null && ', ''],
  ['invent-goals-zero', ['unknown-counts'], 'goals: row.goals,', 'goals: row.goals ?? 0,'],
  ['invent-assists-zero', ['unknown-counts'], 'assists: row.assists,', 'assists: row.assists ?? 0,'],
  ['erase-goals-zero', ['known-counts'], 'goals: row.goals,', 'goals: row.goals === 0 ? null : row.goals,'],
  ['erase-assists-zero', ['known-counts'], 'assists: row.assists,', 'assists: row.assists === 0 ? null : row.assists,'],
  ['accept-invalid-goals', ['invalid-counts', 'pool-count-boundary'], 'player.goals !== null && (!Number.isInteger(player.goals) || player.goals < 0)', 'false'],
  ['accept-invalid-assists', ['invalid-counts', 'pool-count-boundary'], 'player.assists !== null && (!Number.isInteger(player.assists) || player.assists < 0)', 'false'],
  ['render-goals-zero', ['rendered-counts'], 'goals: ${p.goals},', 'goals: ${p.goals ?? 0},'],
  ['render-assists-zero', ['rendered-counts'], 'assists: ${p.assists},', 'assists: ${p.assists ?? 0},'],
  ['bypass-pool-boundary', ['pool-executable-binding'], 'for (const field of invalidPlayerCounts(p))', 'for (const field of []) /* for (const field of invalidPlayerCounts(p)) */', 'pool'],
];

async function runCases(module, poolText = poolSource) {
  const failures = [];
  for (const [name, check] of cases) {
    try { await check(module, poolText); }
    catch (error) {
      assert.equal(error.name, 'AssertionError', `${name} must fail by an assertion, not a runtime error: ${error.message}`);
      failures.push(name);
    }
  }
  return failures;
}

try {
  const baseline = await import(pathToFileURL(BAKE).href);
  assert.deepEqual(await runCases(baseline), [], 'all seven ordinary import outcomes must pass');
  console.log(`simFootleStatImport: baseline ${cases.length}/${cases.length} passed`);
  for (const [name, expectedFailures, anchor, replacement, target = 'bake'] of controls) {
    const original = target === 'pool' ? poolSource : source;
    assert.equal(original.split(anchor).length - 1, 1, `${name}: expected one source anchor`);
    const changed = original.replace(anchor, replacement);
    assert.notEqual(changed, original, `${name}: mutation must change the source`);
    let candidate = baseline;
    if (target === 'bake') {
      const copy = path.join(ROOT, 'scripts', `.bakePlayers-1030-${randomUUID()}.mjs`);
      fs.writeFileSync(copy, changed);
      temporary.push(copy);
      candidate = await import(pathToFileURL(copy).href);
    }
    assert.deepEqual(await runCases(candidate, target === 'pool' ? changed : poolSource), expectedFailures,
      `${name}: only its mapped outcomes must fail; every independent case must pass`);
    console.log(`simFootleStatImport: ${name} rejected by ${expectedFailures.join(', ')}; ${cases.length - expectedFailures.length} baselines passed`);
  }
  assert.equal(networkAttempts, 0, 'offline imports must make no network attempts');
  assert.deepEqual(fs.readFileSync(BAKE), heldBake, 'actual bake source stays byte-identical');
  assert.deepEqual(fs.readFileSync(PLAYERS), heldPlayers, 'shipped factual player rows stay byte-identical');
  assert.deepEqual(fs.readFileSync(POOL_FENCE), heldFence, 'actual pool fence stays byte-identical');
  console.log(`simFootleStatImport: green, ${cases.length * (controls.length + 1)} case executions, ${controls.length} effective controls, no network or player writes`);
} finally {
  globalThis.fetch = fetchBefore;
  for (const copy of temporary) fs.unlinkSync(copy);
}
