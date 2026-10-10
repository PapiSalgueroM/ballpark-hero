import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { currentUsCareerProgramme, saveUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus, usProgrammeResults, usProgrammeStateValid, type ProgrammeCareer, type ProgrammeChoice, type ProgrammeSection } from '@/lib/usCareerProgramme';
import type { UsSport } from '@/lib/usCoachCareer';

export default function UsCareerProgramme({ career, sport, onChange }: { career: ProgrammeCareer; sport: UsSport; onChange: (next: ProgrammeCareer) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ProgrammeSection | 'menu' | 'help'>('help');
  const returnMode = useRef<ProgrammeSection | 'menu'>('menu');
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const tiles = useRef<Partial<Record<ProgrammeSection, HTMLButtonElement | null>>>({});
  const listTop = useRef(0);
  const helpTop = useRef(0);
  const selected = useRef<ProgrammeSection | null>(null);
  const pending = useRef<{ top: number; target: ProgrammeSection | 'help' } | null>(null);
  const menus = usProgrammeMenus(career, sport);
  const held = currentUsCareerProgramme(career, sport);
  const results = usProgrammeResults(career);
  const last = results[results.length - 1];
  const disabled = !usProgrammeStateValid(career) || career.retired || (career.suspendedSeasons ?? 0) > 0;
  useEffect(() => {
    if (!open) return;
    const restore = pending.current;
    pending.current = null;
    if (restore) {
      if (body.current) body.current.scrollTop = restore.top;
      (restore.target === 'help' ? helpButton.current : tiles.current[restore.target])?.focus({ preventScroll: true });
    } else { if (body.current) body.current.scrollTop = 0; heading.current?.focus({ preventScroll: true }); }
  }, [open, mode]);
  const choose = (section: ProgrammeSection, choice: ProgrammeChoice) => {
    const next = { ...(held ?? usProgrammeDefaults()), [section]: choice };
    onChange(saveUsCareerProgramme(career, sport, next));
  };
  const button = 'min-h-11 min-w-11 rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-primary';
  const selectedMenu = menus.find(m => m.id === mode);
  return <section data-us-programme-panel className="mt-4 rounded-xl border border-primary/30 p-3 text-left">
    <h3 className="text-sm font-black">Your season programme</h3>
    <p className="mt-1 text-xs text-muted-foreground">{held ? 'Programme saved for ' + career.year + ' at ' + career.team + '.' : 'Choose how to approach the season. Your usual routine stays available.'}</p>
    {last && <div data-us-programme-result className="mt-2 text-xs">
      <p className="font-bold">{last.year}: {last.outcome === 'interrupted' ? 'Programme interrupted' : 'Programme completed'}</p>
      {last.decisions.map(d => <p key={d.section}>{d.label}: {d.outcome}{d.target !== undefined ? ' (' + (d.actual ?? 'not recorded') + '/' + d.target + ' ' + d.unit + ')' : ''}.</p>)}
      {last.bonusGross > 0 && <p>Bonus: $ {last.bonusGross.toFixed(4)}M gross, $ {last.bonusNet.toFixed(4)}M banked.</p>}
      {last.partnershipProgress > 0 && <p>Partnership progress: {last.partnershipProgress}/3.</p>}
    </div>}
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (next) { returnMode.current = 'menu'; setMode('help'); } }}>
      <DialogTrigger asChild><button data-us-programme-open className={button + ' mt-3 w-full'}>Plan your season</button></DialogTrigger>
      <DialogContent data-us-programme="dialog" className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 [&>button:last-child]:hidden">
        <header className="shrink-0 border-b border-border p-3">
          <DialogTitle>{sport.toUpperCase()} season programme</DialogTitle>
          <DialogDescription>Season {career.year}, {career.team}. Choices apply once when this team plays the year.</DialogDescription>
          <div className="mt-2 flex items-center gap-2">
            <button data-us-programme-back className={button} onClick={() => {
              if (mode === 'help') { pending.current = { top: helpTop.current, target: 'help' }; setMode(returnMode.current); }
              else if (mode !== 'menu') { if (selected.current) pending.current = { top: listTop.current, target: selected.current }; setMode('menu'); }
              else setOpen(false);
            }}>Back</button>
            <button ref={helpButton} data-us-programme-help aria-label="Season programme help" className={button} onClick={() => { if (mode !== 'help') { returnMode.current = mode; helpTop.current = body.current?.scrollTop ?? 0; } setMode('help'); }}>?</button>
            <button data-us-programme-close className={button + ' ml-auto'} onClick={() => setOpen(false)}>Close</button>
          </div>
        </header>
        <div ref={body} data-us-programme-scroll className="min-h-0 overflow-y-auto p-3">
          <h3 ref={heading} tabIndex={-1} className="mb-2 text-sm font-black">{mode === 'help' ? 'How your programme works' : mode === 'menu' ? 'Choose a season decision' : selectedMenu?.label}</h3>
          {mode === 'help' ? <div className="space-y-2 text-sm">
            <p>These are choices for your generated career. Nothing changes until you play the season. Moving teams cancels the pending programme.</p>
            <p>Workload trades form against injury risk. Tactical preparation changes existing simulation inputs. Your real season decides stats, awards and injuries together.</p>
            <p>Coach targets use games played. Partnership progress needs enough games at this team in consecutive seasons. A missed year resets its progress. Teammates are described by role, with no invented real player.</p>
            <p>Bonus targets use your saved position stats and enough games played. A successful challenge adds 2% or 5% of that season's salary to gross earnings; 45% reaches the bank. Targets and rewards never alter the recorded stats.</p>
            <p>Veteran adaptation is available from age 30. It trades form for durability this season and earns health +3 for next year after games played. It cannot promise another contract or prevent retirement.</p>
            <p>Example: Prioritize recovery adds 8 to season health, capped at 100, and subtracts 6 from season morale. Injury losses still count. After the sim, temporary preparation is removed before normal career growth.</p>
            <p>A suspension or a season with no games interrupts the programme and pays no reward. Your usual routine preserves the original simulation.</p>
            <button data-us-programme-start className={button + ' w-full'} onClick={() => setMode(returnMode.current)}>Continue to programme</button>
          </div> : mode === 'menu' ? <div className="grid grid-cols-2 gap-2">
            {menus.map(menu => <button key={menu.id} ref={node => { tiles.current[menu.id] = node; }} data-us-programme-tile={menu.id} className={button + ' text-left'} onClick={() => { listTop.current = body.current?.scrollTop ?? 0; selected.current = menu.id; setMode(menu.id); }}><span className="block">{menu.label}</span><span className="mt-1 block text-xs text-muted-foreground">{menu.options.find(o => o.id === (held?.[menu.id] ?? 'normal'))?.label}</span></button>)}
            <button data-us-programme-clear disabled={disabled || !held} className={button + ' col-span-2 disabled:opacity-50'} onClick={() => onChange(saveUsCareerProgramme(career, sport, null))}>Use your usual routine</button>
          </div> : <div className="space-y-2">
            {selectedMenu?.options.map(option => <button key={option.id} disabled={disabled} aria-pressed={(held?.[selectedMenu.id] ?? 'normal') === option.id} data-us-programme-choice={selectedMenu.id + ':' + option.id} className={button + ' w-full text-left disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary/10'} onClick={() => choose(selectedMenu.id, option.id)}><span className="block">{option.label}</span><span className="mt-1 block text-xs font-normal">{option.effect}</span></button>)}
            {disabled && <p className="text-xs text-muted-foreground">Choices are unavailable while retired, suspended or when the saved programme record is incomplete.</p>}
            <p className="text-xs text-muted-foreground">Each choice saves immediately. You can change it before playing.</p>
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
