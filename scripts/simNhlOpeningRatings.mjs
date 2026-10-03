/* Round898: actual NHL initializer, original saves, quotes and next-cap AI drafts.
   These are original simulation estimates, not independently verified ability ratings. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'src/lib/nhlFrontOffice.ts', test = 'src/lib/nhlOpeningRatings.test.ts';
const files = [engine, test, 'src/data/nhlFoPlayers.ts', 'src/data/nhlOpeningRatings.ts', 'src/lib/frontOfficeSave.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/leagueCaps.ts', 'src/lib/foSchedule.ts', 'src/lib/foNames.ts', 'src/lib/entityIds.ts', 'scripts/data/nhlFoRatingInputs2026.json', 'scripts/lib/nhlFoRatingModel.mjs', 'scripts/genNhlOpeningRatings.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held.find(([file]) => file === engine)[1].source;
const executable = source => source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
const T = {
  default: 'preserves physical pre898 default two-season outcomes and every RNG draw',
  legacy: 'preserves actual old saves and unknown-version prices without rerating',
  tuples: 'applies all416 opening tuples and retains32 exact original club budgets',
  terms: 'holds ages terms order schedule RNG and developmental headroom during cutover',
  preflight: 'refuses incomplete foreign malformed or budget-changing opening maps before cutover',
  evidence: 'copies exact compact original lineage with partial defensive goalie and unresolved bases',
  save: 'resumes earned and damaged-metadata saves byte-exact without inventing replacement grades',
  quote: 'uses fixed flat quotes only for the exact known version at every60to99 grade',
  release: 'retains waiver evidence and actual dead cap while quoting the released offer and refusing return',
  sign: 'refuses stale cheap market asks before mutation and commits the actual versioned signing price',
  trade: 'holds real trade identities and original evidence through an accepted price-matched move',
  draft: 'prices genuine draft arrivals by version while preserving age term potential and conversion RNG',
  lifecycle: 'renews only expired contracts and shares new quotes across market decline and replenishment',
  guard: 'chooses first affordable scout-ordered prospects using next cap and recomputed dead-money room',
  skip: 'skips unaffordable AI draft slots without conversion RNG pool removal or retained-contract changes',
  fallback: 'requires both exact guard versions and preserves physical original five-pick routing and RNG otherwise',
  campaign: 'plays four full actual seasons drafts summers and saved resumes with next-cap draft commitments',
  source: 'pins the source window and excludes script-only raw observations from the browser engine',
};
const assignment = `      player.openingRatingEvidence = {
        modelVersion: evidence.modelVersion, originKey: evidence.originKey,
        openingOvr: evidence.openingOvr, basis: evidence.basis, partial: evidence.partial,
      };`;
const controls = {
  ovr: ['      player.ovr = rating.ovr;', '      void rating.ovr;', [T.tuples, T.campaign]],
  price: ['      player.salary = rating.salary;', '      void rating.salary;', [T.tuples]],
  headroom: ['      player.pot = Math.min(99, rating.ovr + headroom);', '      player.pot = rating.ovr;', [T.terms]],
  evidence: [assignment, '      void evidence;', [T.evidence, T.save, T.release, T.trade, T.campaign]],
  copy: [assignment, '      player.openingRatingEvidence = evidence;', [T.evidence]],
  version: ['e.modelVersion !== NHL_RATING_MODEL_VERSION ||', 'false ||', [T.preflight]],
  identity: ['e.originKey !== `${abbr}|${source.name}|${source.pos}` ||', 'false ||', [T.preflight]],
  partial: ["((source.pos === 'D' || source.pos === 'G' || e.basis === 'unmeasured-prior') && !e.partial)", 'false', [T.preflight]],
  budget: ['if (openingBudget !== Math.round(nhlCapUsed(league.teams[abbr]) * 10))', 'if (false && openingBudget !== Math.round(nhlCapUsed(league.teams[abbr]) * 10))', [T.preflight]],
  quote: ['? Math.round((0.7 + NHL_PRICE_FACTOR * Math.max(0, originalAsk - 0.7)) * 10) / 10', '? originalAsk', [T.terms, T.quote, T.release, T.sign, T.draft, T.lifecycle, T.fallback, T.campaign]],
  release: ['p.salary = nhlSalaryFor(p.ovr, version);', 'void p.ovr;', [T.release]],
  sign: ['if (nhlCapRoom(t, cap) < ask) return false;', 'if (false && nhlCapRoom(t, cap) < ask) return false;', [T.sign]],
  return: ['if (signRefusal(t, id)) return false;', 'if (false && signRefusal(t, id)) return false;', [T.release]],
  draft: ['salary: version === NHL_RATING_MODEL_VERSION ? nhlSalaryFor(pr.trueOvr, version) :', 'salary: false ? nhlSalaryFor(pr.trueOvr, version) :', [T.draft, T.fallback, T.campaign]],
  renewal: ['p.salary = nhlSalaryFor(p.ovr, league.ratingModelVersion);', 'p.salary = nhlSalaryFor(p.ovr);', [T.lifecycle]],
  replenish: ['age: 23 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr, version),', 'age: 23 + Math.floor(rng() * 8), ovr, salary: nhlSalaryFor(ovr),', [T.lifecycle]],
  aiPrice: ['nhlSign(t, league.freeAgents, best.id, league.cap, league.ratingModelVersion);', 'nhlSign(t, league.freeAgents, best.id, league.cap);', [T.sign]],
  guard: ['const guarded = league.ratingModelVersion === NHL_RATING_MODEL_VERSION && league.draftAffordabilityVersion === NHL_DRAFT_AFFORDABILITY_VERSION;', 'const guarded = false;', [T.guard, T.skip, T.campaign]],
  nextCap: ['const nextCap = Math.round(league.cap * 1.09);', 'const nextCap = league.cap;', [T.guard, T.campaign]],
  order: ['const index = available.findIndex(p => nhlSalaryFor(p.trueOvr, league.ratingModelVersion) <= nhlCapRoom(team, nextCap));', 'const index = available.map((p, i) => nhlSalaryFor(p.trueOvr, league.ratingModelVersion) <= nhlCapRoom(team, nextCap) ? i : -1).filter(i => i >= 0).at(-1) ?? -1;', [T.guard]],
  skipRng: ['if (index < 0) { skipped++; continue; }', 'if (index < 0) { nhlProspectToPlayer(available[0], rng, league.ratingModelVersion); skipped++; continue; }', [T.guard, T.skip]],
  legacy: ['const guarded = league.ratingModelVersion === NHL_RATING_MODEL_VERSION && league.draftAffordabilityVersion === NHL_DRAFT_AFFORDABILITY_VERSION;', 'const guarded = true;', [T.fallback]],
};
const control = process.env.NHL_OPENING_RATINGS_CONTROL ?? '';
assert.ok(!control || control === 'original' || Object.hasOwn(controls, control), 'Known NHL opening control');
for (const [anchor] of Object.values(controls)) {
  assert.equal(source.split(anchor).length - 1, 1, 'Unique actual engine anchor');
  assert.equal(executable(source).split(anchor).length - 1, 1, 'Anchor binds executable code');
  assert.equal(holdSource(Buffer.from(source.replace(/\n/g, '\r\n'))).source.split(anchor).length - 1, 1, 'Synthetic CRLF source still binds once');
}
const env = { ...process.env, VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' }; delete env.NO_DOUBLE_SWAP;
let folder; const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/nhl-opening898-'));
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(root, '.sim-control')); assert.ok(path.basename(folder).startsWith('nhl-opening898-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  if (control) {
    let changed;
    if (control === 'original') {
      const shown = spawnSync('git', ['show', '6b7596d2:' + engine], { cwd: root, maxBuffer: 4 * 1024 * 1024 }); assert.equal(shown.status, 0);
      changed = shown.stdout.toString('utf8').replace(/\r\n/g, '\n'); assert.notEqual(changed, source);
      // Only an API adapter for the physical old Board's original unconditional five-pick loop.
      changed += `\nexport function nhlAiDraftPicks(league, remaining, order, rng) {
 const aiTakes = remaining.slice(0, 5);
 const picks = aiTakes.map((prospect, i) => { const team = league.teams[order[i % order.length]], player = nhlProspectToPlayer(prospect, rng); team.players.push(player); return { team: team.abbr, prospect, player }; });
 return { remaining: remaining.filter(p => !aiTakes.includes(p)), picks, skipped: 0, substituted: 0, guarded: false };
}\n`;
    } else { const [anchor, replacement] = controls[control]; changed = source.replace(anchor, replacement); assert.notEqual(changed, source, 'Copied control actually changes engine source'); }
    changed = changed.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    const copy = path.join(folder, 'nhlFrontOffice.ts'); await writeFile(copy, changed); owned.push(copy); env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/nhlFrontOffice': copy });
  }
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile];
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 90000, maxBuffer: 12 * 1024 * 1024 }), output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  assert.ok(!run.error && !run.signal); assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0); assert.equal(rows.length, 18); assert.equal(new Set(rows.map(row => row.title)).size, 18);
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'All18 cases execute, no skips');
  console.log('NHL_OPENING_OUTCOMES ' + JSON.stringify({ control: control || 'normal', outcomes: rows.map(row => ({ title: row.title, status: row.status })) }));
  for (const title of [T.default, T.legacy, T.source]) assert.equal(rows.find(row => row.title === title)?.status, 'passed', 'Physical default/old-save/source baseline held');
  if (control) {
    const expected = control === 'original' ? Object.values(T).filter(title => ![T.default, T.legacy, T.source].includes(title)) : controls[control][2];
    const failed = rows.filter(row => row.status === 'failed'); console.log('NHL_OPENING_CONTROL ' + JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, message: row.failureMessages[0].split('\n')[0] })) }));
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 18 - expected.length); assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|AssertionError \[/);
    console.log(`NHL opening ${control}: ${failed.length} intended failures/${18 - failed.length} held passes, all18 executed.`);
  } else {
    if (run.status !== 0) process.stdout.write(output); assert.equal(run.status, 0); assert.equal(report.numPassedTests, 18); assert.equal(report.numFailedTests, 0);
    for (const marker of ['NHL_RATING_SAVE_SIZE', 'NHL_RATING_CAMPAIGN']) assert.match(output, new RegExp(marker));
    for (const measured of output.match(/NHL_RATING_(?:SAVE_SIZE|CAMPAIGN) \{[^\n]+\}/g) ?? []) console.log(measured);
    console.log('NHL opening:18/18 actual initializer/quote/transaction/draft outcomes passed.');
    console.log('NHL opening:all416 rows/32 original budgets, physical original two-season RNG and old saves held.');
    console.log('NHL opening:four actual80-game seasons,5120 games,60 series,48 draft arrivals and24 byte-exact validator resumes passed.');
    console.log('NHL opening:invalid opening maps refuse; no-return/dead-money/cap rules, current contract terms and compact original lineage held.');
  }
} finally {
  for (const file of owned) { assert.equal(path.dirname(path.resolve(file)), path.resolve(folder), 'Only owned direct files are removed'); await rm(file, { force: true }); }
  if (folder) { assert.equal(path.dirname(path.resolve(folder)), path.resolve(root, '.sim-control')); assert.ok(path.basename(folder).startsWith('nhl-opening898-')); await rmdir(folder); }
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'All actual source/input/test raw bytes held');
  }
}
console.log('NHL opening:effective CRLF-safe bindings/raw holds/owned-copy cleanup passed. Offline proof does not establish historical membership or ability, native UI, remote saves or all-seed balance.');
