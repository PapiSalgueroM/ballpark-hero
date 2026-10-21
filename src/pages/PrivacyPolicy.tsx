import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { OAUTH_PROVIDERS } from '@/lib/authProviders';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title="Privacy Policy - DoUKnowBall" description="Privacy policy for DoUKnowBall sports trivia games." path="/privacy" />
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: October 21, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>DoUKnowBall is completely free. There are no subscriptions, no paid features, and no in-app purchases, so we never collect or store payment information of any kind. You can also play every game without an account. If you choose to use certain features, here is what we collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Local storage data:</strong> Game progress, scores, streaks, and preferences are stored in your browser's local storage on your own device and are not sent to our servers unless described below.</li>
            <li><strong>Account data (optional):</strong> You can create an account with an email address and password{OAUTH_PROVIDERS.google ? ', or sign in with Google' : ''}. If you do, we store your email address, display name or username, avatar (if you set one), and your game scores and streaks so we can show them back to you and on leaderboards. You never need an account to play.</li>
            <li><strong>Gameplay and leaderboard data:</strong> Certain game modes submit gameplay data (e.g., number of clues used, final score, puzzle date) to our database. When you are not signed in, this data is not linked to your name or email. Each row does carry a display name: your profile name if you are signed in, or a random sports themed handle your browser generates and keeps in local storage (something like "IcyPoacher-42") so your scores stay yours on leaderboards. Clearing your browser's site data mints a fresh handle.</li>
            <li><strong>Grid selection data:</strong> In grid-based games, player name selections are stored to calculate rarity scores. This is not linked to your identity unless you are signed in.</li>
            <li><strong>Reported issues:</strong> If you use a Report button, we store the selected report category, the text you typed, the page, the date in Eastern Time, and limited in-game details supplied by that game, such as its puzzle, mode, target, lineup, current path, or last rejected answer. We record the report time in UTC. Where space allows, reports also include timezone, your browser's user agent string (its name, version and operating system) and language, viewport size and screen pixel ratio, and the loaded build filename when available. Each report also notes which Report button sent it (the game's own or the one in the footer) and whether the game details were shortened to fit. These small diagnostics help us reproduce the issue. The report payload does not automatically attach your account, email address, a screenshot, or whole browser storage. Anything you type into the report is included, so please leave out passwords and other personal or confidential information.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies &amp; Local Storage</h2>
          <p>This site uses browser local storage to save your game progress, best scores, preferences, and UI state, and to remember your optional cookie choices. Local storage data stays on your device and is not transmitted to our servers except as described in Section 1.</p>
          <p className="mt-2">Advertising and Analytics are separate optional purposes, and both start off. Analytics is currently paused and its control stays off. <strong>Accept all</strong> enables the optional purposes currently available, <strong>Reject all</strong> keeps them off, and <strong>Save choices</strong> applies your available selections. If your browser sends a <strong>Global Privacy Control</strong> signal, Advertising stays off. You can play the games with optional purposes off. We ask you to choose again after 180 days.</p>
          <p className="mt-2">The <strong>Cookie choices</strong> link in the footer opens your current settings. You can turn Advertising off and choose <strong>Save choices</strong>. Analytics stays off while it is paused. Saving a withdrawal clears the relevant optional cookies our code can access on this site. We normally reload to stop scripts that are already loaded. If your choice cannot be saved or a game has unsaved progress, optional loading stays paused and a notice asks you to refresh when it is safe. This does not erase information already received by a provider or remove cookies controlled by another site or inaccessible to our code. You can also manage cookies and clear stored site data in your browser settings. For requests concerning data already collected, see Section 6.</p>
          <p className="mt-2">Third-party services (such as Google AdSense) use cookies and similar technologies to serve ads. If ads are served on this site, we request non-personalized ads. Those cookies are governed by the third party's own privacy policy, and Section 5 explains what they do.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Data</h2>
          <p>We use the data described above to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Let you sign in, keep your scores and streaks, and show leaderboards and profiles</li>
            <li>Calculate rarity scores and community statistics for grid-based games</li>
            <li>Show ads (non-personalized on this site) to support the free games on this Site</li>
            <li>Understand aggregate site usage patterns and game popularity</li>
            <li>Review and fix reported wrong or outdated answers</li>
            <li>Improve game content, difficulty balancing, and user experience</li>
          </ul>
          <p className="mt-2"><strong>We do not sell your data.</strong> The third-party services described in Section 4 receive data to provide their services, such as hosting our database, handling reports or serving ads. Their own terms and privacy policies also apply.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Supabase:</strong> Our backend provider. It hosts our database and handles account sign-up and sign-in (email/password{OAUTH_PROVIDERS.google ? ' and Google sign-in' : ''}). Account data, scores, and streaks are stored here.</li>
            {OAUTH_PROVIDERS.google && (
              <li><strong>Google Sign-In:</strong> If you choose to sign in with Google, Google shares your name, email address, and profile picture with us to create your account. Google's own privacy policy applies to that sign-in process.</li>
            )}
            <li><strong>Google AdSense:</strong> The Site is set up to request Google AdSense ads after you turn on Advertising in Cookie choices and open a page with an ad slot. We request non-personalized ads. Google still uses cookies for things like frequency capping and fraud prevention. Section 5 has the full advertising disclosure and every opt-out link, including <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li><strong>Google Analytics:</strong> Google Analytics 4 is currently paused. We do not load its tag, and the Analytics control stays off, including when you choose Accept all. Hosting-provider usage information and ordinary server logs, described in Section 10, are separate.</li>
            <li><strong>Hosting (Lovable and ChatGPT Sites):</strong> We use Lovable and OpenAI's ChatGPT Sites to host versions of the Site. The hosting service for the address you visit serves its pages and assets and receives standard technical request data (such as your IP address and browser type) to deliver them.</li>
            <li><strong>FormSubmit:</strong> When you use a Report button, the report is relayed to our inbox through FormSubmit, an email relay service. The relay receives the selected report category, the text you typed, the page, the date in Eastern Time, and limited in-game details supplied by that game. The relay also receives the time in UTC and the other report details and limited browser diagnostics described in Section 1. We do not automatically attach your account, email address, a screenshot, or whole browser storage to the report. Anything you type into the report is included.</li>
            <li><strong>AI services (Google Gemini):</strong> Some games send game content, such as typed answers, search text, categories, selected player and team details, lineups or formations, through our backend to Google's Gemini, either directly or through Lovable's AI gateway. These services support answer checks, player suggestions, lineup ratings and analysis, and fictional season stories. Player-suggestion features may send search text while you type. Anything you enter in these fields can be included, so do not enter personal or confidential information. Our backend and providers also receive technical request data to deliver these services. We do not use these game inputs to train a model of our own; provider processing and retention are governed by the terms and privacy practices applicable to that service. These game services are separate from our use of AI tools to help develop the Site.</li>
            <li><strong>FlagCDN:</strong> Some country flag images load from flagcdn.com. When your browser requests an image, the image provider receives standard request data, such as your IP address and browser information, to deliver it.</li>
            <li><strong>Wikipedia (citation links, not a data processor):</strong> Some of our reference pages, such as the Champions League format history, cite Wikipedia and other public sources for facts and link to those pages so you can check the source yourself. Nothing about your visit is sent to Wikipedia, or to any other cited source, unless you click through to it, and if you do, that site's own privacy policy applies from that point.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Advertising and Your Choices</h2>
          <p>Advertising can help cover hosting costs and keep the games free. We request non-personalized Google AdSense ads on pages with ad slots after you turn on Advertising in Cookie choices. Here is what using Google advertising means in practice:</p>
          <p className="mt-2">The first two bullets below are Google's general publisher disclosure. The prior-visit and cross-site personalization described in them are not the ad-selection mode this Site requests. Before Google's advertising script loads, this Site sets Google's non-personalized ads flag. Google may still use cookies and identifiers for frequency capping, aggregate reporting, fraud prevention, and similar purposes.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or to other websites.</li>
            <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</li>
            <li>When Google serves an ad, it and its partners may use cookies, web beacons, IP addresses, and other identifiers to deliver, limit, measure, and protect advertising.</li>
            <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li>Other third party vendors and ad networks may also serve ads on this site. You can opt out of some of these vendors' use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">www.aboutads.info/choices</a>, and in the European Union at <a href="https://www.youronlinechoices.eu" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">www.youronlinechoices.eu</a>.</li>
            <li>Google explains how it uses information from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.</li>
          </ul>
          <p className="mt-2">When Advertising is off, this site does not load Google's advertising code. Analytics is currently paused. Advertising also stays off when your browser sends Global Privacy Control. Turning on Advertising lets us request non-personalized ads, which can still use cookies and identifiers as described above; it does not mean anonymous advertising. You can change the available Advertising setting through Cookie choices in the footer. Analytics remains paused.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention, Access &amp; Deletion</h2>
          <p>Sign in and open <Link to="/profile" className="underline hover:text-foreground transition-colors">your profile</Link> for an account-data download or an account-deletion request. The download covers account details, preferences, scores, votes and account-linked saves included in the tool, including our account-score backup. Deletion requires your current password. Accounts with admin access, protected sign-in or uploaded files need a manual check. Browser-only saves, reports, inbox copies, server logs and provider backups need separate handling; contact us about access, corrections or deletion of those records. Deleting an account does not automatically erase every historical record held by a provider.</p>
          <p>Local storage data is retained on your device until you clear it. If you have an account, we keep your account data, scores, and streaks until you ask us to delete them. You can request deletion from your profile or by email: write to us at the address below and we will permanently delete your account and the data linked to it within 30 days. Guest gameplay can remain as individual score or leaderboard records under the browser's persistent sports-themed handle and can also be used for statistics. Contact us with the relevant game details if you want us to review a guest record; a matching display name alone does not establish ownership.</p>
          <p className="mt-2">You have the right to ask what data we have about you, correct it, or have it deleted. To do this, or for any privacy question, contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> and we will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Children's Privacy</h2>
          <p>DoUKnowBall is intended for a general audience. You can play without creating an account, but playing signed out does not mean that no data is processed. Hosting services receive technical request data, and some games submit the gameplay data described above.</p>
          <p className="mt-2">Accounts are optional and require you to be at least 13. If you are under 13, do not create an account or submit personal information through game answers, reports or other forms. A parent's involvement does not create an exception to the account age requirement. If you believe a child under 13 has created an account or submitted personal information, contact <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> so we can review and address it, including deleting the information as required.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Your Rights</h2>
          <p>Wherever you live, you can ask us what data we hold about you, ask us to correct it, or ask us to delete it, by emailing <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a>. We answer within 30 days and we do not charge for it.</p>
          <p className="mt-2"><strong>Where the data protection laws of the European Economic Area, the United Kingdom or Switzerland apply,</strong> you may also have rights to restrict or object to processing, receive a portable copy of your data, withdraw consent and complain to your local data protection authority, subject to the conditions and exceptions in those laws. Use Cookie choices in the footer to withdraw advertising consent. Analytics remains paused. Where these laws apply, our bases are consent for optional advertising technologies, performance of a contract for account services where applicable, and legitimate interests in operating and securing the Site where that basis is available and appropriate.</p>
          <p className="mt-2"><strong>Where applicable California privacy law gives you these rights,</strong> you can request information about collection and use, deletion or correction, and exercise your rights without unlawful discrimination. You can also use the request process above wherever you live. We do not sell personal information. We request non-personalized ads, as described in Section 5. You can turn Advertising off in Cookie choices; Reject all keeps both advertising and analytics off.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Security and Where Your Data Lives</h2>
          <p>Account data is stored by Supabase and protected by its security controls, and it travels between your browser and our servers over an encrypted connection. Stored account passwords are hashed; the stored hash is not a readable copy of your password. For an account-deletion request, our backend briefly receives the current password you enter and passes it to our authentication provider to confirm it. Our account-privacy function does not store or log that password. Our service providers may process data on servers in the United States and in other countries, and each of them publishes its own privacy commitments (see Section 4). No website can promise perfect security, so please use a password you do not use anywhere else.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Server Logs and Analytics</h2>
          <p>Like any website, our host receives standard technical data with every request: your IP address, browser type, the page you asked for and the time. It is used to deliver the pages and to keep the Site working, and it is kept for as long as our host keeps its ordinary server logs.</p>
          <p className="mt-2">We also use aggregate hosting-provider usage information to understand traffic and game popularity. This is separate from Google Analytics 4, which is currently paused and whose tag we do not load, even when Advertising is on.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact</h2>
          <p>If you have any questions about this privacy policy, want to request access to or deletion of your data, or have a general concern, please contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a>. For issues with a specific question or answer in a game, you can also use the "Report" button on that game.</p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
