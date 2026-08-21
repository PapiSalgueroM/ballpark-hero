import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dailyDraw } from '@/lib/dateUtils';
import { FORMATIONS, playerRating, type FormationSlot } from '@/lib/squadDeal';
import { fetchPackPool, type PackPlayer, type PackTier } from '@/lib/fetchPackPool';

export const TOTAL_PACKS = 15;
const EMPTY_SLOT_RATING = 45;
const STORAGE_PREFIX = 'mystery-box-';

/**
 * Pack odds. Tuned so a finished XI averages in the 60s-70s and a superstar
 * pull is a genuine event (~1 in 3 full runs contain one). Fringe exists so a
 * pack can disappoint, no tension without a dud.
 */
const ODDS: Array<[PackTier, number]> = [
  ['superstar', 0.03],
  ['star', 0.09],
  ['quality', 0.22],
  ['squad', 0.41],
  ['fringe', 0.25],
];

export interface MysteryBoxState {
  loading: boolean;
  formation: typeof FORMATIONS[number];
  packIndex: number;               // 0-based; packIndex === TOTAL_PACKS => done
  current: PackPlayer | null;      // the just-opened player awaiting a decision
  revealed: boolean;
  squad: (PackPlayer | undefined)[];
  compatibleSlots: number[];
  discards: number;
  finished: boolean;
  rating: number;
  filled: number;
  bestPull: PackPlayer | null;
  openPack: () => void;
  place: (slotIndex: number) => void;
  discard: () => void;
  shareText: string;
}

/** Deterministic tier for pack i, same sequence for everyone on a given day.
    Round 224: rolls come from dailyDraw per (day, pack) label; the old
    in-file multiply overflowed float precision and each slot could only
    circle a sliver of its bucket. Measured, then replaced. */
export function tierFor(today: string, i: number): PackTier {
  const r = dailyDraw(10000, `mystery-box:${today}:tier:${i}`) / 10000;
  let acc = 0;
  for (const [tier, p] of ODDS) {
    acc += p;
    if (r < acc) return tier;
  }
  return 'fringe';
}

interface Saved {
  decisions: Array<{ slot: number | null }>; // per opened pack: slot index or null=discard
  revealedCurrent: boolean;
}

function loadSaved(today: string): Saved | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* ignore */ }
  return null;
}

function save(today: string, s: Saved) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify(s));
  } catch { /* storage unavailable */ }
}

export function useMysteryBox(): MysteryBoxState {
  const today = useMemo(() => getTodayET(), []);
  const formation = FORMATIONS[0]; // 4-3-3, fixed so everyone's run is comparable

  const [pool, setPool] = useState<PackPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Array<{ slot: number | null }>>(
    () => loadSaved(today)?.decisions ?? [],
  );
  const [revealed, setRevealed] = useState<boolean>(() => loadSaved(today)?.revealedCurrent ?? false);

  useEffect(() => {
    let cancelled = false;
    fetchPackPool().then(p => {
      if (cancelled) return;
      setPool(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const byTier = useMemo(() => {
    const b: Record<PackTier, PackPlayer[]> = { fringe: [], squad: [], quality: [], star: [], superstar: [] };
    for (const p of pool) b[p.tier].push(p);
    return b;
  }, [pool]);

  /**
   * The full deterministic pack sequence. Derived, never stored: pack i's
   * player depends only on (seed, i) and which names were already drawn, so
   * replaying the same decisions always reproduces the same run.
   */
  const packs = useMemo(() => {
    if (pool.length === 0) return [];
    const out: PackPlayer[] = [];
    const used = new Set<string>();
    for (let i = 0; i < TOTAL_PACKS; i++) {
      const tier = tierFor(today, i);
      // walk down tiers if a bucket is exhausted (superstar bucket is ~130)
      const order: PackTier[] = ['superstar', 'star', 'quality', 'squad', 'fringe'];
      let bucket = byTier[tier].filter(p => !used.has(p.name));
      let oi = order.indexOf(tier);
      while (bucket.length === 0 && oi < order.length - 1) {
        oi += 1;
        bucket = byTier[order[oi]].filter(p => !used.has(p.name));
      }
      if (bucket.length === 0) break;
      const pick = bucket[dailyDraw(bucket.length, `mystery-box:${today}:pick:${i}`)];
      used.add(pick.name);
      out.push(pick);
    }
    return out;
  }, [pool, byTier, today]);

  const packIndex = decisions.length;
  const finished = packs.length > 0 && packIndex >= packs.length;
  const current = !finished && revealed ? (packs[packIndex] ?? null) : null;

  const squad = useMemo(() => {
    const s: (PackPlayer | undefined)[] = Array(formation.slots.length).fill(undefined);
    decisions.forEach((d, i) => {
      if (d.slot !== null && packs[i]) s[d.slot] = packs[i];
    });
    return s;
  }, [decisions, packs, formation.slots.length]);

  const compatibleSlots = useMemo(() => {
    if (!current) return [];
    return formation.slots
      .map((slot: FormationSlot, i: number) => ({ slot, i }))
      .filter(({ slot, i }) => !squad[i] && slot.allowed.includes(current.position))
      .map(({ i }) => i);
  }, [current, formation.slots, squad]);

  const discards = decisions.filter(d => d.slot === null).length;
  const filled = squad.filter(Boolean).length;

  const rating = useMemo(() => {
    const vals = squad.map(p => (p ? playerRating(p) : EMPTY_SLOT_RATING));
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [squad]);

  const bestPull = useMemo(() => {
    const kept = squad.filter(Boolean) as PackPlayer[];
    if (kept.length === 0) return null;
    return kept.reduce((best, p) => (playerRating(p) > playerRating(best) ? p : best));
  }, [squad]);

  useGameCompletion('mystery-box', finished, rating * 10, filled);

  const persist = useCallback((d: Array<{ slot: number | null }>, r: boolean) => {
    save(today, { decisions: d, revealedCurrent: r });
  }, [today]);

  const openPack = useCallback(() => {
    if (finished || revealed || loading) return;
    setRevealed(true);
    persist(decisions, true);
  }, [finished, revealed, loading, decisions, persist]);

  const place = useCallback((slotIndex: number) => {
    if (!current || !compatibleSlots.includes(slotIndex)) return;
    const next = [...decisions, { slot: slotIndex }];
    setDecisions(next);
    setRevealed(false);
    persist(next, false);
  }, [current, compatibleSlots, decisions, persist]);

  const discard = useCallback(() => {
    if (!current) return;
    const next = [...decisions, { slot: null }];
    setDecisions(next);
    setRevealed(false);
    persist(next, false);
  }, [current, decisions, persist]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const tierEmoji: Record<PackTier, string> = {
      superstar: '🟪', star: '🟨', quality: '🟩', squad: '⬜', fringe: '🟫',
    };
    const pulls = packs.map(p => tierEmoji[p.tier]).join('');
    return `Mystery Box, ${today}\n${pulls}\nXI rating ${rating} · ${filled}/11 filled · best pull: ${bestPull?.name ?? ', '}\nBeat my pulls: douknowball.com/mystery-box`;
  }, [finished, packs, rating, filled, bestPull, today]);

  return {
    loading, formation, packIndex, current, revealed, squad, compatibleSlots,
    discards, finished, rating, filled, bestPull, openPack, place, discard, shareText,
  };
}
