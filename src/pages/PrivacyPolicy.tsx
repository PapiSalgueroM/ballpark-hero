const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: February 9, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>We do not collect any personal information. All game data (scores, streaks, progress) is stored locally on your device using browser storage and is never transmitted to any server.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies</h2>
          <p>This site does not use cookies or any tracking technologies.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Third-Party Services</h2>
          <p>We do not integrate with any third-party analytics, advertising, or data collection services.</p>
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
          <p>If you have any questions about this privacy policy, please reach out through the platform where you found this application.</p>
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
