import { useState } from 'react';
import type { CareerState } from '@/lib/clubManager';
import { academyGraduates, academyMentors, canStartMentoring, MENTORING_GAMES, MENTORING_MINUTES } from '@/lib/clubManagerMentoring';

type Props = { career: CareerState; onStart: (graduate: string, mentor: string) => boolean };

export default function AcademyMentoringCard({ career, onStart }: Props) {
  const [chosenGraduate, setGraduate] = useState('');
  const [chosenMentor, setMentor] = useState('');
  const [failed, setFailed] = useState(false);
  const stored = career.academy?.mentoring;
  const plan = stored?.club === career.clubName ? stored : undefined;
  const total = plan?.matches.reduce((sum, m) => sum + m.minutes, 0) ?? 0;
  const graduates = academyGraduates(career);
  const graduate = graduates.find(p => p.id === chosenGraduate) ?? graduates[0];
  const mentors = graduate ? academyMentors(career, graduate) : [];
  const mentor = mentors.find(p => p.id === chosenMentor) ?? mentors[0];
  const select = 'mt-1 block min-h-11 w-full rounded-md border border-border bg-card px-2';
  if (!career.academy) return null;
  return <details className="mt-3 rounded-xl border border-border bg-card px-3 text-sm">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">First-team mentoring</summary>
    <div className="space-y-2 pb-3">
      <p>Pair an outfield academy graduate aged 21 or younger with a permanent teammate aged 27 or older in the same position group. You get one pairing each season.</p>
      <p>Pick both in Tactics or bring one on while the other is still playing. Reach {MENTORING_MINUTES} minutes together over the next {MENTORING_GAMES} league games for one development point, up to the graduate’s potential. Substituting one for the other adds zero shared minutes.</p>
      {plan && <div className="space-y-1 rounded-md bg-secondary/40 p-2">
        <p className="font-semibold">{plan.graduate.name} with {plan.mentor.name}</p>
        <p>Season {plan.season} · {plan.matches.length}/{MENTORING_GAMES} league games · {total}/{MENTORING_MINUTES} shared minutes</p>
        {plan.matches.length > 0 && <ol>{plan.matches.map(m => <li key={m.round}>{m.opponent} · {m.minutes} shared minutes</li>)}</ol>}
        {plan.matches.length === MENTORING_GAMES && <p className="font-semibold">{plan.gain
          ? 'Plan complete. Your graduate earned +1 OVR.'
          : total < MENTORING_MINUTES ? 'Plan complete. Too few shared minutes for a rating point.'
            : 'Plan complete. No rating point was available for this graduate.'}</p>}
      </div>}
      {(!plan || plan.season < career.season) && (canStartMentoring(career) ? graduate ? <>
        <label className="block" htmlFor="cm-mentoring-graduate">Academy graduate</label>
        <select id="cm-mentoring-graduate" className={select} value={graduate.id} onChange={e => { setGraduate(e.target.value); setFailed(false); }}>
          {graduates.map(p => <option key={p.id} value={p.id}>{p.name} · {p.position} · {p.age}</option>)}
        </select>
        {mentor ? <>
          <label className="block" htmlFor="cm-mentoring-mentor">Senior mentor</label>
          <select id="cm-mentoring-mentor" className={select} value={mentor.id} onChange={e => { setMentor(e.target.value); setFailed(false); }}>
            {mentors.map(p => <option key={p.id} value={p.id}>{p.name} · {p.position} · {p.age}</option>)}
          </select>
          <button type="button" className="min-h-11 rounded-md bg-primary px-3 font-semibold text-primary-foreground" onClick={() => setFailed(!onStart(graduate.id, mentor.id))}>Start four-match plan</button>
          {failed && <p role="status">The plan could not be saved. Check the active career and try again.</p>}
        </> : <p>No permanent senior teammate in this graduate’s position group qualifies.</p>}
      </> : <p>Promote an eligible outfield prospect to choose a pairing.</p>
        : <p>Open a plan between matches with at least four league dates left this season.</p>)}
    </div>
  </details>;
}
