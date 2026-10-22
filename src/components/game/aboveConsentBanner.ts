import type { CSSProperties } from 'react';

/* Round 1536: a hand made rules overlay that opens on a first visit stays clear of the cookie banner.
   While the banner is unanswered it is fixed to the bottom of the screen above every game layer, and
   src/components/CookieConsent.tsx writes its height to --dukb-consent-height on the body (and removes it
   once the visitor answers, so both of these fall back to an ordinary overlay). The overlay pads its own
   bottom by that height, so its box is centred in the free space above the banner, and the box never
   grows past that space, so its own buttons can always be reached whatever the site's pending rule does.
   The [role="dialog"] goes on the box, never on the fixed overlay: the pending rule gives every dialog a
   top, which pushes a fixed overlay down into the banner. scripts/playFirstVisitDialogs.mjs walks it. */
export const OVERLAY_ABOVE_BANNER: CSSProperties = { paddingBottom: 'calc(1rem + var(--dukb-consent-height, 0px))' };

/* The box's own height cap, held inside the overlay's free space. */
export const boxInsideOverlay = (cap: string): CSSProperties => ({ maxHeight: `min(${cap}, 100%)` });
