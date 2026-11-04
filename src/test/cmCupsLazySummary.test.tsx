import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CupsPanel } from '@/components/club-manager/WorldCompScreen';
import { careerLeagueOf, cupSatOutBy, registerLeagueOverrides, startCareer, type CareerState } from '@/lib/clubManager';
import type { ReactNode } from 'react';

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); registerLeagueOverrides(null); vi.restoreAllMocks(); });

function fictional(leagueId: string): CareerState {
  return startCareer('Harbour Cup Test', undefined, {
    name: 'Harbour Cup Test', stadium: 'Harbour Test Ground', budgetTier: 'mid', leagueId, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'HCT' },
  });
}

function panel(career: CareerState, cupLine: ReactNode = undefined) {
  const league = careerLeagueOf(career);
  return <MemoryRouter><CupsPanel career={career} onClubClick={() => {}}
    cupTitle="Domestic cup" cupValue={league.cupName ?? cupSatOutBy(career) ?? 'No domestic cup'}
    cupLine={cupLine} uclHeading={<div>Champions League</div>}
    cupBracket={league.cupName === null ? undefined : <div data-test-cup-bracket>Saved cup bracket</div>} />
  </MemoryRouter>;
}

function cupText(view: ReturnType<typeof render>): string {
  const cup = view.container.querySelector('[data-cm-cups-view="cup"]');
  expect(cup).not.toBeNull();
  return cup!.textContent!.replace(/\s+/g, ' ').trim();
}

describe('Club Manager lazy domestic cup summary', () => {
  it('keeps the entered-cup summary, bracket order and explicit overrides', () => {
    const career = fictional('premier'), before = JSON.stringify(career);
    const cup = careerLeagueOf(career).cupName;
    expect(cup).not.toBeNull();
    const alive = { ...career, cupRound: 'F' as const, cupDraw: { ...career.cupDraw, F: 'Harbour Cup Opponent' } };
    const view = render(panel(alive));
    expect(view.container.querySelector('[data-cm-cups-view="cup"]')).toBeNull();
    fireEvent.click(view.container.querySelector('[data-cm-world-tile="cup"]')!);
    expect(cupText(view)).toContain(`${cup}: still alive. Next up, the final against Harbour Cup Opponent.`);
    const detail = view.container.querySelector('[data-cm-cups-view="cup"]')!;
    expect(detail.querySelector('[data-test-cup-bracket]')).not.toBeNull();
    expect(detail.textContent!.indexOf('still alive')).toBeLessThan(detail.textContent!.indexOf('Saved cup bracket'));
    view.rerender(panel({ ...career, cupRound: 'won' }));
    expect(cupText(view)).toContain(`${cup}: WON. It is in the cabinet.`);
    view.rerender(panel({ ...career, cupRound: 'out', cupExit: 'SF' }));
    expect(cupText(view)).toContain(`${cup}: out at the semi-final. Next year.`);
    view.rerender(panel(career, <p>Explicit saved cup summary</p>));
    expect(cupText(view)).toContain('Explicit saved cup summary');
    expect(cupText(view)).not.toContain('Next year.');
    for (const override of [null, false]) {
      view.rerender(panel(career, override));
      expect(cupText(view)).toBe('CupsSaved cup bracket');
    }
    expect(JSON.stringify(career)).toBe(before);
  });

  it('keeps separate no-cup and nonparticipant summaries without a bracket', () => {
    const noCup = fictional('ligamx'), before = JSON.stringify(noCup);
    const league = careerLeagueOf(noCup);
    expect(league.cupName).toBeNull(); expect(cupSatOutBy(noCup)).toBeNull();
    const view = render(panel(noCup));
    fireEvent.click(view.container.querySelector('[data-cm-world-tile="cup"]')!);
    expect(cupText(view)).toBe(`Cups🏅 There is no domestic cup in the ${league.name}, so the season is the league${league.euro ? ' and Europe' : ''}.`);
    expect(view.container.querySelector('[data-test-cup-bracket]')).toBeNull();
    const satOut = startCareer('Auckland FC'), satBefore = JSON.stringify(satOut);
    expect(careerLeagueOf(satOut).cupName).toBeNull(); expect(cupSatOutBy(satOut)).toBe('Australia Cup');
    view.rerender(panel(satOut));
    expect(cupText(view)).toBe('Cups🏅 Auckland FC do not enter the Australia Cup, so the season is the league.');
    expect(view.container.querySelector('[data-test-cup-bracket]')).toBeNull();
    expect(JSON.stringify(noCup)).toBe(before); expect(JSON.stringify(satOut)).toBe(satBefore);
  });
});
