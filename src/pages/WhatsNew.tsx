import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const WhatsNew = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title="What's New | DoUKnowBall Updates"
        description="The running log of everything new on DoUKnowBall: fresh games, features, fixes, and content drops, newest first."
        path="/whats-new"
      />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the games
      </Link>
      <h1 className="text-3xl font-bold mb-2">What's New</h1>
      <p className="text-sm text-muted-foreground mb-8">
        The running log of what changed around here, newest first. We ship a lot. If something looks off after an update, hit the Report a bug button in the footer and we will get on it.
      </p>

      <section className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">August 2026</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Soccer Career got a life. Pick a personality (Showman, Ice Cold, Hothead, Professor, or Enigma), sign an agent (or let your cousin handle it, good luck), and live through 40+ new off-pitch storylines: cursed boots, lookalike scams, pet pigeons, podcast feuds and more, all with real consequences for your career. Smoother animations on the big moments too.</li>
            <li>Real guides on every game page. Every single game now has a proper writeup at the bottom of its page: how to play, the rules that matter, an example run, strategy tips, and an FAQ. No more guessing what a game is about before you click in.</li>
            <li>New <Link to="/about" className="underline hover:text-foreground transition-colors">About</Link>, <Link to="/contact" className="underline hover:text-foreground transition-colors">Contact</Link>, and What's New pages (you are reading one right now).</li>
            <li>A Report a bug button in the footer of every page. Reports land straight in our inbox with the page attached, so fixes happen fast.</li>
            <li>Sign in got a full overhaul: instant signup with no email confirmation wait, Google sign in, and a working Forgot Password flow. Your profile now shows Games Today and Days in a Row.</li>
            <li>The biggest content drop yet: My Career modes for NFL, NBA, MLB, and NHL where you live a whole player career, Front Office GM sims for all four leagues with real rosters and cap rules, Conquest imperialism maps for NHL and MLB, CFB Dynasty and CBB Dynasty college sims, a deeper Soccer Career with new story arcs, Club Manager with real leagues, and Budget Builder v2.</li>
            <li>Quality of life: poll results show your vote instantly, the home page remembers your scroll spot when you come back from a game, and hundreds of small copy cleanups across the whole site.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">July 2026</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>A big honesty pass on answer checking. The grid and board game validators got much stricter, so nonsense answers stopped sneaking through as correct.</li>
            <li>Retired a batch of games that were not fun enough and fixed old favorites instead. Rarity Round came back with its scoring bug squashed and the board reveal it always deserved.</li>
            <li>Verified lineup data across the Missing XI family and loaded big new puzzle batches into the grids and Connections games.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Spring 2026</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>DoUKnowBall launched with the first wave of daily soccer games. It has grown to eleven sports and over 100 games since, and it is still growing.</li>
          </ul>
        </div>

        <div>
          <p>
            Want something added or changed? <Link to="/contact" className="underline hover:text-foreground transition-colors">Tell us</Link>. A lot of what you see above started as a player suggestion.
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

export default WhatsNew;
