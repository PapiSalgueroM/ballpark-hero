import { useEffect, useRef, useState } from 'react';
import { moneyIn, renewContract, renewalTerms, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { type RecruitmentBrief, type RecruitmentCommit } from '@/lib/clubManagerRecruitment';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { RecruitmentBriefDesk } from './RecruitmentBriefDesk';

const button = 'min-h-11 min-w-11 rounded-lg border border-border px-3 py-2 text-sm font-bold';

export function SuccessionDesk({ career, market, onCommit, onBack }: {
  career: CareerState; market: MarketPlayer[]; onCommit: RecruitmentCommit; onBack: () => void;
}) {
  const [selected, setSelected] = useState('');
  const [help, setHelp] = useState(false);
  const [brief, setBrief] = useState<RecruitmentBrief>();
  const [notice, setNotice] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const scout = useRef<HTMLButtonElement>(null);
  const root = useRevealScroll<HTMLElement>('succession', { skipFirst: false });
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);

  const owned = [
    ...career.squad.filter(p => !p.onLoan).map(player => ({ player, loanClub: '', optionFee: undefined })),
    ...(career.loanedOut ?? []).map(l => ({ player: l.player, loanClub: l.club, optionFee: l.optionFee })),
  ];
  const starting = new Set(career.xiIds);
  const upcoming = owned.filter(({ player }) => player.contractYears !== undefined && player.contractYears <= 2)
    .sort((a, b) => a.player.contractYears! - b.player.contractYears! || Number(starting.has(b.player.id)) - Number(starting.has(a.player.id))
      || b.player.rating - a.player.rating || a.player.name.localeCompare(b.player.name));
  const row = selected ? upcoming.find(r => r.player.id === selected) : upcoming[0];
  const player = row?.player;
  const years = player?.contractYears ?? 0;
  const cover = player && owned.filter(({ player: p }) => p.position === player.position && p.id !== player.id
    && !starting.has(p.id) && (p.contractYears ?? 0) > Math.max(1, years))
    .sort((a, b) => b.player.rating - a.player.rating || a.player.age - b.player.age || a.player.name.localeCompare(b.player.name))[0];
  const terms = player && renewalTerms(player);
  const cash = moneyIn(career);

  if (brief) return <RecruitmentBriefDesk career={career} market={market} onCommit={onCommit} initialDraft={brief} onBack={() => {
    setBrief(undefined);
    requestAnimationFrame(() => scout.current?.focus({ preventScroll: true }));
  }} />;

  return <section ref={root} aria-labelledby="cm-succession" className="min-w-0 space-y-3">
    <header className="flex items-center justify-between gap-2">
      <button className={button} onClick={onBack}>Back to shortlist</button>
      <h3 ref={title} tabIndex={-1} id="cm-succession" className="text-lg font-black">Squad succession</h3>
      <button className={button} aria-label="Squad succession help" aria-expanded={help} onClick={() => setHelp(!help)}>?</button>
    </header>
    <p className="text-sm">Plan for deals ending over the next two summers. Check who could step up, price a renewal or scout the position.</p>
    {help && <div className="space-y-2 rounded-lg bg-secondary/40 p-3 text-sm">
      <p>For example, if a starting centre-back has one year left, check which reserve at CB has at least two years. Players already in your eleven have a shirt of their own. An outgoing loan with a purchase option can become a permanent sale.</p>
      <p>A plain renewal spends the signing fee now. To look outside the club, open a replacement brief, choose the job and set your spending limit. Saving a name to the shortlist leaves the budget alone.</p>
    </div>}
    {upcoming.length > 0 &&
      <label className="block text-sm font-bold">Deal to review
        <select className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-sm" value={player?.id ?? ''} onChange={e => { setSelected(e.target.value); setNotice(''); }}>
          {!player && <option value="" disabled>Choose another deal</option>}
          {upcoming.map(({ player: p }) => <option key={p.id} value={p.id}>{(p.contractYears ?? 0) <= 1 ? 'This summer' : 'Following summer'} · {p.name} · {p.position}</option>)}
        </select>
      </label>}
    {row && player && terms && <>
      <article className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
        <h4 className="font-bold">{player.name} · {player.position}</h4>
        <p>Age {player.age}, rated {player.rating}. {row.loanClub ? 'On loan at ' + row.loanClub : starting.has(player.id) ? 'In your starting eleven' : 'In your squad'}. His deal in this save ends {years <= 1 ? 'this summer' : 'the following summer'}.</p>
        <h5 className="font-bold">Cover at the club</h5>
        {cover ? <p>{cover.player.name} · {cover.player.position}, age {cover.player.age}, rated {cover.player.rating}. {cover.loanClub ? 'On loan at ' + cover.loanClub : 'Outside your starting eleven'}. {cover.player.contractYears} years on his deal in this save.{cover.optionFee !== undefined && ' The borrowing club has a purchase option for ' + cash(cover.optionFee) + '.'}</p>
          : <p>No other player outside your starting eleven has this primary position and a recorded deal beyond that summer.</p>}
        <button ref={scout} className={button + ' w-full'} onClick={() => setBrief({ position: player.position, job: 'starter', budgetShare: 50 })}>Scout a replacement</button>
      </article>
      <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
        <h4 className="font-bold">Keep {player.name}</h4>
        <p>Plain terms in this save: {terms.years} years at {cash(terms.wage / 1000)} a week. Signing fee {cash(terms.fee)}.{(player.releaseClause ?? 0) > 0 && ' Signing removes his release clause.'}{row.optionFee !== undefined && ' The borrowing club keeps its ' + cash(row.optionFee) + ' purchase option.'}</p>
        {terms.years <= years ? <p>The offered deal ends at the same time as his current one.</p>
          : terms.fee > career.budget ? <p>The fee is {cash(terms.fee - career.budget)} over your transfer budget.</p> : <>
            <p>Transfer budget after signing: {cash(Math.round((career.budget - terms.fee) * 10) / 10)}.</p>
            <button className={button + ' w-full'} onClick={() => {
              const renewed = onCommit(current => current === career ? renewContract(current, player.id) : null);
              if (renewed) setSelected(player.id);
              setNotice(renewed ? player.name + ' renewed for ' + terms.years + ' years. Signing fee paid: ' + cash(terms.fee) + '.' : 'The renewal could not be saved. Check the save notice and review his deal again.');
            }}>Renew for {terms.years} years</button>
          </>}
      </div>
    </>}
    {!upcoming.length && <p className="rounded-lg border border-border p-3 text-sm">No recorded deals end in the next two summers.</p>}
    <p className="text-sm font-bold" role="status">{notice}</p>
  </section>;
}
