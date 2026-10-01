/* Round 718: the Career Ladder pool as the page loads it (career_players plus
   every career_seasons row, paged), read with the public key the page itself
   uses. Shared by scripts/genCareerLadderRoster.mjs, which writes the daily
   rotation's roster from it, and scripts/simCareerLadderRotation.mjs, which
   checks the committed roster against it, so the two can never read the
   tables two different ways. Read only: two GETs and nothing else. */
import fs from 'node:fs';
import path from 'node:path';
import { fetchWithTransportRetry } from './fetchWithTransportRetry.mjs';

export async function fetchLiveCareerPool(root) {
  const client = fs.readFileSync(path.join(root, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !key) throw new Error('could not read the project URL and public key from the supabase client');
  const get = async (pathAndQuery, range) => {
    const { response, error } = await fetchWithTransportRetry(() => fetch(`${url}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: range },
    }));
    if (!response) throw new Error(`${pathAndQuery.split('?')[0]}: ${error?.message ?? 'no answer'}`);
    if (!response.ok) throw new Error(`${pathAndQuery.split('?')[0]} answered ${response.status}`);
    return response.json();
  };
  const players = await get('career_players?select=id,player_name,nationality,position&order=id', '0-9999');
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await get('career_seasons?select=player_id,season,club,goals,assists,appearances,market_value,sort_order&order=player_id,sort_order', `${from}-${from + 999}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const byPlayer = new Map();
  for (const s of rows) {
    if (!byPlayer.has(s.player_id)) byPlayer.set(s.player_id, []);
    byPlayer.get(s.player_id).push({
      season: String(s.season ?? ''), club: String(s.club ?? ''), goals: s.goals ?? null, assists: s.assists ?? null,
      appearances: s.appearances ?? null, marketValue: s.market_value ?? null, sortOrder: Number(s.sort_order ?? 0),
    });
  }
  /* The same shaping as fetchCareerPool in src/lib/careerLadder.ts: string
     ids, seasons in sort order, nameless rows dropped. */
  return players
    .map(p => ({
      id: String(p.id), name: String(p.player_name ?? ''), nationality: String(p.nationality ?? ''), position: String(p.position ?? ''),
      seasons: (byPlayer.get(p.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter(p => p.name.length > 0);
}
