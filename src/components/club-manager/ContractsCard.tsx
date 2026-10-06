import { useState } from 'react';
import { cn } from '@/lib/utils';
import { money, moneyIn, wageBill, wageCapFrom, renewalTerms, renewalTermsWithClause, renewContract, renewContractWithClause, expiringPlayers, sellValue, severanceFor, severanceBill, releaseBlock, freeAgentBlock, freeAgentTerms, releasePlayer, signFreeAgent } from '@/lib/clubManager';
import type { CareerState, CMPlayer, ReleaseBlock, FreeAgentBlock, FreeAgent } from '@/lib/clubManager';
import { ratingTint, MadeUpTag } from '@/components/club-manager/SquadScreen';
import { CelebrationStyles } from '@/components/club-manager/Celebration';
import { DeskCueLine, useDeskCue } from '@/components/club-manager/deskCue';
import type { DeskCueRead } from '@/components/club-manager/deskCue';

/* Round 619 review: what the button says when the engine would refuse, so a
   disabled button always says why. Keyed on the engine's own reason codes, so
   the screen cannot invent a rule the engine does not have. */
const RELEASE_BLOCK_COPY: Record<ReleaseBlock, { face: string; title: string }> = {
  midMatch: { face: 'Match on', title: 'Finish the match first. Nobody gets released at half time.' },
  onLoan: { face: 'On loan', title: 'He is here on loan, so he is not yours to release.' },
  lastKeeper: { face: 'Only keeper', title: 'He is your only keeper. Sign another one first.' },
  squadSize: { face: 'Squad too small', title: 'The squad is down to 14 or fewer, and nobody else can leave until you add players.' },
  squadRules: { face: 'In a deal', title: 'He is part of a deal on the table right now.' },
  seniorFloor: { face: 'Need 12 seniors', title: 'You need at least 12 senior players, so nobody can go until you sign someone.' },
};

const FREE_AGENT_BLOCK_COPY: Record<FreeAgentBlock, { face: string; title: string }> = {
  notInPool: { face: 'Gone', title: 'He is not on the free agent list any more.' },
  inSquad: { face: 'In your squad', title: 'He is already in your squad.' },
  releasedByYou: { face: 'You let him go', title: 'You released him, so he will not sign for you again.' },
  justLeft: { face: 'Just left you', title: 'His deal with you ran out this summer, so you cannot take him straight back this season.' },
  notInterested: { face: 'Not interested', title: 'Too good to sign for your club as a free agent.' },
  squadFull: { face: 'Squad full', title: 'You already have 30 players.' },
  overCap: { face: 'Over the cap', title: 'His wage would take you over the wage cap.' },
  cantAfford: { face: 'Too dear', title: 'You cannot cover his signing on fee.' },
};

const FREE_AGENT_REASON: Record<FreeAgent['reason'], string> = {
  released: 'you let him go',
  expired: 'deal ran out',
  unattached: 'no club',
};

interface ContractsCardProps {
  career: CareerState;
  onRenew: (playerId: string) => void;
  onRenewWithClause: (playerId: string) => void;
  /** Round 619: end a deal early. The cost is shown before it is agreed. */
  onRelease?: (playerId: string) => void;
  /** Round 619: sign a man with no club. Works with the window shut. */
  onSignFreeAgent?: (name: string) => void;
}

/**
 * Round 105: the wage bill and everyone whose deal is running out.
 *
 * Keeping a 92 rated superstar used to cost exactly what keeping a 68 rated
 * squad player cost, which is nothing, so there was no reason to ever let
 * anyone go. Now every player is on a wage and a deal, the board has a
 * ceiling, and a player you never sit down with walks out for free in the
 * summer with his sale value already collapsed.
 *
 * Round 193: this card was built in 105 and NEVER MOUNTED, so renewals have
 * been unreachable since the wage engine shipped: deals ticked down and
 * players walked with no way to sit them down. It lives on the Squad tab
 * now. And every renewal is a real negotiation with two shapes: the plain
 * deal at his full ask, or 88 percent of the wage in exchange for a release
 * clause at 1.5x his sell value TODAY, an exit door any club can pay. His
 * value grows, the clause does not, and a plain renewal later is the only
 * way to delete it. The clause section below the expiring list keeps every
 * door you have signed in plain sight.
 */
export function ContractsCard({ career, onRenew, onRenewWithClause, onRelease, onSignFreeAgent }: ContractsCardProps) {
  /* Round 619 review: the man whose release is waiting on a second tap. */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /* Round 982: the line that says what a press just did. */
  const { cue, press } = useDeskCue<string, CareerState>(career);
  /* Round 514: the money symbol follows the start option. Shadowing the
     import here is one line instead of a career argument on every call. */
  const money = moneyIn(career);
  /* Round 982: what the signing on fee really cost, read off the two saves. */
  const paid = (after: CareerState) => money(Math.round((career.budget - after.budget) * 10) / 10);

  /* Round 982: each press is checked against what the engine would write, and
     the line is read off the save the screen is handed afterwards. Anything
     that does not match (a refusal, a save that moved some other way) gives
     null, and null says nothing. */
  const renewRead = (id: string, next: CareerState | null): DeskCueRead<CareerState> | null => {
    const before = career.squad.find(x => x.id === id);
    const want = next?.squad.find(x => x.id === id);
    if (!next || !before || !want) return null;
    return after => {
      const got = after.squad.find(x => x.id === id);
      if (!got || got.contractYears !== want.contractYears || got.wage !== want.wage
        || (got.releaseClause ?? 0) !== (want.releaseClause ?? 0) || after.budget !== next.budget) return null;
      const clause = (got.releaseClause ?? 0) > 0 ? `exit clause ${money(got.releaseClause as number)}`
        : (before.releaseClause ?? 0) > 0 ? 'clause deleted' : 'no release clause';
      return `Renewed: ${got.name}. ${got.contractYears} years at ${got.wage}k a week, ${clause}, ${paid(after)} to sign.`;
    };
  };
  /* The engine fills an old save's missing free agent pool in place, so it is
     handed a copy: asking what a press would do must never change the save. */
  const releaseRead = (id: string): DeskCueRead<CareerState> | null => {
    const next = releasePlayer({ ...career }, id);
    const rows = next?.severance ?? [];
    const want = rows[rows.length - 1];
    if (!next || !want) return null;
    return after => {
      const owed = after.severance ?? [];
      const got = owed[owed.length - 1];
      if (after.squad.some(x => x.id === id) || owed.length !== rows.length || !got
        || got.name !== want.name || got.weekly !== want.weekly || got.weeksLeft !== want.weeksLeft) return null;
      return `Released: ${got.name}. You pay him ${got.weekly}k a week for ${got.weeksLeft} more week${got.weeksLeft === 1 ? '' : 's'}.`;
    };
  };
  const signRead = (name: string): DeskCueRead<CareerState> | null => {
    const next = signFreeAgent({ ...career }, name);
    const had = new Set(career.squad.map(x => x.id));
    const want = next?.squad.find(x => !had.has(x.id) && x.name === name);
    if (!next || !want) return null;
    return after => {
      const got = after.squad.find(x => !had.has(x.id) && x.name === name);
      if (!got || got.wage !== want.wage || got.contractYears !== want.contractYears || after.budget !== next.budget) return null;
      return `Signed: ${got.name}. ${got.contractYears} years at ${got.wage}k a week, ${paid(after)} to sign.`;
    };
  };
  const bill = wageBill(career);
  const cap = career.wageCap ?? wageCapFrom(bill);
  const pct = Math.round((bill / Math.max(1, cap)) * 100);
  const over = bill > cap;
  const expiring = expiringPlayers(career);
  const claused = career.squad
    .filter(p => !p.onLoan && (p.releaseClause ?? 0) > 0)
    .sort((a, b) => (sellValue(b) / (b.releaseClause as number)) - (sellValue(a) / (a.releaseClause as number)));

  const forecast = (p: CMPlayer, kind: 'plain' | 'clause' | 'remove', terms: ReturnType<typeof renewalTerms> & { clause?: number }, next: CareerState | null) => {
    const nextBill = next ? wageBill(next) : bill;
    const nextCap = next?.wageCap ?? wageCapFrom(nextBill);
    return (
      <div data-contract-preview={kind} data-contract-player-id={p.id} className="mt-1 rounded-lg border border-border/40 bg-secondary/30 p-2 text-[10px] leading-relaxed text-muted-foreground break-words">
        <p className="font-bold text-foreground">{terms.years} years at {terms.wage}k a week. {money(terms.fee)} to sign.</p>
        <p>{terms.clause === undefined ? 'No release clause.' : `Exit clause ${money(terms.clause)}. Any club can pay it.`}</p>
        {next ? (
          <>
            <p>Leaves <span className="font-bold text-foreground">{money(next.budget)}</span> in the transfer kitty.</p>
            <p>Wage bill: {nextBill}k of {nextCap}k a week.</p>
            {nextBill > nextCap && <p className="text-amber-400">Over the wage budget by {nextBill - nextCap}k a week. The board notice every week.</p>}
          </>
        ) : <p className="text-amber-400">Need {money(terms.fee - career.budget)} more for the signing fee.</p>}
      </div>
    );
  };

  const row = (p: CMPlayer) => {
    const terms = renewalTerms(p);
    const withClause = renewalTermsWithClause(p);
    const affordable = terms.fee <= career.budget;
    const clauseAffordable = withClause.fee <= career.budget;
    return (
      <div key={p.id} className="py-1.5 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground truncate">{p.name}</div>
            <div className="text-[9px] text-muted-foreground">
              {p.age}y · on {p.wage ?? 0}k a week · final year{(p.releaseClause ?? 0) > 0 ? ` · clause ${money(p.releaseClause as number)}` : ''}
            </div>
          </div>
          <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <div className="min-w-0">
            <button
              onClick={() => press(p.id, renewRead(p.id, renewContract(career, p.id)), () => onRenew(p.id))}
              disabled={!affordable}
              title={affordable
                ? `${terms.years} more years at ${terms.wage}k a week, ${money(terms.fee)} to sign. No clause; deletes any he carries.`
                : `You cannot afford the ${money(terms.fee)} signing on fee`}
              className={cn('w-full min-h-11 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
            >
              Renew · {terms.wage}k/w · {money(terms.fee)}
            </button>
            {forecast(p, 'plain', terms, renewContract(career, p.id))}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => press(p.id, renewRead(p.id, renewContractWithClause(career, p.id)), () => onRenewWithClause(p.id))}
              disabled={!clauseAffordable}
              title={clauseAffordable
                ? `${withClause.years} years at only ${withClause.wage}k a week, ${money(withClause.fee)} to sign, but a ${money(withClause.clause)} release clause any club can pay. It cannot be rejected or blocked.`
                : `You cannot afford the ${money(withClause.fee)} signing on fee`}
              className={cn('w-full min-h-11 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
                clauseAffordable ? 'border-gold/60 bg-gold/10 text-foreground hover:border-gold' : 'border-border bg-secondary text-muted-foreground cursor-not-allowed')}
            >
              +Clause · {withClause.wage}k/w · exit {money(withClause.clause)}
            </button>
            {forecast(p, 'clause', withClause, renewContractWithClause(career, p.id))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2" data-contracts-desk>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">📝 Contracts</div>
        <div className={cn('text-[10px] font-bold', over ? 'text-red-400' : 'text-emerald-400')}>
          {bill}k of {cap}k a week
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : pct > 88 ? 'bg-yellow-500' : 'bg-emerald-500')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {over && (
        <p className="text-[10px] text-red-400">
          You are {pct - 100} percent over the wage budget. The board notice every week you stay there.
        </p>
      )}

      {expiring.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Nobody is in the last year of his deal. Nothing needs signing today.</p>
      ) : (
        <>
          <div className="text-[10px] text-gold uppercase tracking-wider font-bold pt-1">
            ⏳ Final year ({expiring.length})
          </div>
          <div className="max-h-64 overflow-y-auto">{expiring.map(row)}</div>
          <p className="text-[9px] text-muted-foreground">
            Let a deal run out and he leaves in the summer for nothing. The clause deal pays him 12 percent
            less, and the price is an exit door at 1.5x his value today that any club can walk through.
          </p>
        </>
      )}

      {claused.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-bold pt-1 text-muted-foreground">
            🔓 Release clauses you have granted ({claused.length})
          </div>
          <div className="max-h-64 overflow-y-auto" data-contract-clauses>
          {claused.map(p => {
            const ratio = sellValue(p) / (p.releaseClause as number);
            const terms = renewalTerms(p);
            const affordable = terms.fee <= career.budget;
            return (
              <div key={p.id} className="py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-foreground truncate">{p.name}</div>
                    <div className={cn('text-[9px]', ratio >= 1 ? 'text-red-400 font-bold' : 'text-muted-foreground')}>
                      clause {money(p.releaseClause as number)} · worth {money(sellValue(p))}{ratio >= 1 ? ' · A BARGAIN, clubs will pay this' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => press(p.id, renewRead(p.id, renewContract(career, p.id)), () => onRenew(p.id))}
                    disabled={!affordable}
                    title={affordable
                      ? `A plain renewal deletes the clause: ${terms.years} years at ${terms.wage}k a week, ${money(terms.fee)} to sign.`
                      : `Deleting the clause means a full renewal, and you cannot afford the ${money(terms.fee)} fee`}
                    className={cn('shrink-0 min-h-11 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                      affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                  >
                    Remove · {money(terms.fee)}
                  </button>
                </div>
                {forecast(p, 'remove', terms, renewContract(career, p.id))}
              </div>
            );
          })}
          </div>
        </>
      )}

      {/* Round 619: what you still owe men you let go. It sits with the wage
          bill because it IS the wage bill: the cap, the weekly charge and the
          season projection all read the same number, and a manager who has
          released three players has to see why the wage line has not fallen. */}
      {severanceBill(career) > 0 && (
        <div className="mt-3 pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Still paying {severanceBill(career)}k a week
          </div>
          {/* Keyed by position as well as name: a man released, signed back
              later and released again owes two settlements under one name. */}
          {(career.severance ?? []).map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex justify-between text-[10px] text-muted-foreground py-0.5">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 tabular-nums">{r.weekly}k for {r.weeksLeft} more week{r.weeksLeft === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Round 619: ending a deal early. The settlement is quoted before you
          agree to it, because the whole design rests on that cost being visible
          rather than discovered afterwards. */}
      {onRelease && (
        <div className="mt-3 pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Let somebody go</div>
          <div className="text-[9px] text-muted-foreground mb-1.5">
            You keep paying half his wage until his deal would have run out, capped at two seasons, and it counts
            against the cap the whole time.
          </div>
          <div className="max-h-40 overflow-y-auto">
            {career.squad.filter(p => !p.onLoan && !p.isYouth && p.age >= 20).map(p => {
              const sev = severanceFor(career, p);
              /* Round 619 review: the engine's own refusal, so a button is
                 never live when pressing it would do nothing. */
              const block = releaseBlock(career, p);
              /* Two taps, and the second one is only offered once the whole
                 cost is on screen. A release cannot be undone and the save is
                 written the moment it happens. */
              const confirming = confirmId === p.id && !block;
              return (
                <div key={p.id} className="py-1 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground truncate">{p.name}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {p.rating} rated, {p.wage ?? 0}k a week, {p.contractYears ?? 0} year{(p.contractYears ?? 0) === 1 ? '' : 's'} left
                      </div>
                    </div>
                    <button
                      data-release-id={p.id}
                      onClick={() => setConfirmId(confirming ? null : p.id)}
                      disabled={!!block}
                      title={block ? RELEASE_BLOCK_COPY[block].title : `Settle at ${sev.weekly}k a week for ${sev.weeksLeft} weeks`}
                      className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                        block ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                          : confirming ? 'bg-secondary text-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-destructive hover:text-destructive-foreground')}
                    >
                      {block ? RELEASE_BLOCK_COPY[block].face : confirming ? 'Cancel' : `Release, ${sev.weekly}k x ${sev.weeksLeft}`}
                    </button>
                  </div>
                  {confirming && (
                    <div className="mt-1.5 rounded-lg border border-destructive/50 bg-destructive/10 p-2 space-y-1.5" data-release-confirm>
                      <p className="text-[10px] text-foreground">
                        You pay him {sev.weekly}k a week for {sev.weeksLeft} more week{sev.weeksLeft === 1 ? '' : 's'}, {money((sev.weekly * sev.weeksLeft) / 1000)} in all,
                        and it counts against your wage cap until it is paid. The whole dressing room takes a morale hit,
                        and you can never sign him again.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { press(p.id, releaseRead(p.id), () => onRelease(p.id)); setConfirmId(null); }}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-destructive text-destructive-foreground hover:opacity-90 transition-all"
                        >
                          Release him
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-secondary text-foreground hover:opacity-90 transition-all"
                        >
                          Keep him
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round 619: men with no club. Signable with the window shut, which is
          the one thing in this game that is. */}
      {onSignFreeAgent && (career.freeAgents ?? []).length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Free agents{career.transferWindow === null ? ', and the window being shut does not stop these' : ''}
          </div>
          {/* Scrolls inside the card, like the lists above it: after a few
              summers of deals running out the pool can hold twenty men. */}
          <div className="max-h-64 overflow-y-auto">
            {(career.freeAgents ?? []).map((f, i) => {
              /* A button that looks available and silently does nothing is
                 worse than no button. Round 619 review: the first build checked
                 two of the engine's rules here and missed the cap and the squad
                 size, so a keen man could show Sign and nothing happened. The
                 card now asks the engine's own freeAgentBlock, and quotes the
                 wage, length and signing on fee off the same freeAgentTerms
                 signFreeAgent commits. */
              const block = freeAgentBlock(career, f);
              const t = freeAgentTerms(f);
              return (
                <div key={f.name} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="min-w-0 text-xs text-foreground truncate">{f.name}</span>
                      {f.generated && <MadeUpTag title="Not a real player. This game made him up to fill the free agent list." />}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {f.position}, {f.rating} rated, {f.age}, {FREE_AGENT_REASON[f.reason]}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {t.wage}k a week for {t.years} years, {money(t.fee)} to sign, no transfer fee
                    </div>
                  </div>
                  <button
                    data-sign-index={i}
                    onClick={() => press(f.name, signRead(f.name), () => onSignFreeAgent(f.name))}
                    disabled={!!block}
                    title={block ? FREE_AGENT_BLOCK_COPY[block].title : `${t.years} years at ${t.wage}k a week and ${money(t.fee)} to sign. No transfer fee, and the window being shut does not matter.`}
                    className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                      block ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:opacity-90')}
                  >
                    {block ? FREE_AGENT_BLOCK_COPY[block].face : `Sign · ${t.wage}k/w · ${t.years}y · ${money(t.fee)}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round 982: last on purpose, so the line sticks to the foot of the
          screen while the card runs on below it, and the style tag adds no
          gap to the stack. */}
      <CelebrationStyles />
      <DeskCueLine cue={cue} testId="cm-contracts-cue" />
    </div>
  );
}

export default ContractsCard;
