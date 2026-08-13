import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GraduationCap, Search, ArrowUpCircle } from 'lucide-react';
import {
  SCOUT_REGIONS, SCOUT_TRIPS, MAX_SCOUTS, MAX_PROSPECTS,
  FACILITY_INFO, academyUpgradeCost, tripCost, money,
} from '@/lib/clubManager';
import type { CareerState, FacilityKind, Prospect, Scout } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';

interface AcademyScreenProps {
  career: CareerState;
  onUpgrade: (kind: FacilityKind) => void;
  onHire: (candidateId: string, regionId: string, weeks: number) => void;
  onRecall: (scoutId: string) => void;
  onPromote: (prospectId: string) => void;
  onRelease: (prospectId: string) => void;
}

function levelTone(level: number): string {
  if (level >= 16) return 'text-primary';
  if (level >= 11) return 'text-emerald-400';
  if (level >= 6) return 'text-yellow-400';
  return 'text-muted-foreground';
}

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** How the report reads, in words, so the number is never the whole story. */
function bandLabel(p: Prospect): string {
  if (p.highGuess >= 84) return 'Could be special';
  if (p.highGuess >= 76) return 'First team ceiling';
  if (p.highGuess >= 68) return 'Squad player at best';
  return 'One for the reserves';
}

function ProspectRow({
  p, budget, squadFull, onPromote, onRelease,
}: {
  p: Prospect; budget: number; squadFull: boolean;
  onPromote: (id: string) => void; onRelease: (id: string) => void;
}) {
  const affordable = p.fee <= budget;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground truncate">
          {p.flag} {p.name} <span className="text-muted-foreground">({p.age})</span>
        </div>
        <div className="text-[9px] text-muted-foreground">
          Now {p.rating} · scout says he tops out {p.lowGuess} to {p.highGuess} · {bandLabel(p)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[9px] text-muted-foreground mb-0.5">{p.fee > 0 ? money(p.fee) : 'Free'}</div>
        <div className="flex gap-1">
          <button
            onClick={() => onPromote(p.id)}
            disabled={!affordable || squadFull}
            className="text-[9px] font-bold rounded-full px-2 py-0.5 border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            Sign him
          </button>
          <button
            onClick={() => onRelease(p.id)}
            className="text-[9px] rounded-full px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Let go
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoutOnTheRoad({ s, onRecall }: { s: Scout; onRecall: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-base shrink-0">{s.regionFlag}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground truncate">{s.name}</div>
        <div className="text-[9px] text-muted-foreground">
          {s.regionName} · {s.weeksLeft} week{s.weeksLeft === 1 ? '' : 's'} left · {s.found} found so far
        </div>
      </div>
      <button
        onClick={() => onRecall(s.id)}
        className="shrink-0 text-[9px] rounded-full px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        Call him home
      </button>
    </div>
  );
}

/**
 * Round 116: the youth setup. Three things you can pour money into, three
 * scouts you can have on the road, and everyone they turn up sitting on the
 * books waiting for you to decide.
 */
export function AcademyScreen({ career, onUpgrade, onHire, onRecall, onPromote, onRelease }: AcademyScreenProps) {
  const a = career.academy;
  const [picking, setPicking] = useState<string | null>(null);
  const [region, setRegion] = useState<string>(SCOUT_REGIONS[0].id);
  const [weeks, setWeeks] = useState<number>(SCOUT_TRIPS[1].weeks);
  const assignRef = useRevealScroll<HTMLDivElement>(`scout:${picking ?? ''}`, { skipFirst: true });

  if (!a) {
    return <p className="text-xs text-muted-foreground text-center py-6">Your academy opens the first time you play a match.</p>;
  }

  const cand = a.candidates.find(c => c.id === picking) ?? null;
  const squadFull = career.squad.length >= 30;
  const prospects = [...a.prospects].sort((x, y) => y.highGuess - x.highGuess);

  return (
    <div className="space-y-2">
      {/* ---- the three levels ---- */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> The setup · {money(career.budget)} to spend
        </div>
        <div className="space-y-2">
          {(['recruitment', 'coaching', 'facilities'] as FacilityKind[]).map(kind => {
            const level = a[kind];
            const cost = academyUpgradeCost(level);
            const maxed = level >= 20;
            return (
              <div key={kind}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground">
                    {FACILITY_INFO[kind].emoji} {FACILITY_INFO[kind].label}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-bold', levelTone(level))}>{level}/20</span>
                    <button
                      onClick={() => onUpgrade(kind)}
                      disabled={maxed || cost > career.budget}
                      className="text-[9px] font-bold rounded-full px-2 py-0.5 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      {maxed ? 'Maxed' : `Upgrade ${money(cost)}`}
                    </button>
                  </span>
                </div>
                <div className="h-1 rounded-full bg-secondary overflow-hidden mt-1">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(level / 20) * 100}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{FACILITY_INFO[kind].blurb}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- scouts ---- */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Search className="w-3 h-3" /> Scouting network · {a.scouts.length}/{MAX_SCOUTS} on the road
        </div>
        {a.scouts.length === 0 && (
          <p className="text-[10px] text-muted-foreground mb-1.5">Nobody is out looking for you. Send someone and reports start landing while the season runs.</p>
        )}
        {a.scouts.map(s => <ScoutOnTheRoad key={s.id} s={s} onRecall={onRecall} />)}

        {a.scouts.length < MAX_SCOUTS && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Available</div>
            <div className="grid grid-cols-1 gap-1">
              {a.candidates.map(c => (
                <button
                  key={c.id}
                  onClick={() => setPicking(picking === c.id ? null : c.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                    picking === c.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-foreground truncate">{c.name}</span>
                    <span className="block text-[9px] text-muted-foreground">
                      Contacts {stars(c.network)} · Judgement {stars(c.judgement)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-gold">{money(c.fee)} base</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {cand && (
          <div ref={assignRef} className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
            <div className="text-[10px] text-foreground font-bold">Send {cand.name} where?</div>
            <div className="flex flex-wrap gap-1">
              {SCOUT_REGIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className={cn(
                    'text-[9px] rounded-full px-2 py-0.5 border transition-colors',
                    region === r.id ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r.flag} {r.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {SCOUT_TRIPS.map(t => (
                <button
                  key={t.weeks}
                  onClick={() => setWeeks(t.weeks)}
                  className={cn(
                    'text-[9px] rounded-full px-2 py-0.5 border transition-colors',
                    weeks === t.weeks ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { onHire(cand.id, region, weeks); setPicking(null); }}
              disabled={tripCost(cand, weeks) > career.budget}
              className="w-full rounded-lg bg-primary text-primary-foreground text-xs font-bold py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Send him for {money(tripCost(cand, weeks))}
            </button>
          </div>
        )}
      </div>

      {/* ---- the kids ---- */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <ArrowUpCircle className="w-3 h-3" /> On the books · {a.prospects.length}/{MAX_PROSPECTS}
        </div>
        {prospects.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Nobody yet. Intake day comes round every summer and the better your recruitment, the better the group.
          </p>
        )}
        {squadFull && prospects.length > 0 && (
          <p className="text-[10px] text-yellow-400 mb-1">Your squad is full. Sell or release someone before you sign another kid.</p>
        )}
        {prospects.map(p => (
          <ProspectRow
            key={p.id} p={p} budget={career.budget} squadFull={squadFull}
            onPromote={onPromote} onRelease={onRelease}
          />
        ))}
        {a.preview && <p className="text-[9px] text-muted-foreground mt-1.5 italic">{a.preview}</p>}
      </div>
    </div>
  );
}
