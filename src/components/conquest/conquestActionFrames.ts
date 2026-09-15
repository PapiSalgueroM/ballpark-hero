import type { PlayEvent as FootballPlay } from '@/lib/conquestBattle';
import type { BasketballAction } from '@/lib/conquestBattleNba';

export type ActionPlay = FootballPlay & { action?: BasketballAction };
export type ActionKind = FootballPlay['type'] | BasketballAction | 'unknown';
export type Point = { x: number; y: number };
export interface ActorPose extends Point { run?: number; lean?: number; hand?: Point; foot?: Point }
export interface ActionFrame { offense: ActorPose; defense: ActorPose; receiver?: ActorPose; ball: Point }
export const part = (p: number, start: number, end: number) => Math.max(0, Math.min(1, (p - start) / (end - start)));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const line = (a: Point, b: Point, p: number): Point => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p) });
const arc = (a: Point, b: Point, p: number, lift: number): Point => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p) - Math.sin(p * Math.PI) * lift });
const stride = (p: number) => Math.sin(p * Math.PI * 6);

export function actionOf(sport: 'nfl' | 'nba', play: ActionPlay): ActionKind {
  return sport === 'nfl' ? play.type : play.action ?? 'unknown';
}
export function playPoints(play: ActionPlay, previous?: ActionPlay): number {
  return play.team === 'att' ? play.attScore - (previous?.attScore ?? 0) : play.defScore - (previous?.defScore ?? 0);
}

/** A compact view of one committed play. Field positions are illustrative;
 * yards and scores remain the engine's values in the caption. */
export function footballFrame(action: ActionKind, yards: number, scored: boolean, p: number): ActionFrame {
  const run = stride(p) * (p < 0.88 ? 1 : 0);
  const offense: ActorPose = { x: 68, y: 137, hand: { x: 81, y: 106 } };
  const defense: ActorPose = { x: 245, y: 137, run };
  let ball: Point = offense.hand!;
  let receiver: ActorPose | undefined;
  if (action === 'pass' || action === 'interception') {
    const release = { x: 84, y: 99 };
    offense.hand = p <= 0.2 ? line({ x: 59, y: 99 }, release, part(p, 0, 0.2)) : { x: 92, y: 111 };
    receiver = { x: mix(152, Math.min(287, 175 + Math.max(0, yards) * 2.2), part(p, 0, 0.68)), y: 126, run };
    defense.x = mix(260, action === 'interception' ? 193 : receiver.x + 28, part(p, 0, 0.68));
    const catchAt = action === 'interception' ? { x: 184, y: 95 } : { x: Math.min(287, 175 + Math.max(0, yards) * 2.2) + 6, y: 95 };
    if (action === 'interception') defense.hand = line({ x: defense.x - 10, y: defense.y - 24 }, catchAt, part(p, 0.46, 0.7));
    else receiver.hand = line({ x: receiver.x + 8, y: receiver.y - 24 }, catchAt, part(p, 0.48, 0.7));
    ball = p < 0.2 ? offense.hand : arc(release, catchAt, part(p, 0.2, 0.7), 34);
    if (p > 0.7) {
      const carry = part(p, 0.7, 1);
      if (action === 'interception') {
        defense.hand = { x: defense.x - 9, y: mix(95, 105, carry) };
        ball = defense.hand;
      } else {
        receiver.x = mix(receiver.x, scored ? 324 : receiver.x + 12, carry);
        receiver.hand = { x: receiver.x + mix(6, 8, carry), y: mix(95, 101, carry) };
        ball = receiver.hand;
      }
    }
  } else if (action === 'rush' || action === 'fumble') {
    offense.x = mix(68, scored ? 323 : 98 + Math.min(32, Math.max(0, yards)) * 4.5, part(p, 0, 0.85));
    if (action === 'fumble') offense.x = mix(68, 159, part(p, 0, 0.55));
    offense.run = run;
    offense.lean = 8;
    offense.hand = { x: offense.x + 12, y: 110 };
    defense.x = mix(action === 'fumble' ? 230 : 280, offense.x + 22, part(p, 0, action === 'fumble' ? 0.55 : 0.8));
    defense.hand = line({ x: defense.x - 12, y: 115 }, { x: offense.x + 12, y: 110 }, action === 'fumble' ? part(p, 0.36, 0.55) : part(p, 0.65, 0.88));
    if (action === 'fumble' && p > 0.6) defense.hand = line({ x: 171, y: 110 }, { x: defense.x - 12, y: 115 }, part(p, 0.6, 1));
    ball = action === 'fumble' && p > 0.55
      ? arc({ x: 171, y: 110 }, { x: 191, y: 140 }, part(p, 0.55, 1), 12)
      : offense.hand;
  } else if (action === 'sack') {
    const contact = part(p, 0.3, 0.82);
    offense.x -= contact * 15;
    offense.lean = contact * 64;
    offense.hand = { x: offense.x + 16, y: 107 + contact * 15 };
    defense.x = mix(188, offense.x + 23, part(p, 0, 0.76));
    defense.lean = -contact * 28;
    defense.hand = line({ x: defense.x - 12, y: 115 }, { x: offense.x + 9, y: 111 + contact * 9 }, part(p, 0.4, 0.8));
    ball = offense.hand;
  } else if (action === 'field_goal' || action === 'punt') {
    offense.x = 88;
    offense.lean = Math.sin(p * Math.PI) * -14;
    offense.foot = p < 0.18
      ? line({ x: 81, y: 133 }, { x: 102, y: 136 }, part(p, 0, 0.18))
      : line({ x: 102, y: 136 }, { x: 119, y: 111 }, part(p, 0.18, 0.55));
    defense.x = 210;
    const target = action === 'punt' ? { x: 294, y: 91 } : scored ? { x: 302, y: 46 } : { x: 341, y: 72 };
    ball = p < 0.18 ? { x: 102, y: 136 } : arc({ x: 102, y: 136 }, target, part(p, 0.18, 0.92), 36);
  }
  return { offense, defense, receiver, ball };
}

export function basketballFrame(action: ActionKind, scored: boolean, p: number): ActionFrame {
  const run = stride(p) * (p < 0.75 ? 1 : 0);
  const offense: ActorPose = { x: 70, y: 141 };
  const defense: ActorPose = { x: 225, y: 141 };
  let receiver: ActorPose | undefined;
  let ball: Point = { x: 83, y: 116 };
  const rim = { x: 290, y: 67 };
  if (action === 'three' || action === 'free_throw') {
    offense.x = action === 'free_throw' ? 169 : 72;
    const jump = action === 'three' ? Math.sin(part(p, 0, 0.5) * Math.PI) * 9 : 0;
    offense.y -= jump;
    const release = { x: offense.x + 14, y: 87 };
    offense.hand = p <= 0.22 ? line({ x: offense.x + 12, y: 113 }, release, part(p, 0, 0.22)) : { x: offense.x + 17, y: offense.y - 45 };
    defense.x = action === 'free_throw' ? 252 : 112;
    defense.hand = action === 'three' ? { x: 106, y: 88 + part(p, 0.6, 1) * 24 } : undefined;
    ball = p < 0.22 ? offense.hand : arc(release, scored ? rim : { x: 281, y: 65 }, part(p, 0.22, 0.78), action === 'three' ? 53 : 38);
    if (p > 0.78) ball = scored
      ? line(rim, { x: 290, y: 97 }, part(p, 0.78, 1))
      : arc({ x: 281, y: 65 }, { x: 244, y: 124 }, part(p, 0.78, 1), 18);
  } else if (action === 'drive' || action === 'and_one' || action === 'block') {
    offense.x = mix(78, 246, part(p, 0, 0.5));
    offense.y -= Math.sin(part(p, 0.36, 0.85) * Math.PI) * 27;
    offense.run = p < 0.4 ? run : 0;
    const release = { x: 263, y: 73 };
    const lift = part(p, 0.38, 0.55);
    offense.hand = line({ x: offense.x + 14, y: offense.y - 21 }, release, lift);
    if (p > 0.65) offense.hand = line(release, { x: offense.x + 12, y: offense.y - 25 }, part(p, 0.65, 1));
    defense.x = mix(273, 267, p);
    defense.y -= action === 'block' ? Math.sin(part(p, 0.4, 0.88) * Math.PI) * 24 : 0;
    defense.hand = action === 'block'
      ? line({ x: defense.x - 12, y: defense.y - 24 }, { x: 272, y: 67 }, part(p, 0.4, 0.68))
      : { x: 262, y: 110 };
    if (action === 'block' && p > 0.76) defense.hand = line({ x: 272, y: 67 }, { x: defense.x - 12, y: defense.y - 24 }, part(p, 0.76, 1));
    if (p < 0.32) ball = { x: offense.x + 14, y: 115 + Math.abs(Math.sin(p * Math.PI * 7)) * 23 };
    else if (p < 0.55) ball = line({ x: 78 + 168 * (0.32 / 0.5) + 14, y: 115 + Math.abs(Math.sin(0.32 * Math.PI * 7)) * 23 }, offense.hand, part(p, 0.32, 0.55));
    else ball = arc(release, action === 'block' ? { x: 272, y: 67 } : rim, part(p, 0.55, 0.75), 9);
    if (p > 0.75) ball = action === 'block'
      ? arc({ x: 272, y: 67 }, { x: 204, y: 132 }, part(p, 0.75, 1), 12)
      : line(rim, { x: 290, y: 97 }, part(p, 0.75, 1));
  } else if (action === 'strip' || action === 'steal') {
    offense.x = action === 'strip' ? mix(78, 166, part(p, 0, 0.52)) : 70;
    offense.run = action === 'strip' ? run : 0;
    offense.hand = { x: offense.x + 15, y: 113 };
    defense.x = mix(238, 195, part(p, 0, 0.6));
    defense.run = run;
    const contact = { x: 182, y: 111 };
    defense.hand = line({ x: defense.x - 12, y: 115 }, contact, part(p, 0.3, 0.6));
    if (action === 'steal') receiver = { x: 273, y: 135, hand: { x: 261, y: 103 } };
    ball = action === 'steal' ? line({ x: 85, y: 113 }, contact, part(p, 0.18, 0.6))
      : p > 0.52 ? line(offense.hand, contact, part(p, 0.52, 0.6)) : offense.hand;
    if (p > 0.6) {
      const carry = part(p, 0.6, 1);
      defense.x -= carry * 34;
      defense.hand = { x: defense.x + mix(-13, -12, carry), y: mix(111, 115, carry) };
      ball = defense.hand;
    }
  }
  return { offense, defense, receiver, ball };
}
