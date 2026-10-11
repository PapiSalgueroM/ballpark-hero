import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export type SoccerPressChoice = 'calm' | 'accountable' | 'ambitious';
export type SoccerPressTopic = 'league_champion' | 'injury' | 'benched' | 'move' | 'strong_form' | 'discipline' | 'contract' | 'normal';
export interface SoccerPressSource {
  index: number; year: number; club: string; position: string; statLine: string;
  apps: number; goals: number | null; assists: number | null; cleanSheets: number | null; rating: number | null;
}
export interface SoccerPressPromise {
  club: string; label: string; metric: 'apps' | 'goals' | 'assists' | 'cleanSheets'; target: number; ratingFloor?: 7;
  outcome: 'pending' | 'met' | 'missed' | 'moved' | 'excused';
  actual?: number; actualRating?: number; settledYear?: number; settledIndex?: number;
}
export interface SoccerPressHistory {
  source: SoccerPressSource; topic: SoccerPressTopic; question: string; answer: string;
  choice: SoccerPressChoice; promise?: SoccerPressPromise;
}
export interface SoccerPressState { version: 1; credibility: number; history: SoccerPressHistory[] }
export interface SoccerPressOption {
  id: SoccerPressChoice; label: string; effect: string; tradeoff: string; eligible: boolean; reason?: string;
}
export interface PressRoomView {
  eligible: boolean; reason: string | null; source: SoccerPressSource | null; topic: SoccerPressTopic | null;
  question: string; options: SoccerPressOption[]; history: SoccerPressHistory[]; credibility: number;
  promise: SoccerPressPromise | null;
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
const BACKS = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const CREATORS = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
const CHOICES: SoccerPressChoice[] = ['calm', 'accountable', 'ambitious'];
const TOPICS: SoccerPressTopic[] = ['league_champion', 'injury', 'benched', 'move', 'strong_form', 'discipline', 'contract', 'normal'];
const OUT_CLUBS = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const rating = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10;
const meter = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const recorded = (v: unknown) => count(v) ? v : null;
const copyHistory = (row: SoccerPressHistory): SoccerPressHistory => ({ ...row, source: { ...row.source }, ...(row.promise ? { promise: { ...row.promise } } : {}) });

function promiseFor(source: SoccerPressSource, club: string): SoccerPressPromise | null {
  if (!text(club) || OUT_CLUBS.includes(club)) return null;
  let metric: SoccerPressPromise['metric'], target: number, label: string;
  if (source.position === 'GK') {
    if (source.cleanSheets === null) return null;
    metric = 'cleanSheets'; target = Math.max(12, source.cleanSheets + 2); label = `${target} clean sheets`;
  } else if (BACKS.includes(source.position)) {
    metric = 'apps'; target = Math.min(38, Math.max(24, source.apps + 2)); label = `${target} appearances and a 7.0 average rating`;
  } else if (CREATORS.includes(source.position)) {
    if (source.assists === null) return null;
    metric = 'assists'; target = Math.max(10, source.assists + 2); label = `${target} assists`;
  } else {
    if (source.goals === null) return null;
    metric = 'goals'; target = Math.max(15, source.goals + 3); label = `${target} goals`;
  }
  if (!count(target)) return null;
  return { club, label: `At least ${label} in your next played year at ${club}.`, metric, target,
    ...(BACKS.includes(source.position) ? { ratingFloor: 7 as const } : {}), outcome: 'pending' };
}

function outcomeFor(promise: SoccerPressPromise, row: SeasonRecord): SoccerPressPromise['outcome'] {
  const actual = recorded(row[promise.metric]);
  if (!count(row.apps) || row.apps === 0 || row.injurySevere === true || OUT_CLUBS.includes(row.club)) return 'excused';
  if (row.club !== promise.club) return 'moved';
  if (actual === null || promise.ratingFloor !== undefined && !rating(row.rating)) return 'excused';
  return actual >= promise.target && (promise.ratingFloor === undefined || row.rating >= promise.ratingFloor) ? 'met' : 'missed';
}

function validSource(source: SoccerPressSource, career: CareerState): boolean {
  if (!source || !count(source.index) || !count(source.year) || source.year === 0 || !text(source.club) || !POSITIONS.includes(source.position) || !text(source.statLine) || !count(source.apps) || source.apps === 0) return false;
  if (![source.goals, source.assists, source.cleanSheets].every(v => v === null || count(v)) || !(source.rating === null || rating(source.rating))) return false;
  const row = career.seasons[source.index];
  return !!row && row.type === 'playing' && row.year === source.year && row.club === source.club && row.apps === source.apps
    && recorded(row.goals) === source.goals && recorded(row.assists) === source.assists && recorded(row.cleanSheets) === source.cleanSheets
    && (rating(row.rating) ? row.rating : null) === source.rating;
}

function stateOf(career: CareerState): SoccerPressState | null {
  const state = career.pressRoom;
  if (!state || state.version !== 1 || !count(state.credibility) || state.credibility > 100 || !Array.isArray(state.history)) return null;
  const identities = new Set<number>(); let pending = 0;
  for (const row of state.history) {
    if (!row || !validSource(row.source, career) || !TOPICS.includes(row.topic) || !text(row.question) || !text(row.answer) || !CHOICES.includes(row.choice) || identities.has(row.source.index)) return null;
    identities.add(row.source.index);
    if (row.choice === 'ambitious') {
      const p = row.promise, target = p ? promiseFor(row.source, p.club) : null;
      if (!p || !target || p.label !== target.label || p.metric !== target.metric || p.target !== target.target || p.ratingFloor !== target.ratingFloor || !['pending', 'met', 'missed', 'moved', 'excused'].includes(p.outcome)) return null;
      if (p.actual !== undefined && !count(p.actual) || p.actualRating !== undefined && !rating(p.actualRating)) return null;
      if (p.outcome === 'pending') {
        pending += 1;
        if (p.settledYear !== undefined || p.settledIndex !== undefined || p.actual !== undefined || p.actualRating !== undefined) return null;
      } else {
        const settled = count(p.settledIndex) ? career.seasons[p.settledIndex] : null;
        if (!settled || settled.type !== 'playing' || settled.year !== p.settledYear || settled.year <= row.source.year || p.settledIndex! <= row.source.index) return null;
        if (p.outcome !== outcomeFor(p, settled) || p.actual !== (recorded(settled[p.metric]) ?? undefined) || p.actualRating !== (rating(settled.rating) ? settled.rating : undefined)) return null;
      }
    } else if (row.promise !== undefined) return null;
  }
  return pending <= 1 ? state : null;
}

function sourceOf(career: CareerState): SoccerPressSource | null {
  let index = career.seasons.length - 1;
  while (index >= 0 && career.seasons[index].type !== 'playing') index -= 1;
  const row = career.seasons[index];
  if (!row || !count(row.year) || row.year === 0 || !text(row.club) || OUT_CLUBS.includes(row.club) || !count(row.apps) || row.apps === 0 || !POSITIONS.includes(career.position)) return null;
  const source: SoccerPressSource = { index, year: row.year, club: row.club, position: career.position, statLine: '', apps: row.apps,
    goals: recorded(row.goals), assists: recorded(row.assists), cleanSheets: recorded(row.cleanSheets), rating: rating(row.rating) ? row.rating : null };
  const number = source.position === 'GK' ? source.cleanSheets : BACKS.includes(source.position) ? source.rating : CREATORS.includes(source.position) ? source.assists : source.goals;
  const label = source.position === 'GK' ? 'clean sheets' : BACKS.includes(source.position) ? 'average rating' : CREATORS.includes(source.position) ? 'assists' : 'goals';
  source.statLine = `${source.apps} appearances, ${number === null ? `${label} not recorded` : `${BACKS.includes(source.position) ? number.toFixed(1) : number} ${label}`}.`;
  return source;
}

function topicOf(career: CareerState, source: SoccerPressSource): SoccerPressTopic {
  const row = career.seasons[source.index];
  const earlier = career.seasons.slice(0, source.index).filter(s => s.type === 'playing' && !OUT_CLUBS.includes(s.club));
  const previous = earlier[earlier.length - 1];
  if (row.leagueTitle === true) return 'league_champion';
  if (row.injurySevere === true || text(row.injury)) return 'injury';
  if (source.apps < 15) return 'benched';
  if (career.currentClub !== source.club || previous && previous.club !== source.club) return 'move';
  if (count(row.redCards) && row.redCards > 0 || count(row.suspensionMatches) && row.suspensionMatches > 0) return 'discipline';
  if (source.apps >= 10 && source.rating !== null && source.rating >= 7.5) return 'strong_form';
  if (count(career.contractYearsLeft) && career.contractYearsLeft <= 1) return 'contract';
  return 'normal';
}

const QUESTIONS: Record<SoccerPressTopic, [string, string, string]> = {
  league_champion: ['A league title, and another year ahead. How do you want to sum it up?', 'You finished the year as a league champion. What are you taking into the next one?', 'There is a league title to look back on. What comes next for you?'],
  injury: ['An injury was part of this year. What are you taking into the next one?', 'This season included an injury. How do you feel about the year?', 'You had an injury to deal with. What do you want to say about next season?'],
  benched: ['Fewer than 15 appearances. How do you feel about your role?', 'You played fewer than 15 times this year. What comes next for you?', 'Your appearance count stayed below 15. What do you want to say about your place in the team?'],
  move: ['Your club story has changed. How do you look back on this year?', 'A change of club is part of your story now. What are you taking forward?', 'You have a club move to talk about. How do you want to sum up the season?'],
  strong_form: ['That was a strong average rating. What comes next?', 'Your rating finished at 7.5 or better. What are you aiming for next year?', 'You have a strong season rating behind you. What do you want to say about the next one?'],
  discipline: ['A red card or suspension was part of this year. What is your response?', 'There is a discipline record to talk about. What are you taking into next season?', 'This year included a red card or served suspension. How do you want to address it?'],
  contract: ['One year or less on your deal. What do you want to say about your future?', 'Your current deal has at most a year left. What comes next for you?', 'There is one year or less remaining on your contract. How do you feel about the future?'],
  normal: ['How do you want to sum up the season?', 'Another year is behind you. What are you taking into the next one?', 'What do you want to say about this year and what comes next?'],
};

export function pressRoomView(career: CareerState): PressRoomView {
  const source = sourceOf(career), state = stateOf(career), invalid = career.pressRoom !== undefined && !state;
  const history = state ? state.history.slice().reverse().map(copyHistory) : [];
  const topic = source ? topicOf(career, source) : null;
  const lead = source ? [`Looking back at ${source.year} at ${source.club}.`, `Your ${source.year} record at ${source.club} is in.`, `About that ${source.year} season at ${source.club}.`][source.year % 3] : '';
  const question = source && topic ? `${lead} ${source.statLine} ${QUESTIONS[topic][source.year % 3]}` : 'Finish a senior club season with appearances to open the Press Room.';
  const reason = invalid ? 'The saved Press Room record could not be verified.' : career.retired || career.phase !== 'playing' ? 'Answer on the playing screen between seasons.'
    : !source ? 'A recorded senior club season with appearances is needed.' : !meter(career.popularity) || !meter(career.morale) ? 'The saved popularity or morale could not be verified.'
    : state?.history.some(h => h.source.index === source.index) ? 'You already answered for this saved season.' : null;
  const target = source ? promiseFor(source, career.currentClub) : null, pending = history.some(h => h.promise?.outcome === 'pending');
  const options: SoccerPressOption[] = [
    { id: 'calm', label: 'Keep it calm', effect: 'Morale +3.', tradeoff: 'Popularity -2.', eligible: !reason },
    { id: 'accountable', label: 'Own your season', effect: 'Popularity +3, media credibility +2.', tradeoff: 'Morale -3.', eligible: !reason },
    { id: 'ambitious', label: 'Make a public promise', effect: target?.label ?? 'The required saved performance figure is missing.',
      tradeoff: 'Morale -4 now. Met: popularity +6, morale +3, credibility +8. Missed: popularity -6, morale -3, credibility -8. A move or an interrupted year ends it without a verdict.',
      eligible: !reason && !!target && !pending, ...(!target || pending ? { reason: pending ? 'An earlier public promise is still waiting for a recorded year.' : 'The position-specific saved figure is missing.' } : {}) },
  ];
  return { eligible: !reason, reason, source, topic, question, options, history, credibility: state?.credibility ?? 50, promise: history.find(h => h.promise)?.promise ?? null };
}

export function answerSoccerPress(prev: CareerState, choiceId: string): CareerState {
  const view = pressRoomView(prev), option = view.options.find(o => o.id === choiceId);
  if (!view.eligible || !option?.eligible || !view.source || !view.topic) return prev;
  const state = stateOf(prev), row: SoccerPressHistory = { source: { ...view.source }, topic: view.topic, question: view.question, answer: option.label, choice: option.id };
  if (option.id === 'ambitious') row.promise = promiseFor(view.source, prev.currentClub)!;
  return { ...prev, popularity: clamp(prev.popularity + (option.id === 'calm' ? -2 : option.id === 'accountable' ? 3 : 0)),
    morale: clamp(prev.morale + (option.id === 'calm' ? 3 : option.id === 'accountable' ? -3 : -4)),
    pressRoom: { version: 1, credibility: clamp((state?.credibility ?? 50) + (option.id === 'accountable' ? 2 : 0)), history: [...(state?.history ?? []), row] } };
}

/** Called only after the engine has placed the actual row in seasons. */
export function settleSoccerPress(career: CareerState, row: SeasonRecord): void {
  const state = stateOf(career), index = career.seasons.indexOf(row);
  if (!state || index < 0 || row.type !== 'playing' || !count(row.year) || !meter(career.popularity) || !meter(career.morale)) return;
  const at = state.history.findIndex(h => h.promise?.outcome === 'pending' && index > h.source.index && row.year > h.source.year);
  if (at < 0) return;
  const held = state.history[at], promise = { ...held.promise! }, actual = recorded(row[promise.metric]);
  promise.outcome = outcomeFor(promise, row);
  if (actual !== null) promise.actual = actual;
  if (rating(row.rating)) promise.actualRating = row.rating;
  promise.settledYear = row.year; promise.settledIndex = index;
  const swing = promise.outcome === 'met' ? 1 : promise.outcome === 'missed' ? -1 : 0;
  const history = state.history.map((h, i) => i === at ? { ...h, source: { ...h.source }, promise } : h);
  career.pressRoom = { version: 1, credibility: clamp(state.credibility + swing * 8), history };
  career.popularity = clamp(career.popularity + swing * 6);
  career.morale = clamp(career.morale + swing * 3);
}
