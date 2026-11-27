import { useEffect, useMemo, useRef, useState } from 'react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { doorRefusal, moneyIn, ROLE_INFO, wageBill, wageCapOf, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { ALL_POSITIONS } from '@/lib/positionFit';
import {
  addRecruitment, BRIEF_JOBS, recruitmentKey, recruitmentOf, recruitmentTarget, RECRUITMENT_LIMIT,
  resolveRecruitmentTarget, saveRecruitmentBrief, scoutBrief, validBrief, type RecruitmentBrief, type RecruitmentCommit,
} from '@/lib/clubManagerRecruitment';

const field = 'min-h-11 w-full rounded-lg border border-border bg-card px-2 text-sm';
const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-bold';

export function RecruitmentBriefDesk({ career, market, onCommit, onBack, initialDraft }: {
  career: CareerState; market: MarketPlayer[]; onCommit: RecruitmentCommit; onBack: () => void;
  initialDraft?: RecruitmentBrief;
}) {
  const recruitment = recruitmentOf(career);
  const active = validBrief(recruitment?.brief) ? recruitment.brief : undefined;
  const [draft, setDraft] = useState<RecruitmentBrief>(initialDraft ?? active ?? { position: 'CB', job: 'starter', budgetShare: 50 });
  const [reportIndex, setReportIndex] = useState(0);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRevealScroll<HTMLElement>('recruitment-brief', { skipFirst: false });
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const matches = active?.position === draft.position && active.job === draft.job && active.budgetShare === draft.budgetShare;
  const search = useMemo(() => active ? scoutBrief(career, market, active) : null, [career, market, active]);
  const report = search?.reports[reportIndex] ?? search?.reports[0];
  const cash = moneyIn(career);
  const bill = wageBill(career), wageRoom = wageCapOf(career, bill) - bill;
  const targets = recruitment?.targets ?? [];
  const listed = report && targets.some(t => resolveRecruitmentTarget(career, t, market) === report.player);
  const change = (next: RecruitmentBrief) => { setDraft(next); setMessage(''); };
  const run = () => {
    const ok = onCommit(current => current === career ? saveRecruitmentBrief(current, draft) : null);
    if (ok) setReportIndex(0);
    setMessage(ok ? 'Brief saved.' : 'Could not save this brief. Check your save notice and try again.');
  };
  const save = () => {
    if (!report || !active) return;
    const ok = onCommit(current => current === career ? addRecruitment(current, report.player, active) : null);
    setMessage(ok ? report.player.name + ' added to your shortlist.' : 'Could not save this player. Check your shortlist and save notice.');
  };
  const player = report?.player, terms = report?.terms, peer = search?.comparison;
  const refusal = player && doorRefusal(career, player, 'talk');
  return (
    <section ref={root} aria-labelledby="cm-brief-title" className="min-w-0 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <button className={button} onClick={onBack}>{initialDraft ? 'Back to succession' : 'Back to shortlist'}</button>
        <h3 ref={heading} tabIndex={-1} id="cm-brief-title" className="text-lg font-black">Recruitment brief</h3>
        <button className={button + ' min-w-11'} aria-label="Recruitment brief help" aria-expanded={help} onClick={() => setHelp(!help)}>?</button>
      </header>
      <p className="text-sm">Pick a job and a share of the transfer kitty. Your scouts bring back up to three players who fit the fee and signing bonus.</p>
      {help && <div className="rounded-lg bg-secondary/40 p-3 text-sm space-y-2">
        <p>For example, choose CB and Affordable cover with half the kitty. The desk looks for a player asking for rotation minutes or fewer. It tries to match your second centre-back, then picks the cheapest contract at that level.</p>
        <p>First-team challenger ranks current ratings. Under-21 successor ranks current ratings among players aged 20 or younger and prefers youth on a tie. Growth and the final deal are open questions.</p>
        <p>Run a new search when your needs change. Saved players keep the brief that found them. Use Find in Buy on their shortlist card to start the usual talks.</p>
      </div>}
      <div className="grid grid-cols-2 gap-2">
        <label className="block min-w-0 text-sm">Position<select className={field} value={draft.position} onChange={e => change({ ...draft, position: e.target.value as RecruitmentBrief['position'] })}>
          {ALL_POSITIONS.map(p => <option key={p}>{p}</option>)}
        </select></label>
        <label className="block min-w-0 text-sm">Upfront limit<select className={field} value={draft.budgetShare} onChange={e => change({ ...draft, budgetShare: Number(e.target.value) as RecruitmentBrief['budgetShare'] })}>
          {[25, 50, 100].map(n => <option key={n} value={n}>{n}% · {cash(career.budget * n / 100)}</option>)}
        </select></label>
        <label className="col-span-2 block text-sm">Squad job<select className={field} value={draft.job} onChange={e => change({ ...draft, job: e.target.value as RecruitmentBrief['job'] })}>
          {Object.entries(BRIEF_JOBS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
      </div>
      <p className="text-xs text-muted-foreground">{draft.job === 'cover'
        ? 'Looks for rotation, backup or prospect terms. Match your second player at this position for the lowest total cost. With one player, use his rating as the target.'
        : draft.job === 'successor' ? 'Looks for the strongest current player aged 20 or younger. At the same rating, the younger player comes first.'
          : 'Looks for the strongest current player at this position. At the same rating, the cheaper package comes first.'}</p>
      {!matches && <button className={button + ' w-full bg-primary text-primary-foreground'} onClick={run}>Run this brief</button>}
      {matches && search && <>
        <p className="text-sm text-muted-foreground">{peer ? `Your comparison at ${draft.position} is ${peer.name}, rated ${peer.rating}.` : `Nobody in your squad has ${draft.position} as their primary position.`}</p>
        {!search.reports.length && <p role="status">No players fit these terms. Try another position, job or spending limit.</p>}
        {!!search.reports.length && <div role="group" aria-label="Scout reports" className="grid grid-cols-3 gap-1.5">
          {search.reports.map((r, i) => <button key={recruitmentKey(recruitmentTarget(career, r.player))} aria-pressed={r === report} className={button + ' min-w-0 break-words px-1 aria-pressed:border-primary'} onClick={() => { setReportIndex(i); setMessage(''); }}>{r.player.name}</button>)}
        </div>}
        {player && terms && <article aria-label={`Report on ${player.name}`} className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
          <h4 className="font-bold">{player.name} · {player.position} · {player.rating}</h4>
          <p>{player.club}{player.generated && ' · MADE UP'} · Age {player.age}</p>
          <p>{peer ? player.rating === peer.rating ? `Level with ${peer.name} on game rating.` : `${Math.abs(player.rating - peer.rating)} rating points ${player.rating > peer.rating ? 'above' : 'below'} ${peer.name}.` : 'Fills an open primary position.'}</p>
          <p>{ROLE_INFO[terms.role].label} terms carry a playing-time promise. Plan to use him in {Math.round(100 * ROLE_INFO[terms.role].share)}% of the matches he is fit for.</p>
          <p>Listed fee {cash(player.price)} + signing bonus {cash(terms.bonus)}. Wages {cash(terms.wage / 1000)} a week for {terms.years} years. The seller can ask for more in talks.</p>
          <p><strong>Estimated commitment {cash(terms.total)}.</strong> At those terms you would have {cash(career.budget - terms.upfront)} left for other fees and bonuses.</p>
          {terms.wage > wageRoom && <p className="text-amber-400">This wage would put you {cash((terms.wage - wageRoom) / 1000)} a week over the board ceiling.</p>}
          {refusal && <p className="text-muted-foreground">{refusal}</p>}
          <button className={button + ' w-full'} disabled={listed || targets.length >= RECRUITMENT_LIMIT} onClick={save}>
            {listed ? 'Already shortlisted' : targets.length >= RECRUITMENT_LIMIT ? 'Shortlist full' : 'Shortlist from this brief'}
          </button>
        </article>}
      </>}
      <p aria-live="polite" className="text-sm">{message}</p>
    </section>
  );
}
