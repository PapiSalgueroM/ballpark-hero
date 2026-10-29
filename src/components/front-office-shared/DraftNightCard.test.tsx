import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftNightCard } from './DraftNightCard';
import { buildDraftNight, draftNightHeadline } from '@/lib/draftNight';

/* Round 1540: one optional prop. Without it the card draws exactly today's headline, so the five boards that mount
   it see no change; with it the card draws the words it is handed (the earned draft's "Picks 1 to 11 are in."). */
const night = buildDraftNight(
  { team: 'AAA', playerName: 'Prospect One', pos: 'G', grade: 74 },
  [{ team: 'BBB', playerName: 'Prospect Two', pos: 'F', grade: 71 }, { team: 'CCC', playerName: 'Prospect Three', pos: 'C', grade: 70 }],
);
const headOf = (html: string): string | null => /<p class="fo-draft-head[^"]*">([^<]*)<\/p>/.exec(html)?.[1] ?? null;

describe('DraftNightCard headline', () => {
  it('no headline draws draftNightHeadline, as today', () => {
    const html = renderToStaticMarkup(<DraftNightCard night={night} />);
    expect(draftNightHeadline(night)).toBe('Your pick is in, and 2 more went off the board.');
    expect(headOf(html)).toBe(draftNightHeadline(night));
  });

  it('a headline draws its own text and nothing else of the card moves', () => {
    const plain = renderToStaticMarkup(<DraftNightCard night={night} />);
    const html = renderToStaticMarkup(<DraftNightCard night={night} headline="Picks 1 to 11 are in." />);
    expect(headOf(html)).toBe('Picks 1 to 11 are in.');
    expect(html.replace('Picks 1 to 11 are in.', draftNightHeadline(night))).toBe(plain);
  });

  it('zero rows draws nothing, with or without a headline', () => {
    const empty = buildDraftNight(null, []);
    expect(empty.picks).toHaveLength(0);
    expect(renderToStaticMarkup(<DraftNightCard night={empty} />)).toBe('');
    expect(renderToStaticMarkup(<DraftNightCard night={empty} headline="Picks 1 to 59 are in." />)).toBe('');
  });
});
