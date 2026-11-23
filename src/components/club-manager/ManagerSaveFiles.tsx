import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  captureClubManagerImportTarget, clubManagerDownload, importClubManagerSave, readClubManagerFile,
  type ClubManagerImportTarget,
} from '@/lib/clubManagerPortable';
import { readSlots, readSlotSave } from '@/lib/clubManagerSlots';

const FILE_MESSAGES = {
  invalid: 'This file does not contain a readable Club Manager career.',
  unsupported: 'This version of the save file is unsupported.',
  'too-large': 'This save file is too large to open.',
  unreadable: 'Could not read this file. Choose it again.',
};
const IMPORT_MESSAGES = {
  occupied: 'This slot already holds a career. Choose an empty slot.',
  changed: 'Your slots changed. Review them and choose again.',
  invalid: FILE_MESSAGES.invalid,
  failed: 'Could not save the imported career in this browser. Try again.',
};
const fileButton = 'min-h-11 shrink-0 rounded-lg bg-secondary px-3 text-sm font-semibold text-foreground';

export default function ManagerSaveFiles({ onClose, onImported, restoreFocus }: {
  onClose: () => void;
  onImported?: () => void;
  restoreFocus: () => void;
}) {
  const [slots, setSlots] = useState(readSlots);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<{ slot: number; claim: ClubManagerImportTarget } | null>(null);
  const job = useRef<AbortController | null>(null);

  useEffect(() => {
    const refresh = () => setSlots(readSlots());
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      job.current?.abort();
    };
  }, []);

  const download = (slot: number) => {
    const raw = readSlotSave(slot);
    const file = raw && clubManagerDownload(raw);
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `club-manager-slot-${slot}.json`;
        document.body.appendChild(link);
        try { link.click(); } finally {
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        setMessage('Save download started.');
        return;
      } catch { /* The browser may refuse a download. */ }
    }
    setMessage('Could not download this save. Try again.');
    setSlots(readSlots());
  };

  const choose = (slot: number) => {
    if (job.current) return;
    setMessage('');
    try {
      const capture = captureClubManagerImportTarget(localStorage, slot);
      if (capture.kind === 'ready') {
        target.current = { slot, claim: capture.target };
        input.current?.click();
        return;
      }
      setMessage(IMPORT_MESSAGES[capture.kind]);
    } catch {
      setMessage(IMPORT_MESSAGES.failed);
    }
    setSlots(readSlots());
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    const request = target.current;
    target.current = null;
    if (!request || !file || job.current) return;
    const task = new AbortController();
    job.current = task;
    setBusy(true);
    setMessage('Reading save file...');
    try {
      const save = await readClubManagerFile(file);
      if (task.signal.aborted) return;
      if (save.kind !== 'ready') {
        setMessage(FILE_MESSAGES[save.kind]);
        return;
      }
      const result = await importClubManagerSave(localStorage, request.claim, save, task.signal);
      if (task.signal.aborted || result === 'cancelled') return;
      if (result === 'imported') {
        setMessage(`Career imported into slot ${request.slot}.`);
        onImported?.();
      } else setMessage(IMPORT_MESSAGES[result]);
      setSlots(readSlots());
    } catch {
      if (!task.signal.aborted) setMessage(IMPORT_MESSAGES.failed);
    } finally {
      job.current = null;
      if (!task.signal.aborted) setBusy(false);
    }
  };

  return <Dialog open onOpenChange={open => {
    if (open) return;
    job.current?.abort();
    onClose();
  }}>
    <DialogContent
      className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-xl p-4 [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11"
      onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}
    >
      <DialogHeader>
        <DialogTitle>Save files</DialogTitle>
        <DialogDescription>Download a copy or import a career into an empty slot. Imported careers play unranked.</DialogDescription>
      </DialogHeader>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={importFile} aria-label="Club Manager save file" />
      <ul className="space-y-2">
        {slots.map(({ slot, summary, damaged }) => <li key={slot} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <div className="min-w-0 text-sm">
            <div className="font-semibold">Slot {slot}</div>
            <div className="break-words text-muted-foreground">{summary?.clubName ?? (damaged ? 'Unreadable save' : 'Empty slot')}</div>
          </div>
          {summary ? <div className="flex shrink-0 gap-1">
            <Link to={`/club-manager?slot=${slot}`} className={`${fileButton} inline-flex items-center`} aria-label={`Open slot ${slot}`}>Open</Link>
            <button type="button" className={fileButton} disabled={busy} onClick={() => download(slot)} aria-label={`Download slot ${slot}`}>Download</button>
          </div>
            : !damaged && <button type="button" className={fileButton} disabled={busy} onClick={() => choose(slot)} aria-label={`Import into slot ${slot}`}>Import</button>}
        </li>)}
      </ul>
      <div role="status" className="text-sm">{message}</div>
    </DialogContent>
  </Dialog>;
}
