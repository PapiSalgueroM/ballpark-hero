import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import type { MatchWeekReport } from '@/lib/clubManager';

vi.mock('@/components/game/VictoryMoment', () => ({ default: () => null }));

function report(overrides: Partial<MatchWeekReport> = {}): MatchWeekReport {
  return {
    competition: 'league', compLabel: 'League', home: 'Home Club', away: 'Away Club',
    homeGoals: 2, awayGoals: 2, won: false, drawn: true, decidedBy: 'regular',
    myScorers: [{ name: 'Our spot taker', minute: 45, plus: 2, penalty: true }],
    oppScorers: [{ name: 'Their spot taker', minute: 90, plus: 3, penalty: true }],
    events: [], trophyWon: null, myPosition: 4, confidence: 60, confidenceDelta: 0,
    otherResults: [], ...overrides,
  };
}

afterEach(cleanup);

describe('Club Manager penalty scorer markers', () => {
  it.each(['Home Club', 'Away Club'])('marks recorded penalties for both teams when managing %s', clubName => {
    const saved = JSON.stringify(report());
    const actual: MatchWeekReport = JSON.parse(saved);
    const next = vi.fn();
    render(<MatchReportCard report={actual} clubName={clubName} onContinue={next} />);
    expect(screen.queryByText("⚽ Our spot taker 45+2' (P)")).not.toBeNull();
    expect(screen.queryByText("⚽ Their spot taker 90+3' (P)")).not.toBeNull();
    expect(JSON.stringify(actual)).toBe(saved);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(next).toHaveBeenCalledOnce();
  });

  it('keeps ordinary goals, free kicks and assists distinct within the same report', () => {
    render(<MatchReportCard report={report({
      myScorers: [
        { name: 'Our spot taker', minute: 20, penalty: true },
        { name: 'Open play scorer', minute: 30, assist: 'Pass maker' },
        { name: 'Free kick scorer', minute: 55, freeKick: true },
      ],
      oppScorers: [{ name: 'Their open play scorer', minute: 75, penalty: false }],
    })} clubName="Home Club" onContinue={() => {}} />);
    expect(screen.getByText("⚽ Our spot taker 20' (P)")).toBeInTheDocument();
    const open = screen.getByText(/⚽ Open play scorer/);
    expect(open).toHaveTextContent("30'");
    expect(open).toHaveTextContent('Pass maker');
    for (const row of [open, screen.getByText(/⚽ Free kick scorer/), screen.getByText(/⚽ Their open play scorer/)]) {
      expect(row.textContent).not.toContain('(P)');
    }
  });

  it('does not infer a scorer penalty from a shootout result or an older missing flag', () => {
    render(<MatchReportCard report={report({
      decidedBy: 'pens', shootoutWon: true,
      myScorers: [{ name: 'Legacy scorer', minute: 12 }],
      oppScorers: [{ name: 'Other legacy scorer', minute: 60 }],
    })} clubName="Home Club" onContinue={() => {}} />);
    expect(screen.getByText('Through on penalties')).toBeInTheDocument();
    expect(screen.getByText(/⚽ Legacy scorer/).textContent).not.toContain('(P)');
    expect(screen.getByText(/⚽ Other legacy scorer/).textContent).not.toContain('(P)');
  });
});
