import { Suspense } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, TrainingDrill } from '@/lib/soccerCareerEngine';

type Engine = typeof import('@/lib/soccerCareerEngine');
type Codec = typeof import('@/lib/soccerCareerSave');
type PanelType = typeof import('@/components/soccer-career/TrainingPanel').default;
let E: Engine, C: Codec, Panel: PanelType, tape: number[], capturing: boolean;
const KEY = 'soccerCareerSave';
const choose = [
  ['Force the centre pass', 'Pass left', 'Carry straight at the defender'],
  ['Pass into the new space', 'Pass back to the old spot', 'Dribble toward the marker'],
  ['Turn into the defender', 'Hold the ball for the press', 'Set it back to Support'],
  ['Stay behind the defender', 'Move into the open diagonal', 'Run closer along the blocked lane'],
  ['Play into the marked centre', 'Wait for the press to arrive', 'Roll to Wide'],
];
const cmAnswers = ['Pass left', 'Pass back to the old spot', 'Set it back to Support', 'Stay behind the defender', 'Roll to Wide'];
const gkAnswers = ['Pass left', 'Pass into the new space', 'Set it back to Support', 'Move into the open diagonal', 'Wait for the press to arrive'];
beforeEach(async () => {
  localStorage.clear(); localStorage.setItem('reading-unrelated', '{"keep":"unchanged"}');
  tape = []; capturing = false;
  vi.spyOn(Math, 'random').mockImplementation(() => { if (capturing) tape.push(0.5); return 0.5; });
  vi.spyOn(Date, 'now').mockReturnValue(1793808000000);
  E = await import('@/lib/soccerCareerEngine');
  C = await import('@/lib/soccerCareerSave');
  Panel = (await import('@/components/soccer-career/TrainingPanel')).default;
});
afterEach(() => {
  cleanup();
  if (vi.isFakeTimers()) { vi.clearAllTimers(); vi.useRealTimers(); }
  vi.restoreAllMocks();
});
function raw(name: string, observations: unknown) {
  if (!process.env.SC_PASSING_DECISION_RAW) return;
  mkdirSync(process.env.SC_PASSING_DECISION_RAW, { recursive: true });
  writeFileSync(join(process.env.SC_PASSING_DECISION_RAW, name + '.json'), JSON.stringify({
    case: name, fixture: 'Real full-pool constructor, fictional player and declared current training session. No natural career or match-outcome claim.', observations,
  }, null, 2) + '\n');
}
function setup(position: 'CM' | 'GK' | 'ST' = 'CM', spent = false, keepAvailable = false) {
  const skill = position === 'GK' ? 98 : 75;
  const source = E.initCareer('Passing Decision Fixture', 'England', position, '2020-24',
    { pace: skill, shooting: skill, passing: skill, dribbling: skill, defending: skill, physical: skill, reflexes: skill },
    skill, 2024, E.FALLBACK_CLUBS, null, 99);
  const decoded = C.parseSoccerCareerSave(C.serializeSoccerCareerSave(source));
  expect(C.isSoccerCareerSave(decoded), 'SETUP real constructor is a valid saved career').toBe(true);
  const initial = decoded as CareerState;
  if (spent) initial.trainingSeasonYear = 2024;
  const before = C.serializeSoccerCareerSave(initial);
  localStorage.setItem(KEY, before);
  let current = initial;
  const calls: [TrainingDrill, number][] = [], drills: unknown[][] = [];
  let closes = 0;
  let view: ReturnType<typeof render>;
  const onComplete = (drill: TrainingDrill, score: number) => {
    calls.push([drill, score]); current = E.applyTrainingResult(current, drill, score);
    localStorage.setItem(KEY, C.serializeSoccerCareerSave(current));
    if (!keepAvailable) view.rerender(tree());
  };
  const tree = () => <Suspense fallback={<p>Loading practice</p>}><Panel career={current}
    available={keepAvailable ? !spent : E.trainingAvailable(current)} onComplete={onComplete}
    onDrill={(...args) => { drills.push(args); }} onClose={() => { closes++; }} /></Suspense>;
  view = render(tree());
  tape = []; capturing = true;
  return { view, initial, before, calls, drills, current: () => current, closes: () => closes,
    storage: () => localStorage.getItem(KEY), inputHeld: () => C.serializeSoccerCareerSave(initial) === before };
}
type Setup = ReturnType<typeof setup>;
async function openReading(s: Setup) {
  const tile = s.view.queryByRole('button', { name: /Read the pass/ });
  if (!tile) return { opened: false, instructions: '', example: '' };
  fireEvent.click(tile);
  const start = await s.view.findByRole('button', { name: 'Start reading session' });
  const instructions = s.view.container.textContent ?? '';
  const example = s.view.queryByText(/three correct.*60.*four.*80/i)?.textContent ?? '';
  fireEvent.click(start);
  return { opened: true, instructions, example };
}
async function finishReading(s: Setup, answers: string[]) {
  for (let i = 0; i < answers.length; i++) {
    const group = s.view.getByRole('group', { name: new RegExp('^Decision ' + (i + 1) + ' of 5:') });
    fireEvent.click(within(group).getByRole('button', { name: answers[i] }));
    fireEvent.click(s.view.getByRole('button', { name: i === 4 ? 'See session score' : 'Next decision' }));
  }
  await s.view.findByText('session score');
}
function snapshot(s: Setup, extra: Record<string, unknown> = {}) {
  return { calls: s.calls, drills: s.drills, before: s.before, after: s.storage(), current: s.current(),
    inputHeld: s.inputHeld(), unrelated: localStorage.getItem('reading-unrelated'), draws: [...tape],
    score: s.view.container.querySelector('[data-training-score]')?.textContent ?? null,
    ...extra };
}
function expectedReward(s: Setup, score: 60 | 80, boost: 1 | 2, label: 'Passing' | 'Distribution') {
  const expected = C.parseSoccerCareerSave(s.before) as CareerState;
  expected.trainingSeasonYear = 2024;
  expected.statBoostNextSeason = { passing: boost };
  expected.morale = 72;
  expected.events = [...expected.events, '🏋️ Training session: ' + score + '/100. +' + boost + ' ' + label + ' coming with next season\'s growth'];
  return expected;
}
function penalties(s: Setup) {
  for (let i = 0; i < 5; i++) {
    fireEvent.click(s.view.getByRole('button', { name: 'Shoot bottom middle' }));
    act(() => { vi.advanceTimersByTime(1100); });
  }
}

describe('Soccer untimed passing decisions', () => {
  it('turns three correct first reads into one real Passing reward and a complete codec reload', async () => {
    const s = setup(), entry = await openReading(s);
    if (entry.opened) {
      await finishReading(s, cmAnswers);
      const bank = s.view.queryByRole('button', { name: 'Bank the session' }); if (bank) fireEvent.click(bank);
    }
    const loaded = C.parseSoccerCareerSave(s.storage()!);
    raw('cm-reward', snapshot(s, { entry, loaded }));
    expect(s.calls, 'SC_READING_CM_REWARD').toStrictEqual([['passing', 60]]);
    expect(C.isSoccerCareerSave(loaded), 'SC_READING_CM_REWARD').toBe(true);
    expect(loaded, 'SC_READING_CM_REWARD').toStrictEqual(expectedReward(s, 60, 1, 'Passing'));
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_READING_CM_REWARD').toBeNull();
    expect(tape, 'SC_READING_CM_REWARD').toStrictEqual([]);
    expect(s.drills, 'SC_READING_CM_REWARD').toStrictEqual([]);
    expect(s.inputHeld(), 'SC_READING_CM_REWARD').toBe(true);
    expect(localStorage.getItem('reading-unrelated'), 'SC_READING_CM_REWARD').toBe('{"keep":"unchanged"}');
  });

  it('maps four correct keeper reads to Distribution without increasing current 98 skills or overall', async () => {
    const s = setup('GK'), entry = await openReading(s);
    if (entry.opened) {
      await finishReading(s, gkAnswers);
      const bank = s.view.queryByRole('button', { name: 'Bank the session' }); if (bank) fireEvent.click(bank);
    }
    const loaded = C.parseSoccerCareerSave(s.storage()!) as CareerState;
    raw('gk-reward', snapshot(s, { entry, loaded }));
    expect(s.calls, 'SC_READING_GK_REWARD').toStrictEqual([['passing', 80]]);
    expect(loaded, 'SC_READING_GK_REWARD').toStrictEqual(expectedReward(s, 80, 2, 'Distribution'));
    expect([loaded.pace, loaded.shooting, loaded.passing, loaded.dribbling, loaded.defending, loaded.physical, loaded.reflexes, loaded.overall], 'SC_READING_GK_REWARD')
      .toStrictEqual([98, 98, 98, 98, 98, 98, 98, 98]);
    expect(tape, 'SC_READING_GK_REWARD').toStrictEqual([]);
    expect(s.inputHeld(), 'SC_READING_GK_REWARD').toBe(true);
  });

  it('locks the first read, explains the open lane and holds score while rules and time change', async () => {
    const s = setup(), entry = await openReading(s);
    let firstScore: string | null = null, afterTime: string | null = null, feedback: string | null = null,
      blockedSecond = false, helperPreserved = false, allOptionLabels: string[][] = [];
    if (entry.opened) {
      const score = () => s.view.queryByLabelText('Reading session score')?.textContent ?? null;
      firstScore = score();
      vi.useFakeTimers();
      act(() => { vi.advanceTimersByTime(90000); });
      afterTime = score(); vi.useRealTimers();
      const group = s.view.getByRole('group', { name: /^Decision 1 of 5:/ });
      act(() => {
        fireEvent.click(within(group).getByRole('button', { name: 'Force the centre pass' }));
        fireEvent.click(within(group).getByRole('button', { name: 'Pass left' }));
      });
      feedback = s.view.queryByRole('status', { name: 'Reading feedback' })?.textContent ?? '';
      blockedSecond = within(group).getAllByRole('button').every(button => (button as HTMLButtonElement).disabled);
      const rules = s.view.getByRole('button', { name: 'Reading session rules' });
      const beforeRules = score();
      fireEvent.click(rules);
      const reopened = !!s.view.queryByText(/three correct.*60.*four.*80/i);
      fireEvent.click(rules);
      helperPreserved = reopened && score() === beforeRules && !!s.view.queryByText(/central lane runs through the defender/i);
      allOptionLabels.push(within(group).getAllByRole('button').map(button => button.textContent ?? ''));
      fireEvent.click(s.view.getByRole('button', { name: 'Next decision' }));
      for (let i = 1; i < 5; i++) {
        const question = s.view.getByRole('group', { name: new RegExp('^Decision ' + (i + 1) + ' of 5:') });
        allOptionLabels.push(within(question).getAllByRole('button').map(button => button.textContent ?? ''));
        fireEvent.click(within(question).getByRole('button', { name: choose[i][[1, 0, 2, 1, 2][i]] }));
        fireEvent.click(s.view.getByRole('button', { name: i === 4 ? 'See session score' : 'Next decision' }));
      }
      await s.view.findByText('session score');
    }
    raw('first-read', snapshot(s, { entry, firstScore, afterTime, feedback, blockedSecond, helperPreserved, allOptionLabels }));
    expect(s.view.container.querySelector('[data-training-score]')?.textContent, 'SC_READING_FIRST_LOCK').toBe('80');
    expect([firstScore, afterTime], 'SC_READING_FIRST_LOCK').toStrictEqual(['0', '0']);
    expect(feedback, 'SC_READING_FIRST_LOCK').toContain('The central lane runs through the defender.');
    expect(blockedSecond && helperPreserved, 'SC_READING_FIRST_LOCK').toBe(true);
    expect(entry.example.length, 'SC_READING_FIRST_LOCK').toBeGreaterThan(0);
    expect(allOptionLabels, 'SC_READING_FIRST_LOCK').toStrictEqual(choose);
    expect(s.calls, 'SC_READING_FIRST_LOCK').toStrictEqual([]);
    expect(s.storage(), 'SC_READING_FIRST_LOCK').toBe(s.before);
    expect(tape, 'SC_READING_FIRST_LOCK').toStrictEqual([]);
  });

  it('replays the reading session freely after banking even before an available prop rerender', async () => {
    const s = setup('CM', false, true), entry = await openReading(s);
    let banked: string | null = null, replayed = false;
    if (entry.opened) {
      await finishReading(s, cmAnswers);
      const bank = s.view.queryByRole('button', { name: 'Bank the session' }); if (bank) fireEvent.click(bank);
      banked = s.storage();
      fireEvent.click(s.view.getByRole('button', { name: 'Try again' }));
      const start = s.view.queryByRole('button', { name: 'Start reading session' });
      if (start) {
        fireEvent.click(start); await finishReading(s, ['Pass left', 'Pass into the new space', 'Set it back to Support', 'Move into the open diagonal', 'Roll to Wide']);
        replayed = true;
      }
      const secondBank = s.view.queryByRole('button', { name: 'Bank the session' }); if (secondBank) fireEvent.click(secondBank);
    }
    raw('spent-replay', snapshot(s, { entry, banked, replayed }));
    expect(s.calls, 'SC_READING_SPENT_REPLAY').toStrictEqual([['passing', 60]]);
    expect(replayed, 'SC_READING_SPENT_REPLAY').toBe(true);
    expect(s.view.container.querySelector('[data-training-score]')?.textContent, 'SC_READING_SPENT_REPLAY').toBe('100');
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_READING_SPENT_REPLAY').toBeNull();
    expect(s.storage(), 'SC_READING_SPENT_REPLAY').toBe(banked);
    expect(C.parseSoccerCareerSave(s.storage()!), 'SC_READING_SPENT_REPLAY').toStrictEqual(expectedReward(s, 60, 1, 'Passing'));
    expect(tape, 'SC_READING_SPENT_REPLAY').toStrictEqual([]);
    expect(s.inputHeld(), 'SC_READING_SPENT_REPLAY').toBe(true);
  });

  it('keeps the paid classic penalty score, five global draws and existing reward route unchanged', () => {
    const s = setup('ST'); vi.useFakeTimers();
    fireEvent.click(s.view.getByRole('button', { name: /Penalty Placement/ })); penalties(s);
    fireEvent.click(s.view.getByRole('button', { name: 'Bank the session' }));
    raw('classic-paid', snapshot(s));
    expect(s.calls, 'SC_READING_CLASSIC_PAID').toStrictEqual([['shooting', 100]]);
    expect(s.view.container.querySelector('[data-training-score]')?.textContent, 'SC_READING_CLASSIC_PAID').toBe('100');
    expect(tape, 'SC_READING_CLASSIC_PAID').toStrictEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(s.current().statBoostNextSeason, 'SC_READING_CLASSIC_PAID').toStrictEqual({ shooting: 2 });
    expect(s.current().trainingSeasonYear, 'SC_READING_CLASSIC_PAID').toBe(2024);
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_READING_CLASSIC_PAID').toBeNull();
    expect(s.inputHeld(), 'SC_READING_CLASSIC_PAID').toBe(true);
  });

  it('keeps already-spent classic practice free with the complete saved career and global tape held', () => {
    const s = setup('ST', true); vi.useFakeTimers();
    fireEvent.click(s.view.getByRole('button', { name: /Penalty Placement/ })); penalties(s);
    fireEvent.click(s.view.getByRole('button', { name: 'Try again' })); penalties(s);
    fireEvent.click(s.view.getByRole('button', { name: 'Close' }));
    raw('classic-spent', snapshot(s, { closes: s.closes() }));
    expect(s.calls, 'SC_READING_CLASSIC_SPENT').toStrictEqual([]);
    expect(s.drills, 'SC_READING_CLASSIC_SPENT').toStrictEqual([]);
    expect(s.closes(), 'SC_READING_CLASSIC_SPENT').toBe(1);
    expect(s.storage(), 'SC_READING_CLASSIC_SPENT').toBe(s.before);
    expect(tape, 'SC_READING_CLASSIC_SPENT').toStrictEqual([]);
    expect(s.view.queryByRole('button', { name: 'Bank the session' }), 'SC_READING_CLASSIC_SPENT').toBeNull();
    expect(s.inputHeld(), 'SC_READING_CLASSIC_SPENT').toBe(true);
  });
});
