import { finals, finalsSource, teamAliases, type PilotSport } from '@/data/sportChallengePilot';
import { dailyIndex, dailyPrngSeed, getEasternDayRange, getTodayET, shuffledRange } from './dateUtils';
import { foldSpecialLatin } from './nameFold';

export type { PilotSport };
export type PilotMode = 'daily' | 'practice';
export interface PilotPrompt {
  id: string;
  text: string;
  points: number;
  finalists: string[];
  sourceUrl: string;
}
export interface PilotRun {
  version: 1;
  sport: PilotSport;
  mode: PilotMode;
  day: string;
  startedAt: number;
  deadline: number;
  order: string[];
  answers: Array<{promptId: string; answerId: string; points: number}>;
  deferred: boolean;
  deferredAt: number | null;
  completed: boolean;
}
type PilotAction = {type: 'answer'; text: string} | {type: 'tick'} | {type: 'defer'};

function promptFor(sport: PilotSport, year: number) {
  switch (sport) {
    case 'soccer': return `Name either country in the ${year} men's World Cup final.`;
    case 'nba': return `Name either team in the ${year} NBA Finals.`;
    case 'nfl': return `Name either team in the Super Bowl played in ${year}.`;
  }
}

function questions(sport: PilotSport): PilotPrompt[] {
  return finals[sport].map(([year, points, first, second]) => ({
    id: String(year), points, finalists: [first, second], sourceUrl: finalsSource(sport, year),
    text: promptFor(sport, year),
  }));
}

function pairs<T>(items: T[]) {
  return items.flatMap((item, i) => items.slice(i + 1).map(other => [item, other]));
}

const boardCache = new Map<PilotSport, string[][]>();
function boards(sport: PilotSport) {
  const saved = boardCache.get(sport);
  if (saved) return saved;
  const bank = questions(sport);
  const [easy, medium, hard] = [10, 15, 20].map(points => pairs(bank.filter(q => q.points === points)));
  const deals: string[][] = [];
  for (const early of easy) {
    for (const middle of medium) {
      for (const late of hard) {
        const deal = [...early, ...middle, ...late];
        // Every prompt retains a finalist that no other prompt can consume.
        if (deal.every(q => q.finalists.some(team => deal.every(other => other === q || !other.finalists.includes(team))))) {
          deals.push(deal.map(q => q.id));
        }
      }
    }
  }
  boardCache.set(sport, deals);
  return deals;
}

export function pilotStorageKey(sport: PilotSport, mode: PilotMode) {
  return `dukb-finals-v1-${sport}-${mode}`;
}

export function createPilotRun(sport: PilotSport, mode: PilotMode, now: number): PilotRun {
  const day = getTodayET(new Date(now));
  const label = `${pilotStorageKey(sport, mode)}-${mode === 'daily' ? day : now}`;
  const pool = boards(sport);
  const index = mode === 'daily' ? dailyIndex(day, pool.length) : (dailyPrngSeed(label) >>> 0) % pool.length;
  const deal = pool[index];
  const deadline = mode === 'daily' ? Math.min(now + 60000, Date.parse(getEasternDayRange(day).end)) : now + 60000;
  return {
    version: 1, sport, mode, day, startedAt: now, deadline,
    order: shuffledRange(deal.length, label).map(i => deal[i]),
    answers: [], deferred: false, deferredAt: null, completed: false,
  };
}

export function currentPilotPrompt(run: PilotRun) {
  if (run.completed) return undefined;
  return questions(run.sport).find(q => q.id === run.order[run.answers.length]);
}

function fold(text: string) {
  return foldSpecialLatin(text.toLowerCase()).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function accepts(team: string, input: string, sport: PilotSport) {
  const names = [team, ...(teamAliases[team] ?? [])];
  if (sport !== 'soccer') {
    const words = team.split(' ');
    names.push(words[words.length - 1]);
    const city = words.slice(0, -1).join(' ');
    if (city !== 'Los Angeles' && city !== 'New York') names.push(city);
  }
  return names.some(name => fold(name) === input);
}

export function updatePilotRun(run: PilotRun, action: PilotAction, now: number): {run: PilotRun; feedback: string} {
  if (run.completed) return { run, feedback: 'Round complete.' };
  if (now >= run.deadline) return { run: {...run, completed: true}, feedback: 'Time is up.' };
  if (action.type === 'tick') return {run, feedback: ''};
  const index = run.answers.length;
  if (action.type === 'defer') {
    if (run.deferred || index >= run.order.length - 1) return {run, feedback: 'No defer available.'};
    const order = [...run.order];
    order.push(...order.splice(index, 1));
    return {run: {...run, order, deferred: true, deferredAt: index}, feedback: 'Saved that question for last.'};
  }
  const prompt = currentPilotPrompt(run)!;
  const input = fold(action.text);
  if (!input) return {run, feedback: 'Enter a team first.'};
  const team = prompt.finalists.find(name => accepts(name, input, run.sport));
  if (!team) return {run, feedback: 'Try another team.'};
  if (run.answers.some(a => a.answerId === team)) return {run, feedback: 'You already used that team.'};
  const answers = [...run.answers, {promptId: prompt.id, answerId: team, points: prompt.points}];
  return {run: {...run, answers, completed: answers.length === run.order.length}, feedback: `${team} earns ${prompt.points} points.`};
}

export function pilotScore(run: PilotRun) {
  return run.answers.reduce((sum, a) => sum + a.points, 0) + (run.answers.length === 6 ? 10 : 0);
}

export function pilotRecap(run: PilotRun) {
  if (!run.completed) return [];
  const bank = questions(run.sport);
  return run.order.map(id => {
    const q = bank.find(item => item.id === id)!;
    const accepted = run.answers.find(a => a.promptId === id);
    return {prompt: q.text, answer: accepted?.answerId ?? null, points: accepted?.points ?? 0, sourceUrl: q.sourceUrl, finalists: q.finalists};
  });
}

// Rebuild from the frozen edition. Never trust a saved score, deadline or answer list.
export function readPilotRun(raw: string | null, sport: PilotSport, mode: PilotMode, now: number): PilotRun | null {
  if (!raw) return null;
  try {
    const record: PilotRun = JSON.parse(raw);
    if (record?.version !== 1 || record.sport !== sport || record.mode !== mode ||
      !Number.isSafeInteger(record.startedAt) || record.startedAt > now || !Array.isArray(record.answers) ||
      record.answers.length > 6 || (mode === 'daily' && record.day !== getTodayET(new Date(now)))) return null;
    let restored = createPilotRun(sport, mode, record.startedAt);
    for (let i = 0; i <= record.answers.length; i++) {
      if (record.deferredAt === i) restored = updatePilotRun(restored, {type: 'defer'}, record.startedAt).run;
      if (i === record.answers.length) break;
      const saved = record.answers[i];
      if (typeof saved?.answerId !== 'string' || currentPilotPrompt(restored)?.id !== saved.promptId) return null;
      const next = updatePilotRun(restored, {type: 'answer', text: saved.answerId}, record.startedAt).run;
      if (next === restored) return null;
      restored = next;
    }
    if (restored.day !== record.day || restored.deferredAt !== record.deferredAt ||
      JSON.stringify(restored.order) !== JSON.stringify(record.order)) return null;
    // Once a timeout has been observed it stays settled if the device clock moves back.
    if (record.completed === true) restored = {...restored, completed: true};
    return updatePilotRun(restored, {type: 'tick'}, now).run;
  } catch {
    return null;
  }
}
