import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeLive, coachQuickMatch, effectiveXIWithSlots, isAvailable, playNextEntry, resumeMatch, startCareer, type CareerState,
  type LiveMatch, type TrainingIntensity } from '@/lib/clubManager';
import { bindReturn, bookReturnToPlay, cancelReturnToPlay, departReturn, finishReturn, isReturnReceipt, noteReturnTraining,
  returnAfterJob, returnCoachCue, returnToPlayDesk, type ReturnPlan } from '@/lib/clubManagerReturnToPlay';
import { keyedRng } from '@/lib/keyedRng';

const copy = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
const seed = (key:string) => vi.spyOn(Math,'random').mockImplementation(keyedRng(key));
afterEach(()=>vi.restoreAllMocks());

function setup(plan: ReturnPlan = 'late-cameo') {
  seed('return fixture');
  const base = startCareer('Liverpool');
  const xi = effectiveXIWithSlots(base).map(row=>row.p);
  const p = xi.find(q => q.position !== 'GK' && base.squad.some(other =>
    !xi.some(s=>s.id===other.id) && other.position===q.position && isAvailable(other)))!;
  const partner = base.squad.find(q=>q.position===p.position && !xi.some(s=>s.id===q.id) && isAvailable(q))!;
  p.injuryWeeks=2;
  const booked = bookReturnToPlay(base,p.id,plan)!;
  expect(booked).not.toBeNull();
  const ready=copy(booked);
  ready.squad.find(q=>q.id===p.id)!.injuryWeeks=0;
  ready.xiIds=xi.map(q=>q.id===p.id && plan==='late-cameo' ? partner.id : q.id);
  const projected=returnToPlayDesk(ready).active!;
  seed('return kickoff');
  const match=playNextEntry(ready).state;
  return {base,booked,ready,match,id:p.id,projected};
}

describe('managed first appearance after clearance',()=>{
  it('books only an observed own active injury, locks unreadable books and waits for actual clearance',()=>{
    const {base,booked,ready,id}=setup();
    expect(returnToPlayDesk(booked).active?.status).toBe('recovering');
    expect(returnToPlayDesk(ready).active?.status).toBe('ready');
    expect(playNextEntry(booked).live?.returnToPlay).toBeUndefined();
    const plain=copy(ready);delete plain.returnToPlay;
    expect(bookReturnToPlay(plain,id,'late-cameo')).toBeNull();
    const suspended=copy(ready);suspended.squad.find(p=>p.id===id)!.suspendedMatches=1;
    expect(returnToPlayDesk(suspended).active?.status).toBe('suspended');
    expect(playNextEntry(suspended).live?.returnToPlay).toBeUndefined();
    expect(cancelReturnToPlay(booked)).toEqual(base);
    for(const raw of [{v:2}, {v:1,newFormat:7}, {v:1,active:{playerId:id}},[{v:1}]]){
      const unknown={...base,returnToPlay:raw} as CareerState;
      expect(returnToPlayDesk(unknown).locked).toBe(true);
      expect(bookReturnToPlay(unknown,id,'late-cameo')).toBeNull();
      expect(playNextEntry(unknown).state.returnToPlay).toEqual(raw);
    }
    const away=copy(base);away.squad.find(p=>p.id===id)!.loanFrom='Another club';
    expect(bookReturnToPlay(away,id,'managed-start')).toBeNull();
    expect(departReturn(booked,id,booked.clubName).returnToPlay).toBeUndefined();
    expect(departReturn(booked,id,'Other')).toBe(booked);
    expect(returnAfterJob(booked)).toBeUndefined();
  });

  it.each(['late-cameo','managed-start'] as const)('executes a named legal %s change and settles only the real shift',plan=>{
    const {match,projected,id}=setup(plan);
    const cue=returnCoachCue(match)!;
    expect(cue).toEqual(projected.cue);
    expect(cue.window).toBe(plan==='late-cameo'?'late':'hour');
    expect(cue.outId).not.toBe(cue.inId);
    const run=()=>{seed('return coach');return resumeMatch(coachQuickMatch(copy(match)));};
    const result=run(), report=result.report!.detail!, receipt=report.returnToPlay!;
    expect(report.subs.some(sub=>sub.off===cue.outName && sub.on===cue.inName)).toBe(true);
    expect(receipt.playerId).toBe(id);
    expect(receipt.started).toBe(plan==='managed-start');
    expect(receipt.minutes).toBeGreaterThanOrEqual(plan==='late-cameo'?8:58);
    expect(receipt.minutes).toBeLessThanOrEqual(plan==='late-cameo'?30:80);
    expect(isReturnReceipt(receipt)).toBe(true);
    expect(result.state.returnToPlay).toEqual({v:1,last:receipt});
    expect(returnAfterJob(result.state)).toEqual({v:1,last:receipt});
    expect(returnToPlayDesk({...result.state,clubName:'Other'}).last).toBeNull();
    const replay=run();
    expect(replay.report).toEqual(result.report);
    expect(replay.state.squad).toEqual(result.state.squad);
    expect(replay.state.returnToPlay).toEqual(result.state.returnToPlay);
    expect(finishReturn(result.state,match.live!)).toBeNull();
  });

  it('uses explicit coaching first, leaves an unused bench case open and rejects stale ownership',()=>{
    const {match,id}=setup();
    const missed=coachQuickMatch(match,{outId:'not-on-field',inId:id,window:'late',when:'any'});
    expect(missed.live?.benchOrderReport).toContain('no longer available');
    const unused=resumeMatch(match);
    expect(unused.report?.detail?.returnToPlay).toBeUndefined();
    expect(unused.state.returnToPlay?.active?.playerId).toBe(id);
    for(const stale of [{...match,clubName:'Foreign club'},{...match,week:match.week+1}]){
      expect(finishReturn(stale,match.live!)).toBeNull();
    }
    expect(cancelReturnToPlay(match)).toBeNull();
    expect(bookReturnToPlay(match,id,'managed-start')).toBeNull();
  });

  it('counts the first and second boards and ends at the first real exit; no same-name or shootout minutes',()=>{
    const {match,id}=setup();
    const raw=copy(match.live!);
    raw.added={h1:4,h2:6,et:2};raw.et={from:90,to:120};raw.h1Injuries=[];raw.h2Injuries=[];
    raw.h1Cards=[];raw.h2Cards=[{id:'a-namesake',name:'Same name',kind:'red',minute:62}];
    const shifted=(sub:NonNullable<LiveMatch['subs']>[number], extra?: Partial<LiveMatch>)=>{
      const s=copy(match),live={...copy(raw),subs:[sub],...extra};return finishReturn(s,live);
    };
    const half={minute:46,onId:id,off:'Other',on:'Returning',returnBreak:'half' as const};
    expect(shifted(half)).toMatchObject({entry:{minute:45,plus:4},exit:{minute:120,plus:2},minutes:83});
    expect(shifted({...half,minute:90,returnBreak:'extra'})).toMatchObject({entry:{minute:90,plus:6},minutes:32});
    expect(shifted({...half,minute:90,plus:4,returnBreak:undefined})).toMatchObject({entry:{minute:90,plus:4},minutes:34});
    expect(shifted(half,{h2Cards:[{name:'Sent off',id,kind:'red',minute:61}]})).toMatchObject({exit:{minute:61},minutes:16});
    expect(shifted(half,{h2Injuries:[{name:'Returning',id,minute:62,weeks:2}]})).toMatchObject({minutes:17,outcome:'match-injury',setbackWeeks:0});
    expect(shifted({...half,minute:120,plus:2,returnBreak:undefined})).toBeNull();
    const m=changeLive(match,46,{kind:'sub',outId:returnCoachCue(match)!.outId,inId:id})!;
    expect(m.live?.subs?.at(-1)?.returnBreak).toBe('half');
    const report=resumeMatch(m).report!.detail!;
    expect(report.returnToPlay?.entry).toEqual({minute:45,...(report.added?.h1?{plus:report.added.h1}:{})});
  });

  it('uses the last two actually charged intensities once and preserves existing injuries',()=>{
    const {match,ready,id}=setup('managed-start');
    const p=match.squad.find(q=>q.id===id)!;
    const load=(week:number,intensity:TrainingIntensity)=>noteReturnTraining(match,p,week,intensity);
    load(1,'light');load(2,'normal');load(2,'double');load(3,'double');
    expect(match.returnToPlay!.active!.training.map(t=>t.intensity)).toEqual(['normal','double']);
    p.injuryWeeks=2;load(4,'normal');
    expect(match.returnToPlay!.active!.training.at(-1)?.week).toBe(3);
    expect(finishReturn(match,match.live!)?.outcome).toBe('training-injury');
    expect(p.injuryWeeks).toBe(2);
    ready.training={intensity:'normal',focus:'balanced',recoveryWeek:{v:2,club:ready.clubName,season:ready.season,playerId:id,intensity:'double'}};
    seed('return individual');
    const res=playNextEntry(ready,{skipHalftime:true});
    expect(res.report?.detail?.returnToPlay?.training.at(-1)?.intensity).toBe('double');
    const next=res.state.squad.find(q=>q.id===id)!;
    expect(next.trainingExposure?.counts[7]).toBeGreaterThan(0);
  });

  it('links the fictional setback to actual load on paired worlds, with no global draw and no premature clearance',()=>{
    const {ready,match,id}=setup('managed-start');
    const fixture=match.live!, locked=copy(match);locked.squad.find(q=>q.id===id)!.injuryWeeks=1;
    const unbound={...fixture};delete unbound.returnToPlay;
    bindReturn(locked,unbound);expect(unbound.returnToPlay).toBeUndefined();
    const base=match.squad.find(q=>q.id===id)!;
    const measure=(worldSeed:number,exitMinute:number,intensity:TrainingIntensity)=>{
      const p={...base},s={...match,worldSeed,squad:[p],returnToPlay:copy(ready.returnToPlay)};
      noteReturnTraining(s,p,s.week,intensity);
      const live={...fixture,h1Injuries:[],h2Injuries:[],h1Cards:[],h2Cards:[],added:{h1:0,h2:0},
        subs:[{off:'Returning',offId:id,on:'Replacement',minute:exitMinute}]};
      const receipt=finishReturn(s,live)!;
      expect(p.injuryWeeks).toBe(receipt.setbackWeeks);
      return receipt;
    };
    const global=vi.spyOn(Math,'random');global.mockClear();
    let short=0,long=0,doubles=0;
    for(let world=0;world<512;world++){
      short+=measure(world,15,'light').setbackWeeks;long+=measure(world,90,'light').setbackWeeks;
      doubles+=measure(world,90,'double').setbackWeeks;
    }
    expect(global).not.toHaveBeenCalled();
    expect(long-short).toBeGreaterThan(35);
    expect(doubles-long).toBeGreaterThan(8);
    console.log('512 paired fictional returns, setbacks for 15 light / 90 light / 90 double',short,long,doubles);
  });
});
