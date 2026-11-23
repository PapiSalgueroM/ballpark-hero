import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ContinueSave } from '@/data/continueSaves';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { importSoccerCareerSave, readSoccerCareerFile, soccerCareerDownload } from '@/lib/soccerCareerPortable';
import { isSoccerCareerSave, parseSoccerCareerSave } from '@/lib/soccerCareerSave';
import { readSoccerCareerSavedAt, soccerCareerReceiptKey } from '@/lib/soccerCareerSaveReceipt';
import { getStorageTrouble } from '@/lib/safeStorage';

type SlotSummary =
  | { kind: 'saved'; playerName: string; club: string; age: number; savedAt: string | null }
  | { kind: 'empty' | 'unreadable' | 'unavailable' };

function readSlot(saveKey: string): SlotSummary {
  if (getStorageTrouble() === 'blocked') return { kind: 'unavailable' };
  let raw: string | null;
  try {
    raw = localStorage.getItem(saveKey);
  } catch {
    return { kind: 'unavailable' };
  }
  if (raw === null) return { kind: 'empty' };
  try {
    const parsed = parseSoccerCareerSave(raw);
    if (isSoccerCareerSave(parsed)) {
      const { playerName, currentClub, age } = parsed as CareerState;
      return { kind: 'saved', playerName, club: currentClub, age, savedAt: readSoccerCareerSavedAt(localStorage, saveKey, raw) };
    }
  } catch {
    // Keep the slot visible so its recovery screen can inspect the saved bytes.
  }
  return { kind: 'unreadable' };
}

const SLOT_LABELS = {
  empty: 'Empty slot',
  unreadable: 'Unreadable career',
  unavailable: 'Storage unavailable',
} as const;

const FILE_MESSAGES = {
  invalid: 'Choose a readable Soccer Career save file.',
  unsupported: 'This save file needs a newer version of Soccer Career.',
  'too-large': 'This save file is too large.',
  unreadable: 'Could not read this file. Try selecting it again.',
};

const IMPORT_MESSAGES = {
  occupied: 'This slot already holds a save. Choose an empty slot.',
  failed: 'Could not save this career in this browser. Keep the file and try again.',
};

export default function SoccerCareerSlots({ slots, backPath }: { slots: readonly ContinueSave[]; backPath: string }) {
  const [summaries, setSummaries] = useState(() => slots.map(slot => readSlot(slot.saveKey)));
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputs = useRef(new Map<string, HTMLInputElement>());
  const importJob = useRef<AbortController | null>(null);
  const focusImportedSlot = useRef('');
  const refresh = useCallback(() => setSummaries(slots.map(slot => readSlot(slot.saveKey))), [slots]);

  useEffect(() => () => importJob.current?.abort(), []);
  useEffect(() => {
    const onStorage = ({ key }: StorageEvent) => {
      if (key === null || slots.some(slot => slot.saveKey === key || soccerCareerReceiptKey(slot.saveKey) === key)) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh, slots]);

  const downloadSave = (saveKey: string, number: number) => {
    try {
      const raw = localStorage.getItem(saveKey);
      const file = raw === null ? null : soccerCareerDownload(raw);
      if (file) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `soccer-career-slot-${number}.json`;
        document.body.appendChild(link);
        try { link.click(); } finally {
          link.remove();
          setTimeout(URL.revokeObjectURL.bind(URL, url), 1000);
        }
        setMessage('Save download started.');
        return;
      }
    } catch { /* The browser may have refused the download. */ }
    setMessage('Could not download this save. Try again.');
    refresh();
  };

  const importSave = async (saveKey: string, number: number, file: File) => {
    if (importJob.current) return;
    const job = new AbortController();
    importJob.current = job;
    setImporting(true);
    setMessage('Reading save file...');
    const save = await readSoccerCareerFile(file);
    if (job.signal.aborted) return;
    importJob.current = null;
    setImporting(false);
    if (save.kind !== 'ready') {
      setMessage(FILE_MESSAGES[save.kind]);
      return;
    }
    let result: ReturnType<typeof importSoccerCareerSave> = 'failed';
    try {
      if (getStorageTrouble() !== 'blocked') result = importSoccerCareerSave(localStorage, saveKey, save);
    } catch { /* Access to storage itself may be blocked. */ }
    if (result === 'imported') {
      focusImportedSlot.current = saveKey;
      setMessage(`Career imported into slot ${number}.`);
    } else setMessage(IMPORT_MESSAGES[result]);
    refresh();
  };

  return (
    <section aria-labelledby="soccer-career-slots" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 id="soccer-career-slots" className="text-xl font-bold">Career saves</h1>
          <p className="text-sm text-muted-foreground">Keep up to {slots.length} careers in this browser.</p>
        </div>
        <Button asChild variant="ghost" size="lg" className="shrink-0 px-3">
          <Link to={backPath}>Back</Link>
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ path, saveKey }, index) => {
          const slot = summaries[index];
          const number = index + 1;
          const action = slot.kind === 'saved' ? `Resume slot ${number}`
            : slot.kind === 'empty' ? `New career in slot ${number}` : `Review slot ${number}`;
          return (
            <li key={saveKey} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <h2 className="text-xs font-semibold text-muted-foreground">Slot {number}</h2>
              <div>
                <p className="break-words font-bold">{slot.kind === 'saved' ? slot.playerName.trim() || 'Unnamed player' : SLOT_LABELS[slot.kind]}</p>
                {slot.kind === 'saved' && <p className="break-words text-sm text-muted-foreground">{slot.club} · Age {slot.age}</p>}
                {slot.kind === 'saved' && slot.savedAt && (
                  <p className="text-xs text-muted-foreground">
                    Saved <time dateTime={slot.savedAt}>{new Date(slot.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </p>
                )}
              </div>
              {slot.kind !== 'unavailable' && (
                <Button asChild variant={slot.kind === 'saved' ? 'default' : 'outline'} className="mt-auto h-auto min-h-11 w-full whitespace-normal px-3 text-center">
                <Link to={path} ref={node => {
                  if (node && focusImportedSlot.current === saveKey) {
                    focusImportedSlot.current = '';
                    node.focus({ preventScroll: true });
                  }
                }}>{action}</Link>
                </Button>
              )}
            {slot.kind === 'saved' && (
              <Button type="button" variant="outline" size="lg" disabled={importing} aria-label={`Download save for slot ${number}`} onClick={() => downloadSave(saveKey, number)}>
                Download save
              </Button>
            )}
            {slot.kind === 'empty' && (
              <>
                <input
                  hidden type="file" accept=".json,application/json" aria-label={`Choose a save file for slot ${number}`}
                  ref={node => {
                    if (node) fileInputs.current.set(saveKey, node);
                    else fileInputs.current.delete(saveKey);
                  }}
                  onChange={event => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void importSave(saveKey, number, file);
                  }}
                />
                <Button type="button" variant="outline" size="lg" disabled={importing} aria-label={`Import save to slot ${number}`} onClick={() => fileInputs.current.get(saveKey)?.click()}>
                  Import save
                </Button>
              </>
            )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="text-sm text-muted-foreground">{message}</p>
    </section>
  );
}
