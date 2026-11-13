import { useState, useEffect, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { loadConsentedScripts, stopRevokedServices } from '@/lib/consentedScripts';
import {
  ANALYTICS_READY, CONSENT_CHANGED_EVENT, CONSENT_EFFECTIVE_CHANGED_EVENT, CONSENT_KEY, CONSENT_MAX_AGE_MS, CONSENT_OPEN_EVENT,
  canReloadAfterWithdrawal, enforceGlobalPrivacyControl, getEffectiveConsent, getPendingConsentWithdrawal, isGlobalPrivacyControlEnabled,
  migrateConsentPreferences, readConsentPreferences, saveConsentPreferences, setPendingConsentWithdrawal, synchronizeConsentStorageEvent,
  type ConsentPurposes,
} from '@/lib/consentPreferences';
import { safeLocalStorage } from '@/lib/safeStorage';

export function CookieConsent({ inline = false, compactInitial = false, waitForRulesHost = false }: {
  inline?: boolean; compactInitial?: boolean; waitForRulesHost?: boolean;
}) {
  const [preferences, setPreferences] = useState(readConsentPreferences);
  const [visible, setVisible] = useState(() => inline && !preferences && safeLocalStorage.getItem('cookie-consent') !== 'essential');
  const [showDetails, setShowDetails] = useState(false);
  const [helpTarget, setHelpTarget] = useState<HTMLElement | null>(null);
  const [advertising, setAdvertising] = useState(false);
  const [gpc, setGpc] = useState(isGlobalPrivacyControlEnabled);
  const [pendingReload, setPendingReload] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const explicitlyOpen = useRef(false);
  const lastEffective = useRef(getEffectiveConsent());
  const pendingRevoked = useRef<ConsentPurposes>(getPendingConsentWithdrawal());

  useEffect(() => {
    let expiryTimer = 0;
    const reconcile = () => {
      window.clearTimeout(expiryTimer);
      migrateConsentPreferences();
      enforceGlobalPrivacyControl();
      let next = getEffectiveConsent();
      const saved = readConsentPreferences();
      const previous = lastEffective.current;
      const revoked = {
        advertising: previous.advertising && !next.advertising,
        analytics: previous.analytics && !next.analytics,
      };

      pendingRevoked.current = {
        advertising: pendingRevoked.current.advertising || revoked.advertising,
        analytics: pendingRevoked.current.analytics || revoked.analytics,
      };
      setPendingConsentWithdrawal(pendingRevoked.current);
      next = getEffectiveConsent();
      lastEffective.current = next;
      if (previous.advertising !== next.advertising || previous.analytics !== next.analytics) {
        window.dispatchEvent(new Event(CONSENT_EFFECTIVE_CHANGED_EVENT));
      }
      setGpc(isGlobalPrivacyControlEnabled());
      setPreferences(saved);
      setVisible(!saved || explicitlyOpen.current);
      if (!saved) setAdvertising(false);
      if (isGlobalPrivacyControlEnabled()) setAdvertising(false);
      if (pendingRevoked.current.advertising || pendingRevoked.current.analytics) {
        setAdvertising(next.advertising);
        stopRevokedServices(pendingRevoked.current, next);
        if (canReloadAfterWithdrawal(pendingRevoked.current)) {
          window.location.reload();
          return;
        }
        setPendingReload(true);
        setVisible(true);
      } else if (next.advertising || next.analytics) {
        loadConsentedScripts();
      }
      if (saved) {
        // Native timers cannot hold a 180-day delay. Recheck in bounded steps.
        const remaining = saved.updatedAt + CONSENT_MAX_AGE_MS - Date.now();
        expiryTimer = window.setTimeout(reconcile, Math.min(2147483647, Math.max(50, remaining)));
      }
    };
    const legacy = migrateConsentPreferences();
    // Old analytics cookies/code can survive a previous release even when the
    // new effective analytics choice is false. Pause those without loading a vendor.
    stopRevokedServices({ advertising: legacy === 'accepted' || isGlobalPrivacyControlEnabled(), analytics: !ANALYTICS_READY });
    reconcile();
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY || event.key === 'cookie-consent' || event.key === null) {
        synchronizeConsentStorageEvent(event);
        reconcile();
      }
    };
    const onOpen = (event: Event) => {
      const effective = getEffectiveConsent();
      explicitlyOpen.current = true;
      setShowDetails(true);
      opener.current = (event as CustomEvent<{ opener?: HTMLElement }>).detail?.opener ?? null;
      setAdvertising(effective.advertising);
      setVisible(true);
      ref.current?.focus();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, reconcile);
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    return () => {
      window.clearTimeout(expiryTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, reconcile);
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, []);

  // Keep one region inside an open rules dialog's existing focus scope.
  useEffect(() => {
    if (!visible) return;
    const selector = '[data-dukb-help-cookie-choices]';
    let target = document.querySelector<HTMLElement>(selector);
    setHelpTarget(target);
    const syncTarget = () => {
      const next = document.querySelector<HTMLElement>(selector);
      if (next === target) return;
      target = next;
      // Fill the new host in this mutation delivery, before the dialog can paint empty.
      if (next) flushSync(() => setHelpTarget(next));
      else setHelpTarget(null);
    };
    const observer = new MutationObserver(records => {
      if (target && !target.isConnected) { syncTarget(); return; }
      // Ordinary score and card updates cannot move the rules dialog's host.
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches(selector) || node.querySelector(selector))) {
          syncTarget();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [visible]);
  const insideHelp = !!helpTarget?.isConnected;
  const inlineNotice = inline && !insideHelp;
  const waitingForRules = waitForRulesHost && !insideHelp;

  useEffect(() => {
    if (!visible || insideHelp || inlineNotice) return;
    document.body.dataset.consentPending = '1';
    const el = ref.current;
    const measure = () => document.body.style.setProperty('--dukb-consent-height', `${el?.getBoundingClientRect().height ?? 230}px`);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (el) observer?.observe(el);
    return () => {
      delete document.body.dataset.consentPending;
      document.body.style.removeProperty('--dukb-consent-height');
      observer?.disconnect();
    };
  }, [visible, insideHelp, inlineNotice]);

  useEffect(() => {
    if (!visible || waitingForRules) return;
    const el = ref.current;
    if (!el) return;
    const unhide = () => { if (el.getAttribute('aria-hidden') !== null) el.removeAttribute('aria-hidden'); };
    unhide();
    const observer = new MutationObserver(unhide);
    observer.observe(el, { attributes: true, attributeFilter: ['aria-hidden'] });
    return () => observer.disconnect();
  }, [visible, helpTarget, waitingForRules]);

  const save = (choice: ConsentPurposes) => {
    explicitlyOpen.current = false;
    setShowDetails(false);
    setVisible(false);
    saveConsentPreferences(choice);
    if (!pendingRevoked.current.advertising && !pendingRevoked.current.analytics) opener.current?.focus({ preventScroll: !inlineNotice });
  };
  const cancel = () => {
    explicitlyOpen.current = false;
    setShowDetails(false);
    setVisible(false);
    opener.current?.focus({ preventScroll: !inlineNotice });
  };
  if (!visible || waitingForRules) return null;

  const compact = compactInitial && !showDetails && !insideHelp && !pendingReload;
  const buttonPadding = inlineNotice || compact ? 'px-2 sm:px-4' : 'px-4';
  const region = (
    <div
      ref={el => {
        ref.current = el;
        if (el && !compact && !el.dataset.dukbFocused && (!inlineNotice || explicitlyOpen.current)) {
          el.dataset.dukbFocused = '1';
          el.focus();
        }
      }}
      role="region"
      aria-label="Cookie choices"
      tabIndex={-1}
      data-site-chrome=""
      data-game-consent-inline={inlineNotice ? '' : undefined}
      className={insideHelp
        ? 'pointer-events-auto rounded-xl border border-border p-3 bg-card'
        : inlineNotice
          ? 'border-b border-border bg-card p-3'
          : `fixed bottom-0 left-0 right-0 z-[60] pointer-events-auto max-h-[60dvh] overflow-y-auto ${compact ? 'p-3' : 'p-4'} bg-card border-t border-border shadow-lg`}
    >
      <div className={`max-w-3xl mx-auto ${compact ? 'space-y-2' : 'space-y-3'} text-sm text-muted-foreground`}>
        {/* Reserve the narrow inline layout's extra text line before Inter arrives. */}
        <p className={inlineNotice ? 'max-[369px]:min-h-[3.75rem]' : undefined}>
          Essential storage keeps games working. Advertising is optional. We ask again in 180 days.{' '}
          <Link to="/privacy" className="underline hover:text-foreground font-medium">Learn more</Link>
        </p>
        {!compact && <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="inline-flex min-h-11 items-center gap-2 text-foreground">
            <input type="checkbox" checked={advertising && !gpc} disabled={gpc || pendingReload} onChange={event => setAdvertising(event.target.checked)} />
            Advertising
          </label>
          <p data-analytics-paused-status="">
            <strong>Google Analytics is paused.</strong> Lovable still measures basic visits.
          </p>
        </div>}
        {gpc && <p>Your browser's Global Privacy Control keeps advertising off.</p>}
        {pendingReload && <p role="status">Advertising is off for this visit. Save your game or allow site storage, then choose Save choices to refresh. Already-loaded vendor code may keep running until then.</p>}
        <div className={inlineNotice || compact
          ? `grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center ${inlineNotice ? 'max-[358px]:min-h-[3.5rem] [&>button]:break-words' : ''}`
          : 'flex flex-wrap items-center gap-2'}>
          <button type="button" onClick={() => save({ advertising: false, analytics: false })} className={`min-h-11 ${buttonPadding} py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors`}>Reject all</button>
          <button type="button" disabled={pendingReload} onClick={() => save({ advertising: true, analytics: false })} className={`min-h-11 ${buttonPadding} py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors`}>Accept all</button>
          {compact
            ? <button type="button" onClick={() => setShowDetails(true)} className={`min-h-11 ${buttonPadding} py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors`}>Manage choices</button>
            : <button type="button" onClick={() => save({ advertising, analytics: false })} className={`min-h-11 ${buttonPadding} py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity`}>Save choices</button>}
          {preferences && !pendingReload && <button type="button" onClick={cancel} className={`min-h-11 ${buttonPadding} py-2 underline hover:text-foreground`}>Cancel</button>}
        </div>
      </div>
    </div>
  );
  return inlineNotice ? region : createPortal(region, insideHelp ? helpTarget! : document.body);
}
