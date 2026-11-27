import { describe, expect, it } from 'vitest';
import '@/lib/clubManagerTactics';
import { autoPickXI, beginLeagueCoachSeason, benchFor, changeLive, coachQuickMatch, FORMATIONS, playNextEntry,
  resumeMatch, startCareer, startSecondHalf, type CareerState, type PlayEvent } from '@/lib/clubManager';
import { drawPhaseMoves, isPhaseMove, isPhaseOrder, payPhaseCosts, phaseHistoryAt, phasePositions, readPhaseHistory, type PhaseOrder } from '@/lib/clubManagerPhaseShapes';

const secure: PhaseOrder = { v:1, withBall:'secure-3-2-5', withoutBall:'screen-4-1-4-1', outlet:'near', recovery:'screen' };
const bold: PhaseOrder = { v:1, withBall:'wide-2-3-5', withoutBall:'step-4-4-2', outlet:'beyond', recovery:'challenge' };
function seeded<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return fn(); } finally { Math.random = original; }
}
const opening = () => seeded(7162, () => beginLeagueCoachSeason(startCareer('Brentford','now',undefined,undefined,undefined,undefined,
  {championshipPlayoffs:true,bundesligaPlayoff:true,frenchPlayoffs:true,inSeasonRatings:true,worldRatingTiming:true,opening2026Loans:true,opening2026Transfers:true})));
const opts = {phaseOrder:bold, varReviews:['goal','penalty'] as ('goal'|'penalty')[]};
const save = (seed: number) => seeded(seed, () => playNextEntry(opening(),opts)).state;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const moments = (career: CareerState) => [...(career.live?.h1Play ?? []),...(career.live?.h2Play ?? [])];
// Inbox and press IDs share process-wide counters. Compare the saved week, text and choices while ignoring only those serial suffixes.
const matchSave = (r: unknown) => JSON.parse(JSON.stringify(r,(k,v) => k === 'id' && typeof v === 'string'
  ? v.replace(/^(msg|pq)(-\d+-\d+)-\d+$/, '$1$2') : v));

describe('competitive phase shapes', () => {
  it('maps every preset and custom wide positions with a fixed keeper and ten unique outfield roles per phase', () => {
    const state = opening();
    for (const [index,f] of FORMATIONS.entries()) {
      const career = {...state,formationIndex:index,xiIds:autoPickXI(state.squad,f)};
      const layout = phasePositions(career,undefined,undefined,secure);
      expect(layout.available,f.name).toBe(true);
      expect(layout.keeper?.playerId).toBe(career.xiIds[f.slots.findIndex(s => s.label === 'GK')]);
      expect(new Set(layout.rows.map(r => r.playerId)).size).toBe(10);
      for (const phase of ['withBall','withoutBall'] as const) expect(new Set(layout.rows.map(r => r[phase].role)).size).toBe(10);
      const coords = f.slots.map(s => ({x:s.x,y:s.y}));
      [coords[1],coords[4]] = [coords[4],coords[1]];
      const custom = phasePositions({...career,customShape:{v:1,formationIndex:index,points:coords}},undefined,undefined,secure);
      expect(custom.available).toBe(true);
      expect(custom.rows[0].base).toEqual(layout.rows[3].base);
      expect(custom.rows[0].withBall).toEqual(layout.rows[3].withBall);
    }
  });

  it('refuses a malformed order, thin XI or unsupported saved position data without spending a random draw', () => {
    const career = opening(), unknown = {...bold,v:2} as unknown as PhaseOrder;
    expect(isPhaseOrder(unknown)).toBe(false);
    for (const [s,order] of [[career,unknown],[{...career,squad:career.squad.slice(0,7)},bold],[{...career,customShape:{v:23}},bold]] as const) {
      const original = Math.random;
      Math.random = () => { throw new Error('Refused kickoff drew randomness'); };
      try {
        const replay = playNextEntry(s,{phaseOrder:order});
        expect(replay.state).toBe(s); expect(replay.blocked).toBe('phase-order-unavailable');
      } finally { Math.random = original; }
    }
    const base = save(202611);
    const unfamiliar = {...base,live:{...base.live!,phaseOrder:unknown}};
    expect(changeLive(unfamiliar,46,{kind:'phaseOrder',order:null})).toBeNull();
    expect(readPhaseHistory([{minute:0,order:bold,positions:{rows:['bad']}}])).toEqual([]);
    expect(isPhaseMove({id:'future',actor:{}})).toBe(false);
  });

  it('rebuilds roles after a live sub and reshape, and records actual vacancies only when the clock reaches them', () => {
    const room = save(202611), live = room.live!, left = live.startXi[4], replacement = benchFor(room,left).find(p=>p.position!=='GK')!;
    const changed = changeLive(room,46,{kind:'sub',outId:left,inId:replacement.id})!;
    const assigned = changed.live!.phaseHistory!.at(-1)!.positions!;
    expect(assigned.rows.find(r=>r.slot===4)?.playerId).toBe(replacement.id);
    expect(assigned.rows.some(r=>r.playerId===left)).toBe(false);
    const shape = seeded(42,()=>changeLive(changed,47,{kind:'formation',formationIndex:FORMATIONS.findIndex(f=>f.name==='3-4-3')}))!;
    const moved = shape.live!.phaseHistory!.at(-1)!.positions!;
    expect(moved.rows.map(p=>p.playerId).sort()).toEqual(assigned.rows.map(p=>p.playerId).sort());
    const target = moved.rows[2], copy=clone(shape.live!);
    copy.h2Cards = [{id:target.playerId,name:target.name,kind:'red',minute:90,plus:2}];
    expect(phaseHistoryAt(copy,{minute:90,plus:1}).at(-1)!.positions!.available).toBe(true);
    const vacant = phaseHistoryAt(copy,{minute:90,plus:2}).at(-1)!.positions!;
    expect(vacant.available).toBe(false); expect(vacant.missingSlots).toEqual([target.slot]); expect(vacant.rows).toHaveLength(9);
    const injured=clone(room);
    const id=injured.live!.startXi[4], p=injured.squad.find(p=>p.id===id)!;
    injured.live!.h1Injuries=[{id,name:p.name,minute:42,weeks:1}];
    const replacementState=changeLive(injured,46,{kind:'sub',outId:id,inId:replacement.id})!;
    expect(phaseHistoryAt(replacementState.live!).filter(s=>s.minute>=42).map(s=>[s.minute,s.positions?.available])).toEqual([[42,false],[46,true]]);
  });

  it('settles the same credited goals in Quick Sim and the played fixture when the manager makes the same changes', () => {
    for (const [seed,side,minute,plus,who,originOutcome] of [
      [202913,'opp',9,0,'Pedro Porro','bypassed'],[204574,'me',66,0,'Mamadou Sangaré','released'],[216201,'me',45,1,'Dango Ouattara','released'],
    ] as const) {
      const career = opening(), quick = seeded(seed,()=>playNextEntry(career,{...opts,skipHalftime:true}));
      const viaRoom = seeded(seed,()=>resumeMatch(coachQuickMatch(clone(playNextEntry(career,opts).state))));
      expect(matchSave(viaRoom)).toEqual(matchSave(quick));
      const detail=quick.report!.detail!, goal=detail.play!.find(e=>e.phaseChance && e.goal && e.who===who && e.minute===minute)!;
      expect(goal).toMatchObject({kind:'shot',side,on:true});expect(goal.plus??0).toBe(plus);expect(goal.xg).toBeGreaterThan(0);
      const source=detail.play!.find(e=>e.phaseMove?.id===goal.phaseChance)!;
      expect(source).toMatchObject({kind:'shot',on:true,minute,phaseMove:{outcome:originOutcome}});
      expect(source.plus??0).toBe(plus);expect(source.goal).toBeFalsy();
      const scorers=side==='me'? quick.report!.myScorers:quick.report!.oppScorers;
      const assist=side==='me'?source.phaseMove!.actor.name:source.phaseMove!.keeper.name;
      expect(scorers.find(s=>s.phaseChance===goal.phaseChance)).toMatchObject({name:who,assist,minute});
      const player=quick.state.squad.find(p=>p.name===assist);
      if(side==='me') expect(player!.seasonAssists).toBeGreaterThanOrEqual(1);
      expect(detail.play!.filter(e=>e.goal&&e.side===side).length).toBe(scorers.length);
    }
    const reviewed=seeded(203517,()=>playNextEntry(opening(),{...opts,skipHalftime:true})).report!;
    const ruledOut=reviewed.detail!.play!.find(e=>e.phaseChance&&e.review?.decision==='disallowed')!;
    expect(ruledOut).toBeDefined();
    expect(reviewed.detail!.play!.some(e=>e.goal&&e.phaseChance===ruledOut.phaseChance)).toBe(false);
    expect([...reviewed.myScorers,...reviewed.oppScorers].some(s=>s.phaseChance===ruledOut.phaseChance)).toBe(false);
  });

  it('preserves past added time when standing down, removes later sources, and resumes complete saves once', () => {
    const room=save(216201);
    expect(moments(room).some(e=>e.phaseChance&&e.goal&&e.minute===45&&e.plus===1)).toBe(true);
    const cut=seeded(87,()=>changeLive(room,45,{kind:'phaseOrder',order:null},1))!;
    expect(cut.live!.phaseOrder).toBeUndefined();
    const past=moments(room).filter(e=>e.phaseMove||e.phaseChance).filter(e=>e.minute<45||(e.plus??0)<=1);
    expect(moments(cut).filter(e=>e.phaseMove||e.phaseChance)).toEqual(past);
    const end=seeded(35,()=>resumeMatch(cut));
    expect(matchSave(seeded(35,()=>resumeMatch(clone(cut))))).toEqual(matchSave(end));
    expect(end.report!.detail!.play!.filter(e=>e.phaseMove||e.phaseChance).length).toBe(past.length);
  });

  it('never converts rebounds, unrelated simultaneous chances or missing players into an extra scoring chance', () => {
    const room=save(202611), live=room.live!, xi=room.squad.filter(p=>live.startXi.includes(p.id)), there=live.oppXi!;
    const ordinary:PlayEvent={minute:20,kind:'shot',side:'opp',who:there[2].n,on:true};
    const nested:PlayEvent[]=['flankChance','cornerChance','pressChance','phaseChance'].map(k=>({...ordinary,[k]:'other'}));
    const two:PlayEvent[]=[{...ordinary},{...ordinary}];
    const run=(events:PlayEvent[],players=xi)=>drawPhaseMoves(live,events,()=>players,()=>there,'probe',true);
    expect(run(nested).play).toEqual([]);expect(nested.some(e=>e.phaseMove)).toBe(false);
    expect(run(two).play).toEqual([]);expect(new Set(two.map(e=>e.phaseMove!.id)).size).toBe(2);
    const short={...ordinary};run([short],xi.slice(1));expect(short).not.toHaveProperty('phaseMove');
    const noKeeper={...ordinary};drawPhaseMoves(live,[noKeeper],()=>xi,()=>there.filter(p=>p.p!=='GK'),'probe',false);
    expect(noKeeper).not.toHaveProperty('phaseMove');
  });

  it('settles only the effort actually affordable after the normal match cost, capped at two per player', () => {
    const room=save(202611), built=seeded(202653,()=>startSecondHalf(room))!, live=built.live!;
    const work=moments(built).find(e=>e.phaseMove?.effort===1)!;
    expect(work).toBeDefined();
    const copies=Array.from({length:4},(_,i)=>({...clone(work),phaseMove:{...clone(work.phaseMove!),id:'effort-'+i}}));
    const id=work.phaseMove!.actor.playerId, p=built.squad.find(p=>p.id===id)!;
    live.h1Play=copies;live.h2Play=[];
    p.fitness=21;payPhaseCosts(built,live);
    expect(copies.map(e=>e.phaseMove.spent)).toEqual([1,0,0,0]);expect(p.fitness).toBe(20);
    p.fitness=80;payPhaseCosts(built,live);
    expect(copies.map(e=>e.phaseMove.spent)).toEqual([1,1,0,0]);expect(p.fitness).toBe(78);
  });

  it('changes the passing and recovery patterns independently on the same ordinary saves', () => {
    const career=opening();
    const orders=[secure,{...secure,withBall:bold.withBall},{...secure,withoutBall:bold.withoutBall},
      {...secure,outlet:bold.outlet},{...secure,recovery:bold.recovery}];
    const stats=orders.map(()=>({ released:0, intercepted:0, bypassed:0, regained:0, load:0, high:0, screened:0, shots:0 }));
    for (let i=0;i<96;i++) {
      let expected: string[] | undefined;
      for (const [index,phaseOrder] of orders.entries()) {
        const live=seeded(202611+i*151,()=>playNextEntry(career,{...opts,phaseOrder})).state.live!;
        const events=live.h1Play!, moves=events.flatMap(e=>isPhaseMove(e.phaseMove)?[e.phaseMove]:[]);
        const ids=moves.map(m=>m.id);
        if (expected) expect(ids).toEqual(expected); else expected=ids;
        const tallies=stats[index];
        tallies.shots+=events.filter(e=>e.kind==='shot'&&e.phaseChance).length;
        for (const m of moves) {
          if (m.outcome==='released'||m.outcome==='intercepted'||m.outcome==='bypassed'||m.outcome==='regained') tallies[m.outcome]++;
          tallies.load+=m.effort;
          if (m.phase==='recovery'&&m.highPressure) tallies.high++;
          if (m.phase==='recovery'&&m.screenedLane) tallies.screened++;
        }
      }
    }
    const [base,wide,twoUp,beyond,jump]=stats;
    expect(wide.load).toBeGreaterThan(base.load+60);
    expect(twoUp.screened).toBeLessThan(base.screened-15);
    expect(twoUp.high).toBeGreaterThan(base.high+30);
    expect(beyond.released).toBeGreaterThan(base.released+12);
    expect(beyond.intercepted).toBeGreaterThan(base.intercepted+16);
    expect(jump.regained).toBeGreaterThan(base.regained+35);
    expect(jump.bypassed).toBeGreaterThan(base.bypassed+5);
    expect(jump.shots).toBeGreaterThan(base.shots+10);
  },30000);
});
