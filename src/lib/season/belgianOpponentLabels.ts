import { BELGIAN_2025_MEMBERS } from '@/data/belgianSeasonMembership';
import type { SeasonRecord } from '@/lib/soccerCareerEngine';
import type { DerivedSeason } from './core';

const memberOf = (name: string) => BELGIAN_2025_MEMBERS.find(m => m.name === name || m.aliases.includes(name));

/** Label the existing replay after it is derived. No calendar or saved field changes. */
export function belgian2025OpponentLabels(row: Pick<SeasonRecord, 'type' | 'year' | 'club'>, season: DerivedSeason): { names: string[]; note: string } | null {
  if (row.type !== 'playing' || row.year !== 2025 || season.mode !== 'results') return null;
  const me = memberOf(row.club);
  if (!me || !season.labels[0]?.named || memberOf(season.labels[0].name)?.name !== me.name) return null;
  const names = season.labels.map(label => label.named ? label.name : 'Opponent not recorded');
  const used = new Set([me.name]);
  for (const label of season.labels.slice(1)) {
    if (!label.named) continue;
    const member = memberOf(label.name);
    if (!member || used.has(member.name)) return null;
    used.add(member.name);
  }
  const available = BELGIAN_2025_MEMBERS.filter(member => !used.has(member.name));
  const seen = new Set<number>();
  for (const game of season.games) {
    if (game.opp === 0 || seen.has(game.opp)) continue;
    const label = season.labels[game.opp];
    if (!label) return null;
    seen.add(game.opp);
    if (label.named) continue;
    const member = available.shift();
    if (member) names[game.opp] = member.name;
  }
  return {
    names,
    note: "2025/26 club membership is verified. Match order and results are simulated; extra opponents and their phase aren't recorded.",
  };
}
