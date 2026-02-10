import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
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
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: February 10, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using FootyFein ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>FootyFein is a free, browser-based entertainment platform that provides sports-themed trivia and guessing games. Current game modes include:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Footle</strong> — Guess the footballer from stat-based clues in 8 tries</li>
            <li><strong>Career Quiz</strong> — Identify a player from their season-by-season career history</li>
            <li><strong>Higher or Lower</strong> — Compare all-time career statistics between players</li>
            <li><strong>Connections</strong> — Find groups of 4 players sharing a hidden link</li>
            <li><strong>Build Your XI</strong> — Create a lineup and receive an AI-generated rating</li>
            <li><strong>Guess the Face</strong> — Identify a blurred footballer as hints are revealed</li>
            <li><strong>Football Connect 4</strong> — Two-player trivia Connect 4 with football knowledge</li>
            <li><strong>NBA Guesser</strong> — Guess the NBA player from stat-based clues</li>
            <li><strong>NBA Build Your V</strong> — Create an NBA lineup and receive an AI rating</li>
            <li><strong>NBA Chain</strong> — Link NBA players who shared the same team</li>
            <li><strong>NBA Connect 4</strong> — Two-player trivia Connect 4 with NBA knowledge</li>
            <li><strong>UFC Guesser</strong> — Guess the UFC fighter from stat-based clues in 8 tries</li>
          </ul>
          <p className="mt-2">The Site is provided "as is" and "as available" without any warranties of any kind. The Site is supported by advertising provided by Google AdSense.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the Site for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to interfere with, compromise, or disrupt the Site's systems or infrastructure</li>
            <li>Scrape, crawl, or use automated tools to extract data from the Site without permission</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Site</li>
            <li>Use the Site in any manner that could damage, disable, or impair its functionality</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Intellectual Property</h2>
          <p>All original content, features, and functionality of FootyFein are owned by FootyFein and are protected by international copyright, trademark, and other intellectual property laws. All player names, fighter names, club names, logos, and brand identifiers referenced on this Site are the property of their respective owners and are used solely for identification and informational purposes. FootyFein is not affiliated with, endorsed by, or sponsored by FIFA, EA Sports, the UFC, any football club, MMA organization, league, or governing body.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Disclaimer of Warranties</h2>
          <p>The Site is provided on an "as is" and "as available" basis. FootyFein makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, completeness, or availability of the Site or its content. Player statistics and data presented in the games are approximations for entertainment purposes and may not reflect exact real-world figures.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, FootyFein and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of or inability to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless FootyFein and its operators from any claims, liabilities, damages, losses, or expenses arising from your use of the Site or your violation of these Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Age Requirement</h2>
          <p>The Site is intended for users of all ages. No account creation or personal information is required to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Modifications to Terms</h2>
          <p>FootyFein reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
          <p>If you have any questions about these Terms of Service, please contact us at <a href="mailto:footyfein1@gmail.com" className="underline hover:text-foreground transition-colors">footyfein1@gmail.com</a>.</p>
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>© 2026 FootyFein. All rights reserved.</p>
        <p>All logos, club crests, player names, fighter names, and brands are the property of their respective owners and are used for identification purposes only. This application is not affiliated with or endorsed by FIFA, EA Sports, the UFC, the NBA, or any football club, MMA organization, basketball team, or sports governing body.</p>
        <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default TermsOfService;
