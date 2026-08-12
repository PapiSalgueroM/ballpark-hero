import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { fetchOverratedPool, type OverratedPlayer } from '@/lib/fetchOverratedPool';

export type Vote = 'over' | 'under';

export interface CommunitySplit {
  over: number;
  under: number;
  total: number;
}

export interface Round {
  player: OverratedPlayer;
  userVote: Vote | null;
  community: CommunitySplit | null;
}

export interface OverratedState {
  loading: boolean;
  rounds: Round[];
  index: number;
  current: Round | null;
  status: 'voting' | 'revealed' | 'finished';
  contrarianCount: number;
  vote: (v: Vote) => void;
  next: () => void;
  shareText: string;
}

const ROUNDS = 10;
const STORAGE_PREFIX = 'overrated-underrated-';

/**
 * Deterministic shuffle, same 10 players for every visitor on a given ET day.
 * Never Math.random(), matching how every other daily game here works.
 */
function pickDaily(pool: OverratedPlayer[], today: string): OverratedPlayer[] {
  if (pool.length === 0) return [];
  const seed = dateSeed(today);
  const picked: OverratedPlayer[] = [];
  const used = new Set<number>();
  for (let i = 0; picked.length < ROUNDS && i < pool.length * 4; i++) {
    // Cheap LCG off the day seed so the set is stable but not the top 10 by value.
    const idx = Math.abs((seed * (i + 1) * 1103515245 + 12345) >>> 0) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
}

function loadSaved(today: string): { votes: (Vote | null)[]; index: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${today}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function save(today: string, votes: (Vote | null)[], index: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${today}`, JSON.stringify({ votes, index }));
  } catch { /* storage unavailable, game still playable, just not resumable */ }
}

export function useOverratedUnderrated(): OverratedState {
  const today = useMemo(() => getTodayET(), []);
  const [pool, setPool] = useState<OverratedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<(Vote | null)[]>(() => loadSaved(today)?.votes ?? Array(ROUNDS).fill(null));
  const [index, setIndex] = useState(() => loadSaved(today)?.index ?? 0);
  const [communities, setCommunities] = useState<(CommunitySplit | null)[]>(Array(ROUNDS).fill(null));

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

  const rounds: Round[] = useMemo(
    () => players.map((player, i) => ({
      player,
      userVote: votes[i] ?? null,
      community: communities[i] ?? null,
    })),
    [players, votes, communities],
  );

  const finished = players.length > 0 && index >= players.length;
  const current = finished ? null : (rounds[index] ?? null);
  const status: 'voting' | 'revealed' | 'finished' =
    finished ? 'finished' : (current?.userVote ? 'revealed' : 'voting');

  const contrarianCount = useMemo(
    () => rounds.reduce((acc, r) => {
      if (!r.userVote || !r.community || r.community.total === 0) return acc;
      const majority: Vote = r.community.over >= r.community.under ? 'over' : 'under';
      return r.userVote !== majority ? acc + 1 : acc;
    }, 0),
    [rounds],
  );

  const answered = votes.filter(Boolean).length;
  useGameCompletion('overrated-underrated', finished, contrarianCount * 100, answered);

  /**
   * Read the community split for the player just voted on. Counted server-side
   * per (player_name, year) so the percentages are real. If this player has few
   * votes so far we still show the true split rather than inventing one, an
   * honest "1 of 1" beats a fabricated 50/50.
   */
  const loadCommunity = useCallback(async (i: number, player: OverratedPlayer) => {
    try {
      const { data } = await supabase
        .from('overrated_votes')
        .select('vote')
        .eq('player_name', player.name)
        .eq('year', player.year);
      if (!data) return;
      const over = data.filter(d => d.vote === 'over').length;
      const under = data.filter(d => d.vote === 'under').length;
      setCommunities(prev => {
        const nextArr = [...prev];
        nextArr[i] = { over, under, total: over + under };
        return nextArr;
      });
    } catch { /* silent, reveal just shows no split */ }
  }, []);

  const vote = useCallback((v: Vote) => {
    if (!current || current.userVote) return;
    const i = index;
    const player = current.player;

    const nextVotes = [...votes];
    nextVotes[i] = v;
    setVotes(nextVotes);
    save(today, nextVotes, i);

    // Write first, then read back, so the player's own vote is included in the
    // split they see.
    supabase
      .from('overrated_votes')
      .insert({ player_name: player.name, year: player.year, vote: v })
      .then(() => loadCommunity(i, player));
  }, [current, index, votes, today, loadCommunity]);

  const next = useCallback(() => {
    const n = index + 1;
    setIndex(n);
    save(today, votes, n);
  }, [index, votes, today]);

  const shareText = useMemo(() => {
    if (!finished) return '';
    const squares = rounds
      .map(r => {
        if (!r.userVote || !r.community || r.community.total === 0) return '⬜';
        const majority: Vote = r.community.over >= r.community.under ? 'over' : 'under';
        return r.userVote === majority ? '🟩' : '🟪';
      })
      .join('');
    const label =
      contrarianCount >= 7 ? 'certified contrarian'
      : contrarianCount >= 4 ? 'free thinker'
      : contrarianCount >= 2 ? 'mostly with the crowd'
      : 'one of the sheep';
    return `Overrated or Underrated, ${today}\n${squares}\nWent against the crowd ${contrarianCount}/${ROUNDS}, ${label}\ndouknowball.com/overrated-underrated`;
  }, [finished, rounds, contrarianCount, today]);

  return { loading, rounds, index, current, status, contrarianCount, vote, next, shareText };
}
