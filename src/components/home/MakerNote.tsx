import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Round 346, the owner's own idea in his own words: "theres a pop up that
 * says welcome... im sorry if the website has any bugs or miss information.
 * This is my first time coding... its an independent project and im
 * constantly working on the website". His reasoning: sincerity earns
 * patience and a second visit.
 *
 * Built as a small dismissible card rather than the popup he first pictured,
 * because the home page's covenant is offers before asks (playHomeFold pins
 * the first game tile's position) and a modal in front of the game list is
 * the toll booth Round 283 tore down. Same sincerity, nobody blocked.
 *
 * Client rendered only, on purpose: the AdSense review freeze (owner
 * directive 3) covers every crawler-facing file, and this card lives outside
 * all of them. Dismissal is once per browser.
 */
const DISMISS_KEY = 'dukb-maker-note';

export function MakerNote() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  if (dismissed) return null;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* fine */ }
    setDismissed(true);
  };
  return (
    <div data-maker-note="" className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 pr-10">
      <button
        onClick={dismiss}
        aria-label="Dismiss the note from the maker"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">A note from the maker</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Hey, I'm Anthony. DoUKnowBall is my first ever coding project, an independent site
        I build in my free time. I'm constantly working on it, fact checking everything and
        adding new games, so if something looks off, tell me with the Report a bug button
        at the bottom of any page and I'll get on it. Thanks for checking out my site, and
        have a blessed day.
      </p>
    </div>
  );
}
