import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SeasonCentre, type CentreModel } from '@/components/season-centre/SeasonCentre';
import SeasonCompetitionPanel from '@/components/soccer-career/SeasonCompetitionPanel';
import { cupCalendar, CUP_CALENDAR_NOTE } from '@/lib/soccerSeasonCalendar';
import { savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { TABLE_ROW, soccerShapedModel, toySeason } from './fixtures/seasonCentreToy';
import { competitionCareer, cupSeason, firstStageCampaign } from './fixtures/soccerSeasonCompetitions1173';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function open(model: CentreModel, md = 5) {
  const view = render(<MemoryRouter><SeasonCentre model={model} exitLabel="Back to your career" onClose={() => {}} resume={{ key: model.season.key, md, year: 2026, speed: 'results', stable: true }} /></MemoryRouter>);
  const gotIt = screen.queryByRole('button', { name: /Got it/ });
  if (gotIt) fireEvent.click(gotIt);
  fireEvent.click(screen.getByRole('button', { name: /▶ Matchday 6/ }));
  return view;
}
function modelWithCups(onCompetition = vi.fn()) {
  const season = toySeason(TABLE_ROW), model = soccerShapedModel(TABLE_ROW, season);
  const competitions = savedSeasonCompetitions(competitionCareer, cupSeason).filter(cup => cup.id === 'domestic');
  return { ...model, calendar: { games: cupCalendar(competitions, season.games.length), note: CUP_CALENDAR_NOTE, onCompetition } };
}
describe('cup nights in the actual Season Centre', () => {
  it('opens the saved domestic cup after league game five and keeps the next opponent hidden until its result', () => {
    const model = modelWithCups(), before = structuredClone(model.season);
    const { container } = open(model);
    expect(container.querySelector('[data-centre-calendar-cup]')?.getAttribute('data-centre-calendar-cup')).toBe('domestic:0');
    expect(container.querySelector('[data-calendar-cup-score]')).toBeNull();
    expect(container.querySelector('[data-fixture-cup="domestic:1"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-calendar-cup-reveal]')!);
    expect(container.querySelector('[data-calendar-cup-verdict]')?.textContent).toBe('Through');
    expect(container.querySelector('[data-fixture-cup="domestic:1"] [data-fixture-cup-opponent]')?.textContent).toBe('Chelsea');
    expect(model.season).toEqual(before);
  });
  it('a deciding early loss reveals no future domestic fixture and resumes league game six', () => {
    const model = modelWithCups();
    model.calendar.games = cupCalendar([{ id: 'domestic', name: 'Saved cup', result: 'Knocked out', matches: [{ round: 'Early rounds', opponent: null, goalsFor: null, goalsAgainst: null, result: 'Out' }] }], 10);
    const { container } = open(model);
    fireEvent.click(container.querySelector('[data-calendar-cup-reveal]')!);
    expect(container.querySelector('[data-calendar-cup-verdict]')?.textContent).toBe('Out');
    expect(container.querySelectorAll('[data-fixture-cup]')).toHaveLength(1);
    fireEvent.click(container.querySelector('[data-calendar-cup-continue]')!);
    expect(container.querySelector('[data-centre-calendar-cup]')).toBeNull();
    expect(screen.getByRole('button', { name: /▶ Matchday 6/ })).toBeInTheDocument();
  });
  it('opens the cup competition from a scheduled cup without rerolling or adding scores', () => {
    const select = vi.fn(), model = modelWithCups(select), before = JSON.stringify(model.season);
    const { container } = open(model);
    fireEvent.click(container.querySelector('[data-calendar-cup-competition]')!);
    expect(select).toHaveBeenCalledExactlyOnceWith('domestic');
    expect(JSON.stringify(model.season)).toBe(before);
  });
  it('replaying a resume at the cup boundary uses the existing saved result', () => {
    const model = modelWithCups();
    const { container, unmount } = open(model);
    fireEvent.click(container.querySelector('[data-calendar-cup-reveal]')!);
    const first = container.querySelector('[data-calendar-cup-verdict]')?.textContent;
    unmount();
    const reopened = open(model);
    fireEvent.click(reopened.container.querySelector('[data-calendar-cup-reveal]')!);
    expect(reopened.container.querySelector('[data-calendar-cup-verdict]')?.textContent).toBe(first);
  });
  it('models without cup data keep the original league route', () => {
    const model = soccerShapedModel(TABLE_ROW, toySeason(TABLE_ROW));
    const { container } = open(model);
    expect(container.querySelector('[data-centre-calendar-cup]')).toBeNull();
    expect(container.querySelector('[data-fixture-cup]')).toBeNull();
  });
  it('shows an actual saved bracket with separate legs and keeps all input bytes', () => {
    const competitions = savedSeasonCompetitions(competitionCareer, cupSeason), before = JSON.stringify([competitionCareer, cupSeason]);
    render(<SeasonCompetitionPanel career={competitionCareer as CareerState} row={cupSeason} competition={competitions[1]} navigation={null} exitLabel="Back" onClose={() => {}} />);
    expect(document.querySelector('[data-centre-cup-bracket]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-centre-cup-round]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-centre-cup-open]')).toHaveLength(2);
    fireEvent.click(document.querySelector('[data-centre-cup-open="1"]')!);
    expect(document.querySelector('[data-centre-cup-score]')?.textContent).toBe('0-2');
    expect(screen.getByText('2-3 on aggregate')).toBeInTheDocument();
    expect(JSON.stringify([competitionCareer, cupSeason])).toBe(before);
  });
  it('shows only the recorded league-phase club row rather than inventing a full table', () => {
    const career = { ...competitionCareer, lastUCLResult: firstStageCampaign } as CareerState;
    const competition = savedSeasonCompetitions(career, cupSeason)[1];
    render(<SeasonCompetitionPanel career={career} row={cupSeason} competition={competition} navigation={null} exitLabel="Back" onClose={() => {}} />);
    expect(screen.getByText("Only your club's row was kept.")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-centre-cup-table] tbody tr')).toHaveLength(1);
    expect(document.querySelector('[data-centre-cup-table] tbody tr')?.textContent).toContain('Arsenal');
  });
  it('a kept quarter-final retains its actual away ground while missing grounds stay missing', () => {
    const domestic = savedSeasonCompetitions(competitionCareer, cupSeason)[0];
    expect(domestic.matches.map(match => match.home)).toEqual([undefined, false, undefined, undefined]);
  });
});
