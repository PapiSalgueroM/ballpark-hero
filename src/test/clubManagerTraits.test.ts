import { describe, expect, it } from 'vitest';
import type { Position } from '@/types/game';
import { gradeFit } from '@/lib/positionFit';
import {
  COACHED_STYLES, COACHED_STYLE_RULES, readCoachedStyle, readCoachedStyleCourse,
  coachedCourseRefusal, startCoachedStyle, cancelCoachedStyle, tickCoachedStyle,
  coachedStyleFit, coachedStyleXi, coachedTrainingMultiplier,
  type CoachedStyleId, type CoachedStylePlayer,
} from '@/lib/clubManagerTraits';

const home = { owned: true, awayOnLoan: false, live: false };
const week = { owned: true, awayOnLoan: false };
const balanced = { press: 0, tempo: 0, width: 0, line: 0 } as const;
const slot = (allowed: Position[]) => ({ allowed });
const player = (extra: Partial<CoachedStylePlayer> = {}) => ({
  id: 'fictional-training-player', position: 'CM' as Position, fitness: 75,
  rating: 65, potential: 80, value: 2.5, morale: 70, ...extra,
});
const learned = (id: CoachedStyleId, extra: Partial<CoachedStylePlayer> = {}) =>
  player({ coachedStyle: { v: 1, id }, ...extra });

describe('Club Manager earned coached styles', () => {
  it('keeps absent, malformed and future payloads neutral without altering raw players', () => {
    const invalid = [
      undefined, null, { v: 2, id: 'press' }, { v: 1, id: 'invented' },
      { v: 1, id: 'press', extra: true }, { v: 1 }, [],
    ];
    for (const coachedStyle of invalid) {
      const p = player({ coachedStyle });
      const before = JSON.stringify(p);
      expect(readCoachedStyle(p)).toBeNull();
      expect(coachedStyleFit(p, slot(['CM']), null, { ...balanced, press: 1 }).attack,
        'COACHED_INVALID_STYLE_NEUTRAL').toBe(0);
      expect(coachedTrainingMultiplier(p, 'double')).toBe(1);
      expect(tickCoachedStyle(p, week)).toBe(p);
      expect(JSON.stringify(p)).toBe(before);
    }
    expect(COACHED_STYLE_RULES.weeks).toBe(6);
    expect(COACHED_STYLES.press.training).toBe('double');
    expect(COACHED_STYLES.link.training).toBe('normal');
    expect(COACHED_STYLES.runner.training).toBe('light');
  });

  it('starts an owned outfield course and completes on exactly the sixth charged week', () => {
    const original = player();
    const before = JSON.stringify(original);
    const started = startCoachedStyle(original, 'press', home);
    expect(started.ok, 'COACHED_START_HEALTHY').toBe(true);
    let p = started.player;
    expect(readCoachedStyleCourse(p)).toEqual({ v: 1, to: 'press', weeksLeft: 6, weeksTotal: 6 });
    for (let i = 1; i <= 5; i++) {
      p = tickCoachedStyle(p, week);
      expect(readCoachedStyle(p), 'COACHED_NO_EARLY_COMPLETION').toBeNull();
      expect(readCoachedStyleCourse(p)?.weeksLeft).toBe(6 - i);
      expect(coachedTrainingMultiplier(p, 'double')).toBe(1);
    }
    p = tickCoachedStyle(p, week);
    expect(readCoachedStyle(p), 'COACHED_SIXTH_WEEK_COMPLETES').toEqual({ v: 1, id: 'press' });
    expect(Object.prototype.hasOwnProperty.call(p, 'coachedStyleCourse')).toBe(false);
    expect({ ...p, coachedStyle: undefined }).toEqual({ ...original, coachedStyle: undefined });
    expect(tickCoachedStyle(p, week)).toBe(p);
    expect(JSON.stringify(original)).toBe(before);
  });

  it('keeps an old completed style until replacement completes and cancel only removes its course', () => {
    const original = learned('link');
    const started = startCoachedStyle(original, 'runner', home);
    expect(started.ok).toBe(true);
    const one = tickCoachedStyle(started.player, week);
    expect(readCoachedStyle(one)).toEqual({ v: 1, id: 'link' });
    const cancelled = cancelCoachedStyle(one, home);
    expect(cancelled.ok, 'COACHED_CANCEL_KEEPS_LEARNED').toBe(true);
    expect(cancelled.player).toEqual(original);
    let replacement = startCoachedStyle(original, 'runner', home).player;
    for (let i = 0; i < 6; i++) replacement = tickCoachedStyle(replacement, week);
    expect(readCoachedStyle(replacement), 'COACHED_REPLACE_AT_COMPLETION').toEqual({ v: 1, id: 'runner' });
    expect(startCoachedStyle(original, 'link', home).ok).toBe(false);
  });

  it('refuses ineligible course edits and preserves the exact candidate on refusal', () => {
    const eligible = player();
    expect(coachedCourseRefusal(eligible, home, 'press')).toBeNull();
    const attempts = [
      { p: eligible, c: { ...home, owned: false } },
      { p: eligible, c: { ...home, awayOnLoan: true } },
      { p: eligible, c: { ...home, live: true } },
      { p: player({ onLoan: true }), c: home },
      { p: player({ position: 'GK' }), c: home },
      { p: player({ retraining: { to: 'CDM', weeksLeft: 2, weeksTotal: 6 } }), c: home },
      { p: player({ coachedStyle: { v: 3, id: 'press' } }), c: home },
      { p: player({ coachedStyleCourse: { v: 1, to: 'press', weeksLeft: 0, weeksTotal: 6 } }), c: home },
    ];
    for (const { p, c } of attempts) {
      const before = JSON.stringify(p);
      expect(coachedCourseRefusal(p, c, 'press'), 'COACHED_EDIT_REFUSAL_EXPLAINED').toBeTruthy();
      const result = startCoachedStyle(p, 'press', c);
      expect(result.ok).toBe(false);
      expect(result.player).toBe(p);
      expect(JSON.stringify(p)).toBe(before);
    }
    expect(startCoachedStyle(eligible, 'unknown' as CoachedStyleId, home).ok).toBe(false);
    const running = startCoachedStyle(eligible, 'press', home).player;
    expect(startCoachedStyle(running, 'runner', home).player).toBe(running);
    expect(cancelCoachedStyle(running, { ...home, live: true }).player).toBe(running);
  });

  it('pauses learning away from the owned squad or while retraining and never progresses on reads', () => {
    const started = startCoachedStyle(player(), 'press', home).player;
    for (let i = 0; i < 20; i++) {
      readCoachedStyleCourse(started);
      coachedStyleFit(started, slot(['CM']), null, { ...balanced, press: 1 });
    }
    expect(readCoachedStyleCourse(started)?.weeksLeft).toBe(6);
    expect(tickCoachedStyle(started, { ...week, awayOnLoan: true })).toBe(started);
    expect(tickCoachedStyle(started, { ...week, owned: false })).toBe(started);
    const loan = { ...started, onLoan: true };
    expect(tickCoachedStyle(loan, week)).toBe(loan);
    const overlap = { ...started, retraining: { to: 'CDM', weeksLeft: 2, weeksTotal: 6 } };
    expect(tickCoachedStyle(overlap, week)).toBe(overlap);
    const restored = JSON.parse(JSON.stringify(started)) as typeof started;
    expect(readCoachedStyleCourse(tickCoachedStyle(restored, week))?.weeksLeft).toBe(5);
  });

  it('uses actual shared natural and family fit and explains every inactive press condition', () => {
    const p = learned('press', { fitness: 60 });
    const natural = coachedStyleFit(p, slot(['CM']), null, { ...balanced, press: 1 });
    expect(natural).toMatchObject({ active: true, fit: gradeFit(['CM'], ['CM']), attack: 0.006 });
    expect(natural.reason, 'COACHED_VISIBLE_ACTIVE_REASON').toBe('Active with high pressing.');
    const family = coachedStyleFit(p, slot(['CDM']), null, { ...balanced, press: 1 });
    expect(family).toMatchObject({ active: true, fit: 'family', attack: 0.006 });
    for (const result of [
      coachedStyleFit(p, slot(['CM']), null, balanced),
      coachedStyleFit({ ...p, fitness: 59 }, slot(['CM']), null, { ...balanced, press: 1 }),
      coachedStyleFit(p, slot(['ST']), null, { ...balanced, press: 1 }),
      coachedStyleFit(p, null, null, { ...balanced, press: 1 }),
      coachedStyleFit({ ...p, position: 'GK' }, slot(['GK']), null, { ...balanced, press: 1 }),
    ]) {
      expect(result.active, 'COACHED_PRESS_GATES').toBe(false);
      expect(result.attack).toBe(0);
      expect(result.reason.length).toBeGreaterThan(0);
    }
    const trained = learned('press', { secondaryPositions: ['ST'] });
    expect(coachedStyleFit(trained, slot(['ST']), null, { ...balanced, press: 1 }).active).toBe(true);
  });

  it('activates link and runner only with their actual instruction and supported duty', () => {
    const link = learned('link');
    for (const duty of ['deepPlaymaker', 'playmaker', 'falseNine'] as const) {
      expect(coachedStyleFit(link, slot(['CM']), duty, { ...balanced, tempo: -1 }).attack,
        'COACHED_LINK_INSTRUCTION_DUTY').toBe(0.006);
    }
    expect(coachedStyleFit(link, slot(['CM']), 'poacher', { ...balanced, tempo: -1 }).attack).toBe(0);
    expect(coachedStyleFit(link, slot(['CM']), 'playmaker', balanced).attack).toBe(0);
    const runner = learned('runner', { position: 'ST' });
    for (const duty of ['targetMan', 'poacher'] as const) {
      expect(coachedStyleFit(runner, slot(['ST']), duty, { ...balanced, tempo: 1 }).attack,
        'COACHED_RUNNER_INSTRUCTION_DUTY').toBe(0.006);
    }
    expect(coachedStyleFit(runner, slot(['ST']), 'falseNine', { ...balanced, tempo: 1 }).attack).toBe(0);
    expect(coachedStyleFit(runner, slot(['ST']), 'poacher', { ...balanced, tempo: -1 }).attack).toBe(0);
  });

  it('counts only supplied actual on-pitch slots, caps XI attack and refuses duplicate selection', () => {
    const xi = Array.from({ length: 11 }, (_, i) => ({
      p: learned('press', { id: 'fictional-xi-' + i }), slot: slot(['CM']), duty: null,
    }));
    const report = coachedStyleXi(xi, { ...balanced, press: 1 });
    expect(report.activeCount, 'COACHED_XI_ACTUAL_COUNT').toBe(11);
    expect(report.attack, 'COACHED_XI_ATTACK_CAP').toBe(0.06);
    expect(report.players.every(p => p.active && p.attack === 0.006)).toBe(true);
    const bench = learned('press', { id: 'fictional-bench' });
    const withoutOne = coachedStyleXi(xi.slice(0, 9), { ...balanced, press: 1 });
    expect(withoutOne.activeCount).toBe(9);
    expect(withoutOne.attack).toBe(9 * 0.006);
    expect(withoutOne.players.some(p => p.playerId === bench.id), 'COACHED_NO_BENCH_CONTRIBUTION').toBe(false);
    expect(coachedStyleXi([xi[0], xi[0]], { ...balanced, press: 1 }).attack).toBe(0);
    expect(coachedStyleXi([...xi, { ...xi[0], p: bench }], { ...balanced, press: 1 }).attack).toBe(0);
    expect(coachedStyleXi(xi, balanced).attack).toBe(0);
  });

  it('applies the small growth multiplier only to the learned style matching current training', () => {
    for (const [id, intensity] of [['press', 'double'], ['link', 'normal'], ['runner', 'light']] as const) {
      const p = learned(id);
      const before = JSON.stringify(p);
      expect(coachedTrainingMultiplier(p, intensity), 'COACHED_MATCHING_TRAINING_GROWTH').toBe(1.05);
      for (const other of ['light', 'normal', 'double'] as const) {
        if (other !== intensity) expect(coachedTrainingMultiplier(p, other)).toBe(1);
      }
      expect(JSON.stringify(p)).toBe(before);
    }
    const unfinished = startCoachedStyle(player(), 'press', home).player;
    expect(coachedTrainingMultiplier(unfinished, 'double')).toBe(1);
    const malformed = learned('press', { coachedStyleCourse: { v: 1, to: 'runner', weeksLeft: 6.5, weeksTotal: 6 } });
    expect(coachedTrainingMultiplier(malformed, 'double')).toBe(1);
  });

  it('retains malformed unfinished payloads as inactive instead of repairing or completing them', () => {
    for (const course of [
      { v: 1, to: 'press', weeksLeft: 0, weeksTotal: 6 },
      { v: 1, to: 'press', weeksLeft: -1, weeksTotal: 6 },
      { v: 1, to: 'press', weeksLeft: 1.5, weeksTotal: 6 },
      { v: 1, to: 'press', weeksLeft: 7, weeksTotal: 6 },
      { v: 1, to: 'press', weeksLeft: 2, weeksTotal: 5 },
      { v: 2, to: 'press', weeksLeft: 2, weeksTotal: 6 },
      { v: 1, to: 'unknown', weeksLeft: 2, weeksTotal: 6 },
    ]) {
      const p = learned('press', { coachedStyleCourse: course });
      expect(readCoachedStyleCourse(p)).toBeNull();
      expect(tickCoachedStyle(p, week), 'COACHED_CORRUPT_COURSE_RETAINED').toBe(p);
      expect(coachedStyleFit(p, slot(['CM']), null, { ...balanced, press: 1 }).attack).toBe(0);
    }
  });
});