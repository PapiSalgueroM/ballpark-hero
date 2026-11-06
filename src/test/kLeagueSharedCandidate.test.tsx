import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
const cm = await import('@/lib/clubManager');
const edit = await import('@/lib/clubManagerWorldEdit');
const market = await import('@/lib/managerJobMarket');
const sc = await import('@/lib/soccerCareerEngine');
const years = await import('@/lib/careerEras');
const ledger = await import('@/lib/soccerCareerLeague');
const { default: ClubManager } = await import('@/pages/ClubManager');
const pool = await import('@/data/soccerCareerClubPool');
const kLeague = await import('@/data/kLeague2026');
const importDraws = [...observed.draws];
const output = process.env.K_LEAGUE_CANDIDATE_OUT;
if (!output || !path.isAbsolute(output)) throw new Error('K_LEAGUE_CANDIDATE_OUT must be absolute');
const originalRaw = process.env.K_LEAGUE_ORIGINAL_RAW;
if (!originalRaw || !path.isAbsolute(originalRaw)) throw new Error('K_LEAGUE_ORIGINAL_RAW must be absolute');
fs.mkdirSync(output, { recursive: true });
const KEY = cm.SAVE_KEY;
const OLD_IDS = ["premier","championship","laliga","seriea","bundesliga","ligue1","eredivisie","saudi","mlsEast","mlsWest","primeira","scottish","superlig","bundesliga2","proleague","austria","greece","denmark","switzerland","croatia","brasileirao","ligamx","aleague","serieb","ligue2","segunda","russia"];
const MEMBERS = ["Gangwon FC","Gwangju FC","Gimcheon Sangmu","Daejeon Hana Citizen","Bucheon FC 1995","FC Seoul","FC Anyang","Ulsan HD","Incheon United","Jeonbuk Motors","Jeju SK","Pohang Steelers"];
const OLD_SC = [{"id":"fb-112","name":"Jeonbuk Motors","country":"South Korea","tier":3,"color":"#0C6B3E","league":"K League 1"},{"id":"fb-186","name":"Ulsan HD","country":"South Korea","tier":3,"color":"#0053A0","league":"K League 1"},{"id":"fb-187","name":"FC Seoul","country":"South Korea","tier":4,"color":"#AC1A2F","league":"K League 1"},{"id":"fb-188","name":"Pohang Steelers","country":"South Korea","tier":4,"color":"#C8102E","league":"K League 1"}];
const NEW_NAMES = MEMBERS.filter(name => !OLD_SC.some(row => row.name === name));
const FILES = ['old-catalogues', 'lookup-boundaries', 'old-custom-pending', 'old-world-edits', 'cm-reachability', 'sc-population'];
const written: { file: string; bytes: number; sha256: string; storedFile: string; storedBytes: number; storedSHA256: string }[] = [];
let index = 0;
let frames: unknown[] = [];
let fetches: unknown[] = [];
const realFetch = globalThis.fetch;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const storage = () => ({
  local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
});
function take(label: string, value: unknown = null) {
  const raw = localStorage.getItem(KEY);
  const row = { label, value: observed.pack(value), raw, saved: raw === null ? null : JSON.parse(raw),
    storage: storage(), dom: document.body.innerHTML, text: document.body.textContent ?? '',
    clock: new Date().toISOString(), globalAt: observed.draws.length, rngState: observed.state() };
  frames.push(row);
  return row;
}
function write(value: unknown, incomplete = false) {
  const file = FILES[index - 1] + '.json';
  const bytes = Buffer.from(JSON.stringify({ schema: 'K_LEAGUE_CANDIDATE_FULL_RAW_V1', seed: 8800 + index,
    importDraws, draws: observed.draws, frames, fetches, value: observed.pack(value), incomplete }), 'utf8');
  if (bytes.length > 44 * 1024 * 1024) throw new Error('K_LEAGUE_ORIGINAL_RAW_DECODED_BOUND');
  const gz = gzipSync(bytes);
  if (gz.length > 12 * 1024 * 1024) throw new Error('K_LEAGUE_ORIGINAL_RAW_STORED_BOUND');
  fs.writeFileSync(path.join(output!, file + '.gz'), gz);
  written.push({ file, bytes: bytes.length, sha256: sha(bytes), storedFile: file + '.gz', storedBytes: gz.length, storedSHA256: sha(gz) });
}
function customSpec(name: string): NonNullable<Parameters<typeof cm.startCareer>[2]> {
  return { name, stadium: 'Boundary Ground', leagueId: 'premier', replacedClub: '',
    budgetTier: 'mid', crest: { shape: 0, pattern: 2, color1: '#1d4ed8', color2: '#f8fafc', initials: 'FC' },
    quality: 66, identity: 'balanced', capacity: 18000 };
}
function resetRegistrations() {
  cm.registerCustomClub(null); cm.registerLeagueOverrides(null); market.invalidateOfferClubCache();
}
function saveAndLoad(career: Parameters<typeof cm.saveCareer>[0], label: string) {
  expect(cm.saveCareer(career), label + ' actual save').toBe(true);
  const source = take(label + ' complete original saved input', career);
  resetRegistrations();
  const loaded = cm.loadCareer();
  take(label + ' actual first load', { inputRaw: source.raw, loaded, registrations: cm.engineRegistrations() });
  expect(loaded, label + ' must load through the real engine').not.toBeNull();
  expect(cm.saveCareer(loaded!), label + ' real repaired save').toBe(true);
  const warm = take(label + ' complete repaired save', loaded);
  const second = cm.loadCareer();
  take(label + ' actual second load', { inputRaw: warm.raw, loaded: second, registrations: cm.engineRegistrations() });
  expect(second).not.toBeNull();
  return { source, loaded: loaded!, warm, second: second! };
}

const ORIGINAL_RAW_PINS = [["old-catalogues",35608,"cc342f9b39bb7c8158c356e2c7de9db7735e9e1341c83f6f3dce972d963ec1f9",195651,"75d911255a6ded667feb9451653ecf1d11db74f751d3c5cc1a38ed0d237cb369"],["lookup-boundaries",12550,"754bf878a41cab7046134aa458143e08d28460c44b24b9c17064e119f7be837b",88856,"ae419d507a9af8b4a150cb09150f5bc3c723485c8415747c06d7eaae84d1b51a"],["old-custom-pending",1516055,"4ebf461a380c647fb983f8fb9184889759d0952556a911d7b4acc6d7075d6fce",7825979,"2b3b5b385ff1f09db523035e5903147cd6b00d290283d5b3706e471fabc221e4"],["old-world-edits",563946,"899ce2173bdc703286319b4e45f85f0a16b9a4431a8388e2d12800f4453ec784",2934848,"cbf381563960eb3911a746bd4a6650c9ce07ac3cd0048be57a92231cc400c5b7"],["cm-reachability",3932,"b524250db907ace9d7eee4d13c3de3bb86e1a8992ecfdcc990a5b6add787dfe8",62136,"cfe21eeca1ba6df7c4972e672d7e91c8b0bc54e5f8d9aab608ca7b5fde8c661d"],["sc-population",11446,"53722ada8a6fd7bad178cc390c8dcae9f445f87ae3f3a7affc3a2e9e19c12fcc",59599,"9a506f329aec52b0e1f9ef21299d4968cd0fd06645801b850f3fb3a6ed8109aa"]];
type OriginalCapture = { frames: any[]; draws: number[]; importDraws: number[]; value: any };
const authenticated = new Map<string, OriginalCapture>();
function original(id: string): OriginalCapture {
  const cached = authenticated.get(id);
  if (cached) return cached;
  const pin = ORIGINAL_RAW_PINS.find(row => row[0] === id);
  if (!pin) throw new Error('K_LEAGUE_REFERENCE_UNKNOWN_CASE');
  const stored = fs.readFileSync(path.join(originalRaw!, id + '.json.gz'));
  expect(stored.length, 'K_LEAGUE_REFERENCE_STORED_BYTES').toBe(pin[1]);
  expect(sha(stored), 'K_LEAGUE_REFERENCE_STORED_SHA').toBe(pin[2]);
  const bytes = gunzipSync(stored, { maxOutputLength: 44 * 1024 * 1024 });
  expect(bytes.length, 'K_LEAGUE_REFERENCE_FULL_BYTES').toBe(pin[3]);
  expect(sha(bytes), 'K_LEAGUE_REFERENCE_FULL_SHA').toBe(pin[4]);
  const result = JSON.parse(bytes.toString('utf8')) as OriginalCapture;
  expect(result.importDraws, 'K_LEAGUE_HELD_IMPORT_TAPE').toEqual(importDraws);
  authenticated.set(id, result);
  return result;
}
function installStorage(value: ReturnType<typeof storage>) {
  localStorage.clear(); sessionStorage.clear();
  for (const [key, item] of Object.entries(value.local)) localStorage.setItem(key, item!);
  for (const [key, item] of Object.entries(value.session)) sessionStorage.setItem(key, item!);
}
function replaySaved(capture: OriginalCapture, round: any, label: string) {
  const source = round.source;
  const end = capture.frames.find(frame => frame.label === label + ' actual second load');
  if (!end) throw new Error('K_LEAGUE_REFERENCE_LOAD_BOUNDARY');
  resetRegistrations(); installStorage(source.storage);
  expect(localStorage.getItem(KEY)).toBe(source.raw);
  const realRandom = Math.random;
  const draws: number[] = [];
  let state = source.rngState >>> 0;
  Math.random = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5; state >>>= 0;
    const value = state / 4294967296; draws.push(value); return value;
  };
  try {
    const before = take('authenticated replay input ' + label, { source, declaredGlobalCheckpoint: source.rngState });
    const loaded = cm.loadCareer();
    const first = take('authenticated replay first load ' + label, { loaded, replayDraws: [...draws], replayState: state });
    expect(observed.pack(loaded), 'K_LEAGUE_AUTHENTIC_LOAD1 ' + label).toEqual(round.loaded);
    expect(loaded).not.toBeNull();
    expect(cm.saveCareer(loaded!), 'K_LEAGUE_AUTHENTIC_SAVE ' + label).toBe(true);
    const warm = take('authenticated replay saved normalization ' + label, { loaded, replayDraws: [...draws], replayState: state });
    expect(warm.raw, 'K_LEAGUE_AUTHENTIC_CODEC ' + label).toBe(round.warm.raw);
    const second = cm.loadCareer();
    const after = take('authenticated replay second load ' + label, { second, replayDraws: [...draws], replayState: state });
    expect(observed.pack(second), 'K_LEAGUE_AUTHENTIC_LOAD2 ' + label).toEqual(round.second);
    expect(after.storage, 'K_LEAGUE_AUTHENTIC_FULL_STORAGE ' + label).toEqual(end.storage);
    expect(draws, 'K_LEAGUE_AUTHENTIC_GLOBAL_REPLAY_TAPE ' + label).toEqual(capture.draws.slice(source.globalAt, end.globalAt));
    expect(state, 'K_LEAGUE_AUTHENTIC_REPLAY_CHECKPOINT ' + label).toBe(end.rngState);
    return { before, first, warm, after, loaded: loaded!, second: second!, replay: { seed: source.rngState, draws, state, expectedFrom: source.globalAt, expectedThrough: end.globalAt } };
  } finally { Math.random = realRandom; }
}

const oldOfferRows = () => {
  const names = new Set(cm.REAL_LEAGUES.filter(row => OLD_IDS.includes(row.id)).flatMap(row => row.clubs));
  return market.allOfferClubs().filter(row => names.has(row.name));
};
beforeEach(() => {
  cleanup(); resetRegistrations(); localStorage.clear(); sessionStorage.clear();
  index += 1; frames = []; fetches = []; observed.reset(8800 + index);
  vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetches.push(observed.pack(args));
    return Promise.reject(new Error('declared offline K League original test'));
  }) as typeof fetch;
});
afterEach(() => {
  if (!written.some(row => row.file === FILES[index - 1] + '.json')) write({ incomplete: true }, true);
  cleanup(); resetRegistrations(); globalThis.fetch = realFetch;
});
afterAll(() => {
  fs.writeFileSync(path.join(output!, 'closing.json'), JSON.stringify({ schema: 'K_LEAGUE_CANDIDATE_RAW_CLOSING_V1', rows: written }));
  Math.random = observed.realRandom; vi.useRealTimers();
});

describe('K League shared integration candidate acceptance', () => {
  it('holds the four old SC identities and complete old 27-league CM catalogue', () => {
    const old = cm.REAL_LEAGUES.filter(row => OLD_IDS.includes(row.id));
    const defs = old.map(row => ({ league: row, playable: cm.playableClubs(row.id) }));
    const korean = sc.FALLBACK_CLUBS.filter(row => OLD_SC.some(held => held.id === row.id));
    take('complete original catalogues', { leagues: cm.REAL_LEAGUES, nations: cm.NATIONS, defs, canonical: sc.FALLBACK_CLUBS, korean, offers: market.allOfferClubs() });
    write({ oldIds: OLD_IDS, defs, korean });
    const baseline = original('old-catalogues');
    expect(old, 'K_LEAGUE_OLD_27_DEFINITION_PREFIX').toEqual(baseline.frames[0].value.leagues);
    expect(defs, 'K_LEAGUE_OLD_27_PLAYABLE_PREFIX').toEqual(baseline.value.defs);
    expect(cm.NATIONS.slice(0, baseline.frames[0].value.nations.length), 'K_LEAGUE_OLD_NATION_PREFIX').toEqual(baseline.frames[0].value.nations);
    expect(sc.FALLBACK_CLUBS.slice(0, baseline.frames[0].value.canonical.length), 'K_LEAGUE_OLD_SC_PREFIX').toEqual(baseline.frames[0].value.canonical);
    expect(oldOfferRows(), 'K_LEAGUE_OLD_OFFER_PREFIX').toEqual(baseline.frames[0].value.offers);
    expect(old.map(row => row.id)).toEqual(OLD_IDS);
    expect(old.reduce((sum, row) => sum + row.clubs.length, 0)).toBe(454);
    expect(korean).toEqual(OLD_SC);
    expect(fetches).toEqual([]);
  });

  it('holds known historical canons and current-only lookup boundaries', () => {
    const before = observed.draws.length;
    const witnesses = [
      { name: 'Real Burgos', year: 1990, expected: null },
      { name: 'Girona', year: 2017, expected: 'Girona' },
      { name: 'Lazio', year: 1990, expected: 'Lazio' },
    ].map(row => ({ ...row, actual: ledger.clubLedgerSeason(row.name, row.year) }));
    const burgos = ledger.clubLedgerSeason('Burgos', 1990);
    const andorra = sc.FALLBACK_CLUBS.find(row => row.name === 'FC Andorra');
    expect(andorra, 'held FC Andorra canonical row is required').toBeTruthy();
    const old = years.adjustClubsForYear(sc.FALLBACK_CLUBS, 2025);
    const current = years.adjustClubsForYear(sc.FALLBACK_CLUBS, 2026);
    const korean = OLD_SC.map(row => ({ row, historical: ledger.leagueInYear(row, 2025), current: ledger.leagueInYear(row, 2026) }));
    const newNames = NEW_NAMES.map(name => ({ name, historical: ledger.clubLedgerSeason(name, 2025),
      currentDeclaredLabel: ledger.leagueInYear({ name, league: 'K League 1' }, 2026) }));
    take('complete source lookup observations', { witnesses, burgos, old, current, korean, newNames });
    write({ witnesses, burgos, korean, newNames });
    for (const row of witnesses) expect(row.actual?.canon).toBe(row.expected);
    expect(witnesses[0].actual).toMatchObject({ key: 'La Liga', canon: null });
    expect(burgos).toBeNull();
    expect(old.some(row => row.id === andorra!.id)).toBe(false);
    expect(current.some(row => row.id === andorra!.id)).toBe(true);
    expect(old.filter(row => OLD_SC.some(held => held.id === row.id))).toEqual(OLD_SC);
    expect(korean.map(row => row.current)).toEqual(OLD_SC.map(() => 'K League 1'));
    expect(newNames.map(row => row.historical)).toEqual(NEW_NAMES.map(() => null));
    expect(observed.draws.length).toBe(before);
    expect(fetches).toEqual([]);
  });

  it('holds authentic old custom names, pending applications, full saves and cache reset', () => {
    const baseline = original('old-custom-pending');
    const children: unknown[] = [];
    const originalOffers = original('old-catalogues').frames[0].value.offers;
    for (const child of baseline.value.children) {
      const name = child.spec.name;
      expect(['FC Anyang', 'Gangwon FC']).toContain(name);
      const round = replaySaved(baseline, child.round, name);
      const facts = { name, inputRaw: child.round.source.raw, round, def: cm.clubDefFor(name),
        saveLeague: cm.careerLeagueOf(round.second), nationOffer: cm.nationOfferFor(round.second),
        partial: cm.isPartialClub(name), activeKWorld: cm.careerHasKLeagueWorld(round.second), fullOffers: market.allOfferClubs() };
      take('complete held old custom context ' + name, facts);
      children.push(facts);
      expect(round.second.customClub).toEqual(JSON.parse(child.round.source.raw).customClub);
      expect(round.second.jobHunt?.open?.club).toBe('Arsenal');
      expect(facts.saveLeague.id).toBe('premier');
      expect(facts.nationOffer).toEqual(child.nationOffer);
      expect(facts.partial, 'K_LEAGUE_CUSTOM_NOT_REAL_MEMBER_PARTIAL ' + name).toBe(false);
      expect(facts.activeKWorld, 'K_LEAGUE_OLD_CUSTOM_WORLD_SCOPE ' + name).toBe(false);
      expect(cm.clubDefFor(name).color).toBe(round.second.customClub!.crest.color1);
      expect(cm.validateCustomClubName(name), 'new custom creation must reject a now-real name').not.toBeNull();
      const normal = cm.startCareer('Arsenal', 'now');
      const clean = saveAndLoad(normal, 'real career after ' + name);
      take('actual reset and offer-cache output after ' + name, { normal: clean.second, registrations: cm.engineRegistrations(), offers: market.allOfferClubs() });
      expect(cm.engineRegistrations().custom).toBeNull();
      expect(clean.second.customClub).toBeUndefined();
      expect(oldOfferRows()).toEqual(originalOffers);
    }
    write({ boundary: 'Exact authenticated complete old source inputs and real load normalization. Original pending targets are Arsenal. Fresh real careers intentionally add K.', children });
    expect(children).toHaveLength(2);
    expect(fetches).toEqual([]);
  }, 180000);
  it('holds authentic sparse and 27-key world edits, their saves and rejection controls', () => {
    const validationDrawsBefore = observed.draws.length;
    const sparse = edit.swapClubs(null, 'Celtic', 'Brentford');
    expect(sparse).not.toBeNull();
    const full = Object.fromEntries(cm.REAL_LEAGUES.filter(row => OLD_IDS.includes(row.id)).map(row => [row.id, [...edit.editedClubsOf(sparse, row.id)]]));
    const cleanSparse = edit.validWorldEdit(sparse);
    const cleanFull = edit.validWorldEdit(full);
    const pristine = JSON.stringify({ sparse, full });
    const keys = Object.keys(sparse!);
    const copies = [
      { label: 'remove actual member', input: { ...structuredClone(sparse!), [keys[0]]: sparse![keys[0]].slice(1) } },
      { label: 'duplicate actual member', input: { ...structuredClone(sparse!), [keys[0]]: sparse![keys[0]].map((name, n, rows) => n === 1 ? rows[0] : name) } },
      { label: 'unknown member', input: { ...structuredClone(sparse!), [keys[0]]: sparse![keys[0]].map((name, n) => n === 0 ? 'Unregistered Boundary Club' : name) } },
      { label: 'unknown key', input: { ...structuredClone(sparse!), unregistered: [...sparse![keys[0]]] } },
      { label: 'omit actual swap counterpart', input: { [keys[0]]: [...sparse![keys[0]]] } },
    ].map(row => ({ ...row, output: edit.validWorldEdit(row.input) }));
    const controlRestores = copies.map(row => {
      expect(JSON.stringify(row.input), row.label + ' must change actual data').not.toBe(JSON.stringify(sparse));
      const restored = structuredClone(row.input) as Record<string, string[]>;
      for (const key of Object.keys(restored)) delete restored[key];
      Object.assign(restored, structuredClone(sparse!));
      expect(restored).toEqual(sparse);
      expect(edit.validWorldEdit(restored)).toEqual(sparse);
      return { label: row.label, changed: true, restored, accepted: edit.validWorldEdit(restored) };
    });
    const validationDrawsAfter = observed.draws.length;
    const customInput = original('old-custom-pending').value.children[0].round.source;
    installStorage(customInput.storage);
    const oldCustom = cm.loadCareer();
    expect(oldCustom).not.toBeNull();
    const before = observed.pack(cm.engineRegistrations());
    const drawsBefore = observed.draws.length;
    let threw = false;
    try { edit.withWorldEdit(sparse, () => { take('scoped actual edit before declared throw', { registrations: cm.engineRegistrations(), celtic: cm.leagueOf('Celtic'), offers: market.allOfferClubs() }); throw new Error('declared scoped-registration restoration'); }); }
    catch (error) { if (!(error instanceof Error) || error.message !== 'declared scoped-registration restoration') throw error; threw = true; }
    const after = observed.pack(cm.engineRegistrations());
    const scopedDrawsAfter = observed.draws.length;
    const edited = cm.startCareer('Celtic', 'now', undefined, undefined, undefined, cleanSparse);
    const round = saveAndLoad(edited, 'authentic edited Celtic');
    take('complete authentic edit and guard results', { sparse, full, cleanSparse, cleanFull, copies, controlRestores, oldCustom, before, after, threw, round });
    const baseline = original('old-world-edits');
    const replay = replaySaved(baseline, baseline.value.round, 'authentic edited Celtic');
    take('complete authenticated old edited-world replay', replay);
    write({ sparse, full, cleanSparse, cleanFull, copies, controlRestores, before, after, threw, round, replay, validationDrawsBefore, validationDrawsAfter, drawsBefore, scopedDrawsAfter });
    expect(sparse, 'K_LEAGUE_AUTHENTIC_SPARSE_EDIT').toEqual(baseline.value.sparse);
    expect(full, 'K_LEAGUE_AUTHENTIC_27_KEY_EDIT').toEqual(baseline.value.full);
    expect(cm.careerHasKLeagueWorld(replay.second), 'K_LEAGUE_OLD_EDIT_WORLD_SCOPE').toBe(false);
    expect(Object.keys(full)).toHaveLength(27);
    expect(cleanSparse).toEqual(sparse);
    expect(cleanFull).toEqual(sparse);
    expect(JSON.stringify({ sparse, full })).toBe(pristine);
    for (const row of copies) expect(row.output, row.label).toBeNull();
    expect(edit.swapClubs(sparse, 'Celtic', 'Brentford')).toBeNull();
    expect(threw).toBe(true);
    expect(after).toEqual(before);
    expect(validationDrawsAfter).toBe(validationDrawsBefore);
    expect(scopedDrawsAfter).toBe(drawsBefore);
    expect(round.second.leagueOverrides).toEqual(sparse);
    expect(round.second.leagueClubs).toEqual(edited.leagueClubs);
    expect(fetches).toEqual([]);
  }, 180000);

  it('exposes South Korea and K League 1 through the real CM country and league UI', async () => {
    render(<MemoryRouter initialEntries={['/club-manager']}><ClubManager /></MemoryRouter>);
    const current = await screen.findByText('2026-27', { exact: true }, { timeout: 30000 });
    const eraButton = current.closest('button');
    if (!eraButton) throw new Error('actual current era text has no button');
    fireEvent.click(eraButton);
    await screen.findByText('England', { exact: true }, { timeout: 30000 });
    const country = screen.queryByText('South Korea', { exact: true });
    take('actual complete CM country picker before owned absence', { sourceNations: cm.NATIONS, hasCountry: !!country });
    let hasLeague = false;
    if (country) {
      const button = country.closest('button');
      if (!button) throw new Error('actual South Korea text has no button');
      fireEvent.click(button);
      await waitFor(() => expect(document.body.textContent).toContain('South Korea'));
      const league = screen.queryByText('K League 1', { exact: true });
      hasLeague = !!league;
      take('actual selected Korean league choices', { hasLeague });
    }
    const value = { hasCountry: !!country, hasLeague };
    take('actual CM reachability evidence', value);
    write(value);
    expect(value, 'K_LEAGUE_CM_REACHABLE').toEqual({ hasCountry: true, hasLeague: true });
    expect(fetches).toEqual([]);
  }, 60000);

  it('contains the eight new current-only SC identities in one shared 12-member population', () => {
    const rows = sc.FALLBACK_CLUBS.filter(row => MEMBERS.includes(row.name));
    const added = NEW_NAMES.map(name => ({ name, rows: sc.FALLBACK_CLUBS.filter(row => row.name === name) }));
    const before2026 = years.adjustClubsForYear(sc.FALLBACK_CLUBS, 2025).filter(row => NEW_NAMES.includes(row.name));
    take('complete original canonical population before owned absence', { members: MEMBERS, newNames: NEW_NAMES, rows, added, before2026, canonical: sc.FALLBACK_CLUBS });
    write({ members: MEMBERS, newNames: NEW_NAMES, rows, added, before2026, descriptor: kLeague.K_LEAGUE_2026 });
    expect(added.filter(row => row.rows.length !== 1).map(row => row.name), 'K_LEAGUE_SC_CANONICAL_POPULATION').toEqual([]);
    expect(rows.map(row => row.name).sort(), 'K_LEAGUE_SC_CANONICAL_POPULATION').toEqual([...MEMBERS].sort());
    expect(rows.every(row => row.country === 'South Korea' && row.league === 'K League 1')).toBe(true);
    expect(before2026, 'K_LEAGUE_CURRENT_ONLY').toEqual([]);
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map(row => row.id)).size).toBe(12);
    for (const name of NEW_NAMES) expect(pool.CAREER_POOL_SINCE[name], 'K_LEAGUE_NEW_GAME_AVAILABILITY ' + name).toBe(2026);
    expect(kLeague.K_LEAGUE_2026.clubs.map(row => row.name), 'K_LEAGUE_SHARED_MEMBERSHIP').toEqual(MEMBERS);
    expect(fetches).toEqual([]);
  });
});
