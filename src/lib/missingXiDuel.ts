import { dailyPrngSeed, shuffledRange } from '@/lib/dateUtils';
import { guessKey, HELD_LINEUP_IDS, isCorrectGuess, LINEUPS, MAX_GUESSES, scoreForGuess, type BlankCandidate, type Lineup } from '@/lib/missingXi';
import { normalizeName } from '@/lib/playerSearch';

export type Duel = { lineup: Lineup; blanks: BlankCandidate[]; code: string; comparison?: string };
export type DuelGuess = string | null;

function playerId(name: string) {
  return (dailyPrngSeed(normalizeName(name)) >>> 0).toString(36);
}

export function drawDuel(exclude: string[], lineups = LINEUPS) {
  const eligible = lineups.filter(l => !HELD_LINEUP_IDS.has(l.id) && !exclude.includes(l.id)
    && new Set(l.blankCandidates.map(b => l.slots[b.slotIndex].position)).size >= 3);
  const lineup = eligible[Math.floor(Math.random() * eligible.length)];
  if (!lineup) return null;
  const positions = new Set<string>();
  const blanks = shuffledRange(lineup.blankCandidates.length, String(Math.random())).map(i => lineup.blankCandidates[i]).filter(b => {
    const position = lineup.slots[b.slotIndex].position;
    if (positions.has(position)) return false;
    positions.add(position);
    return true;
  }).slice(0, 3);
  return ['v1', lineup.id, ...blanks.map(b => playerId(b.name))].join('.');
}

export function readDuel(hash: string, lineups = LINEUPS): Duel | null {
  const match = /^#duel=(v1\.([\w-]+)\.([a-z0-9]{1,7})\.([a-z0-9]{1,7})\.([a-z0-9]{1,7}))(?:~([123x]{3}))?$/.exec(hash);
  if (!match || HELD_LINEUP_IDS.has(match[2])) return null;
  const lineup = lineups.find(l => l.id === match[2]);
  if (!lineup) return null;
  const blanks: BlankCandidate[] = [];
  for (const id of match.slice(3, 6)) {
    const found = lineup.blankCandidates.filter(b => [b.name, ...(b.aliases ?? [])].some(name => playerId(name) === id));
    if (found.length !== 1) return null;
    blanks.push(found[0]);
  }
  if (new Set(blanks.map(b => lineup.slots[b.slotIndex].position)).size !== 3) return null;
  return { lineup, blanks, code: match[1], comparison: match[6] };
}

export function duelPoints(card: string) {
  return [...card].reduce((total, mark) => total + scoreForGuess(Number(mark)), 0);
}

export function duelProgress(duel: Duel, guesses: DuelGuess[]) {
  let card = '', misses: string[] = [];
  for (const guess of guesses) {
    const blank = duel.blanks[card.length];
    if (!blank) return null;
    if (guess === null) card += 'x';
    else {
      if (typeof guess !== 'string' || !guess.trim() || guess.length > 150) return null;
      if (isCorrectGuess(guess, blank)) card += String(misses.length + 1);
      else {
        const key = guessKey(guess, duel.lineup);
        if (misses.some(miss => guessKey(miss, duel.lineup) === key)) return null;
        misses.push(guess);
        if (misses.length < MAX_GUESSES) continue;
        card += 'x';
      }
    }
    misses = [];
  }
  return { card, misses };
}

export function restoreDuel(duel: Duel, raw: string | null): DuelGuess[] {
  try {
    const saved = JSON.parse(raw ?? 'null');
    return saved?.code === duel.code && Array.isArray(saved.guesses) && saved.guesses.length <= 9
      && duelProgress(duel, saved.guesses) ? saved.guesses : [];
  } catch { return []; }
}
