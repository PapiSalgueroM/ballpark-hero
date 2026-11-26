import type { CareerState, SeasonRecord } from './soccerCareerEngine';

const PROJECT_IDS = ['street-league', 'match-lab', 'players-council', 'fan-radio'] as const;
export type CareerProjectId = typeof PROJECT_IDS[number];
export type CareerProjectChoiceId = string;

type Goal =
  | { kind: 'apps'; minimumApps: number }
  | { kind: 'rating'; minimumApps: number; minimumRating: number }
  | { kind: 'fair-play'; minimumApps: number; maximumYellows: number };

type Effects = { morale?: number; popularity?: number };

interface Choice {
  id: CareerProjectChoiceId;
  title: string;
  description: string;
  goal: Goal;
  success: Effects;
  miss?: Effects;
}

interface Chapter {
  title: string;
  description: string;
  choices: readonly [Choice, Choice];
}

interface Project {
  title: string;
  description: string;
  chapters: readonly Chapter[];
}

const apps = (minimumApps: number): Goal => ({ kind: 'apps', minimumApps });
const rating = (minimumApps: number, minimumRating: number): Goal => ({ kind: 'rating', minimumApps, minimumRating });
const fairPlay = (minimumApps: number, maximumYellows: number): Goal => ({ kind: 'fair-play', minimumApps, maximumYellows });

const PROJECTS: Record<CareerProjectId, Project> = {
  'street-league': {
    title: 'Street League',
    description: 'Turn a neighborhood kickabout into a tournament people come back for.',
    chapters: [
      {
        title: 'Open the gates', description: 'Decide who gets the first slots on a borrowed pitch.',
        choices: [
          { id: 'open-signups', title: 'Open signups', description: 'Keep the first event small and make room for new teams.', goal: apps(8), success: { morale: 2 } },
          { id: 'showcase', title: 'Host a showcase', description: 'Build the launch around your own name.', goal: rating(8, 6.8), success: { popularity: 4 }, miss: { popularity: -1 } },
        ],
      },
      {
        title: 'Make it weekly', description: 'Decide how the league will fill a regular set of fixtures.',
        choices: [
          { id: 'volunteer-crew', title: 'Train a volunteer crew', description: 'Share the work and keep the calendar dependable.', goal: apps(14), success: { morale: 3 } },
          { id: 'fair-play-league', title: 'Run a fair-play league', description: 'Set the standard through your own discipline on the pitch.', goal: fairPlay(14, 4), success: { popularity: 4 }, miss: { morale: -1 } },
        ],
      },
      {
        title: 'Finals night', description: 'Give the teams their first season finale.',
        choices: [
          { id: 'festival', title: 'Hold a neighborhood festival', description: 'Leave room for teams returning next year.', goal: apps(20), success: { morale: 3, popularity: 1 } },
          { id: 'headline-final', title: 'Put on a headline final', description: 'Promise a bigger audience for the teams.', goal: rating(20, 7), success: { popularity: 5 }, miss: { popularity: -2 } },
        ],
      },
    ],
  },
  'match-lab': {
    title: 'Match Lab',
    description: 'Build a tactical workshop from the patterns you see in your own matches.',
    chapters: [
      {
        title: 'Start a match notebook', description: 'Pick how to gather your first set of examples.',
        choices: [
          { id: 'keep-notes', title: 'Keep weekly notes', description: 'Build a useful sample across the season.', goal: apps(10), success: { morale: 2 } },
          { id: 'film-review', title: 'Review your own game film', description: 'Make the first study about raising your level.', goal: rating(8, 6.7), success: { morale: 4 }, miss: { morale: -1 } },
        ],
      },
      {
        title: 'Build a clip library', description: 'Choose the next subject for the workshop.',
        choices: [
          { id: 'patterns', title: 'Collect common patterns', description: 'Find examples that hold across a run of fixtures.', goal: apps(16), success: { morale: 3 } },
          { id: 'calm-under-pressure', title: 'Study play under pressure', description: 'Use your own discipline as the test.', goal: fairPlay(14, 3), success: { morale: 4 }, miss: { morale: -1 } },
        ],
      },
      {
        title: 'Open the workshop', description: 'Decide who should get the finished material first.',
        choices: [
          { id: 'small-workshop', title: 'Teach a small group', description: 'Put your best ideas to work in a quieter room.', goal: rating(16, 6.7), success: { morale: 4 } },
          { id: 'public-playbook', title: 'Publish the playbook', description: 'Put your season’s work in front of a wider audience.', goal: rating(20, 7), success: { morale: 2, popularity: 3 }, miss: { popularity: -2 } },
        ],
      },
    ],
  },
  'players-council': {
    title: 'Players’ Council',
    description: 'Represent players and take a practical proposal from the dressing room to a vote.',
    chapters: [
      {
        title: 'Earn a seat', description: 'Build trust by being around the squad and setting an example.',
        choices: [
          { id: 'roundtable', title: 'Start a roundtable', description: 'Give the squad a regular place to raise problems.', goal: apps(10), success: { morale: 2 } },
          { id: 'standards', title: 'Lead on standards', description: 'Make discipline the first thing you ask of yourself.', goal: fairPlay(10, 3), success: { morale: 3 }, miss: { morale: -1 } },
        ],
      },
      {
        title: 'Choose a proposal', description: 'Spend your time on one change the squad can actually try.',
        choices: [
          { id: 'travel', title: 'Improve away travel', description: 'Use a steady run of matches to collect feedback.', goal: apps(16), success: { morale: 3 } },
          { id: 'return-to-play', title: 'Back a return-to-play plan', description: 'Put safer reintegration on the agenda.', goal: fairPlay(16, 4), success: { morale: 4, popularity: 1 }, miss: { morale: -1 } },
        ],
      },
      {
        title: 'Bring it to a vote', description: 'Choose how to make the case when the season ends.',
        choices: [
          { id: 'closed-vote', title: 'Make a case to the squad', description: 'Ask for a decision behind closed doors.', goal: apps(22), success: { morale: 4 } },
          { id: 'wider-vote', title: 'Present it on a bigger stage', description: 'Put your performance on the line in public.', goal: rating(18, 6.9), success: { morale: 2, popularity: 3 }, miss: { morale: -2 } },
        ],
      },
    ],
  },
  'fan-radio': {
    title: 'Fan Radio',
    description: 'Make a football radio show with its own format, regulars, and finale.',
    chapters: [
      {
        title: 'Record a pilot', description: 'Decide what listeners will come back to hear.',
        choices: [
          { id: 'matchday-journal', title: 'Make a matchday journal', description: 'Tell small stories on a reliable schedule.', goal: apps(8), success: { popularity: 2 } },
          { id: 'analysis-show', title: 'Lead with match analysis', description: 'Ask listeners to judge the work against your performances.', goal: rating(8, 6.8), success: { popularity: 4 }, miss: { popularity: -1 } },
        ],
      },
      {
        title: 'Find regular listeners', description: 'Take the show beyond its first episode.',
        choices: [
          { id: 'listener-mail', title: 'Answer listener questions', description: 'Set a weekly slot after matches.', goal: apps(14), success: { popularity: 3 } },
          { id: 'supporter-debate', title: 'Host a supporter debate', description: 'Keep your cool on the pitch and on the microphone.', goal: fairPlay(14, 3), success: { popularity: 4, morale: 1 }, miss: { popularity: -1 } },
        ],
      },
      {
        title: 'Make a season special', description: 'Pick how you want to conclude the first series.',
        choices: [
          { id: 'season-tape', title: 'Edit a season retrospective', description: 'Let the full season tell the story.', goal: apps(22), success: { popularity: 3, morale: 1 } },
          { id: 'live-special', title: 'Present a live special', description: 'Put the biggest audience alongside your toughest target.', goal: rating(20, 7), success: { popularity: 5 }, miss: { popularity: -2 } },
        ],
      },
    ],
  },
};

interface Commitment {
  projectId: CareerProjectId;
  chapter: number;
  choiceId: CareerProjectChoiceId;
  fromYear: number;
}

interface SeasonEvidence {
  apps: number;
  rating: number;
  yellowCards: number;
  redCards: number;
}

interface Receipt extends Commitment {
  year: number;
  evidence: SeasonEvidence;
  effects: Effects;
}

export interface CareerProjects {
  progress: Partial<Record<CareerProjectId, number>>;
  pending?: Commitment;
  receipts?: Receipt[];
}

type ProjectCareer = Pick<CareerState, 'phase' | 'retired' | 'seasons' | 'morale' | 'popularity'> & {
  careerProjects?: CareerProjects;
};

const HISTORY_LIMIT = 12;
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const count = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const yearNumber = (x: unknown): x is number => count(x) && x > 0 && x < 10000;
const projectId = (x: unknown): x is CareerProjectId => PROJECT_IDS.some(id => id === x);

function readCommitment(raw: unknown): Commitment | undefined {
  if (!object(raw) || !projectId(raw.projectId) || !count(raw.chapter)
    || typeof raw.choiceId !== 'string' || !yearNumber(raw.fromYear)) return undefined;
  const chapter = PROJECTS[raw.projectId].chapters[raw.chapter];
  if (!chapter?.choices.some(choice => choice.id === raw.choiceId)) return undefined;
  return { projectId: raw.projectId, chapter: raw.chapter, choiceId: raw.choiceId, fromYear: raw.fromYear };
}

function readEvidence(raw: unknown): SeasonEvidence | undefined {
  if (!object(raw) || !count(raw.apps) || raw.apps < 1 || !count(raw.yellowCards) || !count(raw.redCards)
    || typeof raw.rating !== 'number' || !Number.isFinite(raw.rating) || raw.rating < 0 || raw.rating > 10) return undefined;
  return { apps: raw.apps, rating: raw.rating, yellowCards: raw.yellowCards, redCards: raw.redCards };
}

function choiceFor(commitment: Commitment): Choice {
  return PROJECTS[commitment.projectId].chapters[commitment.chapter].choices.find(choice => choice.id === commitment.choiceId)!;
}

function meetsGoal(goal: Goal, evidence: SeasonEvidence): boolean {
  if (evidence.apps < goal.minimumApps) return false;
  if (goal.kind === 'rating') return evidence.rating >= goal.minimumRating;
  if (goal.kind === 'fair-play') return evidence.yellowCards <= goal.maximumYellows && evidence.redCards === 0;
  return true;
}

function readEffects(raw: unknown, expected: Effects): Effects {
  if (!object(raw)) return {};
  const result: Effects = {};
  for (const name of ['morale', 'popularity'] as const) {
    const value = raw[name];
    const limit = expected[name] ?? 0;
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0
      && value >= Math.min(0, limit) && value <= Math.max(0, limit)) result[name] = value;
  }
  return result;
}

function readReceipt(raw: unknown): Receipt | undefined {
  const commitment = readCommitment(raw);
  if (!commitment || !object(raw) || !yearNumber(raw.year) || raw.year < commitment.fromYear) return undefined;
  const evidence = readEvidence(raw.evidence);
  if (!evidence) return undefined;
  const choice = choiceFor(commitment);
  const expected = meetsGoal(choice.goal, evidence) ? choice.success : choice.miss ?? {};
  return { ...commitment, year: raw.year, evidence, effects: readEffects(raw.effects, expected) };
}

/** Existing saves have no project state. Ignore unknown IDs, invalid chapters and duplicate receipts. */
export function normalizeCareerProjects(raw: unknown, latestRecordedYear?: number): CareerProjects | undefined {
  if (!object(raw)) return undefined;
  const latest = yearNumber(latestRecordedYear) ? latestRecordedYear : undefined;
  const progress: CareerProjects['progress'] = {};
  if (object(raw.progress)) {
    for (const id of PROJECT_IDS) {
      const completed = raw.progress[id];
      if (count(completed) && completed > 0 && completed <= PROJECTS[id].chapters.length) progress[id] = completed;
    }
  }

  const receipts: Receipt[] = [];
  const recordedYears = new Set<number>();
  if (Array.isArray(raw.receipts)) {
    for (const candidate of raw.receipts.slice(0, HISTORY_LIMIT)) {
      const receipt = readReceipt(candidate);
      if (!receipt || (latest !== undefined && receipt.year > latest) || recordedYears.has(receipt.year)) continue;
      recordedYears.add(receipt.year);
      receipts.push(receipt);
    }
    receipts.sort((a, b) => b.year - a.year);
  }

  const pending = readCommitment(raw.pending);
  const livePending = pending && pending.chapter === (progress[pending.projectId] ?? 0)
    && (latest === undefined || pending.fromYear <= latest + 1)
    && pending.fromYear > (receipts[0]?.year ?? 0) ? pending : undefined;
  if (Object.keys(progress).length === 0 && receipts.length === 0 && !livePending) return undefined;
  return { progress, ...(livePending ? { pending: livePending } : {}), ...(receipts.length ? { receipts } : {}) };
}

function nextSeasonYear(career: ProjectCareer): number | undefined {
  const year = career.seasons.at(-1)?.year;
  return yearNumber(year) && yearNumber(year + 1) ? year + 1 : undefined;
}

function readyToChoose(career: ProjectCareer, projects: CareerProjects | undefined, nextYear: number | undefined): boolean {
  return career.phase === 'playing' && !career.retired && nextYear !== undefined
    && !projects?.pending && PROJECT_IDS.some(id => (projects?.progress[id] ?? 0) < PROJECTS[id].chapters.length);
}

export function chooseCareerProject<T extends ProjectCareer>(career: T, id: CareerProjectId, choiceId: CareerProjectChoiceId): T {
  const projects = normalizeCareerProjects(career.careerProjects, career.seasons.at(-1)?.year);
  const nextYear = nextSeasonYear(career);
  if (!projectId(id) || !readyToChoose(career, projects, nextYear) || nextYear === undefined) return career;
  const chapter = projects?.progress[id] ?? 0;
  if (!PROJECTS[id].chapters[chapter]?.choices.some(choice => choice.id === choiceId)) return career;
  const pending = { projectId: id, chapter, choiceId, fromYear: nextYear };
  return { ...career, careerProjects: { progress: {}, ...projects, pending } };
}

/** Settle against the career's recorded row. A skipped year leaves the commitment in place. */
export function resolveCareerProject<T extends ProjectCareer>(career: T, season: SeasonRecord): T {
  const recorded = career.seasons.at(-1);
  const projects = normalizeCareerProjects(career.careerProjects, recorded?.year);
  const pending = projects?.pending;
  if (!projects || !pending || !recorded || recorded.type !== 'playing' || !yearNumber(recorded.year)
    || recorded.year !== season.year || recorded.year < pending.fromYear) return career;
  const evidence = readEvidence(recorded);
  if (!evidence) return career;

  const choice = choiceFor(pending);
  const completed = meetsGoal(choice.goal, evidence);
  const wanted = completed ? choice.success : choice.miss ?? {};
  const morale = boundedEffect(career.morale, wanted.morale);
  const popularity = boundedEffect(career.popularity, wanted.popularity);
  const effects: Effects = { ...(morale ? { morale } : {}), ...(popularity ? { popularity } : {}) };
  const receipt: Receipt = { ...pending, year: recorded.year, evidence, effects };
  const progress = completed ? { ...projects.progress, [pending.projectId]: pending.chapter + 1 } : projects.progress;
  return {
    ...career, morale: career.morale + morale, popularity: career.popularity + popularity,
    careerProjects: { progress, receipts: [receipt, ...(projects.receipts ?? [])].slice(0, HISTORY_LIMIT) },
  };
}

function boundedEffect(current: number, delta: number | undefined): number {
  if (!delta || !Number.isFinite(current) || current < 0 || current > 100) return 0;
  return Math.max(-current, Math.min(delta, 100 - current));
}

function goalLabel(goal: Goal): string {
  const available = `${goal.minimumApps}+ appearances`;
  if (goal.kind === 'rating') return `${available} and a ${goal.minimumRating.toFixed(1)} average rating`;
  if (goal.kind === 'fair-play') return `${available}, at most ${goal.maximumYellows} yellows and no reds`;
  return available;
}

function effectLabel(effect: Effects): string {
  const labels = (['morale', 'popularity'] as const).flatMap(name => {
    const change = Number((effect[name] ?? 0).toFixed(2));
    return change ? [`${name === 'morale' ? 'Morale' : 'Popularity'} ${change > 0 ? '+' : ''}${change}`] : [];
  });
  return labels.length ? labels.join(', ') : 'No change to morale or popularity';
}

function choiceView(choice: Choice) {
  return {
    id: choice.id, title: choice.title, description: choice.description, goalLabel: goalLabel(choice.goal),
    successLabel: effectLabel(choice.success), missLabel: effectLabel(choice.miss ?? {}),
  };
}

export interface CareerProjectResult {
  year: number;
  projectTitle: string;
  chapterTitle: string;
  choiceTitle: string;
  goalLabel: string;
  actualLabel: string;
  outcome: 'completed' | 'missed';
  effectLabel: string;
}

function resultView(receipt: Receipt): CareerProjectResult {
  const project = PROJECTS[receipt.projectId];
  const choice = choiceFor(receipt);
  const { evidence } = receipt;
  const appearances = `${evidence.apps} ${evidence.apps === 1 ? 'appearance' : 'appearances'}`;
  const actualLabel = choice.goal.kind === 'rating' ? `${appearances}, ${evidence.rating.toFixed(2)} average rating`
    : choice.goal.kind === 'fair-play' ? `${appearances}, ${evidence.yellowCards} yellows, ${evidence.redCards} reds`
      : appearances;
  return {
    year: receipt.year, projectTitle: project.title, chapterTitle: project.chapters[receipt.chapter].title, choiceTitle: choice.title,
    goalLabel: goalLabel(choice.goal), actualLabel, outcome: meetsGoal(choice.goal, evidence) ? 'completed' : 'missed',
    effectLabel: effectLabel(receipt.effects),
  };
}

export function getCareerProjectsView(career: ProjectCareer) {
  const saved = normalizeCareerProjects(career.careerProjects, career.seasons.at(-1)?.year);
  const nextYear = nextSeasonYear(career);
  const pending = saved?.pending;
  const history = (saved?.receipts ?? []).map(resultView);
  return {
    projects: PROJECT_IDS.map(id => {
      const project = PROJECTS[id];
      const completed = saved?.progress[id] ?? 0;
      const chapter = project.chapters[completed];
      return {
        id, title: project.title, description: project.description, completed, total: project.chapters.length,
        chapter: chapter ? { number: completed + 1, title: chapter.title, description: chapter.description, choices: chapter.choices.map(choiceView) } : null,
      };
    }),
    pending: pending ? {
      projectId: pending.projectId, projectTitle: PROJECTS[pending.projectId].title, chapterNumber: pending.chapter + 1,
      chapterTitle: PROJECTS[pending.projectId].chapters[pending.chapter].title, choice: choiceView(choiceFor(pending)), fromYear: pending.fromYear,
    } : null,
    lastResult: history[0] ?? null,
    history,
    canChoose: readyToChoose(career, saved, nextYear),
  };
}
