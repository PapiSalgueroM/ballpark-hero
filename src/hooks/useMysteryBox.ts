import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dailyDraw } from '@/lib/dateUtils';
import { FORMATIONS, playerRating, type FormationSlot } from '@/lib/squadDeal';
import { fetchPackPool, type PackPlayer, type PackTier } from '@/lib/fetchPackPool';
import { markRestoredFinish } from '@/lib/restoredFinish';

export const TOTAL_PACKS = 15;
const EMPTY_SLOT_RATING = 45;
const STORAGE_PREFIX = 'mystery-box-';
// Start on a future shared Eastern board so an in-progress daily keeps its rules.
const FIRST_SWAP_DAY = '2026-11-21';

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
  swapSlots: number[];
  swapStatus: 'available' | 'used' | null;
  swapSaveFailed: boolean;
  discards: number;
  staleDraft: boolean;
  finished: boolean;
  rating: number;
  filled: number;
  bestPull: PackPlayer | null;
  openPack: () => void;
  place: (slotIndex: number) => void;
  swap: (slotIndex: number) => void;
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
  decisions: Array<{ slot: number | null; replace?: true }>; // null is a bin
  revealedCurrent: boolean;
}

function swapTargets(slots: readonly FormationSlot[], squad: (PackPlayer | undefined)[], incoming: PackPlayer): number[] {
  if (slots.some((slot, i) => !squad[i] && slot.allowed.includes(incoming.position))) return [];
  const rating = playerRating(incoming);
  return slots.flatMap((slot, i) => {
    const outgoing = squad[i];
    return outgoing && slot.allowed.includes(incoming.position) && rating > playerRating(outgoing) ? [i] : [];
  });
}

function loadSaved(key: string): { raw: string | null; draft: Saved | null } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    return { raw, draft: raw ? JSON.parse(raw) as Saved : null };
  } catch { /* ignore */ }
  return { raw, draft: null };
}

/**
 * The full deterministic pack sequence. Derived, never stored: pack i's
 * player depends only on (seed, i) and which names were already drawn, so
 * replaying the same decisions always reproduces the same run.
 *
 * Round 643: this was the body of the packs memo (with the tier buckets it
 * read); it is a function now so the restore can count today's packs from a
 * pool before it is set, and the memo calls the same code.
 */
function dailyPacks(pool: PackPlayer[], today: string): PackPlayer[] {
  if (pool.length === 0) return [];
  const byTier: Record<PackTier, PackPlayer[]> = { fringe: [], squad: [], quality: [], star: [], superstar: [] };
  for (const p of pool) byTier[p.tier].push(p);
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
}

export function useMysteryBox(): MysteryBoxState {
  const today = useMemo(() => getTodayET(), []);
  const key = `${STORAGE_PREFIX}${today}`;
  const formation = FORMATIONS[0]; // 4-3-3, fixed so everyone's run is comparable

  const [pool, setPool] = useState<PackPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved] = useState(() => loadSaved(key));
  const storedDraft = useRef(saved.raw);
  const [draft, setDraft] = useState<Saved>(() => ({
    decisions: saved.draft?.decisions ?? [],
    revealedCurrent: saved.draft?.revealedCurrent ?? false,
  }));
  const latestDraft = useRef(draft);
  const [staleDraft, setStaleDraft] = useState(false);
  const [swapSaveFailed, setSwapSaveFailed] = useState(false);
  const swapsEnabled = today >= FIRST_SWAP_DAY;
  const { decisions, revealedCurrent: revealed } = draft;

  useEffect(() => {
    let cancelled = false;
    fetchPackPool().then(p => {
      if (cancelled) return;
      /* Round 643: the saved decisions are restored in a state initializer,
         but `finished` needs the packs, and they arrive here, after mount. A
         run the saved decisions already finish is a restored finish and says
         so first, or the completion hook sees false then true and records it
         again on every reload. */
      const count = dailyPacks(p, today).length;
      const decided = saved.draft?.decisions;
      if (count > 0 && Array.isArray(decided) && decided.length >= count) markRestoredFinish('mystery-box');
      setPool(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [today, saved]);

  const packs = useMemo(() => dailyPacks(pool, today), [pool, today]);

  const packIndex = decisions.length;
  const finished = packs.length > 0 && packIndex >= packs.length;
  const current = !finished && revealed ? (packs[packIndex] ?? null) : null;

  const { squad, swapped } = useMemo(() => {
    const squad: (PackPlayer | undefined)[] = Array(formation.slots.length).fill(undefined);
    let swapped = false;
    decisions.forEach((decision, i) => {
      const incoming = packs[i];
      if (decision.slot === null || !incoming) return;
      if (decision.replace) {
        if (!swapsEnabled || swapped || !swapTargets(formation.slots, squad, incoming).includes(decision.slot)) return;
        swapped = true;
      }
      squad[decision.slot] = incoming;
    });
    return { squad, swapped };
  }, [decisions, packs, formation.slots, swapsEnabled]);

  const compatibleSlots = useMemo(() => {
    if (!current) return [];
    return formation.slots
      .map((slot: FormationSlot, i: number) => ({ slot, i }))
      .filter(({ slot, i }) => !squad[i] && slot.allowed.includes(current.position))
      .map(({ i }) => i);
  }, [current, formation.slots, squad]);

  const swapStatus = swapsEnabled ? (swapped ? 'used' : 'available') : null;
  const swapSlots = useMemo(() => (
    current && swapStatus === 'available' ? swapTargets(formation.slots, squad, current) : []
  ), [current, formation.slots, squad, swapStatus]);

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

  const commitDraft = useCallback((next: Saved, requiresSave = false) => {
    if (staleDraft || latestDraft.current !== draft) return;
    try {
      if (localStorage.getItem(key) !== storedDraft.current) {
        setStaleDraft(true);
        return;
      }
      const raw = JSON.stringify(next);
      localStorage.setItem(key, raw);
      storedDraft.current = raw;
    } catch {
      // A swap spends the one upgrade. Leave the reveal open if it cannot be saved.
      if (requiresSave) {
        setSwapSaveFailed(true);
        return;
      }
    }
    latestDraft.current = next;
    setDraft(next);
    setSwapSaveFailed(false);
  }, [draft, key, staleDraft]);

  const openPack = useCallback(() => {
    if (finished || revealed || loading) return;
    commitDraft({ decisions, revealedCurrent: true });
  }, [finished, revealed, loading, decisions, commitDraft]);

  const place = useCallback((slotIndex: number) => {
    if (!current || !compatibleSlots.includes(slotIndex)) return;
    commitDraft({ decisions: [...decisions, { slot: slotIndex }], revealedCurrent: false });
  }, [current, compatibleSlots, decisions, commitDraft]);

  const swap = useCallback((slotIndex: number) => {
    if (!swapSlots.includes(slotIndex)) return;
    commitDraft({ decisions: [...decisions, { slot: slotIndex, replace: true }], revealedCurrent: false }, true);
  }, [swapSlots, decisions, commitDraft]);

  const discard = useCallback(() => {
    if (!current) return;
    commitDraft({ decisions: [...decisions, { slot: null }], revealedCurrent: false });
  }, [current, decisions, commitDraft]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const tierEmoji: Record<PackTier, string> = {
      superstar: '🟪', star: '🟨', quality: '🟩', squad: '⬜', fringe: '🟫',
    };
    const pulls = packs.map(p => tierEmoji[p.tier]).join('');
    return `Mystery Box, ${today}\n${pulls}\nXI rating ${rating} · ${filled}/11 filled · best pull: ${bestPull?.name ?? ', '}\nBeat my pulls: douknowball.com/mystery-box`;
  }, [finished, packs, rating, filled, bestPull, today]);

  return {
    loading, formation, packIndex, current, revealed, squad, compatibleSlots, swapSlots, swapStatus, swapSaveFailed,
    discards, staleDraft, finished, rating, filled, bestPull, openPack, place, swap, discard, shareText,
  };
}
