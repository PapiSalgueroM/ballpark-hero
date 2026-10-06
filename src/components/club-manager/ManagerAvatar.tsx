import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import { getSkinTone } from '@/lib/soccerCareerAppearance';
import type { PlayerAppearance } from '@/lib/soccerCareerAppearance';
import type { ManagerLook } from '@/lib/clubManager';

/**
 * Round 965: the manager's face. Soccer Career's own SVG bust (PlayerAvatar)
 * does the head, the hair and the beard from the same tables its look screen
 * uses, so this file draws no faces of its own: it only dresses him for the
 * touchline and adds the years. Flat shapes and colours only, no photo and
 * nobody's likeness, which is the line PlayerAvatar was built to.
 *
 * The bust is fixed on a 100 by 100 grid: shoulders below y 70, the chin at
 * 68, the ears at x 31.5 and 68.5, eyes at y 45. The overlay below is drawn on
 * the same grid and only ever over the shoulders and the edges of the face.
 */

const SUIT = '#27272A';
const COAT = '#1F2937';
const LINE = '#7A4A3A';

const darken = (hex: string, amt: number): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = (i: number) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) - amt));
  return `#${[n(0), n(2), n(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

/** The bust's own fields, with the player only ones left on their quiet defaults. */
function bustOf(look: ManagerLook): PlayerAppearance {
  return {
    skinTone: look.skinTone,
    hairstyle: look.hairstyle,
    hairColor: look.hairColor,
    facialHair: look.facialHair,
    celebration: 'knee_slide',
    boots: 'vortex_strike',
    accessory: 'none',
  };
}

function Outfit({ look }: { look: ManagerLook }) {
  const accent = look.accent;
  switch (look.outfit) {
    case 'suit':
      return (
        <>
          <path d="M 14 100 Q 16 78 34 74 L 44 71 L 50 92 L 56 71 L 66 74 Q 84 78 86 100 Z" fill={SUIT} />
          <path d="M 44 71 L 41 80 L 47 84 Z M 56 71 L 59 80 L 53 84 Z" fill={darken(SUIT, -18)} />
          <path d="M 48.6 74 L 51.4 74 L 52.4 88 L 50 91 L 47.6 88 Z" fill={accent} />
        </>
      );
    case 'coat':
      return (
        <>
          <path d="M 12 100 Q 14 77 33 73 L 43 70 L 50 84 L 57 70 L 67 73 Q 86 77 88 100 Z" fill={COAT} />
          <path d="M 39 76 Q 50 84 61 76 L 61 70 Q 50 78 39 70 Z" fill={accent} />
          <rect x="53" y="78" width="5" height="16" rx="1" fill={accent} />
          <path d="M 53 90 L 58 90" stroke={darken(accent, 40)} strokeWidth="1" />
        </>
      );
    case 'quarterzip':
      return (
        <>
          <path d="M 42 68 L 58 68 L 58 75 L 50 79 L 42 75 Z" fill={darken(accent, 30)} />
          <path d="M 50 70 L 50 86" stroke="#F4F4F5" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="50" cy="86" r="1.1" fill="#F4F4F5" />
        </>
      );
    case 'tracksuit':
    default:
      return (
        <>
          <path d="M 43 69 L 57 69 L 57 74 L 50 78 L 43 74 Z" fill={darken(accent, 30)} />
          <path d="M 50 74 L 50 100" stroke="#F4F4F5" strokeWidth="1.2" />
          <path d="M 21 88 L 33 77 M 79 88 L 67 77" stroke="#F4F4F5" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
  }
}

function Years({ look }: { look: ManagerLook }) {
  const shade = getSkinTone(look.skinTone).shade;
  const band = look.ageBand;
  if (band === 'thirties') return null;
  const lines = band === 'forties' ? 0.35 : band === 'fifties' ? 0.5 : 0.65;
  return (
    <>
      {/* crow's feet, which no hairstyle covers */}
      <path d="M 37 44 L 35.2 43 M 37 46 L 35.2 46.6 M 63 44 L 64.8 43 M 63 46 L 64.8 46.6" stroke={LINE} strokeWidth="0.7" strokeLinecap="round" opacity={lines} />
      {band !== 'forties' && (
        /* grey at the temples */
        <path d="M 30.5 35 Q 31.5 33.5 34.5 33.5 L 34.5 41.5 Q 31.5 41 30.5 39.5 Z M 69.5 35 Q 68.5 33.5 65.5 33.5 L 65.5 41.5 Q 68.5 41 69.5 39.5 Z" fill="#B7B5B0" opacity="0.9" />
      )}
      {band === 'sixties' && (
        /* the lines either side of the mouth */
        <path d="M 45.5 54 Q 43.6 57 44.4 60.5 M 54.5 54 Q 56.4 57 55.6 60.5" stroke={shade} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      )}
    </>
  );
}

export default function ManagerAvatar({ look, size = 72, className = '' }: { look: ManagerLook; size?: number; className?: string }) {
  /* A suit or a coat goes over a white shirt; the tracksuit and the quarter
     zip are the accent colour themselves. */
  const shirt = look.outfit === 'suit' ? '#F4F4F5' : look.outfit === 'coat' ? '#E5E7EB' : look.accent;
  return (
    <div
      data-manager-face
      role="img"
      aria-label="Your manager"
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <PlayerAvatar appearance={bustOf(look)} clubColor={shirt} size={size} />
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden="true">
        <Outfit look={look} />
        <Years look={look} />
      </svg>
    </div>
  );
}
