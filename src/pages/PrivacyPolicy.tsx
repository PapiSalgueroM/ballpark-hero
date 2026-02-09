import { useNavigate } from 'react-router-dom';
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

      <p className="text-sm text-muted-foreground mb-6">Last updated: February 9, 2026</p>

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
          <p>We use the following third-party services solely to power game features:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Wikipedia REST API</strong> — Used in the "Guess the Face" game mode to fetch publicly available player photographs. No personal data is sent; only the player's Wikipedia page name is requested. Wikipedia's own <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">privacy policy</a> applies to their service.</li>
            <li><strong>AI Evaluation Service</strong> — Used in the "Build Your XI" game mode to generate lineup ratings. Only the team formation and player names you select are sent for evaluation. No personal or identifying information is transmitted.</li>
          </ul>
          <p className="mt-2">We do not integrate with any advertising networks, analytics platforms, or data brokers.</p>
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
        <p>All logos, club crests, player names, and brands are the property of their respective owners and are used for identification purposes only. This application is not affiliated with or endorsed by FIFA, EA Sports, or any football club or organization.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
