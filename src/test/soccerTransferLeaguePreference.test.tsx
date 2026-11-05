import { useState } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AgentBrief from '@/components/soccer-career/AgentBrief';
import * as E from '@/lib/soccerCareerEngine';
import { chooseProgramme, nextProgrammeYear, programmePromiseBroken, settleSoccerProgramme } from '@/lib/soccerCareerProgramme';
import { setTransferBrief, readTransferBrief, transferBriefCandidates, type TransferBriefPriority } from '@/lib/soccerCareerTransferBrief';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

type Brief = NonNullable<ReturnType<typeof readTransferBrief>> & { preferredLeague?: string };
type Preview = ReturnType<typeof E.transferBriefPreview> & { preferredLeague?: string; leagues?: string[] };
/* Fourth-argument casts let the immutable original reach behavior assertions. */
const set = setTransferBrief as (c: E.CareerState, priority: TransferBriefPriority | null, minimum?: number, league?: string | null) => E.CareerState;
const preview = E.transferBriefPreview as (c: E.CareerState, clubs: E.ClubData[], minimum?: number, league?: string | null) => Preview;
const read = (c: E.CareerState) => readTransferBrief(c, E.projectLeagueApps) as Brief | null;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sharedLeague = 'Fixture Shared League', domesticLeague = 'Fixture Domestic League', missingLeague = 'Fixture Unavailable League';
const home: E.ClubData = { id: 'league-home', name: 'Appearance Home FC', country: 'England', league: 'Fixture Home League', color: '#123456', tier: 2 };
const higher: E.ClubData = { ...home, id: 'league-high', name: 'Level Choice FC', league: sharedLeague };
const abroad: E.ClubData = { ...home, id: 'league-abroad', name: 'Minutes Abroad FC', country: 'France', league: sharedLeague, tier: 3 };
const domestic: E.ClubData = { ...home, id: 'league-domestic', name: 'Minutes Home FC', league: domesticLeague, tier: 3 };
const elite: E.ClubData = { ...home, id: 'league-elite', name: 'Out Of Range FC', league: 'Fixture Ineligible League', tier: 1 };
const clubs = [home, higher, abroad, domestic];
const priorities = ['minutes', 'level', 'home'] as const, minimums = [0, 18, 26] as const;
const tape = [0.1, 0.7, 0.2, 0.8, 0.3, 0.6, 0.4];
const refusingTape = [0.9, 0.7, 0.2, 0.8, 0.3, 0.6, 0.4];

function fixture(): E.CareerState {
  const c = E.initCareer('League Fixture', 'England', 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 }, 75, 2020, [{ ...home, tier: 1 }], null, 90);
  const row: E.SeasonRecord = { year: 2028, age: 24, club: home.name, clubCountry: home.country, clubTier: 2,
    apps: 25, goals: 9, assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: 75,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  return { ...c, age: 24, currentClub: home.name, currentClubCountry: home.country, currentClubTier: 2, currentClubColor: home.color,
    currentLeague: home.league, weeklyWage: 8000, contractYearsLeft: 1, phase: 'transfer_window', transferSituation: { type: 'no_interest' },
    pendingOffers: [], retired: false, agentId: 'self', seasons: [...c.seasons, row] };
}
function brokenPromise(): E.CareerState {
  let c: E.CareerState = { ...fixture(), phase: 'playing', transferSituation: null };
  c = chooseProgramme(c, 'promise', 'rotation');
  const row: E.SeasonRecord = { ...c.seasons[c.seasons.length - 1], year: nextProgrammeYear(c)!, age: 25,
    apps: 19, leagueApps: 17, injury: null, injuryWeeks: 0, injurySevere: false };
  c = { ...c, age: 25, seasons: [...c.seasons, row] };
  settleSoccerProgramme(c, row);
  return { ...c, phase: 'transfer_window', transferSituation: { type: 'one_offer', offer: { club: higher, wage: 18000, contractYears: 2, transferFee: 0 } } };
}
function allDraws() { return vi.mocked(Math.random).mock.results.map(result => result.value); }
function run<T>(fn: () => T, values: number[] = tape) {
  let cursor = 0;
  vi.mocked(Math.random).mockImplementation(() => values[cursor++ % values.length]);
  const at = vi.mocked(Math.random).mock.calls.length, value = fn();
  return { value, draws: allDraws().slice(at) };
}
function offered(c: E.CareerState) { return c.transferSituation?.type === 'request_result' ? c.transferSituation.offer : null; }
function reload(c: E.CareerState) {
  const serialized = serializeSoccerCareerSave(c);
  localStorage.setItem('soccerCareerSave', serialized);
  const loaded = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  expect(isSoccerCareerSave(loaded)).toBe(true);
  expect(loaded).toEqual(clone(c));
  return { loaded, serialized };
}
function raw(name: string, frames: unknown) {
  const body = JSON.stringify({ case: name,
    fixture: 'Fictional clubs, constructor-owned career, controlled senior records; real selection, projection, request, signing and codec.',
    frames, randomDraws: allDraws() }) + '\n';
  if (process.env.SC_TRANSFER_LEAGUE_RAW) {
    mkdirSync(process.env.SC_TRANSFER_LEAGUE_RAW, { recursive: true });
    writeFileSync(join(process.env.SC_TRANSFER_LEAGUE_RAW, name + '.json'), body);
  }
  expect(localStorage.getItem('league-unrelated')).toBe('held');
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('league-unrelated', 'held');
  vi.spyOn(Math, 'random').mockReturnValue(0.1);
  vi.spyOn(Date, 'now').mockReturnValue(1793793600000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer transfer preferred league', () => {
  it('saves the native preferred league once then requests signs and reloads complete real engine states', () => {
    const initial = brokenPromise(), original = clone(initial), changed = vi.fn(); let current = initial;
    function App() {
      const [career, setCareer] = useState(initial);
      return <AgentBrief career={career} clubs={clubs} onCareer={fn => setCareer(previous => {
        const next = fn(previous); current = next; changed(next); return next;
      })} />;
    }
    const at = allDraws().length, view = render(<App />);
    fireEvent.click(view.getByRole('button', { name: 'Set transfer priority' }));
    fireEvent.click(view.getByRole('button', { name: 'Choose a priority' }));
    const league = view.queryByRole('combobox', { name: 'Preferred league' });
    if (league) fireEvent.change(league, { target: { value: domesticLeague } });
    fireEvent.change(view.getByRole('combobox', { name: 'Minimum projected league appearances' }), { target: { value: '26' } });
    fireEvent.click(view.getByRole('button', { name: /Highest available level/ }));
    const beforeSave = clone(current), callbacksBeforeSave = changed.mock.calls.length;
    fireEvent.click(view.getByRole('button', { name: 'Save brief' }));
    const saved = current, savedReload = reload(saved), saveDraws = allDraws().slice(at);
    const response = run(() => E.requestTransferDecision(savedReload.loaded, clubs), refusingTape);
    const requestReload = reload(response.value), offer = offered(requestReload.loaded);
    const signing = run(() => offer ? E.acceptOffer(requestReload.loaded, offer) : null);
    const signedReload = signing.value ? reload(signing.value) : null;
    raw('native-save-sign', { original, beforeSave, saved, unavailableLeague: set(initial, 'level', 0, missingLeague), savedReloaded: savedReload.loaded,
      request: response.value, requestReloaded: requestReload.loaded, signed: signing.value, signedReloaded: signedReload?.loaded ?? null,
      picker: !!league, callbacks: changed.mock.calls.length, callbacksBeforeSave, saveDraws, requestDraws: response.draws, signedDraws: signing.draws,
      serialized: { saved: savedReload.serialized, request: requestReload.serialized, signed: signedReload?.serialized ?? null } });
    expect([!!league, read(saved)?.preferredLeague, offer?.club.league, signedReload?.loaded.currentLeague], 'SC_TRANSFER_LEAGUE_NATIVE').toEqual([true, domesticLeague, domesticLeague, domesticLeague]);
    expect(programmePromiseBroken(initial)).toBe(true); expect(initial).toEqual(original); expect(beforeSave).toEqual(original);
    expect(callbacksBeforeSave).toBe(0); expect(changed).toHaveBeenCalledTimes(1); expect(saveDraws).toEqual([]);
    expect(response.draws).toEqual(refusingTape); expect(signing.draws).toEqual([]);
    expect(signedReload?.loaded).toMatchObject({ currentClub: domestic.name, currentClubTier: 3, weeklyWage: offer!.wage, phase: 'playing', overall: 75 });
    expect(signedReload?.loaded.seasons).toEqual(initial.seasons); expect(signedReload?.loaded.transferBrief).toBeUndefined();
  });

  it('intersects the league before all three priorities and both real appearance boundaries', () => {
    const initial = fixture(), original = clone(initial), at = allDraws().length;
    const vectors = priorities.flatMap(priority => minimums.map(minimum => {
      const input = set(initial, priority, minimum, sharedLeague);
      return { priority, minimum, input, names: transferBriefCandidates(input, clubs, E.projectLeagueApps).map(club => club.name), shown: preview(input, clubs) };
    }));
    const expected = [
      [abroad.name], [abroad.name], [abroad.name],
      [higher.name], [higher.name], [abroad.name],
      [higher.name], [higher.name], [],
    ];
    raw('priority-minimum-intersections', { original, vectors, draws: allDraws().slice(at) });
    expect(vectors.map(vector => vector.names), 'SC_TRANSFER_LEAGUE_ORDER').toEqual(expected);
    expect(vectors.map(vector => {
      const option = vector.shown.options.find(row => row.id === vector.priority)!;
      return [option.eligibleCount, option.matchingCount, option.tiers, option.projection];
    })).toEqual([
      [3, 1, [3], { min: 26, max: 34 }], [3, 1, [3], { min: 26, max: 34 }], [3, 1, [3], { min: 26, max: 34 }],
      [3, 1, [2], { min: 20, max: 30 }], [3, 1, [2], { min: 20, max: 30 }], [3, 1, [3], { min: 26, max: 34 }],
      [3, 1, [2], { min: 20, max: 30 }], [3, 1, [2], { min: 20, max: 30 }], [3, 0, [], null],
    ]);
    expect(initial).toEqual(original); expect(allDraws().length).toBe(at);
  });

  it('previews an unsaved league from the complete eligible pool without widening tiers or saving a draft', () => {
    const initial = fixture(), original = clone(initial), at = allDraws().length;
    const held = set(initial, 'level', 0, sharedLeague), heldSnapshot = clone(held);
    const draft = preview(held, [home, higher, abroad, domestic, elite], 26, domesticLeague);
    const any = preview(held, [home, higher, abroad, domestic, elite], 26, null);
    const unavailable = preview(initial, [...clubs, elite], 0, elite.league);
    raw('draft-options', { original, held, draft, any, unavailable, draws: allDraws().slice(at) });
    expect([draft.preferredLeague, draft.leagues, draft.options.map(row => [row.id, row.eligibleCount, row.matchingCount])], 'SC_TRANSFER_LEAGUE_DRAFT').toEqual([
      domesticLeague, [domesticLeague, sharedLeague], [['minutes', 3, 1], ['level', 3, 1], ['home', 3, 1]],
    ]);
    expect(any.preferredLeague).toBeUndefined();
    expect(any.options.map(row => row.matchingCount)).toEqual([2, 2, 1]);
    expect(unavailable.options.map(row => [row.eligibleCount, row.matchingCount])).toEqual([[3, 0], [3, 0], [3, 0]]);
    expect(held).toEqual(heldSnapshot); expect(initial).toEqual(original); expect(allDraws().length).toBe(at);
  });

  it('preserves a held league for old setters while explicit Any and normal search clear only their agreed scope', () => {
    const initial = fixture(), original = clone(initial), at = allDraws().length;
    const selected = set(initial, 'level', 18, sharedLeague), preserved = set(selected, 'minutes', 26);
    const same = set(preserved, 'minutes', 26, sharedLeague), any = set(preserved, 'minutes', undefined, null), normal = set(preserved, null);
    const loaded = reload(preserved);
    raw('setter-semantics', { original, selected, preserved, same, sameIdentity: same === preserved, any, normal, reloaded: loaded.loaded, serialized: loaded.serialized, draws: allDraws().slice(at) });
    expect([read(selected)?.preferredLeague, read(preserved)?.preferredLeague, read(loaded.loaded)?.preferredLeague], 'SC_TRANSFER_LEAGUE_SETTER').toEqual([sharedLeague, sharedLeague, sharedLeague]);
    expect(same).toBe(preserved); expect(read(any)).toMatchObject({ priority: 'minutes', minimumApps: 26 });
    expect(Object.prototype.hasOwnProperty.call(any.transferBrief!, 'preferredLeague')).toBe(false);
    expect(normal.transferBrief).toBeUndefined(); expect(normal).toEqual(initial);
    expect(initial).toEqual(original); expect(allDraws().length).toBe(at);
  });

  it('constrains the actual answered destination for all nine priority and minimum combinations', () => {
    const initial = brokenPromise(), original = clone(initial);
    const vectors = priorities.flatMap(priority => minimums.map(minimum => {
      const input = set(initial, priority, minimum, domesticLeague), before = clone(input);
      const response = run(() => E.requestTransferDecision(input, clubs), refusingTape), loaded = reload(response.value);
      return { priority, minimum, input, inputAfter: clone(input), before, request: response.value, reloaded: loaded.loaded, serialized: loaded.serialized, draws: response.draws };
    }));
    raw('actual-nine-destinations', { original, vectors });
    expect(vectors.map(vector => [offered(vector.request)?.club.name, offered(vector.request)?.club.league, read(vector.reloaded)?.result?.matchingCount]), 'SC_TRANSFER_LEAGUE_DESTINATION').toEqual(vectors.map(() => [domestic.name, domesticLeague, 1]));
    for (const vector of vectors) {
      expect(vector.inputAfter).toEqual(vector.before); expect(vector.draws).toEqual(refusingTape);
      expect(read(vector.reloaded)?.result?.eligibleCount).toBe(3); expect(read(vector.reloaded)?.result?.projection).toEqual({ min: 26, max: 34 });
    }
    expect(initial).toEqual(original);
  });

  it('keeps the exact input and old offer when a valid league has no final match even after a broken promise', () => {
    const initial = brokenPromise(), original = clone(initial);
    const cases = [
      { name: 'unavailable-league', priority: 'level' as const, minimum: 0, league: missingLeague, pool: clubs },
      { name: 'home-intersection', priority: 'home' as const, minimum: 26, league: sharedLeague, pool: clubs },
      { name: 'minimum-intersection', priority: 'level' as const, minimum: 26, league: sharedLeague, pool: [home, higher] },
    ];
    const vectors = cases.map(row => {
      const input = set(initial, row.priority, row.minimum, row.league), before = clone(input);
      const response = run(() => E.requestTransferDecision(input, row.pool), refusingTape);
      return { name: row.name, input, before, request: response.value, identity: response.value === input, draws: response.draws, shown: preview(input, row.pool) };
    });
    raw('empty-refusal', { original, broken: programmePromiseBroken(initial), vectors });
    expect(vectors.map(row => [row.identity, row.draws, read(row.input)?.preferredLeague]), 'SC_TRANSFER_LEAGUE_EMPTY').toEqual(cases.map(row => [true, [], row.league]));
    for (const row of vectors) {
      expect(row.input).toEqual(row.before); expect(row.request).toEqual(row.before);
      expect(row.request.transferSituation).toEqual(initial.transferSituation); expect(read(row.input)?.result).toBeUndefined();
      expect(row.shown.options.find(option => option.id === read(row.input)?.priority)?.matchingCount).toBe(0);
    }
    expect(programmePromiseBroken(initial)).toBe(true); expect(initial).toEqual(original);
  });

  it('preserves unreadable empty whitespace nonstring unknown and stale league briefs without edits requests or draws', () => {
    const initial = fixture(), original = clone(initial);
    const bad: [string, unknown][] = [['empty', ''], ['space', '   '], ['null', null], ['number', 7], ['boolean', false], ['array', []], ['object', {}]];
    const cases = [...bad, ['unknown-key', sharedLeague], ['stale-context', sharedLeague], ['future-version', sharedLeague]] as [string, unknown][];
    const vectors = cases.map(([name, value]) => {
      const input = set(clone(initial), 'level', 18);
      Object.assign(input.transferBrief!, { preferredLeague: value });
      if (name === 'unknown-key') Object.assign(input.transferBrief!, { future: 'held' });
      if (name === 'stale-context') input.transferBrief!.context.lastYear--;
      if (name === 'future-version') Object.assign(input.transferBrief!, { version: 99 });
      const before = clone(input), at = allDraws().length, shown = preview(input, clubs);
      const edit = set(input, 'home', 26, domesticLeague), clear = set(input, null), request = E.requestTransferDecision(input, clubs), loaded = reload(input);
      return { name, input, before, edit, clear, request, reloaded: loaded.loaded, serialized: loaded.serialized, shown, readable: read(input), identities: [edit === input, clear === input, request === input], draws: allDraws().slice(at) };
    });
    raw('unreadable-preserved', { original, vectors });
    expect(vectors.map(row => [row.name, row.readable, row.identities, row.draws, row.shown.eligible, !!row.shown.blockedReason]), 'SC_TRANSFER_LEAGUE_UNREADABLE').toEqual(cases.map(([name]) => [name, null, [true, true, true], [], false, true]));
    for (const row of vectors) expect(row.input).toEqual(row.before);
    expect(initial).toEqual(original);
  });

  it('keeps an unavailable saved league readable visible and selected until the player changes it', () => {
    const initial = fixture(), original = clone(initial), input = set(initial, 'level', 0, missingLeague), before = clone(input), changed = vi.fn();
    const at = allDraws().length, view = render(<AgentBrief career={input} clubs={clubs} onCareer={changed} />);
    const summary = view.container.textContent ?? '', opener = view.queryByRole('button', { name: 'Set transfer priority' });
    if (opener) fireEvent.click(opener);
    const help = view.queryByRole('button', { name: 'Choose a priority' });
    if (help) fireEvent.click(help);
    const picker = view.queryByRole('combobox', { name: 'Preferred league' }) as HTMLSelectElement | null;
    const optionText = picker ? Array.from(picker.options).map(option => ({ value: option.value, text: option.textContent })) : [];
    const shown = preview(input, clubs), response = E.requestTransferDecision(input, clubs);
    raw('unavailable-held', { original, input, before, request: response, requestIdentity: response === input, shown, summary, selected: picker?.value ?? null, options: optionText, draws: allDraws().slice(at), callbacks: changed.mock.calls.length });
    expect([read(input)?.preferredLeague, picker?.value, shown.options.map(option => option.matchingCount), /unavailable|no (eligible |matching )?club/i.test(summary)], 'SC_TRANSFER_LEAGUE_UNAVAILABLE').toEqual([missingLeague, missingLeague, [0, 0, 0], true]);
    expect(optionText.some(option => option.value === missingLeague && /unavailable/i.test(option.text ?? ''))).toBe(true);
    expect(response).toBe(input); expect(input).toEqual(before); expect(initial).toEqual(original); expect(changed).not.toHaveBeenCalled(); expect(allDraws().length).toBe(at);
  });

  it('reads a matching saved receipt but refuses an otherwise identical off-league or case-changed receipt', () => {
    const initial = fixture(), original = clone(initial);
    const response = run(() => E.requestTransferDecision(set(initial, 'level', 18), clubs));
    const valid = clone(response.value);
    Object.assign(valid.transferBrief!, { preferredLeague: sharedLeague });
    const matching = reload(valid);
    const vectors = [domesticLeague, sharedLeague.toLowerCase()].map(league => {
      const input = clone(valid), receipt = input.transferBrief!.result!;
      if (receipt.offer) receipt.offer.club.league = league;
      if (input.transferSituation?.type === 'request_result' && input.transferSituation.offer) input.transferSituation.offer.club.league = league;
      const before = clone(input), at = allDraws().length;
      const request = E.requestTransferDecision(input, clubs), edit = set(input, 'minutes', 26, league), loaded = reload(input);
      return { league, input, before, readable: read(input), request, edit, identities: [request === input, edit === input], reloaded: loaded.loaded, serialized: loaded.serialized, draws: allDraws().slice(at) };
    });
    raw('receipt-league-validation', { original, sourceRequest: response.value, sourceDraws: response.draws, valid, matchingReloaded: matching.loaded, matchingSerialized: matching.serialized, validReadable: read(matching.loaded), vectors });
    expect([read(matching.loaded)?.preferredLeague, read(matching.loaded)?.result?.status, vectors.map(row => row.readable)], 'SC_TRANSFER_LEAGUE_RECEIPT').toEqual([sharedLeague, 'offered', [null, null]]);
    expect(offered(valid)?.club).toEqual(higher);
    for (const row of vectors) { expect(row.identities).toEqual([true, true]); expect(row.draws).toEqual([]); expect(row.input).toEqual(row.before); }
    expect(initial).toEqual(original);
  });

  it('seals a league response across codec reload and repeat requests edits and clears with no new draw', () => {
    const initial = fixture(), original = clone(initial), input = set(initial, 'level', 18, domesticLeague), before = clone(input);
    const response = run(() => E.requestTransferDecision(input, clubs)), loaded = reload(response.value), at = allDraws().length;
    const repeat = E.requestTransferDecision(loaded.loaded, clubs), changed = set(loaded.loaded, 'home', 26, sharedLeague), cleared = set(loaded.loaded, null);
    raw('sealed-response', { original, input, before, request: response.value, reloaded: loaded.loaded, serialized: loaded.serialized, repeat, changed, cleared,
      identities: [repeat === loaded.loaded, changed === loaded.loaded, cleared === loaded.loaded], requestDraws: response.draws, repeatedDraws: allDraws().slice(at) });
    expect([read(loaded.loaded)?.preferredLeague, offered(loaded.loaded)?.club.league, read(loaded.loaded)?.result?.status], 'SC_TRANSFER_LEAGUE_SEALED').toEqual([domesticLeague, domesticLeague, 'offered']);
    expect(repeat).toBe(loaded.loaded); expect(changed).toBe(loaded.loaded); expect(cleared).toBe(loaded.loaded); expect(allDraws().length).toBe(at);
    expect(response.draws).toEqual(tape); expect(input).toEqual(before); expect(initial).toEqual(original);
  });

  it('keeps default Any and explicit null byte-identical in complete states signed frames and random tapes', () => {
    const initial = fixture(), original = clone(initial);
    const vectors = priorities.flatMap(priority => minimums.map(minimum => {
      const absent = set(initial, priority, minimum), any = set(initial, priority, minimum, null);
      const a = run(() => E.requestTransferDecision(absent, clubs)), b = run(() => E.requestTransferDecision(any, clubs));
      const offerA = offered(a.value), offerB = offered(b.value);
      const signedA = run(() => offerA ? E.acceptOffer(a.value, offerA) : null), signedB = run(() => offerB ? E.acceptOffer(b.value, offerB) : null);
      const loadedA = signedA.value ? reload(signedA.value) : reload(a.value), loadedB = signedB.value ? reload(signedB.value) : reload(b.value);
      return { priority, minimum, absent, any, requestA: a.value, requestB: b.value, requestDrawsA: a.draws, requestDrawsB: b.draws,
        signedA: signedA.value, signedB: signedB.value, signedDrawsA: signedA.draws, signedDrawsB: signedB.draws,
        reloadedA: loadedA.loaded, reloadedB: loadedB.loaded, serializedA: loadedA.serialized, serializedB: loadedB.serialized };
    }));
    raw('default-any-full-frames', { original, vectors });
    for (const row of vectors) {
      expect(JSON.stringify(row.any), 'SC_TRANSFER_LEAGUE_ANY_INPUT').toBe(JSON.stringify(row.absent));
      expect(JSON.stringify(row.requestB), 'SC_TRANSFER_LEAGUE_ANY_REQUEST').toBe(JSON.stringify(row.requestA));
      expect(JSON.stringify(row.signedB), 'SC_TRANSFER_LEAGUE_ANY_SIGNED').toBe(JSON.stringify(row.signedA));
      expect(row.serializedB).toBe(row.serializedA); expect(row.reloadedB).toEqual(row.reloadedA);
      expect(row.requestDrawsA).toEqual(tape); expect(row.requestDrawsB).toEqual(tape);
      expect(row.signedDrawsA).toEqual([]); expect(row.signedDrawsB).toEqual([]);
      expect(Object.prototype.hasOwnProperty.call(row.any.transferBrief!, 'preferredLeague')).toBe(false);
    }
    expect(initial).toEqual(original);
  });

  it('keeps unsaved league drafts Back help and Escape read-only and returns focus without moving the page', async () => {
    const initial = set(fixture(), 'level', 18), original = clone(initial), changed = vi.fn(), at = allDraws().length;
    const view = render(<AgentBrief career={initial} clubs={clubs} onCareer={changed} />);
    const opener = view.getByRole('button', { name: 'Set transfer priority' }), scroll = { x: window.scrollX, y: window.scrollY };
    fireEvent.click(opener); fireEvent.click(view.getByRole('button', { name: 'Choose a priority' }));
    let picker = view.queryByRole('combobox', { name: 'Preferred league' });
    if (picker) fireEvent.change(picker, { target: { value: domesticLeague } });
    fireEvent.click(view.getByRole('button', { name: 'Transfer brief help' }));
    const helpText = view.getByRole('dialog', { name: 'Your transfer brief' }).textContent ?? '';
    fireEvent.click(view.getByRole('button', { name: 'Back to brief' }));
    fireEvent.click(view.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
    const afterBack = clone(initial);
    fireEvent.click(opener); picker = view.queryByRole('combobox', { name: 'Preferred league' });
    const reopenedValue = picker instanceof HTMLSelectElement ? picker.value : null;
    if (picker) fireEvent.change(picker, { target: { value: domesticLeague } });
    fireEvent.keyDown(view.getByRole('dialog', { name: 'Your transfer brief' }), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Your transfer brief' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
    raw('read-only-dialog', { original, afterBack, afterEscape: initial, helpText, reopenedValue, callbacks: changed.mock.calls.length, draws: allDraws().slice(at), scrollBefore: scroll, scrollAfter: { x: window.scrollX, y: window.scrollY } });
    expect(initial, 'SC_TRANSFER_LEAGUE_READ_ONLY').toEqual(original); expect(afterBack).toEqual(original);
    expect(changed).not.toHaveBeenCalled(); expect(allDraws().length).toBe(at); expect({ x: window.scrollX, y: window.scrollY }).toEqual(scroll);
    if (picker) expect(reopenedValue).not.toBe(domesticLeague);
    expect(helpText).toMatch(/Example:/); expect(helpText).toMatch(/not.*guaranteed|not.*promise|projections/i);
  });
});
