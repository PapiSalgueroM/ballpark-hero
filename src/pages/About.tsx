import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const About = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title="About DoUKnowBall | Free Daily Sports Trivia Games"
        description="The story behind DoUKnowBall: over 100 free sports trivia games, daily puzzles, and deep career sims built by one sports fan who wanted trivia that actually goes deep."
        path="/about"
      />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the games
      </Link>
      <h1 className="text-3xl font-bold mb-8">About DoUKnowBall</h1>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What this site is</h2>
          <p>
            DoUKnowBall is a free sports trivia playground. Over 100 games covering soccer, pro football, basketball, baseball, hockey, college sports, Formula 1, tennis, golf, NASCAR, and combat sports. Some are quick daily puzzles you can knock out on the bus. Others are full career and manager sims you can sink a whole evening into. Everything runs right in your browser, no download and no signup required.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">How it started</h2>
          <p>
            DoUKnowBall started in early 2026 as a handful of soccer guessing games built by one fan who was tired of trivia sites that ask you a single question and call it a day. Players kept showing up, so the games kept coming. A few months later the site covers eleven sports, with fresh puzzles dropping every single day and new games shipping constantly.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What we care about</h2>
          <p>
            Getting the data right comes first. Real rosters, real stats, verified lineups. When a grid says a player suited up for two clubs, he actually did. If something looks wrong anyway, every page has a Report a bug button in the footer that lands straight in our inbox with the page attached, and we fix it.
          </p>
          <p className="mt-2">
            Second, games have to be worth coming back to. That is why the dailies have streaks and share cards, the grids score you on how rare your answers are, and the sims have real depth: contracts, trades, injuries, playoff runs, whole careers. No two-second gimmicks.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">The games</h2>
          <p>
            A quick tour: daily puzzles like the grids, Connections, Higher or Lower, and the guess-the-player games. Deep sims like <Link to="/soccer-career" className="underline hover:text-foreground transition-colors">Soccer Career</Link>, My Career modes for the four big American leagues, Front Office GM sims, CFB and CBB Dynasty, and Club Manager. Game-show formats like Sports Millionaire and Minefield. And the <Link to="/conquest" className="underline hover:text-foreground transition-colors">Conquest</Link> imperialism maps, where one team ends up ruling the whole country. If you know ball, something here will humble you.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Say hi</h2>
          <p>
            Got a game idea, spotted a wrong stat, or just want to talk ball? Head to the <Link to="/contact" className="underline hover:text-foreground transition-colors">contact page</Link>. Curious what shipped lately? Check <Link to="/whats-new" className="underline hover:text-foreground transition-colors">What's New</Link>. A lot of what is on the site started as a player suggestion.
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

export default About;
