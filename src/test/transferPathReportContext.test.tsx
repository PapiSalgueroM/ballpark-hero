import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import type { TransferPathState, TransferPathRefusal } from '@/hooks/useTransferPath';
import type { PlayerEntity } from '@/lib/playerSearch';
import { TransferPathBoard } from '@/components/transfer-path/TransferPathBoard';

type Context = { puzzleId: string; playerA: string; playerB: string; rule: string; chain: string[];
  lastRejected: { name: string; after: string } | null; lastNoMatch: string | null; poolSize: number };
type ReportProps = { gameType: string; gameContext: Context };
const boundary = vi.hoisted(() => ({ state: null as TransferPathState | null, report: null as ReportProps | null,
  listeners: new Set<() => void>(), ignored: false, nextWrap: false, reason: undefined as TransferPathRefusal | undefined,
  calls: [] as { action: string; value?: string }[] }));
vi.mock('@/hooks/useTransferPath', async () => {
  const { useSyncExternalStore } = await import('react');
  return { useTransferPath: () => useSyncExternalStore(listener => {
    boundary.listeners.add(listener); return () => { boundary.listeners.delete(listener); };
  }, () => boundary.state!) };
});
vi.mock('@/components/game/ReportQuestion', () => ({ default: (props: ReportProps) => {
  boundary.report = props; return null;
} }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra?: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/FlagImg', async importOriginal => ({ ...await importOriginal<typeof import('@/components/FlagImg')>(), FlagImg: () => null }));
vi.mock('@/components/game/HowToPlayPopover', () => ({ HowToPlayPopover: ({ children }: { children: ReactNode }) => <aside aria-label="Rule instructions">{children}</aside> }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ onPlayAgain, playAgainLabel, playNext }: { onPlayAgain?: () => void; playAgainLabel: string; playNext?: ReactNode }) => <section aria-label="Fixture result decoration">{onPlayAgain && <button onClick={onPlayAgain}>{playAgainLabel}</button>}{playNext}</section> }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({ PlayerAutocomplete: (props: {
  value: string; onChange: (value: string) => void; onSelect: (entity: PlayerEntity) => void;
  onNoResults: (value: string | null) => void; emptyText: string;
}) => <div><input aria-label="Fixture player search" value={props.value} onChange={event => props.onChange(event.target.value)} />
  <button onClick={() => props.onNoResults(props.value)}>Record empty fixture search</button>
  {['Fixture Rejected One', 'Fixture Rejected Two', 'Fixture Advance', 'Fixture Finish'].map(name => <button key={name} onClick={() => props.onSelect({ name } as PlayerEntity)}>{name}</button>)}
  <p>{props.emptyText}</p></div> }));

const names = ['Fixture Origin', 'Fixture Target', 'Fixture Rejected One', 'Fixture Rejected Two', 'Fixture Advance', 'Fixture Finish'];
const allNames = () => names;
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const current = () => boundary.state!;
function patch(change: Partial<TransferPathState>) {
  boundary.state = { ...current(), ...change }; for (const listener of [...boundary.listeners]) listener();
}
function start(change: Partial<TransferPathState>) {
  patch({ status: 'building', chain: [change.puzzle?.playerA ?? current().puzzle.playerA], connections: [null], ...change });
}
function fixture(): TransferPathState {
  return {
    puzzle: { id: 'fixture-a', playerA: names[0], playerB: names[1], minSteps: 2, hint: 'Fictional route hint' },
    chain: [names[0]], connections: [null], status: 'building', score: 0, mode: 'unlimited', unlimitedIndex: 2,
    rule: 'classic', activeRule: 'classic', ruleLocked: false, dailyRuleBlocked: false,
    ruleAvailability: { classic: 3, active: 3, europe: 3 }, optimal: 2, hint: 'Fictional route hint', stranded: false,
    moreHelp: { doors: { total: 1, onRoute: 1, byClub: [{ club: 'Fixture Club', players: 1, onRoute: 1 }], intoTotal: 1, into: [{ club: 'Fixture Club', players: 1 }] }, lines: ['Fictional count-only help'] },
    addPlayer: name => {
      boundary.calls.push({ action: 'addPlayer', value: name });
      if (name === 'Fixture Advance' || name === 'Fixture Finish') {
        patch({ chain: [...current().chain, name], connections: [...current().connections, 'Fixture Club'], status: name === 'Fixture Finish' ? 'won' : 'building' });
        return { ok: true, club: 'Fixture Club' };
      }
      return { ok: false, club: null, reason: boundary.reason };
    },
    giveUp: () => { boundary.calls.push({ action: 'giveUp' }); patch({ status: 'gaveup', revealPath: [{ player: names[0], club: null }, { player: names[1], club: 'Fixture Club' }] }); },
    revealPath: null,
    switchToUnlimited: () => { boundary.calls.push({ action: 'switchToUnlimited' }); start({ mode: 'unlimited', unlimitedIndex: 0, puzzle: { ...current().puzzle, id: 'fixture-unlimited' } }); },
    nextPuzzle: () => { boundary.calls.push({ action: 'nextPuzzle' }); start({ unlimitedIndex: 0, puzzle: { ...current().puzzle, id: boundary.nextWrap ? current().puzzle.id : 'fixture-next' } }); },
    setRule: rule => {
      boundary.calls.push({ action: 'setRule', value: rule });
      if (boundary.ignored || rule === current().rule || current().ruleLocked || current().ruleAvailability[rule] === 0) return false;
      start({ rule, activeRule: rule });
    },
    getAllPlayerNames: allNames, getPlayerNationality: () => 'Fixture', getPlayerClubs: () => new Set(['Fixture Club']),
    isLoading: false, isLoadingPool: false,
  };
}
type Snapshot = { phase: string; identity: unknown; report: ReportProps | null; error: string | null; input: string | null; instructions: string | null; calls: unknown };
const traces: { title: string; snapshots: Snapshot[]; cleanup: { mountedNodes: number; subscriptions: number } }[] = [];
let snapshots: Snapshot[];
function mark(phase: string) {
  const state = current();
  snapshots.push({ phase, identity: plain({ id: state.puzzle.id, playerA: state.puzzle.playerA, playerB: state.puzzle.playerB,
    mode: state.mode, unlimitedIndex: state.unlimitedIndex, rule: state.rule, activeRule: state.activeRule, status: state.status }),
  report: plain(boundary.report), error: document.querySelector('p.text-destructive')?.textContent ?? null,
  input: (document.querySelector('input') as HTMLInputElement | null)?.value ?? null,
  instructions: document.querySelector('aside[aria-label="Rule instructions"]')?.textContent ?? null, calls: plain(boundary.calls) });
}
function report() {
  expect(boundary.report?.gameType).toBe('transfer-path');
  expect(Object.keys(boundary.report!.gameContext).sort()).toEqual(['puzzleId', 'playerA', 'playerB', 'rule', 'chain', 'lastRejected', 'lastNoMatch', 'poolSize'].sort());
  expect(boundary.report!.gameContext.poolSize).toBe(6); return boundary.report!.gameContext;
}
function seed(view: ReturnType<typeof render>) {
  fireEvent.change(view.getByRole('textbox'), { target: { value: 'Unlisted Fixture Query' } });
  fireEvent.click(view.getByRole('button', { name: 'Record empty fixture search' }));
  fireEvent.click(view.getByRole('button', { name: 'Fixture Rejected One' }));
  expect(report().lastRejected).toEqual({ name: 'Fixture Rejected One', after: 'Fixture Origin' });
  expect(report().lastNoMatch).toBe('Unlisted Fixture Query');
  expect(document.querySelector('p.text-destructive')?.textContent).toContain('Fixture Rejected One'); mark('seeded-current-failure');
}
function resetPurpose() {
  mark('after-identity-change'); const value = report();
  expect({ lastRejected: value.lastRejected, lastNoMatch: value.lastNoMatch, error: document.querySelector('p.text-destructive')?.textContent ?? null }, 'TP_CONTEXT_RESET').toEqual({ lastRejected: null, lastNoMatch: null, error: null });
}
beforeEach(() => { boundary.state = fixture(); boundary.report = null; boundary.calls = []; boundary.ignored = false; boundary.nextWrap = false; boundary.reason = undefined; snapshots = []; });
afterEach(context => {
  mark('before-cleanup'); cleanup(); const held = { mountedNodes: document.querySelectorAll('main').length, subscriptions: boundary.listeners.size };
  expect(held).toEqual({ mountedNodes: 0, subscriptions: 0 }); traces.push({ title: context.task.name, snapshots, cleanup: held });
});
afterAll(() => {
  if (process.env.TRANSFER_PATH_CONTEXT_TRACE) {
    fs.mkdirSync(path.dirname(process.env.TRANSFER_PATH_CONTEXT_TRACE), { recursive: true });
    fs.writeFileSync(process.env.TRANSFER_PATH_CONTEXT_TRACE, JSON.stringify({ version: 1, cases: traces }, null, 2) + '\n');
  }
});

describe('Transfer Path report context', () => {
  const replacements: { field: string; change: () => Partial<TransferPathState> }[] = [
    { field: 'puzzle id', change: () => ({ puzzle: { ...current().puzzle, id: 'fixture-replaced' } }) },
    { field: 'first endpoint', change: () => ({ puzzle: { ...current().puzzle, playerA: 'Fixture New Origin' }, chain: ['Fixture New Origin'] }) },
    { field: 'second endpoint', change: () => ({ puzzle: { ...current().puzzle, playerB: 'Fixture New Target' } }) },
    { field: 'mode', change: () => ({ mode: 'daily' }) },
    { field: 'unlimited index', change: () => ({ unlimitedIndex: 0 }) },
    { field: 'effective rule', change: () => ({ activeRule: 'europe' }) },
  ];
  for (const row of replacements) it(`clears all diagnostics when ${row.field} changes independently`, () => {
    const view = render(<TransferPathBoard />); seed(view); const change = row.change();
    act(() => patch(change)); expect(report().puzzleId).toBe(current().puzzle.id);
    expect(report().playerA).toBe(current().puzzle.playerA); expect(report().playerB).toBe(current().puzzle.playerB);
    expect(report().rule).toBe(current().activeRule); resetPurpose();
  });
  it('clears history through Next Puzzle even when the id wraps unchanged', () => {
    boundary.nextWrap = true; const view = render(<TransferPathBoard />); seed(view);
    fireEvent.click(view.getByRole('button', { name: 'Give up and see a path' }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' })); mark('gave-up');
    fireEvent.click(view.getByRole('button', { name: 'Next Puzzle' }));
    expect(current().puzzle.id).toBe('fixture-a'); expect(current().unlimitedIndex).toBe(0);
    expect(boundary.calls.filter(row => row.action === 'nextPuzzle')).toHaveLength(1); resetPurpose();
  });
  it('clears history through the completed daily Play Unlimited action', () => {
    boundary.state = { ...fixture(), mode: 'daily' }; const view = render(<TransferPathBoard />); seed(view);
    fireEvent.click(view.getByRole('button', { name: 'Fixture Finish' })); expect(report().lastRejected).not.toBeNull(); mark('daily-won');
    fireEvent.click(view.getByRole('button', { name: 'Play Unlimited' }));
    expect(current().mode).toBe('unlimited'); expect(report().puzzleId).toBe('fixture-unlimited');
    expect(boundary.calls.filter(row => row.action === 'switchToUnlimited')).toHaveLength(1); resetPurpose();
  });
  it('clears diagnostics after an accepted special-rule callback', () => {
    const view = render(<TransferPathBoard />); seed(view); fireEvent.click(view.getByRole('button', { name: 'Europe only' }));
    expect(current().rule).toBe('europe'); expect(report().rule).toBe('europe'); resetPurpose();
  });
  it('keeps same-puzzle history through help typing and a valid advancement', () => {
    const view = render(<TransferPathBoard />); seed(view); const prior = plain(report());
    fireEvent.click(view.getByRole('button', { name: /Show hint/ })); fireEvent.click(view.getByRole('button', { name: /More help/ }));
    expect(view.getByText('Fictional count-only help')).toBeInTheDocument(); expect(report()).toEqual(prior); mark('same-context-help');
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'Another Fixture Search' } }); expect(document.querySelector('p.text-destructive')).toBeNull();
    expect(report()).toEqual(prior); fireEvent.click(view.getByRole('button', { name: 'Fixture Advance' }));
    expect(report().chain).toEqual(['Fixture Origin', 'Fixture Advance']); expect(report().lastRejected).toEqual(prior.lastRejected);
    expect(report().lastNoMatch).toBe(prior.lastNoMatch); mark('same-context-advanced');
  });
  it('keeps diagnostics when a rule callback is guarded and returns false', () => {
    boundary.ignored = true; const view = render(<TransferPathBoard />); seed(view); const prior = plain(report());
    const error = document.querySelector('p.text-destructive')!.textContent;
    fireEvent.click(view.getByRole('button', { name: 'Europe only' }));
    expect(boundary.calls[boundary.calls.length - 1]).toEqual({ action: 'setRule', value: 'europe' }); expect(current().activeRule).toBe('classic');
    expect(report()).toEqual(prior); expect(document.querySelector('p.text-destructive')!.textContent).toBe(error); mark('guarded-rule-ignored');
  });
  it('replaces the latest failure and retains all specialized refusal branches', () => {
    const view = render(<TransferPathBoard />); seed(view);
    for (const [reason, text] of [
      ['duplicate', 'Fixture Rejected Two is already in the path'],
      ['unverified-active', "Fixture Rejected Two isn't in our verified 2026 active-player records, so Active players only leaves them out"],
      ['outside-europe', 'Fixture Rejected Two only links to Fixture Origin through a club outside Europe'],
    ] as const) {
      boundary.reason = reason; fireEvent.click(view.getByRole('button', { name: 'Fixture Rejected Two' }));
      expect(document.querySelector('p.text-destructive')).toHaveTextContent(text);
      expect(report().lastRejected).toEqual({ name: 'Fixture Rejected Two', after: 'Fixture Origin' }); mark(`specialized-${reason}`);
    }
  });
  it('describes a generic refusal as absent from our club-season records', () => {
    const view = render(<TransferPathBoard />); seed(view); mark('generic-records-copy');
    expect(document.querySelector('p.text-destructive')?.textContent, 'TP_CONTEXT_COPY').toBe("Fixture Rejected One and Fixture Origin don't share a club season in our records");
  });
  it('states that national teams do not count beside the club-season instruction', () => {
    const view = render(<TransferPathBoard />); mark('rule-instructions');
    const paragraph = view.getByText(/Each name you add must have been at the same club/);
    expect(paragraph.textContent).toContain('in the same season. Same shirt years apart does not count.');
    expect(paragraph.textContent, 'TP_CONTEXT_COPY').toContain("National teams don't count.");
  });
});
