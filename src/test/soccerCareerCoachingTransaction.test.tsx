import { StrictMode, useLayoutEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choosePostRetirement, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { coachingStartChoices, type CoachingStartQuote } from '@/lib/soccerCareerCoachingStart';
import { useSoccerCoachingStart } from '@/hooks/useSoccerCoachingStart';

const clubs: ClubData[]=[
  {id:'transaction-north',name:'Generated North Club',country:'Fixture Country',league:'Fixture League',tier:3,color:'#112233'},
  {id:'transaction-south',name:'Generated South Club',country:'Fixture Country',league:'Fixture League',tier:4,color:'#445566'},
];
function fixture():CareerState{
  const packet=JSON.parse(readFileSync(resolve(process.cwd(),'scripts/data/careerLeagueWorldSaves1100.json'),'utf8'));
  const found=packet.saves.find((entry:{id:string})=>entry.id==='ere');
  if(!found?.state)throw Error('Recorded ere fixture required');
  const input=structuredClone(found.state) as CareerState;input.phase='playing';input.retired=false;input.age=34;
  const state=manualRetire(input);state.phase='retirement_ceremony';state.postRetirementChoice=null;state.managerState=null;
  state.lifeFlags={...state.lifeFlags,coachingBadges:3};return state;
}
function seeded<T>(action:()=>T){
  const original=Math.random,draws:number[]=[];let n=8171;
  const draw=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  Math.random=()=>{const value=draw();draws.push(value);return value;};
  try{return{value:action(),draws,next:draw()};}finally{Math.random=original;}
}
type Controls={career:CareerState|null;pool:ClubData[];start:(quote:CoachingStartQuote)=>void;replace:Dispatch<SetStateAction<CareerState|null>>;replacePool:Dispatch<SetStateAction<ClubData[]>>};
function scene(initial:CareerState){
  const live:{current:Controls|null}={current:null};
  function Host(){
    const [career,setCareer]=useState<CareerState|null>(initial),[pool,setPool]=useState(clubs);
    const start=useSoccerCoachingStart(career,pool,setCareer);
    useLayoutEffect(()=>{live.current={career,pool,start,replace:setCareer,replacePool:setPool};},[career,pool,start]);
    return <output>{JSON.stringify(career)}</output>;
  }
  const mounted=render(<StrictMode><Host/></StrictMode>);
  return{live,mounted};
}
afterEach(cleanup);
describe('actual committed coaching transaction in StrictMode',()=>{
  it('starts once outside React updater replay with exact canonical state and one draw',()=>{
    const state=fixture(),before=JSON.stringify(state),{live}=scene(state);
    const quote=coachingStartChoices(state,clubs)[0],club=clubs.find(row=>row.id===quote.clubId)!;
    const expected=seeded(()=>choosePostRetirement(state,'manager',[club]));
    const actual=seeded(()=>{act(()=>live.current!.start(quote));return live.current!.career;});
    expect(actual).toStrictEqual(expected);expect(actual.draws).toHaveLength(1);
    expect(JSON.stringify(actual.value)).toBe(JSON.stringify(expected.value));expect(JSON.stringify(state)).toBe(before);
  });
  it('reserves an accepted appointment before two callbacks in one event can spend another draw',()=>{
    const state=fixture(),{live}=scene(state),quote=coachingStartChoices(state,clubs)[0];
    const start=live.current!.start;
    const actual=seeded(()=>{act(()=>{start(quote);start(quote);});return live.current!.career;});
    expect(actual.value).toMatchObject({phase:'manager_season',managerState:{club:quote.clubName,season:0}});
    expect(actual.draws).toHaveLength(1);
    const again=seeded(()=>{act(()=>start(quote));return live.current!.career;});
    expect(again.value).toBe(actual.value);expect(again.draws).toEqual([]);
  });
  it('makes a captured old callback read the latest committed replacement save',()=>{
    const state=fixture(),{live}=scene(state),oldStart=live.current!.start;
    const oldQuote=coachingStartChoices(state,clubs)[0],replacement=structuredClone(state),before=JSON.stringify(replacement);
    act(()=>live.current!.replace(replacement));
    expect(live.current!.start).toBe(oldStart);
    const rejected=seeded(()=>{act(()=>oldStart(oldQuote));return live.current!.career;});
    expect(rejected.value).toBe(replacement);expect(rejected.draws).toEqual([]);expect(JSON.stringify(replacement)).toBe(before);
    const quote=coachingStartChoices(replacement,clubs)[0],club=clubs.find(row=>row.id===quote.clubId)!;
    const expected=seeded(()=>choosePostRetirement(replacement,'manager',[club]));
    const current=seeded(()=>{act(()=>oldStart(quote));return live.current!.career;});
    expect(current).toStrictEqual(expected);expect(current.draws).toHaveLength(1);
  });
  it('validates a captured callback against the latest committed current club pool',()=>{
    const state=fixture(),{live}=scene(state),start=live.current!.start,quote=coachingStartChoices(state,clubs)[0];
    const changed=clubs.map(row=>row.id===quote.clubId?{...row,tier:row.tier+1}:row);
    act(()=>live.current!.replacePool(changed));
    const rejected=seeded(()=>{act(()=>start(quote));return live.current!.career;});
    expect(rejected.value).toBe(state);expect(rejected.draws).toEqual([]);
    const currentQuote=coachingStartChoices(state,changed)[0],club=changed.find(row=>row.id===currentQuote.clubId)!;
    const expected=seeded(()=>choosePostRetirement(state,'manager',[club]));
    const accepted=seeded(()=>{act(()=>start(currentQuote));return live.current!.career;});
    expect(accepted).toStrictEqual(expected);expect(accepted.draws).toHaveLength(1);
  });
  it('ignores callbacks after its actual transaction owner unmounts without a draw',()=>{
    const state=fixture(),before=JSON.stringify(state),{live,mounted}=scene(state),start=live.current!.start;
    const quote=coachingStartChoices(state,clubs)[0];mounted.unmount();
    const result=seeded(()=>start(quote));expect(result.draws).toEqual([]);expect(JSON.stringify(state)).toBe(before);
  });
  it('does not reserve or adopt malformed and ineligible requests',()=>{
    const state=fixture(),{live}=scene(state),quote=coachingStartChoices(state,clubs)[0];
    const invalid={...quote,seal:'changed'};
    const result=seeded(()=>{act(()=>live.current!.start(invalid));return live.current!.career;});
    expect(result.value).toBe(state);expect(result.draws).toEqual([]);
    const withoutCoursework={...state,lifeFlags:{...state.lifeFlags,coachingBadges:2}};
    act(()=>live.current!.replace(withoutCoursework));
    const rejected=seeded(()=>{act(()=>live.current!.start({...quote,source:withoutCoursework}));return live.current!.career;});
    expect(rejected.value).toBe(withoutCoursework);expect(rejected.draws).toEqual([]);
  });
});
