import { useEffect, useRef, useState } from 'react';
import { CONSENT_CHANGED_EVENT, getAdSenseScript, loadAdSense } from '@/lib/consentedScripts';
import { CONSENT_EFFECTIVE_CHANGED_EVENT, CONSENT_KEY, getEffectiveConsent } from '@/lib/consentPreferences';

interface AdBannerProps {
  slot: string;
  placement?: 'public-footer' | 'left-rail' | 'right-rail';
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: string;
  layoutKey?: string;
  className?: string;
  mobileBanner?: boolean;
}

// Reserve vertical space up front so the ad slot does not shift page
// content when it loads (Core Web Vitals CLS + accidental-click prevention).
/**
 * Round 506: how far the slot is held from whatever sits above it, in pixels.
 *
 * Google's game page guidance is 150px between an ad and the controls a player
 * is tapping, and the reason is accidental clicks rather than taste. Measured
 * at 390 wide on the built site on 2026-09-08, before this existed: the nearest
 * control was 104px above the slot on /club-manager (an era picker) and 32px
 * above it on /squad-deal (the Start Building button).
 *
 * THIS NUMBER ALONE HAS TO CLEAR THE FLOOR. It was 120, which met the 150px
 * recommendation only because all 76 existing mounts happen to pass `mt-8`
 * (32px), giving 152 and two pixels of headroom on a rounded, browser measured
 * number. That is the Round 284 coin toss shape, and it made the promise below
 * false: a page added next month written with `mt-4` would have landed at 136
 * and reintroduced exactly the problem this constant exists to stop. At 150 the
 * component clears the floor on its own whatever className a caller passes, so
 * the promise is now true rather than true by luck.
 */
export const AD_CONTROL_GAP_PX = 150;
export const AD_RAIL_HEIGHT_PX = 600;
export const AD_RAIL_LABEL_PX = 20;

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
 */
const HEAD_SETTLE_FRAMES = 2;

type AdState = 'unknown' | 'filled' | 'empty';

function readStoredConsent(): boolean {
  return getEffectiveConsent().advertising;
}

function AdBanner(props: AdBannerProps) {
  if (!props.placement) return null;
  return <PublicDisplayAd {...props} placement={props.placement} />;
}

function PublicDisplayAd({ slot, placement, className = '' }: AdBannerProps & { placement: NonNullable<AdBannerProps['placement']> }) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [consent, setConsent] = useState<boolean>(readStoredConsent);
  const [state, setState] = useState<AdState>('unknown');

  useEffect(() => {
    // Read consent state on mount and stay in sync if it changes in another
    // tab or right after the user responds to the cookie banner.
    setConsent(readStoredConsent());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY || e.key === 'cookie-consent' || e.key === null) setConsent(readStoredConsent());
    };
    const onConsentChanged = () => setConsent(readStoredConsent());
    window.addEventListener('storage', onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    window.addEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
      window.removeEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  useEffect(() => {
    if (!consent) { pushed.current = false; setState('unknown'); return; }
    /* Round 304: the gate is an explicit rule now. It used to block only on
       'essential' and let null (undecided) fall through to the script
       presence check, which happened to hold; an affirmative accepted is
       the only state that initializes a slot. */
    if (pushed.current) return;
    let cancelled = false;
    let retryFrame = 0;
    let attempts = 0;
    let waitingOn: HTMLScriptElement | null = null;
    const stopWaiting = () => {
      waitingOn?.removeEventListener('load', initialize);
      waitingOn?.removeEventListener('error', failed);
      waitingOn = null;
    };
    const failed = () => {
      stopWaiting();
      cancelled = true;
      setState('empty');
    };
    const initialize = () => {
      stopWaiting();
      if (cancelled || pushed.current) return;
      if (!loadAdSense(adRef.current)) {
        attempts += 1;
        if (attempts <= HEAD_SETTLE_FRAMES) {
          retryFrame = window.requestAnimationFrame(initialize);
          return;
        }
        setState('empty');
        return;
      }
      const script = getAdSenseScript();
      if (script?.hasAttribute('data-dukb-ad-loading')) {
        waitingOn = script;
        script.addEventListener('load', initialize, { once: true });
        script.addEventListener('error', failed, { once: true });
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
      stopWaiting();
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
    };
  }, [consent]);

  /* AdSense writes data-ad-status onto the ins element when it answers. */
  useEffect(() => {
    const el = adRef.current;
    if (!consent || !el || state !== 'unknown') return;
    const read = () => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled') setState('filled');
      else if (status === 'unfilled') setState('empty');
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => mo.disconnect();
  }, [consent, state]);

  // Keep pending inventory mounted until the publisher reports its outcome.
  if (!consent) return null;
  // Nothing came, and nothing is coming. Take the space back.
  if (state === 'empty') return null;

  const footer = placement === 'public-footer';

  return (
    <div
      data-dukb-manual-ad={placement}
      className={`ad-container flex w-full flex-col items-center gap-1 ${className}`}
      style={footer ? { paddingTop: AD_CONTROL_GAP_PX } : { position: 'relative', paddingTop: AD_RAIL_LABEL_PX }}
    >
      {state === 'filled' && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 select-none" style={footer ? undefined : { position: 'absolute', top: 0 }}>Advertisement</span>
      )}
      {footer && <style>{'.dukb-footer-display{width:100%;max-width:320px;height:100px}@media(max-width:335px){.dukb-footer-display{max-width:300px}}@media(min-width:768px){.dukb-footer-display{max-width:728px;height:90px}}'}</style>}
      <ins
        ref={adRef}
        className={footer ? 'adsbygoogle dukb-footer-display' : 'adsbygoogle'}
        style={footer ? { display: 'block' } : { display: 'block', width: '100%', maxWidth: 'var(--creative-width, 160px)', height: AD_RAIL_HEIGHT_PX }}
        data-ad-client="ca-pub-2929318086316376"
        data-ad-slot={slot}
      />
    </div>
  );
}

export default AdBanner;
