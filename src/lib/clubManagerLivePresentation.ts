import type { CareerState, LiveMatch, Duty, LiveFeedEvent } from '@/lib/clubManager';
import { clockOrder } from '@/lib/clubManagerClock';

/** Round 1522: the shape in force at a minute (myOnPitchAt's order reads in it): the last reshape before the
 *  minute, or the kick off's. */
export function liveShapeAt(live: LiveMatch, minute: number): { formationIndex: number | undefined; duties: (Duty | null)[] | undefined; customShape?: unknown } {
  const last = [...(live.formChanges ?? [])].reverse().find(f => f.minute < minute);
  const shape = last ?? live.kickoffShape ?? live;
  return { formationIndex: shape.formationIndex, duties: shape.duties,
    ...(live.positionRules === 1 && Object.prototype.hasOwnProperty.call(shape, 'customShape') ? { customShape: shape.customShape } : {}) };
}

/**
 * Squad numbers for the day. No roster the game holds carries a real shirt
 * number and a real player's number is a checkable fact, so these are the
 * classic 1 to 11 by slot (the keeper 1) and 12 onward for the bench in
 * squad order, and the help copy says exactly that. Deterministic, so the
 * same save prints the same numbers every time.
 */
export function squadNumbers(career: CareerState, live: LiveMatch): Map<string, number> {
  const map = new Map<string, number>();
  live.startXi.forEach((id, i) => map.set(id, i + 1));
  let n = 12;
  for (const p of career.squad) if (!map.has(p.id)) map.set(p.id, n++);
  return map;
}

const plusOf = (e: { plus?: number }): { plus?: number } => (e.plus ? { plus: e.plus } : {});

/**
 * Everything the engine has committed for this match so far, in minute
 * order, for the viewer to walk. A shot on target that was not a goal is a
 * save; a goal comes from its scorer line and its chance is left out, so
 * nothing is listed twice.
 */
export function liveFeed(live: LiveMatch): LiveFeedEvent[] {
  const out: LiveFeedEvent[] = [];
  const flags = (g: { penalty?: boolean; freeKick?: boolean }): Partial<LiveFeedEvent> => ({
    ...(g.penalty ? { penalty: true } : {}), ...(g.freeKick ? { freeKick: true } : {}),
  });
  /* Round 1146: an own goal's line names the man who put it in (one of the other side's), and says so. */
  for (const g of [...(live.h1My ?? []), ...(live.h2My ?? [])]) out.push({ minute: g.minute, side: 'me', kind: 'goal', text: g.og ? g.og.n : g.name, ...flags(g), ...(g.og ? { og: true } : {}), ...plusOf(g) });
  for (const g of [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])]) out.push({ minute: g.minute, side: 'opp', kind: 'goal', text: g.name, ...flags(g), ...(g.og ? { og: true } : {}), ...plusOf(g) });
  for (const e of [...(live.h1Play ?? []), ...(live.h2Play ?? [])]) {
    if (e.goal) continue;
    out.push({
      minute: e.minute, side: e.side, kind: e.kind === 'shot' ? (e.on ? 'save' : 'shot') : e.kind, text: e.who,
      ...(e.flank ? { flank: e.flank } : {}), ...(e.penalty ? { penalty: true } : {}), ...(e.review ? { review: e.review } : {}), ...plusOf(e),
    });
  }
  for (const c of [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])]) out.push({ minute: c.minute, side: 'me', kind: c.kind, text: c.name, ...plusOf(c) });
  for (const c of [...(live.h1OppCards ?? []), ...(live.h2OppCards ?? [])]) out.push({ minute: c.minute, side: 'opp', kind: c.kind, text: c.name, ...plusOf(c) });
  for (const inj of [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])]) out.push({ minute: inj.minute, side: 'me', kind: 'injury', text: inj.name, ...plusOf(inj) });
  for (const s of live.subs ?? []) out.push({ minute: s.minute, side: 'me', kind: 'sub', text: `${s.on} on for ${s.off}`, ...plusOf(s) });
  for (const s of live.oppSubs ?? []) out.push({ minute: s.minute, side: 'opp', kind: 'sub', text: `${s.on} on for ${s.off}`, ...plusOf(s) });
  /* Round 781: the break sits after the first half's board, when one has been drawn. */
  out.push({ minute: 45, side: 'none', kind: 'halftime', text: 'Half time', ...plusOf({ plus: live.added?.h1 }) });
  const ORDER: Record<LiveFeedEvent['kind'], number> = {
    throwin: 0, foul: 1, corner: 2, var: 2.5, shot: 3, save: 3, goal: 4, yellow: 5, red: 5, injury: 5, sub: 6, halftime: 7,
  };
  return out.sort((a, b) => clockOrder(a, b) || ORDER[a.kind] - ORDER[b.kind]);
}

