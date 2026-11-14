import type { SeasonRecord } from './soccerCareerEngine';
import { clubKeyOf } from './soccerCareerLeagueWorld';
import { keyedRng } from './keyedRng';
import { poissonGoals } from './soccerCareerContinental';

export interface CommunityShieldEntrant {
  club: string;
  via: 'league-winner' | 'fa-cup-winner' | 'league-runner-up';
}
export interface CommunityShieldSource {
  kind: 'phone-world' | 'league-world-close' | 'validated-player-fa-cup';
  year: number;
}
export interface CommunityShieldQualification {
  version: 1; competition: 'community-shield'; status: 'ready';
  qualifyingYear: number; eventYear: number; seed: number;
  leagueWinner: string; cupWinner: string; runnerUp?: string;
  entrants: [CommunityShieldEntrant, CommunityShieldEntrant];
  proof: { league: CommunityShieldSource; cup: CommunityShieldSource; runnerUp?: CommunityShieldSource };
}
export type ExtraCupQualification = CommunityShieldQualification | {
  version: 1; competition: 'community-shield'; status: 'partial';
  qualifyingYear: number; eventYear: number; reason: string;
};
export interface CommunityShieldResult {
  version: 1; competition: 'community-shield'; qualifyingYear: number; eventYear: number; seed: number;
  qualification: CommunityShieldQualification;
  annualRating?: number;
  entrants: [CommunityShieldEntrant, CommunityShieldEntrant];
  minutes: 90; score: [number, number];
  decidedBy: 'normal-time' | 'penalties'; penalties?: [number, number]; winner: string;
  player: {
    club: string; availability: 'available' | 'unknown' | 'unavailable'; reason?: string;
    selected: boolean; apps: 0 | 1; goals: number; assists: number; cleanSheets: 0 | 1;
    rating: number | null; title: boolean;
  };
}
type Raw = Record<string, unknown>;
const object = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const club = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min;
const seed = (v: unknown): v is number => integer(v) && v <= 4294967295;
const same = (a: string, b: string): boolean => clubKeyOf(a) === clubKeyOf(b);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (v: number): number => Math.round(v * 10) / 10;
function source(v: unknown, year: number, kinds: readonly string[]): boolean {
  return object(v) && v.year === year && typeof v.kind === 'string' && kinds.includes(v.kind);
}
function qualification(v: unknown, eventYear?: number): CommunityShieldQualification | null {
  if (!object(v) || v.version !== 1 || v.competition !== 'community-shield' || v.status !== 'ready') return null;
  if (!integer(v.qualifyingYear, 2026) || v.eventYear !== v.qualifyingYear + 1 || !integer(v.eventYear, 2025)
    || (eventYear !== undefined && v.eventYear !== eventYear) || !seed(v.seed)) return null;
  if (!club(v.leagueWinner) || !club(v.cupWinner) || !Array.isArray(v.entrants) || v.entrants.length !== 2 || !object(v.proof)) return null;
  const [a, b] = v.entrants;
  if (!object(a) || !object(b) || !club(a.club) || !club(b.club) || same(a.club, b.club)
    || a.via !== 'league-winner' || !same(a.club, v.leagueWinner)) return null;
  if (!source(v.proof.league, v.qualifyingYear, ['league-world-close'])
    || !source(v.proof.cup, v.qualifyingYear, ['phone-world', 'validated-player-fa-cup'])) return null;
  if (same(v.leagueWinner, v.cupWinner)) {
    if (!club(v.runnerUp) || same(v.runnerUp, v.leagueWinner) || b.via !== 'league-runner-up' || !same(b.club, v.runnerUp)
      || !source(v.proof.runnerUp, v.qualifyingYear, ['league-world-close'])) return null;
  } else if (b.via !== 'fa-cup-winner' || !same(b.club, v.cupWinner) || v.runnerUp !== undefined || v.proof.runnerUp !== undefined) return null;
  return v as unknown as CommunityShieldQualification;
}
export interface CommunityShieldCaptureInput {
  qualifyingYear: number; worldYear?: number; seed?: number; englishOrder: readonly string[] | null;
  leagueWinner?: string; cupWinner?: string; cupSource: 'phone-world' | 'validated-player-fa-cup';
}
export function captureCommunityShield(input: CommunityShieldCaptureInput): ExtraCupQualification | null {
  const y = input.qualifyingYear;
  if (!integer(y, 2024) || !Number.isSafeInteger(y + 1)) return null;
  const partial = (reason: string): ExtraCupQualification => ({
    version: 1, competition: 'community-shield', status: 'partial', qualifyingYear: y, eventYear: y + 1, reason,
  });
  if (y < 2026 || input.worldYear !== y) return partial('The closing English league world was not recorded.');
  if (!seed(input.seed)) return partial('The closing world seed was not recorded.');
  const order = input.englishOrder;
  if (!order || order.length !== 20 || !order.every(club) || new Set(order.map(clubKeyOf)).size !== order.length)
    return partial('The actual closing Premier League order was not recorded.');
  if (!club(input.leagueWinner) || !same(input.leagueWinner, order[0])) return partial('The closing league winner and order do not agree.');
  if (!club(input.cupWinner)) return partial('The closing FA Cup winner was not recorded.');
  const double = same(input.leagueWinner, input.cupWinner);
  const q: CommunityShieldQualification = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: y, eventYear: y + 1,
    seed: input.seed, leagueWinner: input.leagueWinner, cupWinner: input.cupWinner,
    ...(double ? { runnerUp: order[1] } : {}),
    entrants: [{ club: input.leagueWinner, via: 'league-winner' },
      { club: double ? order[1] : input.cupWinner, via: double ? 'league-runner-up' : 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: y }, cup: { kind: input.cupSource, year: y },
      ...(double ? { runnerUp: { kind: 'league-world-close' as const, year: y } } : {}) },
  };
  return qualification(q) ?? partial('The closing qualification evidence is incomplete.');
}
export function communityShieldPlayerSide(result: CommunityShieldResult): 0 | 1 | null {
  if (same(result.player.club, result.entrants[0].club)) return 0;
  if (same(result.player.club, result.entrants[1].club)) return 1;
  return null;
}
function shootout(rng: () => number): [number, number] {
  const score: [number, number] = [0, 0];
  const taken: [number, number] = [0, 0];
  for (let kick = 0; kick < 10; kick++) {
    const side = kick % 2 as 0 | 1;
    taken[side]++;
    if (rng() < 0.75) score[side]++;
    if (score[0] > score[1] + 5 - taken[1] || score[1] > score[0] + 5 - taken[0]) return score;
  }
  while (score[0] === score[1]) {
    if (rng() < 0.75) score[0]++;
    if (rng() < 0.75) score[1]++;
  }
  return score;
}
export interface CommunityShieldOpeningInput {
  qualification: unknown; eventYear: number; playerName: string; club: string; position: string; overall: number;
  selectionChance: number; unavailableReason: 'unresolved-rehab' | 'pending-generic-suspension' | null;
  teamStrengths: readonly [number, number] | null;
}
export function playCommunityShield(input: CommunityShieldOpeningInput): CommunityShieldResult | null {
  const q = qualification(input.qualification, input.eventYear), strengths = input.teamStrengths;
  if (!q || !Array.isArray(strengths) || strengths.length !== 2 || !strengths.every(Number.isFinite) || !club(input.club)
    || !Number.isFinite(input.overall) || !Number.isFinite(input.selectionChance)) return null;
  const key = 'extra-cup|' + JSON.stringify(['community-shield', q.eventYear, q.seed, ...q.entrants.map(e => clubKeyOf(e.club))]);
  const rng = keyedRng(key), d = (strengths[0] - strengths[1]) / 2;
  const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];
  const penalties = score[0] === score[1] ? shootout(rng) : undefined;
  const winnerSide = (penalties ? penalties[0] > penalties[1] : score[0] > score[1]) ? 0 : 1;
  const winner = q.entrants[winnerSide].club;
  const side = q.entrants.findIndex(e => same(e.club, input.club));
  const availability = side < 0 ? 'unavailable' : input.unavailableReason ? 'unknown' : 'available';
  const playerRng = keyedRng(key + '|player|' + JSON.stringify([input.playerName, clubKeyOf(input.club), input.position]));
  const selected = availability === 'available' && playerRng() < clamp(input.selectionChance, 0, 1);
  let goals = 0, assists = 0, rating: number | null = null;
  if (selected) {
    const group = input.position === 'GK' ? 'GK' : ['ST', 'CAM', 'LW', 'RW'].includes(input.position) ? 'ATT'
      : ['CM', 'CDM'].includes(input.position) ? 'MID' : 'DEF';
    const quality = clamp((input.overall - 68) / 28, 0, 1.2);
    const share = group === 'ATT' ? 0.55 : group === 'MID' ? 0.25 : group === 'DEF' ? 0.12 : 0;
    for (let i = 0; i < score[side]; i++) if (playerRng() < share * (0.6 + quality * 0.6)) goals++;
    const assistShare = group === 'ATT' ? 0.2 : group === 'MID' ? 0.3 : group === 'DEF' ? 0.12 : 0.02;
    for (let i = 0; i < score[side] - goals; i++) if (playerRng() < assistShare * (0.6 + quality * 0.6)) assists++;
    rating = round1(clamp(6.2 + quality * 0.9 + goals * 0.55 + assists * 0.3 + (playerRng() - 0.45) * 1.1, 4, 10));
  }
  const cleanSheets = selected && ['GK', 'CB', 'LB', 'RB'].includes(input.position) && score[1 - side] === 0 ? 1 : 0;
  const saved = JSON.parse(JSON.stringify(q)) as CommunityShieldQualification;
  return {
    version: 1, competition: 'community-shield', qualifyingYear: q.qualifyingYear, eventYear: q.eventYear, seed: q.seed,
    qualification: saved, entrants: saved.entrants.map(e => ({ ...e })) as [CommunityShieldEntrant, CommunityShieldEntrant],
    minutes: 90, score, decidedBy: penalties ? 'penalties' : 'normal-time', ...(penalties ? { penalties } : {}), winner,
    player: { club: input.club, availability, ...(side < 0 ? { reason: 'not-entrant' } : input.unavailableReason ? { reason: input.unavailableReason } : {}),
      selected, apps: selected ? 1 : 0, goals, assists, cleanSheets, rating, title: selected && same(input.club, winner) },
  };
}
function pair(v: unknown, max = Number.MAX_SAFE_INTEGER): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && v.every(n => integer(n) && n <= max);
}
function possiblePenalties(score: [number, number]): boolean {
  const hi = Math.max(...score), lo = Math.min(...score);
  return hi > 5 ? hi - lo === 1 : ['1:0', '2:0', '2:1', '3:0', '3:1', '3:2', '4:1', '4:2', '4:3', '5:3', '5:4'].includes(hi + ':' + lo);
}
export function readCommunityShield(row: unknown): CommunityShieldResult | null {
  if (!object(row) || row.type !== 'playing' || !integer(row.year, 2025) || !club(row.club)
    || !Array.isArray(row.extraCups) || row.extraCups.length !== 1) return null;
  const r = row.extraCups[0];
  if (!object(r) || r.version !== 1 || r.competition !== 'community-shield' || r.minutes !== 90 || r.eventYear !== row.year) return null;
  const q = qualification(r.qualification, row.year);
  if (!q || r.qualifyingYear !== q.qualifyingYear || r.seed !== q.seed || !Array.isArray(r.entrants) || r.entrants.length !== 2) return null;
  for (let i = 0; i < 2; i++) {
    const entry = r.entrants[i];
    if (!object(entry) || entry.club !== q.entrants[i].club || entry.via !== q.entrants[i].via) return null;
  }
  if (!pair(r.score, 11) || !club(r.winner)) return null;
  let winnerSide: 0 | 1;
  if (r.score[0] === r.score[1]) {
    if (r.decidedBy !== 'penalties' || !pair(r.penalties) || !possiblePenalties(r.penalties)) return null;
    winnerSide = r.penalties[0] > r.penalties[1] ? 0 : 1;
  } else {
    if (r.decidedBy !== 'normal-time' || r.penalties !== undefined) return null;
    winnerSide = r.score[0] > r.score[1] ? 0 : 1;
  }
  if (!same(r.winner, q.entrants[winnerSide].club) || !object(r.player)) return null;
  const p = r.player;
  if (!club(p.club) || !same(p.club, row.club) || (typeof p.availability !== 'string' || !['available', 'unknown', 'unavailable'].includes(p.availability))
    || typeof p.selected !== 'boolean' || typeof p.title !== 'boolean' || !integer(p.goals) || !integer(p.assists)
    || !integer(p.cleanSheets) || p.cleanSheets > 1 || (p.reason !== undefined && !club(p.reason))) return null;
  const side = q.entrants.findIndex(e => same(e.club, p.club as string));
  if (side < 0 && p.availability !== 'unavailable') return null;
  if (p.selected) {
    if (side < 0 || p.availability !== 'available' || p.apps !== 1 || p.goals > r.score[side]
      || p.assists > r.score[side] - p.goals || (p.cleanSheets === 1 && r.score[1 - side] !== 0)
      || typeof p.rating !== 'number' || !Number.isFinite(p.rating) || p.rating < 4 || p.rating > 10
      || Math.abs(p.rating * 10 - Math.round(p.rating * 10)) > 1e-8 || p.title !== same(p.club, r.winner)) return null;
  } else if (p.apps !== 0 || p.goals !== 0 || p.assists !== 0 || p.cleanSheets !== 0 || p.rating !== null || p.title) return null;
  for (const key of ['apps', 'goals', 'assists', 'cleanSheets'] as const) {
    const total = row[key], part = p[key];
    if (!integer(total) || !integer(part) || total < part) return null;
  }
  if (typeof row.rating !== 'number' || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 10) return null;
  const result = r as unknown as CommunityShieldResult;
  if (Object.prototype.hasOwnProperty.call(r, 'annualRating') && !recordedAnnualStats(row, result)) return null;
  return result;
}
export function communityShieldWinningSeasons(rows: readonly SeasonRecord[]): SeasonRecord[] {
  const held = rows.map(row => ({ row, match: readCommunityShield(row) }));
  const editions = new Map<number, number>();
  for (const { match } of held) if (match) editions.set(match.eventYear, (editions.get(match.eventYear) ?? 0) + 1);
  return held.filter(({ match }) => match && match.player.title && editions.get(match.eventYear) === 1).map(({ row }) => row);
}
export function countCommunityShields(rows: readonly SeasonRecord[]): number {
  return communityShieldWinningSeasons(rows).length;
}
function recordedAnnualStats(row: Raw, result: CommunityShieldResult): CommunityShieldStats | null {
  const p = result.player, rating = result.annualRating;
  const apps = (row.apps as number) - p.apps;
  if (typeof rating !== 'number' || !Number.isFinite(rating) || Math.abs(rating * 10 - Math.round(rating * 10)) > 1e-8
    || (apps > 0 ? rating < 3 || rating > 10 : rating !== 0)) return null;
  const annual = { apps, goals: (row.goals as number) - p.goals, assists: (row.assists as number) - p.assists,
    cleanSheets: (row.cleanSheets as number) - p.cleanSheets, rating };
  if (apps === 0 && (annual.goals !== 0 || annual.assists !== 0 || annual.cleanSheets !== 0)) return null;
  const merged = communityShieldSeasonStats(annual, result);
  return (['apps', 'goals', 'assists', 'cleanSheets', 'rating'] as const).every(key => merged[key] === row[key]) ? annual : null;
}
export function communityShieldAnnualStats(row: SeasonRecord): CommunityShieldStats | null {
  const stats = { apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating };
  if (row.extraCups === undefined) return stats;
  const result = readCommunityShield(row);
  if (!result) return null;
  if (result.player.apps === 0) return stats;
  return recordedAnnualStats(row as unknown as Raw, result);
}
export interface CommunityShieldStats {
  apps: number; goals: number; assists: number; cleanSheets: number; rating: number;
}
export function communityShieldSeasonStats(annual: CommunityShieldStats, result: CommunityShieldResult | null): CommunityShieldStats {
  const p = result?.player;
  if (!p || p.apps === 0) return { apps: annual.apps, goals: annual.goals, assists: annual.assists, cleanSheets: annual.cleanSheets, rating: annual.rating };
  return { apps: annual.apps + 1, goals: annual.goals + p.goals, assists: annual.assists + p.assists,
    cleanSheets: annual.cleanSheets + p.cleanSheets, rating: round1((annual.rating * annual.apps + p.rating!) / (annual.apps + 1)) };
}


export interface GermanSupercupEntrant {
  club: string;
  via: 'league-winner' | 'dfb-pokal-winner' | 'league-runner-up';
}
export interface GermanSupercupReadyQualification {
  version: 1; competition: 'german-supercup'; status: 'ready';
  qualifyingYear: number; eventYear: number; seed: number;
  leagueWinner: string; cupWinner: string; runnerUp?: string;
  entrants: [GermanSupercupEntrant, GermanSupercupEntrant];
  proof: {
    league: { kind: 'league-world-close'; year: number };
    cup: { kind: 'phone-world' | 'validated-player-dfb-pokal'; year: number };
    runnerUp?: { kind: 'league-world-close'; year: number };
  };
}
export type GermanSupercupQualification = GermanSupercupReadyQualification | {
  version: 1; competition: 'german-supercup'; status: 'partial';
  qualifyingYear: number; eventYear: number; reason: string;
};
export interface GermanSupercupResult {
  version: 1; competition: 'german-supercup'; qualifyingYear: number; eventYear: number; seed: number;
  qualification: GermanSupercupReadyQualification; annualRating?: number;
  entrants: [GermanSupercupEntrant, GermanSupercupEntrant];
  minutes: 90; score: [number, number];
  decidedBy: 'normal-time' | 'penalties'; penalties?: [number, number]; winner: string;
  player: CommunityShieldResult['player'];
}
function germanQualification(v: unknown, eventYear?: number): GermanSupercupReadyQualification | null {
  if (!object(v) || v.version !== 1 || v.competition !== 'german-supercup' || v.status !== 'ready'
    || !integer(v.qualifyingYear, 2026) || !integer(v.eventYear, 2027) || v.eventYear !== v.qualifyingYear + 1
    || (eventYear !== undefined && v.eventYear !== eventYear) || !seed(v.seed)
    || !club(v.leagueWinner) || !club(v.cupWinner) || !Array.isArray(v.entrants) || v.entrants.length !== 2 || !object(v.proof)) return null;
  const [a, b] = v.entrants;
  if (!object(a) || !object(b) || !club(a.club) || !club(b.club) || same(a.club, b.club)
    || a.via !== 'league-winner' || !same(a.club, v.leagueWinner)
    || !source(v.proof.league, v.qualifyingYear, ['league-world-close'])
    || !source(v.proof.cup, v.qualifyingYear, ['phone-world', 'validated-player-dfb-pokal'])) return null;
  if (same(v.leagueWinner, v.cupWinner)) {
    if (!club(v.runnerUp) || same(v.runnerUp, v.leagueWinner) || b.via !== 'league-runner-up' || !same(b.club, v.runnerUp)
      || !source(v.proof.runnerUp, v.qualifyingYear, ['league-world-close'])) return null;
  } else if (b.via !== 'dfb-pokal-winner' || !same(b.club, v.cupWinner) || v.runnerUp !== undefined || v.proof.runnerUp !== undefined) return null;
  return v as unknown as GermanSupercupReadyQualification;
}
export interface GermanSupercupCaptureInput {
  qualifyingYear: number; worldYear?: number; seed?: number; germanOrder: readonly string[] | null;
  leagueWinner?: string; cupWinner?: string; cupSource: 'phone-world' | 'validated-player-dfb-pokal';
}
export function captureGermanSupercup(input: GermanSupercupCaptureInput): GermanSupercupQualification | null {
  const y = input.qualifyingYear;
  if (!integer(y, 2026) || !Number.isSafeInteger(y + 1)) return null;
  const partial = (reason: string): GermanSupercupQualification => ({
    version: 1, competition: 'german-supercup', status: 'partial', qualifyingYear: y, eventYear: y + 1, reason,
  });
  if (input.worldYear !== y) return partial('The closing German league world was not recorded.');
  if (!seed(input.seed)) return partial('The closing world seed was not recorded.');
  const order = input.germanOrder;
  if (!order || order.length !== 18 || !order.every(club) || new Set(order.map(clubKeyOf)).size !== 18)
    return partial('The actual closing Bundesliga order was not recorded.');
  if (!club(input.leagueWinner) || !same(input.leagueWinner, order[0])) return partial('The closing league winner and order do not agree.');
  if (!club(input.cupWinner)) return partial('The closing DFB-Pokal winner was not recorded.');
  const double = same(input.leagueWinner, input.cupWinner);
  const q: GermanSupercupReadyQualification = {
    version: 1, competition: 'german-supercup', status: 'ready', qualifyingYear: y, eventYear: y + 1,
    seed: input.seed, leagueWinner: input.leagueWinner, cupWinner: input.cupWinner,
    ...(double ? { runnerUp: order[1] } : {}),
    entrants: [{ club: input.leagueWinner, via: 'league-winner' },
      { club: double ? order[1] : input.cupWinner, via: double ? 'league-runner-up' : 'dfb-pokal-winner' }],
    proof: { league: { kind: 'league-world-close', year: y }, cup: { kind: input.cupSource, year: y },
      ...(double ? { runnerUp: { kind: 'league-world-close' as const, year: y } } : {}) },
  };
  return germanQualification(q) ?? partial('The closing qualification evidence is incomplete.');
}
export function germanSupercupPlayerSide(result: GermanSupercupResult): 0 | 1 | null {
  if (same(result.player.club, result.entrants[0].club)) return 0;
  if (same(result.player.club, result.entrants[1].club)) return 1;
  return null;
}
export interface GermanSupercupOpeningInput extends CommunityShieldOpeningInput {
  clubCountry: string;
  englishOpening: CommunityShieldResult | null;
}
export function playGermanSupercup(input: GermanSupercupOpeningInput): GermanSupercupResult | null {
  const q = germanQualification(input.qualification, input.eventYear), strengths = input.teamStrengths;
  if (!q || input.clubCountry !== 'Germany' || !club(input.club) || !Number.isFinite(input.overall) || !Number.isFinite(input.selectionChance)
    || !Array.isArray(strengths) || strengths.length !== 2 || !strengths.every(Number.isFinite)) return null;
  const side = q.entrants.findIndex(e => same(e.club, input.club));
  if (side < 0) return null;
  if (input.englishOpening !== null) {
    const e = input.englishOpening;
    if (!object(e) || !object(e.player)) return null;
    const p = e.player;
    const english = readCommunityShield({ type: 'playing', year: input.eventYear, club: input.club,
      apps: p.apps, goals: p.goals, assists: p.assists, cleanSheets: p.cleanSheets, rating: p.rating ?? 0, extraCups: [e] });
    if (!english || communityShieldPlayerSide(english) !== null) return null;
  }
  const key = 'extra-cup|' + JSON.stringify(['german-supercup', q.eventYear, q.seed, ...q.entrants.map(e => clubKeyOf(e.club))]);
  const rng = keyedRng(key), d = (strengths[0] - strengths[1]) / 2;
  const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];
  const penalties = score[0] === score[1] ? shootout(rng) : undefined;
  const winnerSide = (penalties ? penalties[0] > penalties[1] : score[0] > score[1]) ? 0 : 1;
  const winner = q.entrants[winnerSide].club;
  const availability = input.unavailableReason ? 'unknown' : 'available';
  const playerRng = keyedRng(key + '|player|' + JSON.stringify([input.playerName, clubKeyOf(input.club), input.position]));
  const selected = availability === 'available' && playerRng() < clamp(input.selectionChance, 0, 1);
  let goals = 0, assists = 0, rating: number | null = null;
  if (selected) {
    const group = input.position === 'GK' ? 'GK' : ['ST', 'CAM', 'LW', 'RW'].includes(input.position) ? 'ATT'
      : ['CM', 'CDM'].includes(input.position) ? 'MID' : 'DEF';
    const quality = clamp((input.overall - 68) / 28, 0, 1.2);
    const share = group === 'ATT' ? 0.55 : group === 'MID' ? 0.25 : group === 'DEF' ? 0.12 : 0;
    for (let i = 0; i < score[side]; i++) if (playerRng() < share * (0.6 + quality * 0.6)) goals++;
    const assistShare = group === 'ATT' ? 0.2 : group === 'MID' ? 0.3 : group === 'DEF' ? 0.12 : 0.02;
    for (let i = 0; i < score[side] - goals; i++) if (playerRng() < assistShare * (0.6 + quality * 0.6)) assists++;
    rating = round1(clamp(6.2 + quality * 0.9 + goals * 0.55 + assists * 0.3 + (playerRng() - 0.45) * 1.1, 4, 10));
  }
  const cleanSheets = selected && ['GK', 'CB', 'LB', 'RB'].includes(input.position) && score[1 - side] === 0 ? 1 : 0;
  const saved = JSON.parse(JSON.stringify(q)) as GermanSupercupReadyQualification;
  return {
    version: 1, competition: 'german-supercup', qualifyingYear: q.qualifyingYear, eventYear: q.eventYear, seed: q.seed,
    qualification: saved, entrants: saved.entrants.map(e => ({ ...e })) as [GermanSupercupEntrant, GermanSupercupEntrant],
    minutes: 90, score, decidedBy: penalties ? 'penalties' : 'normal-time', ...(penalties ? { penalties } : {}), winner,
    player: { club: input.club, availability, ...(input.unavailableReason ? { reason: input.unavailableReason } : {}),
      selected, apps: selected ? 1 : 0, goals, assists, cleanSheets, rating, title: selected && same(input.club, winner) },
  };
}
export function readGermanSupercup(row: unknown): GermanSupercupResult | null {
  if (!object(row) || row.type !== 'playing' || !integer(row.year, 2027) || row.clubCountry !== 'Germany' || !club(row.club)) return null;
  const r = row.germanSupercup;
  if (!object(r) || r.version !== 1 || r.competition !== 'german-supercup' || r.minutes !== 90 || r.eventYear !== row.year
    || Object.prototype.hasOwnProperty.call(r, 'home') || Object.prototype.hasOwnProperty.call(r, 'neutral')) return null;
  const q = germanQualification(r.qualification, row.year);
  if (!q || r.qualifyingYear !== q.qualifyingYear || r.seed !== q.seed || !Array.isArray(r.entrants) || r.entrants.length !== 2) return null;
  for (let i = 0; i < 2; i++) {
    const entry = r.entrants[i];
    if (!object(entry) || entry.club !== q.entrants[i].club || entry.via !== q.entrants[i].via) return null;
  }
  if (!pair(r.score, 11) || !club(r.winner)) return null;
  let winnerSide: 0 | 1;
  if (r.score[0] === r.score[1]) {
    if (r.decidedBy !== 'penalties' || !pair(r.penalties) || !possiblePenalties(r.penalties)) return null;
    winnerSide = r.penalties[0] > r.penalties[1] ? 0 : 1;
  } else {
    if (r.decidedBy !== 'normal-time' || r.penalties !== undefined) return null;
    winnerSide = r.score[0] > r.score[1] ? 0 : 1;
  }
  if (!same(r.winner, q.entrants[winnerSide].club) || !object(r.player)) return null;
  const p = r.player;
  if (!club(p.club) || !same(p.club, row.club) || (typeof p.availability !== 'string' || !['available', 'unknown', 'unavailable'].includes(p.availability))
    || typeof p.selected !== 'boolean' || typeof p.title !== 'boolean' || !integer(p.goals) || !integer(p.assists)
    || !integer(p.cleanSheets) || p.cleanSheets > 1 || (p.reason !== undefined && !club(p.reason))) return null;
  const side = q.entrants.findIndex(e => same(e.club, p.club as string));
  if (side < 0) return null;
  if (p.selected) {
    if (p.availability !== 'available' || p.apps !== 1 || p.goals > r.score[side] || p.assists > r.score[side] - p.goals
      || (p.cleanSheets === 1 && r.score[1 - side] !== 0) || typeof p.rating !== 'number' || !Number.isFinite(p.rating)
      || p.rating < 4 || p.rating > 10 || Math.abs(p.rating * 10 - Math.round(p.rating * 10)) > 1e-8
      || p.title !== same(p.club, r.winner)) return null;
  } else if (p.apps !== 0 || p.goals !== 0 || p.assists !== 0 || p.cleanSheets !== 0 || p.rating !== null || p.title) return null;
  for (const name of ['apps', 'goals', 'assists', 'cleanSheets'] as const) {
    const total = row[name], part = p[name];
    if (!integer(total) || !integer(part) || total < part) return null;
  }
  if (typeof row.rating !== 'number' || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 10) return null;
  if (Object.prototype.hasOwnProperty.call(row, 'extraCups')) {
    const english = readCommunityShield(row);
    if (!english || communityShieldPlayerSide(english) !== null) return null;
  }
  const result = r as unknown as GermanSupercupResult;
  if ((p.selected || Object.prototype.hasOwnProperty.call(r, 'annualRating'))
    && !recordedAnnualStats(row, result as unknown as CommunityShieldResult)) return null;
  return result;
}
export function germanSupercupSeasonStats(annual: CommunityShieldStats, result: GermanSupercupResult | null): CommunityShieldStats {
  return communityShieldSeasonStats(annual, result as unknown as CommunityShieldResult | null);
}
export function careerOpeningAnnualStats(row: SeasonRecord): CommunityShieldStats | null {
  if (!Object.prototype.hasOwnProperty.call(row, 'germanSupercup')) return communityShieldAnnualStats(row);
  const result = readGermanSupercup(row);
  if (!result) return null;
  return result.player.apps === 0
    ? { apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating }
    : recordedAnnualStats(row as unknown as Raw, result as unknown as CommunityShieldResult);
}
export function germanSupercupWinningSeasons(rows: readonly SeasonRecord[]): SeasonRecord[] {
  const held = rows.map(row => ({ row, match: readGermanSupercup(row) }));
  const editions = new Map<number, number>();
  for (const { match } of held) if (match) editions.set(match.eventYear, (editions.get(match.eventYear) ?? 0) + 1);
  return held.filter(({ match }) => match && match.player.title && editions.get(match.eventYear) === 1).map(({ row }) => row);
}
export function countGermanSupercups(rows: readonly SeasonRecord[]): number {
  return germanSupercupWinningSeasons(rows).length;
}
