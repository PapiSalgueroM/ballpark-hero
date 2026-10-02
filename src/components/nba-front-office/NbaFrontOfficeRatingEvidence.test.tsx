/* Local-only actual Board/data integration. Fixture changes represent simulated save progress. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import type { NbaOpeningRatingEvidence } from '@/data/nbaOpeningRatings';
import * as engine from '@/lib/nbaFrontOffice';
import type { NbaGmPlayer, NbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
// Gate only chunk resolution; the factory returns the unchanged actual data module.
const loading = vi.hoisted(() => {
  let finish: () => void = () => undefined;
  const promise = new Promise<void>(resolve => { finish = resolve; });
  return { promise, release: () => finish(), entered: false };
});
vi.mock('@/data/nbaOpeningRatings', async () => {
  loading.entered = true; await loading.promise;
  return vi.importActual('@/data/nbaOpeningRatings');
});
const { NBA_OPENING_RATINGS } = await vi.importActual<typeof import('@/data/nbaOpeningRatings')>('@/data/nbaOpeningRatings');

const KEY = 'nba-front-office-save-v1';
const SENTINEL = 'nba-evidence-unrelated-fixture';
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const saved = (): { league: NbaLeague; myTeam: string; phase: string } => JSON.parse(localStorage.getItem(KEY)!);
function seed(league: NbaLeague, team = 'DEN') {
  const raw = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw); return raw;
}
const teamButton = (abbr: string) => {
  const t = NBA_TEAMS.find(t => t.id === abbr)!;
  return screen.getByRole('button', { name: new RegExp(`^${t.city} ${t.name}\\s`) });
};
const row = (player: NbaGmPlayer) => document.querySelector(`[data-roster-row="${player.id}"]`) as HTMLElement;
const note = (element: HTMLElement) => {
  const evidence = element.querySelector('[data-rating-evidence]');
  expect(evidence).not.toBeNull();
  return evidence as HTMLElement;
};
const roster = () => fireEvent.click(screen.getByText('Roster'));
async function start(abbr = 'DEN') {
  await act(async () => { fireEvent.click(teamButton(abbr)); });
  await waitFor(() => expect(saved().myTeam).toBe(abbr));
}
function priorPlayer(league: NbaLeague, basis: 'prior-only' | 'unmeasured-prior') {
  for (const team of Object.values(league.teams)) {
    const player = team.players.find(p => p.openingRatingEvidence?.basis === basis);
    if (player) return { team: team.abbr, player };
  }
  throw new Error('Actual reviewed basis fixture must exist');
}

describe('NBA actual opening ratings and readable saved evidence', () => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem(SENTINEL, 'exact unrelated payload');
    vi.spyOn(Math, 'random').mockImplementation(rng(895));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('drops a real pending rating import after unmount without overwriting a newer save', async () => {
    const newer = engine.initNbaLeague(rng(80));
    const newerRaw = JSON.stringify({ league: newer, myTeam: 'BOS', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<NbaFrontOfficeBoard />);
    fireEvent.click(teamButton('DEN'));
    // The original synchronous Board is an independent completed-action baseline.
    if (!localStorage.getItem(KEY)) await waitFor(() => expect(loading.entered).toBe(true));
    view.unmount(); localStorage.setItem(KEY, newerRaw);
    const count = writes.mock.calls.filter(([key]) => key === KEY).length;
    loading.release();
    await act(async () => { await import('@/data/nbaOpeningRatings'); });
    expect(localStorage.getItem(KEY)).toBe(newerRaw);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(count);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('starts actual DEN with all300 reviewed prices ratings and opening evidence', async () => {
    render(<NbaFrontOfficeBoard />); await start();
    const league = saved().league;
    expect(saved().phase).toBe('hub');
    let count = 0;
    for (const team of NBA_TEAMS) for (const original of team.players ?? []) {
      const expected = NBA_OPENING_RATINGS[team.id][`${original.name}|${original.position}`];
      const player = league.teams[team.id].players.find(p => p.name === original.name)!;
      expect({ ovr: player.ovr, salary: player.salary, evidence: player.openingRatingEvidence }).toEqual(expected);
      count++;
    }
    expect(count).toBe(300); roster();
    expect(document.querySelector('[data-rating-legend]')).toHaveTextContent('2024-25 and 2025-26 regular-season inputs');
    expect(document.querySelectorAll('[data-roster-row]')).toHaveLength(10);
    expect(document.querySelectorAll('[data-rating-partial]')).toHaveLength(10);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('settles two same-frame franchise clicks with one initializer and one save', async () => {
    const init = vi.spyOn(engine, 'initNbaLeague');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<NbaFrontOfficeBoard />);
    const den = teamButton('DEN'), bos = teamButton('BOS');
    await act(async () => { den.click(); bos.click(); });
    await waitFor(() => expect(saved().myTeam).toBe('DEN'));
    expect(init).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(saved().league.teams.DEN.players[0].openingRatingEvidence).toBeDefined();
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('holds legacy progression and exact saved bytes as an independent baseline', () => {
    const league = engine.initNbaLeague(rng(81)), player = league.teams.DEN.players[0];
    player.ovr = 66; player.pot = 77; player.salary = 13.4; player.years = 3;
    league.round = 11;
    const raw = seed(league), init = vi.spyOn(engine, 'initNbaLeague');
    render(<NbaFrontOfficeBoard />); roster();
    expect(row(player)).toHaveTextContent('66');
    expect(row(player)).toHaveTextContent('$13.4M x3');
    expect(row(player).querySelector('[data-rating-evidence]')).toBeNull();
    expect(init).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('keeps opening estimates separate from developed grades after a real saved trade', () => {
    const league = engine.initNbaLeague(rng(83), NBA_OPENING_RATINGS);
    const player = league.teams.DEN.players[0], partner = league.teams.BOS.players[0];
    const originalEvidence = clone(player.openingRatingEvidence)!;
    // This saved simulation has room for the agreed swap, without changing either real opening estimate.
    league.cap = 1000;
    expect(engine.nbaExecuteTalksTrade(league.teams.DEN, league.teams.BOS, player.id, partner.id, false, league.cap, league.taxScale)).toBe('done');
    player.ovr = 67; player.pot = 71;
    const raw = seed(league, 'BOS'); render(<NbaFrontOfficeBoard />); roster();
    expect(row(player)).toHaveTextContent('67');
    expect(note(row(player))).toHaveTextContent(`Opening estimate ${originalEvidence.openingOvr}: retained-season box scores`);
    expect(note(row(player))).not.toHaveTextContent('Opening estimate 67:');
    expect(row(player).querySelector('[data-rating-partial]')).toBeInTheDocument();
    expect(saved().league.teams.BOS.players.find(p => p.id === player.id)!.openingRatingEvidence).toEqual(originalEvidence);
    expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('distinguishes actual prior-only and unmeasured provenance without claiming current evidence', () => {
    const league = engine.initNbaLeague(rng(84), NBA_OPENING_RATINGS);
    for (const basis of ['prior-only', 'unmeasured-prior'] as const) {
      const { team, player } = priorPlayer(league, basis), raw = seed(league, team);
      const view = render(<NbaFrontOfficeBoard />); roster();
      expect(note(row(player))).toHaveTextContent(basis === 'prior-only' ? 'prior season only, reduced confidence' : 'unmeasured game prior');
      expect(note(row(player))).not.toHaveTextContent('retained-season box scores');
      expect(row(player).querySelector('[data-rating-partial]')).toBeInTheDocument();
      expect(localStorage.getItem(KEY)).toBe(raw); view.unmount();
    }
  });

  it('marks damaged saved basis unavailable while preserving grade and exact bytes', () => {
    const league = engine.initNbaLeague(rng(85), NBA_OPENING_RATINGS), player = league.teams.DEN.players[0];
    player.openingRatingEvidence!.basis = 'damaged-save' as NbaOpeningRatingEvidence['basis'];
    const raw = seed(league); render(<NbaFrontOfficeBoard />); roster();
    expect(note(row(player))).toHaveTextContent('Opening rating evidence unavailable.');
    expect(row(player).querySelector('[data-rating-partial]')).toBeNull();
    expect(row(player)).toHaveTextContent(String(player.ovr));
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('refuses an invalid opening version without overwriting another save and retries cleanly', async () => {
    render(<NbaFrontOfficeBoard />);
    const old = engine.initNbaLeague(rng(86)), raw = seed(old, 'BOS');
    const first = NBA_TEAMS.find(t => t.id === 'DEN')!.players![0];
    const rating = NBA_OPENING_RATINGS.DEN[`${first.name}|${first.position}`];
    const version = rating.evidence.modelVersion;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    try {
      rating.evidence.modelVersion = 0 as unknown as string;
      await act(async () => { fireEvent.click(teamButton('DEN')); });
      expect(await screen.findByRole('alert')).toHaveTextContent('Your existing save has not changed. Try your team again.');
      expect(localStorage.getItem(KEY)).toBe(raw);
      expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(0);
      expect(teamButton('DEN')).toBeEnabled();
    } finally { rating.evidence.modelVersion = version; }
    await start('DEN');
    expect(saved().league.teams.DEN.players[0].openingRatingEvidence!.modelVersion).toBe(version);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });
});
