import { useState } from 'react';
import { minuteLabel, type PlayEvent } from '@/lib/clubManager';
import { isPhaseMove, readPhaseHistory, type PhaseMove, type PhaseStep } from '@/lib/clubManagerPhaseShapes';
import { PHASE_SHAPE_NAMES, PhasePositionMap } from './PhaseShapePicker';
import { MadeUpTag } from './SquadScreen';

type PhaseEvent = PlayEvent & { phaseMove: PhaseMove };

const named = (person: { name: string; generated?: boolean }) => <>
  {person.name}{person.generated && <MadeUpTag className="ml-1" />}
</>;

function MoveLine({ move }: { move: PhaseMove }) {
  const actor = named(move.actor), opponent = named(move.other);
  switch (move.outcome) {
    case 'retained': return <>{actor} held the outlet under pressure from {opponent}.</>;
    case 'released': return <>{actor} got the outlet past {opponent}.</>;
    case 'intercepted': return <>{opponent} cut out the pass to {actor}.</>;
    case 'screened': return <>{actor} blocked the passing lane to {opponent}.</>;
    case 'regained': return <>{actor} won the pass meant for {opponent}.</>;
    case 'bypassed': return <>{opponent} received beyond {actor}.</>;
  }
}

export function PhaseShapeReview({ play, history, live = false }: {
  play: readonly PlayEvent[];
  history?: readonly PhaseStep[];
  live?: boolean;
}) {
  const [decision, setDecision] = useState(0);
  const [shape, setShape] = useState(0);
  const moves = play.filter((event): event is PhaseEvent =>
    event.kind === 'shot' && isPhaseMove(event.phaseMove));
  const changes = readPhaseHistory(history);
  if (!moves.length && (!changes.length || live)) return null;
  const latestShape = changes[Math.min(shape, changes.length - 1)];
  const shown = Math.min(decision, moves.length - 1);
  const event = moves[live ? moves.length - 1 : shown];
  const move = event?.phaseMove;
  const chance = move && play.find(e => e.kind === 'shot' && e.phaseChance === move.id);
  const review = move && play.find(e => e.kind === 'var' && e.phaseChance === move.id && e.review?.incident === 'goal');
  const counters = moves.filter(e => e.phaseMove.outcome === 'released' || e.phaseMove.outcome === 'regained').length;
  const breaks = moves.filter(e => e.phaseMove.outcome === 'intercepted' || e.phaseMove.outcome === 'bypassed').length;
  const title = live ? 'Latest shape change in play' : 'How the shapes played';
  return <section aria-label={title} className="space-y-2 rounded-lg border border-border bg-card p-3 text-left text-xs">
    <h3 className="text-sm font-bold">{title}</h3>
    {!live && moves.length > 0 && <p>{counters} times through or won back · {breaks} times beaten · {moves.length - counters - breaks} held</p>}
    {move && <div className="space-y-1 rounded-md border-l-2 border-primary bg-secondary/30 p-2" aria-live="polite">
      <p className="font-bold">{minuteLabel(event)} · {move.phase === 'outlet' ? 'Playing out after a save' : 'Recovering after their save'}</p>
      <p>{named(move.keeper)} saved. <MoveLine move={move} /></p>
      <p>The move went through the {move.lane} lane.</p>
      {move.phase === 'outlet' && move.support !== undefined &&
        <p>{move.support} nearby {move.support === 1 ? 'passing option' : 'passing options'} for {move.actor.name}.</p>}
      {move.phase === 'recovery' && move.screenedLane && <p>A holding midfielder covered the lane.</p>}
      {move.phase === 'recovery' && move.highPressure && <p>A forward was close enough to press high.</p>}
      <p>{move.cover} other {move.cover === 1 ? 'player was' : 'players were'} in cover. {move.actor.returnDistance} pitch units between {move.actor.name}'s two roles.</p>
      {live ? <p>{move.effort ? 'Up to one fitness point for that run' : 'Held position'}</p> :
        move.spent !== undefined && <p>{move.spent} fitness spent</p>}
      {(chance || review) && <p className="font-semibold">{live ? 'The move led to a chance.' :
        review?.review?.decision === 'disallowed' ? 'The goal was ruled out after review.' :
        chance && <>{chance.who ? named({ name: chance.who, generated: chance.whoGenerated }) : 'The player'} {chance.goal ? 'scored.' : chance.on ? 'shot on target.' : 'shot off target.'}</>}</p>}
    </div>}
    {!live && moves.length > 1 && <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous phase event" className="min-h-11 min-w-11 rounded-md border border-border px-2 disabled:opacity-40"
        disabled={shown === 0} onClick={() => setDecision(shown - 1)}>Previous</button>
      <span className="tabular-nums">{shown + 1} of {moves.length}</span>
      <button type="button" aria-label="Next phase event" className="min-h-11 min-w-11 rounded-md border border-border px-2 disabled:opacity-40"
        disabled={shown >= moves.length - 1} onClick={() => setDecision(shown + 1)}>Next</button>
    </div>}
    {!live && changes.length > 0 && <details>
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">Replay the team shapes</summary>
      {changes.length > 1 && <label className="mb-2 block">
        Match time
        <select className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-2"
          value={Math.min(shape, changes.length - 1)} onChange={e => setShape(Number(e.target.value))}>
          {changes.map((step, index) => <option key={index} value={index}>
            {step.minute === 0 ? 'Kickoff' : minuteLabel(step)} · {step.order
              ? `${PHASE_SHAPE_NAMES[step.order.withBall].split(' ')[0]} / ${PHASE_SHAPE_NAMES[step.order.withoutBall].split(' ')[0]}`
              : 'One shape'}{step.positions?.missingSlots.length ? ' · Short-handed' : ''}
          </option>)}
        </select>
      </label>}
      {latestShape?.positions?.reason && <p>{latestShape.positions.reason}</p>}
      {latestShape?.order && latestShape.positions?.rows.length ?
        <PhasePositionMap positions={latestShape.positions} order={latestShape.order} /> :
        !latestShape?.positions?.reason && <p>The team used one shape.</p>}
    </details>}
    {!moves.length && <p>The match recorded no phase-shape move while the order was active.</p>}
  </section>;
}
