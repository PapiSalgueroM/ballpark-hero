import type { CareerState, EventChoice, RandomEvent } from './soccerCareerEngine';

type Skill = keyof CareerState['statBoostNextSeason'];
type Effect = { morale?: number; popularity?: number; integrityBonus?: number; skill?: Skill };
type Option = [label: string, effect: Effect];
type Routine = [id: number, title: string, description: string, first: Option, second?: Option];
const work = (skill: Skill): Option => ['Book extra work', { skill, morale: -1 }];
const rest: Option = ['Take a break', { morale: 2 }];
const privateTime: Option = ['Keep it private', { morale: 2, popularity: -1 }];
const publicTime: Option = ['Make the appearance', { popularity: 2, morale: -1 }];
const responsibility: Option = ['Help organise', { integrityBonus: 2, morale: -1 }];
const details: Option = ['Get it organised', { integrityBonus: 1, morale: 1 }];
const later: Option = ['Leave it for later', { morale: 2, integrityBonus: -1 }];
const training = 'Book work for next season, or protect your break.';

const ROUTINES: Routine[] = [
  [600, 'A few more passing reps', training, work('passing')],
  [601, 'The video notebook', 'Review defensive clips before next season, or take a break.', work('defending')],
  [602, 'First touch homework', training, work('dribbling')],
  [603, 'The sprint workshop', training, work('pace')],
  [604, 'Keeper catching work', training, work('reflexes')],
  [605, 'Planning the away trips', 'Keep journeys quiet, or study passing clips for next season.', privateTime, work('passing')],
  [606, 'After the journey', 'The community team offers an appearance after an away trip.', privateTime, publicTime],
  [607, 'The travel meal plan', 'Follow a meal routine for the next training block, or relax.', work('physical')],
  [608, 'Notes for the journey', 'Study passing clips for next season, or organise the folder.', work('passing'), details],
  [609, 'Time to call home', 'More private time, or a short public check in?', privateTime, ['Keep in touch', { popularity: 1, morale: 1 }]],
  [610, 'Defensive details', training, work('defending')],
  [611, 'Checking in with the parent club', 'A loan update takes time you could keep free.', ['Prepare the update', { integrityBonus: 1, morale: -1 }]],
  [612, 'Getting to know the loan club', 'Your loan club offers a local appearance during your break.', publicTime],
  [613, 'Receiving between the lines', 'Review midfield passing before next season, or take a break.', work('passing')],
  [614, 'A captain\'s spare afternoon', 'Help organise a squad meeting, or keep a quiet afternoon.', responsibility, privateTime],
  [615, 'A frustrating year', `Limited appearances and low morale. ${training}`, work('physical')],
  [616, 'Finishing homework', training, work('shooting')],
  [617, 'Helping a training partner', 'Staff need help organising a small training group.', responsibility, privateTime],
  [618, 'Getting the kit ready', 'Send your kit requirements early, or leave the job for later.', details, later],
  [619, 'Captain media duty', 'Front a captain\'s appearance, or prepare the notes.', publicTime, details],
  [620, 'Space for a family visit', 'Visit home, or book conditioning work for next season.', privateTime, work('physical')],
  [621, 'The break routine', 'Staff need an outline of your break plans.', details, later],
  [622, 'The commercial afternoon', 'Commercial staff offer an appearance during your break.', publicTime, privateTime],
  [623, 'A quieter phone', 'Keep the break private, or make a short public update.', privateTime, publicTime],
  [624, 'The cool down routine', training, work('physical')],
  [625, 'Looking back at an injury year', 'Your last season records an injury. Plan passing work for next season, or take a break.', work('passing')],
  [626, 'A veteran\'s warm up', training, work('physical')],
  [627, 'Reviewing your touch', training, work('dribbling')],
  [628, 'Meeting the new club', 'Your new club offers a community introduction.', publicTime],
  [629, 'The family calendar', 'Plan time with your children, or book conditioning work for next season.', details, work('physical')],
];

const signed = (n: number) => n > 0 ? `+${n}` : String(n);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
function choice(title: string, [label, effect]: Option): EventChoice {
  const changes: string[] = [];
  if (effect.morale) changes.push(`Morale ${signed(effect.morale)}`);
  if (effect.popularity) changes.push(`Popularity ${signed(effect.popularity)}`);
  if (effect.integrityBonus) changes.push(`Integrity ${signed(effect.integrityBonus)}`);
  if (effect.skill) changes.push(`${effect.skill[0].toUpperCase()}${effect.skill.slice(1)} +1 next season`);
  const consequence = changes.join(', ');
  return { label, emoji: effect.skill ? '📋' : '🤝', color: effect.skill ? 'bg-blue-600' : 'bg-emerald-600', consequence,
    apply: state => {
      const next = { ...state,
        morale: clamp(state.morale + (effect.morale ?? 0)),
        popularity: clamp(state.popularity + (effect.popularity ?? 0)),
        integrityBonus: state.integrityBonus + (effect.integrityBonus ?? 0),
        events: [...state.events, `📋 ${title}: ${label}. ${consequence}.`],
      };
      if (effect.skill) next.statBoostNextSeason = { ...state.statBoostNextSeason, [effect.skill]: (state.statBoostNextSeason[effect.skill] ?? 0) + 1 };
      return next;
    } };
}

function fits(id: number, state: CareerState): boolean {
  const last = state.seasons[state.seasons.length - 1];
  switch (id) {
    case 604: return state.position === 'GK';
    case 610: return ['CB', 'LB', 'RB'].includes(state.position);
    case 613: return ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(state.position);
    case 616: return ['ST', 'CF', 'LW', 'RW'].includes(state.position);
    case 611: case 612: return !!state.loan && !!state.loan.parentClub && state.loan.parentClub !== state.currentClub;
    case 614: case 619: return state.isClubCaptain === true && state.captainClub === state.currentClub;
    case 615: return last.club === state.currentClub && last.apps <= 12 && state.morale < 70;
    case 625: return !!last.injury && (last.injuryWeeks ?? 0) > 0;
    case 626: return state.age >= 30;
    case 628: return last.club !== state.currentClub;
    case 629: return (state.family?.children ?? 0) > 0;
    default: return true;
  }
}

export function getSoccerRoutineEvents(state: CareerState): RandomEvent[] {
  const last = state.seasons[state.seasons.length - 1];
  let group = -1;
  if (!state.retired && state.age >= 17 && state.currentClub.trim() && last?.type === 'playing' && last.apps > 0 && Number.isFinite(last.year)) {
    const identity = `${state.playerName}|${state.nationality}|${state.position}`;
    let code = 0;
    for (let i = 0; i < identity.length; i++) code = (Math.imul(code, 31) + identity.charCodeAt(i)) | 0;
    group = ((Math.floor(last.year) + code) % 6 + 6) % 6;
  }
  // Saved cards resolve by ID even when an earlier answer changes a fresh gate.
  const pending = new Set(state.pendingEvents.map(event => event.id));
  return ROUTINES.filter(([id]) => pending.has(id) || (Math.floor((id - 600) / 5) === group && fits(id, state)))
    .map<RandomEvent>(([id, title, description, first, second = rest]) => ({ id, emoji: '📋', title, description,
      category: 'life', choices: [first, second].map(option => choice(title, option)) }));
}
