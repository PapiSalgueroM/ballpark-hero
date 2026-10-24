import { useEffect, useRef, useState } from 'react';
import type { CareerState } from '@/lib/clubManager';
import { money, ROLE_INFO, roleOf, worldYear } from '@/lib/clubManager';
import { previewVeteranRetirement } from '@/lib/clubManagerVeteranRetirement';
import { readVeteranReviews, sameVeteranIdentity, veteranIdentity } from '@/lib/clubManagerVeteranLedger';

export interface VeteranRetirementCardProps {
  career: CareerState;
  onReview: (playerId: string) => Promise<boolean>;
}

const NOT_SAVED = 'That talk was not saved. Try again from the current season review.';

export function VeteranRetirementCard({ career, onReview }: VeteranRetirementCardProps) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [awaitingCareer, setAwaitingCareer] = useState<CareerState | null>(null);
  const busyRef = useRef(false);
  const tile = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      tile.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const players = career.squad.filter(player => Number.isSafeInteger(player.age)
    && player.age >= 31 && player.age <= 41 && !player.onLoan
    && !career.loanedOut?.some(row => row.player.id === player.id)
    && career.squad.filter(row => row.id === player.id).length === 1);
  const player = players.find(row => row.id === selectedId);
  const preview = player ? previewVeteranRetirement(career, player.id) : null;
  const identity = player ? veteranIdentity(career, player, worldYear(career)) : null;
  const ledger = readVeteranReviews(career.veteranReviews);
  const savedReview = identity && ledger?.reviews.find(row => row.club === career.clubName
    && row.season === career.season && sameVeteranIdentity(row.identity, identity));
  const waiting = awaitingCareer === career && !savedReview;

  async function ask() {
    if (busyRef.current || waiting || savedReview || !player || preview?.kind !== 'offer') return;
    busyRef.current = true;
    setBusy(true); setError('');
    try {
      const saved = await onReview(player.id);
      if (saved === true) setAwaitingCareer(career);
      else { setAwaitingCareer(null); setError(NOT_SAVED); }
    } catch {
      setAwaitingCareer(null); setError(NOT_SAVED);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!open) return (
    <button ref={tile} type="button" onClick={() => setOpen(true)}
      className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-semibold text-foreground">
      Veteran talks
    </button>
  );

  return (
    <section aria-label="Veteran talks" className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Back to season review" disabled={busy}
          onClick={() => { returnFocus.current = true; setOpen(false); }}
          className="min-h-[44px] min-w-[44px] rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Back
        </button>
        <h3 className="text-sm font-bold text-foreground">Veteran talks</h3>
        <button type="button" aria-label="Veteran talk rules" aria-expanded={help}
          onClick={() => setHelp(value => !value)}
          className="min-h-[44px] min-w-[44px] rounded-lg border border-border text-sm font-bold">?</button>
      </div>

      {help && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>At your season review, ask an owned player aged 31 to 41 to stay for the next season. An agreement protects this summer rollover once in the career. Aging and rating decline still apply.</p>
          <p>A player who wants to leave or has an unhappy role promise can decline. Any renewal uses the fee, wage and years shown below. His current squad role stays the same.</p>
          <p>Example: a fictional 36 year old with three contract years can be asked without a new renewal fee. His squad role still stays the same.</p>
        </div>
      )}

      <label className="block space-y-1 text-xs font-semibold">
        <span>Veteran to review</span>
        <select value={selectedId} disabled={busy || waiting} onChange={event => {
          setSelectedId(event.target.value); setError(''); setAwaitingCareer(null);
        }} className="min-h-[44px] w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
          <option value="">Choose a veteran</option>
          {players.map(row => <option key={row.id} value={row.id}>{row.name}, {row.age}</option>)}
        </select>
      </label>
      {players.length === 0 && <p className="text-xs text-muted-foreground">No currently owned player aged 31 to 41 is available here.</p>}

      {player && (
        <div className="space-y-2 text-sm">
          <p>Current role: {ROLE_INFO[roleOf(player)].label}</p>
          {preview?.kind === 'offer' && (preview.renewal ? (
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-muted-foreground">Renewal fee</dt><dd data-testid="veteran-renewal-fee">{money(preview.renewal.fee, career)}</dd></div>
              <div><dt className="text-muted-foreground">Weekly wage</dt><dd data-testid="veteran-renewal-wage">{money(preview.renewal.wage / 1000, career)}/week</dd></div>
              <div><dt className="text-muted-foreground">Contract years</dt><dd data-testid="veteran-renewal-years">{preview.renewal.years}</dd></div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">{(player.contractYears ?? 0) >= 2
              ? 'Your current contract already covers next summer.'
              : 'No renewal terms are proposed for this talk.'}</p>
          ))}
          {!savedReview && preview?.kind === 'blocked' && <p className="text-xs text-muted-foreground">{preview.reason}</p>}
        </div>
      )}

      {savedReview ? (
        <div className="space-y-1">
          <p role="status" className="text-sm font-bold">{savedReview.decision === 'agreed' ? 'Agreed' : 'Declined'}</p>
          <p className="text-xs text-muted-foreground">{savedReview.decision === 'agreed'
            ? 'Agreement recorded for this club and season review.'
            : 'The decline is recorded for this season. No renewal fee was charged.'}</p>
        </div>
      ) : busy ? (
        <p role="status" className="text-xs text-muted-foreground">Saving talk...</p>
      ) : waiting ? (
        <p role="status" className="text-xs text-muted-foreground">Waiting for the saved season review.</p>
      ) : null}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <button type="button" disabled={busy || waiting || !!savedReview || preview?.kind !== 'offer'}
        onClick={() => { void ask(); }}
        className="min-h-[44px] w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
        Ask for one more season
      </button>
    </section>
  );
}
