import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';

export const NRL_CLUB_COLOURS = {
  teal: '#0f766e', blue: '#1d4ed8', purple: '#7e22ce', red: '#b91c1c',
} as const;

export interface NrlCustomClub {
  slotId: string;
  name: string;
  ground: string;
  colour: keyof typeof NRL_CLUB_COLOURS;
}

const clubText = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .’'&-]*$/u;
const identityKey = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function nrlCustomClubIssue({ name, ground, colour }: Pick<NrlCustomClub, 'name' | 'ground' | 'colour'>): string | null {
  if (name.length < 3 || name.length > 26 || !clubText.test(name)) return 'Enter a club name with 3 to 26 characters.';
  const key = identityKey(name);
  if (nrlSeasonPlan(2027).clubs.some(club => [identityKey(club.name), identityKey(club.shortName)].includes(key))
    || key === 'pngchiefs' || key === 'chiefs') return 'Choose a fictional name distinct from the clubs already in the competition.';
  if (ground.length < 3 || ground.length > 40 || !clubText.test(ground)) return 'Enter a home ground name with 3 to 40 characters.';
  if (!Object.prototype.hasOwnProperty.call(NRL_CLUB_COLOURS, colour)) return 'Choose one of the listed club colours.';
  return null;
}

export function isNrlCustomClub(value: unknown): value is NrlCustomClub {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 4) return false;
  const club = value as Partial<NrlCustomClub>;
  return typeof club.slotId === 'string' && typeof club.name === 'string' && typeof club.ground === 'string'
    && typeof club.colour === 'string' && club.name.trim() === club.name && club.ground.trim() === club.ground
    && nrlCustomClubIssue({ name: club.name, ground: club.ground, colour: club.colour }) === null;
}

export function nrlClubName(year: number, id: string, custom?: NrlCustomClub, label: 'short' | 'full' = 'short') {
  if (custom?.slotId === id) return custom.name;
  const club = nrlSeasonPlan(year).clubs.find(team => team.id === id);
  return (label === 'full' ? club?.name : club?.shortName) ?? id;
}
