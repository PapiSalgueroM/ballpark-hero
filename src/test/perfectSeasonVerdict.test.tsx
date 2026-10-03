import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { BestRecord, PerfectSeasonSportKey } from '@/lib/perfectSeason';

/* Round 954: the shared Perfect Season verdict, rendered for all four sports.
   The share row is stubbed: it is the game's own and draws nothing this test
   asks about, and stubbing it keeps the share and challenge link modules out. */
vi.mock('@/components/game/ShareButtons', () => ({ default: () => <div data-share-stub /> }));

import { SeasonVerdict, verdictOutcome } from '@/components/perfect-season/SeasonVerdict';

afterEach(cleanup);

/* Each sport as its page passes it: the season length, the route, the sport the
   registry files it under, and the page's own middle tier (closeAt). */
const SPORTS: { key: PerfectSeasonSportKey; games: number; path: string; registrySport: string; closeAt: number }[] = [
  { key: 'nfl', games: 17, path: '/perfect-season-nfl', registrySport: 'football', closeAt: 12 },
  { key: 'nba', games: 82, path: '/perfect-season-nba', registrySport: 'basketball', closeAt: 60 },
  { key: 'mlb', games: 162, path: '/perfect-season-mlb', registrySport: 'baseball', closeAt: 110 },
  { key: 'nhl', games: 82, path: '/perfect-season-nhl', registrySport: 'hockey', closeAt: 55 },
];

type Kind = 'perfect' | 'near miss' | 'poor' | 'new best';
const KINDS: Kind[] = ['perfect', 'near miss', 'poor', 'new best'];

/** Wins for each fixture: perfect is the whole season, near miss loses two,
    poor is well under the close tier, new best sits just over it. */
function winsFor(kind: Kind, games: number, closeAt: number): number {
  if (kind === 'perfect') return games;
  if (kind === 'near miss') return games - 2;
  if (kind === 'poor') return Math.floor(closeAt / 2);
  return closeAt + 1;
}

function renderVerdict(sport: (typeof SPORTS)[number], kind: Kind) {
  const wins = winsFor(kind, sport.games, sport.closeAt);
  const losses = sport.games - wins;
  const perfect = losses === 0;
  const newBest = kind === 'new best';
  const best: BestRecord = { v: 1, wins: newBest ? wins : sport.games - 1, losses: newBest ? losses : 1, overall: 88, date: '2026-10-01', mode: 'classic' };
  const headline = `headline for ${sport.key} ${kind}`;
  const view = render(
    <SeasonVerdict
      gamePath={sport.path}
      sport={sport.key}
      wins={wins}
      losses={losses}
      perfect={perfect}
      closeAt={sport.closeAt}
      badge={perfect ? '🏆' : '📉'}
      headline={headline}
      overallLabel={88}
      overall={87.6}
      spins={9}
      best={best}
      newBest={newBest}
      shareName="Perfect Season"
      emojiGrid="🟩🟥"
      onRestart={() => {}}
    />,
  );
  return { ...view, wins, losses, headline };
}

describe('SeasonVerdict, four sports by four fixtures', () => {
  for (const sport of SPORTS) {
    for (const kind of KINDS) {
      it(`${sport.key}: ${kind}`, () => {
        const { container, wins, losses, headline } = renderVerdict(sport, kind);
        const moment = container.querySelector('[data-result-moment]');
        expect(moment).not.toBeNull();
        // the record is the fixture's, exactly, as the moment's score
        expect(container.querySelector('[data-result-score]')?.textContent).toBe(`${wins}-${losses}`);
        // the sport's ink comes from the registry by route, never from an if in the card
        expect(moment?.getAttribute('data-sport')).toBe(sport.registrySport);
        // win only for an unbeaten season; a miss at or over the page's tier is close
        const expected = kind === 'perfect' ? 'win' : kind === 'poor' ? 'loss' : 'close';
        expect(moment?.getAttribute('data-result-moment')).toBe(expected);
        expect(container.querySelector('h2')?.textContent).toBe(headline);
        // confetti on a perfect season only
        const confetti = container.querySelectorAll('.cm-confetti').length;
        if (kind === 'perfect') expect(confetti).toBeGreaterThan(0);
        else expect(confetti).toBe(0);
        // the slam on a new best only, on the best line, and the kit that animates it is mounted
        const slams = container.querySelectorAll('.cm-slam');
        if (kind === 'new best') {
          expect(slams.length).toBe(1);
          expect(slams[0].hasAttribute('data-new-best')).toBe(true);
          expect(slams[0].textContent).toBe('New personal best.');
        } else {
          expect(slams.length).toBe(0);
          expect(container.querySelector('[data-new-best]')).toBeNull();
        }
        const styles = Array.from(container.querySelectorAll('style')).map(s => s.textContent ?? '').join('\n');
        expect(styles).toContain('@keyframes cmSlam');
        // no animated class sits on a control
        for (const b of Array.from(container.querySelectorAll('button'))) {
          expect(b.className).not.toMatch(/\b(cm-|rm-)/);
        }
      });
    }
  }
});

describe('verdictOutcome', () => {
  it('walks every tier step: win only when perfect, close from the page tier up, loss below', () => {
    expect(verdictOutcome(true, 17, 12)).toBe('win');
    expect(verdictOutcome(false, 16, 12)).toBe('close');
    expect(verdictOutcome(false, 12, 12)).toBe('close');
    expect(verdictOutcome(false, 11, 12)).toBe('loss');
    expect(verdictOutcome(false, 0, 12)).toBe('loss');
    // a full win count that is not flagged perfect is never a win
    expect(verdictOutcome(false, 17, 12)).toBe('close');
  });
});
