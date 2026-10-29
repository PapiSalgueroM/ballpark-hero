// Round 1571: the pure club additions module. Every man here is a constructed
// fixture ("Qzx ..."), never a real player, except where a line says so.
import { describe, expect, it } from 'vitest';
import {
  applyClubAdditions, careerClubs, clubParts, matchesAddition,
  type CareerKeyFns, type ClubAddition, type CareerMan,
} from '@/lib/clubCareerAdditions';
import { clubKey, normalizeName, positionGroup, primaryNationality } from '@/lib/whoAmI';

const fns: CareerKeyFns = { norm: normalizeName, nat: primaryNationality, role: positionGroup, club: clubKey };
const man = (over: Partial<CareerMan> = {}): CareerMan => ({
  name: 'Qzx Fixture Mid', nationality: 'England', position: 'Defensive Midfield', age: 23, year: 2026, ...over,
});
const addition = (over: Partial<ClubAddition> = {}): ClubAddition => ({
  n: 'Qzx Fixture Mid', nat: 'England', by: 2002, pos: 'Defensive Midfield', clubs: ['Qzx Loan Club', 'Qzx Second Loan'], ...over,
});

describe('matchesAddition, the identity and role guard', () => {
  it('accepts both listed age conventions and nothing outside them', () => {
    expect(matchesAddition(addition(), man({ age: 23 }), fns)).toBe(true); // 2026 - 23 = 2003 = by + 1
    expect(matchesAddition(addition(), man({ age: 24 }), fns)).toBe(true); // 2026 - 24 = 2002 = by
    expect(matchesAddition(addition(), man({ age: 22 }), fns)).toBe(false); // 2004, two off
    expect(matchesAddition(addition(), man({ age: 25 }), fns)).toBe(false); // 2001
  });

  it('folds accents and case in the name, and refuses another name', () => {
    expect(matchesAddition(addition({ n: 'Qzx Fíxture MID' }), man(), fns)).toBe(true);
    expect(matchesAddition(addition({ n: 'Qzx Fixture Midd' }), man(), fns)).toBe(false);
  });

  it('refuses a namesake of another nationality and reads only the primary one', () => {
    expect(matchesAddition(addition(), man({ nationality: 'Wales' }), fns)).toBe(false);
    expect(matchesAddition(addition(), man({ nationality: 'England / Jamaica' }), fns)).toBe(true);
    expect(matchesAddition(addition(), man({ nationality: '' }), fns)).toBe(false);
  });

  it('refuses a namesake in another role (the two Vitinhas share name, nationality and birth year)', () => {
    // Real shape, read from playerBingoHonours.test.ts: the PSG midfielder and the Genoa forward.
    const psg = addition({ n: 'Vitinha', nat: 'Portugal', by: 2000, pos: 'Defensive Midfield', clubs: ['Qzx Club'] });
    expect(matchesAddition(psg, man({ name: 'Vitinha', nationality: 'Portugal', position: 'Defensive Midfield', age: 25 }), fns)).toBe(true);
    expect(matchesAddition(psg, man({ name: 'Vitinha', nationality: 'Portugal', position: 'Centre-Forward', age: 25 }), fns)).toBe(false);
    expect(matchesAddition(psg, man({ name: 'Vitinha', nationality: 'Portugal', position: 'Central Midfield', age: 25 }), fns)).toBe(true);
  });

  it('never matches a row with no whole positive age or year', () => {
    for (const bad of [{ age: 0 }, { age: Number.NaN }, { age: 23.5 }, { year: 0 }, { year: -1 }]) {
      expect(matchesAddition(addition(), man(bad), fns), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('applyClubAdditions', () => {
  it('adds the clubs to the one man it matches and reports each one', () => {
    const history = new Map([['Qzx Fixture Mid', new Set(['qzx parent club'])]]);
    const receipts = applyClubAdditions(history, [man()], [addition()], fns);
    expect([...history.get('Qzx Fixture Mid')!]).toEqual(['qzx parent club', 'qzx loan club', 'qzx second loan']);
    expect(receipts).toEqual([
      { name: 'Qzx Fixture Mid', club: 'qzx loan club', status: 'added' },
      { name: 'Qzx Fixture Mid', club: 'qzx second loan', status: 'added' },
    ]);
  });

  it('is idempotent and reports a club already present', () => {
    const history = new Map([['Qzx Fixture Mid', new Set(['qzx loan club'])]]);
    applyClubAdditions(history, [man()], [addition()], fns);
    const again = applyClubAdditions(history, [man()], [addition()], fns);
    expect(history.get('Qzx Fixture Mid')!.size).toBe(2);
    expect(again.map(r => r.status)).toEqual(['present', 'present']);
  });

  it('creates the set for a man with no history yet', () => {
    const history = new Map<string, Set<string>>();
    applyClubAdditions(history, [man()], [addition({ clubs: ['Qzx Loan Club'] })], fns);
    expect(history.get('Qzx Fixture Mid')).toEqual(new Set(['qzx loan club']));
  });

  it('applies an addition that matches two pool men to neither', () => {
    const history = new Map<string, Set<string>>();
    const twins = [man({ name: 'Qzx Fixture Mid' }), man({ name: 'Qzx Fíxture Mid' })];
    const receipts = applyClubAdditions(history, twins, [addition()], fns);
    expect(history.size).toBe(0);
    expect(receipts.map(r => r.status)).toEqual(['ambiguous', 'ambiguous']);
  });

  it('applies an addition that matches nobody to nobody', () => {
    const history = new Map([['Qzx Fixture Mid', new Set(['qzx parent club'])]]);
    const receipts = applyClubAdditions(history, [man({ position: 'Centre-Forward' })], [addition()], fns);
    expect([...history.get('Qzx Fixture Mid')!]).toEqual(['qzx parent club']);
    expect(receipts.map(r => r.status)).toEqual(['unmatched', 'unmatched']);
  });
});

describe('careerClubs, the count', () => {
  const rules = { aliases: { 'qzx club fc': 'qzx club' }, reserves: ['qzx club u21'] };

  it('splits a mid season move into its two clubs and counts each once', () => {
    expect(careerClubs(['qzx one / qzx two', 'qzx one', 'qzx two'], rules, clubKey)).toEqual(new Set(['qzx one', 'qzx two']));
  });

  it('keeps a club whose own name holds a slash without spaces', () => {
    expect(clubParts('fk bodo/glimt')).toEqual(['fk bodo/glimt']);
    expect(careerClubs(['fk bodo/glimt'], rules, clubKey).size).toBe(1);
  });

  it('maps two spellings of one club onto one key and drops reserve sides', () => {
    expect(careerClubs(['qzx club', 'qzx club fc', 'qzx club u21'], rules, clubKey)).toEqual(new Set(['qzx club']));
  });

  it('drops placeholders such as Without Club', () => {
    expect(careerClubs(['qzx one / without club'], rules, clubKey)).toEqual(new Set(['qzx one']));
  });
});
