/* Round 1048: the US careers' lazy Season Center (the mirror of soccer's
   binding of the shared viewer), mounted by itself with a seeded career
   played through the real binding: tip off to the review, the tiles for a
   held year and for a load that fails, and nothing written anywhere but the
   help sheet's "seen it" flag. */
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import UsSeasonCentre from '@/components/us-career/season/UsSeasonCentre';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_SEASON } from '@/lib/season/nba';
import { keyedRng } from '@/lib/keyedRng';
import { usSeasonHeldLine } from '@/data/usSeasonLengths';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const WITH_LOADER: UsCareerSport = { ...NBA_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(NBA_SEASON) };

/** A career played with the binding's own calls on a seeded stream. */
function playNba(seed: string, seasons: number, eraId = 'now'): UsCareerCore {
  const rng = keyedRng(seed);
  const SB = NBA_CAREER_SPORT;
  const c = SB.startCareer('Trey Buckets', 'SG', SB.create.archetypes.SG[0], rng, null as never, eraId);
  let tq = SB.rollTeamQuality(null, rng);
  SB.assignRole(c, tq, rng);
  for (let i = 0; i < seasons; i += 1) {
    SB.campBattle(c, tq, rng);
    SB.simSeason(c, tq, rng);
    SB.progress(c, rng);
    tq = SB.rollTeamQuality(tq, rng);
  }
  return JSON.parse(JSON.stringify(c));
}

const press = (text: string) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').includes(text));
  if (!b) throw new Error(`usSeasonCentre.test: no button reading "${text}"`);
  act(() => { fireEvent.click(b); });
};
const mount = (sport: UsCareerSport, career: UsCareerCore, onClose = vi.fn()) => {
  const row = career.seasons[career.seasons.length - 1];
  render(<MemoryRouter><UsSeasonCentre sport={sport} career={career} row={row} onClose={onClose} /></MemoryRouter>);
  return { row, onClose };
};

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('the US Season Center, mounted by itself', () => {
  it('walks an NBA season from the tip off card to the review and closes', async () => {
    const career = playNba('centre-a', 2);
    const saved = JSON.stringify(career);
    const { row, onClose } = mount(WITH_LOADER, career);
    expect(document.querySelector('[data-season-centre-loading]')).not.toBeNull();
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    expect(document.querySelector('[data-us-season-centre]')).not.toBeNull();
    expect(document.querySelector('[data-season-help]')!.textContent).toContain('How the Season Center works');
    press('Got it');
    const kick = document.querySelector('[data-kickoff]')!;
    expect(kick.textContent).toContain(NBA_CAREER_SPORT.teamLabelOf(row.team, career.eraId));
    expect(kick.querySelector('[data-frame-line]')!.textContent).toContain('82 games · 41 home, 41 away');
    expect(kick.textContent).toContain('▶ Tip off');
    press('Tip off');
    press('Results');
    await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
    const clock = document.querySelector('[data-match-clock]')!;
    expect(clock.querySelectorAll('[data-clock-events] li')).toHaveLength(clock.textContent!.includes('take over') ? 9 : 8);
    expect(document.querySelector('[data-his-line]')!.textContent).toMatch(/\d+ PTS/);
    expect(document.querySelector('[data-full-time]')!.textContent).toBe('Final');
    expect(document.querySelector('[data-record-panel]')).not.toBeNull();
    press('Sim the rest');
    const review = document.querySelector('[data-review]')!;
    expect(review.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    expect(review.querySelector('[data-review-tile="Games"]')!.textContent).toContain(String(row.games));
    expect(review.querySelector('[data-review-tile="PPG"]')!.textContent).toContain(String((row as unknown as { ppg: number }).ppg));
    act(() => { fireEvent.click(document.querySelector('[data-centre-exit]')!); });
    expect(onClose).toHaveBeenCalledTimes(1);
    /* nothing but the help flag was written, and the career in memory is untouched */
    expect(JSON.stringify(career)).toBe(saved);
    expect(Object.keys(localStorage)).toEqual(['seasonCentre:help:nba']);
  });

  it('shows one honest tile for a year whose real length is not the one the career plays', async () => {
    const career = playNba('centre-b', 9, 'y2004');
    const at = career.seasons.findIndex(s => s.year === 2011);
    expect(at).toBeGreaterThan(-1);
    const onClose = vi.fn();
    render(<MemoryRouter><UsSeasonCentre sport={WITH_LOADER} career={career} row={career.seasons[at]} onClose={onClose} /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
    expect(document.querySelector('[data-centre-tile]')!.textContent).toContain(usSeasonHeldLine('nba', 2011)!);
    expect(document.querySelector('[data-kickoff]')).toBeNull();
    press('Back to your season');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers Retry when the numbers cannot be loaded, and loads on the second try', async () => {
    let calls = 0;
    const flaky: UsCareerSport = { ...NBA_CAREER_SPORT, loadSeasonCentre: () => { calls += 1; return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(NBA_SEASON); } };
    mount(flaky, playNba('centre-c', 1));
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
    expect(document.querySelector('[data-centre-tile]')!.textContent).toContain('could not be loaded');
    press('Retry');
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    expect(calls).toBe(2);
  });

  it('shows the plain tile, never a throw, for a binding with no Season Center', async () => {
    mount(NBA_CAREER_SPORT.loadSeasonCentre ? { ...NBA_CAREER_SPORT, loadSeasonCentre: undefined } : NBA_CAREER_SPORT, playNba('centre-d', 1));
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
  });
});
