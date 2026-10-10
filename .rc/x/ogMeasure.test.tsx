/* Round 1216, the measuring pass (a probe, never committed): where the named man stands when an own goal's
   action starts, on the dense fleet (every eligible goal is an own goal) read on the VIEWER'S cast. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import type { PitchPlaced } from '@/components/pitch-motion/scene';
import { actionFrame } from '@/components/pitch-motion/motion';
import { stagePitchInput, labelsShort } from '@/components/club-manager/LiveSimScreen';

vi.mock('@/lib/ownGoalRule', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/ownGoalRule')>()), ownGoalTagged: () => true }));

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const FIVE_CLUBS = [
  { seed: 110101, club: 'Aston Villa' }, { seed: 110102, club: 'Real Madrid' }, { seed: 110103, club: 'Lyon' },
  { seed: 110104, club: 'Ajax' }, { seed: 110105, club: 'Celtic' },
] as const;
const MATCHES_EACH = 20;
beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(seeded(603)); });
afterEach(() => { vi.restoreAllMocks(); });

function walkClub(seed: number, club: string, onHalf: (career: CareerState, stage: 'first' | 'second') => void) {
  vi.mocked(Math.random).mockImplementation(seeded(seed));
  let career = startCareer(club);
  delete career.realLeagueFixtures;
  let matches = 0;
  for (let guard = 0; guard < 400 && matches < MATCHES_EACH; guard++) {
    const next = playNextEntry(career);
    career = next.state;
    if (next.kind === 'seasonOver' || career.sacked) break;
    if (next.kind !== 'halftime' || !career.live) continue;
    onHalf(career, 'first');
    const second = startSecondHalf(career)!;
    onHalf(second, 'second');
    career = resumeMatch(second).state;
    matches++;
  }
  return matches;
}
const bounded = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => { const p = bounded(t); return p * p * (3 - 2 * p); };
const mixP = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const q = (values: number[], share: number) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(share * s.length))] : NaN; };
const row = (values: number[]) => `n ${values.length} min ${q(values, 0).toFixed(1)} p10 ${q(values, .1).toFixed(1)} med ${q(values, .5).toFixed(1)} p90 ${q(values, .9).toFixed(1)} max ${q(values, .9999).toFixed(1)}`;
const deg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const d = Math.abs(Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)) * 180 / Math.PI;
  return d > 180 ? 360 - d : d;
};
const TOUCH = .55;
interface Own { mine: boolean; wing: number; scene: { mine: PitchPlaced[]; theirs: PitchPlaced[]; ball: { x: number; y: number }; holderKey: string | null }; event: LiveFeedEvent; at: number; man: PitchPlaced | null; label: string }

describe('Round 1216 measuring pass', () => {
  it('prints where the man stands and what each geometry costs', () => {
    const owns: Own[] = [];
    let staged = 0, notOwnMinute = 0, lastKick = 0, plainGoals = 0, halves = 0, matches = 0;
    for (const { seed, club } of FIVE_CLUBS) {
      matches += walkClub(seed, club, (career, stage) => {
        halves++;
        const cap = stage === 'first' ? 45 : 90;
        const stop = cap + ((cap === 45 ? career.live!.added?.h1 : career.live!.added?.h2) ?? 0);
        const first = pitchPlan(stagePitchInput(career, career.live!, null, stage, stage === 'first' ? 0 : 46, 0, stop));
        for (const a of first.actions) {
          const e = a.event as LiveFeedEvent;
          if (e.kind !== 'goal') continue;
          if (!e.og) { plainGoals++; continue; }
          staged++;
          const place = e.minute + (e.plus ?? 0);
          const floorAt = Math.floor(a.at);
          if (floorAt !== Math.floor(place)) notOwnMinute++;
          if (a.at < place - 1e-9) lastKick++;
          const input = stagePitchInput(career, career.live!, null, stage, Math.min(cap, floorAt), Math.max(0, Math.min(stop, floorAt) - cap), stop);
          const plan = pitchPlan(input);
          const mineStaged = plan.actions.find(b => b.event.kind === 'goal' && b.event.side === e.side && b.event.minute === e.minute && (b.event.plus ?? 0) === (e.plus ?? 0));
          expect(mineStaged, 'the goal is staged on its own cast').toBeTruthy();
          const scene = pitchScene(plan, mineStaged!.at - .05);
          const mine = e.side === 'me';
          const conceding = mine ? scene.theirs : scene.mine;
          const wing = e.flank === 'left' ? -1 : e.flank === 'right' ? 1 : e.minute % 2 < 1 ? -1 : 1;
          owns.push({ mine, wing, scene, event: mineStaged!.event as LiveFeedEvent, at: mineStaged!.at, man: conceding.find(p => p.name === e.text) ?? null, label: `${club} ${e.minute}${e.plus ? '+' + e.plus : ''} ${e.side} ${e.text}` });
        }
      });
    }
    const present = owns.filter(o => o.man);
    const backs = present.filter(o => !o.man!.keeper), keepers = present.filter(o => o.man!.keeper);
    console.log(`[1216 measure] matches ${matches}, halves ${halves}, own goals staged ${staged} (plain goals left ${plainGoals}), for me ${owns.filter(o => o.mine).length}, against me ${owns.filter(o => !o.mine).length}`);
    console.log(`[1216 measure] the named man on the viewer's cast: ${present.length}, absent ${owns.length - present.length}; a back ${backs.length} (line ${JSON.stringify(backs.reduce((m: Record<string, number>, o) => { m[o.man!.line] = (m[o.man!.line] ?? 0) + 1; return m; }, {}))}), the keeper ${keepers.length}`);
    console.log(`[1216 measure] action starts outside the goal's own minute: ${notOwnMinute}; wound up as the last kick: ${lastKick}`);
    for (const o of owns.filter(x => !x.man).slice(0, 6)) console.log(`[1216 measure] absent: ${o.label}`);
    /* Everything below in the frame where the attacked goal line is y 0 (the other end mirrored along the pitch only). */
    const fy = (o: Own, y: number) => (o.mine ? y : 100 - y);
    const back = (o: Own, d: number) => (o.mine ? d : 100 - d);
    const deliverer = (o: Own) => { const att = o.mine ? o.scene.mine : o.scene.theirs; return att.find(p => p.key === o.scene.holderKey && !p.keeper) ?? att.find(p => !p.keeper)!; };
    console.log(`[1216 measure] back, from his own goal line: ${row(backs.map(o => fy(o, o.man!.y)))}`);
    console.log(`[1216 measure] back, across from the middle: ${row(backs.map(o => Math.abs(o.man!.x - 50)))}`);
    console.log(`[1216 measure] back, across from the deliverer: ${row(backs.map(o => Math.abs(o.man!.x - deliverer(o).x)))}`);
    console.log(`[1216 measure] keeper who is the man, from his line: ${row(keepers.map(o => fy(o, o.man!.y)))}; across from the middle: ${row(keepers.map(o => Math.abs(o.man!.x - 50)))}`);
    console.log(`[1216 measure] deliverer, from that goal line: ${row(present.map(o => fy(o, deliverer(o).y)))}; across from the middle: ${row(present.map(o => Math.abs(deliverer(o).x - 50)))}`);
    type Geometry = (o: Own, foot: { x: number; y: number }, end: { x: number; y: number }) => { x: number; y: number };
    const lineX = (foot: { x: number; y: number }, end: { x: number; y: number }, y: number) => foot.x + (end.x - foot.x) * ((y - foot.y) / (end.y - foot.y));
    const toMan = (half: number, off: number, lo: number, hi: number): Geometry => (o, foot, end) => {
      const d = Math.max(lo, Math.min(hi, fy(o, o.man!.y)));
      const y = back(o, d);
      let x = Math.max(50 - half, Math.min(50 + half, o.man!.x));
      const on = lineX(foot, end, y);
      if (Math.abs(x - on) < off) x = on + (x > on || (x === on && o.wing < 0) ? off : -off);
      return { x, y };
    };
    const toBall = (d: number): Geometry => (o, foot) => { const aim = { x: 50 - o.wing * 6, y: back(o, 0) }; const y = back(o, d); return { x: foot.x + (aim.x - foot.x) * ((y - foot.y) / (aim.y - foot.y)), y }; };
    const geometries: [string, Geometry][] = [
      ['man to ball, 13 out (the draft)', toBall(13)],
      ['ball to man, band 14, off 4, 13..16', toMan(14, 4, 13, 16)],
      ['ball to man, band 18, off 4, 13..16', toMan(18, 4, 13, 16)],
      ['ball to man, band 22, off 4, 13..16', toMan(22, 4, 13, 16)],
      ['ball to man, band 18, off 5, 13..18', toMan(18, 5, 13, 18)],
      ['ball to man, band 26, off 5, 13..18', toMan(26, 5, 13, 18)],
    ];
    for (const [name, geometry] of geometries) {
      const walks: number[] = [], turns: number[] = [];
      let crossed = 0, nearBall = 0, nearBallKeeper = 0, short = 0, onKeeper = 0;
      const examples: string[] = [];
      for (const o of backs) {
        const plain = { ...o.event, og: undefined, text: '' } as LiveFeedEvent;
        const action = { event: plain, key: 'probe', at: o.at };
        const d = deliverer(o);
        const spot = { x: Math.max(25, Math.min(75, d.x)), y: back(o, 26) };
        const foot = { x: spot.x + 1.3, y: spot.y + (o.mine ? -1 : 1) };
        const end = { x: 50 + o.wing * 7, y: back(o, 1) };
        const touch = geometry(o, foot, end);
        walks.push(Math.hypot(touch.x - o.man!.x, touch.y - o.man!.y));
        turns.push(deg({ x: touch.x - foot.x, y: touch.y - foot.y }, { x: end.x - touch.x, y: end.y - touch.y }));
        let before: string[] = [], ran = false, near = false, nearK = false, keeperBox = false, wasShort = false;
        for (let s = 0; s < 22; s++) {
          const elapsed = s * .05;
          const p = bounded(elapsed / 1.05);
          const flight = bounded((p - .24) / .48);
          const frame = actionFrame(o.scene, action, elapsed);
          const walked = smooth(p / (.24 + .48 * TOUCH));
          const side = (o.mine ? frame.theirs : frame.mine).map(f => (f.key === o.man!.key ? { ...f, ...mixP(o.man!, touch, walked) } : f));
          const now: string[] = [];
          for (let i = 0; i < side.length; i++) for (let j = i + 1; j < side.length; j++) if (Math.abs(side[i].x - side[j].x) < 2.5 && Math.abs(side[i].y - side[j].y) < 2.5) now.push(`${side[i].key}:${side[j].key}`);
          if (now.some(pair => before.includes(pair))) ran = true;
          before = now;
          const keeper = side.find(f => f.keeper);
          const me = side.find(f => f.key === o.man!.key)!;
          if (keeper && Math.abs(keeper.x - me.x) < 2.5 && Math.abs(keeper.y - me.y) < 2.5) keeperBox = true;
          if (flight > TOUCH && flight < 1) {
            const ball = mixP(touch, end, (flight - TOUCH) / (1 - TOUCH));
            const all = [...side, ...(o.mine ? frame.mine : frame.theirs)];
            for (const f of all) if (f.key !== o.man!.key && Math.hypot(f.x - ball.x, f.y - ball.y) < 2) { near = true; if (f.keeper) nearK = true; }
          }
          if (s === Math.round((.24 + .48 * TOUCH) * 1.05 / .05)) {
            const all = [...side, ...(o.mine ? frame.mine : frame.theirs)].map(f => ({ key: (f === me ? 'MAN' : '') + f.key, x: f.x, y: f.y }));
            wasShort = [...labelsShort(all)].some(k => k.startsWith('MAN'));
          }
        }
        if (ran) { crossed++; if (examples.length < 3) examples.push(`${o.label} walk ${walks[walks.length - 1].toFixed(1)}`); }
        if (near) nearBall++;
        if (nearK) nearBallKeeper++;
        if (keeperBox) onKeeper++;
        if (wasShort) short++;
      }
      console.log(`[1216 measure] ${name}: walk ${row(walks)} | turn ${row(turns)} | own goals with a team mate stood on two samples running ${crossed}, in the keeper's box ${onKeeper}, another figure within 2 of the second leg ${nearBall} (the keeper in ${nearBallKeeper}), the man short at the touch ${short}${examples.length ? ' | ' + examples.join('; ') : ''}`);
    }
    expect(owns.length).toBeGreaterThan(100);
  }, 600000);
});
