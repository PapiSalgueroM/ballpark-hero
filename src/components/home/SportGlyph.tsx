import type { CSSProperties, ReactElement } from 'react';
import type { SportKey } from '@/data/homeFront';

/**
 * Round 658: one small drawn mark per sport, so the sport colours are never
 * the only thing telling two sports apart (a colour blind player, a grey
 * scale screenshot, a light theme where two inks sit close). Every mark is a
 * generic object drawn here on a 24 unit grid: a ball, a flag, a glove. None
 * copies a league, club, kit or product mark.
 *
 * Coloured by currentColor, so the ink comes from whatever sets it, which on
 * the home page is text-tile inside an element carrying sportStyle().
 */
function glyph(sport: SportKey): ReactElement | null {
  switch (sport) {
    case 'soccer':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8.4 15.42 10.89 14.12 14.91 9.88 14.91 8.58 10.89Z" fill="currentColor" stroke="none" />
          <path d="M12 8.4V3M15.42 10.89l5.14-1.67M14.12 14.91l3.17 4.37M9.88 14.91l-3.17 4.37M8.58 10.89 3.44 9.22" />
        </>
      );
    case 'football':
      return (
        <>
          <ellipse cx="12" cy="12" rx="10" ry="5.8" transform="rotate(-35 12 12)" />
          <path d="M9.38 13.84 14.62 10.16M9.78 11.97l1.5 2.12M11.25 10.94l1.5 2.12M12.72 9.91l1.5 2.12" />
        </>
      );
    case 'college':
      return <path d="M5 3v18M5 4.5 19.5 9 5 13.5ZM8.5 5.6v6.8" />;
    case 'basketball':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" />
        </>
      );
    case 'baseball':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M6.4 5c2.8 3 2.8 11 0 14M17.6 5c-2.8 3-2.8 11 0 14M6.9 7.6l1.8-.5M7.7 10.2l1.8-.2M7.7 13.8l1.8.2M6.9 16.4l1.8.5M17.1 7.6l-1.8-.5M16.3 10.2l-1.8-.2M16.3 13.8l-1.8.2M17.1 16.4l-1.8.5" />
        </>
      );
    case 'hockey':
      return <path d="M16.5 3 10.6 16.5c-.5 1.1.1 2 1.3 2H20M3.5 17c0-.9 1.6-1.5 3.5-1.5s3.5.6 3.5 1.5v1.8c0 .9-1.6 1.5-3.5 1.5s-3.5-.6-3.5-1.5ZM3.5 17c0 .9 1.6 1.5 3.5 1.5s3.5-.6 3.5-1.5" />;
    case 'f1':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <path d="M12 3v2.2M21 12h-2.2M12 21v-2.2M3 12h2.2M5.64 5.64 7.2 7.2M18.36 5.64 16.8 7.2M18.36 18.36 16.8 16.8M5.64 18.36 7.2 16.8" />
        </>
      );
    case 'tennis':
      return (
        <>
          <ellipse cx="9.5" cy="9.5" rx="5.6" ry="7" transform="rotate(-45 9.5 9.5)" />
          <path d="M14.45 14.45 20.5 20.5M5.63 10.57l4.94-4.94M8.43 13.37l4.94-4.94M6.7 6.7l5.6 5.6" />
          <circle cx="18.6" cy="5.6" r="2.3" fill="currentColor" stroke="none" />
        </>
      );
    case 'golf':
      return (
        <>
          <circle cx="12" cy="8.5" r="5.5" />
          <path d="M8.5 15.2h7L13 17.6V21h-2v-3.4Z" />
          <path d="M10.3 7.3h.01M13.2 7.6h.01M11.6 10.1h.01" strokeWidth="2.2" />
        </>
      );
    case 'aussie':
      return (
        <>
          <ellipse cx="12" cy="12" rx="6.2" ry="9.6" />
          <path d="M12 2.4v19.2M8.4 6.6h7.2M8.4 17.4h7.2" />
        </>
      );
    case 'nascar':
      return (
        <>
          <path d="M5 3v18M5 4h14v10H5" />
          <path d="M5 4h3.5v3.33H5zM12 4h3.5v3.33H12zM8.5 7.33H12v3.34H8.5zM15.5 7.33H19v3.34h-3.5zM5 10.67h3.5V14H5zM12 10.67h3.5V14H12z" fill="currentColor" stroke="none" />
        </>
      );
    case 'combat':
      return <path d="M7.2 11c0-4.8 2.6-7 6.2-7 3.9 0 6.2 2.6 6.2 6.6 0 3.6-2 5.8-4.6 6.2v3.7H8.6v-3.9c-.9-1.2-1.4-3-1.4-5.6ZM7.3 11.2c-2.7 0-2.9 3.8.3 4M8.6 18H15M10.5 8.2c1.9-.9 4.5-.8 6.3.4" />;
    case 'world':
      return (
        <>
          <path d="M8 2.8 11.2 10M16 2.8 12.8 10" />
          <circle cx="12" cy="15" r="5.6" />
          <path d="M12 12.4 12.65 14.11 14.47 14.2 13.05 15.34 13.53 17.1 12 16.1 10.47 17.1 10.95 15.34 9.53 14.2 11.35 14.11Z" fill="currentColor" stroke="none" />
        </>
      );
    default:
      return null;
  }
}

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
      {glyph(sport)}
    </svg>
  );
}

/** Sets --tile to a sport's ink, which the tile colour in tailwind.config.ts reads. */
export function sportStyle(sport: SportKey): CSSProperties {
  return { ['--tile' as string]: `var(--sport-${sport})` } as CSSProperties;
}
