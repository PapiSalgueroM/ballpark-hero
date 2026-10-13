/**
 * Round 1327: Soccer Career's event deck keeps its word and deals fairly.
 *
 * The deck's pick is the shared takeFresh on a stream keyed to the career and
 * the season, so the same key deals the same batch; the cards that narrate the
 * season are dealt only when the row holds it; the three follower promises the
 * hunt found broken now land; and a card 17 still on screen in an older save
 * records the debut the way the season's own call up does.
 * scripts/simSoccerDeckFairness.mjs and scripts/simSoccerEventPromises.mjs
 * measure the same things at scale.
 */
import { describe, it, expect } from 'vitest';
import {
  initCareer, applyEventChoice, getAllEvents, repairCareer, FALLBACK_CLUBS,
  drawEventBatch, cardFitsSeason, soccerDeckIdentity, tournamentForYear,
  type CareerState, type SeasonRecord,
} from '@/lib/soccerCareerEngine';

const stats = (v: number) => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v } as unknown as Parameters<typeof initCareer>[4]);

const row = (over: Partial<SeasonRecord> = {}): SeasonRecord => ({
  year: 2026, age: 24, club: FALLBACK_CLUBS[0].name, clubCountry: FALLBACK_CLUBS[0].country, clubTier: FALLBACK_CLUBS[0].tier,
  apps: 30, leagueApps: 28, goals: 0, assists: 2, cleanSheets: 0, yellowCards: 1, redCards: 0, rating: 6.8,
  injury: null, injuryWeeks: 0, injurySevere: false, leagueTitle: false, domesticCup: false, championsLeague: false,
  worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
  intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...over,
} as SeasonRecord);

function career(seasons: SeasonRecord[], over: Partial<CareerState> = {}): CareerState {
  const s = initCareer('Deck Test', 'England', 'ST', '2020s', stats(70), 70, 2020, FALLBACK_CLUBS, null, 85);
  return { ...s, phase: 'playing', age: 24, currentClub: FALLBACK_CLUBS[0].name, currentClubTier: FALLBACK_CLUBS[0].tier,
    currentClubCountry: FALLBACK_CLUBS[0].country, seasons, ...over } as CareerState;
}

describe('the keyed deck', () => {
  const eligible = getAllEvents(career([row()])).filter(e => e.id > 40);

  it('deals the same batch for the same key, two to four distinct cards', () => {
    const key = `${soccerDeckIdentity(career([row()]))}|2026|deck`;
    const a = drawEventBatch(eligible, key).map(e => e.id);
    const b = drawEventBatch(eligible, key).map(e => e.id);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.length).toBeLessThanOrEqual(4);
    expect(new Set(a).size).toBe(a.length);
  });

  it('deals other batches for other careers and other seasons', () => {
    const batches = new Set<string>();
    for (let i = 0; i < 20; i += 1) batches.add(drawEventBatch(eligible, `Player ${i}|2020s|England|ST|${2026 + (i % 3)}|deck`).map(e => e.id).join(','));
    expect(batches.size).toBeGreaterThan(15);
  });
});

describe('cards that narrate the season need the row to hold it', () => {
  it('1 and 7 need goals', () => {
    expect(cardFitsSeason(1, career([row({ goals: 0 })]))).toBe(false);
    expect(cardFitsSeason(1, career([row({ goals: 3 })]))).toBe(true);
    expect(cardFitsSeason(7, career([row({ goals: 0 })]))).toBe(false);
    expect(cardFitsSeason(7, career([row({ goals: 1 })]))).toBe(true);
  });
  it('7 needs a season the Puskas Award existed for (first given in 2009, for 2008/09)', () => {
    expect(cardFitsSeason(7, career([row({ year: 2005, goals: 6 })]))).toBe(false);
    expect(cardFitsSeason(7, career([row({ year: 2007, goals: 6 })]))).toBe(false);
    expect(cardFitsSeason(7, career([row({ year: 2008, goals: 6 })]))).toBe(true);
    expect(cardFitsSeason(1, career([row({ year: 2005, goals: 6 })]))).toBe(true);
  });
  it('4 needs a Player of the Month award in the row\'s year', () => {
    expect(cardFitsSeason(4, career([row()], { awards: [] }))).toBe(false);
    expect(cardFitsSeason(4, career([row()], { awards: [{ year: 2025, name: 'Player of the Month', emoji: '🏆' }] }))).toBe(false);
    expect(cardFitsSeason(4, career([row()], { awards: [{ year: 2026, name: 'Player of the Month', emoji: '🏆' }] }))).toBe(true);
  });
  it('9 needs a red card, 11 an injury', () => {
    expect(cardFitsSeason(9, career([row()]))).toBe(false);
    expect(cardFitsSeason(9, career([row({ redCards: 1 })]))).toBe(true);
    expect(cardFitsSeason(11, career([row()]))).toBe(false);
    expect(cardFitsSeason(11, career([row({ injury: 'Hamstring tear', injuryWeeks: 6 })]))).toBe(true);
  });
  it('12 needs a verified bottom third finish, 15 under half a season of league games', () => {
    expect(cardFitsSeason(12, career([row()]))).toBe(false);
    expect(cardFitsSeason(12, career([row({ leagueFinish: 10, leagueSize: 20 })]))).toBe(false);
    expect(cardFitsSeason(12, career([row({ leagueFinish: 17, leagueSize: 20 })]))).toBe(true);
    expect(cardFitsSeason(15, career([row({ leagueApps: 25 })]))).toBe(false);
    expect(cardFitsSeason(15, career([row({ leagueApps: 12 })]))).toBe(true);
  });
  it('17 is never dealt; 18 needs a first season of caps with a goal', () => {
    expect(cardFitsSeason(17, career([row()], { internationalCareer: false }))).toBe(false);
    expect(cardFitsSeason(18, career([row({ intApps: 4, intGoals: 0 })]))).toBe(false);
    expect(cardFitsSeason(18, career([row({ year: 2025, intApps: 2 }), row({ intApps: 4, intGoals: 1 })]))).toBe(false);
    expect(cardFitsSeason(18, career([row({ year: 2025 }), row({ intApps: 4, intGoals: 1 })]))).toBe(true);
  });
  it('19 needs a World Cup his nation plays and a row that says he was not picked', () => {
    const year = [2026, 2030, 2034].find(y => tournamentForYear('England', y)?.kind === 'World Cup')!;
    const wc = tournamentForYear('England', year)!;
    expect(cardFitsSeason(19, career([row({ year, tournament: wc.name, tournamentResult: 'Group Stage' })]))).toBe(false);
    expect(cardFitsSeason(19, career([row({ year, tournament: wc.name, tournamentResult: 'Not Selected' })]))).toBe(true);
  });
  it('a season that is not a playing season deals none of them, and other cards are untouched', () => {
    expect(cardFitsSeason(1, career([row({ goals: 5, type: 'youth' })]))).toBe(false);
    expect(cardFitsSeason(1, career([]))).toBe(false);
    expect(cardFitsSeason(5, career([]))).toBe(true);
  });
});

describe('the follower promises', () => {
  const s = career([row({ goals: 4, intApps: 3, intGoals: 1 })], { socialMediaFollowers: 2 });
  const choice = (id: number) => getAllEvents(s).find(e => e.id === id)!.choices[0];
  it.each([[1, 0.05], [7, 0.1], [18, 0.075]])('card %i adds the followers it prints', (id, gain) => {
    const after = choice(id).apply({ ...s, events: [...s.events] });
    expect(after.socialMediaFollowers - 2).toBeCloseTo(gain, 9);
  });
});

describe('card 11 names the row\'s injury', () => {
  it.each([
    ['MCL sprain', 'Your MCL sprain this season', 'Took time to recover from an MCL sprain'],
    ['Achilles tendon rupture', 'Your Achilles tendon rupture this season', 'Took time to recover from an Achilles tendon rupture'],
    ['Twisted ankle', 'Your twisted ankle this season', 'Took time to recover from a twisted ankle'],
  ])('%s on its face and in the log line its first choice writes', (injury, face, log) => {
    const s = career([row({ injury, injuryWeeks: 3 })]);
    const card = getAllEvents(s).find(e => e.id === 11)!;
    expect(card.description).toContain(face);
    const after = card.choices[0].apply({ ...s, events: [...s.events] });
    const line = after.events[after.events.length - 1];
    expect(line).toContain(log);
    expect(line).not.toMatch(/hamstring/i);
  });
});

describe('an older save with card 17 on screen', () => {
  it('answers it and records the debut the way the season\'s call up does', () => {
    const s = career([row({ year: 2026 })], { internationalCareer: false, age: 23 });
    const card = getAllEvents(s).find(e => e.id === 17)!;
    const saved = repairCareer(JSON.parse(JSON.stringify({ ...s, phase: 'random_events', pendingEvents: [card] })) as CareerState);
    const after = applyEventChoice(saved, 0, FALLBACK_CLUBS);
    expect(after.internationalCareer).toBe(true);
    expect(after.intStats.debutYear).toBe(2026);
    expect(after.intStats.debutAge).toBe(23);
    expect(after.pendingEvents.length).toBe(0);
  });
});
