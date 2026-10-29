import assert from 'node:assert/strict';
import fs from 'node:fs';
const [mode, first, second] = process.argv.slice(2);
assert.equal(process.env.CI, '1');
const expected = ['simAdsense','simBrand','simHeadTags','simHiddenPages','simHubs','simIndexNow','simIndexing','simInternalLinks','simNoRivalNames','simPrerender','simPrerenderBoot','simRetiredRoutes','simSchema','simSitemap','simSnapshotAssets'].map(name => name + '.mjs').sort();
if (mode === 'readers') {
  const plan = JSON.parse(fs.readFileSync(first, 'utf8')), log = fs.readFileSync(second, 'utf8');
  const selected = [...plan.nodeGroup, ...plan.browserGroup].sort();
  assert.deepEqual(selected, expected, 'Actual comma-selected runner plan contains all15readers once');
  assert(!/\b(?:SKIP|SKIPPED|EMPTY)\b/.test(log), 'No skipped or empty credit');
  const passes = [...log.matchAll(/^  PASS\s+(\S+\.mjs)\s+/gm)].map(row => row[1]).sort();
  assert.deepEqual(passes, expected, 'Actual15PASS result rows, no duplicates or omissions');
  assert(/^All 15 harnesses green\.$/m.test(log), 'Actual closing count15');
  fs.writeFileSync(second + '.admission.json', JSON.stringify({ mode, selected, passes, closingCount: 15, skipped: 0, empty: 0 }, null, 2));
  console.log('Readers: actual plan selected15required files.');
  console.log('Readers: actual15unique PASS rows matched the same files.');
  console.log('Readers: actual closing count15, no SKIP or EMPTY.');
  console.log('Readers: raw plan/log and admission JSON retained.');
} else {
  assert.equal(mode, 'caps');
  const log = fs.readFileSync(first, 'utf8');
  const rows = [...log.matchAll(/^ {3}(\/\S*)\s+(\d+)K gz over\s+(\d+) files \(budget (\d+)K, ([\d.]+)K to the tenth\)$/gm)].map(row => ({ route: row[1], roundedKB: Number(row[2]), files: Number(row[3]), budgetKB: Number(row[4]), exactKB: Number(row[5]) }));
  assert.equal(rows.length, 15); assert.equal(new Set(rows.map(row => row.route)).size, 15);
  assert(rows.every(row => row.files > 0 && row.roundedKB <= row.budgetKB), 'Original rounded fatal-cap semantics');
  assert.equal(rows.find(row => row.route === '/soccer-career')?.budgetKB, 840);
  assert(/^sweepWeight: green\./m.test(log), 'Actual fatal sweep completed');
  fs.writeFileSync(first + '.admission.json', JSON.stringify({ mode, rows, count: 15, changedCapPolicy: false }, null, 2));
  console.log('Caps: actual15unique route measurements completed.');
  console.log('Caps: each observed rounded measurement held its unchanged fatal budget.');
  console.log('Caps: Soccer Career840K ceiling retained.');
  console.log('Caps: actual closing green and raw measurements retained.');
}
