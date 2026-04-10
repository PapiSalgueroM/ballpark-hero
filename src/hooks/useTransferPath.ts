import { useState, useCallback, useMemo } from 'react';
import transferPathPuzzles from '@/data/transferPathPuzzles';
import { careerPlayers } from '@/data/careerPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

/* ── Build club↔player lookup once ── */
function buildClubIndex() {
  const playerToClubs = new Map<string, Set<string>>();
  for (const p of careerPlayers) {
    const clubs = new Set(p.career.map(s => s.club));
    playerToClubs.set(p.name, clubs);
  }
  return playerToClubs;
}

const PLAYER_CLUBS = buildClubIndex();

export function getPlayerClubs(name: string): Set<string> {
  return PLAYER_CLUBS.get(name) ?? new Set();
}

export function playersShareClub(a: string, b: string): string | null {
  const clubsA = getPlayerClubs(a);
  const clubsB = getPlayerClubs(b);
  for (const c of clubsA) {
    if (clubsB.has(c)) return c;
  }
  return null;
}

export function getAllPlayerNames(): string[] {
  return careerPlayers.map(p => p.name);
}

export function getPlayerNationality(name: string): string {
  return careerPlayers.find(p => p.name === name)?.nationality ?? '';
}

/* ── Date seed ── */
function getDateSeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type TransferPathMode = 'daily' | 'unlimited';

export interface TransferPathState {
  puzzle: typeof transferPathPuzzles[0];
  chain: string[];
  connections: (string | null)[];
  status: 'building' | 'won';
  score: number;
  mode: TransferPathMode;
  addPlayer: (name: string) => { ok: boolean; club: string | null };
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  unlimitedIndex: number;
}

const STORAGE_PREFIX = 'transfer-path-';

function loadDaily(puzzleId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${STORAGE_PREFIX}daily-${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.puzzleId === puzzleId) return saved as { chain: string[]; connections: (string | null)[]; score: number };
    }
  } catch { /* ignore */ }
  return null;
}

function saveDaily(puzzleId: string, chain: string[], connections: (string | null)[], score: number) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${STORAGE_PREFIX}daily-${today}`;
  localStorage.setItem(key, JSON.stringify({ puzzleId, chain, connections, score }));
}

export function useTransferPath(): TransferPathState {
  const dailyPuzzle = useMemo(() => {
    const idx = getDateSeed() % transferPathPuzzles.length;
    return transferPathPuzzles[idx];
  }, []);

  const saved = useMemo(() => loadDaily(dailyPuzzle.id), [dailyPuzzle.id]);

  const [mode, setMode] = useState<TransferPathMode>('daily');
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [chain, setChain] = useState<string[]>(saved?.chain ?? [dailyPuzzle.playerA]);
  const [connections, setConnections] = useState<(string | null)[]>(saved?.connections ?? [null]);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [status, setStatus] = useState<'building' | 'won'>(saved && saved.score > 0 ? 'won' : 'building');

  const unlimitedPuzzle = useMemo(() => {
    const seed = getDateSeed() + unlimitedIndex + 1;
    return transferPathPuzzles[seed % transferPathPuzzles.length];
  }, [unlimitedIndex]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;

  const isComplete = status === 'won';
  useGameCompletion('transfer-path', isComplete && mode === 'daily', score, isComplete ? 1 : 0);

  const addPlayer = useCallback((name: string): { ok: boolean; club: string | null } => {
    if (status === 'won') return { ok: false, club: null };

    const lastInChain = chain[chain.length - 1];
    const sharedClub = playersShareClub(lastInChain, name);
    if (!sharedClub) return { ok: false, club: null };

    const newChain = [...chain, name];
    const newConn = [...connections, sharedClub];
    setChain(newChain);
    setConnections(newConn);

    // Check if we reached target
    const targetReached = name === puzzle.playerB || playersShareClub(name, puzzle.playerB) !== null;
    if (name === puzzle.playerB) {
      // Direct add of target
      const steps = newChain.length - 1;
      const extra = Math.max(0, steps - puzzle.minSteps);
      const s = Math.max(0, 1000 - extra * 100);
      setScore(s);
      setStatus('won');
      if (mode === 'daily') saveDaily(puzzle.id, newChain, newConn, s);
    } else if (targetReached) {
      // The added player shares a club with target — auto-complete
      const finalClub = playersShareClub(name, puzzle.playerB)!;
      const finalChain = [...newChain, puzzle.playerB];
      const finalConn = [...newConn, finalClub];
      setChain(finalChain);
      setConnections(finalConn);
      const steps = finalChain.length - 1;
      const extra = Math.max(0, steps - puzzle.minSteps);
      const s = Math.max(0, 1000 - extra * 100);
      setScore(s);
      setStatus('won');
      if (mode === 'daily') saveDaily(puzzle.id, finalChain, finalConn, s);
    }

    return { ok: true, club: sharedClub };
  }, [status, chain, connections, puzzle, mode]);

  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setUnlimitedIndex(0);
    const p = transferPathPuzzles[(getDateSeed() + 1) % transferPathPuzzles.length];
    setChain([p.playerA]);
    setConnections([null]);
    setScore(0);
    setStatus('building');
  }, []);

  const nextPuzzle = useCallback(() => {
    const nextIdx = unlimitedIndex + 1;
    setUnlimitedIndex(nextIdx);
    const p = transferPathPuzzles[(getDateSeed() + nextIdx + 1) % transferPathPuzzles.length];
    setChain([p.playerA]);
    setConnections([null]);
    setScore(0);
    setStatus('building');
  }, [unlimitedIndex]);

  return { puzzle, chain, connections, status, score, mode, addPlayer, switchToUnlimited, nextPuzzle, unlimitedIndex };
}
