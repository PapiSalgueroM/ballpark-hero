import { describe, expect, it } from 'vitest';
import '@/lib/clubManagerTactics';
import { applyForJob, beginLeagueCoachSeason, benchFor, changeLive, finishSeason, playNextEntry, resumeMatch, startCareer, startNextSeason, startSecondHalf,
  type CareerState, type LiveMatch, type PlayEvent } from '@/lib/clubManager';
import { joinClubNow } from '@/lib/clubManagerCalendar';
import { analystCompare, analystCurrent, analystHistory, canUseAnalyst, fileAnalystObservation, isAnalystObservation,
  setAnalystWatch, type AnalystMode, type AnalystNotebook } from '@/lib/clubManagerAnalyst';
import type { PhaseOrder } from '@/lib/clubManagerPhaseShapes';
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
function withTape<T>(seed:number, f:()=>T) {
  const draws:number[]=[], original=Math.random;
  Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;draws.push(seed);return seed/4294967296;};
  try{return {result:f(),draws};}finally{Math.random=original;}
}
const opening=(club='Brentford')=>withTape(7162,()=>beginLeagueCoachSeason(startCareer(club,'now',undefined,undefined,undefined,undefined,
  {championshipPlayoffs:true,bundesligaPlayoff:true,frenchPlayoffs:true,inSeasonRatings:true,worldRatingTiming:true,opening2026Loans:true,opening2026Transfers:true}))).result;
const request={varReviews:['goal','penalty'] as ('goal'|'penalty')[]};
const room=(mode?:AnalystMode)=>withTape(202611,()=>playNextEntry(opening(),{...request,analystMode:mode})).result.state;
const clock=(minute:number,plus=0)=>({minute,...(plus?{plus}:{})});
const event=(who:string,minute:number,plus=0,kind:PlayEvent['kind']='throwin'):PlayEvent=>({who,side:'opp',kind,...clock(minute,plus)});
const normal=(x:unknown)=>JSON.parse(JSON.stringify(x,(k,v)=>k==='id'&&typeof v==='string'?v.replace(/^(msg|pq)(-\d+-\d+)-\d+$/,'$1$2'):v));

describe('competitive opposition notebook',()=>{
  it('files only the opted-in fixture at its whistle and preserves the played simulation and its RNG stream',()=>{
    const career=opening(), plain=withTape(202611,()=>playNextEntry(career,{...request,skipHalftime:true}));
    const watched=withTape(202611,()=>playNextEntry(career,{...request,skipHalftime:true,analystMode:'full'}));
    const {state,report}=watched.result, note=report!.detail!.analystNote!;
    expect(isAnalystObservation(note)).toBe(true);expect(note.club).toBe('Brentford');expect(note.opponent).toBe('Tottenham');
    expect(note.starters).toHaveLength(11);expect(note.from).toEqual(clock(0));expect(note.to.minute).toBe(90);
    const actual=report!.detail!.play!;
    expect(note.shots!.total).toBe(actual.filter(e=>e.side==='opp'&&e.kind==='shot').length);
    expect(note.throws.total).toBe(actual.filter(e=>e.side==='opp'&&e.kind==='throwin').length);
    expect(analystHistory(clone(state),'Tottenham')).toEqual([note]);expect(plain.result.state.analystNotebook).toBeUndefined();
    expect(watched.draws).toEqual(plain.draws);
    const comparable=clone(watched.result);delete comparable.state.analystNotebook;delete comparable.report!.detail!.analystNote;
    expect(normal(comparable)).toEqual(normal(plain.result));
    expect(room('full').analystNotebook).toBeUndefined();
  });

  it('starts, changes and cancels a partial live window without redrawing a chance or consuming a random number',()=>{
    const game=withTape(202653,()=>startSecondHalf(room())).result!;
    const pending=JSON.stringify([game.live!.h1Play,game.live!.h2Play,game.live!.h2My,game.live!.h2Opp,game.live!.oppSubs]);
    const a=withTape(1,()=>changeLive(game,60,{kind:'analystWatch',mode:'quick'}));
    const b=withTape(1,()=>changeLive(a.result!,72,{kind:'analystWatch',mode:'full'}));
    const stop=withTape(1,()=>changeLive(b.result!,79,{kind:'analystWatch',mode:null}));
    for(const r of [a,b,stop]) {
      expect(r.draws).toEqual([]);const l=r.result!.live!;
      expect(JSON.stringify([l.h1Play,l.h2Play,l.h2My,l.h2Opp,l.oppSubs])).toBe(pending);
    }
    expect(analystCurrent(b.result!,b.result!.live!,clock(70))).toBeNull();
    expect(changeLive(b.result!,73,{kind:'analystWatch',mode:'full'})).toBeNull();
    expect(withTape(9,()=>resumeMatch(stop.result!)).result.state.analystNotebook).toBeUndefined();
    const full=withTape(9,()=>resumeMatch(clone(b.result!))).result.report!.detail!;
    expect(full.analystNote!.from).toEqual(clock(72));
    expect(full.analystNote!.shots!.total).toBe(full.play!.filter(e=>e.side==='opp'&&e.kind==='shot'&&e.minute>72).length);
    const quick=withTape(9,()=>resumeMatch(a.result!)).result.report!.detail!.analystNote!;
    expect(quick.shots).toBeNull();expect(quick.from).toEqual(clock(60));
  });

  it('forms a recommendation from observed throws and withdraws it for an actual substitution, dismissal or shootout',()=>{
    const game=room('quick'), live=game.live!, target=live.oppXi!.find(p=>p.p==='LB')!, replacement=live.oppBench![0];
    live.h1Play=[event(target.n,9),event(target.n,45,2),event(target.n,45,3)];
    expect(analystCurrent(game,live,clock(45,1))!.recommendation).toBeNull();
    const early=analystCurrent(game,live,clock(45,2))!;
    expect(early.recommendation).toMatchObject({target:{name:target.n},todayThrows:2,pastThrows:0,pastMeetings:0});
    expect(changeLive(game,45,{kind:'returnPress',target:target.n},2)).toBeTruthy();
    live.oppSubs=[{minute:45,plus:3,off:target.n,on:replacement.n}];
    expect(analystCurrent(game,live,clock(45,3))!.recommendation).toBeNull();
    live.oppSubs=[]; live.h1OppCards=[{minute:45,plus:3,name:target.n,kind:'red'}];
    expect(analystCurrent(game,live,clock(45,2))!.recommendation).not.toBeNull();
    expect(analystCurrent(game,live,clock(45,3))!.recommendation).toBeNull();
    live.h1OppCards=[];live.penaltyCalls={fixture:'pending',draw:1,picks:[]};
    expect(analystCurrent(game,live,clock(45,3))!.recommendation).toBeNull();
    expect(changeLive(game,45,{kind:'analystWatch',mode:null},3)).toBeNull();
    expect(resumeMatch(game).state.analystNotebook).toBeUndefined();
  });

  it('separates ambiguous, unnamed, non-wide, substitute, own-goal and generated identities with exact coverage',()=>{
    const game=room('full'), l=game.live!, wide=l.oppXi!.find(p=>p.p==='LB')!, cb=l.oppXi!.find(p=>p.p==='CB')!;
    const incoming={n:'Generated test wing-back',p:'LWB' as const,r:65,g:true};
    l.oppBench=[...l.oppBench!,incoming,{...cb}];l.oppSubs=[{off:wide.n,on:incoming.n,minute:63}];l.h1OppCards=[];l.h2OppCards=[];
    const forward=l.oppXi!.find(p=>p.p==='ST')!;
    l.h1Play=[event(wide.n,11),event(cb.n,12),event('',13),event(forward.n,14)];
    l.h2Play=[event(incoming.n,64),event(wide.n,65),event(incoming.n,66,0,'shot'),event(cb.n,67,0,'shot'),event(forward.n,68,0,'corner'),
      {...event(forward.n,68,0,'shot'),on:true,goal:true}];
    l.h2Opp=[{name:'Credited defender',drawn:forward.n,og:true,minute:68}];
    const note=analystCurrent(game,l,clock(70))!.observation;
    expect(note.throws).toMatchObject({total:6,unknown:3,other:1});
    expect(note.throws.players.find(p=>p.name===incoming.n)).toMatchObject({count:1,generated:true});
    expect(note.shots).toMatchObject({total:3,unknown:2,other:0,players:[{name:incoming.n,generated:true,count:1}]});
    delete l.oppXi;
    const thin=analystCurrent(game,l,clock(70))!;
    expect(thin.observation.starters).toBeNull();expect(thin.observation.throws.unknown).toBe(6);expect(thin.recommendation).toBeNull();
  });

  it('uses strictly earlier observations by the same managing club, compares actual named starters and bases its live call on current evidence',()=>{
    const game=room('full'),l=game.live!, wide=l.oppXi!.find(p=>p.p==='RB')!;
    l.h1Play=[event(wide.n,5),event(wide.n,9)];l.h2Play=[];
    const old=fileAnalystObservation(game,l)!;expect(old).toBeTruthy();
    expect(fileAnalystObservation(game,l)).toEqual(old);expect(game.analystNotebook!.rows).toHaveLength(1);
    const second=clone(game);second.week=1;second.calendar[1]={...second.calendar[0]};const next=second.live!;next.week=1;delete next.analystWatch;
    expect(setAnalystWatch(second,next,'quick',clock(0))).toBe(true);
    next.oppXi![2]={...next.oppXi![2],n:'Changed starter',g:true};
    const moved=next.oppXi!.find((p,i)=>i!==2 && p.n!==wide.n && p.p!=='GK')!;
    moved.p=moved.p==='CM'?'CAM':'CM';next.h1Play=[event(wide.n,12)];
    const before=analystCurrent(second,next,clock(11))!, after=analystCurrent(second,next,clock(12))!;
    expect(before.recommendation).toBeNull();expect(after.history).toHaveLength(1);
    expect(after.recommendation).toMatchObject({todayThrows:1,pastThrows:2,pastMeetings:1,target:{name:wide.n}});
    expect(after.lineup).toMatchObject({overlap:10,compared:11,changedRole:1});
    expect(analystCompare(after.observation,[{...old,club:'Everton'}])).toBeNull();
    expect(analystCompare(after.observation,[{...old,season:3,week:0}])).toBeNull();
    expect(analystCompare(after.observation,[{...old,week:1}])).toBeNull();
    expect(analystCompare(after.observation,[{...old,opponent:'A different club'}])).toBeNull();
    expect(analystCurrent({...second,clubName:'Everton'},next,clock(12))).toBeNull();
  });

  it('keeps mixed match orders together, including the named bench order, flank plan and phase shapes',()=>{
    const career=opening(), g=room(), out=g.live!.onPitch[4], sub=benchFor(g,out)[0].id;
    const phaseOrder:PhaseOrder={v:1,withBall:'secure-3-2-5',withoutBall:'screen-4-1-4-1',outlet:'near',recovery:'screen'};
    const plan={...request,flankPlan:{side:'left' as const,support:'overlap' as const},phaseOrder,
      benchOrder:{outId:out,inId:sub,window:'hour' as const,when:'any' as const}};
    const a=withTape(809,()=>playNextEntry(career,{...plan,skipHalftime:true})), b=withTape(809,()=>playNextEntry(career,{...plan,analystMode:'full',skipHalftime:true}));
    expect(b.draws).toEqual(a.draws);expect(b.result.report!.detail!.analystNote).toBeTruthy();
    expect(b.result.report!.detail!.phaseHistory).toEqual(a.result.report!.detail!.phaseHistory);
    expect(b.result.report!.detail!.play).toEqual(a.result.report!.detail!.play);
    expect(b.result.report!.events.some(line=>line.startsWith('Bench order'))).toBe(true);
    const kickoff=withTape(809,()=>playNextEntry(career,{...plan,analystMode:'quick'})).result.state.live!;
    expect(kickoff.flankPlan).toEqual(plan.flankPlan);expect(kickoff.phaseOrder).toEqual(phaseOrder);
  });

  it('protects bounded notebooks, refuses stale fixture ownership and saves real extra-time observations through 120 plus added time',()=>{
    const game=room('full'),l=game.live!, base=l.analystWatch!;
    l.et={to:120} as LiveMatch['et'];l.added={...l.added,et:3};
    const w=l.oppXi!.find(p=>p.p==='RB')!;l.h2Play=[event(w.n,120,1),event(w.n,120,3)];
    expect(setAnalystWatch(game,l,'quick',clock(120,1))).toBe(true);
    expect(setAnalystWatch(game,l,'full',clock(120))).toBe(false);
    const exact=fileAnalystObservation(game,l)!;
    expect(exact).toMatchObject({from:clock(120,1),to:clock(120,3),throws:{total:1}});
    const past:AnalystNotebook={v:1,rows:[]};const test={...game,analystNotebook:past};
    const initial=game.calendar[0];test.calendar=Array.from({length:60},()=>({...initial}));
    for(let i=0;i<55;i++){
      const fixture={...l,week:i,opponent:i<5?base.opponent:'Opponent '+i,analystWatch:undefined};
      test.week=i;expect(setAnalystWatch(test,fixture,'full',clock(0))).toBe(true);
      expect(fileAnalystObservation(test,fixture)).toBeTruthy();
      if(i===4)expect(analystHistory(test,base.opponent).map(r=>r.week)).toEqual([4,3,2]);
    }
    expect(test.analystNotebook.rows).toHaveLength(48);
    const future={...game,analystNotebook:{v:2,rows:[exact]} as unknown as AnalystNotebook};
    expect(canUseAnalyst(future)).toBe(false);
    expect(fileAnalystObservation(future,l)).toBeNull();expect(future.analystNotebook.v).toBe(2);
    const noLive={...future,live:null}, bad=withTape(1,()=>playNextEntry(noLive,{analystMode:'full'}));
    expect(bad.result.blocked).toBe('analyst-unavailable');expect(bad.result.state).toBe(noLive);expect(bad.draws).toEqual([]);
    expect(fileAnalystObservation({...game,clubName:'Moved'},l)).toBeNull();
    expect(fileAnalystObservation({...game,week:l.week+1},l)).toBeNull();
  });

  it('preserves the old club records at an accepted midseason job and across a real summer without adding background observations',()=>{
    const first=withTape(47,()=>playNextEntry(opening('Aston Villa'),{analystMode:'full',skipHalftime:true})).result.state;
    const note=first.analystNotebook!.rows[0];let application:CareerState|null=null;
    for(let seed=1;seed<130&&!application;seed++){
      const submitted=withTape(Math.imul(seed,2654435761),()=>applyForJob(first,'Everton')).result;
      if(submitted?.jobHunt?.open && submitted.jobHunt.open.roll<0.05) application=submitted;
    }
    expect(application).not.toBeNull();let waiting=application!;
    for(let i=0;i<10&&waiting.jobHunt?.open?.status==='pending';i++){
      waiting=withTape(423+i,()=>playNextEntry(waiting,{skipHalftime:true})).result.state;
    }
    expect(waiting.jobHunt!.open!.status).toBe('accepted');
    const hired=withTape(241,()=>joinClubNow(waiting)).result!;
    expect(hired.clubName).toBe('Everton');expect(analystHistory(hired,note.opponent)).toEqual([]);
    expect(analystHistory(hired,note.opponent,'Aston Villa')).toEqual([note]);
    let end=first;
    for(let i=0;i<110&&end.week<end.calendar.length;i++)end=withTape(33000+i,()=>playNextEntry(end,{skipHalftime:true})).result.state;
    expect(end.week).toBe(end.calendar.length);
    const summer=withTape(33444,()=>startNextSeason(finishSeason(end).state)).result;
    expect(summer.season).toBe(2);expect(summer.analystNotebook).toEqual(first.analystNotebook);
  });
});
