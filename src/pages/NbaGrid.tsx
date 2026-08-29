import { Fragment, useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  CellStatus,
  GridDifficulty,
  GridPuzzle,
  NbaGridData,
  NBA_STATS_PLAYER_SOURCE,
  buildGridPuzzle,
  fetchNbaGridData,
  gridToEmoji,
  loadGridDifficulty,
  playerMatchesCell,
  saveGridDifficulty,
} from '@/lib/nbaGrid';

/**
 * NBA Franchise Grid, direct port of HockeyGrid.tsx (task #24) on top of
 * src/lib/nbaGrid.ts. Keep the grid pages in lockstep if the mechanic
 * changes; only data layer, labels and slugs differ.
 */

type Phase = 'boot' | 'error' | 'playing';
type Mode = 'daily' | 'unlimited';

const GUESS_LIMIT = 9;

interface FilledCell {
  playerName: string;
}

function normalize(name: string): string {
  return normalizeName(name);
}

const NbaGrid = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [gridData, setGridData] = useState<NbaGridData | null>(null);
  const [mode, setMode] = useState<Mode>('daily');

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchNbaGridData();
    if (!d) {
      setPhase('error');
      return;
    }
    setGridData(d);
    setPhase('playing');
  }, []);

  useEffect(() => { boot(); }, [boot]);

  // Unlimited-only difficulty tier, remembered across sessions. Daily mode
  // always uses buildGridPuzzle's default 'normal' behavior.
  const [difficulty, setDifficulty] = useState<GridDifficulty>(loadGridDifficulty);

  // --- Puzzle selection: date-seeded daily, random unlimited -----------------
  const todayStr = useMemo(() => getTodayET(), []);
  const dailyPuzzle = useMemo<GridPuzzle>(() => buildGridPuzzle(dateSeed(todayStr)), [todayStr]);
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<GridPuzzle | null>(null);

  const newUnlimitedPuzzle = useCallback(() => {
    setUnlimitedPuzzle(buildGridPuzzle(Math.floor(Math.random() * 1_000_000_000), difficulty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    if (mode === 'unlimited' && !unlimitedPuzzle) newUnlimitedPuzzle();
  }, [mode, unlimitedPuzzle, newUnlimitedPuzzle]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;

  // --- Per-mode board state: persisted for daily (localStorage), local-only for unlimited ---
  const dailyStorageKey = `nba-grid-daily-${todayStr}`;

  const [dailyCells, setDailyCells] = useState<Record<number, FilledCell>>(() => {
    try {
      const raw = localStorage.getItem(dailyStorageKey);
      if (!raw) return {};
      const saved = JSON.parse(raw) as { date: string; cells: Record<number, FilledCell>; wrong?: number };
      return saved.date === todayStr ? saved.cells : {};
    } catch { return {}; }
  });
  // Round 52: the wrong-guess count persists with the board. Reloading
  // mid-daily used to hand back a full guess budget with the cells intact.
  const [dailyWrongCount, setDailyWrongCount] = useState(() => {
    try {
      const raw = localStorage.getItem(dailyStorageKey);
      if (!raw) return 0;
      const saved = JSON.parse(raw) as { date: string; wrong?: number };
      return saved.date === todayStr ? (saved.wrong ?? 0) : 0;
    } catch { return 0; }
  });

  const [unlimitedCells, setUnlimitedCells] = useState<Record<number, FilledCell>>({});
  const [unlimitedWrongCount, setUnlimitedWrongCount] = useState(0);

  const cells = mode === 'daily' ? dailyCells : unlimitedCells;
  const wrongCount = mode === 'daily' ? dailyWrongCount : unlimitedWrongCount;

  useEffect(() => {
    if (mode !== 'daily') return;
    try {
      localStorage.setItem(dailyStorageKey, JSON.stringify({ date: todayStr, cells: dailyCells, wrong: dailyWrongCount }));
    } catch { /* private mode / quota */ }
  }, [dailyCells, dailyWrongCount, dailyStorageKey, todayStr, mode]);

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);

  const filledCount = Object.keys(cells).length;
  const gameOver = filledCount >= 9 || wrongCount >= GUESS_LIMIT;

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setActiveCell(null);
    setQuery('');
    if (m === 'unlimited' && !unlimitedPuzzle) newUnlimitedPuzzle();
  }, [unlimitedPuzzle, newUnlimitedPuzzle]);

  const resetUnlimited = useCallback(() => {
    setUnlimitedCells({});
    setUnlimitedWrongCount(0);
    setActiveCell(null);
    setQuery('');
    newUnlimitedPuzzle();
  }, [newUnlimitedPuzzle]);

  // Changing tier only applies in unlimited mode and starts a fresh grid.
  const changeDifficulty = useCallback((next: GridDifficulty) => {
    if (mode !== 'unlimited') return;
    setDifficulty((prev) => {
      if (prev === next) return prev;
      saveGridDifficulty(next);
      setUnlimitedPuzzle(buildGridPuzzle(Math.floor(Math.random() * 1_000_000_000), next));
      setUnlimitedCells({});
      setUnlimitedWrongCount(0);
      setActiveCell(null);
      setQuery('');
      return next;
    });
  }, [mode]);

  const guessedNames = useMemo(
    () => new Set(Object.values(cells).map((c) => normalize(c.playerName))),
    [cells],
  );

  const submitGuess = useCallback((entity: PlayerEntity) => {
    if (activeCell === null || !puzzle || !gridData || gameOver) return;
    const key = normalize(entity.rawName || entity.name);
    const indexed = gridData.byNormalizedName.get(key);
    if (!indexed) {
      setWrongFlash(activeCell);
      setTimeout(() => setWrongFlash(null), 1200);
      if (mode === 'daily') setDailyWrongCount((c) => c + 1); else setUnlimitedWrongCount((c) => c + 1);
      setActiveCell(null);
      setQuery('');
      return;
    }

    const row = Math.floor(activeCell / 3);
    const col = activeCell % 3;
    const cell = { row: puzzle.rows[row], col: puzzle.cols[col] };
    const valid = playerMatchesCell(indexed, cell) && !guessedNames.has(key);

    if (valid) {
      const filled: FilledCell = { playerName: indexed.name };
      if (mode === 'daily') setDailyCells((c) => ({ ...c, [activeCell]: filled }));
      else setUnlimitedCells((c) => ({ ...c, [activeCell]: filled }));
    } else {
      setWrongFlash(activeCell);
      setTimeout(() => setWrongFlash(null), 1200);
      if (mode === 'daily') setDailyWrongCount((c) => c + 1); else setUnlimitedWrongCount((c) => c + 1);
    }
    setActiveCell(null);
    setQuery('');
  }, [activeCell, puzzle, gridData, gameOver, mode, guessedNames]);

  useGameCompletion('nba-grid', mode === 'daily' && gameOver, filledCount * 100);

  const cellStatuses: CellStatus[] = useMemo(
    () => Array.from({ length: 9 }, (_, i) => (cells[i] ? 'correct' : 'empty')),
    [cells],
  );

  const isLoading = phase === 'boot' || !puzzle || !gridData;
  const emojiGrid = gridToEmoji(cellStatuses);

  return (
    <>
      <PageSeo
        title="NBA Franchise Grid: Daily Basketball Team Grid | DoUKnowBall"
        description="Fill a 3x3 NBA grid by naming players whose careers match both the row and column: franchises and career milestones. Free daily and unlimited basketball trivia grid."
        path="/nba-grid"
      />
      <GameShell help="none"
        width="wide"
        emoji="🏀"
        title="NBA FRANCHISE GRID"
        subtitle="Name a player who matches both the row and the column. 9 cells, 9 guesses."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play NBA Franchise Grid">
              <p className="text-muted-foreground text-center">
                Fill all 9 cells of the grid with real NBA players.
              </p>
              <section>
                <h3 className="font-bold text-foreground mb-2">Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Each cell needs a player whose career matches both the row and column</li>
                  <li>Rows and columns are franchises a player's career touched, or career milestones like 10,000+ points</li>
                  <li>Tap a cell, type a player name, and pick them from the list</li>
                  <li>Every name can only be used once on the board</li>
                  <li>You have 9 guesses total. Wrong guesses cost a guess but do not fill a cell</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Modes</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same grid and saves your progress. Unlimited generates a fresh random grid every time you finish or reset.
                </p>
              </section>
              <p className="text-muted-foreground text-center">A new daily grid drops every day at midnight.</p>
            </HowToPlayPopover>

            <div className="flex items-center justify-center gap-2 mt-4">
              {(['daily', 'unlimited'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                    mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {mode === 'unlimited' && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {(['easy', 'normal', 'hard'] as GridDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => changeDifficulty(d)}
                    className={cn(
                      'px-6 py-2 rounded-full text-sm font-semibold transition-all capitalize',
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-correct text-correct-foreground'
                          : d === 'hard'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Filled: <span className="font-semibold text-correct">{filledCount}</span>/9
              </span>
              <span className="text-muted-foreground">
                Guesses left: <span className="font-semibold text-foreground">{Math.max(0, GUESS_LIMIT - wrongCount)}</span>
              </span>
            </div>
          </>
        }
      >
        {isLoading && phase !== 'error' && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load NBA career data right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {!isLoading && puzzle && (
          <>
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-[80px_repeat(3,1fr)] sm:grid-cols-[110px_repeat(3,1fr)] gap-1.5 sm:gap-2">
                <div />
                {puzzle.cols.map((c) => (
                  <div key={c.id} className="flex items-center justify-center text-center px-1 py-2 rounded-lg bg-secondary text-[10px] sm:text-xs font-bold uppercase tracking-wide text-foreground min-h-[52px] sm:min-h-[64px]">
                    {c.label}
                  </div>
                ))}

                {puzzle.rows.map((r, rowIdx) => (
                  <Fragment key={r.id}>
                    <div className="flex items-center justify-center text-center px-1 py-2 rounded-lg bg-secondary text-[10px] sm:text-xs font-bold uppercase tracking-wide text-foreground min-h-[64px] sm:min-h-[80px]">
                      {r.label}
                    </div>
                    {puzzle.cols.map((c, colIdx) => {
                      const idx = rowIdx * 3 + colIdx;
                      const filled = cells[idx];
                      const isWrong = wrongFlash === idx;
                      const isActive = activeCell === idx;
                      return (
                        <button
                          key={`${r.id}-${c.id}`}
                          onClick={() => { if (!filled && !gameOver) { setActiveCell(idx); setQuery(''); } }}
                          disabled={Boolean(filled) || gameOver}
                          /* Round 251: an empty cell is an icon-less button,
                             which the accessibility sweep rightly called a
                             nameless control. Name the intersection. */
                          aria-label={filled ? `${r.label} and ${c.label}: ${filled.playerName}` : `Answer for ${r.label} and ${c.label}`}
                          className={cn(
                            'min-h-[64px] sm:min-h-[80px] rounded-lg border-2 flex items-center justify-center text-center px-1.5 py-1.5 transition-all',
                            filled ? 'bg-correct/10 border-correct' : isWrong ? 'bg-destructive/10 border-destructive animate-pulse' : isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
                            !filled && !gameOver && 'cursor-pointer',
                            gameOver && !filled && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {filled ? (
                            <span className="text-[11px] sm:text-sm font-bold text-foreground leading-tight break-words">
                              {filled.playerName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-lg">{isActive ? '?' : ''}</span>
                          )}
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            {activeCell !== null && !gameOver && (
              <div className="mt-6 max-w-md mx-auto">
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Find a player who is <span className="text-primary font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  + <span className="text-primary font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                <PlayerAutocomplete
                  value={query}
                  onChange={setQuery}
                  onSelect={submitGuess}
                  searchOptions={{ source: NBA_STATS_PLAYER_SOURCE, exclude: guessedNames }}
                  placeholder="Type an NBA player..."
                  validateOnly
                  autoFocus
                />
              </div>
            )}

            {gameOver && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={filledCount === 9}
                  outcomeEmoji={filledCount === 9 ? '🏆' : '🏀'}
                  headline={filledCount === 9 ? 'Grid Complete!' : 'Out of Guesses'}
                  statLine={<>You filled <span className="font-bold text-primary">{filledCount}</span>/9 cells</>}
                  funFact={
                    <span className="inline-flex items-center justify-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      {wrongCount} wrong {wrongCount === 1 ? 'guess' : 'guesses'}
                    </span>
                  }
                  emojiGrid={emojiGrid}
                  share={{
                    score: `${filledCount}/9 cells`,
                    gameName: 'NBA Franchise Grid',
                    gamePath: '/nba-grid',
                  }}
                  onPlayAgain={mode === 'unlimited' ? resetUnlimited : undefined}
                  playAgainLabel="New grid"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new grid!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567904" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-grid" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="NBA Franchise Grid | Daily Basketball Team Grid"
          description="A 3x3 grid puzzle where each cell needs an NBA player whose career satisfies both the row and column. Rows and columns mix franchises with career milestones like 10,000 points, 5,000 rebounds or 900 games played."
          howToPlay={[
            'Each cell in the 3x3 grid requires a player who satisfies both the row and column criteria.',
            'Rows and columns are franchises a career touched, or milestones like 10,000+ points.',
            'Tap a cell, type a name, and pick a real player from the suggestions.',
            'Each player can only be used once across the whole grid.',
            'You have 9 guesses to fill all 9 cells. Wrong guesses cost a guess.',
          ]}
          examples={[
            'Lakers + Celtics = a player who suited up for both sides of the rivalry.',
            'Bulls + 10,000+ Career Points = a Chicago scorer with five figures.',
            'Heat + Suns = remember who played in both Miami and Phoenix?',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default NbaGrid;
