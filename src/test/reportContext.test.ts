import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReportContext } from '@/lib/reportContext';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T02:00:00.000Z'));
  window.history.replaceState({}, '', '/player-bingo?private=not-a-report#secret');
  document.head.innerHTML = '';
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('FixtureBrowser/1.0');
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-FX');
});
afterEach(() => { document.head.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

const entry = (src: string) => {
  const script = document.createElement('script');
  script.type = 'module'; script.src = src; document.head.append(script);
};

describe('bounded report context', () => {
  it('records UTC report time, the Eastern puzzle day, route and actual browser viewport', () => {
    entry('/assets/index-proof123.js?ignored=secret');
    const context = buildReportContext({ phase: 'playing', criterion: 'fixture-1' });
    expect(context).toMatchObject({ path: '/player-bingo', date: '2026-10-11', submittedAt: '2026-10-12T02:00:00.000Z', source: 'game-report-button', phase: 'playing', criterion: 'fixture-1', contextTruncated: false });
    expect(context.diagnostics).toMatchObject({ browser: 'FixtureBrowser/1.0', language: 'en-FX', build: 'index-proof123.js', viewport: { width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio } });
    expect(JSON.stringify(context)).not.toMatch(/private|secret|ignored/);
  });

  it('keeps explicit game details before optional diagnostics when the email budget is tight', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('B'.repeat(200));
    const lineup = Array.from({ length: 6 }, (_, i) => `${i}:` + 'x'.repeat(180));
    const context = buildReportContext({ phase: 'draft', lineup });
    expect(context.lineup).toEqual(lineup);
    expect(context.phase).toBe('draft');
    expect(context.contextTruncated).toBe(false);
    expect(JSON.stringify(context).length).toBeLessThan(1500);
    expect((context.diagnostics as Record<string, unknown> | undefined)?.browser).toBeUndefined();
  });

  it('marks bounded or omitted state, keeps valid JSON and never mutates the supplied state', () => {
    const state = { longText: 'x'.repeat(2000), rows: Array.from({ length: 100 }, (_, i) => ({ id: i, text: 'y'.repeat(300) })), nested: { a: { b: { c: { hidden: 'z' } } } } };
    const before = JSON.stringify(state);
    const context = buildReportContext(state);
    expect(context.contextTruncated).toBe(true);
    expect(context.longText).toBe('x'.repeat(200));
    expect(JSON.stringify(context).length).toBeLessThan(1500);
    expect(JSON.parse(JSON.stringify(context))).toEqual(context);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not substitute a remote script or development module for a production build identity', () => {
    entry('https://example.invalid/assets/index-other.js');
    expect((buildReportContext().diagnostics as Record<string, unknown>).build).toBeNull();
    document.head.innerHTML = ''; entry('/src/main.tsx');
    expect((buildReportContext().diagnostics as Record<string, unknown>).build).toBeNull();
  });

  it('does not read browser storage or account data and protects shared diagnostic fields', () => {
    const local = vi.spyOn(Storage.prototype, 'getItem');
    const context = buildReportContext({ phase: 'error', path: '/pretend', date: 'pretend', source: 'pretend', diagnostics: { account: 'pretend' } }, 'footer-report-button');
    expect(local).not.toHaveBeenCalled();
    expect(context).toMatchObject({ path: '/player-bingo', date: '2026-10-11', source: 'footer-report-button', phase: 'error', contextTruncated: true });
    expect(JSON.stringify(context)).not.toContain('pretend');
  });
});
