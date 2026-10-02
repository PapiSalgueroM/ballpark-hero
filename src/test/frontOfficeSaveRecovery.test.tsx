import { Component, type ReactNode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NflBoard from '@/components/front-office/FrontOfficeBoard';
import NhlBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initLeague, generateDraftClass, runPlayoffs } from '@/lib/frontOffice';
import { initNhlLeague, nhlDraftClass, runNhlFoPlayoffs, nhlContributors } from '@/lib/nhlFrontOffice';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}

type Saved = Record<string, any>;
const cases = [
  { sport: 'NFL', key: 'front-office-save-v1', Board: NflBoard, team: 'SEA', picker: 'Take over a front office', period: 'week', draft: generateDraftClass },
  { sport: 'NHL', key: 'nhl-front-office-save-v1', Board: NhlBoard, team: 'BOS', picker: 'Take over an NHL front office', period: 'round', draft: nhlDraftClass },
] as const;
const original = { NFL: initLeague(() => 0.52), NHL: initNhlLeague(() => 0.52) };
function save(sport: 'NFL' | 'NHL', team: string): Saved {
  const league = JSON.parse(JSON.stringify(original[sport]));
  league[sport === 'NFL' ? 'week' : 'round'] = 4;
  league.teams[team].wins = 2;
  league.teams[team].deadCap = [{ playerId: 'released-fixture', name: 'Simulation fixture', amount: 2.4, seasonsLeft: 2 }];
  league.teams[team].releasedThisSeason = ['released-fixture'];
  return { league, myTeam: team, phase: 'hub', titles: 2, seasonsPlayed: 3, draftClass: null, picksLeft: 0, mandate: null, trust: 61, fired: false, pressTilt: 1, seasonTradeLine: 'Simulation trade fixture', postseason: null };
}
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

for (const c of cases) describe(`${c.sport} actual save recovery`, () => {
  function mount(raw: string) {
    localStorage.setItem(c.key, raw);
    localStorage.setItem('other-game-save', 'unrelated progress');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removes = vi.spyOn(Storage.prototype, 'removeItem');
    const view = render(<Boundary><c.Board /></Boundary>);
    return { view, writes, removes };
  }
  it('restores current progress, contracts and counters without rewriting storage', () => {
    const saved = save(c.sport, c.team), tm = saved.league.teams[c.team];
    if (c.sport === 'NFL') { tm.depth = { WR: tm.players.filter((p: Saved) => p.pos === 'WR').map((p: Saved) => p.id).reverse() }; tm.tagUsedFor = saved.league.season; }
    else tm.contributors = nhlContributors(tm);
    const raw = JSON.stringify(saved);
    const { view, writes, removes } = mount(raw);
    expect(view.getByRole('button', { name: /^👔\s*Roster/ })).toBeVisible();
    expect(view.getByText(new RegExp(`${c.sport === 'NFL' ? 'Week' : 'Round'} 4/`))).toBeVisible();
    expect(view.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem(c.key)).toBe(raw); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: /^👔\s*Roster/ }));
    expect(view.getByText(saved.league.teams[c.team].players[0].name)).toBeVisible();
    expect(localStorage.getItem(c.key)).toBe(raw);
  });
  it('loads supported older saves and advances the same league once', () => {
    const saved = save(c.sport, c.team);
    for (const key of ['mandate', 'trust', 'fired', 'pressTilt', 'seasonTradeLine', 'postseason']) delete saved[key];
    for (const team of Object.values(saved.league.teams) as Saved[]) {
      delete team.deadCap; delete team.releasedThisSeason; delete team.depth; delete team.contributors;
    }
    const raw = JSON.stringify(saved), { view, writes } = mount(raw);
    expect(view.getByRole('button', { name: /^👔\s*Roster/ })).toBeVisible();
    expect(localStorage.getItem(c.key)).toBe(raw); expect(writes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: /^🏟️/ }));
    fireEvent.click(view.getByRole('button', { name: c.sport === 'NFL' ? /Play Week 4$/ : /Play Round 4$/ }));
    const next = JSON.parse(localStorage.getItem(c.key)!);
    expect(next.league[c.period]).toBe(5); expect(next.league.season).toBe(saved.league.season);
    expect(next.titles).toBe(2); expect(next.seasonsPlayed).toBe(3); expect(next.myTeam).toBe(c.team);
    expect(next.league.teams[c.team].players.length).toBeGreaterThan(0);
    expect(localStorage.getItem('other-game-save')).toBe('unrelated progress');
  });
  it('keeps the existing duplicate and missing entity ID repair', () => {
    const saved = save(c.sport, c.team), players = saved.league.teams[c.team].players;
    delete players[0].id; players[1].id = players[2].id;
    const raw = JSON.stringify(saved), { view } = mount(raw);
    expect(view.getByRole('button', { name: /^👔\s*Roster/ })).toBeVisible();
    expect(view.queryByRole('alert')).toBeNull(); expect(localStorage.getItem(c.key)).toBe(raw);
  });
  it('restores an in-progress draft with its remaining choices', () => {
    const saved = save(c.sport, c.team); saved.phase = 'draft'; saved.draftClass = c.draft(() => 0.52); saved.picksLeft = 1;
    const raw = JSON.stringify(saved), { view, writes } = mount(raw);
    expect(view.getByText(saved.draftClass[0].name)).toBeVisible();
    expect(view.getByText(/You hold/)).toHaveTextContent('1 pick');
    expect(localStorage.getItem(c.key)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });
  it('keeps the older recap-to-draft migration without replaying a closed season', () => {
    const saved = save(c.sport, c.team); saved.phase = 'recap'; saved.league[c.period] = c.sport === 'NFL' ? 17 : 20;
    saved.league.champions.push({ season: saved.league.season, team: c.team }); delete saved.postseason;
    const { view, writes } = mount(JSON.stringify(saved));
    expect(view.getByText(/You hold/)).toHaveTextContent(c.sport === 'NFL' ? '3 picks' : '2 picks');
    const next = JSON.parse(localStorage.getItem(c.key)!);
    expect(next.phase).toBe('draft'); expect(next.league).toEqual(saved.league);
    expect(next.titles).toBe(2); expect(next.seasonsPlayed).toBe(3); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('restores the saved postseason recap without replaying or replacing it', () => {
    const saved = save(c.sport, c.team); saved.phase = 'recap'; saved.league[c.period] = c.sport === 'NFL' ? 17 : 20;
    saved.postseason = { ...(c.sport === 'NFL' ? runPlayoffs(saved.league.teams, () => 0.52) : runNhlFoPlayoffs(saved.league, () => 0.52)), gradeLine: 'Saved season verdict' };
    saved.league.champions.push({ season: saved.league.season, team: saved.postseason.champion });
    const raw = JSON.stringify(saved), { view, writes } = mount(raw);
    expect(view.getByText('Saved season verdict')).toBeInTheDocument(); expect(view.getByRole('button', { name: 'Go to the draft' })).toBeEnabled();
    expect(view.queryByRole('alert')).toBeNull(); expect(localStorage.getItem(c.key)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });

  const corrupt: [string, (saved: Saved) => void][] = [
    ['zero period', s => { s.league[c.period] = 0; }],
    ['fractional period', s => { s.league[c.period] = 2.5; }],
    ['missing free agent pool', s => { delete s.league.freeAgents; }],
    ['null team roster', s => { s.league.teams[c.team].players = null; }],
    ['missing selected club', s => { s.myTeam = 'missing-club'; }],
    ['null draft entity', s => { s.draftClass = [null]; s.phase = 'draft'; s.picksLeft = 1; }],
    ['object cut ledger', s => { s.league.teams[c.team].deadCap = {}; }],
    ['unknown phase', s => { s.phase = 'not-a-screen'; }],
  ];
  if (c.sport === 'NFL') corrupt.push(
    ['missing schedule', s => { delete s.league.schedule; }],
    ['missing schedule week', s => { s.league.schedule[3] = null; }],
    ['unplayable eighteenth hub week', s => { s.league.week = 18; }],
  );
  else corrupt.push(['out of range round', s => { s.league.round = 21; }]);
  for (const [name, damage] of corrupt) it(`rejects ${name} before render and deletes only this save on request`, () => {
    const saved = save(c.sport, c.team); damage(saved); const raw = JSON.stringify(saved);
    const { view, writes, removes } = mount(raw);
    expect(view.queryByText('TEST: route crashed')).toBeNull();
    expect(view.getByText(c.picker)).toBeVisible();
    expect(view.getByRole('alert')).toHaveTextContent("We couldn't open this save.");
    expect(localStorage.getItem(c.key)).toBe(raw); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Delete unusable save' }));
    expect(localStorage.getItem(c.key)).toBeNull(); expect(view.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem('other-game-save')).toBe('unrelated progress'); expect(removes).toHaveBeenCalledExactlyOnceWith(c.key);
  });
  it('allows a fresh club to replace the unusable save without clearing another game', async () => {
    const saved = save(c.sport, c.team); delete saved.league.freeAgents;
    const { view } = mount(JSON.stringify(saved));
    fireEvent.click(view.getByRole('button', { name: c.sport === 'NFL' ? /Seattle Seahawks/ : /Boston Bruins/ }));
    /* Round 828: the NFL board fetches its roster chunk on the tap, so the new
       franchise is written a tick after the click, not inside it. Until then the
       unusable save must still be the one on disk. */
    /* The cold source transform of the full rating checkpoint exceeds the
       library's one-second wait. This bounds compilation and the actual save. */
    await waitFor(() => expect(Array.isArray(JSON.parse(localStorage.getItem(c.key)!).league.freeAgents)).toBe(true), { timeout: 4000 });
    const fresh = JSON.parse(localStorage.getItem(c.key)!);
    expect(fresh.myTeam).toBe(c.team); expect(fresh.league[c.period]).toBe(1); expect(fresh.titles).toBe(0); expect(fresh.seasonsPlayed).toBe(0);
    expect(Array.isArray(fresh.league.freeAgents)).toBe(true); expect(view.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem('other-game-save')).toBe('unrelated progress');
  });
  it('offers the same recovery for malformed JSON', () => {
    const { view } = mount('{broken');
    expect(view.getByText(c.picker)).toBeVisible(); expect(view.getByRole('alert')).toHaveTextContent("We couldn't open this save.");
    expect(localStorage.getItem(c.key)).toBe('{broken');
  });
});
