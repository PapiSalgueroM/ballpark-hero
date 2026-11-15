import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PlayerCardScreen } from '@/components/club-manager/PlayerCardScreen';
import { loadCareer, playNextEntry, saveCareer, SAVE_KEY, startCareer, type CareerState } from '@/lib/clubManager';
import { fenceKeyOf } from '@/lib/saveFence';
import { keyedRng } from '@/lib/keyedRng';

let played: CareerState;
let playerId: string;
let changedRound: number;

beforeAll(() => {
  const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('calendar-league-ratings'));
  try {
    played = startCareer('Manchester City', 'now', undefined, undefined, undefined, null, { inSeasonRatings: true });
    for (let turn = 0; turn < 15; turn++) {
      played = playNextEntry(played, { skipHalftime: true, noCoach: true }).state;
      const results = Object.entries(played.leagueRatingResults?.results ?? {});
      if (results.length < 3) continue;
      for (const [round, receipt] of results) {
        const move = receipt.ratingChanges.find(move => played.squad.some(player => player.id === move.id));
        if (move) {
          changedRound = Number(round);
          playerId = move.id;
          return;
        }
      }
    }
    throw new Error('Expected a real league OVR change and three settled league reviews');
  } finally { random.mockRestore(); }
}, 30000);

afterEach(() => {
  cleanup();
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(fenceKeyOf(SAVE_KEY));
  vi.restoreAllMocks();
});

function openHistory(career: CareerState) {
  const view = render(<PlayerCardScreen card={{ k: 'mine', id: playerId }} career={career} onBack={vi.fn()} />);
  const toggle = view.getByText('League OVR history');
  const details = toggle.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(toggle);
  expect(details).toHaveAttribute('open');
  return within(details);
}

describe('Club Manager player card league OVR history', () => {
  it('shows only the actual player changes from saved league results and never rewrites the save', () => {
    expect(saveCareer(played)).toBe(true);
    const raw = localStorage.getItem(SAVE_KEY);
    const generation = localStorage.getItem(fenceKeyOf(SAVE_KEY));
    const reloaded = loadCareer();
    expect(reloaded?.leagueRatingResults).toEqual(played.leagueRatingResults);
    const storedReviews = Object.entries(played.leagueRatingResults!.results);
    const moves = storedReviews.flatMap(([round, receipt]) => receipt.ratingChanges.filter(move => move.id === playerId)
      .map(move => ({ round: Number(round) + 1, opponent: receipt.opp, ...move })));
    expect(moves).not.toHaveLength(0);
    expect(moves.some(move => move.round === changedRound + 1)).toBe(true);
    const before = JSON.stringify(reloaded);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    const history = openHistory(reloaded!);
    const rows = history.getAllByRole('listitem');
    expect(rows).toHaveLength(moves.length);
    for (const [index, move] of moves.entries()) {
      expect(rows[index]).toHaveTextContent(`Round ${move.round} · ${move.opponent}`);
      expect(rows[index]).toHaveTextContent(`${move.before} to ${move.after}`);
    }
    const net = moves.reduce((sum, move) => sum + move.after - move.before, 0);
    expect(history.getByText(`Recorded change ${net > 0 ? '+' : ''}${net} OVR`)).toBeVisible();
    expect(JSON.stringify(reloaded)).toBe(before);
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBe(generation);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('keeps offsetting moves and counts a reviewed round without any changes', () => {
    const state = structuredClone(played);
    const results = state.leagueRatingResults!.results;
    const rounds = Object.keys(results).map(Number);
    const [first, second, unchanged] = rounds;
    const player = state.squad.find(player => player.id === playerId)!;
    const move = { id: playerId, name: player.name, before: 70, after: 71 };
    results[first].ratingChanges = [move];
    results[second].ratingChanges = [{ ...move, before: 71, after: 70 }, { ...move, id: 'another-player' }];
    results[unchanged].ratingChanges = [];
    for (const round of rounds.slice(3)) delete results[round];
    const history = openHistory(state);

    expect(history.getByText('Recorded change 0 OVR')).toBeVisible();
    expect(history.getAllByRole('listitem')).toHaveLength(2);
    expect(history.getByText('70 to 71')).toBeVisible();
    expect(history.getByText('71 to 70')).toBeVisible();
    expect(history.getByText(`3 of ${rounds.length} league rounds reviewed`)).toBeVisible();
  });

  it.each(['legacy', 'wrong club', 'wrong season'] as const)('keeps a %s review unknown', source => {
    const state = structuredClone(played);
    if (source === 'legacy') delete state.leagueRatingResults;
    else if (source === 'wrong club') state.leagueRatingResults!.club = 'Another club';
    else state.leagueRatingResults!.season += 1;
    const history = openHistory(state);

    expect(history.getByText('League OVR reviews were not recorded.')).toBeVisible();
    expect(history.queryByRole('list')).toBeNull();
    expect(history.queryByText(/Recorded change/)).toBeNull();
  });

  it('ignores a receipt attached to the wrong result even when its player ID matches', () => {
    const state = structuredClone(played);
    const stamp = state.leagueRatingResults!;
    const bad = stamp.results[changedRound];
    const clean = Object.entries(stamp.results).find(([round]) => Number(round) !== changedRound)!;
    stamp.results = {
      [changedRound]: { ...bad, opp: 'An unrelated opponent' },
      [Number(clean[0])]: { ...clean[1], ratingChanges: [] },
    };
    const history = openHistory(state);

    expect(history.getByText('No OVR changes were recorded for this player.')).toBeVisible();
    expect(history.queryByRole('list')).toBeNull();
    expect(history.getByText(/^1 of \d+ league rounds reviewed$/)).toBeVisible();
  });
});
