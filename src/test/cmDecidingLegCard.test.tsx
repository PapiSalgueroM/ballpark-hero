/* Round 1603 (player report b7b51855): the report card headlines a deciding second leg by the tie.

   A quarter final second leg lost 1-2 at home and won on penalties read DEFEAT. Now a deciding second leg reads
   THROUGH or OUT in the tie's tone, the night it was settled on sits under it as a fact, and the card pulses for
   going through and shakes for going out. Every other match keeps the night's word: a first leg, a league game and
   a report written before the tie line existed. The engine's side of the rule (the board, the dressing room and
   the fans) is held by scripts/simCmDecidingLeg.mjs. */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import type { MatchWeekReport } from '@/lib/clubManager';

vi.mock('@/components/game/VictoryMoment', () => ({ default: () => null }));
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const ME = 'Liverpool';
function report(over: Partial<MatchWeekReport>): MatchWeekReport {
  return {
    competition: 'uclKo', compLabel: 'Champions League · Quarter-final · second leg', home: ME, away: 'Away Club',
    homeGoals: 1, awayGoals: 0, won: true, drawn: false, decidedBy: 'regular',
    myScorers: [], oppScorers: [], events: [], trophyWon: null, myPosition: 4,
    confidence: 60, confidenceDelta: 0, otherResults: [],
    ...over,
  } as MatchWeekReport;
}
function shown(r: MatchWeekReport) {
  const view = render(<MatchReportCard report={r} clubName={ME} onContinue={() => {}} />);
  act(() => { vi.advanceTimersByTime(600); });
  const h2 = view.container.querySelector('h2');
  if (!h2) throw new Error('the card has no headline');
  const card = h2.parentElement!;
  return {
    head: h2.textContent ?? '',
    tone: h2.className,
    night: view.container.querySelector('[data-cm-night-line]')?.textContent ?? null,
    text: view.container.textContent ?? '',
    pulse: card.className.includes('cm-win-pulse'),
    shake: card.className.includes('cm-loss-shake'),
  };
}

describe('Club Manager: a deciding second leg is headlined by the tie (Round 1603)', () => {
  it('lost 1-2 at home, through on penalties: THROUGH, the 1-2 still printed, a pulse and no shake', () => {
    const s = shown(report({
      homeGoals: 1, awayGoals: 2, won: false, drawn: false, decidedBy: 'pens', shootoutWon: true,
      tie: { leg: 2, aggMine: 3, aggTheirs: 3, through: true, leg1Mine: 2, leg1Theirs: 1, leg1Home: false },
    }));
    expect(s.head).toBe('THROUGH (PENS)');
    expect(s.tone).toContain('text-correct');
    expect(s.tone).not.toContain('text-destructive');
    expect(s.night).toBe('Lost 1-2 on the night');
    expect(s.text).toContain('1 - 2');
    expect(s.text).toContain('Through on penalties');
    expect(s.text).not.toContain('DEFEAT');
    expect(s.pulse).toBe(true);
    expect(s.shake).toBe(false);
  });

  it('won 2-1 at home, out on aggregate: OUT, the 2-1 still printed, a shake and no pulse', () => {
    const s = shown(report({
      homeGoals: 2, awayGoals: 1, won: true, drawn: false, decidedBy: 'regular',
      tie: { leg: 2, aggMine: 2, aggTheirs: 4, through: false, leg1Mine: 0, leg1Theirs: 3, leg1Home: false },
    }));
    expect(s.head).toBe('OUT');
    expect(s.tone).toContain('text-destructive');
    expect(s.night).toBe('Won 2-1 on the night');
    expect(s.text).toContain('2 - 1');
    expect(s.text).toContain('Out 2-4 on aggregate');
    expect(s.text).not.toContain('VICTORY');
    expect(s.shake).toBe(true);
    expect(s.pulse).toBe(false);
  });

  it('reads the night in my orientation away from home, and a drawn night through on away goals', () => {
    const away = shown(report({
      home: 'Away Club', away: ME, homeGoals: 2, awayGoals: 0, won: false, drawn: false, decidedBy: 'regular',
      tie: { leg: 2, aggMine: 3, aggTheirs: 2, through: true, leg1Mine: 3, leg1Theirs: 0, leg1Home: true },
    }));
    expect(away.head).toBe('THROUGH');
    expect(away.night).toBe('Lost 0-2 on the night');
    const level = shown(report({
      homeGoals: 1, awayGoals: 1, won: false, drawn: true, decidedBy: 'regular',
      /* A tie the engine can write: 2-2 away, then 1-1 at home, 3-3 on aggregate and through on away goals (two to one). */
      tie: { leg: 2, aggMine: 3, aggTheirs: 3, byAwayGoals: true, through: true, leg1Mine: 2, leg1Theirs: 2, leg1Home: false },
    }));
    expect(level.head).toBe('THROUGH');
    expect(level.night).toBe('Drew 1-1 on the night');
  });

  it('keeps the night\'s word on a first leg, a league game and a report from before the tie line', () => {
    const first = shown(report({ homeGoals: 0, awayGoals: 1, won: false, tie: { leg: 1, aggMine: 0, aggTheirs: 1 } }));
    expect(first.head).toBe('DEFEAT');
    expect(first.night).toBeNull();
    expect(first.shake).toBe(true);
    const league = shown(report({ competition: 'league', compLabel: 'League', homeGoals: 1, awayGoals: 1, won: false, drawn: true }));
    expect(league.head).toBe('DRAW');
    const old = shown(report({ homeGoals: 1, awayGoals: 2, won: false, decidedBy: 'pens', shootoutWon: true }));
    expect(old.head).toBe('DEFEAT (PENS)');
    expect(old.night).toBeNull();
  });
});
