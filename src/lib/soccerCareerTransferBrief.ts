import type { CareerState, ClubData, ContractOffer } from './soccerCareerEngine';
import { clubKeyOf } from './soccerCareerLeagueWorld';

export type TransferBriefPriority = 'minutes' | 'level' | 'home';
export interface TransferBriefContext {
  club: string; seasonCount: number; lastYear: number; overall: number; age: number; nationality: string;
}
export interface TransferBriefBand { min: number; max: number }
export interface TransferBriefResult {
  status: 'offered' | 'no_interest' | 'no_match';
  offer: ContractOffer | null;
  eligibleCount: number;
  matchingCount: number;
  projection: TransferBriefBand | null;
}
export interface SoccerTransferBrief {
  version: 1;
  priority: TransferBriefPriority;
  context: TransferBriefContext;
  result?: TransferBriefResult;
}
export type TransferBriefProjection = (overall: number, tier: number, club: string, seasonsAtClub: number) => TransferBriefBand;
export interface TransferBriefOption {
  id: TransferBriefPriority; label: string; eligibleCount: number; matchingCount: number;
  tiers: number[]; projection: TransferBriefBand | null;
}
export interface TransferBriefPreview {
  eligible: boolean; selected: TransferBriefPriority | null; result: TransferBriefResult | null;
  options: TransferBriefOption[];
}

const PRIORITIES: TransferBriefPriority[] = ['minutes', 'level', 'home'];
const LABELS: Record<TransferBriefPriority, string> = {
  minutes: 'More playing time', level: 'Highest available level', home: 'Return to your home country',
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const keys = (value: Record<string, unknown>, required: string[], optional: string[] = []) =>
  required.every(key => Object.prototype.hasOwnProperty.call(value, key))
  && Object.keys(value).every(key => required.includes(key) || optional.includes(key));

function validBand(value: unknown): value is TransferBriefBand {
  return object(value) && keys(value, ['min', 'max']) && count(value.min) && count(value.max)
    && value.min <= value.max && value.max <= 38;
}
function validClub(value: unknown): value is ClubData {
  return object(value) && keys(value, ['id', 'name', 'country', 'tier', 'color', 'league'])
    && ['id', 'name', 'country', 'color', 'league'].every(key => text(value[key]))
    && count(value.tier) && value.tier >= 1 && value.tier <= 4;
}
function validOffer(value: unknown): value is ContractOffer {
  return object(value) && keys(value, ['club', 'contractYears', 'wage', 'transferFee'], ['isDreamClub', 'isPayCut', 'isHomegrown', 'isLoan'])
    && validClub(value.club) && count(value.contractYears) && value.contractYears >= 1 && value.contractYears <= 5
    && count(value.wage) && value.wage > 0 && finite(value.transferFee) && value.transferFee >= 0
    && ['isDreamClub', 'isPayCut', 'isHomegrown', 'isLoan'].every(key => !(key in value) || typeof value[key] === 'boolean')
    && value.isLoan !== true;
}
function sameOffer(a: ContractOffer | null, b: unknown): boolean {
  if (a === null) return b === null;
  if (!validOffer(b)) return false;
  const aKeys = Object.keys(a), bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length || aKeys.some(key => !bKeys.includes(key))) return false;
  return Object.keys(a.club).every(key => a.club[key as keyof ClubData] === b.club[key as keyof ClubData])
    && aKeys.filter(key => key !== 'club').every(key => a[key as keyof ContractOffer] === b[key as keyof ContractOffer]);
}
function validResult(value: unknown): value is TransferBriefResult {
  if (!object(value) || !keys(value, ['status', 'offer', 'eligibleCount', 'matchingCount', 'projection'])
    || !['offered', 'no_interest', 'no_match'].includes(value.status as string)
    || !count(value.eligibleCount) || !count(value.matchingCount) || value.matchingCount > value.eligibleCount
    || !(value.projection === null || validBand(value.projection))) return false;
  if (value.status === 'offered') return validOffer(value.offer) && value.matchingCount > 0 && value.projection !== null;
  if (value.offer !== null) return false;
  if (value.status === 'no_match') return value.matchingCount === 0 && value.projection === null;
  return (value.matchingCount === 0) === (value.projection === null);
}
function contextOf(career: CareerState): TransferBriefContext | null {
  const last = career.seasons[career.seasons.length - 1];
  if (!text(career.currentClub) || !text(career.nationality) || !last || !count(last.year) || last.year === 0
    || !finite(career.overall) || career.overall < 0 || career.overall > 99 || !count(career.age) || career.age < 18) return null;
  return { club: career.currentClub, seasonCount: career.seasons.length, lastYear: last.year,
    overall: career.overall, age: career.age, nationality: career.nationality };
}
function currentWindow(career: CareerState): boolean {
  return career.phase === 'transfer_window' && !career.retired && !career.loan
    && !!career.transferSituation && ['no_interest', 'one_offer', 'dream_club'].includes(career.transferSituation.type);
}

export function readTransferBrief(career: CareerState, project?: TransferBriefProjection): SoccerTransferBrief | null {
  const value: unknown = career.transferBrief;
  const context = contextOf(career);
  if (!object(value) || !keys(value, ['version', 'priority', 'context'], ['result'])
    || value.version !== 1 || !PRIORITIES.includes(value.priority as TransferBriefPriority)
    || !object(value.context) || !keys(value.context, ['club', 'seasonCount', 'lastYear', 'overall', 'age', 'nationality'])
    || !context
    || career.phase !== 'transfer_window' || career.retired || career.loan) return null;
  const heldContext = value.context;
  if (Object.keys(context).some(key => heldContext[key] !== context[key as keyof TransferBriefContext])) return null;
  if ('result' in value) {
    if (!validResult(value.result) || career.transferSituation?.type !== 'request_result'
      || !sameOffer(value.result.offer, career.transferSituation.offer)) return null;
    const offer = value.result.offer;
    if (offer) {
      if (clubKeyOf(offer.club.name) === clubKeyOf(career.currentClub)
        || (value.priority === 'home' && offer.club.country !== career.nationality) || !project) return null;
      const band = project(career.overall, offer.club.tier, offer.club.name, 0);
      if (!validBand(band) || band.min !== value.result.projection!.min || band.max !== value.result.projection!.max) return null;
    }
  } else if (!currentWindow(career)) return null;
  return value as unknown as SoccerTransferBrief;
}

export function setTransferBrief(career: CareerState, priority: TransferBriefPriority | null): CareerState {
  const held = readTransferBrief(career);
  if (held?.result) return career;
  if (priority === null) {
    if (!held) return career;
    const next = { ...career };
    delete next.transferBrief;
    return next;
  }
  const context = contextOf(career);
  if (!currentWindow(career) || !context || !PRIORITIES.includes(priority) || held?.priority === priority) return career;
  return { ...career, transferBrief: { version: 1, priority, context } };
}

function candidatesFor(career: CareerState, priority: TransferBriefPriority, eligible: readonly ClubData[], project: TransferBriefProjection): ClubData[] {
  const clubs = eligible.filter(club => validClub(club) && clubKeyOf(club.name) !== clubKeyOf(career.currentClub));
  if (priority === 'home') return clubs.filter(club => club.country === career.nationality);
  if (priority === 'level') {
    const tier = Math.min(...clubs.map(club => club.tier));
    return clubs.filter(club => club.tier === tier);
  }
  const bands = clubs.map(club => ({ club, band: project(career.overall, club.tier, club.name, 0) }))
    .filter(row => validBand(row.band));
  const min = Math.max(...bands.map(row => row.band.min));
  const max = Math.max(...bands.filter(row => row.band.min === min).map(row => row.band.max));
  return bands.filter(row => row.band.min === min && row.band.max === max).map(row => row.club);
}
function poolBand(career: CareerState, clubs: readonly ClubData[], project: TransferBriefProjection): TransferBriefBand | null {
  const bands = clubs.map(club => project(career.overall, club.tier, club.name, 0)).filter(validBand);
  return bands.length ? { min: Math.min(...bands.map(band => band.min)), max: Math.max(...bands.map(band => band.max)) } : null;
}
export function transferBriefCandidates(career: CareerState, eligible: readonly ClubData[], project: TransferBriefProjection): ClubData[] {
  const brief = readTransferBrief(career);
  return brief && !brief.result ? candidatesFor(career, brief.priority, eligible, project) : [];
}
export function previewTransferBrief(career: CareerState, eligible: readonly ClubData[], project: TransferBriefProjection): TransferBriefPreview {
  const held = readTransferBrief(career, project);
  const clubs = eligible.filter(club => validClub(club) && clubKeyOf(club.name) !== clubKeyOf(career.currentClub));
  return { eligible: currentWindow(career) && contextOf(career) !== null, selected: held?.priority ?? null,
    result: held?.result ?? null, options: PRIORITIES.map(id => {
      const matches = candidatesFor(career, id, clubs, project);
      return { id, label: LABELS[id], eligibleCount: clubs.length, matchingCount: matches.length,
        tiers: [...new Set(matches.map(club => club.tier))].sort((a, b) => a - b), projection: poolBand(career, matches, project) };
    }) };
}
export function transferBriefResult(career: CareerState, project?: TransferBriefProjection): TransferBriefResult | null {
  return readTransferBrief(career, project)?.result ?? null;
}
export function storeTransferBriefResult(career: CareerState, result: TransferBriefResult): CareerState {
  const brief = readTransferBrief(career);
  if (!brief || brief.result || !validResult(result)) return career;
  const offer = result.offer ? { ...result.offer, club: { ...result.offer.club } } : null;
  const heldResult = { ...result, offer, projection: result.projection ? { ...result.projection } : null };
  return { ...career, phase: 'transfer_window', transferSituation: { type: 'request_result', offer },
    transferBrief: { ...brief, context: { ...brief.context }, result: heldResult } };
}
export function clearTransferBrief(next: CareerState, previous: CareerState, project: TransferBriefProjection): void {
  if (readTransferBrief(previous, project)) delete next.transferBrief;
}
