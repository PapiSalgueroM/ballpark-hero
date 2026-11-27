import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FlankPlayReview } from '@/components/club-manager/FlankPlayReview';
import { type PlayEvent } from '@/lib/clubManager';

afterEach(cleanup);

describe('the full-time flank review', () => {
  it('leaves a match without any recorded flank play alone', () => {
    const shot: PlayEvent = { kind: 'shot', side: 'me', minute: 60, who: 'Striker', on: true };
    render(<FlankPlayReview play={[shot]} opponent="Visitors" />);
    expect(screen.queryByRole('region', { name: 'Flank buildup' })).toBeNull();
  });

  it('shows just the latest observed pass on the live screen and leaves shot outcomes to the match clock', () => {
    const play: PlayEvent[] = [
      { kind: 'buildup', side: 'me', minute: 61, who: 'Left back', flankMove: { side: 'left', receiver: 'Forward', support: 'overlap', outcome: 'entry', covered: false } },
      { kind: 'buildup', side: 'me', minute: 67, who: 'Right back', flankMove: { side: 'right', receiver: 'Wide player', support: 'hold', outcome: 'turnover', covered: false } },
      { kind: 'shot', side: 'opp', minute: 67, who: 'Counter striker', goal: true, flankChance: 'counter' },
    ];
    render(<FlankPlayReview live play={play} opponent="Visitors" />);
    const region = screen.getByRole('region', { name: 'Latest flank move' });
    expect(region).toHaveTextContent('Right back looked for Wide player');
    expect(region).toHaveTextContent('Possession was lost');
    expect(region).not.toHaveTextContent('Left back');
    expect(region).not.toHaveTextContent('scored');
    expect(within(region).queryByRole('button')).toBeNull();
  });

  it('reads the lost ball, counter, defensive response and covered pass from their recorded times', () => {
    const plays: PlayEvent[] = [
      { kind: 'buildup', side: 'me', minute: 78, who: 'Midfielder',
        flankMove: { side: 'left', receiver: 'Winger', support: 'hold', outcome: 'recycle', covered: true } },
      { kind: 'shot', side: 'opp', minute: 55, who: 'Reserve striker', on: true, goal: false, whoGenerated: true, flankChance: 'counter' },
      { kind: 'buildup', side: 'me', minute: 55, who: 'Outside back',
        flankMove: { side: 'right', receiver: 'Winger', support: 'overlap', outcome: 'turnover', covered: false } },
      { kind: 'buildup', side: 'me', minute: 73, who: 'Midfielder',
        flankMove: { side: 'left', receiver: 'Youth winger', support: 'overlap', outcome: 'entry', covered: false, response: true, receiverGenerated: true } },
      { kind: 'shot', side: 'me', minute: 75, who: 'Unrelated scorer', goal: true },
    ];
    render(<FlankPlayReview play={plays} opponent="Visitors" />);
    const region = screen.getByRole('region', { name: 'Flank buildup' });
    const next = within(region).getByRole('button', { name: 'Next flank event' });
    expect(within(region).getByText('Right flank').parentElement).toHaveTextContent('0 entries · 1 lost');
    expect(within(region).getByText('Left flank').parentElement).toHaveTextContent('1 entry · 0 lost');
    expect(region).toHaveTextContent('Possession was lost.');
    expect(region).not.toHaveTextContent('shifted cover');
    expect(within(region).getByRole('button', { name: 'Previous flank event' })).toBeDisabled();
    fireEvent.click(next);
    expect(region).toHaveTextContent('Counterattack');
    expect(region).toHaveTextContent('shot on target');
    expect(within(region).getByText(/made up/i)).toBeVisible();
    fireEvent.click(next);
    expect(region).toHaveTextContent('Visitors shifted cover to the left after this entry.');
    fireEvent.click(next);
    expect(region).toHaveTextContent('Visitors already had extra cover on the left.');
    expect(region).toHaveTextContent('4 of 4');
    expect(next).toBeDisabled();
    expect(plays[0].minute).toBe(78);
  });
});
