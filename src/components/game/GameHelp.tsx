import { useEffect, useState } from 'react';
import { useRoutePath } from '@/hooks/useRoutePath';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { loadGameContent } from '@/data/gameContent/loader';
import type { GameContent } from '@/data/gameContent/types';
import { flatGuide } from '@/data/gameContent/guideShape';

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
  /** Show the loaded guide until this route's first dismissal is remembered. */
  firstVisit?: boolean;
  /** Round 1012: rules a page adds after its guide's own (Soccer Career's
   *  derbies, while its guide is held). One the guide already carries word
   *  for word is skipped, so a rule moved into the guide shows once. */
  extraRules?: readonly string[];
}

export function GameHelp({ side = 'left', inline = false, className, firstVisit = false, extraRules }: GameHelpProps = {}) {
  const pathname = useRoutePath();
  const [content, setContent] = useState<GameContent | null>(null);
  const [open, setOpen] = useState(false);
  const localStorageKey = `rules-gate-seen:${pathname}`;
  const prerender = typeof window !== 'undefined' && !!(window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__;

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setOpen(false);
    loadGameContent(pathname).then(c => {
      if (cancelled) return;
      setContent(c);
      if (!firstVisit || prerender || !c || flatGuide(c).howToPlay.length === 0) return;
      try {
        setOpen(localStorage.getItem(localStorageKey) !== '1');
      } catch {
        setOpen(true);
      }
    });
    return () => { cancelled = true; };
  }, [pathname, firstVisit, localStorageKey, prerender]);

  /* Round 638: a converted guide keeps its sentences in sections, so read the
     flat lists through the accessor. */
  const guide = content ? flatGuide(content) : null;
  if (!guide || guide.howToPlay.length === 0) return null;
  const rules = [...guide.rules, ...(extraRules ?? []).filter(r => !guide.rules.includes(r))];

  const changeOpen = (nextOpen: boolean) => {
    if (prerender) return;
    if (open && !nextOpen) {
      try { localStorage.setItem(localStorageKey, '1'); } catch { /* The guide still closes when storage is blocked. */ }
    }
    setOpen(nextOpen);
  };

  return (
    <HowToPlayPopover title="How to play" triggerSide={side} floatingTrigger={!inline} className={className}
      open={firstVisit ? open : undefined} onOpenChange={firstVisit ? changeOpen : undefined}>
      <div>
        <h3 className="font-bold text-foreground mb-2">The steps</h3>
        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
          {guide.howToPlay.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
      {rules.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-2">The rules</h3>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            {rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      {guide.example.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-2">A worked example</h3>
          <div className="space-y-2 text-muted-foreground">
            {guide.example.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      )}
    </HowToPlayPopover>
  );
}

export default GameHelp;
