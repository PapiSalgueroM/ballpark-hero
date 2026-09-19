import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import { HOME_STAGE, sportOf, type StageEntry } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';

/* The drawings are their own chunk. Index is imported eagerly by App.tsx, so
   anything it imports statically ships in the entry chunk that every page,
   /soccer-career included, downloads before it can draw. The art is
   decoration: the card is fully readable and playable before it arrives,
   and it fades in over a box that already holds its size. */
const HomeArt = lazy(() => import('./art/HomeArt'));

/** True when this browser holds a save under the game's own key. Existence
    only: the save is never read, parsed or trusted here. */
function hasSave(key: string | undefined): boolean {
  if (!key) return false;
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

type Variant = 'lead' | 'wide' | 'small';

interface Card {
  entry: StageEntry;
  game: GameDef;
}

/**
 * Round 658: the Main Event band at the top of the home page. Soccer Career
 * on the big stage, Club Manager, Stadium Tycoon and NBA My Career beside it,
 * each with its own drawing. Every label and description is the registry's;
 * the only words this adds are the small kicker and the button.
 *
 * Geometry is fixed in every state (signed in or out, save or no save, art
 * loaded or not), so nothing below it moves while the page settles.
 */
export function FeaturedStage() {
  const cards = useMemo<Card[]>(
    () =>
      HOME_STAGE.flatMap(entry => {
        const game = ALL_GAMES.find(g => g.path === entry.path);
        return game ? [{ entry, game }] : [];
      }),
    [],
  );
  if (cards.length === 0) return null;
  const [lead, ...rest] = cards;
  return (
    <section aria-label="Main event" data-home-stage="" className="grid gap-3 md:h-[320px] md:grid-cols-12">
      <StageCard card={lead} variant="lead" className="md:col-span-7" />
      <div className="grid grid-cols-3 gap-3 md:col-span-5 md:grid-cols-2 md:grid-rows-2">
        {rest.map((card, i) => (
          <StageCard
            key={card.game.path}
            card={card}
            variant={i === 0 ? 'wide' : 'small'}
            className={i === 0 ? 'md:col-span-2' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function StageCard({ card, variant, className }: { card: Card; variant: Variant; className?: string }) {
  const { entry, game } = card;
  const sport = sportOf(game.path);
  const [saved] = useState(() => hasSave(entry.saveKey));
  const resuming = saved && !!entry.continueCta;
  const cta = resuming ? entry.continueCta : entry.cta;
  const lead = variant === 'lead';

  return (
    <Link
      to={game.path}
      style={sportStyle(sport)}
      data-stage-card={game.path}
      className={cn(
        'group relative isolate block overflow-hidden rounded-2xl border border-border/80 bg-surface-1',
        'transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-tile/60',
        lead ? 'h-[248px] md:h-full' : 'h-[120px] md:h-full',
        className,
      )}
    >
      {/* the sport's glow in the corner the text starts from */}
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(110%_90%_at_0%_0%,hsl(var(--tile)/0.16),transparent_62%)]" />

      {/* the drawing */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute transition-transform duration-500 group-hover:scale-[1.03]',
          variant === 'lead' && 'inset-y-0 right-0 left-[36%] md:left-[30%]',
          variant === 'wide' && 'inset-x-0 top-0 h-[74px] md:left-auto md:h-full md:w-[50%]',
          variant === 'small' && 'inset-x-0 top-0 h-[74px] md:bottom-0 md:left-auto md:top-auto md:h-[72%] md:w-[62%]',
        )}
      >
        <Suspense fallback={null}>
          <HomeArt art={entry.art} />
        </Suspense>
      </span>

      {/* a scrim so the words always sit on a measured background */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0',
          lead
            ? 'bg-gradient-to-r from-surface-1 from-40% via-surface-1/75 via-55% to-transparent to-80% md:from-30% md:via-45% md:to-70%'
            : 'hidden md:block md:bg-gradient-to-r md:from-surface-1 md:from-30% md:via-surface-1/70 md:via-50% md:to-transparent md:to-85%',
        )}
      />

      {resuming && !lead && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground md:hidden">
          Continue
        </span>
      )}

      {lead ? (
        <div className="relative z-10 flex h-full max-w-[64%] flex-col justify-center gap-2 p-4 md:max-w-[46%] md:gap-3 md:p-7">
          <Kicker sport={sport} text={entry.kicker} />
          <h3 className="font-display text-2xl font-bold leading-[1.05] tracking-tight text-foreground md:text-[40px]">
            {game.label}
          </h3>
          <p className="line-clamp-3 text-[13px] leading-snug text-muted-foreground md:text-[15px]">{game.description}</p>
          <span className="mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:translate-x-0.5">
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden text-xs text-muted-foreground md:block">Saves in this browser. No account needed.</span>
        </div>
      ) : (
        <div
          className={cn(
            'relative z-10 flex h-full flex-col justify-end p-2.5 md:justify-between md:p-4',
            variant === 'wide' ? 'md:max-w-[58%]' : 'md:max-w-[72%]',
          )}
        >
          <div className="md:space-y-1.5">
            <div className="hidden md:block">
              <Kicker sport={sport} text={entry.kicker} small />
            </div>
            <h3 className="font-display text-[13px] font-bold leading-tight text-foreground md:text-xl">{game.label}</h3>
            {variant === 'wide' && (
              <p className="hidden text-xs leading-snug text-muted-foreground md:line-clamp-2">{game.description}</p>
            )}
          </div>
          <span className="hidden items-center gap-1 text-sm font-semibold text-primary md:inline-flex">
            {cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      )}
    </Link>
  );
}

function Kicker({ sport, text, small }: { sport: ReturnType<typeof sportOf>; text: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full bg-background/75 font-bold uppercase text-foreground ring-1 ring-inset ring-tile/40',
        small ? 'px-2 py-0.5 text-[10px] tracking-[0.12em]' : 'px-2.5 py-1 text-[11px] tracking-[0.14em]',
      )}
    >
      <SportGlyph sport={sport} className={cn('text-tile', small ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {text}
    </span>
  );
}
