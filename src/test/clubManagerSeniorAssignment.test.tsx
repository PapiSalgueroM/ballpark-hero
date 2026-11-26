import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SecondClubPanel from '@/components/club-manager/SecondClubPanel';
import { ensureAcademy, finishSeason, loadCareer, playNextEntry, recallLoanedPlayer, saveCareer, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { buySeniorClub, carrySeniorClub, CIRCUIT_DATES, closeSeniorSeason, returnedSeniorPlayer, SENIOR_CIRCUIT, seniorCircuit, seniorLoanRating, seniorMatchdays } from '@/lib/clubManagerSecondClub';
import { assignSeniorPlayer, seniorLoanCandidates } from '@/lib/clubManagerSeniorAssignment';
import { keyedRng } from '@/lib/keyedRng';

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(keyedRng('foundry-loan')); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function owner() {
  const c = startCareer('Manchester City');
  ensureAcademy(c); c.academy!.facilities = 14; c.budget = 132.57; c.inSeasonRatings = true;
  return buySeniorClub(c, c.clubName, c.season)!;
}

it('reserves one eligible parent player through the boardroom without charging either club', () => {
  let c = owner();
  const original = c, [p] = seniorLoanCandidates(c), before = JSON.stringify(c);
  const go = (s: CareerState) => assignSeniorPlayer(s, original.clubName, original.season, p);
  expect(p).toBeDefined();
  for (const patch of [{ age: 24 }, { position: 'GK' as const }, { onLoan: true }, { injuryWeeks: 2 }, { suspendedMatches: 1 }, { contractYears: 1 }, { rating: p.rating - 1 }]) {
    expect(go({ ...c, squad: c.squad.map(v => v.id === p.id ? { ...v, ...patch } : v) })).toBeNull();
  }
  expect(go({ ...c, week: 1 })).toBeNull(); expect(go({ ...c, clubName: 'Everton' })).toBeNull();
  expect(go({ ...c, transferWindow: null })).toBeNull();
  expect(go({ ...c, squad: [...c.squad, { ...p, name: 'Duplicate squad ID' }] })).toBeNull();
  const view = render(<SecondClubPanel career={c} onCommit={make => {
    const next = make(c); if (!next) return false;
    c = next; return true;
  }} />);
  fireEvent.click(screen.getByText('Foundry Vale boardroom')); fireEvent.click(screen.getByText('Player development loan'));
  fireEvent.change(screen.getByLabelText('Choose a player'), { target: { value: p.id } });
  fireEvent.click(screen.getByRole('button', { name: 'Loan ' + p.name + ' to Foundry Vale' }));
  expect(JSON.stringify(original)).toBe(before);
  expect(c.budget).toBe(original.budget); expect(c.seniorClub!.balance).toBe(original.seniorClub!.balance);
  expect(c.squad.some(v => v.id === p.id)).toBe(false); expect(c.xiIds).not.toContain(p.id);
  const loan = c.loanedOut!.find(l => l.player.id === p.id)!;
  expect(loan).toMatchObject({ club: SENIOR_CIRCUIT[0], season: 1, fee: 0, player: { name: p.name } });
  expect(loan.optionFee).toBeUndefined(); expect(recallLoanedPlayer(c, p.id)).toBeNull();
  expect(go(c)).toBeNull(); expect(seniorLoanCandidates(c)).toEqual([]);
  expect(saveCareer(c)).toBe(true);
  view.rerender(<SecondClubPanel career={loadCareer()!} />);
  expect(screen.getByText(/0 starts · 0 sub appearances · 0 minutes/)).toBeVisible();
});

it('fields the player in completed senior fixtures, measures his rating and returns him through a real summer', () => {
  const c = owner();
  const p = seniorLoanCandidates(c).sort((a, b) => a.age - b.age || a.rating - b.rating)[0];
  let s = assignSeniorPlayer(c, c.clubName, c.season, p)!;
  let previousMinutes = 0, previousDates = 0;
  while (s.week < s.calendar.length) {
    const beforeWeek = s.week;
    s = playNextEntry(s, { skipHalftime: true, noCoach: true }).state;
    expect(s.week).toBeGreaterThan(beforeWeek);
    const dates = seniorMatchdays(s), line = seniorCircuit(s.seniorClub!, 1, dates).playingTime;
    expect(line.starts + line.subApps).toBe(dates);
    if (dates > previousDates) expect(line.minutes).toBeGreaterThan(previousMinutes);
    else expect(line.minutes).toBe(previousMinutes);
    previousDates = dates; previousMinutes = line.minutes;
  }
  expect(previousDates).toBe(CIRCUIT_DATES);
  const seenRating = s.loanedOut!.find(l => l.player.id === p.id)!.player.rating;
  expect(seenRating).toBeGreaterThan(p.rating);
  const reviewed = finishSeason(s).state, receipt = reviewed.seniorClub!.history[0].player!;
  expect(receipt).toMatchObject({ playerId: p.id, name: p.name, openingRating: p.rating, lastRating: seenRating, minutes: previousMinutes });
  expect(receipt.starts).toBeGreaterThan(0); expect(receipt.subApps).toBeGreaterThan(0);
  expect(receipt.minutes).toBeLessThanOrEqual(90 * CIRCUIT_DATES);
  closeSeniorSeason(reviewed); expect(reviewed.seniorClub!.history).toHaveLength(1);
  expect(saveCareer(reviewed)).toBe(true);
  const next = startNextSeason(loadCareer()!);
  expect(next.squad.filter(v => v.name === p.name)).toHaveLength(1);
  expect(next.squad.find(v => v.name === p.name)).toMatchObject({ rating: seenRating, age: p.age + 1, loanOutSeason: undefined });
  expect(saveCareer(next)).toBe(true);
  const reloaded = loadCareer()!;
  expect(reloaded.seniorClub!.history[0].player).toEqual(receipt);
  const reissued = { ...next, squad: next.squad.map(v => v.name === p.name ? { ...v, id: v.id + '-2' } : v) };
  expect(returnedSeniorPlayer(reissued, reissued.seniorClub!, receipt)?.name).toBe(p.name);
  render(<SecondClubPanel career={reloaded} />);
  fireEvent.click(screen.getByText('Foundry Vale boardroom')); fireEvent.click(screen.getByText('Season accounts (1)'));
  fireEvent.click(screen.getByText(/^Season 1 · #/));
  expect(screen.getByText(new RegExp('Back in your squad at ' + seenRating + ' OVR'))).toBeVisible();
}, 90_000);

it('changes the circuit with the player on the pitch and keeps him out of a new employer’s squad', () => {
  const c = owner(), p = seniorLoanCandidates(c)[0], assigned = assignSeniorPlayer(c, c.clubName, c.season, p)!;
  const club = assigned.seniorClub!, a = club.assignment!;
  let weaker = 0, stronger = 0, fewerStarts = 0, moreStarts = 0;
  for (let i = 0; i < 32; i++) {
    const run = (openingRating: number) => seniorCircuit({ ...club, seed: String(i), assignment: { ...a, openingRating } }, 1, CIRCUIT_DATES);
    const low = run(60), high = run(85), points = (r: typeof low) => r.table.find(t => t.slot === 0)!.pts;
    weaker += points(low); stronger += points(high); fewerStarts += low.playingTime.starts; moreStarts += high.playingTime.starts;
  }
  expect(stronger).toBeGreaterThan(weaker); expect(moreStarts).toBeGreaterThan(fewerStarts);
  expect(seniorCircuit(c.seniorClub!, 1, CIRCUIT_DATES).playingTime.minutes).toBe(0);
  const joined = startCareer('Everton');
  carrySeniorClub(assigned, joined);
  expect(assignSeniorPlayer(joined, joined.clubName, 1, p)).toBeNull();
  expect(seniorLoanRating(joined, joined.seniorClub!)).toBe(p.rating);
  expect(joined.loanedOut?.some(l => l.player.name === p.name)).toBeFalsy();
  closeSeniorSeason(joined);
  expect(joined.seniorClub!.history[0].player?.lastRating).toBe(p.rating);
});
