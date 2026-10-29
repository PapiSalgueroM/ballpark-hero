import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadManagerMarket, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import CoachingStartChooser from '@/components/soccer-career/CoachingStartChooser';
import { coachingStartChoices } from '@/lib/soccerCareerCoachingStart';
import { useSoccerCoachingStart } from '@/hooks/useSoccerCoachingStart';

vi.mock('@/lib/soccerCareerEngine', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/soccerCareerEngine')>(),
  loadManagerMarket: vi.fn(),
}));
const clubs: ClubData[] = [
  {id:'prepared-north',name:'Generated North Club',country:'Fixture Country',league:'Fixture League',tier:3,color:'#112233'},
  {id:'prepared-south',name:'Generated South Club',country:'Fixture Country',league:'Fixture League',tier:4,color:'#334455'},
];
function fixture(): CareerState {
  const data=JSON.parse(readFileSync(resolve(process.cwd(),'scripts/data/careerLeagueWorldSaves1100.json'),'utf8'));
  const found=data.saves.find((row:{id:string})=>row.id==='ere');
  if(!found?.state)throw Error('Recorded ere fixture required');
  const initial=structuredClone(found.state) as CareerState;
  initial.phase='playing';initial.retired=false;initial.age=34;
  const state=manualRetire(initial);
  state.phase='retirement_ceremony';state.managerState=null;state.postRetirementChoice=null;
  state.lifeFlags={...state.lifeFlags,coachingBadges:3};return state;
}
function deferred() {
  let resolve!:()=>void, reject!:(reason:Error)=>void;
  const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function Host({initial,replacement}:{initial:CareerState;replacement?:CareerState}) {
  const [career,setCareer]=useState<CareerState|null>(initial),[open,setOpen]=useState(true);
  const start=useSoccerCoachingStart(career,clubs,setCareer);
  return <>
    <button onClick={()=>replacement&&setCareer(replacement)}>Replace save</button>
    <pre data-testid="career">{JSON.stringify(career)}</pre>
    {open&&career&&<CoachingStartChooser career={career} clubs={clubs}
      onStart={start}
      onBack={()=>setOpen(false)}/>}
  </>;
}
beforeEach(()=>{vi.mocked(loadManagerMarket).mockReset();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('prepared manager chooser loading and current-save safety',()=>{
  it('keeps all destinations disabled and the complete career untouched while loading',()=>{
    const pending=deferred();vi.mocked(loadManagerMarket).mockReturnValue(pending.promise);
    const state=fixture(),before=JSON.stringify(state),random=vi.spyOn(Math,'random');
    render(<Host initial={state}/>);
    expect(screen.getByRole('heading',{name:'Choose your first club'})).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Loading manager options');
    for(const club of clubs)expect(screen.getByRole('button',{name:new RegExp(club.name)})).toBeDisabled();
    expect(screen.getByTestId('career').textContent).toBe(before);expect(random).not.toHaveBeenCalled();
  });
  it('starts the actual quoted current club once after loading and repeated taps add no draw',async()=>{
    const pending=deferred();vi.mocked(loadManagerMarket).mockReturnValue(pending.promise);
    const state=fixture(),quote=coachingStartChoices(state,clubs)[0];render(<Host initial={state}/>);
    await act(async()=>{pending.resolve();await pending.promise;});
    const button=screen.getByRole('button',{name:new RegExp(quote.clubName)});
    expect(button).toBeEnabled();
    const random=vi.spyOn(Math,'random').mockReturnValue(0.37);
    act(()=>{fireEvent.click(button);fireEvent.click(button);});
    const actual=JSON.parse(screen.getByTestId('career').textContent!);
    expect(actual).toMatchObject({managerState:{club:quote.clubName,season:0}});
    expect(actual.postRetirementChoice).toBe('manager');expect(random).toHaveBeenCalledTimes(1);
  });
  it('Back removes the pending chooser and a late load cannot mutate the career',async()=>{
    const pending=deferred();vi.mocked(loadManagerMarket).mockReturnValue(pending.promise);
    const state=fixture(),before=JSON.stringify(state);render(<Host initial={state}/>);
    fireEvent.click(screen.getByRole('button',{name:'Back'}));
    const random=vi.spyOn(Math,'random');
    await act(async()=>{pending.resolve();await pending.promise;});
    expect(screen.queryByRole('heading',{name:'Choose your first club'})).toBeNull();
    expect(screen.getByTestId('career').textContent).toBe(before);expect(random).not.toHaveBeenCalled();
  });
  it('does not overwrite a replaced save when the old pending market finishes',async()=>{
    const pending=deferred();vi.mocked(loadManagerMarket).mockReturnValue(pending.promise);
    const state=fixture(),replacement={...state,playerName:'Replacement fixture',lifeFlags:{...state.lifeFlags,coachingBadges:2}};
    render(<Host initial={state} replacement={replacement}/>);
    fireEvent.click(screen.getByRole('button',{name:'Replace save'}));
    const random=vi.spyOn(Math,'random');
    await act(async()=>{pending.resolve();await pending.promise;});
    expect(screen.getByTestId('career').textContent).toBe(JSON.stringify(replacement));
    expect(screen.queryByRole('button',{name:/Generated North Club/})).toBeNull();expect(random).not.toHaveBeenCalled();
  });
  it('retains state on load failure and retries before permitting a current quoted appointment',async()=>{
    const first=deferred(),second=deferred();vi.mocked(loadManagerMarket)
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const state=fixture(),before=JSON.stringify(state);render(<Host initial={state}/>);
    await act(async()=>{first.reject(Error('Fixture load failure'));await first.promise.catch(()=>{});});
    expect(screen.getByRole('status')).toHaveTextContent('could not load');
    expect(screen.getByTestId('career').textContent).toBe(before);
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    expect(screen.getByRole('button',{name:/Generated North Club/})).toBeDisabled();
    await act(async()=>{second.resolve();await second.promise;});
    await waitFor(()=>expect(screen.getByRole('button',{name:/Generated North Club/})).toBeEnabled());
    expect(screen.getByTestId('career').textContent).toBe(before);
  });
  it('keeps rules and the worked example reopenable without changing career or drawing',async()=>{
    vi.mocked(loadManagerMarket).mockResolvedValue();const state=fixture(),before=JSON.stringify(state);
    render(<Host initial={state}/>);await waitFor(()=>expect(screen.queryByText('Loading manager options...')).toBeNull());
    const random=vi.spyOn(Math,'random'),help=screen.getByRole('button',{name:'Coaching start help'});
    expect(screen.getByText(/Example: pick a shown club/)).toBeInTheDocument();
    fireEvent.click(help);expect(screen.queryByText(/Example: pick a shown club/)).toBeNull();
    fireEvent.click(help);expect(screen.getByText(/Example: pick a shown club/)).toBeInTheDocument();
    expect(screen.getByTestId('career').textContent).toBe(before);expect(random).not.toHaveBeenCalled();
  });
});
