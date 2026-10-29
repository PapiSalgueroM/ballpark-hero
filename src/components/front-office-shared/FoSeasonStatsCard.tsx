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
 *
 * Round 1562: readable on a phone, for every sport that draws it. Nothing a
 * player reads is under the site's text-xs (12 px), the tabs are 44 px tall,
 * and no name is cut: a leader's name wraps beside its value (the row stays
 * one line wherever the name fits, so the card grows least), and below the sm
 * width a club line puts the name on its own line with the numbers under it,
 * because the numbers' columns leave a name about 28 px at 320 wide (the NFL's
 * five; 71 px for the NBA's four).
 * scripts/playFoSeasonCard.mjs measures both boards at three sizes.
 *
 * Round 1566, the phone leftovers of 1562's reviews: below sm a hairline rule
 * sits over every man's two lines, so his numbers read as his and not the next
 * man's, and Your lines is taller there (27rem against sm's 14rem), so a phone
 * shows at least the eleven men of a twelve man club the box showed before the
 * lines stacked, and the page's own scroll stays the main one.
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
      <p data-sim-note className="mt-0.5 text-center text-xs text-muted-foreground">{props.note}</p>
      <div className="mt-2 grid grid-cols-3 gap-1" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn('min-h-[44px] rounded-full border px-2 py-1 text-xs font-bold', tab === k ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'awards' && (
        <div data-stats-awards className="mt-2 space-y-1.5">
          {props.awards.length === 0 && <p className="text-center text-xs text-muted-foreground">{props.emptyAwards ?? 'No awards this season.'}</p>}
          {props.awards.map(a => (
            <div key={a.label} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5">
              <p className="text-xs font-bold text-foreground">{a.label}</p>
              {a.winners.length === 0
                ? <p className="text-xs text-muted-foreground">Nobody qualified.</p>
                : a.winners.map(w => (
                  <p key={w.id} className={cn('text-xs', w.mine ? 'font-semibold text-gold' : 'text-foreground')}>
                    {w.name} <span className="text-muted-foreground">({w.team}) {w.detail}</span>
                  </p>
                ))}
              <p className="text-xs text-muted-foreground">Rule: {a.rule}.</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'leaders' && (
        <div data-stats-leaders className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {props.leaders.map(t => (
            <div key={t.label} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              {t.rows.map((r, i) => (
                <p key={r.id} className={cn('flex justify-between gap-2 text-xs', r.mine ? 'font-semibold text-gold' : 'text-foreground')}>
                  <span className="min-w-0 break-words">{i + 1}. {r.name} <span className="text-muted-foreground">({r.team})</span></span>
                  <b className="shrink-0">{r.value}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div data-stats-team className="mt-2 max-h-[27rem] overflow-y-auto rounded-lg border border-border/60 bg-background px-2 py-1.5 sm:max-h-56">
          <div className="grid grid-cols-1 gap-x-2 text-xs font-bold uppercase text-muted-foreground sm:grid-cols-[1fr_auto]">
            <span className="min-w-0 break-words">{props.teamName}</span>
            <span className="grid justify-self-end gap-2 text-right" style={cols}><span>G</span>{props.columns.map(c => <span key={c}>{c}</span>)}</span>
          </div>
          {props.teamLines.length === 0 && <p className="text-xs text-muted-foreground">Nobody played.</p>}
          {props.teamLines.map(l => (
            <div key={l.id} data-stats-team-row className="grid grid-cols-1 gap-x-2 border-t border-border/60 text-xs text-foreground sm:grid-cols-[1fr_auto] sm:border-t-0">
              <span className="min-w-0 break-words">{l.name}{l.tag ? <span className="text-muted-foreground"> {l.tag}</span> : null}</span>
              <span className="grid justify-self-end gap-2 text-right" style={cols}><span>{l.g}</span>{l.values.map((v, i) => <span key={i}>{v}</span>)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-center text-xs text-muted-foreground">{props.qualifyLine}</p>
    </div>
  );
}

export default FoSeasonStatsCard;
