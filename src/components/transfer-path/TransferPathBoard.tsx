import { FlagImg } from '@/components/FlagImg';
import { useState, useMemo } from 'react';
import { useTransferPath, type TransferPathRefusal } from '@/hooks/useTransferPath';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import ReportQuestion from '@/components/game/ReportQuestion';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { TRANSFER_PATH_PLAYER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { RotateCcw, ArrowRight, Lightbulb } from 'lucide-react';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { ACTIVE_SEASON_LABEL, RULE_BLURB, RULE_LABEL, TRANSFER_PATH_RULES } from '@/lib/transferPathModes';
import { cn } from '@/lib/utils';


// Uses the shared, comprehensive flag helper (~120 nations, handles dual
// nationalities) instead of a local map that fell back to a blank white flag.


export function TransferPathBoard() {
  const {
    puzzle, chain, connections, status, score, mode, unlimitedIndex,
    rule, activeRule, setRule, ruleLocked, dailyRuleBlocked, ruleAvailability, optimal, hint,
    addPlayer, giveUp, revealPath, switchToUnlimited, nextPuzzle,
    getAllPlayerNames, getPlayerNationality,
    isLoadingPool, isLoading,
  } = useTransferPath();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  /* Round 292: a report from this page used to arrive as "Wrong answer" with the two
     endpoints and nothing else (2026-08-19, Yaya Toure to Lamine Yamal), which cannot
     be acted on: the thing to check is the name the graph refused and who it was
     meant to follow. Kept here and sent with the report. */
  const [lastRejected, setLastRejected] = useState<{ name: string; after: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const allNames = useMemo(() => getAllPlayerNames(), [getAllPlayerNames]);
  const excludeNames = useMemo(
    () => new Set([...chain, puzzle.playerB].map(n => n.toLowerCase())),
    [chain, puzzle.playerB],
  );

  /* Round 460: the refusal says which rule refused, not just that the link failed. */
  const refusalText = (name: string, reason: TransferPathRefusal | undefined) => {
    const last = chain[chain.length - 1];
    if (reason === 'duplicate') return `${name} is already in the path`;
    if (reason === 'retired') return `Our career records stop before ${ACTIVE_SEASON_LABEL} for ${name}, so Active players only leaves him out`;
    if (reason === 'outside-europe') return `${name} only links to ${last} through a club outside Europe`;
    return `${name} was never at the same club as ${last} in the same season`;
  };

  const handleSelect = (name: string) => {
    setInput('');
    setError('');
    const result = addPlayer(name);
    if (!result.ok) {
      setError(refusalText(name, result.reason));
      setLastRejected({ name, after: chain[chain.length - 1] });
    }
  };

  const handleAutocompleteSelect = (entity: PlayerEntity) => {
    // The autocomplete's own source (career_players) is broader than the set
    // of names the currently loaded chain graph knows about (allNames comes
    // from getAllPlayerNames(), which mirrors the same table but may lag on
    // a fresh load), so fall back to the entity's own name either way. The
    // actual club-overlap validity check still happens inside handleSelect via
    // addPlayer, unchanged from before this migration.
    const match = allNames.find(n => n.toLowerCase() === entity.name.toLowerCase()) ?? entity.name;
    handleSelect(match);
  };

  const isWon = status === 'won';
  const steps = chain.length - 1;
  const emojiChain = chain.map(() => '⚽').join('→');
  const ruleOn = activeRule !== 'classic';
  /* The daily's score counts against the everyday minimum whatever rule is on
     (one shared puzzle, one leaderboard), so say so where the two differ. */
  const dailyScoredElsewhere = mode === 'daily' && ruleOn && optimal !== puzzle.minSteps;

  // This check must live BELOW every hook. Returning early above the hooks
  // changes the hook count between renders and crashes with React error #310.
  if (isLoadingPool || isLoading) {
    return (
      <GameShell width="narrow" title="TRANSFER PATH">
        <p className="text-muted-foreground text-sm text-center">Loading Transfer Path…</p>
      </GameShell>
    );
  }

  return (
    <GameShell
      width="narrow"
      title="TRANSFER PATH"
      subtitle="Name teammates to connect the two players in as few steps as possible."
      headerExtra={
        <div className="mt-1 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">
              {mode === 'daily'
                ? '📅 Daily Challenge'
                : `♾️ Unlimited #${unlimitedIndex + 1}${rule !== 'classic' ? ` · ${RULE_LABEL[rule]} (${ruleAvailability[rule]} puzzles)` : ''}`}
            </p>
            <HowToPlayPopover title="How to Play Transfer Path" floatingTrigger={false} className="p-1">
              <div className="space-y-3 text-left">
                <p>🎯 <span className="font-semibold text-foreground">Connect the two players</span> by naming footballers who were teammates, one link at a time.</p>
                <p>🔗 Each name you add must have been at the same club as the LAST player in your chain, in the same season. Same shirt years apart does not count.</p>
                <p>🏁 Reach the target player to win. 1000 points for the shortest possible path, minus 100 for every extra step.</p>
                <p>💡 Stuck? The hint nudges you toward a route, and giving up shows a full working path.</p>
                <p>📅 One daily puzzle for everyone, plus unlimited practice puzzles.</p>
                <p>🧭 <span className="font-semibold text-foreground">Special rules</span>: Active players only means every name in the chain, both ends included, has a {ACTIVE_SEASON_LABEL} season on our career records; a player whose record here stops earlier is off the board, retired or not. Europe only means every club a link goes through is a European club. Each rule has its own optimal, worked out on the players it leaves in play.</p>
                <p>🔒 A rule reaches the daily only when today's pair has a route under it, and the daily score still counts against the everyday optimal. Unlimited takes any rule and scores against that rule's own optimal.</p>
              </div>
            </HowToPlayPopover>
          </div>
          <div role="group" aria-label="Special rules" className="flex flex-wrap justify-center gap-1.5">
            {TRANSFER_PATH_RULES.map(r => {
              const off = ruleLocked || ruleAvailability[r] === 0;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRule(r)}
                  aria-pressed={rule === r}
                  disabled={off}
                  title={ruleLocked ? 'Rules lock once today\'s chain has started' : ruleAvailability[r] === 0 ? 'No puzzle carries this rule yet' : RULE_BLURB[r]}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    rule === r
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40',
                    off && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {RULE_LABEL[r]}
                </button>
              );
            })}
          </div>
          {/* The blurb used to live only in the buttons' title attribute, which a phone never shows. */}
          <p className="text-[10px] text-muted-foreground">{RULE_BLURB[rule]}</p>
          {ruleLocked && (
            <p className="text-[10px] text-muted-foreground">Special rules lock once today's chain has started. Unlimited takes any rule.</p>
          )}
          {dailyRuleBlocked && (
            <div className="rounded-xl border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground space-y-1.5">
              <p>Today's pair has no route under {RULE_LABEL[rule]}, so the daily plays the everyday rule.</p>
              <button
                type="button"
                onClick={() => { switchToUnlimited(); setInput(''); setError(''); setShowHint(false); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                Play unlimited under {RULE_LABEL[rule]}
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Target card */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-3">Connect</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <span className="block"><FlagImg name={getPlayerNationality(puzzle.playerA)} size={24} /></span>
              <p className="text-sm font-bold text-foreground mt-1">{puzzle.playerA}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 text-center">
              <span className="block"><FlagImg name={getPlayerNationality(puzzle.playerB)} size={24} /></span>
              <p className="text-sm font-bold text-foreground mt-1">{puzzle.playerB}</p>
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Optimal: {optimal} step{optimal > 1 ? 's' : ''}{ruleOn ? ` under ${RULE_LABEL[activeRule]}` : ''}
          </p>
          {dailyScoredElsewhere && (
            <p className="text-[10px] text-center text-muted-foreground mt-0.5">
              The everyday optimal is {puzzle.minSteps}, and that is what today's score counts against.
            </p>
          )}
        </div>

        {/* Chain built so far */}
        <div className="space-y-0">
          {chain.map((player, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="flex items-center gap-1.5 ml-5 py-1">
                  <span className="w-px h-4 bg-border inline-block" />
                  <span className="text-[10px] text-muted-foreground italic">{connections[i]}</span>
                </div>
              )}
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                i === 0 ? 'bg-primary/10 border border-primary/20' :
                i === chain.length - 1 && isWon ? 'bg-primary/10 border border-primary/20' :
                'bg-card border border-border'
              )}>
                <span className="shrink-0"><FlagImg name={getPlayerNationality(player)} size={18} /></span>
                <span className="font-semibold text-foreground truncate min-w-0">{player}</span>
                {i === 0 && <span className="ml-auto shrink-0 text-[10px] text-primary font-semibold">START</span>}
                {i === chain.length - 1 && isWon && player === puzzle.playerB && (
                  <span className="ml-auto shrink-0 text-[10px] text-primary font-semibold">END ✓</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Give-up reveal */}
        {status === 'gaveup' && (
          <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-3">
            <p className="text-sm font-bold text-foreground text-center">Here's a path that works</p>
            {revealPath ? (
              <div className="space-y-0">
                {revealPath.map((step, i) => (
                  <div key={`${step.player}-${i}`}>
                    {i > 0 && (
                      <div className="flex items-center gap-1.5 ml-5 py-1">
                        <span className="w-px h-4 bg-border inline-block" />
                        <span className="text-[10px] text-muted-foreground italic">{step.club}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-card border border-border">
                      <span className="shrink-0"><FlagImg name={getPlayerNationality(step.player)} size={18} /></span>
                      <span className="font-semibold text-foreground truncate min-w-0">{step.player}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                No connecting path exists in the current player pool. That one's on us; it's been flagged.
              </p>
            )}
            {mode === 'unlimited' && (
              <button
                onClick={() => { nextPuzzle(); setInput(''); setError(''); setShowHint(false); }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Next Puzzle
              </button>
            )}
          </div>
        )}

        {/* Input */}
        {!isWon && status !== 'gaveup' && (
          <div className="space-y-2">
            <PlayerAutocomplete
              value={input}
              onChange={value => { setInput(value); setError(''); }}
              onSelect={handleAutocompleteSelect}
              searchOptions={{ source: TRANSFER_PATH_PLAYER_SOURCE, exclude: excludeNames, minChars: 2 }}
              placeholder="Type a player name..."
              autoFocus
              validateOnly
            />
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            {/* Hint button */}
            {!showHint && (
              <button
                onClick={() => setShowHint(true)}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Show hint
              </button>
            )}
            {showHint && (
              <p className="text-xs text-center text-muted-foreground italic">💡 {hint}</p>
            )}
            <GiveUpButton onGiveUp={giveUp} label="Give up and see a path" />
          </div>
        )}

        {/* Result */}
        {isWon && (
          <ResultScreen
            won
            outcomeEmoji="🎉"
            headline="Connected!"
            statLine={<span className="text-2xl font-display font-bold text-primary">{score} pts</span>}
            funFact={<>
              Your path: {steps} step{steps > 1 ? 's' : ''} · Optimal: {optimal}
              {ruleOn ? ` under ${RULE_LABEL[activeRule]}` : ''}
              {dailyScoredElsewhere ? `, scored against the everyday ${puzzle.minSteps}` : ''}
            </>}
            emojiGrid={emojiChain}
            share={{
              score: `${score} pts (${steps} steps${ruleOn ? `, ${RULE_LABEL[activeRule]}` : ''})`,
              gameName: 'Transfer Path',
              gamePath: '/transfer-path',
            }}
            onPlayAgain={mode === 'unlimited' ? () => { nextPuzzle(); setInput(''); setError(''); setShowHint(false); } : undefined}
            playAgainLabel="Next Puzzle"
            playNext={mode === 'daily' ? (
              <button
                onClick={switchToUnlimited}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Play Unlimited
              </button>
            ) : undefined}
          />
        )}

        <ReportQuestion
          gameType="transfer-path"
          gameContext={{ puzzleId: puzzle.id, playerA: puzzle.playerA, playerB: puzzle.playerB, rule: activeRule, chain, lastRejected }}
        />
      </div>

    </GameShell>
  );
}
