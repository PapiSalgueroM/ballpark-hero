import { loadPublicAdPublisher } from '@/lib/consentedScripts';
import { useLocation } from 'react-router-dom';
import { normalizeRoutePath } from '@/lib/routePath';
import AdBanner from './AdBanner';
import { usePublicAdEligibility } from './usePublicAdEligibility';

export function PublicFooterAd() {
  const { pathname } = useLocation();
  const eligible = usePublicAdEligibility('(min-width: 320px)', loadPublicAdPublisher);
  return eligible ? (
    <div key={normalizeRoutePath(pathname)} data-public-footer-ad="" data-no-prerender="" className="mx-auto w-full max-w-[728px] empty:hidden">
      <AdBanner placement="public-footer" slot="7540487748" format="horizontal" className="w-full" />
    </div>
  ) : null;
}
