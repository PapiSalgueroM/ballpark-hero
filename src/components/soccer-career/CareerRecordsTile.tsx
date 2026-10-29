import { Component, lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { careerRecordBook } from '@/lib/soccerCareerRecords';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const RecordsSheet = lazy(() => import('./CareerRecordsSheet'));

function RecordsFallback({ failed, onClose, restoreFocus }: { failed?: boolean; onClose: () => void; restoreFocus: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <DialogHeader><DialogTitle>{failed ? 'Record book unavailable' : 'Opening your record book'}</DialogTitle>
        <DialogDescription>{failed ? 'The record book could not open. Your career is safe.' : 'Your saved seasons are loading.'}</DialogDescription></DialogHeader>
      <button type="button" className="min-h-11 rounded-xl border border-border px-3" onClick={onClose}>Back to your career</button>
    </DialogContent>
  </Dialog>;
}

class RecordsBoundary extends Component<{ children: ReactNode; onClose: () => void; restoreFocus: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <RecordsFallback failed onClose={this.props.onClose} restoreFocus={this.props.restoreFocus} />;
  }
}

export function CareerRecordsTile({ career }: { career: CareerState }) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const trigger = useRef<HTMLButtonElement>(null);
  const book = careerRecordBook(career);
  if (!book.rows.length) return null;
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const restoreFocus = () => { if (!openRef.current) trigger.current?.focus({ preventScroll: true }); };
  /* Round 1568: the scroll margins keep the tile clear of the site's 44 px bar above and the career's floating
     action bar below (about 73 px) whenever the browser brings it into view, Tab included. On a 390 by 844 phone
     the site bar moved it to 757 to 839 at the top of the page, so a Tab onto it left all but 14 px of the focused
     tile behind the action bar and a tap had to scroll the page first. Nothing moves on screen. */
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" data-career-records-tile onClick={() => setOpen(true)} className="w-full min-h-[64px] scroll-mt-14 scroll-mb-24 rounded-xl border border-border bg-card p-3 text-left">
      <span className="block text-sm font-semibold">📖 Record book</span>
      <span className="block text-xs text-muted-foreground">Your best seasons and every club spell</span>
      <span className="block text-xs font-bold mt-1">{book.totals.apps} senior appearances · {book.stints.length} club {book.stints.length === 1 ? 'spell' : 'spells'}</span>
    </button>
    {open && <RecordsBoundary onClose={close} restoreFocus={restoreFocus}>
      <Suspense fallback={<RecordsFallback onClose={close} restoreFocus={restoreFocus} />}>
        <RecordsSheet career={career} onClose={close} />
      </Suspense>
    </RecordsBoundary>}
  </>;
}
