// Round 1052 fixer diagnostic (never committed): what the terminal fixture search of liveSimMotion.test.tsx
// finds on this tree, and what the viewer shows through the last minute of the 90 goal fixture.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive, isExtraTimeDue, uclLegsFor } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const OUT: string[] = [];
const say = (s: string) => { OUT.push(s); };
const fixtures = new Map<string, { career: CareerState; event: LiveFeedEvent }>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(seeded(603));
  if (!fixtures.size) {
    let career = startCareer('Aston Villa');
    for (let attempt = 0; attempt < 40 && fixtures.size < 3; attempt++) {
      const next = playNextEntry(career); career = next.state;
      if (!career.live) continue;
      const feed = liveFeed(career.live);
      for (const event of feed) {
        if (!['goal', 'save', 'shot'].includes(event.kind) || event.minute < 2 || event.minute > 42 || fixtures.has(event.kind)) continue;
        if (feed.some(other => other !== event && ['goal', 'save', 'shot'].includes(other.kind) && other.minute >= event.minute && other.minute < event.minute + 1.2)) continue;
        const copy = structuredClone(career); copy.live!.minute = event.minute - .2;
        fixtures.set(event.kind, { career: copy, event });
        say(`base fixture ${event.kind}: attempt ${attempt}, week ${career.live!.week}, entry ${JSON.stringify(career.calendar[career.live!.week]).slice(0, 200)}, opponent ${career.live!.opponent}, comp ${career.live!.compLabel}`);
      }
      career = resumeMatch(career).state;
    }
  }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function step(ms: number) { for (let time = 0; time < ms; time += 16) await act(async () => { vi.advanceTimersByTime(Math.min(16, ms - time)); }); }
const clockPos = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
const boardAt = (career: CareerState, cap: number) => (cap === 45 ? career.live!.added?.h1 : career.live!.added?.h2) ?? 0;
const tail = (career: CareerState, cap: number) => liveFeed(career.live!).filter(e => clockPos(e) >= cap + boardAt(career, cap) - 4 && e.minute <= cap)
  .map(e => `${e.kind}/${e.side}@${e.minute}${e.plus ? '+' + e.plus : ''}${e.text ? ' ' + e.text : ''}`).join(' ; ');

describe('diag', () => {
  it('prints the terminal fixtures and samples the 90 goal', async () => {
    const base = fixtures.get('goal')!.career;
    const found = new Map<string, { career: CareerState; event: LiveFeedEvent; attempt: number }[]>();
    for (let attempt = 0; attempt < 3000; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(6034500 + attempt * 104729));
      const first = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
      const second = startSecondHalf(first)!;
      for (const [cap, career] of [[45, first], [90, second]] as const) {
        const board = boardAt(career, cap);
        const feed = liveFeed(career.live!);
        const event = [...feed].reverse().find(e => e.minute === cap && (e.plus ?? 0) === board && ['goal', 'save', 'shot'].includes(e.kind));
        if (!event || !['goal', 'save'].includes(event.kind)) continue;
        if (feed.some(e => e !== event && ['goal', 'save', 'shot'].includes(e.kind) && clockPos(e) === cap + board - 2)) continue;
        const key = `${cap}:${event.kind}`;
        const list = found.get(key) ?? [];
        if (list.length >= 4) continue;
        const copy = structuredClone(career);
        copy.live!.minute = cap - 1.2;
        list.push({ career: copy, event, attempt });
        found.set(key, list);
      }
      if ([...found.values()].every(l => l.length >= 4) && found.size === 4) break;
    }
    for (const [key, list] of found) for (const f of list) {
      const cap = Number(key.split(':')[0]);
      say(`FOUND ${key} attempt ${f.attempt}: board ${boardAt(f.career, cap)}, added ${JSON.stringify(f.career.live!.added)}, et ${JSON.stringify(f.career.live!.et ?? null)}, extraDue ${cap === 90 ? isExtraTimeDue(f.career) : '-'}, event ${f.event.kind}/${f.event.side}@${f.event.minute}+${f.event.plus ?? 0} ${f.event.text ?? ''}; tail: ${tail(f.career, cap)}`);
    }
    /* sample the viewer through each of the first four 90:goal fixtures, both motion modes off the first */
    const original = window.matchMedia;
    for (const f of (found.get('90:goal') ?? [])) {
      vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: false }));
      const career = structuredClone(f.career);
      const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
      const mounted = render(<LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks} />);
      const board = boardAt(career, 90);
      const samples: string[] = [];
      let last = '';
      const total = board * 1000 + 2600;
      for (let t = 0; t < total; t += 80) {
        await step(80);
        const pitch = mounted.container.querySelector('[data-cm-live-pitch]');
        const s = `${pitch?.getAttribute('data-cm-motion') ?? 'nopitch'}/${pitch?.getAttribute('data-cm-motion-phase') ?? '-'} stage ${mounted.container.querySelector('[data-cm-live-stage]')?.getAttribute('data-cm-live-stage')} score ${mounted.container.querySelector('[data-cm-live-score]')?.textContent?.trim()} 2nd ${callbacks.onSecondHalf.mock.calls.length} et ${callbacks.onStartExtraTime.mock.calls.length}`;
        if (s !== last) { samples.push(`${t + 80}ms(${(t + 80 - board * 1000)}): ${s}`); last = s; }
      }
      say(`VIEW 90:goal attempt ${f.attempt} board ${board}: ${samples.join(' | ')}`);
      cleanup();
      vi.mocked(window.matchMedia).mockRestore?.();
    }
    void uclLegsFor;
    const outDir = process.env.RC_OUT || '.';
    fs.writeFileSync(`${outDir}/livesim-diag.txt`, OUT.join('\n') + '\n');
    console.log(OUT.join('\n'));
    expect(found.size).toBeGreaterThan(0);
  }, 600000);
});
