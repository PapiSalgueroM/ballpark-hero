import type { HoopResult, Release } from '@/lib/buzzerBeater';

export interface LabShot {
  release: Release;
  result: HoopResult;
  attempt: number;
}

export default function ShotLabComparison({ shots }: { shots: LabShot[] }) {
  if (!shots.length) return null;
  return <div data-lab-comparison className="grid grid-cols-2 gap-2 text-xs">
    {shots.map((shot, index) => {
      const previous = index < shots.length - 1;
      const { result, release } = shot;
      return <div key={shot.attempt} data-lab-shot={previous ? 'previous' : 'current'}
        className={`min-w-0 rounded-xl border p-2.5 ${previous ? 'border-amber-500/40 bg-amber-500/5' : 'border-cyan-500/40 bg-cyan-500/5'}`}>
        <p className="font-semibold">{previous ? 'Previous shot' : 'Latest shot'} · {shot.attempt}</p>
        <p className="mt-1 font-semibold">{result.blocked ? 'Blocked' : result.made ? 'Made' : 'Missed'}</p>
        <dl className="mt-2 space-y-1 tabular-nums">
          <div className="flex justify-between gap-1"><dt>Power</dt><dd>{Math.round(release.power * 100)}</dd></div>
          <div className="flex justify-between gap-1"><dt>Arc setting</dt><dd>{Math.round(release.arc * 100)}</dd></div>
          <div className="flex justify-between gap-1"><dt>Fade</dt><dd>{Math.round(Math.abs(release.x) * 100)} {release.x < 0 ? 'left' : release.x > 0 ? 'right' : 'square'}</dd></div>
        </dl>
        {result.blocked ? <p className="mt-2 text-muted-foreground">Stopped at the defender. No rim crossing.</p>
          : result.entryDeg <= 0 ? <p className="mt-2 text-muted-foreground">Never reached rim height.</p>
          : <dl data-lab-rim className="mt-2 space-y-1 border-t border-border pt-2 tabular-nums">
            <div className="flex justify-between gap-1"><dt>Rim entry</dt><dd>{Math.round(result.entryDeg)}°</dd></div>
            <div><dt className="text-muted-foreground">At rim height</dt>
              <dd>{Math.round(Math.abs(result.depth) * 100)} cm {result.depth < 0 ? 'short' : 'long'}</dd>
              <dd>{Math.round(Math.abs(result.lateral) * 100)} cm {result.lateral < 0 ? 'left' : 'right'}</dd>
            </div>
          </dl>}
      </div>;
    })}
    {shots.length === 1 && <div className="flex items-center rounded-xl border border-dashed border-border p-3 text-muted-foreground">
      Retry this shot, then change one setting. Your next attempt appears beside this one.
    </div>}
  </div>;
}
