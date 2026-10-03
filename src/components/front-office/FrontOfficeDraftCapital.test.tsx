import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Board from '@/components/front-office/FrontOfficeBoard';
import { consumeDraftPick, draftOrder, executeTalksTrade, franchiseTagSalary, generateDraftClass, initLeague, nflAiDraftPicks, prospectToPlayer, runOffseason, runPlayoffs, type LeagueState } from '@/lib/frontOffice';
import * as engine from '@/lib/frontOffice';
import { leagueNames } from '@/lib/foNames';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const seeded = (seed: number) => { let n = seed; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function league() {
  const lg = initLeague(seeded(904));
  lg.cap = 10000;
  for (const team of Object.values(lg.teams)) team.players.forEach((p, i) => { p.name = `Simulated draft person ${team.abbr} ${i}`; });
  return lg;
}
function trade(lg: LeagueState, from: string, to: string) {
  const a = lg.teams[from], b = lg.teams[to];
  expect(executeTalksTrade(a, b, a.players[0].id, b.players[0].id, true, lg.cap)).toBe('done');
}
function saved(lg: LeagueState, phase = 'recap', left = 0) {
  lg.week = 17;
  const postseason = runPlayoffs(lg.teams, seeded(51));
  lg.champions.push({ season: lg.season, team: postseason.champion });
  return { league: lg, myTeam: 'SEA', phase, titles: 2, seasonsPlayed: 5, draftClass: phase === 'draft' ? generateDraftClass(seeded(22), 40) : null, picksLeft: left, postseason };
}
function mount(save: ReturnType<typeof saved>) {
  expect(isFrontOfficeSave(save, 'NFL', 17)).toBe(true);
  const raw = JSON.stringify(save);
  localStorage.setItem(KEY, raw); localStorage.setItem('draft-scout-sentinel', 'held');
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  writes.mockClear();
  render(<Board />);
  return { raw, writes };
}
const read = () => JSON.parse(localStorage.getItem(KEY)!);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Go to the draft' }));
const pick = () => { const s = read(); fireEvent.click(screen.getByText(s.draftClass[0].name)); };
function captureOffseason() {
  const original = engine.runOffseason, snapshots: LeagueState[] = [];
  const spy = vi.spyOn(engine, 'runOffseason').mockImplementation((lg, rng, user) => {
    snapshots.push(clone(lg)); return original(lg, rng, user);
  });
  return { spy, snapshots };
}
beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(seeded(29)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL draft capital outcomes', () => {
  it('holds the ordinary three-pick opener and saved counters', () => {
    const lg = league(); const { raw, writes } = mount(saved(lg));
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    open(); expect(screen.getByText(/You hold/)).toHaveTextContent('3 picks');
    expect(read().picksLeft).toBe(3); expect(read().titles).toBe(2); expect(read().seasonsPlayed).toBe(5);
    expect(localStorage.getItem('draft-scout-sentinel')).toBe('held');
  });
  it('opens only two remaining picks after an actual accepted sweetener trade', () => {
    const lg = league(); trade(lg, 'SEA', 'KC');
    expect(lg.teams.SEA.picks).toEqual([1, 2]); expect(lg.teams.KC.picks).toEqual([1, 2, 3, 3]);
    mount(saved(lg)); open(); expect(read().picksLeft).toBe(2);
  });
  it('opens zero human picks after three actual accepted sweetener trades', () => {
    const lg = league(); for (let i = 0; i < 3; i++) trade(lg, 'SEA', 'KC');
    expect(lg.teams.SEA.picks).toEqual([]); expect(lg.teams.KC.picks.length).toBe(6);
    mount(saved(lg)); open(); expect(read().picksLeft).toBe(0);
  });
  it('opens four owned picks after an actual recipient trade', () => {
    const lg = league(); trade(lg, 'KC', 'SEA');
    expect(lg.teams.SEA.picks.length).toBe(4); expect(lg.teams.KC.picks.length).toBe(2);
    mount(saved(lg)); open(); expect(read().picksLeft).toBe(4);
  });
  it('consumes a human pick token on the first accepted draft choice', () => {
    const lg = league(); mount(saved(lg)); open(); const before = read(); pick(); const after = read();
    expect(after.picksLeft).toBe(2); expect(after.league.teams.SEA.players.length).toBe(before.league.teams.SEA.players.length + 1);
    expect(after.league.teams.SEA.picks.length).toBe(2);
  });
  it('does not award rival prospects to zero-capital clubs', () => {
    const lg = league(); const order = draftOrder(lg.teams).filter(a => a !== 'SEA');
    for (const a of order.slice(0, 6)) lg.teams[a].picks = [];
    const counts = Object.fromEntries(order.slice(0, 6).map(a => [a, lg.teams[a].players.length]));
    mount(saved(lg)); open(); pick(); const after = read();
    for (const [a, count] of Object.entries(counts)) expect(after.league.teams[a].players.length).toBe(count);
  });
  it('holds legacy one-choice draft recovery without recomputing or rewriting it', () => {
    const lg = league(); const { raw, writes } = mount(saved(lg, 'draft', 1));
    expect(screen.getByText(/You hold/)).toHaveTextContent('1 pick');
    expect(read().league.teams.SEA.picks).toEqual([1, 2, 3]);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });
  it('holds normal three-pick offseason and final reveal with no replay on Continue', () => {
    const lg = league(); const originalSeason = lg.season; mount(saved(lg)); open();
    pick(); pick(); pick(); const raw = localStorage.getItem(KEY), complete = read();
    expect(complete.phase).toBe('hub'); expect(complete.league.season).toBe(originalSeason + 1); expect(complete.league.week).toBe(1);
    expect(complete.titles).toBe(2); expect(complete.seasonsPlayed).toBe(5); expect(complete.draftClass).toBeNull();
    expect(screen.getByText(/That is your draft done/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));
    expect(localStorage.getItem(KEY)).toBe(raw); expect(localStorage.getItem('draft-scout-sentinel')).toBe('held');
  });

  it('completes two human picks with the minimum three rival batches and one offseason', () => {
    const lg = league(); trade(lg, 'SEA', 'KC'); const { spy, snapshots } = captureOffseason();
    const before = clone(lg); mount(saved(lg)); open(); pick();
    expect(read().draftBatchesLeft).toBe(2); expect(read().picksLeft).toBe(1); expect(spy).not.toHaveBeenCalled();
    pick(); expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.picks).toEqual([]);
    expect(snapshots[0].teams.SEA.players.length).toBe(before.teams.SEA.players.length + 2);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - before.teams[a].players.length, 0)).toBe(18);
    expect(read().phase).toBe('hub'); expect(read().league.season).toBe(lg.season + 1);
  });

  it('uses acquired capital in all four human choices with four actual rival batches', () => {
    const lg = league(); trade(lg, 'KC', 'SEA'); const { spy, snapshots } = captureOffseason(); const before = clone(lg);
    mount(saved(lg)); open(); expect(read().draftBatchesLeft).toBe(4);
    for (let i = 0; i < 4; i++) pick();
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.players.length).toBe(before.teams.SEA.players.length + 4);
    expect(snapshots[0].teams.SEA.picks).toEqual([]);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - before.teams[a].players.length, 0)).toBe(24);
    expect(read().phase).toBe('hub'); expect(read().league.season).toBe(lg.season + 1);
  });

  it('preserves the zero-pick tag decision then explicitly runs the draft and offseason once', () => {
    const lg = league(); for (let i = 0; i < 3; i++) trade(lg, 'SEA', 'KC');
    const player = lg.teams.SEA.players[0]; player.years = 1; player.age = 26;
    const price = franchiseTagSalary(lg, player), { spy, snapshots } = captureOffseason();
    mount(saved(lg)); open(); const before = read();
    expect(screen.queryByText(/That is your draft done/)).toBeNull(); expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Run the league draft and offseason' })).toBeEnabled();
    const row = document.querySelector(`[data-tag-row="${player.id}"]`) as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Tag' }));
    expect(read().league.teams.SEA.players.find((p: { id: string }) => p.id === player.id).salary).toBe(price);
    expect(read().league.season).toBe(lg.season); expect(spy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Run the league draft and offseason' }));
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.players.length).toBe(before.league.teams.SEA.players.length);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - lg.teams[a].players.length, 0)).toBe(18);
    const result = read(), tagged = result.league.teams.SEA.players.find((p: { id: string }) => p.id === player.id);
    expect(result.phase).toBe('hub'); expect(result.league.season).toBe(lg.season + 1);
    expect(tagged.years).toBe(1); expect(tagged.salary).toBe(price); expect(tagged.tagSeason).toBe(result.league.season);
    expect(screen.getByRole('button', { name: 'Continue to the hub' })).toBeEnabled();
  });

  it('keeps zero-capital rivals and an empty reveal recoverable through the offseason', () => {
    const lg = league(); for (const team of Object.values(lg.teams)) team.picks = [];
    const { spy, snapshots } = captureOffseason(); mount(saved(lg)); open();
    fireEvent.click(screen.getByRole('button', { name: 'Run the league draft and offseason' }));
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams).toEqual(lg.teams);
    expect(document.querySelector('[data-draft-night]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));
    expect(screen.getByText('Roster')).toBeInTheDocument(); expect(read().league.season).toBe(lg.season + 1);
  });

  it('persists rival batch progress across refresh and never repeats the completed offseason', () => {
    const lg = league(); trade(lg, 'SEA', 'KC'); const { spy, snapshots } = captureOffseason();
    mount(saved(lg)); open(); pick(); const progress = localStorage.getItem(KEY)!, first = read();
    expect(first.picksLeft).toBe(1); expect(first.draftBatchesLeft).toBe(2);
    cleanup(); const { writes } = mount(first); expect(localStorage.getItem(KEY)).toBe(progress); expect(writes).not.toHaveBeenCalled();
    pick(); expect(spy).toHaveBeenCalledTimes(1);
    const rivalArrivals = Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - lg.teams[a].players.length, 0);
    expect(rivalArrivals).toBe(18);
    const complete = localStorage.getItem(KEY)!, result = read(); cleanup();
    const restored = mount(result); expect(localStorage.getItem(KEY)).toBe(complete); expect(restored.writes).not.toHaveBeenCalled();
    expect(screen.getByText('Roster')).toBeInTheDocument(); expect(spy).toHaveBeenCalledTimes(1);
  });

  it('aligns only surplus old tokens on the first accepted legacy draft choice', () => {
    const lg = league(), { spy, snapshots } = captureOffseason(); const old = saved(lg, 'draft', 1);
    const { raw, writes } = mount(old); expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    expect(read().league.teams.SEA.picks).toEqual([1, 2, 3]); pick();
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.picks).toEqual([]);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - lg.teams[a].players.length, 0)).toBe(6);
    expect(read().titles).toBe(2); expect(read().seasonsPlayed).toBe(5);
  });

  it('recovers an exhausted old prospect board only after an explicit replacement', () => {
    const lg = league(), old = saved(lg, 'draft', 2); old.draftClass = [];
    const { raw, writes } = mount(old); expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('no prospects left');
    fireEvent.click(screen.getByRole('button', { name: 'Replace the remaining prospect board' }));
    const replacement = read(); expect(replacement.league).toEqual(lg); expect(replacement.picksLeft).toBe(2);
    expect(replacement.draftClass.length).toBe(40); expect(writes).toHaveBeenCalledTimes(1);
    const names = leagueNames(lg); expect(replacement.draftClass.every((p: { name: string }) => !names.has(p.name))).toBe(true);
    pick(); expect(read().picksLeft).toBe(1); expect(read().league.teams.SEA.picks).toEqual([3]);
  });

  it('sizes a six-pick draft so every owned choice remains playable after rival selections', () => {
    const lg = league(); for (let i = 0; i < 3; i++) trade(lg, 'KC', 'SEA');
    const { spy, snapshots } = captureOffseason(); mount(saved(lg)); open(); expect(read().draftClass.length).toBe(42);
    for (let i = 0; i < 6; i++) { expect(read().draftClass.length).toBeGreaterThan(0); pick(); }
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.players.length).toBe(lg.teams.SEA.players.length + 6);
    expect(snapshots[0].teams.SEA.picks).toEqual([]);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - lg.teams[a].players.length, 0)).toBe(36);
    expect(read().phase).toBe('hub'); expect(read().league.season).toBe(lg.season + 1);
  });

  it('settles only one accepted human decision or zero-pick transition in the same frame', () => {
    const lg = league(); mount(saved(lg)); open(); const button = screen.getByText(read().draftClass[0].name).closest('button')!;
    const writes = vi.spyOn(Storage.prototype, 'setItem'); writes.mockClear();
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(writes).toHaveBeenCalledTimes(1); expect(read().picksLeft).toBe(2); expect(read().league.teams.SEA.picks.length).toBe(2);
    cleanup(); const empty = league(); empty.teams.SEA.picks = []; const { spy } = captureOffseason(); const { writes: emptyWrites } = mount(saved(empty)); open();
    const advance = screen.getByRole('button', { name: 'Run the league draft and offseason' }); emptyWrites.mockClear();
    act(() => { fireEvent.click(advance); fireEvent.click(advance); });
    expect(emptyWrites).toHaveBeenCalledTimes(1); expect(spy).toHaveBeenCalledTimes(1);
  });

  it('holds all ordinary three-pick league outcomes and exact random draws against the original loop', () => {
    const lg = league(), originalSave = saved(lg), reference = clone(lg), expectedRandom = seeded(29), expectedTape: number[] = [];
    const rng = () => { const value = expectedRandom(); expectedTape.push(value); return value; };
    let prospects = generateDraftClass(rng, 40, leagueNames(reference));
    for (let choice = 0; choice < 3; choice++) {
      reference.teams.SEA.players.push(prospectToPlayer(prospects[0], rng)!);
      const order = draftOrder(reference.teams).filter(a => a !== 'SEA');
      const remaining = prospects.slice(1), takes = remaining.slice(0, 6);
      takes.forEach((p, i) => reference.teams[order[i]].players.push(prospectToPlayer(p, rng)!));
      prospects = remaining.slice(takes.length);
    }
    runOffseason(reference, rng, 'SEA');
    const actualRandom = seeded(29), actualTape: number[] = [];
    vi.mocked(Math.random).mockImplementation(() => { const value = actualRandom(); actualTape.push(value); return value; });
    mount(originalSave); open(); pick(); pick(); pick();
    const withoutIds = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => key === 'id' ? undefined : item));
    expect(withoutIds(read().league)).toEqual(withoutIds(reference)); expect(actualTape).toEqual(expectedTape);
  });

  it('spends rival tokens once and moves to the next eligible clubs after exhaustion', () => {
    const lg = league(), rng = seeded(41), order = draftOrder(lg.teams).filter(a => a !== 'SEA');
    const counts = Object.fromEntries(order.map(a => [a, lg.teams[a].players.length]));
    let prospects = generateDraftClass(rng, 30, leagueNames(lg));
    prospects = prospects.map(p => ({ ...p, pos: 'QB', trueOvr: 55 }));
    for (let i = 0; i < 3; i++) { const result = nflAiDraftPicks(lg, prospects, 'SEA', rng); expect(result.picks.map(p => p.team)).toEqual(order.slice(0, 6)); prospects = result.remaining; }
    const fourth = nflAiDraftPicks(lg, prospects, 'SEA', rng);
    expect(fourth.picks.map(p => p.team)).toEqual(order.slice(6, 12));
    for (const a of order.slice(0, 6)) { expect(lg.teams[a].picks).toEqual([]); expect(lg.teams[a].players.length).toBe(counts[a] + 3); }
    for (const a of order.slice(6, 12)) expect(lg.teams[a].picks.length).toBe(2);
    expect(lg.teams.SEA.picks).toEqual([1, 2, 3]);
  });

  it('holds empty-token no-op identity and short rival pools without inventing picks or draws', () => {
    const lg = league(); for (const team of Object.values(lg.teams)) team.picks = [];
    const t = lg.teams.SEA, picks = t.picks, before = JSON.stringify(lg), rng = vi.fn(() => 0.5);
    expect(consumeDraftPick(t)).toBe(false); expect(t.picks).toBe(picks);
    expect(nflAiDraftPicks(lg, [], 'SEA', rng)).toEqual({ remaining: [], picks: [] });
    expect(JSON.stringify(lg)).toBe(before); expect(rng).not.toHaveBeenCalled();
    lg.teams.KC.picks = [3]; const prospect = generateDraftClass(seeded(31), 1)[0];
    const result = nflAiDraftPicks(lg, [prospect], 'SEA', rng);
    expect(result.remaining).toEqual([]); expect(result.picks).toHaveLength(1); expect(result.picks[0].team).toBe('KC');
    expect(lg.teams.KC.picks).toEqual([]); expect(rng).toHaveBeenCalledTimes(1);
  });

  it('finishes an older zero-count draft with unused legacy tokens without replaying rival picks', () => {
    const lg = league(), old = saved(lg, 'draft', 0), { spy, snapshots } = captureOffseason();
    const { raw, writes } = mount(old); expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    expect(screen.queryByText(/That is your draft done/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Run the league draft and offseason' }));
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.picks).toEqual([]);
    for (const a of Object.keys(lg.teams)) expect(snapshots[0].teams[a].players).toEqual(lg.teams[a].players);
    const complete = localStorage.getItem(KEY)!; fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));
    expect(localStorage.getItem(KEY)).toBe(complete); expect(read().league.season).toBe(lg.season + 1);
  });

  it('lets an older positive count with no owned capital close explicitly without granting a free player', () => {
    const lg = league(); lg.teams.SEA.picks = []; const old = saved(lg, 'draft', 1), { spy, snapshots } = captureOffseason();
    const { raw, writes } = mount(old); expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    expect(screen.getByText(/older draft saved 1 remaining/)).toBeInTheDocument();
    expect(screen.queryByText(old.draftClass![0].name)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Run the league draft and offseason' }));
    expect(spy).toHaveBeenCalledTimes(1); expect(snapshots[0].teams.SEA.players).toEqual(lg.teams.SEA.players);
    expect(Object.keys(lg.teams).filter(a => a !== 'SEA').reduce((n, a) => n + snapshots[0].teams[a].players.length - lg.teams[a].players.length, 0)).toBe(6);
    expect(read().phase).toBe('hub'); expect(read().picksLeft).toBe(0);
  });

  it('rejects an enormous damaged batch counter without looping or overwriting the save', () => {
    const lg = league(), old = saved(lg, 'draft', 1); Object.assign(old, { draftBatchesLeft: 1000000000 });
    const { raw, writes } = mount(old);
    expect(screen.getByText(/We couldn.t open this save/)).toBeInTheDocument();
    expect(screen.queryByText(/You hold/)).toBeNull(); expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem('draft-scout-sentinel')).toBe('held');
  });

  it('rejects a zero batch counter with unfinished saved choices and no owned capital', () => {
    const lg = league(); lg.teams.SEA.picks = []; const old = saved(lg, 'draft', 1); Object.assign(old, { draftBatchesLeft: 0 });
    const { raw, writes } = mount(old);
    expect(screen.getByText(/We couldn.t open this save/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run the league draft and offseason' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });

  it('rejects a durable terminal draft counter instead of showing a dead Continue', () => {
    const lg = league(), old = saved(lg, 'draft', 0); Object.assign(old, { draftBatchesLeft: 0 });
    const { raw, writes } = mount(old);
    expect(screen.getByText(/We couldn.t open this save/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to the hub' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });
});
