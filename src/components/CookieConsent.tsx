import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CONSENT_CHANGED_EVENT, loadConsentedScripts } from '@/lib/consentedScripts';
import { safeLocalStorage } from '@/lib/safeStorage';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [helpTarget, setHelpTarget] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const consent = safeLocalStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  // Keep the existing choices inside an open rules dialog's focus scope.
  useEffect(() => {
    if (!visible) return;
    const syncTarget = () => setHelpTarget(document.querySelector<HTMLElement>('[data-dukb-help-cookie-choices]'));
    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [visible]);
  const insideHelp = !!helpTarget?.isConnected;

  /* A withdrawal in another tab reloads this one so vendor code that already
     ran is removed. Accept can start scripts in place, which preserves an
     active game. Other choices only update the banner when no vendor ran. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'cookie-consent') return;
      if (event.newValue === 'accepted') {
        setVisible(false);
        loadConsentedScripts();
        return;
      }
      if (event.oldValue === 'accepted') {
        window.location.reload();
        return;
      }
      setVisible(event.newValue === null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* Round 117: mark the document while consent is still unanswered. index.css
     uses this to keep an open dialog clear of the banner, so the banner can
     sit on top without ever burying the dialog's own buttons. Cleared the
     moment consent is answered, and on unmount, so it can never stick. */
  useEffect(() => {
    if (!visible || insideHelp) return;
    document.body.dataset.consentPending = '1';
    return () => { delete document.body.dataset.consentPending; };
  }, [visible, insideHelp]);

  /* Round 117, second half of the same bug. Making the banner clickable again
     is not enough on its own: an open Radix modal also stamps aria-hidden on
     every other child of <body>, this banner included, which takes it out of
     the accessibility tree entirely. A sighted player could then click a
     consent button that a screen reader could not even announce. Radix
     re-applies the attribute whenever a dialog opens or closes, so watch for
     it and take it straight back off. */
  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;
    const unhide = () => { if (el.getAttribute('aria-hidden') !== null) el.removeAttribute('aria-hidden'); };
    unhide();
    const mo = new MutationObserver(unhide);
    mo.observe(el, { attributes: true, attributeFilter: ['aria-hidden'] });
    return () => mo.disconnect();
  }, [visible, helpTarget]);

  /* Round 1142: through the storage seam. In a browser that blocks storage or
     has filled it, this write used to throw, the banner stayed up for good and
     Essential only could never be chosen. The seam keeps the answer for the
     visit instead. The try is for the one case the seam cannot see, storage
     that filled up after the page loaded: the answer still stands for this
     page, and the banner still leaves. */
  const saveChoice = (choice: 'accepted' | 'essential') => {
    try { safeLocalStorage.setItem('cookie-consent', choice); } catch { /* see above */ }
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    setVisible(false);
  };

  const accept = () => {
    saveChoice('accepted');
    // Start analytics in this session. The ad loader also runs, but it stays
    // off until AdBanner renders a deliberate slot after this state change.
    loadConsentedScripts();
  };

  // "Essential only": AdBanner reads this exact value and renders nothing
  // when set, so no ad slot is initialized.
  const essentialOnly = () => {
    saveChoice('essential');
  };

  if (!visible) return null;

  /* Round 117: portalled to <body> at z-[60], not rendered in place at z-50.
     Two separate things were burying this banner. RulesGate re-opens each
     game's How to Play dialog on EVERY mount by design, and a shadcn Dialog
     paints a full screen bg-black/80 overlay and portals it to the end of
     <body>; at an equal z-index DOM order decides, so the overlay won. And
     raising the number alone did not help, because rendered in place this
     banner sits inside an ancestor stacking context and its z-index is only
     ever resolved against its siblings, never against a body level portal.
     Portalling puts it in the same context as the dialog so the number
     finally means something. It matters because ads are consent gated: for
     anyone landing on a game page from search, and most players do, Accept
     and Essential only could not be clicked at all, every single visit.

     pointer-events-auto is the part that actually unlocks it, and it is not
     optional. A Radix Dialog in modal mode sets pointer-events:none on
     <body> for as long as it is open, so everything outside the dialog goes
     inert no matter how high its z-index is. Measured on /footle: body
     pointer-events none, banner inherits none, banner z-index 60 sitting
     uselessly above a z-50 overlay. Opting this one subtree back in is the
     standard escape hatch and is scoped to the banner alone. */
  // Inside shared help, the same choices use normal layout within its trap.
  return createPortal(
    /* Round 307: a named region that takes focus when it appears. The portal
       lands at the end of the document, so without the focus move a keyboard
       user had to tab through the whole page to find the two buttons, and a
       screen reader was never told the banner existed. */
    <div
      ref={el => {
        ref.current = el;
        if (el && !el.dataset.dukbFocused) { el.dataset.dukbFocused = '1'; el.focus(); }
      }}
      role="region"
      aria-label="Cookie choices"
      tabIndex={-1}
      data-site-chrome=""
      className={insideHelp
        ? 'pointer-events-auto rounded-xl border border-border p-3 bg-card'
        : 'fixed bottom-0 left-0 right-0 z-[60] pointer-events-auto p-4 bg-card border-t border-border shadow-lg'}
    >
      <div className={`max-w-3xl mx-auto flex flex-col ${insideHelp ? '' : 'sm:flex-row'} items-center gap-3 text-sm text-muted-foreground`}>
        {/* Round 286: the banner used to say "by continuing you agree", which
            was never how it worked: nothing to do with ads loads until Accept
            is pressed. It says what it does now. */}
        <p className="min-w-0 self-stretch text-center sm:text-left">
          Ads and analytics only run if you press Accept. Essential only keeps them off and every game works the same.{' '}
          <Link to="/privacy" className="underline hover:text-foreground font-medium">Learn more</Link>
        </p>
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <button
            onClick={essentialOnly}
            className="min-h-11 px-4 py-2 rounded-lg bg-transparent border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="min-h-11 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Accept
          </button>
        </div>
      </div>
    </div>,
    insideHelp ? helpTarget! : document.body,
  );
}
