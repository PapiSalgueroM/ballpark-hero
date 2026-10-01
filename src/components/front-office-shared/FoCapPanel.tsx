/**
 * Round 722: the cap panel at the top of a front office Roster box, shared.
 *
 * Every GM board prints its payroll against its line, the day the figure was
 * read and, since Round 631, the dead money on the books. The NBA now also
 * carries a luxury tax with two aprons and a fourteen man tip off floor, and
 * rather than grow those lines inside one board they come in here as a sport
 * descriptor: a board that has a tax passes `tax`, a board with a roster
 * floor passes `roster`, and a board with neither passes neither and renders
 * exactly its old two lines. What the extra lines SAY is decided in
 * src/lib/foHub.ts (foCapLines), so it is checkable without a browser.
 *
 * The first two lines keep their shape on purpose: the cuts test reads the
 * dead money off the payroll line, and simLeagueCaps reads the cap off the
 * line directly above the date line.
 */
import { foCapLines, type FoRosterFacts, type FoTaxFacts } from '@/lib/foHub';
import { cn } from '@/lib/utils';

interface FoCapPanelProps {
  /** The sport's own payroll sentence, e.g. "Payroll $214.3M of $165M". */
  headline: string;
  /** This season's dead money, $M; the line grows a red figure only when there is some. */
  dead: number;
  /** The read date line, capNote() from leagueCaps. */
  note: string;
  tax?: FoTaxFacts;
  roster?: FoRosterFacts;
}

export function FoCapPanel({ headline, dead, note, tax, roster }: FoCapPanelProps) {
  const lines = foCapLines({ tax, roster });
  return (
    <>
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {headline}
        {dead > 0 && <> · dead money <b className="text-destructive">${dead}M</b></>}
      </p>
      <p className="mb-2 text-center text-[10px] text-muted-foreground">{note}</p>
      {lines.length > 0 && (
        <div data-cap-lines className="mb-2 space-y-0.5 text-center text-[10px]">
          {lines.map((l, i) => (
            <p key={i} className={cn(l.tone === 'bad' ? 'text-destructive' : l.tone === 'good' ? 'text-primary' : 'text-muted-foreground')}>{l.text}</p>
          ))}
        </div>
      )}
    </>
  );
}

export default FoCapPanel;
