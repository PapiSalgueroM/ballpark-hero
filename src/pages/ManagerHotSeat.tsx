import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import { RulesGate } from '@/components/game/RulesGate';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ManagerHotSeatBoard from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { HOT_SEAT_BOARD_START, HOT_SEAT_LEASH, HOT_SEAT_TAKEOVER_MAX, HOT_SEAT_TAKEOVER_MIN } from '@/lib/managerHotSeat';

const ManagerHotSeat = () => {
  return (
    <>
      <PageSeo
        title="Manager Hot Seat - Five Games To Save Your Job | DoUKnowBall"
        description="Take over a real club on a bad run. The board give you five league games and a points target. Hit it or you are sacked. Free football management game."
        path="/manager-hot-seat"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="relative text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Manager Hot Seat</h1>
            <p className="text-xs text-muted-foreground mt-1">Five games. One target. The board are watching.</p>
            <RulesGate title="How to Play Manager Hot Seat">
              <div className="space-y-3 text-sm">
                <p>You walk into a real club on a bad run. The board give you {HOT_SEAT_LEASH} league games and a points target, and you either hit it or you are gone.</p>
                <p className="font-semibold text-foreground">The rules:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The season is played up to the worst run of form between league weeks {HOT_SEAT_TAKEOVER_MIN} and {HOT_SEAT_TAKEOVER_MAX}, and that is where you take over.</li>
                  <li>The board start on {HOT_SEAT_BOARD_START} out of 100. If that meter hits zero, you are sacked on the spot.</li>
                  <li>Before every match pick a shape (defensive, balanced or attacking) and a team talk, or say nothing.</li>
                  <li>Cup and European games still get played and still move the meters, but only league points count toward the target.</li>
                  <li>Hit the target and you keep the job. Miss it by one point with the fans singing and they save you. Anything else is the sack.</li>
                  <li>The daily is the same club, the same week and the same target for everyone. Free play is any club you like.</li>
                  <li>Keep the job (or get saved by the fans) and you can carry on in Club Manager: the same season, table, squad and board, picked up at the next fixture. If you already have a Club Manager career on this device, we ask before replacing it. Sacked managers do not get the offer.</li>
                </ul>
                <p className="font-semibold text-foreground">A quick example:</p>
                <p>You take over 16th after 9 games with one win in five. The target is 7 points from 5 games. You win the first two at home on a balanced shape with a calm talk, and that is 6. A draw away at a stronger side makes it 7 and the job is yours with two games to spare. Tap Carry on in Club Manager and the full game opens on that same club, with the points you just won on the table and the board where you left them, and the rest of the season still to play.</p>
              </div>
            </RulesGate>
          </div>
          <ManagerHotSeatBoard />
          <GameSeoContent
            pageHasOwnH1
            title="Manager Hot Seat: Save Your Job in Five Games"
            description="Manager Hot Seat is the short version of Club Manager, on the same engine. Take over a real club on a bad run, read the room before every match, handle the press, and hit the board's points target in five league games before they sack you."
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default ManagerHotSeat;
