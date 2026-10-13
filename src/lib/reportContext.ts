import { getTodayET } from '@/lib/dateUtils';

const CONTEXT_LIMIT = 1500;
const RESERVED = new Set(['path', 'date', 'submittedAt', 'source', 'diagnostics', 'contextTruncated']);

/** Only caller-supplied game details and these small diagnostics enter a report. */
export function buildReportContext(
  gameContext: Record<string, unknown> = {},
  source: 'game-report-button' | 'footer-report-button' = 'game-report-button',
): Record<string, unknown> {
  let shortened = false;
  const compact = (value: unknown, depth = 0): unknown => {
    if (typeof value === 'string') {
      if (value.length > 200) shortened = true;
      return value.slice(0, 200);
    }
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') { if (!Number.isFinite(value)) shortened = true; return Number.isFinite(value) ? value : null; }
    if (value === undefined) return undefined;
    if (depth >= 3) { shortened = true; return null; }
    if (Array.isArray(value)) {
      if (value.length > 24) shortened = true;
      return value.slice(0, 24).map(item => compact(item, depth + 1));
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length > 16) shortened = true;
      if (entries.some(([key]) => key.length > 80)) shortened = true;
      return Object.fromEntries(entries.slice(0, 16).map(([key, item]) => [key.slice(0, 80), compact(item, depth + 1)]));
    }
    shortened = true;
    return undefined;
  };
  const context: Record<string, unknown> = {
    path: window.location.pathname.slice(0, 200),
    date: getTodayET(),
    submittedAt: new Date().toISOString(),
    source,
    contextTruncated: false,
  };
  const fits = (value: Record<string, unknown>) => JSON.stringify(value).length < CONTEXT_LIMIT;

  for (const [key, value] of Object.entries(gameContext).slice(0, 16)) {
    if (RESERVED.has(key)) { shortened = true; continue; }
    const bounded = compact(value);
    if (key.length <= 80 && fits({ ...context, [key]: bounded })) context[key] = bounded;
    else shortened = true;
  }
  if (Object.keys(gameContext).length > 16) shortened = true;
  context.contextTruncated = shortened;

  const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  const entryUrl = entry ? new URL(entry.src, window.location.origin) : null;
  const build = entryUrl?.origin === window.location.origin && /^\/assets\/index-[\w-]+\.js$/.test(entryUrl.pathname)
    ? entryUrl.pathname.split('/').pop() ?? null : null;
  const diagnostics: Record<string, unknown> = {};
  const available = {
    build,
    viewport: { width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 64) ?? null,
    browser: navigator.userAgent.slice(0, 200),
    language: navigator.language.slice(0, 32),
  };
  for (const [key, value] of Object.entries(available)) {
    if (fits({ ...context, diagnostics: { ...diagnostics, [key]: value } })) diagnostics[key] = value;
  }
  if (Object.keys(diagnostics).length) context.diagnostics = diagnostics;
  return context;
}
