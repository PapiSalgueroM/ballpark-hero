import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SecondClubPanel from '@/components/club-manager/SecondClubPanel';
import { acceptWildernessJob, ensureAcademy, enterWilderness, finishSeason, loadCareer, playNextEntry, SAVE_KEY, saveCareer, startCareer, startNextSeason } from '@/lib/clubManager';
import { closeLedger, projectFinances } from '@/lib/clubManagerFinances';
import { buySeniorClub, carrySeniorClub, chooseSeniorPlan, CIRCUIT_DATES, closeSeniorSeason, SENIOR_CIRCUIT, seniorMatchdays, seniorStandings } from '@/lib/clubManagerSecondClub';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';
import { useClubManager } from '@/hooks/useClubManager';
import { SLOTS_INDEX_KEY } from '@/lib/clubManagerSlots';
import { joinClubNow } from '@/lib/clubManagerCalendar';

beforeEach(() => {
  localStorage.clear(); saveFence.release(SAVE_KEY);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('second-club-authority'));
});
afterEach(() => { cleanup(); saveFence.release(SAVE_KEY); vi.restoreAllMocks(); });

function established() {
  const c = startCareer('Manchester City');
  ensureAcademy(c); c.academy!.facilities = 14; c.budget = 130;
  return c;
}

function ActiveDesk() {
  const g = useClubManager();
  if (g.phase === 'resume') return <button onClick={g.resume}>Resume test career</button>;
  return g.phase === 'hub' && g.career ? <SecondClubPanel career={g.career} onCommit={g.commitClubAction} /> : null;
}

describe('Club Manager second senior club', () => {
  it('retries a failed purchase from disk and refuses an order from a stale manager slot', async () => {
    const c = established();
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
    render(<ActiveDesk />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resume test career' }));
    fireEvent.click(await screen.findByText('Buy a second club'));
    const buy = screen.getByRole('button', { name: /^Buy Foundry Vale for/ });
    const before = localStorage.getItem(SAVE_KEY);
    const disk = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    try { fireEvent.click(buy); } finally { disk.mockRestore(); }
    expect(screen.getByRole('status')).toHaveTextContent('could not save');
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
    fireEvent.click(buy);
    await waitFor(() => expect(screen.getByText('Foundry Vale boardroom')).toBeVisible());
    const bought = localStorage.getItem(SAVE_KEY)!;
    expect(JSON.parse(bought).budget).toBe(40);
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ active: 2 }));
    fireEvent.click(screen.getByRole('button', { name: /^Strengthen squad/ }));
    expect(screen.getByRole('status')).toHaveTextContent('could not save');
    expect(localStorage.getItem(SAVE_KEY)).toBe(bought);
  });

  it('keeps ownership with the parent on an actual midseason appointment', () => {
    const c = established(), owned = buySeniorClub(c, c.clubName, 1)!;
    const career = chooseSeniorPlan(owned, c.clubName, 1, 'squad')!;
    career.week = 8;
    career.jobHunt = { open: { club: 'Everton', league: 'premier', tier: 3, season: 1, week: 8,
      matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: 1, sent: 1, summerMove: null };
    const joined = joinClubNow(career)!;
    expect(joined.clubName).toBe('Everton'); expect(joined.seniorClub).toMatchObject(career.seniorClub!);
    expect(joined.seniorClub).not.toBe(career.seniorClub);
    expect(seniorMatchdays(joined)).toBe(seniorMatchdays(career));
    expect(seniorStandings(joined.seniorClub!, 1, seniorMatchdays(joined))).toEqual(seniorStandings(career.seniorClub!, 1, seniorMatchdays(career)));
    expect(projectFinances(joined).spend.some(row => row.id === 'secondClub')).toBe(false);
    expect(chooseSeniorPlan(joined, 'Everton', 1, 'reserve')).toBeNull();
    const saved = enterWilderness({ ...career, sacked: true });
    expect(saveCareer(saved)).toBe(true);
    const dismissed = loadCareer()!, raw = JSON.stringify(dismissed.seniorClub);
    expect(acceptWildernessJob(dismissed, 'Invalid job')).toBeNull();
    expect(JSON.stringify(dismissed.seniorClub)).toBe(raw);
    const newJob = acceptWildernessJob(dismissed, 'Everton')!;
    expect(newJob).toMatchObject({ season: 2, clubName: 'Everton' });
    expect(JSON.stringify(dismissed.seniorClub)).toBe(raw);
    const finished = newJob.seniorClub!.history;
    expect(finished).toHaveLength(1); expect(finished[0]).toMatchObject({ season: 1, opening: 12, spend: 4, plan: 'squad' });
    expect(newJob.seniorClub!.balance).toBe(finished[0].closing);
  });

  it('anchors the circuit when a new job has a shorter season and more played league dates', () => {
    const c = established(), owned = buySeniorClub(c, c.clubName, 1)!;
    const league = c.calendar.filter(f => f.type === 'league');
    const departing = { ...owned, calendar: league, week: 8 };
    const joined = { ...c, clubName: 'Everton', calendar: league.slice(0, 24), week: 12 };
    const before = seniorMatchdays(departing);
    expect(seniorMatchdays(joined)).toBeGreaterThan(before);
    carrySeniorClub(departing, joined);
    expect(seniorMatchdays(joined)).toBe(before);
    const midway = seniorMatchdays({ ...joined, week: 18 });
    expect(midway).toBeGreaterThan(before); expect(midway).toBeLessThan(CIRCUIT_DATES);
    expect(seniorMatchdays({ ...joined, week: 24 })).toBe(CIRCUIT_DATES);
  });
  it('charges the parent once, records the acquisition and keeps the junior club and the two wallets separate', () => {
    const c = established();
    expect(loadCareer(JSON.stringify(c))?.seniorClub).toBeUndefined();
    const buy = (state: typeof c) => buySeniorClub(state, c.clubName, c.season);
    expect(buy({ ...c, budget: 89.99 })).toBeNull();
    expect(buy({ ...c, academy: { ...c.academy!, facilities: 11 } })).toBeNull();
    expect(buy({ ...c, week: 1 })).toBeNull();
    expect(buySeniorClub(c, c.clubName, 2)).toBeNull();
    const owned = buy(c)!;
    expect(c.budget).toBe(130); expect(owned.budget).toBe(40); expect(owned.seniorClub?.balance).toBe(12);
    expect(owned.academy).toEqual(c.academy); expect(buy(owned)).toBeNull();
    expect(projectFinances(owned).spend.find(r => r.id === 'secondClub')).toMatchObject({ actual: 90, projected: 90, kitty: true });
    expect(closeLedger(owned).spend - closeLedger(c).spend).toBeCloseTo(90);
    const squad = chooseSeniorPlan(owned, c.clubName, 1, 'squad')!;
    expect(squad.budget).toBe(40); expect(squad.seniorClub?.balance).toBe(8);
    expect(chooseSeniorPlan(squad, c.clubName, 1, 'reserve')).toBeNull();
    expect(chooseSeniorPlan({ ...owned, clubName: 'Chelsea' }, 'Chelsea', 1, 'squad')).toBeNull();
    expect(chooseSeniorPlan({ ...owned, seniorClub: { ...owned.seniorClub!, balance: 3 } }, c.clubName, 1, 'squad')).toBeNull();
    expect(saveCareer(squad)).toBe(true); expect(loadCareer()?.seniorClub).toEqual(squad.seniorClub);
  });

  it('replays a complete league with identical opponent rolls, and squad spending changes the results', () => {
    const c = established(), owned = buySeniorClub(c, c.clubName, 1)!;
    const hold = chooseSeniorPlan(owned, c.clubName, 1, 'reserve')!, invest = chooseSeniorPlan(owned, c.clubName, 1, 'squad')!;
    const line = (s: typeof c) => seniorStandings(s.seniorClub!, 1, CIRCUIT_DATES).find(t => t.slot === 0)!;
    const a = line(hold), b = line(invest);
    expect(b.gf).toBeGreaterThan(a.gf);
    expect(b.ga).toBeLessThanOrEqual(a.ga); expect(b.pts).toBeGreaterThan(a.pts);
    closeSeniorSeason(hold); closeSeniorSeason(invest);
    for (const s of [hold, invest]) {
      const receipt = s.seniorClub!.history[0];
      expect(receipt.table).toHaveLength(SENIOR_CIRCUIT.length);
      expect(receipt.table.every(t => t.p === CIRCUIT_DATES && t.p === t.w + t.d + t.l && t.pts === t.w * 3 + t.d)).toBe(true);
      expect(receipt.table.reduce((diff, t) => diff + t.gf - t.ga, 0)).toBe(0);
      expect(receipt.closing).toBe(receipt.opening - receipt.spend + receipt.income - receipt.runningCosts);
      const before = JSON.stringify(s); closeSeniorSeason(s); expect(JSON.stringify(s)).toBe(before);
      expect(s.budget).toBe(40);
    }
  });

  it('keeps the final table and closed accounts before rollover, after reload, and at the old employer', () => {
    const c = established();
    let s = chooseSeniorPlan(buySeniorClub(c, c.clubName, 1)!, c.clubName, 1, 'squad')!;
    while (s.week < s.calendar.length) {
      const before = s.week;
      s = playNextEntry(s, { skipHalftime: true, noCoach: true }).state;
      expect(s.week).toBeGreaterThan(before);
    }
    expect(seniorMatchdays(s)).toBe(CIRCUIT_DATES);
    const closed = finishSeason(s).state;
    const receipt = closed.seniorClub!.history[0];
    expect(receipt).toMatchObject({ season: 1, opening: 12, spend: 4, plan: 'squad' });
    expect(saveCareer(closed)).toBe(true);
    const reloaded = loadCareer()!;
    expect(reloaded.seniorClub).toEqual(closed.seniorClub);
    const moved = startNextSeason(reloaded, 'Chelsea');
    expect(moved.clubName).toBe('Chelsea'); expect(moved.seniorClub).toEqual(closed.seniorClub);
    expect(projectFinances(moved).spend.some(r => r.id === 'secondClub')).toBe(false);
    expect(chooseSeniorPlan(moved, 'Chelsea', 2, 'squad')).toBeNull();
    const stayed = startNextSeason(closed);
    const next = chooseSeniorPlan(stayed, c.clubName, 2, 'reserve')!;
    expect(next.seniorClub!.balance).toBe(receipt.closing); expect(next.seniorClub!.history).toEqual([receipt]);
    expect(saveCareer(next)).toBe(true);
    render(<SecondClubPanel career={loadCareer()!} />);
    fireEvent.click(screen.getByText('Foundry Vale boardroom')); fireEvent.click(screen.getByText('Season accounts (1)'));
    const season = screen.getByText(/^Season 1 · #/);
    fireEvent.click(season);
    expect(screen.getByText(/Closing cash/)).toBeVisible();
    const table = within(season.parentElement!).getByRole('table');
    expect(table).toBeVisible();
    expect(within(table).getAllByRole('row')).toHaveLength(SENIOR_CIRCUIT.length + 1);
  }, 90_000);
});
