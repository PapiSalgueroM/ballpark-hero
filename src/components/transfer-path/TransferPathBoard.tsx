import { useState, useMemo } from 'react';
import { useTransferPath } from '@/hooks/useTransferPath';
import { GameNavbar } from '@/components/game/GameNavbar';
import ShareButtons from '@/components/game/ShareButtons';
import ReportQuestion from '@/components/game/ReportQuestion';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { TRANSFER_PATH_PLAYER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { RotateCcw, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const FLAG_MAP: Record<string, string> = {
  'Argentina': '🇦🇷', 'Portugal': '🇵🇹', 'Brazil': '🇧🇷', 'France': '🇫🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸', 'Germany': '🇩🇪', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱', 'Croatia': '🇭🇷',
  'Uruguay': '🇺🇾', 'Egypt': '🇪🇬', 'South Korea': '🇰🇷', 'Norway': '🇳🇴', 'Poland': '🇵🇱',
  'Cameroon': '🇨🇲', 'Ivory Coast': '🇨🇮', 'Senegal': '🇸🇳', 'Colombia': '🇨🇴', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Italy': '🇮🇹', 'Sweden': '🇸🇪', 'Morocco': '🇲🇦', 'Nigeria': '🇳🇬', 'Chile': '🇨🇱',
  'Mexico': '🇲🇽', 'Serbia': '🇷🇸', 'Georgia': '🇬🇪', 'Slovenia': '🇸🇮', 'Canada': '🇨🇦',
  'Austria': '🇦🇹', 'Denmark': '🇩🇰', 'Tunisia': '🇹🇳', 'Gabon': '🇬🇦', 'Algeria': '🇩🇿',
  'Costa Rica': '🇨🇷', 'USA': '🇺🇸', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
};

function flag(nationality: string) {
  return FLAG_MAP[nationality] ?? '🏳️';
}

export function TransferPathBoard() {
  const {
    puzzle, chain, connections, status, score, mode, unlimitedIndex,
    addPlayer, switchToUnlimited, nextPuzzle,
    getAllPlayerNames, getPlayerNationality,
    isLoadingPool, isLoading,
  } = useTransferPath();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const allNames = useMemo(() => getAllPlayerNames(), [getAllPlayerNames]);
  const excludeNames = useMemo(
    () => new Set([...chain, puzzle.playerB].map(n => n.toLowerCase())),
    [chain, puzzle.playerB],
  );

  // This check must live BELOW every hook. Returning early above the hooks
  // changes the hook count between renders and crashes with React error #310.
  if (isLoadingPool || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading Transfer Path…</p>
      </div>
    );
  }

  const handleSelect = (name: string) => {
    setInput('');
    setError('');
    const result = addPlayer(name);
    if (!result.ok) {
      setError(`${name} doesn't share a club with ${chain[chain.length - 1]}`);
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
  const shareScore = isWon ? `${score} pts (${steps} steps)` : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GameNavbar />
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Transfer Path</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Name teammates to connect the two players in as few steps as possible.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
          </p>
        </div>

        {/* Target card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-3">Connect</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <span className="text-2xl block">{flag(getPlayerNationality(puzzle.playerA))}</span>
              <p className="text-sm font-bold text-foreground mt-1">{puzzle.playerA}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 text-center">
              <span className="text-2xl block">{flag(getPlayerNationality(puzzle.playerB))}</span>
              <p className="text-sm font-bold text-foreground mt-1">{puzzle.playerB}</p>
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Optimal: {puzzle.minSteps} step{puzzle.minSteps > 1 ? 's' : ''}
          </p>
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
                <span className="shrink-0">{flag(getPlayerNationality(player))}</span>
                <span className="font-semibold text-foreground truncate min-w-0">{player}</span>
                {i === 0 && <span className="ml-auto shrink-0 text-[10px] text-primary font-semibold">START</span>}
                {i === chain.length - 1 && isWon && player === puzzle.playerB && (
                  <span className="ml-auto shrink-0 text-[10px] text-primary font-semibold">END ✓</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        {!isWon && (
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
              <p className="text-xs text-center text-muted-foreground italic">💡 {puzzle.hint}</p>
            )}
          </div>
        )}

        {/* Result */}
        {isWon && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <p className="text-lg font-bold text-primary">Connected! 🎉</p>
            <p className="text-2xl font-display font-bold text-primary">{score} pts</p>
            <p className="text-xs text-muted-foreground">
              Your path: {steps} step{steps > 1 ? 's' : ''} · Optimal: {puzzle.minSteps}
            </p>

            <ShareButtons
              score={`${score} pts (${steps} steps)`}
              gameName="Transfer Path"
              gamePath="/transfer-path"
              emojiGrid={emojiChain}
            />

            <div className="flex flex-col gap-2 pt-2">
              {mode === 'daily' && (
                <button
                  onClick={switchToUnlimited}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Unlimited
                </button>
              )}
              {mode === 'unlimited' && (
                <button
                  onClick={() => { nextPuzzle(); setInput(''); setError(''); setShowHint(false); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors"
                >
                  Next Puzzle →
                </button>
              )}
            </div>
          </div>
        )}

        <ReportQuestion
          gameType="transfer-path"
          gameContext={{ puzzleId: puzzle.id, playerA: puzzle.playerA, playerB: puzzle.playerB }}
        />
      </div>
    </div>
  );
}
