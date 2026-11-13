import { lazy, Suspense, type ReactNode } from 'react';
import AdBanner from '@/components/ads/AdBanner';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';

const ClubManagerHelp = lazy(() => import('@/components/club-manager/ClubManagerHelp'));

/** Keep the guide below the fold while the stacked phone slots load. */
export function ClubManagerStartup({ className, children }: { className: string; children: ReactNode }) {
  return <div role="status" data-cm-startup className={`max-sm:min-h-svh text-center text-muted-foreground ${className}`}>{children}</div>;
}

export function ClubManagerFrame({ catalogue, children }: { catalogue: ReactNode; children: ReactNode }) {
  return (
    <>
      <PageSeo
        title="Club Manager: Football Tactics and Transfers | DoUKnowBall"
        description="Take over a real club in a current or historical season. Set tactics, negotiate transfers and meet the board’s targets in a free football management sim."
        path="/club-manager"
      />
      <GameShell
        help="none"
        width="wide"
        showReportQuestion
        reportGameType="club-manager"
      >
        <div className="relative">
          {/* Round 1328: the "?" is 44 by 44 now, pulled 8px further into the
              corner so it covers no more of the screen than the old 36px one. */}
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right" className="-mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
            <Suspense fallback={<div role="status" className="min-h-48 py-12 text-center text-sm text-muted-foreground">Loading screen...</div>}>
              <ClubManagerHelp />
            </Suspense>
          </HowToPlayPopover>
          {children}
        </div>
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1
          title="Club Manager: Football Management Sim"
          description="A full club-management sim in your browser: the existing 27 real leagues cover 454 clubs, from the Premier League, the 2. Bundesliga, Serie B, Ligue 2, the Segunda División and the Scottish Premiership to the Saudi Pro League, MLS, Brazil, Mexico, Australia, Russia, Croatia, Denmark, Switzerland, Austria and Greece, with real players at their real market values as of August 2026 (October for the A-League Men and the Russian Premier League) and thin squads topped up with made up youth, marked as such. K League 1 adds 12 member clubs and 11 available ordinary jobs, with generated opening squads and simplified competition rules. Start a new current career to use it; existing saved worlds keep their previous leagues. Manage today or in a real past season: 2020-21 with Haaland's Dortmund and Mbappé's PSG, 2015-16 with Leicester at 5000 to 1, 2010-11 with prime Messi, or 2005-06 with Ronaldinho's Barcelona. Or create your own club with its own crest and stadium. Negotiate transfers, survive bidding wars, hit the board's named objectives, and chase titles season after season."
          howToPlay={[
            'Pick your era: 2026-27 with the roster coverage stated for each league, or a real past season: 2020-21, 2015-16, 2010-11 or 2005-06, each with the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1.',
            'Pick your nation, league and an available club, or create your own club with its own crest, stadium and budget.',
            'Read the board\'s objectives: league finish, cup run, Europe where it applies, beating your rival, and a goals quota.',
            'Go and meet the two asks the board makes in the market: a country quota, an experience count, the thinnest line in your squad, a signing 21 or under at a rating floor, or one fee over a threshold, every number worked out from your club and your era.',
            'Set your formation, mentality and XI, then play through the full season week by week.',
            'Work the market: negotiate fees, pay release clauses, take loans, and field bids for your own stars, with deep filters down to exact position, age, an exact maximum asking price or preset price bands, league and nationality, every player under his real flag.',
            'Run the contracts desk: re-sign expiring players at full wage, or cheaper with a release clause any club can trigger, and delete a bargain clause with a full price renewal before the phone rings.',
            'Let a player go early if you have to: you keep paying half his wage until his deal would have ended, up to two seasons, it counts against your wage ceiling, the whole dressing room takes a morale hit, and a man you release never signs for you again.',
            'Sign free agents from the Free agents option on the Market tab or the contracts desk on Squad any time, even with the window shut: made up journeymen without a club, marked MADE UP, players whose deals ran out with you (a verified saved contract lets him return straight away on at least the wage and signing fee a renewal would ask), and, on day one of a new career in today\'s world, a few real players with no club. Only men a level below your club will sign, and a man who never played for you also has to be no better than your eleventh best player. No transfer fee: the wage, contract length and signing on fee are on the button.',
            'Run the money: gate receipts from every home crowd, ticket and food prices the fans and the board react to, a shirt sponsor from three honest shapes or one bad brand that pays more and costs the fans, each one negotiable, and a projection of the season\'s books to the last day.',
            'Build the club: stadium, training ground, medical and dressing room, each level 1 to 10, paid from the kitty, each one a small real lift on the squad.',
            'Run the staff room: an attack coach, a defence coach, a goalkeeping coach and a lead scout, hired, promoted from your academy or paid off, each one growing his own part of the squad, with rivals coming in for the good ones and a limited number of offers you can match.',
            'Win enough and manage your country as well: real tournaments between seasons, real qualifying groups, and a place in the cabinet if you lift one.',
            'Handle the press when they come for you, and pick your team talk before kick off and again at half time.',
            'Win trophies, keep the board happy, and build a managerial career that can cross leagues and continents.',
            'Run up to three managers on one device, each with a career of his own in its own slot: tap Managers on the hub to switch between them or start another.',
          ]}
        >
          {/* Round 655: every league and club as readable text, below the guide. */}
          {catalogue}
        </GameSeoContent>
        <GameNav />
      </GameShell>
    </>
  );
}
