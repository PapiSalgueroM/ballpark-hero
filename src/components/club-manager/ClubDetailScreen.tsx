import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Eye } from 'lucide-react';
import {
  money, sortedTable, isPartialClub, TIER_INFO,
  projectedRoster, projectedXIAvg, yearsOn, worldSeasonLabel,
  boardWantLabel, careerLeagueOf, eraClubDefFor,
  managerOf,
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
  /* Round 146: everything in this viewer reads the SAVE's world. In a 2010
     career the def is the 2010 def, the league is the 2010 league and the
     roster is the 2010 squad aged to the save's season. */
  const def = eraClubDefFor(clubName, career.eraId);
  const league = careerLeagueOf({ clubName, eraId: career.eraId, customClub: career.customClub });
  /* Round 132: the rival viewer shows the rival AS HE IS THIS SEASON. Before
     the clock existed this read the frozen August 2026 bake, so in 2036 you
     could open Liverpool and be looking at a squad list a decade out of date
     while the league table next to it was being decided by something else. */
  const onYears = yearsOn(career);
  /* Round 154: a club you founded has no projected world entry, its squad IS
     the save's squad, so the viewer reads that directly. */
  const isMyCustom = !!career.customClub && clubName === career.customClub.name;
  const roster = isMyCustom
    ? career.squad.map(p => ({ n: p.name, p: p.position, a: p.age, v: p.value ?? 0, r: p.rating, g: p.generated }))
    : projectedRoster(clubName, onYears, career.eraId);
  const xiAvg = isMyCustom
    ? (roster.length ? Math.round([...roster].sort((a, b) => b.r - a.r).slice(0, 11).reduce((s, p) => s + p.r, 0) / Math.min(11, roster.length)) : null)
    : projectedXIAvg(clubName, onYears, career.eraId);
  const squadValue = useMemo(() => roster.reduce((s, p) => s + p.v, 0), [roster]);
  /* Round 145: the board line quotes the real league demand for this club,
     lowercased into the sentence, instead of a raw "top N" rank. */
  const boardWant = useMemo(() => {
    const label = boardWantLabel(clubName, career.eraId);
    // The relegation label is two sentences, which reads wrong mid line. Note
    // "Win the 2. Bundesliga" also contains a period, so no generic split.
    if (label === 'Stay up. Avoid relegation') return 'stay up, avoid relegation';
    return label.charAt(0).toLowerCase() + label.slice(1);
  }, [clubName, career.eraId]);

  const table = sortedTable(career.table);
  const rowIdx = table.findIndex(r => r.club === clubName);
  const row = rowIdx >= 0 ? table[rowIdx] : null;
  const inMyLeague = careerLeagueOf(career).clubs.includes(clubName);

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
            {/* Round 308: the other dugout has a name now. Your own club
                shows your created manager if one exists, second person if
                not, and rivals show the generated name and its tenure. */}
            {clubName === career.clubName ? (
              career.manager && (
                <div className="text-[10px] text-muted-foreground">Dugout: <span className="text-foreground font-semibold">{career.manager.name}</span> (you)</div>
              )
            ) : (
              managerOf(career, clubName) && (
                <div className="text-[10px] text-muted-foreground">
                  Dugout: <span className="text-foreground font-semibold">{managerOf(career, clubName)!.name}</span>
                  {' '}since S{managerOf(career, clubName)!.since}
                </div>
              )
            )}
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
        {/* Round 145: this line used to print the raw strength rank ("top 20"
            at a rank 20 club), which is exactly the phrasing the owner told us
            to kill. It now says what the board actually demands. */}
        <div className="text-[9px] text-muted-foreground mt-2">
          Board wants: <span className="text-foreground font-semibold">{boardWant}</span> · transfer budget around {money(def.budget)}
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
        {isPartialClub(clubName, career.eraId) && roster.length > 0 && (
          <p className="text-[9px] text-yellow-500/80 pt-2">The market data covers only part of this squad.</p>
        )}
        {isMyCustom && (
          <p className="text-[9px] text-yellow-500/80 pt-2">
            The club you founded. Its original squad was generated for it and is marked as made up;
            every real player in it arrived through the transfer market.
          </p>
        )}
        {!isMyCustom && onYears > 0 && roster.length > 0 && (
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
