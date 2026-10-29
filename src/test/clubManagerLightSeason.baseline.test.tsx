import React, {type ComponentType} from 'react';
import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {CareerState,CMPlayer,TrainingPlan} from '@/lib/clubManager';

type CM=typeof import('@/lib/clubManager') & {
  cmLightWeek:(state:CareerState,played:Set<string>|null)=>void;
  cmLightNight:(state:CareerState,played:Set<string>)=>void;
  cmLightAge:(player:CMPlayer,state:CareerState,random?:()=>number)=>CMPlayer;
};
type LightRecord={version:1;clubName:string;season:number;playerId:string;manKey:string;worldRosterKey?:string};
type LightCareer=CareerState & {individualLightSeason?:LightRecord};
type ScreenProps={career:CareerState;onSetPlan:(plan:TrainingPlan)=>void;onRetrain:(id:string,to:CMPlayer['position'])=>void;onStopRetrain:(id:string)=>void};
let E:CM,B:CM,Training:ComponentType<ScreenProps>,dispose:(()=>void)|undefined,out:string;
let observedFile:string,referenceFile:string;
const nodeRequire=createRequire(import.meta.url);
let actors:ReturnType<typeof acquire>;
const sha=(body:string|Uint8Array)=>createHash('sha256').update(body).digest('hex');
const copy=<T,>(value:T):T=>structuredClone(value);
const noop=()=>{};
function retain(name:string,value:unknown){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
function traced<T>(seed:number,action:(draws:number[])=>T){
  const real=Math.random,now=Date.now,draws:number[]=[];let n=seed>>>0;
  const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
  Math.random=()=>{const value=draw();draws.push(value);return value;};Date.now=()=>1791586800000;
  try{return{value:action(draws),draws,next:draw()};}finally{Math.random=real;Date.now=now;}
}
function fresh(which:'actual'|'reference'):CM{
  const file=which==='actual'?observedFile:referenceFile;
  delete nodeRequire.cache[nodeRequire.resolve(file)];
  return nodeRequire(file).cm;
}
function call(mod:CM,input:CareerState,seed:number,action:(state:CareerState)=>CareerState){
  const before=JSON.stringify(input),run=traced(seed,()=>action(input));
  unique(mod,run.value);
  return{...run,inputBefore:before,inputAfter:JSON.stringify(input),full:JSON.stringify(run.value),trim:JSON.stringify(mod.trimCareer(run.value)),lean:JSON.stringify(mod.leanCareer(run.value))};
}
function pair(actual:ReturnType<typeof call>,expected:ReturnType<typeof call>){
  expect(actual.value).toStrictEqual(expected.value);expect(actual.full).toBe(expected.full);expect(actual.trim).toBe(expected.trim);expect(actual.lean).toBe(expected.lean);
  expect(actual.inputBefore).toBe(expected.inputBefore);expect(actual.inputAfter).toBe(expected.inputAfter);expect(actual.draws).toEqual(expected.draws);expect(actual.next).toBe(expected.next);
}
function record(state:CareerState,player:CMPlayer):LightRecord{
  return{version:1,clubName:state.clubName,season:state.season,playerId:player.id,manKey:B.sameManKey(player),...(typeof player.worldRosterKey==='string'?{worldRosterKey:player.worldRosterKey}:{})};
}
function assigned(state:CareerState,player:CMPlayer):LightCareer{
  // Deliberate prospective optional feature input, not an existing earned action.
  return{...copy(state),individualLightSeason:record(state,player)};
}
function player(state:CareerState,id:string){const matches=state.squad.filter(p=>p.id===id);if(matches.length!==1)throw new Error('Actual unique owned actor is required: '+id);return matches[0];}
function eligible(mod:CM,state:CareerState){
  return mod.developingPlayers(state).filter(p=>!p.onLoan&&p.injuryWeeks===0&&(p.contractYears??0)>1&&state.squad.filter(q=>q.id===p.id).length===1);
}
function unique(mod:CM,state:CareerState){
  expect(new Set(state.squad.map(p=>p.id)).size,'Actual squad IDs stay unique').toBe(state.squad.length);
  expect(new Set(state.squad.map(p=>mod.sameManKey(p))).size,'Actual squad identities stay unique').toBe(state.squad.length);
}
function journey(mod:CM,seed:number,stopAfterStep?:number){
  const constructor=traced(64000+seed,()=>mod.startCareer('Brentford'));
  let current=mod.setTrainingPlan(constructor.value,{intensity:'normal',focus:'balanced'}),fatigue:CareerState|undefined,fatigueId:string|undefined,steps=0,fatigueStep=0,fatigueDrawCount=0;
  const calendar=traced(65000+seed,draws=>{
    while(current.week<current.calendar.length&&steps++<140){
      const result=mod.playNextEntry(current,{skipHalftime:true});current=result.state;
      if(!fatigue&&result.kind==='match'){
        const candidate=eligible(mod,current).find(p=>p.fitness<100);
        if(candidate){fatigue=copy(current);fatigueId=candidate.id;fatigueStep=steps;fatigueDrawCount=draws.length;}
      }
      if(stopAfterStep===steps)return current;
      if(result.kind==='seasonOver')break;
    }
    if(stopAfterStep!==undefined)throw new Error('Genuine replay did not reach its recorded acquisition step');
    if(current.week<current.calendar.length)throw new Error('Actual calendar exceeded existing runSeason140 bound');
    return mod.finishSeason(current).state;
  });
  unique(mod,calendar.value);
  return{constructor,calendar,steps,fatigue,fatigueId,fatigueStep,fatigueDrawCount};
}
let replayCount=0;
function replay(which:'actual'|'reference',endpoint:'fatigue'|'finished'){
  const mod=fresh(which),run=journey(mod,actors.seed,endpoint==='fatigue'?actors.fatigueStep:undefined),expected=endpoint==='fatigue'?actors.fatigue:actors.finished;
  expect(run.constructor).toStrictEqual(actors.constructor);
  expect(run.calendar.value).toStrictEqual(expected);expect(JSON.stringify(run.calendar.value)).toBe(JSON.stringify(expected));
  const count=endpoint==='fatigue'?actors.fatigueDrawCount:actors.calendar.draws.length;
  expect(run.calendar.draws).toEqual(actors.calendar.draws.slice(0,count));expect(run.calendar.next).toBe(actors.calendar.draws[count]??actors.calendar.next);
  retain('replay-'+(++replayCount),{which,endpoint,constructor:run.constructor,calendar:run.calendar,scope:'Fresh instance replays the genuine public constructor/calendar seeds and exact acquisition history before its action; no cross-instance state is adopted and no private counters are patched.'});
  return{mod,state:run.calendar.value};
}
function acquire(){
  const attempts:unknown[]=[],annualAttempts:unknown[]=[];let annualCount=0;
  for(let seed=1;seed<=24;seed++){
    const mod=fresh('reference'),run=journey(mod,seed),{constructor:built,calendar:season,steps,fatigue,fatigueId,fatigueStep,fatigueDrawCount}=run;
    const finished=season.value,candidates=eligible(mod,finished).filter(p=>{
      const normal=mod.developmentRate(p,finished),light=mod.developmentRate(p,mod.setTrainingPlan(finished,{intensity:'light',focus:'balanced'}));
      return normal>light&&normal<mod.DEVELOPMENT_RATE_MAX;
    });
    let decline:{id:string;seed:number}|undefined;
    for(let d=1;d<=32&&!decline;d++)for(const p of finished.squad.filter(q=>!q.onLoan&&q.age>=30)){
      if(traced(69500+d,()=>mod.cmLightAge(copy(p),finished)).value.rating<p.rating){decline={id:p.id,seed:69500+d};break;}
    }
    attempts.push({seed,steps,club:finished.clubName,season:finished.season,sacked:finished.sacked,fatigueId:fatigueId??null,candidates:candidates.map(p=>p.id),decline,constructorDraws:built.draws.length,seasonDraws:season.draws.length});
    if(!fatigue||!fatigueId||finished.sacked||!candidates.length||!decline)continue;
    for(let nextSeed=1;nextSeed<=64&&annualCount<64;nextSeed++){
      annualCount++;const actionSeed=66000+nextSeed;
      const normalModule=fresh('reference'),lightModule=fresh('reference');
      const normalHistory=journey(normalModule,seed),lightHistory=journey(lightModule,seed);
      expect(normalHistory).toStrictEqual(run);expect(lightHistory).toStrictEqual(run);
      const normal=call(normalModule,normalHistory.calendar.value,actionSeed,s=>normalModule.startNextSeason(s));
      const lightInput=lightModule.setTrainingPlan(lightHistory.calendar.value,{intensity:'light',focus:'balanced'}),light=call(lightModule,lightInput,actionSeed,s=>lightModule.startNextSeason(s));
      const chosen=candidates.find(p=>{
        const a=normal.value.squad.find(q=>q.id===p.id),b=light.value.squad.find(q=>q.id===p.id);
        return a&&b&&a.rating>b.rating&&a.rating>p.rating&&b.rating>=p.rating;
      });
      annualAttempts.push({seed:actionSeed,normalSeason:normal.value.season,lightSeason:light.value.season,chosen:chosen?.id??null});
      if(chosen){const value={seed,constructor:built,calendar:season,steps,fatigue,fatigueId,fatigueStep,fatigueDrawCount,finished,growthId:chosen.id,decline,annualSeed:actionSeed,normal,light,attempts,annualAttempts,scope:'Genuine official constructor/calendar/finish/rollover actors. No player, rating, age, contract, fixture or core phase injection. Each fresh paired instance replays the exact genuine acquisition history before its action. Initialization is excluded and unmeasured.'};retain('actors',value);return value;}
    }
  }
  retain('actor-search-failure',{attempts,annualAttempts});throw new Error('No genuine fatigue and unclamped positive-growth actor within24 constructors/64 actual rollovers');
}

beforeAll(async()=>{
  let directory=process.env.CM_LIGHT_SEASON_OBSERVER_DIR;
  if(!directory){const {buildCmLightSeasonObserver}=await import('../../scripts/qa/buildCmLightSeasonObserver.mjs');const built=await buildCmLightSeasonObserver();directory=built.directory;dispose=built.dispose;}
  const meta=JSON.parse(fs.readFileSync(path.join(directory,'observer.json'),'utf8')),file=path.join(directory,'observed.cjs'),baseFile=path.join(directory,'base.cjs');
  expect(sha(fs.readFileSync(file))).toBe(meta.compiledSHA256);expect(sha(fs.readFileSync(baseFile))).toBe(meta.baseCompiledSHA256);expect(meta.onlyAppendedPrivateExports).toBe(true);
  observedFile=file;referenceFile=baseFile;
  const observed=nodeRequire(file),reference=nodeRequire(baseFile);E=observed.cm;B=reference.cm;Training=observed.TrainingScreen;
  for(const mod of [E,B])for(const name of ['startCareer','playNextEntry','finishSeason','startNextSeason','setTrainingPlan','developmentRate','developingPlayers','cmLightWeek','cmLightNight','cmLightAge','saveCareer','loadCareer'])expect(typeof mod[name as keyof CM],'Existing actual API '+name).toBe('function');
  expect(typeof Training).toBe('function');out=path.resolve(process.env.CM_LIGHT_SEASON_CASE_OUT||path.join(directory,'cases'));fs.mkdirSync(out,{recursive:true});retain('observer',meta);
  localStorage.clear();actors=acquire();
},900_000);
afterAll(()=>{dispose?.();});
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});

describe('Club Manager Light season actual-source baseline',()=>{
  it('offers the season-long individual choice in the actual TrainingScreen',()=>{
    const state=copy(actors.fatigue),before=JSON.stringify(state);
    render(<Training career={state} onSetPlan={noop} onRetrain={noop} onStopRetrain={noop}/>);
    const control=screen.queryByRole('button',{name:/^Light season\b/});
    retain('control',{club:state.clubName,season:state.season,found:control!==null,rendered:document.body.innerHTML});
    expect(control,'MISSING_CM_LIGHT_SEASON_CONTROL: the real training screen needs the explicit season-long action').not.toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('uses existing Light recovery for the committed owned player',()=>{
    const p=player(actors.fatigue,actors.fatigueId),metadata=record(actors.fatigue,p),rows=[];
    for(const kind of ['week','night'] as const){
      const run=(mod:CM,state:CareerState)=>call(mod,state,67001,s=>{if(kind==='week')mod.cmLightWeek(s,null);else mod.cmLightNight(s,new Set([p.id]));return s;});
      const aa=replay('actual','fatigue'),nn=replay('reference','fatigue'),ll=replay('reference','fatigue');
      const actual=run(aa.mod,assigned(aa.state,player(aa.state,p.id))),normal=run(nn.mod,nn.state),light=run(ll.mod,ll.mod.setTrainingPlan(ll.state,{intensity:'light',focus:'balanced'}));
      rows.push({kind,actual,normal,light});retain('recovery',{actor:p,metadata,rows,scope:'Actual private week/night functions on a genuine tired actor; night observation is isolated, not a fabricated played European fixture.'});
      expect(player(light.value,p.id).fitness,'Actual existing Light reference must improve this tired actor').toBeGreaterThan(player(normal.value,p.id).fitness);
      expect(player(actual.value,p.id).fitness,'MISSING_CM_LIGHT_SEASON_RECOVERY: valid optional commitment must use the existing Light recovery').toBe(player(light.value,p.id).fitness);
      expect(actual.value.training).toEqual(normal.value.training);expect(actual.draws).toEqual(normal.draws);expect(actual.next).toBe(normal.next);
      expect(actual.value.squad.filter(q=>q.id!==p.id)).toStrictEqual(normal.value.squad.filter(q=>q.id!==p.id));
    }
  });

  it('retains the actual Light growth cost after a late team-plan change',()=>{
    const actor=replay('actual','finished'),p=player(actor.state,actors.growthId),committed=assigned(actor.state,p),before=JSON.stringify(committed);
    const late=actor.mod.setTrainingPlan(committed,{intensity:'normal',focus:'balanced'}) as LightCareer;
    expect(late.individualLightSeason).toEqual(committed.individualLightSeason);expect(JSON.stringify(committed)).toBe(before);
    const actual=call(actor.mod,late,actors.annualSeed,s=>actor.mod.startNextSeason(s)),actualPlayer=player(actual.value,p.id),lightPlayer=player(actors.light.value,p.id),normalPlayer=player(actors.normal.value,p.id);
    retain('growth',{actor:p,commitment:committed.individualLightSeason,latePlan:late.training,actual,normal:actors.normal,light:actors.light,scope:'Actual public rollover after late global plan selection. A future individual-clear API is not imported or mirrored here; its real denial is a fixed-product test.'});
    expect(normalPlayer.rating).toBeGreaterThan(lightPlayer.rating);
    expect(actualPlayer.rating,'MISSING_CM_LIGHT_SEASON_GROWTH: the season commitment must survive the late team-plan change through actual growth').toBe(lightPlayer.rating);
    expect(actual.value.season).toBe(actors.finished.season+1);expect((actual.value as LightCareer).individualLightSeason).toBeUndefined();
  },180_000);

  it('preserves untouched global plans and full state save and random receipts',()=>{
    const rows=[];
    for(const intensity of ['light','normal','double'] as const){
      const run=(actor:ReturnType<typeof replay>)=>call(actor.mod,actor.mod.setTrainingPlan(actor.state,{intensity,focus:'balanced'}),68001,s=>{actor.mod.cmLightWeek(s,null);return s;});
      const actual=run(replay('actual','fatigue')),expected=run(replay('reference','fatigue'));pair(actual,expected);
      const annual=(actor:ReturnType<typeof replay>)=>call(actor.mod,actor.mod.setTrainingPlan(actor.state,{intensity,focus:'balanced'}),68002,s=>actor.mod.startNextSeason(s));
      const a=annual(replay('actual','finished')),b=annual(replay('reference','finished'));pair(a,b);
      expect(Object.prototype.hasOwnProperty.call(actual.value,'individualLightSeason')).toBe(false);expect(Object.prototype.hasOwnProperty.call(a.value,'individualLightSeason')).toBe(false);rows.push({intensity,week:{actual,expected},annual:{actual:a,expected:b}});
    }
    const uiActor=replay('actual','fatigue'),state=uiActor.state,before=JSON.stringify(state),onSet=vi.fn((plan:TrainingPlan)=>uiActor.mod.setTrainingPlan(state,plan));
    render(<Training career={state} onSetPlan={onSet} onRetrain={noop} onStopRetrain={noop}/>);
    const ui=traced(68003,()=>{fireEvent.click(screen.getByRole('button',{name:/Normal$/}));return onSet.mock.calls;});
    expect(onSet).toHaveBeenCalledTimes(1);expect(onSet).toHaveBeenCalledWith({...state.training,intensity:'normal'});expect(ui.draws).toHaveLength(0);expect(JSON.stringify(state)).toBe(before);
    const save=(actor:ReturnType<typeof replay>)=>traced(68004,()=>{localStorage.clear();expect(actor.mod.saveCareer(actor.state)).toBe(true);const raw=localStorage.getItem(actor.mod.SAVE_KEY);expect(raw).not.toBeNull();const loaded=actor.mod.loadCareer();expect(loaded).not.toBeNull();unique(actor.mod,loaded!);return{raw,loaded};});
    const saved=save(replay('actual','fatigue')),reference=save(replay('reference','fatigue'));expect(saved).toStrictEqual(reference);retain('default',{rows,ui,saved,reference});
  },180_000);

  it('preserves invalid optional metadata and the existing negative age drift',()=>{
    const p=player(actors.fatigue,actors.fatigueId),valid=record(actors.fatigue,p),variants=[{...valid,season:valid.season-1},{...valid,clubName:'QA_FOREIGN_CONTEXT'},{...valid,playerId:valid.playerId+'-missing'},{version:99}],rows=[];
    for(const metadata of variants){
      const run=(actor:ReturnType<typeof replay>)=>call(actor.mod,{...actor.state,individualLightSeason:metadata} as CareerState,69001,s=>{actor.mod.cmLightWeek(s,null);return s;});const actual=run(replay('actual','fatigue')),expected=run(replay('reference','fatigue'));pair(actual,expected);rows.push({metadata,actual,expected});
    }
    const aa=replay('actual','finished'),bb=replay('reference','finished'),older=player(aa.state,actors.decline.id),oldReference=player(bb.state,actors.decline.id);
    const a=traced(actors.decline.seed,()=>aa.mod.cmLightAge(copy(older),assigned(aa.state,older))),b=traced(actors.decline.seed,()=>bb.mod.cmLightAge(copy(oldReference),assigned(bb.state,oldReference)));
    expect(b.value.rating,'Actual old reference must really decline').toBeLessThan(older.rating);expect(a).toStrictEqual(b);retain('invalid-and-decline',{rows,older,actual:a,reference:b,scope:'Deliberately invalid optional metadata only. No core roster, age, rating, contract or phase fabrication.'});
  },180_000);
});
