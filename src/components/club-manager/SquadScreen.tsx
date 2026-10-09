import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
/* Round 194: real players wear their real flag, from this world's map. */
import { nationalityOf } from '@/data/playerNationalities';
import { FlagImg } from '@/components/FlagImg';
import {
  ROLE_INFO, roleOf, promiseMood, playingShare, windowWords, deservedRole, standingGap,
  sellValue, renewalTerms, moneyIn,
} from '@/lib/clubManager';
import type { CMPlayer, CareerState, IncomingBid } from '@/lib/clubManager';
import { staffLevel } from '@/lib/clubManagerStaff';
/* Round 978: who is just back from international duty, and who you rested. */
import { backFromDuty, restingIds } from '@/lib/clubManagerInternationals';
import type { IntlCallUp } from '@/lib/clubManagerInternationals';
import { ALL_POSITIONS } from '@/lib/positionFit';
import { useRevealScroll } from '@/hooks/useRevealScroll';

/**
 * Round 132: the one label this round is really about.
 *
 * Once the world has a clock, some of the people on your teamsheet are real
 * footballers and some are players this game invented to fill the space the
 * real ones left when they retired. Nobody should have to guess which is
 * which, so every screen that shows a name shows this next to the made up
 * ones. Same spirit as the "partial data" flag on the club picker: if the data
 * is thin, say it is thin, right there, rather than hoping nobody notices.
 */
export function MadeUpTag({ className, title }: { className?: string; title?: string }) {
  return (
    <span
      title={title ?? 'Not a real player. This game made him up because the real August 2026 data cannot tell us who is playing this far ahead.'}
      className={cn('text-[8px] font-bold text-sky-300/90 border border-sky-400/50 rounded px-1 shrink-0', className)}
    >
      MADE UP
    </span>
  );
}

/** Round 505: the positions a man has learned on top of his own, as small chips. Only ever earned in this save. */
export function SecondPositionChips({ p, className }: { p: CMPlayer; className?: string }) {
  const extra = p.secondaryPositions ?? [];
  if (!extra.length) return null;
  return (
    <>
      {extra.map(pos => (
        <span
          key={pos}
          data-cm-second-position={pos}
          title="Learned in this save through retraining"
          className={cn('text-[8px] font-bold text-sky-300 border border-sky-400/50 rounded px-1 shrink-0', className)}
        >
          {pos}
        </span>
      ))}
    </>
  );
}

export function ratingTint(r: number): string {
  if (r >= 78) return 'text-primary';
  if (r >= 70) return 'text-emerald-400';
  if (r >= 62) return 'text-yellow-400';
  return 'text-muted-foreground';
}

export function moraleEmoji(m: number): string {
  if (m >= 80) return '😄';
  if (m >= 60) return '🙂';
  if (m >= 40) return '😐';
  return '😡';
}

function FitnessBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.max(4, value)}%` }} />
    </div>
  );
}

/* ---------- Round 715: the ceiling, as the club's scouts know it ----------

   The engine keeps every player's true ceiling (p.potential) and never shows
   it; the academy only ever prints the band a scout reported around it. A
   squad player has no report stored, and this round does not touch the
   engine, so the band is read here, off three things the save already has:

   - the truth, which is always inside the band and never printed on its own;
   - where it sits inside the band, fixed per player off his id, so the band
     does not jump about between visits and its middle is not the answer;
   - how wide it is, which is the lead scout's level (a better one narrows it,
     the same post that lifts the kids found on the road) and the player's age.
     Age matters because the engine hands out headroom by age: nothing past
     30, a point or two in the late twenties, up to fifteen for a teenager. The
     scouts read an established pro far more tightly than a kid for the same
     reason.

   The band never goes under his current rating (a ceiling below what he
   already is means nothing) and never over 99, and it is always at least two
   points wide, so it can never collapse onto the one number it is hiding. */
export interface ScoutBand { low: number; high: number }

function bandSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** How many points wide the scouts' read is, for this age and this lead scout (level 1 to 10). */
export function scoutBandWidth(age: number, scoutLevel: number): number {
  const level = Math.min(10, Math.max(1, Math.round(scoutLevel)));
  const base = 9 - Math.round(((level - 1) * 5) / 9);
  const scale = age <= 21 ? 1 : age <= 25 ? 0.7 : age <= 29 ? 0.45 : 0;
  return Math.max(2, Math.round(base * scale));
}

/** The band the scouts put around his ceiling, or null on a save that has not rated him yet. */
export function scoutBand(p: CMPlayer, scoutLevel: number): ScoutBand | null {
  if (typeof p.potential !== 'number' || !Number.isFinite(p.potential)) return null;
  const truth = Math.max(p.potential, p.rating);
  const width = scoutBandWidth(p.age, scoutLevel);
  let low = truth - Math.round(bandSeed(p.id) * width);
  let high = low + width;
  low = Math.max(low, p.rating);
  high = Math.min(high, 99);
  if (high - low < 2) high = Math.min(99, low + 2);
  if (high - low < 2) low = high - 2;
  return { low, high };
}

/* ---------- Round 715: sorting ---------- */

export type SquadSortKey = 'ovr' | 'pot' | 'form' | 'age' | 'wage' | 'deal' | 'worth' | 'fit' | 'mood' | 'pos' | 'name';
export type SortDir = 'asc' | 'desc';

interface SquadSortDef { key: SquadSortKey; label: string; head: string; first: SortDir; title: string }

/** Every way the list sorts, in the order the phone's picker offers them. */
export const SQUAD_SORTS: SquadSortDef[] = [
  { key: 'ovr', label: 'Rating', head: 'OVR', first: 'desc', title: 'His rating right now' },
  { key: 'pot', label: 'Ceiling', head: 'Pot', first: 'desc', title: 'Where the scouts reckon he tops out' },
  { key: 'form', label: 'Form', head: 'Form', first: 'desc', title: 'Average match rating this season' },
  { key: 'age', label: 'Age', head: 'Age', first: 'asc', title: 'Age' },
  { key: 'wage', label: 'Wage', head: 'Wage', first: 'desc', title: 'What he costs you a week, in thousands' },
  { key: 'deal', label: 'Years left', head: 'Deal', first: 'asc', title: 'Seasons left on his deal' },
  { key: 'worth', label: 'Worth', head: 'Worth', first: 'desc', title: 'What a sale would bring in today' },
  { key: 'fit', label: 'Fitness', head: 'Fit', first: 'desc', title: 'Fitness' },
  { key: 'mood', label: 'Morale', head: 'Mood', first: 'desc', title: 'Morale' },
  { key: 'pos', label: 'Position', head: 'Pos', first: 'asc', title: 'Keeper first, strikers last' },
  { key: 'name', label: 'Name', head: 'Player', first: 'asc', title: 'Name' },
];
const SORT_BY_KEY = new Map(SQUAD_SORTS.map(s => [s.key, s]));

/** The number a sort reads for one player, or null when he has none (a loan man's deal, no games yet). */
export function squadSortValue(p: CMPlayer, key: SquadSortKey, scoutLevel: number): number | string | null {
  switch (key) {
    case 'pos': return ALL_POSITIONS.indexOf(p.position);
    case 'name': return p.name;
    case 'age': return p.age;
    case 'ovr': return p.rating;
    case 'pot': {
      const b = scoutBand(p, scoutLevel);
      return b ? (b.low + b.high) / 2 + b.high / 1000 : null;
    }
    case 'form': return (p.apps ?? 0) > 0 ? (p.ratingSum ?? 0) / (p.apps as number) : null;
    case 'wage': return typeof p.wage === 'number' ? p.wage : null;
    case 'deal': return p.onLoan || typeof p.contractYears !== 'number' ? null : p.contractYears;
    case 'worth': return p.onLoan ? null : sellValue(p);
    case 'fit': return p.fitness;
    case 'mood': return p.morale;
  }
}

/** The squad in the order asked for. Blanks go last either way, ties go to the better player. */
export function sortSquad(squad: CMPlayer[], key: SquadSortKey, dir: SortDir, scoutLevel: number): CMPlayer[] {
  const sign = dir === 'asc' ? 1 : -1;
  return squad
    .map(p => ({ p, v: squadSortValue(p, key, scoutLevel) }))
    .sort((a, b) => {
      const an = a.v === null;
      const bn = b.v === null;
      if (an !== bn) return an ? 1 : -1;
      if (!an && a.v !== b.v) {
        const c = typeof a.v === 'string' ? a.v.localeCompare(String(b.v)) : (a.v as number) - (b.v as number);
        if (c !== 0) return c * sign;
      }
      if (b.p.rating !== a.p.rating) return b.p.rating - a.p.rating;
      return a.p.name.localeCompare(b.p.name);
    })
    .map(x => x.p);
}

/* ---------- Round 715: what each cell prints ---------- */

type Money = (n: number) => string;

function bandText(b: ScoutBand | null): string {
  return b ? `${b.low}-${b.high}` : '?';
}

function formOf(p: CMPlayer): number | null {
  return (p.apps ?? 0) > 0 ? (p.ratingSum ?? 0) / (p.apps as number) : null;
}

function dealText(p: CMPlayer): string {
  if (p.onLoan) return 'Loan';
  return typeof p.contractYears === 'number' ? `${p.contractYears}y` : '-';
}

function worthText(p: CMPlayer, money: Money): string {
  return p.onLoan ? '-' : money(sellValue(p));
}

/** The phone row has room for one number past the rating: the sorted one, or the ceiling. */
const PHONE_EXTRA = new Set<SquadSortKey>(['pot', 'form', 'wage', 'deal', 'worth']);

function phoneCell(p: CMPlayer, key: SquadSortKey, band: ScoutBand | null, money: Money): string {
  switch (key) {
    case 'form': { const f = formOf(p); return f === null ? '-' : f.toFixed(1); }
    case 'wage': return typeof p.wage === 'number' ? `${p.wage}k` : '-';
    case 'deal': return dealText(p);
    case 'worth': return worthText(p, money);
    default: return bandText(band);
  }
}

/* One template for the head and every row from 768 up, so a column can never
   drift out from under its heading. Below that the row is a flex line. */
const GRID = 'md:grid md:grid-cols-[2.25rem_minmax(0,1fr)_1.75rem_2rem_3.25rem_2rem_2.75rem_2.25rem_3.5rem_3rem_1.5rem_1rem] md:gap-x-1.5 md:items-center';
const DESK_HEADS: (SquadSortKey | null)[] = ['pos', 'name', 'age', 'ovr', 'pot', 'form', 'wage', 'deal', 'worth', 'fit', 'mood', null];

/* ---------- Round 715: the tap open detail ---------- */

function Tile({ cell, label, value, sub, tone }: { cell: string; label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div data-cm-detail={cell} className="min-w-0 rounded-lg border border-border/50 bg-secondary/40 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-[11px] font-bold break-words leading-snug',
        tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-yellow-400' : tone === 'bad' ? 'text-red-400' : 'text-foreground')}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-muted-foreground leading-snug break-words">{sub}</div>}
    </div>
  );
}

/** Who wants him right now, read off the bids the engine is holding for this window. */
function interestOf(p: CMPlayer, bids: IncomingBid[], money: Money): { value: string; sub: string; tone?: 'good' | 'warn' | 'bad' } {
  const mine = bids.filter(b => b.playerId === p.id);
  const clause = mine.find(b => b.clauseMet);
  if (clause) return { value: `${clause.club} met his clause`, sub: `${money(clause.offer)}, and you cannot turn it down.`, tone: 'bad' };
  const perm = mine.filter(b => !b.loan);
  if (perm.length) {
    const top = perm.reduce((a, b) => (b.offer > a.offer ? b : a));
    const clubs = new Set(perm.flatMap(b => (b.rival ? [b.club, b.rival] : [b.club]))).size;
    return {
      value: clubs > 1 ? `${clubs} clubs in for him` : `${top.club} want him`,
      sub: `Best offer ${money(top.offer)}. Answer it on the Market tab.`,
      tone: 'warn',
    };
  }
  const loans = mine.filter(b => b.loan);
  if (loans.length) return { value: `Loan ask from ${loans[0].club}`, sub: 'Answer it on the Market tab.', tone: 'warn' };
  if (p.wantsOut) return { value: 'Asked to leave', sub: 'Every club knows it, so offers come in light.', tone: 'bad' };
  if (p.transferStatus === 'listed') return { value: 'Listed', sub: 'Waiting on bids.' };
  if (p.transferStatus === 'loanListed') return { value: 'Loan listed', sub: 'Waiting on loan asks.' };
  if (p.transferStatus === 'blocked') return { value: 'Blocked', sub: 'Nobody bids for a blocked man.' };
  return { value: 'No bids in', sub: 'Bids land while the window is open.' };
}

/** Round 715: the whole picture on one man, opened by a tap on his row. */
export function SquadRowDetail({ p, career, scoutLevel, money }: { p: CMPlayer; career: CareerState; scoutLevel: number; money: Money }) {
  const band = scoutBand(p, scoutLevel);
  const mood = promiseMood(p);
  const share = playingShare(p);
  const played = windowWords(p);
  const of = (p.lastTen ?? []).length;
  const role = roleOf(p);
  const gap = standingGap(career, p);
  const deserved = deservedRole(career, p);
  const interest = interestOf(p, career.incomingBids ?? [], money);
  const form = formOf(p);
  const years = p.contractYears;
  const next = p.onLoan ? null : renewalTerms(p);
  const isBack = p.position === 'GK' || ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position);
  const availability = p.injuryWeeks > 0
    ? `Injured, ${p.injuryWeeks} week${p.injuryWeeks === 1 ? '' : 's'}`
    : p.suspendedMatches > 0
      ? `Banned, ${p.suspendedMatches} match${p.suspendedMatches === 1 ? '' : 'es'}`
      : 'Available';

  return (
    <div data-cm-squad-detail={p.id} className="grid grid-cols-2 md:grid-cols-4 gap-1.5 pt-1 pb-2">
      <Tile
        cell="pot"
        label="Ceiling"
        value={band ? `${band.low} to ${band.high}` : 'Not rated yet'}
        sub="The scouts' read, not a promise. A better lead scout narrows it."
      />
      <Tile
        cell="deal"
        label="Deal"
        value={p.onLoan ? 'On loan' : years === 1 ? 'Final year' : typeof years === 'number' ? `${years} seasons left` : 'No deal on file'}
        sub={`${typeof p.wage === 'number' ? `${p.wage}k a week` : 'Wage not set'}${p.onLoan ? `, here from ${p.loanFrom ?? 'his club'}` : next ? `. A new deal now: ${next.wage}k for ${next.years} years` : ''}`}
        tone={!p.onLoan && years !== undefined && years <= 1 ? 'warn' : undefined}
      />
      <Tile
        cell="worth"
        label="Worth"
        value={p.onLoan ? 'Not yours to sell' : money(sellValue(p))}
        sub={(p.releaseClause ?? 0) > 0
          ? `Release clause ${money(p.releaseClause as number)}`
          : p.sellOnOwed
            ? `${p.sellOnOwed.pct}% of a sale goes to ${p.sellOnOwed.club}`
            : p.onLoan ? undefined : 'What a sale would bring in today'}
      />
      <Tile cell="interest" label="Interest" value={interest.value} sub={interest.sub} tone={interest.tone} />
      <Tile
        cell="gametime"
        label="Game time"
        value={share === null ? 'Too early to say' : mood.text}
        sub={of ? `${played} in his last ${of}` : 'No games yet'}
        tone={share === null ? undefined : mood.tone === 'bad' ? 'bad' : mood.tone === 'ok' ? 'warn' : 'good'}
      />
      <Tile
        cell="role"
        label="Role"
        value={`${ROLE_INFO[role].emoji} ${ROLE_INFO[role].label}`}
        sub={gap >= 1
          ? `Reckons he has earned ${ROLE_INFO[deserved].label.toLowerCase()}${gap >= 2 ? ', and it eats at him every week' : ''}.`
          : gap < 0 ? 'Chuffed. That is more than his football has earned.' : 'Happy with that.'}
        tone={gap >= 2 ? 'bad' : gap === 1 ? 'warn' : undefined}
      />
      <Tile
        cell="condition"
        label="Condition"
        value={availability}
        sub={`Fitness ${Math.round(p.fitness)}, morale ${Math.round(p.morale)} of 100${p.retraining ? `. Learning ${p.retraining.to}, ${p.retraining.weeksLeft}w left` : ''}`}
        tone={p.injuryWeeks > 0 || p.suspendedMatches > 0 ? 'bad' : undefined}
      />
      <Tile
        cell="season"
        label="This season"
        value={`${p.apps ?? 0} apps, ${p.seasonGoals}g ${p.seasonAssists}a`}
        sub={`${form === null ? 'No rating yet' : `Averaging ${form.toFixed(1)}`}${isBack ? `, ${p.cleanSheets ?? 0} clean sheets` : ''}${(p.seasonYellows ?? 0) > 0 ? `, ${p.seasonYellows} yellow` : ''}${(p.seasonReds ?? 0) > 0 ? `, ${p.seasonReds} red` : ''}`}
      />
    </div>
  );
}

/* ---------- Round 715: one row ---------- */

interface SquadRowProps {
  p: CMPlayer;
  career: CareerState;
  eraId?: string;
  inXI: boolean;
  isCaptain: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
  sortKey: SquadSortKey;
  scoutLevel: number;
  money: Money;
  /* Round 978: back from international duty for the next match, and whether you rested him for it. */
  duty?: { call: IntlCallUp; resting: boolean } | null;
}

function SquadRow({ p, career, eraId, inXI, isCaptain, isOpen, onToggle, sortKey, scoutLevel, money, duty = null }: SquadRowProps) {
  /* The no scroll rule: rows open independently, so opening one never closes
     another above it and pulls the one you tapped out from under your thumb.
     If the row sits so low that its detail would open below the fold, the
     shared hook brings the row's top into view and does nothing otherwise. */
  const ref = useRevealScroll<HTMLDivElement>(isOpen ? `open:${p.id}` : 'shut', { enabled: isOpen, skipFirst: false });
  const band = scoutBand(p, scoutLevel);
  const nat = nationalityOf(eraId, p.name);
  const form = formOf(p);
  const phoneKey: SquadSortKey = PHONE_EXTRA.has(sortKey) ? sortKey : 'pot';
  const mood = promiseMood(p);
  const badge = 'text-[9px] font-bold rounded px-1 shrink-0 border';

  return (
    <div
      ref={ref}
      data-cm-squad-row={p.id}
      data-cm-rating={p.rating}
      data-cm-pot-band={band ? `${band.low}-${band.high}` : ''}
      className="border-b border-border/30 last:border-0"
    >
      <button
        type="button"
        onClick={() => onToggle(p.id)}
        aria-expanded={isOpen}
        className={cn('w-full min-h-[40px] flex items-center gap-2 py-1.5 text-left rounded transition-colors hover:bg-secondary/40', GRID)}
      >
        <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
        <span className="flex-1 min-w-0 block">
          <span className="flex items-center gap-1.5 min-w-0">
            {nat ? <FlagImg name={nat} size={13} /> : null}
            <span className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>{p.name}</span>
            {p.generated && <MadeUpTag className="text-[9px]" />}
            {inXI && <span className={cn(badge, 'text-primary border-primary/50')}>XI</span>}
            {/* Round 505: the armband, and any position he has learned in this save. */}
            {isCaptain && <span data-cm-captain-badge="1" title="Captain" className={cn(badge, 'text-yellow-400 border-yellow-400/60')}>C</span>}
            <SecondPositionChips p={p} className="text-[9px]" />
            {p.onLoan && <span className={cn(badge, 'text-muted-foreground border-border')}>LOAN</span>}
            {/* Round 94: what you have told the market about him. */}
            {p.transferStatus === 'listed' && <span className={cn(badge, 'text-gold border-gold/60')}>LISTED</span>}
            {p.transferStatus === 'loanListed' && <span className={cn(badge, 'text-sky-400 border-sky-400/60')}>LOAN LIST</span>}
            {p.transferStatus === 'blocked' && <span className={cn(badge, 'text-red-400 border-red-400/60')}>BLOCKED</span>}
            {/* Round 127: he handed in a transfer request off his own bat. */}
            {p.wantsOut && <span className={cn(badge, 'text-red-400 border-red-400/60')}>WANTS OUT</span>}
            {/* Round 978: just back from his country, tired, maybe rested for the next one. */}
            {duty && (
              <span
                data-cm-intl-badge={duty.resting ? 'resting' : 'back'}
                title={`Back from international duty with ${duty.call.nation}: the trip cost him ${duty.call.cost} fitness${duty.call.starts ? ', he started their games' : ''}.${duty.resting ? ' Rested for the next match.' : ''}`}
                className={cn(badge, duty.resting ? 'text-sky-300 border-sky-400/60' : 'text-emerald-300 border-emerald-400/60')}
              >
                🌍 {duty.resting ? 'RESTING' : 'BACK'}
              </span>
            )}
          </span>
          {/* Round 73: the stat line. Round 715: on a phone it is the short
              version, and the rest is one tap away in the detail. */}
          <span className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
            <span className="text-[9px] text-muted-foreground shrink-0 md:hidden">{p.age}y</span>
            {/* Round 127: the rung you put him on, and whether he is getting it. */}
            <span className="text-[9px] text-muted-foreground shrink-0">
              {ROLE_INFO[roleOf(p)].emoji}<span className="hidden md:inline"> {ROLE_INFO[roleOf(p)].label}</span>
              {mood.tone === 'bad' && <span className="text-red-400 font-semibold"> {mood.text}</span>}
            </span>
            <span className="text-[9px] text-muted-foreground shrink-0 md:hidden">fit {Math.round(p.fitness)}</span>
            <span className="hidden md:inline text-[9px] text-muted-foreground">
              {p.apps ?? 0} apps · {p.seasonGoals}g {p.seasonAssists}a
            </span>
            {(p.seasonYellows ?? 0) > 0 && <span className="hidden md:inline text-[9px] text-yellow-400">🟨{p.seasonYellows}</span>}
            {(p.seasonReds ?? 0) > 0 && <span className="hidden md:inline text-[9px] text-red-400">🟥{p.seasonReds}</span>}
            {p.injuryWeeks > 0 && <span className="text-[9px] font-bold text-red-400">🩹 {p.injuryWeeks}w</span>}
            {p.suspendedMatches > 0 && <span className="text-[9px] font-bold text-yellow-400">⛔ {p.suspendedMatches}</span>}
            {p.retraining && <span className="hidden md:inline text-[9px] text-sky-300">learning {p.retraining.to}, {p.retraining.weeksLeft}w left</span>}
          </span>
        </span>
        <span data-cm-cell="age" className="hidden md:block text-[11px] text-muted-foreground text-center tabular-nums">{p.age}</span>
        <span data-cm-cell="phone" data-cm-phone-key={phoneKey} className="md:hidden w-12 shrink-0 text-right text-[10px] font-semibold text-foreground/80 tabular-nums">
          {phoneCell(p, phoneKey, band, money)}
        </span>
        <span data-cm-cell="ovr" className={cn('text-sm font-bold font-display w-7 shrink-0 text-right md:w-auto md:text-center', ratingTint(p.rating))}>{p.rating}</span>
        <span data-cm-cell="pot" title="Where the scouts reckon he tops out" className="hidden md:block text-[11px] font-semibold text-foreground/80 text-center tabular-nums">{bandText(band)}</span>
        <span data-cm-cell="form" className="hidden md:block text-[11px] text-foreground/80 text-center tabular-nums">{form === null ? '-' : form.toFixed(1)}</span>
        <span data-cm-cell="wage" className="hidden md:block text-[11px] text-foreground/80 text-right tabular-nums">{typeof p.wage === 'number' ? `${p.wage}k` : '-'}</span>
        <span data-cm-cell="deal" className={cn('hidden md:block text-[11px] text-center tabular-nums', !p.onLoan && p.contractYears !== undefined && p.contractYears <= 1 ? 'text-gold font-bold' : 'text-foreground/80')}>{dealText(p)}</span>
        <span data-cm-cell="worth" className="hidden md:block text-[11px] text-gold text-right tabular-nums">{worthText(p, money)}</span>
        <span data-cm-cell="fit" title={`Fitness ${Math.round(p.fitness)}`} className="hidden md:flex justify-center"><FitnessBar value={p.fitness} /></span>
        <span data-cm-cell="mood" title={`Morale ${Math.round(p.morale)}`} className="text-sm w-5 shrink-0 text-center md:w-auto">{moraleEmoji(p.morale)}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && <SquadRowDetail p={p} career={career} scoutLevel={scoutLevel} money={money} />}
    </div>
  );
}

interface SquadScreenProps {
  squad: CMPlayer[];
  xiIds: (string | null)[];
  /* Round 194: which sealed world's nationality map to read. */
  eraId?: string;
  /* Round 505: who wears the armband, read off the save's set piece block. */
  captainId?: string | null;
  /* Round 715: the save, for the money symbol, the lead scout, the bids on
     the table and where each man ranks in the dressing room. */
  career: CareerState;
}

/**
 * Full squad list with fitness, morale and availability status.
 *
 * Round 715 (the spec's squad page): every row carries the ceiling as the
 * scouts read it, the wage, the years left and what he would sell for, every
 * column sorts, and a tap on a row opens the whole picture on him in small
 * tiles, so the phone list stays one short line a man.
 */
export function SquadScreen({ squad, xiIds, eraId, captainId = null, career }: SquadScreenProps) {
  const inXI = new Set(xiIds.filter((id): id is string => !!id));
  const [sort, setSort] = useState<{ key: SquadSortKey; dir: SortDir }>({ key: 'ovr', dir: 'desc' });
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const scoutLevel = staffLevel(career, 'scout');
  const money = moneyIn(career);
  const sorted = useMemo(() => sortSquad(squad, sort.key, sort.dir, scoutLevel), [squad, sort, scoutLevel]);
  /* Round 978: the men back from international duty, while the match they came back for is ahead. */
  const back = backFromDuty(career);
  const resting = restingIds(career);
  const dutyById = new Map(back.map(call => [call.id, call]));
  const backOpp = career.intl?.last?.backOpponent ?? null;
  /* A rested man you put back in the eleven yourself plays, so he is not resting any more. */
  const restingNow = (id: string) => resting.has(id) && !career.xiIds.includes(id);
  const restNames = back.filter(call => restingNow(call.id)).map(call => call.name);
  /* The ask is only shown while the assistant's note is still waiting for an answer. */
  const asked = (career.inbox ?? []).some(m => m.kind === 'intlDuty' && !m.resolved);

  const pick = (key: SquadSortKey) => setSort(s => (
    s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_BY_KEY.get(key)?.first ?? 'desc' }
  ));
  const toggle = (id: string) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div data-cm-squad-list data-cm-sort-key={sort.key} data-cm-sort-dir={sort.dir} className="bg-card border border-border rounded-2xl p-3 md:p-4">
      {back.length > 0 && (
        <div data-cm-intl-banner className="mb-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-foreground">
          <span className="font-bold">🌍 Back from international duty{backOpp ? ` for ${backOpp}` : ''}: {back.length} {back.length === 1 ? 'player' : 'players'}.</span>{' '}
          {restNames.length > 0
            ? <span>Resting for that game: {restNames.join(', ')}. They are on the bench: put one back in your eleven and he plays.</span>
            : asked
              ? <span className="text-muted-foreground">They start tired unless you rest the spent ones: your assistant asks in the inbox.</span>
              : <span className="text-muted-foreground">They start that game on tired legs.</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60 md:border-0 md:pb-0.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Player ({squad.length} in squad)</span>
        <span className="flex items-center gap-1 md:hidden">
          <select
            aria-label="Sort squad"
            value={sort.key}
            onChange={e => {
              const key = e.target.value as SquadSortKey;
              setSort({ key, dir: SORT_BY_KEY.get(key)?.first ?? 'desc' });
            }}
            className="h-8 rounded-lg border border-border bg-secondary px-2 text-[11px] text-foreground"
          >
            {SQUAD_SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSort(s => ({ key: s.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            aria-label={sort.dir === 'asc' ? 'Sorted low to high, tap for high to low' : 'Sorted high to low, tap for low to high'}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-secondary text-foreground"
          >
            <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      {/* The column heads, 768 up. Tap one to sort by it, again to flip it. */}
      <div className={cn('hidden border-b border-border/60 pb-1', GRID)}>
        {DESK_HEADS.map((key, i) => {
          if (!key) return <span key={`blank${i}`} aria-hidden="true" />;
          const def = SORT_BY_KEY.get(key) as SquadSortDef;
          const on = sort.key === key;
          return (
            <button
              key={key}
              type="button"
              data-cm-sort={key}
              onClick={() => pick(key)}
              title={def.title}
              aria-label={`Sort by ${def.label.toLowerCase()}`}
              className={cn(
                'h-8 min-w-0 flex items-center gap-0.5 text-[10px] uppercase tracking-wide rounded transition-colors hover:text-foreground',
                key === 'name' ? 'justify-start' : key === 'wage' || key === 'worth' ? 'justify-end' : 'justify-center',
                on ? 'text-primary font-bold' : 'text-muted-foreground',
              )}
            >
              <span className="truncate">{def.head}</span>
              {on && <Arrow className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {sorted.map(p => (
        <SquadRow
          key={p.id}
          p={p}
          career={career}
          eraId={eraId}
          inXI={inXI.has(p.id)}
          isCaptain={captainId === p.id}
          isOpen={openIds.has(p.id)}
          onToggle={toggle}
          sortKey={sort.key}
          scoutLevel={scoutLevel}
          money={money}
          duty={dutyById.has(p.id) ? { call: dutyById.get(p.id)!, resting: restingNow(p.id) } : null}
        />
      ))}
      <p className="text-[9px] text-muted-foreground pt-2">
        Tap a player for the full picture. The ceiling is the scouts' read, never the real number, and a better lead scout narrows it.
      </p>
    </div>
  );
}

export default SquadScreen;
