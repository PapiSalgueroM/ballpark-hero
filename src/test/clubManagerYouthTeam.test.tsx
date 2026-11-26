import { closeLedger, projectFinances, rolloverBooks } from '@/lib/clubManagerFinances';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import YouthTeamPanel from '@/components/club-manager/YouthTeamPanel';
import { ensureAcademy, loadCareer, playNextEntry, saveCareer, SAVE_KEY, startCareer } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';
import { enterYouthCampaign, foundYouthTeam, fundSecondYouthPlace, secondPlaceRecord, playYouthFixture, rotateYouthProspect, youthDevelopment } from '@/lib/clubManagerYouthTeam';

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
    render(<YouthTeamPanel onRotate={vi.fn()} career={archive} onFound={vi.fn()} onEnter={vi.fn()} />);
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

  it('splits development between the prospects who actually earned it, across reload and a second season', () => {
    const initial = setup(), first = initial.academy!.prospects[0];
    const second = { ...first, id: 'second', name: 'Second prospect', rating: 56, potential: 57 };
    initial.academy!.prospects.push(second, { ...second, id: 'over-age', age: 21 });
    const legacy = enterYouthCampaign(foundYouthTeam(initial), first.id);
    playYouthFixture(legacy, 1, 'Blue');
    expect(rotateYouthProspect(legacy, legacy.season, 2, second.id)).toBe(legacy);
    playYouthFixture(legacy, 2, 'Red');
    expect(saveCareer(legacy)).toBe(true);
    const restored = loadCareer()!;
    expect(restored.academy!.youthTeam!.campaign!.rotations).toBeUndefined();
    for (const id of [first.id, 'over-age', 'missing']) {
      expect(rotateYouthProspect(restored, restored.season, 2, id)).toBe(restored);
    }
    expect(rotateYouthProspect(restored, restored.season + 1, 2, second.id)).toBe(restored);
    const switched = rotateYouthProspect(restored, restored.season, 2, second.id);
    expect(switched.budget).toBe(restored.budget);
    expect(rotateYouthProspect(switched, switched.season, 2, first.id)).toBe(switched);
    expect(saveCareer(switched)).toBe(true);
    const resumed = loadCareer()!;
    playYouthFixture(resumed, 3, 'Green');
    playYouthFixture(resumed, 3, 'Green');
    playYouthFixture(resumed, 4, 'Orange');
    expect(resumed.academy!.prospects.map(p => p.rating)).toEqual([63, 57, 56]);
    expect(rotateYouthProspect(resumed, resumed.season, 2, first.id)).toBe(resumed);
    const returned = rotateYouthProspect(resumed, resumed.season, 4, first.id);
    playYouthFixture(returned, 5, 'Blue');
    playYouthFixture(returned, 6, 'Red');
    const campaign = returned.academy!.youthTeam!.campaign!;
    expect(youthDevelopment(campaign)).toEqual([{ name: first.name, gain: 2 }, { name: second.name, gain: 1 }]);
    expect(returned.academy!.prospects.map(p => p.rating)).toEqual([64, 57, 56]);
    const next = enterYouthCampaign({ ...returned, season: returned.season + 1 }, second.id);
    expect(saveCareer(next)).toBe(true);
    expect(loadCareer()!.academy!.youthTeam!.history).toEqual([campaign]);
  });

  it('charges both U21 places to the parent books and trains only the prospects who appear', () => {
    const initial = setup();
    initial.budget = 100.07;
    const featured = initial.academy!.prospects[0];
    const second = { ...featured, id: 'second-focus', name: 'Second prospect', rating: 56, potential: 58 };
    initial.academy!.prospects.push(second, { ...featured, id: 'capped', name: 'At ceiling', potential: featured.rating });
    const startingSpend = closeLedger(initial).spend;
    const first = enterYouthCampaign(foundYouthTeam(initial), featured.id);
    expect(first.budget).toBe(55.07);
    expect(first.books!.season.youthProgramme).toBe(45);
    expect(initial.books?.season.youthProgramme).toBeUndefined();
    for (const [club, season, id] of [[first.clubName, 1, featured.id], [first.clubName, 1, 'capped'], ['other', 1, second.id], [first.clubName, 2, second.id]] as const) {
      expect(fundSecondYouthPlace(first, club, season, id)).toBeNull();
    }
    expect(fundSecondYouthPlace({ ...first, budget: 17.99 }, first.clubName, 1, second.id)).toBeNull();
    let funded = fundSecondYouthPlace(first, first.clubName, 1, second.id)!;
    expect(funded.budget).toBe(37.07);
    expect(fundSecondYouthPlace(funded, first.clubName, 1, second.id)).toBeNull();
    expect(projectFinances(funded).spend.find(l => l.id === 'youthProgramme')).toMatchObject({ actual: 63, projected: 63 });
    expect(closeLedger(funded).spend).toBeCloseTo(startingSpend + 63);
    let plain = loadCareer(JSON.stringify(first))!;
    function next(c: typeof first) {
      vi.mocked(Math.random).mockImplementation(keyedRng('u21-two-deep|' + c.week));
      return playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 }).state;
    }
    while (funded.academy!.youthTeam!.campaign!.fixtures.length < 6) {
      funded = next(funded); plain = next(plain);
      const campaign = funded.academy!.youthTeam!.campaign!;
      if (campaign.fixtures.length === 2) {
        expect(rotateYouthProspect(funded, 1, 2, second.id)).toBe(funded);
        expect(fundSecondYouthPlace(plain, first.clubName, 1, second.id)).toBeNull();
        funded = loadCareer(JSON.stringify(funded))!;
      }
    }
    const finished = funded.academy!.youthTeam!.campaign!;
    expect(finished.fixtures.map(m => m.secondGain)).toEqual([0,1,0,1,0,0]);
    expect(finished.fixtures.map(({ secondGain, ...m }) => m)).toEqual(plain.academy!.youthTeam!.campaign!.fixtures);
    expect(secondPlaceRecord(finished)).toEqual({ apps: 6, gain: 2 });
    expect(funded.academy!.prospects[1].rating).toBe(58);
    expect(plain.academy!.prospects[1].rating).toBe(56);
    const nextSeason = { ...funded, season: 2 };
    rolloverBooks(nextSeason, funded, false);
    const reentered = enterYouthCampaign(nextSeason, featured.id);
    expect(reentered.budget).toBeCloseTo(nextSeason.budget - 12);
    expect(reentered.books!.lastSeason!.youthProgramme).toBe(63);
    expect(reentered.books!.season.youthProgramme).toBe(12);
    expect(loadCareer(JSON.stringify(reentered))!.academy!.youthTeam!.history).toEqual([finished]);
  }, 20000);

  it('stops crediting a departed holder and keeps old payments unknown on reload', () => {
    const c = setup(), p = c.academy!.prospects[0];
    c.academy!.prospects.push({ ...p, id: 'other', name: 'Other academy player' });
    let s = enterYouthCampaign(foundYouthTeam(c), p.id);
    delete s.books!.season.youthProgramme;
    s = loadCareer(JSON.stringify(s))!;
    expect(projectFinances(s).spend.some(l => l.id === 'youthProgramme')).toBe(false);
    s = fundSecondYouthPlace(s, c.clubName, c.season, 'other')!;
    expect(s.books!.season.youthProgramme).toBe(18);
    playYouthFixture(s, 0, 'First'); playYouthFixture(s, 0, 'First');
    s.academy!.prospects = [p];
    playYouthFixture(s, 1, 'Second');
    expect(secondPlaceRecord(s.academy!.youthTeam!.campaign!)).toEqual({ apps: 1, gain: 0 });
  });

  it('does not give missing or capped players development after a rotation', () => {
    const initial = setup(), a = initial.academy!.prospects[0];
    const b = { ...a, id: 'capped', name: 'Capped prospect', rating: 64, potential: 64 };
    initial.academy!.prospects.push(b);
    const career = enterYouthCampaign(foundYouthTeam(initial), a.id);
    playYouthFixture(career, 1, 'Blue'); playYouthFixture(career, 2, 'Red');
    const changed = rotateYouthProspect(career, career.season, 2, b.id);
    playYouthFixture(changed, 3, 'Green'); playYouthFixture(changed, 4, 'Orange');
    changed.academy!.prospects = changed.academy!.prospects.filter(p => p.id !== b.id);
    playYouthFixture(changed, 5, 'Grey'); playYouthFixture(changed, 6, 'Pink');
    expect(youthDevelopment(changed.academy!.youthTeam!.campaign!)).toEqual([{ name: a.name, gain: 1 }, { name: b.name, gain: 0 }]);
    expect(changed.academy!.prospects[0].rating).toBe(63);
  });

  it('quotes the founding price and lets the manager select the player for the first campaign', () => {
    const career = setup(), onFound = vi.fn(), onEnter = vi.fn();
    const view = render(<YouthTeamPanel onRotate={vi.fn()} career={career} onFound={onFound} onEnter={onEnter} />);
    fireEvent.click(screen.getByText('Found a youth team'));
    fireEvent.click(screen.getByRole('button', { name: /Found U21 side/ }));
    expect(onFound).toHaveBeenCalledOnce();
    view.rerender(<YouthTeamPanel onRotate={vi.fn()} career={foundYouthTeam(career)} onFound={onFound} onEnter={onEnter} />);
    expect(screen.getByLabelText('Featured prospect')).toHaveValue('test-youth');
    fireEvent.click(screen.getByRole('button', { name: 'Enter first campaign' }));
    expect(onEnter).toHaveBeenCalledWith('test-youth');
  });
});
