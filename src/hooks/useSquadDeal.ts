import { useState, useCallback, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import {
  Formation, FORMATIONS, Era, MEMES, EXTRA_DEALS, ExtraOption,
  fetchSquadPool, buildCandidates, bankerOffer, simulateSquad, SquadResult,
  loadLeaderboard, saveScore, LeaderEntry, Topic, filterByTopic, ratingFor,
} from '@/lib/squadDeal';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type Phase = 'config' | 'loading' | 'draft' | 'extras' | 'done';
export type SlotPhase = 'pickBox' | 'selecting' | 'revealed' | 'offer' | 'final';

const ROUND_FACTORS = [0.55, 0.75, 0.95, 1.0];
function scheduleFor(c: number): number[] {
  let t = Math.max(0, c - 2); const r: number[] = [];
  while (t > 0) { const x = Math.min(3, t); r.push(x); t -= x; }
  return r;
}

export function useSquadDeal() {
  const [phase, setPhase] = useState<Phase>('config');
  const [era, setEra] = useState<Era>('current');
  const [topic, setTopic] = useState<Topic>('all');
  const [memesOn, setMemesOn] = useState(false);
  const [formationIndex, setFormationIndex] = useState(0);
  const [pool, setPool] = useState<Player[]>([]);
  const formation: Formation = FORMATIONS[formationIndex];

  const [squad, setSquad] = useState<(Player | null)[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const [candidates, setCandidates] = useState<Player[]>([]);
  const [keptIdx, setKeptIdx] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [slotPhase, setSlotPhase] = useState<SlotPhase>('pickBox');
  const [roundIdx, setRoundIdx] = useState(0);
  const [offer, setOffer] = useState<Player | null>(null);
  const [bankerCalling, setBankerCalling] = useState(false);

  const [extrasChosen, setExtrasChosen] = useState<Record<string, ExtraOption>>({});
  const [result, setResult] = useState<SquadResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Names the banker has already offered for the active slot, so it never re-offers the same player.
  const offeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const startDraft = useCallback(async () => {
    setPhase('loading');
    const f = FORMATIONS[formationIndex];
    const raw = await fetchSquadPool(era);
    const p = era === 'legends' ? raw : (() => { const f = filterByTopic(raw, topic); return f.length >= 60 ? f : raw; })();
    setPool(p);
    setSquad(f.slots.map(() => null));
    setActiveSlot(null);
    setExtrasChosen({});
    setResult(null);
    setPhase('draft');
  }, [era, topic, formationIndex]);

  const memesPool = memesOn ? MEMES : [];

  const selectSlot = (idx: number) => {
    if (phase !== 'draft' || activeSlot !== null || squad[idx]) return;
    const used = new Set(squad.filter((p): p is Player => !!p).map(p => p.name));
    setCandidates(buildCandidates(pool, formation.slots[idx], used, memesPool));
    setKeptIdx(null); setEliminated([]); setSelected([]); setRoundIdx(0); setOffer(null);
    offeredRef.current = new Set();
    setSlotPhase('pickBox');
    setActiveSlot(idx);
  };

  const schedule = scheduleFor(candidates.length);
  const opensThisRound = schedule[roundIdx] ?? 0;

  const assignPlayer = (player: Player) => {
    if (activeSlot === null) return;
    const target = activeSlot;
    setSquad(prev => { const n = [...prev]; n[target] = player; return n; });
    setActiveSlot(null);
    if (timer.current) clearTimeout(timer.current);
  };

  const pickBox = (idx: number) => {
    if (slotPhase !== 'pickBox') return;
    setKeptIdx(idx);
    setSlotPhase(scheduleFor(candidates.length).length ? 'selecting' : 'final');
  };
  const toggleSelect = (idx: number) => {
    if (slotPhase !== 'selecting' || idx === keptIdx || eliminated.includes(idx)) return;
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : (prev.length >= opensThisRound ? prev : [...prev, idx]));
  };
  const reveal = () => {
    if (slotPhase !== 'selecting' || selected.length !== opensThisRound) return;
    setEliminated(prev => [...prev, ...selected]); setSelected([]); setSlotPhase('revealed');
  };
  const requestOffer = () => {
    if (slotPhase !== 'revealed' || activeSlot === null) return;
    const elim = new Set(eliminated);
    const unopened = candidates.filter((_, i) => !elim.has(i));
    const used = new Set(squad.filter((p): p is Player => !!p).map(p => p.name));
    const factor = ROUND_FACTORS[Math.min(roundIdx, ROUND_FACTORS.length - 1)];
    const o = bankerOffer(pool, formation.slots[activeSlot], unopened, used, factor, offeredRef.current, era);
    if (!o) {
      const nr = roundIdx + 1;
      if (nr < scheduleFor(candidates.length).length) { setRoundIdx(nr); setSelected([]); setSlotPhase('selecting'); }
      else setSlotPhase('final');
      return;
    }
    offeredRef.current.add(o.name);
    setBankerCalling(true); setSlotPhase('offer');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOffer(o); setBankerCalling(false); }, 1100);
  };
  const acceptDeal = () => { if (slotPhase === 'offer' && offer) assignPlayer(offer); };
  const rejectDeal = () => {
    if (slotPhase !== 'offer') return;
    setOffer(null);
    const nr = roundIdx + 1;
    if (nr < scheduleFor(candidates.length).length) { setRoundIdx(nr); setSelected([]); setSlotPhase('selecting'); }
    else setSlotPhase('final');
  };
  const pickFinal = (idx: number) => {
    if (slotPhase !== 'final' || eliminated.includes(idx)) return;
    assignPlayer(candidates[idx]);
  };

  const allFilled = squad.length > 0 && squad.every(Boolean);
  const goToExtras = () => { if (allFilled) { setExtraCat(0); setExtraStage('pick'); setExtraKept(null); setExtraElim([]); setExtraOffer(null); setPhase('extras'); } };

  // --- extras as mini mystery box boards (one per category) ---
  const [extraCat, setExtraCat] = useState(0);
  const [extraStage, setExtraStage] = useState<'pick' | 'reveal' | 'offer' | 'finalSwap'>('pick');
  const [extraKept, setExtraKept] = useState<number | null>(null);
  const [extraElim, setExtraElim] = useState<number[]>([]);
  const [extraOffer, setExtraOffer] = useState<ExtraOption | null>(null);
  const currentExtraCat = EXTRA_DEALS[Math.min(extraCat, EXTRA_DEALS.length - 1)];

  const finishExtraCategory = (opt: ExtraOption) => {
    setExtrasChosen(prev => ({ ...prev, [currentExtraCat.key]: opt }));
    if (extraCat + 1 >= EXTRA_DEALS.length) return; // page moves to simulate button
    setExtraCat(extraCat + 1); setExtraStage('pick'); setExtraKept(null); setExtraElim([]); setExtraOffer(null);
  };
  const pickExtraCase = (i: number) => {
    if (extraStage !== 'pick') return;
    setExtraKept(i);
    // flip 3 of the other 5, dramatic and known
    const others = currentExtraCat.options.map((_, j) => j).filter(j => j !== i);
    const flipped: number[] = [];
    while (flipped.length < 3) { const c = others[Math.floor(Math.random() * others.length)]; if (!flipped.includes(c)) flipped.push(c); }
    setExtraElim(flipped);
    setExtraStage('reveal');
  };
  const extraBankerCall = () => {
    if (extraStage !== 'reveal' || extraKept === null) return;
    // Banker offers the strongest FLIPPED option, a known, tempting bird-in-hand
    const flippedOpts = extraElim.map(i => currentExtraCat.options[i]);
    const best = [...flippedOpts].sort((a, b) => (b.ratingMod + b.chemMod / 3) - (a.ratingMod + a.chemMod / 3))[0];
    setExtraOffer(best); setExtraStage('offer');
  };
  const acceptExtraDeal = () => { if (extraStage === 'offer' && extraOffer) finishExtraCategory(extraOffer); };
  const rejectExtraDeal = () => { if (extraStage === 'offer') setExtraStage('finalSwap'); };
  const extraStay = () => { if (extraStage === 'finalSwap' && extraKept !== null) finishExtraCategory(currentExtraCat.options[extraKept]); };
  const extraSwap = () => {
    if (extraStage !== 'finalSwap' || extraKept === null) return;
    const remaining = currentExtraCat.options.map((_, j) => j).filter(j => j !== extraKept && !extraElim.includes(j));
    const pickIdx = remaining[Math.floor(Math.random() * remaining.length)];
    finishExtraCategory(currentExtraCat.options[pickIdx]);
  };
  const allExtrasChosen = EXTRA_DEALS.every(c => extrasChosen[c.key]);

  const simulate = () => {
    const picks = squad.filter((p): p is Player => !!p);
    const res = simulateSquad(picks, Object.values(extrasChosen), era);
    setResult(res);
    const lb = saveScore({ score: res.rating, grade: res.grade, formation: formation.name, era: era === 'legends' ? 'Legends' : 'Current', date: new Date().toLocaleDateString() });
    setLeaderboard(lb);
    setPhase('done');
  };

  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase('config'); setSquad([]); setActiveSlot(null); setResult(null); setExtrasChosen({});
  };

  const finalIndices = candidates.map((_, i) => i).filter(i => !eliminated.includes(i));

  // Global points/streaks/leaderboard credit (was missing, owner: every game must give points)
  useGameCompletion('squad-deal', phase === 'done' && !!result, result?.rating ?? 0, 0);

  return {
    phase, era, setEra, memesOn, setMemesOn, formationIndex, setFormationIndex, formation,
    startDraft, pool, squad, activeSlot, selectSlot,
    currentSlot: activeSlot !== null ? formation.slots[activeSlot] : null,
    candidates, keptIdx, eliminated, selected, slotPhase, opensThisRound, offer, bankerCalling, finalIndices,
    pickBox, toggleSelect, reveal, requestOffer, acceptDeal, rejectDeal, pickFinal,
    allFilled, goToExtras, extrasChosen, allExtrasChosen, simulate,
    topic, setTopic, era2Rating: (p: Player) => ratingFor(p, era),
    extraCat, extraStage, extraKept, extraElim, extraOffer, currentExtraCat,
    pickExtraCase, extraBankerCall, acceptExtraDeal, rejectExtraDeal, extraStay, extraSwap,
    result, leaderboard, restart,
  };
}
