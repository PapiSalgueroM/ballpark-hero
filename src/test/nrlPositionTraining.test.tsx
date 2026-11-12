import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlPositionTraining, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import {
  createNrlSeason, nrlInjuries, nrlNextRound, nrlRetrainingRoles, nrlSavedLineupPreview, nrlStarterOptions, NRL_SAVE_KEY, type NrlRole,
} from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const player = (career: NrlCareerState, id: string) => career.season.squad.find(member => member.id === id)!;
const reserve = (career: NrlCareerState, role: NrlRole) =>
  career.season.squad.find(member => member.role === role && member.id !== career.season.lineup[role])!;
const startCourse = (career: NrlCareerState, playerId: string, role: NrlRole) =>
  reduceNrlCareer(career, { type: 'startPositionTraining', playerId, role, year: career.season.year, clubId: career.season.clubId, round: career.season.round });

function open(save: string) {
  localStorage.setItem(NRL_SAVE_KEY, save);
  localStorage.setItem(fence, '4');
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL position training', () => {
  it('counts four settled rounds including a bye and unlocks an optional position without changing play', () => {
    const initial = createNrlCareer('panthers', 16);
    const trainee = reserve(initial, 'Five-eighth');
    const target = 'Halfback';
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    expect(nrlStarterOptions(initial.season, target)).not.toContainEqual(trainee);
    let training = startCourse(initial, trainee.id, target);
    expect(training.positionTraining).toEqual({ playerId: trainee.id, role: target, startedRound: 1 });
    expect(training.season).toBe(initial.season);
    expect(training.players).toBe(initial.players);
    expect(nrlPositionTraining(training)?.remaining).toBe(4);
    let baseline = initial;
    for (let elapsed = 1; elapsed <= 4; elapsed++) {
      training = advance(training);
      baseline = advance(baseline);
      expect(training.season.results).toEqual(baseline.season.results);
      expect(training.season.lineup).toEqual(baseline.season.lineup);
      expect(training.season.bench).toEqual(baseline.season.bench);
      expect(training.finance).toEqual(baseline.finance);
      expect(bytes(readNrlCareerSave(bytes(training)))).toBe(bytes(training));
      if (elapsed < 4) {
        expect(nrlPositionTraining(training)?.remaining).toBe(4 - elapsed);
        expect(player(training, trainee.id).secondaryRole).toBeUndefined();
      }
    }
    expect(training.positionTraining).toBeUndefined();
    expect(player(training, trainee.id)).toEqual({ ...player(baseline, trainee.id), secondaryRole: target });
    expect(nrlCareerCap(training)).toEqual(nrlCareerCap(baseline));
    expect(nrlStarterOptions(training.season, target).some(option => option.id === trainee.id)).toBe(true);
    const selected = reduceNrlCareer(training, { type: 'selectStarter', role: target, playerId: trainee.id });
    expect(selected.season.lineup[target]).toBe(trainee.id);
    expect(new Set([...Object.values(selected.season.lineup), ...selected.season.bench!]).size).toBe(19);
    expect(bytes(readNrlCareerSave(bytes(selected)))).toBe(bytes(selected));
    const live = reduceNrlCareer(selected, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(bytes(readNrlCareerSave(bytes(live)))).toBe(bytes(live));
    expect(reduceNrlCareer(live, { type: 'finishLive', year: live.season.year, round: live.season.round, tactic: live.season.tactic })).toEqual(advance(selected));
    expect(bytes(readNrlCareerSave(bytes(advance(selected))))).toBe(bytes(advance(selected)));
  });

  it('limits adjacent courses and rejects foreign, stale, injured, active and late requests', () => {
    expect(nrlRetrainingRoles('Fullback')).toEqual(['Left Wing', 'Right Wing']);
    expect(nrlRetrainingRoles('Left Wing')).toEqual(['Fullback', 'Left Centre', 'Right Wing']);
    expect(nrlRetrainingRoles('Left Centre')).toEqual(['Left Wing']);
    expect(nrlRetrainingRoles('Halfback')).toEqual(['Five-eighth']);
    expect(nrlRetrainingRoles('Prop 8')).toEqual(['Prop 10']);
    expect(nrlRetrainingRoles('Hooker')).toEqual([]);
    expect(nrlRetrainingRoles('Lock')).toEqual(['Left Second Row', 'Right Second Row']);
    const initial = createNrlCareer('broncos', 16);
    const trainee = reserve(initial, 'Five-eighth');
    expect(startCourse(initial, trainee.id, 'Lock')).toBe(initial);
    expect(startCourse(initial, 'storm-6-0', 'Halfback')).toBe(initial);
    expect(reduceNrlCareer(initial, { type: 'startPositionTraining', playerId: trainee.id, role: 'Halfback', year: 2027, clubId: 'broncos', round: 1 })).toBe(initial);
    const training = startCourse(initial, trainee.id, 'Halfback');
    expect(startCourse(training, reserve(training, 'Halfback').id, 'Five-eighth')).toBe(training);
    expect(reduceNrlCareer(training, { type: 'cancelPositionTraining', playerId: trainee.id, year: 2026,
      clubId: 'broncos', role: 'Five-eighth', startedRound: 1 })).toBe(training);
    const canceled = reduceNrlCareer(training, { type: 'cancelPositionTraining', playerId: trainee.id, year: 2026, clubId: 'broncos', role: 'Halfback', startedRound: 1 });
    expect(bytes(canceled)).toBe(bytes(initial));
    const injured = advance(initial);
    const victim = initial.season.lineup['Prop 10'];
    expect(nrlInjuries(injured.season).has(victim)).toBe(true);
    expect(startCourse(injured, victim, 'Prop 8')).toBe(injured);
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(startCourse(live, trainee.id, 'Halfback')).toBe(live);
    const legacy = readNrlCareerSave(bytes(createNrlSeason('broncos', 16)))!;
    expect(startCourse(legacy, trainee.id, 'Halfback')).toBe(legacy);
    let late = initial;
    while (late.season.round < 25) late = advance(late);
    expect(startCourse(late, trainee.id, 'Halfback')).toBe(late);
    expect(readNrlCareerSave(bytes({ ...training, positionTraining: { ...training.positionTraining, role: 'Lock' } }))).toBeNull();
    expect(readNrlCareerSave(bytes({ ...training, positionTraining: { ...training.positionTraining, startedRound: 0 } }))).toBeNull();
  });

  it('keeps a learned role through rollover and preserves an explicit selection when applying a saved lineup', () => {
    const start = createNrlCareer('storm', 4);
    const trainee = reserve(start, 'Five-eighth');
    expect(start.players.find(member => member.id === trainee.id)?.contract?.endYear).toBe(2028);
    let career = startCourse(start, trainee.id, 'Halfback');
    for (let round = 0; round < 4; round++) career = advance(career);
    const chosen = reduceNrlCareer(career, { type: 'selectStarter', role: 'Halfback', playerId: trainee.id });
    const saved = reduceNrlCareer(chosen, { type: 'saveLineup', year: 2026, clubId: 'storm' });
    const rotated = reduceNrlCareer(saved, { type: 'selectStarter', role: 'Halfback', playerId: career.season.lineup.Halfback });
    const preview = nrlSavedLineupPreview(rotated.season, rotated.savedLineup!)!;
    expect(preview.next.lineup.Halfback).toBe(trainee.id);
    const applied = reduceNrlCareer(rotated, { type: 'applySavedLineup', previewKey: preview.key });
    expect(applied.season.lineup.Halfback).toBe(trainee.id);

    let completed = applied;
    for (let i = 0; i < 40 && completed.season.phase !== 'complete'; i++) completed = advance(completed);
    expect(completed.season.phase).toBe('complete');
    const next = reduceNrlCareer(completed, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    expect(player(next, trainee.id).secondaryRole).toBe('Halfback');
    expect(nrlStarterOptions(next.season, 'Halfback').some(option => option.id === trainee.id)).toBe(true);
    expect(next.savedLineup).toBeUndefined();
    expect(bytes(readNrlCareerSave(bytes(next)))).toBe(bytes(next));
    const moved = reduceNrlCareer(completed, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moved.players.find(member => member.id === trainee.id)?.secondaryRole).toBe('Halfback');
    expect(moved.season.squad.some(member => member.id === trainee.id)).toBe(false);
    expect(bytes(readNrlCareerSave(bytes(moved)))).toBe(bytes(moved));
  });

  it('keeps one eligible player in each slot when trained cover is the last healthy native for their old slot', () => {
    let state = createNrlCareer('broncos', 16);
    const trainee = reserve(state, 'Five-eighth');
    state = startCourse(state, trainee.id, 'Halfback');
    for (let round = 0; round < 4; round++) state = advance(state);
    const selected = reduceNrlCareer(state, { type: 'selectStarter', role: 'Halfback', playerId: trainee.id });
    expect(selected.season.lineup.Halfback).toBe(trainee.id);
    const other = selected.season.lineup['Five-eighth'];
    const priorMatch = selected.season.results.slice().reverse().find(match =>
      [match.homeId, match.awayId].includes('broncos') && !match.injury);
    expect(priorMatch).toBeDefined();
    const altered = {
      ...selected,
      season: { ...selected.season, results: selected.season.results.map(match =>
        match === priorMatch ? { ...match, injury: { playerId: other, rounds: 4 } } : match) },
    };
    expect(nrlInjuries(altered.season).has(other)).toBe(true);
    const repaired = advance(altered);
    expect(repaired.season.lineup.Halfback).toBe(trainee.id);
    expect(repaired.season.lineup['Five-eighth']).not.toBe(trainee.id);
    expect(new Set(Object.values(repaired.season.lineup)).size).toBe(13);
    const natural = state.season.lineup.Halfback;
    const restored = reduceNrlCareer(repaired, { type: 'selectStarter', role: 'Halfback', playerId: natural });
    expect(restored.season.lineup.Halfback).toBe(natural);
    expect(restored.season.lineup['Five-eighth']).toBe(trainee.id);
    expect(new Set([...Object.values(restored.season.lineup), ...restored.season.bench!]).size).toBe(19);
  });

  it('opens a course from Squad, reloads progress and labels the trained starter option', () => {
    const initial = createNrlCareer('storm', 4);
    const trainee = reserve(initial, 'Five-eighth');
    const original = bytes(initial);
    const view = open(original);
    click('Squad');
    const summary = screen.getByText('Position training', { exact: true });
    fireEvent.click(summary);
    const desk = within(summary.closest('details')!);
    fireEvent.change(desk.getByLabelText('Player to train'), { target: { value: trainee.id } });
    fireEvent.change(desk.getByLabelText('Position to learn'), { target: { value: 'Halfback' } });
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(desk.getByRole('button', { name: 'Start position training' }));
    expect(desk.getByText(/4 rounds left/i)).toBeVisible();
    expect(raw()).toBe(bytes(startCourse(initial, trainee.id, 'Halfback')));
    view.unmount();

    let done = readNrlCareerSave(raw())!;
    for (let round = 0; round < 4; round++) done = advance(done);
    open(bytes(done));
    click('Squad');
    expect(within(screen.getByLabelText('Halfback', { exact: true })).getByRole('option', { name: /trained cover/i })).toHaveValue(trainee.id);
    const completedSummary = screen.getByText('Position training', { exact: true });
    fireEvent.click(completedSummary);
    expect(within(completedSummary.closest('details')!).getByText(trainee.name + ' · Halfback')).toBeVisible();
    expect(raw()).toBe(bytes(done));
  });
});
