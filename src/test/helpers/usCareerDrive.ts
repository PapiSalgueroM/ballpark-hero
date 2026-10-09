/**
 * Round 1104: one seeded career, driven through a sport's BINDING the way the
 * board drives it (src/components/us-career/UsCareerBoard.tsx), for the two
 * recorded fixtures of the round: the truth digest and the bank's before.
 *
 * Math.random is replaced by a keyed generator for the whole drive and put
 * back in a finally, because the bindings dismiss a rivalry beat with no
 * generator handed in (the engine then falls back to Math.random). Without
 * that a recording differs from run to run. Each test proves the drive is
 * repeatable before it trusts a fixture.
 *
 * What the loop plays, per season: a suspended year when one is owed, the free
 * agency window when the deal has run out (a keyed pick among the offers), the
 * camp, the season, progress, the summer's cards (a keyed option pick each),
 * one unread inbox text, a pending rivalry beat and a pending rival choice.
 * Extension talks are always turned down: the board allows that, and it keeps
 * the loop short.
 */
import { createHash } from 'node:crypto';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { applyFaSigning } from '@/lib/usCareerFreeAgency';
import { answerSummerCard, startSummer } from '@/lib/usCareerSummer';

const hashStr = (s: string): number => {
  let h = 0x811c9dc5 >>> 0;
  for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
};

/** A keyed stream: the same key gives the same draws in any process. */
export function keyedStream(key: string): () => number {
  let a = hashStr(`r1104:${key}`);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const sha = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 16);

export interface DriveOptions {
  /** Names the career and keys every stream. */
  key: string;
  pos: string;
  /** Which of the position's archetypes, taken modulo the list. */
  arch: number;
  eraId?: string;
  seasons: number;
}

export interface DriveResult {
  /** The whole final save, as JSON. */
  json: string;
  /** The lowest bank balance seen after any call. */
  lowest: number;
  /** How many calls left the balance below zero. */
  below: number;
  seasons: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCareer = any;

export function driveCareer(sport: UsCareerSport, o: DriveOptions): DriveResult {
  const keep = Math.random;
  Math.random = keyedStream(`math:${sport.slug}:${o.key}`);
  const pick = keyedStream(`pick:${sport.slug}:${o.key}`);
  let lowest = Infinity;
  let below = 0;
  const see = (c: AnyCareer) => {
    const n = typeof c.netWorth === 'number' ? c.netWorth : 0;
    if (n < lowest) lowest = n;
    if (n < 0) below += 1;
  };
  try {
    const archs = sport.create.archetypes[o.pos];
    let c: AnyCareer = sport.startCareer(`Drive ${o.key}`, o.pos, archs[o.arch % archs.length], Math.random, null as never, o.eraId as string);
    let tq = sport.rollTeamQuality(null, Math.random);
    sport.assignRole(c, tq, Math.random);
    see(c);
    for (let n = 0; n < o.seasons && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(sport.suspendedLine(c));
        sport.progress(c, Math.random); see(c);
        continue;
      }
      if (c.contractYears <= 0) {
        const fa = sport.buildFaWindow(c, tq, Math.random);
        const open = fa.offers.filter(x => !x.gone);
        if (open.length) {
          const offer = open[Math.floor(pick() * open.length)];
          applyFaSigning(c, offer);
          sport.campBattle(c, offer.quality, Math.random);
          tq = offer.quality;
        }
      }
      sport.campBattle(c, tq, Math.random);
      sport.simSeason(c, tq, Math.random); see(c);
      sport.progress(c, Math.random); see(c);
      if (sport.shouldRetire(c)) { c.retired = true; break; }
      let ev = startSummer(c, sport, Math.random, null);
      while (ev) {
        const k = Math.floor(pick() * ev.options.length);
        ev = answerSummerCard(c, sport, ev, k, Math.random, null).next; see(c);
      }
      tq = sport.rollTeamQuality(tq, Math.random);
      const unread = (c.phoneInbox ?? []).find((m: AnyCareer) => m.answered === undefined);
      if (unread) { sport.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length)); see(c); }
      if (c.pendingRivalryEvent) { c = sport.dismissRivalryEvent(c).state; see(c); }
      if (c.pendingRivalryChoice) {
        const res = sport.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), Math.random);
        if (res) { c = res.state; see(c); }
      }
    }
    return { json: JSON.stringify(c), lowest: lowest === Infinity ? 0 : lowest, below, seasons: c.seasons.length };
  } finally {
    Math.random = keep;
  }
}
