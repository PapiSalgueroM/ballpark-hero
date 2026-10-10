import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FarewellSeasonCard } from '@/components/soccer-career/FarewellSeasonCard';
import * as E from '@/lib/soccerCareerEngine';
import { announceSoccerFarewell, readSoccerFarewell } from '@/lib/soccerCareerFarewell';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function senior(): E.CareerState {
  const career = E.initCareer('Farewell Tester', 'England', 'CM', '2020-24',
    { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 },
    80, 2020, E.FALLBACK_CLUBS, null, 88);
  const club = E.FALLBACK_CLUBS.find(candidate => candidate.name === 'Arsenal')!;
  career.age = 34; career.overall = 80; career.peakOverall = 80;
  career.currentClub = club.name; career.currentClubCountry = club.country;
  career.currentClubTier = club.tier; career.currentClubColor = club.color; career.currentLeague = club.league;
  career.phase = 'playing'; career.retirementSuggested = true;
  career.seasons = [{ ...career.seasons[0], year: 2026, age: 34, club: club.name,
    clubCountry: club.country, clubTier: club.tier, type: 'playing', apps: 32, leagueApps: 28,
    goals: 8, assists: 11, rating: 7.2, ovr: 80 }];
  return copy(E.repairCareer(career));
}
function suggestion() {
  const career = senior(); career.phase = 'retirement_suggestion'; career.age = 35;
  return career;
}
function open() {
  const trigger = document.querySelector<HTMLButtonElement>('[data-farewell-open]');
  expect(trigger).toBeEnabled(); trigger!.focus(); fireEvent.click(trigger!);
  const dialog = document.querySelector<HTMLElement>('[data-farewell-dialog]');
  expect(dialog).toBeVisible(); return { trigger: trigger!, dialog: dialog! };
}
function review(dialog: HTMLElement) {
  expect(dialog.querySelector('[data-farewell-help]')).toBeVisible();
  expect(dialog.querySelector('[data-farewell-confirm]')).toBeNull();
  fireEvent.click(dialog.querySelector('[data-farewell-review-open]')!);
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-farewell-confirm]');
  expect(confirm).toBeEnabled(); return confirm!;
}
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); document.body.style.overflow = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer farewell season controls', () => {
  it('shows actual proposed year and rules with a worked example before any confirmation', () => {
    const career = senior(), before = copy(career), onAnnounce = vi.fn();
    vi.mocked(Math.random).mockImplementation(() => { throw new Error('read drew randomness'); });
    render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    const { dialog } = open();
    expect(dialog).toHaveTextContent('2027/28');
    expect(dialog.querySelector('[data-farewell-help]')).toHaveTextContent(/Example: announce 2027\/28/);
    expect(dialog).toHaveTextContent('There is no undo button');
    expect(dialog).toHaveTextContent('Injuries, bans and the existing forced retirement rules still apply');
    expect(dialog).toHaveTextContent('queued award, international or rivalry ceremonies');
    expect(dialog.querySelector('[data-farewell-confirm]')).toBeNull();
    expect(onAnnounce).not.toHaveBeenCalled(); expect(career).toEqual(before);
  });
  it('confirms only once for two captured rapid clicks and preserves the supplied career', () => {
    const career = senior(), raw = JSON.stringify(career), onAnnounce = vi.fn();
    render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    const { dialog } = open(), button = review(dialog);
    expect(button).toHaveTextContent('Announce last season');
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(onAnnounce).toHaveBeenCalledTimes(1); expect(JSON.stringify(career)).toBe(raw);
    expect(document.querySelector('[data-farewell-dialog]')).toBeNull();
  });
  it('explains that a retirement suggestion resumes its already-aged pending year', () => {
    const career = suggestion(), onAnnounce = vi.fn();
    render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    const { dialog } = open();
    expect(dialog).toHaveTextContent('This year has already started');
    expect(dialog).toHaveTextContent('without ageing you again');
    const button = review(dialog); expect(button).toHaveTextContent('Announce and play');
    expect(dialog).toHaveTextContent('plays the pending year now'); fireEvent.click(button);
    expect(onAnnounce).toHaveBeenCalledTimes(1); expect(career.age).toBe(35); expect(career.seasons).toHaveLength(1);
  });
  it('returns Back to the real opener without announcing or changing the body lock', async () => {
    const career = senior(), before = JSON.stringify(career), onAnnounce = vi.fn();
    document.body.style.overflow = 'scroll'; const oldStyle = document.body.getAttribute('style');
    render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    const { trigger, dialog } = open();
    await act(async () => { fireEvent.click(dialog.querySelector('[data-farewell-cancel]')!); });
    expect(document.querySelector('[data-farewell-dialog]')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus()); expect(document.body.getAttribute('style')).toBe(oldStyle);
    expect(JSON.stringify(career)).toBe(before); expect(onAnnounce).not.toHaveBeenCalled();
    document.body.style.overflow = '';
  });
  it('closes Escape to the actual opener and starts with the rules on reopening', async () => {
    const onAnnounce = vi.fn(); render(<FarewellSeasonCard career={senior()} onAnnounce={onAnnounce} />);
    const { trigger, dialog } = open(); review(dialog);
    await act(async () => { fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' }); });
    expect(document.querySelector('[data-farewell-dialog]')).toBeNull(); await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);
    expect(document.querySelector('[data-farewell-help]')).toBeVisible();
    expect(document.querySelector('[data-farewell-confirm]')).toBeNull(); expect(onAnnounce).not.toHaveBeenCalled();
  });
  it('reopens the saved final-year plan as read-only help without another confirmation', () => {
    const career = announceSoccerFarewell(senior()), raw = JSON.stringify(career), onAnnounce = vi.fn();
    render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    expect(document.querySelector('[data-farewell-plan="announced"]')).toHaveTextContent('2027/28');
    const { dialog } = open(); expect(dialog).toHaveTextContent('your announced final year');
    expect(dialog.querySelector('[data-farewell-review-open]')).toBeNull();
    expect(dialog.querySelector('[data-farewell-confirm]')).toBeNull();
    fireEvent.click(dialog.querySelector('[data-farewell-help-open]')!);
    expect(dialog.querySelector('[data-farewell-confirm]')).toBeNull();
    expect(JSON.stringify(career)).toBe(raw); expect(onAnnounce).not.toHaveBeenCalled();
  });
  it('shows completed-year results guidance without offering another Next Season or confirmation', () => {
    const career = announceSoccerFarewell(senior());
    career.age += 1; career.phase = 'season_summary';
    const final = { ...career.seasons[0], year: 2027, age: 35 };
    career.seasons = [...career.seasons, final]; career.pendingSummary = final;
    expect(readSoccerFarewell(career)?.year).toBe(2027);
    render(<FarewellSeasonCard career={career} onAnnounce={vi.fn()} />);
    const { dialog } = open();
    expect(dialog).toHaveTextContent(/results.*queued ceremonies/i);
    expect(dialog).not.toHaveTextContent('Use Next Season');
    expect(dialog.querySelector('[data-farewell-confirm]')).toBeNull();
  });
  it('uses the saved calendar year rather than the clock when another modern season is selected', () => {
    const career = senior(); career.seasons[0].year = 2036;
    render(<FarewellSeasonCard career={career} onAnnounce={vi.fn()} />);
    const { dialog } = open(); expect(dialog).toHaveTextContent('2037/38'); expect(dialog).not.toHaveTextContent('2027/28');
  });
  it.each<[string, (career: E.CareerState) => void]>([
    ['too young', (career: E.CareerState) => { career.age = 29; career.seasons[0].age = 29; }],
    ['forced age boundary', (career: E.CareerState) => { career.age = 44; career.seasons[0].age = 44; }],
    ['forced health boundary', (career: E.CareerState) => { career.overall = 49; }],
    ['retired', (career: E.CareerState) => { career.retired = true; career.phase = 'retired'; }],
    ['unrecorded year', (career: E.CareerState) => { career.seasons = []; }],
    ['malformed optional plan', (career: E.CareerState) => { career.farewellSeason = { version: 1 } as E.CareerState['farewellSeason']; }],
  ])('hides the announcement for %s without mutating the save', (_name, change) => {
    const career = senior(); change(career); const before = JSON.stringify(career);
    const onAnnounce = vi.fn(); render(<FarewellSeasonCard career={career} onAnnounce={onAnnounce} />);
    expect(document.querySelector('[data-farewell-open]')).toBeNull();
    expect(document.querySelector('[data-farewell-plan]')).toBeNull();
    expect(JSON.stringify(career)).toBe(before); expect(onAnnounce).not.toHaveBeenCalled();
  });
});
