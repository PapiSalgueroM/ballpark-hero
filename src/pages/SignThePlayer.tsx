import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Gavel, Loader2, Trophy, RotateCcw, ChevronRight, Ban } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  AUCTION_SLOTS, AUCTION_THEMES, BID_STEPS, START_BUDGET,
  aiValuation, assignmentFee, auctionScore, buildAuctionPool, createBidders,
  simulateShowdown,
  type AuctionPlayer, type AuctionTheme, type Bidder, type ShowdownResult,
} from '@/lib/auctionHouse';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'intro' | 'loading' | 'auction' | 'assign' | 'showdown';

interface Lot { player: AuctionPlayer; kind: 'auction' | 'assign' }

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
  const timer = useRef<number | null>(null);

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
    const ordered: Lot[] = [];
    for (const slot of AUCTION_SLOTS) {
      const three = pool.filter(p => p.slotKey === slot.key);
      const good = three.find(p => p.tier === 'good')!;
      const great = three.find(p => p.tier === 'great')!;
      const weak = three.find(p => p.tier === 'weak')!;
      ordered.push({ player: good, kind: 'auction' }, { player: great, kind: 'auction' }, { player: weak, kind: 'assign' });
    }
    setBidders(createBidders());
    setLots(ordered);
    setLotIndex(0);
    setResult(null);
    setLog([]);
    setPhase('auction');
  };

  const eligible = useCallback((b: Bidder, p: AuctionPlayer) => b.squad[p.slotKey] === null && b.budget >= 5, []);

  useEffect(() => {
    if (phase !== 'auction' || !lot) return;
    if (lot.kind === 'assign') {
      const needers = bidders
        .filter(b => b.squad[lot.player.slotKey] === null)
        .sort((a, b) => Object.values(a.squad).filter(Boolean).length - Object.values(b.squad).filter(Boolean).length);
      const fee = assignmentFee(lot.player);
      const taker = needers[0];
      if (taker) {
        setBidders(prev => prev.map(b => b.id !== taker.id ? b : ({
          ...b,
          budget: Math.max(0, b.budget - fee),
          squad: { ...b.squad, [lot.player.slotKey]: lot.player },
        })));
        setLog(l => [`📋 ${lot.player.name} is assigned to ${taker.name} for ${money(fee)}. Nobody else needed a ${lot.player.slotKey}.`, ...l].slice(0, 30));
      }
      setPhase('assign');
      return;
    }
    const active = new Set(bidders.filter(b => eligible(b, lot.player)).map(b => b.id));
    setActiveIds(active);
    setPrice(lot.player.basePrice);
    setLeader(null);
    setLog(l => [`🔨 LOT ${lotIndex + 1}: ${lot.player.name} (${lot.player.rating}) opens at ${money(lot.player.basePrice)}.`, ...l].slice(0, 30));
    if (!active.has('you')) setAiThinking(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lotIndex, lots]);

  const advance = useCallback(() => {
    if (lotIndex + 1 >= lots.length) {
      setBidders(prev => {
        setResult(simulateShowdown(prev));
        return prev;
      });
      setPhase('showdown');
    } else {
      setLotIndex(i => i + 1);
      setPhase('auction');
    }
  }, [lotIndex, lots.length]);

  const settleLot = useCallback((winnerId: Bidder['id'] | null, finalPrice: number) => {
    if (!lot) return;
    let soldTo = winnerId;
    let soldFor = finalPrice;
    if (!soldTo) {
      // Nobody bid, the hammer still falls. Forced sale to the richest
      // bidder who needs the position, at the opening price. An auction lot
      // must NEVER go unsold or a squad ends up with a permanent hole.
      const takers = bidders
        .filter(b => b.squad[lot.player.slotKey] === null)
        .sort((a, b) => b.budget - a.budget);
      if (takers[0]) { soldTo = takers[0].id; soldFor = Math.min(lot.player.basePrice, Math.max(5, takers[0].budget)); }
    }
    if (soldTo) {
      const finalTo = soldTo;
      const price2 = soldFor;
      setBidders(prev => prev.map(b => b.id !== finalTo ? b : ({
        ...b,
        budget: Math.max(0, b.budget - price2),
        squad: { ...b.squad, [lot.player.slotKey]: lot.player },
      })));
      const w = bidders.find(b => b.id === finalTo);
      setLog(l => [
        winnerId
          ? `✅ SOLD! ${lot.player.name} to ${w?.name} for ${money(price2)}.`
          : `🔨 Hammer falls. Nobody bid, so ${lot.player.name} is FORCED onto ${w?.name} for ${money(price2)}.`,
        ...l,
      ].slice(0, 30));
    }
    setAiThinking(false);
    window.setTimeout(() => advance(), 650);
  }, [lot, bidders, advance]);

  const runAis = useCallback((currentPrice: number, currentLeader: Bidder['id'] | null, active: Set<Bidder['id']>) => {
    if (!lot) return;
    setAiThinking(true);
    // Compute the whole rival battle upfront, then REPLAY it raise by raise
    // so the room feels live: each bid lands on its own beat, not in a dump.
    let p = currentPrice;
    let lead = currentLeader;
    const act = new Set(active);
    interface Ev { text: string; price: number; leader: Bidder['id'] | null }
    const events: Ev[] = [];
    let moved = true;
    while (moved) {
      moved = false;
      for (const b of bidders) {
        if (b.id === 'you' || !act.has(b.id) || lead === b.id) continue;
        const val = aiValuation(b, lot.player, slotsLeftAfter);
        const step = p >= 200 ? 25 : p >= 80 ? 10 : 5;
        if (p + step <= val && b.budget >= p + step) {
          p += step;
          lead = b.id;
          events.push({ text: `${b.emoji} ${b.name} bids ${money(p)}!`, price: p, leader: lead });
          moved = true;
        } else {
          act.delete(b.id);
          events.push({ text: `${b.emoji} ${b.name} is OUT.`, price: p, leader: lead });
        }
      }
      if (act.has('you')) break;
    }
    const finish = () => {
      setActiveIds(new Set(act));
      setAiThinking(false);
      const remaining = [...act];
      if (!act.has('you') && remaining.length <= 1) settleLot(lead, p);
      else if (act.has('you') && remaining.length === 1 && lead === 'you') settleLot('you', p);
    };
    const stepPlay = (i: number) => {
      if (i >= events.length) { finish(); return; }
      const ev = events[i];
      setPrice(ev.price);
      setLeader(ev.leader);
      setLog(l => [ev.text, ...l].slice(0, 30));
      timer.current = window.setTimeout(() => stepPlay(i + 1), 460 + Math.random() * 340);
    };
    if (events.length === 0) { finish(); return; }
    timer.current = window.setTimeout(() => stepPlay(0), 350);
  }, [lot, bidders, slotsLeftAfter, settleLot]);

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
    if (remaining.length === 0) settleLot(leader, price);
    else if (remaining.length === 1 && leader === remaining[0]) settleLot(remaining[0], price);
    else runAis(price, leader, act);
  };

  const youActive = activeIds.has('you');
  useEffect(() => {
    if (phase === 'auction' && lot && lot.kind === 'auction' && !youActive && aiThinking) {
      runAis(price, leader, activeIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lotIndex, youActive]);

  const score = result ? auctionScore(result, you) : 0;
  useGameCompletion('sign-the-player', phase === 'showdown' && !!result, score, result?.champion === 'you' ? 1 : 0);

  const squadList = (b: Bidder) => AUCTION_SLOTS.map(s => ({ slot: s, p: b.squad[s.key] }));

  return (
    <>
      <PageSeo
        title="Sign the Player: Auction House | DoUKnowBall"
        description="Three bidders, £1B each, 33 players. Outbid two rivals position by position, then simulate the showdown. An auction you actually get to play."
        path="/sign-the-player"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(260 30% 8%) 0%, hsl(230 30% 7%) 55%, hsl(150 25% 6%) 100%)' }}>
        <GameNavbar />
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

            {(phase === 'auction' || phase === 'assign') && lot && (
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 space-y-4">
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border text-sm font-bold text-foreground">
                      <Gavel className="w-4 h-4 text-primary" /> Lot {lotIndex + 1}/{lots.length} · {AUCTION_SLOTS.find(s => s.key === lot.player.slotKey)?.label}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-md p-6 text-center space-y-2 shadow-lg shadow-primary/10">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      {lot.kind === 'assign' ? 'Leftover: automatic assignment' : lot.player.tier === 'great' ? '⭐ THE SUPERSTAR LOT' : '🥈 The solid option sells first'}
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
                        {activeIds.has('you') ? (
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
                    {phase === 'assign' && (
                      <Button size="lg" className="font-bold mt-2" onClick={advance}>
                        Next lot <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
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
                              lot && slot.key === lot.player.slotKey && (phase === 'auction' || phase === 'assign') && 'ring-1 ring-primary/60',
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
          description="A three-way transfer auction: you against two AI moguls with £1B each. Positions sell good-player-first then superstar, leftovers get assigned with a fee, and the three finished squads simulate a mini-league showdown."
          howToPlay={[
            'Pick a theme: Current Stars, All-Time Legends, or World Cup 2026. 33 players enter the room: a great, a good and a weak option per position.',
            'Each position auctions its GOOD player first, then the SUPERSTAR. Bid in £5M/£10M/£25M steps or pass. Whoever misses out takes the leftover player and still pays the assignment fee.',
            'When all three XIs are full, the showdown simulates a double round-robin league: table position, goal difference and money left decide your score.',
          ]}
          examples={[
            'The Sheikh jumps £25M when he wants someone, so bait him early',
            "Moneyball Mike passes on superstars, so snipe the value lots he's hunting",
            'Passing everything still costs you: leftovers come with fees',
            'Win the league with money in the bank for the max score',
          ]}
        />
      </div>
    </>
  );
};

export default SignThePlayer;
