import { useState } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import { applyEventChoice, FALLBACK_CLUBS, getAllEvents, initCareer, repairCareer, type CareerState, type RandomEvent } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const STORIES = [
  { key: 'esports', title: 'Esports team', status: 'Results not checked', acquire: 226, followup: 227, close: 1 },
  { key: 'cursedBoots', title: 'Cursed boots', status: 'Still wearing them', acquire: 230, followup: 231, close: 1 },
  { key: 'teammateLoan', title: 'Teammate loan', status: 'Repayment unresolved', acquire: 236, followup: 237, close: 1 },
  { key: 'coachingBadges', title: 'Coaching course', status: 'Coursework not reviewed', acquire: 270, followup: 630, close: 0 },
  { key: 'rDocCrew', title: 'Documentary', status: 'Footage not reviewed', acquire: 408, followup: 631, close: 0 },
] as const;
const copy = (state: CareerState): CareerState => repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(state)) as CareerState);
function roll<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.9);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T16:00:00Z'));
  try { return action(); } finally { random.mockRestore(); clock.mockRestore(); }
}
function initial(): CareerState {
  return roll(() => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const state = initCareer('Life Stories Fixture', 'England', 'CM', '2020s', stats, 80, 2020, FALLBACK_CLUBS, null, 94);
    const club = FALLBACK_CLUBS[0];
    return copy({ ...state, age: 30, phase: 'playing', retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
      seasons: [{ ...state.seasons[0], year: 2026, age: 30, club: club.name, clubCountry: club.country,
        clubTier: club.tier, type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7,
        injury: null, injuryWeeks: 0, injurySevere: false }],
      netWorth: 10, morale: 65, popularity: 70, integrityBonus: 5, lifeFlags: {}, eventLastFired: {},
      pendingEvents: [], seriousInjuries: [], events: ['Prepared fictional Life stories presentation'] });
  });
}
function answer(state: CareerState, id: number, choice: number): CareerState {
  // The queued marker prepares presentation, not natural picker delivery or elapsed time.
  const marker: RandomEvent = { id, emoji: '📋', title: 'Prepared queue marker', description: 'Prepared queue marker', category: 'life', choices: [] };
  const offered = roll(() => getAllEvents({ ...state, pendingEvents: [marker] }));
  const event = offered.find(row => row.id === id), sentinel = offered.find(row => row.id === 220);
  expect(event, 'actual source event must exist').toBeDefined(); expect(sentinel).toBeDefined();
  const queued = copy({ ...state, phase: 'random_events', pendingEvents: [event!, sentinel!],
    eventLastFired: { ...state.eventLastFired, [String(id)]: state.seasons[state.seasons.length - 1].year } });
  const result = roll(() => applyEventChoice(queued, choice, FALLBACK_CLUBS));
  expect(result.lastEventId).toBe(id); expect(result.pendingEvents.map(row => row.id)).toEqual([220]);
  return copy({ ...result, phase: 'playing', pendingEvents: [] });
}
function active() {
  let state = initial();
  for (const story of STORIES) { state = answer(state, story.acquire, 0); expect(state.lifeFlags?.[story.key]).toBe(1); }
  return state;
}
const callbacks = () => ({ onAnswer: vi.fn(), onMoney: vi.fn(), onBuyItem: vi.fn(), onClose: vi.fn() });
function Host({ career, handlers }: { career: CareerState; handlers: ReturnType<typeof callbacks> }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open fixture phone</button>
    {open && <PhonePanel career={career} {...handlers} onClose={() => { handlers.onClose(); setOpen(false); }} />}</>;
}
function draw(career: CareerState) {
  const handlers = callbacks(), view = render(<Host career={career} handlers={handlers} />);
  const opener = view.getByRole('button', { name: 'Open fixture phone' }); opener.focus(); fireEvent.click(opener);
  const dialog = () => view.getByRole('dialog');
  const life = () => { fireEvent.click(dialog().querySelector<HTMLButtonElement>('[data-phone-app="life"]')!); };
  life(); return { ...view, handlers, opener, dialog, life };
}
function section(view: ReturnType<typeof draw>) {
  const node = within(view.dialog()).queryByRole('region', { name: 'Ongoing stories' });
  expect(node !== null, 'Life must show its active stories').toBe(true); return node!;
}
function shown(view: ReturnType<typeof draw>, expected = [...STORIES]) {
  const node = section(view);
  expect(within(node).getAllByRole('listitem')).toHaveLength(expected.length);
  for (const row of expected) { expect(within(node).getByText(row.title, { exact: true })).toBeVisible(); expect(within(node).getByText(row.status, { exact: true })).toBeVisible(); }
  expect(within(node).queryAllByRole('button')).toHaveLength(0);
  expect(node.textContent).not.toMatch(/next season|guaranteed|paid back|qualified|champions|completed/i);
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Soccer Career phone ongoing Life stories', () => {
  for (const story of STORIES) it('life stories missing: acquired ' + story.key + ' shows its neutral status', () => {
    const state = answer(initial(), story.acquire, 0), before = JSON.stringify(state), view = draw(state);
    shown(view, [story]); expect(JSON.stringify(state)).toBe(before);
  });
  it('life stories missing: saved stories survive close reopen Back and literal remount', async () => {
    const state = copy(active()), before = serializeSoccerCareerSave(state), view = draw(state); shown(view);
    fireEvent.click(view.dialog().querySelector<HTMLButtonElement>('[data-phone-back]')!);
    expect(view.dialog().querySelector('[data-phone-app="life"]')).toHaveFocus(); view.life(); shown(view);
    fireEvent.click(within(view.dialog()).getByRole('button', { name: 'Put phone away' }));
    await act(async () => { await Promise.resolve(); }); expect(view.opener).toHaveFocus();
    fireEvent.click(view.opener); view.life(); shown(view); view.unmount();
    const restored = copy(parseSoccerCareerSave(before) as CareerState), reopened = draw(restored); shown(reopened);
    expect(serializeSoccerCareerSave(state)).toBe(before); expect(serializeSoccerCareerSave(restored)).toBe(before);
  });
  it('life stories missing: actual resolved followups remove only their own ongoing row', () => {
    let state = active(); const view = draw(state); shown(view);
    for (let index = 0; index < STORIES.length; index++) {
      const story = STORIES[index], previous = state;
      state = answer(state, story.followup, story.close);
      expect(state.lifeFlags?.[story.key]).not.toBe(previous.lifeFlags?.[story.key]);
      view.rerender(<Host career={state} handlers={view.handlers} />);
      if (index < STORIES.length - 1) shown(view, STORIES.slice(index + 1));
      else expect(within(view.dialog()).queryByRole('region', { name: 'Ongoing stories' })).toBeNull();
      expect(within(view.dialog()).queryByText(story.title, { exact: true })).toBeNull();
    }
  });
  it('life stories missing: display navigation holds full saved state callbacks storage and RNG', () => {
    const state = active(), before = JSON.stringify(state), random = vi.spyOn(Math, 'random'), write = vi.spyOn(Storage.prototype, 'setItem');
    const view = draw(state); shown(view);
    fireEvent.click(view.dialog().querySelector<HTMLButtonElement>('[data-phone-back]')!); view.life(); shown(view);
    expect(JSON.stringify(state)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
    for (const callback of Object.values(view.handlers)) expect(callback).not.toHaveBeenCalled();
  });
  it('life stories preservation: legacy missing flags keep the original Life meters and Back', () => {
    const state = initial(); delete state.lifeFlags; const before = JSON.stringify(state), view = draw(state);
    expect(within(view.dialog()).queryByRole('region', { name: 'Ongoing stories' })).toBeNull();
    expect(within(view.dialog()).getByText(/people you keep in touch with:/)).toBeVisible();
    expect(within(view.dialog()).getByText(/how the public sees you/)).toBeVisible();
    fireEvent.click(view.dialog().querySelector<HTMLButtonElement>('[data-phone-back]')!);
    expect(view.dialog().querySelector('[data-phone-app="life"]')).toHaveFocus(); expect(JSON.stringify(state)).toBe(before);
  });
  it('life stories preservation: resolved declined and unrelated flags do not create stories', () => {
    for (const value of [0, 2, 3, 4, 9]) {
      const state = initial(); state.lifeFlags = Object.fromEntries(STORIES.map(row => [row.key, value])); state.lifeFlags.unrelated = 1;
      const view = draw(state); expect(within(view.dialog()).queryByRole('region', { name: 'Ongoing stories' })).toBeNull(); view.unmount();
    }
  });
  it('life stories preservation: retired careers omit unfinished flags', () => {
    const state = { ...active(), retired: true, phase: 'retired' as const }, before = JSON.stringify(state), view = draw(state);
    expect(within(view.dialog()).queryByRole('region', { name: 'Ongoing stories' })).toBeNull(); expect(JSON.stringify(state)).toBe(before);
  });
  it('life stories preservation: five actual acquisition and followup meanings supply held browser fixtures', () => {
    const acquired = active(); let resolved = copy(acquired);
    for (const story of STORIES) { resolved = answer(resolved, story.followup, story.close); expect(resolved.lifeFlags?.[story.key]).toBe(story.key === 'coachingBadges' ? 3 : 2); }
    expect(isSoccerCareerSave(acquired)).toBe(true); expect(isSoccerCareerSave(resolved)).toBe(true);
    expect(acquired.netWorth).toBe(12); expect(acquired.morale).toBe(57); expect(acquired.popularity).toBe(75);
    expect(acquired.integrityBonus).toBe(9); expect(acquired.socialMediaFollowers).toBe(2.5);
    expect(acquired.statBoostNextSeason).toEqual({ passing: 1 });
    expect(acquired.lifeFlags).toMatchObject(Object.fromEntries(STORIES.map(row => [row.key, 1])));
    console.log('SC_LIFE_STORIES_FIXTURE:' + JSON.stringify({ acquired, resolved,
      limits: 'Actual catalog choices prepare effects. Queues and playing phase are prepared presentation; no automatic picker or elapsed season is claimed.' }));
  });
});
