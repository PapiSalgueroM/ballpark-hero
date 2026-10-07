import { GOAL_HEIGHT, GOAL_WIDTH, type Aim, type ShotResult } from '@/lib/freeKick';

export interface LabKick { aim: Aim; result: ShotResult; attempt: number }

export function freeKickLabPath(result: ShotResult) {
  return result.hitWall ? result.path.slice(0, Math.round(result.path.length * .45) + 1) : result.path;
}

export default function FreeKickLabComparison({ shots }: { shots: LabKick[] }) {
  if (!shots.length) return null;
  return <div data-lab-comparison className="grid grid-cols-2 gap-2 text-xs leading-4">
    {shots.map((shot, index) => {
      const previous = index < shots.length - 1;
      const { aim, result } = shot;
      const tooWeak = result.verdict === 'Never had the legs.';
      const arrival = !result.hitWall && !tooWeak;
      return <div key={shot.attempt} data-lab-shot={previous ? 'previous' : 'current'} data-lab-attempt={shot.attempt}
        data-lab-hit-wall={result.hitWall} data-lab-too-weak={tooWeak} data-lab-arrival={arrival}
        data-lab-verdict={result.verdict} data-lab-scored={result.scored}
        data-lab-x={aim.x} data-lab-y={aim.y} data-lab-power={aim.power} data-lab-bend={aim.curve}
        className={`min-w-0 rounded-xl border p-2 ${previous ? 'border-amber-500/40 bg-amber-500/5' : 'border-cyan-500/40 bg-cyan-500/5'}`}>
        <p className="font-bold">{previous ? 'Previous kick' : 'Latest kick'} · {shot.attempt}</p>
        <p className="mt-1 font-semibold">{result.scored ? 'Goal' : result.verdict}</p>
        <dl className="mt-2 space-y-1 tabular-nums">
          <div className="flex justify-between gap-1"><dt>Power</dt><dd>{Math.round(aim.power * 100)}</dd></div>
          <div className="flex justify-between gap-1"><dt>Bend</dt><dd>{Math.round(Math.abs(aim.curve) * 100)} {aim.curve < 0 ? 'left' : aim.curve > 0 ? 'right' : 'none'}</dd></div>
          <div><dt className="text-muted-foreground">Aim (%)</dt><dd>{Math.round(Math.abs(aim.x) * 100)} {aim.x < 0 ? 'left' : aim.x > 0 ? 'right' : 'centre'}, {Math.round(aim.y * 100)} high</dd></div>
        </dl>
        {arrival ? <dl data-lab-arrival-reading className="mt-2 border-t border-border pt-2 tabular-nums">
          <dt className="text-muted-foreground">At goal line</dt>
          <dd>{Math.round(Math.abs(result.x) * GOAL_WIDTH * 50)} cm {result.x < 0 ? 'left' : 'right'} of centre</dd>
          <dd>Height {Math.round(result.y * GOAL_HEIGHT * 100)} cm</dd>
        </dl> : <p className="mt-2 border-t border-border pt-2 text-muted-foreground">{result.hitWall ? 'Stopped at wall.' : 'Too weak to reach goal.'} No goal crossing.</p>}
      </div>;
    })}
    {shots.length === 1 && <p className="flex items-center rounded-xl border border-dashed border-border p-2 text-muted-foreground">Retry this kick, change one setting, then compare your next attempt here.</p>}
  </div>;
}
