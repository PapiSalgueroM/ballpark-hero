/** Complete original/current offers, signed saves and exact copied-source faults.
 * Runtime belongs to the dedicated Actions job. Every declared seed is retained.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SOCCER_VETERAN_OFFERS_OUT || '.tmp-fx/soccer-veteran-offers');
const BASE = 'f78037dcddea12c1a02586c7d5c0e185efb86121';
const BASE_TREE = '1c9e7dcb11992442060cb162c288d0bcf37db0c2';
const ENGINE = 'src/lib/soccerCareerEngine.ts', CONTRACTS = 'src/lib/soccerCareerContracts.ts';
const REVIEW = 'src/lib/soccerOfferReview.ts';
const ENV_EXPRESSION = '{"DEV":false,"PROD":true,"MODE":"production"}';
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const lf = source => source.replaceAll('\r\n', '\n');
const json = value => JSON.stringify(value);
const copy = value => JSON.parse(json(value));
const equal = (actual, expected, message) => assert.equal(json(actual), json(expected), message);
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
fs.mkdirSync(path.join(OUT, 'objects'), { recursive: true });
const objects = new Map();
function retain(bytes) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const hash = sha(raw);
  if (!objects.has(hash)) {
    const packed = gzipSync(raw);
    const file = 'objects/' + hash + '.gz';
    fs.writeFileSync(path.join(OUT, file), packed);
    objects.set(hash, { hash, bytes: raw.length, file, packedBytes: packed.length, packedSha256: sha(packed) });
  }
  return hash;
}
const valueRef = value => retain(json(value));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, label + ' exact source anchor');
  assert.notEqual(from, to, label + ' effective source edit');
  return source.replace(from, to);
}
const head = git('rev-parse', 'HEAD').toString().trim();
assert.equal(git('rev-parse', BASE + '^{tree}').toString().trim(), BASE_TREE);
const heldFiles = [ENGINE, CONTRACTS, REVIEW, 'scripts/simSoccerVeteranOffers.mjs', 'package.json', 'package-lock.json'];
const sourceBefore = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const baseCache = new Map();
function original(file) {
  if (!baseCache.has(file)) baseCache.set(file, git('show', BASE + ':' + file));
  return baseCache.get(file);
}
const sites = [
  ['verdict', '        const offer = makeOffer(clubs, pick(tiers), overall, age, exclude, marketValue'],
  ['release-fallback', '        const last = makeOffer(clubs, 4, overall, age, exclude, 0'],
  ['expiry', '      const offer = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, 0'],
  ['bidding-a', '    const offerA = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue'],
  ['bidding-b', '    const offerB = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue'],
  ['dream', '    const dreamOffer = makeOffer(clubs, 1, overall, age, exclude, marketValue'],
  ['ordinary', '    const offer = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue'],
  ['request', '    const offer = makeOffer(clubs, pick(getInterestedTiers(state.overall, state.age)), state.overall, state.age, exclude, state.marketValue'],
];
function observe(source, baseline, patches) {
  let text = source;
  const apply = (from, to, name) => {
    const before = text;
    text = replaceOnce(text, from, to, name);
    patches.push({ name, file: ENGINE, from, to, before: retain(before), after: retain(text) });
  };
  for (const [id, prefix] of sites) {
    const line = text.split('\n').find(line => line.startsWith(prefix + ',') || line.startsWith(prefix + ')'));
    assert.ok(line, id + ' actual caller line');
    const indent = line.slice(0, line.length - line.trimStart().length);
    apply(line, indent + 'globalThis.__offerSite(' + JSON.stringify(id) + ');\n' + line, id);
  }
  const raw = '  return { club, contractYears: rand(1, 5), wage, transferFee: fee, isDreamClub: isDream, isPayCut: isDream };';
  const next = '  const terms = soccerTransferTerms({ age, overall, weeklyWage: wage, seasons }, wage, rand(1, 5));';
  if (baseline) apply(raw, '  const drawnYears = rand(1, 5);\n  const raw = { club, contractYears: drawnYears, wage, transferFee: fee, isDreamClub: isDream, isPayCut: isDream };\n  globalThis.__rawOffer(raw);\n  return raw;', 'completed-raw-offer');
  else apply(next, '  const drawnYears = rand(1, 5);\n  globalThis.__rawOffer({ club, contractYears: drawnYears, wage, transferFee: fee, isDreamClub: isDream, isPayCut: isDream });\n  const terms = soccerTransferTerms({ age, overall, weeklyWage: wage, seasons }, wage, drawnYears);', 'completed-raw-offer');
  const home = baseline ? '      return { type: "one_offer", offer: homecoming };'
    : '      const terms = soccerTransferTerms(state, homecoming.wage, homecoming.contractYears);';
  // A route fault replaces this declaration before observation, so its literal is also measured.
  const actualHome = text.includes(home) ? home : '      const terms = { wage: homecoming.wage, contractYears: homecoming.contractYears };';
  apply(actualHome, '      globalThis.__offerSite("homecoming");\n      globalThis.__rawOffer(homecoming);\n' + actualHome, 'completed-homecoming');
  return text;
}
const faultDefinitions = [
  { id: 'duration', file: CONTRACTS, from: 'contractYears: Math.min(offeredYears, quote.contractYears ?? offeredYears)', to: 'contractYears: offeredYears', failures: ['terms', 'homecoming', 'signing', 'boundaries'] },
  { id: 'wage', file: CONTRACTS, from: 'return { wage: quote.weeklyWage, contractYears: Math.min(offeredYears, quote.contractYears ?? offeredYears) };', to: 'return { wage: offeredWage, contractYears: Math.min(offeredYears, quote.contractYears ?? offeredYears) };', failures: ['terms', 'homecoming', 'signing', 'boundaries'] },
  { id: 'homecoming-route', file: ENGINE, from: '      const terms = soccerTransferTerms(state, homecoming.wage, homecoming.contractYears);', to: '      const terms = { wage: homecoming.wage, contractYears: homecoming.contractYears };', failures: ['homecoming', 'signing'] },
  { id: 'young', file: CONTRACTS, from: 'if (career.age < 30) return { wage: offeredWage, contractYears: offeredYears };', to: 'if (career.age < 30) return { wage: offeredWage + 1, contractYears: offeredYears };', failures: ['young', 'signing', 'boundaries'] },
  { id: 'draw', file: CONTRACTS, from: 'export function soccerTransferTerms(career: ExtensionCareer, offeredWage: number, offeredYears: number) {',
    to: 'export function soccerTransferTerms(career: ExtensionCareer, offeredWage: number, offeredYears: number) {\n  Math.random();', failures: ['raw-and-draws', 'young', 'terms', 'signing', 'boundaries'] },
  { id: 'input-mutation', file: CONTRACTS, from: 'export function soccerTransferTerms(career: ExtensionCareer, offeredWage: number, offeredYears: number) {',
    to: 'export function soccerTransferTerms(career: ExtensionCareer, offeredWage: number, offeredYears: number) {\n  if (career.seasons.length) career.seasons[0].rating += 0.01;', failures: ['raw-and-draws', 'signing', 'boundaries'] },
];
async function bundle(id, { baseline = false, observed = false, fault = null } = {}) {
  const dir = path.join(OUT, 'bundles', id);
  fs.mkdirSync(dir, { recursive: true });
  const entry = ['engine', 'contracts', 'review', 'life'].map((name, index) => 'export * as ' + name + ' from ' + JSON.stringify(path.join(ROOT, [ENGINE, CONTRACTS, REVIEW, 'src/lib/soccerCareerLife.ts'][index]).replaceAll('\\', '/')) + ';').join('\n');
  const entryFile = path.join(dir, 'entry.ts');
  fs.writeFileSync(entryFile, entry);
  const loaded = [], patches = [];
  let faultApplied = false;
  const result = await esbuild.build({
    stdin: { contents: entry, sourcefile: 'veteran-offers-entry.ts', resolveDir: ROOT, loader: 'ts' },
    outfile: path.join(dir, 'bundle.cjs'), bundle: true, format: 'cjs', platform: 'node',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    define: { 'import.meta.env': ENV_EXPRESSION }, logLevel: 'error', metafile: true,
    plugins: [{ name: 'held-source', setup(build) {
      build.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
        if (!relative.startsWith('src/')) return undefined;
        const raw = baseline ? original(relative) : fs.readFileSync(args.path);
        let served = lf(raw.toString());
        const canonical = served;
        if (fault && relative === fault.file) {
          const before = served;
          served = replaceOnce(served, fault.from, fault.to, fault.id);
          const restored = replaceOnce(served, fault.to, fault.from, fault.id + ' undo');
          assert.equal(restored, before, fault.id + ' complete source undo');
          patches.push({ name: fault.id, file: relative, from: fault.from, to: fault.to, before: retain(before), after: retain(served), restored: retain(restored) });
          faultApplied = true;
        }
        if (observed && relative === ENGINE) served = observe(served, baseline, patches);
        loaded.push({ file: relative, raw: retain(raw), normalized: retain(canonical), served: retain(served), rawSha256: sha(raw), normalizedSha256: sha(canonical), servedSha256: sha(served) });
        return { contents: served, loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (fault) assert.equal(faultApplied, true, fault.id + ' loaded');
  const code = fs.readFileSync(path.join(dir, 'bundle.cjs'), 'utf8');
  loaded.sort((a, b) => a.file.localeCompare(b.file));
  const inputs = Object.keys(result.metafile.inputs).map(file => {
    if (file === 'veteran-offers-entry.ts' || file === '<stdin>') return { file, kind: 'entry', raw: retain(entry), sha256: sha(entry) };
    if (file === '<define:import.meta.env>') return { file, kind: 'configured-define', configuredExpression: ENV_EXPRESSION, expressionSha256: sha(ENV_EXPRESSION) };
    const absolute = path.resolve(ROOT, file);
    const measured = loaded.find(row => path.resolve(ROOT, row.file) === absolute);
    return measured ? { file, kind: 'loaded-source', servedSha256: measured.servedSha256 }
      : { file, kind: 'dependency', raw: retain(fs.readFileSync(absolute)), sha256: sha(fs.readFileSync(absolute)) };
  });
  const metadata = { id, baseline, observed, fault: fault?.id ?? null, entrySha256: sha(entry), compiledSha256: sha(code), loaded, inputs, patches, metafile: result.metafile };
  write('bundles/' + id + '/receipt.json', metadata);
  fs.writeFileSync(path.join(dir, 'metafile.json'), json(result.metafile));
  return { id, code, metadata };
}
function mulberry(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function scope(bundle) {
  let tape = [], raw = [], calls = [], next = mulberry(1262), startupStacks = [];
  const math = Object.create(Math);
  math.random = () => { const value = next(); tape.push(value); if (startupStacks) startupStacks.push(new Error('startup draw').stack); return value; };
  class HeldDate extends Date { constructor(...args) { super(...(args.length ? args : [1800000000000])); } static now() { return 1800000000000; } }
  const context = vm.createContext({ console, process, Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
    Math: math, Date: HeldDate, module: { exports: {} }, exports: {}, require, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    __offerSite: id => calls.push(id), __rawOffer: offer => raw.push(copy(offer)) });
  vm.runInContext(bundle.code, context, { filename: path.join(OUT, 'bundles', bundle.id, 'bundle.cjs') });
  const exports = context.module.exports;
  const startup = { draws: valueRef(tape), stacks: valueRef(startupStacks), count: tape.length };
  startupStacks = null;
  function run(seed, method, input, args = []) {
    tape = []; raw = []; calls = []; next = mulberry(seed);
    const subject = copy(input), before = copy(subject), callArgs = copy(args), argsBefore = copy(callArgs);
    let output, error = null;
    try { output = method(exports, subject, ...callArgs); }
    catch (failure) { error = { name: failure.name, message: failure.message, stack: failure.stack }; }
    const result = { input: before, inputAfter: copy(subject), args: argsBefore, argsAfter: copy(callArgs), value: output === undefined ? null : copy(output), draws: [...tape], raw: copy(raw), sites: [...calls], error };
    result.refs = Object.fromEntries(['input', 'inputAfter', 'args', 'argsAfter', 'value', 'draws', 'raw', 'sites', 'error'].map(key => [key, valueRef(result[key])]));
    return result;
  }
  return { exports, startup, run };
}
const bundles = [];
for (const spec of [
  { id: 'original-plain', baseline: true }, { id: 'original-observed', baseline: true, observed: true },
  { id: 'current-plain' }, { id: 'healthy', observed: true },
  ...faultDefinitions.map(fault => ({ id: fault.id, observed: true, fault })), { id: 'undo', observed: true },
]) bundles.push(await bundle(spec.id, spec));
const healthyBundle = bundles.find(bundle => bundle.id === 'healthy'), undoBundle = bundles.find(bundle => bundle.id === 'undo');
assert.equal(undoBundle.code, healthyBundle.code, 'whole compiled undo equals healthy');
equal(undoBundle.metadata.loaded, healthyBundle.metadata.loaded, 'whole loaded source undo equals healthy');
const scopes = new Map(bundles.map(bundle => [bundle.id, scope(bundle)]));
const A = scopes.get('original-observed'), plainA = scopes.get('original-plain'), plainB = scopes.get('current-plain');
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(save => save.id === 'ere').state;
assert.ok(captured);
const clubs = copy(A.exports.engine.FALLBACK_CLUBS);
const findClub = name => { const club = clubs.find(club => club.name === name); assert.ok(club, name); return club; };
const parent = findClub('Real Madrid'), ordinaryClub = findClub('Twente');
function subject(spec) {
  const state = copy(captured), club = spec.forced || spec.loan ? parent : ordinaryClub;
  Object.assign(state, { age: spec.age, overall: spec.overall, weeklyWage: 100003, contractYearsLeft: spec.expiry || spec.release ? 1 : 4,
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
    phase: 'transfer_window', rival: null, loan: null, badSeasonStreak: 0, frozenOut: 0, agentId: spec.agent || 'cousin',
    academyClubName: parent.name, transferSituation: null, pendingLoanOffers: null });
  Object.assign(state.seasons.at(-1), { club: club.name, clubTier: club.tier, clubCountry: club.country, age: spec.age,
    type: 'playing', apps: spec.forced || spec.loan ? 2 : 32, leagueApps: spec.forced || spec.loan ? 2 : 30, rating: spec.rating });
  return state;
}
const profiles = [
  { id: 'young19', age: 19, overall: 82, rating: 7.2 }, { id: 'young25', age: 25, overall: 82, rating: 7.2 }, { id: 'young29', age: 29, overall: 90, rating: 8.2 },
  { id: 'elite32', age: 32, overall: 90, rating: 8.2 }, { id: 'holding34', age: 34, overall: 82, rating: 7.2, agent: 'super' },
  { id: 'weak38', age: 38, overall: 76, rating: 6.4 }, { id: 'expiry38', age: 38, overall: 90, rating: 8.2, expiry: true },
  { id: 'listed34', age: 34, overall: 66, rating: 5.9, forced: true },
  { id: 'released34', age: 34, overall: 66, rating: 5.9, forced: true, release: true },
  { id: 'fallback34', age: 34, overall: 76, rating: 5.9, forced: true, release: true, restricted: true },
  { id: 'loan21', age: 21, overall: 66, rating: 5.9, loan: true },
];
const boundarySpecs = [
  [19, 90, 8.2, 32, 1], [25, 90, 8.2, 32, 1], [29, 90, 8.2, 32, 1], [30, 90, 8, 20, 1.1], [33, 90, 8, 20, 1.1], [34, 90, 8, 20, 1.05],
  [44, 90, 8.2, 32, 1.05], [34, 90, 8.2, 19, 1], [34, 89, 8.2, 32, 1], [34, 90, 7.99, 32, 1],
  [30, 80, 7, 32, 1], [34, 79, 7, 32, .85], [30, 79, 6.7, 32, .95], [30, 79, 6.69, 32, .9],
  [34, 79, 6.7, 32, .85], [34, 79, 6.69, 32, .8], [34, 90, 8.2, undefined, 1],
  [34, 90, 8.2, 32, 1.05, 'latest-youth'], [34, 90, 8.2, 32, .85, 'no-playing'],
];
const receipts = Object.fromEntries(bundles.map(bundle => [bundle.id, { startup: scopes.get(bundle.id).startup, rows: [], groups: {}, coverage: {} }]));
const results = new Map();
function record(arm, id, group, result, extra = {}) {
  receipts[arm].rows.push({ id, group, ...extra, ...result.refs });
  if (!results.has(arm)) results.set(arm, new Map());
  results.get(arm).set(id, { group, refs: result.refs });
  return result;
}
const checks = new Map(bundles.map(bundle => [bundle.id, new Map()]));
function check(arm, group, id, action) {
  if (!checks.get(arm).has(group)) checks.get(arm).set(group, []);
  try { action(); checks.get(arm).get(group).push({ id, pass: true }); }
  catch (failure) {
    const complete = { name: failure.name, message: failure.message, stack: failure.stack, code: failure.code, operator: failure.operator, actual: failure.actual, expected: failure.expected };
    checks.get(arm).get(group).push({ id, pass: false, name: failure.name, completeFailure: valueRef(complete) });
  }
}
function multiplier(state) {
  if (state.age < 30) return 1;
  const last = [...state.seasons].reverse().find(row => row.type === 'playing');
  const form = last?.rating, veteran = state.age >= 34;
  if (state.overall >= 90 && form !== undefined && form >= 8 && (last?.apps ?? 0) >= 20) return veteran ? 1.05 : 1.1;
  if (state.overall >= 80 && form !== undefined && form >= 7) return 1;
  return (veteran ? .85 : .95) - (form !== undefined && form < 6.7 ? .05 : 0);
}
function offers(value) {
  if (!value) return [];
  if (value.offers) return value.offers;
  if (value.type === 'bidding_war') return [value.offerA, value.offerB];
  return value.offer ? [value.offer] : [];
}
function expectedSituation(state, baseline) {
  const expected = copy(baseline.value);
  for (const offer of offers(expected)) {
    if (offer.isLoan || state.age < 30) continue;
    const raw = baseline.raw.find(candidate => candidate.club.name === offer.club.name);
    assert.ok(raw, 'completed original offer retained');
    const penalty = expected.type === 'frozen_out' ? expected.mode === 'released' ? .7 : .85 : expected.type === 'contract_expiry' ? .85 : 1;
    offer.wage = Math.round(Math.round(raw.wage * multiplier(state)) * penalty);
    offer.contractYears = Math.min(raw.contractYears, state.age >= 34 ? 1 : 2);
  }
  return expected;
}
const activeArms = bundles.filter(bundle => !['original-plain', 'original-observed', 'current-plain'].includes(bundle.id));
let windowCount = 0, signingCount = 0;
for (const spec of profiles) for (let seed = 1; seed <= 256; seed++) {
  const input = subject(spec);
  const pool = spec.restricted ? clubs.filter(club => club.tier === 4).slice(0, 1) : clubs;
  assert.ok(pool.length, spec.id + ' pool');
  for (const route of ['window', 'request']) {
    if (spec.loan && route === 'request') continue;
    const id = spec.id + '/' + seed + '/' + route;
    const method = (module, state, clubPool) => module.engine[route === 'window' ? 'determineTransferSituation' : 'requestTransfer'](state, clubPool);
    const baseline = A.run(seed, method, input, [pool]);
    const group = spec.loan ? 'neutral' : spec.age < 30 ? 'young' : baseline.sites.includes('homecoming') ? 'homecoming' : 'terms';
    record('original-observed', id, group, baseline, { profile: spec.id, seed, route, alteredRecordedSave: true });
    const unobservedA = record('original-plain', id, group, plainA.run(seed, method, input, [pool]));
    const unobservedB = record('current-plain', id, group, plainB.run(seed, method, input, [pool]));
    const expected = expectedSituation(input, baseline);
    const expectedRef = valueRef(expected);
    for (const arm of activeArms) {
      const current = record(arm.id, id, group, scopes.get(arm.id).run(seed, method, input, [pool]), { expected: expectedRef, profile: spec.id, seed, route });
      check(arm.id, 'raw-and-draws', id, () => {
        assert.equal(current.error, null); assert.equal(baseline.error, null);
        equal(current.draws, baseline.draws, 'complete route draws'); equal(current.raw, baseline.raw, 'complete pre-policy offers');
        equal(current.sites, baseline.sites, 'actual route callers'); equal(current.inputAfter, baseline.inputAfter, 'complete route input after');
        equal(current.argsAfter, baseline.argsAfter, 'complete route arguments after');
      });
      check(arm.id, group, id, () => equal(current.value, expected, 'complete route result and exact two-step wage rounding'));
      if (arm.id === 'healthy') check(arm.id, 'raw-and-draws', id + '/observers', () => {
        for (const [plain, observed] of [[unobservedA, baseline], [unobservedB, current]]) {
          equal(plain.value, observed.value, 'whole plain/observed result');
          equal(plain.inputAfter, observed.inputAfter, 'whole plain/observed input after');
          equal(plain.argsAfter, observed.argsAfter, 'whole plain/observed arguments after');
          equal(plain.draws, observed.draws, 'whole plain/observed draw vector'); assert.equal(plain.error, null);
        }
      });
      for (const site of current.sites) receipts[arm.id].coverage[site] = (receipts[arm.id].coverage[site] || 0) + 1;
      for (const [index, offer] of offers(current.value).entries()) {
        const expectedOffer = offers(expected)[index] ?? null;
        const oracleOffer = expectedOffer ?? offer;
        const signedInput = { ...copy(current.inputAfter), transferSituation: copy(current.value) };
        const expectedInput = { ...copy(baseline.inputAfter), transferSituation: copy(expected) };
        const action = offer.isLoan ? 'acceptLoan' : 'acceptOffer';
        const sign = (module, state, offer) => module.engine[action](state, offer);
        const expectedSigned = A.run(seed + 1262, sign, expectedInput, [oracleOffer]);
        const signed = scopes.get(arm.id).run(seed + 1262, sign, signedInput, [offer]);
        const signId = id + '/sign/' + index;
        record(arm.id, signId, spec.loan ? 'neutral' : 'signing', signed, { expectedObservation: expectedSigned.refs, expectedOfferPresent: !!expectedOffer, action });
        const review = scopes.get(arm.id).run(seed, (module, state, offer) => module.review.buildSoccerOfferReview(state, offer), signedInput, [offer]);
        const expectedReview = A.run(seed, (module, state, offer) => module.review.buildSoccerOfferReview(state, offer), expectedInput, [oracleOffer]);
        record(arm.id, signId + '/review', spec.loan ? 'neutral' : 'signing', review, { expectedObservation: expectedReview.refs });
        const reloaded = scopes.get(arm.id).run(seed, (module, state) => module.engine.repairCareer(state), signed.value);
        const expectedReloaded = A.run(seed, (module, state) => module.engine.repairCareer(state), expectedSigned.value);
        record(arm.id, signId + '/reload', spec.loan ? 'neutral' : 'signing', reloaded, { expectedObservation: expectedReloaded.refs });
        check(arm.id, spec.loan ? 'neutral' : 'signing', signId, () => {
          assert.ok(expectedOffer, 'actual offer count and original index held');
          for (const pair of [[signed, expectedSigned], [review, expectedReview], [reloaded, expectedReloaded]]) {
            assert.equal(pair[0].error, null); assert.equal(pair[1].error, null);
            equal(pair[0].value, pair[1].value, 'whole actual signing/review/reload result');
            equal(pair[0].draws, pair[1].draws, 'whole signing/read/reload draw vector');
            equal(pair[0].inputAfter, pair[1].inputAfter, 'whole signing/read/reload input after');
            equal(pair[0].argsAfter, pair[1].argsAfter, 'whole signing/read/reload arguments after');
          }
          if (!offer.isLoan) {
            assert.equal(signed.value.weeklyWage, Math.round(expectedOffer.wage * A.exports.life.agentWageMult(input.agentId)));
            assert.equal(signed.value.contractYearsLeft, expectedOffer.contractYears);
            assert.equal(review.value.signedWage, signed.value.weeklyWage);
          }
          equal(review.draws, [], 'offer review draws no random values');
          equal(review.inputAfter, signedInput, 'offer review holds the full input');
        });
        if (arm.id === 'healthy') signingCount++;
      }
    }
    windowCount++;
  }
}
for (const arm of activeArms) {
  const current = scopes.get(arm.id);
  for (const [caseIndex, [age, overall, rating, apps, factor, variant]] of boundarySpecs.entries()) for (const years of [1, 3, 5]) {
    const input = subject({ age, overall, rating });
    input.weeklyWage = 999999;
    if (apps === undefined) delete input.seasons.at(-1).apps; else input.seasons.at(-1).apps = apps;
    if (variant === 'latest-youth') input.seasons.push({ ...copy(input.seasons.at(-1)), type: 'youth', rating: 9.9, apps: 80 });
    if (variant === 'no-playing') input.seasons = input.seasons.map(row => ({ ...row, type: 'youth' }));
    const id = 'boundary/' + caseIndex + '/' + years;
    const actual = record(arm.id, id, 'boundaries', current.run(1264, (module, state) => module.contracts.soccerTransferTerms(state, 100003, years), input));
    const expected = { wage: Math.round(100003 * factor), contractYears: age < 30 ? years : Math.min(years, age >= 34 ? 1 : 2) };
    check(arm.id, 'boundaries', id, () => {
      assert.equal(actual.error, null); equal(actual.value, expected, 'independent age/form boundary');
      equal(actual.inputAfter, input, 'pure terms hold every saved field'); equal(actual.draws, [], 'pure terms zero draws');
    });
  }
  for (const spec of profiles) for (const action of ['repairCareer', 'signExtension', 'stayAtClub']) {
    const input = subject(spec);
    if (action === 'stayAtClub') input.contractYearsLeft = 0;
    const method = (module, state) => module.engine[action](state);
    const originalResult = A.run(1264, method, input);
    const id = 'unchanged/' + spec.id + '/' + action;
    const actual = record(arm.id, id, 'neutral', current.run(1264, method, input), { expectedObservation: originalResult.refs });
    check(arm.id, 'neutral', id, () => {
      assert.equal(actual.error, null); assert.equal(originalResult.error, null);
      equal(actual.value, originalResult.value, 'whole existing extension/renewal/repair unchanged');
      equal(actual.draws, originalResult.draws, 'whole existing action vector unchanged');
      equal(actual.inputAfter, originalResult.inputAfter, 'whole existing action input after unchanged');
    });
  }
}
const expectedGroups = ['raw-and-draws', 'young', 'terms', 'homecoming', 'signing', 'boundaries', 'neutral'];
for (const arm of activeArms) {
  const groups = checks.get(arm.id);
  assert.deepEqual([...groups.keys()].sort(), [...expectedGroups].sort(), arm.id + ' all outcome groups actually executed');
  for (const [group, rows] of groups) receipts[arm.id].groups[group] = { assertions: rows.length, passed: rows.filter(row => row.pass).length, failures: rows.filter(row => !row.pass) };
}
const observationBytes = Buffer.from(json(receipts)), observationPacked = gzipSync(observationBytes);
fs.writeFileSync(path.join(OUT, 'observations.json.gz'), observationPacked);
const observationArchive = { file: 'observations.json.gz', rawBytes: observationBytes.length, rawSha256: sha(observationBytes), packedBytes: observationPacked.length, packedSha256: sha(observationPacked) };
write('observations-manifest.json', observationArchive);
write('objects.json', [...objects.values()]);
const outcomes = [];
const controlChecks = [];
for (const arm of activeArms) {
  const failed = expectedGroups.filter(group => receipts[arm.id].groups[group].failures.length);
  const fault = faultDefinitions.find(fault => fault.id === arm.id);
  let changedOutputs = 0;
  const changedRows = [], missingRows = [], extraRows = [];
  for (const [id, row] of results.get(arm.id)) {
    const held = results.get('healthy').get(id);
    if (!held) {
      extraRows.push({ id, group: row.group });
      changedOutputs++;
      controlChecks.push(() => assert.ok(fault?.failures.includes(row.group), arm.id + ' unexpected row outside intended groups:' + id));
      continue;
    }
    const changedKeys = Object.keys(row.refs).filter(key => row.refs[key] !== held.refs[key]);
    if (changedKeys.length) {
      changedRows.push({ id, group: row.group, changedKeys });
      changedOutputs++;
      for (const key of changedKeys) {
        const routeRead = !id.includes('/sign/') && (id.endsWith('/window') || id.endsWith('/request'));
        const group = routeRead && ['inputAfter', 'argsAfter', 'draws', 'raw', 'sites'].includes(key) ? 'raw-and-draws' : row.group;
        controlChecks.push(() => assert.ok(fault?.failures.includes(group), arm.id + ' unrelated complete ' + key + ' held:' + id));
      }
    }
  }
  for (const [id, row] of results.get('healthy')) if (!results.get(arm.id).has(id)) {
    missingRows.push({ id, group: row.group }); changedOutputs++;
    controlChecks.push(() => assert.ok(fault?.failures.includes(row.group), arm.id + ' missing row outside intended groups:' + id));
  }
  if (fault) {
    controlChecks.push(() => assert.ok(changedOutputs > 0, fault.id + ' effective actual outcome fault'));
    controlChecks.push(() => assert.deepEqual([...failed].sort(), [...fault.failures].sort(), fault.id + ' exact intended failed groups'));
    for (const group of failed) for (const failure of receipts[arm.id].groups[group].failures) controlChecks.push(() => assert.equal(failure.name, 'AssertionError'));
  } else controlChecks.push(() => assert.deepEqual(failed, [], arm.id + ' all groups pass'));
  outcomes.push({ arm: arm.id, failed, expectedFailed: fault?.failures ?? [], changedOutputs, changedRows, missingRows, extraRows });
}
write('controls.json', outcomes);
for (const [id] of sites) controlChecks.push(() => assert.ok(receipts.healthy.coverage[id] > 0, 'actual production caller executed:' + id));
controlChecks.push(() => assert.ok(receipts.healthy.coverage.homecoming > 0, 'actual homecoming route executed'));
const sourceAfter = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
equal(sourceAfter, sourceBefore, 'every held authored file unchanged on disk');
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => sum + (entry.isDirectory() ? size(path.join(dir, entry.name)) : fs.statSync(path.join(dir, entry.name)).size), 0);
const receipt = { head, tree: git('rev-parse', 'HEAD^{tree}').toString().trim(), baseline: BASE, baselineTree: BASE_TREE,
  seedRange: [1, 256], profiles, boundarySpecs, inputFixture: 'scripts/data/careerLeagueWorldSaves1100.json',
  inputFixtureSha256: sha(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'))),
  fixtureBytes: Buffer.byteLength(json(captured)), arms: bundles.length, groups: expectedGroups, outcomes, windowCount, signingCount,
  coverage: receipts.healthy.coverage, sourceBefore, sourceAfter, observationArchive, objects: objects.size, bytesBeforeReceipt: size(OUT),
  limitations: ['Route profiles alter a recorded save explicitly; they do not claim a naturally played veteran career.', 'The fixed cohort includes every no-offer result.', 'Startup vectors are retained separately from complete action vectors.', 'Signing and offer-review proof executes engine readers, not a browser page.', 'No unchanged whole veteran-output claim: only the independently specified offered terms differ.'] };
write('report.json', receipt);
for (const check of controlChecks) check();
assert.ok(size(OUT) < 430000000, 'proof physical bytes leave at least70MB within the whole500MB artifact cap');
console.log('ok   ' + windowCount + ' complete fixed-seed route outcomes, original/current observer pairs and unchanged action vectors');
console.log('ok   all eight actual offer callers, dream/homecoming and unchanged loan paths executed');
console.log('ok   ' + signingCount + ' actual signed saves with full review/reload results and independent exact wage rounding');
console.log('ok   exact age/form boundaries and full existing extension/renewal/load outcomes held');
console.log('ok   six effective copied-source faults with exact rejection maps; whole undo and unrelated output holds');
console.log('PASS Soccer veteran offers: ' + expectedGroups.length + ' groups, ' + bundles.length + ' retained bundle arms');
