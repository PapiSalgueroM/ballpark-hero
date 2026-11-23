import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ContinueSave } from '@/data/continueSaves';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { readSoccerCareerCheckpoint, restoreSoccerCareerCheckpoint, soccerCareerCheckpointKey } from '@/lib/soccerCareerCheckpoint';
import { importSoccerCareerSave, readSoccerCareerFile, soccerCareerDownload } from '@/lib/soccerCareerPortable';
import { isSoccerCareerSave, parseSoccerCareerSave } from '@/lib/soccerCareerSave';
import { readSoccerCareerSavedAt, soccerCareerReceiptKey } from '@/lib/soccerCareerSaveReceipt';
import { getStorageTrouble } from '@/lib/safeStorage';

type Checkpoint = NonNullable<ReturnType<typeof readSoccerCareerCheckpoint>>;
type AvailableSlot = (
  { kind: 'saved'; raw: string; playerName: string; club: string; age: number; savedAt: string | null }
  | { kind: 'unreadable'; raw: string }
  | { kind: 'empty'; raw: null }
) & { checkpoint: Checkpoint | null };
type SlotSummary = AvailableSlot | { kind: 'unavailable' };
type CheckpointRestore = { saveKey: string; number: number; raw: string | null; checkpoint: Checkpoint };

function readSlot(saveKey: string): SlotSummary {
  if (getStorageTrouble() === 'blocked') return { kind: 'unavailable' };
  let storage: Storage;
  let raw: string | null;
  try {
    storage = localStorage;
    raw = storage.getItem(saveKey);
  } catch {
    return { kind: 'unavailable' };
  }
  const checkpoint = readSoccerCareerCheckpoint(storage, saveKey);
  if (raw === null) return { kind: 'empty', raw: null, checkpoint };
  try {
    const parsed = parseSoccerCareerSave(raw);
    if (isSoccerCareerSave(parsed)) {
      const { playerName, currentClub, age } = parsed as CareerState;
      return {
        kind: 'saved', raw, playerName, club: currentClub, age, checkpoint,
        savedAt: readSoccerCareerSavedAt(storage, saveKey, raw),
      };
    }
  } catch {
    // Keep the slot visible so its recovery screen can inspect the saved bytes.
  }
  return { kind: 'unreadable', raw, checkpoint };
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

const RESTORE_MESSAGES = {
  moved: 'This slot changed. Review the saves and try again.',
  failed: 'Could not restore the checkpoint. Your saves are still in this browser.',
  current: 'This checkpoint is already open in this slot.',
};

const slotLinkId = (number: number) => `soccer-career-slot-${number}-link`;
const checkpointLabel = ({ playerName, year }: Checkpoint) => `${playerName.trim() || 'Unnamed player'} · ${year}`;
const SoccerCareerAccountSaves = lazy(() => import('./SoccerCareerAccountSaves'));

export default function SoccerCareerSlots({ slots, backPath }: { slots: readonly ContinueSave[]; backPath: string }) {
  const [summaries, setSummaries] = useState(() => slots.map(slot => readSlot(slot.saveKey)));
  const [importing, setImporting] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [restoreRequest, setRestoreRequest] = useState<CheckpointRestore | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const restoreOpener = useRef<HTMLButtonElement | null>(null);
  const focusRestoredSlot = useRef<number | null>(null);
  const fileInputs = useRef(new Map<string, HTMLInputElement>());
  const importJob = useRef<AbortController | null>(null);
  const focusImportedSlot = useRef('');
  const refresh = useCallback(() => setSummaries(slots.map(slot => readSlot(slot.saveKey))), [slots]);

  useEffect(() => () => importJob.current?.abort(), []);
  useEffect(() => {
    const onStorage = ({ key }: StorageEvent) => {
      if (key === null || slots.some(({ saveKey }) => [saveKey, soccerCareerReceiptKey(saveKey), soccerCareerCheckpointKey(saveKey)].includes(key))) refresh();
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

  const askToRestore = (saveKey: string, number: number, shown: AvailableSlot, opener: HTMLButtonElement) => {
    const current = readSlot(saveKey);
    if (!('raw' in current) || current.raw !== shown.raw || !current.checkpoint || current.checkpoint.raw !== shown.checkpoint?.raw) {
      setMessage(RESTORE_MESSAGES.moved);
      refresh();
      return;
    }
    restoreOpener.current = opener;
    setMessage('');
    setRestoreRequest({ saveKey, number, raw: current.raw, checkpoint: current.checkpoint });
  };

  const confirmRestore = () => {
    if (!restoreRequest) return;
    const { saveKey, number, raw, checkpoint } = restoreRequest;
    let result: ReturnType<typeof restoreSoccerCareerCheckpoint> = 'failed';
    try { result = restoreSoccerCareerCheckpoint(localStorage, saveKey, raw, checkpoint.raw); } catch { /* Storage may be blocked. */ }
    if (result === 'restored') {
      focusRestoredSlot.current = number;
      setMessage(`Checkpoint restored in slot ${number}.`);
    } else setMessage(RESTORE_MESSAGES[result]);
    refresh();
  };

  return (
    <section aria-labelledby="soccer-career-slots" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 ref={heading} id="soccer-career-slots" tabIndex={-1} className="text-xl font-bold">Career saves</h1>
          <p className="text-sm text-muted-foreground">Keep up to {slots.length} careers in this browser.</p>
        </div>
        <Button asChild variant="ghost" size="lg" className="shrink-0 px-3">
          <Link to={backPath}>Back</Link>
        </Button>
      </div>
      <Button id="soccer-career-account-toggle" type="button" variant="outline" size="lg" className="w-full sm:w-auto"
        aria-expanded={accountOpen} aria-controls="soccer-career-account-saves" disabled={importing}
        onClick={() => setAccountOpen(open => !open)}>
        {accountOpen ? 'Back to browser saves' : 'Account saves'}
      </Button>
      <div id="soccer-career-account-saves" hidden={!accountOpen}>
        {accountOpen && (
          <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Opening account saves...</p>}>
            <SoccerCareerAccountSaves slots={slots} locals={summaries.map(slot => !('raw' in slot) ? null : {
              raw: slot.raw,
              summary: slot.kind === 'saved' ? slot : null,
              savedAt: slot.kind === 'saved' ? slot.savedAt : null,
            })} onLocalChange={refresh} />
          </Suspense>
        )}
      </div>
      {!accountOpen && <ul className="grid gap-3 sm:grid-cols-3">
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
                <Link id={slotLinkId(number)} to={path} ref={node => {
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
            {'raw' in slot && slot.checkpoint && (
              <details className="border-t border-border">
                <summary className="min-h-11 cursor-pointer rounded-md px-1 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Last season checkpoint
                </summary>
                <p className="break-words px-1 pb-2 text-sm text-muted-foreground">{checkpointLabel(slot.checkpoint)}</p>
                <Button type="button" variant="outline" size="lg" className="w-full whitespace-normal" disabled={importing}
                  onClick={event => askToRestore(saveKey, number, slot, event.currentTarget)}>
                  Restore checkpoint
                </Button>
              </details>
            )}
            </li>
          );
        })}
      </ul>}
      {!accountOpen && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <AlertDialog open={restoreRequest !== null} onOpenChange={open => { if (!open) setRestoreRequest(null); }}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl" onCloseAutoFocus={event => {
          event.preventDefault();
          const number = focusRestoredSlot.current;
          const resume = number === null ? null : document.getElementById(slotLinkId(number));
          const opener = restoreOpener.current;
          (resume ?? (opener?.isConnected ? opener : heading.current))?.focus({ preventScroll: true });
          focusRestoredSlot.current = null;
          restoreOpener.current = null;
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore checkpoint?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {restoreRequest && <>
                  <p className="break-words font-medium text-foreground">{checkpointLabel(restoreRequest.checkpoint)}</p>
                  <p>{restoreRequest.raw === null
                    ? `This puts the checkpoint in slot ${restoreRequest.number}.`
                    : `This replaces slot ${restoreRequest.number}. Your current save will be kept as a recovery copy.`}</p>
                </>}
                <p>The restored career's retirement score stays off the public leaderboard.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={confirmRestore}>Restore checkpoint</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
