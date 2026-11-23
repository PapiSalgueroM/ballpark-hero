import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CupScorersCard } from '@/components/club-manager/CupScorersCard';
import { CupScorerHonour } from '@/components/club-manager/SeasonHonoursCard';
import { cupScorerRace, newCupScorerLedger, recordCupScorerRound, type CupScorerCredit } from '@/lib/clubManagerCupScorers';

const home: CupScorerCredit = { id: 'h', name: 'Alex Smith', club: 'Everton' };
const away: CupScorerCredit = { id: 'a', name: 'Alex Smith', club: 'Lyon' };
const night = (...credits: CupScorerCredit[]) => recordCupScorerRound(newCupScorerLedger(), 0, credits);

afterEach(cleanup);

describe('Cup Top scorers card', () => {
  it('can show and archive a domestic award under its own cup label', () => {
    const saved = night(home, home, away);
    const view = render(<CupScorersCard race={cupScorerRace(saved, 1, true)} myClub="Everton" competition="FA Cup" scope="cup" />);
    expect(screen.getByRole('region', { name: 'FA Cup Golden Boot' })).toBeVisible();
    expect(view.container.querySelector('[data-cm-cup-scorer-race]')).toHaveAttribute('data-cm-cup-scorer-race', 'winner');
    view.rerender(<CupScorerHonour award={[{ name: 'Alex Smith', club: 'Everton', goals: 2 }]} myClub="Everton" competition="FA Cup" scope="cup" />);
    expect(screen.getByText('FA Cup Golden Boot')).toBeVisible();
    expect(view.container.querySelector('[data-cm-cup-award]')).toHaveAttribute('data-cm-cup-award', 'winner');
  });

  it('shows club labels for same-name leaders, and names the award only once the cup finishes', () => {
    const saved = night(home, home, away, away);
    const view = render(<CupScorersCard race={cupScorerRace(saved, 1, false)} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.getByText('Race in progress')).toBeVisible();
    expect(screen.getAllByText('Alex Smith')).toHaveLength(2);
    expect(screen.getByText('Everton')).toBeVisible();
    expect(screen.getByText('Lyon')).toBeVisible();
    view.rerender(<CupScorersCard race={cupScorerRace(saved, 1, true)} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.getByText('Shared Golden Boot')).toBeVisible();
    expect(screen.getByText('Your club has a Golden Boot winner.')).toBeVisible();
  });

  it('shows the known scorer and leaves the award open when a missing credit can change it', () => {
    const view = render(<CupScorersCard race={cupScorerRace(night(home, home, away, null), 1, true)} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.getByText('Golden Boot unconfirmed')).toBeVisible();
    expect(screen.getByText('1 goal has no recorded scorer.')).toBeVisible();
    expect(view.container.querySelector('[data-cm-uel-scorer-race]')).toHaveAttribute('data-cm-uel-scorer-race', 'undecided');
    expect(view.container.querySelectorAll('[data-cm-uel-scorer-goals]')).toHaveLength(2);
  });

  it('explains an older edition that kept the scores without scorer records', () => {
    render(<CupScorersCard race={cupScorerRace(undefined, 17, true)} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.getByText('Scorer records unavailable')).toBeVisible();
    expect(screen.getByText('This edition has incomplete scorer records.')).toBeVisible();
  });

  it('shows a saved share in Past winners and ignores an incomplete award', () => {
    const tied = [
      { name: 'Alex Smith', club: 'Everton', goals: 8 },
      { name: 'Alex Smith', club: 'Lyon', goals: 8 },
    ];
    const view = render(<CupScorerHonour award={tied} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.getByText('Shared Europa League Golden Boot')).toBeVisible();
    expect(screen.getByText(/Lyon.*8 goals/)).toBeVisible();
    expect(view.container.querySelectorAll('[data-mine]')).toHaveLength(1);
    view.rerender(<CupScorerHonour award={[tied[0], { ...tied[1], goals: 0 }]} myClub="Everton" competition="Europa League" scope="uel" />);
    expect(screen.queryByText('Shared Europa League Golden Boot')).toBeNull();
  });
});
