/**
 * Round 668 fix, from the adversarial review: every age a player is shown
 * agrees with what the game says about it.
 *
 * 1. Clue Auction sold the age bracket from the age moved onto the newest
 *    list while the reveal card showed the listed age, so a 2025 row could be
 *    sold one bracket and revealed in another (Giacomo Raspadori, listed 24 on
 *    the 2025 list, was sold "25 to 28"). clueAge is now the one source of
 *    both, and the case here crosses a bracket edge on purpose.
 * 2. Who Am I's age chip put a green check and "Same listed age" on two
 *    different listed ages (a 2025 row at 29 against a 2026 secret at 30).
 *    ageReading only says 'same' for the same number on the same list.
 */
import { describe, it, expect } from 'vitest';
import { ageBracket, buildClueReveals, clueAge } from '@/lib/clueAuction';
import { ageOnNewestList, ageReading, scoreGuess, NEWEST_LIST_YEAR, type WhoAmIPlayer } from '@/lib/whoAmI';

const player = (name: string, age: number, year: number): WhoAmIPlayer => ({
  name,
  nationality: 'Italy',
  position: 'Centre-Forward',
  club: 'SSC Napoli',
  value: 30000000,
  age,
  year,
  personKey: 'sp:' + name,
});

const inBracket = (n: number, bracket: string): boolean => {
  if (bracket === 'Under 21') return n <= 20;
  if (bracket === '33 or older') return n >= 33;
  const m = bracket.match(/^(\d+) to (\d+)$/);
  return !!m && n >= Number(m[1]) && n <= Number(m[2]);
};

describe('1. Clue Auction sells the bracket of the age it reveals', () => {
  const older = NEWEST_LIST_YEAR - 1;
  const edgeCases: [number, number][] = [[24, older], [20, older], [28, older], [32, older], [24, NEWEST_LIST_YEAR], [33, NEWEST_LIST_YEAR]];

  it('the case crosses a bracket edge: the newest list age would sell another bracket', () => {
    const p = player('Edge Case', 24, older);
    expect(ageBracket(ageOnNewestList(p))).toBe('25 to 28');
    expect(clueAge(p)).toEqual({ years: 24, label: `24 (${older} list)`, bracket: '21 to 24' });
  });

  it.each(edgeCases)('listed %i on the %i list: the clue bracket holds the revealed number', (age, year) => {
    const p = player('Edge Case', age, year);
    const reveal = buildClueReveals(p, undefined, new Map());
    const shown = clueAge(p);
    expect(reveal.ageBracket).toBe(shown.bracket);
    expect(inBracket(Number.parseInt(shown.label, 10), reveal.ageBracket as string)).toBe(true);
  });
});

describe('2. Who Am I only checks the same listed age', () => {
  const hist = new Map<string, Set<string>>();

  it('29 on the older list against 30 on the newest is level, not the same', () => {
    const guess = player('Guess Older List', 29, NEWEST_LIST_YEAR - 1);
    const secret = player('Secret Newest List', 30, NEWEST_LIST_YEAR);
    const b = scoreGuess(guess, secret, hist);
    expect(b.ageDiff).toBe(0);
    expect(ageReading(guess, secret, b.ageDiff)).toBe('level');
  });

  it('the same number on the same list is the same', () => {
    const guess = player('Guess', 30, NEWEST_LIST_YEAR);
    const secret = player('Secret', 30, NEWEST_LIST_YEAR);
    expect(ageReading(guess, secret, scoreGuess(guess, secret, hist).ageDiff)).toBe('same');
  });

  it('the same number on two lists is a year apart, and says which way', () => {
    const guess = player('Guess', 30, NEWEST_LIST_YEAR - 1);
    const secret = player('Secret', 30, NEWEST_LIST_YEAR);
    expect(ageReading(guess, secret, scoreGuess(guess, secret, hist).ageDiff)).toBe('younger');
  });

  it('no listed age reads as none', () => {
    expect(ageReading(player('Retired', 0, 0), player('Secret', 30, NEWEST_LIST_YEAR), 30)).toBe('none');
  });
});
