/**
 * Round 1544, from its review (N9, N4 and the format line): the result screen's truth lines, through the real
 * NBA notes and the real screen. A summer the real tournament was played says so; a summer still to come never
 * does and says its field is the game's own; a projected summer says host and field are; the two group rounds
 * line shows only on a World Cup really played that way (2019, 2023), since no page read holds 2027's format.
 * Its own file so the board test's lazy loads stay cold (this one imports the face and the screen statically).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import IntlSummerResult from '@/components/us-career/IntlSummerResult';
import { nbaIntlSummerNotes } from '@/lib/nbaCareerIntl';

afterEach(() => { cleanup(); });

const PLAYED = 'The real tournament was played';
const FUTURE = 'This field is the game\'s own.';
const PROJECTED = 'Host and field are the game\'s own.';
const FORMAT = 'two group rounds';

function shown(id: string): string {
  const n = nbaIntlSummerNotes(id, 28);
  const row = { year: Number(id.slice(-4)), edition: id, went: true as const, age: 28, place: 'bronze' as const, games: 8, wins: 6, avg: { pts: 14.5, reb: 4, ast: 3.1 }, hurt: false };
  const { container } = render(
    <IntlSummerResult
      editionLabel={n.label} row={row} tournament={null} nation={n.nation}
      happened={n.happened} fieldNote={n.fieldNote} playedAsNote={n.playedAsNote} statWords={n.statWords}
      hurtCost={n.hurtCost} continueLabel="Continue" onContinue={() => undefined}
    />,
  );
  const text = container.textContent ?? '';
  cleanup();
  return text;
}

describe('the result screen says only what is true of its summer', () => {
  it('a played summer: the real tournament was played, no game\'s own field', () => {
    for (const id of ['oly-2004', 'wc-2019', 'oly-2024']) {
      const t = shown(id);
      expect(t, id).toContain(PLAYED);
      expect(t, id).not.toContain(FUTURE);
      expect(t, id).not.toContain(PROJECTED);
    }
  });
  it('a summer still to come: never played, the field is the game\'s own', () => {
    for (const id of ['wc-2027', 'oly-2028', 'wc-2031', 'oly-2032']) {
      const t = shown(id);
      expect(t, id).not.toContain(PLAYED);
      expect(t, id).toContain(FUTURE);
      expect(t, id).not.toContain(FORMAT);
    }
  });
  it('a projected summer: never played, host and field are the game\'s own', () => {
    for (const id of ['wc-2035', 'oly-2036', 'wc-2039']) {
      const t = shown(id);
      expect(t, id).not.toContain(PLAYED);
      expect(t, id).toContain(PROJECTED);
      expect(t, id).not.toContain(FORMAT);
    }
  });
  it('the two group rounds line only on a World Cup really played with them', () => {
    expect(shown('wc-2019')).toContain(FORMAT);
    expect(shown('wc-2023')).toContain(FORMAT);
    expect(shown('oly-2004')).not.toContain(FORMAT);
  });
});
