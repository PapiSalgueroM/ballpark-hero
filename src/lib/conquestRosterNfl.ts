import { NFL_TEAMS, TEAM_MAP, CONQUEST_FREE_AGENCY_POOL } from '@/data/conquestData';
import type { ConquestPlayer } from '@/data/conquestData';
import { FREE_AGENTS, TEAM_LEGENDS } from '@/data/conquestPowerups';

// An explicit activation set follows earned legend cards through this run.
// Older callers omit it and retain their original name-only lookup order.
export function getNflRosterPlayer(name: string, teamId: string, legendPlayers?: ReadonlySet<string>): ConquestPlayer | undefined {
  const legend = Object.values(TEAM_LEGENDS).find(player => player.name === name);
  if (legendPlayers?.has(name) && legend) return { ...legend, overall: 99, keyStat: 'Legend' };
  const ownPlayer = TEAM_MAP.get(teamId)?.players?.find(player => player.name === name);
  if (ownPlayer) return ownPlayer;
  const ownLegend = TEAM_LEGENDS[teamId];
  if (!legendPlayers && ownLegend?.name === name) return { ...ownLegend, overall: 99, keyStat: 'Legend' };

  for (const team of NFL_TEAMS) {
    const player = team.players?.find(player => player.name === name);
    if (player) return player;
  }
  const agent = FREE_AGENTS.find(player => player.name === name)
    || CONQUEST_FREE_AGENCY_POOL.find(player => player.name === name);
  if (agent) return { name: agent.name, position: agent.position, overall: agent.overall, keyStat: '' };
  if (!legendPlayers && legend) return { ...legend, overall: 99, keyStat: 'Legend' };
  return undefined;
}
