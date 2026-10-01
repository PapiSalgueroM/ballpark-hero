import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import { RulesGate } from '@/components/game/RulesGate';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import DeadlineDayBoard from '@/components/deadline-day/DeadlineDayBoard';
import { BUDGET_POINTS, DEADLINE_HOURS, NEEDS_POINTS, VALUE_CEIL, VALUE_POINTS, clockLabel } from '@/lib/deadlineDay';

const DeadlineDay = () => {
  return (
    <>
      <PageSeo
        title="Deadline Day - Beat The Transfer Window Clock | DoUKnowBall"
        description="You run recruitment at a real club on the last day of the window. Three or four gaps, one budget and twelve hours before it shuts. Free football transfer game."
        path="/deadline-day"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="relative text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Deadline Day</h1>
            <p className="text-xs text-muted-foreground mt-1">Twelve hours. One budget. The window shuts at {clockLabel(DEADLINE_HOURS)}.</p>
            <RulesGate title="How to Play Deadline Day">
              <div className="space-y-3 text-sm">
                <p>You run recruitment at a real club on the last day of the summer window. The board have picked out three or four places in the side that need an upgrade and left you a budget to do it. Every man on your list is a real player at his real club.</p>
                <p className="font-semibold text-foreground">The rules:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The day starts at {clockLabel(0)} and the window shuts at {clockLabel(DEADLINE_HOURS)}: {DEADLINE_HOURS} hours.</li>
                  <li>Calling a club to open talks is free. Every bid, every offer of personal terms and every sale of one of your own players takes an hour.</li>
                  <li>Bid 97 percent of their ask or more and the fee is agreed. Below that they come back with a lower ask and it costs a round of their patience. Under 75 percent is an insult (two rounds, and the ask goes up), and under 55 percent they end the talks. The meter shows where your number sits before you send it.</li>
                  <li>Once the fee is agreed, his agent wants a wage, a contract length and a signing bonus. The bonus comes out of the same budget, and the board will not go over the wage or the length he asks for, so the bonus has to be paid.</li>
                  <li>Other clubs move for the same players. Leave a man alone for an hour while a rival is in and they can sign him from under you.</li>
                  <li>Anything not signed when the window shuts collapses. Nothing carries over.</li>
                  <li>The grade is out of 100: {NEEDS_POINTS} for needs filled, {VALUE_POINTS} for value for money (full marks at or under what he is really worth, nothing at {VALUE_CEIL} times it) and {BUDGET_POINTS} for money left once the job is done.</li>
                  <li>The daily is the same club, the same list and the same budget for everyone. Free play is any club you like.</li>
                </ul>
                <p className="font-semibold text-foreground">A quick example:</p>
                <p>Say the board want a goalkeeper, a central midfielder, a right winger and a striker and leave you £29m. You call about a keeper listed at £3.3m and his club want £3.6m. Your desk says he is worth £2.4m to £3.2m, so you bid £3.1m. They come down to £3.4m, and that cost a round of their patience. You bid £3.3m, which is within 97 percent of their ask, and the fee is agreed. His agent wants 4 years at 10k a week and a £1.8m signing bonus. You offer exactly that and he signs. That is three hours gone and £23.9m left, with nine hours to find the other three.</p>
              </div>
            </RulesGate>
          </div>
          <DeadlineDayBoard />
          <GameSeoContent
            pageHasOwnH1
            title="Deadline Day: Beat the Transfer Window Clock"
            description="Deadline Day is a free football transfer game on the Club Manager engine. Run recruitment at a real club on the last day of the window, haggle with selling clubs, agree personal terms with agents and fill the board's needs before the window shuts."
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default DeadlineDay;
