/**
 * Round 1218 fix: the review screen, played on REAL first halves of the engine on the shipped rates.
 *
 * What a player sees when a match goes to a video review (src/components/club-manager/LiveSimScreen.tsx,
 * "when a review opens", and ClubManagerVarReview.tsx). Every case mounts the real viewer on a half the engine
 * drew, with fake timers, and reads the screen frame by frame: nothing here types a minute, a scorer or a call.
 *
 * The halves are found by searching seeds of a fresh 2026-27 Everton career (the same career scripts/simCmVar.mjs
 * and the walk use): its opener and the two league matches after it. A review's id holds the fixture, the minute
 * and the man, so one fixture only ever reviews a handful of incidents; that is why a saved penalty is looked
 * for in another match than a scored one. Each search tries a seed known to hold the case first and then 2,500
 * more, and a case that finds nothing FAILS: it never passes on an empty search.
 *
 * The cases, each of which failed on the screen as Release AT shipped it (runner result in the audit notes):
 *   a goal a review rules out is drawn before its review, the card opens with the ball in the net at the
 *     incident's own minute, the score never moves, nobody celebrates, and the line names the man and his club;
 *   a review never opens over another action: a goal of the minute before is in, counted and its card gone;
 *   a penalty a review gives: the foul is told, the card opens at that minute, and the kick is played after it
 *     (scored: its net, its scorer card and its (P); saved: the save, and the score stays);
 *   two reviews in a half each get their card in turn, and two in back to back minutes never overlap a kick;
 *   Skip to the whistle during a review, and leaving the site mid review and coming back;
 *   reduced motion: a short wait, nothing moving, and the decision up as long as with motion;
 *   a review in the last minutes of a half opens before the whistle and its penalty is still played whole.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, liveFeed } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent, LiveMatch } from '@/lib/clubManager';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';

const FIXED_NOW = 1791547200000;
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date(FIXED_NOW));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); Math.random = realRandom; });

/* ---- the halves ---- */
const place = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
const isChance = (e: LiveFeedEvent) => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
const reviewsOf = (feed: LiveFeedEvent[]) => feed.filter(e => e.kind === 'var' && e.review);
const entries: CareerState[] = [];
/** The fresh Everton career before its k-th league match (0 is the opener). */
function entry(k: number): CareerState {
  if (!entries.length) {
    const first = seeded(4107, () => startCareer('Everton'));
    delete (first as { realLeagueFixtures?: unknown }).realLeagueFixtures;
    first.squad = first.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
    entries.push(first);
  }
  while (entries.length <= k) {
    const n = entries.length - 1;
    entries.push(seeded(5000 + n, () => playNextEntry(entries[n], { skipHalftime: true, noCoach: true })).state);
  }
  return entries[k];
}
type Half = { career: CareerState; review: LiveFeedEvent; feed: LiveFeedEvent[]; live: LiveMatch; whistle: number; seed: number };
function half(k: number, hint: number, want: (feed: LiveFeedEvent[], live: LiveMatch) => LiveFeedEvent | null | undefined): Half {
  const pre = entry(k);
  for (const seed of [hint, ...Array.from({ length: 2500 }, (_, i) => 1700 + i)]) {
    const res = seeded(seed, () => playNextEntry(pre, { varReviews: true }));
    if (res.kind !== 'halftime' || !res.state.live || res.state.live.varReviews !== true) continue;
    const feed = liveFeed(res.state.live);
    const review = want(feed, res.state.live);
    if (review) return { career: structuredClone(res.state), review, feed, live: res.state.live, whistle: 45 + (res.state.live.added?.h1 ?? 0), seed };
  }
  throw new Error(`no first half of league match ${k + 1} holds the review this case is about`);
}
/** The kick a review's penalty was taken with, off the committed play. */
const kickOf = (live: LiveMatch, v: LiveFeedEvent) => (live.h1Play ?? []).find(p => p.kind === 'shot' && p.review?.id === v.review!.id);
/** A review with nothing else near it: no other chance within two minutes, no other review within three. */
function alone(v: LiveFeedEvent, feed: LiveFeedEvent[]): boolean {
  const own = (e: LiveFeedEvent) => v.review!.decision === 'awarded' && e.minute === v.minute && e.side === v.side && e.text === v.text;
  return v.minute >= 4 && v.minute <= 38 && !v.plus
    && !feed.some(e => e !== v && isChance(e) && !own(e) && e.minute >= v.minute - 2 && e.minute <= v.minute + 2)
    && !reviewsOf(feed).some(o => o !== v && Math.abs(o.minute - v.minute) <= 3);
}
const ruledOutAlone = (feed: LiveFeedEvent[]) => reviewsOf(feed).find(v => v.review!.decision === 'disallowed' && v.side === 'me' && alone(v, feed));
const awardedAlone = (how: 'scored' | 'saved') => (feed: LiveFeedEvent[], live: LiveMatch) => reviewsOf(feed).find(v => {
  const kick = kickOf(live, v);
  return v.review!.decision === 'awarded' && alone(v, feed) && !!kick && (how === 'scored' ? !!kick.goal : !kick.goal && !!kick.on);
});

/* ---- the screen, frame by frame ---- */
type Frame = {
  ms: number; stage: string; minute: number; score: string; motion: string | null; phase: string | null; net: boolean; ball: string | null;
  card: string | null; cardId: string | null; cardText: string; goalCard: string | null; celebrating: boolean; text: string;
};
function snap(c: HTMLElement, ms: number): Frame {
  const root = c.querySelector('[data-cm-live-stage]')!;
  const pitch = c.querySelector('[data-cm-live-pitch]');
  const card = c.querySelector('[data-cm-var]');
  return {
    ms, stage: root.getAttribute('data-cm-live-stage')!, minute: Number(root.getAttribute('data-cm-live-minute')),
    score: c.querySelector('[data-cm-live-score]')!.textContent!.trim(),
    motion: pitch?.getAttribute('data-cm-motion') ?? null, phase: pitch?.getAttribute('data-cm-motion-phase') ?? null,
    net: !!c.querySelector('[data-cm-net="goal"]'), ball: c.querySelector('[data-cm-ball]')?.getAttribute('style') ?? null,
    card: card?.getAttribute('data-cm-var') ?? null, cardId: card?.getAttribute('data-cm-var-id') ?? null, cardText: card?.textContent ?? '',
    goalCard: c.querySelector('[data-cm-goal-card]')?.textContent ?? null,
    celebrating: !!c.querySelector('[data-cm-actor-pose="celebrate"]'), text: c.textContent ?? '',
  };
}
function mount(career: CareerState) {
  const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
  return { ...render(<LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks} />), callbacks };
}
/** The half opened with its clock at `clock`, the way a saved match reopens. */
function openAt(h: Half, clock: number) {
  const career = structuredClone(h.career);
  career.live!.minute = clock;
  return mount(career);
}
/** Run the match for up to maxMs of real time, a frame of the screen read every `every` ticks of 16 ms. */
async function run(mounted: ReturnType<typeof mount>, maxMs: number, stop?: (frames: Frame[]) => boolean, every = 1, from: Frame[] = []): Promise<Frame[]> {
  const frames = from.length ? from : [snap(mounted.container, 0)];
  const start = frames[frames.length - 1].ms;
  for (let ms = 16, n = 1; ms <= maxMs; ms += 16, n++) {
    await act(async () => { vi.advanceTimersByTime(16); });
    if (n % every) continue;
    frames.push(snap(mounted.container, start + ms));
    if (stop?.(frames)) break;
  }
  return frames;
}
const cardUp = (f: Frame) => f.card !== null;
/** Stops a run `ms` after the card with this review has come and gone. */
const closedFor = (id: string, ms: number) => (frames: Frame[]) => {
  const last = frames.map(f => f.cardId).lastIndexOf(id);
  return last >= 0 && frames.length - 1 > last && frames[frames.length - 1].ms - frames[last].ms >= ms;
};
const scoreBy = (feed: LiveFeedEvent[], pos: number) => ['me', 'opp'].map(side => feed.filter(e => e.kind === 'goal' && e.side === side && place(e) <= pos).length).join(' - ');
const clubOf = (h: Half, v: LiveFeedEvent) => (v.side === 'me' ? h.career.clubName : h.live.opponent);

describe('Club Manager: the review screen', () => {
  it('a goal a review rules out is drawn first, and its review opens with the ball in the net', async () => {
    const h = half(0, 2460, ruledOutAlone);
    const v = h.review, id = v.review!.id, before = scoreBy(h.feed, place(v));
    expect(scoreBy(h.feed, place(v) - 1)).toBe(before);
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 9000, closedFor(id, 700));
    const first = frames.findIndex(cardUp), last = frames.map(cardUp).lastIndexOf(true);
    expect(first, 'the review never opened').toBeGreaterThan(0);
    /* Before the card: the goal is played out, the ball flies and lands in the net. */
    const lead = frames.slice(0, first);
    expect(lead.some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    /* The card opens at the incident's own minute, on the ball in the net, and names the man and his club. */
    expect(frames[first].minute).toBe(v.minute);
    expect(frames[first].card).toBe('checking');
    expect(frames[first].motion).toBe('goal');
    expect(frames[first].phase).toBe('net');
    expect(frames[first].net).toBe(true);
    expect(frames[first].cardText).toContain('VAR: checking the goal');
    expect(frames[first].cardText).toContain(`${v.text}, ${clubOf(h, v)}, ${v.minute}'`);
    expect(frames[last].card).toBe('decided');
    expect(frames[last].cardText).toContain('VAR: goal ruled out');
    expect(frames[last].cardText).toContain('No goal.');
    /* The score never moves and no goal card ever rises. */
    expect(new Set(frames.map(f => f.score))).toEqual(new Set([before]));
    expect(frames.some(f => f.goalCard !== null)).toBe(false);
    /* After the card the action is over (nobody goes on celebrating a goal that does not count), and the line
       says whose goal it was. */
    const after = frames.slice(last + 1);
    expect(after.length).toBeGreaterThan(5);
    expect(after.every(f => f.motion === 'pass'), 'the ruled out goal went on playing after its review').toBe(true);
    expect(after.some(f => f.celebrating) || lead.some(f => f.celebrating)).toBe(false);
    expect(after[after.length - 1].text).toContain(`VAR: goal ruled out: ${v.text} (${clubOf(h, v)})`);
  }, 120000);

  it.each([
    { call: 'disallowed', match: 1, hint: 1724 },
    { call: 'awarded', match: 2, hint: 1894 },
  ])('a review never opens over another action: the goal of the minute before is in and counted first ($call)', async ({ call, match, hint }) => {
    const h = half(match, hint, feed => {
      const all = reviewsOf(feed);
      return all.length === 1 && all[0].review!.decision === call && all[0].minute >= 4 && all[0].minute <= 40 && !all[0].plus && feed.some(e => e.kind === 'goal' && place(e) === place(all[0]) - 1) ? all[0] : null;
    });
    const v = h.review, id = v.review!.id;
    const withGoal = scoreBy(h.feed, place(v) - 1), withoutIt = scoreBy(h.feed, place(v) - 2);
    expect(withGoal).not.toBe(withoutIt);
    const mounted = openAt(h, v.minute - 1.5);
    const frames = await run(mounted, 14000, closedFor(id, 500));
    const first = frames.findIndex(cardUp);
    expect(first, 'the review never opened').toBeGreaterThan(0);
    /* The real goal was seen whole before the card: its own card rose and went. */
    const goalCards = frames.map((f, i) => (f.goalCard !== null ? i : -1)).filter(i => i >= 0);
    expect(goalCards.length, 'the goal of the minute before never got its card').toBeGreaterThan(0);
    expect(Math.max(...goalCards)).toBeLessThan(first);
    for (const f of frames.filter(cardUp)) {
      /* While a review card is up: the earlier goal is on the score, no goal card is under it, and the only
         action on the pitch is the reviewed goal itself, stopped in the net. */
      expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(withGoal);
      expect(f.goalCard, `a goal card under the review card at ${f.ms} ms`).toBeNull();
      expect(f.motion === 'pass' || (v.review!.decision === 'disallowed' && f.motion === 'goal' && f.phase === 'net'), `an action in flight under the review card at ${f.ms} ms: ${f.motion} ${f.phase}`).toBe(true);
    }
  }, 120000);

  it('a penalty a review gives: the foul is told, the card opens at its minute, and the kick is played after it', async () => {
    const h = half(0, 1735, awardedAlone('scored'));
    const v = h.review, id = v.review!.id, before = scoreBy(h.feed, place(v) - 1), scored = scoreBy(h.feed, place(v));
    expect(scored).not.toBe(before);
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 14000, closedFor(id, 3400));
    const first = frames.findIndex(cardUp), last = frames.map(cardUp).lastIndexOf(true);
    expect(first, 'the review never opened').toBeGreaterThan(0);
    expect(frames[first].minute).toBe(v.minute);
    expect(frames[first].motion).toBe('pass');
    expect(frames[first].cardText).toContain('VAR: checking for a penalty');
    expect(frames[first].cardText).toContain(`${v.text}, ${clubOf(h, v)}, ${v.minute}'`);
    expect(frames[first].text, 'the foul was not told before its review').toContain(`Foul by ${v.review!.trigger!.who}`);
    expect(frames[last].cardText).toContain('VAR: penalty awarded');
    expect(frames[last].cardText).toContain(`Penalty to ${clubOf(h, v)}.`);
    /* Nothing of the kick before the review is over: not the score, not a card, not the ball. */
    for (const f of frames.slice(0, last + 1)) { expect(f.score).toBe(before); expect(f.goalCard).toBeNull(); expect(f.motion).toBe('pass'); }
    /* Then the kick, whole: the run up, the ball in the net, the score, and the scorer's card with its (P). */
    const after = frames.slice(last + 1);
    expect(after.some(f => f.motion === 'goal' && f.phase === 'flight'), 'the kick was not played out').toBe(true);
    expect(after.some(f => f.motion === 'goal' && f.phase === 'net' && f.net)).toBe(true);
    const card = after.find(f => f.goalCard !== null);
    expect(card, 'the penalty goal got no scorer card').toBeTruthy();
    expect(card!.goalCard).toContain(v.text);
    expect(card!.goalCard).toContain('(P)');
    expect(after.filter(f => f.goalCard !== null).every(f => f.score === scored)).toBe(true);
    expect(after[after.length - 1].score).toBe(scored);
  }, 120000);

  it('a penalty a review gives that is saved: the save is drawn after the card and the score stays', async () => {
    const h = half(2, 2193, awardedAlone('saved'));
    const v = h.review, id = v.review!.id, before = scoreBy(h.feed, place(v) - 1);
    expect(scoreBy(h.feed, place(v))).toBe(before);
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 12000, closedFor(id, 2000));
    const last = frames.map(cardUp).lastIndexOf(true);
    expect(last, 'the review never opened').toBeGreaterThan(0);
    expect(frames[last].cardText).toContain('VAR: penalty awarded');
    expect(frames.slice(0, last + 1).every(f => f.motion === 'pass')).toBe(true);
    const after = frames.slice(last + 1);
    expect(after.some(f => f.motion === 'save' && f.phase === 'caught'), 'the saved kick was not played out').toBe(true);
    expect(after[after.length - 1].text).toContain('Penalty saved!');
    expect(new Set(frames.map(f => f.score))).toEqual(new Set([before]));
    expect(frames.some(f => f.goalCard !== null)).toBe(false);
  }, 120000);

  /** While a review card is up nothing else is: no goal card, and no action but a ruled out goal stopped in its net. */
  function nothingUnder(frames: Frame[], ruledOut: Set<string>) {
    for (const f of frames.filter(cardUp)) {
      expect(f.goalCard, `a goal card under the review card at ${f.ms} ms`).toBeNull();
      expect(f.motion === 'pass' || (ruledOut.has(f.cardId!) && f.motion === 'goal' && f.phase === 'net'), `an action in flight under the review card at ${f.ms} ms: ${f.motion} ${f.phase}`).toBe(true);
    }
  }
  const order = (frames: Frame[]) => frames.map(f => f.cardId).filter((id, i, all): id is string => id !== null && id !== all[i - 1]);
  const ruledOutIds = (feed: LiveFeedEvent[]) => new Set(reviewsOf(feed).filter(r => r.review!.decision === 'disallowed').map(r => r.review!.id));

  it('two reviews in one half each get their own card, in turn', async () => {
    const h = half(0, 2453, feed => {
      const all = reviewsOf(feed);
      return all.length === 2 && all.every(r => r.minute >= 4 && r.minute <= 40 && !r.plus) && Math.abs(all[0].minute - all[1].minute) >= 4 ? all[0] : null;
    });
    const [a, b] = reviewsOf(h.feed).sort((x, y) => place(x) - place(y));
    const mounted = openAt(h, a.minute - 1);
    const frames = await run(mounted, (b.minute - a.minute + 12) * 1000 + 14000, closedFor(b.review!.id, 300), 3);
    expect(order(frames)).toEqual([a.review!.id, b.review!.id]);
    nothingUnder(frames, ruledOutIds(h.feed));
  }, 240000);

  it('Skip to the whistle during a review takes the card away and leaves the half as the engine has it', async () => {
    const h = half(0, 2460, ruledOutAlone);
    const mounted = openAt(h, h.review.minute - 1);
    const frames = await run(mounted, 9000, fs => cardUp(fs[fs.length - 1]));
    expect(cardUp(frames[frames.length - 1]), 'the review never opened').toBe(true);
    const skip = Array.from(mounted.container.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Skip');
    expect(skip, 'no Skip button').toBeTruthy();
    await act(async () => { fireEvent.click(skip!); });
    const after = await run(mounted, 400);
    expect(after.some(cardUp)).toBe(false);
    expect(after[after.length - 1].stage).toBe('interval');
    expect(after[after.length - 1].score).toBe(scoreBy(h.feed, h.whistle));
    expect(mounted.callbacks.onMark.mock.calls).toEqual([[45]]);
  }, 120000);

  it('leaving the site in the middle of a review and coming back shows the review again, then its penalty', async () => {
    const h = half(0, 1735, awardedAlone('scored'));
    const v = h.review, id = v.review!.id;
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 9000, fs => cardUp(fs[fs.length - 1]));
    expect(cardUp(frames[frames.length - 1]), 'the review never opened').toBe(true);
    mounted.unmount();
    /* The save is told the minute the review stands at, which is the incident's own. */
    expect(mounted.callbacks.onMark.mock.calls.at(-1)).toEqual([v.minute]);
    const back = openAt(h, v.minute);
    const again = await run(back, 14000, closedFor(id, 3400));
    expect(order(again)).toEqual([id]);
    expect(again[0].score).toBe(scoreBy(h.feed, place(v) - 1));
    expect(again[again.length - 1].score).toBe(scoreBy(h.feed, place(v)));
    nothingUnder(again, new Set());
  }, 120000);

  it('reduced motion: a short wait, nothing moves under the card, and the decision stays up as long as with motion', async () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
    const h = half(0, 2460, ruledOutAlone);
    const id = h.review.review!.id;
    const mounted = openAt(h, h.review.minute - 0.5);
    const frames = await run(mounted, 7000, closedFor(id, 200));
    const up = frames.filter(cardUp);
    expect(up.length, 'the review never opened').toBeGreaterThan(0);
    const checking = up.filter(f => f.card === 'checking'), decided = up.filter(f => f.card === 'decided');
    const span = (fs: Frame[]) => fs[fs.length - 1].ms - fs[0].ms + 16;
    expect(span(checking)).toBeGreaterThanOrEqual(250);
    expect(span(checking)).toBeLessThanOrEqual(400);
    expect(span(decided), 'the decision is not up as long as it is with motion (1.2 s)').toBeGreaterThanOrEqual(1150);
    expect(span(decided)).toBeLessThanOrEqual(1300);
    expect(new Set(up.map(f => f.ball)).size, 'the ball moved under the card').toBe(1);
    expect(new Set(up.map(f => f.phase))).toEqual(new Set(['net']));
    expect(new Set(frames.map(f => f.score)).size).toBe(1);
  }, 120000);

  /* The last minutes of a half. A saved clock stands at 45 at most (the board is played again from there), so
     these open a little before 45 and run through the board to the whistle. */
  const lastMinutes = (call: 'awarded' | 'disallowed', quietEnd: boolean) => (feed: LiveFeedEvent[], live: LiveMatch) => {
    const all = reviewsOf(feed), whistle = 45 + (live.added?.h1 ?? 0), r = all[0];
    if (all.length !== 1 || r.review!.decision !== call || place(r) < whistle - 1) return null;
    if (call === 'awarded' && !kickOf(live, r)?.goal) return null;
    const quiet = !feed.some(e => isChance(e) && place(e) >= whistle - 3 && !(e.side === r.side && place(e) === place(r) && e.text === r.text));
    return quiet === quietEnd ? r : null;
  };
  async function toTheWhistle(h: Half) {
    const mounted = openAt(h, 44.2);
    const frames = await run(mounted, 22000, fs => fs[fs.length - 1].stage === 'interval');
    const last = frames.map(cardUp).lastIndexOf(true), whistle = frames.findIndex(f => f.stage === 'interval');
    expect(order(frames), 'the review was not shown exactly once').toEqual([h.review.review!.id]);
    expect(whistle, 'the half never ended, or ended under the review card').toBeGreaterThan(last);
    expect(frames[whistle].score).toBe(scoreBy(h.feed, h.whistle));
    expect(mounted.callbacks.onMark.mock.calls).toEqual([[45]]);
    return { frames, last, whistle };
  }

  it('a penalty a review gives in the last minute of a half is still played before the whistle', async () => {
    const { frames, last, whistle } = await toTheWhistle(half(1, 2340, lastMinutes('awarded', true)));
    nothingUnder(frames, new Set());
    expect(frames[last].cardText).toContain('VAR: penalty awarded');
    expect(frames.slice(last + 1, whistle).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the kick was not played out before the whistle').toBe(true);
    expect(frames.slice(last + 1, whistle).some(f => f.motion === 'goal' && f.phase === 'net'), 'the ball was not in before the whistle').toBe(true);
  }, 120000);

  it('a goal ruled out at the whistle: its review opens and closes before the half ends', async () => {
    const { frames, last } = await toTheWhistle(half(1, 1984, lastMinutes('disallowed', true)));
    nothingUnder(frames, new Set());
    expect(frames[last].cardText).toContain('VAR: goal ruled out');
  }, 120000);

  it('a review at the very end of a crowded half is still shown once, and the half ends on the engine score', async () => {
    await toTheWhistle(half(0, 2483, lastMinutes('awarded', false)));
  }, 120000);
});
