import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_DOCUMENTARY_ENGINE ? await import(/* @vite-ignore */ process.env.SC_DOCUMENTARY_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_DOCUMENTARY_LIFE ? await import(/* @vite-ignore */ process.env.SC_DOCUMENTARY_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const A = (process.env.SC_DOCUMENTARY_REALISM ? await import(/* @vite-ignore */ process.env.SC_DOCUMENTARY_REALISM)
  : await import('@/lib/soccerCareerRealismA')) as typeof import('@/lib/soccerCareerRealismA');
const S = (process.env.SC_DOCUMENTARY_SAVE ? await import(/* @vite-ignore */ process.env.SC_DOCUMENTARY_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function draws<T>(input: number | readonly number[], action: () => T): { result: T; values: number[] } {
  const values: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = typeof input === 'number' ? input : input[values.length];
    if (value === undefined) throw new Error('Actual source consumed an unlisted documentary input');
    values.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return { result: action(), values }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const saved = json(state); expect(S.isSoccerCareerSave(saved), 'actual documentary save must validate').toBe(true);
  const repaired = E.repairCareer(saved); expect(S.isSoccerCareerSave(repaired)).toBe(true); return repaired;
}
function reload(state: CareerState): CareerState {
  const held = JSON.stringify(state), run = draws([], () => restore(state));
  expect(run.values).toEqual([]); expect(JSON.stringify(run.result)).toBe(held); expect(JSON.stringify(state)).toBe(held); return run.result;
}
function context(): CareerState {
  const initialized = draws(0.9, () => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    return E.initCareer('Documentary Review Fixture', 'England', 'CM', '2020s', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94);
  }).result;
  const club = E.FALLBACK_CLUBS[0];
  return restore({ ...initialized, age: 23, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
    currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 60,
    popularity: 60, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
    seasons: [{ ...initialized.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
      type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
    lifeFlags: { unrelatedDocumentaryFixture: 7 }, eventLastFired: { '7777': 2022 }, pendingEvents: [], seriousInjuries: [],
    statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional documentary context'] });
}
function catalog(state: CareerState): RandomEvent[] {
  const held = JSON.stringify(state), run = draws([0.99, 0.99], () => E.getAllEvents(state));
  expect(run.values).toEqual([0.99, 0.99]); expect(JSON.stringify(state)).toBe(held); return run.result;
}
function producer(state: CareerState): RandomEvent {
  const run = draws([], () => A.getRealismEventsA(state)), matches = run.result.filter(event => event.id === 408);
  expect(run.values).toEqual([]); expect(matches).toHaveLength(1); return matches[0];
}
function reviewCard(state: CareerState): RandomEvent {
  const matches = catalog(state).filter(event => event.id === 631);
  expect(matches.length === 1, 'documentary review missing from actual Life catalog').toBe(true);
  return matches[0];
}
function waiting(state: CareerState, event: RandomEvent): CareerState {
  const continuation = catalog(state).filter(item => item.id === 220); expect(continuation).toHaveLength(1);
  // Prepared real catalog presentation, not natural picker delivery. No effect or callback is fabricated.
  return reload(restore({ ...state, phase: 'random_events', pendingEvents: [event, continuation[0]],
    eventLastFired: { ...state.eventLastFired, [String(event.id)]: year(state), 'story:squadChatLeak': year(state) } }));
}
function answer(state: CareerState, index: number): CareerState {
  const held = JSON.stringify(state), run = draws([0.99, 0.99], () => E.applyEventChoice(state, index, E.FALLBACK_CLUBS));
  expect(run.values).toEqual([0.99, 0.99]); expect(JSON.stringify(state)).toBe(held); return reload(run.result);
}
function acquired(choice = 0): CareerState {
  const state = context(); return answer(waiting(state, producer(state)), choice);
}
function nextPlaying(state: CareerState): CareerState {
  // The model season input clears the unplayed prepared presentation. This is not a complete UI career journey.
  const input = reload(restore({ ...state, phase: 'playing', pendingEvents: [], loan: null })), held = JSON.stringify(input);
  const run = draws(0.9, () => {
    const started = E.advanceProSeason(json(input), E.FALLBACK_CLUBS);
    return started.phase === 'retirement_suggestion' ? E.declineRetirementSuggestion(started, E.FALLBACK_CLUBS) : started;
  });
  const next = restore(run.result), row = next.seasons[next.seasons.length - 1];
  expect(JSON.stringify(input)).toBe(held); expect(run.values.length).toBeGreaterThan(0);
  expect(year(next)).toBe(year(state) + 1); expect(row.type).toBe('playing'); expect(row.apps).toBeGreaterThan(0);
  expect(row.injurySevere).not.toBe(true); expect(next.retired).toBe(false); return reload(next);
}
function due(): CareerState { return nextPlaying(acquired()); }
function review(): CareerState { const state = due(); return waiting(state, reviewCard(state)); }
function expected(before: CareerState, index: number, documentary = true): CareerState {
  const after = json(before), id = documentary ? 631 : 408;
  if (documentary) {
    after.lifeFlags = { ...after.lifeFlags, rDocCrew: index === 0 ? 2 : 3 };
    if (index === 0) { after.integrityBonus += 2; after.morale = clamp(after.morale - 1); }
    else { after.morale = clamp(after.morale + 2); after.popularity = clamp(after.popularity - 1); }
    after.events.push(index === 0 ? '🎬 Checked the facts in the documentary footage and promotional copy'
      : '🎬 Asked the production team to keep family scenes out of the promotion');
  } else if (index === 0) {
    after.netWorth = Math.round((after.netWorth + 3) * 100) / 100;
    after.socialMediaFollowers = Math.round((after.socialMediaFollowers + 2.5) * 100) / 100;
    after.popularity = clamp(after.popularity + 5); after.morale = clamp(after.morale - 5);
    after.lifeFlags = { ...after.lifeFlags, rDocCrew: 1 };
    after.events.push('🎥 Sold full documentary access. Three million euros, and a camera in the room on the night you got dropped');
  } else if (index === 1) {
    after.netWorth = Math.round((after.netWorth + 0.8) * 100) / 100;
    after.socialMediaFollowers = Math.round((after.socialMediaFollowers + 0.8) * 100) / 100;
    after.events.push('🎥 Gave the documentary the football and none of the family. Everyone survived it');
  } else {
    after.morale = clamp(after.morale + 6); after.statBoostNextSeason = { ...after.statBoostNextSeason,
      physical: (after.statBoostNextSeason.physical ?? 0) + 1 };
    after.events.push('🎥 Turned down the documentary money for a quiet year. Slept like a baby, played like an adult');
  }
  after.lastEventId = id; after.pendingEvents = after.pendingEvents.slice(1); after.phase = 'random_events'; return after;
}
function effect(before: CareerState, index: number, documentary = true): CareerState {
  const held = JSON.stringify(before), after = answer(before, index);
  if (documentary && index === 0) expect(after.integrityBonus === before.integrityBonus + 2,
    'documentary fact check lost its actual integrity').toBe(true);
  expect(after).toEqual(expected(before, index, documentary)); expect(JSON.stringify(before)).toBe(held);
  expect(reload(reload(after))).toEqual(after); return after;
}
function absent(state: CareerState): void {
  const fresh = reload(restore({ ...state, pendingEvents: [] })); expect(catalog(fresh).some(event => event.id === 631)).toBe(false);
  expect(draws([], () => L.getPriorityLifeEventIds(fresh)).result).not.toContain(631);
}

describe('Soccer Career recorded documentary review', () => {
  it('documentary review missing: full access earns a review in the actual later playing season', () => {
    const start = acquired(), next = nextPlaying(start), card = reviewCard(next);
    expect(start.lifeFlags?.rDocCrew).toBe(1); expect(start.eventLastFired?.['408']).toBe(year(start));
    expect(next.eventLastFired?.['408']).toBe(year(start)); expect(year(next)).toBe(year(start) + 1);
    expect(card.title).toBe('Your documentary review'); expect(E.eventCooldown(card)).toBe(2); expect(card.cooldown).not.toBe(99);
    expect(card.choices.map(choice => [choice.label, choice.consequence])).toEqual([
      ['Check the facts', 'Integrity +2, Morale -1. Documentary reviewed'],
      ['Ask to keep family scenes out of the promotion', 'Morale +2, Popularity -1. Documentary reviewed'],
    ]);
  });
  it('documentary review missing: due review has priority in the actual picker', () => {
    const state = due(); reviewCard(state);
    expect(L.getPriorityLifeEventIds(state).includes(631), 'documentary review lost its actual picker priority').toBe(true);
    const held = JSON.stringify(state), run = draws(0.99, () => E.dismissSocialMediaPhase({ ...state, phase: 'social_media_action',
      pendingEvents: [], socialMediaActionUsedThisSeason: true }, E.FALLBACK_CLUBS));
    expect(run.result.pendingEvents.filter(event => event.id === 631)).toHaveLength(1);
    expect(run.result.eventLastFired?.['631']).toBe(year(state)); expect(run.result.pendingEvents.length).toBeLessThanOrEqual(5);
    expect(JSON.stringify(state)).toBe(held);
  });
  it('documentary review missing: checking facts applies its complete saved effect', () => { effect(review(), 0); });
  it('documentary review missing: family privacy applies its complete saved effect', () => { effect(review(), 1); });
  it('documentary review missing: checking facts clamps morale at zero', () => { effect(reload({ ...review(), morale: 0 }), 0); });
  it('documentary review missing: family privacy clamps morale and popularity at their boundaries', () => {
    effect(reload({ ...review(), morale: 100, popularity: 0 }), 1);
  });
  it('documentary review missing: queued facts survives JSON and changed offer gates', () => {
    const original = review(), before = reload(reload({ ...original, age: 19, popularity: 0, morale: 1,
      lifeFlags: { ...original.lifeFlags, rDocCrew: 3 }, eventLastFired: { ...original.eventLastFired, '408': year(original) } }));
    absent({ ...before, pendingEvents: [] }); expect(typeof before.pendingEvents[0].choices[0].apply).toBe('undefined');
    expect(catalog(before).filter(event => event.id === 631)).toHaveLength(1); effect(before, 0);
  });
  it('documentary review missing: queued family privacy survives JSON and retirement', () => {
    const original = review(), before = reload(reload({ ...original, retired: true, age: 38, popularity: 0,
      lifeFlags: { ...original.lifeFlags, rDocCrew: 2 }, eventLastFired: { ...original.eventLastFired, '408': year(original) + 1 } }));
    absent({ ...before, phase: 'retired', pendingEvents: [] }); expect(catalog(before).filter(event => event.id === 631)).toHaveLength(1);
    effect(before, 1);
  });
  it('documentary review missing: both resolved choices stay once after two canonical reloads', () => {
    for (const index of [0, 1]) {
      const before = review(), after = effect(before, index), loaded = reload(reload(after));
      expect(loaded.events).toEqual(after.events); expect(loaded.eventLastFired).toEqual(before.eventLastFired);
      expect(loaded.pendingEvents.map(event => event.id)).toEqual([220]); absent(loaded);
    }
  });
  it('documentary review missing: another full-access deal enables one later review', () => {
    const first = effect(review(), 0), reviewedYear = year(first);
    const available = nextPlaying(nextPlaying(first));
    expect(E.isEventOnCooldown(available, producer(available))).toBe(false);
    const second = effect(waiting(available, producer(available)), 0, false);
    expect(second.lifeFlags?.rDocCrew).toBe(1); expect(second.eventLastFired?.['408']).toBe(year(second)); absent(second);
    const later = nextPlaying(second), card = reviewCard(later);
    expect(year(later)).toBe(reviewedYear + 3); expect(E.eventCooldown(card)).toBe(2); expect(E.isEventOnCooldown(later, card)).toBe(false);
    const after = effect(waiting(later, card), 1); absent(after);
  });
  it('documentary review missing: a legacy full-access record is reviewed without inventing a date', () => {
    const state = acquired(); delete state.eventLastFired?.['408']; const held = JSON.stringify(state), card = reviewCard(state);
    expect(state.lifeFlags?.rDocCrew).toBe(1); expect(state.eventLastFired?.['408']).toBeUndefined(); expect(JSON.stringify(state)).toBe(held);
    const after = effect(waiting(state, card), 0); expect(after.eventLastFired?.['408']).toBeUndefined(); absent(after);
  });
  it('documentary review preservation: full access keeps the original money followers meters and flag', () => {
    const state = context(), before = waiting(state, producer(state)); effect(before, 0, false);
    expect(before.pendingEvents[0].choices[0].consequence).toBe('Net worth +€3M, followers +2.5M, Popularity +5, Morale -5');
  });
  it('documentary review preservation: limited access keeps the original money followers and privacy', () => {
    const state = context(), after = effect(waiting(state, producer(state)), 1, false); expect(after.lifeFlags?.rDocCrew).toBeUndefined();
    absent(nextPlaying(after));
  });
  it('documentary review preservation: refusing cameras keeps original morale and queued physical', () => {
    const state = context(), after = effect(waiting(state, producer(state)), 2, false); expect(after.lifeFlags?.rDocCrew).toBeUndefined();
    absent(nextPlaying(after));
  });
  it('documentary review preservation: no full-access record creates no fresh review', () => { absent(context()); });
  it('documentary review preservation: a known acquisition year creates no same-season review', () => { absent(acquired()); });
  it('documentary review preservation: a known future producer stamp creates no fresh review', () => {
    const state = acquired(); absent(reload({ ...state, eventLastFired: { ...state.eventLastFired, '408': year(state) + 1 } }));
  });
  it('documentary review preservation: retired careers gain no fresh review or priority', () => {
    const state = due(); absent(reload({ ...state, phase: 'retired', retired: true, pendingEvents: [] }));
  });
  it('documentary review preservation: reviewed and requested stages stay closed without another deal', () => {
    for (const stage of [2, 3]) { const state = due(); absent(reload({ ...state, lifeFlags: { ...state.lifeFlags, rDocCrew: stage } })); }
  });
  it('documentary review preservation: the four existing recorded priorities stay unchanged', () => {
    const state = context(), before = reload({ ...state, lifeFlags: { esports: 1, cursedBoots: 1, teammateLoan: 1, coachingBadges: 1 },
      eventLastFired: { '226': 2025, '230': 2025, '236': 2025, '270': 2025 } });
    expect(draws([], () => L.getPriorityLifeEventIds(before)).result).toEqual([227, 231, 237, 630]);
    expect(reload(before)).toEqual(before);
  });
  it('documentary review preservation: catalog and priority reads hold the whole input and original draws', () => {
    const state = acquired(), held = JSON.stringify(state); catalog(state);
    expect(draws([], () => L.getPriorityLifeEventIds(state)).result).toEqual([]);
    expect(JSON.stringify(state)).toBe(held); expect(reload(state)).toEqual(state);
  });
  it('documentary review preservation: original producer keeps its gate and two-season cooldown', () => {
    const state = acquired(), card = producer(state), stamp = year(state);
    expect(E.eventCooldown(card)).toBe(2); expect(card.cooldown).toBeUndefined();
    for (const gap of [0, 1, 2, 3]) expect(E.isEventOnCooldown(state, card, stamp + gap)).toBe(gap <= 2);
    const low = { ...context(), overall: 77, popularity: 39 }, held = JSON.stringify(low);
    expect(draws([], () => A.getRealismEventsA(low)).result.some(event => event.id === 408)).toBe(false);
    expect(JSON.stringify(low)).toBe(held);
  });
});
