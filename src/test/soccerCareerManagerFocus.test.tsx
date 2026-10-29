import React, {StrictMode,useState} from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {HelmetProvider} from 'react-helmet-async';
import {MemoryRouter} from 'react-router-dom';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import type {CareerState} from '@/lib/soccerCareerEngine';
import * as E from '@/lib/soccerCareerEngine';
import * as S from '@/lib/soccerCareerSave';
import {chooseManagerSeasonFocus,managerSeasonFocusAvailable,readManagerSeasonFocus,type ManagerSeasonFocusCareer} from '@/lib/soccerCareerManagerFocus';
import {advanceReviewedManagerSeason,readManagerJobReview,setManagerJobReview,setManagerSeasonFocus} from '@/lib/soccerCareerManagerJobReview';
import {useSoccerManagerJobReview} from '@/hooks/useSoccerManagerJobReview';
import SoccerManagerSeasonFocus from '@/components/soccer-career/SoccerManagerSeasonFocus';
import SoccerCareer from '@/pages/SoccerCareer';

vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:null,profile:null,loading:false})}));
vi.mock('@/hooks/useGameCompletion',()=>({useGameCompletion:()=>{}}));
vi.mock('@/lib/completions',async original=>({...await original<Record<string,unknown>>(),recordCompletion:vi.fn(),recordActivity:vi.fn(),recordStreakDay:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({
  SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',
  supabase:{from:()=>{throw new Error('Unexpected external data call in manager focus test');},rpc:()=>{throw new Error('Unexpected external data call in manager focus test');},functions:{invoke:()=>{throw new Error('Unexpected external data call in manager focus test');}}},
}));

const fixture=JSON.parse(readFileSync(new URL('./fixtures/soccerManagerFocus.before.json',import.meta.url),'utf8'));
function retain(name:string,value:unknown){const out=process.env.SC_MANAGER_FOCUS_TEST_OUT;if(out){mkdirSync(out,{recursive:true});writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));}}
const clubs=E.FALLBACK_CLUBS,copy=(s:CareerState)=>structuredClone(s),own=(s:object,key:string)=>Object.prototype.hasOwnProperty.call(s,key);
const isCareer=(value:unknown):value is CareerState=>S.isSoccerCareerSave(value);
function parse(raw:string){const value=S.parseSoccerCareerSave(raw);assert(isCareer(value),'Actual official saved career required');return value;}
function actor(name:'employedRaw'|'nationalRaw'|'unemployedRaw'|'jobCandidateRaw'){return parse(fixture.actors[name]);}
function taped<T>(seed:number,action:()=>T){
 const random=Math.random,now=Date.now,draws:number[]=[];let n=seed>>>0;
 const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const value=draw();draws.push(value);return value;};Date.now=()=>1791586800000;
 try{return{value:action(),draws,next:draw()};}finally{Math.random=random;Date.now=now;}
}
const json=(s:unknown)=>JSON.parse(JSON.stringify(s));
const last=(s:CareerState)=>{assert(s.managerState);const rows=s.managerState.seasonResults;return rows[rows.length-1];};
let pending:CareerState;
beforeAll(async()=>{
 await E.loadManagerMarket();
 const source=setManagerJobReview(actor('jobCandidateRaw'),clubs,true);
 for(let seed=850000;seed<850256&&!pending;seed++){
  const run=taped(seed,()=>advanceReviewedManagerSeason(copy(source),clubs));
  if(readManagerJobReview(run.value,clubs)?.pending)pending=run.value;
 }
 assert(pending,'Actual genuine intermediate manager must earn a real pending approach within256 seeds');
},60_000);
beforeEach(()=>{
 localStorage.clear();
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
 vi.stubGlobal('IntersectionObserver',class{observe(){}unobserve(){}disconnect(){}});
 if(!HTMLElement.prototype.scrollIntoView)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:()=>{}});
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();});

describe('manager season focus authority and persistence',()=>{
 it('keeps absent Balanced selection as an identity with zero draws',()=>{
  const source=actor('employedRaw'),before=S.serializeSoccerCareerSave(source);
  const run=taped(860001,()=>{expect(readManagerSeasonFocus(source)).toBeNull();return setManagerSeasonFocus(source,clubs,'balanced');});
  expect(run.value).toBe(source);expect(run.draws).toEqual([]);expect(own(source,'managerSeasonFocus')).toBe(false);expect(S.serializeSoccerCareerSave(source)).toBe(before);
 });
 it('binds explicit preparation to the current job and survives official load',()=>{
  const source=actor('employedRaw'),before=S.serializeSoccerCareerSave(source),ms=source.managerState!;
  const run=taped(860002,()=>setManagerSeasonFocus(source,clubs,'league'));
  expect(run.draws).toEqual([]);expect(readManagerSeasonFocus(run.value)).toBe('league');expect(S.serializeSoccerCareerSave(source)).toBe(before);
  expect((run.value as ManagerSeasonFocusCareer).managerSeasonFocus).toEqual({version:1,club:ms.club,clubTier:ms.clubTier,...(own(ms,'league')?{league:ms.league}:{}),season:ms.season,focus:'league'});
  const saved=S.serializeSoccerCareerSave(run.value),loaded=E.repairCareer(parse(saved));expect(readManagerSeasonFocus(loaded)).toBe('league');expect(S.serializeSoccerCareerSave(loaded)).toBe(saved);
  expect(setManagerSeasonFocus(run.value,clubs,'league')).toBe(run.value);
  const cleared=setManagerSeasonFocus(loaded,clubs,'balanced');expect(own(cleared,'managerSeasonFocus')).toBe(false);expect(S.serializeSoccerCareerSave(cleared)).toBe(before);
 });
 it('reads ignored optional records without writes and permits explicit recovery',()=>{
  const source=actor('employedRaw'),valid=chooseManagerSeasonFocus(source,'league') as ManagerSeasonFocusCareer;
  const record=valid.managerSeasonFocus as Record<string,unknown>;
  const bad=[null,'legacy',{version:99},{...record,version:99},{...record,season:source.managerState!.season-1},{...record,club:'Foreign saved job'},{...record,focus:'unknown'}];
  const rows:unknown[]=[];
  for(const value of bad){
   const state:ManagerSeasonFocusCareer={...copy(source),managerSeasonFocus:value},before=S.serializeSoccerCareerSave(state);
   const read=readManagerSeasonFocus(state),available=managerSeasonFocusAvailable(state);
   const attempts=(['league','cup'] as const).map(choice=>({choice,run:taped(860003,()=>setManagerSeasonFocus(state,clubs,choice))}));
   const clear=setManagerSeasonFocus(state,clubs,'balanced');
   rows.push({value,read,available,before,after:S.serializeSoccerCareerSave(state),attempts:attempts.map(({choice,run})=>({choice,focus:readManagerSeasonFocus(run.value),raw:S.serializeSoccerCareerSave(run.value),draws:run.draws,next:run.next})),clearedRaw:S.serializeSoccerCareerSave(clear)});retain('explicit-recovery',rows);
   expect(read).toBeNull();expect(available,'EXPLICIT_MANAGER_FOCUS_RECOVERY').toBe(true);expect(S.serializeSoccerCareerSave(state)).toBe(before);
   for(const{choice,run}of attempts){expect(run.draws).toEqual([]);expect(readManagerSeasonFocus(run.value)).toBe(choice);expect(S.serializeSoccerCareerSave(state)).toBe(before);}
   expect(own(clear,'managerSeasonFocus')).toBe(false);expect(S.serializeSoccerCareerSave(clear)).toBe(S.serializeSoccerCareerSave(source));
  }
 });
 it('keeps exact optional league presence and rejects inactive or malformed current contexts',()=>{
  const source=actor('employedRaw'),without=copy(source);delete without.managerState!.league;
  const selected=chooseManagerSeasonFocus(without,'cup') as ManagerSeasonFocusCareer;
  expect(readManagerSeasonFocus(selected)).toBe('cup');expect(own(selected.managerSeasonFocus as object,'league')).toBe(false);
  const wrong=copy(selected);wrong.managerState!.league=undefined;expect(readManagerSeasonFocus(wrong)).toBeNull();
  for(const state of [{...source,phase:'playing'} as CareerState,actor('unemployedRaw'),{...source,managerState:{...source.managerState!,season:-1}}]){
   const before=S.serializeSoccerCareerSave(state);expect(managerSeasonFocusAvailable(state)).toBe(false);expect(chooseManagerSeasonFocus(state,'league')).toBe(state);expect(S.serializeSoccerCareerSave(state)).toBe(before);
  }
  expect(chooseManagerSeasonFocus(source,'bad-choice')).toBe(source);
 });
 it('refuses selection and advance while an actual earned job decision is pending',()=>{
  const before=S.serializeSoccerCareerSave(pending);expect(readManagerJobReview(pending,clubs)?.pending).toBeTruthy();
  const run=taped(860004,()=>{expect(setManagerSeasonFocus(pending,clubs,'cup')).toBe(pending);expect(setManagerSeasonFocus(pending,clubs,'balanced')).toBe(pending);return advanceReviewedManagerSeason(pending,clubs);});
  expect(run.value).toBe(pending);expect(run.draws).toEqual([]);expect(S.serializeSoccerCareerSave(pending)).toBe(before);
 });
 it('consumes one valid focus on the actual played row and returns the next season to Balanced',()=>{
  const selected=setManagerSeasonFocus(actor('employedRaw'),clubs,'cup'),before=S.serializeSoccerCareerSave(selected);
  const played=taped(860005,()=>advanceReviewedManagerSeason(selected,clubs));
  expect(S.serializeSoccerCareerSave(selected)).toBe(before);expect(last(played.value).focus,'MANAGER_FOCUS_PLAYED_ROW').toBe('cup');expect(own(played.value,'managerSeasonFocus'),'MANAGER_FOCUS_CONSUMED_ONCE').toBe(false);expect(readManagerSeasonFocus(played.value)).toBeNull();
  expect(played.value.managerState!.season).toBe(selected.managerState!.season+1);
  const loaded=E.repairCareer(parse(S.serializeSoccerCareerSave(played.value)));expect(last(loaded).focus).toBe('cup');expect(readManagerSeasonFocus(loaded)).toBeNull();
  const next=taped(860006,()=>advanceReviewedManagerSeason(loaded,clubs));expect(last(next.value).focus).toBeUndefined();
 });
 it('matches captured pre-product default save outputs and every action draw and next draw',()=>{
  expect(fixture.defaults,'CAPTURED_MANAGER_DEFAULT_WITNESS_COUNT').toHaveLength(2);expect(fixture.defaults.map((row:{context:string})=>row.context),'CAPTURED_MANAGER_DEFAULT_CONTEXTS').toEqual(['ordinary','earned-national-flags']);
  for(const golden of fixture.defaults){
   const input=parse(golden.expected.action.rawBefore),before=S.serializeSoccerCareerSave(input),run=taped(golden.seed,()=>E.advanceManagerSeason(input,clubs));
   expect(json(run.value)).toEqual(golden.expected.value);expect(S.serializeSoccerCareerSave(run.value)).toBe(golden.expected.action.rawAfter);expect(run.draws).toEqual(golden.expected.action.draws);expect(run.next).toBe(golden.expected.action.next);expect(S.serializeSoccerCareerSave(input)).toBe(before);
  }
 });
 it('preserves ignored raw metadata through untouched default play without a repair write',()=>{
  const golden=fixture.defaults[0],input:ManagerSeasonFocusCareer={...parse(golden.expected.action.rawBefore),managerSeasonFocus:{version:99,old:'kept'}},before=S.serializeSoccerCareerSave(input);
  const run=taped(golden.seed,()=>E.advanceManagerSeason(input,clubs));
  expect(json(run.value)).toEqual({...golden.expected.value,managerSeasonFocus:input.managerSeasonFocus});expect(run.draws).toEqual(golden.expected.action.draws);expect(run.next).toBe(golden.expected.action.next);expect(S.serializeSoccerCareerSave(input)).toBe(before);
 });
 it('keeps the existing club-season path when genuine national-call flags are already present',()=>{
  const input=actor('nationalRaw');expect(input.managerState!.nationalTeamOffer&&input.managerState!.managingNationalTeam).toBe(true);
  const selected=setManagerSeasonFocus(input,clubs,'league'),run=taped(860007,()=>advanceReviewedManagerSeason(selected,clubs));
  expect(last(run.value).club).toBe(input.managerState!.club);expect(last(run.value).table!.length).toBeGreaterThan(0);expect(last(run.value).cup).toBeTruthy();expect(last(run.value).focus).toBe('league');expect(run.value.managerState!.nationalTeamOffer&&run.value.managerState!.managingNationalTeam).toBe(true);
 });
 it('shows both preparation benefits and costs in matched actual league and cup outcomes',()=>{
  const stages=['out in the 3rd round','out in the 4th round','out in the quarter-final','out in the semi-final','beaten in the final','WON the cup'];
  for(const name of ['employedRaw','nationalRaw'] as const){
   const source=actor(name),counts={leagueGain:0,leagueCupCost:0,cupGain:0,cupLeagueCost:0};
   for(let seed=730000;seed<730128;seed++){
    const play=(choice:'balanced'|'league'|'cup')=>last(taped(seed,()=>advanceReviewedManagerSeason(setManagerSeasonFocus(copy(source),clubs,choice),clubs)).value);
    const b=play('balanced'),l=play('league'),c=play('cup');
    if(l.playerPts! > b.playerPts!)counts.leagueGain++;if(stages.indexOf(l.cup!)<stages.indexOf(b.cup!))counts.leagueCupCost++;
    if(stages.indexOf(c.cup!)>stages.indexOf(b.cup!))counts.cupGain++;if(c.playerPts! < b.playerPts!)counts.cupLeagueCost++;
   }
   expect(Object.values(counts).every(n=>n>0),'MANAGER_FOCUS_TRADEOFF '+JSON.stringify({name,counts})).toBe(true);
  }
 },120_000);
 it('keeps the actual old unemployed acceptance output and zero-draw receipt',()=>{
  const golden=fixture.acceptance,input=parse(golden.action.rawBefore),run=taped(golden.action.seed,()=>E.acceptManagerOffer(input,0));
  expect(json(run.value)).toEqual(golden.value);expect(S.serializeSoccerCareerSave(run.value)).toBe(golden.action.rawAfter);expect(run.draws).toEqual([]);expect(run.next).toBe(golden.action.next);
 });
});

type HostState={career:CareerState|null;api:ReturnType<typeof useSoccerManagerJobReview>;replace:React.Dispatch<React.SetStateAction<CareerState|null>>};
let host:HostState;
function Host({initial}:{initial:CareerState}){
 const [career,setCareer]=useState<CareerState|null>(initial),api=useSoccerManagerJobReview(career,clubs,setCareer);
 host={career,api,replace:setCareer};return null;
}
describe('manager focus committed authority',()=>{
 it('reserves focus before same-render stale callbacks and commits one later season only',()=>{
  render(<StrictMode><Host initial={actor('employedRaw')}/></StrictMode>);
  const old=host.api.advance,select=host.api.setFocus,before=host.career!;
  const selection=taped(870001,()=>act(()=>{select('league');old();old();}));expect(selection.draws).toEqual([]);expect(readManagerSeasonFocus(host.career!)).toBe('league');expect(host.career!.managerState!.season).toBe(before.managerState!.season);
  const selected=host.career!,expected=taped(870002,()=>advanceReviewedManagerSeason(copy(selected),clubs)),advance=host.api.advance;
  const actual=taped(870002,()=>act(()=>{advance();advance();}));expect(json(host.career)).toEqual(json(expected.value));expect(S.serializeSoccerCareerSave(host.career!)).toBe(S.serializeSoccerCareerSave(expected.value));expect(actual.draws).toEqual(expected.draws);expect(actual.next).toBe(expected.next);
 });
 it('refuses callbacks captured before an actual committed source replacement',()=>{
  render(<Host initial={actor('employedRaw')}/>);const old=host.api.advance,oldChoice=host.api.setFocus;
  act(()=>host.replace(actor('nationalRaw')));const replacement=host.career;
  const run=taped(870003,()=>act(()=>{oldChoice('cup');old();}));expect(run.draws).toEqual([]);expect(host.career).toBe(replacement);
 });
 it('revokes retained callbacks on a committed phase change and on unmount',()=>{
  const view=render(<Host initial={actor('employedRaw')}/>),old=host.api.advance,oldChoice=host.api.setFocus;
  act(()=>host.replace({...host.career!,phase:'playing'}));const replaced=host.career;
  const phase=taped(870004,()=>act(()=>{oldChoice('cup');old();}));expect(phase.draws).toEqual([]);expect(host.career).toBe(replaced);
  act(()=>host.replace(actor('employedRaw')));const liveAdvance=host.api.advance,liveChoice=host.api.setFocus;
  view.unmount();const unmounted=taped(870005,()=>{liveAdvance();liveChoice('league');});expect(unmounted.draws).toEqual([]);
 });
});

describe('manager focus compact card',()=>{
 it('offers three compact choices and returns Back without mutating the career',()=>{
  const source=actor('employedRaw'),before=S.serializeSoccerCareerSave(source),onChoose=vi.fn(),onBack=vi.fn();
  render(<SoccerManagerSeasonFocus career={source} blocked={false} onChoose={onChoose} onBack={onBack}/>);
  expect(document.querySelectorAll('button[aria-pressed]')).toHaveLength(3);fireEvent.click(screen.getByRole('button',{name:'Back'}));expect(onBack).toHaveBeenCalledTimes(1);expect(onChoose).not.toHaveBeenCalled();expect(S.serializeSoccerCareerSave(source)).toBe(before);
 });
 it('keeps all choices enabled for explicit recovery of an ignored old record',()=>{
  const source:ManagerSeasonFocusCareer={...actor('employedRaw'),managerSeasonFocus:{version:99}},onChoose=vi.fn(),onBack=vi.fn();
  render(<SoccerManagerSeasonFocus career={source} blocked={false} onChoose={onChoose} onBack={onBack}/>);
  const choices=[...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];fireEvent.click(screen.getByRole('button',{name:/^League focus/}));retain('explicit-recovery-card',{enabled:choices.map(b=>!b.disabled),chooseCalls:onChoose.mock.calls,backCalls:onBack.mock.calls,raw:S.serializeSoccerCareerSave(source)});expect(choices).toHaveLength(3);expect(choices.every(b=>!b.disabled),'EXPLICIT_MANAGER_FOCUS_UI_RECOVERY').toBe(true);expect(onChoose).toHaveBeenCalledWith('league');expect(onBack).toHaveBeenCalledTimes(1);
 });
 it('scopes its worked example to actual help and returns to the choice tiles',()=>{
  const source=actor('employedRaw'),before=S.serializeSoccerCareerSave(source),onChoose=vi.fn(),onBack=vi.fn();
  render(<SoccerManagerSeasonFocus career={source} blocked={false} onChoose={onChoose} onBack={onBack}/>);fireEvent.click(screen.getByRole('button',{name:'Season focus help'}));
  const help=screen.getByRole('region',{name:'Season focus help'});expect(within(help).getByText(/50%/)).toHaveTextContent('47%');expect(within(help).getByText(/50%/)).toHaveTextContent('53%');expect(within(help).getByText(/not a guaranteed league point/)).toBeInTheDocument();fireEvent.click(within(help).getByRole('button',{name:'Back'}));expect(screen.queryByRole('region',{name:'Season focus help'})).toBeNull();expect(document.querySelectorAll('button[aria-pressed]')).toHaveLength(3);expect(onChoose).not.toHaveBeenCalled();expect(onBack).not.toHaveBeenCalled();expect(S.serializeSoccerCareerSave(source)).toBe(before);
 });
 it('leaves selection disabled while a real job decision is pending',()=>{
  const onChoose=vi.fn();render(<SoccerManagerSeasonFocus career={pending} blocked={true} onChoose={onChoose} onBack={()=>{}}/>);
  const choices=[...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];expect(choices).toHaveLength(3);expect(choices.every(b=>b.disabled)).toBe(true);fireEvent.click(choices[1]);expect(onChoose).not.toHaveBeenCalled();
 });
});

function pageSaved(){const raw=localStorage.getItem('soccerCareerSave');assert(raw,'Actual Page official save');return{raw,state:parse(raw)};}
function actualClick(button:HTMLElement){
 const key=Object.getOwnPropertyNames(button).find(name=>name.startsWith('__reactProps$'));assert(key,'Pinned React runtime must expose the actual rendered event props');
 const props=Reflect.get(button,key);assert(props&&typeof props.onClick==='function','Actual rendered Page callback required');
 const handler=props.onClick;return()=>handler(new MouseEvent('click',{bubbles:true}));
}
describe('actual Page manager focus transaction',()=>{
 it('guards actual disabled-review Page callbacks across focus adoption and duplicate advance',async()=>{
  const source=actor('employedRaw');expect(readManagerJobReview(source,clubs)?.enabled).not.toBe(true);localStorage.setItem('soccerCareerSave',S.serializeSoccerCareerSave(source));
  render(<HelmetProvider><MemoryRouter><SoccerCareer/></MemoryRouter></HelmetProvider>);
  const entry=await screen.findByRole('button',{name:/^Season focus:/}),oldAdvance=actualClick(screen.getByRole('button',{name:/^Next Manager Season/}));fireEvent.click(entry);
  const league=await screen.findByRole('button',{name:/^League focus/}),choose=actualClick(league),staleCup=actualClick(screen.getByRole('button',{name:/^Cup focus/}));
  const initial=pageSaved(),season=initial.state.managerState!.season;
  const selection=taped(880001,()=>act(()=>{choose();staleCup();oldAdvance();oldAdvance();}));
  await waitFor(()=>expect(pageSaved().raw).not.toBe(initial.raw));
  const selected=pageSaved();retain('page-selection',{initial,selected,draws:selection.draws,next:selection.next});expect(selection.draws,'MANAGER_PAGE_STALE_CALLBACK_DRAWS').toEqual([]);expect(readManagerSeasonFocus(selected.state),'MANAGER_PAGE_STALE_FOCUS_REPLAY').toBe('league');expect(selected.state.managerState!.season).toBe(season);expect(readManagerJobReview(selected.state,clubs)?.enabled).not.toBe(true);
  const expected=taped(880002,()=>advanceReviewedManagerSeason(parse(selected.raw),clubs)),currentAdvance=actualClick(screen.getByRole('button',{name:/^Next Manager Season/}));
  const actual=taped(880002,()=>act(()=>{currentAdvance();currentAdvance();}));
  await waitFor(()=>expect(pageSaved().state.managerState!.season).toBe(season+1));
  retain('page-advance',{selected,expected:{value:expected.value,raw:S.serializeSoccerCareerSave(expected.value),draws:expected.draws,next:expected.next},actual:{...pageSaved(),draws:actual.draws,next:actual.next}});
  expect(pageSaved().raw).toBe(S.serializeSoccerCareerSave(expected.value));expect(json(pageSaved().state)).toEqual(json(expected.value));expect(actual.draws).toEqual(expected.draws);expect(actual.next).toBe(expected.next);expect(last(pageSaved().state).focus).toBe('league');expect(own(pageSaved().state,'managerSeasonFocus')).toBe(false);
 },30_000);
});
