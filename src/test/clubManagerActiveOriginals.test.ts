import { beforeAll, describe, expect, it } from 'vitest';
import * as Current from '@/lib/clubManagerEras';
import * as Baseline from './fixtures/clubManagerEras.activeOriginals.baseline';
import type { ProjectedPlayer } from '@/lib/clubManagerEras';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface RawOriginal {
  key: string;
  origin: {
    eraId: string;
    club: string;
    name: string;
    position: ProjectedPlayer['p'];
    birthYear: number;
    since: 0;
  };
  player: ProjectedPlayer;
}

function active(era: string, year: number, seed?: number): RawOriginal[] {
  const fn = (Current as unknown as {
    projectedActiveOriginalsFor?: (era: string, year: number, seed?: number) => RawOriginal[];
  }).projectedActiveOriginalsFor;
  expect(typeof fn, 'CM_ACTIVE_ORIGINALS_API: raw projection view exists').toBe('function');
  return fn!(era, year, seed);
}

function key(era: string, club: string, p: ProjectedPlayer, year: number): string {
  const start = era === 'era2005' ? 2005 : 2026;
  return JSON.stringify([era, club, p.n, p.p, start + year - p.a, p.since]);
}


function canonicalEvidence(): (phase: string, era: string, year: number, seed: number | undefined, body: string) => void {
  const directory = process.env.CM_ACTIVE_WORLD_OUT;
  if (!directory) return () => undefined;
  const role = process.env.CM_ACTIVE_WORLD_ROLE;
  expect(role && /^[a-z0-9-]+$/.test(role), 'CM_ACTIVE_WORLD_EVIDENCE_ROLE').toBe(true);
  expect(path.isAbsolute(directory), 'CM_ACTIVE_WORLD_EVIDENCE_ABSOLUTE').toBe(true);
  expect(fs.existsSync(directory), 'CM_ACTIVE_WORLD_EVIDENCE_FRESH').toBe(false);
  fs.mkdirSync(directory);
  return (phase, era, year, seed, body) => {
    const name = [role, era, seed === undefined ? 'unseeded' : 'seed' + seed, 'year' + year, phase].join('-') + '.json';
    fs.writeFileSync(path.join(directory, name), body, { flag: 'wx' });
  };
}

describe('Club Manager raw active original projections', () => {
  beforeAll(async () => {
    await Promise.all([Current.ensureAllEraRosters(), Baseline.ensureAllEraRosters()]);
  }, 30000);

  it('offers raw originals without claiming seller or career availability', () => {
    const rows = active('era2005', 0);
    const world = Baseline.projectedWorldFor('era2005', 0);
    expect(rows.length, 'CM_ACTIVE_ORIGINALS_FOUNDATION').toBe(Object.values(world).flat().length);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).not.toHaveProperty('club');
      expect(row).not.toHaveProperty('price');
      expect(row).not.toHaveProperty('owner');
      expect(row).not.toHaveProperty('status');
      expect(row.origin).toEqual({
        eraId: 'era2005', club: row.origin.club, name: row.player.n,
        position: row.player.p, birthYear: 2005 - row.player.a, since: 0,
      });
      expect(world[row.origin.club].some(p => p.n === row.player.n && p.p === row.player.p && p.a === row.player.a)).toBe(true);
    }
  });

  it('holds complete canonical worlds against the unchanged baseline before and after raw reads', () => {
    const record = canonicalEvidence();
    for (const era of ['era2005', 'now']) {
      for (const seed of [undefined, 31]) {
        const years = [0, 3, 5, 10, ...(era === 'now' && seed === undefined ? [20, 30] : [])];
        for (const year of years) {
          const expected = JSON.stringify(Baseline.projectedWorldFor(era, year, seed));
          const before = JSON.stringify(Current.projectedWorldFor(era, year, seed));
          record('baseline', era, year, seed, expected);
          record('before', era, year, seed, before);
          expect(before === expected,
            'CM_ACTIVE_CANONICAL_BEFORE ' + [era, seed, year].join('/')).toBe(true);
          active(era, year, seed);
          const after = JSON.stringify(Current.projectedWorldFor(era, year, seed));
          record('after', era, year, seed, after);
          expect(after === expected,
            'CM_ACTIVE_CANONICAL_AFTER ' + [era, seed, year].join('/')).toBe(true);
        }
      }
    }
  }, 90000);

  it('keeps the reported young original discoverable without restoring him to the modeled club', () => {
    const identity = '["era2005","Barcelona","Lionel Messi","RW",1988,0]';
    for (const seed of [undefined, 31]) {
      for (const year of [2, 3]) {
        expect(Baseline.projectedWorldFor('era2005', year, seed).Barcelona
          .filter(p => p.n === 'Lionel Messi' && p.g !== true)).toHaveLength(0);
        const rows = active('era2005', year, seed).filter(row => row.key === identity);
        expect(rows, 'CM_ACTIVE_YOUNG_REMAINS').toHaveLength(1);
        expect(rows[0].player).toMatchObject({ n: 'Lionel Messi', p: 'RW', a: 17 + year, since: 0 });
        expect(rows[0].player.g).toBeUndefined();
        expect(Current.projectedWorldFor('era2005', year, seed).Barcelona
          .filter(p => p.n === 'Lionel Messi' && p.g !== true)).toHaveLength(0);
      }
    }
  }, 30000);

  it('removes originals at true retirement instead of creating replacement records', () => {
    const identity = '["era2005","Barcelona","Lionel Messi","RW",1988,0]';
    for (const seed of [undefined, 31]) {
      expect(active('era2005', 3, seed).filter(row => row.key === identity)).toHaveLength(1);
      expect(active('era2005', 25, seed).filter(row => row.key === identity),
        'CM_ACTIVE_TRUE_RETIREMENT: age42 is terminal').toHaveLength(0);
      expect(active('era2005', 60, seed), 'CM_ACTIVE_NO_REPLACEMENTS_AFTER_ALL_ORIGINAL_RETIREMENTS').toHaveLength(0);
    }
  }, 60000);

  it('contains only source originals even while canonical worlds generate replacements', () => {
    for (const era of ['era2005', 'now']) {
      const originals = new Set(active(era, 0).map(row => row.key));
      for (const seed of [undefined, 31]) {
        const canonical = Baseline.projectedWorldFor(era, 5, seed);
        expect(Object.values(canonical).flat().filter(p => p.g === true).length,
          'CM_ACTIVE_GENERATED_FOUNDATION').toBeGreaterThan(0);
        const rows = active(era, 5, seed);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(originals.has(row.key), 'CM_ACTIVE_ORIGINAL_SOURCE_ONLY').toBe(true);
          expect(row.player.g).toBeUndefined();
          expect(row.player.since).toBe(0);
        }
      }
    }
  }, 30000);

  it('preserves distinct existing namesakes and their source identity anchors', () => {
    const world = Baseline.projectedWorldFor('now', 0);
    const byName = new Map<string, { club: string; player: ProjectedPlayer }[]>();
    for (const [club, roster] of Object.entries(world)) {
      for (const player of roster) {
        const group = byName.get(player.n) ?? [];
        group.push({ club, player }); byName.set(player.n, group);
      }
    }
    const pair = [...byName.values()].find(group => group.length > 1
      && new Set(group.map(row => key('now', row.club, row.player, 0))).size === group.length);
    expect(pair, 'CM_ACTIVE_NAMESAKE_FOUNDATION: actual distinct source identities').toBeDefined();
    const rows = active('now', 0).filter(row => row.player.n === pair![0].player.n);
    const expected = pair!.map(row => key('now', row.club, row.player, 0)).sort();
    expect(rows.map(row => row.key).sort(), 'CM_ACTIVE_NAMESAKES_NOT_COLLAPSED').toEqual(expected);
    expect(new Set(rows.map(row => row.key)).size).toBe(rows.length);
    for (const row of rows) {
      expect(JSON.parse(row.key)).toEqual([
        'now', row.origin.club, row.origin.name, row.origin.position, row.origin.birthYear, 0,
      ]);
    }
  });

  it('shares the exact development bodies of originals that remain in the canonical world', () => {
    for (const era of ['era2005', 'now']) {
      for (const seed of [undefined, 31]) {
        const raw = new Map(active(era, 3, seed).map(row => [row.key, row]));
        let compared = 0;
        for (const [club, roster] of Object.entries(Baseline.projectedWorldFor(era, 3, seed))) {
          for (const player of roster.filter(p => p.g !== true)) {
            const found = raw.get(key(era, club, player, 3));
            expect(found, 'CM_ACTIVE_SHARED_ORIGINAL_FOUND').toBeDefined();
            expect(found!.player, 'CM_ACTIVE_SHARED_DEVELOPMENT').toEqual(player);
            if (seed !== undefined) expect(found!.player.worldRosterKey).toBe(found!.key);
            compared++;
          }
        }
        expect(compared).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('keeps year-zero seed normalization and returns isolated raw records', () => {
    const original = active('era2005', 0);
    const snapshot = JSON.stringify(original);
    expect(active('era2005', 0, 31)).toEqual(original);
    expect(active('era2005', -1, 31)).toEqual(original);
    expect(active('era2005', 1.49, 31)).toEqual(active('era2005', 1, 31));
    expect(active('era2005', 3, -1)).toEqual(active('era2005', 3));
    expect(active('era2005', 3, 1.5)).toEqual(active('era2005', 3));
    original[0].origin.club = 'Changed test-owned origin';
    original[0].player.n = 'Changed test-owned name';
    original[0].player.r = -1;
    expect(JSON.stringify(active('era2005', 0)), 'CM_ACTIVE_FRESH_READ_ISOLATION').toBe(snapshot);
    expect(JSON.stringify(Current.projectedWorldFor('era2005', 0)))
      .toBe(JSON.stringify(Baseline.projectedWorldFor('era2005', 0)));
  }, 30000);
});

