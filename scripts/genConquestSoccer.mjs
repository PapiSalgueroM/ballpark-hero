/**
 * Round 358: builds src/data/conquestDataSoccer.ts for Soccer Conquest.
 *
 * Everything here is DERIVED from data the repo already ships, because a hand
 * typed field is a hand typed opinion that goes stale silently:
 *
 *   FALLBACK_CLUBS (src/lib/soccerCareerEngine.ts)  190 clubs, country + tier + colour
 *   STRENGTH_PRIORS (src/lib/clubManager.ts)        considered club ratings
 *   GEO_COUNTRIES (src/data/worldMapGeo.ts)         173 projected country territories
 *
 * Three rules, and the reasons they are these rules rather than the obvious ones:
 *
 * 1. ONE CLUB PER COUNTRY, because the territory unit is the country. Sixteen
 *    English clubs on a world map would give England sixteen owners and the map
 *    would read as nonsense. The representative is the country's highest rated
 *    club where the priors know it, else its best tier, ties alphabetical so the
 *    pick is deterministic rather than incidental.
 *
 * 2. THE FIELD IS APPORTIONED BY CONTINENT, by largest remainder over how many
 *    countries each continent actually has on the map. Picking the 32 best clubs
 *    instead puts 18 of them in Europe and hands one African club 30 countries at
 *    kickoff, measured. A world map whose field is half European is not a world map.
 *
 * 3. EVERY OTHER COUNTRY GOES TO THE NEAREST CONTESTANT ON ITS OWN CONTINENT,
 *    by projected distance between the basemap's own label anchors. This is the
 *    NHL map's nearest-arena rule with the arena swapped for a home country. The
 *    projection distorts distance, which is fine for a starting map and is said
 *    out loud rather than hidden.
 *
 * The output is baked rather than computed in the browser so the page prerenders
 * to a stable document. simConquestSoccer re-derives all of it and fails if the
 * shipped file disagrees, so the bake cannot drift away from its sources.
 *
 * Run: node scripts/genConquestSoccer.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readSources(root = ROOT) {
  const eng = fs.readFileSync(path.join(root, 'src/lib/soccerCareerEngine.ts'), 'utf8');
  const cs = eng.indexOf('export const FALLBACK_CLUBS');
  if (cs < 0) throw new Error('FALLBACK_CLUBS not found in soccerCareerEngine.ts');
  const clubBlock = eng.slice(cs, eng.indexOf('\n];', cs));
  const clubs = [...clubBlock.matchAll(
    /\{ id: "([^"]+)", name: "([^"]+)", country: "([^"]+)", tier: (\d+), color: "([^"]+)"(?:, league: "([^"]+)")? \}/g,
  )].map(m => ({ id: m[1], name: m[2], country: m[3], tier: +m[4], color: m[5], league: m[6] ?? null }));
  if (clubs.length < 150) throw new Error(`only parsed ${clubs.length} clubs, the source shape moved`);

  const cm = fs.readFileSync(path.join(root, 'src/lib/clubManager.ts'), 'utf8');
  const ps = cm.indexOf('const STRENGTH_PRIORS');
  if (ps < 0) throw new Error('STRENGTH_PRIORS not found in clubManager.ts');
  const priorBlock = cm.slice(ps, cm.indexOf('\n};', ps));
  const priors = new Map([...priorBlock.matchAll(/'([^']+)':\s*(\d+)/g)].map(m => [m[1], +m[2]]));
  if (priors.size < 100) throw new Error(`only parsed ${priors.size} priors, the source shape moved`);

  const geoSrc = fs.readFileSync(path.join(root, 'src/data/worldMapGeo.ts'), 'utf8');
  const geo = [...geoSrc.matchAll(
    /\{ iso: "([a-z-]+)", name: "([^"]+)", continent: '([a-z]+)', cx: ([-\d.]+), cy: ([-\d.]+)/g,
  )].map(m => ({ iso: m[1], name: m[2], continent: m[3], cx: +m[4], cy: +m[5] }));
  if (geo.length < 150) throw new Error(`only parsed ${geo.length} countries, the source shape moved`);

  return { clubs, priors, geo };
}

/** The club data names football nations; the basemap names sovereign states. */
export const COUNTRY_ALIAS = {
  'England': 'United Kingdom',
  'USA': 'United States of America',
  'Czech Republic': 'Czechia',
  'UAE': 'United Arab Emirates',
  'DR Congo': 'Dem. Rep. Congo',
};

/**
 * Football nations the basemap cannot give a territory of their own. The home
 * nations share the UK, which England holds as the highest rated of them, and
 * Monaco is a microstate the 110m basemap does not draw. Listed rather than
 * silently dropped so the next person knows it was a decision.
 */
export const NO_TERRITORY = ['Scotland', 'Wales', 'Northern Ireland', 'Monaco'];

export const FIELD_SIZE = 32;
const TIER_BAND = { 1: 86, 2: 79, 3: 74, 4: 69 };

export function deriveField({ clubs, priors, geo }) {
  const geoByName = new Map(geo.map(g => [g.name, g]));
  const byCountry = new Map();
  for (const c of clubs) {
    if (!byCountry.has(c.country)) byCountry.set(c.country, []);
    byCountry.get(c.country).push(c);
  }

  const nations = [];
  for (const [country, list] of byCountry) {
    if (NO_TERRITORY.includes(country)) continue;
    const terr = geoByName.get(COUNTRY_ALIAS[country] ?? country);
    if (!terr) continue;
    const rated = list.map(c => ({ c, prior: priors.get(c.name) }));
    const withPrior = rated.filter(r => r.prior !== undefined);
    const pick = withPrior.length
      ? withPrior.sort((a, b) => b.prior - a.prior || a.c.name.localeCompare(b.c.name))[0]
      : rated.sort((a, b) => a.c.tier - b.c.tier || a.c.name.localeCompare(b.c.name))[0];
    nations.push({
      country, iso: terr.iso, continent: terr.continent,
      club: pick.c,
      overall: pick.prior ?? TIER_BAND[pick.c.tier],
      ratedBy: pick.prior !== undefined ? 'prior' : 'tier',
    });
  }

  // Largest remainder apportionment across continents.
  const contCounts = {};
  for (const g of geo) contCounts[g.continent] = (contCounts[g.continent] || 0) + 1;
  const conts = Object.keys(contCounts).sort();
  const quota = conts.map(c => ({ c, q: (contCounts[c] / geo.length) * FIELD_SIZE }));
  const seats = {};
  for (const { c, q } of quota) seats[c] = Math.floor(q);
  let left = FIELD_SIZE - Object.values(seats).reduce((a, b) => a + b, 0);
  for (const { c } of [...quota].sort((a, b) => (b.q % 1) - (a.q % 1) || a.c.localeCompare(b.c))) {
    if (left <= 0) break;
    seats[c] += 1; left -= 1;
  }

  const field = [];
  for (const c of conts) {
    const pool = nations.filter(n => n.continent === c)
      .sort((a, b) => b.overall - a.overall || a.country.localeCompare(b.country));
    if (pool.length < seats[c]) throw new Error(`${c} has ${pool.length} eligible nations for ${seats[c]} seats`);
    field.push(...pool.slice(0, seats[c]));
  }
  field.sort((a, b) => b.overall - a.overall || a.country.localeCompare(b.country));
  return { field, seats };
}

/* ---------------- map colours ----------------
 *
 * The club colours in FALLBACK_CLUBS are real and worth keeping, but they were
 * chosen for a career game where two clubs are never drawn side by side. On a
 * map, colour IS the ownership signal, and measured on the real field they
 * collide badly: Wydad Casablanca and Asante Kotoko are both #D6202B and both in
 * Africa, three more African clubs share #FBC403, and 65 pairs sit within 40 of
 * each other in RGB. That map cannot be read.
 *
 * So each club keeps its true colour for chips and tiles, and gets a SEPARATE
 * derived mapColor for territory fill. The derivation spreads the field evenly
 * around the hue wheel IN THE ORDER OF THEIR TRUE HUES, so reds stay near reds
 * and a club never lands somewhere absurd, then alternates lightness between two
 * bands so that neighbours in hue also differ in brightness. The rotation offset
 * is the one that moves the whole field least.
 */
function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgbToHex([r, g, b]) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
function rgbToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
export function rgbDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Two approaches were built and measured before this one was kept.
 *
 * Keeping each club's true hue and separating by lightness alone FAILED, and
 * measurably: the true hues cluster hard on red and blue, the nudge-apart pass
 * cascades, and it finished at a minimum pairwise distance of 3.0 with Esperance
 * and Saint George almost identical and both in Africa. Worse than the disease.
 *
 * Spreading the field evenly around the wheel, in the order of their true hues,
 * reaches 35.8 and is genuinely legible. Its cost is hue drift: with eight reds
 * crowding, Bayern Munich lands on purple.
 *
 * That cost is paid, because thirty-two mutually distinguishable colours is at
 * the edge of what anyone can perceive and legibility is the requirement here.
 * What removes the confusion is that the drifted colour is used EVERYWHERE in
 * this game, tiles and chips included, so nothing on the page ever shows a club
 * in two different colours. Inside Soccer Conquest, this simply is the club's
 * colour, the way a board game hands you a set of pieces. The club's real colour
 * is still recorded on every row as sourceColor.
 */
export function deriveMapColors(field) {
  const n = field.length;
  const step = 360 / n;
  const withHue = field
    .map(f => ({ id: f.club.id, hsl: rgbToHsl(f.club.color) }))
    .sort((a, b) => a.hsl.h - b.hsl.h || a.id.localeCompare(b.id));

  // Rotate the evenly spaced ring to wherever it disturbs the true hues least.
  const circ = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  let bestOffset = 0, bestCost = Infinity;
  for (let o = 0; o < 360; o += 1) {
    let cost = 0;
    for (let i = 0; i < n; i++) cost += circ(o + i * step, withHue[i].hsl.h);
    if (cost < bestCost) { bestCost = cost; bestOffset = o; }
  }

  const out = {};
  for (let i = 0; i < n; i++) {
    const h = bestOffset + i * step;
    // Saturation kept vivid but not neon; lightness alternates so that
    // neighbours on the wheel also separate by brightness, not hue alone.
    const s = Math.max(0.5, Math.min(0.8, withHue[i].hsl.s || 0.65));
    const l = i % 2 === 0 ? 0.40 : 0.62;
    out[withHue[i].id] = hslToHex(h, s, l);
  }
  return out;
}

export function minPairDistance(colors) {
  const vals = Object.values(colors);
  let min = Infinity, pair = null;
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      const d = rgbDistance(vals[i], vals[j]);
      if (d < min) { min = d; pair = [vals[i], vals[j]]; }
    }
  }
  return { min, pair };
}

export function deriveTerritories(field, geo) {
  const home = new Map(field.map(n => [n.iso, n.club.id]));
  const owners = {};
  for (const g of geo) {
    if (home.has(g.iso)) { owners[g.iso] = home.get(g.iso); continue; }
    const pool = field.filter(n => n.continent === g.continent);
    if (!pool.length) throw new Error(`continent ${g.continent} fields nobody, ${g.iso} cannot be assigned`);
    const anchor = new Map(geo.map(x => [x.iso, x]));
    let best = null, bestD = Infinity;
    for (const n of pool) {
      const a = anchor.get(n.iso);
      const d = (a.cx - g.cx) ** 2 + (a.cy - g.cy) ** 2;
      if (d < bestD) { bestD = d; best = n; }
    }
    owners[g.iso] = best.club.id;
  }
  return owners;
}

function render(field, owners, seats, geo, colors, minPair) {
  const contLine = Object.keys(seats).sort().map(c => `${c} ${seats[c]}`).join(', ');
  const teams = field.map(n => (
    `  { id: '${n.club.id}', name: ${JSON.stringify(n.club.name)}, country: ${JSON.stringify(n.country)}, ` +
    `iso: '${n.iso}', continent: '${n.continent}', color: '${colors[n.club.id]}', ` +
    `sourceColor: '${n.club.color}', overall: ${n.overall} },`
  )).join('\n');

  const byCont = {};
  for (const g of geo) (byCont[g.continent] ??= []).push(g.iso);
  const terr = Object.keys(byCont).sort().map(c => {
    const rows = byCont[c].sort().map(iso => `${iso}: '${owners[iso]}'`);
    const lines = [];
    for (let i = 0; i < rows.length; i += 6) lines.push('  ' + rows.slice(i, i + 6).join(', ') + ',');
    return `  // ${c}\n${lines.join('\n')}`;
  }).join('\n');

  return `// GENERATED by scripts/genConquestSoccer.mjs (Round 358). Do not hand edit:
// simConquestSoccer re-derives every value here from the sources below and fails
// if this file disagrees. Change the generator, re-run it, run the harness.
//
// Sources: FALLBACK_CLUBS (soccerCareerEngine), STRENGTH_PRIORS (clubManager),
// GEO_COUNTRIES (worldMapGeo). One club per country, because the territory unit
// is the country. The field is apportioned across continents by largest
// remainder (${contLine}) rather than taken as the 32 best clubs, which would
// have put 18 in Europe and handed one African club 30 countries at kickoff.
// Every other country belongs to the nearest contestant on its own continent by
// projected distance, which is the NHL map's nearest-arena rule with the arena
// swapped for a home country.
//
// Ratings are simulation strengths, not stat claims. No crests, no kits, no
// player names: club name, country and colour only.
//
// COLOUR: \`color\` is a DERIVED map palette, not the club's real colour, and it
// is used everywhere in this game so nothing ever shows a club in two different
// colours. The real colours collide badly on a map (two African clubs both on
// #D6202B, three more sharing #FBC403, 65 pairs within 40 in RGB), which makes
// ownership unreadable, so the field is spread around the hue wheel in the order
// of its true hues. Measured minimum pairwise distance: ${minPair.toFixed(1)}.
// The club's real colour is kept on every row as \`sourceColor\`.

export interface SoccerClub {
  id: string;
  name: string;
  country: string;
  iso: string;          // its home territory on the world basemap
  continent: string;
  /** derived map palette, mutually distinguishable; see the note above */
  color: string;
  /** the club's real colour, recorded for provenance */
  sourceColor: string;
  overall: number;
}

export const SOCCER_CLUBS: SoccerClub[] = [
${teams}
];

export const SOCCER_CLUB_MAP = new Map(SOCCER_CLUBS.map(c => [c.id, c]));

/** Every one of the basemap's countries, owned at kickoff. */
export const INITIAL_TERRITORIES_SOCCER: Record<string, string> = {
${terr}
};
`;
}

// The harness imports deriveField and deriveTerritories to re-derive the shipped
// file, so writing must happen only when this is the entry point. Nothing is
// evaluated at module scope for an importer.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  // imported for re-derivation, nothing to do
} else {
main();
}

function main() {
const { clubs, priors, geo } = readSources();
const { field, seats } = deriveField({ clubs, priors, geo });
const owners = deriveTerritories(field, geo);
const colors = deriveMapColors(field);
const { min: minPair } = minPairDistance(colors);
const out = path.join(ROOT, 'src/data/conquestDataSoccer.ts');
fs.writeFileSync(out, render(field, owners, seats, geo, colors, minPair), 'utf8');

const tally = {};
for (const iso of Object.keys(owners)) tally[owners[iso]] = (tally[owners[iso]] || 0) + 1;
const sizes = field.map(n => tally[n.club.id] ?? 0);
console.log(`wrote ${path.relative(ROOT, out)}`);
console.log(`  ${field.length} clubs, ${Object.keys(owners).length} territories`);
console.log(`  empire sizes: min ${Math.min(...sizes)}, max ${Math.max(...sizes)}, mean ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1)}, landless ${sizes.filter(s => s === 0).length}`);
console.log(`  seats: ${Object.keys(seats).sort().map(c => `${c} ${seats[c]}`).join(', ')}`);
console.log(`  map palette: minimum pairwise RGB distance ${minPair.toFixed(1)}`);
}
