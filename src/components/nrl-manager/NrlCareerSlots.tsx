import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { NRL_SAVE_SLOTS, readNrlSaveSlot, writeNrlSaveSlot } from '@/lib/nrlSaveSlots';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';

const readSlots = () => NRL_SAVE_SLOTS.map(entry => readNrlSaveSlot(entry.saveKey));

export default function NrlCareerSlots({ onOpen, onBack }: { onOpen: (path: string) => void; onBack: () => void }) {
  const [slots, setSlots] = useState(readSlots);
  const [confirm, setConfirm] = useState<{ index: number; raw: string; club?: string } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => setSlots(readSlots());
    const onStorage = ({ key }: StorageEvent) => {
      if (key === null || NRL_SAVE_SLOTS.some(entry => key === entry.saveKey || key === fenceKeyOf(entry.saveKey))) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  function deleteConfirmed() {
    if (!confirm) return;
    const { saveKey } = NRL_SAVE_SLOTS[confirm.index];
    const result = writeNrlSaveSlot(saveKey, confirm.raw, null);
    saveFence.release(saveKey);
    setConfirm(null);
    setNotice(result === 'moved' ? 'This slot changed in another tab.'
      : result === 'failed' ? 'This browser could not delete the career. The save is still in its slot.' : '');
    setSlots(readSlots());
  }

  return (
    <section aria-labelledby="nrl-save-slots" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="nrl-save-slots" className="text-xl font-bold">Career saves</h2>
          <p className="text-sm text-muted-foreground">Keep up to three careers in this browser.</p>
        </div>
        <Button type="button" size="lg" variant="ghost" className="px-3" onClick={onBack}>Back</Button>
      </div>
      {notice && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{notice}</p>}
      <ul className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ raw, career, available }, index) => {
          const entry = NRL_SAVE_SLOTS[index];
          const number = index + 1;
          const season = career?.season;
          const club = season ? nrlSeasonPlan(season.year).clubs.find(team => team.id === season.clubId)?.name : undefined;
          return (
            <li key={entry.saveKey} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">Slot {number}</h3>
              <p className="mt-1 break-words font-bold">{club ?? (raw !== null ? 'Unreadable career' : available ? 'Empty slot' : 'Storage unavailable')}</p>
              {career && <p className="text-sm text-muted-foreground">
                Started in {career.openingYear} · {career.season.year} season{season.live ? ' · Match at half time' : season.phase === 'complete' ? ' · Season complete' : ''}
              </p>}
              <div className="mt-auto pt-3">
                {confirm?.index === index ? (
                  <>
                    <p className="mb-2 text-sm">{confirm.club ? 'Delete ' + confirm.club + ' from this slot?' : 'Delete the unreadable career from this slot?'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="lg" className="px-3" variant="outline" onClick={() => { saveFence.release(entry.saveKey); setConfirm(null); }}>Keep career</Button>
                      <Button type="button" size="lg" className="px-3" variant="destructive" onClick={deleteConfirmed}>Delete career</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {career && <Button type="button" size="lg" className="px-3" onClick={() => onOpen(entry.path)}>Resume slot {number}</Button>}
                    {raw === null && <Button type="button" size="lg" className="px-3" variant="outline" disabled={!available}
                      onClick={() => onOpen(entry.path)}>New career in slot {number}</Button>}
                    {raw !== null && <Button type="button" size="lg" className="px-3" variant="ghost" disabled={confirm !== null} onClick={() => {
                      saveFence.adopt(entry.saveKey);
                      setConfirm({ index, raw, club });
                    }}>Delete slot {number}</Button>}
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
