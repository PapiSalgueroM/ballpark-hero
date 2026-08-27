import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

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

      <p className="text-sm text-muted-foreground mb-6">Last updated: August 27, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>DoUKnowBall is completely free. There are no subscriptions, no paid features, and no in-app purchases, so we never collect or store payment information of any kind. You can also play every game without an account. If you choose to use certain features, here is what we collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Local storage data:</strong> Game progress, scores, streaks, and preferences are stored in your browser's local storage on your own device and are not sent to our servers unless described below.</li>
            <li><strong>Account data (optional):</strong> You can create an account with an email address and password, or sign in with Google. If you do, we store your email address, display name or username, avatar (if you set one), and your game scores and streaks so we can show them back to you and on leaderboards. You never need an account to play.</li>
            <li><strong>Anonymous gameplay data:</strong> Certain game modes submit gameplay data (e.g., number of clues used, final score, puzzle date) to our database. When you are not signed in, this data is not linked to your name or email. Each row does carry a display name: your profile name if you are signed in, or a random sports themed handle your browser generates and keeps in local storage (something like "IcyPoacher-42") so your scores stay yours on leaderboards. Clearing your browser's site data mints a fresh handle.</li>
            <li><strong>Grid selection data:</strong> In grid-based games, player name selections are stored to calculate rarity scores. This is not linked to your identity unless you are signed in.</li>
            <li><strong>Reported issues:</strong> If you use the "Report" button on a game to flag a wrong or outdated answer, we store the report text you submit so we can review and fix it.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies &amp; Local Storage</h2>
          <p>This site uses browser local storage to save your game progress, best scores, preferences, and UI state, and to remember that you have responded to our cookie banner. Local storage data stays on your device and is not transmitted to our servers except as described in Section 1.</p>
          <p className="mt-2">The first time you visit we show a cookie banner with two choices. <strong>Accept</strong> lets us load Google's advertising script, which sets advertising cookies. <strong>Essential only</strong> keeps that script off entirely, and every game works exactly the same either way. Nothing to do with ads is loaded until you have made a choice.</p>
          <p className="mt-2">You can change your mind at any time. The <strong>Cookie choices</strong> link in the footer of every page clears your answer and shows the banner again, and a page loaded with no answer stored carries no advertising code at all. You can also manage or block cookies in your browser settings, and you can clear everything this site has stored by clearing your browser's site data for douknowball.com.</p>
          <p className="mt-2">Third-party services (such as Google AdSense) use cookies and similar technologies to serve ads. We ask Google for non-personalized ads on this site, so the ads you see here are based on the page you are on, not on a profile of you. Those cookies are governed by the third party's own privacy policy, and Section 5 explains what they do.</p>
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
          <p className="mt-2"><strong>We do not sell your data.</strong> We do not share your data with third parties except the service providers described in Section 4, who process it on our behalf (for example, to host our database or serve ads).</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Supabase:</strong> Our backend provider. It hosts our database and handles account sign-up and sign-in (email/password and Google sign-in). Account data, scores, and streaks are stored here.</li>
            <li><strong>Google Sign-In:</strong> If you choose to sign in with Google, Google shares your name, email address, and profile picture with us to create your account. Google's own privacy policy applies to that sign-in process.</li>
            <li><strong>Google AdSense:</strong> We display advertisements provided by Google AdSense, and only after you have chosen Accept on our cookie banner. We ask Google for non-personalized ads on this site, so ads are selected from the page you are viewing rather than from a profile of your browsing. Google still uses cookies for things like frequency capping and fraud prevention. Section 5 has the full advertising disclosure and every opt-out link, including <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li><strong>Google Analytics:</strong> We use Google Analytics 4 to see which games people play and how the Site is used, so we know what to build next. It loads only after you choose Accept on our cookie banner, and it uses cookies to tell one visit from another. Google Analytics 4 uses your IP address to work out your rough location and then discards it; it is not stored in our reports. You can also opt out of Google Analytics everywhere with <a href="https://tools.google.com/dlpage/gaoptout" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's browser add-on</a>.</li>
            <li><strong>Lovable (hosting):</strong> The Site itself is built and hosted on Lovable's platform, which serves the pages and assets you load. Like any web host, its servers receive standard technical request data (such as your IP address and browser type) in order to deliver the Site.</li>
            <li><strong>Wikipedia REST API:</strong> Used in some game modes to fetch publicly available player photographs. No personal data is sent.</li>
            <li><strong>FormSubmit:</strong> When you use a Report button, the report is relayed to our inbox through FormSubmit, an email relay service. Only the report text you typed and the page you were on are sent, nothing about your identity.</li>
            <li><strong>AI services (Google Gemini):</strong> Many of our games use an AI model to check answers and rate lineups. When you type an answer into a grid, board, or lineup game, the text you typed is sent through our backend to an AI model (currently Google's Gemini, reached either directly or through our hosting provider Lovable's AI gateway) so it can be verified against the category, and in games like "Build Your XI" the AI generates a rating for your team. Only the game content itself (your typed answer, player names, team names, formation data) is sent. Your name, email, account details, and device identifiers are never included, we do not use your inputs to train any model of our own, and the AI's output is only ever a validation result or rating shown back to you in the game.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Advertising and Your Choices</h2>
          <p>Ads are how the games stay free. We use Google AdSense, and we ask Google for non-personalized ads only: what you see is picked from the page you are on, not from a profile of you. Here is what using Google advertising means in practice, in the words Google asks publishers to use:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or to other websites.</li>
            <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</li>
            <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li>Other third party vendors and ad networks may also serve ads on this site. You can opt out of some of these vendors' use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">www.aboutads.info/choices</a>, and in the European Union at <a href="https://www.youronlinechoices.eu" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">www.youronlinechoices.eu</a>.</li>
            <li>Google explains how it uses information from sites that use its services at <a href="https://policies.google.com/technologies/partner-sites" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.</li>
          </ul>
          <p className="mt-2">If you chose Essential only on our banner, none of Google's advertising code is loaded by this site and no advertising cookies are set by it. Wherever you are, including the European Economic Area, the United Kingdom and Switzerland, ads on this site only ever appear after you have chosen Accept.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention, Access &amp; Deletion</h2>
          <p>Local storage data is retained on your device until you clear it. If you have an account, we keep your account data, scores, and streaks until you ask us to delete them. There is currently no self-serve delete button, so deletion works by email: write to us at the address below and we will permanently delete your account and the data linked to it within 30 days. Gameplay data that is not linked to an account is kept only for aggregate statistics.</p>
          <p className="mt-2">You have the right to ask what data we have about you, correct it, or have it deleted. To do this, or for any privacy question, contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> and we will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Children's Privacy</h2>
          <p>DoUKnowBall's games are suitable for a general audience and may be played by minors. You can play every game on the Site without creating an account or providing any personal information.</p>
          <p className="mt-2">Creating an account is optional and requires an email address. This feature is not directed at children, and we ask that anyone under the age of 13 not create an account or otherwise provide personal information without a parent or guardian's involvement. If you believe a child has created an account or given us personal information, please contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> so we can delete it.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Your Rights</h2>
          <p>Wherever you live, you can ask us what data we hold about you, ask us to correct it, or ask us to delete it, by emailing <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a>. We answer within 30 days and we do not charge for it.</p>
          <p className="mt-2"><strong>If you are in the European Economic Area, the United Kingdom or Switzerland,</strong> the law gives you those rights formally, together with the right to restrict or object to processing, the right to receive a copy of your data in a portable format, the right to withdraw consent at any time (for advertising cookies, use the Cookie choices link in the footer), and the right to complain to your local data protection authority. Our legal bases are your consent for advertising cookies, our contract with you for any account you create, and our legitimate interest in running and securing a free website for everything else.</p>
          <p className="mt-2"><strong>If you are a California resident,</strong> you have the right to know what personal information we collect and how it is used, to request its deletion, to correct inaccurate information, and not to be treated differently for exercising any of those rights. We do not sell personal information, and because we request only non-personalized ads, this site is not built to "share" personal information for cross-context behavioral advertising either. Choosing Essential only on the banner, or using the Cookie choices link in the footer, keeps Google's advertising code off entirely.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Security and Where Your Data Lives</h2>
          <p>Account data is stored by Supabase and protected by its security controls, and it travels between your browser and our servers over an encrypted connection. Passwords are hashed and never stored in plain text; we cannot read them. Our service providers may process data on servers in the United States and in other countries, and each of them publishes its own privacy commitments (see Section 4). No website can promise perfect security, so please use a password you do not use anywhere else.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Server Logs and Analytics</h2>
          <p>Like any website, our host receives standard technical data with every request: your IP address, browser type, the page you asked for and the time. It is used to deliver the pages and to keep the Site working, and it is kept for as long as our host keeps its ordinary server logs.</p>
          <p className="mt-2">On top of that we use Google Analytics 4, described in Section 4, and only after you have chosen Accept on the cookie banner. It tells us things like which games are played most and how long people stay, in aggregate. If you chose Essential only, it is never loaded.</p>
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

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. © 2026 DoUKnowBall</p>
        <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
