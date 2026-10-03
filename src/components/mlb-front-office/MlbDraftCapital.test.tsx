import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import * as engine from '@/lib/mlbFrontOffice';
import type { MlbLeague, MlbProspect } from '@/lib/mlbFrontOffice';
import { leagueNames } from '@/lib/foNames';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'mlb-front-office-save-v1', OTHER = 'mlb-draft-unrelated-fixture';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const rng = (seed: number) => { let count = 0; return { draw: () => { count++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }, count: () => count }; };
const saved = () => JSON.parse(localStorage.getItem(KEY)!);
let random: MockInstance<() => number>;
function league() {
  const lg = engine.initMlbLeague(rng(966).draw);
  for (const team of Object.values(lg.teams)) team.players.forEach((p, i) => { p.name = `Fictional ${team.abbr} player ${i + 1}`; });
  lg.freeAgents.forEach((p, i) => { p.name = `Fictional free agent ${i + 1}`; });
  lg.round = engine.MLB_ROUNDS; return lg;
}
function draft(lg: MlbLeague, size = 24) { return engine.mlbDraftClass(rng(67).draw, size, leagueNames(lg)).map((p, i) => ({ ...p, name: `Fictional draft prospect ${i + 1}` })); }
function seed(lg: MlbLeague, myTeam = 'ARI', patch: Record<string, unknown> = {}) {
  const raw = JSON.stringify({ league: lg, myTeam, phase: 'draft', titles: 0, seasonsPlayed: 1, draftClass: draft(lg), picksLeft: 2,
    draftBatchesLeft: 2, trust: 70, fired: false, ...patch });
  localStorage.setItem(KEY, raw); return raw;
}
const select = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`) });
const pickFirst = () => fireEvent.click(select(saved().draftClass[0].name));
const noIds = (lg: MlbLeague) => {
  const clean = clone(lg);
  for (const team of Object.values(clean.teams)) for (const player of team.players) delete (player as Partial<typeof player>).id;
  for (const player of clean.freeAgents) delete (player as Partial<typeof player>).id;
  return clean;
};
function traded() {
  const lg = league(), mine = lg.teams.ARI, their = lg.teams.ATL;
  for (const a of mine.players) for (const b of their.players) {
    const no = clone(lg), yes = clone(lg);
    if (engine.mlbTrade(no.teams.ARI, no.teams.ATL, a.id, b.id, false, no.cap) !== 'rejected') continue;
    if (engine.mlbTrade(yes.teams.ARI, yes.teams.ATL, a.id, b.id, true, yes.cap) !== 'accepted') continue;
    const zero = clone(yes);
    expect(engine.mlbExecuteTalksTrade(zero.teams.ARI, zero.teams.ATL, b.id, a.id, true, zero.cap)).toBe('done');
    return { one: yes, zero, four: clone(zero) };
  }
  throw new Error('Actual legal discriminating trade fixture must exist');
}

describe('966 MLB real draft-capital consequences', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem(OTHER, 'held exact unrelated bytes'); random = vi.spyOn(Math, 'random').mockImplementation(rng(966).draw); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('validates dense current round tokens and shifts each right once without mutation on refusal', () => {
    expect(engine.mlbDraftCapital).toBeTypeOf('function'); expect(engine.mlbConsumeDraftPick).toBeTypeOf('function');
    for (const value of [undefined, null, [3], [-1], ['1'], [NaN], [1, , 2], Array(61).fill(1)]) {
      const team = { picks: value } as never, before = structuredClone(team);
      expect(engine.mlbDraftCapital(team)).toBeNull(); expect(engine.mlbConsumeDraftPick(team)).toBe(false); expect(team).toEqual(before);
    }
    const team = { picks: [1, 2, 2] };
    expect(engine.mlbDraftCapital(team)).toBe(3); expect(engine.mlbConsumeDraftPick(team)).toBe(true); expect(team.picks).toEqual([2, 2]);
    expect(engine.mlbConsumeDraftPick(team)).toBe(true); expect(team.picks).toEqual([2]); expect(engine.mlbConsumeDraftPick(team)).toBe(true);
    expect(engine.mlbConsumeDraftPick(team)).toBe(false); expect(team.picks).toEqual([]); expect(engine.mlbDraftCapital({ picks: Array(60).fill(1) })).toBe(60);
    expect(random).not.toHaveBeenCalled();
  });

  it('AI takes at most five distinct eligible rivals using real rookie terms and no RNG for refusals', () => {
    expect(engine.mlbAiDraftPicks).toBeTypeOf('function');
    const lg = league(), cls = draft(lg), before = clone(cls), keys = Object.keys(lg.teams);
    lg.teams[keys[0]].picks = []; lg.teams[keys[1]].picks = [3];
    const draw = rng(31), result = engine.mlbAiDraftPicks(lg, cls, ['unknown', keys[0], keys[0], keys[2], keys[2], keys[1], ...keys.slice(3)], draw.draw);
    expect(result.picks.map(p => p.team)).toEqual(keys.slice(2, 7)); expect(draw.count()).toBe(5); expect(cls).toEqual(before); expect(result.remaining).toEqual(cls.slice(5));
    for (let i = 0; i < 5; i++) { const team = lg.teams[keys[i + 2]], p = team.players.at(-1)!;
      expect(team.picks).toEqual([2]); expect(p.name).toBe(cls[i].name); expect(p.ovr).toBe(cls[i].trueOvr); expect(p.years).toBe(4);
      expect(p.salary).toBe(Math.max(.8, Math.round((cls[i].trueOvr - 66) * .25 * 10) / 10));
    }
    for (const team of Object.values(lg.teams)) team.picks = [];
    const state = clone(lg), count = draw.count(); expect(engine.mlbAiDraftPicks(lg, result.remaining, keys, draw.draw).picks).toEqual([]);
    expect(lg).toEqual(state); expect(draw.count()).toBe(count);
  });

  it('ordinary two choices keep the original two five-rival batches full offseason salaries and RNG', () => {
    const lg = league(), cls = draft(lg), reference = clone(lg), old = [...clone(cls)], draw = rng(966);
    for (let choice = 0; choice < 2; choice++) {
      reference.teams.ARI.players.push(engine.mlbProspectToPlayer(old.shift()!, draw.draw));
      const order = engine.mlbStandings(reference).map(t => t.abbr).reverse().filter(t => t !== 'ARI');
      const rivals = old.splice(0, 5); rivals.forEach((p, i) => reference.teams[order[i]].players.push(engine.mlbProspectToPlayer(p, draw.draw)));
    }
    engine.mlbOffseason(reference, draw.draw, 'ARI');
    seed(lg, 'ARI', { draftClass: cls }); render(<MlbFrontOfficeBoard />); fireEvent.click(select(cls[0].name)); pickFirst();
    expect(noIds(saved().league)).toEqual(noIds(reference)); expect(random).toHaveBeenCalledTimes(draw.count()); expect(saved().league.season).toBe(2027);
    expect(localStorage.getItem(OTHER)).toBe('held exact unrelated bytes');
  });

  it.each([0, 1, 4])('actual traded %i rights determine the newly opened draft without a fixed two', count => {
    const input = traded(), lg = count === 1 ? input.one : count === 0 ? input.zero : input.four, team = count === 4 ? 'ATL' : 'ARI';
    const tokens = clone(lg.teams[team].picks); seed(lg, team, { phase: 'recap', draftClass: null, picksLeft: 0, draftBatchesLeft: undefined });
    render(<MlbFrontOfficeBoard />); expect(saved().phase).toBe('draft'); expect(saved().picksLeft).toBe(count); expect(saved().draftBatchesLeft).toBe(2);
    expect(saved().league.teams[team].picks).toEqual(tokens); expect(screen.getByText(/You hold/)).toHaveTextContent(`You hold ${count}`);
  });

  it('one actual pick consumes exactly once through a same-frame duplicate and refresh', () => {
    const lg = league(), cls = draft(lg); seed(lg, 'ARI', { draftClass: cls }); render(<MlbFrontOfficeBoard />);
    const button = select(cls[0].name); act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(saved().picksLeft).toBe(1); expect(saved().draftBatchesLeft).toBe(1); expect(saved().league.teams.ARI.picks).toEqual([2]);
    expect(saved().league.teams.ARI.players.filter((p: { name: string }) => p.name === cls[0].name)).toHaveLength(1); expect(random).toHaveBeenCalledTimes(6);
    const raw = localStorage.getItem(KEY); cleanup(); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByText(/You hold/)).toHaveTextContent('You hold 1');
    pickFirst(); expect(saved().phase).toBe('hub'); expect(saved().league.season).toBe(2027);
  });

  it('four acquired rights add four real players but only the two ordinary CPU batches', () => {
    const lg = traded().four, cls = draft(lg), own = lg.teams.ATL.players.map(p => p.name); seed(lg, 'ATL', { draftClass: cls, picksLeft: 4 });
    render(<MlbFrontOfficeBoard />); const choices: string[] = [];
    for (let i = 0; i < 4; i++) { choices.push(saved().draftClass[0].name); pickFirst(); if (i < 3) expect(saved().league.teams.ATL.picks).toHaveLength(3 - i);
      if (i === 1) { const raw = localStorage.getItem(KEY), draws = random.mock.calls.length; expect(saved().draftBatchesLeft).toBe(0); cleanup(); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw); expect(random).toHaveBeenCalledTimes(draws); }
    }
    const result = saved().league as MlbLeague; expect(result.season).toBe(2027); expect(result.teams.ATL.players.filter(p => choices.includes(p.name) && !own.includes(p.name))).toHaveLength(4);
    const arrivals = Object.values(result.teams).flatMap(t => t.abbr === 'ATL' ? [] : t.players).filter(p => cls.some(pr => pr.name === p.name)); expect(arrivals).toHaveLength(10);
    expect(saved().draftBatchesLeft).toBe(0); expect(result.teams.ATL.picks).toEqual([1, 2]);
  });

  it('zero traded rights wait for explicit finish and run the actual offseason only once', () => {
    const lg = traded().zero; seed(lg, 'ARI', { phase: 'recap', draftClass: null, picksLeft: 0, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    const cls = saved().draftClass as MlbProspect[], names = new Set(lg.teams.ARI.players.map(p => p.name)); expect(saved().league.season).toBe(2026);
    const reference = clone(saved().league) as MlbLeague, old = clone(cls), draw = rng(966);
    for (let i = 0; i < random.mock.calls.length; i++) draw.draw();
    for (let batch = 0; batch < 2; batch++) { const order = engine.mlbStandings(reference).map(t => t.abbr).reverse().filter(t => t !== 'ARI');
      old.splice(0, 5).forEach((p, i) => reference.teams[order[i]].players.push(engine.mlbProspectToPlayer(p, draw.draw)));
    }
    engine.mlbOffseason(reference, draw.draw, 'ARI');
    expect(document.querySelectorAll('[data-draft-night]')).toHaveLength(0); const button = screen.getByRole('button', { name: 'Finish draft and run offseason' }), summer = vi.spyOn(engine, 'mlbOffseason');
    act(() => { fireEvent.click(button); fireEvent.click(button); }); const result = saved().league as MlbLeague;
    expect(summer).toHaveBeenCalledTimes(1); expect(result.season).toBe(2027); expect(saved().phase).toBe('hub'); expect(result.teams.ARI.players.some(p => cls.some(pr => pr.name === p.name))).toBe(false);
    expect(noIds(result)).toEqual(noIds(reference)); expect(random).toHaveBeenCalledTimes(draw.count());
    expect(Object.values(result.teams).flatMap(t => t.players).filter(p => cls.some(pr => pr.name === p.name))).toHaveLength(10); expect(names.size).toBe(lg.teams.ARI.players.length);
    const raw = localStorage.getItem(KEY); fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' })); cleanup(); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(saved().league.season).toBe(2027); expect(localStorage.getItem(OTHER)).toBe('held exact unrelated bytes');
  });

  it('legacy one-left progress trims the old unconsumed first right only on a real selection', () => {
    const lg = league(), cls = draft(lg), prior = engine.mlbProspectToPlayer(cls.shift()!, rng(14).draw); lg.teams.ARI.players.push(prior);
    const raw = seed(lg, 'ARI', { draftClass: cls, picksLeft: 1, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw);
    pickFirst(); expect(saved().league.season).toBe(2027); expect(saved().league.teams.ARI.players.find((p: { name: string }) => p.name === prior.name)).toBeDefined();
    expect(Object.values(saved().league.teams as MlbLeague['teams']).flatMap(t => t.abbr === 'ARI' ? [] : t.players).filter(p => cls.some(pr => p.name === pr.name))).toHaveLength(5);
  });

  it('legacy two-left with one actual right closes and drains the ordinary CPU quota after that choice', () => {
    const lg = traded().one, cls = draft(lg), raw = seed(lg, 'ARI', { draftClass: cls, picksLeft: 2, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    const reference = clone(lg), old = clone(cls), draw = rng(966); reference.teams.ARI.players.push(engine.mlbProspectToPlayer(old.shift()!, draw.draw));
    for (let batch = 0; batch < 2; batch++) { const order = engine.mlbStandings(reference).map(t => t.abbr).reverse().filter(t => t !== 'ARI');
      old.splice(0, 5).forEach((p, i) => reference.teams[order[i]].players.push(engine.mlbProspectToPlayer(p, draw.draw)));
    }
    engine.mlbOffseason(reference, draw.draw, 'ARI');
    expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByText(/You hold/)).toHaveTextContent('You hold 1'); pickFirst();
    expect(saved().league.season).toBe(2027); expect(saved().phase).toBe('hub');
    expect(noIds(saved().league)).toEqual(noIds(reference)); expect(random).toHaveBeenCalledTimes(draw.count());
    expect(Object.values(saved().league.teams as MlbLeague['teams']).flatMap(t => t.abbr === 'ARI' ? [] : t.players).filter(p => cls.some(pr => p.name === pr.name))).toHaveLength(10);
  });

  it('legacy stored choices without owned rights cannot draft and finish without inventing capital', () => {
    const lg = traded().zero, cls = draft(lg), raw = seed(lg, 'ARI', { draftClass: cls, picksLeft: 2, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByText(/You hold/)).toHaveTextContent('You hold 0'); expect(screen.queryByRole('button', { name: new RegExp(`^${cls[0].name} `) })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Finish draft and run offseason' })); expect(saved().league.season).toBe(2027); expect(saved().league.teams.ARI.players.some((p: { name: string }) => p.name === cls[0].name)).toBe(false);
  });

  it('old zero-left at the final round runs summer without replaying any prior AI batch', () => {
    const lg = league(), cls = draft(lg), raw = seed(lg, 'ARI', { draftClass: cls, picksLeft: 0, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.queryByText(/offseason has run/)).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Finish draft and run offseason' }));
    expect(saved().league.season).toBe(2027); expect(Object.values(saved().league.teams as MlbLeague['teams']).flatMap(t => t.players).some(p => cls.some(pr => pr.name === p.name))).toBe(false);
  });

  it('old completed zero-left at round one returns to the hub without another summer or RNG', () => {
    const lg = league(), playoff = engine.runMlbPlayoffs(lg, rng(63).draw); lg.champions.push({ season: lg.season, team: playoff.champion }); engine.mlbOffseason(lg, rng(64).draw, 'ARI');
    const raw = seed(lg, 'ARI', { picksLeft: 0, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(screen.queryByRole('button', { name: 'Finish draft and run offseason' })).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));
    expect(saved().phase).toBe('hub'); expect(saved().league).toEqual(lg); expect(random).not.toHaveBeenCalled();
  });

  it('an exhausted legacy prospect board can be replaced without losing earlier players or rights', () => {
    const lg = league(), players = clone(lg.teams.ARI.players), raw = seed(lg, 'ARI', { draftClass: [], draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw); const button = screen.getByRole('button', { name: 'Replace remaining draft board' }); act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(saved().draftClass).toHaveLength(24); expect(saved().league.teams.ARI.players).toEqual(players); expect(saved().league.teams.ARI.picks).toEqual([1, 2]);
    const count = random.mock.calls.length; cleanup(); render(<MlbFrontOfficeBoard />); expect(random).toHaveBeenCalledTimes(count); pickFirst(); expect(saved().picksLeft).toBe(1);
  });

  it('malformed pick progress retains exact raw bytes until explicit own-key discard', () => {
    for (const patch of [{ picksLeft: -1 }, { picksLeft: .5 }, { picksLeft: undefined }, { picksLeft: null }, { draftBatchesLeft: 3 }, { draftBatchesLeft: null }, { draftBatchesLeft: 0, picksLeft: 0 }, { draftClass: [null] }, { draftClass: [{ id: 'fictional', name: 'Fictional', pos: 'QB', age: 18, grade: 70, trueOvr: 70 }] }]) {
      cleanup(); const raw = seed(league(), 'ARI', patch); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByRole('alert')).toHaveTextContent('still stored');
      fireEvent.click(screen.getByRole('button', { name: 'Delete this save and choose a team' })); expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('held exact unrelated bytes');
    }
    cleanup(); const lg = league(); lg.teams.ARI.picks = [3]; const raw = seed(lg); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByRole('alert')).toHaveTextContent('invalid draft');
    cleanup(); const early = league(); early.round = 1; const earlyRaw = seed(early, 'ARI', { picksLeft: 0 }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(earlyRaw); expect(screen.getByRole('alert')).toHaveTextContent('still stored'); expect(saved().league.season).toBe(2026);
    cleanup(); const hubRaw = seed(league(), 'ARI', { phase: 'hub', draftClass: null, picksLeft: undefined, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(hubRaw); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByText('Roster')).toBeInTheDocument(); expect(random).not.toHaveBeenCalled(); expect(localStorage.getItem(OTHER)).toBe('held exact unrelated bytes');
  });

  it('the final human choice runs one actual offseason on repeated same-frame input', () => {
    const lg = league(), cls = draft(lg); lg.teams.ARI.picks = [2]; seed(lg, 'ARI', { draftClass: cls, picksLeft: 1, draftBatchesLeft: 1 }); render(<MlbFrontOfficeBoard />);
    const button = select(cls[0].name), summer = vi.spyOn(engine, 'mlbOffseason'); act(() => { fireEvent.click(button); fireEvent.click(button); }); expect(summer).toHaveBeenCalledTimes(1); expect(saved().league.season).toBe(2027); expect(saved().league.teams.ARI.players.filter((p: { name: string }) => p.name === cls[0].name)).toHaveLength(1);
    const raw = localStorage.getItem(KEY); cleanup(); render(<MlbFrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(raw); expect(saved().phase).toBe('hub');
  });

  it('healthy legacy hub restores the exact save with no draft or random work', () => {
    const lg = league(), raw = seed(lg, 'ARI', { phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: undefined }); render(<MlbFrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(screen.getByText('Roster')).toBeInTheDocument(); expect(random).not.toHaveBeenCalled(); expect(localStorage.getItem(OTHER)).toBe('held exact unrelated bytes');
  });
});
