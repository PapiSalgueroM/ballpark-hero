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

import NflMyCareerBoard, { FIRST_ROUND_END as NFL_FIRST_ROUND_END } from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard, { FIRST_ROUND_END as NBA_FIRST_ROUND_END } from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard, { FIRST_ROUND_END as MLB_FIRST_ROUND_END } from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard, { FIRST_ROUND_END as NHL_FIRST_ROUND_END } from '@/components/nhl-my-career/NhlMyCareerBoard';
import DraftDayCard from '@/components/us-career/DraftDayCard';
import CoachCareerPanel from '@/components/us-career/CoachCareerPanel';
import { ARCHETYPES, startCareer } from '@/lib/nflMyCareer';
import { draftPressureLine } from '@/lib/usCareerReveal';
import { acceptCoachOffer, formatCoachRecord, playCoachSeason, startCoachCareer } from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';

/* The draw the coach season runs on. Pinned so the season resolves the same
   way every run; the test asserts the coach kept the job on it, so a change
   to the engine that makes this a firing goes red here rather than quietly
   turning the reveal assertions off. */
const SEASON_ROLL = 0.5;

/* [sport, board, how long round one really is in that sport, the number the
   board itself uses, save key]. The third column is written out here on
   purpose: it is this file's own statement of the fact, so a board quietly
   changing its constant turns the column red rather than agreeing with
   itself. */
const BOARDS: [string, ComponentType, number, number, string][] = [
  ['NFL', NflMyCareerBoard, 32, NFL_FIRST_ROUND_END, 'nfl-my-career-save-v1'],
  ['NBA', NbaMyCareerBoard, 30, NBA_FIRST_ROUND_END, 'nba-my-career-save-v1'],
  ['MLB', MlbMyCareerBoard, 30, MLB_FIRST_ROUND_END, 'mlb-my-career-save-v1'],
  ['NHL', NhlMyCareerBoard, 32, NHL_FIRST_ROUND_END, 'nhl-my-career-save-v1'],
];

/* The line the boards print under the pick, so a test that looks for it is
   looking for the string the shared helper actually writes. */
const FIRST_ROUND_LINES = [draftPressureLine(1, 32), draftPressureLine(20, 32)];
const saysFirstRound = (text: string) => FIRST_ROUND_LINES.some(l => text.includes(l));

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
  it.each(BOARDS)('%s mounts the draft day card with the engine pick and the confetti rule', (_, Board, firstRoundEnd, boardConst, saveKey) => {
    /* Round 530 review: the board's own constant is the sport's real round
       one. Three boards used to say 30 here while writing the line under the
       pick with 32, so picks 31 and 32 drew as second rounders under a line
       calling them first round money. */
    expect(boardConst).toBe(firstRoundEnd);
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
      /* And the card must agree with the line it is printing: a pick drawn
         as a first rounder says so, a pick drawn plain does not. */
      expect(saysFirstRound(text)).toBe(confetti);
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

describe('the pick either side of round one', () => {
  /* The pick the old code contradicted itself on. 31 is a second rounder in
     the NBA and the MLB and a first rounder in the NFL and the NHL, and the
     card must draw whatever its line says, in every sport. */
  it.each(BOARDS)('%s draws pick 31 the way the line under it reads', (_, __, firstRoundEnd, boardConst) => {
    expect(boardConst).toBe(firstRoundEnd);
    for (const pick of [30, 31, 32, 33]) {
      const line = draftPressureLine(pick, boardConst);
      const { container, unmount } = render(
        <DraftDayCard pick={pick} teamLabel="Testers" playerName="Tester" lines={[line]} firstRoundEnd={boardConst} />,
      );
      const card = container.querySelector('[data-draft-day]');
      expect(card).not.toBeNull();
      const confetti = card!.querySelectorAll('.cm-confetti').length > 0;
      expect(saysFirstRound(card!.textContent ?? '')).toBe(confetti);
      expect(confetti).toBe(pick <= firstRoundEnd);
      unmount();
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
    /* Round 530 review: the panel plays the season with playCoachSeason's
       default rng, which is Math.random, so the draw is pinned here. Left
       unpinned, whether the first season ended in a firing was a coin toss
       and the old test passed on either branch, which meant a green run was
       no evidence the reveal had rendered at all. */
    vi.spyOn(Math, 'random').mockReturnValue(SEASON_ROLL);
    const expected = playCoachSeason(coach, () => SEASON_ROLL);
    expect(expected.state.unemployed).toBe(false);
    const last = expected.state.results[expected.state.results.length - 1];
    const { container } = render(<Host start={coach} />);
    expect(container.querySelector('[data-coach-season-reveal]')).toBeNull();
    fireEvent.click(screen.getByText(/Coach the \d+ season/));
    const block = container.querySelector('[data-coach-season-reveal]');
    expect(block).not.toBeNull();
    const slam = block!.querySelector('.cm-slam');
    expect(slam).not.toBeNull();
    /* The record on the card is the engine's own, formatted by the engine's
       own formatter, not a number this screen worked out. */
    expect(slam!.textContent ?? '').toContain(formatCoachRecord(last));
    expect(block!.textContent ?? '').toContain(last.line);
    /* Every note playCoachSeason wrote, all of them, in order. */
    const notes = [...block!.querySelectorAll('.cm-tick-in')].map(n => n.textContent ?? '');
    expect(notes).toEqual(expected.notes);
    /* And the Latest box printed the same strings, so nothing was invented
       for the reveal alone. */
    const feedText = container.textContent ?? '';
    notes.forEach(n => expect(feedText).toContain(n));
  });
});
