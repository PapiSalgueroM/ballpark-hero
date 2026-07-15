import fs from 'fs';
import * as topojson from 'topojson-client';
import { geoNaturalEarth1 } from 'd3-geo';
import wc from 'world-countries';

const world = JSON.parse(fs.readFileSync('./node_modules/world-atlas/countries-110m.json', 'utf8'));
const feats = topojson.feature(world, world.objects.countries).features
  .filter(f => (f.properties?.name || '') !== 'Antarctica');

const byN3 = new Map(wc.map(c => [c.ccn3, c]));
const W = 1000, H = 540;
const proj = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features: feats });

const NAME_ISO = { 'Kosovo': ['xk', 'Europe', ''], 'Somaliland': null, 'N. Cyprus': null };
function contOf(c) {
  if (!c) return null;
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'samerica' : 'namerica';
  if (c.region === 'Africa') return 'africa';
  if (c.region === 'Europe') return 'europe';
  if (c.region === 'Asia' || c.region === 'Oceania') return 'asia';
  return null;
}
const round = v => Math.round(v * 10) / 10;

function ringGeoCentroid(ring) { // rough lon/lat centroid pre-projection
  let sx = 0, sy = 0;
  for (const [lon, lat] of ring) { sx += lon; sy += lat; }
  return [sx / ring.length, sy / ring.length];
}

const WINDOWS = {
  europe:  { lon: [-25, 45],  lat: [34, 71.5] },
  samerica:{ lon: [-82, -34], lat: [-56, 13] },
  namerica:{ lon: [-168, -52],lat: [7, 74] },
  africa:  { lon: [-18, 52],  lat: [-35, 38] },
  asia:    { lon: [33, 179],  lat: [-47, 56] },
};

const countries = [];
const viewPts = { europe: [], samerica: [], namerica: [], africa: [], asia: [] };

for (const f of feats) {
  const name = f.properties?.name || '';
  let entry = byN3.get(String(f.id).padStart(3, '0'));
  let iso, cont;
  if (entry) { iso = entry.cca2.toLowerCase(); cont = contOf(entry); }
  else if (name in NAME_ISO) {
    const sp = NAME_ISO[name];
    if (!sp) continue;
    iso = sp[0]; cont = 'europe';
  } else { continue; }
  if (!cont) continue;

  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  let sumX = 0, sumY = 0, nPts = 0, best = null, bestArea = -1;
  for (const poly of polys) {
    const outer = poly[0]; // outer ring only; 110m holes negligible (Lesotho handled by draw order)
    const [glon, glat] = ringGeoCentroid(outer);
    const pts = [];
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const pt of outer) {
      const p = proj(pt);
      if (!p) continue;
      const x = round(p[0]), y = round(p[1]);
      const last = pts[pts.length - 1];
      if (last && last[0] === x && last[1] === y) continue;
      pts.push([x, y]);
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    if (pts.length < 4) continue;
    const diag = Math.hypot(maxx - minx, maxy - miny);
    if (diag < 2.2) continue; // unhittable specks
    rings.push(pts);
    let minLon = 1e9, maxLon = -1e9;
    for (const [lon] of outer) { if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon; }
    const datelineArtifact = (maxx - minx) > 420 || (maxLon - minLon) > 300;
    const area = (maxx - minx) * (maxy - miny);
    if (area > bestArea) { bestArea = area; best = { minx, miny, maxx, maxy }; }
    for (const [x, y] of pts) { sumX += x; sumY += y; nPts++; }
    // contribute to continent view bboxes only if ring is geographically inside the window
    for (const [k, wdw] of Object.entries(WINDOWS)) {
      if (!datelineArtifact && glon >= wdw.lon[0] && glon <= wdw.lon[1] && glat >= wdw.lat[0] && glat <= wdw.lat[1]) {
        viewPts[k].push([minx, miny], [maxx, maxy]);
      }
    }
  }
  if (!rings.length) continue;
  // centroid: center of the LARGEST ring bbox (label anchor), not the multipoly average
  const cx = round((best.minx + best.maxx) / 2), cy = round((best.miny + best.maxy) / 2);
  countries.push({ iso, name, continent: cont, cx, cy, rings });
}

const views = {};
for (const [k, pts] of Object.entries(viewPts)) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const [x, y] of pts) {
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const pad = 14;
  minx = Math.max(0, minx - pad); miny = Math.max(0, miny - pad);
  maxx = Math.min(W, maxx + pad); maxy = Math.min(H, maxy + pad);
  views[k] = { x: round(minx), y: round(miny), w: round(maxx - minx), h: round(maxy - miny) };
}

let ts = `// AUTO-GENERATED from Natural Earth 110m (world-atlas) via d3-geo naturalEarth1
// projection fitted to ${W}x${H}. Rings are projected outer boundaries, 0.1px
// precision. Regenerate with docs/scripts (see session log) rather than hand-editing.
export type Continent = 'europe' | 'samerica' | 'namerica' | 'africa' | 'asia';

export interface GeoCountry {
  iso: string;            // ISO 3166-1 alpha-2, lowercase (flagcdn-compatible)
  name: string;
  continent: Continent;
  cx: number;             // label anchor (largest landmass center)
  cy: number;
  rings: number[][][];    // multipolygon outer rings, projected px
}

export const WORLD_W = ${W};
export const WORLD_H = ${H};

export const CONTINENT_VIEWS: Record<Continent, { x: number; y: number; w: number; h: number }> = ${JSON.stringify(views)};

export const GEO_COUNTRIES: GeoCountry[] = [
`;
for (const c of countries) {
  ts += `  { iso: ${JSON.stringify(c.iso)}, name: ${JSON.stringify(c.name)}, continent: '${c.continent}', cx: ${c.cx}, cy: ${c.cy}, rings: ${JSON.stringify(c.rings)} },\n`;
}
ts += `];\n`;
fs.writeFileSync('out.ts', ts);
console.log('countries:', countries.length, 'bytes:', ts.length);
console.log('views:', JSON.stringify(views));
for (const probe of ['br', 'gb', 'fr', 'jp', 'us', 'au', 'xk', 'es', 'ar']) {
  const c = countries.find(q => q.iso === probe);
  console.log(probe, c ? `${c.name} ${c.continent} rings=${c.rings.length} cx=${c.cx} cy=${c.cy}` : 'MISSING');
}
