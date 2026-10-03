/**
 * Round 944: the development tier and the waiver wire, rule by rule on small
 * hand built clubs. scripts/simGmFarm.mjs runs the same module on leagues the
 * four real engines build, over ten seasons; this file pins each rule alone.
 */
import { describe, expect, it } from 'vitest';
import {
  FARM_RULES, type FarmCtx, type FarmMan, type FarmSeat, type FarmSport, type FarmClub,
  activeCount, afterRound, callUpRefusal, canClaim, coverInjuries, farmCapBreaches, farmOffseason,
  loadFarmState, newFarmState, nhlExemption, nhlExempt, placeDraftee, sendDown, sendDownRefusal, waive,
  TIER_GROWTH_BONUS, MLB_OFF40_CAP, rivalSignings, stockTier, closeSeason, farmSendDownButton, farmCallUpButton,
} from './gmFarm';
import { claimOrder, waiverReturnRefusal } from './gmWaivers';

let n = 0;
const man = (pos: string, ovr: number, extra: Partial<FarmMan> = {}): FarmMan => ({
  id: `t${++n}`, name: `Test Man ${n}`, pos, age: 24, ovr, pot: ovr, salary: 1, years: 2, out: 0, ...extra,
});
const club = (sport: FarmSport): FarmClub => (sport === 'nfl' ? { ledger: {}, lost: [], up: [] } : { reserve: [], ledger: {}, lost: [], up: [] });
const seat = (sport: FarmSport, abbr: string, players: FarmMan[], reserve: FarmMan[] = [], wins = 0, losses = 0): FarmSeat => {
  const c = club(sport);
  return { abbr, players, reserve: sport === 'nfl' ? reserve : (c.reserve = reserve), club: c, wins, losses };
};
const ctxOf = (sport: FarmSport, seats: FarmSeat[], max: number, season = 2026): FarmCtx => ({
  rules: FARM_RULES[sport], seats, activeMax: () => max, pool: [], season, events: [],
});
const ones = () => 0;

describe('the rules are data with two sources', () => {
  it('every number the brief names carries two dated sources', () => {
    const numeric: [FarmSport, string][] = [
      ['nfl', 'tierCap'], ['nfl', 'elevationsPerSeason'], ['nfl', 'elevationsPerGame'], ['nba', 'tierCap'], ['nba', 'twoWayGames'],
      ['mlb', 'fortyMan'], ['mlb', 'activeMax'], ['mlb', 'septemberActiveMax'], ['mlb', 'optionYears'], ['nhl', 'contractLimit'], ['nhl', 'exemption'],
      ['nba', 'standardMax'],
      /* "Worst record first" is a rule the player reads on the waivers button, so it carries two sources too. */
      ['nfl', 'claimOrder'], ['nba', 'claimOrder'], ['mlb', 'claimOrder'], ['nhl', 'claimOrder'],
    ];
    for (const [s, k] of numeric) {
      const list = FARM_RULES[s].sources[k];
      expect(list?.length, `${s} ${k}`).toBeGreaterThanOrEqual(2);
      /* An archived page counts as the site it archived. */
      const host = (u: string) => new URL(u.replace(/^https:\/\/web\.archive\.org\/web\/[^/]+\//, '')).hostname;
      expect(new Set(list.map(x => host(x.url))).size, `${s} ${k} two hosts`).toBe(2);
      for (const x of list) expect(x.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect([FARM_RULES.nfl.tierCap, FARM_RULES.nfl.elevationsPerSeason, FARM_RULES.nba.tierCap, FARM_RULES.nba.twoWayGames, FARM_RULES.nba.standardMax]).toEqual([16, 3, 3, 50, 15]);
    expect([FARM_RULES.nfl.claimBasis, FARM_RULES.nba.claimBasis, FARM_RULES.mlb.claimBasis, FARM_RULES.nhl.claimBasis]).toEqual(['winPct', 'winPct', 'winPct', 'pointsPct']);
    expect([FARM_RULES.mlb.fortyMan, FARM_RULES.mlb.activeMax, FARM_RULES.mlb.septemberActiveMax, FARM_RULES.mlb.optionYears, FARM_RULES.nhl.contractLimit]).toEqual([40, 26, 28, 3, 50]);
  });

  it('the NHL exemption table reads as Article 13.4', () => {
    expect(nhlExemption(18, false)).toEqual([5, 160]);
    expect(nhlExemption(21, false)).toEqual([3, 80]);
    expect(nhlExemption(22, false)).toEqual([3, 70]);
    expect(nhlExemption(18, true)).toEqual([6, 80]);
    expect(nhlExemption(24, true)).toEqual([2, 60]);
    expect(nhlExemption(29, false)).toEqual([1, Infinity]);
  });
});

describe('the waiver wire', () => {
  it('offers a man worst record first and never to his own club', () => {
    const clubs = [{ abbr: 'A', wins: 9, losses: 1 }, { abbr: 'B', wins: 2, losses: 8 }, { abbr: 'C', wins: 5, losses: 5 }, { abbr: 'D', wins: 2, losses: 8 }];
    expect(claimOrder(clubs, 'C').map(c => c.abbr)).toEqual(['B', 'D', 'A']);
  });

  it('a claimed man goes to the first club that wants him and never comes back', () => {
    const out = man('SP', 80, { age: 30 });
    const from = seat('mlb', 'FRM', [man('SP', 70)], [], 8, 2);
    const worst = seat('mlb', 'WST', [man('SP', 60)], [], 1, 9);
    const mid = seat('mlb', 'MID', [man('SP', 60)], [], 5, 5);
    const ctx = ctxOf('mlb', [from, worst, mid], 26);
    expect(waive(ctx, from, out)).toBe('claimed');
    expect(worst.players.map(p => p.id)).toContain(out.id);
    expect(from.club.lost).toEqual([out.id]);
    expect(waiverReturnRefusal(from.club.lost, out.id)).toMatch(/not loans/);
    expect(canClaim(ctx, from, out, false)).toBe(false);
  });

  it('a man nobody wants clears to the minors off the 40 man', () => {
    const out = man('SP', 50, { age: 30 });
    const from = seat('mlb', 'FRM', [man('SP', 70)]);
    const other = seat('mlb', 'OTH', [man('SP', 75)]);
    const ctx = ctxOf('mlb', [from, other], 26);
    expect(waive(ctx, from, out)).toBe('cleared');
    expect(from.reserve.map(p => p.id)).toEqual([out.id]);
    expect(from.club.ledger[out.id].off40).toBe(true);
    expect(from.club.lost).toEqual([]);
  });
});

describe('sending a man down', () => {
  it('MLB spends one option year a season and designates a man out of options', () => {
    const kid = man('RP', 70, { age: 23 });
    const s = seat('mlb', 'AAA', [kid, man('RP', 72)]);
    const rival = seat('mlb', 'BBB', [man('RP', 90)]);
    for (let season = 2026; season < 2029; season += 1) {
      const ctx = ctxOf('mlb', [s, rival], 26, season);
      expect(sendDown(ctx, s, kid.id)).toBe('option');
      s.players.push(s.reserve.splice(s.reserve.indexOf(kid), 1)[0]);
      expect(sendDown(ctx, s, kid.id), 'a second send down the same season is free').toBe('option');
      s.players.push(s.reserve.splice(s.reserve.indexOf(kid), 1)[0]);
    }
    expect(s.club.ledger[kid.id].optUsed).toBe(3);
    const ctx = ctxOf('mlb', [s, rival], 26, 2029);
    expect(sendDown(ctx, s, kid.id), 'out of options he is exposed and nobody better needs him').toBe('cleared');
    expect(s.club.ledger[kid.id].off40).toBe(true);
  });

  it('the NHL sends an exempt man straight down and exposes a veteran', () => {
    const kid = man('C', 70, { age: 20 });
    const vet = man('C', 71, { age: 29 });
    const s = seat('nhl', 'AAA', [kid, vet, man('C', 60)], [], 9, 1);
    const needy = seat('nhl', 'BBB', [man('C', 55)], [], 1, 9);
    s.club.ledger[kid.id] = { signedAge: 20, proSeasons: 1, nhlGames: 10 };
    const ctx = ctxOf('nhl', [s, needy], 15);
    expect(sendDown(ctx, s, kid.id)).toBe('exempt');
    expect(sendDown(ctx, s, vet.id)).toBe('claimed');
    expect(needy.players.map(p => p.id)).toContain(vet.id);
    expect(s.club.lost).toEqual([vet.id]);
  });

  it('past 160 NHL games a man signed at 18 needs waivers', () => {
    const kid = man('W', 70, { age: 21 });
    const s = seat('nhl', 'AAA', [kid]);
    s.club.ledger[kid.id] = { signedAge: 18, proSeasons: 3, nhlGames: 160 };
    const ctx = ctxOf('nhl', [s, seat('nhl', 'BBB', [man('W', 90)])], 15);
    expect(sendDown(ctx, s, kid.id)).toBe('cleared');
  });

  it('the NBA keeps a standard contract with the big club', () => {
    const s = seat('nba', 'AAA', [man('G', 70)]);
    expect(sendDownRefusal(ctxOf('nba', [s], 15), s, s.players[0].id)).toMatch(/two way/);
  });
});

describe('covering an injury from the tier', () => {
  it('the NFL elevates a squad man three times a season, two a game, and invents nobody', () => {
    const hurt = [man('WR', 80, { out: 3 }), man('WR', 79, { out: 3 }), man('WR', 78, { out: 3 })];
    const ps = [man('WR', 60), man('WR', 61), man('WR', 62)];
    const s = seat('nfl', 'AAA', [...hurt], [...ps]);
    const ids = () => new Set([...s.players, ...s.reserve].map(p => p.id));
    const before = ids();
    const ctx = ctxOf('nfl', [s], 53);
    const elevations: number[] = [];
    for (let week = 0; week < 6; week += 1) {
      coverInjuries(ctx, 1);
      expect(s.club.up.length).toBeLessThanOrEqual(2);
      expect(ids()).toEqual(before);
      elevations.push(s.club.up.length);
      afterRound(ctx, 1);
      for (const h of hurt) h.out = 3;
    }
    for (const p of ps) expect(s.club.ledger[p.id].elev ?? 0).toBeLessThanOrEqual(3);
    expect(elevations.reduce((a, b) => a + b, 0)).toBe(9);
    expect(farmCapBreaches(FARM_RULES.nfl, s, 53)).toEqual([]);
  });

  it('the NBA activates a two way man until his fifty games run out', () => {
    const hurt = man('G', 85, { out: 99 });
    const tw = man('G', 65);
    const s = seat('nba', 'AAA', [hurt], [tw]);
    const ctx = ctxOf('nba', [s], 15);
    let rounds = 0;
    for (let r = 0; r < 20; r += 1) {
      coverInjuries(ctx, 4);
      if (s.club.up.length) rounds += 1;
      afterRound(ctx, 4);
      hurt.out = 99;
    }
    expect(rounds).toBe(12);
    expect(s.club.ledger[tw.id].twGames).toBe(48);
  });

  it('MLB calls a man up for the injured list and sends him back when the man is fit', () => {
    const hurt = man('SP', 85, { out: 2 });
    const up = man('SP', 66, { age: 22 });
    const s = seat('mlb', 'AAA', [hurt], [up]);
    const ctx = ctxOf('mlb', [s, seat('mlb', 'BBB', [man('SP', 90)])], 26);
    coverInjuries(ctx, 6);
    expect(s.players.map(p => p.id)).toContain(up.id);
    expect(s.club.ledger[up.id].coverFor).toBe(hurt.id);
    hurt.out = 0;
    afterRound(ctx, 6);
    expect(s.reserve.map(p => p.id)).toContain(up.id);
    expect(activeCount(FARM_RULES.mlb, s)).toBe(1);
  });

  it('a call up off the 40 man needs a 40 man place', () => {
    const s = seat('mlb', 'AAA', Array.from({ length: 40 }, () => man('RP', 70)), [man('RP', 60)]);
    s.club.ledger[s.reserve[0].id] = { off40: true };
    expect(callUpRefusal(ctxOf('mlb', [s], 50), s, s.reserve[0].id)).toMatch(/40 man/);
  });
});

describe('draftees land where the sport sends them', () => {
  it('NFL and NBA to the active roster, MLB off the 40 man, the NHL to the farm club on his clock', () => {
    for (const [sport, where] of [['nfl', 'active'], ['nba', 'active'], ['mlb', 'tier'], ['nhl', 'tier']] as const) {
      const s = seat(sport, 'AAA', [man('C', 70)]);
      const d = man('C', 65, { age: 19 });
      expect(placeDraftee(ctxOf(sport, [s], 99), s, d), sport).toBe(where);
    }
    const s = seat('nhl', 'AAA', []);
    const d = man('D', 60, { age: 18 });
    placeDraftee(ctxOf('nhl', [s], 15), s, d);
    expect(s.club.ledger[d.id]).toEqual({ signedAge: 18, proSeasons: 1 });
  });

  it('MLB sends a draftee to the pool when the system is full', () => {
    const s = seat('mlb', 'AAA', []);
    for (let i = 0; i < MLB_OFF40_CAP; i += 1) { const p = man('OF', 60); s.reserve.push(p); s.club.ledger[p.id] = { off40: true }; }
    const ctx = ctxOf('mlb', [s], 26);
    expect(placeDraftee(ctx, s, man('OF', 61))).toBe('pool');
    expect(ctx.pool.length).toBe(1);
  });
});

describe('the tier summer', () => {
  it('a young man in the tier grows faster, counters clear and the NHL clock runs', () => {
    const young = man('C', 60, { age: 20, pot: 80 });
    const s = seat('nhl', 'AAA', [man('C', 75)], [young]);
    s.club.ledger[young.id] = { signedAge: 19, proSeasons: 1, nhlGames: 4, coverFor: 'gone' };
    const state = newFarmState('nhl', 2026, ['AAA']);
    state.clubs.AAA = s.club;
    const ctx = ctxOf('nhl', [s], 15, 2027);
    farmOffseason(state, ctx, { rng: ones, taken: new Set(), genName: () => 'Stock Name', minSalary: 0.8 });
    expect(young.age).toBe(21);
    expect(young.ovr).toBe(60 + 1 + TIER_GROWTH_BONUS);
    expect(s.club.ledger[young.id]).toEqual({ signedAge: 19, proSeasons: 2, nhlGames: 4 });
    expect(state.season).toBe(2027);
  });

  it('the NFL squad is aged by its engine, so the tier adds only the bonus', () => {
    const young = man('LB', 60, { age: 22, pot: 70 });
    const s = seat('nfl', 'AAA', [man('LB', 75)], [young]);
    s.club.ledger[young.id] = { elev: 3 };
    const ctx = ctxOf('nfl', [s], 53, 2027);
    farmOffseason(newFarmState('nfl', 2026, ['AAA']), ctx, { rng: ones, taken: new Set(), genName: () => 'x', minSalary: 1 });
    expect(young.age).toBe(22);
    expect(young.ovr).toBe(60 + TIER_GROWTH_BONUS);
    /* The season's elevations clear, and an empty row goes with them. */
    expect(s.club.ledger[young.id]).toBeUndefined();
  });
});

describe('an old save loads unchanged and a broken block resets alone', () => {
  it('reads absent as fresh, a broken club as that club fresh, another sport as all fresh', () => {
    expect(loadFarmState(undefined, 'mlb', 2026, ['A', 'B'])).toEqual({ state: newFarmState('mlb', 2026, ['A', 'B']), reset: [] });
    const good = newFarmState('mlb', 2026, ['A', 'B']);
    good.clubs.A.reserve!.push(man('SP', 70));
    const raw = JSON.parse(JSON.stringify(good));
    raw.clubs.B.ledger = 'broken';
    const { state, reset } = loadFarmState(raw, 'mlb', 2026, ['A', 'B']);
    expect(reset).toEqual(['B.ledger']);
    expect(state.clubs.A.reserve!.length).toBe(1);
    expect(state.clubs.B).toEqual({ reserve: [], ledger: {}, lost: [], up: [] });
    expect(loadFarmState(raw, 'nhl', 2026, ['A', 'B']).reset).toEqual(['all']);
    raw.clubs.B = 'not a club';
    expect(loadFarmState(raw, 'mlb', 2026, ['A', 'B']).reset).toEqual(['B']);
  });

  it('one bad ledger row resets that row alone: the lost list and the tier men stay', () => {
    for (const sport of ['nhl', 'mlb'] as FarmSport[]) {
      const good = newFarmState(sport, 2026, ['ANA']);
      const kid = man('C', 60);
      good.clubs.ANA.reserve!.push(kid, man('C', 61));
      good.clubs.ANA.lost.push('claimed1');
      good.clubs.ANA.prev = 0.42;
      good.clubs.ANA.ledger[kid.id] = { signedAge: 19, proSeasons: 2 };
      const raw = JSON.parse(JSON.stringify(good));
      raw.clubs.ANA.ledger.bad = { off40: 'yes' };
      raw.clubs.ANA.reserve.push({ id: 'half a man' });
      const { state, reset } = loadFarmState(raw, sport, 2026, ['ANA']);
      expect(reset, sport).toEqual(['ANA.ledger.bad', 'ANA.reserve.2']);
      expect(state.clubs.ANA.lost).toEqual(['claimed1']);
      expect(state.clubs.ANA.reserve!.map(p => p.id)).toEqual(good.clubs.ANA.reserve!.map(p => p.id));
      expect(state.clubs.ANA.ledger).toEqual({ [kid.id]: { signedAge: 19, proSeasons: 2 } });
      expect(state.clubs.ANA.prev).toBe(0.42);
    }
  });
});

describe('the panel says what the buttons do', () => {
  it('renders the counts, the rules and each move in the words the engine applies', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { GmFarmPanel } = await import('@/components/front-office-shared/GmFarmPanel');
    const vet = man('SP', 70, { age: 30 });
    const kid = man('SP', 60, { age: 21 });
    const s = seat('mlb', 'AAA', [vet, man('SP', 80)], [kid]);
    s.club.lost.push('gone1');
    const ctx = ctxOf('mlb', [s], 26);
    const html = renderToStaticMarkup(createElement(GmFarmPanel, { ctx, seat: s, onCallUp: () => {}, onSendDown: () => {} }));
    expect(html).toContain('40 man 3 of 40');
    expect(html).toContain('A man can be optioned in 3 seasons.');
    expect(html).toContain('Call up');
    expect(html).toContain('Expose to waivers');
    expect(html).toContain('Lost on waivers: 1.');
  });
});

describe('the claim order reads each league its own measure (review fixes)', () => {
  it('the NHL orders by share of possible points, an overtime loss worth a point', () => {
    /* 30-42-10 is .427 of the points but .366 of the games; 34-47-1 is .421 and .415. */
    const a = { abbr: 'A', wins: 30, losses: 42, otLosses: 10 };
    const b = { abbr: 'B', wins: 34, losses: 47, otLosses: 1 };
    expect(claimOrder([a, b], 'X', 'pointsPct').map(c => c.abbr)).toEqual(['B', 'A']);
    expect(claimOrder([a, b], 'X', 'winPct').map(c => c.abbr)).toEqual(['A', 'B']);
  });

  it('before a club has played, last season decides; MLB ties go to last season too', () => {
    const z = { abbr: 'ZZZ', wins: 0, losses: 0, prev: 0.3 };
    const m = { abbr: 'MMM', wins: 0, losses: 0, prev: 0.6 };
    const a = { abbr: 'AAA', wins: 0, losses: 0, prev: 0.5 };
    expect(claimOrder([a, m, z], 'X').map(c => c.abbr)).toEqual(['ZZZ', 'AAA', 'MMM']);
    const t1 = { abbr: 'AAA', wins: 5, losses: 5, prev: 0.7 };
    const t2 = { abbr: 'BBB', wins: 5, losses: 5, prev: 0.4 };
    expect(claimOrder([t1, t2], 'X').map(c => c.abbr)).toEqual(['BBB', 'AAA']);
  });

  it('closeSeason keeps the final standing, and the summer wire offers the worst club first', () => {
    const vet = man('SP', 85, { age: 31 });
    const from = seat('mlb', 'AAA', [vet, man('SP', 70)], [], 9, 1);
    const good = seat('mlb', 'BBB', [man('SP', 60)], [], 8, 2);
    const bad = seat('mlb', 'ZZZ', [man('SP', 60)], [], 2, 8);
    closeSeason(ctxOf('mlb', [from, good, bad], 26));
    expect([good.club.prev, bad.club.prev]).toEqual([0.8, 0.2]);
    for (const s of [from, good, bad]) { s.wins = 0; s.losses = 0; }
    const ctx = ctxOf('mlb', [from, good, bad], 26, 2027);
    from.players.splice(0, 1);
    expect(waive(ctx, from, vet)).toBe('claimed');
    expect(bad.players.map(p => p.id)).toContain(vet.id);
  });
});

describe('a claimed man never comes back by any farm path (review fixes)', () => {
  it('a rival never signs a squad man it lost on waivers', () => {
    const x = man('WR', 80);
    const usr = seat('nfl', 'USR', [man('WR', 70)], [x], 5, 5);
    const los = seat('nfl', 'LOS', [man('WR', 50)], [], 0, 10);
    los.club.lost.push(x.id);
    const ctx = ctxOf('nfl', [usr, los], 53);
    rivalSignings(ctx, () => 0);
    expect(los.players.some(p => p.id === x.id)).toBe(false);
    expect(usr.reserve.map(p => p.id)).toEqual([x.id]);
    los.club.lost = [];
    rivalSignings(ctx, () => 0);
    expect(los.players.some(p => p.id === x.id), 'the same signing goes through for a club that never lost him').toBe(true);
  });

  it('the summer restock never signs a man the club lost', () => {
    const lostKid = man('C', 60, { age: 21, pot: 90 });
    const other = man('C', 60, { age: 21, pot: 70 });
    const s = seat('nhl', 'AAA', [man('C', 75)]);
    s.club.lost.push(lostKid.id);
    const ctx = ctxOf('nhl', [s], 15);
    ctx.pool.push(lostKid, other);
    stockTier(ctx, s, { rng: ones, taken: new Set(), genName: () => 'Stock Name', minSalary: 0.8 });
    expect(s.reserve.some(p => p.id === lostKid.id)).toBe(false);
    expect(s.reserve.some(p => p.id === other.id)).toBe(true);
    expect(ctx.pool.map(p => p.id)).toEqual([lostKid.id]);
  });
});

describe('the NHL exemption clock, on its edges (review fixes)', () => {
  it('a man is exempt through his last season and his last game short of the limit, and not one past', () => {
    const kid = man('C', 70, { age: 22 });
    /* Signed at 20: three seasons or 160 games. */
    expect(nhlExempt({ signedAge: 20, proSeasons: 3, nhlGames: 0 }, kid)).toBe(true);
    expect(nhlExempt({ signedAge: 20, proSeasons: 4, nhlGames: 0 }, kid)).toBe(false);
    expect(nhlExempt({ signedAge: 20, proSeasons: 1, nhlGames: 159 }, kid)).toBe(true);
    expect(nhlExempt({ signedAge: 20, proSeasons: 1, nhlGames: 160 }, kid)).toBe(false);
    /* Signed at 25 or older: one season, no games limit. */
    expect(nhlExempt({ signedAge: 26, proSeasons: 1, nhlGames: 80 }, kid)).toBe(true);
    expect(nhlExempt({ signedAge: 26, proSeasons: 2, nhlGames: 0 }, kid)).toBe(false);
    expect(nhlExempt(undefined, kid), 'no record is a veteran').toBe(false);
  });

  it('afterRound counts every game a healthy tracked man plays, not every round', () => {
    const kid = man('C', 70, { age: 20 });
    const s = seat('nhl', 'AAA', [kid, man('C', 60, { out: 2 })]);
    s.club.ledger[kid.id] = { signedAge: 19, proSeasons: 1, nhlGames: 10 };
    const ctx = ctxOf('nhl', [s], 15);
    afterRound(ctx, 4);
    afterRound(ctx, 3);
    expect(s.club.ledger[kid.id].nhlGames).toBe(17);
  });

  it('a pool man the summer signs has no first contract here, so he is not exempt; a new prospect is', () => {
    const vet = man('C', 60, { age: 23, pot: 80 });
    const s = seat('nhl', 'AAA', [man('C', 75)]);
    const ctx = ctxOf('nhl', [s], 15);
    ctx.pool.push(vet);
    stockTier(ctx, s, { rng: ones, taken: new Set(), genName: () => 'Stock Name', minSalary: 0.8 });
    expect(s.club.ledger[vet.id]).toBeUndefined();
    expect(nhlExempt(s.club.ledger[vet.id], vet)).toBe(false);
    const fresh = s.reserve.find(p => p.id !== vet.id)!;
    expect(s.club.ledger[fresh.id]).toEqual({ signedAge: fresh.age, proSeasons: 1 });
  });
});

describe('room, the cap and the contract limit (review fixes)', () => {
  it('the NFL refuses a send down with the squad full, counting men up for the game, and a cleared man joins it', () => {
    const squad = Array.from({ length: 15 }, () => man('LB', 50));
    const kid = man('LB', 55, { age: 22 });
    const s = seat('nfl', 'AAA', [kid, man('LB', 70)], squad, 5, 5);
    const ctx = ctxOf('nfl', [s, seat('nfl', 'BBB', [man('LB', 90)])], 53);
    s.club.up.push('elevated1');
    expect(sendDownRefusal(ctx, s, kid.id)).toMatch(/practice squad is full/);
    expect(farmSendDownButton(ctx, s, kid).refusal).toMatch(/full/);
    s.club.up = [];
    expect(sendDownRefusal(ctx, s, kid.id)).toBeNull();
    expect(farmSendDownButton(ctx, s, kid).warn).toMatch(/goes to your practice squad/);
    expect(sendDown(ctx, s, kid.id)).toBe('cleared');
    expect(s.reserve.map(p => p.id)).toContain(kid.id);
  });

  it('a call up and a claim need cap room when the engine gives one', () => {
    const kid = man('C', 70, { salary: 2 });
    const s = seat('nhl', 'AAA', [man('C', 60)], [kid]);
    const ctx: FarmCtx = { ...ctxOf('nhl', [s], 15), capRoom: () => 1.5 };
    expect(callUpRefusal(ctx, s, kid.id)).toMatch(/0\.5M more cap room/);
    expect(canClaim(ctx, s, man('C', 90, { salary: 2 }), false)).toBe(false);
    expect(canClaim(ctx, s, man('C', 90, { salary: 1 }), false)).toBe(true);
    ctx.capRoom = () => 3;
    expect(callUpRefusal(ctx, s, kid.id)).toBeNull();
  });

  it('a club at fifty NHL contracts cannot claim', () => {
    const s = seat('nhl', 'AAA', Array.from({ length: 15 }, () => man('C', 50)), Array.from({ length: 35 }, () => man('C', 40)));
    const ctx = ctxOf('nhl', [s], 20);
    const star = man('C', 90);
    expect(canClaim(ctx, s, star, false)).toBe(false);
    s.reserve.pop();
    expect(canClaim(ctx, s, star, false)).toBe(true);
  });
});

describe('the tier grows a man as the engine would, plus the young bonus (review fixes)', () => {
  it('an MLB 25 year old grows the engine amount in the minors, a 23 year old one more', () => {
    const mid = man('SP', 60, { age: 24, pot: 90 });
    const kid = man('SP', 60, { age: 22, pot: 90 });
    const s = seat('mlb', 'AAA', [man('SP', 75)], [mid, kid]);
    const ctx = ctxOf('mlb', [s], 26, 2027);
    const high = () => 0.99;
    farmOffseason(newFarmState('mlb', 2026, ['AAA']), ctx, { rng: high, taken: new Set(), genName: () => 'x', minSalary: 1 });
    expect(mid.ovr, 'the engine grows a man of 25 with room 1 + floor(rng * 3)').toBe(63);
    expect(kid.ovr).toBe(63 + TIER_GROWTH_BONUS);
  });
});

describe('the panel counts and labels say what is true (review fixes)', () => {
  it('a full NFL squad with its international man reads 17 of 17, and an NBA call up says it is for good', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { GmFarmPanel } = await import('@/components/front-office-shared/GmFarmPanel');
    const nfl = seat('nfl', 'AAA', [man('LB', 70)], Array.from({ length: 17 }, () => man('LB', 50)));
    const html = renderToStaticMarkup(createElement(GmFarmPanel, { ctx: ctxOf('nfl', [nfl], 53), seat: nfl, onCallUp: () => {}, onSendDown: () => {} }));
    expect(html).toContain('Practice squad 17 of 17');
    const nba = seat('nba', 'BBB', [man('G', 70)], [man('G', 60)]);
    const b = farmCallUpButton(ctxOf('nba', [nba], 15), nba, nba.reserve[0]);
    expect(b.label).toBe('Sign to a standard contract');
    expect(b.warn).toMatch(/cannot go back to two way/);
  });
});
