import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { FORMATIONS, MENTALITIES, DUTY_INFO, SET_PIECE_KEYS, SET_PIECE_INFO } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { MATCH_PLAN_LIMIT, MATCH_PLAN_NAME_LIMIT, canEditMatchPlans, matchPlansOf, previewMatchPlan } from '@/lib/clubManagerMatchPlans';

interface MatchPlansCardProps {
  career: CareerState;
  open: boolean;
  onToggle: () => void;
  onSave: (slot: number, name: string) => boolean;
  onApply: (slot: number) => boolean;
  onDelete: (slot: number) => boolean;
}

const REFUSED_MATCH_PLAN = 'This setup could not be changed. Reopen your active manager save and try again.';

export function MatchPlansCard({ career, open, onToggle, onSave, onApply, onDelete }: MatchPlansCardProps) {
  const [selected, setSelected] = useState(0);
  const [name, setName] = useState('');
  const [details, setDetails] = useState(false);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveReveal, setSaveReveal] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const plans = matchPlansOf(career);
  const plan = plans.find(p => p.slot === selected);
  const preview = previewMatchPlan(career, selected);
  const editable = canEditMatchPlans(career);
  const actionRef = useRevealScroll<HTMLDivElement>(`${open}:${selected}:${!!plan}:${saveReveal}`, { enabled: open, skipFirst: false, block: 'end' });
  const refused = notice === REFUSED_MATCH_PLAN;
  const noticeRef = useRevealScroll<HTMLParagraphElement>(refused, { enabled: open && refused, skipFirst: false, block: 'end' });
  useEffect(() => { setName(plan?.name ?? ''); }, [selected, plan?.name, career.clubName, career.eraId]);
  useEffect(() => { setDetails(false); setNotice(''); }, [selected, career.clubName, career.eraId]);
  const button = 'min-h-[44px] min-w-[44px] rounded-lg border px-3 text-xs font-semibold disabled:opacity-50';
  const close = () => { onToggle(); triggerRef.current?.focus({ preventScroll: true }); };
  const showResult = (accepted: boolean, success: string) => {
    setNotice(accepted ? success : REFUSED_MATCH_PLAN);
    return accepted;
  };
  return <>
    <button ref={triggerRef} type="button" data-cm-tile-btn="plans" aria-expanded={open} onClick={onToggle}
      className={cn('w-full flex items-center justify-between gap-2 rounded-xl border bg-card px-3 min-h-[44px] text-left text-xs', open && 'rounded-b-none border-primary')}>
      <span>Match plans <span className="font-bold">{plans.length}/{MATCH_PLAN_LIMIT}</span></span>
      <ChevronDown className={cn('w-4 h-4 shrink-0', open && 'rotate-180')} />
    </button>
    {open && <section onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }} className="rounded-b-xl border border-t-0 border-primary bg-card p-3 space-y-3 text-xs" aria-label="Saved match plans" data-cm-match-plans>
      <div className="flex justify-between gap-2">
        <button type="button" onClick={close} className={button}><ArrowLeft className="inline w-4 h-4 mr-1" />Back</button>
        <button type="button" aria-label="Match plan rules" aria-expanded={help} onClick={() => setHelp(!help)} className={button}><HelpCircle className="w-4 h-4" /></button>
      </div>
      <p className="text-muted-foreground">Keep up to three setups for this club. Preview uses your squad as it stands today.</p>
      {help && <p data-cm-plan-rules className="rounded-lg bg-muted p-3 leading-relaxed">Save your formation, mentality, XI, duties, captain, set piece takers and shootout order together. For example, save your first XI, rotate on the pitch, then save a second plan. Preview shows who would start now, including injury or suspension replacements. Apply restores the saved picks; it does not heal players or lock in a result. A new club needs its own plans.</p>}
      <div className="grid grid-cols-3 gap-1.5" aria-label="Plan slots">
        {Array.from({ length: MATCH_PLAN_LIMIT }, (_, slot) => {
          const saved = plans.find(p => p.slot === slot);
          return <button key={slot} type="button" data-cm-plan-slot={slot} aria-pressed={selected === slot}
            aria-label={`Plan ${slot + 1}: ${saved?.name ?? 'empty'}`} onClick={() => setSelected(slot)}
            className={cn(button, 'min-w-0 px-1.5', selected === slot && 'border-primary bg-primary/10')}>
            <span className="block truncate">{saved?.name ?? `Plan ${slot + 1}`}</span>
          </button>;
        })}
      </div>
      <div ref={!plan ? actionRef : undefined} className="flex gap-2 scroll-mb-3">
        <label className="flex-1 min-w-0">Plan name
          <input aria-label="Plan name" data-cm-plan-name value={name} maxLength={MATCH_PLAN_NAME_LIMIT}
            onChange={event => setName(event.target.value)} placeholder={`Plan ${selected + 1}`} disabled={!editable}
            className="mt-1 w-full min-h-[44px] rounded-lg border bg-background px-2 text-xs" />
        </label>
        <button type="button" data-cm-plan-save disabled={!editable || !name.trim()}
          onClick={() => { if (showResult(onSave(selected, name), `Saved ${name.trim().slice(0, MATCH_PLAN_NAME_LIMIT)}.`)) setSaveReveal(n => n + 1); }}
          className={cn(button, 'self-end border-primary text-primary')}>{plan ? 'Replace plan' : 'Save setup'}</button>
      </div>
      {!editable && <p role="status">Plans can be changed between matches while you manage this club.</p>}
      {preview && <div className="space-y-3" data-cm-plan-preview={selected}>
        <p className="font-semibold">{FORMATIONS[plan!.formationIndex].name} · {MENTALITIES.find(m => m.id === plan!.mentality)?.label}</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-2">
          <p>Match strength <strong className="block" data-cm-plan-strength>{preview.currentStrength.toFixed(1)} now / {preview.strength.toFixed(1)} with plan</strong></p>
          <p>Kickoff XI fitness <strong className="block" data-cm-plan-fitness>{preview.fitness === null ? 'No available players' : `${Math.round(preview.fitness)}% average`}</strong></p>
        </div>
        <p data-cm-plan-replacements>{preview.replacements ? `${preview.replacements} saved spot${preview.replacements === 1 ? '' : 's'} need a replacement.` : 'All saved picks can start.'} Strength includes current fitness, morale, form and position fit. Mentality and duties affect the match separately.</p>
        <div ref={actionRef} data-cm-plan-actions className="grid grid-cols-2 gap-2 scroll-mb-3">
          <button type="button" data-cm-plan-apply disabled={!editable} className={cn(button, 'bg-primary text-primary-foreground')}
            onClick={() => showResult(onApply(selected), `Applied ${plan!.name}.`)}>Apply plan</button>
          <button type="button" aria-expanded={details} data-cm-plan-details onClick={() => setDetails(!details)} className={button}>{details ? 'Hide kickoff XI' : 'View kickoff XI'}</button>
        </div>
        {details && <div className="space-y-2" data-cm-plan-lineup>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {preview.rows.map(row => <li key={row.slot} data-cm-plan-row={row.slot} data-cm-plan-player={row.player?.id ?? ''} className="rounded-lg border p-2 min-w-0">
              <span className="font-semibold">{row.label}: {row.player?.name ?? 'No available player'}</span>
              <span className="block text-muted-foreground">{row.player ? `${Math.round(row.player.fitness)}% fitness` : 'No starter'}{row.duty ? ` · ${DUTY_INFO[row.duty].label}` : ''}</span>
              {row.reason && <span className="block text-amber-600 dark:text-amber-400">{row.reason}{row.picked ? `: ${row.picked.name}` : ''}</span>}
            </li>)}
          </ul>
          <p className="text-muted-foreground">Assignments stay with the saved player. If a taker is unavailable or off the pitch, the match uses its usual fallback.</p>
          <dl className="grid grid-cols-2 gap-2" data-cm-plan-assignments>{SET_PIECE_KEYS.map(key => <div key={key}><dt>{SET_PIECE_INFO[key].label}</dt><dd className="font-semibold">{career.squad.find(p => p.id === preview.state.setPieces?.[key])?.name ?? 'Auto pick'}</dd></div>)}</dl>
          <p data-cm-plan-shootout>Shootout order: {preview.state.shootoutOrder?.map(id => career.squad.find(p => p.id === id)?.name).join(', ') || 'Auto'}</p>
        </div>}
        <button type="button" data-cm-plan-delete disabled={!editable} onClick={() => showResult(onDelete(selected), `Removed ${plan!.name}.`)} className={button}>Delete plan</button>
      </div>}
      <p ref={noticeRef} role={refused ? 'alert' : 'status'} aria-live={refused ? 'assertive' : 'polite'} data-cm-plan-notice className="min-h-4">{notice}</p>
    </section>}
  </>;
}
