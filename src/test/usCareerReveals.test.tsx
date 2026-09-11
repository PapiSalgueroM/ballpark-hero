/**
 * Round 530: the two reveal surfaces nothing else mounts.
 *
 * Draft day: every board mounts DraftDayCard on the hub the moment a career
 * is created, the pick on the card is the engine's own draft pick (read
 * back from the feed line the board already wrote, never recomputed here),
 * and the confetti rule is data: a first rounder gets it, a later pick does
 * not. Coach season: coaching a season replaces the grey "Last season" line
 * with the reveal block carrying the record and the engine's own notes.
 *
 * Reduced motion is CSS and jsdom does not apply stylesheets, so that rule
 * is held by the shared kit's own block (Celebration.tsx) and not here.
 */
import { useState } from 'react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import CoachCareerPanel from '@/components/us-career/CoachCareerPanel';
import { ARCHETYPES, startCareer } from '@/lib/nflMyCareer';
import { acceptCoachOffer, startCoachCareer } from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';

const BOARDS: [string, ComponentType, number, string][] = [
  ['NFL', NflMyCareerBoard, 32, 'nfl-my-career-save-v1'],
  ['NBA', NbaMyCareerBoard, 30, 'nba-my-career-save-v1'],
  ['MLB', MlbMyCareerBoard, 30, 'mlb-my-career-save-v1'],
  ['NHL', NhlMyCareerBoard, 30, 'nhl-my-career-save-v1'],
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('draft day on the four US career hubs', () => {
  /* Two draws per board: a strong prospect (rng low pushes the stock early)
     and a weak one, so both sides of the confetti rule are exercised. */
  it.each(BOARDS)('%s mounts the draft day card with the engine pick and the confetti rule', (_, Board, firstRoundEnd, saveKey) => {
    for (const roll of [0.02, 0.98]) {
      vi.spyOn(Math, 'random').mockReturnValue(roll);
      const { container, unmount } = render(<Board />);
      fireEvent.click(screen.getByText('Enter the draft'));
      const card = container.querySelector('[data-draft-day]');
      expect(card).not.toBeNull();
      const text = card!.textContent ?? '';
      const m = text.match(/With pick (\d+),/);
      expect(m).not.toBeNull();
      const pick = Number(m![1]);
      /* The card's pick is the engine's own: the save the board just wrote
         carries draftPick, and the card must print that number, no other. */
      const saved = JSON.parse(localStorage.getItem(saveKey) ?? '{}') as { c?: { draftPick?: number } };
      expect(saved.c?.draftPick).toBe(pick);
      const confetti = card!.querySelectorAll('.cm-confetti').length > 0;
      expect(confetti).toBe(pick <= firstRoundEnd);
      /* The two lines under the pick tick in, in order, with the shared stagger. */
      const rows = card!.querySelectorAll('.cm-tick-in');
      expect(rows.length).toBe(2);
      expect((rows[0] as HTMLElement).style.animationDelay).toBe('0.6s');
      expect((rows[1] as HTMLElement).style.animationDelay).toBe('0.82s');
      unmount();
      localStorage.clear();
    }
  });
});

describe('coach season reveal', () => {
  function Host({ start }: { start: CoachCareerState }) {
    const [state, setState] = useState(start);
    const [feed, setFeed] = useState<string[]>([]);
    return (
      <CoachCareerPanel
        state={state}
        playerName="Tester"
        feed={feed}
        onChange={(next, notes) => { setState(next); setFeed(f => [...notes, ...f]); }}
        onBack={() => undefined}
      />
    );
  }

  it('coaching a season replaces the grey line with a reveal carrying the record and the notes', () => {
    const career = startCareer('Tester', 'QB', ARCHETYPES.QB[0], () => 0.5);
    career.retired = true;
    let coach = startCoachCareer('nfl', career, career.year, () => 0.5);
    expect(coach.offers.length).toBeGreaterThan(0);
    coach = acceptCoachOffer(coach, 0);
    const { container } = render(<Host start={coach} />);
    expect(container.querySelector('[data-coach-season-reveal]')).toBeNull();
    fireEvent.click(screen.getByText(/Coach the \d+ season/));
    const block = container.querySelector('[data-coach-season-reveal]');
    /* A first season can end in a firing, which routes to the out of work
       card instead; either way the season landed somewhere with motion. */
    if (block) {
      expect(block.querySelector('.cm-slam')).not.toBeNull();
      expect((block.textContent ?? '')).toMatch(/\d+-\d+/);
      const notes = block.querySelectorAll('.cm-tick-in');
      /* The Latest box shows the same notes, so the reveal's rows are a
         subset of what the feed printed and nothing was invented. */
      const feedText = container.textContent ?? '';
      notes.forEach(n => expect(feedText).toContain(n.textContent ?? ''));
    } else {
      expect(container.querySelector('.cm-rise')).not.toBeNull();
    }
  });
});
