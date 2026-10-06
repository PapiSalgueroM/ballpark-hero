import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MANAGER_BACKGROUNDS, CLUB_IDENTITIES, validateManagerName, managerLookOf, defaultManagerLook, managerHomelandFor,
  NATIONS, leagueOf,
} from '@/lib/clubManager';
import type { CareerState, ManagerBackground, ManagerEdit, ManagerLook } from '@/lib/clubManager';
import { BACKGROUND_TREE, TREE_INFO } from '@/lib/clubManagerXp';
import ManagerLookEditor from '@/components/club-manager/ManagerLookEditor';
import HomelandSelect from '@/components/club-manager/HomelandSelect';

/**
 * Round 965: the Edit manager sheet, off the owner's 2026-08-26 item 11
 * ("customize a created manager"). Rename (through the same real name gate the
 * new career form uses), a new homeland, a new look. The background is his past
 * and is fixed once chosen, and the preferred football only ever set the day
 * one shape, so both are shown and not offered. A career started with Skip
 * names its manager here, background included, and his point arrives with him.
 */
export default function EditManagerSheet({ career, open, onOpenChange, onSave }: {
  career: CareerState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (edit: ManagerEdit) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display text-primary text-center">
            {career.manager ? 'Edit manager' : 'Name your manager'}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-center">
            {career.manager
              ? 'Change his name, his homeland or his look. His background stays: that is where he came from.'
              : 'You skipped this at kickoff. Name him now and his background point lands straight away.'}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed on open, so every opening starts from the save as it is now. */}
        {open && <SheetBody key={String(open)} career={career} onSave={edit => { onSave(edit); onOpenChange(false); }} />}
      </DialogContent>
    </Dialog>
  );
}

function SheetBody({ career, onSave }: { career: CareerState; onSave: (edit: ManagerEdit) => void }) {
  const cur = career.manager;
  const [name, setName] = useState(cur?.name ?? '');
  /* A Skip career opens on the club's own country, the way the new career
     form does. The homeland is only sent when the player changed it, so
     saving a rename or a face never rewrites the homeland a save holds. */
  const [startNation] = useState(() => managerHomelandFor(
    cur?.nationality ?? NATIONS.find(n => n.leagueIds.includes(leagueOf(career.clubName)?.id))?.name ?? 'England',
  ));
  const [nationality, setNationality] = useState(startNation);
  const [look, setLook] = useState<ManagerLook>(() => managerLookOf(cur?.appearance) ?? defaultManagerLook());
  const [background, setBackground] = useState<ManagerBackground | null>(cur?.background ?? null);
  const [tried, setTried] = useState(false);
  const nameError = useMemo(() => validateManagerName(name), [name]);
  const needsBackground = !cur && !background;

  const save = () => {
    setTried(true);
    if (nameError || needsBackground) return;
    const edit: ManagerEdit = { name: name.trim(), appearance: look };
    if (!cur || nationality !== startNation) edit.nationality = nationality;
    if (!cur && background) edit.background = background;
    onSave(edit);
  };

  return (
    <div className="space-y-3" data-edit-manager-sheet>
      <div>
        <label htmlFor="edit-manager-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
        <input
          id="edit-manager-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Sam Calloway"
          maxLength={24}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
        />
        {tried && nameError && <p className="text-[10px] text-red-400 mt-1">{nameError}</p>}
      </div>
      <div>
        <span id="edit-manager-homeland" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Homeland</span>
        <div className="mt-1"><HomelandSelect value={nationality} onChange={setNationality} labelledBy="edit-manager-homeland" /></div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Look</span>
        <div className="mt-1"><ManagerLookEditor look={look} onChange={setLook} /></div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Background</span>
        {cur ? (
          <p className="text-[11px] text-foreground mt-1">
            {MANAGER_BACKGROUNDS[cur.background]?.emoji} {MANAGER_BACKGROUNDS[cur.background]?.label ?? 'Unknown'}
            <span className="text-muted-foreground"> · fixed. Style: {CLUB_IDENTITIES[cur.style]?.label ?? 'Balanced'}, set your shape any week on the tactics screen.</span>
          </p>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pick once: it cannot be changed later.</p>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(Object.keys(MANAGER_BACKGROUNDS) as ManagerBackground[]).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBackground(k)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-left transition-all',
                    background === k ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary',
                  )}
                >
                  <div className="text-[11px] font-bold text-foreground">{MANAGER_BACKGROUNDS[k].emoji} {MANAGER_BACKGROUNDS[k].label}</div>
                  <div className="text-[9px] font-bold text-gold">+1 {TREE_INFO[BACKGROUND_TREE[k]].label}</div>
                </button>
              ))}
            </div>
            {tried && needsBackground && <p className="text-[10px] text-red-400 mt-1">Pick where he came from.</p>}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={save}
        className="w-full py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
      >
        {cur ? 'Save' : 'Name him'}
      </button>
    </div>
  );
}
