import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title="Privacy Policy - DoUKnowBall" description="Privacy policy for DoUKnowBall sports trivia games." path="/privacy" />
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: August 13, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>DoUKnowBall is completely free. There are no subscriptions, no paid features, and no in-app purchases, so we never collect or store payment information of any kind. You can also play every game without an account. If you choose to use certain features, here is what we collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Local storage data:</strong> Game progress, scores, streaks, and preferences are stored in your browser's local storage on your own device and are not sent to our servers unless described below.</li>
            <li><strong>Account data (optional):</strong> You can create an account with an email address and password, or sign in with Google. If you do, we store your email address, display name or username, avatar (if you set one), and your game scores and streaks so we can show them back to you and on leaderboards. You never need an account to play.</li>
            <li><strong>Anonymous gameplay data:</strong> Certain game modes submit gameplay data (e.g., number of clues used, final score, puzzle date) to our database. When you are not signed in, this data is not linked to your name or email.</li>
            <li><strong>Grid selection data:</strong> In grid-based games, player name selections are stored to calculate rarity scores. This is not linked to your identity unless you are signed in.</li>
            <li><strong>Reported issues:</strong> If you use the "Report" button on a game to flag a wrong or outdated answer, we store the report text you submit so we can review and fix it.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies &amp; Local Storage</h2>
          <p>This site uses browser local storage to save your game progress, best scores, preferences, and UI state, and to remember that you have responded to our cookie banner. Local storage data stays on your device and is not transmitted to our servers except as described in Section 1.</p>
          <p className="mt-2">We show a cookie banner the first time you visit, letting you know that we use cookies to improve your experience and show personalized ads. By continuing to use the Site after seeing that banner, you agree to our use of cookies as described here.</p>
          <p className="mt-2">Third-party services (such as Google AdSense) use cookies and similar technologies to serve ads, including personalized ads based on your browsing activity. These cookies are governed by the respective third party's privacy policy. You can manage or disable cookies through your browser settings, and you can opt out of personalized advertising using the link in Section 4.</p>
          <p className="mt-2">You can clear all locally stored data at any time by clearing your browser's site data for douknowball.com.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Data</h2>
          <p>We use the data described above to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Let you sign in, keep your scores and streaks, and show leaderboards and profiles</li>
            <li>Calculate rarity scores and community statistics for grid-based games</li>
            <li>Show ads, including personalized ads, to support the free games on this Site</li>
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
            <li><strong>Google AdSense:</strong> We display advertisements provided by Google AdSense, including personalized ads. Google may use cookies and web beacons to serve ads based on your prior visits to this or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li><strong>Lovable (hosting):</strong> The Site itself is built and hosted on Lovable's platform, which serves the pages and assets you load. Like any web host, its servers receive standard technical request data (such as your IP address and browser type) in order to deliver the Site.</li>
            <li><strong>Wikipedia REST API:</strong> Used in some game modes to fetch publicly available player photographs. No personal data is sent.</li>
            <li><strong>AI services (Google Gemini):</strong> Many of our games use an AI model to check answers and rate lineups. When you type an answer into a grid, board, or lineup game, the text you typed is sent through our backend to Google's Gemini model so it can be verified against the category, and in games like "Build Your XI" the AI generates a rating for your team. Only the game content itself (your typed answer, player names, team names, formation data) is sent. Your name, email, account details, and device identifiers are never included, we do not use your inputs to train any AI model, and the AI's output is only ever a validation result or rating shown back to you in the game.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention, Access &amp; Deletion</h2>
          <p>Local storage data is retained on your device until you clear it. If you have an account, we keep your account data, scores, and streaks until you ask us to delete them. There is currently no self-serve delete button, so deletion works by email: write to us at the address below and we will permanently delete your account and the data linked to it within 30 days. Gameplay data that is not linked to an account is kept only for aggregate statistics.</p>
          <p className="mt-2">You have the right to ask what data we have about you, correct it, or have it deleted. To do this, or for any privacy question, contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> and we will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Children's Privacy</h2>
          <p>DoUKnowBall's games are suitable for a general audience and may be played by minors. You can play every game on the Site without creating an account or providing any personal information.</p>
          <p className="mt-2">Creating an account is optional and requires an email address. This feature is not directed at children, and we ask that anyone under the age of 13 not create an account or otherwise provide personal information without a parent or guardian's involvement. If you believe a child has created an account or given us personal information, please contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> so we can delete it.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
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
