import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd(), LIB = path.join(ROOT, 'src/lib');
const OUT = path.resolve(process.env.LOYALTY_REPAIR_OUT || 'soccer-loyalty-repair-artifacts');
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const OLD_REF = '4f49e6e133927e423fd9c3ba4060fad490ecadc2';
const OLD_SHA = '1e028bbd16a0305bd95eb0d16e86c9d4587dc3ade721ff75761797e47f5b9ae4';
const NEW_SHA = 'd7d94a36b796af66914cdf9bd4803cf42b027f423ceb8baac9fb144677de7030';
const FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json';
const SAVE = 'src/lib/soccerCareerSave.ts', DECK = 'scripts/lib/careerSoccerDeck1334.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const blob = value => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + value.length + '\0'), value])).digest('hex');
const read = p => fs.readFileSync(path.resolve(ROOT, p));
const write = (p, value) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, value); };
const json = (p, value) => write(p, JSON.stringify(value, null, 2) + '\n');
const copy = value => structuredClone(value);
const report = { status: 'STARTED', oldRef: OLD_REF, rows: [], controls: [], compatibility: {}, limits: [
  'Both engine arms use the same held current dependencies; only their complete engine bodies differ.',
  'Missing events is an invalid loader input, retained as corrupt-save robustness coverage.',
  'The active-ledger retirement input missing both primeType and events may differ only in raw key order.',
  'No ordinary career progression, full suite, build, route, or publication claim comes from this helper.',
] };
const resultPath = path.join(OUT, 'report.json');
const require = createRequire(import.meta.url);
let held = [];
function checkpoint() { json(resultPath, report); }
function pin(p, expected) {
  const bytes = read(p);
  assert.equal(blob(bytes), expected, 'Immutable Git body changed: ' + p);
  return bytes;
}
function random(seed, fn) {
  const original = Math.random, values = []; let state = seed >>> 0;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const x = state / 4294967296; values.push(x); return x; };
  try { const value = fn(); const draws = [...values]; const next = Math.random(); return { value, draws, next }; }
  finally { Math.random = original; }
}
function same(a, b, label) {
  try { assert.deepStrictEqual(a, b); } catch (error) { throw new Error(label + ': ' + error.message); }
}
async function bundle(label, source, physical) {
  const sourcePath = physical || path.join(OUT, 'source', label + '-engine.ts');
  write(sourcePath, source);
  const outfile = path.join(OUT, 'bundles', label + '.cjs');
  const normalized = p => path.resolve(p).replaceAll('\\', '/').toLowerCase();
  const canonical = normalized(path.join(ROOT, ENGINE));
  const built = await build({
    stdin: { contents: "export * from " + JSON.stringify(sourcePath) + "; export * as save from './src/lib/soccerCareerSave'; export * as loyalty from './src/lib/soccerCareerLoyalty';", resolveDir: ROOT, loader: 'ts' },
    outfile, bundle: true, format: 'cjs', platform: 'node', target: 'node24', metafile: true, logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'one-isolated-engine', setup(b) {
      b.onResolve({ filter: /(?:^|\/)soccerCareerEngine(?:\.ts)?$/ }, args => {
        const resolved = args.path.startsWith('@/') ? path.join(ROOT, 'src', args.path.slice(2)) : path.resolve(args.resolveDir, args.path);
        if (normalized(resolved).replace(/\.ts$/, '') === canonical.replace(/\.ts$/, '')) return { path: sourcePath };
      });
      b.onLoad({ filter: /\.ts$/ }, args => normalized(args.path) === normalized(sourcePath)
        ? { contents: fs.readFileSync(sourcePath, 'utf8'), loader: 'ts', resolveDir: LIB } : undefined);
    } }],
  });
  json(path.join(OUT, 'bundles', label + '.metafile.json'), built.metafile);
  const inputs = Object.keys(built.metafile.inputs), abs = p => normalized(path.resolve(ROOT, p));
  assert.equal(inputs.filter(p => abs(p) === normalized(sourcePath)).length, 1, 'One physical engine copy is required');
  assert.equal(inputs.filter(p => abs(p) === canonical).length, 0, 'Canonical engine leaked into an isolated arm');
  const dependencies = inputs.filter(p => p !== '<stdin>' && abs(p) !== normalized(sourcePath)).map(p => {
    const full = path.resolve(ROOT, p);
    return { path: p, sha256: sha(fs.readFileSync(full)) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const loaded = random(1047, () => require(outfile));
  return { api: loaded.value, dependencies, importDraws: loaded.draws, importNext: loaded.next,
    sourcePath, sourceSHA: sha(source), bundleSHA: sha(fs.readFileSync(outfile)) };
}
function run(api, input, seed, prefix) {
  const played = random(seed, () => api.repairCareer(copy(input)));
  const serialized = api.save.serializeSoccerCareerSave(played.value);
  const parsed = api.save.parseSoccerCareerSave(serialized);
  same(parsed, JSON.parse(JSON.stringify(played.value)), 'SAVE_ROUNDTRIP');
  const row = { state: played.value, parsed, draws: played.draws, next: played.next, serialized,
    loaderValid: api.save.isSoccerCareerSave(parsed), money: { netWorth: played.value.netWorth, totalEarnings: played.value.totalEarnings } };
  json(prefix + '.json', row); write(prefix + '.save.txt', serialized);
  return row;
}
function compare(a, b, allowOrder) {
  same(a.state, b.state, 'SEMANTIC');
  same(a.money, b.money, 'MONEY');
  same([a.draws, a.next], [b.draws, b.next], 'RNG');
  same(a.loaderValid, b.loaderValid, 'LOADER');
  const rawEqual = a.serialized === b.serialized;
  if (!allowOrder) assert.ok(rawEqual, 'RAW_BYTES: serialized save changed');
  else if (!rawEqual) {
    same(a.parsed, b.parsed, 'PARSED_SAVE');
    const rootSorted = state => JSON.stringify(Object.fromEntries(Object.keys(state).sort().map(key => [key, state[key]])));
    same(rootSorted(a.state), rootSorted(b.state), 'ROOT_KEY_ORDER_ONLY');
    assert.notDeepEqual(Object.keys(a.state), Object.keys(b.state), 'A permitted raw difference must actually reorder root keys');
  }
  return { semantic: true, money: true, rng: true, loader: true, rawEqual };
}
try {
  fs.mkdirSync(OUT, { recursive: true }); checkpoint();
  const old = execFileSync('git', ['show', OLD_REF + ':' + ENGINE], { maxBuffer: 8 * 1024 * 1024 });
  const current = read(ENGINE);
  assert.equal(sha(old), OLD_SHA); assert.equal(sha(current), NEW_SHA);
  pin(FIXTURE, '81425f731297f0ff72fc4e163dfe1a4cb86814ab');
  pin(SAVE, '86ec011693fd5bc702b5e8ccec05d27775a72a76');
  pin(DECK, 'cb15a38b58b61226dc0201630db33304c8bc7fb7');
  const block = '  if (s.loyaltyContracts !== undefined) {\n    const fixed = repairLoyalty(s);\n    if (fixed.loyaltyContracts === undefined) delete s.loyaltyContracts;\n    else s.loyaltyContracts = fixed.loyaltyContracts;\n    if (fixed !== s) s.events = fixed.events;\n  }\n';
  const prime = '  if (!s.primeType) s.primeType = rollPrimeType();\n';
  assert.equal(old.toString().split(block + prime).length, 2);
  assert.equal(old.toString().replace(block + prime, prime + block), current.toString(), 'Only the whole repair block may move');
  const deck = await import(pathToFileURL(path.join(ROOT, DECK)).href);
  let oldInverseError = '';
  try { deck.inverseSoccerDeck(ENGINE, old.toString(), []); } catch (error) { oldInverseError = error.message; }
  assert.match(oldInverseError, /engine-3 row of Round 1334's inverse/);
  const inverseRows = [], inverse = deck.inverseSoccerDeck(ENGINE, current.toString(), inverseRows);
  assert.equal(deck.soccerDeckReceiptProblem(inverseRows, [ENGINE]), '');
  write(path.join(OUT, 'compatibility', 'candidate-inverse.ts'), inverse);
  report.compatibility = { oldInverseError, candidateInverseRows: inverseRows, candidateInverseSHA: sha(inverse) };
  const a = await bundle('old', old), b = await bundle('candidate', current);
  same(a.dependencies, b.dependencies, 'DEPENDENCIES');
  same([a.importDraws, a.importNext], [b.importDraws, b.importNext], 'IMPORT_RNG');
  held = a.dependencies.map(item => ({ ...item, absolute: path.resolve(ROOT, item.path) }));
  for (const p of [ENGINE, FIXTURE, SAVE, DECK]) held.push({ path: p, absolute: path.join(ROOT, p), sha256: sha(read(p)) });
  report.sources = { old: { sha256: a.sourceSHA, bundleSHA: a.bundleSHA }, candidate: { sha256: b.sourceSHA, bundleSHA: b.bundleSHA }, dependencies: held };
  const packet = JSON.parse(read(FIXTURE)), saved = packet.saves.find(entry => entry.id === 'ere');
  assert.ok(saved && saved.state, 'Actual admitted ere fixture is required');
  const fixture = copy(saved.state);
  delete fixture.agentId; delete fixture.loyaltyContracts;
  fixture.phase = 'contract_offer'; fixture.retired = false; fixture.loan = null;
  fixture.currentClub = 'Previous Fixture Club'; fixture.weeklyWage = 8000;
  fixture.netWorth = 2; fixture.totalEarnings = 3; fixture.events = []; fixture.transferSituation = null;
  const offer = { club: { id: 'loyalty-fixture', name: 'Loyalty Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 }, wage: 10000, contractYears: 2, transferFee: 0 };
  fixture.pendingOffers = [copy(offer)];
  assert.ok(a.api.save.isSoccerCareerSave(fixture));
  const generated = random(7413, () => {
    const pending = a.api.loyalty.chooseLoyalty(copy(fixture), offer, offer.wage, 'loyalty');
    const active = a.api.acceptOffer(copy(pending), offer);
    assert.equal(a.api.loyalty.readLoyalty(active).deals[0].status, 'active');
    let paid = copy(active);
    for (let n = 0; n < 2; n++) {
      const last = paid.seasons.at(-1); paid.age = last.age + 1; paid.phase = 'rehab_choice';
      paid.pendingRehab = { name: 'Recorded test injury', weeks: 16, year: last.year + 1, specialistCost: null };
      paid = a.api.applyRehabChoice(paid, 1);
    }
    assert.equal(a.api.loyalty.readLoyalty(paid).deals[0].status, 'paid');
    const forfeited = a.api.manualRetire(copy(active));
    assert.equal(a.api.loyalty.readLoyalty(forfeited).deals[0].status, 'forfeited');
    const retiredActive = { ...copy(forfeited), loyaltyContracts: copy(active.loyaltyContracts) };
    return { noLedger: fixture, pending, active, paid, forfeited, retiredActive,
      malformedNull: { ...copy(fixture), loyaltyContracts: null },
      malformedObject: { ...copy(fixture), loyaltyContracts: { v: 1, deals: [{ status: 'paid', paidEuros: 1 }] } } };
  });
  json(path.join(OUT, 'fixture-generation.json'), generated);
  const corpus = [];
  for (const [kind, state] of Object.entries(generated.value)) for (const mode of ['complete', 'missingPrime', 'missingEvents', 'missingBoth']) {
    const input = copy(state);
    if (mode === 'missingPrime' || mode === 'missingBoth') delete input.primeType;
    if (mode === 'missingEvents' || mode === 'missingBoth') delete input.events;
    corpus.push({ id: kind + '-' + mode, input, orderException: kind === 'retiredActive' && mode === 'missingBoth' });
  }
  json(path.join(OUT, 'corpus.json'), corpus);
  const corpusBefore = JSON.stringify(corpus);
  for (const item of corpus) for (const seed of [17, 991]) {
    const row = { id: item.id, seed, status: 'STARTED', orderException: item.orderException };
    report.rows.push(row); checkpoint();
    const prefix = path.join(OUT, 'cases', item.id + '-' + seed);
    const oldResult = run(a.api, item.input, seed, prefix + '-old');
    const newResult = run(b.api, item.input, seed, prefix + '-candidate');
    Object.assign(row, compare(oldResult, newResult, item.orderException), { status: 'PASS' }); checkpoint();
  }
  assert.equal(report.rows.length, 64);
  report.corruptRawOrderWitnesses = report.rows.filter(row => !row.rawEqual).map(row => ({ id: row.id, seed: row.seed }));
  assert.ok(report.corruptRawOrderWitnesses.length <= 2);
  assert.ok(report.rows.filter(row => !row.orderException).every(row => row.rawEqual));
  assert.equal(JSON.stringify(corpus), corpusBefore);
  const start = 'export function repairCareer<T extends CareerState>(state: T): T {\n  if (!state || typeof state !== "object") return state;\n  const s = state as CareerState;\n';
  const faults = [
    ['money', '  s.netWorth += 1;\n', 'SEMANTIC'],
    ['rng', '  Math.random();\n', 'RNG'],
    ['rawOrder', '  if (Object.prototype.hasOwnProperty.call(s, "events")) { const keptEvents = s.events; delete (s as Partial<CareerState>).events; s.events = keptEvents; }\n', 'RAW_BYTES'],
  ];
  assert.equal(current.toString().split(start).length, 2);
  const physical = path.join(OUT, 'source', 'controlled-engine.ts'), input = generated.value.active;
  const normal = run(a.api, input, 17, path.join(OUT, 'controls', 'old-reference'));
  for (const [name, insertion, expected] of faults) {
    const row = { name, expected, status: 'STARTED' }; report.controls.push(row); checkpoint();
    const changed = current.toString().replace(start, start + insertion);
    assert.notEqual(sha(changed), NEW_SHA);
    write(path.join(OUT, 'controls', name + '-fault-engine.ts'), changed);
    try {
      const fault = await bundle(name + '-fault', changed, physical);
      const result = run(fault.api, input, 17, path.join(OUT, 'controls', name + '-fault'));
      same(fault.api.loyalty.readLoyalty(result.state), a.api.loyalty.readLoyalty(normal.state), 'Independent active ledger must remain readable');
      let rejection = '';
      try { compare(normal, result, false); } catch (error) { rejection = error.message; }
      assert.ok(rejection.startsWith(expected), 'Physical fault did not reach its exact guard: ' + rejection);
      Object.assign(row, { changedSHA: sha(changed), rejection });
    } finally { write(physical, current); assert.equal(sha(fs.readFileSync(physical)), NEW_SHA); }
    const restored = await bundle(name + '-restored', current, physical);
    const result = run(restored.api, input, 17, path.join(OUT, 'controls', name + '-restored'));
    Object.assign(row, { restored: compare(normal, result, false), restoredSHA: sha(fs.readFileSync(physical)), status: 'PASS' }); checkpoint();
  }
  for (const item of held) assert.equal(sha(fs.readFileSync(item.absolute)), item.sha256, 'Held source changed: ' + item.path);
  report.status = 'SUCCESS'; checkpoint();
  console.log('PASS repair relocation: 64 actual old/candidate repair pairs, ' + report.rows.filter(row => row.rawEqual).length + ' exact save bytes, ' + report.corruptRawOrderWitnesses.length + ' explicit corrupt key-order witnesses; 3 physical faults and same-copy restores; actual Round1334 inverse restored.');
} catch (error) {
  report.status = 'FAILURE'; report.failure = { message: error.message, stack: error.stack }; checkpoint();
  console.error(error.stack); process.exitCode = 1;
}
