import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { loadGameContent } from '@/data/gameContent/loader';
import type { GameContent } from '@/data/gameContent/types';

/**
 * Round 321, the how-to-play audit. The house rule since the early rounds:
 * every game shows instructions, rules and a worked example before play,
 * re-openable from a "?" button. In practice each page grew its own version
 * or none at all, and the owner's 08-28 review asked for the audit.
 *
 * This component is the standard answer. Mounted by GameShell on every game
 * drawn through it, it looks up the route's own guide (the same per game
 * content that GameSeoContent renders at the bottom of the page, written to
 * match the game code exactly) and serves the how to play steps, the rules
 * and the worked example in the shared popover. Routes with no guide render
 * nothing, and pages that already carry their own rules control opt out
 * through GameShell's help="none" so no page shows two question marks.
 *
 * ROUND 335: it is mounted by GameNavbar too, in the `inline` form, and that
 * is what closed the hole. Round 321 put this in GameShell, but 39 games draw
 * their own layout from GameNavbar and never touch the shell, so a third of
 * the site had no rules control at all. GameNavbar reaches all of them, and
 * because it is the site chrome the "?" is still there mid game rather than
 * living on a setup screen that the first press throws away. The floating
 * trigger is absolutely positioned for the shell's content column, which
 * would land it on top of the navbar's own buttons, so the navbar asks for
 * the inline one and gets a control that sits in the row like any other.
 */
export function GameHelp({ inline = false }: { inline?: boolean } = {}) {
  const { pathname } = useLocation();
  const [content, setContent] = useState<GameContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    loadGameContent(pathname).then(c => {
      if (!cancelled) setContent(c);
    });
    return () => { cancelled = true; };
  }, [pathname]);

  if (!content || content.howToPlay.length === 0) return null;

  return (
    <HowToPlayPopover
      title="How to play"
      floatingTrigger={!inline}
      /* In the navbar row the trigger stands beside the Back button, so it
         matches its height and its hit area rather than the 44px the
         floating one gets from the content column around it. */
      className={inline ? 'shrink-0 inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg border-2 border-primary/60 bg-surface-1 text-primary hover:bg-primary hover:text-primary-foreground shadow-sm' : undefined}
    >
      <div>
        <h3 className="font-bold text-foreground mb-2">The steps</h3>
        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
          {content.howToPlay.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
      {content.rules.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-2">The rules</h3>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            {content.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      {content.example.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-2">A worked example</h3>
          <div className="space-y-2 text-muted-foreground">
            {content.example.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      )}
    </HowToPlayPopover>
  );
}

export default GameHelp;
