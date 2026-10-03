import assert from 'node:assert/strict';
import React from 'react';
import {render, fireEvent, act, cleanup} from '@testing-library/react';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import * as E from '@/lib/nhlFrontOffice';
import {NHL_OPENING_RATINGS} from '@/data/nhlOpeningRatings';
import {leagueNames} from '@/lib/foNames';
import {deadMoneyFor, deadCapUsed} from '@/lib/frontOfficeCuts';
const KEY='nhl-front-office-save-v1', SENTINEL='nhl968-unrelated';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
function random(seed:number){let calls=0;const rng=()=>{calls++;seed=seed*16807%2147483647;return(seed-1)/2147483646;};rng.calls=()=>calls;return rng;}
const buttons=()=>Array.from(document.querySelectorAll('button'));
function button(match:RegExp){const b=buttons().find(b=>match.test(b.textContent!.trim()));assert.ok(b,'Actual button '+match);return b;}
const click=async(b:HTMLButtonElement)=>{await act(async()=>{fireEvent.click(b);});};
const save=()=>JSON.parse(localStorage.getItem(KEY)!);
const normalize=(value:unknown)=>JSON.parse(JSON.stringify(value, (k,v)=>k==='id'?undefined:v));
const warning=(count:number)=>`Your roster has ${count} players, ${count-E.NHL_ROSTER_MAX} over this simulation's limit of ${E.NHL_ROSTER_MAX}. Waive ${count-E.NHL_ROSTER_MAX===1?'one player':`${count-E.NHL_ROSTER_MAX} players`} before you play. Waivers keep the usual dead money costs.`;
function overage(){
 const opening=E.initNhlLeague(random(1),NHL_OPENING_RATINGS),[sender,receiver]=Object.keys(opening.teams);let lg:E.NhlLeague|undefined;
 outer:for(const a of opening.teams[sender].players)for(const b of opening.teams[receiver].players){
  const c=clone(opening);
  if(E.nhlTrade(c.teams[sender],c.teams[receiver],a.id,b.id,true,c.cap)==='accepted'&&E.nhlExecuteTalksTrade(c.teams[sender],c.teams[receiver],b.id,a.id,true,c.cap)==='done'){lg=c;break outer;}
 }
 assert.ok(lg,'Real accepted trade pair');assert.equal(lg.teams[receiver].picks.length,4);
 const rng=random(101);let cls=E.nhlDraftClass(rng,24,leagueNames(lg));
 for(let i=0;i<4;i++){const p=cls.shift()!;assert.ok(E.nhlConsumeDraftPick(lg.teams[receiver]));lg.teams[receiver].players.push(E.nhlProspectToPlayer(p,rng,lg.ratingModelVersion));if(i<2)cls=E.nhlAiDraftPicks(lg,cls,E.nhlFoStandings(lg).map(t=>t.abbr).reverse().filter(a=>a!==receiver),rng).remaining;}
 E.nhlOffseason(lg,rng);assert.equal(lg.teams[receiver].players.length,17,'Actual drafted offseason creates measured overage');
 return {league:lg,myTeam:receiver,phase:'hub',titles:0,seasonsPlayed:1,draftClass:null,picksLeft:0,draftBatchesLeft:0,trust:70,fired:false};
}
async function mount(state:unknown){cleanup();localStorage.clear();const raw=JSON.stringify(state);localStorage.setItem(KEY,raw);localStorage.setItem(SENTINEL,'exact unrelated payload');await act(async()=>{render(<Board/>);});assert.equal(localStorage.getItem(KEY),raw,'Restore preserves raw payload');return raw;}
async function reload(){const raw=localStorage.getItem(KEY);cleanup();await act(async()=>{render(<Board/>);});assert.equal(localStorage.getItem(KEY),raw);assert.equal(localStorage.getItem(SENTINEL),'exact unrelated payload');}
async function openPlay(){await click(button(/Play/));return button(/^Play Round 1$/);}
async function waive(pid:string, expected:E.NhlLeague, team:string){
 const row=document.querySelector('[data-roster-row="'+pid+'"]')!;
 assert.ok(row);const cost=deadMoneyFor(expected.teams[team].players.find(p=>p.id===pid)!);
 await click(Array.from(row.querySelectorAll('button')).find(b=>b.textContent?.startsWith('Waive,'))!);
 assert.ok(row.textContent?.includes('$'+cost.now+'M'),'Actual cost shown before confirmation');
 assert.equal(E.nhlRelease(expected.teams[team],expected.freeAgents,pid,expected.ratingModelVersion),true);
 await click(button(/^Waive him$/));assert.deepEqual(save().league,expected,'Board uses exact existing waive, cap and automatic contributor behavior');
 await reload();
}
export async function run(){
 const original=Math.random, rows:any[]=[];
 const cases:[string,()=>Promise<void>][]=[
 ['actual overage restore retains all players and names the required roster decision',async()=>{
  const state=overage(),raw=await mount(state);const rng=random(968);Math.random=rng;
  const msg=document.querySelector('[data-roster-limit]');
  assert.equal(msg?.querySelector('p')?.textContent,warning(17),'Exact17/two/15 roster decision');
  await click(button(/^Open roster$/));assert.equal(document.querySelectorAll('[data-roster-row]').length,17);
  assert.equal(localStorage.getItem(KEY),raw);assert.equal(rng.calls(),0);await reload();
 }],
 ['overage cannot advance through its control or the actual handler',async()=>{
  const state=overage(),raw=await mount(state),rng=random(969);Math.random=rng;const play=await openPlay();assert.equal(play.disabled,true);
  await click(play);assert.equal(localStorage.getItem(KEY),raw);assert.equal(rng.calls(),0);
  const key=Object.keys(play).find(k=>k.startsWith('__reactProps$'));assert.ok(key,'Actual rendered handler');
  await act(async()=>{(play as any)[key].onClick();});assert.equal(localStorage.getItem(KEY),raw);assert.equal(rng.calls(),0);await reload();
 }],
 ['two deliberate waivers keep their real costs and allow the next round at fifteen',async()=>{
  const state=overage();await mount(state);const expected=clone(state.league),ids=state.league.teams[state.myTeam].players.slice(-2).map(p=>p.id);
  await click(button(/^Open roster$/));await waive(ids[0],expected,state.myTeam);
  assert.equal(expected.teams[state.myTeam].players.length,16);assert.equal(document.querySelector('[data-roster-limit] p')?.textContent,warning(16),'Exact16/one/15 roster decision');
  await click(button(/^Open roster$/));await waive(ids[1],expected,state.myTeam);
  assert.equal(expected.teams[state.myTeam].players.length,15);assert.equal(Boolean(document.querySelector('[data-roster-limit]')),false);
  assert.equal(deadCapUsed(save().league.teams[state.myTeam]),deadCapUsed(expected.teams[state.myTeam]));
  for(const id of ids)assert.equal(E.nhlSign(clone(expected.teams[state.myTeam]),clone(expected.freeAgents),id,expected.cap,expected.ratingModelVersion),false,'Cut player cannot be re-signed this season');
  const before=clone(expected),rng=random(970),baseline=random(970);Math.random=rng;
  E.simNhlRound(before,state.myTeam,baseline);E.nhlAiMoves(before,state.myTeam,baseline);before.round++;
  const play=await openPlay();assert.equal(play.disabled,false);await click(play);
  assert.equal(save().league.round,2);assert.equal(rng.calls(),baseline.calls());assert.deepEqual(normalize(save().league),normalize(before));await reload();
 }],
 ['ordinary within-limit opening play keeps the original engine outcome and draw tape',async()=>{
  const league=E.initNhlLeague(random(20),NHL_OPENING_RATINGS),myTeam=Object.keys(league.teams)[0];
  const state={league,myTeam,phase:'hub',titles:0,seasonsPlayed:0,draftClass:null,picksLeft:0,trust:70,fired:false};
  await mount(state);assert.ok(league.teams[myTeam].players.length<=E.NHL_ROSTER_MAX);assert.equal(Boolean(document.querySelector('[data-roster-limit]')),false);
  const before=clone(league),rng=random(971),baseline=random(971);Math.random=rng;E.simNhlRound(before,myTeam,baseline);E.nhlAiMoves(before,myTeam,baseline);before.round++;
  const play=await openPlay();assert.equal(play.disabled,false);await click(play);assert.equal(rng.calls(),baseline.calls());assert.deepEqual(normalize(save().league),normalize(before));await reload();
 }]
 ];
 try{for(let i=0;i<cases.length;i++){const [title,test]=cases[i];try{await test();rows.push({id:i,title,status:'PASS'});}catch(error:any){rows.push({id:i,title,status:'FAIL',error:{name:error.name,message:error.message,stack:error.stack}});}finally{cleanup();localStorage.clear();Math.random=original;}}return {total:rows.length,rows,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status==='FAIL').length};}finally{Math.random=original;cleanup();localStorage.clear();}
}
