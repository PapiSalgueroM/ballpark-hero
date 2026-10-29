import React, { type ComponentType } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choosePostRetirement, FALLBACK_CLUBS, getCareerTotals, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData, PostRetirementChoice } from '@/lib/soccerCareerEngine';
import { startCoachingAppointment, type CoachingStartQuote } from '@/lib/soccerCareerCoachingStart';
import { buildSoccerCoachingStartObserver } from '../../scripts/qa/buildSoccerCoachingStartObserver.mjs';

type Props = {
  career: CareerState; clubs: ClubData[]; totals: ReturnType<typeof getCareerTotals>;
  onPostRetirement?: (choice: PostRetirementChoice, ownerClub?: string) => void;
  onChoice?: (choice: PostRetirementChoice, ownerClub?: string) => void;
  onCoachingStart?: (quote: CoachingStartQuote) => void;
};
type Card = ComponentType<Props>;
const require = createRequire(import.meta.url);
let cards: Record<string, Card>, releaseCommon: (() => void) | undefined;
beforeAll(async () => {
  const built = await buildSoccerCoachingStartObserver();
  releaseCommon = built.dispose;
  cards = require(built.file);
}, 60_000);
afterAll(() => { releaseCommon?.(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const consumers = [
  { name: 'ceremony', exportName: 'RetirementCeremonyCard', phase: 'retirement_ceremony' as const },
  { name: 'direct retirement', exportName: 'PostRetirementCard', phase: 'post_retirement' as const },
];
function retired(phase: CareerState['phase']): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing complete recorded career ere is required');
  const input = structuredClone(saved.state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34;
  const state = manualRetire(input);
  state.phase = phase; state.managerState = null; state.postRetirementChoice = null;
  state.lifeFlags = { ...(state.lifeFlags ?? {}), coachingBadges: 3 };
  return state;
}
function seeded<T>(seed: number, action: () => T) {
  const random = Math.random, now = Date.now, draws: number[] = [];
  let n = seed >>> 0;
  const draw = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = () => { const value = draw(); draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { const value = action(); return { value, draws, next: draw() }; }
  finally { Math.random = random; Date.now = now; }
}
function view(Card: Card, career: CareerState, ordinary: Props['onChoice'], prepared: Props['onCoachingStart']) {
  return <Card career={career} clubs={FALLBACK_CLUBS} totals={getCareerTotals(career.seasons)}
    onChoice={ordinary} onPostRetirement={ordinary} onCoachingStart={prepared} />;
}
function clubButtons() {
  return screen.getAllByRole('button').filter(button => /Club level \d+/.test(button.textContent ?? ''));
}
async function openReady() {
  fireEvent.click(screen.getByRole('button', { name: 'Use coaching coursework' }));
  const heading = await screen.findByRole('heading', { name: 'Choose your first club' }, { timeout: 10_000 });
  await waitFor(() => {
    const buttons = clubButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons.every(button => !button.hasAttribute('disabled'))).toBe(true);
  }, { timeout: 10_000 });
  return heading;
}
function shownClub(button: HTMLElement): ClubData {
  const matches = FALLBACK_CLUBS.filter(club => club.tier >= 3
    && within(button).queryByText(club.name, { exact: true })
    && within(button).queryByText(club.country, { exact: true }));
  expect(matches).toHaveLength(1);
  expect(within(button).getByText('Club level ' + matches[0].tier, { exact: true })).toBeTruthy();
  return matches[0];
}

describe('actual retirement card coaching lifecycle', () => {
  for (const spec of consumers) {
    it(spec.name + ' cold pending Back restores its actual opener without a late reopen', async () => {
      // A fresh actual CJS page gives this case its own first React.lazy tick.
      // This observes the real pending tick, not a deliberately stalled network promise.
      const built = await buildSoccerCoachingStartObserver();
      try {
        const Card = require(built.file)[spec.exportName] as Card;
        const career = retired(spec.phase), before = JSON.stringify(career), ordinary = vi.fn(), prepared = vi.fn();
        render(view(Card, career, ordinary, prepared));
        const opener = screen.getByRole('button', { name: 'Use coaching coursework' });
        opener.focus(); fireEvent.click(opener);
        expect(screen.getByRole('status').textContent).toBe('Opening coaching options...');
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use coaching coursework' })));
        await act(async () => { await Promise.resolve(); });
        expect(screen.queryByRole('heading', { name: 'Choose your first club' })).toBeNull();
        expect(ordinary).not.toHaveBeenCalled(); expect(prepared).not.toHaveBeenCalled();
        expect(JSON.stringify(career)).toBe(before);
      } finally { cleanup(); built.dispose(); }
    }, 30_000);

    it(spec.name + ' loaded chooser keeps help and Back focus without committing', async () => {
      const career = retired(spec.phase), before = JSON.stringify(career), ordinary = vi.fn(), prepared = vi.fn();
      render(view(cards[spec.exportName], career, ordinary, prepared));
      const heading = await openReady();
      await waitFor(() => expect(document.activeElement).toBe(heading));
      expect(screen.getByText(/Coursework adds no licence, money or rating bonus/)).toBeTruthy();
      expect(screen.getByText(/^Example: pick a shown club/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Coaching start help' }));
      expect(screen.queryByText(/^Example: pick a shown club/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Coaching start help' }));
      expect(screen.getByText(/^Example: pick a shown club/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use coaching coursework' })));
      expect(ordinary).not.toHaveBeenCalled(); expect(prepared).not.toHaveBeenCalled();
      expect(JSON.stringify(career)).toBe(before);
    }, 20_000);

    it(spec.name + ' selected displayed club uses the actual canonical one-draw appointment', async () => {
      const career = retired(spec.phase), before = JSON.stringify(career), ordinary = vi.fn();
      let committed: CareerState | undefined;
      const prepared = vi.fn((quote: CoachingStartQuote) => { committed = startCoachingAppointment(career, FALLBACK_CLUBS, quote); });
      render(view(cards[spec.exportName], career, ordinary, prepared));
      await openReady();
      const button = clubButtons()[1], selected = shownClub(button);
      const expected = seeded(7319, () => choosePostRetirement(structuredClone(career), 'manager', [selected]));
      const actual = seeded(7319, () => { fireEvent.click(button); return committed; });
      expect(prepared).toHaveBeenCalledTimes(1); expect(ordinary).not.toHaveBeenCalled();
      const quote = prepared.mock.calls[0][0];
      expect(quote.source).toBe(career); expect(quote.clubId).toBe(selected.id); expect(quote.clubName).toBe(selected.name);
      expect(quote.country).toBe(selected.country); expect(quote.level).toBe(selected.tier);
      expect(actual.value).toStrictEqual(expected.value); expect(JSON.stringify(actual.value)).toBe(JSON.stringify(expected.value));
      expect(actual.draws).toEqual(expected.draws); expect(actual.draws).toHaveLength(1); expect(actual.next).toBe(expected.next);
      expect(actual.value?.managerState?.club).toBe(selected.name); expect(actual.value?.managerState?.season).toBe(0);
      expect(JSON.stringify(career)).toBe(before);
    }, 20_000);

    it(spec.name + ' rejects a captured old quote after replacement and rebinds current choices', async () => {
      const career = retired(spec.phase), before = JSON.stringify(career), ordinary = vi.fn();
      const capture = vi.fn((quote: CoachingStartQuote) => quote);
      const mounted = render(view(cards[spec.exportName], career, ordinary, capture));
      await openReady(); fireEvent.click(clubButtons()[1]);
      expect(capture).toHaveBeenCalledTimes(1);
      const oldQuote = capture.mock.calls[0][0]; expect(oldQuote.source).toBe(career);
      const replacement = structuredClone(career), replacementBefore = JSON.stringify(replacement);
      expect(replacement).not.toBe(career); expect(replacementBefore).toBe(before);
      const current = replacement;
      const commit = vi.fn((quote: CoachingStartQuote) => startCoachingAppointment(current, FALLBACK_CLUBS, quote));
      const stale = seeded(8123, () => commit(oldQuote));
      expect(commit).toHaveBeenCalledTimes(1); expect(commit).toHaveBeenLastCalledWith(oldQuote);
      expect(stale.value).toBe(replacement); expect(stale.draws).toEqual([]);
      expect(stale.next).toBe(seeded(8123, () => null).next);
      mounted.rerender(view(cards[spec.exportName], replacement, ordinary, commit));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Choose your first club' })).toBeTruthy();
        expect(clubButtons()).toHaveLength(3);
        expect(clubButtons().every(button => !button.hasAttribute('disabled'))).toBe(true);
      });
      const button = clubButtons()[1], selected = shownClub(button);
      const expected = seeded(7319, () => choosePostRetirement(structuredClone(replacement), 'manager', [selected]));
      const actual = seeded(7319, () => { fireEvent.click(button); return commit.mock.results[1]?.value; });
      expect(commit).toHaveBeenCalledTimes(2); expect(commit.mock.calls[1][0].source).toBe(replacement);
      expect(actual.value).toStrictEqual(expected.value); expect(JSON.stringify(actual.value)).toBe(JSON.stringify(expected.value));
      expect(actual.draws).toEqual(expected.draws); expect(actual.draws).toHaveLength(1); expect(actual.next).toBe(expected.next);
      expect(ordinary).not.toHaveBeenCalled(); expect(capture).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(career)).toBe(before); expect(JSON.stringify(replacement)).toBe(replacementBefore);
    }, 20_000);
  }
});
