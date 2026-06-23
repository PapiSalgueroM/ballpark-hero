import { useState, useCallback, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import {
  Formation, FORMATIONS, Era, MEMES, EXTRAS, ExtraOption,
  fetchSquadPool, buildCandidates, bankerOffer, simulateSquad, SquadResult,
  loadLeaderboard, saveScore, LeaderEntry,
} from '@/lib/squadDeal';

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

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const startDraft = useCallback(async () => {
    setPhase('loading');
    const f = FORMATIONS[formationIndex];
    const p = await fetchSquadPool(era);
    setPool(p);
    setSquad(f.slots.map(() => null));
    setActiveSlot(null);
    setExtrasChosen({});
    setResult(null);
    setPhase('draft');
  }, [era, formationIndex]);

  const memesPool = memesOn ? MEMES : [];

  const selectSlot = (idx: number) => {
    if (phase !== 'draft' || activeSlot !== null || squad[idx]) return;
    const used = new Set(squad.filter((p): p is Player => !!p).map(p => p.name));
    setCandidates(buildCandidates(pool, formation.slots[idx], used, memesPool));
    setKeptIdx(null); setEliminated([]); setSelected([]); setRoundIdx(0); setOffer(null);
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
    const o = bankerOffer(pool, formation.slots[activeSlot], unopened, used, factor);
    if (!o) {
      const nr = roundIdx + 1;
      if (nr < scheduleFor(candidates.length).length) { setRoundIdx(nr); setSelected([]); setSlotPhase('selecting'); }
      else setSlotPhase('final');
      return;
    }
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
  const goToExtras = () => { if (allFilled) setPhase('extras'); };
  const chooseExtra = (key: string, opt: ExtraOption) => setExtrasChosen(prev => ({ ...prev, [key]: opt }));
  const allExtrasChosen = EXTRAS.every(c => extrasChosen[c.key]);

  const simulate = () => {
    const picks = squad.filter((p): p is Player => !!p);
    const res = simulateSquad(picks, Object.values(extrasChosen));
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

  return {
    phase, era, setEra, memesOn, setMemesOn, formationIndex, setFormationIndex, formation,
    startDraft, pool, squad, activeSlot, selectSlot,
    currentSlot: activeSlot !== null ? formation.slots[activeSlot] : null,
    candidates, keptIdx, eliminated, selected, slotPhase, opensThisRound, offer, bankerCalling, finalIndices,
    pickBox, toggleSelect, reveal, requestOffer, acceptDeal, rejectDeal, pickFinal,
    allFilled, goToExtras, extrasChosen, chooseExtra, allExtrasChosen, simulate,
    result, leaderboard, restart,
  };
}
