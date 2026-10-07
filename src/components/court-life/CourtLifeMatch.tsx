import { useEffect, useRef, useState } from 'react';
import { COURT_HZ, courtPassTarget, courtShotMeter } from '@/lib/courtLife';
import type { useCourtLife } from '@/hooks/useCourtLife';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { CourtLifeCanvas } from './CourtLifeCanvas';
import CourtLifeControls from './CourtLifeControls';
import { courtButton, courtPrimary } from './CourtLifeHub';

const clockText = (ticks: number) => { const seconds = Math.ceil(ticks / COURT_HZ); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
export default function CourtLifeMatch({ game }: { game: ReturnType<typeof useCourtLife> }) {
  const match = game.match!, player = match.players.find(row => row.id === match.controlledPlayerId)!;
  const frame = useRef<HTMLDivElement>(null);
  const [boxOpen, setBoxOpen] = useState(false);
  const stopped = match.phase === 'finished' || match.phase === 'halftime';
  const reveal = useRevealScroll(`${match.id}:${match.phase === 'finished' ? 'finished' : match.phase === 'halftime' ? 'interval' : 'play'}:${boxOpen}`);
  const meter = courtShotMeter(match, player.id), target = match.players.find(row => row.id === courtPassTarget(match, player.id));
  const owner = match.players.find(row => row.id === match.ball.ownerId);
  useEffect(() => { if (!game.paused) frame.current?.querySelector('canvas')?.focus({ preventScroll: true }); }, [game.paused]);
  return <section ref={reveal} className="space-y-2" data-court-match data-court-phase={match.phase} data-court-paused={String(game.paused)}>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-[#172d3b] px-3 py-2 text-white">
      <div><span className="block text-xs" style={{ color: match.teams.home.color }}>{match.teams.home.name}{player.side === 'home' ? ' (you)' : ''}</span><strong className="font-display text-3xl tabular-nums" data-court-score="home">{match.score.home}</strong></div>
      <div className="text-center"><span className="block text-xs text-slate-300">{match.period <= 2 ? `Half ${match.period}` : `Overtime ${match.period - 2}`}</span><strong className="font-mono text-xl" data-court-clock>{clockText(match.remainingTicks)}</strong><span className="block text-xs text-amber-200">Shot clock {Math.ceil(match.shotClockTicks / COURT_HZ)}</span></div>
      <div className="text-right"><span className="block text-xs" style={{ color: match.teams.away.color }}>{match.teams.away.name}{player.side === 'away' ? ' (you)' : ''}</span><strong className="font-display text-3xl tabular-nums" data-court-score="away">{match.score.away}</strong></div>
    </div>
    <div ref={frame} className="relative">
      <CourtLifeCanvas matchRef={game.matchRef} drawRef={game.drawRef} />
      {game.paused && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/75 p-3 text-center text-white">
        <div><h3 className="font-display text-xl font-bold">{match.phase === 'finished' ? match.result?.winner === 'draw' ? 'All square' : match.result?.winner === player.side ? 'Your crew wins' : 'A tough one' : match.phase === 'halftime' ? match.period === 1 ? 'Halftime' : 'Extra time' : match.tick === 0 ? 'Own your next possession' : 'Game paused'}</h3>
          <p className="mb-3 mt-1 text-xs text-slate-200">{match.phase === 'finished' ? `${match.score.home} : ${match.score.away}. The score is final.` : match.phase === 'halftime' ? 'Catch your breath. The next period starts when you are ready.' : `You are the player with the gold ring. Attack ${player.side === 'home' ? 'right' : 'left'}.`}</p>
          {match.phase === 'finished' ? <button className={courtPrimary} onClick={() => setBoxOpen(true)}>View match stats</button> : match.phase === 'halftime' ? <button className={courtPrimary} onClick={game.continuePeriod}>Next period</button> : <button className={courtPrimary} onClick={game.resume}>{match.tick === 0 ? 'Start play' : 'Resume play'}</button>}
        </div>
      </div>}
    </div>
    <div className="flex min-h-6 items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate">{owner ? `${owner.name} has the ball` : match.ball.mode === 'shot' ? 'Shot in the air' : match.ball.mode === 'pass' ? 'Pass in the air' : 'Loose ball'} · Attack {player.side === 'home' ? '→' : '←'}</span><span className="shrink-0">Gas {Math.round(player.stamina)}%</span></div>
    <div className="relative h-3 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Shot release meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={meter.charge} aria-valuetext={player.chargeTicks ? 'Release inside the gold window' : 'Hold Shoot to charge'}>
      <span className="absolute inset-y-0 bg-amber-400" style={{ left: `${Math.max(0, meter.ideal - meter.window) * 100}%`, width: `${meter.window * 200}%` }} />
      <span className="absolute inset-y-0 w-1 bg-foreground" style={{ left: `calc(${Math.min(1, meter.charge) * 100}% - 2px)` }} />
    </div>
    <p className="text-xs text-muted-foreground">{player.chargeTicks ? 'Release Shoot in the gold window. Space and distance still matter.' : target && owner?.id === player.id ? `Pass target: ${target.name}, marked by the dashed ring.` : 'Hold Shoot, then release. Move into space or stay with your player.'}</p>
    {!stopped && <CourtLifeControls match={match} paused={game.paused} press={game.press} release={game.release} move={game.move} tap={game.tap} />}
    <div className="flex items-center gap-2"><p className="min-w-0 flex-1 text-xs" role="status" aria-live="polite">{match.message}</p>{!stopped && <button className={courtButton} onClick={game.paused ? game.resume : game.pause}>{game.paused ? 'Resume' : 'Pause'}</button>}</div>
    <p className="text-xs text-muted-foreground">{player.stats.points} PTS · {player.stats.assists} AST · {player.stats.rebounds} REB · {player.stats.steals} STL · {player.stats.blocks} BLK · {player.stats.turnovers} TO</p>
    {boxOpen && match.phase === 'finished' && <div className="space-y-3 rounded-xl border border-border bg-card p-3" data-court-boxscore>
      <h3 className="font-display text-lg font-bold">Every possession counted</h3>
      {(['home', 'away'] as const).map(side => <div key={side} className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="py-2 text-left font-semibold">{match.teams[side].name} · {match.score[side]}</caption><thead><tr>{['Player', 'PTS', 'FG', 'AST', 'REB', 'STL', 'BLK', 'TO'].map(label => <th className="px-1 py-2" key={label}>{label}</th>)}</tr></thead><tbody>{match.players.filter(row => row.side === side).map(row => <tr key={row.id} className={row.id === player.id ? 'bg-teal-500/10' : ''}><th className="px-1 py-2">{row.name}</th><td>{row.stats.points}</td><td>{row.stats.made}/{row.stats.attempts}</td>{(['assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const).map(key => <td key={key}>{row.stats[key]}</td>)}</tr>)}</tbody></table></div>)}
      <button className={`${courtPrimary} w-full`} onClick={game.finish}>Finish game and return to your day</button>
    </div>}
  </section>;
}
