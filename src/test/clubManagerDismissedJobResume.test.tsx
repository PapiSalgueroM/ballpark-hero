import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { SackedCareerSummary } from '@/components/club-manager/ClubManagerSeasonSummary';
import ManagerSlotsScreen from '@/components/club-manager/ManagerSlotsScreen';
import { useClubManager } from '@/hooks/useClubManager';
import { applyForJob, enterWilderness, playNextEntry, SAVE_KEY, startCareer, wildernessWeek, type CareerState } from '@/lib/clubManager';
import { setDifficulty } from '@/lib/clubManagerStart';
import { activeSlot, parkedKey } from '@/lib/clubManagerSlots';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => null }));

let dismissed: CareerState;

beforeAll(() => {
  let seed = 1;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  try {
    const started = setDifficulty(startCareer('Crystal Palace'), 'legend')!;
    let career = applyForJob(started, 'Fulham')!;
    expect(career.jobHunt?.open?.status).toBe('pending');
    for (let i = 0; i < 24 && !career.sacked; i++) {
      career = playNextEntry(career, { skipHalftime: true }).state;
    }
    expect(career.sacked).toBe(true);
    expect(career.jobHunt?.open).toMatchObject({ club: 'Fulham', status: 'accepted' });
    expect(career.wilderness).toBeFalsy();
    dismissed = career;
  } finally {
    random.mockRestore();
  }
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(recordCompletion).mockClear();
});
afterEach(cleanup);

function Harness() {
  const g = useClubManager();
  if (g.phase === 'resume') return <ManagerSlotsScreen slots={g.slots} activeDetail={null} note={g.slotNote} onContinue={g.openSlot} onNew={g.newInSlot} onDelete={g.removeSlot} />;
  if (g.phase === 'sacked' && g.career) return <SackedCareerSummary c={g.career} g={g} />;
  return <p>{g.phase === 'hub' ? g.career?.clubName : 'Opening career'}</p>;
}

const read = () => JSON.parse(localStorage.getItem(SAVE_KEY)!) as CareerState;
const offer = () => screen.getByRole('button', { name: 'Take the Fulham job' });

it('reopens a dismissed manager with their accepted job available before waiting a week', async () => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(dismissed));
  render(<Harness />);
  const resume = await screen.findByRole('button', { name: 'Resume Career' });
  const before = read();
  expect(before.wilderness).toBeFalsy();
  fireEvent.click(resume);

  expect(offer()).toBeEnabled();
  expect(read()).toEqual(enterWilderness(before));
  expect(read().resultLog).toEqual(dismissed.resultLog);
  expect(read().wilderness?.weeksOut).toBe(0);
  expect(recordCompletion).not.toHaveBeenCalled();
  fireEvent.click(offer());
  expect(screen.getByText('Fulham')).toBeVisible();
  expect(read()).toMatchObject({ clubName: 'Fulham', sacked: false });
});

it('opens a parked dismissed manager with the same offer and keeps the other slot', async () => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(startCareer('Everton')));
  localStorage.setItem(parkedKey(2), JSON.stringify(dismissed));
  render(<Harness />);
  const parked = await screen.findByTestId('cm-slot-2');
  fireEvent.click(within(parked).getByRole('button', { name: 'Resume Career' }));
  await waitFor(() => expect(offer()).toBeEnabled());
  expect(activeSlot()).toBe(2);
  expect(JSON.parse(localStorage.getItem(parkedKey(1))!).clubName).toBe('Everton');
  expect(read().wilderness?.weeksOut).toBe(0);
  expect(read().resultLog).toEqual(dismissed.resultLog);
});

it('opens a dismissed manager without an agreed move and does not create a new offer', async () => {
  const withoutOffer = { ...dismissed, jobHunt: undefined };
  localStorage.setItem(SAVE_KEY, JSON.stringify(withoutOffer));
  render(<Harness />);
  const resume = await screen.findByRole('button', { name: 'Resume Career' });
  const before = read();
  fireEvent.click(resume);
  expect(screen.getByRole('button', { name: /Wait a week/ })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /^Take the .+ job$/ })).toBeNull();
  expect(read().wilderness).toMatchObject({ offers: [], weeksOut: 0 });
  expect(read()).toEqual(enterWilderness(before));
});

it('preserves an initialized unemployment save, including the week already waited', async () => {
  const waited = wildernessWeek(enterWilderness(dismissed), () => 0.99);
  expect(waited.wilderness?.weeksOut).toBe(1);
  localStorage.setItem(SAVE_KEY, JSON.stringify(waited));
  render(<Harness />);
  const resume = await screen.findByRole('button', { name: 'Resume Career' });
  const before = localStorage.getItem(SAVE_KEY);
  fireEvent.click(resume);
  expect(offer()).toBeEnabled();
  expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  expect(read().wilderness).toEqual(waited.wilderness);
});
