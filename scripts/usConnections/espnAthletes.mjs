/**
 * Round 1583: ESPN's public athlete service, with the league as a parameter, for the US Connections records.
 *
 *   getJson(url)                         GET with a browser User-Agent, three tries, null on a 404 or a refusal
 *   searchAthletes(name, leagueSlug)     the players ESPN's search finds whose display name folds to the name
 *                                        (leagueSlug as ESPN writes it: 'nba', 'nfl'), [{ id, name, subtitle }]
 *   athlete(sportPath, id)               .../common/v3/sports/<sportPath>/athletes/<id>   (sportPath 'basketball/nba')
 *   athleteStats(sportPath, id)          .../common/v3/sports/<sportPath>/athletes/<id>/stats
 *
 * No top level side effects: importing it reads nothing and writes nothing. Written for NBA in Round 1583;
 * scripts/usConnections/fetchNflRecord.mjs still carries its own inline copy of these reads (getJson and the
 * search), owed to the next round that opens that file: bind it here and delete the copy.
 */
import { fold } from '../lib/usConnectionsCheck.mjs';

export const ESPN_API = 'https://site.web.api.espn.com/apis';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function getJson(url) {
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
      console.log('  status', r.status, url);
      if (r.status === 404) return null;
    } catch (e) { console.log('  error', e.message); }
    await sleep(1500);
  }
  return null;
}

export async function searchAthletes(name, leagueSlug) {
  const s = await getJson(`${ESPN_API}/search/v2?query=${encodeURIComponent(name)}&limit=10&type=player`);
  const players = (s?.results ?? []).filter(r => r.type === 'player').flatMap(r => r.contents ?? []);
  return players
    .filter(c => c.defaultLeagueSlug === leagueSlug && fold(c.displayName) === fold(name))
    .map(c => ({ id: (String(c.uid).match(/a:(\d+)/) ?? [])[1], name: c.displayName, subtitle: c.subtitle }))
    .filter(c => c.id);
}

export const athlete = (sportPath, id) => getJson(`${ESPN_API}/common/v3/sports/${sportPath}/athletes/${id}`);
export const athleteStats = (sportPath, id) => getJson(`${ESPN_API}/common/v3/sports/${sportPath}/athletes/${id}/stats`);
