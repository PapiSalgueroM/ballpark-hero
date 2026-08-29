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
 */
interface GameHelpProps {
  /** Forwarded to the popover trigger. Round 335: non shell pages mount this
   *  directly and pick the corner (or inline) that fits their own header. */
  side?: 'left' | 'right';
  inline?: boolean;
  className?: string;
}

export function GameHelp({ side = 'left', inline = false, className }: GameHelpProps = {}) {
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
    <HowToPlayPopover title="How to play" triggerSide={side} floatingTrigger={!inline} className={className}>
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
