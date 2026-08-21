import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const Contact = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title="Contact DoUKnowBall"
        description="Get in touch with DoUKnowBall: report a bug, flag a wrong answer, pitch a game idea, or reach out about anything else."
        path="/contact"
      />
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the games
      </Link>
      <h1 className="text-3xl font-bold mb-8">Contact</h1>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Email us</h2>
          <p>
            The inbox for everything is{' '}
            <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">
              douknowball1@gmail.com
            </a>
            . Bug reports, wrong stats, game ideas, feedback, business inquiries, all of it. It is a small operation, so a real person reads every message.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Spotted a bug or a wrong answer?</h2>
          <p>
            The fastest route is the Report a bug button in the footer of any page. It sends your report straight to us with the exact page attached, so we can find the problem without any back and forth. For a wrong or missing player in a specific puzzle, many games also have a Report option right next to the answer.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Game ideas and feedback</h2>
          <p>
            Send them in. Some of the most played games on the site exist because a player asked for them. If a game feels too easy, too hard, or too shallow, we want to hear that too. You can see how fast feedback turns into updates on the{' '}
            <Link to="/whats-new" className="underline hover:text-foreground transition-colors">What's New</Link> page.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Privacy and data requests</h2>
          <p>
            For anything about your data, see the <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link> or email the address above and we will respond within 30 days.
          </p>
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. © 2026 DoUKnowBall</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
};

export default Contact;
