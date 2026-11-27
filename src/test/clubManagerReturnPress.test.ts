import { describe, expect, it, vi } from 'vitest';
import '@/lib/clubManagerTactics';
import * as calendar from '@/lib/clubManagerCalendar';
import { changeLive, eligiblePressTargets, isReturnPress, liveStatsAt, playNextEntry, resumeMatch, returnPressWinger,
  startCareer, startSecondHalf, type CareerState, type PlayEvent } from '@/lib/clubManager';
import { drawReturnPress, type ReturnPressOrder } from '@/lib/clubManagerReturnPress';

function seeded<T>(seed: number, fn: () => T): T {
  const old = Math.random;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return fn(); } finally { Math.random = old; }
}
function interval(club: string) {
  const start = seeded(12207, () => startCareer(club));
  return seeded(18031, () => playNextEntry(start, { varReviews: ['goal'] })).state;
}
function ordered(state: CareerState, target: string) {
  return changeLive(state, 46, { kind: 'returnPress', target })!;
}
function second(state: CareerState, seed: number) {
  return seeded(seed, () => startSecondHalf(state))!;
}
function throws(state: CareerState) { return state.live!.h2Play!.filter(e => e.returnPress); }
const source = (who: string, minute = 69): PlayEvent => ({ kind: 'throwin', side: 'opp', who, minute });

describe('competitive throw-return press', () => {
  it('chooses a named wide defender actually on the sheet and a winger actually on that side', () => {
    const state = interval('Brentford'), live = state.live!;
    const target = 'Destiny Udogie', winger = returnPressWinger(state, target, 46)!;
    expect(winger.name).toBe('Dango Ouattara');
    expect(eligiblePressTargets(live,46).map(p => p.n)).toContain(target);
    expect(ordered(state,target).live!.returnPress).toEqual({ version:1, target, wingerId:winger.id });
    expect(changeLive(state,46,{ kind:'returnPress', target: live.oppXi!.find(p => p.p === 'GK')!.n })).toBeNull();
    expect(changeLive(state,46,{ kind:'returnPress', target:null })).toBeNull();
    const reserve = live.oppBench![0];
    live.oppSubs = [{ off:target, on:reserve.n, minute:45, plus:2 }];
    expect(eligiblePressTargets(live,45,1).some(p => p.n === target)).toBe(true);
    expect(eligiblePressTargets(live,45,2).some(p => p.n === target)).toBe(false);
    live.oppSubs = [];
    live.h1OppCards = [{ name:target, kind:'red', minute:45, plus:3 }];
    expect(eligiblePressTargets(live,45,2).some(p => p.n === target)).toBe(true);
    expect(eligiblePressTargets(live,45,3).some(p => p.n === target)).toBe(false);
    live.h1OppCards = [];
    live.oppBench = [...live.oppBench!, { ...live.oppXi!.find(p => p.n === target)! }];
    expect(eligiblePressTargets(live,46).map(p => p.n)).not.toContain(target);
    expect(ordered(state,target)).toBeNull();
  });

  it('settles both sides from the actual throw, with the real score, xG and assist after reloading', () => {
    for (const [club,target,seed,minute,plus,side,name,xg] of [
      ['Brentford','Destiny Udogie',1401181143,57,0,'me','Dango Ouattara',0.16],
      ['Sevilla','Youssef Enríquez',1274836067,77,0,'opp','Tomás Conechny',0.11],
      ['Sevilla','Jonny Otto',2027808452,90,2,'me','Félix Correia',0.15],
    ] as const) {
      const active = second(ordered(interval(club),target),seed);
      const live = active.live!, play = live.h2Play!;
      const parent = throws(active).find(e => e.minute === minute && (e.plus ?? 0) === plus)!;
      expect(parent).toMatchObject({ kind:'throwin', side:'opp', who:target, returnPress:{ effort:1, outcome:side === 'me' ? 'won' : 'bypassed' } });
      const shot = play.find(e => e.kind === 'shot' && e.pressChance === parent.returnPress!.id)!;
      expect(shot).toMatchObject({ minute, side, who:name, on:true, goal:true, xg });
      expect(shot.plus ?? 0).toBe(plus);
      const before = liveStatsAt(live, plus ? minute : minute-1, plus ? plus-1 : undefined);
      const after = liveStatsAt(live,minute,plus);
      expect((side==='me' ? after.xg-before.xg : after.oppXg-before.oppXg)).toBeCloseTo(xg,2);
      if (side === 'opp') {
        // He made the pass at 77', then went to the bench. The book must still credit him.
        live.oppSubs = [...(live.oppSubs ?? []), { off:target, on:live.oppBench!.find(p=>!live.oppSubs?.some(s=>s.on===p.n))!.n, minute:80 }];
        expect(eligiblePressTargets(live,81).some(p=>p.n===target)).toBe(false);
      }
      const result = seeded(91,() => resumeMatch(JSON.parse(JSON.stringify(active))));
      expect(result.report!.detail!.returnPressUsed).toBe(true);
      expect(result.report!.detail!.stats).toEqual(liveStatsAt(live,90));
      const scorers = side==='me' ? result.report!.myScorers : result.report!.oppScorers;
      const line = scorers.find(s => s.pressChance === parent.returnPress!.id)!;
      expect(line.name).toBe(name); expect(line.assist).toBe(side==='me' ? undefined : target);
      if (side==='opp') {
        expect(result.report!.detail!.oppRatings!.find(p => p.name === target)!.assists).toBe(1);
        expect(result.state.leagueBook!.c[live.opponent]!.m[target+'|LB']![1]).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('standing down preserves past throws, drops future work and bills just the actual jumps once', () => {
    const state = interval('Brentford'), target = 'Destiny Udogie';
    const active = second(ordered(state,target),2654435761);
    const events = throws(active);
    expect(events.map(e => [e.minute,e.returnPress!.outcome,e.returnPress!.effort])).toEqual([[60,'direct',0],[64,'won',1],[67,'direct',0]]);
    const stop = seeded(42,() => changeLive(active,65,{kind:'returnPress',target:null}))!;
    expect(stop.live!.returnPress).toBeUndefined();
    expect(throws(stop)).toEqual(events.slice(0,2));
    const replay = JSON.parse(JSON.stringify(stop)) as CareerState;
    const played = seeded(735,() => resumeMatch(replay));
    const otherwise = structuredClone(replay);
    for(const e of throws(otherwise)) delete e.returnPress;
    const control = seeded(735,() => resumeMatch(otherwise));
    const id = events[1].returnPress!.wingerId;
    for(const p of played.state.squad) {
      const baseline = control.state.squad.find(man => man.id === p.id)!;
      expect(baseline.fitness - p.fitness).toBe(p.id===id ? 1 : 0);
    }
    expect(played.report!.detail!.returnPressUsed).toBe(true);
    expect(played.report!.detail!.play!.flatMap(e=>e.returnPress ? [e.returnPress.spent] : [])).toEqual([0,1]);
    const atFloor = structuredClone(replay);
    atFloor.squad.find(p=>p.id===id)!.fitness = 20;
    const dates = calendar.entryDatesOf(atFloor);
    dates[atFloor.week+1] = dates[atFloor.week];
    const compressed = vi.spyOn(calendar,'entryDatesOf').mockReturnValue(dates);
    const floor = (() => { try { return seeded(735,() => resumeMatch(atFloor)); } finally { compressed.mockRestore(); } })();
    expect(floor.state.squad.find(p=>p.id===id)!.fitness).toBe(20);
    expect(floor.report!.detail!.play!.flatMap(e=>e.returnPress ? [e.returnPress.spent] : [])).toEqual([0,0]);
    const zero = changeLive(ordered(state,target),46,{kind:'returnPress',target:null})!;
    const final = seeded(31,()=>resumeMatch(zero));
    expect(final.report!.detail!.returnPressUsed).toBe(true);
    expect(final.report!.detail!.play!.some(e => e.returnPress || e.pressChance)).toBe(false);
    const board = second(ordered(interval('Sevilla'),'Jonny Otto'),2027808452);
    const cut = seeded(13,()=>changeLive(board,90,{kind:'returnPress',target:null},1))!;
    expect(cut.live!.h2My!.some(e => e.pressChance && e.plus===2)).toBe(false);
    expect(throws(cut)).toEqual(throws(board).filter(e=>e.minute < 90 || (e.plus ?? 0) <= 1));
  });

  it('a replacement, lookalike, red, missing outlet and an unrelated shot cannot impersonate the trigger', () => {
    const state = interval('Brentford'), live = state.live!, target = 'Destiny Udogie';
    const plan = ordered(state,target).live!.returnPress!, winger = state.squad.find(p=>p.id===plan.wingerId)!;
    const defender = live.oppXi!.find(p=>p.n===target)!, outlet = live.oppXi!.find(p=>p.n==='Savinho')!;
    const rows = [source(target,57),source(target,57),source('Other'),{...source(target),side:'me' as const}];
    const unrelated: PlayEvent = {minute:57,who:'Other',kind:'shot',side:'me',on:true,xg:0.10};
    const fixture = '2026/Brentford/0/Tottenham/2';
    const draw = (events: PlayEvent[], mine = [winger], theirs = [defender,outlet]) =>
      drawReturnPress(plan,events,[],()=>mine,()=>theirs,fixture,false);
    const double = structuredClone(rows);
    expect(draw(double).mine).toHaveLength(1);
    expect(new Set(double.filter(e=>e.returnPress).map(e=>e.returnPress!.id)).size).toBe(2);
    expect(double.slice(2).every(e=>!e.returnPress)).toBe(true);
    const blocked = [...structuredClone(rows),unrelated];
    expect(draw(blocked).play).toHaveLength(0);
    expect(unrelated).not.toHaveProperty('pressChance');
    for(const [mine,theirs] of [
      [[{...winger,id:'reserve'}],[defender,outlet]],
      [[winger],[{...defender,n:target+' Jr'},outlet]],
      [[winger],[defender,{...defender},outlet]],
      [[winger],[outlet]],
    ] as const) {
      const row = source(target,57);
      expect(draw([row],[...mine],[...theirs]).play).toHaveLength(0);
      expect(row).not.toHaveProperty('returnPress');
    }
    const direct = source(target,57);
    draw([direct],[winger],[defender,{...outlet,p:'CB'}]);
    expect(direct.returnPress).toMatchObject({outcome:'direct',effort:0});
    const sub = state.squad.find(p => !live.onPitch.includes(p.id) && !p.injuryWeeks && !p.onLoan && !p.suspendedMatches)!;
    sub.name = winger.name;
    const changed = changeLive(ordered(state,target),46,{ kind:'sub', outId:winger.id, inId:sub.id })!;
    const after = second(changed,1401181143);
    expect(after.live!.h2Play!.some(e=>e.kind==='throwin' && e.who===target)).toBe(true);
    expect(throws(after)).toHaveLength(0);
  });

  it('leaves an unfamiliar order inert and checks standing and ruled-out finishes at the precise incident', () => {
    const state = interval('Brentford'), target = 'Destiny Udogie', plan = ordered(state,target).live!.returnPress!;
    const unfamiliar = { ...plan, version:2 } as unknown as ReturnPressOrder;
    expect(isReturnPress(unfamiliar)).toBe(false);
    const future = structuredClone(state);
    future.live!.returnPress = unfamiliar;
    expect(changeLive(future,46,{kind:'returnPress',target:null})).toBeNull();
    const plain = second(state,1401181143), unknown = second(future,1401181143);
    expect(unknown.live!.returnPress).toEqual(unfamiliar);
    delete unknown.live!.returnPress;
    expect(unknown).toEqual(plain);
    expect(seeded(7,()=>resumeMatch(plain)).report!.detail).not.toHaveProperty('returnPressUsed');
    const winger = state.squad.find(p=>p.id===plan.wingerId)!, on = state.live!.oppXi!;
    const decisions = new Set<string>();
    for(let n=0;n<30000 && decisions.size<2;n++) {
      const e=source(target);
      const run=drawReturnPress(plan,[e],[],()=>[winger],()=>on,'var/'+n,true);
      const review=run.play.find(row=>row.review);
      if(!review) {
        const goal = [...run.mine,...run.theirs][0];
        if (goal) {
          decisions.add('stands');
          expect(goal.pressChance).toBe(e.returnPress!.id);
          expect(run.play.some(row=>row.goal && row.pressChance===goal.pressChance)).toBe(true);
        }
        continue;
      }
      decisions.add(review.review!.decision);
      expect(review.pressChance).toBe(e.returnPress!.id);
      expect(review.minute).toBe(e.minute);
      const confirmed = review.review!.decision==='confirmed';
      expect(run.play.filter(row=>row.goal).length).toBe(confirmed ? 1 : 0);
      expect([...run.mine,...run.theirs].length).toBe(confirmed ? 1 : 0);
    }
    expect([...decisions].sort()).toEqual(['disallowed','stands']);
  });

  it('measures scoring on 540 paired competitive halves and the same return passes with fresh and tired legs', () => {
    const counts = { throws:0, direct:0, won:0, bypassed:0, myShots:0, oppShots:0, myGoals:0, oppGoals:0, ordinaryMine:0, ordinaryOpp:0 };
    for(const club of ['Brentford','Sevilla','Parma']) {
      const state=interval(club), live=state.live!;
      const targets=eligiblePressTargets(live,46).filter(p=>returnPressWinger(state,p.n,46)).map(p=>ordered(state,p.n));
      expect(targets.length).toBeGreaterThan(0);
      for(let n=0;n<180;n++) {
        const seed=Math.imul(n,2654435761)>>>0;
        const active=second(targets[n%targets.length],seed).live!, plain=second(state,seed).live!;
        const play=active.h2Play!, shots=play.filter(e=>e.kind==='shot' && e.pressChance);
        const throwing=(e: PlayEvent)=>e.kind==='throwin';
        const original=(e: PlayEvent)=>[e.side,e.who,e.minute,e.plus];
        expect(play.filter(throwing).map(original)).toEqual(plain.h2Play!.filter(throwing).map(original));
        expect(play.filter(e=>e.kind==='shot' && !e.pressChance)).toEqual(plain.h2Play!.filter(e=>e.kind==='shot'));
        const tagged=play.filter(e=>e.returnPress);
        for(const e of tagged) { counts.throws++; counts[e.returnPress!.outcome]++; }
        for(const e of shots) {
          const parents=tagged.filter(p=>p.returnPress!.id===e.pressChance);
          expect(parents).toHaveLength(1);
          expect([e.minute,e.plus]).toEqual([parents[0].minute,parents[0].plus]);
          if(e.side==='me') counts.myShots++; else counts.oppShots++;
        }
        const myGoals=shots.filter(e=>e.side==='me' && e.goal).length;
        const oppGoals=shots.filter(e=>e.side==='opp' && e.goal).length;
        expect(active.h2My!.length-plain.h2My!.length).toBe(myGoals);
        expect(active.h2Opp!.length-plain.h2Opp!.length).toBe(oppGoals);
        counts.myGoals+=myGoals; counts.oppGoals+=oppGoals;
        counts.ordinaryMine+=plain.h2My!.length; counts.ordinaryOpp+=plain.h2Opp!.length;
      }
    }
    expect(counts.throws).toBeGreaterThan(600);
    expect(Math.min(counts.won,counts.bypassed,counts.direct)).toBeGreaterThan(90);
    expect(Math.min(counts.myShots,counts.oppShots)).toBeGreaterThan(22);
    expect(Math.min(counts.myGoals,counts.oppGoals)).toBeGreaterThan(0);
    expect((counts.myGoals+counts.oppGoals)/540).toBeLessThan(0.08);
    const state=interval('Brentford'), plan=ordered(state,'Destiny Udogie').live!.returnPress!;
    const man=state.squad.find(p=>p.id===plan.wingerId)!, on=state.live!.oppXi!;
    const fresh={ won:0, bypassed:0, direct:0 }, tired={...fresh};
    for(let n=0;n<1000;n++) {
      for(const [fitness,totals] of [[100,fresh],[52,tired]] as const) {
        const e=source(plan.target,72);
        drawReturnPress(plan,[e],[],()=>[{...man,fitness}],()=>on,'fatigue/'+n,false);
        expect(e.returnPress!.tired).toBe(fitness===52);
        totals[e.returnPress!.outcome]++;
      }
    }
    expect(fresh.direct).toBe(tired.direct);
    expect(fresh.won-tired.won).toBeGreaterThan(150);
    expect(tired.bypassed-fresh.bypassed).toBe(fresh.won-tired.won);
    const directRates: number[] = [];
    for (const tempo of [-1,0,1] as const) {
      let direct=0;
      for(let n=0;n<1000;n++) {
        const e=source(plan.target,72);
        drawReturnPress(plan,[e],[],()=>[man],()=>on,'fatigue/'+n,false,tempo);
        if (e.returnPress!.outcome==='direct') direct++;
      }
      directRates.push(direct);
    }
    expect(directRates[1]).toBe(fresh.direct);
    expect(directRates[1]-directRates[0]).toBeGreaterThan(100);
    expect(directRates[2]-directRates[1]).toBeGreaterThan(100);
    console.log('540 competitive halves and 1,000 matched throw opportunities', {counts,fresh,tired,directRates});
  },30000);
});
