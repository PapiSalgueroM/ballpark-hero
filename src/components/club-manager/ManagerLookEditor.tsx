import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SKIN_TONES, HAIRSTYLES, HAIR_COLORS, FACIAL_HAIR, randomAppearance } from '@/lib/soccerCareerAppearance';
import type { AppearanceOption } from '@/lib/soccerCareerAppearance';
import { MANAGER_OUTFITS, MANAGER_AGE_BANDS, MANAGER_ACCENTS } from '@/lib/clubManager';
import type { ManagerLook, ManagerOutfit, ManagerAgeBand } from '@/lib/clubManager';
import ManagerAvatar from '@/components/club-manager/ManagerAvatar';

/**
 * Round 965: build the manager's look. One compact panel, the bust beside a
 * stack of arrows, so the form does not grow into a long page of swatches.
 * The face rows are Soccer Career's own tables; outfit, colour and age are the
 * manager's. Used by the new manager form and by the Edit manager sheet.
 */

const OUTFIT_OPTIONS: AppearanceOption[] = (Object.keys(MANAGER_OUTFITS) as ManagerOutfit[]).map(id => ({ id, label: MANAGER_OUTFITS[id].label }));
const AGE_OPTIONS: AppearanceOption[] = (Object.keys(MANAGER_AGE_BANDS) as ManagerAgeBand[]).map(id => ({ id, label: MANAGER_AGE_BANDS[id].label }));

type Field = 'skinTone' | 'hairstyle' | 'hairColor' | 'facialHair' | 'outfit' | 'ageBand';
const ROWS: { field: Field; label: string; options: AppearanceOption[] }[] = [
  { field: 'skinTone', label: 'Skin', options: SKIN_TONES },
  { field: 'hairstyle', label: 'Hair', options: HAIRSTYLES },
  { field: 'hairColor', label: 'Colour', options: HAIR_COLORS },
  { field: 'facialHair', label: 'Beard', options: FACIAL_HAIR },
  { field: 'outfit', label: 'Outfit', options: OUTFIT_OPTIONS },
  { field: 'ageBand', label: 'Age', options: AGE_OPTIONS },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** A roll for the shuffle button. Only ever called from a click. The face is
 *  Soccer Career's own roll, so its rules (dyed colours are a choice, not a
 *  roll) follow wherever that changes. */
function rollLook(): ManagerLook {
  const face = randomAppearance();
  return {
    skinTone: face.skinTone,
    hairstyle: face.hairstyle,
    hairColor: face.hairColor,
    facialHair: face.facialHair,
    outfit: pick(OUTFIT_OPTIONS).id as ManagerOutfit,
    accent: pick(MANAGER_ACCENTS).hex,
    ageBand: pick(AGE_OPTIONS).id as ManagerAgeBand,
  };
}

export default function ManagerLookEditor({ look, onChange }: { look: ManagerLook; onChange: (next: ManagerLook) => void }) {
  const step = (field: Field, options: AppearanceOption[], dir: 1 | -1) => {
    const at = Math.max(0, options.findIndex(o => o.id === look[field]));
    const next = options[(at + dir + options.length) % options.length];
    onChange({ ...look, [field]: next.id } as ManagerLook);
  };
  return (
    <div className="flex gap-3 items-start" data-manager-look-editor>
      <div className="flex flex-col items-center gap-1.5">
        <ManagerAvatar look={look} size={88} className="rounded-xl bg-secondary/40" />
        <button
          type="button"
          onClick={() => onChange(rollLook())}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
        >
          <Shuffle className="w-3 h-3" /> Roll one
        </button>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {ROWS.map(r => {
          const current = r.options.find(o => o.id === look[r.field])?.label ?? r.options[0].label;
          return (
            <div key={r.field} className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.label}</span>
              <button type="button" aria-label={`Previous ${r.label.toLowerCase()}`} onClick={() => step(r.field, r.options, -1)} className="rounded-md border border-border p-0.5 hover:border-primary">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="flex-1 min-w-0 truncate text-center text-[11px] font-bold text-foreground">{current}</span>
              <button type="button" aria-label={`Next ${r.label.toLowerCase()}`} onClick={() => step(r.field, r.options, 1)} className="rounded-md border border-border p-0.5 hover:border-primary">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        <div className="flex items-center gap-1 pt-0.5">
          <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kit</span>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Touchline colour">
            {MANAGER_ACCENTS.map(a => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                aria-pressed={look.accent === a.hex}
                onClick={() => onChange({ ...look, accent: a.hex })}
                className={cn('w-5 h-5 rounded-full border-2 transition-transform', look.accent === a.hex ? 'border-primary scale-110' : 'border-border')}
                style={{ backgroundColor: a.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
