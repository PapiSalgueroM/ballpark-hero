import { PERK_KINDS, PERK_LABEL, type FinEvent, type PunishCard, type BoardObjective } from '@/lib/rebuildDeck';
import type { RunState } from '@/lib/rebuildLoop';

/* Round 980: the pocket (every power up you hold, with the buttons for the
   ones you play between spins) and the verdict (the board's cards face up
   while a veto waits on a choice). The swap and the loan live on the spin
   and deal cards in RebuildBoard, where the choice they change is made. */

interface PocketProps {
  run: RunState;
  peeked: FinEvent | null;
  canSecondSpin: (slot: number) => boolean;
  secondSpin: (slot: number) => void;
  sneakPeek: () => void;
  busy: boolean;
}

export function PowerUpPocket({ run, peeked, canSecondSpin, secondSpin, sneakPeek, busy }: PocketProps) {
  const { perks, formation, decided } = run;
  const held = PERK_KINDS.filter(k => perks[k] > 0);
  if (held.length === 0 && !peeked) return null;
  const reopenable = formation.slots.map((_, i) => i).filter(i => canSecondSpin(i));
  return (
    <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">In your pocket</p>
      {held.map(k => (
        <p key={k} className="mt-1 text-xs text-foreground">
          {PERK_LABEL[k].emoji} <span className="font-semibold">{PERK_LABEL[k].short}{perks[k] > 1 ? ` x${perks[k]}` : ''}</span>
          <span className="text-muted-foreground">: {PERK_LABEL[k].long}</span>
        </p>
      ))}
      {perks.peek > 0 && !peeked && (run.phase === 'spin') && (
        <button
          onClick={sneakPeek}
          disabled={busy || run.verdict}
          className="mt-2 rounded-full border border-primary/50 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          {PERK_LABEL.peek.emoji} Peek at the next envelope
        </button>
      )}
      {peeked && (
        <p className="mt-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
          {PERK_LABEL.peek.emoji} Next envelope: {peeked.emoji} {peeked.text}{' '}
          {peeked.perk ? (
            <span className="font-bold text-primary">{PERK_LABEL[peeked.perk].short}</span>
          ) : (
            <span className={peeked.delta >= 0 ? 'font-bold text-emerald-500' : 'font-bold text-destructive'}>
              {peeked.delta >= 0 ? '+' : ''}€{peeked.delta}M
            </span>
          )}
          <span className="block text-[10px] text-muted-foreground">It lands after your next transfer moves.</span>
        </p>
      )}
      {perks.respin > 0 && reopenable.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground">Second spin, pick a settled shirt:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {reopenable.map(i => (
              <button
                key={i}
                onClick={() => secondSpin(i)}
                disabled={busy}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary/60 disabled:opacity-40"
              >
                {formation.slots[i].label} · {decided[i]?.name ?? '40 overall'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface VerdictProps {
  verdict: { cards: PunishCard[]; left: PunishCard[]; missed: BoardObjective[] };
  vetoCard: (i: number) => void;
  acceptVerdict: () => void;
}

/** The whistle with a veto in your pocket: every card face up, one button per
 *  card that hurts, and the cards still in the board's deck listed, because
 *  a vetoed card is replaced by one of them. */
export function VetoVerdict({ verdict, vetoCard, acceptVerdict }: VerdictProps) {
  const { cards, left, missed } = verdict;
  return (
    <div className="mt-3 rounded-2xl border border-destructive/50 bg-card p-4 animate-in fade-in zoom-in-95 duration-300">
      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-destructive">
        {PERK_LABEL.veto.emoji} The board's verdict, face up
      </p>
      <div className="mt-3 space-y-1.5">
        {cards.map((c, k) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{c.emoji} {c.title}</span>
              <span className="block text-[10px] text-muted-foreground">{c.text} (you missed: {missed[k]?.text})</span>
            </span>
            {c.kind !== 'safe' && (
              <button
                onClick={() => vetoCard(k)}
                className="shrink-0 rounded-full border border-primary/60 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
              >
                Veto
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {left.length > 0
          ? `A vetoed card is shuffled in with what the board has left (${left.map(c => `${c.emoji} ${c.title}`).join(', ')}) and one comes out in its place. It can be the same card.`
          : 'The board has no other cards left, so a vetoed card would only come straight back.'}
      </p>
      <button
        onClick={acceptVerdict}
        className="mt-3 w-full rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-primary/50"
      >
        Take them as they fell, keep the veto
      </button>
    </div>
  );
}
