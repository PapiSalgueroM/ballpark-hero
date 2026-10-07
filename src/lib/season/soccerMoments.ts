/* Round 1047: Soccer Career's moments on the training ground's own engines.

   A Season Centre moment is ONE round of a drill the game already has: a
   finish is the Wall Shot (takeWallShot), a tackle is the Tackle
   (makeTackle), a save is the Glove Save (makeSave) and a pass is the
   Through Ball (takeThroughBall). Nothing is copied: this file only picks
   the round, settles it and banks the stars.

   - The setup is round k of build*Run(seed), where the seed is keyed on the
     season, the matchday and the moment, and k follows what rides on it, so
     a late one in a derby is a harder round than a dead rubber.
   - The wall shot's spray and keeper draw from a generator keyed the same
     way and made fresh for every settle, so the same input always gives the
     same result. A moment is one shot, so that stream is the first of eight
     keyed ones on which the textbook strike scores (the middle of the gap, up
     high, as
     it opens widest, medium power; scripts/simSeasonMoments.mjs measures it at
     119 or 120 of 120 moments): played right it goes in, anything else
     takes its chances. The other three engines draw nothing.
   - The input is rounded to four places before it is settled, so the entry
     the save keeps replays to exactly the result the player saw.
   - Stars: none for a miss; a make earns one to three by how well it was
     struck (the engine's own measure of the corner, the touch, the catch,
     the weight of the pass).
   - The bank is the drills' rule (applyDrillResult): once a season, the
     stat his position trains, never past the ceiling, and it lands with
     next season's growth. No Math.random anywhere in this file. */
import type { CareerState } from '../soccerCareerEngine';
import { keyedRng } from '../keyedRng';
import {
  ROUNDS_PER_RUN, drillForPosition, drillHeadroom, drillStatFor,
  buildWallShotRun, takeWallShot, wallNextPeak, wallTravel, buildTackleRun, makeTackle, buildGloveRun, makeSave,
  type WallShotSetup, type TackleSetup, type GloveSetup, type PositionDrillKind,
} from '../careerDrills';
import { LEAD_IDEAL, buildThroughBallRun, collectWindow, takeThroughBall, type ThroughBallSetup } from '../throughBallDrill';
import { ledgerBanked, readSeasonMoments } from './momentsSave';
import { soccerSeasonKey } from './soccer';
import type { SoccerMomentKind } from './soccerEvents';

/** Which board plays which moment. */
export const MOMENT_BOARD: Record<SoccerMomentKind, PositionDrillKind> = { finish: 'wallshot', tackle: 'tackle', save: 'gloves', pass: 'throughball' };
export const MOMENT_STARS_MAX = 3;
export type MomentSetup = WallShotSetup | TackleSetup | GloveSetup | ThroughBallSetup;

const momentTag = (key: string, md: number, id: number) => `${key}|moment|${md}|${id}`;

/** The run a moment's round comes from: a seed the drills' own generator takes. */
export function momentSeed(key: string, md: number, id: number): number {
  return 1 + Math.floor(keyedRng(momentTag(key, md, id))() * 2147483645);
}

/** The round of the run, 2 (a dead rubber) to 7 (a late one in a close derby). */
export function momentRound(stakes: number): number {
  const s = Number.isFinite(stakes) ? Math.min(1, Math.max(0, stakes)) : 0;
  return Math.min(ROUNDS_PER_RUN - 1, 2 + Math.round(s * 5));
}

/** The textbook strike on a wall shot: the middle of the gap, up high,
 *  medium power, timed to arrive as the gap is widest. */
export function textbookStrike(setup: WallShotSetup): number[] {
  const power = 0.6;
  let peak = wallNextPeak(setup, 0);
  if (peak - wallTravel(power) < 0) peak += setup.period;
  return packMomentInput([setup.gapCentre, 0.85, power, peak - wallTravel(power)]);
}

const SHOT_STREAMS = 8;
/** A fresh generator for one settle of the wall shot: the first of the
 *  moment's keyed streams on which the textbook strike scores (the first one
 *  when none does, or when no setup is given). */
export function momentShotRng(key: string, md: number, id: number, setup?: WallShotSetup): () => number {
  const tag = `${momentTag(key, md, id)}|shot`;
  if (setup) {
    const [x, y, power, press] = textbookStrike(setup);
    for (let n = 0; n < SHOT_STREAMS; n += 1) {
      if (takeWallShot({ x, y, power, press }, setup, keyedRng(`${tag}|${n}`)).won) return keyedRng(`${tag}|${n}`);
    }
  }
  return keyedRng(`${tag}|0`);
}

export function momentSetup(board: PositionDrillKind, seed: number, round: number): MomentSetup {
  if (board === 'wallshot') return buildWallShotRun(seed)[round];
  if (board === 'tackle') return buildTackleRun(seed)[round];
  if (board === 'gloves') return buildGloveRun(seed)[round];
  return buildThroughBallRun(seed)[round];
}

/** The input as the save keeps it: four places, finite. */
export function packMomentInput(input: readonly number[]): number[] {
  return input.map(v => (Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0));
}

const starsFor = (quality: number) => (quality >= 2 / 3 ? 3 : quality >= 1 / 3 ? 2 : 1);

export interface MomentPlay { won: boolean; stars: number; verdict: string; quality: number }

/** Settle one moment from its packed input: the engine's own verdict, and the stars. */
export function settleMoment(board: PositionDrillKind, setup: MomentSetup, input: readonly number[], rng: () => number): MomentPlay {
  const i = packMomentInput(input);
  if (board === 'wallshot') {
    const r = takeWallShot({ x: i[0] ?? 0, y: i[1] ?? 0, power: i[2] ?? 0, press: i[3] ?? 0 }, setup as WallShotSetup, rng);
    /* the engine pays the corner: how far from the middle, or how high */
    const quality = Math.min(1, Math.max(Math.abs(r.x), r.y > 0.5 ? r.y : 0));
    return { won: r.won, stars: r.won ? starsFor(quality) : 0, verdict: r.verdict, quality: r.won ? quality : 0 };
  }
  if (board === 'tackle') {
    const s = setup as TackleSetup;
    const r = makeTackle({ x: i[0] ?? -1, y: i[1] ?? -1, press: i[2] ?? 0 }, s);
    /* the engine pays how loose the ball was and how clean the contact: 40 each */
    const base = Math.round(80 + s.speed * 100 + (0.22 - s.touchLen) * 300);
    const quality = Math.min(1, Math.max(0, (r.points - base) / 80));
    return { won: r.won, stars: r.won ? starsFor(quality) : 0, verdict: r.verdict, quality: r.won ? quality : 0 };
  }
  if (board === 'gloves') {
    const s = setup as GloveSetup;
    const r = makeSave({ dx: i[0] ?? 0, dy: i[1] ?? 0, release: i[2] ?? 0 }, s);
    /* how much of the glove was behind the ball */
    const d = Math.hypot(r.gloveX - s.target.x, r.gloveY - s.target.y);
    const quality = r.radius > 0 ? Math.min(1, Math.max(0, 1 - d / r.radius)) : 0;
    return { won: r.saved, stars: r.saved ? starsFor(quality) : 0, verdict: r.verdict, quality: r.saved ? quality : 0 };
  }
  const s = setup as ThroughBallSetup;
  const r = takeThroughBall({ angle: i[0] ?? 0, weight: i[1] ?? 0, press: i[2] ?? 0 }, s);
  /* how near to his stride the ball arrived: the ideal is LEAD_IDEAL ahead of him */
  const w = r.won ? collectWindow(s, r.target, r.press) : null;
  const quality = w ? Math.min(1, Math.max(0, 1 - Math.abs(w[0] - r.arrival - LEAD_IDEAL) / Math.max(0.25, s.wait))) : 0;
  return { won: r.won, stars: r.won ? starsFor(quality) : 0, verdict: r.verdict, quality };
}

/* ─── the bank ─── */

/** Room left under his ceiling once what is already coming next season is counted,
 *  so a drill bank and a moments bank in one season still stop at the ceiling. */
export function momentsRoom(s: Pick<CareerState, 'overall' | 'potential' | 'potentialEarned' | 'statBoostNextSeason'>): number {
  let pending = 0;
  for (const v of Object.values(s.statBoostNextSeason ?? {})) if (typeof v === 'number' && v > 0) pending += v;
  return Math.max(0, Math.floor(drillHeadroom(s)) - pending);
}

/** What a season's moments pay: 60 percent of the stars on offer is +1, 85 percent is +2, never past `room`. */
export function momentsBoost(stars: number, offered: number, room: number): number {
  const max = Math.max(0, offered) * MOMENT_STARS_MAX;
  const share = max > 0 ? stars / max : 0;
  const raw = share >= 0.85 ? 2 : share >= 0.6 ? 1 : 0;
  return Math.max(0, Math.min(raw, Math.floor(room)));
}

/** Bank this season's moments, once: the latest season only, after at least
 *  one moment was played (an attempt that was opened and left counts as a
 *  miss). `offered` is how many moments the season held. Pure, no draw; a
 *  career with no ledger comes back as the same object. */
export function applySeasonMomentsBank(prev: CareerState, offered: number): CareerState {
  const save = readSeasonMoments(prev.seasonMoments);
  if (!save || save.banked || save.m.length === 0) return prev;
  const row = prev.seasons[prev.seasons.length - 1];
  if (!row || save.key !== soccerSeasonKey(prev.playerName, row)) return prev;
  const n = Math.max(save.m.length, Math.min(12, Math.floor(offered) || 0));
  const stars = save.m.reduce((x, e) => x + (e[2] > 0 ? e[2] : 0), 0);
  const made = save.m.some(e => e[2] >= 1);
  const s: CareerState = { ...prev, seasonMoments: ledgerBanked(save) };
  const { stat, label } = drillStatFor(drillForPosition(s.position), s.position);
  const boost = momentsBoost(stars, n, momentsRoom(s));
  const head = `🎯 Season Centre moments: ${stars} of ${n * MOMENT_STARS_MAX} stars.`;
  if (boost > 0) {
    s.statBoostNextSeason = { ...s.statBoostNextSeason, [stat]: (s.statBoostNextSeason[stat] || 0) + boost };
    s.events = [...s.events, `${head} +${boost} ${label} coming with next season's growth`];
  } else if (momentsBoost(stars, n, 2) > 0) {
    s.events = [...s.events, `${head} Good hands, but you are at your ceiling and there is nothing left to add`];
  } else {
    s.events = [...s.events, `${head} No gains this time`];
  }
  if (made) s.morale = Math.min(100, Math.max(0, s.morale + 2));
  return s;
}

/** The stat a season's moments train for this player, in the attribute screen's word. */
export function momentsStatLabel(position: string): string {
  return drillStatFor(drillForPosition(position), position).label;
}
