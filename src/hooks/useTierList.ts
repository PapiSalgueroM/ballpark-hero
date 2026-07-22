import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { fetchOverratedPool, type OverratedPlayer } from '@/lib/fetchOverratedPool';

export const TIERS = ['S', 'A', 'B', 'C', 'D'] as const;
export type Tier = (typeof TIERS)[number];

export interface CrowdTier {
  /** Average tier as a number, S=0 … D=4. Null when nobody else has voted. */
  avgIndex: number | null;
  tier: Tier | null;
  total: number;
}

export interface TierListState {
  loading: boolean;
  players: OverratedPlayer[];
  /** playerName -> tier the user placed them in */
  placements: Record<string, Tier>;
  selected: string | null;
  crowd: Record<string, CrowdTier>;
  allPlaced: boolean;
  submitted: boolean;
  select: (name: string | null) => void;
  place: (name: string, tier: Tier) => void;
  clear: (name: string) => void;
  submit: () => void;
  shareText: string;
}

const SIZE = 8;
const STORAGE_PREFIX = 'tier-list-';

/** Same 8 players for everyone on a given ET day. Never Math.random(). */
function pickDaily(pool: OverratedPlayer[], today: string): OverratedPlayer[] {
  if (pool.length === 0) return [];
  const seed = dateSeed(today);
  const picked: OverratedPlayer[] = [];
  const used = new Set<number>();
  for (let i = 0; picked.length < SIZE && i < pool.length * 4; i++) {
    const idx = Math.abs((seed * (i + 7) * 1103515245 + 12345) >>> 0) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
}

function loadSaved(today: string): { placements: Record<string, Tier>; submitted: boolean } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function save(today: string, placements: Record<string, Tier>, submitted: boolean) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ placements, submitted }));
  } catch { /* storage unavailable — still playable, just not resumable */ }
}

export function useTierList(): TierListState {
  const today = useMemo(() => getTodayET(), []);
  const saved = useMemo(() => loadSaved(today), [today]);

  const [pool, setPool] = useState<OverratedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [placements, setPlacements] = useState<Record<string, Tier>>(saved?.placements ?? {});
  const [submitted, setSubmitted] = useState(saved?.submitted ?? false);
  const [selected, setSelected] = useState<string | null>(null);
  const [crowd, setCrowd] = useState<Record<string, CrowdTier>>({});

  useEffect(() => {
    let cancelled = false;
    fetchOverratedPool().then(p => {
      if (cancelled) return;
      setPool(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const players = useMemo(() => pickDaily(pool, today), [pool, today]);
  const allPlaced = players.length > 0 && players.every(p => placements[p.name]);

  useGameCompletion('tier-list', submitted, Object.keys(placements).length * 100, Object.keys(placements).length);

  const select = useCallback((name: string | null) => setSelected(name), []);

  const place = useCallback((name: string, tier: Tier) => {
    if (submitted) return;
    setPlacements(prev => {
      const next = { ...prev, [name]: tier };
      save(today, next, false);
      return next;
    });
    setSelected(null);
  }, [submitted, today]);

  const clear = useCallback((name: string) => {
    if (submitted) return;
    setPlacements(prev => {
      const next = { ...prev };
      delete next[name];
      save(today, next, false);
      return next;
    });
  }, [submitted, today]);

  /**
   * Submit writes one row per placement, then reads back the crowd average per
   * player. Average is computed over real rows only — a player nobody else has
   * ranked shows as "first to rank" rather than a made-up consensus.
   */
  const submit = useCallback(async () => {
    if (!allPlaced || submitted) return;
    setSubmitted(true);
    save(today, placements, true);

    const rows = players.map(p => ({
      player_name: p.name,
      year: p.year,
      tier: placements[p.name],
    }));

    try {
      await supabase.from('tier_list_votes').insert(rows);
    } catch { /* vote write failed — still show whatever crowd data exists */ }

    try {
      const { data } = await supabase
        .from('tier_list_votes')
        .select('player_name, tier')
        .in('player_name', players.map(p => p.name));
      if (!data) return;
      const acc: Record<string, CrowdTier> = {};
      for (const p of players) {
        const mine = data.filter(d => d.player_name === p.name);
        if (mine.length === 0) {
          acc[p.name] = { avgIndex: null, tier: null, total: 0 };
          continue;
        }
        const sum = mine.reduce((s, d) => s + TIERS.indexOf(d.tier as Tier), 0);
        const avg = sum / mine.length;
        acc[p.name] = { avgIndex: avg, tier: TIERS[Math.round(avg)] ?? null, total: mine.length };
      }
      setCrowd(acc);
    } catch { /* silent — summary just omits crowd column */ }
  }, [allPlaced, submitted, placements, players, today]);

  const shareText = useMemo(() => {
    if (!submitted) return '';
    const byTier = TIERS.map(t => {
      const names = players.filter(p => placements[p.name] === t).map(p => p.name);
      return names.length > 0 ? `${t}: ${names.join(', ')}` : null;
    }).filter(Boolean);
    return `Tier List — ${today}\n${byTier.join('\n')}\ndouknowball.com/tier-list`;
  }, [submitted, players, placements, today]);

  return {
    loading, players, placements, selected, crowd, allPlaced, submitted,
    select, place, clear, submit, shareText,
  };
}
