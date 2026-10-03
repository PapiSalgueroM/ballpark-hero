/**
 * Round 928: the manager slots screen, where the resume prompt used to be.
 * One small tile per slot: Resume Career (the label every Club Manager walk
 * and the prerender personal state guard in simPrerender already know), New
 * manager in an empty one, and Delete
 * behind a confirm. Everything on it is read off the store without opening a
 * save (src/lib/clubManagerSlots.ts).
 */
import { useState } from 'react';
import type { SlotView } from '@/lib/clubManagerSlots';

interface Props {
  slots: SlotView[];
  /** The live line for the slot that is open right now (week, board), when
   *  its career is loaded. */
  activeDetail?: string | null;
  note?: string | null;
  onContinue: (slot: number) => void;
  onNew: (slot: number) => void;
  onDelete: (slot: number) => void;
}

export default function ManagerSlotsScreen({ slots, activeDetail, note, onContinue, onNew, onDelete }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);
  return (
    <div className="max-w-3xl mx-auto" data-testid="cm-slots">
      <header className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
        <p className="text-muted-foreground text-sm">Your managers on this device. Up to three careers, each one saved on its own.</p>
      </header>
      {note && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {note}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map(v => {
          const s = v.summary;
          return (
            <div
              key={v.slot}
              data-testid={`cm-slot-${v.slot}`}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col text-center min-h-[200px]"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Slot {v.slot}{s && v.active ? ' · last played' : ''}
              </div>
              {s ? (
                <>
                  <div className="text-sm text-muted-foreground mt-2">{s.managerName ?? 'You'}</div>
                  <div className="text-lg font-bold font-display text-foreground leading-tight">{s.clubName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.worldSeason} · Season {s.season}{s.historic ? ` · started in ${s.eraLabel}` : ''}
                  </div>
                  {v.active && activeDetail && <div className="text-xs text-muted-foreground mt-0.5">{activeDetail}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    🏆 {s.trophies} {s.trophies === 1 ? 'trophy' : 'trophies'}{s.sacked ? ' · sacked, looking for work' : ''}
                  </div>
                  <div className="mt-auto pt-3">
                    {confirming === v.slot ? (
                      <div className="text-xs">
                        <div className="text-foreground mb-2">Delete {s.clubName} for good? There is no undo.</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setConfirming(null); onDelete(v.slot); }}
                            className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold"
                          >
                            Delete
                          </button>
                          <button onClick={() => setConfirming(null)} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground font-bold">
                            Keep
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onContinue(v.slot)}
                          className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                          Resume Career
                        </button>
                        <button
                          onClick={() => setConfirming(v.slot)}
                          className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mt-3">{v.damaged ? '⚠️' : '💼'}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {v.damaged ? 'This save could not be read.' : 'Empty slot'}
                  </div>
                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => onNew(v.slot)}
                      className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors"
                    >
                      {v.damaged ? 'Clear it, new manager' : 'New manager'}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
