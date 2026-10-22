/**
 * Round 1558: read the NHL's own data service (api-web.nhle.com) for every
 * man on an NHL Connections board (his NHL clubs season by season, career
 * regular season totals, birth country, draft) and write the record the NHL
 * checker judges by: scripts/data/nhlConnectionsRecord-2026-10.json.
 *
 *   node scripts/usConnections/fetchNhlRecord.mjs fetch <work>       (MAX men a run)
 *   node scripts/usConnections/fetchNhlRecord.mjs export <work> <out.json>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/nhlwork');
const MAX = Number(process.env.MAX ?? 40);
fs.mkdirSync(WORK, { recursive: true });

/* men a fix may deal in */
export const EXTRA = [
  /* Round 1558's fix of nhlconn-004: two Sharks far from 1,000 points */
  'Marc-Edouard Vlasic', 'Macklin Celebrini',
  /* the man the round took off nhlconn-004 (Brent Burns stays on nhlconn-003): kept for the live table's old row */
  'Erik Karlsson',
];
/* tile name -> NHL player id where the search finds a namesake first */
export const PICK = {
  /* the search does not match the tile spelling */
  'David Pastrňák': 8477956,
  'Ryan Nugent-Hopkins': 8476454,
  /* namesakes: the man the board means */
  'Erik Karlsson': 8474578, // the defenceman (Senators, Sharks, Penguins), not the Hurricanes forward
  'Sebastian Aho': 8478427, // the Hurricanes forward, not the Penguins defenceman
};

const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tileNames() {
  const R = ROOT.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nhlrec-'));
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export const b = (await import('${R}/src/data/nhlConnectionsPuzzles.ts')).nhlConnectionsPuzzles;`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  return [...new Set([...b.flatMap(x => x.groups.flatMap(g => g.players)), ...EXTRA])].sort();
}

async function getJson(url) {
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (r.ok) return await r.json();
      console.log('  status', r.status, url);
      if (r.status === 404) return null;
    } catch (e) { console.log('  error', e.message); }
    await sleep(1500);
  }
  return null;
}

if (step === 'fetch') {
  let n = 0;
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    let id = PICK[name];
    let found = null;
    if (!id) {
      const s = await getJson(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=${encodeURIComponent(name)}`);
      found = (s ?? []).filter(p => fold(p.name) === fold(name)).map(p => ({ id: p.playerId, name: p.name, last: p.lastSeasonId, team: p.lastTeamAbbrev }));
      id = found[0]?.id;
    }
    if (!id) { fs.writeFileSync(f, JSON.stringify({ name, error: 'no player found', found })); console.log(name, 'NONE'); continue; }
    const landing = await getJson(`https://api-web.nhle.com/v1/player/${id}/landing`);
    await sleep(200);
    fs.writeFileSync(f, JSON.stringify({ name, id, found, landing }));
    console.log(name, id, (found ?? []).length > 1 ? `NAMESAKES ${found.map(x => `${x.id} ${x.team} ${x.last}`).join(' | ')}` : '');
  }
  console.log('fetched', Math.min(n, MAX));
}

/** NHL clubs by season (regular season rows), career regular season totals, birth country, draft. */
export function parseNhl(raw) {
  const L = raw.landing ?? {};
  const seasons = {};
  for (const s of L.seasonTotals ?? []) {
    if (s.leagueAbbrev !== 'NHL' || s.gameTypeId !== 2) continue;
    const y = String(s.season).slice(0, 4) + '-' + String(s.season).slice(6, 8);
    (seasons[y] ??= new Set()).add(s.teamName?.default);
  }
  const c = L.careerTotals?.regularSeason ?? {};
  return {
    nhl: Number(raw.id),
    name: `${L.firstName?.default ?? ''} ${L.lastName?.default ?? ''}`.trim(),
    country: L.birthCountry ?? null,
    pos: L.position ?? null,
    active: !!L.isActive,
    seasons: Object.fromEntries(Object.entries(seasons).sort().map(([y, s]) => [y, [...s].sort()])),
    career: { GP: c.gamesPlayed ?? 0, G: c.goals ?? 0, A: c.assists ?? 0, P: c.points ?? 0 },
    draft: L.draftDetails ? [L.draftDetails.year, L.draftDetails.round, L.draftDetails.overallPick, L.draftDetails.teamAbbrev] : null,
  };
}

if (step === 'export') {
  const men = {};
  const problems = [];
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (!fs.existsSync(f)) { problems.push(`${name}: not fetched`); continue; }
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw.id) { problems.push(`${name}: ${raw.error}`); continue; }
    if ((raw.found ?? []).length > 1 && !PICK[name]) problems.push(`${name}: namesakes ${raw.found.map(x => `${x.id} ${x.team} ${x.last}`).join(' | ')}`);
    men[name] = parseNhl(raw);
  }
  const doc = {
    about: 'Round 1558. The record the NHL Connections checker judges every tile by, read from the NHL\'s own data service (api-web.nhle.com, the player landing page): each man\'s NHL clubs season by season (regular season rows), his career regular season games, goals, assists and points, birth country and draft. One host; a group this record flags is decided on two hosts in scripts/data/nhlConnectionsVerified-2026-10.json. Career points move while a season is played: the read date is the line that holds them. Regenerate with scripts/usConnections/fetchNhlRecord.mjs; never edit by hand.',
    source: 'https://api-web.nhle.com/v1/player/<id>/landing',
    read: process.env.READ_ON ?? null,
    men,
  };
  fs.writeFileSync(outArg, JSON.stringify(doc).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"nhl")/g, '},\n"') + '\n');
  console.log('wrote', outArg, Object.keys(men).length, 'men');
  for (const p of problems) console.log('  PROBLEM ' + p);
}
