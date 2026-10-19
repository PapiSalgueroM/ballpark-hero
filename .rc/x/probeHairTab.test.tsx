// Release BL probe (not committed): the US create screen's hair tab, per sport, as the AppearanceBuilder renders it.
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { randomAppearance } from '@/lib/soccerCareerAppearance';

afterEach(() => cleanup());
for (const sport of ['nba', 'nfl', 'soccer'] as const) {
  it(`hair tab ${sport}`, () => {
    const look = randomAppearance();
    const view = render(<AppearanceBuilder appearance={look} sport={sport} onChange={() => {}} />);
    const before = view.container.querySelectorAll('button').length;
    const hair = Array.from(view.container.querySelectorAll('button')).find(b => /Hair/.test(b.textContent || ''));
    expect(hair).toBeTruthy();
    fireEvent.click(hair!);
    const buttons = Array.from(view.container.querySelectorAll('button'));
    console.log(`PROBE ${sport}: before ${before}, hair tab ${buttons.length} buttons; labels ${buttons.slice(7, 12).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim()).join('|')} ... ${buttons.slice(-17, -13).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim()).join('|')}; html ${view.container.innerHTML.length}`);
  });
}
