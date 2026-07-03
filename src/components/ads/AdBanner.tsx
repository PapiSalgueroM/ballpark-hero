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

const AdBanner = ({ slot, format = 'auto', layout, layoutKey, className = '' }: AdBannerProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [consent, setConsent] = useState<string | null>(null);

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
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded
    }
  }, [consent]);

  // Essential-only consent: render nothing (no slot reserved, no request made).
  if (consent === 'essential') return null;

  const minHeight = MIN_HEIGHT_BY_FORMAT[format] ?? 100;

  return (
    <div
      className={`ad-container flex flex-col items-center justify-center my-6 gap-1 ${className}`}
      style={{ minHeight }}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 select-none">
        Advertisement
      </span>
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
