import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import { useClubManager } from '@/hooks/useClubManager';
import { FORMATIONS, SAVE_KEY, finishSeason, startCareer, takeNationJob } from '@/lib/clubManager';
import {
  beginNationalCampaign, nationalCoachView, playNationalFixture, setNationalSquad, setNationalXi,
} from '@/lib/clubManagerNationalCampaign';
import type { CareerState } from '@/lib/clubManager';
import { createSaveFence, saveFence } from '@/lib/saveFence';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

function review(nation: string): CareerState {
  const fresh = startCareer('Arsenal');
  const accepted = takeNationJob({
    ...fresh,
    manager: { ...fresh.manager!, nationality: nation },
    trophies: Array.from({ length: 4 }, (_, i) => ({ season: 1, name: 'Test title ' + i, emoji: 'T' })),
    careerStats: { ...fresh.careerStats, played: 200, wins: 150 },
    squad: fresh.squad.map(p => ({ ...p, contractYears: 3 })),
  });
  expect(accepted.nationJob?.nation).toBe(nation);
  return finishSeason({ ...accepted, week: accepted.calendar.length }).state;
}

function save(career: CareerState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(career));
}
function saved(): CareerState {
  return JSON.parse(localStorage.getItem(SAVE_KEY)!);
}
function Host() {
  const game = useClubManager();
  return <>
    {game.saveMoved && <p role="alert">Save moved</p>}
    {game.phase === 'resume' && <button onClick={game.resume}>Resume career</button>}
    {game.phase === 'seasonEnd' && game.summary && game.career
      && <ClubManagerSeasonSummary sm={game.summary} c={game.career} g={game} />}
    {game.phase === 'hub' && <p>Club season {game.career?.season}</p>}
  </>;
}
async function boot() {
  const view = render(<Host />);
  fireEvent.click(await screen.findByRole('button', { name: 'Resume career' }));
  return view;
}
async function openTeam() {
  fireEvent.click(await screen.findByRole('button', { name: 'Manage national team' }));
  await screen.findByRole('button', { name: 'Back to season summary' });
}
function lineup(career: CareerState) {
  const players = nationalCoachView(career)!.players;
  const keeper = players.find(p => p.position === 'GK')!;
  const outfield = players.filter(p => p.position !== 'GK').slice(0, 10);
  let next = 0;
  return FORMATIONS[0].slots.map(slot => slot.allowed.includes('GK') ? keeper : outfield[next++]);
}
function setXi(career: CareerState, ids: string[]): CareerState {
  const began = beginNationalCampaign(career);
  const called = setNationalSquad(began, ids, began.nationJob!.campaign!.revision);
  return setNationalXi(called, 0, ids, called.nationJob!.campaign!.revision);
}

beforeEach(() => {
  saveFence.release(SAVE_KEY);
  localStorage.clear();
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 15));
});
afterEach(() => { cleanup(); saveFence.release(SAVE_KEY); vi.restoreAllMocks(); });

describe('Club Manager national summer', () => {
  it('keeps a sparse country automatic and advances the actual club career', async () => {
    save(review('Fiji'));
    await boot();
    await openTeam();
    expect(screen.getByText(/the national team will play automatically/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Choose the squad' })).toBeNull();
    expect(saved().nationJob?.campaign).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Back to season summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Season 2' }));
    expect(await screen.findByText('Club season 2')).toBeVisible();
    expect(saved().season).toBe(2);
  });

  it('starts only on explicit choice, keeps a complete ordered XI and its result, and respects the save fence', async () => {
    const career = review('England');
    const xi = lineup(career);
    save(career);
    const first = await boot();
    await openTeam();
    expect(saved().nationJob?.campaign).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Choose the squad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to season summary' }));
    expect(screen.getByRole('button', { name: 'Finish the national tournament first' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Return to national team' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next match' }));
    expect(screen.getByRole('button', { name: 'Play next match' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
    for (const player of xi) {
      fireEvent.change(screen.getByRole('textbox', { name: 'Find a player' }), { target: { value: player.name } });
      fireEvent.click(screen.getByRole('button', { name: 'Call up ' + player.name }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Starting XI' }));
    screen.getAllByLabelText(/^National shirt /).forEach((shirt, index) => {
      fireEvent.change(shirt, { target: { value: xi[index].key } });
    });
    const held = saved();
    const ready = held.nationJob!.campaign!;
    expect(ready.xiKeys).toEqual(xi.map(player => player.key));
    const expected = playNationalFixture(held, ready.next!.id, ready.revision).nationJob!.campaign!;
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play next match' }));
    expect(saved().nationJob?.campaign).toEqual(expected);
    first.unmount();

    await boot();
    fireEvent.click(await screen.findByRole('button', { name: 'Starting XI' }));
    expect(screen.getAllByLabelText<HTMLSelectElement>(/^National shirt /).map(shirt => shirt.value)).toEqual(ready.xiKeys);
    expect(saved().nationJob?.campaign).toEqual(expected);
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    const peer = JSON.stringify({ ...saved(), budget: saved().budget + 7 });
    const otherPage = createSaveFence(window.localStorage);
    otherPage.adopt(SAVE_KEY);
    expect(otherPage.write(SAVE_KEY, () => { localStorage.setItem(SAVE_KEY, peer); return true; })).toBe('written');
    fireEvent.click(screen.getByRole('button', { name: 'Play next match' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save moved');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(localStorage.getItem(SAVE_KEY)).toBe(peer);
  }, 20000);

  it('finishes the existing schedule after a coverage loss and retains the previous result', async () => {
    const career = review('England');
    const prepared = setXi(career, lineup(career).map(player => player.key));
    const open = prepared.nationJob!.campaign!;
    const played = playNationalFixture(prepared, open.next!.id, open.revision);
    const prefix = played.nationJob!.campaign!.results;
    expect(prefix).toHaveLength(1);
    save({ ...played, retiredNames: nationalCoachView(played)!.players.map(p => p.name) });
    await boot();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish remaining fixtures automatically' }));
    await waitFor(() => expect(saved().nationJob?.campaign?.settled).toBe(true));
    expect(saved().nationJob?.campaign?.results.slice(0, 1)).toEqual(prefix);
    expect(saved().nationJob?.played).toBe(1);
    expect(screen.queryByRole('button', { name: 'Finish remaining fixtures automatically' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to season summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Season 2' }));
    expect(await screen.findByText('Club season 2')).toBeVisible();
    expect(saved().nationJob?.campaign).toBeUndefined();
  }, 20000);
});
