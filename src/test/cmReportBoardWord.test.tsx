/* Round 1340: the report card's word under the board number is the header meter's word.

   Before this round the card printed confidenceLabel ("Steady" from 45 to 59) and coloured the number on its own
   60 and 30 lines, while the header's meter (MetersStrip, boardMeter) said "Under pressure" from 10 to 59. And under
   No sacking the header has its own words below the edge (Round 1342), which the card cannot know without being
   told: the page passes noSack. Two copies of one rule drift, so this file renders both for the same confidence,
   every whole value from 0 to 100 with No sacking on and off, and asserts the same word and the same tone class.
   Its control renders the card without the prop on a No sacking career at 5 and asserts the words differ, so the
   comparison is known to be able to fail. */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { MetersStrip } from '@/components/club-manager/MetersStrip';
import { startCareer } from '@/lib/clubManager';
import type { CareerState, MatchWeekReport } from '@/lib/clubManager';

vi.mock('@/components/game/VictoryMoment', () => ({ default: () => null }));
afterEach(cleanup);

const TONES = ['text-emerald-400', 'text-yellow-400', 'text-red-400'];
const toneOf = (el: Element) => TONES.filter(t => el.className.split(/\s+/).includes(t));

const base = startCareer('Liverpool');
function career(confidence: number, noSack: boolean): CareerState {
  const startOptions = { ...(base.startOptions ?? {}), noSack: noSack ? 1 : undefined } as CareerState['startOptions'];
  return { ...base, boardConfidence: confidence, startOptions };
}

function report(confidence: number): MatchWeekReport {
  return {
    competition: 'league', compLabel: 'League', home: 'Liverpool', away: 'Away Club',
    homeGoals: 1, awayGoals: 0, won: true, drawn: false, decidedBy: 'regular',
    myScorers: [], oppScorers: [], events: [], trophyWon: null, myPosition: 4,
    confidence, confidenceDelta: 0, otherResults: [],
  } as MatchWeekReport;
}

function headerWord(c: CareerState) {
  const { container, unmount } = render(<MetersStrip career={c} />);
  const span = container.querySelector('[data-cm-meter="board"] div > span:nth-child(2)');
  if (!span) throw new Error('the header has no board word');
  const out = { word: span.textContent ?? '', tone: toneOf(span) };
  unmount();
  return out;
}

function cardWord(confidence: number, noSack: boolean | undefined) {
  const props = noSack === undefined ? {} : { noSack };
  const { container, unmount } = render(<MatchReportCard report={report(confidence)} clubName="Liverpool" onContinue={() => {}} {...props} />);
  const el = container.querySelector('[data-cm-board-word]');
  if (!el) throw new Error('the card has no board word');
  const out = { word: el.textContent ?? '', tone: toneOf(el) };
  unmount();
  return out;
}

describe('the report card and the header say the same thing about the board', () => {
  for (const noSack of [false, true]) {
    it(`agrees at every whole value from 0 to 100, No sacking ${noSack ? 'on' : 'off'}`, () => {
      const seen = new Set<string>();
      for (let v = 0; v <= 100; v++) {
        const head = headerWord(career(v, noSack));
        const card = cardWord(v, noSack);
        expect(card.word, `confidence ${v}`).toBe(head.word);
        expect(head.tone).toHaveLength(1);
        expect(card.tone, `confidence ${v}`).toEqual(head.tone);
        seen.add(card.word);
      }
      /* Every band is reached, so the loop proved something at each edge. */
      expect(seen.size).toBe(noSack ? 3 : 4);
    });
  }

  it('control: a card that is not told about No sacking disagrees with the header at 5', () => {
    const head = headerWord(career(5, true));
    const card = cardWord(5, undefined);
    expect(head.word).toBe('Lost the board · No sacking');
    expect(card.word).not.toBe(head.word);
  });
});
