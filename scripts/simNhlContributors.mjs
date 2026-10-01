/* Round 794: real NHL engine outcomes. NHL_LEGACY_ENGINE optionally supplies
   the verified original engine for additional physical-baseline acceptance. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enginePath = path.join(root, 'src/lib/nhlFrontOffice.ts');
const control = process.env.NHL_CONTRIBUTORS_CONTROL || '';
const controls = {
  strength: { test: 'offers real first-season choices', anchor: 'const selection = t.contributors === undefined ? null : nhlContributors(t);', replacement: 'const selection = null;' },
  policy: { test: 'measures a paired complete-season win effect', independent: 'refuses malformed', anchor: 'const selection = t.contributors === undefined ? null : nhlContributors(t);', replacement: 'const selection = null;' },
  weights: { test: 'holds the frozen automatic season outcomes', anchor: 'avg(g, 62) * 0.2;', replacement: 'avg(g, 62) * 0.1;' },
  shape: { test: 'refuses malformed', anchor: "if (Object.keys(record).length !== 3 || !['forwards', 'defense', 'goalie'].every(key => Object.prototype.hasOwnProperty.call(record, key))) return false;", replacement: 'if (false) return false;' },
  health: { test: 'refuses malformed', anchor: "if (!contributorsShape(value)) return false;\n  const healthy = t.players.filter(p => p.out === 0);", replacement: "if (!contributorsShape(value)) return false;\n  const healthy = t.players;" },
  duplicates: { test: 'refuses malformed', anchor: 'if (new Set(ids).size !== ids.length) return false;', replacement: 'if (false) return false;' },
  counts: { test: 'refuses malformed', anchor: "if (value.forwards.length !== Math.min(6, healthy.filter(p => p.pos === 'C' || p.pos === 'W').length)\n    || value.defense.length !== Math.min(4, healthy.filter(p => p.pos === 'D').length)\n    || (value.goalie === null ? 0 : 1) !== Math.min(1, healthy.filter(p => p.pos === 'G').length)) return false;", replacement: 'if (false) return false;' },
  noop: { test: 'refuses malformed', anchor: 'if (sameContributors(value, nhlContributors(t))) return false;', replacement: 'if (false) return false;' },
  unavailable: { test: 'resolves unavailable IDs', anchor: 'if (!selected.includes(id) && players.some(p => p.id === id)) selected.push(id);', replacement: 'if (!selected.includes(id)) selected.push(id);' },
  malformedrepair: { test: 'resolves unavailable IDs', anchor: 'if (!contributorsShape(t.contributors)) return nhlResetContributors(t);', replacement: 'if (!contributorsShape(t.contributors)) return false;' },
  rng: { test: 'resolves unavailable IDs', anchor: 'export function nhlContributors(t: NhlGmTeam): NhlContributors {', replacement: 'export function nhlContributors(t: NhlGmTeam): NhlContributors { Math.random();' },
  thin: { test: 'uses all available healthy thin-roster groups', independent: 'refuses malformed', anchor: 'return avg(fwd, 62) * 0.5 + avg(d, 62) * 0.3 + avg(g, 62) * 0.2;', replacement: 'return avg(fwd, 61) * 0.5 + avg(d, 61) * 0.3 + avg(g, 61) * 0.2;' },
  release: { test: 'repairs successful releases', anchor: 'if (released) repairNhlContributors(t);', replacement: 'if (false) repairNhlContributors(t);' },
  sign: { test: 'repairs successful releases', anchor: 't.players.push(p);\n  repairNhlContributors(t);', replacement: 't.players.push(p);' },
  trade: { test: 'repairs both successful trade routes', anchor: 'if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }\n  repairNhlContributors(my); repairNhlContributors(their);', replacement: 'if (sweeten && my.picks.length) { their.picks.push(my.picks.pop()!); }' },
  talks: { test: 'repairs both successful trade routes', anchor: 'if (addPick) { their.picks.push(my.picks.pop()!); }\n  repairNhlContributors(my); repairNhlContributors(their);', replacement: 'if (addPick) { their.picks.push(my.picks.pop()!); }' },
  injury: { test: 'repairs an actual injury tick', anchor: '    repairNhlContributors(t);\n  }\n  const loseGame', replacement: '  }\n  const loseGame' },
  offseason: { test: 'repairs retired and departed offseason contributors', anchor: 'replenishNhlRoster(t, rng, taken);\n    repairNhlContributors(t);', replacement: 'replenishNhlRoster(t, rng, taken);' },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown NHL contributors control');
const normalize = source => source.replace(/\r\n/g, '\n');
const preservedPaths = [enginePath, ...['src/data/nhlFoPlayers.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/entityIds.ts', 'src/lib/foNames.ts', 'src/lib/leagueCaps.ts'].map(file => path.join(root, file))];
const preserved = await Promise.all(preservedPaths.map(file => readFile(file)));
const engine = normalize(preserved[0].toString('utf8'));
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1000' };
  delete env.NO_DOUBLE_SWAP;
  delete env.NHL_CONTRIBUTORS_BASELINE;
  const makeFolder = async () => {
    if (!folder) { await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/nhl-contributors-')); }
    return folder;
  };
  const relocate = source => source.replace(/from '\.\/(foNames|leagueCaps|entityIds|frontOfficeCuts)'/g, "from '@/lib/$1'");
  if (process.env.NHL_LEGACY_ENGINE) {
    const original = normalize(await readFile(process.env.NHL_LEGACY_ENGINE, 'utf8'));
    assert.equal(createHash('sha256').update(original).digest('hex'), 'd1f2ab4acf38c905a99791b10860b01357a8983f52f2943fbb7123b5033f6e4c', 'Physical reference must be the verified pre-794 engine');
    assert.equal((original.match(/from '\.\/(foNames|leagueCaps|entityIds|frontOfficeCuts)'/g) || []).length, 4, 'Only four original import paths are rebound');
    const baselineCopy = path.join(await makeFolder(), 'OriginalNhlEngine.ts'); copies.push(baselineCopy);
    await writeFile(baselineCopy, relocate(original));
    env.NHL_CONTRIBUTORS_BASELINE = baselineCopy.replaceAll('\\', '/');
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/nhlContributors.test.ts', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    assert.equal(engine.split(spec.anchor).length - 1, 1, 'Copied control must bind one unique real statement');
    const changed = engine.replace(spec.anchor, spec.replacement); assert.notEqual(changed, engine, 'Mutation must actually change code');
    const copy = path.join(await makeFolder(), 'NhlEngine.ts'); copies.push(copy);
    await writeFile(copy, relocate(changed)); env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/nhlFrontOffice': copy });
    const independent = spec.independent ?? (spec.test === 'holds the frozen automatic season outcomes' ? 'refuses malformed' : 'holds the frozen automatic season outcomes');
    args.push('--testNamePattern', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /nhlContributors\.test\.ts/, 'Actual engine tests must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Collection, import and timeout failures earn no credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Mutated behavior must fail its intended outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*10 skipped/, 'One intended failure and one independent pass must run');
    assert.match(output, new RegExp(`FAIL[^\\n]*${controls[control].test}`)); assert.match(output, /AssertionError|expected .* to/i, 'An actual outcome assertion must fail');
    console.log(`simNhlContributors ${control}: asserted copied binding changed; intended outcome failed and independent automatic/selection baseline passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-8000));
    assert.match(output, process.env.NHL_LEGACY_ENGINE ? /12 passed/ : /11 passed.*1 skipped/);
    console.log(`simNhlContributors: ${process.env.NHL_LEGACY_ENGINE ? 'twelve outcomes including the supplied physical original' : 'eleven outcomes; one optional physical-original comparison explicitly skipped'} passed.`);
  }
  for (let index = 0; index < preservedPaths.length; index += 1) assert.deepEqual(await readFile(preservedPaths[index]), preserved[index], 'Engine, roster data and original shared helpers must stay byte-held');
  console.log('simNhlContributors: frozen original complete-season fingerprints/RNG counts, actual choices and roster lifecycle are exercised.');
  console.log('simNhlContributors: paired synthetic policy means and block headroom are printed; no new real NHL facts or booking are produced.');
  console.log('simNhlContributors: no Git history/network dependency; only owned source copies are written and removed.');
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
