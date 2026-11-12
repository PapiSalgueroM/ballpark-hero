import type { Dispatch, ReactNode, SetStateAction } from 'react';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { defaultAppearance, type PlayerAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCreate, UsCareerSport } from '@/lib/usCareerSport';
import { cn } from '@/lib/utils';

export interface UsCareerDraft {
  nameInput: string;
  eraId: string;
  pos: string;
  archetypeId: string;
  appearance: PlayerAppearance;
}

export function emptyUsCareerDraft(create: UsCareerCreate): UsCareerDraft {
  return {
    nameInput: '',
    eraId: 'now',
    pos: create.defaultPos,
    archetypeId: create.archetypes[create.defaultPos][0].id,
    appearance: defaultAppearance(),
  };
}

interface UsCareerCreatorProps {
  sport: UsCareerSport['slug'];
  create: UsCareerCreate;
  draft: UsCareerDraft;
  setDraft: Dispatch<SetStateAction<UsCareerDraft>>;
  onBeginProspect: () => void;
  onEnterDraft: () => void;
  prospectNotice?: string;
  pending?: boolean;
  draftStatus?: string;
  children?: ReactNode;
}

export default function UsCareerCreator({ sport, create, draft, setDraft, onBeginProspect, onEnterDraft, prospectNotice, pending, draftStatus, children }: UsCareerCreatorProps) {
  const { nameInput, eraId, pos, archetypeId, appearance } = draft;
  const patchDraft = (patch: Partial<UsCareerDraft>) => setDraft(previous => ({ ...previous, ...patch }));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">Create your player</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You are a fictional prospect entering the real league. Position and archetype shape your
          whole career: growth, injuries, money, legacy. Saves automatically.
        </p>
      </div>
      <div className="mx-auto max-w-md space-y-3">
        <input
          value={nameInput}
          onChange={e => patchDraft({ nameInput: e.target.value })}
          placeholder="Your player's name"
          aria-label="Your player name"
          maxLength={24}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {/* Round 172: pick WHEN, before you pick what. Same pattern as Club
            Manager's era picker: the default is today, the throwback is a
            sealed 2005 league with 2005 franchises and 2005 money. */}
        <div className="grid grid-cols-2 gap-1.5">
          {create.eras.map(e => (
            <button
              key={e.id}
              onClick={() => patchDraft({ eraId: e.id })}
              className={cn(
                'rounded-xl border-2 px-3 py-2 text-left',
                eraId === e.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
              )}
            >
              <span className="block text-sm font-bold text-foreground">{e.id === 'now' ? `${create.eraEmoji} ` : '⏪ '}{e.label}</span>
              <span className="block text-[10px] text-muted-foreground">{e.blurb}</span>
            </button>
          ))}
        </div>
        {/* Round 56: eight positions, each with its own stat line and money curve */}
        <div className={create.positionGridClass}>
          {create.positions.map(p => (
            <button
              key={p}
              onClick={() => patchDraft({ pos: p, archetypeId: create.archetypes[p][0].id })}
              className={cn(create.positionButtonClass, pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {p}
            </button>
          ))}
        </div>
        <AppearanceBuilder appearance={appearance} onChange={appearance => patchDraft({ appearance })} clubColor={create.clubColor} sport={sport} />

        <div className="grid gap-1.5">
          {create.archetypes[pos].map(a => (
            <button
              key={a.id}
              onClick={() => patchDraft({ archetypeId: a.id })}
              className={cn(
                'rounded-xl border-2 px-3 py-2 text-left',
                archetypeId === a.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
              )}
            >
              <span className="block text-sm font-bold text-foreground">{a.label}</span>
              <span className="block text-[11px] text-muted-foreground">{a.desc}</span>
            </button>
          ))}
        </div>
        <section data-career-prospect-entry className="rounded-2xl border border-blue-300/50 bg-blue-950 p-4 text-white">
          <p className="font-display text-xl font-black">Road to the Draft</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-100">Start before the spotlight. Choose your route, earn your stock, and make draft day yours.</p>
          {prospectNotice && <p className="mt-2 text-xs" role="status">{prospectNotice}</p>}
          <button onClick={onBeginProspect} disabled={pending} className="mt-3 min-h-11 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-950">Play your road to the draft</button>
          <p className="mt-3 text-center text-xs text-blue-100">Or quick start below with an instant draft result.</p>
        </section>
        <button
          onClick={onEnterDraft}
          disabled={pending}
          className="w-full rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          Enter the draft
        </button>
        {draftStatus && <p className="text-sm text-muted-foreground" role="status">{draftStatus}</p>}
        {children}
      </div>
    </div>
  );
}
