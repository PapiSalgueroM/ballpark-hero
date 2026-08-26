/**
 * Round 286: the site's mark, drawn inline so it paints with the page and
 * never waits on an image request.
 *
 * The shape comes from src/components/layout/logoMark.ts, which is generated
 * by scripts/logo/gen_logo.py from the same source as favicon.svg, the app
 * icons and the social image, so the header and the files in public/ cannot
 * drift apart. Colours are the theme tokens, so the mark follows the palette.
 */
import { useId } from 'react';
import {
  LOGO_VIEWBOX,
  LOGO_BALL,
  LOGO_SEAMS,
  LOGO_QUESTION_TRANSFORM,
  LOGO_QUESTION_PATH,
} from './logoMark';

interface LogoMarkProps {
  /** rendered size in px, square */
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  /* the seams are clipped to the ball; the id has to be unique per instance
     or two marks on one page clip each other */
  const clipId = useId();
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <clipPath id={clipId}>
        <circle cx={LOGO_BALL.cx} cy={LOGO_BALL.cy} r={LOGO_BALL.r} />
      </clipPath>
      <circle cx={LOGO_BALL.cx} cy={LOGO_BALL.cy} r={LOGO_BALL.r} fill="hsl(var(--primary))" />
      <g clipPath={`url(#${clipId})`} fill="none" stroke="hsl(var(--primary-foreground))" strokeOpacity="0.28" strokeWidth="16" strokeLinecap="round">
        {LOGO_SEAMS.map(d => <path key={d} d={d} />)}
      </g>
      <path transform={LOGO_QUESTION_TRANSFORM} d={LOGO_QUESTION_PATH} fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

export default LogoMark;
