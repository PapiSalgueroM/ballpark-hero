import React, {type ComponentType} from 'react';
import {afterAll,afterEach,beforeAll,describe,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import type {CareerState,ClubData,ManagerState} from '@/lib/soccerCareerEngine';
import {careerStep} from '../../scripts/lib/careerStep.mjs';

type Engine=typeof import('@/lib/soccerCareerEngine');
type Save=typeof import('@/lib/soccerCareerSave');
type Props={manager:ManagerState;career:CareerState;clubs:ClubData[];onAdvance:()=>void;onEnd:()=>void;onAcceptOffer?:(index:number)=>void;onReviewModeChange?:(enabled:boolean)=>void};
type Observer={GameScreen:ComponentType<Record<string,unknown>>;ManagerPanel:ComponentType<Props>;engine:Engine;save:Save};
type Action={label:string;seed:number;phaseBefore:string;phaseAfter:string;ageBefore:number;ageAfter:number;rawBefore:string;rawAfter:string;draws:number[];next:number};
type Run={value:CareerState;action:Action};
const NOW=1791586800000,OUT=process.env.SC_MANAGER_FOCUS_CASE_OUT;
const POLICY={constructorSeedStart:610000,constructors:128,youthSteps:12,managerSeedStart:910000,managerSteps:64,outcomeSeedStart:730000,outcomeSeeds:128};
let observed:Observer,reference:{engine:Engine;save:Save},E:Engine,S:Save,clubs:ClubData[],dispose:(()=>void)|undefined;
let employed:CareerState,national:CareerState,unemployed:CareerState;
const write=(name:string,value:unknown)=>{if(OUT){mkdirSync(OUT,{recursive:true});writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));}};
function tape<T>(seed:number,action:()=>T){
 const random=Math.random,now=Date.now,draws:number[]=[];let n=seed>>>0;
 const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const v=draw();draws.push(v);return v;};Date.now=()=>NOW;
 try{return{value:action(),draws,next:draw()};}finally{Math.random=random;Date.now=now;}
}
function call(label:string,input:CareerState,seed:number,action:(s:CareerState)=>CareerState):Run{
 const rawBefore=S.serializeSoccerCareerSave(input),phaseBefore=input.phase,ageBefore=input.age;
 const run=tape(seed,()=>action(input));
 return{value:run.value,action:{label,seed,phaseBefore,phaseAfter:run.value.phase,ageBefore,ageAfter:run.value.age,rawBefore,rawAfter:S.serializeSoccerCareerSave(run.value),draws:run.draws,next:run.next}};
}
const clone=(s:CareerState)=>structuredClone(s);
const manager=(s:CareerState)=>{assert(s.managerState,'FIXTURE_METHOD: actual manager state');return s.managerState;};
const full=(run:Run)=>({value:run.value,raw:run.action.rawAfter,draws:run.action.draws,next:run.action.next});
function gameProps(career:CareerState,extra:Record<string,unknown>={}){
 const props:Record<string,unknown>={career,clubs,timelineRef:React.createRef<HTMLDivElement>()};
 for(const name of ['onNextSeason','onAcceptOffer','onDismissSummary','onDismissNewspaper','onStay','onSignExtension','onRequestTransfer','onAcceptLoan','onEventChoice','onDismissDebut','onDismissWorldCup','onWorldCupSpeech','onRetireInternational','onReturnInternational','onDismissRivalryEvent','onDismissBallonDor','onBdorSpeech','onManualRetire','onPostRetirement','onCoachingStart','onAdvanceManager','onManagerReviewModeChange','onManagerJobResolve','onAcceptManagerOffer','onEndManager','onShare','onNewCareer','onOpenPhone','onSocialMediaAction','onCoverAthlete','onDismissSocialMedia','onMoralDilemmaChoice','onRehabChoice','onDismissMoralDilemma','onDismissAppeal','onAcceptRetirement','onDeclineRetirement','onAnnounceFarewell','onPunditAction','onEndPundit','onAdvanceOwner','onEndOwner','onAgentChange'])props[name]=()=>{};
 return{...props,...extra};
}
function uiEntry(playing:CareerState,seed:number){
 assert.equal(playing.phase,'playing');assert.equal(playing.retired,false);
 let retired:Run|undefined,started:Run|undefined;
 const before=S.serializeSoccerCareerSave(playing);
 render(React.createElement(observed.GameScreen,gameProps(playing,{onManualRetire:()=>{retired=call('Confirm Retirement -> manualRetire',playing,seed,s=>E.manualRetire(s));}})));
 const retire=screen.getByRole('button',{name:'🚪 Retire'});assert(!retire.hasAttribute('disabled'),'Actual Retire enabled');
 fireEvent.click(retire);
 const dialog=screen.getByRole('dialog',{name:'Retire?'}),confirm=within(dialog).getByRole('button',{name:'Confirm Retirement'});
 assert(!confirm.hasAttribute('disabled'));assert.equal(S.serializeSoccerCareerSave(playing),before,'Opening actual retirement prompt is read-only');
 const evidence={playing:{phase:playing.phase,age:playing.age,retired:playing.retired},retire:retire.textContent,dialog:dialog.getAttribute('aria-label'),confirm:confirm.textContent};
 fireEvent.click(confirm);cleanup();
 assert(retired,'FIXTURE_METHOD: actual Confirm callback ran');const retiredState=retired.value;
 assert(retiredState.retired&&retiredState.phase==='retirement_ceremony'&&retiredState.legacy,'FIXTURE_METHOD: actual ceremony eligibility');
 render(React.createElement(observed.GameScreen,gameProps(retiredState,{onPostRetirement:(choice:string)=>{assert.equal(choice,'manager');started=call('Become a Manager -> choosePostRetirement',retiredState,seed+1,s=>E.choosePostRetirement(s,'manager',clubs));}})));
 const start=screen.getByRole('button',{name:'📋 Become a Manager'});assert(!start.hasAttribute('disabled'));
 const entry={phase:retiredState.phase,age:retiredState.age,retired:retiredState.retired,hasLegacy:!!retiredState.legacy,button:start.textContent,courseworkButtonPresent:screen.queryByRole('button',{name:'Use coaching coursework'})!==null};
 fireEvent.click(start);cleanup();assert(started,'FIXTURE_METHOD: actual manager entry callback ran');
 assert.equal(started.value.phase,'manager_season');assert(!manager(started.value).unemployed);
 assert.equal(retired.action.rawBefore,before,'Actual retire source');assert.equal(S.serializeSoccerCareerSave(playing),before,'Retirement input held');
 return{playing,retired,started,evidence,entry};
}
async function acquire(){
 const attempts:unknown[]=[],low={pace:55,shooting:55,passing:55,dribbling:55,defending:55,physical:55,reflexes:55};
 let entry:ReturnType<typeof uiEntry>|undefined,creation:unknown;
 for(let at=0;at<POLICY.constructors&&!entry;at++){
  const seed=POLICY.constructorSeedStart+at,created=tape(seed,()=>E.initCareer('Focus Baseline','France','CM','2020s',low,55,2026,clubs,null,65));
  let state=created.value;const actions:Action[]=[];
  for(let step=0;step<POLICY.youthSteps&&state.phase!=='playing';step++){
   assert(state.phase==='youth'||state.phase==='contract_offer','FIXTURE_METHOD: unknown phase refused before dispatch');
   if(state.phase==='contract_offer')assert(state.pendingOffers.length>0,'FIXTURE_METHOD: empty-offer fabricated-playing fallback refused');
   const label=state.phase==='youth'?'advanceYouthYear':'accept actual first contract offer';
   const action=call(label,state,620000+at*16+step,s=>careerStep(E,s,clubs));
   actions.push(action.action);state=action.value;
  }
  attempts.push({seed,phase:state.phase,age:state.age,steps:actions.length});
  if(state.phase!=='playing')continue;
  assert(S.isSoccerCareerSave(state),'FIXTURE_METHOD: complete official playing state');
  entry=uiEntry(state,700000+at*2);creation={seed,constructor:created,actions};
 }
 assert(entry,'FIXTURE_METHOD: bounded genuine playing/UI-entry acquisition exhausted');
 employed=entry.started.value;
 const histories:unknown[]=[],found:{national?:unknown;unemployed?:unknown}={};
 for(let branch=0;branch<POLICY.constructors&&(!national||!unemployed);branch++){
  let state=clone(employed);const actions:Action[]=[];
  for(let step=0;step<POLICY.managerSteps;step++){
   const ms=manager(state);assert.equal(state.phase,'manager_season');
   if(ms.unemployed&&(ms.offers?.length??0)>0&&!unemployed){unemployed=clone(state);found.unemployed={branch,step,actions:[...actions],state:unemployed,raw:S.serializeSoccerCareerSave(unemployed)};}
   if(!ms.unemployed&&ms.nationalTeamOffer&&ms.managingNationalTeam&&!national){national=clone(state);found.national={branch,step,actions:[...actions],state:national,raw:S.serializeSoccerCareerSave(national)};}
   if(national&&unemployed)break;
   const seed=POLICY.managerSeedStart+branch*128+step;
   const action=ms.unemployed&&(ms.offers?.length??0)>0
    ?call('accept actual first manager offer',state,seed,s=>E.acceptManagerOffer(s,0))
    :call('advance actual manager season',state,seed,s=>E.advanceManagerSeason(s,clubs));
   actions.push(action.action);state=action.value;
  }
  histories.push({branch,steps:actions.length,lastClub:manager(state).club,lastSeason:manager(state).season,lastUnemployed:!!manager(state).unemployed,national:manager(state).nationalTeamOffer});
 }
 write('acquisition',{policy:POLICY,attempts,creation,entry,search:histories,witnesses:found,limits:'No age/phase/club/rating/manager/offer/badge injection. UI callback adapters call the same canonical formulas as actual Page handlers; this does not exercise Page transaction closures or prove browser geometry. Only final serializable manager states are cloned.'});
 assert(national&&unemployed,'FIXTURE_METHOD: bounded natural national-call/unemployed-offer acquisition exhausted');
}
beforeAll(async()=>{
 let file=process.env.SC_MANAGER_FOCUS_OBSERVER,referenceFile=process.env.SC_MANAGER_FOCUS_REFERENCE;
 if(!file||!referenceFile){const{buildSoccerManagerFocusObserver}=await import('../../scripts/qa/buildSoccerManagerFocusObserver.mjs');const built=await buildSoccerManagerFocusObserver();file=built.file;referenceFile=built.referenceFile;dispose=built.dispose;}
 const require=createRequire(import.meta.url);observed=require(file) as Observer;reference=require(referenceFile) as {engine:Engine;save:Save};E=observed.engine;S=observed.save;clubs=E.FALLBACK_CLUBS;
 assert.equal(typeof observed.GameScreen,'function');assert.equal(typeof observed.ManagerPanel,'function');assert.equal(typeof E.advanceManagerSeason,'function');assert.equal(typeof reference.engine.advanceManagerSeason,'function');
 await Promise.all([E.loadManagerMarket(),reference.engine.loadManagerMarket()]);
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
 if(!HTMLElement.prototype.scrollIntoView)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:()=>{}});
 await acquire();
},180_000);
afterAll(()=>{dispose?.();vi.unstubAllGlobals();});
afterEach(()=>{cleanup();});

describe('manager season focus baseline',()=>{
 it('employed manager can open season focus and reopen its help',async()=>{
  const before=S.serializeSoccerCareerSave(employed),onAdvance=vi.fn(),onEnd=vi.fn();
  render(React.createElement(observed.ManagerPanel,{manager:manager(employed),career:employed,clubs,onAdvance,onEnd}));
  const entry=screen.queryByRole('button',{name:/^Season focus/});
  write('missing-control',{phase:employed.phase,age:employed.age,manager:manager(employed),actualEntryPresent:entry!==null,rawBefore:before,rawAfter:S.serializeSoccerCareerSave(employed)});
  assert(entry,'MISSING_MANAGER_SEASON_FOCUS_CONTROL');assert(!entry.hasAttribute('disabled'),'Actual Season focus enabled');fireEvent.click(entry);
  const help=await screen.findByRole('button',{name:'Season focus help'});fireEvent.click(help);
  const surface=await screen.findByRole('region',{name:'Season focus help'});
  assert(within(surface).getByText(/League focus/)&&within(surface).getByText(/Cup focus/),'Actual help surface contains worked tradeoff choices');
  fireEvent.click(within(surface).getByRole('button',{name:'Back'}));
  assert.equal(onAdvance.mock.calls.length,0);assert.equal(onEnd.mock.calls.length,0);assert.equal(S.serializeSoccerCareerSave(employed),before,'Actual help/Back are read-only');
 });
 it('selected focus changes actual league and cup outcomes with the declared tradeoff',()=>{
  const all:unknown[]=[],contexts=[['ordinary',employed],['earned-national-flags',national]] as const;
  const stages=['out in the 3rd round','out in the 4th round','out in the quarter-final','out in the semi-final','beaten in the final','WON the cup'];
  const counts:Record<string,{leagueGain:number;leagueCupCost:number;cupGain:number;cupLeagueCost:number}>={};
  for(const[name,source]of contexts){
   const witnesses={leagueGain:0,leagueCupCost:0,cupGain:0,cupLeagueCost:0};counts[name]=witnesses;
   for(let at=0;at<POLICY.outcomeSeeds;at++){
    const seed=POLICY.outcomeSeedStart+at,results:Record<string,Run>={};
    for(const choice of ['balanced','league','cup'] as const){
     const input=clone(source),ms=manager(input);
     if(choice!=='balanced')Object.assign(input,{managerSeasonFocus:{version:1,club:ms.club,clubTier:ms.clubTier,...(ms.league===undefined?{}:{league:ms.league}),season:ms.season,focus:choice}});
     const raw=S.serializeSoccerCareerSave(input),run=call('actual manager advance with optional test feature payload '+choice,input,seed,s=>E.advanceManagerSeason(s,clubs));
     assert.equal(S.serializeSoccerCareerSave(input),raw,'Outcome input held');results[choice]=run;
    }
    const last=(r:Run)=>{const rows=manager(r.value).seasonResults;return rows[rows.length-1];},b=last(results.balanced),l=last(results.league),c=last(results.cup);
    assert(typeof b.playerPts==='number'&&typeof l.playerPts==='number'&&typeof c.playerPts==='number','FIXTURE_METHOD: actual own table points exist');
    const bw=stages.indexOf(b.cup??''),lw=stages.indexOf(l.cup??''),cw=stages.indexOf(c.cup??'');assert(bw>=0&&lw>=0&&cw>=0,'FIXTURE_METHOD: actual cup run exists');
    if(l.playerPts>b.playerPts)witnesses.leagueGain++;if(lw<bw)witnesses.leagueCupCost++;if(cw>bw)witnesses.cupGain++;if(c.playerPts<b.playerPts)witnesses.cupLeagueCost++;
    all.push({context:name,seed,results});
   }
  }
  write('tradeoff',{policy:POLICY,counts,all,scope:'Optional context-bound focus payload is explicit test feature input, not an acquired user selection. Base actor and national flags are genuine. Actual own table points and cup rounds, no prose/source-token proxy. Module initialization unmeasured.'});
  for(const value of Object.values(counts))assert(Object.values(value).every(n=>n>0),'MISSING_MANAGER_SEASON_FOCUS_TRADEOFF');
 },120_000);
 it('canonical default manager seasons preserve complete state save and random stream',()=>{
  const pairs:unknown[]=[];
  for(const[context,source]of [['ordinary',employed],['earned-national-flags',national]] as const){
   assert(!Object.prototype.hasOwnProperty.call(source,'managerSeasonFocus'),'Never selected stays absent');
   for(let at=0;at<32;at++){
    const seed=810000+at,a=clone(source),b=clone(source),before=S.serializeSoccerCareerSave(a);
    const actual=call('actual unchanged default',a,seed,s=>E.advanceManagerSeason(s,clubs));
    const expected=call('physically retained Enginebf4 default',b,seed,s=>reference.engine.advanceManagerSeason(s,clubs));
    assert.deepEqual(full(actual),full(expected),'Complete default typed/raw/global tape/next');assert.equal(S.serializeSoccerCareerSave(a),before);assert.equal(S.serializeSoccerCareerSave(b),before);
    pairs.push({context,seed,actual,expected});
   }
  }
  write('default-pairs',{pairs,count:pairs.length,reference:'Only Enginebf4 is frozen; other dependencies current. Module initialization excluded/unmeasured.'});
 },60_000);
 it('existing unemployed job acceptance preserves complete state save and zero draws',()=>{
  const source=clone(unemployed),ms=manager(source),offer=ms.offers?.[0];assert(ms.unemployed&&offer,'Actual unemployed state with actual offer');
  const before=S.serializeSoccerCareerSave(source),expected=call('old canonical accept actual manager offer0',clone(source),820001,s=>reference.engine.acceptManagerOffer(s,0));
  let actual:Run|undefined,index:number|undefined;
  render(React.createElement(observed.ManagerPanel,{manager:ms,career:source,clubs,onAdvance:()=>{},onEnd:()=>{},onAcceptOffer:(i:number)=>{index=i;actual=call('actual offered club button -> acceptManagerOffer',source,820001,s=>E.acceptManagerOffer(s,i));}}));
  const buttons=screen.getAllByRole('button').filter(b=>b.textContent?.includes(offer.club)&&b.textContent?.includes(offer.brief));assert.equal(buttons.length,1,'Actual offered club button is unambiguous');
  fireEvent.click(buttons[0]);assert(actual,'Actual offered button adopted canonical result');assert.equal(index,0);
  assert.deepEqual(full(actual),full(expected),'Complete unemployed acceptance typed/raw/tape/next');assert.equal(actual.action.draws.length,0);assert.equal(S.serializeSoccerCareerSave(source),before,'Actual source held');
  const isParsedCareer=(codec:Save,value:unknown):value is CareerState=>codec.isSoccerCareerSave(value);
  const parsed=S.parseSoccerCareerSave(actual.action.rawAfter),referenceParsed=reference.save.parseSoccerCareerSave(expected.action.rawAfter);
  assert(isParsedCareer(S,parsed),'Actual official parsed save passes its codec guard');assert(isParsedCareer(reference.save,referenceParsed),'Reference official parsed save passes its codec guard');
  const loaded=E.repairCareer(parsed),referenceLoaded=reference.engine.repairCareer(referenceParsed);assert(S.isSoccerCareerSave(loaded));assert.deepEqual(loaded,referenceLoaded,'Official accepted-state loads match retained authority');
  write('unemployed-acceptance',{source,offer,index,actual,expected,loaded,rawBefore:before,rawAfter:S.serializeSoccerCareerSave(source),scope:'Actual ManagerPanel offer button and canonical callback formula, not outer Page transaction closure.'});
 });
});
