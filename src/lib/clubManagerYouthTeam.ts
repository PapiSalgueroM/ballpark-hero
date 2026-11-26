import type { CareerState } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';

export const YOUTH_TEAM_COST = 45;
export const YOUTH_ENTRY_COST = 12;
export const YOUTH_MATCHES = 6;
export const YOUTH_FACILITY_LEVEL = 12;

interface YouthFixture { season: number; round: number; opponent: string; gf: number; ga: number; gain: number }
interface YouthCampaign { season: number; prospectId: string; name: string; fixtures: YouthFixture[] }
export interface YouthTeam { club: string; campaign?: YouthCampaign }

export function restoreYouthTeam(career: CareerState): void {
  const academy = career.academy;
  if (!academy || academy.youthTeam === undefined) return;
  const team = academy.youthTeam;
  if (!team || team.club !== career.clubName) { delete academy.youthTeam; return; }
  const c = team.campaign;
  if (c === undefined) return;
  if (!c || !Number.isInteger(c.season) || typeof c.prospectId !== 'string' || typeof c.name !== 'string' ||
      !Array.isArray(c.fixtures) || c.fixtures.length > YOUTH_MATCHES || c.fixtures.some(m => !m ||
        !Number.isInteger(m.season) || !Number.isInteger(m.round) || typeof m.opponent !== 'string' ||
        ![m.gf, m.ga].every(g => Number.isInteger(g) && g >= 0 && g <= 4) || (m.gain !== 0 && m.gain !== 1))) {
    delete team.campaign;
  }
}

export function foundYouthTeam(career: CareerState): CareerState {
  const academy = career.academy;
  if (!academy || academy.youthTeam || academy.facilities < YOUTH_FACILITY_LEVEL || career.budget < YOUTH_TEAM_COST) return career;
  return { ...career, budget: Math.round((career.budget - YOUTH_TEAM_COST) * 10) / 10,
    academy: { ...academy, youthTeam: { club: career.clubName } } };
}

export function enterYouthCampaign(career: CareerState, prospectId: string): CareerState {
  const academy = career.academy;
  const team = academy?.youthTeam;
  const prospect = academy?.prospects.find(p => p.id === prospectId && p.age < 21);
  if (!team || team.club !== career.clubName || !prospect) return career;
  const last = team.campaign;
  if (last && (last.season >= career.season || last.fixtures.length < YOUTH_MATCHES)) return career;
  const cost = last ? YOUTH_ENTRY_COST : 0;
  if (career.budget < cost) return career;
  return { ...career, budget: Math.round((career.budget - cost) * 10) / 10, academy: { ...academy,
    youthTeam: { ...team, campaign: { season: career.season, prospectId, name: prospect.name, fixtures: [] } } } };
}

// Called on the engine's own match copy, once the senior league result is final.
export function playYouthFixture(career: CareerState, round: number, opponent: string): void {
  const academy = career.academy;
  const team = academy?.youthTeam;
  const campaign = team?.campaign;
  if (!campaign || team.club !== career.clubName || campaign.fixtures.length >= YOUTH_MATCHES ||
      campaign.fixtures.some(m => m.season === career.season && m.round === round)) return;
  const prospect = academy.prospects.find(p => p.id === campaign.prospectId);
  const roll = keyedRng([team.club, campaign.season, career.season, round, opponent].join('|'));
  const chance = 0.23 + academy.coaching * 0.005 + (prospect?.rating ?? 50) / 1200;
  let gf = 0, ga = 0;
  for (let attack = 0; attack < 4; attack++) {
    if (roll() < chance) gf++;
    if (roll() < 0.36) ga++;
  }
  const gain = prospect && campaign.fixtures.length % 2 === 1 && prospect.rating < prospect.potential ? 1 : 0;
  if (prospect) prospect.rating += gain;
  campaign.fixtures.push({ season: career.season, round, opponent, gf, ga, gain });
}
