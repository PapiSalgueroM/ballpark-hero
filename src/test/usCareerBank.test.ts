/**
 * Round 1104: the one bank rule of the four US careers (src/lib/usCareerBank.ts).
 *
 * WHAT THIS HOLDS:
 *   1. The load repair, on hand built saves, through each sport's own binding:
 *      a healthy save is the same object back; an old save with no summer mark
 *      keeps the Round 422 rebuild to the digit; a save that has played a
 *      summer is collected and stopped at zero, never rebuilt (the scout's
 *      reload: -0.4M came back as $4.2M).
 *   2. The wrapper, on a binding whose money moves are known amounts: a bill
 *      the pocket cannot cover is collected from savings in full (savings is
 *      not a shield), only what nothing can cover is written off, a bill the
 *      pocket covers changes nothing else on the save, and every member the
 *      wrapper does not name is the binding's own.
 *   3. Real seeded careers through the real bindings never show a balance
 *      below zero after any call.
 *
 * The "before" this is measured against is not in this file: the truth digest
 * (src/test/usCareerTruthDigest.test.ts) recorded every career's lowest
 * balance on the old code, and its gate let the bank step move only careers
 * that had gone below zero.
 */
import { describe, it, expect } from 'vitest';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { floorBank, playedSinceSummer, repairBankOnLoad, withBankFloor } from '@/lib/usCareerBank';
import { driveCareer } from './helpers/usCareerDrive';

const SPORTS: UsCareerSport[] = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Save = any;

/** A career one season in, built by the sport's own engine, with its bank set by hand. */
function saveOf(sport: UsCareerSport, over: Record<string, unknown>): Save {
  const keep = Math.random;
  let a = 7;
  Math.random = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  try {
    const pos = sport.create.positions[0];
    const c: Save = sport.startCareer('Bank Test', pos, sport.create.archetypes[pos][0], Math.random, null as never, sport.create.eras[0].id);
    sport.simSeason(c, 78, Math.random);
    delete c.pendingRivalryEvent;
    delete c.pendingRivalryChoice;
    return { ...JSON.parse(JSON.stringify(c)), purchased: [], ...over };
  } finally {
    Math.random = keep;
  }
}

const MARK = { eventLastFired: { some_card: 2026 } };

describe('Round 1104: the bank repair on load', () => {
  it('floorBank stops at zero and leaves everything else alone', () => {
    expect(floorBank(-0.4)).toBe(0);
    expect(floorBank(0)).toBe(0);
    expect(floorBank(12.5)).toBe(12.5);
  });

  it('reads the summer marks raw and only by their type', () => {
    expect(playedSinceSummer({})).toBe(false);
    expect(playedSinceSummer({ eventLastFired: {} })).toBe(true);
    expect(playedSinceSummer({ summerSalt: 'ab12' })).toBe(true);
    expect(playedSinceSummer({ summer: { year: 2026, ids: ['x'], at: 0 } })).toBe(true);
    /* The load repair runs before the summer's own repair, so a broken mark is not a mark. */
    expect(playedSinceSummer({ summerSalt: 5 })).toBe(false);
    expect(playedSinceSummer({ summerSalt: '' })).toBe(false);
    expect(playedSinceSummer({ eventLastFired: [] })).toBe(false);
    expect(playedSinceSummer({ summer: null })).toBe(false);
  });

  for (const sport of SPORTS) {
    it(`${sport.label}: a healthy save is the same object, an old save is rebuilt, a played one is stopped at zero`, () => {
      const healthy = saveOf(sport, { netWorth: 12.5 });
      expect(sport.repairNetWorth(healthy)).toBe(healthy);
      const zero = saveOf(sport, { netWorth: 0 });
      expect(sport.repairNetWorth(zero)).toBe(zero);

      /* No summer mark: the Round 422 rebuild, exactly as it was. */
      expect(sport.repairNetWorth(saveOf(sport, { netWorth: -40, earnings: 200 })).netWorth).toBe(90);
      expect(sport.repairNetWorth(saveOf(sport, { netWorth: -40, earnings: 200, summerSalt: 5 })).netWorth).toBe(90);
      const priced = repairBankOnLoad(saveOf(sport, { netWorth: -1, earnings: 100, purchased: ['a', 'b'] }), () => 5, sport.money);
      expect(priced.netWorth).toBe(35);

      /* A summer mark: zero, never a rebuild. The scout's reload first. */
      expect(sport.repairNetWorth(saveOf(sport, { netWorth: -0.4, earnings: 9.4, ...MARK })).netWorth).toBe(0);
      expect(sport.repairNetWorth(saveOf(sport, { netWorth: -40, earnings: 200, ...MARK })).netWorth).toBe(0);
      expect(sport.repairNetWorth(saveOf(sport, { netWorth: -40, earnings: 200, summerSalt: 'k3' })).netWorth).toBe(0);

      /* With savings behind it, the debt is collected, not forgiven. */
      const rich = saveOf(sport, { netWorth: -0.4, earnings: 9.4, ...MARK, money: { vault: 50 } });
      const fixed = sport.repairNetWorth(rich);
      expect(fixed.netWorth).toBe(0);
      expect(sport.moneyWealth(fixed)).toBe(49.6);
      /* The save handed in is not written into. */
      expect(rich.netWorth).toBe(-0.4);
      expect(rich.money).toEqual({ vault: 50 });
      /* And a second load changes nothing. */
      expect(sport.repairNetWorth(fixed)).toBe(fixed);
    });
  }
});

describe('Round 1104: the bank wrapper', () => {
  /* A binding whose money moves are fixed bills, built on the real NFL one. */
  const BILL = 3;
  const engineCard = {
    id: 'bill', title: 'A bill', body: 'It costs three.',
    options: [{ label: 'Pay', effect: 'Three gone', apply: (c: Save) => { c.netWorth = Math.round((c.netWorth - BILL) * 10) / 10; return 'Paid.'; } }],
  };
  const inner: UsCareerSport = {
    ...NFL_CAREER_SPORT,
    progress: (c: Save) => { c.netWorth -= BILL; return ['A year went by.']; },
    drawEvent: () => engineCard,
    eventDeck: () => [engineCard],
    answerInbox: (c: Save) => { c.netWorth -= BILL; return 'Answered.'; },
    dismissRivalryEvent: (c: Save) => ({ state: { ...c, netWorth: c.netWorth - BILL }, lines: ['Beat.'] }),
    resolveRivalryChoice: (c: Save) => ({ state: { ...c, netWorth: c.netWorth - BILL }, line: 'Chosen.' }),
  };
  const sport = withBankFloor(inner);
  const rng = () => 0.5;
  const total = (c: Save) => Math.round(((c.netWorth ?? 0) + sport.moneyWealth(c)) * 100) / 100;

  it('passes every member it does not name straight through', () => {
    for (const k of Object.keys(inner) as (keyof UsCareerSport)[]) {
      if (['progress', 'drawEvent', 'eventDeck', 'answerInbox', 'dismissRivalryEvent', 'resolveRivalryChoice'].includes(k)) {
        expect(sport[k], `${k} is wrapped`).not.toBe(inner[k]);
      } else {
        expect(sport[k], `${k} is the binding's own`).toBe(inner[k]);
      }
    }
  });

  it('never writes into the event the engine handed back', () => {
    const own = engineCard.options[0].apply;
    const dealt = sport.drawEvent(saveOf(NFL_CAREER_SPORT, { netWorth: 1 }), rng);
    expect(dealt).not.toBe(engineCard);
    expect(dealt.id).toBe('bill');
    expect(engineCard.options[0].apply).toBe(own);
    expect(sport.eventDeck(saveOf(NFL_CAREER_SPORT, { netWorth: 1 }), rng)[0]).not.toBe(engineCard);
  });

  it('a bill the pocket covers changes nothing else on the save', () => {
    const c = saveOf(NFL_CAREER_SPORT, { netWorth: 10 });
    const before = JSON.stringify({ ...c, netWorth: 7 });
    expect(sport.drawEvent(c, rng).options[0].apply(c, rng)).toBe('Paid.');
    expect(JSON.stringify(c)).toBe(before);
  });

  it('with nothing behind it, the card takes what is there and the rest is written off', () => {
    const c = saveOf(NFL_CAREER_SPORT, { netWorth: 1 });
    expect(sport.drawEvent(c, rng).options[0].apply(c, rng)).toBe('Paid.');
    expect(c.netWorth).toBe(0);
    expect(c.money).toBeUndefined();
  });

  it('savings is not a shield: the whole bill is collected, on every wrapped call', () => {
    const calls: [string, (c: Save) => Save][] = [
      ['a card', c => { const line = sport.drawEvent(c, rng).options[0].apply(c, rng); expect(line).toContain('Paid.'); expect(line).toContain('came out of savings'); return c; }],
      ['a dealt deck card', c => { sport.eventDeck(c, rng)[0].options[0].apply(c, rng); return c; }],
      ['progress', c => { const notes = sport.progress(c, rng); expect(notes[0]).toBe('A year went by.'); expect(notes.join(' ')).toContain('came out of savings'); return c; }],
      ['an inbox answer', c => { expect(sport.answerInbox(c, 'm', 0)).toContain('Answered.'); return c; }],
      ['a rival beat', c => { const r = sport.dismissRivalryEvent(c); expect(r.lines[0]).toBe('Beat.'); expect(r.lines.length).toBe(2); return r.state; }],
      ['a rival choice', c => { const r = sport.resolveRivalryChoice(c, 0, rng)!; expect(r.line).toContain('Chosen.'); return r.state; }],
    ];
    for (const [name, run] of calls) {
      const c = saveOf(NFL_CAREER_SPORT, { netWorth: 1, money: { vault: 50 } });
      const before = total(c);
      const after = run(c);
      expect(after.netWorth, `${name}: the pocket stops at zero`).toBe(0);
      expect(sport.moneyWealth(after), `${name}: savings paid the other two`).toBe(48);
      expect(Math.round((before - total(after)) * 100) / 100, `${name}: he is poorer by the whole bill`).toBe(BILL);
    }
  });

  it('savings that cannot cover the bill pay what they hold and only the rest is written off', () => {
    const c = saveOf(NFL_CAREER_SPORT, { netWorth: 1, money: { vault: 0.5 } });
    sport.drawEvent(c, rng).options[0].apply(c, rng);
    expect(c.netWorth).toBe(0);
    expect(sport.moneyWealth(c)).toBe(0);
  });
});

describe('Round 1104: real careers never show a balance below zero', () => {
  for (const sport of SPORTS) {
    it(`${sport.label}: 6 seeded careers, 14 seasons, checked after every call`, () => {
      let seasons = 0;
      for (let i = 0; i < 6; i += 1) {
        const pos = sport.create.positions[i % sport.create.positions.length];
        const era = sport.create.eras[i % sport.create.eras.length].id;
        const r = driveCareer(sport, { key: `bank:${i}`, pos, arch: i, eraId: era, seasons: 14 });
        expect(r.below, `${sport.slug} career ${i}: calls that left the balance below zero`).toBe(0);
        expect(r.lowest).toBeGreaterThanOrEqual(0);
        seasons += r.seasons;
      }
      expect(seasons).toBeGreaterThan(40);
    }, 600_000);
  }
});
