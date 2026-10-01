import { useMemo, useRef, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ResultScreen } from '@/components/game/ResultScreen';
import { usePerfectLineup } from '@/hooks/usePerfectLineup';
import { describeConstraint, slotGradesToEmoji } from '@/data/perfectLineup';
import { Player } from '@/types/game';
import { computeChemistry, formatChemistry } from '@/lib/chemistry';

const LINES: { title: string; ids: number[] }[] = [
  { title: 'Forwards', ids: [10, 9, 8] },
  { title: 'Midfield', ids: [5, 6, 7] },
  { title: 'Defence', ids: [1, 2, 3, 4] },
  { title: 'Goalkeeper', ids: [0] },
];

const PerfectLineupBoard = () => {
  const game = usePerfectLineup();
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [league, setLeague] = useState('');
  const [country, setCountry] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(40);
  const pickerOpener = useRef<{ trigger: HTMLButtonElement; slot: HTMLElement } | null>(null);

  const activeSlot = openSlot !== null ? game.slots.find((s) => s.id === openSlot) : null;
  const eligible = openSlot !== null ? game.eligibleFor(openSlot) : [];
  const options = eligible.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!league || p.league === league) && (!country || p.nationality === country),
  );

  const resetFilters = () => {
    setQuery('');
    setLeague('');
    setCountry('');
    setVisibleLimit(40);
  };

  const choose = (slotId: number, player: Player) => {
    game.pickPlayer(slotId, player);
    setOpenSlot(null);
    resetFilters();
  };

  const chemistry = useMemo(
    () =>
      computeChemistry(
        Object.values(game.picks).map((p) => ({
          name: p.name,
          club: p.club,
          league: p.league,
          nationality: p.nationality,
        })),
      ),
    [game.picks]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {/* Mode controls */}
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
            Fill every slot. Constrained slots only accept players from that league or country.{' '}
            <span className="font-semibold text-foreground">{game.filledCount}/11</span> picked.
          </p>
          {chemistry.totalBonus > 0 && (
            <span className="inline-flex items-center mt-2 px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
              {formatChemistry(chemistry)}
            </span>
          )}
        </div>
      )}

      {/* Pitch */}
      <div className="space-y-4">
        {LINES.map((line) => (
          <div key={line.title} className="flex flex-wrap justify-center gap-3">
            {line.ids.map((id) => {
              const slot = game.slots.find((s) => s.id === id)!;
              const picked = game.picks[id];
              const grade = game.result?.slotGrades[id];
              return (
                <div
                  key={id}
                  data-lineup-slot={id}
                  role="group"
                  aria-label={`${slot.label} lineup slot`}
                  tabIndex={-1}
                  className={`relative w-[150px] rounded-xl border p-3 text-center transition-colors ${
                    picked ? 'bg-card border-primary/40' : 'bg-card/60 border-border border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>{slot.label}</span>
                    {grade && (
                      <span>{grade === 'green' ? '🟩' : grade === 'yellow' ? '🟨' : '⬛'}</span>
                    )}
                  </div>
                  <div
                    className={`mt-1 text-[11px] font-medium ${
                      slot.constraint.type === 'any' ? 'text-muted-foreground' : 'text-primary'
                    }`}
                  >
                    {describeConstraint(slot.constraint)}
                  </div>

                  {picked ? (
                    <div className="mt-2">
                      <div className="text-sm font-semibold text-foreground leading-tight [overflow-wrap:anywhere]">{picked.name}</div>
                      <div className="text-[11px] text-muted-foreground">€{picked.marketValue}M</div>
                      {game.phase === 'picking' && (
                        <button
                          onClick={() => game.clearSlot(id)}
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
                        onClick={(event) => {
                          pickerOpener.current = { trigger: event.currentTarget, slot: event.currentTarget.parentElement! };
                          setOpenSlot(id);
                          resetFilters();
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
        ))}
      </div>

      {/* Simulate */}
      {game.phase === 'picking' && (
        <div className="mt-6 text-center">
          <button
            onClick={game.simulateLineup}
            disabled={!game.allFilled}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Sparkles className="w-5 h-5" />
            Simulate Match
          </button>
        </div>
      )}

      {/* Result */}
      {game.phase === 'result' && game.result && (
        <div className="mt-6">
          <ResultScreen
            outcomeEmoji={<span className="text-4xl font-black text-primary">{game.result.goalsFor}-{game.result.goalsAgainst}</span>}
            headline={`Grade ${game.result.grade}`}
            statRow={[
              { label: 'Rating', value: game.result.rating },
              { label: 'Chemistry', value: `${game.result.chemistry}%` },
              { label: 'Squad', value: `€${game.result.squadValue}M` },
              ...(chemistry.totalBonus > 0 ? [{ label: 'Chem. Bonus', value: `+${chemistry.totalBonus}` }] : []),
            ]}
            emojiGrid={slotGradesToEmoji(game.result.slotGrades)}
            share={{
              gameName: 'Perfect Lineup',
              gamePath: '/perfect-lineup',
              score: `a ${game.result.goalsFor}-${game.result.goalsAgainst} win (Grade ${game.result.grade}, ${game.result.rating} rating)`,
            }}
            onPlayAgain={game.mode === 'daily' ? game.reset : game.rollUnlimited}
            playAgainLabel={game.mode === 'daily' ? 'Edit Lineup' : 'New Lineup'}
          />
        </div>
      )}

      {/* Pick dialog */}
      <Dialog open={openSlot !== null} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = pickerOpener.current;
          const target = opener?.trigger.isConnected ? opener.trigger : opener?.slot;
          if (target?.isConnected) target.focus({ preventScroll: true });
        }} className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">
              Pick a {activeSlot?.label}
              {activeSlot && activeSlot.constraint.type !== 'any' && (
                <span className="text-primary"> · {describeConstraint(activeSlot.constraint)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Search players"
            placeholder="Search players…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleLimit(40); }}
            className="min-h-[44px]"
          />
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 basis-32 text-xs font-semibold text-muted-foreground">
              League
              <select value={league} onChange={(e) => { setLeague(e.target.value); setVisibleLimit(40); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                <option value="">All</option>
                {[...new Set(eligible.map(p => p.league))].sort((a, b) => a.localeCompare(b)).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="min-w-0 flex-1 basis-32 text-xs font-semibold text-muted-foreground">
              Country
              <select value={country} onChange={(e) => { setCountry(e.target.value); setVisibleLimit(40); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                <option value="">All</option>
                {[...new Set(eligible.map(p => p.nationality))].sort((a, b) => a.localeCompare(b)).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button type="button" onClick={resetFilters} disabled={!query && !league && !country} className="min-h-[44px] rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-40">
              Reset filters
            </button>
          </div>
          <p role="status" className="text-xs text-muted-foreground">Showing {Math.min(visibleLimit, options.length)} of {options.length} matching players ({eligible.length} eligible).</p>
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{eligible.length === 0 ? 'No eligible players for this slot.' : 'No matching players. Reset filters to see eligible players.'}</p>
            )}
            {options.slice(0, visibleLimit).map((p) => (
              <button
                key={p.name}
                onClick={() => openSlot !== null && choose(openSlot, p)}
                className="w-full min-h-[44px] min-w-0 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left flex items-center justify-between gap-2"
              >
                <span className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{p.name}</span>
                <span className="min-w-0 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                  {p.club} · €{p.marketValue}M
                </span>
              </button>
            ))}
          </div>
          {visibleLimit < options.length && (
            <button type="button" onClick={(event) => {
              if (visibleLimit + 40 >= options.length && document.activeElement === event.currentTarget) {
                event.currentTarget.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
              }
              setVisibleLimit(limit => Math.min(limit + 40, options.length));
            }} className="min-h-[44px] rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent">
              Load more players
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerfectLineupBoard;
