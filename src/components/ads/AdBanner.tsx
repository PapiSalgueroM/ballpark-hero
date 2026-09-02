import { useEffect, useRef, useState } from 'react';
import { CONSENT_CHANGED_EVENT, loadAdSense } from '@/lib/consentedScripts';

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
 * WHAT WAS HAPPENING. This renders across the game catalog. It always drew a container
 * with a reserved height and the word Advertisement above it, whether or not
 * anything ever arrived. Two very ordinary situations left that box permanently
 * empty: a visitor who has not accepted cookies never gets the AdSense script
 * at all; and before Round 400 every slot id was still a placeholder, so even
 * with the script loaded AdSense answered unfilled. The result either way
 * was a labelled empty rectangle on most of the site, which reads as broken to
 * a person and reads worse than that to somebody reviewing the site for ads.
 *
 * WHAT IT DOES NOW. Nothing renders before the visitor accepts. After Accept,
 * the height is reserved while the answer is unknown, because that is what
 * stops the page jumping. But:
 *   - the loader starts only beside this deliberate slot and refuses noindex
 *     pages, so a refused page collapses immediately;
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
const HEAD_SETTLE_FRAMES = 2;

type AdState = 'unknown' | 'filled' | 'empty';

function readStoredConsent(): string | null {
  try {
    return localStorage.getItem('cookie-consent');
  } catch {
    return null;
  }
}

const AdBanner = ({ slot, format = 'auto', layout, layoutKey, className = '' }: AdBannerProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [consent, setConsent] = useState<string | null>(readStoredConsent);
  const [state, setState] = useState<AdState>('unknown');

  useEffect(() => {
    // Read consent state on mount and stay in sync if it changes in another
    // tab or right after the user responds to the cookie banner.
    setConsent(readStoredConsent());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cookie-consent') setConsent(e.newValue);
    };
    const onConsentChanged = () => setConsent(readStoredConsent());
    window.addEventListener('storage', onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  useEffect(() => {
    if (pushed.current) return;
    /* Round 304: the gate is an explicit rule now. It used to block only on
       'essential' and let null (undecided) fall through to the script
       presence check, which happened to hold; an affirmative accepted is
       the only state that initializes a slot. */
    if (consent !== 'accepted') return;
    let cancelled = false;
    let retryFrame = 0;
    let attempts = 0;
    const initialize = () => {
      if (cancelled || pushed.current) return;
      if (!loadAdSense()) {
        attempts += 1;
        if (attempts <= HEAD_SETTLE_FRAMES) {
          retryFrame = window.requestAnimationFrame(initialize);
          return;
        }
        setState('empty');
        return;
      }
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        setState('empty');
      }
    };
    initialize();
    return () => {
      cancelled = true;
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
    };
  }, [consent]);

  /* AdSense writes data-ad-status onto the ins element when it answers. */
  useEffect(() => {
    const el = adRef.current;
    if (consent !== 'accepted' || !el || state !== 'unknown') return;
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
  }, [consent, state]);

  // Until Accept, there is no slot, no request, and no timeout to expire.
  if (consent !== 'accepted') return null;
  // Nothing came, and nothing is coming. Take the space back.
  if (state === 'empty') return null;

  const minHeight = MIN_HEIGHT_BY_FORMAT[format] ?? 100;

  return (
    <div
      data-dukb-manual-ad=""
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
        className="adsbygoogle w-full"
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
