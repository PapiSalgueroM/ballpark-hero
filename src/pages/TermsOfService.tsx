import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title="Terms of Service — DoUKnowBall" description="Terms of service for DoUKnowBall sports trivia games." path="/terms" />
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: March 8, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using DoUKnowBall ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>DoUKnowBall is a free, independent fan site and browser-based entertainment platform that provides sports-themed trivia and guessing games. The Site is operated for entertainment purposes only and is not an official product of any sports league, players' association, or governing body.</p>
          <p className="mt-2">Current game categories include pro football (NFL), college football, pro basketball (NBA), college basketball, baseball (MLB), hockey (NHL), soccer (including World Cup and Champions League), Formula 1, tennis, golf, NASCAR, combat sports (UFC), and multi-sport trivia covering the Olympics and international competitions. The Site is provided "as is" and "as available" without any warranties of any kind.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Sports Data &amp; Player Information</h2>
          <p>All sports statistics, player names, team names, and career information presented on this Site are factual public information sourced from publicly available databases and records. This data is used for entertainment and educational purposes in the context of trivia games.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Intellectual Property &amp; Trademarks</h2>
          <p>All original content, game designs, features, and functionality of DoUKnowBall are owned by DoUKnowBall and are protected by international copyright and intellectual property laws.</p>
          <p className="mt-2">All team names, player names, league names, logos, and trademarks referenced on this Site are the property of their respective owners and are used solely for identification and informational purposes.</p>
          <p className="mt-2"><strong>DoUKnowBall is not affiliated with, endorsed by, or sponsored by the NFL, NFLPA, NBA, NBPA, UFC, NHL, NHLPA, MLB, MLBPA, FIFA, IOC, NCAA, FIA (Formula 1), PGA Tour, NASCAR, ATP, WTA, or any team, club, or sports governing body.</strong></p>
          <p className="mt-2">The Olympic name, Olympic rings, and related marks are trademarks of the International Olympic Committee (IOC). DoUKnowBall makes no claim to these marks and does not use any official Olympic branding.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the Site for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to interfere with, compromise, or disrupt the Site's systems or infrastructure</li>
            <li>Copy, scrape, crawl, or use automated tools to extract or redistribute game content, data, or any part of the Site without prior written permission</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Site</li>
            <li>Redistribute, republish, or commercially exploit any game content or data from the Site</li>
            <li>Use the Site in any manner that could damage, disable, or impair its functionality</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Content Updates</h2>
          <p>DoUKnowBall reserves the right to add, modify, or remove games, game content, player data, and features at any time without prior notice. Daily challenges, puzzles, and game data may change at our sole discretion.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Disclaimer of Warranties</h2>
          <p>The Site is provided on an "as is" and "as available" basis. DoUKnowBall makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, completeness, or availability of the Site or its content. Player statistics and data presented in the games are approximations for entertainment purposes and may not reflect exact real-world figures.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, DoUKnowBall and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of or inability to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless DoUKnowBall and its operators from any claims, liabilities, damages, losses, or expenses arising from your use of the Site or your violation of these Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Age Requirement</h2>
          <p>The Site is intended for users of all ages. No account creation or personal information is required to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Modifications to Terms</h2>
          <p>DoUKnowBall reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">12. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the applicable courts.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">13. Contact</h2>
          <p>If you have any questions about these Terms of Service or need to reach us for legal inquiries, please contact us at <a href="mailto:footyfein1@gmail.com" className="underline hover:text-foreground transition-colors">footyfein1@gmail.com</a>.</p>
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. © 2026 DoUKnowBall</p>
        <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default TermsOfService;
