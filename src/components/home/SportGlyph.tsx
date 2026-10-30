import type { CSSProperties } from 'react';
import type { SportKey } from '@/data/homeFront';

/**
 * Round 658: one small drawn mark per sport, so the sport colours are never
 * the only thing telling two sports apart (a colour blind player, a grey
 * scale screenshot, a light theme where two inks sit close). Every mark is a
 * generic object drawn in public/sport-glyphs.svg on a 24 unit grid. None
 * copies a league, club, kit or product mark.
 *
 * Coloured by currentColor, so the ink comes from whatever sets it, which on
 * the home page is text-tile inside an element carrying sportStyle().
 */
export function SportGlyph({ sport, className }: { sport: SportKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-sport-glyph={sport}
    >
      <use href={`/sport-glyphs.svg#sport-${sport}`} />
    </svg>
  );
}

/** Sets --tile to a sport's ink, which the tile colour in tailwind.config.ts reads. */
export function sportStyle(sport: SportKey): CSSProperties {
  return { ['--tile' as string]: `var(--sport-${sport})` } as CSSProperties;
}
