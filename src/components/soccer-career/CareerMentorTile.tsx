import { useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { validMentor, type CareerMentorReason, type CareerMentorStatus } from '@/lib/soccerCareerMentor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const STATUS: Record<CareerMentorStatus, string> = {
  active: 'Mentoring together', paused: 'Mentoring paused', ended: 'Mentorship ended', graduated: 'Mentorship completed',
};
const REASON: Record<CareerMentorReason, string> = {
  season: 'Same club and at least 10 senior appearances.',
  'few-apps': 'Fewer than 10 senior appearances. Progress paused.',
  'serious-injury': 'A serious injury interrupted this season. Progress paused.',
  banned: 'A full season ban interrupted this year. Progress paused.',
  prison: 'A year away in prison interrupted this season. Progress paused.',
  'club-move': 'Your clubs changed. Shared-club mentoring ended.',
};

export function CareerMentorTile({ career }: { career: CareerState }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const mentor = validMentor(career.mentor);
  if (!mentor) return null;
  return <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setHelp(false); }}>
    <DialogTrigger asChild>
      <button ref={trigger} type="button" data-career-mentor-tile className="w-full min-h-[64px] rounded-xl border border-border bg-card p-3 text-left">
        <span className="block text-sm font-semibold">🤝 Academy mentor</span>
        <span className="block text-[10px] font-bold text-muted-foreground">GENERATED academy player</span>
        <span className="block text-xs">{mentor.name} · {mentor.position}</span>
        <span className="block text-xs text-muted-foreground">{mentor.progress}/3 mentoring seasons · {STATUS[mentor.status]}</span>
      </button>
    </DialogTrigger>
    <DialogContent data-career-mentor-dialog className="max-w-md max-h-[85dvh] overflow-y-auto [&>button]:min-h-11 [&>button]:min-w-11"
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader className="pr-8">
        <DialogTitle>{help ? 'How academy mentoring works' : mentor.name}</DialogTitle>
        <DialogDescription>GENERATED academy player. Fictional development within your saved career.</DialogDescription>
      </DialogHeader>
      <button type="button" data-career-mentor-help aria-label={help ? 'Back to mentor details' : 'Academy mentoring help'}
        className="min-h-11 min-w-11 justify-self-start rounded-xl border border-border px-3 text-sm"
        onClick={() => setHelp(!help)}>{help ? 'Back to details' : '?'}</button>
      {help ? <div className="space-y-3 text-sm" data-career-mentor-rules>
        <p>Say yes to the Youth Mentor event to start one saved academy mentorship. Repeated events keep the same player.</p>
        <p>A recorded senior season at the same club with at least 10 appearances adds one mentoring year. A serious injury, fewer appearances, a full season ban or prison pauses progress.</p>
        <p>A transfer, loan or retirement ends mentoring and keeps its history. Three completed mentoring years finish the programme. Age follows the saved years, so interruptions can mean finishing later than age 19.</p>
        <p>Example: 12 appearances at your shared club takes progress from 0/3 to 1/3. A following season with six appearances leaves it at 1/3. Two more qualifying seasons complete 3/3.</p>
        <p>There are no first-team appearances, ratings, rivalries or trophies recorded for this fictional player.</p>
      </div> : <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3">
          <div><dt className="text-xs text-muted-foreground">Shared academy club</dt><dd>{mentor.club}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Age at last update</dt><dd>{mentor.age}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Mentoring seasons</dt><dd>{mentor.progress}/3 completed</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{STATUS[mentor.status]}</dd></div>
        </dl>
        {mentor.endReason && <p className="text-xs text-muted-foreground">{mentor.endReason === 'retirement' ? 'Mentorship ended when you retired from playing.' : 'Mentorship ended when you left the shared club.'}</p>}
        <p className="text-xs text-muted-foreground">Started for {mentor.startYear}/{String(mentor.startYear + 1).slice(-2)}. First-team outcomes are not recorded.</p>
        <ol className="space-y-2" data-career-mentor-history aria-label="Saved mentoring seasons">
          {[...mentor.history].reverse().map(entry => <li key={entry.year} className="rounded-xl border border-border p-3">
            <p className="font-semibold">{entry.year}/{String(entry.year + 1).slice(-2)} · {STATUS[entry.status]}</p>
            <p className="text-xs text-muted-foreground">{REASON[entry.reason]}</p>
            <p className="text-xs">{entry.progress}/3 completed · age {entry.age}</p>
          </li>)}
        </ol>
        {mentor.history.length === 0 && <p className="text-xs text-muted-foreground">No senior season has been recorded since this mentorship began.</p>}
      </div>}
      <button type="button" data-career-mentor-back className="min-h-11 rounded-xl border border-border px-3 text-sm" onClick={() => { setOpen(false); setHelp(false); }}>Back to your career</button>
    </DialogContent>
  </Dialog>;
}
