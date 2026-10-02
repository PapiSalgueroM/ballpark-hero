import { afterEach, expect, it, vi } from 'vitest';
import { fetchLiveBoard } from '@/lib/liveScores';

vi.mock('@/integrations/supabase/client', () => ({ SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public' }));
afterEach(() => { vi.unstubAllGlobals(); });

it('forwards the owned cancellation signal to the actual score fetch', async () => {
  const controller = new AbortController();
  let passed: AbortSignal | undefined;
  const fetch = vi.fn((_url: string, options: RequestInit) => {
    passed = options.signal as AbortSignal;
    return new Promise<Response>((_yes, no) => passed?.addEventListener('abort', () => no(new DOMException('Fixture abort', 'AbortError'))));
  });
  vi.stubGlobal('fetch', fetch);
  const work = fetchLiveBoard(new Date('2026-10-02T12:00:00Z'), controller.signal);
  expect(passed).toBe(controller.signal);
  controller.abort();
  await expect(work).resolves.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('preserves the original read window, row shape, limit and server clock', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [], headers: new Headers({ date: 'Fri, 02 Oct 2026 12:00:00 GMT' }) });
  vi.stubGlobal('fetch', fetch);
  const read = await fetchLiveBoard(new Date('2026-10-02T12:00:00Z'));
  expect(read).toEqual({ rows: [], serverNow: Date.parse('2026-10-02T12:00:00Z') });
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.origin).toBe('https://fixture.invalid');
  expect(url.pathname).toBe('/rest/v1/live_scores');
  expect(url.searchParams.get('limit')).toBe('150');
  expect(url.searchParams.get('select')).toBe('*');
  expect(url.searchParams.get('order')).toBe('start_at.asc');
  expect(url.searchParams.getAll('start_at')).toHaveLength(2);
});

it('keeps failed and malformed reads distinct from an empty successful board', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ invalid: true }) })
    .mockRejectedValueOnce(new Error('Fixture transport error'));
  vi.stubGlobal('fetch', fetch);
  expect(await fetchLiveBoard()).toBeNull();
  expect(await fetchLiveBoard()).toBeNull();
  expect(await fetchLiveBoard()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(3);
});
