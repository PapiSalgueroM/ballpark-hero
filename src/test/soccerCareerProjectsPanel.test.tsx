import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CareerProjectsPanel from '@/components/soccer-career/CareerProjectsPanel';
import { FALLBACK_CLUBS, initCareer, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { chooseCareerProject, getCareerProjectsView, resolveCareerProject } from '@/lib/soccerCareerProjects';

function signedCareer(): CareerState {
  const c = initCareer('Project Fixture', 'England', 'CM', '2020s',
    { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 },
    60, 2020, FALLBACK_CLUBS);
  const club = FALLBACK_CLUBS[0];
  return { ...c, phase: 'playing', age: 23, retired: false, currentClub: club.name,
    currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
    currentLeague: club.league, contractYearsLeft: 4 };
}

function show(initial = signedCareer()) {
  const onBack = vi.fn();
  const onChoose = vi.fn();
  function Host() {
    const [career, setCareer] = useState(initial);
    return (
      <CareerProjectsPanel
        career={career}
        onChoose={(project, choice) => {
          onChoose(project, choice);
          setCareer(current => chooseCareerProject(current, project, choice));
        }}
        renderHeader={(title, label, back) => <header><span>{title}</span><button onClick={back}>{label}</button></header>}
        onBack={onBack}
      />
    );
  }
  return { ...render(<Host />), initial, onBack, onChoose };
}

afterEach(cleanup);

describe('Career Projects phone screen', () => {
  it('shows four projects and returns focus to the visited tile without choosing a goal', () => {
    const initial = signedCareer();
    const before = JSON.stringify(initial);
    const { onBack, onChoose } = show(initial);
    const view = getCareerProjectsView(initial);
    const grid = screen.getByLabelText('Career projects');
    expect(within(grid).getAllByRole('button')).toHaveLength(4);
    const tile = within(grid).getByRole('button', { name: new RegExp(view.projects[0].title) });

    fireEvent.click(tile);
    expect(screen.getByRole('heading', { name: /Chapter 1 of 3/ })).toHaveFocus();
    const first = view.projects[0].chapter!.choices[0];
    const option = screen.getByRole('button', { name: new RegExp(first.title) });
    expect(option).toHaveTextContent(first.goalLabel);
    expect(option).toHaveTextContent(first.successLabel);
    expect(option).toHaveTextContent(first.missLabel);

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(within(screen.getByLabelText('Career projects')).getByRole('button', { name: new RegExp(view.projects[0].title) })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onChoose).not.toHaveBeenCalled();
    expect(JSON.stringify(initial)).toBe(before);
  });

  it('shows the saved commitment and keeps choices in another project disabled', () => {
    const { initial, onChoose } = show();
    const [first, other] = getCareerProjectsView(initial).projects;
    const selected = first.chapter!.choices[0];

    fireEvent.click(within(screen.getByLabelText('Career projects')).getByRole('button', { name: new RegExp(first.title) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(selected.title) }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith(first.id, selected.id);
    expect(screen.getByRole('heading', { name: /In progress/ })).toHaveFocus();
    expect(screen.getByText(selected.goalLabel)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    fireEvent.click(within(screen.getByLabelText('Career projects')).getByRole('button', { name: new RegExp(other.title) }));
    const blocked = screen.getByRole('button', { name: new RegExp(other.chapter!.choices[0].title) });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(onChoose).toHaveBeenCalledOnce();
  });
  it('shows the recorded outcome and restores focus from history', () => {
    const initial = signedCareer();
    const project = getCareerProjectsView(initial).projects[0];
    const committed = chooseCareerProject(initial, project.id, project.chapter!.choices[0].id);
    const pending = getCareerProjectsView(committed).pending!;
    const row: SeasonRecord = {
      year: pending.fromYear, age: initial.age, club: initial.currentClub,
      clubCountry: initial.currentClubCountry, clubTier: initial.currentClubTier,
      apps: 12, goals: 2, assists: 2, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 7,
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
      ballonDor: false, ballonDorRank: null, type: 'playing',
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    };
    const settled = resolveCareerProject({ ...committed, seasons: [...committed.seasons, row] }, row);
    const receipt = getCareerProjectsView(settled).lastResult!;
    const { onChoose } = show(settled);
    const history = () => screen.getByRole('button', { name: /Project history/ });

    fireEvent.click(history());
    expect(screen.getByRole('heading', { name: 'Project history' })).toHaveFocus();
    expect(screen.getByText(receipt.actualLabel, { exact: false })).toBeVisible();
    expect(screen.getByText(receipt.effectLabel)).toBeVisible();
    expect(screen.getByText('Met', { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(history()).toHaveFocus();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
