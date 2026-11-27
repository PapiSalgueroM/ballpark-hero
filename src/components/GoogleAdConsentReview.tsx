import { useEffect, useState } from 'react';
import { getEffectiveConsent } from '@/lib/consentPreferences';

interface GooglePrivacyWindow extends Window {
  googlefc?: {
    callbackQueue?: { push: (entry: { CONSENT_DATA_READY: () => void }) => unknown };
    showRevocationMessage?: () => void;
  };
  __tcfapi?: (command: 'ping', version: 2, callback: (result: {
    gdprApplies?: boolean; cmpLoaded?: boolean; cmpStatus?: string;
  } | null) => void) => void;
}

export function GoogleAdConsentReview() {
  const [available, setAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const provider = window as GooglePrivacyWindow;

  useEffect(() => {
    const queue = provider.googlefc?.callbackQueue;
    if (typeof queue?.push !== 'function' || !getEffectiveConsent().advertising) return;
    let open = true;
    const check = () => {
      if (!open || !getEffectiveConsent().advertising || typeof provider.googlefc?.showRevocationMessage !== 'function'
        || typeof provider.__tcfapi !== 'function') return;
      // The TCF ping reports applicability without reading a consent string.
      try {
        provider.__tcfapi('ping', 2, result => {
          if (open) setAvailable(result?.gdprApplies === true && result.cmpLoaded === true && result.cmpStatus === 'loaded');
        });
      } catch { /* Keep the site's own choices available when the CMP fails. */ }
    };
    try { queue.push({ CONSENT_DATA_READY: check }); }
    catch { /* No confirmed provider settings are available. */ }
    return () => { open = false; };
  }, [provider]);

  if (!available) return null;
  if (failed) return <p role="status">Google’s consent settings could not open. You can still turn off Advertising here.</p>;
  return <button type="button" className="min-h-11 text-left underline hover:text-foreground" onClick={() => {
    if (!getEffectiveConsent().advertising) return;
    try {
      if (typeof provider.googlefc?.showRevocationMessage === 'function') provider.googlefc.showRevocationMessage();
      else setFailed(true);
    } catch { setFailed(true); }
  }}>Review Google’s European ad consent</button>;
}
