import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import YouthTeamPanel from '@/components/club-manager/YouthTeamPanel';
import { ensureAcademy, loadCareer, playNextEntry, saveCareer, SAVE_KEY, startCareer } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';
import { enterYouthCampaign, foundYouthTeam, playYouthFixture } from '@/lib/clubManagerYouthTeam';

beforeEach(() => {
  localStorage.clear(); saveFence.release(SAVE_KEY);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('youth-season'));
});
afterEach(() => { saveFence.release(SAVE_KEY); vi.restoreAllMocks(); });

function setup() {
  const career = startCareer('Manchester City');
  ensureAcademy(career);
  career.budget = 100;
  career.academy!.facilities = 14;
  career.academy!.prospects = [{ id: 'test-youth', name: 'Academy prospect', position: 'CM', age: 17, rating: 62,
    potential: 64, lowGuess: 63, highGuess: 70, source: 'Academy', flag: '', fee: 0, season: career.season }];
  return career;
}

describe('Club Manager U21 side', () => {
  it('charges once, plays six actual league dates, and keeps both the results and earned growth after reload', () => {
    const initial = setup();
    let career = foundYouthTeam(initial);
    expect(initial.academy!.youthTeam).toBeUndefined();
    expect(career.budget).toBe(55);
    expect(foundYouthTeam(career)).toBe(career);
    career = enterYouthCampaign(career, 'test-youth');
    expect(enterYouthCampaign(career, 'test-youth')).toBe(career);
    let league = 0, other = 0;
    for (let i = 0; i < 24 && league < 7; i++) {
      const entry = career.calendar[career.week];
      const old = career.week;
      career = playNextEntry(career, { skipHalftime: true, noCoach: true }).state;
      expect(career.week).toBeGreaterThan(old);
      if (entry.type === 'league') league++;
      else other++;
      expect(career.academy!.youthTeam!.campaign!.fixtures).toHaveLength(Math.min(league, 6));
    }
    expect(league).toBe(7); expect(other).toBeGreaterThan(0);
    const matches = career.academy!.youthTeam!.campaign!.fixtures;
    expect(matches.map(m => m.gain)).toEqual([0, 1, 0, 1, 0, 0]);
    expect(career.academy!.prospects[0].rating).toBe(64);
    expect(saveCareer(career)).toBe(true);
    const reopened = loadCareer()!;
    expect(reopened.academy!.youthTeam).toEqual(career.academy!.youthTeam);
    expect(reopened.academy!.prospects[0].rating).toBe(64);
    expect(enterYouthCampaign(reopened, 'test-youth')).toBe(reopened);
    const next = { ...reopened, season: reopened.season + 1, budget: 30 };
    const broke = { ...next, budget: 11 };
    expect(enterYouthCampaign(broke, 'test-youth')).toBe(broke);
    const enteredAgain = enterYouthCampaign(next, 'test-youth');
    expect(enteredAgain.budget).toBe(18);
    expect(enteredAgain.academy!.youthTeam!.history).toEqual([reopened.academy!.youthTeam!.campaign]);
    expect(enterYouthCampaign(enteredAgain, 'test-youth')).toBe(enteredAgain);
    expect(saveCareer(enteredAgain)).toBe(true);
    const archive = loadCareer()!;
    expect(archive.academy!.youthTeam).toEqual(enteredAgain.academy!.youthTeam);
    render(<YouthTeamPanel career={archive} onFound={vi.fn()} onEnter={vi.fn()} />);
    fireEvent.click(screen.getByText('Manchester City U21'));
    fireEvent.click(screen.getByText('Past U21 campaigns (1)'));
    expect(screen.getByText('Season 1 · Academy prospect')).toBeVisible();
    expect(screen.getByText('Development: +2 rating')).toBeVisible();
  });

  it('blocks unaffordable entry, does not train a released prospect or repeat a fixture, and reads older saves', () => {
    const career = setup();
    expect(loadCareer(JSON.stringify(career))?.academy?.youthTeam).toBeUndefined();
    const poor = { ...career, budget: 44.9 };
    expect(foundYouthTeam(poor)).toBe(poor);
    const owned = foundYouthTeam(career);
    expect(enterYouthCampaign(owned, 'unknown')).toBe(owned);
    const entered = enterYouthCampaign(owned, 'test-youth');
    playYouthFixture(entered, 1, 'Opponent');
    playYouthFixture(entered, 1, 'Opponent');
    entered.academy!.prospects = [];
    playYouthFixture(entered, 2, 'Opponent');
    expect(entered.academy!.youthTeam!.campaign!.fixtures.map(m => m.gain)).toEqual([0, 0]);
    const bytes = JSON.parse(JSON.stringify(entered));
    bytes.academy.youthTeam.campaign.fixtures = 'damaged';
    expect(loadCareer(JSON.stringify(bytes))?.academy?.youthTeam).toEqual({ club: career.clubName });
  });

  it('quotes the founding price and lets the manager select the player for the first campaign', () => {
    const career = setup(), onFound = vi.fn(), onEnter = vi.fn();
    const view = render(<YouthTeamPanel career={career} onFound={onFound} onEnter={onEnter} />);
    fireEvent.click(screen.getByText('Found a youth team'));
    fireEvent.click(screen.getByRole('button', { name: /Found U21 side/ }));
    expect(onFound).toHaveBeenCalledOnce();
    view.rerender(<YouthTeamPanel career={foundYouthTeam(career)} onFound={onFound} onEnter={onEnter} />);
    expect(screen.getByLabelText('Featured prospect')).toHaveValue('test-youth');
    fireEvent.click(screen.getByRole('button', { name: 'Enter first campaign' }));
    expect(onEnter).toHaveBeenCalledWith('test-youth');
  });
});
