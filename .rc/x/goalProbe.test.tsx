// Release BV probe (never committed): the 'goal' fixture liveSimMotion's goal sequence finds, and the feed around it.
import { it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, liveFeed } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
it('probe: the goal fixture', () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(seeded(603));
  const fixtures = new Map<string, { career: CareerState; event: LiveFeedEvent; feed: LiveFeedEvent[]; attempt: number }>();
  let career = startCareer('Aston Villa');
  for (let attempt = 0; attempt < 40 && fixtures.size < 3; attempt++) {
    const next = playNextEntry(career); career = next.state;
    if (!career.live) continue;
    const feed = liveFeed(career.live);
    for (const event of feed) {
      if (!['goal', 'save', 'shot'].includes(event.kind) || event.minute < 2 || event.minute > 42 || fixtures.has(event.kind)) continue;
      if (feed.some(other => other !== event && ['goal', 'save', 'shot'].includes(other.kind) && other.minute >= event.minute && other.minute < event.minute + 1.2)) continue;
      fixtures.set(event.kind, { career, event, feed, attempt });
    }
    career = resumeMatch(career).state;
  }
  for (const [kind, f] of fixtures) {
    const e = f.event;
    console.log(`PROBE ${kind}: attempt ${f.attempt}, ${f.career.live?.opponent ?? '?'}, minute ${e.minute}${e.plus ? ` plus ${e.plus}` : ''}, side ${(e as { side?: string }).side ?? '?'}, text ${JSON.stringify(e.text)}`);
    for (const o of f.feed.filter(o => o.minute >= e.minute - 2 && o.minute <= e.minute + 1.5)) {
      console.log(`PROBE   ${o === e ? '>' : ' '} ${o.kind} ${o.minute}${o.plus ? `+${o.plus}` : ''} ${JSON.stringify(o.text).slice(0, 90)}`);
    }
  }
  vi.restoreAllMocks(); vi.useRealTimers();
});
