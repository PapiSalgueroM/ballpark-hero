import { describe, expect, it } from 'vitest';
import { NRL_OPENING_MATCHDAY_2026 } from '@/data/nrlOpeningMatchday2026';
import {
  NRL_WORLD_CUP_2026_FORMAT, NRL_WORLD_CUP_2026_KNOCKOUT_VENUES, NRL_WORLD_CUP_2026_OPENER,
  NRL_WORLD_CUP_2026_OPENING_SQUADS, NRL_WORLD_CUP_2026_POOL_FIXTURES, NRL_WORLD_CUP_2026_POOLS,
} from '@/data/nrlWorldCup2026';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_ROLES } from '@/lib/nrlManager';
import {
  advanceNrlWorldCup, createNrlWorldCup, nrlWorldCupCanPickLineup, nrlWorldCupMatchday, nrlWorldCupResults, nrlWorldCupRotation,
  rankNrlWorldCupPools, readNrlWorldCupSave, simulateNrlWorldCupOpener,
} from '@/lib/nrlWorldCup';

describe('2026 men’s Rugby League World Cup opener', () => {
  it('records the official fixture and both matchday 19s independently of club selection', () => {
    expect(NRL_WORLD_CUP_2026_OPENER).toMatchObject({
      id: '2026-australia-new-zealand', pool: 'A', round: 1, date: '2026-10-15', kickOff: '20:05',
      timeZone: 'Australia/Sydney', venue: 'Allianz Stadium, Sydney', home: 'australia', away: 'new-zealand',
    });
    const { australia, 'new-zealand': newZealand } = NRL_WORLD_CUP_2026_OPENING_SQUADS;
    expect(australia.map(player => player.name)).toEqual([
      'Reece Walsh', 'Jack Bostock', 'Latrell Mitchell', 'Kotoni Staggs', 'Tom Trbojevic', 'Cameron Munster',
      'Mitchell Moses', 'Patrick Carrigan', 'Harry Grant', "Tino Fa'asuamaleaui", 'Jacob Preston', 'Liam Martin',
      'Isaah Yeo', 'Tom Dearden', 'Cameron Murray', 'Reuben Cotter', 'Keaon Koloamatangi', 'David Fifita', 'Bradman Best',
    ]);
    expect(newZealand.map(player => player.name)).toEqual([
      'Kalyn Ponga', 'Jamayne Isaako', 'Dane Gagai', 'Casey McLean', 'Ronaldo Mulitalo', 'Kodi Nikorima', 'Jahrome Hughes',
      'James Fisher-Harris', 'Jeremy Marshall-King', 'Moses Leota', "Isaiah Papali'i", 'Briton Nikora', 'Joseph Tapine',
      'Naufahu Whyte', 'Erin Clark', 'Xavier Willison', 'Keano Kini', 'Te Maire Martin', 'Charnze Nicoll-Klokstad',
    ]);
    for (const roster of [australia, newZealand]) {
      expect(roster).toHaveLength(19);
      expect(new Set(roster.slice(0, 13).map(player => player.role))).toEqual(new Set(NRL_ROLES));
      expect(roster.slice(0, 13).map(player => player.role)).toEqual([
        'Fullback', 'Right Wing', 'Right Centre', 'Left Centre', 'Left Wing', 'Five-eighth', 'Halfback',
        'Prop 8', 'Hooker', 'Prop 10', 'Left Second Row', 'Right Second Row', 'Lock',
      ]);
      expect(roster.slice(0, 13).map(player => player.jersey)).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
    }
    expect(newZealand.map(player => player.jersey)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19, 14, 18]);
    expect(new Set([...australia, ...newZealand].map(player => player.id)).size).toBe(38);
    const clubNames = new Map(Object.values(NRL_OPENING_MATCHDAY_2026).flat().map(([id, name]) => [id, name]));
    expect([...australia, ...newZealand].filter(player => player.clubPlayerId).every(player => clubNames.get(player.clubPlayerId!) === player.name)).toBe(true);
    expect([...australia, ...newZealand].filter(player => !player.clubPlayerId).map(player => player.name)).toEqual([
      'Jack Bostock', 'Liam Martin', 'Ronaldo Mulitalo', 'Jeremy Marshall-King', 'Te Maire Martin',
    ]);
  });

  it('uses the final round-one teams for all ten nations, including late role and shirt changes', () => {
    const squads = NRL_WORLD_CUP_2026_OPENING_SQUADS;
    expect(Object.keys(squads).sort()).toEqual(Object.values(NRL_WORLD_CUP_2026_POOLS).flat().sort());
    const all = Object.values(squads).flat();
    expect(new Set(all.map(player => player.id)).size).toBe(190);
    expect(all.filter(player => player.clubPlayerId)).toHaveLength(80);
    for (const squad of Object.values(squads)) {
      expect(squad).toHaveLength(19);
      expect(new Set(squad.map(player => player.jersey)).size).toBe(19);
      expect(new Set(squad.slice(0, 13).map(player => player.role))).toEqual(new Set(NRL_ROLES));
    }
    expect(squads.samoa[16]).toMatchObject({ name: "Sualauvi Fa'alogo", jersey: 17, clubPlayerId: 100006297 });
    expect(squads.france[12]).toMatchObject({ name: 'Mathieu Cozza', jersey: 17, role: 'Lock' });
    expect(squads['papua-new-guinea'][6]).toMatchObject({ name: 'Finley Glare', jersey: 14, role: 'Halfback' });
    expect(squads['papua-new-guinea'][12]).toMatchObject({ name: 'Liam Horne', jersey: 15, role: 'Lock' });
    expect(squads.lebanon[16]).toMatchObject({ name: 'Tupou Francis', jersey: 20 });
    expect(squads.england[1]).toMatchObject({ name: 'Dominic Young', jersey: 2, clubPlayerId: 100008071 });
    expect(squads.england[9]).toMatchObject({ name: 'Luke Thompson', jersey: 15, role: 'Prop 10' });
    expect(squads.tonga[8]).toMatchObject({ name: 'Salesi Foketi', jersey: 14, role: 'Hooker' });
    expect(squads.tonga[17]).toMatchObject({ name: 'Soni Luke', jersey: 9 });
    expect(squads.fiji[16]).toMatchObject({ name: 'Jordin Leiu', jersey: 19 });
    expect(squads['cook-islands'][15]).toMatchObject({ name: 'Brad Takairangi', jersey: 17 });
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clubNames = new Map(Object.values(NRL_OPENING_MATCHDAY_2026).flat().map(([id, name]) => [id, normalize(name)]));
    expect(all.filter(player => player.clubPlayerId).every(player => clubNames.get(player.clubPlayerId!) === normalize(player.name))).toBe(true);
  });

  it('simulates deterministically, applies the chosen side’s tactic and always resolves a winner', () => {
    const seeds = Array.from({ length: 32 }, (_, index) => index);
    const outcomes = seeds.map(seed => simulateNrlWorldCupOpener(seed, 'australia', 'balanced'));
    expect(seeds.map(seed => simulateNrlWorldCupOpener(seed, 'new-zealand', 'balanced'))).toEqual(outcomes);
    expect(seeds.map(seed => simulateNrlWorldCupOpener(seed, 'australia', 'balanced'))).toEqual(outcomes);
    expect(new Set(outcomes.map(match => `${match.homeScore}:${match.awayScore}`)).size).toBeGreaterThan(5);
    expect(outcomes.every(match => match.winner === (match.homeScore > match.awayScore ? 'australia' : 'new-zealand')
      && match.homeScore !== match.awayScore && match.simulated)).toBe(true);
    expect(simulateNrlWorldCupOpener(42, 'australia', 'balanced')).toMatchObject({
      homeScore: 23, awayScore: 22, goldenPoint: true, winner: 'australia',
    });
    expect(seeds.some(seed => simulateNrlWorldCupOpener(seed, 'australia', 'attack').homeScore
      !== simulateNrlWorldCupOpener(seed, 'new-zealand', 'attack').homeScore)).toBe(true);
  });

  it('preserves serialized career, live match progression and Origin RNG around repeated play', () => {
    const club = createNrlCareer('bears', 37, 2027);
    const origin = reduceNrlCareer(club, { type: 'startOrigin', year: 2027, side: 'qld' });
    expect(origin.origin).toBeDefined();
    const bytes = JSON.stringify(origin);
    const nextClub = reduceNrlCareer(origin, { type: 'advance' });
    const playOrigin = () => reduceNrlCareer(origin, { type: 'playOriginMatch', year: 2027, side: 'qld', game: 1 });
    const nextOrigin = playOrigin();
    simulateNrlWorldCupOpener(club.season.seed, 'australia', 'attack');
    simulateNrlWorldCupOpener(club.season.seed, 'new-zealand', 'defense');
    expect(JSON.stringify(origin)).toBe(bytes);
    expect(reduceNrlCareer(origin, { type: 'advance' })).toEqual(nextClub);
    expect(playOrigin()).toEqual(nextOrigin);
  });
});

describe('World Cup club appointment', () => {
  const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
  const stripCup = ({ worldCup: _, ...state }: NrlCareerState) => state;
  const appoint = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startWorldCupAppointment', nation: 'australia' });

  it('accepts one appointment after finishing 2026 and saves only the active career run', () => {
    const initial = createNrlCareer('broncos', 16);
    expect(appoint(initial)).toBe(initial);
    const initial2027 = createNrlCareer('bears', 16, 2027);
    let completed2027 = initial2027;
    while (completed2027.season.phase !== 'complete') completed2027 = advance(completed2027);
    expect(appoint(completed2027)).toBe(completed2027);

    let complete = initial;
    while (complete.season.phase !== 'complete') complete = advance(complete);
    const appointed = appoint(complete);
    expect(appointed.worldCup).toMatchObject({ year: 2026, nation: 'australia', tactics: [] });
    expect(appointed.worldCup?.seed).not.toBe(initial.season.seed);
    expect(stripCup(appointed)).toEqual(complete);
    expect(appoint(appointed)).toBe(appointed);
    expect(appoint(reduceNrlCareer(complete, { type: 'retireCareer', year: 2026, clubId: 'broncos' }))).not.toHaveProperty('worldCup');
    expect(readNrlCareerSave(JSON.stringify({ ...initial, worldCup: appointed.worldCup }))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...complete, worldCup: { ...appointed.worldCup, seed: 16 } }))).toBeNull();

    const previous = appointed.worldCup!;
    const next = advanceNrlWorldCup(previous, 1, 'balanced', { swap: 0, firstReserve: 3 });
    const started = reduceNrlCareer(appointed, { type: 'playWorldCupAppointment', previous, next });
    expect(started.worldCup).toEqual(next);
    expect(stripCup(started)).toEqual(complete);
    expect(reduceNrlCareer(started, { type: 'playWorldCupAppointment', previous, next })).toBe(started);
    const tampered = { ...advanceNrlWorldCup(next, 2, 'attack'), lineups: { 1: { swap: 0 } } };
    expect(reduceNrlCareer(started, { type: 'playWorldCupAppointment', previous: next, next: tampered })).toBe(started);
    expect(readNrlCareerSave(JSON.stringify({ ...started, worldCup: { ...next, lineups: { 2: { firstReserve: 3 } } } }))).toBeNull();
    const move = { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } } as const;
    let current = reduceNrlCareer(started, move);
    const ordinary = reduceNrlCareer(complete, move);
    expect(stripCup(current)).toEqual(ordinary);
    expect(current.worldCup).toEqual(next);
    expect(appoint(ordinary)).toBe(ordinary);
    const live = reduceNrlCareer(current, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(reduceNrlCareer(live, { type: 'playWorldCupAppointment', previous: next, next: advanceNrlWorldCup(next, 2, 'attack') })).toBe(live);
    for (let stage = 2; stage <= 5; stage++) {
      const previous = current.worldCup!;
      current = reduceNrlCareer(current, { type: 'playWorldCupAppointment', previous,
        next: advanceNrlWorldCup(previous, stage, 'balanced') });
      expect(JSON.stringify(readNrlCareerSave(JSON.stringify(current)))).toBe(JSON.stringify(current));
      expect(stripCup(current)).toEqual(ordinary);
    }
    expect(nrlWorldCupResults(current.worldCup!).champion).toBeDefined();
    expect(current.worldCup?.tactics).toHaveLength(5);
  });
});

describe('2026 men’s Rugby League World Cup draw', () => {
  it('keeps the ten teams in the published pools and the 15 fixtures in the correct cross-pool pattern', () => {
    expect(NRL_WORLD_CUP_2026_POOLS).toEqual({
      A: ['australia', 'new-zealand', 'fiji', 'cook-islands'],
      B: ['england', 'samoa', 'lebanon'],
      C: ['tonga', 'papua-new-guinea', 'france'],
    });
    expect(NRL_WORLD_CUP_2026_POOL_FIXTURES).toHaveLength(15);
    expect(NRL_WORLD_CUP_2026_POOL_FIXTURES[0]).toBe(NRL_WORLD_CUP_2026_OPENER);
    expect(new Set(NRL_WORLD_CUP_2026_POOL_FIXTURES.map(fixture => fixture.id)).size).toBe(15);
    for (const round of [1, 2, 3]) {
      const played = NRL_WORLD_CUP_2026_POOL_FIXTURES.filter(fixture => fixture.round === round);
      expect(played).toHaveLength(5);
      expect(played.flatMap(({ home, away }) => [home, away]).sort()).toEqual(Object.values(NRL_WORLD_CUP_2026_POOLS).flat().sort());
      for (const { home, away, pool } of played) {
        const group = (team: string) => Object.entries(NRL_WORLD_CUP_2026_POOLS).find(([, teams]) => (teams as readonly string[]).includes(team))![0];
        expect([group(home), group(away)].sort().join('')).toBe(pool === 'A' ? 'AA' : 'BC');
      }
    }
    expect(new Set(NRL_WORLD_CUP_2026_POOL_FIXTURES.map(({ home, away }) => [home, away].sort().join(':'))).size).toBe(15);
    expect(NRL_WORLD_CUP_2026_POOL_FIXTURES.map(({ date, venue }) => [date, venue])).toEqual([
      ['2026-10-15', 'Allianz Stadium, Sydney'],
      ['2026-10-16', 'CommBank Stadium, Sydney'],
      ['2026-10-17', 'Santos National Football Stadium, Port Moresby'],
      ['2026-10-17', 'HBF Park, Perth'],
      ['2026-10-18', 'McDonald Jones Stadium, Newcastle'],
      ['2026-10-23', 'CommBank Stadium, Sydney'],
      ['2026-10-24', 'Santos National Football Stadium, Port Moresby'],
      ['2026-10-24', 'HBF Park, Perth'],
      ['2026-10-25', 'One NZ Stadium, Christchurch'],
      ['2026-10-25', 'Suncorp Stadium, Brisbane'],
      ['2026-10-30', 'WIN Stadium, Wollongong'],
      ['2026-10-31', 'Cbus Super Stadium, Gold Coast'],
      ['2026-10-31', 'Queensland Country Bank Stadium, Townsville'],
      ['2026-11-01', 'CommBank Stadium, Sydney'],
      ['2026-11-01', 'CommBank Stadium, Sydney'],
    ]);
  });

  it('records official qualification and knockout venues without hard-coding hypothetical qualifiers', () => {
    expect(NRL_WORLD_CUP_2026_FORMAT).toEqual({
      winPoints: 2, lossPoints: 0, goldenPoint: true, samePoolTiebreak: 'points-difference',
      crossPoolTiebreak: 'head-to-head', semifinalPlaces: { A: 2, BC: 2 },
    });
    expect(NRL_WORLD_CUP_2026_KNOCKOUT_VENUES).toEqual([
      { stage: 'semifinal', date: '2026-11-07', venue: 'McDonald Jones Stadium, Newcastle' },
      { stage: 'semifinal', date: '2026-11-08', venue: 'Allianz Stadium, Sydney' },
      { stage: 'final', date: '2026-11-15', venue: 'Suncorp Stadium, Brisbane' },
    ]);
    const fixtures = [...NRL_WORLD_CUP_2026_POOL_FIXTURES, ...NRL_WORLD_CUP_2026_KNOCKOUT_VENUES];
    expect(new Set(fixtures.map(fixture => fixture.venue.split(', ').at(-1)))).toEqual(new Set([
      'Sydney', 'Port Moresby', 'Perth', 'Newcastle', 'Christchurch', 'Brisbane', 'Wollongong', 'Gold Coast', 'Townsville',
    ]));
  });
});

describe('2026 men’s Rugby League World Cup simulation', () => {
  it('runs three complete pool rounds, two cross-table semifinals and a winners-only final', () => {
    const start = createNrlWorldCup(42, 'australia');
    expect(start).toEqual({ version: 1, year: 2026, seed: 42, nation: 'australia', tactics: [] });
    expect(advanceNrlWorldCup(start, 2, 'attack')).toBe(start);
    let run = start;
    for (let step = 1; step <= 5; step++) {
      run = advanceNrlWorldCup(run, step, 'balanced');
      expect(run.tactics).toHaveLength(step);
      expect(readNrlWorldCupSave(JSON.stringify(run))).toEqual(run);
    }
    const report = nrlWorldCupResults(run);
    expect(report.poolMatches).toHaveLength(15);
    const { id, home, away } = NRL_WORLD_CUP_2026_OPENER;
    expect(report.poolMatches[0]).toEqual({ id, home, away, ...simulateNrlWorldCupOpener(42, 'australia', 'balanced') });
    expect(report.tables.A).toHaveLength(4);
    expect(report.tables.BC).toHaveLength(6);
    expect(report.tables.A.reduce((sum, row) => sum + row.points, 0)).toBe(12);
    expect(report.tables.BC.reduce((sum, row) => sum + row.points, 0)).toBe(18);
    expect(report.semifinals.map(match => [match.home, match.away])).toEqual([
      [report.tables.A[1].nation, report.tables.BC[0].nation],
      [report.tables.A[0].nation, report.tables.BC[1].nation],
    ]);
    expect([report.final?.home, report.final?.away]).toEqual([report.semifinals[1].winner, report.semifinals[0].winner]);
    expect(report.champion).toBe(report.final?.winner);
    expect(nrlWorldCupResults(run)).toEqual(report);
    expect(advanceNrlWorldCup(run, 6, 'attack')).toBe(run);
  });

  it('uses points difference within a pool and a head-to-head winner over a higher difference across pools', () => {
    const tables = rankNrlWorldCupPools([
      { home: 'australia', away: 'new-zealand', homeScore: 24, awayScore: 22 },
      { home: 'new-zealand', away: 'cook-islands', homeScore: 40, awayScore: 6 },
      { home: 'england', away: 'tonga', homeScore: 16, awayScore: 18 },
      { home: 'england', away: 'france', homeScore: 80, awayScore: 0 },
    ]);
    expect(tables.A[0].nation).toBe('new-zealand');
    expect(tables.BC.slice(0, 2).map(row => row.nation)).toEqual(['tonga', 'england']);
  });

  it('uses the disclosed fallback for a cyclic head-to-head tie, then points scored and draw order', () => {
    const cycle = rankNrlWorldCupPools([
      { home: 'england', away: 'tonga', homeScore: 15, awayScore: 10 },
      { home: 'samoa', away: 'tonga', homeScore: 12, awayScore: 20 },
      { home: 'samoa', away: 'papua-new-guinea', homeScore: 21, awayScore: 20 },
      { home: 'england', away: 'papua-new-guinea', homeScore: 14, awayScore: 16 },
    ]);
    expect(cycle.BC.slice(0, 4).map(row => row.nation)).toEqual(['tonga', 'england', 'papua-new-guinea', 'samoa']);
    const tied = rankNrlWorldCupPools([
      { home: 'new-zealand', away: 'fiji', homeScore: 10, awayScore: 8 },
      { home: 'australia', away: 'cook-islands', homeScore: 12, awayScore: 10 },
    ]);
    expect(tied.A.map(row => row.nation)).toEqual(['australia', 'new-zealand', 'cook-islands', 'fiji']);
    expect(rankNrlWorldCupPools([]).A.map(row => row.nation)).toEqual(NRL_WORLD_CUP_2026_POOLS.A);
  });

  it('guards seed, edition, tactic receipts and stale actions without storing arbitrary scores', () => {
    const start = createNrlWorldCup(16, 'tonga');
    expect(advanceNrlWorldCup(start, 1, 'balanced')).not.toBe(start);
    expect(advanceNrlWorldCup(start, 1, 'invalid' as never)).toBe(start);
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, year: 2027 }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, seed: -1 }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, nation: 'usa' }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, tactics: Array(6).fill('attack') }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, tactics: ['press'] }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...start, matches: [] }))).toBeNull();
    expect(nrlWorldCupResults(start)).toMatchObject({ poolMatches: [], semifinals: [], final: null, champion: null });
  });

  it('plays a qualified swap and ordered bench only for your next fixture', () => {
    const nation = 'australia';
    const swap = 0;
    const matchday = nrlWorldCupMatchday(nation, { swap, firstReserve: 3 });
    expect(matchday.starters.find(player => player.role === 'Halfback')?.name).toBe('Tom Dearden');
    expect(matchday.bench[0].name).toBe('Keaon Koloamatangi');
    expect(matchday.bench.some(player => player.name === 'Mitchell Moses')).toBe(true);
    expect(new Set([...matchday.starters, ...matchday.bench].map(player => player.id)).size).toBe(19);
    expect(NRL_WORLD_CUP_2026_OPENING_SQUADS[nation][6].name).toBe('Mitchell Moses');
    let swappedImpact = false;
    for (let seed = 0; seed < 240; seed++) {
      const run = createNrlWorldCup(seed, nation);
      const normal = advanceNrlWorldCup(run, 1, 'balanced');
      const changed = advanceNrlWorldCup(run, 1, 'balanced', { swap });
      const base = nrlWorldCupResults(normal).poolMatches;
      const swaps = nrlWorldCupResults(changed).poolMatches;
      expect(swaps.slice(1)).toEqual(base.slice(1));
      if (JSON.stringify(swaps[0]) !== JSON.stringify(base[0])) swappedImpact = true;
      expect(readNrlWorldCupSave(JSON.stringify(changed))).toEqual(changed);
      if (swappedImpact) break;
    }
    expect(swappedImpact).toBe(true);
    const first = nrlWorldCupRotation(nation, { firstReserve: 5 });
    expect(first[0].name).toBe('Bradman Best');
    expect(first.map(player => player.name)).not.toEqual(nrlWorldCupRotation(nation, {}).map(player => player.name));
    expect(first).toHaveLength(4);

    const run = createNrlWorldCup(6, nation);
    const changed = advanceNrlWorldCup(run, 1, 'balanced', { swap: 1 });
    const reordered = advanceNrlWorldCup(run, 1, 'balanced', { swap: 1, firstReserve: 2 });
    expect(nrlWorldCupResults(changed).poolMatches[0]).toMatchObject({ homeScore: 28, awayScore: 14 });
    expect(nrlWorldCupResults(reordered).poolMatches[0]).toMatchObject({ homeScore: 28, awayScore: 20 });
    expect(nrlWorldCupResults(reordered).poolMatches.slice(1)).toEqual(nrlWorldCupResults(changed).poolMatches.slice(1));
  });

  it('rejects forged, stale and eliminated-team lineup choices', () => {
    const opening = createNrlWorldCup(42, 'cook-islands');
    expect(nrlWorldCupCanPickLineup(opening)).toBe(true);
    expect(advanceNrlWorldCup(opening, 1, 'balanced', { swap: 6 })).toBe(opening);
    expect(advanceNrlWorldCup(opening, 1, 'balanced', { firstReserve: 0 })).toBe(opening);
    expect(advanceNrlWorldCup(opening, 2, 'balanced', { firstReserve: 5 })).toBe(opening);
    let run = opening;
    for (let step = 1; step <= 3; step++) run = advanceNrlWorldCup(run, step, 'balanced');
    expect(nrlWorldCupCanPickLineup(run)).toBe(false);
    expect(advanceNrlWorldCup(run, 4, 'balanced', { firstReserve: 5 })).toBe(run);
    const semifinals = advanceNrlWorldCup(run, 4, 'balanced');
    expect(readNrlWorldCupSave(JSON.stringify({ ...semifinals, lineups: { 4: { firstReserve: 5 } } }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...semifinals, lineups: { 5: { firstReserve: 5 } } }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...semifinals, lineups: { '01': { firstReserve: 5 } } }))).toBeNull();
    expect(readNrlWorldCupSave(JSON.stringify({ ...semifinals, lineups: {} }))).toBeNull();
  });

  it('persists valid independent changes in all three pool games and both knockout games', () => {
    let run = createNrlWorldCup(42, 'australia');
    for (let step = 1; step <= 5; step++) {
      expect(nrlWorldCupCanPickLineup(run)).toBe(true);
      run = advanceNrlWorldCup(run, step, 'balanced', { swap: 0, firstReserve: 3 });
      expect(run.tactics).toHaveLength(step);
      expect(readNrlWorldCupSave(JSON.stringify(run))).toEqual(run);
    }
    expect(nrlWorldCupCanPickLineup(run)).toBe(false);
    expect(Object.keys(run.lineups!)).toEqual(['1', '2', '3', '4', '5']);
    expect(JSON.stringify(run).length).toBeLessThan(512);
  });

  it('finishes every nation’s run with a four-nation knockout even when the chosen team is eliminated', () => {
    let eliminated = 0;
    for (const nation of Object.values(NRL_WORLD_CUP_2026_POOLS).flat()) {
      for (const seed of [0, 1, 17, 29, 42, 250, 4294967295]) {
        let run = createNrlWorldCup(seed, nation);
        for (let step = 1; step <= 5; step++) run = advanceNrlWorldCup(run, step, 'attack');
        const { poolMatches, semifinals, final, champion } = nrlWorldCupResults(run);
        const entrants = new Set(semifinals.flatMap(match => [match.home, match.away]));
        expect(entrants.size).toBe(4);
        if (!entrants.has(nation)) eliminated++;
        expect(new Set([final?.home, final?.away])).toEqual(new Set(semifinals.map(match => match.winner)));
        expect(champion).toBe(final?.winner);
        expect([...poolMatches, ...semifinals, final].every(match => match!.homeScore !== match!.awayScore)).toBe(true);
        expect(JSON.stringify(run).length).toBeLessThan(160);
      }
    }
    expect(eliminated).toBeGreaterThan(0);
  });
});
