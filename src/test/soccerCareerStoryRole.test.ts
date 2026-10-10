import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { acceptLoan, acceptOffer, applyEventChoice, calcAppearances, FALLBACK_CLUBS,
  getAllEvents, manualRetire, signExtension, type CareerState, type NewsArticle, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { REDUCED_ROLE_GAMES, cancelReducedRole, queueReducedRole, readReducedRoleResult,
  reducedRoleForSeason, reducedRoleSwing, settleReducedRole } from '@/lib/soccerCareerRole';
import { personalGoalMilestone, personalGoalMilestoneNews } from '@/lib/soccerCareerMilestone';
import { managerTrust, squadNow } from '@/lib/soccerClubSquad';
import { planLine, trustLines } from '@/lib/soccerClubSquadSheet';

function career(): CareerState {
  const data = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const c = structuredClone(data.saves.find((save: { id: string }) => save.id === 'ere').state) as CareerState;
  return { ...c, age: 25, phase: 'playing', retired: false, loan: null, frozenOut: 0 };
}
function row(c: CareerState, extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return { ...c.seasons[c.seasons.length - 1], year: c.seasons[c.seasons.length - 1].year + 1,
    club: c.currentClub, type: 'playing', apps: 30, leagueApps: 30, goals: 10, injurySevere: false, ...extra };
}
function paper(headline: string, type: NewsArticle['type'] = 'positive'): NewsArticle {
  return { newspaper: 'Saved Paper', type, headline, body: 'Saved article body' };
}
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career reduced manager role', () => {
  it('queues only one next-year plan without changing completed seasons or drawing randomness', () => {
    const c = career(), before = structuredClone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('role helper must not draw'); });
    const next = queueReducedRole(c);
    expect(next.reducedRole).toEqual({ club: c.currentClub, year: c.seasons[c.seasons.length - 1].year + 1 });
    expect(queueReducedRole(next)).toBe(next);
    expect(reducedRoleSwing(next)).toBe(-REDUCED_ROLE_GAMES);
    expect(c).toEqual(before);
    expect(next.seasons).toBe(c.seasons);
    cancelReducedRole(next);
    expect(next).toEqual(c);
  });

  it('makes the actual reloaded New Manager choice queue its stated consequence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const c = career(), catalog = getAllEvents(c);
    const event = catalog.find(e => e.id === 12)!, other = catalog.find(e => e.id === 10)!;
    const input = JSON.parse(JSON.stringify({ ...c, phase: 'random_events', pendingEvents: [event, other] })) as CareerState;
    const before = structuredClone(input), next = applyEventChoice(input, 1, FALLBACK_CLUBS);
    expect(next.reducedRole).toEqual({ club: c.currentClub, year: c.seasons[c.seasons.length - 1].year + 1 });
    expect(next.morale).toBe(Math.max(0, c.morale - 10));
    expect(next.events[next.events.length - 1]).toContain('4 fewer planned league games');
    expect(next.seasons).toEqual(input.seasons);
    expect(input).toEqual(before);
    expect(reducedRoleSwing(JSON.parse(JSON.stringify(next)))).toBe(-4);
  });

  it('keeps proving yourself as the existing physical boost, without a role penalty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const c = career(), catalog = getAllEvents(c);
    c.pendingEvents = [catalog.find(e => e.id === 12)!, catalog.find(e => e.id === 10)!];
    const next = applyEventChoice(c, 0, FALLBACK_CLUBS);
    expect(next.reducedRole).toBeUndefined();
    expect(next.statBoostNextSeason.physical).toBe((c.statBoostNextSeason.physical ?? 0) + 1);
  });

  it.each(['wrong club', 'wrong year', 'fractional year', 'retired', 'loan'])('rejects an unavailable plan: %s', why => {
    const c = queueReducedRole(career());
    if (why === 'wrong club') c.reducedRole!.club = 'Another Club';
    if (why === 'wrong year') c.reducedRole!.year += 1;
    if (why === 'fractional year') c.reducedRole!.year += 0.5;
    if (why === 'retired') c.retired = true;
    if (why === 'loan') c.loan = { parentClub: 'Parent', parentTier: 1, parentLeague: 'League', parentCountry: 'England', parentColor: '#000000' };
    expect(reducedRoleForSeason(c)).toBeNull();
    expect(reducedRoleSwing(c)).toBe(0);
  });

  it('does not put the active plan on an earlier or foreign club squad', () => {
    const c = queueReducedRole(career()), at = squadNow(c)!;
    expect(managerTrust(c, { ...at, year: at.year - 1 }).roleSwing).toBe(0);
    expect(managerTrust(c, { ...at, club: 'Another Club' }).roleSwing).toBe(0);
  });

  it.each([0, 1])('reduces the actual selection before the existing frozen-out limit (%s)', frozenOut => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const c = career(); c.frozenOut = frozenOut;
    const normal = calcAppearances(c.overall, c.currentClubTier, c.age, c);
    const unfrozen = calcAppearances(c.overall, c.currentClubTier, c.age, { ...c, frozenOut: 0 });
    const held = calcAppearances(c.overall, c.currentClubTier, c.age, queueReducedRole(c));
    const reduced = Math.max(0, Math.min(38, unfrozen.leagueApps - 4));
    expect(held.leagueApps).toBe(frozenOut ? Math.min(8, Math.round(reduced * 0.25)) : reduced);
    expect(held.injured).toBe(normal.injured);
  });

  it('shows the same role range and explains it separately from the phone', () => {
    const c = queueReducedRole(career()), at = squadNow(c)!, trust = managerTrust(c, at);
    /* Release AT: Round 1185's recent form swing sits in the same sum as this round's role swing, so the
       oracle adds it too. The role still takes exactly four off whatever the rest comes to. */
    const expected = Math.max(0, Math.min(38, (trust.band.min + trust.band.max) / 2 + trust.swing + trust.form.swing - 4));
    expect(trust.expected).toBe(expected);
    expect(trust.role).toEqual(c.reducedRole);
    expect(planLine(trust)).toContain(`${Math.max(0, Math.min(38, trust.band.min + trust.swing + trust.form.swing - 4))}`);
    expect(trustLines(c, at, trust).join(' ')).toContain('4');
    const old = career();
    expect(managerTrust(old, squadNow(old)!).roleSwing).toBe(0);
  });

  it('takes a reduced lower bound below the starter-plan line without changing the old band', () => {
    const c = career(); c.overall = 75; c.currentClub = 'Arsenal'; c.currentClubTier = 1;
    c.seasons = [row(c, { year: 2026 }), row(c, { year: 2027 })];
    const neutral = managerTrust(c, squadNow(c)!), reduced = managerTrust(queueReducedRole(c), squadNow(c)!);
    expect(neutral.band.min).toBe(20); expect(neutral.inPlans).toBe(true);
    expect(reduced.band).toEqual(neutral.band); expect(reduced.inPlans).toBe(false);
  });

  it('records one served plan, consumes it and keeps older rows untouched after reload', () => {
    const c = queueReducedRole(career()), old = JSON.stringify(c.seasons), current = row(c);
    c.seasons = [...c.seasons, current];
    settleReducedRole(c, current);
    expect(current.reducedRole).toEqual({ club: c.currentClub, year: current.year, plannedReduction: 4, outcome: 'served' });
    expect(c.reducedRole).toBeUndefined(); expect(JSON.stringify(c.seasons.slice(0, -1))).toBe(old);
    const reloaded = JSON.parse(JSON.stringify(c)) as CareerState, before = structuredClone(reloaded);
    settleReducedRole(reloaded, reloaded.seasons[reloaded.seasons.length - 1]);
    expect(reloaded).toEqual(before); expect(reducedRoleSwing(reloaded)).toBe(0);
  });

  it.each([
    { apps: 0 }, { injurySevere: true }, { club: 'BANNED', apps: 0 },
    { club: 'BANNED (PED)', apps: 0 }, { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 },
  ])('ends an interrupted year without carrying the penalty (%j)', extra => {
    const c = queueReducedRole(career()), current = row(c, extra);
    settleReducedRole(c, current);
    expect(c.reducedRole).toBeUndefined(); expect(current.reducedRole?.outcome).toBe('interrupted');
    expect(readReducedRoleResult(current)).toEqual(current.reducedRole);
  });

  it('keeps an earlier year from consuming a future plan and clears a stale plan without inventing an outcome', () => {
    const c = queueReducedRole(career()), earlier = row(c, { year: c.reducedRole!.year - 1 });
    settleReducedRole(c, earlier); expect(c.reducedRole).toBeDefined(); expect(earlier.reducedRole).toBeUndefined();
    const later = row(c, { year: c.reducedRole!.year + 1 });
    settleReducedRole(c, later); expect(c.reducedRole).toBeUndefined(); expect(later.reducedRole).toBeUndefined();
  });

  it.each([{ club: 'Another Club' }, { type: 'youth' as const }, { apps: 0 }, { injurySevere: true }])(
    'does not display a forged served outcome (%j)', extra => {
      const c = career(), current = row(c, extra);
      current.reducedRole = { club: c.currentClub, year: current.year, plannedReduction: 4, outcome: 'served' };
      expect(readReducedRoleResult(current)).toBeNull();
    },
  );

  it('cancels actual transfers and loans but keeps same-club extensions', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const c = queueReducedRole(career()), destination = FALLBACK_CLUBS.find(club => club.name !== c.currentClub)!;
    const offer = { club: destination, contractYears: 3, wage: c.weeklyWage, transferFee: 0 };
    expect(acceptOffer(c, offer).reducedRole).toBeUndefined();
    expect(acceptLoan(c, { ...offer, isLoan: true }).reducedRole).toBeUndefined();
    expect(signExtension(c).reducedRole).toEqual(c.reducedRole);
    expect(manualRetire(c).reducedRole).toBeUndefined();
    expect(c.reducedRole).toBeDefined();
  });
});

describe('Soccer Career personal milestone news', () => {
  it.each([100, 200, 300, 500])('uses an actual crossing of %s, including an overshoot', threshold => {
    const c = career(), current = row(c, { goals: 12 }), previous = row(c, { year: current.year - 1, goals: threshold - 5 });
    expect(personalGoalMilestone([previous, current], current)).toEqual({ threshold, previous: threshold - 5, total: threshold + 7 });
  });

  it('uses the highest crossed mark and excludes academy, jobs, absent years and future rows', () => {
    const c = career(), current = row(c, { goals: 220 }), previous = row(c, { year: current.year - 1, goals: 90 });
    const excluded = [row(c, { year: current.year - 2, goals: 200, type: 'youth' }),
      row(c, { year: current.year - 2, goals: 200, type: 'manager' }),
      row(c, { year: current.year - 2, goals: 200, apps: 0 }),
      row(c, { year: current.year + 1, goals: 200 })];
    expect(personalGoalMilestone([previous, ...excluded, current], current)).toEqual({ threshold: 300, previous: 90, total: 310 });
  });

  it('does not repeat an already passed mark or make up missing/ambiguous history', () => {
    const c = career(), current = row(c, { goals: 0 }), previous = row(c, { year: current.year - 1, goals: 100 });
    expect(personalGoalMilestone([previous, current], current)).toBeNull();
    expect(personalGoalMilestone([previous], current)).toBeNull();
    expect(personalGoalMilestone([previous, current, { ...current }], current)).toBeNull();
    expect(personalGoalMilestone([{ ...previous, goals: Number.NaN }, current], current)).toBeNull();
  });

  it('uses the drawn performance story paper while preserving the critic, input and random stream', () => {
    const c = career(), current = row(c, { goals: 12 }); c.seasons = [row(c, { year: current.year - 1, goals: 95 }), current];
    const held = [paper('The saved critic column', 'negative'), paper(`${c.playerName} Silences Critics With Stunning Performance`)];
    const before = structuredClone({ c, held });
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('milestone must not draw'); });
    const news = personalGoalMilestoneNews(held, c, current, 'Fallback Paper');
    expect(news).toHaveLength(2); expect(news[0]).toEqual(held[0]);
    expect(news[1]).toMatchObject({ newspaper: 'Saved Paper', type: 'milestone', headline: `${c.playerName} Reaches 100 Senior Club Goals` });
    expect(news[1].body).toContain('from 95 to 107'); expect(news[1].body).toContain('12 club goals');
    expect({ c, held }).toEqual(before);
  });

  it.each(['Recorded Career Goal Tally', 'Saved Career Goal Total'])('uses an exact senior mark in the truthful legacy %s slot', label => {
    const c = career(), current = row(c, { goals: 5 }); c.seasons = [row(c, { year: current.year - 1, goals: 95 }), current];
    const held = [paper(`${c.playerName}'s ${label} Reaches 100`)];
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('milestone must not draw'); });
    const news = personalGoalMilestoneNews(held, c, current, 'Fallback Paper');
    expect(news).toHaveLength(1);
    expect(news[0]).toMatchObject({ newspaper: 'Saved Paper', headline: `${c.playerName} Reaches 100 Senior Club Goals` });
    expect(news[0].body).toContain('from 95 to 100');
  });

  it.each(['Won an award', 'GUILTY: prison', 'DONE DEAL: moved clubs', 'Ballon result'])('preserves a full critic and key story pair (%s)', headline => {
    const c = career(), current = row(c, { goals: 12 }); c.seasons = [row(c, { year: current.year - 1, goals: 95 }), current];
    const held = [paper('Saved critic column', 'negative'), paper(headline)];
    expect(personalGoalMilestoneNews(held, c, current, 'Fallback Paper')).toBe(held);
  });

  it('can use spare space without changing an existing key story', () => {
    const c = career(), current = row(c, { goals: 12 }); c.seasons = [row(c, { year: current.year - 1, goals: 95 }), current];
    const held = [paper('Saved award result')], news = personalGoalMilestoneNews(held, c, current, 'Fallback Paper');
    expect(news).toHaveLength(2); expect(news[0]).toBe(held[0]); expect(news[1].headline).toContain('100 Senior Club Goals');
    expect(personalGoalMilestoneNews([], c, current, 'Fallback Paper')[0].newspaper).toBe('Fallback Paper');
  });
});
