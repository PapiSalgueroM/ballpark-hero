import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/* Round 1606: the display slots for the other dugouts. This file swaps in a SENTINEL table (never shipped): two
   made up names registered as real, Barcelona's opening day chair with its month and Bayern Munich's without one,
   and Sevilla on the partial list. A real man is a name and a date in a slot and nothing else. */
vi.mock('@/data/clubManagerDugouts', () => ({
  CM_DUGOUTS: { now: { Barcelona: { name: 'Testa Realmann', appointed: '2025-07' }, 'Bayern Munich': { name: 'Testa Realmann Zwei' } } },
  CM_DUGOUTS_PARTIAL: { now: ['Sevilla'] },
}));

import { ClubDetailScreen } from '@/components/club-manager/ClubDetailScreen';
import { MatchCentre } from '@/components/club-manager/MatchCentre';
import { dugoutOf, matchFacts, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { DUGOUT_MADE_UP_TITLE, DUGOUT_PARTIAL_TITLE } from '@/lib/realDugouts';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

const noop = () => {};
const clubPage = (career: CareerState, club: string) =>
  render(<ClubDetailScreen clubName={club} career={career} onBack={noop} />).container;
const madrid = () => withRoll(0.6, () => startCareer('Real Madrid'));

describe('the club page shows who is in the other dugout', () => {
  it('a real opening day chair shows his name and the month he took the job, and no MADE UP', () => {
    const c = madrid();
    expect(c.managers?.Barcelona).toMatchObject({ name: 'Testa Realmann', real: 1, appointed: '2025-07' });
    const slot = clubPage(c, 'Barcelona').querySelector('[data-cm-dugout]');
    expect(slot?.getAttribute('data-cm-dugout')).toBe('real');
    expect(slot?.textContent).toContain('Manager: Testa Realmann · since Jul 2025');
    expect(slot?.textContent).not.toContain('MADE UP');
  });

  it('a partial chair and an ordinary made up one wear MADE UP, each with its own reason', () => {
    const c = madrid();
    const partial = clubPage(c, 'Sevilla').querySelector('[data-cm-dugout]');
    expect(partial?.getAttribute('data-cm-dugout')).toBe('made-up');
    expect(partial?.querySelector('[title]')?.getAttribute('title')).toBe(DUGOUT_PARTIAL_TITLE);
    cleanup();
    const made = clubPage(c, 'Valencia').querySelector('[data-cm-dugout]');
    expect(made?.textContent).toContain(`Manager: ${c.managers?.Valencia?.name} · since S1`);
    expect(made?.querySelector('[title]')?.getAttribute('title')).toBe(DUGOUT_MADE_UP_TITLE);
  });

  it('your own club never shows the table\'s man', () => {
    const c = withRoll(0.6, () => startCareer('Barcelona'));
    expect(JSON.stringify(c)).not.toContain('Testa Realmann"');
    const page = clubPage(c, 'Barcelona');
    expect(page.querySelector('[data-cm-dugout]')).toBeNull();
    expect(page.textContent).not.toContain('Testa Realmann');
  });

  it('a club outside your league shows its opening day man in season one only', () => {
    const c = madrid();
    expect(dugoutOf(c, 'Bayern Munich')).toMatchObject({ name: 'Testa Realmann Zwei', real: 1 });
    const slot = clubPage(c, 'Bayern Munich').querySelector('[data-cm-dugout]');
    expect(slot?.textContent?.trim()).toBe('Manager: Testa Realmann Zwei');
    const next = withRoll(0.6, () => startNextSeason(c));
    expect(dugoutOf(next, 'Bayern Munich')).toBeNull();
  });
});

describe('the match preview names the opponent\'s manager in one line', () => {
  const centre = (career: CareerState) => {
    const facts = matchFacts(career);
    expect(facts).not.toBeNull();
    return render(<MatchCentre career={career} facts={facts!} clubColor="#ffffff" tone={null} onTone={noop}
      talkRead={null} talkStale={false} onQuickSim={noop} onLive={noop} onBack={noop} />).container;
  };

  it('a real man by name only, a made up one marked MADE UP', () => {
    const c = madrid();
    const opp = matchFacts(c)!.opponent;
    const made = centre(c).querySelector('[data-cm-mc-dugout]');
    expect(made?.getAttribute('data-cm-mc-dugout')).toBe(c.managers?.[opp]?.real ? 'real' : 'made-up');
    cleanup();
    const real: CareerState = { ...c, managers: { ...c.managers, [opp]: { name: 'Testa Realmann', since: 1, real: 1, appointed: '2025-07' } } };
    const slot = centre(real).querySelector('[data-cm-mc-dugout]');
    expect(slot?.getAttribute('data-cm-mc-dugout')).toBe('real');
    expect(slot?.textContent?.trim()).toBe('Manager: Testa Realmann');
  });
});
