import { groupOf, type CareerState, type CMPlayer, type LiveMatch } from './clubManager';

export const MENTORING_GAMES = 4;
export const MENTORING_MINUTES = 120;

interface NamedPlayer { id: string; name: string }
interface MentoringMatch { round: number; opponent: string; minutes: number }
export interface AcademyMentoring {
  club: string;
  season: number;
  graduate: NamedPlayer;
  mentor: NamedPlayer;
  matches: MentoringMatch[];
  gain: 0 | 1;
}

export function academyGraduates(career: CareerState) {
  return career.squad.filter(p => p.academyGrad && p.age <= 21 && p.position !== 'GK' && !p.onLoan);
}

export function academyMentors(career: CareerState, graduate: CMPlayer) {
  return career.squad.filter(p => p.age >= 27 && !p.onLoan && groupOf(p.position) === groupOf(graduate.position));
}

export function canStartMentoring(c: CareerState): boolean {
  const previous = c.academy?.mentoring;
  return !!c.academy && !c.retired && !c.sacked && !c.wilderness && !c.live && !c.pendingSummary
    && !(previous?.club === c.clubName && previous.season === c.season)
    && c.calendar.slice(c.week).filter(entry => entry.type === 'league').length >= MENTORING_GAMES;
}

export function startMentoring(c: CareerState, club: string, season: number, graduateId: string, mentorId: string): CareerState | null {
  if (club !== c.clubName || season !== c.season || !canStartMentoring(c) || !c.academy) return null;
  const graduate = academyGraduates(c).find(p => p.id === graduateId);
  const mentor = graduate && academyMentors(c, graduate).find(p => p.id === mentorId);
  if (!graduate || !mentor) return null;
  const named = ({ id, name }: CMPlayer) => ({ id, name });
  return { ...c, academy: { ...c.academy, mentoring: {
    club, season, graduate: named(graduate), mentor: named(mentor), matches: [], gain: 0,
  } } };
}

type MatchSheet = Pick<LiveMatch, 'startXi' | 'subs' | 'h1Cards' | 'h2Cards' | 'h1Injuries' | 'h2Injuries'>;

function stint(sheet: MatchSheet, id: string): [number, number] {
  const cameOn = sheet.startXi.includes(id) ? 0 : sheet.subs?.find(s => s.onId === id)?.minute;
  if (cameOn === undefined) return [0, 0];
  const off = sheet.subs?.find(s => s.offId === id)?.minute ?? 90;
  const dismissals = [...(sheet.h1Cards ?? []), ...(sheet.h2Cards ?? [])].filter(c => c.id === id && c.kind === 'red');
  const injuries = [...(sheet.h1Injuries ?? []), ...(sheet.h2Injuries ?? [])].filter(p => p.id === id);
  return [cameOn, Math.min(90, off, ...dismissals.map(c => c.minute), ...injuries.map(p => p.minute))];
}

export function recordMentoringMatch(c: CareerState, round: number, opponent: string, sheet: MatchSheet): string | undefined {
  const plan = c.academy?.mentoring;
  if (!plan || plan.club !== c.clubName || plan.season !== c.season || plan.matches.length >= MENTORING_GAMES
    || plan.matches.some(m => m.round === round)) return;
  const graduate = c.squad.find(p => p.id === plan.graduate.id && p.name === plan.graduate.name && p.academyGrad);
  const mentor = c.squad.find(p => p.id === plan.mentor.id && p.name === plan.mentor.name);
  const [gradOn, gradOff] = graduate ? stint(sheet, graduate.id) : [0, 0];
  const [mentorOn, mentorOff] = mentor ? stint(sheet, mentor.id) : [0, 0];
  const minutes = Math.max(0, Math.min(gradOff, mentorOff) - Math.max(gradOn, mentorOn));
  plan.matches.push({ round, opponent, minutes });
  if (plan.matches.length !== MENTORING_GAMES) return;
  const total = plan.matches.reduce((sum, m) => sum + m.minutes, 0);
  if (graduate && graduate.rating < (graduate.potential ?? graduate.rating) && total >= MENTORING_MINUTES) {
    graduate.rating++;
    plan.gain = 1;
  }
  const outcome = plan.gain ? 'earned +1 OVR' : 'finished without a rating point';
  return `Academy mentoring complete. ${plan.graduate.name} ${outcome} after ${total} shared league minutes with ${plan.mentor.name}.`;
}

export function restoreMentoring(c: CareerState): void {
  const academy = c.academy;
  const p = academy?.mentoring;
  if (!academy || p === undefined) return;
  if (!p || p.club !== c.clubName || !Number.isSafeInteger(p.season) || p.season > c.season
    || ![p.graduate, p.mentor].every(x => x && typeof x.name === 'string' && typeof x.id === 'string')
    || p.graduate.id === p.mentor.id || !Array.isArray(p.matches) || p.matches.length > MENTORING_GAMES
    || !p.matches.every(m => m && Number.isSafeInteger(m.round) && typeof m.opponent === 'string'
      && Number.isInteger(m.minutes) && m.minutes >= 0 && m.minutes <= 90)
    || new Set(p.matches.map(m => m.round)).size !== p.matches.length || ![0, 1].includes(p.gain)
    || (p.gain === 1 && (p.matches.length !== MENTORING_GAMES
      || p.matches.reduce((sum, m) => sum + m.minutes, 0) < MENTORING_MINUTES))) delete academy.mentoring;
}
