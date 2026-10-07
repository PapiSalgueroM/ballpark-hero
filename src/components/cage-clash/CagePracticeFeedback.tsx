import { CAGE_DRILLS, type CagePractice } from '@/lib/cagePractice';

export function cagePracticeFeedback(practice: CagePractice) {
  const { fight, drill, recoveredGuard } = practice;
  const { player } = fight;
  let progress: string;
  let instruction: string;
  let earned: boolean;
  if (drill === 'striking') {
    progress = `Shots ${Math.min(3, player.hits)}/3 · Gas ${Math.floor(player.stamina)}/100`;
    instruction = player.hits >= 3 ? 'Shots done. Release to reach 90 gas.' : 'Get close and land 3 shots.';
    earned = player.hits >= 3 && player.stamina >= 90;
  } else if (drill === 'takedown') {
    const onTop = fight.position === 'ground' && fight.top === 'player';
    progress = `Takedowns ${Math.min(1, player.takedowns)}/1 · ${onTop ? 'You on top' : fight.position === 'clinch' ? 'In clinch' : 'No top position'}`;
    instruction = fight.position === 'clinch' ? 'Clinch set. Use Takedown.' : fight.position === 'standing' ? 'Move close and use Clinch.' : 'Earn a takedown from the clinch.';
    earned = player.takedowns > 0 && onTop;
  } else if (drill === 'escape') {
    const onFeet = recoveredGuard && fight.position === 'standing';
    progress = `Guard ${recoveredGuard ? 1 : 0}/1 · Back on feet ${onFeet ? 1 : 0}/1`;
    instruction = recoveredGuard ? 'Guard earned. Use Stand up.' : 'Use Regain guard until full Guard.';
    earned = onFeet;
  } else {
    progress = `Your pressure ${Math.floor(player.submission)}% · ${['Guard', 'Half guard', 'Mount'][fight.groundLevel]}`;
    instruction = player.posture ? 'Use Lower posture, then hold Submit.' : 'Hold Submit. Passing improves pressure.';
    earned = fight.phase === 'finished' && fight.result?.winner === 'player' && fight.result.method === 'Submission';
  }
  const complete = practice.complete && earned;
  if (complete) instruction = 'Drill complete. Retry or move on.';
  else if (fight.phase === 'finished') instruction = 'Attempt ended. Retry this drill.';
  return { progress, instruction, message: fight.message, complete };
}

export function CagePracticeFeedback({ practice }: { practice: CagePractice }) {
  const feedback = cagePracticeFeedback(practice);
  const awaitingAttempt = feedback.message === CAGE_DRILLS.find(drill => drill.id === practice.drill)!.objective;
  return <div data-cage-practice-feedback={practice.drill} data-cage-feedback-complete={feedback.complete ? 'true' : 'false'} data-cage-message={practice.fight.message} data-cage-recovered-guard={practice.recoveredGuard ? 'true' : 'false'} className="grid h-[72px] grid-rows-[16px_16px_32px] rounded-md bg-muted/50 px-2 py-1 text-xs leading-4">
    <p data-cage-practice-progress className="font-semibold tabular-nums text-blue-700 dark:text-blue-300">{feedback.progress}</p>
    <p data-cage-practice-status role="status" aria-live="polite" aria-atomic="true" className="font-medium">{feedback.instruction}</p>
    <p data-cage-practice-message className="text-muted-foreground">{awaitingAttempt ? 'No attempt yet.' : `Last: ${feedback.message}`}</p>
  </div>;
}
