import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const CookiePolicy = () => {
  return (
    <main id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title="Cookie Policy - DoUKnowBall"
        description="How DoUKnowBall uses cookies and browser storage, what Lovable measures, and how to change or withdraw Advertising consent."
        path="/cookie-policy"
      />
      <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to games
      </Link>
      <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: November 13, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Cookies and storage</h2>
          <p>DoUKnowBall uses browser storage for game progress, scores, streaks, settings and your cookie choices. Account features also use our sign-in service. Some gameplay data is sent to our database as explained in the <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>. You can play without an account and with optional advertising off.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Your choices</h2>
          <p>Advertising starts off. Google Analytics 4 stays paused. Advertising stays off if your browser exposes Global Privacy Control to the site, even if you previously turned Advertising on.</p>
          <p className="mt-2">Reject all keeps Advertising off. Accept all turns Advertising on where available. Save choices applies your selection. We ask again after 180 days. That period applies to your cookie choice, not a promise to delete game saves or provider records after 180 days.</p>
          <p className="mt-2">Open Cookie choices in the footer whenever you want to change your selection.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Advertising</h2>
          <p>If you turn Advertising on and visit a page with an ad slot, the site can request Google AdSense ads. We request non-personalized ads. These may still use cookies and identifiers for delivery, frequency limits, measurement and fraud prevention. They are not anonymous ads. See the <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>'s advertising section and <a href="https://policies.google.com/technologies/partner-sites" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's linked privacy information</a> for more detail.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Turning advertising off</h2>
          <p>Open Cookie choices, turn Advertising off and choose Save choices. We stop future optional loading and clear matching optional cookies our code can access. We normally reload to stop already-loaded scripts. If your choice cannot be saved or a game has unsaved progress, a notice asks you to refresh when it is safe; already-loaded code may continue until then.</p>
          <p className="mt-2">Withdrawal does not erase information already received by a provider or remove cookies on another site or outside our code's access.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Browser controls and other requests</h2>
          <p>You can also clear cookies and stored site data in your browser settings. This can remove local career saves, preferences and your guest handle. Clearing local data does not by itself delete database or provider records.</p>
          <p className="mt-2">Lovable still measures basic visits, engagement, performance, and browser errors after Reject all. Lovable says this measurement uses no cookies or browser storage. Click tracking and optional app events are off. Hosting logs and other technical requests are described in the <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.</p>
          <p className="mt-2">Cloudflare helps protect our hosted site from automated traffic. It can set a security cookie called <strong>__cf_bm</strong>. Cloudflare says the cookie holds encrypted bot-detection information and expires after 30 minutes of continuous inactivity. It is separate from optional Advertising and Analytics. See <a href="https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/#__cf_bm-cookie-for-cloudflare-bot-products" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Cloudflare's cookie information</a>.</p>
          <p className="mt-2">For privacy or deletion requests, use the contact details and rights process in the <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.</p>
        </div>
      </section>
    </main>
  );
};

export default CookiePolicy;
