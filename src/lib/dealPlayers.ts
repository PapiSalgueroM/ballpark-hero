import { supabase } from '@/integrations/supabase/client';

export interface DealPlayer {
  name: string;
  nationality: string;
  club: string;
  value: number; // market value in USD
}

const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷', Australia: '🇦🇺', Austria: '🇦🇹', Belgium: '🇧🇪', Bosnia: '🇧🇦',
  'Bosnia-Herzegovina': '🇧🇦', Brazil: '🇧🇷', Bulgaria: '🇧🇬', Cameroon: '🇨🇲', Canada: '🇨🇦',
  Chile: '🇨🇱', Colombia: '🇨🇴', 'Costa Rica': '🇨🇷', Croatia: '🇭🇷', 'Czech Republic': '🇨🇿',
  Czechia: '🇨🇿', Denmark: '🇩🇰', Ecuador: '🇪🇨', Egypt: '🇪🇬', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France: '🇫🇷', Gabon: '🇬🇦', Georgia: '🇬🇪', Germany: '🇩🇪', Ghana: '🇬🇭',
  Greece: '🇬🇷', Guinea: '🇬🇳', Hungary: '🇭🇺', Iceland: '🇮🇸', Iran: '🇮🇷',
  Ireland: '🇮🇪', Israel: '🇮🇱', Italy: '🇮🇹', 'Ivory Coast': '🇨🇮', "Cote d'Ivoire": '🇨🇮',
  Jamaica: '🇯🇲', Japan: '🇯🇵', Mali: '🇲🇱', Mexico: '🇲🇽', Morocco: '🇲🇦',
  Netherlands: '🇳🇱', Nigeria: '🇳🇬', 'North Macedonia': '🇲🇰', Norway: '🇳🇴', Paraguay: '🇵🇾',
  Peru: '🇵🇪', Poland: '🇵🇱', Portugal: '🇵🇹', Romania: '🇷🇴', Russia: '🇷🇺',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Senegal: '🇸🇳', Serbia: '🇷🇸', Slovakia: '🇸🇰', Slovenia: '🇸🇮',
  'South Korea': '🇰🇷', 'Korea, South': '🇰🇷', Spain: '🇪🇸', Sweden: '🇸🇪', Switzerland: '🇨🇭',
  Turkey: '🇹🇷', Türkiye: '🇹🇷', Ukraine: '🇺🇦', 'United States': '🇺🇸', USA: '🇺🇸',
  Uruguay: '🇺🇾', Venezuela: '🇻🇪', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Algeria: '🇩🇿', Angola: '🇦🇴',
  Albania: '🇦🇱', Armenia: '🇦🇲', 'Burkina Faso': '🇧🇫', 'DR Congo': '🇨🇩', Finland: '🇫🇮',
  Kosovo: '🇽🇰', Montenegro: '🇲🇪', Mozambique: '🇲🇿', 'New Zealand': '🇳🇿', Tunisia: '🇹🇳',
  Zambia: '🇿🇲', Zimbabwe: '🇿🇼',
};

export function flagFor(nationality: string): string {
  if (!nationality) return '🌍';
  // Some rows store dual nationality like "France / Algeria"
  const first = nationality.split(/[/,]/)[0].trim();
  return FLAGS[first] ?? FLAGS[nationality.trim()] ?? '🌍';
}

/** Short display name: last word, so "Kylian Mbappe" -> "Mbappe". Keeps hyphenated last names. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

export function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n);
}

function dedupe(rows: { player_name: string | null; nationality: string | null; club: string | null; market_value_usd: number | null }[]): Map<string, DealPlayer> {
  const seen = new Map<string, DealPlayer>();
  for (const r of rows) {
    const name = (r.player_name ?? '').trim();
    const value = Number(r.market_value_usd) || 0;
    if (!name || value <= 0) continue;
    const existing = seen.get(name);
    if (!existing || value > existing.value) {
      seen.set(name, { name, nationality: r.nationality ?? '', club: r.club ?? '', value });
    }
  }
  return seen;
}

/**
 * Fetches a pool of real players spanning superstars down to journeymen.
 * Returns null on any failure so the game can fall back to classic cash mode.
 */
export async function fetchDealPlayers(): Promise<DealPlayer[] | null> {
  try {
    const cols = 'player_name, nationality, club, market_value_usd';
    const [stars, budget] = await Promise.all([
      supabase
        .from('player_market_values')
        .select(cols)
        .order('market_value_usd', { ascending: false })
        .limit(400),
      supabase
        .from('player_market_values')
        .select(cols)
        .gt('market_value_usd', 100_000)
        .lt('market_value_usd', 5_000_000)
        .limit(400),
    ]);
    if (stars.error || !stars.data) return null;
    const pool = dedupe([...(stars.data ?? []), ...(budget.data ?? [])]);
    const players = [...pool.values()];
    return players.length >= 60 ? players : null;
  } catch {
    return null;
  }
}

/**
 * Picks n players spread across the value range (one from each value band),
 * so every board has scrubs, mid-tier names, and at least one megastar.
 */
export function pickSpread(pool: DealPlayer[], n = 16): DealPlayer[] {
  const sorted = [...pool].sort((a, b) => a.value - b.value);
  const picks: DealPlayer[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    const start = Math.floor((i * sorted.length) / n);
    const end = Math.max(start + 1, Math.floor(((i + 1) * sorted.length) / n));
    let idx = start + Math.floor(Math.random() * (end - start));
    while (used.has(idx)) idx = idx + 1 < sorted.length ? idx + 1 : 0;
    used.add(idx);
    picks.push(sorted[idx]);
  }
  return picks.sort((a, b) => a.value - b.value);
}
