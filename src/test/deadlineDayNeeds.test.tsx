import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Desk, Strip } from '@/components/deadline-day/DeadlineDayViews';
import type { useDeadlineDay } from '@/hooks/useDeadlineDay';
import { endDay, openTalks, offerPersonalTerms, placeBid, replayDeadlineDay, startDeadlineDay, termsWanted, type DeadlineRun } from '@/lib/deadlineDay';

const setup = { club: 'Arsenal', seed: 1 };

function signAtAsk(run: DeadlineRun, index: number): DeadlineRun {
  const talks = openTalks(run, index);
  const terms = placeBid(talks, index, talks.targets[index].neg!.theirAsk);
  return offerPersonalTerms(terms, index, termsWanted(terms, index)!);
}

function showDesk(run: DeadlineRun) {
  render(<>
    <Strip run={run} />
    <Desk run={run} hook={{} as ReturnType<typeof useDeadlineDay>} onOpen={() => {}} onSales={() => {}} />
  </>);
  return {
    strip: within(screen.getByTestId('deadline-strip')),
    desk: within(screen.getByTestId('deadline-desk')),
  };
}

describe('Deadline Day live needs', () => {
  it('uses the final assignment before closing and after replaying the two signings', () => {
    const fresh = startDeadlineDay(setup);
    const first = fresh.targets.findIndex(target => target.mp.name === 'Rúben Dias');
    const second = fresh.targets.findIndex(target => target.mp.name === 'Micky van de Ven');
    expect(fresh.targets[first].need).toBe(fresh.targets[second].need);

    const signed = signAtAsk(signAtAsk(fresh, first), second);
    const resumed = replayDeadlineDay(setup, signed.actions);
    expect(resumed.actions).toEqual(signed.actions);
    expect(endDay(resumed).grade).toMatchObject({
      score: 47,
      filled: 2,
      filledBy: [null, 'Micky van de Ven', 'Rúben Dias', null],
    });

    const { strip, desk } = showDesk(resumed);
    expect(strip.getByText('2 of 4')).toBeInTheDocument();
    expect(desk.getByText('centre back').parentElement).toHaveTextContent('Filled by Micky van de Ven');
    expect(desk.getByText('left back').parentElement).toHaveTextContent('Filled by Rúben Dias');
  });

  it('keeps a signing that fits just one need in its original group', () => {
    const fresh = startDeadlineDay(setup);
    const index = fresh.targets.findIndex(target => fresh.needs.filter(need =>
      need.allowed.includes(target.mp.position) && target.mp.rating >= need.min).length === 1);
    const target = fresh.targets[index];
    expect(index).toBeGreaterThanOrEqual(0);
    const signed = signAtAsk(fresh, index);
    const { strip, desk } = showDesk(signed);

    expect(strip.getByText('1 of 4')).toBeInTheDocument();
    expect(desk.getByText(`Filled by ${target.mp.name}`)).toBeInTheDocument();
    expect(endDay(signed).grade?.filledBy[target.need]).toBe(target.mp.name);
  });
});
