import { describe, expect, it, vi } from 'vitest';
import { advanceClubManagerTrajectory, type ClubManagerTrajectoryContext } from '@/lib/clubManagerTrajectory';
import { ageDriftBand, declineScale, projectedWorldFor, projectedWorld, projectedRoster, projectedXIAvg, rawCurveValue, type ProjectedPlayer } from '@/lib/clubManagerEras';
import { CM_WORLD_ROSTERS } from '@/data/clubManagerWorldRosters';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' }));

type TrajectoryPlayer = ProjectedPlayer & { potential?: number };

function context(player: ProjectedPlayer, seed = 31, year = 1, identity = 'held-source'): ClubManagerTrajectoryContext {
  return { seed, identity, year, ageBand: ageDriftBand(player.a + 1), declineScale: declineScale(player.p) };
}

function fixture(): TrajectoryPlayer {
  return { n: 'Generated test player', p: 'CM', a: 22, r: 70, v: 5, g: true, anchor: 70, since: 0 };
}

function fullPool(): { club: string; identity: string; player: ProjectedPlayer }[] {
  return Object.entries(projectedWorldFor('now', 0)).flatMap(([club, players]) => players.map(player => ({
    club,
    identity: JSON.stringify(['now', club, player.n, player.p, 2026 - player.a, player.since]),
    player,
  })));
}

function project(player: TrajectoryPlayer, seed: number, identity: string, years: number): TrajectoryPlayer {
  let held: TrajectoryPlayer = player;
  for (let year = 1; year <= years; year++) held = advanceClubManagerTrajectory(held, context(held, seed, year, identity));
  return held;
}

describe('Club Manager save-bound player trajectories', () => {
  it('leaves every real season-zero source row byte-exact without adding potential', () => {
    const pool = fullPool();
    expect(pool.length).toBeGreaterThan(4000);
    for (const [club, players] of Object.entries(projectedWorldFor('now', 0))) {
      expect(players.map(({ n, p, a, r, v }) => ({ n, p, a, r, v }))).toEqual(CM_WORLD_ROSTERS[club]);
    }
    for (const { player } of pool) {
      const before = JSON.stringify(player);
      expect(advanceClubManagerTrajectory(player, context(player, 31, 0))).toBe(player);
      expect(JSON.stringify(player)).toBe(before);
      expect(Object.prototype.hasOwnProperty.call(player, 'potential')).toBe(false);
    }
    console.log(`TRAJECTORY original source rows held: ${pool.length}`);
  });

  it.each([
    { label: 'absent context', absent: true },
    { label: 'null context', absent: true, value: null },
    { label: 'absent seed', patch: { seed: undefined } },
    { label: 'negative seed', patch: { seed: -1 } },
    { label: 'overflow seed', patch: { seed: 4294967296 } },
    { label: 'fractional seed', patch: { seed: 0.5 } },
    { label: 'empty identity', patch: { identity: ' ' } },
    { label: 'negative year', patch: { year: -1 } },
    { label: 'fractional year', patch: { year: 1.5 } },
    { label: 'reversed curve', patch: { ageBand: [3, 1] } },
    { label: 'invalid curve', patch: { ageBand: [NaN, 3] } },
    { label: 'missing curve', patch: { ageBand: null } },
    { label: 'zero scale', patch: { declineScale: 0 } },
    { label: 'invalid scale', patch: { declineScale: Infinity } },
  ])('ignores $label without mutation or fields', ({ absent, value, patch }) => {
    const player = fixture();
    const before = structuredClone(player);
    const heldContext = absent ? value : { ...context(player), ...patch };
    expect(advanceClubManagerTrajectory(player, heldContext as ClubManagerTrajectoryContext | null | undefined)).toBe(player);
    expect(player).toEqual(before);
  });

  it.each([
    { patch: { a: NaN } }, { patch: { a: 99 } }, { patch: { r: 39 } },
    { patch: { anchor: NaN } }, { patch: { potential: 69 } }, { patch: { potential: Infinity } },
  ])('ignores a malformed player $patch', ({ patch }) => {
    const player = { ...fixture(), ...patch };
    const before = structuredClone(player);
    expect(advanceClubManagerTrajectory(player, context(fixture()))).toBe(player);
    expect(player).toEqual(before);
  });

  it('uses seed zero and the highest uint32 as genuine saved seeds', () => {
    for (const seed of [0, 4294967295]) {
      const player = fixture();
      const result = advanceClubManagerTrajectory(player, context(player, seed));
      expect(result).not.toBe(player);
      expect(result.a).toBe(player.a + 1);
      expect(result.potential).toBeGreaterThanOrEqual(result.r);
    }
  });

  it.each([{ anchor: 38 }, { anchor: 101 }])('ages a generated slot with finite anchor $anchor without changing its provenance', ({ anchor }) => {
    const player = { ...fixture(), anchor };
    const next = advanceClubManagerTrajectory(player, context(player));
    expect(next.a).toBe(player.a + 1);
    expect(next.anchor).toBe(anchor);
    expect(next.r).toBeGreaterThanOrEqual(40); expect(next.r).toBeLessThanOrEqual(99);
    expect(next.potential).toBeGreaterThanOrEqual(next.r); expect(next.potential).toBeLessThanOrEqual(99);
    expect(next).toEqual({ ...player, a: next.a, r: next.r, potential: next.potential });
  });

  it('preserves complete nondevelopment fields and nested references', () => {
    const player = { ...fixture(), owner: 'Held club', stats: { apps: 24, goals: 4 }, wage: 12000, unavailable: true };
    const before = structuredClone(player);
    Object.freeze(player.stats);
    Object.freeze(player);
    const result = advanceClubManagerTrajectory(player, context(player));
    expect(player).toEqual(before);
    expect(result).toEqual({ ...before, a: result.a, r: result.r, potential: result.potential });
    expect(result.stats).toBe(player.stats);
  });

  it('does not consume global randomness even while producing an entire future world', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('global random read'); });
    try {
      for (const { player, identity } of fullPool()) project(player, 1207, identity, 3);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('replays complete outputs after serialization and arbitrary read order', () => {
    const pool = fullPool();
    const expected = new Map(pool.map(({ player, identity }) => [identity, project(player, 77, identity, 5)]));
    for (const { player, identity } of [...pool].reverse()) {
      const loaded = JSON.parse(JSON.stringify(player)) as ProjectedPlayer;
      expect(project(loaded, 77, identity, 5)).toEqual(expected.get(identity));
    }
  });

  it('holds the trajectory after a destination, display name or squad-order change', () => {
    const player = { ...fixture(), club: 'Original source club' };
    const identity = JSON.stringify(['now', 'Original source club', player.n, player.p, 2004, 0]);
    const original = advanceClubManagerTrajectory(player, context(player, 81, 1, identity));
    const moved = advanceClubManagerTrajectory({ ...player, club: 'Different owner', n: 'Held display name' }, context(player, 81, 1, identity));
    expect({ a: moved.a, r: moved.r, potential: moved.potential }).toEqual({ a: original.a, r: original.r, potential: original.potential });
    expect(moved.club).toBe('Different owner');
    expect(moved.n).toBe('Held display name');
  });

  it('makes both rare development turns reachable without escaping their per-season bounds', () => {
    const player = { ...fixture(), potential: 90 };
    let breakouts = 0;
    let setbacks = 0;
    let unchanged = 0;
    for (let seed = 0; seed < 1024; seed++) {
      const result = advanceClubManagerTrajectory(player, { ...context(player, seed), ageBand: [0, 0] });
      expect(result.a).toBe(player.a + 1);
      expect(result.r).toBeGreaterThanOrEqual(player.r - 3);
      expect(result.r).toBeLessThanOrEqual(player.r + 3);
      if (result.r > player.r) breakouts++;
      else if (result.r < player.r) setbacks++;
      else unchanged++;
    }
    expect(breakouts).toBeGreaterThan(0);
    expect(setbacks).toBeGreaterThan(0);
    expect(unchanged).toBeGreaterThan(0);
    console.log(`TRAJECTORY zero-curve outcomes: ${JSON.stringify({ players: 1024, breakouts, setbacks, unchanged })}`);
  });

  it('respects every source age curve, rating floor and carried potential ceiling', () => {
    const pool = fullPool();
    for (const seed of [0, 7, 31, 1207]) {
      for (const { player, identity } of pool) {
        let held: TrajectoryPlayer = player;
        for (let year = 1; year <= 6; year++) {
          const next = advanceClubManagerTrajectory(held, context(held, seed, year, identity));
          const [low, high] = ageDriftBand(held.a + 1);
          const minimum = (low < 0 ? Math.round(low * declineScale(held.p)) : 0) - 3;
          expect(next.a).toBe(player.a + year);
          expect(next.r - held.r).toBeGreaterThanOrEqual(minimum);
          expect(next.r - held.r).toBeLessThanOrEqual(Math.max(0, high) + 3);
          expect(Number.isInteger(next.r)).toBe(true);
          expect(next.r).toBeGreaterThanOrEqual(40);
          expect(next.r).toBeLessThanOrEqual(99);
          expect(next.potential).toBeGreaterThanOrEqual(next.r);
          expect(next.potential).toBeLessThanOrEqual(99);
          expect(next).toEqual({ ...held, a: next.a, r: next.r, potential: next.potential });
          held = next;
        }
      }
    }
    console.log(`TRAJECTORY bounded player years: ${pool.length * 4 * 6}`);
  }, 60_000);

  it('measures save variety and leader changes across the complete real source pool', () => {
    const pool = fullPool();
    const seeds = [7, 31, 81, 307, 1207, 2026];
    const projected = seeds.map(seed => pool.map(({ player, identity }) => project(player, seed, identity, 5)));
    const byClub = new Map<string, number[]>();
    pool.forEach(({ club }, index) => byClub.set(club, [...(byClub.get(club) ?? []), index]));
    let variedPlayers = 0;
    let changedClubLeaders = 0;
    const drift: Record<string, number> = {};
    pool.forEach(({ player }, index) => {
      const paths = projected.map(rows => `${rows[index].r}:${rows[index].potential}`);
      if (new Set(paths).size > 1) variedPlayers++;
      for (const rows of projected) {
        const delta = String(rows[index].r - player.r);
        drift[delta] = (drift[delta] ?? 0) + 1;
      }
    });
    for (const indices of byClub.values()) {
      const leaders = projected.map(rows => [...indices].sort((a, b) => rows[b].r - rows[a].r || (rows[a].n < rows[b].n ? -1 : rows[a].n > rows[b].n ? 1 : 0))[0]);
      if (new Set(leaders).size > 1) changedClubLeaders++;
    }
    expect(variedPlayers).toBeGreaterThan(0);
    expect(changedClubLeaders).toBeGreaterThan(0);
    expect(Object.values(drift).reduce((total, count) => total + count, 0)).toBe(pool.length * seeds.length);
    console.log(`TRAJECTORY measured real-pool outcomes: ${JSON.stringify({ sourceRows: pool.length, clubs: byClub.size, seeds, years: 5, variedPlayers, changedClubLeaders, drift })}`);
  }, 60_000);
});

describe('save-scoped actual world projections', () => {
  it('keeps the entire season-zero world and objects unchanged for every valid seed', () => {
    const original = projectedWorldFor('now', 0);
    const raw = JSON.stringify(original);
    for (const seed of [0, 31, 4294967295]) {
      expect(projectedWorldFor('now', 0, seed)).toBe(original);
      expect(projectedWorld(0, seed)).toBe(original);
      for (const [club, players] of Object.entries(original)) {
        expect(projectedRoster(club, 0, 'now', seed)).toBe(players);
        expect(players.every(player => player.potential === undefined && player.worldRosterKey === undefined)).toBe(true);
      }
    }
    expect(JSON.stringify(original)).toBe(raw);
  });

  it.each([
    { label: 'absent', seed: undefined }, { label: 'null', seed: null },
    { label: 'negative', seed: -1 }, { label: 'overflow', seed: 4294967296 },
    { label: 'fractional', seed: 0.5 }, { label: 'NaN', seed: NaN },
    { label: 'infinite', seed: Infinity }, { label: 'string', seed: '31' },
  ])('keeps the exact original future cache for a $label seed', ({ seed }) => {
    const original = projectedWorldFor('now', 3);
    const raw = JSON.stringify(original);
    expect(projectedWorldFor('now', 3, seed as number)).toBe(original);
    expect(projectedRoster('Liverpool', 3, 'now', seed as number)).toBe(original.Liverpool);
    expect(JSON.stringify(original)).toBe(raw);
    expect(Object.values(original).flat().every(player => player.potential === undefined && player.worldRosterKey === undefined)).toBe(true);
  });

  it('keeps zero as a distinct valid saved seed and all public reads on its same world', () => {
    const current = projectedWorldFor('now', 2, 0);
    expect(current).not.toBe(projectedWorldFor('now', 2));
    expect(projectedWorld(2, 0)).toBe(current);
    const roster = projectedRoster('Liverpool', 2, 'now', 0);
    expect(roster).toBe(current.Liverpool);
    const ratings = roster.map(player => player.r).sort((a, b) => b - a).slice(0, 11);
    while (ratings.length < 11) ratings.push(60);
    expect(projectedXIAvg('Liverpool', 2, 'now', 0)).toBe(Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / 11 * 10) / 10);
  });

  it('preserves complete worlds through saved seed serialization, reordered reads and interleaved careers without draws', () => {
    const first = projectedWorldFor('now', 5, 307);
    const raw = JSON.stringify(first);
    const source = JSON.stringify(projectedWorldFor('now', 0));
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('A world projection drew global randomness'); });
    try {
      const saved = JSON.parse(JSON.stringify({ worldSeed: 307 }));
      const second = projectedWorldFor('now', 4, 81);
      expect(second).not.toBe(first);
      const copies = Object.keys(first).reverse().map(club => [club, projectedRoster(club, 5, 'now', saved.worldSeed)] as const);
      for (const [club, players] of copies) expect(players).toEqual(first[club]);
      expect(JSON.stringify(projectedWorldFor('now', 5, saved.worldSeed))).toBe(raw);
      expect(JSON.stringify(projectedWorldFor('now', 0, saved.worldSeed))).toBe(source);
      expect(rng).not.toHaveBeenCalled();
    } finally { rng.mockRestore(); }
  }, 60_000);

  it('uses the actual curve and value scale while carrying original identities and simulated ceilings', () => {
    const original = projectedWorldFor('now', 0);
    const actual = projectedWorldFor('now', 1, 31);
    for (const [club, players] of Object.entries(original)) {
      const ratios = players.map(player => player.v / Math.max(0.5, rawCurveValue(player.r, player.a))).sort((a, b) => a - b);
      const scale = ratios[Math.floor(ratios.length / 2)] || 1;
      expect(actual[club]).toHaveLength(players.length);
      for (const player of actual[club]) {
        const identity = JSON.stringify(['now', club, player.n, player.p, 2027 - player.a, player.since]);
        expect(player.worldRosterKey).toBe(identity);
        if (player.g) { expect(player.since).toBe(1); continue; }
        const before = players.find(source => source.n === player.n && source.p === player.p)!;
        expect(before).toBeDefined();
        const expected = advanceClubManagerTrajectory({ ...before, worldRosterKey: identity }, context(before, 31, 1, identity));
        expect(player).toEqual({ ...expected, v: Math.max(0.2, Math.round(rawCurveValue(expected.r, expected.a) * scale * 10) / 10) });
        expect(player.potential).toBeGreaterThanOrEqual(player.r);
      }
    }
  }, 60_000);

  it('measures actual seeded world leader changes without asserting an unmeasured frequency', () => {
    const seeds = [7, 31, 81, 307, 1207, 2026];
    const worlds = seeds.map(seed => projectedWorldFor('now', 5, seed));
    const source = projectedWorldFor('now', 0);
    let variedClubs = 0;
    let changedLeaders = 0;
    let generatedRows = 0;
    const drift: Record<string, number> = {};
    for (const [club, rows] of Object.entries(source)) {
      if (new Set(worlds.map(world => JSON.stringify(world[club]))).size > 1) variedClubs++;
      const leaders = worlds.map(world => [...world[club]].sort((a, b) => b.r - a.r || a.n.localeCompare(b.n))[0]?.worldRosterKey);
      if (new Set(leaders).size > 1) changedLeaders++;
      for (const world of worlds) {
        expect(world[club]).toHaveLength(rows.length);
        for (const player of world[club]) {
          expect(player.a).toBeLessThan(42);
          expect(player.r).toBeGreaterThanOrEqual(40); expect(player.r).toBeLessThanOrEqual(99);
          expect(player.worldRosterKey).toBe(JSON.stringify(['now', club, player.n, player.p, 2031 - player.a, player.since]));
          if (player.g) { generatedRows++; continue; }
          const before = rows.find(row => row.n === player.n && row.p === player.p)!;
          expect(before).toBeDefined();
          const delta = String(player.r - before.r); drift[delta] = (drift[delta] ?? 0) + 1;
        }
      }
    }
    expect(variedClubs).toBeGreaterThan(0); expect(changedLeaders).toBeGreaterThan(0);
    console.log(`TRAJECTORY actual world outcomes: ${JSON.stringify({ clubs: Object.keys(source).length, seeds, years: 5, variedClubs, changedLeaders, generatedRows, drift })}`);
  }, 60_000);
});
