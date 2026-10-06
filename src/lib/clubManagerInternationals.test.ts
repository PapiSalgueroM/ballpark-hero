/**
 * Round 978: the pure parts of international duty. The outcome measurements
 * (a break makes the match after harder, resting gets most of it back, old
 * saves wait a season) live in scripts/simCmInternationals.mjs.
 */
import { describe, expect, it } from 'vitest';
import { startCareer } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  VERIFIED_WINDOWS, ruleWindows, intlWindowsFor, intlDatesPartial, windowLabel, hash01,
  validIntl, ensureIntl, freshIntl, callUpsFor, breakMessage, restingIds, backFromDuty, nationBars, intlMarkLine,
} from '@/lib/clubManagerInternationals';
import { nationalityOf } from '@/data/playerNationalities';

const key = (d: { y: number; m: number; d: number }) => d.y * 10000 + d.m * 100 + d.d;

describe('the window rule', () => {
  it('gives exactly the two source verified dates', () => {
    const ids = Object.keys(VERIFIED_WINDOWS);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const id of ids) {
      const y = Number(id.slice(0, 4));
      const w = [...ruleWindows(y), ...ruleWindows(y - 1)].find(x => x.id === id);
      expect(w && [key(w.start), key(w.end)]).toEqual([key(VERIFIED_WINDOWS[id].start), key(VERIFIED_WINDOWS[id].end)]);
    }
  });

  it('reproduces the older four window shape published for 2023-24', () => {
    // The governing body's Men's International Match Calendar 2023-2030: 4 to 12 September,
    // 9 to 17 October, 13 to 21 November 2023, 18 to 26 March 2024.
    expect(ruleWindows(2023).map(w => [key(w.start), key(w.end)])).toEqual([
      [20230904, 20230912], [20231009, 20231017], [20231113, 20231121], [20240318, 20240326],
    ]);
    expect(intlDatesPartial(2023)).toBe(true);
  });

  it('marks every era and far future season as structure only', () => {
    for (const y of [2005, 2010, 2015, 2027, 2028, 2035]) expect(intlWindowsFor(y).every(w => !w.verified)).toBe(true);
    /* March 2027 has one recorded source, so only the autumn and November windows of 2026-27 are confirmed. */
    expect(intlWindowsFor(2026).map(w => w.verified)).toEqual([true, true, false]);
    expect(intlDatesPartial(2026)).toBe(true);
  });

  it('labels a window without a dash', () => {
    const label = windowLabel(intlWindowsFor(2026)[0]);
    expect(label).toBe('21 Sep to 6 Oct');
    expect(label).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('the save block', () => {
  it('hashes deterministically into [0, 1)', () => {
    const a = hash01('Arsenal|1|2026-nov|p1');
    expect(a).toBe(hash01('Arsenal|1|2026-nov|p1'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it('accepts what it writes and drops a damaged block, that block alone', () => {
    expect(validIntl(freshIntl({ season: 3 }))).toBe(true);
    const s = { season: 1, intl: { season: 1, fired: 'nope' }, budget: 50 } as unknown as CareerState;
    ensureIntl(s);
    expect(s.intl).toBeUndefined();
    expect((s as unknown as { budget: number }).budget).toBe(50);
    const ok = { season: 1, intl: freshIntl({ season: 1 }) } as unknown as CareerState;
    ensureIntl(ok);
    expect(ok.intl).toEqual({ season: 1, fired: [] });
  });

  it('rests only for the match they come back for', () => {
    const base = { season: 2, intl: { season: 2, fired: [], rest: { week: 9, ids: ['a'] } } } as unknown as CareerState;
    expect(restingIds({ ...base, week: 9 }).has('a')).toBe(true);
    expect(restingIds({ ...base, week: 10 }).size).toBe(0);
    expect(restingIds({ ...base, season: 3, week: 9 }).size).toBe(0);
    expect(backFromDuty({ ...base, week: 9 })).toEqual([]);
  });
});

describe('who goes', () => {
  const s = startCareer('Arsenal');

  it('calls up only men the nationality map knows, at or above their country bar, never injured', () => {
    const bars = nationBars(s.eraId);
    const hurt = { ...s, squad: s.squad.map((p, i) => (i === 0 ? { ...p, injuryWeeks: 3 } : p)) };
    const called = callUpsFor(hurt, { id: '2026-nov', matches: 2 });
    expect(called.length).toBeGreaterThan(5);
    for (const c of called) {
      const p = hurt.squad.find(x => x.id === c.id)!;
      expect(nationalityOf(s.eraId, p.name)).toBe(c.nation);
      expect(p.rating).toBeGreaterThanOrEqual(bars.get(c.nation)!);
      expect(p.injuryWeeks).toBe(0);
    }
  });

  it('never calls a made up man, whatever his rating', () => {
    const fake = { ...s.squad[0], id: 'fake', name: 'Nobody Realname Xq', rating: 99 };
    expect(callUpsFor({ ...s, squad: [fake] }, { id: 'x', matches: 4 })).toEqual([]);
  });

  it('writes the note as narration from a role, naming everyone, with no dashes', () => {
    const called = callUpsFor(s, { id: '2026-sepoct', matches: 4 });
    const msg = breakMessage({ windowId: '2026-sepoct', atWeek: 6, label: '21 Sep to 6 Oct', backWeek: 7, backOpponent: 'Everton', called });
    expect(msg?.from).toBe('Your assistant');
    for (const c of called) expect(msg?.text).toContain(c.name);
    expect(msg?.text).not.toMatch(/[\u2013\u2014]/);
    expect(msg?.text).not.toMatch(/["“”]/);
    expect(breakMessage({ windowId: 'x', atWeek: 0, label: 'y', backWeek: 1, backOpponent: null, called: [] })).toBeNull();
  });

  /* Round 1021: 2020-21 starts late, so its first window can come before the first game. */
  it('says the men went from preseason when the break comes before the first game', () => {
    const called = callUpsFor(s, { id: '2026-sepoct', matches: 4 });
    const pre = breakMessage({ windowId: '2026-sepoct', atWeek: 0, label: '7 to 15 Sep', backWeek: 0, backOpponent: 'Everton', called });
    expect(pre?.text).toContain('before your first game of the season, so they went from preseason');
    expect(pre?.text).not.toContain('your last game');
    const mid = breakMessage({ windowId: '2026-sepoct', atWeek: 6, label: '21 Sep to 6 Oct', backWeek: 7, backOpponent: 'Everton', called });
    expect(mid?.text).toContain('so they went straight after your last game');
  });

  it('says the rest watched from the bench only when somebody did', () => {
    const called = callUpsFor(s, { id: '2026-sepoct', matches: 4 }).slice(0, 3);
    const brk = { windowId: '2026-sepoct', atWeek: 6, label: '21 Sep to 6 Oct', backWeek: 7, backOpponent: 'Everton' };
    const allStarted = breakMessage({ ...brk, called: called.map(c => ({ ...c, starts: true, injuredWeeks: 0 })) });
    expect(allStarted?.text).not.toContain('the rest mostly watched');
    const oneSat = breakMessage({ ...brk, called: called.map((c, i) => ({ ...c, starts: i > 0, injuredWeeks: 0 })) });
    expect(oneSat?.text).toContain('the rest mostly watched');
  });

  it('never claims the men are away for the whole window, and counts games only on confirmed dates', () => {
    const msg = breakMessage({ windowId: '2026-nov', atWeek: 6, label: '9 to 17 Nov', backWeek: 7, backOpponent: 'Everton', called: callUpsFor(s, { id: '2026-nov', matches: 2 }) });
    expect(msg?.text).toContain('your fixtures do not stop for it');
    const w = intlWindowsFor(2026)[0];
    const confirmed = intlMarkLine({ window: w, key: 0, label: '21 Sep to 6 Oct', partial: false, done: false });
    expect(confirmed).toContain('up to 4 games for each country');
    const era = intlWindowsFor(2010)[0];
    const approx = intlMarkLine({ window: era, key: 0, label: 'x', partial: true, done: false });
    expect(approx).not.toContain('games for each country');
    expect(approx).toContain('approximate');
  });
});
