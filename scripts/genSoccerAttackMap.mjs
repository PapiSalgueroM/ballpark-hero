import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Delaunay } from 'd3-delaunay';
import clipping from 'polygon-clipping';
import { transpileModule, ModuleKind } from 'typescript';

const root = new URL('../', import.meta.url);
const sourceUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_map_subunits.geojson';
const boundaryPath = new URL('scripts/data/soccerAttackEngland.json', root);
const locationsPath = new URL('scripts/data/soccerAttackLocations.json', root);
const hash = text => createHash('sha256').update(text).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, JSON.stringify(value) + '\n');

export function checkGenerated(actual, expected) {
  if (actual.replace(/\r\n/g, '\n') !== expected) throw new Error('Generated map differs. Run node scripts/genSoccerAttackMap.mjs.');
}

export function contains(point, rings) {
  let found = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) found = !found;
  }
  return found;
}

export function makeTeams(clubs, rosters, regions) {
  return clubs.filter(club => club.country === 'ENG').map(club => {
    // English club names match the documented roster keys directly.
    const roster = rosters[club.name];
    if (!roster?.length || roster.some(player => !player.n.trim() || !Number.isFinite(player.r) || player.r < 1 || player.r > 99)) throw new Error(`Original roster unavailable: ${club.name}`);
    const homes = regions.filter(region => region.initialOwner === club.id);
    if (homes.length !== 1) throw new Error(`Verified home unavailable: ${club.name}`);
    return { id: club.id, name: club.name, color: club.color, overall: club.overall, homeRegion: homes[0].id,
      players: roster.map((player, index) => ({ id: `${club.id}:${index}`, name: player.n, rating: player.r, originTeam: club.id })) };
  });
}

export function generateMap(boundary, locations, { neutralSpacing = 90 } = {}) {
  const points = boundary.coordinates.flat(2);
  const west = Math.min(...points.map(p => p[0]));
  const east = Math.max(...points.map(p => p[0]));
  const south = Math.min(...points.map(p => p[1]));
  const north = Math.max(...points.map(p => p[1]));
  // Local equirectangular projection, fixed standard parallel and north-up axes.
  const xScale = Math.cos(53 * Math.PI / 180);
  const scale = 1000 / (north - south);
  const project = ([longitude, latitude]) => [(longitude - west) * xScale * scale, (north - latitude) * scale];
  const bounds = { width: (east - west) * xScale * scale, height: 1000 };
  const land = boundary.coordinates.map(polygon => polygon.map(ring => ring.map(project)));
  const outline = land.flat();
  const sites = locations.map(location => ({ id: `ENG_${location.id}`, name: location.ground, anchor: project([location.longitude, location.latitude]), initialOwner: location.id }));
  if (new Set(sites.map(site => site.id)).size !== sites.length) throw new Error('Duplicate home identity.');
  for (const site of sites) if (!contains(site.anchor, outline)) throw new Error(`Home outside England: ${site.id}`);
  // Fixed offset lattice supplies neutral game areas without invented place names.
  if (neutralSpacing > 0) for (let y = neutralSpacing / 2; y < bounds.height; y += neutralSpacing) {
    for (let x = neutralSpacing / 2; x < bounds.width; x += neutralSpacing) {
      const anchor = [x, y];
      if (contains(anchor, outline) && sites.every(site => Math.hypot(x - site.anchor[0], y - site.anchor[1]) >= neutralSpacing * 0.45)) {
        const number = sites.length - locations.length + 1;
        sites.push({ id: `ENG_N${number}`, name: `Neutral area ${number}`, anchor, initialOwner: null });
      }
    }
  }
  const voronoi = Delaunay.from(sites.map(site => site.anchor)).voronoi([0, 0, bounds.width, bounds.height]);
  const regions = sites.map((site, index) => {
    const polygons = clipping.intersection(land, [voronoi.cellPolygon(index)]);
    const rings = polygons.flat().map(ring => ring.slice(0, -1));
    if (!rings.length || !contains(site.anchor, rings)) throw new Error(`Home lost by clipping: ${site.id}`);
    return { ...site, rings };
  });
  return { bounds, projection: { kind: 'equirectangular', standardParallel: 53, west, north, scale }, outline: outline.map(ring => ring.slice(0, -1)), regions };
}

async function main() {
  if (process.argv.includes('--import-locations')) {
    const research = await readFile(new URL('docs/conquest-premier-locations-2026-09-07.md', root), 'utf8');
    const rows = research.split('\n').filter(line => /^\| [A-Z]{3} \|/.test(line) && line.includes('[Official]'));
    const clubs = rows.map(row => {
      const [, id, club, ground, latitude, longitude, officialLocation, sources] = row.split('|').map(cell => cell.trim());
      const official = sources.slice(sources.indexOf('[Official](') + 11, sources.indexOf('), [Coordinates]'));
      const coordinates = sources.slice(sources.indexOf('[Coordinates](') + 14, sources.indexOf('), [Check]'));
      const check = sources.slice(sources.indexOf('[Check](') + 8, -1);
      return { id, club, ground, latitude: Number(latitude), longitude: Number(longitude), officialLocation, sources: { official, coordinates, check } };
    });
    if (clubs.length !== 20 || clubs.some(club => Object.values(club.sources).some(url => !url.startsWith('https://')))) throw new Error('Location research import failed.');
    await writeJson(locationsPath, { verified: '2026-09-07', precisionMetres: 100, research: 'docs/conquest-premier-locations-2026-09-07.md', researchSha256: hash(research), clubs });
  }
  if (process.argv.includes('--fetch-boundary')) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Boundary fetch: ${response.status}`);
    const source = await response.text();
    const selected = JSON.parse(source).features.filter(feature => feature.properties.SUBUNIT === 'England');
    if (selected.length !== 1 || selected[0].geometry.type !== 'MultiPolygon') throw new Error('Boundary selection failed.');
    const geometry = selected[0].geometry;
    await writeJson(boundaryPath, { source: sourceUrl, version: 'Natural Earth 5.1.2', license: 'Public domain', licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/', selection: 'SUBUNIT=England', sourceSha256: hash(source), geometrySha256: hash(JSON.stringify(geometry)), geometry });
  }
  const boundary = await readJson(boundaryPath);
  if (hash(JSON.stringify(boundary.geometry)) !== boundary.geometrySha256) throw new Error('Boundary hash mismatch.');
  const locations = await readJson(locationsPath);
  const map = generateMap(boundary.geometry, locations.clubs);
  const modules = await Promise.all(['src/data/soccerConquest.ts', 'src/data/clubManagerRosters.ts'].map(async path => {
    const source = await readFile(new URL(path, root), 'utf8');
    const javascript = transpileModule(source, { compilerOptions: { module: ModuleKind.ESNext } }).outputText;
    return { path, sha256: hash(source.replace(/\r\n/g, '\n')), data: await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`) };
  }));
  const [{ data: soccer }, { data: rosters }] = modules;
  const values = await readJson(new URL('scripts/data/soccerConquestValues.json', root));
  const teams = makeTeams(soccer.SOCCER_CLUBS, rosters.CM_ROSTERS, map.regions);
  const output = { dataVersion: `eng-attack-v1:grounds-${locations.verified}:ne-5.1.2:rosters-${rosters.CM_ROSTER_META.generated}:values-${values.pulledAt}`, boundarySha256: boundary.geometrySha256,
    sources: modules.map(({ path, sha256 }) => ({ path, sha256 })), teams, ...map };
  const target = new URL('src/data/soccerAttackMap.json', root);
  const encoded = JSON.stringify(output) + '\n';
  if (process.argv.includes('--check')) {
    checkGenerated(await readFile(target, 'utf8'), encoded);
  } else await writeFile(target, encoded);
  console.log(`England Attack map: ${locations.clubs.length} homes, ${map.regions.length} regions, ${map.regions.flatMap(region => region.rings.flat()).length} vertices, ${Buffer.byteLength(encoded)} bytes.`);
  console.log(`Boundary SHA-256: ${boundary.geometrySha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
