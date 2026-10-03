import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ChampOrNot from '@/pages/ChampOrNot';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import { COMPETITIONS, buildDailySlots, type ChampRow, type CompetitionDef } from '@/lib/champOrNot';
import { buildRugbyLeagueRun, fetchRugbyLeagueRows, RUGBY_ROUNDS } from '@/lib/rugbyLeagueChallenge';
import { dailyDraw, getTodayET, shuffledRange } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { RugbyLeagueChallenge } from '@/components/champ-or-not/RugbyLeagueChallenge';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import records from './fixtures/rugbyLeagueRecords.json';

const network = vi.hoisted(() => ({ rows: new Map<string, ChampRow[]>(), calls: [] as string[], fail: '', pending: null as Promise<void> | null }));
vi.mock('@/lib/champOrNot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async (def: CompetitionDef) => {
    network.calls.push(def.key);
    if (network.pending) await network.pending;
    if (network.fail === def.key) throw new Error('Fixture request unavailable');
    return network.rows.get(def.key) ?? [];
  },
}));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => <button>Legacy rules fixture</button> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <div data-fixture-share={score} /> }));

const banks = () => new Map<string, ChampRow[]>(Object.entries(records).map(([key, rows]) => [key, rows.map(row => ({ ...row }))]));
const saveKey = () => `champ-or-not-daily-${getTodayET()}`;
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('champ-or-not');
  network.rows = banks(); network.calls = []; network.fail = ''; network.pending = null;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-10-03T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
});

async function page() {
  const view = render(<HelmetProvider><MemoryRouter><ChampOrNot /></MemoryRouter></HelmetProvider>);
  await flush();
  return view;
}
type Page = Awaited<ReturnType<typeof page>>;
async function enter(view: Page, start = true) {
  fireEvent.click(view.getByRole('button', { name: 'Rugby League' })); await flush();
  const panel = view.container.querySelector<HTMLElement>('[data-rugby-challenge]')!;
  expect(panel).not.toBeNull();
  if (start) fireEvent.click(within(panel).getByRole('button', { name: 'Start ten questions' }));
  return panel;
}
function question(panel: HTMLElement) {
  const card = panel.querySelector<HTMLElement>('[data-rugby-question]')!;
  const category = card.getAttribute('data-rugby-category') as keyof typeof records;
  const statement = card.querySelector('[data-rugby-statement]')!.textContent!;
  const year = Number(statement.match(/\b\d{4}\b/)?.[0]);
  const def = COMPETITIONS.find(comp => comp.key === category)!;
  const names = [...new Set(records[category].map(row => row.team))];
  const shown = names.find(name => def.phrase(name, year) === statement);
  expect(shown).toBeDefined();
  const winners = records[category].filter(row => row.year === year).map(row => row.team);
  expect(winners.length).toBeGreaterThan(0);
  return { card, category, statement, year, winners, truth: winners.includes(shown!) };
}
function answer(panel: HTMLElement, correct = true) {
  const claim = question(panel);
  fireEvent.click(within(panel).getByRole('button', { name: (correct ? claim.truth : !claim.truth) ? 'CHAMP' : 'NOT' }));
  return claim;
}
function advance(panel: HTMLElement, last = false) {
  fireEvent.click(within(panel).getByRole('button', { name: last ? 'View results' : 'Next claim' }));
}
function finish(panel: HTMLElement, correct = Array(10).fill(true) as boolean[]) {
  const dealt: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const claim = answer(panel, correct[i]); dealt.push(claim.statement);
    const status = within(panel).getByRole('status');
    expect(status).toHaveTextContent(correct[i] ? 'Right call!' : 'Not this time.');
    expect(status).toHaveTextContent(`${claim.year} ${claim.category === 'nrl' ? 'premiers' : 'Dally M'}: ${claim.winners.join(' and ')}.`);
    expect(panel.querySelector('[data-rugby-question]')).toHaveAttribute('data-rugby-question', String(i + 1));
    advance(panel, i === 9);
  }
  expect(panel).toHaveAttribute('data-rugby-phase', 'done');
  return dealt;
}
const stored = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
function exampleText(panel: HTMLElement) {
  return within(panel).getByText('Try this example').parentElement!.querySelectorAll('p')[1].textContent!;
}

describe('Rugby League actual page play', () => {
  it('shows playable rules and a verified example before the first question and reopens them safely', async () => {
    const view = await page(), panel = await enter(view, false);
    expect(panel).toHaveAttribute('data-rugby-phase', 'intro');
    expect(panel).toHaveTextContent('one point for each correct call');
    expect(records.nrl.some(row => exampleText(panel) === `${row.team} won the top grade rugby league premiership in ${row.year}.`)).toBe(true);
    expect(within(panel).queryByRole('button', { name: 'CHAMP' })).not.toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Start ten questions' }));
    const before = question(panel).statement;
    const heldAnswer = within(panel).getByRole('button', { name: 'CHAMP' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Rugby League rules' }));
    const dialog = view.getByRole('dialog');
    expect(dialog).toHaveTextContent('five Australian premiers and five Dally M medallists');
    expect(dialog).toHaveTextContent('Worked example:');
    expect(dialog).toHaveTextContent('Daily scores stay separate.');
    fireEvent.click(heldAnswer);
    expect(panel).toHaveAttribute('data-rugby-phase', 'question');
    fireEvent.click(within(dialog).getByRole('button', { name: "Let's Play!" }));
    act(() => vi.advanceTimersByTime(0));
    expect(question(panel).statement).toBe(before);
    expect(within(panel).getByRole('button', { name: 'Rugby League rules' })).toHaveFocus();
  });

  it('keeps asynchronous rules focus and derives its example only from eligible records', async () => {
    network.rows.set('nrl', [{ ...records.nrl[0], year: 2026 }, ...records.nrl]);
    let resolve!: () => void;
    network.pending = new Promise<void>(done => { resolve = done; });
    const view = render(<RugbyLeagueChallenge active onExit={() => undefined} />);
    const panel = view.container.querySelector<HTMLElement>('[data-rugby-challenge]')!;
    fireEvent.click(within(panel).getByRole('button', { name: 'Rugby League rules' }));
    const close = within(view.getByRole('dialog')).getByRole('button', { name: "Let's Play!" }); close.focus();
    await act(async () => { resolve(); await Promise.resolve(); });
    expect(panel).toHaveAttribute('data-rugby-phase', 'intro');
    expect(close).toHaveFocus();
    expect(view.getByRole('dialog')).not.toHaveTextContent('2026');
    fireEvent.click(close);
    expect(records.nrl.some(row => exampleText(panel) === `${row.team} won the top grade rugby league premiership in ${row.year}.`)).toBe(true);
  });

  it('reveals actual winners until explicit advance and totals the ten calls by category', async () => {
    const view = await page(), panel = await enter(view);
    const correct = [true, false, true, true, false, true, true, false, true, true];
    for (let i = 0; i < 10; i += 1) {
      const claim = answer(panel, correct[i]);
      const status = within(panel).getByRole('status');
      expect(status).toHaveTextContent(correct[i] ? 'Right call!' : 'Not this time.');
      expect(status).toHaveTextContent(claim.winners.join(' and '));
      const next = within(panel).getByRole('button', { name: i === 9 ? 'View results' : 'Next claim' });
      expect(next).toHaveFocus();
      act(() => vi.advanceTimersByTime(10000));
      expect(panel).toHaveAttribute('data-rugby-phase', 'reveal');
      expect(question(panel).statement).toBe(claim.statement);
      fireEvent.click(next);
    }
    expect(panel.querySelector('[data-rugby-score="total"]')).toHaveTextContent('7 / 10');
    expect(panel.querySelector('[data-rugby-score="nrl"]')).toHaveTextContent('4 / 5');
    expect(panel.querySelector('[data-rugby-score="dallym"]')).toHaveTextContent('3 / 5');
  });

  it('replays a new balanced set with no stale points answers or result card', async () => {
    const view = await page(), panel = await enter(view);
    const first = finish(panel);
    expect(panel.querySelector('[data-rugby-score="total"]')).toHaveTextContent('10 / 10');
    fireEvent.click(within(panel).getByRole('button', { name: 'Play another ten' }));
    expect(panel).toHaveAttribute('data-rugby-phase', 'question');
    expect(panel.querySelector('[data-rugby-question]')).toHaveAttribute('data-rugby-question', '1');
    expect(panel).toHaveTextContent('Right: 0');
    expect(panel.querySelector('[data-rugby-result]')).not.toBeInTheDocument();
    expect(within(panel).getByRole('listitem', { name: 'Claim 1: current' })).toBeInTheDocument();
    const second = finish(panel, Array(10).fill(false));
    expect(second).not.toEqual(first);
    expect(panel.querySelector('[data-rugby-score="total"]')).toHaveTextContent('0 / 10');
  });

  it('accepts only one answer and one advance from same-frame repeated actions', async () => {
    const view = await page(), panel = await enter(view), claim = question(panel);
    const first = within(panel).getByRole('button', { name: claim.truth ? 'CHAMP' : 'NOT' });
    const second = within(panel).getByRole('button', { name: claim.truth ? 'NOT' : 'CHAMP' });
    act(() => { first.dispatchEvent(new MouseEvent('click', { bubbles: true })); second.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(within(panel).getByRole('status')).toHaveTextContent('Right call!');
    expect(panel).toHaveTextContent('Right: 1');
    expect(within(panel).getAllByRole('listitem').filter(item => /: (in)?correct$/.test(item.getAttribute('aria-label')!))).toHaveLength(1);
    const next = within(panel).getByRole('button', { name: 'Next claim' });
    act(() => { next.dispatchEvent(new MouseEvent('click', { bubbles: true })); next.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(panel.querySelector('[data-rugby-question]')).toHaveAttribute('data-rugby-question', '2');
    expect(panel).toHaveTextContent('Right: 1');
  });

  it('retains pending Daily and Unlimited Hard play while rugby leaves every saved byte alone', async () => {
    const view = await page();
    fireEvent.click(view.getByRole('button', { name: '🏆 CHAMP' }));
    const dailyReveal = view.getByRole('status').textContent;
    localStorage.setItem('rugby-unrelated-fixture', 'held');
    const before = stored();
    const panel = await enter(view); answer(panel); advance(panel);
    const rugbyClaim = question(panel).statement;
    expect(stored()).toEqual(before); expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(within(panel).getByRole('button', { name: 'Back to Champ or Not' }));
    expect(view.getByRole('status')).toHaveTextContent(dailyReveal!);
    expect(view.getByRole('button', { name: 'Rugby League' })).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: 'Next claim' }));
    fireEvent.click(view.getByRole('button', { name: 'Unlimited' }));
    fireEvent.click(view.getByRole('button', { name: '😈 Hard' }));
    fireEvent.click(view.getByRole('button', { name: '🚫 NOT' }));
    const unlimitedReveal = view.getByRole('status').textContent;
    fireEvent.click(view.getByRole('button', { name: 'Rugby League' }));
    expect(question(panel).statement).toBe(rugbyClaim);
    expect(panel.querySelector('[data-rugby-question]')).toHaveAttribute('data-rugby-question', '2');
    fireEvent.click(view.getByRole('button', { name: 'Unlimited' }));
    expect(view.getByRole('status')).toHaveTextContent(unlimitedReveal!);
    expect(stored()).toEqual(before); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('finishes and replays rugby without booking or corrupting an earned Daily on reload', async () => {
    const first = await page();
    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(first.getByRole('button', { name: '🏆 CHAMP' }));
      fireEvent.click(first.getByRole('button', { name: index === 9 ? 'View results' : 'Next claim' }));
    }
    const before = stored(), daily = localStorage.getItem(saveKey());
    expect(JSON.parse(daily!).answers).toHaveLength(10);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const panel = await enter(first); finish(panel);
    fireEvent.click(within(panel).getByRole('button', { name: 'Play another ten' })); answer(panel, false);
    expect(stored()).toEqual(before); expect(recordCompletion).toHaveBeenCalledTimes(1);
    first.unmount();
    const restored = await page();
    expect(restored.container.querySelector('[data-rugby-challenge]')).not.toBeInTheDocument();
    expect(restored.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', `${JSON.parse(daily!).answers.filter(Boolean).length}/10 on today's Champ or Not`);
    expect(stored()).toEqual(before); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('refuses an incomplete record bank and recovers through the actual retry action', async () => {
    network.rows.delete('nrl');
    const view = await page();
    expect(view.getByRole('button', { name: '🏆 CHAMP' })).toBeEnabled();
    const panel = await enter(view, false);
    expect(within(panel).getByRole('alert')).toHaveTextContent('Rugby League records are unavailable.');
    expect(within(panel).queryByRole('button', { name: 'Start ten questions' })).not.toBeInTheDocument();
    network.rows = banks();
    fireEvent.click(within(panel).getByRole('button', { name: 'Retry rugby records' })); await flush();
    expect(panel).toHaveAttribute('data-rugby-phase', 'intro');
    fireEvent.click(within(panel).getByRole('button', { name: 'Start ten questions' }));
    finish(panel); expect(panel.querySelector('[data-rugby-score="total"]')).toHaveTextContent('10 / 10');
    expect(localStorage.getItem(saveKey())).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); consumeRestoredFinish('champ-or-not'); });

// Historical scheduler reference for two or more banks, held independently of the new guard.
function priorSlots(keys: string[], seed: string, count: number) {
  const slots = shuffledRange(keys.length, `${seed}:comps`).map(index => keys[index]).slice(0, count);
  for (let attempt = 0; slots.length < count && attempt < 1000; attempt += 1) {
    const pick = keys[dailyDraw(keys.length, `${seed}:extra:${attempt}`)];
    if (slots[slots.length - 1] !== pick) slots.push(pick);
  }
  expect(slots).toHaveLength(count);
  return slots;
}

describe('Rugby League challenge records and scheduler', () => {
  it('fetches only the two existing rugby record definitions and rejects a failed bank', async () => {
    const rows = await fetchRugbyLeagueRows();
    expect(network.calls).toEqual(['nrl', 'dallym']);
    expect(rows).toEqual(banks());
    network.fail = 'dallym';
    await expect(fetchRugbyLeagueRows()).rejects.toThrow('Fixture request unavailable');
  });

  it('deals ten deterministic alternating claims with five distinct years per category', () => {
    const rows = banks(), before = JSON.stringify([...rows]);
    expect(RUGBY_ROUNDS).toBe(10);
    const signatures = new Set<string>();
    for (let seed = 0; seed < 64; seed += 1) {
      const run = buildRugbyLeagueRun(rows, `balanced:${seed}`);
      expect(run).not.toBeNull(); expect(run).toHaveLength(10);
      expect(run!.map(round => round.compKey)).toEqual(['nrl', 'dallym', 'nrl', 'dallym', 'nrl', 'dallym', 'nrl', 'dallym', 'nrl', 'dallym']);
      expect(new Set(run!.map(round => `${round.compKey}:${round.year}`)).size).toBe(10);
      expect(buildRugbyLeagueRun(rows, `balanced:${seed}`)).toEqual(run);
      signatures.add(JSON.stringify(run));
    }
    expect(signatures.size).toBeGreaterThan(1);
    expect(JSON.stringify([...rows])).toBe(before);
  });

  it('keeps both winners of split years and never invents a vacant-year claim', () => {
    const rows = banks(), covered = new Set<string>(), tiedTruth = new Set<boolean>();
    for (let seed = 0; seed < 128; seed += 1) {
      const run = buildRugbyLeagueRun(rows, `ties:${seed}`);
      expect(run).not.toBeNull();
      for (const round of run!) {
        const bank = rows.get(round.compKey)!;
        const winners = bank.filter(row => row.year === round.year).map(row => row.team);
        expect(round.realTeams).toEqual(winners);
        expect(bank.some(row => row.team === round.shownTeam)).toBe(true);
        expect(round.isTrue).toBe(winners.includes(round.shownTeam));
        expect(round.statement).toBe(COMPETITIONS.find(def => def.key === round.compKey)!.phrase(round.shownTeam, round.year));
        if (winners.length === 2) { covered.add(`${round.compKey}:${round.year}`); tiedTruth.add(round.isTrue); }
        expect(round.compKey === 'nrl' ? [2007, 2009] : [1997, 2003]).not.toContain(round.year);
      }
    }
    expect([...covered].sort()).toEqual(['dallym:2014', 'dallym:2016', 'nrl:1997']);
    expect(tiedTruth).toEqual(new Set([true, false]));
  });

  it('refuses missing thin or future-only banks and excludes unfinished seasons', () => {
    expect(buildRugbyLeagueRun(new Map(), 'empty')).toBeNull();
    const missing = banks(); missing.delete('dallym');
    expect(buildRugbyLeagueRun(missing, 'missing')).toBeNull();
    const thin = banks(); thin.set('dallym', records.dallym.slice(0, 7));
    expect(buildRugbyLeagueRun(thin, 'thin')).toBeNull();
    const repeated = banks(); repeated.set('nrl', Array.from({ length: 12 }, () => records.nrl[0]));
    expect(buildRugbyLeagueRun(repeated, 'one-year')).toBeNull();
    const futureOnly = banks(); futureOnly.set('nrl', records.nrl.map((row, index) => ({ ...row, year: 2026 + index })));
    expect(buildRugbyLeagueRun(futureOnly, 'future-only')).toBeNull();
    const extended = banks();
    extended.set('nrl', [...records.nrl, ...records.nrl.map((row, index) => ({ ...row, year: 2026 + index }))]);
    for (let seed = 0; seed < 32; seed += 1) {
      expect(buildRugbyLeagueRun(extended, `cutoff:${seed}`)).toEqual(buildRugbyLeagueRun(banks(), `cutoff:${seed}`));
    }
  });

  it('returns an exact finite schedule when only one legacy bank is available', () => {
    expect(buildDailySlots(['nrl'], 'one-bank')).toEqual(Array(10).fill('nrl'));
    expect(buildDailySlots(['dallym'], 'one-bank-custom', 17)).toEqual(Array(17).fill('dallym'));
    expect(buildDailySlots(['nrl'], 'zero', 0)).toEqual([]);
    expect(buildDailySlots([], 'no-banks')).toEqual([]);
  }, 1000);

  it('preserves the historical multi-bank schedule independently of rugby mode', () => {
    for (const keys of [['nrl', 'dallym'], ['nrl', 'dallym', 'nba'], COMPETITIONS.map(def => def.key)]) {
      for (let seed = 0; seed < 32; seed += 1) {
        for (const count of [10, 20]) expect(buildDailySlots(keys, `legacy:${seed}`, count)).toEqual(priorSlots(keys, `legacy:${seed}`, count));
      }
    }
  });

  it('preserves the original daily score save and single completion independently of rugby mode', async () => {
    const view = renderHook(useChampOrNot); await flush();
    expect(view.result.current.loadState).toBe('ready');
    const correct = [true, false, true, true, false, true, true, false, true, true];
    for (const earned of correct) {
      const truth = view.result.current.current!.isTrue;
      act(() => view.result.current.answer(earned ? truth : !truth));
      act(() => view.result.current.advanceReveal());
    }
    expect(view.result.current.score).toBe(7); expect(view.result.current.done).toBe(true);
    expect(localStorage.getItem(saveKey())).toBe(JSON.stringify({ answers: correct }));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    view.unmount();
    const restored = renderHook(useChampOrNot); await flush();
    expect(restored.result.current.score).toBe(7); expect(restored.result.current.done).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
