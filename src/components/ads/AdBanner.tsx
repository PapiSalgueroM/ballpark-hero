import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: string;
  layoutKey?: string;
  className?: string;
}

// Reserve vertical space up front so the ad slot does not shift page
// content when it loads (Core Web Vitals CLS + accidental-click prevention).
const MIN_HEIGHT_BY_FORMAT: Record<string, number> = {
  horizontal: 100,
  rectangle: 250,
  vertical: 250,
  auto: 100,
  fluid: 100,
};

/* Round 274: an ad box that is never going to hold an ad must not sit there
   calling itself an advertisement.
 *
 * WHAT WAS HAPPENING. This renders on 72 pages. It always drew a container
 * with a reserved height and the word Advertisement above it, whether or not
 * anything ever arrived. Two very ordinary situations left that box permanently
 * empty: a visitor who has not accepted cookies never gets the AdSense script
 * at all, because index.html only loads it when consent is already stored; and
 * every slot id in this codebase is still a placeholder, 1234567890 upward, so
 * even with the script loaded AdSense answers unfilled. The result either way
 * was a labelled empty rectangle on most of the site, which reads as broken to
 * a person and reads worse than that to somebody reviewing the site for ads.
 *
 * WHAT IT DOES NOW. The height is still reserved while the answer is unknown,
 * because that is what stops the page jumping, which was the original and good
 * reason for it. But:
 *   - if the AdSense script is not on the page at all, there is no ad coming,
 *     and that is known immediately rather than guessed, so the whole thing
 *     collapses on mount with nothing drawn;
 *   - if the script is there, AdSense marks the ins element data-ad-status
 *     filled or unfilled, which is watched, and unfilled collapses it;
 *   - the word Advertisement appears only once something has actually filled,
 *     because labelling nothing an advertisement is just untrue.
 *
 * The timeout is a backstop for the case where AdSense loads and then never
 * answers at all. Eight seconds is deliberately long: the point is to be sure
 * nothing is coming, not to be quick about hiding a slot that is simply slow on
 * a phone. */
const NO_ANSWER_MS = 8000;

type AdState = 'unknown' | 'filled' | 'empty';

const AdBanner = ({ slot, format = 'auto', layout, layoutKey, className = '' }: AdBannerProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [consent, setConsent] = useState<string | null>(null);
  const [state, setState] = useState<AdState>('unknown');

  useEffect(() => {
    // Read consent state on mount and stay in sync if it changes in another
    // tab or right after the user responds to the cookie banner.
    setConsent(localStorage.getItem('cookie-consent'));
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cookie-consent') setConsent(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (pushed.current) return;
    if (consent === 'essential') return; // do not initialize ad slot without ads consent
    /* No script means no ad, and that is a fact rather than a wait. */
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      setState('empty');
      return;
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      setState('empty');
    }
  }, [consent]);

  /* AdSense writes data-ad-status onto the ins element when it answers. */
  useEffect(() => {
    const el = adRef.current;
    if (!el || state !== 'unknown') return;
    const read = () => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled') setState('filled');
      else if (status === 'unfilled') setState('empty');
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    const t = window.setTimeout(() => setState(s => (s === 'unknown' ? 'empty' : s)), NO_ANSWER_MS);
    return () => { mo.disconnect(); window.clearTimeout(t); };
  }, [state]);

  // Essential-only consent: render nothing (no slot reserved, no request made).
  if (consent === 'essential') return null;
  // Nothing came, and nothing is coming. Take the space back.
  if (state === 'empty') return null;

  const minHeight = MIN_HEIGHT_BY_FORMAT[format] ?? 100;

  return (
    <div
      className={`ad-container flex flex-col items-center justify-center my-6 gap-1 ${className}`}
      style={{ minHeight }}
    >
      {state === 'filled' && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 select-none">
          Advertisement
        </span>
      )}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight }}
        data-ad-client="ca-pub-2929318086316376"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
      />
    </div>
  );
};

export default AdBanner;
