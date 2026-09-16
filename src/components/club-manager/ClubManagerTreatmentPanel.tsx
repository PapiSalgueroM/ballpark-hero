import { ShieldAlert } from 'lucide-react';
import type { CareerState } from '@/lib/clubManager';

export default function ClubManagerTreatmentPanel({ unavailable }: {
  unavailable: CareerState['squad'];
}) {
  return (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Treatment room
                  </div>
                  {unavailable.length === 0 && <p className="text-xs text-muted-foreground">Everyone is fit and available. Enjoy it while it lasts.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {unavailable.map(p => (
                      <span key={p.id} className="text-[10px] bg-secondary rounded-full px-2 py-1 text-foreground">
                        {p.injuryWeeks > 0 ? `🩹 ${p.name} (${p.injuryWeeks}w)` : `🟥 ${p.name} (${p.suspendedMatches})`}
                      </span>
                    ))}
                  </div>
                </div>
  );
}
