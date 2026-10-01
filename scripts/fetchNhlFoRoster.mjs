/**
 * Round 830: pull the NHL Front Office record from the NHL's own public API.
 *
 * This is the only script in the NHL Front Office pipeline that touches the
 * network. It writes scripts/data/nhlRosters2026.json, a compact record of:
 *
 *   1. every club's roster exactly as https://api-web.nhle.com/v1/roster/{TEAM}/current
 *      published it on the day of the run (that address redirects to the season
 *      roster, /v1/roster/{TEAM}/20262027, and the record keeps the final address);
 *   2. every 2025-26 regular season skater and goalie line from the NHL stats API
 *      (api.nhle.com/stats/rest/en/skater/summary and goalie/summary, aggregated
 *      across clubs for a man traded during the season), which is what the
 *      rating rule reads.
 *
 * Nothing is chosen, rated or rounded here. scripts/genNhlFrontOfficeRoster.mjs
 * does all of that offline from this record, so the bake can be rerun and
 * checked without the network. Head shots and every other image address the API
 * returns are dropped on purpose: the site never shows a player photo.
 *
 * Run by hand: node scripts/fetchNhlFoRoster.mjs
 * Then:        node scripts/checkNhlFoRosterEspn.mjs   (the second source spot check)
 * Then:        node scripts/genNhlFrontOfficeRoster.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/data/nhlRosters2026.json');

/* The 32 clubs, alphabetical by the abbreviation the engine and the API share. */
export const NHL_ABBRS = [
  'ANA', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL', 'DAL', 'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NJD',
  'NSH', 'NYI', 'NYR', 'OTT', 'PHI', 'PIT', 'SEA', 'SJS', 'STL', 'TBL', 'TOR', 'UTA', 'VAN', 'VGK', 'WPG', 'WSH',
];

const SEASON_STATS = '20252026';
const statsUrl = kind => `https://api.nhle.com/stats/rest/en/${kind}/summary?isAggregate=true&isGame=false&start=0&limit=-1&cayenneExp=seasonId=${SEASON_STATS}%20and%20gameTypeId=2`;

/* A polite pace: the API answers 429 to a tight loop, and waits out its own
   Retry-After when it does. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Responses are cached for the day under .tmp-fx (never committed), so a run
   cut off by the rate limit resumes instead of starting over. */
const CACHE = path.join(ROOT, '.tmp-fx/nhl-api-cache', new Date().toISOString().slice(0, 10));
fs.mkdirSync(CACHE, { recursive: true });
async function getJson(url) {
  const file = path.join(CACHE, `${url.replace(/[^A-Za-z0-9]+/g, '_').slice(-120)}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await sleep(900);
    let res = null;
    try { res = await fetch(url); } catch (err) { if (attempt === 5) throw err; }
    if (res?.ok) {
      const out = { json: await res.json(), finalUrl: res.url };
      fs.writeFileSync(file, JSON.stringify(out));
      return out;
    }
    if (attempt === 5) throw new Error(`${url}: HTTP ${res?.status}`);
    const wait = Number(res?.headers.get('retry-after')) || 5 * attempt;
    await sleep(Math.min(30, wait) * 1000);
  }
  throw new Error('unreachable');
}

const read = new Date().toISOString().slice(0, 10);
const teams = {};
for (const abbr of NHL_ABBRS) {
  const url = `https://api-web.nhle.com/v1/roster/${abbr}/current`;
  const { json, finalUrl } = await getJson(url);
  const players = [];
  for (const [group, rows] of [['forwards', json.forwards], ['defensemen', json.defensemen], ['goalies', json.goalies]]) {
    if (!Array.isArray(rows)) throw new Error(`${abbr}: no ${group} array in the roster response`);
    for (const p of rows) {
      players.push({
        id: p.id,
        name: `${p.firstName.default} ${p.lastName.default}`,
        pos: p.positionCode,
        shoots: p.shootsCatches ?? null,
        birthDate: p.birthDate ?? null,
        sweater: p.sweaterNumber ?? null,
      });
    }
  }
  players.sort((a, b) => a.id - b.id);
  teams[abbr] = { url: finalUrl, players };
  console.log(`${abbr}: ${players.length} on the published roster (${finalUrl})`);
}

const sk = await getJson(statsUrl('skater'));
const gk = await getJson(statsUrl('goalie'));
const skaters = sk.json.data.map(p => ({ id: p.playerId, name: p.skaterFullName, pos: p.positionCode, gp: p.gamesPlayed, g: p.goals, a: p.assists, pts: p.points }))
  .sort((a, b) => a.id - b.id);
const goalies = gk.json.data.map(p => ({ id: p.playerId, name: p.goalieFullName, gp: p.gamesPlayed, w: p.wins, sa: p.shotsAgainst, sv: p.saves }))
  .sort((a, b) => a.id - b.id);
if (skaters.length !== sk.json.total || goalies.length !== gk.json.total) throw new Error('the stats API returned a partial page');

/* Keep a spot check written by checkNhlFoRosterEspn.mjs only if it was made
   against this same day's roster; a refetch on a new day must redo it. */
let espnSpotCheck = null;
if (fs.existsSync(OUT)) {
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (prev.meta?.read === read && prev.espnSpotCheck) espnSpotCheck = prev.espnSpotCheck;
}

const record = {
  meta: {
    read,
    what: 'Every NHL club roster as the NHL published it on the day read, plus every 2025-26 regular season skater and goalie line. Written by scripts/fetchNhlFoRoster.mjs; scripts/genNhlFrontOfficeRoster.mjs turns it into src/data/nhlFoRosters2026.ts offline.',
    rosterSource: 'https://api-web.nhle.com/v1/roster/{TEAM}/current',
    statsSource: { skaters: statsUrl('skater'), goalies: statsUrl('goalie') },
    statsSeason: '2025-26 regular season',
  },
  teams,
  stats2025_26: { skaters, goalies },
  espnSpotCheck,
};
fs.writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
const total = Object.values(teams).reduce((n, t) => n + t.players.length, 0);
console.log(`wrote ${path.relative(ROOT, OUT)}: ${NHL_ABBRS.length} clubs, ${total} rostered men, ${skaters.length} skater and ${goalies.length} goalie lines, read ${read}`);
