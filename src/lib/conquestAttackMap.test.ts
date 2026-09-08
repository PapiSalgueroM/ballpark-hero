import { describe, expect, it } from 'vitest';
import { makeSoccerAttackSetup } from '@/data/soccerAttack';
import { SOCCER_CLUBS } from '@/data/soccerConquest';
import { CM_ROSTERS, CM_ROSTER_META } from '@/data/clubManagerRosters';
import { checkGenerated, generateMap, makeTeams } from '../../scripts/genSoccerAttackMap.mjs';
import { advanceAttack, createAttack, parseAttackSave, attackOrigin, type Point } from './conquestAttack';
import map from '@/data/soccerAttackMap.json';
import boundary from '../../scripts/data/soccerAttackEngland.json';
import locations from '../../scripts/data/soccerAttackLocations.json';
import clipping from 'polygon-clipping';

const signedArea = (ring: number[][]) => ring.reduce((area, point, index) => {
  const next = ring[(index + 1) % ring.length];
  return area + point[0] * next[1] - next[0] * point[1];
}, 0) / 2;
const pointInRings = (point: number[], rings: number[][][]) => {
  // Winding parity expressed as crossings to the left, independent of generation.
  let crossings = 0;
  for (const ring of rings) for (let i = 0; i < ring.length; i++) {
    const start = ring[i], end = ring[(i + 1) % ring.length];
    if ((start[1] <= point[1] && end[1] > point[1]) || (end[1] <= point[1] && start[1] > point[1])) {
      const x = start[0] + (point[1] - start[1]) * (end[0] - start[0]) / (end[1] - start[1]);
      if (x < point[0]) crossings++;
    }
  }
  return crossings % 2 === 1;
};
const projectedLand = boundary.geometry.coordinates.map(polygon => polygon.map(ring => ring.map(([longitude, latitude]) => [
  (longitude - map.projection.west) * Math.cos(53 * Math.PI / 180) * map.projection.scale,
  (map.projection.north - latitude) * map.projection.scale,
] as Point)));
const landArea = projectedLand.reduce((area, polygon) => area + Math.abs(signedArea(polygon[0])) - polygon.slice(1).reduce((holes, ring) => holes + Math.abs(signedArea(ring)), 0), 0);
// Clipping emits CCW outer rings followed by their CW holes.
const polygonsFor = (regions: { rings: number[][][] }[]) => regions.flatMap(region => {
  const polygons: Point[][][] = [];
  for (const ring of region.rings) {
    if (signedArea(ring) > 0) polygons.push([ring as Point[]]);
    else polygons[polygons.length - 1].push(ring as Point[]);
  }
  return polygons;
});
function checkCoverage(regions: { rings: number[][][] }[]) {
  const area = regions.reduce((sum, region) => sum + region.rings.reduce((sum, ring) => sum + signedArea(ring), 0), 0);
  expect(Math.abs(area - landArea)).toBeLessThan(1e-7);
  const polygons = polygonsFor(regions);
  const union = clipping.union(polygons);
  const missing = clipping.difference(projectedLand, union);
  const outside = clipping.difference(union, projectedLand);
  const areaOf = (polygons: Point[][][]) => polygons.reduce((sum, polygon) => sum + polygon.reduce((sum, ring) => sum + signedArea(ring), 0), 0);
  expect(Math.abs(areaOf(missing))).toBeLessThan(1e-7);
  expect(Math.abs(areaOf(outside))).toBeLessThan(1e-7);
  expect(Math.abs(areaOf(union) - area)).toBeLessThan(1e-7);
}

describe('soccer Attack geographic data', () => {
  it('reproduces checked-in data across Git line endings while rejecting changed geometry', () => {
    expect(() => checkGenerated('{"x":1}\r\n', '{"x":1}\n')).not.toThrow();
    expect(() => checkGenerated('{"x":2}\r\n', '{"x":1}\n')).toThrow('Generated map differs');
  });
  it('extracts only English game identities and ratings at generation time', () => {
    const teams = makeTeams(SOCCER_CLUBS, CM_ROSTERS, map.regions);
    expect(teams).toHaveLength(20);
    expect(teams.flatMap(team => team.players)).toHaveLength(496);
    expect(Object.keys(teams[0].players[0]).sort()).toEqual(['id', 'name', 'originTeam', 'rating']);
  });
  it('enables each English club with its original documented players and value-derived strength', () => {
    const setup = makeSoccerAttackSetup(0);
    const clubs = SOCCER_CLUBS.filter(club => club.country === 'ENG');
    expect(setup.teams).toHaveLength(clubs.length);
    for (const club of clubs) {
      const team = setup.teams.find(team => team.id === club.id)!;
      expect(team.color).toBe(club.color);
      expect(team.overall).toBe(club.overall);
      expect(team.players.map(player => [player.name, player.rating])).toEqual(CM_ROSTERS[club.name].map(player => [player.n, player.r]));
      expect(team.players.every(player => player.originTeam === club.id)).toBe(true);
      expect(setup.regions.filter(region => region.initialOwner === club.id)).toHaveLength(1);
    }
  });

  it('retains a hole and disconnected island when clipping generated territory', () => {
    const boundary = { type: 'MultiPolygon', coordinates: [
      [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [4, 6], [6, 6], [6, 4], [4, 4]]],
      [[[12, 0], [14, 0], [14, 2], [12, 2], [12, 0]]],
    ] };
    const map = generateMap(boundary, [{ id: 'A', ground: 'Ground A', longitude: 2, latitude: 2 }, { id: 'B', ground: 'Ground B', longitude: 8, latitude: 8 }], { neutralSpacing: 0 });
    expect(map.regions).toHaveLength(2);
    expect(map.regions.flatMap(region => region.rings).length).toBeGreaterThan(2);
    const project = ([x, y]: number[]) => [(x - map.projection.west) * Math.cos(53 * Math.PI / 180) * map.projection.scale, (map.projection.north - y) * map.projection.scale];
    expect(map.regions.some(region => pointInRings(project([5, 5]), region.rings))).toBe(false);
    expect(map.regions.some(region => pointInRings(project([13, 1]), region.rings))).toBe(true);
    expect(map.regions.reduce((sum, region) => sum + region.rings.reduce((sum, ring) => sum + signedArea(ring), 0), 0)).toBeCloseTo(1000000 * Math.cos(53 * Math.PI / 180), 7);
  });

  it('covers all pinned land exactly once, including disconnected polygons', () => {
    checkCoverage(map.regions);
    console.log(`Map geometry: land area ${landArea}, summed area error ${Math.abs(map.regions.reduce((area, region) => area + region.rings.reduce((sum, ring) => sum + signedArea(ring), 0), 0) - landArea)}`);
  });

  it('keeps every real home unchanged and inside its own finite nonzero cell', () => {
    for (const region of map.regions) {
      expect(pointInRings(region.anchor, region.rings)).toBe(true);
      expect(region.rings.reduce((sum, ring) => sum + signedArea(ring), 0)).toBeGreaterThan(0);
      for (const ring of region.rings) {
        expect(Math.abs(signedArea(ring))).toBeGreaterThan(0);
        for (const [x, y] of ring) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(map.bounds.width);
          expect(y).toBeLessThanOrEqual(map.bounds.height);
        }
      }
    }
    for (const home of locations.clubs) {
      const region = map.regions.find(region => region.initialOwner === home.id)!;
      expect(region.anchor).toEqual([(home.longitude - map.projection.west) * Math.cos(53 * Math.PI / 180) * map.projection.scale, (map.projection.north - home.latitude) * map.projection.scale]);
    }
  });

  it('negative control catches an omitted land cell', () => {
    const damaged = map.regions.slice(1);
    expect(damaged.length).toBe(map.regions.length - 1);
    expect(() => checkCoverage(damaged)).toThrow();
  });

  it('negative control refuses a home moved offshore', () => {
    const damaged = structuredClone(locations.clubs);
    damaged[0].longitude = 0;
    damaged[0].latitude = 50;
    expect(damaged[0]).not.toEqual(locations.clubs[0]);
    expect(() => generateMap(boundary.geometry, damaged)).toThrow('Home outside England');
  });

  it('negative control refuses an absent original roster and never pads players', () => {
    const original = CM_ROSTERS.Arsenal;
    try {
      CM_ROSTERS.Arsenal = [];
      expect(CM_ROSTERS.Arsenal).not.toEqual(original);
      expect(() => makeTeams(SOCCER_CLUBS, CM_ROSTERS, map.regions)).toThrow('Original roster unavailable');
    } finally { CM_ROSTERS.Arsenal = original; }
  });

  it('returns independent snapshots carrying the roster source date', () => {
    const first = makeSoccerAttackSetup(42);
    const second = makeSoccerAttackSetup(42);
    expect(first).toEqual(second);
    expect(first.dataVersion).toContain(CM_ROSTER_META.generated);
    first.teams[0].players[0].rating = 1;
    first.regions[0].anchor[0] = 0;
    expect(second).toEqual(makeSoccerAttackSetup(42));
  });

  it('completes seeded runs on actual geography without trapped living teams', async () => {
    const seeds = (process.env.ATTACK_MAP_SEEDS ?? '0,1,9,42').split(',').map(Number);
    const timing: number[] = [];
    const phaseTiming: Record<string, number[]> = {};
    let resolutions = 0;
    for (const seed of seeds) {
      let state = createAttack(makeSoccerAttackSetup(seed));
      const transitionBudget = 4 * (state.setup.regions.filter(region => region.initialOwner === null).length + state.teams.length - 1);
      let movedLaunches = 0;
      const started = performance.now();
      while (state.phase !== 'finished' && state.revision < transitionBudget) {
        if (seed === 9) {
          const restored = parseAttackSave(JSON.parse(JSON.stringify(state)));
          expect(restored).toEqual(state);
          expect(advanceAttack(restored!)).toEqual(advanceAttack(state));
        }
        const before = performance.now();
        const phase = state.phase;
        try { state = advanceAttack(state); }
        catch (error) {
          const living = [...new Set(Object.values(state.owners).filter(Boolean))];
          throw new Error(`seed=${seed} revision=${state.revision} team=${state.selectedTeam} living=${living.join(',')} owned=${Object.entries(state.owners).filter(([, owner]) => owner === state.selectedTeam).map(([id]) => id).join(',')}: ${error}`);
        }
        const elapsed = performance.now() - before;
        timing.push(elapsed);
        (phaseTiming[phase] ??= []).push(elapsed);
        if (state.phase === 'direction' && state.originRegion !== state.teams.find(team => team.id === state.selectedTeam)!.homeRegion) {
          movedLaunches++;
          if (seed === 9) console.log(`Seed 9 moved launch: revision=${state.revision} team=${state.selectedTeam} origin=${state.originRegion}`);
        }
        if (state.phase === 'recap') {
          resolutions++;
          if (!state.champion) for (const teamId of new Set(Object.values(state.owners).filter(Boolean))) {
            const hasDirection = attackOrigin(state, teamId!) !== null;
            expect(hasDirection, `Trapped living club seed=${seed} revision=${state.revision} team=${teamId}`).toBe(true);
          }
        }
      }
      expect(state.phase).toBe('finished');
      expect(new Set(Object.values(state.owners))).toEqual(new Set([state.champion]));
      expect(parseAttackSave(state)).toEqual(state);
      if (seed === 9) expect(movedLaunches).toBeGreaterThan(0);
      console.log(`Actual map seed=${seed} champion=${state.champion} revisions=${state.revision} movedLaunches=${movedLaunches} ms=${(performance.now() - started).toFixed(1)} saveBytes=${Buffer.byteLength(JSON.stringify(state))}`);
      // Let the test worker deliver progress between CPU-bound complete games.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    timing.sort((a, b) => a - b);
    console.log(`Actual map runs=${seeds.length} resolutions=${resolutions} transitions=${timing.length} medianMs=${timing[Math.floor(timing.length / 2)].toFixed(2)} p95Ms=${timing[Math.floor(timing.length * 0.95)].toFixed(2)}`);
    for (const [phase, values] of Object.entries(phaseTiming)) {
      values.sort((a, b) => a - b);
      console.log(`Phase ${phase}: count=${values.length} medianMs=${values[Math.floor(values.length / 2)].toFixed(2)} p95Ms=${values[Math.floor(values.length * 0.95)].toFixed(2)}`);
    }
  }, 120000);
});
