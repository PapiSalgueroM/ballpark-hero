/* Round1417 diagnostic fixture. The helper copies this exact body to a temporary
   src/test file for remote types and Vitest, then removes only its own copy.
   Actual PhonePanel, quiz questions and engine action; no page/autosave claim. */
import { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import { applyMoneyAction, initCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { arcadeQuestions } from '@/lib/soccerArcade';
import { ensureMoney, type MoneyAction } from '@/lib/soccerMoney';

const CASES = [
  ['score0', 'completed zero-answer quiz keeps its saved result visible'],
  ['score1', 'completed one-answer quiz keeps its saved result visible'],
  ['score2', 'completed two-answer quiz keeps its saved result visible'],
  ['score3', 'completed perfect quiz keeps its saved result visible'],
  ['alreadyPlayed', 'already-played quiz stays locked without another action'],
  ['noHistory', 'insufficient-history quiz stays unavailable without an action'],
  ['unfinished', 'unfinished quiz reopens without recording a result'],
] as const;
type CaseKey = typeof CASES[number][0];
const observations: Record<string, Record<string, unknown>> = {};
const NOW = Date.UTC(2026, 9, 18, 12);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let draws: number[] = [];
let requests: { url: string; method: string }[] = [];

function fixture(senior = true): CareerState {
  const career = initCareer('Fixture Quiz Player', 'England', 'CM', 'modern',
    { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 },
    60, 2025, [{ id: 'fixture-harbor', name: 'Fixture Harbor', country: 'England', tier: 2, color: '#168256', league: 'Fixture League' }], null, 75);
  career.netWorth = 2;
  career.morale = 60;
  career.phoneInbox = [];
  career.phone!.threads = [];
  career.phone!.feed = [];
  career.phone!.world = null;
  if (senior) {
    career.age = 20;
    career.phase = 'playing';
    career.currentClub = 'Fixture Harbor';
    career.weeklyWage = 2500;
    career.seasons = [{ ...career.seasons[0], type: 'playing', age: 20, club: 'Fixture Harbor',
      apps: 30, leagueApps: 25, goals: 12, assists: 7, cleanSheets: 0, rating: 7.4, ovr: 60, injury: null }];
    career.events = ['Fixture senior season recorded'];
  }
  return career;
}

function stores() {
  const read = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
    .sort().map(key => [key, storage.getItem(key)]));
  return { local: read(localStorage), session: read(sessionStorage) };
}

function mountPhone(initial: CareerState, actions: MoneyAction[], toasts: (string | null)[]) {
  function Host() {
    const [career, setCareer] = useState(initial);
    const [open, setOpen] = useState(true);
    return <><output data-testid="quiz-career-json">{JSON.stringify(career)}</output>
      {!open && <button onClick={() => setOpen(true)}>Open fixture phone</button>}
      {open && <PhonePanel career={career} onAnswer={() => { throw new Error('Unexpected phone answer'); }}
        onBuyItem={() => { throw new Error('Unexpected item purchase'); }} onClose={() => setOpen(false)}
        onMoney={action => {
          actions.push(clone(action));
          const result = applyMoneyAction(career, action);
          toasts.push(result.toast);
          setCareer(result.state);
        }} />}</>;
  }
  const view = render(<Host />);
  const panel = () => view.getByRole('dialog', { name: 'Your phone' });
  const phone = () => within(panel());
  const stateJSON = () => view.getByTestId('quiz-career-json').textContent!;
  const openQuiz = () => fireEvent.click(phone().getByRole('button', { name: /Ball Quiz$/ }));
  const home = () => {
    const back = panel().querySelector<HTMLButtonElement>('[data-phone-back]');
    expect(back).not.toBeNull();
    fireEvent.click(back!);
  };
  const observe = () => ({ html: panel().innerHTML, text: panel().textContent,
    focused: document.activeElement instanceof HTMLElement ? document.activeElement.outerHTML : null,
    careerJSON: stateJSON() });
  return { ...view, panel, phone, stateJSON, openQuiz, home, observe };
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('fixture-quiz-local', 'unchanged');
  sessionStorage.setItem('fixture-quiz-session', 'unchanged');
  draws = []; requests = [];
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.314159); return 0.314159; });
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, method: init?.method ?? 'GET' });
    throw new Error('Unexpected transport during phone quiz');
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(() => {
  const output = process.env.BALL_QUIZ_COMPLETION_RAW;
  if (!output) return;
  if (!isAbsolute(output)) throw new Error('BALL_QUIZ_COMPLETION_RAW must be absolute');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ version: 1, caseTitles: CASES.map(([, title]) => title), cases: observations }, null, 2) + '\n', { flag: 'wx' });
});

function retain(row: Record<string, unknown>, initial: CareerState, readState: () => string) {
  row.sourceAfterJSON = JSON.stringify(initial);
  row.finalJSON = readState();
  row.storesAfter = stores();
  row.draws = [...draws];
  row.requests = clone(requests);
}
function preserved(initial: CareerState, initialJSON: string, storesBefore: ReturnType<typeof stores>) {
  expect(JSON.stringify(initial)).toBe(initialJSON);
  expect(stores()).toEqual(storesBefore);
  expect(draws).toEqual([]);
  expect(requests).toEqual([]);
}

describe('actual Soccer Career Ball Quiz completion', () => {
  for (const score of [0, 1, 2, 3] as const) {
    const [key, title] = CASES[score];
    it(title, () => {
      const initial = fixture(), initialJSON = JSON.stringify(initial), storesBefore = stores();
      const questions = arcadeQuestions(initial);
      const expected = applyMoneyAction(clone(initial), { t: 'arcade', right: score });
      const expectedJSON = JSON.stringify(expected.state);
      const actions: MoneyAction[] = [], toasts: (string | null)[] = [];
      draws = [];
      const view = mountPhone(initial, actions, toasts);
      const row: Record<string, unknown> = { key, title, initialJSON, expectedJSON, storesBefore,
        questions: clone(questions), answers: [], actions, toasts };
      observations[key] = row;
      try {
        expect(questions).toHaveLength(3);
        view.openQuiz(); row.opened = view.observe();
        const answers: { question: string; chosen: string; correct: boolean }[] = [];
        for (let index = 0; index < questions.length; index++) {
          const question = questions[index];
          expect(view.phone().getByText(question.q)).toBeVisible();
          for (const option of question.options) expect(view.phone().getByRole('button', { name: option })).toBeVisible();
          const choice = index < score ? question.answer : (question.answer + 1) % question.options.length;
          answers.push({ question: question.q, chosen: question.options[choice], correct: choice === question.answer });
          fireEvent.click(view.phone().getByRole('button', { name: question.options[choice] }));
          fireEvent.click(view.phone().getByRole('button', { name: index === questions.length - 1 ? 'See how you did' : 'Next one' }));
        }
        row.answers = answers;
        row.completed = view.observe(); row.committedJSON = view.stateJSON();
        const scoreNode = view.phone().queryByText(`${score}/3`);
        const resultBack = view.phone().queryByRole('button', { name: 'Put it away' });
        const completionVisible = Boolean(scoreNode && resultBack && scoreNode.parentElement?.contains(resultBack));
        row.completion = { expectedScore: `${score}/3`, scorePresent: !!scoreNode, resultBackPresent: !!resultBack, visible: completionVisible };
        expect(view.stateJSON()).toBe(expectedJSON);
        expect(actions).toEqual([{ t: 'arcade', right: score }]);
        expect(toasts).toEqual([`${score}/3`]);
        const actual = JSON.parse(view.stateJSON()) as CareerState, money = ensureMoney(actual);
        expect(money.aYear).toBe(2025); expect(money.aPlays).toBe(1); expect(money.aBest).toBe(score);
        expect(actual.netWorth).toBe(score === 3 ? 2.02 : 2);
        expect(actual.morale).toBe(score === 3 ? 62 : score === 2 ? 61 : 60);
        expect(actual.events).toEqual(expected.state.events); expect(actual.events).toHaveLength(initial.events.length + 1);
        view.home(); view.openQuiz(); row.reopened = view.observe();
        expect(view.phone().getByText('You have had today\'s three. It reloads next season, on the bus.')).toBeVisible();
        expect(view.phone().queryByRole('button', { name: questions[0].options[0] })).toBeNull();
        expect(actions).toHaveLength(1); expect(view.stateJSON()).toBe(expectedJSON);
        preserved(initial, initialJSON, storesBefore);
        retain(row, initial, view.stateJSON);
        expect(completionVisible, 'BALL_QUIZ_COMPLETION_VISIBLE').toBe(true);
      } finally { retain(row, initial, view.stateJSON); }
    });
  }

  for (const key of ['alreadyPlayed', 'noHistory', 'unfinished'] as const satisfies readonly CaseKey[]) {
    const title = CASES.find(([caseKey]) => caseKey === key)![1];
    it(title, () => {
      const prepared = fixture(key !== 'noHistory');
      const initial = key === 'alreadyPlayed' ? applyMoneyAction(prepared, { t: 'arcade', right: 3 }).state : prepared;
      const initialJSON = JSON.stringify(initial), questions = arcadeQuestions(initial), storesBefore = stores();
      const actions: MoneyAction[] = [], toasts: (string | null)[] = [];
      draws = [];
      const view = mountPhone(initial, actions, toasts);
      const row: Record<string, unknown> = { key, title, initialJSON, expectedJSON: initialJSON, storesBefore,
        questions: clone(questions), answers: [], actions, toasts };
      observations[key] = row;
      try {
        view.openQuiz(); row.opened = view.observe();
        if (key === 'alreadyPlayed') {
          expect(questions).toHaveLength(3);
          expect(view.phone().getByText('You have had today\'s three. It reloads next season, on the bus.')).toBeVisible();
          expect(ensureMoney(initial).aPlays).toBe(1); expect(ensureMoney(initial).aBest).toBe(3);
        } else if (key === 'noHistory') {
          expect(questions).toHaveLength(0);
          expect(view.phone().getByText('Not enough football has happened yet for it to ask you anything. Play a season.')).toBeVisible();
        } else {
          expect(questions).toHaveLength(3);
          const first = questions[0];
          fireEvent.click(view.phone().getByRole('button', { name: first.options[first.answer] }));
          row.answers = [{ question: first.q, chosen: first.options[first.answer], correct: true }];
          expect(view.phone().getByRole('button', { name: 'Next one' })).toBeVisible();
        }
        row.beforeBack = view.observe(); view.home(); view.openQuiz(); row.reopened = view.observe();
        if (key === 'unfinished') {
          expect(view.phone().getByText(questions[0].q)).toBeVisible();
          expect(view.phone().getByText('Question 1 of 3')).toBeVisible();
          expect(view.phone().getByText('0 right so far')).toBeVisible();
          expect(view.phone().queryByRole('button', { name: 'Next one' })).toBeNull();
        } else {
          expect(view.phone().queryByRole('button', { name: 'See how you did' })).toBeNull();
          expect(view.phone().getByText(key === 'alreadyPlayed' ? 'You have had today\'s three. It reloads next season, on the bus.'
            : 'Not enough football has happened yet for it to ask you anything. Play a season.')).toBeVisible();
        }
        expect(actions).toEqual([]); expect(toasts).toEqual([]); expect(view.stateJSON()).toBe(initialJSON);
        preserved(initial, initialJSON, storesBefore);
      } finally { retain(row, initial, view.stateJSON); }
    });
  }
});
