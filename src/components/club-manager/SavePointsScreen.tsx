/**
 * Round 1513: the save points screen, opened from the hub's Save points tile.
 * Make a point of the career as it stands, go back to it after a mistake,
 * copy it, rename it, delete it. At most three a career slot, and a point is
 * never dropped to make room: Create says to delete one first.
 *
 * It loads with the tile (lazy), and so does lz-string with it. Every storage
 * call goes through src/lib/cmSavePoints.ts, which never throws and says no
 * plainly; this screen only says what that answer means.
 */
import { useState } from 'react';
import type { CareerState } from '@/lib/clubManager';
import { POINTS_CAP, POINT_NAME_MAX, readPointsIndex, type PointMeta } from '@/lib/cmSavePointsStore';
import {
  copyPoint, createPoint, defaultPointName, deletePoint, renamePoint, restorePoint, type PointRefusal,
} from '@/lib/cmSavePoints';
import { reopenGame } from '@/lib/saveKeeper';

interface Props {
  career: CareerState;
  /** The manager slot this career is in. */
  slot: number;
}

const WHY: Record<PointRefusal, string> = {
  full: `You have ${POINTS_CAP} save points. Delete one first to make another.`,
  'no-room': 'Your browser is out of room, so nothing was saved. Your career and your other save points are untouched.',
  blocked: 'This browser will not let the site use its storage, so nothing changed.',
  gone: 'That save point is not in this browser any more.',
  damaged: 'That save point is damaged and will not open, so nothing changed. You can delete it.',
};

const madeOn = (at: number): string => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type Ask = { id: string; kind: 'restore' | 'delete' | 'rename' } | null;

export function SavePointsScreen({ career, slot }: Props) {
  const [points, setPoints] = useState<PointMeta[]>(() => readPointsIndex(slot)?.points ?? []);
  const [name, setName] = useState('');
  const [ask, setAsk] = useState<Ask>(null);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const full = points.length >= POINTS_CAP;
  const reread = () => setPoints(readPointsIndex(slot)?.points ?? []);
  const say = (text: string, bad = false) => setNote({ text, bad });

  const make = () => {
    const r = createPoint(slot, career, name);
    reread();
    if (r.ok) { setName(''); say(`Saved "${r.meta.name}".`); } else say(WHY[r.why], true);
  };
  const copy = (p: PointMeta) => {
    const r = copyPoint(slot, p.id);
    reread();
    if (r.ok) say(`Copied as "${r.meta.name}".`); else say(WHY[r.why], true);
  };
  const rename = (p: PointMeta) => {
    const ok = renamePoint(slot, p.id, newName);
    reread();
    setAsk(null);
    say(ok ? 'Renamed.' : WHY['no-room'], !ok);
  };
  const remove = (p: PointMeta) => {
    const ok = deletePoint(slot, p.id);
    reread();
    setAsk(null);
    say(ok ? `Deleted "${p.name}".` : 'Your browser would not let us delete it, so it is still there.', !ok);
  };
  const goBack = (p: PointMeta) => {
    const r = restorePoint(slot, p.id, career);
    if (r.ok) { reopenGame('/club-manager'); return; }
    setAsk(null);
    reread();
    say(WHY[r.why], true);
  };

  const small = 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors';
  const plain = `${small} bg-secondary text-foreground hover:bg-muted`;
  const main = `${small} bg-primary text-primary-foreground hover:opacity-90`;

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-3" data-testid="cm-points">
      <div>
        <h3 className="font-semibold text-foreground">💾 Save points</h3>
        <p className="text-xs text-muted-foreground">
          Up to {POINTS_CAP} for this career. Go back to one after a bad result and play it again. Your autosave carries on as normal.
        </p>
      </div>
      {note && (
        <p role={note.bad ? 'alert' : 'status'} data-testid="cm-point-note" className={`text-xs ${note.bad ? 'text-destructive' : 'text-foreground'}`}>
          {note.text}
        </p>
      )}
      {full ? (
        <p className="text-xs text-muted-foreground" data-testid="cm-points-full">{WHY.full}</p>
      ) : (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={POINT_NAME_MAX}
            placeholder={defaultPointName(career)}
            aria-label="Save point name"
            data-testid="cm-point-name"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button type="button" onClick={make} data-testid="cm-point-create" className={main}>Save point</button>
        </div>
      )}
      {points.length === 0 && <p className="text-xs text-muted-foreground">No save points yet.</p>}
      <ul className="space-y-2">
        {points.map(p => (
          <li key={p.id} data-testid="cm-point-row" data-point-id={p.id} className="rounded-lg border border-border p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-sm text-foreground break-words min-w-0" data-testid="cm-point-title">{p.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{madeOn(p.at)}</span>
            </div>
            <div className="text-xs text-muted-foreground" data-testid="cm-point-where">Season {p.season}, week {p.week} · {p.club}</div>
            {ask?.id === p.id && ask.kind === 'restore' && (
              <div className="mt-2 text-xs text-foreground space-y-2">
                <p>Go back to this point? The career you have now is kept aside in this browser, and Season {p.season} won't post a leaderboard score after this.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => goBack(p)} data-testid="cm-point-confirm" className={main}>Go back</button>
                  <button type="button" onClick={() => setAsk(null)} className={plain}>Cancel</button>
                </div>
              </div>
            )}
            {ask?.id === p.id && ask.kind === 'delete' && (
              <div className="mt-2 text-xs text-foreground space-y-2">
                <p>Delete this save point for good? Your career is not touched.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => remove(p)} data-testid="cm-point-confirm" className={`${small} bg-destructive text-destructive-foreground`}>Delete</button>
                  <button type="button" onClick={() => setAsk(null)} className={plain}>Keep</button>
                </div>
              </div>
            )}
            {ask?.id === p.id && ask.kind === 'rename' && (
              <div className="mt-2 flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={POINT_NAME_MAX}
                  aria-label="New name"
                  data-testid="cm-point-new-name"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => rename(p)} data-testid="cm-point-confirm" className={main}>Save</button>
                <button type="button" onClick={() => setAsk(null)} className={plain}>Cancel</button>
              </div>
            )}
            {ask?.id !== p.id && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => { setNote(null); setAsk({ id: p.id, kind: 'restore' }); }} data-testid="cm-point-restore" className={main}>Restore</button>
                <button type="button" onClick={() => copy(p)} disabled={full} data-testid="cm-point-copy" className={`${plain} disabled:opacity-50`}>Copy</button>
                <button type="button" onClick={() => { setNote(null); setNewName(p.name); setAsk({ id: p.id, kind: 'rename' }); }} data-testid="cm-point-rename" className={plain}>Rename</button>
                <button type="button" onClick={() => { setNote(null); setAsk({ id: p.id, kind: 'delete' }); }} data-testid="cm-point-delete" className={plain}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SavePointsScreen;
