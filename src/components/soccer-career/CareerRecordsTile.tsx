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
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" data-career-records-tile onClick={() => setOpen(true)} className="w-full min-h-[64px] rounded-xl border border-border bg-card p-3 text-left">
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
