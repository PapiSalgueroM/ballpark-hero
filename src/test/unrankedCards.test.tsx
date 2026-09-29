/**
 * Round 674: the free play line sits on the finished card, rendered, for
 * every game a daily reload driver can play.
 *
 * The fence lens review (R2.D5) found that scripts/simRankedRecorder.mjs
 * section 4 read a board that draws its own result card for "an
 * UnrankedNote with a daily only flag somewhere in the file", and never
 * whether the line renders on the card that shows the score. Only three of
 * 34 cards were rendered. Moving Buzzer Beater's line from its finished card
 * to the per shot card left every check green, and an Unlimited run's final
 * score then showed with nothing saying it pays no points.
 *
 * So this renders the real pages. Every driver in ./dailyReload plays its
 * daily to the finish with UnrankedNote replaced by a probe that renders
 * whatever its flag says (the real one renders nothing when ranked, which is
 * the daily). The probe must be absent from the live board and present on
 * the finished page, and in the daily its flag must be true. A probe inside
 * the shared ResultScreen (role="status") is the shared card's; one outside
 * it is a board's own card, which is the case the review was about.
 *
 * Which rows must show a board's own line is not known here: the harness
 * reads it from the source (every board that draws its own card and passes
 * the ranked flag) and hands it in as UNRANKED_CARD_EXPECT, a map of driver
 * file name to the number of own lines its finished page must carry (1, or
 * 0 for a page with no card of its own). Without it (a plain vitest run) each row
 * still checks the live board and the flag. Every row prints
 * UNRANKED_CARD_ROW with what it saw, which the harness reads.
 *
 * scripts/simRankedRecorder.mjs section 4 runs this file; its shotnote
 * control swaps in a Buzzer Beater board whose line sits on the per shot
 * card, and exactly the buzzer-beater row must go red.
 */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetMocks } from './dailyReload/mocks';
import { DRIVER_FIELDS, type AnyDriver } from './dailyReload/driver';

vi.mock('@/components/game/UnrankedNote', async importOriginal => {
  const real = await importOriginal<typeof import('@/components/game/UnrankedNote')>();
  const Probe = ({ ranked }: { ranked: boolean; className?: string }) => <span data-unranked-probe={ranked ? 'ranked' : 'free'} />;
  return { ...real, UnrankedNote: Probe, default: Probe };
});

/* A daily played to its end takes longer on a loaded machine than vitest's
   five second default; the rows are unchanged, they get room. */
vi.setConfig({ testTimeout: 120_000 });

const modules = import.meta.glob('./dailyReload/*.driver.tsx', { eager: true }) as Record<string, { default?: unknown }>;
/* Keyed by the driver's file name, which the harness can read without
   running it (the drill drivers build their slug at run time). */
const drivers: { file: string; d: AnyDriver }[] = [];
for (const [path, mod] of Object.entries(modules).sort(([a], [b]) => (a < b ? -1 : 1))) {
  const d = mod.default as Partial<AnyDriver> | undefined;
  if (d && typeof d === 'object' && DRIVER_FIELDS.every(f => d[f] !== undefined)) drivers.push({ file: path.split('/').pop()!, d: d as AnyDriver });
}

const expectRaw = process.env.UNRANKED_CARD_EXPECT;
const EXPECT: Record<string, number> | null = expectRaw ? JSON.parse(expectRaw) : null;

/* Every probe on the page, split by whether the shared card holds it. */
function probes(): { own: string[]; shared: string[] } {
  const own: string[] = [];
  const shared: string[] = [];
  for (const el of Array.from(document.body.querySelectorAll('[data-unranked-probe]'))) {
    (el.closest('[role="status"]') ? shared : own).push(el.getAttribute('data-unranked-probe') ?? '');
  }
  return { own, shared };
}

beforeEach(() => { localStorage.clear(); });
afterEach(() => cleanup());

describe('the free play line on the finished card', () => {
  it('discovers the drivers', () => {
    expect(drivers.length, 'the daily reload drivers are where this reads its rows from').toBeGreaterThan(20);
    if (EXPECT) {
      for (const file of Object.keys(EXPECT)) expect(drivers.some(x => x.file === file), `UNRANKED_CARD_EXPECT names ${file}, which is not a driver here`).toBe(true);
    }
  });

  for (const { file, d } of drivers) {
    const want = EXPECT ? EXPECT[file] : undefined;
    const title = !EXPECT
      ? `${d.slug}: the free play line is off the live board and flagged ranked on the finished daily`
      : want === 1
        ? `${d.slug}: the finished daily carries its own free play line, flagged ranked`
        : `${d.slug}: the finished daily carries no free play line of its own`;
    it(title, async () => {
      if (EXPECT && want === undefined) throw new Error(`UNRANKED_CARD_EXPECT has no entry for ${file}`);
      resetMocks(d.slug);
      const api = await d.mount();
      let live: { own: string[]; shared: string[] } = { own: [], shared: [] };
      let done: { own: string[]; shared: string[] } = { own: [], shared: [] };
      try {
        await d.enterDaily(api);
        expect(d.status(api), 'a fresh daily is playing').toBe('playing');
        live = probes();
        await d.finish(api);
        expect(d.status(api), 'the daily finished').toBe('finished');
        done = probes();
      } finally {
        console.log('UNRANKED_CARD_ROW ' + JSON.stringify({ file, slug: d.slug, live: live.own.length + live.shared.length, own: done.own.length, shared: done.shared.length, flags: [...done.own, ...done.shared] }));
        d.unmount(api);
      }
      expect(live.own.length + live.shared.length, 'the free play line is not on the live board, only on the finished card').toBe(0);
      expect([...done.own, ...done.shared].every(f => f === 'ranked'), 'in the daily the line is flagged ranked, so it stays hidden').toBe(true);
      if (want !== undefined) expect(done.own.length, want === 1 ? 'the board\'s own finished card carries the line' : 'no line outside the shared card').toBe(want);
    });
  }
});
