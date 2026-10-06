import { CAGE_ROUND_TICKS, createCageFight, stepCageFight, type CageFight, type CageInput, type CageStyle } from './cageClash';

export type CageDrill = 'striking' | 'takedown' | 'submission' | 'escape';
export const CAGE_DRILLS: { id: CageDrill; title: string; objective: string; example: string }[] = [
  { id: 'striking', title: 'Strike and recover', objective: 'Land 3 shots, then recover to 90 gas.', example: 'Move close and land three shots. Then release every control, including Guard, to recover.' },
  { id: 'takedown', title: 'Earn a takedown', objective: 'Clinch, then take your partner down.', example: 'Use Clinch, release, then use Takedown. If it is defended, recover and try again.' },
  { id: 'submission', title: 'Find a submission', objective: 'Build submission pressure to a finish.', example: 'You start on top. Pass guard for a better position, then hold Submit with enough gas.' },
  { id: 'escape', title: 'Escape from mount', objective: 'Regain guard, then return to your feet.', example: 'Use Regain guard until you reach Guard, then Stand up. Release to recover between tries.' },
];
export interface CagePractice { drill: CageDrill; fight: CageFight; complete: boolean; recoveredGuard: boolean }
const partner: CageInput = { move: 0, guard: false, action: null };

export function createCagePractice(drill: CageDrill, style: CageStyle, seed: number): CagePractice {
  const fight = createCageFight(style, 'balanced', seed);
  if (drill !== 'striking') { fight.player.x = 40; fight.cpu.x = 48; }
  if (drill === 'submission' || drill === 'escape') {
    fight.position = 'ground'; fight.top = drill === 'submission' ? 'player' : 'cpu';
    fight.groundLevel = drill === 'escape' ? 2 : 0;
  }
  fight.message = CAGE_DRILLS.find(item => item.id === drill)!.objective;
  return { drill, fight, complete: false, recoveredGuard: false };
}
export function stepCagePractice(state: CagePractice, input: CageInput): CagePractice {
  if (state.complete || state.fight.phase === 'finished') return state;
  const action = input.action && canCagePracticeAction(state, input.action) ? input.action : null;
  const fight = stepCageFight({ ...state.fight, remainingTicks: CAGE_ROUND_TICKS }, { ...input, action }, partner);
  const recoveredGuard = state.recoveredGuard || (state.drill === 'escape' && fight.position === 'ground' && fight.groundLevel === 0);
  const complete = state.drill === 'striking' ? fight.player.hits >= 3 && fight.player.stamina >= 90
    : state.drill === 'takedown' ? fight.player.takedowns > 0 && fight.position === 'ground' && fight.top === 'player'
    : state.drill === 'submission' ? fight.result?.winner === 'player' && fight.result.method === 'Submission'
    : recoveredGuard && fight.position === 'standing';
  return { ...state, fight, recoveredGuard, complete };
}
export function canCagePracticeAction(state: CagePractice, action: CageInput['action']): boolean {
  if (!action || state.complete) return false;
  if (state.drill === 'striking') return state.fight.player.hits < 3 && ['jab', 'power', 'kick'].includes(action);
  if (state.drill === 'takedown') return action === 'grapple';
  if (state.drill === 'submission') return ['grapple', 'kick', 'submit'].includes(action);
  return action === 'kick' || (action === 'escape' && state.recoveredGuard);
}
export function nextCageDrill(drill: CageDrill): CageDrill | null {
  return CAGE_DRILLS[CAGE_DRILLS.findIndex(item => item.id === drill) + 1]?.id ?? null;
}
