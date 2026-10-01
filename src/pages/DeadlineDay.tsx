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
                  <li>A bid has to get close to their ask. The meter tells you how close, and every bid uses up some of their patience. Run it out and they stop talking.</li>
                  <li>Once the fee is agreed, his agent wants a wage, a contract length and a signing bonus. The bonus comes out of the same budget.</li>
                  <li>Other clubs move for the same players. Leave a man alone for an hour while a rival is in and they can sign him from under you.</li>
                  <li>Anything not signed when the window shuts collapses. Nothing carries over.</li>
                  <li>The grade is out of 100: {NEEDS_POINTS} for needs filled, {VALUE_POINTS} for value for money (full marks at or under what he is really worth, nothing at {VALUE_CEIL} times it) and {BUDGET_POINTS} for money left once the job is done.</li>
                  <li>The daily is the same club, the same list and the same budget for everyone. Free play is any club you like.</li>
                </ul>
                <p className="font-semibold text-foreground">A quick example:</p>
                <p>The board want a centre back and a striker, and you have £30m. You call about a £12m centre back, your desk says he is worth £10m to £13m, so you bid £10m. They come down to £11.4m and you agree at £11.2m. His agent asks for 4 years and a £1.1m bonus; you offer exactly that and he signs. That is three hours gone and £17.7m left for the striker, with nine hours to find him.</p>
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
