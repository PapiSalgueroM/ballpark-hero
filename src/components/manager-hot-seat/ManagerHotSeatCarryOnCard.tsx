import { useState } from 'react';
import { canCarryOn, carryOnInClubManager, carryOnSummary, ordinal, type HotSeatRun } from '@/lib/managerHotSeat';

/* Round 956: a manager who keeps the job keeps it in Club Manager. The run's
   own state goes across through Club Manager's save, so the season, the table
   and the board are the ones on this screen. A full page load opens it, which
   boots Club Manager from that save the same way a return visit does.
   Review fix: the card gates itself on canCarryOn and takes the page change
   as a prop, so src/test/managerHotSeatCarryOnCard.test.tsx can hold which
   button replaces a career and which one never does. */
function openPage(path: string) {
  window.location.assign(path);
}
import { markLandOnHub } from '@/lib/clubManagerLanding';
import { readSlots, type SlotView } from '@/lib/clubManagerSlots';
import { freeSlot, handOverCareer } from '@/lib/clubManagerHandOver';

/** Round 1592: a manager slot's career in words, the way the chooser names it. */
function slotWords(v: SlotView): string {
  const s = v.summary;
  if (!s) return v.damaged ? `slot ${v.slot} (a save this browser can't read)` : `slot ${v.slot} (empty)`;
  /* The managers screen's own words for a career, so the player knows which one it is. */
  return `slot ${v.slot} (${s.clubName}, ${s.worldSeason}, season ${s.season}${s.historic ? `, started in ${s.eraLabel}` : ''})`;
}

function listWords(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* Round 1592 (report fe949903): the card says which manager slot the job goes
   into and which careers stay, and it never writes over one. With all three
   slots full the press opens a chooser that names each career, with a cancel;
   the one picked is kept aside first, so Club Manager can put it back. */
export function CarryOnCard({ run, openPath = openPage }: { run: HotSeatRun; openPath?: (path: string) => void }) {
  const [slots, setSlots] = useState<SlotView[]>(() => readSlots());
  const [choosing, setChoosing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [going, setGoing] = useState(false);
  /* Below every hook: a sacked manager gets no card at all. */
  if (!canCarryOn(run)) return null;
  const s = carryOnSummary(run);
  const target = freeSlot(slots);
  const held = slots.filter(v => v.summary || v.damaged);

  const go = (replace?: SlotView) => {
    if (going) return;
    const res = carryOnInClubManager(run, career => handOverCareer(career, replace));
    if (res === 'saved') {
      setGoing(true);
      /* Round 1323: and Club Manager opens it on the hub, not the managers screen. */
      markLandOnHub();
      openPath('/club-manager');
      return;
    }
    setSlots(readSlots());
    if (res === 'full') {
      setChoosing(true);
      setNote(null);
    } else if (res === 'changed') {
      setNote('That slot changed since this card read it, so nothing was replaced. Here are your careers as they stand now.');
    } else if (res === 'failed') {
      setChoosing(false);
      setNote('Your browser would not save it, so nothing changed. Free up some space for this site and try again.');
    }
  };

  const cancel = () => {
    setChoosing(false);
    setNote('No problem, all three of your Club Manager careers are untouched.');
  };

  const where = target !== null
    ? `This job goes into Club Manager slot ${target}.${held.length ? ` Your ${held.length === 1 ? 'career' : 'careers'} in ${listWords(held.map(slotWords))} ${held.length === 1 ? 'stays exactly as it is' : 'stay exactly as they are'}.` : ''}`
    : 'All three Club Manager slots hold a career, so you pick which one this job replaces. The one you pick is kept aside first, and Club Manager offers to put it back.';

  return (
    <div className="rounded-lg border border-primary/50 bg-primary/5 p-4" data-testid="hot-seat-carry-on">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">Carry on in Club Manager</div>
      <p className="mt-1 text-sm">
        The job is yours, so keep it. This exact season goes across: {run.state.clubName}, {ordinal(s.position)} of {s.clubs} on {s.points} points after {s.leaguePlayed} league games, the same squad and the board on {s.board}. {s.windowFirst ? 'The transfer window is open first, then you pick it up at the next fixture.' : 'You pick it up at the next fixture.'}
      </p>
      {s.boardTone !== 'good' && (
        <p className="mt-1 text-xs text-muted-foreground" data-testid="hot-seat-carry-on-board">
          Careful: on {s.board} the board still have you down as {s.boardBand.toLowerCase()}. Club Manager's board can sack you too, so the next few results still count.
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground" data-testid="hot-seat-carry-on-slot">{where}</p>
      <p className="mt-1 text-xs text-muted-foreground">Not now? The offer waits on the menu until you start another run, or until tomorrow for the daily.</p>
      {choosing && target === null ? (
        <div className="mt-3 rounded-md bg-muted p-3 text-sm" role="alertdialog" aria-label="Which Club Manager career does this job replace?" data-testid="hot-seat-carry-on-choose">
          <p>Pick the career this job replaces. It's kept aside on this device first, so Club Manager can put it back later. Any save points stored in that slot are deleted for good, even if you put it back.</p>
          {/* Review fix: a note from the chooser sits above its options, where the eye already is, not under Cancel and off screen. */}
          {note && <p className="mt-2 text-xs font-semibold text-foreground" role="status">{note}</p>}
          <div className="mt-2 grid grid-cols-1 gap-2">
            {held.map(v => (
              <button key={v.slot} type="button" onClick={() => go(v)} disabled={going} data-testid={`hot-seat-carry-on-replace-${v.slot}`} className="min-h-[44px] rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-semibold disabled:opacity-50">
                Replace {slotWords(v)}
              </button>
            ))}
            <button type="button" onClick={cancel} className="min-h-[44px] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Cancel, keep all three</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => go()} disabled={going} className="mt-3 min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
          {going ? 'Opening Club Manager...' : 'Carry on in Club Manager'}
        </button>
      )}
      {note && !(choosing && target === null) && <p className="mt-2 text-xs text-muted-foreground" role="status">{note}</p>}
    </div>
  );
}

export default CarryOnCard;
