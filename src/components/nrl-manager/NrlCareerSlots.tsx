import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { BACKUPS_KEPT } from '@/lib/brokenSaveRecovery';
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
        </div>
        <Button type="button" size="lg" variant="ghost" className="px-3" onClick={onBack}>Back</Button>
      </div>
      {notice && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{notice}</p>}
      <ul className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ raw, career, available, checkpoint }, index) => {
          const entry = NRL_SAVE_SLOTS[index];
          const number = index + 1;
          const season = career?.season;
          const club = season ? nrlSeasonPlan(season.year).clubs.find(team => team.id === season.clubId)?.name : undefined;
          const savedSeason = checkpoint.career?.season;
          const savedClub = savedSeason && nrlSeasonPlan(savedSeason.year).clubs.find(team => team.id === savedSeason.clubId)?.shortName;
          const ownCheckpoint = career && checkpoint.career && sameNrlCareer(career, checkpoint.career);
          const checkpointRaw = checkpoint.raw;
          const pending = confirm?.index === index ? confirm : null;
          return (
            <li key={entry.saveKey} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">Slot {number}</h3>
              <p className="mt-1 break-words font-bold">{club ?? (raw !== null ? 'Unreadable career' : available ? 'Empty slot' : 'Storage unavailable')}</p>
              {career && <p className="text-sm text-muted-foreground">
                Started in {career.openingYear} · {career.season.year} season{season.live ? ' · Match at half time' : season.phase === 'complete' ? ' · Season complete' : ''}
              </p>}
              {savedSeason && <p className="mt-2 break-words text-sm text-muted-foreground">
                Checkpoint · {savedClub} · {savedSeason.year} · Round {savedSeason.round}
                {savedSeason.live ? ' · Match at half time' : savedSeason.phase === 'complete' ? ' · Season complete' : ''}
              </p>}
              {checkpoint.raw !== null && !savedSeason && <p className="mt-2 text-sm text-muted-foreground">Unreadable checkpoint</p>}
              {savedSeason && !ownCheckpoint && <p className="text-sm text-muted-foreground">Checkpoint belongs to another career.</p>}
              <div className="mt-auto pt-3">
                {pending ? (
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
                    {career && <Button type="button" size="lg" className="px-3" onClick={() => onOpen(entry.path)}>Resume slot {number}</Button>}
                    {raw === null && <Button type="button" size="lg" className="px-3" variant="outline" disabled={!available}
                      onClick={() => onOpen(entry.path)}>New career in slot {number}</Button>}
                    {career && raw !== null && <Button type="button" size="lg" className="px-3" variant="outline"
                      disabled={confirm !== null || !checkpoint.available || checkpointRaw === raw} onClick={() => {
                        if (checkpointRaw !== null) ask({ kind: 'replace', index, raw, checkpoint: checkpointRaw });
                        else {
                          saveFence.adopt(entry.saveKey);
                          const result = saveNrlCheckpoint(entry.saveKey, raw, null);
                          finish(entry.saveKey, result, 'Checkpoint saved.', 'This browser could not save a checkpoint.');
                        }
                      }}>{checkpointRaw === null ? 'Save checkpoint' : 'Replace checkpoint'}</Button>}
                    {ownCheckpoint && raw !== null && checkpointRaw !== null && checkpointRaw !== raw && <Button type="button" size="lg" className="px-3"
                      variant="outline" disabled={confirm !== null}
                      onClick={() => ask({ kind: 'restore', index, raw, checkpoint: checkpointRaw })}>Restore checkpoint</Button>}
                    {raw !== null && <Button type="button" size="lg" className="px-3" variant="ghost" disabled={confirm !== null}
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
