import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { qualifySoccerSegundaCup } from './soccerSegundaCupProbe.mjs';

const arg = name => { const index = process.argv.indexOf(name); assert(index >= 0 && process.argv[index + 1], name); return process.argv[index + 1]; };
assert(process.env.CI, 'Fixture generation is remote CI only');
const root = process.cwd(), out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist'));
const core = arg('--core'), originalDir = path.resolve(arg('--original'));
assert.match(core, /^[a-f0-9]{40}$/);
assert(out !== root && !out.startsWith(root + path.sep), 'Fixture output stays outside application source');
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0, 'Create immutable fixtures once');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const blob = value => crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + value.length + '\0'), value])).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
const json = value => JSON.parse(JSON.stringify(value));
const pins = {
  "scripts/lib/careerClubPool.mjs": "9ac9f0b9437f68e6a6b1f20c640afce109a8352f",
  "src/data/soccerCareerClubPool.ts": "9340217fac2ae3a86877ac878fcd677d22c973bd",
  "src/lib/clubManager.ts": "4b0a734e9fe9ba1e7139ead8d4fe5d6a1574c484",
  "src/data/clubManagerRosters.ts": "66fc430c504bfb97e5fd17762ed3084c2ff6c205",
  "scripts/data/soccerCareerFacts.json": "5a8bcd1ae9b048d2bfa6b759b6b8fff1a7131e13",
  "src/lib/soccerCareerEngine.ts": "94ccfb82dace9fc099c670357472732973e11d73",
  "src/lib/soccerCareerLeague.ts": "3bf1c117da22ea2253b8dce264da1ea3a49a0517",
  "src/lib/careerEras.ts": "e037022342382b1df9c8a5ede620d2cce480bc23",
  "src/lib/soccerCareerLeagueWorld.ts": "72fcabdd0c557a743aa849b01208140c3030048f",
  "src/data/soccerCareerLowerClubs.ts": "88318bbb4103ae91dccba1671b42b8e13fe3ddbc",
  "src/lib/soccerCareerCup.ts": "1d93842578afa4fb92ed3c012701022fbf9d2e9c",
  "scripts/data/domesticCupSources.json": "7ca21b866ac6641ff953c60c64f531bd674e48ce",
  "src/lib/soccerCareerSave.ts": "86ec011693fd5bc702b5e8ccec05d27775a72a76",
  "src/data/leagueFormat.ts": "802650466c0c4439f12c741e7d1ae28957280f9b",
  "src/pages/SoccerCareer.tsx": "e191a4634c44be5ebe511da0885579fdb6696dc5",
  "src/components/FlagImg.tsx": "f415a12892f747ecf07414e61710584ca98be6a8",
  "src/lib/confederationGroups.ts": "6e7fc26724cb56c6c6f5a1a68be4e32d41dbc3cd",
  "src/components/soccer-career/careerMoments.ts": "e9618355bc011458cde8930ceefdfec34d026b0d",
  "src/components/career-moments/useCareerMoment.ts": "1f9322dae64f5638b71df768dd818accec931871",
  "src/lib/soccerOfferReview.ts": "3b6f6c3e1edc2b002f9e675a3825887631b65830",
  "src/lib/season/momentsSave.ts": "c1ee578f855d29a107f8d69b71eb1258ed166ca9",
  "src/lib/soccerCareerLoyalty.ts": "54abe2e7ec76814be2b5be7e1d5c8501cfc2d6b1",
  "src/lib/soccerCareerLife.ts": "592170d7967162d9967e3cf13e22333afb840732"
};
for (const [file, pin] of Object.entries(pins)) {
  assert.equal(git('rev-parse', core + ':' + file), pin, file + ' measured core');
  assert.equal(blob(await fs.readFile(file)), pin, file + ' actual checkout');
}
const tracked = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const inventory = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(file))])));
async function distInventory() {
  const rows = [];
  async function walk(rel = '') {
    for (const entry of await fs.readdir(path.join(dist, rel), { withFileTypes: true })) {
      const file = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile()); const bytes = await fs.readFile(path.join(dist, file)); rows.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
const receipt = process.env.SIM_OFFLINE_RECEIPT;
async function offline() { assert(receipt); assert.equal((await fs.readFile(receipt)).length, 0); }
const sourceBefore = await inventory(), distBefore = await distInventory();
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), ''); assert(distBefore.length > 100); await offline();
const originalBytes = await fs.readFile(path.join(originalDir, 'evidence', 'savedOffers.json'));
assert.equal(originalBytes.length, 147189);
assert.equal(sha(originalBytes), '9eb5f205e07f525351e8766441b55f5e3570265f7500b75c36db9eb47b1bbeed');
const originalAdmission = JSON.parse(await fs.readFile(path.join(originalDir, 'admission.json'), 'utf8'));
assert.equal(originalAdmission.status, 'original-admitted'); assert.equal(originalAdmission.head, 'abd5f1d616a14da15c76ef380a4447a09a62cd86');
const original = JSON.parse(originalBytes.toString('utf8')).value;
const entry = path.join(out, 'entry.mjs'), bundle = path.join(out, 'engines.mjs');
const exports = {
  engine: 'src/lib/soccerCareerEngine.ts', codec: 'src/lib/soccerCareerSave.ts',
  moments: 'src/components/soccer-career/careerMoments.ts', offerReview: 'src/lib/soccerOfferReview.ts',
  cup: 'src/lib/soccerCareerCup.ts', world: 'src/lib/soccerCareerLeagueWorld.ts', seasonMoments: 'src/lib/season/momentsSave.ts',
};
await fs.writeFile(entry, Object.entries(exports).map(([name, file]) =>
  'export * as ' + name + ' from ' + JSON.stringify(path.join(root, file)) + ';').join('\n') + '\n', { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node',
  alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key), clear: () => memory.clear() };
const preparation = { scope: 'Declared fixture preparation only. Seeded Node setup is separate from the native creation journey, whose browser RNG and clock stay natural.', stages: [], noDraw: [], warming: [] };
async function prepare(label, seed, action, keepResult = true) {
  let state = seed >>> 0; const values = [], realRandom = Math.random, realNow = Date.now;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const value = state / 4294967296;
    values.push({ value, sites: (new Error().stack ?? '').split('\n').slice(2).map(line =>
      line.replaceAll(root, 'REPO').replaceAll(out, 'FIXTURES')) }); return value;
  };
  Date.now = () => Date.parse('2026-11-04T12:00:00Z');
  try {
    const result = await action();
    preparation.stages.push({ label, seed, preparationClock: '2026-11-04T12:00:00Z', draws: values,
      ...(keepResult ? { persistedSnapshot: json(result) } : {}) }); return result;
  } finally { Math.random = realRandom; Date.now = realNow; }
}
const module = await prepare('import actual reference bundle', 7301, () => import(pathToFileURL(bundle).href), false);
const { engine: E, codec: S, moments: M, offerReview: O, cup: C, world: W, seasonMoments: SM } = module;
function noDraw(label, action) {
  const real = Math.random; let calls = 0;
  Math.random = () => { calls += 1; throw new Error(label + ' unexpectedly consumed main random'); };
  try { const result = action(); assert.equal(calls, 0); preparation.noDraw.push({ label, calls,
    ...(result === undefined ? { returned: 'undefined' } : { persistedSnapshot: json(result) }) }); return result; } finally { Math.random = real; }
}
function differences(before, after, at = '$') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after))
    return [{ path: at, before, after }];
  const result = [];
  if (JSON.stringify(Object.keys(before)) !== JSON.stringify(Object.keys(after)))
    result.push({ path: at, keyOrderBefore: Object.keys(before), keyOrderAfter: Object.keys(after) });
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = Object.hasOwn(before, key), a = Object.hasOwn(after, key);
    if (!b || !a) result.push({ path: at + '.' + key, beforeExists: b, afterExists: a, ...(b ? { before: before[key] } : {}), ...(a ? { after: after[key] } : {}) });
    else result.push(...differences(before[key], after[key], at + '.' + key));
  }
  return result;
}
function load(raw) {
  const parsed = S.parseSoccerCareerSave(raw); assert(S.isSoccerCareerSave(parsed));
  const repaired = E.repairCareer(parsed);
  M.settleLoadedMoments(repaired);
  return { state: json(repaired), raw: S.serializeSoccerCareerSave(repaired) };
}
function warm(label, state) {
  const cold = S.serializeSoccerCareerSave(state), before = S.parseSoccerCareerSave(cold);
  const first = noDraw(label + ' actual page load', () => load(cold));
  const second = noDraw(label + ' second page load', () => load(first.raw));
  assert.equal(second.raw, first.raw, label + ' must be fully warmed after one exact page load');
  assert.deepEqual(second.state, first.state);
  preparation.warming.push({ label, cold, before: json(before), first, second,
    exactFieldDeltas: differences(before, first.state), secondFieldDeltas: differences(first.state, second.state) });
  return first;
}
async function writeFixture(kind, held, expected) {
  const file = kind + '.json'; await fs.writeFile(path.join(out, file), held.raw, { flag: 'wx' });
  assert.equal((await fs.readFile(path.join(out, file), 'utf8')), held.raw);
  return { key: 'soccerCareerSave', file, sha256: sha(held.raw), expected: { before: held.state, raw: held.raw, ...expected } };
}
const fixtures = {};
const legacyExtension = { declared: true, purpose: 'Unknown root field must survive original neutral saved offer loading and acceptance', values: ['held', null, { exact: 0.125 }] };
const legacyInput = json(original.input);
assert.equal(legacyInput.pendingOffers[0].club.id, 'career-lower-fc-andorra');
assert.equal(legacyInput.pendingOffers[0].club.color, '#64748b');
legacyInput.phase = 'contract_offer'; legacyInput.segundaNativeExtension = legacyExtension;
preparation.legacyInput = { admittedInput: original.input, admittedAccepted: original.signing.result,
  declaredOverrides: { phase: { before: original.input.phase, after: 'contract_offer' }, segundaNativeExtension: legacyExtension },
  scope: 'Actual original saved input plus a declared UI presentation phase and unknown-field sentinel. No newly generated or canonicalized market offer.' };
const legacy = warm('legacy neutral pending offer', legacyInput);
assert.equal(legacy.state.phase, 'contract_offer');
assert.deepEqual(legacy.state.pendingOffers, original.input.pendingOffers);
assert.deepEqual(legacy.state.seasons, original.input.seasons);
const legacySigned = noDraw('actual original-neutral offer acceptance', () => E.acceptOffer(json(legacy.state), json(legacy.state.pendingOffers[0])));
const originalSignedWithExtension = { ...json(original.signing.result.loaded), segundaNativeExtension: legacyExtension };
assert.deepEqual(json(legacySigned), originalSignedWithExtension, 'Actual full acceptance remains the admitted original frame plus declared unknown sentinel');
assert.equal(S.serializeSoccerCareerSave(legacySigned), S.serializeSoccerCareerSave(originalSignedWithExtension));
const signedLegacy = warm('accepted legacy neutral offer', legacySigned);
assert.equal(signedLegacy.raw, S.serializeSoccerCareerSave(legacySigned));
fixtures.legacy = await writeFixture('legacy', legacy, { signed: signedLegacy.state, signedBytes: signedLegacy.raw,
  offer: legacy.state.pendingOffers[0], review: noDraw('actual legacy review helper', () => O.buildSoccerOfferReview(json(legacy.state), json(legacy.state.pendingOffers[0]))),
  admittedOriginalSigned: original.signing.result.loaded, declaredUnknownExtension: legacyExtension,
  scope: 'Declared saved-offer presentation. Whole actual original acceptance reference is retained; old neutral ID, colour, terms and history are not migrated.' });

const stats = { pace: 66, shooting: 66, passing: 66, dribbling: 66, defending: 66, physical: 66, reflexes: 66 };
const started = await prepare('cup real constructor', 7401, () => E.initCareer('Declared Copa Fixture', 'Spain', 'CM', '2020s', stats, 66, 2023, E.FALLBACK_CLUBS, null, 90));
const youth = await prepare('cup real youth year', 7402, () => E.advanceYouthYear(json(started), E.FALLBACK_CLUBS));
const home = youth.pendingOffers.find(offer => offer.isHomegrown); assert(home);
const firstTeam = noDraw('cup real parent contract', () => E.acceptOffer(json(youth), json(home)));
const madrid = E.FALLBACK_CLUBS.find(club => club.name === 'Real Madrid'); assert(madrid);
const pro = noDraw('cup declared move to summary club', () => E.acceptOffer(json(firstTeam),
  { club: json(madrid), contractYears: 4, wage: 10000, transferFee: 0 }));
const season = (year, club, country, tier, age, cupRun) => ({
  ...json(pro.seasons.at(-1)), year, age, club, clubCountry: country, clubTier: tier, type: 'playing',
  apps: 42, leagueApps: 38, goals: 4, assists: 6, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 6.8,
  leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, cupRun,
});
const oldSpanish = season(2025, 'Real Madrid', 'Spain', 1, 18, { cup: 'Copa del Rey', stages: [{ stage: 'early', won: false }] });
const oldGeneric = season(2026, 'FC Andorra', 'Andorra', 4, 19, { stages: [{ stage: 'early', won: false }] });
const current = season(2027, 'Real Madrid', 'Spain', 1, 20, { cup: 'Copa del Rey', stages: [{ stage: 'early', won: false }],
  opening: { opp: 'FC Andorra', country: 'Andorra', league: 'Segunda Division', won: false, for: 0, against: 1, home: true } });
const cupInput = { ...json(pro), age: 20, phase: 'season_summary', contractYearsLeft: 1,
  seasons: [...json(pro.seasons), oldSpanish, oldGeneric, current], pendingSummary: current,
  pendingBallonDor: null, pendingTournament: null, pendingWorldCup: null, pendingRivalryEvent: null,
  socialMediaActionUsedThisSeason: false, segundaNativeExtension: { declared: true, purpose: 'Recorded fictional Copa result and legacy cup rows' } };
cupInput.leagueWorld = noDraw('declared partial Spanish world', () => W.leagueWorldForYear(cupInput, E.FALLBACK_CLUBS, 2027));
noDraw('record declared current partial world row', () => W.recordLeagueWorldSeason(cupInput, E.FALLBACK_CLUBS, current));
preparation.cupDeclaration = { input: json(cupInput), scope: 'Current and two old cup records are explicitly declared fictional results, not naturally played browser or engine seasons.' };
const cupFixture = warm('declared Copa summary and old history', cupInput);
const summary = cupFixture.state.pendingSummary;
assert(summary); assert.equal(cupFixture.state.phase, 'season_summary'); assert.equal(summary.year, 2027);
assert.deepEqual(C.readCupRun(summary), summary.cupRun);
assert.equal(C.cupExitLine(C.readCupRun(summary)), 'Copa del Rey: out in the early rounds.');
assert.equal(summary.leagueWorld.simulation, 'simulated-partial');
assert.deepEqual(cupFixture.state.seasons.at(-3), oldSpanish); assert.deepEqual(cupFixture.state.seasons.at(-2), oldGeneric);
assert.deepEqual(C.readCupRun(cupFixture.state.seasons.at(-3)), oldSpanish.cupRun);
assert.deepEqual(C.readCupRun(cupFixture.state.seasons.at(-2)), oldGeneric.cupRun);
const banked = SM.readSeasonMoments(cupFixture.state.seasonMoments);
assert(!banked || banked.banked || banked.m.length === 0, 'Page Continue takes the exact no-unbanked-moments branch');
const continuedState = noDraw('actual summary Continue wrapper branch', () => E.dismissSummary(json(cupFixture.state), E.FALLBACK_CLUBS));
assert.equal(continuedState.phase, 'social_media_action'); assert.equal(continuedState.pendingSummary, null);
assert.deepEqual(continuedState.seasons, cupFixture.state.seasons);
const continued = warm('continued declared Copa summary', continuedState);
fixtures.cup = await writeFixture('cup', cupFixture, { cupRead: C.readCupRun(summary), summaryLine: 'Copa del Rey: out in the early rounds.',
  oldRows: [oldSpanish, oldGeneric], continued: continued.state, continuedBytes: continued.raw,
  scope: 'Declared saved2027 Copa opening/read/display. FC Andorra opponent is verified in the saved row, not claimed as visible in the early-exit text or naturally delivered.' });

const paletteNames = ['Castellon', 'Burgos', 'Sabadell', 'Tenerife', 'Leganes', 'Cordoba', 'Eldense', 'FC Andorra', 'Ceuta', 'Albacete'];
const paletteColours = ['#2b2b2b', '#d9d9d9', '#1b458f', '#1b458f', '#1b458f', '#0a7040', '#7d1c2a', '#1b458f', '#d9d9d9', '#d9d9d9'];
const paletteConstructor = await prepare('palette real constructor', 7501, () => E.initCareer('Declared Palette Fixture', 'Spain', 'CM', '2020s',
  { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50, reflexes: 50 }, 50, 2026, E.FALLBACK_CLUBS, null, 90));
const paletteYouth = await prepare('palette actual youth transition', 7502, () => E.advanceYouthYear(json(paletteConstructor), E.FALLBACK_CLUBS));
const offers = paletteNames.map((name, index) => {
  const club = E.FALLBACK_CLUBS.find(club => club.name === name); assert(club); assert.equal(club.color, paletteColours[index]);
  return { club: json(club), contractYears: 3, wage: 7000 + index * 500, transferFee: 0 };
});
const paletteInput = { ...json(paletteYouth), phase: 'contract_offer', pendingOffers: offers,
  segundaNativeExtension: { declared: true, purpose: 'Ten deliberately prepared canonical offer cards for palette readability' } };
preparation.paletteDeclaration = { originalOffers: paletteYouth.pendingOffers, declaredOffers: offers };
const palette = warm('ten declared palette offers', paletteInput);
fixtures.palette = await writeFixture('palette', palette, { colours: offers.map(offer => ({ id: offer.club.id, name: offer.club.name,
  color: offer.club.color, country: offer.club.country, review: noDraw('actual palette review helper', () => O.buildSoccerOfferReview(json(palette.state), json(offer))) })),
  scope: 'Ten explicitly prepared offer terms with actual canonical club objects. Representative game palette, not official hex codes or natural offer delivery.' });
const cupRuntime = await qualifySoccerSegundaCup({ root, out, entry, bundle, module, prepare, preparation });
await fs.writeFile(path.join(out, 'preparation.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
const sourceAfter = await inventory(); assert.deepEqual(sourceAfter, sourceBefore); assert.deepEqual(await distInventory(), distBefore);
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), ''); await offline();
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({
  schema: 1, core, pins, sourceBefore, sourceAfter, distBefore, distDigest: sha(JSON.stringify(distBefore)),
  bundle: 'engines.mjs', bundleSHA: sha(await fs.readFile(bundle)), fixtures,
  preparation: { file: 'preparation.json', sha256: sha(await fs.readFile(path.join(out, 'preparation.json'))) },
  original: { run: 41958380733, artifact: 13383634508, savedOffersSHA256: sha(originalBytes) }, cupRuntime,
  loadSemantics: 'Actual page load is parse/is-save, repairCareer on the parsed owned frame, settleLoadedMoments, then serializer autosave. Every warming field delta is retained; second load is exact. Moment settling changes only its module-local seen set. The signing slip/toast are ephemeral and are not saved fields.',
  scope: 'Three declared complete warmed Soccer Career saves and actual source references. No natural creation payload is supplied. Main native creation uses the real UI50 build with natural browser RNG and clock. Primary reference bundle has no source transforms; a separate disclosed cup observer is checked against unchanged complete frames and main RNG values. No product edits, roster/provider/database changes or public fixture regeneration.',
}, null, 2) + '\n', { flag: 'wx' });
console.log('soccerSegundaFixtures: three complete warmed declared saves, original-neutral signing reference, full preparation and source/completed-dist holds retained.');
