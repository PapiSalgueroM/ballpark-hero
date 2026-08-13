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
            <li><strong className="text-foreground">Club Manager just got its biggest upgrade ever.</strong> Every single club in the Premier League, La Liga, Serie A, Bundesliga and Ligue 1 is now playable, 96 clubs total, each with its real 2026 squad, ages and market values (yes, Lewandowski is at Barca). Pick your nation, then your league, then your team, and confirm without ever scrolling. The board hands you a proper objective list like a real manager game: league finish, a cup run, Europe, finishing above your rival, a goals quota, all graded live and at season end. The transfer market now carries nearly 2,000 real players at their actual market values instead of inflated made-up fees, opposition goals come from real scorers, and the cup finally tells you which cup it is.</li>
            <li>Every multi step game now follows one rule: after you tap something, the next step appears in view on its own. Fourteen games got the treatment, from Soccer Career's ceremonies to the Banker's offer in Squad Deal to the week results in the Dynasty sims. No more tapping a button and staring at nothing while the result renders below the fold.</li>
            <li>Player Stock Market got a second way to play: <strong className="text-foreground">Names only</strong>. The classic game hides the names and gives you the numbers. The new unlimited style does the exact opposite, you see exactly who everyone is and none of the values, so you are buying purely on reputation. Find out whether you actually know ball or just know prices.</li>
            <li><strong className="text-foreground">College Grid went from 15 puzzles to 75.</strong> It used to repeat every fifteen days, so if you play daily you had seen every board four times over. Now it runs eleven weeks without repeating, with 26 new programs, the Pac-12, five new awards (Thorpe, Doak Walker, Outland, Butkus, Conference Player of the Year) and new angles like Pro Bowler, Super Bowl winner, Played Two Sports and Transferred Schools.</li>
            <li><strong className="text-foreground">One College Grid board was impossible to win.</strong> An old puzzle paired Oregon with National Champion, and Oregon has never won a national title, so that square could never be filled. Once every fifteen days the daily was unwinnable through no fault of yours. Fixed, and every one of the 75 boards is now checked so all nine squares have real answers.</li>
            <li><strong className="text-foreground">All five career games are now done.</strong> NHL My Career got the last mega round, about 200 additions: five positions (C, LW, RW, D, G) with 17 archetypes, 90 new offseason crossroads, 49 things to buy, and your face on the create screen. Wingers split into left and right, the blue line got a puck mover, and goalies got a workhorse who starts 65 games.</li>
            <li>NHL My Career has a dirty side too: an envelope on the bench with a bounty in it, a twelve year contract whose tail years everyone knows you will never play, a doctor in Europe with a suitcase, a man who pays to know the starting goalie an hour early, and a junior agent holding paper you signed at sixteen. Six new awards as well, so a shutdown defenseman finally has something to chase: Rocket Richard, Art Ross, Selke, Jennings, Masterton and Comeback Player.</li>
            <li>MLB My Career got the mega treatment, about 200 additions. <strong className="text-foreground">Eleven real positions</strong> (SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH) with 33 archetypes, and relievers finally have their own line with saves and holds instead of pretending to be starters. Catchers, shortstops and designated hitters all hit differently now, and each position falls off at the age it actually falls off.</li>
            <li>MLB My Career has a dirty side built from the sport's own history: a camera in center field and a trash can behind the dugout, something on the glove worth 300 rpm, a clinic in Florida that beats the testing panel, tipping pitches to a man who likes first innings, and an academy that takes a third of a teenager's signing bonus. The commissioner's office tracks all of it.</li>
            <li>Eight new MLB awards too. The game only had Rookie of the Year, All-Star, MVP and Cy Young, so a glove first shortstop or a lights out closer could play fifteen years and win nothing. Added Gold Glove, Silver Slugger, batting title, home run crown, ERA title, saves leader and Comeback Player.</li>
            <li>NBA My Career got the mega treatment too, about 200 additions. <strong className="text-foreground">Five real positions</strong> instead of three buckets (PG, SG, SF, PF, C) with 15 archetypes, so a Point God and a Paint Beast live completely different careers. Build your face before the draft, 90 new offseason crossroads, and 43 new things to buy across seven aisles.</li>
            <li>NBA My Career has a dirty side as well: take the under on your own rebound totals, fake a load management injury for a bettor, coast through March for lottery odds, or take the agent advance nobody is supposed to mention. The league tracks it all, and an indefinite suspension costs you a full season.</li>
            <li>Scoring got a realism fix in NBA My Career. A 78 rated guard was averaging 27 points a night and an 88 was averaging 37, which is a top ten season in league history. Now a solid starter lands around 17, an All Star around 25, and only an all time scorer having a career year gets near 38.</li>
            <li>NFL My Career got the same treatment Soccer Career just got, about 250 additions. <strong className="text-foreground">Five new positions</strong> (tight end, linebacker, corner, edge rusher and kicker) each with their own real stat lines, their own awards and their own aging curve, so a shutdown corner and a franchise quarterback are completely different careers. You build your player's face before the draft, there are 90 new offseason crossroads, and 43 new things to buy across seven aisles.</li>
            <li>NFL My Career has a dirty side too. Sell the real injury report to an offshore book, put money in the bounty envelope, take the program the league cannot test for yet, or let your agent skim your signing bonus. League security tracks all of it on a hidden meter, and at the top of it is an indefinite suspension: you lose the season, the money gets seized, and one rebuilding team calls with the minimum.</li>
            <li>Also in NFL My Career: progression is much slower now (1 to 2 rating points a year instead of 2 to 4), and interception numbers got fixed. A 95 rated quarterback used to throw 12 picks a year, which no elite passer does. Elite seasons now land around 8, average starters 13, bad starters 17.</li>
            <li>Soccer Career got the biggest update in the site's history: over 400 additions in one go. You now <strong className="text-foreground">build your player's actual face</strong> before kickoff (skin tone, hairstyle and colour, beard, boots, accessory, and a signature celebration that gets described every time you score), and that face follows you onto the Ballon d'Or stage and into your retirement. The club that raised you now always offers you a first team deal, so you can finally spend a whole career at your boyhood club, and they can call you home again later.</li>
            <li>Soccer Career also got a dirty side. Betting syndicates, bent officials, transfer kickbacks, offshore accounts, a nightclub that launders money, even buying Ballon d'Or votes. Every dirty choice heats up a hidden investigation meter, and if you stay hot too long: dawn raid, trial, prison, and a comeback from three divisions down. There is always a way out if you want one.</li>
            <li>More of everything in Soccer Career: 95 new clubs across 5 continents, 66 new flags, 47 new things to buy in three new shop aisles (Flex, Family, and a Shady aisle that only appears once you have something to hide), 109 new life events, 20 new newspaper stories, and 6 new animations including confetti on trophy nights. Progression is much slower now too, so hitting world class is a decade of work instead of three good seasons.</li>
            <li><strong className="text-foreground">Two Soccer Career bugs killed.</strong> Winning the World Cup used to break the game completely: the celebration buttons crashed and there was no way to continue, so your best moment was a dead end. It now has a proper winner's speech with four real choices. And the Ballon d'Or can no longer snub you: goals were capped so low in the voting formula that a 45 goal season could not even get nominated. Post the best season in the world and the trophy is yours.</li>
            <li>The whole site got dramatically faster. Everything used to arrive as one giant script before the first game could load; now each game ships as its own small piece, so first loads are about 85 percent lighter and pages you have visited open instantly. Lost visitors also get a proper 404 page now, one that points you at the good games instead of a dead end.</li>
            <li>A big correctness sweep on the dailies. Eight games that quietly flipped their puzzle at the wrong midnight (UTC or your local clock) now all roll over at midnight Eastern like the rest of the site, and NFL Career Path's daily finally locks when you finish it instead of handing you a fresh run on refresh.</li>
            <li>Honest scoreboards everywhere: the NBA, MLB and NHL grids no longer refund your wrong guesses when you reload mid-daily, Baseball Career's final clue pays the 100 points it always advertised, the last hint in Missing Five and Missing Nine actually unlocks on your final guess, The Medal Games' seventh clue now reveals the athlete's initials instead of charging you for nothing, Baseball Connections stopped claiming 4/4 groups on a loss, Mystery Box shows a real error screen when packs fail to load, and Sports Millionaire's Ballon d'Or questions now work for everyone.</li>
            <li>Rebuild Challenge went full Box2Box. Budgets now scale with the club (65M at modest clubs up to 200M at giants), you flip one of ten fortune cards after hiring your coach, you commit your sales BEFORE the market opens, and the board deals a third demand tied to the club's identity. Superclubs want a galactico. Small clubs want the books balanced. Miss one and they sell your best player.</li>
            <li>Conquest's Daily Challenge is now the real deal, in all four sports. Every player gets the same date-seeded season (same map, same fixtures, same results), so scores are finally comparable. One scored run per day, streaks if you keep showing up, and a share line built for the group chat. Free Play stays unlimited.</li>
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
