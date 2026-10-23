import {
  readCoachedStyle, readCoachedStyleCourse,
  isCoachedStyleId as styleId, hasMalformedCoachedStyle as malformed,
} from '@/lib/clubManagerTraitRuntime';
import type {
  CoachedStyleId, CoachedStylePlayer, CoachedCourseContext, CoachedStyleEdit,
} from '@/lib/clubManagerTraitRuntime';

export function coachedCourseRefusal(
  player: CoachedStylePlayer, context: CoachedCourseContext, target?: CoachedStyleId,
): string | null {
  if (context.live) return 'Finish the match before changing a coached-style course.';
  if (!context.owned || context.awayOnLoan || player.onLoan) return 'Only an owned player at this club can learn a coached style.';
  if (player.position === 'GK') return 'Coached styles are for outfield players.';
  if (malformed(player)) return 'This coached-style save needs review. Its stored data has been kept.';
  if (player.retraining) return 'Finish or cancel position retraining first.';
  if (target !== undefined) {
    if (!styleId(target)) return 'Choose one of the three coached styles.';
    if (readCoachedStyleCourse(player)) return 'Finish or cancel the current coached-style course first.';
    if (readCoachedStyle(player)?.id === target) return 'This player has already learned that coached style.';
  }
  return null;
}
export function startCoachedStyle<T extends CoachedStylePlayer>(
  player: T, target: CoachedStyleId, context: CoachedCourseContext,
): CoachedStyleEdit<T> {
  if (!styleId(target)) return { ok: false, player, reason: 'Choose one of the three coached styles.' };
  const reason = coachedCourseRefusal(player, context, target);
  if (reason) return { ok: false, player, reason };
  return { ok: true, reason: null, player: {
    ...player, coachedStyleCourse: { v: 1, to: target, weeksLeft: 6, weeksTotal: 6 },
  } };
}
export function cancelCoachedStyle<T extends CoachedStylePlayer>(
  player: T, context: CoachedCourseContext,
): CoachedStyleEdit<T> {
  const reason = coachedCourseRefusal(player, context);
  if (reason) return { ok: false, player, reason };
  if (!readCoachedStyleCourse(player)) return { ok: false, player, reason: 'This player has no coached-style course to cancel.' };
  const next = { ...player };
  delete next.coachedStyleCourse;
  return { ok: true, player: next, reason: null };
}
