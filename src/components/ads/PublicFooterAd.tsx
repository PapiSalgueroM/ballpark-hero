import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdBanner from './AdBanner';
import { isPublicDesktopRailRoute } from './GameDesktopRails';

/** A single below-content placement on public games, sport hubs and editorial pages. */
export function PublicFooterAd() {
  const { pathname, search, hash } = useLocation();
  const eligible = !search && !hash && isPublicDesktopRailRoute(pathname);
  return eligible ? <CanonicalFooterAd key={pathname} pathname={pathname} /> : null;
}

function CanonicalFooterAd({ pathname }: { pathname: string }) {
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    if ((window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return;
    const screen = window.matchMedia('(min-width: 320px)');
    const check = () => {
      const canonical = Array.from(document.querySelectorAll('head link[rel="canonical"]'))
        .some(link => link.getAttribute('href') === 'https://douknowball.com' + pathname);
      const noindex = !!document.querySelector('head meta[name="robots"][content*="noindex" i]');
      setEligible(screen.matches && canonical && !noindex);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'content'] });
    screen.addEventListener('change', check);
    check();
    return () => {
      observer.disconnect();
      screen.removeEventListener('change', check);
    };
  }, [pathname]);

  return eligible ? (
    <div data-public-footer-ad="" data-no-prerender="" className="mx-auto w-full max-w-[728px] empty:hidden">
      <AdBanner slot="7540487748" format="horizontal" className="mx-auto w-full max-w-[728px]" />
    </div>
  ) : null;
}
