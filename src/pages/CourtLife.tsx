import { useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import CourtLifeBoard from '@/components/court-life/CourtLifeBoard';

export default function CourtLife() {
  const [helpOpen, setHelpOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  return <>
    <PageSeo title="Court Life: Basketball Career Game" description="Play full-court 3v3 basketball, train your player and make life choices between games. Build a career with your fictional neighborhood crew." path="/court-life" />
    <GameNavbar />
    <main id="dukb-main" tabIndex={-1} className="mx-auto max-w-3xl px-3 py-2 pb-16">
      <header className="mb-2"><p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Basketball / career</p><h1 className="font-display text-2xl font-bold">Court Life</h1></header>
      <CourtLifeBoard helpOpen={helpOpen} onHelp={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setHelpOpen(true); }} />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto p-5 [&>button]:h-11 [&>button]:w-11" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
        <DialogTitle>Court Life: make your next play</DialogTitle><DialogDescription>Six games. Two teammates. The player you become is up to you.</DialogDescription>
        <ul className="space-y-2 text-sm">
          <li>Before each fixture, spend two time blocks on training, recovery, work or a team session. Make one life choice. Every option shows its actual costs and benefits.</li>
          <li>The gold ring marks your player. Move with the pad or click the court and use arrows or W A S D. J is Shoot or Jump, K is Pass, Call or Steal, and L is Sprint or Guard. Escape pauses.</li>
          <li>Hold Shoot and release in the gold window. Your skill, distance, fatigue and defenders affect the shot. A release never guarantees a basket. Pass sends the ball toward the teammate with the dashed ring.</li>
          <li>Move into open space and Call when a teammate has the ball. They look for an open lane. Guard slows you into a defensive stance; Jump can block a reachable shot. A missed steal costs energy and leaves a recovery delay.</li>
          <li>Two 75-second halves and a 12-second shot clock. Inside shots earn two, outside shots three. The ball must physically fall through the hoop. Misses can rebound, passes can be intercepted and the ball can go out.</li>
          <li>Tied games get up to two 30-second overtimes, then finish as a draw. These are fictional house rules with no fouls, free throws or substitutions.</li>
          <li>Four crews play each other twice. The table uses two points for a win and one for a draw, then scoring difference, points scored and crew ID. Your player stats come from the games you play.</li>
          <li>Condition affects your legs. Trust raises inbound and pass-call priority. Newcomer becomes Trusted outlet at 40 trust and Floor leader at 70. Attributes stop at 95.</li>
          <li>Opening help, switching away or losing focus pauses play and releases held controls. Your active match saves, including its ball and clock. Refresh opens it paused. Use Resume when ready.</li>
        </ul>
        <p className="text-sm"><strong>Try this:</strong> recover once, train passing once and stay for the extra crew session. In the game, pass to an open teammate, move closer to the basket and call for the return. The decision helps your passing and trust, but uses energy.</p>
        <p className="text-sm"><strong>Season scoring:</strong> up to 50 for results (draws count half), 20 for your first 60 points, 20 for teamwork (two per assist, one per steal, block and rebound, capped at 36) and 10 for ball security (lost across 18 turnovers). Add the categories and round once. Four wins, 30 points, 18 teamwork credits and nine turnovers earn 58/100.</p>
        <p className="text-xs text-muted-foreground">Only a completed six-game season earns a site score. Your next season keeps your player growth, resources and past chapters. All people and crews in this game are fictional.</p>
      </DialogContent></Dialog>
      <GameSeoContent pageHasOwnH1 title="Court Life: Basketball Career Game" description="Control a player in original full-court 3v3 basketball. Earn trust, improve your skills and shape your life between a six-game season." />
      <GameNav />
    </main>
  </>;
}
