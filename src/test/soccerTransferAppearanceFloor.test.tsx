import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import AgentBrief from '@/components/soccer-career/AgentBrief';
import * as E from '@/lib/soccerCareerEngine';
import { setTransferBrief, readTransferBrief, transferBriefCandidates, type TransferBriefPriority } from '@/lib/soccerCareerTransferBrief';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

type Brief = NonNullable<ReturnType<typeof readTransferBrief>> & { minimumApps?: number };
type Preview = ReturnType<typeof E.transferBriefPreview> & { minimumApps?: number; blockedReason?: string };
const set = setTransferBrief as (c: E.CareerState, priority: TransferBriefPriority | null, minimumApps?: number) => E.CareerState;
const preview = E.transferBriefPreview as (c: E.CareerState, clubs: E.ClubData[], minimumApps?: number) => Preview;
const read = (c: E.CareerState) => readTransferBrief(c, E.projectLeagueApps) as Brief | null;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const home: E.ClubData = { id: 'floor-home', name: 'Appearance Home FC', country: 'England', league: 'Fixture Home League', color: '#123456', tier: 2 };
const higher: E.ClubData = { ...home, id: 'floor-high', name: 'Level Choice FC', league: 'Fixture Upper League' };
const abroad: E.ClubData = { ...home, id: 'floor-abroad', name: 'Minutes Abroad FC', country: 'France', league: 'Fixture Away League', tier: 3 };
const domestic: E.ClubData = { ...home, id: 'floor-domestic', name: 'Minutes Home FC', league: 'Fixture Lower League', tier: 3 };
const clubs = [home, higher, abroad, domestic];
const tape = [0.1, 0.7, 0.2, 0.8, 0.3, 0.6, 0.4];
function fixture(): E.CareerState {
  const c = E.initCareer('Appearance Fixture', 'England', 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 }, 75, 2020, [{ ...home, tier: 1 }], null, 90);
  const row: E.SeasonRecord = { year: 2028, age: 24, club: home.name, clubCountry: home.country, clubTier: 2,
    apps: 25, goals: 9, assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: 75,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  return { ...c, age: 24, currentClub: home.name, currentClubCountry: home.country, currentClubTier: 2, currentClubColor: home.color,
    currentLeague: home.league, weeklyWage: 8000, contractYearsLeft: 1, phase: 'transfer_window', transferSituation: { type: 'no_interest' },
    pendingOffers: [], retired: false, agentId: 'self', seasons: [...c.seasons, row] };
}
function held(c: E.CareerState) { return { value: clone(c), draws: vi.mocked(Math.random).mock.calls.length }; }
function raw(name: string, c: E.CareerState, before: ReturnType<typeof held>, observed: unknown) {
  const value = { case: name, fixture: 'Fictional clubs and one controlled senior record; real projection/search/acceptance/codec, not natural career reproduction.',
    inputHeld: isDeepStrictEqual(c, before.value), observed };
  if (process.env.SC_TRANSFER_FLOOR_RAW) { mkdirSync(process.env.SC_TRANSFER_FLOOR_RAW, { recursive: true }); writeFileSync(join(process.env.SC_TRANSFER_FLOOR_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
  expect(c).toEqual(before.value); expect(localStorage.getItem('appearance-floor-unrelated')).toBe('held'); return value;
}
function reload(c: E.CareerState) {
  localStorage.setItem('soccerCareerSave', serializeSoccerCareerSave(c));
  const loaded = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  expect(isSoccerCareerSave(loaded)).toBe(true); expect(loaded).toEqual(clone(c)); return loaded;
}
function request(c: E.CareerState, pool = clubs) {
  let cursor = 0; vi.mocked(Math.random).mockImplementation(() => tape[cursor++ % tape.length]);
  const start = vi.mocked(Math.random).mock.calls.length, next = E.requestTransferDecision(c, pool);
  return { next, draws: vi.mocked(Math.random).mock.results.slice(start).map(row => row.value) };
}
function offered(c: E.CareerState) { return c.transferSituation?.type === 'request_result' ? c.transferSituation.offer : null; }
function bands() { return clubs.map(c => ({ club: c.name, band: E.projectLeagueApps(75, c.tier, c.name, 0) })); }
beforeEach(() => { localStorage.clear(); localStorage.setItem('appearance-floor-unrelated', 'held'); vi.spyOn(Math, 'random').mockReturnValue(0.1); vi.spyOn(Date, 'now').mockReturnValue(1793793600000); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer transfer appearance minimum', () => {
  it('saves a native projected minimum and signs the lower level club meeting its actual appearance band', () => {
    const initial = fixture(), before = held(initial), changed = vi.fn(); let current = initial;
    function App() { const [career, setCareer] = useState(initial); return <AgentBrief career={career} clubs={clubs} onCareer={fn => setCareer(prev => { const next = fn(prev); current = next; changed(next); return next; })} />; }
    const view = render(<App />); fireEvent.click(view.getByRole('button', { name: 'Set transfer priority' })); fireEvent.click(view.getByRole('button', { name: 'Choose a priority' }));
    const minimum = view.queryByRole('combobox', { name: 'Minimum projected league appearances' });
    if (minimum) fireEvent.change(minimum, { target: { value: '26' } });
    fireEvent.click(view.getByRole('button', { name: /Highest available level/ }));
    expect(changed).not.toHaveBeenCalled(); fireEvent.click(view.getByRole('button', { name: 'Save brief' }));
    const staged = reload(current), selectionDraws = vi.mocked(Math.random).mock.calls.length - before.draws, result = request(staged), offer = offered(result.next), signed = offer ? reload(E.acceptOffer(result.next, offer)) : null;
    raw('native-save-sign', initial, before, { picker: !!minimum, brief: staged.transferBrief, offer, selectionDraws, requestDraws: result.draws, signed: signed && { club: signed.currentClub, tier: signed.currentClubTier, wage: signed.weeklyWage, band: E.projectLeagueApps(signed.overall, signed.currentClubTier, signed.currentClub, 0) }, bands: bands(), callbacks: changed.mock.calls.length });
    expect(selectionDraws).toBe(0);
    expect([read(staged)?.minimumApps, offer?.club.tier, signed && E.projectLeagueApps(signed.overall, signed.currentClubTier, signed.currentClub, 0).min], 'SC_TRANSFER_FLOOR_NATIVE').toEqual([26, 3, 26]);
    expect(changed).toHaveBeenCalledTimes(1); expect(result.draws).toEqual(tape); expect(signed?.weeklyWage).toBe(offer?.wage); expect(signed?.phase).toBe('playing');
    expect(signed?.overall).toBe(75); expect(signed?.seasons).toEqual(initial.seasons); expect(signed?.transferBrief).toBeUndefined();
  });

  it('filters actual appearance bands before home and club level priorities without changing the previewed save', () => {
    const initial = fixture(), before = held(initial), at = vi.mocked(Math.random).mock.calls.length;
    const vectors = (['minutes', 'level', 'home'] as const).map(priority => { const c = set(initial, priority, 26); return { priority, names: transferBriefCandidates(c, clubs, E.projectLeagueApps).map(x => x.name), preview: preview(c, clubs) }; });
    const draft = preview(initial, clubs, 26), lower = preview(set(initial, 'level', 18), clubs);
    raw('priority-order', initial, before, { vectors, draft, lower, bands: bands(), drawDelta: vi.mocked(Math.random).mock.calls.length - at });
    expect(vectors.map(v => v.names), 'SC_TRANSFER_FLOOR_ORDER').toEqual([[abroad.name, domestic.name], [abroad.name, domestic.name], [domestic.name]]);
    expect(bands()).toEqual([{ club: home.name, band: { min: 20, max: 30 } }, { club: higher.name, band: { min: 20, max: 30 } }, { club: abroad.name, band: { min: 26, max: 34 } }, { club: domestic.name, band: { min: 26, max: 34 } }]);
    expect(draft.options.map(o => [o.id, o.matchingCount, o.projection])).toEqual([['minutes', 2, { min: 26, max: 34 }], ['level', 2, { min: 26, max: 34 }], ['home', 1, { min: 26, max: 34 }]]);
    expect(lower.options.find(o => o.id === 'level')).toMatchObject({ matchingCount: 1, tiers: [2], projection: { min: 20, max: 30 } });
    expect(vi.mocked(Math.random).mock.calls.length).toBe(at);
  });

  it('leaves an unmatched request and its existing offer untouched with zero draws and an honest explanation', () => {
    const initial = fixture(); initial.transferSituation = { type: 'one_offer', offer: { club: higher, wage: 18000, contractYears: 2, transferFee: 0 } };
    const staged = set(initial, 'home', 26), before = held(staged), pool = [home, higher, abroad], at = vi.mocked(Math.random).mock.calls.length;
    const view = render(<AgentBrief career={staged} clubs={pool} onCareer={() => undefined} />);
    const why = view.container.textContent ?? '', result = E.requestTransferDecision(staged, pool), drawDelta = vi.mocked(Math.random).mock.calls.length - at;
    raw('empty-search', staged, before, { same: result === staged, drawDelta, why, brief: staged.transferBrief, preview: preview(staged, pool), existingOffer: staged.transferSituation });
    expect([result === staged, drawDelta, /no (eligible |matching )?club|lower.*minimum/i.test(why)], 'SC_TRANSFER_FLOOR_EMPTY').toEqual([true, 0, true]);
    expect(result).toEqual(before.value); expect(result.transferSituation).toEqual(initial.transferSituation); expect(read(staged)?.result).toBeUndefined();
  });

  it('preserves unreadable minimum versions values context and extra fields instead of silently running normal search', () => {
    const initial = fixture(), before = held(initial), vectors = [];
    for (const name of ['future-version', 'string-floor', 'unknown-floor', 'zero-field', 'extra-key', 'stale-context', 'non-object']) {
      const c = set(clone(initial), 'level');
      if (name === 'future-version') Object.assign(c.transferBrief!, { version: 99, minimumApps: 26 });
      if (name === 'string-floor') Object.assign(c.transferBrief!, { minimumApps: '26' });
      if (name === 'unknown-floor') Object.assign(c.transferBrief!, { minimumApps: 27 });
      if (name === 'zero-field') Object.assign(c.transferBrief!, { minimumApps: 0 });
      if (name === 'extra-key') Object.assign(c.transferBrief!, { minimumApps: 26, future: 'held' });
      if (name === 'stale-context') c.transferBrief!.context.lastYear--;
      if (name === 'non-object') Object.assign(c, { transferBrief: 7 });
      const snapshot = clone(c), at = vi.mocked(Math.random).mock.calls.length, edited = set(c, 'home', 18), cleared = set(c, null), requested = E.requestTransferDecision(c, clubs), shown = preview(c, clubs);
      vectors.push({ name, editHeld: edited === c, clearHeld: cleared === c, requestHeld: requested === c, inputHeld: isDeepStrictEqual(c, snapshot), drawDelta: vi.mocked(Math.random).mock.calls.length - at, eligible: shown.eligible, reason: shown.blockedReason });
    }
    raw('unsupported-save', initial, before, { vectors });
    expect(vectors.map(v => [v.name, v.editHeld, v.clearHeld, v.requestHeld, v.inputHeld, v.drawDelta, v.eligible, typeof v.reason === 'string' && v.reason.length > 0]), 'SC_TRANSFER_FLOOR_UNSUPPORTED').toEqual(['future-version', 'string-floor', 'unknown-floor', 'zero-field', 'extra-key', 'stale-context', 'non-object'].map(name => [name, true, true, true, true, 0, false, true]));
  });

  it('seals an actual response across reload and refuses repeat requests or changed brief choices', () => {
    const initial = fixture(), staged = set(initial, 'level', 18), before = held(staged), response = request(staged), loaded = reload(response.next);
    const at = vi.mocked(Math.random).mock.calls.length, repeated = E.requestTransferDecision(loaded, clubs), changed = set(loaded, 'home', 26), cleared = set(loaded, null);
    raw('sealed-response', staged, before, { response: response.next, draws: response.draws, repeatHeld: repeated === loaded, changeHeld: changed === loaded, clearHeld: cleared === loaded, repeatDrawDelta: vi.mocked(Math.random).mock.calls.length - at });
    expect(read(loaded)?.result?.status).toBe('offered'); expect(offered(loaded)?.club).toEqual(higher);
    expect(response.draws).toEqual(tape); expect(repeated).toBe(loaded); expect(changed).toBe(loaded); expect(cleared).toBe(loaded); expect(vi.mocked(Math.random).mock.calls.length).toBe(at);
  });

  it('keeps the absent and explicit Any minimum identical to the old state offer and full draw vector', () => {
    const initial = fixture(), before = held(initial), legacy = set(initial, 'level'), any = set(initial, 'level', 0);
    const selectionDraws = vi.mocked(Math.random).mock.calls.length - before.draws, a = request(legacy), b = request(any);
    raw('legacy-any', initial, before, { legacy, any, selectionDraws, outputA: a.next, outputB: b.next, tapeA: a.draws, tapeB: b.draws });
    expect(selectionDraws).toBe(0);
    expect(any).toEqual(legacy); expect(legacy).toEqual({ ...initial, transferBrief: { version: 1, priority: 'level', context: { club: home.name, seasonCount: initial.seasons.length, lastYear: 2028, overall: 75, age: 24, nationality: 'England' } } });
    expect(a.next).toEqual(b.next); expect(a.draws).toEqual(tape); expect(b.draws).toEqual(tape);
    expect(offered(a.next)).toEqual({ club: higher, wage: 29000, contractYears: 3, transferFee: 44.2, isDreamClub: false, isPayCut: false });
    expect(read(a.next)?.result?.projection).toEqual({ min: 20, max: 30 }); expect(read(a.next)?.result?.status).toBe('offered');
  });
});
