import { describe, expect, it } from 'vitest';
import {
  GM_INBOX_MAX, GM_INBOX_OPEN, answerGmInbox, bindGmInbox, choiceEffects, gmCondHolds, gmEligible,
  gmInboxOpen, gmInboxWeek, gmSeasonWeeks, repairGmInbox,
} from './gmInbox';
import type { GmInboxHost, GmInboxPack } from './gmInbox';
import { GM_INBOX_PACKS } from '@/data/gmInbox';
import { keyedRng } from './keyedRng';

interface Desk extends GmInboxHost {
  trust: number; fans: number; cash: number; year: number; recruit: number;
  out: Record<string, number>; rating: Record<string, number>;
}
const desk = (): Desk => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2026, recruit: 50, out: {}, rating: {} });
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const seatFor = (pack: GmInboxPack) => bindGmInbox<Desk>(pack, {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; },
  addPopularity: (s, d) => { s.fans = clamp(s.fans + d); }, addCash: (s, a) => { s.cash += a; },
  yearOf: s => s.year,
  setOut: (s, who, w) => { s.out[who] = (s.out[who] ?? 0) + w; },
  addRating: (s, who, d) => { s.rating[who] = (s.rating[who] ?? 0) + d; },
  addRecruit: (s, d) => { s.recruit += d; },
});

/* A tiny pack that makes every rule easy to watch. */
const TOY: GmInboxPack = {
  seat: 'toy', label: 'Toy', calendar: [{ id: 'a', label: 'A', emoji: 'A' }, { id: 'b', label: 'B', emoji: 'B' }],
  span: { a: 2, b: 1 }, facts: { n: { kind: 'num', min: 0, max: 10, per: 'week' } }, targets: { star: 'Your star' },
  meters: { trust: 'Trust', fans: 'Fans', money: 'Budget', morale: 'Room' }, money: { prefix: '$', suffix: 'M' },
  perWeek: 1, cooldown: 3, chance: 1,
  events: [
    { id: 'one', beat: 'a', from: 'Ownership', emoji: 'x', text: 'One.', oneShot: true, choices: [{ label: 'Go', reply: 'Go.', karma: 4, cash: -1.5 }] },
    { id: 'rep', beat: 'a', from: 'Ownership', emoji: 'x', text: 'Rep.', when: [{ fact: 'n', op: '>=', value: 5 }], choices: [{ label: 'Sit him', reply: 'Sit.', karma: 0, out: { who: 'star', weeks: 2 } }] },
    { id: 'bee', beat: 'b', from: 'Ownership', emoji: 'x', text: 'Bee.', choices: [{ label: 'Up', reply: 'Up.', karma: -2, morale: 3, popularity: -1, rating: { who: 'star', delta: 1 } }] },
  ],
};

describe('gmInbox engine', () => {
  it('conditions fail closed on a missing fact and read every operator', () => {
    expect(gmCondHolds({ fact: 'x', op: '==', value: true }, {})).toBe(false);
    expect(gmCondHolds({ fact: 'n', op: '<', value: 5 }, { n: 4 })).toBe(true);
    expect(gmCondHolds({ fact: 'n', op: '<=', value: 5 }, { n: 5 })).toBe(true);
    expect(gmCondHolds({ fact: 'n', op: '>', value: 5 }, { n: 5 })).toBe(false);
    expect(gmCondHolds({ fact: 'n', op: '>=', value: 5 }, { n: 5 })).toBe(true);
    expect(gmCondHolds({ fact: 'n', op: '!=', value: 5 }, { n: 4 })).toBe(true);
    expect(gmCondHolds({ fact: 'n', op: '<', value: 5 }, { n: 'four' })).toBe(false);
  });

  it('a pack that moves something the seat cannot move refuses to bind', () => {
    expect(() => bindGmInbox<Desk>(GM_INBOX_PACKS.college, {
      moodOf: s => s.trust, setMood: () => undefined, addPopularity: () => undefined, addCash: () => undefined, yearOf: s => s.year,
      setOut: () => undefined, addRating: () => undefined,
    })).toThrow(/recruit/);
  });

  it('delivers only on its beat, only when its conditions hold', () => {
    const elig = (beat: string, n: number) => gmEligible(TOY, beat, { n }, [], {}, 0).map(e => e.id);
    expect(elig('a', 2)).toEqual(['one']);
    expect(elig('a', 7)).toEqual(['one', 'rep']);
    expect(elig('b', 7)).toEqual(['bee']);
  });

  it('a one shot comes once a save, a repeatable waits out its cooldown', () => {
    const s = desk();
    const seat = seatFor(TOY);
    const got: string[] = [];
    for (let clock = 0; clock < 12; clock++) {
      for (const m of gmInboxWeek(s, seat, 'a', { n: 9 }, clock, () => 0)) { got.push(`${m.defId}@${clock}`); answerGmInbox(s, m.id, 0, seat); }
    }
    expect(got.filter(g => g.startsWith('one'))).toHaveLength(1);
    const reps = got.filter(g => g.startsWith('rep')).map(g => Number(g.split('@')[1]));
    for (let i = 1; i < reps.length; i++) expect(reps[i] - reps[i - 1]).toBeGreaterThanOrEqual(TOY.cooldown);
    expect(reps.length).toBeGreaterThan(1);
  });

  it('never leaves more than three open and never keeps more than eight', () => {
    const s = desk();
    const seat = seatFor({ ...TOY, cooldown: 0 });
    for (let clock = 0; clock < 30; clock++) {
      gmInboxWeek(s, seat, clock % 2 ? 'a' : 'b', { n: 9 }, clock, () => 0.5);
      expect(gmInboxOpen(s)).toBeLessThanOrEqual(GM_INBOX_OPEN);
      if (clock % 3 === 0) { const open = s.phoneInbox!.find(m => m.answered === undefined); if (open) answerGmInbox(s, open.id, 0, seat); }
      expect(s.phoneInbox!.length).toBeLessThanOrEqual(GM_INBOX_MAX);
    }
  });

  it('every option moves exactly what its card says, once', () => {
    const s = desk();
    const seat = seatFor(TOY);
    const [m] = gmInboxWeek(s, seat, 'b', {}, 0, () => 0);
    expect(choiceEffects(m.choices[0], TOY)).toEqual(['Trust -2', 'Fans -1', 'Room +3', 'Your star rating +1']);
    expect(answerGmInbox(s, m.id, 0, seat)).toContain('Your star rating +1');
    expect([s.trust, s.fans, s.morale, s.cash, s.rating.star, s.out.star]).toEqual([48, 49, 53, 10, 1, undefined]);
    expect(answerGmInbox(s, m.id, 0, seat)).toBeNull();
    expect([s.trust, s.morale, s.rating.star]).toEqual([48, 53, 1]);
    expect(answerGmInbox(s, 'nope', 0, seat)).toBeNull();
  });

  it('money reads in the seat money and a bad option index moves nothing', () => {
    const s = desk();
    const seat = seatFor(TOY);
    const [m] = gmInboxWeek(s, seat, 'a', { n: 0 }, 0, () => 0);
    expect(choiceEffects(m.choices[0], TOY)).toEqual(['Trust +4', 'Budget -$1.5M']);
    expect(answerGmInbox(s, m.id, 5, seat)).toBeNull();
    expect([s.trust, s.cash]).toEqual([50, 10]);
  });

  it('same seed, same deck', () => {
    const run = (key: string) => {
      const s = desk(); const seat = seatFor(GM_INBOX_PACKS.nfl); const rng = keyedRng(key); const out: string[] = [];
      gmSeasonWeeks(GM_INBOX_PACKS.nfl).forEach((beat, w) => {
        for (const m of gmInboxWeek(s, seat, beat, { starExpiring: true, tagged: true, capSpace: 1, rookieQB: true, winPct: 0.2, starHurt: true }, w, rng)) {
          out.push(m.id); answerGmInbox(s, m.id, 0, seat);
        }
      });
      return out;
    };
    expect(run('seed-1')).toEqual(run('seed-1'));
    expect(run('seed-1').length).toBeGreaterThan(2);
  });

  it('an old save is untouched and a broken block resets alone', () => {
    const old = desk();
    expect(repairGmInbox({ ...old })).toEqual(old);
    const s = desk();
    gmInboxWeek(s, seatFor(TOY), 'b', {}, 0, () => 0);
    const broken = { ...s, gmInboxLast: 'junk' as unknown as Record<string, number> };
    repairGmInbox(broken);
    expect(broken.gmInboxLast).toEqual({});
    expect(broken.phoneInbox).toHaveLength(1);
    const badInbox = { ...s, phoneInbox: [{ id: 3 }] as unknown as Desk['phoneInbox'] };
    repairGmInbox(badInbox);
    expect(badInbox.phoneInbox).toEqual([]);
    expect(badInbox.gmInboxLast).toEqual({ bee: 0 });
  });
});

describe('gmInbox packs', () => {
  const packs = Object.values(GM_INBOX_PACKS);
  it('carries all seven seats', () => {
    expect(Object.keys(GM_INBOX_PACKS).sort()).toEqual(['afl', 'college', 'gym', 'mlb', 'nba', 'nfl', 'nhl']);
  });
  it('every id is unique across every pack', () => {
    const ids = packs.flatMap(p => p.events.map(e => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const p of packs) {
    it(`${p.seat}: beats, facts and targets are all declared, and every option moves something`, () => {
      const beats = new Set(p.calendar.map(b => b.id));
      for (const e of p.events) {
        expect(beats.has(e.beat)).toBe(true);
        for (const c of e.when ?? []) expect(p.facts[c.fact]).toBeDefined();
        expect(e.choices.length).toBeGreaterThanOrEqual(2);
        expect(e.choices.length).toBeLessThanOrEqual(3);
        for (const c of e.choices) {
          if (c.out) expect(p.targets[c.out.who]).toBeDefined();
          if (c.rating) expect(p.targets[c.rating.who]).toBeDefined();
          expect(choiceEffects(c, p).length).toBeGreaterThan(0);
          expect(Math.abs(c.karma)).toBeLessThanOrEqual(12);
        }
      }
    });
  }
  it('the gym moves no fan meter and no room, since it has neither', () => {
    for (const c of GM_INBOX_PACKS.gym.events.flatMap(e => e.choices)) {
      expect(c.popularity).toBeUndefined();
      expect(c.morale).toBeUndefined();
    }
  });
});
