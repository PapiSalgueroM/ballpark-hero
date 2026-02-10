import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: February 10, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>We do not collect any personal information. All game data (scores, streaks, progress) is stored locally on your device using browser storage and is never transmitted to any server. We do not require account creation, login, or any form of registration.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies &amp; Local Storage</h2>
          <p>This site uses browser local storage to save your game progress, preferences, and UI state. Local storage data never leaves your device and is not shared with any third party. This site does not use tracking cookies or any tracking technologies. You can clear all stored data at any time by clearing your browser's site data.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Google AdSense</strong> — We display advertisements provided by Google AdSense. Google may use cookies and web beacons to serve ads based on your prior visits to this or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's Ads Settings</a>. For more information, see <a href="https://policies.google.com/technologies/ads" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Google's advertising policies</a>.</li>
            <li><strong>Wikipedia REST API</strong> — Used in the "Guess the Face" game mode to fetch publicly available player photographs. No personal data is sent; only the player's Wikipedia page name is requested. Wikipedia's own <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">privacy policy</a> applies to their service.</li>
            <li><strong>AI Evaluation &amp; Suggestion Services</strong> — Used in game modes such as "Build Your XI," "Football Connect 4," and NBA games to generate lineup ratings and player name suggestions. Only game-related data (team names, player names, formation data) is sent. No personal or identifying information is transmitted.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage</h2>
          <p>All gameplay data is stored exclusively in your browser's local storage. Clearing your browser data will remove all saved progress. We have no access to this data.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Children's Privacy</h2>
          <p>Our games are suitable for all ages. We do not knowingly collect any personal information from anyone, including children under 13.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Contact</h2>
          <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:footyfein1@gmail.com" className="underline hover:text-foreground transition-colors">footyfein1@gmail.com</a>.</p>
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>© 2026 FootyFein. All rights reserved.</p>
        <p>All logos, club crests, player names, fighter names, and brands are the property of their respective owners and are used for identification purposes only. This application is not affiliated with or endorsed by FIFA, EA Sports, the UFC, the NBA, or any football club, MMA organization, basketball team, or sports governing body.</p>
        <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
