import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import '@/lib/clubManagerTactics';
import { eligiblePressTargets, playNextEntry, returnPressWinger, startCareer, type PlayEvent } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';
import { ReturnPressPicker } from '@/components/club-manager/ReturnPressPicker';
import { ReturnPressReview } from '@/components/club-manager/ReturnPressReview';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('offers only the actual opposing wide defenders, shows who can close down and allows standing down', () => {
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('press-picker'));
  const career = playNextEntry(startCareer('Brentford')).state;
  const live = career.live!;
  const [target] = eligiblePressTargets(live, 46);
  const winger = returnPressWinger(career, target.n, 46)!;
  const onSelect = vi.fn();
  const view = render(<ReturnPressPicker career={career} live={live} minute={46} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Press the return pass'));
  const region = screen.getByRole('region', { name: 'Return-pass instructions' });
  fireEvent.click(within(region).getByRole('button', { name: 'Return-pass press rules' }));
  expect(region).toHaveTextContent('A long throw costs your wide player nothing');
  const targetButton = within(region).getByRole('button', { name: new RegExp(target.n) });
  expect(targetButton).toHaveTextContent(winger.name);
  fireEvent.click(targetButton);
  expect(onSelect).toHaveBeenCalledWith(target.n);
  const order = { version: 1 as const, target: target.n, wingerId: winger.id };
  view.rerender(<ReturnPressPicker career={career} live={{ ...live, returnPress: order }} minute={46} onSelect={onSelect} />);
  expect(targetButton).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(within(region).getByRole('button', { name: 'Stand down the press' }));
  expect(onSelect).toHaveBeenLastCalledWith(null);
  const future = JSON.parse(JSON.stringify({ ...order, version: 2 }));
  view.rerender(<ReturnPressPicker career={career} live={{ ...live, returnPress: future }} minute={46} onSelect={onSelect} />);
  expect(region).toHaveTextContent('newer pressing instruction');
  expect(within(region).queryByRole('button', { name: 'Stand down the press' })).toBeNull();
});

it('keeps separate throws at one clock, links only their own chances, and leaves live goal calls to the match clock', () => {
  const jump = { id: 'throw-1', wingerId: 'winger', winger: 'Winger', outlet: 'Outlet', outcome: 'won' as const, effort: 1, tired: false };
  const first: PlayEvent = { minute: 90, plus: 2, kind: 'throwin', side: 'opp', who: 'Fullback', returnPress: jump };
  const second: PlayEvent = { ...first, returnPress: { ...jump, id: 'throw-2', outcome: 'bypassed', spent: 0 } };
  const unrelated: PlayEvent = { minute: 90, plus: 2, kind: 'shot', side: 'me', who: 'Unrelated player', goal: true };
  const goal: PlayEvent = { ...unrelated, who: 'Winger', pressChance: jump.id };
  const review: PlayEvent = { minute: 90, plus: 2, kind: 'var', side: 'opp', who: 'Outlet', pressChance: 'throw-2',
    review: { id: 'second-review', incident: 'goal', decision: 'disallowed', reason: 'ruled_out' } };
  const play = [first, second, unrelated, goal, review];
  const view = render(<ReturnPressReview play={play} />);
  let region = screen.getByRole('region', { name: 'Return-pass press' });
  expect(region).toHaveTextContent('1 won high · 1 beaten · 0 direct');
  expect(region).toHaveTextContent('Winger scored.');
  expect(region).not.toHaveTextContent('Unrelated player');
  fireEvent.click(within(region).getByRole('button', { name: 'Next pressing event' }));
  expect(region).toHaveTextContent('goal was ruled out');
  expect(region).toHaveTextContent('0 fitness spent');
  view.rerender(<ReturnPressReview live play={play} />);
  region = screen.getByRole('region', { name: 'Latest return-pass press' });
  expect(region).toHaveTextContent('The move led to a chance');
  expect(region).not.toHaveTextContent('ruled out');
  view.rerender(<ReturnPressReview play={[unrelated]} />);
  expect(screen.getByRole('region')).toHaveTextContent('No eligible throw');
});
