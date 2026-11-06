import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const observed = vi.hoisted(() => {
  const realRandom = Math.random;
  let state = 1;
  const draws: number[] = [];
  const pack = (value: unknown): unknown => {
    if (value === undefined) return { $type: 'undefined' };
    if (typeof value === 'number' && !Number.isFinite(value)) return { $type: 'number', value: String(value) };
    if (Array.isArray(value)) return value.map(pack);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pack(item)]));
    return value;
  };
  Math.random = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5; state >>>= 0;
    const value = state / 4294967296;
    draws.push(value);
    return value;
  };
  return { realRandom, draws, pack, state: () => state,
    reset(seed: number) { state = seed >>> 0; draws.length = 0; } };
});


vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
const cm = await import('@/lib/clubManager');
const calendar = await import('@/lib/clubManagerCalendar');
const market = await import('@/lib/managerJobMarket');
const sc = await import('@/lib/soccerCareerEngine');
const codec = await import('@/lib/soccerCareerSave');
const kLeague = await import('@/data/kLeague2026');
type CMCareer = ReturnType<typeof cm.startCareer>;
type SCCareer = ReturnType<typeof sc.initCareer>;
const importDraws = [...observed.draws];
const output = process.env.K_LEAGUE_API_OUT;
const originalRaw = process.env.K_LEAGUE_ORIGINAL_RAW;
if (!output || !path.isAbsolute(output) || !originalRaw || !path.isAbsolute(originalRaw)) throw new Error('K_LEAGUE_API_OUTPUT_AND_REFERENCE_REQUIRED');
fs.mkdirSync(output, { recursive: true });
const FILES = ['membership-rosters', 'saved-world-access', 'manager-local-year', 'prepared-manager-targets'];
const MEMBERS = ["Gangwon FC","Gwangju FC","Gimcheon Sangmu","Daejeon Hana Citizen","Bucheon FC 1995","FC Seoul","FC Anyang","Ulsan HD","Incheon United","Jeonbuk Motors","Jeju SK","Pohang Steelers"];
const HELD = 'Gimcheon Sangmu';
const written: unknown[] = [];
let caseIndex = 0;
let frames: unknown[] = [];
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const storage = () => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
});
function take(label: string, value: unknown) {
  const row = { label, value: observed.pack(value), storage: storage(), clock: new Date().toISOString(),
    globalAt: observed.draws.length, rngState: observed.state() };
  frames.push(row); return row;
}
function write(value: unknown, incomplete = false) {
  const bytes = Buffer.from(JSON.stringify({ schema: 'K_LEAGUE_CANDIDATE_API_FULL_RAW_V1',
    seed: 9700 + caseIndex, importDraws, draws: observed.draws, frames, value: observed.pack(value), incomplete }), 'utf8');
  if (bytes.length > 44 * 1024 * 1024) throw new Error('K_LEAGUE_API_RAW_DECODED_BOUND');
  const gz = gzipSync(bytes);
  if (gz.length > 12 * 1024 * 1024) throw new Error('K_LEAGUE_API_RAW_STORED_BOUND');
  const file = FILES[caseIndex - 1] + '.json';
  fs.writeFileSync(path.join(output!, file + '.gz'), gz);
  written.push({ file, bytes: bytes.length, sha256: sha(bytes), storedFile: file + '.gz', storedBytes: gz.length, storedSHA256: sha(gz) });
}
function resetRegistrations() { cm.registerCustomClub(null); cm.registerLeagueOverrides(null); market.invalidateOfferClubCache(); }
function oldCustomCapture() {
  const stored = fs.readFileSync(path.join(originalRaw!, 'old-custom-pending.json.gz'));
  expect(stored.length, 'K_LEAGUE_AUTH_STORED_BYTES').toBe(1516055);
  expect(sha(stored), 'K_LEAGUE_AUTH_STORED_SHA').toBe('4ebf461a380c647fb983f8fb9184889759d0952556a911d7b4acc6d7075d6fce');
  const bytes = gunzipSync(stored, { maxOutputLength: 44 * 1024 * 1024 });
  expect(bytes.length, 'K_LEAGUE_AUTH_FULL_BYTES').toBe(7825979);
  expect(sha(bytes), 'K_LEAGUE_AUTH_FULL_SHA').toBe('2b3b5b385ff1f09db523035e5903147cd6b00d290283d5b3706e471fabc221e4');
  return JSON.parse(bytes.toString('utf8')) as { value: { children: any[] } };
}
function authenticatedOldCustom(child: any) {
  resetRegistrations(); localStorage.clear(); sessionStorage.clear();
  const source = child.round.source;
  for (const [key, value] of Object.entries(source.storage.local)) localStorage.setItem(key, value as string);
  for (const [key, value] of Object.entries(source.storage.session)) sessionStorage.setItem(key, value as string);
  expect(localStorage.getItem(cm.SAVE_KEY)).toBe(source.raw);
  take('before authentic CM load', { sourceRaw: source.raw, sourceStorage: source.storage });
  const loaded = cm.loadCareer();
  take('after authentic CM load', { loaded, registrations: cm.engineRegistrations() });
  expect(loaded).not.toBeNull();
  return loaded!;
}
function readOnlyCall(label: string, input: CMCareer, run: () => unknown) {
  const before = { inputJSON: JSON.stringify(input), storage: storage(), globalAt: observed.draws.length, rngState: observed.state() };
  const result = run();
  const after = { inputJSON: JSON.stringify(input), storage: storage(), globalAt: observed.draws.length, rngState: observed.state() };
  const row = { label, input, before, result, sameInput: result === input, after };
  take(label, row); return row;
}
function declaredManagerBoundary() {
  const fixture = JSON.parse(fs.readFileSync(path.resolve('scripts/data/soccerHistoricalV1UiFixture.json'), 'utf8')) as { saved: string };
  expect(sha(Buffer.from(fixture.saved)), 'K_LEAGUE_AUTHENTIC_SC_INPUT_CODEC').toBe('94ccf4bd1c09d4649fd1602e189dbac0f90ef9845963143dc216223c82f01e6c');
  const original = codec.parseSoccerCareerSave(fixture.saved) as SCCareer;
  if (!codec.isSoccerCareerSave(original) || !original.seasons.length) throw new Error('K_LEAGUE_SC_AUTHENTIC_INPUT_SETUP');
  expect(codec.serializeSoccerCareerSave(original)).toBe(fixture.saved);
  const state = structuredClone(original) as SCCareer;
  state.seasons = state.seasons.map((row, i, rows) => i === rows.length - 1 ? { ...row, year: 2024 } : row);
  state.phase = 'manager_season'; state.retired = true;
  state.managerState = { club: 'Arsenal', clubTier: 4, season: 0, trophies: 0, promotions: 0,
    seasonResults: [], nationalTeamOffer: false, managingNationalTeam: false, unemployed: true,
    seasonsOut: 0, departure: 'sacked', offers: [] };
  return { sourceSaved: fixture.saved, original,
    declaration: 'Prepared API boundary only. Complete authentic v1 UI input retained. Only its last existing record year becomes2024, phase/retired and explicit managerState are prepared. This is not observed retirement, a natural 2025 career or an original pending offer.',
    state };
}
beforeEach(() => {
  resetRegistrations(); localStorage.clear(); sessionStorage.clear();
  caseIndex += 1; frames = []; observed.reset(9700 + caseIndex);
  vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
});
afterEach(() => {
  if (!written.some((row: any) => row.file === FILES[caseIndex - 1] + '.json')) write({ incomplete: true }, true);
  vi.restoreAllMocks(); resetRegistrations();
});
afterAll(() => {
  fs.writeFileSync(path.join(output!, 'closing.json'), JSON.stringify({ schema: 'K_LEAGUE_CANDIDATE_API_RAW_CLOSING_V1', rows: written }));
  Math.random = observed.realRandom; vi.useRealTimers();
});

describe('K League declared API boundaries', () => {
  it('keeps twelve known members, eleven ordinary destinations and generated current squads', () => {
    const definitions = cm.REAL_LEAGUES.find(row => row.id === 'kleague1');
    const playable = cm.playableClubs('kleague1');
    const offers = market.allOfferClubs().filter(row => row.league === 'K League 1');
    const careers = MEMBERS.filter(name => name !== HELD).map(name => {
      take('before fresh real K constructor ' + name, { club: name, era: 'now' });
      const career = cm.startCareer(name, 'now');
      const result = { name, career, ownLeague: cm.careerLeagueOf(career), kWorld: cm.careerHasKLeagueWorld(career),
        partial: cm.isPartialClub(name), preview: cm.clubPreviewRating(name) };
      take('after fresh real K constructor ' + name, result);
      return result;
    });
    const beforeHeld = { storage: storage(), globalAt: observed.draws.length, rngState: observed.state(), registrations: cm.engineRegistrations() };
    let heldCareer: CMCareer | null = null, heldError: { name: string; message: string } | null = null;
    take('before declared held real constructor', beforeHeld);
    try { heldCareer = cm.startCareer(HELD, 'now'); }
    catch (error) { if (!(error instanceof Error)) throw error; heldError = { name: error.name, message: error.message }; }
    const afterHeld = { storage: storage(), globalAt: observed.draws.length, rngState: observed.state(), registrations: cm.engineRegistrations() };
    const value = { definitions, descriptor: kLeague.K_LEAGUE_2026, playable, offers, careers, beforeHeld, heldCareer, heldError, afterHeld,
      provenance: 'Fresh generated simulation squads. No factual roster/rating/market-price claim. Held membership is not military eligibility.' };
    take('complete fresh K constructors and held access', value); write(value);
    expect(definitions?.clubs, 'K_LEAGUE_SHARED_MEMBERSHIP').toEqual(MEMBERS);
    expect(playable.map(row => row.name).sort(), 'K_LEAGUE_ORDINARY_ACCESS').toEqual(MEMBERS.filter(name => name !== HELD).sort());
    expect(offers.map(row => row.name).sort(), 'K_LEAGUE_ORDINARY_ACCESS').toEqual(MEMBERS.filter(name => name !== HELD).sort());
    expect(heldError, 'K_LEAGUE_ORDINARY_ACCESS').toEqual({ name: 'Error', message: 'CM_CLUB_ACCESS_HELD' });
    expect(heldCareer, 'K_LEAGUE_ORDINARY_ACCESS').toBeNull();
    expect(afterHeld, 'K_LEAGUE_ORDINARY_ACCESS').toEqual(beforeHeld);
    for (const row of careers) {
      expect(row.ownLeague.id, 'K_LEAGUE_REAL_OWN_LEAGUE').toBe('kleague1');
      expect(row.kWorld, 'K_LEAGUE_REAL_OWN_WORLD').toBe(true);
      expect(row.partial, 'K_LEAGUE_MODEL_ONLY_PARTIAL').toBe(true);
      expect(row.career.squad.length, 'K_LEAGUE_GENERATED_SQUAD').toBeGreaterThanOrEqual(16);
      expect(row.career.squad.every(player => player.isYouth === true || player.generated === true), 'K_LEAGUE_GENERATED_SQUAD ' + row.name).toBe(true);
    }
  }, 180000);

  it('keeps authenticated old saved worlds closed across declared job and rollover APIs', () => {
    const children = oldCustomCapture().value.children.map(child => {
      const loaded = authenticatedOldCustom(child);
      const active = cm.careerHasKLeagueWorld(loaded);
      const defs = cm.worldLeagueDefs(loaded);
      const targets = cm.applyTargets(loaded);
      const calls = [];
      calls.push(readOnlyCall('old-save direct K summer target', loaded, () => cm.startNextSeason(loaded, 'FC Seoul')));
      const prepared = structuredClone(loaded);
      if (!prepared.jobHunt?.open) throw new Error('K_LEAGUE_ACTUAL_PENDING_SOURCE_REQUIRED');
      prepared.jobHunt.open = { ...prepared.jobHunt.open, club: 'FC Seoul', league: 'K League 1', status: 'accepted' };
      calls.push(readOnlyCall('declared accepted K target blocked in old world summer', prepared, () => cm.joinClubInSummer(prepared)));
      calls.push(readOnlyCall('declared accepted K target blocked in old world now', prepared, () => calendar.joinClubNow(prepared)));
      take('before direct old-world rollover ' + child.spec.name, { loaded });
      const rollover = cm.startNextSeason(loaded);
      take('complete old-world direct rollover ' + child.spec.name, { loaded, rollover });
      return { name: child.spec.name, sourceRaw: child.round.source.raw, loaded, active, defs, targets, calls, rollover,
        declaration: 'Source save and Arsenal application are authentic. The accepted FC Seoul target is explicitly prepared to test terminal refusal. Direct startNextSeason is an API boundary, not a played-season claim.' };
    });
    take('complete saved-world access and rollover outputs', children); write({ children });
    for (const child of children) {
      expect(child.active, 'K_LEAGUE_OLD_WORLD').toBe(false);
      expect(child.defs.some(row => row.id === 'kleague1'), 'K_LEAGUE_OLD_WORLD').toBe(false);
      expect(child.targets.some(row => row.leagueId === 'kleague1'), 'K_LEAGUE_OLD_WORLD').toBe(false);
      expect(cm.careerHasKLeagueWorld(child.rollover), 'K_LEAGUE_OLD_WORLD_ROLLOVER').toBe(false);
      expect(Object.keys(child.rollover.world ?? {}), 'K_LEAGUE_OLD_WORLD_ROLLOVER').not.toContain('kleague1');
      for (const call of child.calls) {
        expect(call.after, 'K_LEAGUE_OLD_WORLD_TERMINAL ' + call.label).toEqual(call.before);
        expect(call.sameInput || call.result === null, 'K_LEAGUE_OLD_WORLD_TERMINAL ' + call.label).toBe(true);
      }
    }
  }, 180000);

  it('uses the passed local manager season at the 2025 to 2026 market boundary', async () => {
    await sc.loadManagerMarket();
    expect(sc.managerMarketReady(), 'actual market preload').toBe(true);
    const boundary = declaredManagerBoundary();
    const before = structuredClone(boundary.state);
    const real = market.realJobOffers;
    const spy = vi.spyOn(market, 'realJobOffers').mockImplementation((...args) => real(...args));
    const msBefore = structuredClone(before.managerState!);
    take('before actual refreshManagerOffers', { career: before, localManager: msBefore });
    sc.refreshManagerOffers(before, msBefore);
    take('after actual refreshManagerOffers', { career: before, localManager: msBefore });
    const first = spy.mock.calls.map(args => ({ profile: args[0], rngIsGlobal: args[1] === Math.random, excluded: args[2], pool: args[3] }));
    take('before actual advanceManagerSeason', { career: boundary.state, clubs: sc.FALLBACK_CLUBS });
    const after = sc.advanceManagerSeason(boundary.state, sc.FALLBACK_CLUBS);
    take('after actual advanceManagerSeason', { career: after });
    const calls = spy.mock.calls.map(args => ({ profile: args[0], rngIsGlobal: args[1] === Math.random, excluded: args[2], pool: args[3] }));
    const value = { boundary, before, msBefore, first, after, calls,
      beforeYear: sc.managerNextSeasonYear(boundary.state), afterYear: sc.managerNextSeasonYear(after),
      noGuarantee: 'Pool membership is observed at actual realJobOffers fourth argument. No particular random offer is guaranteed.' };
    take('complete actual local-ms market calls', value); write(value);
    expect(value.beforeYear, 'K_LEAGUE_LOCAL_MS_YEAR').toBe(2025);
    expect(value.afterYear, 'K_LEAGUE_LOCAL_MS_YEAR').toBe(2026);
    expect(calls, 'K_LEAGUE_LOCAL_MS_YEAR').toHaveLength(2);
    expect(first[0].pool?.filter(row => row.league === 'K League 1'), 'K_LEAGUE_PRE2026_MARKET').toEqual([]);
    expect(calls[1].pool?.filter(row => row.league === 'K League 1').map(row => row.name).sort(), 'K_LEAGUE_LOCAL_MS_YEAR').toEqual(MEMBERS.filter(name => name !== HELD).sort());
    expect(calls.every(row => row.rngIsGlobal), 'K_LEAGUE_ACTUAL_CALLBACK').toBe(true);
  });

  it('keeps declared non-K same-name targets compatible and refuses early or held K targets', () => {
    const boundary = declaredManagerBoundary();
    const baseRow = market.allOfferClubs().find(row => row.name === 'Brentford');
    if (!baseRow) throw new Error('K_LEAGUE_EXISTING_REAL_PROVIDER_SETUP');
    const nonK = ['FC Anyang', 'Gangwon FC'].map(name => {
      const input = structuredClone(boundary.state);
      const offer = { club: name, league: 'Premier League', country: baseRow.country, tier: baseRow.tier, budget: baseRow.budget,
        brief: 'Declared compatibility target.', reason: 'Explicitly prepared target, not an observed original offer.' };
      input.managerState!.offers = [offer];
      const before = codec.serializeSoccerCareerSave(input), beforeStorage = storage(), beforeGlobal = observed.draws.length;
      take('before explicitly prepared non-K acceptance ' + name, { input, index: 0, before });
      const result = sc.acceptManagerOffer(input, 0);
      take('after explicitly prepared non-K acceptance ' + name, { input, result });
      const expected = { ...input, managerState: { ...input.managerState!, club: name, clubTier: offer.tier, league: 'Premier League',
        unemployed: false, seasonsOut: 0, offers: [], offerNote: undefined, seasonResults: [{
          year: input.managerState!.season, club: name, tier: offer.tier, result: 'Took the ' + name + ' job. ' + offer.brief, trophy: false,
        }] } };
      return { name, input, offer, before, result, expected, after: codec.serializeSoccerCareerSave(input),
        beforeStorage, afterStorage: storage(), beforeGlobal, afterGlobal: observed.draws.length };
    });
    const blocked = [ { name: 'FC Anyang', managerSeason: 0 }, { name: HELD, managerSeason: 1 } ].map(row => {
      const input = structuredClone(boundary.state);
      input.managerState!.season = row.managerSeason;
      input.managerState!.offers = [{ club: row.name, league: 'K League 1', country: 'South Korea', tier: 4, budget: 8,
        brief: 'Declared terminal-access test.', reason: 'Prepared source-defense target, not a natural offer.' }];
      const before = codec.serializeSoccerCareerSave(input), beforeStorage = storage(), beforeGlobal = observed.draws.length;
      take('before explicitly prepared blocked K acceptance ' + row.name, { input, index: 0, before });
      const result = sc.acceptManagerOffer(input, 0);
      take('after explicitly prepared blocked K acceptance ' + row.name, { input, result });
      return { row, input, before, result, sameInput: result === input, after: codec.serializeSoccerCareerSave(input),
        beforeStorage, afterStorage: storage(), beforeGlobal, afterGlobal: observed.draws.length };
    });
    const value = { boundary, baseRow, nonK, blocked,
      scope: 'Prepared defensive API inputs only. The six original RAW captures contain Arsenal applications and zero matching same-name generic offer rows; no original/natural SC same-name offer is claimed.' };
    take('complete prepared manager target outcomes', value); write(value);
    for (const row of nonK) {
      expect(observed.pack(row.result), 'K_LEAGUE_NON_K_TARGET_CONTEXT ' + row.name).toEqual(observed.pack(row.expected));
      expect(row.after).toBe(row.before); expect(row.afterStorage).toEqual(row.beforeStorage); expect(row.afterGlobal).toBe(row.beforeGlobal);
    }
    for (const row of blocked) {
      expect(row.sameInput, 'K_LEAGUE_MANAGER_ACCESS').toBe(true);
      expect(row.after, 'K_LEAGUE_MANAGER_ACCESS').toBe(row.before);
      expect(row.afterStorage, 'K_LEAGUE_MANAGER_ACCESS').toEqual(row.beforeStorage);
      expect(row.afterGlobal, 'K_LEAGUE_MANAGER_ACCESS').toBe(row.beforeGlobal);
    }
  });
});
