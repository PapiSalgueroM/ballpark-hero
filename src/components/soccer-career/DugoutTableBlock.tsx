/* Round 1524: the dugout's final table, lifted out of the manager's panel in
   src/pages/SoccerCareer.tsx exactly as it was, so the club owner's panel
   (OwnerTail.tsx) shows the same table for a season played on the same
   engine. */
import { revealDelay } from "@/components/club-manager/Celebration";
import type { ManagerState } from "@/lib/soccerCareerEngine";
import { dugoutTableWords } from "@/lib/soccerCareerLeague";

/* ─── Round 1524: the dugout's final table ───
   Lifted out of the manager's panel exactly as it was, so the club owner's
   panel shows the same table for a season played on the same engine. */
export function DugoutTableBlock({ results }: { results: ManagerState["seasonResults"] }) {
        const last = results[results.length - 1];
        if (!last?.table) return null;
        const afterResults = Math.min(results.length, 5);
        /* Round 1029: the table is his club's own league. A club of that
           league the game does not know by name keeps its place, unnamed,
           and a table with no rival we can name says where he finished. A
           season before 2026-27 names no league at all: the game does not
           know which one his club was in that year. The words come from
           dugoutTableWords, which the harness reads too. */
        const { header, named, sizeUnknown, note, orderNote } = dugoutTableWords(last);
        return (
          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{header}</span>
              {last.record && !sizeUnknown && <span className="shrink-0 text-[10px] text-muted-foreground">{last.record}</span>}
            </div>
            {note && (
              <p className="cm-tick-in text-xs" style={{ animationDelay: revealDelay(afterResults) }}>{note}</p>
            )}
            {orderNote && (
              <p className="text-[10px] text-muted-foreground">{orderNote}</p>
            )}
            {named && last.table.map((row, i) => (
              <div
                key={`${last.year}-${i}`}
                className={`cm-tick-in flex items-center justify-between text-xs rounded px-2 py-1 ${row.you ? "bg-primary/15 font-bold" : ""}`}
                style={{ animationDelay: revealDelay(afterResults + i) }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {!sizeUnknown && <span className="w-5 shrink-0 text-right text-muted-foreground">{row.pos}</span>}
                  {/* with no numbers, mark the clubs between the leaders and him */}
                  {sizeUnknown && i > 0 && row.pos > last.table[i - 1].pos + 1 && <span className="shrink-0 text-muted-foreground">…</span>}
                  {row.unnamed || !row.club
                    ? <span className="truncate italic text-muted-foreground">another club</span>
                    : <span className="truncate">{row.club}</span>}
                </span>
                {!sizeUnknown && <span className="shrink-0 tabular-nums">{row.pts} pts</span>}
              </div>
            ))}
            {last.cup && (
              <p className="pt-1 text-[10px] text-muted-foreground">Cup run: {last.cup}</p>
            )}
          </div>
        );
}
