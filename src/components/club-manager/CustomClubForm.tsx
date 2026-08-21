import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Sparkles } from 'lucide-react';
import {
  CREST_SHAPES, CREST_PATTERNS, CUSTOM_TIERS, CLUB_IDENTITIES, CUSTOM_STADIUMS, crestSvg,
  validateCustomClubName, sanitizeCrestInitials, customBoardPreview, money,
} from '@/lib/clubManager';
import type { CrestSpec, CustomClubSpec, CustomBudgetTier, ClubIdentity } from '@/lib/clubManager';

/**
 * Round 154, his ask verbatim: "create a create my team for the manger game
 * and its full customizatable with crests and stadium and starting money and
 * everything if everything." This is that form: name, crest (shape, pattern,
 * two colors, your initials), stadium, budget tier, and an honest live line
 * quoting what the board will actually demand of the club you are building.
 *
 * Legal line: the crest is abstract geometry plus the user's own initials.
 * Nothing in here traces, echoes or names a real badge, and crestSvg
 * sanitizes every input before it goes near markup.
 */

const PALETTE = [
  '#dc2626', '#1d4ed8', '#0ea5e9', '#059669', '#eab308',
  '#f97316', '#7c3aed', '#db2777', '#0f172a', '#f8fafc',
];

/** The one place a crest is turned into pixels. crestSvg is a pure, fully
 *  sanitized string builder, so this render path is injection-safe. */
export function CrestBadge({ crest, size = 40, className }: { crest: CrestSpec; size?: number; className?: string }) {
  const html = useMemo(() => crestSvg(crest, size), [crest, size]);
  return <span className={cn('inline-block leading-none', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

interface CustomClubFormProps {
  leagueName: string;
  leagueId: string;
  /** Era id when the picker is inside a historic era. */
  eraId?: string;
  onBack: () => void;
  onCreate: (spec: CustomClubSpec) => void;
}

export function CustomClubForm({ leagueName, leagueId, eraId, onBack, onCreate }: CustomClubFormProps) {
  const [name, setName] = useState('');
  const [stadium, setStadium] = useState('');
  const [shape, setShape] = useState(0);
  const [pattern, setPattern] = useState(2);
  const [color1, setColor1] = useState(PALETTE[1]);
  const [color2, setColor2] = useState(PALETTE[9]);
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [initialsRaw, setInitialsRaw] = useState('');
  const [tier, setTier] = useState<CustomBudgetTier>('mid');
  const [triedSubmit, setTriedSubmit] = useState(false);
  /* Round 160: how good the squad starts (decoupled from the money), the
     club's football identity, and the size of the ground. */
  const [quality, setQuality] = useState(66);
  const [identity, setIdentity] = useState<ClubIdentity>('balanced');
  const [capacity, setCapacity] = useState(CUSTOM_STADIUMS[1].capacity);

  // Initials follow the name until the user takes them over.
  const autoInitials = useMemo(() => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return sanitizeCrestInitials(words.length >= 2 ? words.map(w => w[0]).join('') : name);
  }, [name]);
  const initials = initialsTouched ? sanitizeCrestInitials(initialsRaw) : autoInitials;

  const crest: CrestSpec = useMemo(
    () => ({ shape, pattern, color1, color2, initials: initials || 'FC' }),
    [shape, pattern, color1, color2, initials],
  );

  const nameError = useMemo(() => validateCustomClubName(name), [name]);
  /* The quality slider feeds the SAME preview the live board reads, so
     dragging it visibly moves the demand: a division-topping squad gets told
     to win the thing, honestly, before you commit. */
  const preview = useMemo(
    () => customBoardPreview({ name: name || 'Your Club', stadium, crest, budgetTier: tier, leagueId, quality, identity, capacity }, eraId),
    [name, stadium, crest, tier, leagueId, eraId, quality, identity, capacity],
  );

  const submit = () => {
    setTriedSubmit(true);
    if (nameError) return;
    onCreate({
      name: name.trim(),
      stadium: stadium.trim() || `${name.trim()} Park`,
      crest,
      budgetTier: tier,
      leagueId,
      replacedClub: preview.replaced ?? '',
      quality,
      identity,
      capacity,
    });
  };

  const swatchRow = (value: string, set: (c: string) => void, label: string) => (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => set(c)}
            aria-label={`${label} ${c}`}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-transform',
              value === c ? 'border-primary scale-110' : 'border-border hover:scale-105',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="pb-24">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {leagueName}
      </button>

      {/* Live identity preview */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-3 flex items-center gap-3">
        <CrestBadge crest={crest} size={52} />
        <div className="min-w-0">
          <div className="text-lg font-bold font-display text-foreground truncate">{name.trim() || 'Your club'}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {stadium.trim() || (name.trim() ? `${name.trim()} Park` : 'Your stadium')} · {leagueName}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Board will want: <span className="text-foreground font-semibold">{preview.label}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {/* Name + stadium */}
        <div className="bg-card border border-border rounded-2xl p-3 grid gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Club name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={24}
              placeholder="Real Anthony"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            {(triedSubmit || name.length >= 3) && nameError && (
              <div className="text-[10px] text-red-400 mt-1">{nameError}</div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stadium</div>
            <input
              value={stadium}
              onChange={e => setStadium(e.target.value)}
              maxLength={30}
              placeholder={name.trim() ? `${name.trim()} Park` : 'Name your ground'}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Crest builder */}
        <div className="bg-card border border-border rounded-2xl p-3 grid gap-2.5">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Crest shape</div>
            <div className="flex flex-wrap gap-1.5">
              {CREST_SHAPES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShape(i)}
                  title={s.label}
                  className={cn(
                    'rounded-lg border p-1 transition-all',
                    shape === i ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60',
                  )}
                >
                  <CrestBadge crest={{ ...crest, shape: i }} size={26} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pattern</div>
            <div className="flex flex-wrap gap-1.5">
              {CREST_PATTERNS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPattern(i)}
                  title={p.label}
                  className={cn(
                    'rounded-lg border p-1 transition-all',
                    pattern === i ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60',
                  )}
                >
                  <CrestBadge crest={{ ...crest, pattern: i }} size={26} />
                </button>
              ))}
            </div>
          </div>
          {swatchRow(color1, setColor1, 'Main color')}
          {swatchRow(color2, setColor2, 'Second color')}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Initials on the crest</div>
            <input
              value={initials}
              onChange={e => { setInitialsTouched(true); setInitialsRaw(e.target.value); }}
              maxLength={3}
              placeholder="RA"
              className="w-24 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-bold tracking-widest text-foreground outline-none focus:border-primary uppercase"
            />
          </div>
        </div>

        {/* Round 160: squad quality, decoupled from the wallet. */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">How good do you start</div>
            <div className="text-sm font-bold font-display text-foreground tabular-nums">~{quality}</div>
          </div>
          <input
            type="range"
            min={55}
            max={88}
            step={1}
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            aria-label="Starting squad quality"
            className="w-full accent-[var(--primary,#22c55e)]"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>Minnows (55s)</span>
            <span>Mid table</span>
            <span>Team of 90s</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            The squad average. Your best players land a couple of points above it, so 88 hands you starters in the low 90s. The board reads the squad you build here, and the demand above moves as you drag.
          </p>
        </div>

        {/* Round 160: the football identity. */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">How you play</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(Object.keys(CLUB_IDENTITIES) as ClubIdentity[]).map(k => {
              const it = CLUB_IDENTITIES[k];
              const sel = identity === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIdentity(k)}
                  className={cn(
                    'rounded-xl border p-2 text-left transition-all',
                    sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                  )}
                >
                  <div className={cn('text-xs font-bold', sel ? 'text-primary' : 'text-foreground')}>{it.emoji} {it.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{it.blurb}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">Sets your day-one formation and mentality. Change both any week on the tactics screen.</p>
        </div>

        {/* Round 160: the ground. */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">How big is the ground</div>
          <div className="grid grid-cols-3 gap-2">
            {CUSTOM_STADIUMS.map(s => {
              const sel = capacity === s.capacity;
              return (
                <button
                  key={s.capacity}
                  type="button"
                  onClick={() => setCapacity(s.capacity)}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition-all',
                    sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                  )}
                >
                  <div className={cn('text-xs font-bold', sel ? 'text-primary' : 'text-foreground')}>🏟 {s.label}</div>
                  <div className="text-sm font-bold font-display text-foreground mt-0.5">{(s.capacity / 1000).toFixed(0)}k</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{s.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Money */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Starting money</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CUSTOM_TIERS) as CustomBudgetTier[]).map(k => {
              const t = CUSTOM_TIERS[k];
              const sel = tier === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTier(k)}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition-all',
                    sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                  )}
                >
                  <div className={cn('text-xs font-bold', sel ? 'text-primary' : 'text-foreground')}>{t.label}</div>
                  <div className="text-sm font-bold font-display text-gold mt-0.5">{money(t.budget)}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{t.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground text-center mt-3">
        Your squad is 24 players this game generates for your club, every one marked as made up.
        Every real player stays real: you buy them on the transfer market.
        {preview.replaced && (
          <> For this save your club takes the league place of {preview.replaced}, the division's weakest side.</>
        )}
      </p>

      {/* Pinned confirm, same shape as the take-the-job bar. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <CrestBadge crest={crest} size={24} />
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Your club</div>
              <div className="text-sm font-bold text-foreground truncate">{name.trim() || 'Name it first'}</div>
            </div>
          </div>
          <button
            onClick={submit}
            disabled={!!nameError}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-opacity',
              nameError ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            <Sparkles className="w-4 h-4" /> Found the club
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomClubForm;
