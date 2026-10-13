import type { CareerState, EventChoice, RandomEvent } from './soccerCareerEngine';

type Skill = keyof CareerState['statBoostNextSeason'];
type Effect = { morale?: number; popularity?: number; integrityBonus?: number; skill?: Skill };
type Option = [label: string, effect: Effect];
type Routine = { id: number; title: string; description: string; options: [Option, Option] };
const work = (skill: Skill): Effect => ({ skill, morale: -1 });
const rest: Effect = { morale: 2 };
const privateTime: Effect = { morale: 2, popularity: -1 };
const publicTime: Effect = { popularity: 2, morale: -1 };
const responsibility: Effect = { integrityBonus: 2, morale: -1 };

const ROUTINES: Routine[] = [
  { id: 600, title: 'A few more passing reps', description: 'A coach can set aside a short passing block before next season. You could also use that time to switch off.',
    options: [['Book the passing block', work('passing')], ['Keep the time free', rest]] },
  { id: 601, title: 'The video notebook', description: 'The analyst offers a session on reading defensive situations before next season. It takes an afternoon you had kept free.',
    options: [['Work through the clips', work('defending')], ['Take the afternoon off', rest]] },
  { id: 602, title: 'First touch homework', description: 'Staff have a first touch drill ready for your next training block. Extra work or a proper break: both take time.',
    options: [['Add the touch drills', work('dribbling')], ['Leave the break alone', rest]] },
  { id: 603, title: 'The sprint workshop', description: 'The conditioning coach offers a short technique block before next season. You would have less time to yourself.',
    options: [['Book the sprint work', work('pace')], ['Keep your free time', rest]] },
  { id: 604, title: 'Keeper catching work', description: 'The goalkeeping coach has space for extra handling practice before next season. The other option is a quiet break.',
    options: [['Take the handling slot', work('reflexes')], ['Protect the break', rest]] },
  { id: 605, title: 'Planning the away trips', description: 'Staff are planning next season\'s travel routine. You can keep journey time quiet or use part of it for passing clips.',
    options: [['Ask for quiet journey time', privateTime], ['Set aside time for clips', work('passing')]] },
  { id: 606, title: 'After the journey', description: 'The community team asks whether you would be available after a future away trip. A short appearance means less time to unwind.',
    options: [['Keep that time private', privateTime], ['Make time for the appearance', publicTime]] },
  { id: 607, title: 'The travel meal plan', description: 'Club staff offer a structured meal routine for your next training block. Following it takes some effort and organisation.',
    options: [['Follow the structured routine', work('physical')], ['Keep the break relaxed', rest]] },
  { id: 608, title: 'Notes for the journey', description: 'An analyst wants help putting together passing clips for next season\'s journeys. You could study them or help organise the folder.',
    options: [['Study the passing clips', work('passing')], ['Help organise the folder', { morale: 1, integrityBonus: 1 }]] },
  { id: 609, title: 'Time to call home', description: 'You are setting boundaries for your next busy period. More private time or a little more public contact?',
    options: [['Save the time for home', privateTime], ['Keep a short public check in', { popularity: 1, morale: 1 }]] },
  { id: 610, title: 'Defensive details', description: 'A coach offers extra work on defensive positioning before next season. Taking it means giving up part of your break.',
    options: [['Book the defensive review', work('defending')], ['Take the time off', rest]] },
  { id: 611, title: 'Checking in with the parent club', description: 'You are on loan. Staff suggest a proper update for the parent club, or you can keep the time free for yourself.',
    options: [['Prepare the update', { integrityBonus: 1, morale: -1 }], ['Keep the time to yourself', rest]] },
  { id: 612, title: 'Getting to know the loan club', description: 'The loan club\'s community staff offer a local appearance. It is a chance to be seen, but it takes a free afternoon.',
    options: [['Join the local appearance', publicTime], ['Keep the afternoon free', rest]] },
  { id: 613, title: 'Receiving between the lines', description: 'The coaching team offers a midfield passing review for your next training block. You could take it or protect your downtime.',
    options: [['Take the midfield review', work('passing')], ['Protect the downtime', rest]] },
  { id: 614, title: 'A captain\'s spare afternoon', description: 'You hold this club\'s armband. Staff ask for help organising a squad meeting before the next season.',
    options: [['Help organise the meeting', responsibility], ['Keep the afternoon private', privateTime]] },
  { id: 615, title: 'A frustrating year', description: 'Your recorded appearances were limited and morale is low. A coach offers extra work before next season, or time to clear your head.',
    options: [['Book an extra conditioning block', work('physical')], ['Take time to reset', rest]] },
  { id: 616, title: 'Finishing homework', description: 'The attacking coach offers extra finishing work before next season. Taking the slot costs some downtime.',
    options: [['Take the finishing slot', work('shooting')], ['Keep the downtime', rest]] },
  { id: 617, title: 'Helping a training partner', description: 'Staff ask for a hand organising a small training group. Helping means giving up some time you had kept private.',
    options: [['Help organise the group', responsibility], ['Keep your own time', privateTime]] },
  { id: 618, title: 'Getting the kit ready', description: 'The kit staff ask you to send your requirements early for the next training block. A small job now or a little more free time?',
    options: [['Send everything early', { integrityBonus: 1, morale: 1 }], ['Leave the job for later', { morale: 2, integrityBonus: -1 }]] },
  { id: 619, title: 'Captain media duty', description: 'The press officer offers a short captain\'s appearance. You could front it or help prepare the notes behind the scenes.',
    options: [['Front the appearance', publicTime], ['Help prepare the notes', { integrityBonus: 1, morale: 1 }]] },
  { id: 620, title: 'Space for a family visit', description: 'You are planning your time before next season. A private visit home would use the same time as an optional conditioning block.',
    options: [['Keep the visit private', privateTime], ['Take the conditioning block', work('physical')]] },
  { id: 621, title: 'The break routine', description: 'Staff ask for an early outline of your break plans. Organising it now is a small responsibility; leaving it gives you more free time.',
    options: [['Get the outline done', { integrityBonus: 1, morale: 1 }], ['Leave the planning for later', { morale: 2, integrityBonus: -1 }]] },
  { id: 622, title: 'The commercial afternoon', description: 'Commercial staff offer a short appearance slot. It would take up a free afternoon you could keep for yourself.',
    options: [['Take the appearance slot', publicTime], ['Keep the afternoon private', privateTime]] },
  { id: 623, title: 'A quieter phone', description: 'You can set aside more private time during the break or make yourself available for a short public update.',
    options: [['Keep the break quieter', privateTime], ['Make time for the update', publicTime]] },
  { id: 624, title: 'The cool down routine', description: 'The conditioning staff offer a structured routine for the next training block. It asks for time and attention outside the main session.',
    options: [['Commit to the routine', work('physical')], ['Keep that time free', rest]] },
  { id: 625, title: 'Looking back at an injury year', description: 'Your saved season records an injury. Staff offer a passing review while you plan the next training block, or a quieter break.',
    options: [['Take the passing review', work('passing')], ['Take the quieter break', rest]] },
  { id: 626, title: 'A veteran\'s warm up', description: 'The conditioning team offers an extra preparation block before next season. You could commit the time or keep a proper break.',
    options: [['Book the preparation block', work('physical')], ['Keep the break free', rest]] },
  { id: 627, title: 'Reviewing your touch', description: 'A coach offers a short technical review before next season. It means more work during time you had set aside to relax.',
    options: [['Take the technical review', work('dribbling')], ['Keep the time to relax', rest]] },
  { id: 628, title: 'Meeting the new club', description: 'Your current club differs from the last club you played for. Community staff offer an introduction before the next season.',
    options: [['Join the introduction', publicTime], ['Take time to settle privately', rest]] },
  { id: 629, title: 'The family calendar', description: 'You have children recorded in your career. Family planning and an optional conditioning block are competing for your free time.',
    options: [['Help organise the family calendar', { integrityBonus: 1, morale: 1 }], ['Take the conditioning block', work('physical')]] },
];

const signed = (n: number) => n > 0 ? `+${n}` : String(n);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
function choice(routine: Routine, [label, effect]: Option): EventChoice {
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
        events: [...state.events, `📋 ${routine.title}: ${label}. ${consequence}.`],
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
  return ROUTINES.filter(routine => pending.has(routine.id) || (Math.floor((routine.id - 600) / 5) === group && fits(routine.id, state)))
    .map<RandomEvent>(routine => ({ id: routine.id, emoji: '📋', title: routine.title, description: routine.description,
      category: 'life', choices: routine.options.map(option => choice(routine, option)) }));
}
