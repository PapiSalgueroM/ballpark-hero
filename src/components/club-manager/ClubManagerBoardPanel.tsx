import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIER_INFO } from '@/lib/clubManager';
import type { ClubDef, ObjectiveStatus, objectiveStatuses } from '@/lib/clubManager';
import { askExplainer, isBoardAsk } from '@/lib/clubManagerBoardAsks';

// Round 70: board objective status chips.
const OBJ_CHIP: Record<ObjectiveStatus, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  onTrack: { label: 'On track', cls: 'bg-secondary text-muted-foreground border-border' },
  behind: { label: 'Behind', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40' },
  failed: { label: 'Failed', cls: 'bg-red-500/10 text-red-400 border-red-500/40' },
};

export default function ClubManagerBoardPanel({ club, objStatuses }: {
  club: ClubDef;
  objStatuses: ReturnType<typeof objectiveStatuses>;
}) {
  return (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> Board expectations · {TIER_INFO[club.tier].blurb}
                  </div>
                  <div className="space-y-1.5">
                    {objStatuses.filter(s => !isBoardAsk(s.objective.id)).map(({ objective, status }) => (
                      <div key={objective.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground min-w-0 truncate">{objective.label}</span>
                        <span className={cn('shrink-0 text-[9px] font-bold border rounded-full px-2 py-0.5', OBJ_CHIP[status].cls)}>
                          {OBJ_CHIP[status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Round 474: the two asks you go out and DO, kept apart from
                      the demands the season hands you, with the line that says
                      how each one is judged so nobody has to guess. */}
                  {objStatuses.some(s => isBoardAsk(s.objective.id)) && (
                    <div className="mt-3 pt-2.5 border-t border-border">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                        🛒 In the market
                      </div>
                      <div className="space-y-2">
                        {objStatuses.filter(s => isBoardAsk(s.objective.id)).map(({ objective, status }) => (
                          <div key={objective.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-foreground min-w-0">{objective.label}</span>
                              <span className={cn('shrink-0 text-[9px] font-bold border rounded-full px-2 py-0.5', OBJ_CHIP[status].cls)}>
                                {OBJ_CHIP[status].label}
                              </span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                              {objective.promised ? 'You gave them your word on this one. ' : ''}
                              {askExplainer(objective)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
  );
}
