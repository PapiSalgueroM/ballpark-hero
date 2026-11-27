import { describe, expect, it } from 'vitest';
import { bookCornerRoutine, changeLive, liveStatsAt, playNextEntry, resumeMatch, setSetPiece, startCareer, startSecondHalf,
  type CareerState, type CornerRoutine, type PlayEvent } from '@/lib/clubManager';
import { resolveCornerDeliveries } from '@/lib/clubManagerCornerDelivery';

function seeded<T>(seed: number, run: () => T) {
  const original = Math.random;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return run(); } finally { Math.random = original; }
}
function dressingRoom(club: string) {
  const career = seeded(12207, () => startCareer(club));
  const state = seeded(18031, () => playNextEntry(career)).state;
  const starters = state.live!.startXi.filter(id => id && state.squad.find(p => p.id === id)?.position !== 'GK');
  const assigned = state.setPieces?.cornersLeft;
  const takerId = assigned && starters.includes(assigned) ? assigned : starters[2]!;
  const targetId = starters.filter(id => id !== takerId).at(-1)!;
  return { state: setSetPiece(state, 'cornersLeft', takerId)!, routine: { flag: 'left', kind: 'far-post', takerId, targetId } satisfies CornerRoutine };
}
function secondHalf(state: CareerState, seed: number, routine?: CornerRoutine) {
  const saved = structuredClone(state);
  if (routine) saved.live!.cornerRoutine = routine;
  return seeded(Math.imul(seed, 2654435761) >>> 0, () => startSecondHalf(saved))!;
}
const counts = () => ({ attempts: 0, read: 0, shots: 0, readShots: 0, goals: 0, recycles: 0, clearances: 0, changed: 0 });
describe('prepared competitive corner deliveries', () => {
  it('settles real awarded corners, the named finisher, score, shots and xG from the same play', () => {
    const { state, routine } = dressingRoom('Brentford');
    const active = secondHalf(state, 112, routine);
    const live = active.live!, plays = live.h2Play!;
    const delivered = plays.filter(e => e.cornerDelivery);
    expect(delivered.length).toBeGreaterThan(1);
    expect(delivered.map(e => e.cornerDelivery!.read)).toEqual(delivered.map((_, i) => i > 0));
    const ids = delivered.map(e => e.cornerDelivery!.id);
    expect(new Set(ids).size).toBe(delivered.length);
    const goals = plays.filter(e => e.cornerChance && e.goal);
    expect(goals.length).toBeGreaterThan(0);
    for (const shot of plays.filter(e => e.kind === 'shot' && e.cornerChance)) {
      const corner = delivered.find(e => e.cornerDelivery!.id === shot.cornerChance)!;
      expect([corner.side,corner.kind,corner.flank,corner.minute,corner.plus]).toEqual(['me','corner',routine.flag,shot.minute,shot.plus]);
      expect(shot.who).toBe(corner.cornerDelivery!.target);
      expect(shot.xg).toBeGreaterThan(0);
      if (shot.goal) expect(live.h2My!.find(g => g.cornerChance === shot.cornerChance))
        .toMatchObject({ id: routine.targetId, name: shot.who, minute: shot.minute });
    }
    const result = seeded(91, () => resumeMatch(JSON.parse(JSON.stringify(active))));
    expect(result.report!.detail!.cornerRoutine).toEqual(routine);
    expect(result.report!.detail!.play).toEqual([...(live.h1Play ?? []), ...plays]);
    expect(result.report!.detail!.stats).toEqual(liveStatsAt(live,90));
    const mine = [...live.h1My!, ...live.h2My!].length, theirs = [...live.h1Opp!, ...live.h2Opp!].length;
    expect(result.state.resultLog!.at(-1)!.score).toBe(mine + '-' + theirs);
    expect(result.state.table.find(row => row.club === active.clubName)).toMatchObject({ gf: mine, ga: theirs });
    expect(result.report!.myScorers).toHaveLength(mine);
    const plain = seeded(91, () => resumeMatch(secondHalf(state,6)));
    expect(plain.report!.detail).not.toHaveProperty('cornerRoutine');
    expect(plain.report!.detail!.play!.some(e => e.cornerDelivery || e.cornerChance)).toBe(false);
  });

  it('refuses a namesake and a departed target, a wrong flag, an opponent corner and an unrelated shot', () => {
    const { state, routine } = dressingRoom('Brentford');
    const taker = state.squad.find(p => p.id === routine.takerId)!, target = state.squad.find(p => p.id === routine.targetId)!;
    const namesake = { ...taker, id: 'another-player-with-the-same-name' };
    const corner = (): PlayEvent => ({ minute: 56, kind: 'corner', side: 'me', who: taker.name, flank: 'left' });
    const run = (event: PlayEvent, takerId: string, on = [taker,target]) => {
      resolveCornerDeliveries(routine,takerId,[event],[],() => on,'eligibility',false);
      return event.cornerDelivery;
    };
    expect(run(corner(),taker.id)).toBeDefined();
    expect(run(corner(),namesake.id,[namesake,taker,target])).toBeUndefined();
    expect(run(corner(),taker.id,[namesake,target])).toBeUndefined();
    expect(run(corner(),taker.id,[taker,{ ...target,id: 'departed-target-namesake' }])).toBeUndefined();
    expect(run({ ...corner(), flank: 'right' },taker.id)).toBeUndefined();
    expect(run({ ...corner(), side: 'opp' },taker.id)).toBeUndefined();
    expect(run({ ...corner(), kind: 'shot' },taker.id)).toBeUndefined();
  });

  it('preserves played corners on a substitution and reload, and folds added time with its shot', () => {
    const { state, routine } = dressingRoom('Brentford');
    const active = secondHalf(state,112,routine);
    const bench = state.squad.find(p => !p.onLoan && !p.injuryWeeks && p.position !== 'GK' && !active.live!.onPitch.includes(p.id))!;
    const minutes = active.live!.h2Play!.filter(e => e.cornerDelivery).map(e => e.minute);
    expect(minutes.at(-1)!).toBeGreaterThan(minutes[0]);
    const cut = minutes[0];
    const changed = seeded(913, () => changeLive(active,cut,{ kind: 'sub', outId: routine.targetId, inId: bench.id }))!;
    expect(changed.live!.h2Play!.filter(e => e.minute <= cut)).toEqual(active.live!.h2Play!.filter(e => e.minute <= cut));
    expect(changed.live!.h2Play!.filter(e => e.minute > cut).some(e => e.cornerDelivery || e.cornerChance)).toBe(false);
    const result = seeded(61, () => resumeMatch(JSON.parse(JSON.stringify(changed))));
    expect(result.report!.detail!.cornerRoutine).toEqual(routine);
    const stoppage = secondHalf(state,57,routine).live!.h2Play!;
    const added = stoppage.find(e => e.cornerDelivery && e.plus)!;
    expect(added.minute).toBe(90); expect(added.plus).toBeGreaterThan(0);
    const shot = stoppage.find(e => e.kind === 'shot' && e.cornerChance === added.cornerDelivery!.id)!;
    expect([shot.minute,shot.plus]).toEqual([added.minute,added.plus]);
  });

  it('ends the named route after an actual injury or dismissal and keeps the ordinary later corners', () => {
    const { state, routine } = dressingRoom('Brentford');
    for (const [seed,targetId,minute,exit] of [
      [1,'p-mamadou-sangare',52,'injury'], [374,'p-igor-thiago',59,'red'],
    ] as const) {
      const live = secondHalf(state,seed,{ ...routine,targetId }).live!;
      const exits = exit === 'injury' ? live.h2Injuries : live.h2Cards?.filter(c => c.kind === 'red');
      expect(exits?.some(e => e.id === targetId && e.minute === minute)).toBe(true);
      const left = live.h2Play!.filter(e => e.kind === 'corner' && e.side === 'me' && e.flank === 'left');
      expect(left.some(e => e.minute < minute && e.cornerDelivery?.targetId === targetId)).toBe(true);
      expect(left.some(e => e.minute >= minute)).toBe(true);
      expect(left.filter(e => e.minute >= minute).every(e => !e.cornerDelivery)).toBe(true);
    }
  });

  it('retains a genuine zero-attempt report after a paid week and the actual kickoff', () => {
    const career = seeded(12207, () => startCareer('Brentford'));
    const routine: CornerRoutine = { flag:'left', kind:'far-post', takerId:'p-dango-ouattara', targetId:'p-nathan-collins' };
    const booked = bookCornerRoutine(career,routine)!;
    const last = seeded(18031,() => playNextEntry(booked,{ skipHalftime:true,varReviews:['goal'] }));
    expect(last.report!.detail).not.toHaveProperty('cornerRoutine');
    expect(last.state.cornerTraining?.paid).toEqual({ taker:3, target:3 });
    const played = seeded(1,() => playNextEntry(JSON.parse(JSON.stringify(last.state)),{ skipHalftime:true,varReviews:['goal'] }));
    expect(played.report!.detail!.cornerRoutine).toEqual(routine);
    expect(played.report!.detail!.play!.some(e => e.cornerDelivery)).toBe(false);
    expect(played.state.cornerTraining).toBeUndefined();
  });

  it('reviews the actual finish and removes an overturned goal from both the shot and scorer lists', () => {
    const { state, routine } = dressingRoom('Brentford');
    const taker = state.squad.find(p => p.id === routine.takerId)!, target = state.squad.find(p => p.id === routine.targetId)!;
    let rejected = 0, stood = 0;
    for (let seed = 0; seed < 16000 && (!rejected || !stood); seed++) {
      const source: PlayEvent = { kind:'corner', side:'me', who:taker.name, minute:61, flank:'left' };
      const key = 'review-witness/' + seed;
      const raw = resolveCornerDeliveries(routine,taker.id,[{ ...source }],[],() => [taker,target],key,false);
      if (!raw.goals.length) continue;
      const actual = resolveCornerDeliveries(routine,taker.id,[source],[],() => [taker,target],key,true);
      const review = actual.plays.find(e => e.review);
      if (!review) {
        stood++; expect(actual.goals).toEqual(raw.goals);
        expect(actual.plays.some(e => e.kind === 'shot' && e.goal)).toBe(true);
        continue;
      }
      expect([review.minute,review.who,review.cornerChance]).toEqual([source.minute,target.name,source.cornerDelivery!.id]);
      if (review.review!.decision === 'disallowed') {
        rejected++; expect(actual.goals).toHaveLength(0);
        expect(actual.plays.some(e => e.kind === 'shot')).toBe(false);
        expect(source.cornerDelivery!.outcome).toBe('disallowed');
      } else {
        stood++; expect(actual.goals).toEqual(raw.goals);
        expect(actual.plays.some(e => e.kind === 'shot' && e.goal)).toBe(true);
      }
    }
    expect(rejected).toBeGreaterThan(0);expect(stood).toBeGreaterThan(0);
  });

  it('measures the shot and recovery tradeoff over 540 paired competitive second halves', () => {
    const far = counts(), short = counts(); let ordinaryGoals = 0;
    for (const club of ['Brentford','Sevilla','Parma']) {
      const { state,routine } = dressingRoom(club);
      for (let seed = 1; seed <= 180; seed++) {
        const plain = secondHalf(state,seed).live!;
        ordinaryGoals += plain.h2My!.length;
        for (const kind of ['far-post','short'] as const) {
          const result = secondHalf(state,seed,{ ...routine, kind }).live!, tally = kind === 'far-post' ? far : short;
          const events = result.h2Play!, shots = events.filter(e => e.kind === 'shot' && e.cornerChance);
          const source = events.filter(e => e.kind === 'corner').map(e => [e.minute,e.plus,e.flank,e.who,e.side]);
          expect(source).toEqual(plain.h2Play!.filter(e => e.kind === 'corner').map(e => [e.minute,e.plus,e.flank,e.who,e.side]));
          expect(result.h2Opp).toEqual(plain.h2Opp);
          const added = result.h2My!.length - plain.h2My!.length;
          expect(added).toBe(shots.filter(e => e.goal).length);
          for (const e of events.filter(e => e.cornerDelivery)) {
            const d = e.cornerDelivery!;
            tally.attempts++; if(d.read)tally.read++;
            if(d.outcome==='recycled')tally.recycles++; if(d.outcome==='cleared')tally.clearances++;
            if(d.read && d.outcome==='shot')tally.readShots++;
          }
          tally.shots+=shots.length; tally.goals+=added; if(added)tally.changed++;
          if(kind==='short')for(const shot of shots)expect(shot.who).toBe(state.squad.find(p=>p.id===routine.takerId)!.name);
        }
      }
    }
    expect(ordinaryGoals).toBeGreaterThan(250);
    expect(far.attempts).toBe(short.attempts);
    expect(far.shots).toBeGreaterThan(1.4*short.shots);expect(short.recycles).toBeGreaterThan(2*far.recycles);
    for (const tally of [far,short]) {
      expect(tally.changed).toBeGreaterThan(2);
      expect(tally.goals/540).toBeLessThan(0.08);
      expect(tally.readShots/tally.read).toBeLessThan((tally.shots-tally.readShots)/(tally.attempts-tally.read));
    }
    console.log('540 paired second halves', { ordinaryGoals,far,short });
  },30000);
});

