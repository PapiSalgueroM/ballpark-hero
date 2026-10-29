import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { IntlSummerEntry, IntlTournament } from '@/lib/careerIntl';
import type { IntlSummerNotes } from '@/lib/usCareerSport';
import IntlSummerResult, { PLACE_WORDS } from '@/components/us-career/IntlSummerResult';

/* ─── Round 1557: the International view, behind the Trophy Case's tile ───
   Every summer the national team called him, oldest first, one small tile
   each; a summer he went to opens its result (Round 1544's IntlSummerResult,
   played again from the save) with Back to this list, and this list's own
   Back goes to the case. A summer he rested is a tile with no press. Props
   only (no sport import: simUsCareerWeight section 2), in its own chunk, so
   /nba-my-career's static weight does not carry it (simCareerIntl section 12).
   Every change of view is a new screen and obeys the no scroll rule. */
type Went = Extract<IntlSummerEntry, { went: true }>;

export interface IntlSummersViewProps {
  summers: IntlSummerEntry[];
  /** "the 2004 Olympics in Athens" */
  editionLabel: (id: string) => string;
  /** the tournament played again from the save, and the words for that summer */
  resultOf: (row: Went) => { tournament: IntlTournament | null; notes: IntlSummerNotes };
  onBack: () => void;
}

const cap = (s: string) => s.replace(/^the /, 'The ');

export default function IntlSummersView(p: IntlSummersViewProps) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRevealScroll<HTMLDivElement>(`intl-summers:${open ?? 'list'}`);
  const row = open === null ? null : (p.summers.find(s => s.year === open && s.went) as Went | undefined) ?? null;
  if (row) {
    const r = p.resultOf(row);
    const n = r.notes;
    return (
      <div ref={ref} data-intl-summers-view={row.year}>
        <IntlSummerResult
          editionLabel={n.label} row={row} tournament={r.tournament} nation={n.nation}
          happened={n.happened} fieldNote={n.fieldNote} playedAsNote={n.playedAsNote} statWords={n.statWords}
          hurtCost={n.hurtCost} continueLabel="Back" onContinue={() => setOpen(null)}
        />
      </div>
    );
  }
  const went = p.summers.filter((s): s is Went => s.went);
  const medals = went.filter(s => s.place === 'gold' || s.place === 'silver' || s.place === 'bronze').length;
  const sorted = [...p.summers].sort((a, b) => a.year - b.year);
  return (
    <div ref={ref} data-intl-summers-view="list" className="space-y-3 rounded-xl border-2 border-sky-500/40 bg-gradient-to-b from-sky-500/10 to-transparent p-4">
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-black tracking-tight">🌍 International</h3>
        <p className="text-sm text-muted-foreground" data-intl-summers-count>
          Called up {p.summers.length === 1 ? 'once' : `${p.summers.length} times`}, went {went.length === 1 ? 'once' : `${went.length} times`}, {medals} {medals === 1 ? 'medal' : 'medals'}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map(s => (s.went ? (
          <button
            key={s.year}
            type="button"
            data-intl-summer={s.year}
            onClick={() => setOpen(s.year)}
            className="min-h-[44px] w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary/60"
          >
            <span className="block text-sm font-bold">{cap(p.editionLabel(s.edition))}</span>
            <span className="block text-xs text-muted-foreground">{PLACE_WORDS[s.place]}, {s.wins}-{s.games - s.wins}</span>
          </button>
        ) : (
          <div key={s.year} data-intl-summer-rest={s.year} className="min-h-[44px] w-full rounded-lg border border-border/60 px-3 py-2 text-left">
            <span className="block text-sm font-bold text-muted-foreground">{cap(p.editionLabel(s.edition))}</span>
            <span className="block text-xs text-muted-foreground">You rested that summer.</span>
          </div>
        )))}
      </div>
      <Button data-intl-summers-back onClick={p.onBack} variant="secondary" className="min-h-[44px] w-full text-sm">
        Back
      </Button>
    </div>
  );
}
