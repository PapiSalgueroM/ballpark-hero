/**
 * Round 703 fix: a refusal reason that arrives as an object reaches the page
 * as a string, in every connect 4 game.
 *
 * The validators answer a records or cache decided refusal with reason as an
 * object keyed by the two attributes. useFootballConnect4 has flattened that
 * since Round 397; the NBA, NFL, NHL and MLB hooks put it straight into
 * useState<string | null>, and <span>{validationError}</span> then threw
 * "Objects are not valid as a React child" and dropped the board to the
 * error boundary. Round 703 made that object the common shape of a stored
 * refusal the records overturn on one half, so the round's own headline case
 * crashed the page.
 *
 * Each hook is driven through its real submit path with fetch stubbed to
 * answer the object shape, and the reason that lands in state must be a
 * string carrying both halves. A string reason and an unverified refusal are
 * covered too, so the flattening cannot eat a plain message.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNbaConnect4 } from '@/hooks/useNbaConnect4';
import { useNflConnect4 } from '@/hooks/useNflConnect4';
import { useNhlConnect4 } from '@/hooks/useNhlConnect4';
import { useMlbConnect4 } from '@/hooks/useMlbConnect4';
import { normalizeValidationReason } from '@/lib/validationReason';

/* The completion recorder needs an AuthProvider; the refusal path never
   reaches it, so it is stubbed the way the other hook tests stub it. */
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

type Hook = () => {
  board: { columnAttributes: string[]; rowAttributes: string[] };
  validationError: string | null;
  selectColumn: (col: number) => void;
  submitPlayer: (name: string) => Promise<void>;
};

const HOOKS: Array<[string, Hook]> = [
  ['NBA', useNbaConnect4 as Hook],
  ['NFL', useNflConnect4 as Hook],
  ['NHL', useNhlConnect4 as Hook],
  ['MLB', useMlbConnect4 as Hook],
];

function answer(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a connect 4 refusal reason is always a string by the time it is state', () => {
  for (const [sport, useHook] of HOOKS) {
    it(`${sport}: an object reason keyed by the two attributes is flattened`, async () => {
      const { result } = renderHook(() => useHook());
      const col = result.current.board.columnAttributes[0];
      const rowAttr = result.current.board.rowAttributes[result.current.board.rowAttributes.length - 1];
      answer({
        valid: false,
        reason: { [rowAttr]: 'Verified from our own records.', [col]: 'This player does not match this attribute.' },
        fullName: 'Test Player',
        source: 'records',
      });
      act(() => result.current.selectColumn(0));
      await act(async () => { await result.current.submitPlayer('Test Player'); });
      const err = result.current.validationError;
      expect(typeof err).toBe('string');
      expect(err).toContain('Verified from our own records.');
      expect(err).toContain('This player does not match this attribute.');
    });

    it(`${sport}: a plain string reason is kept as it was`, async () => {
      const { result } = renderHook(() => useHook());
      answer({ valid: false, reason: 'Never played for that team.' });
      act(() => result.current.selectColumn(0));
      await act(async () => { await result.current.submitPlayer('Test Player'); });
      expect(result.current.validationError).toBe('Never played for that team.');
    });
  }
});

describe('normalizeValidationReason', () => {
  it('joins the values of an object reason and drops what is not text', () => {
    expect(normalizeValidationReason({ a: 'One.', b: 2, c: null, d: '  ' }, 'fb')).toBe('One. 2');
  });
  it('falls back on an empty string, an empty object and a non reason', () => {
    expect(normalizeValidationReason('   ', 'fb')).toBe('fb');
    expect(normalizeValidationReason({}, 'fb')).toBe('fb');
    expect(normalizeValidationReason(undefined, 'fb')).toBe('fb');
    expect(normalizeValidationReason(7, 'fb')).toBe('fb');
  });
});
