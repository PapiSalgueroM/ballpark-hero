import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIT_PENALTY } from '@/lib/positionFit';
import { StatTile } from '@/components/game/StatTile';
import {
  CHEMISTRY_CAP,
  CHEMISTRY_SCALE,
  HOLDING_PRICE,
  WIDTH_PRICE,
  type XiFitBreakdown as Breakdown,
  type XiFitSlot,
} from '@/lib/xiFit';
import type { SeasonFit } from '@/lib/worldXi';

/**
 * Round 825: Build Your XI's role fit, chemistry and balance, as three small
 * tiles. Tap one for the why, Back to return (the tile rule: no long stacked
 * page). The page shows it under the pitch while you pick, on the review card
 * before you submit, and on the result card; the season report then says what
 * each was worth in points (XiFitWorth below).
 */
type Detail = 'role' | 'chemistry' | 'balance';

interface BreakdownProps {
  breakdown: Breakdown;
  slots: XiFitSlot[];
  /** The slot labels, in slot order. */
  labels: string[];
  /** Which detail starts open. Closed on the page; the harness renders each open. */
  initialDetail?: Detail | null;
  className?: string;
}

/** "+0.6", "-1", "0": a hyphen for minus, never a dash. */
function signed(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

function tileTone(v: number): string {
  return v > 0 ? 'border-correct/50 text-correct' : v < 0 ? 'border-destructive/40 text-destructive' : 'border-border text-foreground';
}

export function XiFitBreakdown({ breakdown, slots, labels, initialDetail = null, className }: BreakdownProps) {
  const [open, setOpen] = useState<Detail | null>(initialDetail);
  const b = breakdown;
  const offSlot = b.roleFit.grades.filter(g => g && g !== 'natural').length;
  const tiles: { kind: Detail; label: string; value: number; sub: string }[] = [
    { kind: 'role', label: 'Role fit', value: b.roleFit.value, sub: offSlot === 0 ? 'all in place' : `${offSlot} out of place` },
    { kind: 'chemistry', label: 'Chemistry', value: b.chemistry.value, sub: `${b.chemistry.links.length} link${b.chemistry.links.length === 1 ? '' : 's'}` },
    {
      kind: 'balance',
      label: 'Balance',
      value: b.balance.value,
      sub: b.balance.holding === null && b.balance.narrow.length === 0 ? 'not settled yet' : b.balance.value === 0 ? 'balanced' : 'see why',
    },
  ];

  return (
    <div className={cn('rounded-2xl border border-border bg-card/60 p-3', className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">Before kick off</p>
      {open === null ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map(t => (
              <button
                key={t.kind}
                type="button"
                onClick={() => setOpen(t.kind)}
                className={cn('rounded-xl border bg-background/60 px-2 py-2 text-center transition-colors hover:bg-secondary/60', tileTone(t.value))}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</span>
                <span className="block text-lg font-bold tabular-nums">{signed(t.value)}</span>
                <span className="block text-[11px] text-muted-foreground">{t.sub}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Rating points on the whole side, and the season sim plays them. Tap a tile for why.
          </p>
        </>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <XiFitDetail kind={open} breakdown={b} slots={slots} labels={labels} />
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  kind: Detail;
  breakdown: Breakdown;
  slots: XiFitSlot[];
  labels: string[];
}

const GRADE_WORDS: Record<string, string> = {
  family: 'next door to this slot',
  wrong: 'from another line',
  keeper: 'across the keeper line',
};

export function XiFitDetail({ kind, breakdown: b, slots, labels }: DetailProps) {
  const lines: string[] = [];
  let rule = '';
  const nameAt = (i: number) => slots[i]?.man?.name ?? '';
  const complete = b.filled === slots.length;

  if (kind === 'role') {
    b.roleFit.grades.forEach((g, i) => {
      if (!g || g === 'natural') return;
      const pos = slots[i]?.man?.position ?? '';
      lines.push(`${labels[i]}: ${nameAt(i)}, a ${pos}, ${GRADE_WORDS[g] ?? g}. ${b.roleFit.perMan[i]} off him.`);
    });
    if (lines.length === 0) {
      lines.push(complete
        ? 'Every man is in a slot his recorded positions cover, so all eleven play at full value.'
        : 'So far every man is in a slot his recorded positions cover.');
    }
    rule = `A slot his positions cover costs nothing. Next door costs ${FIT_PENALTY.family} on that man, another line ${FIT_PENALTY.wrong}, a keeper swap ${FIT_PENALTY.keeper}, averaged over the eleven. Side total ${signed(b.roleFit.value)}.`;
  } else if (kind === 'chemistry') {
    for (const l of b.chemistry.links) {
      lines.push(l.type === 'club'
        ? `${nameAt(l.a)} and ${nameAt(l.b)}: same club on our data, ${l.value}. +${l.worth}`
        : `${nameAt(l.a)} and ${nameAt(l.b)}: both from ${l.value}. +${l.worth}`);
    }
    if (lines.length === 0) lines.push('No two neighbours share a club or a country yet.');
    if (b.chemistry.raw > b.chemistry.value) lines.push(`The links add up to +${b.chemistry.raw}, capped at +${CHEMISTRY_CAP}.`);
    rule = `Only men standing next to each other count. A shared club adds +${Math.round(3 * CHEMISTRY_SCALE * 10) / 10}, a shared country +${CHEMISTRY_SCALE}, up to +${CHEMISTRY_CAP} for the side.`;
  } else {
    const h = b.balance.holding;
    lines.push(h === true && b.balance.holder !== null
      ? `Holding midfielder: ${nameAt(b.balance.holder)} at ${labels[b.balance.holder]}.`
      : h === false
      ? `No holding midfielder: -${HOLDING_PRICE}. A defensive midfielder in a CM or CDM slot fixes it.`
      : 'Holding midfielder: not settled until the middle is filled.');
    for (const side of ['left', 'right'] as const) {
      const hit = b.balance.narrow.find(n => n.side === side);
      const flank = side === 'left' ? 'Left flank' : 'Right flank';
      lines.push(hit
        ? `${flank}: ${nameAt(hit.slot)} at ${labels[hit.slot]} is not a wide player. -${WIDTH_PRICE}`
        : `${flank}: width is fine.`);
    }
    rule = `No defensive midfielder in the middle costs ${HOLDING_PRICE}. A wide slot held by someone who is not a wide player costs ${WIDTH_PRICE} for that flank.`;
  }

  return (
    <div className="space-y-1.5 text-left text-sm">
      {lines.map((l, i) => (
        <p key={i} className="rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-foreground/90">{l}</p>
      ))}
      <p className="px-1 text-[11px] text-muted-foreground">{rule}</p>
    </div>
  );
}

/** "+3 pts", "-1 pt", "0 pts". */
function pts(v: number): string {
  const unit = Math.abs(v) === 1 ? 'pt' : 'pts';
  return v > 0 ? `+${v} ${unit}` : `${v} ${unit}`;
}

/**
 * The report side: what each of the three was worth in league points, the
 * same rolls replayed without it. A report with no fit block (World XI, or
 * anything built before Round 825) draws nothing.
 */
export function XiFitWorth({ fit, className }: { fit?: SeasonFit; className?: string }) {
  if (!fit) return null;
  return (
    <div className={cn('mb-3', className)}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Role fit" value={pts(fit.points.roleFit)} state={fit.points.roleFit < 0 ? 'incorrect' : 'correct'} />
        <StatTile label="Chemistry" value={pts(fit.points.chemistry)} state={fit.points.chemistry > 0 ? 'correct' : 'pending'} />
        <StatTile label="Balance" value={pts(fit.points.balance)} state={fit.points.balance < 0 ? 'incorrect' : 'correct'} />
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        League points each was worth on the same rolls. The league was played at {fit.matchRating}.
      </p>
    </div>
  );
}
