import type { CareerState, CMPlayer } from './clubManager';

export interface FeeDate { season: number; week: number }
export interface AppearanceFee {
  version: 1;
  id: string;
  playerId: string;
  player: string;
  generated?: true;
  worldKey?: string;
  buyer: string;
  seller: string;
  amount: number;
  threshold: 5 | 15;
  appearances: number;
  paid: number;
  payments: (FeeDate & {amount:number})[];
  status: 'tracking' | 'due' | 'paid' | 'void';
  signed: FeeDate;
  lastAppearance?: FeeDate;
  triggered?: FeeDate;
  lastPaid?: FeeDate;
  closed?: FeeDate;
}

export function appearanceFeeTerms(amount: unknown, threshold: unknown): {amount:number; threshold:5 | 15; sellerValue:number} | null {
  if ((threshold !== 5 && threshold !== 15) || typeof amount !== 'number' || !Number.isFinite(amount)
      || amount <= 0 || amount > 40 || Math.round(amount * 10) / 10 !== amount) return null;
  return { amount, threshold, sellerValue: Math.round(amount * (threshold === 5 ? 0.8 : 0.55) * 10) / 10 };
}

const dateValid = (d: FeeDate | undefined) => !!d && Number.isSafeInteger(d.season) && d.season >= 1
  && Number.isSafeInteger(d.week) && d.week >= 0;
const later = (a: FeeDate, b: FeeDate) => a.season > b.season || (a.season === b.season && a.week > b.week);
const v1Keys = new Set(['version','id','playerId','player','generated','worldKey','buyer','seller','amount','threshold','appearances',
  'paid','payments','status','signed','lastAppearance','triggered','lastPaid','closed']);

function readable(row: AppearanceFee | null): row is AppearanceFee {
  return !!row && row.version === 1 && Object.keys(row).every(key => v1Keys.has(key))
    && [row.id,row.playerId,row.player,row.buyer,row.seller].every(k => typeof k === 'string' && !!k)
    && row.buyer !== row.seller && !!appearanceFeeTerms(row.amount,row.threshold) && dateValid(row.signed)
    && Number.isInteger(row.appearances) && row.appearances >= 0 && row.appearances <= row.threshold
    && Number.isFinite(row.paid) && row.paid >= 0 && row.paid <= row.amount && Math.round(row.paid*100)/100 === row.paid
    && [row.lastAppearance,row.triggered,row.lastPaid,row.closed].every(d => d === undefined || dateValid(d))
    && Array.isArray(row.payments) && row.payments.every(p => dateValid(p) && Number.isFinite(p.amount)
      && p.amount > 0 && Math.round(p.amount*100)/100 === p.amount)
    && row.payments.reduce((sum,p) => sum + Math.round(p.amount*100),0) === Math.round(row.paid*100)
    && (row.paid === 0 || dateValid(row.lastPaid)) && (row.status !== 'void' && row.status !== 'paid' || dateValid(row.closed))
    && (row.appearances === 0 || dateValid(row.lastAppearance))
    && (row.status === 'tracking' || row.status === 'void'
      ? row.appearances < row.threshold && row.paid === 0
      : row.appearances === row.threshold && dateValid(row.triggered)
        && (row.status === 'paid' ? row.paid === row.amount : row.status === 'due' && row.paid < row.amount));
}

function rows(career: CareerState): AppearanceFee[] {
  if (!Array.isArray(career.appearanceFees)) return [];
  const saved = career.appearanceFees;
  const identities = new Set<string>(), duplicates = new Set<string>();
  for (const row of saved) {
    if (row && identities.has(row.id)) duplicates.add(row.id);
    if (row) identities.add(row.id);
  }
  return saved.filter(row => readable(row) && !duplicates.has(row.id));
}

export function appearanceFeeDesk(career: CareerState, club = career.clubName): AppearanceFee[] {
  return rows(career).filter(row => row.buyer === club).reverse();
}

export function appearanceFeeClubs(career: CareerState): string[] {
  return [...new Set(rows(career).map(row => row.buyer))];
}

export function canBookAppearanceFee(career: CareerState): boolean {
  return career.appearanceFees === undefined
    || (Array.isArray(career.appearanceFees) && rows(career).length === career.appearanceFees.length);
}

export function seasonAppearanceFeeSpend(career: CareerState): number {
  const cents = rows(career).filter(r => r.buyer === career.clubName).reduce((sum,row) => sum +
    row.payments.reduce((total,p) => total + (p.season === career.season ? Math.round(p.amount*100) : 0),0),0);
  return cents/100;
}

export function addAppearanceFee(career: CareerState, player: CMPlayer, seller: string, amount: number, threshold: 5 | 15): void {
  const prior = career.appearanceFees ?? [];
  const id = JSON.stringify([career.clubName,career.season,career.week,player.id,prior.length]);
  const row: AppearanceFee = { version:1, id, buyer:career.clubName, seller, player:player.name, playerId:player.id,
    amount, threshold, appearances:0, paid:0, payments:[], status:'tracking', signed:{ season:career.season, week:career.week },
    ...(player.worldRosterKey ? {worldKey:player.worldRosterKey} : {}), ...(player.generated ? {generated:true} : {}) };
  career.appearanceFees = [...prior,row];
  career.squad = career.squad.map(p => p.id === player.id ? { ...p, appearanceFeeId:id } : p);
}

/** The signed token travels on an unseeded player and survives a squad ID reallocation after a loan. */
const sameRegistration = (row: AppearanceFee, p: CMPlayer) => p.appearanceFeeId === row.id
  || (!!row.worldKey && p.worldRosterKey === row.worldKey);

export function voidAppearanceFee(career: CareerState, player: CMPlayer, from: string): CareerState {
  if (!Array.isArray(career.appearanceFees) || !canBookAppearanceFee(career)) return career;
  const matching = (r: AppearanceFee) => readable(r) && r.status === 'tracking' && r.buyer === from && sameRegistration(r,player);
  if (!career.appearanceFees.some(matching)) return career;
  return { ...career, appearanceFees:career.appearanceFees.map(r => matching(r)
    ? { ...r, status:'void', closed:{season:career.season,week:career.week} } : r) };
}

/** Earn the appearance before a deadline-day bid can take the player away at this whistle. */
export function recordFeeAppearances(career: CareerState, date: FeeDate, leaguePlayers: readonly CMPlayer[]): void {
  if (!Array.isArray(career.appearanceFees) || !canBookAppearanceFee(career)) return;
  career.appearanceFees = career.appearanceFees.map(row => {
    if (!readable(row) || row.buyer !== career.clubName || row.status !== 'tracking' ||
        later(row.signed,date) || (row.lastAppearance && !later(date,row.lastAppearance))) return row;
    const man = leaguePlayers.find(p => !p.onLoan && sameRegistration(row,p));
    if (!man) return row;
    const appearances = row.appearances + 1;
    return { ...row, playerId:man.id, appearances, lastAppearance:date,
      ...(man.worldRosterKey ? {worldKey:man.worldRosterKey} : {}),
      ...(appearances === row.threshold ? {status:'due',triggered:date} : {}) };
  });
}

/** Pay from the buying club's actual budget after its match cash flows or when its summer allocation arrives. */
export function settleAppearanceFees(career: CareerState, date: FeeDate): void {
  if (!Array.isArray(career.appearanceFees) || !canBookAppearanceFee(career) || !Number.isFinite(career.budget)) return;
  let cash = Math.round(career.budget * 100);
  career.appearanceFees = career.appearanceFees.map(row => {
    if (row.buyer !== career.clubName || row.status !== 'due' || later(row.lastPaid ?? row.triggered!,date)) return row;
    const balance = Math.round(row.amount*100) - Math.round(row.paid*100);
    const payment = Math.min(balance,Math.max(0,cash-500));
    if (!payment) return row;
    cash -= payment;
    career.budget = cash/100;
    return { ...row, paid:(Math.round(row.paid*100)+payment)/100, lastPaid:date,
      payments:[...row.payments,{...date,amount:payment/100}],
      ...(payment === balance ? {status:'paid',closed:date} : {}) };
  });
}
