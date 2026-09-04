import { useMemo, useState } from 'react';
import { RotateCcw, X, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ShareButtons from '@/components/game/ShareButtons';
import { usePerfectLineupGeneric } from '@/hooks/usePerfectLineupGeneric';
import { LineupConfig, describeConstraint, slotGradesToEmoji } from '@/lib/perfectLineupEngine';
import { computeChemistry, formatChemistry, ChemistryPlayer } from '@/lib/chemistry';

interface Props<P> {
  config: LineupConfig<P>;
}

/** Loosely typed so it works across NBA/NHL/F1 pool player shapes (team -> club). */
type MaybeChemFields = {
  name: string;
  team?: string;
  club?: string;
  league?: string;
  nationality?: string;
};

function toChemistryPlayer(p: MaybeChemFields): ChemistryPlayer {
  return {
    name: p.name,
    club: p.club ?? p.team,
    league: p.league,
    nationality: p.nationality,
  };
}

function GenericLineupBoard<P>({ config }: Props<P>) {
  const game = usePerfectLineupGeneric(config);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const chemistry = useMemo(
    () => computeChemistry(Object.values(game.picks).map((p) => toChemistryPlayer(p as unknown as MaybeChemFields))),
    [game.picks],
  );

  const activeSlot = openSlot !== null ? game.slots.find((s) => s.id === openSlot) : null;
  const options =
    openSlot !== null
      ? game
          .eligibleFor(openSlot)
          .filter((p) => config.nameOf(p).toLowerCase().includes(query.trim().toLowerCase()))
      : [];

  const choose = (slotId: number, player: P) => {
    game.pickPlayer(slotId, player);
    setOpenSlot(null);
    setQuery('');
  };

  const score = game.result ? config.scoreline(game.result) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
        <button
          onClick={game.rollDaily}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            game.mode === 'daily'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-accent'
          }`}
        >
          📅 Daily
        </button>
        <button
          onClick={game.rollUnlimited}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            game.mode === 'unlimited'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-accent'
          }`}
        >
          🎰 New Lineup
        </button>
      </div>

      {game.phase === 'picking' && (
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Fill every slot. Constrained slots only accept players matching that tag.{' '}
            <span className="font-semibold text-foreground">
              {game.filledCount}/{config.formation.length}
            </span>{' '}
            picked.
          </p>
          {chemistry.totalBonus > 0 && (
            <span className="inline-flex items-center mt-2 px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
              {formatChemistry(chemistry)}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {game.slots.map((slot) => {
          const picked = game.picks[slot.id];
          const grade = game.result?.slotGrades[slot.id];
          return (
            <div
              key={slot.id}
              className={`relative w-[150px] rounded-xl border p-3 text-center transition-colors ${
                picked ? 'bg-card border-primary/40' : 'bg-card/60 border-border border-dashed'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>{slot.label}</span>
                {grade && <span>{grade === 'green' ? '🟩' : grade === 'yellow' ? '🟨' : '⬛'}</span>}
              </div>
              <div
                className={`mt-1 text-[11px] font-medium ${
                  slot.constraint.dim ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {describeConstraint(slot.constraint)}
              </div>

              {picked ? (
                <div className="mt-2">
                  <div className="text-sm font-semibold text-foreground leading-tight">{config.nameOf(picked)}</div>
                  <div className="text-[11px] text-muted-foreground">{config.subtitleOf(picked)}</div>
                  {game.phase === 'picking' && (
                    <button
                      onClick={() => game.clearSlot(slot.id)}
                      className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
                      aria-label="Clear slot"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                game.phase === 'picking' && (
                  <button
                    onClick={() => {
                      setOpenSlot(slot.id);
                      setQuery('');
                    }}
                    className="mt-2 w-full py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
                  >
                    + Pick
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {game.phase === 'picking' && (
        <div className="mt-6 text-center">
          <button
            onClick={game.simulateLineup}
            disabled={!game.allFilled}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Sparkles className="w-5 h-5" />
            Simulate
          </button>
        </div>
      )}

      {game.phase === 'result' && game.result && score && (
        <div className="mt-6 text-center p-6 rounded-2xl bg-card border border-border space-y-3 animate-in fade-in zoom-in-95">
          <div className="text-5xl font-black text-primary">{score.big}</div>
          <div className="text-lg font-bold text-foreground">Grade {game.result.grade}</div>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <span>
              Rating <b className="text-foreground">{game.result.rating}</b>
            </span>
            <span>
              Chemistry <b className="text-foreground">{game.result.chemistry}%</b>
            </span>
            {chemistry.totalBonus > 0 && (
              <span>
                Chem. Bonus <b className="text-gold">+{chemistry.totalBonus}</b>
              </span>
            )}
          </div>

          {chemistry.totalBonus > 0 && (
            <div className="flex justify-center">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
                {formatChemistry(chemistry)}
              </span>
            </div>
          )}

          <ShareButtons
            gameName={config.gameName}
            gamePath={config.gamePath}
            score={score.shareScore}
            emojiGrid={slotGradesToEmoji(game.result.slotGrades)}
          />

          {game.mode === 'daily' ? (
            /* Round 428: a daily result is final, so no Edit Lineup here */
            <p className="mt-2 text-sm text-muted-foreground">That's your lineup for today. Come back tomorrow for a new one.</p>
          ) : (
            <button
              onClick={game.rollUnlimited}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Lineup
            </button>
          )}
        </div>
      )}

      <Dialog open={openSlot !== null} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">
              Pick a {activeSlot?.label}
              {activeSlot && activeSlot.constraint.dim && (
                <span className="text-primary"> · {describeConstraint(activeSlot.constraint)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No matching players.</p>
            )}
            {options.slice(0, 40).map((p) => (
              <button
                key={config.nameOf(p)}
                onClick={() => openSlot !== null && choose(openSlot, p)}
                className="w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium text-foreground">{config.nameOf(p)}</span>
                <span className="text-[11px] text-muted-foreground">{config.subtitleOf(p)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GenericLineupBoard;
