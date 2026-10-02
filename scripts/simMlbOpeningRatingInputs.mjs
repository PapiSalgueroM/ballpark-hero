/* Round903: official source preparation only, with copied executable refusal controls.
   No ratings, current roster updates, gameplay binding or independent stat verification. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { GAME_TEAMS, selectTwentySix, caughtGames, gameNames, gamePos } from './lib/mlbFoRecord.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), helperFile = 'scripts/lib/mlbOpeningRatingInputs.mjs', checkpointFile = 'scripts/data/mlbOpeningRatingInputs2026.json';
const sourceFiles = ['scripts/data/mlbRosters2026.json', 'scripts/data/mlbStats2026.json', 'src/data/mlbFoRosters2026.ts', 'scripts/lib/mlbFoRecord.mjs', 'scripts/genMlbFrontOfficeRoster.mjs', 'scripts/fetchMlbFoRecord.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = [helperFile, checkpointFile, ...sourceFiles].map(file => [file, holdSource(fs.readFileSync(path.join(root, file)))]);
const source = held[0][1].source, hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const executable = source => source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
const titles = {
  baseline: 'all four complete retained tables match the acquired field tuple hashes',
  identities: 'all780 exact current IDs and namesakes match the frozen source selection',
  dated: 'known missing seasons and dated pitching-role differences remain explicit',
  endings: 'the original current sources validate equally under LF and CRLF',
  window: 'wrong schema version future season and window are refused',
  scope: 'extra source blocks wrong groups and game types are refused',
  url: 'changed URL status redirects and request count are refused',
  manifest: 'changed raw provenance and incomplete or altered tables are refused',
  duplicate: 'duplicate foreign or malformed player IDs and row shapes are refused',
  hitting: 'missing negative fractional or nonfinite hitting fields are refused',
  missing: 'missing OPS remains null without mutating it into an observed zero',
  pitching: 'invalid pitching counts and starts exceeding games are refused',
  current: 'a physically changed current snapshot or wrong source path is refused',
  joins: 'altered780 identity mappings or dated diagnostics are refused',
  reading: 'the real reader refuses an incompatible checkpoint and accepts the original',
};
const controls = {
  window: ['input.version === MLB_INPUT_VERSION && input.schemaVersion === 1', 'true', [titles.window]],
  season: ["JSON.stringify(input.statsSeasons) === JSON.stringify(MLB_INPUT_WINDOW) && input.rosterSeason === 2026 && input.snapshotDate === '2026-10-02'", 'true', [titles.window, titles.reading]],
  scope: ["source.season === season && source.group === group && source.type === 'season' && source.gameType === 'R' && source.playerPool === 'ALL'", 'true', [titles.scope]],
  url: ['source.url === urlFor(season, group)', 'true', [titles.url]],
  status: ['source.status === 200 && source.attempts === 1 && source.redirectsFollowed === 0', 'true', [titles.url]],
  provenance: ['source.rawSha256 === rawHash && source.rawBytes === bytes && source.retrievedAt === retrievedAt', 'true', [titles.manifest]],
  complete: ['source.totalSplits === count && source.rowCount === count && rows.length === count', 'true', [titles.manifest]],
  tableCanonical: ['source.compactSha256 === compactHash', 'true', [titles.manifest]],
  tableHash: ['source.compactSha256 === inputHash(JSON.stringify(rows))', 'true', [titles.manifest]],
  identity: ['integer(row.id) && row.id > 0 && !ids.has(row.id)', 'true', [titles.duplicate]],
  rowFields: ["reject(sameKeys(row, fields), 'row-fields-' + label);", 'void fields;', [titles.duplicate]],
  hittingOpportunity: ['integer(row.pa)', 'true', [titles.hitting]],
  hittingRate: ["row.ops === null || (typeof row.ops === 'number' && Number.isFinite(row.ops) && row.ops >= 0)", 'true', [titles.hitting]],
  nullToZero: ['const label = `${season}-${group}-${row?.id}`;', "const label = `${season}-${group}-${row?.id}`; if (group === 'hitting' && row?.ops === null) row.ops = 0;", [titles.missing]],
  pitching: ["['g', 'gs', 'outs', 'hr', 'bb', 'k', 'sv'].every(field => integer(row[field]))", 'true', [titles.pitching]],
  starts: ['row.gs <= row.g', 'true', [titles.pitching]],
  currentHash: ['source?.normalizedSha256 === normalizedInputHash(fs.readFileSync(path.join(root, file)))', 'true', [titles.current]],
  currentCanonical: ['source?.normalizedSha256 === expectedCurrentHashes[index]', 'true', [titles.current]],
  currentPath: ['source?.path === file', 'true', [titles.current]],
  joins: ['JSON.stringify(input.current780) === JSON.stringify(current)', 'true', [titles.joins]],
  diagnostics: ['JSON.stringify(input.diagnostics) === JSON.stringify(mlbInputDiagnostics(input.tables, current))', 'true', [titles.joins]],
};
const control = process.env.MLB_OPENING_INPUTS_CONTROL ?? '';
assert.ok(!control || Object.hasOwn(controls, control), 'Known copied MLB input control');
for (const [anchor] of Object.values(controls)) {
  assert.equal(source.split(anchor).length - 1, 1, 'Unique source binding'); assert.equal(executable(source).split(anchor).length - 1, 1, 'Executable binding, not a comment');
  assert.equal(holdSource(Buffer.from(source.replace(/\n/g, '\r\n'))).source.split(anchor).length - 1, 1, 'Synthetic CRLF control binds once');
}
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-mlb903-inputs-'));
assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir())); assert.ok(path.basename(folder).startsWith('dukb-mlb903-inputs-'));
const outcomes = [];
try {
  let helperUrl = pathToFileURL(path.join(root, helperFile)).href, activeSource = source;
  if (control) {
    const [anchor, replacement] = controls[control], changed = source.replace(anchor, replacement); assert.notEqual(changed, source, 'Control changes actual helper');
    activeSource = changed;
    const copy = path.join(folder, 'mlbOpeningRatingInputs.mjs'); fs.writeFileSync(copy, changed.replace("from './mlbFoRecord.mjs'", `from '${pathToFileURL(path.join(root, 'scripts/lib/mlbFoRecord.mjs')).href}'`)); helperUrl = pathToFileURL(copy).href;
  }
  const H = await import(helperUrl), input = JSON.parse(held[1][1].source);
  const valid = value => H.validateMlbOpeningRatingInputs(value, root).valid;
  const rehash = (value, season = 2024, group = 'hitting') => { value.sources.find(s => s.season === season && s.group === group).compactSha256 = hash(JSON.stringify(value.tables[season][group])); return value; };
  // Private field fixtures reseal only the disposable helper's canonical tables,
  // so malformed fields reach their own guards rather than the immutable snapshot guard.
  const privateHelpers = new Map();
  const privateValid = async value => {
    let fixtureSource = activeSource;
    for (const original of input.sources) {
      const replacement = value.sources.find(s => s.season === original.season && s.group === original.group).compactSha256;
      assert.equal(fixtureSource.split(original.compactSha256).length - 1, 1, 'Private canonical hash binds once');
      fixtureSource = fixtureSource.replace(original.compactSha256, replacement);
    }
    const key = hash(fixtureSource);
    if (!privateHelpers.has(key)) {
      const copy = path.join(folder, `fields-${key}.mjs`);
      fs.writeFileSync(copy, fixtureSource.replace("from './mlbFoRecord.mjs'", `from '${pathToFileURL(path.join(root, 'scripts/lib/mlbFoRecord.mjs')).href}'`));
      privateHelpers.set(key, await import(pathToFileURL(copy).href));
    }
    return privateHelpers.get(key).validateMlbOpeningRatingInputs(value, root).valid;
  };
  const refuse = async (change, fieldFixture = false) => { const value = clone(input); change(value); assert.equal(fieldFixture ? await privateValid(value) : valid(value), false, 'Corrupted source input must be refused'); };
  const fixture = name => {
    const target = path.join(folder, name); fs.mkdirSync(target);
    for (const [file, { bytes }] of held.slice(1)) { const output = path.join(target, file); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes); }
    return target;
  };
  async function run(title, test) { try { await test(); outcomes.push({ title, status: 'passed' }); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; outcomes.push({ title, status: 'failed', message: error.message }); } }
  await run(titles.baseline, () => {
    const hashes = ['14d2b20bd795f5121df1252ac57d29c26c3250f974fc0359e5e52c8945d59443', '6b00da83798a987789a3c65fbd6eea6d0e0d6e35e372cb4e6ca2137a1b10c3e9', '6fea92878b82d471b1df2a11e9880407b863188ba67661a60f77875c7538440c', '14d9b57d0eab2267d0a116b740812da4c3a5e06ec84fd0e324c34a81175c4da2'];
    assert.deepEqual(input.sources.map(s => input.tables[s.season][s.group].length), [742, 855, 765, 873]);
    assert.deepEqual(input.sources.map(s => hash(JSON.stringify(input.tables[s.season][s.group]))), hashes);
    assert.equal(valid(input), true); assert.equal(input.publisherLineages, 1); assert.equal(input.independentlyVerified, false);
  });
  await run(titles.identities, () => {
    const record = JSON.parse(held.find(([p]) => p === sourceFiles[0])[1].source), stats = JSON.parse(held.find(([p]) => p === sourceFiles[1])[1].source), caught = caughtGames(stats);
    const chosen = Object.fromEntries(GAME_TEAMS.map(team => [team, selectTwentySix(record.teams[team].players, caught).men])), names = gameNames(chosen);
    const current = Object.entries(chosen).flatMap(([team, rows]) => rows.map(p => ({ id: p.id, originalName: p.name, name: names.get(p.id), team, pos: p.pos, gamePos: gamePos(p) })));
    assert.deepEqual(input.current780, current); assert.equal(current.length, 780); assert.equal(new Set(current.map(p => p.id)).size, 780); assert.equal(hash(JSON.stringify(current)), '1eafa6cb311e19d129f0f54996257174e06c41271a476446617c9a456301e7e8');
    assert.deepEqual([691777, 571970, 820862, 665877].map(id => current.find(p => p.id === id).name), ['Max Muncy (2002)', 'Max Muncy', 'José Fermin (2001)', 'José Fermín']);
  });
  await run(titles.dated, () => {
    assert.deepEqual(input.diagnostics.map(d => [d.season, d.matchedIds.length, d.missingIds.length, d.roleChanges.length]), [[2024, 584, 196, 59], [2025, 683, 97, 40]]);
    assert.equal(hash(JSON.stringify(input.diagnostics)), '0d1e042e5f525852f20f6a57a9d71b01eb6cde2c88320180960179439ede0a0b');
    assert.ok(input.diagnostics[0].missingIds.includes(694374)); assert.ok(input.diagnostics[1].missingIds.includes(814439));
    assert.deepEqual(input.diagnostics[0].roleChanges.find(p => p.id === 647336), { id: 647336, current: 'SP', prior: 'RP' });
  });
  await run(titles.endings, () => {
    for (const ending of ['LF', 'CRLF']) {
      const target = fixture(ending);
      for (const [file, { source }] of held.slice(1)) fs.writeFileSync(path.join(target, file), ending === 'CRLF' ? source.replace(/\n/g, '\r\n') : source);
      assert.equal(H.validateMlbOpeningRatingInputs(input, target).valid, true);
    }
  });
  await run(titles.window, async () => {
    await refuse(v => v.schemaVersion = 2); await refuse(v => v.version = 'future-unreviewed'); await refuse(v => v.statsSeasons = [2024, 2027]); await refuse(v => v.rosterSeason = 2027);
  });
  await run(titles.scope, async () => {
    await refuse(v => v.sources.push(clone(v.sources[0]))); await refuse(v => v.sources[0].group = 'fielding'); await refuse(v => v.sources[0].type = 'career'); await refuse(v => v.sources[0].gameType = 'P');
  });
  await run(titles.url, async () => {
    await refuse(v => v.sources[0].url = v.sources[0].url.replace('gameType=R', 'gameType=P')); await refuse(v => v.sources[0].status = 206); await refuse(v => v.sources[0].redirectsFollowed = 1); await refuse(v => v.sources[0].attempts = 2);
  });
  await run(titles.manifest, async () => {
    await refuse(v => v.sources[0].rawSha256 = '0'.repeat(64)); await refuse(v => v.sources[0].rawBytes++); await refuse(v => v.sources[0].retrievedAt = '2027-01-01T00:00:00Z');
    await refuse(v => { v.tables[2024].hitting.pop(); rehash(v); v.diagnostics = H.mlbInputDiagnostics(v.tables, v.current780); }, true);
    await refuse(v => v.sources[0].compactSha256 = '0'.repeat(64));
    await refuse(v => { v.tables[2024].hitting[0].ops += .001; rehash(v); });
    await refuse(v => v.tables[2024].hitting[0].ops += .001);
  });
  await run(titles.duplicate, async () => {
    await refuse(v => { v.tables[2024].hitting[1].id = v.tables[2024].hitting[0].id; rehash(v); }, true);
    await refuse(v => { v.tables[2024].hitting[0].id = -1; rehash(v); }, true);
    await refuse(v => { v.tables[2024].hitting[0].extra = 1; rehash(v); }, true);
  });
  await run(titles.hitting, async () => {
    for (const pa of [-1, 0.5, NaN]) await refuse(v => { v.tables[2024].hitting[0].pa = pa; rehash(v); }, true);
    for (const ops of [-1, NaN, Infinity, '0.700']) await refuse(v => { v.tables[2024].hitting[0].ops = ops; rehash(v); }, true);
  });
  await run(titles.missing, async () => {
    const value = clone(input); value.tables[2024].hitting[0].ops = null; rehash(value); const raw = JSON.stringify(value);
    assert.equal(await privateValid(value), true); assert.equal(value.tables[2024].hitting[0].ops, null); assert.equal(JSON.stringify(value), raw);
    assert.equal(input.tables[2024].hitting.find(p => p.pa === 0).ops, 0);
  });
  await run(titles.pitching, async () => {
    for (const outs of [-1, 0.5, NaN]) await refuse(v => { v.tables[2024].pitching[0].outs = outs; rehash(v, 2024, 'pitching'); }, true);
    await refuse(v => { v.tables[2024].pitching[0].gs = v.tables[2024].pitching[0].g + 1; rehash(v, 2024, 'pitching'); }, true);
  });
  await run(titles.current, async () => {
    await refuse(v => v.currentSources[0].path = 'foreign.json');
    const target = fixture('changed-current'); fs.appendFileSync(path.join(target, 'src/data/mlbFoRosters2026.ts'), '\n// Controlled current-source drift.\n');
    assert.equal(H.validateMlbOpeningRatingInputs(input, target).valid, false);
    const revised = clone(input); revised.currentSources.find(s => s.path === 'src/data/mlbFoRosters2026.ts').normalizedSha256 = H.normalizedInputHash(fs.readFileSync(path.join(target, 'src/data/mlbFoRosters2026.ts')));
    assert.equal(H.validateMlbOpeningRatingInputs(revised, target).valid, false, 'Caller cannot authorize a changed current snapshot');
  });
  await run(titles.joins, async () => {
    await refuse(v => v.current780[0].id = v.current780[1].id); await refuse(v => v.current780[0].name = 'Controlled false identity');
    await refuse(v => v.diagnostics[0].missingIds.pop()); await refuse(v => v.diagnostics[0].roleChanges[0].prior = 'CL');
  });
  await run(titles.reading, () => {
    assert.deepEqual(H.readMlbOpeningRatingInputs(root), input);
    const target = fixture('bad-reader'), wrong = clone(input); wrong.rosterSeason = 2027; fs.writeFileSync(path.join(target, checkpointFile), JSON.stringify(wrong));
    assert.throws(() => H.readMlbOpeningRatingInputs(target), /MLB source checkpoint refused/);
  });
  assert.equal(outcomes.length, 15); assert.equal(new Set(outcomes.map(r => r.title)).size, 15);
  console.log('MLB_INPUT_OUTCOMES ' + JSON.stringify({ control: control || 'normal', outcomes }));
  for (const title of [titles.baseline, titles.identities, titles.dated, titles.endings]) assert.equal(outcomes.find(r => r.title === title).status, 'passed', 'Independent retained-source baseline held');
  const failed = outcomes.filter(r => r.status === 'failed'), expected = control ? controls[control][2] : [];
  assert.deepEqual(failed.map(r => r.title).sort(), [...expected].sort(), 'Exact effective copied control outcomes');
  console.log(`MLB input ${control || 'normal'}: ${failed.length} intended failures/${15 - failed.length} held passes, all15 execute without skips.`);
  console.log('MLB input:742/855/765/873 official observations;780 exact current identities;2024 missing196/role59 and2025 missing97/role40 remain explicit.');
  console.log('MLB input:regular-season URL scope, complete unique numeric IDs, null/zero distinctions and original current data validated without transport.');
} finally {
  const resolved = path.resolve(folder); assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('dukb-mlb903-inputs-')); fs.rmSync(resolved, { recursive: true, force: true });
  for (const [file, { bytes }] of held) {
    const currentBytes = fs.readFileSync(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original current and owned new source raw bytes held');
  }
}
console.log('MLB input:CRLF-safe controls, raw source holds and bounded owned cleanup passed. One official publisher lineage, no independent stat verification or rating/gameplay adoption.');
