import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Briefcase } from 'lucide-react';
import { NATIONS, CLUB_IDENTITIES, MANAGER_BACKGROUNDS, validateManagerName } from '@/lib/clubManager';
import type { ManagerSpec, ManagerBackground, ClubIdentity } from '@/lib/clubManager';
import { FlagImg } from '@/components/FlagImg';

/**
 * Round 303, off the owner's tweaks list: "customizable created manager".
 * The last step of the picker: who is in the dugout. A name, a homeland off
 * the same NATIONS table the picker runs on, a background badge, and a
 * preferred football that sets the day one tactics the way a founding club
 * identity does. All of it optional: the skip button starts the same second
 * person career the game has always run, so nobody is forced through a form
 * to play a football game.
 *
 * Legal line: the name is validated against every real footballer the game
 * knows (validateManagerName), because a real person's name on an invented
 * career is the exposure simNoInventedQuotes exists to prevent.
 */

interface ManagerFormProps {
  clubName: string;
  /** The nation the picker came through, preselected as the homeland. */
  defaultNation: string;
  onBack: () => void;
  /** null means skip: no manager spec, the classic career. */
  onConfirm: (spec: ManagerSpec | null) => void;
}

export function ManagerForm({ clubName, defaultNation, onBack, onConfirm }: ManagerFormProps) {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState(
    NATIONS.some(n => n.name === defaultNation) ? defaultNation : NATIONS[0].name,
  );
  const [background, setBackground] = useState<ManagerBackground>('exPlayer');
  const [style, setStyle] = useState<ClubIdentity>('balanced');
  const [triedSubmit, setTriedSubmit] = useState(false);

  const nameError = useMemo(() => validateManagerName(name), [name]);

  const create = () => {
    setTriedSubmit(true);
    if (nameError) return;
    onConfirm({ name: name.trim(), nationality, background, style });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {clubName}
      </button>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">Who is in the dugout?</h2>
          <p className="text-[11px] text-muted-foreground">
            Name your manager, or skip it and just manage. Style sets your day one tactics, nothing else: the football stays the football.
          </p>
        </div>

        <div>
          <label htmlFor="manager-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manager name</label>
          <input
            id="manager-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sam Calloway"
            maxLength={24}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
          />
          {triedSubmit && nameError && <p className="text-[10px] text-red-400 mt-1">{nameError}</p>}
        </div>

        <div>
          <span id="manager-homeland-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Homeland</span>
          <p className="text-[10px] text-muted-foreground mb-1.5">Your federation for the national team call, and the leagues that know your name.</p>
          <div role="group" aria-labelledby="manager-homeland-label" className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {NATIONS.map(n => (
              <button
                key={n.id}
                onClick={() => setNationality(n.name)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-left transition-all flex items-center gap-1.5',
                  nationality === n.name ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary',
                )}
              >
                <FlagImg name={n.name} size={12} />
                <span className={cn('text-[10px] font-bold truncate', nationality === n.name ? 'text-primary' : 'text-foreground')}>{n.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span id="manager-background-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Background</span>
          <div role="group" aria-labelledby="manager-background-label" className="grid grid-cols-2 gap-1.5 mt-1.5">
            {(Object.keys(MANAGER_BACKGROUNDS) as ManagerBackground[]).map(k => {
              const b = MANAGER_BACKGROUNDS[k];
              return (
                <button
                  key={k}
                  onClick={() => setBackground(k)}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left transition-all',
                    background === k ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary',
                  )}
                >
                  <div className={cn('text-[11px] font-bold', background === k ? 'text-primary' : 'text-foreground')}>{b.emoji} {b.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{b.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span id="manager-style-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preferred football</span>
          <p className="text-[10px] text-muted-foreground mb-1.5">Sets your opening formation and mentality. Change both any week from the tactics screen.</p>
          <div role="group" aria-labelledby="manager-style-label" className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(Object.keys(CLUB_IDENTITIES) as ClubIdentity[]).map(k => {
              const s = CLUB_IDENTITIES[k];
              return (
                <button
                  key={k}
                  onClick={() => setStyle(k)}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left transition-all',
                    style === k ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary',
                  )}
                >
                  <div className={cn('text-[11px] font-bold', style === k ? 'text-primary' : 'text-foreground')}>{s.emoji} {s.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{s.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={create}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Briefcase className="w-4 h-4" /> Take the job
          </button>
          <button
            onClick={() => onConfirm(null)}
            className="flex-1 inline-flex items-center justify-center px-6 py-2.5 rounded-full font-bold border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors text-sm"
          >
            Skip: just manage
          </button>
        </div>
      </div>
    </div>
  );
}
