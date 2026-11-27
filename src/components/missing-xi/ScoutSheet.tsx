import { useEffect, useMemo, useRef, useState } from 'react';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { Lineup } from '@/lib/missingXi';
import { unassistedCount } from '@/lib/missingXiRecall';
import { makeScoutReport, restoreScouting, scoutBalance, scoutMove, type ScoutMove } from '@/lib/missingXiScouting';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';

const button = 'min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50';

export default function ScoutSheet({ lineup, onBack }: { lineup: Lineup; onBack: () => void }) {
  const key = 'missing-xi-scout-v1-' + lineup.id;
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(key));
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const { round, moves } = useMemo(() => restoreScouting(lineup, raw), [lineup, raw]);
  const { sheet, reports } = round;
  const clean = unassistedCount(sheet), balance = scoutBalance(round);
  const active = sheet.finished ? undefined : reports.find(r => r.pick === null);
  const activeSlot = active?.slot;
  const heading = useRef<HTMLHeadingElement>(null);
  const reportPanel = useRevealScroll<HTMLFieldSetElement>(activeSlot);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const previousReport = useRef<number>();
  useEffect(() => {
    if (activeSlot !== undefined) reportPanel.current?.querySelector('button')?.focus({ preventScroll: true });
    else if (previousReport.current !== undefined) noticeRef.current?.focus({ preventScroll: true });
    previousReport.current = activeSlot;
  }, [activeSlot, reportPanel]);
  useEffect(() => {
    if (!reportPanel.current) heading.current?.focus({ preventScroll: true });
    const sync = (e: StorageEvent) => { if (e.key === key || e.key === null) setRaw(safeLocalStorage.getItem(key)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, reportPanel]);

  async function play(move: ScoutMove | 'restart') {
    const commit = () => {
      const latest = safeLocalStorage.getItem(key);
      if (latest !== raw) { setRaw(latest); setNotice('Another tab updated this sheet. Try your move again.'); return; }
      const result = move === 'restart' ? null : scoutMove(lineup, round, move);
      if (result && result.round === round) { setNotice(result.message); return; }
      const next = JSON.stringify(move === 'restart' ? [] : [...moves, move]);
      if (!safeSetItem(key, next)) { setNotice('This move could not be saved. Try again.'); return; }
      setRaw(next); setName(''); setNotice(result?.message ?? 'New scouting sheet.');
    };
    if (navigator.locks) await navigator.locks.request(key, commit).catch(() => setNotice('Your move could not be saved. Try again.'));
    else commit();
  }

  return <section aria-label="Scouting Challenge" className="mx-auto max-w-lg space-y-3" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onBack(); }
  }}>
    <button type="button" className="min-h-11 text-sm font-semibold text-primary" onClick={onBack}>‹ Match archive</button>
    <header><h2 ref={heading} tabIndex={-1} className="text-xl font-bold">Scouting Challenge</h2>
      <p className="font-semibold">{lineup.team} v {lineup.opponent}</p>
      <p className="text-sm text-muted-foreground">{lineup.dateLabel} · {lineup.team} · {lineup.matchDate}</p></header>
    <p className="rounded-xl border border-border bg-card p-3 text-sm"><strong>{sheet.found.length}/11 named</strong> · {clean} from memory
      <span className="block">{balance} {balance === 1 ? 'report' : 'reports'} left{!sheet.finished && clean < 6 ? ' · Next report at ' + (clean < 3 ? 3 : 6) + ' from memory' : ''}</span></p>
    <details className="rounded-xl border border-border px-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Scouting rules and example</summary>
      <p className="pb-3">Name the eleven in any order. A wrong typed guess costs nothing. Spend a report on a shirt to see three archived starters in that position. Pick once. A correct pick fills the shirt with help. A miss locks it for this attempt.</p>
      <p className="pb-3">You start with one report and earn one more at three and six unassisted names. For example, name three starters from memory, then make one correct scout pick. You have four shirts filled and one report left.</p></details>
    {!sheet.finished && (active ? <fieldset ref={reportPanel} className="space-y-2 rounded-xl border border-primary p-3">
      <legend className="px-1 font-bold">Scout report · {sheet.starters[active.slot].position} · slot {active.slot + 1}</legend>
      <p className="text-sm">Who started for {lineup.team}? One pick. A miss locks the shirt.</p>
      {active.names.map(n => <button type="button" className={button + ' w-full text-left'} key={n} onClick={() => void play({ type: 'pick', name: n })}>{n}</button>)}
    </fieldset> : <form onSubmit={event => { event.preventDefault(); void play({ type: 'name', name: name.trim() }); }}>
      <label htmlFor="scout-starter" className="text-sm font-semibold">Name a starter from memory</label>
      <div className="flex gap-2"><input id="scout-starter" autoComplete="off" maxLength={100} value={name} onChange={e => setName(e.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3" /><button className={button} disabled={!name.trim()}>Guess</button></div>
    </form>)}
    <p ref={noticeRef} tabIndex={-1} role="status" className="text-sm text-muted-foreground">{notice || (sheet.finished ? 'Final scouting sheet.' : 'Type a name or choose a shirt to scout.')}</p>
    <ol className="grid grid-cols-2 gap-2">{sheet.starters.map((p, i) => {
      const report = reports.find(r => r.slot === i), found = sheet.found.includes(i);
      const locked = !!report?.pick && !found;
      return <li key={i} className="min-w-0 rounded-lg border border-border bg-card p-2 text-sm">
        <span className="block text-xs text-muted-foreground">{p.position} · slot {i + 1}</span>
        {sheet.finished || found ? <><strong className="break-words">{p.name}</strong>
          <span className="block text-xs">{found ? report ? 'Scouted' : 'From memory' : locked ? 'Locked' : 'Revealed'}</span></>
          : report ? <strong>{locked ? 'Locked' : 'Report open'}</strong>
          : <button type="button" className="min-h-11 text-primary disabled:text-muted-foreground" disabled={balance < 1 || !!active}
            aria-label={'Scout ' + p.position + ', slot ' + (i + 1)} onClick={() => {
              const report = makeScoutReport(lineup, i);
              if (report) void play(report);
            }}>Scout shirt</button>}</li>;
    })}</ol>
    {sheet.finished ? <button className={button} onClick={() => void play('restart')}>Replay scouting challenge</button>
      : <GiveUpButton label="Finish scouting sheet" onGiveUp={() => void play({ type: 'finish' })} />}
  </section>;
}
