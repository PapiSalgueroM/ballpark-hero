import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choosePostRetirement, FALLBACK_CLUBS, manualRetire, repairCareer } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { coachingStartChoices, startCoachingAppointment } from '@/lib/soccerCareerCoachingStart';

const clubs: ClubData[] = [
  { id: 'coaching-north', name: 'Generated North Club', country: 'Fixture Country', league: 'Fixture League', tier: 3, color: '#112233' },
  { id: 'coaching-south', name: 'Generated South Club', country: 'Fixture Country', league: 'Fixture League', tier: 4, color: '#334455' },
  { id: 'coaching-east', name: 'Generated East Club', country: 'Fixture Country', league: 'Fixture League', tier: 3, color: '#556677' },
  { id: 'coaching-elite', name: 'Generated Elite Club', country: 'Fixture Country', league: 'Fixture League', tier: 1, color: '#778899' },
];
function fixture(): CareerState {
  const packet=JSON.parse(readFileSync(resolve(process.cwd(),'scripts/data/careerLeagueWorldSaves1100.json'),'utf8'));
  const saved=packet.saves.find((entry:{id:string})=>entry.id==='ere');
  if(!saved?.state)throw Error('Existing complete recorded career ere required');
  const input=structuredClone(saved.state) as CareerState;
  input.phase='playing';input.retired=false;input.age=34;
  const state=manualRetire(input);
  state.phase='retirement_ceremony';state.postRetirementChoice=null;state.managerState=null;
  state.lifeFlags={...(state.lifeFlags??{}),coachingBadges:3};
  return state;
}
function seeded<T>(action:()=>T) {
  const original=Math.random,draws:number[]=[];let value=7191;
  const draw=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  Math.random=()=>{const next=draw();draws.push(next);return next;};
  try{return{value:action(),draws,next:draw()};}finally{Math.random=original;}
}

describe('coaching coursework first manager choice',()=>{
  it('quotes a deterministic bounded real current pool without input changes or global draws',()=>{
    const state=fixture(),before=JSON.stringify(state),poolBefore=JSON.stringify(clubs);
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Unexpected global draw');});
    try{
      const first=coachingStartChoices(state,clubs),again=coachingStartChoices(state,[...clubs].reverse());
      expect(first).toHaveLength(3);
      expect(first.map(q=>q.clubId)).toEqual(again.map(q=>q.clubId));
      expect(first.every(q=>q.source===state&&q.level>=3&&clubs.some(c=>c.id===q.clubId))).toBe(true);
      expect(new Set(first.map(q=>q.clubId)).size).toBe(3);
      expect(random).not.toHaveBeenCalled();
      expect(JSON.stringify(state)).toBe(before);expect(JSON.stringify(clubs)).toBe(poolBefore);
    }finally{random.mockRestore();}
  });
  it('requires exact reviewed numeric3 without interpreting it as a licence',()=>{
    const state=fixture();
    for(const flags of [undefined,null,[],{}, {coachingBadges:1},{coachingBadges:2},{coachingBadges:4},{coachingBadges:'3'}]){
      const input={...state,lifeFlags:flags} as unknown as CareerState;
      const result=seeded(()=>coachingStartChoices(input,clubs));
      expect(result.value).toEqual([]);expect(result.draws).toEqual([]);
    }
    expect(coachingStartChoices(state,clubs).length).toBeGreaterThan(0);
  });
  it('requires an actual first retired entry and refuses an existing career',()=>{
    const state=fixture();
    const inputs=[
      {...state,retired:false}, {...state,phase:'playing'}, {...state,phase:'manager_season'},
      {...state,postRetirementChoice:'pundit'},
      {...state,managerState:{club:'Already employed',season:1}},
    ] as CareerState[];
    for(const input of inputs){const before=JSON.stringify(input),result=seeded(()=>coachingStartChoices(input,clubs));expect(result.value).toEqual([]);expect(result.draws).toEqual([]);expect(JSON.stringify(input)).toBe(before);}
    expect(coachingStartChoices({...state,phase:'post_retirement'},clubs).length).toBeGreaterThan(0);
  });
  it('refuses an empty, elite-only, malformed or duplicate-ID starter pool',()=>{
    const state=fixture();
    expect(coachingStartChoices(state,[])).toEqual([]);
    expect(coachingStartChoices(state,[clubs[3]])).toEqual([]);
    expect(coachingStartChoices(state,[{...clubs[0],id:''}])).toEqual([]);
    expect(coachingStartChoices(state,[clubs[0],{...clubs[0]}])).toEqual([]);
    expect(coachingStartChoices(state,[clubs[0],{...clubs[0],id:'same-name-other-id'}])).toEqual([]);
  });
  it('delegates every chosen starter to canonical full singleton initialization and one draw',()=>{
    const state=fixture(),before=JSON.stringify(state);
    for(const quote of coachingStartChoices(state,clubs)){
      const club=clubs.find(c=>c.id===quote.clubId)!;
      const expected=seeded(()=>choosePostRetirement(state,'manager',[club]));
      const actual=seeded(()=>startCoachingAppointment(state,clubs,quote));
      expect(actual).toStrictEqual(expected);expect(actual.draws).toHaveLength(1);
      expect(JSON.stringify(actual.value)).toBe(JSON.stringify(expected.value));
      expect(actual.value.managerState?.club).toBe(club.name);
      expect(actual.value.managerState?.clubTier).toBe(club.tier);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('uses actual starter records from the current canonical pool without manufacturing data',()=>{
    const state=fixture(),choices=coachingStartChoices(state,FALLBACK_CLUBS);
    expect(choices.length).toBeGreaterThan(0);
    for(const quote of choices){
      const actual=FALLBACK_CLUBS.filter(c=>c.id===quote.clubId);
      expect(actual).toHaveLength(1);
      expect(quote.clubName).toBe(actual[0].name);expect(quote.country).toBe(actual[0].country);
      expect(quote.level).toBe(actual[0].tier);
    }
  });
  it('rejects stale replaced saves and changed or duplicate current club bindings without a draw',()=>{
    const state=fixture(),quote=coachingStartChoices(state,clubs)[0];
    const replacement={...state,netWorth:state.netWorth+1};
    const changed=clubs.map(c=>c.id===quote.clubId?{...c,tier:c.tier+1}:c);
    const duplicate=[...clubs,{...clubs.find(c=>c.id===quote.clubId)!}];
    for(const [input,pool]of [[replacement,clubs],[state,changed],[state,duplicate]] as [CareerState,ClubData[]][]){
      const before=JSON.stringify(input),actual=seeded(()=>startCoachingAppointment(input,pool,quote));
      expect(actual.value).toBe(input);expect(actual.draws).toEqual([]);expect(JSON.stringify(input)).toBe(before);
    }
  });
  it('rejects malformed, forged or elite requests without changing existing money or state',()=>{
    const state=fixture(),quote=coachingStartChoices(state,clubs)[0],before=JSON.stringify(state);
    for(const request of [null,{}, {...quote,clubId:clubs[3].id},{...quote,clubName:'Invented destination'},{...quote,seal:'changed'}]){
      const actual=seeded(()=>startCoachingAppointment(state,clubs,request));
      expect(actual.value).toBe(state);expect(actual.draws).toEqual([]);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('makes repeat taps on the adopted manager career a no-op without another draw',()=>{
    const state=fixture(),quote=coachingStartChoices(state,clubs)[0];
    const first=seeded(()=>startCoachingAppointment(state,clubs,quote)).value;
    const repeated=seeded(()=>startCoachingAppointment(first,clubs,quote));
    expect(repeated.value).toBe(first);expect(repeated.draws).toEqual([]);
  });
  it('keeps the selected existing ManagerState through official save, load and repair',()=>{
    const state=fixture(),quote=coachingStartChoices(state,clubs)[0];
    const started=seeded(()=>startCoachingAppointment(state,clubs,quote)).value;
    const parsed=parseSoccerCareerSave(serializeSoccerCareerSave(started)) as CareerState;
    const loaded=repairCareer(parsed);
    expect(loaded.managerState).toStrictEqual(started.managerState);
    expect(loaded.postRetirementChoice).toBe('manager');
    expect(loaded.netWorth).toBe(started.netWorth);expect(loaded.totalEarnings).toBe(started.totalEarnings);
    expect(coachingStartChoices(loaded,clubs)).toEqual([]);
  });
});
