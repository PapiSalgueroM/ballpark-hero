import { WORLD_W, type GeoCountry } from '@/data/worldMapGeo';

/**
 * Pure geometry for the projected world basemap: rings in, SVG path out.
 *
 * Extracted from dartMap.ts in Round 358 so Soccer Conquest can draw the same
 * 173 countries without importing the dart draft engine, which pulls in
 * Supabase, the squad builder and the enrichment tables. Nothing here talks to
 * the network or knows about any game; dartMap re-exports it so there is still
 * exactly one implementation of the seam handling.
 *
 * The seam is the part worth keeping: a country crossing the antimeridian
 * (Russia, Fiji) arrives as a single ring whose points jump the full width of
 * the map, and drawing that ring naively paints a stripe across the world.
 */

export interface Bounds { minx: number; miny: number; maxx: number; maxy: number; area: number }

function splitAtSeam(ring: number[][]): number[][][] {
  const jumps: number[] = [];
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > WORLD_W / 2) jumps.push(i);
  }
  if (jumps.length === 0) return [ring];
  const starts = [0, ...jumps];
  const segs: number[][][] = [];
  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : ring.length;
    segs.push(ring.slice(from, to));
  }
  // The ring is cyclic, so the last segment continues into the first: merge.
  if (segs.length > 1) {
    const last = segs.pop()!;
    segs[0] = [...last, ...segs[0]];
  }
  return segs.filter(s => s.length >= 3);
}

const unwrappedCache = new Map<string, number[][][]>();

export function unwrappedRings(c: GeoCountry): number[][][] {
  let r = unwrappedCache.get(c.iso);
  if (r) return r;
  r = c.rings
    .flatMap(splitAtSeam)
    .filter(ring => {
      // Belt and braces: drop any near-flat ultra-wide ribbon that still
      // slips through (projection garbage, never real geography).
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const [x, y] of ring) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
      return !(maxx - minx > 150 && maxy - miny < 12);
    });
  unwrappedCache.set(c.iso, r);
  return r;
}

const boundsCache = new Map<string, Bounds>();

export function boundsOf(c: GeoCountry): Bounds {
  let b = boundsCache.get(c.iso);
  if (b) return b;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const ring of unwrappedRings(c)) {
    for (const [x, y] of ring) {
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
  }
  b = { minx, miny, maxx, maxy, area: (maxx - minx) * (maxy - miny) };
  boundsCache.set(c.iso, b);
  return b;
}

const pathCache = new Map<string, string>();

export function pathOf(c: GeoCountry): string {
  let p = pathCache.get(c.iso);
  if (p) return p;
  const rings = unwrappedRings(c);
  const b = boundsOf(c);
  const draw = (dx: number) =>
    rings
      .map(ring => 'M' + ring.map(pt => `${Math.round((pt[0] + dx) * 10) / 10},${pt[1]}`).join('L') + 'Z')
      .join('');
  p = draw(0);
  if (b.maxx > WORLD_W) p += draw(-WORLD_W);
  if (b.minx < 0) p += draw(WORLD_W);
  pathCache.set(c.iso, p);
  return p;
}
