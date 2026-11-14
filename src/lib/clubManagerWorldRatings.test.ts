import { describe, expect, it, vi } from 'vitest';
import { ensureEraRosters, projectedRoster, projectedRosterAtProgress, type ProjectedPlayer } from '@/lib/clubManagerEras';
import { buildMarket, buyPlayer, freeAgentsAtCurrentRatings, loanIn, marketForScreen, oppRosterFor, oppStrengthVsMe, playNextEntry, recordAiDeals,
  refreshWorldRoster, startCareer, startNextSeason, summerFreeAgents, worldRosterFor, type CareerState } from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';
import { joinClubNow, startMidSeason } from '@/lib/clubManagerCalendar';
import { emptyJobHunt } from '@/lib/clubManagerJobHunt';
import { keyedRng } from '@/lib/keyedRng';

const identity = (p: ProjectedPlayer, year: number) => JSON.stringify([p.n, p.p, year - p.a, p.since]);

describe('Club Manager projected opponent ratings', () => {
  it.each([
    ['now', 'Arsenal'],
    ['era2010', 'Barcelona'],
  ])('spends the existing %s rating change in the closing season', async (era, club) => {
    await ensureEraRosters(era);
    const seed = 17;
    const original = projectedRoster(club, 0, era, seed);
    const next = projectedRoster(club, 1, era, seed);
    expect(original).not.toHaveLength(0);
    expect(projectedRosterAtProgress(club, 0, era, seed, 0)).toBe(original);
    const last = new Map(next.map(p => [identity(p, 1), p]));
    const layers = Array.from({ length: 39 }, (_, index) => projectedRosterAtProgress(club, 0, era, seed, index / 38));
    let up = 0;
    let down = 0;
    for (const [index, opening] of original.entries()) {
      const final = last.get(identity(opening, 0));
      const values = layers.map(rows => rows[index]);
      const ratings = values.map(p => p.r);
      expect(values.map(p => [p.n, p.p, p.a, p.since, p.lv, p.g, p.worldRosterKey, p.anchor]))
        .toEqual(values.map(() => [opening.n, opening.p, opening.a, opening.since, opening.lv, opening.g, opening.worldRosterKey, opening.anchor]));
      if (!final) {
        expect(ratings.every(rating => rating === opening.r)).toBe(true);
        continue;
      }
      const delta = final.r - opening.r;
      expect(ratings.at(-1)).toBe(final.r);
      for (let point = 1; point < ratings.length; point++) {
        const change = ratings[point] - ratings[point - 1];
        expect(change === 0 || change === Math.sign(delta)).toBe(true);
      }
      if (delta > 0) up++;
      else if (delta < 0) down++;
    }
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
    expect(projectedRoster(club, 0, era, seed)).toBe(original);
    expect(projectedRosterAtProgress(club, 1, era, seed, 0)).toBe(next);
  });

  it('shares effective rows and XI strength between roster, opponent and transfer market', () => {
    const plain = startCareer('Everton', 'now', undefined, undefined, undefined, null, { inSeasonRatings: true });
    const club = 'Arsenal';
    const opening = worldRosterFor(plain, club);
    const finished = {
      ...plain,
      worldRatingSeason: plain.season,
      week: plain.calendar.length,
    };
    const roster = worldRosterFor(finished, club);
    const squad = oppRosterFor(finished, club);
    const before = new Map(opening.map(p => [p.n, p]));
    const market = new Map(marketForScreen(finished).filter(p => p.club === club).map(p => [p.name, p]));
    const agreeing = roster.filter(p => p.r !== before.get(p.n)?.r && market.has(p.n) && squad.some(q => q.n === p.n));
    expect(agreeing.length).toBeGreaterThan(0);
    for (const p of agreeing) {
      expect(market.get(p.n)).toMatchObject({ rating: p.r, value: p.v });
      expect(squad.find(q => q.n === p.n)?.r).toBe(p.r);
    }
    const xi = (rows: ProjectedPlayer[]) => Math.round(rows.map(p => p.r).sort((a, b) => b - a).slice(0, 11).reduce((sum, r) => sum + r, 0) * 10 / 11) / 10;
    const expectedDelta = xi(roster) - xi(opening);
    expect(expectedDelta).not.toBe(0);
    expect(oppStrengthVsMe(finished, club)).toBeCloseTo(oppStrengthVsMe(plain, club) + expectedDelta, 9);
    expect(worldRosterFor({ ...finished, worldRatingSeason: undefined }, club)).toEqual(opening);
    const selected = agreeing[0];
    const fromOpening = buildMarket(plain).find(p => p.club === club && p.name === selected.n);
    if (fromOpening) expect(fromOpening.rating).toBe(before.get(selected.n)?.r);
  });

  it('keeps a projected grade on an AI transfer through the summer without a second rating step', () => {
    const plain = startCareer('Everton', 'now', undefined, undefined, undefined, null, { inSeasonRatings: true });
    const opening = { ...plain, worldSeed: 17, worldRatingSeason: plain.season };
    const seller = 'Arsenal', buyer = 'Liverpool';
    const expected = worldRosterFor({ ...opening, week: opening.calendar.length }, seller);
    const candidate = buildMarket(opening).find(p => p.club === seller && expected.some(row => row.n === p.name && row.r !== p.rating))!;
    const final = expected.find(p => p.n === candidate.name)!;
    const moved = recordAiDeals(opening, [{ mp: candidate, to: buyer, fee: candidate.price }]);
    expect(moved).not.toBe(opening);
    expect(worldRosterFor(moved, seller).some(p => p.n === candidate.name)).toBe(false);
    expect(worldRosterFor(moved, buyer).find(p => p.n === candidate.name)?.r).toBe(candidate.rating);
    const finished = { ...moved, week: opening.calendar.length };
    expect(worldRosterFor(finished, buyer).find(p => p.n === candidate.name)).toMatchObject({ r: final.r, v: final.v, a: candidate.age });
    const saved = JSON.parse(JSON.stringify(finished));
    expect(worldRosterFor(saved, buyer)).toEqual(worldRosterFor(finished, buyer));
    const next = refreshWorldRoster({ ...saved, season: saved.season + 1, week: 0 });
    const record = readWorldRoster(next)?.records.find(p => p.origin.name === candidate.name);
    expect(record?.player).toMatchObject({ rating: final.r, age: candidate.age + 1 });
    expect(record?.player.worldRatingForecast).toBeUndefined();
  });

  it('uses the same closing OVR for pre-existing ledger owners and unattached players before and after aging', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('known neutral rating movers'));
    let plain: CareerState;
    try { plain = { ...startCareer('Everton', 'now', undefined, undefined, undefined, null, { inSeasonRatings: true }), worldSeed: 17 }; }
    finally { random.mockRestore(); }
    const signed = buildMarket(plain).filter(p => p.club !== 'Liverpool' && p.age >= 30 && p.age <= 31).slice(0, 12);
    const ledger = recordAiDeals(plain, signed.map(mp => ({ mp, to: 'Liverpool', fee: mp.price })));
    const opening: CareerState = { ...ledger, worldRatingSeason: ledger.season,
      freeAgents: [{ name: 'Synthetic veteran', position: 'ST', age: 35, rating: 79, value: 4, since: 1, reason: 'unattached' }] };
    const late = { ...opening, week: opening.calendar.length };
    const entered = readWorldRoster(opening)?.records.filter(r => signed.some(p => p.name === r.origin.name)) ?? [];
    expect(entered.length).toBeGreaterThan(2);
    const future = refreshWorldRoster({ ...late, week: 0, season: late.season + 1 });
    const next = new Map(readWorldRoster(future)?.records.map(record => [record.key, record]));
    const now = new Map(worldRosterFor(late, 'Liverpool').map(player => [player.worldRosterKey, player]));
    const retained = entered.filter(r => next.get(r.key)?.status === 'owned');
    expect(retained.length).toBeGreaterThan(0);
    expect(retained.some(r => now.get(r.key)?.r !== r.player.rating)).toBe(true);
    for (const r of retained) {
      expect(now.get(r.key)?.r).toBe(next.get(r.key)?.player.rating);
      expect(next.get(r.key)?.player.age).toBe(r.player.age + 1);
    }
    const [agent] = freeAgentsAtCurrentRatings(late);
    expect(agent.rating).toBeLessThan(opening.freeAgents![0].rating);
    const summer = summerFreeAgents(late);
    expect([...summer.pool, ...summer.retired][0]).toMatchObject({ rating: agent.rating, age: agent.age + 1 });
  });

  it('plays a season through the normal match reducer, preserves ratings over summer and excludes daily starts', () => {
    const rng = vi.spyOn(Math, 'random').mockImplementation(keyedRng('world timing full season'));
    try {
      const options = { inSeasonRatings: true, worldRatingTiming: true } as const;
      const daily = startCareer('Everton', 'now', undefined, undefined, undefined, null, { ...options, noWorldComps: true });
      expect(daily.worldRatingSeason).toBeUndefined();
      const opening = startCareer('Everton', 'now', undefined, undefined, undefined, null, options);
      const inherited = startMidSeason(opening, 'newYear');
      expect(inherited.worldRatingFloor).toBeGreaterThan(0);
      expect(inherited.squad.every(p => p.seasonRatingCredit === undefined)).toBe(true);
      let state = opening;
      let games = 0;
      const club = 'Arsenal';
      const first = new Map(worldRosterFor(state, club).map(p => [identity(p, 0), p.r]));
      for (let i = 0; i < 90; i++) {
        const result = playNextEntry(state, { skipHalftime: true });
        state = result.state;
        if (result.kind === 'seasonOver') break;
        if (result.kind === 'match') games++;
      }
      expect(games).toBeGreaterThanOrEqual(38);
      const closing = worldRosterFor(state, club);
      expect(closing.some(p => first.has(identity(p, 0)) && first.get(identity(p, 0)) !== p.r)).toBe(true);
      const next = startNextSeason(state);
      expect(next.worldRatingSeason).toBe(opening.season + 1);
      const rollover = new Map(worldRosterFor(next, club).map(p => [identity(p, 1), p.r]));
      const retained = closing.filter(p => rollover.has(identity(p, 0)));
      expect(retained.length).toBeGreaterThan(8);
      for (const p of retained) expect(rollover.get(identity(p, 0))).toBe(p.r);
      const oldClub = state.clubName;
      const untracked = state.squad.find(p => !p.onLoan && !p.worldRosterKey && p.age < 29
        && worldRosterFor(state, oldClub).some(q => q.n === p.name && q.p === p.position && q.a === p.age))!;
      expect(untracked).toBeDefined();
      const raised = { ...state, squad: state.squad.map(p => p === untracked ? { ...p, rating: p.rating + 1 } : p) };
      const switched = startNextSeason(raised, 'Lyon');
      expect(switched.clubName).toBe('Lyon');
      expect(worldRosterFor(switched, oldClub).some(p => p.n === untracked.name && p.r === untracked.rating + 1 && p.a === untracked.age + 1)).toBe(true);
    } finally {
      rng.mockRestore();
    }
  }, 20_000);

  it('keeps the world clock and moves a January signing to managed credit at his current rating', () => {
    const rng = vi.spyOn(Math, 'random').mockImplementation(keyedRng('world timing January purchase'));
    try {
      const options = { inSeasonRatings: true, worldRatingTiming: true } as const;
      const opening = startCareer('Everton', 'now', undefined, undefined, undefined, null, options);
      let state = startMidSeason(opening, 'newYear');
      for (let step = 0; step < 12 && state.transferWindow !== 'january'; step++) state = playNextEntry(state, { skipHalftime: true }).state;
      expect(state.transferWindow).toBe('january');
      const grades = new Map(buildMarket(opening).map(p => [p.name, p.rating]));
      const candidate = buildMarket(state).find(p => p.age <= 22 && p.rating > (grades.get(p.name) ?? Infinity))!;
      expect(candidate).toBeDefined();
      const bought = buyPlayer({ ...state, budget: 9999, wageCap: 9999, squad: state.squad.slice(0, 26) }, candidate)!;
      const player = bought.squad.find(p => p.name === candidate.name)!;
      expect(player).toMatchObject({ rating: candidate.rating, age: candidate.age });
      expect(player.seasonRatingCredit).toBeUndefined();
      let after = bought;
      while (after.squad.find(p => p.id === player.id)?.seasonRatingCredit === undefined && after.week - bought.week < 6) {
        after = playNextEntry(after, { skipHalftime: true }).state;
      }
      expect(after.squad.find(p => p.id === player.id)?.seasonRatingCredit?.[0]).toBe(state.season);
      expect(Math.abs(after.squad.find(p => p.id === player.id)!.rating - player.rating)).toBeLessThanOrEqual(1);
      const original = worldRosterFor(after, after.clubName).find(p => after.squad.some(q => q.name === p.n && !q.onLoan))!;
      const bumped = Math.min(99, original.r + 1);
      const departed = { ...after, worldRatingFloor: 0.71,
        squad: after.squad.map(p => p.name === original.n ? { ...p, rating: bumped } : p) };
      const inFrance = joinClubNow({
        ...departed, sacked: false,
        jobHunt: {
          ...emptyJobHunt(departed.season),
          open: { club: 'Lyon', league: 'Ligue 1', tier: 2, season: departed.season, week: departed.week, matchesLeft: 0, roll: 0, status: 'accepted' },
        },
      })!;
      expect(inFrance.clubName).toBe('Lyon');
      expect(inFrance.leagueClubs.length).not.toBe(departed.leagueClubs.length);
      expect(inFrance.worldRatingFloor).toBeGreaterThanOrEqual(0.71);
      expect(inFrance.squad.every(p => p.seasonRatingCredit === undefined)).toBe(true);
      expect(worldRosterFor(inFrance, 'Everton').find(p => p.n === player.name)?.r).toBe(after.squad.find(p => p.id === player.id)?.rating);
      expect(worldRosterFor(inFrance, 'Everton').find(p => p.n === original.n)?.r).toBe(bumped);
      const ai = worldRosterFor({ ...inFrance, clubName: '' }, 'Lyon');
      const inherited = inFrance.squad.filter(p => ai.some(q => q.n === p.name && q.p === p.position && q.a === p.age));
      expect(inherited.length).toBeGreaterThan(12);
      for (const p of inherited) expect(p.rating).toBe(ai.find(q => q.n === p.name && q.p === p.position && q.a === p.age)?.r);
    } finally {
      rng.mockRestore();
    }
  }, 20_000);

  it('carries one rating through a loan period without changing the original owner', () => {
    const rng = vi.spyOn(Math, 'random').mockImplementation(keyedRng('world timing loan'));
    try {
      const state = startCareer('Everton', 'now', undefined, undefined, undefined, null,
        { inSeasonRatings: true, worldRatingTiming: true });
      const usable = { ...state, budget: 9999, wageCap: 9999 };
      const market = buildMarket(usable);
      const future = { ...usable, week: usable.calendar.length };
      const options = market.filter(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK');
      const candidate = options.find(p => worldRosterFor(future, p.club).find(q => q.n === p.name)?.r !== p.rating)!;
      expect(candidate).toBeDefined();
      let loaned = loanIn(usable, candidate)!;
      expect(loaned).not.toBeNull();
      const initial = loaned.squad.find(p => p.name === candidate.name)!;
      expect(initial).toMatchObject({ rating: candidate.rating, onLoan: true });
      let changed = false;
      for (let i = 0; i < 55; i++) {
        const result = playNextEntry(loaned, { skipHalftime: true });
        loaned = result.state;
        const player = loaned.squad.find(p => p.id === initial.id);
        if (!player || result.kind === 'seasonOver') break;
        const parent = worldRosterFor(loaned, candidate.club).find(p => p.n === candidate.name);
        expect(parent?.r).toBe(player.rating);
        expect(player.seasonRatingCredit).toBeUndefined();
        if (player.rating !== initial.rating) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
      expect(readWorldRoster(loaned)?.records.some(r => r.origin.name === candidate.name && r.owner === loaned.clubName)).toBe(false);
    } finally {
      rng.mockRestore();
    }
  }, 20_000);
});
