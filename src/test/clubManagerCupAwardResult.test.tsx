import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GoldenBootResult } from '@/components/club-manager/CupScorersCard';
import { cupScorerRace, newCupScorerLedger, recordCupScorerRound } from '@/lib/clubManagerCupScorers';

afterEach(cleanup);

it('distinguishes the open race after an exit, the outright winner, a share and an incomplete scorebook', () => {
  const home = { id: '1', name: 'Home Striker', club: 'Test Rovers' }, away = { id: '2', name: 'Away Forward', club: 'Test County' };
  const draw = (credits: (typeof home | null)[], done: boolean) => <GoldenBootResult myClub={home.club} name="FA Cup" scope="cup"
    race={cupScorerRace(recordCupScorerRound(newCupScorerLedger(), 0, credits), 1, done)} />;
  const view = render(draw([home, away], false));
  expect(screen.getByText('The race stays open until the final. Follow it in Cups.')).toBeVisible();
  expect(screen.getByText(/Your leading scorer: Home Striker/)).toBeVisible();
  view.rerender(draw([home, home, away], true));
  expect(screen.getByText('Your club won the award.')).toBeVisible();
  view.rerender(draw([home, away], true));
  expect(screen.getByText('Your club shared the award.')).toBeVisible();
  view.rerender(draw([away, away, home], true));
  expect(screen.getByText('The award went to another club.')).toBeVisible();
  view.rerender(draw([home, away, null], true));
  expect(screen.getByText('Golden Boot unconfirmed')).toBeVisible();
});
