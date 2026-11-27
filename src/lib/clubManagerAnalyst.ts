import type { Position } from '@/types/game';
import { ALL_POSITIONS } from './positionFit';
import { FORMATIONS, eligiblePressTargets, oppOnPitchAt, returnPressWinger } from './clubManager';
import type { CareerState, Competition, LiveMatch, OppXiLine } from './clubManager';
import { clockOrder, type ClockPoint } from './clubManagerClock';

export type AnalystMode = 'quick' | 'full';
export interface AnalystPlayer { name: string; position: Position; generated?: true }
export interface AnalystCount extends AnalystPlayer { count: number }
export interface AnalystTally { total: number; unknown: number; other: number; players: AnalystCount[] }
export interface AnalystWatch {
  v: 1; mode: AnalystMode; club: string; opponent: string; season: number; week: number;
  competition: Competition; home: boolean | null; from: ClockPoint;
}
export interface AnalystObservation extends AnalystWatch {
  to: ClockPoint; formation: string | null; starters: AnalystPlayer[] | null; throws: AnalystTally; shots: AnalystTally | null;
}
export interface AnalystNotebook { v: 1; rows: AnalystObservation[] }
export interface AnalystLineup { previous: AnalystObservation; overlap: number; compared: number; changedRole: number }
export interface AnalystRecommendation { target: AnalystPlayer; winger: {name:string;generated?:true}; todayThrows: number; pastThrows: number; pastMeetings: number }
export interface AnalystCurrent {
  observation: AnalystObservation; history: AnalystObservation[]; lineup: AnalystLineup | null; recommendation: AnalystRecommendation | null;
}

const PER_OPPONENT = 3, MAX_ROWS = 48;
const obj = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const natural = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const name = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160;
const validClock = (p: unknown): p is ClockPoint => obj(p) && natural(p.minute,120) && (p.plus === undefined || natural(p.plus,120));
export const isAnalystMode = (v: unknown): v is AnalystMode => v === 'quick' || v === 'full';
const validPlayer = (p: unknown): p is AnalystPlayer => obj(p) && name(p.name) && ALL_POSITIONS.includes(p.position as Position)
  && (p.generated === undefined || p.generated === true);
const isWide = (p: Position) => p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB';
const signature = (p: AnalystPlayer) => JSON.stringify([p.name,p.position,!!p.generated]);
const pairKey = (w: AnalystWatch) => JSON.stringify([w.club,w.opponent]);
const fixtureKey = (w: AnalystWatch) => JSON.stringify([w.club,w.opponent,w.season,w.week,w.competition,w.home]);
function validTally(t: unknown, throws: boolean): t is AnalystTally {
  if (!obj(t) || !natural(t.total,512) || !natural(t.unknown,t.total) || !natural(t.other,t.total)
    || (!throws && t.other !== 0) || !Array.isArray(t.players) || t.players.length > 32) return false;
  const seen = new Set<string>();
  let count = t.unknown + t.other;
  for (const p of t.players) {
    if (!obj(p) || !validPlayer(p) || !natural(p.count,t.total) || p.count < 1 || (throws && !isWide(p.position)) || seen.has(signature(p))) return false;
    seen.add(signature(p)); count += p.count;
  }
  return count === t.total;
}
export function isAnalystWatch(v: unknown): v is AnalystWatch {
  return obj(v) && v.v === 1 && isAnalystMode(v.mode) && name(v.club) && name(v.opponent) && natural(v.season,1000) && v.season >= 1
    && natural(v.week,500) && ['league','cup','uclGroup','uclKo','oneOff','uel','promotion'].includes(String(v.competition))
    && (v.home === true || v.home === false || v.home === null) && validClock(v.from);
}
export function isAnalystObservation(v: unknown): v is AnalystObservation {
  if (!obj(v) || !isAnalystWatch(v)) return false;
  const row = v as unknown as AnalystObservation;
  return validClock(row.to) && clockOrder(row.from,row.to) <= 0 && (row.formation === null || name(row.formation))
    && (row.starters === null || (Array.isArray(row.starters) && row.starters.length === 11 && row.starters.every(validPlayer)))
    && validTally(row.throws,true) && (row.mode === 'quick' ? row.shots === null : validTally(row.shots,false));
}
function validBook(v: unknown): v is AnalystNotebook {
  if (!obj(v) || Object.keys(v).length !== 2 || v.v !== 1 || !Array.isArray(v.rows) || v.rows.length > MAX_ROWS) return false;
  const pairs = new Map<string,number>(), fixtures = new Set<string>();
  for (const r of v.rows) {
    if (!isAnalystObservation(r) || fixtures.has(fixtureKey(r))) return false;
    fixtures.add(fixtureKey(r));
    const key=pairKey(r), n=(pairs.get(key)??0)+1;
    if (n > PER_OPPONENT) return false;
    pairs.set(key,n);
  }
  return true;
}
export const canUseAnalyst = (career: CareerState): boolean => career.analystNotebook === undefined || validBook(career.analystNotebook);
export function analystHistory(career: CareerState, opponent: string, club = career.clubName): AnalystObservation[] {
  const b = career.analystNotebook;
  return validBook(b) ? b.rows.filter(r=>r.club===club && r.opponent===opponent && (r.season<career.season || (r.season===career.season && r.week<=career.week))).reverse() : [];
}
const player = (p: OppXiLine): AnalystPlayer => ({name:p.n,position:p.p,...(p.g ? {generated:true} : {})});
function sameFixture(career: CareerState, live: LiveMatch, w: AnalystWatch): boolean {
  return w.club===career.clubName && career.week===live.week && w.opponent===live.opponent && w.home===live.home && w.week===live.week
    && w.season===career.season && w.competition===career.calendar[live.week]?.type;
}
export function setAnalystWatch(career: CareerState, live: LiveMatch, mode: AnalystMode | null, from: ClockPoint): boolean {
  const old=live.analystWatch, comp=career.calendar[live.week]?.type;
  if (!canUseAnalyst(career) || live.penaltyCalls || career.week!==live.week || !comp || comp==='window' || !validClock(from) || career.worldRatingRunIn
    || (old !== undefined && (!isAnalystWatch(old) || !sameFixture(career,live,old) || clockOrder(from,old.from)<0))) return false;
  if (mode === null) {
    if (!old) return false;
    delete live.analystWatch; return true;
  }
  if (!isAnalystMode(mode) || old?.mode===mode) return false;
  const next:AnalystWatch={v:1,mode,from:{...from},club:career.clubName,opponent:live.opponent,competition:comp,
    home:live.home,season:career.season,week:live.week};
  if (!isAnalystWatch(next)) return false;
  live.analystWatch=next;
  return true;
}

function countedEvents(live: LiveMatch, watch: AnalystWatch, to: ClockPoint) {
  const tally = (): AnalystTally => ({total:0,unknown:0,other:0,players:[]});
  const throws=tally(), shots=watch.mode==='full' ? tally() : null;
  const cards=[...(live.h1OppCards??[]),...(live.h2OppCards??[])].filter(c=>c.kind==='red');
  const ownGoals=[...(live.h1Opp??[]),...(live.h2Opp??[])].filter(s=>s.og);
  const sheet=[...(live.oppXi??[]),...(live.oppBench??[])];
  for (const e of [...(live.h1Play??[]),...(live.h2Play??[])]) {
    if (e.side!=='opp' || clockOrder(e,watch.from)<=0 || clockOrder(e,to)>0) continue;
    const t=e.kind==='throwin' ? throws : e.kind==='shot' ? shots : null;
    if (!t) continue;
    t.total++;
    // Names are all the play feed carries. Never guess between namesakes or a missing team sheet.
    if (!e.who || sheet.filter(p=>p.n===e.who).length!==1
      || (e.goal && ownGoals.some(g=>clockOrder(g,e)===0 && (g.drawn===e.who || g.name===e.who)))) { t.unknown++; continue; }
    const earlier=(s:ClockPoint)=>clockOrder(s,e)<0;
    const on=oppOnPitchAt({...live,oppSubs:live.oppSubs?.filter(earlier)},Infinity);
    const p=on.find(p=>p.n===e.who);
    if (!p || cards.some(c=>c.name===p.n && clockOrder(c,e)<=0)) { t.unknown++; continue; }
    if (e.kind==='throwin' && !isWide(p.p)) { t.other++; continue; }
    const existing=t.players.find(r=>r.name===p.n);
    if (existing) existing.count++;
    else t.players.push({...player(p),count:1});
  }
  const byCount=(a:AnalystCount,b:AnalystCount)=>b.count-a.count || a.name.localeCompare(b.name);
  throws.players.sort(byCount); shots?.players.sort(byCount);
  return {throws,shots};
}
function observation(career: CareerState, live: LiveMatch, to: ClockPoint): AnalystObservation | null {
  const w=live.analystWatch;
  if (!isAnalystWatch(w) || !sameFixture(career,live,w) || !validClock(to) || clockOrder(to,w.from)<0) return null;
  const sheet=live.oppXi?.length===11 ? live.oppXi.map(player) : null;
  const starters=sheet?.every(validPlayer) ? sheet : null;
  const formation=starters && live.oppFormationIndex!==undefined ? FORMATIONS[live.oppFormationIndex]?.name??null : null;
  return {...w,from:{...w.from},to:{...to},formation,starters,...countedEvents(live,w,to)};
}
export function analystCompare(note: AnalystObservation, history: AnalystObservation[]): AnalystLineup | null {
  if (!isAnalystObservation(note) || !Array.isArray(history) || history.length>PER_OPPONENT || !history.every(isAnalystObservation)) return null;
  const xi=note.starters;
  const previous=history.find(r=>r.club===note.club && r.opponent===note.opponent && r.starters
    && (r.season<note.season || (r.season===note.season && r.week<note.week)));
  const old=previous?.starters;
  if (!xi || !previous || !old) return null;
  const unambiguous=(p: AnalystPlayer)=>xi.filter(r=>r.name===p.name).length===1 && old.filter(r=>r.name===p.name).length<=1;
  const known=xi.filter(unambiguous);
  const same=(p:AnalystPlayer)=>old.find(r=>r.name===p.name && !!r.generated===!!p.generated);
  const returning=known.filter(p=>same(p));
  return {previous,compared:known.length,overlap:returning.length,changedRole:returning.filter(p=>same(p)?.position!==p.position).length};
}
export function analystCurrent(career: CareerState, live: LiveMatch, clock: ClockPoint): AnalystCurrent | null {
  const note=observation(career,live,clock);
  if (!note || !canUseAnalyst(career)) return null;
  const history=analystHistory(career,live.opponent).filter(r=>r.season<note.season || (r.season===note.season && r.week<note.week));
  const targets=eligiblePressTargets(live,clock.minute,clock.plus??0);
  const afterClock=[...(live.subs??[]),...(live.formChanges??[])].some(s=>clockOrder(s,clock)>0);
  let recommendation: AnalystRecommendation | null=null;
  for (const p of note.throws.players) {
    if (live.penaltyCalls || afterClock || !targets.some(t=>signature(player(t))===signature(p))) continue;
    const past=history.flatMap(r=>r.throws.players.filter(q=>signature(q)===signature(p)));
    const pastThrows=past.reduce((n,q)=>n+q.count,0);
    if (p.count<2 && pastThrows<2) continue;
    const winger=returnPressWinger({...career,live},p.name,clock.minute,clock.plus??0);
    if (!winger) continue;
    recommendation={target:{name:p.name,position:p.position,...(p.generated?{generated:true}:{})},winger:{name:winger.name,...(winger.generated?{generated:true}:{})},
      todayThrows:p.count,pastThrows,pastMeetings:past.length}; break;
  }
  return {observation:note,history,lineup:analystCompare(note,history),recommendation};
}
export function fileAnalystObservation(career: CareerState, live: LiveMatch): AnalystObservation | null {
  if (!canUseAnalyst(career)) return null;
  const minute=live.et?.to??90, plus=(live.et ? live.added?.et : live.added?.h2)??0;
  const note=observation(career,live,{minute,...(plus?{plus}:{})});
  if (!note || !isAnalystObservation(note)) return null;
  const rows=career.analystNotebook?.rows??[], existing=rows.find(r=>fixtureKey(r)===fixtureKey(note));
  if (existing) return JSON.stringify(existing)===JSON.stringify(note) ? existing : null;
  const same=rows.filter(r=>pairKey(r)===pairKey(note));
  const oldest=same.length>=PER_OPPONENT ? same[0] : null;
  career.analystNotebook={v:1,rows:[...rows.filter(r=>r!==oldest),note].slice(-MAX_ROWS)};
  return note;
}
