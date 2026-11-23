import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { nrlClubName } from '@/lib/nrlClubIdentity';
import { NrlCustomBadge } from '@/components/nrl-manager/NrlClubIdentity';
import { BACKUPS_KEPT, browserStorage } from '@/lib/brokenSaveRecovery';
import {
  captureNrlImportTarget, importNrlCareerFile, nrlCareerDownload, readNrlCareerFile, type NrlCareerFile, type NrlImportTarget,
} from '@/lib/nrlPortable';
import {
  NRL_SAVE_SLOTS, nrlCheckpointKey, readNrlSaveSlot, restoreNrlCheckpoint, sameNrlCareer, saveNrlCheckpoint, writeNrlSaveSlot,
} from '@/lib/nrlSaveSlots';
import { fenceKeyOf, saveFence, type FenceWrite } from '@/lib/saveFence';

const readSlots = () => NRL_SAVE_SLOTS.map(entry => ({
  ...readNrlSaveSlot(entry.saveKey),
  checkpoint: readNrlSaveSlot(nrlCheckpointKey(entry.saveKey)),
}));

type Confirmation = { index: number; raw: string } & (
  { kind: 'delete'; club?: string } | { kind: 'replace' | 'restore'; checkpoint: string }
);

export default function NrlCareerSlots({ onOpen, onBack }: { onOpen: (path: string) => void; onBack: () => void }) {
  const [slots, setSlots] = useState(readSlots);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const [review, setReview] = useState<{ target: NrlImportTarget; file: NrlCareerFile } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pendingTarget = useRef<NrlImportTarget | null>(null);

  useEffect(() => {
    const refresh = () => setSlots(readSlots());
    const onStorage = ({ key }: StorageEvent) => {
      if (key === null || NRL_SAVE_SLOTS.some(entry =>
        key === entry.saveKey || key === fenceKeyOf(entry.saveKey) || key === nrlCheckpointKey(entry.saveKey))) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  function ask(next: Confirmation) {
    saveFence.adopt(NRL_SAVE_SLOTS[next.index].saveKey);
    setConfirm(next);
  }

  function finish(key: string, outcome: FenceWrite, success: string, failure: string) {
    saveFence.release(key);
    setConfirm(null);
    setNotice(outcome === 'moved' ? 'This slot changed in another tab.' : outcome === 'failed' ? failure : success);
    setSlots(readSlots());
  }

  function downloadSlot(saveKey: string, number: number) {
    const { raw, career } = readNrlSaveSlot(saveKey);
    if (raw === null || !career) {
      setNotice('A readable career could not be downloaded from this slot.');
      setSlots(readSlots());
      return;
    }
    try {
      const url = URL.createObjectURL(nrlCareerDownload(raw));
      const link = document.createElement('a');
      link.href = url;
      link.download = `nrl-team-manager-slot-${number}.json`;
      document.body.appendChild(link);
      try { link.click(); } finally {
        link.remove();
        setTimeout(URL.revokeObjectURL.bind(URL, url), 1000);
      }
      setNotice('Save download started.');
    } catch {
      setNotice('Could not download this save. Try again.');
    }
  }

  function chooseImport(saveKey: string) {
    const storage = browserStorage();
    const target = storage && captureNrlImportTarget(storage, saveKey);
    if (!target) {
      setNotice('This slot changed. Choose an empty slot to import.');
      setSlots(readSlots());
      return;
    }
    pendingTarget.current = target;
    setNotice('');
    picker.current?.click();
  }

  async function loadImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    const target = pendingTarget.current;
    pendingTarget.current = null;
    if (!file || !target) return;
    setReading(true);
    const checked = await readNrlCareerFile(file);
    setReading(false);
    if (checked) setReview({ target, file: checked });
    else setNotice('Could not use this NRL career file.');
  }

  function confirmImport(number: number) {
    const storage = browserStorage();
    if (!review) return;
    const outcome = storage ? importNrlCareerFile(storage, review.target, review.file) : 'failed';
    if (outcome === 'failed') {
      setNotice('The browser could not save this career. Try again.');
      return;
    }
    setReview(null);
    setNotice(outcome === 'moved' ? 'This slot changed. Choose an empty slot to import.'
      : outcome === 'unverified' ? 'Could not verify the import. Check the slot before trying again.'
      : 'Career imported into slot ' + number + '.');
    setSlots(readSlots());
  }

  function confirmAction() {
    if (!confirm) return;
    const entry = NRL_SAVE_SLOTS[confirm.index];
    const { saveKey } = entry;
    if (confirm.kind === 'delete') {
      const result = writeNrlSaveSlot(saveKey, confirm.raw, null);
      finish(saveKey, result, '', 'This browser could not delete the career. The save is still in its slot.');
    } else if (confirm.kind === 'replace') {
      const result = saveNrlCheckpoint(saveKey, confirm.raw, confirm.checkpoint);
      finish(saveKey, result, 'Checkpoint replaced.', 'This browser could not replace the checkpoint.');
    } else {
      const result = restoreNrlCheckpoint(entry, confirm.raw, confirm.checkpoint);
      finish(saveKey, result, 'Checkpoint restored. Your previous progress is in recovery.',
        'This browser could not restore the checkpoint. The career is still in its slot.');
    }
  }

  return (
    <section aria-labelledby="nrl-save-slots" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="nrl-save-slots" className="text-xl font-bold">Career saves</h2>
          <p className="text-sm text-muted-foreground">Keep up to three careers in this browser.</p>
          <p className="mt-1 text-sm text-muted-foreground">Each slot holds one checkpoint for its current career.</p>
          <p className="mt-1 text-sm text-muted-foreground">Download a copy to keep outside this browser.</p>
        </div>
        <Button type="button" size="lg" variant="ghost" className="px-3" onClick={onBack}>Back</Button>
      </div>
      <input ref={picker} type="file" accept=".json,application/json" hidden aria-label="NRL career file" onChange={loadImport} />
      {notice && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{notice}</p>}
      <ul className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ raw, career, available, checkpoint }, index) => {
          const entry = NRL_SAVE_SLOTS[index];
          const number = index + 1;
          const season = career?.season;
          const club = season ? nrlClubName(season.year, season.clubId, career?.customClub, 'full') : undefined;
          const custom = career?.customClub?.slotId === season?.clubId ? career?.customClub : undefined;
          const savedSeason = checkpoint.career?.season;
          const savedClub = savedSeason && nrlClubName(savedSeason.year, savedSeason.clubId, checkpoint.career?.customClub);
          const ownCheckpoint = career && checkpoint.career && sameNrlCareer(career, checkpoint.career);
          const checkpointRaw = checkpoint.raw;
          const pending = confirm?.index === index ? confirm : null;
          const incoming = review?.target.key === entry.saveKey ? review.file.career : null;
          return (
            <li key={entry.saveKey} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">Slot {number}</h3>
              <div className="mt-1 flex items-center gap-2">
                {custom && <NrlCustomBadge {...custom} />}
                <p className="min-w-0 break-words font-bold">{club ?? (raw !== null ? 'Unreadable career' : available ? 'Empty slot' : 'Storage unavailable')}</p>
              </div>
              {career && <p className="text-sm text-muted-foreground">
                Started in {career.openingYear} · {career.season.year + Number(career.satOutSeason === true)} season{career.retired ? ' · Retired' : career.outOfWork ? ' · Out of work' : season.live ? ' · Match at half time' : season.phase === 'complete' ? ' · Season complete' : ''}
                {career.openingRoster && ' · Opening matchday names'}
                {career.importedFromFile && ' · Local play'}
              </p>}
              {savedSeason && <p className="mt-2 break-words text-sm text-muted-foreground">
                Checkpoint · {savedClub} · {savedSeason.year} · Round {savedSeason.round}
                {checkpoint.career?.retired ? ' · Retired' : checkpoint.career?.outOfWork ? ' · Out of work' : savedSeason.live ? ' · Match at half time' : savedSeason.phase === 'complete' ? ' · Season complete' : ''}
              </p>}
              {checkpoint.raw !== null && !savedSeason && <p className="mt-2 text-sm text-muted-foreground">Unreadable checkpoint</p>}
              {savedSeason && !ownCheckpoint && <p className="text-sm text-muted-foreground">Checkpoint belongs to another career.</p>}
              <div className="mt-auto pt-3">
                {incoming ? (
                  <>
                    <h4 className="text-sm font-bold">Import career into slot {number}</h4>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {nrlClubName(incoming.season.year, incoming.season.clubId, incoming.customClub, 'full')} · {incoming.season.year} season. Imported careers are for local play.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="lg" variant="outline" className="px-3" onClick={() => { setReview(null); setNotice(''); }}>Cancel</Button>
                      <Button type="button" size="lg" className="px-3" onClick={() => confirmImport(number)}>Import career</Button>
                    </div>
                  </>
                ) : pending ? (
                  <>
                    <p className="mb-2 text-sm">
                      {pending.kind === 'delete' ? (pending.club ? 'Delete ' + pending.club + ' from this slot?' : 'Delete the unreadable career from this slot?')
                        : pending.kind === 'replace' ? 'Replace the saved checkpoint with your current progress?'
                          : `Go back to this checkpoint? Your current progress becomes a recovery copy. Recovery keeps up to ${BACKUPS_KEPT} recovery copies for this slot. Older copies may be removed.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="lg" className="px-3" variant="outline"
                        onClick={() => { saveFence.release(entry.saveKey); setConfirm(null); }}>
                        {pending.kind === 'delete' ? 'Keep career' : 'Cancel'}
                      </Button>
                      <Button type="button" size="lg" className="px-3" variant={pending.kind === 'delete' ? 'destructive' : 'default'}
                        onClick={confirmAction}>
                        {pending.kind === 'delete' ? 'Delete career' : pending.kind === 'replace' ? 'Replace saved checkpoint' : 'Restore saved checkpoint'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {career && <Button type="button" size="lg" className="px-3" onClick={() => onOpen(entry.path)}>{career.retired ? 'View' : 'Resume'} slot {number}</Button>}
                    {career && <Button type="button" size="lg" variant="outline" className="px-3"
                      onClick={() => downloadSlot(entry.saveKey, number)}>Download slot {number}</Button>}
                    {raw === null && <Button type="button" size="lg" className="px-3" variant="outline" disabled={!available}
                      onClick={() => onOpen(entry.path)}>New career in slot {number}</Button>}
                    {raw === null && available && checkpointRaw === null && checkpoint.available && <Button type="button" size="lg" className="px-3" variant="outline"
                      disabled={reading || review !== null || confirm !== null} onClick={() => chooseImport(entry.saveKey)}>Import into slot {number}</Button>}
                    {career && raw !== null && <Button type="button" size="lg" className="px-3" variant="outline"
                      disabled={confirm !== null || review !== null || reading || !checkpoint.available || checkpointRaw === raw} onClick={() => {
                        if (checkpointRaw !== null) ask({ kind: 'replace', index, raw, checkpoint: checkpointRaw });
                        else {
                          saveFence.adopt(entry.saveKey);
                          const result = saveNrlCheckpoint(entry.saveKey, raw, null);
                          finish(entry.saveKey, result, 'Checkpoint saved.', 'This browser could not save a checkpoint.');
                        }
                      }}>{checkpointRaw === null ? 'Save checkpoint' : 'Replace checkpoint'}</Button>}
                    {ownCheckpoint && raw !== null && checkpointRaw !== null && checkpointRaw !== raw && <Button type="button" size="lg" className="px-3"
                      variant="outline" disabled={confirm !== null || review !== null || reading}
                      onClick={() => ask({ kind: 'restore', index, raw, checkpoint: checkpointRaw })}>Restore checkpoint</Button>}
                    {raw !== null && <Button type="button" size="lg" className="px-3" variant="ghost" disabled={confirm !== null || review !== null || reading}
                      onClick={() => ask({ kind: 'delete', index, raw, club })}>Delete slot {number}</Button>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
