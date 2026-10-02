/**
 * Round 824: the season's lines on the close screen, shared.
 *
 * One small box with three tabs (the awards, the league leaders, your own
 * club's lines) so the close screen grows by a box, not by a page. Sport
 * neutral: the board hands in its columns, its leaders tables and its awards
 * already worded, and this file only draws them. The NBA board is the first to
 * pass it anything; a board without season lines simply does not render it.
 *
 * Everything in it is the save's own simulated season, and the `note` line
 * says so on every tab, because the rosters carry real names.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FoStatsLeaderTable {
  /** The column, e.g. "Points". */
  label: string;
  rows: { id: string; name: string; team: string; value: number; mine?: boolean }[];
}
export interface FoStatsAward {
  label: string;
  /** The stated rule, one line. */
  rule: string;
  /** Who won it, or null when nobody qualified. */
  winners: { id: string; name: string; team: string; detail: string; mine?: boolean }[];
}
export interface FoStatsTeamLine { id: string; name: string; tag?: string; g: number; values: number[] }

interface FoSeasonStatsCardProps {
  season: number;
  /** Says these are the save's sim numbers. Shown on every tab. */
  note: string;
  /** The qualifying bar, already worded. */
  qualifyLine: string;
  awards: FoStatsAward[];
  leaders: FoStatsLeaderTable[];
  teamName: string;
  /** Column heads for the club's lines after G, e.g. ["PPG", "RPG", "APG"]. */
  columns: string[];
  teamLines: FoStatsTeamLine[];
  /** What the awards tab says when there is nothing to show yet. */
  emptyAwards?: string;
}

type StatsTab = 'awards' | 'leaders' | 'team';

export function FoSeasonStatsCard(props: FoSeasonStatsCardProps) {
  const [tab, setTab] = useState<StatsTab>('awards');
  /* G plus one column per stat, whatever the sport passes. */
  const cols = { gridTemplateColumns: `repeat(${props.columns.length + 1}, 2.2rem)` };
  const TABS: [StatsTab, string][] = [['awards', 'Awards'], ['leaders', 'Leaders'], ['team', 'Your lines']];
  return (
    <div data-season-stats className="rounded-2xl border border-border bg-card p-3 text-left">
      <p className="text-center font-display text-sm font-bold text-foreground">The {props.season} season in numbers</p>
      <p data-sim-note className="mt-0.5 text-center text-[10px] text-muted-foreground">{props.note}</p>
      <div className="mt-2 grid grid-cols-3 gap-1" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn('rounded-full border px-2 py-1 text-[11px] font-bold', tab === k ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'awards' && (
        <div data-stats-awards className="mt-2 space-y-1.5">
          {props.awards.length === 0 && <p className="text-center text-[11px] text-muted-foreground">{props.emptyAwards ?? 'No awards this season.'}</p>}
          {props.awards.map(a => (
            <div key={a.label} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5">
              <p className="text-[11px] font-bold text-foreground">{a.label}</p>
              {a.winners.length === 0
                ? <p className="text-[11px] text-muted-foreground">Nobody qualified.</p>
                : a.winners.map(w => (
                  <p key={w.id} className={cn('text-[11px]', w.mine ? 'font-semibold text-gold' : 'text-foreground')}>
                    {w.name} <span className="text-muted-foreground">({w.team}) {w.detail}</span>
                  </p>
                ))}
              <p className="text-[9px] text-muted-foreground">Rule: {a.rule}.</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'leaders' && (
        <div data-stats-leaders className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {props.leaders.map(t => (
            <div key={t.label} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              {t.rows.map((r, i) => (
                <p key={r.id} className={cn('flex justify-between gap-2 text-[11px]', r.mine ? 'font-semibold text-gold' : 'text-foreground')}>
                  <span className="truncate">{i + 1}. {r.name} <span className="text-muted-foreground">({r.team})</span></span>
                  <b>{r.value}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div data-stats-team className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-background px-2 py-1.5">
          <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[10px] font-bold uppercase text-muted-foreground">
            <span>{props.teamName}</span>
            <span className="grid gap-2 text-right" style={cols}><span>G</span>{props.columns.map(c => <span key={c}>{c}</span>)}</span>
          </div>
          {props.teamLines.length === 0 && <p className="text-[11px] text-muted-foreground">Nobody played.</p>}
          {props.teamLines.map(l => (
            <div key={l.id} className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px] text-foreground">
              <span className="truncate">{l.name}{l.tag ? <span className="text-muted-foreground"> {l.tag}</span> : null}</span>
              <span className="grid gap-2 text-right" style={cols}><span>{l.g}</span>{l.values.map((v, i) => <span key={i}>{v}</span>)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-center text-[9px] text-muted-foreground">{props.qualifyLine}</p>
    </div>
  );
}

export default FoSeasonStatsCard;
