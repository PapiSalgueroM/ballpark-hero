import { useEffect, useRef } from 'react';
import { CAGE_TICK_MS, type CageFight } from '@/lib/cageClash';

export function CageFightStats({ fight, onBack }: { fight: CageFight; onBack: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  const rows = [
    ['hits', 'Shots landed', fight.player.hits, fight.cpu.hits],
    ['damageDealt', 'Damage dealt', Math.round(fight.player.damageDealt), Math.round(fight.cpu.damageDealt)],
    ['blocked', 'Blocks', fight.player.blocked, fight.cpu.blocked],
    ['takedowns', 'Takedowns', fight.player.takedowns, fight.cpu.takedowns],
    ['controlTicks', 'Top control', `${(fight.player.controlTicks * CAGE_TICK_MS / 1000).toFixed(1)}s`, `${(fight.cpu.controlTicks * CAGE_TICK_MS / 1000).toFixed(1)}s`],
  ] as const;
  return <div data-cage-fight-stats className="w-full max-w-xs space-y-1 text-white">
    <h3 className="text-sm font-black">Fight stats</h3>
    <table aria-label="Fight comparison" className="w-full table-fixed text-[11px] leading-4 tabular-nums">
      <thead><tr><th className="w-1/2 text-left"><span className="sr-only">Stat</span></th><th scope="col" className="text-blue-300">You</th><th scope="col" className="text-red-300">CPU</th></tr></thead>
      <tbody>{rows.map(([key, label, player, cpu]) => <tr key={key} data-cage-stat={key} className="border-t border-slate-700">
        <th scope="row" className="py-0.5 text-left font-medium">{label}</th><td>{player}</td><td>{cpu}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-[9px] leading-3 text-slate-300">Damage is rounded. Control is time on top.</p>
    <button ref={backRef} type="button" className="min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-4 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={onBack}>Back</button>
  </div>;
}
