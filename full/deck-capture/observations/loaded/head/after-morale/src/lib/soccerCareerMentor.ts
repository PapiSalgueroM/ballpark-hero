import type { CareerState, SeasonRecord } from './soccerCareerEngine';
import { familyFor, intlName } from './intlNames';

export type CareerMentorStatus = 'active' | 'paused' | 'ended' | 'graduated';
export type CareerMentorReason = 'season' | 'few-apps' | 'serious-injury' | 'banned' | 'prison' | 'club-move';
export interface CareerMentorSeason {
  year: number;
  club: string;
  age: number;
  progress: number;
  status: CareerMentorStatus;
  reason: CareerMentorReason;
}
export interface CareerMentor {
  generated: true;
  name: string;
  position: string;
  club: string;
  startYear: number;
  lastYear: number;
  age: number;
  progress: number;
  status: CareerMentorStatus;
  endReason?: 'club-move' | 'retirement';
  history: CareerMentorSeason[];
}

const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const STATUSES: readonly string[] = ['active', 'paused', 'ended', 'graduated'];
const REASONS: readonly string[] = ['season', 'few-apps', 'serious-injury', 'banned', 'prison', 'club-move'];
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
const words = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/** Release AT: a damaged saved mentor is no mentorship at all.
 *  The other three fields this train saves (the season target, the preseason plan, the smaller role) are
 *  validated where they are read. This one was spread as it stood, so a save whose mentor was a number, a
 *  string, an empty object or a mentor without its history threw inside the season ("mentor.history is not
 *  iterable") and the year could never be recorded, and one with a made up status was treated as live.
 *  Every reader goes through here now: the three functions below, the Youth Mentor card and the tile.
 *  repairCareer also drops a damaged one when a save loads, the way Rounds 972 and 1041 drop theirs. */
export function validMentor(value: unknown): CareerMentor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const m = value as Partial<CareerMentor>;
  if (m.generated !== true || !words(m.name) || !words(m.position) || !words(m.club)) return null;
  if (!whole(m.startYear) || !whole(m.lastYear) || !whole(m.age) || !whole(m.progress) || m.progress < 0 || m.progress > 3) return null;
  if (!STATUSES.includes(m.status as string)) return null;
  if (m.endReason !== undefined && m.endReason !== 'club-move' && m.endReason !== 'retirement') return null;
  if (!Array.isArray(m.history)) return null;
  for (const entry of m.history as unknown[]) {
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as Partial<CareerMentorSeason>;
    if (!whole(e.year) || !words(e.club) || !whole(e.age) || !whole(e.progress)
      || !STATUSES.includes(e.status as string) || !REASONS.includes(e.reason as string)) return null;
  }
  return value as CareerMentor;
}

/** A private draw never advances the career engine's random stream. */
function mentorDraw(key: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < key.length; i++) seed = Math.imul(seed ^ key.charCodeAt(i), 16777619);
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
}

/** One saved fictional player for this career, including after the spell ends. */
export function createCareerMentor(state: CareerState): CareerState {
  const lastYear = state.seasons[state.seasons.length - 1]?.year;
  if (validMentor(state.mentor) || state.retired || !state.currentClub || YEAR_OUT.includes(state.currentClub)
    || typeof lastYear !== 'number' || !Number.isInteger(lastYear)) return state;
  const startYear = lastYear + 1;
  const draw = mentorDraw(`${state.playerName}|${state.nationality}|${state.currentClub}|${startYear}`);
  const family = familyFor(state.nationality);
  const poolSize = family.firsts.length * family.lasts.length;
  const firstIndex = draw() % poolSize;
  let name = intlName(state.nationality, firstIndex);
  for (let i = 1; i < poolSize && (name === state.playerName || name === state.rival?.name); i++) {
    name = intlName(state.nationality, firstIndex + i);
  }
  const mentor: CareerMentor = {
    generated: true, name, position: POSITIONS[draw() % POSITIONS.length], club: state.currentClub,
    startYear, lastYear, age: 16, progress: 0, status: 'active', history: [],
  };
  return { ...state, mentor, events: [...state.events,
    `🤝 Started academy mentorship with generated player ${name} at ${mentor.club}.`] };
}

/** Only a newly appended senior season can advance or pause the saved spell. */
export function recordMentorSeason(state: CareerState, row: SeasonRecord): CareerState {
  const mentor = validMentor(state.mentor);
  if (!mentor || mentor.status === 'ended' || mentor.status === 'graduated' || row.type !== 'playing'
    || !state.seasons.includes(row) || row.year <= mentor.lastYear || row.year < mentor.startYear) return state;
  const reason: CareerMentorReason = row.club === 'PRISON' || row.club === 'CONVICTED' ? 'prison'
    : YEAR_OUT.includes(row.club) ? 'banned'
      : row.club !== mentor.club ? 'club-move'
        : row.injurySevere ? 'serious-injury' : !(row.apps >= 10) ? 'few-apps' : 'season';
  const progress = mentor.progress + (reason === 'season' ? 1 : 0);
  const status: CareerMentorStatus = reason === 'club-move' ? 'ended'
    : reason !== 'season' ? 'paused' : progress === 3 ? 'graduated' : 'active';
  const age = 16 + row.year - mentor.startYear + 1;
  const entry: CareerMentorSeason = { year: row.year, club: row.club, age, progress, status, reason };
  const nextMentor: CareerMentor = { ...mentor, lastYear: row.year, age, progress, status,
    ...(reason === 'club-move' ? { endReason: 'club-move' as const } : {}), history: [...mentor.history, entry] };
  const detail = status === 'graduated' ? 'completed three mentoring seasons'
    : status === 'ended' ? 'shared-club mentorship ended after your move'
      : status === 'paused' ? 'mentorship paused for this saved season'
        : `completed mentoring season ${progress} of 3`;
  return { ...state, mentor: nextMentor,
    events: [...state.events, `🤝 Generated academy player ${mentor.name}: ${detail} (${row.year}).`] };
}

/** A transfer or loan ends this spell immediately, without inventing a season. */
export function endCareerMentorForMove(state: CareerState, destination: string): CareerState {
  const mentor = validMentor(state.mentor);
  if (!mentor || mentor.status === 'ended' || mentor.status === 'graduated' || destination === mentor.club) return state;
  return { ...state, mentor: { ...mentor, status: 'ended', endReason: 'club-move' }, events: [...state.events,
    `🤝 Shared-club mentorship with generated player ${mentor.name} ended when you left ${mentor.club}.`] };
}

/** Retirement closes the saved spell without claiming another mentoring year. */
export function endCareerMentorForRetirement(state: CareerState): CareerState {
  const mentor = validMentor(state.mentor);
  if (!mentor || mentor.status === 'ended' || mentor.status === 'graduated') return state;
  return { ...state, mentor: { ...mentor, status: 'ended', endReason: 'retirement' }, events: [...state.events,
    `🤝 Academy mentorship with generated player ${mentor.name} ended when you retired from playing.`] };
}
