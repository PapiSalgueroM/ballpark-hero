import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Gavel, Loader2, Trophy, RotateCcw, Ban } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  AUCTION_SLOTS, AUCTION_THEMES, BID_STEPS, START_BUDGET,
  applySale, auctionScore, buildAuctionPool, createBidders,
  decayFloorFor, decaySnapper, fillOpenChairs, nextDecayPrice,
  orderLots, runRivalBids, simulateShowdown,
  type AuctionPlayer, type AuctionTheme, type Bidder, type BidderId, type ShowdownResult,
} from '@/lib/auctionHouse';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'intro' | 'loading' | 'auction' | 'showdown';

interface Lot { player: AuctionPlayer; kind: 'auction'; pass: 1 | 2; headline?: boolean }

const money = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(2)}B` : `£${m}M`);

const SignThePlayer = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [theme, setTheme] = useState<AuctionTheme>('current');
  const [bidders, setBidders] = useState<Bidder[]>(createBidders());
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotIndex, setLotIndex] = useState(0);
  const [price, setPrice] = useState(0);
  const [leader, setLeader] = useState<Bidder['id'] | null>(null);
  // Round 62: the owner's no scroll rule. A new lot or a new leading bid is
  // the thing you need to see, so the auction panel pulls itself into view.
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${lotIndex}:${price}:${leader ?? ''}`);
  const [activeIds, setActiveIds] = useState<Set<Bidder['id']>>(new Set());
  const [log, setLog] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [result, setResult] = useState<ShowdownResult | null>(null);
  const [weakFills, setWeakFills] = useState<AuctionPlayer[]>([]);
  const [decaying, setDecaying] = useState(false);
  const timer = useRef<number | null>(null);
  /* Round 441: a lot withdrawn unsold joins the end of auction fill list, so
     two squads short of the same position never sign the same man. A ref, not
     state, because the settle timer reads it after the closure was captured. */
  const unsold = useRef<AuctionPlayer[]>([]);

  const you = bidders.find(b => b.id === 'you')!;
  const lot = lots[lotIndex] ?? null;
  const slotsLeftAfter = useMemo(
    () => (lot ? AUCTION_SLOTS.length - AUCTION_SLOTS.findIndex(s => s.key === lot.player.slotKey) - 1 : 0),
    [lot],
  );

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const start = async (t: AuctionTheme) => {
    setTheme(t);
    setPhase('loading');
    const pool = await buildAuctionPool(t);
    if (!pool) { setPhase('intro'); return; }
    /* Round 327, the owner's auction spec: two passes, random position
       order, the most valuable player headlining the close, the weak band
       reserved for the end of auction fill. The law lives in
       auctionHouse.orderLots where the harness can hold it. */
    const { lots: ordered, weakFills: fills } = orderLots(pool);
    setBidders(createBidders());
    setWeakFills(fills);
    unsold.current = [];
    setLots(ordered.map(l => ({ player: l.player, kind: 'auction' as const, pass: l.pass, headline: l.headline })));
    setLotIndex(0);
    setResult(null);
    setLog([]);
    setPhase('auction');
  };

  const eligible = useCallback((b: Bidder, p: AuctionPlayer) => b.squad[p.slotKey] === null && b.budget >= 5, []);

  const advance = useCallback(() => {
    if (lotIndex + 1 >= lots.length) {
      /* Round 327, "fill the roster then settle it in a sim": every hole
         left when the last hammer falls is filled at the assignment fee,
         budget floored at zero. Nobody plays the showdown a man short.
         Round 441: and nobody signs a man another squad already has, so the
         withdrawn lots join the journeymen in the fill list. */
      setBidders(prev => {
        const filled = fillOpenChairs(prev, [...weakFills, ...unsold.current]);
        setResult(simulateShowdown(filled));
        return filled;
      });
      setLog(l => ['📋 The hammer has fallen for the last time. Every open chair is filled from the journeyman list at a fee.', ...l].slice(0, 30));
      setPhase('showdown');
    } else {
      setLotIndex(i => i + 1);
      setPhase('auction');
    }
  }, [lotIndex, lots.length, weakFills]);

  const settleLot = useCallback((winnerId: BidderId | null, finalPrice: number) => {
    if (!lot) return;
    const soldTo = winnerId;
    const soldFor = finalPrice;
    /* Round 327: the forced sale is gone. A lot nobody wants DECAYS instead
       (see startDecay), and a lot that reaches the floor goes unsold; the
       end of auction fill guarantees no squad plays a man short. */
    if (soldTo) {
      const finalTo = soldTo;
      const price2 = soldFor;
      setBidders(prev => applySale(prev, lot.player, finalTo, price2));
      const w = bidders.find(b => b.id === finalTo);
      setLog(l => [`✅ SOLD! ${lot.player.name} to ${w?.name} for ${money(price2)}.`, ...l].slice(0, 30));
    } else {
      if (!unsold.current.some(p => p.name === lot.player.name)) unsold.current = [...unsold.current, lot.player];
      setLog(l => [`🪦 UNSOLD. ${lot.player.name} found no takers even at ${money(finalPrice)}. The lot is withdrawn, he goes on the fill list.`, ...l].slice(0, 30));
    }
    setDecaying(false);
    setAiThinking(false);
    window.setTimeout(() => advance(), 650);
  }, [lot, bidders, advance]);

  /* Round 327, the decay: nobody bit at list price, so the price falls a
     step at a time. Each step every eligible rival rolls to snap the
     bargain (the deeper the discount, the harder to resist), and the TAKE
     button lets you snap it first. The floor withdraws the lot. */
  const startDecay = useCallback((fromPrice: number) => {
    if (!lot) return;
    setDecaying(true);
    setLeader(null);
    const floor = decayFloorFor(lot.player.basePrice);
    const step = (p: number) => {
      const next = nextDecayPrice(p);
      if (next <= floor) { settleLot(null, p); return; }
      setPrice(next);
      setLog(l => [`📉 No takers. The price falls to ${money(next)}.`, ...l].slice(0, 30));
      const snapper = decaySnapper(bidders, lot.player, next, slotsLeftAfter);
      if (snapper) { window.setTimeout(() => settleLot(snapper, next), 500); return; }
      timer.current = window.setTimeout(() => step(next), 950);
    };
    timer.current = window.setTimeout(() => step(fromPrice), 950);
  }, [lot, bidders, slotsLeftAfter, settleLot]);

  /* You snap a decaying lot at the current price. */
  const userTake = () => {
    if (!lot || phase !== 'auction' || !decaying) return;
    if (you.budget < price || you.squad[lot.player.slotKey] !== null) return;
    if (timer.current) window.clearTimeout(timer.current);
    settleLot('you', price);
  };

  const runAis = useCallback((currentPrice: number, currentLeader: BidderId | null, active: Set<BidderId>) => {
    if (!lot) return;
    setAiThinking(true);
    /* Round 441: the whole rival exchange is computed by the engine (see
       runRivalBids in auctionHouse), then REPLAYED raise by raise here so the
       room feels live: each bid lands on its own beat, not in a dump. */
    const ex = runRivalBids({
      lot: lot.player, bidders, active, price: currentPrice, leader: currentLeader, slotsLeftAfter,
    });
    const finish = () => {
      setActiveIds(new Set(ex.active));
      setAiThinking(false);
      if (ex.outcome === 'sold' && ex.winner) settleLot(ex.winner, ex.price);
      else if (ex.outcome === 'decay') startDecay(ex.price);
    };
    const stepPlay = (i: number) => {
      if (i >= ex.events.length) { finish(); return; }
      const ev = ex.events[i];
      const b = bidders.find(x => x.id === ev.bidderId);
      setPrice(ev.price);
      setLeader(ev.leader);
      setLog(l => [ev.kind === 'bid' ? `${b?.emoji} ${b?.name} bids ${money(ev.price)}!` : `${b?.emoji} ${b?.name} is OUT.`, ...l].slice(0, 30));
      timer.current = window.setTimeout(() => stepPlay(i + 1), 460 + Math.random() * 340);
    };
    if (ex.events.length === 0) { finish(); return; }
    timer.current = window.setTimeout(() => stepPlay(0), 350);
  }, [lot, bidders, slotsLeftAfter, settleLot, startDecay]);

  const userBid = (step: number) => {
    if (!lot || phase !== 'auction' || aiThinking || !activeIds.has('you')) return;
    const newPrice = leader === null ? price : price + step;
    if (you.budget < newPrice) return;
    setPrice(newPrice);
    setLeader('you');
    setLog(l => [`🫵 You bid ${money(newPrice)}.`, ...l].slice(0, 30));
    runAis(newPrice, 'you', new Set(activeIds));
  };

  const userPass = () => {
    if (!lot || phase !== 'auction' || aiThinking || !activeIds.has('you')) return;
    const act = new Set(activeIds);
    act.delete('you');
    setActiveIds(act);
    setLog(l => ['🫵 You pass.', ...l].slice(0, 30));
    const remaining = [...act];
    if (remaining.length === 0) {
      if (leader) settleLot(leader, price);
      else startDecay(price);
    }
    else if (remaining.length === 1 && leader === remaining[0]) settleLot(remaining[0], price);
    else runAis(price, leader, act);
  };

  /* Opening a lot. Round 441 moved this below runAis so it can start the
     rivals ITSELF when you have no say in this one.
     THE BUG IT KILLS: the rivals used to be started by a second effect keyed
     on whether you were active, and an effect keyed on a flag only fires when
     that flag CHANGES. Two lots in a row you could not bid on, which is any
     two positions you already own coming up back to back in the second pass,
     and the room simply stopped: no buttons, nothing on a timer, no way to
     reach the showdown. Measured in jsdom on this page, the auction died on
     lot 13 of 22. */
  useEffect(() => {
    if (phase !== 'auction' || !lot) return;
    const active = new Set(bidders.filter(b => eligible(b, lot.player)).map(b => b.id));
    setActiveIds(active);
    setPrice(lot.player.basePrice);
    setLeader(null);
    setLog(l => [`🔨 LOT ${lotIndex + 1}: ${lot.player.name} (${lot.player.rating}) opens at ${money(lot.player.basePrice)}.`, ...l].slice(0, 30));
    if (!active.has('you')) {
      setAiThinking(true);
      runAis(lot.player.basePrice, null, active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lotIndex, lots]);

  const score = result ? auctionScore(result, you) : 0;
  useGameCompletion('sign-the-player', phase === 'showdown' && !!result, score, result?.champion === 'you' ? 1 : 0);

  const squadList = (b: Bidder) => AUCTION_SLOTS.map(s => ({ slot: s, p: b.squad[s.key] }));

  return (
    <>
      <PageSeo
        title="Sign the Player: Auction House | DoUKnowBall"
        description="Three bidders, one room. Lots open at list price in a random position order, contested lots turn into bidding wars, unwanted lots decay until someone bites, and the most valuable player headlines the close. Fill your XI, then the showdown sim decides."
        path="/sign-the-player"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(260 30% 8%) 0%, hsl(230 30% 7%) 55%, hsl(150 25% 6%) 100%)' }}>
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-5xl mx-auto space-y-5">

            {phase === 'intro' && (
              <div className="text-center space-y-5">
                <Gavel className="w-12 h-12 sm:w-14 sm:h-14 text-primary mx-auto" />
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Sign the <span className="text-primary">Player</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  The auction: you vs <b>The Sheikh</b> vs <b>Moneyball Mike</b>, £1B each.
                  Every position sells its <b>good</b> player first, then the <b>superstar</b>,
                  and whoever misses out takes the stinker (and still pays the fee).
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {AUCTION_THEMES.map(t => (
                    <Button key={t.id} size="lg" variant={t.id === 'current' ? 'default' : 'outline'} className="text-base px-6 py-6 font-bold" onClick={() => start(t.id)}>
                      {t.emoji} {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {phase === 'loading' && <div className="text-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>}

            {phase === 'auction' && lot && (
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 space-y-4">
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border text-sm font-bold text-foreground">
                      <Gavel className="w-4 h-4 text-primary" /> Lot {lotIndex + 1}/{lots.length} · {AUCTION_SLOTS.find(s => s.key === lot.player.slotKey)?.label}
                    </span>
                  </div>

                  {/* Round 327, "the rest of the lot stays hidden": the room
                      sees the running order as positions only. Names exist
                      the moment their lot opens and not before. */}
                  <div className="flex flex-wrap gap-1 justify-center text-[10px] font-bold uppercase tracking-wide">
                    {lots.map((l, i) => (
                      <span key={i} className={cn('px-1.5 py-0.5 rounded',
                        i < lotIndex ? 'bg-secondary/50 text-muted-foreground line-through' :
                        i === lotIndex ? 'bg-primary text-primary-foreground' :
                        'bg-secondary/70 text-muted-foreground')}>
                        {l.headline ? '🎇 ' : ''}{AUCTION_SLOTS.find(sl => sl.key === l.player.slotKey)?.label ?? l.player.slotKey}{l.pass === 2 && !l.headline ? ' ⭐' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-md p-6 text-center space-y-2 shadow-lg shadow-primary/10">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      {lot.headline ? '🎇 THE HEADLINE LOT: the most valuable player in the room' : lot.pass === 2 ? '⭐ Second time around this position: the elite band' : '🥈 First look at this position'}
                    </p>
                    <h2 className="text-3xl font-extrabold text-foreground">{lot.player.name}</h2>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
                      <FlagImg name={lot.player.nationality} size={16} /> {lot.player.club} · {lot.player.position}{theme !== 'legends' && lot.player.age > 0 ? ` · age ${lot.player.age}` : ''}
                    </p>
                    <p className="text-5xl font-black text-primary">{lot.player.rating}</p>
                    {(lot.player.goals > 0 || lot.player.assists > 0) && (
                      <p className="text-xs text-muted-foreground font-semibold">⚽ {lot.player.goals} goals · 🎯 {lot.player.assists} assists</p>
                    )}
                    {lot.kind === 'auction' && (
                      <div ref={revealRef}>
                        <p className="text-lg font-bold text-foreground">
                          Current price: <span className="text-primary">{money(price)}</span>
                          {leader && <span className="text-sm text-muted-foreground">, {bidders.find(b => b.id === leader)?.emoji} {bidders.find(b => b.id === leader)?.name} leads</span>}
                        </p>
                        {decaying ? (
                          <div className="flex flex-wrap gap-2 justify-center pt-1">
                            <Button size="lg" className="font-bold" disabled={you.budget < price || you.squad[lot.player.slotKey] !== null} onClick={userTake}>
                              Take him at {money(price)}
                            </Button>
                            <p className="w-full text-xs text-muted-foreground italic">Nobody bit at list price, so it falls until somebody does. The floor withdraws the lot.</p>
                          </div>
                        ) : activeIds.has('you') ? (
                          <div className="flex flex-wrap gap-2 justify-center pt-1">
                            {leader === null ? (
                              <Button size="lg" className="font-bold" disabled={aiThinking || you.budget < price} onClick={() => userBid(0)}>
                                Open at {money(price)}
                              </Button>
                            ) : (
                              BID_STEPS.map(s => (
                                <Button key={s} size="lg" className="font-bold" disabled={aiThinking || leader === 'you' || you.budget < price + s} onClick={() => userBid(s)}>
                                  Bid +{s}M
                                </Button>
                              ))
                            )}
                            <Button size="lg" variant="outline" className="font-bold" disabled={aiThinking || leader === 'you'} onClick={userPass}>
                              <Ban className="w-4 h-4 mr-1" /> Pass
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{you.squad[lot.player.slotKey] ? 'You already own this position, so the rivals are fighting it out...' : 'You passed, so the rivals battle on...'}</p>
                        )}
                        {aiThinking && <p className="text-xs text-primary animate-pulse font-bold">rivals are thinking…</p>}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-card/60 p-3 max-h-44 overflow-y-auto text-left space-y-1">
                    {log.map((l, i) => <p key={i} className={cn('text-xs', i === 0 ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{l}</p>)}
                  </div>
                </div>

                <div className="w-full lg:w-[340px] shrink-0 space-y-3">
                  {bidders.map(b => (
                    <div key={b.id} className={cn('rounded-2xl border p-3', leader === b.id && phase === 'auction' ? 'border-primary bg-primary/5' : 'border-border bg-card/60')}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-extrabold text-foreground">{b.emoji} {b.name}</p>
                        <p className="text-sm font-black text-primary">{money(Math.round(b.budget))}</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(b.budget / START_BUDGET) * 100}%` }} />
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {squadList(b).map(({ slot, p }) => (
                          <div
                            key={slot.key}
                            className={cn(
                              'flex items-center justify-between rounded px-1.5 py-[3px] text-[10px] leading-tight',
                              p ? 'bg-primary/10' : 'bg-secondary/40',
                              lot && slot.key === lot.player.slotKey && phase === 'auction' && 'ring-1 ring-primary/60',
                            )}
                          >
                            <span className="font-bold text-muted-foreground w-9 shrink-0">{slot.key}</span>
                            {p ? (
                              <>
                                <span className="flex-1 truncate text-foreground font-semibold px-1">{p.name}</span>
                                <span className="font-black text-primary shrink-0">{p.rating}</span>
                              </>
                            ) : (
                              <span className="flex-1 text-muted-foreground/50 px-1">open</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === 'showdown' && result && (
              <div className="max-w-2xl mx-auto space-y-4 text-center">
                <Trophy className="w-10 h-10 text-primary mx-auto" />
                <h2 className="text-3xl font-extrabold text-foreground">
                  {result.champion === 'you' ? 'YOU WIN THE SHOWDOWN! 🏆' : `${result.table[0].emoji} ${result.table[0].name} takes the title`}
                </h2>
                <div className="rounded-2xl border border-border bg-card/70 p-4 text-left">
                  <div className="grid grid-cols-6 text-[11px] uppercase tracking-wider text-muted-foreground font-bold pb-1 border-b border-border">
                    <span className="col-span-2">Club</span><span>Squad</span><span>Pts</span><span>GD</span><span>Bank</span>
                  </div>
                  {result.table.map((r, i) => (
                    <div key={r.bidderId} className={cn('grid grid-cols-6 py-1.5 text-sm border-b border-border/40 last:border-0', r.bidderId === 'you' ? 'text-primary font-bold' : 'text-foreground')}>
                      <span className="col-span-2">{i + 1}. {r.emoji} {r.name}</span>
                      <span>{r.rating}</span>
                      <span>{r.points}</span>
                      <span>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span>
                      <span>{money(r.moneyLeft)}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3 text-left space-y-1 max-h-40 overflow-y-auto">
                  {result.lines.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
                </div>
                <p className="text-sm text-foreground font-semibold">👑 Golden Boot: {result.topScorer.player} ({result.topScorer.team}) with {result.topScorer.goals} goals</p>
                <p className="text-2xl font-black text-primary">Score: {score}</p>
                <ShareButtons
                  gameName="Sign the Player"
                  gamePath="/sign-the-player"
                  score={`${result.champion === 'you' ? 'Won' : 'Lost'} the auction showdown (${score} pts)`}
                  customText={`I took £1B to the auction against The Sheikh and Moneyball Mike and scored ${score} on Sign the Player at DoUKnowBall 🔨 douknowball.com/sign-the-player`}
                />
                <Button size="lg" variant="outline" className="font-bold" onClick={() => setPhase('intro')}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Run it back
                </Button>
              </div>
            )}
          </div>
        </main>

        <GameSeoContent
          pageHasOwnH1
          title="Sign the Player: The Auction House | DoUKnowBall"
          description="A three-way transfer auction: you against two AI moguls with £1B each. Lots come up in a random position order and open at real list price, a contested lot becomes a live bidding war, an unwanted one decays until somebody snaps the bargain, and the most valuable player in the room headlines the final lot. Fill your XI, then a mini-league showdown decides."
          howToPlay={[
            'Pick a theme: Current Stars, All-Time Legends, or World Cup 2026. The room only ever shows the running order as positions; a player is revealed the moment his lot opens.',
            'Pass one is a lot per position in a random order, pass two is the elite band, and the single most valuable player is held back to headline the close.',
            'Every lot opens at real list price. Two or more bidders and it is a war in £5M/£10M/£25M steps; exactly one bidder and he takes him at the list price; nobody at all and the price falls step by step, and you can snap the bargain any time before the floor withdraws the lot.',
            'When the last hammer falls, every open chair on every squad is filled from the journeyman list at a fee, and the showdown simulates a double round-robin league: table position, goal difference and money left decide your score.',
          ]}
          examples={[
            'The Sheikh jumps £25M when he wants someone, so bait him early',
            "Moneyball Mike passes on superstars, so snipe the value lots he's hunting",
            'A decaying lot is where the bargains live, but wait too long and a rival snaps him first',
            'Keep powder dry for the headline lot: the best player in the room always sells last',
          ]}
        />
      </div>
    </>
  );
};

export default SignThePlayer;
