/**
 * Round 1335: a job offer asks before it moves the career (cm m8), and the review names the summer move a
 * season earned. The summary is the engine's own (finishSeason on a fresh career), with two offers put on it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import { finishSeason, startCareer, type SeasonSummary } from '@/lib/clubManager';

afterEach(cleanup);

const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const OFFERS = [
  { club: 'Fiorentina', blurb: 'A Contender club · Serie A (abroad) · 60m budget · the board wants: a top six finish' },
  { club: 'Brentford', blurb: 'A Contender club · Premier League · 55m budget · the board wants: a top ten finish' },
];
function review(extra: Partial<SeasonSummary> = {}) {
  const { state, summary } = finishSeason(startCareer('OB'));
  const sm: SeasonSummary = { ...summary, offers: OFFERS, ...extra };
  const g = { nextSeason: vi.fn(), startNew: vi.fn() };
  const view = render(<ClubManagerSeasonSummary sm={sm} c={{ ...state, pendingSummary: sm, jobHunt: undefined }} g={g} />);
  return { view, g, sm };
}
const card = (root: HTMLElement, club: string) => root.querySelector(`[data-cm-offer="${club}"]`) as HTMLButtonElement;

describe('Round 1335: an offer asks first', () => {
  it('a tap on an offer moves nothing and opens the question in the same panel', () => {
    const { view, g } = review();
    const panel = view.container.querySelector('[data-cm-offers]')!;
    fireEvent.click(card(view.container, 'Fiorentina'));
    expect(g.nextSeason).not.toHaveBeenCalled();
    const ask = panel.querySelector('[data-cm-offer-confirm]')!;
    expect(ask).not.toBeNull();
    expect(ask.textContent).toContain('Take the Fiorentina job?');
    expect(ask.textContent).toContain(OFFERS[0].blurb);
    expect(panel.querySelector('[data-cm-offer]')).toBeNull();
    expect(document.activeElement).toBe(panel.querySelector('[data-cm-offer-take]'));
    for (const d of DASHES) expect(ask.textContent ?? '').not.toContain(d);
  });

  it('Take the job moves the career to that club, once', () => {
    const { view, g } = review();
    fireEvent.click(card(view.container, 'Brentford'));
    fireEvent.click(view.container.querySelector('[data-cm-offer-take]')!);
    expect(g.nextSeason).toHaveBeenCalledTimes(1);
    expect(g.nextSeason).toHaveBeenCalledWith('Brentford');
  });

  it('Back moves nothing, shows the list again and gives focus back to the card', () => {
    const { view, g } = review();
    fireEvent.click(card(view.container, 'Fiorentina'));
    fireEvent.click(view.container.querySelector('[data-cm-offer-back]')!);
    expect(g.nextSeason).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-cm-offer-confirm]')).toBeNull();
    expect(card(view.container, 'Fiorentina')).not.toBeNull();
    expect(card(view.container, 'Brentford')).not.toBeNull();
    expect(document.activeElement).toBe(card(view.container, 'Fiorentina'));
  });

  it('Continue still turns every offer down', () => {
    const { view, g, sm } = review();
    const cont = [...view.container.querySelectorAll('button')].find(b => b.textContent?.includes(`Continue to Season ${sm.season + 1}`))!;
    expect(cont).toBeDefined();
    fireEvent.click(cont);
    expect(g.nextSeason).toHaveBeenCalledTimes(1);
    expect(g.nextSeason.mock.calls[0].length === 0 || g.nextSeason.mock.calls[0][0] === undefined).toBe(true);
  });

  it('names the summer move a season earned, and a summary with none prints no such line', () => {
    const up = review({ fate: 'up' });
    expect(up.view.container.querySelector('[data-cm-fate="up"]')?.textContent).toContain('You went up.');
    cleanup();
    const plain = review();
    expect(plain.view.container.querySelector('[data-cm-fate]')).toBeNull();
  });
});
