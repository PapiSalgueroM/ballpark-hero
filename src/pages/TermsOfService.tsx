import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: February 9, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using FootyFein ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>FootyFein is a free, browser-based entertainment platform that provides football-themed trivia and guessing games. The Site is provided "as is" and "as available" without any warranties of any kind.</p>
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
          <p>All original content, features, and functionality of FootyFein are owned by FootyFein and are protected by international copyright, trademark, and other intellectual property laws. All player names, club names, logos, and brand identifiers referenced on this Site are the property of their respective owners and are used solely for identification and informational purposes. FootyFein is not affiliated with, endorsed by, or sponsored by FIFA, EA Sports, any football club, league, or governing body.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Third-Party Advertisements</h2>
          <p>The Site may display advertisements provided by third-party ad networks. These advertisers may use cookies and similar technologies to serve ads based on your browsing activity. FootyFein is not responsible for the content, accuracy, or practices of any third-party advertisements. Your interactions with advertisers and any purchases made through their ads are solely between you and the advertiser. Please review the privacy policies of any third-party advertisers for more information about their practices.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Disclaimer of Warranties</h2>
          <p>The Site is provided on an "as is" and "as available" basis. FootyFein makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, completeness, or availability of the Site or its content. Player statistics and data presented in the games are approximations for entertainment purposes and may not reflect exact real-world figures.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, FootyFein and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of or inability to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless FootyFein and its operators from any claims, liabilities, damages, losses, or expenses arising from your use of the Site or your violation of these Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Age Requirement</h2>
          <p>The Site is intended for users of all ages. No account creation or personal information is required to use the Site.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Modifications to Terms</h2>
          <p>FootyFein reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Terms.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">11. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact</h2>
          <p>If you have any questions about these Terms of Service, please reach out through the platform where you found this application.</p>
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>© 2026 FootyFein. All rights reserved.</p>
        <p>All logos, club crests, player names, and brands are the property of their respective owners and are used for identification purposes only. This application is not affiliated with or endorsed by FIFA, EA Sports, or any football club or organization.</p>
        <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default TermsOfService;
