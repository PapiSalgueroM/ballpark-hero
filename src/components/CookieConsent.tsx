import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
    // index.html only loads the AdSense script when consent is already
    // 'accepted' at page load; inject it now so ads start this session too.
    try {
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
        const s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
        document.head.appendChild(s);
      }
    } catch {
      // storage or DOM blocked: ads simply stay off this session
    }
  };

  // "Essential only": AdBanner reads this exact value and renders nothing
  // when set, so no personalized-ad slot is initialized.
  const essentialOnly = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-sm text-muted-foreground">
        <p className="flex-1 text-center sm:text-left">
          We use cookies to improve your experience and show personalised ads. By continuing you agree to our cookie policy.{' '}
          <Link to="/privacy" className="underline hover:text-foreground font-medium">Learn More</Link>
        </p>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={essentialOnly}
            className="px-4 py-2 rounded-lg bg-transparent border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
