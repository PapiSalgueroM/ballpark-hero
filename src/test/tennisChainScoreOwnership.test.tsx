import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import { TennisChainBoard } from '@/components/tennis-chain/TennisChainBoard';

type ScoreRow = { nickname: string; score: number; chain_length: number; mode: string };
type InsertReply = { error: { message: string } | null };
type RankReply = { count: number | null; error: { message: string } | null };
type ListQuery = { order: () => ListQuery; limit: (limit: number) => Promise<{ data: never[]; error: null }> };
const io = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn(), rank: vi.fn(), list: vi.fn(), record: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: io.invoke },
  from: (table: string) => {
    expect(table).toBe('tennis_chain_scores');
    const list: ListQuery = { order: () => list, limit: (limit: number) => { expect(limit).toBe(10); return io.list(); } };
    return {
      insert: (row: ScoreRow) => io.insert(row),
      select: (columns: string, options?: { count: string; head: boolean }) => {
        if (options) {
          expect(columns).toBe('*'); expect(options).toEqual({ count: 'exact', head: true });
          return { gt: (column: string, length: number) => { expect(column).toBe('chain_length'); return io.rank(length); } };
        }
        expect(columns).toBe('nickname, chain_length, score'); return list;
      },
    };
  },
} }));
// The actual board and useTennisChain run. Only IO and unrelated navigation,
// scrolling and the search stimulus use the existing Round953 fixture seams.
vi.mock('@/components/tennis-chain/TennisChainSearch', () => ({ TennisChainSearch: ({ onSelect }: { onSelect: (name: string) => void }) => <button onClick={() => onSelect('Fixture Tennis Link')}>Pick fixture tennis link</button> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'FixtureChainGuest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const success: InsertReply = { error: null };
const failure: InsertReply = { error: { message: 'Fixture insert unavailable' } };
const ranked: RankReply = { count: 6, error: null };
const rankError: RankReply = { count: null, error: { message: 'Fixture rank unavailable' } };
const oldRow: ScoreRow = { nickname: 'Fixture Alpha', score: 100, chain_length: 1, mode: 'unlimited' };
const currentRow: ScoreRow = { nickname: 'Fixture Beta', score: 0, chain_length: 0, mode: 'unlimited' };
const pendingReplies = new Set<() => void>();
const defer = <T,>(fallback: T) => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = value => { pendingReplies.delete(drain); done(value); }; });
  const drain = () => resolve(fallback);
  pendingReplies.add(drain);
  return { promise, resolve };
};
type View = ReturnType<typeof render>;
let view: View | null = null;
let heldStores = '';
const traces: unknown[] = [];
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
const click = async (name: string | RegExp) => { await act(async () => { fireEvent.click(view!.getByRole('button', { name })); }); };
const nickname = (name: string) => fireEvent.change(view!.getByRole('textbox', { name: 'Your nickname' }), { target: { value: name } });
const sendControl = () => {
  const button = view!.getByRole('textbox', { name: 'Your nickname' }).parentElement!.querySelector<HTMLButtonElement>('button');
  expect(button).not.toBeNull(); return button!;
};
const submit = async () => { await act(async () => { fireEvent.click(sendControl()); }); };
const settle = async <T,>(held: { resolve: (value: T) => void }, reply: T) => { await act(async () => { held.resolve(reply); }); };
const score = () => view!.getByText(/^Final Score:/).textContent;
const unsaved = () => {
  const input = view!.queryByRole('textbox', { name: 'Your nickname' });
  expect(input, 'The new round must keep its own unsaved score form').not.toBeNull();
  expect(input).toHaveValue('Fixture Beta');
  expect(view!.queryByText(/^You ranked #/)).toBeNull(); expect(score()).toBe('Final Score: 0');
};
const pendingCurrent = () => {
  unsaved(); expect(sendControl(), 'An older save must not release the current round pending save').toBeDisabled();
  expect(sendControl()).toHaveTextContent('...');
};
async function start(links: number) {
  await click(/🔄 Unlimited/);
  for (let index = 0; index < links; index++) await click('Pick fixture tennis link');
}
async function finish(links: number) {
  await start(links); await click('Give Up'); expect(score()).toBe('Final Score: ' + links * 100);
}
async function firstRound() {
  view = render(<MemoryRouter><TennisChainBoard /></MemoryRouter>);
  await finish(1); nickname('Fixture Alpha');
}
async function nextRound() {
  await click('Play Again'); await finish(0); nickname('Fixture Beta');
  expect(io.record.mock.calls.map(call => call[1])).toEqual([100, 0]);
}
async function heldOld(boundary: 'insert' | 'rank') {
  const held = boundary === 'insert' ? defer<InsertReply>(success) : defer<RankReply>(ranked);
  if (boundary === 'insert') io.insert.mockReturnValueOnce(held.promise);
  else io.rank.mockReturnValueOnce(held.promise);
  await submit(); expect(sendControl()).toBeDisabled(); expect(io.insert).toHaveBeenCalledExactlyOnceWith(oldRow);
  if (boundary === 'rank') expect(io.rank).toHaveBeenCalledExactlyOnceWith(1);
  return { release: async (outcome: 'success' | 'error' = 'success') => {
    if (boundary === 'insert') await settle(held as ReturnType<typeof defer<InsertReply>>, outcome === 'success' ? success : failure);
    else await settle(held as ReturnType<typeof defer<RankReply>>, outcome === 'success' ? ranked : rankError);
  } };
}

beforeEach(() => {
  vi.clearAllMocks();
  io.invoke.mockReset().mockResolvedValue({ data: { valid: true, fullName: 'Fixture Tennis Link', connection: 'Synthetic fixture connection' }, error: null });
  io.insert.mockReset().mockResolvedValue(success); io.rank.mockReset().mockResolvedValue(ranked); io.list.mockReset().mockResolvedValue({ data: [], error: null });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('tennis-score-held-save', '{"held":true}'); sessionStorage.setItem('tennis-score-held-session', 'held'); heldStores = stores();
});
afterEach(async context => {
  const pendingBeforeCleanup = pendingReplies.size;
  await act(async () => { for (const drain of [...pendingReplies]) drain(); });
  traces.push({ name: context.task.name, pendingBeforeCleanup, pendingAfterCleanup: pendingReplies.size, insertedRows: io.insert.mock.calls.map(call => call[0]), rankLengths: io.rank.mock.calls.map(call => call[0]), completionScores: io.record.mock.calls.map(call => call[1]), nickname: document.querySelector<HTMLInputElement>('[aria-label="Your nickname"]')?.value ?? null, rank: document.body.textContent?.match(/You ranked #\d+ today!/)?.[0] ?? null, finalScore: document.body.textContent?.match(/Final Score: \d+/)?.[0] ?? null });
  cleanup(); view = null; expect(stores(), 'Score-save ownership must preserve all local and session stores').toBe(heldStores); vi.restoreAllMocks();
});
afterAll(() => {
  if (!process.env.TENNIS_SCORE_TRACE_DIR) return;
  fs.mkdirSync(process.env.TENNIS_SCORE_TRACE_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.TENNIS_SCORE_TRACE_DIR, 'trace.json'), JSON.stringify({ version: 1, scope: 'Actual TennisChainBoard and actual useTennisChain, fictional IO and Round953 search stimulus, no live writes.', cases: traces }, null, 2) + '\n');
});

describe('Tennis Chain score ownership', () => {
  for (const boundary of ['insert', 'rank'] as const) {
    it('keeps the new round unsaved after an old ' + boundary + ' completion', async () => {
      await firstRound(); const old = await heldOld(boundary); await nextRound();
      await old.release();
      expect(io.insert).toHaveBeenCalledExactlyOnceWith(oldRow); expect(io.rank).toHaveBeenCalledExactlyOnceWith(1);
      unsaved(); expect(sendControl()).toBeEnabled();
    });
  }
  for (const boundary of ['insert', 'rank'] as const) for (const outcome of ['success', 'error'] as const) {
    it('keeps a current save pending across old ' + boundary + ' ' + outcome, async () => {
      await firstRound(); const old = await heldOld(boundary); await nextRound();
      const canSubmitCurrent = !sendControl().disabled;
      if (!canSubmitCurrent) {
        await old.release(outcome);
        expect(canSubmitCurrent, 'Reset must release the older round save busy state').toBe(true);
        return;
      }
      const current = defer<InsertReply>(success); io.insert.mockReturnValueOnce(current.promise);
      await submit(); expect(io.insert.mock.calls.map(call => call[0])).toEqual([oldRow, currentRow]); pendingCurrent();
      await old.release(outcome); pendingCurrent(); expect(io.rank.mock.calls.map(call => call[0])).toEqual(boundary === 'insert' && outcome === 'error' ? [] : [1]);
      await settle(current, success);
      expect(io.rank.mock.calls.at(-1)).toEqual([0]); expect(view!.queryByRole('textbox', { name: 'Your nickname' })).toBeNull(); expect(view!.getByText('You ranked #7 today!')).toBeVisible(); expect(score()).toBe('Final Score: 0');
    });
  }

  it('ordinary current saves retain exact rows and the existing rank-error fallback', async () => {
    await firstRound(); await submit(); expect(io.insert).toHaveBeenCalledExactlyOnceWith(oldRow); expect(io.rank).toHaveBeenCalledExactlyOnceWith(1); expect(view!.getByText('You ranked #7 today!')).toBeVisible();
    await nextRound(); io.rank.mockResolvedValueOnce(rankError); await submit();
    expect(io.insert.mock.calls.map(call => call[0])).toEqual([oldRow, currentRow]); expect(io.rank.mock.calls.map(call => call[0])).toEqual([1, 0]); expect(view!.getByText('You ranked #1 today!')).toBeVisible();
  });
  it('a current insert failure keeps its nickname and allows the exact current retry', async () => {
    await firstRound(); io.insert.mockResolvedValueOnce(failure); await submit();
    expect(view!.getByRole('textbox', { name: 'Your nickname' })).toHaveValue('Fixture Alpha'); expect(sendControl()).toBeEnabled(); expect(io.rank).not.toHaveBeenCalled();
    await submit(); expect(io.insert.mock.calls.map(call => call[0])).toEqual([oldRow, oldRow]); expect(io.rank).toHaveBeenCalledExactlyOnceWith(1); expect(view!.getByText('You ranked #7 today!')).toBeVisible();
  });
  it('a pending current save rejects a second submission without a duplicate row', async () => {
    await firstRound(); const current = defer<InsertReply>(success); io.insert.mockReturnValueOnce(current.promise); await submit();
    expect(sendControl()).toBeDisabled(); await submit(); expect(io.insert).toHaveBeenCalledExactlyOnceWith(oldRow);
    await settle(current, success); expect(io.rank).toHaveBeenCalledExactlyOnceWith(1); expect(view!.getByText('You ranked #7 today!')).toBeVisible();
  });
  it('reset without a pending save starts a normal editable unsaved round', async () => {
    await firstRound(); await nextRound(); unsaved(); expect(sendControl()).toBeEnabled(); expect(io.insert).not.toHaveBeenCalled(); expect(io.rank).not.toHaveBeenCalled();
  });
  it('an old save finishing during play does not pre-submit the next finished round', async () => {
    await firstRound(); const old = await heldOld('insert'); await click('Play Again'); await start(0); await old.release();
    expect(view!.getByRole('button', { name: 'Give Up' })).toBeVisible(); await click('Give Up'); nickname('Fixture Beta'); unsaved(); expect(sendControl()).toBeEnabled(); expect(io.insert).toHaveBeenCalledExactlyOnceWith(oldRow);
  });
});
