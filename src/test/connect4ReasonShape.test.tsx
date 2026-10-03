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
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Connect4Finish, Connect4FinishStatus, connect4ShareScore } from '@/components/connect4/Connect4Finish';
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

/* ---------- Round 952: a two player game played to its end, in every sport ----------
   Every answer is accepted (fetch stubbed to valid, the name echoed back), so
   what is measured is the game's own end: four in a row flips the phase to
   won for that colour, and a full board with no four flips it to draw. The
   validators are not touched; this only drives the real submit path. */
type FullHook = Hook & {
  grid: Array<Array<{ team: 'red' | 'blue' } | null>>;
  currentTeam: 'red' | 'blue';
  phase: 'playing' | 'won' | 'draw';
  winInfo: { winner: 'red' | 'blue' } | null;
  getTargetRow: (col: number) => number | null;
  skipTurn: () => void;
};

function acceptEverything() {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => ({
    ok: true,
    status: 200,
    json: async () => ({ valid: true, fullName: JSON.parse(init.body).playerName }),
  })));
}

/* A full 6 by 7 board with no four in a row for either colour, checked by
   the "a draw has no winner" expectation below as much as by hand. */
const DRAW_ROWS = ['RRBBRRB', 'RRBBRRB', 'RRBBRRB', 'BBRRBBR', 'RRBBRRB', 'RRBBRRB'];

async function drop(result: { current: FullHook }, col: number, team: 'red' | 'blue', name: string) {
  if (result.current.currentTeam !== team) act(() => result.current.skipTurn());
  act(() => result.current.selectColumn(col));
  await act(async () => { await result.current.submitPlayer(name); });
}

describe('Round 952: a game played to its end flips the phase the finish reads', () => {
  for (const [sport, useHook] of HOOKS) {
    it(`${sport}: four in a column wins it for the colour that connected`, async () => {
      acceptEverything();
      const { result } = renderHook(() => (useHook as unknown as () => FullHook)());
      for (let i = 0; i < 3; i++) {
        await drop(result, 0, 'red', `Red Player ${i}`);
        await drop(result, 1, 'blue', `Blue Player ${i}`);
        expect(result.current.phase).toBe('playing');
      }
      await drop(result, 0, 'red', 'Red Player 3');
      expect(result.current.phase).toBe('won');
      expect(result.current.winInfo?.winner).toBe('red');
    });

    it(`${sport}: a full board with no four in a row is a draw`, async () => {
      acceptEverything();
      const { result } = renderHook(() => (useHook as unknown as () => FullHook)());
      let n = 0;
      for (let col = 0; col < 7; col++) {
        for (let row = result.current.getTargetRow(col); row !== null; row = result.current.getTargetRow(col)) {
          expect(result.current.phase).toBe('playing');
          await drop(result, col, DRAW_ROWS[row][col] === 'R' ? 'red' : 'blue', `Player ${n++}`);
        }
      }
      expect(n).toBe(42);
      expect(result.current.grid.every(r => r.every(c => c !== null))).toBe(true);
      expect(result.current.phase).toBe('draw');
      expect(result.current.winInfo).toBeNull();
    }, 20000);
  }
});

describe('Round 952: Connect4Finish is the shared result moment', () => {
  it('renders nothing while the game is being played', () => {
    const { container } = render(<><Connect4FinishStatus phase="playing" /><Connect4Finish phase="playing" gameName="NBA Connect 4" gamePath="/nba-connect-4" onNewGame={() => {}} /></>);
    expect(container.innerHTML).toBe('');
  });

  for (const winner of ['red', 'blue'] as const) {
    it(`a ${winner} win is the win state, headlined by that colour, with its disc in the pill`, () => {
      const onNewGame = vi.fn();
      const { container } = render(<Connect4Finish phase="won" winner={winner} gameName="NHL Connect 4" gamePath="/nhl-connect-4" onNewGame={onNewGame} />);
      const moment = container.querySelector('[data-result-moment]');
      expect(moment?.getAttribute('data-result-moment')).toBe('win');
      expect(moment?.getAttribute('data-sport')).toBe('hockey');
      const name = winner === 'red' ? 'Red' : 'Blue';
      expect(container.querySelector('h2')?.textContent).toBe(`${name} wins!`);
      expect(container.querySelector(`[data-connect4-disc="${winner}"]`)).not.toBeNull();
      expect(container.querySelector('[data-result-score]')).toBeNull();
      expect(connect4ShareScore('won', winner)).toBe(`${name} wins`);
      /* a plain query, not getByRole: the role walk is slow enough in jsdom
         to time out a cold first render on a busy machine */
      const newGame = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === 'New Game');
      expect(newGame).toBeDefined();
      fireEvent.click(newGame!);
      expect(onNewGame).toHaveBeenCalledTimes(1);
    }, 20000);
  }

  it('a draw is the close state, says so, and keeps the old share line', () => {
    const { container } = render(<><Connect4FinishStatus phase="draw" /><Connect4Finish phase="draw" gameName="MLB Connect 4" gamePath="/mlb-connect-4" onNewGame={() => {}} /></>);
    expect(container.querySelector('[data-result-moment]')?.getAttribute('data-result-moment')).toBe('close');
    expect(container.querySelector('h2')?.textContent).toBe("It's a draw!");
    expect(container.querySelector('[data-connect4-status]')?.textContent).toBe('Board full, no four in a row');
    expect(connect4ShareScore('draw', null)).toBe('Draw');
  }, 20000);
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
