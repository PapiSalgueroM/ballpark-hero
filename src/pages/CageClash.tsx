import { useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import CageClashBoard from '@/components/cage-clash/CageClashBoard';

export default function CageClash() {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpOpener = useRef<HTMLElement | null>(null);
  return <>
    <PageSeo title="Cage Clash: Pixel MMA Fighting Game" description="Free pixel MMA fighting game. Move, block, punch and kick, then clinch, take your opponent down and work for a submission. Play on phone or keyboard." path="/cage-clash" />
    <div className="min-h-screen bg-background text-foreground">
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="mx-auto max-w-3xl px-3 py-2 pb-16">
        <header className="mb-2 text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Cage Clash</h1>
          <p className="text-xs text-muted-foreground">Hands up. Find your opening.</p>
        </header>
        <CageClashBoard helpOpen={helpOpen} onHelp={() => {
          helpOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setHelpOpen(true);
        }} />
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto p-5 [&>button]:h-11 [&>button]:w-11" onCloseAutoFocus={event => {
            event.preventDefault();
            helpOpener.current?.focus({ preventScroll: true });
          }}>
            <DialogTitle>Cage Clash: how to fight</DialogTitle>
            <DialogDescription>Three short arcade rounds. Win by knockout, submission or the scorecards.</DialogDescription>
            <ul className="space-y-2 text-sm">
              <li>Hold the arrows to move and Guard to block. A punch needs close range. Kicks reach farther. Attacks spend stamina, so leave room to recover.</li>
              <li>Get close and use Clinch. In the clinch, work for a takedown or break away. Your stamina and fighting style affect who gets on top.</li>
              <li>On top, strike, posture up or pass into a better position. From underneath, block, regain guard, sweep or try to stand.</li>
              <li>Hold Submission to build pressure. Your opponent can resist or escape. Low stamina makes both defending and attacking harder.</li>
              <li>Move hints show Ready, Move closer, Recover gas or Recovering. They are advice: holding a move still works after recovery, and an out-of-range shot can miss and spend gas.</li>
              <li>Use Pause any time. Switching away, opening these rules or losing focus pauses the fight. Resume clears held inputs. Refresh starts over.</li>
              <li>Punches, kicks and ground strikes move through full pixel poses. Your device's reduced motion setting keeps action poses steady.</li>
              <li>Ground poses show guard, half guard and mount. Passing and escaping have effort poses, and submission grips tighten with your actual pressure. Reduced motion keeps effort poses steady.</li>
              <li>Choose Practice before starting to learn four skills with an untimed partner: land three shots and recover gas, earn a takedown, finish a submission, or regain guard and stand up. The practice panel shows your progress, the next move and what happened on your last attempt. A defended takedown stays unfinished: recover gas and try again. Only the moves for that drill are active. Retry as often as you like.</li>
              <li>Choose Circuit to face a balanced fighter, a striker and a grappler. Win to advance with Next opponent. A loss or draw ends the run. Every fight starts with fresh health and gas; each has up to three 45 second rounds.</li>
              <li>After a Quick fight or a Circuit fight, open Fight stats to compare shots landed, damage, blocks, takedowns and time on top. Back returns to your result. Damage is rounded and top control is shown in seconds.</li>
              <li>Keyboard: arrows or A/D to move, Space to guard, J/K/L for the upper action row and U/I/O for the lower row. P or Escape pauses.</li>
            </ul>
            <p className="text-sm"><strong>Try this:</strong> move into punching range, block a shot, then clinch. Use Takedown, pass from guard and hold Submission when you have stamina. If the opponent gets on top, defend and try a sweep or stand up.</p>
            <p className="text-xs text-muted-foreground">Quick fight scores are out of 100: a win earns 50, a winning finish adds 15, damage earns up to 20 and defense or ground control earns up to 15. A draw earns 25 outcome points. Practice and quitting earn no score. The fighters and arcade rules are fictional.</p>
            <p className="text-xs text-muted-foreground">Circuit awards one run score when you finish or lose: add your fight scores, divide by three and round to the nearest point. Unplayed fights count as zero. Three scores of 80, 90 and 85 earn 85/100. Losing the first fight with 30 points earns 10/100.</p>
          </DialogContent>
        </Dialog>
        <GameSeoContent pageHasOwnH1 title="Cage Clash: Pixel MMA Fighting Game" description="Take control of your own fighter in an original pixel cage. Pick a style, manage distance and stamina, then choose between striking and grappling." />
        <GameNav />
      </main>
    </div>
  </>;
}
