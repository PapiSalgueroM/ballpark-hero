import { Fragment, useState, useCallback, useEffect, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { GridBoardSkeleton } from '@/components/game/GridBoardSkeleton';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { Link } from 'react-router-dom';
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
  CbbCategory,
  CbbCellStatus,
  CbbGridData,
  CbbGridPuzzle,
  CBB_PLAYER_SOURCE,
  buildCbbGridPuzzle,
  cbbGridToEmoji,
  eligibleSchools,
  fetchCbbGridData,
  playerMatchesCell,
} from '@/lib/cbbGrid';

/**
 * College Basketball Grid, built on src/lib/cbbGrid.ts (Round 363) and modelled
 * on NbaGrid.tsx. Keep the grid pages in lockstep if the mechanic changes.
 *
 * ONE REAL DIFFERENCE FROM ITS SIBLINGS, and it is a data fact rather than a
 * style choice. The franchise grids cross team with team, because professionals
 * move between franchises constantly. College players mostly attend one school:
 * among the thirty best represented schools only 36 pairs share three or more
 * players, and the best pair is Utah with Utah State at eight. So this board is
 * schools against achievements, and there is no all-schools hard mode to offer.
 * That also means no difficulty selector, which is why the header is simpler
 * than the NBA one rather than accidentally missing a control.
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

const CbbGrid = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [gridData, setGridData] = useState<CbbGridData | null>(null);
  const [mode, setMode] = useState<Mode>('daily');

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchCbbGridData();
    if (!d) {
      setPhase('error');
      return;
    }
    setGridData(d);
    setPhase('playing');
  }, []);

  useEffect(() => { boot(); }, [boot]);

  /* The school pool is DERIVED FROM THE LOADED DATA rather than listed in
     source. 407 schools qualify to different degrees, the table grows, and a
     hand kept list of "schools with enough players" is the stale allowlist this
     repo has already paid for twice. Only schools where every achievement
     clears the floor are eligible, so a board cannot be built with an
     unanswerable cell in it. */
  const schools = useMemo<CbbCategory[]>(
    () => (gridData ? eligibleSchools(gridData) : []),
    [gridData],
  );

  const todayStr = useMemo(() => getTodayET(), []);
  const dailyPuzzle = useMemo<CbbGridPuzzle | null>(
    () => (schools.length >= 3 ? buildCbbGridPuzzle(dateSeed(todayStr), schools) : null),
    [todayStr, schools],
  );
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<CbbGridPuzzle | null>(null);

  const newUnlimitedPuzzle = useCallback(() => {
    if (schools.length < 3) return;
    setUnlimitedPuzzle(buildCbbGridPuzzle(Math.floor(Math.random() * 1_000_000_000), schools));
  }, [schools]);

  useEffect(() => {
    if (mode === 'unlimited' && !unlimitedPuzzle) newUnlimitedPuzzle();
  }, [mode, unlimitedPuzzle, newUnlimitedPuzzle]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;

  const dailyStorageKey = `cbb-grid-daily-${todayStr}`;

  const [dailyCells, setDailyCells] = useState<Record<number, FilledCell>>(() => {
    try {
      const raw = localStorage.getItem(dailyStorageKey);
      if (!raw) return {};
      const saved = JSON.parse(raw) as { date: string; cells: Record<number, FilledCell>; wrong?: number };
      return saved.date === todayStr ? saved.cells : {};
    } catch { return {}; }
  });
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

  useGameCompletion('cbb-grid', mode === 'daily' && gameOver, filledCount * 100);

  const cellStatuses: CbbCellStatus[] = useMemo(
    () => Array.from({ length: 9 }, (_, i) => (cells[i] ? 'correct' : 'empty')),
    [cells],
  );

  const isLoading = phase === 'boot' || !puzzle || !gridData;
  const emojiGrid = cbbGridToEmoji(cellStatuses);

  return (
    <>
      <PageSeo
        title="College Basketball Grid: Daily CBB Team Grid | DoUKnowBall"
        description="Fill a 3x3 college basketball grid by naming players who match both the school and the career achievement. Free daily and unlimited CBB trivia grid."
        path="/cbb-grid"
      />
      <GameShell help="none"
        width="wide"
        emoji="🏀"
        title="COLLEGE BASKETBALL GRID"
        subtitle="Name a player who matches both the school and the achievement. 9 cells, 9 guesses."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play College Basketball Grid">
              <p className="text-muted-foreground text-center">
                Fill all 9 cells of the grid with real college basketball players.
              </p>
              <section>
                <h3 className="font-bold text-foreground mb-2">Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Each cell needs a player who matches both the row and the column</li>
                  <li>Rows are schools a player suited up for, columns are career achievements like 1,500+ points</li>
                  <li>Tap a cell, type a player name, and pick them from the list</li>
                  <li>Every name can only be used once on the board</li>
                  <li>You have 9 guesses total. Wrong guesses cost a guess but do not fill a cell</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Why schools sit against achievements</h3>
                <p className="text-muted-foreground">
                  The pro grids cross one team with another because pros move clubs all the time. College players mostly
                  stay at one school, so a school against school board would be full of cells nobody could answer. Every
                  crossing here has at least ten real players behind it.
                </p>
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
          <GridBoardSkeleton variant="franchise" />
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load college basketball career data right now.</p>
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
                  Find a player who played for <span className="text-primary font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  and has <span className="text-primary font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                <PlayerAutocomplete
                  value={query}
                  onChange={setQuery}
                  onSelect={submitGuess}
                  searchOptions={{ source: CBB_PLAYER_SOURCE, exclude: guessedNames }}
                  placeholder="Type a college player..."
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
                    gameName: 'College Basketball Grid',
                    gamePath: '/cbb-grid',
                  }}
                  onPlayAgain={mode === 'unlimited' ? resetUnlimited : undefined}
                  playAgainLabel="New grid"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new grid!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="cbb-grid" />
        </div>

        {/* The archive is reachable from the game it belongs to, so it is part
            of the site rather than a page only a sitemap knows about. */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Missed a day?{' '}
          <Link to="/cbb-grid/archive" className="underline hover:text-foreground">
            See past boards and who solves them
          </Link>
          .
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="College Basketball Grid | Daily CBB Team Grid"
          description="A 3x3 grid puzzle where each cell needs a college basketball player who both suited up for the school in that row and reached the career achievement in that column, drawn from nearly 40,000 players across 407 programs."
          howToPlay={[
            'Each cell in the 3x3 grid needs a player who satisfies both the row and the column.',
            'Rows are schools a player suited up for. Columns are career achievements like 1,500+ points or 120+ games.',
            'Tap a cell, type a name, and pick a real player from the suggestions.',
            'Each player can only be used once across the whole grid.',
            'You have 9 guesses to fill all 9 cells. Wrong guesses cost a guess.',
          ]}
          examples={[
            'Kentucky + 1,500+ Career Points = a Wildcat who put up five figures of scoring over four years.',
            'Kansas + 350+ Career Assists = a Jayhawk point guard who ran the offence.',
            'Duke + Played in the 1990s = a Blue Devil from the Hurley and Laettner era.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default CbbGrid;
