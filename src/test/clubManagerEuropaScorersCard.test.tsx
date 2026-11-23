import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EuropaScorersCard } from '@/components/club-manager/EuropaScorersCard';
import { EuropaScorerHonour } from '@/components/club-manager/SeasonHonoursCard';
import { europaScorerRace, newEuropaScorerLedger, recordEuropaScorerNight, type EuropaScorerCredit } from '@/lib/clubManagerEuropaScorers';

const home: EuropaScorerCredit = { id: 'h', name: 'Alex Smith', club: 'Everton' };
const away: EuropaScorerCredit = { id: 'a', name: 'Alex Smith', club: 'Lyon' };
const night = (...credits: EuropaScorerCredit[]) => recordEuropaScorerNight(newEuropaScorerLedger(), 0, credits);

afterEach(cleanup);

describe('Europa League Top scorers card', () => {
  it('shows club labels for same-name leaders, and names the award only once the cup finishes', () => {
    const saved = night(home, home, away, away);
    const view = render(<EuropaScorersCard race={europaScorerRace(saved, 1, false)} myClub="Everton" />);
    expect(screen.getByText('Race in progress')).toBeVisible();
    expect(screen.getAllByText('Alex Smith')).toHaveLength(2);
    expect(screen.getByText('Everton')).toBeVisible();
    expect(screen.getByText('Lyon')).toBeVisible();
    view.rerender(<EuropaScorersCard race={europaScorerRace(saved, 1, true)} myClub="Everton" />);
    expect(screen.getByText('Shared Golden Boot')).toBeVisible();
    expect(screen.getByText('Your club has a Golden Boot winner.')).toBeVisible();
  });

  it('shows the known scorer and leaves the award open when a missing credit can change it', () => {
    const view = render(<EuropaScorersCard race={europaScorerRace(night(home, home, away, null), 1, true)} myClub="Everton" />);
    expect(screen.getByText('Golden Boot unconfirmed')).toBeVisible();
    expect(screen.getByText('1 goal has no recorded scorer.')).toBeVisible();
    expect(view.container.querySelector('[data-cm-uel-scorer-race]')).toHaveAttribute('data-cm-uel-scorer-race', 'undecided');
    expect(view.container.querySelectorAll('[data-cm-uel-scorer-goals]')).toHaveLength(2);
  });

  it('explains an older edition that kept the scores without scorer records', () => {
    render(<EuropaScorersCard race={europaScorerRace(undefined, 17, true)} myClub="Everton" />);
    expect(screen.getByText('Scorer records unavailable')).toBeVisible();
    expect(screen.getByText('This edition has incomplete scorer records.')).toBeVisible();
  });

  it('shows a saved share in Past winners and ignores an incomplete award', () => {
    const tied = [
      { name: 'Alex Smith', club: 'Everton', goals: 8 },
      { name: 'Alex Smith', club: 'Lyon', goals: 8 },
    ];
    const view = render(<EuropaScorerHonour award={tied} myClub="Everton" />);
    expect(screen.getByText('Shared Europa League Golden Boot')).toBeVisible();
    expect(screen.getByText(/Lyon.*8 goals/)).toBeVisible();
    expect(view.container.querySelectorAll('[data-mine]')).toHaveLength(1);
    view.rerender(<EuropaScorerHonour award={[tied[0], { ...tied[1], goals: 0 }]} myClub="Everton" />);
    expect(screen.queryByText('Shared Europa League Golden Boot')).toBeNull();
  });
});
