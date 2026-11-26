import type { CareerState } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';

export const YOUTH_TEAM_COST = 45;
export const YOUTH_ENTRY_COST = 12;
export const YOUTH_MATCHES = 6;
export const YOUTH_FACILITY_LEVEL = 12;

interface YouthFixture { season: number; round: number; opponent: string; gf: number; ga: number; gain: number }
type RotationBreak = 2 | 4;
interface Nominee { prospectId: string; name: string }
interface Rotation extends Nominee { after: RotationBreak }
interface YouthCampaign extends Nominee { season: number; fixtures: YouthFixture[]; rotations?: Rotation[] }

export function youthNomineeAt(campaign: YouthCampaign, fixtureIndex: number): Nominee {
  let nominee: Nominee = campaign;
  for (const change of campaign.rotations ?? []) {
    if (change.after <= fixtureIndex) nominee = change;
  }
  return nominee;
}

export function youthRotationBreak(campaign: YouthCampaign): RotationBreak | null {
  const after = campaign.fixtures.length;
  return (after === 2 || after === 4) && !campaign.rotations?.some(change => change.after === after) ? after : null;
}

export function youthDevelopment(campaign: YouthCampaign) {
  const players = new Map<string, { name: string; gain: number }>();
  for (const [index, match] of campaign.fixtures.entries()) {
    const player = youthNomineeAt(campaign, index);
    const total = players.get(player.prospectId) ?? { name: player.name, gain: 0 };
    total.gain += match.gain;
    players.set(player.prospectId, total);
  }
  return [...players.values()];
}

export interface YouthTeam { club: string; campaign?: YouthCampaign; history?: YouthCampaign[] }

export function youthCampaignRecord(campaign: YouthCampaign) {
  const record = { wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gain: 0 };
  for (const match of campaign.fixtures) {
    if (match.gf > match.ga) record.wins++;
    else if (match.gf === match.ga) record.draws++;
    else record.losses++;
    record.gf += match.gf;
    record.ga += match.ga;
    record.gain += match.gain;
  }
  return record;
}

function isYouthCampaign(c: YouthCampaign | undefined): c is YouthCampaign {
  return !!c && Number.isInteger(c.season) && typeof c.prospectId === 'string' && typeof c.name === 'string' &&
    Array.isArray(c.fixtures) && c.fixtures.length <= YOUTH_MATCHES &&
    (c.rotations === undefined || (Array.isArray(c.rotations) && c.rotations.length <= 2 &&
      c.rotations.every((r, index, all) => r && (r.after === 2 || r.after === 4) && r.after <= c.fixtures.length &&
        (!index || all[index - 1].after < r.after) && typeof r.prospectId === 'string' && typeof r.name === 'string'))) &&
    c.fixtures.every(m => m &&
      Number.isInteger(m.season) && Number.isInteger(m.round) && typeof m.opponent === 'string' &&
      [m.gf, m.ga].every(g => Number.isInteger(g) && g >= 0 && g <= 4) && (m.gain === 0 || m.gain === 1));
}

export function restoreYouthTeam(career: CareerState): void {
  const academy = career.academy;
  if (!academy || academy.youthTeam === undefined) return;
  const team = academy.youthTeam;
  if (!team || team.club !== career.clubName) { delete academy.youthTeam; return; }
  if (team.campaign !== undefined && !isYouthCampaign(team.campaign)) delete team.campaign;
  if (Array.isArray(team.history)) {
    team.history = team.history.filter(c => isYouthCampaign(c) && c.fixtures.length === YOUTH_MATCHES);
  } else if (team.history !== undefined) delete team.history;
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
    youthTeam: { ...team, ...(last && { history: [...(team.history ?? []), last] }),
      campaign: { season: career.season, prospectId, name: prospect.name, fixtures: [] } } } };
}

export function rotateYouthProspect(career: CareerState, season: number, after: RotationBreak, id: string): CareerState {
  const academy = career.academy;
  const team = academy?.youthTeam;
  const campaign = team?.campaign;
  if (!campaign || team.club !== career.clubName || campaign.season !== season || youthRotationBreak(campaign) !== after ||
      youthNomineeAt(campaign, after).prospectId === id) return career;
  const next = academy.prospects.find(p => p.id === id && p.age < 21);
  if (!next) return career;
  const rotation = { after, prospectId: next.id, name: next.name };
  return { ...career, academy: { ...academy, youthTeam: { ...team,
    campaign: { ...campaign, rotations: [...(campaign.rotations ?? []), rotation] } } } };
}

// Called on the engine's own match copy, once the senior league result is final.
export function playYouthFixture(career: CareerState, round: number, opponent: string): void {
  const academy = career.academy;
  const team = academy?.youthTeam;
  const campaign = team?.campaign;
  if (!campaign || team.club !== career.clubName || campaign.fixtures.length >= YOUTH_MATCHES ||
      campaign.fixtures.some(m => m.season === career.season && m.round === round)) return;
  const nominee = youthNomineeAt(campaign, campaign.fixtures.length);
  const prospect = academy.prospects.find(p => p.id === nominee.prospectId && p.age < 21);
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
