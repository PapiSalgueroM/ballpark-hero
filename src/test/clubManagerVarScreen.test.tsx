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
 *
 * Round 1302 added, each on a real half a scan on a runner found (result r1302-scan and r1302-scan4):
 *   the case the reviewer saw on seed 2042 (my goal at 44, theirs ruled out at 45), kept as its own case: it fails
 *     on the screen Release AT shipped with "the review opened before its own minute: expected 44";
 *   a goal ruled out at the whistle or one clock place before it is DRAWN before its card (it was a card on its
 *     own until this round), with motion and with reduced motion, and the card opens at the minute it prints;
 *   an own goal the minute after a ruled out goal; a review in the same minute as the other side's injury, red
 *     card and (in a second half) substitution; a review in extra time (a Champions League knockout night).
 * The fix of Round 1302 (after its two reviews) added THE STOPPAGE and its cases: a ruled out goal the plan has no
 * room for (a real chance has its clock place, or it falls in the last two places of a period) is played with the
 * clock stopped, right before its card. So every ruled out goal is drawn, and `nothingUnder` now asks for exactly
 * that under its card: the ball in the net THAT goal went into. Five shapes of a half whose end real chances fill
 * are played on the halves the review found them on (league match 2, seeds 42322, 6203, 4670, 2219 and 1987).
 * The engine does not hold two reviews in one minute or in back to back minutes (none in 7,500 first and 7,500
 * second halves). Two in one minute is on the lead's list all the same, so ONE case is staged by hand and says so:
 * a real ruled out goal's review copied onto the other side in the same minute. Every other case is a half the
 * engine drew, untouched.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, liveFeed, startSecondHalf, startExtraTime } from '@/lib/clubManager';
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
const kickOf = (live: LiveMatch, v: LiveFeedEvent) => [...(live.h1Play ?? []), ...(live.h2Play ?? [])].find(p => p.kind === 'shot' && p.review?.id === v.review!.id);
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
  ms: number; stage: string; minute: number; plus: number; score: string; motion: string | null; phase: string | null; net: boolean; ball: string | null;
  /** Which goal the ball is in: 'top' is the opposition's net (the one I attack), 'bottom' is mine. */
  netAt: 'top' | 'bottom' | null;
  card: string | null; cardId: string | null; cardText: string; goalCard: string | null; celebrating: boolean; text: string;
  /** The small line under the pitch (chances, saves, corners, throw ins, fouls). */
  line: string;
};
function snap(c: HTMLElement, ms: number): Frame {
  const root = c.querySelector('[data-cm-live-stage]')!;
  const pitch = c.querySelector('[data-cm-live-pitch]');
  const card = c.querySelector('[data-cm-var]');
  return {
    ms, stage: root.getAttribute('data-cm-live-stage')!, minute: Number(root.getAttribute('data-cm-live-minute')), plus: Number(root.getAttribute('data-cm-live-plus') ?? 0),
    score: c.querySelector('[data-cm-live-score]')!.textContent!.trim(),
    motion: pitch?.getAttribute('data-cm-motion') ?? null, phase: pitch?.getAttribute('data-cm-motion-phase') ?? null,
    net: !!c.querySelector('[data-cm-net="goal"]'), ball: c.querySelector('[data-cm-ball]')?.getAttribute('style') ?? null,
    netAt: c.querySelector('.cm-live-net--top[data-cm-net="goal"]') ? 'top' : c.querySelector('.cm-live-net--bottom[data-cm-net="goal"]') ? 'bottom' : null,
    card: card?.getAttribute('data-cm-var') ?? null, cardId: card?.getAttribute('data-cm-var-id') ?? null, cardText: card?.textContent ?? '',
    goalCard: c.querySelector('[data-cm-goal-card]')?.textContent ?? null,
    celebrating: !!c.querySelector('[data-cm-actor-pose="celebrate"]'), text: c.textContent ?? '',
    line: c.querySelector('[data-cm-live-event]')?.textContent ?? '',
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
/** The net each ruled out goal went into, by its review: a goal of mine goes in the top net, one of theirs in the bottom one. */
const ruledOutIds = (feed: LiveFeedEvent[]) => new Map(reviewsOf(feed).filter(r => r.review!.decision === 'disallowed').map(r => [r.review!.id, r.side === 'me' ? 'top' : 'bottom'] as const));
/**
 * While a review card is up nothing else is. No goal card. Under the card of a ruled out goal the pitch shows that
 * goal and nothing else: its ball stopped in the net it went into. Every ruled out goal is drawn before its card
 * (Round 1302: on the clock where the plan has room, with the clock stopped where it has none), so a quiet pitch
 * under such a card is a goal that was not drawn, and a ball in the OTHER net is somebody's real goal with a card
 * that says "goal ruled out" on top of it (the review of Round 1302 saw exactly that on league match 2, seed 42322,
 * and the rule as it was, "a goal stopped in a net", could not tell the two apart). Under any other card (a
 * penalty a review gives) there is no action at all.
 * Round 1302 fix 2: and the small line under the pitch says nothing under the card of a ruled out goal. It used to
 * keep the last thing told ("Throw in, Aston Villa" under a goal and a card that rules it out, in the lit walk's
 * pictures). A real goal has cleared that line while it plays since Round 1101.
 */
function nothingUnder(frames: Frame[], nets: Map<string, 'top' | 'bottom'>) {
  for (const f of frames.filter(cardUp)) {
    expect(f.goalCard, `a goal card under the review card at ${f.ms} ms`).toBeNull();
    const own = nets.get(f.cardId!);
    if (own) {
      expect(`${f.motion}/${f.phase} in the ${f.netAt} net`, `what the pitch shows under the card of a ruled out goal at ${f.ms} ms`).toBe(`goal/net in the ${own} net`);
      expect(f.line, `the line under the pitch under the card of a ruled out goal at ${f.ms} ms`).toBe('');
    } else expect(`${f.motion}/${f.phase}`, `an action under the review card at ${f.ms} ms`).toBe('pass/pass');
  }
}
/** Each review's id in the order its card came up. */
const order = (frames: Frame[]) => frames.map(f => f.cardId).filter((id, i, all): id is string => id !== null && id !== all[i - 1]);
/** The actions the pitch played, in order: each starts with its man planting his foot. */
function actionRuns(frames: Frame[]): { kind: string; from: number }[] {
  const runs: { kind: string; from: number }[] = [];
  frames.forEach((f, i) => {
    if (f.phase === 'plant' && f.motion && (i === 0 || frames[i - 1].phase !== 'plant' || frames[i - 1].motion !== f.motion)) runs.push({ kind: f.motion, from: i });
  });
  return runs;
}

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
    /* Round 1302 fix 2: the line under the pitch says nothing from the goal's first frame until its card is gone
       (it kept the last small line told before the goal), and then it says the ruling. */
    const struck = frames.findIndex(f => f.motion === 'goal');
    expect(struck, 'the ruled out goal never started').toBeGreaterThan(0);
    expect([...new Set(frames.slice(struck, last + 1).map(f => f.line))], 'the line under the pitch while the ruled out goal was played and reviewed').toEqual(['']);
    expect(after.some(f => f.line === `VAR: goal ruled out: ${v.text} (${clubOf(h, v)})`), 'the line under the pitch never said the ruling').toBe(true);
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
    /* While a review card is up: the earlier goal is on the score, no goal card is under it, and the only
       action on the pitch is the reviewed goal itself, stopped in its own net. */
    for (const f of frames.filter(cardUp)) expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(withGoal);
    nothingUnder(frames, ruledOutIds(h.feed));
  }, 120000);

  /* Round 1302. THE ONE THE REVIEWER SAW (review-run of Round 1218, seed 2042 of the opener): my goal at 44', a
     goal of theirs ruled out at 45'. On the screen as it was, the 45' card opened at "LIVE 44'" with my goal still
     in the air and the score at 0-0, read "goal ruled out", and then my goal counted. Kept here as its own case,
     played from before my goal to the whistle. The search asks for that shape (seed 2042 is tried first). */
  it('the last minute of a half, a goal of mine at 44 and theirs ruled out at 45: the card never sits on my goal', async () => {
    const h = half(0, 2042, feed => {
      const all = reviewsOf(feed), r = all[0];
      return all.length === 1 && r.review!.decision === 'disallowed' && r.side === 'opp' && r.minute === 45 && !r.plus
        && feed.some(e => e.kind === 'goal' && e.side === 'me' && place(e) === 44) ? r : null;
    });
    const v = h.review, id = v.review!.id;
    const withMine = scoreBy(h.feed, 44), before = scoreBy(h.feed, 43);
    expect(withMine).not.toBe(before);
    expect(scoreBy(h.feed, 45), 'the ruled out goal is on the engine score').toBe(withMine);
    const mounted = openAt(h, 43.2);
    const frames = await run(mounted, 26000, fs => fs[fs.length - 1].stage === 'interval');
    const first = frames.findIndex(cardUp), whistle = frames.findIndex(f => f.stage === 'interval');
    expect(first, 'the review never opened').toBeGreaterThan(0);
    expect(order(frames), 'the review was not shown exactly once').toEqual([id]);
    /* My goal was seen whole before the review: its card rose and went, and the score had moved. */
    expect(frames.slice(0, first).some(f => f.goalCard !== null && f.score === withMine), 'my goal of the minute before never got its card').toBe(true);
    expect(frames[first].minute, 'the review opened before its own minute').toBeGreaterThanOrEqual(45);
    for (const f of frames.filter(cardUp)) {
      expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(withMine);
      expect(f.cardText).toContain(`${v.text}, ${h.live.opponent}, 45'`);
    }
    /* Under the card: their ruled out goal in MY net, never my real goal of the minute before in theirs. */
    nothingUnder(frames, ruledOutIds(h.feed));
    /* Their goal was drawn before its card (the ball went in), and the half ends on the engine score. */
    expect(frames.slice(0, first).some(f => f.motion === 'goal' && f.phase === 'flight' && f.goalCard === null && f.score === withMine), 'the ruled out goal was not drawn before its review').toBe(true);
    expect(whistle, 'the half never ended, or ended under the review card').toBeGreaterThan(frames.map(cardUp).lastIndexOf(true));
    expect(frames[whistle].score).toBe(scoreBy(h.feed, h.whistle));
    console.info(`clubManagerVarScreen: the 44 and 45 case was found on seed ${h.seed}, whistle ${h.whistle}`);
  }, 180000);

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

  /* Round 1302 fix. THE ONE CASE STAGED BY HAND. The engine holds no two reviews in one minute (none in 15,000
     halves searched), and the lead's list asks for it, so this takes a real half with one goal of mine ruled out
     and copies that review onto the other side in the same minute, by one of their men on the pitch. Nothing else
     is typed. The plan has room for one action at that place, so one of the two goals is played on the clock and
     the other with the clock stopped: each is drawn before its own card, the cards come one after the other,
     each on its own goal in its own net, and the score never moves. */
  it('two goals ruled out in one minute (staged by hand): each is drawn before its own card, one card at a time', async () => {
    const h = half(0, 2460, ruledOutAlone);
    const v = h.review, id = v.review!.id, second = `${id}:staged`;
    const career = structuredClone(h.career), play = career.live!.h1Play!;
    const at = play.findIndex(p => p.review?.id === id);
    const theirs = (career.live!.oppXi ?? []).find(p => p.p !== 'GK');
    expect(at, 'the ruled out goal has no line in the committed play').toBeGreaterThanOrEqual(0);
    expect(theirs, 'the opposition has nobody on the pitch to give the staged goal to').toBeTruthy();
    play.splice(at + 1, 0, { ...play[at], side: 'opp', who: theirs!.n, review: { ...play[at].review!, id: second } });
    const feed = liveFeed(career.live!), before = scoreBy(feed, place(v));
    expect(reviewsOf(feed).filter(r => place(r) === place(v)).map(r => r.review!.id)).toEqual([id, second]);
    const mounted = openAt({ ...h, career }, v.minute - 1);
    const frames = await run(mounted, 20000, closedFor(second, 700));
    expect(order(frames), 'the two reviews did not each get their card, one after the other').toEqual([id, second]);
    nothingUnder(frames, ruledOutIds(feed));
    /* Each goal is drawn before its own card: a flight before the first, and another between the two cards. */
    const firstUp = frames.findIndex(f => f.cardId === id), firstDown = frames.map(f => f.cardId).lastIndexOf(id), secondUp = frames.findIndex(f => f.cardId === second);
    expect(frames.slice(0, firstUp).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the first ruled out goal was not drawn before its review').toBe(true);
    expect(frames.slice(firstDown + 1, secondUp).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the second ruled out goal was not drawn before its review').toBe(true);
    expect(new Set(frames.map(f => f.score)), 'the score moved with a ruled out goal').toEqual(new Set([before]));
    expect(frames.some(f => f.goalCard !== null)).toBe(false);
    const end = frames[frames.length - 1].text;
    expect(end).toContain(`VAR: goal ruled out: ${v.text} (${h.career.clubName})`);
    expect(end).toContain(`VAR: goal ruled out: ${theirs!.n}`);
  }, 180000);

  /* Round 1302 fix 2. THE SECOND CASE STAGED BY HAND, the last of the lead's list nobody had played: two reviews in
     back to back minutes (the engine holds none in 15,000 halves either). The same real half and the same copy of
     its real review onto one of their men, ONE MINUTE LATER. Nothing else is typed. Each goal has a clock place to
     itself, so both are played on the clock: each before its own card, each card on its own goal in its own net
     and not before the minute it prints, the second goal not started while the first card is up, and the score
     never moving. */
  it('two goals ruled out in back to back minutes (staged by hand): each card on its own goal, the second not before its minute', async () => {
    const h = half(0, 2460, ruledOutAlone);
    const v = h.review, id = v.review!.id, second = `${id}:staged`;
    const career = structuredClone(h.career), play = career.live!.h1Play!;
    const at = play.findIndex(p => p.review?.id === id);
    const theirs = (career.live!.oppXi ?? []).find(p => p.p !== 'GK');
    expect(at, 'the ruled out goal has no line in the committed play').toBeGreaterThanOrEqual(0);
    expect(theirs, 'the opposition has nobody on the pitch to give the staged goal to').toBeTruthy();
    play.splice(at + 1, 0, { ...play[at], minute: play[at].minute + 1, side: 'opp', who: theirs!.n, review: { ...play[at].review!, id: second } });
    const feed = liveFeed(career.live!), before = scoreBy(feed, place(v) + 1);
    expect(reviewsOf(feed).filter(r => place(r) >= place(v) && place(r) <= place(v) + 1).map(r => `${place(r)} ${r.review!.id}`)).toEqual([`${place(v)} ${id}`, `${place(v) + 1} ${second}`]);
    const mounted = openAt({ ...h, career }, v.minute - 1);
    const frames = await run(mounted, 24000, closedFor(second, 700));
    const ids = frames.map(f => f.cardId), firstUp = ids.indexOf(id), firstDown = ids.lastIndexOf(id), secondUp = ids.indexOf(second);
    const goals = actionRuns(frames).filter(r => r.kind === 'goal');
    console.info(`clubManagerVarScreen: back to back (staged by hand) on seed ${h.seed}: reviews at ${place(v)} and ${place(v) + 1}, cards at ${firstUp >= 0 ? frames[firstUp].minute : 'never'} and ${secondUp >= 0 ? frames[secondUp].minute : 'never'}, ${goals.length} goal(s) played, starting at ${goals.map(g => `${frames[g.from].ms} ms (minute ${frames[g.from].minute})`).join(' and ')}, first card up from ${firstUp >= 0 ? frames[firstUp].ms : '-'} to ${firstDown >= 0 ? frames[firstDown].ms : '-'} ms`);
    expect(order(frames), 'the two reviews did not each get their card, one after the other').toEqual([id, second]);
    nothingUnder(frames, ruledOutIds(feed));
    /* Each card not before the minute it prints (the first at its minute to the place, as on the half untouched). */
    expect(frames[firstUp].minute, 'the first card is not at the minute it prints').toBe(v.minute);
    expect(frames[secondUp].minute, 'the second review opened before its own minute').toBeGreaterThanOrEqual(v.minute + 1);
    /* Two goals played, one before each card, and nothing of the second while the first card is up. */
    const flight = (f: Frame) => f.motion === 'goal' && f.phase === 'flight';
    expect(goals.length, 'the two ruled out goals were not each played once').toBe(2);
    expect(goals[0].from).toBeLessThan(firstUp);
    expect(goals[1].from, 'the second ruled out goal started under the first card').toBeGreaterThan(firstDown);
    expect(frames.slice(0, firstUp).some(flight), 'the first ruled out goal was not drawn before its review').toBe(true);
    expect(frames.slice(firstDown + 1, secondUp).some(flight), 'the second ruled out goal was not drawn before its review').toBe(true);
    expect(new Set(frames.map(f => f.score)), 'the score moved with a ruled out goal').toEqual(new Set([before]));
    expect(frames.some(f => f.goalCard !== null)).toBe(false);
    const end = frames[frames.length - 1].text;
    expect(end).toContain(`VAR: goal ruled out: ${v.text} (${h.career.clubName})`);
    expect(end).toContain(`VAR: goal ruled out: ${theirs!.n}`);
  }, 180000);

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
    nothingUnder(again, new Map());
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
  async function toTheWhistle(h: Half, maxMs = 22000) {
    const mounted = openAt(h, 44.2);
    const frames = await run(mounted, maxMs, fs => fs[fs.length - 1].stage === 'interval');
    const last = frames.map(cardUp).lastIndexOf(true), whistle = frames.findIndex(f => f.stage === 'interval');
    expect(order(frames), 'the review was not shown exactly once').toEqual([h.review.review!.id]);
    expect(whistle, 'the half never ended, or ended under the review card').toBeGreaterThan(last);
    expect(frames[whistle].score).toBe(scoreBy(h.feed, h.whistle));
    expect(mounted.callbacks.onMark.mock.calls).toEqual([[45]]);
    return { frames, last, whistle };
  }

  it('a penalty a review gives in the last minute of a half is still played before the whistle', async () => {
    const { frames, last, whistle } = await toTheWhistle(half(1, 2340, lastMinutes('awarded', true)));
    nothingUnder(frames, new Map());
    expect(frames[last].cardText).toContain('VAR: penalty awarded');
    expect(frames.slice(last + 1, whistle).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the kick was not played out before the whistle').toBe(true);
    expect(frames.slice(last + 1, whistle).some(f => f.motion === 'goal' && f.phase === 'net'), 'the ball was not in before the whistle').toBe(true);
  }, 120000);

  /* Round 1302: a goal ruled out in the last two clock places of a half is DRAWN before its card. The plan has no
     room that is certain for it there, so the match clock stops for it (the stoppage, see LiveSimScreen.tsx): one
     place before the whistle at its own place, and at the whistle's own place at the whistle, which then waits
     for the goal and its review. Either way the card opens at the minute it prints. These two have the end of the
     half to themselves (lastMinutes(.., true) asks for that). Round 1218 left both to a card on its own: this case
     failed there on "the ruled out goal was not drawn before its review". */
  const quietLate = (back: number) => (feed: LiveFeedEvent[], live: LiveMatch) => {
    const r = lastMinutes('disallowed', true)(feed, live);
    return r && place(r) === 45 + (live.added?.h1 ?? 0) - back ? r : null;
  };
  const LATE = [
    { where: 'at the whistle', hint: 1984, back: 0 },
    { where: 'one clock place before the whistle', hint: 2591, back: 1 },
  ];
  it.each(LATE)('a goal ruled out $where is drawn before its card, at its own minute, and its review closes before the half ends', async ({ hint, back }) => {
    const h = half(1, hint, quietLate(back));
    const { frames, last } = await toTheWhistle(h);
    const first = frames.findIndex(cardUp);
    nothingUnder(frames, ruledOutIds(h.feed));
    expect(frames[last].cardText).toContain('VAR: goal ruled out');
    expect(frames.slice(0, first).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    expect(frames[first].motion).toBe('goal');
    expect(frames[first].phase).toBe('net');
    expect(frames[first].net).toBe(true);
    expect(frames[first].minute + frames[first].plus, 'the clock under the card is not at the minute the card prints').toBe(place(h.review));
    /* The goal counts for nothing: the score under the card and at the whistle is the score before it. */
    expect(new Set(frames.slice(first).map(f => f.score)), 'the score moved with the ruled out goal').toEqual(new Set([scoreBy(h.feed, h.whistle)]));
  }, 180000);

  /* The same two with reduced motion, which nobody had played (the review of Round 1302). Nothing moves: the goal
     shows as its last picture, the card opens on it at its own minute, and the half ends after the card. */
  it.each(LATE)('reduced motion, a goal ruled out $where: the card opens at its own minute on the ball in the net', async ({ hint, back }) => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
    const h = half(1, hint, quietLate(back));
    const { frames } = await toTheWhistle(h);
    const first = frames.findIndex(cardUp), up = frames.filter(cardUp);
    nothingUnder(frames, ruledOutIds(h.feed));
    expect(frames[first].minute + frames[first].plus, 'the clock under the card is not at the minute the card prints').toBe(place(h.review));
    expect(new Set(up.map(f => f.ball)).size, 'the ball moved under the card').toBe(1);
    expect(new Set(frames.slice(first).map(f => f.score)), 'the score moved with the ruled out goal').toEqual(new Set([scoreBy(h.feed, h.whistle)]));
  }, 180000);

  /* Round 1302 fix (the two reviews of the round). The end of a half that real chances FILL. The pitch plays one
     action a clock place and winds the last kick up under the place before it, so a goal ruled out there has no
     room on the clock. It used to be a card alone, and where the chances ran back to back to the whistle that
     card opened 0.05 before it on whatever was there: on my own real goal in THEIR net with the score not moved
     yet (league match 2, seed 42322: "goal ruled out" on a goal that then counted), or on the last picture of a
     real shot or save (seeds 2219, 4670, 6203). Now the clock stops for the ruled out goal and nothing real gives
     way to it. Each row is one shape of that corner, on the half the review found it on:
       every real chance of the end of the half is played, whole, in its order (so no shot is dropped to make
         room: with the ruled out goal staged in the plan at the whistle, seed 6203 loses my shot at 45+3);
       the ruled out goal is the action right before its card, and under the card the ball is in ITS OWN net;
       no goal lands on the score after the card unless an action was played after it. */
  type LateShape = { r: LiveFeedEvent; whistle: number; real: LiveFeedEvent[] };
  const lateRuledOut = (shape: (x: LateShape) => boolean) => (feed: LiveFeedEvent[], live: LiveMatch) => {
    const whistle = 45 + (live.added?.h1 ?? 0), shown = reviewsOf(feed).filter(v => place(v) >= 44), r = shown[0];
    if (shown.length !== 1 || r.review!.decision !== 'disallowed' || place(r) < whistle - 1) return null;
    return shape({ r, whistle, real: feed.filter(e => isChance(e) && place(e) >= 44) }) ? r : null;
  };
  const at = (x: LateShape, back: number) => x.real.some(e => place(e) === x.whistle - back);
  /** The real chances of the end of a half that the pitch plays, in order, by its own two rules (scene.ts): one
   *  action a clock place (of two lines the later), and nothing the place before a last kick (its wind up is there). */
  function playedReal(h: Half, from: number): LiveFeedEvent[] {
    const chances = h.feed.filter(e => isChance(e) && place(e) >= from && place(e) <= h.whistle);
    const lastKick = chances.some(e => place(e) === h.whistle);
    const byPlace = new Map<number, LiveFeedEvent>();
    for (const e of chances) if (!(lastKick && place(e) === h.whistle - 1)) byPlace.set(place(e), e);
    return [...byPlace.values()].sort((a, b) => place(a) - place(b));
  }
  it.each([
    { what: 'a real goal is the last kick after it and no instant is free before the wind up', hint: 42322, shape: (x: LateShape) => place(x.r) === x.whistle - 1 && x.real.some(e => e.kind === 'goal' && place(e) === x.whistle) && at(x, 2) },
    { what: 'it is at the whistle and a real chance is one place before it', hint: 6203, shape: (x: LateShape) => place(x.r) === x.whistle && !at(x, 0) && at(x, 1) },
    { what: 'a real chance has its own place, one before the whistle', hint: 4670, shape: (x: LateShape) => place(x.r) === x.whistle - 1 && !at(x, 0) && at(x, 1) },
    { what: 'it is at the whistle and so is a real last kick', hint: 2219, shape: (x: LateShape) => place(x.r) === x.whistle && at(x, 0) },
    { what: 'a real last kick follows it and the pitch is free before the wind up', hint: 1987, shape: (x: LateShape) => place(x.r) === x.whistle - 1 && at(x, 0) && !at(x, 1) && !at(x, 2) && !at(x, 3) },
  ])('a goal ruled out at the end of a half that real chances fill ($what): it is drawn, in its own net, and nothing real gives way', async ({ hint, shape }) => {
    const h = half(1, hint, lateRuledOut(shape));
    const v = h.review;
    const { frames, last, whistle } = await toTheWhistle(h, 40000);
    const first = frames.findIndex(cardUp);
    nothingUnder(frames, ruledOutIds(h.feed));
    expect(frames[last].cardText).toContain('VAR: goal ruled out');
    /* The ruled out goal is the action right before the card: wound up, struck, in. */
    const runs = actionRuns(frames.slice(0, whistle));
    const before = runs.filter(r => r.from < first), own = before[before.length - 1];
    expect(own?.kind, 'the action right before the card').toBe('goal');
    expect(frames.slice(own.from, first).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    /* Every real chance of the end of the half was played, in order, and each to its last picture. */
    const real = runs.filter(r => r !== own);
    expect(real.map(r => r.kind), 'the real chances the pitch played from 45 on').toEqual(playedReal(h, 45).map(e => e.kind));
    for (const r of real) {
      const next = runs[runs.indexOf(r) + 1]?.from ?? whistle;
      expect(frames.slice(r.from, next).some(f => f.phase === 'wide' || f.phase === 'caught' || f.phase === 'net'), `the real ${r.kind} that started at ${frames[r.from].ms} ms was cut before its end`).toBe(true);
    }
    /* The card is not early: at its own minute, or one clock place before it when a real last kick has the rest. */
    const lastKick = h.feed.some(e => isChance(e) && place(e) === h.whistle);
    expect(frames[first].minute + frames[first].plus, 'the review opened before its own minute').toBeGreaterThanOrEqual(place(v) - (lastKick && place(v) < h.whistle ? 1 : 0));
    /* The score does not move under the card, and no goal lands on it afterwards unless an action was played after. */
    expect(new Set(frames.slice(first, last + 1).map(f => f.score)).size, 'the score moved under the review card').toBe(1);
    if (!runs.some(r => r.from > last)) expect(frames[first].score, 'a goal counted after the card with nothing played in between').toBe(scoreBy(h.feed, h.whistle));
    /* A real goal at the clock place the card opens at is on the score by then, and has been told too (the last
       kick's line is not kept back for the review the whistle is waiting for). */
    const shown = frames[first].minute + frames[first].plus;
    const told = h.feed.filter(e => e.kind === 'goal' && place(e) === shown);
    for (const g of told) {
      /* The words the screen puts in front of a scorer (the pill and the list beside the pitch print the same run). */
      const lead = g.og ? 'GOAL! Own goal, ' : g.penalty ? 'GOAL! Penalty, ' : g.freeKick ? 'GOAL! Free kick, ' : 'GOAL! ';
      expect(frames.slice(0, first + 1).some(f => f.text.includes(`${lead}${g.text}`)), `the real goal of ${g.text} at ${place(g)} is on the score and was not told before the card opened`).toBe(true);
      /* Its pill (the same words with its minute after them) had its time BEFORE the ruled out goal was played, and
         is down when the card comes: a pill that says GOAL for one side is never straight above a card that says
         "goal ruled out" for the other. */
      const pill = `${lead}${g.text} ${g.minute}${g.plus ? `+${g.plus}` : ''}'`;
      expect(frames.slice(0, own.from).some(f => f.text.includes(pill)), `the pill of ${g.text}'s goal was never up before the ruled out goal was played`).toBe(true);
      expect(frames.slice(own.from, last + 1).some(f => f.text.includes(pill)), `the pill of ${g.text}'s real goal was up while the ruled out goal was played or reviewed`).toBe(false);
    }
    console.info(`clubManagerVarScreen: at the card ${told.length} real goal(s) of that clock place had been told (${told.map(g => g.text).join(', ') || 'none there'})`);
    console.info(`clubManagerVarScreen: the crowded end was found on seed ${h.seed}, whistle ${h.whistle}, review at ${place(v)}, card at ${frames[first].minute + frames[first].plus}, played ${runs.map(r => r.kind).join(' ')}`);
  }, 240000);

  /* Round 1302 fix 2: this case asked only that the card comes once and the half ends on the engine's score. Nobody
     had looked at what is UNDER the card of a penalty a review gives where real chances fill the end of a half (the
     awarded twin of the ruled out goals above). It says what it finds, and asks the rule every other awarded card
     is held to: no action under the card, and the score does not move under it. */
  it('a review at the very end of a crowded half is still shown once, and the half ends on the engine score', async () => {
    const h = half(0, 2483, lastMinutes('awarded', false));
    const v = h.review;
    const { frames, last, whistle } = await toTheWhistle(h);
    const first = frames.findIndex(cardUp), up = frames.filter(cardUp);
    const runs = actionRuns(frames.slice(0, whistle));
    const under = [...new Set(up.map(f => `${f.motion}/${f.phase}${f.netAt ? ` in the ${f.netAt} net` : ''}`))];
    console.info(`clubManagerVarScreen: the crowded end with a penalty given was found on seed ${h.seed}, whistle ${h.whistle}, review at ${place(v)}, card at ${frames[first].minute + frames[first].plus}, under the card ${under.join(' and ')}, score under it ${[...new Set(up.map(f => f.score))].join(' then ')}, at the whistle ${frames[whistle].score}, played ${runs.map(r => `${r.kind}${r.from > last ? ' (after the card)' : ''}`).join(', ') || 'nothing'}, chances from 44 on ${h.feed.filter(e => isChance(e) && place(e) >= 44).map(e => `${e.side} ${e.kind} at ${place(e)}${e.penalty ? ' (P)' : ''}`).join(', ')}`);
    nothingUnder(frames, new Map());
    expect(new Set(up.map(f => f.score)).size, 'the score moved under the review card').toBe(1);
  }, 120000);

  /* ---- Round 1302: the cases nobody had played (fix-AT section 7 item 8) ----
     Each on a real half the engine holds on the shipped rates, found by a scan of 7,500 first and 7,500 second
     halves on a runner (result r1302-scan; the numbers are in docs/audits/ROUND-1302-NOTES.md). */
  const ogCards = (frames: Frame[]) => frames.map((f, i) => (f.goalCard?.includes('(O.G)') ? i : -1)).filter(i => i >= 0);

  it('an own goal the minute after a ruled out goal: the review first, then the own goal as an own goal', async () => {
    const h = half(1, 1940, feed => {
      const all = reviewsOf(feed), r = all[0];
      return all.length === 1 && r.review!.decision === 'disallowed' && r.minute >= 4 && r.minute <= 38 && !r.plus
        && feed.some(e => e.kind === 'goal' && e.og && place(e) === place(r) + 1) ? r : null;
    });
    const v = h.review, id = v.review!.id, og = h.feed.find(e => e.kind === 'goal' && e.og && place(e) === place(v) + 1)!;
    const before = scoreBy(h.feed, place(v)), after = scoreBy(h.feed, place(og));
    expect(after).not.toBe(before);
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 18000, fs => { const seen = ogCards(fs); return seen.length > 0 && fs.length - 1 - seen[seen.length - 1] > 20; });
    expect(order(frames), 'the review was not shown exactly once').toEqual([id]);
    nothingUnder(frames, ruledOutIds(h.feed));
    const first = frames.findIndex(cardUp), last = frames.map(cardUp).lastIndexOf(true), seen = ogCards(frames);
    expect(frames.slice(0, first).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    for (const f of frames.filter(cardUp)) expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(before);
    /* The own goal comes after the review is over, with its own card: the man who put it in, and the mark. */
    expect(seen.length, 'the own goal never got its card').toBeGreaterThan(0);
    expect(seen[0], 'the own goal card rose before the review was over').toBeGreaterThan(last);
    expect(frames[seen[0]].goalCard).toContain(og.text);
    expect(frames[seen[seen.length - 1]].score).toBe(after);
  }, 180000);

  it.each([
    { what: 'injury', match: 2, hint: 3046, says: 'Injury: ', shared: false },
    { what: 'injury', match: 0, hint: 3861, says: 'Injury: ', shared: true },
    { what: 'red', match: 1, hint: 3827, says: 'RED CARD! ', shared: false },
  ] as const)("a review in the same minute as the other side's $what (a chance at the same place: $shared): both are told, and the card sits over nothing", async ({ what, match, hint, says, shared }) => {
    /* A ruled out goal with its clock place to itself is played on the clock. Where a real chance shares the place
       the plan plays the real one (one action a place), and the ruled out goal is played with the clock stopped,
       right before its card (the stoppage): the opener holds such a half on seed 3861 (a shot of mine, their goal
       ruled out and my injury, all at 15). Until the fix of Round 1302 that row was a card on its own. */
    const sharesPlace = (feed: LiveFeedEvent[], r: LiveFeedEvent) => r.review!.decision === 'disallowed' && feed.some(e => isChance(e) && place(e) === place(r));
    const h = half(match, hint, feed => {
      const all = reviewsOf(feed), r = all[0];
      if (all.length !== 1 || r.minute < 2 || r.minute > 40 || r.plus || !feed.some(e => e.kind === what && e.side !== r.side && place(e) === place(r))) return null;
      return sharesPlace(feed, r) === shared ? r : null;
    });
    const v = h.review, id = v.review!.id;
    const other = h.feed.find(e => e.kind === what && e.side !== v.side && place(e) === place(v))!;
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 16000, closedFor(id, 3600));
    expect(order(frames), 'the review was not shown exactly once').toEqual([id]);
    nothingUnder(frames, ruledOutIds(h.feed));
    expect(frames.some(f => f.text.includes(`${says}${other.text}`)), `the ${what} of the same minute was never told`).toBe(true);
    const last = frames.map(cardUp).lastIndexOf(true), kick = kickOf(h.live, v);
    if (v.review!.decision === 'disallowed') expect(frames.slice(0, frames.findIndex(cardUp)).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    /* The real chance that shares its place is not lost to it: it is played too. */
    if (shared) {
      const chance = h.feed.filter(e => isChance(e) && place(e) === place(v)).pop()!;
      const played = actionRuns(frames).filter(r => r.kind === chance.kind).length;
      expect(played, `the real ${chance.kind} of the same minute was not played beside the ruled out goal`).toBeGreaterThanOrEqual(chance.kind === 'goal' ? 2 : 1);
    }
    /* Release AR's rule, beside a review: a penalty the review gives and that goes in keeps its net, its scorer card and its (P). */
    if (v.review!.decision === 'awarded' && kick?.goal) {
      const after = frames.slice(last + 1), card = after.find(f => f.goalCard !== null);
      expect(after.some(f => f.motion === 'goal' && f.phase === 'net' && f.net), 'the penalty a review gave lost its net').toBe(true);
      expect(card?.goalCard, 'the penalty a review gave lost its scorer card').toContain(v.text);
      expect(card?.goalCard).toContain('(P)');
    }
  }, 180000);

  /** A second half with a review in it: the same search as half(), carried on through the interval. */
  function secondHalf(k: number, hint: number, want: (feed: LiveFeedEvent[], live: LiveMatch) => LiveFeedEvent | null | undefined): Half {
    const pre = entry(k);
    for (const seed of [hint, ...Array.from({ length: 2500 }, (_, i) => 1700 + i)]) {
      const stop = seeded(seed, () => playNextEntry(pre, { varReviews: true }));
      if (stop.kind !== 'halftime' || !stop.state.live || stop.state.live.varReviews !== true) continue;
      const on = seeded(seed + 500000, () => startSecondHalf(stop.state));
      if (!on?.live) continue;
      const feed = liveFeed(on.live), review = want(feed.filter(e => e.minute >= 46), on.live);
      if (review) return { career: structuredClone(on), review, feed, live: on.live, whistle: 90 + (on.live.added?.h2 ?? 0), seed };
    }
    throw new Error(`no second half of league match ${k + 1} holds the review this case is about`);
  }

  it("a review in the same minute as the other side's substitution: the change is told and the review is whole", async () => {
    const h = secondHalf(0, 3321, feed => {
      const all = reviewsOf(feed), r = all[0];
      return all.length === 1 && r.minute >= 50 && r.minute <= 85 && !r.plus && feed.some(e => e.kind === 'sub' && e.side !== r.side && place(e) === place(r)) ? r : null;
    });
    const v = h.review, id = v.review!.id;
    const sub = h.feed.find(e => e.kind === 'sub' && e.side !== v.side && place(e) === place(v))!;
    const before = scoreBy(h.feed, place(v) - 1);
    const mounted = openAt(h, v.minute - 1);
    const frames = await run(mounted, 16000, closedFor(id, 3600));
    expect(order(frames), 'the review was not shown exactly once').toEqual([id]);
    nothingUnder(frames, ruledOutIds(h.feed));
    for (const f of frames.filter(cardUp)) expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(before);
    expect(frames.some(f => f.text.includes(sub.text.split(' on for ')[0]) && f.text.includes('Sub: ')), 'the substitution of the same minute was never told').toBe(true);
    const last = frames.map(cardUp).lastIndexOf(true), kick = kickOf(h.live, v);
    if (v.review!.decision === 'disallowed') {
      expect(frames.slice(0, frames.findIndex(cardUp)).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    }
    if (v.review!.decision === 'awarded' && kick?.goal) {
      const after = frames.slice(last + 1), card = after.find(f => f.goalCard !== null);
      expect(after.some(f => f.motion === 'goal' && f.phase === 'net' && f.net), 'the penalty a review gave lost its net').toBe(true);
      expect(card?.goalCard, 'the penalty a review gave lost its scorer card').toContain(v.text);
      expect(card?.goalCard).toContain('(P)');
    }
  }, 180000);

  /** Extra time with a review in it. Only a Champions League knockout tie plays extra time, so this walks a fresh
   *  Arsenal career on to the second leg of its first knockout tie (34 entries on the day it was found) and searches
   *  that night: level on aggregate at 90, then a review after it. Found by a scan on a runner (r1302-scan4): 397
   *  of 2,500 seeds go to extra time and 29 of those hold a review. */
  function extraTime(hint: number, want: (feed: LiveFeedEvent[], live: LiveMatch) => LiveFeedEvent | null | undefined): Half {
    let pre = seeded(4107, () => startCareer('Arsenal'));
    for (let step = 1; step < 90; step++) {
      const next = pre.calendar[pre.week];
      if (!next) break;
      if (next.type === 'uclKo' && (next.uclLeg === 2 || !next.uclLeg)) break;
      pre = seeded(4107 * 31 + step, () => playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
    }
    expect(pre.calendar[pre.week]?.type, 'the career never reached a knockout night that can go to extra time').toBe('uclKo');
    for (const seed of [hint, ...Array.from({ length: 2500 }, (_, i) => 1700 + i)]) {
      const stop = seeded(seed, () => playNextEntry(pre, { varReviews: true }));
      if (stop.kind !== 'halftime' || !stop.state.live || stop.state.live.varReviews !== true) continue;
      const on = seeded(seed + 500000, () => startSecondHalf(stop.state));
      const extra = on ? seeded(seed + 900000, () => startExtraTime(on)) : null;
      if (!extra?.live) continue;
      const feed = liveFeed(extra.live), review = want(feed.filter(e => e.minute > 90), extra.live);
      if (review) return { career: structuredClone(extra), review, feed, live: extra.live, whistle: extra.live.et?.to ?? 120, seed };
    }
    throw new Error('no extra time of that knockout night holds the review this case is about');
  }

  it.each([
    { call: 'disallowed', hint: 1760 },
    { call: 'awarded', hint: 1927 },
  ] as const)('a review in extra time ($call): its own card, over nothing, on the score the engine has', async ({ call, hint }) => {
    const h = extraTime(hint, feed => {
      const all = reviewsOf(feed), r = all[0];
      if (all.length !== 1 || r.review!.decision !== call || r.minute < 93 || r.minute > 116 || r.plus) return null;
      /* An awarded penalty that goes in: the feed has its goal, by the same man in the same minute. */
      return call === 'awarded' && !feed.some(e => e.kind === 'goal' && e.side === r.side && e.minute === r.minute && e.text === r.text) ? null : r;
    });
    const v = h.review, id = v.review!.id, before = scoreBy(h.feed, place(v) - 1);
    const mounted = openAt(h, v.minute - 1);
    expect(snap(mounted.container, 0).stage).toBe('extra');
    const frames = await run(mounted, 16000, closedFor(id, 3600));
    const first = frames.findIndex(cardUp), last = frames.map(cardUp).lastIndexOf(true);
    expect(order(frames), 'the review was not shown exactly once').toEqual([id]);
    nothingUnder(frames, ruledOutIds(h.feed));
    expect(frames[first].minute, 'the review opened before its own minute').toBeGreaterThanOrEqual(v.minute);
    expect(frames[first].cardText).toContain(`${v.text}, ${clubOf(h, v)}, ${v.minute}'`);
    for (const f of frames.slice(first, last + 1)) expect(f.score, `the score under the review card at ${f.ms} ms`).toBe(before);
    if (call === 'disallowed') expect(frames.slice(0, first).some(f => f.motion === 'goal' && f.phase === 'flight'), 'the ruled out goal was not drawn before its review').toBe(true);
    else {
      const after = frames.slice(last + 1), card = after.find(f => f.goalCard !== null);
      expect(after.some(f => f.motion === 'goal' && f.phase === 'net' && f.net), 'the kick of the penalty a review gave was not played after the card').toBe(true);
      expect(card?.goalCard, 'the penalty a review gave got no scorer card').toContain(v.text);
      expect(card?.goalCard).toContain('(P)');
    }
  }, 240000);
});
