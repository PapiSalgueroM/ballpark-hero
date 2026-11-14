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
  it.each([
    ['panthers', 16, 2026, 1, 'panthers-6-1'],
    ['dolphins', 4, 2027, 11, 'dolphins-6-1'],
  ] as const)('trades four fitness points in a real bye to gain the trained position sooner at %s', (clubId, seed, year, bye, playerId) => {
    let initial = createNrlCareer(clubId, seed, year);
    while (initial.season.round < bye) initial = advance(initial);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    const trained = startCourse(initial, playerId, 'Halfback');
    const action = { type: 'runIntensiveBye', year, clubId, round: bye, playerId, startedRound: bye } as const;
    const ordinary = advance(trained);
    const intensive = reduceNrlCareer(trained, action);
    expect(intensive.season.round).toBe(bye + 1);
    expect(intensive.season.results).toEqual(ordinary.season.results);
    expect(intensive.finance).toEqual(ordinary.finance);
    expect(intensive.season.squad.filter(row => row.id !== playerId)).toEqual(ordinary.season.squad.filter(row => row.id !== playerId));
    expect(player(ordinary, playerId).fitness - player(intensive, playerId).fitness).toBe(4);
    expect(nrlPositionTraining(intensive)?.remaining).toBe(2);
    expect(nrlPositionTraining(ordinary)?.remaining).toBe(3);
    expect(bytes(readNrlCareerSave(bytes(intensive)))).toBe(bytes(intensive));
    expect(reduceNrlCareer(intensive, action)).toBe(intensive);
    expect(reduceNrlCareer(trained, { ...action, startedRound: bye + 1 })).toBe(trained);
    expect(readNrlCareerSave(bytes({ ...intensive, positionTraining: { ...intensive.positionTraining, intensiveBye: bye + 1 } }))).toBeNull();
    const matchRound = advance(ordinary);
    expect(readNrlCareerSave(bytes({ ...matchRound, positionTraining: { ...matchRound.positionTraining, intensiveBye: bye + 1 } }))).toBeNull();
    expect(reduceNrlCareer(ordinary, { ...action, round: bye + 1 })).toBe(ordinary);
    const qualified = advance(advance(intensive));
    expect(nrlStarterOptions(qualified.season, 'Halfback').some(row => row.id === playerId)).toBe(true);
    expect(nrlStarterOptions(advance(advance(ordinary)).season, 'Halfback').some(row => row.id === playerId)).toBe(false);
    expect(qualified.positionTraining).toBeUndefined();
    const selected = reduceNrlCareer(qualified, { type: 'selectStarter', role: 'Halfback', playerId });
    const played = advance(selected);
    expect(played.season.results.find(row => row.round === bye + 3 && row.playerScoring)?.playerScoring?.starters).toContain(playerId);
    expect(bytes(readNrlCareerSave(bytes(played)))).toBe(bytes(played));
  });

  it('shows the intensive bye tradeoff before spending a calendar round', () => {
    const clubId = 'panthers';
    const initial = startCourse(createNrlCareer(clubId, 16), 'panthers-6-1', 'Halfback');
    open(bytes(initial));
    const summary = screen.getByText('Intensive position training', { exact: true });
    fireEvent.click(summary);
    const panel = within(summary.closest('details')!);
    expect(panel.getByText(/96% fit instead of 100%/)).toBeVisible();
    expect(raw()).toBe(bytes(initial));
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(panel.getByRole('button', { name: 'Run intensive bye' }));
    const paid = readNrlCareerSave(raw())!;
    expect(paid.season.round).toBe(2);
    expect(paid.positionTraining?.intensiveBye).toBe(1);
    expect(localStorage.getItem(fence)).toBe('5');
    click('Squad');
    fireEvent.click(screen.getByText('Position training', { exact: true }));
    expect(screen.getByText(/2 rounds left/)).toBeVisible();
  });

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
    for (let i = 0; i < 40 && completed.season.phase !== 'complete'; i++) {
      completed = reduceNrlCareer(completed, { type: 'selectStarter', role: 'Halfback', playerId: trainee.id });
      completed = advance(completed);
    }
    expect(completed.season.phase).toBe('complete');
    expect(completed.season.lineup.Halfback).toBe(trainee.id);
    const next = reduceNrlCareer(completed, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    expect(next.season.lineup.Halfback).toBe(trainee.id);
    expect(new Set([...Object.values(next.season.lineup), ...next.season.bench!]).size).toBe(19);
    expect(player(next, trainee.id).secondaryRole).toBe('Halfback');
    expect(nrlStarterOptions(next.season, 'Halfback').some(option => option.id === trainee.id)).toBe(true);
    expect(next.savedLineup).toBeUndefined();
    expect(next.season.lineup['Five-eighth']).not.toBe(trainee.id);
    const nextGame = advance(next);
    const report = nextGame.season.results.find(row => row.playerScoring);
    expect(report?.playerScoring?.starters).toContain(trainee.id);
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

  it('starts and recalls one reserve-grade spell from Squad without writing on preview', () => {
    const initial = createNrlCareer('bears', 14, 2027);
    const playerId = 'bears-8-1';
    const view = open(bytes(initial));
    click('Squad');
    const summary = screen.getByText('Reserve-grade development', { exact: true });
    fireEvent.click(summary);
    const desk = within(summary.closest('details')!);
    fireEvent.change(desk.getByLabelText('Player for reserve grade'), { target: { value: playerId } });
    expect(raw()).toBe(bytes(initial));
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(desk.getByRole('button', { name: 'Start reserve-grade spell' }));
    expect(desk.getByText(/Beau Forde.*4 rounds left/i)).toBeVisible();
    expect(desk.getByText(/4 rounds left/i)).toHaveAttribute('role', 'status');
    expect(localStorage.getItem(fence)).toBe('5');
    const signed = raw();
    expect(readNrlCareerSave(signed)?.season.reserveGrade?.playerId).toBe(playerId);
    view.unmount();
    saveFence.release(NRL_SAVE_KEY);
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    click('Squad');
    const reloaded = screen.getByText('Reserve-grade development', { exact: true });
    fireEvent.click(reloaded);
    const liveDesk = within(reloaded.closest('details')!);
    expect(liveDesk.getByText(/Beau Forde.*4 rounds left/i)).toBeVisible();
    expect(raw()).toBe(signed);
    fireEvent.click(liveDesk.getByRole('button', { name: 'Recall player' }));
    expect(liveDesk.getByText(/Beau Forde.*recalled early/i)).toBeVisible();
    expect(localStorage.getItem(fence)).toBe('6');
    expect(liveDesk.queryByRole('button', { name: 'Start reserve-grade spell' })).toBeNull();
  });

  it('protects another tab’s reserve-grade decision and retries a failed write', () => {
    const initial = createNrlCareer('bears', 14, 2027);
    const playerId = 'bears-8-1';
    const view = open(bytes(initial));
    click('Squad');
    const summary = screen.getByText('Reserve-grade development', { exact: true });
    fireEvent.click(summary);
    const desk = within(summary.closest('details')!);
    fireEvent.change(desk.getByLabelText('Player for reserve grade'), { target: { value: playerId } });
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const actualSetItem = storage.getMockImplementation()!;
    try {
      storage.mockImplementation(function (this: Storage, key, value) {
        if (key === NRL_SAVE_KEY) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        return actualSetItem.call(this, key, value);
      });
      fireEvent.click(desk.getByRole('button', { name: 'Start reserve-grade spell' }));
      expect(screen.getByText(/could not save your progress/i)).toBeVisible();
      expect(raw()).toBe(bytes(initial));
      expect(localStorage.getItem(fence)).toBe('4');
    } finally {
      storage.mockRestore();
    }
    click('Retry save');
    const committed = raw();
    expect(readNrlCareerSave(committed)?.season.reserveGrade?.playerId).toBe(playerId);
    expect(localStorage.getItem(fence)).toBe('5');
    const newer = advance(readNrlCareerSave(committed)!);
    localStorage.setItem(NRL_SAVE_KEY, bytes(newer));
    localStorage.setItem(fence, '6');
    fireEvent.click(desk.getByRole('button', { name: 'Recall player' }));
    expect(raw()).toBe(bytes(newer));
    expect(localStorage.getItem(fence)).toBe('6');
    view.unmount();
  });
});
