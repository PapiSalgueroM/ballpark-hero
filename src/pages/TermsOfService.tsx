import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { OAUTH_PROVIDERS } from '@/lib/authProviders';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title="Terms of Service - DoUKnowBall" description="Terms of service for DoUKnowBall sports trivia games." path="/terms" />
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: October 21, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using DoUKnowBall ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site. The Site is owned and operated by an individual doing business as DoUKnowBall ("we", "us", "the operator").</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>DoUKnowBall is a free, independent fan site and browser-based entertainment platform that provides sports-themed trivia and guessing games. The Site is operated for entertainment purposes only and is not an official product of any sports league, players' association, or governing body.</p>
          <p className="mt-2">Current game categories include pro football (NFL), college football, pro basketball (NBA), college basketball, baseball (MLB), hockey (NHL), soccer (including World Cup and Champions League), Formula 1, tennis, golf, NASCAR, combat sports (UFC), and multi-sport trivia covering the Olympics and international competitions. The Site is provided "as is" and "as available" without any warranties of any kind.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Sports Data &amp; Player Information</h2>
          <p>Real player names, team names, historical results, statistics, and trivia answers on the Site come from public records and sports sources. We work to verify this factual material before publishing it and correct errors when we confirm them.</p>
          <p className="mt-2">AI tools assist with development, debugging and drafting some text. Some games also use AI for answer checks, player suggestions, lineup ratings or analysis, and fictional season stories. The operator remains responsible for the Site. AI outputs can be inaccurate; a generated answer, rating or explanation is not proof of a real sporting fact. See our <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link> for information about game inputs sent to AI services.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Accounts</h2>
          <p>You do not need an account to play any game on the Site. If you choose to create one, you can sign up with an email address and password{OAUTH_PROVIDERS.google ? ' or sign in with Google' : ''}. You are responsible for keeping your login details secure and for all activity under your account.</p>
          <p className="mt-2">You agree to provide accurate information when creating an account and not to create an account using someone else's identity or a name that is offensive or impersonates another person or brand. We may suspend or remove an account that violates these Terms.</p>
          <p className="mt-2">See our <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link> for details on what account data we collect and how to request its deletion.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Advertising</h2>
          <p>Advertising can help cover hosting costs and keep the Site free. The Site is set up to request Google AdSense ads in non-personalized mode. Google's advertising script loads only when you turn on Advertising in Cookie choices. Analytics is a separate purpose but is currently paused. Advertising stays off if your browser sends a Global Privacy Control signal. You can leave optional purposes off and still play. See our <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link> for the full advertising disclosure and how to change your choices.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Intellectual Property &amp; Trademarks</h2>
          <p>The operator claims rights in DoUKnowBall's original contributions only to the extent those rights exist under applicable law. Third-party content, software and other materials remain subject to their owners' rights and applicable licenses. AI assistance does not itself establish copyright ownership or permission to use someone else's material.</p>
          <p className="mt-2">Third-party trademarks and other protected material remain subject to their owners' rights. Player names, team and league names, and factual records are referenced for identification and commentary. These references do not imply endorsement or transfer any rights to us or to you.</p>
          <p className="mt-2"><strong>DoUKnowBall is not affiliated with, endorsed by, or sponsored by the NFL, NFLPA, NBA, NBPA, UFC, NHL, NHLPA, MLB, MLBPA, FIFA, IOC, NCAA, FIA (Formula 1), PGA Tour, NASCAR, ATP, WTA, or any team, club, or sports governing body.</strong></p>
          <p className="mt-2">The Olympic name, Olympic rings, and related marks are trademarks of the International Olympic Committee (IOC). DoUKnowBall makes no claim to these marks and does not use any official Olympic branding.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. User Conduct</h2>
          <p>Except where applicable law or an applicable license permits otherwise, you agree not to:</p>
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
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Content Updates</h2>
          <p>DoUKnowBall reserves the right to add, modify, or remove games, game content, player data, and features at any time without prior notice. Daily challenges, puzzles, and game data may change at our sole discretion.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Disclaimer of Warranties</h2>
          <p>The Site is provided on an "as is" and "as available" basis. DoUKnowBall makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, completeness, or availability of the Site or its content. We work to keep real trivia and historical data accurate, but errors can happen. Fictional simulation outputs such as ratings, future seasons, finances, and generated results are entertainment estimates, not records of real events.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, DoUKnowBall and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of or inability to use the Site.</p>
          <p className="mt-2">Nothing in these Terms excludes or limits a right, remedy or liability that cannot lawfully be excluded or limited, including mandatory consumer and data protection rights.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless DoUKnowBall and its operators from any claims, liabilities, damages, losses, or expenses arising from your use of the Site or your violation of these Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">12. Age Requirement</h2>
          <p>The Site is intended for a general audience. You must be at least 13 to create an account. If you are under 13, do not create an account or submit personal information through the Site. Minors should use the Site with a parent or guardian's guidance and only where permitted by applicable law. Games can be played without an account, but hosting and other services still receive the technical data described in our <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">13. Modifications to Terms</h2>
          <p>DoUKnowBall reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">14. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Massachusetts and applicable United States federal law, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in Massachusetts, and you consent to the personal jurisdiction of those courts.</p>
          <p className="mt-2">This choice of law and courts does not remove mandatory protections or a right to bring a claim in another court that applicable law gives you.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">15. Contact</h2>
          <p>If you have any questions about these Terms of Service or need to reach us for legal inquiries, please contact us at <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a>.</p>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
