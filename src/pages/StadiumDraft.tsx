import { useState, type FormEvent } from 'react';
import { Footer } from '@/components/game/Footer';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Landmark, RotateCcw, ArrowRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  XI_SLOTS, CLUE_POINTS, CHOICES_BY_CLUE,
  buildRun, isCorrectGuess, choicesForClue, journeyman, makePick,
  xiAverage, gradeXi, simulateShowdown, finalScore,
  type StadiumEntry, type StadiumPlayer, type XiPick, type ShowdownResult,
} from '@/lib/stadiumDraft';

type Phase = 'intro' | 'guess' | 'pick' | 'reveal' | 'done';

const POS_COLOR: Record<string, string> = {
  GK: 'bg-amber-400/20 text-amber-300',
  DEF: 'bg-sky-400/20 text-sky-300',
  MID: 'bg-emerald-400/20 text-emerald-300',
  ATT: 'bg-rose-400/20 text-rose-300',
};

const StadiumDraft = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [run, setRun] = useState<StadiumEntry[]>([]);
  const [round, setRound] = useState(0);
  const [clueIndex, setClueIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);
  const [choices, setChoices] = useState<StadiumPlayer[]>([]);
  const [solvedClue, setSolvedClue] = useState(0);
  const [pendingReveal, setPendingReveal] = useState<XiPick | null>(null);
  const [picks, setPicks] = useState<XiPick[]>([]);
  const [sim, setSim] = useState<ShowdownResult | null>(null);

  const entry = run[round];
  const slot = XI_SLOTS[Math.min(round, XI_SLOTS.length - 1)];
  const cluePointsTotal = picks.reduce((s, p) => s + p.points, 0);
  const avg = xiAverage(picks);
  const total = finalScore(cluePointsTotal, avg);
  const correctCount = picks.filter(p => p.clueIndex !== null).length;
  const grade = gradeXi(avg);

  useGameCompletion('stadium-draft', phase === 'done', phase === 'done' ? total : 0, correctCount);

  const start = () => {
    setRun(buildRun());
    setRound(0); setClueIndex(0); setGuess(''); setWrongFlash(false);
    setChoices([]); setPendingReveal(null); setPicks([]); setSim(null);
    setPhase('guess');
  };

  const finish = (finalPicks: XiPick[]) => {
    const finalAvg = xiAverage(finalPicks);
    const star = [...finalPicks].sort((a, b) => b.effective - a.effective)[0];
    setSim(simulateShowdown(finalAvg, star ? star.player.name : 'Your XI'));
    setPhase('done');
  };

  const advance = (nextPicks: XiPick[]) => {
    setPicks(nextPicks);
    setPendingReveal(null);
    if (nextPicks.length >= XI_SLOTS.length) { finish(nextPicks); return; }
    setRound(nextPicks.length);
    setClueIndex(0); setGuess(''); setWrongFlash(false); setChoices([]);
    setPhase('guess');
  };

  const failRound = () => {
    if (!entry) return;
    setPendingReveal(makePick(slot, journeyman(slot.group), entry.stadium, null));
    setPhase('reveal');
  };

  const missClue = () => {
    if (clueIndex >= 3) { failRound(); return; }
    setClueIndex(clueIndex + 1);
  };

  const submitGuess = (e: FormEvent) => {
    e.preventDefault();
    if (!entry || guess.trim().length === 0) return;
    if (isCorrectGuess(guess, entry)) {
      setSolvedClue(clueIndex);
      const opts = choicesForClue(entry.playerPool, clueIndex);
      if (clueIndex >= 3) {
        // Solved on the last clue: the pool's cheapest player is auto-assigned.
        setPendingReveal(makePick(slot, opts[0], entry.stadium, 3));
        setPhase('reveal');
      } else {
        setChoices(opts);
        setPhase('pick');
      }
    } else {
      setGuess('');
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 1200);
      missClue();
    }
  };

  const choose = (p: StadiumPlayer) => {
    if (!entry) return;
    advance([...picks, makePick(slot, p, entry.stadium, solvedClue)]);
  };

  const playing = phase === 'guess' || phase === 'pick' || phase === 'reveal';

  const xiList = (
    <div className="rounded-2xl border border-border bg-card/60 p-3 text-left">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 text-center">Your XI</p>
      <div className="space-y-1">
        {XI_SLOTS.map((s, i) => {
          const pick = picks[i];
          const active = playing && i === round;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 border',
                pick ? 'border-border bg-secondary/40' : active ? 'border-primary/50 bg-primary/10' : 'border-transparent opacity-50',
              )}
            >
              <span className="w-9 text-[10px] font-black text-muted-foreground shrink-0">{s.code}</span>
              {pick ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{pick.player.name}</p>
                    {pick.outOfPosition && <p className="text-[10px] text-orange-300">out of position -6</p>}
                  </div>
                  <span className={cn('text-xs font-black shrink-0', pick.effective >= 85 ? 'text-emerald-300' : pick.effective >= 72 ? 'text-foreground' : 'text-orange-300')}>
                    {pick.effective}
                  </span>
                </>
              ) : (
                <p className="flex-1 text-xs text-muted-foreground">{active ? 'On the clock...' : '—'}</p>
              )}
            </div>
          );
        })}
      </div>
      {picks.length > 0 && (
        <p className="text-[11px] text-muted-foreground font-semibold mt-2 text-center">
          Avg {avg ? avg.toFixed(1) : '0'} · {cluePointsTotal} clue pts
        </p>
      )}
    </div>
  );

  return (
    <>
      <PageSeo
        title="Stadium Draft - Guess the Stadium, Earn the Player | DoUKnowBall"
        description="Identify world-famous football stadiums from progressive clues. Every ground you name earns one of its players for your XI — 11 rounds, then your team is rated and simmed."
        path="/stadium-draft"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(152 40% 7%) 0%, hsl(168 35% 6%) 60%, hsl(152 35% 5%) 100%)' }}>
        <GameNavbar />
        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-4xl mx-auto">

            {phase === 'intro' && (
              <div className="max-w-2xl mx-auto space-y-5 text-center">
                <div className="flex items-center justify-center text-primary">
                  <Landmark className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Stadium <span className="text-primary">Draft</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Name the ground from clues — every stadium you know <b>earns one of its players</b> for your XI.
                  Nail it early and you choose from the whole pool; scrape it late and you take the scraps.
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border text-muted-foreground">Clue 1 · pick from all 6 · 40 pts</span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border text-muted-foreground">Clue 2 · pick from 4 · 25 pts</span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border text-muted-foreground">Clue 3 · pick from 2 · 15 pts</span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border text-muted-foreground">Clue 4 · cheapest player · 5 pts</span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border text-muted-foreground">Miss · 65-rated Journeyman</span>
                </div>
                <Button size="lg" className="text-lg px-8 py-6 font-bold" onClick={start}>
                  <Landmark className="w-5 h-5 mr-2" /> Kick Off
                </Button>
              </div>
            )}

            {phase !== 'intro' && (
              <div className="grid md:grid-cols-[1fr_250px] gap-5 items-start">
                <div className="space-y-4 text-center">

                  {playing && entry && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">Round {round + 1}/11</span>
                      <span className="text-xs text-muted-foreground">filling <b className="text-foreground">{slot.code}</b> · {cluePointsTotal} pts banked</span>
                    </div>
                  )}

                  {phase === 'guess' && entry && (
                    <div className="rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-md p-5 space-y-3 text-left animate-in fade-in">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Mystery ground</p>
                        <p className="text-[11px] font-bold text-primary">
                          {clueIndex < 3
                            ? `Guess now: ${CLUE_POINTS[clueIndex]} pts + pick from ${CHOICES_BY_CLUE[clueIndex]}`
                            : 'Last chance: 5 pts + the cheapest player'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {entry.clues.slice(0, clueIndex + 1).map((c, i) => (
                          <div key={i} className={cn('flex gap-3 rounded-xl border px-3 py-2.5', i === clueIndex ? 'border-primary/50 bg-primary/10 animate-in fade-in slide-in-from-bottom-1' : 'border-border bg-secondary/30')}>
                            <span className="text-[10px] font-black text-primary shrink-0 mt-0.5">CLUE {i + 1}</span>
                            <p className="text-sm text-foreground leading-snug">{c}</p>
                          </div>
                        ))}
                      </div>
                      {wrongFlash && (
                        <p className="text-xs font-bold text-red-400 animate-in fade-in">Not it — another clue unlocked.</p>
                      )}
                      <form onSubmit={submitGuess} className="flex gap-2">
                        <Input
                          value={guess}
                          onChange={e => setGuess(e.target.value)}
                          placeholder="Stadium or club name..."
                          autoFocus
                          className="bg-background/60"
                        />
                        <Button type="submit" className="font-bold shrink-0">Guess</Button>
                      </form>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={missClue}>
                          <SkipForward className="w-4 h-4 mr-1" />
                          {clueIndex < 3 ? 'Skip to next clue' : 'Give up (take the Journeyman)'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {phase === 'pick' && entry && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-card/80 backdrop-blur-md p-5 space-y-3 animate-in fade-in zoom-in-95">
                      <p className="text-2xl font-extrabold text-emerald-300">{entry.stadium} ✓</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.club} · {entry.city} · +{CLUE_POINTS[solvedClue]} pts (clue {solvedClue + 1})
                      </p>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                        Pick your {slot.code} {solvedClue === 0 ? '— the whole pool is yours' : `— ${choices.length} on offer`}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {choices.map(p => {
                          const oop = p.pos !== slot.group;
                          return (
                            <button
                              key={p.name}
                              onClick={() => choose(p)}
                              className="rounded-xl border border-border bg-secondary/40 hover:border-primary/60 hover:bg-primary/10 transition-all p-3 text-left"
                            >
                              <p className="text-sm font-bold text-foreground leading-tight">{p.name}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded', POS_COLOR[p.pos])}>{p.pos}</span>
                                {oop ? (
                                  <span className="text-xs font-black text-orange-300">{p.rating} → {p.rating - 6}</span>
                                ) : (
                                  <span className="text-xs font-black text-emerald-300">{p.rating}</span>
                                )}
                              </div>
                              {oop && <p className="text-[10px] text-orange-300 mt-0.5">out of position -6</p>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {phase === 'reveal' && entry && pendingReveal && (
                    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 space-y-3 animate-in fade-in zoom-in-95">
                      {pendingReveal.clueIndex === null ? (
                        <>
                          <p className="text-[11px] uppercase tracking-widest text-red-400 font-bold">Ground unclaimed</p>
                          <p className="text-2xl font-extrabold text-foreground">It was {entry.stadium}</p>
                          <p className="text-sm text-muted-foreground">{entry.club} · {entry.city}, {entry.country}</p>
                          <p className="text-sm text-foreground">
                            No player earned — a <b>65-rated Journeyman</b> fills in at {slot.code}.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-extrabold text-emerald-300">{entry.stadium} ✓</p>
                          <p className="text-sm text-muted-foreground">{entry.club} · +5 pts (final clue)</p>
                          <p className="text-sm text-foreground">
                            Solved at the death, so the pool's cheapest man reports for duty:{' '}
                            <b>{pendingReveal.player.name}</b> ({pendingReveal.effective}{pendingReveal.outOfPosition ? ` after -6 out of position` : ''}) at {slot.code}.
                          </p>
                        </>
                      )}
                      <Button size="lg" className="font-bold" onClick={() => advance([...picks, pendingReveal])}>
                        {picks.length + 1 >= XI_SLOTS.length ? 'See the final XI' : 'Next ground'} <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {phase === 'done' && sim && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-primary/40 bg-card/80 p-5 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Your Stadium XI</p>
                        <p className="text-5xl font-black text-primary">{grade.grade}</p>
                        <p className="text-lg font-bold text-foreground">{Math.round(avg)} rated XI</p>
                        <p className="text-sm text-muted-foreground">{grade.line}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-1.5 text-left">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold text-center mb-2">The Showdown vs The Groundskeeper XI</p>
                        {sim.lines.map((l, i) => (
                          <p key={i} className={cn('text-sm leading-snug', i === 0 ? 'font-bold text-foreground' : 'text-muted-foreground')}>{l}</p>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-3">
                        <p className="text-3xl font-black text-primary">{total} pts</p>
                        <p className="text-sm text-muted-foreground font-semibold">
                          {cluePointsTotal} clue pts + {Math.round(avg)} XI rating · {correctCount}/11 grounds named
                        </p>
                        <ShareButtons
                          gameName="Stadium Draft"
                          gamePath="/stadium-draft"
                          score={`${correctCount}/11 grounds · Grade ${grade.grade}`}
                          customText={`I named ${correctCount}/11 stadiums and drafted a Grade ${grade.grade} XI (${Math.round(avg)} rated, ${total} pts) on Stadium Draft. Know your grounds? douknowball.com/stadium-draft 🏟️`}
                        />
                        <Button size="lg" variant="outline" className="w-full font-bold" onClick={start}>
                          <RotateCcw className="w-4 h-4 mr-2" /> New draft
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:sticky md:top-4">{xiList}</div>
              </div>
            )}
          </div>
        </main>

        <GameSeoContent
          title="Stadium Draft: Guess the Stadium, Get the Player | DoUKnowBall"
          description="The box2box-style stadium quiz: identify world-famous football grounds from four progressive clues — country and capacity, opening decade and city, famous features, then the legends who played there. Every stadium you name earns one of its players for your XI. After 11 rounds your team is rated, graded and simmed against The Groundskeeper XI. Unlimited replays."
          howToPlay={[
            'Each round hides a world-famous stadium. Clues go from vague (country + size) to a dead giveaway (the club\'s legends).',
            'Type the stadium OR club name — accents don\'t matter, "bernabeu" and "real madrid" both count.',
            'Guess on clue 1 and choose from all 6 of the ground\'s players; clue 2 gives you 4, clue 3 just 2, clue 4 auto-assigns the cheapest. Miss entirely and a 65-rated Journeyman fills the slot.',
            'Players slotted outside their position group play at -6 rating. After 11 rounds your XI is rated, graded and simmed.',
          ]}
          examples={[
            '"~99k, Spain, opened in the 1950s..." — that one\'s worth 40 points on clue one',
            'Earned Anfield? Salah, Gerrard, Dalglish, van Dijk, Rush or Alisson can join your XI',
            'Guessed late and only earned a keeper for the ST slot? He plays up top at -6',
            'Beat The Groundskeeper XI in the sim to cap a perfect draft',
          ]}
        />
        <Footer />
      </div>
    </>
  );
};

export default StadiumDraft;
