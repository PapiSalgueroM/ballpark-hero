import { lazy, Suspense, useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { bankMentorClinic, canVolunteerAtAcademy, createCareerMentor, mentorClinicYear, validMentor, type CareerMentorReason, type CareerMentorStatus } from '@/lib/soccerCareerMentor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PassingDecisionBoard = lazy(() => import('./PassingDecisionBoard'));
const action = 'min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold';

const STATUS: Record<CareerMentorStatus, string> = {
  active: 'Mentoring together', paused: 'Mentoring paused', ended: 'Mentorship ended', graduated: 'Mentorship completed',
};
const REASON: Record<CareerMentorReason, string> = {
  season: 'Same club and at least 10 senior appearances.',
  clinic: 'The passing clinic and five or more senior appearances counted as a mentoring year.',
  'few-apps': 'Too few senior appearances this season. Progress paused.',
  'serious-injury': 'A serious injury interrupted this season. Progress paused.',
  banned: 'A full season ban interrupted this year. Progress paused.',
  prison: 'A year away in prison interrupted this season. Progress paused.',
  'club-move': 'Your clubs changed. Shared-club mentoring ended.',
};

function MentorClinic({ name, club, onBack, onBank }: { name: string; club: string; onBack: () => void; onBank: (reads: number) => void }) {
  const [reads, setReads] = useState<number | null>(null);
  if (reads === null) return <Suspense fallback={<p role="status">Opening passing clinic…</p>}>
    <PassingDecisionBoard coaching onBack={onBack} onComplete={score => setReads(score / 20)} />
  </Suspense>;
  return <div className="space-y-3 text-sm" aria-live="polite">
    <p className="font-bold">{reads}/5 correct reads</p>
    {reads >= 3 ? <>
      <p>Use your training slot to coach {name}. Five appearances at {club} will qualify this mentoring year.</p>
      <button type="button" className={action} onClick={() => onBank(reads)}>Use my training slot</button>
    </> : <p>Get three reads right to bank a clinic. Your training slot is still available.</p>}
    <button type="button" className={action} onClick={onBack}>Back to academy</button>
  </div>;
}

export function CareerMentorTile({ career, onCareer }: { career: CareerState; onCareer?: (fn: (prev: CareerState) => CareerState) => void }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [clinicYear, setClinicYear] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mentor = validMentor(career.mentor);
  if (!mentor && (!onCareer || !canVolunteerAtAcademy(career))) return null;
  const availableYear = mentorClinicYear(career);
  const leaveClinic = () => setClinicYear(null);
  const close = () => { setOpen(false); setHelp(false); leaveClinic(); };
  return <Dialog open={open} onOpenChange={next => next ? setOpen(true) : close()}>
    <DialogTrigger asChild>
      <button ref={trigger} type="button" data-career-mentor-tile className="w-full min-h-[64px] rounded-xl border border-border bg-card p-3 text-left">
        <span className="block text-sm font-semibold">🤝 Academy mentor</span>
        {mentor ? <><span className="block text-[10px] font-bold text-muted-foreground">GENERATED academy player</span>
        <span className="block text-xs">{mentor.name} · {mentor.position}</span>
        <span className="block text-xs text-muted-foreground">{mentor.progress}/3 mentoring seasons · {STATUS[mentor.status]}</span></> : <span className="block text-xs text-muted-foreground">Volunteer at {career.currentClub}</span>}
      </button>
    </DialogTrigger>
    <DialogContent data-career-mentor-dialog className="max-w-md max-h-[85dvh] overflow-y-auto [&>button]:min-h-11 [&>button]:min-w-11"
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader className="pr-8">
        <DialogTitle>{help ? 'How academy mentoring works' : mentor?.name ?? 'Volunteer at the academy'}</DialogTitle>
        <DialogDescription>GENERATED academy player. Fictional development within your saved career.</DialogDescription>
      </DialogHeader>
      {clinicYear === null && <button type="button" data-career-mentor-help aria-label={help ? 'Back to mentor details' : 'Academy mentoring help'}
        className="min-h-11 min-w-11 justify-self-start rounded-xl border border-border px-3 text-sm"
        onClick={() => setHelp(!help)}>{help ? 'Back to details' : '?'}</button>}
      {help ? <div className="space-y-3 text-sm" data-career-mentor-rules>
        <p>Say yes to the Youth Mentor event, or volunteer after making appearances in three senior seasons. You mentor one academy player.</p>
        <p>Ten appearances at the same club earn a mentoring year. Use your seasonal training slot on a passing clinic to qualify with five appearances. A serious injury, full season ban or prison still pauses progress.</p>
        <p>A transfer, loan or retirement ends mentoring and keeps its history. Three completed mentoring years finish the programme. Age follows the saved years, so interruptions can mean finishing later than age 19.</p>
        <p>For example, 12 appearances earn your first year. In the next season, six appearances and a completed clinic take you to 2/3. One more qualifying season graduates your prospect.</p>
        <p>There are no first-team appearances, ratings, rivalries or trophies recorded for this fictional player.</p>
      </div> : !mentor ? <div className="space-y-3 text-sm">
        <p>Work with one youngster at {career.currentClub}. Three qualifying seasons graduate your prospect. Moving clubs ends the spell.</p>
        <button type="button" className={action} onClick={() => onCareer?.(prev => canVolunteerAtAcademy(prev) && prev.currentClub === career.currentClub ? createCareerMentor(prev) : prev)}>Meet your academy player</button>
      </div> : clinicYear !== null && clinicYear === availableYear && onCareer ? <MentorClinic name={mentor.name} club={mentor.club} onBack={leaveClinic}
        onBank={reads => { onCareer(prev => bankMentorClinic(prev, clinicYear, mentor.club, mentor.name, reads)); leaveClinic(); }} /> : <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3">
          <div><dt className="text-xs text-muted-foreground">Shared academy club</dt><dd>{mentor.club}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Age at last update</dt><dd>{mentor.age}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Mentoring seasons</dt><dd>{mentor.progress}/3 completed</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{STATUS[mentor.status]}</dd></div>
        </dl>
        {mentor.clinic && <p className="text-sm font-semibold">Passing clinic · {mentor.clinic.year}/{String(mentor.clinic.year + 1).slice(-2)} · {mentor.clinic.reads}/5 correct</p>}
        {onCareer && availableYear !== null && <button type="button" className={action} onClick={() => setClinicYear(availableYear)}>Coach a passing clinic</button>}
        {mentor.endReason && <p className="text-xs text-muted-foreground">{mentor.endReason === 'retirement' ? 'Mentorship ended when you retired from playing.' : 'Mentorship ended when you left the shared club.'}</p>}
        <p className="text-xs text-muted-foreground">Started for {mentor.startYear}/{String(mentor.startYear + 1).slice(-2)}. First-team outcomes are not recorded.</p>
        <ol className="space-y-2" data-career-mentor-history aria-label="Saved mentoring seasons">
          {[...mentor.history].reverse().map(entry => <li key={entry.year} className="rounded-xl border border-border p-3">
            <p className="font-semibold">{entry.year}/{String(entry.year + 1).slice(-2)} · {STATUS[entry.status]}</p>
            <p className="text-xs text-muted-foreground">{REASON[entry.reason]}</p>
            {entry.clinicReads !== undefined && <p className="text-xs">Passing clinic · {entry.clinicReads}/5 correct</p>}
            <p className="text-xs">{entry.progress}/3 completed · age {entry.age}</p>
          </li>)}
        </ol>
        {mentor.history.length === 0 && <p className="text-xs text-muted-foreground">No senior season has been recorded since this mentorship began.</p>}
      </div>}
      <button type="button" data-career-mentor-back className="min-h-11 rounded-xl border border-border px-3 text-sm" onClick={close}>Back to your career</button>
    </DialogContent>
  </Dialog>;
}
