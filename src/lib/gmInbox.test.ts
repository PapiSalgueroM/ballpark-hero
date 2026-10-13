import { describe, expect, it } from 'vitest';
import {
  GM_INBOX_MAX, GM_INBOX_OPEN, answerGmInbox, bindGmInbox, choiceEffects, gmCondHolds, gmEligible,
  gmInboxOpen, gmInboxWeek, gmSeasonWeeks, repairGmInbox,
} from './gmInbox';
import type { GmInboxHost, GmInboxPack } from './gmInbox';
import { GM_INBOX_PACKS } from '@/data/gmInbox';
import { keyedRng } from './keyedRng';
import { gmExpiredLine, gmNeutralIndex, gmPackProblems, gmSubjectKey } from './gmInbox';
import type { GmEventDef, GmInboxMessage } from './gmInbox';
import { onCooldown } from './careerEventDeck';

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

  it('the cap drops the oldest answered message, never one still open', () => {
    const s = desk();
    const seat = seatFor({ ...TOY, cooldown: 0 });
    const [first] = gmInboxWeek(s, seat, 'b', {}, 0, () => 0.5);
    for (let clock = 1; clock < 20; clock++) {
      for (const m of gmInboxWeek(s, seat, 'b', {}, clock, () => 0.5)) answerGmInbox(s, m.id, 0, seat);
      expect(s.phoneInbox!.some(m => m.id === first.id)).toBe(true);
    }
    expect(GM_INBOX_MAX).toBe(8);
    expect(s.phoneInbox!).toHaveLength(8);
    expect(gmInboxOpen(s)).toBe(1);
  });

  it('a clock that falls rebases the cooldown book instead of locking the event out', () => {
    const s = desk();
    const seat = seatFor(TOY);
    /* 0.99 draws the second of the two eligible events, the repeatable. */
    const [rep] = gmInboxWeek(s, seat, 'a', { n: 9 }, 10, () => 0.99);
    expect(rep.defId).toBe('rep');
    answerGmInbox(s, rep.id, 0, seat);
    const back: number[] = [];
    const run = (to: number) => {
      for (let clock = 0; clock < to; clock++) {
        for (const m of gmInboxWeek(s, seat, 'a', { n: 9 }, clock, () => 0)) { if (m.defId === 'rep') back.push(clock); answerGmInbox(s, m.id, 0, seat); }
      }
    };
    run(8);
    expect(back).toEqual([3, 6]);
    /* The clock falls a second time and week 3 comes round again. */
    run(4);
    expect(back).toEqual([3, 6, 3]);
    const ids = s.phoneInbox!.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id.startsWith('rep-2026-w3'))).toHaveLength(2);
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

  it('a delivered message whose option lost its trust number resets the inbox, not the save', () => {
    const s = desk();
    gmInboxWeek(s, seatFor(TOY), 'b', {}, 0, () => 0);
    const bent = { ...s, phoneInbox: s.phoneInbox!.map(m => ({ ...m, choices: [{ label: 'Up', reply: 'Up.' }] })) as unknown as Desk['phoneInbox'] };
    repairGmInbox(bent);
    expect(bent.phoneInbox).toEqual([]);
    expect(bent.trust).toBe(50);
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
  it('the Australian football pack fits the ten round manager: ten weeks, no money, no supporters', () => {
    const p = GM_INBOX_PACKS.afl;
    expect(gmSeasonWeeks(p)).toHaveLength(10);
    for (const c of p.events.flatMap(e => e.choices)) {
      expect(c.cash).toBeUndefined();
      expect(c.popularity).toBeUndefined();
    }
    expect(p.events.filter(e => e.oneShot).length).toBeGreaterThan(0);
  });
});

/* Round 1324: the rules a deck of hundreds of cards needs. */
describe('gmInbox deck rules', () => {
  const card = (id: string, extra: Partial<GmEventDef> = {}): GmEventDef => ({
    id, beat: 'a', from: 'Ownership', emoji: 'x', text: `${id}.`,
    choices: [{ label: 'Leave it', reply: 'Fine.', karma: 0 }, { label: 'Push', reply: 'Push.', karma: 2 }], ...extra,
  });
  const deck = (events: GmEventDef[], extra: Partial<GmInboxPack> = {}): GmInboxPack => ({
    ...TOY, calendar: [{ id: 'a', label: 'A', emoji: 'A' }], span: { a: 10 },
    facts: { man: { kind: 'num', min: 1, max: 9, per: 'week' } }, perWeek: 1, cooldown: 0, chance: 1, events, ...extra,
  });
  /* A stream that hands out the given values in turn and counts the draws. */
  const stream = (vals: number[]) => { let i = 0; const f = () => vals[i++]; return { f, calls: () => i }; };

  it('equal weights pick what the uniform line picks, for the same draws', () => {
    for (const w of [undefined, 1, 2.5]) {
      for (const u of [0, 0.2, 0.5, 0.74, 0.99]) {
        const evs = ['p', 'q', 'r', 's'].map(id => card(id, w === undefined ? {} : { weight: w }));
        const r = stream([0, 0, 0, 0, u]);
        const [m] = gmInboxWeek(desk(), seatFor(deck(evs)), 'a', {}, 0, r.f);
        expect(m.defId).toBe(evs[Math.floor(u * 4)].id);
        expect(r.calls()).toBe(5);
      }
    }
  });

  it('a weighted pick takes one draw and lands on the running sum', () => {
    const evs = [card('light', { weight: 1 }), card('heavy', { weight: 3 })];
    for (const [u, want] of [[0.2, 'light'], [0.249, 'light'], [0.25, 'heavy'], [0.99, 'heavy']] as const) {
      const r = stream([0, 0, u]);
      const [m] = gmInboxWeek(desk(), seatFor(deck(evs)), 'a', {}, 0, r.f);
      expect(m.defId).toBe(want);
      expect(r.calls()).toBe(3);
    }
  });

  it('cards of one story share one stamp and never land in one week', () => {
    const p = deck([card('f1', { story: 'feud' }), card('f2', { story: 'feud' }), card('solo')], { perWeek: 3, cooldown: 5 });
    const s = desk();
    const got = gmInboxWeek(s, seatFor(p), 'a', {}, 0, () => 0).map(m => m.defId);
    expect(got.filter(id => id.startsWith('f'))).toHaveLength(1);
    expect(got).toContain('solo');
    expect(s.gmInboxLast).toEqual({ 'story:feud': 0, solo: 0 });
    for (let clock = 1; clock < 5; clock++) expect(gmEligible(p, 'a', {}, [], s.gmInboxLast!, clock).map(e => e.id)).toEqual([]);
    expect(gmEligible(p, 'a', {}, [], s.gmInboxLast!, 5).map(e => e.id)).toEqual(['f1', 'f2', 'solo']);
  });

  it('a one shot story is used once for the whole story', () => {
    const p = deck([card('x1', { story: 'exit', oneShot: true }), card('x2', { story: 'exit', oneShot: true })]);
    const s = desk();
    gmInboxWeek(s, seatFor(p), 'a', {}, 0, () => 0);
    expect(s.phoneUsedIds).toEqual(['story:exit']);
    expect(gmEligible(p, 'a', {}, s.phoneUsedIds!, s.gmInboxLast!, 50)).toEqual([]);
  });

  it('a role subject and a fact subject rest, and a missing fact holds the card', () => {
    const p = deck([card('r1', { subject: 'star' }), card('r2', { subject: 'star' }), card('f1', { subject: { fact: 'man' } })],
      { perWeek: 3, subjectRest: 4 });
    const s = desk();
    const got = gmInboxWeek(s, seatFor(p), 'a', { man: 7 }, 0, () => 0).map(m => m.defId);
    expect(got.filter(id => id.startsWith('r'))).toHaveLength(1);
    expect(got).toContain('f1');
    expect(s.gmInboxRest).toEqual({ 'role:star': 0, 'id:7': 0 });
    expect(gmEligible(p, 'a', { man: 7 }, [], {}, 3, s.gmInboxRest).map(e => e.id)).toEqual([]);
    expect(gmEligible(p, 'a', { man: 8 }, [], {}, 3, s.gmInboxRest).map(e => e.id)).toEqual(['f1']);
    expect(gmEligible(p, 'a', { man: 7 }, [], {}, 4, s.gmInboxRest).map(e => e.id)).toEqual(['r1', 'r2', 'f1']);
    expect(gmEligible(p, 'a', {}, [], {}, 4, s.gmInboxRest).map(e => e.id)).toEqual(['r1', 'r2']);
    expect(gmSubjectKey(card('b', { subject: { fact: 'man' } }), { man: true })).toBeNull();
  });

  it('the rest book is born pruned, and a pack with no rest never writes one', () => {
    const p = deck([card('r1', { subject: 'star' })], { subjectRest: 4 });
    const s = desk();
    const seat = seatFor(p);
    gmInboxWeek(s, seat, 'a', {}, 0, () => 0);
    answerGmInbox(s, s.phoneInbox![0].id, 0, seat);
    gmInboxWeek(s, seat, 'z', {}, 3, () => 0);
    expect(s.gmInboxRest).toEqual({ 'role:star': 0 });
    gmInboxWeek(s, seat, 'z', {}, 4, () => 0);
    expect(s.gmInboxRest).toEqual({});
    const plain = desk();
    gmInboxWeek(plain, seatFor(deck([card('r1', { subject: 'star' })])), 'a', {}, 0, () => 0);
    expect('gmInboxRest' in plain).toBe(false);
  });

  it('a bad rest book is dropped alone', () => {
    const s = { ...desk(), gmInboxRest: 'junk' as unknown as Record<string, number> };
    gmInboxWeek(s, seatFor(TOY), 'b', {}, 0, () => 0);
    repairGmInbox(s);
    expect('gmInboxRest' in s).toBe(false);
    expect(s.phoneInbox).toHaveLength(1);
  });

  it('every pack check lives in gmPackProblems, and bind refuses a broken pack', () => {
    for (const p of Object.values(GM_INBOX_PACKS)) expect(gmPackProblems(p)).toEqual([]);
    const broken: [Partial<GmEventDef>, RegExp][] = [
      [{ weight: 0 }, /weight 0/], [{ weight: NaN }, /weight NaN/], [{ story: '' }, /empty story/],
      [{ subject: 'nobody' }, /nobody, not a target/], [{ subject: { fact: 'nope' } }, /does not declare/],
    ];
    for (const [extra, re] of broken) {
      const p = deck([card('bad', extra)]);
      expect(gmPackProblems(p).join(' ')).toMatch(re);
      expect(() => seatFor(p)).toThrow(re);
    }
    expect(gmPackProblems(deck([card('ok')], { subjectRest: 1.5 }))).toHaveLength(1);
  });

  it('the neutral option is the first that moves nothing', () => {
    const c = (o: Partial<GmEventDef['choices'][number]>) => ({ label: 'x', reply: 'x', karma: 0, ...o });
    expect(gmNeutralIndex([c({ karma: 2 }), c({}), c({ cash: 1 })])).toBe(1);
    expect(gmNeutralIndex([c({ out: { who: 'star', weeks: 0 } })])).toBe(0);
    expect(gmNeutralIndex([c({ morale: 1 }), c({ recruit: 2 }), c({ rating: { who: 'star', delta: 1 } })])).toBe(-1);
  });

  it('a wording is picked with no deck draw, and the same key reads the same words', () => {
    const e = card('w', { texts: ['Second.', 'Third.'] });
    const words = (key: string, clock: number) => {
      const r = stream([0, 0]);
      const seat = { ...seatFor(deck([e])), keyOf: () => key };
      const [m] = gmInboxWeek(desk(), seat, 'a', {}, clock, r.f);
      expect(r.calls()).toBe(2);
      return m.text;
    };
    const seen = new Set<string>();
    for (let clock = 0; clock < 40; clock++) {
      const t = words('save-1', clock);
      expect(words('save-1', clock)).toBe(t);
      seen.add(t);
    }
    expect([...seen].sort()).toEqual(['Second.', 'Third.', 'w.']);
    const run = (key: string) => Array.from({ length: 40 }, (_, c) => words(key, c));
    expect(run('save-1')).not.toEqual(run('save-2'));
  });

  it('the season clock holds a card out exactly while careerEventDeck does', () => {
    const p = deck([card('a1'), card('a2', { cooldown: 1 }), card('a3', { story: 'arc', cooldown: 3 }), card('a4', { story: 'arc' })],
      { clock: 'season', cooldown: 2 });
    for (let season = 0; season < 12; season++) {
      for (const at of [undefined, 0, 3, 5, 8, 11]) {
        const ledger: Record<string, number> = at === undefined ? {} : { a1: at, a2: at, 'story:arc': at };
        const want = p.events.filter(e => !onCooldown(ledger, e, season, p.cooldown)).map(e => e.id);
        expect(gmEligible(p, 'a', {}, [], ledger, season).map(e => e.id)).toEqual(want);
      }
    }
    /* The two clocks differ by one on purpose: back after 2 weeks, or sits out 2 seasons. */
    expect(gmEligible({ ...p, clock: undefined }, 'a', {}, [], { a1: 0 }, 2).map(e => e.id)).toContain('a1');
    expect(gmEligible(p, 'a', {}, [], { a1: 0 }, 2).map(e => e.id)).not.toContain('a1');
    expect(gmEligible(p, 'a', {}, [], { a1: 0 }, 3).map(e => e.id)).toContain('a1');
  });

  it('the validator names an empty wording and a clock that is neither', () => {
    expect(gmPackProblems(deck([card('t', { texts: ['Fine.', ''] })])).join(' ')).toMatch(/empty wording/);
    expect(gmPackProblems(deck([card('t')], { clock: 'month' as 'week' })).join(' ')).toMatch(/neither week nor season/);
    expect(gmPackProblems(deck([card('t')], { reachBy: 'position' })).join(' ')).toMatch(/reachBy position is not a declared fact/);
    expect(gmPackProblems(deck([card('t')], { reachBy: 'man' }))).toEqual([]);
  });

  it('a card left open is settled on its neutral option at exactly w plus expires, and nothing moves', () => {
    const e = card('x', { expires: 3, choices: [{ label: 'Push', reply: 'Push.', karma: 2 }, { label: 'Leave it', reply: 'Fine.', karma: 0 }] });
    const p = deck([e], { cooldown: 50 });
    const s = desk();
    const seat = seatFor(p);
    const [m] = gmInboxWeek(s, seat, 'a', {}, 5, () => 0) as GmInboxMessage[];
    expect(m.w).toBe(5);
    const before = JSON.stringify([s.trust, s.fans, s.cash, s.morale, s.recruit, s.out, s.rating]);
    gmInboxWeek(s, seat, 'a', {}, 7, () => 0);
    expect(s.phoneInbox![0].answered).toBeUndefined();
    gmInboxWeek(s, seat, 'a', {}, 8, () => 0);
    const settled = s.phoneInbox![0] as GmInboxMessage;
    expect([settled.answered, settled.auto]).toEqual([1, true]);
    expect(JSON.stringify([s.trust, s.fans, s.cash, s.morale, s.recruit, s.out, s.rating])).toBe(before);
    expect(gmExpiredLine(settled, p)).toBe('📨 Ownership: your assistant dealt with it (Leave it).');
    expect(gmExpiredLine(m, p)).toBeNull();
    expect(answerGmInbox(s, settled.id, 0, seat)).toBeNull();
  });

  it('a card whose def lost its expiry stays open, and a plain card carries no tick', () => {
    const e = card('x', { expires: 2 });
    const s = desk();
    gmInboxWeek(s, seatFor(deck([e], { cooldown: 50 })), 'a', {}, 0, () => 0);
    gmInboxWeek(s, seatFor(deck([card('x')], { cooldown: 50 })), 'a', {}, 9, () => 0);
    expect(s.phoneInbox![0].answered).toBeUndefined();
    const plain = desk();
    gmInboxWeek(plain, seatFor(TOY), 'b', {}, 0, () => 0);
    expect('w' in plain.phoneInbox![0]).toBe(false);
  });

  it('a bad tick or a bad auto bends the message, and the inbox resets alone', () => {
    const s = desk();
    gmInboxWeek(s, seatFor(deck([card('x', { expires: 2 })])), 'a', {}, 0, () => 0);
    const keep = JSON.stringify(s.phoneInbox);
    expect(JSON.stringify(repairGmInbox(JSON.parse(JSON.stringify(s))).phoneInbox)).toBe(keep);
    for (const bent of [{ w: 'soon' }, { w: Infinity }, { auto: 1 }, { auto: true }]) {
      const b = { ...s, phoneInbox: s.phoneInbox!.map(m => ({ ...m, ...bent })) as unknown as Desk['phoneInbox'] };
      repairGmInbox(b);
      expect(b.phoneInbox).toEqual([]);
      expect(b.gmInboxLast).toEqual({ x: 0 });
    }
  });

  it('the validator refuses an expiry that is not a whole tick, or one with nothing neutral to settle on', () => {
    expect(gmPackProblems(deck([card('x', { expires: 0 })])).join(' ')).toMatch(/expires after 0/);
    expect(gmPackProblems(deck([card('x', { expires: 1.5 })])).join(' ')).toMatch(/expires after 1.5/);
    const hard = card('x', { expires: 2, choices: [{ label: 'Push', reply: 'Push.', karma: 2 }] });
    expect(() => seatFor(deck([hard]))).toThrow(/no option that moves nothing/);
  });
});
