import { FlagFromEmoji, FlagImg } from '@/components/FlagImg';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, Phone, Check, X, Trophy, ChevronRight, Crown, Zap, Play } from 'lucide-react';
import { useSquadDeal } from '@/hooks/useSquadDeal';
import { FORMATIONS, EXTRA_DEALS, TOPICS } from '@/lib/squadDeal';
import type { Formation } from '@/lib/squadDeal';
import type { Player } from '@/types/game';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { computeChemistry, formatChemistry } from '@/lib/chemistry';
import { useRevealScroll } from '@/hooks/useRevealScroll';

// Thresholds track playerRating's 2026-07-03 rescale (curve now spans ~41-85
// instead of ~52-99), so the top individual-player color band is reachable
// again by genuine superstars instead of sitting above every possible score.
function tierColor(r: number): string {
  if (r >= 78) return 'text-primary';
  if (r >= 68) return 'text-emerald-400';
  if (r >= 58) return 'text-yellow-400';
  return 'text-muted-foreground';
}
const lastName = (n: string) => n.split(' ').slice(-1)[0];

const Pitch = ({ formation, squad, activeIndex, onSlotClick, clickableEmpty }: {
  formation: Formation; squad: (Player | null)[]; activeIndex: number;
  onSlotClick?: (i: number) => void; clickableEmpty?: boolean;
}) => (
  <div className="relative w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden"
    style={{ aspectRatio: '3 / 4', background: 'linear-gradient(to top, hsl(var(--secondary)) 0%, hsl(var(--card)) 100%)' }}>
    <div className="absolute inset-x-0 top-1/2 h-px bg-border/40" />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-border/40" />
    {formation.slots.map((slot, i) => {
      const player = squad[i];
      const active = i === activeIndex;
      const canClick = clickableEmpty && !player && onSlotClick;
      return (
        <button key={i} disabled={!canClick}
          onClick={() => canClick && onSlotClick(i)}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: slot.x + '%', top: slot.y + '%' }}>
          <div className={cn(
            'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all',
            player ? 'bg-primary text-primary-foreground border-primary'
              : active ? 'bg-card border-primary animate-pulse text-primary'
              : canClick ? 'bg-card/70 border-dashed border-primary/70 text-primary hover:scale-110 cursor-pointer'
              : 'bg-card/60 border-border text-muted-foreground',
          )}>
            {slot.label}
          </div>
          {player && <span className="text-[8px] md:text-[9px] text-foreground mt-0.5 max-w-[64px] truncate text-center leading-tight">{lastName(player.name)}</span>}
        </button>
      );
    })}
  </div>
);

const SquadDeal = () => {
  const g = useSquadDeal();
  // Round 66: the owner's no scroll rule. The Banker's offer is the whole
  // point of the round, so it pulls itself into view instead of appearing
  // below the case grid you were just tapping.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.slotPhase}:${g.offer?.name ?? ''}`);
  const poolList = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => g.candidates.map((p, i) => ({ p, i, r: g.era2Rating(p) })).sort((a, b) => b.r - a.r),
    [g.candidates],
  );
  const chemistry = useMemo(
    () =>
      computeChemistry(
        g.squad.filter((p): p is Player => !!p).map((p) => ({ name: p.name, club: p.club, league: p.league, nationality: p.nationality })),
      ),
    [g.squad],
  );

  const shell = (inner: ReactNode) => (
    <>
      <PageSeo title="Squad Deal: Mystery Box Team Builder | DoUKnowBall"
        description="Build a full XI out of mystery boxes: pick a case per position, dodge the Banker, add a manager, stadium and fans, then simulate your squad."
        path="/squad-deal" />
      <GameShell width="wide">
        {inner}
        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1 title="Squad Deal: Mystery Box Team Builder"
          description="A mystery box twist on building your dream team. Each position gives you 10 mystery cases of players tiered from elite to weak. Keep one, eliminate the rest, and weigh the Banker's player offers."
          howToPlay={[
            'Pick a formation and an era (current or all-time legends).',
            'Tap any position on the pitch to draft it.',
            'Keep one case, eliminate the rest in rounds, hit Reveal, then take the Banker offer (Deal) or gamble (No Deal).',
            'Fill all 11, pick your manager / stadium / fans / budget, then Simulate for a rating and grade.',
          ]} />
        <GameNav />
      </GameShell>
    </>
  );

  /* ---------- CONFIG ---------- */
  if (g.phase === 'config') {
    return shell(
      <div>
        <header className="text-center mb-7">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">SQUAD DEAL</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">Build a full XI out of mystery boxes. Pick cases, dodge the Banker, assemble glory.</p>
        </header>

        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 text-center">Era</div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => g.setEra('current')} className={cn('px-5 py-2 rounded-xl font-semibold inline-flex items-center gap-2 border transition-all', g.era === 'current' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}><Zap className="w-4 h-4" /> Current Era</button>
            <button onClick={() => g.setEra('legends')} className={cn('px-5 py-2 rounded-xl font-semibold inline-flex items-center gap-2 border transition-all', g.era === 'legends' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}><Crown className="w-4 h-4" /> All-Time Legends</button>
          </div>
        </div>

        <div className="mb-8">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 text-center">Formation</div>
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {FORMATIONS.map((f, i) => (
              <button key={f.name} onClick={() => g.setFormationIndex(i)} className={cn('rounded-xl border p-3 transition-all', g.formationIndex === i ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary')}>
                <div className={cn('text-lg font-bold font-display', g.formationIndex === i ? 'text-primary' : 'text-foreground')}>{f.name}</div>
              </button>
            ))}
          </div>
        </div>

        {g.era === 'current' && (
          <div className="mb-8">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 text-center">Topic</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl mx-auto">
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => g.setTopic(t.id)} className={cn('rounded-xl border p-3 text-left transition-all', g.topic === t.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary')}>
                  <div className="text-lg"><FlagFromEmoji emoji={t.emoji} size={18} /></div>
                  <div className={cn('text-xs font-bold mt-0.5', g.topic === t.id ? 'text-primary' : 'text-foreground')}>{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button onClick={g.startDraft} className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity">Start Building <ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
    );
  }

  if (g.phase === 'loading') return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading players…</div>);

  /* ---------- EXTRAS: a mini mystery box round per category ---------- */
  if (g.phase === 'extras') {
    const cat = g.currentExtraCat;
    const done = g.allExtrasChosen;
    return shell(
      <div>
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-primary font-display">FINISHING TOUCHES</h1>
          <p className="text-muted-foreground text-sm">{done ? 'All set. Time to see what this squad is made of.' : `Board ${Math.min(g.extraCat + 1, EXTRA_DEALS.length)} of ${EXTRA_DEALS.length}: keep a case, dodge the Banker.`}</p>
        </header>

        {!done && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center text-sm font-semibold text-foreground mb-3"><FlagFromEmoji emoji={cat.emoji} size={16} /> {cat.title}: {g.extraStage === 'pick' ? 'pick one case to KEEP 💼' : g.extraStage === 'reveal' ? 'three cases flip...' : g.extraStage === 'offer' ? 'the Banker calls' : 'stay or swap?'}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cat.options.map((opt, i) => {
                const kept = g.extraKept === i;
                const flipped = g.extraElim.includes(i);
                const faceUp = flipped || (g.extraStage !== 'pick' && kept && false);
                return (
                  <button key={opt.id} disabled={g.extraStage !== 'pick'} onClick={() => g.pickExtraCase(i)}
                    className={cn('rounded-xl border p-3 text-left transition-all min-h-[86px]',
                      kept ? 'bg-primary/15 border-primary shadow-lg' : flipped ? 'bg-secondary/30 border-border opacity-70' : 'bg-card border-border', g.extraStage === 'pick' && 'hover:border-primary cursor-pointer')}>
                    {faceUp || flipped ? (
                      <>
                        <div className="text-lg"><FlagFromEmoji emoji={opt.emoji} size={18} /></div>
                        <div className="text-xs font-bold mt-0.5 text-foreground line-through">{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground">rating {opt.ratingMod >= 0 ? '+' : ''}{opt.ratingMod} · chem {opt.chemMod >= 0 ? '+' : ''}{opt.chemMod}</div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-2">
                        <Briefcase className={cn('w-6 h-6', kept ? 'text-primary' : 'text-muted-foreground')} />
                        <span className={cn('text-[11px] font-bold mt-1', kept ? 'text-primary' : 'text-muted-foreground')}>{kept ? 'YOUR CASE' : `Case ${i + 1}`}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center">
              {g.extraStage === 'reveal' && (
                <button onClick={g.extraBankerCall} className="px-7 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity inline-flex items-center gap-2"><Phone className="w-4 h-4" /> Hear the Banker's offer</button>
              )}
            </div>

            {g.extraStage === 'offer' && g.extraOffer && (
              <div className="mt-5 bg-card border border-primary/40 rounded-2xl p-5 max-w-sm mx-auto text-center shadow-xl">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">The Banker offers you</div>
                <div className="text-xl font-bold text-foreground"><FlagFromEmoji emoji={g.extraOffer.emoji} size={20} /> {g.extraOffer.label}</div>
                <div className="text-[11px] text-muted-foreground mb-3">rating {g.extraOffer.ratingMod >= 0 ? '+' : ''}{g.extraOffer.ratingMod} · chem {g.extraOffer.chemMod >= 0 ? '+' : ''}{g.extraOffer.chemMod}</div>
                <div className="flex gap-3">
                  <button onClick={g.acceptExtraDeal} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold inline-flex items-center justify-center gap-2 hover:opacity-90"><Check className="w-4 h-4" /> DEAL</button>
                  <button onClick={g.rejectExtraDeal} className="flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-xl font-bold inline-flex items-center justify-center gap-2 hover:bg-secondary/70"><X className="w-4 h-4" /> NO DEAL</button>
                </div>
              </div>
            )}

            {g.extraStage === 'finalSwap' && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={g.extraStay} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90">💼 STAY with my case</button>
                <button onClick={g.extraSwap} className="px-6 py-3 bg-card border border-primary text-primary rounded-xl font-bold hover:bg-primary/10">🔄 SWAP to a mystery case</button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="max-w-md mx-auto">
            <div className="bg-card border border-border rounded-2xl p-4 mb-5 space-y-1.5">
              {EXTRA_DEALS.map(c => {
                const sel = g.extrasChosen[c.key];
                return sel ? <p key={c.key} className="text-sm text-foreground"><FlagFromEmoji emoji={c.emoji} size={16} /> <span className="font-bold">{sel.label}</span> <span className="text-muted-foreground text-xs">({sel.ratingMod >= 0 ? '+' : ''}{sel.ratingMod} rating, {sel.chemMod >= 0 ? '+' : ''}{sel.chemMod} chem)</span></p> : null;
              })}
            </div>
            <div className="text-center">
              <button onClick={g.simulate} className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg bg-primary text-primary-foreground hover:opacity-90 transition-all">
                <Play className="w-5 h-5" /> Simulate Squad
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- DONE ---------- */
  if (g.phase === 'done' && g.result) {
    const r = g.result;
    return shell(
      <div className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-primary font-display mb-1">YOUR SQUAD</h1>
        <p className="text-muted-foreground text-sm mb-5">{g.formation.name} · {g.era === 'legends' ? 'All-Time Legends' : 'Current Era'}{g.memesOn ? ' · Memes' : ''}</p>
        <Pitch formation={g.formation} squad={g.squad} activeIndex={-1} />
        {chemistry.totalBonus > 0 && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
              {formatChemistry(chemistry)}
            </span>
          </div>
        )}
        <div className="mt-6">
          <ResultScreen
            outcomeEmoji="🏟️"
            headline={`Grade ${r.grade}`}
            statRow={[
              { label: 'Rating', value: r.rating },
              { label: 'Grade', value: r.grade },
              ...(chemistry.totalBonus > 0 ? [{ label: 'Chem. Bonus', value: `+${chemistry.totalBonus}` }] : []),
            ]}
            emojiGrid={'🏟️ ' + g.formation.name + ' · ' + r.grade}
            share={{
              score: 'Grade ' + r.grade + ' (' + r.rating + ')',
              gameName: 'Squad Deal',
              gamePath: '/squad-deal',
            }}
            onPlayAgain={g.restart}
            playAgainLabel="Build Again"
          >
            <div className="space-y-1.5 text-left">
              {r.facts.map((f, i) => <p key={i} className="text-sm text-foreground flex items-start gap-2"><Trophy className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{f}</p>)}
            </div>
          </ResultScreen>
        </div>
        {g.leaderboard.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-5 max-w-md mx-auto text-left">
            <div className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Your Best Squads</div>
            {g.leaderboard.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{i + 1}. {e.formation} · {e.era}</span>
                <span className="font-bold text-primary">{e.grade} ({e.score})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- DRAFT: BOARD ---------- */
  if (g.activeSlot === null) {
    const filled = g.squad.filter(Boolean).length;
    return shell(
      <div>
        <header className="text-center mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">SQUAD DEAL</h1>
          <p className="text-muted-foreground text-sm">Tap a position to draft it · <span className="text-foreground font-semibold">{filled}</span>/{g.formation.slots.length} filled</p>
        </header>
        <Pitch formation={g.formation} squad={g.squad} activeIndex={-1} onSlotClick={g.selectSlot} clickableEmpty />
        <div className="text-center mt-6">
          {g.allFilled ? (
            <button onClick={g.goToExtras} className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity">Finishing Touches <ChevronRight className="w-5 h-5" /></button>
          ) : (
            <p className="text-sm text-muted-foreground">Tap any empty <span className="text-primary font-semibold">dashed</span> spot to start.</p>
          )}
        </div>
      </div>
    );
  }

  /* ---------- DRAFT: the blind box round for the active slot ---------- */
  const slot = g.currentSlot;
  return shell(
    <div>
      <header className="text-center mb-3">
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/30">Picking: {slot ? slot.label : ''}</span>
      </header>

      <div className="text-center my-3 min-h-[26px] font-semibold text-foreground">
        {g.slotPhase === 'pickBox' && 'Pick one case to keep 💼'}
        {g.slotPhase === 'selecting' && <>Select <span className="text-primary">{g.opensThisRound}</span> case{g.opensThisRound === 1 ? '' : 's'} to eliminate</>}
        {g.slotPhase === 'revealed' && 'Cases eliminated, see the Banker’s offer'}
        {g.slotPhase === 'offer' && g.bankerCalling && <span className="text-primary inline-flex items-center gap-2 animate-pulse"><Phone className="w-4 h-4" /> The Banker is calling…</span>}
        {g.slotPhase === 'final' && 'Final call: keep your case or swap for the last one?'}
      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-3 max-w-xl mx-auto">
        {g.candidates.map((cand, i) => {
          const isKept = i === g.keptIdx, isElim = g.eliminated.includes(i), isSel = g.selected.includes(i);
          const isFinalChoice = g.slotPhase === 'final' && g.finalIndices.includes(i);
          const clickable = g.slotPhase === 'pickBox' || (g.slotPhase === 'selecting' && !isKept && !isElim) || isFinalChoice;
          return (
            <button key={i} disabled={!clickable}
              onClick={() => { if (g.slotPhase === 'pickBox') g.pickBox(i); else if (g.slotPhase === 'selecting') g.toggleSelect(i); else if (isFinalChoice) g.pickFinal(i); }}
              className={cn('aspect-[3/4] rounded-xl flex flex-col items-center justify-center border text-center px-1 transition-all',
                isElim ? 'bg-secondary/30 border-border text-muted-foreground/60'
                  : isKept ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                  : isSel ? 'bg-destructive/80 text-destructive-foreground border-destructive'
                  : isFinalChoice ? 'bg-card border-primary text-primary animate-pulse'
                  : 'bg-card border-border text-foreground hover:border-primary')}>
              {isElim ? <span className="text-[8px] leading-tight px-0.5">{cand.name}</span>
                : <><Briefcase className="w-4 h-4 md:w-5 md:h-5" /><span className="text-[10px] mt-0.5">{isKept ? 'Yours' : isFinalChoice ? 'Swap' : i + 1}</span></>}
            </button>
          );
        })}
      </div>

      <div className="mt-5 max-w-xl mx-auto bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Players in the pool</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {poolList.map(({ p, i, r }) => {
            const gone = g.eliminated.includes(i);
            return (
              <div key={p.name + i} className={cn('flex items-center justify-between text-xs', gone && 'opacity-40 line-through')}>
                {/* Round 315: his review asked for flags in this game */}
                <span className="truncate text-foreground flex items-center gap-1">
                  <FlagImg name={p.nationality} size={12} />
                  {p.name}
                </span>
                <span className={cn('font-bold ml-2', tierColor(r))}>{r}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        {g.slotPhase === 'selecting' && (
          <button onClick={g.reveal} disabled={g.selected.length !== g.opensThisRound} className={cn('px-7 py-2.5 rounded-xl font-bold transition-all', g.selected.length === g.opensThisRound ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}>Reveal</button>
        )}
        {g.slotPhase === 'revealed' && (
          <button onClick={g.requestOffer} className="px-7 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Get the Banker's Offer</button>
        )}
        {g.slotPhase === 'final' && g.keptIdx !== null && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => g.pickFinal(g.keptIdx!)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90">💼 STAY with my case</button>
            <button onClick={() => { const other = g.finalIndices.find(i => i !== g.keptIdx); if (other !== undefined) g.pickFinal(other); }} className="px-6 py-3 bg-card border border-primary text-primary rounded-xl font-bold hover:bg-primary/10">🔄 SWAP to the last case</button>
          </div>
        )}
      </div>

      {g.slotPhase === 'offer' && g.offer && (
        <div ref={revealRef} className="mt-6 bg-card border border-primary/40 rounded-2xl p-6 max-w-sm mx-auto text-center shadow-xl">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">The Banker offers</div>
          <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <FlagImg name={g.offer.nationality} size={18} />
            {g.offer.name}
          </div>
          <div className="text-sm text-muted-foreground mb-1">{g.offer.position} · {g.offer.club}</div>
          <div className={cn('text-3xl font-bold font-display mb-4', tierColor(g.era2Rating(g.offer)))}>{g.era2Rating(g.offer)}</div>
          <div className="flex gap-3">
            <button onClick={g.acceptDeal} className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold inline-flex items-center justify-center gap-2 hover:opacity-90"><Check className="w-5 h-5" /> DEAL</button>
            <button onClick={g.rejectDeal} className="flex-1 px-5 py-3 bg-secondary text-foreground rounded-xl font-bold inline-flex items-center justify-center gap-2 hover:bg-secondary/70"><X className="w-5 h-5" /> NO DEAL</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadDeal;
