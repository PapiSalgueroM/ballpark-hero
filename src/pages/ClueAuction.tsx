import { FlagImg, TextWithFlags } from '@/components/FlagImg';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, RotateCcw, Search, Check, X, Lock, Coins } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { fmtCompactUsd } from '@/lib/dealPlayers';
import {
  WhoAmIData,
  WhoAmIPlayer,
  fetchWhoAmIPool,
  pickSecret,
  shortPosition,
  suggestPlayers,
} from '@/lib/whoAmI';
import {
  CLUE_BY_ID,
  CLUE_MENU,
  ClueDef,
  ClueId,
  ClueReveals,
  START_BANK,
  WRONG_GUESS_COST,
  buildClubDisplayMap,
  buildClueReveals,
} from '@/lib/clueAuction';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';

type Phase = 'boot' | 'error' | 'playing' | 'won' | 'lost';

const BEST_KEY = 'clue_auction_best_v1';

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

const bankColor = (bank: number) =>
  bank > 50 ? 'text-correct' : bank > 20 ? 'text-yellow-500' : 'text-destructive';

const ClueAuction = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<WhoAmIData | null>(null);
  const [secret, setSecret] = useState<WhoAmIPlayer | null>(null);
  const [reveals, setReveals] = useState<ClueReveals | null>(null);
  const [bank, setBank] = useState(START_BANK);
  const [purchased, setPurchased] = useState<ClueId[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<WhoAmIPlayer[]>([]);
  // Round 62: the owner's no scroll rule. Buying a clue or missing a guess
  // adds a receipt row further down the page, so the receipts pull themselves
  // back into view instead of leaving you staring at the button you pressed.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${purchased.length}:${wrongGuesses.length}`,
  );
  const [input, setInput] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [best, setBest] = useState(() => loadBest());
  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = useCallback((d: WhoAmIData, excludeName?: string) => {
    const s = pickSecret(d.pool, excludeName);
    setSecret(s);
    setReveals(buildClueReveals(s, d.clubHistory.get(s.name), buildClubDisplayMap(d.pool)));
    setBank(START_BANK);
    setPurchased([]);
    setWrongGuesses([]);
    setInput('');
    setDropOpen(false);
    setPhase('playing');
  }, []);

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchWhoAmIPool();
    if (!d) {
      setPhase('error');
      return;
    }
    setData(d);
    startGame(d);
  }, [startGame]);

  useEffect(() => { boot(); }, [boot]);

  const wrongNames = useMemo(() => new Set(wrongGuesses.map(p => p.name)), [wrongGuesses]);

  const suggestions = useMemo(() => {
    if (!data || phase !== 'playing') return [];
    return suggestPlayers(data.pool, input, wrongNames, 8);
  }, [data, phase, input, wrongNames]);

  const buyClue = (c: ClueDef) => {
    if (phase !== 'playing' || !reveals) return;
    if (purchased.includes(c.id) || reveals[c.id] === null || c.price >= bank) return;
    setBank(b => b - c.price);
    setPurchased(p => [...p, c.id]);
  };

  const submitGuess = (p: WhoAmIPlayer) => {
    if (phase !== 'playing' || !secret || wrongNames.has(p.name)) return;
    setInput('');
    setDropOpen(false);
    if (p.name === secret.name) {
      setPhase('won');
      if (bank > best) {
        setBest(bank);
        try { localStorage.setItem(BEST_KEY, String(bank)); } catch { /* private mode */ }
      }
      return;
    }
    const nextBank = bank - WRONG_GUESS_COST;
    setWrongGuesses(w => [...w, p]);
    setBank(Math.max(0, nextBank));
    if (nextBank <= 0) setPhase('lost');
    else inputRef.current?.focus();
  };

  /* Round 299, the scoring audit: this page never recorded a play, so a
     finished auction earned no streak day, no played-today credit and no
     points. A round ends when submitGuess moves the phase to won or lost.
     The ref arms on each new round (phase back to playing) so New case can
     record again, and fires exactly once per round. The score is the same
     number the end screen shows: the bank left on a win, and 0 on a loss
     (the bank is literally at zero when the lost phase lands, both set in
     the same submitGuess). */
  const completionRef = useRef(false);
  useEffect(() => {
    if (phase === 'playing') completionRef.current = false;
    if ((phase !== 'won' && phase !== 'lost') || completionRef.current) return;
    completionRef.current = true;
    recordCompletion('/clue-auction', phase === 'won' ? bank : 0, getCurrentPlayerName());
  }, [phase, bank]);

  const won = phase === 'won';
  const cluesLine = `🛒 ${purchased.length} ${purchased.length === 1 ? 'clue' : 'clues'} bought · ❌ ${wrongGuesses.length} wrong`;
  const emojiGrid = won
    ? `💰 Clue Auction: ${bank}/${START_BANK} banked\n${cluesLine}`
    : `💰 Clue Auction: busted at 0/${START_BANK}\n${cluesLine}`;

  const verdict = won
    ? bank >= 90
      ? 'Barely spent a thing. Scary knowledge.'
      : bank >= 60
      ? 'A lean investigation. The bank approves.'
      : bank >= 30
      ? 'The clues did some lifting, but a win is a win.'
      : 'Scraped home with the bank on fumes.'
    : 'The bank ran dry before the name clicked. Here is the man who got away.';

  const bestNote = won
    ? bank >= best && bank > 0
      ? 'New personal best.'
      : best > 0
      ? `Your best is ${best}.`
      : ''
    : best > 0
    ? `Your best win is ${best}.`
    : '';

  const clueCard = (c: ClueDef) => {
    const value = reveals ? reveals[c.id] : null;
    const bought = purchased.includes(c.id);
    const unavailable = value === null;
    const tooPricey = !bought && !unavailable && c.price >= bank;
    return (
      <div
        key={c.id}
        className={cn(
          'bg-card border rounded-xl p-3 flex flex-col gap-1.5',
          bought ? 'border-correct/50' : 'border-border',
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{c.emoji}</span>
          <span className="text-xs sm:text-sm font-semibold text-foreground flex-1 truncate">{c.label}</span>
          <span className={cn('text-[11px] font-bold shrink-0', bought ? 'text-muted-foreground line-through' : 'text-primary')}>
            {c.price}
          </span>
        </div>
        {bought ? (
          <div className="flex items-start gap-1 text-sm font-semibold text-correct">
            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words text-left"><TextWithFlags text={value} size={14} /></span>
          </div>
        ) : unavailable ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto">
            <Lock className="w-3 h-3 shrink-0" /> Not available for this player
          </div>
        ) : (
          <>
            <div className="text-[11px] text-muted-foreground leading-snug">{c.teaser}</div>
            <button
              onClick={() => buyClue(c)}
              disabled={tooPricey}
              className={cn(
                'w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-opacity mt-auto',
                tooPricey
                  ? 'bg-secondary/60 text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {tooPricey ? 'Not enough points' : `Buy for ${c.price}`}
            </button>
          </>
        )}
      </div>
    );
  };

  const revealCard = secret ? (
    <div className="bg-secondary/40 border border-border rounded-xl p-4 mb-4">
      <div className="mb-1"><FlagImg name={secret.nationality} size={40} /></div>
      <div className="text-xl font-bold text-foreground">{secret.name}</div>
      <div className="text-sm text-muted-foreground mb-3">{secret.club}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</div>
          <div className="font-bold text-foreground text-sm">{shortPosition(secret.position)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Age</div>
          <div className="font-bold text-foreground text-sm">{secret.age}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</div>
          <div className="font-bold text-primary text-sm">{fmtCompactUsd(secret.value)}</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <main id="dukb-main" className="min-h-screen bg-background">
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <PageSeo
        title="Clue Auction: Buy Clues, Guess the Footballer | DoUKnowBall"
        description="A secret footballer and a bank of 100 points. Buy clues like nationality, current club and age bracket, guess whenever you dare, and keep the rest as your score. Free, no sign-up."
        path="/clue-auction"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            CLUE AUCTION
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            One secret star. Clues cost points, wrong guesses cost more, and whatever you keep is your score.
          </p>
        </header>

        {phase === 'boot' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Setting up the auction room...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button
              onClick={boot}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'playing' && secret && reveals && (
          <>
            <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  Bank, and your score if you solve it now
                </div>
                <div className={cn('flex items-center gap-1.5 text-3xl font-bold font-display', bankColor(bank))}>
                  <Coins className="w-6 h-6" /> {bank}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                {best > 0 && (
                  <div>
                    Best win <span className="text-primary font-bold">{best}</span>
                  </div>
                )}
                <div className="text-destructive font-semibold">Wrong guess -{WRONG_GUESS_COST}</div>
              </div>
            </div>

            <div className="relative mb-4">
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 focus-within:border-primary/60 transition-colors">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    setDropOpen(true);
                  }}
                  onFocus={() => setDropOpen(true)}
                  onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && suggestions.length > 0) submitGuess(suggestions[0]);
                    if (e.key === 'Escape') {
                      setInput('');
                      setDropOpen(false);
                    }
                  }}
                  placeholder="Name the secret player (2+ letters)"
                  aria-label="Name the secret player"
                  className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              {dropOpen && input.trim().length >= 2 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg max-h-72 overflow-y-auto">
                  {suggestions.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                      No player in the pool matches that. Try another name.
                    </div>
                  ) : (
                    suggestions.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          submitGuess(p);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/60 transition-colors"
                      >
                        <FlagImg name={p.nationality} size={18} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-foreground truncate">{p.name}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {shortPosition(p.position)} · {p.club}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{fmtCompactUsd(p.value)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {purchased.length === 0 && wrongGuesses.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground text-center mb-4">
                Nothing is known yet. Buy a clue below, or go full psychic and guess cold for the perfect 100.
              </div>
            )}

            {wrongGuesses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {wrongGuesses.map(p => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive text-[11px] font-medium"
                  >
                    <X className="w-3 h-3" /> <FlagImg name={p.nationality} size={14} /> {p.name} (-{WRONG_GUESS_COST})
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Clue shop · each sells once
              </div>
              <div className="text-[10px] text-muted-foreground">Menu totals 155. Choose wisely.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">{CLUE_MENU.map(clueCard)}</div>
          </>
        )}

        {(phase === 'won' || phase === 'lost') && secret && (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">{won ? (bank >= 90 ? '🧠' : bank >= 60 ? '🕵️' : '💸') : '🫥'}</div>
            <h2 className="text-2xl font-bold text-primary font-display mb-1">
              {won ? `Solved it with ${bank} points left` : 'Bank empty. Case closed.'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {verdict}
              {bestNote ? ` ${bestNote}` : ''}
            </p>
            {revealCard}
            {(purchased.length > 0 || wrongGuesses.length > 0) && (
              <div ref={revealRef} className="text-left space-y-1.5 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your receipts</div>
                {purchased.map(id => {
                  const c = CLUE_BY_ID[id];
                  return (
                    <div key={id} className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-3 py-2">
                      <span>{c.emoji}</span>
                      <span className="text-xs text-muted-foreground w-28 shrink-0">{c.label}</span>
                      <span className="text-sm font-semibold text-foreground flex-1 min-w-0 break-words">
                        <TextWithFlags text={reveals ? reveals[id] ?? '' : ''} size={14} />
                      </span>
                      <span className="text-[11px] text-destructive font-bold shrink-0">-{c.price}</span>
                    </div>
                  );
                })}
                {wrongGuesses.length > 0 && (
                  <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-3 py-2">
                    <span>❌</span>
                    <span className="text-xs text-muted-foreground w-28 shrink-0">Wrong guesses</span>
                    <span className="text-sm font-semibold text-foreground flex-1 min-w-0 break-words">
                      {wrongGuesses.map(p => p.name).join(', ')}
                    </span>
                    <span className="text-[11px] text-destructive font-bold shrink-0">
                      -{wrongGuesses.length * WRONG_GUESS_COST}
                    </span>
                  </div>
                )}
              </div>
            )}
            {purchased.length === 0 && wrongGuesses.length === 0 && won && (
              <p className="text-sm text-muted-foreground mb-4">No clues bought, no misses. Pure instinct.</p>
            )}
            <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2 font-sans">{emojiGrid}</pre>
            <ShareButtons
              score={won ? String(bank) : 'X'}
              gameName="Clue Auction"
              gamePath="/clue-auction"
              customText={
                won
                  ? `Solved it with ${bank} points left on Clue Auction at DoUKnowBall! Can you beat me? douknowball.com/clue-auction`
                  : `The Clue Auction cleaned me out. Think you can keep your points? douknowball.com/clue-auction`
              }
              emojiGrid={emojiGrid}
            />
            <button
              onClick={() => data && startGame(data, secret.name)}
              className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" /> New case
            </button>
          </div>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="clue-auction" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Clue Auction: The Secret Footballer Market"
          description="One secret footballer and a bank of 100 points. Every clue has a price, every wrong guess burns 10, and whatever you are still holding when you name him is your score. Spend like a scout, not like a sheikh."
          howToPlay={[
            'A secret footballer is drawn from the market value elite.',
            'You start with 100 points in the bank. That bank is your score.',
            'Buy clues from the menu: nationality, position, age bracket, value band, club initial, current club, career club count and one former club. Each sells once.',
            'Guess whenever you like by typing 2 or more letters and picking from the suggestions. A wrong guess costs 10 points.',
            'Name him to bank whatever is left. If the bank hits zero, he walks and the round is lost.',
          ]}
          examples={[
            'Name him with no clues on your first try and you post a perfect 100.',
            'Nationality plus current club burns 60 points, so the 10-point clues are often the smarter shop.',
          ]}
        />
        <GameNav />
      </div>
    </main>
  );
};

export default ClueAuction;
