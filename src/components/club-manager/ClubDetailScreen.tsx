import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Eye } from 'lucide-react';
import {
  clubDefFor, leagueOf, money, sortedTable, isPartialClub, TIER_INFO,
  projectedRoster, projectedXIAvg, yearsOn, worldSeasonLabel,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { ratingTint, MadeUpTag } from '@/components/club-manager/SquadScreen';

interface ClubDetailScreenProps {
  clubName: string;
  career: CareerState;
  onBack: () => void;
}

/**
 * Round 74: the rival viewer. Tap any club anywhere and see everything:
 * squad, values, form, standing. His words: "see everything of everything of
 * rivals just by clicking on their team."
 */
export function ClubDetailScreen({ clubName, career, onBack }: ClubDetailScreenProps) {
  const def = clubDefFor(clubName);
  const league = leagueOf(clubName);
  /* Round 132: the rival viewer shows the rival AS HE IS THIS SEASON. Before
     the clock existed this read the frozen August 2026 bake, so in 2036 you
     could open Liverpool and be looking at a squad list a decade out of date
     while the league table next to it was being decided by something else. */
  const onYears = yearsOn(career);
  const roster = projectedRoster(clubName, onYears);
  const xiAvg = projectedXIAvg(clubName, onYears);
  const squadValue = useMemo(() => roster.reduce((s, p) => s + p.v, 0), [roster]);

  const table = sortedTable(career.table);
  const rowIdx = table.findIndex(r => r.club === clubName);
  const row = rowIdx >= 0 ? table[rowIdx] : null;
  const inMyLeague = leagueOf(career.clubName).clubs.includes(clubName);

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Club header */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
          <div className="min-w-0">
            <div className="text-xl font-bold font-display text-foreground truncate">{clubName}</div>
            <div className="text-[10px] text-muted-foreground">
              {league.name} · {TIER_INFO[def.tier].emoji} {TIER_INFO[def.tier].label}
              {clubName === career.clubName ? ' · your club' : ''}
            </div>
          </div>
          <Eye className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold font-display text-foreground">{xiAvg !== null ? Math.round(xiAvg) : '-'}</div>
            <div className="text-[9px] text-muted-foreground">Best XI</div>
          </div>
          <div>
            <div className="text-lg font-bold font-display text-gold">{money(Math.round(squadValue))}</div>
            <div className="text-[9px] text-muted-foreground">Squad value</div>
          </div>
          <div>
            <div className="text-lg font-bold font-display text-foreground">{row && inMyLeague ? `#${rowIdx + 1}` : '-'}</div>
            <div className="text-[9px] text-muted-foreground">Position</div>
          </div>
          <div>
            <div className="text-lg font-bold font-display text-foreground">{row && inMyLeague ? `${row.w}-${row.d}-${row.l}` : '-'}</div>
            <div className="text-[9px] text-muted-foreground">W-D-L</div>
          </div>
        </div>
        {row && inMyLeague && (
          <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-border/40">
            <div><span className="text-xs font-bold text-foreground">{row.gf}</span> <span className="text-[9px] text-muted-foreground">scored</span></div>
            <div><span className="text-xs font-bold text-foreground">{row.ga}</span> <span className="text-[9px] text-muted-foreground">conceded</span></div>
            <div><span className="text-xs font-bold text-foreground">{row.pts}</span> <span className="text-[9px] text-muted-foreground">points</span></div>
          </div>
        )}
        <div className="text-[9px] text-muted-foreground mt-2">
          Board expects: <span className="text-foreground font-semibold">{def.expectation === 1 ? 'the title' : `top ${def.expectation}`}</span> · transfer budget around {money(def.budget)}
        </div>
      </div>

      {/* Full squad */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide pb-1 border-b border-border/60">
          <span>Squad ({roster.length} on the books)</span>
          <span>Worth · OVR</span>
        </div>
        {roster.map(p => (
          <div key={p.n} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
            <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.p}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground truncate">{p.n}</span>
                {p.g && <MadeUpTag />}
              </div>
              <div className="text-[9px] text-muted-foreground">{p.a}y</div>
            </div>
            <span className="text-[10px] font-bold text-gold shrink-0">{money(p.v)}</span>
            <span className={cn('text-sm font-bold font-display w-7 text-right', ratingTint(p.r))}>{p.r}</span>
          </div>
        ))}
        {roster.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No scouted data on this squad yet.</p>
        )}
        {isPartialClub(clubName) && roster.length > 0 && (
          <p className="text-[9px] text-yellow-500/80 pt-2">The market data covers only part of this squad.</p>
        )}
        {onYears > 0 && roster.length > 0 && (
          <p className="text-[9px] text-yellow-500/80 pt-2">
            {worldSeasonLabel(career)} squad. Real players from August 2026 aged forward, with anyone who retired replaced by
            players this game made up, marked above.
          </p>
        )}
      </div>
    </div>
  );
}

export default ClubDetailScreen;
