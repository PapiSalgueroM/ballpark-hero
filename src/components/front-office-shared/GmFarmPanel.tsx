/**
 * Round 944: the development tier panel, shared by the four GM boards.
 *
 * One box: the tier's counts against its limits, the rules in plain words,
 * the tier men with a Call up button each, the active men with a Send down
 * button each, and how many men the club has lost on waivers. Every button's
 * words come from src/lib/gmFarm.ts (farmCallUpButton, farmSendDownButton),
 * and scripts/simGmFarm.mjs section 7 runs each move on a copy of a real
 * league to prove the words match what happens. A greyed button shows why.
 *
 * Not bound to a board in this round: a board passes its own FarmCtx and the
 * GM's seat, and does the move in its handlers with callUp and sendDown.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  type FarmCtx, type FarmMan, type FarmSeat,
  contractCount, farmCallUpButton, farmRuleLines, farmSendDownButton, fortyManCount, activeCount, nhlExempt,
} from '@/lib/gmFarm';

interface GmFarmPanelProps<P extends FarmMan> {
  ctx: FarmCtx<P>;
  /** The GM's own club. */
  seat: FarmSeat<P>;
  onCallUp: (playerId: string) => void;
  onSendDown: (playerId: string) => void;
}

/** The counts line: each sport's own limits, read off the same functions the caps check uses. */
function countsLine<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>): string {
  const r = ctx.rules;
  if (r.sport === 'nfl') return `Practice squad ${seat.reserve.length} of ${r.tierCap}`;
  if (r.sport === 'nba') return `Two way ${seat.reserve.length} of ${r.tierCap}`;
  if (r.sport === 'mlb') return `40 man ${fortyManCount(seat)} of ${r.fortyMan} · active ${activeCount(r, seat)} of ${ctx.activeMax(seat)}`;
  return `Contracts ${contractCount(seat)} of ${r.contractLimit}`;
}

/** What the ledger says about one tier man, in a few words. */
function tierNote<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, p: P): string {
  const r = ctx.rules;
  const l = seat.club.ledger[p.id];
  if (r.sport === 'nfl') return `elevated ${l?.elev ?? 0} of ${r.elevationsPerSeason}`;
  if (r.sport === 'nba') return `${l?.twGames ?? 0} of ${r.twoWayGames} games`;
  if (r.sport === 'mlb') return l?.off40 ? 'off the 40' : `options used ${l?.optUsed ?? 0} of ${r.optionYears}`;
  return nhlExempt(l, p) ? 'waiver exempt' : 'needs waivers';
}

function MoveButton({ label, warn, refusal, onClick }: { label: string; warn?: string; refusal: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!!refusal}
      title={refusal ?? warn}
      onClick={onClick}
      className={cn(
        'min-h-[44px] shrink-0 rounded-full px-3 py-1 text-[11px] font-bold',
        refusal ? 'cursor-not-allowed bg-muted text-muted-foreground' : warn ? 'bg-destructive text-destructive-foreground hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90',
      )}
    >
      {label}
    </button>
  );
}

function ManRow<P extends FarmMan>({ p, note, children }: { p: P; note: string; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1">
      <div className="min-w-0 text-xs">
        <p className="truncate font-semibold">{p.name}</p>
        <p className="text-[10px] text-muted-foreground">{p.pos} · {p.age} · {p.ovr}{p.out > 0 ? ` · hurt ${p.out}` : ''} · {note}</p>
      </div>
      {children}
    </li>
  );
}

export function GmFarmPanel<P extends FarmMan>({ ctx, seat, onCallUp, onSendDown }: GmFarmPanelProps<P>) {
  const tier = [...seat.reserve].sort((a, b) => b.ovr - a.ovr);
  const active = ctx.rules.sport === 'nba' ? [] : [...seat.players].sort((a, b) => a.ovr - b.ovr).slice(0, 8);
  return (
    <section data-gm-farm className="rounded-xl border border-border p-3">
      <h3 className="text-sm font-bold">{ctx.rules.tierName}</h3>
      <p data-farm-counts className="mb-1 text-xs text-muted-foreground">{countsLine(ctx, seat)}</p>
      <ul className="mb-2 space-y-0.5 text-[10px] text-muted-foreground">
        {farmRuleLines(ctx.rules).map(l => <li key={l}>{l}</li>)}
      </ul>
      {tier.length === 0
        ? <p className="mb-2 text-xs text-muted-foreground">Nobody in the tier right now.</p>
        : (
          <ul data-farm-tier className="mb-2 space-y-1">
            {tier.map(p => {
              const b = farmCallUpButton(ctx, seat, p);
              return <ManRow key={p.id} p={p} note={tierNote(ctx, seat, p)}><MoveButton {...b} onClick={() => onCallUp(p.id)} /></ManRow>;
            })}
          </ul>
        )}
      {active.length > 0 && (
        <>
          <p className="mb-1 text-[11px] font-semibold">Send a man down</p>
          <ul data-farm-active className="mb-2 space-y-1">
            {active.map(p => {
              const b = farmSendDownButton(ctx, seat, p);
              return <ManRow key={p.id} p={p} note={b.refusal ?? b.warn ?? 'no waivers needed'}><MoveButton {...b} onClick={() => onSendDown(p.id)} /></ManRow>;
            })}
          </ul>
        </>
      )}
      {seat.club.lost.length > 0 && (
        <p className="text-[10px] text-destructive">Lost on waivers: {seat.club.lost.length}. Waivers are not loans, so they are not coming back.</p>
      )}
    </section>
  );
}

export default GmFarmPanel;
