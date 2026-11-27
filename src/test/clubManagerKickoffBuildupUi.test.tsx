import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MatchCentre } from '@/components/club-manager/MatchCentre';
import { effectiveXIWithSlots, isAvailable, matchFacts, playNextEntry, startCareer } from '@/lib/clubManager';
import { kickoffFlankPlayers } from '@/lib/clubManagerFlank';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows the current flank pair and sends the draft only through the chosen kickoff button', () => {
  let seed = 151;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  let career = startCareer('Brentford');
  while (!matchFacts(career)) career = playNextEntry(career).state;
  const before = JSON.stringify(career);
  const live = vi.fn(), quick = vi.fn();
  render(<MatchCentre career={career} facts={matchFacts(career)!} clubColor="#fff"
    onBack={vi.fn()} onLive={live} onQuickSim={quick} onTone={vi.fn()} talkRead={null} talkStale={false} tone={null} />);
  fireEvent.click(screen.getByText('Kickoff buildup'));
  const select = screen.getByLabelText('Buildup route');
  fireEvent.change(select, { target: { value: 'left/overlap' } });
  const pair = kickoffFlankPlayers(career, 'left')!;
  const preview = within(screen.getByLabelText('Starting flank pair'));
  expect(preview.getByText(pair.fullback.name)).toBeInTheDocument();
  expect(preview.getByText(pair.winger.name)).toBeInTheDocument();
  expect(live).not.toHaveBeenCalled();
  expect(quick).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Play Live' }));
  expect(live).toHaveBeenCalledWith({ side: 'left', support: 'overlap' });

  fireEvent.change(select, { target: { value: 'right/hold' } });
  const protectedRight = { side: 'right', support: 'hold' };
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  expect(quick).toHaveBeenLastCalledWith(undefined, protectedRight);
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim bench order' }));
  const xi = effectiveXIWithSlots(career).map(row => row.p);
  const off = xi.find(player => player.position === 'ST')!;
  const on = career.squad.find(player => player.position === off.position && isAvailable(player) && xi.every(p => p.id !== player.id))!;
  fireEvent.change(screen.getByLabelText('Player coming off'), { target: { value: off.id } });
  fireEvent.change(screen.getByLabelText('Player coming on'), { target: { value: on.id } });
  fireEvent.click(screen.getByRole('button', { name: 'Sim with this order' }));
  expect(quick).toHaveBeenLastCalledWith({ outId: off.id, inId: on.id, window: 'hour', when: 'any' }, protectedRight);
  fireEvent.change(select, { target: { value: '' } });
  expect(screen.queryByLabelText('Starting flank pair')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Play Live' }));
  expect(live).toHaveBeenLastCalledWith(undefined);
  expect(JSON.stringify(career)).toBe(before);
});
