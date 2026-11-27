import { effectiveXIWithSlots, isAvailable, type CareerState, type CMPlayer, type LiveMatch, type TrainingIntensity } from '@/lib/clubManager';
import { clockOrder, type ClockPoint } from '@/lib/clubManagerClock';
import { readMajorInjury, type MajorInjury } from '@/lib/clubManagerInjuries';
import { keyedRng } from '@/lib/keyedRng';

export type ReturnPlan = 'late-cameo' | 'managed-start';
export interface ReturnCandidate {
  id: string; name: string; generated: boolean; position: string; injuryWeeks: number; major?: MajorInjury;
}
export interface ReturnTraining { season: number; week: number; intensity: TrainingIntensity }
export interface ReturnReceipt {
  v: 1; club: string; playerId: string; name: string; generated: boolean; plan: ReturnPlan; season: number; week: number;
  opponent: string; started: boolean; entry: ClockPoint; exit: ClockPoint; minutes: number; training: ReturnTraining[];
  riskPercent: number; outcome: 'settled' | 'setback' | 'match-injury' | 'training-injury'; setbackWeeks: number;
}
interface ReturnCase {
  club: string; playerId: string; season: number; week: number; plan: ReturnPlan; major?: MajorInjury; training: ReturnTraining[];
}
export interface ReturnBook { v: 1; active?: ReturnCase; last?: ReturnReceipt }
interface ReturnCue { outId: string; inId: string; outName: string; inName: string; window: 'hour' | 'late' }
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && Number(x) >= 0;
const label = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const isPlan = (x: unknown): x is ReturnPlan => x === 'late-cameo' || x === 'managed-start';
const clock = (x: ClockPoint) => !!x && nat(x.minute) && x.minute <= 120 && (x.plus === undefined || nat(x.plus));
const sessions = (x: unknown): x is ReturnTraining[] => Array.isArray(x) && x.length <= 2
  && Array.from(x).every(t => t && nat(t.season) && nat(t.week) && ['light','normal','double'].includes(t.intensity));

export function isReturnReceipt(raw: unknown): raw is ReturnReceipt {
  const r = raw as ReturnReceipt;
  return !!r && !Array.isArray(r) && r.v === 1 && label(r.club) && label(r.playerId) && label(r.name) && typeof r.generated === 'boolean'
    && isPlan(r.plan) && nat(r.season) && nat(r.week) && label(r.opponent) && typeof r.started === 'boolean'
    && clock(r.entry) && clock(r.exit) && clockOrder(r.entry,r.exit) <= 0 && nat(r.minutes) && r.minutes > 0 && sessions(r.training)
    && nat(r.riskPercent) && r.riskPercent <= 100 && ['settled','setback','match-injury','training-injury'].includes(r.outcome)
    && nat(r.setbackWeeks) && r.setbackWeeks === (r.outcome === 'setback' ? 1 : 0);
}

function readBook(raw: unknown): ReturnBook | null {
  const b = raw as ReturnBook;
  if (!b || Array.isArray(b) || b.v !== 1 || Object.keys(b).some(k => !['v','active','last'].includes(k))
    || (b.last !== undefined && !isReturnReceipt(b.last))) return null;
  const a = b.active;
  if (a !== undefined && !(a && !Object.keys(a).some(k => !['club','playerId','season','week','plan','major','training'].includes(k))
    && label(a.club) && label(a.playerId) && nat(a.season) && nat(a.week) && isPlan(a.plan)
    && sessions(a.training) && (a.major === undefined || readMajorInjury(a.major)))) return null;
  return b;
}

const episodeFor = (s: CareerState) => {
  const a = readBook(s.returnToPlay)?.active;
  return a?.club === s.clubName && (s.season > a.season || (s.season === a.season && s.week >= a.week))
    && s.squad.some(p => p.id === a.playerId && !p.loanFrom) ? a : null;
};
const candidate = (p: CMPlayer): ReturnCandidate => ({
  id:p.id, name:p.name, generated:!!(p.generated || p.isYouth || p.academyGrad), position:p.position, injuryWeeks:p.injuryWeeks,
  ...(readMajorInjury(p.majorInjury) ? {major:{...p.majorInjury!}} : {}),
});
const enrollable = (p: CMPlayer) => !p.loanFrom && nat(p.injuryWeeks) && p.injuryWeeks > 0
  && (p.majorInjury === undefined || !!readMajorInjury(p.majorInjury));

export function bookReturnToPlay(s: CareerState, playerId: string, plan: ReturnPlan): CareerState | null {
  const book = readBook(s.returnToPlay), active = episodeFor(s);
  const p = s.squad.find(row => row.id === playerId);
  if (s.live || s.sacked || !isPlan(plan) || !p || (s.returnToPlay !== undefined && !book)
    || (active && active.playerId !== playerId) || (!enrollable(p) && !active)) return null;
  const next: ReturnCase = active ? {...active,plan} : {
    club:s.clubName, playerId, season:s.season, week:s.week, plan, training:[], ...(p.majorInjury ? {major:{...p.majorInjury}} : {}),
  };
  return {...s,returnToPlay:{...book,v:1,active:next}};
}

export function cancelReturnToPlay(s: CareerState): CareerState | null {
  return s.live || !episodeFor(s) ? null : clearReturn(s);
}

function clearReturn(s: CareerState): CareerState {
  const next = {...s}, last = s.returnToPlay?.last;
  if (last) next.returnToPlay = {v:1,last};
  else delete next.returnToPlay;
  return next;
}

export function departReturn(s: CareerState, id: string, from: string): CareerState {
  const a = readBook(s.returnToPlay)?.active;
  return a?.club === from && a.playerId === id ? clearReturn(s) : s;
}

export function returnAfterJob(s: CareerState): ReturnBook | undefined {
  const book = readBook(s.returnToPlay);
  if (!book) return s.returnToPlay;
  return book.last ? {v:1,last:book.last} : undefined;
}

function pair(s: CareerState, p: CMPlayer, plan: ReturnPlan, ids: string[]): ReturnCue | null {
  const start = plan === 'managed-start';
  if (!isAvailable(p) || ids.includes(p.id) !== start) return null;
  const partner = s.squad.filter(q => q.id !== p.id && q.position === p.position && isAvailable(q) && ids.includes(q.id) !== start)
    .sort((a,b) => b.fitness - a.fitness || b.rating - a.rating)[0];
  if (!partner) return null;
  const [out,into] = start ? [p,partner] : [partner,p];
  return {outId:out.id,inId:into.id,outName:out.name,inName:into.name,window:start ? 'hour' : 'late'};
}

// A fictional game rule. The same exposure has the same risk under either instruction.
function risk(a: ReturnCase, minutes: number): number {
  const load = a.training.reduce((sum,t) => sum + (t.intensity === 'double' ? 3 : t.intensity === 'light' ? -1 : 0), 0);
  return Math.max(1,Math.min(30,2 + Math.floor(minutes / 6) + (a.major ? 3 : 0) + load));
}
export function returnToPlayDesk(s: CareerState) {
  const book = readBook(s.returnToPlay), a = episodeFor(s), p = a && s.squad.find(row => row.id === a.playerId);
  const ids = p ? s.live?.startXi ?? effectiveXIWithSlots(s).map(row => row.p.id) : [];
  const status: 'recovering'|'suspended'|'ready' = p && p.injuryWeeks > 0 ? 'recovering' : p && !isAvailable(p) ? 'suspended' : 'ready';
  const forecast: [number,number] = a?.plan === 'managed-start' ? [58,68] : [8,18];
  return {candidates:s.squad.filter(enrollable).map(candidate),locked:!!s.live || !!s.sacked || (s.returnToPlay !== undefined && !book),
    active:a && p ? {player:{...candidate(p),...(a.major ? {major:{...a.major}} : {})},plan:a.plan,status,
      projectedStart:ids.includes(p.id),training:a.training,forecast:forecast.map(m => risk(a,m)) as [number,number],
      cue:pair(s,p,a.plan,ids)} : null,last:book?.last?.club === s.clubName ? book.last : null};
}

function fixtureStamp(s: CareerState, live: LiveMatch, a: ReturnCase) {
  return JSON.stringify([a.club,a.playerId,a.season,a.week,a.plan,s.season,live.week,live.opponent,live.compLabel,live.home]);
}
export function bindReturn(s: CareerState, live: LiveMatch) {
  const a = episodeFor(s), p = a && s.squad.find(q => q.id === a.playerId);
  if (a && p && !p.loanFrom && isAvailable(p)) live.returnToPlay = fixtureStamp(s,live,a);
}
export function returnCoachCue(s: CareerState): ReturnCue | null {
  const live = s.live, a = episodeFor(s);
  if (!live || !a || live.returnToPlay !== fixtureStamp(s,live,a)) return null;
  const p = s.squad.find(q => q.id === a.playerId);
  return p ? pair(s,p,a.plan,live.startXi) : null;
}

/** Called inside the charged training tick, after the personal intensity override. Nights have no training tick. */
export function noteReturnTraining(s: CareerState, p: CMPlayer, week: number, intensity: TrainingIntensity) {
  const a = episodeFor(s);
  if (!a || p.id !== a.playerId || p.injuryWeeks > 0) return;
  const latest = a.training.at(-1);
  if (latest?.season === s.season && latest.week === week) return;
  s.returnToPlay = {...s.returnToPlay!,active:{...a,training:[...a.training.slice(-1),{season:s.season,week,intensity}]}};
}

function elapsed(live: LiveMatch, point: ClockPoint) {
  return point.minute + (point.plus ?? 0) + (point.minute > 45 ? live.added?.h1 ?? 0 : 0)
    + (point.minute > 90 ? live.added?.h2 ?? 0 : 0);
}
const pointOf = (e: ClockPoint): ClockPoint => ({minute:e.minute,...(e.plus ? {plus:e.plus} : {})});

/** Run after the ordinary fitness and training tick. One completed appearance consumes the booked episode. */
export function finishReturn(s: CareerState, live: LiveMatch): ReturnReceipt | null {
  const a = episodeFor(s), p = a && s.squad.find(q => q.id === a.playerId);
  if (!a || !p || p.loanFrom || s.week !== live.week || live.returnToPlay !== fixtureStamp(s,live,a)) return null;
  const started = live.startXi.includes(p.id), subs = (live.subs ?? []).map(sub => {
    // The substitution list uses 46 for the dressing room and 90 for the extra-time break.
    if (sub.returnBreak === 'half') return {...sub,minute:45,plus:live.added?.h1 ?? 0};
    if (sub.returnBreak === 'extra') return {...sub,minute:90,plus:live.added?.h2 ?? 0};
    return sub;
  });
  const entry = started ? {minute:0} : subs.find(line => line.onId === p.id);
  if (!entry) return null;
  const injuries = [...live.h1Injuries ?? [],...live.h2Injuries ?? []].filter(e => e.id === p.id);
  const end = {minute:live.et?.to ?? 90,plus:(live.et ? live.added?.et : live.added?.h2) ?? 0};
  const exit = [...subs.filter(e => e.offId === p.id),...injuries,
    ...[...live.h1Cards ?? [],...live.h2Cards ?? []].filter(e => e.id === p.id && e.kind === 'red'),end]
    .filter(e => clockOrder(entry,e) <= 0).sort(clockOrder)[0];
  if (!exit) return null;
  const minutes = elapsed(live,exit) - elapsed(live,entry);
  if (minutes <= 0) return null;
  const riskPercent = risk(a,minutes);
  const draw = keyedRng(JSON.stringify(['managed return',s.worldSeed ?? s.eraId,s.clubName,s.season,live.week,live.opponent,p.id]))();
  const outcome = injuries.length ? 'match-injury' : p.injuryWeeks > 0 ? 'training-injury' : draw * 100 < riskPercent ? 'setback' : 'settled';
  const setbackWeeks = outcome === 'setback' ? 1 : 0;
  if (setbackWeeks) p.injuryWeeks = setbackWeeks;
  const receipt: ReturnReceipt = {v:1,club:s.clubName,playerId:p.id,name:p.name,generated:candidate(p).generated,plan:a.plan,
    season:s.season,week:live.week,opponent:live.opponent,started,entry:pointOf(entry),exit:pointOf(exit),minutes,
    training:[...a.training],riskPercent,outcome,setbackWeeks};
  s.returnToPlay = {v:1,last:receipt};
  return receipt;
}
