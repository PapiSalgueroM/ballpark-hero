import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title="Privacy Policy — DoUKnowBall" description="Privacy policy for DoUKnowBall sports trivia games." path="/privacy" />
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: March 8, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>DoUKnowBall collects limited, anonymous gameplay data to improve the experience. This includes:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Local storage data</strong> — Game progress, scores, streaks, and preferences are stored in your browser's local storage and never leave your device unless described below.</li>
            <li><strong>Anonymous gameplay data</strong> — Certain game modes submit anonymous scores and completion data (e.g., number of clues used, final score, puzzle date) to our backend database. This data contains no personal identifiers — no names, emails, IP addresses, or device fingerprints are stored.</li>
            <li><strong>Grid selection data</strong> — In grid-based games, player name selections are stored anonymously to calculate rarity scores.</li>
          </ul>
          <p className="mt-2">We do not require account creation, login, or any form of registration to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies &amp; Local Storage</h2>
          <p>This site uses browser local storage to save your game progress, preferences, and UI state. Local storage data is stored on your device and is not transmitted to our servers except as described in Section 1.</p>
          <p className="mt-2">Third-party services (such as Google AdSense) may use cookies and similar technologies to serve advertisements. These cookies are governed by the respective third party's privacy policy. You can manage or disable cookies through your browser settings.</p>
          <p className="mt-2">You can clear all locally stored data at any time by clearing your browser's site data for douknowball.com.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Data</h2>
          <p>Anonymous gameplay data is used to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Calculate rarity scores and community statistics for grid-based games</li>
            <li>Understand aggregate site usage patterns and game popularity</li>
            <li>Improve game content, difficulty balancing, and user experience</li>
          </ul>
          <p className="mt-2"><strong>We do not sell, rent, or share user data with any third party.</strong> We may use analytics tools to understand aggregate site usage, but no personally identifiable information is collected or transmitted.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Google AdSense</strong> — We display advertisements provided by Google AdSense. Google may use cookies and web beacons to serve ads based on your prior visits to this or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>.</li>
            <li><strong>Wikipedia REST API</strong> — Used in the "Guess the Face" game mode to fetch publicly available player photographs. No personal data is sent.</li>
            <li><strong>AI Evaluation Services</strong> — Used in game modes such as "Build Your XI," "Connect 4," and NBA games to generate lineup ratings and player suggestions. Only game-related data (team names, player names, formation data) is sent. No personal or identifying information is transmitted.</li>
            <li><strong>Backend Database</strong> — Anonymous gameplay scores and grid selections are stored in a hosted database. No personal identifiers are associated with this data.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention &amp; Deletion</h2>
          <p>Local storage data is retained on your device until you clear it. Anonymous gameplay data stored on our servers is retained indefinitely for aggregate statistics but contains no personal identifiers.</p>
          <p className="mt-2">If you wish to request deletion of any data associated with your usage, please contact us at <a href="mailto:footyfein1@gmail.com" className="underline hover:text-foreground transition-colors">footyfein1@gmail.com</a> and we will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Children's Privacy</h2>
          <p>Our games are suitable for all ages. We do not knowingly collect any personal information from anyone, including children under 13.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
          <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:footyfein1@gmail.com" className="underline hover:text-foreground transition-colors">footyfein1@gmail.com</a>.</p>
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
