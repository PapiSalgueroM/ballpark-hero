import { useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { AGENTS, getAgentDef } from '@/lib/soccerCareerLife';
import { agentReviewEligibility, readAgentReview } from '@/lib/soccerAgentReview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function AgentReviewCard({ career, onChange }: { career: CareerState; onChange: (agentId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<'help' | 'choices' | 'review'>('help');
  const [choice, setChoice] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitted = useRef(false);
  const current = getAgentDef(career.agentId);
  const selected = getAgentDef(choice);
  const eligibility = agentReviewEligibility(career);
  const receipt = readAgentReview(career);
  const saved = !!receipt && receipt.sourceYear === career.seasons[career.seasons.length - 1]?.year;
  if (!current || career.phase !== 'playing' || career.retired || (!eligibility.available && !saved)) return null;

  const changeOpen = (next: boolean) => {
    if (next) { setScreen('help'); setChoice(''); submitted.current = false; }
    setOpen(next);
  };
  const confirm = () => {
    if (submitted.current || !eligibility.available || saved || !selected || selected.id === current.id) return;
    submitted.current = true;
    setOpen(false);
    onChange(selected.id);
  };
  const terms = (agent: typeof AGENTS[number]) => <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
    <dt className="text-muted-foreground">Offer wage factor</dt><dd className="text-right font-semibold">{agent.wageMult.toFixed(2)}x</dd>
    <dt className="text-muted-foreground">Income commission</dt><dd className="text-right font-semibold">{Math.round(agent.incomeCut * 100)}%</dd>
    <dt className="text-muted-foreground">Transfer commission</dt><dd className="text-right font-semibold">{Math.round(agent.transferCut * 100)}%</dd>
  </dl>;

  return <div data-agent-review-status={saved ? 'saved' : 'available'} className="rounded-xl border border-amber-500/30 bg-card p-3 text-sm">
    <p className="font-bold">Your representation</p>
    <p className="mt-1 text-xs text-muted-foreground">{current.emoji} {current.name}{saved ? '. Your representation choice is saved for this season.' : '. Compare terms before your next deal.'}</p>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button ref={trigger} data-agent-review-open variant="outline" className="mt-3 min-h-11 w-full whitespace-normal">{saved ? 'Agent review help' : 'Review your agent'}</Button></DialogTrigger>
      <DialogContent data-agent-review-dialog className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 overflow-hidden rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:opacity-100"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} data-agent-review-title tabIndex={-1} className="shrink-0 pr-12 text-base">{saved ? 'Your agent choice' : 'Review your representation'}</DialogTitle>
        <DialogDescription className="shrink-0">Current: {current.name}. Your current deal stays the same.</DialogDescription>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-xs leading-relaxed">
          {screen === 'help' ? <div data-agent-review-help className="space-y-3">
            <p>Compare an agent's wage factor and commissions before switching. You can also represent yourself.</p>
            <p>Switching affects future signings and future income commission. Income commission covers wages plus sponsorship income. Your current wage and already-paid fees stay the same.</p>
            <p>Transfer commission follows the existing deal rules. A stronger wage factor does not guarantee a club offer or a squad place.</p>
            <p>You can change representation once per recorded season. Moving clubs, changing agent through an event or reloading cannot unlock another review that season.</p>
            <p>Example: a later offer with a base weekly wage of 1,000 and a 1.10x factor signs at 1,100. Reviewing or switching now does not change your current wage.</p>
            {saved && <p className="font-semibold">Your switch is saved. Play a later recorded season before making another change.</p>}
          </div> : screen === 'choices' ? <div data-agent-review-choices className="space-y-3">
            <p>These are the terms used by the game for future deals and fees.</p>
            {AGENTS.map(agent => <div key={agent.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 font-bold">{agent.emoji} {agent.name}{agent.id === current.id ? ' (current)' : ''}</p>
              {terms(agent)}
              {agent.id !== current.id && <Button data-agent-review-choice={agent.id} aria-pressed={choice === agent.id} variant={choice === agent.id ? 'default' : 'outline'} onClick={() => setChoice(agent.id)} className="mt-2 min-h-11 w-full whitespace-normal">{choice === agent.id ? 'Selected' : 'Choose'} {agent.name}</Button>}
            </div>)}
          </div> : selected ? <div data-agent-review-review className="space-y-3">
            <p className="font-bold">{current.name} to {selected.name}</p>
            {terms(selected)}
            <p>Your current wage, savings and already-paid agent fees stay the same. Future deals use these terms.</p>
            <p>This uses your representation change for this recorded season.</p>
            <Button data-agent-review-choices-open variant="outline" onClick={() => setScreen('choices')} className="min-h-11 w-full whitespace-normal">Choose another agent</Button>
          </div> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button data-agent-review-cancel variant="outline" onClick={() => setOpen(false)} className="min-h-11 min-w-11 flex-1">Back</Button>
          <Button data-agent-review-help-open variant="outline" aria-label="Agent review rules" onClick={() => setScreen('help')} className="min-h-11 min-w-11">?</Button>
          {!saved && (screen === 'help' ? <Button data-agent-review-choices-open onClick={() => setScreen('choices')} className="min-h-11 min-w-11 flex-1 whitespace-normal">Compare agents</Button> : screen === 'choices' ? <Button data-agent-review-review-open disabled={!selected || selected.id === current.id || !eligibility.available} onClick={() => setScreen('review')} className="min-h-11 min-w-11 flex-1 whitespace-normal">Review switch</Button> : <Button data-agent-review-confirm disabled={!selected || selected.id === current.id || !eligibility.available} onClick={confirm} className="min-h-11 min-w-11 flex-1 whitespace-normal">Make switch</Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
