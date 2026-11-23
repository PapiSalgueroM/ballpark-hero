/**
 * The NHL import repair covers the exact malformed rows captured October 1.
 * Check the migration's data and replay the real Grid matcher and NHL draft
 * admission offline. NHL_IMPORT_REPAIR_CONTROL=games raises one repaired
 * player's games to the draft cutoff in memory and must fail admission.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const control = process.env.NHL_IMPORT_REPAIR_CONTROL;
assert.ok(!control || control === 'games', 'Unknown NHL_IMPORT_REPAIR_CONTROL');
const recipe = read('supabase/migrations/20261123083647_repair_nhl_skater_import.sql');
const blocks = [...recipe.matchAll(/^\s*records constant jsonb := \$rows\$\s*(\[[\s\S]*?\])\s*\$rows\$\s*::jsonb;/gm)];
assert.equal(blocks.length, 1, 'Exactly one SQL repair ledger must be present');
const rows = JSON.parse(blocks[0][1]);
const captured = JSON.parse(read('docs/audits/evidence847/nhl-malformed-rows.json'));
assert.equal(captured.length, 69, 'October audit sample size');
assert.equal(rows.length, captured.length, 'The repair must cover all audited rows');

const byName = new Map(captured.map(row => [row.player_name, row]));
const sourceHosts = new Set([
  'dobberprospects.com', 'insidetherink.com', 'pucksandstats.com',
  'www.eliteprospects.com', 'www.hockey-reference.com', 'www.quanthockey.com',
  'www.statscrew.com',
]);
for (const key of ['id', 'name', 'nhlId']) {
  assert.equal(new Set(rows.map(row => row[key])).size, rows.length, `Unique ${key}`);
}
for (const { id, name, team, position, season, nhlId, source, old, fixed } of rows) {
  const original = byName.get(name);
  assert.ok(original, `${name} appears in the October audit`);
  assert.deepEqual([team, position, season], [original.teams, original.position, original.year_to], `${name} identity and season cutoff`);
  assert.deepEqual(old, [original.year_from, original.games, original.goals, original.assists, original.points], `${name} original values`);
  assert.ok(Number.isSafeInteger(id) && id > 0, `${name} database row ID`);
  assert.ok(Number.isSafeInteger(nhlId) && /^84\d{5}$/.test(String(nhlId)), `${name} NHL source ID`);
  const url = new URL(source);
  assert.ok(url.protocol === 'https:' && !url.username && !url.password && sourceHosts.has(url.host) && url.pathname.length > 1, `${name} independent source`);
  assert.equal(fixed.length, 5, `${name} repaired tuple length`);
  const [first, games, goals, assists, points] = fixed;
  const year = Number(season.slice(0, 4));
  assert.ok(year >= 2007 && year <= 2025 && season === `${year}-${String(year + 1).slice(-2)}`, `${name} archived NHL season`);
  assert.equal(first, season, `${name} NHL debut in the original final season`);
  assert.ok([games, goals, assists, points].every(n => Number.isSafeInteger(n) && n >= 0) && games > 0, `${name} valid nonnegative totals`);
  assert.equal(points, goals + assists, `${name} scoring arithmetic`);
  assert.notDeepEqual(fixed, old, `${name} repairs at least one field`);
}
console.log('69 exact October rows, unique identities, dated independent sources and valid repaired totals');

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'simNhlImportRepair-'));
const bundle = path.join(scratch, 'games.mjs');
try {
  await build({
    stdin: {
      contents: [
        "export { ACHIEVEMENT_POOL, FRANCHISE_POOL, playerMatchesCell } from './src/lib/hockeyGrid.ts';",
        "export { fetchSquad } from './src/lib/perfectSeasonNhl.ts';",
      ].join('\n'),
      resolveDir: root,
    },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
    alias: { '@': path.join(root, 'src') },
  });
  // Supply enough synthetic skaters to open the squad. Deliberately return
  // the repaired rows even when they miss the server query's games filter.
  const keepers = Array.from({ length: 8 }, (_, index) => ({
    player_name: `Fixture skater ${index}`, position: 'C', games: 100,
    year_from: '2014-15', year_to: '2014-15', goals: 0, assists: 0, points: 0,
  }));
  const repaired = rows.map(({ name, position, season, fixed: [year_from, games, goals, assists, points] }) => ({
    player_name: name, position, year_from, year_to: season, games, goals, assists, points,
  }));
  const cutoffs = [];
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.fetch = async input => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const table = url.pathname.split('/').at(-1);
    assert.ok(table === 'nhl_player_stats' || table === 'nhl_draft', `Unexpected request ${url.pathname}`);
    if (table === 'nhl_player_stats') {
      const cutoff = url.searchParams.get('games');
      assert.match(cutoff ?? '', /^gte\.[1-9]\d*$/, 'NHL draft query uses a games floor');
      cutoffs.push(Number(cutoff.slice(4)));
    }
    return new Response(JSON.stringify(table === 'nhl_draft' ? [] : [...keepers, ...repaired]), {
      headers: { 'content-type': 'application/json' },
    });
  };
  const { ACHIEVEMENT_POOL, FRANCHISE_POOL, playerMatchesCell, fetchSquad } = await import(pathToFileURL(bundle).href);
  const categories = [...FRANCHISE_POOL, ...ACHIEVEMENT_POOL];
  const cells = categories.flatMap((row, i) => categories.slice(i + 1).map(col => ({ row, col })));
  for (const { name, team, old, fixed } of rows) {
    for (const [, games, goals, assists, points] of [old, fixed]) {
      const player = { name, franchises: new Set([team]), games, goals, assists, points };
      assert.ok(!cells.some(cell => playerMatchesCell(player, cell)), `${name}: NHL Grid admission changed`);
    }
  }
  console.log(`NHL Grid: both rows for each player miss all ${cells.length} distinct criterion pairs`);

  const wheel = { abbr: 'BOS', teamName: 'Bruins', eraStart: 2007, eraEnd: 2026, eraLabel: 'Fixture', draftMatch: 'Boston' };
  const verifyDraft = async () => {
    const squad = await fetchSquad(wheel);
    const admitted = squad?.players.map(player => player.name).sort();
    assert.deepEqual(admitted, keepers.map(row => row.player_name), `Unexpected NHL draft admissions: ${admitted?.filter(name => !name.startsWith('Fixture skater ')).join(', ')}`);
  };
  await verifyDraft();
  assert.equal(cutoffs.length, 2, 'Both live skater queries hit the fixture');
  assert.equal(cutoffs[0], cutoffs[1], 'Both skater positions use the same games cutoff');
  assert.ok(repaired.every(row => row.games < cutoffs[0]), 'Every repaired row is below the real NHL draft games cutoff');
  console.log(`NHL draft: all ${repaired.length} repaired rows stay below the ${cutoffs[0]}-game cutoff`);

  if (control === 'games') {
    const subject = repaired.filter(row => row.player_name === 'Bobby Robins');
    assert.equal(subject.length, 1, 'The control must reach exactly one repaired player');
    assert.equal(subject[0].games, 3, 'The control must start from the verified games value');
    subject[0].games = cutoffs[0];
    await assert.rejects(verifyDraft, { message: /^Unexpected NHL draft admissions: Bobby Robins/ });
    console.error('CONTROL BEHAVED: the changed games value admits Bobby Robins to the NHL draft');
    process.exitCode = 1;
  } else {
    console.log('simNhlImportRepair: green. Verified the repair ledger, Grid answers and draft eligibility.');
  }
} finally {
  if (fs.existsSync(bundle)) fs.unlinkSync(bundle);
  fs.rmdirSync(scratch);
}
