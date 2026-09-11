import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import {
  ACHIEVEMENTS, emptyAchievementFacts, hiddenRemaining, loadAchievementFacts,
  visibleAchievements, type AchievementFacts, type AchievementRarity,
} from '@/lib/achievements';

/* Round 527: the achievement case on the profile.

   Reads only. It asks src/lib/achievements.ts for the facts (the local streak
   state plus a SELECT of this browser's own completion rows) and renders what
   they earn. Nothing here writes anything, so opening the case can never move
   a number on the page behind it.

   Locked tiles carry their progress, because "3 of 10" is the part that makes
   somebody go and play the seventh game. Hidden ones are not in the list at
   all until they land: visibleAchievements drops them, so there is no locked
   tile to read the name off and no blurred tile to guess at. All the case
   admits is how many are still out there.

   PHONE FIRST. Two columns at 320, three at 390 and up, and the card starts
   folded at twelve tiles with the earned ones first and the nearest misses
   behind them, so it is a card you can take in rather than a page you scroll
   past. */

interface AchievementCaseProps {
  /** The signed in profile, so the completion rows are matched to the right handle. */
  profile?: { display_name?: string | null; username?: string | null } | null;
  /** Saved best score per game slug, already loaded by the page. */
  bestScoreByGame: Record<string, number>;
  /** The points total the page already shows. */
  points: number;
}

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

/** Earned tiles are tinted by tier. Locked ones stay grey whatever the tier,
 *  so the case reads as "what you have" at a glance. */
const RARITY_STYLE: Record<AchievementRarity, { ring: string; text: string; bar: string }> = {
  common: { ring: 'border-primary/40 bg-primary/5', text: 'text-primary', bar: 'bg-primary' },
  uncommon: { ring: 'border-sky-400/50 bg-sky-400/5', text: 'text-sky-400', bar: 'bg-sky-400' },
  rare: { ring: 'border-purple-400/50 bg-purple-400/5', text: 'text-purple-400', bar: 'bg-purple-400' },
  legendary: { ring: 'border-amber-400/60 bg-amber-400/10', text: 'text-amber-400', bar: 'bg-amber-400' },
};

const FOLDED = 12;

export default function AchievementCase({ profile, bestScoreByGame, points }: AchievementCaseProps) {
  const [facts, setFacts] = useState<AchievementFacts>(() => emptyAchievementFacts());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAchievementFacts(profile, bestScoreByGame, points).then(next => {
      if (!cancelled) setFacts(next);
    });
    return () => { cancelled = true; };
  }, [profile, bestScoreByGame, points]);

  const entries = visibleAchievements(facts);
  const earned = entries.filter(e => e.earned);
  const locked = entries.filter(e => !e.earned);
  const earnedCount = earned.length;
  const secrets = hiddenRemaining(facts);

  /* The fold always keeps room for something to chase. Measured at 320 on a
     player with 15 earned, a straight "first twelve" showed twelve earned
     tiles and not one progress bar, which is the half of the card that makes
     anybody go and play another game. So the locked side gets at least four
     slots whenever there are locked ones left, and a brand new player, who has
     no earned ones to show, gets the twelve nearest instead. */
  const lockedSlots = Math.min(locked.length, Math.max(4, FOLDED - earnedCount));
  const shown = showAll
    ? entries
    : [...earned.slice(0, Math.max(0, FOLDED - lockedSlots)), ...locked.slice(0, lockedSlots)];

  return (
    <Card className="border-border/60">
      {/* px-3 on a phone and flex-wrap on the title row: at 320 the title and
          the counter together are within a few pixels of the content width, so
          the counter drops to its own line instead of pushing anything off the
          side. */}
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <CardTitle className="text-lg font-display">🎖️ Achievements</CardTitle>
          <span className="text-sm font-semibold text-primary whitespace-nowrap">
            {earnedCount} / {ACHIEVEMENTS.length} earned
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Worked out from what you have already played, so they turn up on their own. Tiers are our
          call on how hard each one is, not a share of players.
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {shown.map(entry => {
            const style = RARITY_STYLE[entry.def.rarity];
            return (
              <div
                key={entry.def.id}
                className={`relative min-w-0 flex flex-col p-2.5 rounded-xl border-2 transition-all ${
                  entry.earned
                    ? `${style.ring} shadow-[0_0_10px_hsl(var(--primary)/0.12)]`
                    : 'border-border/20 bg-muted/10'
                }`}
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className={`text-2xl leading-none ${entry.earned ? '' : 'opacity-40 grayscale'}`}>
                    {entry.def.emoji}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wide ml-auto ${
                      entry.earned ? style.text : 'text-muted-foreground/60'
                    }`}
                  >
                    {RARITY_LABEL[entry.def.rarity]}
                  </span>
                </div>
                <p className={`text-[11px] font-bold leading-tight mt-1.5 break-words ${entry.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {entry.def.title}
                </p>
                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 break-words">
                  {entry.def.description}
                </p>
                {!entry.earned && (
                  <div className="mt-auto pt-2">
                    <div
                      className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={entry.need}
                      aria-valuenow={entry.have}
                      aria-label={`${entry.def.title} progress`}
                    >
                      <div
                        className={`h-full rounded-full ${style.bar} opacity-70`}
                        style={{ width: `${Math.round(entry.ratio * 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">
                      {entry.have.toLocaleString()} / {entry.need.toLocaleString()}
                    </p>
                  </div>
                )}
                {entry.earned && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p className="text-[11px] text-muted-foreground">
            {secrets > 0
              ? `Plus ${secrets} secret ${secrets === 1 ? 'one' : 'ones'}. You will know when you get one.`
              : 'Every secret one is yours. Nice.'}
          </p>
          {entries.length > FOLDED && (
            <Button size="sm" variant="outline" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Show less' : `Show all ${entries.length}`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
