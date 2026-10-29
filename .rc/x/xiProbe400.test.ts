// Reviewer xi400 probe: the base rule (601435944's xiFit.ts, copied to src/lib/xiFitBase.ts on the runner)
// against the head's, over every single slot case and over seeded elevens that the pick gate would accept.
import { describe, expect, it } from 'vitest';
import * as head from '@/lib/xiFit';
import * as base from '@/lib/xiFitBase';
import { ALL_POSITIONS, fitsAllowed, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';
import { FORMATIONS, type Formation, type FilledSlot } from '@/types/lineupBuilder';
import { simulateWorldXiSeason, type WxPlayer } from '@/lib/worldXi';
import type { Position } from '@/types/game';

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROLES = Object.keys(SLOT_ALLOWED_BY_ROLE) as Position[];

describe('xi400 probe', () => {
  it('single slot: only a primary LB at LWB and a primary RB at RWB change, family to natural', () => {
    const playedSets: (Position[] | undefined)[] = [undefined, [], ...ALL_POSITIONS.map(p => [p])];
    let cases = 0;
    const diffs: string[] = [];
    let sameSideUnchanged = 0;
    for (const role of ROLES) {
      for (const primary of [...ALL_POSITIONS, null] as (Position | null)[]) {
        for (const played of playedSets) {
          const slot = { role, label: role };
          const filled = new Map<number, FilledSlot>([[0, { ...slot, playerName: 'X', assignedTeam: '', isNation: false, pick: primary ? { position: primary, played } : {} } as FilledSlot]]);
          const hb = head.xiFitBreakdown(head.lineupFitSlots([slot], filled));
          const bb = base.xiFitBreakdown(base.lineupFitSlots([slot], filled));
          cases += 1;
          const same = JSON.stringify(hb) === JSON.stringify(bb);
          const sameSide = (role === 'LWB' && primary === 'LB') || (role === 'RWB' && primary === 'RB');
          if (!same) diffs.push(`${role}|${primary}|${played ? played.join('+') || 'none' : 'undef'}|${bb.roleFit.grades[0]}->${hb.roleFit.grades[0]}`);
          else if (sameSide) sameSideUnchanged += 1;
        }
      }
    }
    console.log(`PROBE single: ${cases} cases, ${diffs.length} differ, ${sameSideUnchanged} same side cases already natural`);
    console.log(`PROBE single diffs: ${diffs.join(' ; ')}`);
    for (const d of diffs) {
      const [role, primary, , change] = d.split('|');
      expect((role === 'LWB' && primary === 'LB') || (role === 'RWB' && primary === 'RB'), d).toBe(true);
      expect(change, d).toBe('family->natural');
    }
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('elevens the gate accepts: only role fit moves, never down, and the season never loses points', () => {
    const rand = mulberry(400);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    let elevens = 0, withPair = 0, identical = 0, roleUp = 0, pointsUp = 0, pointsDown = 0, pointsSame = 0;
    let gain = 0, ptsGain = 0, maxDown = 0;
    const formations = Object.keys(FORMATIONS) as Formation[];
    for (const f of formations) {
      const positions = FORMATIONS[f];
      for (let k = 0; k < 1500; k++) {
        const filled = new Map<number, FilledSlot>();
        const squad: WxPlayer[] = [];
        let pair = false;
        positions.forEach((slot, i) => {
          const allowed = SLOT_ALLOWED_BY_ROLE[slot.role];
          const gateOk = ALL_POSITIONS.filter(p => fitsAllowed(p, allowed));
          const sameSideFb = slot.role === 'LWB' ? 'LB' : slot.role === 'RWB' ? 'RB' : null;
          const primary: Position = sameSideFb && rand() < 0.35 ? sameSideFb : pick(gateOk);
          const played = rand() < 0.2 ? [pick(ALL_POSITIONS)] : undefined;
          if (sameSideFb && primary === sameSideFb) pair = true;
          const club = `Club ${1 + Math.floor(rand() * 4)}`;
          const nationality = `Land ${1 + Math.floor(rand() * 4)}`;
          const value = Math.round((1 + rand() * 99) * 1e6);
          const age = 18 + Math.floor(rand() * 17);
          filled.set(i, { ...slot, playerName: `P${f}-${k}-${i}`, assignedTeam: '', isNation: false, pick: { position: primary, played, club, nationality, value, age } } as FilledSlot);
          squad.push({ name: `P${f}-${k}-${i}`, country: nationality, position: primary, club, value, age });
        });
        const hb = head.xiFitBreakdown(head.lineupFitSlots(positions, filled));
        const bb = base.xiFitBreakdown(base.lineupFitSlots(positions, filled));
        elevens += 1;
        if (pair) withPair += 1;
        expect(JSON.stringify(hb.chemistry)).toBe(JSON.stringify(bb.chemistry));
        expect(JSON.stringify(hb.balance)).toBe(JSON.stringify(bb.balance));
        expect(hb.roleFit.value).toBeGreaterThanOrEqual(bb.roleFit.value);
        if (!pair) expect(JSON.stringify(hb)).toBe(JSON.stringify(bb));
        if (JSON.stringify(hb) === JSON.stringify(bb)) identical += 1;
        if (hb.roleFit.value > bb.roleFit.value) { roleUp += 1; gain += hb.roleFit.value - bb.roleFit.value; }
        const hs = simulateWorldXiSeason(squad, f, head.seasonAdjust(hb));
        const bs = simulateWorldXiSeason(squad, f, base.seasonAdjust(bb));
        if (hs.points > bs.points) { pointsUp += 1; ptsGain += hs.points - bs.points; }
        else if (hs.points < bs.points) { pointsDown += 1; maxDown = Math.max(maxDown, bs.points - hs.points); }
        else pointsSame += 1;
        if (JSON.stringify(hb) === JSON.stringify(bb)) expect(JSON.stringify(hs)).toBe(JSON.stringify(bs));
      }
    }
    console.log(`PROBE elevens: ${elevens} (${withPair} with a same side full back at wing back), ${identical} identical breakdowns, role fit up in ${roleUp} (mean +${roleUp ? (gain / roleUp).toFixed(3) : 0})`);
    console.log(`PROBE seasons: points up ${pointsUp} (mean +${pointsUp ? (ptsGain / pointsUp).toFixed(2) : 0}), same ${pointsSame}, DOWN ${pointsDown} (largest ${maxDown})`);
    expect(pointsDown).toBe(0);
  });
});
