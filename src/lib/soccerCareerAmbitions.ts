import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export type AmbitionStat = 'goals' | 'assists' | 'cleanSheets' | 'rating';
export type AmbitionRewardStat = 'shooting' | 'passing' | 'defending' | 'reflexes' | 'physical';
export interface AmbitionOption {
  id: AmbitionStat;
  label: string;
  stat: AmbitionStat;
  target: number;
  rewardStat: AmbitionRewardStat;
}
export interface CareerSeasonAmbition extends AmbitionOption { year: number; club: string }
export interface SeasonAmbitionResult {
  label: string;
  target: number;
  actual: number;
  outcome: 'achieved' | 'missed' | 'interrupted';
  rewardStat?: AmbitionRewardStat;
}

const STATS: AmbitionStat[] = ['goals', 'assists', 'cleanSheets', 'rating'];
const REWARDS: AmbitionRewardStat[] = ['shooting', 'passing', 'defending', 'reflexes', 'physical'];
const INITIAL: Record<AmbitionStat, number> = { goals: 5, assists: 3, cleanSheets: 5, rating: 7 };
const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const upcomingYear = (career: CareerState) => (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;

function validAmbition(held: CareerSeasonAmbition): boolean {
  return STATS.includes(held.stat) && held.id === held.stat && REWARDS.includes(held.rewardStat)
    && typeof held.label === 'string' && held.label.length > 0 && Number.isInteger(held.year)
    && typeof held.club === 'string' && held.club.length > 0 && Number.isFinite(held.target)
    && (held.stat === 'rating' ? held.target > 0 && held.target <= 10 : Number.isInteger(held.target) && held.target > 0);
}

/** Club season personal bests, not international totals or a predicted result. */
export function ambitionOptions(career: CareerState): AmbitionOption[] {
  if (career.retired || career.phase !== 'playing') return [];
  const keeper = career.position === 'GK';
  const backLine = keeper || ['CB', 'LB', 'RB'].includes(career.position);
  const stats = STATS.filter(stat => stat === 'rating' || (stat === 'cleanSheets' ? backLine : !keeper));
  const rows = career.seasons.filter(row => row.type === 'playing' && row.apps > 0 && !YEAR_OUT.includes(row.club));
  return stats.flatMap(stat => {
    const values = rows.filter(row => stat !== 'rating' || row.apps >= 10).map(row => row[stat]).filter(value => Number.isFinite(value)
      && (stat === 'rating' ? value > 0 && value <= 10 : Number.isInteger(value) && value >= 0));
    const best = values.length ? Math.max(...values) : null;
    const target = best === null ? INITIAL[stat] : stat === 'rating' ? Math.min(10, Math.round((best + 0.1) * 10) / 10) : best + 1;
    if (best !== null && target <= best) return [];
    const label = stat === 'rating' ? `Earn a ${target.toFixed(1)} club season rating over 10+ appearances`
      : stat === 'cleanSheets' ? `Keep ${target} club clean sheets`
        : stat === 'assists' ? `Make ${target} club assists` : `Score ${target} club goals`;
    const rewardStat: AmbitionRewardStat = stat === 'goals' ? 'shooting' : stat === 'assists' ? 'passing'
      : stat === 'cleanSheets' ? keeper ? 'reflexes' : 'defending' : 'physical';
    return [{ id: stat, label, stat, target, rewardStat }];
  });
}

/** The same next-year convention as nextSeasonYear, with no engine value import. */
export function ambitionForNextSeason(career: CareerState): CareerSeasonAmbition | null {
  const held = career.seasonAmbition;
  return held && validAmbition(held) && !career.retired && held.year === upcomingYear(career) && held.club === career.currentClub ? held : null;
}

export function pickCareerAmbition(prev: CareerState, id: string | null): CareerState {
  if (prev.retired || prev.phase !== 'playing') return prev;
  if (id === null) {
    if (!prev.seasonAmbition) return prev;
    const next = { ...prev };
    delete next.seasonAmbition;
    return next;
  }
  const option = ambitionOptions(prev).find(item => item.id === id);
  if (!option) return prev;
  const held = ambitionForNextSeason(prev);
  if (held?.id === option.id) return prev;
  return { ...prev, seasonAmbition: { ...option, year: upcomingYear(prev), club: prev.currentClub } };
}

/** Called only after the engine has recorded the finished or interrupted year. */
export function settleCareerAmbition(career: CareerState, row: SeasonRecord): void {
  const held = career.seasonAmbition;
  if (!held) return;
  delete career.seasonAmbition;
  if (row.ambition || !validAmbition(held) || held.year !== row.year
    || (held.club !== row.club && !YEAR_OUT.includes(row.club))) return;
  const value = row[held.stat];
  const valid = Number.isFinite(value) && (held.stat === 'rating' ? value >= 0 && value <= 10 : Number.isInteger(value) && value >= 0);
  const actual = valid ? value : 0;
  const shortRating = held.stat === 'rating' && row.apps < 10;
  const outcome = row.injurySevere || !(row.apps > 0) || shortRating || YEAR_OUT.includes(row.club) || !valid ? 'interrupted' : actual >= held.target ? 'achieved' : 'missed';
  row.ambition = { label: held.label, target: held.target, actual, outcome };
  if (outcome === 'achieved') {
    row.ambition.rewardStat = held.rewardStat;
    career.statBoostNextSeason = { ...career.statBoostNextSeason, [held.rewardStat]: (career.statBoostNextSeason[held.rewardStat] ?? 0) + 1 };
    career.events = [...career.events, `🎯 Ambition achieved: ${held.label}. +1 ${held.rewardStat} with next season's growth.`];
  } else {
    career.events = [...career.events, `🎯 Ambition ${outcome}: ${held.label}. Finished on ${actual}.`];
  }
}
