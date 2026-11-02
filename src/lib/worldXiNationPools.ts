import { WC2026_GROUPS } from '@/data/wc2026Results';
import type { WorldXiData, WxPlayer } from '@/lib/worldXi';

export type WorldXiNationMode = 'expanded' | 'classic' | '2026';

function nationKey(country: string): string {
  switch (country) {
    case 'USA': return 'United States';
    case 'Turkey': return 'Türkiye';
    case 'Ivory Coast': return "Cote d'Ivoire";
    case 'South Korea': return 'Korea, South';
    case 'Bosnia & Herzegovina': return 'Bosnia-Herzegovina';
    default: return country;
  }
}

export function selectWorldXiNationPool(data: WorldXiData, mode: WorldXiNationMode): WorldXiData {
  if (mode === 'classic') return data;

  const byCountry = new Map<string, WxPlayer[]>();
  for (const [country, players] of data.byCountry) {
    if (!country.trim() || players.length === 0) continue;
    const key = nationKey(country);
    const existing = byCountry.get(key);
    if (existing) existing.push(...players);
    else byCountry.set(key, [...players]);
  }
  for (const players of byCountry.values()) players.sort((a, b) => b.value - a.value);

  const field = mode === '2026'
    ? new Set(WC2026_GROUPS.flatMap(group => group.teams).map(nationKey))
    : null;

  return {
    players: data.players,
    byCountry,
    countries: [...byCountry.keys()].filter(country => !field || field.has(country)).sort(),
  };
}
