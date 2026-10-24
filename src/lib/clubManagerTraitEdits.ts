import {
  readCoachedStyle, readCoachedStyleCourse,
  isCoachedStyleId as styleId, hasMalformedCoachedStyle as malformed,
} from '@/lib/clubManagerTraitRuntime';
import type {
  CoachedStyleId, CoachedStylePlayer, CoachedCourseContext,
} from '@/lib/clubManagerTraitRuntime';

export type CoachedStyleRefusalCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CoachedStyleCodeEdit<T> =
  | { ok: true; player: T; code: 0 }
  | { ok: false; player: T; code: Exclude<CoachedStyleRefusalCode, 0> };

export function coachedCourseRefusalCode(
  player: CoachedStylePlayer, context: CoachedCourseContext, target?: CoachedStyleId,
): CoachedStyleRefusalCode {
  if (context.live) return 1;
  if (!context.owned || context.awayOnLoan || player.onLoan) return 2;
  if (player.position === 'GK') return 3;
  if (malformed(player)) return 4;
  if (player.retraining) return 5;
  if (target !== undefined) {
    if (!styleId(target)) return 6;
    if (readCoachedStyleCourse(player)) return 7;
    if (readCoachedStyle(player)?.id === target) return 8;
  }
  return 0;
}
export function tryStartCoachedStyle<T extends CoachedStylePlayer>(
  player: T, target: CoachedStyleId, context: CoachedCourseContext,
): CoachedStyleCodeEdit<T> {
  if (!styleId(target)) return { ok: false, player, code: 6 };
  const code = coachedCourseRefusalCode(player, context, target);
  if (code) return { ok: false, player, code };
  return { ok: true, code: 0, player: {
    ...player, coachedStyleCourse: { v: 1, to: target, weeksLeft: 6, weeksTotal: 6 },
  } };
}
export function tryCancelCoachedStyle<T extends CoachedStylePlayer>(
  player: T, context: CoachedCourseContext,
): CoachedStyleCodeEdit<T> {
  const code = coachedCourseRefusalCode(player, context);
  if (code) return { ok: false, player, code };
  if (!readCoachedStyleCourse(player)) return { ok: false, player, code: 9 };
  const next = { ...player };
  delete next.coachedStyleCourse;
  return { ok: true, player: next, code: 0 };
}
