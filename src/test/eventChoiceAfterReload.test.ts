/**
 * Round 667: an event card survives a reload.
 *
 * A player reported on 2026-09-25 that Soccer Career "says it broke and the
 * advance buttons no longer work". The page saves the career as JSON on every
 * change and reloads it with JSON.parse, and an EventChoice carries its effect
 * as a function, which JSON drops without a word. A save written while an
 * event card was on screen came back with choices that could not be applied,
 * and the tap on one threw inside the click handler.
 *
 * These cases go through the real engine and a real JSON round trip. The
 * catalog resolves the choice by the event's id; an event the catalog does
 * not know is skipped rather than thrown on.
 */
import { describe, it, expect } from 'vitest';
import {
  initCareer, applyEventChoice, getAllEvents, repairCareer, FALLBACK_CLUBS,
  type CareerState,
} from '@/lib/soccerCareerEngine';

const stats = (v: number) => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v } as unknown as Parameters<typeof initCareer>[4]);

function proState(): CareerState {
  const s = initCareer('Reload Test', 'England', 'ST', '2020s', stats(70), 70, 2020, FALLBACK_CLUBS, null, 85);
  // Straight into a playing career at a real club so the catalog has a full state to read.
  return { ...s, phase: 'playing', age: 22, currentClub: FALLBACK_CLUBS[0].name, currentClubTier: FALLBACK_CLUBS[0].tier, currentClubCountry: FALLBACK_CLUBS[0].country } as CareerState;
}

/** What the page does: stringify, parse, repair. Functions do not survive. */
const roundTrip = (s: CareerState): CareerState => repairCareer(JSON.parse(JSON.stringify(s)) as CareerState);

describe('applyEventChoice after a JSON reload', () => {
  it('a real event still applies after its apply functions were dropped by JSON', () => {
    const base = proState();
    const catalog = getAllEvents(base);
    expect(catalog.length).toBeGreaterThan(0);
    const event = catalog[0];
    const pending = { ...base, phase: 'random_events', pendingEvents: [event] } as CareerState;

    const reloaded = roundTrip(pending);
    expect(typeof (reloaded.pendingEvents[0].choices[0] as unknown as { apply?: unknown }).apply).toBe('undefined');

    let after: CareerState | null = null;
    expect(() => { after = applyEventChoice(reloaded, 0, FALLBACK_CLUBS); }).not.toThrow();
    expect(after).not.toBeNull();
    expect(after!.pendingEvents.length).toBe(0);
    expect(after!.phase).not.toBe('random_events');
    expect(after!.lastEventId).toBe(event.id);
  });

  it('an event the catalog no longer carries is skipped, not thrown on', () => {
    const base = proState();
    const ghost = { id: 'no-such-event-round-667', title: 'Gone', text: '', choices: [{ label: 'Ok', emoji: '', color: '', consequence: '' }] };
    const pending = { ...base, phase: 'random_events', pendingEvents: [ghost] } as unknown as CareerState;
    const reloaded = roundTrip(pending);
    let after: CareerState | null = null;
    expect(() => { after = applyEventChoice(reloaded, 0, FALLBACK_CLUBS); }).not.toThrow();
    expect(after!.pendingEvents.length).toBe(0);
    expect(after!.phase).not.toBe('random_events');
  });

  it('two queued events: the first applies and the second stays queued in random_events', () => {
    const base = proState();
    const catalog = getAllEvents(base);
    expect(catalog.length).toBeGreaterThan(1);
    const pending = { ...base, phase: 'random_events', pendingEvents: [catalog[0], catalog[1]] } as CareerState;
    const after = applyEventChoice(roundTrip(pending), 0, FALLBACK_CLUBS);
    expect(after.pendingEvents.length).toBe(1);
    expect(after.phase).toBe('random_events');
  });
});
