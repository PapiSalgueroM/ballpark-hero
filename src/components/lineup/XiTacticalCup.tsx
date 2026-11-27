import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { loadBuildXiDraft } from '@/lib/buildXiResult';
import { safeLocalStorage } from '@/lib/safeStorage';
import { adjustments, callRoute, coachHalf, CUP_KEY, cupMatchReport, cupOpponents, cupSquadId, readCup, routes, routeSupport, startCup, wideDuty, type Adjustment, type CupRoute, type TacticalCup } from '@/lib/xiTacticalCup';
import type { FilledSlot, Formation } from '@/types/lineupBuilder';

const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-left text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary';
const routeKeys = Object.keys(routes) as CupRoute[];
const adjustmentNotes: Record<Adjustment, string> = {
  runner: 'Two more chances for each side.',
  steady: 'Keep your attacking and defensive numbers.',
  cover: 'Two fewer chances for each side, down to one.',
};

function CupRules() {
  return <div className="space-y-2 text-sm text-muted-foreground">
    <p>Face three fictional opponents with this XI. A win earns 3 points, a draw earns 1. Take 6 points to win the cup.</p>
    <p>Pick where to attack. Having enough players in those slots adds a chance. Two players recorded in their exact roles add another. You can move a wide player into midfield for one match. An open route adds two chances and a crowded route costs one. At halftime, choose how much space to leave the other side.</p>
    <p>Example: two wide players stretch a Narrow Block. Send another runner at halftime for two extra chances, but your opponent also gets two. Each chance has a 28% chance of a goal.</p>
    <p>Your cup saves on this device. Replay the draw to try another call with the same match rolls. These matches leave your draft and league report intact.</p>
  </div>;
}

export function XiTacticalCup({ formation, slots }: { formation: Formation; slots: FilledSlot[] }) {
  const squad = cupSquadId(formation, slots);
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(CUP_KEY));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const stage = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  const cup = readCup(raw, squad);
  const reports = cup?.matches.map((_, i) => cupMatchReport(cup, i, slots)) ?? [];
  const finished = reports.filter(report => report.second);
  const last = finished[finished.length - 1];
  const current = reports[finished.length];
  const complete = finished.length === 3;
  const opponent = cup && !complete ? cupOpponents(cup.seed)[finished.length] : null;
  const duty = wideDuty(slots, !!cup?.tuckIn);
  const points = finished.reduce((sum, report) => sum + report.points, 0);
  const label = !cup ? 'Play Tactical Cup' : complete ? 'Review Tactical Cup' : 'Resume Tactical Cup';

  useEffect(() => {
    const restore = (event: StorageEvent) => {
      if (event.key === CUP_KEY || event.key === null) setRaw(safeLocalStorage.getItem(CUP_KEY));
    };
    window.addEventListener('storage', restore);
    return () => window.removeEventListener('storage', restore);
  }, []);

  useEffect(() => {
    if (focusNext.current) stage.current?.focus();
    focusNext.current = false;
  }, [raw]);

  function commit(next: TacticalCup) {
    const stored = loadBuildXiDraft().draft;
    if (!stored || cupSquadId(stored.formation, [...stored.slots].sort(([a], [b]) => a - b).map(([, slot]) => slot)) !== squad) {
      setNotice('Your XI changed in another tab. Reopen the draft to use its current squad.');
      return;
    }
    const latest = safeLocalStorage.getItem(CUP_KEY);
    if (latest !== raw) {
      setRaw(latest);
      setNotice('The cup changed in another tab. Your latest position is shown.');
      return;
    }
    const written = JSON.stringify(next);
    safeLocalStorage.setItem(CUP_KEY, written);
    focusNext.current = next.matches !== cup?.matches;
    setNotice('');
    setRaw(written);
  }

  async function save(next: TacticalCup) {
    if (!navigator.locks) { commit(next); return; }
    let entered = false;
    try {
      await navigator.locks.request(CUP_KEY, () => { entered = true; commit(next); });
    } catch (error) {
      if (entered) throw error;
      commit(next);
    }
  }

  return <div className="mx-auto mb-4 max-w-xl rounded-xl border border-border bg-card px-4 py-3">
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setRaw(safeLocalStorage.getItem(CUP_KEY)); setNotice(''); } }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold">Tactical Cup</p><p className="text-sm text-muted-foreground">Coach your XI through three matches.</p></div>
        <DialogTrigger asChild><button type="button" className={button}>{label}</button></DialogTrigger>
      </div>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
        <DialogTitle>Tactical Cup</DialogTitle>
        <DialogDescription>{formation} · {finished.length} of 3 played · {points} points</DialogDescription>
        {notice && <p role="status" className="text-sm">{notice}</p>}
        {!cup ? <><CupRules/><button type="button" className={button} onClick={() => save(startCup(squad, Math.floor(Math.random() * 0x100000000)))}>Start cup</button></> : <>
          <h3 ref={stage} tabIndex={-1} className="font-display text-lg font-bold">
            {complete ? (points >= 6 ? 'Cup won' : 'Cup finished') : current ? 'Half-time against ' + opponent?.name : 'Match ' + (finished.length + 1) + ': ' + opponent?.name}
          </h3>
          {last && <p data-cup-last-result className="text-sm font-semibold">Full time vs {last.opponent.name}: {last.gf} to {last.ga}. {last.points} {last.points === 1 ? 'point' : 'points'}.</p>}
          {opponent && !current && <>
            <p className="text-sm">{opponent.scout} Choose your attacking route for both halves.</p>
            {duty.left && <label className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-2 text-sm">
              <input type="checkbox" className="mt-1 shrink-0" checked={!!cup.tuckIn} onChange={event => save({ ...cup, tuckIn: event.target.checked || undefined })}/>
              <span>Tuck {duty.left.playerName} inside <span className="block text-xs text-muted-foreground">{duty.left.role} to CM for this match. Gain a central slot and give up a wide slot. Overlapping Backs get one extra chance per half on the exposed flank.</span></span>
            </label>}
            <div className="grid gap-2">{routeKeys.map(route => {
              const support = routeSupport(duty.slots, route);
              return <button key={route} type="button" className={button} onClick={() => save(callRoute(cup, route))}>
                {routes[route].label}<span className="block text-xs font-normal text-muted-foreground">
                  {support.assigned.map(slot => slot.role).join(' + ') || 'No dedicated slots'}. Shape {support.shapeBonus ? '+1' : '+0'} ({routes[route].minimum} slots needed). Recorded fit +{support.fitBonus}.
                </span>
              </button>;
            })}</div>
          </>}
          {current && <>
            <p className="text-sm"><strong>Your XI {current.gf} : {current.ga} {current.opponent.name}</strong>. Chances {current.first.own} to {current.first.against}.</p>
            <p className="text-sm">{routes[cup.matches[finished.length].route].label}. {current.tucked && current.tucked + ' tucked inside. '}{current.matchup > 0 ? 'You found their open route.' : current.matchup < 0 ? 'You ran into their strongest cover.' : 'Neither side had the route advantage.'} {current.support.natural.length > 0 && 'Recorded fits: ' + current.support.natural.map(slot => slot.playerName).join(', ') + '.'}</p>
            <p className="text-sm">{current.gf > current.ga ? 'They are chasing. Expect one extra chance each.' : current.gf < current.ga ? 'They are protecting a lead. Expect one fewer chance each.' : 'Scores level. Their shape holds.'} Choose your second-half risk.</p>
            {(Object.keys(adjustments) as Adjustment[]).map(choice => <button type="button" key={choice} className={button} onClick={() => save(coachHalf(cup, choice))}>
              {adjustments[choice]}<span className="block text-xs font-normal text-muted-foreground">{adjustmentNotes[choice]}</span>
            </button>)}
          </>}
          {complete && <>
            <p className="text-sm">You earned {points} of 9 points. The cup takes 6.</p>
            <ol className="grid gap-1 text-sm">{finished.map((match, i) => <li key={match.opponent.name}>
              {match.opponent.name}: {match.gf} to {match.ga}. {routes[cup.matches[i].route].label}, {adjustments[cup.matches[i].adjustment!]}. {match.tucked && match.tucked + ' tucked inside. '}Chances {match.first.own + match.second!.own} to {match.first.against + match.second!.against}.
            </li>)}</ol>
            <button type="button" className={button} onClick={() => save(startCup(squad, cup.seed))}>Replay this draw</button>
            <button type="button" className={button} onClick={() => save(startCup(squad, (cup.seed + 1 + Math.floor(Math.random() * 0xffffffff)) >>> 0))}>Play a new draw</button>
          </>}
          <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">? Cup rules and example</summary><CupRules/></details>
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}
