import type { Difficulty, Player } from '@/types/game';
import { normalizeName } from '@/lib/playerSearch';

export const FOOTLE_UNLIMITED_KEY = 'footle-unlimited-session-v1';
const TIERS: Difficulty[] = ['easy', 'hard', 'insane'];
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const MAX_GUESSES = 8;

export type UnlimitedDeck = {
  pool: Player[];
  seen: string[];
  current: { target: string; guesses: string[]; status: 'playing' | 'won' | 'lost' };
};
export type FootleUnlimitedSession = {
  v: 1;
  active: boolean;
  tier: Difficulty;
  decks: Partial<Record<Difficulty, UnlimitedDeck>>;
};

export function createUnlimitedSession(): FootleUnlimitedSession {
  return { v: 1, active: false, tier: 'easy', decks: {} };
}

function candidates(deck: UnlimitedDeck, tier: Difficulty, dailyName: string): Player[] {
  const used = new Set([...deck.seen, normalizeName(dailyName)]);
  return deck.pool.filter(player => player.difficulty === tier && !used.has(normalizeName(player.name)));
}

function draw(deck: UnlimitedDeck, tier: Difficulty, dailyName: string, random: () => number): UnlimitedDeck | null {
  const available = candidates(deck, tier, dailyName);
  if (!available.length) return null;
  const target = available[Math.floor(random() * available.length)];
  return { ...deck, seen: [...deck.seen, normalizeName(target.name)], current: { target: target.name, guesses: [], status: 'playing' } };
}

function newDeck(pool: Player[], tier: Difficulty, dailyName: string, random: () => number): UnlimitedDeck | null {
  const names = new Set<string>();
  const snapshot = pool.filter(player => {
    const name = normalizeName(player.name);
    if (names.has(name)) return false;
    names.add(name);
    return true;
  }).map(player => ({ ...player }));
  return draw({ pool: snapshot, seen: [], current: { target: '', guesses: [], status: 'playing' } }, tier, dailyName, random);
}

export function selectUnlimitedTier(session: FootleUnlimitedSession, tier: Difficulty, pool: Player[], dailyName: string, random = Math.random): FootleUnlimitedSession {
  if (session.decks[tier]) return session.tier === tier ? session : { ...session, tier };
  const deck = newDeck(pool, tier, dailyName, random);
  if (!deck) return session.tier === tier ? session : { ...session, tier };
  return { ...session, tier, decks: { ...session.decks, [tier]: deck } };
}

function replaceDeck(session: FootleUnlimitedSession, deck: UnlimitedDeck): FootleUnlimitedSession {
  return { ...session, decks: { ...session.decks, [session.tier]: deck } };
}

export function guessUnlimited(session: FootleUnlimitedSession, name: string): FootleUnlimitedSession {
  const deck = session.decks[session.tier];
  if (!deck || deck.current.status !== 'playing' || !deck.pool.some(player => player.name === name)
    || deck.current.guesses.includes(name)) return session;
  const guesses = [...deck.current.guesses, name];
  const status = name === deck.current.target ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return replaceDeck(session, { ...deck, current: { ...deck.current, guesses, status } });
}

export function giveUpUnlimited(session: FootleUnlimitedSession): FootleUnlimitedSession {
  const deck = session.decks[session.tier];
  if (!deck || deck.current.status !== 'playing') return session;
  return replaceDeck(session, { ...deck, current: { ...deck.current, status: 'lost' } });
}

export function unlimitedRemaining(session: FootleUnlimitedSession, dailyName: string): number {
  const deck = session.decks[session.tier];
  return deck ? candidates(deck, session.tier, dailyName).length : 0;
}

export function nextUnlimitedPuzzle(session: FootleUnlimitedSession, dailyName: string, random = Math.random): FootleUnlimitedSession {
  const deck = session.decks[session.tier];
  if (!deck || deck.current.status === 'playing') return session;
  const next = draw(deck, session.tier, dailyName, random);
  return next ? replaceDeck(session, next) : session;
}

export function reshuffleUnlimited(session: FootleUnlimitedSession, pool: Player[], dailyName: string, random = Math.random): FootleUnlimitedSession {
  const deck = session.decks[session.tier];
  if (!deck || deck.current.status === 'playing' || unlimitedRemaining(session, dailyName) > 0) return session;
  const next = newDeck(pool, session.tier, dailyName, random);
  return next ? replaceDeck(session, next) : session;
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') return false;
  const player = value as Player;
  return ['name', 'club', 'nationality', 'league'].every(key => typeof player[key as keyof Player] === 'string'
    && String(player[key as keyof Player]).trim().length > 0 && String(player[key as keyof Player]).length <= 256)
    && TIERS.includes(player.difficulty) && POSITIONS.includes(player.position)
    && [player.age, player.marketValue].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0)
    && [player.goals, player.assists].every(number => number === null || (typeof number === 'number' && Number.isFinite(number) && number >= 0))
    && (player.kitNumber === null || (Number.isInteger(player.kitNumber) && player.kitNumber! > 0));
}

export function parseUnlimitedSession(raw: string | null): FootleUnlimitedSession | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as FootleUnlimitedSession;
    if (!session || session.v !== 1 || typeof session.active !== 'boolean' || !TIERS.includes(session.tier)
      || !session.decks || typeof session.decks !== 'object' || Array.isArray(session.decks)
      || Object.keys(session.decks).some(tier => !TIERS.includes(tier as Difficulty))) return null;
    for (const tier of TIERS) {
      const deck = session.decks[tier];
      if (deck === undefined) continue;
      if (!deck || !Array.isArray(deck.pool) || !deck.pool.length || deck.pool.length > 5000 || !deck.pool.every(isPlayer)
        || !Array.isArray(deck.seen) || !deck.seen.length || deck.seen.length > deck.pool.length
        || !deck.seen.every(name => typeof name === 'string' && name === normalizeName(name))
        || new Set(deck.seen).size !== deck.seen.length) return null;
      const pool = new Map(deck.pool.map(player => [player.name, player]));
      const identities = new Map(deck.pool.map(player => [normalizeName(player.name), player]));
      if (identities.size !== deck.pool.length || deck.seen.some(name => identities.get(name)?.difficulty !== tier)) return null;
      const round = deck.current;
      if (!round || typeof round.target !== 'string' || pool.get(round.target)?.difficulty !== tier
        || normalizeName(round.target) !== deck.seen[deck.seen.length - 1]
        || !['playing', 'won', 'lost'].includes(round.status) || !Array.isArray(round.guesses)
        || round.guesses.length > MAX_GUESSES || new Set(round.guesses).size !== round.guesses.length
        || round.guesses.some(name => typeof name !== 'string' || !pool.has(name))) return null;
      const correctAt = round.guesses.indexOf(round.target);
      if ((round.status === 'won') !== (correctAt >= 0) || (correctAt >= 0 && correctAt !== round.guesses.length - 1)
        || (round.status === 'playing' && round.guesses.length >= MAX_GUESSES)) return null;
    }
    return session;
  } catch { return null; }
}
